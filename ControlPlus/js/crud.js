// =============================================
// CRUD.JS — Mi Tiendita
// =============================================

function esAdmin() {
  return App.currentUser?.rol === 'Administrador';
}

function soloAdmin(accion) {
  if (!esAdmin()) {
    toast(`🔒 Solo los administradores pueden ${accion}`, 'error');
    return false;
  }
  return true;
}

// ========== PRODUCTOS ==========
let editingProductoId = null;

async function loadProductos() {
  document.getElementById('topbar-title').textContent = '📦 Productos';
  renderLoader('productos-table-body');

  const { data: categorias } = await db.from('Categoria').select('*').order('nombre');
  const catSelect = document.getElementById('prod-categoria');
  catSelect.innerHTML = '<option value="">Selecciona categoría</option>' +
    (categorias || []).map(c => `<option value="${c.id_categoria}">${c.nombre}</option>`).join('');

  const btnNuevo = document.getElementById('btn-nuevo-producto');
  if (btnNuevo) btnNuevo.style.display = esAdmin() ? '' : 'none';

  await fetchProductos();
}

async function fetchProductos(search = '') {
  let query = db.from('Producto').select('*, Categoria(nombre)').order('nombre');
  if (search) query = query.ilike('nombre', `%${search}%`);
  const { data, error } = await query;

  const tbody = document.getElementById('productos-table-body');
  if (error || !data?.length) {
    tbody.innerHTML = `<tr><td colspan="7"><div class="empty-state"><span class="emoji">📦</span><p>No hay productos registrados</p></div></td></tr>`;
    return;
  }

  tbody.innerHTML = data.map(p => `
    <tr>
      <td><strong>${p.nombre}</strong></td>
      <td>${p.descripcion || '—'}</td>
      <td>${formatCurrency(p.costo)}</td>
      <td>${formatCurrency(p.precio_venta)}</td>
      <td>
        <span class="badge ${p.stock === 0 ? 'badge-red' : p.stock <= 5 ? 'badge-yellow' : 'badge-green'}">
          ${p.stock} uds
        </span>
      </td>
      <td><span class="badge badge-orange">${p.Categoria?.nombre || '—'}</span></td>
      <td>
        ${esAdmin()
          ? `<button class="btn btn-secondary btn-sm" onclick="editProducto(${p.id_producto})">✏️</button>
             <button class="btn btn-danger btn-sm" onclick="deleteProducto(${p.id_producto}, '${p.nombre.replace(/'/g, "\\'")}')">🗑️</button>`
          : `<span class="badge badge-gray" style="font-size:0.7rem">🔒 Solo lectura</span>`
        }
      </td>
    </tr>
  `).join('');
}

function openProductoModal(editing = false) {
  if (!soloAdmin('crear o editar productos')) return;
  if (!editing) {
    editingProductoId = null;
    document.getElementById('prod-form').reset();
    document.getElementById('modal-prod-title').textContent = '➕ Nuevo Producto';
  }
  openModal('modal-producto');
}

async function editProducto(id) {
  if (!soloAdmin('editar productos')) return;
  const { data } = await db.from('Producto').select('*').eq('id_producto', id).single();
  if (!data) return;
  editingProductoId = id;
  document.getElementById('prod-nombre').value = data.nombre;
  document.getElementById('prod-descripcion').value = data.descripcion || '';
  document.getElementById('prod-costo').value = data.costo;
  document.getElementById('prod-precio').value = data.precio_venta;
  document.getElementById('prod-stock').value = data.stock;
  document.getElementById('prod-categoria').value = data.id_categoria;
  document.getElementById('modal-prod-title').textContent = '✏️ Editar Producto';
  openModal('modal-producto');
}

document.getElementById('prod-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!soloAdmin('guardar productos')) return;
  const payload = {
    nombre: document.getElementById('prod-nombre').value,
    descripcion: document.getElementById('prod-descripcion').value,
    costo: parseFloat(document.getElementById('prod-costo').value),
    precio_venta: parseFloat(document.getElementById('prod-precio').value),
    stock: parseInt(document.getElementById('prod-stock').value),
    id_categoria: parseInt(document.getElementById('prod-categoria').value),
  };
  if (payload.costo <= 0) { toast('El costo debe ser mayor a 0', 'error'); return; }
  if (payload.precio_venta <= 0) { toast('El precio de venta debe ser mayor a 0', 'error'); return; }
  if (payload.stock < 0) { toast('El stock no puede ser negativo', 'error'); return; }

  let error;
  if (editingProductoId) {
    ({ error } = await db.from('Producto').update(payload).eq('id_producto', editingProductoId));
  } else {
    ({ error } = await db.from('Producto').insert(payload));
  }
  if (error) {
    if (error.code === '23505') { toast(`⚠️ El producto con el nombre "${payload.nombre}" ya existe`, 'error'); return; }
    toast('Error guardando producto', 'error');
    return;
  }
  toast(editingProductoId ? 'Producto actualizado ✅' : 'Producto creado ✅', 'success');
  closeModal('modal-producto');
  fetchProductos();
});

async function deleteProducto(id, nombre) {
  if (!soloAdmin('eliminar productos')) return;
  if (!confirm(`¿Eliminar "${nombre}"?`)) return;
  const { error } = await db.from('Producto').delete().eq('id_producto', id);
  if (error) { toast('Error eliminando producto', 'error'); return; }
  toast('Producto eliminado', 'success');
  fetchProductos();
}

// ========== CATEGORIAS ==========
let editingCategoriaId = null;

async function loadCategorias() {
  document.getElementById('topbar-title').textContent = '🏷️ Categorías';
  const btnNuevo = document.getElementById('btn-nueva-categoria');
  if (btnNuevo) btnNuevo.style.display = esAdmin() ? '' : 'none';
  await fetchCategorias();
}

async function fetchCategorias(search = '') {
  let query = db.from('Categoria').select('*').order('nombre');
  if (search) query = query.ilike('nombre', `%${search}%`);
  const { data, error } = await query;
  const tbody = document.getElementById('categorias-table-body');
  if (error || !data?.length) {
    tbody.innerHTML = `<tr><td colspan="3"><div class="empty-state"><span class="emoji">🏷️</span><p>No hay categorías</p></div></td></tr>`;
    return;
  }
  tbody.innerHTML = data.map(c => `
    <tr>
      <td><strong>${c.nombre}</strong></td>
      <td>${c.descripcion || '—'}</td>
      <td>
        ${esAdmin()
          ? `<button class="btn btn-secondary btn-sm" onclick="editCategoria(${c.id_categoria})">✏️</button>
             <button class="btn btn-danger btn-sm" onclick="deleteCategoria(${c.id_categoria}, '${c.nombre.replace(/'/g, "\\'")}')">🗑️</button>`
          : `<span class="badge badge-gray" style="font-size:0.7rem">🔒 Solo lectura</span>`
        }
      </td>
    </tr>
  `).join('');
}

function openCategoriaModal(editing = false) {
  if (!soloAdmin('crear o editar categorías')) return;
  if (!editing) {
    editingCategoriaId = null;
    document.getElementById('cat-form').reset();
    document.getElementById('modal-cat-title').textContent = '➕ Nueva Categoría';
  }
  openModal('modal-categoria');
}

async function editCategoria(id) {
  if (!soloAdmin('editar categorías')) return;
  const { data } = await db.from('Categoria').select('*').eq('id_categoria', id).single();
  if (!data) return;
  editingCategoriaId = id;
  document.getElementById('cat-nombre').value = data.nombre;
  document.getElementById('cat-descripcion').value = data.descripcion || '';
  document.getElementById('modal-cat-title').textContent = '✏️ Editar Categoría';
  openModal('modal-categoria');
}

document.getElementById('cat-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!soloAdmin('guardar categorías')) return;
  const payload = {
    nombre: document.getElementById('cat-nombre').value,
    descripcion: document.getElementById('cat-descripcion').value,
  };
  let error;
  if (editingCategoriaId) {
    ({ error } = await db.from('Categoria').update(payload).eq('id_categoria', editingCategoriaId));
  } else {
    ({ error } = await db.from('Categoria').insert(payload));
  }
  if (error) {
    if (error.code === '23505') { toast(`⚠️ La categoría "${payload.nombre}" ya existe`, 'error'); return; }
    toast('Error guardando categoría', 'error');
    return;
  }
  toast(editingCategoriaId ? 'Categoría actualizada ✅' : 'Categoría creada ✅', 'success');
  closeModal('modal-categoria');
  fetchCategorias();
});

async function deleteCategoria(id, nombre) {
  if (!soloAdmin('eliminar categorías')) return;
  if (!confirm(`¿Eliminar "${nombre}"?`)) return;
  const { error } = await db.from('Categoria').delete().eq('id_categoria', id);
  if (error) { toast('No se puede eliminar (tiene productos asociados)', 'error'); return; }
  toast('Categoría eliminada', 'success');
  fetchCategorias();
}

// ========== CLIENTES ==========
let editingClienteId = null;

async function loadClientes() {
  document.getElementById('topbar-title').textContent = '👥 Clientes';
  await fetchClientes();
}

async function fetchClientes(search = '') {
  let query = db.from('Cliente').select('*').order('nombre');
  if (search) query = query.or(`nombre.ilike.%${search}%,apellido.ilike.%${search}%,correo.ilike.%${search}%`);
  const { data, error } = await query;
  const tbody = document.getElementById('clientes-table-body');
  if (error || !data?.length) {
    tbody.innerHTML = `<tr><td colspan="6"><div class="empty-state"><span class="emoji">👥</span><p>No hay clientes registrados</p></div></td></tr>`;
    return;
  }
  tbody.innerHTML = data.map(c => `
    <tr>
      <td><strong>${c.nombre} ${c.apellido}</strong></td>
      <td>${c.telefono || '—'}</td>
      <td>${c.correo || '—'}</td>
      <td>${c.direccion || '—'}</td>
      <td>${formatDate(c.fecha_registro)}</td>
      <td>
        <button class="btn btn-secondary btn-sm" onclick="editCliente(${c.id_cliente})">✏️ Editar</button>
        ${esAdmin()
          ? `<button class="btn btn-danger btn-sm" onclick="deleteCliente(${c.id_cliente}, '${c.nombre.replace(/'/g, "\\'")}')">🗑️</button>`
          : ''
        }
      </td>
    </tr>
  `).join('');
}

function openClienteModal(editing = false) {
  if (!editing) {
    editingClienteId = null;
    document.getElementById('cli-form').reset();
    document.getElementById('modal-cli-title').textContent = '➕ Nuevo Cliente';
    document.getElementById('cli-fecha').value = fechaLocal();
  }
  openModal('modal-cliente');
}

async function editCliente(id) {
  const { data } = await db.from('Cliente').select('*').eq('id_cliente', id).single();
  if (!data) return;
  editingClienteId = id;
  document.getElementById('cli-nombre').value = data.nombre;
  document.getElementById('cli-apellido').value = data.apellido;
  document.getElementById('cli-telefono').value = data.telefono || '';
  document.getElementById('cli-correo').value = data.correo || '';
  document.getElementById('cli-direccion').value = data.direccion || '';
  document.getElementById('cli-fecha').value = data.fecha_registro;
  document.getElementById('modal-cli-title').textContent = '✏️ Editar Cliente';
  openModal('modal-cliente');
}

document.getElementById('cli-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const payload = {
    nombre: document.getElementById('cli-nombre').value,
    apellido: document.getElementById('cli-apellido').value,
    telefono: document.getElementById('cli-telefono').value,
    correo: document.getElementById('cli-correo').value,
    direccion: document.getElementById('cli-direccion').value,
    fecha_registro: document.getElementById('cli-fecha').value,
  };
  let error, data;
  if (editingClienteId) {
    ({ error } = await db.from('Cliente').update(payload).eq('id_cliente', editingClienteId));
  } else {
    ({ error, data } = await db.from('Cliente').insert(payload).select().single());
  }
  if (error) { toast('Error guardando cliente: ' + error.message, 'error'); return; }
  toast(editingClienteId ? 'Cliente actualizado ✅' : 'Cliente creado ✅', 'success');
  closeModal('modal-cliente');
  if (window._clienteDesdeVenta) {
    window._clienteDesdeVenta = false;
    await recargarClientesNV();
    if (!editingClienteId && data) document.getElementById('nv-cliente').value = data.id_cliente;
  } else {
    fetchClientes();
  }
});

async function deleteCliente(id, nombre) {
  if (!soloAdmin('eliminar clientes')) return;
  if (!confirm(`¿Eliminar a "${nombre}"?`)) return;
  const { error } = await db.from('Cliente').delete().eq('id_cliente', id);
  if (error) { toast('No se puede eliminar (tiene ventas asociadas)', 'error'); return; }
  toast('Cliente eliminado', 'success');
  fetchClientes();
}

// ========== PROVEEDORES ==========
let editingProveedorId = null;

async function loadProveedores() {
  document.getElementById('topbar-title').textContent = '🏭 Proveedores';
  const btnNuevo = document.getElementById('btn-nuevo-proveedor');
  if (btnNuevo) btnNuevo.style.display = esAdmin() ? '' : 'none';
  await fetchProveedores();
}

async function fetchProveedores(search = '') {
  let query = db.from('Proveedor').select('*').order('nombre');
  if (search) query = query.or(`nombre.ilike.%${search}%,nit.ilike.%${search}%`);
  const { data, error } = await query;
  const tbody = document.getElementById('proveedores-table-body');
  if (error || !data?.length) {
    tbody.innerHTML = `<tr><td colspan="5"><div class="empty-state"><span class="emoji">🏭</span><p>No hay proveedores registrados</p></div></td></tr>`;
    return;
  }
  tbody.innerHTML = data.map(p => `
    <tr>
      <td><strong>${p.nombre}</strong></td>
      <td>${p.nit}</td>
      <td>${p.numero}</td>
      <td>${p.correo}</td>
      <td>
        ${esAdmin()
          ? `<button class="btn btn-secondary btn-sm" onclick="editProveedor(${p.id_proveedor})">✏️</button>
             <button class="btn btn-danger btn-sm" onclick="deleteProveedor(${p.id_proveedor}, '${p.nombre.replace(/'/g, "\\'")}')">🗑️</button>`
          : `<span class="badge badge-gray" style="font-size:0.7rem">🔒 Solo lectura</span>`
        }
      </td>
    </tr>
  `).join('');
}

function openProveedorModal(editing = false) {
  if (!soloAdmin('crear o editar proveedores')) return;
  if (!editing) {
    editingProveedorId = null;
    document.getElementById('prov-form').reset();
    document.getElementById('modal-prov-title').textContent = '➕ Nuevo Proveedor';
  }
  openModal('modal-proveedor');
}

async function editProveedor(id) {
  if (!soloAdmin('editar proveedores')) return;
  const { data } = await db.from('Proveedor').select('*').eq('id_proveedor', id).single();
  if (!data) return;
  editingProveedorId = id;
  document.getElementById('prov-nombre').value = data.nombre;
  document.getElementById('prov-nit').value = data.nit;
  document.getElementById('prov-numero').value = data.numero;
  document.getElementById('prov-correo').value = data.correo;
  document.getElementById('modal-prov-title').textContent = '✏️ Editar Proveedor';
  openModal('modal-proveedor');
}

document.getElementById('prov-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!soloAdmin('guardar proveedores')) return;
  const payload = {
    nombre: document.getElementById('prov-nombre').value,
    nit: document.getElementById('prov-nit').value,
    numero: document.getElementById('prov-numero').value,
    correo: document.getElementById('prov-correo').value,
  };
  let error;
  if (editingProveedorId) {
    ({ error } = await db.from('Proveedor').update(payload).eq('id_proveedor', editingProveedorId));
  } else {
    ({ error } = await db.from('Proveedor').insert(payload));
  }
  if (error) {
    if (error.code === '23505') { toast(`⚠️ El proveedor "${payload.nombre}" ya existe`, 'error'); return; }
    toast('Error guardando proveedor: ' + error.message, 'error');
    return;
  }
  toast(editingProveedorId ? 'Proveedor actualizado ✅' : 'Proveedor creado ✅', 'success');
  closeModal('modal-proveedor');
  fetchProveedores();
});

async function deleteProveedor(id, nombre) {
  if (!soloAdmin('eliminar proveedores')) return;
  if (!confirm(`¿Eliminar "${nombre}"?`)) return;
  const { error } = await db.from('Proveedor').delete().eq('id_proveedor', id);
  if (error) { toast('No se puede eliminar (tiene compras asociadas)', 'error'); return; }
  toast('Proveedor eliminado', 'success');
  fetchProveedores();
}