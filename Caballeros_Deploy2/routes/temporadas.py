from flask import Blueprint, request, jsonify
from models import db, Temporada
from datetime import date

bp = Blueprint('temporadas', __name__, url_prefix='/api/temporadas')


@bp.route('/', methods=['GET'])
def listar():
    temporadas = Temporada.query.order_by(Temporada.anio.desc()).all()
    return jsonify([t.to_dict() for t in temporadas])


@bp.route('/<int:id>', methods=['GET'])
def obtener(id):
    t = Temporada.query.get_or_404(id)
    return jsonify(t.to_dict())


@bp.route('/', methods=['POST'])
def crear():
    data = request.get_json()
    # Si se activa esta, desactivar las demás
    if data.get('activa'):
        Temporada.query.update({'activa': False})
    t = Temporada(
        nombre=data['nombre'],
        anio=data['anio'],
        activa=data.get('activa', False),
        fecha_inicio=date.fromisoformat(data['fecha_inicio']) if data.get('fecha_inicio') else None,
        fecha_fin=date.fromisoformat(data['fecha_fin']) if data.get('fecha_fin') else None
    )
    db.session.add(t)
    db.session.commit()
    return jsonify(t.to_dict()), 201


@bp.route('/<int:id>', methods=['PUT'])
def actualizar(id):
    t = Temporada.query.get_or_404(id)
    data = request.get_json()
    if data.get('activa') and not t.activa:
        Temporada.query.update({'activa': False})
    t.nombre = data.get('nombre', t.nombre)
    t.anio = data.get('anio', t.anio)
    t.activa = data.get('activa', t.activa)
    if data.get('fecha_inicio'):
        t.fecha_inicio = date.fromisoformat(data['fecha_inicio'])
    if data.get('fecha_fin'):
        t.fecha_fin = date.fromisoformat(data['fecha_fin'])
    db.session.commit()
    return jsonify(t.to_dict())


@bp.route('/<int:id>', methods=['DELETE'])
def eliminar(id):
    t = Temporada.query.get_or_404(id)
    db.session.delete(t)
    db.session.commit()
    return jsonify({'ok': True})


@bp.route('/activa', methods=['GET'])
def obtener_activa():
    t = Temporada.query.filter_by(activa=True).first()
    if not t:
        return jsonify(None)
    return jsonify(t.to_dict())
