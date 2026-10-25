// =============================================
// APP.JS — Mi Tiendita
// Lógica principal, navegación, auth
// =============================================

const App = {
  currentUser: null,
  currentPage: 'dashboard',
};

// ---- INICIALIZACIÓN ----
document.addEventListener('DOMContentLoaded', async () => {
  const session = localStorage.getItem('mitiendita_user');
  if (session) {
    App.currentUser = JSON.parse(session);
    showApp();
  } else {
    showLogin();
  }
});

// ---- LOGIN / LOGOUT ----
function showLogin() {
  document.getElementById('login-screen').classList.remove('hidden');
  document.getElementById('app-screen').classList.add('hidden');
}

function showApp() {
  document.getElementById('login-screen').classList.add('hidden');
  document.getElementById('app-screen').classList.remove('hidden');
  updateUserUI();
  navigateTo('dashboard');
  setTimeout(checkAlertasBadge, 800);
  setTimeout(mostrarNotificacionesStock, 1500);
}

document.getElementById('login-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const username = document.getElementById('login-username').value.trim();
  const password = document.getElementById('login-password').value.trim();
  const btn = document.getElementById('login-btn');

  btn.disabled = true;
  btn.innerHTML = '⏳ Entrando...';

  try {
    const { data, error } = await db
      .from('Usuario')
      .select('*')
      .eq('username', username)
      .eq('contrasena', password)
      .single();

    if (error || !data) {
      toast('Usuario o contraseña incorrectos', 'error');
    } else {
      App.currentUser = data;
      localStorage.setItem('mitiendita_user', JSON.stringify(data));
      showApp();
    }
  } catch (err) {
    toast('Error de conexión', 'error');
  }

  btn.disabled = false;
  btn.innerHTML = '🏪 Ingresar';
});

function logout() {
  localStorage.removeItem('mitiendita_user');
  App.currentUser = null;
  showLogin();
  toast('Sesión cerrada', 'success');
}

function updateUserUI() {
  if (!App.currentUser) return;
  document.getElementById('sidebar-user-name').textContent = App.currentUser.nombre;
  document.getElementById('sidebar-user-role').textContent = App.currentUser.rol;
  const initials = App.currentUser.nombre.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
  document.getElementById('user-avatar-text').textContent = initials;
}

// ---- NAVEGACIÓN ----
function navigateTo(page) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));

  const pageEl = document.getElementById(`page-${page}`);
  if (pageEl) pageEl.classList.add('active');

  const navEl = document.querySelector(`[data-page="${page}"]`);
  if (navEl) navEl.classList.add('active');

  App.currentPage = page;
  closeSidebar();
  loadPage(page);
}

function loadPage(page) {
  switch (page) {
    case 'dashboard':   loadDashboard();   break;
    case 'productos':   loadProductos();   break;
    case 'categorias':  loadCategorias();  break;
    case 'clientes':    loadClientes();    break;
    case 'proveedores': loadProveedores(); break;
    case 'ventas':      loadVentas();      break;
    case 'nueva-venta': loadNuevaVenta();  break;
    case 'alertas':     loadAlertas();     break;
    case 'usuarios':    loadUsuarios();    break;
    case 'facturacion': loadFacturacion(); break;
  }
}

// ---- SIDEBAR MOBILE ----
function toggleSidebar() {
  document.querySelector('.sidebar').classList.toggle('open');
  document.getElementById('overlay-bg').classList.toggle('show');
}

function closeSidebar() {
  document.querySelector('.sidebar').classList.remove('open');
  document.getElementById('overlay-bg').classList.remove('show');
}

// ---- TOAST ----
function toast(msg, type = 'success') {
  const icons = { success: '✅', error: '❌', warning: '⚠️' };
  const container = document.getElementById('toast-container');
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.innerHTML = `<span>${icons[type]}</span> ${msg}`;
  container.appendChild(el);
  setTimeout(() => el.remove(), 3500);
}

// ---- MODAL ----
function openModal(id) {
  document.getElementById(id).classList.add('open');
}

function closeModal(id) {
  document.getElementById(id).classList.remove('open');
}

document.querySelectorAll('.modal-overlay').forEach(overlay => {
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) overlay.classList.remove('open');
  });
});

// ---- HELPERS ----
function formatCurrency(val) {
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(val);
}

function formatDate(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' });
}

// Fecha local (YYYY-MM-DD). toISOString() usa UTC y adelanta el día después de las 7 p. m. en Colombia
function fechaLocal(d = new Date()) {
  const p = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

function debounce(fn, ms = 300) {
  let t;
  return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
}
const debouncedFetchProductos = debounce(v => fetchProductos(v));
const debouncedFetchCategorias = debounce(v => fetchCategorias(v));
const debouncedFetchClientes = debounce(v => fetchClientes(v));
const debouncedFetchProveedores = debounce(v => fetchProveedores(v));
const debouncedFetchUsuarios = debounce(v => fetchUsuarios(v));
const debouncedFetchVentas = debounce(v => fetchVentas(v));
const debouncedBuscarProductoVenta = debounce(v => buscarProductoVenta(v), 250);

function renderLoader(containerId) {
  const el = document.getElementById(containerId);
  if (el) el.innerHTML = `<tr><td colspan="10"><div class="loader"><div class="spinner"></div></div></td></tr>`;
}

// ---- DASHBOARD ----
async function loadDashboard() {
  document.getElementById('topbar-title').textContent = '🏠 Panel Principal';

  try {
    const [
      { count: totalProductos },
      { count: totalClientes },
      { count: totalProveedores },
      { data: ventas }
    ] = await Promise.all([
      db.from('Producto').select('*', { count: 'exact', head: true }),
      db.from('Cliente').select('*', { count: 'exact', head: true }),
      db.from('Proveedor').select('*', { count: 'exact', head: true }),
      db.from('Venta').select('total'),
    ]);

    const totalVentas = ventas?.reduce((s, v) => s + parseFloat(v.total), 0) || 0;

    document.getElementById('stat-productos').textContent = totalProductos || 0;
    document.getElementById('stat-clientes').textContent = totalClientes || 0;
    document.getElementById('stat-proveedores').textContent = totalProveedores || 0;
    document.getElementById('stat-ventas').textContent = formatCurrency(totalVentas);

    const { data: ultimasVentas } = await db
      .from('Venta')
      .select('*, Cliente(nombre, apellido), Usuario(nombre)')
      .order('fecha', { ascending: false })
      .limit(5);

    const tbody = document.getElementById('recent-ventas-tbody');
    if (!ultimasVentas?.length) {
      tbody.innerHTML = `<tr><td colspan="4"><div class="empty-state"><span class="emoji">🛒</span><p>Sin ventas aún</p></div></td></tr>`;
    } else {
      tbody.innerHTML = ultimasVentas.map(v => `
        <tr>
          <td>${formatDate(v.fecha)}</td>
          <td><strong>${v.Cliente?.nombre || '—'} ${v.Cliente?.apellido || ''}</strong></td>
          <td>${v.Usuario?.nombre || '—'}</td>
          <td><strong class="text-orange">${formatCurrency(v.total)}</strong></td>
        </tr>
      `).join('');
    }
  } catch (err) {
    toast('Error cargando panel', 'error');
  }
}
