import * as THREE from 'three';

// ─── 1. Scene, Camera, Renderer ───────────────────────────────────────
const scene = new THREE.Scene();

const camera = new THREE.PerspectiveCamera(
    60,                                     // FOV
    window.innerWidth / window.innerHeight, // Aspect
    0.1,
    1000
);
camera.position.set(0, 0, 10);

const canvas = document.getElementById('c');
if (!canvas) {
    throw new Error('Canvas element #c not found in DOM.');
}

const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: true,
});
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

// ─── 2. Star Geometry ──────────────────────────────────────────────────
function createStarField(starCount, radius) {
    const positions = new Float32Array(starCount * 3);
    const colors    = new Float32Array(starCount * 3);

    const palette = [
        new THREE.Color('#ffffff'),
        new THREE.Color('#ffe9c4'),
        new THREE.Color('#ffd6a5'),
        new THREE.Color('#c4e0ff'),
        new THREE.Color('#d4a5ff'),
    ];

    for (let i = 0; i < starCount; i++) {
        // Spherical coordinates for uniform distribution
        const theta = Math.random() * Math.PI * 2;
        const phi   = Math.acos(2 * Math.random() - 1);
        const r     = radius;

        positions[i * 3]     = r * Math.sin(phi) * Math.cos(theta);
        positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
        positions[i * 3 + 2] = r * Math.cos(phi);

        const col = palette[Math.floor(Math.random() * palette.length)];
        colors[i * 3]     = col.r;
        colors[i * 3 + 1] = col.g;
        colors[i * 3 + 2] = col.b;
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('color',    new THREE.BufferAttribute(colors, 3));

    const mat = new THREE.PointsMaterial({
        size: 0.04,
        vertexColors: true,
        sizeAttenuation: true,
    });

    return new THREE.Points(geo, mat);
}

const stars = createStarField(6000, 18);
scene.add(stars);

// ─── 3. Animation Loop ─────────────────────────────────────────────────
const clock = new THREE.Clock();

function animate() {
    requestAnimationFrame(animate);

    const elapsed = clock.getElapsedTime();

    // Subtle rotation around Y axis
    stars.rotation.y = elapsed * 0.02;
    stars.rotation.x = elapsed * 0.005;

    renderer.render(scene, camera);
}

animate();

// ─── 4. Responsive Canvas ───────────────────────────────────────────────
window.addEventListener('resize', () => {
    const w = window.innerWidth;
    const h = window.innerHeight;

    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
});

console.log('✨ Star field ready');
