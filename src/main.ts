import './style.css';
import * as THREE from 'three';
import { VRMViewerRefactored } from './core/VRMViewerRefactored';
import { eventBus } from './utils/EventBus';

/**
 * リファクタリング版アプリケーションのエントリーポイント
 * 元のmain.tsと同等の全機能を実装
 */
async function main() {
  // アプリケーションのコンテナを設定
  const app = document.querySelector<HTMLDivElement>('#app')!;
  app.innerHTML = `
    <div id="vrm-viewer-container">
      <canvas id="vrm-canvas"></canvas>
      
      <!-- 左サイドバー -->
      <div id="left-sidebar">
        <h1>KurotoriVRM WebViewer</h1>
        
        <!-- VRMファイル読み込み -->
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
            <label for="ambient-color">環境光色:</label>
            <input type="color" id="ambient-color" value="#ffffff" />
          </div>
          <div class="control-group">
            <label for="directional-light">方向性ライト:</label>
            <input type="range" id="directional-light" min="0.0" max="3.0" step="0.1" value="1.0" />
            <span id="directional-value">1.0</span>
          </div>
          <div class="control-group">
            <label for="directional-color">方向性ライト色:</label>
            <input type="color" id="directional-color" value="#ffffff" />
          </div>
          <div class="control-group">
            <label for="rim-light">リムライト:</label>
            <input type="range" id="rim-light" min="0.0" max="2.0" step="0.1" value="0.5" />
            <span id="rim-value">0.5</span>
          </div>
          <div class="control-group">
            <label for="rim-color">リムライト色:</label>
            <input type="color" id="rim-color" value="#66ccff" />
          </div>
          <div class="control-group">
            <button id="toggle-light-helpers" class="control-btn">ライトヘルパー表示</button>
            <button id="select-directional-light" class="control-btn">方向性ライト選択</button>
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
            <input type="checkbox" id="grid-checkbox" />
            <label for="grid-checkbox">グリッド表示</label>
          </div>
          <div class="control-group">
            <button id="reset-background" class="control-btn">背景リセット</button>
          </div>
        </div>
      </div>
      
      <!-- 右下：選択中モデル設定モーダル -->
      <div id="selected-model-modal" class="bottom-right-modal" style="display: none;">
        <div class="modal-header">
          <h3>選択中モデル設定</h3>
          <span class="close" id="model-modal-close">&times;</span>
        </div>
        <div class="modal-body">
          <div id="model-info">
            <p>選択中: <span id="selected-model-name">なし</span></p>
          </div>
          <div class="control-group">
            <button id="reset-model" class="control-btn">リセット</button>
            <button id="focus-model" class="control-btn">フォーカス</button>
          </div>
          <div class="control-group">
            <button id="toggle-root-transform" class="control-btn">ルート操作モード</button>
          </div>
          <!-- ルート操作設定（ルート操作モード時のみ表示） -->
          <div id="root-transform-settings" class="control-group" style="display: none;">
            <div class="radio-group">
              <input type="radio" id="root-translate-mode" name="root-mode" value="translate" checked />
              <label for="root-translate-mode">移動</label>
              <input type="radio" id="root-rotate-mode" name="root-mode" value="rotate" />
              <label for="root-rotate-mode">回転</label>
            </div>
            <div class="radio-group">
              <label>座標系:</label>
              <input type="radio" id="root-world-space" name="root-coordinate-space" value="world" checked />
              <label for="root-world-space">ワールド</label>
              <input type="radio" id="root-local-space" name="root-coordinate-space" value="local" />
              <label for="root-local-space">ローカル</label>
            </div>
          </div>
          <div class="control-group">
            <label for="model-scale">スケール:</label>
            <input type="range" id="model-scale" min="0.1" max="3.0" step="0.1" value="1.0" />
            <span id="scale-value">1.0</span>
          </div>
          <div class="control-group">
            <button id="toggle-model-visibility" class="control-btn">表示/非表示</button>
            <button id="duplicate-model" class="control-btn">複製</button>
          </div>
          <div class="control-group">
            <button id="delete-selected-model" class="control-btn danger-btn">選択削除</button>
            <button id="delete-all-models" class="control-btn danger-btn">全削除</button>
          </div>
        </div>
        
        <!-- ボーン操作セクション -->
        <div class="modal-section">
          <div class="modal-header">
            <h3>ボーン操作</h3>
          </div>
          <div class="modal-body">
            <div class="control-group">
              <button id="toggle-bone-visibility" class="control-btn">ボーン表示切替</button>
              <button id="reset-all-bones" class="control-btn">ポーズリセット</button>
            </div>
            <div class="control-group">
              <input type="radio" id="bone-rotate-mode" name="bone-mode" value="rotate" checked />
              <label for="bone-rotate-mode">回転</label>
              <input type="radio" id="bone-translate-mode" name="bone-mode" value="translate" />
              <label for="bone-translate-mode">移動</label>
            </div>
            <div class="control-group">
              <label>座標系:</label>
              <input type="radio" id="bone-world-space" name="coordinate-space" value="world" checked />
              <label for="bone-world-space">ワールド</label>
              <input type="radio" id="bone-local-space" name="coordinate-space" value="local" />
              <label for="bone-local-space">ローカル</label>
            </div>
            <div id="selected-bone-info">
              <p>選択中ボーン: <span id="selected-bone-name">なし</span></p>
            </div>
          </div>
        </div>
      </div>
      
      <!-- ファイル読み込みモーダル -->
      <div id="load-modal" class="modal" style="display: none;">
        <div class="modal-content">
          <div class="modal-header">
            <h2>VRMファイル読み込み</h2>
            <span class="close" id="modal-close">&times;</span>
          </div>
          <div class="modal-body">
            <div class="load-options">
              <div class="load-option">
                <h3>ローカルファイル</h3>
                <input type="file" id="file-input" accept=".vrm" multiple />
                <p class="note">複数のVRMファイルを同時に選択できます</p>
              </div>
              <div class="load-option">
                <h3>ドラッグ&ドロップ</h3>
                <div id="drop-zone" class="drop-zone">
                  <div class="drop-zone-content">
                    <div class="drop-icon">📁</div>
                    <div class="drop-text">VRMファイルをここにドロップ</div>
                    <div class="drop-subtext">または、クリックしてファイルを選択</div>
                  </div>
                </div>
                <p class="note">複数のVRMファイルを同時にドロップできます</p>
              </div>
              <div class="load-option">
                <h3>サンプルファイル</h3>
                <button id="load-sample-vrm0" class="control-btn">サンプル VRM0</button>
                <button id="load-sample-vrm1" class="control-btn">サンプル VRM1</button>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <!-- メタ情報モーダル -->
      <div id="meta-info-modal" class="modal" style="display: none;">
        <div class="modal-content">
          <div class="modal-header">
            <h2>VRM メタ情報</h2>
            <span class="close" id="meta-modal-close">&times;</span>
          </div>
          <div class="modal-body">
            <div id="meta-info-content">
              <!-- メタ情報がここに動的に挿入されます -->
            </div>
          </div>
        </div>
      </div>
    </div>
  `;

  // Canvas要素を取得
  const canvas = document.querySelector<HTMLCanvasElement>('#vrm-canvas')!;
  
  // VRMビューワーを初期化
  const vrmViewer = new VRMViewerRefactored(canvas);
  await vrmViewer.initialize();

  // 各種イベントハンドラーをセットアップ
  setupFileInputHandlers(vrmViewer);
  setupCameraHandlers(vrmViewer);
  setupLightingHandlers(vrmViewer);
  setupBackgroundHandlers(vrmViewer);
  setupModelControlHandlers(vrmViewer);
  setupBoneControlHandlers(vrmViewer);
  setupKeyboardHandlers(vrmViewer);
  setupModalHandlers(vrmViewer);
  
  // イベントバスからのイベントを監視してUIを更新
  setupEventListeners(vrmViewer);

  console.log('リファクタリング版VRMビューワーが起動しました（フル機能版）');
}

