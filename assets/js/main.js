/* ═══════════════════════════════════════════════════════════════
   MARK PORTFOLIO — main.js  [2090 EDITION — ULTRA OPTIMIZED]
   Perf: single rAF loop, throttled scroll, offscreen canvas,
   GPU-composited transforms only, no layout-thrash
════════════════════════════════════════════════════════════════ */

'use strict';

/* ── GLOBAL STATE ─────────────────────────────────────────────── */
const state = {
  mouseX: 0, mouseY: 0,
  dotX: 0, dotY: 0,
  scrollY: 0,
  lastScrollY: 0,
  scrollDirty: false,
  ticking: false,
  time: 0
};

/* ── SINGLE MASTER RAF LOOP — kicked off at bottom of file ─────── */
function masterLoop(ts) {
  state.time = ts;
  tickCursor(ts);
  tickParticles();
  tickHologram(ts);
  requestAnimationFrame(masterLoop);
}

/* ═══════════════════════════════════════════════════════════════
   1. CUSTOM CURSOR + TRAIL (GPU only — transforms)
════════════════════════════════════════════════════════════════ */
const cursorEl  = document.getElementById('cursor');
const dotEl     = document.getElementById('cursor-dot');
const trailCont = document.getElementById('cursor-trail-container');
const TRAIL_N   = 8;
const trail     = [];

for (let i = 0; i < TRAIL_N; i++) {
  const d = document.createElement('div');
  d.className = 'trail-dot';
  const s = (5 - i * 0.45);
  d.style.cssText = `width:${s}px;height:${s}px;opacity:${(1 - i / TRAIL_N) * 0.45};background:${i % 3 === 0 ? 'var(--accent)' : 'var(--cyan)'};`;
  trailCont.appendChild(d);
  trail.push({ el: d, x: 0, y: 0 });
}

document.addEventListener('mousemove', e => {
  state.mouseX = e.clientX;
  state.mouseY = e.clientY;
  cursorEl.style.transform = `translate(${e.clientX - 11}px, ${e.clientY - 11}px)`;
}, { passive: true });

function tickCursor() {
  state.dotX += (state.mouseX - state.dotX) * 0.18;
  state.dotY += (state.mouseY - state.dotY) * 0.18;
  dotEl.style.transform = `translate(${state.dotX - 2.5}px, ${state.dotY - 2.5}px)`;
  trail.forEach((t, i) => {
    const prev = i === 0 ? { x: state.dotX, y: state.dotY } : trail[i - 1];
    t.x += (prev.x - t.x) * 0.28;
    t.y += (prev.y - t.y) * 0.28;
    t.el.style.transform = `translate(${t.x - 2}px, ${t.y - 2}px)`;
  });
}

document.querySelectorAll('a, button, .project-card, .blog-card, .obj-card, .tech-card, .alien-wrap').forEach(el => {
  el.addEventListener('mouseenter', () => {
    cursorEl.classList.add('cursor-hover');
  }, { passive: true });
  el.addEventListener('mouseleave', () => {
    cursorEl.classList.remove('cursor-hover');
  }, { passive: true });
});

/* ═══════════════════════════════════════════════════════════════
   2. MATRIX RAIN — offscreen canvas, batched, reduced FPS
════════════════════════════════════════════════════════════════ */
const mc   = document.getElementById('matrix-canvas');
const mctx = mc.getContext('2d');
let matrixW, matrixH, matrixCols, drops;

function resizeMatrix() {
  matrixW = mc.width  = window.innerWidth;
  matrixH = mc.height = window.innerHeight;
  matrixCols = Math.floor(matrixW / 18);
  drops = new Float32Array(matrixCols).fill(1);
}
resizeMatrix();
window.addEventListener('resize', resizeMatrix, { passive: true });

const chars = 'アイウエオカキクケコサシスセソタチツ01010110ABCDEF<>/\\{}[]∑∆∇⟨⟩';
let matrixFrame = 0;
setInterval(() => {
  matrixFrame++;
  if (matrixFrame % 2 !== 0) return; // skip every other frame = 25fps
  mctx.fillStyle = 'rgba(0,0,0,0.055)';
  mctx.fillRect(0, 0, matrixW, matrixH);
  mctx.font = '13px Share Tech Mono';
  for (let i = 0; i < matrixCols; i++) {
    const ch = chars[Math.floor(Math.random() * chars.length)];
    const r  = Math.random();
    mctx.fillStyle = r > .98 ? '#ffffff' : r > .95 ? 'var(--accent-raw,#00e5ff)' : r > .92 ? '#ff003c' : '#00ff41';
    mctx.fillText(ch, i * 18, drops[i] * 18);
    if (drops[i] * 18 > matrixH && Math.random() > .977) drops[i] = 0;
    drops[i]++;
  }
}, 40);

