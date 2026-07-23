import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

const mount = document.querySelector("#scene");
const loading = document.querySelector("#loading");
const loadingText = document.querySelector("#loading-text");
const loadingDetail = document.querySelector("#loading-detail");
const loadingProgress = document.querySelector("#loading-progress");
const motion = document.querySelector("#motion");
const worldToggle = document.querySelector("#world-toggle");
const worldIcon = document.querySelector("#world-icon");
const worldLabel = document.querySelector("#world-label");
const worldClock = document.querySelector("#world-clock");
const threatBanner = document.querySelector("#threat-banner");
const attackButton = document.querySelector("#attack-button");
const townUpgradeButton = document.querySelector("#town-upgrade");
const townLevelLabel = document.querySelector("#town-level");
const townActionLabel = document.querySelector("#town-action");
const buildPanel = document.querySelector("#build-panel");
const buildPlotTitle = document.querySelector("#build-plot-title");
const buildHint = document.querySelector("#build-hint");
const demolishBuildingButton = document.querySelector("#demolish-building");
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

const daySky = new THREE.Color(0xb9d8c2);
const nightSky = new THREE.Color(0x10182d);
const dayFog = new THREE.Color(0x9bb9a4);
const nightFog = new THREE.Color(0x17213a);
const scene = new THREE.Scene();
scene.background = daySky.clone();
scene.fog = new THREE.FogExp2(dayFog, 0.0085);

const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 360);
camera.position.set(0, 18, 17);

const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.08;
mount.appendChild(renderer.domElement);

const ambient = new THREE.HemisphereLight(0xeaf5ff, 0x3b5136, 2.3);
scene.add(ambient);
const sun = new THREE.DirectionalLight(0xffefc2, 3.2);
const sunOffset = new THREE.Vector3(-24, 35, 18);
const sunTarget = new THREE.Object3D();
sun.position.copy(sunOffset);
sun.castShadow = true;
sun.shadow.mapSize.set(1024, 1024);
sun.shadow.camera.left = -42;
sun.shadow.camera.right = 42;
sun.shadow.camera.top = 42;
sun.shadow.camera.bottom = -42;
sun.shadow.camera.near = 1;
sun.shadow.camera.far = 105;
sun.target = sunTarget;
scene.add(sun, sunTarget);
const moon = new THREE.DirectionalLight(0x8aa7ff, 0);
moon.position.set(18, 24, -12);
scene.add(moon);

const groundMaterial = new THREE.MeshStandardMaterial({ color: 0x6f9458, roughness: 1 });
const ground = new THREE.Mesh(
  new THREE.CircleGeometry(120, 96),
  groundMaterial
);
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);

const pathMaterial = new THREE.MeshStandardMaterial({ color: 0xb6a27c, roughness: 1 });
const path = new THREE.Mesh(
  new THREE.PlaneGeometry(7.2, 210),
  pathMaterial
);
path.rotation.x = -Math.PI / 2;
path.rotation.z = -0.08;
path.position.y = 0.012;
path.receiveShadow = true;
scene.add(path);

const clearingMaterial = new THREE.MeshStandardMaterial({ color: 0x819e61, roughness: 1 });
const clearing = new THREE.Mesh(
  new THREE.CircleGeometry(14.5, 48),
  clearingMaterial
);
clearing.rotation.x = -Math.PI / 2;
clearing.position.y = 0.02;
clearing.receiveShadow = true;
scene.add(clearing);

const townSquareMaterial = new THREE.MeshStandardMaterial({ color: 0xa99a78, roughness: 1 });
const townSquare = new THREE.Mesh(new THREE.CircleGeometry(16.2, 64), townSquareMaterial);
townSquare.rotation.x = -Math.PI / 2;
townSquare.position.y = 0.035;
townSquare.receiveShadow = true;
scene.add(townSquare);

const plazaStoneMaterials = [
  new THREE.MeshStandardMaterial({ color: 0x8f8775, roughness: 0.96 }),
  new THREE.MeshStandardMaterial({ color: 0xb4a98e, roughness: 0.96 }),
];

function addPlazaStoneRing(radius, count, width) {
  for (let index = 0; index < count; index += 1) {
    const angle = (index / count) * Math.PI * 2;
    const stone = new THREE.Mesh(
      new THREE.BoxGeometry(width, 0.08, 0.54),
      plazaStoneMaterials[index % plazaStoneMaterials.length]
    );
    stone.position.set(Math.cos(angle) * radius, 0.075, Math.sin(angle) * radius);
    stone.rotation.y = -angle;
    stone.receiveShadow = true;
    scene.add(stone);
  }
}

addPlazaStoneRing(13.85, 44, 1.48);
addPlazaStoneRing(15.45, 52, 1.34);

const buildPlotPositions = [
  new THREE.Vector3(-10, 0, -24),
  new THREE.Vector3(10, 0, -24),
  new THREE.Vector3(24, 0, -10),
  new THREE.Vector3(24, 0, 10),
  new THREE.Vector3(10, 0, 24),
  new THREE.Vector3(-10, 0, 24),
  new THREE.Vector3(-24, 0, 10),
  new THREE.Vector3(-24, 0, -10),
];
const isInsideBuildPlotClearing = (x, z) =>
  buildPlotPositions.some((position) => Math.hypot(x - position.x, z - position.z) < 7.2);
const isInsideCityStreet = (x, z) =>
  (Math.abs(Math.abs(x) - 19.4) < 3.25 && Math.abs(z) < 27) ||
  (Math.abs(Math.abs(z) - 19.4) < 3.25 && Math.abs(x) < 27);

const cityStreetMaterial = new THREE.MeshStandardMaterial({ color: 0x9c9077, roughness: 0.98 });
const cityCurbMaterial = new THREE.MeshStandardMaterial({ color: 0x6e6b62, roughness: 0.96 });
const cityStreetGroup = new THREE.Group();

for (const z of [-19.4, 19.4]) {
  const street = new THREE.Mesh(new THREE.BoxGeometry(52, 0.055, 5.35), cityStreetMaterial);
  street.position.set(0, 0.062, z);
  street.receiveShadow = true;
  cityStreetGroup.add(street);
  for (const edgeOffset of [-2.67, 2.67]) {
    const curb = new THREE.Mesh(new THREE.BoxGeometry(52, 0.1, 0.18), cityCurbMaterial);
    curb.position.set(0, 0.105, z + edgeOffset);
    curb.receiveShadow = true;
    cityStreetGroup.add(curb);
  }
}

