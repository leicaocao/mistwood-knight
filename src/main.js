import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

const mount = document.querySelector("#scene");
const loading = document.querySelector("#loading");
const loadingText = document.querySelector("#loading-text");
const loadingDetail = document.querySelector("#loading-detail");
const loadingProgress = document.querySelector("#loading-progress");
const motion = document.querySelector("#motion");
const keys = { forward: false, back: false, left: false, right: false, run: false };

function seededRandom(seed) {
  let value = seed;
  return () => {
    value = Math.sin(value) * 10000;
    return value - Math.floor(value);
  };
}

function setShadows(root, cast = true) {
  root.traverse((child) => {
    if (child.isMesh) {
      child.castShadow = cast;
      child.receiveShadow = true;
    }
  });
}

const scene = new THREE.Scene();
scene.background = new THREE.Color(0xb9d8c2);
scene.fog = new THREE.FogExp2(0x9bb9a4, 0.021);

const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 180);
camera.position.set(7.2, 5.2, 9.4);

const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.08;
mount.appendChild(renderer.domElement);

scene.add(new THREE.HemisphereLight(0xeaf5ff, 0x3b5136, 2.3));
const sun = new THREE.DirectionalLight(0xffefc2, 3.2);
sun.position.set(-14, 22, 10);
sun.castShadow = true;
sun.shadow.mapSize.set(1536, 1536);
sun.shadow.camera.left = -32;
sun.shadow.camera.right = 32;
sun.shadow.camera.top = 32;
sun.shadow.camera.bottom = -32;
sun.shadow.camera.near = 1;
sun.shadow.camera.far = 62;
scene.add(sun);

const ground = new THREE.Mesh(
  new THREE.CircleGeometry(48, 64),
  new THREE.MeshStandardMaterial({ color: 0x6f9458, roughness: 1 })
);
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);

const path = new THREE.Mesh(
  new THREE.PlaneGeometry(6.2, 72),
  new THREE.MeshStandardMaterial({ color: 0xb6a27c, roughness: 1 })
);
path.rotation.x = -Math.PI / 2;
path.rotation.z = -0.08;
path.position.y = 0.012;
path.receiveShadow = true;
scene.add(path);

const clearing = new THREE.Mesh(
  new THREE.CircleGeometry(8.5, 40),
  new THREE.MeshStandardMaterial({ color: 0x819e61, roughness: 1 })
);
clearing.rotation.x = -Math.PI / 2;
clearing.position.y = 0.02;
clearing.receiveShadow = true;
scene.add(clearing);

const manager = new THREE.LoadingManager();
manager.onProgress = (_url, loaded, total) => {
  const percent = total ? Math.round((loaded / total) * 100) : 0;
  loadingProgress.style.width = `${percent}%`;
  loadingDetail.textContent = `正在装配模型 ${loaded}/${total}`;
};
manager.onError = (url) => {
  loadingDetail.textContent = `读取失败：${url.split("/").pop()}`;
};

const loader = new GLTFLoader(manager);
const loadGLTF = (url) => loader.loadAsync(url);

async function createKnightRig() {
  const [character, generalAnimations, movementAnimations] = await Promise.all([
    loadGLTF("./models/characters/Knight.glb"),
    loadGLTF("./models/animations/Rig_Medium_General.glb"),
    loadGLTF("./models/animations/Rig_Medium_MovementBasic.glb"),
  ]);

  const root = new THREE.Group();
  const visual = new THREE.Group();
  const model = character.scene;
  root.add(visual);
  visual.add(model);

  setShadows(model);
  model.rotation.y = Math.PI;
  model.updateMatrixWorld(true);

  const initialBox = new THREE.Box3().setFromObject(model);
  const initialHeight = initialBox.max.y - initialBox.min.y;
  const scale = 2.7 / initialHeight;
  model.scale.setScalar(scale);
  model.updateMatrixWorld(true);
  const scaledBox = new THREE.Box3().setFromObject(model);
  model.position.y -= scaledBox.min.y;

  root.position.set(0, 0, 1.5);
  root.rotation.y = Math.PI;

  const clips = [...generalAnimations.animations, ...movementAnimations.animations];
  const clipByName = (name) => THREE.AnimationClip.findByName(clips, name);
  const mixer = new THREE.AnimationMixer(model);
  const actions = {
    idle: mixer.clipAction(clipByName("Idle_A")),
    walk: mixer.clipAction(clipByName("Walking_A")),
    run: mixer.clipAction(clipByName("Running_A")),
  };
  actions.idle.play();
  let activeAction = actions.idle;

  const setAnimation = (state) => {
    const nextAction = actions[state];
    if (!nextAction || nextAction === activeAction) return;
    nextAction.reset().setEffectiveTimeScale(1).setEffectiveWeight(1).fadeIn(0.18).play();
    activeAction.fadeOut(0.18);
    activeAction = nextAction;
  };

  return { root, visual, mixer, setAnimation };
}

async function loadForestTemplates() {
  const files = [
    "Tree_1_A_Color1.gltf",
    "Tree_2_A_Color1.gltf",
    "Tree_3_A_Color1.gltf",
    "Bush_2_A_Color1.gltf",
    "Rock_1_A_Color1.gltf",
  ];
  const models = await Promise.all(files.map((file) => loadGLTF(`./models/forest/${file}`)));
  return {
    trees: models.slice(0, 3).map((model) => model.scene),
    bush: models[3].scene,
    rock: models[4].scene,
  };
}

