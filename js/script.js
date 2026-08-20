/* ==========================================================
   POLLOS TAVO'S — script.js (versión blindada)
   Delegación de eventos: los pedidos SIEMPRE abren el modal,
   aunque falten elementos en el HTML.
   ========================================================== */

const CONFIG = {
  whatsapp: '528112735442',
  direccion: 'Hacienda la Palma #101 Col. Rincon de la Hacienda',
  instagram: 'https://www.instagram.com/pollostavosoficial?utm_source=qr',
  facebook: 'https://www.facebook.com/share/1BkhZoGNY6/?mibextid=wwXIfr',
  didiFood: '',   // DIDI_FOOD_URL — Ej. 'https://www.didi-food.com/es-MX/store/...'
  rappi: '',       // RAPPI_URL — Ej. 'https://www.rappi.com.mx/restaurantes/...'
  horaApertura: 11,  // 11:00 AM
  horaCierre: 19     // 19:00 
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
  { nombre: '1 Cebolla', precio: 10 },
  { nombre: '1 Chile toreado', precio: 5 },
  { nombre: '1 Coca-Cola 1.75 L', precio: 35 }
];

let modalidad = 'domicilio';
let metodoPago = 'efectivo';
let negocioAbierto = false;
const carrito = new Map();

/* ---------- Utilidades ---------- */
const waLink = msg => `https://wa.me/${CONFIG.whatsapp}?text=${encodeURIComponent(msg)}`;
const formatMoney = n => `$${n}`;

