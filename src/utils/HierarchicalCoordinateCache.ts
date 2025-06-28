import * as THREE from 'three';
import { VRM, type VRMHumanBone } from '@pixiv/three-vrm';
import { VRMCoordinateHelper } from './VRMCoordinateHelper';

/**
 * 階層座標キャッシュシステム
 * 
 * フレーム単位でのボーン座標計算結果をキャッシュし、
 * 同一フレーム内での重複計算を削減します。
 * 
 * 効果予測:
 * - キャッシュヒット率: 70-80%（同一フレーム内での重複アクセス）
 * - 計算量削減: O(n) → O(n×0.2-0.3) （nはボーン数）
 * - メモリトレードオフ: +5-10% メモリ使用量、-50-70% CPU使用量
 * 
 * @author FEAT-010 CustomBoneLines改修
 * @since 2025年06月28日
 */
export class HierarchicalCoordinateCache {
  
  private bonePositionCache = new Map<string, {
    worldPosition: THREE.Vector3;
    lastUpdateFrame: number;
    isDirty: boolean;
  }>();
  
  private boneQuaternionCache = new Map<string, {
    worldQuaternion: THREE.Quaternion;
    lastUpdateFrame: number;
    isDirty: boolean;
  }>();
  
  private currentFrame = 0;
  
  /**
   * フレーム開始処理
   * 
   * 新しいフレームの開始をキャッシュシステムに通知します。
   * 前フレームのキャッシュをdirtyマークし、無効化準備を行います。
   */
  public startFrame(): void {
    this.currentFrame++;
    
    // 前フレームのキャッシュをdirtyマーク（遅延無効化）
    this.bonePositionCache.forEach(cache => cache.isDirty = true);
    this.boneQuaternionCache.forEach(cache => cache.isDirty = true);
  }
  
  /**
   * ボーンワールド座標取得（キャッシュ戦略）
   * 
   * フレーム単位でのボーン座標計算結果をキャッシュし、
   * 同一フレーム内での重複計算を削減します。
   * 
   * @param boneId ボーン識別子
   * @param bone VRMボーンオブジェクト
   * @param vrm 所属VRMモデル
   * @returns 正規化されたワールド座標（キャッシュ または 新規計算）
   */
  public getBoneWorldPosition(
    boneId: string, 
    bone: VRMHumanBone, 
    vrm: VRM
  ): THREE.Vector3 {
    const cached = this.bonePositionCache.get(boneId);
    
    // キャッシュヒット判定（同一フレーム内 かつ 汚染されていない）
    if (cached && cached.lastUpdateFrame === this.currentFrame && !cached.isDirty) {
      return cached.worldPosition.clone(); // 安全のためクローンを返す
    }
    
    // キャッシュミス: 座標計算実行
    const worldPos = this.calculateBoneWorldPosition(bone, vrm);
    
    // キャッシュ更新
    this.bonePositionCache.set(boneId, {
      worldPosition: worldPos.clone(), // 元の値を保護するためクローン
      lastUpdateFrame: this.currentFrame,
      isDirty: false
    });
    
    return worldPos;
  }
  
  /**
   * ボーンワールドクォータニオン取得（キャッシュ戦略）
   * 
   * フレーム単位でのボーン回転計算結果をキャッシュします。
   * 
   * @param boneId ボーン識別子
   * @param bone VRMボーンオブジェクト
   * @param vrm 所属VRMモデル
   * @returns 正規化されたワールドクォータニオン
   */
  public getBoneWorldQuaternion(
    boneId: string, 
    bone: VRMHumanBone, 
    vrm: VRM
  ): THREE.Quaternion {
    const cached = this.boneQuaternionCache.get(boneId);
    
    // キャッシュヒット判定
    if (cached && cached.lastUpdateFrame === this.currentFrame && !cached.isDirty) {
      return cached.worldQuaternion.clone();
    }
    
    // キャッシュミス: クォータニオン計算実行
    const worldQuat = this.calculateBoneWorldQuaternion(bone, vrm);
    
    // キャッシュ更新
    this.boneQuaternionCache.set(boneId, {
      worldQuaternion: worldQuat.clone(),
      lastUpdateFrame: this.currentFrame,
      isDirty: false
    });
    
    return worldQuat;
  }
  
  /**
   * VRMルート変更時の全キャッシュ無効化
   * 
   * VRMルート（位置・回転・スケール）が変更された際に
   * 全てのボーン座標キャッシュを無効化します。
   */
  public invalidateAllCache(): void {
    this.bonePositionCache.forEach(cache => cache.isDirty = true);
    this.boneQuaternionCache.forEach(cache => cache.isDirty = true);
  }
  
  /**
   * 特定ボーンのキャッシュ無効化
   * 
   * 個別ボーンのポーズ変更時などに使用します。
   * 
   * @param boneId 無効化対象のボーン識別子
   */
  public invalidateBoneCache(boneId: string): void {
    const posCache = this.bonePositionCache.get(boneId);
    if (posCache) {
      posCache.isDirty = true;
    }
    
    const quatCache = this.boneQuaternionCache.get(boneId);
    if (quatCache) {
      quatCache.isDirty = true;
    }
  }
  
  /**
   * キャッシュ統計情報取得
   * 
   * パフォーマンス分析用のキャッシュ効率統計を提供します。
   * 
   * @returns キャッシュ統計情報
   */
  public getCacheStats(): {
    positionCacheSize: number;
    quaternionCacheSize: number;
    currentFrame: number;
    memoryEstimate: string;
  } {
    // メモリ使用量推定（概算）
    const posMemory = this.bonePositionCache.size * (32 + 64); // キー + CacheEntry
    const quatMemory = this.boneQuaternionCache.size * (32 + 80); // キー + CacheEntry
    const totalKB = (posMemory + quatMemory) / 1024;
    
    return {
      positionCacheSize: this.bonePositionCache.size,
      quaternionCacheSize: this.boneQuaternionCache.size,
      currentFrame: this.currentFrame,
      memoryEstimate: `${totalKB.toFixed(1)}KB`
    };
  }
  
  /**
   * キャッシュクリア
   * 
   * 全てのキャッシュデータをクリアし、メモリを解放します。
   * VRM切り替え時などに使用します。
   */
  public clearAllCache(): void {
    this.bonePositionCache.clear();
    this.boneQuaternionCache.clear();
    this.currentFrame = 0;
  }
  
  /**
   * 実際のボーンワールド座標計算（内部用）
   * 
   * キャッシュミス時の実際の座標計算処理。
   * VRMCoordinateHelperを使用して正規化済み座標を取得。
   * 
   * @param bone VRMボーンオブジェクト
   * @param vrm 所属VRMモデル
   * @returns 正規化されたワールド座標
   */
  private calculateBoneWorldPosition(bone: VRMHumanBone, vrm: VRM): THREE.Vector3 {
    return VRMCoordinateHelper.getBoneWorldPosition(bone, vrm);
  }
  
  /**
   * 実際のボーンワールドクォータニオン計算（内部用）
   * 
   * キャッシュミス時の実際のクォータニオン計算処理。
   * 
   * @param bone VRMボーンオブジェクト
   * @param vrm 所属VRMモデル
   * @returns 正規化されたワールドクォータニオン
   */
  private calculateBoneWorldQuaternion(bone: VRMHumanBone, vrm: VRM): THREE.Quaternion {
    return VRMCoordinateHelper.getBoneWorldQuaternion(bone, vrm);
  }
} 