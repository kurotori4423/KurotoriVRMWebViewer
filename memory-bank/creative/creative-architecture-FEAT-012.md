# 🏗️ CREATIVE PHASE: ARCHITECTURE DESIGN - FEAT-012

**作成日時**: 2025年6月28日 19:40:54  
**タスク**: FEAT-012 - 選択中モデル設定UI再設計・タブ機能実装  
**フェーズ**: Architecture Design Creative Phase  
**依存関係**: UI/UX設計完了 → アーキテクチャ設計

---

## 📋 CONTEXT & REQUIREMENTS

### システム要件
- **タブ管理システム**: 3タブ（基本・ポーズ・表情）の状態管理・切替ロジック
- **VRMコントローラー統合**: タブ切替時の自動ボーン表示/ルート操作切替
- **イベント駆動アーキテクチャ**: 既存EventBusシステムとの完全統合
- **パフォーマンス要件**: 60FPS維持・リアルタイム更新
- **拡張性要件**: 将来的なタブ追加・機能拡張への対応

### 技術制約
- **既存アーキテクチャ準拠**: BaseManagerパターン・EventBusシステム活用必須
- **API制約**: VRMライブラリ・three.jsのAPI制限内実装
- **メモリ制約**: WebGLコンテキスト・VRMモデルメモリ効率化
- **レガシー統合**: 既存setupModelControlHandlers()の段階的リファクタリング

---

## 🏗️ COMPONENT ANALYSIS

### コアコンポーネント特定

#### 1. **TabManager**（新規）
- **目的**: タブ状態管理・切替ロジック・UI更新統制
- **責任範囲**: 
  - アクティブタブ状態管理
  - タブ切替時イベント発行
  - タブパネル表示/非表示制御
  - タブ連動VRMコントローラー呼び出し

#### 2. **ActionButtonController**（新規）  
- **目的**: 常時表示4ボタンの状態管理・アイコン切替
- **責任範囲**:
  - ボタン状態（enabled/disabled）管理
  - 動的アイコン切替（表示/非表示ボタン）
  - ボタンイベントハンドリング

#### 3. **VRMRootController**（既存・拡張）
- **既存機能**: ルート変換操作・スケール制御
- **新規拡張**: タブ連動でのルート操作モード自動切替

#### 4. **VRMBoneController**（既存・拡張）
- **既存機能**: ボーン表示・選択・操作
- **新規拡張**: タブ連動でのボーン表示自動切替

#### 5. **VRMExpressionController**（既存・FEAT-011）
- **既存機能**: 表情制御・スライダー管理
- **統合要件**: 表情タブ内での既存機能活用

### コンポーネント相互作用

```
TabManager
├── ActionButtonController
│   ├── リセット → VRMRootController.resetModel()
│   ├── フォーカス → VRMRootController.focusModel()  
│   ├── 表示切替 → VRMRootController.toggleVisibility()
│   └── 削除 → SelectionManager.deleteSelected()
└── タブ切替イベント
    ├── 基本タブ → VRMBoneController.setVisibility(false)
    │            VRMRootController.setMode(true)
    ├── ポーズタブ → VRMBoneController.setVisibility(true)
    │             VRMRootController.setMode(false)
    └── 表情タブ → VRMExpressionController.focus()
```

---

## 🏗️ ARCHITECTURE OPTIONS

### Option A: 統合管理型アーキテクチャ（推奨）

**Description**: TabManager中心の統合管理で全コンポーネントを統制

**コンポーネント構造**:
```typescript
class TabManager extends BaseManager {
  private activeTab: 'basic' | 'pose' | 'expression';
  private actionButtons: ActionButtonController;
  private vrmControllers: {
    root: VRMRootController;
    bone: VRMBoneController; 
    expression: VRMExpressionController;
  };
  
  public switchTab(tabName: string): void {
    // 1. UI更新
    this.updateTabUI(tabName);
    // 2. VRMコントローラー連動
    this.handleTabSpecificActions(tabName);
    // 3. イベント発行
    this.eventBus.emit('tab:changed', { tab: tabName });
  }
}

class ActionButtonController {
  private tabManager: TabManager;
  private vrmControllers: VRMControllerCollection;
  
  public handleButtonClick(action: ActionType): void {
    // 各ボタンに対応したVRMコントローラー呼び出し
  }
}
```

**Pros**:
- ✅ 明確な責任分離・単一責任原則準拠
- ✅ BaseManagerパターン完全継承
- ✅ EventBusシステム最大活用
- ✅ 将来拡張性（新タブ追加）が容易
- ✅ 既存コントローラーとの疎結合統合

**Cons**:
- ❌ 新規クラス追加によるファイル数増加
- ❌ 初期実装コストが中程度

**Technical Fit**: High  
**Complexity**: Medium  
**Scalability**: High

### Option B: 関数ベース分散型

