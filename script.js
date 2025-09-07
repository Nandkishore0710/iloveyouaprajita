// Login functionality
const loginForm = document.getElementById('login-form');
const loginOverlay = document.getElementById('login-overlay');
const errorMessage = document.getElementById('error-message');

// Early restore: keep user logged in across refresh using localStorage as source of truth
try {
    if (localStorage.getItem('isLoggedIn') === 'true') {
        document.body.classList.add('logged-in');
        if (loginOverlay) loginOverlay.style.display = 'none';
        document.querySelectorAll('*').forEach(el => el.style.display = '');
        // Ensure sessionStorage is also set for current tab features
        if (!sessionStorage.getItem('isLoggedIn')) {
            sessionStorage.setItem('isLoggedIn', 'true');
            sessionStorage.setItem('currentUser', localStorage.getItem('currentUser') || 'guest');
        }
    }
} catch (_) {}

// Valid users (in a real app, this would be handled server-side with proper authentication)
const validUsers = {
    'rishi': 'password123',
    'aprajita': 'aprajita456'
};

// Handle login form submission
loginForm?.addEventListener('submit', (e) => {
    e.preventDefault();
    
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    
    if (validUsers[username] && validUsers[username] === password) {
        // Successful login
        document.body.classList.add('logged-in');
        loginOverlay.style.display = 'none';
        document.querySelectorAll('*').forEach(el => el.style.display = '');
        
        // Store login state in sessionStorage + localStorage (persist across refresh/pages)
        sessionStorage.setItem('isLoggedIn', 'true');
        sessionStorage.setItem('currentUser', username);
        localStorage.setItem('isLoggedIn', 'true');
        localStorage.setItem('currentUser', username);
        
        // Initialize fixed dates
        setTogetherText();
        startBirthdayCountdown();
        // Restore any active Truth/Dare and update visibility for this user
        restoreTDFromStorage();
        // Init floating companion across pages
        initFloatingCompanion();
    } else {
        // Show error message
        errorMessage.style.display = 'block';
        setTimeout(() => {
            errorMessage.style.display = 'none';
        }, 3000);
    }
});

// Utility: dynamically load Three.js if not present
function ensureThree() {
    return new Promise((resolve, reject) => {
        if (typeof THREE !== 'undefined') return resolve();
        const s = document.createElement('script');
        s.src = 'https://unpkg.com/three@0.156.1/build/three.min.js';
        s.async = true;
        s.onload = () => resolve();
        s.onerror = () => reject(new Error('Failed to load Three.js'));
        document.head.appendChild(s);
    });
}

// Floating 3D companion that appears on every page
async function initFloatingCompanion() {
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduceMotion) return;
    // Create container if missing
    let container = document.getElementById('companion-3d');
    if (!container) {
        container = document.createElement('div');
        container.id = 'companion-3d';
        Object.assign(container.style, {
            position: 'fixed', right: '18px', bottom: '18px', width: '220px', height: '220px',
            zIndex: '50', pointerEvents: 'auto'
        });
        document.body.appendChild(container);
    }
    if (container._started) return; // prevent duplicate init
    container._started = true;

    try { await ensureThree(); } catch { return; }
    if (typeof THREE === 'undefined') return;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(50, container.clientWidth / container.clientHeight, 0.1, 50);
    camera.position.set(0, 0.4, 3.4);
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(container.clientWidth, container.clientHeight);
    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    const ambient = new THREE.AmbientLight(0xffffff, 0.8);
    const dir = new THREE.DirectionalLight(0xc9a0dc, 0.8);
    dir.position.set(2, 3, 2);
    scene.add(ambient, dir);

    // Mini avatar (reuse similar parts)
    const avatar = new THREE.Group();
    scene.add(avatar);
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.42, 0.8, 20), new THREE.MeshStandardMaterial({ color: 0x89cff0 }));
    body.position.y = -0.1;
    avatar.add(body);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.3, 20, 20), new THREE.MeshStandardMaterial({ color: 0xfffff0 }));
    head.position.y = 0.55; avatar.add(head);
    const eyeMat = new THREE.MeshStandardMaterial({ color: 0x222222 });
    const eye = new THREE.SphereGeometry(0.04, 10, 10);
    const le = new THREE.Mesh(eye, eyeMat), re = new THREE.Mesh(eye, eyeMat);
    le.position.set(-0.11, 0.02, 0.24); re.position.set(0.11, 0.02, 0.24); head.add(le, re);
    const armMat = new THREE.MeshStandardMaterial({ color: 0xc9a0dc });
    const L = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 0.4, 14), armMat);
    const R = L.clone();
    L.position.set(-0.42, 0.15, 0); L.rotation.z = -0.6; avatar.add(L);
    R.position.set(0.42, 0.15, 0); R.rotation.z = 0.6; avatar.add(R);

    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2(0,0);
    function lookAtPointer(e) {
        const rect = container.getBoundingClientRect();
        const x = (e.clientX - rect.left) / rect.width; const y = (e.clientY - rect.top) / rect.height;
        pointer.x = x * 2 - 1; pointer.y = -(y * 2 - 1);
        raycaster.setFromCamera(pointer, camera);
        const p = raycaster.ray.origin.clone().add(raycaster.ray.direction.clone().multiplyScalar(3));
        head.lookAt(p);
    }
    container.addEventListener('pointermove', lookAtPointer);
    container.addEventListener('click', () => { R.rotation.z = 1.2; setTimeout(()=>{ R.rotation.z = 0.6; }, 300); });

    let t = 0, blinkT = 1.5;
    function animate() {
        requestAnimationFrame(animate);
        t += 0.016;
        avatar.position.y = Math.sin(t*1.5)*0.03;
        blinkT -= 0.016; if (blinkT <= 0) { le.scale.y = re.scale.y = 0.1; setTimeout(()=>{ le.scale.y = re.scale.y = 1; }, 110); blinkT = 2 + Math.random()*2.5; }
        renderer.render(scene, camera);
    }
    animate();

    function resize() {
        const w = container.clientWidth, h = container.clientHeight;
        camera.aspect = w / h; camera.updateProjectionMatrix(); renderer.setSize(w, h);
    }
    window.addEventListener('resize', resize);
}

    // Add floating hearts (vintage romantic vibe)
    function createHeartGeometry(size = 0.4) {
        const shape = new THREE.Shape();
        const x = 0, y = 0;
        shape.moveTo(x, y);
        shape.bezierCurveTo(x, y, x - size/2, y - size/2, x - size, y);
        shape.bezierCurveTo(x - size*1.4, y + size*0.6, x - size*0.1, y + size*1.2, x, y + size*1.6);
        shape.bezierCurveTo(x + size*0.1, y + size*1.2, x + size*1.4, y + size*0.6, x + size, y);
        shape.bezierCurveTo(x + size/2, y - size/2, x, y, x, y);
        const geom = new THREE.ShapeGeometry(shape, 24);
        // make it face camera by default (billboard-like)
        geom.rotateX(Math.PI);
        return geom;
    }

    const heartGeom = createHeartGeometry(0.45);
    const heartCount = isMobile ? 4 : 8;
    for (let i = 0; i < heartCount; i++) {
        const mat = new THREE.MeshStandardMaterial({ color: 0xf8c8dc, metalness: 0.05, roughness: 0.7, emissive: 0xEEA7C6, emissiveIntensity: 0.05 });
        const heart = new THREE.Mesh(heartGeom, mat);
        heart.position.set((Math.random()-0.5)*5.5, (Math.random()-0.5)*2.8, (Math.random()-0.5)*3.5);
        const s = 0.8 + Math.random()*0.6;
        heart.scale.setScalar(s);
        heart.userData = { rotSpeed: 0.0015 + Math.random()*0.003, floatAmp: 0.05 + Math.random()*0.1, floatPhase: Math.random()*Math.PI*2 };
        objects.push(heart);
        group.add(heart);
    }

