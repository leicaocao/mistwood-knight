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
const buildPanel = document.querySelector("#build-panel");
const buildPlotTitle = document.querySelector("#build-plot-title");
const buildHint = document.querySelector("#build-hint");
const demolishBuildingButton = document.querySelector("#demolish-building");
const woodValue = document.querySelector("#wood-value");
const goldValue = document.querySelector("#gold-value");
const woodGain = document.querySelector("#wood-gain");
const goldGain = document.querySelector("#gold-gain");
const woodResourceChip = document.querySelector("#resource-wood");
const goldResourceChip = document.querySelector("#resource-gold");
const keys = { forward: false, back: false, left: false, right: false, run: false };

function createResourceSystem() {
  const storageKey = "mistwood-resources-v1";
  const values = { wood: 0, gold: 0 };
  const elements = {
    wood: { value: woodValue, gain: woodGain, chip: woodResourceChip },
    gold: { value: goldValue, gain: goldGain, chip: goldResourceChip },
  };
  const animationTimers = { wood: 0, gold: 0 };

  try {
    const saved = JSON.parse(localStorage.getItem(storageKey) || "{}");
    for (const type of Object.keys(values)) {
      if (Number.isFinite(saved[type])) values[type] = Math.max(0, Math.floor(saved[type]));
    }
  } catch {
    // Resources still work for the current session when storage is unavailable.
  }

  const render = (type) => {
    elements[type].value.textContent = values[type].toLocaleString("zh-CN");
  };

  const persist = () => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(values));
    } catch {
      // Persistence is optional.
    }
  };

  const add = (type, amount) => {
    if (!(type in values) || !Number.isFinite(amount) || amount <= 0) return 0;
    const gain = Math.max(1, Math.floor(amount));
    values[type] += gain;
    render(type);
    persist();

    const { chip, gain: gainElement } = elements[type];
    clearTimeout(animationTimers[type]);
    chip.classList.remove("gained");
    void chip.offsetWidth;
    gainElement.textContent = `+${gain}`;
    chip.classList.add("gained");
    animationTimers[type] = setTimeout(() => chip.classList.remove("gained"), 950);
    return values[type];
  };

  render("wood");
  render("gold");
  return {
    addWood: (amount) => add("wood", amount),
    addGold: (amount) => add("gold", amount),
    get: (type) => values[type] ?? 0,
  };
}

const resourceSystem = createResourceSystem();

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
  new THREE.Vector3(-10, 0, -26.6),
  new THREE.Vector3(10, 0, -26.6),
  new THREE.Vector3(26.6, 0, -10),
  new THREE.Vector3(26.6, 0, 10),
  new THREE.Vector3(10, 0, 26.6),
  new THREE.Vector3(-10, 0, 26.6),
  new THREE.Vector3(-26.6, 0, 10),
  new THREE.Vector3(-26.6, 0, -10),
  new THREE.Vector3(-26.6, 0, -26.6),
  new THREE.Vector3(26.6, 0, -26.6),
  new THREE.Vector3(26.6, 0, 26.6),
  new THREE.Vector3(-26.6, 0, 26.6),
];
const isInsideBuildPlotClearing = (x, z) =>
  buildPlotPositions.some((position) => Math.hypot(x - position.x, z - position.z) < 7.2);
const isInsideCityStreet = (x, z) =>
  (Math.abs(Math.abs(x) - 19.4) < 3.25 && Math.abs(z) < 27) ||
  (Math.abs(Math.abs(z) - 19.4) < 3.25 && Math.abs(x) < 27) ||
  (Math.abs(x) < 3.25 && Math.abs(z) > 21.5 && Math.abs(z) < 41) ||
  (Math.abs(z) < 3.25 && Math.abs(x) > 21.5 && Math.abs(x) < 41);
const cityWallHalfExtent = 37;
const cityWallThickness = 4.2;
const cityGateOpeningHalf = 3.55;
const isInsideWalledCity = (x, z) =>
  Math.abs(x) < cityWallHalfExtent - 0.7 && Math.abs(z) < cityWallHalfExtent - 0.7;
const isInsideCityWallStructure = (x, z) =>
  (Math.abs(Math.abs(x) - cityWallHalfExtent) < 4.4 && Math.abs(z) < cityWallHalfExtent + 4.4) ||
  (Math.abs(Math.abs(z) - cityWallHalfExtent) < 4.4 && Math.abs(x) < cityWallHalfExtent + 4.4);

const cityStreetMaterial = new THREE.MeshStandardMaterial({ color: 0x9c9077, roughness: 0.98 });
const cityCurbMaterial = new THREE.MeshStandardMaterial({ color: 0x6e6b62, roughness: 0.96 });
const cityPaverMaterial = new THREE.MeshStandardMaterial({ color: 0xb7ab92, roughness: 1 });
const cityLampIronMaterial = new THREE.MeshStandardMaterial({
  color: 0x292d2f,
  roughness: 0.68,
  metalness: 0.72,
});
const cityLampStoneMaterial = new THREE.MeshStandardMaterial({ color: 0x68655d, roughness: 0.96 });
const cityLampGlassMaterial = new THREE.MeshStandardMaterial({
  color: 0xffc66d,
  emissive: 0xff8a2a,
  emissiveIntensity: 0.18,
  transparent: true,
  opacity: 0.88,
  roughness: 0.28,
});
const cityStreetGroup = new THREE.Group();
const cityStreetLights = [];

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

for (const side of [-1, 1]) {
  const northSouthRoad = new THREE.Mesh(
    new THREE.BoxGeometry(5.35, 0.055, 18.6),
    cityStreetMaterial
  );
  northSouthRoad.position.set(0, 0.062, side * 31.25);
  northSouthRoad.receiveShadow = true;
  cityStreetGroup.add(northSouthRoad);

  const eastWestRoad = new THREE.Mesh(
    new THREE.BoxGeometry(18.6, 0.055, 5.35),
    cityStreetMaterial
  );
  eastWestRoad.position.set(side * 31.25, 0.062, 0);
  eastWestRoad.receiveShadow = true;
  cityStreetGroup.add(eastWestRoad);
}

const cityPaverTransforms = [];
for (const z of [-19.4, 19.4]) {
  for (let row = -1; row <= 1; row += 1) {
    const stagger = row === 0 ? 0.8 : 0;
    for (let x = -24.5 + stagger; x <= 24.5; x += 1.62) {
      cityPaverTransforms.push({ x, z: z + row * 1.62, rotation: 0 });
    }
  }
}
for (const x of [-19.4, 19.4]) {
  for (let row = -1; row <= 1; row += 1) {
    const stagger = row === 0 ? 0.8 : 0;
    for (let z = -24.5 + stagger; z <= 24.5; z += 1.62) {
      if (Math.abs(Math.abs(z) - 19.4) < 3.15) continue;
      cityPaverTransforms.push({ x: x + row * 1.62, z, rotation: Math.PI / 2 });
    }
  }
}
for (const side of [-1, 1]) {
  for (let row = -1; row <= 1; row += 1) {
    const stagger = row === 0 ? 0.8 : 0;
    for (let distance = 22.65 + stagger; distance <= 39.35; distance += 1.62) {
      cityPaverTransforms.push({ x: row * 1.62, z: side * distance, rotation: Math.PI / 2 });
      cityPaverTransforms.push({ x: side * distance, z: row * 1.62, rotation: 0 });
    }
  }
}

const cityPavers = new THREE.InstancedMesh(
  new THREE.BoxGeometry(1.48, 0.045, 1.42),
  cityPaverMaterial,
  cityPaverTransforms.length
);
const paverDummy = new THREE.Object3D();
const paverTint = new THREE.Color();
cityPaverTransforms.forEach((transform, index) => {
  const offset = Math.sin((index + 1) * 91.17);
  paverDummy.position.set(transform.x + offset * 0.035, 0.112 + offset * 0.003, transform.z);
  paverDummy.rotation.set(0, transform.rotation + offset * 0.018, 0);
  paverDummy.updateMatrix();
  cityPavers.setMatrixAt(index, paverDummy.matrix);
  const tint = 0.91 + ((index * 17) % 7) * 0.012;
  cityPavers.setColorAt(index, paverTint.setRGB(tint, tint, tint));
});
cityPavers.receiveShadow = true;
cityPavers.instanceMatrix.needsUpdate = true;
if (cityPavers.instanceColor) cityPavers.instanceColor.needsUpdate = true;
cityStreetGroup.add(cityPavers);

