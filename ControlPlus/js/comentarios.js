// =============================================
// COMENTARIOS — botón flotante disponible en todas las pantallas
// Guarda el texto en la tabla "Comentario"
// =============================================

let guardandoComentario = false;

function pantallaActual() {
  const app = document.getElementById('app-screen');
  return app && !app.classList.contains('hidden') ? App.currentPage : 'login';
}

function actualizarContadorComentario() {
  const n = document.getElementById('com-texto').value.length;
  document.getElementById('com-contador').textContent = `${n} / 1000`;
}

function abrirComentarios() {
  document.getElementById('com-form').reset();
  actualizarContadorComentario();
  openModal('modal-comentarios');
  document.getElementById('com-texto').focus();
}

document.getElementById('com-texto').addEventListener('input', actualizarContadorComentario);

document.getElementById('com-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  if (guardandoComentario) return;

  const texto = document.getElementById('com-texto').value.trim();
  if (!texto) { toast('Escribe un comentario antes de guardar', 'warning'); return; }

  const btn = document.getElementById('com-guardar');
  guardandoComentario = true;
  btn.disabled = true;

  const { error } = await db.from('Comentario').insert({
    texto,
    pantalla: pantallaActual(),
    id_usuario: App.currentUser?.id_usuario ?? null,
  });

  guardandoComentario = false;
  btn.disabled = false;

  if (error) { toast('No se pudo guardar el comentario: ' + error.message, 'error'); return; }
  toast('Comentario guardado', 'success');
  closeModal('modal-comentarios');
});
