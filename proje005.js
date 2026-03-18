import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import * as TWEEN from '@tweenjs/tween.js';
import Cube from 'https://cdn.skypack.dev/cubejs';

const turnSound = new Audio('https://gfxsounds.com/wp-content/uploads/2021/03/Rubiks-cube-rotating-solving-2.mp3');
turnSound.volume = 0.5;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0a0a0a);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

scene.add(new THREE.AmbientLight(0xffffff, 0.8));
const spotLight = new THREE.SpotLight(0xffeedd, 50);
spotLight.position.set(5, 10, 5);
spotLight.angle = 0.5;
scene.add(spotLight);

camera.position.set(4.5, 3.5, 5.5);
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;

const cubeGroup = new THREE.Group();
scene.add(cubeGroup);

const COLORS = { right: 0xff0000, left: 0xffa500, top: 0xffffff, bottom: 0xffff00, front: 0x00ff00, back: 0x0000ff };

window.createCube = () => {
    while(cubeGroup.children.length > 0) cubeGroup.remove(cubeGroup.children[0]);
    
    const coreGeo = new RoundedBoxGeometry(0.98, 0.98, 0.98, 3, 0.05);
    const coreMat = new THREE.MeshStandardMaterial({ color: 0x050505, roughness: 0.8 });
    const stickerGeo = new RoundedBoxGeometry(0.86, 0.86, 0.02, 2, 0.04);

    for (let x = -1; x <= 1; x++) {
        for (let y = -1; y <= 1; y++) {
            for (let z = -1; z <= 1; z++) {
                if (x === 0 && y === 0 && z === 0) continue;
                
                const pieceGroup = new THREE.Group(); 
                pieceGroup.position.set(x, y, z);
                pieceGroup.add(new THREE.Mesh(coreGeo, coreMat));

                const offset = 0.49; 
                if (x === 1) { const s = createSticker(COLORS.right); s.position.x = offset; s.rotation.y = Math.PI/2; pieceGroup.add(s); }
                if (x === -1) { const s = createSticker(COLORS.left); s.position.x = -offset; s.rotation.y = -Math.PI/2; pieceGroup.add(s); }
                if (y === 1) { const s = createSticker(COLORS.top); s.position.y = offset; s.rotation.x = -Math.PI/2; pieceGroup.add(s); }
                if (y === -1) { const s = createSticker(COLORS.bottom); s.position.y = -offset; s.rotation.x = Math.PI/2; pieceGroup.add(s); }
                if (z === 1) { const s = createSticker(COLORS.front); s.position.z = offset; pieceGroup.add(s); }
                if (z === -1) { const s = createSticker(COLORS.back); s.position.z = -offset; s.rotation.y = Math.PI; pieceGroup.add(s); }

                cubeGroup.add(pieceGroup);
            }
        }
    }
    function createSticker(colorHex) {
        return new THREE.Mesh(stickerGeo, new THREE.MeshStandardMaterial({ color: colorHex, roughness: 0.1, metalness: 0.1 }));
    }
};
createCube();

let isAnimating = false;
let moveCount = 0; 
let isScrambled = false;
let timerInterval;
let startTime;
let isTimerRunning = false;

window.currentSolution = []; 
window.currentMoveIndex = 0; 
window.isSolutionPlaying = false;
window.playbackSpeed = { moveDuration: 300, delay: 150 }; 
window.kociembaInitialized = false;

