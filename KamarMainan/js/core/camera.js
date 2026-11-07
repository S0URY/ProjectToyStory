/**
 * camera.js - Orbit Camera with Smooth Interpolation
 * Drag mouse kiri: ROTATE kamera mengelilingi karakter
 * Drag mouse kanan: geser (pan)
 * Scroll: zoom
 */

import { Mat4, Vec3 } from './math3d.js';

export class OrbitCamera {
    constructor(canvas) {
        this.canvas = canvas;

        // Spherical coordinates
        this.target = Vec3.create(0, 1.4, 0);
        this.desiredTarget = Vec3.create(0, 1.4, 0);

        this.distance = 8.5;
        this.desiredDistance = 8.5;
        this.minDistance = 4.0;
        this.maxDistance = 40.0;   // kamar besar: bisa zoom out sampai melihat kasur & rak

        this.theta = 0.6;        // Azimuth (radians)
        this.desiredTheta = 0.6;
        this.phi = 0.3;          // Elevation (radians)
        this.desiredPhi = 0.3;
        this.minPhi = 0.0;       // tidak boleh masuk ke bawah pasir
        this.maxPhi = 1.2;

        this.fovy = Math.PI / 4;
        this.near = 0.1;
        this.far = 250.0;

        // Matrices
        this.viewMatrix = Mat4.create();
        this.projectionMatrix = Mat4.create();
        this.position = Vec3.create();

        // Interaction state
        this.isDragging = false;
        this.lastMouseX = 0;
        this.lastMouseY = 0;
        this.button = 0;

        this.initEvents();
    }

    clampPhi(value) {
        return Math.max(this.minPhi, Math.min(this.maxPhi, value));
    }

    clampDistance(value) {
        return Math.max(this.minDistance, Math.min(this.maxDistance, value));
    }

    initEvents() {
        const c = this.canvas;

        c.addEventListener('contextmenu', (e) => e.preventDefault());

        c.addEventListener('mousedown', (e) => {
            this.isDragging = true;
            this.button = e.button;
            this.lastMouseX = e.clientX;
            this.lastMouseY = e.clientY;
        });

        window.addEventListener('mousemove', (e) => {
            if (!this.isDragging) return;

            const dx = e.clientX - this.lastMouseX;
            const dy = e.clientY - this.lastMouseY;
            this.lastMouseX = e.clientX;
            this.lastMouseY = e.clientY;

            if (this.button === 0) {
                // Orbit Rotate
                this.desiredTheta -= dx * 0.008;
                this.desiredPhi = this.clampPhi(this.desiredPhi + dy * 0.008);
            } else if (this.button === 2) {
                // Pan
                const panSpeed = 0.003 * this.distance;
                const rightX = Math.cos(this.theta);
                const rightZ = -Math.sin(this.theta);

                this.desiredTarget[0] -= rightX * dx * panSpeed;
                this.desiredTarget[2] -= rightZ * dx * panSpeed;
                this.desiredTarget[1] += dy * panSpeed;
            }
        });

        window.addEventListener('mouseup', () => {
            this.isDragging = false;
        });

        c.addEventListener('wheel', (e) => {
            e.preventDefault();
            this.desiredDistance = this.clampDistance(this.desiredDistance + e.deltaY * 0.01);
        }, { passive: false });

        // Touch support
        let touchStartDist = 0;
        c.addEventListener('touchstart', (e) => {
            if (e.touches.length === 1) {
                this.isDragging = true;
                this.button = 0;
                this.lastMouseX = e.touches[0].clientX;
                this.lastMouseY = e.touches[0].clientY;
            } else if (e.touches.length === 2) {
                touchStartDist = Math.hypot(
                    e.touches[0].clientX - e.touches[1].clientX,
                    e.touches[0].clientY - e.touches[1].clientY
                );
            }
        });

        c.addEventListener('touchmove', (e) => {
            if (e.touches.length === 1 && this.isDragging) {
                const dx = e.touches[0].clientX - this.lastMouseX;
                const dy = e.touches[0].clientY - this.lastMouseY;
                this.lastMouseX = e.touches[0].clientX;
                this.lastMouseY = e.touches[0].clientY;

                this.desiredTheta -= dx * 0.008;
                this.desiredPhi = this.clampPhi(this.desiredPhi + dy * 0.008);
            } else if (e.touches.length === 2) {
                const dist = Math.hypot(
                    e.touches[0].clientX - e.touches[1].clientX,
                    e.touches[0].clientY - e.touches[1].clientY
                );
                const diff = touchStartDist - dist;
                touchStartDist = dist;
                this.desiredDistance = this.clampDistance(this.desiredDistance + diff * 0.02);
            }
        });

        c.addEventListener('touchend', () => {
            this.isDragging = false;
        });
    }

    update(aspect) {
        // Smooth camera dampening / lerp
        const lerpFactor = 0.12;
        this.theta += (this.desiredTheta - this.theta) * lerpFactor;
        this.phi += (this.desiredPhi - this.phi) * lerpFactor;
        this.distance += (this.desiredDistance - this.distance) * lerpFactor;
        Vec3.lerp(this.target, this.target, this.desiredTarget, lerpFactor);

        // Spherical to Cartesian
        const cosPhi = Math.cos(this.phi);
        const sinPhi = Math.sin(this.phi);
        const sinTheta = Math.sin(this.theta);
        const cosTheta = Math.cos(this.theta);

        this.position[0] = this.target[0] + this.distance * cosPhi * sinTheta;
        this.position[1] = this.target[1] + this.distance * sinPhi;
        this.position[2] = this.target[2] + this.distance * cosPhi * cosTheta;

        const up = Vec3.create(0, 1, 0);
        Mat4.lookAt(this.viewMatrix, this.position, this.target, up);
        Mat4.perspective(this.projectionMatrix, this.fovy, aspect, this.near, this.far);
    }
}
