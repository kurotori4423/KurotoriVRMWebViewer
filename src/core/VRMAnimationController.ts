/**
 * VRMAnimationController - VRMA（VRMアニメーション）制御システム
 * 
 * Creative Phase設計に基づく実装:
 * - VRMALoader: ファイルロード・パース機能
 * - AnimationMixerManager: THREE.AnimationMixer制御
 * - AnimationStateManager: 再生状態管理
 * - VRMAUIBridge: UI連携機能
 * - 中央制御: 全コンポーネント統合管理
 */

import * as THREE from 'three';
import type { VRM } from '@pixiv/three-vrm';
import { VRMAnimationLoaderPlugin, VRMAnimation, createVRMAnimationClip } from '@pixiv/three-vrm-animation';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { BaseManager } from './BaseManager';
import type { 
  VRMALoadedEvent, 
  VRMAPlayEvent, 
  VRMAPauseEvent, 
  VRMAStopEvent, 
  VRMATimeUpdateEvent, 
  VRMAErrorEvent,
  VRMAAnimationModeChangedEvent 
} from '../types/events';

/**
 * アニメーション再生状態
 */
export type AnimationState = 'idle' | 'loading' | 'loaded' | 'playing' | 'paused' | 'error';

/**
 * VRMAファイル情報
 */
export interface VRMAFileInfo {
  fileName: string;
  animationClip: THREE.AnimationClip;
  duration: number;
  loadTime: number;
}

// SVGアイコン定義
const ICONS = {
  play: '<path d="m7 4 10 6L7 16V4z"/>',
  pause: '<path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>',
  delete: '<path d="M280-120q-33 0-56.5-23.5T200-200v-520h-40v-80h200v-40h240v40h200v80h-40v520q0 33-23.5 56.5T680-120H280Zm400-600H280v520h400v-520ZM360-280h80v-360h-80v360Zm160 0h80v-360h-80v360ZM280-720v520-520Z"/>'
};

/**
 * アニメーション制御オプション
 */
export interface AnimationPlayOptions {
  loop?: boolean;
  startTime?: number;
  timeScale?: number;
}

/**
 * VRMAnimationController - VRMA制御のメインクラス
 */
export class VRMAnimationController extends BaseManager {
  private loader: GLTFLoader;
  
  // アニメーション管理
  private animationMixers = new Map<VRM, THREE.AnimationMixer>();
  private animationActions = new Map<VRM, THREE.AnimationAction>();
  private animationStates = new Map<VRM, AnimationState>();
  private fileInfos = new Map<VRM, VRMAFileInfo>();
  
  // 制御状態
  private _isAnimationModeActive = false;
  
  // VRMごとの独立タイマー管理
  private vrmTimers = new Map<VRM, {
    currentTime: number;
    lastUpdateTime: number;
    isPaused: boolean;
  }>();
  
  // アニメーションフレーム制御
  private animationFrameId: number | null = null;

  constructor() {
    super();
    
    // GLTFLoaderとVRMAnimationPluginの初期化
    this.loader = new GLTFLoader();
    // VRMAnimationPluginをGLTFLoaderに登録
    this.loader.register((parser) => new VRMAnimationLoaderPlugin(parser));
    
    this.setupEventListeners();
  }

  /**
   * マネージャー初期化
   */
  async initialize(): Promise<void> {
    // イベントリスナーの設定は既にコンストラクタで完了
    console.log('[VRMAnimationController] Initialized');
  }

  /**
   * マネージャー名取得
   */
  getName(): string {
    return 'VRMAnimationController';
  }

  /**
   * イベントリスナー設定
   */
  private setupEventListeners(): void {
    // VRM選択変更イベント
    this.listen('vrm:selected', (event) => {
      this.handleVRMSelected(event.vrm);
    });

    // VRM削除イベント
    this.listen('vrm:removed', (event) => {
      this.handleVRMRemoved(event);
    });
  }

  /**
   * VRM選択変更処理
   */
  private handleVRMSelected(vrm: VRM | null): void {
    if (vrm && this.hasAnimation(vrm)) {
      this.updateAnimationMode(vrm, true);
    } else {
      this.updateAnimationMode(null, false);
    }
  }

