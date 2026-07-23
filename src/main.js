import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { clone as cloneSkeleton } from "three/addons/utils/SkeletonUtils.js";

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
scene.fog = new THREE.FogExp2(dayFog, 0.0175);

const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 180);
camera.position.set(8.8, 13.5, 11.8);

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
sun.position.set(-14, 22, 10);
sun.castShadow = true;
sun.shadow.mapSize.set(1024, 1024);
sun.shadow.camera.left = -32;
sun.shadow.camera.right = 32;
sun.shadow.camera.top = 32;
sun.shadow.camera.bottom = -32;
sun.shadow.camera.near = 1;
sun.shadow.camera.far = 62;
scene.add(sun);
const moon = new THREE.DirectionalLight(0x8aa7ff, 0);
moon.position.set(18, 24, -12);
scene.add(moon);

const groundMaterial = new THREE.MeshStandardMaterial({ color: 0x6f9458, roughness: 1 });
const ground = new THREE.Mesh(
  new THREE.CircleGeometry(48, 64),
  groundMaterial
);
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);

const pathMaterial = new THREE.MeshStandardMaterial({ color: 0xb6a27c, roughness: 1 });
const path = new THREE.Mesh(
  new THREE.PlaneGeometry(6.2, 72),
  pathMaterial
);
path.rotation.x = -Math.PI / 2;
path.rotation.z = -0.08;
path.position.y = 0.012;
path.receiveShadow = true;
scene.add(path);

const clearingMaterial = new THREE.MeshStandardMaterial({ color: 0x819e61, roughness: 1 });
const clearing = new THREE.Mesh(
  new THREE.CircleGeometry(8.5, 40),
  clearingMaterial
);
clearing.rotation.x = -Math.PI / 2;
clearing.position.y = 0.02;
clearing.receiveShadow = true;
scene.add(clearing);

const townSquareMaterial = new THREE.MeshStandardMaterial({ color: 0xa99a78, roughness: 1 });
const townSquare = new THREE.Mesh(new THREE.CircleGeometry(10.2, 56), townSquareMaterial);
townSquare.rotation.x = -Math.PI / 2;
townSquare.position.y = 0.035;
townSquare.receiveShadow = true;
scene.add(townSquare);

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

  root.position.set(0, 0, 12.4);
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

async function createTownCenter() {
  const assets = await Promise.all([
    loadGLTF("./models/town/building_home_B_blue.gltf"),
    loadGLTF("./models/town/building_barracks_blue.gltf"),
    loadGLTF("./models/town/building_castle_blue.gltf"),
  ]);
  const root = new THREE.Group();
  const targetHeights = [5.1, 6.8, 7.4];
  const collisionRadii = [3.75, 4.9, 5.75];
  const levelNames = ["Ⅰ · 简易大厅", "Ⅱ · 加固市政厅", "Ⅲ · 城堡大厅"];
  const models = assets.map((asset, index) => {
    const model = asset.scene;
    fitModelToHeight(model, targetHeights[index]);
    setShadows(model);
    model.visible = index === 0;
    root.add(model);
    return model;
  });

  root.position.set(0, 0, 0);
  root.rotation.y = Math.PI;

  const warmLight = new THREE.PointLight(0xffb45a, 0, 12, 2);
  warmLight.position.set(0, 2.5, -2.8);
  root.add(warmLight);
  const lantern = new THREE.Mesh(
    new THREE.SphereGeometry(0.12, 10, 8),
    new THREE.MeshBasicMaterial({ color: 0xffc66d })
  );
  lantern.position.copy(warmLight.position);
  root.add(lantern);

  let level = 0;
  const updateUI = () => {
    townLevelLabel.textContent = levelNames[level];
    townActionLabel.textContent = level === models.length - 1 ? "已达到最高等级" : "U · 升级";
    townUpgradeButton.disabled = level === models.length - 1;
  };
  const upgrade = () => {
    if (level >= models.length - 1) return false;
    models[level].visible = false;
    level += 1;
    models[level].visible = true;
    updateUI();
    return true;
  };
  updateUI();
  townUpgradeButton.disabled = false;
  return {
    root,
    warmLight,
    upgrade,
    get collisionRadius() { return collisionRadii[level]; },
    get levelName() { return levelNames[level]; },
  };
}

