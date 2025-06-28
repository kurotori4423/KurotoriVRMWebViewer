import * as THREE from 'three';
import { VRM, type VRMHumanBone } from '@pixiv/three-vrm';

/**
 * VRM座標系統一ヘルパークラス
 * 
 * VRM0(-Z軸前方、180度回転)とVRM1(+Z軸前方)の座標系差異を統一的に処理し、
 * VRMシーン相対座標での効率的な座標変換を提供します。
 * 
 * 主な機能:
 * - VRM0/VRM1方向正規化 (条件分岐方式によるO(1)効率)
 * - VRMシーン⇔ワールド座標変換
 * - ボーン座標取得（正規化済み）
 * 
 * @author FEAT-010 CustomBoneLines改修
 * @since 2025年06月28日
 */
export class VRMCoordinateHelper {
  
  /**
   * VRM方向正規化（条件分岐方式）
   * 
   * VRM0: X, Y維持、Z反転（-Z軸前方 → +Z軸前方に正規化）
   * VRM1: 変更なし（すでに+Z軸前方）
   * 
   * 計算量: O(1) - 条件分岐のみ
   * メモリ: 最小
   * 精度: 高（簡単な座標反転）
   * 
   * @param position 正規化する座標
   * @param vrm 対象VRMモデル
   * @returns 正規化された座標（新しいVector3インスタンス）
   */
  public static normalizeDirection(position: THREE.Vector3, vrm: VRM): THREE.Vector3 {
    if (vrm.meta.metaVersion === '0') {
      // VRM0: X, Y維持、Z反転で正規化
      return new THREE.Vector3(position.x, position.y, -position.z);
    }
    
    // VRM1: 変更なし（すでに正規化済み）
    return position.clone();
  }
  
  /**
   * VRMボーンのワールド座標取得（正規化済み）
   * 
   * VRMボーンのワールド座標を取得し、VRM方向正規化を適用します。
   * BonePointsパターンでの座標統一に使用されます。
   * 
   * @param bone 取得対象のVRMボーン
   * @param vrm 所属VRMモデル
   * @returns 正規化されたワールド座標
   */
  public static getBoneWorldPosition(bone: VRMHumanBone, vrm: VRM): THREE.Vector3 {
    // ボーンのワールド座標を取得
    const worldPosition = new THREE.Vector3();
    bone.node.getWorldPosition(worldPosition);
    
    // VRM方向正規化を適用
    return this.normalizeDirection(worldPosition, vrm);
  }
  
  /**
   * VRMボーンのワールドクォータニオン取得（正規化済み）
   * 
   * VRMボーンのワールドクォータニオンを取得し、VRM方向正規化を適用します。
   * 
   * @param bone 取得対象のVRMボーン
   * @param vrm 所属VRMモデル
   * @returns 正規化されたワールドクォータニオン
   */
  public static getBoneWorldQuaternion(bone: VRMHumanBone, vrm: VRM): THREE.Quaternion {
    // ボーンのワールドクォータニオンを取得
    const worldQuaternion = new THREE.Quaternion();
    bone.node.getWorldQuaternion(worldQuaternion);
    
    if (vrm.meta.metaVersion === '0') {
      // VRM0: Y軸180度回転補正
      const correctionQuaternion = new THREE.Quaternion()
        .setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI);
      worldQuaternion.multiplyQuaternions(correctionQuaternion, worldQuaternion);
    }
    
    return worldQuaternion;
  }
  
  /**
   * VRMシーン相対座標からワールド座標への変換
   * 
   * VRMシーン内の相対座標をメインシーンのワールド座標に変換します。
   * BonePointsパターンでボーン線をVRMシーンに配置した際の
   * 外部座標系との変換に使用されます。
   * 
   * @param position VRMシーン相対座標
   * @param vrm 対象VRMモデル
   * @returns ワールド座標（正規化済み）
   */
  public static vrmSceneToWorld(position: THREE.Vector3, vrm: VRM): THREE.Vector3 {
    // VRMシーンのワールド変換マトリックスを適用
    const worldPosition = position.clone();
    worldPosition.applyMatrix4(vrm.scene.matrixWorld);
    
    // VRM方向正規化を適用
    return this.normalizeDirection(worldPosition, vrm);
  }
  
  /**
   * ワールド座標からVRMシーン相対座標への変換
   * 
   * メインシーンのワールド座標をVRMシーン内の相対座標に変換します。
   * 外部からの座標をVRMシーン内に配置する際に使用されます。
   * 
   * @param position ワールド座標
   * @param vrm 対象VRMモデル
   * @returns VRMシーン相対座標
   */
  public static worldToVRMScene(position: THREE.Vector3, vrm: VRM): THREE.Vector3 {
    // まずVRMシーンのワールド変換マトリックスの逆変換を適用
    const vrmPosition = position.clone();
    const inverseMatrix = vrm.scene.matrixWorld.clone().invert();
    vrmPosition.applyMatrix4(inverseMatrix);
    
    // VRM0の場合は方向補正不要（VRMシーン内では既にVRM0座標系）
    return vrmPosition;
  }
  
  /**
   * VRMの方向正規化マトリックス取得
   * 
   * VRM0/VRM1の方向差異を統一するためのマトリックスを取得します。
   * より複雑な座標変換が必要な場合に使用されます。
   * 
   * @param vrm 対象VRMモデル
   * @returns 正規化マトリックス
   */
  public static getNormalizationMatrix(vrm: VRM): THREE.Matrix4 {
    if (vrm.meta.metaVersion === '0') {
      // VRM0: Y軸180度回転マトリックス
      return new THREE.Matrix4().makeRotationY(Math.PI);
    }
    
    // VRM1: 単位マトリックス（変更なし）
    return new THREE.Matrix4();
  }
  
  /**
   * 座標系デバッグ情報取得
   * 
   * 開発・デバッグ用途で座標系の状態を確認するための情報を提供します。
   * 
   * @param vrm 対象VRMモデル
   * @returns デバッグ情報オブジェクト
   */
  public static getDebugInfo(vrm: VRM): {
    version: string;
    needsNormalization: boolean;
    scenePosition: THREE.Vector3;
    sceneRotation: THREE.Euler;
    sceneScale: THREE.Vector3;
  } {
    return {
      version: vrm.meta.metaVersion || 'unknown',
      needsNormalization: vrm.meta.metaVersion === '0',
      scenePosition: vrm.scene.position.clone(),
      sceneRotation: vrm.scene.rotation.clone(),
      sceneScale: vrm.scene.scale.clone()
    };
  }
} 