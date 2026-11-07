/**
 * main.js - Master Orchestrator for Pingo the Penguin Pure WebGL Application
 * Menampilkan Pingo, Hamm & Alien di kamar mainan yang sama, dengan kamera orbit dan kontrol keyboard:
 *   Drag mouse : Rotate kamera      Scroll : zoom
 *   Panah      : Translate Pingo     + / -  : Scaling Pingo
 *   Spasi      : auto-rotate on/off A      : animasi on/off
 */

import { OrbitCamera } from './core/camera.js';
import { WebGLUtils, Shaders } from './core/webgl-utils.js';
import { Vec3 } from './core/math3d.js';
import { SceneNode } from './core/scene-node.js';
import { Pingo } from './characters/pingo/pingo.js';
import { Hamm } from './characters/hamm/hamm.js';
import { Alien } from './characters/alien/alien.js';
import { Environment } from './environment/environment.js';

// Warna udara kamar yang hangat (dipakai untuk background & kabut tipis)
const ROOM_COLOR = [0.96, 0.88, 0.74];

class App {
    constructor() {
        this.canvas = document.getElementById('webgl-canvas');
        this.gl = this.canvas.getContext('webgl', { antialias: true, alpha: false });

        if (!this.gl) {
            alert('WebGL tidak didukung pada browser Anda!');
            throw new Error('WebGL not supported');
        }

        this.camera = new OrbitCamera(this.canvas);
        // Kamera diarahkan ke tengah antara Pingo dan Hamm
        this.camera.target[0] = this.camera.desiredTarget[0] = 0.0;
        this.camera.target[2] = this.camera.desiredTarget[2] = 1.2;

        this.lastTime = 0;

        // Semua nilai yang bisa diubah user lewat keyboard
        this.controls = {
            posX: 1.2,          // Translate X (panah kiri/kanan) - Pingo di kanan, Hamm di kiri depan
            posZ: 0.0,          // Translate Z (panah atas/bawah)
            scale: 0.8,         // Scaling (+ / -) - ukuran awal Pingo diperkecil sedikit
            autoRotate: true,   // Spasi
            animate: true       // A
        };

        // Waktu animasi: hanya bertambah saat animasi aktif
        this.animTime = 0.0;

        this.init();
    }

    init() {
        const gl = this.gl;

        // WebGL Pipeline Setup
        gl.clearColor(ROOM_COLOR[0], ROOM_COLOR[1], ROOM_COLOR[2], 1.0);
        gl.enable(gl.DEPTH_TEST);
        gl.depthFunc(gl.LEQUAL);

        // Alpha Blending
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

        // Compile Shaders
        this.program = WebGLUtils.createProgram(gl, Shaders.vertex, Shaders.fragment);
        gl.useProgram(this.program);

        // Cache Shader Locations
        this.programInfo = {
            program: this.program,
            locations: {
                a_Position: gl.getAttribLocation(this.program, 'a_Position'),
                a_Normal: gl.getAttribLocation(this.program, 'a_Normal'),

                u_ModelMatrix: gl.getUniformLocation(this.program, 'u_ModelMatrix'),
                u_ViewMatrix: gl.getUniformLocation(this.program, 'u_ViewMatrix'),
                u_ProjectionMatrix: gl.getUniformLocation(this.program, 'u_ProjectionMatrix'),
                u_NormalMatrix: gl.getUniformLocation(this.program, 'u_NormalMatrix'),

                u_CameraPos: gl.getUniformLocation(this.program, 'u_CameraPos'),
                u_LightDir: gl.getUniformLocation(this.program, 'u_LightDir'),
                u_BaseColor: gl.getUniformLocation(this.program, 'u_BaseColor'),
                u_Shininess: gl.getUniformLocation(this.program, 'u_Shininess'),
                u_Opacity: gl.getUniformLocation(this.program, 'u_Opacity'),
                u_Unlit: gl.getUniformLocation(this.program, 'u_Unlit'),
                u_Sway: gl.getUniformLocation(this.program, 'u_Sway'),
                u_Time: gl.getUniformLocation(this.program, 'u_Time'),
                u_FogColor: gl.getUniformLocation(this.program, 'u_FogColor'),
                u_FogNear: gl.getUniformLocation(this.program, 'u_FogNear'),
                u_FogFar: gl.getUniformLocation(this.program, 'u_FogFar'),
                u_Caustics: gl.getUniformLocation(this.program, 'u_Caustics')
            }
        };

        this.normalMat3 = new Float32Array(9);

        // Instantiate Environment
        this.environment = new Environment(gl);

        // Instantiate Pingo
        this.pingo = new Pingo(gl);

        // Instantiate Hamm (di kiri depan Pingo, di area lantai yang kosong dari mainan)
        this.hamm = new Hamm(gl, [-1.2, 0.0, 2.8]);

        // ===== Alien (dari project ToyStory) =====
        this.setupAlien(gl);

        // Setup UI Listeners
        this.setupUI();

        // Handle Window Resize
        window.addEventListener('resize', () => this.resizeCanvas());
        this.resizeCanvas();

        // Start Render Loop
        requestAnimationFrame((t) => this.render(t));
    }

    /**
     * Setup Alien (menggunakan core universal yang sama dengan Pingo, Hamm & Environment)
     */
    setupAlien(gl) {
        this.alien = new Alien(gl);

        // Animasi cerita Alien mengatur sendiri posisi alien.root (berjalan maju, ke kanan,
        // lalu kembali ke titik awal). Supaya tetap bisa ditaruh di kamar, Alien dibungkus
        // node induk: posisi & skala diatur di node ini, gerakan cerita tetap di alien.root.
        this.alienPlacement = new SceneNode("Alien_Placement");
        // Jalur cerita: maju +1.8 di Z, lalu ke kanan +2.2 di X, lalu kembali ke titik awal.
        this.alienPlacement.position = Vec3.create(-3.6, 0.0, -3.8);   // posisi awal Alien di kamar
        // Skala Alien (0.45) sudah diatur di dalam alien.js, jadi di sini dibiarkan 1
        this.alienPlacement.scale = Vec3.create(1.0, 1.0, 1.0);
        this.alienPlacement.addChild(this.alien.root);

        this.alienCycle = 26.0;   // panjang cerita animasi Alien (detik), sama seperti project ToyStory
    }

