/**
 * hamm.js - Karakter Hamm (dipindahkan dari TugasUTSgrafkom/main.js)
 *
 * Isi model & animasi TIDAK diubah. Perubahan hanya supaya bisa digabung ke project ini:
 *  - LIBS di-import dari ./libs.js (sebelumnya <script src="libs.js">)
 *  - Shader, kamera, dan render loop milik Hamm dihapus -> memakai milik main.js
 *  - Kode penyusun karakter dibungkus fungsi buildHamm()
 *  - Ditambah class Hamm (update + draw) supaya dipanggil dari main.js seperti Wheezy
 */

import { LIBS } from './libs.js';
import { Mat4 } from '../../core/math3d.js';

let gl = null;

//Fungsi vektor
function sub3(a, b) {
  return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
}

function dot3(a, b) {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

function cross3(a, b) {
  return [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0]
  ];
}

function normalize3(v) {
  const length = Math.hypot(v[0], v[1], v[2]);
  if (length < 0.00001) return [0, 1, 0];
  return v.map(function (value) {
    return value / length;
  });
}

//Buat mesh dan normalisasi
function calculateNormals(positions, indices) {
  const normals = new Float32Array(positions.length);

  for (let i = 0; i < indices.length; i += 3) {
    const ia = indices[i] * 3;
    const ib = indices[i + 1] * 3;
    const ic = indices[i + 2] * 3;

    const a = [positions[ia], positions[ia + 1], positions[ia + 2]];
    const b = [positions[ib], positions[ib + 1], positions[ib + 2]];
    const c = [positions[ic], positions[ic + 1], positions[ic + 2]];
    const n = cross3(sub3(b, a), sub3(c, a));

    for (const k of [ia, ib, ic]) {
      normals[k] += n[0];
      normals[k + 1] += n[1];
      normals[k + 2] += n[2];
    }
  }

  for (let i = 0; i < normals.length; i += 3) {
    const n = normalize3([normals[i], normals[i + 1], normals[i + 2]]);
    normals.set(n, i);
  }
  return normals;
}

function gridMesh(rows, cols, pointFunction) {
  const positions = [];
  const indices = [];

  for (let i = 0; i <= rows; i++) {
    for (let j = 0; j <= cols; j++) {
      positions.push.apply(positions, pointFunction(i / rows, j / cols));
    }
  }

  for (let i = 0; i < rows; i++) {
    for (let j = 0; j < cols; j++) {
      const a = i * (cols + 1) + j;
      const b = a + 1;
      const c = a + cols + 1;
      indices.push(a, c, b, b, c, c + 1);
    }
  }

  const p = new Float32Array(positions);
  const idx = new Uint16Array(indices);
  return { positions: p, indices: idx, normals: calculateNormals(p, idx) };
}

//Tempat simpan objek untuk digambar
const objects = [];

function makeBuffer(target, data, usage) {
  const buffer = gl.createBuffer();
  gl.bindBuffer(target, buffer);
  gl.bufferData(target, data, usage);
  return buffer;
}

function addObject(mesh, color, group = 'body', pivot = null) {
  objects.push({
    positionBuffer: makeBuffer(gl.ARRAY_BUFFER, mesh.positions, gl.DYNAMIC_DRAW),
    normalBuffer: makeBuffer(gl.ARRAY_BUFFER, mesh.normals, gl.DYNAMIC_DRAW),
    indexBuffer: makeBuffer(gl.ELEMENT_ARRAY_BUFFER, mesh.indices, gl.STATIC_DRAW),
    originalPositions: mesh.positions,
    originalNormals: mesh.normals,
    animatedPositions: new Float32Array(mesh.positions.length),
    animatedNormals: new Float32Array(mesh.normals.length),
    indexCount: mesh.indices.length,
    color, group, pivot
  });
}

//Ellipsoid untuk badan, mata, kaki dan detil lain
function ellipsoid(cx, cy, cz, rx, ry, rz, rows = 20, cols = 28) {
  return gridMesh(rows, cols, function (u, v) {
    const theta = Math.PI * u;
    const phi = Math.PI * 2 * v;
    return [
      cx + rx * Math.sin(theta) * Math.cos(phi),
      cy + ry * Math.cos(theta),
      cz + rz * Math.sin(theta) * Math.sin(phi)
    ];
  });
}

