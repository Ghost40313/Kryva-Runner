// script.js

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
const difficultySelect = document.getElementById('difficulty-select');

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
let lastObstacleTime = 0;

const difficultySpeeds = {
  easy: 1.5,
  medium: 0.75,
  hard: 0.3,
  expert: 0.3
};

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
  const now = Date.now();
  const minSpacing = selectedDifficulty === 'easy' ? 1300 :
                     selectedDifficulty === 'medium' ? 1000 :
                     selectedDifficulty === 'hard' ? 800 : 700;
  if (now - lastObstacleTime < minSpacing) return;
  lastObstacleTime = now;

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

    const antecipacao = speed <= 0.3 ? 300 : speed <= 0.4 ? 260 : speed <= 0.75 ? 200 : 150;
    const tempoExtraNoAr = speed <= 0.3 ? 10 : speed <= 0.4 ? 8 : speed <= 0.75 ? 5 : 3;

    if (autoJump && !isJumping && dist > 10 && dist < antecipacao) {
      const isGround = obs.classList.contains('ground');
      const isLowAir = obs.classList.contains('air') && obsRect.bottom > dinoRect.top + 30;
      if (isGround || (isLowAir && !isInverted)) {
        jump(tempoExtraNoAr);
      }
    }

    if (horizontal && vertical) gameOver();
  });
}

function gameOver() {
  gameRunning = false;
  const recordKey = `record-${selectedDifficulty}`;
  const currentRecord = parseInt(localStorage.getItem(recordKey)) || 0;
  if (score > currentRecord) {
    localStorage.setItem(recordKey, score);
  }
  gameOverEl.style.display = 'block';
  music.pause();
  gameOverSound.play();
  clearInterval(scoreInterval);
  clearInterval(obstacleSpawner);
  clearInterval(collisionCheck);
  dino.classList.add('stop');
  document.body.classList.remove('warp');
  if (isInverted) {
    document.body.classList.remove('inverted');
    isInverted = false;
  }
  updateRecordDisplay();
}

function resetGame() {
  dino.classList.remove('stop');
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
  document.body.classList.remove('inverted', 'warp');
  isInverted = false;
  gameOverEl.style.display = 'none';
  scoreEl.textContent = "Pontuação: 0";
  obstaclesContainer.innerHTML = '';
  music.pause();
  music = new Audio(selectedDifficulty === 'expert' ? 'music2.mp3' : 'music.mp3');
  music.loop = true;
  music.play();

  if (selectedDifficulty === 'expert') {
    document.body.classList.add('inverted', 'warp');
    isInverted = true;
    warpModeActivated = true;
    musicChanged = true;
    hasInvertedAutomatically = true;
    dino.style.top = '0px';
    dino.style.bottom = '';
  }

  obstacleSpawner = setInterval(createObstacle, 1500);
  scoreInterval = setInterval(() => {
    if (!gameRunning) return;
    score++;
    scoreEl.textContent = "Pontuação: " + score;

    if (score % 30 === 0) {
      if (selectedDifficulty === 'easy' && speed > 0.6) speed -= 0.07;
      else if (selectedDifficulty === 'medium' && speed > 0.4) speed -= 0.05;
      else if (selectedDifficulty === 'hard' && speed > 0.3) speed -= 0.02;
    }

    if (score >= 1000 && !warpModeActivated) document.body.classList.add('warp');
    if (score >= 1000 && !hasInvertedAutomatically) {
      document.body.classList.add('inverted');
      isInverted = true;
      hasInvertedAutomatically = true;
      dino.style.top = '0px';
      dino.style.bottom = '';
    }
    if (score >= 1500 && isInverted) {
      document.body.classList.remove('inverted');
      isInverted = false;
      dino.style.bottom = '0px';
      dino.style.top = '';
    }
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
  const names = { easy: 'Fácil', medium: 'Médio', hard: 'Difícil', expert: 'Expert' };
  difficultyLabel.textContent = names[selectedDifficulty] || selectedDifficulty;
}

difficultyButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    difficultyButtons.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    selectedDifficulty = btn.dataset.mode;
    difficultySelect.value = selectedDifficulty;
    startBtn.disabled = false;
  });
});

difficultySelect.addEventListener('change', () => {
  selectedDifficulty = difficultySelect.value;
  difficultyButtons.forEach(b => b.classList.remove('active'));
  document.querySelector(`.difficulty-btn[data-mode="${selectedDifficulty}"]`)?.classList.add('active');
  updateRecordDisplay();
  resetGame();
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

document.querySelector('.game-container').addEventListener('touchstart', e => {
  if (e.target.closest('#menu') || e.target.closest('#restart') || e.target.closest('#startBtn')) return;
  jump();
});

document.addEventListener('DOMContentLoaded', () => {
  updateRecordDisplay();
});

// Trapaça: ativar ao clicar 3x em "Recorde"
let tapCount = 0;
let lastTapTime = 0;
recordValue.addEventListener('click', () => {
  const now = Date.now();
  if (now - lastTapTime < 1000) {
    tapCount++;
    if (tapCount >= 3) {
      autoJump = true;
      tapCount = 0;
    }
  } else {
    tapCount = 1;
  }
  lastTapTime = now;
});

// Trapaça por toque no celular (3 toques no #record-display)
(function () {
  let touchCount = 0;
  let firstTouchTime = 0;
  const cheatArea = document.getElementById('cheat-touch-area');

  cheatArea.addEventListener('touchstart', () => {
    const now = Date.now();

    if (touchCount === 0) {
      firstTouchTime = now;
      touchCount = 1;
    } else {
      if (now - firstTouchTime <= 2000) {
        touchCount++;
        if (touchCount >= 3) {
          autoJump = true; // <-- agora funciona corretamente
          console.log("Trapaça ativada via toque.");
          touchCount = 0;
        }
      } else {
        touchCount = 1;
        firstTouchTime = now;
      }
    }
  });
})();
