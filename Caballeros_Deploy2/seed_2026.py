#!/usr/bin/env python3
"""
seed_2026.py — Carga la Temporada 2026 de Caballeros de Culiacán (CIBACOPA)
Datos reales extraídos de sofascore.com y cibacopa.mx
Equipos correctos 2026: sin Soles de Mexicali; incluye Zonkeys de Tijuana y Rayos de Hermosillo

Ejecutar UNA sola vez desde la carpeta caballeros_stats/:
    python3 seed_2026.py

Carga:
  · Temporada 2026 (activa)
  · Plantel real de 28 jugadores
  · Promedios de temporada por jugador (1 entrada de stats agregadas)
"""
import os, sys
from datetime import date

sys.path.insert(0, os.path.dirname(__file__))
from app import create_app
from models import db, Temporada, Jugador, Partido, StatJugador, StatRival

app = create_app()

PLANTEL = [
    ("Torren Jones",            9,  "Pívot"),
    ("Roddy Peters",            5,  "Base"),
    ("Johnny Hughes III",      11,  "Alero"),
    ("Tre McCallum",           22,  "Alero"),
    ("Ralph Bissainthe",        1,  "Alero"),
    ("Shemarri Allen",          4,  "Escolta"),
    ("Brandon Alston",         10,  "Escolta"),
    ("Isaac Hamilton",         15,  "Escolta"),
    ("Nana Appiah",            15,  "Ala-Pívot"),
    ("Brandon Porter",          4,  "Alero"),
    ("Rashad Smith",            4,  "Escolta"),
    ("Hollis Thompson",        23,  "Alero"),
    ("Nikolas Tomsick",        55,  "Base"),
    ("Isaiah Powell",           1,  "Alero"),
    ("Juan Contreras",          7,  "Escolta"),
    ("Jose Miguel Martinez",   33,  "Pívot"),
    ("Reno Valle",              8,  "Base"),
    ("Abdul Bah",              55,  "Escolta"),
    ("Tyrik Armstrong",         7,  "Base"),
    ("Devin Evans",            22,  "Ala-Pívot"),
    ("Irwin Avalos-Bonilla",    8,  "Ala-Pívot"),
    ("Eder Herrera",           10,  "Escolta"),
    ("Luis Morachis",          12,  "Ala-Pívot"),
    ("Dominique Coursey",      55,  "Escolta"),
    ("Barry Ogalue",            1,  "Alero"),
    ("Lamar Peters",            0,  "Base"),
    ("Charles García Jr.",      6,  "Alero"),
    ("Omar Ayala",              8,  "Alero"),
]

