// The site's 3D backdrop: one pool of cubes that rebuilds itself into a different game sprite for each
// chapter of the page, plus drifting pixel crosses behind it. Scroll sets the chapter; tapping the cubes heals,
// dragging spins the sprite, and the cubes under the cursor lean out to meet it.
import * as THREE from "three";

import { audioLevel } from "./audioLevel";
import { SHAPE_SIZE, type VoxelSet } from "./voxels";

/** Where the sprite sits for a chapter. x and y are fractions of the visible width/height from the centre; size is a fraction of the visible height. */
export type Pose = { x: number; y: number; size: number; turn: number };

/** On phones the sprite rides in a gap above each card: its centre in screen pixels and its height as a fraction of the screen. */
export type Anchor = { y: number; size: number };

type Theme = { crosses: string[] };

const THEMES: Record<"light" | "dark", Theme> = {
  light: { crosses: ["#ffc0cb", "#ffffff", "#f6b8c4", "#ffffff", "#ef8a9a"] },
  dark: { crosses: ["#24475a", "#1d3a4a", "#2c5568", "#1d3a4a", "#6b2733"] },
};

/** Colours for the celebration burst: the game's red, pink, cream, green and coin gold. */
const CONFETTI = ["#dd1122", "#ffc0cb", "#fafdf3", "#4edb4e", "#fbbb21"];

// Brightness of each cube face (+x, -x, +y, -y, +z, -z): the front keeps the sprite's own colour.
const FACE_SHADE = [0.42, 0.62, 0.8, 0.3, 1, 0.45];
const MAX_DELAY = 0.45;
/** Cubes are drawn a little smaller than their cell, leaving grooves between them. */
const CUBE = 0.92;
const CROSSES = 20;
const CROSS_CELLS: [number, number][] = [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]];
const PARTICLES = 220;
/** How far (local units) the cursor's pull reaches, and how far cubes lean out. */
const HOVER_RADIUS = SHAPE_SIZE * 0.32;
const HOVER_LIFT = 2.2;
/** Every few seconds a band of light sweeps across the sprite, like a glint on plastic. */
const SHEEN_EVERY = 5.5;
const SHEEN_TIME = 0.9;

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** Two quick bumps a second apart, like a heartbeat. */
const heartbeat = (time: number) => {
  const p = (time % 1.15) / 1.15;
  const bump = (c: number, w: number) => Math.max(0, 1 - Math.abs(p - c) / w);
  return bump(0.06, 0.06) + 0.6 * bump(0.24, 0.06);
};

function shadedBox() {
  const geo = new THREE.BoxGeometry(1, 1, 1);
  const shade = new Float32Array(geo.attributes.position.count * 3);
  for (let face = 0; face < 6; face++) {
    for (let v = 0; v < 4; v++) shade.fill(FACE_SHADE[face], (face * 4 + v) * 3, (face * 4 + v) * 3 + 3);
  }
  geo.setAttribute("color", new THREE.BufferAttribute(shade, 3));
  return geo;
}

export class VoxelStage {
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(30, 1, 1, 200);
  private pivot = new THREE.Group();
  private mesh: THREE.InstancedMesh;
  private crosses: THREE.InstancedMesh;
  private sparks: THREE.InstancedMesh;

  private sets: VoxelSet[];
  private linearColors: Float32Array[];
  private n: number;
  private delay: Float32Array;
  private burst: Float32Array;
  private spin: THREE.Vector3[];
  private ripple: Float32Array;
  private rippleStart = -10;

  private poses: { wide: Pose[]; narrow: Pose[] };
  private anchor: Anchor | null = null;
  private chapter = 0;
  private dirty = true;

  private time = 0;
  private last = performance.now();
  private frame = 0;
  private running = false;
  private pulseStart = -10;
  private pulseSize = 0.09;
  /** 0 to 1 while the first sprite assembles on page load. */
  private intro = 0;
  private pointer = new THREE.Vector2();
  private pointerSmooth = new THREE.Vector2();
  private finePointer = window.matchMedia("(pointer: fine)").matches;
  private scrollY = 0;
  private scrollVel = 0;
  private lean = 0;
  private crossData: { x: number; y: number; z: number; speed: number; phase: number; size: number; depth: number }[] = [];
  private viewH = 1;
  private viewW = 1;
  /** The canvas's size on screen in CSS pixels (phones change it as the address bar shows and hides). */
  private pxW = 1;
  private pxH = 1;
  private sizeWatch: ResizeObserver | null = null;
  private reducedMotion: boolean;
  private onTap?: (clientX: number, clientY: number) => void;

