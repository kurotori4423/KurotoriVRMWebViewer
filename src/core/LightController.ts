/**
 * LightController - ライト制御を担当
 * 
 * 責任:
 * - 各種ライトの管理（環境光、方向性ライト、リムライト）
 * - ライトの強度・色・位置制御
 * - ライトヘルパーの表示制御
 * - TransformControlsによるライト操作
 * - ライト選択の検出
 */

import * as THREE from 'three';
import { TransformControls } from 'three/examples/jsm/controls/TransformControls.js';
import type { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { BaseManager } from './BaseManager';

export interface LightSettings {
  ambient: { intensity: number; color: THREE.Color };
  directional: { intensity: number; color: THREE.Color; position: THREE.Vector3 };
  rim: { intensity: number; color: THREE.Color; position: THREE.Vector3 };
}

export class LightController extends BaseManager {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private controls: OrbitControls;

  // ライト
  private ambientLight!: THREE.AmbientLight;
  private directionalLight!: THREE.DirectionalLight;
  private rimLight!: THREE.DirectionalLight;

  // ライトヘルパーとコントロール
  private directionalLightHelper: THREE.DirectionalLightHelper | null = null;
  private directionalLightCollider: THREE.Mesh | null = null;
  private lightTransformControls: TransformControls | null = null;
  private lightHelpersVisible: boolean = true;

  // レイキャスト用

  constructor(
    scene: THREE.Scene,
    camera: THREE.PerspectiveCamera,
    renderer: THREE.WebGLRenderer,
    controls: OrbitControls
  ) {
    super();
    this.scene = scene;
    this.camera = camera;
    this.renderer = renderer;
    this.controls = controls;
  }

  /**
   * マネージャー名を取得
   */
  getName(): string {
    return 'LightController';
  }

  /**
   * 初期化
   */
  async initialize(): Promise<void> {
    this.setupLights();
    this.setupLightHelpers();
    this.setupEventListeners();
    console.log('LightControllerを初期化しました');
  }

  /**
   * ライトの設定
   */
  private setupLights(): void {
    // 環境光
    this.ambientLight = new THREE.AmbientLight(0xffffff, 0.3);
    this.scene.add(this.ambientLight);

    // ディレクショナルライト（太陽光のような平行光）
    this.directionalLight = new THREE.DirectionalLight(0xffffff, 1.0);
    this.directionalLight.position.set(0, 3, 0);
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
   * ライトヘルパーとTransformControlsの設定
   */
  private setupLightHelpers(): void {
    // DirectionalLightHelperの作成
    this.directionalLightHelper = new THREE.DirectionalLightHelper(this.directionalLight, 1);
    this.directionalLightHelper.visible = this.lightHelpersVisible;
    this.scene.add(this.directionalLightHelper);

    // ライト選択用のコライダー（透明球体）を作成
    const colliderGeometry = new THREE.SphereGeometry(0.5);
    const colliderMaterial = new THREE.MeshBasicMaterial({
      transparent: true,
      opacity: 0,
      depthTest: false,
      depthWrite: false
    });
    this.directionalLightCollider = new THREE.Mesh(colliderGeometry, colliderMaterial);
    this.directionalLightCollider.position.copy(this.directionalLight.position);
    this.directionalLightCollider.visible = this.lightHelpersVisible;
    this.directionalLightCollider.userData.isLightCollider = true;
    this.directionalLightCollider.userData.lightType = 'directional';
    this.scene.add(this.directionalLightCollider);

    // TransformControlsの作成
    this.lightTransformControls = new TransformControls(this.camera, this.renderer.domElement);
    this.lightTransformControls.setMode('rotate');
    this.lightTransformControls.enabled = false;

    const gizmo = this.lightTransformControls.getHelper();
    this.scene.add(gizmo);

    this.setupTransformControlsEvents();
  }

  /**
   * TransformControlsのイベント設定
   */
  private setupTransformControlsEvents(): void {
    if (!this.lightTransformControls) return;

    this.lightTransformControls.addEventListener('dragging-changed', (event) => {
      this.controls.enabled = !event.value;
    });

    this.lightTransformControls.addEventListener('change', () => {
      if (this.lightTransformControls?.object === this.directionalLight) {
        // 方向性ライトの回転を適用
        // DirectionalLightの向きは position から target.position への方向で決まる
        const direction = new THREE.Vector3(0, -1, 0); // デフォルトの下向き
        direction.applyQuaternion(this.directionalLight.quaternion);
        
        // ターゲット位置を計算（ライト位置から1単位離れた位置）
        this.directionalLight.target.position.copy(this.directionalLight.position).add(direction);
        this.directionalLight.target.updateMatrixWorld();
        
        // ライトヘルパーとコライダーの位置・回転を更新
        if (this.directionalLightCollider) {
          this.directionalLightCollider.position.copy(this.directionalLight.position);
          this.directionalLightCollider.quaternion.copy(this.directionalLight.quaternion);
        }
        
        if (this.directionalLightHelper) {
          this.directionalLightHelper.update();
        }
      }
    });
  }

  /**
   * イベントリスナーの設定
   */
  private setupEventListeners(): void {
    // ライト選択イベントを監視
    this.listen('light:selected', ({ isSelected }) => {
      if (isSelected) {
        this.enableDirectionalLightTransform();
      } else {
        this.disableLightTransform();
      }
    });
  }

  /**
   * ライト選択のレイキャスト処理
   */
  handleRaycast(raycaster: THREE.Raycaster): boolean {
    if (!this.lightHelpersVisible || !this.directionalLightCollider) {
      return false;
    }

    const intersects = raycaster.intersectObject(this.directionalLightCollider);
    if (intersects.length > 0) {
      // ライトが選択された
      this.emit('light:selected', { 
        isSelected: true, 
        lightType: 'directional' as const 
      });
      return true;
    }

    return false;
  }

  /**
   * 方向性ライトのTransformControlsを有効化
   */
  private enableDirectionalLightTransform(): void {
    if (this.lightTransformControls) {
      this.lightTransformControls.attach(this.directionalLight);
      this.lightTransformControls.enabled = true;
    }
  }

  /**
   * ライトのTransformControlsを無効化
   */
  private disableLightTransform(): void {
    if (this.lightTransformControls) {
      this.lightTransformControls.detach();
      this.lightTransformControls.enabled = false;
    }
  }

  /**
   * 環境光の強度を設定
   */
  setAmbientLightIntensity(intensity: number): void {
    this.ambientLight.intensity = Math.max(0, Math.min(2, intensity));
    this.emit('light:intensity-changed', {
      lightType: 'ambient',
      intensity: this.ambientLight.intensity
    });
  }

  /**
   * ディレクショナルライトの強度を設定
   */
  setDirectionalLightIntensity(intensity: number): void {
    this.directionalLight.intensity = Math.max(0, Math.min(3, intensity));
    this.emit('light:intensity-changed', {
      lightType: 'directional',
      intensity: this.directionalLight.intensity
    });
  }

  /**
   * リムライトの強度を設定
   */
  setRimLightIntensity(intensity: number): void {
    this.rimLight.intensity = Math.max(0, Math.min(2, intensity));
    this.emit('light:intensity-changed', {
      lightType: 'rim',
      intensity: this.rimLight.intensity
    });
  }

  /**
   * 環境光の色を設定
   */
  setAmbientLightColor(color: number | THREE.Color): void {
    this.ambientLight.color.set(color);
    this.emit('light:color-changed', {
      lightType: 'ambient',
      color: this.ambientLight.color
    });
  }

  /**
   * ディレクショナルライトの色を設定
   */
  setDirectionalLightColor(color: number | THREE.Color): void {
    this.directionalLight.color.set(color);
    this.emit('light:color-changed', {
      lightType: 'directional',
      color: this.directionalLight.color
    });
  }

  /**
   * リムライトの色を設定
   */
  setRimLightColor(color: number | THREE.Color): void {
    this.rimLight.color.set(color);
    this.emit('light:color-changed', {
      lightType: 'rim',
      color: this.rimLight.color
    });
  }

  /**
   * ライトヘルパーの表示/非表示を切り替え
   */
  setLightHelpersVisible(visible: boolean): void {
    this.lightHelpersVisible = visible;
    if (this.directionalLightHelper) {
      this.directionalLightHelper.visible = visible;
    }
    if (this.directionalLightCollider) {
      this.directionalLightCollider.visible = visible;
    }
    
    this.emit('light:visibility-changed', { visible });
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
    this.directionalLight.position.set(0, 3, 0);
    this.rimLight.position.set(-1, 1, -2);

    // ライトのターゲットもリセット
    this.directionalLight.target.position.set(0, 0, 0);
    this.directionalLight.target.updateMatrixWorld();

    // コライダーの位置もリセット
    if (this.directionalLightCollider) {
      this.directionalLightCollider.position.set(0, 3, 0);
    }

    // ライトヘルパーを更新
    if (this.directionalLightHelper) {
      this.directionalLightHelper.update();
    }

    // TransformControlsを無効化
    this.disableLightTransform();

    // ライト選択状態変更をイベントで通知
    this.emit('light:selected', { isSelected: false });
    this.emit('light:reset', undefined);
  }

  /**
   * 現在のライト設定を取得
   */
  getLightSettings(): LightSettings {
    return {
      ambient: {
        intensity: this.ambientLight.intensity,
        color: this.ambientLight.color.clone()
      },
      directional: {
        intensity: this.directionalLight.intensity,
        color: this.directionalLight.color.clone(),
        position: this.directionalLight.position.clone()
      },
      rim: {
        intensity: this.rimLight.intensity,
        color: this.rimLight.color.clone(),
        position: this.rimLight.position.clone()
      }
    };
  }

  /**
   * ライトヘルパーの表示状態を取得
   */
  getLightHelpersVisible(): boolean {
    return this.lightHelpersVisible;
  }

  /**
   * 方向性ライトがTransformControlsで選択されているかどうか
   */
  isDirectionalLightSelected(): boolean {
    return this.lightTransformControls?.object === this.directionalLight;
  }

  /**
   * レンダーループでの更新処理
   */
  update(): void {
    // ライトヘルパーの更新（表示されている場合のみ）
    if (this.lightHelpersVisible && this.directionalLightHelper) {
      this.directionalLightHelper.update();
    }
  }

  /**
   * リソースのクリーンアップ
   */
  protected onDispose(): void {
    this.disableLightTransform();
    
    if (this.directionalLightHelper) {
      this.scene.remove(this.directionalLightHelper);
      this.directionalLightHelper.dispose();
    }
    
    if (this.directionalLightCollider) {
      this.scene.remove(this.directionalLightCollider);
      this.directionalLightCollider.geometry.dispose();
      (this.directionalLightCollider.material as THREE.Material).dispose();
    }
    
    if (this.lightTransformControls) {
      const gizmo = this.lightTransformControls.getHelper();
      this.scene.remove(gizmo);
    }
  }
}
