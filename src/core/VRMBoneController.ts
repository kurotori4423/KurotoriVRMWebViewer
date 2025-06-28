import * as THREE from 'three';
import { VRM, VRMHumanBoneName } from '@pixiv/three-vrm';
import { TransformControls } from 'three/examples/jsm/controls/TransformControls.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { eventBus } from '../utils/EventBus';
import { BonePointsManager } from './BonePointsManager';

/**
 * VRMBoneController
 * VRMモデルのボーン構造を解析し、操作するためのコントローラークラス
 */
export class VRMBoneController {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private orbitControls: OrbitControls;
  
  // VRM関連
  private currentVRM: VRM | null = null;
  
  // ボーン操作用（BonePointsManagerに統合）
  private bonePointsManager: BonePointsManager;
  private bonePoints: THREE.Mesh[] = [];
  private bonePointsVisible: boolean = true;
  private selectedBone: THREE.Bone | null = null;
  private boneTransformControls: TransformControls | null = null;
  private currentTransformMode: 'rotate' | 'translate' = 'rotate'; // 現在のモードを保持
  private currentTransformSpace: 'world' | 'local' = 'world'; // 現在の座標空間を保持
  
  // ボーンマッピング
  private humanoidBones: Map<VRMHumanBoneName, THREE.Bone> = new Map();

  // ボーン選択状態変更コールバック
  private onBoneSelectionChanged: ((boneName: string | null) => void) | null = null;
  
  // UI更新コールバック（モード自動変更時に使用）
  private onTransformModeAutoChanged: ((mode: 'rotate' | 'translate') => void) | null = null;

  /**
   * コンストラクタ
   */
  constructor(
    scene: THREE.Scene,
    camera: THREE.PerspectiveCamera,
    renderer: THREE.WebGLRenderer,
    orbitControls: OrbitControls
  ) {
    this.scene = scene;
    this.camera = camera;
    this.renderer = renderer;
    this.orbitControls = orbitControls;
    
    // BonePointsManagerの初期化
    this.bonePointsManager = new BonePointsManager();
    this.bonePointsManager.initialize();
    this.bonePointsManager.setCamera(camera);
    
    // TransformControlsの初期化
    this.initializeTransformControls();
    
    // VRMルートオブジェクト変更イベントの監視
    this.setupRootTransformListener();
  }

  /**
   * TransformControlsの初期化
   */
  private initializeTransformControls(): void {
    this.boneTransformControls = new TransformControls(this.camera, this.renderer.domElement);
    this.boneTransformControls.setMode('rotate'); // 回転モードをデフォルトに設定
    this.boneTransformControls.setSpace('world'); // ワールド座標系をデフォルトに設定
    this.boneTransformControls.setSize(0.75); // サイズを少し小さめに設定
    
    // TransformControlsをシーンに追加
    const gizmo = this.boneTransformControls.getHelper();
    this.scene.add(gizmo);
    
    // TransformControls使用中はOrbitControlsを無効化
    this.boneTransformControls.addEventListener('dragging-changed', (event) => {
      this.orbitControls.enabled = !event.value;
    });

    // ボーン操作時のリアルタイム更新処理を追加
    this.boneTransformControls.addEventListener('objectChange', () => {
      this.updateBoneVisualizationAndVRM();
    });
  }

  /**
   * VRMルートオブジェクト変更イベントの監視を設定
   */
  private setupRootTransformListener(): void {
    eventBus.on('vrm-root-transform-changed', (event) => {
      if (event.vrm === this.currentVRM) {
        // VRMルートオブジェクトが変更されたときにボーン表示を更新
        this.updateBoneVisualizationPosition();
      }
    });
  }

  /**
   * ボーン表示要素の位置を更新（VRMルートオブジェクト変更時）
   */
  private updateBoneVisualizationPosition(): void {
    if (!this.currentVRM || !this.currentVRM.scene) return;

    // BonePointsManagerは既にVRMシーン階層に配置されているので、
    // VRMルートオブジェクトの変更に自動的に追従する（BonePointsパターン）
    // 座標キャッシュの無効化は自動的にイベントで処理される

    console.log('VRMBoneController: ボーン表示要素の位置を更新しました（BonePointsManager使用）');
  }

