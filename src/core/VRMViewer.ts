import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

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

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera();
    this.renderer = new THREE.WebGLRenderer({ canvas });
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
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
    this.renderer.dispose();
    window.removeEventListener('resize', this.onWindowResize.bind(this));
  }
}
