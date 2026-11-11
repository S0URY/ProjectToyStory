/**
 * alien.js - Toy Story Little Green Men (Squeeze Toy Alien) Character Model & Animations
 * Meticulously modeled with Pure Parametric Quadrics & 3D Curves!
 * 
 * 3D Curves & Quadrics Used Strictly to Specification:
 * 1. Kepala: Ellipsoid (Wide oblong alien head dome)
 * 2. Bola Mata: Ellipsoid (3 iconic glossy white eyes with purple-black pupils)
 * 3. Badan: Ellipsoid & Cylinder (Plump royal blue jumpsuit body & belt)
 * 4. Telinga: Cone & Paraboloid (Elliptic Paraboloid inner cup & Cone pointed outer ear)
 * 5. Antena: 3D Cubic Bézier Curve (Batang melengkung anggun ke belakang & meruncing organik ke bola apex)
 * 6. Mulut: 3D Cubic Bézier Curve (Lengkungan senyum ramah khas Little Green Men)
 * 7. Leher atau Aksesori: Hyperboloid Satu Lembar (Flared Imperial Purple astronaut neck collar)
 * 8. Tangan dan Kaki: Cylinder & Ellipsoid (Cylinder sleeves/legs, Ellipsoid 3-fingered hands & space boots)
 */

import { SceneNode } from '../../core/scene-node.js';
import { Quadrics } from '../../core/quadrics.js';
import { Curves } from '../../core/curves.js';
import { WebGLUtils } from '../../core/webgl-utils.js';
import { Vec3, Mat4 } from '../../core/math3d.js';

export class Alien {
    constructor(gl) {
        this.gl = gl;

        this.root = new SceneNode("LGM_Root");
        // Ukuran Root / Karakter Keseluruhan
        this.root.scale = Vec3.create(0.45, 0.45, 0.45);
        // Posisi Root / Karakter Keseluruhan
        this.root.position = Vec3.create(1.0, 0.0, 0.0);

        // Dynamic animation properties
        this.eyeBlink = 1.0;
        this.eyelids = [];


        this.buildModel();
    }

