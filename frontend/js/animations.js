// NER SmartLogix — Animations & Interactivity Module

// ─── 1. PAGE TRANSITION ───────────────────────────────────────────────────────
// Fades + slides in the page content on every navigation change.
export function pageTransition() {
  const el = document.getElementById('page-content');
  if (!el) return;
  el.classList.remove('page-enter');
  // Force reflow so animation restarts
  void el.offsetWidth;
  el.classList.add('page-enter');
}

// ─── 2. SCROLL REVEAL ─────────────────────────────────────────────────────────
// Watches .reveal elements and plays them in with a stagger delay when visible.
let _revealObserver = null;

export function initScrollReveal() {
  // Disconnect old observer
  if (_revealObserver) _revealObserver.disconnect();

  _revealObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('revealed');
        _revealObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.08 });

  // Add reveal class to cards/items that should animate in
  const selectors = [
    '.card', '.route', '.alert', '.trip', '.facility', '.help',
    '.section-head', '.detail', '.plan-grid > *', '.grid > *',
    '.fleet-card', '.stat-card'
  ];
  const elements = document.querySelectorAll(selectors.join(', '));
  elements.forEach((el, i) => {
    if (el.classList.contains('reveal')) return; // already set up
    el.classList.add('reveal');
    el.style.transitionDelay = `${Math.min(i * 55, 500)}ms`;
    _revealObserver.observe(el);
  });
}

// ─── 3. ANIMATED NUMBER COUNTERS ──────────────────────────────────────────────
// Elements with data-count="123" will count up when they enter the viewport.
export function initCounters() {
  const counterObs = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const el = entry.target;
      const target = parseInt(el.dataset.count, 10);
      if (isNaN(target)) return;
      counterObs.unobserve(el);
      let start = 0;
      const duration = 1200;
      const step = Math.ceil(target / (duration / 16));
      const timer = setInterval(() => {
        start = Math.min(start + step, target);
        el.textContent = start.toLocaleString();
        if (start >= target) clearInterval(timer);
      }, 16);
    });
  }, { threshold: 0.5 });

  document.querySelectorAll('[data-count]').forEach(el => counterObs.observe(el));
}

// ─── 4. RIPPLE EFFECT ON BUTTONS ──────────────────────────────────────────────
// Adds a material-style ripple to every .btn and nav button.
export function initRipple() {
  document.querySelectorAll('.btn, .nav button, .side-bottom button, .topbar-actions button').forEach(btn => {
    if (btn.dataset.rippleInit) return;
    btn.dataset.rippleInit = '1';
    btn.addEventListener('click', function (e) {
      const rect = this.getBoundingClientRect();
      const size = Math.max(rect.width, rect.height) * 2;
      const x = e.clientX - rect.left - size / 2;
      const y = e.clientY - rect.top - size / 2;
      const ripple = document.createElement('span');
      ripple.className = 'ripple-wave';
      ripple.style.cssText = `width:${size}px;height:${size}px;left:${x}px;top:${y}px`;
      this.style.position = 'relative';
      this.style.overflow = 'hidden';
      this.appendChild(ripple);
      setTimeout(() => ripple.remove(), 600);
    });
  });
}

// ─── 5. SIDEBAR ACTIVE INDICATOR ──────────────────────────────────────────────
// Moves a glowing pill indicator to the active nav button.
export function initSidebarIndicator() {
  const nav = document.querySelector('.nav');
  const activeBtn = document.querySelector('.nav button.active');
  if (!nav || !activeBtn) return;

  let indicator = document.getElementById('nav-indicator');
  if (!indicator) {
    indicator = document.createElement('div');
    indicator.id = 'nav-indicator';
    indicator.className = 'nav-indicator';
    nav.style.position = 'relative';
    nav.prepend(indicator);
  }

  const navRect = nav.getBoundingClientRect();
  const btnRect = activeBtn.getBoundingClientRect();
  indicator.style.top = `${btnRect.top - navRect.top + nav.scrollTop}px`;
  indicator.style.height = `${btnRect.height}px`;
}

// ─── 6. RISK SCORE BAR ────────────────────────────────────────────────────────
// Animates a coloured progress bar for route risk scores.
export function initRiskBars() {
  document.querySelectorAll('[data-risk-score]').forEach(bar => {
    const score = parseFloat(bar.dataset.riskScore) || 0;
    bar.style.width = '0%';
    setTimeout(() => {
      bar.style.transition = 'width 1s cubic-bezier(0.4,0,0.2,1)';
      bar.style.width = `${Math.min(score, 100)}%`;
    }, 200);
  });
}

// ─── 7. SKELETON SHIMMER ──────────────────────────────────────────────────────
// Inserts skeleton cards while content is loading.
export function skeletonGrid(count = 3, height = 120) {
  return Array.from({ length: count }).map(() =>
    `<div class="skeleton-card" style="height:${height}px"></div>`
  ).join('');
}

// ─── MASTER INIT ──────────────────────────────────────────────────────────────
// Call this after every render() to wire up all interactions.
export function initAnimations() {
  pageTransition();
  // Small delay so DOM is painted before we query elements
  requestAnimationFrame(() => {
    initScrollReveal();
    initCounters();
    initRipple();
    initSidebarIndicator();
    initRiskBars();
    if (typeof window.initUlipSlider === 'function') {
      window.initUlipSlider();
    }
  });
}

