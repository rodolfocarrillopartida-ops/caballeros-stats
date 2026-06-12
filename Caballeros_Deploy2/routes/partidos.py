from flask import Blueprint, request, jsonify
from models import db, Partido, StatJugador, StatRival, Jugador
from datetime import date

bp = Blueprint('partidos', __name__, url_prefix='/api/partidos')


@bp.route('/', methods=['GET'])
def listar():
    temporada_id = request.args.get('temporada_id', type=int)
    q = Partido.query
    if temporada_id:
        q = q.filter_by(temporada_id=temporada_id)
    partidos = q.order_by(Partido.fecha.desc()).all()
    result = []
    for p in partidos:
        d = p.to_dict()
        d['num_jugadores_con_stats'] = StatJugador.query.filter_by(partido_id=p.id).count()
        d['tiene_stats_rival'] = p.stats_rival is not None
        result.append(d)
    return jsonify(result)


@bp.route('/<int:id>', methods=['GET'])
def obtener(id):
    p = Partido.query.get_or_404(id)
    d = p.to_dict()
    d['stats_jugadores'] = [s.to_dict() for s in p.stats_jugadores]
    if p.stats_rival:
        d['stats_rival'] = p.stats_rival.to_dict()
    # Incluir datos del jugador en cada stat
    for s in d['stats_jugadores']:
        j = Jugador.query.get(s['jugador_id'])
        if j:
            s['jugador'] = j.to_dict()
    return jsonify(d)


@bp.route('/', methods=['POST'])
def crear():
    data = request.get_json()
    p = Partido(
        temporada_id=data['temporada_id'],
        fecha=date.fromisoformat(data['fecha']),
        rival=data['rival'],
        puntos_caballeros=data.get('puntos_caballeros', 0),
        puntos_rival=data.get('puntos_rival', 0),
        es_local=data.get('es_local', True),
        fase=data.get('fase', 'Regular'),
        notas=data.get('notas', '')
    )
    # Calcular resultado automáticamente
    if p.puntos_caballeros > 0 or p.puntos_rival > 0:
        p.resultado = 'V' if p.puntos_caballeros > p.puntos_rival else 'L'
    db.session.add(p)
    db.session.commit()
    return jsonify(p.to_dict()), 201


@bp.route('/<int:id>', methods=['PUT'])
def actualizar(id):
    p = Partido.query.get_or_404(id)
    data = request.get_json()
    p.rival = data.get('rival', p.rival)
    p.fecha = date.fromisoformat(data['fecha']) if data.get('fecha') else p.fecha
    p.puntos_caballeros = data.get('puntos_caballeros', p.puntos_caballeros)
    p.puntos_rival = data.get('puntos_rival', p.puntos_rival)
    p.es_local = data.get('es_local', p.es_local)
    p.fase = data.get('fase', p.fase)
    p.notas = data.get('notas', p.notas)
    p.resultado = 'V' if p.puntos_caballeros > p.puntos_rival else 'L'
    db.session.commit()
    return jsonify(p.to_dict())


@bp.route('/<int:id>', methods=['DELETE'])
def eliminar(id):
    p = Partido.query.get_or_404(id)
    db.session.delete(p)
    db.session.commit()
    return jsonify({'ok': True})


@bp.route('/<int:id>/stats', methods=['POST'])
def guardar_stats(id):
    """Guarda o actualiza stats de todos los jugadores en un partido"""
    p = Partido.query.get_or_404(id)
    data = request.get_json()

    # Stats de jugadores
    jugadores_stats = data.get('jugadores', [])
    for js in jugadores_stats:
        existing = StatJugador.query.filter_by(
            partido_id=id, jugador_id=js['jugador_id']
        ).first()
        if existing:
            s = existing
        else:
            s = StatJugador(partido_id=id, jugador_id=js['jugador_id'])
            db.session.add(s)

        s.minutos = js.get('minutos', 0)
        s.puntos = js.get('puntos', 0)
        s.tiros_2_intentados = js.get('tiros_2_intentados', 0)
        s.tiros_2_encestados = js.get('tiros_2_encestados', 0)
        s.tiros_3_intentados = js.get('tiros_3_intentados', 0)
        s.tiros_3_encestados = js.get('tiros_3_encestados', 0)
        s.tiros_libres_intentados = js.get('tiros_libres_intentados', 0)
        s.tiros_libres_encestados = js.get('tiros_libres_encestados', 0)
        s.rebotes_ofensivos = js.get('rebotes_ofensivos', 0)
        s.rebotes_defensivos = js.get('rebotes_defensivos', 0)
        s.asistencias = js.get('asistencias', 0)
        s.robos = js.get('robos', 0)
        s.bloqueos = js.get('bloqueos', 0)
        s.perdidas = js.get('perdidas', 0)
        s.faltas = js.get('faltas', 0)

        # Calcular eficiencia y calificación
        s.eficiencia = s.calcular_eficiencia()
        s.calificacion = s.calcular_calificacion()

    # Stats del rival
    rival_data = data.get('rival')
    if rival_data:
        sr = p.stats_rival
        if not sr:
            sr = StatRival(partido_id=id)
            db.session.add(sr)
        sr.puntos = rival_data.get('puntos', 0)
        sr.rebotes = rival_data.get('rebotes', 0)
        sr.asistencias = rival_data.get('asistencias', 0)
        sr.robos = rival_data.get('robos', 0)
        sr.bloqueos = rival_data.get('bloqueos', 0)
        sr.perdidas = rival_data.get('perdidas', 0)
        sr.faltas = rival_data.get('faltas', 0)
        sr.tiros_campo_intentados = rival_data.get('tiros_campo_intentados', 0)
        sr.tiros_campo_encestados = rival_data.get('tiros_campo_encestados', 0)
        sr.tiros_3_intentados = rival_data.get('tiros_3_intentados', 0)
        sr.tiros_3_encestados = rival_data.get('tiros_3_encestados', 0)
        sr.tiros_libres_intentados = rival_data.get('tiros_libres_intentados', 0)
        sr.tiros_libres_encestados = rival_data.get('tiros_libres_encestados', 0)

    # Actualizar marcador del partido
    if data.get('puntos_caballeros') is not None:
        p.puntos_caballeros = data['puntos_caballeros']
    if data.get('puntos_rival') is not None:
        p.puntos_rival = data['puntos_rival']
    p.resultado = 'V' if p.puntos_caballeros > p.puntos_rival else 'L'

    db.session.commit()
    return jsonify({'ok': True, 'partido': p.to_dict()})


@bp.route('/resumen-temporada/<int:temporada_id>', methods=['GET'])
def resumen_temporada(temporada_id):
    """Resumen estadístico de la temporada"""
    partidos = Partido.query.filter_by(temporada_id=temporada_id).all()
    total = len(partidos)
    victorias = sum(1 for p in partidos if p.resultado == 'V')
    derrotas = sum(1 for p in partidos if p.resultado == 'L')

    pts_favor = sum(p.puntos_caballeros for p in partidos)
    pts_contra = sum(p.puntos_rival for p in partidos)

    return jsonify({
        'total_partidos': total,
        'victorias': victorias,
        'derrotas': derrotas,
        'pct_victorias': round(victorias / total * 100, 1) if total > 0 else 0,
        'puntos_favor_promedio': round(pts_favor / total, 1) if total > 0 else 0,
        'puntos_contra_promedio': round(pts_contra / total, 1) if total > 0 else 0,
        'diferencial': round((pts_favor - pts_contra) / total, 1) if total > 0 else 0,
        'partidos': [p.to_dict() for p in partidos]
    })
