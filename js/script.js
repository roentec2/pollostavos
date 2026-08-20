/* ==========================================================
   POLLOS TAVO'S — script.js completo (vanilla JS)
   Pedidos bloqueados fuera del horario (12:00–18:00 Monterrey)
   ========================================================== */

const CONFIG = {
  whatsapp: '528112735442',
  direccion: '',
  instagram: '',
  facebook: ''
};

const MODALIDADES = {
  domicilio: '🛵 Entrega a domicilio',
  recoger:   '🏪 Pasan por el pedido al local'
};

const COSTO_ENVIO = 30;

const DATOS_BANCO = {
  banco: 'BBVA Bancomer',
  cuenta: '4152-3137-7636-4239',
  titular: 'Nancy Rodríguez'
};

const COMPLEMENTOS = [
  { nombre: '1 salchicha', precio: 15 },
  { nombre: '3 salchichas', precio: 35 },
  { nombre: '1 salchicha preparada', precio: 25 },
  { nombre: '3 salchichas preparadas', precio: 65 },
  { nombre: 'Totopos', precio: 25 },
  { nombre: '1 chile preparado', precio: 25 },
  { nombre: '3 chiles preparados', precio: 60 },
  { nombre: 'Cebolla', precio: 10 },
  { nombre: 'Chile toreado', precio: 5 },
  { nombre: 'Coca-Cola 1.75 L', precio: 35 }
];

let modalidad = 'domicilio';
let metodoPago = 'efectivo';
let negocioAbierto = false;
const carrito = new Map();

/* ---------- Utilidades ---------- */
const waLink = msg => `https://wa.me/${CONFIG.whatsapp}?text=${encodeURIComponent(msg)}`;
const formatMoney = n => `$${n}`;

let toastTimer;
function toast(msg) {
  const el = document.getElementById('toast');
  if (!el) return;
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 3200);
}

/* ---------- Horario del negocio (Monterrey) ---------- */
function obtenerHorario() {
  const ahora = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Monterrey' }));
  const minutos = ahora.getHours() * 60 + ahora.getMinutes();
  const abierto = minutos >= 720 && minutos < 1080; // 12:00 – 18:00
  const faltan = minutos < 720 ? 720 - minutos : (1440 - minutos) + 720;
  return { abierto, faltan };
}

function mensajeCerrado() {
  const { faltan } = obtenerHorario();
  return `😴 Estamos cerrados. Abrimos a las 12:00 PM (en ${Math.floor(faltan / 60)}h ${faltan % 60}m). ¡Gracias!`;
}

/* Impide la acción si el negocio está cerrado */
function impedirSiCerrado(e) {
  if (negocioAbierto) return false;
  e.preventDefault();
  e.stopPropagation();
  toast(mensajeCerrado());
  return true;
}

/* Apaga visualmente los botones de pedido cuando está cerrado */
function aplicarBloqueoCerrado() {
  document.body.classList.toggle('negocio-cerrado', !negocioAbierto);
  document.querySelectorAll('a[data-wa], .wa-float').forEach(el => {
    const esPedido =
      el.classList.contains('wa-float') ||
      (el.dataset.wa || '').toLowerCase().includes('pedido');
    el.classList.toggle('bloqueado-cerrado', !negocioAbierto && esPedido);
  });
  document.querySelectorAll('a[data-abre-carrito], a[data-comp]').forEach(el => {
    el.classList.toggle('bloqueado-cerrado', !negocioAbierto);
  });
}

/* ---------- Carrito ---------- */
const calcularCarrito = () => {
  let total = 0, count = 0;
  carrito.forEach(i => { total += i.precio * i.cantidad; count += i.cantidad; });
  return { total, count };
};

function agregarAlCarrito(nombre, precio, cantidad = 1) {
  const item = carrito.get(nombre);
  if (item) item.cantidad = Math.min(20, item.cantidad + cantidad);
  else carrito.set(nombre, { nombre, precio, cantidad });
  renderizarCarrito();
  toast(`🛒 ${nombre} agregado al pedido`);
}

function cambiarCantidad(nombre, delta) {
  const item = carrito.get(nombre);
  if (!item) return;
  item.cantidad = Math.min(20, item.cantidad + delta);
  if (item.cantidad <= 0) carrito.delete(nombre);
  renderizarCarrito();
}

