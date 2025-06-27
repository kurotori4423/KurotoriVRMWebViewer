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
            </div>
            <div class="control-group">
              <button id="reset-camera" class="control-btn">カメラリセット</button>
              <button id="reset-camera-default" class="control-btn">デフォルト位置</button>
            </div>
            <div class="control-group">
              <button id="reset-camera-fit-all" class="control-btn">全体表示</button>
              <button id="reset-camera-animated" class="control-btn">アニメーション</button>
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
          
          <div id="lighting-controls">
            <h3>ライト調整</h3>
            <div class="control-group">
              <label for="ambient-light">環境光:</label>
              <input type="range" id="ambient-light" min="0.0" max="2.0" step="0.1" value="0.3" />
              <span id="ambient-value">0.3</span>
            </div>
            <div class="control-group">
              <label for="directional-light">方向性ライト:</label>
              <input type="range" id="directional-light" min="0.0" max="3.0" step="0.1" value="1.0" />
              <span id="directional-value">1.0</span>
            </div>
            <div class="control-group">
              <label for="rim-light">リムライト:</label>
              <input type="range" id="rim-light" min="0.0" max="2.0" step="0.1" value="0.5" />
              <span id="rim-value">0.5</span>
            </div>
            <div class="control-group">
              <button id="reset-lights" class="control-btn">ライトリセット</button>
            </div>
          </div>
          
          <div id="background-controls">
            <h3>背景設定</h3>
            <div class="control-group">
              <label for="background-color">背景色:</label>
              <input type="color" id="background-color" value="#2a2a2a" />
              <button id="transparent-background" class="control-btn">透明</button>
            </div>
            <div class="control-group">
              <h4>プリセット背景</h4>
              <button class="preset-color-btn" data-color="#ffffff">白</button>
              <button class="preset-color-btn" data-color="#000000">黒</button>
              <button class="preset-color-btn" data-color="#2a2a2a">グレー</button>
              <button class="preset-color-btn" data-color="#1e3a8a">青</button>
              <button class="preset-color-btn" data-color="#166534">緑</button>
            </div>
            <div class="control-group">
              <h4>グラデーション背景</h4>
              <label for="gradient-top">上部:</label>
              <input type="color" id="gradient-top" value="#87ceeb" />
              <label for="gradient-bottom">下部:</label>
              <input type="color" id="gradient-bottom" value="#ffffff" />
              <button id="apply-gradient" class="control-btn">適用</button>
            </div>
            <div class="control-group">
              <button id="reset-background" class="control-btn">背景リセット</button>
            </div>
          </div>
          
          <div id="vrm-list-container">
            <h3>読み込み済みモデル</h3>
            <div id="vrm-list">
              <div id="no-models-message" class="no-models">
                モデルが読み込まれていません
              </div>
            </div>
          </div>
          
          <div id="selected-model-controls">
            <h3>選択モデル操作</h3>
            <div id="selected-model-info" class="hidden">
              <span id="selected-model-name">未選択</span>
            </div>
            <div class="control-group">
              <button id="focus-selected" class="control-btn" disabled>フォーカス</button>
              <button id="toggle-visibility" class="control-btn" disabled>表示切替</button>
            </div>
            <div class="control-group">
              <button id="duplicate-selected" class="control-btn" disabled>複製</button>
              <button id="delete-selected" class="danger-btn" disabled>削除</button>
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
    
    // キーボード操作のイベントリスナーを設定
    setupKeyboardHandlers(vrmViewer);
    
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
  const resetCameraDefaultBtn = document.getElementById('reset-camera-default') as HTMLButtonElement;
  const resetCameraFitAllBtn = document.getElementById('reset-camera-fit-all') as HTMLButtonElement;
  const resetCameraAnimatedBtn = document.getElementById('reset-camera-animated') as HTMLButtonElement;
  const modelScaleSlider = document.getElementById('model-scale') as HTMLInputElement;
  const scaleValueSpan = document.getElementById('scale-value') as HTMLSpanElement;

  // 複数VRM管理コントロール
  const addVrm0Btn = document.getElementById('add-vrm0-sample') as HTMLButtonElement;
  const addVrm1Btn = document.getElementById('add-vrm1-sample') as HTMLButtonElement;
  const clearAllBtn = document.getElementById('clear-all-vrms') as HTMLButtonElement;
  const vrmCountSpan = document.getElementById('vrm-count') as HTMLSpanElement;

  // モデル選択関連のコントロール
  const focusSelectedBtn = document.getElementById('focus-selected') as HTMLButtonElement;
  const toggleVisibilityBtn = document.getElementById('toggle-visibility') as HTMLButtonElement;
  const duplicateSelectedBtn = document.getElementById('duplicate-selected') as HTMLButtonElement;
  const deleteSelectedBtn = document.getElementById('delete-selected') as HTMLButtonElement;

  // ファイル選択
  fileInput.addEventListener('change', async (event) => {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (file) {
      await loadVRMFile(vrmViewer, file);
      updateVRMCount(vrmViewer, vrmCountSpan);
      updateModelList(vrmViewer);
    }
  });

  // プリセットボタン - VRM0
  vrm0Button.addEventListener('click', async () => {
    await loadVRMFromURL(vrmViewer, '/samples/sample_vrm0.vrm');
    updateVRMCount(vrmViewer, vrmCountSpan);
    updateModelList(vrmViewer);
  });

  // プリセットボタン - VRM1
  vrm1Button.addEventListener('click', async () => {
    await loadVRMFromURL(vrmViewer, '/samples/sample_vrm1.vrm');
    updateVRMCount(vrmViewer, vrmCountSpan);
    updateModelList(vrmViewer);
  });

  // モデル操作
  centerModelBtn.addEventListener('click', () => {
    vrmViewer.centerModel();
  });

  resetCameraBtn.addEventListener('click', () => {
    vrmViewer.resetCamera();
  });

  resetCameraDefaultBtn.addEventListener('click', () => {
    vrmViewer.resetCameraToDefault();
  });

  resetCameraFitAllBtn.addEventListener('click', () => {
    vrmViewer.resetCameraToFitAll();
  });

  resetCameraAnimatedBtn.addEventListener('click', async () => {
    await vrmViewer.resetCameraAnimated(1500); // 1.5秒のアニメーション
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
    updateModelList(vrmViewer);
  });

  addVrm1Btn.addEventListener('click', async () => {
    await addVRMFromURL(vrmViewer, '/samples/sample_vrm1.vrm');
    updateVRMCount(vrmViewer, vrmCountSpan);
    updateModelList(vrmViewer);
  });

  clearAllBtn.addEventListener('click', () => {
    if (confirm('全てのVRMモデルを削除しますか？')) {
      vrmViewer.removeAllVRMs();
      updateVRMCount(vrmViewer, vrmCountSpan);
      updateModelList(vrmViewer);
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
        updateModelList(vrmViewer);
      } else {
        showError('VRMファイルを選択してください');
      }
    }
  });

  // モデル選択関連のイベントリスナー
  focusSelectedBtn.addEventListener('click', () => {
    vrmViewer.focusOnSelectedModel();
  });

  toggleVisibilityBtn.addEventListener('click', () => {
    const isVisible = vrmViewer.toggleSelectedModelVisibility();
    toggleVisibilityBtn.textContent = isVisible ? '非表示' : '表示';
  });

  duplicateSelectedBtn.addEventListener('click', async () => {
    const success = await vrmViewer.duplicateSelectedModel();
    if (success) {
      updateVRMCount(vrmViewer, vrmCountSpan);
      updateModelList(vrmViewer);
    } else {
      showError('モデルの複製に失敗しました');
    }
  });

  deleteSelectedBtn.addEventListener('click', () => {
    if (confirm('選択されたモデルを削除しますか？')) {
      const success = vrmViewer.deleteSelectedModel();
      if (success) {
        updateVRMCount(vrmViewer, vrmCountSpan);
        updateModelList(vrmViewer);
        updateSelectedModelControls(vrmViewer);
      }
    }
  });

  // 初期カウント更新
  updateVRMCount(vrmViewer, vrmCountSpan);
  updateModelList(vrmViewer);

  // ライト調整のイベントハンドラを設定
  setupLightingHandlers(vrmViewer);

  // 背景設定のイベントハンドラを設定
  setupBackgroundHandlers(vrmViewer);
}

