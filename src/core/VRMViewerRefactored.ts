/**
 * VRMViewerRefactored - リファクタリングされたVRMビューワー
 * 
 * 薄いオーケストレーション層として各マネージャーを統合し、
 * 外部APIとの互換性を維持する
 */

import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import type { VRM } from '@pixiv/three-vrm';
import { ViewportGizmo } from 'three-viewport-gizmo';

// Managers
import { VRMManager } from './VRMManager';
import { LightController } from './LightController';
import { SelectionManager } from './SelectionManager';
import { BackgroundController } from './BackgroundController';
import { VRMBoneController } from './VRMBoneController';

// Event System
import { eventBus } from '../utils/EventBus';

export class VRMViewerRefactored {
  // Core Three.js components
  private canvas: HTMLCanvasElement;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private controls: OrbitControls;
  private animationId: number | null = null;

  // ViewportGizmo
  private viewportGizmo: ViewportGizmo;

  // Managers
  private vrmManager: VRMManager;
  private lightController: LightController;
  private selectionManager: SelectionManager;
  private backgroundController: BackgroundController;
  private boneController: VRMBoneController;

  // Raycast for interaction
  private raycaster: THREE.Raycaster;
  private mouse: THREE.Vector2;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera();
    this.renderer = new THREE.WebGLRenderer({ canvas });
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    
    // ViewportGizmoの初期化
    this.viewportGizmo = new ViewportGizmo(this.camera, this.renderer);
    
    // Raycast用の初期化
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();