/**
 * ファイル入力関連のイベントハンドラーを設定
 */
function setupFileInputHandlers(vrmViewer: VRMViewerRefactored): void {
  const fileInput = document.getElementById('file-input') as HTMLInputElement;
  const dropZone = document.getElementById('drop-zone') as HTMLElement;
  const loadSampleVrm0Btn = document.getElementById('load-sample-vrm0') as HTMLButtonElement;
  const loadSampleVrm1Btn = document.getElementById('load-sample-vrm1') as HTMLButtonElement;

  // ローカルファイル読み込み
  fileInput?.addEventListener('change', async (event) => {
    const files = (event.target as HTMLInputElement).files;
    if (files && files.length > 0) {
      await loadFiles(files, vrmViewer);
      // ファイル選択をリセット
      fileInput.value = '';
    }
  });

  // ドラッグ&ドロップ機能
  if (dropZone) {
    // ドロップ領域クリックでファイル選択
    dropZone.addEventListener('click', () => {
      const hiddenFileInput = document.createElement('input');
      hiddenFileInput.type = 'file';
      hiddenFileInput.accept = '.vrm';
      hiddenFileInput.multiple = true;
      hiddenFileInput.style.display = 'none';
      
      hiddenFileInput.addEventListener('change', async (event) => {
        const files = (event.target as HTMLInputElement).files;
        if (files && files.length > 0) {
          await loadFiles(files, vrmViewer);
        }
      });
      
      document.body.appendChild(hiddenFileInput);
      hiddenFileInput.click();
      document.body.removeChild(hiddenFileInput);
    });

    // ドラッグイベント
    dropZone.addEventListener('dragover', (e) => {
      e.preventDefault();
      dropZone.classList.add('dragover');
    });

    dropZone.addEventListener('dragleave', (e) => {
      e.preventDefault();
      dropZone.classList.remove('dragover');
    });

    dropZone.addEventListener('drop', async (e) => {
      e.preventDefault();
      dropZone.classList.remove('dragover');
      
      const files = e.dataTransfer?.files;
      if (files && files.length > 0) {
        await loadFiles(files, vrmViewer);
      }
    });
  }

  // ファイル読み込み共通処理
  async function loadFiles(files: FileList, vrmViewer: VRMViewerRefactored) {
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (!file.name.toLowerCase().endsWith('.vrm')) {
        alert(`${file.name} はVRMファイルではありません`);
        continue;
      }
      
      try {
        await vrmViewer.loadVRMFromFile(file);
        console.log(`VRMファイル ${file.name} が読み込まれました`);
      } catch (error) {
        console.error(`VRM読み込みエラー (${file.name}):`, error);
        alert(`VRMファイル ${file.name} の読み込みに失敗しました`);
      }
    }
    closeModal('load-modal');
  }

  // サンプルファイル読み込み
  loadSampleVrm0Btn?.addEventListener('click', async () => {
    try {
      await vrmViewer.loadVRMFromURL('/samples/sample_vrm0.vrm');
      closeModal('load-modal');
    } catch (error) {
      console.error('サンプルVRM0読み込みエラー:', error);
      alert('サンプルVRM0の読み込みに失敗しました');
    }
  });

  loadSampleVrm1Btn?.addEventListener('click', async () => {
    try {
      await vrmViewer.loadVRMFromURL('/samples/sample_vrm1.vrm');
      closeModal('load-modal');
    } catch (error) {
      console.error('サンプルVRM1読み込みエラー:', error);
      alert('サンプルVRM1の読み込みに失敗しました');
    }
  });
}

