/* ═══════════════════════════════════════════════════════════════
   MARK PORTFOLIO — main.js  [CINEMATIC ULTRA EDITION]
   AI Reactor Core · Cinematic Effects · Maximum Animations
   Perf: single rAF loop, GPU transforms, no layout-thrash
════════════════════════════════════════════════════════════════ */
'use strict';

/* ── GLOBAL STATE ── */
const state = {
  mouseX: 0, mouseY: 0,
  dotX: 0, dotY: 0,
  scrollY: 0, time: 0
};

/* ── MASTER RAF LOOP ── */
function masterLoop(ts) {
  state.time = ts;
  tickCursor(ts);
  tickParticles();
  tickHologram(ts);
  tickReactor(ts);
  requestAnimationFrame(masterLoop);
}

/* ═══════════════════════════════════════════════════════════════
   1. CURSOR + TRAIL
════════════════════════════════════════════════════════════════ */
const cursorEl  = document.getElementById('cursor');
const dotEl     = document.getElementById('cursor-dot');
const trailCont = document.getElementById('cursor-trail-container');
const TRAIL_N   = 12;
const trail     = [];

for (let i = 0; i < TRAIL_N; i++) {
  const d = document.createElement('div');
  d.className = 'trail-dot';
  const s = (6 - i * 0.4);
  const hue = i % 4 === 0 ? 'var(--accent)' : i % 3 === 0 ? 'var(--plasma-b,#b070ff)' : i % 2 === 0 ? 'var(--green)' : 'var(--cyan)';
  d.style.cssText = `width:${Math.max(s,1)}px;height:${Math.max(s,1)}px;opacity:${(1-i/TRAIL_N)*0.5};background:${hue};box-shadow:0 0 ${s*2}px ${hue};`;
  trailCont.appendChild(d);
  trail.push({ el: d, x: 0, y: 0 });
}

document.addEventListener('mousemove', e => {
  state.mouseX = e.clientX;
  state.mouseY = e.clientY;
  cursorEl.style.transform = `translate(${e.clientX - 13}px, ${e.clientY - 13}px)`;
}, { passive: true });

function tickCursor() {
  state.dotX += (state.mouseX - state.dotX) * 0.16;
  state.dotY += (state.mouseY - state.dotY) * 0.16;
  dotEl.style.transform = `translate(${state.dotX - 3}px, ${state.dotY - 3}px)`;
  trail.forEach((t, i) => {
    const prev = i === 0 ? { x: state.dotX, y: state.dotY } : trail[i - 1];
    t.x += (prev.x - t.x) * 0.25;
    t.y += (prev.y - t.y) * 0.25;
    t.el.style.transform = `translate(${t.x - 2}px, ${t.y - 2}px)`;
  });
}

document.querySelectorAll('a, button, .project-card, .blog-card, .obj-card, .tech-card, .alien-wrap').forEach(el => {
  el.addEventListener('mouseenter', () => cursorEl.classList.add('cursor-hover'),    { passive: true });
  el.addEventListener('mouseleave', () => cursorEl.classList.remove('cursor-hover'), { passive: true });
});

/* ═══════════════════════════════════════════════════════════════
   2. MATRIX RAIN
════════════════════════════════════════════════════════════════ */
const mc   = document.getElementById('matrix-canvas');
const mctx = mc.getContext('2d');
let matrixW, matrixH, matrixCols, drops;
function resizeMatrix() {
  matrixW = mc.width  = window.innerWidth;
  matrixH = mc.height = window.innerHeight;
  matrixCols = Math.floor(matrixW / 16);
  drops = new Float32Array(matrixCols).fill(1);
}
resizeMatrix();
window.addEventListener('resize', resizeMatrix, { passive: true });

const chars = 'アイウエオカキクケコサシスセソタチツ01010110ABCDEF<>/\\{}[]∑∆∇⟨⟩★◈⬡';
let matrixFrame = 0;
setInterval(() => {
  matrixFrame++;
  if (matrixFrame % 2 !== 0) return;
  mctx.fillStyle = 'rgba(0,0,0,0.048)';
  mctx.fillRect(0, 0, matrixW, matrixH);
  mctx.font = '13px Share Tech Mono';
  for (let i = 0; i < matrixCols; i++) {
    const ch = chars[Math.floor(Math.random() * chars.length)];
    const r  = Math.random();
    mctx.fillStyle = r > .98 ? '#ffffff' : r > .95 ? '#00e5ff' : r > .92 ? '#ff003c' : r > .89 ? '#b070ff' : '#00ff41';
    mctx.fillText(ch, i * 16, drops[i] * 16);
    if (drops[i] * 16 > matrixH && Math.random() > .977) drops[i] = 0;
    drops[i]++;
  }
}, 40);

/* ═══════════════════════════════════════════════════════════════
   3. HERO PARTICLE SYSTEM
════════════════════════════════════════════════════════════════ */
const pc   = document.getElementById('particle-canvas');
const pctx = pc.getContext('2d');
function resizeParticle() {
  pc.width  = pc.offsetWidth;
  pc.height = pc.offsetHeight;
}
resizeParticle();
window.addEventListener('resize', resizeParticle, { passive: true });

