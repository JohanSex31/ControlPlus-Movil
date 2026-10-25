// =============================================
// VENTAS Y ALERTAS — Mi Tiendita
// =============================================

let carritoVenta = [];
let productoSeleccionado = null;

// ========== INICIALIZAR NUEVA VENTA ==========
async function loadNuevaVenta() {
  document.getElementById('topbar-title').textContent = '🛒 Nueva Venta';
  carritoVenta = [];
  productoSeleccionado = null;
  renderCarrito();
  calcularCambio();

  document.getElementById('nv-buscar').value = '';
  document.getElementById('nv-cantidad').value = 1;
  document.getElementById('nv-precio').value = '';
  document.getElementById('nv-producto-info').style.display = 'none';
  document.getElementById('nv-sugerencias').style.display = 'none';
  document.getElementById('nv-recibido').value = '';

  const vendedorEl = document.getElementById('nv-vendedor-nombre');
  if (vendedorEl && App.currentUser) vendedorEl.textContent = App.currentUser.nombre;

  await recargarClientesNV();
}

async function recargarClientesNV() {
  const { data: clientes } = await db.from('Cliente').select('id_cliente, nombre, apellido').order('nombre');
  document.getElementById('nv-cliente').innerHTML =
    '<option value="">Consumidor final</option>' +
    (clientes || []).map(c => `<option value="${c.id_cliente}">${c.nombre} ${c.apellido}</option>`).join('');
}

function abrirNuevoClienteDesdeVenta() {
  editingClienteId = null;
  document.getElementById('cli-form').reset();
  document.getElementById('cli-fecha').value = fechaLocal();
  document.getElementById('modal-cli-title').textContent = '➕ Nuevo Cliente';
  window._clienteDesdeVenta = true;
  openModal('modal-cliente');
}

// ========== AUTOCOMPLETE ==========
async function buscarProductoVenta(query) {
  const sugBox = document.getElementById('nv-sugerencias');
  if (!query || query.length < 1) {
    sugBox.style.display = 'none';
    document.getElementById('nv-producto-info').style.display = 'none';
    productoSeleccionado = null;
    document.getElementById('nv-precio').value = '';
    return;
  }

  const { data } = await db.from('Producto')
    .select('id_producto, nombre, precio_venta, stock')
    .or(`nombre.ilike.%${query}%,id_producto.eq.${isNaN(query) ? 0 : query}`)
    .order('nombre')
    .limit(8);

  if (!data || !data.length) {
    sugBox.innerHTML = `<div style="padding:12px 16px;color:#888;font-size:0.85rem">Sin resultados para "${query}"</div>`;
    sugBox.style.display = 'block';
    return;
  }

  sugBox.innerHTML = data.map(p => `
    <div onclick="seleccionarProducto(${p.id_producto},'${p.nombre.replace(/'/g, "\\'")}',${p.precio_venta},${p.stock})"
      style="padding:10px 16px;cursor:pointer;display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid #2A2A2A;transition:background 0.15s"
      onmouseover="this.style.background='#2A2A2A'" onmouseout="this.style.background='transparent'">
      <div>
        <div style="font-weight:700;font-size:0.9rem;color:#F5F5F5">${p.nombre}</div>
        <div style="font-size:0.75rem;color:#888">Cód: ${p.id_producto}</div>
      </div>
      <div style="text-align:right">
        <div style="font-weight:800;color:#FF6B00">${formatCurrency(p.precio_venta)}</div>
        <div style="font-size:0.72rem;color:${p.stock <= 5 ? '#FF4757' : '#2ED573'}">Stock: ${p.stock}</div>
      </div>
    </div>
  `).join('');
  sugBox.style.display = 'block';
}