/**
 * カメラ操作関連のイベントハンドラーを設定
 */
function setupCameraHandlers(vrmViewer: VRMViewerRefactored): void {
  const resetCameraDefaultBtn = document.getElementById('reset-camera-default') as HTMLButtonElement;
  const resetCameraFitAllBtn = document.getElementById('reset-camera-fit-all') as HTMLButtonElement;
  const resetCameraAnimatedBtn = document.getElementById('reset-camera-animated') as HTMLButtonElement;

  resetCameraDefaultBtn?.addEventListener('click', () => {
    vrmViewer.resetCameraToDefault();
  });

  resetCameraFitAllBtn?.addEventListener('click', () => {
    vrmViewer.resetCameraToFitAll();
  });

  resetCameraAnimatedBtn?.addEventListener('click', async () => {
    await vrmViewer.resetCameraAnimated(1500);
  });
}

/**
 * ライト制御関連のイベントハンドラーを設定
 */
function setupLightingHandlers(vrmViewer: VRMViewerRefactored): void {
  const ambientLightSlider = document.getElementById('ambient-light') as HTMLInputElement;
  const directionalLightSlider = document.getElementById('directional-light') as HTMLInputElement;
  const rimLightSlider = document.getElementById('rim-light') as HTMLInputElement;
  
  const ambientColorPicker = document.getElementById('ambient-color') as HTMLInputElement;
  const directionalColorPicker = document.getElementById('directional-color') as HTMLInputElement;
  const rimColorPicker = document.getElementById('rim-color') as HTMLInputElement;
  
  const ambientValueSpan = document.getElementById('ambient-value') as HTMLSpanElement;
  const directionalValueSpan = document.getElementById('directional-value') as HTMLSpanElement;
  const rimValueSpan = document.getElementById('rim-value') as HTMLSpanElement;
  
  const toggleLightHelpersBtn = document.getElementById('toggle-light-helpers') as HTMLButtonElement;
  const selectDirectionalLightBtn = document.getElementById('select-directional-light') as HTMLButtonElement;
  const resetLightsBtn = document.getElementById('reset-lights') as HTMLButtonElement;

  // ライト強度スライダー
  ambientLightSlider?.addEventListener('input', (e) => {
    const intensity = parseFloat((e.target as HTMLInputElement).value);
    vrmViewer.setAmbientLightIntensity(intensity);
    if (ambientValueSpan) ambientValueSpan.textContent = intensity.toFixed(1);
  });

  directionalLightSlider?.addEventListener('input', (e) => {
    const intensity = parseFloat((e.target as HTMLInputElement).value);
    vrmViewer.setDirectionalLightIntensity(intensity);
    if (directionalValueSpan) directionalValueSpan.textContent = intensity.toFixed(1);
  });

  rimLightSlider?.addEventListener('input', (e) => {
    const intensity = parseFloat((e.target as HTMLInputElement).value);
    vrmViewer.setRimLightIntensity(intensity);
    if (rimValueSpan) rimValueSpan.textContent = intensity.toFixed(1);
  });

  // ライトカラーピッカー
  ambientColorPicker?.addEventListener('input', (e) => {
    const color = (e.target as HTMLInputElement).value;
    vrmViewer.setAmbientLightColor(new THREE.Color(color));
  });

  directionalColorPicker?.addEventListener('input', (e) => {
    const color = (e.target as HTMLInputElement).value;
    vrmViewer.setDirectionalLightColor(new THREE.Color(color));
  });

  rimColorPicker?.addEventListener('input', (e) => {
    const color = (e.target as HTMLInputElement).value;
    vrmViewer.setRimLightColor(new THREE.Color(color));
  });

  // ライトヘルパー表示切替
  toggleLightHelpersBtn?.addEventListener('click', () => {
    const currentVisible = vrmViewer.getLightHelpersVisible();
    vrmViewer.setLightHelpersVisible(!currentVisible);
    updateLightHelperButtonText(vrmViewer);
  });

  // ライト選択機能（実装予定）
  selectDirectionalLightBtn?.addEventListener('click', () => {
    // TODO: ライト選択機能の実装
    const isSelected = vrmViewer.isDirectionalLightSelected();
    selectDirectionalLightBtn.textContent = isSelected ? '方向性ライト選択' : '選択解除';
  });

  // ライトリセット
  resetLightsBtn?.addEventListener('click', () => {
    vrmViewer.resetLights();
    
    // UI要素もリセット
    if (ambientLightSlider) ambientLightSlider.value = '0.3';
    if (directionalLightSlider) directionalLightSlider.value = '1.0';
    if (rimLightSlider) rimLightSlider.value = '0.5';
    if (ambientColorPicker) ambientColorPicker.value = '#ffffff';
    if (directionalColorPicker) directionalColorPicker.value = '#ffffff';
    if (rimColorPicker) rimColorPicker.value = '#66ccff';
    if (ambientValueSpan) ambientValueSpan.textContent = '0.3';
    if (directionalValueSpan) directionalValueSpan.textContent = '1.0';
    if (rimValueSpan) rimValueSpan.textContent = '0.5';
    
    updateLightHelperButtonText(vrmViewer);
  });

  // 初期状態の更新
  updateLightHelperButtonText(vrmViewer);
}