function construirMensaje(subtotal, envio, totalFinal) {
  const val = id => (document.getElementById(id) ? document.getElementById(id).value.trim() : '');
  const nombre = val('cliente-nombre');
  const direccion = val('cliente-direccion');
  const notas = val('cliente-notas');
  const monto = parseInt((document.getElementById('pago-monto') || {}).value, 10) || 0;

  let msg = `Hola Pollos Tavo's 👋\nQuiero realizar el siguiente pedido:\n\n`;
  carrito.forEach(i => {
    msg += `• ${i.cantidad} × ${i.nombre} — ${formatMoney(i.precio)} c/u (${formatMoney(i.precio * i.cantidad)})\n`;
  });
  msg += `\nSubtotal: ${formatMoney(subtotal)}`;
  if (envio > 0) msg += `\nCosto de envío: ${formatMoney(envio)}`;
  msg += `\n*TOTAL A PAGAR: ${formatMoney(totalFinal)}*`;
  msg += `\n\n${MODALIDADES[modalidad]}`;
  msg += `\n\n📋 DATOS DEL PEDIDO:`;
  msg += `\n👤 Recibe: ${nombre || '__________'}`;
  if (modalidad === 'domicilio') {
    msg += `\n📍 Dirección: ${direccion || '__________'}`;
    if (notas) msg += `\n💬 Notas: ${notas}`;
  }
  msg += `\n\n💳 PAGO: `;
  if (metodoPago === 'transferencia') {
    msg += `Transferencia bancaria\n🏦 ${DATOS_BANCO.banco} · Cta: ${DATOS_BANCO.cuenta} · ${DATOS_BANCO.titular}\n(Enviaré comprobante de pago)`;
  } else {
    msg += `Efectivo al recibir`;
    if (monto > 0) {
      msg += `\n💵 Pagará con: ${formatMoney(monto)}`;
      const cambio = monto - totalFinal;
      if (cambio >= 0) msg += ` (cambio: ${formatMoney(cambio)})`;
    }
  }
  msg += `\n\n¿Me pueden confirmar mi pedido?`;
  return msg;
}

function renderizarCarrito() {
  const lista      = document.getElementById('cart-list');
  const empty      = document.getElementById('cart-empty');
  const totalEl    = document.getElementById('cart-total');
  const countEl    = document.getElementById('cart-count');
  const totalFloat = document.getElementById('cart-total-float');
  const sendBtn    = document.getElementById('cart-send');
  const tabCount   = document.getElementById('tab-pedido-count');
  const campoDir   = document.getElementById('campo-direccion');
  const campoNotas = document.getElementById('campo-notas');
  const cambioEl   = document.getElementById('pago-cambio');

  if (!lista) return;

  const { total, count } = calcularCarrito();
  const envio = (modalidad === 'domicilio' && count > 0) ? COSTO_ENVIO : 0;
  const totalFinal = total + envio;

  if (campoDir)   campoDir.hidden   = modalidad !== 'domicilio';
  if (campoNotas) campoNotas.hidden = modalidad !== 'domicilio';

  if (countEl)    countEl.textContent = count;
  if (tabCount)   tabCount.textContent = count;
  if (totalFloat) totalFloat.textContent = formatMoney(totalFinal);

  if (totalEl) {
    totalEl.innerHTML = envio > 0
      ? `${formatMoney(total)} <span class="costo-envio">+ $30 envío</span> = ${formatMoney(totalFinal)}`
      : formatMoney(totalFinal);
  }

  if (empty) empty.style.display = count === 0 ? 'block' : 'none';

  lista.innerHTML = '';
  carrito.forEach(item => {
    const li = document.createElement('li');
    li.className = 'cart-item';
    li.innerHTML = `
      <div class="cart-item-info">
        <span class="cart-item-nombre">${item.nombre}</span>
        <span class="cart-item-precio">${formatMoney(item.precio)} c/u</span>
      </div>
      <div class="stepper">
        <button type="button" class="step-btn" data-cart-step="-1" data-cart-id="${item.nombre}" aria-label="Disminuir">−</button>
        <span class="step-qty">${item.cantidad}</span>
        <button type="button" class="step-btn" data-cart-step="1" data-cart-id="${item.nombre}" aria-label="Aumentar">+</button>
      </div>
      <span class="cart-item-subtotal">${formatMoney(item.precio * item.cantidad)}</span>
      <button type="button" class="cart-remove" data-cart-remove="${item.nombre}" aria-label="Eliminar">×</button>`;
    lista.appendChild(li);
  });

  if (cambioEl && metodoPago === 'efectivo') {
    const monto = parseInt((document.getElementById('pago-monto') || {}).value, 10) || 0;
    if (monto > 0) {
      const cambio = monto - totalFinal;
      cambioEl.innerHTML = cambio >= 0
        ? `Pagas con ${formatMoney(monto)} · Cambio: <strong>${formatMoney(cambio)}</strong>`
        : `⚠️ Faltan ${formatMoney(-cambio)} para cubrir el total`;
    } else {
      cambioEl.textContent = `Total a pagar al recibir: ${formatMoney(totalFinal)}`;
    }
  }

  /* Botón enviar: deshabilitado si está cerrado o vacío */
  if (sendBtn) {
    if (!sendBtn.dataset.htmlOriginal) sendBtn.dataset.htmlOriginal = sendBtn.innerHTML;

    if (!negocioAbierto) {
      sendBtn.href = '#';
      sendBtn.classList.add('disabled');
      sendBtn.setAttribute('aria-disabled', 'true');
      sendBtn.innerHTML = '😴 Estamos cerrados · abrimos 12:00 PM';
    } else {
      sendBtn.innerHTML = sendBtn.dataset.htmlOriginal;
      if (count > 0) {
        sendBtn.href = waLink(construirMensaje(total, envio, totalFinal));
        sendBtn.classList.remove('disabled');
        sendBtn.removeAttribute('aria-disabled');
      } else {
        sendBtn.href = '#';
        sendBtn.classList.add('disabled');
        sendBtn.setAttribute('aria-disabled', 'true');
      }
    }
  }
}

