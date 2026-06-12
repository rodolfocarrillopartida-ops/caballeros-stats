// ===== ROUTER =====
const pages = {
  dashboard: renderDashboard,
  plantilla: renderPlantilla,
  partidos: renderPartidos,
  captura: renderCaptura,
  estadisticas: renderEstadisticas,
  comparador: renderComparador,
  analisis: renderAnalisis,
  temporadas: renderTemporadas
};

function navigateTo(page) {
  // Actualizar nav
  document.querySelectorAll('.nav-link').forEach(l => {
    l.classList.toggle('active', l.dataset.page === page);
  });

  // Render página
  const fn = pages[page];
  if (fn) fn();
}

// Nav clicks
document.querySelectorAll('.nav-link').forEach(link => {
  link.addEventListener('click', e => {
    e.preventDefault();
    navigateTo(link.dataset.page);
  });
});

// Toggle sidebar (mobile)
function toggleSidebar() {
  document.getElementById('sidebar').classList.toggle('open');
}

// Cerrar sidebar al navegar en móvil
document.querySelectorAll('.nav-link').forEach(l => {
  l.addEventListener('click', () => {
    if (window.innerWidth < 768) {
      document.getElementById('sidebar').classList.remove('open');
    }
  });
});

// ===== INIT =====
async function init() {
  const t = await getTemporadaActiva();
  setTemporadaActiva(t);
  navigateTo('dashboard');
}

init();