for (const x of [-19.4, 19.4]) {
  const street = new THREE.Mesh(new THREE.BoxGeometry(5.35, 0.055, 52), cityStreetMaterial);
  street.position.set(x, 0.062, 0);
  street.receiveShadow = true;
  cityStreetGroup.add(street);
  for (const edgeOffset of [-2.67, 2.67]) {
    const curb = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.1, 52), cityCurbMaterial);
    curb.position.set(x + edgeOffset, 0.105, 0);
    curb.receiveShadow = true;
    cityStreetGroup.add(curb);
  }
}
scene.add(cityStreetGroup);

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
  const [character, generalAnimations, movementAnimations, combatAnimations, swordAsset, shieldAsset] = await Promise.all([
    loadGLTF("./models/characters/Knight.glb"),
    loadGLTF("./models/animations/Rig_Medium_General.glb"),
    loadGLTF("./models/animations/Rig_Medium_MovementBasic.glb"),
    loadGLTF("./models/animations/Rig_Medium_CombatMelee.glb"),
    loadGLTF("./models/player-gear/sword_1handed.gltf"),
    loadGLTF("./models/player-gear/shield_badge.gltf"),
  ]);

  const root = new THREE.Group();
  const visual = new THREE.Group();
  const model = character.scene;
  root.add(visual);
  visual.add(model);

  setShadows(model);
  const rightHand = model.getObjectByName("handslotr");
  const leftHand = model.getObjectByName("handslotl");
  if (!rightHand || !leftHand) throw new Error("Knight hand slots are missing");
  rightHand.add(swordAsset.scene);
  leftHand.add(shieldAsset.scene);
  setShadows(swordAsset.scene);
  setShadows(shieldAsset.scene);
  model.updateMatrixWorld(true);

  const initialBox = new THREE.Box3().setFromObject(model);
  const initialHeight = initialBox.max.y - initialBox.min.y;
  const scale = 2.7 / initialHeight;
  model.scale.setScalar(scale);
  model.updateMatrixWorld(true);
  const scaledBox = new THREE.Box3().setFromObject(model);
  model.position.y -= scaledBox.min.y;

  root.position.set(0, 0, 17.5);
  root.rotation.y = Math.PI;

  const clips = [...generalAnimations.animations, ...movementAnimations.animations, ...combatAnimations.animations];
  const clipByName = (name) => THREE.AnimationClip.findByName(clips, name);
  const mixer = new THREE.AnimationMixer(model);
  const actions = {
    idle: mixer.clipAction(clipByName("Idle_A")),
    walk: mixer.clipAction(clipByName("Walking_A")),
    run: mixer.clipAction(clipByName("Running_A")),
  };
  const attackActions = [
    mixer.clipAction(clipByName("Melee_1H_Attack_Slice_Horizontal")),
    mixer.clipAction(clipByName("Melee_1H_Attack_Slice_Diagonal")),
    mixer.clipAction(clipByName("Melee_1H_Attack_Chop")),
  ];
  for (const action of attackActions) {
    action.setLoop(THREE.LoopOnce, 1);
    action.clampWhenFinished = true;
  }
  actions.idle.play();
  let activeAction = actions.idle;
  let attackTimer = 0;
  let comboWindow = 0;
  let comboIndex = -1;
  let queuedAttack = false;

  const setAnimation = (state) => {
    if (attackTimer > 0) return;
    const nextAction = actions[state];
    if (!nextAction || nextAction === activeAction) return;
    nextAction.reset().setEffectiveTimeScale(1).setEffectiveWeight(1).fadeIn(0.18).play();
    activeAction.fadeOut(0.18);
    activeAction = nextAction;
  };

  const beginAttack = (continueCombo = false) => {
    if (!continueCombo && comboWindow <= 0) comboIndex = -1;
    comboIndex = (comboIndex + 1) % attackActions.length;
    const nextAction = attackActions[comboIndex];
    queuedAttack = false;
    comboWindow = 0;
    attackTimer = nextAction.getClip().duration / 1.12;
    nextAction.reset().setEffectiveTimeScale(1.12).setEffectiveWeight(1).fadeIn(0.07).play();
    if (activeAction !== nextAction) activeAction.fadeOut(0.07);
    activeAction = nextAction;
  };

  const requestAttack = () => {
    if (attackTimer > 0) queuedAttack = true;
    else beginAttack();
  };

  const update = (delta, fallbackState) => {
    mixer.update(delta);
    if (attackTimer > 0) {
      attackTimer -= delta;
      if (attackTimer <= 0) {
        attackTimer = 0;
        if (queuedAttack) beginAttack(true);
        else {
          comboWindow = 0.65;
          setAnimation(fallbackState);
        }
      }
    } else if (comboWindow > 0) {
      comboWindow -= delta;
    }
  };

  return { root, visual, mixer, setAnimation, requestAttack, isAttacking: () => attackTimer > 0, update };
}

function fitModelToHeight(model, targetHeight) {
  model.updateMatrixWorld(true);
  const initialBox = new THREE.Box3().setFromObject(model);
  const height = Math.max(initialBox.max.y - initialBox.min.y, 0.01);
  model.scale.setScalar(targetHeight / height);
  model.updateMatrixWorld(true);
  const scaledBox = new THREE.Box3().setFromObject(model);
  model.position.y -= scaledBox.min.y;
}

const townStoneMaterial = new THREE.MeshStandardMaterial({ color: 0x77766f, roughness: 0.92 });
const townStoneDarkMaterial = new THREE.MeshStandardMaterial({ color: 0x555a5a, roughness: 0.96 });
const townBlueMaterial = new THREE.MeshStandardMaterial({ color: 0x255a91, roughness: 0.76 });
const townGoldMaterial = new THREE.MeshStandardMaterial({ color: 0xd5a83d, roughness: 0.7 });
const townClockMaterial = new THREE.MeshStandardMaterial({
  color: 0xe4c365,
  emissive: 0x4f3308,
  emissiveIntensity: 0.16,
  roughness: 0.58,
  side: THREE.DoubleSide,
});
const townFlameMaterial = new THREE.MeshBasicMaterial({ color: 0xffbc57 });
const townWindowFrameMaterial = new THREE.MeshStandardMaterial({ color: 0x9b7c32, roughness: 0.72 });
const townPlantMaterial = new THREE.MeshStandardMaterial({ color: 0x4f7e3b, roughness: 0.9 });
const townSoilMaterial = new THREE.MeshStandardMaterial({ color: 0x49382b, roughness: 1 });
const townSparkMaterial = new THREE.MeshBasicMaterial({
  color: 0xbfeaff,
  transparent: true,
  opacity: 0.82,
  depthWrite: false,
  blending: THREE.AdditiveBlending,
});

function addTownBlock(group, size, position, material = townStoneMaterial) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(size.x, size.y, size.z), material);
  mesh.position.copy(position);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  group.add(mesh);
  return mesh;
}

function addTownDisc(group, radius, height, y, material) {
  const disc = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, height, 48), material);
  disc.position.y = y;
  disc.castShadow = true;
  disc.receiveShadow = true;
  group.add(disc);
  return disc;
}

function addTownFoundation(group, radius) {
  addTownDisc(group, radius, 0.46, 0.23, townStoneMaterial);
  addTownDisc(group, radius - 0.5, 0.34, 0.63, townStoneDarkMaterial);
  addTownDisc(group, radius - 0.92, 0.18, 0.89, townStoneMaterial);

  const rim = new THREE.Mesh(
    new THREE.TorusGeometry(radius - 0.52, 0.13, 8, 48),
    townGoldMaterial
  );
  rim.rotation.x = Math.PI / 2;
  rim.position.y = 0.82;
  rim.castShadow = true;
  group.add(rim);

  const masonryCount = Math.round(radius * 2.7);
  for (let index = 0; index < masonryCount; index += 1) {
    const angle = (index / masonryCount) * Math.PI * 2;
    const x = Math.cos(angle) * (radius - 1.22);
    const z = Math.sin(angle) * (radius - 1.22);
    if (z < -radius * 0.72 && Math.abs(x) < 3.5) continue;
    const inlay = addTownBlock(
      group,
      new THREE.Vector3(0.72, 0.055, 0.34),
      new THREE.Vector3(x, 1.015, z),
      townStoneDarkMaterial
    );
    inlay.rotation.y = -angle;
    inlay.castShadow = false;
  }

  for (let step = 0; step < 4; step += 1) {
    addTownBlock(
      group,
      new THREE.Vector3(6.2 - step * 0.32, 0.18, 1.35),
      new THREE.Vector3(0, 0.09 + step * 0.18, -radius - 0.78 + step * 0.34)
    );
  }
  return 0.98;
}

function addTownModel(group, template, targetHeight, x, z, rotation, baseY) {
  const model = template.clone(true);
  fitModelToHeight(model, targetHeight);
  model.position.x = x;
  model.position.y += baseY;
  model.position.z = z;
  model.rotation.y = rotation;
  setShadows(model);
  group.add(model);
  return model;
}

function addTownBanner(group, x, z, baseY = 0.84, height = 4.2) {
  const pole = new THREE.Mesh(
    new THREE.CylinderGeometry(0.07, 0.09, height, 8),
    townGoldMaterial
  );
  pole.position.set(x, baseY + height / 2, z);
  pole.castShadow = true;
  group.add(pole);

  const finial = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.38, 8), townGoldMaterial);
  finial.position.set(x, baseY + height + 0.19, z);
  finial.castShadow = true;
  group.add(finial);

  const cloth = new THREE.Mesh(new THREE.BoxGeometry(0.86, 1.28, 0.07), townBlueMaterial);
  cloth.position.set(x + 0.47, baseY + height - 0.75, z);
  cloth.castShadow = true;
  cloth.userData.townBanner = true;
  cloth.userData.bannerPhase = x * 0.73 + z * 0.41;
  const emblem = new THREE.Mesh(new THREE.OctahedronGeometry(0.2, 0), townGoldMaterial);
  emblem.scale.y = 1.28;
  emblem.position.z = -0.075;
  emblem.castShadow = true;
  cloth.add(emblem);
  group.add(cloth);
}

