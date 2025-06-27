import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { TransformControls } from 'three/examples/jsm/controls/TransformControls.js';
import { VRM, VRMLoaderPlugin, VRMUtils } from '@pixiv/three-vrm';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { ViewportGizmo } from 'three-viewport-gizmo';
import { VRMBoneController } from './VRMBoneController';

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
  private ambientLight!: THREE.AmbientLight;
  private directionalLight!: THREE.DirectionalLight;
  private rimLight!: THREE.DirectionalLight;
  private directionalLightHelper: THREE.DirectionalLightHelper | null = null;
  private directionalLightProxy: THREE.Mesh | null = null; // ライト操作用の3Dオブジェクト（ワイヤーフレーム表示）
  private directionalLightCollider: THREE.Mesh | null = null; // ライト選択用の当たり判定球体（透明）
  private lightTransformControls: TransformControls | null = null;
  private lightHelpersVisible: boolean = true; // 初期状態から表示
  private proxyVisible: boolean = false; // プロキシオブジェクトの表示状態（ワイヤーフレーム非表示）
  private proxyInitialQuaternion: THREE.Quaternion | null = null; // プロキシの初期回転状態（ドラッグ開始時）
  private lightInitialDirection: THREE.Vector3 | null = null; // ライトの初期方向（ドラッグ開始時）
  
  // 3Dビュー選択用
  private raycaster: THREE.Raycaster;
  private mouse: THREE.Vector2;
  
  // ライト選択状態変更コールバック
  private onLightSelectionChanged: ((isSelected: boolean) => void) | null = null;
  
  // VRM関連
  private gltfLoader: GLTFLoader;
  private currentVRM: VRM | null = null;
  private vrmModels: VRM[] = []; // 複数VRM管理用
  private vrmSourceData: ArrayBuffer[] = []; // 各VRMの元データを保持（複製用）
  private selectedModelIndex: number = -1; // 選択されたモデルのインデックス
  private outlineMesh: THREE.Mesh | null = null; // アウトライン表示用
  
  // ボーンコントローラー
  private boneController: VRMBoneController | null = null;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera();
    this.renderer = new THREE.WebGLRenderer({ canvas });
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    
    // ViewportGizmoの初期化
    this.viewportGizmo = new ViewportGizmo(this.camera, this.renderer);
    
    // 3Dビュー選択用の初期化
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
    
    // GLTFローダーの初期化とVRMプラグインの設定
    this.gltfLoader = new GLTFLoader();
    this.gltfLoader.register((parser) => {
      // サムネイル画像を読み込むためのプラグイン設定
      const plugin = new VRMLoaderPlugin(parser);
      plugin.metaPlugin.needThumbnailImage = true;
      return plugin;
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
    this.setupBoneController();
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
    this.directionalLight.position.set(0, 3, 0); // +Y軸上に配置
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
    
    // ライトヘルパーの初期化
    this.setupLightHelpers();
  }
  
  /**
   * ライトヘルパーとTransformControlsの設定
   */
  private setupLightHelpers(): void {
    // DirectionalLightHelperの作成
    this.directionalLightHelper = new THREE.DirectionalLightHelper(this.directionalLight, 1);
    this.directionalLightHelper.visible = this.lightHelpersVisible;
    this.scene.add(this.directionalLightHelper);
    
    // ライト操作用のプロキシオブジェクトを作成（ワイヤーフレーム表示は無効化）
    const proxyGeometry = new THREE.BoxGeometry(0.5, 0.5, 0.5);
    const proxyMaterial = new THREE.MeshBasicMaterial({ 
      color: 0xff6600,  // オレンジ色
      wireframe: true,  // ワイヤーフレーム表示
      transparent: true,
      opacity: 0.7
    });
    this.directionalLightProxy = new THREE.Mesh(proxyGeometry, proxyMaterial);
    // プロキシの位置をライトと同じ位置に設定
    this.directionalLightProxy.position.copy(this.directionalLight.position);
    // プロキシの回転をアイデンティティに初期化
    this.directionalLightProxy.quaternion.set(0, 0, 0, 1);
    // プロキシの可視性を設定（ワイヤーフレーム表示を無効化）
    this.directionalLightProxy.visible = false;
    this.scene.add(this.directionalLightProxy);
    
    // ライト選択用のコライダー（透明球体）を作成
    const colliderGeometry = new THREE.SphereGeometry(0.5);
    const colliderMaterial = new THREE.MeshBasicMaterial({ 
      transparent: true,
      opacity: 0, // 完全に透明
      depthTest: false, // 深度テストを無効にして常に選択可能
      depthWrite: false
    });
    this.directionalLightCollider = new THREE.Mesh(colliderGeometry, colliderMaterial);
    // コライダーの位置をライトと同じ位置に設定
    this.directionalLightCollider.position.copy(this.directionalLight.position);
    // コライダーの可視性をライトヘルパーと連動
    this.directionalLightCollider.visible = this.lightHelpersVisible;
    // ライト選択識別用のユーザーデータを設定
    this.directionalLightCollider.userData.isLightCollider = true;
    this.directionalLightCollider.userData.lightType = 'directional';
    this.scene.add(this.directionalLightCollider);
    
    // TransformControlsの作成
    this.lightTransformControls = new TransformControls(this.camera, this.renderer.domElement);
    this.lightTransformControls.setMode('rotate'); // 回転モードに設定
    this.lightTransformControls.enabled = false; // 初期状態では無効
    
    // TransformControlsのギズモをシーンに追加
    const gizmo = this.lightTransformControls.getHelper();
    this.scene.add(gizmo);
    
    // TransformControlsのイベント設定
    let isDragging = false;
    
    this.lightTransformControls.addEventListener('dragging-changed', (event) => {
      // TransformControls使用中はOrbitControlsを無効化
      this.controls.enabled = !event.value;
      isDragging = event.value as boolean;
      
      // ドラッグ開始時に初期状態を保存
      if (isDragging && this.directionalLightProxy) {
        // プロキシの初期回転状態を保存
        this.proxyInitialQuaternion = this.directionalLightProxy.quaternion.clone();
        
        // ライトの初期方向を保存
        this.lightInitialDirection = new THREE.Vector3();
        this.lightInitialDirection.subVectors(
          this.directionalLight.target.position, 
          this.directionalLight.position
        ).normalize();
        
        console.log('ドラッグ開始 - 初期状態保存:', {
          proxyQuaternion: this.proxyInitialQuaternion,
          lightDirection: this.lightInitialDirection
        });
      } else if (!isDragging) {
        // ドラッグ終了時の処理
        console.log('ドラッグ終了');
      }
    });
    
    // TransformControlsの変更イベントでライトの向きを更新（ドラッグ中のみ）
    this.lightTransformControls.addEventListener('change', () => {
      // ドラッグ中のみライトの回転を更新
      if (!isDragging) {
        return;
      }
      
      if (this.directionalLightProxy && 
          this.lightTransformControls?.object === this.directionalLightProxy && 
          this.proxyInitialQuaternion && 
          this.lightInitialDirection) {
        
        // プロキシの現在の回転から初期回転の差分を計算
        const currentQuaternion = this.directionalLightProxy.quaternion.clone();
        const initialQuaternion = this.proxyInitialQuaternion.clone();
        
        // 差分クォータニオンを計算（current * initial^-1）
        const inverseInitial = initialQuaternion.clone().invert();
        const deltaQuaternion = currentQuaternion.clone().multiply(inverseInitial);
        
        // 差分が非常に小さい場合は何もしない
        const angle = 2 * Math.acos(Math.abs(Math.min(1.0, Math.abs(deltaQuaternion.w))));
        if (angle < 0.001) {
          return;
        }
        
        // 保存されたライトの初期方向に差分回転を適用
        const newDirection = this.lightInitialDirection.clone().applyQuaternion(deltaQuaternion).normalize();
        
        // ライトのtargetの位置を更新
        const lightPosition = this.directionalLight.position.clone();
        const targetPosition = lightPosition.clone().add(newDirection.multiplyScalar(5));
        this.directionalLight.target.position.copy(targetPosition);
        this.directionalLight.target.updateMatrixWorld();
        
        // ライトヘルパーを更新
        if (this.directionalLightHelper) {
          this.directionalLightHelper.update();
        }
        
        console.log('ライト方向更新:', {
          deltaAngle: angle * (180 / Math.PI),
          newDirection: newDirection,
          targetPosition: targetPosition
        });
      }
    });
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
    
    // 3Dビューでのライト選択対応（mousedownで処理することで、ドラッグ後のclickイベントの影響を受けない）
    this.canvas.addEventListener('mousedown', this.onCanvasMouseDown.bind(this));
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
   * キャンバスクリックイベントハンドラ（3Dビューでのライト選択・ボーン選択）
   */
  private onCanvasMouseDown(event: MouseEvent): void {
    // TransformControls使用中は無効化（干渉防止）
    if ((this.lightTransformControls && this.lightTransformControls.dragging) || 
        (this.boneController && this.boneController.isDragging())) {
      return;
    }
    
    // mousedownイベントでの処理なので、TransformControls終了後の無視ロジックは不要

    // マウス座標を正規化デバイス座標系に変換
    const rect = this.canvas.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    // Raycastingを実行
    this.raycaster.setFromCamera(this.mouse, this.camera);
    
    // ライトコライダーとの交差判定
    const intersectableObjects: THREE.Object3D[] = [];
    if (this.directionalLightCollider && this.directionalLightCollider.visible) {
      intersectableObjects.push(this.directionalLightCollider);
    }
    
    const intersects = this.raycaster.intersectObjects(intersectableObjects);
    
    if (intersects.length > 0) {
      // ライトコライダーがクリックされた場合
      const clickedObject = intersects[0].object;
      if (clickedObject.userData.isLightCollider && clickedObject.userData.lightType === 'directional') {
        console.log('ライトが3Dビューで選択されました');
        this.enableDirectionalLightTransform();
        // コールバックでGUIに通知
        if (this.onLightSelectionChanged) {
          this.onLightSelectionChanged(true);
        }
        
        // ライト選択時はボーン選択をスキップ
        return;
      }
    } else {
      // 空のスペースがクリックされた場合、ライト選択を解除
      console.log('ライト選択が3Dビューで解除されました');
      this.disableLightTransform();
      // コールバックでGUIに通知
      if (this.onLightSelectionChanged) {
        this.onLightSelectionChanged(false);
      }
      
      // ボーン選択処理を実行
      // 注: ライトが選択されていない場合のみボーン選択処理を行う
      if (this.boneController && this.currentVRM) {
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
      
      // ライトヘルパーの更新（表示されている場合のみ）
      if (this.lightHelpersVisible && this.directionalLightHelper) {
        this.directionalLightHelper.update();
      }
      
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
        const vrmMeta = gltf.userData.vrmMeta; // メタ情報を正しく取得

        if (!vrm) {
          throw new Error('有効なVRMデータが見つかりませんでした');
        }

        // VRMバージョンを検知し、メタ情報を正規化
        const normalizedMeta = this.normalizeVRMMetadata(vrm, vrmMeta);

        // VRMをシーンに追加
        this.currentVRM = vrm;
        this.vrmModels = [vrm]; // 単体読み込みの場合は配列をリセット
        this.vrmSourceData = [arrayBuffer.slice(0)]; // 元データを保存（複製用）
        
        // VRMに正規化されたメタ情報を追加（アクセス用）
        (vrm as any).vrmMeta = normalizedMeta;
        
        this.scene.add(vrm.scene);

        // VRMの向きと位置を調整
        VRMUtils.rotateVRM0(vrm);
        
        // カメラ位置を調整してモデル全体が見えるようにする
        this.adjustCameraToModel(vrm);

        // ボーンコントローラーにVRMを設定
        if (this.boneController) {
          this.boneController.setVRM(vrm);
        }

        console.log('VRMモデルが正常に読み込まれました');
        console.log('VRMバージョン:', normalizedMeta.detectedVersion);
        console.log('VRMメタ情報:', normalizedMeta);

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
   * VRM1系のHTMLImageElementサムネイル画像をDataURLに変換する
   */
  private extractVRM1ThumbnailImage(thumbnailImage: any): string | null {
    if (!thumbnailImage) {
      return null;
    }

    try {
      // HTMLImageElementの場合
      if (thumbnailImage instanceof HTMLImageElement) {
        console.log('VRM1サムネイル: HTMLImageElement処理開始', {
          src: thumbnailImage.src,
          naturalWidth: thumbnailImage.naturalWidth,
          naturalHeight: thumbnailImage.naturalHeight
        });

        // 既にDataURLの場合はそのまま返す
        if (thumbnailImage.src.startsWith('data:image/')) {
          console.log('VRM1サムネイル: 既にDataURL形式');
          return thumbnailImage.src;
        }

        // CanvasでHTMLImageElementをDataURLに変換
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (ctx && thumbnailImage.naturalWidth > 0 && thumbnailImage.naturalHeight > 0) {
          canvas.width = thumbnailImage.naturalWidth;
          canvas.height = thumbnailImage.naturalHeight;
          
          console.log('VRM1サムネイル: Canvas設定完了', {
            canvasWidth: canvas.width,
            canvasHeight: canvas.height
          });
          
          // HTMLImageElementをCanvasに描画
          ctx.drawImage(thumbnailImage, 0, 0);
          
          // DataURLに変換
          const dataURL = canvas.toDataURL('image/png');
          console.log('VRM1サムネイル: DataURL生成完了', {
            dataURLLength: dataURL.length,
            dataURLPrefix: dataURL.substring(0, 50)
          });
          
          return dataURL;
        } else {
          console.error('VRM1サムネイル: Canvas 2Dコンテキストの取得に失敗または画像サイズが無効');
        }
      }
      
      // 文字列の場合（既にDataURLまたはURL）
      if (typeof thumbnailImage === 'string') {
        console.log('VRM1サムネイル: 文字列処理', thumbnailImage.substring(0, 50));
        return thumbnailImage;
      }
      
      console.warn('VRM1サムネイル: 未対応の形式', {
        imageType: thumbnailImage ? thumbnailImage.constructor.name : 'null'
      });
      return null;
    } catch (error) {
      console.error('VRM1サムネイル抽出エラー:', error);
      return null;
    }
  }

  /**
   * VRM0系のtextureプロパティからサムネイル画像を抽出する
   */
  private extractVRM0ThumbnailImage(texture: any): string | null {
    if (!texture) {
      return null;
    }

    try {
      // HTMLImageElementの場合
      if (texture.image instanceof HTMLImageElement) {
        console.log('VRM0サムネイル: HTMLImageElement処理', texture.image.src);
        return texture.image.src;
      }
      
      // HTMLCanvasElementの場合
      if (texture.image instanceof HTMLCanvasElement) {
        console.log('VRM0サムネイル: HTMLCanvasElement処理');
        return texture.image.toDataURL();
      }
      
      // ImageBitmapの場合
      if (texture.image instanceof ImageBitmap) {
        console.log('VRM0サムネイル: ImageBitmap処理開始', {
          width: texture.image.width,
          height: texture.image.height
        });
        
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (ctx) {
          canvas.width = texture.image.width;
          canvas.height = texture.image.height;
          
          console.log('VRM0サムネイル: Canvas設定完了', {
            canvasWidth: canvas.width,
            canvasHeight: canvas.height
          });
          
          // ImageBitmapをCanvasに描画
          ctx.drawImage(texture.image, 0, 0);
          
          // DataURLに変換
          const dataURL = canvas.toDataURL('image/png');
          console.log('VRM0サムネイル: DataURL生成完了', {
            dataURLLength: dataURL.length,
            dataURLPrefix: dataURL.substring(0, 50)
          });
          
          return dataURL;
        } else {
          console.error('VRM0サムネイル: Canvas 2Dコンテキストの取得に失敗');
        }
      }
      
      // Base64文字列の場合
      if (typeof texture.image === 'string' && texture.userData?.mimeType) {
        console.log('VRM0サムネイル: Base64文字列処理', {
          mimeType: texture.userData.mimeType,
          stringLength: texture.image.length
        });
        
        if (texture.image.startsWith('data:image/')) {
          return texture.image;
        }
        return `data:${texture.userData.mimeType};base64,${texture.image}`;
      }
      
      console.warn('VRM0サムネイル: 未対応の形式', {
        imageType: texture.image ? texture.image.constructor.name : 'null',
        userData: texture.userData
      });
      return null;
    } catch (error) {
      console.error('VRM0サムネイル抽出エラー:', error);
      return null;
    }
  }

  /**
   * VRMバージョンを検知し、メタ情報を正規化する
   */
  private normalizeVRMMetadata(vrm: VRM, vrmMeta: any): any {
    // VRMのバージョンを検知
    const detectedVersion = this.detectVRMVersion(vrm, vrmMeta);
    
    // サムネイル画像の処理
    let thumbnailImage = null;
    if (detectedVersion.startsWith('1.')) {
      // VRM1系の場合、HTMLImageElementをDataURLに変換
      thumbnailImage = this.extractVRM1ThumbnailImage(vrmMeta?.thumbnailImage);
    } else if (detectedVersion.startsWith('0.')) {
      // VRM0系の場合、textureプロパティからサムネイル画像を抽出
      thumbnailImage = this.extractVRM0ThumbnailImage(vrmMeta?.texture);
    }
    
    // 基本構造を準備
    const normalized: any = {
      detectedVersion: detectedVersion,
      isVRM1: detectedVersion.startsWith('1.'),
      isVRM0: detectedVersion.startsWith('0.'),
      thumbnailImage: thumbnailImage
    };

    if (detectedVersion.startsWith('1.')) {
      // VRM1系の場合
      normalized.name = vrmMeta?.name || '';
      normalized.authors = vrmMeta?.authors || [];
      normalized.copyrightInformation = vrmMeta?.copyrightInformation || '';
      normalized.contactInformation = vrmMeta?.contactInformation || '';
      normalized.references = vrmMeta?.references || [];
      normalized.thirdPartyLicenses = vrmMeta?.thirdPartyLicenses || '';
      normalized.licenseUrl = vrmMeta?.licenseUrl || '';
      normalized.avatarPermission = vrmMeta?.avatarPermission || {};
      normalized.allowExcessivelyViolentUsage = vrmMeta?.allowExcessivelyViolentUsage || false;
      normalized.allowExcessivelySexualUsage = vrmMeta?.allowExcessivelySexualUsage || false;
      normalized.commercialUsage = vrmMeta?.commercialUsage || '';
      normalized.allowPoliticalOrReligiousUsage = vrmMeta?.allowPoliticalOrReligiousUsage || false;
      normalized.allowAntisocialOrHateUsage = vrmMeta?.allowAntisocialOrHateUsage || false;
      normalized.creditNotation = vrmMeta?.creditNotation || '';
      normalized.allowRedistribution = vrmMeta?.allowRedistribution || false;
      normalized.modification = vrmMeta?.modification || '';
      normalized.otherLicenseUrl = vrmMeta?.otherLicenseUrl || '';
      normalized.metaVersion = vrmMeta?.metaVersion || '1.0';
    } else {
      // VRM0系の場合
      normalized.name = vrmMeta?.title || ''; // titleがモデル名
      normalized.authors = vrmMeta?.author ? [vrmMeta.author] : [];
      normalized.contactInformation = vrmMeta?.contactInformation || '';
      normalized.reference = vrmMeta?.reference || '';
      normalized.version = vrmMeta?.version || '';
      normalized.commercialUssageName = vrmMeta?.commercialUssageName || '';
      normalized.allowedUserName = vrmMeta?.allowedUserName || '';
      normalized.violentUssageName = vrmMeta?.violentUssageName || '';
      normalized.sexualUssageName = vrmMeta?.sexualUssageName || '';
      normalized.licenseName = vrmMeta?.licenseName || '';
      normalized.otherLicenseUrl = vrmMeta?.otherLicenseUrl || '';
      normalized.otherPermissionUrl = vrmMeta?.otherPermissionUrl || '';
      normalized.specVersion = vrmMeta?.specVersion || '0.0';
    }

    return normalized;
  }

  /**
   * VRMのバージョンを検知する
   */
  private detectVRMVersion(vrm: VRM, vrmMeta: any): string {
    console.log('バージョン検知開始 - vrmMeta:', vrmMeta);
    console.log('バージョン検知開始 - vrm.meta:', vrm.meta);

    // VRM0.x系の特徴的なプロパティの存在をチェック（VRM1より先に）
    if (vrmMeta?.title !== undefined || 
        vrmMeta?.author !== undefined || 
        vrmMeta?.commercialUssageName !== undefined ||
        vrmMeta?.allowedUserName !== undefined ||
        vrmMeta?.violentUssageName !== undefined ||
        vrmMeta?.sexualUssageName !== undefined) {
      
      // VRM0.x系の場合、specVersionから取得
      if (vrmMeta?.specVersion !== undefined) {
        console.log('VRM0.x検知: specVersion =', vrmMeta.specVersion);
        return vrmMeta.specVersion;
      }
      
      console.log('VRM0.x検知: デフォルトで0.0');
      return '0.0';
    }

    // VRM1.0のプロパティをチェック
    if (vrmMeta?.metaVersion !== undefined) {
      console.log('VRM1.x検知: metaVersion =', vrmMeta.metaVersion);
      return `1.${vrmMeta.metaVersion}`;
    }
    
    // VRM1.0の特徴的なプロパティの存在をチェック
    if (vrmMeta?.authors || 
        vrmMeta?.avatarPermission || 
        vrmMeta?.commercialUsage !== undefined ||
        vrmMeta?.allowExcessivelyViolentUsage !== undefined) {
      console.log('VRM1.x検知: 特徴的プロパティから');
      return '1.0';
    }
    
    // VRMオブジェクトからバージョン情報を取得を試行
    if (vrm.meta) {
      // VRM0.x系の場合
      if ((vrm.meta as any).specVersion !== undefined) {
        console.log('VRM0.x検知: vrm.meta.specVersion =', (vrm.meta as any).specVersion);
        return (vrm.meta as any).specVersion;
      }
      // VRM1.0の場合
      if ((vrm.meta as any).metaVersion !== undefined) {
        console.log('VRM1.x検知: vrm.meta.metaVersion =', (vrm.meta as any).metaVersion);
        return `1.${(vrm.meta as any).metaVersion}`;
      }
    }
    
    // 最後の手段として、vrmMetaに何かしら情報があるかでVRM1/VRM0を判断
    if (vrmMeta && Object.keys(vrmMeta).length > 0) {
      console.log('不明なVRM - vrmMetaにデータあり - デフォルト1.0');
      return '1.0';
    }
    
    // デフォルトではVRM0.0として扱う
    console.log('VRM検知失敗 - デフォルト0.0');
    return '0.0';
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
      
      // すべてのモデルが削除された場合、ボーンコントローラーも更新
      if (this.vrmModels.length === 0) {
        if (this.boneController) {
          this.boneController.setVRM(null);
        }
      }
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
        const vrmMeta = gltf.userData.vrmMeta; // メタ情報を正しく取得

        if (!vrm) {
          throw new Error('有効なVRMデータが見つかりませんでした');
        }

        // VRMバージョンを検知し、メタ情報を正規化
        const normalizedMeta = this.normalizeVRMMetadata(vrm, vrmMeta);

        // VRMをリストに追加
        this.vrmModels.push(vrm);
        this.vrmSourceData.push(arrayBuffer.slice(0)); // 元データを保存（複製用）
        
        // VRMに正規化されたメタ情報を追加（アクセス用）
        (vrm as any).vrmMeta = normalizedMeta;
        
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

        // ボーンコントローラーに新しく追加されたVRMを設定
        if (this.boneController) {
          this.boneController.setVRM(vrm);
        }

        console.log(`VRMモデルが追加されました (総数: ${this.vrmModels.length})`);
        console.log('VRMバージョン:', normalizedMeta.detectedVersion);
        console.log('VRMメタ情報:', normalizedMeta);

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
    
    // ボーンコントローラーもクリア
    if (this.boneController) {
      this.boneController.setVRM(null);
    }
    
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
      
      // ボーンコントローラーを更新
      if (this.boneController) {
        this.boneController.setVRM(this.currentVRM);
      }
    }
    
    // モデルが削除されたとき、常にボーンコントローラーを正しいVRMに更新
    // これにより、最後のモデルを削除した場合もボーン表示が消えるようになる
    if (this.vrmModels.length === 0) {
      if (this.boneController) {
        this.boneController.setVRM(null);
      }
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
      // 選択されたモデルがない場合、ボーンコントローラーもクリア
      if (this.boneController) {
        this.boneController.setVRM(null);
      }
      return;
    }

    this.selectedModelIndex = index;
    this.showOutline(this.vrmModels[index]);
    
    // 選択されたモデルに応じてボーンコントローラーを更新
    if (this.boneController) {
      this.boneController.setVRM(this.vrmModels[index]);
    }
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
    
    // すべてのモデルが削除された場合、ボーンコントローラーも更新
    if (this.vrmModels.length === 0) {
      if (this.boneController) {
        this.boneController.setVRM(null);
      }
    }

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
   * 環境光の色を設定
   * @param color 色 (0xRRGGBB 形式 または Color オブジェクト)
   */
  setAmbientLightColor(color: number | THREE.Color): void {
    this.ambientLight.color.set(color);
  }

  /**
   * ディレクショナルライトの色を設定
   * @param color 色 (0xRRGGBB 形式 または Color オブジェクト)
   */
  setDirectionalLightColor(color: number | THREE.Color): void {
    this.directionalLight.color.set(color);
  }

  /**
   * リムライトの色を設定
   * @param color 色 (0xRRGGBB 形式 または Color オブジェクト)
   */
  setRimLightColor(color: number | THREE.Color): void {
    this.rimLight.color.set(color);
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
   * 現在の環境光の色を取得
   * @returns 環境光の色 (Color オブジェクト)
   */
  getAmbientLightColor(): THREE.Color {
    return this.ambientLight.color;
  }

  /**
   * 現在のディレクショナルライトの色を取得
   * @returns ディレクショナルライトの色 (Color オブジェクト)
   */
  getDirectionalLightColor(): THREE.Color {
    return this.directionalLight.color;
  }

  /**
   * 現在のリムライトの色を取得
   * @returns リムライトの色 (Color オブジェクト)
   */
  getRimLightColor(): THREE.Color {
    return this.rimLight.color;
  }

  /**
   * 全てのライトをデフォルト設定にリセット
   */
  resetLights(): void {
    this.setAmbientLightIntensity(0.3);
    this.setDirectionalLightIntensity(1.0);
    this.setRimLightIntensity(0.5);
    this.setAmbientLightColor(0xffffff);
    this.setDirectionalLightColor(0xffffff);
    this.setRimLightColor(0x66ccff);
    
    // ライト位置もリセット
    this.directionalLight.position.set(0, 3, 0); // +Y軸上に配置
    this.rimLight.position.set(-1, 1, -2);
    
    // ライトのターゲットもリセット
    this.directionalLight.target.position.set(0, 0, 0);
    this.directionalLight.target.updateMatrixWorld();
    
    // プロキシオブジェクトの位置と向きもリセット
    if (this.directionalLightProxy) {
      // プロキシの位置をライトと同じ位置に更新（新しい位置）
      this.directionalLightProxy.position.set(0, 3, 0);
      
      // プロキシの回転をアイデンティティにリセット
      this.directionalLightProxy.quaternion.set(0, 0, 0, 1);
      
      // プロキシとライトの初期状態もクリア
      this.proxyInitialQuaternion = null;
      this.lightInitialDirection = null;
    }
    
    // コライダーの位置もリセット
    if (this.directionalLightCollider) {
      this.directionalLightCollider.position.set(0, 3, 0);
    }
    
    // ライトヘルパーを更新
    if (this.directionalLightHelper) {
      this.directionalLightHelper.update();
    }
    
    // TransformControlsのみを無効化（ライトヘルパーの表示状態は維持）
    if (this.lightTransformControls) {
      this.lightTransformControls.detach();
      this.lightTransformControls.enabled = false;
    }
    // プロキシとライトの初期状態をクリア
    this.proxyInitialQuaternion = null;
    this.lightInitialDirection = null;
    // プロキシを非表示にする
    this.setLightProxyVisible(false);
    
    // ライト選択状態変更をGUIに通知
    if (this.onLightSelectionChanged) {
      this.onLightSelectionChanged(false);
    }
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

  /**
   * ライトヘルパーの表示/非表示を切り替え
   * @param visible 表示するかどうか
   */
  setLightHelpersVisible(visible: boolean): void {
    this.lightHelpersVisible = visible;
    if (this.directionalLightHelper) {
      this.directionalLightHelper.visible = visible;
      if (visible) {
        // 表示する場合は最新の状態に更新
        this.directionalLightHelper.update();
      }
    }
    // ライト選択用コライダーも連動
    if (this.directionalLightCollider) {
      this.directionalLightCollider.visible = visible;
    }
  }

  /**
   * 現在のライトヘルパー表示状態を取得
   * @returns ライトヘルパーが表示されているかどうか
   */
  getLightHelpersVisible(): boolean {
    return this.lightHelpersVisible;
  }

  /**
   * 方向性ライトのTransformControlsを有効化
   */
  enableDirectionalLightTransform(): void {
    if (this.lightTransformControls && this.directionalLightProxy) {
      // プロキシは非表示のままTransformControlsに使用する
      // this.setLightProxyVisible(true); // ワイヤーフレーム表示を無効化
      
      // プロキシの位置をライトと同じ位置に更新
      this.directionalLightProxy.position.copy(this.directionalLight.position);
      
      // コライダーの位置もライトと同じ位置に更新
      if (this.directionalLightCollider) {
        this.directionalLightCollider.position.copy(this.directionalLight.position);
      }
      
      // 現在のライト方向を取得して、プロキシの回転を設定
      const lightDirection = new THREE.Vector3();
      lightDirection.subVectors(this.directionalLight.target.position, this.directionalLight.position).normalize();
      
      // ライト方向から回転を計算（デフォルトの-Z方向から現在の方向への回転）
      const defaultDirection = new THREE.Vector3(0, 0, -1);
      const quaternion = new THREE.Quaternion();
      quaternion.setFromUnitVectors(defaultDirection, lightDirection);
      
      // プロキシに回転を適用
      this.directionalLightProxy.quaternion.copy(quaternion);
      
      // プロキシオブジェクトをギズモにattach
      this.lightTransformControls.attach(this.directionalLightProxy);
      this.lightTransformControls.enabled = true;
      
      // ライトヘルパーを更新
      if (this.directionalLightHelper) {
        this.directionalLightHelper.update();
      }
    }
  }

  /**
   * ライトのTransformControlsを無効化
   */
  disableLightTransform(): void {
    if (this.lightTransformControls) {
      this.lightTransformControls.detach();
      this.lightTransformControls.enabled = false;
    }
    // プロキシとライトの初期状態をクリア
    this.proxyInitialQuaternion = null;
    this.lightInitialDirection = null;
    // プロキシを非表示にする
    this.setLightProxyVisible(false);
  }

  /**
   * 方向性ライトがTransformControlsで選択されているかどうか
   * @returns 選択されているかどうか
   */
  isDirectionalLightSelected(): boolean {
    return this.lightTransformControls?.object === this.directionalLightProxy;
  }

  /**
   * ライトプロキシオブジェクトの表示/非表示を切り替え（デバッグ用）
   * @param visible 表示するかどうか
   */
  setLightProxyVisible(visible: boolean): void {
    this.proxyVisible = visible;
    if (this.directionalLightProxy) {
      this.directionalLightProxy.visible = visible;
    }
  }

  /**
   * ライトプロキシオブジェクトの表示状態を取得（デバッグ用）
   * @returns 表示されているかどうか
   */
  isLightProxyVisible(): boolean {
    return this.proxyVisible;
  }

  /**
   * ライト選択状態変更のコールバック関数を設定
   * @param callback ライト選択状態が変更された時に呼び出される関数
   */
  setLightSelectionCallback(callback: (isSelected: boolean) => void): void {
    this.onLightSelectionChanged = callback;
  }

  /**
   * ボーンコントローラーの設定
   */
  private setupBoneController(): void {
    // ボーンコントローラーの初期化
    this.boneController = new VRMBoneController(
      this.scene,
      this.camera,
      this.renderer,
      this.controls
    );
    
    console.log('VRMBoneControllerを初期化しました');
  }

  /**
   * ボーンの表示/非表示を切り替える
   */
  toggleBoneVisibility(visible?: boolean): boolean {
    if (!this.boneController) return false;
    return this.boneController.toggleBoneVisibility(visible);
  }
  
  /**
   * ボーン操作モードを設定（回転/移動）
   */
  setBoneTransformMode(mode: 'rotate' | 'translate'): void {
    if (!this.boneController) return;
    this.boneController.setTransformMode(mode);
  }
  
  /**
   * すべてのボーンをリセット
   */
  resetAllBonePoses(): void {
    if (!this.boneController || !this.currentVRM) return;
    this.boneController.resetPose();
  }
  
  /**
   * ボーン選択状態変更のコールバックを設定
   */
  setOnBoneSelectionChanged(callback: ((boneName: string | null) => void) | null): void {
    if (!this.boneController) return;
    this.boneController.setOnBoneSelectionChanged(callback);
  }
  
  /**
   * ライト選択状態変更のコールバックを設定
   */
  setOnLightSelectionChanged(callback: ((isSelected: boolean) => void) | null): void {
    this.onLightSelectionChanged = callback;
  }
}
