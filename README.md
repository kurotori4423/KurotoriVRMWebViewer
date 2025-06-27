# KurotoriVRMWebViewer

WebGLベースで動作するVRMビューワーです。

## 概要

このプロジェクトは、ブラウザ上でVRMモデルを表示・操作できるWebアプリケーションです。

### 主要機能（予定）

- VRM0/VRM1両対応の読み込み機能
- VRMのメタ情報表示
- 複数体のVRM読み込み
- VRMAアニメーション再生
- ボーン操作によるポージング
- IKを用いた直感的な手足調整
- VRoidHubからのインポート
- モバイル対応

## 技術スタック

- **3D描画**: three.js
- **VRM読込**: @pixiv/three-vrm
- **開発環境**: Vite + TypeScript
- **GUI**: lil-gui
- **3Dギズモ**: three.js TransformControls

## 開発状況

詳細な開発計画は `Docs/Todo.md` を参照してください。

## ライセンス

MIT License

## 開発者

KurotoriVRM Project
