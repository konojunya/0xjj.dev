import { useEffect, useRef } from "react";
import fontData from "@compai/font-fugaz-one/data/typefaces/normal-400.json";
import { getProject, types, val } from "@theatre/core";
import studio from "@theatre/studio";
import { motion, useAnimation } from "framer-motion";
import * as THREE from "three";
import { TextGeometry } from "three/addons/geometries/TextGeometry.js";
import { FontLoader } from "three/addons/loaders/FontLoader.js";
import * as BufferGeometryUtils from "three/addons/utils/BufferGeometryUtils.js";
import { throttle } from "throttle-debounce";
import state from "./state.json";

const project = getProject("Project JJ", { state });
const sheet = project.sheet("KeyVisual");

/**
 * handle scroll events
 */
window.addEventListener(
  "scroll",
  throttle(100, () => {
    const scroll = window.scrollY;
    const documentHeight =
      document.documentElement.scrollHeight - window.innerHeight;
    const scrollProgress = scroll / documentHeight;

    sheet.sequence.position =
      scrollProgress * val(sheet.sequence.pointer.length);
  }),
);

/**
 * Camera
 */
const camera = new THREE.PerspectiveCamera(
  70,
  window.innerWidth / window.innerHeight,
  10,
  200,
);

camera.position.z = 50;

/**
 * Scene
 */
const scene = new THREE.Scene();

/**
 * Text
 */
(() => {
  const material = new THREE.MeshStandardMaterial({
    color: "#ffffff",
    emissive: "#e954f4",
  });

  const font = new FontLoader().parse(fontData as any);

  const geometry = new TextGeometry("Hello,\nI'm JJ", {
    font: font,
    size: 5,
    depth: 3,
    curveSegments: 12,
    bevelEnabled: true,
    bevelThickness: 1,
    bevelSize: 0.5,
    bevelOffset: 0,
    bevelSegments: 5,
  });
  geometry.center(); // テキストを中心揃え

  // メッシュの作成と追加
  const textGeometry2 = geometry.clone().deleteAttribute("normal");
  const textGeometry3 = BufferGeometryUtils.mergeVertices(textGeometry2);
  textGeometry3.computeVertexNormals();

  const textMesh = new THREE.Mesh(textGeometry3, material);
  textMesh.position.set(-1.5, 0, 0);
  scene.add(textMesh);

  const mainTextObject = sheet.object("MainText", {
    position: types.compound({
      x: types.number(textMesh.position.x, { range: [-20, 20] }),
      y: types.number(textMesh.position.y, { range: [-20, 20] }),
      z: types.number(textMesh.position.z, { range: [-20, 20] }),
    }),
    rotate: types.compound({
      x: types.number(0, { range: [-2, 2] }),
      y: types.number(0, { range: [-2, 2] }),
      z: types.number(0, { range: [-2, 2] }),
    }),
    color: types.rgba({ r: 255, g: 255, b: 255, a: 1 }),
  });

  mainTextObject.onValuesChange((values) => {
    const { position, rotate } = values;
    textMesh.position.set(position.x, position.y, position.z);
    textMesh.rotation.set(
      rotate.x * Math.PI,
      rotate.y * Math.PI,
      rotate.z * Math.PI,
    );
    textMesh.material.color.setRGB(
      values.color.r,
      values.color.g,
      values.color.b,
    );
  });
})();

/**
 * Lights
 */
(() => {
  // Ambient Light
  const ambientLight = new THREE.AmbientLight("#ffffff", 0.5);
  scene.add(ambientLight);

  // Point light
  const directionalLight = new THREE.DirectionalLight("#6c20ff", 90);
  directionalLight.position.y = 20;
  directionalLight.position.z = 20;

  directionalLight.castShadow = true;

  directionalLight.shadow.mapSize.width = 2048;
  directionalLight.shadow.mapSize.height = 2048;
  directionalLight.shadow.camera.far = 100;
  directionalLight.shadow.camera.near = 1;
  directionalLight.shadow.camera.top = 20;
  directionalLight.shadow.camera.right = 20;
  directionalLight.shadow.camera.bottom = -20;
  directionalLight.shadow.camera.left = -20;

  scene.add(directionalLight);
})();

/**
 * Renderer
 */
const renderer = new THREE.WebGLRenderer({ antialias: true });

renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.render(scene, camera);

/**
 * Update the screen
 */
function tick(): void {
  renderer.render(scene, camera);

  window.requestAnimationFrame(tick);
}

/**
 * Handle `resize` events
 */
window.addEventListener(
  "resize",
  () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();

    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  },
  false,
);

if (import.meta.env.DEV) {
  studio.initialize();
}

const blurVariants = {
  hidden: { filter: "blur(80px)" },
  visible: {
    filter: "blur(0px)",
    transition: { duration: 0.8, ease: "easeInOut" },
  },
};

export const KeyVisual: React.FC = () => {
  const ref = useRef<HTMLDivElement>(null);
  const control = useAnimation();

  useEffect(() => {
    ref.current?.append(renderer.domElement);
    tick();
    control.start("visible");
  }, [control]);

  return (
    <motion.div
      initial="hidden"
      animate={control}
      variants={blurVariants}
      className="m-0 h-screen"
      ref={ref}
    />
  );
};
