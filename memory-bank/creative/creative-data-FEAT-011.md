📌 CREATIVE PHASE START: VRM表情制御データ構造設計
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**タスク**: FEAT-011 VRM表情設定機能実装  
**日付**: 2025年6月28日  
**フェーズ**: Data Structure Design Creative Phase  
**前提**: UI/UX設計 (creative-uiux-FEAT-011.md) 完了済み

---

## 1️⃣ PROBLEM

**Description**: 
複数VRMモデルの表情データを効率的に管理し、選択状態変更・リアルタイム更新・状態永続化を実現するデータ構造を設計する。

**Requirements**:
- ✅ 複数VRM（最大5体）の表情データ同時管理
- ✅ VRMごとの利用可能表情リスト動的取得・保存
- ✅ 表情値のリアルタイム状態管理（0.0-1.0）
- ✅ 選択VRM変更時の高速状態切り替え
- ✅ 表情値のメモリ効率的キャッシング
- ✅ 表情リセット・一括操作対応
- ✅ イベント駆動型アーキテクチャ統合
- ✅ 型安全性確保（TypeScript）

**Constraints**:
- VRM expressionManager API制約（setValue/getValue/update）
- メモリ使用量最小化（モバイル対応）
- 60FPS保持（リアルタイム更新）
- EventBus既存システム活用必須
- BaseManagerパターン準拠

---

## 2️⃣ OPTIONS

**Option A**: 集中管理型 - 単一クラスで全VRM表情データ管理
**Option B**: 分散管理型 - VRMごとに個別表情データクラス
**Option C**: ハイブリッド型 - 集中管理+個別キャッシュの組み合わせ

---

## 3️⃣ ANALYSIS

| Criterion | Option A | Option B | Option C |
|-----------|----------|----------|----------|
| パフォーマンス | ⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| メモリ効率 | ⭐⭐⭐ | ⭐⭐ | ⭐⭐⭐⭐ |
| 拡張性 | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ |
| 型安全性 | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| 開発コスト | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐ |
| EventBus統合 | ⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ |

**Key Insights**:
- Option A: シンプルな集中管理、開発コスト最小だが拡張性制限
- Option B: 高い拡張性・柔軟性だが、メモリ使用量・複雑性増加
- Option C: 最適なパフォーマンス・EventBus統合、適度な複雑性

**詳細分析**:
```
🔍 Option C: ハイブリッド型
┌─────────────────────────────────────────┐
│ VRMExpressionController (集中管理)      │
├─────────────────────────────────────────┤
│ ├ activeVrmIndex: number                │
│ ├ vrmExpressionData: Map<index, Data>   │
│ └ eventBus: EventBus                    │
│                                         │
│ ExpressionData (個別VRM)                │
│ ├ vrmIndex: number                      │
│ ├ availableExpressions: string[]        │
│ ├ currentValues: Map<name, number>      │
│ └ expressionManager: VRMExpressionMan.  │
└─────────────────────────────────────────┘

⚡ 最適なパフォーマンス・メモリ効率
🔧 BaseManagerパターン完全準拠
📡 EventBus自然統合
```

---

## 4️⃣ DECISION

**Selected**: Option C: ハイブリッド型
**Rationale**: 
集中管理による操作の簡素化と、個別VRMデータキャッシュによる高速アクセスを両立。BaseManagerパターン準拠でEventBus統合が自然、60FPS要件とメモリ効率を最適化。

---

## 5️⃣ IMPLEMENTATION NOTES

### コアインターfaces設計
```typescript
// 表情データインターフェース
interface ExpressionData {
  readonly vrmIndex: number;
  readonly availableExpressions: ReadonlyArray<string>;
  readonly currentValues: ReadonlyMap<string, number>;
  readonly hasExpressions: boolean;
}

// 表情変更イベント
interface ExpressionChangeEvent {
  vrmIndex: number;
  expressionName: string;
  value: number;
  timestamp: number;
}

// 表情状態イベント  
interface ExpressionStateEvent {
  vrmIndex: number;
  expressionCount: number;
  activeExpressions: string[];
}
```

