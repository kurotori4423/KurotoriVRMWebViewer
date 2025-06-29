import './style.css';
import * as THREE from 'three';
import { VRMViewerRefactored } from './core/VRMViewerRefactored';
import { eventBus } from './utils/EventBus';

/**
 * SVGアイコンの定義
 */
const ICONS = {
  visibility: '<svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#FFFFFF"><path d="M480-320q75 0 127.5-52.5T660-500q0-75-52.5-127.5T480-680q-75 0-127.5 52.5T300-500q0 75 52.5 127.5T480-320Zm0-72q-45 0-76.5-31.5T372-500q0-45 31.5-76.5T480-608q45 0 76.5 31.5T588-500q0 45-31.5 76.5T480-392Zm0 192q-146 0-266-81.5T40-500q54-137 174-218.5T480-800q146 0 266 81.5T920-500q-54 137-174 218.5T480-200Zm0-300Zm0 220q113 0 207.5-59.5T832-500q-50-101-144.5-160.5T480-720q-113 0-207.5 59.5T128-500q50 101 144.5 160.5T480-280Z"/></svg>',
  visibility_off: '<svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#FFFFFF"><path d="m644-428-58-58q9-47-27-88t-93-32l-58-58q17-8 34.5-12t37.5-4q75 0 127.5 52.5T660-500q0 20-4 37.5T644-428Zm128 126-58-56q38-29 67.5-63.5T832-500q-50-101-143.5-160.5T480-720q-29 0-57 4t-55 12l-62-62q41-17 84-25.5t90-8.5q151 0 269 83.5T920-500q-23 59-60.5 109.5T772-302Zm20 246L624-222q-35 11-70.5 16.5T480-200q-151 0-269-83.5T40-500q21-53 53-98.5t73-81.5L56-792l56-56 736 736-56 56ZM222-624q-29 26-53 57t-41 67q50 101 143.5 160.5T480-280q20 0 39-2.5t39-5.5l-36-38q-11 3-21 4.5t-21 1.5q-75 0-127.5-52.5T300-500q0-11 1.5-21t4.5-21l-84-82Zm319 93Zm-151 75Z"/></svg>',
  delete: '<svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#FFFFFF"><path d="M280-120q-33 0-56.5-23.5T200-200v-520h-40v-80h200v-40h240v40h200v80h-40v520q0 33-23.5 56.5T680-120H280Zm400-600H280v520h400v-520ZM360-280h80v-360h-80v360Zm160 0h80v-360h-80v360ZM280-720v520-520Z"/></svg>',
  play_arrow: '<svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#FFFFFF"><path d="M320-200v-560l440 280-440 280Zm80-280Zm0 134 210-134-210-134v268Z"/></svg>',
  pause: '<svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#FFFFFF"><path d="M520-200v-560h240v560H520Zm-320 0v-560h240v560H200Zm400-80h80v-400h-80v400Zm-320 0h80v-400h-80v400Zm0-400v400-400Zm320 0v400-400Z"/></svg>'
};

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
      
      <!-- 上部ツールバー -->
      <div id="top-toolbar">
        <span class="toolbar-label">🌐 座標系:</span>
        <div class="coordinate-space-dropdown">
          <select id="coordinate-space-select" class="dropdown-select">
            <option value="world" selected>Global</option>
            <option value="local">Local</option>
          </select>
          <div class="dropdown-icon">▼</div>
        </div>
        <div class="toolbar-actions">
          <!-- 将来のギズモ機能（移動/回転/スケール切替など）がここに追加される -->
        </div>
      </div>
      
      <!-- 左サイドバー -->
      <div id="left-sidebar">
        <h1>Kurotori VRM Web Viewer</h1>
        
        <!-- ヘルプボタン -->
        <div id="help-section">
          <button id="open-help-modal" class="help-btn">
            <svg class="help-icon" xmlns="http://www.w3.org/2000/svg" height="20px" viewBox="0 -960 960 960" width="20px" fill="currentColor">
              <path d="M440-280h80v-240h-80v240Zm40-320q17 0 28.5-11.5T520-640q0-17-11.5-28.5T480-680q-17 0-28.5 11.5T440-640q0 17 11.5 28.5T480-600Zm0 520q-83 0-156-31.5T197-197q-54-54-85.5-127T80-480q0-83 31.5-156T197-763q54-54 127-85.5T480-880q83 0 156 31.5T763-763q54 54 85.5 127T880-480q0 83-31.5 156T763-197q-54 54-127 85.5T480-80Z"/>
            </svg>
            ヘルプ
          </button>
        </div>
        
        <!-- VRMファイル読み込み -->
        <div id="load-section">
          <button id="open-load-modal" class="primary-btn">VRMファイル読み込み</button>
          <span id="vrm-count">VRM数: 0</span>
        </div>
        
        <!-- 読み込み済みモデル一覧 -->
        <div id="vrm-list-container">
          <div class="section-header">
            <h3>読み込み済みモデル</h3>
            <button class="icon-button danger" id="delete-all-models">
              <svg class="button-icon" xmlns="http://www.w3.org/2000/svg" height="16px" viewBox="0 -960 960 960" width="16px" fill="currentColor">
                <path d="M280-120q-33 0-56.5-23.5T200-200v-520h-40v-80h200v-40h240v40h200v80h-40v520q0 33-23.5 56.5T680-120H280Zm400-600H280v520h400v-520ZM360-280h80v-360h-80v360Zm160 0h80v-360h-80v360ZM280-720v520-520Z"/>
              </svg>
              <span class="button-label">全削除</span>
            </button>
          </div>
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
        
        <!-- 常時表示ボタンエリア -->
        <div class="action-buttons">
          <button class="icon-button" id="reset-model" data-action="reset">
            <svg class="button-icon" xmlns="http://www.w3.org/2000/svg" height="20px" viewBox="0 -960 960 960" width="20px" fill="currentColor">
              <path d="M480-80q-75 0-140.5-28.5t-114-77q-48.5-48.5-77-114T120-440h80q0 117 81.5 198.5T480-160q117 0 198.5-81.5T760-440q0-117-81.5-198.5T480-720h-6l62 62-56 58-160-160 160-160 56 58-62 62h6q75 0 140.5 28.5t114 77q48.5 48.5 77 114T840-440q0 75-28.5 140.5t-77 114q-48.5 48.5-114 77T480-80Z"/>
            </svg>
          </button>
          <button class="icon-button" id="focus-model" data-action="focus">
            <svg class="button-icon" xmlns="http://www.w3.org/2000/svg" height="20px" viewBox="0 -960 960 960" width="20px" fill="currentColor">
              <path d="M480-480q-51 0-85.5-34.5T360-600q0-50 34.5-85t85.5-35q50 0 85 35t35 85q0 51-35 85.5T480-480Zm0-80q17 0 28.5-11.5T520-600q0-17-11.5-28.5T480-640q-17 0-28.5 11.5T440-600q0 17 11.5 28.5T480-560ZM240-240v-76q0-21 10.5-39.5T279-385q46-27 96.5-41T480-440q54 0 104.5 14t96.5 41q18 11 28.5 29.5T720-316v76H240Zm240-120q-41 0-80 10t-74 30h308q-35-20-74-30t-80-10Zm0-240Zm0 280h154-308 154ZM160-80q-33 0-56.5-23.5T80-160v-160h80v160h160v80H160ZM80-640v-160q0-33 23.5-56.5T160-880h160v80H160v160H80ZM640-80v-80h160v-160h80v160q0 33-23.5 56.5T800-80H640Zm160-560v-160H640v-80h160q33 0 56.5 23.5T880-800v160h-80Z"/>
            </svg>
          </button>
          <button class="icon-button" id="toggle-model-visibility" data-action="visibility">
            <div class="button-icon" aria-label="表示" role="img"></div>
          </button>
          <button class="icon-button danger" id="delete-selected-model" data-action="delete">
            <svg class="button-icon" xmlns="http://www.w3.org/2000/svg" height="20px" viewBox="0 -960 960 960" width="20px" fill="currentColor">
              <path d="M280-120q-33 0-56.5-23.5T200-200v-520h-40v-80h200v-40h240v40h200v80h-40v520q0 33-23.5 56.5T680-120H280Zm400-600H280v520h400v-520ZM360-280h80v-360h-80v360Zm160 0h80v-360h-80v360ZM280-720v520-520Z"/>
            </svg>
          </button>
        </div>
        
        <!-- タブ構造 -->
        <div class="tab-container">
          <div class="tab-buttons" role="tablist">
            <button class="tab-button active" role="tab" data-tab="basic" aria-selected="true" aria-controls="basic-panel">基本</button>
            <button class="tab-button" role="tab" data-tab="pose" aria-selected="false" aria-controls="pose-panel">ポーズ</button>
            <button class="tab-button" role="tab" data-tab="expression" aria-selected="false" aria-controls="expression-panel">表情</button>
          </div>
          <div class="tab-content">
                          <!-- 基本タブコンテンツ -->
              <div class="tab-panel active" id="basic-panel" role="tabpanel" aria-labelledby="basic-tab">
                <div id="model-info">
                  <p>選択中: <span id="selected-model-name">なし</span></p>
                </div>
                <!-- ルート操作設定（基本タブでは常時表示） -->
                <div id="root-transform-settings" class="control-group">
                  <div class="radio-group">
                    <input type="radio" id="root-translate-mode" name="root-mode" value="translate" checked />
                    <label for="root-translate-mode">移動</label>
                    <input type="radio" id="root-rotate-mode" name="root-mode" value="rotate" />
                    <label for="root-rotate-mode">回転</label>
                  </div>
                </div>
                <div class="control-group">
                  <label for="model-scale">スケール:</label>
                  <input type="range" id="model-scale" min="0.1" max="3.0" step="0.1" value="1.0" />
                  <span id="scale-value">1.0</span>
                </div>
                <div class="control-group">
                  <button id="duplicate-model" class="control-btn">複製</button>
                </div>
              </div>
            
            <!-- ポーズタブコンテンツ -->
            <div class="tab-panel" id="pose-panel" role="tabpanel" aria-labelledby="pose-tab" style="display: none;">
              
              <!-- VRMAアニメーション制御セクション -->
              <div class="vrma-section">
                <h4 class="section-title">VRMAアニメーション</h4>
                
                <!-- アップロード領域（未ロード時） -->
                <div id="vrma-upload" class="upload-zone">
                  <div class="upload-text">VRMAファイルをドラッグ&ドロップ</div>
                  <div class="upload-text">または</div>
                  <button class="upload-btn" id="vrma-file-select">ファイルを選択</button>
                  <input type="file" id="vrma-file-input" accept=".vrma" style="display: none;" />
                </div>
                
                <!-- アニメーション情報（ロード済み時） -->
                <div id="vrma-loaded" class="animation-info" style="display: none;">
                  <div class="info-row">
                    <span class="info-label">ファイル名:</span>
                    <span class="info-value" id="vrma-filename">-</span>
                  </div>
                  <div class="info-row">
                    <span class="info-label">再生時間:</span>
                    <span class="info-value" id="vrma-duration">-</span>
                  </div>
                  <div class="info-row">
                    <span class="info-label">現在時刻:</span>
                    <span class="info-value" id="vrma-current-time">-</span>
                  </div>
                  
                  <!-- 制御ボタン -->
                  <div class="control-buttons">
                    <button class="vrma-play-pause-btn" id="vrma-play-pause" title="再生/一時停止">
                      <div class="button-icon" aria-label="再生" role="img"></div>
                    </button>
                    <button class="vrma-delete-btn" id="vrma-delete" title="削除">
                      <div class="button-icon" aria-label="削除" role="img"></div>
                    </button>
                  </div>
                </div>
              </div>
              
              <!-- 既存のボーン制御 -->
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
              <div id="selected-bone-info">
                <p>選択中ボーン: <span id="selected-bone-name">なし</span></p>
              </div>
            </div>
            
            <!-- 表情タブコンテンツ -->
            <div class="tab-panel" id="expression-panel" role="tabpanel" aria-labelledby="expression-tab" style="display: none;">
              <div class="control-group">
                <button id="reset-all-expressions" class="control-btn">表情リセット</button>
              </div>
              <div id="expression-status">
                <p class="expression-info">モデルを選択してください</p>
              </div>
              <div id="expression-controls" class="expression-controls" style="display: none;">
                <!-- 表情スライダーが動的に挿入されます -->
              </div>
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
      
      <!-- ヘルプモーダル -->
      <div id="help-modal" class="modal" style="display: none;">
        <div class="modal-content">
          <div class="modal-header">
            <h2>🆘 ヘルプ - VRM Web Viewer 操作ガイド</h2>
            <span class="close" id="help-modal-close">&times;</span>
          </div>
          <div class="modal-body">
            <div id="help-content">
              
              <!-- 基本操作セクション -->
              <div class="help-section">
                <h3>📖 基本操作</h3>
                <div class="help-subsection">
                  <h4>🗃️ VRMファイル読み込み</h4>
                  <ul>
                    <li><strong>ファイル選択</strong>: 「VRMファイル読み込み」ボタンをクリック</li>
                    <li><strong>ドラッグ&ドロップ</strong>: モーダル内のドロップゾーンにVRMファイルをドロップ</li>
                    <li><strong>複数読み込み</strong>: 最大5体まで同時読み込み可能</li>
                  </ul>
                </div>
                
                <div class="help-subsection">
                  <h4>🎮 モデル選択・操作</h4>
                  <ul>
                    <li><strong>マウス選択</strong>: 3Dビューで直接モデルをクリック</li>
                    <li><strong>リスト選択</strong>: 左サイドバーのモデル一覧から選択</li>
                    <li><strong>スケール調整</strong>: 選択中モデル設定の「基本」タブでスケール変更</li>
                    <li><strong>表示/非表示</strong>: アクションボタンで表示切替</li>
                  </ul>
                </div>
                
                <div class="help-subsection">
                  <h4>🎭 表情制御</h4>
                  <ul>
                    <li><strong>表情タブ</strong>: 選択中モデル設定の「表情」タブを開く</li>
                    <li><strong>スライダー操作</strong>: 各表情の強度を0-1で調整</li>
                    <li><strong>表情リセット</strong>: 「表情リセット」ボタンで初期状態に戻す</li>
                  </ul>
                </div>
                
                <div class="help-subsection">
                  <h4>🤸 ポーズ・アニメーション</h4>
                  <ul>
                    <li><strong>ボーン表示</strong>: 「ポーズ」タブの「ボーン表示切替」で骨格表示</li>
                    <li><strong>VRMA再生</strong>: VRMAファイルをドラッグ&ドロップで自動再生</li>
                    <li><strong>操作モード</strong>: 回転・移動モードの切替可能</li>
                  </ul>
                </div>
              </div>
              
              <!-- キーボードショートカットセクション -->
              <div class="help-section">
                <h3>⌨️ キーボードショートカット</h3>
                <div class="shortcuts-table">
                  <table>
                    <thead>
                      <tr>
                        <th>キー</th>
                        <th>機能</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td><kbd>1</kbd> - <kbd>5</kbd></td>
                        <td>モデル1-5を直接選択</td>
                      </tr>
                      <tr>
                        <td><kbd>←</kbd> <kbd>→</kbd></td>
                        <td>前/次のモデルを選択</td>
                      </tr>
                      <tr>
                        <td><kbd>Esc</kbd></td>
                        <td>モデル選択を解除</td>
                      </tr>
                      <tr>
                        <td><kbd>R</kbd></td>
                        <td>カメラをデフォルト位置にリセット</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
              
              <!-- リンクセクション -->
              <div class="help-section">
                <h3>🔗 リンク・情報</h3>
                <div class="help-links">
                  <a href="https://github.com/kurotori4423/KurotoriVRMWebViewer" target="_blank" rel="noopener noreferrer" class="help-link">
                    <svg class="link-icon" xmlns="http://www.w3.org/2000/svg" height="20px" viewBox="0 0 24 24" width="20px" fill="currentColor">
                      <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                    </svg>
                    GitHub リポジトリ
                  </a>
                  <p class="help-description">
                    バグ報告や機能要望はIssueまでお願いします。
                  </p>
                </div>
              </div>
              
              <!-- 対応フォーマット -->
              <div class="help-section">
                <h3>📋 対応フォーマット</h3>
                <ul>
                  <li><strong>VRM 0.x</strong>: 従来のVRM形式</li>
                  <li><strong>VRM 1.0</strong>: 最新のVRM形式</li>
                  <li><strong>VRMA</strong>: VRMアニメーションファイル</li>
                </ul>
              </div>
              
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
  setupExpressionControlHandlers(vrmViewer);
  setupVRMAHandlers(vrmViewer);
  setupKeyboardHandlers(vrmViewer);
  setupToolbarHandlers(vrmViewer); // UI-001: ツールバー座標系切替
  setupModalHandlers(vrmViewer);
  
  // UI-001: ツールバーの初期状態を現在の座標系に同期
  syncToolbarCoordinateSpace(vrmViewer);
  
  // イベントバスからのイベントを監視してUIを更新
  setupEventListeners(vrmViewer);
  
  // FEAT-013: 初期VRMA UI状態を設定
  updateVRMAUI(vrmViewer);

  // アイコンの初期化
  initializeIcons();

  console.log('リファクタリング版VRMビューワーが起動しました（フル機能版）');
}

