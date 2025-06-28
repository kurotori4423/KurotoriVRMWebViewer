# 💻 TECH CONTEXT - 技術スタック・実装詳細

**技術分類**: WebGL・VRM・TypeScript  
**主要フレームワーク**: Three.js・Vite  
**開発言語**: TypeScript (ES2020)  
**最終更新**: 2025年6月29日

---

## 🎯 技術スタック概要

### フロントエンド技術
- **3D描画エンジン**: Three.js r177 (WebGL)
- **VRM処理**: @pixiv/three-vrm v3.4.1  
- **アニメーション**: @pixiv/three-vrm-animation v3.4.1
- **開発言語**: TypeScript 5.8.3
- **ビルドツール**: Vite 7.0.0
- **UI制御**: lil-gui 0.20.0
- **3Dナビゲーション**: three-viewport-gizmo 2.2.0

### 開発・ビルド環境
- **パッケージマネージャー**: npm
- **モジュールシステム**: ES Modules
- **型定義**: @types/three 0.177.0
- **開発サーバー**: Vite Dev Server
- **ホットリロード**: HMR (Hot Module Replacement)

## 🏗️ アーキテクチャ技術詳細

### WebGL・Three.js 統合
```typescript
// WebGL レンダラー設定
const renderer = new THREE.WebGLRenderer({
  antialias: true,         // アンチエイリアス有効
  alpha: true,             // 透明背景対応
  powerPreference: "high-performance" // 高性能GPU優先
});

// レンダリング最適化
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.physicallyCorrectLights = true;
```

### VRM技術統合詳細
```typescript
// VRM loader 設定
const loader = new VRMLoaderPlugin(gltfLoader);

// VRM 0.x / 1.0 対応
loader.register(parser => {
  // VRM1.0 対応
  if (parser.json.extensions?.VRMC_vrm) {
    return new VRM1Parser(parser);
  }
  // VRM0.x 対応  
  if (parser.json.extensions?.VRM) {
    return new VRM0Parser(parser);
  }
});
```

### VRMアニメーション技術
```typescript
// VRMA (VRM Animation) 対応
import { VRMAnimationLoaderPlugin } from '@pixiv/three-vrm-animation';

const animationLoader = new VRMAnimationLoaderPlugin();
gltfLoader.register(animationLoader);

// アニメーション制御
const clip = await animationLoader.loadVRMAnimation(vrmAnimationUrl);
const mixer = new THREE.AnimationMixer(vrm.scene);
const action = mixer.clipAction(clip);
```

## 🎨 VRM技術深度

### VRM表情システム (Expression)
```typescript
// VRM表情管理
const expressionManager = vrm.expressionManager;

// 利用可能表情取得
const expressions = expressionManager.expressions;
expressions.forEach(expression => {
  console.log(`Expression: ${expression.expressionName}`);
});

// 表情値設定 (0.0 - 1.0)
expressionManager.setValue('happy', 0.8);
expressionManager.setValue('blink', 1.0);

// フレーム更新
expressionManager.update();
```

### VRMボーンシステム (Humanoid)
```typescript
// ヒューマノイドボーン取得
const humanoid = vrm.humanoid;

// 特定ボーン操作
const leftUpperArm = humanoid.getNormalizedBoneNode('leftUpperArm');
if (leftUpperArm) {
  // ボーン回転設定
  leftUpperArm.rotation.set(Math.PI * 0.25, 0, 0);
}

// 全ボーンリセット
humanoid.resetNormalizedPose();
```

### VRM座標系・SpringBone
```typescript
// VRM座標系変換
class VRMCoordinateHelper {
  // VRM座標 → Three.js座標
  static convertVRMToThree(vrmPos: THREE.Vector3): THREE.Vector3 {
    return new THREE.Vector3(vrmPos.x, vrmPos.y, -vrmPos.z);
  }
  
  // SpringBone更新
  static updateSpringBone(vrm: VRM, deltaTime: number): void {
    vrm.springBoneManager?.update(deltaTime);
  }
}
```

## 🔧 TypeScript実装詳細

### 型安全VRM操作
```typescript
// VRMモデル型定義
interface VRMModel {
  readonly vrm: VRM;
  readonly uuid: string;
  readonly name: string;
  position: THREE.Vector3;
  rotation: THREE.Euler;
  scale: THREE.Vector3;
  visible: boolean;
}

// VRM管理クラス
class VRMManager extends BaseManager {
  private models: Map<string, VRMModel> = new Map();
  
  async loadVRM(file: File): Promise<VRMModel> {
    const arrayBuffer = await file.arrayBuffer();
    const gltf = await this.loader.loadAsync(arrayBuffer);
    const vrm = gltf.userData.vrm as VRM;
    
    if (!vrm) {
      throw new VRMLoadError('Invalid VRM file');
    }
    
    return this.registerModel(vrm, file.name);
  }
}
```

### Transform Controls統合
```typescript
// Transform Controls TypeScript型
interface TransformControlsEvent {
  type: 'change' | 'dragging-changed' | 'objectChange';
  target: TransformControls;
}

class BoneTransformController {
  private controls: TransformControls;
  
  constructor(camera: THREE.Camera, renderer: THREE.WebGLRenderer) {
    this.controls = new TransformControls(camera, renderer.domElement);
    
    // TypeScript型安全イベント
    this.controls.addEventListener('change', (event: TransformControlsEvent) => {
      this.handleTransformChange(event);
    });
  }
}
```

## 🎨 CSS・UI技術詳細

### glassmorphism実装
```css
.modal-section {
  /* ガラスモーフィズム効果 */
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
}

/* ダークモード自動対応 */
@media (prefers-color-scheme: dark) {
  .modal-section {
    background: rgba(0, 0, 0, 0.2);
    border: 1px solid rgba(255, 255, 255, 0.1);
  }
}
```

