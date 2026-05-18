/* ═══════════════════════════════════════════
   MARK PORTFOLIO — main.js
   Enhanced: parallax, alien, tilt, trails,
   star field, magnetic buttons, scroll fx
════════════════════════════════════════════ */

/* ─── CURSOR + TRAIL ─── */
const cursor = document.getElementById('cursor');
const dot    = document.getElementById('cursor-dot');
const trailContainer = document.getElementById('cursor-trail-container');

let mouseX = 0, mouseY = 0, dotX = 0, dotY = 0;
const TRAIL_COUNT = 10;
const trail = [];

// build trail dots
for (let i = 0; i < TRAIL_COUNT; i++) {
  const d = document.createElement('div');
  d.className = 'trail-dot';
  d.style.opacity = (1 - i / TRAIL_COUNT) * 0.5 + '';
  d.style.width = d.style.height = (5 - i * 0.35) + 'px';
  d.style.background = i % 3 === 0 ? 'var(--accent)' : 'var(--green)';
  trailContainer.appendChild(d);
  trail.push({ el: d, x: 0, y: 0 });
}

document.addEventListener('mousemove', e => {
  mouseX = e.clientX;
  mouseY = e.clientY;
  cursor.style.left = e.clientX + 'px';
  cursor.style.top  = e.clientY + 'px';
});

(function animateCursor() {
  // smooth dot lag
  dotX += (mouseX - dotX) * 0.2;
  dotY += (mouseY - dotY) * 0.2;
  dot.style.left = dotX + 'px';
  dot.style.top  = dotY + 'px';

  // trail follows dot with cascading lag
  trail.forEach((t, i) => {
    const prev = i === 0 ? { x: dotX, y: dotY } : trail[i - 1];
    t.x += (prev.x - t.x) * 0.3;
    t.y += (prev.y - t.y) * 0.3;
    t.el.style.left = t.x + 'px';
    t.el.style.top  = t.y + 'px';
  });

  requestAnimationFrame(animateCursor);
})();

// cursor expand on interactive elements
document.querySelectorAll('a, button, .project-card, .blog-card, .obj-card, .tech-card, #alien-wrap').forEach(el => {
  el.addEventListener('mouseenter', () => {
    cursor.style.width  = '44px';
    cursor.style.height = '44px';
    cursor.style.borderColor = 'var(--accent)';
    cursor.style.boxShadow   = '0 0 20px var(--accent)';
    cursor.style.background  = 'rgba(255,0,60,0.05)';
  });
  el.addEventListener('mouseleave', () => {
    cursor.style.width  = '';
    cursor.style.height = '';
    cursor.style.borderColor = '';
    cursor.style.boxShadow   = '';
    cursor.style.background  = '';
  });
});

/* ─── MATRIX RAIN ─── */
const mc   = document.getElementById('matrix-canvas');
const mctx = mc.getContext('2d');
function resizeMatrix() { mc.width = window.innerWidth; mc.height = window.innerHeight; }
resizeMatrix();
window.addEventListener('resize', resizeMatrix);

const chars = 'アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン0123456789ABCDEF<>/\\|{}[]';
let matrixCols = Math.floor(mc.width / 16);
let drops = Array(matrixCols).fill(1);
window.addEventListener('resize', () => {
  matrixCols = Math.floor(mc.width / 16);
  drops = Array(matrixCols).fill(1);
});
setInterval(() => {
  mctx.fillStyle = 'rgba(0,0,0,0.05)';
  mctx.fillRect(0, 0, mc.width, mc.height);
  mctx.font = '14px Share Tech Mono';
  drops.forEach((y, i) => {
    const ch = chars[Math.floor(Math.random() * chars.length)];
    const r = Math.random();
    mctx.fillStyle = r > .97 ? '#ffffff' : r > .94 ? '#ff003c' : '#00ff41';
    mctx.fillText(ch, i * 16, y * 16);
    if (y * 16 > mc.height && Math.random() > .975) drops[i] = 0;
    drops[i]++;
  });
}, 50);

