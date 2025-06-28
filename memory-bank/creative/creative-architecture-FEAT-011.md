📌 CREATIVE PHASE START: VRM表情制御アーキテクチャ設計
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**タスク**: FEAT-011 VRM表情設定機能実装  
**日付**: 2025年6月28日  
**フェーズ**: Architecture Design Creative Phase  
**前提**: UI/UX設計・データ構造設計 完了済み

---

## 1️⃣ PROBLEM

**Description**: 
VRM表情制御システムを既存のVRMビューワーアーキテクチャに統合し、コンポーネント間の依存関係・イベントフロー・ライフサイクル管理を最適化する。

**Requirements**:
- ✅ 既存VRMViewerRefactored・VRMManagerとの自然な統合
- ✅ BaseManagerパターン完全準拠
- ✅ EventBus中心のイベント駆動アーキテクチャ
- ✅ VRMロード・削除・選択変更イベントとの連携
- ✅ UI（main.ts）との疎結合な連携
- ✅ リアルタイム更新とレンダリングループ統合
- ✅ エラーハンドリング・例外安全性
- ✅ 段階的実装が可能な設計

**Constraints**:
- 既存アーキテクチャの変更最小化
- BaseManager・EventBusパターン必須準拠
- VRMManager・SelectionManagerとの依存関係管理
- 60FPS維持・メモリリーク防止
- TypeScript型安全性確保

---

## 2️⃣ OPTIONS

**Option A**: Sidecar型 - 既存システムに並列で表情制御追加
**Option B**: Extension型 - 既存Managerクラスを拡張して表情機能追加
**Option C**: Integration型 - 新規Managerとして既存システムに統合

---

## 3️⃣ ANALYSIS

| Criterion | Option A | Option B | Option C |
|-----------|----------|----------|----------|
| 既存システム影響 | ⭐⭐⭐⭐⭐ | ⭐⭐ | ⭐⭐⭐⭐ |
| アーキテクチャ一貫性 | ⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| 拡張性 | ⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| 保守性 | ⭐⭐⭐ | ⭐⭐ | ⭐⭐⭐⭐⭐ |
| EventBus統合 | ⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| 段階的実装 | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐ |

**Key Insights**:
- Option A: 既存システム変更最小、完全独立だが統合性に課題
- Option B: 既存クラス拡張、実装コスト抑制だがアーキテクチャの一貫性損失
- Option C: BaseManagerパターン準拠、最高の統合性・拡張性・保守性

**詳細分析**:
```
🔍 Option C: Integration型
┌─────────────────────────────────────────┐
│ VRMViewerRefactored                     │
├─────────────────────────────────────────┤
│ ├ vrmManager: VRMManager                │
│ ├ selectionManager: SelectionManager    │
│ ├ boneController: VRMBoneController     │
│ └ expressionController: VRMExpr...Ctrl  │ ← NEW
│                                         │
│ EventBus (中央イベントハブ)             │
│ ├ vrm:loaded → expressionController     │
│ ├ vrm:selected → expressionController   │
│ ├ expression:* → UI Update              │
│ └ expression:* → VRM Rendering          │
└─────────────────────────────────────────┘

🏗️ BaseManagerパターン完全準拠
📡 EventBus中心のイベント駆動
🔧 既存システムとの自然な統合
```

---

## 4️⃣ DECISION

**Selected**: Option C: Integration型
**Rationale**: 
BaseManagerパターン完全準拠で既存アーキテクチャとの一貫性を維持。EventBus中心のイベント駆動設計で疎結合を実現し、最高の拡張性・保守性を確保。段階的実装も可能。

---

## 5️⃣ IMPLEMENTATION NOTES

### アーキテクチャ統合設計
```typescript
// VRMViewerRefactored.ts 拡張
class VRMViewerRefactored {
  // === 既存Managers ===
  private vrmManager: VRMManager;
  private selectionManager: SelectionManager;
  private boneController: VRMBoneController;
  
  // === 新規追加 ===
  private expressionController: VRMExpressionController; // NEW
  
  async initialize(): Promise<void> {
    // ... 既存初期化 ...
    
    // 表情制御システム初期化
    this.expressionController = new VRMExpressionController(
      this.scene,
      this.eventBus
    );
    
    // イベント統合設定
    this.setupExpressionIntegration();
  }
  
  // === 表情制御システム統合 ===
  private setupExpressionIntegration(): void {
    // VRMロード時の表情システム登録
    this.eventBus.on('vrm:loaded', (event) => {
      this.expressionController.registerVRM(
        event.index, 
        event.vrm
      );
    });
    
    // VRM選択変更時の表情システム更新
    this.eventBus.on('selection:model-changed', (event) => {
      this.expressionController.setActiveVRM(event.selectedIndex);
    });
    
    // VRM削除時の表情データクリーンアップ
    this.eventBus.on('vrm:removed', (event) => {
      this.expressionController.unregisterVRM(event.index);
    });
  }
  
  // === 外部API（表情制御） ===
  public getExpressionController(): VRMExpressionController {
    return this.expressionController;
  }
}
```