function addCityStreetLamp(x, z) {
  const lamp = new THREE.Group();
  lamp.position.set(x, 0, z);

  const base = new THREE.Mesh(
    new THREE.CylinderGeometry(0.25, 0.34, 0.24, 8),
    cityLampStoneMaterial
  );
  base.position.y = 0.12;
  base.castShadow = true;
  base.receiveShadow = true;
  lamp.add(base);

  const foot = new THREE.Mesh(
    new THREE.CylinderGeometry(0.14, 0.21, 0.28, 8),
    cityLampIronMaterial
  );
  foot.position.y = 0.36;
  foot.castShadow = true;
  lamp.add(foot);

  const post = new THREE.Mesh(
    new THREE.CylinderGeometry(0.065, 0.09, 2.05, 8),
    cityLampIronMaterial
  );
  post.position.y = 1.48;
  post.castShadow = true;
  lamp.add(post);

  const collar = new THREE.Mesh(
    new THREE.CylinderGeometry(0.15, 0.1, 0.14, 8),
    cityLampIronMaterial
  );
  collar.position.y = 2.5;
  collar.castShadow = true;
  lamp.add(collar);

  const glass = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.42, 0.3), cityLampGlassMaterial);
  glass.position.y = 2.72;
  glass.castShadow = true;
  lamp.add(glass);

  for (const xOffset of [-0.19, 0.19]) {
    for (const zOffset of [-0.19, 0.19]) {
      const frame = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.5, 0.045), cityLampIronMaterial);
      frame.position.set(xOffset, 2.72, zOffset);
      frame.castShadow = true;
      lamp.add(frame);
    }
  }

  for (const y of [2.47, 2.97]) {
    const framePlate = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.065, 0.48), cityLampIronMaterial);
    framePlate.position.y = y;
    framePlate.castShadow = true;
    lamp.add(framePlate);
  }

  const cap = new THREE.Mesh(new THREE.ConeGeometry(0.38, 0.28, 4), cityLampIronMaterial);
  cap.position.y = 3.14;
  cap.rotation.y = Math.PI / 4;
  cap.castShadow = true;
  lamp.add(cap);

  const light = new THREE.PointLight(0xffa340, 0.1, 9, 2);
  light.position.y = 2.73;
  lamp.add(light);
  cityStreetLights.push(light);
  cityStreetGroup.add(lamp);
}

for (const position of [-12, 0, 12]) {
  addCityStreetLamp(position, -16.05);
  addCityStreetLamp(position, 16.05);
  addCityStreetLamp(-16.05, position);
  addCityStreetLamp(16.05, position);
}
scene.add(cityStreetGroup);

const cityWallMaterial = new THREE.MeshStandardMaterial({ color: 0x9b927f, roughness: 0.95 });
const cityWallTrimMaterial = new THREE.MeshStandardMaterial({ color: 0x6f6b63, roughness: 0.9 });
const cityWallRoofMaterial = new THREE.MeshStandardMaterial({
  color: 0x334756,
  roughness: 0.82,
  metalness: 0.12,
});
const cityGateWoodMaterial = new THREE.MeshStandardMaterial({ color: 0x55402f, roughness: 0.9 });
const cityWallMortarMaterial = new THREE.MeshStandardMaterial({ color: 0x55534f, roughness: 1 });
const cityWallWalkMaterial = new THREE.MeshStandardMaterial({ color: 0x746e63, roughness: 0.98 });
const cityWallFlagMaterial = new THREE.MeshStandardMaterial({
  color: 0x2f69a1,
  roughness: 0.78,
  side: THREE.DoubleSide,
});
const cityWallGoldMaterial = new THREE.MeshStandardMaterial({ color: 0xc49c3f, roughness: 0.68 });
const cityWallGroup = new THREE.Group();
const cityWallFlags = [];
const cityGateLights = [];
const cityWallNpcSpots = [];

function addCityWallSegment(x, z, width, depth) {
  const segment = new THREE.Group();
  segment.position.set(x, 0, z);
  const wall = new THREE.Mesh(
    new THREE.BoxGeometry(width, 3.4, depth),
    cityWallMaterial
  );
  wall.position.y = 1.7;
  wall.castShadow = true;
  wall.receiveShadow = true;
  segment.add(wall);

  const trim = new THREE.Mesh(
    new THREE.BoxGeometry(width + 0.18, 0.26, depth + 0.18),
    cityWallTrimMaterial
  );
  trim.position.y = 3.4;
  trim.castShadow = true;
  segment.add(trim);

  const horizontal = width > depth;
  const length = horizontal ? width : depth;
  const walkwayWidth = Math.max(2.8, (horizontal ? depth : width) - 0.9);
  const wallWalk = new THREE.Mesh(
    new THREE.BoxGeometry(
      horizontal ? width - 0.25 : walkwayWidth,
      0.16,
      horizontal ? walkwayWidth : depth - 0.25
    ),
    cityWallWalkMaterial
  );
  wallWalk.position.y = 3.56;
  wallWalk.castShadow = true;
  wallWalk.receiveShadow = true;
  segment.add(wallWalk);

  for (const y of [0.58, 1.18, 1.78, 2.38, 2.98]) {
    const course = new THREE.Mesh(
      new THREE.BoxGeometry(width + 0.035, 0.035, depth + 0.035),
      cityWallMortarMaterial
    );
    course.position.y = y;
    segment.add(course);
  }

  for (let detailIndex = 1; detailIndex <= 5; detailIndex += 1) {
    const along = -length / 2 + (detailIndex * length) / 6;
    const slitAlong = along + length / 12;
    for (const face of [-1, 1]) {
      const buttress = new THREE.Mesh(
        new THREE.BoxGeometry(
          horizontal ? 0.72 : 0.6,
          2.65,
          horizontal ? 0.6 : 0.72
        ),
        cityWallTrimMaterial
      );
      buttress.position.set(
        horizontal ? along : face * (width / 2 + 0.27),
        1.32,
        horizontal ? face * (depth / 2 + 0.27) : along
      );
      buttress.castShadow = true;
      buttress.receiveShadow = true;
      segment.add(buttress);

      const slit = new THREE.Mesh(
        new THREE.BoxGeometry(horizontal ? 0.18 : 0.035, 0.62, horizontal ? 0.035 : 0.18),
        cityWallMortarMaterial
      );
      slit.position.set(
        horizontal ? slitAlong : face * (width / 2 + 0.02),
        2.42,
        horizontal ? face * (depth / 2 + 0.02) : slitAlong
      );
      segment.add(slit);
    }
  }

  for (const face of [-1, 1]) {
    const parapetBase = new THREE.Mesh(
      new THREE.BoxGeometry(
        horizontal ? width : 0.42,
        0.42,
        horizontal ? 0.42 : depth
      ),
      cityWallMaterial
    );
    parapetBase.position.set(
      horizontal ? 0 : face * (width / 2 - 0.21),
      3.78,
      horizontal ? face * (depth / 2 - 0.21) : 0
    );
    parapetBase.castShadow = true;
    parapetBase.receiveShadow = true;
    segment.add(parapetBase);
  }

  const count = Math.max(2, Math.floor(length / 2.05));
  for (let index = 0; index < count; index += 1) {
    const along = -length / 2 + ((index + 0.5) * length) / count;
    for (const face of [-1, 1]) {
      const merlon = new THREE.Mesh(
        new THREE.BoxGeometry(horizontal ? 1.05 : 0.72, 0.76, horizontal ? 0.72 : 1.05),
        cityWallMaterial
      );
      merlon.position.set(
        horizontal ? along : face * (width / 2 - 0.36),
        4.24,
        horizontal ? face * (depth / 2 - 0.36) : along
      );
      merlon.castShadow = true;
      merlon.receiveShadow = true;
      segment.add(merlon);
    }
  }

  const patrolSpotCount = Math.max(3, Math.floor(length / 6));
  for (let index = 0; index < patrolSpotCount; index += 1) {
    const along = -length * 0.4 + (index * length * 0.8) / Math.max(1, patrolSpotCount - 1);
    cityWallNpcSpots.push(
      new THREE.Vector3(horizontal ? x + along : x, 3.66, horizontal ? z : z + along)
    );
  }
  cityWallGroup.add(segment);
}

const cityWallSegmentLength = 30.6;
const cityWallSegmentOffset = 19.9;
for (const side of [-1, 1]) {
  addCityWallSegment(-cityWallSegmentOffset, side * cityWallHalfExtent, cityWallSegmentLength, cityWallThickness);
  addCityWallSegment(cityWallSegmentOffset, side * cityWallHalfExtent, cityWallSegmentLength, cityWallThickness);
  addCityWallSegment(side * cityWallHalfExtent, -cityWallSegmentOffset, cityWallThickness, cityWallSegmentLength);
  addCityWallSegment(side * cityWallHalfExtent, cityWallSegmentOffset, cityWallThickness, cityWallSegmentLength);
}

