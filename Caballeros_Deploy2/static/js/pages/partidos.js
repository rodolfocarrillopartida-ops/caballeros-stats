async function renderPartidos() {
  document.getElementById('pageTitle').textContent = 'Partidos';
  const content = document.getElementById('pageContent');
  content.innerHTML = loading();

  const t = await getTemporadaActiva();
  if (!t) { content.innerHTML = `<div class="card">${empty('Activa una temporada')}</div>`; return; }

  await _renderPartidosData(t.id);
}

async function _renderPartidosData(temporadaId) {
  const content = document.getElementById('pageContent');
  try {
    const [partidos, resumen] = await Promise.all([
      API.get(`/partidos/?temporada_id=${temporadaId}`),
      API.get(`/partidos/resumen-temporada/${temporadaId}`)
    ]);

    const { victorias, derrotas, total_partidos, puntos_favor_promedio, puntos_contra_promedio } = resumen;

    content.innerHTML = `
      <div class="section-header">
        <div style="display:flex;align-items:center;gap:16px">
          <h2 class="section-title">Partidos</h2>
          <div class="record-display">
            <span class="record-v">${victorias}</span>
            <span class="record-dash">–</span>
            <span class="record-l">${derrotas}</span>
          </div>
        </div>
        <button class="btn btn-primary" onclick="modalNuevoPartido()">
          <svg viewBox="0 0 24 24"><path d="M12 4v16m8-8H4"/></svg>
          Nuevo Partido
        </button>
      </div>

      <div class="card" style="margin-bottom:20px">
        <div style="display:flex;gap:24px;flex-wrap:wrap">
          <div><span style="font-size:11px;color:var(--gris-claro)">PJ</span><div style="font-size:22px;font-weight:800">${total_partidos}</div></div>
          <div><span style="font-size:11px;color:var(--gris-claro)">% Victoria</span><div style="font-size:22px;font-weight:800;color:var(--rojo)">${resumen.pct_victorias}%</div></div>
          <div><span style="font-size:11px;color:var(--gris-claro)">Pts Favor</span><div style="font-size:22px;font-weight:800;color:#27AE60">${puntos_favor_promedio}</div></div>
          <div><span style="font-size:11px;color:var(--gris-claro)">Pts Contra</span><div style="font-size:22px;font-weight:800">${puntos_contra_promedio}</div></div>
        </div>
      </div>

      <div class="card">
        <div class="table-wrap">
          <table>
            <thead><tr>
              <th>Fecha</th><th>Rival</th><th class="center">Sede</th>
              <th class="center">Marcador</th><th class="center">Resultado</th>
              <th class="center">Fase</th><th class="center">Stats</th><th class="center">Acciones</th>
            </tr></thead>
            <tbody>
              ${partidos.length === 0 ? `<tr><td colspan="8" style="text-align:center;padding:40px;color:var(--gris)">No hay partidos. ¡Registra el primero!</td></tr>` :
              partidos.map(p => `<tr>
                <td style="white-space:nowrap">${formatDate(p.fecha)}</td>
                <td class="td-name">${p.rival}</td>
                <td class="center"><span style="font-size:11px;color:var(--gris-claro)">${p.es_local ? '🏠 Local' : '✈️ Visita'}</span></td>
                <td class="center"><span style="font-weight:800;font-size:15px">${p.puntos_caballeros}–${p.puntos_rival}</span></td>
                <td class="center">${resBadge(p.resultado)}</td>
                <td class="center"><span style="font-size:11px;color:var(--gris-claro)">${p.fase}</span></td>
                <td class="center">
                  <span style="font-size:11px;color:${p.num_jugadores_con_stats > 0 ? '#27AE60' : 'var(--gris)'}">
                    ${p.num_jugadores_con_stats > 0 ? `✓ ${p.num_jugadores_con_stats} jug.` : '—'}
                  </span>
                </td>
                <td class="center">
                  <div style="display:flex;gap:4px;justify-content:center;flex-wrap:wrap">
                    <button class="btn btn-primary btn-sm" onclick="irCaptura(${p.id})">Stats</button>
                    <a class="btn btn-ghost btn-sm" href="/api/reportes/partido/${p.id}" target="_blank">PDF</a>
                    <button class="btn btn-ghost btn-sm" onclick="modalEditarPartido(${p.id})">✎</button>
                    <button class="btn btn-danger btn-sm" onclick="eliminarPartido(${p.id})">✕</button>
                  </div>
                </td>
              </tr>`).join('')}
            </tbody>
          </table>
        </div>
      </div>`;

  } catch (e) {
    content.innerHTML = `<div class="card"><p style="color:var(--rojo)">Error: ${e.message}</p></div>`;
  }
}