function addTownEntranceDetails(group, radius, baseY, grand = false) {
  const railHeight = grand ? 1.05 : 0.82;
  for (const x of [-3.2, 3.2]) {
    addTownBlock(
      group,
      new THREE.Vector3(0.34, railHeight, 2.45),
      new THREE.Vector3(x, railHeight / 2, -radius - 0.12),
      townStoneDarkMaterial
    );
    addTownBlock(
      group,
      new THREE.Vector3(0.58, 1.15, 0.58),
      new THREE.Vector3(x, 0.58, -radius + 0.88),
      townStoneMaterial
    );

    const bowl = new THREE.Mesh(
      new THREE.CylinderGeometry(0.3, 0.18, 0.2, 10),
      townGoldMaterial
    );
    bowl.position.set(x, 1.24, -radius + 0.88);
    bowl.castShadow = true;
    group.add(bowl);

    const flame = new THREE.Mesh(new THREE.SphereGeometry(0.16, 10, 8), townFlameMaterial);
    flame.scale.y = 1.45;
    flame.position.set(x, 1.48, -radius + 0.88);
    flame.userData.townFlame = true;
    flame.userData.flamePhase = x > 0 ? 1.7 : 0.2;
    group.add(flame);

    const torchLight = new THREE.PointLight(0xff9f43, 0.18, grand ? 7.5 : 6.2, 2);
    torchLight.position.set(x, 1.65, -radius + 0.62);
    torchLight.userData.townTorch = true;
    group.add(torchLight);

    for (let puff = 0; puff < 3; puff += 1) {
      const smokeMaterial = new THREE.MeshBasicMaterial({
        color: 0x83908d,
        transparent: true,
        opacity: 0.12,
        depthWrite: false,
      });
      const smoke = new THREE.Mesh(new THREE.SphereGeometry(0.13, 8, 6), smokeMaterial);
      smoke.position.set(x, 1.76 + puff * 0.2, -radius + 0.88);
      smoke.userData.townSmoke = true;
      smoke.userData.smokeOrigin = smoke.position.clone();
      smoke.userData.smokePhase = puff / 3 + (x > 0 ? 0.37 : 0);
      group.add(smoke);
    }
  }

  const threshold = addTownBlock(
    group,
    new THREE.Vector3(5.7, 0.13, 0.62),
    new THREE.Vector3(0, baseY + 0.08, -radius + 1.15),
    townGoldMaterial
  );
  threshold.castShadow = false;
}

function addTownPlanter(group, x, z, baseY, scale = 1) {
  const planter = new THREE.Group();
  planter.position.set(x, baseY, z);
  planter.scale.setScalar(scale);

  const pot = new THREE.Mesh(
    new THREE.CylinderGeometry(0.44, 0.54, 0.42, 10),
    townStoneMaterial
  );
  pot.position.y = 0.21;
  pot.castShadow = true;
  pot.receiveShadow = true;
  planter.add(pot);

  const soil = new THREE.Mesh(new THREE.CylinderGeometry(0.37, 0.37, 0.06, 10), townSoilMaterial);
  soil.position.y = 0.45;
  planter.add(soil);

  for (const [leafX, leafY, leafZ, leafScale] of [
    [-0.18, 0.64, 0.02, 0.24],
    [0.17, 0.7, 0.06, 0.27],
    [0, 0.78, -0.12, 0.29],
  ]) {
    const leaf = new THREE.Mesh(new THREE.IcosahedronGeometry(leafScale, 0), townPlantMaterial);
    leaf.position.set(leafX, leafY, leafZ);
    leaf.castShadow = true;
    planter.add(leaf);
  }
  group.add(planter);
}

function addTownSeal(group, radius, level) {
  const seal = new THREE.Group();
  seal.position.set(0, 0.1, -radius - 1.85);

  const base = new THREE.Mesh(
    new THREE.CylinderGeometry(1.05 + level * 0.08, 1.05 + level * 0.08, 0.07, 32),
    townStoneDarkMaterial
  );
  base.receiveShadow = true;
  seal.add(base);

  const field = new THREE.Mesh(
    new THREE.CylinderGeometry(0.82 + level * 0.07, 0.82 + level * 0.07, 0.085, 32),
    townBlueMaterial
  );
  field.position.y = 0.055;
  field.receiveShadow = true;
  seal.add(field);

  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(0.89 + level * 0.07, 0.075, 8, 32),
    townGoldMaterial
  );
  ring.rotation.x = Math.PI / 2;
  ring.position.y = 0.11;
  seal.add(ring);

  const longRay = addTownBlock(
    seal,
    new THREE.Vector3(0.18, 0.08, 1.14 + level * 0.08),
    new THREE.Vector3(0, 0.12, 0),
    townGoldMaterial
  );
  longRay.castShadow = false;
  const crossRay = longRay.clone();
  crossRay.rotation.y = Math.PI / 2;
  seal.add(crossRay);
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.1, 16), townClockMaterial);
  hub.position.y = 0.15;
  seal.add(hub);
  group.add(seal);
}

function createArchGeometry(width, height) {
  const shape = new THREE.Shape();
  const shoulder = height - width * 0.5;
  shape.moveTo(-width / 2, 0);
  shape.lineTo(-width / 2, shoulder);
  shape.quadraticCurveTo(-width / 2, height, 0, height);
  shape.quadraticCurveTo(width / 2, height, width / 2, shoulder);
  shape.lineTo(width / 2, 0);
  shape.closePath();
  const geometry = new THREE.ShapeGeometry(shape, 5);
  geometry.center();
  return geometry;
}

function addTownWindow(group, x, y, z, width = 0.42, height = 0.72) {
  const windowGroup = new THREE.Group();
  windowGroup.position.set(x, y, z);

  const frame = new THREE.Mesh(
    createArchGeometry(width + 0.18, height + 0.18),
    townWindowFrameMaterial
  );
  frame.position.z = 0.018;
  frame.castShadow = true;
  windowGroup.add(frame);

  const windowMaterial = new THREE.MeshStandardMaterial({
    color: 0x315477,
    emissive: 0xffa64d,
    emissiveIntensity: 0.08,
    roughness: 0.5,
    side: THREE.DoubleSide,
  });
  const pane = new THREE.Mesh(createArchGeometry(width, height), windowMaterial);
  pane.position.z = -0.01;
  pane.userData.townWindow = true;
  windowGroup.add(pane);
  group.add(windowGroup);
}

function addTownBattlements(group, radius, count, baseY, frontGap = 4.3) {
  for (let index = 0; index < count; index += 1) {
    const angle = (index / count) * Math.PI * 2;
    const x = Math.cos(angle) * (radius - 0.52);
    const z = Math.sin(angle) * (radius - 0.52);
    if (z < -radius * 0.72 && Math.abs(x) < frontGap) continue;
    const block = addTownBlock(
      group,
      new THREE.Vector3(1.1, 0.72, 0.62),
      new THREE.Vector3(x, baseY + 0.36, z),
      townStoneMaterial
    );
    block.rotation.y = -angle;
  }
}