STATS_TEMPORADA = [
    ("Torren Jones",          44, 1480,  315, 537,   0,   7, 163, 249, 126, 273,  59, 53, 14,  73,  793),
    ("Roddy Peters",          44, 1401,  225, 400,  52, 144, 166, 205,  21, 135, 364, 84,  9, 158,  772),
    ("Johnny Hughes III",     44, 1146,  159, 286,  33,  93, 193, 224,  54, 188,  46, 61, 30,  60,  610),
    ("Tre McCallum",          31, 1038,  133, 243,  66, 164,  72,  94,  20, 137,  70, 45, 20,  59,  536),
    ("Isaac Hamilton",        20,  602,   67, 122,  42, 120,  16,  19,  32,  78,  92, 26,  7,  57,  276),
    ("Brandon Porter",        22,  510,   60,  98,  37,  98,  39,  62,  16,  73,  18, 30, 15,  41,  270),
    ("Ralph Bissainthe",      15,  441,   36,  78,  26,  73,  39,  53,  12,  45,  13, 13,  6,  14,  189),
    ("Rashad Smith",          17,  431,   21,  43,  20,  52,  23,  31,   7,  36,  39, 20,  4,  24,  125),
    ("Brandon Alston",        16,  307,   26,  54,  15,  33,  12,  25,   2,  22,  32, 10,  0,  15,  109),
    ("Shemarri Allen",        15,  369,   23,  36,   3,  14,  20,  31,  11,  33,  31, 15,  9,  17,   75),
    ("Nana Appiah",           15,  248,   21,  41,   6,  20,   9,  16,   5,  21,  13,  5,  0,   8,   69),
    ("Nikolas Tomsick",        7,  166,    8,  20,  10,  30,   1,   4,   2,  10,   6, 12,  0,  13,   47),
    ("Charles García Jr.",     4,   69,    6,  17,   4,   8,   8,  12,   6,  13,   4,  3,  1,   2,   32),
    ("Hollis Thompson",        5,  115,    8,  23,   5,  16,   0,   3,   3,  14,   6,  1,  3,   6,   31),
    ("Isaiah Powell",         10,   98,    4,   7,   6,  15,   0,   1,   1,  10,   6,  4,  2,   6,   26),
    ("Juan Contreras",        18,  182,    1,   7,   5,  22,   0,   0,   6,  19,  13,  6,  1,   2,   17),
    ("Jose Miguel Martinez",  19,  131,    5,  12,   1,   3,   4,   6,  11,  17,   3,  1,  2,   8,   17),
    ("Devin Evans",            5,   53,    4,   7,   1,   3,   1,   4,   2,   6,   4,  2,  0,   2,   12),
    ("Tyrik Armstrong",        4,   65,    5,  13,   0,   4,   1,   2,   2,   6,   9,  2,  0,   4,   11),
    ("Reno Valle",            18,   87,    1,   3,   6,  16,   0,   0,   0,   7,   4,  3,  0,   3,   20),
    ("Abdul Bah",              6,   69,    2,   6,   3,  12,   4,   4,   1,   6,   7,  1,  0,   7,   17),
    ("Irwin Avalos-Bonilla",   0,    0,    0,   0,   0,   0,   0,   0,   0,   0,   0,  0,  0,   0,    0),
    ("Eder Herrera",          11,   31,    1,   3,   0,   1,   0,   5,   1,   1,   1,  0,  0,   1,    2),
    ("Luis Morachis",          8,   15,    0,   2,   1,   1,   0,   0,   0,   3,   0,  1,  0,   0,    3),
    ("Dominique Coursey",      6,   24,    1,   4,   0,   1,   0,   0,   2,   1,   2,  4,  0,   1,    2),
    ("Barry Ogalue",           2,   18,    1,   3,   2,   3,   0,   0,   1,   3,   1,  0,  0,   0,    8),
    ("Omar Ayala",             1,    2,    0,   1,   0,   0,   0,   0,   0,   0,   0,  0,  0,   0,    0),
    ("Lamar Peters",           0,    0,    0,   0,   0,   0,   0,   0,   0,   0,   0,  0,  0,   0,    0),
]

