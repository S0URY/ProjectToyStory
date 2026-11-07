/**
 * environment.js - Kamar Mainan Anak (Toy Room Environment) untuk Pingo
 * Nuansa: kamar anak yang penuh mainan, dilihat dari "ukuran mainan" sehingga semuanya terasa besar.
 *
 * Isi lingkungan:
 * 1. Lantai papan kayu (balok-balok tipis dengan 3 warna kayu)
 * 2. Dinding pastel + list putih + stiker bulat warna-warni + jendela dengan cahaya matahari
 * 3. Karpet bundar bertingkat warna-warni (disk)
 * 4. Balok mainan bertumpuk (box)
 * 5. Bola mainan yang MEMANTUL (setengah ellipsoid + sabuk Hyperboloid of One Sheet)
 *    -> Translate naik-turun + Scaling squash saat menyentuh lantai
 * 6. Gasing yang BERPUTAR (Cone + ellipsoid + cylinder)
 *    -> Rotate Y (berputar) + Rotate Arbitrary Axis (oleng / presesi)
 * 7. Menara cincin susun (cylinder + ellipsoid)
 * 8. Krayon berserakan (cylinder + cone)
 * 9. Kasur, rak buku, dan peti mainan (box + ellipsoid)
 * 10. Gelembung sabun (bubbles.js) & berkas cahaya dari jendela (Cone transparan)
 *
 * SKALA REALISTIS: karakter adalah mainan, jadi kamar harus jauh lebih besar dari mereka.
 * Lantai, dinding, jendela, cahaya, kasur, rak buku & peti dimasukkan ke node "Room_Scale"
 * yang di-scale ROOM_SCALE kali (Hierarchical Transformation). Mainan kecil (balok, bola,
 * gasing, menara cincin, krayon) TIDAK ikut diperbesar, jadi tetap seukuran mainan.
 */

import { SceneNode } from '../core/scene-node.js';
import { Quadrics } from '../core/quadrics.js';
import { WebGLUtils } from '../core/webgl-utils.js';
import { BubbleSystem } from './bubbles.js';
import { Vec3, Mat4 } from '../core/math3d.js';

/**
 * Angka acak dengan SEED tetap: posisi mainan selalu sama setiap kali halaman dibuka.
 */
export class SeededRandom {
    constructor(seed = 2024) {
        this.seed = seed;
    }

    next() {
        this.seed |= 0;
        this.seed = (this.seed + 0x6D2B79F5) | 0;
        let t = Math.imul(this.seed ^ (this.seed >>> 15), 1 | this.seed);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    }

    range(a, b) {
        return a + (b - a) * this.next();
    }

    pick(list) {
        return list[Math.floor(this.next() * list.length)];
    }

    /** Titik acak di lantai, berjarak r0..r1 dari pusat kamar. */
    ringPosition(r0, r1) {
        const a = this.range(0, Math.PI * 2);
        const r = this.range(r0, r1);
        const x = Math.cos(a) * r;
        const z = Math.sin(a) * r;
        return [x, groundHeight(x, z), z];
    }
}

/** Lantai kamar rata di y = 0. */
export function groundHeight(x, z) {
    return 0.0;
}

// Ukuran kamar
const ROOM = 15.0;       // dinding di x = ±15 dan z = ±15
const WALL_H = 11.0;     // tinggi dinding
const ROOM_SCALE = 2.5;  // pembesaran kamar & furnitur (kasur besar, karakter terlihat seperti mainan)

// Palet warna mainan (warna primer cerah)
const TOY_COLORS = [
    [0.90, 0.22, 0.20],  // merah
    [0.20, 0.45, 0.85],  // biru
    [1.00, 0.80, 0.18],  // kuning
    [0.25, 0.70, 0.35],  // hijau
    [1.00, 0.55, 0.15],  // oranye
    [0.60, 0.35, 0.80]   // ungu
];