function shiftCameraUp() {
    new TWEEN.Tween(controls.target).to({ y: -1.5 }, 800).easing(TWEEN.Easing.Cubic.Out).start();
    new TWEEN.Tween(camera.position).to({ y: camera.position.y + 1.5 }, 800).easing(TWEEN.Easing.Cubic.Out).start();
}
function shiftCameraCenter() {
    new TWEEN.Tween(controls.target).to({ y: 0 }, 800).easing(TWEEN.Easing.Cubic.Out).start();
    new TWEEN.Tween(camera.position).to({ y: 3.5 }, 800).easing(TWEEN.Easing.Cubic.Out).start();
}
function updateMoveCounter() {
    document.getElementById('moves-display').innerText = `HAMLE: ${moveCount}`;
}
function startTimer() {
    if (isTimerRunning || !isScrambled) return;
    isTimerRunning = true;
    startTime = Date.now();
    timerInterval = setInterval(() => {
        const elapsed = Date.now() - startTime;
        const m = Math.floor(elapsed / 60000).toString().padStart(2, '0');
        const s = Math.floor((elapsed % 60000) / 1000).toString().padStart(2, '0');
        const ms = Math.floor((elapsed % 1000) / 10).toString().padStart(2, '0');
        document.getElementById('timer-display').innerText = `${m}:${s}.${ms}`;
    }, 10);
}
function stopTimer() {
    isTimerRunning = false;
    clearInterval(timerInterval);
}
function resetStats() {
    stopTimer();
    isScrambled = false;
    moveCount = 0;
    updateMoveCounter();
    window.isSolutionPlaying = false;
    window.currentMoveIndex = 0;
    
    const timerUI = document.getElementById('timer-display');
    timerUI.innerText = "00:00.00";
    timerUI.classList.remove('text-green-400', 'border-green-500', 'shadow-[0_0_20px_rgba(0,255,0,0.5)]');
    timerUI.classList.add('text-orange-400', 'border-orange-500/50', 'shadow-[0_0_20px_rgba(255,165,0,0.3)]');
    
    const movesUI = document.getElementById('moves-display');
    movesUI.classList.remove('text-green-400', 'border-green-500', 'shadow-[0_0_20px_rgba(0,255,0,0.5)]');
    movesUI.classList.add('text-cyan-400', 'border-cyan-500/50', 'shadow-[0_0_20px_rgba(0,255,255,0.3)]');
}

function checkIsSolved() {
    const faces = { R: [], L: [], U: [], D: [], F: [], B: [] };
    cubeGroup.children.forEach(piece => {
        piece.children.forEach(mesh => {
            if (mesh.material && mesh.material.color.getHex() !== 0x050505) {
                const pos = new THREE.Vector3();
                mesh.getWorldPosition(pos); 
                const hex = mesh.material.color.getHex();
                if (pos.x > 0.4) faces.R.push(hex);
                else if (pos.x < -0.4) faces.L.push(hex);
                else if (pos.y > 0.4) faces.U.push(hex);
                else if (pos.y < -0.4) faces.D.push(hex);
                else if (pos.z > 0.4) faces.F.push(hex);
                else if (pos.z < -0.4) faces.B.push(hex);
            }
        });
    });
    for (let face in faces) {
        if (faces[face].length !== 9) return false; 
        const firstColor = faces[face][0];
        for (let c of faces[face]) {
            if (c !== firstColor) return false; 
        }
    }
    return true; 
}

window.resetCube = () => { 
    if (isAnimating) return; 
    resetStats();
    camera.position.set(4.5, 3.5, 5.5); 
    controls.target.set(0, 0, 0);
    controls.update();
    createCube(); 
    shiftCameraCenter(); 
};

