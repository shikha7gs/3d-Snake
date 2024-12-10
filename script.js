import * as THREE from 'three';

const loader = new THREE.TextureLoader();
const snakeTexture = loader.load('https://raw.githubusercontent.com/shikha7gs/3d-Snake/main/snake.jpeg');
const foodTexture = loader.load('https:threejsfundamentals.org/threejs/resources/images/flower-1.jpg');

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x20232a);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(20, 20, 20);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
document.body.appendChild(renderer.domElement);

const gridHelper = new THREE.GridHelper(30, 30);
scene.add(gridHelper);
const axesHelper = new THREE.AxesHelper(10);
scene.add(axesHelper);

const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
scene.add(ambientLight);
const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
directionalLight.position.set(20, 20, 20);
directionalLight.castShadow = true;
scene.add(directionalLight);

const planeGeometry = new THREE.PlaneGeometry(30, 30);
const planeMaterial = new THREE.MeshPhongMaterial({ color: 0x999999, transparent: true, opacity: 0.2 });
const ground = new THREE.Mesh(planeGeometry, planeMaterial);
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);

const listener = new THREE.AudioListener();
camera.add(listener);

const backgroundSound = new THREE.Audio(listener);
const eatSound = new THREE.Audio(listener);

const audioLoader = new THREE.AudioLoader();

audioLoader.load('https://raw.githubusercontent.com/shikha7gs/3d-Snake/main/bg.ogg', function (buffer) {
    backgroundSound.setBuffer(buffer);
    backgroundSound.setLoop(true);
    backgroundSound.setVolume(0.3);
}, undefined, function (err) {
    console.error('Error loading background sound:', err);
});

audioLoader.load('https://raw.githubusercontent.com/shikha7gs/3d-Snake/main/eat.mp3', function (buffer) {
    eatSound.setBuffer(buffer);
    eatSound.setVolume(0.5);
}, undefined, function (err) {
    console.error('Error loading eat sound:', err);
});

const cubeSize = 1;
let snake = [];
let direction = new THREE.Vector3(1, 0, 0);
let nextDirection = direction.clone();
let snakeSpeed = 5;
let lastMoveTime = 0;
let moveInterval = 1000 / snakeSpeed;
let food;
let score = 0;
let highScore = 0;
const boundary = 15;
let isPaused = false;
let arrowHelper = null;
let gameStarted = false;

if (localStorage.getItem('highScore')) {
    highScore = parseInt(localStorage.getItem('highScore'));
} else {
    highScore = 0;
}
document.getElementById('score').innerText = `Score: ${score} | High Score: ${highScore}`;

const initialLength = 3;
for (let i = 0; i < initialLength; i++) {
    addSnakeSegment(new THREE.Vector3(-i, 0, 0));
}

function addSnakeSegment(position) {
    const geometry = new THREE.BoxGeometry(cubeSize, cubeSize, cubeSize);
    const material = new THREE.MeshPhongMaterial({ map: snakeTexture });
    const cube = new THREE.Mesh(geometry, material);
    cube.position.copy(position);
    cube.castShadow = true;
    cube.receiveShadow = true;
    scene.add(cube);
    snake.push(cube);
}

function generateFood() {
    if (food) {
        scene.remove(food);
    }
    const geometry = new THREE.SphereGeometry(0.5, 16, 16);
    const material = new THREE.MeshPhongMaterial({ map: foodTexture });
    food = new THREE.Mesh(geometry, material);
    food.castShadow = true;
    food.receiveShadow = true;

    let validPosition = false;
    let x, y, z;
    while (!validPosition) {
        x = Math.floor((Math.random() - 0.5) * 30);
        y = Math.floor((Math.random() - 0.5) * 30);
        z = Math.floor((Math.random() - 0.5) * 30);
        validPosition = true;
        for (let segment of snake) {
            if (segment.position.distanceTo(new THREE.Vector3(x, y, z)) < 1) {
                validPosition = false;
                break;
            }
        }
    }
    food.position.set(x, y, z);
    scene.add(food);

    if (!arrowHelper) {
        const headPos = snake[0].position.clone();
        const foodPos = food.position.clone();
        const dir = foodPos.clone().sub(headPos).normalize();
        arrowHelper = new THREE.ArrowHelper(dir, headPos, 5, 0xffff00);
        scene.add(arrowHelper);
    } else {
        const headPos = snake[0].position.clone();
        const foodPos = food.position.clone();
        const dir = foodPos.clone().sub(headPos).normalize();
        arrowHelper.setDirection(dir);
        arrowHelper.position.copy(headPos);
    }
}

window.addEventListener('keydown', (event) => {
    if (!gameStarted) return;
    const newDir = getNewDirection(event.key, direction);
    if (newDir && !isOppositeDirection(newDir, direction) && !isPaused) {
        nextDirection = newDir;
    }
    if (event.key === 'p' || event.key === 'P') {
        togglePause();
    }
});

function getNewDirection(key, currentDir) {
    let newDirection = null;
    const isMovingHorizontally = currentDir.x !== 0 || currentDir.z !== 0;
    const isMovingVertically = currentDir.y !== 0;

    switch (key) {
        case 'ArrowRight':
            if (isMovingHorizontally) {
                newDirection = new THREE.Vector3(-currentDir.z, 0, currentDir.x).normalize();
            } else if (isMovingVertically) {
                newDirection = new THREE.Vector3(1, 0, 0);
            }
            break;
        case 'ArrowLeft':
            if (isMovingHorizontally) {
                newDirection = new THREE.Vector3(currentDir.z, 0, -currentDir.x).normalize();
            } else if (isMovingVertically) {
                newDirection = new THREE.Vector3(-1, 0, 0);
            }
            break;
        case 'ArrowUp':
            newDirection = new THREE.Vector3(0, 1, 0);
            break;
        case 'ArrowDown':
            newDirection = new THREE.Vector3(0, -1, 0);
            break;
        default:
            break;
    }
    return newDirection;
}