/* ═══════════════════════════════════════════════════════════════
   3. HOLOGRAPHIC PARTICLE SYSTEM — hero canvas, optimized
════════════════════════════════════════════════════════════════ */
const pc   = document.getElementById('particle-canvas');
const pctx = pc.getContext('2d');

function resizeParticle() {
  pc.width  = pc.offsetWidth;
  pc.height = pc.offsetHeight;
}
resizeParticle();
window.addEventListener('resize', resizeParticle, { passive: true });

const PARTICLE_N = 55; // reduced from 80 — still looks great
const particles  = Array.from({ length: PARTICLE_N }, () => ({
  x: Math.random() * pc.width,
  y: Math.random() * pc.height,
  r: Math.random() * 1.6 + 0.4,
  vx: (Math.random() - .5) * 0.35,
  vy: (Math.random() - .5) * 0.35,
  a: Math.random() * 0.7 + 0.15,
  hue: Math.random() > .9 ? 'accent' : Math.random() > .85 ? 'cyan' : 'green',
  pulse: Math.random() * Math.PI * 2
}));

const LINK_DIST = 120;
function tickParticles() {
  if (!pc.width) return;
  pctx.clearRect(0, 0, pc.width, pc.height);
  const t = state.time * 0.001;

  // draw links first (avoid overdraw)
  pctx.lineWidth = 0.4;
  for (let i = 0; i < PARTICLE_N - 1; i++) {
    const a = particles[i];
    for (let j = i + 1; j < PARTICLE_N; j++) {
      const b  = particles[j];
      const dx = a.x - b.x, dy = a.y - b.y;
      const d2 = dx * dx + dy * dy;
      if (d2 < LINK_DIST * LINK_DIST) {
        const alpha = 0.12 * (1 - Math.sqrt(d2) / LINK_DIST);
        pctx.strokeStyle = `rgba(0,255,65,${alpha})`;
        pctx.beginPath();
        pctx.moveTo(a.x, a.y);
        pctx.lineTo(b.x, b.y);
        pctx.stroke();
      }
    }
  }

  // draw particles
  particles.forEach(p => {
    p.x += p.vx; p.y += p.vy;
    p.pulse += 0.03;
    if (p.x < 0 || p.x > pc.width)  p.vx *= -1;
    if (p.y < 0 || p.y > pc.height) p.vy *= -1;
    const a = p.a * (0.7 + 0.3 * Math.sin(p.pulse));
    let color;
    if (p.hue === 'accent') color = `rgba(255,0,60,${a})`;
    else if (p.hue === 'cyan') color = `rgba(0,229,255,${a})`;
    else color = `rgba(0,255,65,${a})`;
    pctx.beginPath();
    pctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
    pctx.fillStyle = color;
    pctx.fill();
  });
}

/* ═══════════════════════════════════════════════════════════════
   4. HOLOGRAM GRID CANVAS — subtle animated grid
════════════════════════════════════════════════════════════════ */
const holoCanvas = document.createElement('canvas');
holoCanvas.id = 'holo-canvas';
holoCanvas.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:1;opacity:0.035;';
document.body.appendChild(holoCanvas);
const hctx = holoCanvas.getContext('2d');

function resizeHolo() {
  holoCanvas.width  = window.innerWidth;
  holoCanvas.height = window.innerHeight;
}
resizeHolo();
window.addEventListener('resize', resizeHolo, { passive: true });

let holoFrame = 0;
function tickHologram(ts) {
  holoFrame++;
  if (holoFrame % 4 !== 0) return; // ~15fps for grid — imperceptible diff
  const w = holoCanvas.width, h = holoCanvas.height;
  hctx.clearRect(0, 0, w, h);
  const offset = (ts * 0.015) % 40;
  hctx.strokeStyle = '#00ff41';
  hctx.lineWidth = 0.5;
  hctx.beginPath();
  for (let x = offset; x < w; x += 40) {
    hctx.moveTo(x, 0); hctx.lineTo(x, h);
  }
  for (let y = offset; y < h; y += 40) {
    hctx.moveTo(0, y); hctx.lineTo(w, y);
  }
  hctx.stroke();
}

