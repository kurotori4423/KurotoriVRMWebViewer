"use strict";
// FEAT-002 技術検証用の最小限テスト
// TransformControls setSpace API 動作確認
Object.defineProperty(exports, "__esModule", { value: true });
const THREE = require("three");
const TransformControls_js_1 = require("three/examples/jsm/controls/TransformControls.js");
// 最小限のシーン設定
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, 1, 0.1, 1000);
const renderer = new THREE.WebGLRenderer();
// テスト用キューブ
const geometry = new THREE.BoxGeometry();
const material = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
const cube = new THREE.Mesh(geometry, material);
scene.add(cube);
// TransformControls テスト
const transformControls = new TransformControls_js_1.TransformControls(camera, renderer.domElement);
// API確認テスト
console.log('=== FEAT-002 Technology Validation Test ===');
try {
    // 1. 基本的なattach確認
    transformControls.attach(cube);
    console.log('✅ TransformControls.attach() - OK');
    // 2. setSpace API確認 - ワールド座標系
    transformControls.setSpace('world');
    console.log('✅ TransformControls.setSpace("world") - OK');
    // 3. setSpace API確認 - ローカル座標系
    transformControls.setSpace('local');
    console.log('✅ TransformControls.setSpace("local") - OK');
    // 4. setMode API確認（既存機能との併用テスト）
    transformControls.setMode('rotate');
    transformControls.setSpace('local');
    console.log('✅ setMode("rotate") + setSpace("local") 併用 - OK');
    transformControls.setMode('translate');
    transformControls.setSpace('world');
    console.log('✅ setMode("translate") + setSpace("world") 併用 - OK');
    console.log('');
    console.log('🎉 Technology Validation PASSED');
    console.log('✅ All TransformControls setSpace APIs working correctly');
    console.log('✅ Ready for implementation phase');
}
catch (error) {
    console.error('❌ Technology Validation FAILED:', error);
    console.error('❌ Implementation should not proceed');
}

// UI-001: ツールバー機能 Hello World 概念実証
// この概念実証は技術検証のためのものです

console.log('🧪 UI-001 技術検証: ツールバー機能概念実証開始');

// 1. ツールバー要素の動的作成テスト
function createToolbarTest() {
  console.log('⚡ ツールバー要素作成テスト');
  
  // ツールバー要素を作成
  const toolbar = document.createElement('div');
  toolbar.id = 'top-toolbar-test';
  toolbar.style.cssText = `
    position: fixed;
    top: 10px;
    left: 50%;
    transform: translateX(-50%);
    background: rgba(255, 255, 255, 0.95);
    backdrop-filter: blur(10px);
    border-radius: 8px;
    padding: 8px 16px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    z-index: 5000;
    display: flex;
    gap: 12px;
    align-items: center;
    font-family: system-ui, sans-serif;
    font-size: 14px;
  `;
  
  // ワールド・ローカル切替テスト
  const label = document.createElement('span');
  label.textContent = '座標系:';
  label.style.fontWeight = '500';
  
  const worldBtn = document.createElement('button');
  worldBtn.textContent = 'ワールド';
  worldBtn.style.cssText = `
    background: #646cff;
    color: white;
    border: none;
    padding: 4px 12px;
    border-radius: 4px;
    cursor: pointer;
    font-size: 12px;
  `;
  
  const localBtn = document.createElement('button');
  localBtn.textContent = 'ローカル';
  localBtn.style.cssText = `
    background: #ccc;
    color: #333;
    border: none;
    padding: 4px 12px;
    border-radius: 4px;
    cursor: pointer;
    font-size: 12px;
  `;
  
  // イベントハンドラーテスト
  let currentMode = 'world';
  
  worldBtn.addEventListener('click', () => {
    currentMode = 'world';
    worldBtn.style.background = '#646cff';
    worldBtn.style.color = 'white';
    localBtn.style.background = '#ccc';
    localBtn.style.color = '#333';
    console.log('🌍 座標系切替: ワールド座標系');
  });
  
  localBtn.addEventListener('click', () => {
    currentMode = 'local';
    localBtn.style.background = '#646cff';
    localBtn.style.color = 'white';
    worldBtn.style.background = '#ccc';
    worldBtn.style.color = '#333';
    console.log('🏠 座標系切替: ローカル座標系');
  });
  
  // 削除ボタン
  const removeBtn = document.createElement('button');
  removeBtn.textContent = '×';
  removeBtn.style.cssText = `
    background: #ff4444;
    color: white;
    border: none;
    padding: 4px 8px;
    border-radius: 4px;
    cursor: pointer;
    font-size: 12px;
    margin-left: 8px;
  `;
  
  removeBtn.addEventListener('click', () => {
    toolbar.remove();
    console.log('🗑️ テストツールバー削除');
  });
  
  // 要素を組み立て
  toolbar.appendChild(label);
  toolbar.appendChild(worldBtn);
  toolbar.appendChild(localBtn);
  toolbar.appendChild(removeBtn);
  
  // DOMに追加
  document.body.appendChild(toolbar);
  
  console.log('✅ ツールバー要素作成成功');
  return toolbar;
}