function addCityCornerTower(x, z) {
  const tower = new THREE.Group();
  tower.position.set(x, 0, z);

  const body = new THREE.Mesh(
    new THREE.CylinderGeometry(2.25, 2.5, 5.25, 8),
    cityWallMaterial
  );
  body.position.y = 2.62;
  body.castShadow = true;
  body.receiveShadow = true;
  tower.add(body);

  const guardDeck = new THREE.Mesh(
    new THREE.CylinderGeometry(3.7, 3.7, 0.18, 8),
    cityWallWalkMaterial
  );
  guardDeck.position.y = 3.58;
  guardDeck.rotation.y = Math.PI / 8;
  guardDeck.castShadow = true;
  guardDeck.receiveShadow = true;
  tower.add(guardDeck);

  for (let index = 0; index < 8; index += 1) {
    const angle = (index / 8) * Math.PI * 2 + Math.PI / 8;
    const merlon = new THREE.Mesh(
      new THREE.BoxGeometry(0.85, 0.76, 0.7),
      cityWallMaterial
    );
    merlon.position.set(Math.sin(angle) * 3.3, 4.05, Math.cos(angle) * 3.3);
    merlon.rotation.y = angle;
    merlon.castShadow = true;
    tower.add(merlon);
  }

  for (const angle of [Math.PI / 4, Math.PI * 3 / 4, Math.PI * 5 / 4, Math.PI * 7 / 4]) {
    cityWallNpcSpots.push(
      new THREE.Vector3(x + Math.sin(angle) * 2.85, 3.68, z + Math.cos(angle) * 2.85)
    );
  }

  const band = new THREE.Mesh(
    new THREE.CylinderGeometry(2.5, 2.5, 0.32, 8),
    cityWallTrimMaterial
  );
  band.position.y = 4.95;
  band.castShadow = true;
  tower.add(band);

  const roof = new THREE.Mesh(new THREE.ConeGeometry(2.85, 2.35, 8), cityWallRoofMaterial);
  roof.position.y = 6.2;
  roof.rotation.y = Math.PI / 8;
  roof.castShadow = true;
  roof.receiveShadow = true;
  tower.add(roof);

  const arrowSlitMaterial = new THREE.MeshBasicMaterial({ color: 0x202629 });
  for (const angle of [0, Math.PI / 2, Math.PI, Math.PI * 1.5]) {
    const slit = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.72, 0.06), arrowSlitMaterial);
    slit.position.set(Math.sin(angle) * 2.22, 3.25, Math.cos(angle) * 2.22);
    slit.rotation.y = angle;
    tower.add(slit);
  }

  const finial = new THREE.Mesh(new THREE.SphereGeometry(0.14, 8, 6), cityWallGoldMaterial);
  finial.position.y = 7.42;
  tower.add(finial);
  const flagPole = new THREE.Mesh(
    new THREE.CylinderGeometry(0.035, 0.045, 2.15, 6),
    cityWallTrimMaterial
  );
  flagPole.position.y = 8.35;
  tower.add(flagPole);
  const flag = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 0.68), cityWallFlagMaterial);
  flag.position.set(0.62, 8.75, 0);
  flag.userData.flagPhase = x * 0.07 + z * 0.11;
  tower.add(flag);
  cityWallFlags.push(flag);
  cityWallGroup.add(tower);
}

for (const x of [-36.7, 36.7]) {
  for (const z of [-36.7, 36.7]) addCityCornerTower(x, z);
}

function addCityGatehouse(x, z, rotation, inwardSign) {
  const gatehouse = new THREE.Group();
  gatehouse.position.set(x, 0, z);
  gatehouse.rotation.y = rotation;

  for (const side of [-1, 1]) {
    const tower = new THREE.Mesh(
      new THREE.BoxGeometry(2.55, 5.35, 2.75),
      cityWallMaterial
    );
    tower.position.set(side * 4.9, 2.68, 0);
    tower.castShadow = true;
    tower.receiveShadow = true;
    gatehouse.add(tower);

    for (const y of [0.7, 1.45, 2.2, 2.95, 3.7, 4.45]) {
      const course = new THREE.Mesh(
        new THREE.BoxGeometry(2.59, 0.035, 2.79),
        cityWallMortarMaterial
      );
      course.position.set(side * 4.9, y, 0);
      gatehouse.add(course);
    }

    const roof = new THREE.Mesh(new THREE.ConeGeometry(2.05, 2.15, 4), cityWallRoofMaterial);
    roof.position.set(side * 4.9, 6.25, 0);
    roof.rotation.y = Math.PI / 4;
    roof.castShadow = true;
    gatehouse.add(roof);

    const openGate = new THREE.Mesh(
      new THREE.BoxGeometry(0.22, 3.15, 2.75),
      cityGateWoodMaterial
    );
    openGate.position.set(side * 3.65, 1.58, -side * 1.45);
    openGate.castShadow = true;
    gatehouse.add(openGate);

    for (const face of [-1, 1]) {
      const arrowSlit = new THREE.Mesh(
        new THREE.BoxGeometry(0.14, 0.72, 0.045),
        cityWallMortarMaterial
      );
      arrowSlit.position.set(side * 4.9, 3.15, face * 1.395);
      gatehouse.add(arrowSlit);
    }
  }

  const lintel = new THREE.Mesh(
    new THREE.BoxGeometry(7.35, 1.05, 1.95),
    cityWallMaterial
  );
  lintel.position.y = 4.56;
  lintel.castShadow = true;
  lintel.receiveShadow = true;
  gatehouse.add(lintel);

  const lintelTrim = new THREE.Mesh(
    new THREE.BoxGeometry(7.65, 0.24, 2.12),
    cityWallTrimMaterial
  );
  lintelTrim.position.y = 5.16;
  lintelTrim.castShadow = true;
  gatehouse.add(lintelTrim);

  const gateWalk = new THREE.Mesh(
    new THREE.BoxGeometry(7.45, 0.18, cityWallThickness - 0.78),
    cityWallWalkMaterial
  );
  gateWalk.position.y = 3.58;
  gateWalk.castShadow = true;
  gateWalk.receiveShadow = true;
  gatehouse.add(gateWalk);

  for (let stepIndex = 0; stepIndex < 10; stepIndex += 1) {
    const stepHeight = (stepIndex + 1) * 0.34;
    const step = new THREE.Mesh(
      new THREE.BoxGeometry(2.05, stepHeight, 0.58),
      cityWallWalkMaterial
    );
    step.position.set(
      6.72,
      stepHeight / 2,
      inwardSign * (5.15 - stepIndex * 0.43)
    );
    step.castShadow = true;
    step.receiveShadow = true;
    gatehouse.add(step);
  }

  const stairRail = new THREE.Mesh(
    new THREE.BoxGeometry(0.18, 1.05, 4.55),
    cityWallTrimMaterial
  );
  stairRail.position.set(7.82, 2.15, inwardSign * 3.22);
  stairRail.rotation.x = inwardSign * -0.63;
  stairRail.castShadow = true;
  gatehouse.add(stairRail);

  for (const xOffset of [-2.6, 0, 2.6]) {
    const spot = new THREE.Vector3(xOffset, 3.68, 0);
    spot.applyAxisAngle(new THREE.Vector3(0, 1, 0), rotation);
    spot.add(new THREE.Vector3(x, 0, z));
    cityWallNpcSpots.push(spot);
  }

  for (const xOffset of [-2.75, -0.9, 0.9, 2.75]) {
    const merlon = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.68, 2.05), cityWallMaterial);
    merlon.position.set(xOffset, 5.55, 0);
    merlon.castShadow = true;
    gatehouse.add(merlon);
  }

  for (const xOffset of [-2.55, -1.7, -0.85, 0, 0.85, 1.7, 2.55]) {
    const portcullisBar = new THREE.Mesh(
      new THREE.BoxGeometry(0.075, 0.95, 0.1),
      cityWallTrimMaterial
    );
    portcullisBar.position.set(xOffset, 3.58, 0);
    gatehouse.add(portcullisBar);
    const tooth = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.25, 4), cityWallTrimMaterial);
    tooth.position.set(xOffset, 3.02, 0);
    tooth.rotation.y = Math.PI / 4;
    gatehouse.add(tooth);
  }

  for (const face of [-1, 1]) {
    const crest = new THREE.Mesh(new THREE.CircleGeometry(0.52, 18), cityWallFlagMaterial);
    crest.position.set(0, 4.58, face * 0.99);
    if (face < 0) crest.rotation.y = Math.PI;
    gatehouse.add(crest);
    const crestRim = new THREE.Mesh(new THREE.TorusGeometry(0.55, 0.055, 6, 18), cityWallGoldMaterial);
    crestRim.position.copy(crest.position);
    crestRim.rotation.y = crest.rotation.y;
    gatehouse.add(crestRim);

    for (const xOffset of [-3.05, 3.05]) {
      const flame = new THREE.Mesh(new THREE.OctahedronGeometry(0.11, 0), cityLampGlassMaterial);
      flame.position.set(xOffset, 3.1, face * 1.18);
      gatehouse.add(flame);
    }
  }
  for (const xOffset of [-3.05, 3.05]) {
    const gateLamp = new THREE.PointLight(0xff9f43, 0.1, 7.5, 2);
    gateLamp.position.set(xOffset, 3.1, 0);
    gatehouse.add(gateLamp);
    cityGateLights.push(gateLamp);
  }
  cityWallGroup.add(gatehouse);
}