    buildModel() {
        const gl = this.gl;

        // =========================================================================
        // High-Tessellation Parametric Quadrics & Buffers
        // =========================================================================
        // 1. Kepala & Badan: Ellipsoids
        const headEllipsoidGeom = Quadrics.createEllipsoid(1.36, 0.90, 1.08, 40, 48);
        const bodyEllipsoidGeom = Quadrics.createEllipsoid(1.08, 1.18, 0.96, 36, 42);
        const eyeEllipsoidGeom = Quadrics.createEllipsoid(0.21, 0.25, 0.19, 32, 36);
        // Kelopak mata atas mengantuk santai (Sleepy hooded upper eyelid ellipsoid cap - tinggi & ceria)
        const eyelidHoodGeom = Quadrics.createEyelidHood(0.21, 0.25, 0.19, 0.12, 0.016, 22, 36, 0.035);
        const footEllipsoidGeom = Quadrics.createEllipsoid(0.38, 0.22, 0.58, 30, 36);
        const handPalmGeom = Quadrics.createEllipsoid(0.24, 0.20, 0.15, 28, 32);
        const fingerCylinderGeom = Quadrics.createCylinder(0.080, 1.0, 24, true);
        const fingerTipGeom = Quadrics.createEllipsoid(0.080, 0.092, 0.080, 24, 28);
        const fingerKnuckleGeom = Quadrics.createEllipsoid(0.084, 0.084, 0.084, 20, 24);

        // 2. 3D Parametric Cubic Bézier Curve untuk Batang Antena Organik
        // Melengkung anggun ke belakang dan meruncing halus (organic tapering) ke ujung bola
        const antennaP0 = [0.0, 0.0, 0.0];
        const antennaP1 = [0.0, 0.45, -0.09];
        const antennaP2 = [0.0, 0.90, -0.16];
        const antennaP3 = [0.0, 1.25, -0.10];
        const antennaBezierGeom = Curves.createCubicBezierTube(
            antennaP0, antennaP1, antennaP2, antennaP3,
            36,     // 36 subdivisi sepanjang kurva (sangat halus)
            0.078,  // Jari-jari dasar di kepala
            (tRatio, baseR) => baseR * (1.0 - 0.50 * tRatio), // Tapering halus dari 0.078 ke 0.039
            18      // 18 segmen melingkar
        );

        // 3D Parametric Cubic Bézier Curve untuk Garis Senyum Lebar Ramah (Single Line Smile)
        // Dihitung dengan proyeksi presisi pada permukaan kepala ellipsoid (a=1.36, b=0.90, c=1.08)
        const headSurfaceZ = (x, y, offset = 0.008) => {
            const val = 1.0 - (x * x) / (1.36 * 1.36) - (y * y) / (0.90 * 0.90);
            return 1.08 * Math.sqrt(Math.max(0.005, val)) + offset;
        };

        // Posisi Titik Kontrol Kurva Mulut (Bézier Control Points untuk bentuk dan posisi lengkungan senyum)
        const mouthP0 = [-0.52, -0.32, 0];
        const mouthP1 = [-0.18, -0.44, 0];
        const mouthP2 = [0.18, -0.44, 0];
        const mouthP3 = [0.52, -0.32, 0];

        const mouthPts = [];
        const mouthSegments = 28;
        for (let i = 0; i <= mouthSegments; ++i) {
            const t = i / mouthSegments;
            const pt = Curves.evaluateCubicBezier(mouthP0, mouthP1, mouthP2, mouthP3, t);
            const x = pt[0];
            const y = pt[1];
            const z = headSurfaceZ(x, y, 0.008);
            mouthPts.push([x, y, z]);
        }

        // Ukuran Ketebalan Garis Mulut (Radius kurva tabung senyum = 0.024)
        const mouthBezierGeom = Curves.createTubeFromPoints(
            mouthPts, 0.024, 12,
            (tRatio, baseR) => baseR * (0.65 + 0.40 * Math.sin(tRatio * Math.PI))
        );
        mouthBezierGeom.type = "3D Cubic Bezier Curve";
        mouthBezierGeom.controlPoints = [mouthP0, mouthP1, mouthP2, mouthP3];

        // Cone untuk Ujung Telinga
        const earConeGeom = Quadrics.createCone(0.35, 0.032, 0.88, 32, 36, true);

        // 3. Elliptic Paraboloid untuk Cup/Rongga Telinga Little Green Men
        const earParaboloidGeom = Quadrics.createEllipticParaboloid(0.24, 0.34, 0.09, false, 28, 32);

        // 4. Hyperboloid of 1 Sheet untuk Kerah Leher Astronot Ungu (Iconic Neck Collar)
        // Flared hourglass ring narrowing at waist and opening up/down
        const neckHyperboloidGeom = Quadrics.createHyperboloid1Sheet(0.70, 0.70, 0.78, -0.32, 0.32, 32, 40, 0.10);

        // 5. Cylinder untuk Lengan, Kaki, Sabuk Pinggang, dan Pergelangan
        const armCylinderGeom = Quadrics.createCylinder(0.22, 0.56, 30, true);
        const forearmCylinderGeom = Quadrics.createCylinder(0.20, 0.50, 30, true);
        const legCylinderGeom = Quadrics.createCylinder(0.33, 0.54, 30, true);
        const beltCylinderGeom = Quadrics.createCylinder(1.04, 0.16, 36, true);
        const cuffCylinderGeom = Quadrics.createCylinder(0.24, 0.08, 28, true);

        // 6. Sphere untuk Bulb Ujung Antena, Pupil Mata, dan Sendi Bahu/Lutut
        const sphereGeom = Quadrics.createStacksSectorsSphere(1.0, 32, 36);

        // WebGL Mesh Buffers
        const headEllipsoidBuf = WebGLUtils.createMeshBuffers(gl, headEllipsoidGeom);
        const bodyEllipsoidBuf = WebGLUtils.createMeshBuffers(gl, bodyEllipsoidGeom);
        const eyeEllipsoidBuf = WebGLUtils.createMeshBuffers(gl, eyeEllipsoidGeom);
        const eyelidHoodBuf = WebGLUtils.createMeshBuffers(gl, eyelidHoodGeom);
        const footEllipsoidBuf = WebGLUtils.createMeshBuffers(gl, footEllipsoidGeom);
        const handPalmBuf = WebGLUtils.createMeshBuffers(gl, handPalmGeom);
        const fingerCylinderBuf = WebGLUtils.createMeshBuffers(gl, fingerCylinderGeom);
        const fingerTipBuf = WebGLUtils.createMeshBuffers(gl, fingerTipGeom);
        const fingerKnuckleBuf = WebGLUtils.createMeshBuffers(gl, fingerKnuckleGeom);

        const antennaBezierBuf = WebGLUtils.createMeshBuffers(gl, antennaBezierGeom);
        const mouthBezierBuf = WebGLUtils.createMeshBuffers(gl, mouthBezierGeom);
        const earConeBuf = WebGLUtils.createMeshBuffers(gl, earConeGeom);

        const earParaboloidBuf = WebGLUtils.createMeshBuffers(gl, earParaboloidGeom);
        const neckHyperboloidBuf = WebGLUtils.createMeshBuffers(gl, neckHyperboloidGeom);

        const armCylinderBuf = WebGLUtils.createMeshBuffers(gl, armCylinderGeom);
        const forearmCylinderBuf = WebGLUtils.createMeshBuffers(gl, forearmCylinderGeom);
        const legCylinderBuf = WebGLUtils.createMeshBuffers(gl, legCylinderGeom);
        const beltCylinderBuf = WebGLUtils.createMeshBuffers(gl, beltCylinderGeom);
        const cuffCylinderBuf = WebGLUtils.createMeshBuffers(gl, cuffCylinderGeom);

        const sphereBuf = WebGLUtils.createMeshBuffers(gl, sphereGeom);

        // =========================================================================
        // Authentic Pixar Toy Story Little Green Men Color Palette (Solid Colors)
        // =========================================================================
        const alienGreen = [0.44, 0.82, 0.12, 1.0];        // Iconic vibrant lime green skin
        const alienDarkGreen = [0.32, 0.65, 0.08, 1.0];    // Inner ear & shadow green
        const suitBlue = [0.12, 0.38, 0.88, 1.0];          // Space suit cobalt blue
        const collarPurple = [0.55, 0.15, 0.82, 1.0];      // Neck collar royal imperial purple
        const beltNavy = [0.06, 0.10, 0.22, 1.0];          // Belt & boot dark midnight navy
        const buckleSilver = [0.85, 0.88, 0.95, 1.0];      // Metallic belt buckle
        const eyeWhite = [0.98, 0.98, 0.98, 1.0];          // Glossy eyeball sclera
        const pupilBlack = [0.06, 0.02, 0.09, 1.0];        // Deep purple-black pupil

        // =========================================================================
        // 1. BADAN (Parent Node: Ellipsoid Plump Blue Space Suit Jumpsuit)
        // Ketentuan: Badan -> Ellipsoid atau cylinder
        // =========================================================================
        this.body = new SceneNode("Alien_Body_Ellipsoid");
        this.body.buffers = bodyEllipsoidBuf;
        this.body.baseColor = suitBlue;
        this.body.shininess = 18.0;
        // Posisi Badan
        this.body.position = Vec3.create(0, 1.78, 0);
        // Ukuran Badan
        this.body.scale = Vec3.create(1.0, 1.0, 1.0);
        this.body.quadricType = "Ellipsoid";
        this.body.quadricEquation = "x²/1.08² + y²/1.18² + z²/0.96² = 1 (Badan Space Suit)";
        this.root.addChild(this.body);

        // Sabuk Pinggang (Cylinder Belt around torso)
        this.belt = new SceneNode("Alien_Belt_Cylinder");
        this.belt.buffers = beltCylinderBuf;
        this.belt.baseColor = beltNavy;
        this.belt.shininess = 30.0;
        // Posisi Sabuk Pinggang
        this.belt.position = Vec3.create(0, -0.32, 0);
        // Ukuran Sabuk Pinggang
        this.belt.scale = Vec3.create(1.02, 1.0, 1.02);
        this.belt.quadricType = "Cylinder";
        this.belt.quadricEquation = "x² + z² = r² (Sabuk Pinggang Astronot)";
        this.body.addChild(this.belt);

        // Kepala Gesper Sabuk (Belt Buckle)
        const buckle = new SceneNode("Alien_Belt_Buckle");
        buckle.buffers = sphereBuf;
        buckle.baseColor = buckleSilver;
        buckle.shininess = 90.0;
        // Posisi Gesper Sabuk
        buckle.position = Vec3.create(0, 0.0, 1.04);
        // Ukuran Gesper Sabuk
        buckle.scale = Vec3.create(0.18, 0.12, 0.06);
        this.belt.addChild(buckle);

        // =========================================================================
        // 2. LEHER / AKSESORI: HYPERBOLOID SATU LEMBAR (Kerah Astronot Ungu)
        // Ketentuan Wajib: Leher atau aksesori -> Hyperboloid satu lembar
        // =========================================================================
        this.neckCollar = new SceneNode("Alien_NeckCollar_Hyperboloid");
        this.neckCollar.buffers = neckHyperboloidBuf;
        this.neckCollar.baseColor = collarPurple;
        this.neckCollar.shininess = 48.0;
        // Posisi Leher / Kerah Astronot
        this.neckCollar.position = Vec3.create(0, 1.02, 0.0);
        // Ukuran Leher / Kerah Astronot
        this.neckCollar.scale = Vec3.create(1.05, 0.90, 1.05);
        this.neckCollar.quadricType = "Hyperboloid of 1 Sheet";
        this.neckCollar.quadricEquation = "x²/0.70² + z²/0.70² - y²/0.78² = 1 (Kerah Astronot Ungu)";
        this.body.addChild(this.neckCollar);

        // =========================================================================
        // 3. KEPALA (Child of Neck/Body: Ellipsoid Dome Hijau Limau)
        // Ketentuan Wajib: Kepala -> Ellipsoid
        // =========================================================================
        this.head = new SceneNode("Alien_Head_Ellipsoid");
        this.head.buffers = headEllipsoidBuf;
        this.head.baseColor = alienGreen;
        this.head.shininess = 18.0;
        // Posisi Kepala
        this.head.position = Vec3.create(0, 0.42, 0.04);
        // Ukuran Kepala
        this.head.scale = Vec3.create(1.0, 1.0, 1.0);
        // Simpan posisi & ukuran acuan dasar kepala untuk animasi (agar nilai di atas tidak tertimpa setiap frame)
        this.head.basePosition = Vec3.create(this.head.position[0], this.head.position[1], this.head.position[2]);
        this.head.baseScale = Vec3.create(this.head.scale[0], this.head.scale[1], this.head.scale[2]);
        // Simpan posisi & ukuran acuan dasar kepala untuk animasi (agar nilai di atas tidak tertimpa setiap frame)
        this.head.basePosition = Vec3.create(this.head.position[0], this.head.position[1], this.head.position[2]);
        this.head.baseScale = Vec3.create(this.head.scale[0], this.head.scale[1], this.head.scale[2]);
        this.head.quadricType = "Ellipsoid";
        this.head.quadricEquation = "x²/1.36² + y²/0.90² + z²/1.08² = 1 (Kepala Lonjong Melebar)";
        this.neckCollar.addChild(this.head);

        // =========================================================================
        // 4. BOLA MATA (3 Buah: Kiri, Tengah, Kanan - Ellipsoid)
        // Ketentuan Wajib: Bola mata -> Ellipsoid
        // =========================================================================
        this.eyes = [];
        this.pupils = [];
        this.eyelids = [];

        const eyeConfigs = [
            { name: "Left", x: -0.57, y: 0.12, z: 0.85, rotY: 0.18, rotX: -0.06, lidRotZ: 0.00 },
            { name: "Center", x: 0.00, y: 0.17, z: 0.92, rotY: 0.00, rotX: -0.04, lidRotZ: 0.00 },
            { name: "Right", x: 0.57, y: 0.12, z: 0.85, rotY: -0.18, rotX: -0.06, lidRotZ: 0.00 }
        ];

        eyeConfigs.forEach((cfg) => {
            // Sclera Bola Mata (Ellipsoid Putih Mengkilap)
            const eyeNode = new SceneNode(`Alien_Eye_${cfg.name}_Ellipsoid`);
            eyeNode.buffers = eyeEllipsoidBuf;
            eyeNode.baseColor = eyeWhite;
            eyeNode.shininess = 120.0;
            // Posisi Bola Mata (${cfg.name})
            eyeNode.position = Vec3.create(cfg.x, cfg.y, cfg.z);
            eyeNode.rotation = Vec3.create(cfg.rotX, cfg.rotY, 0.0);
            // Ukuran Bola Mata (${cfg.name})
            eyeNode.scale = Vec3.create(1.4, 1.4, 1.4);
            eyeNode.quadricType = "Ellipsoid";
            eyeNode.quadricEquation = "x²/0.21² + y²/0.25² + z²/0.19² = 1 (Bola Mata Putih)";
            this.head.addChild(eyeNode);
            this.eyes.push(eyeNode);

            // Kelopak Mata Atas Mengantuk (Sleepy Drooping Eyelid Hood)
            // Menutup ~26-28% bagian atas bola mata dengan sudut kemiringan sesuai referensi Toy Story
            const eyelidNode = new SceneNode(`Alien_Eyelid_${cfg.name}_Ellipsoid`);
            eyelidNode.buffers = eyelidHoodBuf;
            eyelidNode.baseColor = alienGreen;
            eyelidNode.shininess = 18.0;
            // Posisi Kelopak Mata (${cfg.name})
            eyelidNode.position = Vec3.create(cfg.x, cfg.y, cfg.z);
            eyelidNode.rotation = Vec3.create(cfg.rotX, cfg.rotY, cfg.lidRotZ);
            // Ukuran Kelopak Mata (${cfg.name})
            eyelidNode.scale = Vec3.create(1.4, 1.4, 1.4);
            eyelidNode.baseRotX = cfg.rotX;
            eyelidNode.baseRotY = cfg.rotY;
            eyelidNode.baseRotZ = cfg.lidRotZ;
            eyelidNode.quadricType = "Ellipsoid";
            eyelidNode.quadricEquation = "x²/0.21² + y²/0.25² + z²/0.19² = 1 (Kelopak Mata Atas Mengantuk)";
            this.head.addChild(eyelidNode);
            this.eyelids.push(eyelidNode);

            // Pupil Mata Hitam-Ungu Berbinar - diletakkan presisi tepat di bawah kelopak mata
            const pupilNode = new SceneNode(`Alien_Pupil_${cfg.name}`);
            pupilNode.buffers = sphereBuf;
            pupilNode.baseColor = pupilBlack;
            pupilNode.shininess = 120.0;
            // Posisi Pupil Mata (${cfg.name})
            pupilNode.position = Vec3.create(0.0, 0.005, 0.176);
            // Ukuran Pupil Mata (${cfg.name})
            pupilNode.scale = Vec3.create(0.088, 0.098, 0.1);
            pupilNode.quadricType = "Sphere";
            pupilNode.quadricEquation = "x² + y² + z² = r² (Pupil Hitam Berkilau)";
            eyeNode.addChild(pupilNode);
            this.pupils.push(pupilNode);

            // Highlight Glint putih kecil pada pupil
            const glintNode = new SceneNode(`Alien_PupilGlint_${cfg.name}`);
            glintNode.buffers = sphereBuf;
            glintNode.baseColor = [1.0, 1.0, 1.0, 1.0];
            // Posisi Kilau Pupil (Glint ${cfg.name})
            glintNode.position = Vec3.create(0.035, 0.04, 0.038);
            // Ukuran Kilau Pupil (Glint ${cfg.name})
            glintNode.scale = Vec3.create(0.026, 0.026, 0.015);
            pupilNode.addChild(glintNode);
        });

        // =========================================================================
        // DETAIL WAJAH: LENGKUNGAN SENYUM LEBAR (3D Parametric Cubic Bézier Curve)
        // Garis senyum tunggal yang ramah, bersih, dan lebar sesuai karakter aslinya
        // =========================================================================
        this.mouth = new SceneNode("Alien_Mouth_Smile");
        this.mouth.buffers = mouthBezierBuf;
        this.mouth.baseColor = [0.20, 0.44, 0.07, 1.0];
        this.mouth.shininess = 24.0;
        // Posisi Mulut
        this.mouth.position = Vec3.create(0.0, 0.0, 0.0);
        // Ukuran Mulut
        this.mouth.scale = Vec3.create(1.0, 1.0, 1.0);
        this.mouth.quadricType = "3D Cubic Bézier Curve";
        this.mouth.quadricEquation = "B(t) = (1-t)³P₀ + 3(1-t)²t P₁ + 3(1-t)t² P₂ + t³P₃ (Garis Senyum Lebar Ramah)";
        this.head.addChild(this.mouth);

        // =========================================================================
        // 5. ANTENA: KURVA 3D BÉZIER (Organically Curved Tapering Stalk & Sphere Bulb)
        // Penggunaan Kurva 3D: Batang melengkung anggun ke belakang & meruncing halus
        // =========================================================================
        this.antennaBase = new SceneNode("Alien_Antenna_Pivot");
        // Posisi Dasar Antena
        this.antennaBase.position = Vec3.create(0, 0.86, 0.0);
        this.head.addChild(this.antennaBase);

        // Batang Antena Kurva Bézier 3D (3D Cubic Bézier Curve Stalk)
        this.antennaStalk = new SceneNode("Alien_Antenna_Stalk_Bezier");
        this.antennaStalk.buffers = antennaBezierBuf;
        this.antennaStalk.baseColor = alienGreen;
        this.antennaStalk.shininess = 20.0;
        // Posisi Batang Antena
        this.antennaStalk.position = Vec3.create(0, 0, 0);
        this.antennaStalk.quadricType = "3D Cubic Bézier Curve";
        this.antennaStalk.quadricEquation = "B(t) = (1-t)³P₀ + 3(1-t)²t P₁ + 3(1-t)t² P₂ + t³P₃ (Batang Antena Melengkung)";
        this.antennaBase.addChild(this.antennaStalk);
        this.antennaCone = this.antennaStalk; // Alias backward compatibility

        // Ujung Bola Antena (Bulb Apex Sphere) tepat di titik akhir P3 kurva Bézier
        this.antennaBulb = new SceneNode("Alien_Antenna_Bulb");
        this.antennaBulb.buffers = sphereBuf;
        this.antennaBulb.baseColor = alienGreen;
        this.antennaBulb.shininess = 28.0;
        // Posisi Bola Ujung Antena
        this.antennaBulb.position = Vec3.create(0.0, 1.25, -0.10); // Menempel pas di titik akhir P3 kurva Bézier
        // Ukuran Bola Ujung Antena
        this.antennaBulb.scale = Vec3.create(0.19, 0.19, 0.19);
        this.antennaBulb.quadricType = "Sphere";
        this.antennaBulb.quadricEquation = "x² + y² + z² = r² (Ujung Bola Antena)";
        this.antennaBase.addChild(this.antennaBulb);

        // =========================================================================
        // 6. TELINGA (Cone & Paraboloid: Pipih, Mengarah ke Atas Sesuai Referensi Foto)
        // Ketentuan Wajib: Telinga -> Cone dan/atau paraboloid
        // 1. Rongga Telinga Depan: Elliptic Paraboloid (Cekungan Mangkok Depan)
        // 2. Daun & Ujung Telinga: Cone Berpenampang Elips Pipih Menunjuk ke Atas (~56°)
        // =========================================================================
        this.ears = [];
        [-1, 1].forEach((side) => {
            const isLeft = side === -1;
            const sideName = isLeft ? "Left" : "Right";

            // Pangkal Telinga di Pelipis Samping Kepala (Temple level sejajar mata)
            const earPivot = new SceneNode(`Alien_EarPivot_${sideName}`);
            // Posisi Pangkal Telinga (${sideName})
            earPivot.position = Vec3.create(side * 1.04, 0.24, -0.04);
            // Mengarah ke atas-luar (~56° dari horizontal) dan sedikit condong ke depan
            earPivot.rotation = Vec3.create(0.08, isLeft ? 0.18 : -0.18, isLeft ? 0.7 : -0.7);
            this.head.addChild(earPivot);
            this.ears.push(earPivot);

            // 1. Daun & Ujung Telinga Kerucut Pipih (Cone Tapering ke Atas)
            // Memanjang sepanjang sumbu Y lokal earPivot, dipipihkan di sumbu Z lokal
            const earCone = new SceneNode(`Alien_EarTip_${sideName}_Cone`);
            earCone.buffers = earConeBuf;
            earCone.baseColor = alienGreen;
            earCone.shininess = 20.0;
            // Posisi Daun Telinga (${sideName})
            earCone.position = Vec3.create(0.0, 0.44, 0.0);
            earCone.rotation = Vec3.create(0.0, 0.0, 0.0);
            // Ukuran Daun Telinga (${sideName})
            earCone.scale = Vec3.create(1.24, 1.0, 0.32); // Lebar 1.24x, Pipih 0.32x (Rasio 3.9:1)
            earCone.quadricType = "Cone";
            earCone.quadricEquation = "z²/c² = x²/a² + y²/b² (Daun Telinga Kerucut Pipih Menunjuk ke Atas)";
            earPivot.addChild(earCone);

            // 2. Rongga Telinga Dalam Cekung ke Depan (Elliptic Paraboloid Dish)
            const earCup = new SceneNode(`Alien_EarConcha_${sideName}_Paraboloid`);
            earCup.buffers = earParaboloidBuf;
            earCup.baseColor = alienDarkGreen; // Warna hijau zaitun teduh untuk kedalaman rongga
            earCup.shininess = 14.0;
            // Posisi Rongga Telinga (${sideName})
            earCup.position = Vec3.create(0.0, 0.38, 0.0);
            earCup.rotation = Vec3.create(Math.PI / 2 - 0.08, 0.0, 0.0); // Membuka menghadap ke depan & sedikit ke atas
            // Ukuran Rongga Telinga (${sideName})
            earCup.scale = Vec3.create(0.9, 0.9, 0.9);
            earCup.quadricType = "Elliptic Paraboloid";
            earCup.quadricEquation = "z/c = x²/a² + y²/b² (Rongga Telinga Paraboloid Menghadap Depan)";
            earPivot.addChild(earCup);
        });

        // =========================================================================
        // 7. DUA LENGAN & TANGAN (Cylinder & Ellipsoid - 100% Simetris Kiri & Kanan)
        // Ketentuan Wajib: Tangan dan kaki -> Cylinder atau ellipsoid
        // Lengan: Silinder; Telapak & Jari: Ellipsoid & Silinder
        // =========================================================================
        this.arms = [];
        [-1, 1].forEach((side) => {
            const isLeft = side === -1;
            const sideName = isLeft ? "Left" : "Right";

            // Pangkal Bahu (Pivot)
            const shoulderPivot = new SceneNode(`Alien_Shoulder_${sideName}`);
            // Posisi Pangkal Bahu (${sideName})
            shoulderPivot.position = Vec3.create(side * 1.02, 0.52, 0.02);
            shoulderPivot.rotation = Vec3.create(0.0, 0.0, isLeft ? 0.18 : -0.18);
            this.body.addChild(shoulderPivot);

            // Sendi Bahu Bulat (Sphere)
            const shoulderJoint = new SceneNode(`Alien_ShoulderJoint_${sideName}`);
            shoulderJoint.buffers = sphereBuf;
            shoulderJoint.baseColor = suitBlue;
            // Ukuran Sendi Bahu (${sideName})
            shoulderJoint.scale = Vec3.create(0.24, 0.24, 0.24);
            shoulderPivot.addChild(shoulderJoint);

            // Lengan Atas (Cylinder Jumpsuit Sleeve)
            const upperArm = new SceneNode(`Alien_UpperArm_${sideName}_Cylinder`);
            upperArm.buffers = armCylinderBuf;
            upperArm.baseColor = suitBlue;
            upperArm.shininess = 18.0;
            // Posisi Lengan Atas (${sideName})
            upperArm.position = Vec3.create(side * 0.18, -0.13, 0.0);
            upperArm.rotation = Vec3.create(0.0, 0.0, isLeft ? -1.10 : 1.10);
            // Ukuran Lengan Atas (${sideName})
            upperArm.scale = Vec3.create(1.0, 1.0, 1.0);
            upperArm.quadricType = "Cylinder";
            upperArm.quadricEquation = "x² + z² = r² (Lengan Atas Silinder)";
            shoulderPivot.addChild(upperArm);

            // Sendi Siku (Sphere visual joint on upper arm)
            const elbowJoint = new SceneNode(`Alien_ElbowJoint_${sideName}`);
            elbowJoint.buffers = sphereBuf;
            elbowJoint.baseColor = suitBlue;
            // Posisi Sendi Siku (${sideName})
            elbowJoint.position = Vec3.create(0, -0.28, 0);
            // Ukuran Sendi Siku (${sideName})
            elbowJoint.scale = Vec3.create(0.22, 0.22, 0.22);
            upperArm.addChild(elbowJoint);

            // Pivot Lengan Bawah (Forearm Pivot - SCALE 1.0 agar anak-anaknya tidak mengecil!)
            const forearmPivot = new SceneNode(`Alien_ForearmPivot_${sideName}`);
            // Posisi Poros Lengan Bawah (${sideName})
            forearmPivot.position = Vec3.create(0, -0.28, 0);
            forearmPivot.rotation = Vec3.create(-0.25, 0, 0);
            upperArm.addChild(forearmPivot);

            // Batang Lengan Bawah (Forearm Cylinder Sleeve)
            const forearm = new SceneNode(`Alien_Forearm_${sideName}_Cylinder`);
            forearm.buffers = forearmCylinderBuf;
            forearm.baseColor = suitBlue;
            forearm.shininess = 18.0;
            // Posisi Batang Lengan Bawah (${sideName})
            forearm.position = Vec3.create(0, -0.22, 0.02);
            // Ukuran Batang Lengan Bawah (${sideName})
            forearm.scale = Vec3.create(1.0, 1.0, 1.0);
            forearm.quadricType = "Cylinder";
            forearm.quadricEquation = "x² + z² = r² (Lengan Bawah Silinder)";
            forearmPivot.addChild(forearm);

            // Cincin Pergelangan Tangan Ungu (Wrist Cuff Ring)
            const wristCuff = new SceneNode(`Alien_WristCuff_${sideName}`);
            wristCuff.buffers = cuffCylinderBuf;
            wristCuff.baseColor = collarPurple;
            wristCuff.shininess = 38.0;
            // Posisi Pergelangan Tangan (${sideName})
            wristCuff.position = Vec3.create(0, -0.24, 0);
            // Ukuran Pergelangan Tangan (${sideName})
            wristCuff.scale = Vec3.create(1.0, 1.0, 1.0);
            forearm.addChild(wristCuff);

            // Telapak Tangan Hijau (Ellipsoid Palm - Bentuk Mitten Montok Lebar Alami)
            const handPalm = new SceneNode(`Alien_HandPalm_${sideName}_Ellipsoid`);
            handPalm.buffers = handPalmBuf;
            handPalm.baseColor = alienGreen;
            handPalm.shininess = 18.0;
            // Posisi Telapak Tangan (${sideName})
            handPalm.position = Vec3.create(0, -0.22, 0.02);
            // Ukuran Telapak Tangan (${sideName})
            handPalm.scale = Vec3.create(1.2, 1.2, 1.2);
            handPalm.quadricType = "Ellipsoid";
            handPalm.quadricEquation = "x²/0.32² + y²/0.26² + z²/0.18² = 1 (Telapak Tangan)";
            wristCuff.addChild(handPalm);

            // TIGA JARI ALIEN TOY STORY
            const fingerConfigs = [
                {
                    name: "Thumb",
                    pos: Vec3.create(isLeft ? -0.16 : 0.16, -0.08, 0.02),
                    rot: Vec3.create(-0.16, 0.0, isLeft ? Math.PI - 1.25 : Math.PI + 1.25),
                    length: 0.38,
                    radius: 0.096
                },
                {
                    name: "Middle",
                    pos: Vec3.create(isLeft ? -0.03 : 0.03, -0.04, 0.01),
                    rot: Vec3.create(-0.06, 0.0, isLeft ? Math.PI + 0.12 : Math.PI - 0.12),
                    length: 0.48,
                    radius: 0.096
                },
                {
                    name: "Bottom",
                    pos: Vec3.create(isLeft ? 0.16 : -0.16, -0.12, 0.00),
                    rot: Vec3.create(0.04, 0.0, isLeft ? Math.PI + 0.72 : Math.PI - 0.72),
                    length: 0.40,
                    radius: 0.092
                }
            ];

            fingerConfigs.forEach((cfg) => {
                const fingerPivot = new SceneNode(`Alien_FingerPivot_${sideName}_${cfg.name}`);
                // Posisi Pangkal Jari (${sideName} ${cfg.name})
                fingerPivot.position = cfg.pos;
                fingerPivot.rotation = cfg.rot;
                handPalm.addChild(fingerPivot);

                // 1. Batang Jari Silindris Gemuk (Cylinder Finger Shaft)
                const shaft = new SceneNode(`Alien_FingerShaft_${sideName}_${cfg.name}`);
                shaft.buffers = fingerCylinderBuf;
                shaft.baseColor = alienGreen;
                shaft.shininess = 18.0;
                // Posisi Batang Jari (${sideName} ${cfg.name})
                shaft.position = Vec3.create(0, cfg.length * 0.5, 0);
                // Ukuran Batang Jari (${sideName} ${cfg.name})
                shaft.scale = Vec3.create(cfg.radius / 0.095, cfg.length, cfg.radius / 0.095);
                shaft.quadricType = "Cylinder";
                shaft.quadricEquation = "x² + z² = r² (Batang Jari Silinder)";
                fingerPivot.addChild(shaft);

                // 2. Ujung Jari Membulat Kubah Halus (Ellipsoid Fingertip Dome)
                const tip = new SceneNode(`Alien_FingerTip_${sideName}_${cfg.name}`);
                tip.buffers = fingerTipBuf;
                tip.baseColor = alienGreen;
                tip.shininess = 18.0;
                // Posisi Ujung Jari (${sideName} ${cfg.name})
                tip.position = Vec3.create(0, cfg.length, 0);
                // Ukuran Ujung Jari (${sideName} ${cfg.name})
                tip.scale = Vec3.create(cfg.radius / 0.095, cfg.radius / 0.095, cfg.radius / 0.095);
                tip.quadricType = "Ellipsoid";
                tip.quadricEquation = "x²/a² + y²/b² + z²/c² = 1 (Ujung Jari Dome)";
                fingerPivot.addChild(tip);
            });

            if (isLeft) {
                this.leftArm = shoulderPivot;
                this.leftUpperArm = upperArm;
                this.leftForearm = forearmPivot;
                this.leftHand = handPalm;
            } else {
                this.rightArm = shoulderPivot;
                this.rightUpperArm = upperArm;
                this.rightForearm = forearmPivot;
                this.rightHand = handPalm;
            }
        });

        // =========================================================================
        // 8. DUA KAKI & SEPATU (Cylinder & Ellipsoid - 100% Simetris Kiri & Kanan)
        // Ketentuan Wajib: Tangan dan kaki -> Cylinder atau ellipsoid
        // Kaki: Silinder; Sepatu: Ellipsoid
        // =========================================================================
        this.legs = [];
        [-1, 1].forEach((side) => {
            const isLeft = side === -1;
            const sideName = isLeft ? "Left" : "Right";

            // Pangkal Paha (Hip Pivot)
            const hipPivot = new SceneNode(`Alien_Hip_${sideName}`);
            // Posisi Pangkal Paha / Kaki (${sideName})
            hipPivot.position = Vec3.create(side * 0.44, -0.88, 0.0);
            this.body.addChild(hipPivot);

            // Batang Kaki Celana Biru (Cylinder Leg)
            const legCylinder = new SceneNode(`Alien_Leg_${sideName}_Cylinder`);
            legCylinder.buffers = legCylinderBuf;
            legCylinder.baseColor = suitBlue;
            legCylinder.shininess = 18.0;
            // Posisi Batang Kaki (${sideName})
            legCylinder.position = Vec3.create(0, -0.26, 0);
            // Ukuran Batang Kaki (${sideName})
            legCylinder.scale = Vec3.create(1.0, 1.0, 1.0);
            legCylinder.quadricType = "Cylinder";
            legCylinder.quadricEquation = "x² + z² = r² (Kaki Celana Silinder)";
            hipPivot.addChild(legCylinder);

            // Sepatu Boot Astronot Gelap (Ellipsoid Space Boot)
            const boot = new SceneNode(`Alien_Boot_${sideName}_Ellipsoid`);
            boot.buffers = footEllipsoidBuf;
            boot.baseColor = beltNavy;
            boot.shininess = 30.0;
            // Posisi Sepatu Boot (${sideName})
            boot.position = Vec3.create(0, -0.32, 0.10);
            // Ukuran Sepatu Boot (${sideName})
            boot.scale = Vec3.create(1.0, 1.0, 1.0);
            boot.quadricType = "Ellipsoid";
            boot.quadricEquation = "x²/0.38² + y²/0.22² + z²/0.58² = 1 (Sepatu Astronot Ellipsoid)";
            legCylinder.addChild(boot);

            if (isLeft) {
                this.leftLeg = hipPivot;
                this.leftBoot = boot;
            } else {
                this.rightLeg = hipPivot;
                this.rightBoot = boot;
            }
        });

        // =========================================================================
        // 9. BAYANGAN DI LANTAI (Soft Contact Shadow Ellipsoid)
        // =========================================================================
        const shadowGeom = Quadrics.createEllipsoid(1.0, 1.0, 1.0, 24, 28);
        const shadowBuf = WebGLUtils.createMeshBuffers(gl, shadowGeom);

        this.contactShadow = new SceneNode("Alien_ContactShadow");
        this.contactShadow.buffers = shadowBuf;
        this.contactShadow.baseColor = [0.03, 0.05, 0.12, 0.65];
        this.contactShadow.shininess = 2.0;
        this.contactShadow.opacity = 0.65;
        this.contactShadow.isTransparent = true;
        // Posisi Bayangan Lantai
        this.contactShadow.position = Vec3.create(0, 0.02, 0.06);
        // Ukuran Bayangan Lantai
        this.contactShadow.scale = Vec3.create(1.25, 0.02, 1.05);
        this.root.addChild(this.contactShadow);
    }

