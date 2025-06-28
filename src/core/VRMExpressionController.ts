/**
 * VRMExpressionController - VRM表情制御システム
 * 
 * 複数VRMモデルの表情データを効率的に管理し、選択状態変更・
 * リアルタイム更新・状態永続化を実現するハイブリッド型管理システム
 */

import type { VRM, VRMExpressionManager } from '@pixiv/three-vrm';
import { BaseManager } from './BaseManager';
import type { 
  ExpressionData, 
  VRMLoadedEvent,
  VRMRemovedEvent,
  VRMSelectedEvent
} from '../types/events';

/**
 * 個別VRMの表情データ管理クラス
 */
export class VRMExpressionData {
  public readonly vrmIndex: number;
  public readonly expressionManager: VRMExpressionManager;
  public readonly availableExpressions: ReadonlyArray<string>;
  public readonly hasExpressions: boolean;
  
  // 高速アクセス用キャッシュ
  private expressionValues = new Map<string, number>();
  
  constructor(
    vrmIndex: number,
    expressionManager: VRMExpressionManager,
    availableExpressions: string[]
  ) {
    this.vrmIndex = vrmIndex;
    this.expressionManager = expressionManager;
    this.availableExpressions = Object.freeze([...availableExpressions]);
    this.hasExpressions = availableExpressions.length > 0;
    
    // 初期値設定
    this.initializeExpressionValues();
  }
  
  /**
   * 表情値の初期化
   */
  private initializeExpressionValues(): void {
    for (const expressionName of this.availableExpressions) {
      this.expressionValues.set(expressionName, 0);
    }
  }
  
  /**
   * 表情値の設定
   * @param name 表情名
   * @param value 表情値 (0.0-1.0)
   */
  setExpressionValue(name: string, value: number): void {
    if (!this.availableExpressions.includes(name)) return;
    
    const clampedValue = this.clampAndRound(value);
    this.expressionValues.set(name, clampedValue);
  }
  
  /**
   * 表情値の取得
   * @param name 表情名
   * @returns 表情値 (0.0-1.0)
   */
  getExpressionValue(name: string): number {
    return this.expressionValues.get(name) ?? 0;
  }
  
  /**
   * 全表情値の取得
   * @returns 全表情値のReadonlyMap
   */
  getAllExpressionValues(): ReadonlyMap<string, number> {
    return new Map(this.expressionValues);
  }
  
  /**
   * 全表情のリセット
   */
  resetAllExpressions(): void {
    for (const expressionName of this.availableExpressions) {
      this.expressionValues.set(expressionName, 0);
      this.expressionManager.setValue(expressionName, 0);
    }
    this.expressionManager.update();
  }
  
  /**
   * 表情データの取得
   * @returns ExpressionDataインターフェース
   */
  getExpressionData(): ExpressionData {
    return {
      vrmIndex: this.vrmIndex,
      availableExpressions: this.availableExpressions,
      currentValues: this.getAllExpressionValues(),
      hasExpressions: this.hasExpressions
    };
  }
  
  /**
   * 値の精度制限とクランプ
   * @param value 入力値
   * @returns クランプ・丸め済み値
   */
  private clampAndRound(value: number): number {
    const precision = 0.01;
    return Math.round(
      Math.max(0, Math.min(1, value)) / precision
    ) * precision;
  }
}

/**
 * VRM表情制御コントローラー
 * ハイブリッド型管理システム（集中管理+個別キャッシュ）
 */
export class VRMExpressionController extends BaseManager {
  // === CORE STATE ===
  private activeVrmIndex: number = -1;
  private vrmExpressionDataMap = new Map<number, VRMExpressionData>();
  
  /**
   * 初期化処理
   */
  async initialize(): Promise<void> {
    this.setupEventListeners();
    console.log('VRMExpressionController initialized');
  }
  
  /**
   * マネージャー名の取得
   */
  getName(): string {
    return 'VRMExpressionController';
  }
  
  /**
   * イベントリスナーの設定
   */
  private setupEventListeners(): void {
    // VRMロード時の表情システム登録
    this.listen('vrm:loaded', (event: VRMLoadedEvent) => {
      this.registerVRM(event.index, event.vrm);
    });
    
    // VRM選択変更時の表情システム更新
    this.listen('vrm:selected', (event: VRMSelectedEvent) => {
      this.setActiveVRM(event.index);
    });
    
    // VRM削除時の表情データクリーンアップ
    this.listen('vrm:removed', (event: VRMRemovedEvent) => {
      this.unregisterVRM(event.index);
    });
  }
  
