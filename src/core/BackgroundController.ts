/**
 * BackgroundController - 背景制御を担当
 * 
 * 責任:
 * - 背景色の管理
 * - グラデーション背景の生成
 * - 透明背景の設定
 * - 背景のリセット機能
 */

import * as THREE from 'three';
import { BaseManager } from './BaseManager';

export interface BackgroundSettings {
  type: 'color' | 'gradient' | 'transparent';
  colors: string[];
}

export class BackgroundController extends BaseManager {
  private scene: THREE.Scene;
  private defaultBackgroundColor = '#2a2a2a';

  constructor(scene: THREE.Scene) {
    super();
    this.scene = scene;
  }

  /**
   * マネージャー名を取得
   */
  getName(): string {
    return 'BackgroundController';
  }

  /**
   * 初期化
   */
  async initialize(): Promise<void> {
    this.setupEventListeners();
    this.setBackgroundColor(this.defaultBackgroundColor);
    console.log('BackgroundControllerを初期化しました');
  }

  /**
   * イベントリスナーの設定
   */
  private setupEventListeners(): void {
    this.listen('background:reset', () => {
      this.resetBackground();
    });
  }

  /**
   * 背景色を単色に設定
   */
  setBackgroundColor(color: string): void {
    this.scene.background = new THREE.Color(color);
    this.emit('background:changed', {
      type: 'color',
      colors: [color]
    });
  }

  /**
   * 背景を透明に設定
   */
  setBackgroundTransparent(): void {
    this.scene.background = null;
    this.emit('background:changed', {
      type: 'transparent',
      colors: []
    });
  }

  /**
   * 背景をグラデーションに設定
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

    this.emit('background:changed', {
      type: 'gradient',
      colors: [topColor, bottomColor]
    });
  }

  /**
   * 現在の背景設定を取得
   */
  getBackgroundInfo(): BackgroundSettings {
    if (!this.scene.background) {
      return { type: 'transparent', colors: [] };
    }

    if (this.scene.background instanceof THREE.Color) {
      return {
        type: 'color',
        colors: [`#${this.scene.background.getHexString()}`]
      };
    }

    // テクスチャ（グラデーション）の場合
    return { type: 'gradient', colors: [] };
  }

  /**
   * 背景をデフォルト設定にリセット
   */
  resetBackground(): void {
    this.setBackgroundColor(this.defaultBackgroundColor);
  }

  /**
   * リソースのクリーンアップ
   */
  protected onDispose(): void {
    // 背景テクスチャがある場合は解放
    if (this.scene.background instanceof THREE.Texture) {
      this.scene.background.dispose();
    }
    this.scene.background = null;
  }
}