**Description**: 関数ベースでタブ管理・既存ハンドラーの部分的拡張

**実装構造**:
```typescript
// main.tsに追加される関数群
function setupTabSystem(): void {
  setupTabButtons();
  setupActionButtons();
  bindTabEvents();
}

function handleTabSwitch(tabName: string): void {
  updateTabUI(tabName);
  executeTabSpecificLogic(tabName);
}

function executeTabSpecificLogic(tabName: string): void {
  switch (tabName) {
    case 'basic': 
      vrmViewer.setBoneVisibility(false);
      vrmViewer.setRootTransformVisible(true);
      break;
    // ... 
  }
}
```

**Pros**:
- ✅ 既存main.ts構造からの変更最小
- ✅ 実装コスト最小
- ✅ 学習コスト低い

**Cons**:
- ❌ main.tsの肥大化・可読性悪化
- ❌ 関数間の依存関係が複雑化
- ❌ テスト困難・デバッグ困難
- ❌ 将来拡張時のメンテナンス性低下

**Technical Fit**: Medium  
**Complexity**: Low  
**Scalability**: Low

### Option C: EventBus中心型

**Description**: EventBusを中心とした完全イベント駆動アーキテクチャ

**実装構造**:
```typescript
// 各コンポーネントは完全独立・EventBusのみで通信
eventBus.on('tab:switched:basic', () => {
  vrmBoneController.setVisibility(false);
  vrmRootController.setMode(true);
});

eventBus.on('action:reset', () => {
  vrmRootController.resetModel();
});

eventBus.on('action:visibility:toggle', () => {
  vrmRootController.toggleVisibility();
});
```

**Pros**:
- ✅ 完全疎結合・テスタビリティ高い
- ✅ イベント駆動の純粋実装
- ✅ コンポーネント間の依存関係なし

**Cons**:
- ❌ イベントフロー複雑化・デバッグ困難
- ❌ イベント名管理の複雑性
- ❌ パフォーマンスオーバーヘッド
- ❌ 実装時間大幅増加

**Technical Fit**: Medium  
**Complexity**: High  
**Scalability**: Medium

---

## 🎯 DECISION: Option A - 統合管理型アーキテクチャ

### 💡 **決定根拠**

**アーキテクチャ一貫性**: 既存BaseManagerパターンとの完璧な統合  
**保守性優先**: 明確な責任分離によるメンテナンス性向上  
**拡張性重視**: 新タブ・新機能追加時の影響範囲最小化  
**パフォーマンス**: 直接メソッド呼び出しによる高速動作

### 🏗️ **詳細アーキテクチャ設計**

#### A. クラス構造設計

```typescript
// 新規: TabManager.ts
export class TabManager extends BaseManager {
  private activeTab: TabType = 'basic';
  private tabButtons: Map<TabType, HTMLButtonElement>;
  private tabPanels: Map<TabType, HTMLElement>;
  
  constructor(
    private actionButtons: ActionButtonController,
    private vrmControllers: VRMControllerCollection
  ) {
    super();
    this.initializeTabSystem();
  }
  
  public switchTab(tabName: TabType): void {
    if (this.activeTab === tabName) return;
    
    // 1. 前タブ非アクティブ化
    this.deactivateTab(this.activeTab);
    
    // 2. 新タブアクティブ化
    this.activateTab(tabName);
    
    // 3. タブ特有動作実行
    this.executeTabSpecificActions(tabName);
    
    // 4. 状態更新
    this.activeTab = tabName;
    
    // 5. イベント発行
    this.eventBus.emit('tab:changed', { 
      previous: this.activeTab, 
      current: tabName 
    });
  }
  
  private executeTabSpecificActions(tabName: TabType): void {
    switch (tabName) {
      case 'basic':
        this.vrmControllers.bone.setVisibility(false);
        this.vrmControllers.root.setTransformMode(true);
        break;
      case 'pose':
        this.vrmControllers.bone.setVisibility(true);
        this.vrmControllers.root.setTransformMode(false);
        break;
      case 'expression':
        // 表情タブでは状態変更なし（既存機能活用）
        break;
    }
  }
}

// 新規: ActionButtonController.ts  
export class ActionButtonController {
  private buttons: Map<ActionType, HTMLButtonElement>;
  
  constructor(private vrmControllers: VRMControllerCollection) {
    this.initializeButtons();
    this.bindEvents();
  }
  
  public handleAction(action: ActionType): void {
    switch (action) {
      case 'reset':
        this.vrmControllers.root.resetModel();
        break;
      case 'focus':
        this.vrmControllers.root.focusModel();
        break;
      case 'visibility':
        this.toggleVisibility();
        break;
      case 'delete':
        this.vrmControllers.selection.deleteSelected();
        break;
    }
  }
  
  private toggleVisibility(): void {
    const isVisible = this.vrmControllers.root.isVisible();
    this.vrmControllers.root.setVisibility(!isVisible);
    this.updateVisibilityIcon(!isVisible);
  }
}

// 型定義拡張
type TabType = 'basic' | 'pose' | 'expression';
type ActionType = 'reset' | 'focus' | 'visibility' | 'delete';

interface VRMControllerCollection {
  root: VRMRootController;
  bone: VRMBoneController;
  expression: VRMExpressionController;
  selection: SelectionManager;
}
```