    /**
     * Gait berjalan ceria khas Little Green Men (Waddling march)
     * Mengayunkan kaki, lengan, membal lembut pada badan, dan melambaikan antena
     */
    applyWalkingGait(time, speed = 5.6) {
        const stepPhase = time * speed;
        const stepBounce = Math.abs(Math.sin(stepPhase)) * 0.14;
        const waddle = Math.sin(stepPhase) * 0.09;

        // Badan sedikit naik turun & waddle ke kiri kanan
        // [Animasi Translasi]: Translasi vertikal sumbu Y - Membal naik-turun badan saat melangkah
        this.body.position[1] = 1.78 + stepBounce;
        // [Animasi Rotasi]: Rotasi Roll (sumbu Z) - Goyangan badan (waddle) ke kiri-kanan
        this.body.rotation[2] = waddle;

        // Kepala menyeimbangkan waddle badan
        // [Animasi Rotasi]: Rotasi Roll (sumbu Z) - Kepala menyeimbangkan goyangan badan
        this.head.rotation[2] = -waddle * 0.75;

        // Kaki mengayun maju-mundur berlawanan fase
        // [Animasi Rotasi]: Rotasi Pitch (sumbu X) - Ayunan kaki kiri maju-mundur
        if (this.leftLeg) this.leftLeg.rotation[0] = Math.sin(stepPhase) * 0.52;
        // [Animasi Rotasi]: Rotasi Pitch (sumbu X) - Ayunan kaki kanan berlawanan fase
        if (this.rightLeg) this.rightLeg.rotation[0] = -Math.sin(stepPhase) * 0.52;

        // Lengan mengayun berlawanan kaki
        if (this.leftArm) {
            // [Animasi Rotasi]: Rotasi Pitch (sumbu X) & Roll (sumbu Z) - Ayunan lengan kiri
            this.leftArm.rotation[0] = -Math.sin(stepPhase) * 0.55;
            this.leftArm.rotation[2] = 0.22 + stepBounce * 0.35;
        }
        if (this.rightArm) {
            // [Animasi Rotasi]: Rotasi Pitch (sumbu X) & Roll (sumbu Z) - Ayunan lengan kanan
            this.rightArm.rotation[0] = Math.sin(stepPhase) * 0.55;
            this.rightArm.rotation[2] = -0.22 - stepBounce * 0.35;
        }

        // Antena mengayun lentur mengikuti langkah
        if (this.antennaBase) {
            // [Animasi Rotasi]: Rotasi Roll (sumbu Z) & Pitch (sumbu X) - Antena melambai lentur
            this.antennaBase.rotation[2] = -waddle * 1.6;
            this.antennaBase.rotation[0] = Math.sin(stepPhase * 2.0) * 0.08;
        }

        // Bayangan kontak di lantai
        if (this.contactShadow) {
            // [Animasi Scaling]: Ukuran Bayangan Lantai - Scaling kontak lantai
            this.contactShadow.scale[0] = 1.25;
            this.contactShadow.scale[2] = 1.05;
            this.contactShadow.opacity = 0.65;
        }
    }

