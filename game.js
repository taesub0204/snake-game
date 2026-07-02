// Game constants
const CANVAS = document.getElementById('game-canvas');
const CTX = CANVAS.getContext('2d');
const GRID_SIZE = 20; // Size of each cell (20px * 20px)
const GRID_COUNT = CANVAS.width / GRID_SIZE; // 800 / 20 = 40 cells in each row/column

// Game state variables
let snake = [];
let direction = 'right';
let inputQueue = []; // Queues inputs to prevent self-collisions on fast double-taps
let food = { x: 0, y: 0 };
let score = 0;
let highScore = localStorage.getItem('snake_high_score') || 0;
let gameState = 'start'; // 'start', 'playing', 'paused', 'gameover'
let lastTime = 0;
let speedAccumulator = 0;
let baseSpeed = 110; // Time step in ms (lower is faster)
let minSpeed = 55; // Maximum speed limit (minimum time step)
let speedDecrement = 3; // How much speed steps up per food eaten
let speedBoost = false; // Speed booster state (A button toggler)

// DOM Elements
const startOverlay = document.getElementById('start-overlay');
const pauseOverlay = document.getElementById('pause-overlay');
const gameOverOverlay = document.getElementById('game-over-overlay');

const startBtn = document.getElementById('start-btn');
const resumeBtn = document.getElementById('resume-btn');
const retryBtn = document.getElementById('retry-btn');
const noBtn = document.getElementById('no-btn');

const finalScoreEl = document.getElementById('final-score');
const displayScoreEl = document.getElementById('display-score');
const displayHighScoreEl = document.getElementById('display-highscore');

// Initialize displays
updateScoreDisplay();

// Event listeners
window.addEventListener('keydown', handleKeyDown);

startBtn.addEventListener('click', startGame);
resumeBtn.addEventListener('click', resumeGame);
retryBtn.addEventListener('click', startGame);
noBtn.addEventListener('click', showStartScreen);

// Bind D-pad Buttons for touch/click controls
bindDpadBtn('btn-up', 'up');
bindDpadBtn('btn-down', 'down');
bindDpadBtn('btn-left', 'left');
bindDpadBtn('btn-right', 'right');

// Select Button (Pause)
const pBtn = document.getElementById('btn-pause');
const pHandler = (e) => {
    e.preventDefault();
    togglePause();
};
pBtn.addEventListener('touchstart', pHandler, { passive: false });
pBtn.addEventListener('click', pHandler);

// Reset Button
const rBtn = document.getElementById('btn-start-restart');
const rHandler = (e) => {
    e.preventDefault();
    showStartScreen();
};
rBtn.addEventListener('touchstart', rHandler, { passive: false });
rBtn.addEventListener('click', rHandler);

// Action A Button (Speed Boost)
const aBtn = document.getElementById('btn-action-a');
const aHandler = (e) => {
    e.preventDefault();
    speedBoost = !speedBoost;
    aBtn.classList.toggle('active');
};
aBtn.addEventListener('touchstart', aHandler, { passive: false });
aBtn.addEventListener('click', aHandler);

// Action B Button (Pause alternative)
const bBtn = document.getElementById('btn-action-b');
const bHandler = (e) => {
    e.preventDefault();
    togglePause();
};
bBtn.addEventListener('touchstart', bHandler, { passive: false });
bBtn.addEventListener('click', bHandler);

// Helper functions
function updateScoreDisplay() {
    displayScoreEl.textContent = `점수 : ${score}`;
    displayHighScoreEl.textContent = `최고 점수 : ${highScore}`;
}

function bindDpadBtn(id, dir) {
    const btn = document.getElementById(id);
    const handler = (e) => {
        e.preventDefault();
        queueDirection(dir);
    };
    btn.addEventListener('touchstart', handler, { passive: false });
    btn.addEventListener('click', handler);
}

// Initialize or Reset the Game State
function initGame() {
    const centerY = Math.floor(GRID_COUNT / 2);
    // Each segment holds target grid coordinate (x, y) and its previous step's grid coordinate (prevX, prevY)
    snake = [
        { x: 12, y: centerY, prevX: 12, prevY: centerY },
        { x: 11, y: centerY, prevX: 11, prevY: centerY },
        { x: 10, y: centerY, prevX: 10, prevY: centerY }
    ];
    direction = 'right';
    inputQueue = [];
    score = 0;
    speedBoost = false;
    aBtn.classList.remove('active');
    updateScoreDisplay();
    spawnFood();
}

function spawnFood() {
    let valid = false;
    while (!valid) {
        const x = Math.floor(Math.random() * GRID_COUNT);
        const y = Math.floor(Math.random() * GRID_COUNT);
        
        const onSnake = snake.some(segment => segment.x === x && segment.y === y);
        if (!onSnake) {
            food = { x, y };
            valid = true;
        }
    }
}

