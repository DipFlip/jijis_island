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
canvas.width = 800;
canvas.height = 600;

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
    currentFrame: 0,
    walkFrames: ['walk1', 'walk2', 'walk3', 'walk2'], // Loop walk cycle
    frameCount: 0,
    frameDelay: 10, // Controls animation speed (lower is faster)
    facingRight: true
};

// Collectible Sprites
let collectibleSprites = {};

// Platform setup (example platforms)
const platforms = [
    { x: 0, y: canvas.height - 40, width: canvas.width, height: 40 }, // Ground
    { x: 200, y: canvas.height - 150, width: 150, height: 20 },
    { x: 450, y: canvas.height - 250, width: 100, height: 20 }
];

// Water setup
const water = {
    x: 0,
    y: canvas.height - 20,
    width: canvas.width,
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

// Load player and collectible sprites
function loadSprites() {
    return new Promise((resolve) => {
        const playerSpriteNames = ['walk1', 'walk2', 'walk3'];
        const collectibleSpriteNames = ['shell1', 'shell2', 'shell3', 'fish1', 'fish2', 'fish3'];
        const allSpriteNames = [...playerSpriteNames, ...collectibleSpriteNames];
        let loadedCount = 0;
        const totalSprites = allSpriteNames.length;

        allSpriteNames.forEach(name => {
            const img = new Image();
            img.src = `sprites/${name}.png`;
            img.onload = () => {
                if (playerSpriteNames.includes(name)) {
                    player.sprites[name] = img;
                } else {
                    collectibleSprites[name] = img;
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
                    resolve(); // Resolve even if some sprites fail to load, maybe show placeholders
                }
            };
        });
         if (totalSprites === 0) { // Handle case where there are no sprites to load
            resolve();
        }
    });
}

// --- Game Logic Functions ---

function update() {
    if (!gameRunning || paused) return;

    handleInput();

    player.velocityY += player.gravity;
    player.x += player.velocityX;
    player.y += player.velocityY;

    player.isOnGround = false;

    platforms.forEach(platform => {
        if (
            player.x < platform.x + platform.width &&
            player.x + player.width > platform.x &&
            player.y < platform.y + platform.height &&
            player.y + player.height > platform.y
        ) {
            if (player.velocityY > 0 && player.y + player.height - player.velocityY <= platform.y) {
                player.y = platform.y - player.height;
                player.velocityY = 0;
                player.isJumping = false;
                player.isOnGround = true;
            }
        }
    });

    if (player.x < 0) {
        player.x = 0;
    }
    if (player.x + player.width > canvas.width) {
        player.x = canvas.width - player.width;
    }

    if (
        player.x < water.x + water.width &&
        player.x + player.width > water.x &&
        player.y + player.height > water.y
    ) {
        gameOver("Jiji got wet! Game over!");
    }

    collectibles.forEach((item, index) => {
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
    if (player.velocityX !== 0 && player.isOnGround) {
        player.frameCount++;
        if (player.frameCount >= player.frameDelay) {
            player.frameCount = 0;
            player.currentFrame = (player.currentFrame + 1) % player.walkFrames.length;
        }
    } else if (!player.isOnGround) {
        player.currentFrame = 1;
    } else {
        player.currentFrame = 0;
        player.frameCount = 0;
    }
}

function draw() {
    if (!gameRunning && !paused) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = '#87CEEB';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (!paused) {
        ctx.fillStyle = '#A0522D';
        platforms.forEach(platform => {
            ctx.fillRect(platform.x, platform.y, platform.width, platform.height);
        });
        ctx.fillStyle = '#1E90FF';
        ctx.fillRect(water.x, water.y, water.width, water.height);
        drawPlayer();
        collectibles.forEach(item => {
            if (!item.collected) {
                let spriteName = `${item.type}${item.spriteIndex}`;
                let spriteToDraw = collectibleSprites[spriteName];

                if (spriteToDraw) {
                    // Draw the sprite using the width and height defined in the collectible object
                    ctx.drawImage(
                        spriteToDraw,
                        item.x, // Draw at item's x
                        item.y, // Draw at item's y
                        item.width, // Draw using item's defined width
                        item.height // Draw using item's defined height
                    );
                } else {
                    // Fallback drawing if specific sprite (e.g., shell2) failed to load
                    console.warn(`Sprite '${spriteName}.png' not loaded for item type '${item.type}', drawing fallback shape.`);
                    // Draw generic fallback shape based on type
                    if (item.type === 'shell') {
                        ctx.fillStyle = '#FFF8DC'; // Fallback color
                        ctx.beginPath();
                        // Use original item width/height for fallback shape
                        ctx.ellipse(item.x + item.width / 2, item.y + item.height / 2, item.width / 2, item.height / 3, 0, 0, 2 * Math.PI);
                        ctx.fill();
                    } else if (item.type === 'fish') {
                        ctx.fillStyle = '#FF6347'; // Fallback color
                        ctx.beginPath();
                        // Use original item width/height for fallback shape
                        ctx.ellipse(item.x + item.width / 2, item.y + item.height / 2, item.width / 2, item.height / 2, Math.PI / 4, 0, 2 * Math.PI);
                        ctx.fill();
                    }
                }
            }
        });
    } else {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = 'white';
        ctx.font = '48px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('Paused', canvas.width / 2, canvas.height / 2 - 50);
    }
    drawScore();
}

function drawPlayer() {
    const frameName = player.walkFrames[player.currentFrame];
    const sprite = player.sprites[frameName];

    if (sprite) {
        ctx.save();
        if (!player.facingRight) {
            ctx.translate(player.x + player.width, player.y);
            ctx.scale(-1, 1);
            ctx.drawImage(sprite, 0, 0, player.width, player.height);
        } else {
            ctx.drawImage(sprite, player.x, player.y, player.width, player.height);
        }
        ctx.restore();
    } else {
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
    resetGameState();

    gameRunning = true;
    paused = false;
    startMenu.style.display = 'none';
    settingsScreen.style.display = 'none';
    pauseMenu.style.display = 'none';
    canvas.style.display = 'block';
    ingamePauseButton.style.display = 'block';

    backgroundMusic.currentTime = 0;
    backgroundMusic.play().catch(e => console.error("Error playing background music:", e));

    if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
    }
    loadSprites().then(() => {
        animationFrameId = requestAnimationFrame(gameLoop);
    });
}

function gameOver(message) {
    gameRunning = false;
    paused = false;
    backgroundMusic.pause();
    ingamePauseButton.style.display = 'none';
    pauseMenu.style.display = 'none';

    if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
    }

    console.log(message);
    alert(message);
    goToMainMenu();
}

function resetGameState() {
    player.x = 50;
    player.y = canvas.height - 100;
    player.velocityX = 0;
    player.velocityY = 0;
    player.isJumping = false;
    player.isOnGround = true;
    player.currentFrame = 0;
    player.frameCount = 0;
    player.facingRight = true;

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
    } else {
        pauseMenu.style.display = 'none';
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

function drawScore() {
    ctx.fillStyle = 'black';
    ctx.font = '20px "Fredoka One", cursive';
    ctx.textAlign = 'left';
    ctx.fillText('Score: ' + score, 20, 30);
} 