  // Drag to spin: the angle springs back to the chapter's pose once let go.
  private dragId: number | null = null;
  private dragX = 0;
  private spinAngle = 0;
  private spinVel = 0;
  private combo = 0;
  private lastTap = -10;

  // The cursor's spot on the sprite, in the sprite's own units, and how strongly cubes lean toward it.
  private hoverPoint = new THREE.Vector2(999, 999);
  private hoverAmount = 0;
  private hoverTarget = 0;

  // Small cubes thrown off by taps and celebrations.
  private sparkPos = new Float32Array(PARTICLES * 3);
  private sparkVel = new Float32Array(PARTICLES * 3);
  private sparkLife = new Float32Array(PARTICLES);
  private sparkMax = new Float32Array(PARTICLES);
  private sparkSize = new Float32Array(PARTICLES);
  private sparkAxis: THREE.Vector3[] = [];
  private nextSpark = 0;
  private sparksAlive = false;

  private m4 = new THREE.Matrix4();
  private m4b = new THREE.Matrix4();
  private q = new THREE.Quaternion();
  private v = new THREE.Vector3();
  private s = new THREE.Vector3();
  private euler = new THREE.Euler();
  private color = new THREE.Color();
  private raycaster = new THREE.Raycaster();
  private ray = new THREE.Ray();
  private inverse = new THREE.Matrix4();
  private rand = mulberry32(7);