// Cozy 3D: Lightweight Three.js scene for Home hero
async function initHero3DScene() {
    const container = document.getElementById('hero-3d-container');
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const isMobile = window.matchMedia('(max-width: 640px)').matches;
    if (!container || reduceMotion) return;
    // Show a tiny loading badge while we ensure Three.js
    let badge = document.getElementById('hero3d-loading');
    if (!badge) {
        badge = document.createElement('div');
        badge.id = 'hero3d-loading';
        Object.assign(badge.style, { position: 'absolute', top: '12px', right: '12px', padding: '6px 10px', borderRadius: '10px', fontSize: '12px', color: 'var(--heading)', background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.2)', backdropFilter: 'blur(6px)', zIndex: 4, opacity: 0.85 });
        badge.textContent = 'Loading 3D…';
        document.querySelector('.hero')?.appendChild(badge);
    }
    try { await ensureThree(); } catch (e) { badge && (badge.textContent = '3D unavailable'); return; }
    if (typeof THREE === 'undefined') { badge && (badge.textContent = '3D unavailable'); return; }
    badge && badge.remove();

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(55, container.clientWidth / container.clientHeight, 0.1, 100);
    camera.position.set(0, 0.2, 6);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    // Lighting with cozy vintage tone
    const ambient = new THREE.AmbientLight(0xffffff, 0.6);
    const warm = new THREE.DirectionalLight(0xffe6d5, 0.7);
    warm.position.set(2, 3, 2);
    const cool = new THREE.DirectionalLight(0xd5e9ff, 0.5);
    cool.position.set(-2, -1, -2);
    scene.add(ambient, warm, cool);

    // Palette matching Ivory, Blue, Wisteria, Blush
    const palette = [0xfffff0, 0x89cff0, 0xc9a0dc, 0xf8c8dc];

    // Group of floating objects
    const group = new THREE.Group();
    scene.add(group);

    const objects = [];
    const geoChoices = [
        new THREE.TorusGeometry(0.5, 0.18, 24, 64),
        new THREE.IcosahedronGeometry(0.45, 0),
        new THREE.OctahedronGeometry(0.42, 0)
    ];

    // Create floating geometric pieces (fewer on small screens)
    const geoCount = isMobile ? 7 : 12;
    for (let i = 0; i < geoCount; i++) {
        const geom = geoChoices[i % geoChoices.length].clone();
        const color = palette[i % palette.length];
        const mat = new THREE.MeshStandardMaterial({
            color,
            metalness: 0.2,
            roughness: 0.35,
            transparent: true,
            opacity: 0.9
        });
        const mesh = new THREE.Mesh(geom, mat);
        mesh.position.set(
            (Math.random() - 0.5) * 6,
            (Math.random() - 0.5) * 3,
            (Math.random() - 0.5) * 4
        );
        mesh.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, 0);
        const s = 0.7 + Math.random() * 0.6;
        mesh.scale.setScalar(isMobile ? s * 0.8 : s);
        mesh.userData = {
            rotSpeed: 0.003 + Math.random() * 0.004,
            floatAmp: 0.08 + Math.random() * 0.12,
            floatPhase: Math.random() * Math.PI * 2
        };
        objects.push(mesh);
        group.add(mesh);
    }

    // Subtle particles
    const pGeom = new THREE.BufferGeometry();
    const pCount = isMobile ? 60 : 120;
    const positions = new Float32Array(pCount * 3);
    for (let i = 0; i < pCount; i++) {
        positions[i * 3] = (Math.random() - 0.5) * 8;
        positions[i * 3 + 1] = (Math.random() - 0.5) * 4;
        positions[i * 3 + 2] = (Math.random() - 0.5) * 6;
    }
    pGeom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const pMat = new THREE.PointsMaterial({ color: 0xffffff, size: 0.02, opacity: 0.4, transparent: true });
    const points = new THREE.Points(pGeom, pMat);
    scene.add(points);

    // Cute Avatar (low-poly) -------------------------------------------------
    const avatar = new THREE.Group();
    avatar.position.set(0, -0.4, 0);
    scene.add(avatar);

    // Body
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0x89cff0, roughness: 0.6, metalness: 0.1 });
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.5, 1.0, 24), bodyMat);
    body.position.y = 0.0;
    avatar.add(body);

    // Head
    const headMat = new THREE.MeshStandardMaterial({ color: 0xfffff0, roughness: 0.5, metalness: 0.05 });
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.38, 24, 24), headMat);
    head.position.y = 0.8;
    avatar.add(head);

    // Eyes
    const eyeMat = new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 1.0, metalness: 0.0 });
    const eyeGeo = new THREE.SphereGeometry(0.05, 12, 12);
    const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
    const rightEye = new THREE.Mesh(eyeGeo, eyeMat);
    leftEye.position.set(-0.14, 0.04, 0.32);
    rightEye.position.set(0.14, 0.04, 0.32);
    head.add(leftEye, rightEye);

    // Arms
    const armMat = new THREE.MeshStandardMaterial({ color: 0xc9a0dc, roughness: 0.6 });
    function makeArm(side = 1) {
        const arm = new THREE.Group();
        const upper = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 0.5, 16), armMat);
        upper.position.y = -0.25;
        upper.rotation.z = side * 0.15;
        arm.add(upper);
        arm.position.set(side * 0.5, 0.35, 0);
        arm.rotation.z = side * 0.8;
        return { group: arm, upper };
    }
    const L = makeArm(-1);
    const R = makeArm(1);
    avatar.add(L.group, R.group);

    // Blink animation
    let blinkT = 0;
    function blink(dt) {
        blinkT -= dt;
        if (blinkT <= 0) {
            // close
            leftEye.scale.y = rightEye.scale.y = 0.1;
            setTimeout(() => { leftEye.scale.y = rightEye.scale.y = 1; }, 120);
            blinkT = 2 + Math.random() * 3; // next blink in 2-5s
        }
    }

    // Pointer look-at for head
    const tmpVec = new THREE.Vector3();
    function updateHeadLook() {
        // project pointer ray into scene and get a point in front
        raycaster.setFromCamera(pointer, camera);
        tmpVec.copy(raycaster.ray.origin).add(raycaster.ray.direction.clone().multiplyScalar(5));
        head.lookAt(tmpVec);
    }

    // Wave on click and show message bubble
    const messages = [
        'Hi cutie! 💖', 'You look amazing today ✨', 'Forever us 💞', 'Sending hugs 🤗', 'You + Me = ❤️'
    ];
    let waving = 0;
    function waveOnce() {
        waving = 0.6; // seconds
        showBubble(messages[Math.floor(Math.random() * messages.length)]);
    }

    // Simple DOM bubble
    let bubbleEl = null; 
    function ensureBubble() {
        if (bubbleEl) return bubbleEl;
        bubbleEl = document.createElement('div');
        bubbleEl.className = 'avatar-bubble';
        bubbleEl.style.position = 'absolute';
        bubbleEl.style.top = '18%';
        bubbleEl.style.right = '12%';
        bubbleEl.style.padding = '10px 14px';
        bubbleEl.style.borderRadius = '12px';
        bubbleEl.style.background = 'rgba(255,255,255,0.12)';
        bubbleEl.style.border = '1px solid rgba(255,255,255,0.2)';
        bubbleEl.style.backdropFilter = 'blur(6px)';
        bubbleEl.style.color = 'var(--heading)';
        bubbleEl.style.boxShadow = '0 10px 24px rgba(0,0,0,0.25)';
        bubbleEl.style.zIndex = '4';
        bubbleEl.style.opacity = '0';
        bubbleEl.style.transition = 'opacity .25s ease, transform .25s ease';
        const hero = document.querySelector('.hero');
        hero && hero.appendChild(bubbleEl);
        return bubbleEl;
    }
    function showBubble(text) {
        const el = ensureBubble();
        el.textContent = text;
        el.style.transform = 'translateY(-6px)';
        el.style.opacity = '1';
        clearTimeout(el._hideTimer);
        el._hideTimer = setTimeout(() => {
            el.style.opacity = '0';
            el.style.transform = 'translateY(0)';
        }, 1600);
    }

    container.addEventListener('click', waveOnce);

    // Interactivity: pointer rotation, hover, click bursts, drag spin
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    let hovered = null;
    let targetRotX = 0, targetRotY = 0; // eased group rotation toward pointer
    let drag = { active: false, lastX: 0, lastY: 0, vx: 0, vy: 0 };

    function onPointerMove(e) {
        const rect = container.getBoundingClientRect();
        const x = (e.clientX - rect.left) / rect.width;
        const y = (e.clientY - rect.top) / rect.height;
        pointer.x = x * 2 - 1;
        pointer.y = -(y * 2 - 1);
        // Aim group rotation toward pointer
        targetRotY = (x - 0.5) * 0.5; // yaw
        targetRotX = (y - 0.5) * -0.3; // pitch
        // Hover highlight
        raycaster.setFromCamera(pointer, camera);
        const intersects = raycaster.intersectObjects(objects, false);
        const hit = intersects[0]?.object || null;
        if (hovered && hovered !== hit) {
            hovered.scale.multiplyScalar(1 / 1.12);
            hovered.material.emissive && (hovered.material.emissiveIntensity = 0);
            hovered = null;
        }
        if (hit && hovered !== hit) {
            hovered = hit;
            hovered.scale.multiplyScalar(1.12);
            if (hovered.material.emissive !== undefined) {
                hovered.material.emissive = new THREE.Color(0xffffff);
                hovered.material.emissiveIntensity = 0.15;
            }
        }
        if (drag.active) {
            const dx = e.clientX - drag.lastX;
            const dy = e.clientY - drag.lastY;
            drag.vx = dx * 0.002;
            drag.vy = dy * 0.002;
            group.rotation.y += drag.vx;
            group.rotation.x += -drag.vy;
            drag.lastX = e.clientX;
            drag.lastY = e.clientY;
        }
    }

    function onPointerDown(e) {
        drag.active = true;
        drag.lastX = e.clientX;
        drag.lastY = e.clientY;
    }
    function onPointerUp() {
        drag.active = false;
    }

    function spawnBurst() {
        // Spawn small particle burst at hovered or center
        const burstGeom = new THREE.BufferGeometry();
        const N = 60;
        const pos = new Float32Array(N * 3);
        for (let i = 0; i < N; i++) {
            const r = Math.random() * 0.6 + 0.2;
            const th = Math.random() * Math.PI * 2;
            const ph = Math.random() * Math.PI;
            pos[i * 3 + 0] = r * Math.cos(th) * Math.sin(ph);
            pos[i * 3 + 1] = r * Math.sin(th) * Math.sin(ph);
            pos[i * 3 + 2] = r * Math.cos(ph);
        }
        burstGeom.setAttribute('position', new THREE.BufferAttribute(pos, 3));
        const c = [0xfffff0, 0x89cff0, 0xc9a0dc, 0xf8c8dc][Math.floor(Math.random() * 4)];
        const burstMat = new THREE.PointsMaterial({ color: c, size: 0.04, transparent: true, opacity: 0.9 });
        const sys = new THREE.Points(burstGeom, burstMat);
        sys.position.copy(hovered ? hovered.position.clone() : new THREE.Vector3(0, 0, 0));
        group.add(sys);
        // Fade out and remove
        let life = 1.0;
        const tick = () => {
            life -= 0.03;
            sys.material.opacity = Math.max(life, 0);
            sys.scale.setScalar(1 + (1 - life) * 0.8);
            if (life > 0) requestAnimationFrame(tick); else group.remove(sys);
        };
        requestAnimationFrame(tick);
    }

    container.addEventListener('pointermove', onPointerMove);
    container.addEventListener('pointerdown', onPointerDown);
    container.addEventListener('pointerup', onPointerUp);
    container.addEventListener('click', spawnBurst);

    let rafId;
    const clock = new THREE.Clock();
    let scrollY = 0;
    const onScroll = () => {
        // map scroll within viewport to a small z and y offset for parallax
        const maxShift = 0.6;
        const maxZ = 0.8;
        const vh = Math.max(document.documentElement.clientHeight, window.innerHeight || 0);
        const y = window.scrollY;
        const ratio = Math.max(0, Math.min(1, y / vh));
        group.position.y = -ratio * maxShift;
        camera.position.z = 6 + ratio * maxZ;
    };
    window.addEventListener('scroll', onScroll, { passive: true });

    function animate() {
        rafId = requestAnimationFrame(animate);
        const t = clock.getElapsedTime();
        objects.forEach((m) => {
            m.rotation.y += m.userData.rotSpeed;
            m.rotation.x += m.userData.rotSpeed * 0.6;
            m.position.y += Math.sin(t * 1.2 + m.userData.floatPhase) * m.userData.floatAmp * 0.02;
        });
        // Avatar idle + wave
        const dt = clock.getDelta();
        blink(dt);
        updateHeadLook();
        if (waving > 0) {
            R.group.rotation.z = 0.8 + Math.sin(t * 10) * 0.4;
            waving -= dt;
        } else {
            R.group.rotation.z += (0.8 - R.group.rotation.z) * 0.1;
        }
        // Subtle pointer attraction to hovered point
        if (hovered) {
            const towards = hovered.position.clone().multiplyScalar(0.02);
            group.position.lerp(towards, 0.02);
        } else {
            group.position.lerp(new THREE.Vector3(0, group.position.y, 0), 0.03);
        }
        // Ease group rotation toward pointer target
        group.rotation.y += (targetRotY - group.rotation.y) * 0.04;
        group.rotation.x += (targetRotX - group.rotation.x) * 0.04;
        // Apply inertia when dragging has ended
        if (!drag.active) {
            group.rotation.y *= 0.995;
            group.rotation.x *= 0.995;
        }
        renderer.render(scene, camera);
    }
    animate();

    function onResize() {
        const w = container.clientWidth;
        const h = container.clientHeight;
        if (w === 0 || h === 0) return;
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h);
    }
    window.addEventListener('resize', onResize);

    // Cleanup if navigating SPA-style (safety)
    const cleanup = () => {
        cancelAnimationFrame(rafId);
        renderer.dispose();
        scene.clear();
        container.removeEventListener('pointermove', onPointerMove);
        container.removeEventListener('pointerdown', onPointerDown);
        container.removeEventListener('pointerup', onPointerUp);
        container.removeEventListener('click', spawnBurst);
        window.removeEventListener('resize', onResize);
        window.removeEventListener('scroll', onScroll);
    };
    window.addEventListener('beforeunload', cleanup);
}

