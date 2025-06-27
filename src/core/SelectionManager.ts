/**
 * SelectionManager - 選択状態の管理を担当
 * 
 * 責任:
 * - VRMモデルの選択状態管理
 * - ライトの選択状態管理
 * - ボーンの選択状態管理
 * - アウトライン表示の制御
 * - 選択状態の排他制御
 */

import * as THREE from 'three';
import type { VRM } from '@pixiv/three-vrm';
import { BaseManager } from './BaseManager';

export interface SelectionState {
  selectedModelIndex: number;
  selectedModel: VRM | null;
  selectedBoneName: string | null;
  selectedBone: THREE.Bone | null;
  isLightSelected: boolean;
  selectedLightType: 'directional' | 'ambient' | 'rim' | null;
}

export class SelectionManager extends BaseManager {
  private scene: THREE.Scene;
  private state: SelectionState = {
    selectedModelIndex: -1,
    selectedModel: null,
    selectedBoneName: null,
    selectedBone: null,
    isLightSelected: false,
    selectedLightType: null
  };
  
  // アウトライン表示用
  private outlineMesh: THREE.Mesh | null = null;

  constructor(scene: THREE.Scene) {
    super();
    this.scene = scene;
  }

  /**
   * マネージャー名を取得
   */
  getName(): string {
    return 'SelectionManager';
  }

  /**
   * 初期化
   */
  async initialize(): Promise<void> {
    this.setupEventListeners();
    console.log('SelectionManagerを初期化しました');
  }

  /**
   * イベントリスナーの設定
   */
  private setupEventListeners(): void {
    // VRM読み込み時の処理
    this.listen('vrm:loaded', ({ vrm, index }) => {
      // 最初のモデルを自動選択
      if (this.state.selectedModelIndex === -1) {
        this.selectModel(index, vrm);
      }
    });

    // VRM削除時の処理
    this.listen('vrm:removed', ({ index }) => {
      this.handleVRMRemoved(index);
    });

    // ボーン選択時の処理
    this.listen('bone:selected', ({ boneName, bone }) => {
      this.handleBoneSelected(boneName, bone);
    });

    // ライト選択時の処理
    this.listen('light:selected', ({ isSelected, lightType }) => {
      this.handleLightSelected(isSelected, lightType);
    });
  }

  /**
   * モデルを選択
   */
  selectModel(index: number, vrm: VRM): void {
    // 既に同じモデルが選択されている場合は何もしない
    if (this.state.selectedModelIndex === index) {
      return;
    }

    // 他の選択状態をクリア
    this.clearBoneSelection();
    this.clearLightSelection();

    // 前のアウトラインを削除
    this.hideOutline();

    // 新しい選択状態を設定
    this.state.selectedModelIndex = index;
    this.state.selectedModel = vrm;

    // アウトライン表示
    this.showOutline(vrm);

    // イベント発火
    this.emit('vrm:selected', { vrm, index });
  }

  /**
   * モデル選択をクリア
   */
  clearModelSelection(): void {
    if (this.state.selectedModelIndex === -1) {
      return;
    }

    this.hideOutline();
    this.state.selectedModelIndex = -1;
    this.state.selectedModel = null;

    // 他の選択状態もクリア
    this.clearBoneSelection();

    // イベント発火
    this.emit('vrm:selection-cleared', undefined);
  }

  /**
   * ボーン選択の処理
   */
  private handleBoneSelected(boneName: string | null, bone: THREE.Bone | null): void {
    // ライト選択をクリア（排他制御）
    if (boneName && bone) {
      this.clearLightSelection();
    }

    this.state.selectedBoneName = boneName;
    this.state.selectedBone = bone;
  }

  /**
   * ボーン選択をクリア
   */
  private clearBoneSelection(): void {
    if (this.state.selectedBoneName) {
      this.state.selectedBoneName = null;
      this.state.selectedBone = null;
      // ボーンコントローラーに選択解除を通知
      this.emit('bone:selected', { boneName: null, bone: null });
    }
  }

  /**
   * ライト選択の処理
   */
  private handleLightSelected(isSelected: boolean, lightType?: 'directional' | 'ambient' | 'rim'): void {
    // ボーン選択をクリア（排他制御）
    if (isSelected) {
      this.clearBoneSelection();
    }

    this.state.isLightSelected = isSelected;
    this.state.selectedLightType = isSelected ? (lightType || 'directional') : null;
  }

  /**
   * ライト選択をクリア
   */
  private clearLightSelection(): void {
    if (this.state.isLightSelected) {
      this.state.isLightSelected = false;
      this.state.selectedLightType = null;
      // ライトコントローラーに選択解除を通知
      this.emit('light:selected', { isSelected: false });
    }
  }

  /**
   * VRM削除時の処理
   */
  private handleVRMRemoved(removedIndex: number): void {
    if (this.state.selectedModelIndex === removedIndex) {
      // 選択されていたモデルが削除された場合
      this.clearModelSelection();
    } else if (this.state.selectedModelIndex > removedIndex) {
      // 選択されたモデルより前のインデックスが削除された場合、インデックスを調整
      this.state.selectedModelIndex--;
    }
  }

