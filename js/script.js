/* ==========================================================
   POLLOS TAVO'S — script.js (JavaScript vanilla, sin librerías)
   ========================================================== */

/* ---------------- CONFIGURACIÓN EDITABLE ----------------
   DIRECCION_DEL_NEGOCIO -> CONFIG.direccion
   INSTAGRAM_URL         -> CONFIG.instagram
   FACEBOOK_URL          -> CONFIG.facebook                */
const CONFIG = {
  whatsapp: '528112735442',
  direccion: '', // Ej. 'Av. Ejemplo 123, Col. Centro, Monterrey, N.L., C.P. 64000'
  instagram: '', // Ej. 'https://instagram.com/pollostavos'
  facebook: ''   // Ej. 'https://facebook.com/pollostavos'
};

document.addEventListener('DOMContentLoaded', () => {

  /* ---------- Enlaces de WhatsApp con mensaje automático ---------- */
  document.querySelectorAll('[data-wa]').forEach(el => {
    el.href = `https://wa.me/${CONFIG.whatsapp}?text=${encodeURIComponent(el.dataset.wa)}`;
    if (!el.classList.contains('wa-float')) { el.target = '_blank'; el.rel = 'noopener'; }
  });

  /* ---------- Redes sociales (variables editables) ---------- */
  const redes = [
    [document.getElementById('ig-link'), CONFIG.instagram, 'Instagram'],
    [document.getElementById('fb-link'), CONFIG.facebook, 'Facebook']
  ];
  redes.forEach(([el, url, nombre]) => {
    if (!el) return;
    if (url) { el.href = url; el.target = '_blank'; el.rel = 'noopener'; }
    else el.addEventListener('click', e => {
      e.preventDefault();
      toast(`Muy pronto nuestra página de ${nombre} 📲`);
    });
  });

  /* ---------- Dirección y botón "Cómo llegar" ---------- */
  const dirEl = document.getElementById('direccion-text');
  if (CONFIG.direccion && dirEl) dirEl.textContent = CONFIG.direccion;

  const btnLlegar = document.getElementById('btn-llegar');
  if (btnLlegar) btnLlegar.addEventListener('click', e => {
    if (CONFIG.direccion) {
      window.open('https://www.google.com/maps/search/?api=1&query=' +
        encodeURIComponent("Pollos Tavo's " + CONFIG.direccion), '_blank', 'noopener');
    } else {
      e.preventDefault();
      toast('📍 Muy pronto publicaremos nuestra dirección. ¡Pide por WhatsApp mientras tanto!');
    }
  });

  /* ---------- Header fijo con sombra al hacer scroll ---------- */
  const header = document.getElementById('header');
  const volver = document.getElementById('volver-arriba');
  window.addEventListener('scroll', () => {
    header.classList.toggle('scrolled', window.scrollY > 10);
    volver.classList.toggle('show', window.scrollY > 600);
  }, { passive: true });

  volver.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));

  /* ---------- Menú hamburguesa ---------- */
  const toggle = document.getElementById('menu-toggle');
  const nav = document.getElementById('nav-principal');

  const cerrarNav = () => {
    nav.classList.remove('open');
    toggle.classList.remove('open');
    toggle.setAttribute('aria-expanded', 'false');
    document.body.classList.remove('nav-open');
  };

  toggle.addEventListener('click', () => {
    const abierto = nav.classList.toggle('open');
    toggle.classList.toggle('open', abierto);
    toggle.setAttribute('aria-expanded', String(abierto));
    document.body.classList.toggle('nav-open', abierto);
  });

  nav.querySelectorAll('a').forEach(a => a.addEventListener('click', cerrarNav));

  /* ---------- Aparición progresiva al hacer scroll ---------- */
  const observer = new IntersectionObserver(entradas => {
    entradas.forEach(e => {
      if (e.isIntersecting) { e.target.classList.add('visible'); observer.unobserve(e.target); }
    });
  }, { threshold: 0.12 });

  document.querySelectorAll('.reveal').forEach(el => observer.observe(el));

  /* ---------- Brasas flotantes en el Hero (canvas, sutil) ---------- */
  const canvas = document.getElementById('canvas-brasas');
  if (canvas && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    const ctx = canvas.getContext('2d');
    let W, H;
    const partes = [];

    const medir = () => { W = canvas.width = canvas.offsetWidth; H = canvas.height = canvas.offsetHeight; };
    medir();
    window.addEventListener('resize', medir);

    const nueva = p => {
      p.x = Math.random() * W;
      p.y = H + 20;
      p.r = 0.8 + Math.random() * 2.2;
      p.v = 0.35 + Math.random() * 1;
      p.a = 0.10 + Math.random() * 0.40;
      p.t = Math.random() * Math.PI * 2;
      return p;
    };

    for (let i = 0; i < 40; i++) { const p = nueva({}); p.y = Math.random() * H; partes.push(p); }

    (function frame() {
      ctx.clearRect(0, 0, W, H);
      ctx.shadowColor = 'rgba(255, 120, 30, .8)';
      ctx.shadowBlur = 8;
      for (const p of partes) {
        p.y -= p.v; p.t += 0.02; p.x += Math.sin(p.t) * 0.4;
        if (p.y < -10) nueva(p);
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, ${140 + Math.floor(60 * Math.sin(p.t))}, 40, ${p.a})`;
        ctx.fill();
      }
      requestAnimationFrame(frame);
    })();
  }
});

/* ---------- Toast (avisos) ---------- */
let toastTimer;
function toast(msg) {
  const el = document.getElementById('toast');
  if (!el) return;
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 3200);
}