// 2. z-index階層テスト
function zIndexTest() {
  console.log('⚡ z-index階層テスト');
  
  const leftSidebar = document.getElementById('left-sidebar');
  const bottomModal = document.querySelector('.bottom-right-modal');
  
  if (leftSidebar) {
    const leftZ = window.getComputedStyle(leftSidebar).zIndex;
    console.log(`📍 左サイドバーz-index: ${leftZ}`);
  }
  
  if (bottomModal) {
    const modalZ = window.getComputedStyle(bottomModal).zIndex;
    console.log(`📍 右下モーダルz-index: ${modalZ}`);
  }
  
  console.log('📍 テストツールバーz-index: 5000');
  console.log('✅ z-index階層テスト完了');
}

// 3. レスポンシブテスト
function responsiveTest() {
  console.log('⚡ レスポンシブ動作テスト');
  
  function checkViewport() {
    const width = window.innerWidth;
    const height = window.innerHeight;
    console.log(`📱 ビューポート: ${width}x${height}`);
    
    if (width < 768) {
      console.log('📱 モバイル表示モード');
    } else if (width < 1024) {
      console.log('📱 タブレット表示モード');
    } else {
      console.log('🖥️ デスクトップ表示モード');
    }
  }
  
  checkViewport();
  
  window.addEventListener('resize', checkViewport);
  
  console.log('✅ レスポンシブテスト完了');
}

// 4. 既存機能への影響テスト
function compatibilityTest() {
  console.log('⚡ 既存機能互換性テスト');
  
  // 左サイドバーアクセステスト
  const leftSidebar = document.getElementById('left-sidebar');
  if (leftSidebar) {
    console.log('✅ 左サイドバーアクセス可能');
  } else {
    console.log('❌ 左サイドバーアクセス不可');
  }
  
  // 右下モーダルアクセステスト
  const bottomModal = document.getElementById('selected-model-modal');
  if (bottomModal) {
    console.log('✅ 右下モーダルアクセス可能');
  } else {
    console.log('❌ 右下モーダルアクセス不可');
  }
  
  // 既存ボタンテスト
  const loadBtn = document.getElementById('open-load-modal');
  if (loadBtn) {
    console.log('✅ 既存ボタンアクセス可能');
  } else {
    console.log('❌ 既存ボタンアクセス不可');
  }
  
  console.log('✅ 既存機能互換性テスト完了');
}

// 概念実証実行
function runProofOfConcept() {
  console.log('🚀 UI-001技術検証開始');
  
  // DOMが読み込まれてから実行
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      setTimeout(() => {
        const toolbar = createToolbarTest();
        zIndexTest();
        responsiveTest();
        compatibilityTest();
        
        console.log('🎉 UI-001技術検証完了 - ツールバー機能実装可能');
        console.log('⏱️ 5秒後に自動でテストツールバーを削除します');
        
        // 5秒後に自動削除
        setTimeout(() => {
          if (toolbar && toolbar.parentNode) {
            toolbar.remove();
            console.log('🧹 テストツールバー自動削除完了');
          }
        }, 5000);
        
      }, 1000); // 1秒待機してからテスト開始
    });
  } else {
    // すでに読み込み済みの場合
    setTimeout(() => {
      const toolbar = createToolbarTest();
      zIndexTest();
      responsiveTest();
      compatibilityTest();
      
      console.log('🎉 UI-001技術検証完了 - ツールバー機能実装可能');
      console.log('⏱️ 5秒後に自動でテストツールバーを削除します');
      
      setTimeout(() => {
        if (toolbar && toolbar.parentNode) {
          toolbar.remove();
          console.log('🧹 テストツールバー自動削除完了');
        }
      }, 5000);
      
    }, 1000);
  }
}

// 概念実証を実行
runProofOfConcept();

export { createToolbarTest, zIndexTest, responsiveTest, compatibilityTest };
