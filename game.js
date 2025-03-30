// Game setup
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const startMenu = document.getElementById('start-menu');
const startButton = document.getElementById('start-button');

let gameRunning = false;
let backgroundMusic = new Audio('music/background_music.mp3');
backgroundMusic.loop = true;

// Sound Effects
const jumpSounds = [new Audio('music/jump1.ogg'), new Audio('music/jump2.ogg')];
const scoreSounds = [new Audio('music/score1.ogg'), new Audio('music/score2.ogg')];

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
    { x: 250, y: canvas.height - 180, type: 'shell', collected: false, width: 20, height: 20 },
    { x: 500, y: canvas.height - 280, type: 'fish', collected: false, width: 25, height: 15 }
];

let score = 0;

// Input handling
const keys = {
    ArrowLeft: false,
    ArrowRight: false,
    KeyA: false,
    KeyD: false,
    Space: false
};

window.addEventListener('keydown', (e) => {
    if (keys.hasOwnProperty(e.code)) {
        keys[e.code] = true;
    }
});

window.addEventListener('keyup', (e) => {
    if (keys.hasOwnProperty(e.code)) {
        keys[e.code] = false;
    }
});

// Load player sprites
function loadSprites() {
    return new Promise((resolve) => {
        const spriteNames = ['walk1', 'walk2', 'walk3'];
        let loadedCount = 0;

        spriteNames.forEach(name => {
            const img = new Image();
            img.src = `sprites/${name}.png`;
            img.onload = () => {
                player.sprites[name] = img;
                loadedCount++;
                if (loadedCount === spriteNames.length) {
                    resolve();
                }
            };
            img.onerror = () => {
                console.error(`Failed to load sprite: ${name}.png`);
                // Handle error - maybe use fallback shapes
                loadedCount++;
                 if (loadedCount === spriteNames.length) {
                    resolve(); // Still resolve so game can potentially start
                }
            };
        });
    });
}

// --- Game Logic Functions --- (will be filled in next)

function update() {
    if (!gameRunning) return;
    // Player movement
    handleInput();

    // Apply physics
    player.velocityY += player.gravity;
    player.x += player.velocityX;
    player.y += player.velocityY;

    player.isOnGround = false; // Assume not on ground until collision check

    // Collision detection (Platforms)
    platforms.forEach(platform => {
        if (
            player.x < platform.x + platform.width &&
            player.x + player.width > platform.x &&
            player.y < platform.y + platform.height &&
            player.y + player.height > platform.y
        ) {
            // Check for vertical collision (landing on top)
            if (player.velocityY > 0 && player.y + player.height - player.velocityY <= platform.y) {
                player.y = platform.y - player.height;
                player.velocityY = 0;
                player.isJumping = false;
                player.isOnGround = true;
            } 
            // Add collision checks for sides and bottom if needed
            // else if (collision from sides or bottom)
        }
    });

    // Keep player within canvas bounds (horizontal)
    if (player.x < 0) {
        player.x = 0;
    }
    if (player.x + player.width > canvas.width) {
        player.x = canvas.width - player.width;
    }

    // Check water collision
    if (
        player.x < water.x + water.width &&
        player.x + player.width > water.x &&
        player.y + player.height > water.y // Only need to check if bottom hits water
    ) {
        gameOver("Jiji got wet! Game over!");
    }

    // Check collectible collision
    collectibles.forEach((item, index) => {
        if (!item.collected &&
            player.x < item.x + item.width &&
            player.x + player.width > item.x &&
            player.y < item.y + item.height &&
            player.y + player.height > item.y
        ) {
            item.collected = true;
            score += (item.type === 'shell' ? 10 : 20); // Example scoring
            // Play a random score sound
            const randomScoreSound = scoreSounds[Math.floor(Math.random() * scoreSounds.length)];
            randomScoreSound.play().catch(e => console.error("Error playing score sound:", e)); // Added catch for potential errors
        }
    });

    // Update player animation frame
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

    // Jumping
    if (keys.Space && !player.isJumping && player.isOnGround) {
        player.velocityY = -player.jumpStrength;
        player.isJumping = true;
        player.isOnGround = false;
        // Play a random jump sound
        const randomJumpSound = jumpSounds[Math.floor(Math.random() * jumpSounds.length)];
        randomJumpSound.play().catch(e => console.error("Error playing jump sound:", e)); // Added catch for potential errors
    }
}

function updateAnimation() {
    if (player.velocityX !== 0 && player.isOnGround) { // Walking animation
        player.frameCount++;
        if (player.frameCount >= player.frameDelay) {
            player.frameCount = 0;
            player.currentFrame = (player.currentFrame + 1) % player.walkFrames.length;
        }
    } else if (!player.isOnGround) { // Jumping/Falling animation
        // Use walk2.png for air time
        player.currentFrame = 1; // Index of 'walk2' in walkFrames
    } else { // Idle animation (optional - could use sit1/sit2 later)
        // For now, just use the first frame when idle
         player.currentFrame = 0; // Or maybe a specific idle frame index if added
         player.frameCount = 0;
    }
}