function placeModel(template, x, z, scale, rotation) {
  const object = template.clone(true);
  object.position.set(x, 0, z);
  object.rotation.y = rotation;
  object.scale.setScalar(scale);
  setShadows(object);
  scene.add(object);
  return object;
}

function populateForest(templates) {
  const random = seededRandom(21);

  for (let index = 0; index < 72; index += 1) {
    const angle = random() * Math.PI * 2;
    const radius = 10 + random() * 34;
    let x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;
    if (Math.abs(x) < 4.2) x += x < 0 ? -5.2 : 5.2;
    placeModel(
      templates.trees[index % templates.trees.length],
      x,
      z,
      0.92 + random() * 0.46,
      random() * Math.PI * 2
    );
  }

  for (let index = 0; index < 86; index += 1) {
    const isBush = random() > 0.36;
    const angle = random() * Math.PI * 2;
    const radius = 7 + random() * 36;
    let x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;
    if (Math.abs(x) < 3.6) x += x < 0 ? -4.6 : 4.6;
    placeModel(
      isBush ? templates.bush : templates.rock,
      x,
      z,
      isBush ? 0.7 + random() * 0.85 : 0.55 + random() * 0.9,
      random() * Math.PI * 2
    );
  }
}

let knight = null;

async function loadWorld() {
  loadingText.textContent = "正在唤醒真正的森林";
  const [loadedKnight, forestTemplates] = await Promise.all([
    createKnightRig(),
    loadForestTemplates(),
  ]);
  knight = loadedKnight;
  scene.add(knight.root);
  populateForest(forestTemplates);
  loadingProgress.style.width = "100%";
  loadingDetail.textContent = "模型与动画已就绪";
  requestAnimationFrame(() => loading.classList.add("ready"));
}

const resize = () => {
  const width = mount.clientWidth;
  const height = mount.clientHeight;
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  renderer.setSize(width, height, false);
};
resize();
window.addEventListener("resize", resize);

const keyMap = {
  KeyW: "forward", ArrowUp: "forward", KeyS: "back", ArrowDown: "back",
  KeyA: "left", ArrowLeft: "left", KeyD: "right", ArrowRight: "right",
  ShiftLeft: "run", ShiftRight: "run",
};

for (const eventName of ["keydown", "keyup"]) {
  window.addEventListener(eventName, (event) => {
    const action = keyMap[event.code];
    if (!action) return;
    event.preventDefault();
    keys[action] = eventName === "keydown";
  });
}

document.querySelectorAll("[data-key]").forEach((button) => {
  const action = button.dataset.key;
  const release = () => { keys[action] = false; };
  button.addEventListener("pointerdown", (event) => {
    event.preventDefault();
    button.setPointerCapture(event.pointerId);
    keys[action] = true;
  });
  button.addEventListener("pointerup", release);
  button.addEventListener("pointercancel", release);
  button.addEventListener("lostpointercapture", release);
});

const velocity = new THREE.Vector3();
const move = new THREE.Vector3();
const cameraGoal = new THREE.Vector3();
const lookGoal = new THREE.Vector3();
const desiredQuaternion = new THREE.Quaternion();
const desiredEuler = new THREE.Euler();
const facing = new THREE.Vector3();
const cameraLift = new THREE.Vector3(0, 4.7, 0);
const lookLift = new THREE.Vector3(0, 1.35, 0);
const stopped = new THREE.Vector3();
let previousTime = performance.now();
let currentState = "idle";

function showState(state) {
  if (state === currentState) return;
  currentState = state;
  motion.textContent = state === "run" ? "奔跑" : state === "walk" ? "行走" : "待命";
  knight?.setAnimation(state);
}

function tick(time) {
  requestAnimationFrame(tick);
  const delta = Math.min((time - previousTime) / 1000, 0.05);
  previousTime = time;

  if (knight) {
    move.set(
      (keys.right ? 1 : 0) - (keys.left ? 1 : 0),
      0,
      (keys.back ? 1 : 0) - (keys.forward ? 1 : 0)
    );

    const moving = move.lengthSq() > 0;
    const running = moving && keys.run;
    if (moving) {
      move.normalize();
      const speed = running ? 6.2 : 3.35;
      velocity.lerp(move.multiplyScalar(speed), 1 - Math.exp(-delta * 14));
      desiredEuler.set(0, Math.atan2(velocity.x, velocity.z), 0);
      desiredQuaternion.setFromEuler(desiredEuler);
      knight.root.quaternion.slerp(desiredQuaternion, 1 - Math.exp(-delta * 12));
      showState(running ? "run" : "walk");
    } else {
      velocity.lerp(stopped, 1 - Math.exp(-delta * 18));
      showState("idle");
    }

    knight.mixer.update(delta);
    knight.root.position.addScaledVector(velocity, delta);
    const distance = Math.hypot(knight.root.position.x, knight.root.position.z);
    if (distance > 41) {
      knight.root.position.x *= 41 / distance;
      knight.root.position.z *= 41 / distance;
    }

    facing.set(0, 0, 1).applyQuaternion(knight.root.quaternion);
    cameraGoal.copy(knight.root.position).addScaledVector(facing, -7.1).add(cameraLift);
    camera.position.lerp(cameraGoal, 1 - Math.exp(-delta * 4.7));
    lookGoal.copy(knight.root.position).add(lookLift);
    camera.lookAt(lookGoal);
  }

  renderer.render(scene, camera);
}

requestAnimationFrame(tick);
loadWorld().catch((error) => {
  console.error(error);
  loadingText.textContent = "模型加载失败";
  loadingDetail.textContent = "请刷新页面重试";
  loadingProgress.classList.add("failed");
});