function addTownClock(group, radius, y, z) {
  const clock = new THREE.Group();
  const face = new THREE.Mesh(new THREE.CircleGeometry(radius, 28), townClockMaterial);
  face.rotation.y = Math.PI;
  face.castShadow = true;
  clock.add(face);

  const rim = new THREE.Mesh(
    new THREE.TorusGeometry(radius, Math.max(radius * 0.1, 0.07), 8, 28),
    townGoldMaterial
  );
  rim.position.z = -0.035;
  rim.castShadow = true;
  clock.add(rim);

  for (let tick = 0; tick < 12; tick += 1) {
    const angle = (tick / 12) * Math.PI * 2;
    const marker = addTownBlock(
      clock,
      new THREE.Vector3(radius * 0.09, radius * (tick % 3 === 0 ? 0.22 : 0.14), 0.06),
      new THREE.Vector3(
        Math.sin(angle) * radius * 0.76,
        Math.cos(angle) * radius * 0.76,
        -0.075
      ),
      townStoneDarkMaterial
    );
    marker.rotation.z = -angle;
    marker.castShadow = false;
  }

  const hourPivot = new THREE.Group();
  hourPivot.userData.townClockHand = "hour";
  const hourHand = addTownBlock(
    hourPivot,
    new THREE.Vector3(radius * 0.12, radius * 0.72, 0.08),
    new THREE.Vector3(0, radius * 0.26, -0.1),
    townStoneDarkMaterial
  );
  clock.add(hourPivot);
  const minutePivot = new THREE.Group();
  minutePivot.userData.townClockHand = "minute";
  const minuteHand = addTownBlock(
    minutePivot,
    new THREE.Vector3(radius * 0.1, radius * 0.94, 0.07),
    new THREE.Vector3(0, radius * 0.37, -0.11),
    townStoneDarkMaterial
  );
  clock.add(minutePivot);
  const handHub = new THREE.Mesh(new THREE.SphereGeometry(radius * 0.11, 10, 8), townStoneDarkMaterial);
  handHub.position.z = -0.13;
  clock.add(handHub);

  const bell = new THREE.Mesh(
    new THREE.ConeGeometry(radius * 0.19, radius * 0.34, 12, 1, true),
    townGoldMaterial
  );
  bell.position.set(0, -radius * 1.27, -0.05);
  bell.rotation.z = Math.PI;
  clock.add(bell);
  const clapper = new THREE.Mesh(new THREE.SphereGeometry(radius * 0.075, 8, 6), townStoneDarkMaterial);
  clapper.position.set(0, -radius * 1.44, -0.05);
  clock.add(clapper);
  clock.position.set(0, y, z);
  group.add(clock);
}