function seleccionarProducto(id, nombre, precio, stock) {
  productoSeleccionado = { id_producto: id, nombre, precio_venta: precio, stock };
  document.getElementById('nv-buscar').value = nombre;
  document.getElementById('nv-precio').value = precio;
  document.getElementById('nv-sugerencias').style.display = 'none';

  document.getElementById('nv-prod-nombre-sel').textContent = nombre;
  document.getElementById('nv-prod-stock-sel').textContent = stock + ' uds';
  document.getElementById('nv-producto-info').style.display = 'flex';

  if (stock === 0) toast(`⚠️ "${nombre}" no tiene stock disponible`, 'warning');
  document.getElementById('nv-cantidad').focus();
}

document.addEventListener('click', (e) => {
  if (!e.target.closest('#nv-buscar') && !e.target.closest('#nv-sugerencias')) {
    const s = document.getElementById('nv-sugerencias');
    if (s) s.style.display = 'none';
  }
});

// ========== CARRITO ==========
function agregarProductoVenta() {
  if (!productoSeleccionado) { toast('Selecciona un producto primero', 'warning'); return; }
  const cantidad = parseInt(document.getElementById('nv-cantidad').value) || 1;
  if (cantidad <= 0) { toast('La cantidad debe ser mayor a 0', 'warning'); return; }

  const enCarrito = carritoVenta.find(i => i.id_producto === productoSeleccionado.id_producto);
  const yaEnCarrito = enCarrito ? enCarrito.cantidad : 0;

  if (cantidad + yaEnCarrito > productoSeleccionado.stock) {
    toast(`Stock insuficiente. Disponible: ${productoSeleccionado.stock} uds`, 'error');
    return;
  }

  if (enCarrito) {
    enCarrito.cantidad += cantidad;
  } else {
    carritoVenta.push({
      id_producto: productoSeleccionado.id_producto,
      nombre: productoSeleccionado.nombre,
      precio: productoSeleccionado.precio_venta,
      cantidad,
      stock: productoSeleccionado.stock,
    });
  }

  renderCarrito();
  document.getElementById('nv-buscar').value = '';
  document.getElementById('nv-precio').value = '';
  document.getElementById('nv-cantidad').value = 1;
  document.getElementById('nv-producto-info').style.display = 'none';
  productoSeleccionado = null;
  document.getElementById('nv-buscar').focus();
  toast(`✅ "${carritoVenta.at(-1)?.nombre}" agregado`, 'success');
}

function renderCarrito() {
  const tbody = document.getElementById('nv-items-tbody');
  if (!carritoVenta.length) {
    tbody.innerHTML = `<tr><td colspan="5"><div class="carrito-empty"><span style="font-size:2rem">🛍️</span><p style="margin-top:8px">Agrega productos para comenzar</p></div></td></tr>`;
    actualizarTotalVenta();
    return;
  }
  tbody.innerHTML = carritoVenta.map((item, i) => `
    <tr>
      <td><strong>${item.nombre}</strong></td>
      <td style="color:#888">${formatCurrency(item.precio)}</td>
      <td>
        <div style="display:flex;align-items:center;gap:6px">
          <button class="btn btn-ghost btn-sm" style="padding:3px 9px;font-size:1rem" onclick="cambiarCantidad(${i}, -1)">−</button>
          <span style="font-weight:800;min-width:24px;text-align:center;color:#F5F5F5">${item.cantidad}</span>
          <button class="btn btn-ghost btn-sm" style="padding:3px 9px;font-size:1rem" onclick="cambiarCantidad(${i}, 1)">+</button>
        </div>
      </td>
      <td><strong style="color:#FF6B00">${formatCurrency(item.precio * item.cantidad)}</strong></td>
      <td><button class="btn btn-danger btn-sm btn-icon" onclick="quitarProducto(${i})">✕</button></td>
    </tr>
  `).join('');
  actualizarTotalVenta();
}

function cambiarCantidad(idx, delta) {
  const item = carritoVenta[idx];
  const nueva = item.cantidad + delta;
  if (nueva <= 0) { quitarProducto(idx); return; }
  if (nueva > item.stock) { toast('No hay suficiente stock', 'warning'); return; }
  item.cantidad = nueva;
  renderCarrito();
}

function quitarProducto(idx) {
  carritoVenta.splice(idx, 1);
  renderCarrito();
}

