'use strict';

importScripts('/opencv/opencv.js');

var ready = false;
var prevGray = null;
var flow = null;
var useInitialFlow = false;

// Downsample grid size
var GRID_W = 40;
var GRID_H = 30;

function initialize() {
  if (typeof cv === 'undefined') {
    self.postMessage({ type: 'error', error: 'OpenCV の読み込みに失敗しました。' });
    return;
  }

  var onReady = function () {
    ready = true;
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

  if (msg.type === 'frame') {
    if (!ready) return;

    var width = msg.width;
    var height = msg.height;
    var buffer = msg.buffer;

    var src = null;
    var gray = null;

    try {
      var data = new Uint8ClampedArray(buffer);
      src = cv.matFromImageData({ data: data, width: width, height: height });
      gray = new cv.Mat();
      cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY);

      if (prevGray !== null) {
        if (flow === null) {
          flow = new cv.Mat();
        }

        var flags = useInitialFlow ? cv.OPTFLOW_USE_INITIAL_FLOW : 0;
        cv.calcOpticalFlowFarneback(
          prevGray, gray, flow,
          0.5,   // pyrScale
          3,     // levels
          15,    // winsize
          3,     // iterations
          5,     // polyN
          1.2,   // polySigma
          flags
        );
        useInitialFlow = true;

        // Downsample flow to grid
        var cellW = width / GRID_W;
        var cellH = height / GRID_H;
        var flowX = new Float32Array(GRID_W * GRID_H);
        var flowY = new Float32Array(GRID_W * GRID_H);

        for (var gy = 0; gy < GRID_H; gy++) {
          for (var gx = 0; gx < GRID_W; gx++) {
            var sumX = 0;
            var sumY = 0;
            var count = 0;

            var startY = Math.floor(gy * cellH);
            var endY = Math.min(Math.floor((gy + 1) * cellH), height);
            var startX = Math.floor(gx * cellW);
            var endX = Math.min(Math.floor((gx + 1) * cellW), width);

            for (var py = startY; py < endY; py++) {
              for (var px = startX; px < endX; px++) {
                var idx = (py * width + px) * 2;
                sumX += flow.data32F[idx];
                sumY += flow.data32F[idx + 1];
                count++;
              }
            }

            var gi = gy * GRID_W + gx;
            if (count > 0) {
              flowX[gi] = sumX / count;
              flowY[gi] = sumY / count;
            }
          }
        }

        self.postMessage(
          { type: 'flow', flowX: flowX, flowY: flowY, gridW: GRID_W, gridH: GRID_H },
          [flowX.buffer, flowY.buffer]
        );
      }

      // Swap prevGray
      if (prevGray !== null) {
        prevGray.delete();
      }
      prevGray = gray;
      gray = null; // prevent deletion in finally

    } catch (err) {
      // Silently handle errors
    } finally {
      if (src) src.delete();
      if (gray) gray.delete();
    }
  }
};