async function createTownCenter() {
  const loadedAssets = await Promise.all([
    loadGLTF("./models/town/building_barracks_blue.gltf"),
    loadGLTF("./models/town/building_castle_blue.gltf"),
    loadGLTF("./models/town/building_tavern_blue.gltf"),
    loadGLTF("./models/town/building_church_blue.gltf"),
    loadGLTF("./models/town/building_tower_A_blue.gltf"),
    loadGLTF("./models/town/building_tower_B_blue.gltf"),
    loadGLTF("./models/town/weaponrack.gltf"),
    loadGLTF("./models/town/barrel.gltf"),
    loadGLTF("./models/town/crate_A_small.gltf"),
    loadGLTF("./models/town/wheelbarrow.gltf"),
    loadGLTF("./models/town/building_well_blue.gltf"),
    loadGLTF("./models/town/target.gltf"),
    loadGLTF("./models/town/bucket_arrows.gltf"),
    loadGLTF("./models/town/sack.gltf"),
    loadGLTF("./models/town/resource_lumber.gltf"),
    loadGLTF("./models/town/resource_stone.gltf"),
    loadGLTF("./models/town/pallet.gltf"),
  ]);
  const [
    barracks, castle, tavern, church, towerA, towerB,
    weaponRack, barrel, crate, wheelbarrow, well, target,
    arrowBucket, sack, lumber, stonePile, pallet,
  ] = loadedAssets.map((asset) => asset.scene);
  const root = new THREE.Group();
  const collisionRadii = [8.5, 10.6, 12.9];
  const cameraScales = [1, 1.15, 1.38];
  const levelNames = ["Ⅰ · 人族城镇大厅", "Ⅱ · 人族要塞", "Ⅲ · 人族主城堡"];
  const stages = [];

  const townHall = new THREE.Group();
  const hallBaseY = addTownFoundation(townHall, 8.1);
  addTownModel(townHall, barracks, 7.8, 0, 0.7, 0, hallBaseY);
  addTownModel(townHall, tavern, 4.9, -4.35, 1.55, 0, hallBaseY);
  addTownModel(townHall, tavern, 4.9, 4.35, 1.55, 0, hallBaseY);
  addTownModel(townHall, towerB, 6.45, -5.85, -2.3, 0, hallBaseY);
  addTownModel(townHall, towerB, 6.45, 5.85, -2.3, 0, hallBaseY);
  addTownClock(townHall, 0.64, 5.25, -2.65);
  addTownWindow(townHall, -5.85, 3.45, -3.72, 0.38, 0.68);
  addTownWindow(townHall, 5.85, 3.45, -3.72, 0.38, 0.68);
  addTownWindow(townHall, -1.25, 6.45, -2.67, 0.32, 0.58);
  addTownWindow(townHall, 1.25, 6.45, -2.67, 0.32, 0.58);
  addTownModel(townHall, barrel, 0.92, -4.45, -4.55, 0.2, hallBaseY);
  addTownModel(townHall, crate, 0.82, 4.35, -4.65, -0.18, hallBaseY);
  addTownBanner(townHall, -2.65, -6.05, hallBaseY, 4.15);
  addTownBanner(townHall, 2.65, -6.05, hallBaseY, 4.15);
  addTownEntranceDetails(townHall, 8.1, hallBaseY);
  addTownSeal(townHall, 8.1, 0);
  stages.push(townHall);

  const keep = new THREE.Group();
  const keepBaseY = addTownFoundation(keep, 10.15);
  addTownBattlements(keep, 10.15, 22, keepBaseY, 4.1);
  addTownModel(keep, castle, 10.35, 0, 0.7, 0, keepBaseY);
  addTownModel(keep, tavern, 5.9, -5.4, 1.5, 0, keepBaseY);
  addTownModel(keep, tavern, 5.9, 5.4, 1.5, 0, keepBaseY);
  addTownModel(keep, towerB, 8.35, -7.55, -4.1, 0, keepBaseY);
  addTownModel(keep, towerB, 8.35, 7.55, -4.1, 0, keepBaseY);
  addTownModel(keep, towerA, 7.8, -7.7, 4.4, 0, keepBaseY);
  addTownModel(keep, towerA, 7.8, 7.7, 4.4, 0, keepBaseY);
  addTownClock(keep, 0.83, 6.5, -3.25);
  addTownWindow(keep, -7.55, 4.25, -5.55, 0.42, 0.76);
  addTownWindow(keep, 7.55, 4.25, -5.55, 0.42, 0.76);
  addTownWindow(keep, -1.52, 5.45, -3.27, 0.36, 0.66);
  addTownWindow(keep, 1.52, 5.45, -3.27, 0.36, 0.66);
  addTownModel(keep, weaponRack, 1.65, -5.25, -6.55, 0.08, keepBaseY);
  addTownModel(keep, wheelbarrow, 1.25, 5.35, -6.45, -0.42, keepBaseY);
  addTownModel(keep, barrel, 1.05, 4.2, -6.75, 0, keepBaseY);
  addTownModel(keep, target, 1.72, -3.85, -2.25, 0.18, keepBaseY);
  addTownModel(keep, arrowBucket, 0.82, -2.75, -2.85, -0.08, keepBaseY);
  addTownModel(keep, well, 1.58, 3.55, -2.15, 0, keepBaseY);
  addTownModel(keep, sack, 0.66, 4.72, -2.65, 0.25, keepBaseY);
  addTownModel(keep, sack, 0.58, 5.08, -2.42, -0.3, keepBaseY);
  addTownModel(keep, lumber, 0.88, -5.65, -4.15, 0.12, keepBaseY);
  addTownPlanter(keep, -6.25, 0.25, keepBaseY, 0.9);
  addTownPlanter(keep, 6.25, 0.25, keepBaseY, 0.9);
  addTownBanner(keep, -3.15, -8.15, keepBaseY, 5.4);
  addTownBanner(keep, 3.15, -8.15, keepBaseY, 5.4);
  addTownEntranceDetails(keep, 10.15, keepBaseY, true);
  addTownSeal(keep, 10.15, 1);
  stages.push(keep);

  const castleHall = new THREE.Group();
  const castleBaseY = addTownFoundation(castleHall, 12.35);
  addTownBattlements(castleHall, 12.35, 28, castleBaseY, 4.4);
  addTownModel(castleHall, church, 11.4, 0, 4.35, 0, castleBaseY);
  addTownModel(castleHall, castle, 12.65, 0, 0.15, 0, castleBaseY);
  addTownModel(castleHall, tavern, 7.1, -6.35, 1.45, 0, castleBaseY);
  addTownModel(castleHall, tavern, 7.1, 6.35, 1.45, 0, castleBaseY);
  addTownModel(castleHall, towerA, 10.75, -8.5, -5.15, 0, castleBaseY);
  addTownModel(castleHall, towerA, 10.75, 8.5, -5.15, 0, castleBaseY);
  addTownModel(castleHall, towerB, 9.85, -10.1, 1.45, 0, castleBaseY);
  addTownModel(castleHall, towerB, 9.85, 10.1, 1.45, 0, castleBaseY);
  addTownModel(castleHall, towerA, 9.35, -7.2, 7.25, 0, castleBaseY);
  addTownModel(castleHall, towerA, 9.35, 7.2, 7.25, 0, castleBaseY);
  addTownClock(castleHall, 1.05, 7.85, -3.85);
  addTownWindow(castleHall, -8.5, 4.95, -6.7, 0.46, 0.82);
  addTownWindow(castleHall, 8.5, 4.95, -6.7, 0.46, 0.82);
  addTownWindow(castleHall, -1.72, 6.65, -3.87, 0.4, 0.72);
  addTownWindow(castleHall, 1.72, 6.65, -3.87, 0.4, 0.72);
  addTownModel(castleHall, weaponRack, 1.85, -5.75, -8.55, 0.06, castleBaseY);
  addTownModel(castleHall, weaponRack, 1.85, 5.75, -8.55, -0.06, castleBaseY);
  addTownModel(castleHall, crate, 1.05, -4.45, -8.85, 0.25, castleBaseY);
  addTownModel(castleHall, barrel, 1.12, 4.35, -8.9, 0, castleBaseY);
  addTownModel(castleHall, target, 2.02, -4.55, -3.1, 0.2, castleBaseY);
  addTownModel(castleHall, arrowBucket, 0.94, -3.35, -3.9, -0.12, castleBaseY);
  addTownModel(castleHall, well, 1.76, 4.45, -3.05, 0, castleBaseY);
  addTownModel(castleHall, sack, 0.72, 5.65, -3.85, 0.2, castleBaseY);
  addTownModel(castleHall, sack, 0.64, 6.08, -3.55, -0.25, castleBaseY);
  addTownModel(castleHall, stonePile, 1.05, -5.9, -5.55, 0.15, castleBaseY);
  addTownModel(castleHall, lumber, 1.02, 5.78, -5.65, -0.15, castleBaseY);
  addTownModel(castleHall, pallet, 0.3, 6.7, -5.25, 0.35, castleBaseY);
  addTownPlanter(castleHall, -7.15, -0.55, castleBaseY, 1.05);
  addTownPlanter(castleHall, 7.15, -0.55, castleBaseY, 1.05);
  addTownBanner(castleHall, -3.55, -10.2, castleBaseY, 6.6);
  addTownBanner(castleHall, 3.55, -10.2, castleBaseY, 6.6);
  addTownEntranceDetails(castleHall, 12.35, castleBaseY, true);
  addTownSeal(castleHall, 12.35, 2);
  stages.push(castleHall);

  stages.forEach((stage, index) => {
    stage.visible = index === 0;
    root.add(stage);
  });

  root.position.set(0, 0, 0);
  root.rotation.y = Math.PI;

  const warmLight = new THREE.PointLight(0xffb45a, 0, 20, 2);
  warmLight.position.set(0, 3.25, -6.2);
  root.add(warmLight);
  const lantern = new THREE.Mesh(
    new THREE.SphereGeometry(0.12, 10, 8),
    new THREE.MeshBasicMaterial({ color: 0xffc66d })
  );
  lantern.position.copy(warmLight.position);
  root.add(lantern);

  const upgradeRingMaterial = new THREE.MeshBasicMaterial({
    color: 0x7fd8ff,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const upgradeRing = new THREE.Mesh(
    new THREE.TorusGeometry(4.2, 0.1, 8, 64),
    upgradeRingMaterial
  );
  upgradeRing.rotation.x = Math.PI / 2;
  upgradeRing.position.y = 1.16;
  upgradeRing.visible = false;
  root.add(upgradeRing);

  const upgradeSparks = new THREE.Group();
  for (let index = 0; index < 18; index += 1) {
    const spark = new THREE.Mesh(new THREE.SphereGeometry(0.075, 7, 6), townSparkMaterial);
    spark.userData.sparkAngle = (index / 18) * Math.PI * 2;
    spark.userData.sparkPhase = index / 18;
    upgradeSparks.add(spark);
  }
  upgradeSparks.visible = false;
  root.add(upgradeSparks);

  const banners = [];
  const flames = [];
  const smokePuffs = [];
  const torchLights = [];
  const clockHands = [];
  const townWindows = [];
  root.traverse((child) => {
    if (child.userData.townBanner) banners.push(child);
    if (child.userData.townFlame) flames.push(child);
    if (child.userData.townSmoke) smokePuffs.push(child);
    if (child.userData.townTorch) torchLights.push(child);
    if (child.userData.townClockHand) clockHands.push(child);
    if (child.userData.townWindow) townWindows.push(child);
  });

  let level = 0;
  let upgradeProgress = 1;
  const updateUI = () => {
    townLevelLabel.textContent = levelNames[level];
    townActionLabel.textContent = level === stages.length - 1 ? "已达到最高等级" : "U · 升级";
    townUpgradeButton.disabled = level === stages.length - 1;
  };
  const upgrade = () => {
    if (level >= stages.length - 1) return false;
    stages[level].visible = false;
    level += 1;
    stages[level].visible = true;
    stages[level].scale.setScalar(0.84);
    upgradeProgress = 0;
    upgradeRing.visible = true;
    upgradeSparks.visible = true;
    upgradeRing.scale.setScalar(0.45);
    updateUI();
    showThreat(`${levelNames[level]} · 建造完成`);
    return true;
  };
  const update = (delta, time) => {
    for (const banner of banners) {
      const wave = Math.sin(time * 0.0024 + banner.userData.bannerPhase);
      banner.rotation.y = wave * 0.12;
      banner.scale.y = 1 + wave * 0.025;
    }
    for (const flame of flames) {
      const flicker = Math.sin(time * 0.012 + flame.userData.flamePhase) * 0.08;
      flame.scale.set(1 - flicker * 0.25, 1.45 + flicker, 1 - flicker * 0.25);
    }
    for (const smoke of smokePuffs) {
      const rise = (time * 0.00024 + smoke.userData.smokePhase) % 1;
      const origin = smoke.userData.smokeOrigin;
      smoke.position.set(
        origin.x + Math.sin(time * 0.0015 + smoke.userData.smokePhase * 8) * 0.11,
        origin.y + rise * 1.15,
        origin.z
      );
      smoke.scale.setScalar(0.55 + rise * 1.25);
      smoke.material.opacity = (1 - rise) * 0.14;
    }
    for (const hand of clockHands) {
      hand.rotation.z = hand.userData.townClockHand === "hour"
        ? -worldPhase * Math.PI * 4
        : -worldPhase * Math.PI * 48;
    }

    if (upgradeProgress >= 1) return;
    upgradeProgress = Math.min(upgradeProgress + delta * 0.82, 1);
    const ease = 1 - Math.pow(1 - upgradeProgress, 3);
    const overshoot = Math.sin(upgradeProgress * Math.PI) * 0.045;
    stages[level].scale.setScalar(0.84 + ease * 0.16 + overshoot);
    upgradeRing.scale.setScalar(0.45 + ease * 2.25);
    upgradeRing.rotation.z = time * 0.00055;
    upgradeRingMaterial.opacity = Math.sin(upgradeProgress * Math.PI) * 0.72;
    for (const spark of upgradeSparks.children) {
      const rise = (upgradeProgress + spark.userData.sparkPhase) % 1;
      const angle = spark.userData.sparkAngle + time * 0.00045;
      const radius = 2.4 + ease * 7.2;
      spark.position.set(Math.cos(angle) * radius, 0.9 + rise * 4.2, Math.sin(angle) * radius);
      spark.scale.setScalar(1 - rise * 0.62);
    }
    if (upgradeProgress >= 1) {
      stages[level].scale.setScalar(1);
      upgradeRing.visible = false;
      upgradeSparks.visible = false;
    }
  };
  const setNightFactor = (nightFactor) => {
    for (const light of torchLights) light.intensity = 0.3 + nightFactor * 18;
    townClockMaterial.emissiveIntensity = 0.16 + nightFactor * 2.8;
    for (const window of townWindows) {
      window.material.emissiveIntensity = 0.08 + nightFactor * 3.8;
    }
  };
  updateUI();
  townUpgradeButton.disabled = false;
  return {
    root,
    warmLight,
    upgrade,
    update,
    setNightFactor,
    get collisionRadius() { return collisionRadii[level]; },
    get cameraScale() { return cameraScales[level]; },
    get levelName() { return levelNames[level]; },
  };
}

async function createBuildSystem() {
  const optionSpecs = [
    { id: "barracks", label: "兵营", url: "./models/town/building_barracks_blue.gltf", height: 6.3, radius: 3.45 },
    { id: "blacksmith", label: "铁匠铺", url: "./models/town/building_blacksmith_blue.gltf", height: 5.25, radius: 3.1 },
    { id: "archery", label: "箭术场", url: "./models/town/building_archeryrange_blue.gltf", height: 5.8, radius: 3.3 },
    { id: "market", label: "市场", url: "./models/town/building_market_blue.gltf", height: 5.35, radius: 3.35 },
    { id: "church", label: "教堂", url: "./models/town/building_church_blue.gltf", height: 7.2, radius: 3.25 },
    { id: "home", label: "住宅", url: "./models/town/building_home_A_blue.gltf", height: 5.05, radius: 2.85 },
    { id: "lumbermill", label: "伐木场", url: "./models/town/building_lumbermill_blue.gltf", height: 5.45, radius: 3.35 },
    { id: "tower", label: "防御塔", url: "./models/town/building_tower_B_blue.gltf", height: 7.35, radius: 2.7 },
  ];
  const loaded = await Promise.all(optionSpecs.map((spec) => loadGLTF(spec.url)));
  const definitions = new Map(
    optionSpecs.map((spec, index) => [spec.id, { ...spec, template: loaded[index].scene }])
  );

  const root = new THREE.Group();
  const plotFloorMaterial = new THREE.MeshStandardMaterial({
    color: 0x718b83,
    transparent: true,
    opacity: 0.42,
    roughness: 0.95,
  });
  const plotRingMaterial = new THREE.MeshStandardMaterial({
    color: 0x6ec5e2,
    emissive: 0x153e54,
    emissiveIntensity: 0.42,
    roughness: 0.65,
  });
  const plotStoneMaterial = new THREE.MeshStandardMaterial({ color: 0x8a887e, roughness: 0.95 });
  const beaconMaterial = new THREE.MeshBasicMaterial({
    color: 0x91e4ff,
    transparent: true,
    opacity: 0.82,
    depthWrite: false,
  });
  const plots = [];
  const plotSurfaces = [];
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();

  for (let index = 0; index < buildPlotPositions.length; index += 1) {
    const plotRoot = new THREE.Group();
    plotRoot.position.copy(buildPlotPositions[index]);

    const foundation = new THREE.Mesh(new THREE.BoxGeometry(8.4, 0.12, 8.4), plotFloorMaterial.clone());
    foundation.position.y = 0.06;
    foundation.receiveShadow = true;
    foundation.userData.buildPlotIndex = index;
    plotRoot.add(foundation);
    plotSurfaces.push(foundation);

    const ring = new THREE.Group();
    const ringMaterial = plotRingMaterial.clone();
    for (const border of [
      { width: 8.35, depth: 0.18, x: 0, z: -4.08 },
      { width: 8.35, depth: 0.18, x: 0, z: 4.08 },
      { width: 0.18, depth: 8.35, x: -4.08, z: 0 },
      { width: 0.18, depth: 8.35, x: 4.08, z: 0 },
    ]) {
      const edge = new THREE.Mesh(new THREE.BoxGeometry(border.width, 0.16, border.depth), ringMaterial);
      edge.position.set(border.x, 0.16, border.z);
      edge.castShadow = true;
      ring.add(edge);
    }
    plotRoot.add(ring);

    for (const edge of [-1, 1]) {
      for (const offset of [-2.75, -0.92, 0.92, 2.75]) {
        const horizontalStone = new THREE.Mesh(
          new THREE.BoxGeometry(1.48, 0.18, 0.48),
          plotStoneMaterial
        );
        horizontalStone.position.set(offset, 0.14, edge * 3.72);
        horizontalStone.castShadow = true;
        horizontalStone.receiveShadow = true;
        plotRoot.add(horizontalStone);

        const verticalStone = new THREE.Mesh(
          new THREE.BoxGeometry(0.48, 0.18, 1.48),
          plotStoneMaterial
        );
        verticalStone.position.set(edge * 3.72, 0.14, offset);
        verticalStone.castShadow = true;
        verticalStone.receiveShadow = true;
        plotRoot.add(verticalStone);
      }
    }

    const marker = new THREE.Group();
    const crossA = new THREE.Mesh(new THREE.BoxGeometry(2.25, 0.08, 0.28), plotRingMaterial);
    crossA.position.y = 0.18;
    marker.add(crossA);
    const crossB = crossA.clone();
    crossB.rotation.y = Math.PI / 2;
    marker.add(crossB);
    const beacon = new THREE.Mesh(new THREE.OctahedronGeometry(0.36, 0), beaconMaterial);
    beacon.position.y = 1.05;
    marker.add(beacon);
    plotRoot.add(marker);

    const buildingGroup = new THREE.Group();
    plotRoot.add(buildingGroup);
    root.add(plotRoot);
    plots.push({
      index,
      root: plotRoot,
      foundation,
      ring,
      ringMaterial,
      marker,
      beacon,
      buildingGroup,
      builtType: null,
      collisionRadius: 0,
      buildProgress: 1,
    });
  }

  let activePlot = null;
  let selectionPinned = false;
  const storageKey = "mistwood-build-plots-v1";

  const persist = () => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(plots.map((plot) => plot.builtType)));
    } catch {
      // Persistence is optional; building remains available for the current session.
    }
  };

  const refreshPanel = () => {
    const visible = Boolean(activePlot);
    buildPanel.classList.toggle("show", visible);
    buildPanel.setAttribute("aria-hidden", String(!visible));
    if (!activePlot) return;
    const definition = activePlot.builtType ? definitions.get(activePlot.builtType) : null;
    buildPanel.classList.toggle("built", Boolean(definition));
    buildPlotTitle.textContent = definition
      ? `地块 ${activePlot.index + 1} · ${definition.label}`
      : `地块 ${activePlot.index + 1} · 空闲`;
    buildHint.textContent = definition
      ? "可拆除当前建筑并重新选择"
      : "点击建筑，或按数字键 1-8 建造";
  };

  const buildOnPlot = (plot, typeId, animate = true, shouldPersist = true) => {
    const definition = definitions.get(typeId);
    if (!plot || !definition || plot.builtType) return false;
    const model = definition.template.clone(true);
    fitModelToHeight(model, definition.height);
    model.rotation.y = Math.atan2(plot.root.position.x, plot.root.position.z);
    model.position.y += 0.14;
    setShadows(model);
    plot.buildingGroup.add(model);
    plot.buildingGroup.scale.setScalar(animate ? 0.72 : 1);
    plot.buildProgress = animate ? 0 : 1;
    plot.builtType = typeId;
    plot.collisionRadius = definition.radius;
    plot.marker.visible = false;
    plot.foundation.material.color.setHex(0x858077);
    plot.ringMaterial.color.setHex(0xd3b65c);
    if (animate) showThreat(`${definition.label} · 建造完成`);
    if (shouldPersist) persist();
    if (plot === activePlot) refreshPanel();
    return true;
  };

  const build = (typeId) => {
    if (!activePlot || activePlot.builtType) return false;
    if (!buildOnPlot(activePlot, typeId)) return false;
    resolveBuildPlotCollisions(knight?.root.position, 0.72);
    return true;
  };

  const demolish = () => {
    if (!activePlot?.builtType) return false;
    const removedName = definitions.get(activePlot.builtType)?.label ?? "建筑";
    activePlot.buildingGroup.clear();
    activePlot.builtType = null;
    activePlot.collisionRadius = 0;
    activePlot.marker.visible = true;
    activePlot.foundation.material.color.setHex(0x718b83);
    activePlot.ringMaterial.color.setHex(0x6ec5e2);
    persist();
    refreshPanel();
    showThreat(`${removedName} · 已拆除`);
    return true;
  };

  const update = (playerPosition, delta, time) => {
    let nearest = null;
    let nearestDistance = 6.4;
    for (const plot of plots) {
      const distance = Math.hypot(playerPosition.x - plot.root.position.x, playerPosition.z - plot.root.position.z);
      if (distance < nearestDistance) {
        nearest = plot;
        nearestDistance = distance;
      }
      if (!plot.builtType) {
        plot.beacon.position.y = 1.05 + Math.sin(time * 0.0022 + plot.index) * 0.18;
        plot.beacon.rotation.y = time * 0.001 + plot.index;
        plot.ringMaterial.emissiveIntensity = 0.35 + Math.sin(time * 0.002 + plot.index) * 0.14;
      }
      if (plot.buildProgress < 1) {
        plot.buildProgress = Math.min(plot.buildProgress + delta * 0.9, 1);
        const ease = 1 - Math.pow(1 - plot.buildProgress, 3);
        plot.buildingGroup.scale.setScalar(0.72 + ease * 0.28 + Math.sin(plot.buildProgress * Math.PI) * 0.035);
      }
    }
    if (nearest && nearest !== activePlot) {
      selectionPinned = false;
      activePlot = nearest;
      refreshPanel();
    } else if (!nearest && !selectionPinned && activePlot) {
      activePlot = null;
      refreshPanel();
    }
  };

  const selectByPointer = (event, activeCamera, canvas) => {
    const bounds = canvas.getBoundingClientRect();
    pointer.set(
      ((event.clientX - bounds.left) / bounds.width) * 2 - 1,
      -((event.clientY - bounds.top) / bounds.height) * 2 + 1
    );
    raycaster.setFromCamera(pointer, activeCamera);
    const hit = raycaster.intersectObjects(plotSurfaces, false)[0];
    if (!hit) return false;
    const plot = plots[hit.object.userData.buildPlotIndex];
    if (!plot) return false;
    activePlot = plot;
    selectionPinned = true;
    refreshPanel();
    return true;
  };

  const resolveCollision = (position, padding = 0) => {
    if (!position) return false;
    let collided = false;
    for (const plot of plots) {
      if (!plot.builtType) continue;
      const minimumDistance = plot.collisionRadius + padding;
      const x = position.x - plot.root.position.x;
      const z = position.z - plot.root.position.z;
      const distance = Math.hypot(x, z);
      if (distance >= minimumDistance) continue;
      if (distance < 0.001) {
        position.z = plot.root.position.z + minimumDistance;
      } else {
        const scale = minimumDistance / distance;
        position.x = plot.root.position.x + x * scale;
        position.z = plot.root.position.z + z * scale;
      }
      collided = true;
    }
    return collided;
  };

  try {
    const saved = JSON.parse(localStorage.getItem(storageKey) || "[]");
    if (Array.isArray(saved)) {
      saved.slice(0, plots.length).forEach((typeId, index) => {
        if (typeof typeId === "string") buildOnPlot(plots[index], typeId, false, false);
      });
    }
  } catch {
    // Ignore invalid or unavailable local persistence.
  }

  return {
    root,
    plots,
    optionIds: optionSpecs.map((spec) => spec.id),
    build,
    demolish,
    update,
    resolveCollision,
    selectByPointer,
  };
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