// Cozy 3D: Tilt cards gently on pointer move
function initTiltEffects() {
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const isMobile = window.matchMedia('(max-width: 768px)').matches;
    if (reduceMotion || isMobile) return;

    const tiltElements = document.querySelectorAll('.tilt');
    tiltElements.forEach((el) => {
        const maxTilt = 6; // degrees
        const tilt = (e) => {
            const rect = el.getBoundingClientRect();
            const px = (e.clientX - rect.left) / rect.width; // 0..1
            const py = (e.clientY - rect.top) / rect.height; // 0..1
            const rx = (py - 0.5) * -2 * maxTilt; // invert for natural feel
            const ry = (px - 0.5) * 2 * maxTilt;
            el.style.transform = `perspective(800px) rotateX(${rx.toFixed(2)}deg) rotateY(${ry.toFixed(2)}deg) translateZ(0)`;
        };
        const reset = () => {
            el.style.transform = 'perspective(800px) rotateX(0deg) rotateY(0deg) translateZ(0)';
        };
        el.addEventListener('mousemove', tilt);
        el.addEventListener('mouseleave', reset);
        el.addEventListener('mouseenter', (e) => tilt(e));
    });
}

// Cozy 3D: Subtle parallax for hero
function initHeroParallax() {
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const isMobile = window.matchMedia('(max-width: 768px)').matches;
    if (reduceMotion || isMobile) return;
    const hero = document.querySelector('.hero');
    const content = document.querySelector('.hero-content');
    if (!hero || !content) return;
    const onMove = (e) => {
        const rect = hero.getBoundingClientRect();
        const px = (e.clientX - rect.left) / rect.width; // 0..1
        const py = (e.clientY - rect.top) / rect.height; // 0..1
        const tx = (px - 0.5) * 16; // translate range
        const ty = (py - 0.5) * 12;
        content.style.transform = `translate3d(${tx.toFixed(1)}px, ${ty.toFixed(1)}px, 0)`;
    };
    const reset = () => {
        content.style.transform = 'translate3d(0,0,0)';
    };
    hero.addEventListener('mousemove', onMove);
    hero.addEventListener('mouseleave', reset);
}

