// =============================================
// VENTAS, USUARIOS Y FACTURACIÓN — Mi Tiendita
// =============================================

// ========== VENTAS ==========
async function loadVentas() {
  document.getElementById('topbar-title').textContent = '📋 Historial de Ventas';
  await fetchVentas();
}

async function fetchVentas(search = '') {
  let query = db.from('Venta')
    .select('*, Cliente(nombre, apellido), Usuario(nombre)')
    .order('fecha', { ascending: false });

  const { data, error } = await query;
  const tbody = document.getElementById('ventas-table-body');

  if (error || !data?.length) {
    tbody.innerHTML = `<tr><td colspan="6"><div class="empty-state"><span class="emoji">📋</span><p>No hay ventas registradas</p></div></td></tr>`;
    return;
  }

  let filtered = data;
  if (search) {
    const s = search.toLowerCase();
    filtered = data.filter(v =>
      v.Cliente?.nombre?.toLowerCase().includes(s) ||
      v.Cliente?.apellido?.toLowerCase().includes(s) ||
      v.Usuario?.nombre?.toLowerCase().includes(s)
    );
  }

  tbody.innerHTML = filtered.map(v => `
    <tr>
      <td><span class="badge badge-orange">#${String(v.id_venta).padStart(4, '0')}</span></td>
      <td>${formatDate(v.fecha)}</td>
      <td><strong>${v.Cliente ? v.Cliente.nombre + ' ' + v.Cliente.apellido : 'Consumidor final'}</strong></td>
      <td>${v.Usuario?.nombre || '—'}</td>
      <td><strong class="text-orange">${formatCurrency(v.total)}</strong></td>
      <td>
        <button class="btn btn-secondary btn-sm" onclick="verFactura(${v.id_venta})">🧾 Ver</button>
        ${esAdmin() ? `<button class="btn btn-danger btn-sm" onclick="deleteVenta(${v.id_venta})">🗑️</button>` : ''}
      </td>
    </tr>
  `).join('');
}

async function deleteVenta(id) {
  if (!soloAdmin('eliminar ventas')) return;
  if (!confirm('¿Eliminar esta venta? El stock de sus productos volverá al inventario.')) return;
  const { error } = await db.rpc('eliminar_venta', { p_id_venta: id });
  if (error) { toast('Error eliminando venta', 'error'); return; }
  toast('Venta eliminada', 'success');
  fetchVentas();
  checkAlertasBadge();
}

// ========== VER FACTURA ==========
async function verFactura(id) {
  const { data: venta } = await db.from('Venta')
    .select('*, Cliente(*), Usuario(nombre)')
    .eq('id_venta', id)
    .single();

  if (!venta) return;

  document.getElementById('fact-numero').textContent = `#${String(venta.id_venta).padStart(4, '0')}`;
  document.getElementById('fact-fecha').textContent = formatDate(venta.fecha);
  document.getElementById('fact-cliente').textContent = (venta.Cliente ? `${venta.Cliente.nombre} ${venta.Cliente.apellido}` : 'Consumidor final');
  document.getElementById('fact-telefono').textContent = venta.Cliente?.telefono || '—';
  document.getElementById('fact-correo').textContent = venta.Cliente?.correo || '—';
  document.getElementById('fact-direccion').textContent = venta.Cliente?.direccion || '—';
  document.getElementById('fact-usuario').textContent = venta.Usuario?.nombre || '—';
  document.getElementById('fact-total').textContent = formatCurrency(venta.total);

  const { data: detalle } = await db.from('Detalle_Venta')
    .select('nombre_producto, cantidad, precio_unitario')
    .eq('id_venta', id)
    .order('id_detalle');
  document.getElementById('fact-productos-lista').innerHTML = detalle?.length
    ? detalle.map(d => `
        <div class="fact-row">
          <span>${d.nombre_producto} × ${d.cantidad}</span>
          <span>${formatCurrency(d.precio_unitario * d.cantidad)}</span>
        </div>`).join('')
    : '<div class="fact-row" style="color:#888;font-size:0.82rem;justify-content:center">Venta anterior: sin detalle de productos</div>';
  // Recibido/cambio solo existen al momento de la venta
  document.getElementById('fact-recibido-row').style.display = 'none';
  document.getElementById('fact-cambio-row').style.display = 'none';

  openModal('modal-factura');
}

function printFactura() {
  // Mientras se imprime, el CSS oculta todo menos la factura
  document.body.classList.add('imprimiendo-factura');
  window.addEventListener('afterprint', () => document.body.classList.remove('imprimiendo-factura'), { once: true });
  window.print();
}

// ========== USUARIOS ==========
let editingUsuarioId = null;

async function loadUsuarios() {
  document.getElementById('topbar-title').textContent = '👤 Usuarios';

  if (!esAdmin()) {
    document.getElementById('usuarios-table-body').innerHTML =
      `<tr><td colspan="4"><div class="empty-state"><span class="emoji">🔒</span><p>Solo administradores pueden ver esta sección</p></div></td></tr>`;
    const btn = document.getElementById('btn-nuevo-usuario');
    if (btn) btn.style.display = 'none';
    return;
  }

  await fetchUsuarios();
}