function styleMonsterModel(model, night) {
  model.traverse((child) => {
    if (!child.isMesh) return;
    child.castShadow = true;
    child.receiveShadow = true;
    const sourceMaterials = Array.isArray(child.material) ? child.material : [child.material];
    const styledMaterials = sourceMaterials.map((source) => {
      const material = source.clone();
      if (material.name === "Glow") {
        material.emissive = new THREE.Color(night ? 0xff183f : 0xffd34f);
        material.emissiveIntensity = night ? 4 : 0.75;
      }
      return material;
    });
    child.material = Array.isArray(child.material) ? styledMaterials : styledMaterials[0];
  });
}

function createAnimationRig(model, clips) {
  const clipByName = (name) => THREE.AnimationClip.findByName(clips, name);
  const mixer = new THREE.AnimationMixer(model);
  const actions = {
    idle: mixer.clipAction(clipByName("Idle_A")),
    walk: mixer.clipAction(clipByName("Walking_A")),
    run: mixer.clipAction(clipByName("Running_A")),
    attack: mixer.clipAction(clipByName("Melee_1H_Attack_Chop")),
  };
  actions.attack.setLoop(THREE.LoopOnce, 1);
  actions.attack.clampWhenFinished = true;
  actions.idle.play();
  return { mixer, actions, activeAction: actions.idle, activeState: "idle" };
}

function playMonsterAnimation(rig, state, restart = false) {
  const nextAction = rig.actions[state];
  if (!nextAction || (!restart && rig.activeState === state)) return;
  nextAction.reset().setEffectiveTimeScale(1).setEffectiveWeight(1).fadeIn(0.12).play();
  if (rig.activeAction !== nextAction) rig.activeAction.fadeOut(0.12);
  rig.activeAction = nextAction;
  rig.activeState = state;
}

async function loadMonsterAssets() {
  const [dayCharacter, nightCharacter, general, movement, combat, axe, shield] = await Promise.all([
    loadGLTF("./models/monsters/Skeleton_Minion.glb"),
    loadGLTF("./models/monsters/Skeleton_Warrior.glb"),
    loadGLTF("./models/animations/Rig_Medium_General.glb"),
    loadGLTF("./models/animations/Rig_Medium_MovementBasic.glb"),
    loadGLTF("./models/animations/Rig_Medium_CombatMelee.glb"),
    loadGLTF("./models/monster-gear/Skeleton_Axe.gltf"),
    loadGLTF("./models/monster-gear/Skeleton_Shield_Large_A.gltf"),
  ]);
  return {
    dayTemplate: dayCharacter.scene,
    nightTemplate: nightCharacter.scene,
    clips: [...general.animations, ...movement.animations, ...combat.animations],
    axeTemplate: axe.scene,
    shieldTemplate: shield.scene,
  };
}

function createMonster(assets, position, index) {
  const root = new THREE.Group();
  const dayGroup = new THREE.Group();
  const nightGroup = new THREE.Group();
  const dayModel = cloneSkeleton(assets.dayTemplate);
  const nightModel = cloneSkeleton(assets.nightTemplate);

  const axe = assets.axeTemplate.clone(true);
  const shield = assets.shieldTemplate.clone(true);
  nightModel.getObjectByName("handslot.r")?.add(axe);
  nightModel.getObjectByName("handslot.l")?.add(shield);
  styleMonsterModel(dayModel, false);
  styleMonsterModel(nightModel, true);
  setShadows(axe);
  setShadows(shield);
  fitModelToHeight(dayModel, 2.2);
  fitModelToHeight(nightModel, 2.75);

  dayGroup.add(dayModel);
  nightGroup.add(nightModel);
  root.add(dayGroup, nightGroup);
  root.position.copy(position);
  root.rotation.y = index * 1.37;

  const aura = new THREE.Mesh(
    new THREE.TorusGeometry(1.05, 0.075, 8, 32),
    new THREE.MeshBasicMaterial({
      color: 0xff234e,
      transparent: true,
      opacity: 0.72,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    })
  );
  aura.rotation.x = Math.PI / 2;
  aura.position.y = 0.08;
  nightGroup.add(aura);
  const eyeLight = new THREE.PointLight(0xff1748, 2.1, 5.5, 2);
  eyeLight.position.set(0, 1.7, 0.25);
  nightGroup.add(eyeLight);

  scene.add(root);
  return {
    root,
    dayGroup,
    nightGroup,
    dayRig: createAnimationRig(dayModel, assets.clips),
    nightRig: createAnimationRig(nightModel, assets.clips),
    home: position.clone(),
    wanderTarget: position.clone(),
    wanderTimer: index * 0.6,
    attackCooldown: index * 0.13,
    direction: new THREE.Vector3(),
    desiredQuaternion: new THREE.Quaternion(),
    desiredEuler: new THREE.Euler(),
    aura,
    index,
    night: null,
  };
}

