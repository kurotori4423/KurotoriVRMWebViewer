import './style.css';
import { VRMViewerRefactored } from './core/VRMViewerRefactored';

/**
 * 簡易版アプリケーションのエントリーポイント
 * リファクタリングの動作確認用
 */
async function main() {
  // アプリケーションのコンテナを設定
  const app = document.querySelector<HTMLDivElement>('#app')!;
  app.innerHTML = `
    <div id="vrm-viewer-container">
      <canvas id="vrm-canvas"></canvas>
      
      <!-- 簡易コントロール -->
      <div id="simple-controls" style="position: absolute; top: 10px; left: 10px; background: rgba(0,0,0,0.7); color: white; padding: 10px; border-radius: 5px;">
        <h3>VRMビューワー（リファクタリング版）</h3>
        <input type="file" id="file-input" accept=".vrm" />
        <br><br>
        <button id="reset-camera">カメラリセット</button>
        <button id="toggle-bones">ボーン表示切替</button>
        <button id="reset-lights">ライトリセット</button>
        <br><br>
        <div>モデル数: <span id="model-count">0</span></div>
        <div>選択中: <span id="selected-model">なし</span></div>
      </div>
    </div>
  `;

  // Canvas要素を取得
  const canvas = document.querySelector<HTMLCanvasElement>('#vrm-canvas')!;
  
  // VRMビューワーを初期化
  const vrmViewer = new VRMViewerRefactored(canvas);
  await vrmViewer.initialize();

  // 要素を取得
  const fileInput = document.getElementById('file-input') as HTMLInputElement;
  const resetCameraBtn = document.getElementById('reset-camera') as HTMLButtonElement;
  const toggleBonesBtn = document.getElementById('toggle-bones') as HTMLButtonElement;
  const resetLightsBtn = document.getElementById('reset-lights') as HTMLButtonElement;
  const modelCountSpan = document.getElementById('model-count') as HTMLSpanElement;
  const selectedModelSpan = document.getElementById('selected-model') as HTMLSpanElement;

  // ファイル読み込み
  fileInput.addEventListener('change', async (event) => {
    const files = (event.target as HTMLInputElement).files;
    if (files && files.length > 0) {
      try {
        await vrmViewer.loadVRMFromFile(files[0]);
        updateUI();
        console.log('VRMファイルが読み込まれました');
      } catch (error) {
        console.error('VRM読み込みエラー:', error);
        alert('VRMファイルの読み込みに失敗しました');
      }
    }
  });

  // カメラリセット
  resetCameraBtn.addEventListener('click', () => {
    vrmViewer.resetCameraToDefault();
  });

  // ボーン表示切替
  toggleBonesBtn.addEventListener('click', () => {
    const visible = vrmViewer.toggleBoneVisibility();
    toggleBonesBtn.textContent = visible ? 'ボーン非表示' : 'ボーン表示';
  });

  // ライトリセット
  resetLightsBtn.addEventListener('click', () => {
    vrmViewer.resetLights();
  });

  // UIの更新
  function updateUI() {
    const modelCount = vrmViewer.getVRMCount();
    const selectedIndex = vrmViewer.getSelectedModelIndex();
    
    modelCountSpan.textContent = modelCount.toString();
    selectedModelSpan.textContent = selectedIndex >= 0 ? `モデル ${selectedIndex + 1}` : 'なし';
  }

  // 初期UI更新
  updateUI();

  // ウィンドウリサイズ対応
  window.addEventListener('resize', () => {
    const canvas = vrmViewer['canvas'] as HTMLCanvasElement;
    canvas.style.width = '100%';
    canvas.style.height = '100%';
  });

  console.log('リファクタリングされたVRMビューワーが起動しました');
}

// アプリケーションを開始
main().catch(console.error);
