// Game setup
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const startMenu = document.getElementById('start-menu');
const startButton = document.getElementById('start-button');
const settingsButton = document.getElementById('settings-button');
const settingsScreen = document.getElementById('settings-screen');
const backButton = document.getElementById('back-button');
const musicVolumeSlider = document.getElementById('music-volume');
const sfxVolumeSlider = document.getElementById('sfx-volume');
const pauseMenu = document.getElementById('pause-menu');
const resumeButton = document.getElementById('resume-button');
const mainMenuButton = document.getElementById('main-menu-button');
const ingamePauseButton = document.getElementById('ingame-pause-button');
// Touch control elements (will be added in HTML)
const touchLeftButton = document.getElementById('touch-left');
const touchRightButton = document.getElementById('touch-right');
const touchJumpButton = document.getElementById('touch-jump');
const touchDashButton = document.getElementById('touch-dash'); // Get dash button
const touchControlsLeftContainer = document.getElementById('touch-controls-left'); // New left container
const touchControlsRightContainer = document.getElementById('touch-controls-right'); // New right container

// --- Native Resolution ---
const nativeWidth = 800;
const nativeHeight = 600;
canvas.width = nativeWidth;
canvas.height = nativeHeight;

let gameRunning = false;
let paused = false;
let animationFrameId = null;

let wantsToJump = false; // Flag to track jump intent
let wantsToDash = false; // Flag to track dash intent

// --- Audio Setup ---
let musicVolume = 0.5;
let sfxVolume = 0.5;

let backgroundMusic = new Audio('music/background_music.mp3');
backgroundMusic.loop = true;
backgroundMusic.volume = musicVolume;

// Sound Effects - Apply initial volume
const jumpSounds = [new Audio('music/jump1.wav'), new Audio('music/jump2.wav')];
const scoreSounds = [new Audio('music/score1.wav'), new Audio('music/score2.wav')];
jumpSounds.forEach(sound => sound.volume = sfxVolume);
scoreSounds.forEach(sound => sound.volume = sfxVolume);

// Function to update SFX volume
function setSfxVolume(volume) {
    sfxVolume = volume;
    jumpSounds.forEach(sound => sound.volume = sfxVolume);
    scoreSounds.forEach(sound => sound.volume = sfxVolume);
}

// Function to update Music volume
function setMusicVolume(volume) {
    musicVolume = volume;
    backgroundMusic.volume = musicVolume;
}

// Initialize sliders
musicVolumeSlider.value = musicVolume;
sfxVolumeSlider.value = sfxVolume;

// Game dimensions (adjust as needed)
const levelWidth = 3200; // Define the total width of the game world
// canvas.width = 800; // Now set to nativeWidth above
// canvas.height = 600; // Now set to nativeHeight above

// Camera setup
const camera = {
    x: 0,
    y: 0 // Keep y=0 for horizontal scrolling only for now
};

// Player setup
const player = {
    x: 50,
    y: canvas.height - 138, // Adjusted for raised ground and new height (600 - 60 - 78)
    width: 78, // Increased size by 30%
    height: 78, // Increased size by 30%
    speed: 4,
    velocityX: 0,
    velocityY: 0,
    gravity: 0.5,
    jumpStrength: 12,
    isJumping: false,
    isOnGround: true,
    // Dash properties
    canDash: true,
    isDashing: false,
    dashSpeed: 15,     // Speed of the dash
    dashDuration: 10, // How many frames the dash lasts
    dashTimer: 0,      // Countdown timer for dash
    sprites: {},
    currentFrame: 0, // Index for walk/jump animation
    walkFrames: ['walk1', 'walk2', 'walk3', 'walk2'], // Loop walk cycle
    walkFrameCount: 0,
    walkFrameDelay: 10, // Controls walk animation speed
    facingRight: true,
    // Idle animation properties
    isIdle: true, // Start as idle
    idleFrames: ['sit1', 'sit2'], // Idle animation frames
    currentIdleFrame: 0, // Index for idle animation
    idleFrameCount: 0,
    idleFrameDelay: 30 // Controls idle animation speed (slower)
};

// Collectible Sprites
let collectibleSprites = {};
let backgroundLayers = []; // Add array for parallax background layers
let cloudSprites = []; // Array to hold loaded cloud sprites
let clouds = []; // Array to hold active cloud objects
let poofSprites = []; // Array to hold poof animation frames
let activePoofs = []; // Array for active poof effect instances
const poofSequence = [1, 0, 1, 2]; // Desired frame order (0-based indices for poofSprites)
const poofFrameDelay = 6; // SLOWER: How many game frames each poof frame lasts (was 4)

// Platform setup (example platforms)
const platforms = [
    { x: 0, y: canvas.height - 60, width: levelWidth, height: 40 }, // Ground spans the level width (Raised 20px more, hidden)
    { x: 200, y: canvas.height - 150 - 20, width: 150, height: 20 }, // Lowered by 30px (orig -150, raised 50 -> -200, lowered 30 -> -170)
    { x: 450, y: canvas.height - 250 - 20, width: 100, height: 20 }, // Lowered by 30px
    // Add more platforms, potentially beyond the initial canvas.width
    { x: 1800, y: canvas.height - 100 - 20, width: 200, height: 20 }, // Lowered by 30px
    { x: 2200, y: canvas.height - 200 - 20, width: 150, height: 20 }, // Lowered by 30px
];