/* ─── STAR FIELD ─── */
function buildStars() {
  const container = document.getElementById('stars1');
  if (!container) return;
  container.innerHTML = '';
  for (let i = 0; i < 80; i++) {
    const s = document.createElement('div');
    const size = Math.random() * 2 + 1;
    s.style.cssText = `
      position:absolute;
      width:${size}px; height:${size}px;
      background:var(--green);
      border-radius:50%;
      left:${Math.random()*100}%;
      top:${Math.random()*100}%;
      opacity:${Math.random()*.6+.1};
      animation: star-twinkle ${2+Math.random()*4}s ease-in-out infinite;
      animation-delay:${Math.random()*4}s;
    `;
    container.appendChild(s);
  }
}
buildStars();

// inject star twinkle keyframes
const styleSheet = document.createElement('style');
styleSheet.textContent = `
  @keyframes star-twinkle {
    0%,100% { opacity:.15; transform:scale(1); }
    50%      { opacity:.8;  transform:scale(1.5); box-shadow:0 0 4px var(--green); }
  }
`;
document.head.appendChild(styleSheet);

/* ─── TYPEWRITER ─── */
const phrases = [
  'Building civic tech for Valenzuela City...',
  'Full-Stack Developer | Go · SvelteKit · React',
  'Engineering systems that serve real people.',
  'Writing clean code. Shipping real products.',
  '// Wake up, Neo...',
  'Access granted. Welcome, Mark.',
  'System online. All units operational.',
];
let pi=0, ci=0, deleting=false;
const tw = document.getElementById('typewriter');
function type() {
  const phrase = phrases[pi];
  if (!deleting) {
    tw.textContent = phrase.slice(0, ++ci);
    if (ci === phrase.length) { deleting=true; setTimeout(type, 2400); return; }
  } else {
    tw.textContent = phrase.slice(0, --ci);
    if (ci === 0) { deleting=false; pi=(pi+1)%phrases.length; }
  }
  setTimeout(type, deleting ? 35 : 65);
}
type();

/* ─── SCROLL REVEAL ─── */
const revealEls = document.querySelectorAll('.reveal');
const revealObs = new IntersectionObserver(entries => {
  entries.forEach((e, idx) => {
    if (e.isIntersecting) {
      // staggered delay based on sibling index
      const siblings = e.target.parentElement.querySelectorAll('.reveal');
      let delay = 0;
      siblings.forEach((s, i) => { if (s === e.target) delay = i * 80; });
      setTimeout(() => e.target.classList.add('in-view'), delay);
      revealObs.unobserve(e.target);
    }
  });
}, { threshold: 0.1 });
revealEls.forEach(el => revealObs.observe(el));

/* ─── COUNTER ANIMATION ─── */
function animateCounter(el) {
  const target = +el.dataset.target;
  let current = 0;
  const step = Math.ceil(target / 60);
  const t = setInterval(() => {
    current = Math.min(current + step, target);
    el.textContent = current + (target === 100 ? '%' : '+');
    if (current >= target) clearInterval(t);
  }, 30);
}
const counterObs = new IntersectionObserver(entries => {
  entries.forEach(e => {
    if (e.isIntersecting) { animateCounter(e.target); counterObs.unobserve(e.target); }
  });
}, { threshold: 0.5 });
document.querySelectorAll('.stat-num').forEach(el => counterObs.observe(el));

/* ─── TECH LEVEL BAR ANIMATION ─── */
const barObs = new IntersectionObserver(entries => {
  entries.forEach(e => {
    if (e.isIntersecting) {
      const fill = e.target;
      const target = fill.dataset.targetW || fill.getAttribute('style').match(/width:([\d%]+)/)?.[1] || '0%';
      fill.dataset.targetW = target;
      fill.style.transition = 'none';
      fill.style.width = '0%';
      requestAnimationFrame(() => requestAnimationFrame(() => {
        fill.style.transition = 'width 1.4s cubic-bezier(.4,0,.2,1)';
        fill.style.width = target;
      }));
      barObs.unobserve(fill);
    }
  });
}, { threshold: 0.3 });
document.querySelectorAll('.tech-level-fill').forEach(el => {
  el.dataset.targetW = el.style.width;
  el.style.width = '0%';
  barObs.observe(el);
});

