from flask import Blueprint, request, jsonify, current_app
from models import db, AnalisisIA, Partido, StatJugador, StatRival, Jugador, Temporada
import anthropic
import os

bp = Blueprint('analisis', __name__, url_prefix='/api/analisis')


def get_claude_client():
    api_key = os.getenv('ANTHROPIC_API_KEY')
    if not api_key:
        return None
    return anthropic.Anthropic(api_key=api_key)


@bp.route('/partido/<int:partido_id>', methods=['POST'])
def analizar_partido(partido_id):
    """Genera análisis IA del partido con Claude"""
    client = get_claude_client()
    if not client:
        return jsonify({'error': 'API Key de Claude no configurada. Agrega ANTHROPIC_API_KEY al archivo .env'}), 400

    p = Partido.query.get_or_404(partido_id)
    stats = StatJugador.query.filter_by(partido_id=partido_id).all()
    rival_stats = p.stats_rival

    if not stats:
        return jsonify({'error': 'No hay estadísticas registradas para este partido'}), 400

    # Construir contexto para Claude
    resultado_texto = 'Victoria' if p.resultado == 'V' else 'Derrota'
    local_visitante = 'Local' if p.es_local else 'Visitante'

    jugadores_texto = []
    for s in stats:
        j = Jugador.query.get(s.jugador_id)
        nombre = j.nombre if j else 'Jugador'
        posicion = j.posicion if j else ''
        jugadores_texto.append(
            f"- {nombre} ({posicion}, #{j.numero if j else '?'}): "
            f"{s.puntos} pts, {s.rebotes_totales} reb ({s.rebotes_ofensivos}O/{s.rebotes_defensivos}D), "
            f"{s.asistencias} ast, {s.robos} rob, {s.bloqueos} blq, {s.perdidas} pér, "
            f"{s.faltas} flt, TC: {s.tiros_campo_encestados}/{s.tiros_campo_intentados} "
            f"({s.porcentaje_tc}%), 3P: {s.tiros_3_encestados}/{s.tiros_3_intentados}, "
            f"TL: {s.tiros_libres_encestados}/{s.tiros_libres_intentados}, "
            f"Eficiencia: {s.eficiencia:.0f}, Cal: {s.calificacion}, "
            f"{s.minutos:.0f} min"
        )

    rival_texto = ""
    if rival_stats:
        rival_texto = (
            f"\nRival ({p.rival}): {rival_stats.puntos} pts, {rival_stats.rebotes} reb, "
            f"{rival_stats.asistencias} ast, TC: {rival_stats.tiros_campo_encestados}/{rival_stats.tiros_campo_intentados} "
            f"({rival_stats.porcentaje_tc}%)"
        )

    prompt = f"""Eres el analista estadístico de los Caballeros de Culiacán, equipo profesional de la liga CIBACOPA de basquetbol en México.

PARTIDO: {p.fecha} - Caballeros vs {p.rival} ({local_visitante})
RESULTADO: {resultado_texto} {p.puntos_caballeros}-{p.puntos_rival}
FASE: {p.fase}

ESTADÍSTICAS DE CABALLEROS:
{chr(10).join(jugadores_texto)}
{rival_texto}

Proporciona un análisis táctico y estadístico detallado en español que incluya:
1. **Resumen ejecutivo** del partido (3-4 oraciones)
2. **Jugadores destacados** - Menciona los 3 mejores con sus puntos clave
3. **Áreas de mejora** - Identifica 2-3 aspectos tácticos o individuales a trabajar
4. **Tendencias** - Patrones ofensivos/defensivos observados
5. **Recomendaciones** para el coaching staff (2-3 puntos concretos)

Usa un tono profesional y técnico, apropiado para un cuerpo técnico de basquetbol profesional. Sé específico con los números."""

    try:
        message = client.messages.create(
            model="claude-sonnet-4-6",
            max_tokens=1500,
            messages=[{"role": "user", "content": prompt}]
        )
        contenido = message.content[0].text

        # Guardar análisis
        analisis = AnalisisIA(
            partido_id=partido_id,
            temporada_id=p.temporada_id,
            tipo='partido',
            contenido=contenido,
            modelo='claude-sonnet-4-6'
        )
        db.session.add(analisis)
        db.session.commit()

        return jsonify(analisis.to_dict())

    except Exception as e:
        return jsonify({'error': f'Error al generar análisis: {str(e)}'}), 500