export class Environment {
    constructor(gl) {
        this.gl = gl;
        this.root = new SceneNode("ToyRoom_Root");
        this.random = new SeededRandom(2024);

        // Buffer bentuk dasar yang dipakai berulang (ukuran diatur lewat node.scale)
        this.buf = {
            box: WebGLUtils.createMeshBuffers(gl, Quadrics.createBox(1, 1, 1)),
            sphere: WebGLUtils.createMeshBuffers(gl, Quadrics.createEllipsoid(1, 1, 1, 24, 32)),
            halfTop: WebGLUtils.createMeshBuffers(gl, Quadrics.createEllipsoid(1, 1, 1, 16, 32, 0, Math.PI / 2)),
            halfBottom: WebGLUtils.createMeshBuffers(gl, Quadrics.createEllipsoid(1, 1, 1, 16, 32, -Math.PI / 2, 0)),
            cone: WebGLUtils.createMeshBuffers(gl, Quadrics.createCone(1, 1, 32)),
            cylinder: WebGLUtils.createMeshBuffers(gl, Quadrics.createCylinder(1, 1, 24, 4)),
            diskUp: WebGLUtils.createMeshBuffers(gl, Quadrics.createDisk(1, 1, 1, 48)),
            band: WebGLUtils.createMeshBuffers(gl, Quadrics.createHyperboloidOneSheet(1, 1, 1, 0.2, 6, 40))
        };

        this.buildFloor();
        this.buildWalls();
        this.buildWindow();
        this.buildRug();
        this.buildBlocks();
        this.buildBall();
        this.buildSpinningTop();
        this.buildRingStackers();
        this.buildCrayons();
        this.buildFurniture();

        // ===== Bangunan kamar & furnitur diperbesar ROOM_SCALE kali =====
        // Node induk "Room_Scale" di-scale, semua child-nya ikut membesar.
        // Lantai tetap di y = 0 karena scaling dilakukan terhadap titik asal (0, 0, 0).
        this.roomScale = new SceneNode("Room_Scale");
        this.roomScale.scale = Vec3.create(ROOM_SCALE, ROOM_SCALE, ROOM_SCALE);
        const bigParts = /^(Floor_|Wall_|WallDot_|Window_Group|SunRays_Group|SunPatch|Bed|Bookshelf|ToyChest)/;
        for (const node of this.root.children.slice()) {
            if (bigParts.test(node.name)) this.roomScale.addChild(node);
        }
        this.root.addChild(this.roomScale);

        // Gelembung sabun
        this.bubbles = new BubbleSystem(gl, this.random);
        this.root.addChild(this.bubbles.root);
    }

    /**
     * Helper: membuat node bermesh dengan posisi / rotasi / skala sekaligus.
     */
    makeNode(name, buffers, color, position, scale, rotation = [0, 0, 0], shininess = 30) {
        const node = new SceneNode(name);
        node.buffers = buffers;
        node.baseColor = [color[0], color[1], color[2], 1.0];
        node.shininess = shininess;
        node.position = Vec3.create(...position);
        node.scale = Vec3.create(...scale);
        node.rotation = Vec3.create(...rotation);
        return node;
    }

    /**
     * Helper: gabungkan banyak mesh jadi satu node (lebih cepat untuk benda diam yang banyak).
     */
    addMergedNode(name, meshList, color, shininess) {
        const node = new SceneNode(name);
        node.buffers = WebGLUtils.createMeshBuffers(this.gl, Quadrics.merge(meshList));
        node.baseColor = [color[0], color[1], color[2], 1.0];
        node.shininess = shininess;
        this.root.addChild(node);
        return node;
    }

