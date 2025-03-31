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
const touchControlsContainer = document.getElementById('touch-controls'); // Get the container

let gameRunning = false;
let paused = false;
let animationFrameId = null;

// --- Audio Setup ---
let musicVolume = 0.5;
let sfxVolume = 0.5;

let backgroundMusic = new Audio('music/background_music.mp3');
backgroundMusic.loop = true;
backgroundMusic.volume = musicVolume;

// Sound Effects - Apply initial volume
const jumpSounds = [new Audio('music/jump1.ogg'), new Audio('music/jump2.ogg')];
const scoreSounds = [new Audio('music/score1.ogg'), new Audio('music/score2.ogg')];
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
canvas.width = 800; // The width of the viewport/window
canvas.height = 600;

// Camera setup
const camera = {
    x: 0,
    y: 0 // Keep y=0 for horizontal scrolling only for now
};

// Player setup
const player = {
    x: 50,
    y: canvas.height - 100, // Start near the bottom
    width: 50, // Adjust based on sprite size
    height: 50, // Adjust based on sprite size
    speed: 4,
    velocityX: 0,
    velocityY: 0,
    gravity: 0.5,
    jumpStrength: 12,
    isJumping: false,
    isOnGround: true,
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
let backgroundSprite = null; // Add variable for background sprite

// Platform setup (example platforms)
const platforms = [
    { x: 0, y: canvas.height - 40, width: levelWidth, height: 40 }, // Ground spans the level width
    { x: 200, y: canvas.height - 150, width: 150, height: 20 },
    { x: 450, y: canvas.height - 250, width: 100, height: 20 },
    // Add more platforms, potentially beyond the initial canvas.width
    { x: 1800, y: canvas.height - 100, width: 200, height: 20 },
    { x: 2200, y: canvas.height - 200, width: 150, height: 20 },
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
    { x: 250, y: canvas.height - 180, type: 'shell', spriteIndex: 1, collected: false, width: 40, height: 40 },
    { x: 500, y: canvas.height - 280, type: 'fish', spriteIndex: 1, collected: false, width: 40, height: 40 },
    // Add more collectibles using different sprites
    { x: 100, y: canvas.height - 80, type: 'shell', spriteIndex: 2, collected: false, width: 40, height: 40 },
    { x: 350, y: canvas.height - 80, type: 'shell', spriteIndex: 3, collected: false, width: 40, height: 40 },
    { x: 600, y: canvas.height - 150, type: 'fish', spriteIndex: 2, collected: false, width: 40, height: 40 },
    { x: 700, y: canvas.height - 100, type: 'fish', spriteIndex: 3, collected: false, width: 40, height: 40 },

];

let score = 0;

// Input handling
const keys = {
    ArrowLeft: false,
    ArrowRight: false,
    KeyA: false,
    KeyD: false,
    Space: false,
    Escape: false
};

window.addEventListener('keydown', (e) => {
    if (keys.hasOwnProperty(e.code)) {
        keys[e.code] = true;
        if (e.code === 'Escape' && gameRunning) {
            togglePause();
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
        }, { passive: false });

        touchJumpButton.addEventListener('touchend', (e) => {
            e.preventDefault();
            keys.Space = false;
        });
    }
}

// --- Helper function to show/hide touch controls ---
function updateTouchControlVisibility(show) {
    if (touchControlsContainer) {
        touchControlsContainer.style.display = show ? 'block' : 'none';
    }
}

// Load player and collectible sprites
function loadSprites() {
    return new Promise((resolve) => {
        const playerSpriteNames = ['walk1', 'walk2', 'walk3', 'sit1', 'sit2']; // Add sit1, sit2
        const collectibleSpriteNames = ['shell1', 'shell2', 'shell3', 'fish1', 'fish2', 'fish3'];
        const otherSpriteNames = ['background']; // Add background sprite name
        const allSpriteNames = [...playerSpriteNames, ...collectibleSpriteNames, ...otherSpriteNames]; // Combine all
        let loadedCount = 0;
        const totalSprites = allSpriteNames.length;

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
                } else if (name === 'background') { // Handle background loading
                    backgroundSprite = img;
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

function update() {
    if (!gameRunning || paused) return;

    handleInput();

    // Player physics
    player.velocityY += player.gravity;
    player.x += player.velocityX;
    player.y += player.velocityY;

    player.isOnGround = false;

    // Platform collision
    platforms.forEach(platform => {
        if (
            player.x < platform.x + platform.width &&
            player.x + player.width > platform.x &&
            player.y < platform.y + platform.height &&
            player.y + player.height > platform.y
        ) {
            // Check collision only if falling downwards
            if (player.velocityY > 0 && player.y + player.height - player.velocityY <= platform.y) {
                player.y = platform.y - player.height;
                player.velocityY = 0;
                player.isJumping = false;
                player.isOnGround = true;
            }
            // Add logic for hitting platform from below or sides if needed
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

    // Water collision check (using world coordinates)
    if (
        player.x < water.x + water.width &&
        player.x + player.width > water.x &&
        player.y + player.height > water.y
    ) {
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

    updateAnimation();
}

function handleInput() {
    player.velocityX = 0;
    if (keys.ArrowLeft || keys.KeyA) {
        player.velocityX = -player.speed;
        player.facingRight = false;
    }
    if (keys.ArrowRight || keys.KeyD) {
        player.velocityX = player.speed;
        player.facingRight = true;
    }

    if (keys.Space && !player.isJumping && player.isOnGround) {
        player.velocityY = -player.jumpStrength;
        player.isJumping = true;
        player.isOnGround = false;
        const randomJumpSound = jumpSounds[Math.floor(Math.random() * jumpSounds.length)];
        randomJumpSound.play().catch(e => console.error("Error playing jump sound:", e));
    }
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

    // --- Draw background (scrolling with camera) ---
    ctx.save(); // Save the current state (before camera translation)
    ctx.translate(-camera.x, -camera.y); // Apply camera offset

    // Draw repeating background
    if (backgroundSprite) {
        const originalWidth = backgroundSprite.naturalWidth;
        const originalHeight = backgroundSprite.naturalHeight;

        if (originalHeight > 0) { // Avoid division by zero if sprite is not loaded properly
            const scaledHeight = canvas.height;
            const scaleFactor = scaledHeight / originalHeight;
            const scaledWidth = originalWidth * scaleFactor;

            if (scaledWidth > 0) { // Avoid infinite loop if width is zero
                // Calculate the starting X position for drawing the first background image
                // Ensures seamless tiling based on camera position
                const startX = Math.floor(camera.x / scaledWidth) * scaledWidth;

                // Draw the background images needed to cover the viewport
                // The viewport spans from camera.x to camera.x + canvas.width
                for (let x = startX; x < camera.x + canvas.width; x += scaledWidth) {
                    ctx.drawImage(backgroundSprite, x, 0, scaledWidth, scaledHeight);
                }
            } else {
                 // Fallback: Draw a solid color if scaled width is invalid
                 ctx.fillStyle = '#87CEEB';
                 ctx.fillRect(camera.x, 0, canvas.width, canvas.height); // Fill the viewport area relative to camera
            }
        } else {
            // Fallback: Draw a solid color if original height is invalid
            ctx.fillStyle = '#87CEEB';
            ctx.fillRect(camera.x, 0, canvas.width, canvas.height); // Fill the viewport area relative to camera
        }

    } else {
        // Fallback if background sprite isn't loaded yet or failed
        ctx.fillStyle = '#87CEEB'; // Light sky blue
        // Fill the viewport area relative to camera
        ctx.fillRect(camera.x, 0, canvas.width, canvas.height);
    }


    // --- Draw elements that scroll with the camera --- 
    // (Platforms, Water, Collectibles, Player drawn AFTER background)
    // Remove the old static background drawing:
    // ctx.fillStyle = '#87CEEB'; // Light sky blue
    // ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Example: Draw distant background elements (optional parallax effect here later)
    // ctx.fillStyle = '#some_distant_color';
    // ctx.fillRect(0, 0, levelWidth, canvas.height); // Draw a background that spans the level

    if (!paused) {
        // Draw Platforms (using world coordinates)
        ctx.fillStyle = '#A0522D'; // Brown for platforms
        platforms.forEach(platform => {
            ctx.fillRect(platform.x, platform.y, platform.width, platform.height);
        });

        // Draw Water (using world coordinates)
        ctx.fillStyle = '#1E90FF'; // Blue for water
        ctx.fillRect(water.x, water.y, water.width, water.height);

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

    backgroundMusic.currentTime = 0;
    backgroundMusic.play().catch(e => console.error("Error playing background music:", e));

    if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
    }
    loadSprites().then(() => {
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
    player.y = canvas.height - 100;
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

function drawScore() {
    // Draw score relative to the canvas, not the world
    ctx.fillStyle = 'black';
    ctx.font = '20px "Fredoka One", cursive';
    ctx.textAlign = 'left';
    ctx.fillText('Score: ' + score, 20, 30); // Use fixed screen coordinates (top-left)
} 