/**
 * 背景制御関連のイベントハンドラーを設定
 */
function setupBackgroundHandlers(vrmViewer: VRMViewerRefactored): void {
  const backgroundColorPicker = document.getElementById('background-color') as HTMLInputElement;
  const presetColorBtns = document.querySelectorAll('.preset-color-btn') as NodeListOf<HTMLButtonElement>;
  const gridCheckbox = document.getElementById('grid-checkbox') as HTMLInputElement;
  const resetBackgroundBtn = document.getElementById('reset-background') as HTMLButtonElement;

  // 背景色ピッカー
  backgroundColorPicker?.addEventListener('input', (e) => {
    const color = (e.target as HTMLInputElement).value;
    vrmViewer.setBackgroundColor(color);
  });

  // プリセット色ボタン
  presetColorBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const color = btn.dataset.color;
      if (color) {
        vrmViewer.setBackgroundColor(color);
        if (backgroundColorPicker) backgroundColorPicker.value = color;
      }
    });
  });

  // グリッド表示切替（チェックボックス）
  gridCheckbox?.addEventListener('change', (e) => {
    const isChecked = (e.target as HTMLInputElement).checked;
    vrmViewer.setGridVisible(isChecked);
  });

  // 背景リセット
  resetBackgroundBtn?.addEventListener('click', () => {
    vrmViewer.resetBackground();
    if (backgroundColorPicker) backgroundColorPicker.value = '#2a2a2a';
  });
  
  // 初期状態でチェックボックスの状態を設定
  if (gridCheckbox) {
    gridCheckbox.checked = vrmViewer.isGridVisible();
  }
}

/**
 * モデル制御関連のイベントハンドラーを設定
 */
function setupModelControlHandlers(vrmViewer: VRMViewerRefactored): void {
  const resetModelBtn = document.getElementById('reset-model') as HTMLButtonElement;
  const focusModelBtn = document.getElementById('focus-model') as HTMLButtonElement;
  const modelScaleSlider = document.getElementById('model-scale') as HTMLInputElement;
  const scaleValueSpan = document.getElementById('scale-value') as HTMLSpanElement;
  const toggleModelVisibilityBtn = document.getElementById('toggle-model-visibility') as HTMLButtonElement;
  const duplicateModelBtn = document.getElementById('duplicate-model') as HTMLButtonElement;
  const deleteSelectedModelBtn = document.getElementById('delete-selected-model') as HTMLButtonElement;
  const deleteAllModelsBtn = document.getElementById('delete-all-models') as HTMLButtonElement;

  resetModelBtn?.addEventListener('click', () => {
    vrmViewer.resetModel();
  });

  focusModelBtn?.addEventListener('click', () => {
    vrmViewer.focusOnSelectedModel();
  });

  modelScaleSlider?.addEventListener('input', (e) => {
    const scale = parseFloat((e.target as HTMLInputElement).value);
    vrmViewer.setModelScale(scale);
    if (scaleValueSpan) scaleValueSpan.textContent = scale.toFixed(1);
  });

  toggleModelVisibilityBtn?.addEventListener('click', () => {
    const visible = vrmViewer.toggleSelectedModelVisibility();
    toggleModelVisibilityBtn.textContent = visible ? '非表示' : '表示';
  });

  duplicateModelBtn?.addEventListener('click', async () => {
    const success = await vrmViewer.duplicateSelectedModel();
    if (success) {
      console.log('モデルが複製されました');
    } else {
      alert('モデルの複製に失敗しました');
    }
  });

  deleteSelectedModelBtn?.addEventListener('click', () => {
    if (confirm('選択したモデルを削除しますか？')) {
      vrmViewer.deleteSelectedModel();
    }
  });

  deleteAllModelsBtn?.addEventListener('click', () => {
    if (confirm('全てのVRMモデルを削除しますか？')) {
      vrmViewer.removeAllVRMs();
    }
  });

  // VRMルートTransformControls切り替えボタン
  const toggleRootTransformBtn = document.getElementById('toggle-root-transform') as HTMLButtonElement;
  const rootTransformSettings = document.getElementById('root-transform-settings') as HTMLDivElement;
  
  toggleRootTransformBtn?.addEventListener('click', () => {
    const isVisible = vrmViewer.toggleRootTransform();
    toggleRootTransformBtn.textContent = isVisible ? 'ルート操作終了' : 'ルート操作モード';
    
    // ルート操作設定の表示/非表示を切り替え
    if (rootTransformSettings) {
      rootTransformSettings.style.display = isVisible ? 'block' : 'none';
    }
  });

  // ルート操作モード切り替え（移動・回転）
  const rootTranslateModeRadio = document.getElementById('root-translate-mode') as HTMLInputElement;
  const rootRotateModeRadio = document.getElementById('root-rotate-mode') as HTMLInputElement;
  
  rootTranslateModeRadio?.addEventListener('change', () => {
    if (rootTranslateModeRadio.checked) {
      vrmViewer.setRootTransformMode('translate');
      console.log('ルート操作: 移動モードに変更');
    }
  });
  
  rootRotateModeRadio?.addEventListener('change', () => {
    if (rootRotateModeRadio.checked) {
      vrmViewer.setRootTransformMode('rotate');
      console.log('ルート操作: 回転モードに変更');
    }
  });

  // ルート座標系切り替え（ワールド・ローカル）
  const rootWorldSpaceRadio = document.getElementById('root-world-space') as HTMLInputElement;
  const rootLocalSpaceRadio = document.getElementById('root-local-space') as HTMLInputElement;
  
  rootWorldSpaceRadio?.addEventListener('change', () => {
    if (rootWorldSpaceRadio.checked) {
      vrmViewer.setRootTransformSpace('world');
      console.log('ルート操作: ワールド座標系に変更');
    }
  });
  
  rootLocalSpaceRadio?.addEventListener('change', () => {
    if (rootLocalSpaceRadio.checked) {
      vrmViewer.setRootTransformSpace('local');
      console.log('ルート操作: ローカル座標系に変更');
    }
  });
}

