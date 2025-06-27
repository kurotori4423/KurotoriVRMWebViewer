import './style.css';
import { VRMViewer } from './core/VRMViewer';

/**
 * アプリケーションのエントリーポイント
 */
async function main() {
  // アプリケーションのコンテナを設定
  const app = document.querySelector<HTMLDivElement>('#app')!;
  app.innerHTML = `
    <div id="vrm-viewer-container">
      <canvas id="vrm-canvas"></canvas>
      <div id="ui-container">
        <h1>KurotoriVRM WebViewer</h1>
        <div id="file-input-container">
          <input type="file" id="vrm-file-input" accept=".vrm" />
          <label for="vrm-file-input">VRMファイルを選択</label>
          
          <div id="preset-buttons">
            <h3>プリセット</h3>
            <button id="load-vrm0-sample" class="preset-btn">VRM0サンプル</button>
            <button id="load-vrm1-sample" class="preset-btn">VRM1サンプル</button>
          </div>
          
          <div id="drag-drop-zone">
            ここにVRMファイルをドラッグ&ドロップ
          </div>
          
          <div id="loading-indicator" class="hidden">
            読み込み中...
          </div>
          
          <div id="error-message" class="hidden error"></div>
        </div>
      </div>
    </div>
  `;

  // VRMビューワーを初期化
  const canvas = document.getElementById('vrm-canvas') as HTMLCanvasElement;
  const vrmViewer = new VRMViewer(canvas);
  
  try {
    await vrmViewer.initialize();
    console.log('VRMビューワーが正常に初期化されました');
    
    // ファイル選択のイベントリスナーを設定
    setupFileInputHandlers(vrmViewer);
    
  } catch (error) {
    console.error('VRMビューワーの初期化に失敗しました:', error);
    showError('VRMビューワーの初期化に失敗しました');
  }
}

/**
 * ファイル入力関連のイベントハンドラを設定
 */
function setupFileInputHandlers(vrmViewer: VRMViewer): void {
  const fileInput = document.getElementById('vrm-file-input') as HTMLInputElement;
  const vrm0Button = document.getElementById('load-vrm0-sample') as HTMLButtonElement;
  const vrm1Button = document.getElementById('load-vrm1-sample') as HTMLButtonElement;
  const dragDropZone = document.getElementById('drag-drop-zone') as HTMLDivElement;

  // ファイル選択
  fileInput.addEventListener('change', async (event) => {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (file) {
      await loadVRMFile(vrmViewer, file);
    }
  });

  // プリセットボタン - VRM0
  vrm0Button.addEventListener('click', async () => {
    await loadVRMFromURL(vrmViewer, '/samples/sample_vrm0.vrm');
  });

  // プリセットボタン - VRM1
  vrm1Button.addEventListener('click', async () => {
    await loadVRMFromURL(vrmViewer, '/samples/sample_vrm1.vrm');
  });

  // ドラッグ&ドロップ
  dragDropZone.addEventListener('dragover', (event) => {
    event.preventDefault();
    dragDropZone.classList.add('drag-over');
  });

  dragDropZone.addEventListener('dragleave', () => {
    dragDropZone.classList.remove('drag-over');
  });

  dragDropZone.addEventListener('drop', async (event) => {
    event.preventDefault();
    dragDropZone.classList.remove('drag-over');
    
    const files = event.dataTransfer?.files;
    if (files && files.length > 0) {
      const file = files[0];
      if (file.name.toLowerCase().endsWith('.vrm')) {
        await loadVRMFile(vrmViewer, file);
      } else {
        showError('VRMファイルを選択してください');
      }
    }
  });
}

/**
 * ファイルからVRMを読み込む
 */
async function loadVRMFile(vrmViewer: VRMViewer, file: File): Promise<void> {
  try {
    showLoading(true);
    hideError();
    
    console.log(`VRMファイルを読み込み中: ${file.name}`);
    await vrmViewer.loadVRMFromFile(file);
    
    showLoading(false);
    console.log('VRMファイルの読み込みが完了しました');
  } catch (error) {
    showLoading(false);
    console.error('VRMファイルの読み込みに失敗:', error);
    showError(`VRMファイルの読み込みに失敗しました: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * URLからVRMを読み込む
 */
async function loadVRMFromURL(vrmViewer: VRMViewer, url: string): Promise<void> {
  try {
    showLoading(true);
    hideError();
    
    console.log(`VRMファイルを読み込み中: ${url}`);
    await vrmViewer.loadVRMFromURL(url);
    
    showLoading(false);
    console.log('VRMファイルの読み込みが完了しました');
  } catch (error) {
    showLoading(false);
    console.error('VRMファイルの読み込みに失敗:', error);
    showError(`VRMファイルの読み込みに失敗しました: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * ローディング表示の制御
 */
function showLoading(show: boolean): void {
  const loadingIndicator = document.getElementById('loading-indicator');
  if (loadingIndicator) {
    if (show) {
      loadingIndicator.classList.remove('hidden');
    } else {
      loadingIndicator.classList.add('hidden');
    }
  }
}

/**
 * エラーメッセージの表示
 */
function showError(message: string): void {
  const errorElement = document.getElementById('error-message');
  if (errorElement) {
    errorElement.textContent = message;
    errorElement.classList.remove('hidden');
  }
}

/**
 * エラーメッセージの非表示
 */
function hideError(): void {
  const errorElement = document.getElementById('error-message');
  if (errorElement) {
    errorElement.classList.add('hidden');
  }
}

// アプリケーションを開始
main().catch(console.error);
