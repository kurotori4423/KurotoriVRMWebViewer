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
