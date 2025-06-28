/**
 * VRMManager - VRMモデルの読み込み・管理を担当
 * 
 * 責任:
 * - VRMファイルの読み込み
 * - 複数VRMモデルの管理
 * - モデルの追加・削除
 * - メタデータの正規化と管理
 * - 表情制御システムとの連携
 */

import * as THREE from 'three';
import { VRM, VRMLoaderPlugin, VRMExpressionManager } from '@pixiv/three-vrm';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { BaseManager } from './BaseManager';

export interface VRMModelData {
  vrm: VRM;
  sourceData: ArrayBuffer;
  normalizedMeta: any;
}

export class VRMManager extends BaseManager {
  private scene: THREE.Scene;
  private gltfLoader!: GLTFLoader;
  private vrmModels: VRMModelData[] = [];

  constructor(scene: THREE.Scene) {
    super();
    this.scene = scene;
    this.setupGLTFLoader();
  }

  /**
   * マネージャー名を取得
   */
  getName(): string {
    return 'VRMManager';
  }

  /**
   * 初期化
   */
  async initialize(): Promise<void> {
    console.log('VRMManagerを初期化しました');
  }

  /**
   * GLTFローダーの設定
   */
  private setupGLTFLoader(): void {
    this.gltfLoader = new GLTFLoader();
    this.gltfLoader.register((parser) => {
      const plugin = new VRMLoaderPlugin(parser);
      plugin.metaPlugin.needThumbnailImage = true;
      return plugin;
    });
  }

  /**
   * ファイルからVRMモデルを読み込む
   */
  async loadVRMFromFile(file: File): Promise<number> {
    const arrayBuffer = await file.arrayBuffer();
    return this.loadVRMFromArrayBuffer(arrayBuffer);
  }