/* ─── PARALLAX ─── */
let scrollY = 0;
let ticking = false;
function updateParallax() {
  scrollY = window.scrollY;
  document.querySelectorAll('.parallax-layer').forEach(layer => {
    const depth = parseFloat(layer.dataset.depth) || 0.1;
    const offset = scrollY * depth;
    layer.style.transform = `translateY(${offset}px)`;
  });
  ticking = false;
}
window.addEventListener('scroll', () => {
  if (!ticking) { requestAnimationFrame(updateParallax); ticking = true; }
}, { passive: true });

/* ─── HEADER SCROLL EFFECT ─── */
const siteHeader = document.getElementById('site-header');
window.addEventListener('scroll', () => {
  siteHeader.classList.toggle('scrolled', window.scrollY > 60);
}, { passive: true });

/* ─── 3D TILT on cards ─── */
function addTilt(selector, intensity = 8) {
  document.querySelectorAll(selector).forEach(card => {
    card.addEventListener('mousemove', e => {
      const rect = card.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top  + rect.height / 2;
      const dx = (e.clientX - cx) / (rect.width / 2);
      const dy = (e.clientY - cy) / (rect.height / 2);
      card.style.transform = `perspective(800px) rotateX(${-dy * intensity}deg) rotateY(${dx * intensity}deg) translateY(-6px)`;
    });
    card.addEventListener('mouseleave', () => {
      card.style.transform = '';
      card.style.transition = 'transform .5s ease';
    });
    card.addEventListener('mouseenter', () => {
      card.style.transition = 'transform .1s ease, border-color .3s, box-shadow .3s';
    });
  });
}
addTilt('.project-card', 6);
addTilt('.blog-card', 5);
addTilt('.obj-card', 8);
addTilt('.tech-card', 10);
addTilt('.banner', 3);

/* ─── MAGNETIC BUTTONS ─── */
document.querySelectorAll('.btn').forEach(btn => {
  btn.addEventListener('mousemove', e => {
    const rect = btn.getBoundingClientRect();
    const dx = e.clientX - (rect.left + rect.width / 2);
    const dy = e.clientY - (rect.top  + rect.height / 2);
    btn.style.transform = `translate(${dx * 0.3}px, ${dy * 0.4}px)`;
  });
  btn.addEventListener('mouseleave', () => {
    btn.style.transform = '';
    btn.style.transition = 'transform .4s cubic-bezier(.4,0,.2,1), all .25s';
  });
  btn.addEventListener('mouseenter', () => {
    btn.style.transition = 'transform .1s linear, all .25s';
  });
});

/* ─── ALIEN VIDEO INTERACTIONS ─── */
const alienWrap = document.getElementById('alien-wrap');
const alienVideo = document.getElementById('alien-video');
let alienClicks = 0;
alienWrap.addEventListener('click', () => {
  alienClicks++;
  // cycle through fun animations
  const anims = [
    'alien-spin', 'alien-shake', 'alien-bounce', 'alien-zoom'
  ];
  // inject one-shot keyframes if not already injected
  if (!document.getElementById('alien-oneshot')) {
    const s = document.createElement('style');
    s.id = 'alien-oneshot';
    s.textContent = `
      @keyframes alien-spin   { 0%{transform:rotate(0)} 100%{transform:rotate(360deg) scale(1.2)} }
      @keyframes alien-shake  { 0%,100%{transform:translateX(0)} 20%,60%{transform:translateX(-12px) rotate(-5deg)} 40%,80%{transform:translateX(12px) rotate(5deg)} }
      @keyframes alien-bounce { 0%,100%{transform:translateY(0) scale(1)} 40%{transform:translateY(-40px) scale(1.2)} 70%{transform:translateY(-20px) scale(1.1)} }
      @keyframes alien-zoom   { 0%,100%{transform:scale(1)} 50%{transform:scale(1.8)} }
    `;
    document.head.appendChild(s);
  }
  const anim = anims[alienClicks % anims.length];
  alienWrap.style.animation = `${anim} 0.7s ease`;
  setTimeout(() => {
    alienWrap.style.animation = 'alien-float 3.5s ease-in-out infinite, alien-drift 18s linear infinite';
  }, 700);
  // flash the glow green briefly
  alienWrap.style.filter = 'drop-shadow(0 0 30px rgba(0,255,65,1)) drop-shadow(0 0 60px rgba(0,255,65,0.6))';
  setTimeout(() => { alienWrap.style.filter = ''; }, 500);
});