function placeModel(template, x, z, scale, rotation, castShadow = false) {
  const object = template.clone(true);
  object.position.set(x, 0, z);
  object.rotation.y = rotation;
  object.scale.setScalar(scale);
  setShadows(object, castShadow);
  scene.add(object);
  return object;
}

function populateForest(templates) {
  const random = seededRandom(21);

  for (let index = 0; index < 190; index += 1) {
    const angle = random() * Math.PI * 2;
    const radius = 30 + random() * 78;
    let x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;
    if (Math.abs(x) < 5.2) x += x < 0 ? -7.2 : 7.2;
    if (z > 6 && Math.abs(x) < 12) x += x < 0 ? -12 : 12;
    if (isInsideBuildPlotClearing(x, z) || isInsideCityStreet(x, z)) continue;
    placeModel(
      templates.trees[index % templates.trees.length],
      x,
      z,
      0.92 + random() * 0.46,
      random() * Math.PI * 2,
      radius < 43
    );
  }

  for (let index = 0; index < 240; index += 1) {
    const isBush = random() > 0.36;
    const angle = random() * Math.PI * 2;
    const radius = 22 + random() * 86;
    let x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;
    if (Math.abs(x) < 4.8) x += x < 0 ? -6.2 : 6.2;
    if (isInsideBuildPlotClearing(x, z) || isInsideCityStreet(x, z)) continue;
    placeModel(
      isBush ? templates.bush : templates.rock,
      x,
      z,
      isBush ? 0.7 + random() * 0.85 : 0.55 + random() * 0.9,
      random() * Math.PI * 2,
      false
    );
  }
}