// Water setup
const water = {
    x: 0,
    y: canvas.height - 20,
    width: levelWidth, // Water spans the level width
    height: 20
};

// Collectibles setup (example)
const collectibles = [
    { x: 250, y: canvas.height - 242, type: 'shell', spriteIndex: 1, collected: false, width: 72, height: 72 }, // Moved onto platform 1, resized
    { x: 500, y: canvas.height - 342, type: 'fish', spriteIndex: 1, collected: false, width: 72, height: 72 }, // Moved onto platform 2, resized
    // Add more collectibles using different sprites
    { x: 100, y: canvas.height - 132, type: 'shell', spriteIndex: 2, collected: false, width: 72, height: 72 }, // Kept (on ground), resized
    { x: 350, y: canvas.height - 132, type: 'shell', spriteIndex: 3, collected: false, width: 72, height: 72 }, // Kept (on ground), resized
    { x: 550, y: canvas.height - 242, type: 'fish', spriteIndex: 2, collected: false, width: 72, height: 72 }, // Moved X and onto platform 1, resized
    { x: 700, y: canvas.height - 132, type: 'fish', spriteIndex: 3, collected: false, width: 72, height: 72 }, // Kept (on ground), resized

];

let score = 0;

// Input handling
const keys = {
    ArrowLeft: false,
    ArrowRight: false,
    KeyA: false,
    KeyD: false,
    Space: false,
    Escape: false,
    ShiftLeft: false // Add Shift key
};

window.addEventListener('keydown', (e) => {
    if (keys.hasOwnProperty(e.code)) {
        keys[e.code] = true;
        if (e.code === 'Escape' && gameRunning) {
            togglePause();
        }
        if (e.code === 'Space' && !e.repeat) {
            wantsToJump = true;
        }
        // Set dash intent only on initial press for Shift
        if (e.code === 'ShiftLeft' && !e.repeat) {
            wantsToDash = true;
        }
    }
});

window.addEventListener('keyup', (e) => {
    if (keys.hasOwnProperty(e.code)) {
        keys[e.code] = false;
    }
});

// --- Touch Input Handling ---
function setupTouchControls() {
    if (touchLeftButton) {
        touchLeftButton.addEventListener('touchstart', (e) => {
            e.preventDefault(); // Prevent default touch behavior (like scrolling)
            keys.ArrowLeft = true;
            keys.KeyA = true; // Also trigger KeyA if needed
        }, { passive: false }); // Use passive: false to allow preventDefault

        touchLeftButton.addEventListener('touchend', (e) => {
            e.preventDefault();
            keys.ArrowLeft = false;
            keys.KeyA = false;
        });
    }

    if (touchRightButton) {
        touchRightButton.addEventListener('touchstart', (e) => {
            e.preventDefault();
            keys.ArrowRight = true;
            keys.KeyD = true;
        }, { passive: false });

        touchRightButton.addEventListener('touchend', (e) => {
            e.preventDefault();
            keys.ArrowRight = false;
            keys.KeyD = false;
        });
    }

    if (touchJumpButton) {
        touchJumpButton.addEventListener('touchstart', (e) => {
            e.preventDefault();
            keys.Space = true;
            wantsToJump = true;
        }, { passive: false });

        touchJumpButton.addEventListener('touchend', (e) => {
            e.preventDefault();
            keys.Space = false;
        });
    }

    // Add Dash button listeners
    if (touchDashButton) {
        touchDashButton.addEventListener('touchstart', (e) => {
            e.preventDefault();
            // Set dash intent - actual dash happens in update if conditions met
            wantsToDash = true;
        }, { passive: false });

        touchDashButton.addEventListener('touchend', (e) => {
            e.preventDefault();
            // Optional: Could reset wantsToDash here, but typically a dash is instant
            // wantsToDash = false;
        });
    }
}

// --- Helper function to show/hide touch controls ---
function updateTouchControlVisibility(show) {
    const displayStyle = show ? 'flex' : 'none'; // Use flex since the containers use it
    if (touchControlsLeftContainer) {
        touchControlsLeftContainer.style.display = displayStyle;
    }
    if (touchControlsRightContainer) {
        touchControlsRightContainer.style.display = displayStyle;
    }
}

