async function renderTemporadas() {
  document.getElementById('pageTitle').textContent = 'Temporadas';
  const content = document.getElementById('pageContent');
  content.innerHTML = loading();
  await _renderTemporadasData();
}

async function _renderTemporadasData() {
  const content = document.getElementById('pageContent');
  try {
    const temporadas = await API.get('/temporadas/');

    content.innerHTML = `
      <div class="section-header">
        <h2 class="section-title">Temporadas</h2>
        <button class="btn btn-primary" onclick="modalNuevaTemporada()">
          <svg viewBox="0 0 24 24"><path d="M12 4v16m8-8H4"/></svg>
          Nueva Temporada
        </button>
      </div>

      ${temporadas.length === 0 ? `<div class="card">${empty('No hay temporadas', 'Crea tu primera temporada para empezar')}</div>` : ''}

      <div style="display:flex;flex-direction:column;gap:16px">
        ${temporadas.map(t => `
          <div class="card" style="border-left:4px solid ${t.activa ? 'var(--rojo)' : 'var(--borde)'}">
            <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px">
              <div>
                <div style="display:flex;align-items:center;gap:10px;margin-bottom:4px">
                  <h3 style="font-size:16px;font-weight:800">${t.nombre}</h3>
                  ${t.activa ? '<span style="background:var(--rojo);color:white;font-size:10px;font-weight:700;padding:2px 8px;border-radius:20px;text-transform:uppercase">Activa</span>' : ''}
                </div>
                <div style="font-size:12px;color:var(--gris-claro)">
                  Año ${t.anio}
                  ${t.fecha_inicio ? ` · ${formatDate(t.fecha_inicio)}` : ''}
                  ${t.fecha_fin ? ` — ${formatDate(t.fecha_fin)}` : ''}
                </div>
              </div>
              <div style="display:flex;gap:8px;flex-wrap:wrap">
                ${!t.activa ? `<button class="btn btn-success btn-sm" onclick="activarTemporada(${t.id})">Activar</button>` : ''}
                <button class="btn btn-ghost btn-sm" onclick="modalEditarTemporada(${t.id})">Editar</button>
                <a class="btn btn-ghost btn-sm" href="/api/reportes/temporada/${t.id}" target="_blank">PDF</a>
                ${!t.activa ? `<button class="btn btn-danger btn-sm" onclick="eliminarTemporada(${t.id})">Eliminar</button>` : ''}
              </div>
            </div>
          </div>`).join('')}
      </div>`;

  } catch (e) {
    content.innerHTML = `<div class="card"><p style="color:var(--rojo)">Error: ${e.message}</p></div>`;
  }
}

function modalNuevaTemporada() {
  const anio = new Date().getFullYear();
  showModal('Nueva Temporada', `
    <form id="frmTemporada" onsubmit="guardarTemporada(event)">
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Nombre</label>
          <input class="form-control" name="nombre" required placeholder="Ej: Temporada 2025" value="Temporada ${anio}" />
        </div>
        <div class="form-group">
          <label class="form-label">Año</label>
          <input class="form-control" type="number" name="anio" value="${anio}" required />
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Fecha Inicio (opcional)</label>
          <input class="form-control" type="date" name="fecha_inicio" />
        </div>
        <div class="form-group">
          <label class="form-label">Fecha Fin (opcional)</label>
          <input class="form-control" type="date" name="fecha_fin" />
        </div>
      </div>
      <div class="form-group">
        <label style="display:flex;align-items:center;gap:8px;cursor:pointer">
          <input type="checkbox" name="activa" checked style="width:16px;height:16px;accent-color:var(--rojo)" />
          <span class="form-label" style="margin:0">Marcar como temporada activa</span>
        </label>
      </div>
      <div style="display:flex;gap:10px;justify-content:flex-end;margin-top:20px">
        <button type="button" class="btn btn-ghost" onclick="closeModal()">Cancelar</button>
        <button type="submit" class="btn btn-primary">Crear</button>
      </div>
    </form>`);
}

async function guardarTemporada(e) {
  e.preventDefault();
  const form = e.target;
  try {
    const t = await API.post('/temporadas/', {
      nombre: form.nombre.value.trim(),
      anio: parseInt(form.anio.value),
      activa: form.activa.checked,
      fecha_inicio: form.fecha_inicio.value || null,
      fecha_fin: form.fecha_fin.value || null
    });
    if (form.activa.checked) {
      _temporadaActiva = t;
      setTemporadaActiva(t);
    }
    closeModal();
    showToast('Temporada creada');
    _renderTemporadasData();
  } catch (err) {
    showToast('Error: ' + err.message, 'error');
  }
}

async function activarTemporada(id) {
  try {
    const t = await API.put(`/temporadas/${id}`, { activa: true });
    _temporadaActiva = t;
    setTemporadaActiva(t);
    showToast('Temporada activada');
    _renderTemporadasData();
  } catch (err) {
    showToast('Error: ' + err.message, 'error');
  }
}

async function modalEditarTemporada(id) {
  const t = await API.get(`/temporadas/${id}`);
  showModal('Editar Temporada', `
    <form id="frmEditTemp" onsubmit="actualizarTemporada(event, ${id})">
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Nombre</label>
          <input class="form-control" name="nombre" value="${t.nombre}" required />
        </div>
        <div class="form-group">
          <label class="form-label">Año</label>
          <input class="form-control" type="number" name="anio" value="${t.anio}" required />
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Fecha Inicio</label>
          <input class="form-control" type="date" name="fecha_inicio" value="${t.fecha_inicio || ''}" />
        </div>
        <div class="form-group">
          <label class="form-label">Fecha Fin</label>
          <input class="form-control" type="date" name="fecha_fin" value="${t.fecha_fin || ''}" />
        </div>
      </div>
      <div style="display:flex;gap:10px;justify-content:flex-end;margin-top:20px">
        <button type="button" class="btn btn-ghost" onclick="closeModal()">Cancelar</button>
        <button type="submit" class="btn btn-primary">Actualizar</button>
      </div>
    </form>`);
}

async function actualizarTemporada(e, id) {
  e.preventDefault();
  const form = e.target;
  try {
    await API.put(`/temporadas/${id}`, {
      nombre: form.nombre.value, anio: parseInt(form.anio.value),
      fecha_inicio: form.fecha_inicio.value || null,
      fecha_fin: form.fecha_fin.value || null
    });
    closeModal();
    showToast('Temporada actualizada');
    _renderTemporadasData();
  } catch (err) {
    showToast('Error: ' + err.message, 'error');
  }
}

async function eliminarTemporada(id) {
  if (!confirm('¿Eliminar esta temporada? Se perderán TODOS los datos (jugadores, partidos, stats).')) return;
  try {
    await API.del(`/temporadas/${id}`);
    showToast('Temporada eliminada');
    _renderTemporadasData();
  } catch (err) {
    showToast('Error: ' + err.message, 'error');
  }
}
