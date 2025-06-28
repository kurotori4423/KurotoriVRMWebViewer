# 🎨 CREATIVE PHASE: UI/UX DESIGN - FEAT-012

**作成日時**: 2025年6月28日 19:40:54  
**タスク**: FEAT-012 - 選択中モデル設定UI再設計・タブ機能実装  
**フェーズ**: UI/UX Design Creative Phase  
**Style Guide**: `memory-bank/style-guide.md` 完全適用

---

## 📋 PROBLEM STATEMENT

**現在の問題**:
- 選択中モデル設定モーダルが縦長・単一構造で操作性が悪い
- 機能が混在し論理的な分離がない（基本操作・ポーズ・表情）
- 常用ボタンがスクロールエリア内に埋もれている
- スマートフォンでの操作性が劣悪

**設計目標**:
- 4つの常時表示ボタン（アイコン付き）の最適配置
- 「基本」「ポーズ」「表情」の3タブによる論理的機能分離
- 既存glassmorphismデザインシステムとの完全統合
- レスポンシブ対応・アクセシビリティ確保
- 全削除ボタンのメイン設定ウィンドウへの移動

**制約条件**:
- 既存 `.modal-section` パターン必須準拠
- 右下モーダル幅320px内での実装
- VRMビューアー特有のリアルタイム操作要件
- 60FPS維持・API制約内実装

---

## 🔍 OPTIONS ANALYSIS

### Option A: タブ最上部配置型（推奨採用）
**Description**: 常時表示ボタン下にタブエリアを配置し、選択タブのコンテンツを表示

**視覚設計**:
```
┌─────────────────────────────────────────┐
│ 選択中モデル設定                    × │
├─────────────────────────────────────────┤
│ [🔄] [📍] [👁] [🗑]  ← 常時表示4ボタン │ 
├─────────────────────────────────────────┤
│ 【基本】【ポーズ】【表情】 ← タブエリア │
├─────────────────────────────────────────┤
│                                         │
│      選択されたタブのコンテンツ         │
│      • 基本: ルート操作・スケール      │
│      • ポーズ: ボーン操作・リセット    │
│      • 表情: 表情スライダー群          │
│                                         │
└─────────────────────────────────────────┘
```

**Pros**:
- ✅ 論理的機能分離・直感的操作フロー
- ✅ 既存Style Guide完全準拠可能
- ✅ アクセシビリティ・キーボードナビゲーション対応
- ✅ レスポンシブ対応容易（タブボタンサイズ調整）
- ✅ 将来タブ追加時の拡張性良好

**Cons**:
- ❌ モーダル縦幅が増加（約50px）
- ❌ 実装コスト中程度（HTML・CSS・JS変更必要）

**Complexity**: Medium  
**Implementation Time**: 8-10時間  
**Style Guide Compliance**: ★★★★★

### Option B: サイドタブ配置型
**Description**: 左側に縦並びタブ、右側にコンテンツエリアを配置

**視覚設計**:
```
┌─────────────────────────────────────────┐
│ 選択中モデル設定                    × │
├─────────────────────────────────────────┤
│ [🔄] [📍] [👁] [🗑]  ← 常時表示4ボタン │ 
├───┬─────────────────────────────────────┤
│基本│                                     │
│ポ │      タブコンテンツエリア           │
│｜ │      スクロール可能               │  
│ズ │                                     │
│表情│                                     │
└───┴─────────────────────────────────────┘
```

**Pros**:
- ✅ モーダル縦幅増加を最小限に抑制
- ✅ 縦方向スペース効率良好

**Cons**:
- ❌ 320px幅制約でタブ文字が制限される
- ❌ 小画面（480px以下）で操作困難
- ❌ 既存UI パターンから大幅逸脱
- ❌ 実装コスト高（グリッドレイアウト新規実装）

**Complexity**: High  
**Implementation Time**: 12-15時間  
**Style Guide Compliance**: ★★

### Option C: 統合ボタン型（タブなし）
**Description**: 常時表示ボタンと機能切替ボタンを同列に配置

