/* ==========================================================
   POLLOS TAVO'S — script.js (JavaScript vanilla, sin librerías)
   ========================================================== */

const CONFIG = {
  whatsapp: '528112735442',
  direccion: '', // DIRECCION_DEL_NEGOCIO
  instagram: '', // INSTAGRAM_URL
  facebook: ''   // FACEBOOK_URL
};

/* Modalidades de entrega para los pedidos */
const MODALIDADES = {
  domicilio: '🛵 Entrega a domicilio',
  recoger:   '🏪 Pasan por el pedido al local'
};
let modalidad = 'domicilio';

const waLink = msg => `https://wa.me/${CONFIG.whatsapp}?text=${encodeURIComponent(msg)}`;

/* Construye/actualiza los enlaces de WhatsApp:
   - a[data-wa] sin pregunta  → mensaje tal cual (header, hero, complementos, flotante…)
   - a[data-wa] con data-pregunta (promos y paquetes) → base + modalidad + pregunta
   - .menu-item con stepper  → cantidad × producto + total + modalidad               */
function actualizarPedidosWA() {
  document.querySelectorAll('a[data-wa]').forEach(el => {
    const base = el.dataset.wa;
    const pregunta = el.dataset.pregunta;
    el.href = pregunta
      ? waLink(`${base}\n${MODALIDADES[modalidad]}\n${pregunta}`)
      : waLink(base);
    if (!el.classList.contains('wa-float')) { el.target = '_blank'; el.rel = 'noopener'; }
  });

  document.querySelectorAll('.menu-item[data-precio]').forEach(item => {
    const qty    = parseInt(item.querySelector('.step-qty').textContent, 10) || 1;
    const precio = parseInt(item.dataset.precio, 10);
    const nombre = item.dataset.producto;
    const total  = precio * qty;
    const detalle = qty > 1
      ? `${qty} × ${nombre} — $${precio} c/u\nTotal: $${total}`
      : `${nombre} — $${precio}`;
    const link = item.querySelector('.btn-mini');
    if (link) {
      link.href = waLink(
        `Hola Pollos Tavo's 👋\nQuiero realizar el siguiente pedido:\n\n${detalle}\n\n${MODALIDADES[modalidad]}\n¿Me pueden confirmar disponibilidad y total?`
      );
      link.target = '_blank'; link.rel = 'noopener';
    }
  });
}

document.addEventListener('DOMContentLoaded', () => {

  /* ---------- Estado del negocio: ABIERTO / CERRADO (header + contacto) ----------
     Horario: Lunes a Domingo, 12:00 PM - 6:00 PM
     Zona horaria de Monterrey para que sea preciso en cualquier lugar. */
  const actualizarEstado = () => {
    // Tarjeta de contacto (con mascota)
    const badge = document.getElementById('estado-negocio');
    const texto = document.getElementById('estado-texto');
    // Header (compacto, sin mascota)
    const hBadge = document.getElementById('estado-header');
    const hMain  = document.getElementById('estado-header-main');
    const hSub   = document.getElementById('estado-header-sub');

    // Hora actual en zona horaria de Monterrey (CST/CDT)
    const ahora = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Monterrey' }));
    const minutos = ahora.getHours() * 60 + ahora.getMinutes();
    const abierto = minutos >= 12 * 60 && minutos < 18 * 60;

    /* --- Tarjeta de contacto: mensaje completo con cuenta regresiva --- */
    if (badge && texto) {
      badge.classList.remove('abierto', 'cerrado');
      badge.classList.add(abierto ? 'abierto' : 'cerrado');

      if (abierto) {
        const minFaltan = 18 * 60 - minutos;
        texto.textContent = `¡Estamos ABIERTOS! 🎉 (cerramos en ${Math.floor(minFaltan / 60)}h ${minFaltan % 60}m)`;
      } else {
        const minFaltan = minutos < 12 * 60
          ? 12 * 60 - minutos                       // aún no abre hoy
          : (24 * 60 - minutos) + 12 * 60;          // ya cerró, abre mañana
        texto.textContent = `Estamos CERRADOS 😴 (abrimos en ${Math.floor(minFaltan / 60)}h ${minFaltan % 60}m)`;
      }
    }

    /* --- Header: versión corta junto al logo --- */
    if (hBadge && hMain && hSub) {
      hBadge.classList.toggle('abierto', abierto);
      hBadge.classList.toggle('cerrado', !abierto);
      hMain.textContent = abierto ? 'Abierto' : 'Cerrado';
      hSub.textContent  = abierto ? '· cierra 6:00 PM' : '· abre 12:00 PM';
    }
  };

  actualizarEstado();
  // Se revisa cada minuto para cambiar de estado automáticamente
  setInterval(actualizarEstado, 60 * 1000);

  /* ---------- Selector de modalidad de entrega (sincronizado) ---------- */
  document.querySelectorAll('.entrega-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      modalidad = btn.dataset.entrega;
      document.querySelectorAll('.entrega-btn').forEach(b => {
        const activo = b.dataset.entrega === modalidad;
        b.classList.toggle('active', activo);
        b.setAttribute('aria-pressed', String(activo));
      });
      actualizarPedidosWA();
      toast(modalidad === 'domicilio' ? '🛵 Pedido con entrega a domicilio' : '🏪 Pasas por tu pedido al local');
    });
  });

  /* ---------- Selectores de cantidad en el menú ---------- */
  document.querySelectorAll('.step-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const item    = btn.closest('.menu-item');
      const qtyEl   = item.querySelector('.step-qty');
      const totalEl = item.querySelector('.menu-total');
      let qty = (parseInt(qtyEl.textContent, 10) || 1) + parseInt(btn.dataset.step, 10);
      qty = Math.min(20, Math.max(1, qty));
      qtyEl.textContent = qty;
      const precio = parseInt(item.dataset.precio, 10);
      totalEl.textContent = qty > 1 ? `×${qty} = $${precio * qty}` : '';
      actualizarPedidosWA();
    });
  });

  actualizarPedidosWA(); // inicial

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
