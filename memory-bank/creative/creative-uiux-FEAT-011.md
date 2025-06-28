📌 CREATIVE PHASE START: VRM表情制御パネル UI/UX設計
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**タスク**: FEAT-011 VRM表情設定機能実装  
**日付**: 2025年6月28日  
**フェーズ**: UI/UX Design Creative Phase  
**スタイルガイド**: `memory-bank/style-guide.md` 適用済み  

---

## 1️⃣ PROBLEM

**Description**: 
選択中VRMモデルの表情制御機能をボーン操作セクション直下に統合し、表情名・スライダー・数値表示で直感的に操作できるUIを設計する。

**Requirements**:
- ✅ ボーン操作セクション直後への自然な統合
- ✅ 表情名 + スライダー(0.0-1.0) + 数値表示の組み合わせ
- ✅ 表情のないVRMでは「表情データなし」状態表示
- ✅ 選択モデル変更時の動的な表情リスト更新
- ✅ リアルタイム表情反映（スライダー操作即座反映）
- ✅ スタイルガイド完全準拠（modal-section統一）
- ✅ ダークモード自動対応
- ✅ レスポンシブ対応（モバイル・タブレット）

**Constraints**:
- 既存HTMLの`<div class="modal-section">`パターン必須
- サイドバー幅320px内での配置
- スクロールUI許可（表情数に関係なく表示）
- リアルタイム更新60FPS維持
- VRM表情API限定（`expressionManager.setValue()`）

---

## 2️⃣ OPTIONS

**Option A**: スタック縦並び型 - 表情名/スライダー/数値を縦に配置
**Option B**: インライン水平型 - 表情名・スライダー・数値を1行に配置
**Option C**: グリッド分割型 - 表情を複数列でグリッド表示

---

## 3️⃣ ANALYSIS

| Criterion | Option A | Option B | Option C |
|-----------|----------|----------|----------|
| 視認性 | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐ |
| 操作性 | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ |
| モバイル対応 | ⭐⭐⭐⭐⭐ | ⭐⭐ | ⭐⭐ |
| 既存統合 | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ |
| スケーラビリティ | ⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| 開発コスト | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ |

**Key Insights**:
- Option A: 既存のcontrol-groupパターンと完全マッチ、最高のモバイル互換性
- Option B: 1行配置で効率的だが、長い表情名での横幅制約問題
- Option C: 大量表情での効率性高いが、既存UIパターンから逸脱

**詳細分析**:
```
🔍 Option A: スタック縦並び型
┌─────────────────────────────────┐
│ 表情制御                       │
├─────────────────────────────────┤
│ [表情名 1]                      │
│ ████████████░░░░░ 0.65          │
│                                 │
│ [表情名 2]                      │  
│ ██████░░░░░░░░░░░ 0.40          │
│                                 │
│ [リセット]                      │
└─────────────────────────────────┘

📱 モバイル最適、表情名制限なし
⚡ 既存control-groupパターン完全マッチ
🎨 スタイルガイド自然統合
```

---

## 4️⃣ DECISION

**Selected**: Option A: スタック縦並び型
**Rationale**: 
既存のcontrol-groupパターンとの完全一致、最高のモバイル互換性、表情名の制限なし、開発コストの最小化を実現。320px幅制約下で最も自然で拡張性の高いソリューション。

---

## 5️⃣ IMPLEMENTATION NOTES

### HTML構造設計
```html
<!-- 表情制御セクション -->
<div class="modal-section">
  <div class="modal-header">
    <h3>表情設定</h3>
  </div>
  <div class="modal-body">
    <div id="expression-controls-container">
      <!-- 動的生成エリア -->
      <div class="control-group" data-expression="happy">
        <label class="expression-label">Happy</label>
        <input type="range" class="expression-slider" 
               min="0" max="1" step="0.01" value="0" />
        <span class="expression-value">0.00</span>
      </div>
      <!-- 表情数分繰り返し -->
    </div>
    
    <div class="control-group">
      <button id="reset-all-expressions" class="control-btn">表情リセット</button>
    </div>
    
    <!-- 表情なし状態 -->
    <div id="no-expressions-message" class="no-expressions" style="display: none;">
      <p>表情データがありません</p>
    </div>
  </div>
</div>
```

### CSS実装ガイドライン
```css
/* スタイルガイド準拠 */
.expression-label {
  font-weight: 600;
  margin-bottom: 5px;
  display: block;
  font-size: 0.95em;
}

.expression-slider {
  width: 100%;
  margin: 5px 0;
  /* style-guide.mdのレンジ入力スタイル適用 */
}

.expression-value {
  font-size: 0.9em;
  color: #666;
  float: right;
  margin-top: -20px;
  background: rgba(255,255,255,0.9);
  padding: 2px 6px;
  border-radius: 3px;
}

.no-expressions {
  text-align: center;
  color: #999;
  font-style: italic;
  padding: 20px;
}

/* ダークモード自動対応 */
@media (prefers-color-scheme: dark) {
  .expression-value {
    color: #ccc;
    background: rgba(26,26,26,0.9);
  }
  .no-expressions {
    color: #666;
  }
}
```

### JavaScript機能設計
```typescript
interface ExpressionControlConfig {
  name: string;      // 表情名
  value: number;     // 現在値 (0.0-1.0)
  element: HTMLElement; // DOM要素参照
}

class ExpressionControlPanel {
  // 動的表情リスト生成
  generateExpressionControls(vrmIndex: number): void
  
  // スライダー変更イベント処理
  handleSliderChange(expressionName: string, value: number): void
  
  // 表情リセット機能
  resetAllExpressions(): void
  
  // モデル変更時UI更新
  updateForSelectedModel(vrmIndex: number): void
}
```

### レスポンシブ対応
```css
/* モバイル最適化 */
@media (max-width: 480px) {
  .expression-label {
    font-size: 0.9em;
  }
  
  .expression-value {
    position: static;
    float: none;
    display: block;
    margin-top: 2px;
    text-align: right;
  }
}
```

### 統合ポイント
- **配置**: ボーン操作セクション直後 (main.ts line 189 after)
- **イベント設定**: `setupExpressionControlHandlers(vrmViewer)` 新規作成
- **管理クラス**: `VRMExpressionController` 作成・統合

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📌 CREATIVE PHASE END

**VERIFICATION**:
[x] Problem clearly defined
[x] Multiple options considered  
[x] Decision made with rationale
[x] Implementation guidance provided
[x] Style guide compliance verified
[x] Responsive design addressed 