    /**
     * Pose diam bernafas lembut (Idle pose)
     */
    applyIdleGait(time) {
        const breathe = Math.sin(time * 2.2) * 0.02;
        // [Animasi Translasi]: Translasi vertikal sumbu Y - Gerakan naik-turun halus pernapasan badan
        this.body.position[1] = 1.78 + breathe;
        // [Animasi Rotasi]: Rotasi badan dinetralkan saat diam
        this.body.rotation[0] = 0.0;
        this.body.rotation[2] = 0.0;

        // [Animasi Rotasi]: Rotasi kaki dinetralkan saat diam
        if (this.leftLeg) this.leftLeg.rotation[0] = 0.0;
        if (this.rightLeg) this.rightLeg.rotation[0] = 0.0;

        // [Animasi Rotasi]: Rotasi Roll (sumbu Z) - Lengan bernapas rileks mengembang-mengempis halus
        if (this.leftArm) {
            this.leftArm.rotation[0] = 0.0;
            this.leftArm.rotation[2] = 0.18 + breathe * 0.2;
        }
        if (this.rightArm) {
            this.rightArm.rotation[0] = 0.0;
            this.rightArm.rotation[2] = -0.18 - breathe * 0.2;
        }

        // [Animasi Rotasi]: Rotasi Roll (sumbu Z) & Pitch (sumbu X) - Antena bergoyang santai
        if (this.antennaBase) {
            this.antennaBase.rotation[2] = Math.sin(time * 2.0) * 0.04;
            this.antennaBase.rotation[0] = Math.cos(time * 1.8) * 0.03;
        }

        // [Animasi Scaling]: Ukuran Bayangan Lantai dipertahankan proporsional
        if (this.contactShadow) {
            this.contactShadow.scale[0] = 1.25;
            this.contactShadow.scale[2] = 1.05;
            this.contactShadow.opacity = 0.65;
        }
    }