    // =========================================================================
    // 1. LANTAI PAPAN KAYU
    // =========================================================================
    buildFloor() {
        const woodTones = [[], [], []];
        const plankWidth = 1.0;
        const gap = 0.03;

        for (let z = -ROOM; z < ROOM; z += plankWidth) {
            // Setiap baris papan dipotong di posisi berbeda supaya sambungannya selang-seling
            const cut = this.random.range(-ROOM + 3, ROOM - 3);
            const pieces = [[-ROOM, cut], [cut, ROOM]];
            for (const [x0, x1] of pieces) {
                const plank = Quadrics.createBox(x1 - x0 - gap, 0.1, plankWidth - gap);
                woodTones[Math.floor(this.random.next() * 3)].push(
                    Quadrics.translate(plank, [(x0 + x1) / 2, -0.05, z + plankWidth / 2])
                );
            }
        }

        // Alas gelap di bawah papan supaya celah antar papan terlihat
        this.root.addChild(this.makeNode("Floor_Gap", this.buf.box, [0.30, 0.18, 0.10],
            [0, -0.15, 0], [ROOM * 2, 0.1, ROOM * 2], [0, 0, 0], 4));

        this.addMergedNode("Floor_Wood_A", woodTones[0], [0.76, 0.54, 0.33], 24);
        this.addMergedNode("Floor_Wood_B", woodTones[1], [0.70, 0.48, 0.28], 24);
        this.addMergedNode("Floor_Wood_C", woodTones[2], [0.80, 0.60, 0.38], 24);
    }

    // =========================================================================
    // 2. DINDING + LIST PUTIH + STIKER BULAT
    // =========================================================================
    buildWalls() {
        // Dinding dibuat UNLIT (warna cat rata) supaya tetap cerah walau cahaya dari atas.
        // Dinding samping sedikit lebih gelap supaya sudut kamar tetap terlihat.
        const wallColors = {
            Wall_Back: [0.66, 0.83, 0.95], Wall_Front: [0.66, 0.83, 0.95],
            Wall_Left: [0.58, 0.76, 0.90], Wall_Right: [0.58, 0.76, 0.90]
        };
        const trimColor = [0.98, 0.97, 0.94];   // putih
        const t = 0.3;                           // tebal dinding

        const walls = [
            // [nama, posisi, ukuran]
            ["Wall_Back", [0, WALL_H / 2, -ROOM], [ROOM * 2, WALL_H, t]],
            ["Wall_Front", [0, WALL_H / 2, ROOM], [ROOM * 2, WALL_H, t]],
            ["Wall_Left", [-ROOM, WALL_H / 2, 0], [t, WALL_H, ROOM * 2]],
            ["Wall_Right", [ROOM, WALL_H / 2, 0], [t, WALL_H, ROOM * 2]]
        ];
        for (const [name, pos, size] of walls) {
            const wall = this.makeNode(name, this.buf.box, wallColors[name], pos, size, [0, 0, 0], 8);
            wall.unlit = true;
            this.root.addChild(wall);

            // List putih di bawah dinding
            const trimSize = [size[0] === t ? 0.5 : size[0], 0.5, size[2] === t ? 0.5 : size[2]];
            this.root.addChild(this.makeNode(name + "_Trim", this.buf.box, trimColor,
                [pos[0], 0.25, pos[2]], trimSize, [0, 0, 0], 20));
        }

        // Stiker bulat warna-warni di dinding belakang & kiri.
        // Disk menghadap +Y, diputar 90° supaya menempel tegak di dinding.
        const dotColors = [[1.0, 0.95, 0.55], [1.0, 0.98, 0.95], [1.0, 0.72, 0.62], [0.75, 0.95, 0.75]];
        for (let i = 0; i < 26; i++) {
            const r = this.random.range(0.3, 0.7);
            const y = this.random.range(2.0, WALL_H - 1);
            const along = this.random.range(-ROOM + 1.5, ROOM - 1.5);
            const color = this.random.pick(dotColors);
            const onBack = i % 2 === 0;

            const dot = onBack
                ? this.makeNode(`WallDot_${i}`, this.buf.diskUp, color, [along, y, -ROOM + 0.17], [r, 1, r], [Math.PI / 2, 0, 0], 10)
                : this.makeNode(`WallDot_${i}`, this.buf.diskUp, color, [-ROOM + 0.17, y, along], [r, 1, r], [0, 0, -Math.PI / 2], 10);

            // Jangan menutupi jendela
            if (onBack && Math.abs(along - 4) < 3 && Math.abs(y - 6) < 2.6) continue;
            dot.unlit = true;
            this.root.addChild(dot);
        }
    }