function limpiarVenta() {
  if (carritoVenta.length && !confirm('¿Limpiar todos los productos?')) return;
  carritoVenta = [];
  renderCarrito();
}

function actualizarTotalVenta() {
  const total = carritoVenta.reduce((s, i) => s + i.precio * i.cantidad, 0);
  const st = document.getElementById('nv-subtotal-display');
  const tt = document.getElementById('nv-total-display');
  if (st) st.textContent = formatCurrency(total);
  if (tt) tt.textContent = formatCurrency(total);
  calcularCambio();
}

function calcularCambio() {
  const total = carritoVenta.reduce((s, i) => s + i.precio * i.cantidad, 0);
  const recibido = parseFloat(document.getElementById('nv-recibido')?.value) || 0;
  const cambio = recibido - total;
  const el = document.getElementById('nv-cambio-display');
  if (el) {
    el.textContent = formatCurrency(Math.max(cambio, 0));
    el.style.color = cambio < 0 ? '#FF4757' : '#2ED573';
  }
}

// ========== CONFIRMAR VENTA ==========
let confirmandoVenta = false;

async function confirmarVenta() {
  if (confirmandoVenta) return;
  if (!carritoVenta.length) { toast('Agrega al menos un producto', 'warning'); return; }
  const idCliente = parseInt(document.getElementById('nv-cliente').value) || null; // null = Consumidor final
  const idUsuario = App.currentUser?.id_usuario;
  const recibido = parseFloat(document.getElementById('nv-recibido').value) || 0;
  const totalCarrito = carritoVenta.reduce((s, i) => s + i.precio * i.cantidad, 0);

  if (!idUsuario) { toast('Error: no hay sesión activa', 'error'); return; }
  if (recibido < totalCarrito) {
    toast(`Dinero insuficiente. Falta: ${formatCurrency(totalCarrito - recibido)}`, 'error');
    return;
  }

  confirmandoVenta = true;
  try {
    // Una sola transacción en la BD: valida stock, descuenta stock y guarda venta + detalle
    const items = carritoVenta.map(i => ({ id_producto: i.id_producto, cantidad: i.cantidad }));
    const { data: venta, error } = await db.rpc('registrar_venta', {
      p_id_cliente: idCliente,
      p_id_usuario: idUsuario,
      p_items: items,
    });
    if (error) throw error;

    const cambio = recibido - venta.total;
    if (cambio < 0) toast(`El precio cambió. Total real: ${formatCurrency(venta.total)}`, 'warning');

    mostrarFacturaNuevaVenta(venta, idCliente, idUsuario, recibido, Math.max(cambio, 0), [...carritoVenta]);

    carritoVenta = [];
    renderCarrito();
    document.getElementById('nv-recibido').value = '';
    checkAlertasBadge();
    toast('¡Venta registrada exitosamente! 🎉', 'success');
  } catch (err) {
    toast('Error al registrar la venta: ' + err.message, 'error');
  } finally {
    confirmandoVenta = false;
  }
}

async function mostrarFacturaNuevaVenta(venta, idCliente, idUsuario, recibido, cambio, items) {
  const [{ data: cliente }, { data: usuario }] = await Promise.all([
    idCliente ? db.from('Cliente').select('*').eq('id_cliente', idCliente).single() : Promise.resolve({ data: null }),
    db.from('Usuario').select('nombre').eq('id_usuario', idUsuario).single(),
  ]);

  document.getElementById('fact-numero').textContent = `#${String(venta.id_venta).padStart(4, '0')}`;
  document.getElementById('fact-fecha').textContent = formatDate(venta.fecha);
  document.getElementById('fact-usuario').textContent = usuario?.nombre || '—';
  document.getElementById('fact-cliente').textContent = (cliente ? `${cliente.nombre} ${cliente.apellido}` : 'Consumidor final');
  document.getElementById('fact-telefono').textContent = cliente?.telefono || '—';
  document.getElementById('fact-correo').textContent = cliente?.correo || '—';
  document.getElementById('fact-direccion').textContent = cliente?.direccion || '—';
  document.getElementById('fact-total').textContent = formatCurrency(venta.total);

  document.getElementById('fact-productos-lista').innerHTML = (items || []).map(item => `
    <div class="fact-row">
      <span>${item.nombre} × ${item.cantidad}</span>
      <span>${formatCurrency(item.precio * item.cantidad)}</span>
    </div>
  `).join('') || '<div class="fact-row" style="color:#888">Sin detalle</div>';

  document.getElementById('fact-recibido-row').style.display = 'flex';
  document.getElementById('fact-cambio-row').style.display = 'flex';
  document.getElementById('fact-recibido').textContent = formatCurrency(recibido);
  document.getElementById('fact-cambio-val').textContent = formatCurrency(cambio);

  openModal('modal-factura');
}

