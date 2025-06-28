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
import { VRMRootController } from './VRMRootController';

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
  private rootController: VRMRootController;

  // Raycast for interaction
  private raycaster: THREE.Raycaster;
  private mouse: THREE.Vector2;

  // カメラ自動フォーカス制御
  private enableAutoFocus: boolean = true; // 自動フォーカス有効フラグ
  private isFirstModelLoaded: boolean = false; // 最初のモデル読み込み済みフラグ

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
    this.rootController = new VRMRootController(this.scene, this.camera, this.renderer, this.controls);
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
    this.rootController.initialize();

    this.startRenderLoop();
    
    // 初期化完了後に強制的にサイズ更新
    setTimeout(() => {
      this.updateCanvasSizeImproved();
    }, 100);
    
    console.log('VRMビューワーの初期化が完了しました');
  }

  /**
   * レンダラーの設定
   */
  private setupRenderer(): void {
    // 初期サイズの取得
    const { width, height } = this.getCanvasSize();
    
    console.log(`🎨 Renderer initialization: ${width}x${height}`);
    
    this.renderer.setSize(width, height, true); // CSS更新も行う
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;
  }

  /**
   * 信頼性の高いキャンバスサイズ取得（ビューポート全体使用）
   */
  private getCanvasSize(): { width: number; height: number } {
    // キャンバスはposition: fixed + 100vw/100vhなので、
    // 常にビューポートサイズと一致するべき
    const width = window.innerWidth;
    const height = window.innerHeight;

    // 念のため、最小サイズ制限を設ける
    const minWidth = 320;
    const minHeight = 240;

    return { 
      width: Math.max(width, minWidth), 
      height: Math.max(height, minHeight) 
    };
  }

  /**
   * カメラの設定
   */
  private setupCamera(): void {
    // 初期サイズの取得
    const { width, height } = this.getCanvasSize();
    
    this.camera.fov = 75;
    this.camera.aspect = width / height;
    this.camera.near = 0.1;
    this.camera.far = 1000;
    this.camera.position.set(0, 1.5, 3);
    this.camera.updateProjectionMatrix();
    
    console.log(`📷 Camera initialization: aspect=${(width/height).toFixed(2)} (${width}x${height})`);
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
    // OrbitControlsをViewportGizmoに接続
    this.viewportGizmo.attachControls(this.controls);
    
    console.log('ViewportGizmo が正常に初期化されました');
  }

  /**
   * イベントリスナーの設定
   */
  private setupEventListeners(): void {
    // ウィンドウリサイズ
    window.addEventListener('resize', this.onWindowResize.bind(this));
    
    // マウスダウン（選択処理） - clickではなくmousedownで判定
    this.canvas.addEventListener('mousedown', this.onCanvasMouseDown.bind(this));

    // VRMローデッドイベント - ボーンコントローラーにVRMを設定
    eventBus.on('vrm:selected', ({ vrm }) => {
      this.boneController.setVRM(vrm);
      this.rootController.setVRM(vrm);
      if (vrm) {
        // 自動フォーカス条件：有効フラグ && 最初のモデル読み込み時のみ
        if (this.enableAutoFocus && !this.isFirstModelLoaded) {
          this.adjustCameraToModel(vrm);
          this.isFirstModelLoaded = true;
          console.log('🎯 最初のモデルに自動フォーカスしました');
        } else {
          console.log('📹 カメラ自動フォーカスをスキップしました（複数体モデル対応）');
        }
      }
    });

    // VRM選択解除時
    eventBus.on('vrm:selection-cleared', () => {
      this.boneController.setVRM(null);
      this.rootController.setVRM(null);
    });
  }

  /**
   * リサイズのデバウンス用タイマー
   */
  private resizeTimeout: number | null = null;

  /**
   * ウィンドウリサイズ処理（デバウンス処理付き）
   */
  private onWindowResize(): void {
    // 既存のタイマーをクリア
    if (this.resizeTimeout) {
      clearTimeout(this.resizeTimeout);
    }

    // デバウンス処理（50ms後に実行）
    this.resizeTimeout = window.setTimeout(() => {
      this.updateCanvasSizeImproved();
    }, 50);
  }

  /**
   * 改善されたキャンバスサイズ更新処理
   */
  private updateCanvasSizeImproved(): void {
    requestAnimationFrame(() => {
      try {
        // 統一されたサイズ取得メソッドを使用
        const { width, height } = this.getCanvasSize();
        const canvasRect = this.canvas.getBoundingClientRect();

        // 現在のキャンバスCSSサイズを確認
        const canvasComputedStyle = window.getComputedStyle(this.canvas);
        const cssWidth = parseFloat(canvasComputedStyle.width);
        const cssHeight = parseFloat(canvasComputedStyle.height);

        // レンダラーの現在のサイズ
        const rendererSize = this.renderer.getSize(new THREE.Vector2());

        // デバッグ情報をログ出力
        console.log(`🔄 Canvas resize analysis:`, {
          detection: {
            method: canvasRect.width > 0 ? 'getBoundingClientRect' : 'fallback',
            getBoundingClientRect: { width: canvasRect.width, height: canvasRect.height },
            computedStyle: { width: cssWidth, height: cssHeight },
            finalTargetSize: { width, height },
          },
          current: {
            rendererSize: { width: rendererSize.width, height: rendererSize.height },
            cameraAspect: this.camera.aspect,
          },
          window: {
            innerSize: { width: window.innerWidth, height: window.innerHeight },
            devicePixelRatio: window.devicePixelRatio
          }
        });

        // CSSサイズの明示的な同期（必要な場合）
        if (Math.abs(cssWidth - width) > 1 || Math.abs(cssHeight - height) > 1) {
          console.log(`🔧 CSS size mismatch detected, synchronizing...`);
          this.canvas.style.width = `${width}px`;
          this.canvas.style.height = `${height}px`;
        }

        // カメラとレンダラーを更新
        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
        
        // updateStyleをtrueにしてCSS更新も行う
        this.renderer.setSize(width, height, true);
        
        // ピクセル密度も再設定
        this.renderer.setPixelRatio(window.devicePixelRatio);
        
        // ViewportGizmoの更新
        this.viewportGizmo.update();

        // 更新後のサイズ確認
        const finalRendererSize = this.renderer.getSize(new THREE.Vector2());
        console.log(`✅ Canvas resize complete:`, {
          targetSize: { width, height },
          rendererSize: { width: finalRendererSize.width, height: finalRendererSize.height },
          aspect: (width/height).toFixed(2),
          pixelRatio: window.devicePixelRatio
        });

      } catch (error) {
        console.error('❌ Canvas resize error:', error);
        
        // エラー時のフォールバック
        const fallbackWidth = window.innerWidth;
        const fallbackHeight = window.innerHeight;
        
        this.camera.aspect = fallbackWidth / fallbackHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(fallbackWidth, fallbackHeight, true);
        this.viewportGizmo.update();
        
        console.log(`🔄 Fallback resize applied: ${fallbackWidth}x${fallbackHeight}`);
      }
    });
  }

  /**
   * キャンバスマウスダウン処理（選択処理）
   * TransformControlsのドラッグ誤爆を防ぐためmousedownイベントで判定
   */
  private onCanvasMouseDown(event: MouseEvent): void {
    // TransformControlsのドラッグ中は選択処理をスキップ
    if (this.boneController.isDragging()) {
      console.log('TransformControlsドラッグ中につき選択処理をスキップ');
      return;
    }

    // マウス座標を正規化（キャンバスの実際のサイズに基づく）
    const rect = this.canvas.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

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
      
      const deltaTime = 0.016; // 約60FPS想定 (1/60)
      
      // コントロールの更新
      this.controls.update();
      
      // マネージャーの更新
      this.lightController.update();
      
      // VRMモデルの更新処理
      this.updateVRMModels();
      
      // ボーン線の毎フレーム更新（SpringBone対応）
      this.boneController.update(deltaTime);
      
      // レンダリング
      this.renderer.render(this.scene, this.camera);
      
      // ViewportGizmoの描画
      this.viewportGizmo.render();
    };
    
    animate();
  }

  /**
   * すべてのVRMモデルの更新処理
   */
  private updateVRMModels(): void {
    const vrmModels = this.vrmManager.getVRMModels();
    const deltaTime = 0.016; // 約60FPS想定 (1/60)
    
    for (const vrm of vrmModels) {
      if (vrm.update) {
        vrm.update(deltaTime);
      }
    }
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
   * ボーン操作の座標系を設定（ワールド/ローカル）
   * @param space 'world' (ワールド座標系) または 'local' (ローカル座標系)
   */
  setBoneTransformSpace(space: 'world' | 'local'): void {
    try {
      this.boneController.setTransformSpace(space);
    } catch (error) {
      console.error('ボーン座標系設定エラー:', error);
    }
  }

  /**
   * 現在のボーン操作座標系を取得
   * @returns 'world' (ワールド座標系) または 'local' (ローカル座標系)
   */
  getBoneTransformSpace(): 'world' | 'local' {
    return this.boneController.getCurrentTransformSpace();
  }

  /**
   * 現在選択されているボーンが移動可能かどうかを確認
   * @returns true: 移動可能, false: 移動不可
   */
  isSelectedBoneTranslatable(): boolean {
    return this.boneController.isSelectedBoneTranslatable();
  }

  /**
   * TransformModeの自動変更コールバックを設定
   */
  setOnTransformModeAutoChanged(callback: ((mode: 'rotate' | 'translate') => void) | null): void {
    this.boneController.setOnTransformModeAutoChanged(callback);
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

  // グリッド制御メソッド
  toggleGrid(): void {
    this.backgroundController.toggleGrid();
  }

  setGridVisible(visible: boolean): void {
    this.backgroundController.setGridVisible(visible);
  }

  isGridVisible(): boolean {
    return this.backgroundController.isGridVisible();
  }

  getGridSettings() {
    return this.backgroundController.getGridSettings();
  }

  updateGridSettings(settings: Partial<import('./BackgroundController').GridSettings>): void {
    this.backgroundController.updateGridSettings(settings);
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

    const box = new THREE.Box3();
    models.forEach(vrm => {
      if (vrm.scene) {
        box.expandByObject(vrm.scene);
      }
    });

    if (!box.isEmpty()) {
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
  }

  async resetCameraAnimated(duration: number = 1500): Promise<void> {
    // シンプルな実装 - 実際のアニメーションは今のところスキップ
    this.resetCameraToDefault();
    return new Promise(resolve => setTimeout(resolve, duration));
  }

  centerModel(): void {
    const selectedModel = this.selectionManager.getSelectedModel();
    if (selectedModel && selectedModel.scene) {
      selectedModel.scene.position.set(0, 0, 0);
    }
  }

  /**
   * VRMモデルをリセット（位置・回転を初期状態に戻す）
   */
  resetModel(): void {
    this.rootController.resetVRM();
    console.log('モデルをリセットしました（位置・回転を初期状態に復帰）');
  }

  /**
   * VRMルートオブジェクト操作を有効化
   */
  enableRootTransform(): void {
    this.rootController.enableRootTransform();
  }

  /**
   * VRMルートオブジェクト操作を無効化
   */
  disableRootTransform(): void {
    this.rootController.disableRootTransform();
  }

  /**
   * VRMルートオブジェクト操作の切り替え
   */
  toggleRootTransform(): boolean {
    return this.rootController.toggleRootTransform();
  }

  /**
   * VRMルートオブジェクトのTransformモードを設定
   */
  setRootTransformMode(mode: 'translate' | 'rotate'): void {
    this.rootController.setTransformMode(mode);
  }

  /**
   * VRMルートオブジェクトのTransform座標系を設定
   */
  setRootTransformSpace(space: 'world' | 'local'): void {
    this.rootController.setTransformSpace(space);
  }

  /**
   * VRMルートオブジェクトの現在のTransformモードを取得
   */
  getRootTransformMode(): 'translate' | 'rotate' {
    return this.rootController.getCurrentTransformMode();
  }

  /**
   * VRMルートオブジェクトの現在のTransform座標系を取得
   */
  getRootTransformSpace(): 'world' | 'local' {
    return this.rootController.getCurrentTransformSpace();
  }

  /**
   * VRMルートオブジェクトのTransformControls表示状態を取得
   */
  isRootTransformVisible(): boolean {
    return this.rootController.isRootTransformControlsVisible();
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
    // 全モデル削除時に最初のモデルフラグをリセット
    this.isFirstModelLoaded = false;
    console.log('🔄 全モデル削除により最初のモデルフラグをリセットしました');
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
   * キャンバスサイズを強制的に更新（外部API用）
   */
  public updateCanvasSize(): void {
    console.log('📢 Manual canvas size update requested');
    this.updateCanvasSizeImproved();
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
    
    // リサイズタイマーのクリーンアップ
    if (this.resizeTimeout) {
      clearTimeout(this.resizeTimeout);
      this.resizeTimeout = null;
    }
    
    // Managersのクリーンアップ
    this.vrmManager.dispose();
    this.lightController.dispose();
    this.selectionManager.dispose();
    this.backgroundController.dispose();
    this.boneController.dispose();
    this.rootController.dispose();
    
    // レンダラーのクリーンアップ
    this.renderer.dispose();
    
    // イベントリスナーの削除
    window.removeEventListener('resize', this.onWindowResize.bind(this));
    this.canvas.removeEventListener('mousedown', this.onCanvasMouseDown.bind(this));
    
    // EventBusのクリーンアップ
    eventBus.clear();
  }

  // VRMManager関連のメソッド
  async duplicateModel(index: number): Promise<number | null> {
    return await this.vrmManager.duplicateModel(index);
  }

  removeAllModels(): void {
    this.vrmManager.removeAllModels();
    // 全モデル削除時に最初のモデルフラグをリセット
    this.isFirstModelLoaded = false;
    console.log('🔄 全モデル削除により最初のモデルフラグをリセットしました');
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

  /**
   * カメラ自動フォーカス機能の有効/無効を設定
   * @param enabled true: 有効, false: 無効
   */
  setAutoFocusEnabled(enabled: boolean): void {
    this.enableAutoFocus = enabled;
    console.log(`📹 カメラ自動フォーカス: ${enabled ? '有効' : '無効'}`);
  }

  /**
   * カメラ自動フォーカス機能の状態を取得
   * @returns true: 有効, false: 無効
   */
  getAutoFocusEnabled(): boolean {
    return this.enableAutoFocus;
  }

  /**
   * 最初のモデル読み込み状態をリセット（デバッグ用）
   */
  resetFirstModelFlag(): void {
    this.isFirstModelLoaded = false;
    console.log('🔄 最初のモデル読み込みフラグをリセットしました');
  }
}