// alien reacts to scroll speed
let lastScrollY = 0;
window.addEventListener('scroll', () => {
  const speed = Math.abs(window.scrollY - lastScrollY);
  lastScrollY = window.scrollY;
  if (speed > 30) {
    alienWrap.style.filter = `drop-shadow(0 0 ${8 + speed}px rgba(0,255,65,0.8))`;
    setTimeout(() => { alienWrap.style.filter = ''; }, 300);
  }
}, { passive: true });

/* ─── SIDEBAR ACTIVE LINK ─── */
const sections  = document.querySelectorAll('section[id]');
const sideLinks = document.querySelectorAll('.sidebar-link');
window.addEventListener('scroll', () => {
  let cur = '';
  sections.forEach(s => { if (window.scrollY >= s.offsetTop - 120) cur = s.id; });
  sideLinks.forEach(l => l.classList.toggle('active', l.getAttribute('href') === '#'+cur));
}, { passive: true });

/* ─── CAROUSEL ─── */
const track = document.getElementById('carousel-track');
const cards  = track.children;
let cIdx = 0;
function getVisibleCount() { return window.innerWidth < 700 ? 1 : window.innerWidth < 1100 ? 2 : 3; }
function maxIdx() { return Math.max(0, cards.length - getVisibleCount()); }

const dotsContainer = document.getElementById('carousel-dots');
function buildDots() {
  dotsContainer.innerHTML = '';
  for (let i=0; i<=maxIdx(); i++) {
    const d = document.createElement('div');
    d.className = 'carousel-dot' + (i===cIdx?' active':'');
    d.onclick = () => { cIdx=i; updateCarousel(); };
    dotsContainer.appendChild(d);
  }
}
function updateCarousel() {
  const cardW = cards[0].offsetWidth + 19;
  track.style.transform = `translateX(-${cIdx * cardW}px)`;
  document.querySelectorAll('.carousel-dot').forEach((d,i) => d.classList.toggle('active', i===cIdx));
}
document.getElementById('prev-btn').onclick = () => { cIdx=Math.max(0,cIdx-1); updateCarousel(); };
document.getElementById('next-btn').onclick = () => { cIdx=Math.min(maxIdx(),cIdx+1); updateCarousel(); };
buildDots();
window.addEventListener('resize', () => { buildDots(); updateCarousel(); });

// swipe
let touchStartX = 0;
track.addEventListener('touchstart', e => { touchStartX = e.touches[0].clientX; }, { passive:true });
track.addEventListener('touchend', e => {
  const dx = e.changedTouches[0].clientX - touchStartX;
  if (Math.abs(dx) > 50) { cIdx = dx < 0 ? Math.min(maxIdx(),cIdx+1) : Math.max(0,cIdx-1); updateCarousel(); }
});

/* ─── TOGGLE ALL PROJECTS ─── */
let showingAll = false;
function toggleAllProjects() {
  showingAll = !showingAll;
  const grid = document.getElementById('all-projects-grid');
  const btn  = document.getElementById('see-more-btn');
  grid.classList.toggle('visible', showingAll);
  btn.textContent = showingAll ? '[ COLLAPSE_PROJECTS ]' : '[ LOAD_MORE_PROJECTS ]';
  if (showingAll) grid.querySelectorAll('.reveal:not(.in-view)').forEach(el => revealObs.observe(el));
}

/* ─── TECH STACK TABS ─── */
function showStack(name, btn) {
  document.querySelectorAll('.stack-panel').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.stack-tab').forEach(b => b.classList.remove('active'));
  document.getElementById('stack-'+name).classList.add('active');
  btn.classList.add('active');
  // re-animate bars
  document.getElementById('stack-'+name).querySelectorAll('.tech-level-fill').forEach(fill => {
    const t = fill.dataset.targetW || '0%';
    fill.style.transition = 'none';
    fill.style.width = '0%';
    requestAnimationFrame(() => requestAnimationFrame(() => {
      fill.style.transition = 'width 1.4s cubic-bezier(.4,0,.2,1)';
      fill.style.width = t;
    }));
  });
}