function startGame() {
    initGame();
    gameState = 'playing';
    startOverlay.classList.add('hidden');
    gameOverOverlay.classList.add('hidden');
    pauseOverlay.classList.add('hidden');
    
    lastTime = performance.now();
    speedAccumulator = 0;
    requestAnimationFrame(gameLoop);
}

function pauseGame() {
    if (gameState !== 'playing') return;
    gameState = 'paused';
    pauseOverlay.classList.remove('hidden');
}

function resumeGame() {
    if (gameState !== 'paused') return;
    gameState = 'playing';
    pauseOverlay.classList.add('hidden');
    
    lastTime = performance.now();
    speedAccumulator = 0;
    requestAnimationFrame(gameLoop);
}

function togglePause() {
    if (gameState === 'playing') {
        pauseGame();
    } else if (gameState === 'paused') {
        resumeGame();
    } else if (gameState === 'start' || gameState === 'gameover') {
        startGame();
    }
}

function showStartScreen() {
    gameState = 'start';
    gameOverOverlay.classList.add('hidden');
    startOverlay.classList.remove('hidden');
    initGame();
    draw();
}

function gameOver() {
    gameState = 'gameover';
    finalScoreEl.textContent = score;
    gameOverOverlay.classList.remove('hidden');
    
    if (score > highScore) {
        highScore = score;
        localStorage.setItem('snake_high_score', highScore);
    }
    updateScoreDisplay();
}

function handleKeyDown(e) {
    const key = e.key;

    // Prevent browser scrolling with arrow keys / space
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(key)) {
        e.preventDefault();
    }

    if (gameState === 'start' && key === 'Enter') {
        startGame();
        return;
    }

    if (gameState === 'gameover' && key === 'Enter') {
        startGame();
        return;
    }

    if (key === ' ') {
        togglePause();
        return;
    }

    // Shift key toggles Speed Boost
    if (key === 'Shift') {
        speedBoost = !speedBoost;
        aBtn.classList.toggle('active');
        return;
    }

    if (gameState !== 'playing') return;

    // Direction key mappings
    let nextDir = null;
    if (key === 'ArrowUp' || key.toLowerCase() === 'w') nextDir = 'up';
    else if (key === 'ArrowDown' || key.toLowerCase() === 's') nextDir = 'down';
    else if (key === 'ArrowLeft' || key.toLowerCase() === 'a') nextDir = 'left';
    else if (key === 'ArrowRight' || key.toLowerCase() === 'd') nextDir = 'right';

    if (nextDir) {
        queueDirection(nextDir);
    }
}

function queueDirection(nextDir) {
    if (gameState !== 'playing') return;
    
    const lastQueued = inputQueue.length > 0 ? inputQueue[inputQueue.length - 1] : direction;
    
    // Block opposite turns
    if (
        (nextDir === 'up' && lastQueued === 'down') ||
        (nextDir === 'down' && lastQueued === 'up') ||
        (nextDir === 'left' && lastQueued === 'right') ||
        (nextDir === 'right' && lastQueued === 'left')
    ) {
        return;
    }
    
    // Prevent duplicate queueing
    if (nextDir === lastQueued) return;
    
    // Limit queue size to 2 to prevent laggy inputs
    if (inputQueue.length < 2) {
        inputQueue.push(nextDir);
    }
}

// Game Core Loop
function gameLoop(timestamp) {
    if (gameState !== 'playing') {
        draw();
        requestAnimationFrame(gameLoop);
        return;
    }

    const elapsed = timestamp - lastTime;
    lastTime = timestamp;
    speedAccumulator += elapsed;

    // Dynamic speed calculation
    let currentSpeed = Math.max(minSpeed, baseSpeed - (score * speedDecrement));
    if (speedBoost) {
        currentSpeed = Math.max(minSpeed / 1.8, currentSpeed / 1.8); // Speed boost divide!
    }

    if (speedAccumulator >= currentSpeed) {
        updateGame();
        speedAccumulator %= currentSpeed;
        if (speedAccumulator > currentSpeed) {
            speedAccumulator = 0;
        }
    }

    draw();
    requestAnimationFrame(gameLoop);
}