function animateRotation(piecesArray, axisStr, angle, duration = 300, recordStats = true) {
    return new Promise((resolve) => {
        const currentEasing = duration < 200 ? TWEEN.Easing.Linear.None : TWEEN.Easing.Quadratic.Out;

        const pivot = new THREE.Group();
        scene.add(pivot);
        piecesArray.forEach(p => pivot.attach(p));

        new TWEEN.Tween({ rot: 0 })
            .to({ rot: angle }, duration)
            .easing(currentEasing) 
            .onUpdate((obj) => { pivot.rotation[axisStr] = obj.rot; })
            .onComplete(() => {
                // KESİN ÇÖZÜM BURADA: TWEEN 89.9 derecede dursa bile, biz onu zorla tam açıya (angle) kitliyoruz!
                pivot.rotation[axisStr] = angle;
                pivot.updateMatrixWorld(); // Fiziği zorla güncelle

                piecesArray.forEach(p => {
                    cubeGroup.attach(p);
                    p.position.x = Math.round(p.position.x);
                    p.position.y = Math.round(p.position.y);
                    p.position.z = Math.round(p.position.z);
                    
                    const euler = new THREE.Euler().setFromQuaternion(p.quaternion);
                    const halfPi = Math.PI / 2;
                    euler.x = Math.round(euler.x / halfPi) * halfPi;
                    euler.y = Math.round(euler.y / halfPi) * halfPi;
                    euler.z = Math.round(euler.z / halfPi) * halfPi;
                    p.quaternion.setFromEuler(euler);
                });
                scene.remove(pivot);
                
                if (recordStats && currentMode === 'free') {
                    moveCount++;
                    updateMoveCounter();
                }

                if (isTimerRunning && checkIsSolved()) {
                    stopTimer();
                    const timerUI = document.getElementById('timer-display');
                    const movesUI = document.getElementById('moves-display');
                    timerUI.classList.replace('text-orange-400', 'text-green-400');
                    timerUI.classList.replace('border-orange-500/50', 'border-green-500');
                    movesUI.classList.replace('text-cyan-400', 'text-green-400');
                    movesUI.classList.replace('border-cyan-500/50', 'border-green-500');
                    setTimeout(() => alert(`TEBRİKLER DENİZ!\n\nSüre: ${timerUI.innerText}\nHamle: ${moveCount}`), 100);
                }
                resolve(); 
            }).start();
    });
}

// KRİTİK DÜZELTME: isAbsolute parametresi eklendi. AI için mutlak, kullanıcı için kameraya göre yön bulur.
function getMoveData(move, isAbsolute = false) {
    const isPrime = move.includes('PRIME'), isDouble = move.includes('2');
    const type = move.replace('_PRIME', '').replace('2', '');
    let axis, pos;

    if (isAbsolute) {
        // AI ve Karıştırma için SABİT eksenler
        const absMap = { 'U':{a:'y',d:1}, 'D':{a:'y',d:-1}, 'R':{a:'x',d:1}, 'L':{a:'x',d:-1}, 'F':{a:'z',d:1}, 'B':{a:'z',d:-1} };
        axis = absMap[type].a; pos = absMap[type].d;
    } else {
        // KULLANICI İÇİN: Kameranın o anki bakışına göre en yakın ekseni bul
        const camFront = new THREE.Vector3(0,0,-1).applyQuaternion(camera.quaternion).negate().normalize();
        const camUp = new THREE.Vector3(0,1,0).applyQuaternion(camera.quaternion).normalize();
        const camRight = new THREE.Vector3().crossVectors(camUp, camFront).normalize();

        const getNearestAxis = (v) => {
            const ax = Math.abs(v.x), ay = Math.abs(v.y), az = Math.abs(v.z);
            if (ax > ay && ax > az) return { a: 'x', d: Math.sign(v.x) };
            if (ay > ax && ay > az) return { a: 'y', d: Math.sign(v.y) };
            return { a: 'z', d: Math.sign(v.z) };
        };

        const map = {
            'F': getNearestAxis(camFront), 'B': { a: getNearestAxis(camFront).a, d: -getNearestAxis(camFront).d },
            'U': getNearestAxis(camUp), 'D': { a: getNearestAxis(camUp).a, d: -getNearestAxis(camUp).d },
            'R': getNearestAxis(camRight), 'L': { a: getNearestAxis(camRight).a, d: -getNearestAxis(camRight).d }
        };
        axis = map[type].a; pos = map[type].d;
    }

    let angle = (pos === 1) ? -Math.PI/2 : Math.PI/2;
    if (isPrime) angle *= -1; if (isDouble) angle *= 2;

    const activePieces = [];
    cubeGroup.children.forEach(p => { if (Math.round(p.position[axis]) === pos) activePieces.push(p); });
    return { activePieces, axis, angle };
}