function ellipsoidRotZ(cx, cy, cz, rx, ry, rz, angle) {
  const c = Math.cos(angle), s = Math.sin(angle);
  return gridMesh(18, 24, function (u, v) {
    const theta = Math.PI * u, phi = Math.PI * 2 * v;
    const x = rx * Math.sin(theta) * Math.cos(phi);
    const y = ry * Math.cos(theta);
    const z = rz * Math.sin(theta) * Math.sin(phi);
    return [cx + x * c - y * s, cy + x * s + y * c, cz + z];
  });
}

//Kerucut untuk telinga
function cone(cx, baseY, cz, radius, height, angle) {
  const mesh = gridMesh(20, 28, function (u, v) {
    const phi = Math.PI * 2 * v;
    const r = radius * (1 - 0.76 * u);
    return [r * Math.cos(phi), height * u, r * Math.sin(phi)];
  });

  const m = LIBS.get_I4();
  LIBS.rotateZ(m, angle);
  LIBS.set_position(m, cx, baseY, cz);

  const p = new Float32Array(mesh.positions.length);
  for (let i = 0; i < p.length; i += 3) {
    const x = mesh.positions[i], y = mesh.positions[i + 1], z = mesh.positions[i + 2];
    p.set([
      m[0] * x + m[4] * y + m[8] * z + m[12],
      m[1] * x + m[5] * y + m[9] * z + m[13],
      m[2] * x + m[6] * y + m[10] * z + m[14]
    ], i);
  }

  return { positions: p, indices: mesh.indices, normals: calculateNormals(p, mesh.indices) };
}

//Parabolloid ellipsoid untuk moncong hidung
function paraboloid(cx, cy, baseZ, rx, ry, depth) {
  return gridMesh(20, 36, function (u, v) {
    const phi = Math.PI * 2 * v;
    return [
      cx + rx * u * Math.cos(phi),
      cy + ry * u * Math.sin(phi),
      baseZ + depth * (1 - u * u)
    ];
  });
}

//Hyperbolloid untuk slot koin di bagian atas badan
function hyperboloid(cx, cy, cz, rx, rz, h) {
  return gridMesh(12, 36, function (u, v) {
    const y = (2 * u - 1) * h;
    const factor = Math.sqrt(1 + y * y / (h * h));
    const phi = Math.PI * 2 * v;
    return [
      cx + rx * factor * Math.cos(phi),
      cy + y,
      cz + rz * factor * Math.sin(phi)
    ];
  });
}

//Kurva bezier 3d untuk alis, mulut, ekor
function bezier(t, p0, p1, p2, p3) {
  const s = 1 - t;
  return [0, 1, 2].map(function (i) {
    return s*s*s*p0[i] + 3*s*s*t*p1[i] + 3*s*t*t*p2[i] + t*t*t*p3[i];
  });
}

function bezierTangent(t, p0, p1, p2, p3) {
  const s = 1 - t;
  return normalize3([0, 1, 2].map(function (i) {
    return 3*s*s*(p1[i]-p0[i]) + 6*s*t*(p2[i]-p1[i]) + 3*t*t*(p3[i]-p2[i]);
  }));
}

function bezierTube(p0, p1, p2, p3, radius = 0.025) {
  return gridMesh(28, 8, function (u, v) {
    const center = bezier(u, p0, p1, p2, p3);
    const tangent = bezierTangent(u, p0, p1, p2, p3);
    const reference = Math.abs(dot3(tangent, [0, 0, 1])) > 0.94 ? [0, 1, 0] : [0, 0, 1];
    const n = normalize3(cross3(tangent, reference));
    const b = normalize3(cross3(tangent, n));
    const phi = Math.PI * 2 * v;

    return [0, 1, 2].map(function (i) {
      return center[i] + radius * (n[i] * Math.cos(phi) + b[i] * Math.sin(phi));
    });
  });
}

