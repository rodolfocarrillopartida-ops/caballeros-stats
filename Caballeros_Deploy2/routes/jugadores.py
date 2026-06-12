from flask import Blueprint, request, jsonify
from models import db, Jugador, StatJugador, Partido
from sqlalchemy import func

bp = Blueprint('jugadores', __name__, url_prefix='/api/jugadores')


@bp.route('/', methods=['GET'])
def listar():
    temporada_id = request.args.get('temporada_id', type=int)
    solo_activos = request.args.get('activos', 'false').lower() == 'true'
    q = Jugador.query
    if temporada_id:
        q = q.filter_by(temporada_id=temporada_id)
    if solo_activos:
        q = q.filter_by(activo=True)
    jugadores = q.order_by(Jugador.numero).all()
    return jsonify([j.to_dict() for j in jugadores])


@bp.route('/<int:id>', methods=['GET'])
def obtener(id):
    j = Jugador.query.get_or_404(id)
    return jsonify(j.to_dict())


@bp.route('/', methods=['POST'])
def crear():
    data = request.get_json()
    j = Jugador(
        temporada_id=data['temporada_id'],
        nombre=data['nombre'],
        numero=data['numero'],
        posicion=data['posicion'],
        activo=data.get('activo', True)
    )
    db.session.add(j)
    db.session.commit()
    return jsonify(j.to_dict()), 201


@bp.route('/<int:id>', methods=['PUT'])
def actualizar(id):
    j = Jugador.query.get_or_404(id)
    data = request.get_json()
    j.nombre = data.get('nombre', j.nombre)
    j.numero = data.get('numero', j.numero)
    j.posicion = data.get('posicion', j.posicion)
    j.activo = data.get('activo', j.activo)
    db.session.commit()
    return jsonify(j.to_dict())


@bp.route('/<int:id>', methods=['DELETE'])
def eliminar(id):
    j = Jugador.query.get_or_404(id)
    db.session.delete(j)
    db.session.commit()
    return jsonify({'ok': True})


@bp.route('/<int:id>/promedios', methods=['GET'])
def promedios(id):
    """Retorna promedios del jugador en toda la temporada"""
    j = Jugador.query.get_or_404(id)
    stats = StatJugador.query.filter_by(jugador_id=id).all()
    n = len(stats)
    if n == 0:
        return jsonify({'jugador': j.to_dict(), 'partidos': 0, 'promedios': {}})

    totales = {
        'puntos': sum(s.puntos for s in stats),
        'rebotes_totales': sum(s.rebotes_totales for s in stats),
        'rebotes_ofensivos': sum(s.rebotes_ofensivos for s in stats),
        'rebotes_defensivos': sum(s.rebotes_defensivos for s in stats),
        'asistencias': sum(s.asistencias for s in stats),
        'robos': sum(s.robos for s in stats),
        'bloqueos': sum(s.bloqueos for s in stats),
        'perdidas': sum(s.perdidas for s in stats),
        'faltas': sum(s.faltas for s in stats),
        'minutos': sum(s.minutos for s in stats),
        'tiros_campo_intentados': sum(s.tiros_campo_intentados for s in stats),
        'tiros_campo_encestados': sum(s.tiros_campo_encestados for s in stats),
        'tiros_3_intentados': sum(s.tiros_3_intentados for s in stats),
        'tiros_3_encestados': sum(s.tiros_3_encestados for s in stats),
        'tiros_libres_intentados': sum(s.tiros_libres_intentados for s in stats),
        'tiros_libres_encestados': sum(s.tiros_libres_encestados for s in stats),
        'eficiencia': sum(s.eficiencia for s in stats),
    }

    promedios = {k: round(v / n, 1) for k, v in totales.items()}
    promedios['porcentaje_tc'] = (
        round(totales['tiros_campo_encestados'] / totales['tiros_campo_intentados'] * 100, 1)
        if totales['tiros_campo_intentados'] > 0 else 0
    )
    promedios['porcentaje_3p'] = (
        round(totales['tiros_3_encestados'] / totales['tiros_3_intentados'] * 100, 1)
        if totales['tiros_3_intentados'] > 0 else 0
    )
    promedios['porcentaje_tl'] = (
        round(totales['tiros_libres_encestados'] / totales['tiros_libres_intentados'] * 100, 1)
        if totales['tiros_libres_intentados'] > 0 else 0
    )

    calificaciones = [s.calificacion for s in stats if s.calificacion]
    orden = ['A+', 'A', 'B+', 'B', 'C+', 'C', 'D']
    cal_promedio = None
    if calificaciones:
        indices = [orden.index(c) for c in calificaciones if c in orden]
        if indices:
            cal_promedio = orden[round(sum(indices) / len(indices))]

    return jsonify({
        'jugador': j.to_dict(),
        'partidos': n,
        'totales': totales,
        'promedios': promedios,
        'calificacion_promedio': cal_promedio,
        'historial': [s.to_dict() for s in stats]
    })


@bp.route('/comparar', methods=['GET'])
def comparar():
    """Compara dos jugadores cara a cara"""
    id1 = request.args.get('j1', type=int)
    id2 = request.args.get('j2', type=int)
    if not id1 or not id2:
        return jsonify({'error': 'Faltan parámetros j1 y j2'}), 400

    def get_data(jid):
        j = Jugador.query.get(jid)
        if not j:
            return None
        stats = StatJugador.query.filter_by(jugador_id=jid).all()
        n = len(stats)
        if n == 0:
            return {'jugador': j.to_dict(), 'partidos': 0, 'promedios': {}}
        totales = {
            'puntos': sum(s.puntos for s in stats),
            'rebotes': sum(s.rebotes_totales for s in stats),
            'asistencias': sum(s.asistencias for s in stats),
            'robos': sum(s.robos for s in stats),
            'bloqueos': sum(s.bloqueos for s in stats),
            'perdidas': sum(s.perdidas for s in stats),
            'faltas': sum(s.faltas for s in stats),
            'minutos': sum(s.minutos for s in stats),
            'tci': sum(s.tiros_campo_intentados for s in stats),
            'tce': sum(s.tiros_campo_encestados for s in stats),
            't3i': sum(s.tiros_3_intentados for s in stats),
            't3e': sum(s.tiros_3_encestados for s in stats),
            'tli': sum(s.tiros_libres_intentados for s in stats),
            'tle': sum(s.tiros_libres_encestados for s in stats),
            'eficiencia': sum(s.eficiencia for s in stats),
        }
        promedios = {k: round(v / n, 1) for k, v in totales.items()}
        promedios['pct_tc'] = round(totales['tce'] / totales['tci'] * 100, 1) if totales['tci'] > 0 else 0
        promedios['pct_3p'] = round(totales['t3e'] / totales['t3i'] * 100, 1) if totales['t3i'] > 0 else 0
        promedios['pct_tl'] = round(totales['tle'] / totales['tli'] * 100, 1) if totales['tli'] > 0 else 0
        return {'jugador': j.to_dict(), 'partidos': n, 'promedios': promedios}

    d1 = get_data(id1)
    d2 = get_data(id2)
    if not d1 or not d2:
        return jsonify({'error': 'Jugador no encontrado'}), 404

    return jsonify({'jugador1': d1, 'jugador2': d2})
