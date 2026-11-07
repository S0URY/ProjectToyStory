/**
 * pingo.js - Pingo the Penguin Character Model & Animations
 * Karakter penguin original, dimodelkan dengan Quadric Parametrik murni & Kurva 3D!
 *
 * Quadrics Used:
 * 1. Badan (Object 1): Ellipsoid (+ perut krem & kepala juga ellipsoid)
 * 2. Kaki (Object 2): Elliptic Paraboloid (kubah pipih, c negatif)
 * 3. Paruh (Object 3): Elliptic Cone (paruh atas & paruh bawah)
 * 4. Kurva 3D: Alis kiri & kanan di atas mata (Cubic Bezier -> tabung, tebal di tengah, tipis di ujung)
 *
 * Transformasi yang dipakai:
 * - Translate : Pingo bergeser kiri-kanan + tombol panah, kaki terangkat bergantian, alis naik-turun
 * - Rotate    : badan bergoyang (Z), kepala menoleh (Y), paruh bawah membuka (X), pupil melirik (Y), alis miring (Z)
 * - Scaling   : tombol +/-, badan squash-stretch
 * - Rotate Arbitrary Axis : sayap mengepak pada sumbu miring yang melewati bahu
 * - Hierarchical : lihat pohon di bawah
 *
 * STRUKTUR PARENT -> CHILD:
 *
 *   Pingo_Root                       <- Translate + Scaling + Rotate Z (goyang kiri-kanan)
 *   ├── Pingo_Shadow                 <- bayangan transparan (tetap di lantai saat melompat)
 *   └── Pingo_Jump                   <- LOMPAT: Translate Y + Rotate Y / Rotate Arbitrary Axis + Scaling
 *       ├── Pingo_Body (group)
 *       │   ├── Pingo_Body_Squash        <- Scaling squash-stretch (hanya mesh badan)
 *       │   │   ├── Pingo_Body_Ellipsoid       (Object 1)
 *       │   │   └── Pingo_Belly_Ellipsoid      (perut krem)
 *       │   ├── Pingo_Head               <- Rotate Y (menoleh)
 *       │   │   ├── Pingo_Head_Ellipsoid
 *       │   │   ├── Pingo_Eye_R / _L
 *       │   │   │   ├── Pingo_EyeWhite
 *       │   │   │   └── Pingo_Pupil_Pivot  <- Rotate Y (melirik)
 *       │   │   │       └── Pingo_Pupil
 *       │   │   ├── Pingo_Cheek_R / _L
 *       │   │   ├── Pingo_Brow_R / _L    <- Translate Y + Rotate Z (alis naik & miring)
 *       │   │   │   └── Pingo_Brow_Curve_R / _L (Kurva 3D Bezier)
 *       │   │   └── Pingo_Beak (group)
 *       │   │       ├── Pingo_Beak_Upper_Cone   (Object 3)
 *       │   │       └── Pingo_Beak_Lower_Pivot  <- Rotate X (membuka paruh)
 *       │   │           └── Pingo_Beak_Lower_Cone
 *       │   └── Pingo_Wing_R / _L        <- Rotate Arbitrary Axis (mengepak)
 *       │       └── Pingo_Wing_Mesh
 *       └── Pingo_Foot_R / _L            <- Translate Y (melangkah) (Object 2)
 *
 * Kenapa ada node "group/pivot" tanpa mesh?
 *  - Scale pada parent selalu ikut ke child. Supaya squash badan TIDAK membuat
 *    kepala & sayap ikut gepeng, squash ditaruh di node terpisah (Pingo_Body_Squash).
 *  - Rotasi selalu terhadap titik asal node. Supaya paruh bawah membuka dari
 *    pangkalnya, node pivot diletakkan di pangkal paruh.
 */

import { SceneNode } from '../../core/scene-node.js';
import { Quadrics } from '../../core/quadrics.js';
import { Curves } from '../../core/curves.js';
import { WebGLUtils } from '../../core/webgl-utils.js';
import { Vec3, Mat4 } from '../../core/math3d.js';

export class Pingo {
    constructor(gl) {
        this.gl = gl;

        this.root = new SceneNode("Pingo_Root");
        this.buildModel();
    }