/**
 * ファイル入力関連のイベントハンドラーを設定
 */
function setupFileInputHandlers(vrmViewer: VRMViewerRefactored): void {
  const dropZone = document.getElementById('drop-zone') as HTMLElement;

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

  // ライト選択機能
  selectDirectionalLightBtn?.addEventListener('click', () => {
    const isSelected = vrmViewer.isDirectionalLightSelected();
    if (isSelected) {
      // 現在選択中 → 選択解除
      vrmViewer.disableLightTransform();
    } else {
      // 現在未選択 → 選択
      vrmViewer.enableDirectionalLightTransform();
    }
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
  updateDirectionalLightSelectionButtonText(vrmViewer);
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
  // スケールスライダー（タブ機能影響なし）
  const modelScaleSlider = document.getElementById('model-scale') as HTMLInputElement;
  const scaleValueSpan = document.getElementById('scale-value') as HTMLSpanElement;
  
  modelScaleSlider?.addEventListener('input', (e) => {
    const scale = parseFloat((e.target as HTMLInputElement).value);
    vrmViewer.setModelScale(scale);
    if (scaleValueSpan) scaleValueSpan.textContent = scale.toFixed(1);
  });

  // 複製ボタン（タブ機能影響なし）
  const duplicateModelBtn = document.getElementById('duplicate-model') as HTMLButtonElement;
  
  duplicateModelBtn?.addEventListener('click', async () => {
    const success = await vrmViewer.duplicateSelectedModel();
    if (success) {
      console.log('モデルが複製されました');
    } else {
      alert('モデルの複製に失敗しました');
    }
  });

  // 注意: 以下のボタンは新しいタブ対応のsetupActionButtonHandlersで処理されるため、ここでは設定しない
  // - reset-model
  // - focus-model  
  // - toggle-model-visibility
  // - delete-selected-model
  // - delete-all-models

  // 注意: toggle-root-transformボタンは基本タブから削除されたため、イベントハンドラーも削除

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

  // 新しいタブ対応モデル制御関連のイベントハンドラーを設定
  setupNewModelControlHandlers(vrmViewer);
}

/**
 * 新しいタブ対応モデル制御関連のイベントハンドラーを設定
 * FEAT-012: Tab system integration with VRM controllers
 */
function setupNewModelControlHandlers(vrmViewer: VRMViewerRefactored): void {
  // Tab system event handlers
  setupTabHandlers(vrmViewer);
  
  // Action buttons event handlers  
  setupActionButtonHandlers(vrmViewer);
  
  // Initialize default tab state
  initializeTabState(vrmViewer);
}

/**
 * タブシステムのイベントハンドラーを設定
 */
function setupTabHandlers(vrmViewer: VRMViewerRefactored): void {
  const tabButtons = document.querySelectorAll('.tab-button');
  
  tabButtons.forEach(button => {
    button.addEventListener('click', (e) => {
      const tabButton = e.target as HTMLButtonElement;
      const tabName = tabButton.getAttribute('data-tab');
      
      if (tabName) {
        switchTab(tabName, vrmViewer);
      }
    });
  });
}

/**
 * タブ切替ロジック
 */
function switchTab(tabName: string, vrmViewer: VRMViewerRefactored): void {
  // Update tab button states
  const tabButtons = document.querySelectorAll('.tab-button');
  const tabPanels = document.querySelectorAll('.tab-panel');
  
  // Remove active states
  tabButtons.forEach(btn => {
    btn.classList.remove('active');
    btn.setAttribute('aria-selected', 'false');
  });
  
  tabPanels.forEach(panel => {
    panel.classList.remove('active');
    (panel as HTMLElement).style.display = 'none';
  });
  
  // Set active states
  const activeButton = document.querySelector(`[data-tab="${tabName}"]`);
  const activePanel = document.getElementById(`${tabName}-panel`);
  
  if (activeButton && activePanel) {
    activeButton.classList.add('active');
    activeButton.setAttribute('aria-selected', 'true');
    activePanel.classList.add('active');
    activePanel.style.display = 'block';
  }
  
  // Execute tab-specific VRM controller actions
  executeTabSpecificActions(tabName, vrmViewer);
  
  console.log(`タブ切替: ${tabName}`);
}

/**
 * タブ固有のVRMコントローラー連動アクション
 */
function executeTabSpecificActions(tabName: string, vrmViewer: VRMViewerRefactored): void {
  const selectedIndex = vrmViewer.getSelectedModelIndex();
  if (selectedIndex === -1) return;

  switch (tabName) {
    case 'basic':
      // 基本タブ: 自動的にルート操作ON、ボーン非表示
      if (!vrmViewer.isRootTransformVisible()) {
        vrmViewer.toggleRootTransform();
      }
      // ボーン非表示に設定（戻り値が現在の状態を返す）
      vrmViewer.toggleBoneVisibility(false);
      console.log('基本タブ: ルート操作ON・ボーン非表示');
      break;
      
    case 'pose':  
      // ポーズタブ: 自動的にルート操作OFF、ボーン表示ON
      if (vrmViewer.isRootTransformVisible()) {
        vrmViewer.toggleRootTransform();
      }
      // ボーン表示に設定（戻り値が現在の状態を返す）
      vrmViewer.toggleBoneVisibility(true);
      
      // UIボタンテキスト更新
      const toggleBoneBtn = document.getElementById('toggle-bone-visibility') as HTMLButtonElement;
      if (toggleBoneBtn) {
        toggleBoneBtn.textContent = 'ボーン非表示';
      }
      
      console.log('ポーズタブ: ルート操作OFF・ボーン表示ON');
      break;
      
    case 'expression':
      // 表情タブ: ルート操作・ボーン両方OFF
      if (vrmViewer.isRootTransformVisible()) {
        vrmViewer.toggleRootTransform();
      }
      // ボーン非表示に設定
      vrmViewer.toggleBoneVisibility(false);
      
      // 表情コントロールUIの更新（FEAT-011の機能活用）
      const vrm = vrmViewer.getVRMModels()[selectedIndex];
      if (vrm) {
        updateExpressionControls(vrmViewer, selectedIndex, vrm);
      }
      
      console.log('表情タブ: ルート操作・ボーン両方OFF');
      break;
  }
}

/**
 * アクションボタンのイベントハンドラーを設定
 */
function setupActionButtonHandlers(vrmViewer: VRMViewerRefactored): void {
  // リセットボタン（既存のID再利用、重複リスナー回避）
  const resetBtn = document.getElementById('reset-model') as HTMLButtonElement;
  if (resetBtn && !resetBtn.hasAttribute('data-tab-handler')) {
    resetBtn.addEventListener('click', () => {
      vrmViewer.resetModel();
      console.log('アクションボタン: モデルリセット実行');
    });
    resetBtn.setAttribute('data-tab-handler', 'true');
  }
  
  // フォーカスボタン
  const focusBtn = document.getElementById('focus-model') as HTMLButtonElement;
  if (focusBtn && !focusBtn.hasAttribute('data-tab-handler')) {
    focusBtn.addEventListener('click', () => {
      vrmViewer.focusOnSelectedModel();
      console.log('アクションボタン: モデルフォーカス実行');
    });
    focusBtn.setAttribute('data-tab-handler', 'true');
  }
  
  // 表示切替ボタン（アイコン動的変更付き）
  const visibilityBtn = document.getElementById('toggle-model-visibility') as HTMLButtonElement;
  if (visibilityBtn && !visibilityBtn.hasAttribute('data-tab-handler')) {
    visibilityBtn.addEventListener('click', () => {
      const isVisible = vrmViewer.toggleSelectedModelVisibility();
      updateVisibilityButtonIcon(visibilityBtn, isVisible);
      console.log(`アクションボタン: モデル表示切替 - ${isVisible ? '表示' : '非表示'}`);
    });
    visibilityBtn.setAttribute('data-tab-handler', 'true');
  }
  
  // 削除ボタン
  const deleteBtn = document.getElementById('delete-selected-model') as HTMLButtonElement;
  if (deleteBtn && !deleteBtn.hasAttribute('data-tab-handler')) {
    deleteBtn.addEventListener('click', () => {
      if (confirm('選択したモデルを削除しますか？')) {
        vrmViewer.deleteSelectedModel();
        console.log('アクションボタン: 選択モデル削除実行');
      }
    });
    deleteBtn.setAttribute('data-tab-handler', 'true');
  }
  
  // 全削除ボタン（新配置）
  const deleteAllBtn = document.getElementById('delete-all-models') as HTMLButtonElement;
  if (deleteAllBtn && !deleteAllBtn.hasAttribute('data-tab-handler')) {
    deleteAllBtn.addEventListener('click', () => {
      if (confirm('全てのVRMモデルを削除しますか？')) {
        vrmViewer.removeAllVRMs();
        console.log('アクションボタン: 全モデル削除実行');
      }
    });
    deleteAllBtn.setAttribute('data-tab-handler', 'true');
  }
}

/**
 * 表示切替ボタンのアイコンを動的に更新
 */
function updateVisibilityButtonIcon(button: HTMLButtonElement, isVisible: boolean): void {
  const iconDiv = button.querySelector('.button-icon') as HTMLElement;
  iconDiv.innerHTML = isVisible ? ICONS.visibility : ICONS.visibility_off;
  iconDiv.setAttribute('aria-label', isVisible ? '表示' : '非表示');
}

/**
 * タブシステムの初期状態を設定
 */
function initializeTabState(vrmViewer: VRMViewerRefactored): void {
  // デフォルトで「基本」タブをアクティブ化
  switchTab('basic', vrmViewer);
  
  // 表示切替ボタンの初期アイコン状態を設定
  const visibilityBtn = document.getElementById('toggle-model-visibility') as HTMLButtonElement;
  if (visibilityBtn) {
    // 初期状態は表示と仮定
    updateVisibilityButtonIcon(visibilityBtn, true);
  }
  
  console.log('タブシステム初期化完了 - 基本タブアクティブ');
}

/**
 * ボーン制御関連のイベントハンドラーを設定
 */
function setupBoneControlHandlers(vrmViewer: VRMViewerRefactored): void {
  const toggleBoneVisibilityBtn = document.getElementById('toggle-bone-visibility') as HTMLButtonElement;
  const resetAllBonesBtn = document.getElementById('reset-all-bones') as HTMLButtonElement;
  const boneRotateModeRadio = document.getElementById('bone-rotate-mode') as HTMLInputElement;
  const boneTranslateModeRadio = document.getElementById('bone-translate-mode') as HTMLInputElement;


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


}

/**
 * 表情制御関連のイベントハンドラーを設定
 */
function setupExpressionControlHandlers(vrmViewer: VRMViewerRefactored): void {
  const resetAllExpressionsBtn = document.getElementById('reset-all-expressions') as HTMLButtonElement;

  // 表情リセットボタン
  resetAllExpressionsBtn?.addEventListener('click', () => {
    const expressionController = vrmViewer.getExpressionController();
    if (expressionController) {
      expressionController.resetAllExpressions();
      
      // UIを手動で更新
      const selectedModel = vrmViewer.getSelectedModel();
      const selectedIndex = vrmViewer.getSelectedModelIndex();
      if (selectedModel && selectedIndex >= 0) {
        updateExpressionControls(vrmViewer, selectedIndex, selectedModel);
      }
    }
  });
}

/**
 * キーボードショートカットのイベントハンドラーを設定
 */

/**
 * VRMAアニメーション制御のハンドラーを設定
 */
function setupVRMAHandlers(vrmViewer: VRMViewerRefactored): void {
  const uploadZone = document.getElementById('vrma-upload') as HTMLElement;
  const fileSelectBtn = document.getElementById('vrma-file-select') as HTMLButtonElement;
  const fileInput = document.getElementById('vrma-file-input') as HTMLInputElement;
  const playPauseBtn = document.getElementById('vrma-play-pause') as HTMLButtonElement;
  const deleteBtn = document.getElementById('vrma-delete') as HTMLButtonElement;

  // ファイル選択ボタン
  fileSelectBtn?.addEventListener('click', () => {
    fileInput?.click();
  });

  // ファイル入力
  fileInput?.addEventListener('change', async (event) => {
    const files = (event.target as HTMLInputElement).files;
    if (files && files.length > 0) {
      const file = files[0];
      if (file.name.toLowerCase().endsWith('.vrma')) {
        await handleVRMAFileLoad(file, vrmViewer);
      } else {
        alert('VRMAファイルを選択してください');
      }
      fileInput.value = '';
    }
  });

  // ドラッグ&ドロップ
  uploadZone?.addEventListener('dragover', (e) => {
    e.preventDefault();
    uploadZone.classList.add('dragover');
  });

  uploadZone?.addEventListener('dragleave', (e) => {
    e.preventDefault();
    uploadZone.classList.remove('dragover');
  });

  uploadZone?.addEventListener('drop', async (e) => {
    e.preventDefault();
    uploadZone.classList.remove('dragover');
    
    const files = e.dataTransfer?.files;
    if (files && files.length > 0) {
      const file = files[0];
      if (file.name.toLowerCase().endsWith('.vrma')) {
        await handleVRMAFileLoad(file, vrmViewer);
      } else {
        alert('VRMAファイルを選択してください');
      }
    }
  });

  // 再生/一時停止ボタン
  playPauseBtn?.addEventListener('click', () => {
    const state = vrmViewer.getAnimationState();
    if (state === 'playing') {
      vrmViewer.pauseAnimation();
    } else if (state === 'paused' || state === 'loaded') {
      vrmViewer.playAnimation();
    }
  });

  // 削除ボタン
  deleteBtn?.addEventListener('click', () => {
    if (confirm('VRMAアニメーションを削除しますか？')) {
      vrmViewer.clearAnimation();
      updateVRMAUI(vrmViewer);
    }
  });

  // VRMAイベントリスナー
  eventBus.on('vrma:loaded', () => {
    updateVRMAUI(vrmViewer);
  });

  eventBus.on('vrma:play', () => {
    updateVRMAUI(vrmViewer);
  });

  eventBus.on('vrma:pause', () => {
    updateVRMAUI(vrmViewer);
  });

  eventBus.on('vrma:stop', () => {
    updateVRMAUI(vrmViewer);
  });

  eventBus.on('vrma:time-update', ({ vrm, currentTime, duration }) => {
    // 選択されたVRMの時間のみを表示
    const selectedVRM = vrmViewer.getSelectedModel();
    if (selectedVRM && vrm === selectedVRM) {
      updateVRMATimeDisplay(currentTime, duration);
    }
  });

  eventBus.on('vrma:error', ({ error }) => {
    console.error('VRMA Error:', error);
    alert(`VRMAエラー: ${error.message}`);
    updateVRMAUI(vrmViewer);
  });
}

/**
 * VRMAファイル読み込み処理
 */
async function handleVRMAFileLoad(file: File, vrmViewer: VRMViewerRefactored): Promise<void> {
  try {
    await vrmViewer.loadVRMAFile(file);
    console.log(`VRMAファイル ${file.name} が読み込まれました`);
  } catch (error) {
    console.error('VRMA読み込みエラー:', error);
    alert(`VRMAファイル ${file.name} の読み込みに失敗しました: ${(error as Error).message}`);
  }
}

/**
 * VRMA UI状態更新
 */
function updateVRMAUI(vrmViewer: VRMViewerRefactored): void {
  const uploadZone = document.getElementById('vrma-upload') as HTMLElement;
  const loadedZone = document.getElementById('vrma-loaded') as HTMLElement;
  const playPauseBtn = document.getElementById('vrma-play-pause') as HTMLButtonElement;
  const deleteBtn = document.getElementById('vrma-delete') as HTMLButtonElement;
  const filenameSpan = document.getElementById('vrma-filename') as HTMLSpanElement;
  const durationSpan = document.getElementById('vrma-duration') as HTMLSpanElement;

  const animationInfo = vrmViewer.getAnimationInfo();
  const state = vrmViewer.getAnimationState();

  if (animationInfo && state !== 'idle') {
    // アニメーション読み込み済み
    uploadZone.style.display = 'none';
    loadedZone.style.display = 'block';

    filenameSpan.textContent = animationInfo.fileName;
    durationSpan.textContent = `${animationInfo.duration.toFixed(1)}s`;

    // 再生/一時停止ボタンの状態更新
    const playPauseIcon = playPauseBtn.querySelector('.button-icon') as HTMLElement;
    if (state === 'playing') {
      playPauseIcon.innerHTML = ICONS.pause;
      playPauseIcon.setAttribute('aria-label', '一時停止');
      playPauseBtn.title = '一時停止';
    } else {
      playPauseIcon.innerHTML = ICONS.play_arrow;
      playPauseIcon.setAttribute('aria-label', '再生');
      playPauseBtn.title = '再生';
    }

    // 削除ボタンのアイコン設定
    const deleteIcon = deleteBtn.querySelector('.button-icon') as HTMLElement;
    deleteIcon.innerHTML = ICONS.delete;
  } else {
    uploadZone.style.display = 'block';
    loadedZone.style.display = 'none';
  }
}

/**
 * VRMA時間表示更新
 */
function updateVRMATimeDisplay(currentTime: number, duration: number): void {
  const currentTimeSpan = document.getElementById('vrma-current-time') as HTMLSpanElement;
  if (currentTimeSpan) {
    currentTimeSpan.textContent = `${currentTime.toFixed(1)}s / ${duration.toFixed(1)}s`;
  }
}

/**
 * 選択VRMの現在時刻表示更新
 */
function updateVRMACurrentTime(vrmViewer: VRMViewerRefactored): void {
  const animationInfo = vrmViewer.getAnimationInfo();
  if (animationInfo) {
    const currentTime = vrmViewer.getCurrentAnimationTime();
    updateVRMATimeDisplay(currentTime, animationInfo.duration);
  }
}

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
/**
 * UI-001: 上部ツールバーのプルダウンメニュー座標系切替イベントハンドラーを設定
 */
function setupToolbarHandlers(vrmViewer: VRMViewerRefactored): void {
  const coordinateSpaceSelect = document.getElementById('coordinate-space-select') as HTMLSelectElement;

  // プルダウンメニューの変更イベント
  coordinateSpaceSelect?.addEventListener('change', (event) => {
    const selectedValue = (event.target as HTMLSelectElement).value as 'world' | 'local';
    
    // ルート・ボーン両方の座標系を統一して更新
    vrmViewer.setRootTransformSpace(selectedValue);
    vrmViewer.setBoneTransformSpace(selectedValue);
    
    // 旧モーダル同期（現在は不要だが互換性のため残存）
    syncModalCoordinateSpace(selectedValue);
    
    console.log(`ツールバー: 座標系を${selectedValue === 'world' ? 'Global' : 'Local'}に統一設定`);
  });
}

/**
 * UI-001: モーダル内の座標系表示が削除されたため、この関数は不要になりました
 * ツールバーのみが座標系制御を行います
 */
function syncModalCoordinateSpace(space: 'world' | 'local'): void {
  // モーダル内の座標系表示を削除したため、同期処理は不要
  console.log(`座標系同期: ${space} (モーダル内表示は削除済み)`);
}

/**
 * ツールバーのプルダウンメニューを現在の設定と同期
 */
function syncToolbarCoordinateSpace(vrmViewer: VRMViewerRefactored): void {
  // 現在のルート座標系を取得（優先的に使用）
  const currentSpace = vrmViewer.getRootTransformSpace();
  
  const coordinateSpaceSelect = document.getElementById('coordinate-space-select') as HTMLSelectElement;
  
  if (coordinateSpaceSelect) {
    coordinateSpaceSelect.value = currentSpace;
  }
}

function setupModalHandlers(_vrmViewer: VRMViewerRefactored): void {
  const openLoadModalBtn = document.getElementById('open-load-modal') as HTMLButtonElement;
  const modalCloseBtn = document.getElementById('modal-close') as HTMLSpanElement;
  const metaModalCloseBtn = document.getElementById('meta-modal-close') as HTMLSpanElement;
  const modelModalCloseBtn = document.getElementById('model-modal-close') as HTMLSpanElement;
  // UI-002: ヘルプモーダル用のボタン要素を取得
  const openHelpModalBtn = document.getElementById('open-help-modal') as HTMLButtonElement;
  const helpModalCloseBtn = document.getElementById('help-modal-close') as HTMLSpanElement;

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

  // UI-002: ヘルプモーダル用のイベントハンドラー
  openHelpModalBtn?.addEventListener('click', () => {
    showModal('help-modal');
  });

  helpModalCloseBtn?.addEventListener('click', () => {
    closeModal('help-modal');
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
  // VRM選択変更時の処理
  eventBus.on('vrm:selected', ({ index, vrm }) => {
    updateModelList(vrmViewer);
    updateSelectedModelControls(vrmViewer);
    updateExpressionControls(vrmViewer, index, vrm); // FEAT-011: 表情制御UI更新
    updateVRMAUI(vrmViewer); // FEAT-013: VRMA UI更新
    updateVRMACurrentTime(vrmViewer); // FEAT-013: 選択VRMの現在時刻表示更新
  });

  // VRM削除時の処理
  eventBus.on('vrm:removed', () => {
    updateModelList(vrmViewer);
    updateSelectedModelControls(vrmViewer);
    updateExpressionControls(vrmViewer, -1, null); // FEAT-011: 表情制御UI更新
    updateVRMAUI(vrmViewer); // FEAT-013: VRMA UI更新
    updateVRMCount(vrmViewer); // 追加: VRM数の更新
  });

  // 選択解除時の処理
  eventBus.on('vrm:selection-cleared', () => {
    updateSelectedModelControls(vrmViewer);
    updateExpressionControls(vrmViewer, -1, null); // FEAT-011: 表情制御UI更新
    updateVRMAUI(vrmViewer); // FEAT-013: VRMA UI更新
  });

  // ボーン選択変更時の処理
  eventBus.on('bone:selected', ({ boneName }) => {
    const selectedBoneNameElement = document.getElementById('selected-bone-name') as HTMLSpanElement;
    if (selectedBoneNameElement) {
      selectedBoneNameElement.textContent = boneName || 'なし';
    }
  });

  // ライトヘルパー表示変更時の処理
  eventBus.on('light:visibility-changed', () => {
    updateLightHelperButtonText(vrmViewer);
  });

  // ライト選択状態変更時の処理
  eventBus.on('light:selected', ({ isSelected }) => {
    updateDirectionalLightSelectionButtonText(vrmViewer, isSelected);
  });

  // VRMロード時の処理
  eventBus.on('vrm:loaded', ({ index }) => {
    updateVRMCount(vrmViewer);
    updateModelList(vrmViewer);
    
    // 最初のVRMの場合は自動選択
    if (vrmViewer.getVRMCount() === 1) {
      vrmViewer.selectModel(0);
    }
    
    console.log(`VRM ${index} がロードされました`);
  });

  // 表情関連イベント - FEAT-011
  eventBus.on('expression:vrm-registered', ({ vrmIndex, expressionCount }) => {
    console.log(`VRM ${vrmIndex}: ${expressionCount} expressions registered`);
    if (vrmViewer.getSelectedModelIndex() === vrmIndex) {
      updateExpressionControls(vrmViewer, vrmIndex, vrmViewer.getSelectedModel());
    }
  });
  
  eventBus.on('expression:active-changed', ({ vrmIndex }) => {
    if (vrmViewer.getSelectedModelIndex() === vrmIndex) {
      updateExpressionControls(vrmViewer, vrmIndex, vrmViewer.getSelectedModel());
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
    
    // 現在のタブに応じたギズモ・ボーン制御を実行
    updateTabBasedControls(vrmViewer);
    
    // 表示ボタンの状態を新しく選択されたモデルの表示状態に同期
    updateVisibilityButtonState(vrmViewer);
    
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

/**
 * 方向性ライト選択ボタンのテキストを更新
 */
function updateDirectionalLightSelectionButtonText(vrmViewer: VRMViewerRefactored, isSelected?: boolean): void {
  const selectDirectionalLightBtn = document.getElementById('select-directional-light') as HTMLButtonElement;
  if (selectDirectionalLightBtn) {
    const selected = isSelected !== undefined ? isSelected : vrmViewer.isDirectionalLightSelected();
    selectDirectionalLightBtn.textContent = selected ? '選択解除' : '方向性ライト選択';
  }
}

/**
 * 現在のタブに応じたギズモ・ボーン制御を実行
 * モデル切り替え時に呼び出される
 */
function updateTabBasedControls(vrmViewer: VRMViewerRefactored): void {
  // 現在アクティブなタブを取得
  const activeTabButton = document.querySelector('.tab-button.active') as HTMLButtonElement;
  
  if (activeTabButton) {
    const currentTab = activeTabButton.getAttribute('data-tab');
    
    if (currentTab) {
      // 現在のタブに応じたVRMコントローラー制御を実行
      executeTabSpecificActions(currentTab, vrmViewer);
    }
  }
}

/**
 * 表示ボタンの状態を新しく選択されたモデルの表示状態に同期
 * モデル切り替え時に呼び出される
 */
function updateVisibilityButtonState(vrmViewer: VRMViewerRefactored): void {
  const visibilityButton = document.getElementById('toggle-model-visibility') as HTMLButtonElement;
  
  if (visibilityButton) {
    // 現在選択されているモデルの表示状態を取得
    const selectedModel = vrmViewer.getSelectedModel();
    const isVisible = selectedModel && (selectedModel as any).scene ? (selectedModel as any).scene.visible : true;
    
    // 表示ボタンのアイコンを実際の表示状態に同期
    updateVisibilityButtonIcon(visibilityButton, isVisible);
  }
}

function showMetaInfoModal(vrmViewer: VRMViewerRefactored, index: number): void {
  const modal = document.getElementById('meta-info-modal');
  const content = document.getElementById('meta-info-content');

  if (!modal || !content) return;

  const modelData = vrmViewer.getVRMModels()[index];
  if (!modelData) return;

  // メタ情報をHTMLとして構築（VRMバージョンによって分岐）
  const vrmMeta = (modelData as any).vrmMeta;

  let metaHtml = '';
  
  if (vrmMeta) {
    metaHtml = `
      <div class="meta-group">
        <h3>基本情報</h3>
        <p><strong>名前:</strong> ${vrmMeta.name || 'Unknown'}</p>
        <p><strong>作者:</strong> ${Array.isArray(vrmMeta.authors) ? vrmMeta.authors.join(', ') : (vrmMeta.authors || 'Unknown')}</p>
        <p><strong>バージョン:</strong> ${vrmMeta.version || 'Unknown'}</p>
        <p><strong>VRM仕様バージョン:</strong> ${vrmMeta.detectedVersion || 'Unknown'}</p>
      </div>
      
      <div class="meta-group">
        <h3>ライセンス情報</h3>
        <p><strong>ライセンス:</strong> ${vrmMeta.licenseName || vrmMeta.licenseUrl || 'Unknown'}</p>
        <p><strong>商用利用:</strong> ${vrmMeta.commercialUssageName || vrmMeta.commercialUsage || 'Unknown'}</p>
        <p><strong>暴力表現:</strong> ${vrmMeta.violentUssageName || (vrmMeta.allowExcessivelyViolentUsage ? 'Allow' : 'Disallow')}</p>
        <p><strong>性的表現:</strong> ${vrmMeta.sexualUssageName || (vrmMeta.allowExcessivelySexualUsage ? 'Allow' : 'Disallow')}</p>
      </div>
      
      <div class="meta-group">
        <h3>連絡先・参考情報</h3>
        <p><strong>連絡先:</strong> ${vrmMeta.contactInformation || 'なし'}</p>
        <p><strong>参考URL:</strong> ${Array.isArray(vrmMeta.references) ? vrmMeta.references.join(', ') : (vrmMeta.references || 'なし')}</p>
      </div>
    `;

    // サムネイル画像がある場合は表示
    if (vrmMeta.thumbnailImage) {
      metaHtml = `
        <div class="meta-group">
          <h3>サムネイル</h3>
          <img src="${vrmMeta.thumbnailImage}" alt="VRM サムネイル" style="max-width: 200px; max-height: 200px; border-radius: 8px;">
        </div>
      ` + metaHtml;
    }
  } else {
    metaHtml = '<p>メタ情報が取得できませんでした。</p>';
  }

  content.innerHTML = metaHtml;
  showModal('meta-info-modal');
}

// === FEAT-011: 表情制御UI関数群 ===

/**
 * 表情制御UIを更新
 * @param vrmViewer VRMViewerインスタンス
 * @param index 選択VRMインデックス 
 * @param vrm 選択VRMオブジェクト
 */
function updateExpressionControls(vrmViewer: VRMViewerRefactored, index: number, vrm: any): void {
  const statusElement = document.getElementById('expression-status');
  const controlsElement = document.getElementById('expression-controls');
  
  if (!statusElement || !controlsElement) return;

  // VRMが選択されていない場合
  if (index === -1 || !vrm) {
    statusElement.innerHTML = '<p class="expression-info">モデルを選択してください</p>';
    controlsElement.style.display = 'none';
    controlsElement.innerHTML = '';
    return;
  }

  const expressionController = vrmViewer.getExpressionController();
  const expressionData = expressionController.getActiveExpressionData();

  // 表情データが利用できない場合
  if (!expressionData || !expressionData.hasExpressions) {
    statusElement.innerHTML = '<p class="expression-info">このモデルに表情データはありません</p>';
    controlsElement.style.display = 'none';
    controlsElement.innerHTML = '';
    return;
  }

  // 表情制御UI表示
  statusElement.innerHTML = `<p class="expression-info">利用可能表情: ${expressionData.availableExpressions.length}個</p>`;
  controlsElement.style.display = 'block';

  // 表情スライダーを生成
  controlsElement.innerHTML = '';
  expressionData.availableExpressions.forEach(expressionName => {
    const sliderGroup = createExpressionSlider(expressionName, vrmViewer);
    controlsElement.appendChild(sliderGroup);
  });
}

/**
 * 表情スライダー要素を作成
 * @param expressionName 表情名
 * @param vrmViewer VRMViewerインスタンス
 * @returns HTMLElement
 */
function createExpressionSlider(expressionName: string, vrmViewer: VRMViewerRefactored): HTMLElement {
  const sliderGroup = document.createElement('div');
  sliderGroup.className = 'expression-slider-group';
  
  const expressionController = vrmViewer.getExpressionController();
  const currentValue = expressionController.getExpression(expressionName) || 0;

  sliderGroup.innerHTML = `
    <label class="expression-label">${expressionName}</label>
    <input 
      type="range" 
      class="expression-slider" 
      min="0" 
      max="1" 
      step="0.01" 
      value="${currentValue}"
      data-expression="${expressionName}"
    />
  `;

  // スライダーイベントリスナー設定
  const slider = sliderGroup.querySelector('.expression-slider') as HTMLInputElement;

  if (slider) {
    slider.addEventListener('input', () => {
      const value = parseFloat(slider.value);
      
      // リアルタイム表情更新
      expressionController.setExpression(expressionName, value);
    });
  }

  return sliderGroup;
}

/**
 * 初期アイコン設定
 */
function initializeIcons(): void {
  // 表示切替ボタンの初期化
  const visibilityBtn = document.getElementById('toggle-model-visibility') as HTMLButtonElement;
  if (visibilityBtn) {
    const iconDiv = visibilityBtn.querySelector('.button-icon') as HTMLElement;
    iconDiv.innerHTML = ICONS.visibility;
  }

  // VRMAコントロールボタンの初期化
  const playPauseBtn = document.getElementById('vrma-play-pause') as HTMLButtonElement;
  const deleteBtn = document.getElementById('vrma-delete') as HTMLButtonElement;

  if (playPauseBtn) {
    const playPauseIcon = playPauseBtn.querySelector('.button-icon') as HTMLElement;
    playPauseIcon.innerHTML = ICONS.play_arrow;
  }

  if (deleteBtn) {
    const deleteIcon = deleteBtn.querySelector('.button-icon') as HTMLElement;
    deleteIcon.innerHTML = ICONS.delete;
  }
}

// アプリケーションを開始
main().catch(console.error);
