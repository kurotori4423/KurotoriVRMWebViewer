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
}