function restoreTDFromStorage() {
    try {
        const saved = JSON.parse(localStorage.getItem('tdCurrent') || 'null');
        if (saved && saved.text) {
            currentTDItem = saved;
            if (questionEl) questionEl.textContent = saved.text;
            if (actionStatusEl) {
                const user = sessionStorage.getItem('currentUser') || 'guest';
                const isCreator = user === saved.createdBy;
                actionStatusEl.textContent = isCreator ? 'You started this. Waiting for partner...' : 'Please mark Done or Not Done.';
                actionStatusEl.classList.remove('success', 'fail');
            }
            updateTDActionVisibility();
        } else {
            // No active item; keep buttons disabled/hidden
            if (actionButtonsEl) actionButtonsEl.style.display = 'none';
        }
    } catch (e) {
        if (actionButtonsEl) actionButtonsEl.style.display = 'none';
    }
}

// Sync across tabs/windows: listen for changes to localStorage (tdCurrent only)
window.addEventListener('storage', (e) => {
    if (e.key === 'tdCurrent') {
        restoreTDFromStorage();
    }
});

// Check if user is already logged in (per tab / restore from localStorage)
window.addEventListener('DOMContentLoaded', () => {
    // Dev auto-login when opened from file:// to avoid local script ordering/CORS issues
    if (location.protocol === 'file:' && !sessionStorage.getItem('isLoggedIn')) {
        console.log('[DEV] Auto-login (file://) enabled');
        sessionStorage.setItem('isLoggedIn', 'true');
        sessionStorage.setItem('currentUser', 'rishi');
        localStorage.setItem('isLoggedIn', 'true');
        localStorage.setItem('currentUser', 'rishi');
    }
    if (sessionStorage.getItem('isLoggedIn') === 'true' || localStorage.getItem('isLoggedIn') === 'true') {
        document.body.classList.add('logged-in');
        loginOverlay.style.display = 'none';
        document.querySelectorAll('*').forEach(el => el.style.display = '');
        setTogetherText();
        startBirthdayCountdown();
        // Restore any active Truth/Dare and update visibility for this user
        restoreTDFromStorage();
        // Init floating companion across pages
        initFloatingCompanion();
    }
});