let knight = null;
let townCenter = null;
let buildSystem = null;
let worldPhase = 0.5;
let nightActive = false;
let bannerTimer = 0;
let lastClockMinute = -1;
const cycleDuration = 90;
const dayGroundColor = new THREE.Color(0x6f9458);
const nightGroundColor = new THREE.Color(0x273a3e);
const dayPathColor = new THREE.Color(0xb6a27c);
const nightPathColor = new THREE.Color(0x514d57);
const dayClearingColor = new THREE.Color(0x819e61);
const nightClearingColor = new THREE.Color(0x304549);
const dayTownSquareColor = new THREE.Color(0xa99a78);
const nightTownSquareColor = new THREE.Color(0x4d4850);
const dayCityStreetColor = new THREE.Color(0x9c9077);
const nightCityStreetColor = new THREE.Color(0x45454b);
const dayCityCurbColor = new THREE.Color(0x6e6b62);
const nightCityCurbColor = new THREE.Color(0x34383c);

function showThreat(text) {
  threatBanner.textContent = text;
  threatBanner.classList.add("show");
  bannerTimer = 3.2;
}

function setNightMode(nextNight, announce = true, force = false) {
  if (!force && nextNight === nightActive) return;
  nightActive = nextNight;
  worldToggle.classList.toggle("night", nightActive);
  worldIcon.textContent = nightActive ? "☾" : "☀";
  worldLabel.textContent = nightActive ? "夜晚 · 城镇戒备" : "白昼 · 视野清晰";

  if (announce) {
    showThreat(nightActive ? "夜幕降临 · 城镇火炬已点亮" : "晨光降临 · 森林恢复宁静");
  }
}

function toggleDayNight() {
  worldPhase = nightActive ? 0.5 : 0.92;
  updateDayNight(0);
}

