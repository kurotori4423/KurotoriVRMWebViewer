# トラブルシューティング

## オレンジ色ワイヤーフレームの非表示化（解決済み）

### 問題
VRMモデル読み込み後に方向性ライトを選択すると、オレンジ色のワイヤーフレームボックスが表示されて見た目が良くない。

### 要件
- オレンジ色のワイヤーフレーム表示のみを非表示にする
- `directionalLightProxy`オブジェクト自体は残す（TransformControlsで必要）
- ライト操作機能は維持する

### 解決方法
`VRMViewer.ts`で以下の変更を実施：

1. **プロキシ作成時の可視性設定**（168行目）：
```typescript
this.directionalLightProxy.visible = false;
```

2. **enableDirectionalLightTransformでのプロキシ表示を無効化**（1798行目）：
```typescript
// this.setLightProxyVisible(true); // ワイヤーフレーム表示を無効化
```

### 技術的詳細
- `directionalLightProxy`は透明な状態でTransformControlsに使用される
- ギズモ（XYZ軸のリング）は正常に表示される
- ライトヘルパー（グレーの矢印）も正常に動作する
- ライトの回転操作機能は完全に保持される

### 検証結果
- ✅ オレンジ色ワイヤーフレームが非表示
- ✅ TransformControlsの回転ギズモが正常表示
- ✅ ライト操作機能が正常動作
- ✅ ライトヘルパーが正常表示
- ✅ モデルのライティングが正常

### 重要な注意点
- プロキシオブジェクトは削除しない（TransformControlsで必要）
- ワイヤーフレーム表示のみを無効化する
- ライト選択・操作機能は完全に保持する

この修正により、見た目をクリーンに保ちつつ、すべての機能を維持できています。