const db = firebase.database();
const rankingRef = db.ref('scores');

const dino = document.getElementById('dino');
const scoreEl = document.getElementById('score');
const gameOverEl = document.getElementById('game-over');
const restartBtn = document.getElementById('restart');
const obstaclesContainer = document.getElementById('obstacles-container');
const recordValue = document.getElementById('record-value');
const difficultyLabel = document.getElementById('difficulty-label');
const startBtn = document.getElementById('startBtn');
const difficultyButtons = document.querySelectorAll('.difficulty-btn');
const menu = document.getElementById('menu');
const rankingList = document.getElementById('ranking-list');

let music = new Audio('music.mp3');
const jumpSound = new Audio('jump.mp3');
const gameOverSound = new Audio('gameover.mp3');
music.loop = true;

let isJumping = false, jumpHeight = 0, score = 0, speed = 1.5, gameRunning = true;
let autoJump = false, isInverted = false, selectedDifficulty = 'easy';
let obstacleSpawner, scoreInterval, collisionCheck;
let hasInvertedAutomatically = false;
let musicChanged = false;
let warpModeActivated = false;

const difficultySpeeds = { easy: 1.5, medium: 0.75, hard: 0.3 };

function jump(extraDelay = 0) {
  if (isJumping || !gameRunning) return;
  isJumping = true;
  jumpSound.play();
  let upInterval = setInterval(() => {
    if (jumpHeight >= 120) {
      clearInterval(upInterval);
      let delay = 0;
      let delayInterval = setInterval(() => {
        delay++;
        if (delay >= extraDelay) {
          clearInterval(delayInterval);
          let downInterval = setInterval(() => {
            if (jumpHeight <= 0) {
              clearInterval(downInterval);
              isJumping = false;
            } else {
              jumpHeight -= 10;
              isInverted ? dino.style.top = jumpHeight + 'px' : dino.style.bottom = jumpHeight + 'px';
            }
          }, 20);
        }
      }, 20);
    } else {
      jumpHeight += 10;
      isInverted ? dino.style.top = jumpHeight + 'px' : dino.style.bottom = jumpHeight + 'px';
    }
  }, 20);
}

function createObstacle() {
  const obstacle = document.createElement('div');
  obstacle.classList.add('obstacle');

  const isAir = Math.random() < 0.3;
  if (isAir) {
    obstacle.classList.add('air');
    const airTypes = ['drone', 'bird', 'balloon'];
    const type = airTypes[Math.floor(Math.random() * airTypes.length)];
    obstacle.classList.add(type);
  } else {
    obstacle.classList.add('ground');
    const groundTypes = ['house', 'building', 'truck'];
    const type = groundTypes[Math.floor(Math.random() * groundTypes.length)];
    obstacle.classList.add(type);
  }

  if (isInverted) {
    obstacle.style.left = '-40px';
    obstacle.style.animation = `obstacleMoveInverted ${speed}s linear forwards`;
  } else {
    obstacle.style.right = '-40px';
    obstacle.style.animation = `obstacleMove ${speed}s linear forwards`;
  }

  obstaclesContainer.appendChild(obstacle);
  obstacle.addEventListener('animationend', () => obstacle.remove());
}

function checkCollision() {
  const dinoRect = dino.getBoundingClientRect();
  const obstacles = document.querySelectorAll('.obstacle');
  obstacles.forEach(obs => {
    const obsRect = obs.getBoundingClientRect();
    const horizontal = dinoRect.right > obsRect.left && dinoRect.left < obsRect.right;
    const vertical = dinoRect.bottom > obsRect.top && dinoRect.top < obsRect.bottom;
    const dist = obsRect.left - dinoRect.right;

    const antecipacao =
      speed <= 0.3 ? 260 :
      speed <= 0.4 ? 220 :
      speed <= 0.75 ? 160 : 120;

    const tempoExtraNoAr =
      speed <= 0.3 ? 7 :
      speed <= 0.4 ? 6 :
      speed <= 0.75 ? 4 : 3;

    if (autoJump && !isJumping && obs.classList.contains('ground') && dist > 10 && dist < antecipacao) {
      jump(tempoExtraNoAr);
    }

    if (horizontal && vertical) gameOver();
  });
}