// ========== ALERTAS DE STOCK ==========
const STOCK_CRITICO = 0;
const STOCK_BAJO = 5;

async function loadAlertas() {
  document.getElementById('topbar-title').textContent = '🔔 Alertas de Inventario';

  const { data: productos } = await db
    .from('Producto')
    .select('*, Categoria(nombre)')
    .order('stock', { ascending: true });

  if (!productos) return;

  const sinStock = productos.filter(p => p.stock === 0);
  const stockBajo = productos.filter(p => p.stock > 0 && p.stock <= STOCK_BAJO);
  const stockNormal = productos.filter(p => p.stock > STOCK_BAJO);

  document.getElementById('alerta-sin-stock').textContent = sinStock.length;
  document.getElementById('alerta-stock-bajo').textContent = stockBajo.length;
  document.getElementById('alerta-stock-normal').textContent = stockNormal.length;

  const tbodyCrit = document.getElementById('alertas-criticas-tbody');
  tbodyCrit.innerHTML = !sinStock.length
    ? `<tr><td colspan="5"><div class="empty-state"><span class="emoji">✅</span><p>¡Todos los productos tienen stock!</p></div></td></tr>`
    : sinStock.map(p => `
        <tr>
          <td><strong>${p.nombre}</strong></td>
          <td><span class="badge badge-orange">${p.Categoria?.nombre || '—'}</span></td>
          <td><strong style="color:#FF4757">${p.stock}</strong></td>
          <td><span class="badge badge-red">🚨 Sin stock</span></td>
          <td><button class="btn btn-secondary btn-sm" onclick="navigateTo('productos')">📦 Ver</button></td>
        </tr>
      `).join('');

  const tbodyBajas = document.getElementById('alertas-bajas-tbody');
  tbodyBajas.innerHTML = !stockBajo.length
    ? `<tr><td colspan="5"><div class="empty-state"><span class="emoji">👍</span><p>No hay productos con stock bajo</p></div></td></tr>`
    : stockBajo.map(p => `
        <tr>
          <td><strong>${p.nombre}</strong></td>
          <td><span class="badge badge-orange">${p.Categoria?.nombre || '—'}</span></td>
          <td><strong style="color:#FFA502">${p.stock}</strong></td>
          <td><span class="badge badge-yellow">⚠️ Stock bajo</span></td>
          <td><button class="btn btn-secondary btn-sm" onclick="navigateTo('productos')">📦 Ver</button></td>
        </tr>
      `).join('');

  actualizarBadgeAlertas(sinStock.length + stockBajo.length);
}

async function checkAlertasBadge() {
  const { data: productos } = await db.from('Producto').select('stock').lte('stock', STOCK_BAJO);
  actualizarBadgeAlertas(productos?.length || 0);
}

function actualizarBadgeAlertas(total) {
  const badge = document.getElementById('alertas-badge');
  if (!badge) return;
  if (total > 0) { badge.textContent = total; badge.classList.remove('hidden'); }
  else { badge.classList.add('hidden'); }
}

// ========== NOTIFICACIONES EMERGENTES ==========
let notificacionesMostradas = false;