### CSS Grid レスポンシブ
```css
.control-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(80px, 1fr));
  gap: 8px;
  padding: 12px;
  
  /* レスポンシブブレークポイント */
  @media (max-width: 480px) {
    grid-template-columns: repeat(2, 1fr);
  }
  
  @media (max-width: 320px) {
    grid-template-columns: 1fr;
  }
}
```

### SVGアイコン統合
```typescript
// SVGアイコン動的読み込み
class IconManager {
  private static cache = new Map<string, string>();
  
  static async loadIcon(name: string): Promise<string> {
    if (this.cache.has(name)) {
      return this.cache.get(name)!;
    }
    
    const response = await fetch(`/assets/icons/${name}.svg`);
    const svg = await response.text();
    this.cache.set(name, svg);
    return svg;
  }
}
```

## 🚀 パフォーマンス最適化技術

### レンダリング最適化
```typescript
// 効率的レンダーループ
class RenderManager {
  private needsRender = false;
  private animationId: number | null = null;
  
  requestRender(): void {
    if (this.needsRender) return;
    
    this.needsRender = true;
    this.animationId = requestAnimationFrame(() => {
      this.render();
      this.needsRender = false;
    });
  }
  
  private render(): void {
    // VRM SpringBone 更新
    this.updateVRMSpringBones();
    
    // レンダリング実行
    this.renderer.render(this.scene, this.camera);
  }
}
```

### メモリ管理最適化
```typescript
// リソース自動管理
class ResourceManager {
  private disposables = new Set<{ dispose(): void }>();
  
  register<T extends { dispose(): void }>(resource: T): T {
    this.disposables.add(resource);
    return resource;
  }
  
  cleanup(): void {
    this.disposables.forEach(resource => {
      try {
        resource.dispose();
      } catch (error) {
        console.warn('Resource disposal error:', error);
      }
    });
    this.disposables.clear();
  }
}
```

### 階層キャッシュシステム
```typescript
// 座標計算キャッシュ
class HierarchicalCoordinateCache {
  private cache = new Map<string, CacheEntry>();
  private frameId = 0;
  
  getWorldPosition(bone: THREE.Bone): THREE.Vector3 {
    const key = bone.uuid;
    const entry = this.cache.get(key);
    
    if (entry && entry.frameId === this.frameId) {
      return entry.position.clone();
    }
    
    const position = bone.getWorldPosition(new THREE.Vector3());
    this.cache.set(key, {
      position: position.clone(),
      frameId: this.frameId
    });
    
    return position;
  }
}
```

## 🔒 エラーハンドリング・デバッグ

### VRM固有エラー処理
```typescript
// VRM専用エラークラス
class VRMError extends Error {
  constructor(
    message: string,
    public readonly code: VRMErrorCode,
    public readonly vrmFile?: File
  ) {
    super(message);
    this.name = 'VRMError';
  }
}

enum VRMErrorCode {
  INVALID_FORMAT = 'INVALID_FORMAT',
  UNSUPPORTED_VERSION = 'UNSUPPORTED_VERSION',
  LOAD_FAILED = 'LOAD_FAILED',
  EXPRESSION_NOT_FOUND = 'EXPRESSION_NOT_FOUND'
}
```

### デバッグ支援機能
```typescript
// デバッグ情報表示
class DebugManager {
  static logVRMInfo(vrm: VRM): void {
    console.group('VRM Debug Info');
    console.log('Version:', vrm.meta?.metaVersion);
    console.log('Name:', vrm.meta?.name);
    console.log('Bones:', vrm.humanoid?.humanBones);
    console.log('Expressions:', vrm.expressionManager?.expressions);
    console.groupEnd();
  }
  
  static profilePerformance<T>(name: string, fn: () => T): T {
    const start = performance.now();
    const result = fn();
    const end = performance.now();
    console.log(`${name}: ${end - start}ms`);
    return result;
  }
}
```

## 🌐 ブラウザ互換性・Web技術

### WebGL機能検出
```typescript
// WebGL対応チェック
class WebGLCapabilityChecker {
  static checkSupport(): CapabilityReport {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
    
    if (!gl) {
      throw new Error('WebGL not supported');
    }
    
    return {
      webgl2: !!canvas.getContext('webgl2'),
      maxTextureSize: gl.getParameter(gl.MAX_TEXTURE_SIZE),
      maxVertexUniforms: gl.getParameter(gl.MAX_VERTEX_UNIFORM_VECTORS),
      extensions: gl.getSupportedExtensions() || []
    };
  }
}
```

### File API・ドラッグ&ドロップ
```typescript
// ファイル操作統合
class FileHandler {
  static async handleVRMFiles(files: FileList): Promise<VRMModel[]> {
    const vrmFiles = Array.from(files).filter(
      file => file.name.toLowerCase().endsWith('.vrm')
    );
    
    if (vrmFiles.length === 0) {
      throw new Error('No VRM files found');
    }
    
    // 並列読み込み
    const promises = vrmFiles.map(file => this.loadVRMFile(file));
    return Promise.all(promises);
  }
}
```

## 📊 品質・テスト技術

### TypeScript厳格設定
```json
// tsconfig.json 厳格設定
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true
  }
}
```

### 実行時型検証
```typescript
// 実行時型ガード
function isVRMExpression(obj: any): obj is VRMExpression {
  return obj &&
         typeof obj.expressionName === 'string' &&
         typeof obj.weight === 'number' &&
         obj.weight >= 0 && obj.weight <= 1;
}

// 設定値バリデーション
function validateExpressionValue(value: number): asserts value is number {
  if (typeof value !== 'number' || value < 0 || value > 1) {
    throw new Error(`Invalid expression value: ${value}`);
  }
}
``` 