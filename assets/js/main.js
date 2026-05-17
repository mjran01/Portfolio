/* ─── CURSOR ─── */
const cursor = document.getElementById('cursor');
const dot    = document.getElementById('cursor-dot');
let mouseX = 0, mouseY = 0, dotX = 0, dotY = 0;
document.addEventListener('mousemove', e => {
  mouseX = e.clientX; mouseY = e.clientY;
  cursor.style.left = e.clientX + 'px';
  cursor.style.top  = e.clientY + 'px';
});
// smooth dot follow
(function animateDot() {
  dotX += (mouseX - dotX) * 0.18;
  dotY += (mouseY - dotY) * 0.18;
  dot.style.left = dotX + 'px';
  dot.style.top  = dotY + 'px';
  requestAnimationFrame(animateDot);
})();

// cursor grows on clickable elements
document.querySelectorAll('a, button, .project-card, .blog-card, .obj-card, .tech-card').forEach(el => {
  el.addEventListener('mouseenter', () => {
    cursor.style.width = '42px'; cursor.style.height = '42px';
    cursor.style.borderColor = 'var(--accent)';
    cursor.style.boxShadow = '0 0 16px var(--accent)';
  });
  el.addEventListener('mouseleave', () => {
    cursor.style.width = ''; cursor.style.height = '';
    cursor.style.borderColor = ''; cursor.style.boxShadow = '';
  });
});

/* ─── MATRIX RAIN ─── */
const mc   = document.getElementById('matrix-canvas');
const mctx = mc.getContext('2d');
function resizeMatrix() { mc.width = window.innerWidth; mc.height = window.innerHeight; }
resizeMatrix();
window.addEventListener('resize', resizeMatrix);

const chars = 'アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン0123456789ABCDEF<>/\\|{}[]';
let cols = Math.floor(mc.width / 16);
let drops = Array(cols).fill(1);
window.addEventListener('resize', () => {
  cols = Math.floor(mc.width / 16);
  drops = Array(cols).fill(1);
});
setInterval(() => {
  mctx.fillStyle = 'rgba(0,0,0,0.05)';
  mctx.fillRect(0, 0, mc.width, mc.height);
  mctx.font = '14px Share Tech Mono';
  drops.forEach((y, i) => {
    const ch = chars[Math.floor(Math.random() * chars.length)];
    // occasionally flash white or red
    const r = Math.random();
    mctx.fillStyle = r > .97 ? '#ffffff' : r > .94 ? '#ff003c' : '#00ff41';
    mctx.fillText(ch, i * 16, y * 16);
    if (y * 16 > mc.height && Math.random() > .975) drops[i] = 0;
    drops[i]++;
  });
}, 50);

/* ─── TYPEWRITER ─── */
const phrases = [
  'Building civic tech for Valenzuela City...',
  'Full-Stack Developer | Go · SvelteKit · React',
  'Engineering systems that serve real people.',
  'Writing clean code. Shipping real products.',
  '// Wake up, Neo...',
  'Access granted. Welcome, Mark.',
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

/* ─── SCROLL REVEAL (supports directional classes) ─── */
const revealEls = document.querySelectorAll('.reveal');
const observer = new IntersectionObserver(entries => {
  entries.forEach(e => {
    if (e.isIntersecting) {
      e.target.classList.add('in-view');
      observer.unobserve(e.target);
    }
  });
}, { threshold: 0.1 });
revealEls.forEach(el => observer.observe(el));

/* ─── COUNTER ANIMATION ─── */
function animateCounter(el) {
  const target = +el.dataset.target;
  let current = 0;
  const step = Math.ceil(target / 50);
  const t = setInterval(() => {
    current = Math.min(current + step, target);
    el.textContent = current + (target === 100 ? '%' : '+');
    if (current >= target) clearInterval(t);
  }, 35);
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
      const target = fill.style.width || '0%';
      // store target, reset to 0, then animate
      fill.style.transition = 'none';
      fill.style.width = '0%';
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          fill.style.transition = 'width 1.2s cubic-bezier(.4,0,.2,1)';
          fill.style.width = target;
        });
      });
      barObs.unobserve(fill);
    }
  });
}, { threshold: 0.3 });
document.querySelectorAll('.tech-level-fill').forEach(el => {
  const w = el.style.width;
  el.dataset.targetW = w;
  el.style.width = '0%';
  barObs.observe(el);
});