// Set the fixed "Together Since" text
function setTogetherText() {
    const td = document.getElementById('together-date');
    if (td) td.textContent = 'August 6, 2025';
}

// Fixed Birthday Countdown to April 30
function startBirthdayCountdown() {
    function update() {
        const now = new Date();
        const currentYear = now.getFullYear();
        // Months are 0-indexed: 3 = April
        let nextBirthday = new Date(currentYear, 3, 30, 0, 0, 0);
        if (now > nextBirthday) {
            nextBirthday = new Date(currentYear + 1, 3, 30, 0, 0, 0);
        }
        const totalSeconds = Math.floor((nextBirthday - now) / 1000);
        const days = Math.floor(totalSeconds / 86400);
        const hours = Math.floor((totalSeconds % 86400) / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;

        if (daysEl) daysEl.textContent = formatTime(days);
        if (hoursEl) hoursEl.textContent = formatTime(hours);
        if (minutesEl) minutesEl.textContent = formatTime(minutes);
        if (secondsEl) secondsEl.textContent = formatTime(seconds);
    }
    update();
    setInterval(update, 1000);
}

// Logout functionality
const logoutBtn = document.getElementById('logout-btn');

logoutBtn?.addEventListener('click', () => {
    // Clear login state
    sessionStorage.removeItem('isLoggedIn');
    sessionStorage.removeItem('currentUser');
    localStorage.removeItem('isLoggedIn');
    localStorage.removeItem('currentUser');
    
    // Redirect to login page
    window.location.reload();
});

// DOM Elements
const menuToggle = document.querySelector('.menu-toggle');
const navLinks = document.querySelector('.nav-links');
const navbar = document.getElementById('navbar');
const togetherDate = document.getElementById('together-date');

// Mobile menu toggle
menuToggle?.addEventListener('click', () => navLinks?.classList.toggle('active'));

// Close mobile menu when clicking on a link
document.querySelectorAll('.nav-links a').forEach(link => {
    link.addEventListener('click', () => navLinks?.classList.remove('active'));});

// Sticky navbar on scroll
let lastScroll = 0;
window.addEventListener('scroll', () => {
    const currentScroll = window.pageYOffset;
    if (currentScroll <= 0) return navbar?.classList.remove('scroll-up');
    
    if (currentScroll > lastScroll && !navbar?.classList.contains('scroll-down')) {
        navbar?.classList.remove('scroll-up');
        navbar?.classList.add('scroll-down');
    } else if (currentScroll < lastScroll && navbar?.classList.contains('scroll-down')) {
        navbar?.classList.remove('scroll-down');
        navbar?.classList.add('scroll-up');
    }
    lastScroll = currentScroll;
});

// Set current year in footer
document.getElementById('current-year').textContent = new Date().getFullYear();

// 1. Birthday Countdown (fixed to April 30)
const daysEl = document.getElementById('days');
const hoursEl = document.getElementById('hours');
const minutesEl = document.getElementById('minutes');
const secondsEl = document.getElementById('seconds');

function formatTime(time) {
    return time < 10 ? `0${time}` : time;
}

// 2. Truth & Dare Game
const truthBtn = document.getElementById('truth-btn');
const dareBtn = document.getElementById('dare-btn');
const questionEl = document.getElementById('question');
const categorySelect = document.getElementById('td-category');
const markDoneBtn = document.getElementById('mark-done');
const markNotDoneBtn = document.getElementById('mark-not-done');
const actionStatusEl = document.getElementById('action-status');
const actionButtonsEl = document.querySelector('.action-buttons');

// TD state and history
let currentTDItem = null; // { type, category, text, createdBy, timestamp }
let tdHistory = JSON.parse(localStorage.getItem('tdHistory') || '[]');

const truthQuestions = {
    caring: [
        "How can I make your day easier when you're stressed?",
        "What is one small act of care that means a lot to you?",
        "When do you feel most supported by me?"
    ],
    sweet: [
        "What's the sweetest thing I've ever done for you?",
        "What cute habit of mine do you secretly love?",
        "Describe our relationship in three sweet words."
    ],
    naughty: [
        "What's your favorite way to be teased?",
        "What outfit of mine do you find irresistible?",
        "Tell me a playful fantasy you've had about us."
    ],
    flirty: [
        "What was the moment you knew you were into me?",
        "What's your favorite compliment to receive from me?",
        "Which of my features do you find most attractive?"
    ],
    funny: [
        "What was our funniest moment together?",
        "What's a silly nickname you secretly want?",
        "What's the funniest thing you've done to impress me?"
    ],
    deep: [
        "What does love mean to you right now?",
        "What fear have you overcome because of our relationship?",
        "What do you hope we look back on proudly in 10 years?"
    ]
};

const dareChallenges = {
    caring: [
        "Bring me water and give me a cozy 30-second cuddle.",
        "Write a quick love affirmation and stick it somewhere visible.",
        "Give a gentle head massage for one minute."
    ],
    sweet: [
        "Say three things you adore about me.",
        "Send me a surprise sweet text later today.",
        "Give me your warmest hug for 20 seconds."
    ],
    naughty: [
        "Whisper something naughty in my ear.",
        "Give me a flirty wink and a kiss.",
        "Text me a playful message for later."
    ],
    flirty: [
        "Give me your best pick-up line.",
        "Hold eye contact for 15 seconds and smile.",
        "Dance with me for 30 seconds, no music allowed!"
    ],
    funny: [
        "Do a dramatic reading of a random text on your phone.",
        "Impersonate me (lovingly) for 20 seconds.",
        "Tell a joke and make me laugh."
    ],
    deep: [
        "Share one dream you want us to pursue together.",
        "Write a one-line promise for our future.",
        "Tell me something meaningful you’ve never said out loud."
    ]
};

function getPoolFromCategory(map, category) {
    if (!category || category === 'all') {
        return Object.values(map).flat();
    }
    return map[category] || [];
}

const showRandom = (pool, element) => {
    if (!element || pool.length === 0) return;
    const randomIndex = Math.floor(Math.random() * pool.length);
    element.textContent = pool[randomIndex];
    element.style.animation = 'fadeIn 0.5s';
    setTimeout(() => element.style.animation = '', 500);
};

truthBtn?.addEventListener('click', () => {
    const category = categorySelect?.value || 'all';
    const pool = getPoolFromCategory(truthQuestions, category);
    const text = pickRandom(pool);
    renderTDItem('truth', category, text);
});

dareBtn?.addEventListener('click', () => {
    const category = categorySelect?.value || 'all';
    const pool = getPoolFromCategory(dareChallenges, category);
    const text = pickRandom(pool);
    renderTDItem('dare', category, text);
});

function pickRandom(pool) {
    if (!pool || pool.length === 0) return '';
    const randomIndex = Math.floor(Math.random() * pool.length);
    return pool[randomIndex];
}

function renderTDItem(type, category, text) {
    if (!questionEl || !text) return;
    currentTDItem = {
        type,
        category,
        text,
        createdBy: sessionStorage.getItem('currentUser') || 'guest',
        timestamp: new Date().toISOString()
    };
    questionEl.textContent = text;
    questionEl.style.animation = 'fadeIn 0.5s';
    setTimeout(() => questionEl.style.animation = '', 500);
    // Persist current item and update visibility based on role
    localStorage.setItem('tdCurrent', JSON.stringify(currentTDItem));
    if (actionStatusEl) {
        actionStatusEl.textContent = 'Waiting for partner to mark Done/Not Done...';
        actionStatusEl.classList.remove('success', 'fail');
    }
    updateTDActionVisibility();
}

function finalizeTD(status) {
    if (!currentTDItem) return;
    const marker = sessionStorage.getItem('currentUser') || 'guest';
    // Only allow partner (not creator) to mark
    if (marker === currentTDItem.createdBy) {
        return; // creator cannot mark their own prompt
    }
    const record = { ...currentTDItem, status, markedBy: marker, markedAt: new Date().toISOString() };
    tdHistory.unshift(record);
    localStorage.setItem('tdHistory', JSON.stringify(tdHistory));
    if (actionStatusEl) {
        actionStatusEl.textContent = status === 'done' ? `Marked Done by ${marker}` : `Marked Not Done by ${marker}`;
        actionStatusEl.classList.toggle('success', status === 'done');
        actionStatusEl.classList.toggle('fail', status === 'not_done');
    }
    // Disable until next item
    markDoneBtn && (markDoneBtn.disabled = true);
    markNotDoneBtn && (markNotDoneBtn.disabled = true);
    currentTDItem = null;
    localStorage.removeItem('tdCurrent');
    // Hide buttons after completion
    if (actionButtonsEl) actionButtonsEl.style.display = 'none';
}

markDoneBtn?.addEventListener('click', () => finalizeTD('done'));
markNotDoneBtn?.addEventListener('click', () => finalizeTD('not_done'));

// 3. Love Notes
const noteText = document.getElementById('note-text');
const addNoteBtn = document.getElementById('add-note');
const notesList = document.getElementById('notes-list');
let notes = JSON.parse(localStorage.getItem('loveNotes')) || [];

function displayNotes() {
    if (!notesList) return;
    notesList.innerHTML = notes.map((note, index) => `
        <div class="note">
            <p>${note.text}</p>
            <p class="note-date">${new Date(note.date).toLocaleDateString()}</p>
            <button class="delete-note" data-index="${index}">×</button>
        </div>`).join('');
    
    document.querySelectorAll('.delete-note').forEach(btn => {
        btn.addEventListener('click', (e) => {
            notes.splice(e.target.dataset.index, 1);
            localStorage.setItem('loveNotes', JSON.stringify(notes));
            displayNotes();
        });
    });
}

addNoteBtn?.addEventListener('click', () => {
    const text = noteText?.value.trim();
    if (!text) return;
    notes.unshift({ text, date: new Date().toISOString() });
    localStorage.setItem('loveNotes', JSON.stringify(notes));
    noteText.value = '';
    displayNotes();
});

// 4. Gallery
const photoUpload = document.getElementById('photo-upload');
const galleryGrid = document.getElementById('gallery-grid');
let photos = JSON.parse(localStorage.getItem('galleryPhotos')) || [];

function displayPhotos() {
    if (!galleryGrid) return;
    galleryGrid.innerHTML = photos.map((photo, index) => `
        <div class="gallery-item">
            <img src="${photo.data}" alt="Memory ${index + 1}">
            <button class="delete-photo" data-index="${index}">×</button>
        </div>`).join('');
    
    document.querySelectorAll('.delete-photo').forEach(btn => {
        btn.addEventListener('click', (e) => {
            if (confirm('Delete this photo?')) {
                photos.splice(e.target.dataset.index, 1);
                localStorage.setItem('galleryPhotos', JSON.stringify(photos));
                displayPhotos();
            }
        });
    });
}

photoUpload?.addEventListener('change', (e) => {
    Array.from(e.target.files).forEach(file => {
        if (!file.type.startsWith('image/')) return;
        const reader = new FileReader();
        reader.onload = (event) => {
            photos.unshift({
                name: file.name,
                type: file.type,
                data: event.target.result,
                date: new Date().toISOString()
            });
            localStorage.setItem('galleryPhotos', JSON.stringify(photos));
            displayPhotos();
        };
        reader.readAsDataURL(file);
    });
});

// 5. Bucket List
const bucketItemInput = document.getElementById('bucket-item');
const addBucketItemBtn = document.getElementById('add-bucket-item');
const bucketList = document.getElementById('bucket-list-items');
let bucketItems = JSON.parse(localStorage.getItem('bucketList')) || [];

function displayBucketList() {
    if (!bucketList) return;
    bucketList.innerHTML = bucketItems.map((item, index) => `
        <li class="bucket-item ${item.completed ? 'completed' : ''}">
            <input type="checkbox" ${item.completed ? 'checked' : ''} data-index="${index}">
            <span>${item.text}</span>
            <button class="delete-bucket" data-index="${index}">×</button>
        </li>`).join('');
    
    document.querySelectorAll('.bucket-item input[type="checkbox"]').forEach(checkbox => {
        checkbox.addEventListener('change', (e) => {
            bucketItems[e.target.dataset.index].completed = e.target.checked;
            localStorage.setItem('bucketList', JSON.stringify(bucketItems));
            displayBucketList();
        });
    });
    
    document.querySelectorAll('.delete-bucket').forEach(btn => {
        btn.addEventListener('click', (e) => {
            if (confirm('Remove this item?')) {
                bucketItems.splice(e.target.dataset.index, 1);
                localStorage.setItem('bucketList', JSON.stringify(bucketItems));
                displayBucketList();
            }
        });
    });
}

addBucketItemBtn?.addEventListener('click', () => {
    const text = bucketItemInput?.value.trim();
    if (!text) return;
    bucketItems.push({ text, completed: false, date: new Date().toISOString() });
    localStorage.setItem('bucketList', JSON.stringify(bucketItems));
    bucketItemInput.value = '';
    displayBucketList();
});

// 6. Anniversary Counter
const togetherDaysEl = document.getElementById('together-days');
const togetherMonthsEl = document.getElementById('together-months');
const togetherYearsEl = document.getElementById('together-years');
// Fixed relationship start date (use Date components to avoid timezone parsing issues)
const START_DATE = new Date(2025, 7, 6); // August is month index 7
updateAnniversaryCounter();
setInterval(updateAnniversaryCounter, 3600000); // Update every hour

function updateAnniversaryCounter() {
    const start = START_DATE;
    const now = new Date();
    const diffTime = now - start;
    const diffDays = Math.floor(diffTime / 86400000);
    
    let years = now.getFullYear() - start.getFullYear();
    let months = now.getMonth() - start.getMonth();
    
    if (months < 0 || (months === 0 && now.getDate() < start.getDate())) {
        years--;
        months += 12;
    }
    
    if (now.getDate() < start.getDate()) months--;
    
    if(togetherDaysEl) togetherDaysEl.textContent = diffDays;
    if(togetherMonthsEl) togetherMonthsEl.textContent = months;
    if(togetherYearsEl) togetherYearsEl.textContent = years;
    if(togetherDate) togetherDate.textContent = start.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
}

// 7. Song Dedication
const songTitle = document.getElementById('song-title');
const songArtist = document.getElementById('song-artist');
const songLink = document.getElementById('song-link');
const addSongBtn = document.getElementById('add-song');
const songsList = document.getElementById('songs-list');
let songs = JSON.parse(localStorage.getItem('dedicatedSongs')) || [];

function displaySongs() {
    if (!songsList) return;
    songsList.innerHTML = songs.map((song, index) => {
        let embedHtml = '';
        if (song.link.includes('youtube.com') || song.link.includes('youtu.be')) {
            const videoId = song.link.includes('youtube.com') 
                ? song.link.split('v=')[1] 
                : song.link.split('youtu.be/')[1];
            embedHtml = `<iframe class="song-iframe" src="https://www.youtube.com/embed/${videoId}" frameborder="0" allowfullscreen></iframe>`;
        } else if (song.link.includes('spotify')) {
            embedHtml = `<iframe class="song-iframe" src="${song.link.replace('spotify.com', 'spotify.com/embed')}" frameborder="0" allowtransparency="true" allow="encrypted-media"></iframe>`;
        } else {
            embedHtml = '<div class="song-iframe">Preview not available</div>';
        }
        
        return `
            <div class="song-card">
                ${embedHtml}
                <div class="song-info">
                    <h3>${song.title}</h3>
                    <p>${song.artist}</p>
                    <div class="song-actions">
                        <span class="song-date">${new Date(song.date).toLocaleDateString()}</span>
                        <button class="delete-song" data-index="${index}">×</button>
                    </div>
                </div>
            </div>`;
    }).join('');
    
    document.querySelectorAll('.delete-song').forEach(btn => {
        btn.addEventListener('click', (e) => {
            if (confirm('Remove this song?')) {
                songs.splice(e.target.dataset.index, 1);
                localStorage.setItem('dedicatedSongs', JSON.stringify(songs));
                displaySongs();
            }
        });
    });
}

addSongBtn?.addEventListener('click', () => {
    const title = songTitle?.value.trim();
    const artist = songArtist?.value.trim();
    const link = songLink?.value.trim();
    
    if (!title || !artist || !link) return alert('Please fill in all fields');
    
    songs.unshift({ title, artist, link, date: new Date().toISOString() });
    localStorage.setItem('dedicatedSongs', JSON.stringify(songs));
    
    songTitle.value = songArtist.value = songLink.value = '';
    displaySongs();
});

// 8. Mood Tracker
const moodOptions = document.querySelectorAll('.mood-option');
const moodCalendarGrid = document.getElementById('mood-calendar-grid');
let moodHistory = JSON.parse(localStorage.getItem('moodHistory')) || {};

function initMoodCalendar() {
    if (!moodCalendarGrid) return;
    
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const firstDay = new Date(currentYear, currentMonth, 1).getDay();
    
    let calendarHTML = '';
    
    // Add empty cells for days before the first day of the month
    for (let i = 0; i < firstDay; i++) {
        calendarHTML += '<div class="calendar-day empty"></div>';
    }
    
    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
        const dateKey = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const mood = moodHistory[dateKey];
        const isToday = now.getDate() === day && now.getMonth() === currentMonth;
        
        calendarHTML += `
            <div class="calendar-day ${mood ? 'mood-' + mood : ''} ${isToday ? 'today' : ''}" 
                 data-date="${dateKey}">
                ${day}
                ${mood ? `<span class="mood-emoji">${getMoodEmoji(mood)}</span>` : ''}
            </div>`;
    }
    
    moodCalendarGrid.innerHTML = calendarHTML;
}