#### B. イベントフロー設計

```typescript
// EventBusイベント定義
interface TabEvents {
  'tab:changed': { previous: TabType; current: TabType };
  'action:executed': { action: ActionType; result: boolean };
  'visibility:toggled': { isVisible: boolean };
}

// イベントフロー例
eventBus.on('tab:changed', (event) => {
  console.log(`Tab switched: ${event.previous} → ${event.current}`);
  
  // アナリティクス等の副次処理
  analytics.trackTabSwitch(event.current);
});

eventBus.on('action:executed', (event) => {
  if (event.action === 'reset') {
    // リセット後の UI 更新等
    this.updateUIAfterReset();
  }
});
```

#### C. 統合戦略

```typescript
// main.ts統合部分
async function initializeVRMViewer(): Promise<void> {
  // 既存初期化...
  const vrmViewer = new VRMViewerRefactored(canvas);
  
  // 新規コンポーネント初期化
  const vrmControllers: VRMControllerCollection = {
    root: vrmViewer.rootController,
    bone: vrmViewer.boneController,
    expression: vrmViewer.expressionController,
    selection: vrmViewer.selectionManager
  };
  
  const actionButtons = new ActionButtonController(vrmControllers);
  const tabManager = new TabManager(actionButtons, vrmControllers);
  
  // 既存ハンドラーの段階的置換
  // setupModelControlHandlers(); // 旧版 - 段階的廃止
  setupNewModelControlHandlers(tabManager, actionButtons);
}

function setupNewModelControlHandlers(
  tabManager: TabManager, 
  actionButtons: ActionButtonController
): void {
  // タブボタンイベント
  document.querySelectorAll('.tab-button').forEach(button => {
    button.addEventListener('click', (e) => {
      const tabName = (e.target as HTMLElement).dataset.tab as TabType;
      tabManager.switchTab(tabName);
    });
  });
  
  // アクションボタンイベント
  document.querySelectorAll('.icon-button').forEach(button => {
    button.addEventListener('click', (e) => {
      const action = (e.target as HTMLElement).dataset.action as ActionType;
      actionButtons.handleAction(action);
    });
  });
}
```

#### D. 段階的移行戦略

```typescript
// Phase 1: 新機能追加（既存機能と並行）
// - TabManager・ActionButtonController新規追加
// - 既存setupModelControlHandlers()は保持

// Phase 2: ハンドラー統合（機能テスト）  
// - setupNewModelControlHandlers()で新旧併用
// - 段階的な機能移行・テスト

// Phase 3: 旧ハンドラー廃止（完全移行）
// - setupModelControlHandlers()完全削除
// - 新アーキテクチャのみで動作確認
```

---

## ✅ **ARCHITECTURE VALIDATION**

### システム要件適合確認
- [x] **タブ管理システム**: TabManagerクラスで状態管理・切替ロジック完備
- [x] **VRMコントローラー統合**: 各コントローラーとの疎結合統合設計
- [x] **EventBus統合**: イベント駆動による副次処理・拡張機能対応
- [x] **パフォーマンス**: 直接メソッド呼び出しで60FPS維持
- [x] **拡張性**: 新タブ追加時のTabManager拡張パターン確立

### 技術制約適合確認  
- [x] **BaseManagerパターン**: TabManagerがBaseManager継承で一貫性保持
- [x] **API制約**: 既存VRMライブラリAPIの活用・新規API不要
- [x] **メモリ効率**: 軽量クラス設計・不要なオブジェクト生成回避
- [x] **レガシー統合**: 段階的移行戦略で既存機能との共存可能

### 実装準備度
- [x] **全コンポーネント特定**: TabManager・ActionButtonController設計完了
- [x] **依存関係マッピング**: VRMControllerCollection型定義で明確化
- [x] **リスク評価**: 段階的移行による低リスク実装戦略
- [x] **実装時間**: 8-10時間の詳細見積もり完了

---

## 🏗️ CREATIVE CHECKPOINT: アーキテクチャ設計完了

**採用決定**: Option A - 統合管理型アーキテクチャ  
**Key Components**: TabManager + ActionButtonController + VRMController拡張  
**Integration Strategy**: 段階的移行・既存BaseManagerパターン継承  
**Next Phase**: 実装フェーズ準備完了

---

*🏗️🏗️🏗️ ARCHITECTURE CREATIVE PHASE COMPLETE 🏗️🏗️🏗️* 