/**
 * ボーン制御関連のイベントハンドラーを設定
 */
function setupBoneControlHandlers(vrmViewer: VRMViewerRefactored): void {
  const toggleBoneVisibilityBtn = document.getElementById('toggle-bone-visibility') as HTMLButtonElement;
  const resetAllBonesBtn = document.getElementById('reset-all-bones') as HTMLButtonElement;
  const boneRotateModeRadio = document.getElementById('bone-rotate-mode') as HTMLInputElement;
  const boneTranslateModeRadio = document.getElementById('bone-translate-mode') as HTMLInputElement;
  const boneWorldSpaceRadio = document.getElementById('bone-world-space') as HTMLInputElement;
  const boneLocalSpaceRadio = document.getElementById('bone-local-space') as HTMLInputElement;

  toggleBoneVisibilityBtn?.addEventListener('click', () => {
    const visible = vrmViewer.toggleBoneVisibility();
    toggleBoneVisibilityBtn.textContent = visible ? 'ボーン非表示' : 'ボーン表示';
  });

  resetAllBonesBtn?.addEventListener('click', () => {
    vrmViewer.resetAllBonePoses();
  });

  boneRotateModeRadio?.addEventListener('change', () => {
    if (boneRotateModeRadio.checked) {
      vrmViewer.setBoneTransformMode('rotate');
    }
  });

  boneTranslateModeRadio?.addEventListener('change', () => {
    if (boneTranslateModeRadio.checked) {
      // 移動モードに切り替えを試行
      const wasTranslatable = vrmViewer.isSelectedBoneTranslatable();
      
      // モード切り替えを実行
      vrmViewer.setBoneTransformMode('translate');
      
      // 制限された場合のフィードバック
      if (!wasTranslatable) {
        // UIを回転モードに戻す
        const boneRotateModeRadio = document.getElementById('bone-rotate-mode') as HTMLInputElement;
        if (boneRotateModeRadio) {
          boneRotateModeRadio.checked = true;
          boneTranslateModeRadio.checked = false;
        }
        
        // ユーザーへの通知
        console.warn('移動モードはHipsボーンでのみ使用できます。');
        
        // 視覚的フィードバック（簡易的な通知）
        const selectedBoneNameSpan = document.getElementById('selected-bone-name') as HTMLSpanElement;
        if (selectedBoneNameSpan) {
          const originalText = selectedBoneNameSpan.textContent;
          selectedBoneNameSpan.style.color = 'red';
          selectedBoneNameSpan.textContent = '移動不可（Hipsのみ移動可能）';
          
          // 3秒後に元に戻す
          setTimeout(() => {
            selectedBoneNameSpan.style.color = '';
            selectedBoneNameSpan.textContent = originalText;
          }, 3000);
        }
      }
    }
  });

  // 座標系選択のイベントハンドラー
  boneWorldSpaceRadio?.addEventListener('change', () => {
    if (boneWorldSpaceRadio.checked) {
      vrmViewer.setBoneTransformSpace('world');
      console.log('ワールド座標系に変更しました');
    }
  });

  boneLocalSpaceRadio?.addEventListener('change', () => {
    if (boneLocalSpaceRadio.checked) {
      vrmViewer.setBoneTransformSpace('local');
      console.log('ローカル座標系に変更しました');
    }
  });
}

/**
 * キーボードショートカットのイベントハンドラーを設定
 */
function setupKeyboardHandlers(vrmViewer: VRMViewerRefactored): void {
  document.addEventListener('keydown', (event) => {
    if (event.target instanceof HTMLInputElement) return; // 入力フィールドでは無効化

    switch (event.key) {
      case '1':
        selectModelByIndex(vrmViewer, 0);
        break;
      case '2':
        selectModelByIndex(vrmViewer, 1);
        break;
      case '3':
        selectModelByIndex(vrmViewer, 2);
        break;
      case '4':
        selectModelByIndex(vrmViewer, 3);
        break;
      case '5':
        selectModelByIndex(vrmViewer, 4);
        break;
      case 'ArrowLeft':
        selectPreviousModel(vrmViewer);
        break;
      case 'ArrowRight':
        selectNextModel(vrmViewer);
        break;
      case 'Escape':
        clearModelSelection(vrmViewer);
        break;
      case 'r':
        vrmViewer.resetCameraToDefault();
        break;
      case 'f':
        vrmViewer.resetCameraToFitAll();
        break;
      case 'b':
        vrmViewer.toggleBoneVisibility();
        break;
      case 'l':
        const currentVisible = vrmViewer.getLightHelpersVisible();
        vrmViewer.setLightHelpersVisible(!currentVisible);
        updateLightHelperButtonText(vrmViewer);
        break;
    }
  });
}