@bp.route('/temporada/<int:temporada_id>', methods=['POST'])
def analizar_temporada(temporada_id):
    """Genera análisis IA de la temporada completa"""
    client = get_claude_client()
    if not client:
        return jsonify({'error': 'API Key de Claude no configurada'}), 400

    temporada = Temporada.query.get_or_404(temporada_id)
    partidos = Partido.query.filter_by(temporada_id=temporada_id).all()

    if not partidos:
        return jsonify({'error': 'No hay partidos en esta temporada'}), 400

    total = len(partidos)
    victorias = sum(1 for p in partidos if p.resultado == 'V')
    derrotas = total - victorias

    # Recopilar stats de todos los jugadores
    jugadores = Jugador.query.filter_by(temporada_id=temporada_id).all()
    jugadores_resumen = []
    for j in jugadores:
        stats = StatJugador.query.filter_by(jugador_id=j.id).all()
        n = len(stats)
        if n == 0:
            continue
        prom_pts = sum(s.puntos for s in stats) / n
        prom_reb = sum(s.rebotes_totales for s in stats) / n
        prom_ast = sum(s.asistencias for s in stats) / n
        prom_eff = sum(s.eficiencia for s in stats) / n
        jugadores_resumen.append(
            f"- {j.nombre} ({j.posicion}, #{j.numero}): {prom_pts:.1f} pts, "
            f"{prom_reb:.1f} reb, {prom_ast:.1f} ast, Efic: {prom_eff:.1f} en {n} partidos"
        )

    pts_favor = sum(p.puntos_caballeros for p in partidos)
    pts_contra = sum(p.puntos_rival for p in partidos)

    prompt = f"""Eres el analista estadístico de los Caballeros de Culiacán, equipo profesional de la liga CIBACOPA.

TEMPORADA: {temporada.nombre} ({temporada.anio})
RÉCORD: {victorias}-{derrotas} ({round(victorias/total*100,1) if total > 0 else 0}% victorias)
Puntos a favor promedio: {round(pts_favor/total,1) if total > 0 else 0} | Puntos en contra: {round(pts_contra/total,1) if total > 0 else 0}

PROMEDIOS POR JUGADOR:
{chr(10).join(jugadores_resumen) if jugadores_resumen else 'Sin datos'}

Genera un informe completo de la temporada en español que incluya:
1. **Balance de la temporada** - Evaluación general del rendimiento
2. **Jugadores sobresalientes** - Top 3 con argumentos estadísticos
3. **Jugadores a reforzar** - Quiénes necesitan más trabajo y en qué
4. **Análisis ofensivo del equipo** - Tendencias y efectividad
5. **Análisis defensivo del equipo** - Fortalezas y debilidades
6. **Recomendaciones para la próxima temporada** - 3-5 puntos estratégicos
7. **Conclusión** del ciclo

Usa tono profesional y técnico. Sé específico con estadísticas."""

    try:
        message = client.messages.create(
            model="claude-sonnet-4-6",
            max_tokens=2000,
            messages=[{"role": "user", "content": prompt}]
        )
        contenido = message.content[0].text

        analisis = AnalisisIA(
            temporada_id=temporada_id,
            tipo='temporada',
            contenido=contenido,
            modelo='claude-sonnet-4-6'
        )
        db.session.add(analisis)
        db.session.commit()

        return jsonify(analisis.to_dict())

    except Exception as e:
        return jsonify({'error': f'Error al generar análisis: {str(e)}'}), 500


@bp.route('/partido/<int:partido_id>/historial', methods=['GET'])
def historial_partido(partido_id):
    analisis = AnalisisIA.query.filter_by(partido_id=partido_id, tipo='partido').order_by(AnalisisIA.created_at.desc()).all()
    return jsonify([a.to_dict() for a in analisis])


@bp.route('/temporada/<int:temporada_id>/historial', methods=['GET'])
def historial_temporada(temporada_id):
    analisis = AnalisisIA.query.filter_by(temporada_id=temporada_id, tipo='temporada').order_by(AnalisisIA.created_at.desc()).all()
    return jsonify([a.to_dict() for a in analisis])