/**
 * ライト調整のイベントハンドラを設定
 */
function setupLightingHandlers(vrmViewer: VRMViewer): void {
  // 環境光調整
  const ambientLightSlider = document.getElementById('ambient-light') as HTMLInputElement;
  const ambientValue = document.getElementById('ambient-value') as HTMLSpanElement;
  
  ambientLightSlider.addEventListener('input', (event) => {
    const intensity = parseFloat((event.target as HTMLInputElement).value);
    vrmViewer.setAmbientLightIntensity(intensity);
    ambientValue.textContent = intensity.toFixed(1);
  });

  // 方向性ライト調整
  const directionalLightSlider = document.getElementById('directional-light') as HTMLInputElement;
  const directionalValue = document.getElementById('directional-value') as HTMLSpanElement;
  
  directionalLightSlider.addEventListener('input', (event) => {
    const intensity = parseFloat((event.target as HTMLInputElement).value);
    vrmViewer.setDirectionalLightIntensity(intensity);
    directionalValue.textContent = intensity.toFixed(1);
  });

  // リムライト調整
  const rimLightSlider = document.getElementById('rim-light') as HTMLInputElement;
  const rimValue = document.getElementById('rim-value') as HTMLSpanElement;
  
  rimLightSlider.addEventListener('input', (event) => {
    const intensity = parseFloat((event.target as HTMLInputElement).value);
    vrmViewer.setRimLightIntensity(intensity);
    rimValue.textContent = intensity.toFixed(1);
  });

  // ライトリセットボタン
  const resetLightsBtn = document.getElementById('reset-lights') as HTMLButtonElement;
  resetLightsBtn.addEventListener('click', () => {
    vrmViewer.resetLights();
    
    // UIも初期値にリセット
    ambientLightSlider.value = '0.3';
    ambientValue.textContent = '0.3';
    directionalLightSlider.value = '1.0';
    directionalValue.textContent = '1.0';
    rimLightSlider.value = '0.5';
    rimValue.textContent = '0.5';
  });
}