window.rotateLayer = async (move, record = true, customDuration = 300, isAbsolute = false) => {
    if (isAnimating && record) return; 
    if (isScrambled && !isTimerRunning && record) startTimer(); 
    
    turnSound.currentTime = 0; // Sesi başa sar (hızlı hamlelerde üst üste binmesi için)
turnSound.play();

    const { activePieces, axis, angle } = getMoveData(move, isAbsolute);
    if (activePieces.length > 0) {
        if (record) isAnimating = true;
        await animateRotation(activePieces, axis, angle, customDuration, record);
        if (record) isAnimating = false;
    }
};

window.scrambleCube = async () => {
    if (isAnimating) return;
    isAnimating = true; 
    resetStats(); 
    shiftCameraCenter();
    const possibleMoves = ['U', 'U_PRIME', 'D', 'D_PRIME', 'L', 'L_PRIME', 'R', 'R_PRIME', 'F', 'F_PRIME', 'B', 'B_PRIME'];
    
    for(let i = 0; i < 20; i++) {
        const randomMove = possibleMoves[Math.floor(Math.random() * possibleMoves.length)];
        await window.rotateLayer(randomMove, false, 120, true); // Karıştırma mutlak yönlere göre olsun
    }
    isAnimating = false;
    isScrambled = true; 
};

window.rotateWholeCube = async (axisStr, dir) => {
    if (isAnimating) return;
    isAnimating = true;
    await animateRotation([...cubeGroup.children], axisStr, dir * (Math.PI / 2), 300, false); 
    isAnimating = false;
};

let currentMode = 'free'; 
window.switchMode = (mode) => {
    resetStats(); 
    currentMode = mode;
    document.getElementById('btn-mode-free').className = mode === 'free' ? "bg-orange-600 hover:bg-orange-500 px-5 py-2.5 rounded text-sm font-bold transition shadow-[0_0_10px_rgba(255,140,0,0.5)]" : "bg-zinc-800 hover:bg-zinc-700 px-5 py-2.5 rounded text-sm font-bold transition";
    document.getElementById('btn-mode-ai').className = mode === 'ai' ? "bg-orange-600 hover:bg-orange-500 px-5 py-2.5 rounded text-sm font-bold transition shadow-[0_0_10px_rgba(255,140,0,0.5)]" : "bg-zinc-800 hover:bg-zinc-700 px-5 py-2.5 rounded text-sm font-bold transition";
    document.getElementById('btn-mode-guide').className = mode === 'guide' ? "bg-orange-600 hover:bg-orange-500 px-5 py-2.5 rounded text-sm font-bold transition shadow-[0_0_10px_rgba(255,140,0,0.5)]" : "bg-zinc-800 hover:bg-zinc-700 px-5 py-2.5 rounded text-sm font-bold transition";

    document.getElementById('algo-panel').classList.add('hidden-panel');
    document.getElementById('color-picker').classList.add('hidden-panel');
    document.getElementById('guide-screen').classList.add('hidden-panel');
    document.getElementById('solution-panel').classList.add('hidden-panel');
    
    shiftCameraCenter(); 

    const statsPanel = document.getElementById('stats-panel');
    if (mode === 'free') {
        document.getElementById('algo-panel').classList.remove('hidden-panel');
        document.getElementById('arrow-panel').classList.remove('hidden-panel');
        statsPanel.style.opacity = '1';
        cubeGroup.visible = true;
    } else if (mode === 'ai') {
        document.getElementById('color-picker').classList.remove('hidden-panel');
        document.getElementById('arrow-panel').classList.remove('hidden-panel');
        statsPanel.style.opacity = '0'; 
        cubeGroup.visible = true;
    } else if (mode === 'guide') {
        document.getElementById('guide-screen').classList.remove('hidden-panel');
        document.getElementById('arrow-panel').classList.add('hidden-panel');
        statsPanel.style.opacity = '0';
        cubeGroup.visible = false;
    }
};