/* ═══════════════════════════════════════════════════════════════
   5. STAR FIELD — DOM, built once, CSS animation only
════════════════════════════════════════════════════════════════ */
function buildStars() {
  const container = document.getElementById('stars1');
  if (!container) return;
  const frag = document.createDocumentFragment();
  for (let i = 0; i < 60; i++) {
    const s = document.createElement('div');
    const sz = Math.random() * 2 + 0.5;
    s.style.cssText = `position:absolute;width:${sz}px;height:${sz}px;background:${Math.random() > .85 ? '#00e5ff' : '#00ff41'};border-radius:50%;left:${Math.random()*100}%;top:${Math.random()*100}%;opacity:${Math.random()*.5+.1};animation:star-twinkle ${2.5+Math.random()*4}s ease-in-out ${Math.random()*4}s infinite;will-change:opacity,transform;`;
    frag.appendChild(s);
  }
  container.appendChild(frag);
}
buildStars();

const starStyle = document.createElement('style');
starStyle.textContent = `
@keyframes star-twinkle{0%,100%{opacity:.12;transform:scale(1)}50%{opacity:.85;transform:scale(1.6);box-shadow:0 0 5px currentColor}}
`;
document.head.appendChild(starStyle);

/* ═══════════════════════════════════════════════════════════════
   6. TYPEWRITER
════════════════════════════════════════════════════════════════ */
const phrases = [
  'Full-Stack Developer // Go · SvelteKit · React',
  'Building civic tech for real communities.',
  'System online. All modules operational.',
  '// INITIALIZING MARK_OS v2090...',
  'Access granted. Welcome, Mark Martinez.',
  'Shipping code that matters.',
];
let pi = 0, ci = 0, deleting = false;
const tw = document.getElementById('typewriter');
function type() {
  if (!tw) return;
  const phrase = phrases[pi];
  tw.textContent = deleting ? phrase.slice(0, --ci) : phrase.slice(0, ++ci);
  if (!deleting && ci === phrase.length) { deleting = true; setTimeout(type, 2200); return; }
  if (deleting && ci === 0) { deleting = false; pi = (pi + 1) % phrases.length; }
  setTimeout(type, deleting ? 30 : 60);
}
// Small delay so DOM is fully painted before we start typing
setTimeout(type, 300);

/* ═══════════════════════════════════════════════════════════════
   7. SCROLL — single throttled listener, all scroll work batched
════════════════════════════════════════════════════════════════ */
const siteHeader = document.getElementById('site-header');
const sections   = document.querySelectorAll('section[id]');
const sideLinks  = document.querySelectorAll('.sidebar-link');
const parallaxLayers = document.querySelectorAll('.parallax-layer');
const alienWraps = document.querySelectorAll('.alien-wrap');

function handleScroll() {
  const sy = window.scrollY;
  const speed = Math.abs(sy - state.lastScrollY);
  state.lastScrollY = sy;
  state.scrollY = sy;

  // header
  siteHeader.classList.toggle('scrolled', sy > 60);

  // parallax — GPU transforms only
  parallaxLayers.forEach(layer => {
    const depth = parseFloat(layer.dataset.depth) || 0.1;
    layer.style.transform = `translate3d(0,${sy * depth}px,0)`;
  });

  // active sidebar
  let cur = '';
  sections.forEach(s => { if (sy >= s.offsetTop - 130) cur = s.id; });
  sideLinks.forEach(l => l.classList.toggle('active', l.getAttribute('href') === '#' + cur));

  // alien speed glow
  if (speed > 25) {
    alienWraps.forEach(aw => {
      aw.style.filter = `drop-shadow(0 0 ${6 + speed * 0.4}px rgba(0,255,65,0.9))`;
      setTimeout(() => { aw.style.filter = ''; }, 280);
    });
  }

  state.ticking = false;
}

window.addEventListener('scroll', () => {
  if (!state.ticking) {
    requestAnimationFrame(handleScroll);
    state.ticking = true;
  }
}, { passive: true });

