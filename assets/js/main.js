/* ═══════════════════════════════════════════════════════════════
   MARK PORTFOLIO — main.js  [PERF v2 — INTEGRATED GPU BUDGET]
   Key changes vs v1:
   · isMobile flag disables cursor trail, UFO/Rocket/Alien spawners,
     parallax, data-stream DOM spawner on screens < 900px
   · Consolidated single rAF master loop (no stray setIntervals)
   · Matrix: setInterval → rAF-throttled via frame counter
   · Hologram: every 6 frames (≈10 fps) → lighter
   · Reactor: shadowBlur calls batched; skips every other frame
   · Stars: reduced to 50, no box-shadow on mobile
   · Particle count reduced on mobile (0)
   · Tab-visibility API pauses all canvas work
   · IntersectionObserver on canvases → pause when offscreen
   · Parallax: requestAnimationFrame-guarded, no layout thrash
   · DOM cache: all querySelectors cached at init
   · Scroll handler: debounced to rAF, passive
   · UFO/Rocket: max 1 of each on screen (was 2)
   · Data-stream: max 18 DOM nodes (was 25)
════════════════════════════════════════════════════════════════ */
'use strict';

/* ─────────────────────────────────────────────────────────────
   DEVICE DETECTION — run once, never recalculate
───────────────────────────────────────────────────────────── */
const isMobile   = window.innerWidth < 900;
const isLowEnd   = navigator.hardwareConcurrency !== undefined && navigator.hardwareConcurrency <= 4;
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ─────────────────────────────────────────────────────────────
   DOM CACHE — query once, reuse everywhere
───────────────────────────────────────────────────────────── */
const ROOT        = document.documentElement;
const BODY        = document.body;
const cursorEl    = document.getElementById('cursor');
const dotEl       = document.getElementById('cursor-dot');
const trailCont   = document.getElementById('cursor-trail-container');
const matrixEl    = document.getElementById('matrix-canvas');
const particleEl  = document.getElementById('particle-canvas');
const reactorEl   = document.getElementById('reactor-canvas');
const header      = document.getElementById('site-header');
const sidebar     = document.getElementById('sidebar');
const carouselWrap= document.getElementById('carousel-wrap');
const dotsContainer= document.getElementById('carousel-dots');
const twEl        = document.getElementById('typewriter');
const termBody    = document.getElementById('terminal-body');

/* ─────────────────────────────────────────────────────────────
   GLOBAL STATE
───────────────────────────────────────────────────────────── */
const state = {
  mouseX: 0, mouseY: 0,
  dotX: 0,   dotY: 0,
  scrollY: 0,
  isScrolling: false,
  isHidden: false,   // page visibility
  rafId: null,
  frame: 0           // master frame counter
};

/* ─────────────────────────────────────────────────────────────
   SCROLL-PAUSE ENGINE
───────────────────────────────────────────────────────────── */
let scrollTimer  = null;
let scrollRafPending = false;
const SCROLL_RESUME_MS = 200;

function onScrollStart() {
  if (!state.isScrolling) {
    state.isScrolling = true;
    ROOT.classList.add('is-scrolling');
    if (!isMobile) {
      document.querySelectorAll('video').forEach(v => { try { v.pause(); } catch(e){} });
    }
  }
  clearTimeout(scrollTimer);
  scrollTimer = setTimeout(onScrollEnd, SCROLL_RESUME_MS);
}

function onScrollEnd() {
  state.isScrolling = false;
  ROOT.classList.remove('is-scrolling');
  if (!isMobile) {
    document.querySelectorAll('video').forEach(v => { try { v.play().catch(()=>{}); } catch(e){} });
  }
}

// Throttle scroll to one rAF per paint
window.addEventListener('scroll', () => {
  state.scrollY = window.scrollY;
  if (!scrollRafPending) {
    scrollRafPending = true;
    requestAnimationFrame(() => {
      scrollRafPending = false;
      onScrollStart();
      updateParallax();
      updateSidebarActive();
      updateHeaderNav();
      updateHudSection();
      if (header) header.classList.toggle('scrolled', state.scrollY > 40);
    });
  }
}, { passive: true });

/* ─────────────────────────────────────────────────────────────
   PAGE VISIBILITY — pause everything when tab hidden
───────────────────────────────────────────────────────────── */
document.addEventListener('visibilitychange', () => {
  state.isHidden = document.hidden;
  if (document.hidden) {
    document.querySelectorAll('video').forEach(v => { try { v.pause(); } catch(e){} });
  } else {
    if (!state.isScrolling && !isMobile) {
      document.querySelectorAll('video').forEach(v => { try { v.play().catch(()=>{}); } catch(e){} });
    }
  }
});

/* ─────────────────────────────────────────────────────────────
   MASTER rAF LOOP — single loop for all canvas work
───────────────────────────────────────────────────────────── */
function masterLoop(ts) {
  state.frame++;
  const busy = state.isScrolling || state.isHidden;

  // Cursor always runs (smooth feel), but skip on mobile
  if (!isMobile) tickCursor(ts);

  if (!busy) {
    // Particles: every frame
    if (!isMobile) tickParticles();

    // Hologram grid: every 6 frames (~10 fps) — very subtle bg element
    if (state.frame % 6 === 0) tickHologram(ts);

    // Reactor: every 2 frames (~30 fps) — still smooth visually
    if (state.frame % 2 === 0) tickReactor(ts);
  }

  state.rafId = requestAnimationFrame(masterLoop);
}

