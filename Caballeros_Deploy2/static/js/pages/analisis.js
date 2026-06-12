async function renderAnalisis() {
  document.getElementById('pageTitle').textContent = 'Análisis IA';
  const content = document.getElementById('pageContent');
  content.innerHTML = loading();

  const t = await getTemporadaActiva();
  if (!t) { content.innerHTML = `<div class="card">${empty('Activa una temporada')}</div>`; return; }

  try {
    const partidos = await API.get(`/partidos/?temporada_id=${t.id}`);
    const partidosConStats = partidos.filter(p => p.num_jugadores_con_stats > 0);

    content.innerHTML = `
      <div class="section-header">
        <h2 class="section-title">Análisis con Inteligencia Artificial</h2>
      </div>

      <div style="background:linear-gradient(135deg,var(--negro-card),var(--gris-oscuro));border:1px solid var(--borde);border-radius:12px;padding:20px;margin-bottom:24px">
        <div style="display:flex;gap:12px;align-items:flex-start">
          <div style="font-size:32px">🤖</div>
          <div>
            <h3 style="font-size:15px;font-weight:700;margin-bottom:6px">Análisis potenciado por Claude</h3>
            <p style="font-size:13px;color:var(--gris-claro);line-height:1.6">
              Genera informes tácticos y estadísticos profesionales después de cada partido o al finalizar la temporada.
              Claude analiza el rendimiento de cada jugador, identifica tendencias y proporciona recomendaciones para el cuerpo técnico.
            </p>
          </div>
        </div>
      </div>

      <div class="grid-2">
        <!-- Análisis por partido -->
        <div class="card">
          <div class="card-header">
            <span class="card-title">📊 Análisis de Partido</span>
          </div>
          ${partidosConStats.length === 0
            ? empty('No hay partidos con estadísticas', 'Captura stats en un partido primero')
            : `<div class="form-group">
                <label class="form-label">Seleccionar Partido</label>
                <select class="form-control" id="selectAnalisisPartido">
                  ${partidosConStats.map(p => `<option value="${p.id}">
                    ${formatDate(p.fecha)} — vs ${p.rival} (${p.puntos_caballeros}–${p.puntos_rival} ${p.resultado === 'V' ? '✓' : '✗'})
                  </option>`).join('')}
                </select>
              </div>
              <button class="btn btn-primary" onclick="generarAnalisisPartido()">
                <svg viewBox="0 0 24 24"><path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/></svg>
                Generar Análisis del Partido
              </button>`
          }
        </div>

        <!-- Análisis de temporada -->
        <div class="card">
          <div class="card-header">
            <span class="card-title">🏆 Análisis de Temporada</span>
          </div>
          <p style="font-size:13px;color:var(--gris-claro);margin-bottom:16px">
            Genera un informe completo de la temporada <strong>${t.nombre}</strong> con tendencias, análisis individual y recomendaciones estratégicas.
          </p>
          <button class="btn btn-primary" onclick="generarAnalisisTemporada(${t.id})">
            <svg viewBox="0 0 24 24"><path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/></svg>
            Generar Análisis de Temporada
          </button>
        </div>
      </div>

      <!-- Resultado del análisis -->
      <div id="analisisOutput" style="margin-top:24px"></div>`;

  } catch (e) {
    content.innerHTML = `<div class="card"><p style="color:var(--rojo)">Error: ${e.message}</p></div>`;
  }
}

async function generarAnalisisPartido() {
  const partidoId = document.getElementById('selectAnalisisPartido')?.value;
  if (!partidoId) { showToast('Selecciona un partido', 'error'); return; }

  const output = document.getElementById('analisisOutput');
  output.innerHTML = `
    <div class="card">
      <div style="text-align:center;padding:40px">
        <div class="spinner"></div>
        <p style="color:var(--gris-claro);margin-top:12px">Claude está analizando el partido...<br><span style="font-size:12px;color:var(--gris)">Esto puede tomar unos segundos</span></p>
      </div>
    </div>`;

  try {
    const analisis = await API.post(`/analisis/partido/${partidoId}`, {});
    renderAnalisisResult(analisis, 'partido');
  } catch (err) {
    output.innerHTML = `<div class="card">
      <div style="padding:20px;color:var(--rojo)">
        <strong>Error:</strong> ${err.message}<br>
        <span style="font-size:12px;color:var(--gris);margin-top:8px;display:block">
          Asegúrate de que la clave ANTHROPIC_API_KEY esté configurada en el archivo .env
        </span>
      </div>
    </div>`;
  }
}

async function generarAnalisisTemporada(temporadaId) {
  const output = document.getElementById('analisisOutput');
  output.innerHTML = `
    <div class="card">
      <div style="text-align:center;padding:40px">
        <div class="spinner"></div>
        <p style="color:var(--gris-claro);margin-top:12px">Claude está analizando la temporada completa...<br><span style="font-size:12px;color:var(--gris)">Esto puede tardar 10-15 segundos</span></p>
      </div>
    </div>`;

  try {
    const analisis = await API.post(`/analisis/temporada/${temporadaId}`, {});
    renderAnalisisResult(analisis, 'temporada');
  } catch (err) {
    output.innerHTML = `<div class="card">
      <div style="padding:20px;color:var(--rojo)">
        <strong>Error:</strong> ${err.message}
      </div>
    </div>`;
  }
}

function renderAnalisisResult(analisis, tipo) {
  const output = document.getElementById('analisisOutput');
  const fecha = new Date(analisis.created_at).toLocaleString('es-MX');
  const icon = tipo === 'partido' ? '📊' : '🏆';
  const label = tipo === 'partido' ? 'Análisis de Partido' : 'Análisis de Temporada';

  // Formatear markdown básico
  let html = analisis.contenido
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/^#{1,3} (.+)$/gm, '<div style="font-size:14px;font-weight:800;color:var(--rojo);margin:12px 0 6px">$1</div>')
    .replace(/^\d+\. /gm, '<br>• ')
    .replace(/^- /gm, '• ')
    .replace(/\n/g, '<br>');

  output.innerHTML = `
    <div class="card">
      <div class="analisis-header">
        <div>
          <div style="font-size:13px;font-weight:700;color:var(--rojo)">${icon} ${label}</div>
          <div class="analisis-meta">Generado el ${fecha} · ${analisis.modelo}</div>
        </div>
        <button class="btn btn-ghost btn-sm" onclick="copiarAnalisis()">
          <svg viewBox="0 0 24 24"><path d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3"/></svg>
          Copiar
        </button>
      </div>
      <div class="analisis-content" id="analisisText">${html}</div>
    </div>`;
}

function copiarAnalisis() {
  const text = document.getElementById('analisisText')?.innerText;
  if (text) {
    navigator.clipboard.writeText(text).then(() => showToast('Análisis copiado'));
  }
}
