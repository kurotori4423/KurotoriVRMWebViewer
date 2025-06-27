import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { VRM, VRMLoaderPlugin, VRMUtils } from '@pixiv/three-vrm';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { ViewportGizmo } from 'three-viewport-gizmo';

/**
 * VRMビューワーのメインクラス
 * three.jsを使用してVRMモデルを表示・操作する機能を提供
 */
export class VRMViewer {
  private canvas: HTMLCanvasElement;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private controls: OrbitControls;
  private animationId: number | null = null;
  
  // ViewportGizmo関連
  private viewportGizmo: ViewportGizmo;
  
  // ライト制御用
  private ambientLight: THREE.AmbientLight;
  private directionalLight: THREE.DirectionalLight;
  private rimLight: THREE.DirectionalLight;
  
  // VRM関連
  private gltfLoader: GLTFLoader;
  private currentVRM: VRM | null = null;
  private vrmModels: VRM[] = []; // 複数VRM管理用
  private vrmSourceData: ArrayBuffer[] = []; // 各VRMの元データを保持（複製用）
  private selectedModelIndex: number = -1; // 選択されたモデルのインデックス
  private outlineMesh: THREE.Mesh | null = null; // アウトライン表示用

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera();
    this.renderer = new THREE.WebGLRenderer({ canvas });
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    
    // ViewportGizmoの初期化
    this.viewportGizmo = new ViewportGizmo(this.camera, this.renderer);
    
