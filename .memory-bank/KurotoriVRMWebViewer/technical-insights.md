# 開発メモ・技術的知見・重要な実装記録

## UI設計・アーキテクチャの進化

### フェーズ2.4: UI整理・改善の背景と成果
**問題**: 左サイドバーのUIが縦に長くなりすぎて画面に収まらない
**解決策**: モーダルウィンドウとコンテキスト別ウィンドウの導入

#### 新UI設計の成果
1. **左サイドバー**: 基本機能のみ常時表示（VRM読み込み、モデル一覧、ライト・背景設定）
2. **中央モーダル**: VRM読み込み関連機能の統合（ファイル選択、ドラッグ&ドロップ、サンプル）
3. **右下ウィンドウ**: 選択モデル操作（スケール、フォーカス、非表示、削除）

**技術的効果**: 画面有効活用、機能別コンテキスト分離、将来的拡張対応、認知負荷軽減

## VRMメタ情報処理の技術的課題と解決

### VRM0/VRM1バージョン検知の重要な知見
**課題**: VRM0とVRM1でメタ情報構造が大きく異なる
**解決**: 特徴的プロパティによる優先順位付きバージョン検知

#### 正しいバージョン検知ロジック
```typescript
// VRM0系の特徴的プロパティを優先チェック
if (vrmMeta?.title !== undefined || 
    vrmMeta?.author !== undefined || 
    vrmMeta?.commercialUssageName !== undefined) {
  // VRM0として処理
} else if (vrmMeta?.metaVersion !== undefined ||
           vrmMeta?.authors || vrmMeta?.commercialUsage !== undefined) {
  // VRM1として処理
}
```

#### メタ情報正規化の重要性
- **VRM0**: `{title → name, author → authors[], commercialUssageName, allowedUserName}`
- **VRM1**: `{name, authors[], metaVersion, commercialUsage, modification, licenseUrl}`
- **統一**: 正規化レイヤーでUI層での分岐を最小化

### Three-VRMの正式メタ情報取得方式
**重要**: `vrm.meta`ではなく`gltf.userData.vrmMeta`が正式な取得方法
```typescript
// ✅ 正しい方式
const vrmMeta = gltf.userData.vrmMeta;
(vrm as any).vrmMeta = vrmMeta; // 後からアクセス可能にする

// ❌ 間違った方式
const meta = vrm.meta; // 不完全な情報
```

## TransformControlsの実装ベストプラクティス

### 重要な教訓（フェーズ3.2ライト調整機能実装）
TransformControlsとプロキシオブジェクトによる3D操作で重要な技術的知見を獲得

#### ❌ 間違った実装パターン
1. **初期状態管理の誤り**: enable時に一度だけ初期状態保存
2. **現在状態からの計算**: changeイベントで毎回現在の状態から差分計算
3. **過敏な反応**: 全changeイベントでの処理実行

#### ✅ 正しい実装パターン
1. **ドラッグ開始時の初期状態保存**:
```typescript
this.lightTransformControls.addEventListener('dragging-changed', (event) => {
  isDragging = event.value as boolean;
  if (isDragging && this.directionalLightProxy) {
    // ✅ ドラッグ開始時に初期状態を保存
    this.proxyInitialQuaternion = this.directionalLightProxy.quaternion.clone();
    this.lightInitialDirection = new THREE.Vector3()
      .subVectors(this.directionalLight.target.position, this.directionalLight.position)
      .normalize();
  }
});
```

2. **保存された初期状態からの差分計算**:
```typescript
this.lightTransformControls.addEventListener('change', () => {
  if (!isDragging) return; // ✅ ドラッグ中のみ処理
  
  // ✅ 保存された初期状態から差分を計算
  const deltaQuaternion = currentQuaternion.clone().multiply(initialQuaternion.clone().invert());
  const newDirection = this.lightInitialDirection.clone().applyQuaternion(deltaQuaternion);
});
```

#### 技術的重要ポイント
- **プロキシオブジェクト**: ワイヤーフレーム表示で操作対象を視覚化
- **状態管理**: 適切なタイミングでの初期状態クリア
- **数値計算**: Math.acosの範囲外エラー防止と微小変化の無視
- **OrbitControls統合**: TransformControls使用時の適切な制御無効化

### フェーズ4ボーン操作への応用方針
```typescript
// 複数ボーンの管理
private boneProxies: Map<string, THREE.Mesh> = new Map();
private boneInitialQuaternions: Map<string, THREE.Quaternion> = new Map();

// 階層構造を考慮した回転適用
applyBoneRotation(boneName: string, deltaQuaternion: THREE.Quaternion): void {
  // 親ボーンとの関係を考慮した回転計算
}
```

## バグ修正の重要な技術的知見（2025年6月27日追加）

### VRMモデル削除時の状態管理バグとその教訓

#### 🐛 問題の本質
**現象**: VRMモデルを削除した後も、ボーン表示（オレンジ色のワイヤーフレーム）が3Dシーンに残存する

**根本原因**: 
- モデル削除処理でVRMオブジェクトのみを削除
- 関連する状態管理オブジェクト（BoneController）の更新漏れ
- 複数の削除経路で一貫性のない実装

#### 💡 技術的学び
1. **状態管理の重要性**: 
   - オブジェクト削除時は、関連するすべての状態管理クラスも更新必要
   - 単一責任原則：各クラスが自身の状態のみ管理するが、クラス間の整合性確保は上位クラスが担当