  /**
   * アウトライン表示
   */
  private showOutline(vrm: VRM): void {
    if (!vrm.scene) return;

    // 既存のアウトラインを削除
    this.hideOutline();

    // VRMシーンの現在の位置と回転を保存
    const originalPosition = vrm.scene.position.clone();
    const originalRotation = vrm.scene.rotation.clone();
    
    // VRMバージョンを取得（文字列または数値の可能性があるため、適切に処理）
    const vrmMetaVersion = vrm.meta?.metaVersion;
    const isVRM0 = Number(vrmMetaVersion) === 0;
    
    // 一時的にシーン位置と回転を原点/無回転にリセットしてバウンディングボックスを計算
    vrm.scene.position.set(0, 0, 0);
    vrm.scene.rotation.set(0, 0, 0);
    const box = new THREE.Box3().setFromObject(vrm.scene);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    
    // シーン位置と回転を元に戻す
    vrm.scene.position.copy(originalPosition);
    vrm.scene.rotation.copy(originalRotation);
    
    // VRMバージョンに応じてアウトライン位置を調整
    let adjustedCenter = center.clone();
    
    if (isVRM0) {
      // VRM0の場合: Z軸方向の符号を反転
      adjustedCenter.z = -center.z;
      console.log('VRM0: Z軸方向の符号を反転', `${center.z.toFixed(3)} → ${adjustedCenter.z.toFixed(3)}`);
    } else {
      // VRM1の場合: そのまま使用
      console.log('VRM1: バウンディングボックス中心をそのまま使用');
    }
    
    // デバッグ情報
    console.log('=== Outline Debug Info ===');
    console.log('VRM Position:', `(${originalPosition.x.toFixed(3)}, ${originalPosition.y.toFixed(3)}, ${originalPosition.z.toFixed(3)})`);
    console.log('VRM Meta Version:', vrmMetaVersion);
    console.log('BB Center (reset origin):', `(${center.x.toFixed(3)}, ${center.y.toFixed(3)}, ${center.z.toFixed(3)})`);
    console.log('Adjusted Center:', `(${adjustedCenter.x.toFixed(3)}, ${adjustedCenter.y.toFixed(3)}, ${adjustedCenter.z.toFixed(3)})`);
    console.log('BB Size:', `(${size.x.toFixed(3)}, ${size.y.toFixed(3)}, ${size.z.toFixed(3)})`);

    // アウトライン用のジオメトリを作成
    const outlineGeometry = new THREE.BoxGeometry(
      size.x * 1.05, 
      size.y * 1.05, 
      size.z * 1.05
    );

    // アウトライン用のマテリアル
    const outlineMaterial = new THREE.MeshBasicMaterial({
      color: 0x00ff00,
      wireframe: true,
      transparent: true,
      opacity: 0.7
    });

    // アウトラインメッシュを作成
    this.outlineMesh = new THREE.Mesh(outlineGeometry, outlineMaterial);
    // 調整されたバウンディングボックス中心に、VRMシーンの位置を加算
    this.outlineMesh.position.copy(adjustedCenter).add(originalPosition);
    
    console.log('Final Outline Position:', `(${this.outlineMesh.position.x.toFixed(3)}, ${this.outlineMesh.position.y.toFixed(3)}, ${this.outlineMesh.position.z.toFixed(3)})`);
    console.log('=== End Debug Info ===');
    
    this.scene.add(this.outlineMesh);
  }

  /**
   * アウトライン非表示
   */
  private hideOutline(): void {
    if (this.outlineMesh) {
      this.scene.remove(this.outlineMesh);
      this.outlineMesh.geometry.dispose();
      (this.outlineMesh.material as THREE.Material).dispose();
      this.outlineMesh = null;
    }
  }

  /**
   * 現在の選択状態を取得
   */
  getSelectionState(): Readonly<SelectionState> {
    return { ...this.state };
  }

  /**
   * 選択されたモデルを取得
   */
  getSelectedModel(): VRM | null {
    return this.state.selectedModel;
  }

  /**
   * 選択されたモデルのインデックスを取得
   */
  getSelectedModelIndex(): number {
    return this.state.selectedModelIndex;
  }

  /**
   * 選択されたボーンを取得
   */
  getSelectedBone(): { name: string | null; bone: THREE.Bone | null } {
    return {
      name: this.state.selectedBoneName,
      bone: this.state.selectedBone
    };
  }

  /**
   * ライトが選択されているかチェック
   */
  isLightSelected(): boolean {
    return this.state.isLightSelected;
  }

  /**
   * 選択されたライトタイプを取得
   */
  getSelectedLightType(): 'directional' | 'ambient' | 'rim' | null {
    return this.state.selectedLightType;
  }

  /**
   * リソースのクリーンアップ
   */
  protected onDispose(): void {
    this.hideOutline();
  }
}