    buildModel() {
        const gl = this.gl;

        // Geometri dasar (dibuat sekali di titik asal, ukuran diatur lewat node.scale)
        // 1. Ellipsoid satuan: badan, perut, kepala, mata, pipi, sayap
        const sphereGeom = Quadrics.createEllipsoid(1.0, 1.0, 1.0, 40, 56);
        // 2. Elliptic Paraboloid terbalik (c = -1): kaki
        const paraboloidGeom = Quadrics.createEllipticParaboloid(1.0, 1.0, -1.0, 24, 40);
        // 3. Cone satuan (alas di y=0, puncak di y=1): paruh
        const coneGeom = Quadrics.createCone(1.0, 1.0, 32);
        // 4. Disk: bayangan
        const shadowDiskGeom = Quadrics.createDisk(1.0, 1.0, 1, 56);

        this.sphereBuf = WebGLUtils.createMeshBuffers(gl, sphereGeom);
        this.paraboloidBuf = WebGLUtils.createMeshBuffers(gl, paraboloidGeom);
        this.coneBuf = WebGLUtils.createMeshBuffers(gl, coneGeom);
        const shadowDiskBuf = WebGLUtils.createMeshBuffers(gl, shadowDiskGeom);

        // Palet warna Pingo
        this.colors = {
            body: [0.03, 0.03, 0.04, 1.0],   // biru tua keabu-abuan
            belly: [1.00, 0.97, 0.90, 1.0],  // krem
            beak: [1.00, 0.56, 0.16, 1.0],   // oranye
            feet: [1.00, 0.50, 0.14, 1.0],
            brow: [0.08, 0.08, 0.12, 1.0],   // hitam kebiruan
            eye: [0.99, 0.99, 0.97, 1.0],
            pupil: [0.05, 0.06, 0.10, 1.0],
            cheek: [1.00, 0.55, 0.60, 1.0]
        };

        // =========================================================================
        // 0. BAYANGAN DI LANTAI (Soft Contact Shadow)
        // =========================================================================
        this.shadow = new SceneNode("Pingo_Shadow");
        this.shadow.buffers = shadowDiskBuf;
        this.shadow.baseColor = [0.25, 0.14, 0.06, 1.0];
        this.shadow.opacity = 0.25;
        this.shadow.isTransparent = true;
        this.shadow.unlit = true;
        this.shadow.position = Vec3.create(0.0, 0.04, 0.08);
        this.shadow.scale = Vec3.create(1.15, 1.0, 1.0);
        this.root.addChild(this.shadow);

        // =========================================================================
        // 1. BADAN (Group Node: parent dari kepala dan sayap)
        // =========================================================================
        this.body = new SceneNode("Pingo_Body");
        this.root.addChild(this.body);

        // Squash-stretch hanya untuk mesh badan & perut (pivot di lantai, jadi kaki tetap menapak)
        this.bodySquash = new SceneNode("Pingo_Body_Squash");
        this.body.addChild(this.bodySquash);

        // ===== OBJECT 1: BADAN = ELLIPSOID =====
        // Pusat di (0, 1.15, 0), tinggi 1.15 -> bagian bawah tepat di lantai (y = 0)
        this.bodyMesh = new SceneNode("Pingo_Body_Ellipsoid");
        this.bodyMesh.buffers = this.sphereBuf;
        this.bodyMesh.baseColor = this.colors.body;
        this.bodyMesh.shininess = 40.0;
        this.bodyMesh.position = Vec3.create(0, 1.15, 0);
        this.bodyMesh.scale = Vec3.create(0.92, 1.15, 0.82);
        this.bodyMesh.quadricType = "Ellipsoid";
        this.bodyMesh.quadricEquation = "x²/0.92² + y²/1.15² + z²/0.82² = 1 (Badan)";
        this.bodySquash.addChild(this.bodyMesh);

        // Perut krem: ellipsoid lebih pipih yang menempel di depan badan
        const belly = new SceneNode("Pingo_Belly_Ellipsoid");
        belly.buffers = this.sphereBuf;
        belly.baseColor = this.colors.belly;
        belly.shininess = 30.0;
        belly.position = Vec3.create(0, 1.0, 0.34);
        belly.scale = Vec3.create(0.68, 0.86, 0.52);
        this.bodySquash.addChild(belly);

        // =========================================================================
        // 2. KEPALA (Ellipsoid) - parent dari mata, pipi, alis, dan paruh
        // =========================================================================
        this.head = new SceneNode("Pingo_Head");
        this.head.position = Vec3.create(0, 2.15, 0);
        this.body.addChild(this.head);

        const headMesh = new SceneNode("Pingo_Head_Ellipsoid");
        headMesh.buffers = this.sphereBuf;
        headMesh.baseColor = this.colors.body;
        headMesh.shininess = 40.0;
        headMesh.scale = Vec3.create(0.62, 0.56, 0.58);
        headMesh.quadricType = "Ellipsoid";
        headMesh.quadricEquation = "x²/0.62² + y²/0.56² + z²/0.58² = 1 (Kepala)";
        this.head.addChild(headMesh);

        // Mata & pipi (kanan = 1, kiri = -1)
        this.eyes = [this.buildEye(1, 0.0), this.buildEye(-1, 0.0)];
        [1, -1].forEach((side) => {
            const cheek = new SceneNode(side === 1 ? "Pingo_Cheek_R" : "Pingo_Cheek_L");
            cheek.buffers = this.sphereBuf;
            cheek.baseColor = this.colors.cheek;
            cheek.shininess = 10.0;
            cheek.position = Vec3.create(0.33 * side, -0.1, 0.47);
            cheek.rotation = Vec3.create(0, 0.6 * side, 0);
            cheek.scale = Vec3.create(0.09, 0.055, 0.04);
            this.head.addChild(cheek);
        });

        this.buildEyebrows();
        this.buildBeak();

        // =========================================================================
        // 3. SAYAP (Rotate Arbitrary Axis di bahu)
        // =========================================================================
        this.wings = [this.buildWing(1), this.buildWing(-1)];

        // =========================================================================
        // 4. KAKI (OBJECT 2: ELLIPTIC PARABOLOID)
        // Child dari Root (bukan badan) supaya tetap menapak saat badan squash
        // =========================================================================
        this.feet = [this.buildFoot(1, 0.0), this.buildFoot(-1, Math.PI)];

        // =========================================================================
        // 5. NODE LOMPAT (parent dari badan & kaki)
        // Bayangan tidak ikut dipindah, jadi tetap menempel di lantai saat Pingo melompat.
        // Matriksnya diisi sendiri di update() (custom local matrix).
        // =========================================================================
        this.jump = new SceneNode("Pingo_Jump");
        this.jump.hasCustomLocalMatrix = true;
        this.root.addChild(this.jump);
        this.jump.addChild(this.body);
        for (const foot of this.feet) this.jump.addChild(foot.node);
    }