window.addEventListener('keydown', (e) => {
    if (currentMode === 'guide') return; 
    switch(e.key) {
        case 'ArrowUp': case 'w': case 'W': window.rotateWholeCube('x', 1); break;
        case 'ArrowDown': case 's': case 'S': window.rotateWholeCube('x', -1); break;
        case 'ArrowLeft': case 'a': case 'A': window.rotateWholeCube('y', 1); break;
        case 'ArrowRight': case 'd': case 'D': window.rotateWholeCube('y', -1); break;
    }
    if (currentMode === 'ai') {
        const colorMap = { '1': '#ffffff', '2': '#ffff00', '3': '#00ff00', '4': '#0000ff', '5': '#ff0000', '6': '#ffa500' };
        if (colorMap[e.key]) {
            const btns = document.querySelectorAll('#color-picker button');
            const index = parseInt(e.key) - 1;
            if(btns[index]) window.setSelectedColor(colorMap[e.key], btns[index]);
        }
    }
});

// ==========================================
// 🤖 KOCIEMBA (KUSURSUZ TARAMA)
// ==========================================
window.scanCube = async () => {
    if (isAnimating || window.isSolutionPlaying) return;

    shiftCameraUp();
    const loadingScreen = document.getElementById('loading-screen');
    loadingScreen.classList.remove('hidden-panel');
    await new Promise(r => setTimeout(r, 100));

    try {
        const colorCounts = { 0xffffff: 0, 0xffff00: 0, 0x00ff00: 0, 0x0000ff: 0, 0xff0000: 0, 0xffa500: 0 };
        cubeGroup.children.forEach(pieceGroup => {
            pieceGroup.children.forEach(mesh => {
                if (mesh.material && mesh.material.color.getHex() !== 0x050505) { 
                    colorCounts[mesh.material.color.getHex()]++; 
                }
            });
        });
        for (let hex in colorCounts) {
            if (colorCounts[hex] !== 9) throw new Error("İmkansız Küp! Renkleri eksik veya fazla girdiniz.");
        }

        // SABİT KAMERALARLA 54 KAREYİ OKUMA
        const scanOrder = [
            ...[-1,0,1].flatMap(z => [-1,0,1].map(x => ({ o: [x, 3, z], d: [0, -1, 0] }))),
            ...[1,0,-1].flatMap(y => [1,0,-1].map(z => ({ o: [3, y, z], d: [-1, 0, 0] }))),
            ...[1,0,-1].flatMap(y => [-1,0,1].map(x => ({ o: [x, y, 3], d: [0, 0, -1] }))),
            ...[1,0,-1].flatMap(z => [-1,0,1].map(x => ({ o: [x, -3, z], d: [0, 1, 0] }))),
            ...[1,0,-1].flatMap(y => [-1,0,1].map(z => ({ o: [-3, y, z], d: [1, 0, 0] }))),
            ...[1,0,-1].flatMap(y => [1,0,-1].map(x => ({ o: [x, y, -3], d: [0, 0, 1] })))
        ];

        const scanner = new THREE.Raycaster();
        const scannedColors = []; 

        for (let pos of scanOrder) {
            scanner.set(new THREE.Vector3(...pos.o), new THREE.Vector3(...pos.d));
            const hits = scanner.intersectObjects(cubeGroup.children, true);
            for (let hit of hits) {
                if (hit.object.material && hit.object.material.color.getHex() !== 0x050505) {
                    scannedColors.push(hit.object.material.color.getHex());
                    break;
                }
            }
        }

        if (scannedColors.length !== 54) throw new Error("Tarama Hatası!");

        const centerColors = {
            [scannedColors[4]]: 'U', [scannedColors[13]]: 'R', [scannedColors[22]]: 'F',
            [scannedColors[31]]: 'D', [scannedColors[40]]: 'L', [scannedColors[49]]: 'B'
        };
        const kociembaString = scannedColors.map(c => centerColors[c]).join('');

        if (!window.kociembaInitialized) {
            document.getElementById('loading-title').innerText = "YAPAY ZEKA UYANDIRILIYOR";
            await new Promise(r => setTimeout(r, 100)); 
            Cube.initSolver(); 
            window.kociembaInitialized = true;
        }

        document.getElementById('loading-title').innerText = "GERÇEK AI ANALİZ EDİYOR";
        const cube = Cube.fromString(kociembaString);
        const solveString = cube.solve(); 

        if (!solveString || solveString.includes("Error")) {
            throw new Error("Parity (Çözülemez Fiziksel Dizilim)");
        }

        const cleanSolve = solveString.trim();
        if (cleanSolve === "" || cleanSolve === "U U'" || cleanSolve === "U' U") {
            loadingScreen.classList.add('hidden-panel');
            shiftCameraCenter();
            alert("✅ Harika! Küp zaten tamamen çözülmüş durumda.");
            return;
        }

        window.currentSolution = solveString.split(' ').map(m => m.includes("'") ? m.replace("'", "_PRIME") : m);

    } catch (e) {
        loadingScreen.classList.add('hidden-panel');
        shiftCameraCenter();
        console.error("HATA DETAYI:", e); 
        alert(`❌ SİSTEM HATASI!\n\n${e.message}`);
        return;
    }

    loadingScreen.classList.add('hidden-panel');
    window.currentMoveIndex = 0; 
    renderSolutionMoves();
    document.getElementById('solution-panel').classList.remove('hidden-panel');
};