    // =========================================================================
    // JENDELA + BERKAS CAHAYA MATAHARI
    // =========================================================================
    buildWindow() {
        const win = new SceneNode("Window_Group");
        win.position = Vec3.create(4, 6, -ROOM + 0.2);
        this.root.addChild(win);

        // Kaca langit (unlit, terang)
        const sky = this.makeNode("Window_Sky", this.buf.box, [0.70, 0.88, 1.0], [0, 0, 0], [4, 3.4, 0.05]);
        sky.unlit = true;
        win.addChild(sky);

        // Bingkai & kisi jendela putih
        const frame = [0.98, 0.97, 0.94];
        const bars = [
            [[0, 1.8, 0.05], [4.5, 0.25, 0.25]],
            [[0, -1.8, 0.05], [4.5, 0.25, 0.25]],
            [[-2.15, 0, 0.05], [0.25, 3.8, 0.25]],
            [[2.15, 0, 0.05], [0.25, 3.8, 0.25]],
            [[0, 0, 0.05], [0.12, 3.4, 0.12]],
            [[0, 0, 0.05], [4.0, 0.12, 0.12]],
            [[0, -2.0, 0.3], [5.0, 0.15, 0.7]]    // ambang jendela
        ];
        bars.forEach(([pos, size], i) => win.addChild(this.makeNode(`Window_Frame_${i}`, this.buf.box, frame, pos, size)));

        // Berkas cahaya: kerucut transparan dari jendela ke lantai.
        // Cone dibuat tegak (+Y); diarahkan dari titik lantai menuju jendela dengan
        // ROTATE ARBITRARY AXIS: sumbu = Y × arah, sudut = acos(Y · arah).
        this.sunRays = new SceneNode("SunRays_Group");
        this.root.addChild(this.sunRays);

        const target = [4, 6, -ROOM];
        const floorSpots = [[2.5, -4.5], [4.5, -3.8], [6.0, -5.2], [3.6, -6.4]];
        floorSpots.forEach(([x, z], i) => {
            const base = [x, 0.0, z];
            const dir = Vec3.subtract(Vec3.create(), target, base);
            const length = Vec3.length(dir);
            Vec3.normalize(dir, dir);
            const axis = Vec3.cross(Vec3.create(), [0, 1, 0], dir);
            const angle = Math.acos(dir[1]);

            const ray = new SceneNode(`SunRay_Cone_${i}`);
            ray.buffers = this.buf.cone;
            ray.baseColor = [1.0, 0.95, 0.75, 1.0];
            ray.opacity = 0.07;
            ray.isTransparent = true;
            ray.unlit = true;
            ray.hasCustomLocalMatrix = true;
            const m = ray.localMatrix;
            Mat4.identity(m);
            Mat4.translate(m, m, base);
            Mat4.rotateArbitraryAxis(m, m, angle, axis);
            Mat4.scale(m, m, [1.3, length, 1.3]);
            this.sunRays.addChild(ray);
        });

        // Bercak cahaya hangat di lantai
        const patch = this.makeNode("SunPatch", this.buf.diskUp, [1.0, 0.95, 0.7], [4.2, 0.03, -5.0], [3.2, 1, 2.2]);
        patch.isTransparent = true;
        patch.unlit = true;
        patch.opacity = 0.18;
        this.root.addChild(patch);
    }