function updateGame() {
    if (inputQueue.length > 0) {
        direction = inputQueue.shift();
    }
    
    const head = { x: snake[0].x, y: snake[0].y };
    if (direction === 'up') head.y -= 1;
    else if (direction === 'down') head.y += 1;
    else if (direction === 'left') head.x -= 1;
    else if (direction === 'right') head.x += 1;

    if (head.x < 0 || head.x >= GRID_COUNT || head.y < 0 || head.y >= GRID_COUNT) {
        gameOver();
        return;
    }

    const hitSelf = snake.some((segment, index) => {
        const isTailTip = index === snake.length - 1;
        if (isTailTip) {
            const eatsFood = (head.x === food.x && head.y === food.y);
            return eatsFood && segment.x === head.x && segment.y === head.y;
        }
        return segment.x === head.x && segment.y === head.y;
    });

    if (hitSelf) {
        gameOver();
        return;
    }

    const eatsFood = (head.x === food.x && head.y === food.y);
    const newSnake = [];

    newSnake.push({
        x: head.x,
        y: head.y,
        prevX: snake[0].x,
        prevY: snake[0].y
    });

    for (let i = 1; i < snake.length; i++) {
        newSnake.push({
            x: snake[i - 1].x,
            y: snake[i - 1].y,
            prevX: snake[i].x,
            prevY: snake[i].y
        });
    }

    if (eatsFood) {
        const oldTail = snake[snake.length - 1];
        newSnake.push({
            x: oldTail.x,
            y: oldTail.y,
            prevX: oldTail.x,
            prevY: oldTail.y
        });
        
        score += 10;
        updateScoreDisplay();
        spawnFood();
    }

    snake = newSnake;
}

function draw() {
    // Clear canvas background (deep retro black)
    CTX.fillStyle = '#050505'; 
    CTX.fillRect(0, 0, CANVAS.width, CANVAS.height);

    // Draw faint CRT scan grid line (barely visible for authentic look)
    CTX.strokeStyle = '#0e0e0e';
    CTX.lineWidth = 0.5;
    for (let i = 0; i <= GRID_COUNT; i++) {
        CTX.beginPath();
        CTX.moveTo(i * GRID_SIZE, 0);
        CTX.lineTo(i * GRID_SIZE, CANVAS.height);
        CTX.stroke();

        CTX.beginPath();
        CTX.moveTo(0, i * GRID_SIZE);
        CTX.lineTo(CANVAS.width, i * GRID_SIZE);
        CTX.stroke();
    }

    // Draw food as a glowing "@"
    drawFood();

    // Draw snake with smooth vector interpolation (hollow circles)
    let currentSpeed = Math.max(minSpeed, baseSpeed - (score * speedDecrement));
    if (speedBoost) {
        currentSpeed = Math.max(minSpeed / 1.8, currentSpeed / 1.8);
    }
    
    snake.forEach((segment, index) => {
        let renderX, renderY;
        if (gameState === 'playing' && segment.prevX !== undefined) {
            const progress = Math.min(1, Math.max(0, speedAccumulator / currentSpeed));
            renderX = segment.prevX + (segment.x - segment.prevX) * progress;
            renderY = segment.prevY + (segment.y - segment.prevY) * progress;
        } else {
            renderX = segment.x;
            renderY = segment.y;
        }

        const pxX = renderX * GRID_SIZE;
        const pxY = renderY * GRID_SIZE;

        // Draw hollow circle
        CTX.strokeStyle = '#e0e0e0';
        CTX.lineWidth = 1.8;
        
        // Soft glow around snake circles
        CTX.shadowColor = 'rgba(224, 224, 224, 0.4)';
        CTX.shadowBlur = 4;
        
        const radius = (GRID_SIZE / 2) - 1.5;
        CTX.beginPath();
        CTX.arc(pxX + GRID_SIZE / 2, pxY + GRID_SIZE / 2, radius, 0, Math.PI * 2);
        CTX.stroke();
        
        CTX.shadowBlur = 0; // Reset shadow
    });
}

function drawFood() {
    const foodX = food.x * GRID_SIZE;
    const foodY = food.y * GRID_SIZE;
    const centerX = foodX + GRID_SIZE / 2;
    const centerY = foodY + GRID_SIZE / 2;
    
    // Calculate pulsating values using performance.now()
    const time = performance.now();
    // Radius oscillates smoothly between 5.5px and 9px
    const radius = 7.25 + Math.sin(time / 120) * 1.75;
    // Glow blur oscillates between 10px and 18px
    const glowBlur = 14 + Math.sin(time / 120) * 4;
    
    // Strong white glow (matching the soft border in the image)
    CTX.shadowColor = '#ffffff';
    CTX.shadowBlur = glowBlur;
    
    // Draw solid white circle
    CTX.fillStyle = '#ffffff';
    CTX.beginPath();
    CTX.arc(centerX, centerY, radius, 0, Math.PI * 2);
    CTX.fill();
    
    // Reset shadow
    CTX.shadowBlur = 0;
}

// Initialize game layout and render first static frame
initGame();
draw();