// Load player and collectible sprites
function loadSprites() {
    return new Promise((resolve) => {
        const playerSpriteNames = ['walk1', 'walk2', 'walk3', 'sit1', 'sit2']; // Add sit1, sit2
        const collectibleSpriteNames = ['shell1', 'shell2', 'shell3', 'fish1', 'fish2', 'fish3'];
        const backgroundLayerNames = ['bkg1', 'bkg2', 'bkg3']; // New background layers
        const cloudSpriteNames = ['cloud1', 'cloud2', 'cloud3', 'cloud4']; // Cloud sprites
        const poofSpriteNames = ['poof1', 'poof2', 'poof3']; // Poof sprites
        const allSpriteNames = [
            ...playerSpriteNames, 
            ...collectibleSpriteNames, 
            ...backgroundLayerNames, 
            ...cloudSpriteNames,
            ...poofSpriteNames // Add poof names
        ]; 
        let loadedCount = 0;
        const totalSprites = allSpriteNames.length;

        // Assign parallax factors (adjust as needed, smaller means slower/further away)
        // Assuming bkg1=closest, bkg3=furthest
        const parallaxFactors = {
            'bkg1': 1.0, // Fastest scroll (closest)
            'bkg2': 0.5,
            'bkg3': 0.2  // Slowest scroll (furthest)
        };

        // Define Y offsets (positive values move the layer down)
        const yOffsets = {
            'bkg1': 130,  // Lower this layer slightly
            'bkg2': 250,  // Lower this layer more
            'bkg3': 300   // Lower this layer more (same as bkg2)
        };

        if (totalSprites === 0) { // Handle case where there are no sprites to load
            console.log("No sprites to load.");
            resolve();
            return; // Exit early
        }

        allSpriteNames.forEach(name => {
            const img = new Image();
            img.src = `sprites/${name}.png`; // Assumes background is in sprites/
            img.onload = () => {
                if (playerSpriteNames.includes(name)) {
                    player.sprites[name] = img;
                } else if (collectibleSpriteNames.includes(name)) {
                    collectibleSprites[name] = img;
                } else if (backgroundLayerNames.includes(name)) { // Handle background layers
                    backgroundLayers.push({
                        image: img,
                        parallaxFactor: parallaxFactors[name] || 1, // Default to 1 if factor not defined
                        yOffset: yOffsets[name] || 0 // Default to 0 if offset not defined
                    });
                    // Sort layers by parallax factor (ascending) so they draw back-to-front
                    backgroundLayers.sort((a, b) => a.parallaxFactor - b.parallaxFactor);
                } else if (cloudSpriteNames.includes(name)) { // Handle cloud sprites
                    cloudSprites.push(img); // Just store the image
                } else if (poofSpriteNames.includes(name)) { // Handle poof sprites
                    poofSprites.push(img);
                    // Keep poof sprites in order (poof1, poof2, poof3)
                    poofSprites.sort((a, b) => {
                        // Extract number from src URL assuming format 'sprites/poofN.png'
                        const numA = parseInt(a.src.match(/poof(\d+)\.png$/)[1]);
                        const numB = parseInt(b.src.match(/poof(\d+)\.png$/)[1]);
                        return numA - numB;
                    });
                }
                loadedCount++;
                console.log(`Loaded sprite: ${name}.png (${loadedCount}/${totalSprites})`);
                if (loadedCount === totalSprites) {
                    console.log("All sprites loaded successfully.");
                    resolve();
                }
            };
            img.onerror = () => {
                console.error(`Failed to load sprite: ${name}.png`);
                loadedCount++;
                 if (loadedCount === totalSprites) {
                    console.warn("Finished loading sprites, but some failed.");
                    resolve(); // Resolve even if some sprites fail to load
                }
            };
        });
    });
}

// --- Game Logic Functions ---

// Initialize cloud positions, speeds, and sprites
function initializeClouds() {
    clouds = []; // Clear existing clouds
    const numClouds = 5; // Number of clouds to create
    if (cloudSprites.length === 0) {
        console.warn("No cloud sprites loaded to initialize clouds.");
        return;
    }

    for (let i = 0; i < numClouds; i++) {
        const cloudImage = cloudSprites[Math.floor(Math.random() * cloudSprites.length)];
        // Spawn across the screen width + a bit off-screen right initially
        const startX = Math.random() * (canvas.width + 200);
        const startY = 50 + Math.random() * 100; // Random Y position near top
        const speed = 0.2 + Math.random() * 0.6; // Slow random speed (0.2 to 0.8)

        clouds.push({
            image: cloudImage,
            x: startX,
            y: startY,
            speed: speed,
            // Store original width for wrapping logic, scaled later
            originalWidth: cloudImage.naturalWidth 
        });
    }
    console.log("Initialized clouds:", clouds.length);
}

// Update cloud positions (called in main update loop)
function updateClouds() {
    if (clouds.length === 0) return;

    const scaleFactor = 0.75; // Use the same scale factor as backgrounds for now

    clouds.forEach(cloud => {
        cloud.x -= cloud.speed; // Move left

        const scaledWidth = cloud.originalWidth * scaleFactor;
        // Check if cloud is completely off-screen left
        if (cloud.x + scaledWidth < 0) {
            // Reset position to the right, randomize Y and potentially sprite/speed
            cloud.x = canvas.width; // Reset just off-screen right
            cloud.y = 50 + Math.random() * 100; // New random Y
            // Optional: randomize speed and sprite again
            // cloud.speed = 0.2 + Math.random() * 0.6;
            // cloud.image = cloudSprites[Math.floor(Math.random() * cloudSprites.length)];
            // cloud.originalWidth = cloud.image.naturalWidth;
        }
    });
}

