async function renderEstadisticas() {
  document.getElementById('pageTitle').textContent = 'Estadísticas';
  const content = document.getElementById('pageContent');
  content.innerHTML = loading();

  const t = await getTemporadaActiva();
  if (!t) { content.innerHTML = `<div class="card">${empty('Activa una temporada')}</div>`; return; }

  try {
    const jugadores = await API.get(`/jugadores/?temporada_id=${t.id}`);
    const statsPromises = jugadores.map(j => API.get(`/jugadores/${j.id}/promedios`).catch(() => null));
    const allStats = (await Promise.all(statsPromises)).filter(d => d && d.partidos > 0);
    allStats.sort((a, b) => b.promedios.puntos - a.promedios.puntos);

    const categorias = [
      { key: 'puntos', label: 'Puntos', icon: '🏀' },
      { key: 'rebotes_totales', label: 'Rebotes', icon: '💪' },
      { key: 'asistencias', label: 'Asistencias', icon: '🤝' },
      { key: 'robos', label: 'Robos', icon: '⚡' },
      { key: 'bloqueos', label: 'Bloqueos', icon: '🛡️' },
      { key: 'eficiencia', label: 'Eficiencia', icon: '📊' },
    ];

    content.innerHTML = `
      <div class="section-header">
        <h2 class="section-title">Estadísticas — ${t.nombre}</h2>
        <a class="btn btn-ghost" href="/api/reportes/temporada/${t.id}" target="_blank">
          <svg viewBox="0 0 24 24"><path d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
          Exportar PDF
        </a>
      </div>

      <!-- Líderes por categoría -->
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:16px;margin-bottom:24px">
        ${categorias.map(cat => {
          const sorted = [...allStats].sort((a, b) => (b.promedios[cat.key]||0) - (a.promedios[cat.key]||0));
          const top3 = sorted.slice(0, 3);
          return `<div class="card">
            <div class="card-title" style="margin-bottom:12px">${cat.icon} ${cat.label}</div>
            ${top3.map((d, i) => `
              <div style="display:flex;align-items:center;gap:10px;padding:6px 0;border-bottom:1px solid var(--borde)">
                <span style="color:${i===0?'var(--rojo)':'var(--gris)'};font-weight:800;font-size:${i===0?'18':'13'}px;width:24px;text-align:center">${i+1}</span>
                <div style="flex:1">
                  <div style="font-weight:600;font-size:13px">${d.jugador.nombre.split(' ').slice(0,2).join(' ')}</div>
                  <div style="font-size:10px;color:var(--gris)">${d.jugador.posicion} · #${d.jugador.numero}</div>
                </div>
                <span style="font-weight:800;font-size:${i===0?'22':'16'}px;color:${i===0?'var(--rojo)':'var(--text)'}">${d.promedios[cat.key]}</span>
              </div>`).join('')}
          </div>`;
        }).join('')}
      </div>

      <!-- Tabla completa -->
      <div class="card">
        <div class="card-header">
          <span class="card-title">Promedios por Partido — Temporada Completa</span>
          <span style="font-size:12px;color:var(--gris)">${allStats.length} jugadores con stats</span>
        </div>
        <div class="table-wrap">
          <table>
            <thead><tr>
              <th>#</th><th>Jugador</th><th>Pos</th><th class="center">PJ</th>
              <th class="center" style="color:var(--rojo)">PTS</th>
              <th class="center">REB</th><th class="center">AST</th>
              <th class="center">ROB</th><th class="center">BLQ</th><th class="center">PÉR</th>
              <th class="center">%TC</th><th class="center">%3P</th><th class="center">%TL</th>
              <th class="center">EFF</th><th class="center">CAL</th><th></th>
            </tr></thead>
            <tbody>
              ${allStats.length === 0 ? `<tr><td colspan="16" style="text-align:center;padding:30px;color:var(--gris)">Sin estadísticas registradas</td></tr>` :
              allStats.map((d, i) => `<tr>
                <td style="color:var(--gris);font-weight:700">${i+1}</td>
                <td>
                  <div class="td-name">${d.jugador.nombre}</div>
                </td>
                <td>${posBadge(d.jugador.posicion)}</td>
                <td class="center">${d.partidos}</td>
                <td class="center" style="font-weight:800;color:var(--rojo);font-size:15px">${d.promedios.puntos}</td>
                <td class="center">${d.promedios.rebotes_totales}</td>
                <td class="center">${d.promedios.asistencias}</td>
                <td class="center">${d.promedios.robos}</td>
                <td class="center">${d.promedios.bloqueos}</td>
                <td class="center">${d.promedios.perdidas}</td>
                <td class="center">${d.promedios.porcentaje_tc}%</td>
                <td class="center">${d.promedios.porcentaje_3p}%</td>
                <td class="center">${d.promedios.porcentaje_tl}%</td>
                <td class="center" style="font-weight:700">${d.promedios.eficiencia}</td>
                <td class="center">${calBadge(d.calificacion_promedio)}</td>
                <td><button class="btn btn-ghost btn-sm" onclick="verDetalleJugador(${d.jugador.id})">Detalle</button></td>
              </tr>`).join('')}
            </tbody>
          </table>
        </div>
      </div>`;

  } catch (e) {
    content.innerHTML = `<div class="card"><p style="color:var(--rojo)">Error: ${e.message}</p></div>`;
  }
}