/* ─── TERMINAL ANIMATION ─── */
const lines = [
  { type:'cmd', text:'whoami' },
  { type:'out', text:'mark_dev — full-stack engineer', cls:'success' },
  { type:'cmd', text:'cat skills.txt' },
  { type:'out', text:'Go · SvelteKit · React · MySQL · PHP · WordPress' },
  { type:'cmd', text:'ls projects/' },
  { type:'out', text:'ptdid_portal/  vcmpms_v2/  vibe_tribe_notions/  toda_id_printer/' },
  { type:'cmd', text:'cat mission.txt' },
  { type:'out', text:'Build systems that serve real communities.', cls:'success' },
  { type:'cmd', text:'uptime' },
  { type:'out', text:'coding since day one, still going strong' },
  { type:'cmd', text:'ping valenzuela.gov.ph' },
  { type:'out', text:'PONG — 12ms — systems nominal.', cls:'success' },
  { type:'cmd', text:'./run_alien.sh' },
  { type:'out', text:'👾 alien process started on port 1337', cls:'success' },
  { type:'cmd', text:'_' },
];
const tb = document.getElementById('terminal-body');
let li = 0;
function addTermLine() {
  if (li >= lines.length) return;
  const l = lines[li++];
  const div = document.createElement('div');
  div.className = 't-line';
  if (l.type === 'cmd') {
    div.innerHTML = `<span class="t-prompt">mark@dev:~$</span> <span class="t-cmd">${l.text}</span>`;
  } else {
    div.innerHTML = `<span class="t-out ${l.cls||''}">${l.text}</span>`;
  }
  tb.appendChild(div);
  tb.scrollTop = tb.scrollHeight;
  setTimeout(addTermLine, l.type==='cmd' ? 900 : 420);
}
setTimeout(addTermLine, 1200);

/* ─── PARTICLE CANVAS (hero) ─── */
const pc   = document.getElementById('particle-canvas');
const pctx = pc.getContext('2d');
function resizeParticle() { pc.width = pc.offsetWidth; pc.height = pc.offsetHeight; }
resizeParticle();
window.addEventListener('resize', resizeParticle);

const particles = Array.from({length:80}, () => ({
  x: Math.random()*pc.width, y: Math.random()*pc.height,
  r: Math.random()*1.8+.3,
  vx: (Math.random()-.5)*.4, vy: (Math.random()-.5)*.4,
  a: Math.random()*.8+.1,
  color: Math.random() > .92 ? '#ff003c' : '#00ff41'
}));

function drawParticles() {
  pctx.clearRect(0,0,pc.width,pc.height);
  particles.forEach(p => {
    pctx.beginPath();
    pctx.arc(p.x, p.y, p.r, 0, Math.PI*2);
    pctx.fillStyle = p.color === '#ff003c' ? `rgba(255,0,60,${p.a})` : `rgba(0,255,65,${p.a})`;
    pctx.fill();
    p.x += p.vx; p.y += p.vy;
    if (p.x<0||p.x>pc.width)  p.vx *= -1;
    if (p.y<0||p.y>pc.height) p.vy *= -1;
  });
  // connecting lines
  for (let i=0; i<particles.length; i++) {
    for (let j=i+1; j<particles.length; j++) {
      const dx=particles[i].x-particles[j].x, dy=particles[i].y-particles[j].y;
      const d=Math.sqrt(dx*dx+dy*dy);
      if (d<130) {
        pctx.beginPath();
        pctx.moveTo(particles[i].x, particles[i].y);
        pctx.lineTo(particles[j].x, particles[j].y);
        pctx.strokeStyle = `rgba(0,255,65,${.14*(1-d/130)})`;
        pctx.lineWidth=.5; pctx.stroke();
      }
    }
  }
  requestAnimationFrame(drawParticles);
}
drawParticles();

/* ─── MOBILE SIDEBAR CLOSE ─── */
document.querySelectorAll('.sidebar-link').forEach(l => {
  l.addEventListener('click', () => document.getElementById('sidebar').classList.remove('open'));
});

