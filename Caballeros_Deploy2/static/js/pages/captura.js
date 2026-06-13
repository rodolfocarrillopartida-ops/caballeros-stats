let _capturaPartidoId = null;

async function renderCaptura() {
  document.getElementById('pageTitle').textContent = 'Captura de Stats';
  const content = document.getElementById('pageContent');
  content.innerHTML = loading();

  const t = await getTemporadaActiva();
  if (!t) { content.innerHTML = `<div class="card">${empty('Activa una temporada')}</div>`; return; }

  try {
    const partidos = await API.get(`/partidos/?temporada_id=${t.id}`);
    const jugadores = await API.get(`/jugadores/?temporada_id=${t.id}&activos=true`);

    if (partidos.length === 0) {
      content.innerHTML = `<div class="card">${empty('No hay partidos', 'Crea un partido primero')}</div>`;
      return;
    }

    const selPartidoId = _capturaPartidoId || partidos[0].id;

    content.innerHTML = `
      <div class="section-header">
        <h2 class="section-title">Captura de EstadÃ­sticas</h2>
        <div style="display:flex;gap:8px;flex-wrap:wrap">
          <button class="btn" style="background:#1a73e8;color:#fff" onclick="abrirModalFoto()">
            ð· Importar por Foto
          </button>
          <button class="btn btn-success" onclick="guardarStats()">
            <svg viewBox="0 0 24 24"><path d="M5 13l4 4L19 7"/></svg>
            Guardar Stats
          </button>
        </div>
      </div>

      <!-- Selector de partido -->
      <div class="card" style="margin-bottom:16px">
        <div class="form-row">
          <div class="form-group" style="margin:0">
            <label class="form-label">Partido</label>
            <select class="form-control" id="selectPartido" onchange="cargarDatosPartido(this.value)">
              ${partidos.map(p => `<option value="${p.id}" ${p.id==selPartidoId?'selected':''}>
                ${formatDate(p.fecha)} â vs ${p.rival} (${p.es_local?'Local':'Visita'})
              </option>`).join('')}
            </select>
          </div>
          <div class="form-group" style="margin:0">
            <label class="form-label">Marcador Final</label>
            <div style="display:flex;gap:8px;align-items:center">
              <input type="number" id="ptsCaballeros" class="form-control" style="width:80px;text-align:center;font-size:20px;font-weight:800" min="0" placeholder="CAB" />
              <span style="color:var(--gris);font-size:20px;font-weight:700">â</span>
              <input type="number" id="ptsRival" class="form-control" style="width:80px;text-align:center;font-size:20px;font-weight:800" min="0" placeholder="RIV" />
            </div>
          </div>
        </div>
      </div>

      <!-- Tabs: Jugadores / Rival -->
      <div class="tabs">
        <button class="tab-btn active" onclick="switchTab('jugadores', this)">ð EstadÃ­sticas Jugadores</button>
        <button class="tab-btn" onclick="switchTab('rival', this)">ð EstadÃ­sticas Rival</button>
      </div>

      <!-- Tab Jugadores -->
      <div id="tab-jugadores" class="card" style="overflow:hidden">
        <div class="table-wrap">
          <table class="captura-table" id="statsTable">
            <thead>
              <tr>
                <th style="width:30px">#</th>
                <th style="min-width:130px">Jugador</th>
                <th>Pos</th>
                <th>Min</th>
                <th style="color:var(--rojo)">PTS</th>
                <th>T2I</th><th>T2E</th>
                <th>T3I</th><th>T3E</th>
                <th>TLI</th><th>TLE</th>
                <th>RO</th><th>RD</th>
                <th>AST</th><th>ROB</th><th>BLQ</th><th>PÃR</th><th>FLT</th>
                <th>EFF</th><th>CAL</th>
              </tr>
            </thead>
            <tbody id="statsBody">
              ${jugadores.map(j => `
                <tr data-jugador-id="${j.id}">
                  <td class="td-num">${j.numero}</td>
                  <td style="font-weight:600;font-size:12px">${j.nombre.split(' ').slice(0,2).join(' ')}</td>
                  <td>${posBadge(j.posicion)}</td>
                  ${['min','puntos','t2i','t2e','t3i','t3e','tli','tle','ro','rd','ast','rob','blq','per','flt'].map((f,i) =>
                    `<td><input class="stat-input${i===0?' wide':''}" type="number" min="0" name="${f}" value="0"
                      onchange="recalcularFila(this)" onclick="this.select()" /></td>`
                  ).join('')}
                  <td class="center eff-cell" style="font-weight:700">â</td>
                  <td class="center cal-cell">â</td>
                </tr>`).join('')}
            </tbody>
          </table>
        </div>
      </div>

      <!-- Tab Rival -->
      <div id="tab-rival" class="card hidden">
        <h3 style="margin-bottom:16px;color:var(--gris-claro);font-size:13px;text-transform:uppercase">EstadÃ­sticas del Equipo Rival</h3>
        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:12px" id="rivalInputs">
          ${[
            ['puntos','Puntos'],['rebotes','Rebotes'],['asistencias','Asistencias'],
            ['robos','Robos'],['bloqueos','Bloqueos'],['perdidas','PÃ©rdidas'],['faltas','Faltas'],
            ['tci','TC Intentados'],['tce','TC Encestados'],
            ['t3i','3P Intentados'],['t3e','3P Encestados'],
            ['tli','TL Intentados'],['tle','TL Encestados']
          ].map(([n,l]) => `
            <div class="form-group" style="margin:0">
              <label class="form-label" style="font-size:10px">${l}</label>
              <input class="form-control" type="number" min="0" id="rival_${n}" name="${n}" value="0" style="text-align:center;font-weight:700;font-size:16px" />
            </div>`).join('')}
        </div>
      </div>

      <!-- Modal Foto -->
      <div id="modalFoto" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,.7);z-index:9999;align-items:center;justify-content:center">
        <div style="background:var(--negro-card);border-radius:12px;padding:24px;width:90%;max-width:540px;max-height:90vh;overflow-y:auto">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
            <h3 style="margin:0">ð· Importar Box Score por Foto</h3>
            <button onclick="cerrarModalFoto()" style="background:none;border:none;color:var(--gris);font-size:20px;cursor:pointer">â</button>
          </div>
          <p style="color:var(--gris);font-size:13px;margin-bottom:16px">Toma una foto del box score oficial o sube una imagen. La IA extraerÃ¡ las estadÃ­sticas automÃ¡ticamente.</p>
          <div id="zonaFoto" onclick="document.getElementById('inputFoto').click()"
            style="border:2px dashed var(--gris);border-radius:8px;padding:32px;text-align:center;cursor:pointer;margin-bottom:16px;transition:.2s"
            onmouseover="this.style.borderColor='var(--rojo)'" onmouseout="this.style.borderColor='var(--gris)'">
            <div style="font-size:40px;margin-bottom:8px">ð·</div>
            <p style="margin:0;color:var(--gris)">Toca para tomar foto o seleccionar imagen</p>
            <input type="file" id="inputFoto" accept="image/*" capture="environment" style="display:none" onchange="previsualizarFoto(event)" />
          </div>
          <div id="previewFoto" style="display:none;margin-bottom:16px">
            <img id="imgPreview" style="width:100%;border-radius:8px;max-height:300px;object-fit:contain" />
            <button onclick="analizarFoto()" style="margin-top:12px;width:100%;padding:12px;background:var(--rojo);color:#fff;border:none;border-radius:8px;font-size:15px;font-weight:700;cursor:pointer">
              ð¤ Analizar con IA
            </button>
          </div>
          <div id="resultadoFoto" style="display:none"></div>
        </div>
      </div>`;

    // Cargar datos existentes
    cargarDatosPartido(selPartidoId);

  } catch (e) {
    content.innerHTML = `<div class="card"><p style="color:var(--rojo)">Error: ${e.message}</p></div>`;
  }
}