addCityGatehouse(0, -cityWallHalfExtent, 0, 1);
addCityGatehouse(0, cityWallHalfExtent, 0, -1);
addCityGatehouse(-cityWallHalfExtent, 0, Math.PI / 2, 1);
addCityGatehouse(cityWallHalfExtent, 0, Math.PI / 2, -1);
cityWallGroup.userData.npcPatrolSpots = cityWallNpcSpots;
scene.add(cityWallGroup);

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
  const npcTemplate = cloneSkeleton(character.scene);
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

  return {
    root,
    visual,
    mixer,
    setAnimation,
    requestAttack,
    isAttacking: () => attackTimer > 0,
    update,
    npcTemplate,
    npcClips: clips,
  };
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

function createMonsterAnimationRig(model, clips) {
  const clipByName = (name) => THREE.AnimationClip.findByName(clips, name);
  const mixer = new THREE.AnimationMixer(model);
  const actions = {
    idle: mixer.clipAction(clipByName("Idle_A")),
    walk: mixer.clipAction(clipByName("Walking_A")),
    run: mixer.clipAction(clipByName("Running_A")),
    attack: mixer.clipAction(clipByName("Melee_1H_Attack_Chop")),
    hit: mixer.clipAction(clipByName("Hit_A")),
    death: mixer.clipAction(clipByName("Death_A")),
  };
  for (const state of ["attack", "hit", "death"]) {
    actions[state].setLoop(THREE.LoopOnce, 1);
    actions[state].clampWhenFinished = true;
  }
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
  const [dayCharacter, nightCharacter, axe, shield] = await Promise.all([
    loadGLTF("./models/monsters/Skeleton_Minion.glb"),
    loadGLTF("./models/monsters/Skeleton_Warrior.glb"),
    loadGLTF("./models/monster-gear/Skeleton_Axe.gltf"),
    loadGLTF("./models/monster-gear/Skeleton_Shield_Large_A.gltf"),
  ]);
  return {
    dayTemplate: dayCharacter.scene,
    nightTemplate: nightCharacter.scene,
    axeTemplate: axe.scene,
    shieldTemplate: shield.scene,
  };
}

function createMonsterSystem(assets, clips, onGoldEarned) {
  const root = new THREE.Group();
  const attackDirection = new THREE.Vector3();
  const playerForward = new THREE.Vector3();
  let playerAttackCooldown = 0;
  let currentNight = false;
  const spawnPositions = [
    new THREE.Vector3(-56, 0, -44),
    new THREE.Vector3(58, 0, -46),
    new THREE.Vector3(-69, 0, 16),
    new THREE.Vector3(68, 0, 27),
    new THREE.Vector3(-34, 0, 69),
    new THREE.Vector3(41, 0, 72),
  ];

  const createMonster = (position, index) => {
    const monsterRoot = new THREE.Group();
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
    monsterRoot.add(dayGroup, nightGroup);
    monsterRoot.position.copy(position);
    monsterRoot.rotation.y = index * 1.37;

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
    root.add(monsterRoot);

    return {
      root: monsterRoot,
      dayGroup,
      nightGroup,
      dayRig: createMonsterAnimationRig(dayModel, clips),
      nightRig: createMonsterAnimationRig(nightModel, clips),
      home: position.clone(),
      wanderTarget: position.clone(),
      wanderTimer: index * 0.6,
      attackCooldown: index * 0.13,
      hitTimer: 0,
      deathTimer: 0,
      respawnTimer: 0,
      health: 3,
      maxHealth: 3,
      dead: false,
      direction: new THREE.Vector3(),
      desiredQuaternion: new THREE.Quaternion(),
      desiredEuler: new THREE.Euler(),
      aura,
      index,
    };
  };

  const monsters = spawnPositions.map(createMonster);

  const setNightMode = (night) => {
    currentNight = night;
    for (const monster of monsters) {
      monster.dayGroup.visible = !night;
      monster.nightGroup.visible = night;
      if (!monster.dead) {
        playMonsterAnimation(night ? monster.nightRig : monster.dayRig, "idle", true);
      }
    }
  };

  const respawn = (monster) => {
    monster.dead = false;
    monster.health = monster.maxHealth;
    monster.root.visible = true;
    monster.root.position.copy(monster.home);
    monster.dayGroup.visible = !currentNight;
    monster.nightGroup.visible = currentNight;
    monster.wanderTarget.copy(monster.home);
    monster.wanderTimer = 0.3 + monster.index * 0.2;
    playMonsterAnimation(currentNight ? monster.nightRig : monster.dayRig, "idle", true);
  };

  const damageMonster = (monster) => {
    if (monster.dead) return;
    monster.health -= 1;
    const rig = currentNight ? monster.nightRig : monster.dayRig;
    if (monster.health > 0) {
      monster.hitTimer = 0.32;
      playMonsterAnimation(rig, "hit", true);
      return;
    }

    monster.dead = true;
    monster.deathTimer = 1.3;
    monster.respawnTimer = 15;
    playMonsterAnimation(rig, "death", true);
    const reward = currentNight ? 12 : 8;
    onGoldEarned(reward);
    showThreat(`骷髅被击败 · +${reward} 金币`);
  };

  const playerAttack = (playerRoot) => {
    if (!playerRoot || playerAttackCooldown > 0) return false;
    playerForward.set(0, 0, 1).applyQuaternion(playerRoot.quaternion).setY(0).normalize();
    let target = null;
    let targetDistance = 3.15;
    for (const monster of monsters) {
      if (monster.dead || !monster.root.visible) continue;
      attackDirection.subVectors(monster.root.position, playerRoot.position).setY(0);
      const distance = attackDirection.length();
      if (distance > targetDistance || distance < 0.001) continue;
      attackDirection.multiplyScalar(1 / distance);
      if (playerForward.dot(attackDirection) < 0.08) continue;
      target = monster;
      targetDistance = distance;
    }
    if (!target) return false;
    playerAttackCooldown = 0.28;
    damageMonster(target);
    return true;
  };

  const updateMonster = (monster, delta, time) => {
    const rig = currentNight ? monster.nightRig : monster.dayRig;
    if (monster.dead) {
      rig.mixer.update(delta);
      monster.deathTimer -= delta;
      monster.respawnTimer -= delta;
      if (monster.deathTimer <= 0) monster.root.visible = false;
      if (monster.respawnTimer <= 0) respawn(monster);
      return;
    }
    if (!knight) return;
    if (monster.hitTimer > 0) {
      monster.hitTimer -= delta;
      rig.mixer.update(delta);
      return;
    }

    const playerDistance = monster.root.position.distanceTo(knight.root.position);
    const detectionRadius = currentNight ? 25 : 4.5;
    const attackRadius = currentNight ? 1.9 : 1.5;
    let state = "idle";
    let speed = 0;

    if (playerDistance < detectionRadius) {
      monster.direction.subVectors(knight.root.position, monster.root.position);
      if (playerDistance <= attackRadius) {
        state = "attack";
      } else {
        state = currentNight ? "run" : "walk";
        speed = currentNight ? 2.55 : 0.95;
      }
    } else {
      monster.wanderTimer -= delta;
      if (monster.wanderTimer <= 0) {
        const angle = time * 0.00023 + monster.index * 1.81;
        const radius = 2.6 + (monster.index % 3) * 0.65;
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
        speed = currentNight ? 0.86 : 0.5;
      }
    }

    monster.attackCooldown -= delta;
    if (state === "attack") {
      if (monster.attackCooldown <= 0) {
        playMonsterAnimation(rig, "attack", true);
        monster.attackCooldown = currentNight ? 0.92 : 1.8;
      }
    } else {
      playMonsterAnimation(rig, state);
      if (speed > 0 && monster.direction.lengthSq() > 0.001) {
        monster.direction.y = 0;
        monster.direction.normalize();
        monster.root.position.addScaledVector(monster.direction, speed * delta);
        resolveCityWallCollision(monster.root.position, 0.58);
      }
    }

    if (monster.direction.lengthSq() > 0.001) {
      monster.desiredEuler.set(0, Math.atan2(monster.direction.x, monster.direction.z), 0);
      monster.desiredQuaternion.setFromEuler(monster.desiredEuler);
      monster.root.quaternion.slerp(monster.desiredQuaternion, 1 - Math.exp(-delta * 10));
    }
    rig.mixer.update(delta);
    monster.aura.material.opacity = 0.56 + Math.sin(time * 0.007 + monster.index) * 0.18;
  };

  const update = (delta, time) => {
    playerAttackCooldown = Math.max(0, playerAttackCooldown - delta);
    for (const monster of monsters) updateMonster(monster, delta, time);
  };

  setNightMode(false);
  return { root, setNightMode, playerAttack, update };
}