  /**
   * VRMモデルを設定
   */
  setVRM(vrm: VRM | null): void {
    // 以前のVRMの後片付け
    this.clearBoneVisualization();
    
    this.currentVRM = vrm;
    
    // BonePointsManagerにVRMを設定
    this.bonePointsManager.setVRM(vrm);
    
    if (vrm) {
      // ボーン構造の解析
      this.analyzeVRMBoneStructure(vrm);
      
      // ボーンの視覚化（BonePointsManager使用）
      this.visualizeBoneStructure();
    }
  }

  /**
   * VRMのボーン構造を解析
   */
  private analyzeVRMBoneStructure(vrm: VRM): void {
    console.log('VRMボーン構造の解析を開始...');
    
    // VRMのヒューマノイドボーンにアクセス
    const humanoid = vrm.humanoid;
    if (!humanoid) {
      console.error('VRMにhumanoidプロパティが見つかりません');
      return;
    }


    
    // ヒューマノイドボーンの取得
    this.humanoidBones.clear();
    
    // VRMヒューマノイドボーン名の配列を取得
    const humanoidBoneNames = Object.values(VRMHumanBoneName);
    
    // 各ボーンに対応するThree.jsのボーンを取得
    for (const boneName of humanoidBoneNames) {
      const bone = humanoid.getNormalizedBoneNode(boneName as VRMHumanBoneName);
      if (bone) {
        this.humanoidBones.set(boneName as VRMHumanBoneName, bone as THREE.Bone);
        console.log(`ボーン ${boneName} が見つかりました:`, bone);
      }
    }
    
    console.log(`全 ${this.humanoidBones.size} ボーンを解析しました`);
  }
  
  /**
   * ボーン構造を視覚化
   */
  private visualizeBoneStructure(): void {
    if (!this.currentVRM) return;
    
    console.log('ボーン構造を視覚化...');
    
    // CustomBoneLinesの作成
    // VRMのシーンからスキンメッシュを検索
    let skinnedMesh: THREE.SkinnedMesh | null = null;
    this.currentVRM.scene.traverse((object) => {
      if (object instanceof THREE.SkinnedMesh && !skinnedMesh) {
        skinnedMesh = object as THREE.SkinnedMesh;
        console.log('スキンメッシュを発見:', object);
        console.log('スケルトン情報:', object.skeleton);
        console.log('ボーン数:', object.skeleton ? object.skeleton.bones.length : 'なし');
        console.log('スケルトンボーン詳細:', object.skeleton?.bones.map(bone => bone.name));
      }
    });
    
    if (skinnedMesh && (skinnedMesh as THREE.SkinnedMesh).skeleton) {
      // カスタムボーン線を作成
      this.createCustomBoneLines(skinnedMesh as THREE.SkinnedMesh);
    } else {
      console.error('CustomBoneLines作成失敗: スキンメッシュまたはスケルトンが見つかりません');
    }
    
    // 主要ボーンに球体を配置して視認性を高める
    const mainBones = [
      VRMHumanBoneName.Head,
      VRMHumanBoneName.Neck,
      VRMHumanBoneName.Chest,
      VRMHumanBoneName.Spine,
      VRMHumanBoneName.Hips,
      VRMHumanBoneName.LeftUpperArm,
      VRMHumanBoneName.LeftLowerArm,
      VRMHumanBoneName.LeftHand,
      VRMHumanBoneName.RightUpperArm,
      VRMHumanBoneName.RightLowerArm,
      VRMHumanBoneName.RightHand,
      VRMHumanBoneName.LeftUpperLeg,
      VRMHumanBoneName.LeftLowerLeg,
      VRMHumanBoneName.LeftFoot,
      VRMHumanBoneName.RightUpperLeg,
      VRMHumanBoneName.RightLowerLeg,
      VRMHumanBoneName.RightFoot
    ];
    
    // ボーンポイントを作成
    const sphereGeometry = new THREE.SphereGeometry(0.035); // サイズを少し大きくして視認性向上
    
    for (const boneName of mainBones) {
      const bone = this.humanoidBones.get(boneName);
      if (bone) {
        // 左側は赤系、右側は青系、中央は緑系で色分け
        let color = 0x00ff00; // デフォルト緑
        
        if (boneName.includes('Left')) {
          color = 0xff5555; // 赤系
        } else if (boneName.includes('Right')) {
          color = 0x5555ff; // 青系
        }
        
        const material = new THREE.MeshBasicMaterial({ 
          color,
          depthTest: false, // 深度テストを無効にして最前面表示
          depthWrite: false, // 深度バッファへの書き込みを無効
          transparent: true,
          opacity: 0.9
        });
        const sphere = new THREE.Mesh(sphereGeometry, material);
        
        // 最前面に表示するための設定
        sphere.renderOrder = Number.MAX_SAFE_INTEGER; // CustomBoneLinesより前面に表示
        
        // ボーンの位置に配置
        sphere.position.set(0, 0, 0);
        sphere.visible = this.bonePointsVisible;
        
        // ボーンの子として追加（ボーンの動きに追従）
        bone.add(sphere);
        
        // 選択用にユーザーデータを設定
        sphere.userData.isBonePoint = true;
        sphere.userData.boneName = boneName;
        sphere.userData.boneObject = bone;
        
        // 配列に保存
        this.bonePoints.push(sphere);
        
        console.log(`ボーンポイントを追加: ${boneName}`);
      }
    }
  }
  
