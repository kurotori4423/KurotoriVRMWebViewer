# 🏗️ SYSTEM PATTERNS - アーキテクチャパターン集

**システム種別**: WebGL VRMビューワー  
**アーキテクチャ**: モジュラー・イベント駆動型  
**設計原則**: BaseManagerパターン・疎結合・型安全  
**最終更新**: 2025年6月29日

---

## 🎯 核心アーキテクチャパターン

### 🏗️ BaseManagerパターン
全マネージャークラスの統一基盤パターン

```typescript
abstract class BaseManager {
  protected scene: THREE.Scene;
  protected eventBus: EventBus;
  
  constructor(scene: THREE.Scene, eventBus: EventBus) {
    this.scene = scene;
    this.eventBus = eventBus;
    this.initialize();
  }
  
  protected abstract initialize(): void;
  public abstract cleanup(): void;
  public abstract update(): void;
}
```

**適用コンポーネント**:
- VRMManager (VRMモデル管理)
- BonePointsManager (ボーン表示管理)  
- SelectionManager (選択状態管理)
- VRMExpressionController (表情制御)
- VRMRootController (ルート操作)

### 🔄 EventBusパターン
疎結合コンポーネント通信システム

```typescript
class EventBus {
  private listeners: Map<string, Function[]> = new Map();
  
  on(event: string, callback: Function): void
  emit(event: string, data?: any): void
  off(event: string, callback: Function): void
}
```

**主要イベント**:
- `model-selected`: モデル選択変更
- `bone-selected`: ボーン選択変更
- `expression-changed`: 表情値変更
- `pose-reset`: ポーズリセット実行

### 🎨 BonePointsパターン
VRM専用視覚化要素管理パターン

```typescript
class BonePointsManager extends BaseManager {
  private bonePoints: THREE.Points;
  private coordinateCache: HierarchicalCoordinateCache;
  
  // VRMシーン階層内での効率的管理
  // 座標系統一・メモリ最適化
}
```

**特徴**:
- VRMシーン階層内配置
- 階層キャッシュシステム
- バッチ更新最適化
- SpringBone連動

## 🔧 設計原則・パターン

### 1. 関心の分離 (Separation of Concerns)

```
VRMManager     → VRMモデル管理専門
LightController → ライト制御専門  
SelectionManager → 選択状態管理専門
EventBus       → コンポーネント通信専門
```

### 2. 依存関係逆転 (Dependency Inversion)

```typescript
// 抽象に依存、具象に依存しない
interface ISelectionManager {
  selectModel(id: string): void;
  getSelectedModel(): VRMModel | null;
}

class VRMController {
  constructor(private selectionManager: ISelectionManager) {}
}
```

### 3. 単一責任原則 (Single Responsibility)

```
VRMBoneController     → ボーン操作のみ
VRMExpressionController → 表情制御のみ
BackgroundController  → 背景設定のみ
```

### 4. 開放閉鎖原則 (Open/Closed)

```typescript
// 拡張に開放、修正に閉鎖
abstract class BaseController {
  // 基本機能は変更せず
  // 新機能は継承で追加
}
```

## 🎯 モジュール構成パターン

### コアモジュール階層
```
core/
├── BaseManager.ts          // 基盤クラス
├── VRMManager.ts          // VRM管理
├── SelectionManager.ts    // 選択管理
├── BonePointsManager.ts   // ボーン表示
├── LightController.ts     // ライト制御
├── BackgroundController.ts // 背景制御
├── VRMBoneController.ts   // ボーン操作
├── VRMExpressionController.ts // 表情制御
├── VRMRootController.ts   // ルート操作
└── VRMViewerRefactored.ts // メイン統合
```

### ユーティリティモジュール
```
utils/
├── EventBus.ts                    // イベントバス
├── HierarchicalCoordinateCache.ts // 座標キャッシュ
└── VRMCoordinateHelper.ts         // VRM座標変換
```

### 型定義モジュール
```
types/
└── events.ts  // イベント型定義
```

## 🔄 データフローパターン

### 単方向データフロー
```
User Input → EventBus → Manager → Three.js → Rendering
    ↑                                          ↓
    └──────── UI Update ←──── State Change ←──┘
```

### 状態管理パターン
```typescript
// 中央集権型状態管理
class ApplicationState {
  selectedModelId: string | null = null;
  selectedBoneId: string | null = null;
  isBonesVisible: boolean = false;
  
  // イミュータブル更新
  updateState(changes: Partial<ApplicationState>): ApplicationState {
    return { ...this, ...changes };
  }
}
```

## 🎨 UI/UXパターン

