async function renderDashboard() {
  document.getElementById('pageTitle').textContent = 'Dashboard';
  const content = document.getElementById('pageContent');
  content.innerHTML = loading('Cargando dashboard...');

  const t = await getTemporadaActiva();
  if (!t) {
    content.innerHTML = `<div class="card" style="text-align:center;padding:60px">
      <h2 style="color:var(--rojo);margin-bottom:12px">¡Bienvenido a Caballeros Stats!</h2>
      <p style="color:var(--gris-claro);margin-bottom:20px">Para comenzar, crea tu primera temporada.</p>
      <button class="btn btn-primary" onclick="navigateTo('temporadas')">
        <svg viewBox="0 0 24 24"><path d="M12 4v16m8-8H4"/></svg>
        Crear Temporada
      </button>
    </div>`;
    return;
  }

  try {
    const [resumen, jugadores] = await Promise.all([
      API.get(`/partidos/resumen-temporada/${t.id}`),
      API.get(`/jugadores/?temporada_id=${t.id}`)
    ]);

    const { total_partidos, victorias, derrotas, pct_victorias,
            puntos_favor_promedio, puntos_contra_promedio, diferencial } = resumen;

    // Top scorers
    const jugadoresConStats = [];
    for (const j of jugadores) {
      try {
        const d = await API.get(`/jugadores/${j.id}/promedios`);
        if (d.partidos > 0) jugadoresConStats.push(d);
      } catch {}
    }
    jugadoresConStats.sort((a, b) => (b.promedios.puntos || 0) - (a.promedios.puntos || 0));
    const top5 = jugadoresConStats.slice(0, 5);

    // Últimos partidos
    const partidos = await API.get(`/partidos/?temporada_id=${t.id}`);
    const ultimos = partidos.slice(0, 5);

    content.innerHTML = `
      <!-- Stat Cards -->
      <div class="stat-grid">
        <div class="stat-card">
          <div class="stat-card-label">Récord</div>
          <div style="display:flex;align-items:baseline;gap:6px">
            <span class="stat-card-value" style="color:#27AE60">${victorias}</span>
            <span style="color:var(--gris);font-size:20px;font-weight:700">–</span>
            <span class="stat-card-value" style="color:var(--rojo)">${derrotas}</span>
          </div>
          <div class="stat-card-sub">${pct_victorias}% victorias</div>
        </div>
        <div class="stat-card">
          <div class="stat-card-label">Partidos</div>
          <div class="stat-card-value">${total_partidos}</div>
          <div class="stat-card-sub">${t.fase || 'Temporada regular'}</div>
        </div>
        <div class="stat-card">
          <div class="stat-card-label">Pts Favor Prom</div>
          <div class="stat-card-value">${puntos_favor_promedio}</div>
          <div class="stat-card-sub">por partido</div>
        </div>
        <div class="stat-card">
          <div class="stat-card-label">Pts Contra Prom</div>
          <div class="stat-card-value" style="color:var(--gris-claro)">${puntos_contra_promedio}</div>
          <div class="stat-card-sub">diferencial: ${diferencial > 0 ? '+' : ''}${diferencial}</div>
        </div>
        <div class="stat-card">
          <div class="stat-card-label">Jugadores</div>
          <div class="stat-card-value">${jugadores.length}</div>
          <div class="stat-card-sub">en plantilla</div>
        </div>
      </div>

      <div class="grid-2">
        <!-- Top Anotadores -->
        <div class="card">
          <div class="card-header">
            <span class="card-title">🏆 Top Anotadores</span>
            <button class="btn btn-ghost btn-sm" onclick="navigateTo('estadisticas')">Ver todo</button>
          </div>
          ${top5.length === 0 ? empty('Sin estadísticas aún') : `
          <div class="table-wrap">
            <table>
              <thead><tr>
                <th>#</th><th>Jugador</th><th class="center">PTS</th>
                <th class="center">REB</th><th class="center">AST</th><th class="center">EFF</th><th class="center">CAL</th>
              </tr></thead>
              <tbody>
                ${top5.map((d, i) => `<tr>
                  <td style="color:var(--gris);font-weight:700">${i + 1}</td>
                  <td>
                    <div class="td-name">${d.jugador.nombre}</div>
                    <div style="font-size:10px;color:var(--gris)">${d.jugador.posicion} · #${d.jugador.numero}</div>
                  </td>
                  <td class="center" style="font-weight:800;color:var(--rojo);font-size:15px">${d.promedios.puntos}</td>
                  <td class="center">${d.promedios.rebotes_totales}</td>
                  <td class="center">${d.promedios.asistencias}</td>
                  <td class="center">${d.promedios.eficiencia}</td>
                  <td class="center">${calBadge(d.calificacion_promedio)}</td>
                </tr>`).join('')}
              </tbody>
            </table>
          </div>`}
        </div>

        <!-- Últimos partidos -->
        <div class="card">
          <div class="card-header">
            <span class="card-title">📅 Últimos Partidos</span>
            <button class="btn btn-ghost btn-sm" onclick="navigateTo('partidos')">Ver todo</button>
          </div>
          ${ultimos.length === 0 ? empty('No hay partidos registrados') : `
          <div style="display:flex;flex-direction:column;gap:8px">
            ${ultimos.map(p => `
              <div style="display:flex;align-items:center;justify-content:space-between;padding:10px 12px;background:var(--gris-oscuro);border-radius:8px;cursor:pointer"
                   onclick="navigateTo('partidos')">
                <div>
                  <div style="font-weight:600;font-size:13px">vs ${p.rival}</div>
                  <div style="font-size:11px;color:var(--gris)">${formatDate(p.fecha)} · ${p.fase} · ${p.es_local ? 'L' : 'V'}</div>
                </div>
                <div style="display:flex;align-items:center;gap:10px">
                  <span style="font-weight:800;font-size:15px">${p.puntos_caballeros}–${p.puntos_rival}</span>
                  ${resBadge(p.resultado)}
                </div>
              </div>`).join('')}
          </div>`}
        </div>
      </div>

      <!-- Acciones rápidas -->
      <div class="card" style="margin-top:20px">
        <div class="card-header"><span class="card-title">⚡ Acciones Rápidas</span></div>
        <div style="display:flex;gap:12px;flex-wrap:wrap">
          <button class="btn btn-primary" onclick="navigateTo('captura')">
            <svg viewBox="0 0 24 24"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/></svg>
            Capturar Stats
          </button>
          <button class="btn btn-secondary" onclick="modalNuevoPartido()">
            <svg viewBox="0 0 24 24"><path d="M12 4v16m8-8H4"/></svg>
            Nuevo Partido
          </button>
          <button class="btn btn-secondary" onclick="navigateTo('analisis')">
            <svg viewBox="0 0 24 24"><path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/></svg>
            Análisis IA
          </button>
          <a class="btn btn-ghost" href="/api/reportes/temporada/${t.id}" target="_blank">
            <svg viewBox="0 0 24 24"><path d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"/></svg>
            Reporte Temporada PDF
          </a>
        </div>
      </div>`;

  } catch (e) {
    content.innerHTML = `<div class="card"><p style="color:var(--rojo)">Error: ${e.message}</p></div>`;
  }
}