    // =========================================================================
    // 3. KARPET BUNDAR BERTINGKAT
    // =========================================================================
    buildRug() {
        const RUG_SCALE = 1.6;   // karpet ikut diperbesar sedikit supaya seimbang dengan kamar besar
        const rings = [
            [5.6, [0.20, 0.42, 0.80]],
            [4.7, [1.00, 0.82, 0.30]],
            [3.7, [0.88, 0.30, 0.30]],
            [2.7, [0.35, 0.70, 0.42]],
            [1.6, [0.98, 0.95, 0.86]]
        ];
        rings.forEach(([r, color], i) => {
            this.root.addChild(this.makeNode(`Rug_Ring_${i}`, this.buf.diskUp, color,
                [0, 0.004 + i * 0.004, 0], [r * RUG_SCALE, 1, r * RUG_SCALE], [0, 0, 0], 4));
        });
    }

    // =========================================================================
    // 4. BALOK MAINAN BERTUMPUK
    // =========================================================================
    buildBlocks() {
        const size = 0.55;   // balok mainan kecil
        for (let i = 0; i < 12; i++) {
            const p = this.random.ringPosition(4.0, 11);
            const count = 1 + Math.floor(this.random.next() * 3);
            const stack = new SceneNode(`Block_Stack_${i}`);
            stack.position = Vec3.create(p[0], 0, p[2]);
            stack.rotation[1] = this.random.range(0, Math.PI);
            this.root.addChild(stack);

            for (let k = 0; k < count; k++) {
                const block = this.makeNode(`Block_${i}_${k}`, this.buf.box, this.random.pick(TOY_COLORS),
                    [this.random.range(-0.06, 0.06), size / 2 + k * size, this.random.range(-0.06, 0.06)],
                    [size, size, size], [0, this.random.range(-0.3, 0.3), 0], 40);
                stack.addChild(block);
            }
        }
    }

    // =========================================================================
    // 5. BOLA MAINAN YANG MEMANTUL
    // Bola = setengah ellipsoid atas (merah) + setengah bawah (biru)
    //        + sabuk kuning di tengah = HYPERBOLOID OF ONE SHEET yang sangat pendek
    // =========================================================================
    buildBall() {
        this.ballRadius = 0.75;
        this.ballHome = [-4.2, 0, 2.2];

        this.ball = new SceneNode("Ball_Group");
        this.root.addChild(this.ball);

        const r = this.ballRadius;
        this.ball.addChild(this.makeNode("Ball_Top", this.buf.halfTop, [0.90, 0.22, 0.20], [0, 0, 0], [r, r, r], [0, 0, 0], 80));
        this.ball.addChild(this.makeNode("Ball_Bottom", this.buf.halfBottom, [0.20, 0.45, 0.85], [0, 0, 0], [r, r, r], [0, 0, 0], 80));
        const band = this.makeNode("Ball_Band_Hyperboloid1", this.buf.band, [1.0, 0.85, 0.2], [0, 0, 0], [r * 1.005, r * 0.5, r * 1.005], [0, 0, 0], 80);
        band.quadricType = "Hyperboloid of One Sheet";
        band.quadricEquation = "x² + z² - y²/c² = 1 (Sabuk Bola)";
        this.ball.addChild(band);

        // Bayangan bola (mengecil saat bola naik)
        this.ballShadow = this.makeNode("Ball_Shadow", this.buf.diskUp, [0.25, 0.14, 0.06], [this.ballHome[0], 0.035, this.ballHome[2]], [r, 1, r]);
        this.ballShadow.isTransparent = true;
        this.ballShadow.unlit = true;
        this.ballShadow.opacity = 0.3;
        this.root.addChild(this.ballShadow);
    }