/* ═══════════════════════════════════════════════════════════════
   8. SCROLL REVEAL — IntersectionObserver, staggered
════════════════════════════════════════════════════════════════ */
const revealEls = document.querySelectorAll('.reveal');
const revealObs = new IntersectionObserver(entries => {
  entries.forEach(e => {
    if (!e.isIntersecting) return;
    const siblings = e.target.parentElement.querySelectorAll('.reveal');
    let delay = 0;
    siblings.forEach((s, i) => { if (s === e.target) delay = i * 75; });
    setTimeout(() => e.target.classList.add('in-view'), delay);
    revealObs.unobserve(e.target);
  });
}, { threshold: 0.08, rootMargin: '0px 0px -40px 0px' });
revealEls.forEach(el => revealObs.observe(el));

/* ═══════════════════════════════════════════════════════════════
   9. COUNTER ANIMATION
════════════════════════════════════════════════════════════════ */
const counterObs = new IntersectionObserver(entries => {
  entries.forEach(e => {
    if (!e.isIntersecting) return;
    const el = e.target;
    const target = +el.dataset.target;
    let cur = 0;
    const step = Math.ceil(target / 55);
    const t = setInterval(() => {
      cur = Math.min(cur + step, target);
      el.textContent = cur + (target === 100 ? '%' : '+');
      if (cur >= target) clearInterval(t);
    }, 28);
    counterObs.unobserve(el);
  });
}, { threshold: 0.5 });
document.querySelectorAll('.stat-num').forEach(el => counterObs.observe(el));

/* ═══════════════════════════════════════════════════════════════
   10. TECH LEVEL BAR ANIMATION
════════════════════════════════════════════════════════════════ */
const barObs = new IntersectionObserver(entries => {
  entries.forEach(e => {
    if (!e.isIntersecting) return;
    const fill = e.target;
    const target = fill.dataset.targetW;
    fill.style.transition = 'none';
    fill.style.width = '0%';
    requestAnimationFrame(() => requestAnimationFrame(() => {
      fill.style.transition = 'width 1.5s cubic-bezier(.4,0,.2,1)';
      fill.style.width = target;
    }));
    barObs.unobserve(fill);
  });
}, { threshold: 0.25 });
document.querySelectorAll('.tech-level-fill').forEach(el => {
  el.dataset.targetW = el.style.width;
  el.style.width = '0%';
  barObs.observe(el);
});

/* ═══════════════════════════════════════════════════════════════
   11. 3D CARD TILT — passive, GPU transforms only
════════════════════════════════════════════════════════════════ */
function addTilt(selector, intensity = 8) {
  document.querySelectorAll(selector).forEach(card => {
    let moving = false;
    card.addEventListener('mousemove', e => {
      if (moving) return;
      moving = true;
      requestAnimationFrame(() => {
        const rect = card.getBoundingClientRect();
        const dx = (e.clientX - (rect.left + rect.width / 2)) / (rect.width / 2);
        const dy = (e.clientY - (rect.top  + rect.height / 2)) / (rect.height / 2);
        card.style.transform = `perspective(900px) rotateX(${-dy * intensity}deg) rotateY(${dx * intensity}deg) translateY(-8px) scale(1.02)`;
        moving = false;
      });
    }, { passive: true });
    card.addEventListener('mouseleave', () => {
      card.style.transition = 'transform .55s cubic-bezier(.4,0,.2,1)';
      card.style.transform = '';
    }, { passive: true });
    card.addEventListener('mouseenter', () => {
      card.style.transition = 'transform .1s linear';
    }, { passive: true });
  });
}
addTilt('.project-card', 6);
addTilt('.blog-card', 5);
addTilt('.obj-card', 7);
addTilt('.tech-card', 9);
addTilt('.banner', 3);

/* ═══════════════════════════════════════════════════════════════
   12. MAGNETIC BUTTONS
════════════════════════════════════════════════════════════════ */
document.querySelectorAll('.btn').forEach(btn => {
  btn.addEventListener('mousemove', e => {
    const rect = btn.getBoundingClientRect();
    const dx = e.clientX - (rect.left + rect.width / 2);
    const dy = e.clientY - (rect.top  + rect.height / 2);
    btn.style.transform = `translate(${dx * 0.28}px, ${dy * 0.38}px)`;
  }, { passive: true });
  btn.addEventListener('mouseleave', () => {
    btn.style.transition = 'transform .42s cubic-bezier(.4,0,.2,1)';
    btn.style.transform  = '';
  }, { passive: true });
  btn.addEventListener('mouseenter', () => {
    btn.style.transition = 'transform .08s linear';
  }, { passive: true });
});

