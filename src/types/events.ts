/**
 * イベントシステムで使用するイベントタイプの定義
 */

// VRM関連イベント
export interface VRMLoadedEvent {
  vrm: import('@pixiv/three-vrm').VRM;
  index: number;
}

export interface VRMRemovedEvent {
  index: number;
  vrm: import('@pixiv/three-vrm').VRM;
}

export interface VRMSelectedEvent {
  vrm: import('@pixiv/three-vrm').VRM | null;
  index: number;
}

export interface VRMRootTransformChangedEvent {
  vrm: import('@pixiv/three-vrm').VRM;
  position: import('three').Vector3;
  rotation: import('three').Euler;
}

// VRMA（VRMアニメーション）関連イベント
export interface VRMALoadedEvent {
  vrm: import('@pixiv/three-vrm').VRM;
  animationClip: import('three').AnimationClip;
  fileName: string;
  duration: number;
}

export interface VRMAPlayEvent {
  vrm: import('@pixiv/three-vrm').VRM;
  isPlaying: boolean;
}

export interface VRMAPauseEvent {
  vrm: import('@pixiv/three-vrm').VRM;
  isPaused: boolean;
}

export interface VRMAStopEvent {
  vrm: import('@pixiv/three-vrm').VRM;
}

export interface VRMATimeUpdateEvent {
  vrm: import('@pixiv/three-vrm').VRM;
  currentTime: number;
  duration: number;
  progress: number; // 0.0-1.0
}

export interface VRMAErrorEvent {
  vrm: import('@pixiv/three-vrm').VRM | null;
  error: Error;
  context: 'load' | 'play' | 'pause' | 'stop';
}

export interface VRMAAnimationModeChangedEvent {
  vrm: import('@pixiv/three-vrm').VRM;
  isAnimationMode: boolean;
}

// ボーン関連イベント
export interface BoneSelectedEvent {
  boneName: string | null;
  bone: import('three').Bone | null;
}

export interface BoneVisibilityChangedEvent {
  visible: boolean;
}

export interface BoneTransformModeChangedEvent {
  mode: 'rotate' | 'translate';
}

// 表情制御関連イベント
export interface ExpressionVRMRegisteredEvent {
  vrmIndex: number;
  expressionCount: number;
  availableExpressions: string[];
}

export interface ExpressionActiveChangedEvent {
  vrmIndex: number;
  expressionData: ExpressionData | null;
}

export interface ExpressionValueChangedEvent {
  vrmIndex: number;
  expressionName: string;
  value: number;
  timestamp: number;
}

export interface ExpressionResetEvent {
  vrmIndex: number;
  resetType: 'single' | 'all';
}

// 表情データインターフェース
export interface ExpressionData {
  readonly vrmIndex: number;
  readonly availableExpressions: ReadonlyArray<string>;
  readonly currentValues: ReadonlyMap<string, number>;
  readonly hasExpressions: boolean;
}

// ライト関連イベント
export interface LightSelectedEvent {
  isSelected: boolean;
  lightType?: 'directional' | 'ambient' | 'rim';
}

export interface LightIntensityChangedEvent {
  lightType: 'ambient' | 'directional' | 'rim';
  intensity: number;
}

export interface LightColorChangedEvent {
  lightType: 'ambient' | 'directional' | 'rim';
  color: import('three').Color;
}

export interface LightVisibilityChangedEvent {
  visible: boolean;
}

// カメラ関連イベント
export interface CameraFocusEvent {
  target: import('three').Vector3;
}

// 背景関連イベント
export interface BackgroundChangedEvent {
  type: 'color' | 'gradient' | 'transparent';
  colors?: string[];
}

// グリッド関連イベント
export interface GridChangedEvent {
  visible: boolean;
  settings: {
    visible: boolean;
    size: number;
    divisions: number;
    colorCenterLine: string;
    colorGrid: string;
  };
}

// イベントマップ - 全てのイベントタイプを定義
export interface EventMap {
  // VRM Events
  'vrm:loaded': VRMLoadedEvent;
  'vrm:removed': VRMRemovedEvent;
  'vrm:selected': VRMSelectedEvent;
  'vrm:selection-cleared': void;
  'vrm-root-transform-changed': VRMRootTransformChangedEvent;
  
  // VRMA Events
  'vrma:loaded': VRMALoadedEvent;
  'vrma:play': VRMAPlayEvent;
  'vrma:pause': VRMAPauseEvent;
  'vrma:stop': VRMAStopEvent;
  'vrma:time-update': VRMATimeUpdateEvent;
  'vrma:error': VRMAErrorEvent;
  'vrma:animation-mode-changed': VRMAAnimationModeChangedEvent;
  
  // Bone Events
  'bone:selected': BoneSelectedEvent;
  'bone:visibility-changed': BoneVisibilityChangedEvent;
  'bone:transform-mode-changed': BoneTransformModeChangedEvent;
  'bone:pose-reset': void;
  
  // Expression Events
  'expression:vrm-registered': ExpressionVRMRegisteredEvent;
  'expression:active-changed': ExpressionActiveChangedEvent;
  'expression:value-changed': ExpressionValueChangedEvent;
  'expression:reset': ExpressionResetEvent;
  
  // Light Events
  'light:selected': LightSelectedEvent;
  'light:intensity-changed': LightIntensityChangedEvent;
  'light:color-changed': LightColorChangedEvent;
  'light:visibility-changed': LightVisibilityChangedEvent;
  'light:reset': void;
  
  // Camera Events
  'camera:focus': CameraFocusEvent;
  'camera:reset': void;
  
  // Background Events
  'background:changed': BackgroundChangedEvent;
  'background:reset': void;
  
  // Grid Events
  'grid:changed': GridChangedEvent;
  'grid:toggle': void;
}

// イベントリスナーの型定義
export type EventListener<T> = (data: T) => void;

// イベント名の型安全性を保証
export type EventName = keyof EventMap;

// 表情制御関連の型定義
export type ExpressionName = string;
export type ExpressionValue = number; // 0.0-1.0
export type VRMIndex = number; // 0-4

// 型ガード関数
export function isValidExpressionValue(value: any): value is ExpressionValue {
  return typeof value === 'number' && value >= 0 && value <= 1;
}

export function isValidVRMIndex(index: any): index is VRMIndex {
  return typeof index === 'number' && index >= 0 && index < 5;
}
