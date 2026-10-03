// ═══════════════════════════════════════════════════════════
//  Particles — Phase 19
//  موتور ذرات شناور برای Split Hero
// ═══════════════════════════════════════════════════════════

/**
 * ایجاد ذرات شناور در یک container
 * @param {HTMLElement} container — عنصر میزبان
 * @param {Object} options
 * @returns {Function} destroy — تابع پاکسازی
 */
export function createParticles(container, {
  count      = 20,
  color      = 'rgba(255, 255, 255, 0.6)',
  minSize    = 2,
  maxSize    = 6,
  speed      = 1,
  orbit      = false,
} = {}) {
  if (!container) return () => {};

  // احترام به تنظیمات کاربر
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
    return () => {};
  }

  // ── ساخت Container ──
  const layer = document.createElement('div');
  layer.className = 'particles-layer';
  layer.setAttribute('aria-hidden', 'true');
  container.appendChild(layer);

  const particles = [];
  let rafId = null;
  let running = true;

  // ── ساخت یک ذره ──
  function makeParticle(i) {
    const el = document.createElement('span');
    el.className = 'particle';

    const size = minSize + Math.random() * (maxSize - minSize);

    el.style.cssText = `
      width: ${size}px;
      height: ${size}px;
      background: ${color};
      box-shadow: 0 0 ${size * 2}px ${color};
    `;

    // برای orbit، دور مرکز می‌چرخن
    if (orbit) {
      const angle = Math.random() * Math.PI * 2;
      const radius = 40 + Math.random() * 60;
      const speedAngle = (0.002 + Math.random() * 0.004) * speed;
      const direction = Math.random() > 0.5 ? 1 : -1;

      particles.push({
        el,
        mode: 'orbit',
        angle,
        radius,
        speedAngle: speedAngle * direction,
        cx: 50,
        cy: 50,
      });
    } else {
      // شناور ساده
      const x = Math.random() * 100;
      const y = Math.random() * 100;
      const vx = (Math.random() - 0.5) * 0.04 * speed;
      const vy = (Math.random() - 0.5) * 0.04 * speed;

      particles.push({
        el,
        mode: 'float',
        x, y, vx, vy,
        phase: Math.random() * Math.PI * 2,
        pulseSpeed: 0.3 + Math.random() * 0.5,
      });
    }

    layer.appendChild(el);
    return el;
  }

  for (let i = 0; i < count; i++) makeParticle(i);

  // ── انیمیشن loop ──
  const startTime = performance.now();
  function tick(now) {
    if (!running) return;

    const t = (now - startTime) / 1000;

    particles.forEach((p) => {
      if (p.mode === 'orbit') {
        p.angle += p.speedAngle;
        const x = p.cx + Math.cos(p.angle) * (p.radius / 5);
        const y = p.cy + Math.sin(p.angle) * (p.radius / 5);
        const scale = 0.9 + Math.sin(t * 1.5 + p.angle) * 0.15;
        p.el.style.left = `${x}%`;
        p.el.style.top  = `${y}%`;
        p.el.style.transform = `translate(-50%, -50%) scale(${scale})`;
        p.el.style.opacity = String(0.6 + Math.sin(t * 2 + p.angle) * 0.3);
      } else {
        p.x += p.vx;
        p.y += p.vy;

        // برخورد با لبه‌ها
        if (p.x < 0 || p.x > 100) p.vx *= -1;
        if (p.y < 0 || p.y > 100) p.vy *= -1;

        // جلوگیری از خارج شدن
        p.x = Math.max(0, Math.min(100, p.x));
        p.y = Math.max(0, Math.min(100, p.y));

        const pulse = 0.5 + Math.sin(t * p.pulseSpeed + p.phase) * 0.5;

        p.el.style.left = `${p.x}%`;
        p.el.style.top  = `${p.y}%`;
        p.el.style.opacity = String(0.3 + pulse * 0.5);
        p.el.style.transform = `translate(-50%, -50%) scale(${0.7 + pulse * 0.6})`;
      }
    });

    rafId = requestAnimationFrame(tick);
  }

  rafId = requestAnimationFrame(tick);

  // ── Pause وقتی tab مخفی می‌شه (کارایی) ──
  const onVisibility = () => {
    if (document.hidden) {
      running = false;
      if (rafId) cancelAnimationFrame(rafId);
    } else {
      if (!running) {
        running = true;
        rafId = requestAnimationFrame(tick);
      }
    }
  };
  document.addEventListener('visibilitychange', onVisibility);

  // ── Destroy ──
  return function destroy() {
    running = false;
    if (rafId) cancelAnimationFrame(rafId);
    document.removeEventListener('visibilitychange', onVisibility);
    layer.remove();
  };
}