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
      
      <!-- 左サイドバー（シンプル化） -->
      <div id="left-sidebar">
        <h1>KurotoriVRM WebViewer</h1>
        
        <!-- VRMファイル読み込み（シンプル化） -->
        <div id="load-section">
          <button id="open-load-modal" class="primary-btn">VRMファイル読み込み</button>
          <span id="vrm-count">VRM数: 0</span>
        </div>
        
        <!-- 読み込み済みモデル一覧 -->
        <div id="vrm-list-container">
          <h3>読み込み済みモデル</h3>
          <div id="vrm-list">
            <div id="no-models-message" class="no-models">
              モデルが読み込まれていません
            </div>
          </div>
        </div>
        
        <!-- カメラ操作 -->
        <div id="camera-controls">
          <h3>カメラ操作</h3>
          <div class="control-group">
            <button id="reset-camera-default" class="control-btn">デフォルト位置</button>
            <button id="reset-camera-fit-all" class="control-btn">全体表示</button>
          </div>
          <div class="control-group">
            <button id="reset-camera-animated" class="control-btn">アニメーション</button>
          </div>
        </div>
        
        <!-- ライト設定 -->
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
            <button id="reset-lights" class="control-btn">ライトリセット</button>
          </div>
        </div>
        
        <!-- 背景設定 -->
        <div id="background-controls">
          <h3>背景設定</h3>
          <div class="control-group">
            <label for="background-color">背景色:</label>
            <input type="color" id="background-color" value="#2a2a2a" />
          </div>
          <div class="control-group">
            <button class="preset-color-btn" data-color="#ffffff">白</button>
            <button class="preset-color-btn" data-color="#000000">黒</button>
            <button class="preset-color-btn" data-color="#2a2a2a">グレー</button>
          </div>
          <div class="control-group">
            <button id="reset-background" class="control-btn">背景リセット</button>
          </div>
        </div>
        
        <!-- 全て削除ボタン -->
        <div id="danger-zone">
          <button id="clear-all-vrms" class="danger-btn">全モデル削除</button>
        </div>
      </div>
      
      <!-- VRMファイル読み込みモーダル -->
      <div id="load-modal" class="modal-overlay hidden">
        <div class="modal-content">
          <div class="modal-header">
            <h2>VRMファイル読み込み</h2>
            <button id="close-modal" class="close-btn">&times;</button>
          </div>
          <div class="modal-body">
            <!-- ファイル選択 -->
            <div class="load-section">
              <input type="file" id="vrm-file-input" accept=".vrm" />
              <label for="vrm-file-input" class="file-input-label">ファイルを選択</label>
            </div>
            
            <!-- ドラッグ&ドロップ領域 -->
            <div id="drag-drop-zone">
              ここにVRMファイルをドラッグ&ドロップ
            </div>
            
            <!-- サンプル追加ボタン -->
            <div class="sample-section">
              <h3>サンプルモデル</h3>
              <div class="sample-buttons">
                <button id="load-vrm0-sample" class="sample-btn">VRM0サンプル</button>
                <button id="load-vrm1-sample" class="sample-btn">VRM1サンプル</button>
                <button id="add-vrm0-sample" class="sample-btn">VRM0追加</button>
                <button id="add-vrm1-sample" class="sample-btn">VRM1追加</button>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <!-- 選択モデル詳細ウィンドウ -->
      <div id="model-detail-window" class="detail-window hidden">
        <div class="detail-header">
          <h3>選択モデル操作</h3>
          <button id="close-detail" class="close-btn">&times;</button>
        </div>
        <div class="detail-body">
          <div id="selected-model-info">
            <span id="selected-model-name">未選択</span>
          </div>
          
          <!-- スケール調整 -->
          <div class="control-group">
            <label for="model-scale">スケール:</label>
            <input type="range" id="model-scale" min="0.1" max="3.0" step="0.1" value="1.0" />
            <span id="scale-value">1.0</span>
          </div>
          
          <!-- 操作ボタン -->
          <div class="control-group">
            <button id="focus-selected" class="control-btn" disabled>フォーカス</button>
            <button id="toggle-visibility" class="control-btn" disabled>表示切替</button>
          </div>
          <div class="control-group">
            <button id="center-model" class="control-btn" disabled>中央配置</button>
            <button id="duplicate-selected" class="control-btn" disabled>複製</button>
          </div>
          <div class="control-group">
            <button id="delete-selected" class="danger-btn" disabled>削除</button>
          </div>
        </div>
      </div>
      
      <!-- ローディング・エラー表示 -->
      <div id="loading-indicator" class="loading-overlay hidden">
        <div class="loading-content">
          <div class="loading-spinner"></div>
          <div class="loading-text">読み込み中...</div>
        </div>
      </div>
      
      <!-- VRMメタ情報モーダル -->
      <div id="meta-info-modal" class="modal-overlay hidden">
        <div class="modal-content">
          <div class="modal-header">
            <h2>VRMメタ情報</h2>
            <button id="close-meta-modal" class="close-btn">×</button>
          </div>
          <div id="meta-info-content" class="meta-info-content">
            <!-- メタ情報がここに動的に挿入される -->
          </div>
        </div>
      </div>
      
      <div id="error-message" class="error-overlay hidden">
        <div class="error-content">
          <div class="error-text"></div>
          <button id="close-error" class="control-btn">閉じる</button>
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
  // モーダル関連の要素
  const openModalBtn = document.getElementById('open-load-modal') as HTMLButtonElement;
  const closeModalBtn = document.getElementById('close-modal') as HTMLButtonElement;
  const loadModal = document.getElementById('load-modal') as HTMLDivElement;
  
  // ファイル入力要素
  const fileInput = document.getElementById('vrm-file-input') as HTMLInputElement;
  const dragDropZone = document.getElementById('drag-drop-zone') as HTMLDivElement;
  
  // サンプルボタン
  const vrm0Button = document.getElementById('load-vrm0-sample') as HTMLButtonElement;
  const vrm1Button = document.getElementById('load-vrm1-sample') as HTMLButtonElement;
  const addVrm0Btn = document.getElementById('add-vrm0-sample') as HTMLButtonElement;
  const addVrm1Btn = document.getElementById('add-vrm1-sample') as HTMLButtonElement;

  // カメラ操作コントロール
  const resetCameraDefaultBtn = document.getElementById('reset-camera-default') as HTMLButtonElement;
  const resetCameraFitAllBtn = document.getElementById('reset-camera-fit-all') as HTMLButtonElement;
  const resetCameraAnimatedBtn = document.getElementById('reset-camera-animated') as HTMLButtonElement;

  // 詳細ウィンドウ関連
  const modelDetailWindow = document.getElementById('model-detail-window') as HTMLDivElement;
  const closeDetailBtn = document.getElementById('close-detail') as HTMLButtonElement;
  const modelScaleSlider = document.getElementById('model-scale') as HTMLInputElement;
  const scaleValueSpan = document.getElementById('scale-value') as HTMLSpanElement;
  const centerModelBtn = document.getElementById('center-model') as HTMLButtonElement;

  // 複数VRM管理コントロール
  const clearAllBtn = document.getElementById('clear-all-vrms') as HTMLButtonElement;
  const vrmCountSpan = document.getElementById('vrm-count') as HTMLSpanElement;

  // モデル選択関連のコントロール
  const focusSelectedBtn = document.getElementById('focus-selected') as HTMLButtonElement;
  const toggleVisibilityBtn = document.getElementById('toggle-visibility') as HTMLButtonElement;
  const duplicateSelectedBtn = document.getElementById('duplicate-selected') as HTMLButtonElement;
  const deleteSelectedBtn = document.getElementById('delete-selected') as HTMLButtonElement;

  // メタ情報モーダル関連の要素
  const metaInfoModal = document.getElementById('meta-info-modal') as HTMLDivElement;
  const closeMetaModalBtn = document.getElementById('close-meta-modal') as HTMLButtonElement;

  // モーダルの開閉
  openModalBtn.addEventListener('click', () => {
    loadModal.classList.remove('hidden');
  });

  closeModalBtn.addEventListener('click', () => {
    loadModal.classList.add('hidden');
  });

  // モーダル外クリックで閉じる
  loadModal.addEventListener('click', (e) => {
    if (e.target === loadModal) {
      loadModal.classList.add('hidden');
    }
  });

  // ESCキーでモーダルを閉じる
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (!loadModal.classList.contains('hidden')) {
        loadModal.classList.add('hidden');
      }
      if (!modelDetailWindow.classList.contains('hidden')) {
        modelDetailWindow.classList.add('hidden');
      }
      if (!metaInfoModal.classList.contains('hidden')) {
        hideMetaInfoModal();
      }
    }
  });

  // メタ情報モーダルの開閉
  closeMetaModalBtn.addEventListener('click', () => {
    hideMetaInfoModal();
  });

  // メタ情報モーダル外クリックで閉じる
  metaInfoModal.addEventListener('click', (e) => {
    if (e.target === metaInfoModal) {
      hideMetaInfoModal();
    }
  });

  // 詳細ウィンドウの閉じる
  closeDetailBtn.addEventListener('click', () => {
    modelDetailWindow.classList.add('hidden');
  });

  // ファイル選択
  fileInput.addEventListener('change', async (event) => {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (file) {
      loadModal.classList.add('hidden');
      await loadVRMFile(vrmViewer, file);
      updateVRMCount(vrmViewer, vrmCountSpan);
      updateModelList(vrmViewer);
      // ファイル入力をリセット
      fileInput.value = '';
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
    loadModal.classList.add('hidden');
    await loadVRMFromURL(vrmViewer, '/samples/sample_vrm1.vrm');
    updateVRMCount(vrmViewer, vrmCountSpan);
    updateModelList(vrmViewer);
  });

  // 複数VRM管理
  addVrm0Btn.addEventListener('click', async () => {
    loadModal.classList.add('hidden');
    await addVRMFromURL(vrmViewer, '/samples/sample_vrm0.vrm');
    updateVRMCount(vrmViewer, vrmCountSpan);
    updateModelList(vrmViewer);
  });

  addVrm1Btn.addEventListener('click', async () => {
    loadModal.classList.add('hidden');
    await addVRMFromURL(vrmViewer, '/samples/sample_vrm1.vrm');
    updateVRMCount(vrmViewer, vrmCountSpan);
    updateModelList(vrmViewer);
  });

  // カメラ操作
  resetCameraDefaultBtn.addEventListener('click', () => {
    vrmViewer.resetCameraToDefault();
  });

  resetCameraFitAllBtn.addEventListener('click', () => {
    vrmViewer.resetCameraToFitAll();
  });

  resetCameraAnimatedBtn.addEventListener('click', async () => {
    await vrmViewer.resetCameraAnimated(1500); // 1.5秒のアニメーション
  });

  // 選択モデル操作（詳細ウィンドウ内）
  centerModelBtn.addEventListener('click', () => {
    vrmViewer.centerModel();
  });

  modelScaleSlider.addEventListener('input', (event) => {
    const scale = parseFloat((event.target as HTMLInputElement).value);
    scaleValueSpan.textContent = scale.toFixed(1);
    vrmViewer.setModelScale(scale);
  });

  // 選択モデル操作のイベントハンドラー（メイン）
  focusSelectedBtn.addEventListener('click', () => {
    vrmViewer.focusOnSelectedModel();
  });

  toggleVisibilityBtn.addEventListener('click', () => {
    vrmViewer.toggleSelectedModelVisibility();
    updateSelectedModelControls(vrmViewer);
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
    if (confirm('選択したモデルを削除しますか？')) {
      vrmViewer.deleteSelectedModel();
      updateVRMCount(vrmViewer, vrmCountSpan);
      updateModelList(vrmViewer);
      updateSelectedModelControls(vrmViewer);
    }
  });

  // 全て削除
  clearAllBtn.addEventListener('click', () => {
    if (confirm('全てのVRMモデルを削除しますか？')) {
      vrmViewer.removeAllVRMs();
      updateVRMCount(vrmViewer, vrmCountSpan);
      updateModelList(vrmViewer);
      updateSelectedModelControls(vrmViewer);
      modelDetailWindow.classList.add('hidden');
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
  
  if (ambientLightSlider && ambientValue) {
    ambientLightSlider.addEventListener('input', (event) => {
      const intensity = parseFloat((event.target as HTMLInputElement).value);
      vrmViewer.setAmbientLightIntensity(intensity);
      ambientValue.textContent = intensity.toFixed(1);
    });
  }

  // 方向性ライト調整
  const directionalLightSlider = document.getElementById('directional-light') as HTMLInputElement;
  const directionalValue = document.getElementById('directional-value') as HTMLSpanElement;
  
  if (directionalLightSlider && directionalValue) {
    directionalLightSlider.addEventListener('input', (event) => {
      const intensity = parseFloat((event.target as HTMLInputElement).value);
      vrmViewer.setDirectionalLightIntensity(intensity);
      directionalValue.textContent = intensity.toFixed(1);
    });
  }

  // ライトリセットボタン
  const resetLightsBtn = document.getElementById('reset-lights') as HTMLButtonElement;
  if (resetLightsBtn) {
    resetLightsBtn.addEventListener('click', () => {
      vrmViewer.resetLights();
      // スライダーの値もリセット
      if (ambientLightSlider && ambientValue) {
        ambientLightSlider.value = '0.3';
        ambientValue.textContent = '0.3';
      }
      if (directionalLightSlider && directionalValue) {
        directionalLightSlider.value = '1.0';
        directionalValue.textContent = '1.0';
      }
    });
  }
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
  
  // 詳細ウィンドウを非表示
  const modelDetailWindow = document.getElementById('model-detail-window') as HTMLDivElement;
  if (modelDetailWindow) {
    modelDetailWindow.classList.add('hidden');
  }
  
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
    const vrmMeta = vrm.vrmMeta; // 修正: vrmMetaから取得
    if (vrmMeta && vrmMeta.name) {
      modelName = vrmMeta.name;
    }
    
    modelItem.innerHTML = `
      <div class="model-info">
        <div class="model-name">${modelName}</div>
        <div class="model-index">Index: ${index}</div>
      </div>
      <div class="model-actions">
        <button class="info-btn" data-index="${index}" title="メタ情報を表示">Info</button>
      </div>
    `;
    
    // クリックイベントを追加
    modelItem.addEventListener('click', (e) => {
      // Infoボタンがクリックされた場合は選択せずにメタ情報を表示
      if ((e.target as HTMLElement).classList.contains('info-btn')) {
        e.stopPropagation();
        showMetaInfoModal(vrmViewer, index);
      } else {
        selectModelInList(vrmViewer, index);
      }
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
  
  // 詳細ウィンドウを表示
  const modelDetailWindow = document.getElementById('model-detail-window') as HTMLDivElement;
  if (modelDetailWindow) {
    modelDetailWindow.classList.remove('hidden');
  }
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
  const centerBtn = document.getElementById('center-model') as HTMLButtonElement;
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
    if (centerBtn) centerBtn.disabled = false;
    
    selectedInfoDiv?.classList.remove('hidden');
    
    // モデル名の表示（updateModelListと同じロジックを使用）
    let modelName = `Model ${selectedIndex + 1}`;
    const vrmMeta = (selectedModel as any).vrmMeta; // 修正: vrmMetaから取得
    if (vrmMeta && vrmMeta.name) {
      modelName = vrmMeta.name;
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
    
    if (centerBtn) centerBtn.disabled = true;
    
    selectedInfoDiv?.classList.add('hidden');
    
    // モデルが選択されていない場合はスライダーをデフォルト値にリセット
    modelScaleSlider.value = '1.0';
    scaleValueSpan.textContent = '1.0';
    selectedNameSpan.textContent = '未選択';
    toggleBtn.textContent = '表示切替';
    
    // 詳細ウィンドウを非表示
    const modelDetailWindow = document.getElementById('model-detail-window') as HTMLDivElement;
    if (modelDetailWindow) {
      modelDetailWindow.classList.add('hidden');
    }
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
  const errorText = errorElement?.querySelector('.error-text') as HTMLDivElement;
  
  if (errorElement && errorText) {
    errorText.textContent = message;
    errorElement.classList.remove('hidden');
    
    // エラー閉じるボタンのイベントリスナーを設定
    const closeErrorBtn = document.getElementById('close-error') as HTMLButtonElement;
    if (closeErrorBtn) {
      closeErrorBtn.onclick = () => {
        errorElement.classList.add('hidden');
      };
    }
    
    // 5秒後に自動で非表示
    setTimeout(() => {
      errorElement.classList.add('hidden');
    }, 5000);
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
  if (backgroundColorPicker) {
    backgroundColorPicker.addEventListener('input', (event) => {
      const color = (event.target as HTMLInputElement).value;
      vrmViewer.setBackgroundColor(color);
    });
  }

  // プリセット背景色ボタン
  const presetColorButtons = document.querySelectorAll('.preset-color-btn');
  presetColorButtons.forEach(button => {
    button.addEventListener('click', () => {
      const color = (button as HTMLElement).dataset.color!;
      vrmViewer.setBackgroundColor(color);
      if (backgroundColorPicker) {
        backgroundColorPicker.value = color;
      }
    });
  });

  // 背景リセットボタン
  const resetBackgroundBtn = document.getElementById('reset-background') as HTMLButtonElement;
  if (resetBackgroundBtn) {
    resetBackgroundBtn.addEventListener('click', () => {
      vrmViewer.resetBackground();
      if (backgroundColorPicker) {
        backgroundColorPicker.value = '#2a2a2a';
      }
    });
  }
}

/**
 * VRMメタ情報モーダルを表示
 */
function showMetaInfoModal(vrmViewer: VRMViewer, index: number): void {
  const models = vrmViewer.getVRMModels();
  if (index < 0 || index >= models.length) return;

  const vrm = models[index];
  const modal = document.getElementById('meta-info-modal') as HTMLDivElement;
  const content = document.getElementById('meta-info-content') as HTMLDivElement;

  if (!modal || !content) return;

  // メタ情報の内容を生成
  content.innerHTML = generateMetaInfoHTML(vrm, index);

  // モーダルを表示
  modal.classList.remove('hidden');
}

/**
 * VRMメタ情報のHTMLを生成
 */
function generateMetaInfoHTML(vrm: any, index: number): string {
  const vrmMeta = vrm.vrmMeta; // 正規化されたメタ情報から取得
  if (!vrmMeta) {
    return '<div class="meta-info-section"><p>メタ情報が利用できません。</p></div>';
  }

  let html = '';

  // 基本情報セクション
  html += '<div class="meta-info-section">';
  html += '<h3>基本情報</h3>';
  
  // モデル名
  const modelName = vrmMeta.name || `Model ${index + 1}`;
  html += `<div class="meta-info-field">
    <span class="meta-info-label">モデル名:</span>
    <span class="meta-info-value">${modelName}</span>
  </div>`;

  // 作者
  if (vrmMeta.authors && vrmMeta.authors.length > 0) {
    html += `<div class="meta-info-field">
      <span class="meta-info-label">作者:</span>
      <span class="meta-info-value">${vrmMeta.authors.join(', ')}</span>
    </div>`;
  }

  // VRMバージョン表示
  html += `<div class="meta-info-field">
    <span class="meta-info-label">VRMバージョン:</span>
    <span class="meta-info-value"><span class="meta-version-badge">VRM ${vrmMeta.detectedVersion}</span></span>
  </div>`;

  // バージョン固有の詳細情報
  if (vrmMeta.isVRM0) {
    // VRM0系の場合はversion情報も表示
    if (vrmMeta.version) {
      html += `<div class="meta-info-field">
        <span class="meta-info-label">モデルバージョン:</span>
        <span class="meta-info-value">${vrmMeta.version}</span>
      </div>`;
    }
  }

  html += '</div>';

  // ライセンス情報セクション
  html += '<div class="meta-info-section">';
  html += '<h3>ライセンス情報</h3>';

  if (vrmMeta.isVRM1) {
    // VRM1.0形式
    if (vrmMeta.licenseUrl) {
      html += `<div class="meta-info-field">
        <span class="meta-info-label">ライセンス:</span>
        <span class="meta-info-value"><a href="${vrmMeta.licenseUrl}" target="_blank" rel="noopener">${vrmMeta.licenseUrl}</a></span>
      </div>`;
    }

    if (vrmMeta.commercialUsage) {
      const commercialText = vrmMeta.commercialUsage === 'personalNonProfit' ? '個人・非営利のみ' : 
                            vrmMeta.commercialUsage === 'personalProfit' ? '個人利用（営利含む）' : 
                            vrmMeta.commercialUsage === 'corporation' ? '企業利用可' : vrmMeta.commercialUsage;
      html += `<div class="meta-info-field">
        <span class="meta-info-label">商用利用:</span>
        <span class="meta-info-value"><span class="meta-license-badge">${commercialText}</span></span>
      </div>`;
    }

    if (vrmMeta.modification) {
      const modificationText = vrmMeta.modification === 'prohibited' ? '禁止' : 
                              vrmMeta.modification === 'allowModification' ? '改変許可' : 
                              vrmMeta.modification === 'allowModificationRedistribution' ? '改変・再配布許可' : vrmMeta.modification;
      html += `<div class="meta-info-field">
        <span class="meta-info-label">改変:</span>
        <span class="meta-info-value"><span class="meta-license-badge">${modificationText}</span></span>
      </div>`;
    }
  } else {
    // VRM0.x形式のライセンス情報
    if (vrmMeta.commercialUssageName !== undefined) {
      const commercial = vrmMeta.commercialUssageName;
      const commercialText = commercial === 'Allow' ? '許可' : commercial === 'Disallow' ? '禁止' : commercial;
      const commercialClass = commercial === 'Allow' ? 'allowed' : 'disallowed';
      html += `<div class="meta-info-field">
        <span class="meta-info-label">商用利用:</span>
        <span class="meta-info-value"><span class="meta-license-badge ${commercialClass}">${commercialText}</span></span>
      </div>`;
    }

    if (vrmMeta.allowedUserName !== undefined) {
      const allowedUser = vrmMeta.allowedUserName;
      const allowedUserText = allowedUser === 'OnlyAuthor' ? '作者のみ' : 
                             allowedUser === 'ExplicitlyLicensedPerson' ? 'ライセンス対象者のみ' : 
                             allowedUser === 'Everyone' ? '全員' : allowedUser;
      html += `<div class="meta-info-field">
        <span class="meta-info-label">利用許可:</span>
        <span class="meta-info-value"><span class="meta-license-badge">${allowedUserText}</span></span>
      </div>`;
    }

    if (vrmMeta.violentUssageName !== undefined) {
      const violentText = vrmMeta.violentUssageName === 'Allow' ? '許可' : 
                         vrmMeta.violentUssageName === 'Disallow' ? '禁止' : vrmMeta.violentUssageName;
      html += `<div class="meta-info-field">
        <span class="meta-info-label">暴力表現:</span>
        <span class="meta-info-value"><span class="meta-license-badge">${violentText}</span></span>
      </div>`;
    }

    if (vrmMeta.sexualUssageName !== undefined) {
      const sexualText = vrmMeta.sexualUssageName === 'Allow' ? '許可' : 
                        vrmMeta.sexualUssageName === 'Disallow' ? '禁止' : vrmMeta.sexualUssageName;
      html += `<div class="meta-info-field">
        <span class="meta-info-label">性的表現:</span>
        <span class="meta-info-value"><span class="meta-license-badge">${sexualText}</span></span>
      </div>`;
    }

    if (vrmMeta.licenseName) {
      html += `<div class="meta-info-field">
        <span class="meta-info-label">ライセンス:</span>
        <span class="meta-info-value">${vrmMeta.licenseName}</span>
      </div>`;
    }
  }

  // 共通のライセンス関連情報
  if (vrmMeta.otherLicenseUrl) {
    html += `<div class="meta-info-field">
      <span class="meta-info-label">ライセンス詳細:</span>
      <span class="meta-info-value"><a href="${vrmMeta.otherLicenseUrl}" target="_blank" rel="noopener">${vrmMeta.otherLicenseUrl}</a></span>
    </div>`;
  }

  html += '</div>';

  // 連絡先・その他情報セクション
  if (vrmMeta.contactInformation || vrmMeta.reference || vrmMeta.references) {
    html += '<div class="meta-info-section">';
    html += '<h3>連絡先・その他</h3>';

    if (vrmMeta.contactInformation) {
      html += `<div class="meta-info-field">
        <span class="meta-info-label">連絡先:</span>
        <span class="meta-info-value">${vrmMeta.contactInformation}</span>
      </div>`;
    }

    // VRM0系のreference
    if (vrmMeta.reference) {
      html += `<div class="meta-info-field">
        <span class="meta-info-label">参照:</span>
        <span class="meta-info-value">${vrmMeta.reference}</span>
      </div>`;
    }

    // VRM1系のreferences
    if (vrmMeta.references && vrmMeta.references.length > 0) {
      html += `<div class="meta-info-field">
        <span class="meta-info-label">参照:</span>
        <span class="meta-info-value">${vrmMeta.references.join(', ')}</span>
      </div>`;
    }

    // VRM1系のcopyright情報
    if (vrmMeta.copyrightInformation) {
      html += `<div class="meta-info-field">
        <span class="meta-info-label">著作権情報:</span>
        <span class="meta-info-value">${vrmMeta.copyrightInformation}</span>
      </div>`;
    }

    html += '</div>';
  }

  // サムネイル画像
  if (vrmMeta.thumbnailImage) {
    html += '<div class="meta-info-section">';
    html += '<h3>サムネイル</h3>';
    html += `<div class="meta-info-field">
      <img src="${vrmMeta.thumbnailImage}" alt="サムネイル" class="meta-thumbnail" />
    </div>`;
    html += '</div>';
  }

  return html;
}

/**
 * メタ情報モーダルを閉じる
 */
function hideMetaInfoModal(): void {
  const modal = document.getElementById('meta-info-modal') as HTMLDivElement;
  if (modal) {
    modal.classList.add('hidden');
  }
}

// アプリケーションを開始
main().catch(console.error);