/**
 * モーダル関連のイベントハンドラーを設定
 */
function setupModalHandlers(_vrmViewer: VRMViewerRefactored): void {
  const openLoadModalBtn = document.getElementById('open-load-modal') as HTMLButtonElement;
  const modalCloseBtn = document.getElementById('modal-close') as HTMLSpanElement;
  const metaModalCloseBtn = document.getElementById('meta-modal-close') as HTMLSpanElement;
  const modelModalCloseBtn = document.getElementById('model-modal-close') as HTMLSpanElement;

  openLoadModalBtn?.addEventListener('click', () => {
    showModal('load-modal');
  });

  modalCloseBtn?.addEventListener('click', () => {
    closeModal('load-modal');
  });

  metaModalCloseBtn?.addEventListener('click', () => {
    closeModal('meta-info-modal');
  });

  modelModalCloseBtn?.addEventListener('click', () => {
    const selectedModelModal = document.getElementById('selected-model-modal') as HTMLElement;
    if (selectedModelModal) {
      selectedModelModal.style.display = 'none';
    }
  });

  // モーダル背景クリックで閉じる
  document.querySelectorAll('.modal').forEach(modal => {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        (modal as HTMLElement).style.display = 'none';
      }
    });
  });
}

/**
 * イベントバスからのイベントを監視してUIを更新
 */
function setupEventListeners(vrmViewer: VRMViewerRefactored): void {
  // VRMロード時の処理
  eventBus.on('vrm:loaded', () => {
    updateModelList(vrmViewer);
    updateVRMCount(vrmViewer);
  });

  // VRM削除時の処理
  eventBus.on('vrm:removed', () => {
    updateModelList(vrmViewer);
    updateVRMCount(vrmViewer);
    updateSelectedModelControls(vrmViewer);
  });

  // VRM選択時の処理
  eventBus.on('vrm:selected', () => {
    updateSelectedModelControls(vrmViewer);
    updateModelList(vrmViewer);
  });

  // VRM選択解除時の処理
  eventBus.on('vrm:selection-cleared', () => {
    updateSelectedModelControls(vrmViewer);
    updateModelList(vrmViewer);
  });

  // ボーン選択時の処理
  eventBus.on('bone:selected', ({ boneName }) => {
    const selectedBoneNameSpan = document.getElementById('selected-bone-name') as HTMLSpanElement;
    if (selectedBoneNameSpan) {
      selectedBoneNameSpan.textContent = boneName || 'なし';
    }
  });

  // ライト選択時の処理
  eventBus.on('light:selected', ({ isSelected }) => {
    const selectDirectionalLightBtn = document.getElementById('select-directional-light') as HTMLButtonElement;
    if (selectDirectionalLightBtn) {
      selectDirectionalLightBtn.textContent = isSelected ? '選択解除' : '方向性ライト選択';
    }
  });

  // TransformMode自動変更時のUI更新処理
  vrmViewer.setOnTransformModeAutoChanged((mode) => {
    const boneRotateModeRadio = document.getElementById('bone-rotate-mode') as HTMLInputElement;
    const boneTranslateModeRadio = document.getElementById('bone-translate-mode') as HTMLInputElement;
    
    if (mode === 'rotate') {
      if (boneRotateModeRadio) boneRotateModeRadio.checked = true;
      if (boneTranslateModeRadio) boneTranslateModeRadio.checked = false;
      
      // 視覚的フィードバック（簡易的な通知）
      const selectedBoneNameSpan = document.getElementById('selected-bone-name') as HTMLSpanElement;
      if (selectedBoneNameSpan) {
        const originalText = selectedBoneNameSpan.textContent;
        const originalColor = selectedBoneNameSpan.style.color;
        selectedBoneNameSpan.style.color = 'orange';
        selectedBoneNameSpan.textContent = '自動的にrotateモードに変更されました';
        
        // 3秒後に元に戻す
        setTimeout(() => {
          selectedBoneNameSpan.style.color = originalColor;
          selectedBoneNameSpan.textContent = originalText;
        }, 3000);
      }
      
      console.log('UIを自動的にrotateモードに更新しました');
    }
  });
}

// ==================== ユーティリティ関数 ====================

function showModal(modalId: string): void {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.style.display = 'flex'; // flexレイアウトで中央配置
    modal.style.zIndex = '10000'; // 最高優先度
    
    // モーダル内のボタンの pointer-events を確実に有効化
    const buttons = modal.querySelectorAll('.control-btn');
    buttons.forEach(btn => {
      (btn as HTMLElement).style.pointerEvents = 'auto';
      (btn as HTMLElement).style.zIndex = '10003';
    });
    
    console.log(`Modal ${modalId} opened with ${buttons.length} buttons`);
  }
}

function closeModal(modalId: string): void {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.style.display = 'none';
    console.log(`Modal ${modalId} closed`);
  }
}

function selectModelByIndex(vrmViewer: VRMViewerRefactored, index: number): void {
  const modelCount = vrmViewer.getVRMCount();
  if (index >= 0 && index < modelCount) {
    vrmViewer.selectModel(index);
  }
}

function selectPreviousModel(vrmViewer: VRMViewerRefactored): void {
  const currentIndex = vrmViewer.getSelectedModelIndex();
  const modelCount = vrmViewer.getVRMCount();
  
  if (modelCount === 0) return;
  
  if (currentIndex <= 0) {
    vrmViewer.selectModel(modelCount - 1);
  } else {
    vrmViewer.selectModel(currentIndex - 1);
  }
}