function spawnMonsters(assets) {
  const positions = [
    new THREE.Vector3(-11, 0, -8),
    new THREE.Vector3(13, 0, -7),
    new THREE.Vector3(-15, 0, 8),
    new THREE.Vector3(12, 0, 12),
    new THREE.Vector3(1, 0, -17),
  ];
  return positions.map((position, index) => createMonster(assets, position, index));
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

  for (let index = 0; index < 72; index += 1) {
    const angle = random() * Math.PI * 2;
    const radius = 22 + random() * 22;
    let x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;
    if (Math.abs(x) < 4.2) x += x < 0 ? -5.2 : 5.2;
    if (z > 6 && Math.abs(x) < 11) x += x < 0 ? -11 : 11;
    placeModel(
      templates.trees[index % templates.trees.length],
      x,
      z,
      0.92 + random() * 0.46,
      random() * Math.PI * 2,
      radius < 25
    );
  }

  for (let index = 0; index < 86; index += 1) {
    const isBush = random() > 0.36;
    const angle = random() * Math.PI * 2;
    const radius = 16 + random() * 27;
    let x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;
    if (Math.abs(x) < 3.6) x += x < 0 ? -4.6 : 4.6;
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
let monsters = [];
let townCenter = null;
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
  worldLabel.textContent = nightActive ? "夜晚 · 高攻击性" : "白昼 · 低攻击性";

  for (const monster of monsters) {
    monster.dayGroup.visible = !nightActive;
    monster.nightGroup.visible = nightActive;
    monster.night = nightActive;
    playMonsterAnimation(nightActive ? monster.nightRig : monster.dayRig, "idle", true);
  }

  if (announce) {
    showThreat(nightActive ? "夜幕降临 · 骷髅已狂暴" : "晨光降临 · 骷髅恢复警戒");
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
  scene.fog.density = THREE.MathUtils.lerp(0.0175, 0.027, nightFactor);
  ambient.intensity = THREE.MathUtils.lerp(2.3, 0.62, nightFactor);
  sun.intensity = THREE.MathUtils.lerp(3.2, 0.14, nightFactor);
  moon.intensity = THREE.MathUtils.lerp(0, 1.25, nightFactor);
  renderer.toneMappingExposure = THREE.MathUtils.lerp(1.08, 0.78, nightFactor);
  groundMaterial.color.lerpColors(dayGroundColor, nightGroundColor, nightFactor);
  pathMaterial.color.lerpColors(dayPathColor, nightPathColor, nightFactor);
  clearingMaterial.color.lerpColors(dayClearingColor, nightClearingColor, nightFactor);
  townSquareMaterial.color.lerpColors(dayTownSquareColor, nightTownSquareColor, nightFactor);
  if (townCenter) townCenter.warmLight.intensity = nightFactor * 4.2;
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

function updateMonster(monster, delta, time) {
  if (!knight) return;
  const playerDistance = monster.root.position.distanceTo(knight.root.position);
  const detectionRadius = nightActive ? 27 : 3.3;
  const attackRadius = nightActive ? 1.85 : 1.45;
  const rig = nightActive ? monster.nightRig : monster.dayRig;
  let state = "idle";
  let speed = 0;

  if (playerDistance < detectionRadius) {
    monster.direction.subVectors(knight.root.position, monster.root.position);
    if (playerDistance <= attackRadius) {
      state = "attack";
    } else {
      state = nightActive ? "run" : "walk";
      speed = nightActive ? 2.65 : 1.05;
    }
  } else {
    monster.wanderTimer -= delta;
    if (monster.wanderTimer <= 0) {
      const angle = time * 0.00023 + monster.index * 1.81;
      const radius = 2.2 + (monster.index % 3) * 0.55;
      monster.wanderTarget.set(
        monster.home.x + Math.cos(angle) * radius,
        0,
        monster.home.z + Math.sin(angle) * radius
      );
      monster.wanderTimer = 2.6 + (monster.index % 3) * 0.8;
    }
    monster.direction.subVectors(monster.wanderTarget, monster.root.position);
    if (monster.direction.lengthSq() > 0.18) {
      state = "walk";
      speed = nightActive ? 0.9 : 0.52;
    }
  }

  monster.attackCooldown -= delta;
  if (state === "attack") {
    if (monster.attackCooldown <= 0) {
      playMonsterAnimation(rig, "attack", true);
      monster.attackCooldown = nightActive ? 0.92 : 1.8;
    }
  } else {
    playMonsterAnimation(rig, state);
    if (speed > 0 && monster.direction.lengthSq() > 0.001) {
      monster.direction.y = 0;
      monster.direction.normalize();
      monster.root.position.addScaledVector(monster.direction, speed * delta);
      resolveTownCenterCollision(monster.root.position, 0.65);
    }
  }

  if (monster.direction.lengthSq() > 0.001) {
    monster.desiredEuler.set(0, Math.atan2(monster.direction.x, monster.direction.z), 0);
    monster.desiredQuaternion.setFromEuler(monster.desiredEuler);
    monster.root.quaternion.slerp(monster.desiredQuaternion, 1 - Math.exp(-delta * 10));
  }
  rig.mixer.update(delta);
  monster.aura.material.opacity = 0.56 + Math.sin(time * 0.007 + monster.index) * 0.18;
}

async function loadWorld() {
  loadingText.textContent = "正在唤醒真正的森林";
  const [loadedKnight, forestTemplates, monsterAssets, loadedTownCenter] = await Promise.all([
    createKnightRig(),
    loadForestTemplates(),
    loadMonsterAssets(),
    createTownCenter(),
  ]);
  knight = loadedKnight;
  townCenter = loadedTownCenter;
  scene.add(knight.root);
  scene.add(townCenter.root);
  populateForest(forestTemplates);
  monsters = spawnMonsters(monsterAssets);
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

renderer.domElement.addEventListener("pointerdown", (event) => {
  if (event.pointerType === "mouse" && event.button === 0) knight?.requestAttack();
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
const cameraOffset = new THREE.Vector3(8.8, 13.5, 11.8);
const cameraForward = new THREE.Vector3(-cameraOffset.x, 0, -cameraOffset.z).normalize();
const cameraRight = new THREE.Vector3().crossVectors(cameraForward, new THREE.Vector3(0, 1, 0)).normalize();
const lookLift = new THREE.Vector3(0, 0.55, 0);
const lookAhead = cameraForward.clone().multiplyScalar(2.1);
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
    if (resolveTownCenterCollision(knight.root.position, 0.72)) velocity.multiplyScalar(0.2);
    const distance = Math.hypot(knight.root.position.x, knight.root.position.z);
    if (distance > 41) {
      knight.root.position.x *= 41 / distance;
      knight.root.position.z *= 41 / distance;
    }

    cameraGoal.copy(knight.root.position).add(cameraOffset);
    camera.position.lerp(cameraGoal, 1 - Math.exp(-delta * 4.7));
    lookGoal.copy(knight.root.position).add(lookLift).add(lookAhead);
    camera.lookAt(lookGoal);
  }

  for (const monster of monsters) updateMonster(monster, delta, time);

  renderer.render(scene, camera);
}

requestAnimationFrame(tick);
loadWorld().catch((error) => {
  console.error(error);
  loadingText.textContent = "模型加载失败";
  loadingDetail.textContent = "请刷新页面重试";
  loadingProgress.classList.add("failed");
});
