/**
 * webgl-utils.js - WebGL Shader Management, Buffers, and Pipeline
 */

export const WebGLUtils = {
    createShader(gl, type, source) {
        const shader = gl.createShader(type);
        gl.shaderSource(shader, source);
        gl.compileShader(shader);
        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
            const info = gl.getShaderInfoLog(shader);
            gl.deleteShader(shader);
            throw new Error(`Shader compile error: ${info}`);
        }
        return shader;
    },

    createProgram(gl, vsSource, fsSource) {
        const vs = WebGLUtils.createShader(gl, gl.VERTEX_SHADER, vsSource);
        const fs = WebGLUtils.createShader(gl, gl.FRAGMENT_SHADER, fsSource);
        const program = gl.createProgram();
        gl.attachShader(program, vs);
        gl.attachShader(program, fs);
        gl.linkProgram(program);

        if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
            const info = gl.getProgramInfoLog(program);
            gl.deleteProgram(program);
            throw new Error(`Program link error: ${info}`);
        }
        return program;
    },

    /**
     * Mengirim posisi, normal, dan index segitiga ke GPU (buffer WebGL).
     * Jika index berupa Uint32Array (mesh besar), aktifkan ekstensi OES_element_index_uint.
     */
    createMeshBuffers(gl, mesh) {
        const posBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, posBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, mesh.positions, gl.STATIC_DRAW);

        const normBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, normBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, mesh.normals, gl.STATIC_DRAW);

        const isBig = mesh.indices instanceof Uint32Array;
        if (isBig) gl.getExtension('OES_element_index_uint');

        const indexBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, mesh.indices, gl.STATIC_DRAW);

        return {
            position: posBuffer,
            normal: normBuffer,
            indices: indexBuffer,
            numIndices: mesh.indices.length,
            indexType: isBig ? gl.UNSIGNED_INT : gl.UNSIGNED_SHORT,
            meshRef: mesh
        };
    }
};

/**
 * Main WebGL Shader Sources
 * Blinn-Phong + Rim light + Distance fog
 * + Caustic opsional (pola cahaya bawah laut, dimatikan untuk kamar mainan)
 * + Objek bergoyang (sway) opsional di vertex shader
 */
export const Shaders = {
    vertex: `
        attribute vec3 a_Position;
        attribute vec3 a_Normal;

        uniform mat4 u_ModelMatrix;
        uniform mat4 u_ViewMatrix;
        uniform mat4 u_ProjectionMatrix;
        uniform mat3 u_NormalMatrix;
        uniform float u_Time;
        uniform bool u_Sway;

        varying vec3 v_FragPos;
        varying vec3 v_Normal;

        void main() {
            vec3 p = a_Position;

            // Objek bergoyang (opsional) (makin tinggi makin besar goyangannya)
            if (u_Sway) {
                float h = max(p.y, 0.0);
                p.x += sin(u_Time * 1.3 + a_Position.x * 0.6 + a_Position.z * 0.4) * 0.06 * h * h;
                p.z += cos(u_Time * 1.0 + a_Position.z * 0.5) * 0.04 * h * h;
            }

            vec4 worldPos = u_ModelMatrix * vec4(p, 1.0);
            v_FragPos = worldPos.xyz;
            v_Normal = u_NormalMatrix * a_Normal;
            gl_Position = u_ProjectionMatrix * u_ViewMatrix * worldPos;
        }
    `,

    fragment: `
        precision highp float;

        varying vec3 v_FragPos;
        varying vec3 v_Normal;

        uniform vec3 u_CameraPos;
        uniform vec3 u_LightDir;       // Arah MENUJU cahaya matahari
        uniform vec4 u_BaseColor;
        uniform float u_Shininess;
        uniform float u_Opacity;
        uniform bool u_Unlit;          // true = warna polos tanpa pencahayaan (bayangan, berkas cahaya)
        uniform vec3 u_FogColor;
        uniform float u_FogNear;
        uniform float u_FogFar;
        uniform float u_Time;
        uniform bool u_Caustics;       // true = pola cahaya air (bawah laut)

        void main() {
            vec3 albedo = u_BaseColor.rgb;
            vec3 result;

            if (u_Unlit) {
                result = albedo;
            } else {
                vec3 norm = normalize(v_Normal);
                vec3 viewDir = normalize(u_CameraPos - v_FragPos);
                if (dot(norm, viewDir) < 0.0) norm = -norm;   // dua sisi

                // Diffuse
                vec3 lightDir = normalize(u_LightDir);
                float diff = max(dot(norm, lightDir), 0.0);

                // Specular (Blinn-Phong)
                vec3 halfwayDir = normalize(lightDir + viewDir);
                float spec = pow(max(dot(norm, halfwayDir), 0.0), u_Shininess);

                // Rim light di tepi siluet
                float rim = pow(1.0 - max(dot(norm, viewDir), 0.0), 3.0);

                // Seberapa menghadap ke atas (permukaan atas lebih terang)
                float up = max(norm.y, 0.0);

                result = albedo * (0.25 + 0.15 * up + 0.7 * diff)
                       + vec3(0.9, 1.0, 1.0) * spec * 0.35
                       + vec3(0.5, 0.8, 1.0) * rim * 0.25;

                // Pola caustic: cahaya bergelombang dari permukaan laut
                float c = sin(v_FragPos.x * 2.3 + u_Time * 0.9)
                        + sin(v_FragPos.z * 2.1 - u_Time * 0.7)
                        + sin((v_FragPos.x - v_FragPos.z) * 1.7 + u_Time * 1.2);
                c = pow(max(0.0, c / 3.0), 2.0);
                if (u_Caustics) result += vec3(0.55, 0.9, 1.0) * c * 0.32 * up;
            }

            // Distance fog (kabut air): objek jauh memudar ke warna air
            float distance = length(u_CameraPos - v_FragPos);
            result = mix(result, u_FogColor, smoothstep(u_FogNear, u_FogFar, distance));

            gl_FragColor = vec4(result, u_BaseColor.a * u_Opacity);
        }
    `
};
