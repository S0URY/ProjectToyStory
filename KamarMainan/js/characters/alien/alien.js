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
        this.root.scale = Vec3.create(0.45, 0.45, 0.45);

        // Dynamic animation properties
        this.antennaWobble = 0.0;
        this.eyeBlink = 1.0;
        this.eyelids = [];

        // Clumsy Interactive Hierarchy Drag & Spring State
        this.clumsy = {
            activePart: null,
            isDragging: false,
            dragX: 0.0,
            dragY: 0.0,
            currentX: 0.0,
            currentY: 0.0,
            velX: 0.0,
            velY: 0.0,
            inertiaLagX: 0.0,
            inertiaLagY: 0.0,
            inertiaVelX: 0.0,
            inertiaVelY: 0.0
        };

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
        this.body.position = Vec3.create(0, 1.78, 0);
        this.body.scale = Vec3.create(1.0, 1.0, 1.0);
        this.body.quadricType = "Ellipsoid";
        this.body.quadricEquation = "x²/1.08² + y²/1.18² + z²/0.96² = 1 (Badan Space Suit)";
        this.root.addChild(this.body);

        // Sabuk Pinggang (Cylinder Belt around torso)
        this.belt = new SceneNode("Alien_Belt_Cylinder");
        this.belt.buffers = beltCylinderBuf;
        this.belt.baseColor = beltNavy;
        this.belt.shininess = 30.0;
        this.belt.position = Vec3.create(0, -0.32, 0);
        this.belt.scale = Vec3.create(1.02, 1.0, 1.02);
        this.belt.quadricType = "Cylinder";
        this.belt.quadricEquation = "x² + z² = r² (Sabuk Pinggang Astronot)";
        this.body.addChild(this.belt);

        // Kepala Gesper Sabuk (Belt Buckle)
        const buckle = new SceneNode("Alien_Belt_Buckle");
        buckle.buffers = sphereBuf;
        buckle.baseColor = buckleSilver;
        buckle.shininess = 90.0;
        buckle.position = Vec3.create(0, 0.0, 1.04);
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
        this.neckCollar.position = Vec3.create(0, 1.02, 0.0);
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
        this.head.position = Vec3.create(0, 0.42, 0.04);
        this.head.scale = Vec3.create(1.0, 1.0, 1.0);
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
            eyeNode.position = Vec3.create(cfg.x, cfg.y, cfg.z);
            eyeNode.rotation = Vec3.create(cfg.rotX, cfg.rotY, 0.0);
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
            eyelidNode.position = Vec3.create(cfg.x, cfg.y, cfg.z);
            eyelidNode.rotation = Vec3.create(cfg.rotX, cfg.rotY, cfg.lidRotZ);
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
            pupilNode.position = Vec3.create(0.0, 0.005, 0.176);
            pupilNode.scale = Vec3.create(0.088, 0.098, 0.1);
            pupilNode.quadricType = "Sphere";
            pupilNode.quadricEquation = "x² + y² + z² = r² (Pupil Hitam Berkilau)";
            eyeNode.addChild(pupilNode);
            this.pupils.push(pupilNode);

            // Highlight Glint putih kecil pada pupil
            const glintNode = new SceneNode(`Alien_PupilGlint_${cfg.name}`);
            glintNode.buffers = sphereBuf;
            glintNode.baseColor = [1.0, 1.0, 1.0, 1.0];
            glintNode.position = Vec3.create(0.035, 0.04, 0.038);
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
        this.mouth.quadricType = "3D Cubic Bézier Curve";
        this.mouth.quadricEquation = "B(t) = (1-t)³P₀ + 3(1-t)²t P₁ + 3(1-t)t² P₂ + t³P₃ (Garis Senyum Lebar Ramah)";
        this.head.addChild(this.mouth);

        // =========================================================================
        // 5. ANTENA: KURVA 3D BÉZIER (Organically Curved Tapering Stalk & Sphere Bulb)
        // Penggunaan Kurva 3D: Batang melengkung anggun ke belakang & meruncing halus
        // =========================================================================
        this.antennaBase = new SceneNode("Alien_Antenna_Pivot");
        this.antennaBase.position = Vec3.create(0, 0.86, 0.0);
        this.head.addChild(this.antennaBase);

        // Batang Antena Kurva Bézier 3D (3D Cubic Bézier Curve Stalk)
        this.antennaStalk = new SceneNode("Alien_Antenna_Stalk_Bezier");
        this.antennaStalk.buffers = antennaBezierBuf;
        this.antennaStalk.baseColor = alienGreen;
        this.antennaStalk.shininess = 20.0;
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
        this.antennaBulb.position = Vec3.create(0.0, 1.25, -0.10); // Menempel pas di titik akhir P3 kurva Bézier
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
            earCone.position = Vec3.create(0.0, 0.44, 0.0);
            earCone.rotation = Vec3.create(0.0, 0.0, 0.0);
            earCone.scale = Vec3.create(1.24, 1.0, 0.32); // Lebar 1.24x, Pipih 0.32x (Rasio 3.9:1)
            earCone.quadricType = "Cone";
            earCone.quadricEquation = "z²/c² = x²/a² + y²/b² (Daun Telinga Kerucut Pipih Menunjuk ke Atas)";
            earPivot.addChild(earCone);

            // 2. Rongga Telinga Dalam Cekung ke Depan (Elliptic Paraboloid Dish)
            const earCup = new SceneNode(`Alien_EarConcha_${sideName}_Paraboloid`);
            earCup.buffers = earParaboloidBuf;
            earCup.baseColor = alienDarkGreen; // Warna hijau zaitun teduh untuk kedalaman rongga
            earCup.shininess = 14.0;
            earCup.position = Vec3.create(0.0, 0.38, 0.0);
            earCup.rotation = Vec3.create(Math.PI / 2 - 0.08, 0.0, 0.0); // Membuka menghadap ke depan & sedikit ke atas
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
            shoulderPivot.position = Vec3.create(side * 1.02, 0.52, 0.02);
            shoulderPivot.rotation = Vec3.create(0.0, 0.0, isLeft ? 0.18 : -0.18);
            this.body.addChild(shoulderPivot);

            // Sendi Bahu Bulat (Sphere)
            const shoulderJoint = new SceneNode(`Alien_ShoulderJoint_${sideName}`);
            shoulderJoint.buffers = sphereBuf;
            shoulderJoint.baseColor = suitBlue;
            shoulderJoint.scale = Vec3.create(0.24, 0.24, 0.24);
            shoulderPivot.addChild(shoulderJoint);

            // Lengan Atas (Cylinder Jumpsuit Sleeve)
            const upperArm = new SceneNode(`Alien_UpperArm_${sideName}_Cylinder`);
            upperArm.buffers = armCylinderBuf;
            upperArm.baseColor = suitBlue;
            upperArm.shininess = 18.0;
            upperArm.position = Vec3.create(side * 0.18, -0.13, 0.0);
            upperArm.rotation = Vec3.create(0.0, 0.0, isLeft ? -1.10 : 1.10);
            upperArm.scale = Vec3.create(1.0, 1.0, 1.0);
            upperArm.quadricType = "Cylinder";
            upperArm.quadricEquation = "x² + z² = r² (Lengan Atas Silinder)";
            shoulderPivot.addChild(upperArm);

            // Sendi Siku (Sphere visual joint on upper arm)
            const elbowJoint = new SceneNode(`Alien_ElbowJoint_${sideName}`);
            elbowJoint.buffers = sphereBuf;
            elbowJoint.baseColor = suitBlue;
            elbowJoint.position = Vec3.create(0, -0.28, 0);
            elbowJoint.scale = Vec3.create(0.22, 0.22, 0.22);
            upperArm.addChild(elbowJoint);

            // Pivot Lengan Bawah (Forearm Pivot - SCALE 1.0 agar anak-anaknya tidak mengecil!)
            const forearmPivot = new SceneNode(`Alien_ForearmPivot_${sideName}`);
            forearmPivot.position = Vec3.create(0, -0.28, 0);
            forearmPivot.rotation = Vec3.create(-0.25, 0, 0);
            upperArm.addChild(forearmPivot);

            // Batang Lengan Bawah (Forearm Cylinder Sleeve)
            const forearm = new SceneNode(`Alien_Forearm_${sideName}_Cylinder`);
            forearm.buffers = forearmCylinderBuf;
            forearm.baseColor = suitBlue;
            forearm.shininess = 18.0;
            forearm.position = Vec3.create(0, -0.22, 0.02);
            forearm.scale = Vec3.create(1.0, 1.0, 1.0);
            forearm.quadricType = "Cylinder";
            forearm.quadricEquation = "x² + z² = r² (Lengan Bawah Silinder)";
            forearmPivot.addChild(forearm);

            // Cincin Pergelangan Tangan Ungu (Wrist Cuff Ring)
            const wristCuff = new SceneNode(`Alien_WristCuff_${sideName}`);
            wristCuff.buffers = cuffCylinderBuf;
            wristCuff.baseColor = collarPurple;
            wristCuff.shininess = 38.0;
            wristCuff.position = Vec3.create(0, -0.24, 0);
            wristCuff.scale = Vec3.create(1.0, 1.0, 1.0);
            forearm.addChild(wristCuff);

            // Telapak Tangan Hijau (Ellipsoid Palm - Bentuk Mitten Montok Lebar Alami)
            const handPalm = new SceneNode(`Alien_HandPalm_${sideName}_Ellipsoid`);
            handPalm.buffers = handPalmBuf;
            handPalm.baseColor = alienGreen;
            handPalm.shininess = 18.0;
            handPalm.position = Vec3.create(0, -0.22, 0.02);
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
                fingerPivot.position = cfg.pos;
                fingerPivot.rotation = cfg.rot;
                handPalm.addChild(fingerPivot);

                // 1. Batang Jari Silindris Gemuk (Cylinder Finger Shaft)
                const shaft = new SceneNode(`Alien_FingerShaft_${sideName}_${cfg.name}`);
                shaft.buffers = fingerCylinderBuf;
                shaft.baseColor = alienGreen;
                shaft.shininess = 18.0;
                shaft.position = Vec3.create(0, cfg.length * 0.5, 0);
                shaft.scale = Vec3.create(cfg.radius / 0.095, cfg.length, cfg.radius / 0.095);
                shaft.quadricType = "Cylinder";
                shaft.quadricEquation = "x² + z² = r² (Batang Jari Silinder)";
                fingerPivot.addChild(shaft);

                // 2. Ujung Jari Membulat Kubah Halus (Ellipsoid Fingertip Dome)
                const tip = new SceneNode(`Alien_FingerTip_${sideName}_${cfg.name}`);
                tip.buffers = fingerTipBuf;
                tip.baseColor = alienGreen;
                tip.shininess = 18.0;
                tip.position = Vec3.create(0, cfg.length, 0);
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
            hipPivot.position = Vec3.create(side * 0.44, -0.88, 0.0);
            this.body.addChild(hipPivot);

            // Batang Kaki Celana Biru (Cylinder Leg)
            const legCylinder = new SceneNode(`Alien_Leg_${sideName}_Cylinder`);
            legCylinder.buffers = legCylinderBuf;
            legCylinder.baseColor = suitBlue;
            legCylinder.shininess = 18.0;
            legCylinder.position = Vec3.create(0, -0.26, 0);
            legCylinder.scale = Vec3.create(1.0, 1.0, 1.0);
            legCylinder.quadricType = "Cylinder";
            legCylinder.quadricEquation = "x² + z² = r² (Kaki Celana Silinder)";
            hipPivot.addChild(legCylinder);

            // Sepatu Boot Astronot Gelap (Ellipsoid Space Boot)
            const boot = new SceneNode(`Alien_Boot_${sideName}_Ellipsoid`);
            boot.buffers = footEllipsoidBuf;
            boot.baseColor = beltNavy;
            boot.shininess = 30.0;
            boot.position = Vec3.create(0, -0.32, 0.10);
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
        this.contactShadow.position = Vec3.create(0, 0.02, 0.06);
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
        this.body.position[1] = 1.78 + stepBounce;
        this.body.rotation[2] = waddle;

        // Kepala menyeimbangkan waddle badan
        this.head.rotation[2] = -waddle * 0.75;

        // Kaki mengayun maju-mundur berlawanan fase
        if (this.leftLeg) this.leftLeg.rotation[0] = Math.sin(stepPhase) * 0.52;
        if (this.rightLeg) this.rightLeg.rotation[0] = -Math.sin(stepPhase) * 0.52;

        // Lengan mengayun berlawanan kaki
        if (this.leftArm) {
            this.leftArm.rotation[0] = -Math.sin(stepPhase) * 0.55;
            this.leftArm.rotation[2] = 0.22 + stepBounce * 0.35;
        }
        if (this.rightArm) {
            this.rightArm.rotation[0] = Math.sin(stepPhase) * 0.55;
            this.rightArm.rotation[2] = -0.22 - stepBounce * 0.35;
        }

        // Antena mengayun lentur mengikuti langkah
        if (this.antennaBase) {
            this.antennaBase.rotation[2] = -waddle * 1.6;
            this.antennaBase.rotation[0] = Math.sin(stepPhase * 2.0) * 0.08;
        }

        // Bayangan kontak di lantai
        if (this.contactShadow) {
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
        this.body.position[1] = 1.78 + breathe;
        this.body.rotation[0] = 0.0;
        this.body.rotation[2] = 0.0;

        if (this.leftLeg) this.leftLeg.rotation[0] = 0.0;
        if (this.rightLeg) this.rightLeg.rotation[0] = 0.0;

        if (this.leftArm) {
            this.leftArm.rotation[0] = 0.0;
            this.leftArm.rotation[2] = 0.18 + breathe * 0.2;
        }
        if (this.rightArm) {
            this.rightArm.rotation[0] = 0.0;
            this.rightArm.rotation[2] = -0.18 - breathe * 0.2;
        }

        if (this.antennaBase) {
            this.antennaBase.rotation[2] = Math.sin(time * 2.0) * 0.04;
            this.antennaBase.rotation[0] = Math.cos(time * 1.8) * 0.03;
        }

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
        this.body.position[0] = 0.0;
        this.body.position[2] = 0.0;
        this.body.rotation[0] = 0.0;
        this.body.rotation[1] = 0.0;
        this.body.rotation[2] = 0.0;
        this.body.scale[0] = 1.0;
        this.body.scale[1] = 1.0;
        this.body.scale[2] = 1.0;
        this.body.arbitraryRotation = { angle: 0.0, axis: [1.0, 0.0, 0.0] };

        this.head.position[0] = 0.0;
        this.head.position[1] = 0.42;
        this.head.position[2] = 0.04;
        this.head.rotation[0] = 0.0;
        this.head.rotation[1] = 0.0;
        this.head.rotation[2] = 0.0;
        this.head.scale[0] = 1.0;
        this.head.scale[1] = 1.0;
        this.head.scale[2] = 1.0;

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

        this.eyes.forEach((eye) => {
            eye.scale[0] = 1.4;
            eye.scale[1] = 1.4 * this.eyeBlink;
            eye.scale[2] = 1.4;
        });

        this.eyelids.forEach((lid) => {
            const blinkDrop = (1.0 - this.eyeBlink) * 0.35;
            lid.rotation[0] = lid.baseRotX + blinkDrop;
            lid.rotation[1] = lid.baseRotY;
            lid.rotation[2] = lid.baseRotZ;
        });

        // Posisi default pupil
        this.pupils.forEach((p) => {
            p.position[0] = 0.0;
            p.position[1] = 0.005;
            p.position[2] = 0.175;
        });
    }

    /**
     * MASTER NARRATIVE ANIMATION STORY:
     * Alur cerita terintegrasi mendemonstrasikan seluruh transformasi matematika:
     * 1. [0.0  -  3.2s] TRANSLATE: Berjalan ke depan lalu berhenti (Z: 0.0 -> 1.8).
     * 2. [3.2  -  6.2s] ROTATE: Berhenti, kepala menengok ke kiri lalu ke kanan.
     * 3. [6.2  - 10.0s] ROTATE & TRANSLATE: Berputar 90° ke kanan lalu jalan ke kanan (X: 0.0 -> 2.2).
     * 4. [10.0 - 11.8s] ROTATE: Menoleh ke depan & memutar badan menghadap kamera.
     * 5. [11.8 - 16.0s] SCALING: Melompat-lompat dengan squash & stretch ekstrem (penyet-penyet squishy).
     * 6. [16.0 - 19.2s] ROTATE ARBITRARY AXIS: Berputar 360° mengelilingi sumbu miring sembarang [1.0, 1.0, 0.5].
     * 7. [19.2 - 24.2s] TRANSLATE & ROTATE: Menoleh ke titik awal, berputar menghadap sana, lalu berjalan kembali ke origin.
     * 8. [24.2 - 26.0s] ROTATE: Berputar kembali menghadap depan, pose ramah, lalu loop mengulang dari awal.
     * Total cycle: 26.0 detik!
     */
    updateStory(t, delta = 0.016, globalTime = 0.0) {
        this.preUpdateFrame(globalTime);
        let status = "";

        // =========================================================================
        // FASE 1: TRANSLATE - Berjalan maju ke depan (Z: 0.0 -> 1.8) lalu berhenti
        // =========================================================================
        if (t < 3.2) {
            const p = Math.min(1.0, t / 3.2);
            const pSmooth = 0.5 - 0.5 * Math.cos(p * Math.PI);

            this.root.position[0] = 0.0;
            this.root.position[2] = pSmooth * 1.8;
            this.root.rotation[1] = 0.0;
            this.head.rotation[1] = 0.0;

            this.applyWalkingGait(globalTime, 5.8);
            status = "🚶 1. TRANSLATE: Berjalan Maju ke Depan...";
        }
        // =========================================================================
        // FASE 2: ROTATE - Berhenti, kepala menengok ke kiri lalu ke kanan
        // =========================================================================
        else if (t < 6.2) {
            this.root.position[0] = 0.0;
            this.root.position[2] = 1.8;
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

            this.head.rotation[1] = headY;
            if (this.antennaBase) {
                this.antennaBase.rotation[2] = -headY * 0.35;
            }
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
                this.root.position[0] = 0.0;
                this.root.position[2] = 1.8;
                this.root.rotation[1] = pTurn * (Math.PI * 0.5);
                this.head.rotation[1] = 0.0;
                this.applyWalkingGait(globalTime, 6.0);
                status = "🔄 3. ROTATE: Berputar 90° Menghadap ke Kanan...";
            } else {
                // Sub-fase 3B: Berjalan maju ke kanan menghadap ke kanan (X: 0.0 -> 2.2)
                const pWalk = (tRel - turnDuration) / (1.0 - turnDuration);
                const pSmooth = 0.5 - 0.5 * Math.cos(pWalk * Math.PI);
                this.root.position[0] = pSmooth * 2.2;
                this.root.position[2] = 1.8;
                this.root.rotation[1] = Math.PI * 0.5; // Menghadap lurus ke kanan (+X)
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
            this.root.position[0] = 2.2;
            this.root.position[2] = 1.8;
            this.applyIdleGait(globalTime);

            if (tRel < 0.40) {
                // Sub-fase 4A: Kepala menoleh ke depan (kamera) terlebih dahulu
                const pTurn = 0.5 - 0.5 * Math.cos((tRel / 0.40) * Math.PI);
                this.root.rotation[1] = Math.PI * 0.5;
                this.head.rotation[1] = -pTurn * (Math.PI * 0.5);
                status = "👀 4. ROTATE: Kepala Menoleh ke Depan (Kamera)...";
            } else {
                // Sub-fase 4B: Badan ikut berputar menghadap depan (+PI/2 -> 0.0)
                const pBody = (tRel - 0.40) / 0.60;
                const pSmooth = 0.5 - 0.5 * Math.cos(pBody * Math.PI);
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
            this.root.position[0] = 2.2;
            this.root.position[2] = 1.8;
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

            // Terapkan posisi & skala badan utama
            this.body.position[1] = 1.78 + yOffset;
            this.body.scale[1] = scaleY;
            this.body.scale[0] = scaleXZ;
            this.body.scale[2] = scaleXZ;

            // Kepala mewarisi deformasi squishy secara harmonis & empuk (tanpa pembagian kasar)
            const headSquishRatio = 1.0 + (1.0 - scaleY) * 0.22;
            const headBulgeRatio = 1.0 - (scaleXZ - 1.0) * 0.18;
            this.head.scale[1] = headSquishRatio;
            this.head.scale[0] = headBulgeRatio;
            this.head.scale[2] = headBulgeRatio;

            // Artikulasi tangan yang responsif dan organik
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

            // Inersia antena yang membal lentur
            if (this.antennaBase) {
                const airLag = armLift * 0.22;
                const impactLag = armSquash * 0.30;
                this.antennaBase.rotation[0] = -airLag + impactLag;
                this.antennaBase.rotation[2] = Math.sin(globalTime * 9.0) * 0.08 * (1.0 + armLift);
            }

            // Bayangan lantai menempel presisi & membesar saat penyet di lantai
            if (this.contactShadow) {
                this.contactShadow.scale[0] = 1.25 * shadowScale;
                this.contactShadow.scale[2] = 1.05 * shadowScale;
                this.contactShadow.opacity = shadowAlpha;
            }

            status = `🦘 5. SCALING: Melompat Penyet Squishy (Lompatan ${hIdx + 1}/3)...`;
        }
        // =========================================================================
        // FASE 6: ROTATE ARBITRARY AXIS - Putaran 360° Sumbu Miring Sembarang [1, 1, 0.5]
        // =========================================================================
        else if (t < 19.2) {
            const tRel = (t - 16.0) / 3.2;
            this.root.position[0] = 2.2;
            this.root.position[2] = 1.8;
            this.root.rotation[1] = 0.0;
            this.head.rotation[1] = 0.0;

            // Elevasi melayang di udara saat putaran salto
            const lift = Math.sin(tRel * Math.PI) * 0.85;
            this.body.position[1] = 1.78 + lift;

            // Sumbu miring sembarang non-trivial: [1.0, 1.0, 0.5]
            const arbAxis = [1.0, 1.0, 0.5];
            const smoothT = 0.5 - 0.5 * Math.cos(tRel * Math.PI);
            const angle = smoothT * (2.0 * Math.PI);

            this.body.arbitraryRotation = { angle: angle, axis: arbAxis };

            // Pose atraksi
            if (this.leftArm) { this.leftArm.rotation[2] = 0.65; }
            if (this.rightArm) { this.rightArm.rotation[2] = -0.65; }
            if (this.leftLeg) { this.leftLeg.rotation[0] = 0.28; }
            if (this.rightLeg) { this.rightLeg.rotation[0] = -0.28; }

            if (this.contactShadow) {
                const sFactor = 1.0 - Math.sin(tRel * Math.PI) * 0.45;
                this.contactShadow.scale[0] = 1.25 * sFactor;
                this.contactShadow.scale[2] = 1.05 * sFactor;
                this.contactShadow.opacity = 0.65 * (1.0 - Math.sin(tRel * Math.PI) * 0.50);
            }
            status = "🔄 6. ROTATE ARBITRARY AXIS: Atraksi Putaran 360° Sumbu Miring [1, 1, 0.5]...";
        }
        // =========================================================================
        // FASE 7: TRANSLATE & ROTATE - Menengok ke awal, berputar & jalan ke origin
        // =========================================================================
        else if (t < 24.2) {
            const tRel = (t - 19.2) / 5.0;
            const targetAngle = Math.atan2(-2.2, -1.8); // ~ -2.256 rad (-129.3°)

            if (tRel < 0.16) {
                // Sub-fase 7A: Kepala menoleh ke belakang melihat titik awal [0, 0, 0]
                const turnP = 0.5 - 0.5 * Math.cos((tRel / 0.16) * Math.PI);
                this.root.position[0] = 2.2;
                this.root.position[2] = 1.8;
                this.root.rotation[1] = 0.0;
                this.head.rotation[1] = turnP * -1.85;
                this.applyIdleGait(globalTime);
                this.pupils.forEach((p) => { p.position[0] = -0.04 * turnP; });
                status = "👀 7. ROTATE: Kepala Menengok ke Titik Awal (Origin)...";
            } else if (tRel < 0.28) {
                // Sub-fase 7B: Seluruh badan berputar menghadap arah titik awal
                const bodyTurnP = (tRel - 0.16) / 0.12;
                const smoothTurn = 0.5 - 0.5 * Math.cos(bodyTurnP * Math.PI);
                this.root.position[0] = 2.2;
                this.root.position[2] = 1.8;
                this.root.rotation[1] = smoothTurn * targetAngle;
                this.head.rotation[1] = (1.0 - smoothTurn) * -1.85;
                this.applyWalkingGait(globalTime, 6.0);
                status = "🔄 7. ROTATE: Badan Berputar Menghadap Titik Awal...";
            } else {
                // Sub-fase 7C: Berjalan diagonal kembali ke titik origin [0, 0, 0]
                const walkP = (tRel - 0.28) / 0.72;
                const smoothWalk = 0.5 - 0.5 * Math.cos(walkP * Math.PI);
                this.root.position[0] = 2.2 * (1.0 - smoothWalk);
                this.root.position[2] = 1.8 * (1.0 - smoothWalk);
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

            this.root.position[0] = 0.0;
            this.root.position[2] = 0.0;
            this.root.rotation[1] = targetAngle * (1.0 - smoothTurn);
            this.head.rotation[1] = 0.0;
            this.applyIdleGait(globalTime);
            status = "✨ 8. ROTATE: Berbalik Menghadap Depan & Loop Mengulang!";
        }

        // Jalankan fisika clumsy drag & update hirarki scene graph
        this.updateClumsyPhysics(delta, globalTime);
        this.applyClumsyTransforms(globalTime);
        this.root.update(globalTime);

        return { statusText: status };
    }

    /**
     * Mode Diam (Idle neutral pose saat animasi tidak berjalan)
     */
    updateIdle(time, delta = 0.016) {
        this.preUpdateFrame(time);
        this.root.position[0] = 0.0;
        this.root.position[2] = 0.0;
        this.root.rotation[1] = 0.0;
        this.applyIdleGait(time);

        this.updateClumsyPhysics(delta, time);
        this.applyClumsyTransforms(time);
        this.root.update(time);

        return { statusText: "Tekan Spasi untuk Memulai Cerita Animasi" };
    }

    /**
     * Kompatibilitas dengan pemanggil klasik update(time, isMarching, isChanting, isJumping, delta)
     */
    update(time, isMarching = false, isChanting = false, isJumping = false, delta = 0.016) {
        if (isMarching || isChanting || isJumping) {
            return this.updateStory(time % 26.0, delta, time);
        } else {
            return this.updateIdle(time, delta);
        }
    }

    /**
     * Memulai / memperbarui drag kursor kanan mouse pada bagian karakter tertentu
     * @param {string} part 'body' | 'head' | 'leftArm' | 'rightArm' | 'leftLeg' | 'rightLeg'
     * @param {number} dx Selisih mouse X
     * @param {number} dy Selisih mouse Y
     */
    applyClumsyDrag(part, dx, dy) {
        this.clumsy.isDragging = true;
        this.clumsy.activePart = part;
        // Batasi rentang maksimum drag agar gerakan terkontrol & tidak terlalu sensitif
        const maxDrag = 140.0;
        this.clumsy.dragX = Math.max(-maxDrag, Math.min(maxDrag, dx));
        this.clumsy.dragY = Math.max(-maxDrag, Math.min(maxDrag, dy));
    }

    /**
     * Melepas tombol kanan mouse: mengaktifkan pemulihan pegas stabil teredam
     * agar karakter kembali normal 100% ke posisi awal secara halus
     */
    releaseClumsyDrag() {
        this.clumsy.isDragging = false;
        this.clumsy.dragX = 0;
        this.clumsy.dragY = 0;
        // Nolkan kecepatan artifisial agar tidak terlempar berlebihan saat dilepas
        this.clumsy.velX = 0.0;
        this.clumsy.velY = 0.0;
    }

    /**
     * Simulasi Damped Spring Oscillator stabil:
     * Mengembalikan karakter ke posisi normal dengan cepat dan halus
     */
    updateClumsyPhysics(delta, time) {
        const c = this.clumsy;
        if (!c.activePart && Math.abs(c.currentX) < 0.0001 && Math.abs(c.currentY) < 0.0001) {
            return;
        }

        const dt = Math.min(delta, 0.033);

        if (c.isDragging) {
            // Mengikuti kursor mouse secara terkontrol dan stabil
            const followSpeed = 16.0;
            c.currentX += (c.dragX - c.currentX) * Math.min(1.0, followSpeed * dt);
            c.currentY += (c.dragY - c.currentY) * Math.min(1.0, followSpeed * dt);
            c.velX = 0.0;
            c.velY = 0.0;

            // Inersia lag sekunder halus
            const lagSpeed = 10.0;
            c.inertiaLagX += (c.currentX - c.inertiaLagX) * Math.min(1.0, lagSpeed * dt);
            c.inertiaLagY += (c.currentY - c.inertiaLagY) * Math.min(1.0, lagSpeed * dt);
        } else {
            // Damped Spring Simulation: memantul sedikit lalu kembali normal sempurna
            const k = 65.0;       // Kekuatan pegas pemulih
            const damping = 12.0; // Peredaman stabil (tidak liar, cepat diam di tengah)

            const forceX = -k * c.currentX - damping * c.velX;
            const forceY = -k * c.currentY - damping * c.velY;

            c.velX += forceX * dt;
            c.velY += forceY * dt;

            c.currentX += c.velX * dt;
            c.currentY += c.velY * dt;

            // Inersia lag sekunder juga mereda ke 0
            const kLag = 45.0;
            const dLag = 10.0;
            const forceLagX = -kLag * c.inertiaLagX - dLag * c.inertiaVelX;
            const forceLagY = -kLag * c.inertiaLagY - dLag * c.inertiaVelY;
            c.inertiaVelX += forceLagX * dt;
            c.inertiaVelY += forceLagY * dt;
            c.inertiaLagX += c.inertiaVelX * dt;
            c.inertiaLagY += c.inertiaVelY * dt;

            // Jika simpangan sudah sangat dekat dengan 0, stabilkan kembali normal sempurna!
            if (Math.hypot(c.currentX, c.currentY) < 0.002 && Math.hypot(c.velX, c.velY) < 0.005) {
                c.currentX = 0;
                c.currentY = 0;
                c.velX = 0;
                c.velY = 0;
                c.dragX = 0;
                c.dragY = 0;
                c.inertiaLagX = 0;
                c.inertiaLagY = 0;
                c.activePart = null;
            }
        }
    }

    /**
     * Terapkan transformasi hirarkis berdasarkan bagian yang ditarik mouse
     * dengan sensitivitas yang lembut, nyaman, dan terkontrol
     */
    applyClumsyTransforms(time) {
        const c = this.clumsy;
        if (!c.activePart || (Math.abs(c.currentX) < 0.0001 && Math.abs(c.currentY) < 0.0001)) {
            return;
        }

        const curX = c.currentX;
        const curY = c.currentY;

        // Sensitivitas nyaman & terkontrol (tidak terlalu sensitif)
        const sensPos = 0.0022;
        const sensRot = 0.0014;

        switch (c.activePart) {
            case 'body': {
                // =========================================================================
                // BUKTI 1: BADAN ADALAH PARENT UTAMA
                // Saat badan digerakkan, seluruh scene graph (kepala, leher, lengan, kaki)
                // otomatis berpindah posisi dan berotasi mengikuti matrix badan!
                // =========================================================================
                this.body.position[0] += curX * sensPos;
                this.body.position[1] += -curY * sensPos;
                this.body.rotation[2] += -curX * sensRot;
                this.body.rotation[0] += curY * sensRot;

                // Clumsy Inertia: Kepala & Leher membengkok elastis menahan pergerakan
                const lagX = (curX - c.inertiaLagX) * 0.0016;
                const lagY = (curY - c.inertiaLagY) * 0.0016;
                this.head.rotation[2] += lagX;
                this.head.rotation[0] += -lagY;

                // Antena bergoyang wajar mengikuti inersia gerak badan
                const speedMag = Math.hypot(curX, curY);
                if (this.antennaBase) {
                    this.antennaBase.rotation[2] += Math.sin(time * 12.0) * speedMag * 0.0010 - curX * 0.0014;
                    this.antennaBase.rotation[0] += Math.cos(time * 10.0) * speedMag * 0.0010 + curY * 0.0014;
                }

                // Kedua Lengan menjuntai lembut
                if (this.leftArm) {
                    this.leftArm.rotation[2] += curX * 0.0018;
                    this.leftArm.rotation[0] += -curY * 0.0018;
                }
                if (this.leftForearm) {
                    this.leftForearm.rotation[0] += -curY * 0.0010;
                }
                if (this.rightArm) {
                    this.rightArm.rotation[2] += curX * 0.0018;
                    this.rightArm.rotation[0] += -curY * 0.0018;
                }
                if (this.rightForearm) {
                    this.rightForearm.rotation[0] += -curY * 0.0010;
                }

                // Kedua Kaki menjuntai lembut
                if (this.leftLeg) {
                    this.leftLeg.rotation[2] += curX * 0.0014;
                    this.leftLeg.rotation[0] += -curY * 0.0014;
                }
                if (this.rightLeg) {
                    this.rightLeg.rotation[2] += curX * 0.0014;
                    this.rightLeg.rotation[0] += -curY * 0.0014;
                }
                break;
            }

            case 'head': {
                // =========================================================================
                // BUKTI 2: KEPALA ADALAH CHILD DARI BADAN
                // Hanya kepala yang bergerak miring/menggeleng secara halus.
                // Anak-anak kepala (mata, pupil, glint, senyum, antena, telinga) ikut semua!
                // Badan, kedua tangan, dan kedua kaki TETAP DIAM!
                // =========================================================================
                this.head.rotation[2] += -curX * 0.0024;
                this.head.rotation[0] += curY * 0.0024;
                this.head.position[0] += curX * 0.0006;
                this.head.position[1] += -curY * 0.0006;

                if (this.antennaBase) {
                    this.antennaBase.rotation[2] += -curX * 0.0016;
                }
                break;
            }

            case 'leftArm': {
                // =========================================================================
                // BUKTI 3: LENGAN KIRI ADALAH CHILD DARI BADAN
                // Hanya lengan kiri yang bergerak! Anak-anaknya (lengan bawah, telapak, 3 jari)
                // ikut kompak. Bagian lainnya TETAP DIAM!
                // =========================================================================
                if (this.leftArm) {
                    this.leftArm.rotation[2] += -curX * 0.0026;
                    this.leftArm.rotation[0] += curY * 0.0026;
                }
                if (this.leftForearm) {
                    this.leftForearm.rotation[0] += curY * 0.0016;
                }
                break;
            }

            case 'rightArm': {
                // =========================================================================
                // BUKTI 4: LENGAN KANAN ADALAH CHILD DARI BADAN
                // Hanya lengan kanan yang bergerak! Anak-anaknya (lengan bawah, telapak, 3 jari)
                // ikut kompak. Bagian lainnya TETAP DIAM!
                // =========================================================================
                if (this.rightArm) {
                    this.rightArm.rotation[2] += -curX * 0.0026;
                    this.rightArm.rotation[0] += curY * 0.0026;
                }
                if (this.rightForearm) {
                    this.rightForearm.rotation[0] += curY * 0.0016;
                }
                break;
            }

            case 'leftLeg': {
                // =========================================================================
                // BUKTI 5: KAKI KIRI ADALAH CHILD DARI BADAN
                // Hanya kaki kiri dan sepatunya yang bergerak! Bagian lainnya TETAP DIAM!
                // =========================================================================
                if (this.leftLeg) {
                    this.leftLeg.rotation[0] += -curY * 0.0024;
                    this.leftLeg.rotation[2] += -curX * 0.0018;
                }
                break;
            }

            case 'rightLeg': {
                // =========================================================================
                // BUKTI 6: KAKI KANAN ADALAH CHILD DARI BADAN
                // Hanya kaki kanan dan sepatunya yang bergerak! Bagian lainnya TETAP DIAM!
                // =========================================================================
                if (this.rightLeg) {
                    this.rightLeg.rotation[0] += -curY * 0.0024;
                    this.rightLeg.rotation[2] += -curX * 0.0018;
                }
                break;
            }
        }
    }

    /**
     * Hit-test bounding spheres untuk Raycasting dari kursor mouse
     */
    getHitSpheres() {
        const getPos = (node) => {
            if (!node || !node.worldMatrix) return [0, 0, 0];
            const m = node.worldMatrix;
            return [m[12], m[13], m[14]];
        };

        const spheres = [];
        const scale = (this.root && this.root.scale) ? this.root.scale[0] : 1.0;

        // 1. Badan (Body - Root of character mass)
        if (this.body) {
            spheres.push({
                part: 'body',
                name: 'Badan (Parent Utama)',
                desc: 'Parent Seluruh Bagian: Kepala, Tangan & Kaki Ikut Bergerak!',
                center: getPos(this.body),
                radius: 1.18 * scale
            });
        }

        // 2. Kepala (Head - Cranial Parent)
        if (this.head) {
            spheres.push({
                part: 'head',
                name: 'Kepala (Child Badan)',
                desc: 'Parent Wajah: Mata, Mulut, Telinga & Antena Mengikuti!',
                center: getPos(this.head),
                radius: 1.18 * scale
            });
        }
        if (this.antennaBulb) {
            spheres.push({
                part: 'head',
                name: 'Antena (Child Kepala)',
                desc: 'Menggerakkan Kepala & Seluruh Fitur Wajah!',
                center: getPos(this.antennaBulb),
                radius: 0.50 * scale
            });
        }
        if (this.ears && this.ears.length >= 2) {
            spheres.push({
                part: 'head',
                name: 'Telinga Kiri (Child Kepala)',
                desc: 'Menggerakkan Kepala & Seluruh Fitur Wajah!',
                center: getPos(this.ears[0]),
                radius: 0.55 * scale
            });
            spheres.push({
                part: 'head',
                name: 'Telinga Kanan (Child Kepala)',
                desc: 'Menggerakkan Kepala & Seluruh Fitur Wajah!',
                center: getPos(this.ears[1]),
                radius: 0.55 * scale
            });
        }

        // 3. Tangan Kiri (Left Arm & Hand)
        if (this.leftHand) {
            spheres.push({
                part: 'leftArm',
                name: 'Telapak & Jari Kiri (Child Lengan)',
                desc: 'Hanya Lengan Kiri, Telapak & 3 Jari Kiri yang Bergerak!',
                center: getPos(this.leftHand),
                radius: 0.65 * scale
            });
        }
        if (this.leftArm) {
            spheres.push({
                part: 'leftArm',
                name: 'Lengan Kiri (Child Badan)',
                desc: 'Hanya Lengan Kiri, Telapak & 3 Jari Kiri yang Bergerak!',
                center: getPos(this.leftArm),
                radius: 0.60 * scale
            });
        }

        // 4. Tangan Kanan (Right Arm & Hand)
        if (this.rightHand) {
            spheres.push({
                part: 'rightArm',
                name: 'Telapak & Jari Kanan (Child Lengan)',
                desc: 'Hanya Lengan Kanan, Telapak & 3 Jari Kanan yang Bergerak!',
                center: getPos(this.rightHand),
                radius: 0.65 * scale
            });
        }
        if (this.rightArm) {
            spheres.push({
                part: 'rightArm',
                name: 'Lengan Kanan (Child Badan)',
                desc: 'Hanya Lengan Kanan, Telapak & 3 Jari Kanan yang Bergerak!',
                center: getPos(this.rightArm),
                radius: 0.60 * scale
            });
        }

        // 5. Kaki Kiri (Left Leg & Boot)
        if (this.leftBoot) {
            spheres.push({
                part: 'leftLeg',
                name: 'Sepatu Kiri (Child Kaki)',
                desc: 'Hanya Kaki & Sepatu Kiri yang Bergerak!',
                center: getPos(this.leftBoot),
                radius: 0.55 * scale
            });
        }
        if (this.leftLeg) {
            spheres.push({
                part: 'leftLeg',
                name: 'Kaki Kiri (Child Badan)',
                desc: 'Hanya Kaki & Sepatu Kiri yang Bergerak!',
                center: getPos(this.leftLeg),
                radius: 0.50 * scale
            });
        }

        // 6. Kaki Kanan (Right Leg & Boot)
        if (this.rightBoot) {
            spheres.push({
                part: 'rightLeg',
                name: 'Sepatu Kanan (Child Kaki)',
                desc: 'Hanya Kaki & Sepatu Kanan yang Bergerak!',
                center: getPos(this.rightBoot),
                radius: 0.55 * scale
            });
        }
        if (this.rightLeg) {
            spheres.push({
                part: 'rightLeg',
                name: 'Kaki Kanan (Child Badan)',
                desc: 'Hanya Kaki & Sepatu Kanan yang Bergerak!',
                center: getPos(this.rightLeg),
                radius: 0.50 * scale
            });
        }

        return spheres;
    }
}