  /**
   * VRM削除処理
   */
  private handleVRMRemoved(event: { index: number; vrm: VRM }): void {
    const { vrm: removedVRM, index } = event;
    
    // 削除されたVRMのアニメーション情報のみをクリーンアップ
    if (this.hasAnimation(removedVRM)) {
      this.clearAnimation(removedVRM);
      console.log(`[VRMAnimationController] Cleared animation for removed VRM at index ${index}`);
    }
  }

  /**
   * VRMAファイルのロード
   */
  async loadVRMAFile(file: File, targetVRM: VRM): Promise<void> {
    if (!targetVRM) {
      throw new Error('Target VRM is required');
    }

    try {
      this.setState(targetVRM, 'loading');
      
      // ファイルをArrayBufferに変換
      const arrayBuffer = await file.arrayBuffer();
      
      // GLTFLoaderでVRMAファイルを読み込み
      const gltf = await new Promise<any>((resolve, reject) => {
        this.loader.parse(arrayBuffer, '', resolve, reject);
      });

      // VRMAnimationを抽出
      const vrmAnimations = gltf.userData.vrmAnimations as VRMAnimation[];
      if (!vrmAnimations || vrmAnimations.length === 0) {
        throw new Error('No VRM animations found in the file');
      }

      // 最初のアニメーションを使用
      const vrmAnimation = vrmAnimations[0];
      
      // AnimationClipに変換
      const animationClip = createVRMAnimationClip(vrmAnimation, targetVRM);
      if (!animationClip) {
        throw new Error('Failed to create animation clip for this VRM');
      }

      // アニメーション情報を保存
      const fileInfo: VRMAFileInfo = {
        fileName: file.name,
        animationClip,
        duration: animationClip.duration,
        loadTime: Date.now()
      };

      this.fileInfos.set(targetVRM, fileInfo);
      
      // AnimationMixerの作成・設定
      this.setupAnimationMixer(targetVRM, animationClip);
      
      this.setState(targetVRM, 'loaded');
      
      // ロード完了イベント発火
      this.emit('vrma:loaded', {
        vrm: targetVRM,
        animationClip,
        fileName: file.name,
        duration: animationClip.duration
      } as VRMALoadedEvent);
      
      console.log(`[VRMAnimationController] VRMA loaded: ${file.name}, duration: ${animationClip.duration}s`);
      
      // 自動再生開始
      this.play(targetVRM);
      console.log(`[VRMAnimationController] Auto-play started for: ${file.name}`);
      
    } catch (error) {
      this.setState(targetVRM, 'error');
      const errorEvent: VRMAErrorEvent = {
        vrm: targetVRM,
        error: error as Error,
        context: 'load'
      };
      this.emit('vrma:error', errorEvent);
      throw error;
    }
  }

  /**
   * AnimationMixerの設定
   */
  private setupAnimationMixer(vrm: VRM, animationClip: THREE.AnimationClip): void {
    // 既存のAnimationMixerがあれば削除
    if (this.animationMixers.has(vrm)) {
      this.clearAnimation(vrm);
    }

    // 新しいAnimationMixerを作成
    const mixer = new THREE.AnimationMixer(vrm.scene);
    const action = mixer.clipAction(animationClip);
    
    // ループ設定
    action.setLoop(THREE.LoopRepeat, Infinity);
    action.clampWhenFinished = true;
    
    this.animationMixers.set(vrm, mixer);
    this.animationActions.set(vrm, action);
    
    // VRMタイマーを初期化
    this.vrmTimers.set(vrm, {
      currentTime: 0,
      lastUpdateTime: performance.now(),
      isPaused: true
    });
  }