async function mostrarNotificacionesStock() {
  if (notificacionesMostradas) return;
  notificacionesMostradas = true;

  const { data: productos } = await db
    .from('Producto')
    .select('nombre, stock')
    .lte('stock', STOCK_BAJO)
    .order('stock', { ascending: true });

  if (!productos?.length) return;

  const sinStock = productos.filter(p => p.stock === 0);
  const stockBajo = productos.filter(p => p.stock > 0 && p.stock <= STOCK_BAJO);

  let container = document.getElementById('notif-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'notif-container';
    container.style.cssText = `position:fixed;top:20px;right:20px;z-index:9999;display:flex;flex-direction:column;gap:10px;max-width:340px;width:calc(100vw - 40px)`;
    document.body.appendChild(container);
  }

  let delay = 300;
  for (const p of sinStock) { setTimeout(() => crearNotif(container, p.nombre, 'rojo'), delay); delay += 200; }
  for (const p of stockBajo) { setTimeout(() => crearNotif(container, p.nombre, 'amarillo'), delay); delay += 200; }
}

function crearNotif(container, nombre, tipo) {
  const esRojo = tipo === 'rojo';
  const color = esRojo ? '#FF4757' : '#FFA502';
  const bgColor = esRojo ? 'rgba(255,71,87,0.12)' : 'rgba(255,165,2,0.12)';
  const icon = esRojo ? '🚨' : '⚠️';
  const label = esRojo ? 'SIN STOCK' : 'STOCK BAJO';
  const msg = esRojo
    ? `<strong style="color:#F5F5F5">"${nombre}"</strong> <span style="color:#aaa">no tiene existencias. Solicita al proveedor.</span>`
    : `<strong style="color:#F5F5F5">"${nombre}"</strong> <span style="color:#aaa">tiene pocas existencias. Realiza un pedido pronto.</span>`;

  const notif = document.createElement('div');
  notif.className = 'notif-item';
  notif.style.cssText = `background:#1F1F1F;border:1px solid ${color};border-left:4px solid ${color};border-radius:10px;padding:14px 16px;box-shadow:0 8px 24px rgba(0,0,0,0.5);display:flex;gap:12px;align-items:flex-start;animation:notifIn 0.3s ease forwards;font-family:'Nunito',sans-serif`;
  notif.innerHTML = `
    <div style="font-size:1.4rem;flex-shrink:0">${icon}</div>
    <div style="flex:1;min-width:0">
      <span style="background:${color};color:${esRojo ? '#fff' : '#1F1F1F'};font-size:0.63rem;font-weight:900;padding:2px 8px;border-radius:20px;letter-spacing:0.5px">${label}</span>
      <div style="font-size:0.83rem;line-height:1.45;color:#ccc;margin-top:6px">${msg}</div>
      <button onclick="navigateTo('alertas');cerrarNotif(this.closest('.notif-item'))"
        style="margin-top:8px;background:${color};color:${esRojo ? '#fff' : '#1F1F1F'};border:none;border-radius:6px;padding:5px 12px;font-size:0.73rem;font-weight:700;cursor:pointer;font-family:inherit">
        Ver alertas →
      </button>
    </div>
    <button onclick="cerrarNotif(this.parentElement)" style="background:none;border:none;cursor:pointer;font-size:1rem;color:#555;padding:0;flex-shrink:0">✕</button>
  `;
  container.appendChild(notif);
  setTimeout(() => cerrarNotif(notif), 8000);
}

function cerrarNotif(el) {
  if (!el) return;
  el.style.opacity = '0';
  el.style.transform = 'translateX(30px)';
  el.style.transition = 'all 0.3s ease';
  setTimeout(() => el?.remove(), 300);
}

(function() {
  if (document.getElementById('notif-kf')) return;
  const s = document.createElement('style');
  s.id = 'notif-kf';
  s.textContent = `@keyframes notifIn{from{opacity:0;transform:translateX(40px)}to{opacity:1;transform:translateX(0)}}`;
  document.head.appendChild(s);
})();