const cityNpcAssetUrls = {
  farmer: "./models/npcs/farmer.glb",
  "worker-m": "./models/npcs/worker-m.glb",
  "worker-f": "./models/npcs/worker-f.glb",
  king: "./models/npcs/king.glb",
  "adventurer-m": "./models/npcs/adventurer-m.glb",
  "adventurer-f": "./models/npcs/adventurer-f.glb",
  "villager-f": "./models/npcs/villager-f.glb",
};

async function loadCityNpcAssets() {
  const entries = Object.entries(cityNpcAssetUrls);
  const loaded = await Promise.all(entries.map(([, url]) => loadGLTF(url)));
  return Object.fromEntries(entries.map(([id], index) => [
    id,
    {
      template: loaded[index].scene,
      clips: loaded[index].animations,
    },
  ]));
}

function findNpcClip(clips, exactNames, containsNames = []) {
  for (const exactName of exactNames) {
    const lowerExactName = exactName.toLowerCase();
    const clip = clips.find(({ name }) => {
      const lowerName = name.toLowerCase();
      return lowerName === lowerExactName || lowerName.endsWith(`|${lowerExactName}`);
    });
    if (clip) return clip;
  }
  return clips.find(({ name }) => {
    const lowerName = name.toLowerCase();
    return containsNames.some((candidate) => lowerName.includes(candidate.toLowerCase()));
  }) || null;
}