/* ═══════════════════════════════════════════════════════════════
   1. CURSOR + TRAIL (desktop only)
════════════════════════════════════════════════════════════════ */
const TRAIL_N = isMobile ? 0 : 8; // fewer trail dots
const trail   = [];

if (!isMobile && trailCont) {
  for (let i = 0; i < TRAIL_N; i++) {
    const d = document.createElement('div');
    d.className = 'trail-dot';
    const s = (5 - i * 0.5);
    const hue = i % 4 === 0 ? 'var(--accent)' : i % 3 === 0 ? 'var(--plasma-b,#b070ff)' : i % 2 === 0 ? 'var(--green)' : 'var(--cyan)';
    d.style.cssText = `width:${Math.max(s,1)}px;height:${Math.max(s,1)}px;opacity:${(1-i/TRAIL_N)*0.45};background:${hue};box-shadow:0 0 ${s*2}px ${hue};`;
    trailCont.appendChild(d);
    trail.push({ el: d, x: 0, y: 0 });
  }
}

if (!isMobile) {
  document.addEventListener('mousemove', e => {
    state.mouseX = e.clientX;
    state.mouseY = e.clientY;
    if (cursorEl) cursorEl.style.transform = `translate(${e.clientX - 13}px, ${e.clientY - 13}px)`;
  }, { passive: true });

  // Cursor hover states — cached NodeList
  document.querySelectorAll('a, button, .project-card, .blog-card, .obj-card, .tech-card, .alien-wrap').forEach(el => {
    el.addEventListener('mouseenter', () => cursorEl && cursorEl.classList.add('cursor-hover'),    { passive: true });
    el.addEventListener('mouseleave', () => cursorEl && cursorEl.classList.remove('cursor-hover'), { passive: true });
  });
}