    // Managersの初期化
    this.vrmManager = new VRMManager(this.scene);
    this.lightController = new LightController(this.scene, this.camera, this.renderer, this.controls);
    this.selectionManager = new SelectionManager(this.scene);
    this.backgroundController = new BackgroundController(this.scene);
    this.boneController = new VRMBoneController(this.scene, this.camera, this.renderer, this.controls);
  }

  /**
   * VRMビューワーを初期化
   */
  async initialize(): Promise<void> {
    this.setupRenderer();
    this.setupCamera();
    this.setupControls();
    this.setupViewportGizmo();
    this.setupEventListeners();

    // Managersの初期化
    await this.vrmManager.initialize();
    await this.lightController.initialize();
    await this.selectionManager.initialize();
    await this.backgroundController.initialize();

    this.startRenderLoop();
    
    console.log('VRMビューワーの初期化が完了しました');
  }

  /**
   * レンダラーの設定
   */
  private setupRenderer(): void {
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;
  }

  /**
   * カメラの設定
   */
  private setupCamera(): void {
    this.camera.fov = 75;
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.near = 0.1;
    this.camera.far = 1000;
    this.camera.position.set(0, 1.5, 3);
    this.camera.updateProjectionMatrix();
  }

  /**
   * カメラコントロールの設定
   */
  private setupControls(): void {
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.25;
    this.controls.enableZoom = true;
    this.controls.enablePan = true;
    this.controls.enableRotate = true;
    this.controls.target.set(0, 1, 0);
    this.controls.minDistance = 0.5;
    this.controls.maxDistance = 20;
    this.controls.minPolarAngle = 0;
    this.controls.maxPolarAngle = Math.PI;
  }

  /**
   * ViewportGizmoの設定
   */
  private setupViewportGizmo(): void {
    this.viewportGizmo.target = this.controls.target;
    this.viewportGizmo.addEventListener('change', () => {
      this.controls.update();
    });
  }

  /**
   * イベントリスナーの設定
   */
  private setupEventListeners(): void {
    // ウィンドウリサイズ
    window.addEventListener('resize', this.onWindowResize.bind(this));
    
    // マウスクリック（選択処理）
    this.canvas.addEventListener('click', this.onCanvasClick.bind(this));

    // VRMローデッドイベント - ボーンコントローラーにVRMを設定
    eventBus.on('vrm:selected', ({ vrm }) => {
      this.boneController.setVRM(vrm);
      if (vrm) {
        this.adjustCameraToModel(vrm);
      }
    });

    // VRM選択解除時
    eventBus.on('vrm:selection-cleared', () => {
      this.boneController.setVRM(null);
    });
  }

  /**
   * ウィンドウリサイズ処理
   */
  private onWindowResize(): void {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.viewportGizmo.update();
  }

  /**
   * キャンバスクリック処理
   */
  private onCanvasClick(event: MouseEvent): void {
    // マウス座標を正規化
    this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    // レイキャスト
    this.raycaster.setFromCamera(this.mouse, this.camera);

    // ライト選択をチェック
    const lightSelected = this.lightController.handleRaycast(this.raycaster);
    
    if (!lightSelected) {
      // ライトが選択されていない場合のみボーン選択処理を行う
      const selectedModel = this.selectionManager.getSelectedModel();
      if (selectedModel) {
        this.boneController.selectBoneByRaycast(this.raycaster);
      }
    }
  }

  /**
   * レンダリングループの開始
   */
  private startRenderLoop(): void {
    const animate = (): void => {
      this.animationId = requestAnimationFrame(animate);
      
      // コントロールの更新
      this.controls.update();
      
      // マネージャーの更新
      this.lightController.update();
      
      // レンダリング
      this.renderer.render(this.scene, this.camera);
      
      // ViewportGizmoの描画
      this.viewportGizmo.render();
    };
    
    animate();
  }

  /**
   * カメラ位置を調整してモデル全体が見えるようにする
   */
  private adjustCameraToModel(vrm: VRM): void {
    if (!vrm.scene) return;

    const box = new THREE.Box3().setFromObject(vrm.scene);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());

    const maxDim = Math.max(size.x, size.y, size.z);
    const fov = this.camera.fov * (Math.PI / 180);
    let cameraZ = Math.abs(maxDim / 2 / Math.tan(fov / 2));

    cameraZ *= 1.5; // 少し余裕を持たせる

    this.camera.position.set(center.x, center.y + size.y * 0.3, center.z + cameraZ);
    this.controls.target.copy(center);
    this.controls.update();
  }

  // ==================== PUBLIC API ====================
  // 外部からの操作用メソッド（既存APIとの互換性維持）

  /**
   * ファイルからVRMモデルを読み込む
   */
  async loadVRMFromFile(file: File): Promise<void> {
    const index = await this.vrmManager.loadVRMFromFile(file);
    const models = this.vrmManager.getVRMModels();
    if (models[index]) {
      this.selectionManager.selectModel(index, models[index]);
    }
  }

  /**
   * URLからVRMモデルを読み込む
   */
  async loadVRMFromURL(url: string): Promise<void> {
    const index = await this.vrmManager.loadVRMFromURL(url);
    const models = this.vrmManager.getVRMModels();
    if (models[index]) {
      this.selectionManager.selectModel(index, models[index]);
    }
  }

  /**
   * 指定されたインデックスのモデルを選択
   */
  selectModel(index: number): void {
    const models = this.vrmManager.getVRMModels();
    if (models[index]) {
      this.selectionManager.selectModel(index, models[index]);
    }
  }

  /**
   * 指定されたインデックスのVRMモデルを削除
   */
  removeVRMAtIndex(index: number): void {
    this.vrmManager.removeVRMAtIndex(index);
  }

  /**
   * VRMモデルのリストを取得
   */
  getVRMModels(): VRM[] {
    return this.vrmManager.getVRMModels();
  }

  /**
   * VRMモデルの数を取得
   */
  getVRMCount(): number {
    return this.vrmManager.getVRMCount();
  }

  /**
   * 現在選択されているモデルのインデックスを取得
   */
  getSelectedModelIndex(): number {
    return this.selectionManager.getSelectedModelIndex();
  }

  /**
   * 現在選択されているモデルを取得
   */
  getSelectedModel(): VRM | null {
    return this.selectionManager.getSelectedModel();
  }

  /**
   * ボーンの表示/非表示を切り替える
   */
  toggleBoneVisibility(visible?: boolean): boolean {
    return this.boneController.toggleBoneVisibility(visible);
  }

  /**
   * ボーン操作モードを設定（回転/移動）
   */
  setBoneTransformMode(mode: 'rotate' | 'translate'): void {
    this.boneController.setTransformMode(mode);
  }

  /**
   * すべてのボーンをリセット
   */
  resetAllBonePoses(): void {
    this.boneController.resetPose();
  }

  // ライト制御メソッド
  setAmbientLightIntensity(intensity: number): void {
    this.lightController.setAmbientLightIntensity(intensity);
  }

  setDirectionalLightIntensity(intensity: number): void {
    this.lightController.setDirectionalLightIntensity(intensity);
  }

  setRimLightIntensity(intensity: number): void {
    this.lightController.setRimLightIntensity(intensity);
  }

  setAmbientLightColor(color: number | THREE.Color): void {
    this.lightController.setAmbientLightColor(color);
  }

  setDirectionalLightColor(color: number | THREE.Color): void {
    this.lightController.setDirectionalLightColor(color);
  }

  setRimLightColor(color: number | THREE.Color): void {
    this.lightController.setRimLightColor(color);
  }

  setLightHelpersVisible(visible: boolean): void {
    this.lightController.setLightHelpersVisible(visible);
  }

  resetLights(): void {
    this.lightController.resetLights();
  }

  // 背景制御メソッド
  setBackgroundColor(color: string): void {
    this.backgroundController.setBackgroundColor(color);
  }

  setBackgroundTransparent(): void {
    this.backgroundController.setBackgroundTransparent();
  }

  setBackgroundGradient(topColor: string, bottomColor: string): void {
    this.backgroundController.setBackgroundGradient(topColor, bottomColor);
  }

  // カメラ制御メソッド
  resetCameraToDefault(): void {
    this.camera.position.set(0, 1.5, 3);
    this.controls.target.set(0, 1, 0);
    this.controls.update();
    eventBus.emit('camera:reset', undefined);
  }

  resetCameraToFitAll(): void {
    const models = this.vrmManager.getVRMModels();
    if (models.length === 0) return;

    // 全モデルのバウンディングボックスを計算
    const box = new THREE.Box3();
    models.forEach(vrm => {
      if (vrm.scene) {
        const modelBox = new THREE.Box3().setFromObject(vrm.scene);
        box.union(modelBox);
      }
    });

    if (box.isEmpty()) return;

    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z);
    const fov = this.camera.fov * (Math.PI / 180);
    let cameraZ = Math.abs(maxDim / 2 / Math.tan(fov / 2));
    cameraZ *= 1.5;

    this.camera.position.set(center.x, center.y + size.y * 0.3, center.z + cameraZ);
    this.controls.target.copy(center);
    this.controls.update();
  }

  async resetCameraAnimated(_duration: number = 1500): Promise<void> {
    // 簡易実装：アニメーションなしで即座に移動
    this.resetCameraToFitAll();
    return Promise.resolve();
  }

  centerModel(): void {
    const selectedModel = this.selectionManager.getSelectedModel();
    if (selectedModel) {
      this.adjustCameraToModel(selectedModel);
    }
  }

  setModelScale(scale: number): void {
    const selectedModel = this.selectionManager.getSelectedModel();
    if (selectedModel && selectedModel.scene) {
      selectedModel.scene.scale.setScalar(scale);
    }
  }

  focusOnSelectedModel(): void {
    const selectedModel = this.selectionManager.getSelectedModel();
    if (selectedModel) {
      this.adjustCameraToModel(selectedModel);
    }
  }

  toggleSelectedModelVisibility(): boolean {
    const selectedModel = this.selectionManager.getSelectedModel();
    if (selectedModel && selectedModel.scene) {
      selectedModel.scene.visible = !selectedModel.scene.visible;
      return selectedModel.scene.visible;
    }
    return false;
  }

  async duplicateSelectedModel(): Promise<boolean> {
    const selectedIndex = this.selectionManager.getSelectedModelIndex();
    if (selectedIndex >= 0) {
      const newIndex = await this.vrmManager.duplicateModel(selectedIndex);
      if (newIndex !== null) {
        const models = this.vrmManager.getVRMModels();
        if (models[newIndex]) {
          this.selectionManager.selectModel(newIndex, models[newIndex]);
        }
        return true;
      }
    }
    return false;
  }

  deleteSelectedModel(): boolean {
    const selectedIndex = this.selectionManager.getSelectedModelIndex();
    if (selectedIndex >= 0) {
      this.vrmManager.removeVRMAtIndex(selectedIndex);
      this.selectionManager.clearModelSelection();
      return true;
    }
    return false;
  }

  removeAllVRMs(): void {
    this.vrmManager.removeAllModels();
    this.selectionManager.clearModelSelection();
  }

  getSelectedModelScale(): number {
    const selectedModel = this.selectionManager.getSelectedModel();
    if (selectedModel && selectedModel.scene) {
      return selectedModel.scene.scale.x; // x, y, z は同じ値のはず
    }
    return 1.0;
  }

  // ライト取得メソッド
  getAmbientLightIntensity(): number {
    return this.lightController.getLightSettings().ambient.intensity;
  }

  getDirectionalLightIntensity(): number {
    return this.lightController.getLightSettings().directional.intensity;
  }

  getRimLightIntensity(): number {
    return this.lightController.getLightSettings().rim.intensity;
  }

  getAmbientLightColor(): THREE.Color {
    return this.lightController.getLightSettings().ambient.color;
  }

  getDirectionalLightColor(): THREE.Color {
    return this.lightController.getLightSettings().directional.color;
  }

  getRimLightColor(): THREE.Color {
    return this.lightController.getLightSettings().rim.color;
  }

  getLightHelpersVisible(): boolean {
    return this.lightController.getLightHelpersVisible();
  }

  isDirectionalLightSelected(): boolean {
    return this.lightController.isDirectionalLightSelected();
  }

  // 背景取得メソッド
  getBackgroundInfo(): { type: 'color' | 'gradient' | 'transparent', colors?: string[] } {
    return this.backgroundController.getBackgroundInfo();
  }

  resetBackground(): void {
    this.backgroundController.resetBackground();
  }

  /**
   * レンダリングループの停止
   */
  stop(): void {
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }

  /**
   * リソースのクリーンアップ
   */
  dispose(): void {
    this.stop();
    
    // Managersのクリーンアップ
    this.vrmManager.dispose();
    this.lightController.dispose();
    this.selectionManager.dispose();
    this.backgroundController.dispose();
    this.boneController.dispose();
    
    // レンダラーのクリーンアップ
    this.renderer.dispose();
    
    // イベントリスナーの削除
    window.removeEventListener('resize', this.onWindowResize.bind(this));
    this.canvas.removeEventListener('click', this.onCanvasClick.bind(this));
    
    // EventBusのクリーンアップ
    eventBus.clear();
  }

  // VRMManager関連のメソッド
  async duplicateModel(index: number): Promise<number | null> {
    return await this.vrmManager.duplicateModel(index);
  }

  removeAllModels(): void {
    this.vrmManager.removeAllModels();
  }

  // LightController関連のメソッド
  getLightSettings() {
    return this.lightController.getLightSettings();
  }

  // 不足していたメソッドを追加
  disableLightTransform(): void {
    // TODO: 実装
    console.log('disableLightTransform called');
  }

  enableDirectionalLightTransform(): void {
    // TODO: 実装  
    console.log('enableDirectionalLightTransform called');
  }
}
