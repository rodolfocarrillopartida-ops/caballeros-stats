from flask import Blueprint, request, send_file, jsonify
from models import db, Partido, StatJugador, Jugador, Temporada, StatRival
from reportlab.lib.pagesizes import letter, landscape
from reportlab.lib import colors
from reportlab.lib.units import inch
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, HRFlowable
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT
from io import BytesIO
from datetime import datetime

bp = Blueprint('reportes', __name__, url_prefix='/api/reportes')

# Colores Caballeros
ROJO = colors.HexColor('#C8102E')
NEGRO = colors.HexColor('#1A1A1A')
GRIS_CLARO = colors.HexColor('#F5F5F5')
GRIS_MEDIO = colors.HexColor('#E0E0E0')
BLANCO = colors.white


def header_style():
    return ParagraphStyle(
        'Header',
        fontName='Helvetica-Bold',
        fontSize=18,
        textColor=ROJO,
        spaceAfter=4,
        alignment=TA_CENTER
    )


def subheader_style():
    return ParagraphStyle(
        'SubHeader',
        fontName='Helvetica-Bold',
        fontSize=12,
        textColor=NEGRO,
        spaceAfter=4,
        alignment=TA_CENTER
    )


def normal_style():
    return ParagraphStyle(
        'Normal2',
        fontName='Helvetica',
        fontSize=9,
        textColor=NEGRO,
        spaceAfter=2
    )


