/**
 * quadrics.js - Generator Permukaan Quadric Parametrik (Murni Matematika)
 * Implements: Ellipsoid, Elliptic Paraboloid, Elliptic Cone, Cylinder,
 * Hyperbolic Paraboloid, Hyperboloid of One Sheet, Hyperboloid of Two Sheets,
 * ditambah Disk (bidang datar), Grid Parametrik umum, Translate & Merge mesh.
 *
 * Quadric yang DINILAI (bukan ellipsoid/cylinder):
 *   Karakter Wheezy  : Elliptic Paraboloid (kaki), Cone (paruh)
 *   Kamar mainan    : Cone (gasing, berkas cahaya), Hyperboloid of One Sheet (sabuk bola)
 *   Siap dipakai    : Hyperbolic Paraboloid, Hyperboloid of Two Sheets
 *
 * Semua bentuk dibuat di TITIK ASAL (0,0,0). Posisi, rotasi, dan ukuran
 * diatur nanti oleh SceneNode (position / rotation / scale), sama seperti Spongebob.
 *
 * Catatan sumbu: di tabel rumus, sumbu Z = "atas". Di WebGL sumbu atas = Y,
 * jadi hasil rumus dipetakan:  WebGL x = X(u,v),  WebGL y = Z(u,v),  WebGL z = Y(u,v)
 * u-range selalu (-PI, PI).
 *
 * Format mesh yang dihasilkan:
 *   { positions: Float32Array, normals: Float32Array, indices: Uint16Array | Uint32Array }
 */