function selectNextModel(vrmViewer: VRMViewerRefactored): void {
  const currentIndex = vrmViewer.getSelectedModelIndex();
  const modelCount = vrmViewer.getVRMCount();
  
  if (modelCount === 0) return;
  
  if (currentIndex >= modelCount - 1) {
    vrmViewer.selectModel(0);
  } else {
    vrmViewer.selectModel(currentIndex + 1);
  }
}

function clearModelSelection(_vrmViewer: VRMViewerRefactored): void {
  // SelectionManagerを通じて選択解除
  eventBus.emit('vrm:selection-cleared', undefined);
}

function updateModelList(vrmViewer: VRMViewerRefactored): void {
  const vrmList = document.getElementById('vrm-list');
  const noModelsMessage = document.getElementById('no-models-message');
  
  if (!vrmList || !noModelsMessage) return;

  const models = vrmViewer.getVRMModels();
  const selectedIndex = vrmViewer.getSelectedModelIndex();

  if (models.length === 0) {
    noModelsMessage.style.display = 'block';
    // 既存のモデル項目を削除
    const modelItems = vrmList.querySelectorAll('.vrm-item');
    modelItems.forEach(item => item.remove());
    return;
  }

  noModelsMessage.style.display = 'none';

  // 既存のモデル項目を削除
  const modelItems = vrmList.querySelectorAll('.vrm-item');
  modelItems.forEach(item => item.remove());

  // 新しいモデル項目を作成
  models.forEach((vrm, index) => {
    const modelItem = document.createElement('div');
    modelItem.className = `vrm-item${selectedIndex === index ? ' selected' : ''}`;
    
    const vrmMeta = (vrm as any).vrmMeta;
    const modelName = vrmMeta?.name || `VRMモデル ${index + 1}`;
    const authorName = vrmMeta?.authors?.[0] || vrmMeta?.author || '';
    
    // サムネイル取得（存在する場合）
    const thumbnailUrl = vrmMeta?.thumbnailImage || '';
    const thumbnailHtml = thumbnailUrl ? 
      `<img src="${thumbnailUrl}" alt="サムネイル" />` : 
      'VRM';

    modelItem.innerHTML = `
      <div class="vrm-item-content">
        <div class="vrm-thumbnail">${thumbnailHtml}</div>
        <div class="vrm-info">
          <span class="vrm-name" title="${modelName}">${modelName}</span>
          ${authorName ? `<div class="vrm-author" title="${authorName}">${authorName}</div>` : ''}
        </div>
        <div class="vrm-actions">
          <button class="info-btn" data-index="${index}" title="情報表示">
            <svg xmlns="http://www.w3.org/2000/svg" height="18px" viewBox="0 -960 960 960" width="18px" fill="currentColor">
              <path d="M440-280h80v-240h-80v240Zm40-320q17 0 28.5-11.5T520-640q0-17-11.5-28.5T480-680q-17 0-28.5 11.5T440-640q0 17 11.5 28.5T480-600Zm0 520q-83 0-156-31.5T197-197q-54-54-85.5-127T80-480q0-83 31.5-156T197-763q54-54 127-85.5T480-880q83 0 156 31.5T763-763q54 54 85.5 127T880-480q0 83-31.5 156T763-197q-54 54-127 85.5T480-80Zm0-80q134 0 227-93t93-227q0-134-93-227t-227-93q-134 0-227 93t-93 227q0 134 93 227t227 93Zm0-320Z"/>
            </svg>
          </button>
          <button class="delete-btn" data-index="${index}" title="削除">×</button>
        </div>
      </div>
    `;

    // クリックで選択
    modelItem.addEventListener('click', (e) => {
      if (!(e.target as HTMLElement).closest('.info-btn') && 
          !(e.target as HTMLElement).closest('.delete-btn')) {
        vrmViewer.selectModel(index);
      }
    });

    vrmList.appendChild(modelItem);
  });

  // 情報表示ボタンのイベントリスナー
  vrmList.querySelectorAll('.info-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const index = parseInt(((e.target as HTMLElement).closest('.info-btn') as HTMLElement)?.dataset.index || '0');
      showMetaInfoModal(vrmViewer, index);
    });
  });

  // 削除ボタンのイベントリスナー
  vrmList.querySelectorAll('.delete-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const index = parseInt((e.target as HTMLElement).dataset.index || '0');
      if (confirm('このモデルを削除しますか？')) {
        vrmViewer.removeVRMAtIndex(index);
      }
    });
  });
}

function updateVRMCount(vrmViewer: VRMViewerRefactored): void {
  const vrmCountSpan = document.getElementById('vrm-count');
  if (vrmCountSpan) {
    const count = vrmViewer.getVRMCount();
    vrmCountSpan.textContent = `VRM数: ${count}`;
  }
}

