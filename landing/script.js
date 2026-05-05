// ========================================================
// Creatota — landing page interactions
// Vanilla JS. No libraries. Honors prefers-reduced-motion.
// ========================================================

(() => {
  'use strict';

  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ---- 1. Sticky-nav border on scroll ------------------
  const nav = document.querySelector('.nav');
  if (nav) {
    const onScroll = () => nav.classList.toggle('scrolled', window.scrollY > 12);
    onScroll();
    addEventListener('scroll', onScroll, { passive: true });
  }

  // ---- 2. Live "leak" ticker ---------------------------
  // ~$3.40/sec. Only runs while visible. Stable accumulator.
  const tickerEl = document.getElementById('ticker-num');
  if (tickerEl) {
    const RATE = 3.40; // dollars per second
    const fmt = new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    let total = 0;
    let last = performance.now();
    let running = true;

    const step = (now) => {
      if (!running) { last = now; requestAnimationFrame(step); return; }
      const dt = Math.min(0.5, (now - last) / 1000);
      last = now;
      total += RATE * dt;
      tickerEl.textContent = fmt.format(total);
      requestAnimationFrame(step);
    };

    // Pause when offscreen (tab hidden)
    document.addEventListener('visibilitychange', () => {
      running = !document.hidden;
      last = performance.now();
    });

    requestAnimationFrame(step);
  }

  // ---- 3. Scroll reveal --------------------------------
  // Tag every section + key headline as reveal target.
  const revealCandidates = document.querySelectorAll(
    'section, .hero-h .line, .stat, .step, .fix, .qa-row, .ag-line, .compare-col'
  );
  revealCandidates.forEach((el) => el.classList.add('reveal'));

  if (reduced || !('IntersectionObserver' in window)) {
    revealCandidates.forEach((el) => el.classList.add('in'));
  } else {
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (e.isIntersecting) {
          // Stagger lines for hero headline
          if (e.target.parentElement && e.target.parentElement.classList.contains('hero-h')) {
            const idx = Array.from(e.target.parentElement.children).indexOf(e.target);
            e.target.style.transitionDelay = `${idx * 80}ms`;
          }
          e.target.classList.add('in');
          io.unobserve(e.target);
        }
      }
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    revealCandidates.forEach((el) => io.observe(el));
  }

  // ---- 4. Counter-up for big stats ---------------------
  const counters = document.querySelectorAll('[data-count-to]');
  if (counters.length && 'IntersectionObserver' in window && !reduced) {
    const numIO = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (!e.isIntersecting) continue;
        const el = e.target;
        const target = parseFloat(el.dataset.countTo);
        const dur = 900;
        const t0 = performance.now();
        const tick = (now) => {
          const p = Math.min(1, (now - t0) / dur);
          // easeOutCubic
          const v = target * (1 - Math.pow(1 - p, 3));
          el.textContent = Number.isInteger(target) ? Math.round(v) : v.toFixed(1);
          if (p < 1) requestAnimationFrame(tick);
          else el.textContent = target;
        };
        requestAnimationFrame(tick);
        numIO.unobserve(el);
      }
    }, { threshold: 0.4 });
    counters.forEach((el) => numIO.observe(el));
  } else {
    counters.forEach((el) => { el.textContent = el.dataset.countTo; });
  }

  // ---- 5. Leak map interactions ------------------------
  const annotation = document.getElementById('annotation');
  const hots = document.querySelectorAll('[data-hot]');
  if (annotation && hots.length) {
    const empty = annotation.querySelector('.ann-empty');
    const content = annotation.querySelector('.ann-content');
    const tagEl   = annotation.querySelector('.ann-tag');
    const titleEl = annotation.querySelector('.ann-title');
    const bodyEl  = annotation.querySelector('.ann-body');

    let activeHot = null;

    const showAnnotation = (hot) => {
      if (activeHot && activeHot !== hot) activeHot.classList.remove('is-active');
      activeHot = hot;
      hot.classList.add('is-active');
      empty.hidden = true;
      content.hidden = false;
      tagEl.textContent = hot.dataset.tag || '';
      titleEl.textContent = hot.dataset.title || '';
      bodyEl.textContent = hot.dataset.body || '';
    };

    const clearAnnotation = () => {
      if (activeHot) activeHot.classList.remove('is-active');
      activeHot = null;
      empty.hidden = false;
      content.hidden = true;
    };

    const isCoarse = matchMedia('(hover: none), (pointer: coarse)').matches;

    hots.forEach((hot) => {
      // Desktop: hover + focus
      if (!isCoarse) {
        hot.addEventListener('mouseenter', () => showAnnotation(hot));
        hot.addEventListener('focus',      () => showAnnotation(hot));
        hot.addEventListener('mouseleave', (e) => {
          // Only clear if leaving to non-hot
          if (!e.relatedTarget || !e.relatedTarget.closest('[data-hot]')) {
            // Keep it sticky-ish: small delay so reading time is comfortable
            setTimeout(() => { if (activeHot === hot && !hot.matches(':hover')) clearAnnotation(); }, 120);
          }
        });
      }
      // Tap: toggle
      hot.addEventListener('click', (ev) => {
        ev.preventDefault();
        if (activeHot === hot) clearAnnotation();
        else showAnnotation(hot);
      });
    });

    // Click-out clears on coarse pointers
    if (isCoarse) {
      document.addEventListener('click', (e) => {
        if (!e.target.closest('[data-leakmap]')) clearAnnotation();
      });
    }
  }

  // ---- 6. Smooth in-page scroll for hash links ---------
  document.querySelectorAll('a[href^="#"]').forEach((a) => {
    a.addEventListener('click', (e) => {
      const id = a.getAttribute('href');
      if (id.length < 2) return;
      const target = document.querySelector(id);
      if (!target) return;
      e.preventDefault();
      target.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' });
      // Move focus for a11y once scroll ends
      target.setAttribute('tabindex', '-1');
      target.focus({ preventScroll: true });
    });
  });

  // ---- 7. Audit form: graceful client-side handling ----
  const form = document.querySelector('.audit-form');
  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const fd = new FormData(form);
      const name = (fd.get('name') || '').toString().trim();
      const url  = (fd.get('url')  || '').toString().trim();
      if (!name || !url) {
        const empty = form.querySelector('input:invalid') || form.querySelector('input');
        empty && empty.focus();
        return;
      }
      const btn = form.querySelector('button[type="submit"]');
      if (btn) {
        btn.disabled = true;
        btn.innerHTML = 'Sent · I’ll be in touch.';
        btn.style.background = 'var(--hazard)';
        btn.style.borderColor = 'var(--hazard)';
      }
      // Real implementation hooks here (mailto fallback, fetch to API, etc.)
    });
  }

  // ---- 8. Calendar placeholder -------------------------
  const calLink = document.querySelector('[data-calendar]');
  if (calLink) {
    calLink.addEventListener('click', (e) => {
      e.preventDefault();
      // Hook up a Cal.com / Calendly embed here.
      alert('Calendar embed goes here. (Hook this up to Cal.com or Calendly.)');
    });
  }
})();