  /**
   * VRM表情システム登録
   * @param vrmIndex VRMインデックス
   * @param vrm VRMオブジェクト
   */
  registerVRM(vrmIndex: number, vrm: VRM): void {
    try {
      const expressionManager = vrm.expressionManager;
      if (!expressionManager) {
        console.warn(`VRM ${vrmIndex}: expressionManager not found`);
        return;
      }
      
      const availableExpressions = this.extractExpressionNames(expressionManager);
      
      const vrmData = new VRMExpressionData(
        vrmIndex, 
        expressionManager,
        availableExpressions
      );
      
      this.vrmExpressionDataMap.set(vrmIndex, vrmData);
      
      // EventBus通知
      this.emit('expression:vrm-registered', {
        vrmIndex,
        expressionCount: availableExpressions.length,
        availableExpressions
      });
      
      console.log(`VRM ${vrmIndex} expression system registered: ${availableExpressions.length} expressions`);
    } catch (error) {
      console.error(`VRM ${vrmIndex} expression registration error:`, error);
    }
  }
  
  /**
   * VRM表情システム登録解除
   * @param vrmIndex VRMインデックス
   */
  unregisterVRM(vrmIndex: number): void {
    const removed = this.vrmExpressionDataMap.delete(vrmIndex);
    
    if (removed) {
      // アクティブVRMが削除された場合
      if (this.activeVrmIndex === vrmIndex) {
        this.activeVrmIndex = -1;
        this.emit('expression:active-changed', {
          vrmIndex: -1,
          expressionData: null
        });
      }
      
      console.log(`VRM ${vrmIndex} expression system unregistered`);
    }
  }
  
  /**
   * アクティブVRMの設定
   * @param vrmIndex VRMインデックス
   */
  setActiveVRM(vrmIndex: number): void {
    this.activeVrmIndex = vrmIndex;
    
    const expressionData = this.getActiveExpressionData();
    
    this.emit('expression:active-changed', {
      vrmIndex,
      expressionData
    });
    
    console.log(`Active VRM for expressions set to: ${vrmIndex}`);
  }
  
  /**
   * 表情値の設定
   * @param expressionName 表情名
   * @param value 表情値 (0.0-1.0)
   * @returns 設定成功フラグ
   */
  setExpression(expressionName: string, value: number): boolean {
    try {
      const activeData = this.getActiveVRMData();
      if (!activeData?.hasExpressions) {
        console.warn('No active VRM with expressions');
        return false;
      }
      
      if (!activeData.availableExpressions.includes(expressionName)) {
        console.warn(`Unknown expression: ${expressionName}`);
        return false;
      }
      
      // 値の範囲チェック
      const clampedValue = Math.max(0, Math.min(1, value));
      if (clampedValue !== value) {
        console.warn(`Expression value clamped: ${value} → ${clampedValue}`);
      }
      
      activeData.setExpressionValue(expressionName, clampedValue);
      
      // リアルタイム反映
      activeData.expressionManager.setValue(expressionName, clampedValue);
      activeData.expressionManager.update();
      
      // EventBus通知
      this.emit('expression:value-changed', {
        vrmIndex: this.activeVrmIndex,
        expressionName,
        value: clampedValue,
        timestamp: performance.now()
      });
      
      return true;
    } catch (error) {
      console.error('Expression setting error:', error);
      return false;
    }
  }
  
  /**
   * 表情値の取得
   * @param expressionName 表情名
   * @returns 表情値 (0.0-1.0) または null
   */
  getExpression(expressionName: string): number | null {
    const activeData = this.getActiveVRMData();
    if (!activeData?.hasExpressions) return null;
    
    return activeData.getExpressionValue(expressionName);
  }
  
  /**
   * 全表情のリセット
   */
  resetAllExpressions(): void {
    const activeData = this.getActiveVRMData();
    if (!activeData?.hasExpressions) {
      console.warn('No active VRM with expressions to reset');
      return;
    }
    
    activeData.resetAllExpressions();
    
    this.emit('expression:reset', {
      vrmIndex: this.activeVrmIndex,
      resetType: 'all'
    });
    
    console.log(`All expressions reset for VRM ${this.activeVrmIndex}`);
  }
  