function renderSolutionMoves() {
    const container = document.getElementById('solution-moves');
    container.innerHTML = '';
    
    // JS üzerinden HTML'i düzenliyoruz: Yanlardan boşluk (px-8) ve sabit yükseklik eklendi.
    container.className = "flex flex-wrap justify-center content-start gap-2 mb-4 px-8 h-[100px] overflow-y-auto";
    
    window.currentSolution.forEach((move, index) => {
        const displayMove = move.replace('_PRIME', "'");
        const btn = document.createElement('button');
        btn.innerText = displayMove;
        
        // DİKKAT: Artık scale büyümüyor, boyut w-10 h-8 olarak SABİTLENDİ.
        btn.className = `w-10 h-8 flex items-center justify-center rounded text-xs font-bold transition-all ${index === 0 ? 'bg-orange-500 text-black shadow-[0_0_15px_rgba(255,165,0,0.9)] border border-orange-300' : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'}`;
        
        btn.onclick = () => window.goToState(index);
        container.appendChild(btn);
    });
}

function highlightMove(index) {
    const buttons = document.querySelectorAll('#solution-moves button');
    buttons.forEach((btn, i) => {
        if (i === index) {
            // Aktif olan parlar ama BOYUTU DEĞİŞMEZ (Sekme önlendi)
            btn.className = 'w-10 h-8 flex items-center justify-center rounded text-xs font-bold transition-all bg-orange-500 text-black shadow-[0_0_15px_rgba(255,165,0,0.9)] border border-orange-300 z-10';
        } else if (i < index) {
            btn.className = 'w-10 h-8 flex items-center justify-center rounded text-xs font-bold transition-all bg-green-900/40 text-green-400'; 
        } else {
            btn.className = 'w-10 h-8 flex items-center justify-center rounded text-xs font-bold transition-all bg-zinc-800 text-zinc-400 hover:bg-zinc-700'; 
        }
    });
}
window.goToState = async (targetIndex) => {
    window.isSolutionPlaying = false; 
    if (targetIndex > window.currentMoveIndex) {
        for(let i = window.currentMoveIndex; i < targetIndex; i++) {
            // isAbsolute = true gönderiyoruz!
            await window.rotateLayer(window.currentSolution[i], false, 0, true); 
        }
    } 
    else if (targetIndex < window.currentMoveIndex) {
        for(let i = window.currentMoveIndex - 1; i >= targetIndex; i--) {
            let move = window.currentSolution[i];
            let inverseMove = move;
            if (!move.includes('2')) inverseMove = move.includes('PRIME') ? move.replace('_PRIME', '') : move + '_PRIME';
            await window.rotateLayer(inverseMove, false, 0, true); 
        }
    }
    window.currentMoveIndex = targetIndex;
    highlightMove(targetIndex);
};

