import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import * as TWEEN from '@tweenjs/tween.js';
// YENİ: Tarayıcıya uyumlu güvenli Kociemba Kütüphanesi!
import Cube from 'https://cdn.skypack.dev/cubejs';

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

window.scrambleCube = async () => {
    if (isAnimating) return;
    isAnimating = true; 
    resetStats(); 
    shiftCameraCenter();
    
    const possibleMoves = ['U', 'U_PRIME', 'D', 'D_PRIME', 'L', 'L_PRIME', 'R', 'R_PRIME', 'F', 'F_PRIME', 'B', 'B_PRIME'];
    
    for(let i = 0; i < 20; i++) {
        const randomMove = possibleMoves[Math.floor(Math.random() * possibleMoves.length)];
        const { activePieces, axis, angle } = getMoveData(randomMove);
        if (activePieces.length > 0) {
            await animateRotation(activePieces, axis, angle, 60, false); 
        }
    }
    isAnimating = false;
    isScrambled = true; 
};

let currentMode = 'free'; 
window.switchMode = (mode) => {
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

function animateRotation(piecesArray, axisStr, angle, duration = 300, countMove = true) {
    return new Promise((resolve) => {
        if (duration <= 10) {
            const pivot = new THREE.Group();
            scene.add(pivot);
            piecesArray.forEach(p => pivot.attach(p));
            pivot.rotation[axisStr] = angle;
            piecesArray.forEach(p => {
                cubeGroup.attach(p);
                p.position.set(Math.round(p.position.x), Math.round(p.position.y), Math.round(p.position.z));
            });
            scene.remove(pivot);
            resolve();
            return;
        }

        const pivot = new THREE.Group();
        scene.add(pivot);
        piecesArray.forEach(p => pivot.attach(p));

        new TWEEN.Tween({ rot: 0 }).to({ rot: angle }, duration).easing(TWEEN.Easing.Quadratic.InOut)
            .onUpdate((obj) => { pivot.rotation[axisStr] = obj.rot; })
            .onComplete(() => {
                piecesArray.forEach(p => {
                    cubeGroup.attach(p);
                    // MANYETİK KİLİT (KÜPÜN KAYMASINI ENGELLER!)
                    p.position.set(Math.round(p.position.x), Math.round(p.position.y), Math.round(p.position.z));
                });
                scene.remove(pivot);
                
                if (countMove && currentMode === 'free') {
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

function getMoveData(move) {
    const isPrime = move.includes('PRIME');
    const isDouble = move.includes('2'); 
    const type = move.replace('_PRIME', '').replace('2', '');

    const camFront = new THREE.Vector3(0,0,-1).applyQuaternion(camera.quaternion).negate().normalize();
    const camUp = new THREE.Vector3(0,1,0).applyQuaternion(camera.quaternion).normalize();
    const camRight = new THREE.Vector3().crossVectors(camUp, camFront).normalize();

    function getAxisAndDir(vec) {
        const ax = Math.abs(vec.x), ay = Math.abs(vec.y), az = Math.abs(vec.z);
        if (ax > ay && ax > az) return { axis: 'x', dir: Math.sign(vec.x) };
        if (ay > ax && ay > az) return { axis: 'y', dir: Math.sign(vec.y) };
        return { axis: 'z', dir: Math.sign(vec.z) };
    }

    const map = {
        'F': getAxisAndDir(camFront),
        'B': { axis: getAxisAndDir(camFront).axis, dir: -getAxisAndDir(camFront).dir },
        'U': getAxisAndDir(camUp),
        'D': { axis: getAxisAndDir(camUp).axis, dir: -getAxisAndDir(camUp).dir },
        'R': getAxisAndDir(camRight),
        'L': { axis: getAxisAndDir(camRight).axis, dir: -getAxisAndDir(camRight).dir }
    };

    const target = map[type];
    const axis = target.axis;
    const pos = target.dir; 

    let angle = (pos === 1) ? -Math.PI / 2 : Math.PI / 2;
    if (isPrime) angle *= -1;
    if (isDouble) angle *= 2; 

    const activePieces = [];
    cubeGroup.children.forEach(piece => {
        if (Math.round(piece.position[axis]) === pos) activePieces.push(piece);
    });

    return { activePieces, axis, angle };
}

window.rotateLayer = async (move, record = true, customDuration = 300) => {
    if (isAnimating && customDuration > 10) return; 
    if (isScrambled && !isTimerRunning) startTimer(); 
    if (customDuration > 10) isAnimating = true;

    const { activePieces, axis, angle } = getMoveData(move);
    if (activePieces.length > 0) {
        await animateRotation(activePieces, axis, angle, customDuration, record);
    }
    if (customDuration > 10) isAnimating = false;
};

window.rotateWholeCube = async (axisStr, dir) => {
    if (isAnimating) return;
    isAnimating = true;
    await animateRotation([...cubeGroup.children], axisStr, dir * (Math.PI / 2), 300, false); 
    isAnimating = false;
};

window.addEventListener('keydown', (e) => {
    if (currentMode === 'guide') return; 
    switch(e.key) {
        case 'ArrowUp': case 'w': case 'W': window.rotateWholeCube('x', 1); break;
        case 'ArrowDown': case 's': case 'S': window.rotateWholeCube('x', -1); break;
        case 'ArrowLeft': case 'a': case 'A': window.rotateWholeCube('y', 1); break;
        case 'ArrowRight': case 'd': case 'D': window.rotateWholeCube('y', -1); break;
    }
});

// --- GERÇEK KOCIEMBA ALGORİTMASI ---

window.scanCube = async () => {
    if (isAnimating || window.isSolutionPlaying) return;

    const colorCounts = { 0xffffff: 0, 0xffff00: 0, 0x00ff00: 0, 0x0000ff: 0, 0xff0000: 0, 0xffa500: 0 };
    const colorNames = { 0xffffff: 'Beyaz', 0xffff00: 'Sarı', 0x00ff00: 'Yeşil', 0x0000ff: 'Mavi', 0xff0000: 'Kırmızı', 0xffa500: 'Turuncu' };
    const oppositePairs = [ [0xffffff, 0xffff00], [0x00ff00, 0x0000ff], [0xff0000, 0xffa500] ];
    let pieceError = null;

    cubeGroup.children.forEach(pieceGroup => {
        const pieceColors = []; 
        pieceGroup.children.forEach(mesh => {
            if (mesh.material && mesh.material.color.getHex() !== 0x050505) { 
                const hex = mesh.material.color.getHex();
                colorCounts[hex]++; 
                pieceColors.push(hex);
            }
        });
        for (let pair of oppositePairs) {
            if (pieceColors.includes(pair[0]) && pieceColors.includes(pair[1])) {
                pieceError = `❌ İMKANSIZ PARÇA TESPİT EDİLDİ!\n\nBir küp parçasının üzerinde aynı anda hem ${colorNames[pair[0]]} hem de ${colorNames[pair[1]]} olamaz.`;
            }
        }
    });
    if (pieceError) { alert(pieceError); return; }

    let isValidCount = true;
    for (let hex in colorCounts) {
        if (colorCounts[hex] !== 9) isValidCount = false;
    }
    if (!isValidCount) { alert("❌ İMKANSIZ KÜP DİZİLİMİ!\n\nGerçek bir Rubik küpünde her renkten tam 9 tane olmalıdır."); return; }

    shiftCameraUp();

    const loadingScreen = document.getElementById('loading-screen');
    loadingScreen.classList.remove('hidden-panel');
    
    await new Promise(r => setTimeout(r, 100));

    try {
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

        // MANYETİK KİLİT KONTROLÜ: Lazerler 54 renk okudu mu?
        if (scannedColors.length !== 54) {
            throw new Error(`Tarama Hatası! Lazerler sadece ${scannedColors.length}/54 renk okuyabildi. Lütfen sayfayı yenileyin.`);
        }

        const centerColors = {
            [scannedColors[4]]: 'U', [scannedColors[13]]: 'R', [scannedColors[22]]: 'F',
            [scannedColors[31]]: 'D', [scannedColors[40]]: 'L', [scannedColors[49]]: 'B'
        };
        const kociembaString = scannedColors.map(c => centerColors[c]).join('');

        if (!window.kociembaInitialized) {
            document.getElementById('loading-title').innerText = "YAPAY ZEKA UYANDIRILIYOR";
            document.getElementById('loading-desc').innerText = "İlk hesaplama 3-4 saniye sürebilir, sayfa donabilir, lütfen bekle...";
            await new Promise(r => setTimeout(r, 100)); 
            
            Cube.initSolver(); 
            window.kociembaInitialized = true;
        }

        document.getElementById('loading-title').innerText = "GERÇEK AI ANALİZ EDİYOR";
        document.getElementById('loading-desc').innerText = "Dünya rekoru Kociemba algoritması çalışıyor...";

        const cube = Cube.fromString(kociembaString);
        const solveString = cube.solve(); 

        if (!solveString || solveString.includes("Error")) {
            throw new Error("Parity (Çözülemez Fiziksel Dizilim)");
        }

        if (solveString === "") {
            loadingScreen.classList.add('hidden-panel');
            shiftCameraCenter();
            alert("✅ Harika! Küp zaten tamamen çözülmüş durumda.");
            return;
        }

        window.currentSolution = solveString.split(' ').map(m => m.includes("'") ? m.replace("'", "_PRIME") : m);

    } catch (e) {
        loadingScreen.classList.add('hidden-panel');
        shiftCameraCenter();
        console.error("HATA DETAYI:", e); // Geliştirici konsolu için
        alert(`❌ SİSTEM HATASI!\n\n${e.message}\n\nGerçek küpünün renklerini yanlış girmiş olabilirsin. Sıfırlayıp tekrar dene!`);
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
    
    window.currentSolution.forEach((move, index) => {
        const displayMove = move.replace('_PRIME', "'");
        const btn = document.createElement('button');
        btn.innerText = displayMove;
        
        btn.className = `px-2 py-1 rounded text-xs font-bold transition-all ${index === 0 ? 'bg-orange-500 text-black scale-110 shadow-[0_0_10px_rgba(255,165,0,0.8)]' : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'}`;
        
        btn.onclick = () => window.goToState(index);
        container.appendChild(btn);
    });
}

function highlightMove(index) {
    const buttons = document.querySelectorAll('#solution-moves button');
    buttons.forEach((btn, i) => {
        if (i === index) {
            btn.className = 'px-3 py-1.5 rounded text-sm font-bold transition-all bg-orange-500 text-black scale-110 shadow-[0_0_10px_rgba(255,165,0,0.8)] z-10';
        } else if (i < index) {
            btn.className = 'px-2 py-1 rounded text-xs font-bold transition-all bg-green-900/40 text-green-400'; 
        } else {
            btn.className = 'px-2 py-1 rounded text-xs font-bold transition-all bg-zinc-800 text-zinc-400 hover:bg-zinc-700'; 
        }
    });
}

window.goToState = async (targetIndex) => {
    window.isSolutionPlaying = false; 
    
    if (targetIndex > window.currentMoveIndex) {
        for(let i = window.currentMoveIndex; i < targetIndex; i++) {
            await window.rotateLayer(window.currentSolution[i], false, 0); 
        }
    } 
    else if (targetIndex < window.currentMoveIndex) {
        for(let i = window.currentMoveIndex - 1; i >= targetIndex; i--) {
            let move = window.currentSolution[i];
            let inverseMove = move;
            if (!move.includes('2')) {
                inverseMove = move.includes('PRIME') ? move.replace('_PRIME', '') : move + '_PRIME';
            }
            await window.rotateLayer(inverseMove, false, 0); 
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
        
        await window.rotateLayer(move, false, window.playbackSpeed.moveDuration); 
        await new Promise(r => setTimeout(r, window.playbackSpeed.delay)); 
        
        window.currentMoveIndex++;
    }
    
    window.isSolutionPlaying = false;
    highlightMove(window.currentMoveIndex); 
};

window.pauseSolution = () => {
    window.isSolutionPlaying = false;
};

window.closeSolution = () => {
    document.getElementById('solution-panel').classList.add('hidden-panel');
    window.isSolutionPlaying = false;
    shiftCameraCenter(); 
};

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
            if (clickedObj.material.color.getHex() !== 0x050505) {
                clickedObj.material.color.set(selectedColor);
            }
        }
    }
});

function animate() { requestAnimationFrame(animate); TWEEN.update(); controls.update(); renderer.render(scene, camera); }
animate();
window.addEventListener('resize', () => { camera.aspect = window.innerWidth/window.innerHeight; camera.updateProjectionMatrix(); renderer.setSize(window.innerWidth, window.innerHeight); });