  /**
   * ボーン視覚化要素をクリア
   */
  private clearBoneVisualization(): void {
    // BonePointsManagerでボーン線をクリア
    this.bonePointsManager.clearBoneLines();
    
    // ボーンポイントの削除
    for (const point of this.bonePoints) {
      if (point.parent) {
        point.parent.remove(point);
      }
    }
    this.bonePoints = [];
    
    // 選択状態のリセット
    this.selectedBone = null;
    if (this.boneTransformControls) {
      this.boneTransformControls.detach();
    }
    
    // ボーンマッピングのクリア
    this.humanoidBones.clear();
  }
  
  /**
   * ボーン選択処理
   * Raycastingによる3Dビューでのボーン選択に使用
   */
  selectBoneByRaycast(raycaster: THREE.Raycaster): void {
    if (!this.currentVRM) return;
    
    // ボーンポイントとの交差を検出
    const intersects = raycaster.intersectObjects(this.bonePoints);
    
    // 選択を解除する処理
    const clearSelection = () => {
      this.selectedBone = null;
      if (this.boneTransformControls) {
        this.boneTransformControls.detach();
      }
      console.log('ボーン選択を解除しました');
      
      // コールバックを呼び出し
      if (this.onBoneSelectionChanged) {
        this.onBoneSelectionChanged(null);
      }
    };
    
    if (intersects.length > 0) {
      // ボーンポイントが選択された場合
      const selected = intersects[0].object;
      
      if (selected.userData.isBonePoint) {
        const bone = selected.userData.boneObject as THREE.Bone;
        const boneName = selected.userData.boneName as VRMHumanBoneName;
        
        console.log(`ボーンを選択: ${boneName}`);
        
        // 既に選択されているボーンを再選択した場合は選択解除
        if (this.selectedBone === bone) {
          clearSelection();
          return;
        }
        
        // ボーン選択状態を更新
        this.selectedBone = bone;
        
        // TransformControlsをボーンに適用
        if (this.boneTransformControls) {
          this.boneTransformControls.attach(bone);
        }
        
        // ボーン選択状態変更コールバックを呼び出し
        if (this.onBoneSelectionChanged) {
          this.onBoneSelectionChanged(boneName);
        }
        
        // 重要: ボーン選択変更時のtranslateモード制限チェック
        this.checkTransformModeAfterBoneSelection();
      }
    } else {
      // 何も選択されていない場合、選択を解除
      clearSelection();
    }
  }
  
  /**
   * ボーン表示/非表示の切り替え
   */
  toggleBoneVisibility(visible?: boolean): boolean {
    // 引数が指定されていれば、その値に設定。指定がなければ現在の値を反転
    this.bonePointsVisible = visible !== undefined ? visible : !this.bonePointsVisible;
    
    // BonePointsManagerの表示設定を更新
    this.bonePointsManager.updateDisplaySettings({
      opacity: this.bonePointsVisible ? 0.8 : 0.0
    });
    
    // 各ボーンポイントの表示状態を更新
    for (const point of this.bonePoints) {
      point.visible = this.bonePointsVisible;
    }
    
    console.log(`ボーン表示状態: ${this.bonePointsVisible ? '表示' : '非表示'} (BonePointsManager使用)`);
    return this.bonePointsVisible;
  }
  