// Update poof animation frames and remove finished ones
function updatePoofs() {
    for (let i = activePoofs.length - 1; i >= 0; i--) {
        const poof = activePoofs[i];
        poof.timer++;
        if (poof.timer >= poofFrameDelay) {
            poof.timer = 0;
            poof.sequenceIndex++; // Increment sequence index
            // Remove poof if sequence finished
            if (poof.sequenceIndex >= poofSequence.length) {
                activePoofs.splice(i, 1);
            }
        }
    }
}

function update() {
    if (!gameRunning || paused) return;

    handleInput(); // Process inputs first

    // --- Dash Timer Update ---
    if (player.isDashing) {
        player.dashTimer--;
        if (player.dashTimer <= 0) {
            player.isDashing = false;
            // Optional: Reset velocity immediately or let gravity take over
            // player.velocityX = 0; // Stop horizontal movement abruptly
        }
    }
    // ---

    // Player physics (only apply gravity/normal movement if NOT dashing)
    if (!player.isDashing) {
        let currentGravity = player.gravity;
        // Apply stronger gravity when falling
        if (player.velocityY > 0) {
            currentGravity *= 2.0; // Increase gravity when falling (adjust multiplier as needed)
        }
        player.velocityY += currentGravity;

        // Variable Jump Height: Cut jump short if button released while ascending
        if (!keys.Space && player.velocityY < 0) {
            player.velocityY = Math.max(player.velocityY, -player.jumpStrength / 2.5); // Reduce upward velocity faster (adjust divisor as needed)
        }

        player.x += player.velocityX; // Apply normal horizontal velocity
    } else {
         // Apply dash velocity (already set in handleInput)
         player.x += player.velocityX;
         // Maybe negate gravity during dash? Or reduce it?
         // player.velocityY = 0; // For a purely horizontal dash
    }

    player.y += player.velocityY; // Apply vertical velocity always

    player.isOnGround = false;

    // Platform collision
    platforms.forEach(platform => {
        // Check for potential collision first
        if (
            player.x < platform.x + platform.width &&
            player.x + player.width > platform.x &&
            player.y < platform.y + platform.height &&
            player.y + player.height > platform.y
        ) {
            // --- Remove the immediate dash stop on any contact --- 
            // if (player.isDashing) { ... }

            // --- Refined Collision Checks ---
            
            // 1. Check collision for landing ON TOP (only if falling downwards)
            if (player.velocityY >= 0 && // Use >= 0 to catch landing even if velocity was 0 briefly
                player.y + player.height - (player.velocityY || 0) <= platform.y // Check previous bottom edge position
               ) 
            {
                player.y = platform.y - player.height;
                player.velocityY = 0;
                player.isJumping = false;
                player.isOnGround = true;
                // ADD BACK: Stop dash if landing while dashing
                if (player.isDashing) {
                    player.isDashing = false;
                    player.dashTimer = 0;
                    player.velocityX = 0; // Also stop horizontal dash movement on landing
                }
            }
            // 2. Check for horizontal collision WHILE DASHING
            else if (player.isDashing) {
                 // Check collision with left side of platform (while moving right)
                 if (player.velocityX > 0 && 
                     player.x + player.width - player.velocityX <= platform.x // Check previous right edge
                    )
                 {
                     player.x = platform.x - player.width; // Place player just left of platform
                     player.isDashing = false;
                     player.dashTimer = 0;
                     player.velocityX = 0;
                 }
                 // Check collision with right side of platform (while moving left)
                 else if (player.velocityX < 0 && 
                          player.x - player.velocityX >= platform.x + platform.width // Check previous left edge
                         )
                 {
                     player.x = platform.x + platform.width; // Place player just right of platform
                     player.isDashing = false;
                     player.dashTimer = 0;
                     player.velocityX = 0;
                 }
                 // Optional: Check for ceiling collision (hitting from below)
                 // else if (player.velocityY < 0 && player.y - player.velocityY >= platform.y + platform.height) { ... }
            }
            // 3. Handle other potential collisions (e.g., hitting ceiling when *not* dashing)
            // else if (player.velocityY < 0 && ...) { ... }

        }
    });

    // Level boundaries check
    if (player.x < 0) {
        player.x = 0;
    }
    // Use levelWidth for the right boundary
    if (player.x + player.width > levelWidth) {
        player.x = levelWidth - player.width;
    }

    // Water collision check (using world coordinates) - Stop dash if hitting water
    if (
        player.x < water.x + water.width &&
        player.x + player.width > water.x &&
        player.y + player.height > water.y
    ) {
        if (player.isDashing) { // Stop dash before game over
             player.isDashing = false;
             player.dashTimer = 0;
        }
        gameOver("Jiji got wet! Game over!");
        return; // Exit update early on game over
    }

    // Collectible collision
    collectibles.forEach((item) => {
        if (!item.collected &&
            player.x < item.x + item.width &&
            player.x + player.width > item.x &&
            player.y < item.y + item.height &&
            player.y + player.height > item.y
        ) {
            item.collected = true;
            score += (item.type === 'shell' ? 10 : 20);
            const randomScoreSound = scoreSounds[Math.floor(Math.random() * scoreSounds.length)];
            randomScoreSound.play().catch(e => console.error("Error playing score sound:", e));
        }
    });

    // --- Update camera position with dead zone ---
    const deadZoneWidth = canvas.width * 0.25; // 25% of screen width
    const deadZoneLeft = camera.x + (canvas.width - deadZoneWidth) / 2;
    const deadZoneRight = camera.x + (canvas.width + deadZoneWidth) / 2;
    const playerCenterX = player.x + player.width / 2;

    let targetCameraX = camera.x; // Start with current camera position

    if (playerCenterX < deadZoneLeft) {
        // Player is to the left of the dead zone, move camera left
        targetCameraX = playerCenterX - (canvas.width - deadZoneWidth) / 2;
    } else if (playerCenterX > deadZoneRight) {
        // Player is to the right of the dead zone, move camera right
        targetCameraX = playerCenterX - (canvas.width + deadZoneWidth) / 2;
    }

    // Clamp camera x within level boundaries
    camera.x = Math.max(0, Math.min(targetCameraX, levelWidth - canvas.width));

    updateClouds(); // Update cloud positions
    updatePoofs(); // Update poof animations
    updateAnimation();
}

