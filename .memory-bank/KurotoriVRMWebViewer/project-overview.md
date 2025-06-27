# KurotoriVRMWebViewer プロジェクト概要

## プロジェクト基本情報
- **プロジェクト名**: KurotoriVRMWebViewer
- **作成日**: 2025年6月27日
- **プロジェクトタイプ**: WebGLベースのVRMビューワー
- **言語**: TypeScript
- **主要フレームワーク**: Vite + three.js

## 概要
WebGLベースで動作するVRMビューワーアプリケーション。ブラウザ上でVRMモデルを表示・操作可能な高機能なWebアプリケーションです。

## 主要機能（計画）
- VRM0/VRM1両対応の読み込み機能
- VRMのメタ情報表示
- 複数体のVRM読み込み
- VRMAアニメーション再生
- ボーン操作によるポージング
- IKを用いた直感的な手足調整
- VRoidHubからのインポート
- モバイルデバイス対応
- カメラ・ライト位置調整

## 技術スタック
| 目的 | 技術・ライブラリ | バージョン |
|------|-----------------|-----------|
| 3D描画 | three.js | ^0.177.0 |
| VRMモデル読込 | @pixiv/three-vrm | ^3.4.1 |
| 開発環境 | Vite | ^7.0.0 |
| 言語 | TypeScript | ~5.8.3 |
| GUI | lil-gui | ^0.20.0 |
| 3Dギズモ | three-viewport-gizmo | ^2.2.0 |

## 開発環境
- **OS**: Windows
- **エディタ**: Visual Studio Code
- **ターミナル**: PowerShell
- **パッケージマネージャ**: npm

## プロジェクト構造
```
KurotoriVRMWebViewer/
├── index.html
├── package.json
├── README.md
├── tsconfig.json
├── Docs/
│   ├── Info.md          # 技術仕様書
│   └── Todo.md          # 実装タスク管理
├── public/
│   ├── assets/icons/
│   └── samples/         # サンプルVRMファイル
└── src/
    ├── main.ts
    ├── style.css
    ├── components/      # UIコンポーネント
    ├── core/           # VRMビューワー核機能
    ├── types/          # TypeScript型定義
    └── utils/          # ユーティリティ関数
```

## 開発方針
- シンプルな機能から段階的に実装
- 機能ごとにファイル分割
- 適切な変数名・関数名の使用
- コメントによる意図・動作説明
- Playwright MCPでのブラウザテスト重視
- 実装後の動作確認必須