# 🎨 KurotoriVRMWebViewer スタイルガイド

**作成日**: 2025年6月28日  
**目的**: VRM表情制御パネル統合用スタイル標準  
**基準**: 既存プロジェクトスタイル分析結果

---

## 🎨 カラーパレット

### プライマリカラー
```css
/* 背景・ベース */
--primary-bg-light: rgba(255, 255, 255, 0.95)
--primary-bg-dark: rgba(26, 26, 26, 0.95)

/* キャンバス背景（グラデーション） */
--canvas-gradient: linear-gradient(135deg, #667eea 0%, #764ba2 100%)

/* テキスト */
--text-primary-light: #213547
--text-primary-dark: #ffffff
--text-secondary-light: #333333
--text-secondary-dark: #ffffff

/* ボーダー・アウトライン */
--border-light: rgba(255, 255, 255, 0.2)
--border-dark: rgba(255, 255, 255, 0.1)
```

### アクセント・ステータスカラー
```css
/* コントロール要素 */
--control-accent: #667eea
--danger-color: #dc3545
--success-color: #28a745

/* ホバー・アクティブ状態 */
--hover-bg-light: rgba(0, 0, 0, 0.1)
--hover-bg-dark: rgba(255, 255, 255, 0.1)
```

## 🔧 タイポグラフィ

### フォントファミリー
```css
font-family: system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
```

### フォントサイズ
```css
/* ヘッダー */
--font-size-h1: 1.5em  /* サイドバータイトル */
--font-size-h2: 1.5em  /* モーダルタイトル */
--font-size-h3: 1.17em /* セクションタイトル */

/* 本文・コントロール */
--font-size-body: 1em
--font-size-small: 0.9em
--font-size-note: 0.8em
```

### フォントウェイト
```css
--font-weight-normal: 400
--font-weight-semibold: 600
```

## 📐 スペーシング・レイアウト

### 基本単位
```css
/* 基本スペーシング */
--spacing-xs: 5px
--spacing-sm: 10px
--spacing-md: 15px
--spacing-lg: 20px
--spacing-xl: 30px

/* マージン・パディング */
--section-padding: 20px
--control-group-spacing: 15px
--element-margin: 20px
```

### ボーダー半径
```css
/* 標準 */
--border-radius-standard: 12px
--border-radius-modal: 16px
--border-radius-button: 4px

/* 特殊 */
--border-radius-circle: 50%
```

## 💫 エフェクト・シャドウ

### グラスモーフィズム
```css
/* サイドバー・モーダル */
backdrop-filter: blur(10px);
background: rgba(255, 255, 255, 0.95); /* or dark variant */

/* ボックスシャドウ */
--shadow-light: 0 8px 32px rgba(0, 0, 0, 0.1)
--shadow-dark: 0 8px 32px rgba(0, 0, 0, 0.3)
--shadow-modal: 0 20px 60px rgba(0, 0, 0, 0.3)
```

### ボーダー
```css
border: 1px solid rgba(255, 255, 255, 0.2); /* light */
border: 1px solid rgba(255, 255, 255, 0.1); /* dark */
```

## 🎛️ コンポーネントパターン

### モーダルセクション (.modal-section)
```css
.modal-section {
  margin-bottom: var(--spacing-lg);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--spacing-lg);
  padding-bottom: var(--spacing-md);
  border-bottom: 1px solid var(--border-light);
}

.modal-body {
  /* セクション内容エリア */
}
```

### コントロールグループ (.control-group)
```css
.control-group {
  margin-bottom: var(--spacing-md);
  display: flex;
  gap: var(--spacing-sm);
  align-items: center;
}
```

### ボタン (.control-btn)
```css
.control-btn {
  background: #f0f0f0;
  border: 1px solid #ddd;
  border-radius: var(--border-radius-button);
  padding: 8px 16px;
  cursor: pointer;
  font-size: var(--font-size-body);
  transition: all 0.2s ease;
}

.control-btn:hover {
  background: #e0e0e0;
}

.control-btn.danger-btn {
  background: var(--danger-color);
  color: white;
}
```

### スライダー・レンジ入力
```css
input[type="range"] {
  width: 100%;
  margin: var(--spacing-xs) 0;
  -webkit-appearance: none;
  background: transparent;
  outline: none;
}

input[type="range"]::-webkit-slider-track {
  background: #ddd;
  height: 4px;
  border-radius: 2px;
}

input[type="range"]::-webkit-slider-thumb {
  -webkit-appearance: none;
  background: var(--control-accent);
  height: 16px;
  width: 16px;
  border-radius: 50%;
  cursor: pointer;
}
```

## 📱 レスポンシブブレイクポイント

```css
/* モバイル */
@media (max-width: 480px) {
  --section-padding: 15px;
  --font-size-h1: 1.3em;
}

/* タブレット */
@media (max-width: 768px) {
  --section-padding: 18px;
}
```

## 🌙 ダークモード対応

**自動対応**: `@media (prefers-color-scheme: dark)` メディアクエリを必須使用

```css
@media (prefers-color-scheme: dark) {
  /* ダークモード時の色彩・背景 */
  background: var(--primary-bg-dark);
  color: var(--text-primary-dark);
  border-color: var(--border-dark);
}
```

## ⚡ アニメーション・トランジション

### 標準トランジション
```css
transition: all 0.2s ease;        /* ボタン・ホバー */
transition: opacity 0.3s ease;    /* モーダル表示 */
transition: transform 0.3s ease;  /* スケール変更 */
```

### フェードイン・アウト
```css
.fade-in {
  opacity: 1;
  transition: opacity 0.3s ease;
}

.fade-out {
  opacity: 0;
  pointer-events: none;
}
```

---

## 🎯 表情制御パネル適用ガイドライン

### 必須準拠項目
1. **セクション構造**: `.modal-section` > `.modal-header` + `.modal-body`
2. **コントロール配置**: `.control-group` でまとめる
3. **スライダー設計**: 上記レンジ入力スタイル準拠
4. **ダークモード**: 全要素で自動対応必須
5. **レスポンシブ**: モバイル・タブレット対応

### 推奨UI要素
- **表情名ラベル**: `font-weight: 600`, `margin-bottom: 5px`
- **数値表示**: `font-size: 0.9em`, `color: secondary-text`
- **リセットボタン**: `control-btn` クラス使用
- **無効状態**: `opacity: 0.6`, `pointer-events: none` 