function switchTab(tabName, btn) {
  document.querySelectorAll('[id^="tab-"]').forEach(t => t.classList.add('hidden'));
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  document.getElementById(`tab-${tabName}`).classList.remove('hidden');
  btn.classList.add('active');
}

async function cargarDatosPartido(partidoId) {
  _capturaPartidoId = parseInt(partidoId);
  try {
    const p = await API.get(`/partidos/${partidoId}`);

    // Marcador
    const ptsCab = document.getElementById('ptsCaballeros');
    const ptsRiv = document.getElementById('ptsRival');
    if (ptsCab) ptsCab.value = p.puntos_caballeros || '';
    if (ptsRiv) ptsRiv.value = p.puntos_rival || '';

    // Stats jugadores
    const rows = document.querySelectorAll('#statsBody tr');
    rows.forEach(row => {
      const jid = parseInt(row.dataset.jugadorId);
      const s = p.stats_jugadores?.find(s => s.jugador_id === jid);
      if (s) {
        const map = {min:'minutos',puntos:'puntos',t2i:'tiros_2_intentados',t2e:'tiros_2_encestados',
          t3i:'tiros_3_intentados',t3e:'tiros_3_encestados',tli:'tiros_libres_intentados',
          tle:'tiros_libres_encestados',ro:'rebotes_ofensivos',rd:'rebotes_defensivos',
          ast:'asistencias',rob:'robos',blq:'bloqueos',per:'perdidas',flt:'faltas'};
        for (const [name, key] of Object.entries(map)) {
          const inp = row.querySelector(`[name="${name}"]`);
          if (inp) inp.value = s[key] || 0;
        }
        row.querySelector('.eff-cell').textContent = s.eficiencia?.toFixed(0) || 'â';
        row.querySelector('.cal-cell').innerHTML = calBadge(s.calificacion);
      }
    });

    // Stats rival
    if (p.stats_rival) {
      const sr = p.stats_rival;
      const map2 = {puntos:'puntos',rebotes:'rebotes',asistencias:'asistencias',robos:'robos',
        bloqueos:'bloqueos',perdidas:'perdidas',faltas:'faltas',
        tci:'tiros_campo_intentados',tce:'tiros_campo_encestados',
        t3i:'tiros_3_intentados',t3e:'tiros_3_encestados',
        tli:'tiros_libres_intentados',tle:'tiros_libres_encestados'};
      for (const [key, field] of Object.entries(map2)) {
        const el = document.getElementById(`rival_${key}`);
        if (el) el.value = sr[field] || 0;
      }
    }
  } catch {}
}