    /**
     * Update pose dasar setiap frame (kedipan mata, kelopak mata, pupil)
     */
    preUpdateFrame(time) {
        // Reset transform lokal dasar karakter
        // [Animasi Translasi]: Reset translasi posisi badan
        this.body.position[0] = 0.0;
        this.body.position[2] = 0.0;
        // [Animasi Rotasi]: Reset rotasi Euler badan
        this.body.rotation[0] = 0.0;
        this.body.rotation[1] = 0.0;
        this.body.rotation[2] = 0.0;
        // [Animasi Scaling]: Reset ukuran scaling badan ke normal (1, 1, 1)
        this.body.scale[0] = 1.0;
        this.body.scale[1] = 1.0;
        this.body.scale[2] = 1.0;
        // [Animasi Arbitrary Axis]: Reset rotasi sumbu sembarang ke sudut 0
        this.body.arbitraryRotation = { angle: 0.0, axis: [1.0, 0.0, 0.0] };

        // [Animasi Translasi]: Reset posisi kepala ke basePosition (mengikuti konfigurasi di buildModel)
        const baseHeadPos = this.head.basePosition || [0.0, 0.42, 0.04];
        this.head.position[0] = baseHeadPos[0];
        this.head.position[1] = baseHeadPos[1];
        this.head.position[2] = baseHeadPos[2];

        // [Animasi Rotasi]: Reset rotasi kepala
        this.head.rotation[0] = 0.0;
        this.head.rotation[1] = 0.0;
        this.head.rotation[2] = 0.0;

        // [Animasi Scaling]: Reset ukuran scaling kepala ke baseScale (mengikuti konfigurasi di buildModel)
        const baseHeadScale = this.head.baseScale || [1.0, 1.0, 1.0];
        this.head.scale[0] = baseHeadScale[0];
        this.head.scale[1] = baseHeadScale[1];
        this.head.scale[2] = baseHeadScale[2];

        // [Animasi Rotasi]: Reset rotasi lengan bawah
        if (this.leftForearm) {
            this.leftForearm.rotation[0] = -0.25;
            this.leftForearm.rotation[1] = 0.0;
            this.leftForearm.rotation[2] = 0.0;
        }
        if (this.rightForearm) {
            this.rightForearm.rotation[0] = -0.25;
            this.rightForearm.rotation[1] = 0.0;
            this.rightForearm.rotation[2] = 0.0;
        }

        // Kedipan mata alami
        const blinkCycle = Math.sin(time * 0.8);
        this.eyeBlink = blinkCycle > 0.96 ? Math.max(0.1, 1.0 - (blinkCycle - 0.96) * 25.0) : 1.0;

        // [Animasi Scaling]: Ukuran Bola Mata - Scaling vertikal sumbu Y saat mengedip
        this.eyes.forEach((eye) => {
            eye.scale[0] = 1.4;
            eye.scale[1] = 1.4 * this.eyeBlink;
            eye.scale[2] = 1.4;
        });

        // [Animasi Rotasi]: Rotasi Pitch (sumbu X) kelopak mata menutup ke bawah saat mengedip
        this.eyelids.forEach((lid) => {
            const blinkDrop = (1.0 - this.eyeBlink) * 0.35;
            lid.rotation[0] = lid.baseRotX + blinkDrop;
            lid.rotation[1] = lid.baseRotY;
            lid.rotation[2] = lid.baseRotZ;
        });

        // [Animasi Translasi]: Posisi Pupil Mata default
        this.pupils.forEach((p) => {
            p.position[0] = 0.0;
            p.position[1] = 0.005;
            p.position[2] = 0.175;
        });
    }