  constructor(
    private canvas: HTMLCanvasElement,
    sets: VoxelSet[],
    poses: { wide: Pose[]; narrow: Pose[] },
    opts: { reducedMotion: boolean; onTap?: (clientX: number, clientY: number) => void },
  ) {
    this.sets = sets;
    this.poses = poses;
    this.reducedMotion = opts.reducedMotion;
    this.onTap = opts.onTap;
    this.n = Math.max(...sets.map((s) => s.count));

    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: "high-performance" });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.camera.position.set(0, 0, 44);

    // Colours arrive as sRGB from the sprites; the renderer works in linear.
    this.linearColors = sets.map((s) => s.colors.map(srgbToLinear));

    const material = new THREE.MeshBasicMaterial({ vertexColors: true });
    this.mesh = new THREE.InstancedMesh(shadedBox(), material, this.n);
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.mesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(this.n * 3), 3);
    this.mesh.instanceColor.setUsage(THREE.DynamicDrawUsage);
    this.mesh.frustumCulled = false;

    // A dark core behind each cube's front fills the grooves, so the background never shows through them.
    const core = new THREE.InstancedMesh(new THREE.BoxGeometry(1 / CUBE, 1 / CUBE, 0.4), new THREE.MeshBasicMaterial({ color: "#3a3a3a" }), this.n);
    core.instanceMatrix = this.mesh.instanceMatrix;
    core.instanceColor = this.mesh.instanceColor;
    core.frustumCulled = false;

    this.pivot.add(this.mesh, core);
    this.scene.add(this.pivot);

    // Per-cube randomness for the rebuild: when it leaves, which way it flies, how it tumbles.
    const rand = this.rand;
    this.delay = new Float32Array(this.n);
    this.burst = new Float32Array(this.n * 3);
    this.spin = [];
    this.ripple = new Float32Array(this.n * 3);
    for (let i = 0; i < this.n; i++) {
      this.delay[i] = rand() * MAX_DELAY;
      const dir = new THREE.Vector3(rand() * 2 - 1, rand() * 2 - 1, rand() * 1.4 + 0.2).normalize();
      dir.multiplyScalar(2 + rand() * 5);
      dir.toArray(this.burst, i * 3);
      this.spin.push(new THREE.Vector3(rand() - 0.5, rand() - 0.5, rand() - 0.5).normalize());
    }

    this.crosses = new THREE.InstancedMesh(shadedBox(), new THREE.MeshBasicMaterial({ vertexColors: true }), CROSSES * CROSS_CELLS.length);
    this.crosses.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(CROSSES * CROSS_CELLS.length * 3), 3);
    this.crosses.frustumCulled = false;
    for (let i = 0; i < CROSSES; i++) {
      const z = -30 - rand() * 50;
      this.crossData.push({ x: rand() * 2 - 1, y: rand() * 2 - 1, z, speed: 0.15 + rand() * 0.35, phase: rand() * Math.PI * 2, size: 0.3 + rand() * 0.35, depth: (this.camera.position.z - z) / this.camera.position.z });
    }
    this.scene.add(this.crosses);

    this.sparks = new THREE.InstancedMesh(shadedBox(), new THREE.MeshBasicMaterial({ vertexColors: true }), PARTICLES);
    this.sparks.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.sparks.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(PARTICLES * 3), 3);
    this.sparks.frustumCulled = false;
    for (let i = 0; i < PARTICLES; i++) {
      this.sparkAxis.push(new THREE.Vector3(rand() - 0.5, rand() - 0.5, rand() - 0.5).normalize());
      this.sparks.setMatrixAt(i, this.m4.makeScale(0, 0, 0));
    }
    this.scene.add(this.sparks);

    this.setTheme(document.documentElement.dataset.theme === "dark" ? "dark" : "light");
    this.resize();
    canvas.addEventListener("pointerdown", this.handlePointerDown);
    window.addEventListener("pointermove", this.handlePointerMove, { passive: true });
    window.addEventListener("pointerup", this.handlePointerUp);
    window.addEventListener("pointercancel", this.handlePointerUp);
    window.addEventListener("resize", this.resize);
    // The canvas resizes without a window resize when a phone's address bar slides in or out.
    if ("ResizeObserver" in window) {
      this.sizeWatch = new ResizeObserver(this.resize);
      this.sizeWatch.observe(canvas);
    }
    document.addEventListener("visibilitychange", this.handleVisibility);
    this.start();
  }

  /** Chapter as a float: 2.4 means 40% of the way from chapter 2 to chapter 3. */
  setChapter(chapter: number) {
    const c = Math.max(0, Math.min(this.sets.length - 1, chapter));
    if (c === this.chapter) return;
    this.chapter = c;
    this.dirty = true;
  }

  /** Phones: pin the sprite to a spot on screen instead of the chapter's pose. Null goes back to poses. */
  setAnchor(anchor: Anchor | null) {
    this.anchor = anchor;
  }

  setScroll(y: number) {
    // Scroll speed tilts the sprite a little, as if it had weight.
    this.scrollVel += y - this.scrollY;
    this.scrollY = y;
  }

  setTheme(name: "light" | "dark") {
    const theme = THEMES[name];
    for (let i = 0; i < CROSSES; i++) {
      this.color.set(theme.crosses[i % theme.crosses.length]);
      for (let k = 0; k < CROSS_CELLS.length; k++) this.crosses.setColorAt(i * CROSS_CELLS.length + k, this.color);
    }
    this.crosses.instanceColor!.needsUpdate = true;
    this.dirty = true;
  }

  setReducedMotion(reduced: boolean) {
    this.reducedMotion = reduced;
    this.dirty = true;
  }

  /** Pulse and ripple from a point on the sprite, as if it was tapped there. Quick taps build a combo that hits harder. */
  tap(localHit?: THREE.Vector3, color?: THREE.Color) {
    this.combo = this.time - this.lastTap < 0.6 ? Math.min(this.combo + 1, 20) : 0;
    this.lastTap = this.time;
    this.pulseStart = this.time;
    this.pulseSize = 0.08 + Math.min(this.combo, 10) * 0.006;
    const hit = localHit ?? new THREE.Vector3(0, 0, SHAPE_SIZE / 2);
    const pos = this.mesh.instanceMatrix.array;
    for (let i = 0; i < this.n; i++) {
      const dx = pos[i * 16 + 12] - hit.x;
      const dy = pos[i * 16 + 13] - hit.y;
      const d = Math.hypot(dx, dy) || 1;
      const fall = Math.max(0, 1 - d / (SHAPE_SIZE * 0.75));
      this.ripple[i * 3] = (dx / d) * fall * 0.9;
      this.ripple[i * 3 + 1] = (dy / d) * fall * 0.9;
      this.ripple[i * 3 + 2] = fall * 2.2;
    }
    this.rippleStart = this.time;
    this.dirty = true;

    if (this.reducedMotion) return;
    // Throw a few cubes off the spot that was hit, in its own colour (plus a red or white one for the plus sign).
    const world = this.pivot.localToWorld(hit.clone());
    const count = 6 + Math.min(this.combo, 10);
    const base = color ? color.clone() : new THREE.Color("#dd1122");
    const red = new THREE.Color("#dd1122");
    const white = new THREE.Color("#ffffff");
    for (let k = 0; k < count; k++) {
      this.spawnSpark(world, k % 4 === 3 ? (k % 8 === 3 ? white : red) : base, 9 + this.combo * 0.4, 0.9);
    }
  }

  /** A burst of confetti cubes and a full spin, for milestones. */
  celebrate() {
    this.pulseStart = this.time;
    this.pulseSize = 0.2;
    if (this.reducedMotion) return;
    this.spinVel += 14;
    // Burst from just in front of the sprite so none of it starts hidden inside.
    const front = this.pivot.position.clone().add(new THREE.Vector3(0, 0, SHAPE_SIZE * 0.4 * this.pivot.scale.x));
    for (let k = 0; k < 120; k++) {
      this.spawnSpark(front, this.color.set(CONFETTI[k % CONFETTI.length]), 16 + this.rand() * 10, 1.3 + this.rand() * 0.8);
    }
  }

  dispose() {
    cancelAnimationFrame(this.frame);
    this.running = false;
    this.canvas.removeEventListener("pointerdown", this.handlePointerDown);
    window.removeEventListener("pointermove", this.handlePointerMove);
    window.removeEventListener("pointerup", this.handlePointerUp);
    window.removeEventListener("pointercancel", this.handlePointerUp);
    window.removeEventListener("resize", this.resize);
    this.sizeWatch?.disconnect();
    document.removeEventListener("visibilitychange", this.handleVisibility);
    this.renderer.dispose();
  }

  private spawnSpark(at: THREE.Vector3, color: THREE.Color, speed: number, life: number) {
    const i = this.nextSpark;
    this.nextSpark = (this.nextSpark + 1) % PARTICLES;
    const r = this.rand;
    // Sparks match the sprite's size, which is much smaller on phones.
    const k = this.sparkScale();
    const dir = this.v.set(r() * 2 - 1, r() * 1.6 - 0.3, r() * 1.2 + 0.2).normalize().multiplyScalar(speed * k * (0.5 + r() * 0.5));
    this.sparkPos.set([at.x, at.y, at.z], i * 3);
    this.sparkVel.set([dir.x, dir.y, dir.z], i * 3);
    this.sparkLife[i] = life;
    this.sparkMax[i] = life;
    this.sparkSize[i] = (0.35 + r() * 0.45) * k;
    this.sparks.setColorAt(i, color);
    this.sparks.instanceColor!.needsUpdate = true;
    this.sparksAlive = true;
  }

  /** 1 for a full-size sprite on a wide screen. */
  private sparkScale() {
    return this.pivot.scale.x / 1.3;
  }

  private start() {
    if (this.running) return;
    this.running = true;
    this.last = performance.now();
    const loop = () => {
      if (!this.running) return;
      this.frame = requestAnimationFrame(loop);
      const now = performance.now();
      const dt = Math.min(0.05, (now - this.last) / 1000);
      this.last = now;
      this.time += dt;
      this.update(dt);
    };
    this.frame = requestAnimationFrame(loop);
  }

  private handleVisibility = () => {
    if (document.hidden) {
      this.running = false;
      cancelAnimationFrame(this.frame);
    } else this.start();
  };

  private resize = () => {
    // The canvas's own size, not the window's: on phones they differ while the address bar shows,
    // which stretched the picture and left the medkit outside its spot until the bar moved again.
    const w = this.canvas.clientWidth || window.innerWidth;
    const h = this.canvas.clientHeight || window.innerHeight;
    if (w === this.pxW && h === this.pxH) return;
    this.pxW = w;
    this.pxH = h;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.viewH = 2 * this.camera.position.z * Math.tan(THREE.MathUtils.degToRad(this.camera.fov / 2));
    this.viewW = this.viewH * this.camera.aspect;
    this.dirty = true;
  };

  private toNdc(e: PointerEvent) {
    return new THREE.Vector2((e.clientX / this.pxW) * 2 - 1, -(e.clientY / this.pxH) * 2 + 1);
  }

  private handlePointerMove = (e: PointerEvent) => {
    this.pointer.copy(this.toNdc(e));
    if (this.dragId === e.pointerId) {
      const dx = e.clientX - this.dragX;
      this.dragX = e.clientX;
      this.spinAngle += dx * 0.012;
      this.spinVel = dx * 0.012 * 60;
    }
    if (e.pointerType === "mouse" && this.finePointer) this.trackHover();
  };

  /** Where a screen point crosses the sprite's middle plane, in the sprite's own units. */
  private localPoint(ndc: THREE.Vector2) {
    this.raycaster.setFromCamera(ndc, this.camera);
    this.inverse.copy(this.pivot.matrixWorld).invert();
    this.ray.copy(this.raycaster.ray).applyMatrix4(this.inverse);
    const t = this.ray.direction.z !== 0 ? -this.ray.origin.z / this.ray.direction.z : -1;
    if (t <= 0) return null;
    return new THREE.Vector2(this.ray.origin.x + this.ray.direction.x * t, this.ray.origin.y + this.ray.direction.y * t);
  }

  /**
   * The cube of the current sprite under a screen point, tested against the sprite at rest so taps still land
   * while a ripple or the cursor has pushed cubes out of place.
   */
  private cubeAt(ndc: THREE.Vector2) {
    const p = this.localPoint(ndc);
    if (!p) return null;
    const k = Math.round(this.chapter);
    const set = this.sets[k];
    const reach = set.unit * 0.75;
    for (let j = 0; j < set.count; j++) {
      if (Math.abs(set.positions[j * 3] - p.x) < reach && Math.abs(set.positions[j * 3 + 1] - p.y) < reach) {
        const c = this.linearColors[k];
        return { point: new THREE.Vector3(p.x, p.y, SHAPE_SIZE * 0.15), color: new THREE.Color(c[j * 3], c[j * 3 + 1], c[j * 3 + 2]) };
      }
    }
    return null;
  }

  private trackHover() {
    const p = this.localPoint(this.pointer);
    const inside = !!p && Math.abs(p.x) < SHAPE_SIZE * 0.6 && Math.abs(p.y) < SHAPE_SIZE * 0.6;
    if (p) this.hoverPoint.copy(p);
    this.hoverTarget = inside ? 1 : 0;
    this.canvas.style.cursor = inside && this.cubeAt(this.pointer) ? "pointer" : "";
  }

  private handlePointerDown = (e: PointerEvent) => {
    // Mid-rebuild there is no sprite to hit.
    if (Math.abs(this.chapter - Math.round(this.chapter)) > 0.02) return;
    const hit = this.cubeAt(this.toNdc(e));
    if (!hit) return;
    // Dragging sideways from here spins the sprite; the tap itself counts straight away, like in the game.
    this.dragId = e.pointerId;
    this.dragX = e.clientX;
    this.tap(hit.point, hit.color);
    this.onTap?.(e.clientX, e.clientY);
  };

  private handlePointerUp = (e: PointerEvent) => {
    if (this.dragId === e.pointerId) this.dragId = null;
  };

  private update(dt: number) {
    const narrow = this.viewW / this.viewH < 0.9;
    const poses = narrow ? this.poses.narrow : this.poses.wide;
    const a = Math.floor(this.chapter);
    const b = Math.min(a + 1, this.sets.length - 1);
    let m = this.chapter - a;
    if (this.reducedMotion) m = m < 0.5 ? 0 : 1;
    const still = this.reducedMotion;

    // Place the sprite for this point between two chapters.
    const e = easeInOut(m);
    const pa = poses[a];
    const pb = poses[b];
    const anchor = narrow ? this.anchor : null;
    const size = (anchor ? anchor.size : lerp(pa.size, pb.size, e)) * this.viewH;
    const beat = still ? 0 : heartbeat(this.time) * 0.025;
    const pulseT = this.time - this.pulseStart;
    const pulse = pulseT < 0.35 ? Math.sin((pulseT / 0.35) * Math.PI) * this.pulseSize : 0;
    // While the soundtrack plays, the sprite also pulses with the music.
    const music = still ? 0 : audioLevel.value * 0.08;
    const scale = (size / SHAPE_SIZE) * (1 + beat + pulse + music);
    const sway = still ? 0 : Math.sin(this.time * 0.6) * 0.28;
    const bob = still ? 0 : Math.sin(this.time * 1.1) * 0.012 * this.viewH;

    // Spin from dragging carries on, then springs back to the pose.
    if (this.dragId === null) {
      this.spinVel += -this.spinAngle * 9 * dt;
      this.spinVel *= Math.exp(-2.2 * dt);
      this.spinAngle += this.spinVel * dt;
    }
    this.pointerSmooth.lerp(this.pointer, 1 - Math.exp(-6 * dt));
    this.lean = lerp(this.lean, Math.max(-0.4, Math.min(0.4, this.scrollVel * 0.004)), 1 - Math.exp(-8 * dt));
    this.scrollVel *= Math.exp(-10 * dt);

    const x = anchor ? 0 : lerp(pa.x, pb.x, e) * this.viewW;
    const y = anchor ? (0.5 - anchor.y / this.pxH) * this.viewH : lerp(pa.y, pb.y, e) * this.viewH;
    this.pivot.position.set(x, y + bob, 0);
    this.pivot.rotation.set(
      (still ? 0 : -this.pointerSmooth.y * 0.12 + this.lean) + 0.06,
      lerp(pa.turn, pb.turn, e) + sway + (still ? 0 : this.pointerSmooth.x * 0.25) + this.spinAngle,
      0,
    );
    this.pivot.scale.setScalar(scale);
    this.pivot.updateMatrixWorld();

    this.hoverAmount = lerp(this.hoverAmount, still ? 0 : this.hoverTarget, 1 - Math.exp(-7 * dt));
    const hovering = this.hoverAmount > 0.002;
    const rippleT = this.time - this.rippleStart;
    const rippling = rippleT < 0.6;
    const moving = m > 0 && m < 1;
    const assembling = this.intro < 1;
    if (assembling) this.intro = still ? 1 : clamp01((this.time - 0.15) / 1.8);
    const sheenT = this.time % SHEEN_EVERY;
    const sheening = !still && this.intro >= 1 && sheenT < SHEEN_TIME + 0.05;
    if (this.dirty || moving || rippling || assembling || hovering || sheening) {
      this.writeCubes(a, b, m, rippling ? Math.sin((rippleT / 0.6) * Math.PI) * (1 - rippleT / 0.6) : 0);
      this.dirty = rippling;
    }

    if (this.sparksAlive) this.writeSparks(dt);
    if (!still || this.dirty) this.writeCrosses();
    this.renderer.render(this.scene, this.camera);
  }

  private writeCubes(a: number, b: number, m: number, rippleAmount: number) {
    const A = this.sets[a];
    const B = this.sets[b];
    const colA = this.linearColors[a];
    const colB = this.linearColors[b];
    const mat = this.mesh.instanceMatrix.array as Float32Array;
    const col = this.mesh.instanceColor!.array as Float32Array;
    const span = 1 - MAX_DELAY;
    const intro = this.intro;
    const hx = this.hoverPoint.x;
    const hy = this.hoverPoint.y;
    const lift = this.hoverAmount * HOVER_LIFT;
    const sheenT = this.time % SHEEN_EVERY;
    // Where the glint is, along the diagonal from bottom-left (-1.3) to top-right (1.3).
    const sheen = !this.reducedMotion && this.intro >= 1 && sheenT < SHEEN_TIME ? -1.3 + (sheenT / SHEEN_TIME) * 2.6 : null;

    for (let i = 0; i < this.n; i++) {
      // Every cube has a home in both sprites; smaller sprites share homes.
      const ja = Math.floor((i * A.count) / this.n) * 3;
      const jb = Math.floor((i * B.count) / this.n) * 3;
      const t = this.reducedMotion ? m : easeInOut(clamp01((m - this.delay[i]) / span));
      // On load, cubes fall in from a scattered cloud, each at its own moment.
      const settle = intro < 1 ? 1 - Math.pow(1 - clamp01((intro - this.delay[i]) / span), 3) : 1;
      const arc = Math.sin(t * Math.PI) + (1 - settle) * 3;
      const i3 = i * 3;

      const px = lerp(A.positions[ja], B.positions[jb], t);
      const py = lerp(A.positions[ja + 1], B.positions[jb + 1], t);
      let pz = lerp(A.positions[ja + 2], B.positions[jb + 2], t);
      if (lift > 0) {
        // Cubes near the cursor lean out toward it.
        const d = Math.hypot(px - hx, py - hy) / HOVER_RADIUS;
        if (d < 1) pz += (1 - d) * (1 - d) * lift;
      }
      this.v.set(
        px + this.burst[i3] * arc + this.ripple[i3] * rippleAmount,
        py + this.burst[i3 + 1] * arc + this.ripple[i3 + 1] * rippleAmount,
        pz + this.burst[i3 + 2] * arc + this.ripple[i3 + 2] * rippleAmount,
      );
      const unit = lerp(A.unit, B.unit, t) * (1 - 0.3 * Math.min(1, arc)) * CUBE * (0.2 + 0.8 * settle);
      this.s.setScalar(unit);
      this.q.setFromAxisAngle(this.spin[i], arc * 2.4);
      this.m4.compose(this.v, this.q, this.s).toArray(mat, i * 16);

      let r = lerp(colA[ja], colB[jb], t);
      let g = lerp(colA[ja + 1], colB[jb + 1], t);
      let bl = lerp(colA[ja + 2], colB[jb + 2], t);
      if (sheen !== null) {
        const glint = Math.max(0, 1 - Math.abs((px + py) / SHAPE_SIZE - sheen) / 0.12) * 0.55;
        r += (1 - r) * glint;
        g += (1 - g) * glint;
        bl += (1 - bl) * glint;
      }
      col[i3] = r;
      col[i3 + 1] = g;
      col[i3 + 2] = bl;
    }
    this.mesh.instanceMatrix.needsUpdate = true;
    this.mesh.instanceColor!.needsUpdate = true;
  }

  private writeSparks(dt: number) {
    let alive = false;
    const gravity = 38 * this.sparkScale();
    for (let i = 0; i < PARTICLES; i++) {
      if (this.sparkLife[i] <= 0) continue;
      this.sparkLife[i] -= dt;
      const i3 = i * 3;
      if (this.sparkLife[i] <= 0) {
        this.sparks.setMatrixAt(i, this.m4.makeScale(0, 0, 0));
        continue;
      }
      alive = true;
      this.sparkVel[i3 + 1] -= gravity * dt * 0.5;
      this.sparkVel[i3] *= Math.exp(-1.5 * dt);
      this.sparkVel[i3 + 2] *= Math.exp(-1.5 * dt);
      this.sparkPos[i3] += this.sparkVel[i3] * dt;
      this.sparkPos[i3 + 1] += this.sparkVel[i3 + 1] * dt;
      this.sparkPos[i3 + 2] += this.sparkVel[i3 + 2] * dt;
      const left = this.sparkLife[i] / this.sparkMax[i];
      this.v.fromArray(this.sparkPos, i3);
      this.q.setFromAxisAngle(this.sparkAxis[i], (1 - left) * 9);
      this.s.setScalar(this.sparkSize[i] * Math.min(1, left * 2.5));
      this.sparks.setMatrixAt(i, this.m4.compose(this.v, this.q, this.s));
    }
    this.sparks.instanceMatrix.needsUpdate = true;
    this.sparksAlive = alive;
  }

  private writeCrosses() {
    const still = this.reducedMotion;
    for (let i = 0; i < CROSSES; i++) {
      const c = this.crossData[i];
      const drift = still ? 0 : this.time * c.speed * 0.04;
      // Crosses rise slowly and scroll a little slower than the page, so they sit in the distance;
      // nearer ones shift more with the cursor.
      const y = wrap(c.y + drift + (this.scrollY / window.innerHeight) * 0.5, 1.15);
      const parallax = still ? 0 : 2.2 / c.depth;
      this.v.set(
        c.x * this.viewW * 0.5 * c.depth - this.pointerSmooth.x * parallax,
        y * this.viewH * 0.5 * c.depth - this.pointerSmooth.y * parallax,
        c.z,
      );
      this.q.setFromEuler(this.euler.set(0, still ? 0.5 : Math.sin(this.time * 0.4 + c.phase) * 0.9, c.phase));
      this.s.setScalar(c.size);
      this.m4.compose(this.v, this.q, this.s);
      for (let k = 0; k < CROSS_CELLS.length; k++) {
        const [cx, cy] = CROSS_CELLS[k];
        this.m4b.makeTranslation(cx, cy, 0).premultiply(this.m4);
        this.crosses.setMatrixAt(i * CROSS_CELLS.length + k, this.m4b);
      }
    }
    this.crosses.instanceMatrix.needsUpdate = true;
  }
}

const srgbToLinear = (c: number) => (c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));

/** Wraps v into [-limit, limit). */
const wrap = (v: number, limit: number) => ((((v + limit) % (2 * limit)) + 2 * limit) % (2 * limit)) - limit;

function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