function handleInput() {
    // --- Dash Handling ---
    // Check for dash intent (unified from keyboard/touch)
    // Allow dash if intent exists and NOT currently dashing
    if (wantsToDash && !player.isDashing) {
        player.isDashing = true;
        player.canDash = false; // Keep this for potential future use (e.g., limiting total dashes)
        player.dashTimer = player.dashDuration;
        player.velocityX = (player.facingRight ? 1 : -1) * player.dashSpeed;
        player.velocityY = 0;
        console.log("DASH!");

        // Create a poof effect instance behind the player
        if (poofSprites.length > 0) {
            const poofX = player.facingRight ? player.x - player.width * 0.2 : player.x + player.width * 0.7; // Position slightly behind facing direction
            const poofY = player.y + player.height * 0.5; // Center vertically relative to player
            activePoofs.push({
                x: poofX,
                y: poofY,
                sequenceIndex: 0, // Start at first step in the sequence
                timer: 0,
                 // Optional: Use player size or fixed size?
                width: player.width * 0.8, // Slightly smaller than player
                height: player.height * 0.8 
            });
        }
        // Play dash sound?
    }
    // Reset dash intent flag after checking it (handles both keyboard and touch)
    if (wantsToDash) {
        wantsToDash = false;
    }
    // ---

    // --- Normal Movement (only if NOT dashing) ---
    if (!player.isDashing) {
        player.velocityX = 0;
        if (keys.ArrowLeft || keys.KeyA) {
            player.velocityX = -player.speed;
            player.facingRight = false;
        }
        if (keys.ArrowRight || keys.KeyD) {
            player.velocityX = player.speed;
            player.facingRight = true;
        }

        let jumpIntentProcessed = false; // Keep track if we processed the intent this frame

        // Jump check: Use wantsToJump flag and ensure player is grounded
        if (wantsToJump && !player.isJumping && player.isOnGround) {
            player.velocityY = -player.jumpStrength;
            player.isJumping = true;
            player.isOnGround = false;
            // player.canDash = true; // Reset dash ability on JUMPING (if desired, usually on landing)
            jumpIntentProcessed = true; // Mark intent as processed (led to a jump)
            const randomJumpSound = jumpSounds[Math.floor(Math.random() * jumpSounds.length)];
            randomJumpSound.play().catch(e => console.error("Error playing jump sound:", e));
        }

        // If jump intent existed this frame, reset it AFTER checking conditions.
        // This ensures the intent from one press isn't held until landing.
        if (wantsToJump) {
            wantsToJump = false;
        }
    }
    // ---
}

function updateAnimation() {
    // Determine player state
    player.isIdle = player.isOnGround && player.velocityX === 0 && !player.isJumping;

    if (player.isIdle) {
        // Idle animation logic
        player.idleFrameCount++;
        if (player.idleFrameCount >= player.idleFrameDelay) {
            player.idleFrameCount = 0;
            player.currentIdleFrame = (player.currentIdleFrame + 1) % player.idleFrames.length;
        }
        // Reset walk animation when starting idle
        player.currentFrame = 0;
        player.walkFrameCount = 0;
    } else if (!player.isOnGround) {
        // Jumping state - use a specific frame (e.g., the second walk frame for a jump pose)
        player.currentFrame = 1; // Or could add a dedicated jump sprite later
        // Reset idle animation when jumping
        player.currentIdleFrame = 0;
        player.idleFrameCount = 0;
    } else if (player.velocityX !== 0 && player.isOnGround) {
        // Walking animation logic
        player.walkFrameCount++;
        if (player.walkFrameCount >= player.walkFrameDelay) {
            player.walkFrameCount = 0;
            player.currentFrame = (player.currentFrame + 1) % player.walkFrames.length;
        }
        // Reset idle animation when walking
        player.currentIdleFrame = 0;
        player.idleFrameCount = 0;
    } else {
         // Default case (e.g., falling but velocityX is 0) - maybe use first walk frame or jump frame
         player.currentFrame = 0; // Or 1 if preferred
         // Reset idle animation
         player.currentIdleFrame = 0;
         player.idleFrameCount = 0;
    }
}