@bp.route('/partido/<int:partido_id>', methods=['GET'])
def reporte_partido(partido_id):
    """Genera PDF con estadísticas del partido"""
    p = Partido.query.get_or_404(partido_id)
    stats = StatJugador.query.filter_by(partido_id=partido_id).all()
    rival_stats = p.stats_rival

    buf = BytesIO()
    doc = SimpleDocTemplate(buf, pagesize=landscape(letter),
                            rightMargin=0.5*inch, leftMargin=0.5*inch,
                            topMargin=0.5*inch, bottomMargin=0.5*inch)
    elements = []

    # Título
    resultado = 'VICTORIA' if p.resultado == 'V' else 'DERROTA'
    color_res = ROJO
    elements.append(Paragraph("CABALLEROS DE CULIACÁN", header_style()))
    elements.append(Paragraph(f"CIBACOPA — Reporte de Partido", subheader_style()))
    elements.append(Spacer(1, 8))
    elements.append(HRFlowable(width="100%", thickness=2, color=ROJO))
    elements.append(Spacer(1, 8))

    # Info del partido
    fecha_str = p.fecha.strftime('%d de %B de %Y') if p.fecha else 'N/A'
    local_vis = 'Local' if p.es_local else 'Visitante'
    info_data = [
        ['Rival:', p.rival, 'Fecha:', fecha_str, 'Fase:', p.fase],
        ['Resultado:', f"{resultado}  {p.puntos_caballeros}–{p.puntos_rival}", 'Sede:', local_vis, '', '']
    ]
    info_table = Table(info_data, colWidths=[1.2*inch, 2*inch, 0.8*inch, 2*inch, 0.8*inch, 1.5*inch])
    info_table.setStyle(TableStyle([
        ('FONTNAME', (0, 0), (-1, -1), 'Helvetica'),
        ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
        ('FONTNAME', (2, 0), (2, -1), 'Helvetica-Bold'),
        ('FONTNAME', (4, 0), (4, -1), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 9),
        ('TEXTCOLOR', (0, 0), (-1, -1), NEGRO),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
    ]))
    elements.append(info_table)
    elements.append(Spacer(1, 10))

    # Tabla de stats jugadores
    elements.append(Paragraph("ESTADÍSTICAS DE JUGADORES", subheader_style()))
    elements.append(Spacer(1, 4))

    headers = ['#', 'Jugador', 'Pos', 'Min', 'PTS', 'RO', 'RD', 'RET', 'AST', 'ROB', 'BLQ', 'PÉR', 'FLT',
               'TC', '3P', 'TL', '%TC', '%3P', '%TL', 'EFF', 'CAL']
    table_data = [headers]

    for s in sorted(stats, key=lambda x: x.jugador.numero if x.jugador else 99):
        j = s.jugador
        row = [
            str(j.numero) if j else '?',
            j.nombre if j else 'N/A',
            j.posicion[:3] if j else '',
            f"{s.minutos:.0f}",
            str(s.puntos),
            str(s.rebotes_ofensivos),
            str(s.rebotes_defensivos),
            str(s.rebotes_totales),
            str(s.asistencias),
            str(s.robos),
            str(s.bloqueos),
            str(s.perdidas),
            str(s.faltas),
            f"{s.tiros_campo_encestados}/{s.tiros_campo_intentados}",
            f"{s.tiros_3_encestados}/{s.tiros_3_intentados}",
            f"{s.tiros_libres_encestados}/{s.tiros_libres_intentados}",
            f"{s.porcentaje_tc}%",
            f"{round(s.tiros_3_encestados/s.tiros_3_intentados*100,0) if s.tiros_3_intentados else 0}%",
            f"{s.porcentaje_tl}%",
            f"{s.eficiencia:.0f}",
            s.calificacion or '-'
        ]
        table_data.append(row)

    # Totales
    if stats:
        tot = ['', 'TOTALES', '', '',
               str(sum(s.puntos for s in stats)),
               str(sum(s.rebotes_ofensivos for s in stats)),
               str(sum(s.rebotes_defensivos for s in stats)),
               str(sum(s.rebotes_totales for s in stats)),
               str(sum(s.asistencias for s in stats)),
               str(sum(s.robos for s in stats)),
               str(sum(s.bloqueos for s in stats)),
               str(sum(s.perdidas for s in stats)),
               str(sum(s.faltas for s in stats)),
               '', '', '', '', '', '', '', '']
        table_data.append(tot)

    col_widths = [0.35*inch, 1.8*inch, 0.45*inch, 0.4*inch, 0.4*inch, 0.35*inch, 0.35*inch,
                  0.4*inch, 0.4*inch, 0.4*inch, 0.4*inch, 0.4*inch, 0.4*inch,
                  0.65*inch, 0.55*inch, 0.55*inch, 0.5*inch, 0.5*inch, 0.5*inch, 0.4*inch, 0.4*inch]

    stat_table = Table(table_data, colWidths=col_widths)
    style = TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), NEGRO),
        ('TEXTCOLOR', (0, 0), (-1, 0), BLANCO),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 7.5),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('ALIGN', (1, 1), (1, -1), 'LEFT'),
        ('ROWBACKGROUNDS', (0, 1), (-1, -2), [BLANCO, GRIS_CLARO]),
        ('BACKGROUND', (0, -1), (-1, -1), GRIS_MEDIO),
        ('FONTNAME', (0, -1), (-1, -1), 'Helvetica-Bold'),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#CCCCCC')),
        ('LINEBELOW', (0, 0), (-1, 0), 1, ROJO),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
        ('TOPPADDING', (0, 0), (-1, -1), 3),
    ])

    # Colorear calificaciones
    for i, s in enumerate(stats, start=1):
        cal = s.calificacion
        if cal in ('A+', 'A'):
            style.add('TEXTCOLOR', (-1, i), (-1, i), colors.HexColor('#27AE60'))
            style.add('FONTNAME', (-1, i), (-1, i), 'Helvetica-Bold')
        elif cal == 'D':
            style.add('TEXTCOLOR', (-1, i), (-1, i), ROJO)

    stat_table.setStyle(style)
    elements.append(stat_table)

    # Stats rival
    if rival_stats:
        elements.append(Spacer(1, 10))
        elements.append(Paragraph(f"ESTADÍSTICAS DEL RIVAL — {p.rival.upper()}", subheader_style()))
        elements.append(Spacer(1, 4))
        rival_data = [
            ['PTS', 'REB', 'AST', 'ROB', 'BLQ', 'PÉR', 'FLT', 'TC', '%TC', 'TL'],
            [
                str(rival_stats.puntos), str(rival_stats.rebotes), str(rival_stats.asistencias),
                str(rival_stats.robos), str(rival_stats.bloqueos), str(rival_stats.perdidas),
                str(rival_stats.faltas),
                f"{rival_stats.tiros_campo_encestados}/{rival_stats.tiros_campo_intentados}",
                f"{rival_stats.porcentaje_tc}%",
                f"{rival_stats.tiros_libres_encestados}/{rival_stats.tiros_libres_intentados}"
            ]
        ]
        rt = Table(rival_data, colWidths=[0.7*inch]*10)
        rt.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), ROJO),
            ('TEXTCOLOR', (0, 0), (-1, 0), BLANCO),
            ('FONTNAME', (0, 0), (-1, -1), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 9),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('GRID', (0, 0), (-1, -1), 0.5, GRIS_MEDIO),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ]))
        elements.append(rt)

    # Footer
    elements.append(Spacer(1, 12))
    elements.append(HRFlowable(width="100%", thickness=1, color=GRIS_MEDIO))
    elements.append(Paragraph(
        f"Generado el {datetime.now().strftime('%d/%m/%Y %H:%M')} — Sistema de Estadísticas Caballeros de Culiacán",
        ParagraphStyle('Footer', fontName='Helvetica', fontSize=7, textColor=colors.grey, alignment=TA_CENTER)
    ))

    doc.build(elements)
    buf.seek(0)
    filename = f"caballeros_partido_{p.id}_{p.rival.replace(' ', '_')}.pdf"
    return send_file(buf, mimetype='application/pdf', as_attachment=True, download_name=filename)