const formatoHora = h => {
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:00 ${ampm}`;
};

const val = id => (document.getElementById(id) ? document.getElementById(id).value.trim() : '');

/* Conector seguro: nunca rompe si el elemento no existe */
function on(sel, evt, fn) {
  const el = document.getElementById(sel) || document.querySelector(sel);
  if (el) el.addEventListener(evt, fn);
  return el;
}

let toastTimer;
function toast(msg) {
  const el = document.getElementById('toast');
  if (!el) return;
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 3200);
}

/* ---------- Horario ---------- */

function obtenerHorario() {
  const ahora = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Monterrey' }));
  const minutos = ahora.getHours() * 60 + ahora.getMinutes();
  const apertura = CONFIG.horaApertura * 60;
  const cierre = CONFIG.horaCierre * 60;
  const abierto = minutos >= apertura && minutos < cierre;
  const faltan = minutos < apertura ? apertura - minutos : (1440 - minutos) + apertura;
  return { abierto, faltan };
}

function mensajeCerrado() {
  const { faltan } = obtenerHorario();
    return `😴 Estamos cerrados. Abrimos a las ${formatoHora(CONFIG.horaApertura)} (en ${Math.floor(faltan / 60)}h ${faltan % 60}m). ¡Gracias!`;
}

function aplicarBloqueoCerrado() {
  document.body.classList.toggle('negocio-cerrado', !negocioAbierto);
  document.querySelectorAll('a[data-wa], .wa-float').forEach(el => {
    const esPedido = el.classList.contains('wa-float') || (el.dataset.wa || '').toLowerCase().includes('pedido');
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
  const nombre   = val('cliente-nombre');
  const telefono = val('cliente-telefono');
  const monto    = parseInt((document.getElementById('pago-monto') || {}).value, 10) || 0;

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
  msg += `\n📞 Teléfono: ${telefono || '__________'}`;

  if (modalidad === 'domicilio') {
    const colonia    = val('cliente-colonia');
    const calle      = val('cliente-calle');
    const numero     = val('cliente-numero');
    const entre      = val('cliente-entrecalles');
    const referencia = val('cliente-referencia');
    msg += `\n\n📍 DIRECCIÓN DE ENVÍO:`;
    msg += `\n🏘️ Colonia: ${colonia || '__________'}`;
    msg += `\n🛣️ Calle: ${calle || '__________'}`;
    msg += `\n🔢 Número: ${numero || '__________'}`;
    if (entre)      msg += `\n↔️ Entre calles: ${entre}`;
    if (referencia) msg += `\n📝 Referencia: ${referencia}`;
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
  const grupoDom   = document.getElementById('grupo-domicilio');
  const cambioEl   = document.getElementById('pago-cambio');

  if (!lista) return;

  const { total, count } = calcularCarrito();
  const envio = (modalidad === 'domicilio' && count > 0) ? COSTO_ENVIO : 0;
  const totalFinal = total + envio;

  if (grupoDom) grupoDom.hidden = modalidad !== 'domicilio';
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

  if (sendBtn) {
    if (!sendBtn.dataset.htmlOriginal) sendBtn.dataset.htmlOriginal = sendBtn.innerHTML;
    if (!negocioAbierto) {
      sendBtn.href = '#';
      sendBtn.classList.add('disabled');
      sendBtn.setAttribute('aria-disabled', 'true');
      sendBtn.innerHTML = `😴 Estamos cerrados · abrimos ${formatoHora(CONFIG.horaApertura)}`;
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

/* ---------- Modal ---------- */
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

  /* ============================================================
     DELEGACIÓN GLOBAL DE CLICS — el corazón del pedido.
     Un solo listener que intercepta SIEMPRE (nunca falla):
     ============================================================ */
  document.addEventListener('click', e => {

    /* 1) Botones "Pedir" de promos / paquetes / menú → abren el modal */
    const abre = e.target.closest('a[data-abre-carrito]');
    if (abre) {
      e.preventDefault();
      if (!negocioAbierto) { toast(mensajeCerrado()); return; }
      const menuItem = abre.closest('.menu-item');
      if (menuItem) {
        const qty = parseInt(menuItem.querySelector('.step-qty').textContent, 10) || 1;
        agregarAlCarrito(menuItem.dataset.producto, parseInt(menuItem.dataset.precio, 10), qty);
      } else {
        agregarAlCarrito(abre.dataset.producto, parseInt(abre.dataset.precio, 10), 1);
      }
      abrirModalPedido('panel-pedido');
      return;
    }

    /* 2) Botones "Agregar" de complementos de la sección */
    const comp = e.target.closest('a[data-comp]');
    if (comp) {
      e.preventDefault();
      if (!negocioAbierto) { toast(mensajeCerrado()); return; }
      agregarAlCarrito(comp.dataset.comp, parseInt(comp.dataset.precio, 10), 1);
      return;
    }

    /* 3) Chips de complementos dentro del modal */
    const chip = e.target.closest('[data-comp-add]');
    if (chip) {
      if (!negocioAbierto) { toast(mensajeCerrado()); return; }
      agregarAlCarrito(chip.dataset.compAdd, parseInt(chip.dataset.precio, 10), 1);
      return;
    }

    /* 4) Steppers dentro del carrito */
    const step = e.target.closest('[data-cart-step]');
    if (step) { cambiarCantidad(step.dataset.cartId, parseInt(step.dataset.cartStep, 10)); return; }

    /* 5) Eliminar del carrito */
    const rm = e.target.closest('[data-cart-remove]');
    if (rm) { carrito.delete(rm.dataset.cartRemove); renderizarCarrito(); toast('🗑️ Producto eliminado'); return; }

    /* 6) Links directos de WhatsApp: bloquear solo pedidos si está cerrado */
    const wa = e.target.closest('a[data-wa]');
    if (wa && !wa.hasAttribute('data-comp') && !wa.hasAttribute('data-abre-carrito')) {
      const esPedido = (wa.dataset.wa || '').toLowerCase().includes('pedido');
      if (esPedido && !negocioAbierto) { e.preventDefault(); toast(mensajeCerrado()); }
    }
  });

  /* ----- Modal: abrir / cerrar ----- */
  on('cart-float', 'click', () => abrirModalPedido('panel-pedido'));
  on('modal-close', 'click', cerrarModalPedido);
  on('modal-pedido', 'click', e => { if (e.target.id === 'modal-pedido') cerrarModalPedido(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') cerrarModalPedido(); });

  /* ----- Pestañas ----- */
  document.querySelectorAll('.modal-tab').forEach(tab => {
    tab.addEventListener('click', () => mostrarPanel(tab.dataset.panel));
  });

  /* ----- Vaciar ----- */
  on('cart-vaciar', 'click', () => { carrito.clear(); renderizarCarrito(); toast('🗑️ Pedido vaciado'); });

  /* ----- Generar rejilla de complementos del modal ----- */
  const compGrid = document.getElementById('cart-comp-grid');
  if (compGrid) {
    compGrid.innerHTML = COMPLEMENTOS.map(c => `
      <button type="button" class="comp-chip" data-comp-add="${c.nombre}" data-precio="${c.precio}">
        <span>${c.nombre}</span><span class="comp-chip-precio">${formatMoney(c.precio)} ＋</span>
      </button>`).join('');
  }

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
      const ef = document.getElementById('campo-efectivo');
      const tr = document.getElementById('campo-transferencia');
      if (ef) ef.hidden = metodoPago !== 'efectivo';
      if (tr) tr.hidden = metodoPago !== 'transferencia';
      renderizarCarrito();
    });
  });

  /* ----- Copiar cuenta ----- */
  on('btn-copiar-cuenta', 'click', async () => {
    try {
      await navigator.clipboard.writeText(DATOS_BANCO.cuenta);
      toast('📋 Número de cuenta copiado');
    } catch {
      toast(`Cuenta: ${DATOS_BANCO.cuenta}`);
    }
  });

  /* ----- Recalcular al escribir ----- */
  ['cliente-nombre', 'cliente-telefono', 'cliente-colonia', 'cliente-calle',
   'cliente-numero', 'cliente-entrecalles', 'cliente-referencia', 'pago-monto'].forEach(id => {
    on(id, 'input', () => {
      const el = document.getElementById(id);
      if (el) el.classList.remove('invalid');
      renderizarCarrito();
    });
  });

  /* ----- Validación al enviar ----- */
  on('cart-send', 'click', e => {
    if (!negocioAbierto) { e.preventDefault(); toast(mensajeCerrado()); return; }

    const { total, count } = calcularCarrito();
    const envio = (modalidad === 'domicilio' && count > 0) ? COSTO_ENVIO : 0;
    const totalFinal = total + envio;

    const marcar = el => { el.classList.add('invalid'); el.focus(); };
    const nombre   = document.getElementById('cliente-nombre');
    const telefono = document.getElementById('cliente-telefono');

    if (count === 0) { e.preventDefault(); mostrarPanel('panel-pedido'); toast('🛒 Agrega productos a tu pedido'); return; }

    if (nombre) nombre.classList.remove('invalid');
    if (telefono) telefono.classList.remove('invalid');

    if (nombre && !nombre.value.trim()) {
      e.preventDefault(); mostrarPanel('panel-datos'); marcar(nombre);
      toast('⚠️ Escribe el nombre de quien recibe'); return;
    }

    const digitos = telefono ? telefono.value.replace(/\D/g, '') : '';
    if (digitos.length !== 10) {
      e.preventDefault(); mostrarPanel('panel-datos'); if (telefono) marcar(telefono);
      toast('📞 Escribe un teléfono válido de 10 dígitos'); return;
    }

    if (modalidad === 'domicilio') {
      const obligatorios = [
        ['cliente-colonia', '🏘️ Escribe la colonia'],
        ['cliente-calle',   '🛣️ Escribe la calle'],
        ['cliente-numero',  '🔢 Escribe el número']
      ];
      for (const [id, aviso] of obligatorios) {
        const el = document.getElementById(id);
        if (!el) continue;
        el.classList.remove('invalid');
        if (!el.value.trim()) {
          e.preventDefault(); mostrarPanel('panel-datos'); marcar(el);
          toast(aviso); return;
        }
      }
    }

    if (metodoPago === 'efectivo') {
      const montoInput = document.getElementById('pago-monto');
      const monto = montoInput ? parseInt(montoInput.value, 10) || 0 : 0;
      if (montoInput) montoInput.classList.remove('invalid');
      if (!monto) {
        e.preventDefault(); mostrarPanel('panel-datos'); if (montoInput) marcar(montoInput);
        toast('💵 Indica con cuánto pagarás al recibir'); return;
      }
      if (monto < totalFinal) {
        e.preventDefault(); if (montoInput) marcar(montoInput);
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

  /* ----- Estado del negocio ----- */
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
    
          hSub.textContent = abierto ? `· cierra ${formatoHora(CONFIG.horaCierre)}` : `· abre ${formatoHora(CONFIG.horaApertura)}`;
    
    if (hBadge && hMain && hSub) {
      hBadge.classList.toggle('abierto', abierto);
      hBadge.classList.toggle('cerrado', !abierto);
      hMain.textContent = abierto ? 'Abierto' : 'Cerrado';
      hSub.textContent = abierto ? `· cierra ${formatoHora(CONFIG.horaCierre)}` : `· abre ${formatoHora(CONFIG.horaApertura)}`;
    }
    if (aviso) aviso.hidden = abierto;

    aplicarBloqueoCerrado();
    renderizarCarrito();
    
    document.querySelectorAll('.btn-delivery, .btn-delivery-sm').forEach(el => {
    el.classList.toggle('bloqueado-cerrado', !negocioAbierto);
  });
    
  };
  actualizarEstadoNegocio();
  setInterval(actualizarEstadoNegocio, 60 * 1000);

  /* Se reemplazo esta seccion----- Redes sociales ----- 
  [['ig-link', CONFIG.instagram, 'Instagram'], ['fb-link', CONFIG.facebook, 'Facebook']].forEach(([id, url, nombre]) => {
    const el = document.getElementById(id);
    if (!el) return;
    if (url) { el.href = url; el.target = '_blank'; el.rel = 'noopener'; }
    else el.addEventListener('click', e => { e.preventDefault(); toast(`Muy pronto nuestra página de ${nombre} 📲`); });
  });*/
  
    /* ----- Redes sociales y plataformas de entrega ----- */
  const enlaces = [
    ['ig-link', CONFIG.instagram, 'Instagram'],
    ['fb-link', CONFIG.facebook, 'Facebook']
  ];
  enlaces.forEach(([id, url, nombre]) => {
    const el = document.getElementById(id);
    if (!el) return;
    if (url) { el.href = url; el.target = '_blank'; el.rel = 'noopener'; }
    else el.addEventListener('click', e => { e.preventDefault(); toast(`Muy pronto nuestra página de ${nombre} 📲`); });
  });

  /* Didi Food y Rappi — todos los botones con su ID */
  const didiBtns = ['link-didi', 'hero-didi', 'footer-didi'];
  const rappiBtns = ['link-rappi', 'hero-rappi', 'footer-rappi'];

  didiBtns.forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    if (CONFIG.didiFood) {
      el.href = CONFIG.didiFood;
    } else {
      el.addEventListener('click', e => {
        e.preventDefault();
        toast('🛵 Muy pronto estaremos en Didi Food. ¡Pide por WhatsApp!');
      });
    }
  });

  rappiBtns.forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    if (CONFIG.rappi) {
      el.href = CONFIG.rappi;
    } else {
      el.addEventListener('click', e => {
        e.preventDefault();
        toast('🛵 Muy pronto estaremos en Rappi. ¡Pide por WhatsApp!');
      });
    }
  });
  
    /* ---------- Plataformas de entrega (Didi Food / Rappi) ---------- */
  [['didi-link', CONFIG.didiFood, 'Didi Food'], ['rappi-link', CONFIG.rappi, 'Rappi']].forEach(([id, url, nombre]) => {
    const el = document.getElementById(id);
    if (!el) return;
    if (url) { el.href = url; el.target = '_blank'; el.rel = 'noopener'; }
    else el.addEventListener('click', e => {
      e.preventDefault();
      toast(`Muy pronto podrás pedir por ${nombre} 🛵`);
    });
  });
  
  /* ----- Dirección ----- */
  const dirEl = document.getElementById('direccion-text');
  if (CONFIG.direccion && dirEl) dirEl.textContent = CONFIG.direccion;
  on('btn-llegar', 'click', e => {
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
    if (header) header.classList.toggle('scrolled', window.scrollY > 10);
    if (volver) volver.classList.toggle('show', window.scrollY > 600);
  }, { passive: true });
  if (volver) volver.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));

  const toggle = document.getElementById('menu-toggle');
  const nav = document.getElementById('nav-principal');
  if (toggle && nav) {
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
  }

  /* ----- Animaciones de entrada ----- */
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entradas => {
      entradas.forEach(e => {
        if (e.isIntersecting) { e.target.classList.add('visible'); observer.unobserve(e.target); }
      });
    }, { threshold: 0.12 });
    document.querySelectorAll('.reveal').forEach(el => observer.observe(el));
  } else {
    document.querySelectorAll('.reveal').forEach(el => el.classList.add('visible'));
  }

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
