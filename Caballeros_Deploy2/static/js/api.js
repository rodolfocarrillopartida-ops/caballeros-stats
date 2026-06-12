// ===== API HELPER =====
const API = {
  base: '/api',

  async get(path) {
    const r = await fetch(this.base + path);
    if (!r.ok) throw new Error(await r.text());
    return r.json();
  },

  async post(path, data) {
    const r = await fetch(this.base + path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!r.ok) throw new Error(await r.text());
    return r.json();
  },

  async put(path, data) {
    const r = await fetch(this.base + path, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!r.ok) throw new Error(await r.text());
    return r.json();
  },

  async del(path) {
    const r = await fetch(this.base + path, { method: 'DELETE' });
    if (!r.ok) throw new Error(await r.text());
    return r.json();
  }
};

// ===== UTILIDADES =====
function calBadge(cal) {
  if (!cal) return '<span style="color:var(--gris)">—</span>';
  const cls = cal.replace('+', 'plus');
  return `<span class="cal-badge cal-${cls}">${cal}</span>`;
}

function posBadge(pos) {
  const cls = pos.replace('-', '').replace('ó', 'o').replace('í', 'i');
  return `<span class="pos-badge pos-${cls}">${pos}</span>`;
}

function resBadge(res) {
  if (!res) return '—';
  return `<span class="res-${res}">${res === 'V' ? 'Victoria' : 'Derrota'}</span>`;
}

function formatDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso + 'T12:00:00');
  return d.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });
}

function pct(made, att) {
  if (!att) return '—';
  return (made / att * 100).toFixed(1) + '%';
}

function showToast(msg, type = 'success') {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.className = `toast ${type}`;
  setTimeout(() => t.classList.add('hidden'), 2500);
}

function showModal(title, bodyHtml, sizeCls = '') {
  document.getElementById('modalTitle').textContent = title;
  document.getElementById('modalBody').innerHTML = bodyHtml;
  const box = document.getElementById('modalBox');
  box.className = 'modal-box ' + sizeCls;
  document.getElementById('modal').classList.remove('hidden');
}

function closeModal() {
  document.getElementById('modal').classList.add('hidden');
}

function loading(text = 'Cargando...') {
  return `<div class="loading"><div class="spinner"></div>${text}</div>`;
}

function empty(title, subtitle = '') {
  return `<div class="empty-state">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="10"/><path d="M12 8v4m0 4h.01"/></svg>
    <h3>${title}</h3>${subtitle ? `<p>${subtitle}</p>` : ''}
  </div>`;
}

// Cerrar modal al clic fuera
document.getElementById('modal').addEventListener('click', function(e) {
  if (e.target === this) closeModal();
});

// Temporada global
let _temporadaActiva = null;
async function getTemporadaActiva() {
  if (!_temporadaActiva) {
    try { _temporadaActiva = await API.get('/temporadas/activa'); } catch {}
  }
  return _temporadaActiva;
}
function setTemporadaActiva(t) {
  _temporadaActiva = t;
  document.getElementById('sidebarSeasonName').textContent = t ? t.nombre : '—';
  document.getElementById('topbarBadge').textContent = t ? t.nombre : '';
}
