import * as THREE from 'three';
import { VRM } from '@pixiv/three-vrm';
import { TransformControls } from 'three/examples/jsm/controls/TransformControls.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { BaseManager } from './BaseManager';

/**
 * VRMRootController
 * VRMモデルのルートオブジェクト（vrm.scene）を操作するためのコントローラークラス
 * TransformControlsを使用してVRMモデル全体の位置と回転を制御
 */
export class VRMRootController extends BaseManager {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private orbitControls: OrbitControls;
  
  // VRM関連
  private currentVRM: VRM | null = null;
  
  // ルートオブジェクト操作用
  private rootTransformControls: TransformControls | null = null;
  private currentTransformMode: 'translate' | 'rotate' = 'translate'; // デフォルトは移動モード
  private currentTransformSpace: 'world' | 'local' = 'world'; // デフォルトはワールド座標系
  private isRootTransformVisible: boolean = false;
  
  // 初期状態記録（リセット用）
  private initialPosition: THREE.Vector3 = new THREE.Vector3(0, 0, 0);
  private initialRotation: THREE.Euler = new THREE.Euler(0, 0, 0);
  
  // ルート選択状態変更コールバック
  private onRootSelectionChanged: ((isSelected: boolean) => void) | null = null;

  /**
   * コンストラクタ
   */
  constructor(
    scene: THREE.Scene,
    camera: THREE.PerspectiveCamera,
    renderer: THREE.WebGLRenderer,
    orbitControls: OrbitControls
  ) {
    super();
    this.scene = scene;
    this.camera = camera;
    this.renderer = renderer;
    this.orbitControls = orbitControls;
    
    // TransformControlsの初期化
    this.initializeTransformControls();
  }

  /**
   * TransformControlsの初期化
   */
  private initializeTransformControls(): void {
    this.rootTransformControls = new TransformControls(this.camera, this.renderer.domElement);
    this.rootTransformControls.setMode('translate'); // 移動モードをデフォルトに設定
    this.rootTransformControls.setSpace('world'); // ワールド座標系をデフォルトに設定
    this.rootTransformControls.setSize(1.0); // ルートオブジェクト用にサイズ設定
    
    // TransformControlsをシーンに追加
    const gizmo = this.rootTransformControls.getHelper();
    this.scene.add(gizmo);
    
    // 初期状態では非表示
    gizmo.visible = false;
    
    // TransformControls使用中はOrbitControlsを無効化
    this.rootTransformControls.addEventListener('dragging-changed', (event) => {
      this.orbitControls.enabled = !event.value;
    });

    // VRMルートオブジェクト操作時のリアルタイム更新処理
    this.rootTransformControls.addEventListener('objectChange', () => {
      this.updateVRMRootTransformation();
    });
    
    console.log('VRMRootController: TransformControlsを初期化しました');
  }

  /**
   * VRMモデルを設定
   */
  setVRM(vrm: VRM | null): void {
    // 以前のVRMの後片付け
    this.detachFromCurrentVRM();
    
    this.currentVRM = vrm;
    
    if (vrm && vrm.scene) {
      // 初期位置・回転を記録
      this.recordInitialTransform(vrm);
      
      console.log(`VRMRootController: VRMを設定しました - ${vrm.scene.name}`);
    } else {
      console.log('VRMRootController: VRMが解除されました');
    }
  }

  /**
   * VRMの初期位置・回転を記録（リセット用）
   */
  private recordInitialTransform(vrm: VRM): void {
    if (!vrm.scene) return;
    
    this.initialPosition.copy(vrm.scene.position);
    this.initialRotation.copy(vrm.scene.rotation);
    
    console.log(`初期位置記録: (${this.initialPosition.x.toFixed(3)}, ${this.initialPosition.y.toFixed(3)}, ${this.initialPosition.z.toFixed(3)})`);
    console.log(`初期回転記録: (${this.initialRotation.x.toFixed(3)}, ${this.initialRotation.y.toFixed(3)}, ${this.initialRotation.z.toFixed(3)})`);
  }

  /**
   * 現在のVRMからTransformControlsを切り離し
   */
  private detachFromCurrentVRM(): void {
    if (this.rootTransformControls) {
      this.rootTransformControls.detach();
      this.rootTransformControls.getHelper().visible = false;
      this.isRootTransformVisible = false;
    }
  }

  /**
   * VRMルートオブジェクトにTransformControlsを適用
   */
  enableRootTransform(): void {
    if (!this.currentVRM || !this.currentVRM.scene || !this.rootTransformControls) {
      console.warn('VRMRootController: VRMまたはTransformControlsが利用できません');
      return;
    }

    // TransformControlsをVRMのシーンオブジェクトに適用
    this.rootTransformControls.attach(this.currentVRM.scene);
    this.rootTransformControls.getHelper().visible = true;
    this.isRootTransformVisible = true;
    
    console.log('VRMRootController: ルートTransformControlsを有効化しました');
    
    // コールバック呼び出し
    if (this.onRootSelectionChanged) {
      this.onRootSelectionChanged(true);
    }
  }

