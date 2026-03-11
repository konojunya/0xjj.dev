'use strict';

importScripts('/opencv/opencv.js');

function initialize() {
  if (typeof cv === 'undefined') {
    self.postMessage({ type: 'error', error: 'OpenCV の読み込みに失敗しました。' });
    return;
  }

  var onReady = function () {
    self.postMessage({ type: 'ready' });
  };

  if (typeof cv.Mat !== 'undefined') {
    onReady();
  } else {
    cv.onRuntimeInitialized = onReady;
  }
}

initialize();

self.onmessage = function (e) {
  var msg = e.data;

  if (msg.type === 'status') {
    self.postMessage({ type: 'status', ready: typeof cv !== 'undefined' && typeof cv.Mat !== 'undefined' });
  }
};