  /**
   * 選択されたボーンが移動（translate）可能かどうかを判定
   * 現在はHipsボーンのみが移動可能
   * @returns true: 移動可能, false: 移動不可
   */
  isSelectedBoneTranslatable(): boolean {
    if (!this.selectedBone || !this.currentVRM) {
      return false;
    }

    // 選択されたボーンがHipsボーンかどうかを判定
    const hipsNode = this.humanoidBones.get(VRMHumanBoneName.Hips);
    
    if (!hipsNode) {
      console.warn('HipsボーンがVRMに見つかりません');
      return false;
    }

    // 選択されたボーンがHipsと同じかどうかを確認
    const isHips = this.selectedBone === hipsNode;
    
    console.log(`ボーン移動可能性判定: 選択ボーン=${this.selectedBone.name}, Hips=${hipsNode.name}, 移動可能=${isHips}`);
    
    return isHips;
  }

  /**
   * ボーン操作モードの切り替え（回転・移動）
   * 移動モードはHipsボーンのみ許可
   */
  setTransformMode(mode: 'rotate' | 'translate'): void {
    if (!this.boneTransformControls) {
      console.warn('TransformControlsが初期化されていません');
      return;
    }

    // translateモードの場合、選択されたボーンがHipsかどうかを確認
    if (mode === 'translate') {
      if (!this.isSelectedBoneTranslatable()) {
        console.warn('移動（translate）モードはHipsボーンでのみ使用できます。現在選択されているボーンでは移動操作はできません。');
        return; // 無効な操作をブロック
      }
    }

    // モードを設定し、内部状態を更新
    this.currentTransformMode = mode;
    this.boneTransformControls.setMode(mode);
    console.log(`Transformモードを変更: ${mode}`);
  }

  /**
   * Transform座標系を設定
   * @param space 'world' (ワールド座標系) または 'local' (ローカル座標系)
   */
  setTransformSpace(space: 'world' | 'local'): void {
    if (!this.boneTransformControls) {
      console.warn('TransformControlsが初期化されていません');
      return;
    }

    // 座標空間を設定し、内部状態を更新
    this.currentTransformSpace = space;
    this.boneTransformControls.setSpace(space);
    console.log(`Transform座標系を変更: ${space}`);
  }

  /**
   * 現在のTransform座標系を取得
   * @returns 'world' (ワールド座標系) または 'local' (ローカル座標系)
   */
  getCurrentTransformSpace(): 'world' | 'local' {
    console.log(`現在のTransform座標系: ${this.currentTransformSpace}`);
    return this.currentTransformSpace;
  }
  
  /**
   * ポーズのリセット - VRMライブラリの正しいAPIを使用
   */
  resetPose(targetBoneName?: VRMHumanBoneName): void {
    if (!this.currentVRM) return;
    
    if (targetBoneName) {
      // 特定のボーンのみリセット（VRMライブラリには個別ボーンリセット機能がないため、カスタム実装）
      // TODO: 将来的にVRMライブラリに個別ボーンリセット機能が追加された場合は、そちらを使用
      console.log(`個別ボーンリセット（${targetBoneName}）は現在サポートされていません。全体リセットを実行します。`);
    }
    
    // VRMライブラリの正しいAPIを使用して初期ポーズにリセット
    try {
      // Normalized形式でのポーズリセット（推奨）
      this.currentVRM.humanoid.resetNormalizedPose();
      console.log('VRMの初期ポーズ（T-ポーズ/A-ポーズ）にリセットしました');
    } catch (error) {
      console.warn('resetNormalizedPose()でエラーが発生しました。resetPose()を試行します。', error);
      try {
        // Fallback: 非推奨だが一般的なresetPose()を使用
        this.currentVRM.humanoid.resetPose();
        console.log('VRMの初期ポーズにリセットしました（resetPose）');
      } catch (fallbackError) {
        console.error('ポーズリセット失敗:', fallbackError);
        return;
      }
    }
    
    // VRMの更新（必須）
    if (this.currentVRM.update) {
      this.currentVRM.update(0);
    }

    // 視覚的要素の更新（カスタムボーン線、SkeletonHelper）
    this.updateBoneVisualizationAndVRM();

    // TransformControlsが選択されている場合、その位置と回転もリセット
    if (this.boneTransformControls && this.selectedBone) {
      // 選択されているボーンの新しいワールド位置と回転を取得
      const worldPosition = new THREE.Vector3();
      const worldQuaternion = new THREE.Quaternion();
      this.selectedBone.getWorldPosition(worldPosition);
      this.selectedBone.getWorldQuaternion(worldQuaternion);
      
      // TransformControlsの位置と回転を更新
      this.boneTransformControls.object?.position.copy(worldPosition);
      this.boneTransformControls.object?.quaternion.copy(worldQuaternion);
      
      console.log('TransformControlsの位置と回転をリセットしました');
    }
  }
  