function draw() {
    if (!gameRunning && !paused) return;

    // Clear the entire canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw a base light blue background first
    ctx.fillStyle = '#87CEEB';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // --- Draw Parallax Background Layers --- 
    // Draw these relative to the canvas (0,0), before the main camera translation
    ctx.save(); // Save context state before drawing backgrounds

    const backgroundScaleFactor = 0.75; // Make backgrounds 75% of original size

    if (backgroundLayers.length > 0) {
        // Find the index of the layer behind which clouds should appear (bkg3, factor 0.2)
        const cloudLayerIndex = backgroundLayers.findIndex(layer => layer.parallaxFactor === 0.2);

        // Draw layers up to and including the cloud layer index
        for (let i = 0; i <= cloudLayerIndex; i++) {
            if (backgroundLayers[i]) {
                drawBackgroundLayer(backgroundLayers[i], backgroundScaleFactor);
            }
        }

        // Draw the clouds
        drawClouds(backgroundScaleFactor);

        // Draw the remaining layers
        for (let i = cloudLayerIndex + 1; i < backgroundLayers.length; i++) {
             if (backgroundLayers[i]) {
                drawBackgroundLayer(backgroundLayers[i], backgroundScaleFactor);
            }
        }

        // Old logic (draw all layers sequentially)
        // backgroundLayers.forEach(layer => {
        //    drawBackgroundLayer(layer, backgroundScaleFactor);
        // });
    } else {
        // Fallback if background layers aren't loaded (keep blue background drawn above)
        // ctx.fillStyle = '#87CEEB'; // Light sky blue fallback (already drawn above)
        // ctx.fillRect(0, 0, canvas.width, canvas.height); // Already drawn above
    }
    
    // Backgrounds are drawn relative to the screen (0,0). No restore needed here yet.
    // ctx.restore(); // NO - Keep context saved until after world elements

    // --- Apply Main Camera Translation --- 
    // Now translate the context for all subsequent world elements (player, platforms, etc.)
    ctx.translate(-camera.x, -camera.y);

    // --- Draw elements that scroll with the camera ---
    // (Platforms, Water, Collectibles, Player drawn AFTER background and AFTER main camera translate)

    if (!paused) {
        // Draw Platforms (using world coordinates)
        ctx.fillStyle = '#A0522D'; // Brown for platforms
        platforms.forEach((platform, index) => {
            // Skip drawing the first platform (index 0), which is the ground
            if (index === 0) return; // Don't draw the ground platform

            ctx.fillRect(platform.x, platform.y, platform.width, platform.height);
        });

        // Draw Water (using world coordinates)
        // ctx.fillStyle = '#1E90FF'; // Blue for water
        // ctx.fillRect(water.x, water.y, water.width, water.height); // Hide water drawing

        // Draw Collectibles (using world coordinates)
        collectibles.forEach(item => {
            if (!item.collected) {
                let spriteName = `${item.type}${item.spriteIndex}`;
                let spriteToDraw = collectibleSprites[spriteName];

                if (spriteToDraw) {
                    ctx.drawImage(
                        spriteToDraw,
                        item.x,
                        item.y,
                        item.width,
                        item.height
                    );
                } else {
                    console.warn(`Sprite '${spriteName}.png' not loaded, drawing fallback.`);
                    if (item.type === 'shell') {
                        ctx.fillStyle = '#FFF8DC';
                        ctx.beginPath();
                        ctx.ellipse(item.x + item.width / 2, item.y + item.height / 2, item.width / 2, item.height / 3, 0, 0, 2 * Math.PI);
                        ctx.fill();
                    } else if (item.type === 'fish') {
                        ctx.fillStyle = '#FF6347';
                        ctx.beginPath();
                        ctx.ellipse(item.x + item.width / 2, item.y + item.height / 2, item.width / 2, item.height / 2, Math.PI / 4, 0, 2 * Math.PI);
                        ctx.fill();
                    }
                }
            }
        });

        // Draw Player (using world coordinates)
        drawPlayer(); // drawPlayer already uses player.x, player.y

        // Draw Poof effects (after player)
        drawPoofs();

    }
    // --- End drawing world elements --- 
    ctx.restore(); // Restore context to pre-translate state

    // --- Draw UI elements (fixed position on screen) --- 
    if (paused) {
        // Draw pause overlay (fixed on screen)
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = 'white';
        ctx.font = '48px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('Paused', canvas.width / 2, canvas.height / 2 - 50);
    }

    // Draw Score (fixed on screen)
    drawScore(); 
}