### モーダル統合パターン
```css
.modal-section {
  /* glassmorphism統一デザイン */
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  border-radius: 12px;
}
```

### レスポンシブレイアウトパターン
```css
/* 3段階ブレークポイント */
@media (max-width: 320px) { /* モバイル */ }
@media (max-width: 768px) { /* タブレット */ }
@media (min-width: 769px) { /* デスクトップ */ }
```

### アクセシビリティパターン
```html
<!-- WAI-ARIA準拠 -->
<button role="tab" aria-selected="true" aria-controls="pose-panel">
  ポーズ
</button>
<div role="tabpanel" id="pose-panel" aria-labelledby="pose-tab">
  <!-- タブコンテンツ -->
</div>
```

## 🚀 パフォーマンスパターン

### 1. 効率的レンダリング
```typescript
// リクエストアニメーションフレーム最適化
class RenderLoop {
  private shouldRender = false;
  
  requestRender(): void {
    if (!this.shouldRender) {
      this.shouldRender = true;
      requestAnimationFrame(() => {
        this.render();
        this.shouldRender = false;
      });
    }
  }
}
```

### 2. メモリ管理パターン
```typescript
// リソース自動解放
class ResourceManager {
  private resources: Set<Disposable> = new Set();
  
  register(resource: Disposable): void {
    this.resources.add(resource);
  }
  
  cleanup(): void {
    this.resources.forEach(r => r.dispose());
    this.resources.clear();
  }
}
```

### 3. 階層キャッシュパターン
```typescript
// 座標計算キャッシュ
class HierarchicalCoordinateCache {
  private cache = new Map<string, THREE.Vector3>();
  
  getWorldPosition(bone: THREE.Bone): THREE.Vector3 {
    const key = bone.uuid;
    if (!this.cache.has(key)) {
      this.cache.set(key, bone.getWorldPosition(new THREE.Vector3()));
    }
    return this.cache.get(key)!;
  }
}
```

## 🔒 エラーハンドリングパターン

### 段階的エラー処理
```typescript
// 1. Try-Catch包括
try {
  await vrmManager.loadVRM(file);
} catch (error) {
  // 2. エラー分類
  if (error instanceof VRMLoadError) {
    // VRM固有エラー
  } else if (error instanceof NetworkError) {
    // ネットワークエラー  
  } else {
    // 予期しないエラー
  }
  
  // 3. ユーザーフィードバック
  showErrorMessage(error.message);
  
  // 4. ログ記録
  console.error('VRM Load Error:', error);
}
```

### 防御的プログラミング
```typescript
// null/undefined チェック
function selectBone(boneId: string | null): void {
  if (!boneId || !this.vrmModel) {
    console.warn('Invalid bone selection attempt');
    return;
  }
  
  const bone = this.vrmModel.bones.find(b => b.uuid === boneId);
  if (!bone) {
    console.warn('Bone not found:', boneId);
    return;
  }
  
  // 安全な処理実行
  this.processBoneSelection(bone);
}
```

## 📊 品質保証パターン

### TypeScript型安全
```typescript
// 厳格な型定義
interface VRMBone {
  readonly uuid: string;
  readonly name: string;
  position: THREE.Vector3;
  rotation: THREE.Euler;
}

// 型ガード
function isVRMBone(obj: any): obj is VRMBone {
  return obj && 
         typeof obj.uuid === 'string' &&
         typeof obj.name === 'string' &&
         obj.position instanceof THREE.Vector3;
}
```

### 設定値検証パターン
```typescript
// 入力値バリデーション
function setExpressionValue(name: string, value: number): void {
  if (!this.isValidExpressionName(name)) {
    throw new Error(`Invalid expression name: ${name}`);
  }
  
  if (value < 0 || value > 1) {
    throw new Error(`Expression value must be 0-1: ${value}`);
  }
  
  this.expressionManager.setValue(name, value);
}
```

## 🎯 拡張性パターン

### プラグインアーキテクチャ準備
```typescript
interface Plugin {
  name: string;
  version: string;
  initialize(context: PluginContext): void;
  cleanup(): void;
}

class PluginManager {
  private plugins: Map<string, Plugin> = new Map();
  
  register(plugin: Plugin): void {
    plugin.initialize(this.createContext());
    this.plugins.set(plugin.name, plugin);
  }
}
```

### 機能モジュール分離
```typescript
// 機能別モジュール
class FeatureModule {
  constructor(
    private core: CoreSystem,
    private eventBus: EventBus
  ) {}
  
  activate(): void { /* 機能有効化 */ }
  deactivate(): void { /* 機能無効化 */ }
}
``` 