function buildHamm() {
  //Menyusun objek jadi karakter
  const C = {
    pink: [0.96, 0.55, 0.61, 1],
    light: [1, 0.68, 0.70, 1],
    darkPink: [0.65, 0.22, 0.29, 1],
    innerEar: [0.80, 0.31, 0.39, 1],
    black: [0.075, 0.055, 0.065, 1],
    hoof: [0.095, 0.065, 0.075, 1]
  };

  //Badan dan kepala
  addObject(ellipsoid(0, 1.39, -0.18, 0.81, 0.64, 1.08, 24, 32), C.pink);
  addObject(ellipsoid(0, 1.57, 0.43, 0.67, 0.55, 0.66, 22, 30), C.pink);

  //Telinga
  for (const sign of [-1, 1]) {
    addObject(cone(sign * 0.34, 1.92, 0.455, 0.13, 0.34, -sign * 0.22), C.pink);
    addObject(ellipsoid(sign * 0.414, 2.252, 0.455, 0.05, 0.058, 0.05), C.pink);
    addObject(ellipsoidRotZ(sign * 0.37, 2.105, 0.515, 0.034, 0.073, 0.019, -sign * 0.22), C.innerEar);
  }

  //Mata
  for (const sign of [-1, 1]) {
    addObject(ellipsoidRotZ(sign * 0.285, 1.875, 0.913, 0.085, 0.047, 0.031, sign * 0.20), C.black);
  }

  //Alis mata
  function headZ(x, y) {
    const q = 1 - x*x / (0.67*0.67) - (y-1.57)*(y-1.57) / (0.55*0.55);
    return 0.43 + 0.66 * Math.sqrt(Math.max(0.015, q)) + 0.022;
  }

  const browL = [
    [-0.385, 1.895], [-0.330, 1.955],
    [-0.225, 1.975], [-0.150, 1.935]
  ].map(function (p) { return [p[0], p[1], headZ(p[0], p[1])]; });

  const browR = [
    [0.385, 1.895], [0.330, 1.955],
    [0.225, 1.975], [0.150, 1.935]
  ].map(function (p) { return [p[0], p[1], headZ(p[0], p[1])]; });

  addObject(bezierTube(browL[0], browL[1], browL[2], browL[3], 0.018), C.black);
  addObject(bezierTube(browR[0], browR[1], browR[2], browR[3], 0.018), C.black);

  //Moncong hidung
  addObject(ellipsoid(0, 1.485, 1.005, 0.385, 0.285, 0.245, 20, 32), C.light);
  addObject(paraboloid(0, 1.485, 1.115, 0.37, 0.265, 0.19), C.light);

  //Lubang hidung
  for (const sign of [-1, 1]) {
    addObject(ellipsoidRotZ(sign * 0.125, 1.505, 1.304, 0.033, 0.057, 0.018, sign * 0.10), C.darkPink);
  }

  //Mulut
  addObject(bezierTube(
    [-0.20, 1.29, 1.146], [-0.12, 1.26, 1.19],
    [0.12, 1.26, 1.19], [0.20, 1.29, 1.146], 0.012
  ), C.darkPink);

  //Kaki
  const legs = [
    { x: -0.49, z: 0.03, y: 0.63, ry: 0.35, fb: 1, group: 'FL' },
    { x: 0.49, z: 0.03, y: 0.63, ry: 0.35, fb: 1, group: 'FR' },
    { x: -0.52, z: -0.74, y: 0.69, ry: 0.40, fb: -1, group: 'BL' },
    { x: 0.52, z: -0.74, y: 0.69, ry: 0.40, fb: -1, group: 'BR' }
  ];

  for (const leg of legs) {
    const pivot = [leg.x, leg.y + leg.ry * 0.72, leg.z];
    const group = 'leg' + leg.group;
    const hoofY = leg.y - leg.ry + 0.055;

    addObject(ellipsoid(leg.x, leg.y, leg.z, 0.165, leg.ry, 0.17), C.pink, group, pivot);

    for (const dx of [-0.043, 0.043]) {
      addObject(ellipsoid(leg.x + dx, hoofY, leg.z + leg.fb * 0.018, 0.071, 0.092, 0.095), C.hoof, group, pivot);
    }
  }

  //Slot koin di bagian atas badan
  addObject(hyperboloid(0, 1.995, -0.43, 0.185, 0.070, 0.026), C.darkPink);
  addObject(ellipsoid(0, 2.012, -0.43, 0.125, 0.008, 0.029), C.black);

  //Ekor
  const tailPoints = [
    [[0.24,1.23,-1.02], [0.42,1.16,-1.24], [0.66,1.13,-1.39], [0.71,1.25,-1.42], 0.031],
    [[0.71,1.25,-1.42], [0.77,1.39,-1.43], [0.61,1.47,-1.40], [0.55,1.36,-1.36], 0.031],
    [[0.55,1.36,-1.36], [0.51,1.29,-1.33], [0.69,1.27,-1.30], [0.68,1.37,-1.29], 0.029]
  ];

  for (const tail of tailPoints) {
    addObject(bezierTube(tail[0], tail[1], tail[2], tail[3], tail[4]), C.pink, 'tail');
  }

}