function createCityNpcSystem(characterTemplate, clips, npcAssets, onWoodProduced, forestTemplates) {
  const root = new THREE.Group();
  const npcsByPlot = new Map();
  const direction = new THREE.Vector3();
  const targetRotation = new THREE.Quaternion();
  const targetEuler = new THREE.Euler();
  const professionColor = new THREE.Color();
  const guardAsset = {
    template: characterTemplate,
    clips,
    tintStrength: 0.2,
  };
  const roles = {
    barracks: {
      color: 0x315f92,
      count: 2,
      speed: 1.55,
      works: true,
      patrolsGate: true,
      models: ["guard"],
    },
    blacksmith: {
      color: 0xb85d35,
      count: 1,
      speed: 1.25,
      works: true,
      models: ["worker-m", "worker-f"],
    },
    archery: {
      color: 0x4d813d,
      count: 1,
      speed: 1.45,
      works: true,
      models: ["adventurer-f", "adventurer-m"],
    },
    market: {
      color: 0xc99b37,
      count: 2,
      speed: 1.35,
      works: false,
      models: ["villager-f", "king"],
    },
    church: {
      color: 0xeee0bd,
      count: 1,
      speed: 1.2,
      works: false,
      models: ["king", "villager-f"],
    },
    home: {
      color: 0x8b5e9d,
      count: 2,
      speed: 1.3,
      works: false,
      models: ["farmer", "villager-f", "worker-f"],
    },
    lumbermill: {
      color: 0x8b633a,
      count: 2,
      speed: 2.25,
      works: true,
      producesWood: true,
      models: ["farmer", "worker-m", "worker-f"],
    },
    tower: {
      color: 0x496f88,
      count: 1,
      speed: 1.5,
      works: true,
      patrolsGate: true,
      models: ["guard"],
    },
  };

  const createRoute = (plot, role, workerIndex) => {
    const position = plot.root.position;
    const signX = Math.sign(position.x) || 1;
    const signZ = Math.sign(position.z) || 1;
    const cornerPlot = Math.abs(position.x) > 20 && Math.abs(position.z) > 20;
    const useXAxis = cornerPlot
      ? workerIndex % 2 === 0
      : Math.abs(position.x) > Math.abs(position.z);
    const inward = useXAxis
      ? new THREE.Vector3(-signX, 0, 0)
      : new THREE.Vector3(0, 0, -signZ);
    const tangent = new THREE.Vector3(-inward.z, 0, inward.x);
    const laneOffset = (workerIndex - (role.count - 1) / 2) * 0.72;
    const offset = tangent.clone().multiplyScalar(laneOffset);
    const workSpot = position.clone()
      .addScaledVector(inward, plot.collisionRadius + 1.05)
      .add(offset);
    const streetEntry = useXAxis
      ? new THREE.Vector3(signX * 19.4, 0, position.z)
      : new THREE.Vector3(position.x, 0, signZ * 19.4);
    const streetHub = useXAxis
      ? new THREE.Vector3(signX * 19.4, 0, 0)
      : new THREE.Vector3(0, 0, signZ * 19.4);
    streetEntry.add(offset);
    streetHub.add(offset);

    const destination = role.patrolsGate
      ? (useXAxis
        ? new THREE.Vector3(signX * 30.2, 0, laneOffset)
        : new THREE.Vector3(laneOffset, 0, signZ * 30.2))
      : (useXAxis
        ? new THREE.Vector3(signX * 10.4, 0, laneOffset)
        : new THREE.Vector3(laneOffset, 0, signZ * 10.4));

    if (role.producesWood) {
      const gateLane = laneOffset * 0.72;
      const treeLaneDirection = workerIndex % 2 === 0 ? -1 : 1;
      const treeLane = treeLaneDirection * (5.4 + (plot.index % 3) * 1.15);
      const treeDistance = 51.2 + (plot.index % 4) * 2.3;
      const gateInner = useXAxis
        ? new THREE.Vector3(signX * 32.5, 0, gateLane)
        : new THREE.Vector3(gateLane, 0, signZ * 32.5);
      const gateOuter = useXAxis
        ? new THREE.Vector3(signX * 42.2, 0, gateLane)
        : new THREE.Vector3(gateLane, 0, signZ * 42.2);
      const forestApproach = useXAxis
        ? new THREE.Vector3(signX * 46.2, 0, treeLane)
        : new THREE.Vector3(treeLane, 0, signZ * 46.2);
      const treePosition = useXAxis
        ? new THREE.Vector3(signX * treeDistance, 0, treeLane)
        : new THREE.Vector3(treeLane, 0, signZ * treeDistance);
      const treeWorkSpot = useXAxis
        ? new THREE.Vector3(signX * (treeDistance - 1.45), 0, treeLane)
        : new THREE.Vector3(treeLane, 0, signZ * (treeDistance - 1.45));
      return {
        points: [
          workSpot,
          streetEntry,
          streetHub,
          gateInner,
          gateOuter,
          forestApproach,
          treeWorkSpot,
          forestApproach.clone(),
          gateOuter.clone(),
          gateInner.clone(),
          streetHub.clone(),
          streetEntry.clone(),
        ],
        home: workSpot,
        streetEntry,
        streetHub,
        gateInner,
        gateOuter,
        forestApproach,
        treeWorkSpot,
        treePosition,
        workIndex: 6,
      };
    }

    return {
      points: [
        workSpot,
        streetEntry,
        streetHub,
        destination,
        streetHub.clone(),
        streetEntry.clone(),
      ],
      home: workSpot,
      workIndex: 0,
    };
  };

  const setNpcAction = (npc, state) => {
    const nextAction = npc.actions[state] || npc.actions.idle;
    if (!nextAction || nextAction === npc.activeAction) return;
    nextAction.reset().fadeIn(0.18).play();
    npc.activeAction?.fadeOut(0.18);
    npc.activeAction = nextAction;
  };

  const createNpc = (plot, typeId, workerIndex) => {
    const role = roles[typeId] || roles.home;
    const npcRoot = new THREE.Group();
    const assetId = role.models[(plot.index + workerIndex) % role.models.length];
    const asset = assetId === "guard" ? guardAsset : npcAssets[assetId];
    const model = cloneSkeleton(asset.template);
    fitModelToHeight(model, 2.12);
    setShadows(model);

    professionColor.setHex(role.color);
    model.traverse((child) => {
      if (!child.isMesh || !child.material) return;
      const materials = Array.isArray(child.material) ? child.material : [child.material];
      const tinted = materials.map((material) => {
        const clone = material.clone();
        if (clone.color) clone.color.lerp(professionColor, asset.tintStrength ?? 0.035);
        return clone;
      });
      child.material = Array.isArray(child.material) ? tinted : tinted[0];
    });

    const badge = new THREE.Mesh(
      new THREE.CylinderGeometry(0.13, 0.13, 0.045, 12),
      new THREE.MeshStandardMaterial({
        color: role.color,
        emissive: role.color,
        emissiveIntensity: 0.2,
        roughness: 0.7,
      })
    );
    badge.rotation.x = Math.PI / 2;
    badge.position.set(0, 1.4, 0.3);
    badge.castShadow = true;
    npcRoot.add(model, badge);

    const mixer = new THREE.AnimationMixer(model);
    const idleClip = findNpcClip(asset.clips, ["Idle_A", "Idle", "Idle_Neutral"], ["idle"]);
    const walkClip = findNpcClip(asset.clips, ["Walking_A", "Walk"], ["walk"]);
    const workClip = assetId === "guard"
      ? findNpcClip(asset.clips, ["Melee_1H_Attack_Chop"], ["attack_chop"])
      : typeId === "lumbermill"
        ? findNpcClip(asset.clips, ["Punch_Right", "Punch_Left", "Interact"], ["punch", "interact"])
        : findNpcClip(asset.clips, ["Interact", "Punch_Right", "Punch_Left"], ["interact", "punch"]);
    const actions = {
      idle: idleClip ? mixer.clipAction(idleClip) : null,
      walk: walkClip ? mixer.clipAction(walkClip) : null,
      work: role.works && workClip ? mixer.clipAction(workClip) : null,
    };
    actions.idle?.play();
    if (role.producesWood && actions.walk) actions.walk.setEffectiveTimeScale(1.32);
    if (actions.work) {
      actions.work.setLoop(THREE.LoopRepeat, Infinity);
      actions.work.setEffectiveTimeScale(0.72 + workerIndex * 0.06);
    }

    const random = seededRandom(5100 + plot.index * 97 + workerIndex * 31);
    const routePlan = createRoute(plot, role, workerIndex);
    const route = routePlan.points;
    let workTree = null;
    if (routePlan.treePosition && forestTemplates?.trees?.length) {
      const treeTemplate = forestTemplates.trees[(plot.index + workerIndex) % forestTemplates.trees.length];
      workTree = treeTemplate.clone(true);
      workTree.position.copy(routePlan.treePosition);
      workTree.rotation.y = random() * Math.PI * 2;
      workTree.scale.setScalar(1.02 + random() * 0.16);
      setShadows(workTree, true);
      root.add(workTree);
    }
    npcRoot.position.copy(route[0]);
    root.add(npcRoot);
    return {
      root: npcRoot,
      model,
      mixer,
      actions,
      activeAction: actions.idle,
      assetId,
      route,
      routePlan,
      dayRoute: route,
      workIndex: routePlan.workIndex,
      workTree,
      role,
      random,
      currentPoint: 0,
      targetPoint: 1,
      waitTimer: 0.7 + random() * 2.4,
      productionTimer: 2.6 + random() * 1.2,
      nightState: false,
      returningHome: false,
      atHomeNight: false,
    };
  };

  const removePlot = (plotIndex) => {
    const npcs = npcsByPlot.get(plotIndex);
    if (!npcs) return;
    for (const npc of npcs) {
      npc.mixer.stopAllAction();
      npc.mixer.uncacheRoot(npc.model);
      root.remove(npc.root);
      if (npc.workTree) root.remove(npc.workTree);
    }
    npcsByPlot.delete(plotIndex);
  };

  const spawnForPlot = (plot) => {
    if (!plot?.builtType) return;
    removePlot(plot.index);
    const role = roles[plot.builtType] || roles.home;
    const npcs = [];
    for (let index = 0; index < role.count; index += 1) {
      npcs.push(createNpc(plot, plot.builtType, index));
    }
    npcsByPlot.set(plot.index, npcs);
    plot.npcSpawned = true;
  };

  const sync = (plots) => {
    for (const plot of plots) {
      if (plot.builtType && plot.buildProgress >= 1) spawnForPlot(plot);
    }
  };

  const setLumberSchedule = (npc, isNight) => {
    if (!npc.role.producesWood || npc.nightState === isNight) return;
    npc.nightState = isNight;
    npc.waitTimer = 0;

    if (isNight) {
      const plan = npc.routePlan;
      const outsideCity = Math.abs(npc.root.position.x) > cityWallHalfExtent + 0.25
        || Math.abs(npc.root.position.z) > cityWallHalfExtent + 0.25;
      const returnRoute = [npc.root.position.clone()];
      if (outsideCity) {
        returnRoute.push(
          plan.gateOuter.clone(),
          plan.gateInner.clone(),
          plan.streetHub.clone(),
          plan.streetEntry.clone(),
          plan.home.clone()
        );
      } else {
        const homewardPoints = [
          plan.home,
          plan.streetEntry,
          plan.streetHub,
          plan.gateInner,
        ];
        let nearestIndex = 0;
        let nearestDistance = Infinity;
        homewardPoints.forEach((point, index) => {
          const distance = point.distanceToSquared(npc.root.position);
          if (distance < nearestDistance) {
            nearestIndex = index;
            nearestDistance = distance;
          }
        });
        returnRoute.push(...homewardPoints.slice(0, nearestIndex + 1).reverse().map((point) => point.clone()));
      }
      npc.route = returnRoute.filter((point, index, points) =>
        index === 0 || point.distanceToSquared(points[index - 1]) > 0.04
      );
      npc.currentPoint = 0;
      npc.targetPoint = Math.min(1, npc.route.length - 1);
      npc.workIndex = -1;
      npc.returningHome = npc.route.length > 1;
      npc.atHomeNight = npc.route.length <= 1;
      setNpcAction(npc, npc.atHomeNight ? "idle" : "walk");
      return;
    }

    npc.route = npc.dayRoute;
    npc.workIndex = npc.routePlan.workIndex;
    npc.returningHome = false;
    npc.atHomeNight = false;
    const outsideCity = Math.abs(npc.root.position.x) > cityWallHalfExtent + 0.25
      || Math.abs(npc.root.position.z) > cityWallHalfExtent + 0.25;
    if (outsideCity) {
      npc.currentPoint = 4;
      npc.targetPoint = 5;
    } else {
      const departurePoints = npc.route.slice(0, 4);
      let nearestIndex = 0;
      let nearestDistance = Infinity;
      departurePoints.forEach((point, index) => {
        const distance = point.distanceToSquared(npc.root.position);
        if (distance < nearestDistance) {
          nearestIndex = index;
          nearestDistance = distance;
        }
      });
      npc.currentPoint = nearestIndex;
      npc.targetPoint = Math.min(nearestIndex + 1, 4);
    }
    setNpcAction(npc, "walk");
  };

  const update = (delta, isNight = false) => {
    for (const npcs of npcsByPlot.values()) {
      for (const npc of npcs) {
        npc.mixer.update(delta);
        setLumberSchedule(npc, isNight);
        if (npc.role.producesWood && isNight && npc.atHomeNight) {
          setNpcAction(npc, "idle");
          continue;
        }
        if (npc.waitTimer > 0) {
          if (npc.role.producesWood && npc.currentPoint === npc.workIndex) {
            if (isNight) {
              setNpcAction(npc, "idle");
            } else {
              setNpcAction(npc, "work");
              npc.productionTimer -= delta;
              if (npc.productionTimer <= 0) {
                onWoodProduced(2);
                npc.productionTimer = 4.2 + npc.random() * 1.6;
              }
            }
          }
          npc.waitTimer -= delta;
          if (npc.waitTimer <= 0) {
            npc.targetPoint = (npc.currentPoint + 1) % npc.route.length;
            setNpcAction(npc, "walk");
          }
          continue;
        }

        const target = npc.route[npc.targetPoint];
        direction.subVectors(target, npc.root.position);
        const distance = direction.length();
        if (distance < 0.16) {
          npc.root.position.copy(target);
          npc.currentPoint = npc.targetPoint;
          if (npc.role.producesWood && isNight && npc.returningHome) {
            if (npc.currentPoint >= npc.route.length - 1) {
              npc.returningHome = false;
              npc.atHomeNight = true;
              setNpcAction(npc, "idle");
            } else {
              npc.targetPoint = npc.currentPoint + 1;
              setNpcAction(npc, "walk");
            }
            continue;
          }
          const working = npc.currentPoint === 0
            && npc.role.works
            && !npc.role.producesWood;
          const lumberWorking = npc.role.producesWood && npc.currentPoint === npc.workIndex;
          if (npc.role.producesWood && !lumberWorking && npc.currentPoint !== 0) {
            npc.waitTimer = 0;
            npc.targetPoint = (npc.currentPoint + 1) % npc.route.length;
            setNpcAction(npc, "walk");
            continue;
          }
          npc.waitTimer = lumberWorking
            ? 5.2 + npc.random() * 2.2
            : working
              ? 3.2 + npc.random() * 3.1
              : 0.65 + npc.random() * 1.65;
          setNpcAction(npc, working || lumberWorking ? "work" : "idle");
          continue;
        }

        direction.multiplyScalar(1 / distance);
        npc.root.position.addScaledVector(direction, Math.min(distance, npc.role.speed * delta));
        targetEuler.set(0, Math.atan2(direction.x, direction.z), 0);
        targetRotation.setFromEuler(targetEuler);
        npc.root.quaternion.slerp(targetRotation, 1 - Math.exp(-delta * 10));
      }
    }
  };

  return { root, spawnForPlot, removePlot, sync, update };
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
      npcSpawned: false,
    });
  }

  let activePlot = null;
  let selectionPinned = false;
  try {
    localStorage.removeItem("mistwood-build-plots-v1");
  } catch {
    // A fresh building layout is still used when storage is unavailable.
  }

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

  const buildOnPlot = (plot, typeId, animate = true) => {
    const definition = definitions.get(typeId);
    if (!plot || !definition || plot.builtType) return false;
    const model = definition.template.clone(true);
    fitModelToHeight(model, definition.height);
    const isCornerPlot = Math.abs(plot.root.position.x) > 20 && Math.abs(plot.root.position.z) > 20;
    model.rotation.y = isCornerPlot
      ? (plot.root.position.z < 0 ? Math.PI : 0)
      : Math.atan2(plot.root.position.x, plot.root.position.z);
    model.position.y += 0.14;
    setShadows(model);
    plot.buildingGroup.add(model);
    plot.buildingGroup.scale.setScalar(animate ? 0.72 : 1);
    plot.buildProgress = animate ? 0 : 1;
    plot.builtType = typeId;
    plot.collisionRadius = definition.radius;
    plot.npcSpawned = false;
    plot.marker.visible = false;
    plot.foundation.material.color.setHex(0x858077);
    plot.ringMaterial.color.setHex(0xd3b65c);
    if (animate) showThreat(`${definition.label} · 建造完成`);
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
    cityNpcSystem?.removePlot(activePlot.index);
    activePlot.buildingGroup.clear();
    activePlot.builtType = null;
    activePlot.collisionRadius = 0;
    activePlot.npcSpawned = false;
    activePlot.marker.visible = true;
    activePlot.foundation.material.color.setHex(0x718b83);
    activePlot.ringMaterial.color.setHex(0x6ec5e2);
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
        if (plot.buildProgress >= 1 && !plot.npcSpawned) {
          cityNpcSystem?.spawnForPlot(plot);
        }
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

async function createCityDetails() {
  const propSpecs = [
    ["well", "./models/town/building_well_blue.gltf"],
    ["barrel", "./models/town/barrel.gltf"],
    ["crate", "./models/town/crate_A_small.gltf"],
    ["sack", "./models/town/sack.gltf"],
    ["pallet", "./models/town/pallet.gltf"],
    ["lumber", "./models/town/resource_lumber.gltf"],
    ["stone", "./models/town/resource_stone.gltf"],
    ["wheelbarrow", "./models/town/wheelbarrow.gltf"],
    ["target", "./models/town/target.gltf"],
    ["weaponrack", "./models/town/weaponrack.gltf"],
    ["arrows", "./models/town/bucket_arrows.gltf"],
  ];
  const loadedProps = await Promise.all(propSpecs.map(([, url]) => loadGLTF(url)));
  const templates = new Map(
    propSpecs.map(([id], index) => [id, loadedProps[index].scene])
  );
  const root = new THREE.Group();

  const placeProp = (id, x, z, height, rotation = 0) => {
    const model = templates.get(id)?.clone(true);
    if (!model) return null;
    fitModelToHeight(model, height);
    model.position.x = x;
    model.position.z = z;
    model.rotation.y = rotation;
    setShadows(model);
    root.add(model);
    return model;
  };

  // Northwest storage yard.
  placeProp("pallet", -18.9, -32.8, 0.32, 0.18);
  placeProp("crate", -18.7, -32.6, 1.05, -0.12);
  placeProp("crate", -17.4, -33.3, 0.88, 0.2);
  placeProp("barrel", -20.0, -31.4, 1.15, 0.08);
  placeProp("barrel", -18.8, -31.2, 1.08, -0.14);
  placeProp("sack", -16.8, -32.2, 0.72, -0.4);
  placeProp("sack", -16.4, -33.0, 0.66, 0.35);

  // Northeast guard training yard.
  placeProp("target", 18.8, -33.1, 2.3, -0.55);
  placeProp("target", 16.8, -32.3, 2.05, -0.18);
  placeProp("weaponrack", 20.0, -31.3, 2.15, -Math.PI / 2);
  placeProp("arrows", 18.2, -31.5, 1.0, 0.25);
  placeProp("barrel", 20.1, -33.4, 1.05, 0.12);
  placeProp("crate", 16.5, -31.3, 0.88, -0.2);

  // Southeast builders' yard.
  placeProp("lumber", 18.7, 33.0, 1.45, 0.1);
  placeProp("lumber", 16.7, 31.8, 1.2, -0.24);
  placeProp("stone", 20.0, 31.2, 1.2, 0.3);
  placeProp("wheelbarrow", 16.6, 33.6, 1.35, Math.PI * 0.7);
  placeProp("barrel", 20.1, 33.5, 1.05, -0.1);
  placeProp("sack", 18.5, 31.2, 0.7, 0.2);

  // Southwest communal corner.
  placeProp("well", -18.5, 32.5, 3.55, Math.PI / 4);
  placeProp("barrel", -20.2, 33.6, 1.08, -0.18);
  placeProp("crate", -20.0, 31.2, 0.92, 0.12);
  placeProp("sack", -16.7, 31.5, 0.7, -0.4);
  placeProp("wheelbarrow", -16.5, 33.6, 1.25, -Math.PI * 0.7);

  const benchMaterial = cityGateWoodMaterial;
  const benchMetalMaterial = cityWallTrimMaterial;
  const addBench = (x, z) => {
    const bench = new THREE.Group();
    bench.position.set(x, 0, z);
    bench.rotation.y = Math.atan2(-x, -z);
    const seat = new THREE.Mesh(new THREE.BoxGeometry(2.15, 0.16, 0.62), benchMaterial);
    seat.position.y = 0.62;
    seat.castShadow = true;
    bench.add(seat);
    const back = new THREE.Mesh(new THREE.BoxGeometry(2.15, 0.66, 0.14), benchMaterial);
    back.position.set(0, 0.94, -0.28);
    back.rotation.x = -0.1;
    back.castShadow = true;
    bench.add(back);
    for (const xOffset of [-0.78, 0.78]) {
      for (const zOffset of [-0.2, 0.2]) {
        const leg = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.58, 0.12), benchMetalMaterial);
        leg.position.set(xOffset, 0.3, zOffset);
        leg.castShadow = true;
        bench.add(leg);
      }
    }
    root.add(bench);
  };

  for (const [x, z] of [
    [-11.45, -11.45],
    [11.45, -11.45],
    [11.45, 11.45],
    [-11.45, 11.45],
  ]) addBench(x, z);

  const flowerBlueMaterial = new THREE.MeshStandardMaterial({ color: 0x6faed0, roughness: 0.84 });
  const flowerGoldMaterial = new THREE.MeshStandardMaterial({ color: 0xe2b84d, roughness: 0.84 });
  const addPlanter = (x, z, phase) => {
    const planter = new THREE.Group();
    planter.position.set(x, 0, z);
    const pot = new THREE.Mesh(
      new THREE.CylinderGeometry(0.92, 1.08, 0.46, 8),
      townStoneDarkMaterial
    );
    pot.position.y = 0.23;
    pot.castShadow = true;
    pot.receiveShadow = true;
    planter.add(pot);
    const soil = new THREE.Mesh(new THREE.CylinderGeometry(0.82, 0.82, 0.06, 12), townSoilMaterial);
    soil.position.y = 0.48;
    planter.add(soil);
    for (let index = 0; index < 5; index += 1) {
      const angle = phase + (index / 5) * Math.PI * 2;
      const shrub = new THREE.Mesh(
        new THREE.IcosahedronGeometry(0.34 + (index % 2) * 0.08, 0),
        townPlantMaterial
      );
      shrub.position.set(Math.cos(angle) * 0.45, 0.73, Math.sin(angle) * 0.45);
      shrub.castShadow = true;
      planter.add(shrub);
      const flower = new THREE.Mesh(
        new THREE.SphereGeometry(0.08, 7, 5),
        index % 2 ? flowerBlueMaterial : flowerGoldMaterial
      );
      flower.position.set(shrub.position.x, 1.02 + (index % 2) * 0.05, shrub.position.z);
      planter.add(flower);
    }
    root.add(planter);
  };

  addPlanter(-14.2, -14.2, 0.1);
  addPlanter(14.2, -14.2, 0.8);
  addPlanter(14.2, 14.2, 1.6);
  addPlanter(-14.2, 14.2, 2.3);

  const addSignpost = (x, z, rotation) => {
    const signpost = new THREE.Group();
    signpost.position.set(x, 0, z);
    signpost.rotation.y = rotation;
    const post = new THREE.Mesh(
      new THREE.CylinderGeometry(0.07, 0.1, 1.85, 7),
      cityGateWoodMaterial
    );
    post.position.y = 0.92;
    post.castShadow = true;
    signpost.add(post);
    for (const [y, direction] of [[1.5, 1], [1.18, -1]]) {
      const board = new THREE.Mesh(new THREE.BoxGeometry(1.28, 0.28, 0.12), cityGateWoodMaterial);
      board.position.set(direction * 0.48, y, 0);
      board.castShadow = true;
      signpost.add(board);
      const tip = new THREE.Mesh(new THREE.ConeGeometry(0.19, 0.42, 3), cityGateWoodMaterial);
      tip.position.set(direction * 1.17, y, 0);
      tip.rotation.z = direction > 0 ? -Math.PI / 2 : Math.PI / 2;
      signpost.add(tip);
    }
    root.add(signpost);
  };

  addSignpost(4.35, -31.4, 0);
  addSignpost(31.4, 4.35, Math.PI / 2);
  addSignpost(-4.35, 31.4, Math.PI);
  addSignpost(-31.4, -4.35, -Math.PI / 2);

  return root;
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
    if (
      isInsideWalledCity(x, z) ||
      isInsideCityWallStructure(x, z) ||
      isInsideBuildPlotClearing(x, z) ||
      isInsideCityStreet(x, z)
    ) continue;
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
    if (
      isInsideWalledCity(x, z) ||
      isInsideCityWallStructure(x, z) ||
      isInsideBuildPlotClearing(x, z) ||
      isInsideCityStreet(x, z)
    ) continue;
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
let cityNpcSystem = null;
let monsterSystem = null;
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
const dayCityPaverColor = new THREE.Color(0xb7ab92);
const nightCityPaverColor = new THREE.Color(0x555159);
const dayCityWallColor = new THREE.Color(0x9b927f);
const nightCityWallColor = new THREE.Color(0x41434a);
const dayCityWallTrimColor = new THREE.Color(0x6f6b63);
const nightCityWallTrimColor = new THREE.Color(0x2f3338);
const dayCityWallRoofColor = new THREE.Color(0x334756);
const nightCityWallRoofColor = new THREE.Color(0x182331);
const dayCityWallMortarColor = new THREE.Color(0x55534f);
const nightCityWallMortarColor = new THREE.Color(0x25282c);
const dayCityWallWalkColor = new THREE.Color(0x746e63);
const nightCityWallWalkColor = new THREE.Color(0x34363b);

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
  worldLabel.textContent = nightActive ? "夜晚 · 怪物狂暴" : "白昼 · 伐木进行";
  monsterSystem?.setNightMode(nightActive);

  if (announce) {
    showThreat(nightActive ? "夜幕降临 · 城外骷髅开始狂暴" : "晨光降临 · 伐木场恢复生产");
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
  cityPaverMaterial.color.lerpColors(dayCityPaverColor, nightCityPaverColor, nightFactor);
  cityWallMaterial.color.lerpColors(dayCityWallColor, nightCityWallColor, nightFactor);
  cityWallTrimMaterial.color.lerpColors(dayCityWallTrimColor, nightCityWallTrimColor, nightFactor);
  cityWallRoofMaterial.color.lerpColors(dayCityWallRoofColor, nightCityWallRoofColor, nightFactor);
  cityWallMortarMaterial.color.lerpColors(dayCityWallMortarColor, nightCityWallMortarColor, nightFactor);
  cityWallWalkMaterial.color.lerpColors(dayCityWallWalkColor, nightCityWallWalkColor, nightFactor);
  cityLampGlassMaterial.emissiveIntensity = 0.18 + nightFactor * 4.5;
  for (const light of cityStreetLights) light.intensity = 0.1 + nightFactor * 7.5;
  for (const light of cityGateLights) light.intensity = 0.1 + nightFactor * 9.5;
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

function updateCityWallDetails(time) {
  for (const flag of cityWallFlags) {
    const wave = Math.sin(time * 0.0022 + flag.userData.flagPhase);
    flag.rotation.y = wave * 0.12;
    flag.scale.x = 1 + wave * 0.055;
  }
}

async function loadWorld() {
  loadingText.textContent = "正在唤醒真正的森林";
  const [
    loadedKnight,
    forestTemplates,
    loadedTownCenter,
    loadedBuildSystem,
    loadedCityDetails,
    loadedCityNpcAssets,
    loadedMonsterAssets,
  ] = await Promise.all([
    createKnightRig(),
    loadForestTemplates(),
    createTownCenter(),
    createBuildSystem(),
    createCityDetails(),
    loadCityNpcAssets(),
    loadMonsterAssets(),
  ]);
  knight = loadedKnight;
  townCenter = loadedTownCenter;
  buildSystem = loadedBuildSystem;
  cityNpcSystem = createCityNpcSystem(
    loadedKnight.npcTemplate,
    loadedKnight.npcClips,
    loadedCityNpcAssets,
    (amount) => resourceSystem.addWood(amount),
    forestTemplates
  );
  monsterSystem = createMonsterSystem(
    loadedMonsterAssets,
    loadedKnight.npcClips,
    (amount) => resourceSystem.addGold(amount)
  );
  scene.add(knight.root);
  scene.add(townCenter.root);
  scene.add(buildSystem.root);
  scene.add(cityNpcSystem.root);
  scene.add(monsterSystem.root);
  scene.add(loadedCityDetails);
  cityNpcSystem.sync(buildSystem.plots);
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

function requestPlayerAttack() {
  if (!knight) return;
  knight.requestAttack();
  monsterSystem?.playerAttack(knight.root);
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
    requestPlayerAttack();
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
  if (event.pointerType === "mouse") requestPlayerAttack();
});
attackButton.addEventListener("pointerdown", (event) => {
  event.preventDefault();
  requestPlayerAttack();
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

function resolveCityWallCollision(position, padding = 0) {
  const collisionBand = cityWallThickness / 2 + padding;
  const gatePassageHalf = Math.max(1.8, cityGateOpeningHalf - padding);
  const wallReach = cityWallHalfExtent + 2.8;
  let collided = false;

  if (
    Math.abs(Math.abs(position.x) - cityWallHalfExtent) < collisionBand &&
    Math.abs(position.z) < wallReach &&
    Math.abs(position.z) > gatePassageHalf
  ) {
    const side = Math.sign(position.x) || 1;
    const edge = Math.abs(position.x) < cityWallHalfExtent
      ? cityWallHalfExtent - collisionBand
      : cityWallHalfExtent + collisionBand;
    position.x = side * edge;
    collided = true;
  }

  if (
    Math.abs(Math.abs(position.z) - cityWallHalfExtent) < collisionBand &&
    Math.abs(position.x) < wallReach &&
    Math.abs(position.x) > gatePassageHalf
  ) {
    const side = Math.sign(position.z) || 1;
    const edge = Math.abs(position.z) < cityWallHalfExtent
      ? cityWallHalfExtent - collisionBand
      : cityWallHalfExtent + collisionBand;
    position.z = side * edge;
    collided = true;
  }

  for (const x of [-36.7, 36.7]) {
    for (const z of [-36.7, 36.7]) {
      const offsetX = position.x - x;
      const offsetZ = position.z - z;
      const distance = Math.hypot(offsetX, offsetZ);
      const minimumDistance = 2.45 + padding;
      if (distance >= minimumDistance) continue;
      if (distance < 0.001) {
        position.x = x + minimumDistance;
      } else {
        const scale = minimumDistance / distance;
        position.x = x + offsetX * scale;
        position.z = z + offsetZ * scale;
      }
      collided = true;
    }
  }
  return collided;
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
  updateCityWallDetails(time);
  townCenter?.update(delta, time);
  cityNpcSystem?.update(delta, nightActive);
  monsterSystem?.update(delta, time);

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
    const hitCityWall = resolveCityWallCollision(knight.root.position, 0.72);
    if (hitTownCenter || hitBuiltPlot || hitCityWall) velocity.multiplyScalar(0.2);
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