    // =========================================================================
    // 6. GASING BERPUTAR
    // Badan bawah = CONE (ujung runcing menyentuh lantai), piringan = ellipsoid pipih,
    // gagang = cylinder. Posisi & rotasinya diisi tiap frame di update() (custom matrix).
    // =========================================================================
    buildSpinningTop() {
        this.spinTop = new SceneNode("SpinningTop");
        this.spinTop.position = Vec3.create(3.4, 0, -2.4);
        this.spinTop.hasCustomLocalMatrix = true;
        this.root.addChild(this.spinTop);

        // Cone terbalik: diputar 180° di X supaya puncaknya di bawah (menyentuh lantai)
        const body = this.makeNode("SpinningTop_Cone", this.buf.cone, [1.0, 0.55, 0.15], [0, 0.7, 0], [0.6, 0.7, 0.6], [Math.PI, 0, 0], 60);
        body.quadricType = "Cone";
        body.quadricEquation = "x²/r² + z²/r² = Y²/h² (Badan Gasing)";
        this.spinTop.addChild(body);

        // Garis warna di badan gasing supaya putarannya terlihat
        this.spinTop.addChild(this.makeNode("SpinningTop_Stripe", this.buf.box, [0.98, 0.97, 0.94], [0.3, 0.72, 0], [0.62, 0.05, 0.12], [0, 0, 0], 30));
        this.spinTop.addChild(this.makeNode("SpinningTop_Disc", this.buf.sphere, [0.60, 0.35, 0.80], [0, 0.72, 0], [0.66, 0.12, 0.66], [0, 0, 0], 70));
        this.spinTop.addChild(this.makeNode("SpinningTop_Handle", this.buf.cylinder, [1.0, 0.80, 0.18], [0, 0.78, 0], [0.07, 0.4, 0.07], [0, 0, 0], 60));
        this.spinTop.addChild(this.makeNode("SpinningTop_Knob", this.buf.sphere, [1.0, 0.80, 0.18], [0, 1.2, 0], [0.11, 0.11, 0.11], [0, 0, 0], 60));
    }

    // =========================================================================
    // 7. MENARA CINCIN SUSUN
    // =========================================================================
    buildRingStackers() {
        const spots = [[-6.5, -3.5], [7.5, 4.0]];
        const ringColors = [[0.90, 0.22, 0.20], [1.0, 0.55, 0.15], [1.0, 0.80, 0.18], [0.25, 0.70, 0.35], [0.20, 0.45, 0.85]];

        spots.forEach(([x, z], s) => {
            const stacker = new SceneNode(`RingStacker_${s}`);
            stacker.position = Vec3.create(x, 0, z);
            this.root.addChild(stacker);

            stacker.addChild(this.makeNode("Stacker_Base", this.buf.cylinder, [0.90, 0.22, 0.20], [0, 0, 0], [0.62, 0.18, 0.62], [0, 0, 0], 40));
            stacker.addChild(this.makeNode("Stacker_BaseTop", this.buf.diskUp, [0.90, 0.22, 0.20], [0, 0.18, 0], [0.62, 1, 0.62], [0, 0, 0], 40));
            stacker.addChild(this.makeNode("Stacker_Pole", this.buf.cylinder, [0.85, 0.65, 0.40], [0, 0.18, 0], [0.08, 1.45, 0.08], [0, 0, 0], 30));

            ringColors.forEach((color, i) => {
                const radius = 0.58 - i * 0.07;
                stacker.addChild(this.makeNode(`Stacker_Ring_${i}`, this.buf.sphere, color,
                    [0, 0.3 + i * 0.24, 0], [radius, 0.13, radius], [0, 0, 0], 70));
            });
            stacker.addChild(this.makeNode("Stacker_Top", this.buf.sphere, [0.60, 0.35, 0.80], [0, 1.68, 0], [0.18, 0.18, 0.18], [0, 0, 0], 70));
        });
    }

