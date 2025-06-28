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
  
  // 選択マーカー表示用（三角錐マーカー方式）
  private selectionMarker: THREE.Mesh | null = null;

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

    // 前の選択マーカーを削除
    this.hideSelectionMarker();

    // 新しい選択状態を設定
    this.state.selectedModelIndex = index;
    this.state.selectedModel = vrm;

    // 選択マーカー表示
    this.showSelectionMarker(vrm);

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

    this.hideSelectionMarker();
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
   * 選択マーカー表示（三角錐マーカー方式）
   */
  private showSelectionMarker(vrm: VRM): void {
    if (!vrm.scene) return;

    // 既存の選択マーカーを削除
    this.hideSelectionMarker();

    // VRMシーンの現在の位置と回転を保存
    const originalPosition = vrm.scene.position.clone();
    const originalRotation = vrm.scene.rotation.clone();
    
    // VRMバージョンを取得
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
    
    // VRMバージョンに応じて位置を調整
    let adjustedCenter = center.clone();
    
    if (isVRM0) {
      adjustedCenter.z = -center.z;
    }
    
    // 三角錐マーカーを頭上に配置するための計算
    const markerHeight = 0.15; // 0.15をマーカーサイズとする
    const markerRadius = markerHeight * 0.8; // 高さの80%を底面半径とする
    const offsetHeight = size.y * 1.2; // VRMの高さの20%上方に配置
    
    // 三角錐ジオメトリ（下向き）を作成
    const markerGeometry = new THREE.ConeGeometry(markerRadius, markerHeight, 8);
    
    // マーカー用のマテリアル（オレンジ色）
    const markerMaterial = new THREE.MeshBasicMaterial({
      color: 0xff6600,
      transparent: true,
      opacity: 0.8
    });

    // 三角錐メッシュを作成
    this.selectionMarker = new THREE.Mesh(markerGeometry, markerMaterial);
    
    // 下向きに回転（デフォルトは上向きのため180度回転）
    this.selectionMarker.rotation.x = Math.PI;
    
    // 頭上の位置に配置
    const markerPosition = new THREE.Vector3(0,0,0);//adjustedCenter.clone();
    markerPosition.y += offsetHeight; // 上方に移動
    markerPosition.add(originalPosition);
    this.selectionMarker.position.copy(markerPosition);
    
    // デバッグ情報
    console.log('=== Selection Marker Debug Info ===');
    console.log('VRM Position:', `(${originalPosition.x.toFixed(3)}, ${originalPosition.y.toFixed(3)}, ${originalPosition.z.toFixed(3)})`);
    console.log('VRM Size:', `(${size.x.toFixed(3)}, ${size.y.toFixed(3)}, ${size.z.toFixed(3)})`);
    console.log('Marker Height:', markerHeight.toFixed(3));
    console.log('Marker Position:', `(${markerPosition.x.toFixed(3)}, ${markerPosition.y.toFixed(3)}, ${markerPosition.z.toFixed(3)})`);
    console.log('=== End Debug Info ===');
    
    this.scene.add(this.selectionMarker);
  }

  /**
   * 選択マーカー非表示
   */
  private hideSelectionMarker(): void {
    if (this.selectionMarker) {
      this.scene.remove(this.selectionMarker);
      this.selectionMarker.geometry.dispose();
      (this.selectionMarker.material as THREE.Material).dispose();
      this.selectionMarker = null;
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
    this.hideSelectionMarker();
  }
}