@bp.route('/temporada/<int:temporada_id>', methods=['GET'])
def reporte_temporada(temporada_id):
    """PDF con promedios de todos los jugadores en la temporada"""
    temporada = Temporada.query.get_or_404(temporada_id)
    jugadores = Jugador.query.filter_by(temporada_id=temporada_id).all()
    partidos = Partido.query.filter_by(temporada_id=temporada_id).all()

    buf = BytesIO()
    doc = SimpleDocTemplate(buf, pagesize=landscape(letter),
                            rightMargin=0.5*inch, leftMargin=0.5*inch,
                            topMargin=0.5*inch, bottomMargin=0.5*inch)
    elements = []

    elements.append(Paragraph("CABALLEROS DE CULIACÁN", header_style()))
    elements.append(Paragraph(f"CIBACOPA {temporada.anio} — Reporte de Temporada: {temporada.nombre}", subheader_style()))
    elements.append(Spacer(1, 8))
    elements.append(HRFlowable(width="100%", thickness=2, color=ROJO))
    elements.append(Spacer(1, 8))

    # Récord
    total = len(partidos)
    victorias = sum(1 for p in partidos if p.resultado == 'V')
    derrotas = total - victorias
    elements.append(Paragraph(
        f"Récord: {victorias}V - {derrotas}D  ({round(victorias/total*100,1) if total > 0 else 0}% victorias)  |  {total} partidos jugados",
        ParagraphStyle('Record', fontName='Helvetica-Bold', fontSize=11, textColor=NEGRO, alignment=TA_CENTER, spaceAfter=8)
    ))

    headers = ['#', 'Jugador', 'Pos', 'PJ', 'PTS', 'REB', 'AST', 'ROB', 'BLQ', 'PÉR', 'FLT', '%TC', '%3P', '%TL', 'EFF', 'CAL']
    table_data = [headers]

    for j in sorted(jugadores, key=lambda x: x.numero):
        stats = StatJugador.query.filter_by(jugador_id=j.id).all()
        n = len(stats)
        if n == 0:
            continue
        prom = lambda attr: round(sum(getattr(s, attr) for s in stats) / n, 1)
        prom_pts = prom('puntos')
        prom_reb = round(sum(s.rebotes_totales for s in stats) / n, 1)
        prom_ast = prom('asistencias')
        prom_rob = prom('robos')
        prom_blq = prom('bloqueos')
        prom_per = prom('perdidas')
        prom_flt = prom('faltas')
        prom_eff = round(sum(s.eficiencia for s in stats) / n, 1)

        tci = sum(s.tiros_campo_intentados for s in stats)
        tce = sum(s.tiros_campo_encestados for s in stats)
        t3i = sum(s.tiros_3_intentados for s in stats)
        t3e = sum(s.tiros_3_encestados for s in stats)
        tli = sum(s.tiros_libres_intentados for s in stats)
        tle = sum(s.tiros_libres_encestados for s in stats)
        pct_tc = f"{round(tce/tci*100,1)}%" if tci > 0 else "0%"
        pct_3p = f"{round(t3e/t3i*100,1)}%" if t3i > 0 else "0%"
        pct_tl = f"{round(tle/tli*100,1)}%" if tli > 0 else "0%"

        calificaciones = [s.calificacion for s in stats if s.calificacion]
        orden = ['A+', 'A', 'B+', 'B', 'C+', 'C', 'D']
        cal_prom = '-'
        if calificaciones:
            indices = [orden.index(c) for c in calificaciones if c in orden]
            if indices:
                cal_prom = orden[round(sum(indices) / len(indices))]

        table_data.append([
            str(j.numero), j.nombre, j.posicion[:3], str(n),
            str(prom_pts), str(prom_reb), str(prom_ast), str(prom_rob),
            str(prom_blq), str(prom_per), str(prom_flt),
            pct_tc, pct_3p, pct_tl, str(prom_eff), cal_prom
        ])

    col_widths = [0.35*inch, 2*inch, 0.5*inch, 0.4*inch, 0.5*inch, 0.5*inch, 0.5*inch,
                  0.5*inch, 0.5*inch, 0.5*inch, 0.45*inch, 0.55*inch, 0.55*inch, 0.55*inch, 0.5*inch, 0.45*inch]

    t = Table(table_data, colWidths=col_widths)
    t.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), NEGRO),
        ('TEXTCOLOR', (0, 0), (-1, 0), BLANCO),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 8),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('ALIGN', (1, 1), (1, -1), 'LEFT'),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [BLANCO, GRIS_CLARO]),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#CCCCCC')),
        ('LINEBELOW', (0, 0), (-1, 0), 1, ROJO),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
    ]))
    elements.append(t)

    elements.append(Spacer(1, 12))
    elements.append(Paragraph(
        f"*Promedios por partido  |  Generado el {datetime.now().strftime('%d/%m/%Y %H:%M')} — Sistema Estadísticas Caballeros de Culiacán",
        ParagraphStyle('Footer', fontName='Helvetica', fontSize=7, textColor=colors.grey, alignment=TA_CENTER)
    ))

    doc.build(elements)
    buf.seek(0)
    filename = f"caballeros_temporada_{temporada.anio}_{temporada.nombre.replace(' ', '_')}.pdf"
    return send_file(buf, mimetype='application/pdf', as_attachment=True, download_name=filename)
