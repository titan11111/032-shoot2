// --- ゲーム設定 ---
const config = {
    speed: 6,
    shotInterval: 120, // 連射速度
    enemySpawnRate: 1000,
    width: 0,
    height: 0
};

// --- ゲーム状態 ---
const state = {
    isPlaying: false,
    score: 0,
    bombs: 3,
    lastShotTime: 0,
    isMobile: false
};

// --- 入力管理 ---
const keys = { 
    ArrowLeft: false, 
    ArrowRight: false, 
    Space: false, 
    ShootBtn: false 
};

// --- オーディオ管理 ---
const audio = {
    title: document.getElementById('bgm-title'),
    battle: document.getElementById('bgm-battle'),
    attack: document.getElementById('se-attack'),
    explosion: document.getElementById('se-explosion'),
    bomb: document.getElementById('se-bomb')
};

// 【最新技術 #1】Web Audio API - 周波数解析
let audioContext = null;
let analyser = null;
function initAudioContext() {
    if (!audioContext && audio.battle) {
        try {
            const AudioContextClass = window.AudioContext || window.webkitAudioContext;
            audioContext = new AudioContextClass();
            const source = audioContext.createMediaElementAudioSource(audio.battle);
            analyser = audioContext.createAnalyser();
            analyser.fftSize = 256;
            source.connect(analyser);
            analyser.connect(audioContext.destination);
        } catch (e) { console.warn('Web Audio API init failed'); }
    }
}

// 【最新技術 #2】Performance API
let frameData = { count: 0, lastTime: performance.now(), fps: 0 };

// --- DOM要素 ---
const player = document.getElementById('player');
const gameContainer = document.getElementById('game-container');
const overlay = document.getElementById('overlay');

function init() {
    resize();
    window.addEventListener('resize', resize);
    
    // デバイス選択イベント
    document.getElementById('pc-button').addEventListener('click', () => selectDevice(false));
    document.getElementById('mobile-button').addEventListener('click', () => selectDevice(true));

    // ゲーム開始・リスタート
    document.getElementById('start-button').addEventListener('click', startGame);
    document.getElementById('restart-button').addEventListener('click', () => {
        document.getElementById('game-over').style.display = 'none';
        startGame();
    });
    document.getElementById('title-button').addEventListener('click', () => location.reload());

    setupControls();
    
    // タイトルBGM再生試行
    playBGM(audio.title);
}

function selectDevice(isMobile) {
    state.isMobile = isMobile;
    document.getElementById('device-select').style.display = 'none';
    document.getElementById('start-screen').style.display = 'flex';
    
    if (state.isMobile) {
        document.getElementById('mobile-controls').style.display = 'block';
        document.getElementById('instructions').textContent = '操作: 画面下のボタンで移動・攻撃';
    } else {
        document.getElementById('mobile-controls').style.display = 'none';
    }
}

function startGame() {
    state.isPlaying = true;
    state.score = 0;
    state.bombs = 3;
    
    // 画面切り替え
    document.getElementById('start-screen').style.display = 'none';
    updateUI();
    
    // プレイヤー初期位置
    player.style.left = (state.width / 2) + 'px';
    player.style.top = (state.height - 80) + 'px';

    // BGM切り替え
    stopBGM(audio.title);
    playBGM(audio.battle);

    // ループ開始
    requestAnimationFrame(gameLoop);
    
    // 敵生成タイマーのクリアと再設定
    if (window.enemySpawner) clearInterval(window.enemySpawner);
    window.enemySpawner = setInterval(spawnEnemy, config.enemySpawnRate);
}

function gameLoop() {
    if (!state.isPlaying) return;

    updatePlayer();
    updateBullets();
    updateEnemies();
    
    requestAnimationFrame(gameLoop);
}

function updatePlayer() {
    const currentLeft = parseFloat(player.style.left);
    
    // 移動制限
    if (keys.ArrowLeft && currentLeft > 30) {
        player.style.left = (currentLeft - config.speed) + 'px';
        player.style.transform = 'translate(-50%, -50%) rotate(-10deg)';
    } else if (keys.ArrowRight && currentLeft < state.width - 30) {
        player.style.left = (currentLeft + config.speed) + 'px';
        player.style.transform = 'translate(-50%, -50%) rotate(10deg)';
    } else {
        player.style.transform = 'translate(-50%, -50%) rotate(0deg)';
    }

    // オートショット
    const now = Date.now();
    if ((keys.Space || keys.ShootBtn) && (now - state.lastShotTime > config.shotInterval)) {
        shoot();
        state.lastShotTime = now;
    }
}

function shoot() {
    const bullet = document.createElement('div');
    bullet.className = 'bullet';
    const px = parseFloat(player.style.left);
    const py = parseFloat(player.style.top);
    
    bullet.style.left = px + 'px';
    bullet.style.top = (py - 30) + 'px';
    gameContainer.appendChild(bullet);

    playSE(audio.attack);
}

