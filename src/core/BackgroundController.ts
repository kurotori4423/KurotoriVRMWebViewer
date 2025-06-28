/**
 * BackgroundController - 背景制御を担当
 * 
 * 責任:
 * - 背景色の管理
 * - グラデーション背景の生成
 * - 透明背景の設定
 * - 背景のリセット機能
 * - グリッドヘルパーの表示制御
 */

import * as THREE from 'three';
import { BaseManager } from './BaseManager';

export interface BackgroundSettings {
  type: 'color' | 'gradient' | 'transparent';
  colors: string[];
}

export interface GridSettings {
  visible: boolean;
  size: number;
  divisions: number;
  colorCenterLine: string;
  colorGrid: string;
}

export class BackgroundController extends BaseManager {
  private scene: THREE.Scene;
  private defaultBackgroundColor = '#2a2a2a';
  
  // グリッドヘルパー関連
  private gridHelper: THREE.GridHelper | null = null;
  private gridVisible: boolean = true;
  private gridSettings: GridSettings = {
    visible: true,
    size: 10,
    divisions: 10,
    colorCenterLine: '#888888',
    colorGrid: '#444444'
  };

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
    this.initializeGrid();
    console.log('BackgroundControllerを初期化しました（グリッド機能付き）');
  }

  /**
   * イベントリスナーの設定
   */
  private setupEventListeners(): void {
    this.listen('background:reset', () => {
      this.resetBackground();
    });
    
    this.listen('grid:toggle', () => {
      this.toggleGrid();
    });
  }

  /**
   * グリッドヘルパーを初期化
   */
  private initializeGrid(): void {
    // GridHelperを作成（原点中心、サイズ10、10分割）
    this.gridHelper = new THREE.GridHelper(
      this.gridSettings.size,
      this.gridSettings.divisions,
      this.gridSettings.colorCenterLine,
      this.gridSettings.colorGrid
    );
    
    // グリッドを初期は非表示に設定
    this.gridHelper.visible = this.gridVisible;
    
    // シーンに追加
    this.scene.add(this.gridHelper);
    
    console.log('グリッドヘルパーを初期化しました', {
      size: this.gridSettings.size,
      divisions: this.gridSettings.divisions,
      visible: this.gridVisible
    });
  }

  /**
   * グリッドの表示/非表示を切り替え
   */
  toggleGrid(): void {
    if (!this.gridHelper) {
      console.warn('グリッドヘルパーが初期化されていません');
      return;
    }
    
    this.gridVisible = !this.gridVisible;
    this.gridHelper.visible = this.gridVisible;
    this.gridSettings.visible = this.gridVisible;
    
    console.log(`グリッド表示を切り替えました: ${this.gridVisible ? '表示' : '非表示'}`);
    
    // グリッド状態変更イベントを発行
    this.emit('grid:changed', {
      visible: this.gridVisible,
      settings: this.gridSettings
    });
  }

  /**
   * グリッドの表示状態を設定
   */
  setGridVisible(visible: boolean): void {
    if (!this.gridHelper) {
      console.warn('グリッドヘルパーが初期化されていません');
      return;
    }
    
    this.gridVisible = visible;
    this.gridHelper.visible = visible;
    this.gridSettings.visible = visible;
    
    console.log(`グリッド表示を設定しました: ${visible ? '表示' : '非表示'}`);
    
    // グリッド状態変更イベントを発行
    this.emit('grid:changed', {
      visible: this.gridVisible,
      settings: this.gridSettings
    });
  }

  /**
   * グリッドの設定を更新
   */
  updateGridSettings(settings: Partial<GridSettings>): void {
    if (!this.gridHelper) {
      console.warn('グリッドヘルパーが初期化されていません');
      return;
    }
    
    // 設定を更新
    this.gridSettings = { ...this.gridSettings, ...settings };
    
    // GridHelperを再作成
    this.scene.remove(this.gridHelper);
    this.gridHelper.dispose();
    
    this.gridHelper = new THREE.GridHelper(
      this.gridSettings.size,
      this.gridSettings.divisions,
      this.gridSettings.colorCenterLine,
      this.gridSettings.colorGrid
    );
    
    this.gridHelper.visible = this.gridSettings.visible;
    this.scene.add(this.gridHelper);
    
    console.log('グリッド設定を更新しました', this.gridSettings);
    
    // グリッド状態変更イベントを発行
    this.emit('grid:changed', {
      visible: this.gridVisible,
      settings: this.gridSettings
    });
  }

  /**
   * 現在のグリッド設定を取得
   */
  getGridSettings(): GridSettings {
    return { ...this.gridSettings };
  }

  /**
   * グリッドの表示状態を取得
   */
  isGridVisible(): boolean {
    return this.gridVisible;
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
    
    // グリッドヘルパーの解放
    if (this.gridHelper) {
      this.scene.remove(this.gridHelper);
      this.gridHelper.dispose();
      this.gridHelper = null;
    }
  }
}