PARTIDOS = [
    (date(2026,  2, 22), "Venados de Mazatlán",               95,  83, True,  "Regular"),
    (date(2026,  2, 23), "Venados de Mazatlán",               79,  98, True,  "Regular"),
    (date(2026,  3, 23), "Zonkeys de Tijuana",                 90,  88, True,  "Regular"),
    (date(2026,  3, 25), "Astros de Jalisco",                  86, 103, False, "Regular"),
    (date(2026,  3, 26), "Astros de Jalisco",                  98, 105, False, "Regular"),
    (date(2026,  3, 29), "Toros Laguna",                       87,  91, True,  "Regular"),
    (date(2026,  3, 30), "Toros Laguna",                       88,  74, True,  "Regular"),
    (date(2026,  4,  1), "Ángeles de la Ciudad de México",     85,  88, False, "Regular"),
    (date(2026,  4,  2), "Ángeles de la Ciudad de México",     88,  97, False, "Regular"),
    (date(2026,  4,  5), "Halcones de Ciudad Obregón",        137, 143, True,  "Regular"),
    (date(2026,  4,  6), "Halcones de Ciudad Obregón",         78,  82, True,  "Regular"),
    (date(2026,  4,  8), "Astros de Jalisco",                  75,  92, True,  "Regular"),
    (date(2026,  4,  9), "Astros de Jalisco",                  79, 102, True,  "Regular"),
    (date(2026,  4, 11), "Venados de Mazatlán",               110, 103, False, "Regular"),
    (date(2026,  4, 12), "Venados de Mazatlán",               101,  92, False, "Regular"),
    (date(2026,  4, 13), "Rayos de Hermosillo",                88,  79, True,  "Regular"),
    (date(2026,  4, 14), "Rayos de Hermosillo",                91,  82, True,  "Regular"),
    (date(2026,  4, 16), "Pioneros de Los Mochis",             95,  88, True,  "Regular"),
    (date(2026,  4, 17), "Pioneros de Los Mochis",             84,  90, True,  "Regular"),
    (date(2026,  4, 19), "Halcones de Ciudad Obregón",         88,  91, False, "Regular"),
    (date(2026,  4, 20), "Halcones de Ciudad Obregón",         93,  87, False, "Regular"),
    (date(2026,  4, 22), "Frayles de Guasave",                 96,  80, True,  "Regular"),
    (date(2026,  4, 23), "Frayles de Guasave",                 93,  88, True,  "Regular"),
    (date(2026,  4, 25), "Zonkeys de Tijuana",                 86,  82, False, "Regular"),
    (date(2026,  4, 26), "Zonkeys de Tijuana",                114,  94, False, "Regular"),
    (date(2026,  4, 27), "Zonkeys de Tijuana",                 91,  85, True,  "Regular"),
    (date(2026,  4, 29), "Ángeles de la Ciudad de México",     94,  89, True,  "Regular"),
    (date(2026,  4, 30), "Ángeles de la Ciudad de México",     85,  92, True,  "Regular"),
    (date(2026,  5,  2), "Frayles de Guasave",                 87,  93, False, "Regular"),
    (date(2026,  5,  3), "Frayles de Guasave",                 91,  85, False, "Regular"),
    (date(2026,  5,  5), "Ostioneros de Guaymas",              89,  96, False, "Regular"),
    (date(2026,  5,  6), "Ostioneros de Guaymas",              85,  91, False, "Regular"),
    (date(2026,  5,  7), "Toros Laguna",                       82,  88, False, "Regular"),
    (date(2026,  5,  9), "Toros Laguna",                       89, 102, False, "Regular"),
    (date(2026,  5, 11), "Rayos de Hermosillo",                87,  95, False, "Regular"),
    (date(2026,  5, 12), "Rayos de Hermosillo",                93,  89, False, "Regular"),
    (date(2026,  5, 15), "Ostioneros de Guaymas",              96, 106, True,  "Regular"),
    (date(2026,  5, 16), "Ostioneros de Guaymas",              94,  81, True,  "Regular"),
    (date(2026,  5, 18), "Pioneros de Los Mochis",             88,  97, False, "Regular"),
    (date(2026,  5, 20), "Pioneros de Los Mochis",             88,  95, False, "Regular"),
    (date(2026,  5, 22), "Astros de Jalisco",                  94,  86, False, "Playoffs"),
    (date(2026,  5, 23), "Astros de Jalisco",                  84, 112, False, "Playoffs"),
    (date(2026,  5, 26), "Astros de Jalisco",                  80,  94, True,  "Playoffs"),
    (date(2026,  5, 27), "Astros de Jalisco",                  87,  95, True,  "Playoffs"),
    (date(2026,  5, 29), "Astros de Jalisco",                 103, 105, True,  "Playoffs"),
]


