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
// Game Over Screen elements
const gameOverScreen = document.getElementById('game-over-screen');
const gameOverMessageElement = document.getElementById('game-over-message');
const gameOverMainMenuButton = document.getElementById('game-over-main-menu-button');
// Touch control elements (will be added in HTML)
const touchLeftButton = document.getElementById('touch-left');
const touchRightButton = document.getElementById('touch-right');
const touchJumpButton = document.getElementById('touch-jump');
const touchDashButton = document.getElementById('touch-dash'); // Get dash button
const touchControlsLeftContainer = document.getElementById('touch-controls-left'); // New left container
const touchControlsRightContainer = document.getElementById('touch-controls-right'); // New right container

// --- Menu Navigation Setup ---
const startMenuItems = [startButton, settingsButton];
const pauseMenuItems = [resumeButton, mainMenuButton];
const settingsMenuItems = [musicVolumeSlider, sfxVolumeSlider, backButton]; // Added settings items
let startMenuFocusIndex = 0;
let pauseMenuFocusIndex = 0;
let settingsMenuFocusIndex = 0; // Added settings focus index
const focusedElementClass = 'focused-element'; // Use a more general name

// Function to update visual focus on menu elements (buttons, sliders, etc.)
function updateMenuFocus(menuItems, newFocusIndex, oldFocusIndex, cssClass) {
    if (oldFocusIndex >= 0 && oldFocusIndex < menuItems.length) {
        menuItems[oldFocusIndex]?.classList.remove(cssClass);
    }
    if (newFocusIndex >= 0 && newFocusIndex < menuItems.length) {
        menuItems[newFocusIndex]?.classList.add(cssClass);
    }
}

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
// const dashSound = new Audio('music/dash.wav'); // Remove single dash sound
const dashSounds = [ // Create array for dash sounds
    new Audio('music/dash1.wav'),
    new Audio('music/dash2.wav'),
    new Audio('music/dash3.wav')
];
const kishmishDeathSound = new Audio('music/kishmish1.wav'); // Added Kishmish death sound
jumpSounds.forEach(sound => sound.volume = sfxVolume);
scoreSounds.forEach(sound => sound.volume = sfxVolume);
// dashSound.volume = sfxVolume; // Remove old volume set
dashSounds.forEach(sound => sound.volume = sfxVolume); // Set initial volume for dash sounds
kishmishDeathSound.volume = sfxVolume; // Set initial volume for Kishmish death sound

// Function to update SFX volume
function setSfxVolume(volume) {
    sfxVolume = volume;
    jumpSounds.forEach(sound => sound.volume = sfxVolume);
    scoreSounds.forEach(sound => sound.volume = sfxVolume);
    // dashSound.volume = sfxVolume; // Remove old volume update
    dashSounds.forEach(sound => sound.volume = sfxVolume); // Update volume for all dash sounds
    kishmishDeathSound.volume = sfxVolume; // Update Kishmish death sound volume
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
    // Cooldown properties
    dashCooldown: 750, // Cooldown duration in milliseconds (0.75 seconds)
    dashCooldownTimer: 0, // Timer for dash cooldown
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
    idleFrameDelay: 30, // Controls idle animation speed (slower)
    // --- Add canDashInAir property ---
    canDashInAir: true,
};

// Collectible Sprites
let collectibleSprites = {};
let backgroundLayers = []; // Add array for parallax background layers
let cloudSprites = []; // Array to hold loaded cloud sprites
let clouds = []; // Array to hold active cloud objects
let poofSprites = []; // Array to hold poof animation frames
let activePoofs = []; // Array for active poof effect instances
let afterImages = []; // Array for dash afterimages
const poofSequence = [1, 0, 1, 2]; // Desired frame order (0-based indices for poofSprites)
const poofFrameDelay = 6; // SLOWER: How many game frames each poof frame lasts (was 4)