  /**
   * アニメーション再生
   */
  play(vrm: VRM, options: AnimationPlayOptions = {}): void {
    const action = this.animationActions.get(vrm);
    if (!action) {
      console.warn('[VRMAnimationController] No animation loaded for this VRM');
      return;
    }

    try {
      // オプション設定
      if (options.timeScale !== undefined) {
        action.setEffectiveTimeScale(options.timeScale);
      }
      
      if (options.startTime !== undefined) {
        action.time = options.startTime;
      }

      if (options.loop !== undefined) {
        action.setLoop(options.loop ? THREE.LoopRepeat : THREE.LoopOnce, Infinity);
      }

      // 一時停止状態をリセット
      action.paused = false;
      
      // VRMタイマーの状態を更新
      const timer = this.vrmTimers.get(vrm);
      if (timer) {
        timer.isPaused = false;
        timer.lastUpdateTime = performance.now();
        // アニメーションの現在時刻をタイマーに同期
        action.time = timer.currentTime;
      }
      
      // アニメーション開始
      action.play();
      this.setState(vrm, 'playing');
      
      // アニメーションモード有効化
      this.updateAnimationMode(vrm, true);
      
      // アニメーションループ開始
      this.startAnimationLoop();
      
      // 再生イベント発火
      this.emit('vrma:play', {
        vrm,
        isPlaying: true
      } as VRMAPlayEvent);
      
      console.log('[VRMAnimationController] Animation started');
      
    } catch (error) {
      this.setState(vrm, 'error');
      this.emit('vrma:error', {
        vrm,
        error: error as Error,
        context: 'play'
      } as VRMAErrorEvent);
    }
  }

  /**
   * アニメーション一時停止
   */
  pause(vrm: VRM): void {
    const action = this.animationActions.get(vrm);
    if (!action) return;

    try {
      action.paused = true;
      
      // VRMタイマーを一時停止状態に
      const timer = this.vrmTimers.get(vrm);
      if (timer) {
        timer.isPaused = true;
        timer.currentTime = action.time; // 現在の時刻を保存
      }
      
      this.setState(vrm, 'paused');
      
      this.emit('vrma:pause', {
        vrm,
        isPaused: true
      } as VRMAPauseEvent);
      
      console.log('[VRMAnimationController] Animation paused');
      
    } catch (error) {
      this.emit('vrma:error', {
        vrm,
        error: error as Error,
        context: 'pause'
      } as VRMAErrorEvent);
    }
  }

  /**
   * アニメーション停止
   */
  stop(vrm: VRM): void {
    const action = this.animationActions.get(vrm);
    if (!action) return;

    try {
      action.stop();
      this.setState(vrm, 'loaded');
      
      // アニメーションモード無効化
      this.updateAnimationMode(vrm, false);
      
      // 他に再生中のVRMがない場合のみアニメーションループ停止
      this.stopAnimationLoopIfNeeded();
      
      this.emit('vrma:stop', {
        vrm
      } as VRMAStopEvent);
      
      console.log('[VRMAnimationController] Animation stopped');
      
    } catch (error) {
      this.emit('vrma:error', {
        vrm,
        error: error as Error,
        context: 'stop'
      } as VRMAErrorEvent);
    }
  }

  /**
   * アニメーション削除
   */
  clearAnimation(vrm: VRM): void {
    this.stop(vrm);
    
    // リソースクリーンアップ
    this.animationMixers.delete(vrm);
    this.animationActions.delete(vrm);
    this.animationStates.delete(vrm);
    this.fileInfos.delete(vrm);
    this.vrmTimers.delete(vrm);
    
    // アニメーションモード無効化
    this.updateAnimationMode(vrm, false);
    
    console.log('[VRMAnimationController] Animation cleared');
  }

