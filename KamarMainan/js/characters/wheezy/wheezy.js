/**
 * =====================================================================================
 *  wheezy.js - Karakter Wheezy (penguin) : model, hierarki, dan animasi
 * =====================================================================================
 *
 *  Semua bentuk dibuat dari QUADRIC PARAMETRIK (js/core/quadrics.js) dan KURVA 3D
 *  (js/core/curves.js). Tidak ada library 3D: posisi, rotasi, dan skala dihitung
 *  dengan matriks 4x4 sendiri (js/core/math3d.js).
 *
 * -------------------------------------------------------------------------------------
 *  PETA RUBRIK PENILAIAN  (cari tag di bawah ini dengan Ctrl+F)
 * -------------------------------------------------------------------------------------
 *  Rubrik                      | Tag yang dicari            | Bagian karakter
 *  ----------------------------+----------------------------+---------------------------
 *  3D Curve (di karakter)      | [RUBRIK: 3D CURVE]         | Alis kiri & kanan (Cubic Bezier)
 *  Object 1                    | [RUBRIK: OBJECT 1]         | Badan = Ellipsoid
 *  Object 2                    | [RUBRIK: OBJECT 2]         | Kaki  = Elliptic Paraboloid
 *  Object 3 (quadric selain    | [RUBRIK: OBJECT 3]         | Paruh = Elliptic Cone
 *    ellipsoid & cylinder)     |                            |
 *  Translate                   | [RUBRIK: TRANSLATE]        | Wheezy bergeser, melompat, kaki melangkah, alis naik
 *  Rotate                      | [RUBRIK: ROTATE]           | Badan goyang, kepala menoleh, paruh membuka, putar 360°
 *  Scaling                     | [RUBRIK: SCALING]          | Tombol +/-, squash-stretch, penyet saat melompat
 *  Rotate Arbitrary Axis       | [RUBRIK: ARBITRARY AXIS]   | Sayap mengepak, putaran miring saat lompat ke-2
 *  Hierarchical Transformation | [RUBRIK: HIERARKI]         | Pohon parent -> child di bawah
 *
 *  Bagian yang bisa DIUBAH untuk DEMO saat presentasi diberi tag:  [DEMO]
 *  (setiap [DEMO] menjelaskan: baris mana yang diubah, nilai contoh, dan apa yang akan terlihat)
 *  Setelah mengubah: simpan file, lalu refresh browser. Kembalikan nilainya setelah selesai.
 *
 * -------------------------------------------------------------------------------------
 *  [RUBRIK: HIERARKI]  STRUKTUR PARENT -> CHILD
 * -------------------------------------------------------------------------------------
 *  Setiap kotak di bawah adalah SceneNode (js/core/scene-node.js).
 *  Rumusnya:  WorldMatrix(child) = WorldMatrix(parent) × LocalMatrix(child)
 *  Artinya: kalau PARENT digeser / diputar / di-scale, SEMUA CHILD di bawahnya ikut.
 *
 *   Wheezy_Root                        <- Translate + Scaling + Rotate Z (goyang kiri-kanan)
 *   ├── Wheezy_Shadow                  <- bayangan transparan (tetap di lantai saat melompat)
 *   └── Wheezy_Jump                    <- LOMPAT: Translate Y + Rotate Y / Arbitrary Axis + Scaling
 *       ├── Wheezy_Body (group)
 *       │   ├── Wheezy_Body_Squash         <- Scaling squash-stretch (hanya mesh badan & perut)
 *       │   │   ├── Wheezy_Body_Ellipsoid       (OBJECT 1)
 *       │   │   └── Wheezy_Belly_Ellipsoid      (perut krem)
 *       │   ├── Wheezy_Head                <- Rotate Y (menoleh)        ** PARENT seluruh wajah **
 *       │   │   ├── Wheezy_Head_Ellipsoid
 *       │   │   ├── Wheezy_Eye_R / _L
 *       │   │   │   ├── Wheezy_EyeWhite
 *       │   │   │   └── Wheezy_Pupil_Pivot     <- Rotate Y (melirik)
 *       │   │   │       └── Wheezy_Pupil
 *       │   │   ├── Wheezy_Cheek_R / _L
 *       │   │   ├── Wheezy_Brow_R / _L         <- Translate Y + Rotate Z (alis naik & miring)
 *       │   │   │   └── Wheezy_Brow_Curve_R / _L    (3D CURVE)
 *       │   │   └── Wheezy_Beak (group)
 *       │   │       ├── Wheezy_Beak_Upper_Cone      (OBJECT 3)
 *       │   │       └── Wheezy_Beak_Lower_Pivot <- Rotate X (membuka paruh)
 *       │   │           └── Wheezy_Beak_Lower_Cone  (OBJECT 3)
 *       │   └── Wheezy_Wing_R / _L         <- Rotate Arbitrary Axis (mengepak)
 *       │       └── Wheezy_Wing_Mesh
 *       └── Wheezy_Foot_R / _L             <- Translate Y (melangkah)     (OBJECT 2)
 *
 *  Kenapa ada node "group" / "pivot" yang tidak punya mesh?
 *   - Scale pada parent SELALU ikut ke child. Supaya squash badan TIDAK membuat kepala
 *     & sayap ikut gepeng, squash ditaruh di node terpisah (Wheezy_Body_Squash) yang
 *     hanya berisi badan & perut.
 *   - Rotasi selalu terhadap titik asal (0,0,0) node itu sendiri. Supaya paruh bawah
 *     membuka dari pangkalnya (bukan dari tengah), dibuat node pivot di pangkal paruh.
 *
 * -------------------------------------------------------------------------------------
 *  CARA CEPAT DEMO HIERARKI TANPA MENGUBAH FILE (lewat Console browser, tekan F12)
 * -------------------------------------------------------------------------------------
 *   app.wheezy.head.position[1] = 2.8     // kepala naik -> mata, alis, pipi, paruh IKUT naik
 *   app.wheezy.head.position[2] = 0.6     // kepala maju -> semua isi wajah ikut maju
 *   app.wheezy.body.position[0] = 1.0     // badan geser  -> kepala & sayap ikut, kaki TIDAK
 *   app.controls.posX = -1                // Root geser   -> SELURUH Wheezy ikut
 *   (refresh halaman untuk kembali normal)
 *   Catatan: nilai .rotation ditimpa animasi tiap frame, jadi demo rotasi pakai [DEMO] di file.
 */