// Kishmish enemy setup
let kishmishSprites = {}; // Object to hold loaded kishmish sprites
let kishmishes = []; // Array to hold active kishmish enemy objects

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
    // --- Menu Navigation Logic ---
    let menuHandled = false;
    if (startMenu.style.display === 'block') {
        const itemCount = startMenuItems.length;
        let oldIndex = startMenuFocusIndex;
        if (e.code === 'ArrowUp' || e.code === 'KeyW' || e.code === 'ArrowLeft' || e.code === 'KeyA') {
            startMenuFocusIndex = (startMenuFocusIndex - 1 + itemCount) % itemCount;
            menuHandled = true;
        } else if (e.code === 'ArrowDown' || e.code === 'KeyS' || e.code === 'ArrowRight' || e.code === 'KeyD') {
            startMenuFocusIndex = (startMenuFocusIndex + 1) % itemCount;
            menuHandled = true;
        } else if (e.code === 'Space' || e.code === 'Enter') {
            startMenuItems[startMenuFocusIndex]?.click();
            menuHandled = true;
        }
        if (menuHandled) {
            updateMenuFocus(startMenuItems, startMenuFocusIndex, oldIndex, focusedElementClass);
        }

    } else if (pauseMenu.style.display === 'block') {
        const itemCount = pauseMenuItems.length;
        let oldIndex = pauseMenuFocusIndex;
        if (e.code === 'ArrowUp' || e.code === 'KeyW' || e.code === 'ArrowLeft' || e.code === 'KeyA') {
            pauseMenuFocusIndex = (pauseMenuFocusIndex - 1 + itemCount) % itemCount;
            menuHandled = true;
        } else if (e.code === 'ArrowDown' || e.code === 'KeyS' || e.code === 'ArrowRight' || e.code === 'KeyD') {
            pauseMenuFocusIndex = (pauseMenuFocusIndex + 1) % itemCount;
            menuHandled = true;
        } else if (e.code === 'Space' || e.code === 'Enter') {
            pauseMenuItems[pauseMenuFocusIndex]?.click();
            menuHandled = true;
        }
        if (menuHandled) {
            updateMenuFocus(pauseMenuItems, pauseMenuFocusIndex, oldIndex, focusedElementClass);
        }
    }
    // --- ADDED: Settings Menu Navigation ---
    else if (settingsScreen.style.display === 'block') {
        const itemCount = settingsMenuItems.length;
        let oldIndex = settingsMenuFocusIndex;
        let focusChanged = false;

        if (e.code === 'ArrowUp' || e.code === 'KeyW') {
            settingsMenuFocusIndex = (settingsMenuFocusIndex - 1 + itemCount) % itemCount;
            focusChanged = true;
        } else if (e.code === 'ArrowDown' || e.code === 'KeyS') {
            settingsMenuFocusIndex = (settingsMenuFocusIndex + 1) % itemCount;
            focusChanged = true;
        } else if (e.code === 'Space' || e.code === 'Enter') {
            // Activate focused element (click button, or maybe focus slider?)
            const focusedElement = settingsMenuItems[settingsMenuFocusIndex];
            if (focusedElement && typeof focusedElement.click === 'function') {
                focusedElement.click();
            }
            // Potentially add logic here if activating a slider should do something specific
            menuHandled = true; // Prevent game actions
        } else if (e.code === 'ArrowLeft' || e.code === 'KeyA' || e.code === 'ArrowRight' || e.code === 'KeyD') {
            // Handle left/right arrows for sliders
            const focusedElement = settingsMenuItems[settingsMenuFocusIndex];
            if (focusedElement && focusedElement.type === 'range') {
                const step = parseFloat(focusedElement.step) || 0.1;
                let value = parseFloat(focusedElement.value);
                if (e.code === 'ArrowLeft' || e.code === 'KeyA') {
                    value -= step;
                } else {
                    value += step;
                }
                // Clamp value within min/max
                value = Math.max(parseFloat(focusedElement.min) || 0, Math.min(parseFloat(focusedElement.max) || 1, value));
                focusedElement.value = value;
                // Trigger input event to update volume
                focusedElement.dispatchEvent(new Event('input')); 
                menuHandled = true; // Prevent game actions
            }
        }

        if (focusChanged) {
            updateMenuFocus(settingsMenuItems, settingsMenuFocusIndex, oldIndex, focusedElementClass);
            menuHandled = true; // Prevent game actions if focus changed
        }
    }

    // If a menu handled the key, prevent further game input processing
    if (menuHandled) {
        e.preventDefault(); // Prevent default space/enter actions (like scrolling)
        return; // Don't process game keys if menu navigation occurred
    }

    // --- ADDED: Game Over Screen Interaction ---
    else if (gameOverScreen.style.display === 'block') {
        if (e.code === 'Space' || e.code === 'Enter') {
            gameOverMainMenuButton.click();
            menuHandled = true; // Mark as handled
            e.preventDefault(); // Prevent default space/enter actions
            return;
        }
    }

    // --- Original Game Input Logic ---
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
        const backgroundLayerNames = ['bkg1', 'bkg2', 'bkg3']; // REMOVED cloud1
        const cloudSpriteNames = ['cloud1', 'cloud2', 'cloud3', 'cloud4']; // RESTORED
        const poofSpriteNames = ['poof1', 'poof2', 'poof3']; // Poof sprites
        const kishmishSpriteNames = ['kishmish_walk1', 'kishmish_walk2', 'kishmish_sit1']; // Kishmish sprites
        const allSpriteNames = [
            ...playerSpriteNames,
            ...collectibleSpriteNames,
            ...backgroundLayerNames,
            ...cloudSpriteNames, // RESTORED
            ...poofSpriteNames, // Add poof names
            ...kishmishSpriteNames // Add kishmish names
        ];
        let loadedCount = 0;
        const totalSprites = allSpriteNames.length;

        // Assign parallax factors (adjust as needed, smaller means slower/further away)
        const parallaxFactors = {
            'bkg1': 1.0, // Fastest scroll (closest)
            'bkg2': 0.5,
            'bkg3': 0.2  // Slowest scroll (furthest)
            // REMOVED: 'cloud1': 0.25
        };

        // Define Y offsets (positive values move the layer down)
        const yOffsets = {
            'bkg1': 130,  // Lower this layer slightly
            'bkg2': 250,  // Lower this layer more
            'bkg3': 300  // Lower this layer more
            // REMOVED: 'cloud1': 50
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
                } else if (cloudSpriteNames.includes(name)) { // Handle cloud sprites // RESTORED
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
                } else if (kishmishSpriteNames.includes(name)) { // Handle kishmish sprites
                    kishmishSprites[name] = img;
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

// RESTORED Cloud Function
function initializeClouds() {
    clouds = []; // Clear existing clouds
    const numClouds = 13; // Lowered from 15
    if (cloudSprites.length === 0) {
        console.warn("No cloud sprites loaded to initialize clouds.");
        return;
    }

    for (let i = 0; i < numClouds; i++) {
        const cloudImage = cloudSprites[Math.floor(Math.random() * cloudSprites.length)];
        // Spawn across the *level* width + a bit off-screen right initially
        const startX = Math.random() * (levelWidth + 200); // Spread across level
        const startY = 50 + Math.random() * 200; // Increased range downwards (was * 100)
        const speed = 0.1 + Math.random() * 0.4; // SLOWER independent speed (0.1 to 0.5)

        clouds.push({
            image: cloudImage,
            x: startX, // Use world coordinate X
            y: startY,
            speed: speed,
            // Store original width for wrapping logic, scaled later
            originalWidth: cloudImage.naturalWidth
        });
    }
    console.log("Initialized clouds:", clouds.length);
}

// RESTORED and slightly modified Cloud Function
function updateClouds() {
    if (clouds.length === 0) return;

    const cloudParallaxFactor = 0.25; // Define parallax factor for wrapping check
    const effectiveScreenWidth = canvas.width / cloudParallaxFactor; // How much world space the clouds seem to cover

    clouds.forEach(cloud => {
        cloud.x -= cloud.speed; // Move left based on independent speed

        const scaleFactor = 0.5; // Reuse scale factor from drawClouds
        const scaledWidth = cloud.originalWidth * scaleFactor;

        // Check if cloud is completely off-screen left, considering parallax
        // screenX = cloud.x - camera.x * cloudParallaxFactor
        // Check if screenX + scaledWidth < 0
        // cloud.x - camera.x * cloudParallaxFactor + scaledWidth < 0
        const screenX = cloud.x - camera.x * cloudParallaxFactor;

        if (screenX + scaledWidth < 0) {
            // Reset position to the right edge of the *effective* screen
            // screenX_new = effectiveScreenWidth;
            // cloud.x_new - camera.x * cloudParallaxFactor = effectiveScreenWidth
            // cloud.x_new = effectiveScreenWidth + camera.x * cloudParallaxFactor
            cloud.x = (camera.x * cloudParallaxFactor) + canvas.width + Math.random() * 100; // Place it off the right edge relative to camera view
            cloud.y = 50 + Math.random() * 200; // New random Y, increased range downwards
            // Optional: randomize speed and sprite again
            // cloud.speed = 0.1 + Math.random() * 0.4;
            cloud.image = cloudSprites[Math.floor(Math.random() * cloudSprites.length)];
            cloud.originalWidth = cloud.image.naturalWidth;
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

// Add a variable to track the last frame time
let lastTime = 0;

function gameLoop(timestamp) { // timestamp is provided by requestAnimationFrame
    if (!lastTime) {
        lastTime = timestamp;
    }
    const deltaTime = timestamp - lastTime; // Time elapsed in milliseconds
    lastTime = timestamp;

    // Pass deltaTime to update function
    update(deltaTime);
    draw();

    if (gameRunning) {
        animationFrameId = requestAnimationFrame(gameLoop);
    }
}

function update(deltaTime) {
    if (!gameRunning || paused) return;

    // Update dash cooldown timer
    if (player.dashCooldownTimer > 0) {
        player.dashCooldownTimer -= deltaTime;
    }

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

    // --- Platform Collision Refactor ---
    let groundedThisFrame = false; // Track if grounded in this frame's collision checks

    // Platform collision
    platforms.forEach(platform => {
        // Check for potential collision first
        if (
            player.x < platform.x + platform.width &&
            player.x + player.width > platform.x &&
            player.y < platform.y + platform.height &&
            player.y + player.height > platform.y
        ) {
            // --- Refined Collision Checks ---
            
            // 1. Check collision for landing ON TOP (only if falling downwards)
            if (player.velocityY >= 0 && // Use >= 0 to catch landing even if velocity was 0 briefly
                player.y + player.height - (player.velocityY || 0) <= platform.y // Check previous bottom edge position
               ) 
            { 
                // Capture state BEFORE landing modifications
                const wasJumping = player.isJumping;
                const landingVelocityY = player.velocityY;

                // Perform landing modifications
                player.y = platform.y - player.height;
                player.velocityY = 0;
                player.isJumping = false;
                player.canDashInAir = true; // Reset air dash on landing
                groundedThisFrame = true; // Mark as grounded for this frame
                
                 // Reset cooldown timer ONLY if landing from a jump or significant fall
                if (wasJumping || landingVelocityY > player.gravity) { // Threshold can be adjusted
                    player.dashCooldownTimer = 0;
                    // console.log("Landed from jump/fall, resetting dash cooldown."); // Optional debug log
                }

                // Stop dash if landing while dashing (Collision part)
                if (player.isDashing) {
                    player.isDashing = false;
                    player.velocityX = 0; // Also stop horizontal dash movement on landing
                }
            }
            // 2. Check for horizontal collision WHILE DASHING - Intentionally removed (Pass through)
            // else if (player.isDashing) { ... }
            // 3. Handle other potential collisions (e.g., hitting ceiling when *not* dashing)
            // else if (player.velocityY < 0 && ...) { ... }

        }
    });

    // --- Finalize Ground Status --- 
    // Set the definitive ground status for this frame
    player.isOnGround = groundedThisFrame;

    // --- End of Platform Collision Refactor ---

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

    updateClouds(); // RESTORED
    updatePoofs(); // Update poof animations
    updateAfterImages(deltaTime); // <<< --- ADD THIS CALL
    updateAnimation();
    updateKishmishes(deltaTime); // Update kishmish logic
    checkPlayerEnemyCollisions(); // Check for collisions with kishmishes
}

function handleInput() {
    // --- Dash Handling ---
    // Check for dash intent (unified from keyboard/touch)
    // Allow dash if intent exists, NOT currently dashing, cooldown is ready, AND (on ground OR can dash in air)
    if (wantsToDash && !player.isDashing && player.dashCooldownTimer <= 0 && (player.isOnGround || player.canDashInAir)) {

        // If dashing in air, consume the air dash ability
        if (!player.isOnGround) {
            player.canDashInAir = false;
        }

        // --- Capture state for afterimages ---
        const startX = player.x;
        const startY = player.y;
        const startFacingRight = player.facingRight;
        // Determine current sprite (simplified logic, might need refinement if complex states exist during dash start)
        let spriteName;
        if (player.isIdle) {
            spriteName = player.idleFrames[player.currentIdleFrame];
        } else if (!player.isOnGround) {
            spriteName = player.walkFrames[1]; // jump frame placeholder
        } else {
            spriteName = player.walkFrames[player.currentFrame]; // walk frame
        }
        // ---

        player.isDashing = true;
        player.dashCooldownTimer = player.dashCooldown; // Start cooldown
        player.canDash = false; // Keep this for potential future use (e.g., limiting total dashes)
        player.dashTimer = player.dashDuration;
        player.velocityX = (player.facingRight ? 1 : -1) * player.dashSpeed;
        player.velocityY = 0;
        console.log("DASH!");
        // dashSound.play().catch(e => console.error("Error playing dash sound:", e)); // Remove old play
        const randomDashSound = dashSounds[Math.floor(Math.random() * dashSounds.length)]; // Select random dash sound
        randomDashSound.play().catch(e => console.error("Error playing dash sound:", e)); // Play random dash sound


        // --- Create Afterimages ---
        const dashDistance = player.velocityX * player.dashDuration; // Approx distance covered
        const midX = startX + dashDistance / 2;
        const afterImageLifetimeStart = 250; // ms
        const afterImageLifetimeMid = 450; // ms

        // Add starting position afterimage
        afterImages.push({
            x: startX,
            y: startY,
            spriteName: spriteName,
            facingRight: startFacingRight,
            initialLife: afterImageLifetimeStart,
            life: afterImageLifetimeStart,
            type: 'start',
            opacity: 0 // Will be calculated in updateAfterImages
        });

        // Add midpoint position afterimage
        afterImages.push({
            x: midX,
            y: startY,
            spriteName: spriteName,
            facingRight: startFacingRight,
            initialLife: afterImageLifetimeMid, // lasts longer
            life: afterImageLifetimeMid,
            type: 'mid',
            opacity: 0 // Will be calculated in updateAfterImages
        });
        // ---

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
        // Draw layers, inserting clouds at the correct depth based on parallax
        const cloudParallaxFactor = 0.25;
        let cloudsDrawn = false;
        backgroundLayers.forEach(layer => {
            // Draw layers behind the clouds
            if (layer.parallaxFactor <= cloudParallaxFactor) {
                drawBackgroundLayer(layer, backgroundScaleFactor);
            }
            // Draw clouds after the layer with parallax <= cloud parallax
            if (!cloudsDrawn && layer.parallaxFactor >= cloudParallaxFactor) {
                 drawClouds();
                 cloudsDrawn = true;
            }
            // Draw layers in front of the clouds
            if (layer.parallaxFactor > cloudParallaxFactor) {
                drawBackgroundLayer(layer, backgroundScaleFactor);
            }
        });
        // Ensure clouds are drawn if they are behind all layers
        if (!cloudsDrawn) {
            drawClouds();
        }
    }

    // --- Draw Clouds (after static background, before camera translate) ---
    // drawClouds(); // Call moved into the layer drawing loop above
    
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

        // Draw Kishmishes
        drawKishmishes();

        drawPoofs(); // Draw poofs (before player/afterimages)

        drawAfterImages(); // <<< --- ADD THIS CALL (Draw echoes before main player)

        // Draw Player (using world coordinates)
        drawPlayer(); // drawPlayer already uses player.x, player.y

    }
    // --- End drawing world elements --- 
    ctx.restore(); // Restore context to pre-translate state

    // --- Draw UI elements (fixed position on screen) --- 
    if (paused) {
        // Draw pause overlay (fixed on screen)
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        // ctx.fillStyle = 'white';
        // ctx.font = '48px sans-serif';
        // ctx.textAlign = 'center';
        // ctx.fillText('Paused', canvas.width / 2, canvas.height / 2 - 50); // Commented out as requested
    }

    // Draw Score (fixed on screen)
    drawScore(); 
}

// --- Draw Kishmishes ---
function drawKishmishes() {
    if (Object.keys(kishmishSprites).length === 0) return; // Don't draw if sprites not loaded

    kishmishes.forEach(kishmish => {
        if (kishmish.isDead) return; // Don't draw dead ones

        let sprite;
        if (kishmish.state === 'sitting') {
            sprite = kishmishSprites['kishmish_sit1'];
        } else { // Walking
            const frameName = `kishmish_walk${kishmish.walkFrame + 1}`;
            sprite = kishmishSprites[frameName];
        }

        if (sprite) {
            ctx.save();
            // Flip sprite if moving left (velocityX < 0)
            // Also check if not sitting, only flip when walking left
            if (kishmish.velocityX < 0 && kishmish.state === 'walking') {
                ctx.translate(kishmish.x + kishmish.width, kishmish.y);
                ctx.scale(-1, 1);
                ctx.drawImage(sprite, 0, 0, kishmish.width, kishmish.height);
            } else {
                 // Draw normally if sitting or walking right
                ctx.drawImage(sprite, kishmish.x, kishmish.y, kishmish.width, kishmish.height);
            }
            ctx.restore();
        } else {
            // Fallback drawing
            ctx.fillStyle = 'red';
            ctx.fillRect(kishmish.x, kishmish.y, kishmish.width, kishmish.height);
            console.warn(`Kishmish sprite missing for state: ${kishmish.state}, frame: ${kishmish.walkFrame}`);
        }
    });
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
    // const allSfx = [...jumpSounds, ...scoreSounds, dashSound]; // Remove old sfx array
    const allSfx = [...jumpSounds, ...scoreSounds, ...dashSounds, kishmishDeathSound]; // Add kishmish sound to unlock list
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
        initializeClouds(); // RESTORED
        initializeKishmishes(); // Initialize kishmishes after sprites are loaded
        console.log("Sprites loaded, starting game loop with initial camera position:", camera.x);
        // Reset and set initial focus for start menu (just in case)
        startMenuFocusIndex = 0;
        updateMenuFocus(startMenuItems, startMenuFocusIndex, -1, focusedElementClass);
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
    // alert(message); // Remove alert
    // goToMainMenu(); // Remove direct call

    // Show the Game Over screen
    canvas.style.display = 'none'; // Hide the game canvas
    gameOverMessageElement.textContent = message; // Set the message
    gameOverScreen.style.display = 'block'; // Show the screen
    gameOverScreen.classList.add('menu'); // Ensure menu styles are applied

    // --- ADDED: Focus management for Game Over screen (optional but good) ---
    // For simplicity, we'll just ensure the button is focusable, no explicit focus needed
    // If you add more buttons later, implement focus logic like the other menus.

    // Create poof effect at player location
    createPoofEffect(player.x + player.width / 2, player.y + player.height / 2);

    // Manually draw one last frame to show the poof starting
    // We need to ensure the poof is drawn *before* hiding the canvas
    // So, call draw() manually, then proceed to hide canvas/show menu.
    // Note: This might cause a slight flicker, but ensures the poof appears.
    draw(); 

    // Now hide canvas and show menu
    canvas.style.display = 'none'; // Hide the game canvas
    gameOverScreen.style.display = 'block'; // Show the screen
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
    player.canDashInAir = true; // Reset air dash capability

    score = 0;

    collectibles.forEach(item => item.collected = false);
    initializeKishmishes(); // Re-initialize kishmishes on reset

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
    gameOverScreen.style.display = 'none'; // Hide game over screen
    startMenu.style.display = 'block';

    // Reset focus when returning to main menu
    const oldPauseFocus = pauseMenuFocusIndex;
    pauseMenuFocusIndex = 0;
    updateMenuFocus(pauseMenuItems, -1, oldPauseFocus, focusedElementClass); // Clear pause menu focus

    const oldStartFocus = startMenuFocusIndex; // Might have been something else
    startMenuFocusIndex = 0;
    updateMenuFocus(startMenuItems, startMenuFocusIndex, oldStartFocus, focusedElementClass); // Set focus on first start menu item

    resetGameState();
}

function togglePause() {
    paused = !paused;
    if (paused) {
        pauseMenu.style.display = 'block';
        updateTouchControlVisibility(false); // Hide controls when paused
        // Set initial focus for pause menu
        const oldFocus = pauseMenuFocusIndex; // Might have changed if menu was opened before
        pauseMenuFocusIndex = 0;
        updateMenuFocus(pauseMenuItems, pauseMenuFocusIndex, oldFocus, focusedElementClass);
    } else {
        pauseMenu.style.display = 'none';
        updateTouchControlVisibility(true); // Show controls when resumed
        // Clear focus when resuming
        const oldFocus = pauseMenuFocusIndex;
        pauseMenuFocusIndex = 0;
        updateMenuFocus(pauseMenuItems, -1, oldFocus, focusedElementClass);
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
    // Reset and set initial focus for start menu
    const oldSettingsFocus = settingsMenuFocusIndex;
    settingsMenuFocusIndex = 0; // Reset settings menu index
    updateMenuFocus(settingsMenuItems, -1, oldSettingsFocus, focusedElementClass); // Clear settings menu focus

    const oldStartFocus = startMenuFocusIndex; // Might have changed
    startMenuFocusIndex = 0;
    updateMenuFocus(startMenuItems, startMenuFocusIndex, oldStartFocus, focusedElementClass); // Set focus on first start menu item
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

// Add listener for the new game over main menu button
gameOverMainMenuButton.addEventListener('click', goToMainMenu);

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

// Set initial focus on the start menu's first item
updateMenuFocus(startMenuItems, startMenuFocusIndex, -1, focusedElementClass);

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

// RESTORED and Modified Cloud Function
function drawClouds() {
     if (clouds.length === 0) return;

    const cloudParallaxFactor = 0.25; // Define parallax factor for clouds
    const cloudSpecificScaleFactor = 0.5; // Make clouds smaller

    // Clouds are drawn relative to the canvas (0,0), but their X position
    // is adjusted by the camera movement multiplied by the parallax factor.
    clouds.forEach(cloud => {
        const img = cloud.image;
        const scaledWidth = cloud.originalWidth * cloudSpecificScaleFactor;
        const scaledHeight = img.naturalHeight * cloudSpecificScaleFactor;
        
        // Calculate the apparent screen X position based on cloud's world X and camera parallax
        const screenX = cloud.x - camera.x * cloudParallaxFactor;
        
        // Draw the cloud at its calculated screen position
        ctx.drawImage(img, screenX, cloud.y, scaledWidth, scaledHeight);
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

// Function to initialize Kishmish enemies
function initializeKishmishes() {
    kishmishes = []; // Clear existing kishmishes

    // Define properties for Kishmish
    const kishmishScaleFactor = 1.5;
    const kishmishWidth = player.width * kishmishScaleFactor;
    const kishmishHeight = player.height * kishmishScaleFactor;
    const kishmishSpeed = 1.5; // Increased speed (was 0.5)

    // Place two kishmishes on the ground platform
    // Make sure their y position accounts for their new height
    const groundY = canvas.height - 60; // Ground level y-coordinate
    kishmishes.push(createKishmish(600, groundY - kishmishHeight, kishmishWidth, kishmishHeight, kishmishSpeed));
    kishmishes.push(createKishmish(1200, groundY - kishmishHeight, kishmishWidth, kishmishHeight, kishmishSpeed));

    console.log("Initialized kishmishes:", kishmishes.length);
}

// Helper function to create a single Kishmish object
function createKishmish(x, y, width, height, speed) {
    return {
        x: x,
        y: y,
        width: width,
        height: height,
        speed: speed,
        velocityX: speed * (Math.random() < 0.5 ? 1 : -1), // Start moving randomly
        state: 'walking', // 'walking', 'sitting', 'dead' (future)
        sitTimer: 0, // Countdown timer for sitting duration
        walkTimer: Math.random() * 200 + 100, // Countdown timer for walking duration (frames)
        sitChance: 0.005, // Lowered chance to sit (was 0.01)
        walkFrame: 0, // Current walk frame (0 or 1 for kishmish_walk1/2)
        walkFrameTimer: 0,
        walkFrameDelay: 20, // RE-ADD: How many frames each walk sprite lasts
        isDead: false
    };
}

// --- Update Kishmish Logic ---
function updateKishmishes(deltaTime) {
    const groundY = canvas.height - 60; // Assuming ground level from platform[0]

    kishmishes.forEach((kishmish, index) => {
        if (kishmish.isDead) {
            // Optional: Add a death animation timer here before removing
            // For now, we'll remove immediately (or handle in collision)
            return; // Skip dead kishmishes
        }

        // --- State Machine ---
        if (kishmish.state === 'walking') {
            kishmish.walkTimer -= 1; // Using frames for timer for simplicity

            // Move
            kishmish.x += kishmish.velocityX;

            // Boundary check
            if (kishmish.x <= 0 || kishmish.x + kishmish.width >= levelWidth) {
                kishmish.velocityX *= -1; // Reverse direction
                kishmish.x = Math.max(0, Math.min(kishmish.x, levelWidth - kishmish.width)); // Clamp position
            }

            // Animation
            kishmish.walkFrameTimer++;
            if (kishmish.walkFrameTimer >= kishmish.walkFrameDelay) {
                kishmish.walkFrameTimer = 0;
                kishmish.walkFrame = (kishmish.walkFrame + 1) % 2; // Toggle between frame 0 and 1
            }

            // Chance to sit
            if (Math.random() < kishmish.sitChance) {
                kishmish.state = 'sitting';
                kishmish.velocityX = 0; // Stop moving
                kishmish.sitTimer = Math.random() * 120 + 60; // Sit for 1-3 seconds (approx at 60fps)
                console.log(`Kishmish ${index} starts sitting.`);
            }
            // If walk timer runs out, turn around
            else if (kishmish.walkTimer <= 0) {
                kishmish.velocityX *= -1;
                kishmish.walkTimer = Math.random() * 200 + 100; // Reset walk timer
                console.log(`Kishmish ${index} turns around.`);
            }

        } else if (kishmish.state === 'sitting') {
            kishmish.sitTimer -= 1;
            if (kishmish.sitTimer <= 0) {
                kishmish.state = 'walking';
                kishmish.velocityX = kishmish.speed * (Math.random() < 0.5 ? 1 : -1); // Start walking random direction
                kishmish.walkTimer = Math.random() * 200 + 100; // Reset walk timer
                kishmish.walkFrameTimer = 0; // Reset animation timer
                console.log(`Kishmish ${index} starts walking.`);
            }
        }

        // Basic Gravity (ensure they stay on ground - simple version)
        // In a more complex game, you'd check platform collisions
        kishmish.y = groundY - kishmish.height;

    });

     // Filter out dead kishmishes (can be done here or where they die)
     kishmishes = kishmishes.filter(k => !k.isDead); // Filter dead ones *after* the loop
}

// --- Player/Enemy Collision Check ---
function checkPlayerEnemyCollisions() {
    if (!gameRunning || paused) return; // Don't check if game isn't active

    for (let i = kishmishes.length - 1; i >= 0; i--) {
        const kishmish = kishmishes[i];
        if (kishmish.isDead) continue; // Skip already dead ones

        // --- Reduced Hitbox Calculation ---
        const hitboxPadding = kishmish.width * 0.15; // Reduce hitbox by 15% on each side (adjust as needed)
        const kishmishHitboxX = kishmish.x + hitboxPadding;
        const kishmishHitboxY = kishmish.y + hitboxPadding;
        const kishmishHitboxWidth = kishmish.width - 2 * hitboxPadding;
        const kishmishHitboxHeight = kishmish.height - 2 * hitboxPadding;

        // Simple Axis-Aligned Bounding Box (AABB) collision check (using reduced hitbox)
        if (
            player.x < kishmishHitboxX + kishmishHitboxWidth &&
            player.x + player.width > kishmishHitboxX &&
            player.y < kishmishHitboxY + kishmishHitboxHeight &&
            player.y + player.height > kishmishHitboxY
        ) {
            // Collision detected!

            // Check 1: Player jumps ON TOP of kishmish (using reduced hitbox Y)
            // Player must be falling (positive velocityY)
            // Player's bottom edge must have been ABOVE kishmish's (reduced) top edge in the previous frame
            const playerPreviousBottom = player.y + player.height - (player.velocityY || 0); // Adjust for potential 0 velocity
            if (player.velocityY >= 0 && playerPreviousBottom <= kishmishHitboxY + 1) { // Added tolerance (+1)
                console.log("Player jumped on Kishmish!");
                // Create poof effect at kishmish visual center
                createPoofEffect(kishmish.x + kishmish.width / 2, kishmish.y + kishmish.height / 2);
                kishmish.isDead = true;
                kishmishDeathSound.play().catch(e => console.error("Error playing kishmish death sound:", e)); // Play death sound
                player.velocityY = -player.jumpStrength * 0.6; // Give player a small bounce
                player.isJumping = true; // Treat it like a jump action
                player.isOnGround = false; // No longer on ground after bounce
                player.canDashInAir = true; // Allow air dash after bouncing
                // Optional: Add score, play sound
                // score += 50; 
                // someKillSound.play();
                continue; // Kishmish is dead, move to next enemy check
            }

            // Check 2: Player DASHES INTO kishmish (check against reduced hitbox)
            if (player.isDashing) {
                console.log("Player dashed into Kishmish!");
                 // Create poof effect at kishmish visual center
                createPoofEffect(kishmish.x + kishmish.width / 2, kishmish.y + kishmish.height / 2);
                kishmish.isDead = true;
                kishmishDeathSound.play().catch(e => console.error("Error playing kishmish death sound:", e)); // Play death sound
                // Optional: Add score, play sound, maybe a visual effect?
                // score += 30;
                // someDashKillSound.play(); // Keep this comment? Maybe remove if kishmish sound covers it.
                continue; // Kishmish is dead, move to next enemy check
            }

            // Check 3: Player is hurt (collided but didn't jump on or dash)
            console.log("Player hit by Kishmish!");
            gameOver("Kishmish caught Jiji!");
            return; // Game over, no need to check further collisions
        }
    }
}

// Helper function to create a poof effect instance
function createPoofEffect(x, y) {
    if (poofSprites.length > 0) {
        activePoofs.push({
            x: x - (player.width * 0.8) / 2, // Center the poof approx based on player size
            y: y - (player.height * 0.8) / 2,
            sequenceIndex: 0, // Start at first step in the sequence
            timer: 0,
            width: player.width * 0.8, // Slightly smaller than player (consistent size)
            height: player.height * 0.8 
        });
    }
}

// --- ADDED: Update Afterimages ---
function updateAfterImages(deltaTime) {
    for (let i = afterImages.length - 1; i >= 0; i--) {
        const img = afterImages[i];
        img.life -= deltaTime;

        // Calculate opacity based on remaining life
        // Start fades faster than mid
        const fadeDuration = img.type === 'start' ? img.initialLife : img.initialLife * 0.8; // Mid point starts fading later
        const timePassed = img.initialLife - img.life;
        const initialOpacity = img.type === 'start' ? 0.6 : 0.55; // INCREASED OPACITY (was 0.4 : 0.35)

        if (img.type === 'start' || timePassed > img.initialLife * 0.2) { // Mid waits a bit before starting fade
             img.opacity = Math.max(0, initialOpacity * (1 - (timePassed / fadeDuration)));
        } else {
            img.opacity = initialOpacity; // Mid holds initial opacity for a bit
        }

        // Remove if life is over
        if (img.life <= 0) {
            afterImages.splice(i, 1);
        }
    }
}
// ---

// --- ADDED: Draw Afterimages ---
function drawAfterImages() {
    if (afterImages.length === 0) return;

    afterImages.forEach(img => {
        const sprite = player.sprites[img.spriteName];
        if (sprite && img.opacity > 0) {
            ctx.save(); // Save context before applying effects

            // Apply transparency and desaturation
            ctx.globalAlpha = img.opacity;
            ctx.filter = 'saturate(20%) brightness(1.1)'; // Desaturate and slightly brighten

            // Handle flipping based on stored facing direction
            if (!img.facingRight) {
                // Flip the sprite horizontally
                ctx.translate(img.x + player.width, img.y); // Use player width for consistency
                ctx.scale(-1, 1);
                ctx.drawImage(sprite, 0, 0, player.width, player.height);
            } else {
                // Draw normally at the afterimage's world coordinates
                ctx.drawImage(sprite, img.x, img.y, player.width, player.height);
            }

            ctx.restore(); // Restore context (resets alpha and filter)
        }
    });
     // Ensure filter/alpha are reset if loop didn't run or last image was invisible
     // (ctx.restore() handles this)
     ctx.globalAlpha = 1.0;
     ctx.filter = 'none';
}
// --- 