    /**
     * MASTER NARRATIVE ANIMATION STORY:
     * Alur cerita terintegrasi mendemonstrasikan seluruh transformasi matematika:
     * 1. [0.0  -  3.2s] TRANSLATE: Berjalan ke depan lalu berhenti (X: 1.0, Z: 0.0 -> 1.8).
     * 2. [3.2  -  6.2s] ROTATE: Berhenti, kepala menengok ke kiri lalu ke kanan.
     * 3. [6.2  - 10.0s] ROTATE & TRANSLATE: Berputar 90° ke kanan lalu jalan ke kanan (X: 1.0 -> 3.2).
     * 4. [10.0 - 11.8s] ROTATE: Menoleh ke depan & memutar badan menghadap kamera.
     * 5. [11.8 - 16.0s] SCALING: Melompat-lompat dengan squash & stretch ekstrem (penyet-penyet squishy).
     * 6. [16.0 - 19.2s] ROTATE ARBITRARY AXIS: Berputar 360° mengelilingi sumbu miring sembarang [1.0, 1.0, 0.5].
     * 7. [19.2 - 24.2s] TRANSLATE & ROTATE: Menoleh ke titik awal [1.0, 0, 0], berputar menghadap sana, lalu berjalan kembali ke origin.
     * 8. [24.2 - 26.0s] ROTATE: Berputar kembali menghadap depan, pose ramah, lalu loop mengulang dari awal.
     * Total cycle: 26.0 detik!
     */
    updateStory(t, delta = 0.016, globalTime = 0.0) {
        this.preUpdateFrame(globalTime);
        let status = "";

        // =========================================================================
        // FASE 1: TRANSLATE - Berjalan maju ke depan (X: 1.0, Z: 0.0 -> 1.8) lalu berhenti
        // =========================================================================
        if (t < 3.2) {
            const p = Math.min(1.0, t / 3.2);
            const pSmooth = 0.5 - 0.5 * Math.cos(p * Math.PI);

            // [Animasi Translasi]: Posisi Alien maju pada sumbu Z (0.0 -> 1.8)
            this.root.position[0] = 1.0;
            this.root.position[2] = pSmooth * 1.8;

            // [Animasi Rotasi]: Rotasi Yaw (sumbu Y) menghadap lurus ke depan
            this.root.rotation[1] = 0.0;
            this.head.rotation[1] = 0.0;

            // Memanggil langkah jalan (mengandung Translasi membal vertikal & Rotasi ayunan kaki/tangan)
            this.applyWalkingGait(globalTime, 5.8);
            status = "🚶 1. TRANSLATE: Berjalan Maju ke Depan...";
        }
        // =========================================================================
        // FASE 2: ROTATE - Berhenti, kepala menengok ke kiri lalu ke kanan
        // =========================================================================
        else if (t < 6.2) {
            // [Animasi Translasi]: Posisi Alien diam menetap di titik berhenti (X: 1.0, Z: 1.8)
            this.root.position[0] = 1.0;
            this.root.position[2] = 1.8;

            // [Animasi Rotasi]: Badan tetap lurus menghadap depan
            this.root.rotation[1] = 0.0;
            this.applyIdleGait(globalTime);

            const tRel = (t - 3.2) / 3.0;
            let headY = 0.0;
            let pupilX = 0.0;

            if (tRel < 0.45) {
                // Tengok ke kiri (0 -> -0.75 rad / -43°)
                const pTurn = 0.5 - 0.5 * Math.cos((tRel / 0.45) * Math.PI);
                headY = -pTurn * 0.75;
                pupilX = -0.035 * pTurn;
            } else if (tRel < 0.80) {
                // Tengok dari kiri ke kanan (-0.75 -> +0.75 rad / +43°)
                const pTurn = 0.5 - 0.5 * Math.cos(((tRel - 0.45) / 0.35) * Math.PI);
                headY = -0.75 + pTurn * 1.50;
                pupilX = -0.035 + pTurn * 0.070;
            } else {
                // Kembali ke tengah (+0.75 -> 0.0)
                const pTurn = 0.5 - 0.5 * Math.cos(((tRel - 0.80) / 0.20) * Math.PI);
                headY = 0.75 - pTurn * 0.75;
                pupilX = 0.035 - pTurn * 0.035;
            }

            // [Animasi Rotasi]: Rotasi Yaw (sumbu Y) kepala menoleh ke kiri dan kanan
            this.head.rotation[1] = headY;

            // [Animasi Rotasi]: Rotasi Roll (sumbu Z) antena merespons gerakan kepala
            if (this.antennaBase) {
                this.antennaBase.rotation[2] = -headY * 0.35;
            }

            // [Animasi Translasi]: Posisi Pupil Mata - Translasi horizontal sumbu X melirik kiri-kanan
            this.pupils.forEach((p) => {
                p.position[0] = pupilX;
                p.position[1] = 0.005;
                p.position[2] = 0.175;
            });
            status = "👀 2. ROTATE: Tengok Kiri & Kanan (Mengamati Kamar)...";
        }
        // =========================================================================
        // FASE 3: ROTATE & TRANSLATE - Berputar 90° ke kanan lalu jalan ke kanan
        // =========================================================================
        else if (t < 10.0) {
            const tRel = (t - 6.2) / 3.8;
            const turnDuration = 0.20;

            if (tRel < turnDuration) {
                // Sub-fase 3A: Berputar menghadap kanan (+X, 0 -> +PI/2)
                const pTurn = 0.5 - 0.5 * Math.cos((tRel / turnDuration) * Math.PI);

                // [Animasi Translasi]: Posisi Alien tetap diam saat berputar di tempat
                this.root.position[0] = 1.0;
                this.root.position[2] = 1.8;

                // [Animasi Rotasi]: Rotasi Yaw (sumbu Y) seluruh badan berputar 90° ke kanan (+X)
                this.root.rotation[1] = pTurn * (Math.PI * 0.5);
                this.head.rotation[1] = 0.0;
                this.applyWalkingGait(globalTime, 6.0);
                status = "🔄 3. ROTATE: Berputar 90° Menghadap ke Kanan...";
            } else {
                // Sub-fase 3B: Berjalan maju ke kanan menghadap ke kanan (X: 1.0 -> 3.2)
                const pWalk = (tRel - turnDuration) / (1.0 - turnDuration);
                const pSmooth = 0.5 - 0.5 * Math.cos(pWalk * Math.PI);

                // [Animasi Translasi]: Posisi Alien - Translasi maju ke arah kanan pada sumbu X (1.0 -> 3.2)
                this.root.position[0] = 1.0 + pSmooth * 2.2;
                this.root.position[2] = 1.8;

                // [Animasi Rotasi]: Rotasi Yaw (sumbu Y) dipertahankan 90° menghadap lurus ke kanan (+X)
                this.root.rotation[1] = Math.PI * 0.5;
                this.head.rotation[1] = 0.0;
                this.applyWalkingGait(globalTime, 5.8);
                status = "➡️ 3. TRANSLATE: Berjalan Maju ke Arah Kanan...";
            }
        }
        // =========================================================================
        // FASE 4: ROTATE - Menoleh ke depan & memutar badan menghadap kamera
        // =========================================================================
        else if (t < 11.8) {
            const tRel = (t - 10.0) / 1.8;

            // [Animasi Translasi]: Posisi Alien diam di ujung langkah kanan (X: 3.2, Z: 1.8)
            this.root.position[0] = 3.2;
            this.root.position[2] = 1.8;
            this.applyIdleGait(globalTime);

            if (tRel < 0.40) {
                // Sub-fase 4A: Kepala menoleh ke depan (kamera) terlebih dahulu
                const pTurn = 0.5 - 0.5 * Math.cos((tRel / 0.40) * Math.PI);

                // [Animasi Rotasi]: Badan tetap menghadap kanan (+PI/2), kepala berputar Yaw (sumbu Y) menghadap kamera
                this.root.rotation[1] = Math.PI * 0.5;
                this.head.rotation[1] = -pTurn * (Math.PI * 0.5);
                status = "👀 4. ROTATE: Kepala Menoleh ke Depan (Kamera)...";
            } else {
                // Sub-fase 4B: Badan ikut berputar menghadap depan (+PI/2 -> 0.0)
                const pBody = (tRel - 0.40) / 0.60;
                const pSmooth = 0.5 - 0.5 * Math.cos(pBody * Math.PI);

                // [Animasi Rotasi]: Rotasi Yaw (sumbu Y) badan memutar menghadap depan, kepala menyelaraskan diri
                this.root.rotation[1] = Math.PI * 0.5 * (1.0 - pSmooth);
                this.head.rotation[1] = -Math.PI * 0.5 * (1.0 - pSmooth);
                status = "🎯 4. ROTATE: Seluruh Badan Berputar Menghadap Depan...";
            }
        }
        // =========================================================================
        // FASE 5: SCALING - Melompat dengan Squash & Stretch Ekstrem (Super Squishy)
        // Didesain sangat halus (continuous C1 curve) dengan elastisitas mainan karet
        // =========================================================================
        else if (t < 16.0) {
            // [Animasi Translasi]: Posisi Alien di lantai (X: 3.2, Z: 1.8)
            this.root.position[0] = 3.2;
            this.root.position[2] = 1.8;
            // [Animasi Rotasi]: Rotasi hadap lurus ke depan (Yaw = 0)
            this.root.rotation[1] = 0.0;
            this.head.rotation[1] = 0.0;

            const tRel = Math.min(4.199, Math.max(0.0, t - 11.8)); // 0.0 -> 4.2
            const hops = [
                { start: 0.0, dur: 1.30, h: 0.70 }, // Hop 1: Warm-up
                { start: 1.30, dur: 1.50, h: 1.05 }, // Hop 2: Big Super Jump!
                { start: 2.80, dur: 1.40, h: 0.65 }  // Hop 3: Soft landing & settle
            ];

            let hIdx = 0;
            if (tRel >= 2.80) hIdx = 2;
            else if (tRel >= 1.30) hIdx = 1;

            const hop = hops[hIdx];
            const u = Math.min(1.0, Math.max(0.0, (tRel - hop.start) / hop.dur));
            const isFinal = (hIdx === 2);

            let yOffset = 0.0;
            let scaleY = 1.0;
            let scaleXZ = 1.0;
            let shadowScale = 1.0;
            let shadowAlpha = 0.65;

            // 4 fase dinamis per lompatan dengan interpolasi mulus tanpa patahan:
            // 0.00 -> 0.16 : Pre-launch Anticipation Squash (penyet di lantai sebelum melesat)
            // 0.16 -> 0.70 : Airborne Arc & Stretch (melayang tinggi & memanjang vertikal)
            // 0.70 -> 0.88 : Impact Landing Squash (mendarat & penyet gepeng maksimal)
            // 0.88 -> 1.00 : Rebound / Settle (membal elastis)
            if (u < 0.16) {
                const p = Math.sin((u / 0.16) * Math.PI);
                const sq = 0.36 * p;
                scaleY = 1.0 - sq;
                scaleXZ = 1.0 + sq * 0.80;
                yOffset = -0.24 * p;
                shadowScale = 1.0 + sq * 0.55;
                shadowAlpha = 0.65 + sq * 0.25;
            } else if (u < 0.70) {
                const tau = (u - 0.16) / 0.54;
                const arc = Math.sin(tau * Math.PI);
                yOffset = arc * hop.h;

                const stretch = Math.sin(tau * Math.PI);
                scaleY = 1.0 + 0.38 * stretch;
                scaleXZ = 1.0 - 0.20 * stretch;
                shadowScale = Math.max(0.55, 1.0 - stretch * 0.40);
                shadowAlpha = Math.max(0.20, 0.65 * (1.0 - stretch * 0.55));
            } else if (u < 0.88) {
                const p = Math.sin(((u - 0.70) / 0.18) * Math.PI);
                const maxSq = (hIdx === 1) ? 0.48 : 0.40;
                const sq = maxSq * p;
                scaleY = 1.0 - sq;
                scaleXZ = 1.0 + sq * 0.85;
                yOffset = -0.30 * p;
                shadowScale = 1.0 + sq * 0.75;
                shadowAlpha = Math.min(0.95, 0.65 + sq * 0.35);
            } else {
                const p = (u - 0.88) / 0.12;
                if (isFinal) {
                    const s = Math.sin(p * Math.PI * 2.0) * (1.0 - p) * 0.10;
                    scaleY = 1.0 + s;
                    scaleXZ = 1.0 - s * 0.70;
                    yOffset = 0.06 * s;
                } else {
                    const s = Math.sin(p * Math.PI) * 0.12;
                    scaleY = 1.0 + s;
                    scaleXZ = 1.0 - s * 0.70;
                    yOffset = 0.08 * s;
                }
                shadowScale = 1.0;
                shadowAlpha = 0.65;
            }

            // [Animasi Translasi]: Translasi vertikal sumbu Y badan (Ketinggian melompat sesuai kurva parabola & rebound)
            this.body.position[1] = 1.78 + yOffset;

            // [Animasi Scaling]: Ukuran Badan - Deformasi Squash & Stretch (sumbu Y memanjang/memendek, sumbu X & Z melebar/mengempis)
            this.body.scale[1] = scaleY;
            this.body.scale[0] = scaleXZ;
            this.body.scale[2] = scaleXZ;

            // [Animasi Scaling]: Ukuran Kepala - Deformasi squishy kepala mengikuti elastisitas badan secara proporsional
            const headSquishRatio = 1.0 + (1.0 - scaleY) * 0.22;
            const headBulgeRatio = 1.0 - (scaleXZ - 1.0) * 0.18;
            const baseHeadScale = this.head.baseScale || [1.0, 1.0, 1.0];
            this.head.scale[0] = baseHeadScale[0] * headBulgeRatio;
            this.head.scale[1] = baseHeadScale[1] * headSquishRatio;
            this.head.scale[2] = baseHeadScale[2] * headBulgeRatio;

            // [Animasi Rotasi]: Rotasi Pitch (sumbu X) & Roll (sumbu Z) kedua lengan merespons lompatan
            const armLift = Math.max(0.0, yOffset / hop.h);
            const armSquash = Math.max(0.0, 1.0 - scaleY);
            if (this.leftArm) {
                this.leftArm.rotation[0] = -0.25 * armLift + 0.15 * armSquash;
                this.leftArm.rotation[2] = 0.22 + 0.65 * armLift + 0.35 * armSquash;
            }
            if (this.rightArm) {
                this.rightArm.rotation[0] = -0.25 * armLift + 0.15 * armSquash;
                this.rightArm.rotation[2] = -0.22 - 0.65 * armLift - 0.35 * armSquash;
            }

            // [Animasi Rotasi]: Rotasi Pitch (sumbu X) & Roll (sumbu Z) antena berguncang membal lentur
            if (this.antennaBase) {
                const airLag = armLift * 0.22;
                const impactLag = armSquash * 0.30;
                this.antennaBase.rotation[0] = -airLag + impactLag;
                this.antennaBase.rotation[2] = Math.sin(globalTime * 9.0) * 0.08 * (1.0 + armLift);
            }

            // [Animasi Scaling]: Ukuran Bayangan Lantai - Membesar saat mendarat (squash) dan mengecil saat di udara
            if (this.contactShadow) {
                this.contactShadow.scale[0] = 1.25 * shadowScale;
                this.contactShadow.scale[2] = 1.05 * shadowScale;
                this.contactShadow.opacity = shadowAlpha;
            }

            status = `🦘 5. SCALING: Melompat Penyet Squishy (Lompatan ${hIdx + 1}/3)...`;
        }
        // =========================================================================
        // FASE 6: ROTATE ARBITRARY AXIS - Putaran 360° Sumbu Miring Sembarang [1, 1, 0.5]
        // Sub-fase:
        //   0.00–0.12 : Take-off bounce (anticipation squash → melesat naik)
        //   0.12–0.88 : Melayang & berputar di udara
        //   0.88–1.00 : Landing bounce (squash mendarat → rebound elastis)
        // =========================================================================
        else if (t < 19.2) {
            const tRel = (t - 16.0) / 3.2;

            // [Animasi Translasi]: Posisi Alien di lantai (X: 3.2, Z: 1.8)
            this.root.position[0] = 3.2;
            this.root.position[2] = 1.8;

            // [Animasi Rotasi]: Rotasi Euler badan dinetralkan
            this.root.rotation[1] = 0.0;
            this.head.rotation[1] = 0.0;

            // --- SUB-FASE: take-off bounce (0.00 – 0.12) ---
            if (tRel < 0.12) {
                const p = tRel / 0.12;
                const squash = Math.sin(p * Math.PI);

                // [Animasi Translasi]: Translasi sumbu Y turun sedikit untuk ancang-ancang melesat
                this.body.position[1] = 1.78 - squash * 0.22;

                // [Animasi Scaling]: Ukuran Badan - Scaling squash penyet sebelum meloncat tinggi
                this.body.scale[1] = 1.0 - squash * 0.28;
                this.body.scale[0] = 1.0 + squash * 0.18;
                this.body.scale[2] = 1.0 + squash * 0.18;

                // [Animasi Arbitrary Axis]: Inisialisasi rotasi sumbu sembarang (Arbitrary Axis) miring [1, 1, 0.5] pada sudut 0
                this.body.arbitraryRotation = { angle: 0, axis: [1, 1, 0.5] };

                // [Animasi Rotasi]: Rotasi Roll (sumbu Z) & Pitch (sumbu X) lengan & kaki bersiap take-off
                if (this.leftArm) { this.leftArm.rotation[2] = 0.22 + squash * 0.43; }
                if (this.rightArm) { this.rightArm.rotation[2] = -0.22 - squash * 0.43; }
                if (this.leftLeg) { this.leftLeg.rotation[0] = squash * 0.20; }
                if (this.rightLeg) { this.rightLeg.rotation[0] = -squash * 0.20; }

                // [Animasi Scaling]: Ukuran Bayangan Lantai membesar karena tekanan badan
                if (this.contactShadow) {
                    this.contactShadow.scale[0] = 1.25 + squash * 0.30;
                    this.contactShadow.scale[2] = 1.05 + squash * 0.25;
                    this.contactShadow.opacity = 0.65 + squash * 0.20;
                }
                status = "🛫 6. TAKE-OFF: Ancang-ancang Squash sebelum Melesat...";

                // --- SUB-FASE: melayang & berputar (0.12 – 0.88) ---
            } else if (tRel < 0.88) {
                const tFly = (tRel - 0.12) / 0.76;

                // [Animasi Scaling]: Reset Ukuran Badan kembali ke skala 1.0 normal di udara
                this.body.scale[0] = 1.0;
                this.body.scale[1] = 1.0;
                this.body.scale[2] = 1.0;

                // [Animasi Translasi]: Translasi sumbu Y - Melesat melayang tinggi di udara mengikuti busur sinus
                const lift = Math.sin(tFly * Math.PI) * 2.85;
                this.body.position[1] = 1.78 + lift;

                // [Animasi Arbitrary Axis]: Rotasi mengelilingi sumbu sembarang (Arbitrary Axis) [1, 1, 0.5] dengan variasi dinamis
                const arbAxis = [
                    1.0 + Math.sin(tFly * Math.PI * 2) * 0.4,
                    1.0,
                    0.5 + Math.cos(tFly * Math.PI * 3) * 0.3
                ];
                const smoothT = tFly < 0.5
                    ? 2 * tFly * tFly
                    : 1 - Math.pow(-2 * tFly + 2, 2) / 2;
                const angle = smoothT * (4.0 * Math.PI);
                this.body.arbitraryRotation = { angle, axis: arbAxis };

                // [Animasi Rotasi]: Pose terbang - Rotasi lengan dan kaki terentang di udara
                if (this.leftArm) { this.leftArm.rotation[2] = 0.65; }
                if (this.rightArm) { this.rightArm.rotation[2] = -0.65; }
                if (this.leftLeg) { this.leftLeg.rotation[0] = 0.28; }
                if (this.rightLeg) { this.rightLeg.rotation[0] = -0.28; }

                // [Animasi Scaling]: Ukuran Bayangan Lantai mengecil dan memudar saat terbang tinggi
                if (this.contactShadow) {
                    const sFactor = 1.0 - Math.sin(tFly * Math.PI) * 0.45;
                    this.contactShadow.scale[0] = 1.25 * sFactor;
                    this.contactShadow.scale[2] = 1.05 * sFactor;
                    this.contactShadow.opacity = 0.65 * (1.0 - Math.sin(tFly * Math.PI) * 0.50);
                }
                status = "🔄 6. ROTATE ARBITRARY AXIS: Atraksi Putaran 360° Sumbu Miring [1, 1, 0.5]...";

                // --- SUB-FASE: landing bounce (0.88 – 1.00) ---
            } else {
                const p = (tRel - 0.88) / 0.12;

                // [Animasi Arbitrary Axis]: Reset rotasi sumbu sembarang ke sudut 0 setelah mendarat
                this.body.arbitraryRotation = { angle: 0, axis: [1, 1, 0.5] };

                // [Animasi Translasi]: Translasi sumbu Y badan meredam benturan pendaratan
                const squash = p < 0.5
                    ? Math.sin((p / 0.5) * Math.PI * 0.5)          // naik ke puncak squash
                    : Math.sin(((1.0 - p) / 0.5) * Math.PI * 0.5) * 0.45; // rebound lebih kecil
                this.body.position[1] = 1.78 - squash * 0.30;

                // [Animasi Scaling]: Ukuran Badan - Scaling squash pendaratan dan rebound elastis
                this.body.scale[1] = 1.0 - squash * 0.32;
                this.body.scale[0] = 1.0 + squash * 0.22;
                this.body.scale[2] = 1.0 + squash * 0.22;

                // [Animasi Rotasi]: Rotasi lengan dan kaki menyerap benturan pendaratan
                if (this.leftArm) { this.leftArm.rotation[2] = 0.22 + squash * 0.50; }
                if (this.rightArm) { this.rightArm.rotation[2] = -0.22 - squash * 0.50; }
                if (this.leftLeg) { this.leftLeg.rotation[0] = squash * 0.25; }
                if (this.rightLeg) { this.rightLeg.rotation[0] = -squash * 0.25; }

                // [Animasi Scaling]: Ukuran Bayangan Lantai melebar saat benturan
                if (this.contactShadow) {
                    this.contactShadow.scale[0] = 1.25 + squash * 0.35;
                    this.contactShadow.scale[2] = 1.05 + squash * 0.28;
                    this.contactShadow.opacity = 0.65 + squash * 0.25;
                }
                status = "🛬 6. LANDING: Bounce Mendarat & Rebound Elastis...";
            }
        }
        // =========================================================================
        // FASE 7: TRANSLATE & ROTATE - Menengok ke awal, berputar & jalan ke origin
        // =========================================================================
        else if (t < 24.2) {
            const tRel = (t - 19.2) / 5.0;
            const targetAngle = Math.atan2(-2.2, -1.8); // ~ -2.256 rad (-129.3°)

            if (tRel < 0.16) {
                // Sub-fase 7A: Kepala menoleh ke belakang melihat titik awal [1.0, 0, 0]
                const turnP = 0.5 - 0.5 * Math.cos((tRel / 0.16) * Math.PI);

                // [Animasi Translasi]: Posisi Alien menetap di tempat
                this.root.position[0] = 3.2;
                this.root.position[2] = 1.8;

                // [Animasi Rotasi]: Badan tetap menghadap depan, kepala menoleh ke belakang (Yaw sumbu Y)
                this.root.rotation[1] = 0.0;
                this.head.rotation[1] = turnP * -1.85;
                this.applyIdleGait(globalTime);

                // [Animasi Translasi]: Posisi Pupil Mata - Translasi melirik tajam ke arah target awal
                this.pupils.forEach((p) => { p.position[0] = -0.04 * turnP; });
                status = "👀 7. ROTATE: Kepala Menengok ke Titik Awal (Origin)...";
            } else if (tRel < 0.28) {
                // Sub-fase 7B: Seluruh badan berputar menghadap arah titik awal
                const bodyTurnP = (tRel - 0.16) / 0.12;
                const smoothTurn = 0.5 - 0.5 * Math.cos(bodyTurnP * Math.PI);

                // [Animasi Translasi]: Posisi Alien tetap diam di tempat saat berputar
                this.root.position[0] = 3.2;
                this.root.position[2] = 1.8;

                // [Animasi Rotasi]: Rotasi Yaw (sumbu Y) seluruh badan berputar menghadap arah titik awal (targetAngle)
                this.root.rotation[1] = smoothTurn * targetAngle;
                this.head.rotation[1] = (1.0 - smoothTurn) * -1.85;
                this.applyWalkingGait(globalTime, 6.0);
                status = "🔄 7. ROTATE: Badan Berputar Menghadap Titik Awal...";
            } else {
                // Sub-fase 7C: Berjalan diagonal kembali ke titik origin [1.0, 0, 0]
                const walkP = (tRel - 0.28) / 0.72;
                const smoothWalk = 0.5 - 0.5 * Math.cos(walkP * Math.PI);

                // [Animasi Translasi]: Posisi Alien - Translasi diagonal kembali ke origin [1.0, 0.0] pada sumbu X & Z
                this.root.position[0] = 1.0 + 2.2 * (1.0 - smoothWalk);
                this.root.position[2] = 1.8 * (1.0 - smoothWalk);

                // [Animasi Rotasi]: Rotasi Yaw (sumbu Y) dipertahankan ke arah target jalan
                this.root.rotation[1] = targetAngle;
                this.head.rotation[1] = 0.0;
                this.applyWalkingGait(globalTime, 5.8);
                status = "🔙 7. TRANSLATE: Berjalan Kembali Menuju Titik Awal...";
            }
        }
        // =========================================================================
        // FASE 8: ROTATE - Berbalik menghadap depan & siap mengulang cerita
        // =========================================================================
        else {
            const tRel = (t - 24.2) / 1.8;
            const targetAngle = Math.atan2(-2.2, -1.8);
            const smoothTurn = 0.5 - 0.5 * Math.cos(Math.min(1.0, tRel) * Math.PI);

            // [Animasi Translasi]: Posisi Alien - Tiba dan menetap di titik awal (X: 1.0, Z: 0.0)
            this.root.position[0] = 1.0;
            this.root.position[2] = 0.0;

            // [Animasi Rotasi]: Rotasi Yaw (sumbu Y) berputar kembali menghadap depan kamera
            this.root.rotation[1] = targetAngle * (1.0 - smoothTurn);
            this.head.rotation[1] = 0.0;
            this.applyIdleGait(globalTime);
            status = "✨ 8. ROTATE: Berbalik Menghadap Depan & Loop Mengulang!";
        }

        return { statusText: status };
    }
}

