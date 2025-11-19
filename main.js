// --- 1. Scene Setup ---
let scene, camera, renderer, clock;
let player, ground;

// --- 2. Physics & Control Constants ---
const MASS = 10;
const ACCELERATION = 20;  // m/s^2
const MAX_SPEED = 15;     // m/s
const DRAG = 0.985;        // Velocity damping factor (air resistance)
const ANGULAR_DRAG = 0.95; // Rotational damping
const TURN_RATE = 0.05;   // Base turn speed

// Player State
let velocity = new THREE.Vector3(0, 0, 0);
let angularVelocity = 0; // Rotation speed around Y-axis

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
    scene.background = new THREE.Color(0x87ceeb); // Light blue sky

    // Camera
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    // Position camera slightly behind and above the player
    camera.position.set(0, 5, 10);
    camera.lookAt(0, 0, 0);

    // Renderer
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);

    // Clock for delta time calculation
    clock = new THREE.Clock();

    // --- Create Player (Car) ---
    const geometry = new THREE.BoxGeometry(2, 1, 4); // Box is 2 wide, 1 high, 4 long
    const material = new THREE.MeshPhongMaterial({ color: 0xc0392b }); // Red
    player = new THREE.Mesh(geometry, material);
    player.position.y = 0.5; // Half the height to sit on the ground
    scene.add(player);

    // --- Create Ground Plane ---
    const groundGeometry = new THREE.PlaneGeometry(100, 100);
    const groundMaterial = new THREE.MeshPhongMaterial({ color: 0x27ae60, side: THREE.DoubleSide }); // Green
    ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = Math.PI / 2; // Rotate to lie flat on the XZ plane
    scene.add(ground);

    // --- VISUAL CUES (Making Movement Visible) ---

    // 1. Grid Helper (For Scale and Direction)
    const size = 100; 
    const divisions = 100; 
    const gridHelper = new THREE.GridHelper(size, divisions, 0x0000ff, 0x808080);
    gridHelper.position.y = 0.01; 
    scene.add(gridHelper);

    // 2. Random Obstacles (For Parallax and Speed Reference)
    const obstacleGeometry = new THREE.CylinderGeometry(0.5, 0.5, 3, 32); // Simple pillar
    const obstacleMaterial = new THREE.MeshPhongMaterial({ color: 0x8b4513 }); // Brown

    for (let i = 0; i < 20; i++) {
        const obstacle = new THREE.Mesh(obstacleGeometry, obstacleMaterial);
        
        obstacle.position.x = (Math.random() - 0.5) * 90;
        obstacle.position.z = (Math.random() - 0.5) * 90;
        obstacle.position.y = 1.5; 
        
        scene.add(obstacle);
    }
    // --- END VISUAL CUES ---

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

    // Apply angular drag (damping)
    angularVelocity *= ANGULAR_DRAG;
    
    // Update player rotation (Y-axis)
    player.rotation.y += angularVelocity;

    // --- 2. Acceleration (Force) ---
    let force = new THREE.Vector3(0, 0, 0);

    // Calculate forward vector based on player's current rotation
    const forwardVector = new THREE.Vector3(0, 0, -1);
    forwardVector.applyAxisAngle(new THREE.Vector3(0, 1, 0), player.rotation.y);

    if (keys.forward) {
        force.add(forwardVector.clone().multiplyScalar(ACCELERATION));
    }
    if (keys.backward) {
        force.add(forwardVector.clone().multiplyScalar(-ACCELERATION * 0.5)); // Reverse is slower
    }

    // --- 3. Update Velocity (F = ma, so a = F/m) ---
    let accelerationVector = force.divideScalar(MASS);
    velocity.add(accelerationVector.multiplyScalar(deltaTime));

    // Apply linear drag (Damping)
    velocity.multiplyScalar(DRAG);

    // Clamp speed (realistic maximum speed)
    if (velocity.length() > MAX_SPEED) {
        velocity.setLength(MAX_SPEED);
    }

    // --- 4. Update Position ---
    player.position.add(velocity.clone().multiplyScalar(deltaTime));
    
    // --- 5. Camera Follow (Behind the player) ---
    const cameraOffset = new THREE.Vector3(0, 5, 10); // Offset: 5m up, 10m back
    cameraOffset.applyAxisAngle(new THREE.Vector3(0, 1, 0), player.rotation.y); // Rotate offset with player
    
    camera.position.copy(player.position).add(cameraOffset);
    camera.lookAt(player.position); // Always look at the player

    // Simple boundary check (for a fixed 100x100 ground)
    const boundary = 48;
    if (Math.abs(player.position.x) > boundary || Math.abs(player.position.z) > boundary) {
        // Simple 'crash' effect: slow movement drastically
        velocity.multiplyScalar(0.01); 
    }
}

function animate() {
    requestAnimationFrame(animate);

    const deltaTime = clock.getDelta(); // Time elapsed since last frame
    
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