  /**
   * リソースの破棄
   */
  dispose(): void {
    this.clearBoneVisualization();
    
    if (this.boneTransformControls) {
      this.boneTransformControls.dispose();
      // TransformControlsを破棄
      const gizmo = this.boneTransformControls.getHelper();
      if (gizmo.parent) {
        gizmo.parent.remove(gizmo);
      }
    }
  }
  
  /**
   * 現在ボーンのTransformControlsがドラッグ中かどうかを返す
   */
  isDragging(): boolean {
    return this.boneTransformControls ? this.boneTransformControls.dragging : false;
  }

  /**
   * ボーン選択状態変更のコールバックを設定
   */
  setOnBoneSelectionChanged(callback: ((boneName: string | null) => void) | null): void {
    this.onBoneSelectionChanged = callback;
  }

  /**
   * TransformModeの自動変更コールバックを設定
   */
  setOnTransformModeAutoChanged(callback: ((mode: 'rotate' | 'translate') => void) | null): void {
    this.onTransformModeAutoChanged = callback;
  }

  /**
   * ボーン選択変更後のTransformMode制限チェック
   * translateモード中にHips以外のボーンが選択された場合、rotateモードに自動変更
   */
  private checkTransformModeAfterBoneSelection(): void {
    // 現在のモードがtranslateモードでない場合は何もしない
    if (this.currentTransformMode !== 'translate') {
      return;
    }

    // 選択されたボーンがHips以外の場合、rotateモードに自動変更
    if (!this.isSelectedBoneTranslatable()) {
      console.warn('translateモード中にHips以外のボーンが選択されました。rotateモードに自動変更します。');
      
      // 内部状態をrotateモードに変更
      this.currentTransformMode = 'rotate';
      
      if (this.boneTransformControls) {
        this.boneTransformControls.setMode('rotate');
      }
      
      // UI更新のためのコールバックを呼び出し
      if (this.onTransformModeAutoChanged) {
        this.onTransformModeAutoChanged('rotate');
      }
      
      console.log('translateモードからrotateモードに自動変更しました');
    }
  }

  /**
   * ボーンの視覚化とVRMのリアルタイム更新
   */
  private updateBoneVisualizationAndVRM(): void {
    if (!this.currentVRM) return;

    // BonePointsManagerでボーン線位置を更新
    this.bonePointsManager.updateBoneLinePositions();

    // VRMの更新処理を実行（アニメーションループで実行されるため、ここでは不要）
    // if (this.currentVRM.update) {
    //   this.currentVRM.update(0);
    // }

    console.log('ボーンの視覚化を更新しました（BonePointsManager使用）');
  }



  /**
   * カスタムボーン線を作成（BonePointsManagerに移行済み）
   */
  private createCustomBoneLines(skinnedMesh: THREE.SkinnedMesh): void {
    if (!skinnedMesh.skeleton) return;
    
    console.log('ボーン線作成をBonePointsManagerに委譲します...');
    
    const skeleton = skinnedMesh.skeleton;
    const bones = skeleton.bones;
    
    // ボーン階層情報を解析
    const boneConnections: [THREE.Bone, THREE.Bone][] = [];
    
    for (const bone of bones) {
      // 各ボーンの子ボーンとの接続を追加
      for (const child of bone.children) {
        if (child instanceof THREE.Bone) {
          boneConnections.push([bone, child as THREE.Bone]);
        }
      }
    }
    
    console.log(`ボーン接続数: ${boneConnections.length}`);
    
    if (boneConnections.length === 0) {
      console.log('ボーン接続が見つかりません');
      return;
    }
    
    // BonePointsManagerでボーン線を作成（実ボーンオブジェクト渡し）
    for (const [parentBone, childBone] of boneConnections) {
      this.bonePointsManager.createBoneLine(parentBone, childBone);
    }
    
    console.log(`BonePointsManagerでボーン線を作成完了: ${boneConnections.length}本の線`);
  }
}