function drawPlayer() {
    let frameName;
    if (player.isIdle) {
        frameName = player.idleFrames[player.currentIdleFrame];
    } else if (!player.isOnGround) {
         // Use a jump frame (using walk1 as placeholder for now)
        frameName = player.walkFrames[1]; // Or player.walkFrames[0] or a dedicated jump sprite name
    } else { // Walking
        frameName = player.walkFrames[player.currentFrame];
    }

    const sprite = player.sprites[frameName];

    if (sprite) {
        ctx.save(); // Save context before potential player transform
        
        // Translate to the player's position (world coordinates)
        // We don't need translate(player.x, player.y) because the main draw context is already translated by the camera

        if (!player.facingRight) {
            // Flip the sprite horizontally
            // We translate to the point of flip (player's right edge), scale, then draw at (0,0) relative to that translated+scaled point
            ctx.translate(player.x + player.width, player.y); 
            ctx.scale(-1, 1);
            ctx.drawImage(sprite, 0, 0, player.width, player.height);
        } else {
            // Draw normally at player's world coordinates
            ctx.drawImage(sprite, player.x, player.y, player.width, player.height);
        }
        
        ctx.restore(); // Restore context after drawing player
    } else {
        // Fallback drawing if sprite is missing
        ctx.fillStyle = 'purple'; 
        ctx.fillRect(player.x, player.y, player.width, player.height);
    }
}

function gameLoop() {
    update();
    draw();
    if (gameRunning) {
        animationFrameId = requestAnimationFrame(gameLoop);
    }
}

function startGame() {
    resetGameState(); // Reset player position first

    // --- Calculate initial camera position --- 
    let initialTargetCameraX = player.x + player.width / 2 - canvas.width / 2;
    camera.x = Math.max(0, Math.min(initialTargetCameraX, levelWidth - canvas.width));
    // Ensure y is 0 if only horizontal scrolling
    camera.y = 0; 

    gameRunning = true;
    paused = false;
    startMenu.style.display = 'none';
    settingsScreen.style.display = 'none';
    pauseMenu.style.display = 'none';
    canvas.style.display = 'block';
    ingamePauseButton.style.display = 'block';
    updateTouchControlVisibility(true); // Show touch controls

    // --- Unlock Audio for Mobile ---
    // Play and immediately pause each SFX to allow playback later on mobile
    const allSfx = [...jumpSounds, ...scoreSounds];
    allSfx.forEach(sound => {
        const playPromise = sound.play();
        if (playPromise !== undefined) {
            playPromise.then(_ => {
                // Playback started successfully, pause immediately.
                sound.pause();
                sound.currentTime = 0; // Reset time
            }).catch(error => {
                // Autoplay was prevented. This is common before user interaction.
                // We might still be unlocked for later plays initiated by interaction.
                console.log("Initial SFX play prevented:", error);
                // Attempt to reset just in case.
                 try {
                    sound.pause();
                    sound.currentTime = 0;
                 } catch (resetError) {
                    console.error("Error resetting sound after failed play:", resetError);
                 }
            });
        } else {
             // Play() might not return a promise in older environments
             // or if called improperly. Try a simple pause/reset.
             try {
                sound.pause();
                sound.currentTime = 0;
             } catch (syncError) {
                console.error("Error pausing sound synchronously:", syncError);
             }
        }
    });
    // -----------------------------

    backgroundMusic.currentTime = 0;
    backgroundMusic.play().catch(e => console.error("Error playing background music:", e));

    if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
    }
    loadSprites().then(() => {
        initializeClouds(); // Create initial clouds after sprites are loaded
        console.log("Sprites loaded, starting game loop with initial camera position:", camera.x);
        animationFrameId = requestAnimationFrame(gameLoop);
    });
}

function gameOver(message) {
    gameRunning = false;
    paused = false;
    backgroundMusic.pause();
    ingamePauseButton.style.display = 'none';
    pauseMenu.style.display = 'none';
    updateTouchControlVisibility(false); // Hide touch controls on Game Over screen potentially

    if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
    }

    console.log(message);
    alert(message);
    goToMainMenu();
}

function resetGameState() {
    player.x = 300; // Start player further into the level
    player.y = canvas.height - 138; // Adjusted for raised ground and new height
    player.velocityX = 0;
    player.velocityY = 0;
    player.isJumping = false;
    player.isOnGround = true;
    player.currentFrame = 0;
    player.walkFrameCount = 0;
    player.facingRight = true;
    player.isIdle = true;
    player.currentIdleFrame = 0;
    player.idleFrameCount = 0;
    // Reset dash state
    player.isDashing = false;
    player.dashTimer = 0;

    score = 0;

    collectibles.forEach(item => item.collected = false);

    for (const key in keys) {
        keys[key] = false;
    }
}

function goToMainMenu() {
    gameRunning = false;
    paused = false;
    backgroundMusic.pause();
    if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
    }

    canvas.style.display = 'none';
    pauseMenu.style.display = 'none';
    settingsScreen.style.display = 'none';
    ingamePauseButton.style.display = 'none';
    startMenu.style.display = 'block';

    resetGameState();
}

function togglePause() {
    paused = !paused;
    if (paused) {
        pauseMenu.style.display = 'block';
        updateTouchControlVisibility(false); // Hide controls when paused
    } else {
        pauseMenu.style.display = 'none';
        updateTouchControlVisibility(true); // Show controls when resumed
    }
}

// --- Event Listeners for Menus ---