**視覚設計**:
```
┌─────────────────────────────────────────┐
│ 選択中モデル設定                    × │
├─────────────────────────────────────────┤
│ [🔄] [📍] [👁] [🗑] [基本] [ポーズ] [表情] │ 
├─────────────────────────────────────────┤
│                                         │
│     選択された機能のコンテンツ          │
│     機能切替時に表示内容変更           │
│                                         │
└─────────────────────────────────────────┘
```

**Pros**:
- ✅ UI構造が非常にシンプル
- ✅ 実装コスト最小
- ✅ モーダル縦幅変更なし

**Cons**:
- ❌ 7個ボタン密集で操作性悪化
- ❌ 常時ボタンと機能選択の視覚的分離不明確
- ❌ アクセシビリティ低下（スクリーンリーダー混乱）
- ❌ レスポンシブ対応困難（ボタン多すぎ）

**Complexity**: Low  
**Implementation Time**: 4-6時間  
**Style Guide Compliance**: ★★★

---

## 🎯 DECISION: Option A - タブ最上部配置型

### 💡 **決定根拠**

**ユーザビリティ最優先**: 明確な機能分離により操作効率が大幅向上  
**Design System統一**: 既存glassmorphismパターンとの完璧な統合  
**アクセシビリティ**: WAI-ARIAタブパターン準拠でスクリーンリーダー対応  
**将来拡張性**: タブシステムとして新機能追加が容易

### 🎨 **詳細Visual Design仕様**

#### A. 常時表示ボタンエリア
**HTML構造**:
```html
<div class="action-buttons">
  <button class="icon-button" id="reset-model">
    <svg class="button-icon"><!-- replay.svg --></svg>
    <span class="button-label">リセット</span>
  </button>
  <button class="icon-button" id="focus-model">
    <svg class="button-icon"><!-- frame_person.svg --></svg>
    <span class="button-label">フォーカス</span>
  </button>
  <button class="icon-button toggle-visibility" id="toggle-visibility">
    <svg class="button-icon"><!-- visibility.svg/visibility_off.svg --></svg>
    <span class="button-label">表示</span>
  </button>
  <button class="icon-button danger" id="delete-model">
    <svg class="button-icon"><!-- delete.svg --></svg>
    <span class="button-label">削除</span>
  </button>
</div>
```

**CSS実装**:
```css
.action-buttons {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
  margin-bottom: 15px;
  padding: 15px;
  border-bottom: 1px solid var(--border-light);
}

.icon-button {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 8px 4px;
  border: 1px solid var(--border-light);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.1);
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 12px;
}

.icon-button:hover {
  background: rgba(100, 108, 255, 0.1);
  border-color: #646cff;
  transform: translateY(-1px);
}

.button-icon {
  width: 20px;
  height: 20px;
  fill: currentColor;
}

.button-label {
  font-weight: 500;
  white-space: nowrap;
}
```

#### B. タブエリア設計
**HTML構造**:
```html
<div class="tab-container">
  <div class="tab-buttons" role="tablist">
    <button class="tab-button active" role="tab" data-tab="basic">基本</button>
    <button class="tab-button" role="tab" data-tab="pose">ポーズ</button>
    <button class="tab-button" role="tab" data-tab="expression">表情</button>
  </div>
  <div class="tab-content">
    <div class="tab-panel active" id="basic-panel" role="tabpanel">
      <!-- 基本タブコンテンツ -->
    </div>
    <div class="tab-panel" id="pose-panel" role="tabpanel">
      <!-- ポーズタブコンテンツ -->
    </div>
    <div class="tab-panel" id="expression-panel" role="tabpanel">
      <!-- 表情タブコンテンツ -->
    </div>
  </div>
</div>
```

**CSS実装**:
```css
.tab-buttons {
  display: flex;
  border-bottom: 2px solid var(--border-light);
  margin-bottom: 15px;
}

.tab-button {
  flex: 1;
  padding: 12px 8px;
  border: none;
  background: transparent;
  cursor: pointer;
  font-weight: 500;
  font-size: 14px;
  transition: all 0.2s ease;
  border-bottom: 2px solid transparent;
}

.tab-button:hover {
  background: rgba(100, 108, 255, 0.1);
}

.tab-button.active {
  border-bottom-color: #646cff;
  color: #646cff;
  background: rgba(100, 108, 255, 0.05);
}

.tab-panel {
  display: none;
}

.tab-panel.active {
  display: block;
}
```

