/**
 * curves.js - Kurva 3D Parametrik & Generator Mesh Tabung
 * Implements:
 * 1. Cubic Bezier 3D (alis Wheezy)
 * 2. Tabung (tube) yang mengikuti kurva 3D apa pun -> alis Wheezy.
 *
 * Generates solid 3D Tube Meshes with smooth normals and lighting.
 */

import { Vec3 } from './math3d.js';
import { Quadrics } from './quadrics.js';

export const Curves = {
    /**
     * CUBIC BEZIER 3D (dipakai untuk alis Wheezy)
     * B(t) = (1-t)³·P0 + 3(1-t)²t·P1 + 3(1-t)t²·P2 + t³·P3,   t ∈ [0, 1]
     * P0 = titik awal, P3 = titik akhir, P1 & P2 = titik kontrol (menarik bentuk lengkungan)
     */
    evaluateCubicBezier(p0, p1, p2, p3, t) {
        const u = 1 - t;
        const b0 = u * u * u;
        const b1 = 3 * u * u * t;
        const b2 = 3 * u * t * t;
        const b3 = t * t * t;

        return Vec3.create(
            b0 * p0[0] + b1 * p1[0] + b2 * p2[0] + b3 * p3[0],
            b0 * p0[1] + b1 * p1[1] + b2 * p2[1] + b3 * p3[1],
            b0 * p0[2] + b1 * p1[2] + b2 * p2[2] + b3 * p3[2]
        );
    },

    /** Sampling kurva Bezier menjadi deretan titik (untuk dijadikan tabung). */
    createBezierPoints(p0, p1, p2, p3, segments = 32) {
        const points = [];
        for (let i = 0; i <= segments; ++i) {
            points.push(Curves.evaluateCubicBezier(p0, p1, p2, p3, i / segments));
        }
        return points;
    },

    /**
     * Generates a 3D Tube mesh along a sequence of 3D points
     * Mendukung pemanggilan Wheezy: (points, radiusFn, radialSegments, capEnd, capStart)
     * dan Alien: (points, radius, radialSegments, radiusFn)
     */
    createTubeFromPoints(points, arg2 = 0.05, arg3 = 12, arg4 = null, capEnd = true, capStart = true) {
        const n = points.length;
        if (n < 2) return null;

        let radiusFn;
        let radialSegments = 12;

        if (typeof arg2 === 'function') {
            radiusFn = arg2;
            if (typeof arg3 === 'number') radialSegments = arg3;
        } else if (typeof arg2 === 'number') {
            const baseR = arg2;
            if (typeof arg3 === 'number') radialSegments = arg3;
            if (typeof arg4 === 'function') {
                radiusFn = (t) => arg4(t, baseR);
            } else {
                radiusFn = (t) => baseR;
            }
        } else {
            radiusFn = (t) => 0.05;
        }

        const tangents = [];
        const normalsN = [];
        const binormals = [];

        // 1. Tangent di setiap titik
        for (let i = 0; i < n; ++i) {
            const t = Vec3.create();
            Vec3.subtract(t, points[Math.min(i + 1, n - 1)], points[Math.max(i - 1, 0)]);
            Vec3.normalize(t, t);
            tangents.push(t);
        }

        // 2. Normal awal: vektor apa saja yang tidak sejajar tangent pertama
        const ref = Math.abs(tangents[0][1]) < 0.9 ? Vec3.create(0, 1, 0) : Vec3.create(1, 0, 0);
        const n0 = Vec3.create();
        Vec3.cross(n0, tangents[0], ref);
        Vec3.cross(n0, n0, tangents[0]);
        Vec3.normalize(n0, n0);
        normalsN.push(n0);

        // 3. Parallel transport: buang komponen normal yang searah tangent baru
        for (let i = 1; i < n; ++i) {
            const prev = normalsN[i - 1];
            const tan = tangents[i];
            const proj = Vec3.scale(Vec3.create(), tan, Vec3.dot(prev, tan));
            const curr = Vec3.subtract(Vec3.create(), prev, proj);
            Vec3.normalize(curr, curr);
            normalsN.push(curr);
        }

        // 4. Binormal = T x N
        for (let i = 0; i < n; ++i) {
            binormals.push(Vec3.cross(Vec3.create(), tangents[i], normalsN[i]));
        }

        // 5. Ring lingkaran di setiap titik -> grid
        const ringDir = (i, angle) => {
            const d = Vec3.scale(Vec3.create(), normalsN[i], Math.cos(angle));
            return Vec3.add(d, d, Vec3.scale(Vec3.create(), binormals[i], Math.sin(angle)));
        };

        const body = Quadrics.createParametricGrid(n - 1, radialSegments, (u, v) => {
            const i = Math.round(u * (n - 1));
            const d = ringDir(i, v * Math.PI * 2);
            const r = radiusFn(i / (n - 1));
            return { p: [points[i][0] + d[0] * r, points[i][1] + d[1] * r, points[i][2] + d[2] * r], n: d };
        });

        // 6. Tutup ujung tabung (cap) - kipas segitiga
        const positions = Array.from(body.positions);
        const normals = Array.from(body.normals);
        const indices = Array.from(body.indices);

        const addCap = (i, sign) => {
            const base = positions.length / 3;
            const r = radiusFn(i / (n - 1));
            const capNormal = Vec3.scale(Vec3.create(), tangents[i], sign);

            positions.push(points[i][0], points[i][1], points[i][2]);
            normals.push(capNormal[0], capNormal[1], capNormal[2]);

            for (let j = 0; j <= radialSegments; ++j) {
                const d = ringDir(i, (j / radialSegments) * Math.PI * 2);
                positions.push(points[i][0] + d[0] * r, points[i][1] + d[1] * r, points[i][2] + d[2] * r);
                normals.push(capNormal[0], capNormal[1], capNormal[2]);
            }
            for (let j = 1; j <= radialSegments; ++j) {
                indices.push(base, base + j, base + j + 1);
            }
        };

        if (capStart) addCap(0, -1);
        if (capEnd) addCap(n - 1, 1);

        return Quadrics.toMesh(positions, normals, indices);
    },

    /**
     * Membuat tabung yang mengikuti kurva Cubic Bezier 3D
     */
    createCubicBezierTube(p0, p1, p2, p3, segments = 32, radius = 0.05, radiusFn = null, radialSegments = 16) {
        const points = [];
        for (let i = 0; i <= segments; ++i) {
            points.push(Curves.evaluateCubicBezier(p0, p1, p2, p3, i / segments));
        }
        const mesh = Curves.createTubeFromPoints(points, radius, radialSegments, radiusFn);
        if (mesh) {
            mesh.type = "3D Cubic Bezier Curve";
            mesh.controlPoints = [p0, p1, p2, p3];
            mesh.points = points;
        }
        return mesh;
    }
};
