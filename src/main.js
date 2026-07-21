import * as THREE from "three";

const mount = document.querySelector("#scene");
const loading = document.querySelector("#loading");
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

function createKnight() {
  const root = new THREE.Group();
  const visual = new THREE.Group();
  root.add(visual);

  const steel = new THREE.MeshStandardMaterial({ color: 0x98a3a7, roughness: 0.48, metalness: 0.68 });
  const darkSteel = new THREE.MeshStandardMaterial({ color: 0x3c4748, roughness: 0.55, metalness: 0.5 });
  const leather = new THREE.MeshStandardMaterial({ color: 0x5b3826, roughness: 0.9 });
  const crimson = new THREE.MeshStandardMaterial({ color: 0x7d2831, roughness: 0.82 });
  const gold = new THREE.MeshStandardMaterial({ color: 0xc9a85c, roughness: 0.48, metalness: 0.5 });

  const cape = new THREE.Mesh(new THREE.BoxGeometry(0.82, 1.35, 0.08), crimson);
  cape.position.set(0, 1.45, -0.32);
  cape.rotation.x = -0.08;
  visual.add(cape);

  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.86, 1.05, 0.48), steel);
  torso.position.y = 1.45;
  visual.add(torso);

  const belt = new THREE.Mesh(new THREE.BoxGeometry(0.92, 0.16, 0.54), leather);
  belt.position.y = 1.02;
  visual.add(belt);

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.34, 8, 5), steel);
  head.position.y = 2.2;
  visual.add(head);

  const visor = new THREE.Mesh(new THREE.BoxGeometry(0.57, 0.19, 0.11), darkSteel);
  visor.position.set(0, 2.19, 0.31);
  visual.add(visor);

  const crest = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.46, 0.48), crimson);
  crest.position.set(0, 2.52, -0.03);
  visual.add(crest);

  const leftLeg = new THREE.Group();
  leftLeg.position.set(-0.25, 0.95, 0);
  const leftShin = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.92, 0.36), darkSteel);
  leftShin.position.y = -0.44;
  leftLeg.add(leftShin);
  visual.add(leftLeg);

  const rightLeg = leftLeg.clone(true);
  rightLeg.position.x = 0.25;
  visual.add(rightLeg);

  const leftArm = new THREE.Group();
  leftArm.position.set(-0.57, 1.82, 0);
  const leftGauntlet = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.9, 0.32), steel);
  leftGauntlet.position.y = -0.4;
  leftArm.add(leftGauntlet);
  const shield = new THREE.Mesh(new THREE.CylinderGeometry(0.43, 0.43, 0.12, 8), crimson);
  shield.rotation.x = Math.PI / 2;
  shield.position.set(-0.1, -0.44, 0.24);
  leftArm.add(shield);
  const shieldBoss = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 5), gold);
  shieldBoss.position.set(-0.1, -0.44, 0.34);
  leftArm.add(shieldBoss);
  visual.add(leftArm);

  const rightArm = new THREE.Group();
  rightArm.position.set(0.57, 1.82, 0);
  const rightGauntlet = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.9, 0.32), steel);
  rightGauntlet.position.y = -0.4;
  rightArm.add(rightGauntlet);
  const swordGrip = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.35, 0.11), leather);
  swordGrip.position.set(0, -0.86, 0.05);
  rightArm.add(swordGrip);
  const swordGuard = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.08, 0.1), gold);
  swordGuard.position.set(0, -1.02, 0.05);
  rightArm.add(swordGuard);
  const swordBlade = new THREE.Mesh(new THREE.BoxGeometry(0.13, 1.08, 0.055), steel);
  swordBlade.position.set(0, -1.57, 0.05);
  rightArm.add(swordBlade);
  visual.add(rightArm);

  root.position.set(0, 0, 1.5);
  root.rotation.y = Math.PI;
  setShadows(root);
  return { root, visual, leftArm, rightArm, leftLeg, rightLeg };
}

function createTreeTemplate(index) {
  const tree = new THREE.Group();
  const trunkMaterial = new THREE.MeshStandardMaterial({ color: index % 2 ? 0x765239 : 0x684832, roughness: 1 });
  const leafMaterial = new THREE.MeshStandardMaterial({ color: [0x416c43, 0x4d7747, 0x365f3d][index % 3], roughness: 1 });
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.38, 3.1, 6), trunkMaterial);
  trunk.position.y = 1.55;
  tree.add(trunk);
  for (let layer = 0; layer < 3; layer += 1) {
    const crown = new THREE.Mesh(new THREE.ConeGeometry(1.55 - layer * 0.22, 2.35, 7), leafMaterial);
    crown.position.y = 3 + layer * 1.02;
    tree.add(crown);
  }
  setShadows(tree);
  return tree;
}