//Membuat animasi karakter
function smooth(t) {
  t = Math.max(0, Math.min(1, t));
  return t*t*(3-2*t);
}

function mix(a, b, t) {
  return a + (b-a)*t;
}

function animationState(seconds) {
  const t = seconds % 7.2;
  const s = { x:0, jump:0, yaw:0, roll:0, sx:1, sy:1, sz:1, walk:0, gait:0, tail:0, spin:0 };

  //Putar ke kiri
  if (t < 0.35) {
    const u = smooth(t / 0.35);
    s.yaw = -Math.PI/2*u; s.walk = 0.25; s.gait = Math.sin(t*Math.PI*4.4);
  }

  //Jalan ke kiri
  else if (t < 1.85) {
    const u = (t-0.35)/1.5;
    s.x = mix(0,-0.78,smooth(u)); s.yaw = -Math.PI/2; s.walk = 1;
    s.gait = Math.sin((t-0.35)*Math.PI*4.4);
  }

  //Putar ke kanan
  else if (t < 2.45) {
    const u = smooth((t-1.85)/0.60);
    s.x = -0.78; s.yaw = mix(-Math.PI/2,Math.PI/2,u);
    s.walk = 0.20; s.gait = Math.sin(t*Math.PI*4.4);
  }

  //Jalan balik ke posisi awal
  else if (t < 3.95) {
    const u = (t-2.45)/1.5;
    s.x = mix(-0.78,0,smooth(u)); s.yaw = Math.PI/2; s.walk = 1;
    s.gait = Math.sin((t-2.45)*Math.PI*4.4);
  }

  //Hadap ke depan
  else if (t < 4.48) {
    const u = smooth((t-4.12)/0.36);
    s.yaw = Math.PI/2*(1-u); s.walk = 0.12;
    s.gait = Math.sin(t*Math.PI*4.4);
  }

  //Lompat+putar lawan arah jarum jam
  else if (t < 5.92) {
    const u = (t - 4.48) / 1.44;

    //Gerakan melompat
    s.jump = 0.94 * 4 * u * (1 - u);

    //Putaran 360 derajat dengan Rotate Arbitrary Axis
    s.spin = 2 * Math.PI * u;

    //Squash and stretch saat di udara
    s.sx = 1 - 0.05 * Math.sin(Math.PI * u);
    s.sz = s.sx;
    s.sy = 1 + 0.12 * Math.sin(Math.PI * u);

    s.gait = Math.sin(Math.PI * u);
    s.walk = 0.55 * Math.sin(Math.PI * u);
  }

  //Squash and stretch saat mendarat
  else if (t < 6.15) {
    const u = smooth((t-5.92)/0.23);
    s.sy = mix(1,0.68,u); s.sx = mix(1,1.17,u); s.sz = s.sx;
  } else if (t < 6.48) {
    const u = smooth((t-6.15)/0.33);
    s.sy = mix(0.68,1.12,u); s.sx = mix(1.17,0.94,u); s.sz = s.sx;
    s.jump = 0.035*Math.sin(Math.PI*u);
  } else if (t < 6.88) {
    const u = smooth((t-6.48)/0.40);
    s.sy = mix(1.12,1,u); s.sx = mix(0.94,1,u); s.sz = s.sx;
    s.jump = 0.018*(1-u);
  }

  //Ekor gerak sedikit saat jalan
  if (s.walk > 0) s.jump += 0.025*s.walk*(0.5+0.5*Math.abs(s.gait));
  s.tail = 0.075*Math.sin(seconds*9)*Math.max(0.25,s.walk);
  return s;
}

