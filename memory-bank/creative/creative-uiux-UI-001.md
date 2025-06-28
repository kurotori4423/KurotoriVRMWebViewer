# 🎨 CREATIVE PHASE: UI/UX DESIGN - UI-001

**作成日時**: 2025年06月28日 17:25:49  
**タスク**: UI-001 - ギズモワールド・ローカル切替トグルのツールバー移行  
**フェーズ**: UI/UX Design Creative Phase

---

## 📋 PROBLEM STATEMENT

**現在の問題**:
- ギズモのワールド・ローカル切替が選択中モデル設定モーダル内に隠されている
- ルート操作・ボーン操作で2箇所に分散配置
- ギズモ操作中に座標系を切り替えるためにモーダルを開く必要がある
- 直感的でない操作フロー

**設計目標**:
- 画面上部に常時アクセス可能なツールバー領域を作成
- ワールド・ローカル切替を統合した単一のコンポーネントとして配置
- 将来のギズモ機能拡張に対応できる基盤構築
- 既存UIとの統一感保持

---

## 🔍 OPTIONS ANALYSIS

### Option 1: 薄型固定ツールバー（推奨）
**Description**: 画面上部に薄型のglassmorphism風ツールバーを固定配置

**視覚的デザイン**:
```
┌─────────────────────────────────────────────────┐
│    🌐 座標系: (○) ワールド ( ) ローカル     ⚙️    │
└─────────────────────────────────────────────────┘
```

**Pros**:
- 常時アクセス可能
- 既存デザインシステムとの統一感
- レスポンシブ対応しやすい
- z-index競合リスク低

**Cons**:
- 画面上部スペースを専有
- 小画面では要素が密集

**Complexity**: Low  
**Implementation Time**: 2-3時間

### Option 2: フローティングツールバー
**Description**: 3Dビューポート内にフローティングで配置

**視覚的デザイン**:
```
      🔘 座標系切替パネル
      ┌─────────────────┐
      │ ○ ワールド       │
      │ ○ ローカル       │
      └─────────────────┘
```

**Pros**:
- 3D操作エリア内で完結
- ドラッグ移動可能

**Cons**:
- 3Dコンテンツと重複リスク
- モバイル操作性悪い
- z-index管理複雑

**Complexity**: Medium  
**Implementation Time**: 4-5時間

### Option 3: 既存サイドバー統合
**Description**: 左サイドバーに座標系切替セクションを追加

**視覚的デザイン**:
```
┌─────────────────┐
│ KurotoriVRM ... │
│ =============== │
│ 🔧 ギズモ設定   │
│ 座標系：ワールド │
│ =============== │
│ VRMファイル読込 │
└─────────────────┘
```

**Pros**:
- 実装コスト最小
- 既存UI変更不要

**Cons**:
- ギズモ操作時にサイドバーにアクセス必要
- 操作フロー改善されない
- 将来拡張性低い

**Complexity**: Low  
**Implementation Time**: 1-2時間

---

## 🎯 DECISION: Option 1 - 薄型固定ツールバー

**選定理由**:
1. **ユーザビリティ最優先**: 常時アクセス可能で操作効率大幅向上
2. **デザイン統一性**: 既存glassmorphismスタイルと完全統合
3. **将来拡張性**: ツールバー基盤として追加機能実装容易
4. **実装バランス**: 適度な実装コストで最大効果

---

## 🎨 VISUAL DESIGN SPECIFICATION

### カラーパレット（既存システム準拠）
```css
/* ツールバー基本色 */
--toolbar-bg-light: rgba(255, 255, 255, 0.95);
--toolbar-bg-dark: rgba(26, 26, 26, 0.95);
--toolbar-border-light: rgba(255, 255, 255, 0.2);
--toolbar-border-dark: rgba(255, 255, 255, 0.1);

/* コントロール色 */
--control-active: #646cff;
--control-inactive: #6c757d;
--control-hover: #535bf2;
```

### レイアウト仕様
```css
#top-toolbar {
  position: fixed;
  top: 20px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 1200; /* サイドバー(1000)より上、詳細ウィンドウ(1500)より下 */
  
  /* Glassmorphism */
  background: var(--toolbar-bg-light);
  backdrop-filter: blur(10px);
  border-radius: 12px;
  border: 1px solid var(--toolbar-border-light);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
  
  /* Layout */
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 12px 20px;
  min-height: 48px;
  font-family: system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;
  font-size: 14px;
  font-weight: 500;
}
```