function getMoodEmoji(mood) {
    const emojis = {
        happy: '😊',
        loved: '🥰',
        romantic: '💝',
        playful: '😄',
        grateful: '🙏'
    };
    return emojis[mood] || '';
}

moodOptions.forEach(option => {
    option.addEventListener('click', () => {
        const mood = option.dataset.mood;
        const today = new Date().toISOString().split('T')[0];
        moodHistory[today] = mood;
        localStorage.setItem('moodHistory', JSON.stringify(moodHistory));
        initMoodCalendar();
    });
});

// 9. Secret Message Decoder
const messageToEncode = document.getElementById('message-to-encode');
const encodeBtn = document.getElementById('encode-btn');
const encodedMessage = document.getElementById('encoded-message');
const copyEncodedBtn = document.getElementById('copy-encoded');
const messageToDecode = document.getElementById('message-to-decode');
const decodeBtn = document.getElementById('decode-btn');
const decodedMessage = document.getElementById('decoded-message');

function encodeMessage(text) {
    return btoa(encodeURIComponent(text).replace(/%([0-9A-F]{2})/g, 
        (match, p1) => String.fromCharCode('0x' + p1)));
}

function decodeMessage(encoded) {
    try {
        return decodeURIComponent(atob(encoded).split('').map(c => 
            '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)
        ).join(''));
    } catch (e) {
        return 'Invalid encoded message';
    }
}