export const Quadrics = {
    /**
     * Mengubah array biasa menjadi typed array siap kirim ke GPU.
     * Jika jumlah vertex > 65535, index harus Uint32 (butuh ekstensi OES_element_index_uint).
     */
    toMesh(positions, normals, indices) {
        const vertexCount = positions.length / 3;
        return {
            positions: new Float32Array(positions),
            normals: new Float32Array(normals),
            indices: vertexCount > 65535 ? new Uint32Array(indices) : new Uint16Array(indices)
        };
    },

    /**
     * GRID PARAMETRIK UMUM
     * Membuat jaring segitiga dari fungsi fn(i, j), dengan i dan j dari 0 sampai 1.
     * fn harus mengembalikan { p: [x,y,z], n: [nx,ny,nz] }.
     * Setiap kotak grid dipecah menjadi 2 segitiga.
     * Hampir semua bentuk di file ini (dan lantai pasir) memakai fungsi ini.
     */
    createParametricGrid(rows, cols, fn) {
        const positions = [];
        const normals = [];
        const indices = [];

        for (let i = 0; i <= rows; ++i) {
            for (let j = 0; j <= cols; ++j) {
                const v = fn(i / rows, j / cols);
                positions.push(v.p[0], v.p[1], v.p[2]);

                const len = Math.hypot(v.n[0], v.n[1], v.n[2]) || 1.0;
                normals.push(v.n[0] / len, v.n[1] / len, v.n[2] / len);
            }
        }

        for (let i = 0; i < rows; ++i) {
            for (let j = 0; j < cols; ++j) {
                const first = i * (cols + 1) + j;
                const second = first + cols + 1;

                indices.push(first, second, first + 1);
                indices.push(second, second + 1, first + 1);
            }
        }

        return Quadrics.toMesh(positions, normals, indices);
    },

    /**
     * 1. ELLIPSOID (bola lonjong)
     * Persamaan implisit: x²/a² + y²/b² + z²/c² = 1
     * Parametrik:
     *   v ∈ [vMin, vMax]  (default -π/2..π/2 = penuh; bisa dipotong untuk setengah ellipsoid)
     *   u ∈ [-π, π]
     *   x = a · cos(v) · cos(u)
     *   y = b · sin(v)            (b = jari-jari tinggi)
     *   z = c · cos(v) · sin(u)
     * Normal: [x/a², y/b², z/c²] dinormalisasi (gradien persamaan implisit)
     *
     * Dipakai untuk: badan, perut, kepala, mata, pipi, sayap Wheezy, gelembung,
     * batu, kerang (setengah ellipsoid), mutiara, badan bintang laut.
     */
    createEllipsoid(a = 1.0, b = 1.0, c = 1.0, stacks = 40, sectors = 56, vMin = -Math.PI / 2, vMax = Math.PI / 2) {
        return Quadrics.createParametricGrid(stacks, sectors, (i, j) => {
            const v = vMin + (vMax - vMin) * i;
            const u = -Math.PI + 2 * Math.PI * j;

            const x = a * Math.cos(v) * Math.cos(u);
            const y = b * Math.sin(v);
            const z = c * Math.cos(v) * Math.sin(u);

            return {
                p: [x, y, z],
                n: [x / (a * a), y / (b * b), z / (c * c)]
            };
        });
    },

    /**
     * 2. ELLIPTIC PARABOLOID (mangkuk)
     * Persamaan implisit: x²/a² + z²/b² = y/c
     * Parametrik:
     *   v ∈ [0, 1], u ∈ [-π, π]
     *   x = a · v · cos(u)
     *   z = b · v · sin(u)
     *   y = c · v²
     * Normal: gradien x²/a² + z²/b² - y/c  ->  [2x/a², -1/c, 2z/b²]
     *
     * Jika c NEGATIF, mangkuk terbalik menjadi KUBAH (puncak di titik asal).
     * Dipakai untuk: KAKI WHEEZY (di-scale sangat pipih).
     */
    /**
     * 2. ELLIPTIC PARABOLOID (mangkuk)
     * Persamaan implisit: x²/a² + z²/b² = y/c
     * Mendukung pemanggilan Wheezy: (a, b, c, stacks, sectors)
     * dan Alien: (a, b, c, inverted, stacks, sectors)
     */
    createEllipticParaboloid(a = 1.0, b = 1.0, c = -1.0, arg4 = 40, arg5 = 56, arg6 = 36) {
        let inverted = false;
        let stacks = 40;
        let sectors = 56;

        if (typeof arg4 === 'boolean') {
            inverted = arg4;
            if (typeof arg5 === 'number') stacks = arg5;
            if (typeof arg6 === 'number') sectors = arg6;
        } else {
            if (typeof arg4 === 'number') stacks = arg4;
            if (typeof arg5 === 'number') sectors = arg5;
            if (c < 0) inverted = true;
        }

        const sign = inverted ? -1.0 : 1.0;
        const absC = Math.abs(c);

        const positions = [];
        const normals = [];
        const indices = [];

        for (let i = 0; i <= stacks; ++i) {
            const r = i / stacks;
            for (let j = 0; j <= sectors; ++j) {
                const v = (2 * Math.PI * j) / sectors;
                const cosV = Math.cos(v);
                const sinV = Math.sin(v);

                const x = a * r * cosV;
                const z = b * r * sinV;
                const y = sign * absC * r * r;

                positions.push(x, y, z);

                let nx = -sign * ((2 * absC * x) / (a * a));
                let ny = 1.0;
                let nz = -sign * ((2 * absC * z) / (b * b));

                if (inverted) {
                    nx = -nx;
                    ny = -ny;
                    nz = -nz;
                }

                const len = Math.hypot(nx, ny, nz) || 1.0;
                normals.push(nx / len, ny / len, nz / len);
            }
        }

        for (let i = 0; i < stacks; ++i) {
            for (let j = 0; j < sectors; ++j) {
                const first = i * (sectors + 1) + j;
                const second = first + sectors + 1;

                if (inverted) {
                    indices.push(first, first + 1, second);
                    indices.push(second, first + 1, second + 1);
                } else {
                    indices.push(first, second, first + 1);
                    indices.push(second, second + 1, first + 1);
                }
            }
        }

        return Quadrics.toMesh(positions, normals, indices);
    },

    /**
     * 3. ELLIPTIC CONE (kerucut)
     * Mendukung pemanggilan Wheezy: (radius, height, sectors)
     * dan Alien: (rBase, rApex, height, stacks, sectors, capped)
     */
    createCone(rBase = 1.0, arg2 = 0.0, arg3 = 1.0, stacks = 20, sectors = 20, capped = true) {
        if (arguments.length <= 3 && (typeof arg3 === 'number' || arg3 === undefined)) {
            const height = typeof arg2 === 'number' ? arg2 : 1.0;
            const sec = typeof arg3 === 'number' ? arg3 : 20;
            return Quadrics.createParametricGrid(1, sec, (i, j) => {
                const v = -1 + i;
                const u = -Math.PI + 2 * Math.PI * j;

                const x = rBase * v * Math.cos(u);
                const z = rBase * v * Math.sin(u);
                const Y = height * v;

                return {
                    p: [x, height + Y, z],
                    n: [x / (rBase * rBase), -Y / (height * height), z / (rBase * rBase)]
                };
            });
        }

        const rApex = arg2;
        const height = arg3;
        const positions = [];
        const normals = [];
        const indices = [];
        const slope = (rBase - rApex) / height;

        for (let i = 0; i <= stacks; ++i) {
            const u = i / stacks;
            const r = rBase * (1 - u) + rApex * u;
            const y = -height / 2 + height * u;

            for (let j = 0; j <= sectors; ++j) {
                const v = (2 * Math.PI * j) / sectors;
                const cosV = Math.cos(v);
                const sinV = Math.sin(v);

                const x = r * cosV;
                const z = r * sinV;

                positions.push(x, y, z);

                let nx = cosV;
                let ny = slope;
                let nz = sinV;
                const len = Math.hypot(nx, ny, nz) || 1.0;
                normals.push(nx / len, ny / len, nz / len);
            }
        }

        for (let i = 0; i < stacks; ++i) {
            for (let j = 0; j < sectors; ++j) {
                const first = i * (sectors + 1) + j;
                const second = first + sectors + 1;

                indices.push(first, second, first + 1);
                indices.push(second, second + 1, first + 1);
            }
        }

        if (capped && rBase > 0.001) {
            const baseCenterIdx = positions.length / 3;
            positions.push(0, -height / 2, 0);
            normals.push(0, -1, 0);

            for (let j = 0; j <= sectors; ++j) {
                const v = (2 * Math.PI * j) / sectors;
                positions.push(rBase * Math.cos(v), -height / 2, rBase * Math.sin(v));
                normals.push(0, -1, 0);
            }

            for (let j = 0; j < sectors; ++j) {
                indices.push(baseCenterIdx, baseCenterIdx + 1 + j + 1, baseCenterIdx + 1 + j);
            }
        }

        return Quadrics.toMesh(positions, normals, indices);
    },

    /**
     * 5. HYPERBOLIC PARABOLOID (pelana / "pringles")
     * Persamaan implisit: y/c = z²/b² - x²/a²
     * Parametrik (batas dibuat ELIPS supaya tepinya membulat, bukan persegi):
     *   r ∈ [0, 1], u ∈ [-π, π]
     *   x = a · r · cos(u)
     *   z = b · r · sin(u)
     *   y = c · (z²/b² - x²/a²)
     * Normal: gradien x²/a² - z²/b² + y/c  ->  [2x/a², 1/c, -2z/b²]
     *
     * Cocok untuk: sayap / sirip pipih yang melengkung seperti pelana.
     */
    createHyperbolicParaboloid(a = 1.0, b = 1.0, c = 0.2, rings = 16, sectors = 48) {
        return Quadrics.createParametricGrid(rings, sectors, (i, j) => {
            const r = i;
            const u = -Math.PI + 2 * Math.PI * j;

            const x = a * r * Math.cos(u);
            const z = b * r * Math.sin(u);
            const y = c * ((z * z) / (b * b) - (x * x) / (a * a));

            return {
                p: [x, y, z],
                n: [2 * x / (a * a), 1 / c, -2 * z / (b * b)]
            };
        });
    },

    /**
     * 6. HYPERBOLOID OF ONE SHEET (tabung yang menyempit di tengah)
     * Persamaan implisit: x²/a² + z²/b² - y²/c² = 1
     */
    createHyperboloidOneSheet(a = 1.0, b = 1.0, c = 1.0, vMax = 1.0, stacks = 24, sectors = 56) {
        return Quadrics.createParametricGrid(stacks, sectors, (i, j) => {
            const v = -vMax + 2 * vMax * i;
            const u = -Math.PI + 2 * Math.PI * j;

            const x = a * Math.cosh(v) * Math.cos(u);
            const z = b * Math.cosh(v) * Math.sin(u);
            const y = c * Math.sinh(v);

            return {
                p: [x, y, z],
                n: [2 * x / (a * a), -2 * y / (c * c), 2 * z / (b * b)]
            };
        });
    },

    /**
     * Hyperboloid of 1 Sheet dengan ketebalan padat (solid rim thickness)
     * Digunakan untuk kerah astronot Alien
     */
    createHyperboloid1Sheet(a = 0.8, b = 0.8, c = 0.8, uMin = -0.6, uMax = 0.6, stacks = 28, sectors = 36, thickness = 0.08) {
        const positions = [];
        const normals = [];
        const indices = [];

        // Outer surface
        for (let i = 0; i <= stacks; ++i) {
            const u = uMin + ((uMax - uMin) * i) / stacks;
            const radiusFactor = Math.sqrt(1.0 + (u * u) / (c * c));

            for (let j = 0; j <= sectors; ++j) {
                const v = (2 * Math.PI * j) / sectors;
                const cosV = Math.cos(v);
                const sinV = Math.sin(v);

                const x = (a + thickness * 0.5) * radiusFactor * cosV;
                const y = u;
                const z = (b + thickness * 0.5) * radiusFactor * sinV;

                positions.push(x, y, z);

                let nx = (2 * x) / (a * a);
                let ny = (-2 * y) / (c * c);
                let nz = (2 * z) / (b * b);
                const len = Math.hypot(nx, ny, nz) || 1.0;
                normals.push(nx / len, ny / len, nz / len);
            }
        }

        for (let i = 0; i < stacks; ++i) {
            for (let j = 0; j < sectors; ++j) {
                const first = i * (sectors + 1) + j;
                const second = first + sectors + 1;

                indices.push(first, second, first + 1);
                indices.push(second, second + 1, first + 1);
            }
        }

        // Inner surface for solid collar rim thickness
        const innerOffset = positions.length / 3;
        for (let i = 0; i <= stacks; ++i) {
            const u = uMin + ((uMax - uMin) * i) / stacks;
            const radiusFactor = Math.sqrt(1.0 + (u * u) / (c * c));

            for (let j = 0; j <= sectors; ++j) {
                const v = (2 * Math.PI * j) / sectors;
                const cosV = Math.cos(v);
                const sinV = Math.sin(v);

                const innerA = Math.max(0.1, a - thickness * 0.5);
                const innerB = Math.max(0.1, b - thickness * 0.5);
                const x = innerA * radiusFactor * cosV;
                const y = u;
                const z = innerB * radiusFactor * sinV;

                positions.push(x, y, z);

                let nx = -(2 * x) / (a * a);
                let ny = -(-2 * y) / (c * c);
                let nz = -(2 * z) / (b * b);
                const len = Math.hypot(nx, ny, nz) || 1.0;
                normals.push(nx / len, ny / len, nz / len);
            }
        }

        for (let i = 0; i < stacks; ++i) {
            for (let j = 0; j < sectors; ++j) {
                const first = innerOffset + i * (sectors + 1) + j;
                const second = first + sectors + 1;

                indices.push(first, first + 1, second);
                indices.push(second, first + 1, second + 1);
            }
        }

        // Top Rim Connecting Outer and Inner
        const topOuterRowStart = stacks * (sectors + 1);
        const topInnerRowStart = innerOffset + stacks * (sectors + 1);
        for (let j = 0; j < sectors; ++j) {
            const o1 = topOuterRowStart + j;
            const o2 = topOuterRowStart + j + 1;
            const i1 = topInnerRowStart + j;
            const i2 = topInnerRowStart + j + 1;

            indices.push(o1, i1, o2);
            indices.push(o2, i1, i2);
        }

        // Bottom Rim Connecting Outer and Inner
        const botOuterRowStart = 0;
        const botInnerRowStart = innerOffset;
        for (let j = 0; j < sectors; ++j) {
            const o1 = botOuterRowStart + j;
            const o2 = botOuterRowStart + j + 1;
            const i1 = botInnerRowStart + j;
            const i2 = botInnerRowStart + j + 1;

            indices.push(o1, o2, i1);
            indices.push(o2, i2, i1);
        }

        return Quadrics.toMesh(positions, normals, indices);
    },

    /**
     * Kelopak Mata Atas Mengantuk (Sleepy Drooping Eyelid Hood)
     */
    createEyelidHood(a = 0.21, b = 0.25, c = 0.19, droop = 0.12, thickness = 0.016, stacks = 22, sectors = 36, droopArch = 0.035) {
        const positions = [];
        const normals = [];
        const indices = [];

        const ra = a + thickness;
        const rb = b + thickness;
        const rc = c + thickness;

        const uBase = Math.asin(Math.max(-0.9, Math.min(0.9, 1.0 - 2.0 * droop)));

        // 1. Lapisan Luar Kelopak Mata (Outer Eyelid Shell)
        for (let i = 0; i <= stacks; ++i) {
            const t = i / stacks;
            for (let j = 0; j <= sectors; ++j) {
                const v = (2 * Math.PI * j) / sectors;
                const sinV = Math.sin(v);
                const cosV = Math.cos(v);

                const frontWeight = Math.max(0.0, sinV);
                const uEdge = uBase - droopArch * frontWeight;
                const u = uEdge + (Math.PI / 2 - uEdge) * t;

                const sinU = Math.sin(u);
                const cosU = Math.cos(u);

                const x = ra * cosU * cosV;
                const y = rb * sinU;
                const z = rc * cosU * sinV;

                positions.push(x, y, z);

                let nx = x / (ra * ra);
                let ny = y / (rb * rb);
                let nz = z / (rc * rc);
                const len = Math.hypot(nx, ny, nz) || 1.0;
                normals.push(nx / len, ny / len, nz / len);
            }
        }

        // Indeks untuk kubah luar
        for (let i = 0; i < stacks; ++i) {
            for (let j = 0; j < sectors; ++j) {
                const first = i * (sectors + 1) + j;
                const second = first + sectors + 1;

                indices.push(first, second, first + 1);
                indices.push(second, second + 1, first + 1);
            }
        }

        // 2. Beveled Rim Lip di Sepanjang Garis Bawah Kelopak Mata
        const rimOffset = positions.length / 3;
        for (let j = 0; j <= sectors; ++j) {
            const v = (2 * Math.PI * j) / sectors;
            const sinV = Math.sin(v);
            const cosV = Math.cos(v);

            const frontWeight = Math.max(0.0, sinV);
            const uEdge = uBase - droopArch * frontWeight;
            const sinU = Math.sin(uEdge);
            const cosU = Math.cos(uEdge);

            const xOut = ra * cosU * cosV;
            const yOut = rb * sinU;
            const zOut = rc * cosU * sinV;

            const rClear = 0.002;
            const xIn = (a + rClear) * cosU * cosV;
            const yIn = (b + rClear) * sinU;
            const zIn = (c + rClear) * cosU * sinV;

            positions.push(xOut, yOut, zOut);
            normals.push(0, -1, 0.2 * frontWeight);

            positions.push(xIn, yIn, zIn);
            normals.push(0, -1, -0.2);
        }

        for (let j = 0; j < sectors; ++j) {
            const p1 = rimOffset + j * 2;
            const p2 = p1 + 1;
            const p3 = p1 + 2;
            const p4 = p1 + 3;

            indices.push(p1, p3, p2);
            indices.push(p2, p3, p4);
        }

        return Quadrics.toMesh(positions, normals, indices);
    },

    /**
     * Sphere via Stacks & Sectors (alias createEllipsoid)
     */
    createStacksSectorsSphere(radius = 1.0, stacks = 32, sectors = 40) {
        return Quadrics.createEllipsoid(radius, radius, radius, stacks, sectors);
    },

    /**
     * 7. HYPERBOLOID OF TWO SHEETS (dua kubah yang saling membelakangi)
     */
    createHyperboloidTwoSheets(a = 1.0, b = 1.0, c = 1.0, vMax = 1.0, stacks = 32, sectors = 56) {
        return Quadrics.createParametricGrid(stacks, sectors, (i, j) => {
            const v = vMax * i;
            const u = -Math.PI + 2 * Math.PI * j;

            const x = a * Math.sinh(v) * Math.cos(u);
            const z = b * Math.sinh(v) * Math.sin(u);
            const ySheet = -c * Math.cosh(v);

            return {
                p: [x, ySheet + c, z],
                n: [2 * x / (a * a), -2 * ySheet / (c * c), 2 * z / (b * b)]
            };
        });
    },

    /**
     * 4. CYLINDER (tabung)
     * Mendukung silinder berpenutup (capped = true) untuk anggota tubuh Alien
     * dan silinder kisi terbuka berparameter baris untuk lingkungan.
     */
    createCylinder(radius = 0.5, height = 1.0, sectors = 20, cappedOrRows = 12) {
        if (cappedOrRows === true) {
            const positions = [];
            const normals = [];
            const indices = [];

            for (let i = 0; i <= 1; ++i) {
                const y = -height / 2 + height * i;
                for (let j = 0; j <= sectors; ++j) {
                    const v = (2 * Math.PI * j) / sectors;
                    const cosV = Math.cos(v);
                    const sinV = Math.sin(v);

                    positions.push(radius * cosV, y, radius * sinV);
                    normals.push(cosV, 0, sinV);
                }
            }

            for (let j = 0; j < sectors; ++j) {
                const first = j;
                const second = first + sectors + 1;
                indices.push(first, second, first + 1);
                indices.push(second, second + 1, first + 1);
            }

            // Top Cap
            let base = positions.length / 3;
            positions.push(0, height / 2, 0);
            normals.push(0, 1, 0);
            for (let j = 0; j <= sectors; ++j) {
                const v = (2 * Math.PI * j) / sectors;
                positions.push(radius * Math.cos(v), height / 2, radius * Math.sin(v));
                normals.push(0, 1, 0);
            }
            for (let j = 0; j < sectors; ++j) {
                indices.push(base, base + 1 + j, base + 1 + j + 1);
            }

            // Bottom Cap
            base = positions.length / 3;
            positions.push(0, -height / 2, 0);
            normals.push(0, -1, 0);
            for (let j = 0; j <= sectors; ++j) {
                const v = (2 * Math.PI * j) / sectors;
                positions.push(radius * Math.cos(v), -height / 2, radius * Math.sin(v));
                normals.push(0, -1, 0);
            }
            for (let j = 0; j < sectors; ++j) {
                indices.push(base, base + 1 + j + 1, base + 1 + j);
            }

            return Quadrics.toMesh(positions, normals, indices);
        }

        const rows = typeof cappedOrRows === 'number' ? cappedOrRows : 12;
        return Quadrics.createParametricGrid(rows, sectors, (i, j) => {
            const v = height * i;
            const u = -Math.PI + 2 * Math.PI * j;

            return {
                p: [radius * Math.cos(u), v, radius * Math.sin(u)],
                n: [Math.cos(u), 0, Math.sin(u)]
            };
        });
    },

    /**
     * DISK (lingkaran / elips datar). BUKAN quadric, hanya bidang datar.
     * normalY = 1 menghadap ke atas, -1 menghadap ke bawah.
     * Dipakai untuk: bayangan karakter.
     */
    createDisk(rx = 1.0, rz = 1.0, normalY = 1, segments = 56) {
        const positions = [0, 0, 0];
        const normals = [0, normalY, 0];
        const indices = [];

        for (let j = 0; j <= segments; ++j) {
            const t = (j / segments) * Math.PI * 2;
            positions.push(rx * Math.cos(t), 0, rz * Math.sin(t));
            normals.push(0, normalY, 0);
        }
        for (let j = 1; j <= segments; ++j) {
            indices.push(0, j, j + 1);
        }

        return Quadrics.toMesh(positions, normals, indices);
    },

    /**
     * BOX / BALOK (BUKAN quadric, hanya 6 bidang datar).
     * Pusat di titik asal, ukuran w (x) × h (y) × d (z).
     * Dipakai untuk: lantai papan kayu, dinding, balok mainan, kasur, rak buku.
     */
    createBox(w = 1.0, h = 1.0, d = 1.0) {
        const x = w / 2, y = h / 2, z = d / 2;
        // [normal, 4 sudut]
        const faces = [
            [[1, 0, 0], [[x, -y, -z], [x, y, -z], [x, y, z], [x, -y, z]]],
            [[-1, 0, 0], [[-x, -y, z], [-x, y, z], [-x, y, -z], [-x, -y, -z]]],
            [[0, 1, 0], [[-x, y, -z], [-x, y, z], [x, y, z], [x, y, -z]]],
            [[0, -1, 0], [[-x, -y, z], [-x, -y, -z], [x, -y, -z], [x, -y, z]]],
            [[0, 0, 1], [[-x, -y, z], [x, -y, z], [x, y, z], [-x, y, z]]],
            [[0, 0, -1], [[x, -y, -z], [-x, -y, -z], [-x, y, -z], [x, y, -z]]]
        ];
        const positions = [];
        const normals = [];
        const indices = [];
        for (const [n, corners] of faces) {
            const base = positions.length / 3;
            for (const c of corners) {
                positions.push(c[0], c[1], c[2]);
                normals.push(n[0], n[1], n[2]);
            }
            indices.push(base, base + 1, base + 2, base, base + 2, base + 3);
        }
        return Quadrics.toMesh(positions, normals, indices);
    },

    /**
     * Menggeser semua vertex sebuah mesh sejauh offset [x, y, z].
     * Dipakai di lingkungan: banyak batu/kerang dibuat di titik asal lalu dipindah ke posisinya.
     */
    translate(mesh, offset) {
        const positions = new Float32Array(mesh.positions.length);
        for (let i = 0; i < positions.length; i += 3) {
            positions[i] = mesh.positions[i] + offset[0];
            positions[i + 1] = mesh.positions[i + 1] + offset[1];
            positions[i + 2] = mesh.positions[i + 2] + offset[2];
        }
        return { positions, normals: mesh.normals, indices: mesh.indices };
    },

    /**
     * Menggabungkan banyak mesh menjadi SATU mesh supaya cukup 1 kali draw (lebih cepat).
     * Dipakai di lingkungan (ratusan rumput laut, karang, dll).
     */
    merge(meshList) {
        const positions = [];
        const normals = [];
        const indices = [];

        for (const mesh of meshList) {
            const offset = positions.length / 3;
            for (let i = 0; i < mesh.positions.length; ++i) positions.push(mesh.positions[i]);
            for (let i = 0; i < mesh.normals.length; ++i) normals.push(mesh.normals[i]);
            for (let i = 0; i < mesh.indices.length; ++i) indices.push(mesh.indices[i] + offset);
        }

        return Quadrics.toMesh(positions, normals, indices);
    }
};