function irCaptura(partidoId) {
  _capturaPartidoId = partidoId;
  navigateTo('captura');
}

function modalNuevoPartido() {
  const hoy = new Date().toISOString().split('T')[0];
  showModal('Nuevo Partido', `
    <form id="frmPartido" onsubmit="guardarPartido(event)">
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Rival</label>
          <input class="form-control" name="rival" required placeholder="Ej: Soles de Culiacán" />
        </div>
        <div class="form-group">
          <label class="form-label">Fecha</label>
          <input class="form-control" type="date" name="fecha" value="${hoy}" required />
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Sede</label>
          <select class="form-control" name="es_local">
            <option value="true">Local 🏠</option>
            <option value="false">Visitante ✈️</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Fase</label>
          <select class="form-control" name="fase">
            <option>Regular</option>
            <option>Playoffs</option>
            <option>Semifinal</option>
            <option>Final</option>
          </select>
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Puntos Caballeros</label>
          <input class="form-control" type="number" name="pts_caballeros" min="0" value="0" />
        </div>
        <div class="form-group">
          <label class="form-label">Puntos Rival</label>
          <input class="form-control" type="number" name="pts_rival" min="0" value="0" />
        </div>
      </div>
      <div style="display:flex;gap:10px;justify-content:flex-end;margin-top:20px">
        <button type="button" class="btn btn-ghost" onclick="closeModal()">Cancelar</button>
        <button type="submit" class="btn btn-primary">Crear Partido</button>
      </div>
    </form>`);
}

async function guardarPartido(e) {
  e.preventDefault();
  const t = await getTemporadaActiva();
  if (!t) { showToast('No hay temporada activa', 'error'); return; }
  const form = e.target;
  try {
    const partido = await API.post('/partidos/', {
      temporada_id: t.id,
      rival: form.rival.value.trim(),
      fecha: form.fecha.value,
      es_local: form.es_local.value === 'true',
      fase: form.fase.value,
      puntos_caballeros: parseInt(form.pts_caballeros.value) || 0,
      puntos_rival: parseInt(form.pts_rival.value) || 0
    });
    closeModal();
    showToast('Partido creado');
    _renderPartidosData(t.id);
  } catch (err) {
    showToast('Error: ' + err.message, 'error');
  }
}

async function modalEditarPartido(id) {
  const p = await API.get(`/partidos/${id}`);
  showModal('Editar Partido', `
    <form id="frmEditPartido" onsubmit="actualizarPartido(event, ${id})">
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Rival</label>
          <input class="form-control" name="rival" value="${p.rival}" required />
        </div>
        <div class="form-group">
          <label class="form-label">Fecha</label>
          <input class="form-control" type="date" name="fecha" value="${p.fecha}" required />
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Sede</label>
          <select class="form-control" name="es_local">
            <option value="true" ${p.es_local?'selected':''}>Local</option>
            <option value="false" ${!p.es_local?'selected':''}>Visitante</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Fase</label>
          <select class="form-control" name="fase">
            ${['Regular','Playoffs','Semifinal','Final'].map(f=>`<option ${f===p.fase?'selected':''}>${f}</option>`).join('')}
          </select>
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Pts Caballeros</label>
          <input class="form-control" type="number" name="pts_caballeros" value="${p.puntos_caballeros}" min="0" />
        </div>
        <div class="form-group">
          <label class="form-label">Pts Rival</label>
          <input class="form-control" type="number" name="pts_rival" value="${p.puntos_rival}" min="0" />
        </div>
      </div>
      <div style="display:flex;gap:10px;justify-content:flex-end;margin-top:20px">
        <button type="button" class="btn btn-ghost" onclick="closeModal()">Cancelar</button>
        <button type="submit" class="btn btn-primary">Actualizar</button>
      </div>
    </form>`);
}

async function actualizarPartido(e, id) {
  e.preventDefault();
  const form = e.target;
  const t = await getTemporadaActiva();
  try {
    await API.put(`/partidos/${id}`, {
      rival: form.rival.value, fecha: form.fecha.value,
      es_local: form.es_local.value === 'true', fase: form.fase.value,
      puntos_caballeros: parseInt(form.pts_caballeros.value) || 0,
      puntos_rival: parseInt(form.pts_rival.value) || 0
    });
    closeModal();
    showToast('Partido actualizado');
    t && _renderPartidosData(t.id);
  } catch (err) { showToast('Error: ' + err.message, 'error'); }
}

async function eliminarPartido(id) {
  if (!confirm('¿Eliminar este partido y todas sus estadísticas?')) return;
  const t = await getTemporadaActiva();
  try {
    await API.del(`/partidos/${id}`);
    showToast('Partido eliminado');
    t && _renderPartidosData(t.id);
  } catch (err) { showToast('Error: ' + err.message, 'error'); }
}