  /**
   * アクティブVRMの表情データ取得
   * @returns VRMExpressionData または null
   */
  private getActiveVRMData(): VRMExpressionData | null {
    if (this.activeVrmIndex === -1) return null;
    return this.vrmExpressionDataMap.get(this.activeVrmIndex) ?? null;
  }
  
  /**
   * アクティブVRMの表情データ取得（公開API）
   * @returns ExpressionData または null
   */
  getActiveExpressionData(): ExpressionData | null {
    const activeData = this.getActiveVRMData();
    return activeData ? activeData.getExpressionData() : null;
  }
  
  /**
   * 利用可能表情リストの取得
   * @returns 表情名配列
   */
  getAvailableExpressions(): string[] {
    const activeData = this.getActiveVRMData();
    return activeData ? [...activeData.availableExpressions] : [];
  }
  
  /**
   * 表情名をexpressionManagerから抽出
   * @param expressionManager VRMExpressionManager
   * @returns 表情名配列
   */
  private extractExpressionNames(expressionManager: VRMExpressionManager): string[] {
    try {
      // VRMExpressionManagerから表情名を取得
      // expressionManagerには expressions プロパティがある
      const expressions = (expressionManager as any).expressions;
      
      if (expressions && Array.isArray(expressions)) {
        // expressionsは配列の場合 - 各要素からpresetNameを取得
        return expressions
          .map(expr => expr.presetName || expr.expressionName || expr.name)
          .filter(name => name && typeof name === 'string');
      } else if (expressions && typeof expressions === 'object') {
        // expressionsはオブジェクトの場合 - キーが表情名
        return Object.keys(expressions);
      }
      
      // 代替手段1: getExpressionTrackNamesメソッドの確認
      if (typeof (expressionManager as any).getExpressionTrackNames === 'function') {
        const trackNames = (expressionManager as any).getExpressionTrackNames();
        if (Array.isArray(trackNames)) {
          return trackNames;
        }
      }
      
      // 代替手段2: presetManager経由でアクセス
      const presetManager = (expressionManager as any).presetManager;
      if (presetManager && presetManager.expressions) {
        return Object.keys(presetManager.expressions);
      }
      
      // 代替手段3: よく使用される表情名でテスト
      const commonExpressions = [
        'happy', 'angry', 'sad', 'relaxed', 'surprised', 'neutral',
        'aa', 'ih', 'ou', 'ee', 'oh',
        'blink', 'blinkLeft', 'blinkRight', 'wink', 'winkLeft', 'winkRight',
        'lookUp', 'lookDown', 'lookLeft', 'lookRight',
        'fun', 'joy', 'sorrow', 'extra'
      ];
      
             // 実際に設定可能な表情のみをフィルタリング
       const availableExpressions = commonExpressions.filter(expr => {
         try {
           // 一時的に0を設定して確認
           let currentValue = 0;
           if (typeof (expressionManager as any).getValue === 'function') {
             const value = (expressionManager as any).getValue(expr);
             currentValue = typeof value === 'number' ? value : 0;
           }
           expressionManager.setValue(expr, 0);
           // 元の値に戻す
           if (typeof (expressionManager as any).getValue === 'function') {
             expressionManager.setValue(expr, currentValue);
           }
           return true;
         } catch {
           return false;
         }
       });
      
      console.log(`VRM expressions detected: ${availableExpressions.length} expressions`, availableExpressions);
      return availableExpressions;
      
    } catch (error) {
      console.warn('Failed to extract expression names:', error);
      return [];
    }
  }
  
  /**
   * 毎フレーム更新処理
   * @param deltaTime 前フレームからの経過時間
   */
  update(deltaTime: number): void {
    // アクティブVRMの表情を毎フレーム更新
    const activeData = this.getActiveVRMData();
    if (activeData && activeData.hasExpressions) {
      activeData.expressionManager.update();
    }
    
    // パフォーマンス監視（必要に応じて）
    this.updatePerformanceMetrics(deltaTime);
  }
  
  /**
   * パフォーマンス監視
   * @param _deltaTime 前フレームからの経過時間
   */
  private updatePerformanceMetrics(_deltaTime: number): void {
    // 60FPS維持監視やメモリ使用量チェックなど
    // 本実装では簡略化
  }
  
  /**
   * リソースクリーンアップ
   */
  protected onDispose(): void {
    this.vrmExpressionDataMap.clear();
    this.activeVrmIndex = -1;
    console.log('VRMExpressionController disposed');
  }
} 