//Menganimasikan karakter
const legSigns = { legFL:1, legFR:-1, legBL:-1, legBR:1 };
const tailPivot = [0.20,1.23,-1.00], bodyPivotY = 1.20, groundOffset = -0.20;

function rotateX(p, pivot, angle) {
  const y=p[1]-pivot[1], z=p[2]-pivot[2], c=Math.cos(angle), s=Math.sin(angle);
  return [p[0],pivot[1]+y*c-z*s,pivot[2]+y*s+z*c];
}

function rotateY(p, pivot, angle) {
  const x=p[0]-pivot[0], z=p[2]-pivot[2], c=Math.cos(angle), s=Math.sin(angle);
  return [pivot[0]+x*c+z*s,p[1],pivot[2]-x*s+z*c];
}

function rotateZ(p, pivot, angle) {
  const x=p[0]-pivot[0], y=p[1]-pivot[1], c=Math.cos(angle), s=Math.sin(angle);
  return [pivot[0]+x*c-y*s,pivot[1]+x*s+y*c,p[2]];
}

//Rotate Arbitrary Axis menggunakan Rodrigues' Rotation Formula
function rotateArbitraryAxis(p, pivot, axis, angle) {
  const k = normalize3(axis);

  //Posisi relatif terhadap titik pivot
  const v = [
    p[0] - pivot[0],
    p[1] - pivot[1],
    p[2] - pivot[2]
  ];

  const c = Math.cos(angle);
  const s = Math.sin(angle);

  //Perkalian silang antara sumbu rotasi dan posisi
  const cross = cross3(k, v);

  //Perkalian titik antara sumbu rotasi dan posisi
  const dot = dot3(k, v);

  //Rumus Rodrigues
  const rotated = [
    v[0] * c + cross[0] * s + k[0] * dot * (1 - c),
    v[1] * c + cross[1] * s + k[1] * dot * (1 - c),
    v[2] * c + cross[2] * s + k[2] * dot * (1 - c)
  ];

  //Kembalikan ke posisi semula
  return [
    pivot[0] + rotated[0],
    pivot[1] + rotated[1],
    pivot[2] + rotated[2]
  ];
}

function transformVertex(v, obj, s, isNormal = false) {
  let p = [...v];

  //Kaki gerak saat jalan
  if (legSigns[obj.group] !== undefined && obj.pivot) {
    const angle = 0.42 * s.walk * s.gait * legSigns[obj.group];
    p = rotateX(p, isNormal ? [0, 0, 0] : obj.pivot, angle);
  }

  //Ekor gerak saat jalan
  if (obj.group === 'tail') {
    p = rotateY(p, isNormal ? [0, 0, 0] : tailPivot, s.tail);
  }

  if (isNormal) {
    p = [
      p[0] / s.sx,
      p[1] / s.sy,
      p[2] / s.sz
    ];

    p = rotateZ(p, [0, 0, 0], s.roll);

    //Normal ikut diputar menggunakan Arbitrary Axis
    p = rotateArbitraryAxis(
      p,
      [0, 0, 0],
      [0.25, 0.3, 1],
      s.spin
    );

    p = rotateY(p, [0, 0, 0], s.yaw);

    return normalize3(p);
  }

  //Squash and stretch
  p = [
    p[0] * s.sx,
    p[1] * s.sy,
    p[2] * s.sz
  ];

  p = rotateZ(p, [0, bodyPivotY, 0], s.roll);

  //Putar karakter menggunakan Rotate Arbitrary Axis
  p = rotateArbitraryAxis(
    p,
    [0, bodyPivotY, 0],
    [0.25, 0.3, 1],
    s.spin
  );

  //Putar arah hadap
  p = rotateY(p, [0, 0, 0], s.yaw);

  //Perpindahan horizontal dan vertikal
  p[0] += s.x;
  p[1] += s.jump + groundOffset;

  return p;
}