import { SceneNode } from '../../core/scene-node.js';
import { Quadrics } from '../../core/quadrics.js';
import { Curves } from '../../core/curves.js';
import { WebGLUtils } from '../../core/webgl-utils.js';
import { Vec3, Mat4 } from '../../core/math3d.js';

export class Wheezy {
    constructor(gl) {
        this.gl = gl;

        // [RUBRIK: HIERARKI] ROOT = parent paling atas. Semua bagian Wheezy adalah keturunannya.
        this.root = new SceneNode("Wheezy_Root");
        this.buildModel();
    }

    buildModel() {
        const gl = this.gl;

        // =================================================================================
        // GEOMETRI DASAR
        // Setiap bentuk dibuat SEKALI di titik asal dengan ukuran satuan (1.0).
        // Ukuran & posisi sebenarnya diatur nanti lewat node.scale & node.position,
        // jadi satu buffer bisa dipakai berkali-kali (badan, kepala, mata, pipi, sayap).
        // =================================================================================

        // Ellipsoid satuan: x² + y² + z² = 1  -> dipakai badan, perut, kepala, mata, pipi, sayap
        const sphereGeom = Quadrics.createEllipsoid(1.0, 1.0, 1.0, 40, 56);

        // Elliptic Paraboloid terbalik: x² + z² = y / c, dengan c = -1 (kubah) -> dipakai kaki
        const paraboloidGeom = Quadrics.createEllipticParaboloid(1.0, 1.0, -1.0, 24, 40);

        // Elliptic Cone satuan: alas di y = 0, puncak di y = 1 -> dipakai paruh
        const coneGeom = Quadrics.createCone(1.0, 1.0, 32);

        // Disk (lingkaran datar, BUKAN quadric) -> dipakai bayangan
        const shadowDiskGeom = Quadrics.createDisk(1.0, 1.0, 1, 56);

        // Kirim geometri ke GPU (vertex buffer + normal buffer + index buffer)
        this.sphereBuf = WebGLUtils.createMeshBuffers(gl, sphereGeom);
        this.paraboloidBuf = WebGLUtils.createMeshBuffers(gl, paraboloidGeom);
        this.coneBuf = WebGLUtils.createMeshBuffers(gl, coneGeom);
        const shadowDiskBuf = WebGLUtils.createMeshBuffers(gl, shadowDiskGeom);

        // Palet warna Wheezy: [merah, hijau, biru, alpha], rentang 0 - 1
        // [DEMO] warna: ganti nilai di sini, misalnya body: [0.2, 0.4, 0.9, 1.0] -> badan jadi biru
        this.colors = {
            body: [0.03, 0.03, 0.04, 1.0],   // hitam pekat (badan, kepala, sayap)
            belly: [1.00, 0.97, 0.90, 1.0],  // krem
            beak: [1.00, 0.56, 0.16, 1.0],   // oranye
            feet: [1.00, 0.50, 0.14, 1.0],   // oranye
            brow: [0.08, 0.08, 0.12, 1.0],   // hitam kebiruan
            eye: [0.99, 0.99, 0.97, 1.0],    // putih
            pupil: [0.05, 0.06, 0.10, 1.0],  // hitam
            cheek: [1.00, 0.55, 0.60, 1.0]   // merah muda
        };

        // =================================================================================
        // 0. BAYANGAN DI LANTAI (soft contact shadow)
        // Disk transparan + unlit (tanpa pencahayaan). Child langsung dari Root,
        // BUKAN dari Wheezy_Jump, supaya tetap menempel di lantai saat Wheezy melompat.
        // =================================================================================
        this.shadow = new SceneNode("Wheezy_Shadow");
        this.shadow.buffers = shadowDiskBuf;
        this.shadow.baseColor = [0.25, 0.14, 0.06, 1.0];
        this.shadow.opacity = 0.25;
        this.shadow.isTransparent = true;
        this.shadow.unlit = true;
        this.shadow.position = Vec3.create(0.0, 0.04, 0.08);
        this.shadow.scale = Vec3.create(1.15, 1.0, 1.0);
        this.root.addChild(this.shadow);

        // =================================================================================
        // 1. BADAN (group node, tanpa mesh) - PARENT dari kepala dan sayap
        // =================================================================================
        // [RUBRIK: HIERARKI] Wheezy_Body adalah parent dari kepala & kedua sayap.
        //   [DEMO] hierarki badan: setelah baris "this.body = new SceneNode(...)" di bawah,
        //          tambahkan:   this.body.position = Vec3.create(1.0, 0, 0);
        //          -> kepala, mata, paruh, dan kedua sayap ikut bergeser ke kanan,
        //             tetapi kaki TIDAK ikut (kaki bukan child dari badan).
        this.body = new SceneNode("Wheezy_Body");
        this.root.addChild(this.body);   // (nanti dipindah ke Wheezy_Jump di langkah 5)

        // Node khusus squash-stretch: hanya berisi badan & perut, jadi kepala tidak ikut gepeng
        this.bodySquash = new SceneNode("Wheezy_Body_Squash");
        this.body.addChild(this.bodySquash);

        // ---------------------------------------------------------------------------------
        // [RUBRIK: OBJECT 1]  BADAN = ELLIPSOID
        //   Persamaan:  x²/0.92² + y²/1.15² + z²/0.82² = 1
        //   Rumus parametrik (quadrics.js -> createEllipsoid):
        //     x = a·cos(v)·cos(u),  y = b·sin(v),  z = c·cos(v)·sin(u)
        //   Pusat di (0, 1.15, 0) dan jari-jari tinggi 1.15 -> bagian bawah tepat di lantai (y = 0)
        //   [DEMO] ukuran badan: ganti scale menjadi (1.3, 1.15, 0.82) -> badan lebih gemuk
        // ---------------------------------------------------------------------------------
        this.bodyMesh = new SceneNode("Wheezy_Body_Ellipsoid");
        this.bodyMesh.buffers = this.sphereBuf;
        this.bodyMesh.baseColor = this.colors.body;
        this.bodyMesh.shininess = 40.0;
        this.bodyMesh.position = Vec3.create(0, 1.15, 0);
        this.bodyMesh.scale = Vec3.create(0.92, 1.15, 0.82);      // (a, b, c) jari-jari ellipsoid
        this.bodyMesh.quadricType = "Ellipsoid";
        this.bodyMesh.quadricEquation = "x²/0.92² + y²/1.15² + z²/0.82² = 1 (Badan)";
        this.bodySquash.addChild(this.bodyMesh);

        // Perut krem: ellipsoid lebih pipih yang menempel di depan badan
        const belly = new SceneNode("Wheezy_Belly_Ellipsoid");
        belly.buffers = this.sphereBuf;
        belly.baseColor = this.colors.belly;
        belly.shininess = 30.0;
        belly.position = Vec3.create(0, 1.0, 0.34);
        belly.scale = Vec3.create(0.68, 0.86, 0.52);
        this.bodySquash.addChild(belly);

        // =================================================================================
        // 2. KEPALA (Ellipsoid) - PARENT dari mata, pipi, alis, dan paruh
        // =================================================================================
        // [RUBRIK: HIERARKI]  ** DEMO HIERARKI PALING JELAS **
        //   [DEMO] hierarki kepala: ubah baris "this.head.position = Vec3.create(0, 2.15, 0);"
        //          menjadi           this.head.position = Vec3.create(0, 2.8, 0);
        //          -> kepala naik, dan MATA, ALIS, PIPI, PARUH ikut naik,
        //             padahal posisi mereka sendiri tidak diubah sama sekali.
        //          Ini bukti bahwa semuanya adalah CHILD dari kepala.
        this.head = new SceneNode("Wheezy_Head");
        this.head.position = Vec3.create(0, 2.15, 0);
        this.body.addChild(this.head);   // kepala = child dari badan

        const headMesh = new SceneNode("Wheezy_Head_Ellipsoid");
        headMesh.buffers = this.sphereBuf;
        headMesh.baseColor = this.colors.body;
        headMesh.shininess = 40.0;
        headMesh.scale = Vec3.create(0.62, 0.56, 0.58);   // sedikit gepeng di y, paling lebar di x
        headMesh.quadricType = "Ellipsoid";
        headMesh.quadricEquation = "x²/0.62² + y²/0.56² + z²/0.58² = 1 (Kepala)";
        this.head.addChild(headMesh);

        // Mata & pipi (side = 1 kanan, -1 kiri -> posisi x dicerminkan)
        // Posisi mata/pipi ditulis RELATIF terhadap pusat kepala, bukan posisi dunia.
        this.eyes = [this.buildEye(1, 0.0), this.buildEye(-1, 0.0)];
        [1, -1].forEach((side) => {
            const cheek = new SceneNode(side === 1 ? "Wheezy_Cheek_R" : "Wheezy_Cheek_L");
            cheek.buffers = this.sphereBuf;
            cheek.baseColor = this.colors.cheek;
            cheek.shininess = 10.0;
            cheek.position = Vec3.create(0.33 * side, -0.1, 0.47);
            cheek.rotation = Vec3.create(0, 0.6 * side, 0);
            cheek.scale = Vec3.create(0.09, 0.055, 0.04);
            this.head.addChild(cheek);   // pipi = child dari kepala
        });

        this.buildEyebrows();   // 3D CURVE
        this.buildBeak();       // OBJECT 3

        // =================================================================================
        // 3. SAYAP - child dari badan, mengepak dengan Rotate Arbitrary Axis di bahu
        // =================================================================================
        this.wings = [this.buildWing(1), this.buildWing(-1)];

        // =================================================================================
        // 4. KAKI (OBJECT 2: Elliptic Paraboloid)
        // Kaki BUKAN child dari badan, supaya tetap menapak di lantai saat badan squash.
        // =================================================================================
        this.feet = [this.buildFoot(1, 0.0), this.buildFoot(-1, Math.PI)];

        // =================================================================================
        // 5. NODE LOMPAT - parent dari badan & kaki
        // Badan & kaki dipindah ke bawah Wheezy_Jump, sehingga saat node ini melompat /
        // berputar / penyet, badan + kepala + sayap + kaki ikut semua.
        // Bayangan tidak ikut dipindah, jadi tetap di lantai.
        // hasCustomLocalMatrix = true -> matriksnya disusun manual di update().
        // =================================================================================
        this.jump = new SceneNode("Wheezy_Jump");
        this.jump.hasCustomLocalMatrix = true;
        this.root.addChild(this.jump);
        this.jump.addChild(this.body);                                   // addChild otomatis melepas dari parent lama
        for (const foot of this.feet) this.jump.addChild(foot.node);
    }

