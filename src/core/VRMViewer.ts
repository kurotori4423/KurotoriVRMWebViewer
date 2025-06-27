import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { VRM, VRMLoaderPlugin, VRMUtils } from '@pixiv/three-vrm';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

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
  
  // VRM関連
  private gltfLoader: GLTFLoader;
  private currentVRM: VRM | null = null;
  private vrmModels: VRM[] = []; // 複数VRM管理用
  private selectedModelIndex: number = -1; // 選択されたモデルのインデックス
  private outlineMesh: THREE.Mesh | null = null; // アウトライン表示用

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera();
    this.renderer = new THREE.WebGLRenderer({ canvas });
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    
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
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.3);
    this.scene.add(ambientLight);

    // ディレクショナルライト（太陽光のような平行光）
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1.0);
    directionalLight.position.set(1, 2, 3);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.setScalar(1024);
    directionalLight.shadow.camera.near = 0.1;
    directionalLight.shadow.camera.far = 10;
    directionalLight.shadow.camera.left = -5;
    directionalLight.shadow.camera.right = 5;
    directionalLight.shadow.camera.top = 5;
    directionalLight.shadow.camera.bottom = -5;
    this.scene.add(directionalLight);

    // リムライト（輪郭を際立たせる）
    const rimLight = new THREE.DirectionalLight(0x66ccff, 0.5);
    rimLight.position.set(-1, 1, -2);
    this.scene.add(rimLight);
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
    if (!this.currentVRM) {
      console.warn('VRMモデルが読み込まれていません');
      return;
    }

    this.currentVRM.scene.rotation.set(x, y, z);
    console.log(`モデルの回転を (${x}, ${y}, ${z}) に設定しました`);
  }

  /**
   * カメラ位置をリセット
   */
  resetCamera(): void {
    if (this.currentVRM) {
      this.adjustCameraToModel(this.currentVRM);
    } else {
      // デフォルト位置
      this.camera.position.set(0, 1.5, 3);
      this.camera.lookAt(0, 1, 0);
      this.controls.target.set(0, 1, 0);
      this.controls.update();
    }
    console.log('カメラ位置をリセットしました');
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
    this.currentVRM = null;
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
    
    // currentVRMが削除された場合は次のものを設定
    if (vrm === this.currentVRM) {
      this.currentVRM = this.vrmModels.length > 0 ? this.vrmModels[0] : null;
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

    try {
      // 元のモデルのシーンをクローン
      const clonedScene = selectedModel.scene.clone(true);
      
      // VRMUtilsを使って新しいVRMインスタンスを作成
      const clonedVRM = VRMUtils.deepDispose(clonedScene) as any as VRM;
      
      // 位置を少しずらして追加
      clonedScene.position.x += 1.5;
      
      this.scene.add(clonedScene);
      this.vrmModels.push(clonedVRM);
      
      // モデルを再配置
      this.repositionAllModels();
      
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
}