function recalcularFila(input) {
  const row = input.closest('tr');
  const g = n => parseFloat(row.querySelector(`[name="${n}"]`)?.value || 0);

  const pts = g('puntos'), rob = g('ro')+g('rd'), ast = g('ast'),
        robos = g('rob'), blq = g('blq'),
        tci = g('t2i')+g('t3i'), tce = g('t2e')+g('t3e'),
        tli = g('tli'), tle = g('tle'), per = g('per');

  const eff = (pts + rob + ast + robos + blq) - ((tci - tce) + (tli - tle) + per);

  const orden = ['A+','A','B+','B','C+','C','D'];
  const thresholds = [28, 22, 17, 12, 8, 4];
  let cal = 'D';
  for (let i = 0; i < thresholds.length; i++) {
    if (eff >= thresholds[i]) { cal = orden[i]; break; }
  }

  row.querySelector('.eff-cell').textContent = eff;
  row.querySelector('.cal-cell').innerHTML = calBadge(cal);
}

async function guardarStats() {
  const partidoId = _capturaPartidoId || parseInt(document.getElementById('selectPartido')?.value);
  if (!partidoId) { showToast('Selecciona un partido', 'error'); return; }

  const jugadoresStats = [];
  document.querySelectorAll('#statsBody tr').forEach(row => {
    const jid = parseInt(row.dataset.jugadorId);
    const g = n => parseInt(row.querySelector(`[name="${n}"]`)?.value || 0);
    jugadoresStats.push({
      jugador_id: jid,
      minutos: parseFloat(row.querySelector('[name="min"]')?.value || 0),
      puntos: g('puntos'),
      tiros_2_intentados: g('t2i'), tiros_2_encestados: g('t2e'),
      tiros_3_intentados: g('t3i'), tiros_3_encestados: g('t3e'),
      tiros_libres_intentados: g('tli'), tiros_libres_encestados: g('tle'),
      rebotes_ofensivos: g('ro'), rebotes_defensivos: g('rd'),
      asistencias: g('ast'), robos: g('rob'), bloqueos: g('blq'),
      perdidas: g('per'), faltas: g('flt')
    });
  });

  const rivalStats = {
    puntos: parseInt(document.getElementById('rival_puntos')?.value || 0),
    rebotes: parseInt(document.getElementById('rival_rebotes')?.value || 0),
    asistencias: parseInt(document.getElementById('rival_asistencias')?.value || 0),
    robos: parseInt(document.getElementById('rival_robos')?.value || 0),
    bloqueos: parseInt(document.getElementById('rival_bloqueos')?.value || 0),
    perdidas: parseInt(document.getElementById('rival_perdidas')?.value || 0),
    faltas: parseInt(document.getElementById('rival_faltas')?.value || 0),
    tiros_campo_intentados: parseInt(document.getElementById('rival_tci')?.value || 0),
    tiros_campo_encestados: parseInt(document.getElementById('rival_tce')?.value || 0),
    tiros_3_intentados: parseInt(document.getElementById('rival_t3i')?.value || 0),
    tiros_3_encestados: parseInt(document.getElementById('rival_t3e')?.value || 0),
    tiros_libres_intentados: parseInt(document.getElementById('rival_tli')?.value || 0),
    tiros_libres_encestados: parseInt(document.getElementById('rival_tle')?.value || 0),
  };

  const ptsCab = parseInt(document.getElementById('ptsCaballeros')?.value || 0);
  const ptsRiv = parseInt(document.getElementById('ptsRival')?.value || 0);

  try {
    await API.post(`/partidos/${partidoId}/stats`, {
      jugadores: jugadoresStats,
      rival: rivalStats,
      puntos_caballeros: ptsCab,
      puntos_rival: ptsRiv
    });
    showToast('â EstadÃ­sticas guardadas');
    cargarDatosPartido(partidoId);
  } catch (err) {
    showToast('Error: ' + err.message, 'error');
  }
}