  /**
   * URLからVRMモデルを読み込む
   */
  async loadVRMFromURL(url: string): Promise<number> {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`VRMファイルの取得に失敗しました: ${response.status} ${response.statusText}`);
    }
    const arrayBuffer = await response.arrayBuffer();
    return this.loadVRMFromArrayBuffer(arrayBuffer);
  }

  /**
   * ArrayBufferからVRMモデルを読み込む
   */
  private async loadVRMFromArrayBuffer(arrayBuffer: ArrayBuffer): Promise<number> {
    try {
      // ArrayBufferをBlobURLに変換してロード
      const blob = new Blob([arrayBuffer], { type: 'application/octet-stream' });
      const url = URL.createObjectURL(blob);
      
      try {
        const gltf = await this.gltfLoader.loadAsync(url);
        const vrm = gltf.userData.vrm as VRM;
        const vrmMeta = gltf.userData.vrmMeta;

        if (!vrm) {
          throw new Error('有効なVRMデータが見つかりませんでした');
        }

        // メタ情報を正規化
        const normalizedMeta = this.normalizeVRMMetadata(vrm, vrmMeta);

        // VRMモデルデータを作成
        const modelData: VRMModelData = {
          vrm,
          sourceData: arrayBuffer.slice(0),
          normalizedMeta
        };

        // VRMに正規化されたメタ情報を追加
        (vrm as any).vrmMeta = normalizedMeta;

        // モデルをシーンに追加
        this.scene.add(vrm.scene);

        // VRMの向きと位置を調整
        this.adjustVRMOrientation(vrm);

        // モデルデータを配列に追加
        const index = this.vrmModels.length;
        this.vrmModels.push(modelData);

        // イベント発火
        this.emit('vrm:loaded', { vrm, index });

        console.log('VRMモデルが正常に読み込まれました');
        console.log('VRMバージョン:', normalizedMeta.detectedVersion);

        return index;

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
   * VRMの向きと位置を調整
   */
  private adjustVRMOrientation(vrm: VRM): void {
    // VRM0の場合の向き調整
    if (vrm.meta?.metaVersion === '0') {
      vrm.scene.rotation.y = Math.PI;
    }

    // 複数モデル読み込み時のX軸オフセット配置
    const modelIndex = this.vrmModels.length; // 現在のモデル数（0-based index）
    const offsetDistance = 2.5; // モデル間隔（単位）
    
    if (modelIndex > 0) {
      // 2体目以降はX軸方向にオフセット
      vrm.scene.position.x = modelIndex * offsetDistance;
      console.log(`VRMモデル #${modelIndex} をX軸位置 ${vrm.scene.position.x} に配置しました`);
    } else {
      // 1体目は原点に配置
      vrm.scene.position.set(0, 0, 0);
      console.log('VRMモデル #0 を原点に配置しました');
    }
  }

  /**
   * 指定されたインデックスのVRMモデルを削除
   */
  removeVRMAtIndex(index: number): boolean {
    if (index < 0 || index >= this.vrmModels.length) {
      return false;
    }

    const modelData = this.vrmModels[index];
    
    // シーンから削除
    if (modelData.vrm.scene) {
      this.scene.remove(modelData.vrm.scene);
      
      // リソースの解放
      this.disposeVRMResources(modelData.vrm);
    }

    // 配列から削除
    this.vrmModels.splice(index, 1);

    // イベント発火
    this.emit('vrm:removed', { index });

    return true;
  }

  /**
   * VRMリソースの解放
   */
  private disposeVRMResources(vrm: VRM): void {
    vrm.scene.traverse((object) => {
      if (object instanceof THREE.Mesh) {
        if (object.geometry) {
          object.geometry.dispose();
        }
        if (object.material) {
          if (Array.isArray(object.material)) {
            object.material.forEach((material) => material.dispose());
          } else {
            object.material.dispose();
          }
        }
      }
    });
  }

  /**
   * 指定されたモデルを複製
   */
  async duplicateModel(index: number): Promise<number | null> {
    if (index < 0 || index >= this.vrmModels.length) {
      return null;
    }

    const sourceData = this.vrmModels[index].sourceData;
    try {
      return await this.loadVRMFromArrayBuffer(sourceData);
    } catch (error) {
      console.error('モデル複製エラー:', error);
      return null;
    }
  }

  /**
   * 全モデルを削除
   */
  removeAllModels(): void {
    // 後ろから削除（インデックスの変更を避けるため）
    for (let i = this.vrmModels.length - 1; i >= 0; i--) {
      this.removeVRMAtIndex(i);
    }
  }

  /**
   * VRMモデルのリストを取得
   */
  getVRMModels(): VRM[] {
    return this.vrmModels.map(data => data.vrm);
  }

  /**
   * VRMモデルデータを取得
   */
  getVRMModelData(index: number): VRMModelData | null {
    if (index < 0 || index >= this.vrmModels.length) {
      return null;
    }
    return this.vrmModels[index];
  }

  /**
   * VRMモデルの数を取得
   */
  getVRMCount(): number {
    return this.vrmModels.length;
  }

  /**
   * 指定VRMの表情マネージャーを取得
   * @param index VRMインデックス
   * @returns VRMExpressionManager または null
   */
  getExpressionManager(index: number): VRMExpressionManager | null {
    const modelData = this.getVRMModelData(index);
    if (!modelData) {
      console.warn(`VRMManager: Invalid VRM index ${index}`);
      return null;
    }

    const expressionManager = modelData.vrm.expressionManager;
    if (!expressionManager) {
      console.warn(`VRMManager: No expressionManager found for VRM ${index}`);
      return null;
    }

    return expressionManager;
  }

  /**
   * 指定VRMの利用可能表情リストを取得
   * @param index VRMインデックス 
   * @returns 表情名配列
   */
  getExpressionList(index: number): string[] {
    const expressionManager = this.getExpressionManager(index);
    if (!expressionManager) {
      return [];
    }

    try {
      // VRMExpressionManagerから表情名を抽出
      // @ts-ignore - VRMライブラリの内部構造にアクセス
      const expressions = expressionManager.expressions || expressionManager._expressions;
      if (expressions && typeof expressions === 'object') {
        return Object.keys(expressions);
      }

      // 代替手段: 一般的な表情名リストで試行
      const commonExpressions = [
        'happy', 'angry', 'sad', 'relaxed', 'surprised',
        'aa', 'ih', 'ou', 'ee', 'oh',
        'blink', 'blinkLeft', 'blinkRight',
        'lookUp', 'lookDown', 'lookLeft', 'lookRight'
      ];

      // 実際に設定可能な表情のみをフィルタリング
      return commonExpressions.filter(expr => {
        try {
          expressionManager.setValue(expr, 0);
          return true;
        } catch {
          return false;
        }
      });
    } catch (error) {
      console.warn(`VRMManager: Failed to get expression list for VRM ${index}:`, error);
      return [];
    }
  }

  /**
   * 指定VRMの表情システム情報を取得
   * @param index VRMインデックス
   * @returns 表情システム情報
   */
  getExpressionInfo(index: number): {
    hasExpressions: boolean;
    expressionCount: number;
    availableExpressions: string[];
  } {
    const availableExpressions = this.getExpressionList(index);
    return {
      hasExpressions: availableExpressions.length > 0,
      expressionCount: availableExpressions.length,
      availableExpressions
    };
  }

  /**
   * VRMバージョンを検知
   */
  private detectVRMVersion(vrm: VRM, vrmMeta: any): string {
    // VRM1系の判定
    if (vrm.meta?.metaVersion === '1') {
      return '1.0';
    }
    
    // VRM0系の判定
    if (vrm.meta?.metaVersion === '0' || 
        vrmMeta?.title !== undefined || 
        vrmMeta?.author !== undefined) {
      return '0.0';
    }
    
    return 'unknown';
  }

  /**
   * VRMバージョンを検知し、メタ情報を正規化する
   */
  private normalizeVRMMetadata(vrm: VRM, vrmMeta: any): any {
    const detectedVersion = this.detectVRMVersion(vrm, vrmMeta);
    
    // サムネイル画像の処理
    let thumbnailImage = null;
    if (detectedVersion.startsWith('1.')) {
      thumbnailImage = this.extractVRM1ThumbnailImage(vrmMeta?.thumbnailImage);
    } else if (detectedVersion.startsWith('0.')) {
      thumbnailImage = this.extractVRM0ThumbnailImage(vrmMeta?.texture);
    }

    // VRM1系とVRM0系のメタ情報を正規化
    if (detectedVersion.startsWith('1.')) {
      return {
        detectedVersion,
        name: vrmMeta?.name || 'Unknown',
        authors: vrmMeta?.authors || [],
        version: vrmMeta?.version || '',
        copyrightInformation: vrmMeta?.copyrightInformation || '',
        contactInformation: vrmMeta?.contactInformation || '',
        references: vrmMeta?.references || [],
        thirdPartyLicenses: vrmMeta?.thirdPartyLicenses || '',
        thumbnailImage,
        licenseUrl: vrmMeta?.licenseUrl || '',
        avatarPermission: vrmMeta?.avatarPermission || 'onlyAuthor',
        allowExcessivelyViolentUsage: vrmMeta?.allowExcessivelyViolentUsage || false,
        allowExcessivelySexualUsage: vrmMeta?.allowExcessivelySexualUsage || false,
        commercialUsage: vrmMeta?.commercialUsage || 'personalNonProfit',
        allowPoliticalOrReligiousUsage: vrmMeta?.allowPoliticalOrReligiousUsage || false,
        allowAntisocialOrHateUsage: vrmMeta?.allowAntisocialOrHateUsage || false,
        creditNotation: vrmMeta?.creditNotation || 'required',
        allowRedistribution: vrmMeta?.allowRedistribution || false,
        modification: vrmMeta?.modification || 'prohibited',
        otherLicenseUrl: vrmMeta?.otherLicenseUrl || ''
      };
    } else {
      // VRM0系の場合
      return {
        detectedVersion,
        name: vrmMeta?.title || 'Unknown',
        authors: vrmMeta?.author ? [vrmMeta.author] : [],
        version: vrmMeta?.version || '',
        copyrightInformation: '',
        contactInformation: vrmMeta?.contactInformation || '',
        references: vrmMeta?.reference ? [vrmMeta.reference] : [],
        thirdPartyLicenses: '',
        thumbnailImage,
        licenseUrl: vrmMeta?.otherLicenseUrl || '',
        allowedUserName: vrmMeta?.allowedUserName || 'OnlyAuthor',
        violentUssageName: vrmMeta?.violentUssageName || 'Disallow',
        sexualUssageName: vrmMeta?.sexualUssageName || 'Disallow',
        commercialUssageName: vrmMeta?.commercialUssageName || 'Disallow',
        otherPermissionUrl: vrmMeta?.otherPermissionUrl || '',
        licenseName: vrmMeta?.licenseName || 'Redistribution_Prohibited',
        otherLicenseUrl: vrmMeta?.otherLicenseUrl || ''
      };
    }
  }

  /**
   * VRM1系のHTMLImageElementサムネイル画像をDataURLに変換する
   */
  private extractVRM1ThumbnailImage(thumbnailImage: any): string | null {
    if (!thumbnailImage) return null;

    try {
      if (thumbnailImage instanceof HTMLImageElement) {
        if (thumbnailImage.src.startsWith('data:image/')) {
          return thumbnailImage.src;
        }

        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (ctx && thumbnailImage.naturalWidth > 0 && thumbnailImage.naturalHeight > 0) {
          canvas.width = thumbnailImage.naturalWidth;
          canvas.height = thumbnailImage.naturalHeight;
          ctx.drawImage(thumbnailImage, 0, 0);
          return canvas.toDataURL('image/png');
        }
      }
      
      if (typeof thumbnailImage === 'string') {
        return thumbnailImage;
      }
      
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
    if (!texture) return null;

    try {
      if (texture.image instanceof HTMLImageElement) {
        return texture.image.src;
      }
      
      if (texture.image instanceof HTMLCanvasElement) {
        return texture.image.toDataURL();
      }
      
      if (texture.image instanceof ImageBitmap) {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (ctx) {
          canvas.width = texture.image.width;
          canvas.height = texture.image.height;
          ctx.drawImage(texture.image, 0, 0);
          return canvas.toDataURL('image/png');
        }
      }
      
      if (typeof texture.image === 'string' && texture.userData?.mimeType) {
        if (texture.image.startsWith('data:image/')) {
          return texture.image;
        }
        return `data:${texture.userData.mimeType};base64,${texture.image}`;
      }
      
      return null;
    } catch (error) {
      console.error('VRM0サムネイル抽出エラー:', error);
      return null;
    }
  }

  /**
   * リソースのクリーンアップ
   */
  protected onDispose(): void {
    this.removeAllModels();
  }
}