    /**
     * Mata: bola putih + pupil. side = 1 kanan, -1 kiri.
     */
    buildEye(side, phase) {
        const tag = side === 1 ? "R" : "L";

        const eye = new SceneNode(`Pingo_Eye_${tag}`);
        eye.position = Vec3.create(0.2 * side, 0.1, 0.46);
        this.head.addChild(eye);

        const white = new SceneNode(`Pingo_EyeWhite_${tag}`);
        white.buffers = this.sphereBuf;
        white.baseColor = this.colors.eye;
        white.shininess = 90.0;
        white.scale = Vec3.create(0.13, 0.16, 0.09);
        eye.addChild(white);

        // Pivot di pusat mata, supaya pupil melirik memutari bola mata
        const pupilPivot = new SceneNode(`Pingo_Pupil_Pivot_${tag}`);
        eye.addChild(pupilPivot);

        const pupil = new SceneNode(`Pingo_Pupil_${tag}`);
        pupil.buffers = this.sphereBuf;
        pupil.baseColor = this.colors.pupil;
        pupil.shininess = 120.0;
        pupil.position = Vec3.create(0, -0.01, 0.075);
        pupil.scale = Vec3.create(0.065, 0.085, 0.035);
        pupilPivot.addChild(pupil);

        return { pupilPivot, phase };
    }