def seed():
    with app.app_context():
        existe = Temporada.query.filter_by(anio=2026).first()
        if existe:
            print("⚠️  Ya existe una temporada 2026 en la base de datos.")
            resp = input("   ¿Deseas eliminarla y recrearla? (s/N): ").strip().lower()
            if resp != 's':
                print("Cancelado.")
                return
            db.session.delete(existe)
            db.session.commit()
            print("   Temporada anterior eliminada.\n")

        print("📅 Creando Temporada 2026...")
        temporada = Temporada(
            nombre="Temporada 2026",
            anio=2026,
            activa=True,
            fecha_inicio=date(2026, 2, 22),
            fecha_fin=date(2026, 5, 29),
        )
        db.session.add(temporada)
        db.session.flush()

        print(f"🏀 Cargando {len(PLANTEL)} jugadores...")
        jugadores_map = {}
        for nombre, numero, posicion in PLANTEL:
            j = Jugador(
                temporada_id=temporada.id,
                nombre=nombre,
                numero=numero,
                posicion=posicion,
                activo=True,
            )
            db.session.add(j)
            db.session.flush()
            jugadores_map[nombre] = j

        print(f"📋 Cargando {len(PARTIDOS)} partidos...")
        victorias = sum(1 for p in PARTIDOS if p[2] > p[3])
        derrotas  = sum(1 for p in PARTIDOS if p[2] < p[3])

        primer_partido = None
        for i, (fecha, rival, pts_cab, pts_rival, es_local, fase) in enumerate(PARTIDOS):
            resultado = 'V' if pts_cab > pts_rival else 'L'
            partido = Partido(
                temporada_id=temporada.id,
                fecha=fecha,
                rival=rival,
                puntos_caballeros=pts_cab,
                puntos_rival=pts_rival,
                resultado=resultado,
                es_local=es_local,
                fase=fase,
                notas='Marcador importado automáticamente.' if fase == 'Regular' else 'Playoffs 2026.',
            )
            db.session.add(partido)
            db.session.flush()
            db.session.add(StatRival(partido_id=partido.id, puntos=pts_rival))
            if i == 0:
                primer_partido = partido

        print(f"📊 Cargando stats de {len(STATS_TEMPORADA)} jugadores...")
        for (nombre, G, MIN, FGM, FGA, T3M, T3A, FTM, FTA, RO, RD, AST, ST, BS, TO, PTS) in STATS_TEMPORADA:
            if G == 0 or nombre not in jugadores_map:
                continue
            jugador = jugadores_map[nombre]
            T2M = FGM - T3M
            T2A = FGA - T3A
            stat = StatJugador(
                partido_id=primer_partido.id,
                jugador_id=jugador.id,
                minutos=round(MIN / G, 1),
                puntos=round(PTS / G, 1) if G > 0 else 0,
                tiros_2_intentados=round(T2A / G, 1),
                tiros_2_encestados=round(T2M / G, 1),
                tiros_3_intentados=round(T3A / G, 1),
                tiros_3_encestados=round(T3M / G, 1),
                tiros_libres_intentados=round(FTA / G, 1),
                tiros_libres_encestados=round(FTM / G, 1),
                rebotes_ofensivos=round(RO / G, 1),
                rebotes_defensivos=round(RD / G, 1),
                asistencias=round(AST / G, 1),
                robos=round(ST / G, 1),
                bloqueos=round(BS / G, 1),
                perdidas=round(TO / G, 1),
                faltas=0,
            )
            stat.eficiencia   = stat.calcular_eficiencia()
            stat.calificacion = stat.calcular_calificacion()
            db.session.add(stat)

        db.session.commit()

        print()
        print("=" * 58)
        print("  ✅  TEMPORADA 2026 CARGADA EXITOSAMENTE")
        print("=" * 58)
        print(f"  Jugadores : {len(PLANTEL)}")
        print(f"  Partidos  : {len(PARTIDOS)}  ({victorias}V - {derrotas}L)")
        print()
        print("  LÍDERES DEL EQUIPO:")
        top = sorted([(n, PTS/G if G else 0) for n,G,_,_,_,_,_,_,_,_,_,_,_,_,_,PTS in STATS_TEMPORADA if G > 0], key=lambda x: -x[1])[:5]
        for nombre, ppg in top:
            print(f"    {nombre:<30} {ppg:.1f} ppg")
        print("=" * 58)
        print()


if __name__ == '__main__':
    seed()
