// ==========================================================
// File: main.js
// Version: 3.0 (Final NASCAR Track, High Speed, No Pillars)
// ==========================================================

let scene, camera, renderer, clock;
let player, trackWall;

// --- 2. Physics & Control Constants ---
const MASS = 10;
const ACCELERATION = 40;  // m/s^2 (High acceleration)
const MAX_SPEED = 35;     // High Max Speed for racing
const DRAG = 0.98;        
const ANGULAR_DRAG = 0.95; 
const TURN_RATE = 0.05;   

// Track constants
const TRACK_RADIUS = 60; // Inner radius of the track area
const TRACK_WIDTH = 10;  // Width of the track lane
const WALL_HEIGHT = 2;   // Height of the track walls

// Player State
let velocity = new THREE.Vector3(0, 0, 0);
let angularVelocity = 0; 

// Input State 
const keys = {
    forward: false,
    backward: false,
    left: false,
    right: false
};

// --- Initialization Function ---
function init() {
    // Scene
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000000); // Black background

    // Camera
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);

    // Renderer
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);

    // Clock
    clock = new THREE.Clock();

    // --- Create Player (Car) ---
    const geometry = new THREE.BoxGeometry(2, 1, 4); 
    const material = new THREE.MeshPhongMaterial({ color: 0xc0392b }); 
    player = new THREE.Mesh(geometry, material);
    
    // Start the player inside the track area
    player.position.set(TRACK_RADIUS + TRACK_WIDTH / 2, 0.5, 0); 
    scene.add(player);

    // --- TRACK GEOMETRY (The Big Circle) ---

    // 1. Grid Helper (The track surface)
    // Used as the ground/track texture within the circle.
    const gridHelper = new THREE.GridHelper(
        TRACK_RADIUS * 2 + 30, // Large size to cover track area
        100, 
        0xCCCCCC, // Center line
        0xCCCCCC  // Grid line color
    );
    gridHelper.position.y = 0.0; 
    scene.add(gridHelper);

    // 2. Inner Wall (Red)
    const innerWallGeometry = new THREE.RingGeometry(TRACK_RADIUS, TRACK_RADIUS + 0.5, 64);
    const innerWallMaterial = new THREE.MeshPhongMaterial({ color: 0xFF0000, side: THREE.DoubleSide }); // Red
    const innerWall = new THREE.Mesh(innerWallGeometry, innerWallMaterial);
    innerWall.rotation.x = Math.PI / 2; 
    innerWall.position.y = WALL_HEIGHT / 2;
    scene.add(innerWall);

    // 3. Outer Wall (White)
    const outerRadius = TRACK_RADIUS + TRACK_WIDTH;
    const outerWallGeometry = new THREE.RingGeometry(outerRadius, outerRadius + 0.5, 64);
    const outerWallMaterial = new THREE.MeshPhongMaterial({ color: 0xFFFFFF, side: THREE.DoubleSide }); // White
    const outerWall = new THREE.Mesh(outerWallGeometry, outerWallMaterial);
    outerWall.rotation.x = Math.PI / 2;
    outerWall.position.y = WALL_HEIGHT / 2;
    scene.add(outerWall);

    // *** REMOVED: The section that created random pillars is gone ***

    // --- Lighting ---
    const ambientLight = new THREE.AmbientLight(0x404040); 
    scene.add(ambientLight);
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(5, 10, 7);
    scene.add(directionalLight);

    // Event Listeners
    window.addEventListener('resize', onWindowResize);
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('keyup', onKeyUp);

    // Start the game loop
    animate();
}

// --- 3. Physics & Game Loop ---

function updatePhysics(deltaTime) {
    // --- 1. Rotation (Steering) ---
    if (keys.left) {
        angularVelocity += TURN_RATE * deltaTime;
    }
    if (keys.right) {
        angularVelocity -= TURN_RATE * deltaTime;
    }

    angularVelocity *= ANGULAR_DRAG;
    player.rotation.y += angularVelocity;

    // --- 2. Acceleration (Force) ---
    let force = new THREE.Vector3(0, 0, 0);
    const forwardVector = new THREE.Vector3(0, 0, -1);
    forwardVector.applyAxisAngle(new THREE.Vector3(0, 1, 0), player.rotation.y);

    if (keys.forward) {
        force.add(forwardVector.clone().multiplyScalar(ACCELERATION));
    }
    if (keys.backward) {
        force.add(forwardVector.clone().multiplyScalar(-ACCELERATION * 0.5)); 
    }

    // --- 3. Update Velocity ---
    let accelerationVector = force.divideScalar(MASS);
    velocity.add(accelerationVector.multiplyScalar(deltaTime));
    velocity.multiplyScalar(DRAG); 

    if (velocity.length() > MAX_SPEED) {
        velocity.setLength(MAX_SPEED);
    }

    // --- 4. Update Position ---
    player.position.add(velocity.clone().multiplyScalar(deltaTime));
    
    // --- 5. Track Boundary Check (Collision Logic) ---
    const position2D = new THREE.Vector2(player.position.x, player.position.z);
    const distanceToCenter = position2D.length();
    
    // Inner Wall Collision
    if (distanceToCenter < TRACK_RADIUS) {
        // Stop velocity and push player back out to the boundary
        velocity.multiplyScalar(0.01);
        player.position.x = position2D.normalize().x * (TRACK_RADIUS + 0.1);
        player.position.z = position2D.normalize().y * (TRACK_RADIUS + 0.1);
    }
    
    // Outer Wall Collision
    const maxRadius = TRACK_RADIUS + TRACK_WIDTH;
    if (distanceToCenter > maxRadius) {
        // Stop velocity and pull player back in
        velocity.multiplyScalar(0.01); 
        player.position.x = position2D.normalize().x * (maxRadius - 0.1);
        player.position.z = position2D.normalize().y * (maxRadius - 0.1);
    }
    
    // --- 6. Camera Follow ---
    const cameraOffset = new THREE.Vector3(0, 5, 10); 
    cameraOffset.applyAxisAngle(new THREE.Vector3(0, 1, 0), player.rotation.y); 
    
    camera.position.copy(player.position).add(cameraOffset);
    camera.lookAt(player.position); 
}

function animate() {
    requestAnimationFrame(animate);

    const deltaTime = clock.getDelta(); 
    
    updatePhysics(deltaTime);

    renderer.render(scene, camera);
}

// --- 4. Event Handlers ---

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function onKeyDown(event) {
    switch (event.key) {
        case 'w':
        case 'W':
        case 'ArrowUp': keys.forward = true; break;
        case 's':
        case 'S':
        case 'ArrowDown': keys.backward = true; break;
        case 'a':
        case 'A':
        case 'ArrowLeft': keys.left = true; break;
        case 'd':
        case 'D':
        case 'ArrowRight': keys.right = true; break;
    }
}

function onKeyUp(event) {
    switch (event.key) {
        case 'w':
        case 'W':
        case 'ArrowUp': keys.forward = false; break;
        case 's':
        case 'S':
        case 'ArrowDown': keys.backward = false; break;
        case 'a':
        case 'A':
        case 'ArrowLeft': keys.left = false; break;
        case 'd':
        case 'D':
        case 'ArrowRight': keys.right = false; break;
    }
}

// Start the application
init();