    // GLTFローダーの初期化とVRMプラグインの設定
    this.gltfLoader = new GLTFLoader();
    this.gltfLoader.register((parser) => {
      return new VRMLoaderPlugin(parser);
    });
  }

  /**
   * VRMビューワーを初期化
   */
  async initialize(): Promise<void> {
    this.setupRenderer();
    this.setupCamera();
    this.setupLights();
    this.setupControls();
    this.setupViewportGizmo();
    this.setupHelpers();
    this.setupEventListeners();
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
    
    // デフォルト背景色を設定
    this.scene.background = new THREE.Color('#2a2a2a');
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
   * ライティングの設定
   */
  private setupLights(): void {
    // 環境光
    this.ambientLight = new THREE.AmbientLight(0xffffff, 0.3);
    this.scene.add(this.ambientLight);

    // ディレクショナルライト（太陽光のような平行光）
    this.directionalLight = new THREE.DirectionalLight(0xffffff, 1.0);
    this.directionalLight.position.set(1, 2, 3);
    this.directionalLight.castShadow = true;
    this.directionalLight.shadow.mapSize.setScalar(1024);
    this.directionalLight.shadow.camera.near = 0.1;
    this.directionalLight.shadow.camera.far = 10;
    this.directionalLight.shadow.camera.left = -5;
    this.directionalLight.shadow.camera.right = 5;
    this.directionalLight.shadow.camera.top = 5;
    this.directionalLight.shadow.camera.bottom = -5;
    this.scene.add(this.directionalLight);

    // リムライト（輪郭を際立たせる）
    this.rimLight = new THREE.DirectionalLight(0x66ccff, 0.5);
    this.rimLight.position.set(-1, 1, -2);
    this.scene.add(this.rimLight);
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
   * ヘルパーオブジェクトの設定（グリッド、軸など）
   */
  private setupHelpers(): void {
    // グリッドヘルパー
    const gridHelper = new THREE.GridHelper(10, 10, 0x888888, 0x444444);
    this.scene.add(gridHelper);

    // 軸ヘルパー
    const axesHelper = new THREE.AxesHelper(1);
    this.scene.add(axesHelper);
  }

  /**
   * イベントリスナーの設定
   */
  private setupEventListeners(): void {
    // ウィンドウリサイズ対応
    window.addEventListener('resize', this.onWindowResize.bind(this));
  }

  /**
   * ウィンドウリサイズイベントハンドラ
   */
  private onWindowResize(): void {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    
    // ViewportGizmoの更新
    this.viewportGizmo.update();
  }

  /**
   * レンダリングループの開始
   */
  private startRenderLoop(): void {
    const animate = (): void => {
      this.animationId = requestAnimationFrame(animate);
      
      // コントロールの更新
      this.controls.update();
      
      // レンダリング
      this.renderer.render(this.scene, this.camera);
      
      // ViewportGizmoの描画
      this.viewportGizmo.render();
    };
    
    animate();
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
    
    // 現在のVRMを削除
    this.removeCurrentVRM();
    
    // レンダラーのクリーンアップ
    this.renderer.dispose();
    
    // イベントリスナーの削除
    window.removeEventListener('resize', this.onWindowResize.bind(this));
  }

  /**
   * ファイルからVRMモデルを読み込む
   */
  async loadVRMFromFile(file: File): Promise<void> {
    const arrayBuffer = await file.arrayBuffer();
    await this.loadVRMFromArrayBuffer(arrayBuffer);
  }

  /**
   * URLからVRMモデルを読み込む
   */
  async loadVRMFromURL(url: string): Promise<void> {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`VRMファイルの取得に失敗しました: ${response.status} ${response.statusText}`);
    }
    const arrayBuffer = await response.arrayBuffer();
    await this.loadVRMFromArrayBuffer(arrayBuffer);
  }

  /**
   * ArrayBufferからVRMモデルを読み込む
   */
  private async loadVRMFromArrayBuffer(arrayBuffer: ArrayBuffer): Promise<void> {
    try {
      // 既存のVRMがあれば削除
      if (this.currentVRM) {
        this.removeCurrentVRM();
      }

      // ArrayBufferをBlobURLに変換してロード
      const blob = new Blob([arrayBuffer], { type: 'application/octet-stream' });
      const url = URL.createObjectURL(blob);
      
      try {
        const gltf = await this.gltfLoader.loadAsync(url);
        const vrm = gltf.userData.vrm as VRM;

        if (!vrm) {
          throw new Error('有効なVRMデータが見つかりませんでした');
        }

        // VRMをシーンに追加
        this.currentVRM = vrm;
        this.vrmModels = [vrm]; // 単体読み込みの場合は配列をリセット
        this.vrmSourceData = [arrayBuffer.slice(0)]; // 元データを保存（複製用）
        this.scene.add(vrm.scene);

        // VRMの向きと位置を調整
        VRMUtils.rotateVRM0(vrm);
        
        // カメラ位置を調整してモデル全体が見えるようにする
        this.adjustCameraToModel(vrm);

        console.log('VRMモデルが正常に読み込まれました');
        console.log('VRMメタ情報:', vrm.meta);

      } finally {
        // BlobURLを解放
        URL.revokeObjectURL(url);
      }

    } catch (error) {
      console.error('VRM読み込みエラー:', error);
      throw new Error(`VRMの読み込みに失敗しました: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * 現在のVRMモデルを削除
   */
  private removeCurrentVRM(): void {
    if (this.currentVRM) {
      this.scene.remove(this.currentVRM.scene);
      
      // VRMのリソースを適切にクリーンアップ
      this.currentVRM.scene.traverse((object) => {
        if (object instanceof THREE.Mesh) {
          object.geometry.dispose();
          if (Array.isArray(object.material)) {
            object.material.forEach((material) => material.dispose());
          } else {
            object.material.dispose();
          }
        }
      });
      
      // 配列からも削除
      const index = this.vrmModels.indexOf(this.currentVRM);
      if (index !== -1) {
        this.vrmModels.splice(index, 1);
        this.vrmSourceData.splice(index, 1); // 元データも削除
      }
      
      this.currentVRM = null;
    }
  }

  /**
   * モデルに合わせてカメラ位置を調整
   */
  private adjustCameraToModel(vrm: VRM): void {
    // モデルのバウンディングボックスを計算
    const box = new THREE.Box3().setFromObject(vrm.scene);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());

    // モデルの高さに基づいてカメラ距離を計算
    const maxDim = Math.max(size.x, size.y, size.z);
    const fov = this.camera.fov * (Math.PI / 180);
    const distance = Math.abs(maxDim / Math.sin(fov / 2)) * 1.2;

    // カメラとコントロールの位置を調整
    this.camera.position.set(center.x + distance * 0.5, center.y + distance * 0.3, center.z + distance);
    this.camera.lookAt(center);
    this.controls.target.copy(center);
    this.controls.update();
  }

  /**
   * 現在のVRMモデルを取得
   */
  getCurrentVRM(): VRM | null {
    return this.currentVRM;
  }

  /**
   * モデルを中央に配置
   */
  centerModel(): void {
    // 選択されたモデルがある場合は選択されたモデルを対象にする
    const selectedModel = this.getSelectedModel();
    if (selectedModel) {
      // モデルのバウンディングボックスを計算
      const box = new THREE.Box3().setFromObject(selectedModel.scene);
      const center = box.getCenter(new THREE.Vector3());

      // モデルを原点に移動
      selectedModel.scene.position.copy(center.negate());
      
      console.log('選択されたモデルを中央に配置しました');
      return;
    }

    // 選択されたモデルがない場合は、currentVRMを対象にする
    if (!this.currentVRM) {
      console.warn('VRMモデルが読み込まれていません');
      return;
    }

    // モデルのバウンディングボックスを計算
    const box = new THREE.Box3().setFromObject(this.currentVRM.scene);
    const center = box.getCenter(new THREE.Vector3());

    // モデルを原点に移動
    this.currentVRM.scene.position.copy(center.negate());
    
    console.log('モデルを中央に配置しました');
  }

  /**
   * モデルのスケールを調整
   */
  setModelScale(scale: number): void {
    // 選択されたモデルがある場合は選択されたモデルを対象にする
    const selectedModel = this.getSelectedModel();
    if (selectedModel) {
      selectedModel.scene.scale.setScalar(scale);
      console.log(`選択されたモデルのスケールを ${scale} に設定しました`);
      return;
    }

    // 選択されたモデルがない場合は、currentVRMを対象にする
    if (!this.currentVRM) {
      console.warn('VRMモデルが読み込まれていません');
      return;
    }

    this.currentVRM.scene.scale.setScalar(scale);
    console.log(`モデルのスケールを ${scale} に設定しました`);
  }

  /**
   * モデルの位置を設定
   */
  setModelPosition(x: number, y: number, z: number): void {
    // 選択されたモデルがある場合は選択されたモデルを対象にする
    const selectedModel = this.getSelectedModel();
    if (selectedModel) {
      selectedModel.scene.position.set(x, y, z);
      console.log(`選択されたモデルの位置を (${x}, ${y}, ${z}) に設定しました`);
      return;
    }

    // 選択されたモデルがない場合は、currentVRMを対象にする
    if (!this.currentVRM) {
      console.warn('VRMモデルが読み込まれていません');
      return;
    }

    this.currentVRM.scene.position.set(x, y, z);
    console.log(`モデルの位置を (${x}, ${y}, ${z}) に設定しました`);
  }

  /**
   * モデルの回転を設定
   */
  setModelRotation(x: number, y: number, z: number): void {
    // 選択されたモデルがある場合は選択されたモデルを対象にする
    const selectedModel = this.getSelectedModel();
    if (selectedModel) {
      selectedModel.scene.rotation.set(x, y, z);
      console.log(`選択されたモデルの回転を (${x}, ${y}, ${z}) に設定しました`);
      return;
    }

    // 選択されたモデルがない場合は、currentVRMを対象にする
    if (!this.currentVRM) {
      console.warn('VRMモデルが読み込まれていません');
      return;
    }

    this.currentVRM.scene.rotation.set(x, y, z);
    console.log(`モデルの回転を (${x}, ${y}, ${z}) に設定しました`);
  }

  /**
   * カメラ位置をリセット（即座復帰）
   */
  resetCamera(): void {
    if (this.vrmModels.length > 0) {
      // 複数モデルがある場合は全体表示に調整
      this.adjustCameraToAllModels();
    } else {
      // デフォルト位置
      this.camera.position.set(0, 1.5, 3);
      this.camera.lookAt(0, 1, 0);
      this.controls.target.set(0, 1, 0);
      this.controls.update();
    }
    console.log('カメラ位置を即座にリセットしました');
  }

  /**
   * デフォルト位置への即座復帰
   */
  resetCameraToDefault(): void {
    // デフォルト位置（原点を見下ろす角度）
    this.camera.position.set(0, 1.5, 3);
    this.camera.lookAt(0, 1, 0);
    this.controls.target.set(0, 1, 0);
    this.controls.update();
    console.log('カメラをデフォルト位置にリセットしました');
  }

  /**
   * 全体表示への自動調整
   */
  resetCameraToFitAll(): void {
    if (this.vrmModels.length > 0) {
      this.adjustCameraToAllModels();
      console.log('カメラを全体表示に調整しました');
    } else {
      // モデルがない場合はデフォルト位置
      this.resetCameraToDefault();
    }
  }

  /**
   * 滑らかなアニメーション付きカメラリセット
   */
  async resetCameraAnimated(duration: number = 1000): Promise<void> {
    return new Promise((resolve) => {
      // 現在のカメラ位置とターゲット
      const startPosition = this.camera.position.clone();
      const startTarget = this.controls.target.clone();

      // 目標位置とターゲットを計算
      let endPosition: THREE.Vector3;
      let endTarget: THREE.Vector3;

      if (this.vrmModels.length > 0) {
        // 全体表示に調整した時の位置を計算
        const overallBox = new THREE.Box3();
        this.vrmModels.forEach((vrm) => {
          const box = new THREE.Box3().setFromObject(vrm.scene);
          overallBox.union(box);
        });

        const size = overallBox.getSize(new THREE.Vector3());
        const center = overallBox.getCenter(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z);
        const fov = this.camera.fov * (Math.PI / 180);
        const distance = Math.abs(maxDim / Math.sin(fov / 2)) * 1.2;

        endPosition = new THREE.Vector3(
          center.x + distance * 0.5,
          center.y + distance * 0.3,
          center.z + distance
        );
        endTarget = center.clone();
      } else {
        // デフォルト位置
        endPosition = new THREE.Vector3(0, 1.5, 3);
        endTarget = new THREE.Vector3(0, 1, 0);
      }

      // アニメーション
      const startTime = Date.now();
      
      const animate = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        // イージング関数（ease-out）
        const easeOut = 1 - Math.pow(1 - progress, 3);
        
        // 位置とターゲットを補間
        this.camera.position.lerpVectors(startPosition, endPosition, easeOut);
        this.controls.target.lerpVectors(startTarget, endTarget, easeOut);
        this.controls.update();

        if (progress < 1) {
          requestAnimationFrame(animate);
        } else {
          console.log('カメラアニメーションが完了しました');
          resolve();
        }
      };

      animate();
    });
  }

  /**
   * VRMを追加読み込み（複数体表示）
   */
  async addVRMFromFile(file: File): Promise<void> {
    const arrayBuffer = await file.arrayBuffer();
    await this.addVRMFromArrayBuffer(arrayBuffer);
  }

  /**
   * URLからVRMを追加読み込み
   */
  async addVRMFromURL(url: string): Promise<void> {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`VRMファイルの取得に失敗しました: ${response.status} ${response.statusText}`);
    }
    const arrayBuffer = await response.arrayBuffer();
    await this.addVRMFromArrayBuffer(arrayBuffer);
  }

  /**
   * ArrayBufferからVRMを追加読み込み
   */
  private async addVRMFromArrayBuffer(arrayBuffer: ArrayBuffer): Promise<void> {
    try {
      // ArrayBufferをBlobURLに変換してロード
      const blob = new Blob([arrayBuffer], { type: 'application/octet-stream' });
      const url = URL.createObjectURL(blob);
      
      try {
        const gltf = await this.gltfLoader.loadAsync(url);
        const vrm = gltf.userData.vrm as VRM;

        if (!vrm) {
          throw new Error('有効なVRMデータが見つかりませんでした');
        }

        // VRMをリストに追加
        this.vrmModels.push(vrm);
        this.vrmSourceData.push(arrayBuffer.slice(0)); // 元データを保存（複製用）
        
        // 最初のVRMの場合は currentVRM に設定
        if (!this.currentVRM) {
          this.currentVRM = vrm;
        }

        // VRMをシーンに追加
        this.scene.add(vrm.scene);

        // VRMの向きと位置を調整
        VRMUtils.rotateVRM0(vrm);
        
        // 複数体の場合は少しずらして配置
        if (this.vrmModels.length > 1) {
          const spacing = 2.0; // 元の2mに戻す
          const index = this.vrmModels.length - 1;
          vrm.scene.position.x = index * spacing - (this.vrmModels.length - 1) * spacing * 0.5;
        }

        // カメラ位置を調整（全体が見えるように）
        this.adjustCameraToAllModels();

        console.log(`VRMモデルが追加されました (総数: ${this.vrmModels.length})`);
        console.log('VRMメタ情報:', vrm.meta);

      } finally {
        // BlobURLを解放
        URL.revokeObjectURL(url);
      }

    } catch (error) {
      console.error('VRM読み込みエラー:', error);
      throw new Error(`VRMの読み込みに失敗しました: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * 全てのVRMモデルを削除
   */
  removeAllVRMs(): void {
    this.vrmModels.forEach((vrm) => {
      this.scene.remove(vrm.scene);
      // リソースクリーンアップ
      vrm.scene.traverse((object) => {
        if (object instanceof THREE.Mesh) {
          object.geometry.dispose();
          if (Array.isArray(object.material)) {
            object.material.forEach((material) => material.dispose());
          } else {
            object.material.dispose();
          }
        }
      });
    });
    
    this.vrmModels = [];
    this.vrmSourceData = []; // 元データもクリア
    this.currentVRM = null;
    this.selectedModelIndex = -1; // 選択もクリア
    console.log('全てのVRMモデルを削除しました');
  }

  /**
   * 指定されたインデックスのVRMモデルを削除
   */
  removeVRMAtIndex(index: number): void {
    if (index < 0 || index >= this.vrmModels.length) {
      console.warn('無効なインデックスです');
      return;
    }

    const vrm = this.vrmModels[index];
    this.scene.remove(vrm.scene);
    
    // リソースクリーンアップ
    vrm.scene.traverse((object) => {
      if (object instanceof THREE.Mesh) {
        object.geometry.dispose();
        if (Array.isArray(object.material)) {
          object.material.forEach((material) => material.dispose());
        } else {
          object.material.dispose();
        }
      }
    });

    // 配列から削除
    this.vrmModels.splice(index, 1);
    this.vrmSourceData.splice(index, 1); // 元データも削除
    
    // currentVRMが削除された場合は次のものを設定
    if (vrm === this.currentVRM) {
      this.currentVRM = this.vrmModels.length > 0 ? this.vrmModels[0] : null;
    }

    // 選択インデックスの調整
    if (this.selectedModelIndex === index) {
      this.selectedModelIndex = -1; // 削除されたモデルが選択されていた場合はクリア
    } else if (this.selectedModelIndex > index) {
      this.selectedModelIndex--; // インデックスをずらす
    }

    // 残りのモデルを再配置
    this.repositionAllModels();
    
    console.log(`VRMモデル ${index} を削除しました (残り: ${this.vrmModels.length})`);
  }

  /**
   * 全モデルを再配置
   */
  private repositionAllModels(): void {
    const spacing = 2.0; // 元の2mに戻す
    this.vrmModels.forEach((vrm, index) => {
      vrm.scene.position.x = index * spacing - (this.vrmModels.length - 1) * spacing * 0.5;
    });
    this.adjustCameraToAllModels();
  }

  /**
   * 全モデルが見えるようにカメラを調整
   */
  private adjustCameraToAllModels(): void {
    if (this.vrmModels.length === 0) {
      this.resetCamera();
      return;
    }

    // 全モデルのバウンディングボックスを計算
    const overallBox = new THREE.Box3();
    this.vrmModels.forEach((vrm) => {
      const box = new THREE.Box3().setFromObject(vrm.scene);
      overallBox.union(box);
    });

    const size = overallBox.getSize(new THREE.Vector3());
    const center = overallBox.getCenter(new THREE.Vector3());

    // 全体が見えるカメラ距離を計算
    const maxDim = Math.max(size.x, size.y, size.z);
    const fov = this.camera.fov * (Math.PI / 180);
    const distance = Math.abs(maxDim / Math.sin(fov / 2)) * 1.2;

    // カメラとコントロールの位置を調整
    this.camera.position.set(center.x + distance * 0.5, center.y + distance * 0.3, center.z + distance);
    this.camera.lookAt(center);
    this.controls.target.copy(center);
    this.controls.update();
  }

  /**
   * VRMモデルのリストを取得
   */
  getVRMModels(): VRM[] {
    return [...this.vrmModels];
  }

  /**
   * VRMモデルの数を取得
   */
  getVRMCount(): number {
    return this.vrmModels.length;
  }

  // ===== モデル選択・操作機能 =====

  /**
   * 指定されたインデックスのモデルを選択
   */
  selectModel(index: number): void {
    if (index < 0 || index >= this.vrmModels.length) {
      this.selectedModelIndex = -1;
      this.hideOutline();
      return;
    }

    this.selectedModelIndex = index;
    this.showOutline(this.vrmModels[index]);
  }

  /**
   * 現在選択されているモデルのインデックスを取得
   */
  getSelectedModelIndex(): number {
    return this.selectedModelIndex;
  }

  /**
   * 現在選択されているモデルを取得
   */
  getSelectedModel(): VRM | null {
    if (this.selectedModelIndex >= 0 && this.selectedModelIndex < this.vrmModels.length) {
      return this.vrmModels[this.selectedModelIndex];
    }
    return null;
  }

  /**
   * 選択されたモデルの現在のスケール値を取得
   */
  getSelectedModelScale(): number {
    const selectedModel = this.getSelectedModel();
    if (selectedModel && selectedModel.scene) {
      return selectedModel.scene.scale.x; // x, y, z は同じ値のはず（setScalarで設定）
    }
    return 1.0; // デフォルト値
  }

  /**
   * 選択されたモデルにアウトライン表示
   */
  private showOutline(vrm: VRM): void {
    this.hideOutline();

    if (!vrm.scene) return;

    // アウトライン用のマテリアル作成
    const outlineMaterial = new THREE.MeshBasicMaterial({
      color: 0x00ff00,
      side: THREE.BackSide,
      transparent: true,
      opacity: 0.3
    });

    // 固定サイズのアウトラインボックスを作成（VRMの標準サイズに基づく）
    const standardSize = { x: 2.4, y: 2.0, z: 1.2 }; // VRMの一般的なサイズ
    const centerOffset = { x: 0, y: 1.0, z: 0 }; // VRMの一般的な中心オフセット

    // アウトライン用のボックスジオメトリ作成
    const outlineGeometry = new THREE.BoxGeometry(
      standardSize.x * 1.1,
      standardSize.y * 1.1, 
      standardSize.z * 1.1
    );

    this.outlineMesh = new THREE.Mesh(outlineGeometry, outlineMaterial);
    
    // アウトラインの位置 = モデルの現在位置 + 中心オフセット
    this.outlineMesh.position.set(
      vrm.scene.position.x + centerOffset.x,
      vrm.scene.position.y + centerOffset.y,
      vrm.scene.position.z + centerOffset.z
    );
    
    this.scene.add(this.outlineMesh);
    
    console.log(`アウトライン表示修正版3: モデル位置(${vrm.scene.position.x.toFixed(2)}, ${vrm.scene.position.y.toFixed(2)}, ${vrm.scene.position.z.toFixed(2)}), 中心オフセット(${centerOffset.x.toFixed(2)}, ${centerOffset.y.toFixed(2)}, ${centerOffset.z.toFixed(2)}), 最終位置(${this.outlineMesh.position.x.toFixed(2)}, ${this.outlineMesh.position.y.toFixed(2)}, ${this.outlineMesh.position.z.toFixed(2)})`);
  }

  /**
   * アウトライン表示を隠す
   */
  private hideOutline(): void {
    if (this.outlineMesh) {
      this.scene.remove(this.outlineMesh);
      this.outlineMesh.geometry.dispose();
      if (Array.isArray(this.outlineMesh.material)) {
        this.outlineMesh.material.forEach(material => material.dispose());
      } else {
        this.outlineMesh.material.dispose();
      }
      this.outlineMesh = null;
    }
  }

  /**
   * 選択されたモデルにカメラをフォーカス
   */
  focusOnSelectedModel(): void {
    const selectedModel = this.getSelectedModel();
    if (!selectedModel || !selectedModel.scene) return;

    // 既存のadjustCameraToModelメソッドを利用
    this.adjustCameraToModel(selectedModel);
  }

  /**
   * 選択されたモデルの表示/非表示を切り替え
   */
  toggleSelectedModelVisibility(): boolean {
    const selectedModel = this.getSelectedModel();
    if (!selectedModel || !selectedModel.scene) return false;

    selectedModel.scene.visible = !selectedModel.scene.visible;
    return selectedModel.scene.visible;
  }

  /**
   * 選択されたモデルを削除
   */
  deleteSelectedModel(): boolean {
    if (this.selectedModelIndex < 0 || this.selectedModelIndex >= this.vrmModels.length) {
      return false;
    }

    const modelToDelete = this.vrmModels[this.selectedModelIndex];
    
    // シーンから削除
    if (modelToDelete.scene) {
      this.scene.remove(modelToDelete.scene);
    }

    // リソースの解放（既存の処理パターンを使用）
    if (modelToDelete.scene) {
      modelToDelete.scene.traverse((object) => {
        if (object instanceof THREE.Mesh) {
          object.geometry.dispose();
          if (Array.isArray(object.material)) {
            object.material.forEach((material) => material.dispose());
          } else {
            object.material.dispose();
          }
        }
      });
    }

    // 配列から削除
    this.vrmModels.splice(this.selectedModelIndex, 1);
    this.vrmSourceData.splice(this.selectedModelIndex, 1); // 元データも削除

    // 選択をクリア
    this.hideOutline();
    this.selectedModelIndex = -1;

    // 残ったモデルを再配置
    this.repositionAllModels();

    return true;
  }

  /**
   * 選択されたモデルを複製
   */
  async duplicateSelectedModel(): Promise<boolean> {
    const selectedModel = this.getSelectedModel();
    if (!selectedModel) return false;

    const selectedIndex = this.selectedModelIndex;
    if (selectedIndex < 0 || selectedIndex >= this.vrmSourceData.length) {
      console.error('選択されたモデルの元データが見つかりません');
      return false;
    }

    try {
      // 元のArrayBufferから新しいVRMインスタンスを作成
      const sourceData = this.vrmSourceData[selectedIndex];
      const clonedArrayBuffer = sourceData.slice(0); // ArrayBufferをコピー
      
      // 新しいVRMを追加読み込みとして処理
      await this.addVRMFromArrayBuffer(clonedArrayBuffer);
      
      console.log('モデルの複製が完了しました');
      return true;
    } catch (error) {
      console.error('モデルの複製に失敗しました:', error);
      return false;
    }
  }

  /**
   * モデル選択をクリア
   */
  clearSelection(): void {
    this.selectedModelIndex = -1;
    this.hideOutline();
  }

  /**
   * 環境光の強度を設定
   * @param intensity 強度 (0.0 - 2.0)
   */
  setAmbientLightIntensity(intensity: number): void {
    this.ambientLight.intensity = Math.max(0, Math.min(2, intensity));
  }

  /**
   * ディレクショナルライトの強度を設定
   * @param intensity 強度 (0.0 - 3.0)
   */
  setDirectionalLightIntensity(intensity: number): void {
    this.directionalLight.intensity = Math.max(0, Math.min(3, intensity));
  }

  /**
   * リムライトの強度を設定
   * @param intensity 強度 (0.0 - 2.0)
   */
  setRimLightIntensity(intensity: number): void {
    this.rimLight.intensity = Math.max(0, Math.min(2, intensity));
  }

  /**
   * 現在の環境光の強度を取得
   * @returns 環境光の強度
   */
  getAmbientLightIntensity(): number {
    return this.ambientLight.intensity;
  }

  /**
   * 現在のディレクショナルライトの強度を取得
   * @returns ディレクショナルライトの強度
   */
  getDirectionalLightIntensity(): number {
    return this.directionalLight.intensity;
  }

  /**
   * 現在のリムライトの強度を取得
   * @returns リムライトの強度
   */
  getRimLightIntensity(): number {
    return this.rimLight.intensity;
  }

  /**
   * 全てのライトをデフォルト設定にリセット
   */
  resetLights(): void {
    this.setAmbientLightIntensity(0.3);
    this.setDirectionalLightIntensity(1.0);
    this.setRimLightIntensity(0.5);
  }

  /**
   * 背景色を単色に設定
   * @param color 背景色（16進数カラー文字列 例: "#ffffff" または CSS色名）
   */
  setBackgroundColor(color: string): void {
    this.scene.background = new THREE.Color(color);
  }

  /**
   * 背景を透明に設定
   */
  setBackgroundTransparent(): void {
    this.scene.background = null;
  }

  /**
   * 背景をグラデーションに設定
   * @param topColor 上部の色
   * @param bottomColor 下部の色
   */
  setBackgroundGradient(topColor: string, bottomColor: string): void {
    // グラデーション用のキューブテクスチャを作成
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d')!;
    canvas.width = 512;
    canvas.height = 512;

    // グラデーションを描画
    const gradient = context.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, topColor);
    gradient.addColorStop(1, bottomColor);

    context.fillStyle = gradient;
    context.fillRect(0, 0, canvas.width, canvas.height);

    // テクスチャを作成
    const texture = new THREE.CanvasTexture(canvas);
    this.scene.background = texture;
  }

  /**
   * 現在の背景設定を取得
   * @returns 背景の種類と色情報
   */
  getBackgroundInfo(): { type: 'color' | 'gradient' | 'transparent', colors?: string[] } {
    if (!this.scene.background) {
      return { type: 'transparent' };
    }

    if (this.scene.background instanceof THREE.Color) {
      return { 
        type: 'color', 
        colors: [`#${this.scene.background.getHexString()}`] 
      };
    }

    // テクスチャ（グラデーション）の場合
    return { type: 'gradient' };
  }

  /**
   * 背景をデフォルト設定にリセット
   */
  resetBackground(): void {
    this.setBackgroundColor('#2a2a2a'); // ダークグレーをデフォルトに
  }
}
