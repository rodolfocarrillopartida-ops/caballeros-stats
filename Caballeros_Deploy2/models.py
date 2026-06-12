from flask_sqlalchemy import SQLAlchemy
from datetime import datetime

db = SQLAlchemy()


class Temporada(db.Model):
    __tablename__ = 'temporadas'
    id = db.Column(db.Integer, primary_key=True)
    nombre = db.Column(db.String(100), nullable=False)
    anio = db.Column(db.Integer, nullable=False)
    activa = db.Column(db.Boolean, default=True)
    fecha_inicio = db.Column(db.Date, nullable=True)
    fecha_fin = db.Column(db.Date, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    jugadores = db.relationship('Jugador', backref='temporada', lazy=True, cascade='all, delete-orphan')
    partidos = db.relationship('Partido', backref='temporada', lazy=True, cascade='all, delete-orphan')

    def to_dict(self):
        return {
            'id': self.id,
            'nombre': self.nombre,
            'anio': self.anio,
            'activa': self.activa,
            'fecha_inicio': self.fecha_inicio.isoformat() if self.fecha_inicio else None,
            'fecha_fin': self.fecha_fin.isoformat() if self.fecha_fin else None,
            'created_at': self.created_at.isoformat()
        }


POSICIONES = ['Base', 'Escolta', 'Alero', 'Ala-Pívot', 'Pívot']


class Jugador(db.Model):
    __tablename__ = 'jugadores'
    id = db.Column(db.Integer, primary_key=True)
    temporada_id = db.Column(db.Integer, db.ForeignKey('temporadas.id'), nullable=False)
    nombre = db.Column(db.String(150), nullable=False)
    numero = db.Column(db.Integer, nullable=False)
    posicion = db.Column(db.String(20), nullable=False)  # Base, Escolta, Alero, Ala-Pívot, Pívot
    activo = db.Column(db.Boolean, default=True)
    foto_url = db.Column(db.String(255), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    stats = db.relationship('StatJugador', backref='jugador', lazy=True, cascade='all, delete-orphan')

    def to_dict(self):
        return {
            'id': self.id,
            'temporada_id': self.temporada_id,
            'nombre': self.nombre,
            'numero': self.numero,
            'posicion': self.posicion,
            'activo': self.activo,
            'created_at': self.created_at.isoformat()
        }


class Partido(db.Model):
    __tablename__ = 'partidos'
    id = db.Column(db.Integer, primary_key=True)
    temporada_id = db.Column(db.Integer, db.ForeignKey('temporadas.id'), nullable=False)
    fecha = db.Column(db.Date, nullable=False)
    rival = db.Column(db.String(150), nullable=False)
    puntos_caballeros = db.Column(db.Integer, default=0)
    puntos_rival = db.Column(db.Integer, default=0)
    resultado = db.Column(db.String(1), nullable=True)  # 'V' o 'L'
    es_local = db.Column(db.Boolean, default=True)
    fase = db.Column(db.String(50), default='Regular')  # Regular, Playoffs, Final
    notas = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    stats_jugadores = db.relationship('StatJugador', backref='partido', lazy=True, cascade='all, delete-orphan')
    stats_rival = db.relationship('StatRival', backref='partido', uselist=False, cascade='all, delete-orphan')
    analisis = db.relationship('AnalisisIA', backref='partido', lazy=True, cascade='all, delete-orphan')

    def to_dict(self):
        return {
            'id': self.id,
            'temporada_id': self.temporada_id,
            'fecha': self.fecha.isoformat() if self.fecha else None,
            'rival': self.rival,
            'puntos_caballeros': self.puntos_caballeros,
            'puntos_rival': self.puntos_rival,
            'resultado': self.resultado,
            'es_local': self.es_local,
            'fase': self.fase,
            'notas': self.notas,
            'created_at': self.created_at.isoformat()
        }


class StatJugador(db.Model):
    __tablename__ = 'stats_jugadores'
    id = db.Column(db.Integer, primary_key=True)
    partido_id = db.Column(db.Integer, db.ForeignKey('partidos.id'), nullable=False)
    jugador_id = db.Column(db.Integer, db.ForeignKey('jugadores.id'), nullable=False)

    # Tiempo
    minutos = db.Column(db.Float, default=0)

    # Puntos y tiros
    puntos = db.Column(db.Integer, default=0)
    tiros_2_intentados = db.Column(db.Integer, default=0)
    tiros_2_encestados = db.Column(db.Integer, default=0)
    tiros_3_intentados = db.Column(db.Integer, default=0)
    tiros_3_encestados = db.Column(db.Integer, default=0)
    tiros_libres_intentados = db.Column(db.Integer, default=0)
    tiros_libres_encestados = db.Column(db.Integer, default=0)

    # Rebotes
    rebotes_ofensivos = db.Column(db.Integer, default=0)
    rebotes_defensivos = db.Column(db.Integer, default=0)

    # Otras stats
    asistencias = db.Column(db.Integer, default=0)
    robos = db.Column(db.Integer, default=0)
    bloqueos = db.Column(db.Integer, default=0)
    perdidas = db.Column(db.Integer, default=0)
    faltas = db.Column(db.Integer, default=0)

    # Calificación calculada
    calificacion = db.Column(db.String(3), nullable=True)
    eficiencia = db.Column(db.Float, default=0)

    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    @property
    def rebotes_totales(self):
        return self.rebotes_ofensivos + self.rebotes_defensivos

    @property
    def tiros_campo_intentados(self):
        return self.tiros_2_intentados + self.tiros_3_intentados

    @property
    def tiros_campo_encestados(self):
        return self.tiros_2_encestados + self.tiros_3_encestados

    @property
    def porcentaje_tc(self):
        if self.tiros_campo_intentados == 0:
            return 0
        return round(self.tiros_campo_encestados / self.tiros_campo_intentados * 100, 1)

    @property
    def porcentaje_tl(self):
        if self.tiros_libres_intentados == 0:
            return 0
        return round(self.tiros_libres_encestados / self.tiros_libres_intentados * 100, 1)

    def calcular_eficiencia(self):
        """Fórmula de eficiencia estilo NBA"""
        pos = (self.puntos + self.rebotes_totales + self.asistencias +
               self.robos + self.bloqueos)
        neg = ((self.tiros_campo_intentados - self.tiros_campo_encestados) +
               (self.tiros_libres_intentados - self.tiros_libres_encestados) +
               self.perdidas)
        return pos - neg

    def calcular_calificacion(self):
        """Calificación A+/A/B+/B/C+/C/D basada en eficiencia"""
        eff = self.calcular_eficiencia()
        if eff >= 28:
            return 'A+'
        elif eff >= 22:
            return 'A'
        elif eff >= 17:
            return 'B+'
        elif eff >= 12:
            return 'B'
        elif eff >= 8:
            return 'C+'
        elif eff >= 4:
            return 'C'
        else:
            return 'D'

    def to_dict(self):
        return {
            'id': self.id,
            'partido_id': self.partido_id,
            'jugador_id': self.jugador_id,
            'minutos': self.minutos,
            'puntos': self.puntos,
            'tiros_2_intentados': self.tiros_2_intentados,
            'tiros_2_encestados': self.tiros_2_encestados,
            'tiros_3_intentados': self.tiros_3_intentados,
            'tiros_3_encestados': self.tiros_3_encestados,
            'tiros_libres_intentados': self.tiros_libres_intentados,
            'tiros_libres_encestados': self.tiros_libres_encestados,
            'rebotes_ofensivos': self.rebotes_ofensivos,
            'rebotes_defensivos': self.rebotes_defensivos,
            'rebotes_totales': self.rebotes_totales,
            'asistencias': self.asistencias,
            'robos': self.robos,
            'bloqueos': self.bloqueos,
            'perdidas': self.perdidas,
            'faltas': self.faltas,
            'porcentaje_tc': self.porcentaje_tc,
            'porcentaje_tl': self.porcentaje_tl,
            'calificacion': self.calificacion,
            'eficiencia': self.eficiencia
        }


class StatRival(db.Model):
    __tablename__ = 'stats_rival'
    id = db.Column(db.Integer, primary_key=True)
    partido_id = db.Column(db.Integer, db.ForeignKey('partidos.id'), nullable=False)

    puntos = db.Column(db.Integer, default=0)
    rebotes = db.Column(db.Integer, default=0)
    asistencias = db.Column(db.Integer, default=0)
    robos = db.Column(db.Integer, default=0)
    bloqueos = db.Column(db.Integer, default=0)
    perdidas = db.Column(db.Integer, default=0)
    faltas = db.Column(db.Integer, default=0)
    tiros_campo_intentados = db.Column(db.Integer, default=0)
    tiros_campo_encestados = db.Column(db.Integer, default=0)
    tiros_3_intentados = db.Column(db.Integer, default=0)
    tiros_3_encestados = db.Column(db.Integer, default=0)
    tiros_libres_intentados = db.Column(db.Integer, default=0)
    tiros_libres_encestados = db.Column(db.Integer, default=0)

    @property
    def porcentaje_tc(self):
        if self.tiros_campo_intentados == 0:
            return 0
        return round(self.tiros_campo_encestados / self.tiros_campo_intentados * 100, 1)

    def to_dict(self):
        return {
            'id': self.id,
            'partido_id': self.partido_id,
            'puntos': self.puntos,
            'rebotes': self.rebotes,
            'asistencias': self.asistencias,
            'robos': self.robos,
            'bloqueos': self.bloqueos,
            'perdidas': self.perdidas,
            'faltas': self.faltas,
            'tiros_campo_intentados': self.tiros_campo_intentados,
            'tiros_campo_encestados': self.tiros_campo_encestados,
            'tiros_3_intentados': self.tiros_3_intentados,
            'tiros_3_encestados': self.tiros_3_encestados,
            'tiros_libres_intentados': self.tiros_libres_intentados,
            'tiros_libres_encestados': self.tiros_libres_encestados,
            'porcentaje_tc': self.porcentaje_tc
        }


class AnalisisIA(db.Model):
    __tablename__ = 'analisis_ia'
    id = db.Column(db.Integer, primary_key=True)
    partido_id = db.Column(db.Integer, db.ForeignKey('partidos.id'), nullable=True)
    temporada_id = db.Column(db.Integer, db.ForeignKey('temporadas.id'), nullable=True)
    tipo = db.Column(db.String(20), nullable=False)  # 'partido' o 'temporada'
    contenido = db.Column(db.Text, nullable=False)
    modelo = db.Column(db.String(50), default='claude-sonnet-4-6')
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'partido_id': self.partido_id,
            'temporada_id': self.temporada_id,
            'tipo': self.tipo,
            'contenido': self.contenido,
            'modelo': self.modelo,
            'created_at': self.created_at.isoformat()
        }