/* ═══════════════════════════════════════════════════════════════
   13. SMOOTH SIDEBAR SCROLL — replaces plain jump
════════════════════════════════════════════════════════════════ */
document.querySelectorAll('.sidebar-link, .header-nav a').forEach(link => {
  link.addEventListener('click', e => {
    const href = link.getAttribute('href');
    if (!href || !href.startsWith('#')) return;
    const target = document.querySelector(href);
    if (!target) return;
    e.preventDefault();

    // close sidebar on mobile
    document.getElementById('sidebar').classList.remove('open');

    // cinematic scroll with easing
    const start = window.scrollY;
    const end   = target.getBoundingClientRect().top + start - 58;
    const dist  = end - start;
    const dur   = Math.min(Math.max(Math.abs(dist) * 0.4, 400), 1100);
    let startTime = null;

    function easeInOutCubic(t) {
      return t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    }

    function step(ts) {
      if (!startTime) startTime = ts;
      const elapsed = ts - startTime;
      const progress = Math.min(elapsed / dur, 1);
      window.scrollTo(0, start + dist * easeInOutCubic(progress));
      if (progress < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);

    // flash the target section
    target.classList.add('section-flash');
    setTimeout(() => target.classList.remove('section-flash'), 800);
  });
});

/* ═══════════════════════════════════════════════════════════════
   14. ALIEN INTERACTIONS
════════════════════════════════════════════════════════════════ */
const alienStyle = document.createElement('style');
alienStyle.textContent = `
@keyframes alien-spin{0%{transform:rotate(0)}100%{transform:rotate(360deg) scale(1.2)}}
@keyframes alien-shake{0%,100%{transform:translateX(0)}20%,60%{transform:translateX(-14px) rotate(-6deg)}40%,80%{transform:translateX(14px) rotate(6deg)}}
@keyframes alien-bounce{0%,100%{transform:translateY(0) scale(1)}40%{transform:translateY(-45px) scale(1.25)}70%{transform:translateY(-20px) scale(1.1)}}
@keyframes alien-zoom{0%,100%{transform:scale(1)}50%{transform:scale(2) rotate(20deg)}}
`;
document.head.appendChild(alienStyle);

document.querySelectorAll('.alien-wrap').forEach(aw => {
  let clicks = 0;
  const anims = ['alien-spin','alien-shake','alien-bounce','alien-zoom'];
  aw.addEventListener('click', () => {
    const anim = anims[clicks++ % anims.length];
    aw.style.animation = `${anim} 0.75s ease`;
    aw.style.filter = 'drop-shadow(0 0 35px rgba(0,255,65,1)) drop-shadow(0 0 70px rgba(0,229,255,0.5))';
    setTimeout(() => {
      aw.style.animation = '';
      aw.style.filter    = '';
    }, 750);
  });
});

/* ═══════════════════════════════════════════════════════════════
   15. TECH STACK TABS — with page-turn animation
════════════════════════════════════════════════════════════════ */
function showStack(name, btn) {
  document.querySelectorAll('.stack-panel').forEach(p => {
    if (p.classList.contains('active')) {
      p.style.animation = 'stackOut .2s ease forwards';
      setTimeout(() => { p.classList.remove('active'); p.style.animation = ''; }, 200);
    }
  });
  document.querySelectorAll('.stack-tab').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  setTimeout(() => {
    const panel = document.getElementById('stack-' + name);
    panel.classList.add('active');
    panel.style.animation = 'stackIn .35s cubic-bezier(.4,0,.2,1) forwards';
    // re-animate bars
    panel.querySelectorAll('.tech-level-fill').forEach(fill => {
      const t = fill.dataset.targetW || '0%';
      fill.style.transition = 'none';
      fill.style.width = '0%';
      requestAnimationFrame(() => requestAnimationFrame(() => {
        fill.style.transition = 'width 1.4s cubic-bezier(.4,0,.2,1)';
        fill.style.width = t;
      }));
    });
  }, 220);
}

/* ═══════════════════════════════════════════════════════════════
   16. TERMINAL ANIMATION — declared here, executed via fixTerminal
════════════════════════════════════════════════════════════════ */
const termLines = [
  { type: 'cmd', text: 'whoami' },
  { type: 'out', text: 'mark_dev — full-stack engineer [CLEARANCE: LEVEL 9]', cls: 'success' },
  { type: 'cmd', text: 'cat skills.json | jq .stack' },
  { type: 'out', text: '["Go","SvelteKit","React","MySQL","PHP","WordPress","Docker"]' },
  { type: 'cmd', text: 'ls -la projects/' },
  { type: 'out', text: 'ptdid_portal/  vcmpms_v2/  vibe_tribe/  toda_id_print/' },
  { type: 'cmd', text: 'cat mission.txt' },
  { type: 'out', text: '> Build systems that serve real communities.', cls: 'success' },
  { type: 'cmd', text: 'ping tmo.valenzuela.gov.ph -c 3' },
  { type: 'out', text: '3 packets transmitted, 3 received — 12ms avg', cls: 'success' },
  { type: 'cmd', text: './deploy --env=production --zero-downtime' },
  { type: 'out', text: '✓ Build complete. ✓ Health checks passed. System LIVE.', cls: 'success' },
  { type: 'cmd', text: '_' },
];

/* ═══════════════════════════════════════════════════════════════
   17. CAROUSEL
════════════════════════════════════════════════════════════════ */
const track = document.getElementById('carousel-track');
if (track) {
  const cards = track.children;
  let cIdx = 0;
  const getVisible = () => window.innerWidth < 700 ? 1 : window.innerWidth < 1100 ? 2 : 3;
  const maxIdx = () => Math.max(0, cards.length - getVisible());
  const dotsCont = document.getElementById('carousel-dots');

  function buildDots() {
    dotsCont.innerHTML = '';
    for (let i = 0; i <= maxIdx(); i++) {
      const d = document.createElement('div');
      d.className = 'carousel-dot' + (i === cIdx ? ' active' : '');
      d.onclick = () => { cIdx = i; updateCarousel(); };
      dotsCont.appendChild(d);
    }
  }
  function updateCarousel() {
    const cardW = cards[0].offsetWidth + 19;
    track.style.transform = `translate3d(-${cIdx * cardW}px,0,0)`;
    document.querySelectorAll('.carousel-dot').forEach((d, i) => d.classList.toggle('active', i === cIdx));
  }
  document.getElementById('prev-btn').onclick = () => { cIdx = Math.max(0, cIdx - 1); updateCarousel(); };
  document.getElementById('next-btn').onclick = () => { cIdx = Math.min(maxIdx(), cIdx + 1); updateCarousel(); };
  buildDots();
  window.addEventListener('resize', () => { buildDots(); updateCarousel(); }, { passive: true });

  // swipe
  let touchStartX = 0;
  track.addEventListener('touchstart', e => { touchStartX = e.touches[0].clientX; }, { passive: true });
  track.addEventListener('touchend', e => {
    const dx = e.changedTouches[0].clientX - touchStartX;
    if (Math.abs(dx) > 45) {
      cIdx = dx < 0 ? Math.min(maxIdx(), cIdx + 1) : Math.max(0, cIdx - 1);
      updateCarousel();
    }
  }, { passive: true });
}

/* ═══════════════════════════════════════════════════════════════
   18. SECTION TITLE GLITCH ENTRANCE
════════════════════════════════════════════════════════════════ */
const glitchEnterStyle = document.createElement('style');
glitchEnterStyle.textContent = `
.glitch-enter{animation:glitch-burst .9s ease both!important}
@keyframes glitch-burst{
  0%  {letter-spacing:.4em;opacity:0;text-shadow:0 0 40px var(--green),0 0 80px var(--cyan)}
  25% {letter-spacing:.18em;clip-path:inset(8% 0 55% 0);color:var(--accent)}
  55% {letter-spacing:.1em;clip-path:inset(45% 0 15% 0);color:var(--cyan)}
  80% {clip-path:inset(0% 0 0% 0);color:var(--green)}
  100%{letter-spacing:.08em;opacity:1;clip-path:none;text-shadow:0 0 24px rgba(0,255,65,.4),0 0 60px rgba(0,229,255,.15)}
}
@keyframes stackIn{from{opacity:0;transform:translateY(16px) scale(.97)}to{opacity:1;transform:none}}
@keyframes stackOut{from{opacity:1;transform:none}to{opacity:0;transform:translateY(-12px) scale(.97)}}
.section-flash::after{animation:section-flash-anim .8s ease!important}
@keyframes section-flash-anim{0%{opacity:.7}100%{opacity:0}}
`;
document.head.appendChild(glitchEnterStyle);

const titleObs = new IntersectionObserver(entries => {
  entries.forEach(e => {
    if (!e.isIntersecting) return;
    e.target.classList.add('glitch-enter');
    setTimeout(() => e.target.classList.remove('glitch-enter'), 900);
  });
}, { threshold: 0.4 });
document.querySelectorAll('h2.section-title').forEach(h => titleObs.observe(h));

/* ═══════════════════════════════════════════════════════════════
   19. UFO SPAWNER — rate limited, GPU positioned
════════════════════════════════════════════════════════════════ */
(function () {
  function rand(a, b) { return Math.random() * (b - a) + a; }
  function spawnUFO() {
    if (document.querySelectorAll('.ufo-wrap').length >= 2) return; // reduced from 3
    const wrap = document.createElement('div');
    wrap.className = 'ufo-wrap';
    wrap.style.left = rand(10, window.innerWidth - 130) + 'px';
    wrap.style.top  = rand(10, window.innerHeight - 130) + 'px';
    wrap.style.animationDuration = rand(3.5, 5.5).toFixed(2) + 's';
    wrap.innerHTML = `<video class="ufo-video" src="assets/video/ufo.webm" autoplay loop muted playsinline></video><div class="ufo-glow"></div><div class="ufo-beam"></div>`;
    document.body.appendChild(wrap);
    requestAnimationFrame(() => requestAnimationFrame(() => wrap.classList.add('visible')));

    const stay = rand(7000, 16000);
    const driftTimer = setInterval(() => {
      wrap.style.transition = 'left 3s ease-in-out, top 3s ease-in-out';
      wrap.style.left = rand(10, window.innerWidth - 130) + 'px';
      wrap.style.top  = rand(10, window.innerHeight - 130) + 'px';
    }, 3200);

    setTimeout(() => {
      clearInterval(driftTimer);
      wrap.classList.remove('visible');
      wrap.addEventListener('transitionend', () => wrap.remove(), { once: true });
    }, stay);
  }

  setTimeout(spawnUFO, 3000);
  setInterval(spawnUFO, rand(12000, 25000));
})();

/* ═══════════════════════════════════════════════════════════════
   20. ROCKET SPAWNER — throttled, uses rAF for movement
════════════════════════════════════════════════════════════════ */
(function () {
  const DIRS = [
    { angle: 0,   vx: 0,    vy: -1   },
    { angle: 45,  vx: .7,   vy: -.7  },
    { angle: 90,  vx: 1,    vy: 0    },
    { angle: 135, vx: .7,   vy: .7   },
    { angle: 180, vx: 0,    vy: 1    },
    { angle: 225, vx: -.7,  vy: .7   },
    { angle: 270, vx: -1,   vy: 0    },
    { angle: 315, vx: -.7,  vy: -.7  },
  ];
  function rand(a, b) { return Math.random() * (b - a) + a; }

  function spawnRocket() {
    if (document.querySelectorAll('.rocket-wrap').length >= 2) return;
    const dir  = DIRS[Math.floor(rand(0, DIRS.length))];
    const wrap = document.createElement('div');
    wrap.className = 'rocket-wrap';
    const vw = window.innerWidth, vh = window.innerHeight, sz = 150;
    let sx = dir.vx > 0 ? -sz : dir.vx < 0 ? vw + sz : rand(sz, vw - sz);
    let sy = dir.vy > 0 ? -sz : dir.vy < 0 ? vh + sz : rand(sz, vh - sz);
    wrap.style.cssText = `left:${sx}px;top:${sy}px;transform:rotate(${dir.angle}deg)`;
    wrap.innerHTML = `<video class="rocket-video" src="assets/video/rocket.webm" autoplay loop muted playsinline></video><div class="rocket-glow"></div>`;
    document.body.appendChild(wrap);
    requestAnimationFrame(() => requestAnimationFrame(() => wrap.classList.add('visible')));

    const speed = rand(0.3, 0.75);
    let alive = true, last = null, cx = sx, cy = sy;

    function fly(ts) {
      if (!alive) return;
      const dt = last ? ts - last : 16;
      last = ts;
      cx += dir.vx * speed * dt;
      cy += dir.vy * speed * dt;
      const wobble = Math.sin(ts / 420) * 2.2;
      wrap.style.left = (cx + -dir.vy * wobble) + 'px';
      wrap.style.top  = (cy +  dir.vx * wobble) + 'px';
      requestAnimationFrame(fly);
    }
    requestAnimationFrame(fly);

    setTimeout(() => {
      alive = false;
      wrap.classList.remove('visible');
      wrap.addEventListener('transitionend', () => wrap.remove(), { once: true });
    }, rand(8000, 16000));
  }

  setTimeout(spawnRocket, 4000);
  setInterval(spawnRocket, rand(10000, 18000));
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
   22. HOLOGRAPHIC RIPPLE on click
════════════════════════════════════════════════════════════════ */
document.addEventListener('click', e => {
  const ripple = document.createElement('div');
  ripple.style.cssText = `
    position:fixed;left:${e.clientX}px;top:${e.clientY}px;
    width:0;height:0;border-radius:50%;pointer-events:none;z-index:9999;
    border:2px solid var(--cyan);transform:translate(-50%,-50%);
    animation:holo-ripple .7s ease-out forwards;
  `;
  document.body.appendChild(ripple);
  setTimeout(() => ripple.remove(), 700);
}, { passive: true });

const rippleStyle = document.createElement('style');
rippleStyle.textContent = `@keyframes holo-ripple{0%{width:0;height:0;opacity:.9;border-color:var(--cyan)}100%{width:120px;height:120px;opacity:0;border-color:var(--green)}}`;
document.head.appendChild(rippleStyle);

/* ═══════════════════════════════════════════════════════════════
   23. HEADER NAV ACTIVE HIGHLIGHT
════════════════════════════════════════════════════════════════ */
window.addEventListener('scroll', () => {
  let cur = '';
  sections.forEach(s => { if (window.scrollY >= s.offsetTop - 130) cur = s.id; });
  document.querySelectorAll('.header-nav a').forEach(a => {
    a.classList.toggle('active', a.getAttribute('href') === '#' + cur);
  });
}, { passive: true });

/* ═══════════════════════════════════════════════════════════════
   24. DATA STREAM EFFECT — random numbers rain on background
════════════════════════════════════════════════════════════════ */
(function() {
  const streamContainer = document.createElement('div');
  streamContainer.id = 'data-streams';
  streamContainer.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:0;overflow:hidden;';
  document.body.appendChild(streamContainer);

  function spawnStream() {
    const s = document.createElement('div');
    const x = Math.random() * 100;
    const dur = 4 + Math.random() * 6;
    const delay = Math.random() * 5;
    s.style.cssText = `
      position:absolute;left:${x}%;top:-20px;
      font-family:'Share Tech Mono',monospace;font-size:9px;
      color:rgba(0,255,65,0.12);writing-mode:vertical-rl;
      white-space:nowrap;pointer-events:none;
      animation:stream-fall ${dur}s ${delay}s linear infinite;
      letter-spacing:2px;
    `;
    s.textContent = Array.from({length:12},()=>Math.floor(Math.random()*2)).join('');
    streamContainer.appendChild(s);
    // limit DOM
    if (streamContainer.children.length > 20) streamContainer.firstChild.remove();
  }

  const streamStyle = document.createElement('style');
  streamStyle.textContent = `@keyframes stream-fall{from{transform:translateY(-100px);opacity:0}10%{opacity:1}90%{opacity:.8}to{transform:translateY(110vh);opacity:0}}`;
  document.head.appendChild(streamStyle);

  for (let i = 0; i < 8; i++) spawnStream();
  setInterval(spawnStream, 1800);
})();

/* ═══════════════════════════════════════════════════════════════
   25. SIDEBAR TOGGLE BUTTON
════════════════════════════════════════════════════════════════ */
const sidebarToggle = document.getElementById('sidebar-toggle');
if (sidebarToggle) {
  sidebarToggle.onclick = () => document.getElementById('sidebar').classList.toggle('open');
}

/* ── TERMINAL BOOT ── */
(function bootTerminal() {
  const tb2 = document.getElementById('terminal-body');
  if (!tb2) return;
  tb2.innerHTML = '';
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
    tb2.appendChild(div);
    tb2.scrollTop = tb2.scrollHeight;
    setTimeout(nextLine, l.type === 'cmd' ? 860 : 370);
  }
  setTimeout(nextLine, 1200);
})();

/* ── KICK OFF MASTER LOOP (after all functions are defined) ─── */
requestAnimationFrame(masterLoop);