function updateDayNight(delta) {
  worldPhase = (worldPhase + delta / cycleDuration) % 1;
  const solarHeight = Math.sin(worldPhase * Math.PI * 2 - Math.PI / 2);
  const daylight = THREE.MathUtils.smoothstep(solarHeight, -0.22, 0.32);
  const nightFactor = 1 - daylight;

  scene.background.lerpColors(daySky, nightSky, nightFactor);
  scene.fog.color.lerpColors(dayFog, nightFog, nightFactor);
  scene.fog.density = THREE.MathUtils.lerp(0.0085, 0.016, nightFactor);
  ambient.intensity = THREE.MathUtils.lerp(2.3, 0.62, nightFactor);
  sun.intensity = THREE.MathUtils.lerp(3.2, 0.14, nightFactor);
  moon.intensity = THREE.MathUtils.lerp(0, 1.25, nightFactor);
  renderer.toneMappingExposure = THREE.MathUtils.lerp(1.08, 0.78, nightFactor);
  groundMaterial.color.lerpColors(dayGroundColor, nightGroundColor, nightFactor);
  pathMaterial.color.lerpColors(dayPathColor, nightPathColor, nightFactor);
  clearingMaterial.color.lerpColors(dayClearingColor, nightClearingColor, nightFactor);
  townSquareMaterial.color.lerpColors(dayTownSquareColor, nightTownSquareColor, nightFactor);
  cityStreetMaterial.color.lerpColors(dayCityStreetColor, nightCityStreetColor, nightFactor);
  cityCurbMaterial.color.lerpColors(dayCityCurbColor, nightCityCurbColor, nightFactor);
  if (townCenter) {
    townCenter.warmLight.intensity = nightFactor * 25;
    townCenter.setNightFactor(nightFactor);
  }
  setNightMode(nightFactor > 0.68);

  const totalMinutes = Math.floor(worldPhase * 24 * 60);
  if (totalMinutes !== lastClockMinute) {
    lastClockMinute = totalMinutes;
    const hours = Math.floor(totalMinutes / 60).toString().padStart(2, "0");
    const minutes = (totalMinutes % 60).toString().padStart(2, "0");
    worldClock.textContent = `${hours}:${minutes}`;
  }

  if (bannerTimer > 0) {
    bannerTimer -= delta;
    if (bannerTimer <= 0) threatBanner.classList.remove("show");
  }
}

async function loadWorld() {
  loadingText.textContent = "正在唤醒真正的森林";
  const [loadedKnight, forestTemplates, loadedTownCenter, loadedBuildSystem] = await Promise.all([
    createKnightRig(),
    loadForestTemplates(),
    createTownCenter(),
    createBuildSystem(),
  ]);
  knight = loadedKnight;
  townCenter = loadedTownCenter;
  buildSystem = loadedBuildSystem;
  scene.add(knight.root);
  scene.add(townCenter.root);
  scene.add(buildSystem.root);
  populateForest(forestTemplates);
  setNightMode(nightActive, false, true);
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

window.addEventListener("keydown", (event) => {
  if (event.repeat) return;
  if (/^Digit[1-8]$/.test(event.code)) {
    event.preventDefault();
    const optionIndex = Number(event.code.slice(-1)) - 1;
    const optionId = buildSystem?.optionIds[optionIndex];
    if (optionId) buildSystem.build(optionId);
    return;
  }
  if (event.code === "KeyJ") {
    event.preventDefault();
    knight?.requestAttack();
    return;
  }
  if (event.code === "KeyU") {
    event.preventDefault();
    upgradeTownCenter();
    return;
  }
  if (event.code !== "KeyN") return;
  event.preventDefault();
  toggleDayNight();
});
worldToggle.addEventListener("click", toggleDayNight);
townUpgradeButton.addEventListener("click", upgradeTownCenter);
document.querySelectorAll("[data-building]").forEach((button) => {
  button.addEventListener("click", () => buildSystem?.build(button.dataset.building));
});
demolishBuildingButton.addEventListener("click", () => buildSystem?.demolish());

renderer.domElement.addEventListener("pointerdown", (event) => {
  if (event.button !== 0) return;
  if (buildSystem?.selectByPointer(event, camera, renderer.domElement)) return;
  if (event.pointerType === "mouse") knight?.requestAttack();
});
attackButton.addEventListener("pointerdown", (event) => {
  event.preventDefault();
  knight?.requestAttack();
});

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
const cameraOffset = new THREE.Vector3(0, 18, 17);
const cameraForward = new THREE.Vector3(-cameraOffset.x, 0, -cameraOffset.z).normalize();
const cameraRight = new THREE.Vector3().crossVectors(cameraForward, new THREE.Vector3(0, 1, 0)).normalize();
const lookLift = new THREE.Vector3(0, 0.55, 0);
const lookAhead = cameraForward.clone().multiplyScalar(4.6);
const stopped = new THREE.Vector3();
let previousTime = performance.now();
let currentState = "idle";

function resolveTownCenterCollision(position, padding = 0) {
  if (!townCenter) return false;
  const minimumDistance = townCenter.collisionRadius + padding;
  const x = position.x - townCenter.root.position.x;
  const z = position.z - townCenter.root.position.z;
  const distance = Math.hypot(x, z);
  if (distance >= minimumDistance) return false;
  if (distance < 0.001) {
    position.z = townCenter.root.position.z + minimumDistance;
  } else {
    const scale = minimumDistance / distance;
    position.x = townCenter.root.position.x + x * scale;
    position.z = townCenter.root.position.z + z * scale;
  }
  return true;
}

function resolveBuildPlotCollisions(position, padding = 0) {
  return buildSystem?.resolveCollision(position, padding) ?? false;
}

function upgradeTownCenter() {
  if (!townCenter || !townCenter.upgrade()) return;
  resolveTownCenterCollision(knight.root.position, 0.72);
  velocity.multiplyScalar(0.2);
}

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
  updateDayNight(delta);
  townCenter?.update(delta, time);

  if (knight) {
    const forwardInput = (keys.forward ? 1 : 0) - (keys.back ? 1 : 0);
    const rightInput = (keys.right ? 1 : 0) - (keys.left ? 1 : 0);
    move.copy(cameraForward).multiplyScalar(forwardInput).addScaledVector(cameraRight, rightInput);

    const moving = move.lengthSq() > 0;
    const running = moving && keys.run;
    if (moving) {
      move.normalize();
      const speed = knight.isAttacking() ? 0.8 : running ? 6.2 : 3.35;
      velocity.lerp(move.multiplyScalar(speed), 1 - Math.exp(-delta * 14));
      desiredEuler.set(0, Math.atan2(velocity.x, velocity.z), 0);
      desiredQuaternion.setFromEuler(desiredEuler);
      knight.root.quaternion.slerp(desiredQuaternion, 1 - Math.exp(-delta * 12));
      showState(running ? "run" : "walk");
    } else {
      velocity.lerp(stopped, 1 - Math.exp(-delta * 18));
      showState("idle");
    }

    knight.update(delta, currentState);
    motion.textContent = knight.isAttacking() ? "攻击" : currentState === "run" ? "奔跑" : currentState === "walk" ? "行走" : "待命";
    knight.root.position.addScaledVector(velocity, delta);
    const hitTownCenter = resolveTownCenterCollision(knight.root.position, 0.72);
    const hitBuiltPlot = resolveBuildPlotCollisions(knight.root.position, 0.72);
    if (hitTownCenter || hitBuiltPlot) velocity.multiplyScalar(0.2);
    buildSystem?.update(knight.root.position, delta, time);
    const distance = Math.hypot(knight.root.position.x, knight.root.position.z);
    if (distance > 108) {
      knight.root.position.x *= 108 / distance;
      knight.root.position.z *= 108 / distance;
    }

    sunTarget.position.copy(knight.root.position);
    sun.position.copy(knight.root.position).add(sunOffset);

    cameraGoal.copy(knight.root.position).addScaledVector(cameraOffset, townCenter?.cameraScale ?? 1);
    camera.position.lerp(cameraGoal, 1 - Math.exp(-delta * 4.7));
    lookGoal
      .copy(knight.root.position)
      .add(lookLift)
      .addScaledVector(lookAhead, townCenter?.cameraScale ?? 1);
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