const PARTICLE_N = 80;
const particles  = Array.from({ length: PARTICLE_N }, () => ({
  x: Math.random() * (pc.width || 800),
  y: Math.random() * (pc.height || 600),
  r: Math.random() * 2 + 0.4,
  vx: (Math.random() - .5) * 0.4,
  vy: (Math.random() - .5) * 0.4,
  a: Math.random() * 0.7 + 0.15,
  hue: Math.random() > .9 ? 'accent' : Math.random() > .85 ? 'cyan' : Math.random() > .75 ? 'plasma' : 'green',
  pulse: Math.random() * Math.PI * 2
}));

const LINK_DIST = 130;
function tickParticles() {
  if (!pc.width) return;
  pctx.clearRect(0, 0, pc.width, pc.height);
  const t = state.time * 0.001;
  pctx.lineWidth = 0.5;
  for (let i = 0; i < PARTICLE_N - 1; i++) {
    const a = particles[i];
    for (let j = i + 1; j < PARTICLE_N; j++) {
      const b = particles[j];
      const dx = a.x - b.x, dy = a.y - b.y;
      const d2 = dx * dx + dy * dy;
      if (d2 < LINK_DIST * LINK_DIST) {
        const alpha = 0.18 * (1 - Math.sqrt(d2) / LINK_DIST);
        pctx.strokeStyle = `rgba(0,229,255,${alpha})`;
        pctx.beginPath(); pctx.moveTo(a.x, a.y); pctx.lineTo(b.x, b.y); pctx.stroke();
      }
    }
  }
  particles.forEach(p => {
    p.x += p.vx; p.y += p.vy; p.pulse += 0.025;
    if (p.x < 0 || p.x > pc.width)  p.vx *= -1;
    if (p.y < 0 || p.y > pc.height) p.vy *= -1;
    const a = p.a * (0.7 + 0.3 * Math.sin(p.pulse));
    let color;
    if (p.hue === 'accent')  color = `rgba(255,0,60,${a})`;
    else if (p.hue === 'plasma') color = `rgba(176,112,255,${a})`;
    else if (p.hue === 'cyan') color = `rgba(0,229,255,${a})`;
    else color = `rgba(0,255,65,${a})`;
    pctx.beginPath(); pctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
    pctx.fillStyle = color; pctx.fill();
  });
}

/* ═══════════════════════════════════════════════════════════════
   4. HOLOGRAM GRID (fixed background)
════════════════════════════════════════════════════════════════ */
const holoCanvas = document.createElement('canvas');
holoCanvas.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:1;opacity:0.04;';
document.body.appendChild(holoCanvas);
const hctx = holoCanvas.getContext('2d');
function resizeHolo() { holoCanvas.width = window.innerWidth; holoCanvas.height = window.innerHeight; }
resizeHolo();
window.addEventListener('resize', resizeHolo, { passive: true });

let holoFrame = 0;
function tickHologram(ts) {
  holoFrame++;
  if (holoFrame % 4 !== 0) return;
  const w = holoCanvas.width, h = holoCanvas.height;
  hctx.clearRect(0, 0, w, h);
  const offset = (ts * 0.012) % 40;
  hctx.strokeStyle = '#00ff41'; hctx.lineWidth = 0.5; hctx.beginPath();
  for (let x = offset; x < w; x += 40) { hctx.moveTo(x, 0); hctx.lineTo(x, h); }
  for (let y = offset; y < h; y += 40) { hctx.moveTo(0, y); hctx.lineTo(w, y); }
  hctx.globalAlpha = 0.6; hctx.stroke(); hctx.globalAlpha = 1;
}

/* ═══════════════════════════════════════════════════════════════
   5. ★★★ AI REACTOR CORE — CINEMATIC CENTERPIECE ★★★
   Full Iron-Man / Arc Reactor inspired dynamic canvas animation
════════════════════════════════════════════════════════════════ */
const reactorCanvas = document.getElementById('reactor-canvas');
let reactorCtx = null;
if (reactorCanvas) { reactorCtx = reactorCanvas.getContext('2d'); }