  /**
   * アニメーションループ開始
   */
  private startAnimationLoop(): void {
    if (this.animationFrameId !== null) return; // 既に実行中
    
    const animate = () => {
      const now = performance.now();
      
      // 全てのアニメーションミキサーを更新
      for (const [vrm, mixer] of this.animationMixers) {
        const state = this.getState(vrm);
        const timer = this.vrmTimers.get(vrm);
        const action = this.animationActions.get(vrm);
        const fileInfo = this.fileInfos.get(vrm);
        
        if (timer && action && fileInfo) {
          if (state === 'playing' && !timer.isPaused) {
            // 一時停止中でない場合のみ時間を進める
            const deltaTime = (now - timer.lastUpdateTime) / 1000; // ミリ秒を秒に変換
            timer.currentTime += deltaTime;
            timer.lastUpdateTime = now;
            
            // アニメーションの時刻を更新
            action.time = timer.currentTime;
            
            // ミキサーを更新（deltaTimeは0にして、時間制御を独自で行う）
            mixer.update(0);
            
            // 進行状況イベント発火
            const duration = fileInfo.duration;
            const progress = Math.min(timer.currentTime / duration, 1.0);
            
            this.emit('vrma:time-update', {
              vrm,
              currentTime: timer.currentTime,
              duration,
              progress
            } as VRMATimeUpdateEvent);
            
            // ループの終了チェック
            if (timer.currentTime >= duration) {
              timer.currentTime = 0; // ループ再開
              action.time = 0;
            }
          } else if (state === 'paused') {
            // 一時停止中でも現在時刻の表示更新は行う（UI同期用）
            this.emit('vrma:time-update', {
              vrm,
              currentTime: timer.currentTime,
              duration: fileInfo.duration,
              progress: Math.min(timer.currentTime / fileInfo.duration, 1.0)
            } as VRMATimeUpdateEvent);
          }
        }
      }
      
      // 再生中のアニメーションがあれば継続
      const hasPlayingAnimation = Array.from(this.animationStates.values())
        .some(state => state === 'playing');
      
      if (hasPlayingAnimation) {
        this.animationFrameId = requestAnimationFrame(animate);
      } else {
        this.animationFrameId = null;
      }
    };
    
    this.animationFrameId = requestAnimationFrame(animate);
  }

  /**
   * アニメーションループ停止
   */
  private stopAnimationLoop(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  /**
   * 必要に応じてアニメーションループ停止（他に再生中のVRMがない場合のみ）
   */
  private stopAnimationLoopIfNeeded(): void {
    // 他に再生中のVRMがあるかチェック
    const hasPlayingAnimation = Array.from(this.animationStates.values())
      .some(state => state === 'playing');
    
    if (!hasPlayingAnimation) {
      this.stopAnimationLoop();
      console.log('[VRMAnimationController] Animation loop stopped - no more playing animations');
    } else {
      console.log('[VRMAnimationController] Animation loop continues - other VRMs still playing');
    }
  }

  /**
   * アニメーションモード更新
   */
  private updateAnimationMode(vrm: VRM | null, isActive: boolean): void {
    const wasActive = this._isAnimationModeActive;
    this._isAnimationModeActive = isActive;
    
    if (vrm && wasActive !== isActive) {
      this.emit('vrma:animation-mode-changed', {
        vrm,
        isAnimationMode: isActive
      } as VRMAAnimationModeChangedEvent);
    }
  }

  /**
   * アニメーション状態設定
   */
  private setState(vrm: VRM, state: AnimationState): void {
    this.animationStates.set(vrm, state);
  }

  /**
   * アニメーション状態取得
   */
  getState(vrm: VRM): AnimationState {
    return this.animationStates.get(vrm) || 'idle';
  }

  /**
   * アニメーション有無確認
   */
  hasAnimation(vrm: VRM): boolean {
    return this.animationActions.has(vrm);
  }

  /**
   * ファイル情報取得
   */
  getFileInfo(vrm: VRM): VRMAFileInfo | null {
    return this.fileInfos.get(vrm) || null;
  }

  /**
   * 再生中か確認
   */
  isPlaying(vrm: VRM): boolean {
    return this.getState(vrm) === 'playing';
  }

  /**
   * 一時停止中か確認
   */
  isPaused(vrm: VRM): boolean {
    return this.getState(vrm) === 'paused';
  }

  /**
   * 現在のアニメーション時刻を取得
   */
  getCurrentTime(vrm: VRM): number {
    const timer = this.vrmTimers.get(vrm);
    return timer ? timer.currentTime : 0;
  }

  /**
   * アニメーションモードが有効か確認
   */
  isAnimationModeActive(): boolean {
    return this._isAnimationModeActive;
  }

  /**
   * リソースクリーンアップ
   */
  protected onDispose(): void {
    // アニメーションループ停止
    this.stopAnimationLoop();
    
    // 全てのアニメーションをクリーンアップ
    for (const vrm of this.animationMixers.keys()) {
      this.clearAnimation(vrm);
    }
    
    console.log('[VRMAnimationController] Disposed');
  }
} 