async function fetchUsuarios(search = '') {
  let query = db.from('Usuario').select('*').order('nombre');
  if (search) query = query.or(`nombre.ilike.%${search}%,username.ilike.%${search}%`);
  const { data, error } = await query;

  const tbody = document.getElementById('usuarios-table-body');
  if (error || !data?.length) {
    tbody.innerHTML = `<tr><td colspan="4"><div class="empty-state"><span class="emoji">👤</span><p>No hay usuarios</p></div></td></tr>`;
    return;
  }

  tbody.innerHTML = data.map(u => `
    <tr>
      <td><strong>${u.nombre}</strong></td>
      <td>${u.username}</td>
      <td>
        <span class="badge ${u.rol === 'Administrador' ? 'badge-orange' : 'badge-blue'}">${u.rol}</span>
      </td>
      <td>
        <button class="btn btn-secondary btn-sm" onclick="editUsuario(${u.id_usuario})">✏️</button>
        <button class="btn btn-danger btn-sm" onclick="deleteUsuario(${u.id_usuario}, '${u.nombre}')"
          ${u.id_usuario === App.currentUser?.id_usuario ? 'disabled title="No puedes eliminarte"' : ''}>🗑️</button>
      </td>
    </tr>
  `).join('');
}

function openUsuarioModal(editing = false) {
  if (!editing) {
    editingUsuarioId = null;
    document.getElementById('usu-form').reset();
    document.getElementById('modal-usu-title').textContent = '➕ Nuevo Usuario';
  }
  openModal('modal-usuario');
}

async function editUsuario(id) {
  const { data } = await db.from('Usuario').select('*').eq('id_usuario', id).single();
  if (!data) return;
  editingUsuarioId = id;
  document.getElementById('usu-nombre').value = data.nombre;
  document.getElementById('usu-username').value = data.username;
  document.getElementById('usu-contrasena').value = data.contrasena;
  document.getElementById('usu-rol').value = data.rol;
  document.getElementById('modal-usu-title').textContent = '✏️ Editar Usuario';
  openModal('modal-usuario');
}

document.getElementById('usu-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const payload = {
    nombre: document.getElementById('usu-nombre').value,
    username: document.getElementById('usu-username').value,
    contrasena: document.getElementById('usu-contrasena').value,
    rol: document.getElementById('usu-rol').value,
  };
  let error;
  if (editingUsuarioId) {
    ({ error } = await db.from('Usuario').update(payload).eq('id_usuario', editingUsuarioId));
  } else {
    ({ error } = await db.from('Usuario').insert(payload));
  }
  if (error) { toast('Error guardando usuario: ' + error.message, 'error'); return; }
  toast(editingUsuarioId ? 'Usuario actualizado ✅' : 'Usuario creado ✅', 'success');
  closeModal('modal-usuario');
  fetchUsuarios();
});

async function deleteUsuario(id, nombre) {
  if (!confirm(`¿Eliminar al usuario "${nombre}"?`)) return;
  const { error } = await db.from('Usuario').delete().eq('id_usuario', id);
  if (error) { toast('Error eliminando usuario', 'error'); return; }
  toast('Usuario eliminado', 'success');
  fetchUsuarios();
}

// ========== FACTURACIÓN (REPORTE) ==========
async function loadFacturacion() {
  document.getElementById('topbar-title').textContent = '🧾 Reporte de Ventas';
  await loadFacturacionStats();
}

async function loadFacturacionStats() {
  const { data: ventas } = await db.from('Venta')
    .select('*, Cliente(nombre, apellido), Usuario(nombre)')
    .order('fecha', { ascending: false });

  if (!ventas) return;

  actualizarStatsFacturacion(ventas);

  renderTablaFacturacion(ventas);
}

function renderTablaFacturacion(ventas) {
  const tbody = document.getElementById('facturacion-table-body');
  if (!ventas.length) {
    tbody.innerHTML = `<tr><td colspan="6"><div class="empty-state"><span class="emoji">🧾</span><p>Sin ventas en ese rango</p></div></td></tr>`;
    return;
  }
  tbody.innerHTML = ventas.map(v => `
    <tr>
      <td><span class="badge badge-orange">#${String(v.id_venta).padStart(4, '0')}</span></td>
      <td>${formatDate(v.fecha)}</td>
      <td><strong>${v.Cliente ? v.Cliente.nombre + ' ' + v.Cliente.apellido : 'Consumidor final'}</strong></td>
      <td>${v.Usuario?.nombre || '—'}</td>
      <td><strong class="text-orange">${formatCurrency(v.total)}</strong></td>
      <td><button class="btn btn-secondary btn-sm" onclick="verFactura(${v.id_venta})">🧾 Ver</button></td>
    </tr>
  `).join('');
}

async function filtrarFacturacion() {
  const desde = document.getElementById('fact-desde').value;
  const hasta = document.getElementById('fact-hasta').value;

  let query = db.from('Venta')
    .select('*, Cliente(nombre, apellido), Usuario(nombre)')
    .order('fecha', { ascending: false });

  if (desde) query = query.gte('fecha', desde);
  if (hasta) query = query.lte('fecha', hasta);

  const { data: ventas } = await query;
  if (!ventas) return;

  actualizarStatsFacturacion(ventas);

  renderTablaFacturacion(ventas);
}

function actualizarStatsFacturacion(ventas) {
  const sumar = lista => lista.reduce((s, v) => s + parseFloat(v.total), 0);
  const total = sumar(ventas);
  const hoy = fechaLocal();
  document.getElementById('fact-total-ventas').textContent = formatCurrency(total);
  document.getElementById('fact-num-ventas').textContent = ventas.length;
  document.getElementById('fact-hoy').textContent = formatCurrency(sumar(ventas.filter(v => v.fecha === hoy)));
  document.getElementById('fact-promedio').textContent = formatCurrency(ventas.length ? total / ventas.length : 0);
}