window.setSpeed = (speed) => {
    if (speed === 'normal') {
        window.playbackSpeed = { moveDuration: 300, delay: 150 };
        document.getElementById('btn-speed-normal').className = "bg-orange-600 px-3 py-1 rounded-full font-bold text-white text-[10px] transition";
        document.getElementById('btn-speed-slow').className = "bg-zinc-800 hover:bg-zinc-700 px-3 py-1 rounded-full font-bold text-zinc-300 text-[10px] transition";
    } else {
        window.playbackSpeed = { moveDuration: 800, delay: 600 };
        document.getElementById('btn-speed-slow').className = "bg-orange-600 px-3 py-1 rounded-full font-bold text-white text-[10px] transition";
        document.getElementById('btn-speed-normal').className = "bg-zinc-800 hover:bg-zinc-700 px-3 py-1 rounded-full font-bold text-zinc-300 text-[10px] transition";
    }
};

window.playSolution = async () => {
    if (window.isSolutionPlaying) return;
    if (window.currentMoveIndex >= window.currentSolution.length) {
        await window.goToState(0);
        await new Promise(r => setTimeout(r, 500)); 
    }
    window.isSolutionPlaying = true;
    while (window.currentMoveIndex < window.currentSolution.length && window.isSolutionPlaying) {
        highlightMove(window.currentMoveIndex);
        let move = window.currentSolution[window.currentMoveIndex];
        // isAbsolute = true gönderiyoruz!
        await window.rotateLayer(move, false, window.playbackSpeed.moveDuration, true); 
        await new Promise(r => setTimeout(r, window.playbackSpeed.delay)); 
        window.currentMoveIndex++;
    }
    window.isSolutionPlaying = false;
    highlightMove(window.currentMoveIndex); 
};

window.pauseSolution = () => { window.isSolutionPlaying = false; };
window.closeSolution = () => {
    document.getElementById('solution-panel').classList.add('hidden-panel');
    window.isSolutionPlaying = false;
    shiftCameraCenter(); 
};

// ==========================================
// 🖱️ FARE ETKİLEŞİMLERİ (BOYAMA VE ÇEVİRME)
// ==========================================
let selectedColor = '#ffffff';
window.setSelectedColor = (c, b) => {
    selectedColor = c;
    document.querySelectorAll('#color-picker button').forEach(btn => btn.classList.remove('active'));
    b.classList.add('active');
};

const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
let isSwiping = false;
let swipeStartPos = { x: 0, y: 0 };
let swipePiece = null;
let swipeNormal = null;

window.addEventListener('mousedown', (e) => {
    if (e.target.tagName !== 'CANVAS' || isAnimating) return;
    mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
    raycaster.setFromCamera(mouse, camera);
    const hits = raycaster.intersectObjects(cubeGroup.children, true);

    if (hits.length > 0) {
        const clickedObj = hits[0].object;
        if (clickedObj.material.color.getHex() !== 0x050505) { 
            isSwiping = true;
            controls.enabled = false; 
            swipeStartPos = { x: e.clientX, y: e.clientY };
            swipePiece = clickedObj.parent;
            
            const nMat = new THREE.Matrix3().getNormalMatrix(clickedObj.matrixWorld);
            swipeNormal = hits[0].face.normal.clone().applyMatrix3(nMat).normalize();
            swipeNormal.x = Math.round(swipeNormal.x);
            swipeNormal.y = Math.round(swipeNormal.y);
            swipeNormal.z = Math.round(swipeNormal.z);
        }
    }
});