### EventBusイベントフロー設計
```typescript
// イベントフロー図
/*
┌─────────────────────────────────────────────────────────┐
│                    EVENT FLOW DIAGRAM                  │
├─────────────────────────────────────────────────────────┤
│                                                         │
│ VRMManager          EventBus           ExpressionCtrl   │
│     │                 │                      │          │
│     ├─ vrm:loaded ────┤                      │          │
│     │                 ├─ vrm:loaded ────────→│          │
│     │                 │                  registerVRM()  │
│     │                 │                      │          │
│ SelectionManager      │                      │          │
│     │                 │                      │          │
│     ├─ selection: ────┤                      │          │
│     │   model-changed │                      │          │
│     │                 ├─ selection: ────────→│          │
│     │                 │   model-changed  setActiveVRM() │
│     │                 │                      │          │
│     │                 │   expression: ←──────┤          │
│     │                 │   value-changed      │          │
│     │                 │                      │          │
│     │                 ├─ expression: ───→ UI Update     │
│     │                 │   value-changed                 │
│     │                 │                                 │
│     │                 ├─ expression: ───→ VRM Render    │
│     │                 │   vrm-registered                │
│                                                         │
└─────────────────────────────────────────────────────────┘
*/

// events.ts 拡張
export interface VRMEvents {
  // ... 既存イベント ...
  
  // 表情制御イベント（新規追加）
  'expression:vrm-registered': ExpressionVRMRegisteredEvent;
  'expression:active-changed': ExpressionActiveChangedEvent;
  'expression:value-changed': ExpressionValueChangedEvent;
  'expression:reset': ExpressionResetEvent;
}
```

### レンダリングループ統合
```typescript
// VRMViewerRefactored.ts レンダリング統合
class VRMViewerRefactored {
  private animate(): void {
    requestAnimationFrame(() => this.animate());
    
    const deltaTime = this.clock.getDelta();
    
    // === 既存アニメーション処理 ===
    this.vrmManager.update(deltaTime);
    this.boneController.updateBoneVisuals();
    
    // === 表情制御更新（新規追加） ===
    this.expressionController.update(deltaTime); // リアルタイム表情更新
    
    // === レンダリング ===
    this.renderer.render(this.scene, this.camera);
  }
}

// VRMExpressionController.ts 更新処理
class VRMExpressionController extends BaseManager {
  public update(deltaTime: number): void {
    // アクティブVRMの表情を毎フレーム更新
    const activeData = this.getActiveVRMData();
    if (activeData && activeData.hasExpressions) {
      activeData.expressionManager.update();
    }
    
    // パフォーマンス監視
    this.updatePerformanceMetrics(deltaTime);
  }
}
```

### UI統合設計（main.ts）
```typescript
// main.ts 統合
async function main() {
  // ... 既存初期化 ...
  
  // 表情制御ハンドラー設定（新規追加）
  setupExpressionControlHandlers(vrmViewer);
}

// 表情制御専用イベントハンドラー
function setupExpressionControlHandlers(vrmViewer: VRMViewerRefactored): void {
  const expressionController = vrmViewer.getExpressionController();
  
  // === UI要素取得 ===
  const expressionContainer = document.getElementById('expression-controls-container');
  const resetButton = document.getElementById('reset-all-expressions');
  
  // === EventBus連携 ===
  eventBus.on('expression:vrm-registered', (event) => {
    updateExpressionUI(event.vrmIndex, event.availableExpressions);
  });
  
  eventBus.on('expression:active-changed', (event) => {
    switchActiveExpressionUI(event.vrmIndex, event.expressionData);
  });
  
  // === スライダーイベント処理 ===
  expressionContainer?.addEventListener('input', (event) => {
    const slider = event.target as HTMLInputElement;
    if (slider.classList.contains('expression-slider')) {
      const expressionName = slider.dataset.expression!;
      const value = parseFloat(slider.value);
      
      expressionController.setExpression(expressionName, value);
    }
  });
  
  // === リセットボタン ===
  resetButton?.addEventListener('click', () => {
    expressionController.resetAllExpressions();
  });
}
```

### エラーハンドリング・例外安全性
```typescript
class VRMExpressionController extends BaseManager {
  // === 安全な表情値設定 ===
  setExpression(expressionName: string, value: number): boolean {
    try {
      const activeData = this.getActiveVRMData();
      if (!activeData?.hasExpressions) {
        console.warn('表情データがありません');
        return false;
      }
      
      if (!activeData.availableExpressions.includes(expressionName)) {
        console.warn(`不明な表情名: ${expressionName}`);
        return false;
      }
      
      // 値の範囲チェック
      const clampedValue = Math.max(0, Math.min(1, value));
      if (clampedValue !== value) {
        console.warn(`表情値が範囲外: ${value} → ${clampedValue}`);
      }
      
      activeData.setExpressionValue(expressionName, clampedValue);
      activeData.expressionManager.setValue(expressionName, clampedValue);
      activeData.expressionManager.update();
      
      this.eventBus.emit('expression:value-changed', {
        vrmIndex: this.activeVrmIndex,
        expressionName,
        value: clampedValue,
        timestamp: performance.now()
      });
      
      return true;
    } catch (error) {
      console.error('表情設定エラー:', error);
      return false;
    }
  }
  
  // === リソースクリーンアップ ===
  public dispose(): void {
    this.vrmExpressionDataMap.clear();
    this.activeVrmIndex = -1;
    
    // EventBusリスナー解除
    this.eventBus.off('vrm:loaded');
    this.eventBus.off('selection:model-changed');
    this.eventBus.off('vrm:removed');
  }
}
```

### 段階的実装戦略
```typescript
// Phase 1: 基盤システム
// ├ VRMExpressionController作成
// ├ VRMExpressionData作成  
// ├ EventBus統合
// └ 基本型定義

// Phase 2: UI統合
// ├ HTML構造追加
// ├ CSS実装
// ├ setupExpressionControlHandlers()
// └ 基本操作確認

// Phase 3: システム統合・最適化
// ├ VRMViewerRefactored統合
// ├ レンダリングループ統合
// ├ エラーハンドリング強化
// └ パフォーマンス最適化
```

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📌 CREATIVE PHASE END

**VERIFICATION**:
[x] Problem clearly defined
[x] Multiple options considered  
[x] Decision made with rationale
[x] Implementation guidance provided
[x] EventBus integration designed
[x] Error handling addressed
[x] Phased implementation planned 