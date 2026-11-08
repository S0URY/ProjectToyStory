/**
 * scene-node.js - Hierarchical Transformation Scene Graph Node
 * Implements:
 * - Parent-Child scene graph
 * - Hierarchical matrix multiplication: WorldMatrix = ParentWorldMatrix * LocalMatrix
 * - Custom local matrix hook (dipakai untuk Rotate Arbitrary Axis di sayap Wheezy)
 */

import { Mat4, Vec3 } from './math3d.js';

export class SceneNode {
    constructor(name = "Node") {
        this.name = name;
        this.parent = null;
        this.children = [];

        // Local Transforms
        this.position = Vec3.create(0, 0, 0);
        this.rotation = Vec3.create(0, 0, 0); // Euler angles (radians)
        this.scale = Vec3.create(1, 1, 1);

        // Arbitrary Axis Rotation Support: { angle: radians, axis: [x, y, z] }
        this.arbitraryRotation = { angle: 0.0, axis: [1.0, 0.0, 0.0] };

        // Transformation Matrices
        this.localMatrix = Mat4.create();
        this.worldMatrix = Mat4.create();

        // Custom transformation matrix (overrides default TRS if specified)
        // Jika true, localMatrix TIDAK dihitung ulang dari position/rotation/scale,
        // tetapi diisi sendiri (contoh: rotasi sumbu sembarang).
        this.hasCustomLocalMatrix = false;

        // Custom animation callback: fn(node, time)
        this.onUpdate = null;

        // Render properties
        this.buffers = null;
        this.baseColor = [1.0, 1.0, 1.0, 1.0];
        this.shininess = 32.0;
        this.opacity = 1.0;
        this.visible = true;
        this.isTransparent = false;
        this.unlit = false;   // warna polos tanpa lighting (bayangan, berkas cahaya)
        this.sway = false;    // bergoyang di vertex shader (opsional, tidak dipakai di kamar mainan)

        // Quadric metadata (dokumentasi: bentuk & rumus yang dipakai node ini)
        this.quadricType = null;     // e.g. "Ellipsoid", "Elliptic Paraboloid", "Cone", ...
        this.quadricEquation = null; // e.g. "x²/a² + y²/b² + z²/c² = 1"
    }

    addChild(child) {
        if (child.parent) {
            child.parent.removeChild(child);
        }
        child.parent = this;
        this.children.push(child);
        return child;
    }

    removeChild(child) {
        const idx = this.children.indexOf(child);
        if (idx !== -1) {
            child.parent = null;
            this.children.splice(idx, 1);
        }
    }

    /**
     * Local Matrix = Translate · RotateY · RotateX · RotateZ · ArbitraryRotate · Scale
     * (dibaca dari kanan: di-scale dulu, lalu diputar, lalu digeser)
     */
    updateLocalMatrix() {
        if (this.hasCustomLocalMatrix) return;

        Mat4.identity(this.localMatrix);
        Mat4.translate(this.localMatrix, this.localMatrix, this.position);
        if (this.rotation[1] !== 0) Mat4.rotateY(this.localMatrix, this.localMatrix, this.rotation[1]);
        if (this.rotation[0] !== 0) Mat4.rotateX(this.localMatrix, this.localMatrix, this.rotation[0]);
        if (this.rotation[2] !== 0) Mat4.rotateZ(this.localMatrix, this.localMatrix, this.rotation[2]);
        if (this.arbitraryRotation && this.arbitraryRotation.angle !== 0) {
            Mat4.rotateArbitraryAxis(this.localMatrix, this.localMatrix, this.arbitraryRotation.angle, this.arbitraryRotation.axis);
        }
        Mat4.scale(this.localMatrix, this.localMatrix, this.scale);
    }

    /**
     * Hierarchical Transformation Update
     * Recursively computes world matrix: M_world = M_parent * M_local
     * Artinya: kalau PARENT bergerak/berputar/membesar, semua CHILD ikut.
     */
    update(time, parentWorldMatrix = null) {
        if (this.onUpdate) {
            this.onUpdate(this, time);
        }

        this.updateLocalMatrix();

        if (parentWorldMatrix) {
            Mat4.multiply(this.worldMatrix, parentWorldMatrix, this.localMatrix);
        } else {
            Mat4.copy(this.worldMatrix, this.localMatrix);
        }

        // Recursively update all children in hierarchy
        for (let i = 0; i < this.children.length; ++i) {
            this.children[i].update(time, this.worldMatrix);
        }
    }

    draw(gl, programInfo, normalMat3, renderTransparent = false) {
        if (!this.visible) return;

        // Render opaque passes first, transparent passes second
        if (this.isTransparent === renderTransparent && this.buffers) {
            const locs = programInfo.locations;

            // Normal matrix = transpose(inverse(model)) -> normal tetap tegak lurus
            // permukaan walaupun objek di-scale tidak rata (non-uniform scaling)
            Mat4.normalMatrix(normalMat3, this.worldMatrix);

            gl.uniformMatrix4fv(locs.u_ModelMatrix, false, this.worldMatrix);
            gl.uniformMatrix3fv(locs.u_NormalMatrix, false, normalMat3);

            gl.uniform4fv(locs.u_BaseColor, this.baseColor);
            gl.uniform1f(locs.u_Shininess, this.shininess);
            gl.uniform1f(locs.u_Opacity, this.opacity);
            gl.uniform1i(locs.u_Unlit, this.unlit ? 1 : 0);
            gl.uniform1i(locs.u_Sway, this.sway ? 1 : 0);

            // Bind attributes
            gl.bindBuffer(gl.ARRAY_BUFFER, this.buffers.position);
            gl.vertexAttribPointer(locs.a_Position, 3, gl.FLOAT, false, 0, 0);
            gl.enableVertexAttribArray(locs.a_Position);

            gl.bindBuffer(gl.ARRAY_BUFFER, this.buffers.normal);
            gl.vertexAttribPointer(locs.a_Normal, 3, gl.FLOAT, false, 0, 0);
            gl.enableVertexAttribArray(locs.a_Normal);

            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.buffers.indices);
            gl.drawElements(gl.TRIANGLES, this.buffers.numIndices, this.buffers.indexType, 0);
        }

        // Draw children
        for (let i = 0; i < this.children.length; ++i) {
            this.children[i].draw(gl, programInfo, normalMat3, renderTransparent);
        }
    }
}