/* ---------- Pestañas y modal ---------- */
function mostrarPanel(idPanel) {
  document.querySelectorAll('.modal-tab').forEach(t => {
    const activo = t.dataset.panel === idPanel;
    t.classList.toggle('active', activo);
    t.setAttribute('aria-selected', String(activo));
  });
  document.querySelectorAll('.tab-panel').forEach(p => p.classList.toggle('active', p.id === idPanel));
}

function abrirModalPedido(panel) {
  const modal = document.getElementById('modal-pedido');
  if (!modal) return;
  mostrarPanel(panel || 'panel-pedido');
  modal.classList.add('open');
  modal.setAttribute('aria-hidden', 'false');
  document.body.classList.add('modal-open');
}

function cerrarModalPedido() {
  const modal = document.getElementById('modal-pedido');
  if (!modal) return;
  modal.classList.remove('open');
  modal.setAttribute('aria-hidden', 'true');
  document.body.classList.remove('modal-open');
}

/* ---------- Enlaces WhatsApp de respaldo ---------- */
function actualizarEnlacesWhatsApp() {
  document.querySelectorAll('a[data-wa]').forEach(el => {
    const base = el.dataset.wa;
    const pregunta = el.dataset.pregunta;
    el.href = pregunta ? waLink(`${base}\n${MODALIDADES[modalidad]}\n${pregunta}`) : waLink(base);
    if (!el.classList.contains('wa-float')) { el.target = '_blank'; el.rel = 'noopener'; }
  });
}