    /**
     * MATA: bola putih (ellipsoid) + pupil (ellipsoid kecil).
     * side = 1 kanan, -1 kiri.
     * Hierarki: Kepala -> Eye -> (EyeWhite, PupilPivot -> Pupil)
     */
    buildEye(side, phase) {
        const tag = side === 1 ? "R" : "L";

        const eye = new SceneNode(`Wheezy_Eye_${tag}`);
        eye.position = Vec3.create(0.2 * side, 0.1, 0.46);   // relatif pusat kepala
        this.head.addChild(eye);

        const white = new SceneNode(`Wheezy_EyeWhite_${tag}`);
        white.buffers = this.sphereBuf;
        white.baseColor = this.colors.eye;
        white.shininess = 90.0;
        white.scale = Vec3.create(0.13, 0.16, 0.09);
        eye.addChild(white);

        // Pivot di pusat mata -> saat pivot diputar (Rotate Y), pupil bergerak MEMUTARI bola mata
        const pupilPivot = new SceneNode(`Wheezy_Pupil_Pivot_${tag}`);
        eye.addChild(pupilPivot);

        const pupil = new SceneNode(`Wheezy_Pupil_${tag}`);
        pupil.buffers = this.sphereBuf;
        pupil.baseColor = this.colors.pupil;
        pupil.shininess = 120.0;
        pupil.position = Vec3.create(0, -0.01, 0.075);   // sedikit di depan pusat mata
        pupil.scale = Vec3.create(0.065, 0.085, 0.035);
        pupilPivot.addChild(pupil);

        return { pupilPivot, phase };
    }