    /**
     * ALIS = 3D CURVE (Cubic Bezier)
     * Dua helai alis di atas mata kiri & kanan.
     * Setiap alis: 4 titik kontrol Bezier -> 24 titik -> tabung yang tebal di tengah
     * dan menipis di kedua ujungnya.
     * Kurvanya melengkung ke ATAS sekaligus mengikuti lengkung kepala ke BELAKANG (z mengecil
     * ke arah luar), jadi benar-benar kurva 3D, bukan garis datar.
     */
    buildEyebrows() {
        const gl = this.gl;
        this.brows = [];

        [1, -1].forEach((side) => {
            const tag = side === 1 ? "R" : "L";

            // Pivot alis di tengah alis (relatif pusat kepala), supaya alis naik & miring dari tengahnya
            const center = [0.2 * side, 0.35, 0.44];
            const brow = new SceneNode(`Pingo_Brow_${tag}`);
            brow.position = Vec3.create(...center);
            this.head.addChild(brow);

            // Titik kontrol [P0, P1, P2, P3] relatif terhadap pusat kepala
            const p0 = [0.08 * side, 0.31, 0.50];   // pangkal dekat tengah wajah
            const p1 = [0.15 * side, 0.38, 0.47];   // menarik lengkung ke atas
            const p2 = [0.26 * side, 0.39, 0.41];
            const p3 = [0.33 * side, 0.32, 0.39];   // ujung luar, ikut lengkung kepala ke belakang

            // Geser titik supaya relatif terhadap pivot alis
            const local = [p0, p1, p2, p3].map((p) => [p[0] - center[0], p[1] - center[1], p[2] - center[2]]);
            const points = Curves.createBezierPoints(local[0], local[1], local[2], local[3], 24);

            // Tebal di tengah (t = 0.5), tipis di kedua ujung (t = 0 dan t = 1)
            const tubeGeom = Curves.createTubeFromPoints(points, (t) => 0.012 + 0.022 * Math.sin(Math.PI * t), 10);

            const curve = new SceneNode(`Pingo_Brow_Curve_${tag}`);
            curve.buffers = WebGLUtils.createMeshBuffers(gl, tubeGeom);
            curve.baseColor = this.colors.brow;
            curve.shininess = 30.0;
            curve.quadricType = "3D Curve";
            curve.quadricEquation = "B(t) = (1-t)³P0 + 3(1-t)²tP1 + 3(1-t)t²P2 + t³P3";
            brow.addChild(curve);

            this.brows.push({ node: brow, side, baseY: center[1] });
        });
    }

    /**
     * PARUH = OBJECT 3 (ELLIPTIC CONE)
     * Cone dibuat tegak di +Y, lalu diputar 90° di sumbu X supaya menunjuk ke depan (+Z).
     * scale: x = lebar paruh, y = panjang paruh, z = tebal paruh (setelah diputar jadi arah atas-bawah)
     */
    buildBeak() {
        this.beak = new SceneNode("Pingo_Beak");
        this.beak.position = Vec3.create(0, -0.08, 0.48);
        this.head.addChild(this.beak);

        this.beakUpper = new SceneNode("Pingo_Beak_Upper_Cone");
        this.beakUpper.buffers = this.coneBuf;
        this.beakUpper.baseColor = this.colors.beak;
        this.beakUpper.shininess = 60.0;
        this.beakUpper.position = Vec3.create(0, 0.03, 0);
        this.beakUpper.rotation = Vec3.create(Math.PI / 2 + 0.1, 0, 0);
        this.beakUpper.scale = Vec3.create(0.17, 0.42, 0.1);
        this.beakUpper.quadricType = "Elliptic Cone";
        this.beakUpper.quadricEquation = "x²/a² + z²/b² = Y²/h² (Paruh Atas)";
        this.beak.addChild(this.beakUpper);

        // Pivot di pangkal paruh bawah -> Rotate X membuka mulut
        this.beakLowerPivot = new SceneNode("Pingo_Beak_Lower_Pivot");
        this.beakLowerPivot.position = Vec3.create(0, -0.02, 0);
        this.beak.addChild(this.beakLowerPivot);

        const beakLower = new SceneNode("Pingo_Beak_Lower_Cone");
        beakLower.buffers = this.coneBuf;
        beakLower.baseColor = this.colors.beak;
        beakLower.shininess = 60.0;
        beakLower.rotation = Vec3.create(Math.PI / 2 + 0.18, 0, 0);
        beakLower.scale = Vec3.create(0.14, 0.32, 0.06);
        beakLower.quadricType = "Elliptic Cone";
        beakLower.quadricEquation = "x²/a² + z²/b² = Y²/h² (Paruh Bawah)";
        this.beakLowerPivot.addChild(beakLower);
    }

    /**
     * Sayap: pivot di bahu dengan custom local matrix
     * Translate(bahu) · RotateArbitraryAxis(sumbu miring, sudut). Diisi tiap frame di update().
     */
    buildWing(side) {
        const tag = side === 1 ? "R" : "L";

        const wing = new SceneNode(`Pingo_Wing_${tag}`);
        wing.position = Vec3.create(0.84 * side, 1.62, 0.0);
        wing.hasCustomLocalMatrix = true;
        this.body.addChild(wing);

        const wingMesh = new SceneNode(`Pingo_Wing_Mesh_${tag}`);
        wingMesh.buffers = this.sphereBuf;
        wingMesh.baseColor = this.colors.body;
        wingMesh.shininess = 40.0;
        wingMesh.position = Vec3.create(0.1 * side, -0.45, 0.0);
        wingMesh.rotation = Vec3.create(0, 0, 0.22 * side);
        wingMesh.scale = Vec3.create(0.11, 0.52, 0.3);
        wing.addChild(wingMesh);

        // Sumbu putar miring: hampir searah depan (z), sedikit condong ke atas & ke luar
        return { node: wing, side, axis: [0.25 * side, 0.3, 1.0] };
    }

