#!/usr/bin/env python3
"""
importar_stats.py — Importa estadísticas individuales desde un CSV
Uso:
    python3 importar_stats.py stats_juego.csv

El CSV debe seguir el formato de plantilla_stats.csv (incluida en el ZIP).
Cada fila = stats de 1 jugador en 1 partido.

Si el partido (por rival+fecha) no existe, lo crea automáticamente.
Si el jugador (por nombre) no está en el plantel activo, lo agrega.
"""
import os
import sys
import csv
from datetime import datetime, date

sys.path.insert(0, os.path.dirname(__file__))
from app import create_app
from models import db, Temporada, Jugador, Partido, StatJugador, StatRival

app = create_app()

COLUMNAS_REQUERIDAS = [
    'fecha', 'rival', 'jugador', 'minutos',
    'puntos',
    'tiros_2_int', 'tiros_2_enc',
    'tiros_3_int', 'tiros_3_enc',
    'tiros_libres_int', 'tiros_libres_enc',
    'rebotes_of', 'rebotes_def',
    'asistencias', 'robos', 'bloqueos', 'perdidas', 'faltas',
]

def parse_date(s):
    for fmt in ('%Y-%m-%d', '%d/%m/%Y', '%d-%m-%Y'):
        try:
            return datetime.strptime(s.strip(), fmt).date()
        except ValueError:
            pass
    raise ValueError(f"Fecha no reconocida: '{s}'. Usa YYYY-MM-DD o DD/MM/YYYY")

def int_safe(v, default=0):
    try:
        return int(str(v).strip())
    except (ValueError, TypeError):
        return default

def float_safe(v, default=0.0):
    try:
        return float(str(v).strip())
    except (ValueError, TypeError):
        return default


