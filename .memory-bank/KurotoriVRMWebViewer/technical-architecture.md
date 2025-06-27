# 技術仕様・アーキテクチャ

## 全体アーキテクチャ

### レイヤー構成
```
Presentation Layer (UI)
├── index.html (メインHTML)
├── src/style.css (スタイル定義)
└── components/ (UIコンポーネント)

Application Layer (ロジック)
├── src/main.ts (メインエントリポイント)
├── core/ (コア機能)
│   ├── VRMViewer.ts (VRMビューワー本体)
│   └── VRMBoneController.ts (ボーン制御)
└── utils/ (ユーティリティ)

Data Layer
├── types/ (TypeScript型定義)
└── public/samples/ (サンプルデータ)
```

## 主要クラス・モジュール設計

### VRMViewer (core/VRMViewer.ts)
- **責務**: VRMモデルの読み込み、表示、管理
- **主要メソッド**:
  - `loadVRM(file: File)`: VRMファイル読み込み
  - `addVRMToScene(vrm)`: シーンへのモデル追加
  - `selectModel(index)`: モデル選択・切替
  - `getMetadata(vrm)`: メタ情報取得
- **管理データ**: 読み込み済みVRMモデル配列、現在選択モデル

### VRMBoneController (core/VRMBoneController.ts)
- **責務**: ボーン操作、ポージング制御
- **実装予定機能**: TransformControls連携、IK制御

## VRMメタ情報処理

### バージョン検知ロジック
```typescript
// VRM0系の特徴的プロパティで判定
const isVRM0 = metadata.title !== undefined || 
               metadata.author !== undefined ||
               metadata.commercialUssageName !== undefined;
```

### メタ情報正規化
- **VRM0系**: `title` → `name`、`author` → `authors[]`に変換
- **VRM1系**: 既存構造を活用、詳細な利用制限情報も表示

## 3Dシーン構成

### three.js基本設定
- **Scene**: メインシーン
- **Camera**: PerspectiveCamera（FOV: 30, アスペクト比: 自動調整）
- **Renderer**: WebGLRenderer（アンチエイリアス有効）
- **Controls**: OrbitControls（カメラ操作）

### ライティング設定
- **DirectionalLight**: メインライト
- **AmbientLight**: 環境光

## UI設計

### メタ情報モーダル
- **表示内容**: 
  - 基本情報（名前、作者、バージョン）
  - サムネイル画像
  - ライセンス情報
  - VRM1系: 詳細な利用制限
- **操作**: ×ボタン、ESC、背景クリックで閉じる

### モデル一覧
- 読み込み済みモデルのリスト表示
- モデル名クリックで選択切替
- Infoボタンでメタ情報表示

## ファイル構成詳細

### 設定ファイル
- `package.json`: 依存関係、スクリプト定義
- `tsconfig.json`: TypeScript設定
- `vite.config.js`: Vite設定（予定）

### ドキュメント
- `Docs/Info.md`: 技術選定と実装方針
- `Docs/Todo.md`: タスク管理
- `README.md`: プロジェクト概要

## 開発ツール・環境

### 開発環境
- **OS**: Windows
- **エディタ**: Visual Studio Code
- **ブラウザ**: Chrome（Playwrightテスト）
- **ターミナル**: PowerShell

### 依存関係
- **three.js**: 0.177.0（3D描画エンジン）
- **@pixiv/three-vrm**: 3.4.1（VRM読み込み）
- **lil-gui**: 0.20.0（GUI制御）
- **three-viewport-gizmo**: 2.2.0（ビューポート操作）

### テスト環境
- **Playwright MCP**: ブラウザ自動テスト
- **サンプルファイル**: VRM0/VRM1両対応のテストデータ