    /**
     * KAKI = OBJECT 2 (ELLIPTIC PARABOLOID)
     * Paraboloid c = -1: puncak di titik asal, terbuka ke bawah sampai y = -1.
     * Di-scale sangat pipih (tinggi 0.12) sehingga menjadi telapak kaki yang lebar & membulat.
     */
    buildFoot(side, phase) {
        const tag = side === 1 ? "R" : "L";

        const foot = new SceneNode(`Pingo_Foot_${tag}`);
        foot.buffers = this.paraboloidBuf;
        foot.baseColor = this.colors.feet;
        foot.shininess = 50.0;
        foot.position = Vec3.create(0.34 * side, 0.12, 0.32);
        foot.rotation = Vec3.create(0, 0.22 * side, 0);
        foot.scale = Vec3.create(0.24, 0.12, 0.4);
        foot.quadricType = "Elliptic Paraboloid";
        foot.quadricEquation = "x²/0.24² + z²/0.4² = y/(-0.12) (Telapak Kaki)";
        this.root.addChild(foot);

        return { node: foot, phase };
    }

    /**
     * Update animations:
     * 1. Translate: Pingo bergeser kiri-kanan otomatis + tombol panah, kaki terangkat bergantian
     * 2. Rotate: badan bergoyang, kepala menoleh, paruh membuka, alis miring, pupil melirik
     * 3. Scaling: tombol +/-, badan squash-stretch
     * 4. Rotate Arbitrary Axis: sayap mengepak
     * 5. LOMPAT & PUTAR (siklus 12 detik, mirip Alien):
     *    0 - 6 s  : jalan bergoyang biasa
     *    6 - 8 s  : lompat 1 + putar 360° di sumbu Y (Rotate)
     *    8 - 10.4 s: lompat 2 yang lebih tinggi + putar 360° di sumbu miring [1, 1, 0.5] (Rotate Arbitrary Axis)
     *    10.4 - 12 s: kembali jalan biasa
     *    Setiap lompatan: penyet sebelum melompat -> memanjang di udara -> penyet saat mendarat (Scaling)
     */
    jumpProfile(u, height) {
        // u = 0..1 sepanjang satu lompatan
        let y = 0.0, sy = 1.0, sxz = 1.0, air = 0.0;
        if (u < 0.15) {                         // ancang-ancang: penyet di lantai
            const p = Math.sin((u / 0.15) * Math.PI);
            sy = 1 - 0.30 * p; sxz = 1 + 0.24 * p;
        } else if (u < 0.75) {                  // melayang: naik-turun & memanjang
            air = (u - 0.15) / 0.60;
            const arc = Math.sin(air * Math.PI);
            y = arc * height;
            sy = 1 + 0.22 * arc; sxz = 1 - 0.12 * arc;
        } else if (u < 0.90) {                  // mendarat: penyet
            const p = Math.sin(((u - 0.75) / 0.15) * Math.PI);
            sy = 1 - 0.32 * p; sxz = 1 + 0.26 * p;
            air = 1.0;
        } else {
            air = 1.0;
        }
        return { y, sy, sxz, air };
    }