def importar(csv_path):
    if not os.path.exists(csv_path):
        print(f"❌ No encontré el archivo: {csv_path}")
        sys.exit(1)

    with app.app_context():
        # Temporada activa
        temporada = Temporada.query.filter_by(activa=True).first()
        if not temporada:
            print("❌ No hay temporada activa. Ejecuta seed_2026.py primero.")
            sys.exit(1)

        print(f"📅 Temporada activa: {temporada.nombre}")

        with open(csv_path, newline='', encoding='utf-8-sig') as f:
            reader = csv.DictReader(f)
            filas = list(reader)

        if not filas:
            print("⚠️  El CSV está vacío.")
            return

        # Validar columnas
        cols_csv = set(reader.fieldnames or [])
        faltantes = [c for c in COLUMNAS_REQUERIDAS if c not in cols_csv]
        if faltantes:
            print(f"❌ Columnas faltantes en el CSV: {', '.join(faltantes)}")
            print(f"   Columnas encontradas: {', '.join(cols_csv)}")
            sys.exit(1)

        # Cache de partidos y jugadores para no consultar la BD en cada fila
        cache_partidos = {}   # (fecha_iso, rival_lower) → Partido
        cache_jugadores = {}  # nombre_lower → Jugador

        # Pre-cargar existentes
        for p in Partido.query.filter_by(temporada_id=temporada.id).all():
            cache_partidos[(p.fecha.isoformat(), p.rival.lower())] = p
        for j in Jugador.query.filter_by(temporada_id=temporada.id).all():
            cache_jugadores[j.nombre.lower()] = j

        importados = 0
        omitidos = 0

        for i, fila in enumerate(filas, start=2):  # fila 1 = encabezado
            try:
                fecha   = parse_date(fila['fecha'])
                rival   = fila['rival'].strip()
                nombre  = fila['jugador'].strip()

                if not rival or not nombre:
                    print(f"  ⚠️  Fila {i}: rival o jugador vacío, se omite.")
                    omitidos += 1
                    continue

                # ── Partido ──────────────────────────────────────────────
                clave_p = (fecha.isoformat(), rival.lower())
                if clave_p not in cache_partidos:
                    pts_cab   = int_safe(fila.get('puntos_equipo', 0))
                    pts_rival = int_safe(fila.get('puntos_rival',  0))
                    es_local  = str(fila.get('es_local','1')).strip() not in ('0','false','no','False')
                    resultado = 'V' if pts_cab > pts_rival else ('L' if pts_cab < pts_rival else None)
                    partido = Partido(
                        temporada_id=temporada.id,
                        fecha=fecha,
                        rival=rival,
                        puntos_caballeros=pts_cab,
                        puntos_rival=pts_rival,
                        resultado=resultado,
                        es_local=es_local,
                        fase=fila.get('fase','Regular').strip() or 'Regular',
                    )
                    db.session.add(partido)
                    db.session.flush()
                    cache_partidos[clave_p] = partido
                    # Crear stats de rival vacías si no existen
                    if not StatRival.query.filter_by(partido_id=partido.id).first():
                        db.session.add(StatRival(partido_id=partido.id, puntos=pts_rival))
                partido = cache_partidos[clave_p]

                # ── Jugador ───────────────────────────────────────────────
                clave_j = nombre.lower()
                if clave_j not in cache_jugadores:
                    posicion = fila.get('posicion', 'Alero').strip() or 'Alero'
                    numero   = int_safe(fila.get('numero', 0))
                    jugador  = Jugador(
                        temporada_id=temporada.id,
                        nombre=nombre,
                        numero=numero,
                        posicion=posicion,
                        activo=True,
                    )
                    db.session.add(jugador)
                    db.session.flush()
                    cache_jugadores[clave_j] = jugador
                jugador = cache_jugadores[clave_j]

                # ── StatJugador ───────────────────────────────────────────
                # Si ya existe, actualizar; si no, crear
                stat = StatJugador.query.filter_by(
                    partido_id=partido.id,
                    jugador_id=jugador.id
                ).first()
                if not stat:
                    stat = StatJugador(partido_id=partido.id, jugador_id=jugador.id)
                    db.session.add(stat)

                stat.minutos                  = float_safe(fila['minutos'])
                stat.puntos                   = int_safe(fila['puntos'])
                stat.tiros_2_intentados       = int_safe(fila['tiros_2_int'])
                stat.tiros_2_encestados       = int_safe(fila['tiros_2_enc'])
                stat.tiros_3_intentados       = int_safe(fila['tiros_3_int'])
                stat.tiros_3_encestados       = int_safe(fila['tiros_3_enc'])
                stat.tiros_libres_intentados  = int_safe(fila['tiros_libres_int'])
                stat.tiros_libres_encestados  = int_safe(fila['tiros_libres_enc'])
                stat.rebotes_ofensivos        = int_safe(fila['rebotes_of'])
                stat.rebotes_defensivos       = int_safe(fila['rebotes_def'])
                stat.asistencias              = int_safe(fila['asistencias'])
                stat.robos                    = int_safe(fila['robos'])
                stat.bloqueos                 = int_safe(fila['bloqueos'])
                stat.perdidas                 = int_safe(fila['perdidas'])
                stat.faltas                   = int_safe(fila['faltas'])

                stat.eficiencia  = stat.calcular_eficiencia()
                stat.calificacion = stat.calcular_calificacion()

                importados += 1

            except Exception as e:
                print(f"  ❌ Error en fila {i}: {e}")
                omitidos += 1

        db.session.commit()

        print()
        print("=" * 48)
        print(f"  ✅  Importación completada")
        print(f"  Filas importadas : {importados}")
        print(f"  Filas omitidas   : {omitidos}")
        print("=" * 48)


if __name__ == '__main__':
    if len(sys.argv) < 2:
        print("Uso: python3 importar_stats.py <archivo.csv>")
        print("     python3 importar_stats.py plantilla_stats.csv")
        sys.exit(1)
    importar(sys.argv[1])
