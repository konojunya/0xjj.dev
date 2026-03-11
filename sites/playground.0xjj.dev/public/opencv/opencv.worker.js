'use strict';

importScripts('/opencv/opencv.js');

var classifier = null;
var ready = false;

function initialize() {
  if (typeof cv === 'undefined') {
    self.postMessage({ type: 'error', error: 'OpenCV の読み込みに失敗しました。' });
    return;
  }

  var onReady = function () {
    loadClassifier();
  };

  if (typeof cv.Mat !== 'undefined') {
    onReady();
  } else {
    cv.onRuntimeInitialized = onReady;
  }
}

function loadClassifier() {
  try {
    var xhr = new XMLHttpRequest();
    xhr.open('GET', '/opencv/haarcascade_frontalface_default.xml', false);
    xhr.responseType = 'arraybuffer';
    xhr.send();

    if (xhr.status !== 200) {
      self.postMessage({ type: 'error', error: 'Cascade XML の読み込みに失敗しました。' });
      return;
    }

    var data = new Uint8Array(xhr.response);
    cv.FS_createDataFile('/', 'haarcascade.xml', data, true, false, false);

    classifier = new cv.CascadeClassifier();
    var loaded = classifier.load('/haarcascade.xml');

    if (!loaded) {
      self.postMessage({ type: 'error', error: 'CascadeClassifier の読み込みに失敗しました。' });
      return;
    }

    ready = true;
    self.postMessage({ type: 'ready' });
  } catch (e) {
    self.postMessage({ type: 'error', error: 'CascadeClassifier の初期化に失敗: ' + e.message });
  }
}

initialize();

self.onmessage = function (e) {
  var msg = e.data;

  if (msg.type === 'detect') {
    if (!ready || !classifier) {
      self.postMessage({ type: 'detect-result', faces: [] });
      return;
    }

    var width = msg.width;
    var height = msg.height;
    var buffer = msg.buffer;

    var src = null;
    var gray = null;
    var faces = null;

    try {
      var data = new Uint8ClampedArray(buffer);
      src = cv.matFromImageData({ data: data, width: width, height: height });
      gray = new cv.Mat();
      cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY);
      cv.equalizeHist(gray, gray);

      faces = new cv.RectVector();
      var minSize = new cv.Size(Math.round(width * 0.05), Math.round(height * 0.05));
      classifier.detectMultiScale(gray, faces, 1.1, 4, 0, minSize);

      var result = [];
      for (var i = 0; i < faces.size(); i++) {
        var r = faces.get(i);
        result.push({ x: r.x, y: r.y, w: r.width, h: r.height });
      }

      self.postMessage({ type: 'detect-result', faces: result });
    } catch (err) {
      self.postMessage({ type: 'detect-result', faces: [] });
    } finally {
      if (src) src.delete();
      if (gray) gray.delete();
      if (faces) faces.delete();
    }
  }
};
