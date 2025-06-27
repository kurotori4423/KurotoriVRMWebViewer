# WebGL VRMビューワー 実装計画書

## 1. 概要

本ドキュメントは、WebGLベースで動作するVRMビューワーの技術選定と実装方針を定めるものである。
最終的にはVRMを用いた以下の機能を実装する

- VRM0, VRM1系両方の読み込みに対応
- VRMのメタ情報の閲覧機能
- 複数体のVRM読み込み
- VRMAの読み込み、再生に対応
- VRMモデルのボーン操作によるポージングや位置調整、表情の設定ができる
- ポージングではIKを用いて手足を直感的に調整
- VRoidHubからのモデルインポート機能
- モバイルデバイスでも動作
- カメラ・ライトの位置や調整ができる。

## 2. 技術スタック

本ビューワーの開発には、以下のライブラリおよび技術を使用する。

| 目的 | 技術・ライブラリ | 選定理由 |
| --- | --- | --- |
| 3D描画 | [three.js](https://threejs.org/) | WebGLを高レベルで抽象化したデファクトスタンダードなライブラリ。シーン構築、カメラ、ライト、レンダリングを容易に実装できる。エコシステムも豊富。 |
| 3Dギズモ | [three.js (TransformControls)](https://threejs.org/docs/#examples/en/controls/TransformControls) | three.js公式の3Dオブジェクト操作ギズモ。回転・移動・拡大縮小に対応しており、ボーン操作に適している。 |
| VRMモデル読込 | [@pixiv/three-vrm](https://github.com/pixiv/three-vrm) | pixivが公式に開発・メンテナンスしているthree.js向けのVRMローダー。VRM0.xおよび1.0に対応しており、信頼性が高い。 |
| 開発環境 | [Vite](https.vitejs.dev/) | 高速な開発サーバーとビルド機能を提供。TypeScriptや最新のフロントエンド開発環境を容易にセットアップできる。 |
| 言語 | TypeScript | 静的型付けにより、開発時のエラーを削減し、コードの保守性を高めるため。 |
| GUI | [lil-gui](https://github.com/georgealways/lil-gui) | three.jsのサンプルでも利用されている軽量なGUIライブラリ。パラメータ調整やデバッグ用途に適している。 |