#### C. レスポンシブ対応
```css
/* タブレット (768px以下) */
@media (max-width: 768px) {
  .action-buttons {
    grid-template-columns: repeat(2, 1fr);
    gap: 6px;
  }
  
  .tab-button {
    font-size: 13px;
    padding: 10px 6px;
  }
  
  .icon-button {
    padding: 6px 2px;
    font-size: 11px;
  }
  
  .button-icon {
    width: 18px;
    height: 18px;
  }
}

/* スマートフォン (480px以下) */
@media (max-width: 480px) {
  .action-buttons {
    grid-template-columns: repeat(2, 1fr);
    gap: 4px;
    padding: 10px;
  }
  
  .tab-button {
    font-size: 12px;
    padding: 8px 4px;
  }
  
  .button-label {
    font-size: 10px;
  }
}
```

#### D. ダークモード対応
```css
@media (prefers-color-scheme: dark) {
  .action-buttons {
    border-bottom-color: var(--border-dark);
  }
  
  .icon-button {
    background: rgba(255, 255, 255, 0.1);
    border-color: var(--border-dark);
    color: #ffffff;
  }
  
  .icon-button:hover {
    background: rgba(100, 108, 255, 0.2);
    border-color: #646cff;
  }
  
  .tab-buttons {
    border-bottom-color: var(--border-dark);
  }
  
  .tab-button {
    color: #ffffff;
  }
  
  .tab-button:hover {
    background: rgba(100, 108, 255, 0.2);
  }
}
```

### 🔧 **特殊機能要件**

#### タブ連動動作仕様
1. **「基本」タブ選択時**:
   - `vrmViewer.setBoneVisibility(false)` 自動実行
   - `vrmViewer.setRootTransformVisible(true)` ルート操作モード有効
   - ルート操作（移動・回転）とスケール設定表示

2. **「ポーズ」タブ選択時**:
   - `vrmViewer.setBoneVisibility(true)` 自動実行
   - `vrmViewer.setRootTransformVisible(false)` ルート操作モード解除
   - ボーン操作設定とリセット機能表示

3. **「表情」タブ選択時**:
   - ボーン表示状態維持（変更なし）
   - 表情制御機能のみ表示（FEAT-011実装済み）

#### アイコン動的切替仕様
```typescript
// 表示切替ボタンのアイコン動的変更
function updateVisibilityIcon(isVisible: boolean): void {
  const button = document.getElementById('toggle-visibility');
  const icon = button?.querySelector('.button-icon');
  const label = button?.querySelector('.button-label');
  
  if (icon && label) {
    icon.innerHTML = isVisible ? getVisibilityIcon() : getVisibilityOffIcon();
    label.textContent = isVisible ? '非表示' : '表示';
  }
}
```

---

## ✅ **UI/UX DESIGN VERIFICATION**

- [x] **Style Guide完全準拠**: `memory-bank/style-guide.md` 適用済み
- [x] **ユーザビリティ**: 直感的タブナビゲーション・機能分離明確
- [x] **アクセシビリティ**: WAI-ARIA role準拠・キーボードナビゲーション対応
- [x] **レスポンシブ**: 320px→768px→480px 3段階ブレークポイント対応
- [x] **一貫性**: 既存`.modal-section`・`.control-group`パターン継承
- [x] **拡張性**: 将来的なタブ追加・機能拡張に対応
- [x] **ダークモード**: 自動対応・視認性確保

---

## 🎨 CREATIVE CHECKPOINT: UI/UX設計決定完了

**採用決定**: Option A - タブ最上部配置型  
**Key Features**: 4常時ボタン + 3タブ構造 + レスポンシブ対応  
**Style Integration**: glassmorphism完全準拠  
**Next Phase**: アーキテクチャ設計フェーズ

---

*🎨🎨🎨 UI/UX CREATIVE PHASE COMPLETE 🎨🎨🎨* 