// ââ FOTO / BOX SCORE ââââââââââââââââââââââââââââââââââââââââââ
function abrirModalFoto() {
  const modal = document.getElementById('modalFoto');
  if (modal) { modal.style.display = 'flex'; }
}

function cerrarModalFoto() {
  const modal = document.getElementById('modalFoto');
  if (modal) { modal.style.display = 'none'; }
  document.getElementById('previewFoto').style.display = 'none';
  document.getElementById('resultadoFoto').style.display = 'none';
  document.getElementById('resultadoFoto').innerHTML = '';
}

function previsualizarFoto(e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = ev => {
    document.getElementById('imgPreview').src = ev.target.result;
    document.getElementById('previewFoto').style.display = 'block';
  };
  reader.readAsDataURL(file);
}

async function analizarFoto() {
  const img = document.getElementById('imgPreview');
  if (!img.src) return;

  const resultDiv = document.getElementById('resultadoFoto');
  resultDiv.style.display = 'block';
  resultDiv.innerHTML = '<p style="color:var(--gris);text-align:center">ð¤ Analizando imagen con IA...</p>';

  // Obtener jugadores actuales
  const jugadores = [];
  document.querySelectorAll('#statsBody tr').forEach(row => {
    jugadores.push({
      id: parseInt(row.dataset.jugadorId),
      nombre: row.querySelector('td:nth-child(2)')?.textContent || ''
    });
  });

  // Convertir imagen a base64
  const base64 = img.src.split(',')[1];
  const mediaType = img.src.split(';')[0].split(':')[1] || 'image/jpeg';

  try {
    const res = await API.post('/analisis/boxscore-foto', {
      image: base64,
      media_type: mediaType,
      jugadores: jugadores
    });

    if (res.stats && res.stats.length > 0) {
      renderTablaFoto(res);
    } else {
      resultDiv.innerHTML = '<p style="color:var(--rojo)">No se pudieron extraer estadÃ­sticas. Intenta con una imagen mÃ¡s clara.</p>';
    }
  } catch (err) {
    resultDiv.innerHTML = `<p style="color:var(--rojo)">Error: ${err.message}</p>`;
  }
}