function draw() {
    if (!gameRunning) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw background (replace with image later if desired)
    ctx.fillStyle = '#87CEEB'; // Sky blue
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw platforms
    ctx.fillStyle = '#A0522D'; // Brown
    platforms.forEach(platform => {
        ctx.fillRect(platform.x, platform.y, platform.width, platform.height);
    });

    // Draw water
    ctx.fillStyle = '#1E90FF'; // Dodger blue
    ctx.fillRect(water.x, water.y, water.width, water.height);

    // Draw player
    drawPlayer();

    // Draw collectibles
    collectibles.forEach(item => {
        if (!item.collected) {
            if (item.type === 'shell') {
                ctx.fillStyle = '#FFF8DC'; // Cornsilk (shell color)
                // Simple shell shape (replace with image later)
                ctx.beginPath();
                ctx.ellipse(item.x + item.width / 2, item.y + item.height / 2, item.width / 2, item.height / 3, 0, 0, 2 * Math.PI);
                ctx.fill();
            } else if (item.type === 'fish') {
                ctx.fillStyle = '#FF6347'; // Tomato (fish color)
                // Simple fish shape (replace with image later)
                ctx.beginPath();
                ctx.ellipse(item.x + item.width / 2, item.y + item.height / 2, item.width / 2, item.height / 2, Math.PI / 4, 0, 2 * Math.PI);
                ctx.fill();
                // Add a simple tail
                ctx.beginPath();
                ctx.moveTo(item.x, item.y + item.height / 2);
                ctx.lineTo(item.x - 10, item.y);
                ctx.lineTo(item.x - 10, item.y + item.height);
                ctx.closePath();
                ctx.fill();
            }
        }
    });

    // Draw score
    ctx.fillStyle = 'black';
    ctx.font = '20px Arial';
    ctx.fillText(`Score: ${score}`, 10, 30);

}

function drawPlayer() {
    const frameName = player.walkFrames[player.currentFrame];
    const sprite = player.sprites[frameName];

    if (sprite) {
        ctx.save(); // Save the current context state
        if (!player.facingRight) {
            // Flip the sprite horizontally if facing left
            ctx.translate(player.x + player.width, player.y);
            ctx.scale(-1, 1);
            ctx.drawImage(sprite, 0, 0, player.width, player.height);
        } else {
            ctx.drawImage(sprite, player.x, player.y, player.width, player.height);
        }
        ctx.restore(); // Restore the context state
    } else {
        // Fallback: Draw a rectangle if sprite not loaded
        ctx.fillStyle = 'purple'; // Jiji's color!
        ctx.fillRect(player.x, player.y, player.width, player.height);
    }
}


function gameLoop() {
    update();
    draw();
    if (gameRunning) {
        requestAnimationFrame(gameLoop);
    }
}

function startGame() {
    // Reset game state
    player.x = 50;
    player.y = canvas.height - 100;
    player.velocityX = 0;
    player.velocityY = 0;
    player.isJumping = false;
    player.isOnGround = true;
    player.currentFrame = 0;
    player.frameCount = 0;
    score = 0;
    collectibles.forEach(item => item.collected = false);

    // Hide start menu, show canvas
    startMenu.style.display = 'none';
    canvas.style.display = 'block';
    gameRunning = true;
    
    // Start music (check if already playing/handle potential errors)
    backgroundMusic.play().catch(e => console.error("Error playing music:", e));

    // Start the game loop
    gameLoop();
}

function gameOver(message) {
    gameRunning = false;
    backgroundMusic.pause();
    backgroundMusic.currentTime = 0; // Reset music
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = 'white';
    ctx.font = '40px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(message, canvas.width / 2, canvas.height / 2 - 30);
    ctx.font = '20px Arial';
    ctx.fillText('Press Start Button to Play Again', canvas.width / 2, canvas.height / 2 + 20);
    ctx.textAlign = 'left'; // Reset text align

    // Show start menu again after a delay (or immediately)
    setTimeout(() => {
       canvas.style.display = 'none';
       startMenu.style.display = 'block'; // Show menu
       // Update button text maybe?
       startButton.textContent = 'Play Again?';
    }, 1500); // Show after 1.5 seconds

}

// Event listener for start button
startButton.addEventListener('click', () => {
    // Ensure sprites are loaded before starting
    loadSprites().then(() => {
        startGame();
    });
});

// Initial setup message (optional)
console.log("Jiji's Island game script loaded. Click Start Game!");
// Draw initial start menu state (redundant due to CSS but safe)
startMenu.style.display = 'block';
canvas.style.display = 'none'; 