/* ─── SIDEBAR ACTIVE LINK ─── */
const sections  = document.querySelectorAll('section[id]');
const sideLinks = document.querySelectorAll('.sidebar-link');
window.addEventListener('scroll', () => {
  let cur = '';
  sections.forEach(s => { if (window.scrollY >= s.offsetTop - 120) cur = s.id; });
  sideLinks.forEach(l => {
    l.classList.toggle('active', l.getAttribute('href') === '#'+cur);
  });
}, { passive: true });

/* ─── CAROUSEL ─── */
const track = document.getElementById('carousel-track');
const cards  = track.children;
let cIdx = 0;
function getVisibleCount() {
  return window.innerWidth < 700 ? 1 : window.innerWidth < 1100 ? 2 : 3;
}
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

/* swipe support on carousel */
let touchStartX = 0;
track.addEventListener('touchstart', e => { touchStartX = e.touches[0].clientX; }, { passive:true });
track.addEventListener('touchend', e => {
  const dx = e.changedTouches[0].clientX - touchStartX;
  if (Math.abs(dx) > 50) {
    cIdx = dx < 0 ? Math.min(maxIdx(), cIdx+1) : Math.max(0, cIdx-1);
    updateCarousel();
  }
});

/* ─── TOGGLE ALL PROJECTS ─── */
let showingAll = false;
function toggleAllProjects() {
  showingAll = !showingAll;
  const grid = document.getElementById('all-projects-grid');
  const btn  = document.getElementById('see-more-btn');
  grid.classList.toggle('visible', showingAll);
  btn.textContent = showingAll ? '[ COLLAPSE_PROJECTS ]' : '[ LOAD_MORE_PROJECTS ]';
  // re-observe new cards for reveal
  if (showingAll) {
    grid.querySelectorAll('.reveal:not(.in-view)').forEach(el => observer.observe(el));
  }
}

/* ─── TECH STACK TABS ─── */
function showStack(name, btn) {
  document.querySelectorAll('.stack-panel').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.stack-tab').forEach(b => b.classList.remove('active'));
  document.getElementById('stack-'+name).classList.add('active');
  btn.classList.add('active');
  // re-trigger bar animations for newly shown panel
  document.getElementById('stack-'+name).querySelectorAll('.tech-level-fill').forEach(fill => {
    const target = fill.dataset.targetW || fill.style.width;
    fill.style.transition = 'none';
    fill.style.width = '0%';
    requestAnimationFrame(() => requestAnimationFrame(() => {
      fill.style.transition = 'width 1.2s cubic-bezier(.4,0,.2,1)';
      fill.style.width = target;
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
const particles = Array.from({length:70}, () => ({
  x: Math.random()*pc.width, y: Math.random()*pc.height,
  r: Math.random()*1.6+.4,
  vx: (Math.random()-.5)*.35, vy: (Math.random()-.5)*.35,
  a: Math.random()*.8+.1
}));
function drawParticles() {
  pctx.clearRect(0,0,pc.width,pc.height);
  particles.forEach(p => {
    pctx.beginPath();
    pctx.arc(p.x, p.y, p.r, 0, Math.PI*2);
    pctx.fillStyle = `rgba(0,255,65,${p.a})`;
    pctx.fill();
    p.x += p.vx; p.y += p.vy;
    if(p.x<0||p.x>pc.width)  p.vx *= -1;
    if(p.y<0||p.y>pc.height) p.vy *= -1;
  });
  for(let i=0;i<particles.length;i++) {
    for(let j=i+1;j<particles.length;j++) {
      const dx=particles[i].x-particles[j].x, dy=particles[i].y-particles[j].y;
      const d=Math.sqrt(dx*dx+dy*dy);
      if(d<130) {
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

/* ─── MOBILE SIDEBAR ─── */
document.querySelectorAll('.sidebar-link').forEach(l => {
  l.addEventListener('click', () => {
    document.getElementById('sidebar').classList.remove('open');
  });
});