    // =========================================================================
    // 8. KRAYON BERSERAKAN (cylinder + ujung cone)
    // =========================================================================
    buildCrayons() {
        for (let i = 0; i < 9; i++) {
            const p = this.random.ringPosition(2.8, 9);
            const color = this.random.pick(TOY_COLORS);

            const crayon = new SceneNode(`Crayon_${i}`);
            crayon.position = Vec3.create(p[0], 0.1, p[2]);
            crayon.rotation[1] = this.random.range(0, Math.PI * 2);
            this.root.addChild(crayon);

            // Silinder & cone berdiri di +Y, diputar -90° di Z supaya rebah ke arah +X
            const lie = [0, 0, -Math.PI / 2];
            crayon.addChild(this.makeNode("Crayon_Body", this.buf.cylinder, color, [-0.5, 0, 0], [0.1, 0.9, 0.1], lie, 40));
            crayon.addChild(this.makeNode("Crayon_Wrap", this.buf.cylinder, [0.98, 0.97, 0.94], [-0.3, 0, 0], [0.104, 0.5, 0.104], lie, 20));
            crayon.addChild(this.makeNode("Crayon_Tip", this.buf.cone, color, [0.4, 0, 0], [0.1, 0.22, 0.1], lie, 40));
            crayon.addChild(this.makeNode("Crayon_End", this.buf.sphere, color, [-0.5, 0, 0], [0.02, 0.1, 0.1], [0, 0, 0], 40));
        }
    }

    // =========================================================================
    // 9. FURNITUR: KASUR, RAK BUKU, PETI MAINAN
    // =========================================================================
    buildFurniture() {
        const wood = [0.62, 0.40, 0.22];
        const woodLight = [0.78, 0.56, 0.34];

        // ---- Kasur di sudut kiri belakang ----
        const bed = new SceneNode("Bed");
        bed.position = Vec3.create(-11.6, 0, -8.5);
        this.root.addChild(bed);
        bed.addChild(this.makeNode("Bed_Frame", this.buf.box, wood, [0, 0.5, 0], [5.0, 1.0, 8.0], [0, 0, 0], 20));
        bed.addChild(this.makeNode("Bed_Mattress", this.buf.box, [0.95, 0.96, 0.99], [0, 1.3, 0], [4.7, 0.6, 7.7], [0, 0, 0], 10));
        bed.addChild(this.makeNode("Bed_Blanket", this.buf.box, [0.25, 0.50, 0.88], [0, 1.66, 1.2], [4.9, 0.14, 5.4], [0, 0, 0], 10));
        bed.addChild(this.makeNode("Bed_Blanket_Stripe", this.buf.box, [1.0, 0.82, 0.30], [0, 1.68, -1.0], [4.92, 0.15, 0.5], [0, 0, 0], 10));
        bed.addChild(this.makeNode("Bed_Pillow", this.buf.sphere, [1.0, 1.0, 1.0], [0, 1.85, -2.9], [1.6, 0.35, 0.8], [0, 0, 0], 10));
        bed.addChild(this.makeNode("Bed_Headboard", this.buf.box, wood, [0, 2.0, -4.1], [5.0, 4.0, 0.4], [0, 0, 0], 20));
        bed.addChild(this.makeNode("Bed_Headboard_Top", this.buf.box, woodLight, [0, 4.05, -4.1], [5.3, 0.2, 0.6], [0, 0, 0], 20));

        // ---- Rak buku di dinding kanan ----
        const shelf = new SceneNode("Bookshelf");
        shelf.position = Vec3.create(13.9, 0, -5.5);
        this.root.addChild(shelf);
        shelf.addChild(this.makeNode("Shelf_Back", this.buf.box, wood, [0.45, 2.75, 0], [0.1, 5.5, 4.0], [0, 0, 0], 15));
        shelf.addChild(this.makeNode("Shelf_Side_L", this.buf.box, woodLight, [0, 2.75, -2.0], [1.0, 5.5, 0.15], [0, 0, 0], 15));
        shelf.addChild(this.makeNode("Shelf_Side_R", this.buf.box, woodLight, [0, 2.75, 2.0], [1.0, 5.5, 0.15], [0, 0, 0], 15));
        for (let k = 0; k < 4; k++) {
            const y = 0.1 + k * 1.75;
            shelf.addChild(this.makeNode(`Shelf_Board_${k}`, this.buf.box, woodLight, [0, y, 0], [1.0, 0.15, 4.0], [0, 0, 0], 15));
            if (k === 3) break;
            // Buku warna-warni di atas papan
            let z = -1.8;
            while (z < 1.6) {
                const w = this.random.range(0.18, 0.32);
                const h = this.random.range(1.0, 1.5);
                shelf.addChild(this.makeNode(`Book_${k}_${z.toFixed(2)}`, this.buf.box, this.random.pick(TOY_COLORS),
                    [0.05, y + 0.075 + h / 2, z + w / 2], [0.75, h, w], [0, 0, 0], 25));
                z += w + 0.03;
            }
        }

        // ---- Peti mainan di sudut kanan depan ----
        const chest = new SceneNode("ToyChest");
        chest.position = Vec3.create(10.5, 0, 9.5);
        chest.rotation[1] = -0.5;
        this.root.addChild(chest);
        chest.addChild(this.makeNode("Chest_Body", this.buf.box, [0.85, 0.30, 0.25], [0, 0.8, 0], [3.0, 1.6, 1.8], [0, 0, 0], 25));
        chest.addChild(this.makeNode("Chest_Lid", this.buf.box, [0.95, 0.75, 0.20], [0, 1.7, 0], [3.2, 0.25, 2.0], [0, 0, 0], 25));
        chest.addChild(this.makeNode("Chest_Band", this.buf.box, [0.95, 0.75, 0.20], [0, 0.8, 0], [3.05, 0.25, 1.85], [0, 0, 0], 25));
        chest.addChild(this.makeNode("Chest_Ball", this.buf.sphere, [0.25, 0.70, 0.35], [0.6, 2.25, 0.1], [0.42, 0.42, 0.42], [0, 0, 0], 60));
    }