/* ================= INICIALIZACIÓN ================= */
document.addEventListener('DOMContentLoaded', () => {

  /* ----- Modal: abrir / cerrar ----- */
  document.getElementById('cart-float').addEventListener('click', () => abrirModalPedido('panel-pedido'));
  document.getElementById('modal-close').addEventListener('click', cerrarModalPedido);
  document.getElementById('modal-pedido').addEventListener('click', e => {
    if (e.target.id === 'modal-pedido') cerrarModalPedido();
  });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') cerrarModalPedido(); });

  /* ----- Pestañas ----- */
  document.querySelectorAll('.modal-tab').forEach(tab => {
    tab.addEventListener('click', () => mostrarPanel(tab.dataset.panel));
  });

  /* ----- Controles del carrito ----- */
  document.getElementById('cart-list').addEventListener('click', e => {
    const step = e.target.closest('[data-cart-step]');
    if (step) { cambiarCantidad(step.dataset.cartId, parseInt(step.dataset.cartStep, 10)); return; }
    const rm = e.target.closest('[data-cart-remove]');
    if (rm) { carrito.delete(rm.dataset.cartRemove); renderizarCarrito(); toast('🗑️ Producto eliminado'); }
  });

  document.getElementById('cart-vaciar').addEventListener('click', () => {
    carrito.clear(); renderizarCarrito(); toast('🗑️ Pedido vaciado');
  });

  /* ----- Botones que abren el carrito (bloqueados si está cerrado) ----- */
  document.querySelectorAll('a[data-abre-carrito]').forEach(a => {
    a.addEventListener('click', e => {
      if (impedirSiCerrado(e)) return;
      const menuItem = a.closest('.menu-item');
      if (menuItem) {
        const qty = parseInt(menuItem.querySelector('.step-qty').textContent, 10) || 1;
        agregarAlCarrito(menuItem.dataset.producto, parseInt(menuItem.dataset.precio, 10), qty);
      } else {
        agregarAlCarrito(a.dataset.producto, parseInt(a.dataset.precio, 10), 1);
      }
      abrirModalPedido('panel-pedido');
    });
  });

  /* ----- Complementos de la sección ----- */
  document.querySelectorAll('a[data-comp]').forEach(a => {
    a.addEventListener('click', e => {
      if (impedirSiCerrado(e)) return;
      agregarAlCarrito(a.dataset.comp, parseInt(a.dataset.precio, 10), 1);
    });
  });

  /* ----- Enlaces directos de WhatsApp: bloquear solo los de "pedido" ----- */
  document.querySelectorAll('a[data-wa]').forEach(el => {
    el.addEventListener('click', e => {
      if (el.hasAttribute('data-comp') || el.hasAttribute('data-abre-carrito')) return; // ya tienen su handler
      const esPedido = (el.dataset.wa || '').toLowerCase().includes('pedido');
      if (esPedido) impedirSiCerrado(e);
    });
  });

  /* ----- Rejilla de complementos del modal ----- */
  const compGrid = document.getElementById('cart-comp-grid');
  compGrid.innerHTML = COMPLEMENTOS.map(c => `
    <button type="button" class="comp-chip" data-comp-add="${c.nombre}" data-precio="${c.precio}">
      <span>${c.nombre}</span><span class="comp-chip-precio">${formatMoney(c.precio)} ＋</span>
    </button>`).join('');
  compGrid.addEventListener('click', e => {
    const chip = e.target.closest('[data-comp-add]');
    if (chip && negocioAbierto) agregarAlCarrito(chip.dataset.compAdd, parseInt(chip.dataset.precio, 10), 1);
    else if (chip) toast(mensajeCerrado());
  });

  /* ----- Modalidad de entrega ----- */
  document.querySelectorAll('.entrega-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      modalidad = btn.dataset.entrega;
      document.querySelectorAll('.entrega-btn').forEach(b => {
        const activo = b.dataset.entrega === modalidad;
        b.classList.toggle('active', activo);
        b.setAttribute('aria-pressed', String(activo));
      });
      actualizarEnlacesWhatsApp();
      renderizarCarrito();
      toast(modalidad === 'domicilio' ? '🛵 Entrega a domicilio (+$30 envío)' : '🏪 Pasas por tu pedido al local');
    });
  });

  /* ----- Método de pago ----- */
  document.querySelectorAll('.pago-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      metodoPago = btn.dataset.pago;
      document.querySelectorAll('.pago-btn').forEach(b => {
        const activo = b.dataset.pago === metodoPago;
        b.classList.toggle('active', activo);
        b.setAttribute('aria-pressed', String(activo));
      });
      document.getElementById('campo-efectivo').hidden = metodoPago !== 'efectivo';
      document.getElementById('campo-transferencia').hidden = metodoPago !== 'transferencia';
      renderizarCarrito();
    });
  });

  /* ----- Copiar cuenta ----- */
  document.getElementById('btn-copiar-cuenta').addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(DATOS_BANCO.cuenta);
      toast('📋 Número de cuenta copiado');
    } catch {
      toast(`Cuenta: ${DATOS_BANCO.cuenta}`);
    }
  });

  /* ----- Recalcular al escribir ----- */
  ['cliente-nombre', 'cliente-direccion', 'cliente-notas', 'pago-monto'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('input', () => { el.classList.remove('invalid'); renderizarCarrito(); });
  });

  /* ----- Validación al enviar ----- */
  document.getElementById('cart-send').addEventListener('click', e => {
    if (impedirSiCerrado(e)) return;

    const { total, count } = calcularCarrito();
    const envio = (modalidad === 'domicilio' && count > 0) ? COSTO_ENVIO : 0;
    const totalFinal = total + envio;
    const nombre = document.getElementById('cliente-nombre');
    const direccion = document.getElementById('cliente-direccion');
    const montoInput = document.getElementById('pago-monto');

    if (count === 0) { e.preventDefault(); mostrarPanel('panel-pedido'); toast('🛒 Agrega productos a tu pedido'); return; }

    nombre.classList.remove('invalid');
    direccion.classList.remove('invalid');
    montoInput.classList.remove('invalid');

    if (!nombre.value.trim()) {
      e.preventDefault(); mostrarPanel('panel-datos'); nombre.classList.add('invalid'); nombre.focus();
      toast('⚠️ Escribe el nombre de quien recibe'); return;
    }
    if (modalidad === 'domicilio' && !direccion.value.trim()) {
      e.preventDefault(); mostrarPanel('panel-datos'); direccion.classList.add('invalid'); direccion.focus();
      toast('📍 Escribe la dirección de envío'); return;
    }
    if (metodoPago === 'efectivo') {
      const monto = parseInt(montoInput.value, 10) || 0;
      if (!monto) {
        e.preventDefault(); mostrarPanel('panel-datos'); montoInput.classList.add('invalid'); montoInput.focus();
        toast('💵 Indica con cuánto pagarás al recibir'); return;
      }
      if (monto < totalFinal) {
        e.preventDefault(); montoInput.classList.add('invalid'); montoInput.focus();
        toast(`⚠️ El monto es menor al total (${formatMoney(totalFinal)})`); return;
      }
    }
    renderizarCarrito();
  });

  /* ----- Steppers del menú ----- */
  document.querySelectorAll('.step-btn:not([data-cart-step])').forEach(btn => {
    btn.addEventListener('click', () => {
      const item = btn.closest('.menu-item');
      if (!item) return;
      const qtyEl = item.querySelector('.step-qty');
      const totalEl = item.querySelector('.menu-total');
      let qty = (parseInt(qtyEl.textContent, 10) || 1) + parseInt(btn.dataset.step, 10);
      qty = Math.min(20, Math.max(1, qty));
      qtyEl.textContent = qty;
      const precio = parseInt(item.dataset.precio, 10);
      totalEl.textContent = qty > 1 ? `×${qty} = ${formatMoney(precio * qty)}` : '';
    });
  });

  /* ----- Estado del negocio + bloqueo de pedidos ----- */
  const actualizarEstadoNegocio = () => {
    const { abierto, faltan } = obtenerHorario();
    negocioAbierto = abierto;

    const badge = document.getElementById('estado-negocio');
    const texto = document.getElementById('estado-texto');
    const hBadge = document.getElementById('estado-header');
    const hMain = document.getElementById('estado-header-main');
    const hSub = document.getElementById('estado-header-sub');
    const aviso = document.getElementById('cart-aviso');

    if (badge && texto) {
      badge.classList.toggle('abierto', abierto);
      badge.classList.toggle('cerrado', !abierto);
      texto.textContent = abierto
        ? `¡Estamos ABIERTOS! 🎉 (cerramos en ${Math.floor(faltan / 60)}h ${faltan % 60}m)`
        : `Estamos CERRADOS 😴 (abrimos en ${Math.floor(faltan / 60)}h ${faltan % 60}m)`;
    }
    if (hBadge && hMain && hSub) {
      hBadge.classList.toggle('abierto', abierto);
      hBadge.classList.toggle('cerrado', !abierto);
      hMain.textContent = abierto ? 'Abierto' : 'Cerrado';
      hSub.textContent = abierto ? '· cierra 6:00 PM' : '· abre 12:00 PM';
    }
    if (aviso) aviso.hidden = abierto;

    aplicarBloqueoCerrado();
    renderizarCarrito();
  };
  actualizarEstadoNegocio();
  setInterval(actualizarEstadoNegocio, 60 * 1000);

  /* ----- Redes sociales ----- */
  [['ig-link', CONFIG.instagram, 'Instagram'], ['fb-link', CONFIG.facebook, 'Facebook']].forEach(([id, url, nombre]) => {
    const el = document.getElementById(id);
    if (!el) return;
    if (url) { el.href = url; el.target = '_blank'; el.rel = 'noopener'; }
    else el.addEventListener('click', e => { e.preventDefault(); toast(`Muy pronto nuestra página de ${nombre} 📲`); });
  });

  /* ----- Dirección ----- */
  const dirEl = document.getElementById('direccion-text');
  if (CONFIG.direccion && dirEl) dirEl.textContent = CONFIG.direccion;
  const btnLlegar = document.getElementById('btn-llegar');
  if (btnLlegar) btnLlegar.addEventListener('click', e => {
    if (CONFIG.direccion) {
      window.open('https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent("Pollos Tavo's " + CONFIG.direccion), '_blank', 'noopener');
    } else {
      e.preventDefault();
      toast('📍 Muy pronto publicaremos nuestra dirección');
    }
  });

  /* ----- Header / volver arriba / menú móvil ----- */
  const header = document.getElementById('header');
  const volver = document.getElementById('volver-arriba');
  window.addEventListener('scroll', () => {
    header.classList.toggle('scrolled', window.scrollY > 10);
    volver.classList.toggle('show', window.scrollY > 600);
  }, { passive: true });
  volver.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));

  const toggle = document.getElementById('menu-toggle');
  const nav = document.getElementById('nav-principal');
  toggle.addEventListener('click', () => {
    const abierto = nav.classList.toggle('open');
    toggle.classList.toggle('open', abierto);
    toggle.setAttribute('aria-expanded', String(abierto));
    document.body.classList.toggle('nav-open', abierto);
  });
  nav.querySelectorAll('a').forEach(a => a.addEventListener('click', () => {
    nav.classList.remove('open'); toggle.classList.remove('open');
    toggle.setAttribute('aria-expanded', 'false'); document.body.classList.remove('nav-open');
  }));

  /* ----- Animaciones de entrada ----- */
  const observer = new IntersectionObserver(entradas => {
    entradas.forEach(e => {
      if (e.isIntersecting) { e.target.classList.add('visible'); observer.unobserve(e.target); }
    });
  }, { threshold: 0.12 });
  document.querySelectorAll('.reveal').forEach(el => observer.observe(el));

  /* ----- Brasas del Hero ----- */
  const canvas = document.getElementById('canvas-brasas');
  if (canvas && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    const ctx = canvas.getContext('2d');
    let W, H;
    const partes = [];
    const medir = () => { W = canvas.width = canvas.offsetWidth; H = canvas.height = canvas.offsetHeight; };
    medir();
    window.addEventListener('resize', medir);
    const nueva = p => {
      p.x = Math.random() * W; p.y = H + 20;
      p.r = 0.8 + Math.random() * 2.2; p.v = 0.35 + Math.random() * 1;
      p.a = 0.10 + Math.random() * 0.40; p.t = Math.random() * Math.PI * 2;
      return p;
    };
    for (let i = 0; i < 40; i++) { const p = nueva({}); p.y = Math.random() * H; partes.push(p); }
    (function frame() {
      ctx.clearRect(0, 0, W, H);
      ctx.shadowColor = 'rgba(255, 120, 30, .8)'; ctx.shadowBlur = 8;
      for (const p of partes) {
        p.y -= p.v; p.t += 0.02; p.x += Math.sin(p.t) * 0.4;
        if (p.y < -10) nueva(p);
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, ${140 + Math.floor(60 * Math.sin(p.t))}, 40, ${p.a})`;
        ctx.fill();
      }
      requestAnimationFrame(frame);
    })();
  }

  /* ----- Inicio ----- */
  actualizarEnlacesWhatsApp();
  renderizarCarrito();
});