window.addEventListener('mouseup', async (e) => {
    if (!isSwiping) return;
    isSwiping = false;
    controls.enabled = true; 

    const dx = e.clientX - swipeStartPos.x;
    const dy = e.clientY - swipeStartPos.y;

    if (currentMode === 'free' && (Math.abs(dx) > 20 || Math.abs(dy) > 20)) {
        if (isScrambled && !isTimerRunning) startTimer(); 

        const camRight = new THREE.Vector3(1,0,0).applyQuaternion(camera.quaternion).normalize();
        const camUp = new THREE.Vector3(0,1,0).applyQuaternion(camera.quaternion).normalize();
        
        const dragVec = new THREE.Vector3().addScaledVector(camRight, dx).addScaledVector(camUp, -dy).normalize();
        const rotAxisVec = new THREE.Vector3().crossVectors(swipeNormal, dragVec);

        let rotAxis = 'x';
        let rotDir = 1;
        const ax = Math.abs(rotAxisVec.x), ay = Math.abs(rotAxisVec.y), az = Math.abs(rotAxisVec.z);

        if (ax > ay && ax > az) { rotAxis = 'x'; rotDir = rotAxisVec.x > 0 ? 1 : -1; }
        else if (ay > ax && ay > az) { rotAxis = 'y'; rotDir = rotAxisVec.y > 0 ? 1 : -1; }
        else { rotAxis = 'z'; rotDir = rotAxisVec.z > 0 ? 1 : -1; }

        const angle = rotDir * (Math.PI / 2);
        const pos = Math.round(swipePiece.position[rotAxis]);
        const activePieces = [];
        cubeGroup.children.forEach(p => { if (Math.round(p.position[rotAxis]) === pos) activePieces.push(p); });

        if (activePieces.length > 0) {
            isAnimating = true;
            // FAREYLE ÇEVİRME GERİ GELDİ!
            await animateRotation(activePieces, rotAxis, angle, 300, true);
            isAnimating = false;
        }
    } 
    else if (currentMode === 'ai' && Math.abs(dx) < 5 && Math.abs(dy) < 5) {
        mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
        mouse.y = -(e.clientY / window.innerHeight) * 2 + 1; 
        raycaster.setFromCamera(mouse, camera);
        const hits = raycaster.intersectObjects(cubeGroup.children, true);
        if(hits.length > 0) {
            const clickedObj = hits[0].object;
            const piece = clickedObj.parent;
            
            const pos = piece.position;
            const isCenter = (Math.round(Math.abs(pos.x)) + Math.round(Math.abs(pos.y)) + Math.round(Math.abs(pos.z))) === 1;

            if (isCenter) {
                console.log("Merkez rengi değiştiremezsin!");
            } else if (clickedObj.material.color.getHex() !== 0x050505) {
                clickedObj.material.color.set(selectedColor);
            }
        }
    }
});

// ==========================================
// 📱 MOBİL DOKUNMATİK DESTEĞİ (TOUCH EVENTS)
// ==========================================

window.addEventListener('touchstart', (e) => {
    // Eğer tıklanan yer bir buton değilse (yani sadece canvas üzerindeysek)
    if (e.target.tagName !== 'CANVAS' || isAnimating) return;
    
    const touch = e.touches[0];
    // MouseDown olayını simüle ediyoruz
    const mouseEvent = new MouseEvent("mousedown", {
        clientX: touch.clientX,
        clientY: touch.clientY
    });
    window.dispatchEvent(mouseEvent);
}, { passive: false });

window.addEventListener('touchmove', (e) => {
    // Sayfanın aşağı kaymasını engelle (sadece küp dönsün)
    if (e.target.tagName === 'CANVAS') e.preventDefault();
}, { passive: false });

window.addEventListener('touchstart', (e) => {
    if (e.target.tagName !== 'CANVAS' || isAnimating) return;
    const t = e.touches[0];
    isSwiping = true;
    swipeStartPos = { x: t.clientX, y: t.clientY };
    // Mousedown simülasyonu için gerekli tetiklemeler buraya...
}, { passive: false });

function animate() { requestAnimationFrame(animate); TWEEN.update(); controls.update(); renderer.render(scene, camera); }
animate();
window.addEventListener('resize', () => {
    const width = window.innerWidth;
    const height = window.innerHeight;

    camera.aspect = width / height;
    
    // MOBİL İÇİN ÖZEL: Eğer ekran dikeyse (telefon), kamerayı biraz uzaklaştır
    if (width < height) {
        camera.fov = 85; // Daha geniş açı
    } else {
        camera.fov = 75; // Standart açı
    }

    camera.updateProjectionMatrix();
    renderer.setSize(width, height);
});