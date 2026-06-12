async function renderPlantilla() {
  document.getElementById('pageTitle').textContent = 'Plantilla';
  const content = document.getElementById('pageContent');
  content.innerHTML = loading();

  const t = await getTemporadaActiva();
  if (!t) { content.innerHTML = `<div class="card">${empty('Selecciona una temporada', 'Ve a Temporadas y activa una')}</div>`; return; }

  await _renderPlantillaData(t.id);
}

async function _renderPlantillaData(temporadaId) {
  const content = document.getElementById('pageContent');
  try {
    const jugadores = await API.get(`/jugadores/?temporada_id=${temporadaId}`);

    const posiciones = ['Base', 'Escolta', 'Alero', 'Ala-Pívot', 'Pívot'];

    content.innerHTML = `
      <div class="section-header">
        <h2 class="section-title">Plantilla — ${jugadores.length} jugadores</h2>
        <button class="btn btn-primary" onclick="modalNuevoJugador(${temporadaId})">
          <svg viewBox="0 0 24 24"><path d="M12 4v16m8-8H4"/></svg>
          Agregar Jugador
        </button>
      </div>

      ${posiciones.map(pos => {
        const grupo = jugadores.filter(j => j.posicion === pos);
        if (grupo.length === 0) return '';
        return `
          <div class="card" style="margin-bottom:16px">
            <div class="card-header">
              <span class="card-title">${posBadge(pos)} ${pos}s</span>
              <span style="font-size:12px;color:var(--gris)">${grupo.length} jugador${grupo.length > 1 ? 'es' : ''}</span>
            </div>
            <div class="table-wrap">
              <table>
                <thead><tr>
                  <th>#</th><th>Nombre</th><th class="center">Estado</th>
                  <th class="center">Acciones</th>
                </tr></thead>
                <tbody>
                  ${grupo.map(j => `<tr>
                    <td class="td-num">${j.numero}</td>
                    <td class="td-name">${j.nombre}</td>
                    <td class="center">
                      <span style="font-size:12px;color:${j.activo ? '#27AE60' : 'var(--gris)'}">
                        ${j.activo ? '● Activo' : '○ Inactivo'}
                      </span>
                    </td>
                    <td class="center">
                      <div style="display:flex;gap:6px;justify-content:center">
                        <button class="btn btn-ghost btn-sm" onclick="modalEditarJugador(${j.id})">Editar</button>
                        <button class="btn btn-danger btn-sm" onclick="eliminarJugador(${j.id})">Eliminar</button>
                      </div>
                    </td>
                  </tr>`).join('')}
                </tbody>
              </table>
            </div>
          </div>`;
      }).join('')}

      ${jugadores.length === 0 ? `<div class="card">${empty('No hay jugadores en esta temporada', 'Agrega jugadores usando el botón de arriba')}</div>` : ''}`;

  } catch (e) {
    content.innerHTML = `<div class="card"><p style="color:var(--rojo)">Error: ${e.message}</p></div>`;
  }
}

function modalNuevoJugador(temporadaId) {
  showModal('Nuevo Jugador', `
    <form id="frmJugador" onsubmit="guardarJugador(event, ${temporadaId})">
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Nombre completo</label>
          <input class="form-control" name="nombre" required placeholder="Ej: Carlos López" />
        </div>
        <div class="form-group">
          <label class="form-label">Número de camiseta</label>
          <input class="form-control" type="number" name="numero" min="0" max="99" required placeholder="23" />
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">Posición</label>
        <select class="form-control" name="posicion" required>
          <option value="">Seleccionar...</option>
          <option>Base</option>
          <option>Escolta</option>
          <option>Alero</option>
          <option>Ala-Pívot</option>
          <option>Pívot</option>
        </select>
      </div>
      <div style="display:flex;gap:10px;justify-content:flex-end;margin-top:20px">
        <button type="button" class="btn btn-ghost" onclick="closeModal()">Cancelar</button>
        <button type="submit" class="btn btn-primary">Guardar</button>
      </div>
    </form>`);
}

async function guardarJugador(e, temporadaId) {
  e.preventDefault();
  const form = e.target;
  const data = {
    temporada_id: temporadaId,
    nombre: form.nombre.value.trim(),
    numero: parseInt(form.numero.value),
    posicion: form.posicion.value
  };
  try {
    await API.post('/jugadores/', data);
    closeModal();
    showToast('Jugador agregado');
    _temporadaActiva && _renderPlantillaData(_temporadaActiva.id);
  } catch (err) {
    showToast('Error: ' + err.message, 'error');
  }
}

async function modalEditarJugador(id) {
  const j = await API.get(`/jugadores/${id}`);
  showModal('Editar Jugador', `
    <form id="frmEditJugador" onsubmit="actualizarJugador(event, ${id})">
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Nombre</label>
          <input class="form-control" name="nombre" value="${j.nombre}" required />
        </div>
        <div class="form-group">
          <label class="form-label">Número</label>
          <input class="form-control" type="number" name="numero" value="${j.numero}" min="0" max="99" required />
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Posición</label>
          <select class="form-control" name="posicion" required>
            ${['Base','Escolta','Alero','Ala-Pívot','Pívot'].map(p => `<option ${p===j.posicion?'selected':''}>${p}</option>`).join('')}
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Estado</label>
          <select class="form-control" name="activo">
            <option value="true" ${j.activo?'selected':''}>Activo</option>
            <option value="false" ${!j.activo?'selected':''}>Inactivo</option>
          </select>
        </div>
      </div>
      <div style="display:flex;gap:10px;justify-content:flex-end;margin-top:20px">
        <button type="button" class="btn btn-ghost" onclick="closeModal()">Cancelar</button>
        <button type="submit" class="btn btn-primary">Actualizar</button>
      </div>
    </form>`);
}

async function actualizarJugador(e, id) {
  e.preventDefault();
  const form = e.target;
  try {
    await API.put(`/jugadores/${id}`, {
      nombre: form.nombre.value.trim(),
      numero: parseInt(form.numero.value),
      posicion: form.posicion.value,
      activo: form.activo.value === 'true'
    });
    closeModal();
    showToast('Jugador actualizado');
    _temporadaActiva && _renderPlantillaData(_temporadaActiva.id);
  } catch (err) {
    showToast('Error: ' + err.message, 'error');
  }
}

async function eliminarJugador(id) {
  if (!confirm('¿Eliminar este jugador? Se perderán todas sus estadísticas.')) return;
  try {
    await API.del(`/jugadores/${id}`);
    showToast('Jugador eliminado');
    _temporadaActiva && _renderPlantillaData(_temporadaActiva.id);
  } catch (err) {
    showToast('Error: ' + err.message, 'error');
  }
}