async function verDetalleJugador(id) {
  try {
    const d = await API.get(`/jugadores/${id}/promedios`);
    const j = d.jugador;
    showModal(`${j.nombre} — Detalle`, `
      <div style="text-align:center;margin-bottom:16px">
        <div style="font-size:14px;color:var(--gris-claro)">${j.posicion} · #${j.numero}</div>
        <div style="font-size:28px;font-weight:900;color:var(--rojo)">${d.promedios.puntos} <span style="font-size:13px;font-weight:400;color:var(--gris)">pts/partido</span></div>
        <div>${calBadge(d.calificacion_promedio)} <span style="font-size:12px;color:var(--gris);margin-left:8px">Calificación promedio · ${d.partidos} partidos</span></div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;margin-bottom:16px">
        ${[
          ['Puntos', d.promedios.puntos],
          ['Rebotes', d.promedios.rebotes_totales],
          ['Asistencias', d.promedios.asistencias],
          ['Robos', d.promedios.robos],
          ['Bloqueos', d.promedios.bloqueos],
          ['Pérdidas', d.promedios.perdidas],
          ['Eficiencia', d.promedios.eficiencia],
          ['% TC', d.promedios.porcentaje_tc + '%'],
          ['% TL', d.promedios.porcentaje_tl + '%'],
        ].map(([l, v]) => `
          <div style="background:var(--gris-oscuro);border-radius:8px;padding:10px;text-align:center">
            <div style="font-size:10px;color:var(--gris-claro);text-transform:uppercase;margin-bottom:4px">${l}</div>
            <div style="font-size:20px;font-weight:800">${v}</div>
          </div>`).join('')}
      </div>
      <h4 style="margin-bottom:10px;color:var(--gris-claro);font-size:12px;text-transform:uppercase">Historial partido a partido</h4>
      <div style="max-height:200px;overflow-y:auto">
        <table style="font-size:12px;width:100%">
          <thead><tr>
            <th style="text-align:left;padding:4px 8px;background:var(--gris-oscuro)">Partido</th>
            <th class="center" style="padding:4px 6px;background:var(--gris-oscuro)">PTS</th>
            <th class="center" style="padding:4px 6px;background:var(--gris-oscuro)">REB</th>
            <th class="center" style="padding:4px 6px;background:var(--gris-oscuro)">AST</th>
            <th class="center" style="padding:4px 6px;background:var(--gris-oscuro)">EFF</th>
            <th class="center" style="padding:4px 6px;background:var(--gris-oscuro)">CAL</th>
          </tr></thead>
          <tbody>
            ${d.historial.map((s, i) => `<tr style="border-bottom:1px solid var(--borde)">
              <td style="padding:5px 8px;color:var(--gris)">P${i+1}</td>
              <td class="center" style="padding:5px 6px;font-weight:700">${s.puntos}</td>
              <td class="center" style="padding:5px 6px">${s.rebotes_totales}</td>
              <td class="center" style="padding:5px 6px">${s.asistencias}</td>
              <td class="center" style="padding:5px 6px">${s.eficiencia?.toFixed(0)}</td>
              <td class="center" style="padding:5px 6px">${calBadge(s.calificacion)}</td>
            </tr>`).join('')}
          </tbody>
        </table>
      </div>`, 'modal-lg');
  } catch (err) {
    showToast('Error: ' + err.message, 'error');
  }
}