function populateForest(scene) {
  const random = seededRandom(21);
  const templates = [0, 1, 2].map(createTreeTemplate);

  for (let index = 0; index < 76; index += 1) {
    const tree = templates[index % templates.length].clone(true);
    const angle = random() * Math.PI * 2;
    const radius = 10 + random() * 34;
    tree.position.set(Math.cos(angle) * radius, 0, Math.sin(angle) * radius);
    if (Math.abs(tree.position.x) < 4.2) tree.position.x += tree.position.x < 0 ? -5 : 5;
    tree.rotation.y = random() * Math.PI * 2;
    tree.scale.setScalar(0.72 + random() * 0.58);
    scene.add(tree);
  }

  const bushMaterial = new THREE.MeshStandardMaterial({ color: 0x547c47, roughness: 1 });
  const rockMaterial = new THREE.MeshStandardMaterial({ color: 0x7d837a, roughness: 1 });
  for (let index = 0; index < 96; index += 1) {
    const isBush = random() > 0.38;
    const detail = new THREE.Mesh(new THREE.DodecahedronGeometry(isBush ? 0.58 : 0.46, 0), isBush ? bushMaterial : rockMaterial);
    const angle = random() * Math.PI * 2;
    const radius = 7 + random() * 36;
    detail.position.set(Math.cos(angle) * radius, isBush ? 0.4 : 0.24, Math.sin(angle) * radius);
    if (Math.abs(detail.position.x) < 3.6) detail.position.x += detail.position.x < 0 ? -4.5 : 4.5;
    detail.rotation.set(random(), random() * Math.PI * 2, random() * 0.4);
    detail.scale.setScalar(0.55 + random() * 0.85);
    detail.receiveShadow = true;
    scene.add(detail);
  }
}

const scene = new THREE.Scene();
scene.background = new THREE.Color(0xb9d8c2);
scene.fog = new THREE.FogExp2(0x9bb9a4, 0.022);

const camera = new THREE.PerspectiveCamera(52, 1, 0.1, 180);
camera.position.set(7, 5.5, 9);

const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
renderer.shadowMap.enabled = true;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
mount.appendChild(renderer.domElement);

scene.add(new THREE.HemisphereLight(0xe7f4ff, 0x465d3d, 2.2));
const sun = new THREE.DirectionalLight(0xfff2c8, 3.1);
sun.position.set(-14, 22, 10);
sun.castShadow = true;
sun.shadow.mapSize.set(1024, 1024);
sun.shadow.camera.left = -32;
sun.shadow.camera.right = 32;
sun.shadow.camera.top = 32;
sun.shadow.camera.bottom = -32;
scene.add(sun);

const ground = new THREE.Mesh(new THREE.CircleGeometry(48, 64), new THREE.MeshStandardMaterial({ color: 0x6f9458, roughness: 1 }));
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);

const path = new THREE.Mesh(new THREE.PlaneGeometry(6.2, 72), new THREE.MeshStandardMaterial({ color: 0xb6a27c, roughness: 1 }));
path.rotation.x = -Math.PI / 2;
path.rotation.z = -0.08;
path.position.y = 0.012;
path.receiveShadow = true;
scene.add(path);

const clearing = new THREE.Mesh(new THREE.CircleGeometry(8.5, 40), new THREE.MeshStandardMaterial({ color: 0x819e61, roughness: 1 }));
clearing.rotation.x = -Math.PI / 2;
clearing.position.y = 0.02;
clearing.receiveShadow = true;
scene.add(clearing);

populateForest(scene);
const knight = createKnight();
scene.add(knight.root);

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
const cameraLift = new THREE.Vector3(0, 4.6, 0);
const lookLift = new THREE.Vector3(0, 1.15, 0);
const stopped = new THREE.Vector3();
let previousTime = performance.now();
let gait = 0;
let currentState = "";

function showState(state) {
  if (state === currentState) return;
  currentState = state;
  motion.textContent = state === "run" ? "奔跑" : state === "walk" ? "行走" : "待命";
}

function tick(time) {
  requestAnimationFrame(tick);
  const delta = Math.min((time - previousTime) / 1000, 0.05);
  previousTime = time;
  move.set((keys.right ? 1 : 0) - (keys.left ? 1 : 0), 0, (keys.back ? 1 : 0) - (keys.forward ? 1 : 0));

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

    gait += delta * (running ? 11 : 7);
    const swing = Math.sin(gait) * (running ? 0.78 : 0.5);
    knight.leftLeg.rotation.x = swing;
    knight.rightLeg.rotation.x = -swing;
    knight.leftArm.rotation.x = -swing * 0.7;
    knight.rightArm.rotation.x = swing * 0.7;
    knight.visual.position.y = Math.abs(Math.sin(gait)) * (running ? 0.08 : 0.045);
  } else {
    velocity.lerp(stopped, 1 - Math.exp(-delta * 18));
    showState("idle");
    knight.leftLeg.rotation.x = THREE.MathUtils.lerp(knight.leftLeg.rotation.x, 0, delta * 10);
    knight.rightLeg.rotation.x = THREE.MathUtils.lerp(knight.rightLeg.rotation.x, 0, delta * 10);
    knight.leftArm.rotation.x = THREE.MathUtils.lerp(knight.leftArm.rotation.x, 0, delta * 10);
    knight.rightArm.rotation.x = THREE.MathUtils.lerp(knight.rightArm.rotation.x, 0, delta * 10);
    knight.visual.position.y = Math.sin(time * 0.0022) * 0.018;
  }

  knight.root.position.addScaledVector(velocity, delta);
  const distance = Math.hypot(knight.root.position.x, knight.root.position.z);
  if (distance > 41) {
    knight.root.position.x *= 41 / distance;
    knight.root.position.z *= 41 / distance;
  }

  facing.set(0, 0, 1).applyQuaternion(knight.root.quaternion);
  cameraGoal.copy(knight.root.position).addScaledVector(facing, -6.8).add(cameraLift);
  camera.position.lerp(cameraGoal, 1 - Math.exp(-delta * 4.7));
  lookGoal.copy(knight.root.position).add(lookLift);
  camera.lookAt(lookGoal);
  renderer.render(scene, camera);
}

requestAnimationFrame(tick);
requestAnimationFrame(() => loading.classList.add("ready"));