  /**
   * VRMルートオブジェクトからTransformControlsを無効化
   */
  disableRootTransform(): void {
    if (this.rootTransformControls) {
      this.rootTransformControls.detach();
      this.rootTransformControls.getHelper().visible = false;
      this.isRootTransformVisible = false;
      
      console.log('VRMRootController: ルートTransformControlsを無効化しました');
      
      // コールバック呼び出し
      if (this.onRootSelectionChanged) {
        this.onRootSelectionChanged(false);
      }
    }
  }

  /**
   * ルートTransformControls表示状態の切り替え
   */
  toggleRootTransform(): boolean {
    if (this.isRootTransformVisible) {
      this.disableRootTransform();
    } else {
      this.enableRootTransform();
    }
    return this.isRootTransformVisible;
  }

  /**
   * VRMルートオブジェクト操作モードの切り替え（移動・回転）
   */
  setTransformMode(mode: 'translate' | 'rotate'): void {
    if (!this.rootTransformControls) {
      console.warn('VRMRootController: TransformControlsが初期化されていません');
      return;
    }

    this.currentTransformMode = mode;
    this.rootTransformControls.setMode(mode);
    console.log(`VRMRootController: Transformモードを変更: ${mode}`);
  }

  /**
   * Transform座標系を設定
   * @param space 'world' (ワールド座標系) または 'local' (ローカル座標系)
   */
  setTransformSpace(space: 'world' | 'local'): void {
    if (!this.rootTransformControls) {
      console.warn('VRMRootController: TransformControlsが初期化されていません');
      return;
    }

    this.currentTransformSpace = space;
    this.rootTransformControls.setSpace(space);
    console.log(`VRMRootController: Transform座標系を変更: ${space}`);
  }

  /**
   * 現在のTransform座標系を取得
   */
  getCurrentTransformSpace(): 'world' | 'local' {
    return this.currentTransformSpace;
  }

  /**
   * 現在のTransformモードを取得
   */
  getCurrentTransformMode(): 'translate' | 'rotate' {
    return this.currentTransformMode;
  }

  /**
   * ルートTransformControls表示状態を取得
   */
  isRootTransformControlsVisible(): boolean {
    return this.isRootTransformVisible;
  }

  /**
   * VRMの位置をリセット（原点復帰）
   */
  resetVRMPosition(): void {
    if (!this.currentVRM || !this.currentVRM.scene) {
      console.warn('VRMRootController: リセット対象のVRMがありません');
      return;
    }

    this.currentVRM.scene.position.copy(this.initialPosition);
    console.log('VRMRootController: VRMの位置をリセットしました');
  }

  /**
   * VRMの回転をリセット（初期回転復帰）
   */
  resetVRMRotation(): void {
    if (!this.currentVRM || !this.currentVRM.scene) {
      console.warn('VRMRootController: リセット対象のVRMがありません');
      return;
    }

    this.currentVRM.scene.rotation.copy(this.initialRotation);
    console.log('VRMRootController: VRMの回転をリセットしました');
  }

  /**
   * VRMの位置と回転を両方リセット
   */
  resetVRM(): void {
    if (!this.currentVRM || !this.currentVRM.scene) {
      console.warn('VRMRootController: リセット対象のVRMがありません');
      return;
    }

    this.resetVRMPosition();
    this.resetVRMRotation();
    console.log('VRMRootController: VRMの位置と回転を完全にリセットしました');
  }

  /**
   * 現在ルートのTransformControlsがドラッグ中かどうかを返す
   */
  isDragging(): boolean {
    return this.rootTransformControls ? this.rootTransformControls.dragging : false;
  }

  /**
   * ルート選択状態変更のコールバックを設定
   */
  setOnRootSelectionChanged(callback: ((isSelected: boolean) => void) | null): void {
    this.onRootSelectionChanged = callback;
  }

  /**
   * VRMルートオブジェクトの変換処理のリアルタイム更新
   */
  private updateVRMRootTransformation(): void {
    if (!this.currentVRM || !this.currentVRM.scene) return;

    // EventBusを使ってボーン表示更新イベントを発火
    // これにより、VRMBoneControllerがボーン表示要素の位置を更新する
    this.eventBus.emit('vrm-root-transform-changed', {
      vrm: this.currentVRM,
      position: this.currentVRM.scene.position.clone(),
      rotation: this.currentVRM.scene.rotation.clone()
    });

    console.log('VRMRootController: ルートオブジェクトの変換を更新しました');
  }

  /**
   * リソースの破棄
   */
  dispose(): void {
    this.detachFromCurrentVRM();
    
    if (this.rootTransformControls) {
      this.rootTransformControls.dispose();
      // TransformControlsを破棄
      const gizmo = this.rootTransformControls.getHelper();
      if (gizmo.parent) {
        gizmo.parent.remove(gizmo);
      }
    }
    
    console.log('VRMRootController: リソースを破棄しました');
  }

  /**
   * マネージャーの初期化（BaseManagerから継承）
   */
  initialize(): void {
    // VRMRootControllerはコンストラクタで初期化が完了するため、
    // 特別な初期化処理は不要
    console.log('VRMRootController: 初期化完了');
  }

  /**
   * マネージャーの名前を取得（BaseManagerから継承）
   */
  getName(): string {
    return 'VRMRootController';
  }
} 