/* ─── SECTION ENTRANCE GLITCH on title ─── */
const titleObs = new IntersectionObserver(entries => {
  entries.forEach(e => {
    if (e.isIntersecting) {
      e.target.classList.add('glitch-enter');
      setTimeout(() => e.target.classList.remove('glitch-enter'), 800);
    }
  });
}, { threshold: 0.5 });

const glitchEnterStyle = document.createElement('style');
glitchEnterStyle.textContent = `
  .glitch-enter {
    animation: glitch-burst .8s ease both !important;
  }
  @keyframes glitch-burst {
    0%  { letter-spacing:.3em; opacity:0; text-shadow:0 0 30px var(--green); }
    30% { letter-spacing:.15em; clip-path:inset(10% 0 60% 0); color:var(--accent); }
    60% { letter-spacing:.1em; clip-path:inset(40% 0 20% 0); color:var(--green); }
    100%{ letter-spacing:.08em; opacity:1; clip-path:none; text-shadow:0 0 24px rgba(0,255,65,.35); }
  }
`;
document.head.appendChild(glitchEnterStyle);
document.querySelectorAll('h2.section-title').forEach(h => titleObs.observe(h));

/* ─── RANDOM UFO SPAWNER ─── */
(function () {
  const UFO_COUNT   = 3;      /* max UFOs alive at once          */
  const MIN_DELAY   = 8000;   /* ms before next UFO spawns       */
  const MAX_DELAY   = 22000;
  const MIN_STAY    = 6000;   /* how long a UFO lingers          */
  const MAX_STAY    = 14000;

  function rand(min, max) { return Math.random() * (max - min) + min; }

  function spawnUFO() {
    /* Don't exceed cap */
    if (document.querySelectorAll('.ufo-wrap').length >= UFO_COUNT) return;

    const wrap = document.createElement('div');
    wrap.className = 'ufo-wrap';

    /* Random position anywhere in the viewport */
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const size = wrap.style.width ? parseInt(wrap.style.width) : 110;

    wrap.style.left = rand(10, vw - size - 20) + 'px';
    wrap.style.top  = rand(10, vh - size - 60) + 'px';

    /* Randomise float duration so multiple UFOs feel independent */
    wrap.style.animationDuration = rand(3.2, 5.5).toFixed(2) + 's';

    wrap.innerHTML = `
      <video class="ufo-video" src="assets/video/ufo.webm" autoplay loop muted playsinline></video>
      <div class="ufo-glow"></div>
      <div class="ufo-beam"></div>
    `;

    document.body.appendChild(wrap);

    /* Fade in */
    requestAnimationFrame(() => {
      requestAnimationFrame(() => wrap.classList.add('visible'));
    });

    /* Drift slowly while alive */
    let driftX = rand(-60, 60);
    let driftY = rand(-40, 40);
    let elapsed = 0;
    const stayTime = rand(MIN_STAY, MAX_STAY);
    const DRIFT_INTERVAL = 3000;

    const driftTimer = setInterval(() => {
      elapsed += DRIFT_INTERVAL;
      if (elapsed >= stayTime) { clearInterval(driftTimer); return; }

      const newLeft = Math.min(Math.max(10, parseFloat(wrap.style.left) + rand(-50, 50)), vw - size - 20);
      const newTop  = Math.min(Math.max(10, parseFloat(wrap.style.top)  + rand(-35, 35)), vh - size - 60);
      wrap.style.transition = 'left 2.8s ease-in-out, top 2.8s ease-in-out, opacity 1.2s ease';
      wrap.style.left = newLeft + 'px';
      wrap.style.top  = newTop  + 'px';
    }, DRIFT_INTERVAL);

    /* Fade out, then remove */
    setTimeout(() => {
      clearInterval(driftTimer);
      wrap.classList.remove('visible');
      wrap.addEventListener('transitionend', () => wrap.remove(), { once: true });
    }, stayTime);
  }

  /* Keep scheduling new UFOs forever */
  function scheduleNext() {
    setTimeout(() => {
      spawnUFO();
      scheduleNext();
    }, rand(MIN_DELAY, MAX_DELAY));
  }

  /* First UFO appears quickly so the effect is noticed */
  setTimeout(spawnUFO, 2500);
  scheduleNext();
})();