function triggerBomb() {
    if (!state.isPlaying || state.bombs <= 0) return;
    
    state.bombs--;
    updateUI();
    playSE(audio.bomb);

    // 画面フラッシュ
    overlay.classList.add('flash');
    setTimeout(() => overlay.classList.remove('flash'), 500);

    // 全敵消滅
    document.querySelectorAll('.enemy').forEach(el => {
        createExplosion(parseFloat(el.style.left), parseFloat(el.style.top));
        el.remove();
        addScore(100);
    });
}

function spawnEnemy() {
    if (!state.isPlaying) return;
    const enemy = document.createElement('div');
    enemy.className = 'enemy';
    enemy.style.left = (Math.random() * (state.width - 60) + 30) + 'px';
    enemy.style.top = '-50px';
    gameContainer.appendChild(enemy);
}

function updateBullets() {
    document.querySelectorAll('.bullet').forEach(b => {
        const y = parseFloat(b.style.top);
        if (y < -20) b.remove();
        else {
            b.style.top = (y - 12) + 'px';
            checkCollision(b);
        }
    });
}

function updateEnemies() {
    document.querySelectorAll('.enemy').forEach(e => {
        const y = parseFloat(e.style.top);
        if (y > state.height + 50) e.remove();
        else {
            e.style.top = (y + 4) + 'px';
            if (isColliding(player, e)) gameOver();
        }
    });
}

function checkCollision(bullet) {
    const enemies = document.querySelectorAll('.enemy');
    for (const enemy of enemies) {
        if (isColliding(bullet, enemy)) {
            createExplosion(parseFloat(enemy.style.left), parseFloat(enemy.style.top));
            enemy.remove();
            bullet.remove();
            addScore(100);
            return; // 貫通しない
        }
    }
}

function isColliding(el1, el2) {
    const r1 = el1.getBoundingClientRect();
    const r2 = el2.getBoundingClientRect();
    // 少し判定を甘くする（パディング）
    const pad = 5;
    return !(r1.right - pad < r2.left + pad || 
             r1.left + pad > r2.right - pad || 
             r1.bottom - pad < r2.top + pad || 
             r1.top + pad > r2.bottom - pad);
}

function createExplosion(x, y) {
    const exp = document.createElement('div');
    exp.className = 'explosion';
    exp.style.left = x + 'px';
    exp.style.top = y + 'px';
    gameContainer.appendChild(exp);
    playSE(audio.explosion);
    setTimeout(() => exp.remove(), 500);
}

function addScore(pts) {
    state.score += pts;
    updateUI();
}

function updateUI() {
    document.getElementById('score').textContent = `Score: ${state.score}`;
    document.getElementById('bombs').textContent = `Bomb: ${'★'.repeat(state.bombs)}`;
}

function gameOver() {
    state.isPlaying = false;
    stopBGM(audio.battle);
    clearInterval(window.enemySpawner);
    
    document.getElementById('game-over').style.display = 'flex';
    document.getElementById('final-score').textContent = `Score: ${state.score}`;
}

// --- 入力イベント ---
function setupControls() {
    // PC
    window.addEventListener('keydown', e => {
        if (e.code === 'ArrowLeft') keys.ArrowLeft = true;
        if (e.code === 'ArrowRight') keys.ArrowRight = true;
        if (e.code === 'Space') keys.Space = true;
        if (e.key === 'b' || e.key === 'z') triggerBomb();
    });
    window.addEventListener('keyup', e => {
        if (e.code === 'ArrowLeft') keys.ArrowLeft = false;
        if (e.code === 'ArrowRight') keys.ArrowRight = false;
        if (e.code === 'Space') keys.Space = false;
    });

    // 【最新技術 #3】Pointer Events - Touch/Mouse 統一
    const bindPointerEvents = (id, keyName) => {
        const btn = document.getElementById(id);
        if(!btn) return;
        btn.addEventListener('pointerdown', (e) => { e.preventDefault(); keys[keyName] = true; }, {passive: false});
        btn.addEventListener('pointerup', (e) => { e.preventDefault(); keys[keyName] = false; }, {passive: false});
        btn.addEventListener('pointercancel', () => { keys[keyName] = false; });
    };

    bindPointerEvents('btn-left', 'ArrowLeft');
    bindPointerEvents('btn-right', 'ArrowRight');
    bindPointerEvents('btn-shoot', 'ShootBtn');

    // ボムボタン
    const bombBtn = document.getElementById('btn-bomb');
    if(bombBtn) {
        bombBtn.addEventListener('pointerdown', (e) => { e.preventDefault(); triggerBomb(); }, {passive: false});
    }
}

// --- 音声ユーティリティ ---
function playBGM(audioObj) {
    if(audioObj) {
        audioObj.currentTime = 0;
        audioObj.volume = 0.5;
        audioObj.play().catch(e => console.log('Audio autoplay blocked'));
    }
}
function stopBGM(audioObj) {
    if(audioObj) {
        audioObj.pause();
        audioObj.currentTime = 0;
    }
}
function playSE(audioObj) {
    if(audioObj) {
        const clone = audioObj.cloneNode(); // 重ねて再生するため複製
        clone.volume = 0.3;
        clone.play().catch(e => {});
    }
}

function resize() {
    state.width = gameContainer.clientWidth;
    state.height = gameContainer.clientHeight;
}

// 初期化実行
init();