function updateSelectedModelControls(vrmViewer: VRMViewerRefactored): void {
  const selectedModelNameSpan = document.getElementById('selected-model-name') as HTMLSpanElement;
  const modelScaleSlider = document.getElementById('model-scale') as HTMLInputElement;
  const scaleValueSpan = document.getElementById('scale-value') as HTMLSpanElement;
  const selectedModelModal = document.getElementById('selected-model-modal') as HTMLElement;
  
  const selectedModel = vrmViewer.getSelectedModel();
  const selectedIndex = vrmViewer.getSelectedModelIndex();

  if (selectedModel && selectedIndex >= 0) {
    const vrmMeta = (selectedModel as any).vrmMeta;
    const modelName = vrmMeta?.name || `VRMモデル ${selectedIndex + 1}`;
    
    if (selectedModelNameSpan) {
      selectedModelNameSpan.textContent = modelName;
    }

    // スケール値を更新
    const currentScale = vrmViewer.getSelectedModelScale();
    if (modelScaleSlider) modelScaleSlider.value = currentScale.toString();
    if (scaleValueSpan) scaleValueSpan.textContent = currentScale.toFixed(1);
    
    // 右下モーダルを表示
    if (selectedModelModal) {
      selectedModelModal.style.display = 'block';
    }
  } else {
    if (selectedModelNameSpan) {
      selectedModelNameSpan.textContent = 'なし';
    }
    if (modelScaleSlider) modelScaleSlider.value = '1.0';
    if (scaleValueSpan) scaleValueSpan.textContent = '1.0';
    
    // 右下モーダルを非表示
    if (selectedModelModal) {
      selectedModelModal.style.display = 'none';
    }
  }
}

function updateLightHelperButtonText(vrmViewer: VRMViewerRefactored): void {
  const toggleLightHelpersBtn = document.getElementById('toggle-light-helpers') as HTMLButtonElement;
  if (toggleLightHelpersBtn) {
    const visible = vrmViewer.getLightHelpersVisible();
    toggleLightHelpersBtn.textContent = visible ? 'ライトヘルパー非表示' : 'ライトヘルパー表示';
  }
}

function showMetaInfoModal(vrmViewer: VRMViewerRefactored, index: number): void {
  const models = vrmViewer.getVRMModels();
  if (index < 0 || index >= models.length) return;

  const vrm = models[index];
  const vrmMeta = (vrm as any).vrmMeta;

  if (!vrmMeta) {
    alert('メタ情報が見つかりません');
    return;
  }

  const metaInfoContent = document.getElementById('meta-info-content');
  if (!metaInfoContent) return;

  let html = '<div class="meta-info-layout">';
  
  // サムネイル（左側）
  html += `<div class="meta-thumbnail-section">`;
  if (vrmMeta.thumbnailImage) {
    html += `<img src="${vrmMeta.thumbnailImage}" alt="VRM thumbnail" class="meta-thumbnail" />`;
  } else {
    html += `<div class="meta-thumbnail-placeholder">サムネイルなし</div>`;
  }
  html += `</div>`;

  // 基本情報（右側）
  html += `<div class="meta-info-details">`;
  html += `<div class="meta-info-section">`;
  html += `<h3>基本情報</h3>`;
  html += `<div class="meta-info-field"><strong>名前:</strong> ${vrmMeta.name || 'Unknown'}</div>`;
  html += `<div class="meta-info-field"><strong>作者:</strong> ${vrmMeta.authors?.join(', ') || 'Unknown'}</div>`;
  html += `<div class="meta-info-field"><strong>バージョン:</strong> ${vrmMeta.version || 'Unknown'}</div>`;
  html += `<div class="meta-info-field"><strong>VRMバージョン:</strong> ${vrmMeta.detectedVersion || 'Unknown'}</div>`;
  html += `</div>`;

  // ライセンス情報
  html += `<div class="meta-info-section">`;
  html += `<h3>ライセンス情報</h3>`;
  
  if (vrmMeta.detectedVersion?.startsWith('1.')) {
    // VRM1系の詳細な利用制限情報
    html += `<div class="meta-info-field"><strong>アバター使用許可:</strong> ${vrmMeta.avatarPermission || 'Unknown'}</div>`;
    html += `<div class="meta-info-field"><strong>商用利用:</strong> ${vrmMeta.commercialUsage || 'Unknown'}</div>`;
    html += `<div class="meta-info-field"><strong>クレジット表記:</strong> ${vrmMeta.creditNotation || 'Unknown'}</div>`;
    html += `<div class="meta-info-field"><strong>再配布:</strong> ${vrmMeta.allowRedistribution ? '許可' : '禁止'}</div>`;
    html += `<div class="meta-info-field"><strong>改変:</strong> ${vrmMeta.modification || 'Unknown'}</div>`;
  } else {
    // VRM0系の情報
    html += `<div class="meta-info-field"><strong>許可されたユーザー:</strong> ${vrmMeta.allowedUserName || 'Unknown'}</div>`;
    html += `<div class="meta-info-field"><strong>暴力的表現:</strong> ${vrmMeta.violentUssageName || 'Unknown'}</div>`;
    html += `<div class="meta-info-field"><strong>性的表現:</strong> ${vrmMeta.sexualUssageName || 'Unknown'}</div>`;
    html += `<div class="meta-info-field"><strong>商用利用:</strong> ${vrmMeta.commercialUssageName || 'Unknown'}</div>`;
    html += `<div class="meta-info-field"><strong>ライセンス:</strong> ${vrmMeta.licenseName || 'Unknown'}</div>`;
  }
  
  if (vrmMeta.licenseUrl) {
    html += `<div class="meta-info-field"><strong>ライセンスURL:</strong> <a href="${vrmMeta.licenseUrl}" target="_blank">${vrmMeta.licenseUrl}</a></div>`;
  }
  
  html += `</div>`;
  html += `</div>`;
  html += `</div>`;

  metaInfoContent.innerHTML = html;
  showModal('meta-info-modal');
}

// アプリケーションを開始
main().catch(console.error);