### コンポーネント詳細設計

#### 1. ツールバーラベル
```html
<span class="toolbar-label">
  🌐 座標系:
</span>
```

#### 2. ワールド・ローカル切替
```html
<div class="coordinate-space-toggle">
  <label class="toggle-option">
    <input type="radio" name="coordinate-space-global" value="world" checked>
    <span class="toggle-text">ワールド</span>
  </label>
  <label class="toggle-option">
    <input type="radio" name="coordinate-space-global" value="local">
    <span class="toggle-text">ローカル</span>
  </label>
</div>
```

#### 3. 将来拡張エリア
```html
<div class="toolbar-actions">
  <!-- 将来のギズモ機能（移動/回転/スケール切替など）がここに追加される -->
</div>
```

### レスポンシブデザイン
```css
/* タブレット (768px以下) */
@media (max-width: 768px) {
  #top-toolbar {
    left: 20px;
    right: 20px;
    transform: none;
    width: calc(100% - 40px);
    font-size: 13px;
    padding: 10px 16px;
  }
}

/* スマートフォン (480px以下) */
@media (max-width: 480px) {
  #top-toolbar {
    left: 10px;
    right: 10px;
    width: calc(100% - 20px);
    gap: 12px;
    padding: 8px 12px;
    font-size: 12px;
  }
  
  .toolbar-label {
    display: none; /* ラベル非表示でスペース確保 */
  }
}
```

---

## 💡 UX INTERACTION DESIGN

### 状態管理
1. **Global State**: 統一された座標系状態
2. **Controller Integration**: VRMRootController・VRMBoneController連携
3. **Event Broadcasting**: 状態変更時の全関連コンポーネント更新

### インタラクション フロー
```
ユーザーがツールバーの座標系を変更
    ↓
グローバル状態更新
    ↓
active TransformControls に座標系適用
    ↓
視覚的フィードバック (アクティブ状態表示)
    ↓
操作継続可能
```

### アニメーション仕様
- **出現**: `opacity: 0 → 1` (0.3s ease)
- **ホバー**: `transform: scale(1.02)` (0.2s ease)
- **状態変更**: `background-color` transition (0.2s ease)

---

## 🔧 IMPLEMENTATION PLAN

### Phase 1: HTML構造作成
1. `index.html` にツールバー要素追加
2. 既存構造への影響確認
3. semantic HTML実装

### Phase 2: CSS スタイリング
1. `src/style.css` にツールバースタイル追加
2. レスポンシブ対応
3. ダークモード対応
4. z-index階層調整

### Phase 3: JavaScript機能統合
1. 座標系切替イベントハンドラー作成
2. VRMRootController・VRMBoneController統合
3. グローバル状態管理実装
4. 既存モーダル内切替の削除

### Phase 4: テスト・最適化
1. 全デバイス動作確認
2. 既存機能への影響確認
3. パフォーマンス最適化

---

## 📊 SUCCESS CRITERIA

### 機能要件
- ✅ ワールド・ローカル切替がツールバーで操作可能
- ✅ ルート・ボーン操作両方に統一的に適用
- ✅ 既存機能への影響なし
- ✅ レスポンシブ対応

### UX要件
- ✅ 3クリック以内でのアクセス → 1クリック
- ✅ ギズモ操作中の座標系変更が即座に可能
- ✅ 視覚的に分かりやすい状態表示
- ✅ モバイル・タブレットで操作可能

### デザイン要件
- ✅ 既存UIとの統一感
- ✅ glassmorphismデザインシステム準拠  
- ✅ ダークモード完全対応
- ✅ アクセシビリティ考慮

---

## 🎨 CREATIVE CHECKPOINT: DESIGN DECISION COMPLETE

**決定事項**:
1. 薄型固定ツールバー採用
2. Glassmorphismデザイン言語継承
3. 統一された座標系制御実装
4. 段階的実装アプローチ

**Next Step**: IMPLEMENT フェーズへの移行準備完了

---

🎨🎨🎨 EXITING CREATIVE PHASE - DESIGN DECISIONS MADE 🎨🎨🎨 