encodeBtn?.addEventListener('click', () => {
    if (!encodedMessage) return;
    encodedMessage.textContent = encodeMessage(messageToEncode.value);
});

decodeBtn?.addEventListener('click', () => {
    if (!decodedMessage) return;
    decodedMessage.textContent = decodeMessage(messageToDecode.value);
});

copyEncodedBtn?.addEventListener('click', () => {
    if (!encodedMessage) return;
    navigator.clipboard.writeText(encodedMessage.textContent);
    copyEncodedBtn.textContent = 'Copied!';
    setTimeout(() => copyEncodedBtn.textContent = 'Copy', 2000);
});

// Initialize all components
document.addEventListener('DOMContentLoaded', () => {
    displayNotes();
    displayPhotos();
    displayBucketList();
    displaySongs();
    initMoodCalendar();
    updateAnniversaryCounter();
    // Restore active Truth/Dare item if present
    restoreTDFromStorage();
    // Fallback: poll localStorage periodically to handle cases where storage events don't fire
    setInterval(() => {
        restoreTDFromStorage();
    }, 1500);
    // Initialize cozy 3D effects
    initTiltEffects();
    initHeroParallax();
    initHero3DScene();
    // Also create floating companion for all pages if logged in
    if (sessionStorage.getItem('isLoggedIn') === 'true') {
        initFloatingCompanion();
    }
});

function updateTDActionVisibility() {
    if (!actionButtonsEl) return;
    const user = sessionStorage.getItem('currentUser') || 'guest';
    if (!currentTDItem) {
        actionButtonsEl.style.display = 'none';
        markDoneBtn && (markDoneBtn.disabled = true);
        markNotDoneBtn && (markNotDoneBtn.disabled = true);
        return;
    }
    const isCreator = user === currentTDItem.createdBy;
    if (isCreator) {
        // Creator should NOT see action buttons
        actionButtonsEl.style.display = 'none';
        markDoneBtn && (markDoneBtn.disabled = true);
        markNotDoneBtn && (markNotDoneBtn.disabled = true);
        if (actionStatusEl) actionStatusEl.textContent = 'You started this. Waiting for partner...';
    } else {
        // Partner can see and use action buttons
        actionButtonsEl.style.display = 'flex';
        markDoneBtn && (markDoneBtn.disabled = false);
        markNotDoneBtn && (markNotDoneBtn.disabled = false);
        if (actionStatusEl) actionStatusEl.textContent = 'Please mark Done or Not Done.';
    }
}