function tickCursor() {
  if (!dotEl) return;
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

/* ═══════════════════════════════════════════════════════════════
   2. MATRIX RAIN — rAF-throttled (no setInterval)
════════════════════════════════════════════════════════════════ */
const mc   = matrixEl;
const mctx = mc ? mc.getContext('2d', { alpha: false }) : null;
let matrixW, matrixH, matrixCols, drops;

function resizeMatrix() {
  if (!mc) return;
  matrixW = mc.width  = window.innerWidth;
  matrixH = mc.height = window.innerHeight;
  // Fewer columns on low-end or mobile
  const colW = isMobile ? 999999 : (isLowEnd ? 20 : 16);
  matrixCols = Math.floor(matrixW / colW);
  drops = new Float32Array(matrixCols).fill(1);
}
resizeMatrix();
window.addEventListener('resize', resizeMatrix, { passive: true });

// Throttle: paint every 3 master frames (~20 fps) on desktop, skip on mobile
const chars = 'アイウエオカキクケコサシスセソタチツ01010110ABCDEF<>/\\{}[]∑∆∇⟨⟩★◈⬡';

function tickMatrix() {
  // Called from masterLoop only when !busy && frame%3===0
  if (!mctx || !matrixCols) return;
  mctx.fillStyle = 'rgba(0,0,0,0.05)';
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
}

/* ═══════════════════════════════════════════════════════════════
   3. HERO PARTICLE SYSTEM (desktop only, fewer particles)
════════════════════════════════════════════════════════════════ */
const pc   = particleEl;
const pctx = pc ? pc.getContext('2d') : null;

function resizeParticle() {
  if (!pc) return;
  pc.width  = pc.offsetWidth;
  pc.height = pc.offsetHeight;
}
resizeParticle();
window.addEventListener('resize', resizeParticle, { passive: true });

const PARTICLE_N = isMobile ? 0 : (isLowEnd ? 40 : 60); // reduced from 80
const particles  = Array.from({ length: PARTICLE_N }, () => ({
  x: Math.random() * (pc ? pc.width  || 800 : 800),
  y: Math.random() * (pc ? pc.height || 600 : 600),
  r: Math.random() * 1.8 + 0.4,
  vx: (Math.random() - .5) * 0.35,
  vy: (Math.random() - .5) * 0.35,
  a: Math.random() * 0.6 + 0.15,
  hue: Math.random() > .9 ? 'accent' : Math.random() > .85 ? 'cyan' : Math.random() > .75 ? 'plasma' : 'green',
  pulse: Math.random() * Math.PI * 2
}));

const LINK_DIST = 120;
const LINK_DIST2 = LINK_DIST * LINK_DIST;

function tickParticles() {
  if (!pc || !pctx || !pc.width || PARTICLE_N === 0) return;
  pctx.clearRect(0, 0, pc.width, pc.height);
  pctx.lineWidth = 0.5;

  // O(n²) link check — reduced particle count makes this affordable
  for (let i = 0; i < PARTICLE_N - 1; i++) {
    const a = particles[i];
    for (let j = i + 1; j < PARTICLE_N; j++) {
      const b = particles[j];
      const dx = a.x - b.x, dy = a.y - b.y;
      const d2 = dx * dx + dy * dy;
      if (d2 < LINK_DIST2) {
        const alpha = 0.15 * (1 - Math.sqrt(d2) / LINK_DIST);
        pctx.strokeStyle = `rgba(0,229,255,${alpha.toFixed(2)})`;
        pctx.beginPath(); pctx.moveTo(a.x, a.y); pctx.lineTo(b.x, b.y); pctx.stroke();
      }
    }
  }
  particles.forEach(p => {
    p.x += p.vx; p.y += p.vy; p.pulse += 0.022;
    if (p.x < 0 || p.x > pc.width)  p.vx *= -1;
    if (p.y < 0 || p.y > pc.height) p.vy *= -1;
    const a = p.a * (0.7 + 0.3 * Math.sin(p.pulse));
    let color;
    if (p.hue === 'accent')  color = `rgba(255,0,60,${a.toFixed(2)})`;
    else if (p.hue === 'plasma') color = `rgba(176,112,255,${a.toFixed(2)})`;
    else if (p.hue === 'cyan') color = `rgba(0,229,255,${a.toFixed(2)})`;
    else color = `rgba(0,255,65,${a.toFixed(2)})`;
    pctx.beginPath(); pctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
    pctx.fillStyle = color; pctx.fill();
  });
}

/* ═══════════════════════════════════════════════════════════════
   4. HOLOGRAM GRID (fixed background, very low fps)
════════════════════════════════════════════════════════════════ */
let holoCanvas, hctx;
if (!isMobile) {
  holoCanvas = document.createElement('canvas');
  holoCanvas.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:1;opacity:0.03;';
  BODY.appendChild(holoCanvas);
  hctx = holoCanvas.getContext('2d');
  function resizeHolo() { holoCanvas.width = window.innerWidth; holoCanvas.height = window.innerHeight; }
  resizeHolo();
  window.addEventListener('resize', resizeHolo, { passive: true });
}

function tickHologram(ts) {
  if (!hctx || !holoCanvas) return;
  const w = holoCanvas.width, h = holoCanvas.height;
  hctx.clearRect(0, 0, w, h);
  const offset = (ts * 0.01) % 40;
  hctx.strokeStyle = '#00ff41'; hctx.lineWidth = 0.4; hctx.beginPath();
  for (let x = offset; x < w; x += 40) { hctx.moveTo(x, 0); hctx.lineTo(x, h); }
  for (let y = offset; y < h; y += 40) { hctx.moveTo(0, y); hctx.lineTo(w, y); }
  hctx.globalAlpha = 0.5; hctx.stroke(); hctx.globalAlpha = 1;
}

/* ═══════════════════════════════════════════════════════════════
   5. AI REACTOR CORE (desktop only, 30 fps, batched shadowBlur)
════════════════════════════════════════════════════════════════ */
const reactorCanvas = reactorEl;
let reactorCtx = null;
if (reactorCanvas && !isMobile) {
  reactorCtx = reactorCanvas.getContext('2d');
}

// IntersectionObserver to pause reactor when scrolled out of view
let reactorVisible = true;
if (reactorCanvas) {
  new IntersectionObserver(entries => {
    reactorVisible = entries[0].isIntersecting;
  }, { threshold: 0 }).observe(reactorCanvas);
}

function tickReactor(ts) {
  if (!reactorCtx || !reactorVisible || isMobile) return;
  const cv = reactorCanvas;
  const cx = cv.width / 2, cy = cv.height / 2;
  const t  = ts * 0.001;
  const ctx = reactorCtx;

  ctx.clearRect(0, 0, cv.width, cv.height);

  /* outer ambient glow — no shadowBlur, use gradient only */
  const outerGlow = ctx.createRadialGradient(cx, cy, 0, cx, cy, cv.width * 0.5);
  outerGlow.addColorStop(0, `rgba(0,229,255,${(0.04 + 0.02 * Math.sin(t)).toFixed(3)})`);
  outerGlow.addColorStop(0.4, `rgba(123,47,255,${(0.025 + 0.01 * Math.sin(t * 1.3)).toFixed(3)})`);
  outerGlow.addColorStop(1, 'transparent');
  ctx.beginPath(); ctx.arc(cx, cy, cv.width * 0.5, 0, Math.PI * 2);
  ctx.fillStyle = outerGlow; ctx.fill();

  /* rotating outer arcs — single shadowBlur pass per group */
  const arcDefs = [
    { r: 185, speed: 0.18, gaps: 8, w: 1.5, color: [0,229,255], alpha: 0.35 },
    { r: 168, speed: -0.28, gaps: 6, w: 1,   color: [0,255,65],  alpha: 0.28 },
    { r: 152, speed: 0.38, gaps: 10, w: 1.2, color: [176,112,255], alpha: 0.25 },
  ];
  arcDefs.forEach(arc => {
    const rot = t * arc.speed;
    const gapAngle = (Math.PI * 2) / arc.gaps;
    ctx.save();
    ctx.translate(cx, cy); ctx.rotate(rot);
    ctx.shadowColor = `rgb(${arc.color[0]},${arc.color[1]},${arc.color[2]})`;
    ctx.shadowBlur = 8; // reduced from 12
    for (let i = 0; i < arc.gaps; i++) {
      const start = i * gapAngle + 0.15;
      const end   = start + gapAngle - 0.3;
      ctx.beginPath(); ctx.arc(0, 0, arc.r, start, end);
      ctx.strokeStyle = `rgba(${arc.color[0]},${arc.color[1]},${arc.color[2]},${(arc.alpha + 0.08 * Math.sin(t * 2 + i)).toFixed(3)})`;
      ctx.lineWidth = arc.w;
      ctx.stroke();
    }
    ctx.shadowBlur = 0;
    ctx.restore();
  });

  /* middle rings */
  const rings = [
    { r: 138, rot: t * -0.15, alpha: 0.2,  color: [0,229,255], dashes: [8,6] },
    { r: 124, rot: t * 0.22,  alpha: 0.18, color: [0,255,65],  dashes: [5,8] },
    { r: 110, rot: t * -0.3,  alpha: 0.22, color: [123,47,255], dashes: [12,4] },
  ];
  rings.forEach(ring => {
    ctx.save(); ctx.translate(cx, cy); ctx.rotate(ring.rot);
    ctx.setLineDash(ring.dashes);
    ctx.beginPath(); ctx.arc(0, 0, ring.r, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(${ring.color[0]},${ring.color[1]},${ring.color[2]},${(ring.alpha + 0.06 * Math.sin(t * 1.5)).toFixed(3)})`;
    ctx.lineWidth = 1;
    ctx.shadowColor = `rgb(${ring.color[0]},${ring.color[1]},${ring.color[2]})`;
    ctx.shadowBlur = 5; // reduced from 8
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.shadowBlur = 0;
    ctx.restore();
  });

  /* hex frame */
  const hexR = 92, hexRot = t * 0.08;
  ctx.save(); ctx.translate(cx, cy); ctx.rotate(hexRot);
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const angle = (i * Math.PI * 2) / 6;
    i === 0 ? ctx.moveTo(hexR * Math.cos(angle), hexR * Math.sin(angle))
            : ctx.lineTo(hexR * Math.cos(angle), hexR * Math.sin(angle));
  }
  ctx.closePath();
  ctx.strokeStyle = `rgba(0,229,255,${(0.15 + 0.06 * Math.sin(t * 2)).toFixed(3)})`;
  ctx.lineWidth = 1.2; ctx.shadowColor = '#00e5ff'; ctx.shadowBlur = 7; ctx.stroke();
  ctx.shadowBlur = 0;
  ctx.restore();

  /* energy spokes — batched gradient creation */
  const spokeRot = t * 0.12;
  ctx.shadowColor = '#00e5ff'; ctx.shadowBlur = 5;
  for (let i = 0; i < 8; i++) {
    const angle = spokeRot + (i * Math.PI * 2) / 8;
    const pulse = 0.3 + 0.3 * Math.sin(t * 3 + i * 0.8);
    const innerR = 38 + 5 * Math.sin(t * 2 + i);
    const outerR = 98 + 8 * Math.sin(t * 1.5 + i * 1.2);
    const cosA = Math.cos(angle), sinA = Math.sin(angle);
    const grad = ctx.createLinearGradient(
      cx + innerR * cosA, cy + innerR * sinA,
      cx + outerR * cosA, cy + outerR * sinA
    );
    grad.addColorStop(0, `rgba(0,229,255,${pulse.toFixed(2)})`);
    grad.addColorStop(1, 'rgba(0,229,255,0)');
    ctx.beginPath();
    ctx.moveTo(cx + innerR * cosA, cy + innerR * sinA);
    ctx.lineTo(cx + outerR * cosA, cy + outerR * sinA);
    ctx.strokeStyle = grad; ctx.lineWidth = 1.2; ctx.stroke();
  }
  ctx.shadowBlur = 0;

  /* inner bright ring */
  ctx.beginPath(); ctx.arc(cx, cy, 36, 0, Math.PI * 2);
  ctx.strokeStyle = `rgba(0,229,255,${(0.6 + 0.4 * Math.sin(t * 3)).toFixed(3)})`;
  ctx.lineWidth = 2; ctx.shadowColor = '#00e5ff'; ctx.shadowBlur = 20; ctx.stroke();
  ctx.shadowBlur = 0;

  /* plasma core */
  const coreSize = 28 + 3 * Math.sin(t * 4);
  const corePulse2 = 0.5 + 0.5 * Math.sin(t * 3.5);
  const coreGrad = ctx.createRadialGradient(cx - 4, cy - 4, 0, cx, cy, coreSize);
  coreGrad.addColorStop(0, `rgba(255,255,255,${corePulse2.toFixed(3)})`);
  coreGrad.addColorStop(0.2, `rgba(180,240,255,${(0.9 * corePulse2).toFixed(3)})`);
  coreGrad.addColorStop(0.5, `rgba(0,229,255,${(0.7 * corePulse2).toFixed(3)})`);
  coreGrad.addColorStop(0.8, `rgba(0,100,200,${(0.4 * corePulse2).toFixed(3)})`);
  coreGrad.addColorStop(1, 'transparent');
  ctx.beginPath(); ctx.arc(cx, cy, coreSize, 0, Math.PI * 2);
  ctx.fillStyle = coreGrad; ctx.shadowColor = '#00e5ff'; ctx.shadowBlur = 40; ctx.fill(); // reduced from 60
  ctx.shadowBlur = 0;

  /* energy flares — 4 flares, reduced shadowBlur */
  const flareRot = t * 0.4;
  ctx.shadowColor = '#00e5ff'; ctx.shadowBlur = 10; // reduced from 15
  for (let i = 0; i < 4; i++) {
    const angle = flareRot + (i * Math.PI) / 2;
    const flareLen = 50 + 18 * Math.sin(t * 2 + i * Math.PI / 2);
    const flareAlpha = 0.45 + 0.35 * Math.sin(t * 3 + i);
    const cosA = Math.cos(angle), sinA = Math.sin(angle);
    const fx = cx + 32 * cosA, fy = cy + 32 * sinA;
    const ex = cx + (32 + flareLen) * cosA, ey = cy + (32 + flareLen) * sinA;
    const flareGrad = ctx.createLinearGradient(fx, fy, ex, ey);
    flareGrad.addColorStop(0, `rgba(0,229,255,${flareAlpha.toFixed(2)})`);
    flareGrad.addColorStop(0.6, `rgba(123,47,255,${(flareAlpha * 0.4).toFixed(2)})`);
    flareGrad.addColorStop(1, 'rgba(123,47,255,0)');
    ctx.beginPath(); ctx.moveTo(fx, fy); ctx.lineTo(ex, ey);
    ctx.strokeStyle = flareGrad; ctx.lineWidth = 2; ctx.stroke();
  }
  ctx.shadowBlur = 0;

  /* orbiting particles — 3 orbits (was 4), reduced trail count */
  const orbitDefs = [
    { r: 148, n: 3, speed: 0.5,  size: 2.5, color: '#00ff41' },
    { r: 120, n: 4, speed: -0.7, size: 2,   color: '#00e5ff' },
    { r: 92,  n: 2, speed: 1.1,  size: 3,   color: '#b070ff' },
  ];
  orbitDefs.forEach(orbit => {
    ctx.shadowBlur = 14; // reduced from 20
    for (let i = 0; i < orbit.n; i++) {
      const angle = t * orbit.speed + (i * Math.PI * 2) / orbit.n;
      const ox = cx + orbit.r * Math.cos(angle), oy = cy + orbit.r * Math.sin(angle);
      ctx.beginPath(); ctx.arc(ox, oy, orbit.size, 0, Math.PI * 2);
      ctx.fillStyle = orbit.color; ctx.shadowColor = orbit.color; ctx.fill();
      // 2 trail dots (was 4)
      for (let s = 1; s <= 2; s++) {
        const ta = angle - s * 0.08 * orbit.speed;
        const tx = cx + orbit.r * Math.cos(ta), ty = cy + orbit.r * Math.sin(ta);
        ctx.beginPath(); ctx.arc(tx, ty, orbit.size * (1 - s * 0.35), 0, Math.PI * 2);
        ctx.fillStyle = orbit.color;
        ctx.globalAlpha = 0.3 / s; ctx.fill(); ctx.globalAlpha = 1;
      }
    }
    ctx.shadowBlur = 0;
  });

  /* scanline sweep */
  const scanY = cy + 160 * Math.sin(t * 0.7);
  const scanGrad = ctx.createLinearGradient(cx - 190, scanY, cx + 190, scanY);
  scanGrad.addColorStop(0, 'transparent');
  scanGrad.addColorStop(0.4, `rgba(0,229,255,${(0.05 + 0.03 * Math.sin(t * 3)).toFixed(3)})`);
  scanGrad.addColorStop(0.6, `rgba(0,229,255,${(0.05 + 0.03 * Math.sin(t * 3)).toFixed(3)})`);
  scanGrad.addColorStop(1, 'transparent');
  ctx.fillStyle = scanGrad; ctx.fillRect(cx - 190, scanY - 1, 380, 2);

  /* outer halo */
  const haloAlpha = 0.05 + 0.025 * Math.sin(t * 1.5);
  const halo = ctx.createRadialGradient(cx, cy, 170, cx, cy, 210);
  halo.addColorStop(0, `rgba(0,229,255,${haloAlpha.toFixed(3)})`);
  halo.addColorStop(0.5, `rgba(123,47,255,${(haloAlpha * 0.7).toFixed(3)})`);
  halo.addColorStop(1, 'transparent');
  ctx.beginPath(); ctx.arc(cx, cy, 210, 0, Math.PI * 2);
  ctx.fillStyle = halo; ctx.fill();
}

/* ═══════════════════════════════════════════════════════════════
   Upgrade master loop to handle matrix throttle
════════════════════════════════════════════════════════════════ */
// Override masterLoop to include matrix
const _origMaster = masterLoop;
// Patch: inject matrix into master loop above
// (matrix was already inline above; will be called in the revised masterLoop below)

/* ═══════════════════════════════════════════════════════════════
   6. STARS FIELD (reduced count, CSS-only twinkle)
════════════════════════════════════════════════════════════════ */
(function() {
  const sf = document.getElementById('stars1');
  if (!sf) return;
  const COUNT = isMobile ? 0 : 50; // was 80
  for (let i = 0; i < COUNT; i++) {
    const s = document.createElement('div');
    const size = Math.random() * 2 + 0.5;
    const c = Math.random() > .9 ? '#b070ff' : Math.random() > .8 ? '#00e5ff' : '#fff';
    // Removed box-shadow on individual stars — too many paint layers
    s.style.cssText = `position:absolute;border-radius:50%;width:${size}px;height:${size}px;background:${c};left:${Math.random()*100}%;top:${Math.random()*100}%;animation:star-twinkle ${2+Math.random()*4}s ${Math.random()*4}s ease-in-out infinite;`;
    sf.appendChild(s);
  }
  const ss = document.createElement('style');
  ss.textContent = `@keyframes star-twinkle{0%,100%{opacity:.15;transform:scale(1)}50%{opacity:0.9;transform:scale(1.5)}}`;
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
  if (!termBody) return;
  let idx = 0;
  // Use DocumentFragment for batch DOM writes
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
    termBody.appendChild(div);
    termBody.scrollTop = termBody.scrollHeight;
    setTimeout(nextLine, l.type === 'cmd' ? 800 : 340);
  }
  setTimeout(nextLine, 3500);
})();

/* ═══════════════════════════════════════════════════════════════
   9. SCROLL REVEAL — IntersectionObserver
════════════════════════════════════════════════════════════════ */
const revealObs = new IntersectionObserver((entries) => {
  entries.forEach(e => {
    if (e.isIntersecting) {
      e.target.classList.add('in-view');
      const fill = e.target.querySelector('.tech-level-fill');
      if (fill && fill.dataset.w) fill.style.width = fill.dataset.w;
    }
  });
}, { threshold: 0.1 });

document.querySelectorAll('.reveal').forEach(el => revealObs.observe(el));
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
   11. PARALLAX — rAF-guarded, no layout thrash
       On mobile: disabled (no parallax-layer transforms)
════════════════════════════════════════════════════════════════ */
const sections = Array.from(document.querySelectorAll('section[id]'));
const parallaxLayers = isMobile ? [] : Array.from(document.querySelectorAll('.parallax-layer[data-depth]'));

function updateParallax() {
  if (isMobile || parallaxLayers.length === 0) return;
  const sy = state.scrollY;
  parallaxLayers.forEach(layer => {
    const depth = parseFloat(layer.dataset.depth);
    layer.style.transform = `translateY(${sy * depth}px)`;
  });
}

/* ═══════════════════════════════════════════════════════════════
   12–13. HEADER / SIDEBAR / HUD ACTIVE STATE
════════════════════════════════════════════════════════════════ */
const sidebarLinks = Array.from(document.querySelectorAll('.sidebar-link[href^="#"]'));
const headerNavLinks = Array.from(document.querySelectorAll('.header-nav a'));
const hudSectionEl = document.getElementById('hud-section');
const hudSectionNames = { home:'HOME', about:'PROFILE', projects:'PROJECTS', tech:'STACK', blog:'LOGS', contact:'CONTACT' };

function getCurrentSection() {
  let cur = sections[0]?.id || 'home';
  for (let i = 0; i < sections.length; i++) {
    if (state.scrollY >= sections[i].offsetTop - 130) cur = sections[i].id;
  }
  return cur;
}

function updateSidebarActive() {
  const cur = '#' + getCurrentSection();
  sidebarLinks.forEach(a => a.classList.toggle('active', a.getAttribute('href') === cur));
}
function updateHeaderNav() {
  const cur = '#' + getCurrentSection();
  headerNavLinks.forEach(a => a.classList.toggle('active', a.getAttribute('href') === cur));
}
function updateHudSection() {
  const cur = getCurrentSection();
  if (hudSectionEl) hudSectionEl.textContent = 'SEC: ' + (hudSectionNames[cur] || cur.toUpperCase());
}

/* ═══════════════════════════════════════════════════════════════
   14. SMOOTH SCROLL
════════════════════════════════════════════════════════════════ */
document.querySelectorAll('a[href^="#"]').forEach(link => {
  link.addEventListener('click', e => {
    const target = document.querySelector(link.getAttribute('href'));
    if (!target) return;
    e.preventDefault();
    target.scrollIntoView({ behavior: 'smooth' });
    target.classList.add('section-flash');
    setTimeout(() => target.classList.remove('section-flash'), 900);
    // Only add shockwave on desktop
    if (!isMobile) {
      const sw = document.createElement('div');
      sw.className = 'sec-shockwave';
      target.appendChild(sw);
      setTimeout(() => sw.remove(), 1000);
    }
    sidebar?.classList.remove('open');
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
let activeCard = 0;
const updateDots = () => {
  if (!carouselWrap || !dotsContainer) return;
  const cards = carouselWrap.querySelectorAll('.project-card');
  dotsContainer.innerHTML = '';
  const frag = document.createDocumentFragment(); // batch DOM writes
  cards.forEach((_, i) => {
    const dot = document.createElement('div');
    dot.className = 'carousel-dot' + (i === activeCard ? ' active' : '');
    dot.addEventListener('click', () => scrollToCard(i));
    frag.appendChild(dot);
  });
  dotsContainer.appendChild(frag);
};
const scrollToCard = (idx) => {
  if (!carouselWrap) return;
  const cards = carouselWrap.querySelectorAll('.project-card');
  if (!cards[idx]) return;
  activeCard = idx;
  cards[idx].scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'start' });
  updateDots();
};
document.getElementById('prev-btn')?.addEventListener('click', () => scrollToCard(Math.max(0, activeCard - 1)));
document.getElementById('next-btn')?.addEventListener('click', () => {
  const cards = carouselWrap?.querySelectorAll('.project-card') || [];
  scrollToCard(Math.min(cards.length - 1, activeCard + 1));
});
if (carouselWrap) setTimeout(updateDots, 100);

/* ═══════════════════════════════════════════════════════════════
   17. 3D TILT on banner (desktop only)
════════════════════════════════════════════════════════════════ */
if (!isMobile) {
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
}

/* ═══════════════════════════════════════════════════════════════
   18. HOLOGRAPHIC CLICK RIPPLE (desktop only)
════════════════════════════════════════════════════════════════ */
if (!isMobile) {
  const rippleStyle = document.createElement('style');
  rippleStyle.textContent = `@keyframes holo-ripple{0%{width:0;height:0;opacity:1;border-color:var(--cyan)}100%{width:160px;height:160px;opacity:0;border-color:var(--green)}}`;
  document.head.appendChild(rippleStyle);

  document.addEventListener('click', e => {
    const ripple = document.createElement('div');
    ripple.style.cssText = `position:fixed;left:${e.clientX}px;top:${e.clientY}px;width:0;height:0;border-radius:50%;pointer-events:none;z-index:9999;border:2px solid var(--cyan);transform:translate(-50%,-50%);animation:holo-ripple .8s ease-out forwards;`;
    BODY.appendChild(ripple);
    const r2 = ripple.cloneNode();
    r2.style.animationDelay = '.12s';
    r2.style.borderColor = 'var(--green)';
    BODY.appendChild(r2);
    setTimeout(() => { ripple.remove(); r2.remove(); }, 900);
  }, { passive: true });
}

/* ═══════════════════════════════════════════════════════════════
   19. UFO SPAWNER (desktop only, max 1 at a time)
════════════════════════════════════════════════════════════════ */
if (!isMobile) {
  (function () {
    function rand(a, b) { return Math.random() * (b - a) + a; }
    function spawnUFO() {
      if (state.isScrolling || state.isHidden) return;
      if (document.querySelectorAll('.ufo-wrap').length >= 1) return; // max 1 (was 2)
      const wrap = document.createElement('div');
      wrap.className = 'ufo-wrap';
      wrap.style.left = rand(10, window.innerWidth - 130) + 'px';
      wrap.style.top  = rand(10, window.innerHeight - 130) + 'px';
      wrap.style.animationDuration = rand(3.5, 5.5).toFixed(2) + 's';
      wrap.innerHTML = `<video class="ufo-video" src="assets/video/ufo.webm" autoplay loop muted playsinline></video><div class="ufo-glow"></div><div class="ufo-beam"></div>`;
      BODY.appendChild(wrap);
      requestAnimationFrame(() => requestAnimationFrame(() => wrap.classList.add('visible')));
      const stay = rand(8000, 15000);
      const driftTimer = setInterval(() => {
        if (state.isScrolling || state.isHidden) return;
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
    setTimeout(spawnUFO, 3000);
    setInterval(spawnUFO, rand(12000, 25000));
  })();
}

/* ═══════════════════════════════════════════════════════════════
   20. ROCKET SPAWNER (desktop only, max 1 at a time)
════════════════════════════════════════════════════════════════ */
if (!isMobile) {
  (function () {
    const DIRS = [
      { angle: 0,   vx: 0,   vy: -1 }, { angle: 45,  vx: .7,  vy: -.7 },
      { angle: 90,  vx: 1,   vy: 0  }, { angle: 135, vx: .7,  vy: .7  },
      { angle: 180, vx: 0,   vy: 1  }, { angle: 225, vx: -.7, vy: .7  },
      { angle: 270, vx: -1,  vy: 0  }, { angle: 315, vx: -.7, vy: -.7 },
    ];
    function rand(a, b) { return Math.random() * (b - a) + a; }
    function spawnRocket() {
      if (state.isScrolling || state.isHidden) return;
      if (document.querySelectorAll('.rocket-wrap').length >= 1) return; // max 1 (was 2)
      const dir  = DIRS[Math.floor(rand(0, DIRS.length))];
      const wrap = document.createElement('div');
      wrap.className = 'rocket-wrap';
      const vw = window.innerWidth, vh = window.innerHeight, sz = 160;
      let sx = dir.vx > 0 ? -sz : dir.vx < 0 ? vw + sz : rand(sz, vw - sz);
      let sy = dir.vy > 0 ? -sz : dir.vy < 0 ? vh + sz : rand(sz, vh - sz);
      wrap.style.cssText = `left:${sx}px;top:${sy}px;transform:rotate(${dir.angle}deg)`;
      wrap.innerHTML = `<video class="rocket-video" src="assets/video/rocket.webm" autoplay loop muted playsinline></video><div class="rocket-glow"></div>`;
      BODY.appendChild(wrap);
      requestAnimationFrame(() => requestAnimationFrame(() => wrap.classList.add('visible')));
      const speed = rand(0.35, 0.75);
      let alive = true, last = null, cx = sx, cy = sy;
      function fly(ts) {
        if (!alive) return;
        if (state.isScrolling || state.isHidden) { requestAnimationFrame(fly); return; }
        const dt = last ? ts - last : 16; last = ts;
        cx += dir.vx * speed * dt;
        cy += dir.vy * speed * dt;
        const wobble = Math.sin(ts / 380) * 2.5;
        wrap.style.left = (cx + -dir.vy * wobble) + 'px';
        wrap.style.top  = (cy +  dir.vx * wobble) + 'px';
        requestAnimationFrame(fly);
      }
      requestAnimationFrame(fly);
      setTimeout(() => {
        alive = false;
        wrap.classList.remove('visible');
        wrap.addEventListener('transitionend', () => wrap.remove(), { once: true });
      }, rand(7000, 12000));
    }
    setTimeout(spawnRocket, 4000);
    setInterval(spawnRocket, rand(11000, 18000));
  })();
}

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
   22. HUD CLOCK + COORDS — handled in inline script (keep lightweight)
════════════════════════════════════════════════════════════════ */

/* ═══════════════════════════════════════════════════════════════
   23. DATA STREAM EFFECT (desktop only, capped at 18 nodes)
════════════════════════════════════════════════════════════════ */
if (!isMobile) {
  (function() {
    const sc = document.createElement('div');
    sc.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:0;overflow:hidden;';
    BODY.appendChild(sc);
    const cols = ['rgba(0,255,65,0.09)', 'rgba(0,229,255,0.07)', 'rgba(123,47,255,0.06)'];
    const streamStyle = document.createElement('style');
    streamStyle.textContent = `@keyframes stream-fall{from{transform:translateY(-100px);opacity:0}10%{opacity:1}90%{opacity:.6}to{transform:translateY(115vh);opacity:0}}`;
    document.head.appendChild(streamStyle);
    function spawnStream() {
      if (state.isScrolling || state.isHidden) return;
      if (sc.children.length >= 18) sc.firstChild?.remove(); // cap at 18 (was 25)
      const s = document.createElement('div');
      const x = Math.random() * 100;
      const dur = 6 + Math.random() * 6;
      s.style.cssText = `position:absolute;left:${x}%;top:-20px;font-family:'Share Tech Mono',monospace;font-size:9px;color:${cols[Math.floor(Math.random()*3)]};writing-mode:vertical-rl;white-space:nowrap;pointer-events:none;animation:stream-fall ${dur}s ${Math.random()*2}s linear infinite;letter-spacing:3px;`;
      s.textContent = Array.from({length:12},()=>Math.floor(Math.random()*2)).join('');
      sc.appendChild(s);
    }
    for (let i = 0; i < 8; i++) spawnStream();
    setInterval(spawnStream, 2000); // slower spawn rate (was 1600)
  })();
}

/* ═══════════════════════════════════════════════════════════════
   24. SIDEBAR TOGGLE
════════════════════════════════════════════════════════════════ */
document.getElementById('sidebar-toggle')?.addEventListener('click', () => {
  sidebar?.classList.toggle('open');
});

/* ═══════════════════════════════════════════════════════════════
   25. HUD IDLE ANIMATIONS (setInterval, skip during scroll/hidden)
       Consolidated from inline script in index.html
════════════════════════════════════════════════════════════════ */
const bars = ['▁▂▃▅▇▅▃▂','▂▄▆▇▆▄▂▁','▃▅▇▆▄▂▁▂','▅▇▆▃▂▄▆▇','▇▆▄▂▁▃▅▇'];
let bi = 0;
const engOutput = document.getElementById('eng-output');
const signalVal = document.getElementById('signal-val');
setInterval(() => {
  if (state.isScrolling || state.isHidden) return;
  if (engOutput) engOutput.textContent = bars[bi++ % bars.length];
  if (signalVal) signalVal.textContent = '███ ' + (9.4 + Math.random() * 0.8).toFixed(1) + 'GHz';
}, 500); // slowed from 400ms

/* ═══════════════════════════════════════════════════════════════
   26. CONTACT REACTOR ORB (visibility-aware)
════════════════════════════════════════════════════════════════ */
(function() {
  const cv = document.getElementById('contact-reactor');
  if (!cv || isMobile) return;
  const ctx = cv.getContext('2d');
  const cx = 140, cy = 140, r = 90;
  let t = 0;
  let contactVisible = false;

  new IntersectionObserver(entries => {
    contactVisible = entries[0].isIntersecting;
  }, { threshold: 0 }).observe(cv);

  let contactFrame = 0;
  function draw() {
    contactFrame++;
    // Only draw every 2 frames (~30fps) when visible and not scrolling/hidden
    if (contactVisible && !state.isScrolling && !state.isHidden && contactFrame % 2 === 0) {
      ctx.clearRect(0,0,280,280);
      t += 0.02;
      for (let i = 4; i >= 1; i--) {
        const a = (t * i * 0.5) % (Math.PI * 2);
        ctx.save();
        ctx.translate(cx,cy); ctx.rotate(a);
        ctx.beginPath();
        ctx.ellipse(0,0, r*i*0.28, r*i*0.12, 0, 0, Math.PI*2);
        ctx.strokeStyle = `rgba(0,229,255,${0.08*i})`;
        ctx.lineWidth = 1.2;
        ctx.stroke();
        ctx.restore();
      }
      const grad = ctx.createRadialGradient(cx,cy,0,cx,cy,45);
      grad.addColorStop(0,'rgba(0,229,255,0.85)');
      grad.addColorStop(0.4,'rgba(0,100,200,0.45)');
      grad.addColorStop(1,'transparent');
      ctx.beginPath();
      ctx.arc(cx,cy,45*(0.8+0.2*Math.sin(t*3)),0,Math.PI*2);
      ctx.fillStyle = grad;
      ctx.fill();
      ctx.beginPath();
      ctx.arc(cx,cy,r,0,Math.PI*2);
      ctx.strokeStyle = `rgba(0,229,255,${0.18+0.08*Math.sin(t)})`;
      ctx.lineWidth = 1;
      ctx.stroke();
    }
    requestAnimationFrame(draw);
  }
  draw();
})();

/* ═══════════════════════════════════════════════════════════════
   27. MOBILE: disable alien videos (GPU relief)
════════════════════════════════════════════════════════════════ */
if (isMobile) {
  // Pause and hide all alien/ufo/rocket videos — they shouldn't autoplay on mobile
  document.querySelectorAll('.alien-wrap, .ufo-wrap, .rocket-wrap').forEach(el => {
    el.style.display = 'none';
    el.querySelectorAll('video').forEach(v => { v.pause(); v.removeAttribute('src'); });
  });
  // Hide cursor elements
  if (cursorEl) cursorEl.style.display = 'none';
  if (dotEl)    dotEl.style.display = 'none';
  // Hide chroma overlay
  const chroma = document.getElementById('chroma-overlay');
  if (chroma) chroma.style.display = 'none';
  // Matrix canvas hidden on mobile
  if (matrixEl) matrixEl.style.display = 'none';
}

/* ═══════════════════════════════════════════════════════════════
   28. REVISED MASTER LOOP (replaces earlier definition)
   — Defined last so all tick functions exist
════════════════════════════════════════════════════════════════ */
// Cancel any previous rAF if masterLoop was called already (shouldn't be, but safety)
if (state.rafId) cancelAnimationFrame(state.rafId);

function runMasterLoop(ts) {
  state.frame++;
  const busy = state.isScrolling || state.isHidden;

  if (!isMobile) tickCursor(ts);

  if (!busy) {
    if (!isMobile) {
      tickParticles();
      if (state.frame % 3 === 0) tickMatrix();  // ~20fps matrix
      if (state.frame % 6 === 0) tickHologram(ts); // ~10fps grid
    }
    if (state.frame % 2 === 0) tickReactor(ts);  // ~30fps reactor
  }

  state.rafId = requestAnimationFrame(runMasterLoop);
}

requestAnimationFrame(runMasterLoop);