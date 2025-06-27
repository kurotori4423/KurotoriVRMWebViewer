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
  } catch (error) {
    console.error('VRMビューワーの初期化に失敗しました:', error);
  }
}

// アプリケーションを開始
main().catch(console.error);
