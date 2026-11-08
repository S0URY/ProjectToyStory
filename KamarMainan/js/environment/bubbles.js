/**
 * bubbles.js - Gelembung Sabun yang Naik & Membesar
 *
 * 1. Satu mesh bola (Ellipsoid satuan) dipakai ulang untuk semua gelembung
 * 2. TRANSLATE ke atas (sumbu Y) + goyang sedikit di X dan Z
 * 3. SCALING membesar (sampai +80%) saat gelembung naik
 * 4. Transparan, warna pelangi pastel seperti gelembung sabun
 * 5. Sebagian gelembung keluar dari dekat Wheezy (mengikuti posisi Wheezy)
 */

import { SceneNode } from '../core/scene-node.js';
import { Quadrics } from '../core/quadrics.js';
import { WebGLUtils } from '../core/webgl-utils.js';
import { Vec3 } from '../core/math3d.js';

export class BubbleSystem {
    /**
     * random = SeededRandom dari environment.js (supaya posisi selalu sama)
     */
    constructor(gl, random, count = 40, characterCount = 6) {
        this.gl = gl;
        this.root = new SceneNode("Bubbles_Root");

        const bubbleGeom = Quadrics.createEllipsoid(1.0, 1.0, 1.0, 12, 16);
        const bubbleBuf = WebGLUtils.createMeshBuffers(gl, bubbleGeom);

        this.bubbles = [];

        const makeNode = (i) => {
            const node = new SceneNode(`Bubble_${i}`);
            node.buffers = bubbleBuf;
            node.baseColor = [0.92, 0.88, 1.0, 1.0];
            node.shininess = 120.0;
            node.opacity = 0.35;
            node.isTransparent = true;
            node.quadricType = "Ellipsoid (Sphere)";
            node.quadricEquation = "x² + y² + z² = r²";
            this.root.addChild(node);
            return node;
        };

        // Gelembung tersebar di seluruh kamar
        for (let i = 0; i < count; i++) {
            const p = random.ringPosition(1.5, 12);
            this.bubbles.push({
                node: makeNode(i),
                x: p[0],
                z: p[2],
                y0: p[1],
                radius: random.range(0.04, 0.14),
                speed: random.range(0.5, 1.2),
                offset: random.range(0, 12),
                phase: random.range(0, 6),
                fromCharacter: false
            });
        }

        // Beberapa gelembung keluar dari paruh Wheezy
        for (let i = 0; i < characterCount; i++) {
            this.bubbles.push({
                node: makeNode(count + i),
                x: random.range(-0.25, 0.25),
                z: random.range(0.7, 1.0),
                y0: 2.3,
                radius: random.range(0.04, 0.08),
                speed: random.range(0.6, 1.0),
                offset: i * 1.6,
                phase: random.range(0, 6),
                fromCharacter: true
            });
        }
    }

    /**
     * Update Bubble Animation:
     * life = 0..1 berulang (siklus hidup gelembung)
     * - Translate: y naik 10 satuan sepanjang hidupnya
     * - Scaling: ukuran membesar 80%
     */
    update(time, characterPosition = null) {
        for (const b of this.bubbles) {
            const life = ((time * b.speed + b.offset) % 10) / 10;
            const y = b.y0 + life * 10;
            const s = b.radius * (1 + life * 0.8);

            let x = b.x + Math.sin(time * 2 + b.phase) * 0.15;
            let z = b.z + Math.cos(time * 1.7 + b.phase) * 0.1;

            if (b.fromCharacter && characterPosition) {
                x += characterPosition[0];
                z += characterPosition[2];
            }

            b.node.position = Vec3.create(x, y, z);
            b.node.scale = Vec3.create(s, s, s);
        }
    }
}