function renderTablaFoto(res) {
  const resultDiv = document.getElementById('resultadoFoto');
  const statsMap = {};
  res.stats.forEach(s => { if (s.jugador_id) statsMap[s.jugador_id] = s; });

  let html = `
    <h4 style="margin-bottom:12px;color:var(--rojo)">EstadÃ­sticas extraÃ­das â revisa y aplica</h4>
    <div style="overflow-x:auto">
    <table style="width:100%;border-collapse:collapse;font-size:12px">
      <thead><tr style="background:var(--negro-hover)">
        <th style="padding:6px;text-align:left">Jugador</th>
        <th>MIN</th><th>PTS</th><th>REB</th><th>AST</th><th>ROB</th><th>BLQ</th>
      </tr></thead><tbody>`;

  res.stats.forEach(s => {
    html += `<tr style="border-bottom:1px solid var(--negro-hover)" data-jid="${s.jugador_id||''}">
      <td style="padding:6px;font-weight:600">${s.nombre||'?'}</td>
      <td style="text-align:center"><input type="number" value="${s.minutos||0}" style="width:40px;text-align:center;background:var(--negro);color:#fff;border:1px solid var(--gris);border-radius:4px" onchange="actualizarFotoStat(this,'minutos',${s.jugador_id||0})"/></td>
      <td style="text-align:center"><input type="number" value="${s.puntos||0}" style="width:40px;text-align:center;background:var(--negro);color:#fff;border:1px solid var(--gris);border-radius:4px" onchange="actualizarFotoStat(this,'puntos',${s.jugador_id||0})"/></td>
      <td style="text-align:center"><input type="number" value="${(s.rebotes_ofensivos||0)+(s.rebotes_defensivos||0)}" style="width:40px;text-align:center;background:var(--negro);color:#fff;border:1px solid var(--gris);border-radius:4px" onchange="actualizarFotoStat(this,'rebotes',${s.jugador_id||0})"/></td>
      <td style="text-align:center"><input type="number" value="${s.asistencias||0}" style="width:40px;text-align:center;background:var(--negro);color:#fff;border:1px solid var(--gris);border-radius:4px" onchange="actualizarFotoStat(this,'asistencias',${s.jugador_id||0})"/></td>
      <td style="text-align:center"><input type="number" value="${s.robos||0}" style="width:40px;text-align:center;background:var(--negro);color:#fff;border:1px solid var(--gris);border-radius:4px" onchange="actualizarFotoStat(this,'robos',${s.jugador_id||0})"/></td>
      <td style="text-align:center"><input type="number" value="${s.bloqueos||0}" style="width:40px;text-align:center;background:var(--negro);color:#fff;border:1px solid var(--gris);border-radius:4px" onchange="actualizarFotoStat(this,'bloqueos',${s.jugador_id||0})"/></td>
    </tr>`;
  });

  html += `</tbody></table></div>
    <button onclick="aplicarStatsFoto()" style="margin-top:16px;width:100%;padding:12px;background:#28a745;color:#fff;border:none;border-radius:8px;font-size:15px;font-weight:700;cursor:pointer">
      â Aplicar estas estadÃ­sticas
    </button>`;

  resultDiv.innerHTML = html;
  window._fotoStats = res.stats;
}

function actualizarFotoStat(input, campo, jugadorId) {
  if (!window._fotoStats) return;
  const stat = window._fotoStats.find(s => s.jugador_id === jugadorId);
  if (stat) stat[campo] = parseFloat(input.value) || 0;
}

function aplicarStatsFoto() {
  if (!window._fotoStats) return;
  window._fotoStats.forEach(s => {
    if (!s.jugador_id) return;
    const row = document.querySelector(`#statsBody tr[data-jugador-id="${s.jugador_id}"]`);
    if (!row) return;
    const set = (name, val) => {
      const inp = row.querySelector(`[name="${name}"]`);
      if (inp) { inp.value = val || 0; }
    };
    set('min', s.minutos);
    set('puntos', s.puntos);
    set('t2i', s.tiros_2_intentados);
    set('t2e', s.tiros_2_encestados);
    set('t3i', s.tiros_3_intentados);
    set('t3e', s.tiros_3_encestados);
    set('tli', s.tiros_libres_intentados);
    set('tle', s.tiros_libres_encestados);
    set('ro', s.rebotes_ofensivos);
    set('rd', s.rebotes_defensivos);
    set('ast', s.asistencias);
    set('rob', s.robos);
    set('blq', s.bloqueos);
    set('per', s.perdidas);
    set('flt', s.faltas);
    const anyInput = row.querySelector('input');
    if (anyInput) recalcularFila(anyInput);
  });
  cerrarModalFoto();
  showToast('â EstadÃ­sticas aplicadas â revisa y guarda');
}