function gameOver() {
  gameRunning = false;
  gameOverEl.style.display = 'block';
  music.pause();
  gameOverSound.play();
  clearInterval(scoreInterval);
  clearInterval(obstacleSpawner);
  clearInterval(collisionCheck);

  // Resetar visuais
  document.body.classList.remove('warp');
  if (isInverted) {
    document.body.classList.remove('inverted');
    isInverted = false;
  }
}

function resetGame() {
  score = 0;
  jumpHeight = 0;
  isJumping = false;
  hasInvertedAutomatically = false;
  musicChanged = false;
  warpModeActivated = false;
  gameRunning = true;
  speed = difficultySpeeds[selectedDifficulty];

  dino.style.bottom = '0px';
  dino.style.top = '';
  document.body.classList.remove('inverted');
  document.body.classList.remove('warp');
  isInverted = false;

  gameOverEl.style.display = 'none';
  scoreEl.textContent = "Pontuação: 0";
  obstaclesContainer.innerHTML = '';

  music.pause();
  music = new Audio('music.mp3');
  music.loop = true;
  music.play();

  obstacleSpawner = setInterval(createObstacle, 1500);
  scoreInterval = setInterval(() => {
    if (!gameRunning) return;
    score++;
    scoreEl.textContent = "Pontuação: " + score;

    // Aumentar dificuldade progressivamente
    if (score % 30 === 0) {
      if (selectedDifficulty === 'easy' && speed > 0.6) speed -= 0.07;
      else if (selectedDifficulty === 'medium' && speed > 0.4) speed -= 0.05;
      else if (selectedDifficulty === 'hard' && speed > 0.3) speed -= 0.02;
    }

    // Ativar dobra espacial (piscar colorido) aos 1000 pontos
    if (score >= 1000 && !warpModeActivated) {
      document.body.classList.add('warp');
      warpModeActivated = true;
    }

    // Inversão automática aos 1000 pontos
    if (score >= 1000 && !hasInvertedAutomatically) {
      document.body.classList.add('inverted');
      isInverted = true;
      hasInvertedAutomatically = true;
      dino.style.top = '0px';
      dino.style.bottom = '';
    }

    // Desinverter tela aos 1500 pontos
    if (score >= 1500 && isInverted) {
      document.body.classList.remove('inverted');
      isInverted = false;
      dino.style.bottom = '0px';
      dino.style.top = '';
    }

    // Trocar música aos 1000 pontos
    if (score >= 1000 && !musicChanged) {
      music.pause();
      music = new Audio('music2.mp3');
      music.loop = true;
      music.play();
      musicChanged = true;
    }

  }, 100);

  collisionCheck = setInterval(checkCollision, 10);
}

function startGame() {
  updateRecordDisplay();
  menu.style.display = 'none';
  resetGame();
}

function updateRecordDisplay() {
  const record = localStorage.getItem(`record-${selectedDifficulty}`) || 0;
  recordValue.textContent = record;
  const names = { easy: 'Fácil', medium: 'Médio', hard: 'Difícil' };
  difficultyLabel.textContent = names[selectedDifficulty];
}

difficultyButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    difficultyButtons.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    selectedDifficulty = btn.dataset.mode;
    startBtn.disabled = false;
  });
});

startBtn.addEventListener('click', startGame);
restartBtn.addEventListener('click', resetGame);

document.addEventListener('keydown', e => {
  if (e.code === 'Space' || e.key === 'ArrowUp') jump();
  if (e.key === 'z') autoJump = !autoJump;
  if (e.key.toLowerCase() === 'x') {
    document.body.classList.toggle('inverted');
    isInverted = !isInverted;
    dino.style.bottom = '0px';
    dino.style.top = '';
    if (isInverted) {
      dino.style.top = '0px';
      dino.style.bottom = '';
    }
  }
  if (e.key.toLowerCase() === 'l') {
    document.body.classList.toggle('warp');
  }
});
// Toque na área do jogo para pular (versão mobile)
document.querySelector('.game-container').addEventListener('touchstart', () => {
  jump();
});

// Permitir pulo ao tocar na tela (para celulares)
document.addEventListener('touchstart', () => {
  jump();
});

document.addEventListener('DOMContentLoaded', () => {
  updateRecordDisplay();
});