/**
 * キーボード操作のイベントハンドラを設定
 */
function setupKeyboardHandlers(vrmViewer: VRMViewer): void {
  document.addEventListener('keydown', (event) => {
    // 入力フィールドにフォーカスがある場合はキーボード操作を無効にする
    const activeElement = document.activeElement;
    if (activeElement && (
      activeElement.tagName === 'INPUT' || 
      activeElement.tagName === 'TEXTAREA' ||
      (activeElement as HTMLElement).contentEditable === 'true'
    )) {
      return;
    }

    switch (event.key) {
      case 'ArrowUp':
        event.preventDefault();
        selectPreviousModel(vrmViewer);
        break;
      
      case 'ArrowDown':
        event.preventDefault();
        selectNextModel(vrmViewer);
        break;
      
      case 'Escape':
        event.preventDefault();
        clearModelSelection(vrmViewer);
        break;
    }
  });
}

/**
 * 前のモデルを選択
 */
function selectPreviousModel(vrmViewer: VRMViewer): void {
  const modelCount = vrmViewer.getVRMCount();
  if (modelCount === 0) return;

  const currentIndex = vrmViewer.getSelectedModelIndex();
  let newIndex: number;

  if (currentIndex <= 0) {
    // 現在選択されていないか最初のモデルの場合は最後のモデルを選択
    newIndex = modelCount - 1;
  } else {
    // 前のモデルを選択
    newIndex = currentIndex - 1;
  }

  selectModelInList(vrmViewer, newIndex);
  console.log(`上矢印キー: モデル ${newIndex} を選択しました`);
}