    update(time, controls) {
        const t = time;

        // ---- LOMPAT & PUTAR ----
        const cycleT = t % 12.0;
        let jumpY = 0.0, sy = 1.0, sxz = 1.0, spinY = 0.0, spinArb = 0.0, jumping = false;
        if (cycleT >= 6.0 && cycleT < 8.0) {
            // Lompat 1: putar 360° di sumbu Y
            const j = this.jumpProfile((cycleT - 6.0) / 2.0, 1.1);
            jumpY = j.y; sy = j.sy; sxz = j.sxz; jumping = true;
            spinY = (0.5 - 0.5 * Math.cos(j.air * Math.PI)) * 2 * Math.PI;
        } else if (cycleT >= 8.0 && cycleT < 10.4) {
            // Lompat 2: lebih tinggi, putar 360° di sumbu miring sembarang [1, 1, 0.5]
            const j = this.jumpProfile((cycleT - 8.0) / 2.4, 1.8);
            jumpY = j.y; sy = j.sy; sxz = j.sxz; jumping = true;
            spinArb = (0.5 - 0.5 * Math.cos(j.air * Math.PI)) * 2 * Math.PI;
        }

        // localMatrix Pingo_Jump = T(0, y, 0) · RotateY(spinY) · S(sxz, sy, sxz)
        //                          · T(0, 1.3, 0) · R(sumbu [1, 1, 0.5], spinArb) · T(0, -1.3, 0)
        // Putaran sumbu miring berporos di tengah badan (y = 1.3), bukan di lantai.
        const jm = this.jump.localMatrix;
        Mat4.identity(jm);
        Mat4.translate(jm, jm, [0, jumpY, 0]);
        Mat4.rotateY(jm, jm, spinY);
        Mat4.scale(jm, jm, [sxz, sy, sxz]);
        Mat4.translate(jm, jm, [0, 1.3, 0]);
        Mat4.rotateArbitraryAxis(jm, jm, spinArb, [1.0, 1.0, 0.5]);
        Mat4.translate(jm, jm, [0, -1.3, 0]);

        // Bayangan mengecil & memudar saat Pingo di udara
        const shadowK = 1.0 - Math.min(1, jumpY / 1.8) * 0.45;
        this.shadow.scale = Vec3.create(1.15 * shadowK, 1.0, 1.0 * shadowK);
        this.shadow.opacity = 0.25 * shadowK;

        // ---- TRANSLATE + SCALING + ROTATE Z seluruh karakter (Pingo_Root) ----
        // sin(t*0.6)*0.8 = bergeser kiri-kanan otomatis, rotation Z = jalan bergoyang khas penguin
        this.root.position = Vec3.create(controls.posX + Math.sin(t * 0.6) * 0.8, 0.0, controls.posZ);
        this.root.scale = Vec3.create(controls.scale, controls.scale, controls.scale);
        this.root.rotation[2] = Math.sin(t * 4) * 0.06;

        // ---- SCALING: badan squash-stretch (x melebar saat y memendek) ----
        const squash = jumping ? 0.0 : Math.sin(t * 8);
        this.bodySquash.scale = Vec3.create(1 + 0.03 * squash, 1 - 0.04 * squash, 1 + 0.03 * squash);

        // ---- ROTATE Y: kepala menoleh ----
        this.head.rotation[1] = Math.sin(t * 0.8) * 0.3;

        // ---- ROTATE X: paruh bawah membuka-menutup ----
        this.beakLowerPivot.rotation[0] = Math.max(0, Math.sin(t * 2.5)) * 0.35;

        // ---- TRANSLATE Y + ROTATE Z: alis naik-turun & sedikit miring (berekspresi) ----
        const browLift = Math.max(0, Math.sin(t * 1.5));
        for (const brow of this.brows) {
            brow.node.position[1] = brow.baseY + browLift * 0.04;
            brow.node.rotation[2] = brow.side * browLift * 0.12;
        }

        // ---- ROTATE Y: pupil melirik kiri-kanan ----
        for (const eye of this.eyes) {
            eye.pupilPivot.rotation[1] = Math.sin(t * 1.1 + eye.phase) * 0.4;
        }

        // ---- ROTATE ARBITRARY AXIS: sayap mengepak ----
        // localMatrix = Translate(bahu) · R(sumbu miring, sudut)
        for (const wing of this.wings) {
            const flap = jumping ? 0.7 : 0.35;   // saat melompat sayap mengepak lebih lebar
            const angle = (0.15 + Math.sin(t * (jumping ? 9 : 5)) * flap) * wing.side;
            const m = wing.node.localMatrix;
            Mat4.identity(m);
            Mat4.translate(m, m, wing.node.position);
            Mat4.rotateArbitraryAxis(m, m, angle, wing.axis);
        }

        // ---- TRANSLATE Y: kaki terangkat bergantian (melangkah) ----
        for (const foot of this.feet) {
            foot.node.position[1] = jumping ? 0.12 : 0.12 + Math.max(0, Math.sin(t * 4 + foot.phase)) * 0.12;
        }

        // Propagate hierarchy: Root -> Lompat -> Badan -> Kepala -> Paruh / Mata / Alis, Badan -> Sayap
        this.root.update(time);
    }
}
