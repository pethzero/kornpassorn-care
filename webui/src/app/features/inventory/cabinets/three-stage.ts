import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

// พื้นฐานฉาก 3D ที่หน้าตู้/หน้าห้องใช้ร่วมกัน: renderer + แสง + กล้องหมุนได้ + loop + แยก "คลิก" ออกจาก "ลากหมุน"
// 1 หน่วย = 1 ซม. · แกน y = ขึ้นบน
export interface HoverInfo {
  title: string;
  lines: string[];
}

export abstract class ThreeStage {
  protected readonly renderer: THREE.WebGLRenderer;
  protected readonly scene = new THREE.Scene();
  protected readonly camera = new THREE.PerspectiveCamera(40, 1, 1, 8000);
  protected readonly controls: OrbitControls;
  protected readonly sun = new THREE.DirectionalLight('#ffffff', 1.4);
  private readonly raycaster = new THREE.Raycaster();
  private readonly pointer = new THREE.Vector2();
  private readonly resize: ResizeObserver;
  private readonly clock = new THREE.Clock();
  private readonly envMap: THREE.Texture;
  private frame = 0;
  private downAt: { x: number; y: number } | null = null;

  constructor(protected readonly host: HTMLElement) {
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.NeutralToneMapping;
    host.appendChild(this.renderer.domElement);

    // แสงสะท้อนรอบตัว — ไม่มีแล้วผิวโลหะ (สเตนเลส) จะดูเทาทึบ
    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.envMap = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    pmrem.dispose();
    this.scene.environment = this.envMap;
    this.scene.environmentIntensity = 0.9;

    this.scene.add(new THREE.HemisphereLight('#ffffff', '#cbd5e1', 0.8));
    this.sun.position.set(120, 260, 220);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(1024, 1024);
    this.fitShadow(200, 250);
    this.scene.add(this.sun);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.maxPolarAngle = Math.PI / 2 - 0.05;

    const el = this.renderer.domElement;
    el.addEventListener('pointerdown', this.onDown);
    el.addEventListener('pointerup', this.onUp);
    el.addEventListener('pointermove', this.onMove);
    el.addEventListener('pointerleave', this.onLeave);
    el.addEventListener('dblclick', this.onDbl);

    this.resize = new ResizeObserver(() => this.fit());
    this.resize.observe(host);
    this.fit();
    // เฟรมแรกรอให้ constructor ของคลาสลูกทำงานเสร็จก่อน (ฟิลด์ของลูกยังไม่ถูกสร้างตอนนี้)
    this.frame = requestAnimationFrame(this.loop);
  }

  dispose(): void {
    cancelAnimationFrame(this.frame);
    this.resize.disconnect();
    const el = this.renderer.domElement;
    el.removeEventListener('pointerdown', this.onDown);
    el.removeEventListener('pointerup', this.onUp);
    el.removeEventListener('pointermove', this.onMove);
    el.removeEventListener('pointerleave', this.onLeave);
    el.removeEventListener('dblclick', this.onDbl);
    this.controls.dispose();
    disposeTree(this.scene);
    this.envMap.dispose();
    this.renderer.dispose();
    el.remove();
  }

  // ----- ให้คลาสลูกเติม -----

  protected tick(_dt: number): void {}
  protected abstract click(e: PointerEvent): void;
  protected abstract hoverAt(e: PointerEvent): void;
  protected leave(): void {}
  protected dblclick(_e: MouseEvent): void {}

  // ----- ตัวช่วย -----

  // วัตถุชิ้นแรกที่เมาส์ชี้ (เฉพาะใน objects) → userData.pick
  protected pickAt<T>(e: MouseEvent, objects: THREE.Object3D[]): T | null {
    const r = this.renderer.domElement.getBoundingClientRect();
    this.pointer.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    this.raycaster.setFromCamera(this.pointer, this.camera);
    const first = this.raycaster.intersectObjects(objects, false)[0];
    return (first?.object.userData['pick'] as T) ?? null;
  }

  // ตำแหน่งเมาส์เทียบกับกรอบ canvas (วาง tooltip)
  protected local(e: MouseEvent): { x: number; y: number } {
    const r = this.renderer.domElement.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }

  protected setCursor(pointer: boolean): void {
    this.renderer.domElement.style.cursor = pointer ? 'pointer' : 'grab';
  }

  // ขยายพื้นที่เงาตามขนาดฉาก (ห้องใหญ่กว่าตู้เดี่ยวมาก)
  protected fitShadow(half: number, height: number): void {
    Object.assign(this.sun.shadow.camera, { left: -half, right: half, top: half, bottom: -half, near: 10, far: height * 4 + half * 2 });
    this.sun.shadow.camera.updateProjectionMatrix();
  }

  private fit(): void {
    const w = this.host.clientWidth || 1;
    const h = this.host.clientHeight || 1;
    this.renderer.setSize(w, h, false);
    this.renderer.domElement.style.width = '100%';
    this.renderer.domElement.style.height = '100%';
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  private loop = (): void => {
    this.frame = requestAnimationFrame(this.loop);
    this.tick(Math.min(0.05, this.clock.getDelta()));
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  };

  private onDown = (e: PointerEvent) => (this.downAt = { x: e.clientX, y: e.clientY });

  // คลิกจริง (ไม่ใช่ลากหมุนกล้อง)
  private onUp = (e: PointerEvent) => {
    const d = this.downAt;
    this.downAt = null;
    if (d && Math.hypot(e.clientX - d.x, e.clientY - d.y) <= 5) this.click(e);
  };

  private onMove = (e: PointerEvent) => this.hoverAt(e);
  private onLeave = () => this.leave();
  private onDbl = (e: MouseEvent) => this.dblclick(e);
}

// ทิ้ง geometry/วัสดุ/texture ทั้งกิ่ง ยกเว้นวัสดุที่ใช้ร่วม (keep)
export function disposeTree(root: THREE.Object3D, keep: Set<THREE.Material> = new Set()): void {
  root.traverse((o) => {
    if (o instanceof THREE.Mesh || o instanceof THREE.LineSegments || o instanceof THREE.Sprite) {
      o.geometry.dispose();
      const mats = Array.isArray(o.material) ? o.material : [o.material];
      for (const m of mats) {
        if (keep.has(m)) continue;
        (m as THREE.MeshStandardMaterial).map?.dispose();
        m.dispose();
      }
    }
  });
}

export function ease(t: number): number {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}