function tickReactor(ts) {
  if (!reactorCtx) return;
  const cv = reactorCanvas;
  const cx = cv.width / 2, cy = cv.height / 2;
  const t  = ts * 0.001;
  const ctx = reactorCtx;

  ctx.clearRect(0, 0, cv.width, cv.height);

  /* ── OUTER DEEP SPACE GLOW ── */
  const outerGlow = ctx.createRadialGradient(cx, cy, 0, cx, cy, cv.width * 0.5);
  outerGlow.addColorStop(0, `rgba(0,229,255,${0.04 + 0.02 * Math.sin(t)})`);
  outerGlow.addColorStop(0.4, `rgba(123,47,255,${0.03 + 0.01 * Math.sin(t * 1.3)})`);
  outerGlow.addColorStop(1, 'transparent');
  ctx.beginPath(); ctx.arc(cx, cy, cv.width * 0.5, 0, Math.PI * 2);
  ctx.fillStyle = outerGlow; ctx.fill();

  /* ── ROTATING OUTER ARCS (3 tiers) ── */
  const arcDefs = [
    { r: 185, speed: 0.18, gaps: 8, w: 1.5, color: [0,229,255], alpha: 0.35 },
    { r: 168, speed: -0.28, gaps: 6, w: 1,   color: [0,255,65],  alpha: 0.28 },
    { r: 152, speed: 0.38, gaps: 10, w: 1.2, color: [176,112,255], alpha: 0.25 },
  ];
  arcDefs.forEach(arc => {
    const rot = t * arc.speed;
    const gapAngle = (Math.PI * 2) / arc.gaps;
    ctx.save(); ctx.translate(cx, cy); ctx.rotate(rot);
    for (let i = 0; i < arc.gaps; i++) {
      const start = i * gapAngle + 0.15;
      const end   = start + gapAngle - 0.3;
      ctx.beginPath(); ctx.arc(0, 0, arc.r, start, end);
      ctx.strokeStyle = `rgba(${arc.color[0]},${arc.color[1]},${arc.color[2]},${arc.alpha + 0.1 * Math.sin(t * 2 + i)})`;
      ctx.lineWidth = arc.w;
      ctx.shadowColor = `rgb(${arc.color[0]},${arc.color[1]},${arc.color[2]})`;
      ctx.shadowBlur = 12;
      ctx.stroke();
    }
    ctx.restore();
  });

  /* ── MIDDLE RINGS (continuous) ── */
  const rings = [
    { r: 138, rot: t * -0.15, alpha: 0.2,  color: [0,229,255], dashes: [8,6] },
    { r: 124, rot: t * 0.22,  alpha: 0.18, color: [0,255,65],  dashes: [5,8] },
    { r: 110, rot: t * -0.3,  alpha: 0.22, color: [123,47,255], dashes: [12,4] },
  ];
  rings.forEach(ring => {
    ctx.save(); ctx.translate(cx, cy); ctx.rotate(ring.rot);
    ctx.setLineDash(ring.dashes);
    ctx.beginPath(); ctx.arc(0, 0, ring.r, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(${ring.color[0]},${ring.color[1]},${ring.color[2]},${ring.alpha + 0.08 * Math.sin(t * 1.5)})`;
    ctx.lineWidth = 1;
    ctx.shadowColor = `rgb(${ring.color[0]},${ring.color[1]},${ring.color[2]})`;
    ctx.shadowBlur = 8;
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
  });

  /* ── INNER GEOMETRIC FRAME (hexagonal orbit system) ── */
  const hexR = 92;
  const hexRot = t * 0.08;
  ctx.save(); ctx.translate(cx, cy); ctx.rotate(hexRot);
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const angle = (i * Math.PI * 2) / 6;
    const x = hexR * Math.cos(angle);
    const y = hexR * Math.sin(angle);
    i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.strokeStyle = `rgba(0,229,255,${0.15 + 0.06 * Math.sin(t * 2)})`;
  ctx.lineWidth = 1.2;
  ctx.shadowColor = '#00e5ff'; ctx.shadowBlur = 10;
  ctx.stroke();
  ctx.restore();

  /* ── ENERGY SPOKES (8 radial beams) ── */
  const spokeRot = t * 0.12;
  for (let i = 0; i < 8; i++) {
    const angle = spokeRot + (i * Math.PI * 2) / 8;
    const pulse = 0.3 + 0.3 * Math.sin(t * 3 + i * 0.8);
    const innerR = 38 + 5 * Math.sin(t * 2 + i);
    const outerR = 98 + 8 * Math.sin(t * 1.5 + i * 1.2);
    const grad = ctx.createLinearGradient(
      cx + innerR * Math.cos(angle), cy + innerR * Math.sin(angle),
      cx + outerR * Math.cos(angle), cy + outerR * Math.sin(angle)
    );
    grad.addColorStop(0, `rgba(0,229,255,${pulse})`);
    grad.addColorStop(1, 'rgba(0,229,255,0)');
    ctx.beginPath();
    ctx.moveTo(cx + innerR * Math.cos(angle), cy + innerR * Math.sin(angle));
    ctx.lineTo(cx + outerR * Math.cos(angle), cy + outerR * Math.sin(angle));
    ctx.strokeStyle = grad;
    ctx.lineWidth = 1.5;
    ctx.shadowColor = '#00e5ff'; ctx.shadowBlur = 6;
    ctx.stroke();
  }

  /* ── INNER BRIGHT RING ── */
  const ringPulse = 0.7 + 0.3 * Math.sin(t * 2.5);
  const innerRingGrad = ctx.createRadialGradient(cx, cy, 30, cx, cy, 42);
  innerRingGrad.addColorStop(0, `rgba(0,229,255,${ringPulse})`);
  innerRingGrad.addColorStop(1, `rgba(0,229,255,0)`);
  ctx.beginPath(); ctx.arc(cx, cy, 36, 0, Math.PI * 2);
  ctx.strokeStyle = `rgba(0,229,255,${0.6 + 0.4 * Math.sin(t * 3)})`;
  ctx.lineWidth = 2.5;
  ctx.shadowColor = '#00e5ff'; ctx.shadowBlur = 30;
  ctx.stroke();

  /* ── PLASMA CORE BALL ── */
  const coreSize = 28 + 3 * Math.sin(t * 4);
  const corePulse2 = 0.5 + 0.5 * Math.sin(t * 3.5);
  const coreGrad = ctx.createRadialGradient(cx - 5, cy - 5, 0, cx, cy, coreSize);
  coreGrad.addColorStop(0, `rgba(255,255,255,${corePulse2})`);
  coreGrad.addColorStop(0.2, `rgba(180,240,255,${0.9 * corePulse2})`);
  coreGrad.addColorStop(0.5, `rgba(0,229,255,${0.7 * corePulse2})`);
  coreGrad.addColorStop(0.8, `rgba(0,100,200,${0.4 * corePulse2})`);
  coreGrad.addColorStop(1, 'transparent');
  ctx.beginPath(); ctx.arc(cx, cy, coreSize, 0, Math.PI * 2);
  ctx.fillStyle = coreGrad;
  ctx.shadowColor = '#00e5ff'; ctx.shadowBlur = 60;
  ctx.fill();
  ctx.shadowBlur = 0;

  /* ── ENERGY FLARES at cardinal points ── */
  const flareRot = t * 0.4;
  for (let i = 0; i < 4; i++) {
    const angle = flareRot + (i * Math.PI) / 2;
    const flareLen = 55 + 20 * Math.sin(t * 2 + i * Math.PI / 2);
    const flareAlpha = 0.5 + 0.4 * Math.sin(t * 3 + i);
    const fx = cx + 32 * Math.cos(angle);
    const fy = cy + 32 * Math.sin(angle);
    const ex = cx + (32 + flareLen) * Math.cos(angle);
    const ey = cy + (32 + flareLen) * Math.sin(angle);
    const flareGrad = ctx.createLinearGradient(fx, fy, ex, ey);
    flareGrad.addColorStop(0, `rgba(0,229,255,${flareAlpha})`);
    flareGrad.addColorStop(0.6, `rgba(123,47,255,${flareAlpha * 0.5})`);
    flareGrad.addColorStop(1, 'rgba(123,47,255,0)');
    ctx.beginPath();
    ctx.moveTo(fx, fy); ctx.lineTo(ex, ey);
    ctx.strokeStyle = flareGrad;
    ctx.lineWidth = 2.5;
    ctx.shadowColor = '#00e5ff'; ctx.shadowBlur = 15;
    ctx.stroke();
    ctx.shadowBlur = 0;
  }

  /* ── ORBITING PARTICLES ── */
  const orbitDefs = [
    { r: 148, n: 3, speed: 0.5,  size: 3,   color: '#00ff41' },
    { r: 120, n: 5, speed: -0.7, size: 2.5, color: '#00e5ff' },
    { r: 92,  n: 2, speed: 1.1,  size: 3.5, color: '#b070ff' },
    { r: 165, n: 4, speed: 0.35, size: 2,   color: '#ff003c' },
  ];
  orbitDefs.forEach(orbit => {
    for (let i = 0; i < orbit.n; i++) {
      const angle = t * orbit.speed + (i * Math.PI * 2) / orbit.n;
      const ox = cx + orbit.r * Math.cos(angle);
      const oy = cy + orbit.r * Math.sin(angle);
      const pAlpha = 0.6 + 0.4 * Math.sin(t * 4 + i);
      ctx.beginPath(); ctx.arc(ox, oy, orbit.size, 0, Math.PI * 2);
      ctx.fillStyle = orbit.color;
      ctx.shadowColor = orbit.color; ctx.shadowBlur = 20;
      ctx.fill();
      ctx.shadowBlur = 0;
      // trail
      for (let s = 1; s <= 4; s++) {
        const ta = angle - s * 0.08 * orbit.speed;
        const tx = cx + orbit.r * Math.cos(ta);
        const ty = cy + orbit.r * Math.sin(ta);
        ctx.beginPath(); ctx.arc(tx, ty, orbit.size * (1 - s * 0.2), 0, Math.PI * 2);
        const hex = orbit.color;
        ctx.fillStyle = hex;
        ctx.globalAlpha = pAlpha * (0.4 / s);
        ctx.fill();
        ctx.globalAlpha = 1;
      }
    }
  });

  /* ── SCANLINE SWEEP across reactor ── */
  const scanY = cy + 160 * Math.sin(t * 0.7);
  const scanGrad = ctx.createLinearGradient(cx - 190, scanY, cx + 190, scanY);
  scanGrad.addColorStop(0, 'transparent');
  scanGrad.addColorStop(0.4, `rgba(0,229,255,${0.06 + 0.04 * Math.sin(t * 3)})`);
  scanGrad.addColorStop(0.6, `rgba(0,229,255,${0.06 + 0.04 * Math.sin(t * 3)})`);
  scanGrad.addColorStop(1, 'transparent');
  ctx.fillStyle = scanGrad;
  ctx.fillRect(cx - 190, scanY - 1, 380, 2);

  /* ── OUTER HALO ── */
  const haloAlpha = 0.06 + 0.03 * Math.sin(t * 1.5);
  const halo = ctx.createRadialGradient(cx, cy, 170, cx, cy, 210);
  halo.addColorStop(0, `rgba(0,229,255,${haloAlpha})`);
  halo.addColorStop(0.5, `rgba(123,47,255,${haloAlpha * 0.7})`);
  halo.addColorStop(1, 'transparent');
  ctx.beginPath(); ctx.arc(cx, cy, 210, 0, Math.PI * 2);
  ctx.fillStyle = halo; ctx.fill();
}

/* ═══════════════════════════════════════════════════════════════
   6. STARS FIELD
════════════════════════════════════════════════════════════════ */
(function() {
  const sf = document.getElementById('stars1');
  if (!sf) return;
  for (let i = 0; i < 80; i++) {
    const s = document.createElement('div');
    const size = Math.random() * 2.5 + 0.5;
    const c = Math.random() > .9 ? '#b070ff' : Math.random() > .8 ? '#00e5ff' : '#fff';
    s.style.cssText = `
      position:absolute;border-radius:50%;
      width:${size}px;height:${size}px;background:${c};
      left:${Math.random()*100}%;top:${Math.random()*100}%;
      box-shadow:0 0 ${size*3}px ${c};
      animation:star-twinkle ${2+Math.random()*4}s ${Math.random()*4}s ease-in-out infinite;
    `;
    sf.appendChild(s);
  }
  const ss = document.createElement('style');
  ss.textContent = `@keyframes star-twinkle{0%,100%{opacity:.15;transform:scale(1)}50%{opacity:1;transform:scale(1.6)}}`;
  document.head.appendChild(ss);
})();

/* ═══════════════════════════════════════════════════════════════
   7. TYPEWRITER
════════════════════════════════════════════════════════════════ */
const phrases = [
  '> INITIATING_WORLD.SYS',
  '> BUILDING_CIVIC_TECH...',
  '> CRAFTING_DIGITAL_SYSTEMS',
  '> DEPLOYING_SOLUTIONS.EXE',
  '> ARCHITECT_OF_CODE',
  '> FULL_STACK_ENGINEER',
];
let phraseIdx = 0, charIdx = 0, deleting = false;
const twEl = document.getElementById('typewriter');
function typeStep() {
  const phrase = phrases[phraseIdx];
  if (!deleting) {
    if (charIdx <= phrase.length) { if (twEl) twEl.textContent = phrase.slice(0, charIdx++); }
    else { deleting = true; setTimeout(typeStep, 1400); return; }
  } else {
    if (charIdx > 0) { if (twEl) twEl.textContent = phrase.slice(0, --charIdx); }
    else { deleting = false; phraseIdx = (phraseIdx + 1) % phrases.length; }
  }
  setTimeout(typeStep, deleting ? 38 : 68);
}
setTimeout(typeStep, 3200);

/* ═══════════════════════════════════════════════════════════════
   8. TERMINAL ANIMATION
════════════════════════════════════════════════════════════════ */
const termLines = [
  { type: 'cmd', text: 'cat profile.json' },
  { type: 'out', cls: 't-key', text: 'mark_dev — Fullstack Engineer' },
  { type: 'out', cls: 't-key', text: 'mission: "build solutions that scale"' },
  { type: 'out', cls: 't-val', text: 'stack: { html, css, js, php, sql }' },
  { type: 'cmd', text: 'ls projects/' },
  { type: 'out', cls: 't-val', text: 'ptdid-portal/  shang-properties/' },
  { type: 'out', cls: 't-val', text: 'vibe-tribe-notions/  custom-crm/' },
  { type: 'cmd', text: 'status --check' },
  { type: 'out', cls: 't-ok',  text: '✓ available for missions' },
  { type: 'out', cls: 't-ok',  text: '✓ clearance: LEVEL 9' },
  { type: 'out', cls: 't-muted', text: '# location: Valenzuela City, PH' },
  { type: 'out', cls: 't-muted', text: '# goal: build → optimize → innovate' },
  { type: 'cmd', text: 'access --grant // ideas_become_impact LIVE' },
  { type: 'out', cls: 't-ok',  text: '■■■■■■■■■■ ACCESS GRANTED' },
];
(function bootTerminal() {
  const tb = document.getElementById('terminal-body');
  if (!tb) return;
  let idx = 0;
  function nextLine() {
    if (idx >= termLines.length) return;
    const l = termLines[idx++];
    const div = document.createElement('div');
    div.className = 't-line';
    if (l.type === 'cmd') {
      div.innerHTML = `<span class="t-prompt">mark@dev:~$</span> <span class="t-cmd">${l.text}</span>`;
    } else {
      div.innerHTML = `<span class="t-out ${l.cls || ''}">${l.text}</span>`;
    }
    tb.appendChild(div);
    tb.scrollTop = tb.scrollHeight;
    setTimeout(nextLine, l.type === 'cmd' ? 800 : 340);
  }
  setTimeout(nextLine, 3500);
})();

/* ═══════════════════════════════════════════════════════════════
   9. SCROLL REVEAL (IntersectionObserver)
════════════════════════════════════════════════════════════════ */
const revealObs = new IntersectionObserver((entries) => {
  entries.forEach(e => {
    if (e.isIntersecting) {
      e.target.classList.add('in-view');
      // Animate tech level bars
      const fill = e.target.querySelector('.tech-level-fill');
      if (fill && fill.dataset.w) fill.style.width = fill.dataset.w;
    }
  });
}, { threshold: 0.1 });

document.querySelectorAll('.reveal').forEach(el => revealObs.observe(el));

/* Store tech bar widths and reset to 0 for animation */
document.querySelectorAll('.tech-level-fill').forEach(fill => {
  fill.dataset.w = fill.style.width;
  fill.style.width = '0';
});

/* ═══════════════════════════════════════════════════════════════
   10. COUNTER ANIMATION
════════════════════════════════════════════════════════════════ */
const counterObs = new IntersectionObserver((entries) => {
  entries.forEach(e => {
    if (e.isIntersecting && !e.target.dataset.done) {
      e.target.dataset.done = '1';
      const target = parseInt(e.target.dataset.target);
      let current = 0;
      const step = Math.ceil(target / 50);
      const timer = setInterval(() => {
        current = Math.min(current + step, target);
        e.target.textContent = current;
        if (current >= target) clearInterval(timer);
      }, 35);
    }
  });
}, { threshold: 0.5 });
document.querySelectorAll('.stat-num').forEach(el => counterObs.observe(el));

/* ═══════════════════════════════════════════════════════════════
   11. PARALLAX
════════════════════════════════════════════════════════════════ */
const sections = Array.from(document.querySelectorAll('section[id]'));
window.addEventListener('scroll', () => {
  state.scrollY = window.scrollY;
  document.querySelectorAll('.parallax-layer[data-depth]').forEach(layer => {
    const depth = parseFloat(layer.dataset.depth);
    const offset = state.scrollY * depth;
    layer.style.transform = `translateY(${offset}px)`;
  });
}, { passive: true });

/* ═══════════════════════════════════════════════════════════════
   12. HEADER SCROLL EFFECT
════════════════════════════════════════════════════════════════ */
const header = document.getElementById('site-header');
window.addEventListener('scroll', () => {
  header && header.classList.toggle('scrolled', window.scrollY > 40);
}, { passive: true });

/* ═══════════════════════════════════════════════════════════════
   13. SIDEBAR LINK ACTIVE
════════════════════════════════════════════════════════════════ */
const sidebarLinks = document.querySelectorAll('.sidebar-link[href^="#"]');
window.addEventListener('scroll', () => {
  let cur = '';
  sections.forEach(s => { if (window.scrollY >= s.offsetTop - 130) cur = s.id; });
  sidebarLinks.forEach(a => {
    const active = a.getAttribute('href') === '#' + cur;
    a.classList.toggle('active', active);
  });
}, { passive: true });

/* ═══════════════════════════════════════════════════════════════
   14. SMOOTH SCROLL
════════════════════════════════════════════════════════════════ */
document.querySelectorAll('a[href^="#"]').forEach(link => {
  link.addEventListener('click', e => {
    const target = document.querySelector(link.getAttribute('href'));
    if (!target) return;
    e.preventDefault();
    target.scrollIntoView({ behavior: 'smooth' });
    // section flash effect
    target.classList.add('section-flash');
    setTimeout(() => target.classList.remove('section-flash'), 900);
    // shockwave
    const sw = document.createElement('div');
    sw.className = 'sec-shockwave';
    target.appendChild(sw);
    setTimeout(() => sw.remove(), 1000);
    // close mobile sidebar
    document.getElementById('sidebar')?.classList.remove('open');
  });
});

/* ═══════════════════════════════════════════════════════════════
   15. TECH STACK TABS
════════════════════════════════════════════════════════════════ */
document.querySelectorAll('.stack-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.stack-tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.stack-panel').forEach(p => p.classList.remove('active'));
    tab.classList.add('active');
    const panel = document.getElementById('stack-' + tab.dataset.tab);
    if (panel) {
      panel.classList.add('active');
      panel.querySelectorAll('.reveal').forEach(el => revealObs.observe(el));
    }
  });
});

/* ═══════════════════════════════════════════════════════════════
   16. PROJECT CAROUSEL
════════════════════════════════════════════════════════════════ */
const carouselWrap = document.getElementById('carousel-wrap');
const dotsContainer = document.getElementById('carousel-dots');
let activeCard = 0;
const updateDots = () => {
  const cards = carouselWrap?.querySelectorAll('.project-card') || [];
  dotsContainer.innerHTML = '';
  cards.forEach((_, i) => {
    const dot = document.createElement('div');
    dot.className = 'carousel-dot' + (i === activeCard ? ' active' : '');
    dot.addEventListener('click', () => scrollToCard(i));
    dotsContainer.appendChild(dot);
  });
};
const scrollToCard = (idx) => {
  const cards = carouselWrap?.querySelectorAll('.project-card') || [];
  if (!cards[idx]) return;
  activeCard = idx;
  cards[idx].scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'start' });
  updateDots();
};
document.getElementById('prev-btn')?.addEventListener('click', () => {
  const cards = carouselWrap?.querySelectorAll('.project-card') || [];
  scrollToCard(Math.max(0, activeCard - 1));
});
document.getElementById('next-btn')?.addEventListener('click', () => {
  const cards = carouselWrap?.querySelectorAll('.project-card') || [];
  scrollToCard(Math.min(cards.length - 1, activeCard + 1));
});
if (carouselWrap) { setTimeout(updateDots, 100); }

/* ═══════════════════════════════════════════════════════════════
   17. 3D TILT on banner
════════════════════════════════════════════════════════════════ */
const banner = document.querySelector('.banner');
if (banner) {
  banner.addEventListener('mousemove', e => {
    const rect = banner.getBoundingClientRect();
    const mx = (e.clientX - rect.left) / rect.width  - 0.5;
    const my = (e.clientY - rect.top)  / rect.height - 0.5;
    banner.style.transform = `perspective(800px) rotateY(${mx * 6}deg) rotateX(${-my * 4}deg)`;
  }, { passive: true });
  banner.addEventListener('mouseleave', () => {
    banner.style.transform = 'perspective(800px) rotateY(0) rotateX(0)';
  });
}

/* ═══════════════════════════════════════════════════════════════
   18. HOLOGRAPHIC CLICK RIPPLE
════════════════════════════════════════════════════════════════ */
document.addEventListener('click', e => {
  const ripple = document.createElement('div');
  ripple.style.cssText = `
    position:fixed;left:${e.clientX}px;top:${e.clientY}px;
    width:0;height:0;border-radius:50%;pointer-events:none;z-index:9999;
    border:2px solid var(--cyan);transform:translate(-50%,-50%);
    animation:holo-ripple .8s ease-out forwards;
  `;
  document.body.appendChild(ripple);
  // second ring
  const r2 = ripple.cloneNode();
  r2.style.animationDelay = '.12s';
  r2.style.borderColor = 'var(--green)';
  document.body.appendChild(r2);
  setTimeout(() => { ripple.remove(); r2.remove(); }, 900);
}, { passive: true });
const rippleStyle = document.createElement('style');
rippleStyle.textContent = `@keyframes holo-ripple{0%{width:0;height:0;opacity:1;border-color:var(--cyan)}100%{width:160px;height:160px;opacity:0;border-color:var(--green)}}`;
document.head.appendChild(rippleStyle);

/* ═══════════════════════════════════════════════════════════════
   19. UFO SPAWNER
════════════════════════════════════════════════════════════════ */
(function () {
  function rand(a, b) { return Math.random() * (b - a) + a; }
  function spawnUFO() {
    if (document.querySelectorAll('.ufo-wrap').length >= 2) return;
    const wrap = document.createElement('div');
    wrap.className = 'ufo-wrap';
    wrap.style.left = rand(10, window.innerWidth - 130) + 'px';
    wrap.style.top  = rand(10, window.innerHeight - 130) + 'px';
    wrap.style.animationDuration = rand(3.5, 5.5).toFixed(2) + 's';
    wrap.innerHTML = `<video class="ufo-video" src="assets/video/ufo.webm" autoplay loop muted playsinline></video><div class="ufo-glow"></div><div class="ufo-beam"></div>`;
    document.body.appendChild(wrap);
    requestAnimationFrame(() => requestAnimationFrame(() => wrap.classList.add('visible')));
    const stay = rand(8000, 18000);
    const driftTimer = setInterval(() => {
      wrap.style.transition = 'left 3.5s ease-in-out, top 3.5s ease-in-out';
      wrap.style.left = rand(10, window.innerWidth - 130) + 'px';
      wrap.style.top  = rand(10, window.innerHeight - 130) + 'px';
    }, 3500);
    setTimeout(() => {
      clearInterval(driftTimer);
      wrap.classList.remove('visible');
      wrap.addEventListener('transitionend', () => wrap.remove(), { once: true });
    }, stay);
  }
  setTimeout(spawnUFO, 2500);
  setInterval(spawnUFO, rand(10000, 22000));
})();

/* ═══════════════════════════════════════════════════════════════
   20. ROCKET SPAWNER
════════════════════════════════════════════════════════════════ */
(function () {
  const DIRS = [
    { angle: 0,   vx: 0,   vy: -1 }, { angle: 45,  vx: .7,  vy: -.7 },
    { angle: 90,  vx: 1,   vy: 0  }, { angle: 135, vx: .7,  vy: .7  },
    { angle: 180, vx: 0,   vy: 1  }, { angle: 225, vx: -.7, vy: .7  },
    { angle: 270, vx: -1,  vy: 0  }, { angle: 315, vx: -.7, vy: -.7 },
  ];
  function rand(a, b) { return Math.random() * (b - a) + a; }
  function spawnRocket() {
    if (document.querySelectorAll('.rocket-wrap').length >= 2) return;
    const dir  = DIRS[Math.floor(rand(0, DIRS.length))];
    const wrap = document.createElement('div');
    wrap.className = 'rocket-wrap';
    const vw = window.innerWidth, vh = window.innerHeight, sz = 160;
    let sx = dir.vx > 0 ? -sz : dir.vx < 0 ? vw + sz : rand(sz, vw - sz);
    let sy = dir.vy > 0 ? -sz : dir.vy < 0 ? vh + sz : rand(sz, vh - sz);
    wrap.style.cssText = `left:${sx}px;top:${sy}px;transform:rotate(${dir.angle}deg)`;
    wrap.innerHTML = `<video class="rocket-video" src="assets/video/rocket.webm" autoplay loop muted playsinline></video><div class="rocket-glow"></div>`;
    document.body.appendChild(wrap);
    requestAnimationFrame(() => requestAnimationFrame(() => wrap.classList.add('visible')));
    const speed = rand(0.35, 0.85);
    let alive = true, last = null, cx = sx, cy = sy;
    function fly(ts) {
      if (!alive) return;
      const dt = last ? ts - last : 16; last = ts;
      cx += dir.vx * speed * dt;
      cy += dir.vy * speed * dt;
      const wobble = Math.sin(ts / 380) * 2.8;
      wrap.style.left = (cx + -dir.vy * wobble) + 'px';
      wrap.style.top  = (cy +  dir.vx * wobble) + 'px';
      requestAnimationFrame(fly);
    }
    requestAnimationFrame(fly);
    setTimeout(() => {
      alive = false;
      wrap.classList.remove('visible');
      wrap.addEventListener('transitionend', () => wrap.remove(), { once: true });
    }, rand(7000, 14000));
  }
  setTimeout(spawnRocket, 3500);
  setInterval(spawnRocket, rand(9000, 16000));
})();

/* ═══════════════════════════════════════════════════════════════
   21. TOGGLE ALL PROJECTS
════════════════════════════════════════════════════════════════ */
let showingAll = false;
window.toggleAllProjects = function() {
  showingAll = !showingAll;
  const grid = document.getElementById('all-projects-grid');
  const btn  = document.getElementById('see-more-btn');
  if (grid) {
    grid.classList.toggle('visible', showingAll);
    if (btn) btn.textContent = showingAll ? '[ COLLAPSE_PROJECTS ]' : '[ LOAD_MORE_PROJECTS ]';
    if (showingAll) grid.querySelectorAll('.reveal:not(.in-view)').forEach(el => revealObs.observe(el));
  }
};

/* ═══════════════════════════════════════════════════════════════
   22. HEADER NAV ACTIVE
════════════════════════════════════════════════════════════════ */
window.addEventListener('scroll', () => {
  let cur = '';
  sections.forEach(s => { if (window.scrollY >= s.offsetTop - 130) cur = s.id; });
  document.querySelectorAll('.header-nav a').forEach(a => {
    a.classList.toggle('active', a.getAttribute('href') === '#' + cur);
  });
}, { passive: true });

/* ═══════════════════════════════════════════════════════════════
   23. DATA STREAM EFFECT
════════════════════════════════════════════════════════════════ */
(function() {
  const sc = document.createElement('div');
  sc.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:0;overflow:hidden;';
  document.body.appendChild(sc);
  function spawnStream() {
    const s = document.createElement('div');
    const x = Math.random() * 100;
    const dur = 5 + Math.random() * 7;
    const cols = ['rgba(0,255,65,0.1)', 'rgba(0,229,255,0.08)', 'rgba(123,47,255,0.07)'];
    s.style.cssText = `position:absolute;left:${x}%;top:-20px;font-family:'Share Tech Mono',monospace;font-size:9px;color:${cols[Math.floor(Math.random()*3)]};writing-mode:vertical-rl;white-space:nowrap;pointer-events:none;animation:stream-fall ${dur}s ${Math.random()*3}s linear infinite;letter-spacing:3px;`;
    s.textContent = Array.from({length:14},()=>Math.floor(Math.random()*2)).join('');
    sc.appendChild(s);
    if (sc.children.length > 25) sc.firstChild.remove();
  }
  const ss = document.createElement('style');
  ss.textContent = `@keyframes stream-fall{from{transform:translateY(-100px);opacity:0}10%{opacity:1}90%{opacity:.7}to{transform:translateY(115vh);opacity:0}}`;
  document.head.appendChild(ss);
  for (let i = 0; i < 10; i++) spawnStream();
  setInterval(spawnStream, 1600);
})();

/* ═══════════════════════════════════════════════════════════════
   24. SIDEBAR TOGGLE
════════════════════════════════════════════════════════════════ */
const sidebarToggle = document.getElementById('sidebar-toggle');
if (sidebarToggle) {
  sidebarToggle.onclick = () => document.getElementById('sidebar').classList.toggle('open');
}

/* ═══════════════════════════════════════════════════════════════
   25. KICK OFF MASTER LOOP
════════════════════════════════════════════════════════════════ */
requestAnimationFrame(masterLoop);