    /**
     * ---------------------------------------------------------------------------------
     * [RUBRIK: 3D CURVE]  ALIS = CUBIC BEZIER -> TABUNG
     * ---------------------------------------------------------------------------------
     * Rumus Cubic Bezier (curves.js -> evaluateCubicBezier):
     *   B(t) = (1-t)³·P0 + 3(1-t)²t·P1 + 3(1-t)t²·P2 + t³·P3 ,   t ∈ [0, 1]
     *   P0 = titik awal, P3 = titik akhir, P1 & P2 = titik kontrol yang "menarik" lengkungan.
     *
     * Langkah:
     *   1. 4 titik kontrol -> 24 titik di sepanjang kurva (createBezierPoints)
     *   2. Titik-titik itu dijadikan TABUNG (createTubeFromPoints) dengan parallel transport
     *      frame, supaya tabung tidak terpelintir.
     *   3. Jari-jari tabung: r(t) = 0.012 + 0.022·sin(π·t) -> tebal di tengah, tipis di ujung.
     *
     * Kurvanya benar-benar 3D: melengkung ke ATAS (y) sekaligus ke BELAKANG mengikuti
     * kepala (z mengecil ke arah luar), bukan garis datar.
     *
     * [DEMO] bentuk kurva: ubah p1 dan p2 menjadi  [0.15*side, 0.48, 0.47]  dan  [0.26*side, 0.49, 0.41]
     *        -> alis melengkung lebih tinggi (seperti terkejut)
     */
    buildEyebrows() {
        const gl = this.gl;
        this.brows = [];

        [1, -1].forEach((side) => {
            const tag = side === 1 ? "R" : "L";

            // Pivot alis di tengah alis (relatif pusat kepala), supaya alis naik & miring dari tengahnya
            const center = [0.2 * side, 0.35, 0.44];
            const brow = new SceneNode(`Wheezy_Brow_${tag}`);
            brow.position = Vec3.create(...center);
            this.head.addChild(brow);   // alis = child dari kepala (ikut saat kepala menoleh)

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

            const curve = new SceneNode(`Wheezy_Brow_Curve_${tag}`);
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
     * ---------------------------------------------------------------------------------
     * [RUBRIK: OBJECT 3]  PARUH = ELLIPTIC CONE  (quadric selain ellipsoid & cylinder)
     * ---------------------------------------------------------------------------------
     * Persamaan:  x²/a² + z²/b² = Y²/h²      (Y diukur dari puncak kerucut)
     * Rumus parametrik (quadrics.js -> createCone), v ∈ [-1, 0]:
     *   x = r·v·cos(u),   z = r·v·sin(u),   y = h + h·v
     *
     * Cone dibuat tegak di +Y, lalu diputar ±90° di sumbu X supaya menunjuk ke depan (+Z).
     * scale: x = lebar paruh, y = panjang paruh, z = tebal paruh (setelah diputar jadi atas-bawah).
     * Hierarki: Kepala -> Beak -> (Upper_Cone, Lower_Pivot -> Lower_Cone)
     *
     * [DEMO] panjang paruh: ubah scale paruh atas menjadi (0.17, 0.8, 0.1) -> paruh jadi panjang
     */
    buildBeak() {
        this.beak = new SceneNode("Wheezy_Beak");
        this.beak.position = Vec3.create(0, -0.08, 0.48);   // relatif pusat kepala
        this.head.addChild(this.beak);                       // paruh = child dari kepala

        this.beakUpper = new SceneNode("Wheezy_Beak_Upper_Cone");
        this.beakUpper.buffers = this.coneBuf;
        this.beakUpper.baseColor = this.colors.beak;
        this.beakUpper.shininess = 60.0;
        this.beakUpper.position = Vec3.create(0, 0.03, 0);
        this.beakUpper.rotation = Vec3.create(Math.PI / 2 + 0.1, 0, 0);   // Rotate X ~90° -> menunjuk ke depan
        this.beakUpper.scale = Vec3.create(0.17, 0.42, 0.1);
        this.beakUpper.quadricType = "Elliptic Cone";
        this.beakUpper.quadricEquation = "x²/a² + z²/b² = Y²/h² (Paruh Atas)";
        this.beak.addChild(this.beakUpper);

        // Pivot di pangkal paruh bawah -> saat pivot diputar (Rotate X), paruh membuka dari pangkalnya
        this.beakLowerPivot = new SceneNode("Wheezy_Beak_Lower_Pivot");
        this.beakLowerPivot.position = Vec3.create(0, -0.02, 0);
        this.beak.addChild(this.beakLowerPivot);

        const beakLower = new SceneNode("Wheezy_Beak_Lower_Cone");
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
     * SAYAP: ellipsoid pipih yang digantung di node bahu.
     * Node bahu memakai custom local matrix:  Translate(bahu) · RotateArbitraryAxis(sumbu, sudut)
     * Matriksnya diisi setiap frame di update() (lihat [RUBRIK: ARBITRARY AXIS]).
     * Hierarki: Badan -> Wing (bahu) -> Wing_Mesh
     */
    buildWing(side) {
        const tag = side === 1 ? "R" : "L";

        const wing = new SceneNode(`Wheezy_Wing_${tag}`);
        wing.position = Vec3.create(0.84 * side, 1.62, 0.0);   // titik bahu (poros kepakan)
        wing.hasCustomLocalMatrix = true;
        this.body.addChild(wing);   // sayap = child dari badan

        const wingMesh = new SceneNode(`Wheezy_Wing_Mesh_${tag}`);
        wingMesh.buffers = this.sphereBuf;
        wingMesh.baseColor = this.colors.body;
        wingMesh.shininess = 40.0;
        wingMesh.position = Vec3.create(0.1 * side, -0.45, 0.0);   // menggantung di bawah bahu
        wingMesh.rotation = Vec3.create(0, 0, 0.22 * side);
        wingMesh.scale = Vec3.create(0.11, 0.52, 0.3);
        wing.addChild(wingMesh);

        // Sumbu putar MIRING (bukan X, Y, atau Z murni): hampir searah depan, sedikit ke atas & ke luar
        // [DEMO] sumbu sayap: ganti [0.25 * side, 0.3, 1.0] menjadi [0, 0, 1] -> kepakan lurus (sumbu Z biasa)
        return { node: wing, side, axis: [0.25 * side, 0.3, 1.0] };
    }

    /**
     * ---------------------------------------------------------------------------------
     * [RUBRIK: OBJECT 2]  KAKI = ELLIPTIC PARABOLOID
     * ---------------------------------------------------------------------------------
     * Persamaan:  x²/a² + z²/b² = y/c     dengan c NEGATIF -> mangkuk terbalik (kubah)
     * Rumus parametrik (quadrics.js -> createEllipticParaboloid), v ∈ [0, 1]:
     *   x = a·v·cos(u),   z = b·v·sin(u),   y = c·v²
     *
     * Puncak di titik asal, terbuka ke bawah sampai y = -1. Di-scale sangat pipih
     * (tinggi 0.12) sehingga menjadi telapak kaki yang lebar dan membulat.
     *
     * [DEMO] bentuk kaki: ganti scale menjadi (0.24, 0.4, 0.4) -> bentuk mangkuk paraboloid terlihat jelas
     */
    buildFoot(side, phase) {
        const tag = side === 1 ? "R" : "L";

        const foot = new SceneNode(`Wheezy_Foot_${tag}`);
        foot.buffers = this.paraboloidBuf;
        foot.baseColor = this.colors.feet;
        foot.shininess = 50.0;
        foot.position = Vec3.create(0.34 * side, 0.12, 0.32);
        foot.rotation = Vec3.create(0, 0.22 * side, 0);   // ujung kaki sedikit menghadap keluar
        foot.scale = Vec3.create(0.24, 0.12, 0.4);
        foot.quadricType = "Elliptic Paraboloid";
        foot.quadricEquation = "x²/0.24² + z²/0.4² = y/(-0.12) (Telapak Kaki)";
        this.root.addChild(foot);   // (nanti dipindah ke Wheezy_Jump)

        return { node: foot, phase };
    }

    /**
     * Profil satu lompatan, u = 0..1 dari awal sampai akhir lompatan.
     * Mengembalikan tinggi (y), skala (sy, sxz), dan progres di udara (air).
     *   0.00 - 0.15 : ancang-ancang -> penyet di lantai (y kecil, x/z melebar)
     *   0.15 - 0.75 : melayang      -> naik-turun membentuk busur sin, badan memanjang
     *   0.75 - 0.90 : mendarat      -> penyet lagi
     */
    jumpProfile(u, height) {
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

    /**
     * =====================================================================================
     * UPDATE - dipanggil setiap frame dari main.js.  time = waktu animasi (detik)
     * =====================================================================================
     * Urutan animasi berulang setiap 12 detik:
     *   0  - 6 s   : jalan bergoyang biasa
     *   6  - 8 s   : lompat 1 + putar 360° di sumbu Y               (ROTATE)
     *   8  - 10.4 s: lompat 2 lebih tinggi + putar 360° di sumbu miring [1, 1, 0.5]  (ARBITRARY AXIS)
     *   10.4 - 12 s: kembali jalan biasa
     * Setiap lompatan: penyet sebelum lompat -> memanjang di udara -> penyet saat mendarat (SCALING)
     */
    update(time, controls) {
        const t = time;

        // ---------------------------------------------------------------------------------
        // LOMPAT & PUTAR (node Wheezy_Jump)
        // ---------------------------------------------------------------------------------
        const cycleT = t % 12.0;
        let jumpY = 0.0, sy = 1.0, sxz = 1.0, spinY = 0.0, spinArb = 0.0, jumping = false;
        if (cycleT >= 6.0 && cycleT < 8.0) {
            // Lompat 1: setinggi 1.1, putar 360° di sumbu Y
            const j = this.jumpProfile((cycleT - 6.0) / 2.0, 1.1);
            jumpY = j.y; sy = j.sy; sxz = j.sxz; jumping = true;
            spinY = (0.5 - 0.5 * Math.cos(j.air * Math.PI)) * 2 * Math.PI;   // 0 -> 2π, halus di awal & akhir
        } else if (cycleT >= 8.0 && cycleT < 10.4) {
            // Lompat 2: setinggi 1.8, putar 360° di sumbu MIRING sembarang [1, 1, 0.5]
            const j = this.jumpProfile((cycleT - 8.0) / 2.4, 1.8);
            jumpY = j.y; sy = j.sy; sxz = j.sxz; jumping = true;
            spinArb = (0.5 - 0.5 * Math.cos(j.air * Math.PI)) * 2 * Math.PI;
        }

        // Matriks lokal Wheezy_Jump disusun manual (dibaca dari KANAN ke KIRI):
        //   M = T(0, y, 0) · RotateY(spinY) · S(sxz, sy, sxz) · T(0, 1.3, 0) · R(sumbu, spinArb) · T(0, -1.3, 0)
        //
        //   [RUBRIK: TRANSLATE]       T(0, y, 0)            -> naik saat melompat
        //   [RUBRIK: ROTATE]          RotateY(spinY)        -> putar 360° di lompatan 1
        //   [RUBRIK: SCALING]         S(sxz, sy, sxz)       -> penyet / memanjang (squishy)
        //   [RUBRIK: ARBITRARY AXIS]  T·R(sumbu)·T⁻¹        -> putar di sumbu miring [1, 1, 0.5]
        //                             yang porosnya di tengah badan (y = 1.3), bukan di lantai.
        //   Rumus rotasi sumbu sembarang (Rodrigues) ada di math3d.js -> Mat4.rotateArbitraryAxis:
        //     R = cosθ·I + (1 - cosθ)·u·uᵀ + sinθ·[u]×
        //
        // [DEMO] sumbu putar lompatan 2: ganti [1.0, 1.0, 0.5] menjadi [1, 0, 0]
        //        -> Wheezy salto ke depan (sumbu X biasa), bandingkan dengan sumbu miring
        const jm = this.jump.localMatrix;
        Mat4.identity(jm);
        Mat4.translate(jm, jm, [0, jumpY, 0]);
        Mat4.rotateY(jm, jm, spinY);
        Mat4.scale(jm, jm, [sxz, sy, sxz]);
        Mat4.translate(jm, jm, [0, 1.3, 0]);
        Mat4.rotateArbitraryAxis(jm, jm, spinArb, [1.0, 1.0, 0.5]);
        Mat4.translate(jm, jm, [0, -1.3, 0]);

        // Bayangan mengecil & memudar saat Wheezy di udara
        const shadowK = 1.0 - Math.min(1, jumpY / 1.8) * 0.45;
        this.shadow.scale = Vec3.create(1.15 * shadowK, 1.0, 1.0 * shadowK);
        this.shadow.opacity = 0.25 * shadowK;

        // ---------------------------------------------------------------------------------
        // [RUBRIK: TRANSLATE]  [RUBRIK: SCALING]  [RUBRIK: ROTATE]   -> pada ROOT (seluruh Wheezy)
        // ---------------------------------------------------------------------------------
        // Translate X: controls.posX (tombol panah) + sin(0.6t)·0.8 (bergeser kiri-kanan otomatis)
        // Scaling    : controls.scale (tombol + / -), sama di x, y, z
        // Rotate Z   : sin(4t)·0.06 -> jalan bergoyang khas penguin
        //
        // [DEMO] hierarki root: ganti 0.06 menjadi 0.4 -> SELURUH Wheezy (badan, kepala, sayap, kaki)
        //        bergoyang miring bersama, karena semuanya keturunan Root
        // [DEMO] translate: ganti 0.0 (posisi y) menjadi 1.5 -> seluruh Wheezy melayang
        this.root.position = Vec3.create(controls.posX + Math.sin(t * 0.6) * 0.8, 0.0, controls.posZ);
        this.root.scale = Vec3.create(controls.scale, controls.scale, controls.scale);
        this.root.rotation[2] = Math.sin(t * 4) * 0.06;

        // ---------------------------------------------------------------------------------
        // [RUBRIK: SCALING]  BADAN SQUASH-STRETCH (x & z melebar saat y memendek)
        // Hanya node Wheezy_Body_Squash -> kepala & sayap tidak ikut gepeng.
        // [DEMO] ganti 0.04 menjadi 0.3 -> badan memantul gepeng-panjang dengan jelas
        // ---------------------------------------------------------------------------------
        const squash = jumping ? 0.0 : Math.sin(t * 8);
        this.bodySquash.scale = Vec3.create(1 + 0.03 * squash, 1 - 0.04 * squash, 1 + 0.03 * squash);

        // ---------------------------------------------------------------------------------
        // [RUBRIK: ROTATE] + [RUBRIK: HIERARKI]  KEPALA MENOLEH (Rotate Y)
        // [DEMO] ganti 0.3 menjadi 1.2 -> kepala menoleh jauh, dan mata, alis, pipi, paruh
        //        ikut berputar bersama kepala (karena child dari kepala)
        // ---------------------------------------------------------------------------------
        this.head.rotation[1] = Math.sin(t * 0.8) * 0.3;

        // [RUBRIK: ROTATE]  PARUH BAWAH MEMBUKA-MENUTUP (Rotate X di pivot pangkal paruh)
        // [DEMO] ganti 0.35 menjadi 1.0 -> paruh membuka lebar
        this.beakLowerPivot.rotation[0] = Math.max(0, Math.sin(t * 2.5)) * 0.35;

        // [RUBRIK: TRANSLATE] + [RUBRIK: ROTATE]  ALIS naik-turun (Translate Y) & miring (Rotate Z)
        const browLift = Math.max(0, Math.sin(t * 1.5));
        for (const brow of this.brows) {
            brow.node.position[1] = brow.baseY + browLift * 0.04;
            brow.node.rotation[2] = brow.side * browLift * 0.12;
        }

        // [RUBRIK: ROTATE]  PUPIL MELIRIK kiri-kanan (Rotate Y di pivot pusat mata)
        for (const eye of this.eyes) {
            eye.pupilPivot.rotation[1] = Math.sin(t * 1.1 + eye.phase) * 0.4;
        }

        // ---------------------------------------------------------------------------------
        // [RUBRIK: ARBITRARY AXIS]  SAYAP MENGEPAK
        // localMatrix bahu = Translate(bahu) · R(sumbu miring wing.axis, sudut)
        // Sumbu miring didefinisikan di buildWing() -> [0.25·side, 0.3, 1.0]
        // [DEMO] ganti 0.35 menjadi 1.0 -> kepakan sayap sangat lebar
        // ---------------------------------------------------------------------------------
        for (const wing of this.wings) {
            const flap = jumping ? 0.7 : 0.35;   // saat melompat sayap mengepak lebih lebar
            const angle = (0.15 + Math.sin(t * (jumping ? 9 : 5)) * flap) * wing.side;
            const m = wing.node.localMatrix;
            Mat4.identity(m);
            Mat4.translate(m, m, wing.node.position);
            Mat4.rotateArbitraryAxis(m, m, angle, wing.axis);
        }

        // [RUBRIK: TRANSLATE]  KAKI terangkat bergantian (melangkah), fase kiri & kanan berselisih π
        for (const foot of this.feet) {
            foot.node.position[1] = jumping ? 0.12 : 0.12 + Math.max(0, Math.sin(t * 4 + foot.phase)) * 0.12;
        }

        // ---------------------------------------------------------------------------------
        // [RUBRIK: HIERARKI]  Hitung ulang SEMUA matriks dunia dari Root ke bawah.
        // SceneNode.update() menghitung World = ParentWorld × Local secara rekursif
        // (lihat js/core/scene-node.js, fungsi update).
        // Urutan: Root -> Jump -> Body -> Head -> (Mata, Alis, Paruh), Body -> Sayap, Jump -> Kaki
        // ---------------------------------------------------------------------------------
        this.root.update(time);
    }
}
