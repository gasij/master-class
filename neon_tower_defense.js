(function() {
    const COLS = 31,
        ROWS = 18,
        CS = 20;
    const canvas = document.getElementById('gc');
    const ctx = canvas.getContext('2d');

    // PATH definition (grid coords)
    const PATH_COORDS = [
        [0, 4],
        [1, 4],
        [2, 4],
        [3, 4],
        [4, 4],
        [5, 4],
        [6, 4],
        [7, 4],
        [8, 4],
        [8, 5],
        [8, 6],
        [8, 7],
        [8, 8],
        [8, 9],
        [8, 10],
        [8, 11],
        [9, 11],
        [10, 11],
        [11, 11],
        [12, 11],
        [13, 11],
        [14, 11],
        [15, 11],
        [15, 10],
        [15, 9],
        [15, 8],
        [15, 7],
        [15, 6],
        [15, 5],
        [15, 4],
        [15, 3],
        [15, 2],
        [15, 1],
        [16, 1],
        [17, 1],
        [18, 1],
        [19, 1],
        [20, 1],
        [21, 1],
        [22, 1],
        [23, 1],
        [23, 2],
        [23, 3],
        [23, 4],
        [23, 5],
        [23, 6],
        [23, 7],
        [23, 8],
        [23, 9],
        [23, 10],
        [23, 11],
        [23, 12],
        [23, 13],
        [22, 13],
        [21, 13],
        [20, 13],
        [19, 13],
        [18, 13],
        [17, 13],
        [16, 13],
        [16, 14],
        [16, 15],
        [16, 16],
        [16, 17],
        [17, 17],
        [18, 17],
        [19, 17],
        [20, 17],
        [21, 17],
        [22, 17],
        [23, 17],
        [24, 17],
        [25, 17],
        [26, 17],
        [27, 17],
        [28, 17],
        [29, 17],
        [30, 17]
    ];

    const pathSet = new Set(PATH_COORDS.map(([c, r]) => r * COLS + c));

    function isPath(c, r) { return pathSet.has(r * COLS + c); }



    //tower_defs


    let gold = 150,
        hp = 20,
        score = 0,
        wave = 0,
        gameState = 'idle';
    let towers = [],
        enemies = [],
        bullets = [],
        particles = [];
    let selectedType = 'basic';
    let waveTimer = 0,
        waveActive = false,
        enemiesLeft = 0,
        spawnTimer = 0;
    const PASSIVE_GOLD_PER_SEC = 3;
    let lastPassiveGoldMs = 0;

    function cellToWorld(c, r) { return { x: c * CS + CS / 2, y: r * CS + CS / 2 }; }

    // Game state
    function resetGame() {
        gold = 150;
        hp = 20;
        score = 0;
        wave = 0;
        towers = [];
        enemies = [];
        bullets = [];
        particles = [];
        waveTimer = 180;
        waveActive = false;
        enemiesLeft = 0;
        spawnTimer = 0;
        gameState = 'running';
        lastPassiveGoldMs = performance.now();
        updateHUD();
    }

    function updateHUD() {
        document.getElementById('h-hp').textContent = hp;
        document.getElementById('h-gold').textContent = gold;
        document.getElementById('h-wave').textContent = wave;
        document.getElementById('h-score').textContent = score;
    }

    // Enemy factory
    function spawnEnemy() {
        const hp_base = 40 + wave * 20;
        const speed_base = 0.6 + wave * 0.04;
        return {
            pathIdx: 0,
            x: PATH_COORDS[0][0] * CS + CS / 2,
            y: PATH_COORDS[0][1] * CS + CS / 2,
            hp: hp_base,
            maxHp: hp_base,
            speed: Math.min(speed_base, 1.6),
            reward: 8 + wave * 2,
            r: 7,
            color: `hsl(${(wave*40)%360},90%,55%)`
        };
    }

    // Bullet factory
    function makeBullet(tower, enemy) {
        return {
            x: tower.x,
            y: tower.y,
            tx: enemy,
            dmg: tower.dmg,
            speed: 6,
            color: TOWER_DEFS[tower.type].color,
            splash: TOWER_DEFS[tower.type].splash || 0,
            r: 3
        };
    }

    function makeParticle(x, y, color, count = 6) {
        for (let i = 0; i < count; i++) {
            const a = Math.random() * Math.PI * 2;
            const s = 1 + Math.random() * 2.5;
            particles.push({
                x,
                y,
                vx: Math.cos(a) * s,
                vy: Math.sin(a) * s,
                life: 20 + Math.random() * 20,
                maxLife: 40,
                color
            });
        }
    }

    // Wave management




    

    function dist(a, b) { return Math.hypot(a.x - b.x, a.y - b.y); }

    function tick() {
        if (gameState !== 'running') return;

        const now = performance.now();
        const elapsed = now - lastPassiveGoldMs;
        if (elapsed >= 1000) {
            const secs = Math.floor(elapsed / 1000);
            gold += secs * PASSIVE_GOLD_PER_SEC;
            lastPassiveGoldMs += secs * 1000;
            updateHUD();
        }

        // Wave timer
        if (!waveActive) {
            waveTimer--;
            if (waveTimer <= 0) { startWave();
                waveTimer = 0; }
        }

        // Spawn
        if (waveActive) {
            spawnTimer--;
            if (spawnTimer <= 0 && enemiesLeft > 0) {
                enemies.push(spawnEnemy());
                enemiesLeft--;
                spawnTimer = 40;
            }
            if (enemiesLeft === 0 && enemies.length === 0) {
                waveActive = false;
                waveTimer = 240;
                gold += 30;
                updateHUD();
            }
        }

        // Move enemies
        enemies.forEach(e => {
            const target = PATH_COORDS[e.pathIdx];
            const tx = target[0] * CS + CS / 2,
                ty = target[1] * CS + CS / 2;
            const d = Math.hypot(tx - e.x, ty - e.y);
            if (d < e.speed) {
                e.x = tx;
                e.y = ty;
                e.pathIdx++;
                if (e.pathIdx >= PATH_COORDS.length) {
                    e.dead = true;
                    e.leaked = true;
                }
            } else {
                e.x += ((tx - e.x) / d) * e.speed;
                e.y += ((ty - e.y) / d) * e.speed;
            }
        });

        // Towers shoot
        towers.forEach(t => {
            t.cooldown = (t.cooldown || 0) - 1;
            if (t.cooldown > 0) return;
            const def = TOWER_DEFS[t.type];
            // find target: enemy furthest along path in range
            let best = null,
                bestIdx = -1;
            enemies.forEach(e => {
                if (e.dead) return;
                if (dist(t, e) <= def.range * CS && e.pathIdx > bestIdx) {
                    best = e;
                    bestIdx = e.pathIdx;
                }
            });
            if (best) {
                bullets.push(makeBullet(t, best));
                t.cooldown = def.rate;
                t.firing = 3;
            }
        });

        // Move bullets
        bullets.forEach(b => {
            const e = b.tx;
            if (e.dead) { b.dead = true; return; }
            const d = dist(b, e);
            if (d < b.speed + e.r) {
                // hit
                if (b.splash > 0) {
                    enemies.forEach(en => {
                        if (!en.dead && dist(en, e) < b.splash * CS) {
                            en.hp -= b.dmg;
                            makeParticle(en.x, en.y, b.color, 4);
                        }
                    });
                    makeParticle(e.x, e.y, b.color, 12);
                } else {
                    e.hp -= b.dmg;
                    makeParticle(e.x, e.y, b.color, 4);
                }
                b.dead = true;
            } else {
                b.x += ((e.x - b.x) / d) * b.speed;
                b.y += ((e.y - b.y) / d) * b.speed;
            }
        });

        // Kill enemies





        

        enemies = enemies.filter(e => !e.dead);
        bullets = bullets.filter(b => !b.dead);

        // Particles
        particles.forEach(p => { p.x += p.vx;
            p.y += p.vy;
            p.vx *= 0.92;
            p.vy *= 0.92;
            p.life--; });
        particles = particles.filter(p => p.life > 0);

        towers.forEach(t => { if (t.firing > 0) t.firing--; });
    }

    // Drawing
    function drawPath() {
        ctx.strokeStyle = '#1a1a3a';
        ctx.lineWidth = CS;
        ctx.lineCap = 'square';
        ctx.beginPath();
        PATH_COORDS.forEach(([c, r], i) => {
            const x = c * CS + CS / 2,
                y = r * CS + CS / 2;
            i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        });
        ctx.stroke();
        // neon glow on path
        ctx.strokeStyle = '#23234a';
        ctx.lineWidth = CS - 2;
        ctx.beginPath();
        PATH_COORDS.forEach(([c, r], i) => {
            const x = c * CS + CS / 2,
                y = r * CS + CS / 2;
            i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        });
        ctx.stroke();
    }

    function drawGrid() {
        ctx.strokeStyle = 'rgba(50,50,80,0.4)';
        ctx.lineWidth = 0.5;
        for (let c = 0; c < COLS; c++) {
            ctx.beginPath();
            ctx.moveTo(c * CS, 0);
            ctx.lineTo(c * CS, ROWS * CS);
            ctx.stroke();
        }
        for (let r = 0; r < ROWS; r++) {
            ctx.beginPath();
            ctx.moveTo(0, r * CS);
            ctx.lineTo(COLS * CS, r * CS);
            ctx.stroke();
        }
    }

    function drawTower(t) {
        const def = TOWER_DEFS[t.type];
        const glow = t.firing > 0 ? 0.9 : 0.3;
        ctx.save();
        ctx.translate(t.x, t.y);
        // base
        ctx.fillStyle = '#0e0e1e';
        ctx.beginPath();
        ctx.rect(-8, -8, 16, 16);
        ctx.fill();
        // border glow
        ctx.shadowColor = def.color;
        ctx.shadowBlur = t.firing > 0 ? 14 : 6;
        ctx.strokeStyle = def.color;
        ctx.lineWidth = 1.5;
        ctx.globalAlpha = 0.5 + glow * 0.5;
        ctx.strokeRect(-8, -8, 16, 16);
        // inner shape
        ctx.globalAlpha = 0.7 + glow * 0.3;
        ctx.fillStyle = def.color;
        if (t.type === 'basic') {
            ctx.beginPath();
            ctx.arc(0, 0, 4, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillRect(-1, -7, 2, 4);
        } else if (t.type === 'sniper') {
            ctx.fillRect(-1, -7, 2, 8);
            ctx.beginPath();
            ctx.arc(0, 0, 3, 0, Math.PI * 2);
            ctx.fill();
        } else if (t.type === 'laser') {
            for (let i = 0; i < 4; i++) {
                ctx.save();
                ctx.rotate(i * Math.PI / 2);
                ctx.fillRect(-1, -7, 2, 4);
                ctx.restore();
            }
            ctx.beginPath();
            ctx.arc(0, 0, 3, 0, Math.PI * 2);
            ctx.fill();
        } else {
            ctx.beginPath();
            ctx.moveTo(0, -7);
            ctx.lineTo(6, 5);
            ctx.lineTo(-6, 5);
            ctx.closePath();
            ctx.fill();
        }
        ctx.restore();
    }

    function drawEnemy(e) {
        ctx.save();
        ctx.translate(e.x, e.y);
        ctx.shadowColor = e.color;
        ctx.shadowBlur = 10;
        ctx.fillStyle = e.color;
        ctx.beginPath();
        ctx.arc(0, 0, e.r, 0, Math.PI * 2);
        ctx.fill();
        // hp bar
        const bw = 14,
            bh = 3;
        ctx.fillStyle = '#1a1a2a';
        ctx.fillRect(-bw / 2, -e.r - 6, bw, bh);
        ctx.fillStyle = e.color;
        ctx.fillRect(-bw / 2, -e.r - 6, bw * (e.hp / e.maxHp), bh);
        ctx.restore();
    }

    function drawBullet(b) {
        ctx.save();
        ctx.shadowColor = b.color;
        ctx.shadowBlur = 8;
        ctx.fillStyle = b.color;
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }

    function drawParticle(p) {
        const a = p.life / p.maxLife;
        ctx.globalAlpha = a;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 2 * a, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
    }

    function drawWaveTimer() {
        if (!waveActive && gameState === 'running') {
            const sec = Math.ceil(waveTimer / 60);
            ctx.fillStyle = '#555';
            ctx.font = '11px monospace';
            ctx.fillText(`Следующая волна: ${sec}с`, 8, ROWS * CS - 8);
        }
    }

    let hoverCell = null;
    canvas.addEventListener('mousemove', e => {
        const r = canvas.getBoundingClientRect();
        const mx = e.clientX - r.left,
            my = e.clientY - r.top;
        hoverCell = { c: Math.floor(mx / CS), r: Math.floor(my / CS) };
    });
    canvas.addEventListener('mouseleave', () => { hoverCell = null; });

    function drawHover() {
        if (!hoverCell) return;
        const { c, r } = hoverCell;
        if (c < 0 || c >= COLS || r < 0 || r >= ROWS) return;
        if (isPath(c, r)) return;
        const def = TOWER_DEFS[selectedType];
        const canAfford = gold >= def.cost;
        ctx.save();
        ctx.globalAlpha = 0.3;
        ctx.fillStyle = canAfford ? def.color : '#ff4040';
        ctx.fillRect(c * CS, r * CS, CS, CS);
        // range preview
        ctx.globalAlpha = 0.07;
        ctx.fillStyle = def.color;
        ctx.beginPath();
        ctx.arc(c * CS + CS / 2, r * CS + CS / 2, def.range * CS, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }

    function render() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#080810';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        drawGrid();
        drawPath();
        drawHover();
        towers.forEach(drawTower);
        particles.forEach(drawParticle);
        enemies.forEach(drawEnemy);
        bullets.forEach(drawBullet);
        drawWaveTimer();
        // start/end markers
        ctx.fillStyle = '#40ff80';
        ctx.font = 'bold 10px monospace';
        ctx.fillText('START', 2, PATH_COORDS[0][1] * CS + CS / 2 + 4);
        ctx.fillStyle = '#ff4060';
        ctx.fillText('END', PATH_COORDS[PATH_COORDS.length - 1][0] * CS - 16, ROWS * CS - 4);
    }

    canvas.addEventListener('click', e => {
        if (gameState !== 'running') return;
        const r = canvas.getBoundingClientRect();
        const mx = e.clientX - r.left,
            my = e.clientY - r.top;
        const c = Math.floor(mx / CS),
            row = Math.floor(my / CS);
        if (isPath(c, row)) return;
        if (towers.find(t => t.gc === c && t.gr === row)) return;
        const def = TOWER_DEFS[selectedType];
        if (gold < def.cost) return;
        gold -= def.cost;
        const wx = c * CS + CS / 2,
            wy = row * CS + CS / 2;
        towers.push({ x: wx, y: wy, gc: c, gr: row, type: selectedType, cooldown: 0, firing: 0, dmg: def.dmg });
        updateHUD();
    });

    canvas.addEventListener('contextmenu', e => {
        e.preventDefault();
        if (gameState !== 'running') return;
        const r = canvas.getBoundingClientRect();
        const mx = e.clientX - r.left,
            my = e.clientY - r.top;
        const c = Math.floor(mx / CS),
            row = Math.floor(my / CS);
        const idx = towers.findIndex(t => t.gc === c && t.gr === row);
        if (idx >= 0) {
            gold += TOWER_DEFS[towers[idx].type].sell;
            makeParticle(towers[idx].x, towers[idx].y, '#ffff80', 8);
            towers.splice(idx, 1);
            updateHUD();
        }
    });

    // Tower select buttons
    document.querySelectorAll('.tower-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            selectedType = btn.dataset.type;
            document.querySelectorAll('.tower-btn').forEach(b => b.classList.remove('selected'));
            btn.classList.add('selected');
        });
    });

    // Overlay
    const overlay = document.getElementById('msg-overlay');
    const msgTitle = document.getElementById('msg-title');
    const msgSub = document.getElementById('msg-sub');
    const startBtn = document.getElementById('start-btn');
    startBtn.addEventListener('click', () => {
        resetGame();
        overlay.classList.add('hidden');
    });

    function checkGameOver() {
        if (gameState === 'over') {
            msgTitle.textContent = 'GAME OVER';
            msgSub.textContent = `Волна: ${wave} | Счёт: ${score}`;
            startBtn.textContent = '▶ СНОВА';
            overlay.classList.remove('hidden');
        }
    }

    function loop() {
        tick();
        render();
        checkGameOver();
        requestAnimationFrame(loop);
    }
    loop();
})();