    /**
     * Animasi Alien: cerita 26 detik dari project ToyStory (translate, rotate,
     * scaling squishy, rotate arbitrary axis, lalu kembali ke awal).
     * Saat animasi dimatikan (tombol A), waktu animTime berhenti sehingga
     * Alien freeze di posisi dan pose terakhir persis seperti karakter lainnya.
     */
    updateAlien(time, delta) {
        this.alien.updateStory(time % this.alienCycle, this.controls.animate ? delta : 0, time);
        // Hitung ulang matriks dunia dengan node penempatan sebagai parent
        this.alienPlacement.update(time);
    }

    /** Menggambar Alien dengan shader & lighting utama yang sama dengan karakter lainnya */
    drawAlien(renderTransparent) {
        this.alienPlacement.draw(this.gl, this.programInfo, this.normalMat3, renderTransparent);
    }

    setupUI() {
        // Keyboard Shortcut
        window.addEventListener('keydown', (e) => {
            const k = e.key;

            // Panah: TRANSLATE Pingo
            if (k === 'ArrowLeft') this.controls.posX -= 0.15;
            if (k === 'ArrowRight') this.controls.posX += 0.15;
            if (k === 'ArrowUp') this.controls.posZ -= 0.15;
            if (k === 'ArrowDown') this.controls.posZ += 0.15;
            if (k.startsWith('Arrow')) e.preventDefault();

            // + / - : SCALING Pingo
            if (k === '+' || k === '=') this.controls.scale = Math.min(2.0, this.controls.scale + 0.1);
            if (k === '-' || k === '_') this.controls.scale = Math.max(0.3, this.controls.scale - 0.1);

            // Spasi: auto-rotate kamera on/off
            if (e.code === 'Space') {
                e.preventDefault();
                this.controls.autoRotate = !this.controls.autoRotate;
            }

            // A: animasi on/off
            if (k === 'a' || k === 'A') this.controls.animate = !this.controls.animate;
        });
    }

    resizeCanvas() {
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        const displayWidth = Math.floor(this.canvas.clientWidth * dpr);
        const displayHeight = Math.floor(this.canvas.clientHeight * dpr);

        if (this.canvas.width !== displayWidth || this.canvas.height !== displayHeight) {
            this.canvas.width = displayWidth;
            this.canvas.height = displayHeight;
            this.gl.viewport(0, 0, displayWidth, displayHeight);
        }
    }

    render(currentTime) {
        const time = currentTime * 0.001; // Seconds
        const delta = Math.min(time - this.lastTime, 0.1) || 0.016;
        this.lastTime = time;

        const gl = this.gl;
        const locs = this.programInfo.locations;

        // 1. Update Camera (auto-rotate pelan kalau tidak sedang di-drag)
        if (this.controls.autoRotate && !this.camera.isDragging) {
            this.camera.desiredTheta -= delta * 0.2;
        }
        const aspect = this.canvas.width / this.canvas.height;
        this.camera.update(aspect);

        // 2. Update Character & Environment Animations
        if (this.controls.animate) this.animTime += delta;
        const t = this.animTime;

        this.pingo.update(t, this.controls);
        this.hamm.update(t);
        this.updateAlien(t, delta);
        this.environment.update(t, this.pingo.root.position);

        // 3. Clear Buffers
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        gl.useProgram(this.program);

        // 4. Set Global Camera & Light Uniforms
        gl.uniformMatrix4fv(locs.u_ViewMatrix, false, this.camera.viewMatrix);
        gl.uniformMatrix4fv(locs.u_ProjectionMatrix, false, this.camera.projectionMatrix);
        gl.uniform3fv(locs.u_CameraPos, this.camera.position);
        gl.uniform1f(locs.u_Time, t);

        // Cahaya utama kamar dari atas-depan (arah MENUJU cahaya)
        gl.uniform3fv(locs.u_LightDir, [0.35, 1.0, 0.45]);
        gl.uniform1i(locs.u_Caustics, 0);

        // Distance Fog (tipis, hanya agar dinding jauh terasa lembut)
        gl.uniform3fv(locs.u_FogColor, ROOM_COLOR);
        gl.uniform1f(locs.u_FogNear, 30.0);
        gl.uniform1f(locs.u_FogFar, 140.0);

        // 5. Draw Pass 1: Opaque Objects
        gl.depthMask(true);
        this.environment.root.draw(gl, this.programInfo, this.normalMat3, false);
        this.pingo.root.draw(gl, this.programInfo, this.normalMat3, false);
        this.hamm.draw(gl, this.programInfo, this.normalMat3, false);
        this.drawAlien(false);

        // 6. Draw Pass 2: Transparent Objects (Bayangan Pingo & Alien, Gelembung Sabun, Berkas Cahaya)
        gl.depthMask(false);
        this.pingo.root.draw(gl, this.programInfo, this.normalMat3, true);
        this.drawAlien(true);
        this.environment.root.draw(gl, this.programInfo, this.normalMat3, true);
        gl.depthMask(true);

        // Continue Loop
        requestAnimationFrame((t) => this.render(t));
    }
}

// Bootstrap on DOM ready
window.addEventListener('DOMContentLoaded', () => {
    window.app = new App();
});
