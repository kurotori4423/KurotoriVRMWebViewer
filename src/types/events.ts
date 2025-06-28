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
  
  // Bone Events
  'bone:selected': BoneSelectedEvent;
  'bone:visibility-changed': BoneVisibilityChangedEvent;
  'bone:transform-mode-changed': BoneTransformModeChangedEvent;
  'bone:pose-reset': void;
  
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