### メインデータ構造
```typescript
class VRMExpressionController extends BaseManager {
  // === CORE STATE ===
  private activeVrmIndex: number = -1;
  private vrmExpressionDataMap = new Map<number, VRMExpressionData>();
  
  // === VRM表情データ管理 ===
  registerVRM(vrmIndex: number, vrm: VRM): void {
    const expressionManager = vrm.expressionManager;
    const availableExpressions = this.extractExpressionNames(expressionManager);
    
    const vrmData = new VRMExpressionData(
      vrmIndex, 
      expressionManager,
      availableExpressions
    );
    
    this.vrmExpressionDataMap.set(vrmIndex, vrmData);
    
    // EventBus通知
    this.eventBus.emit('expression:vrm-registered', {
      vrmIndex,
      expressionCount: availableExpressions.length,
      availableExpressions
    });
  }
  
  // === アクティブVRM管理 ===
  setActiveVRM(vrmIndex: number): void {
    this.activeVrmIndex = vrmIndex;
    
    this.eventBus.emit('expression:active-changed', {
      vrmIndex,
      expressionData: this.getActiveExpressionData()
    });
  }
  
  // === 表情値操作 ===
  setExpression(expressionName: string, value: number): void {
    const activeData = this.getActiveVRMData();
    if (!activeData) return;
    
    activeData.setExpressionValue(expressionName, value);
    
    // リアルタイム反映
    activeData.expressionManager.setValue(expressionName, value);
    activeData.expressionManager.update();
    
    // EventBus通知
    this.eventBus.emit('expression:value-changed', {
      vrmIndex: this.activeVrmIndex,
      expressionName,
      value,
      timestamp: performance.now()
    });
  }
}
```

### 個別VRMデータクラス
```typescript
class VRMExpressionData {
  public readonly vrmIndex: number;
  public readonly expressionManager: VRMExpressionManager;
  public readonly availableExpressions: ReadonlyArray<string>;
  
  // 高速アクセス用キャッシュ
  private expressionValues = new Map<string, number>();
  private readonly hasExpressions: boolean;
  
  constructor(
    vrmIndex: number,
    expressionManager: VRMExpressionManager,
    availableExpressions: string[]
  ) {
    this.vrmIndex = vrmIndex;
    this.expressionManager = expressionManager;
    this.availableExpressions = Object.freeze([...availableExpressions]);
    this.hasExpressions = availableExpressions.length > 0;
    
    // 初期値設定
    this.initializeExpressionValues();
  }
  
  // === 表情値管理 ===
  setExpressionValue(name: string, value: number): void {
    if (!this.availableExpressions.includes(name)) return;
    
    const clampedValue = Math.max(0, Math.min(1, value));
    this.expressionValues.set(name, clampedValue);
  }
  
  getExpressionValue(name: string): number {
    return this.expressionValues.get(name) ?? 0;
  }
  
  getAllExpressionValues(): ReadonlyMap<string, number> {
    return new Map(this.expressionValues);
  }
  
  // === リセット操作 ===
  resetAllExpressions(): void {
    for (const expressionName of this.availableExpressions) {
      this.expressionValues.set(expressionName, 0);
      this.expressionManager.setValue(expressionName, 0);
    }
    this.expressionManager.update();
  }
  
  // === 状態取得 ===
  getExpressionData(): ExpressionData {
    return {
      vrmIndex: this.vrmIndex,
      availableExpressions: this.availableExpressions,
      currentValues: this.getAllExpressionValues(),
      hasExpressions: this.hasExpressions
    };
  }
}
```

### EventBus統合設計
```typescript
// 表情関連イベント定義（events.ts拡張）
export interface ExpressionEvents {
  'expression:vrm-registered': {
    vrmIndex: number;
    expressionCount: number;
    availableExpressions: string[];
  };
  
  'expression:active-changed': {
    vrmIndex: number;
    expressionData: ExpressionData | null;
  };
  
  'expression:value-changed': {
    vrmIndex: number;
    expressionName: string;
    value: number;
    timestamp: number;
  };
  
  'expression:reset': {
    vrmIndex: number;
    resetType: 'single' | 'all';
  };
}
```

### メモリ最適化戦略
```typescript
class ExpressionMemoryManager {
  // === キャッシュ管理 ===
  private static readonly MAX_CACHE_SIZE = 5; // VRM最大数
  private static readonly EXPRESSION_VALUE_PRECISION = 0.01; // 精度制限
  
  // 値の精度制限でメモリ使用量削減
  static clampAndRound(value: number): number {
    return Math.round(
      Math.max(0, Math.min(1, value)) / this.EXPRESSION_VALUE_PRECISION
    ) * this.EXPRESSION_VALUE_PRECISION;
  }
  
  // 不要なVRMデータクリーンアップ
  static cleanupVRMData(vrmIndex: number): void {
    // ガベージコレクション促進
    // WeakMapベースのキャッシュクリア
  }
}
```

### 型安全性確保
```typescript
// 厳密な型定義
type ExpressionName = string;
type ExpressionValue = number; // 0.0-1.0
type VRMIndex = number; // 0-4

// 型ガード関数
function isValidExpressionValue(value: any): value is ExpressionValue {
  return typeof value === 'number' && value >= 0 && value <= 1;
}

function isValidVRMIndex(index: any): index is VRMIndex {
  return typeof index === 'number' && index >= 0 && index < 5;
}
```

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📌 CREATIVE PHASE END

**VERIFICATION**:
[x] Problem clearly defined
[x] Multiple options considered  
[x] Decision made with rationale
[x] Implementation guidance provided
[x] Type safety addressed
[x] Memory optimization considered
[x] EventBus integration designed 