/**
 * 次のモデルを選択
 */
function selectNextModel(vrmViewer: VRMViewer): void {
  const modelCount = vrmViewer.getVRMCount();
  if (modelCount === 0) return;

  const currentIndex = vrmViewer.getSelectedModelIndex();
  let newIndex: number;

  if (currentIndex < 0 || currentIndex >= modelCount - 1) {
    // 現在選択されていないか最後のモデルの場合は最初のモデルを選択
    newIndex = 0;
  } else {
    // 次のモデルを選択
    newIndex = currentIndex + 1;
  }

  selectModelInList(vrmViewer, newIndex);
  console.log(`下矢印キー: モデル ${newIndex} を選択しました`);
}

/**
 * モデル選択をクリア
 */
function clearModelSelection(vrmViewer: VRMViewer): void {
  vrmViewer.clearSelection();
  
  // UI上の選択状態もクリア
  const allItems = document.querySelectorAll('.model-item');
  allItems.forEach(item => {
    item.classList.remove('selected');
  });
  
  // 選択モデル操作コントロールを更新
  updateSelectedModelControls(vrmViewer);
  
  console.log('Escキー: モデル選択をクリアしました');
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
 * VRMモデルリストUIの更新
 */
function updateModelList(vrmViewer: VRMViewer): void {
  const vrmListContainer = document.getElementById('vrm-list');
  const noModelsMessage = document.getElementById('no-models-message');
  
  if (!vrmListContainer || !noModelsMessage) return;

  const models = vrmViewer.getVRMModels();
  
  // 既存のリスト項目をクリア（no-models-messageは保持）
  const existingItems = vrmListContainer.querySelectorAll('.model-item');
  existingItems.forEach(item => item.remove());
  
  if (models.length === 0) {
    noModelsMessage.classList.remove('hidden');
    return;
  }
  
  noModelsMessage.classList.add('hidden');
  
  // モデルごとにリスト項目を作成
  models.forEach((vrm: any, index: number) => {
    const modelItem = document.createElement('div');
    modelItem.className = 'model-item';
    modelItem.dataset.index = index.toString();
    
    // モデル名を取得（メタ情報があれば使用、なければファイル名など）
    let modelName = `Model ${index + 1}`;
    if (vrm.meta && vrm.meta.name) {
      modelName = vrm.meta.name;
    }
    
    modelItem.innerHTML = `
      <div class="model-info">
        <div class="model-name">${modelName}</div>
        <div class="model-index">Index: ${index}</div>
      </div>
    `;
    
    // クリックイベントを追加
    modelItem.addEventListener('click', () => {
      selectModelInList(vrmViewer, index);
    });
    
    vrmListContainer.appendChild(modelItem);
  });
}

/**
 * リスト内でモデルを選択
 */
function selectModelInList(vrmViewer: VRMViewer, index: number): void {
  // VRMViewerでモデルを選択
  vrmViewer.selectModel(index);
  
  // UI上でも選択状態を更新
  const allItems = document.querySelectorAll('.model-item');
  allItems.forEach((item, i) => {
    if (i === index) {
      item.classList.add('selected');
    } else {
      item.classList.remove('selected');
    }
  });
  
  // 選択モデル操作コントロールを更新
  updateSelectedModelControls(vrmViewer);
}

/**
 * 選択モデル操作コントロールの状態を更新
 */
function updateSelectedModelControls(vrmViewer: VRMViewer): void {
  const selectedModel = vrmViewer.getSelectedModel();
  const selectedIndex = vrmViewer.getSelectedModelIndex();
  
  // ボタンの有効/無効状態を更新
  const focusBtn = document.getElementById('focus-selected') as HTMLButtonElement;
  const toggleBtn = document.getElementById('toggle-visibility') as HTMLButtonElement;
  const duplicateBtn = document.getElementById('duplicate-selected') as HTMLButtonElement;
  const deleteBtn = document.getElementById('delete-selected') as HTMLButtonElement;
  const selectedInfoDiv = document.getElementById('selected-model-info');
  const selectedNameSpan = document.getElementById('selected-model-name') as HTMLSpanElement;
  
  // スケールスライダーとその値表示を取得
  const modelScaleSlider = document.getElementById('model-scale') as HTMLInputElement;
  const scaleValueSpan = document.getElementById('scale-value') as HTMLSpanElement;
  
  if (selectedModel && selectedIndex >= 0) {
    // モデルが選択されている場合
    focusBtn.disabled = false;
    toggleBtn.disabled = false;
    duplicateBtn.disabled = false;
    deleteBtn.disabled = false;
    
    selectedInfoDiv?.classList.remove('hidden');
    
    // モデル名の表示
    let modelName = `Model ${selectedIndex + 1}`;
    if (selectedModel.meta && selectedModel.meta.name) {
      modelName = selectedModel.meta.name;
    }
    selectedNameSpan.textContent = modelName;
    
    // 表示/非表示ボタンのテキスト更新
    toggleBtn.textContent = selectedModel.scene.visible ? '非表示' : '表示';
    
    // スケールスライダーを選択されたモデルの現在のスケール値に更新
    const currentScale = vrmViewer.getSelectedModelScale();
    modelScaleSlider.value = currentScale.toString();
    scaleValueSpan.textContent = currentScale.toFixed(1);
    
  } else {
    // モデルが選択されていない場合
    focusBtn.disabled = true;
    toggleBtn.disabled = true;
    duplicateBtn.disabled = true;
    deleteBtn.disabled = true;
    
    selectedInfoDiv?.classList.add('hidden');
    
    // モデルが選択されていない場合はスライダーをデフォルト値にリセット
    modelScaleSlider.value = '1.0';
    scaleValueSpan.textContent = '1.0';
    selectedNameSpan.textContent = '未選択';
    toggleBtn.textContent = '表示切替';
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

/**
 * 背景設定のイベントハンドラを設定
 */
function setupBackgroundHandlers(vrmViewer: VRMViewer): void {
  // 背景色カラーピッカー
  const backgroundColorPicker = document.getElementById('background-color') as HTMLInputElement;
  backgroundColorPicker.addEventListener('input', (event) => {
    const color = (event.target as HTMLInputElement).value;
    vrmViewer.setBackgroundColor(color);
  });

  // 透明背景ボタン
  const transparentBackgroundBtn = document.getElementById('transparent-background') as HTMLButtonElement;
  transparentBackgroundBtn.addEventListener('click', () => {
    vrmViewer.setBackgroundTransparent();
  });

  // プリセット背景色ボタン
  const presetColorButtons = document.querySelectorAll('.preset-color-btn');
  presetColorButtons.forEach(button => {
    button.addEventListener('click', () => {
      const color = (button as HTMLElement).dataset.color!;
      vrmViewer.setBackgroundColor(color);
      backgroundColorPicker.value = color;
    });
  });

  // グラデーション背景
  const gradientTopPicker = document.getElementById('gradient-top') as HTMLInputElement;
  const gradientBottomPicker = document.getElementById('gradient-bottom') as HTMLInputElement;
  const applyGradientBtn = document.getElementById('apply-gradient') as HTMLButtonElement;

  applyGradientBtn.addEventListener('click', () => {
    const topColor = gradientTopPicker.value;
    const bottomColor = gradientBottomPicker.value;
    vrmViewer.setBackgroundGradient(topColor, bottomColor);
  });

  // 背景リセットボタン
  const resetBackgroundBtn = document.getElementById('reset-background') as HTMLButtonElement;
  resetBackgroundBtn.addEventListener('click', () => {
    vrmViewer.resetBackground();
    backgroundColorPicker.value = '#2a2a2a';
  });
}

// アプリケーションを開始
main().catch(console.error);