2. **削除処理の一貫性**:
   ```typescript
   // ❌ 不十分な削除処理
   removeVRM(index: number) {
     this.scene.remove(vrm.scene);
     this.vrmModels.splice(index, 1);
     // ボーンコントローラーの更新漏れ
   }
   
   // ✅ 完全な削除処理
   removeVRM(index: number) {
     this.scene.remove(vrm.scene);
     this.vrmModels.splice(index, 1);
     
     // 🔑 重要：関連状態の更新
     if (this.vrmModels.length === 0) {
       if (this.boneController) {
         this.boneController.setVRM(null);
       }
     }
   }
   ```

3. **複数削除経路の統一**:
   - `removeVRMAtIndex()`: 個別削除
   - `deleteSelectedModel()`: 選択モデル削除  
   - `removeCurrentVRM()`: 全モデル削除
   - **全経路で同一のクリーンアップ処理を実装**

#### 🔍 デバッグ手法の確立
1. **Playwright MCPによる自動テスト**:
   ```typescript
   // テストシナリオ
   // 1. VRM読み込み → 2. ボーン表示有効化 → 3. モデル削除 → 4. 状態確認
   await page.click('button[name="VRM0サンプル"]');
   await page.click('.model-item');
   await page.click('button[name="ボーン表示"]');
   await page.screenshot({ path: 'before_deletion.png' });
   
   await page.click('button[name="削除"]');
   await page.handle_dialog(true);
   await page.screenshot({ path: 'after_deletion.png' });
   
   // ボーン表示が消えていることを視覚的に確認
   ```

2. **視覚的回帰テスト**:
   - 削除前後のスクリーンショット比較
   - 3Dシーンの状態変化を画像で検証
   - コンソールログによるエラーチェック

#### 🛡️ 予防策の実装
1. **削除処理のテンプレート化**:
   ```typescript
   private cleanupAfterModelRemoval(): void {
     if (this.vrmModels.length === 0) {
       // すべてのコントローラーをリセット
       if (this.boneController) {
         this.boneController.setVRM(null);
       }
       // 他の関連状態もリセット
       this.selectedModelIndex = -1;
     }
   }
   ```

2. **自動テストの継続実行**:
   - 各削除経路のリグレッションテスト
   - CI/CDパイプラインへの組み込み
   - 定期的な品質チェック

#### 📚 将来の応用
この知見は以下の実装で活用予定：
- **アニメーション削除**: アニメーションクリーンアップ処理
- **ポーズ削除**: ポーズ状態の適切なリセット
- **テクスチャ削除**: メモリリークの防止

## 開発プロセス・環境の知見

### Windows開発環境の制約
- **PowerShell制約**: `&&`演算子が使用不可、`;`での代替またはコマンド分割実行
- **Git操作**: 複数コマンドは`run_in_terminal`ツールで分割実行
- **パス区切り**: `\`（バックスラッシュ）使用、適切なエスケープ処理

### コミット戦略の確立
- **フェーズ完了時**: 必ずコミット実行
- **機能実装完了時**: 動作確認後の即座コミット
- **バグ修正完了時**: 修正とテスト完了後のコミット

### Playwright MCPの効果的活用
- **自動化テスト**: VRMファイル読み込み、UI操作、エラーケースのテスト
- **リアルタイム確認**: ブラウザでの動作確認と問題の早期発見
- **クロスブラウザ対応**: Chrome、Firefox、Safari、Edgeでの動作確認
- **🆕 バグ修正検証**: 修正前後の動作比較、視覚的回帰テスト

## フェーズ別実装の重要な学び

### フェーズ3.1: VRMメタ情報表示
- **VRM0/VRM1対応**: バージョン検知アルゴリズムの重要性
- **UI統合**: 既存機能との干渉回避（Infoボタンクリック時のモデル選択阻害防止）
- **モーダル制御**: ESCキー、×ボタン、背景クリックでの統一的な閉じる機能

### フェーズ3.2: ライト調整機能
- **TransformControls**: プロキシオブジェクトによる直感的3D操作
- **リアルタイム更新**: カラーピッカーinputイベントでの即座反映
- **状態同期**: ボタン状態とライト状態の完全同期
- **型安全性**: TypeScriptによるstrict type checking

### 🆕 フェーズ4: バグ修正・品質向上（2025年6月27日）
- **状態管理の重要性**: オブジェクト削除時の関連状態更新の必須性
- **削除処理の一貫性**: 複数削除経路での統一されたクリーンアップ処理
- **自動テストの価値**: Playwright MCPによる効率的なバグ検証
- **視覚的回帰テスト**: スクリーンショット比較による確実な動作確認

## パフォーマンス・最適化の知見

### メモリ管理
```typescript
// three.jsオブジェクトの適切な破棄
mesh.geometry.dispose();
mesh.material.dispose();
scene.remove(mesh);
```

### レンダリング最適化
```typescript
// 必要時のみレンダリング
function animate() {
  if (needsUpdate) {
    renderer.render(scene, camera);
    needsUpdate = false;
  }
  requestAnimationFrame(animate);
}
```

## 今後の拡張・改善指針

### ポージング機能実装（フェーズ5）
1. **ポーズデータ構造**: 各関節のローカル座標・回転情報をJSON形式で管理
2. **UI設計**: ポーズ操作パネル、プリセット管理パネル、関節調整スライダー
3. **技術実装**: TransformControlsのベストプラクティス適用、階層構造対応
4. **🆕 削除処理**: 今回の知見を活用した適切なポーズ状態クリーンアップ

### 継続的品質向上
- **知見蓄積**: 各実装で得た技術的学びの必須記録
- **パターン認識**: 成功・失敗パターンの体系化
- **プロセス改善**: 開発効率と品質の両立を目指した継続改善
- **🆕 自動テスト文化**: Playwright MCPを活用した継続的品質保証体制

この技術的知見により、今後の開発でより効率的で高品質な実装が可能となります。特に今回のバグ修正から得た状態管理の重要性は、今後のすべての機能実装において活用されます。