startButton.addEventListener('click', startGame);

settingsButton.addEventListener('click', () => {
    startMenu.style.display = 'none';
    settingsScreen.style.display = 'block';
    settingsScreen.classList.add('menu');
});

backButton.addEventListener('click', () => {
    settingsScreen.style.display = 'none';
    startMenu.style.display = 'block';
});

musicVolumeSlider.addEventListener('input', (e) => {
    setMusicVolume(parseFloat(e.target.value));
});

sfxVolumeSlider.addEventListener('input', (e) => {
    setSfxVolume(parseFloat(e.target.value));
});

ingamePauseButton.addEventListener('click', togglePause);

resumeButton.addEventListener('click', togglePause);

mainMenuButton.addEventListener('click', goToMainMenu);

canvas.style.display = 'none';
startMenu.style.display = 'block';
settingsScreen.style.display = 'none';
pauseMenu.style.display = 'none';
ingamePauseButton.style.display = 'none';

settingsScreen.classList.add('menu');
pauseMenu.classList.add('menu');

console.log("Game setup complete. Ready to start.");

// Initialize touch controls after DOM is ready
setupTouchControls();
updateTouchControlVisibility(false); // Ensure controls are hidden initially

// --- Initial Resize and Event Listener ---
resizeCanvas(); // Call initially to set size
window.addEventListener('resize', resizeCanvas); // Adjust canvas on window resize

function drawScore() {
    // Draw score relative to the canvas, not the world
    ctx.fillStyle = 'black';
    ctx.font = '20px "Fredoka One", cursive';
    ctx.textAlign = 'left';
    ctx.fillText('Score: ' + score, 20, 30); // Use fixed screen coordinates (top-left)
}

// --- Responsive Canvas Scaling ---
function resizeCanvas() {
    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;

    // Calculate scale based on height first (fit height)
    let scale = windowHeight / nativeHeight;
    let newWidth = nativeWidth * scale;
    let newHeight = windowHeight;

    // If width is too large, scale based on width instead (fit width)
    if (newWidth > windowWidth) {
        scale = windowWidth / nativeWidth;
        newWidth = windowWidth;
        newHeight = nativeHeight * scale;
    }

    // Apply scaled dimensions to canvas style
    canvas.style.width = `${newWidth}px`;
    canvas.style.height = `${newHeight}px`;

    // Center the canvas (since body is flex centered, this might not be needed, but good practice)
    // The flex centering on the body should handle this automatically.
    // canvas.style.marginLeft = `${(windowWidth - newWidth) / 2}px`;
    // canvas.style.marginTop = `${(windowHeight - newHeight) / 2}px`; // Only if not vertically centered by flex

    console.log(`Resized canvas style to: ${newWidth}x${newHeight}`);
}

// Helper function to draw a single background layer (extracted from previous loop)
function drawBackgroundLayer(layer, scaleFactor) {
    const img = layer.image;
    const parallaxFactor = layer.parallaxFactor;
    const originalWidth = img.naturalWidth;
    const originalHeight = img.naturalHeight;
    const yOffset = layer.yOffset;

    if (originalHeight > 0 && originalWidth > 0) {
        const layerWidth = originalWidth * scaleFactor;
        const layerHeight = originalHeight * scaleFactor;

        if (layerWidth > 0) {
            const layerCameraX = camera.x * parallaxFactor;
            const startX_world = Math.floor(layerCameraX / layerWidth) * layerWidth;

            for (let currentX_world = startX_world; currentX_world < layerCameraX + canvas.width; currentX_world += layerWidth) {
                const screenX = currentX_world - layerCameraX;
                ctx.drawImage(img, screenX, yOffset, layerWidth, layerHeight);
            }
        } else {
            console.warn("Background layer scaled width is zero.");
        }
    } else {
        console.warn("Background layer image dimensions are invalid.");
    }
}

// Function to draw clouds
function drawClouds(scaleFactor) {
     if (clouds.length === 0) return;

    const cloudSpecificScaleFactor = scaleFactor * 0.5; // Make clouds half the size relative to the background scale

    clouds.forEach(cloud => {
        const img = cloud.image;
        const scaledWidth = cloud.originalWidth * cloudSpecificScaleFactor;
        const scaledHeight = img.naturalHeight * cloudSpecificScaleFactor;
        ctx.drawImage(img, cloud.x, cloud.y, scaledWidth, scaledHeight);
    });
}

// Function to draw active poof effects
function drawPoofs() {
    if (activePoofs.length === 0 || poofSprites.length === 0) return;

    activePoofs.forEach(poof => {
        // Get the correct frame index from the sequence
        const frameIndex = poofSequence[poof.sequenceIndex]; 
        const frame = poofSprites[frameIndex];
        if (frame) {
            // Draw centered around poof.x, poof.y ? Or corner? Let's try corner.
            ctx.drawImage(frame, poof.x, poof.y, poof.width, poof.height);
        } else {
            // This might happen briefly if sequenceIndex became invalid before removal
            console.warn(`Poof frame index ${frameIndex} invalid for sequence index ${poof.sequenceIndex}`);
        }
    });
} 