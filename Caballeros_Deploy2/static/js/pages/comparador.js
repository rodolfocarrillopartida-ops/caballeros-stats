async function renderComparador() {
  document.getElementById('pageTitle').textContent = 'Comparador';
  const content = document.getElementById('pageContent');
  content.innerHTML = loading();

  const t = await getTemporadaActiva();
  if (!t) { content.innerHTML = `<div class="card">${empty('Activa una temporada')}</div>`; return; }

  try {
    const jugadores = await API.get(`/jugadores/?temporada_id=${t.id}`);

    content.innerHTML = `
      <div class="section-header">
        <h2 class="section-title">Comparador Cara a Cara</h2>
      </div>

      <div class="card" style="margin-bottom:20px">
        <div class="form-row">
          <div class="form-group" style="margin:0">
            <label class="form-label">Jugador 1</label>
            <select class="form-control" id="selJ1">
              <option value="">Seleccionar...</option>
              ${jugadores.map(j => `<option value="${j.id}">#${j.numero} ${j.nombre} (${j.posicion})</option>`).join('')}
            </select>
          </div>
          <div class="form-group" style="margin:0">
            <label class="form-label">Jugador 2</label>
            <select class="form-control" id="selJ2">
              <option value="">Seleccionar...</option>
              ${jugadores.map(j => `<option value="${j.id}">#${j.numero} ${j.nombre} (${j.posicion})</option>`).join('')}
            </select>
          </div>
        </div>
        <div style="margin-top:12px">
          <button class="btn btn-primary" onclick="ejecutarComparacion()">
            <svg viewBox="0 0 24 24"><path d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"/></svg>
            Comparar
          </button>
        </div>
      </div>

      <div id="comparacionResult"></div>`;

  } catch (e) {
    content.innerHTML = `<div class="card"><p style="color:var(--rojo)">Error: ${e.message}</p></div>`;
  }
}

async function ejecutarComparacion() {
  const j1 = document.getElementById('selJ1').value;
  const j2 = document.getElementById('selJ2').value;
  const result = document.getElementById('comparacionResult');

  if (!j1 || !j2) { showToast('Selecciona dos jugadores', 'error'); return; }
  if (j1 === j2) { showToast('Selecciona jugadores diferentes', 'error'); return; }

  result.innerHTML = loading('Comparando...');

  try {
    const data = await API.get(`/jugadores/comparar?j1=${j1}&j2=${j2}`);
    const { jugador1: d1, jugador2: d2 } = data;

    if (!d1.partidos || !d2.partidos) {
      result.innerHTML = `<div class="card">${empty('Uno o ambos jugadores no tienen estadísticas')}</div>`;
      return;
    }

    const stats = [
      { key: 'puntos', label: 'Puntos por partido' },
      { key: 'rebotes', label: 'Rebotes por partido' },
      { key: 'asistencias', label: 'Asistencias por partido' },
      { key: 'robos', label: 'Robos por partido' },
      { key: 'bloqueos', label: 'Bloqueos por partido' },
      { key: 'perdidas', label: 'Pérdidas por partido', invert: true },
      { key: 'faltas', label: 'Faltas por partido', invert: true },
      { key: 'pct_tc', label: '% Tiro de campo' },
      { key: 'pct_3p', label: '% Triples' },
      { key: 'pct_tl', label: '% Tiros libres' },
      { key: 'eficiencia', label: 'Eficiencia' },
    ];

    const p1 = d1.promedios, p2 = d2.promedios;

    const rows = stats.map(stat => {
      const v1 = parseFloat(p1[stat.key] || 0);
      const v2 = parseFloat(p2[stat.key] || 0);
      const w1 = stat.invert ? v1 < v2 : v1 > v2;
      const w2 = stat.invert ? v2 < v1 : v2 > v1;
      return `
        <div class="comparador-grid" style="padding:4px 0;border-bottom:1px solid var(--borde)">
          <div class="comp-val ${w1 ? 'winner' : ''}">${v1}</div>
          <div class="comp-stat-name">${stat.label}</div>
          <div class="comp-val ${w2 ? 'winner' : ''}">${v2}</div>
        </div>`;
    });

    // Score general
    let score1 = 0, score2 = 0;
    stats.forEach(stat => {
      const v1 = parseFloat(p1[stat.key] || 0);
      const v2 = parseFloat(p2[stat.key] || 0);
      if (stat.invert) { if (v1 < v2) score1++; else if (v2 < v1) score2++; }
      else { if (v1 > v2) score1++; else if (v2 > v1) score2++; }
    });

    result.innerHTML = `
      <div class="card">
        <!-- Cabeceras de jugadores -->
        <div class="comparador-grid" style="margin-bottom:16px">
          <div class="comp-jugador-card">
            <div style="font-size:28px;font-weight:900;color:var(--rojo)">#${d1.jugador.numero}</div>
            <div class="comp-jugador-name">${d1.jugador.nombre}</div>
            <div class="comp-jugador-info">${d1.jugador.posicion} · ${d1.partidos} partidos</div>
          </div>
          <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px">
            <div style="font-size:11px;color:var(--gris);text-transform:uppercase">VS</div>
            <div style="font-size:22px;font-weight:900;color:var(--rojo)">${score1}</div>
            <div style="font-size:11px;color:var(--gris)">–</div>
            <div style="font-size:22px;font-weight:900">${score2}</div>
          </div>
          <div class="comp-jugador-card">
            <div style="font-size:28px;font-weight:900;color:var(--rojo)">#${d2.jugador.numero}</div>
            <div class="comp-jugador-name">${d2.jugador.nombre}</div>
            <div class="comp-jugador-info">${d2.jugador.posicion} · ${d2.partidos} partidos</div>
          </div>
        </div>

        <!-- Stats comparación -->
        <div class="comparador-grid" style="padding:4px 0;margin-bottom:4px">
          <div class="comp-label">Jugador 1</div>
          <div class="comp-label">Estadística</div>
          <div class="comp-label">Jugador 2</div>
        </div>
        ${rows.join('')}

        <!-- Veredicto -->
        <div style="margin-top:20px;text-align:center;padding:16px;background:var(--gris-oscuro);border-radius:10px">
          ${score1 > score2
            ? `<div style="font-size:14px;font-weight:700;color:var(--rojo)">🏆 ${d1.jugador.nombre} gana el comparativo ${score1}–${score2}</div>`
            : score2 > score1
            ? `<div style="font-size:14px;font-weight:700;color:var(--rojo)">🏆 ${d2.jugador.nombre} gana el comparativo ${score2}–${score1}</div>`
            : `<div style="font-size:14px;font-weight:700;color:var(--gris-claro)">🤝 Empate ${score1}–${score2}</div>`
          }
        </div>
      </div>`;

  } catch (e) {
    result.innerHTML = `<div class="card"><p style="color:var(--rojo)">Error: ${e.message}</p></div>`;
  }
}
