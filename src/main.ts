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
          
          <div id="model-controls">
            <h3>モデル操作</h3>
            <div class="control-group">
              <button id="center-model" class="control-btn">中央配置</button>
              <button id="reset-camera" class="control-btn">カメラリセット</button>
            </div>
            <div class="control-group">
              <label for="model-scale">スケール:</label>
              <input type="range" id="model-scale" min="0.1" max="3.0" step="0.1" value="1.0" />
              <span id="scale-value">1.0</span>
            </div>
          </div>
          
          <div id="multi-vrm-controls">
            <h3>複数体管理</h3>
            <div class="control-group">
              <button id="add-vrm0-sample" class="add-btn">VRM0追加</button>
              <button id="add-vrm1-sample" class="add-btn">VRM1追加</button>
            </div>
            <div class="control-group">
              <button id="clear-all-vrms" class="danger-btn">全て削除</button>
              <span id="vrm-count">VRM数: 0</span>
            </div>
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

  // モデル操作コントロール
  const centerModelBtn = document.getElementById('center-model') as HTMLButtonElement;
  const resetCameraBtn = document.getElementById('reset-camera') as HTMLButtonElement;
  const modelScaleSlider = document.getElementById('model-scale') as HTMLInputElement;
  const scaleValueSpan = document.getElementById('scale-value') as HTMLSpanElement;

  // 複数VRM管理コントロール
  const addVrm0Btn = document.getElementById('add-vrm0-sample') as HTMLButtonElement;
  const addVrm1Btn = document.getElementById('add-vrm1-sample') as HTMLButtonElement;
  const clearAllBtn = document.getElementById('clear-all-vrms') as HTMLButtonElement;
  const vrmCountSpan = document.getElementById('vrm-count') as HTMLSpanElement;

  // ファイル選択
  fileInput.addEventListener('change', async (event) => {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (file) {
      await loadVRMFile(vrmViewer, file);
      updateVRMCount(vrmViewer, vrmCountSpan);
    }
  });

  // プリセットボタン - VRM0
  vrm0Button.addEventListener('click', async () => {
    await loadVRMFromURL(vrmViewer, '/samples/sample_vrm0.vrm');
    updateVRMCount(vrmViewer, vrmCountSpan);
  });

  // プリセットボタン - VRM1
  vrm1Button.addEventListener('click', async () => {
    await loadVRMFromURL(vrmViewer, '/samples/sample_vrm1.vrm');
    updateVRMCount(vrmViewer, vrmCountSpan);
  });

  // モデル操作
  centerModelBtn.addEventListener('click', () => {
    vrmViewer.centerModel();
  });

  resetCameraBtn.addEventListener('click', () => {
    vrmViewer.resetCamera();
  });

  modelScaleSlider.addEventListener('input', (event) => {
    const scale = parseFloat((event.target as HTMLInputElement).value);
    scaleValueSpan.textContent = scale.toFixed(1);
    vrmViewer.setModelScale(scale);
  });

  // 複数VRM管理
  addVrm0Btn.addEventListener('click', async () => {
    await addVRMFromURL(vrmViewer, '/samples/sample_vrm0.vrm');
    updateVRMCount(vrmViewer, vrmCountSpan);
  });

  addVrm1Btn.addEventListener('click', async () => {
    await addVRMFromURL(vrmViewer, '/samples/sample_vrm1.vrm');
    updateVRMCount(vrmViewer, vrmCountSpan);
  });

  clearAllBtn.addEventListener('click', () => {
    if (confirm('全てのVRMモデルを削除しますか？')) {
      vrmViewer.removeAllVRMs();
      updateVRMCount(vrmViewer, vrmCountSpan);
      // スケールスライダーをリセット
      modelScaleSlider.value = '1.0';
      scaleValueSpan.textContent = '1.0';
    }
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
        await addVRMFile(vrmViewer, file);
        updateVRMCount(vrmViewer, vrmCountSpan);
      } else {
        showError('VRMファイルを選択してください');
      }
    }
  });

  // 初期カウント更新
  updateVRMCount(vrmViewer, vrmCountSpan);
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
 * URLからVRMを追加読み込み
 */
async function addVRMFromURL(vrmViewer: VRMViewer, url: string): Promise<void> {
  try {
    showLoading(true);
    hideError();
    
    console.log(`VRMファイルを追加読み込み中: ${url}`);
    await vrmViewer.addVRMFromURL(url);
    
    showLoading(false);
    console.log('VRMファイルの追加読み込みが完了しました');
  } catch (error) {
    showLoading(false);
    console.error('VRMファイルの追加読み込みに失敗:', error);
    showError(`VRMファイルの追加読み込みに失敗しました: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * ファイルからVRMを追加読み込み
 */
async function addVRMFile(vrmViewer: VRMViewer, file: File): Promise<void> {
  try {
    showLoading(true);
    hideError();
    
    console.log(`VRMファイルを追加読み込み中: ${file.name}`);
    await vrmViewer.addVRMFromFile(file);
    
    showLoading(false);
    console.log('VRMファイルの追加読み込みが完了しました');
  } catch (error) {
    showLoading(false);
    console.error('VRMファイルの追加読み込みに失敗:', error);
    showError(`VRMファイルの追加読み込みに失敗しました: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * VRM数表示を更新
 */
function updateVRMCount(vrmViewer: VRMViewer, countElement: HTMLSpanElement): void {
  const count = vrmViewer.getVRMCount();
  countElement.textContent = `VRM数: ${count}`;
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