    /**
     * Animasi lingkungan:
     * - Bola memantul: TRANSLATE naik-turun + SCALING squash saat menyentuh lantai + ROTATE berguling
     * - Gasing: ROTATE Y cepat + ROTATE ARBITRARY AXIS (sumbu miring yang ikut berputar = oleng)
     * characterPosition dipakai supaya sebagian gelembung keluar dari dekat Pingo.
     */
    update(time, characterPosition) {
        // ---- Bola memantul ----
        const bounce = Math.abs(Math.sin(time * 2.2));          // 0 di lantai, 1 di puncak
        const height = bounce * 1.8;
        const squash = Math.max(0, 0.25 - bounce) * 1.2;       // gepeng hanya saat dekat lantai
        const r = this.ballRadius;
        this.ball.position = Vec3.create(this.ballHome[0], r * (1 - squash) + height, this.ballHome[2]);
        this.ball.scale = Vec3.create(1 + squash, 1 - squash, 1 + squash);
        this.ball.rotation[2] = -time * 1.5;

        const shadowScale = r * (1.0 - bounce * 0.35);
        this.ballShadow.scale = Vec3.create(shadowScale, 1, shadowScale);
        this.ballShadow.opacity = 0.3 * (1.0 - bounce * 0.5);

        // ---- Gasing berputar & oleng ----
        // localMatrix = Translate(posisi) · R(sumbu miring yang berputar, 0.12 rad) · RotateY(putaran cepat)
        const m = this.spinTop.localMatrix;
        const wobbleAxis = [Math.cos(time * 3.0), 0, Math.sin(time * 3.0)];
        Mat4.identity(m);
        Mat4.translate(m, m, this.spinTop.position);
        Mat4.rotateArbitraryAxis(m, m, 0.12, wobbleAxis);
        Mat4.rotateY(m, m, time * 12.0);

        // ---- Gelembung sabun ----
        this.bubbles.update(time, characterPosition);

        this.root.update(time);
    }
}