function isOppositeDirection(dir1, dir2) {
    return dir1.equals(dir2.clone().multiplyScalar(-1));
}

function togglePause() {
    isPaused = !isPaused;
    if (isPaused) {
        backgroundSound.pause();
        eatSound.pause();
        document.getElementById('pauseOverlay').classList.add('active');
    } else {
        document.getElementById('pauseOverlay').classList.remove('active');
        if (gameStarted) {
            backgroundSound.play();
        }
    }
}

window.addEventListener('resize', onWindowResize, false);
function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate(time) {
    requestAnimationFrame(animate);
    if (gameStarted && !isPaused && time - lastMoveTime > moveInterval) {
        moveSnake();
        lastMoveTime = time;
    }
    if (arrowHelper && gameStarted) {
        const headPos = snake[0].position.clone();
        const foodPos = food.position.clone();
        const dir = foodPos.clone().sub(headPos).normalize();
        arrowHelper.setDirection(dir);
        arrowHelper.position.copy(headPos);
    }
    if (gameStarted) {
        camera.position.x = snake[0].position.x - direction.x * 5;
        camera.position.y = snake[0].position.y + 5;
        camera.position.z = snake[0].position.z - direction.z * 5;
        camera.lookAt(snake[0].position);
    }
    renderer.render(scene, camera);
}

function moveSnake() {
    direction = nextDirection.clone();
    const head = snake[0];
    let newHeadPos = head.position.clone().add(direction.clone().multiplyScalar(cubeSize));
    newHeadPos.x = wrapPosition(newHeadPos.x);
    newHeadPos.y = wrapPosition(newHeadPos.y);
    newHeadPos.z = wrapPosition(newHeadPos.z);

    for (let segment of snake) {
        if (segment.position.distanceTo(newHeadPos) < 0.1) {
            endGame();
            return;
        }
    }

    const tail = snake.pop();
    tail.position.copy(newHeadPos);
    snake.unshift(tail);

    if (tail.position.distanceTo(food.position) < 1) {
        addSnakeSegment(tail.position.clone());
        generateFood();
        incrementScore();
        increaseSpeed();
        eatSound.play();
    }
}

function wrapPosition(coord) {
    if (coord > boundary) {
        return -boundary;
    } else if (coord < -boundary) {
        return boundary;
    }
    return coord;
}

function incrementScore() {
    score += 1;
    if (score > highScore) {
        highScore = score;
        localStorage.setItem('highScore', highScore);
    }
    document.getElementById('score').innerText = `Score: ${score} | High Score: ${highScore}`;
}

function increaseSpeed() {
    snakeSpeed += 0.5;
    moveInterval = 1000 / snakeSpeed;
}

function endGame() {
    backgroundSound.pause();
    eatSound.pause();
    document.getElementById('finalScore').innerText = score;
    document.getElementById('gameOverOverlay').classList.add('active');
}

function startGame() {
    gameStarted = true;
    document.getElementById('startOverlay').classList.remove('active');
    backgroundSound.play();
    generateFood();
    animate();
}

document.getElementById('startButton').addEventListener('click', startGame);
document.getElementById('resumeButton').addEventListener('click', () => {
    togglePause();
});

document.getElementById('upButton').addEventListener('touchstart', (e) => {
    e.preventDefault();
    handleDirectionChange('up');
}, { passive: false });
document.getElementById('downButton').addEventListener('touchstart', (e) => {
    e.preventDefault();
    handleDirectionChange('down');
}, { passive: false });
document.getElementById('leftButton').addEventListener('touchstart', (e) => {
    e.preventDefault();
    handleDirectionChange('left');
}, { passive: false });
document.getElementById('rightButton').addEventListener('touchstart', (e) => {
    e.preventDefault();
    handleDirectionChange('right');
}, { passive: false });
document.getElementById('pauseButton').addEventListener('touchstart', (e) => {
    e.preventDefault();
    togglePause();
}, { passive: false });

function handleDirectionChange(directionKey) {
    if (!gameStarted || isPaused) return;
    let newDir = null;
    switch (directionKey) {
        case 'up':
            newDir = new THREE.Vector3(0, 1, 0);
            break;
        case 'down':
            newDir = new THREE.Vector3(0, -1, 0);
            break;
        case 'left':
            newDir = getNewDirection('ArrowLeft', direction);
            break;
        case 'right':
            newDir = getNewDirection('ArrowRight', direction);
            break;
        default:
            break;
    }
    if (newDir && !isOppositeDirection(newDir, direction)) {
        nextDirection = newDir.clone().normalize();
    }
}

let touchStartX = 0;
let touchStartY = 0;

window.addEventListener('touchstart', (e) => {
    if (e.touches.length === 1) {
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
    }
}, { passive: true });

window.addEventListener('touchend', (e) => {
    if (e.changedTouches.length === 1) {
        let touchEndX = e.changedTouches[0].clientX;
        let touchEndY = e.changedTouches[0].clientY;

        let deltaX = touchEndX - touchStartX;
        let deltaY = touchEndY - touchStartY;

        if (Math.abs(deltaX) > Math.abs(deltaY)) {
            if (deltaX > 30) {
                handleDirectionChange('right');
            } else if (deltaX < -30) {
                handleDirectionChange('left');
            }
        } else {
            if (deltaY > 30) {
                handleDirectionChange('down');
            } else if (deltaY < -30) {
                handleDirectionChange('up');
            }
        }
    }
}, { passive: true });