function updateObject(obj, state) {
  const pos = obj.originalPositions, nor = obj.originalNormals;

  for (let i=0;i<pos.length;i+=3) {
    obj.animatedPositions.set(transformVertex([pos[i],pos[i+1],pos[i+2]],obj,state),i);
    obj.animatedNormals.set(transformVertex([nor[i],nor[i+1],nor[i+2]],obj,state,true),i);
  }

  gl.bindBuffer(gl.ARRAY_BUFFER,obj.positionBuffer);
  gl.bufferSubData(gl.ARRAY_BUFFER,0,obj.animatedPositions);
  gl.bindBuffer(gl.ARRAY_BUFFER,obj.normalBuffer);
  gl.bufferSubData(gl.ARRAY_BUFFER,0,obj.animatedNormals);
}


// =============================================================================
// Class pembungkus: dipanggil dari main.js sama seperti Wheezy
// =============================================================================
export class Hamm {
  /**
   * position = letak Hamm di kamar (Hamm digeser ke samping supaya tidak menabrak Wheezy)
   */
  constructor(glContext, position = [-1.2, 0.0, 2.8]) {
    gl = glContext;
    buildHamm();
    this.position = position;
    this.modelMatrix = Mat4.create();
    Mat4.translate(this.modelMatrix, this.modelMatrix, position);
  }

  /** Animasi asli Hamm (jalan, putar, lompat, squash-stretch, ekor). time dalam detik. */
  update(time) {
    const state = animationState(time);
    this.state = state;   // disimpan supaya kamera fokus bisa mengikuti Hamm
    for (const obj of objects) updateObject(obj, state);
  }

  /**
   * Titik tengah badan Hamm di dunia (dipakai kamera fokus, tombol 2).
   * x = posisi Hamm + geseran jalan (state.x), y = poros badan (1.20) + groundOffset (-0.20) + lompatan.
   */
  getFocusPoint() {
    const s = this.state || { x: 0, jump: 0 };
    return [this.position[0] + s.x, this.position[1] + bodyPivotY + groundOffset + s.jump, this.position[2]];
  }

  /** Menggambar Hamm dengan shader milik main.js. Hamm tidak punya objek transparan. */
  draw(glContext, programInfo, normalMat3, renderTransparent = false) {
    if (renderTransparent) return;
    const locs = programInfo.locations;

    Mat4.normalMatrix(normalMat3, this.modelMatrix);
    gl.uniformMatrix4fv(locs.u_ModelMatrix, false, this.modelMatrix);
    gl.uniformMatrix3fv(locs.u_NormalMatrix, false, normalMat3);
    gl.uniform1f(locs.u_Shininess, 30.0);
    gl.uniform1f(locs.u_Opacity, 1.0);
    gl.uniform1i(locs.u_Unlit, 0);
    gl.uniform1i(locs.u_Sway, 0);

    for (const obj of objects) {
      gl.bindBuffer(gl.ARRAY_BUFFER, obj.positionBuffer);
      gl.enableVertexAttribArray(locs.a_Position);
      gl.vertexAttribPointer(locs.a_Position, 3, gl.FLOAT, false, 0, 0);
      gl.bindBuffer(gl.ARRAY_BUFFER, obj.normalBuffer);
      gl.enableVertexAttribArray(locs.a_Normal);
      gl.vertexAttribPointer(locs.a_Normal, 3, gl.FLOAT, false, 0, 0);
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, obj.indexBuffer);
      gl.uniform4fv(locs.u_BaseColor, obj.color);
      gl.drawElements(gl.TRIANGLES, obj.indexCount, gl.UNSIGNED_SHORT, 0);
    }
  }
}
