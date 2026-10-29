# -*- coding: utf-8 -*-
"""
Generador de la libreta de calificaciones (PDF A4 apaisado, 3 páginas) con el
formato de la libreta oficial de PROA - Nivel Secundario:

  1) Informe de progreso escolar (notas Eval 1-8 con R1/R2, inasistencias, observaciones)
  2) Aprendizajes pendientes a evaluar en coloquio de diciembre/febrero
  3) Contratapa: períodos de coloquio (diciembre / febrero) + carátula

Uso:  pdf_bytes = generar_libreta_pdf(datos)    (ver `datos` al final del archivo)
"""
import io
import os
from reportlab.lib.pagesizes import A4, landscape
from reportlab.pdfgen import canvas

PAGE_W, PAGE_H = landscape(A4)           # 841.9 x 595.3
L, R = 28, PAGE_W - 28
ESCUDO = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'escudo-cordoba.png')

REGULAR, BOLD = 'Helvetica', 'Helvetica-Bold'
PLAN = 'INFORMATICA CON FORMACION ESPECIALIZADA EN DESARROLLO DE SOFTWARE'
DIRECCION = 'RÍO GALLEGOS 455 - RIO TERCERO - TERCERO ARRIBA - Tel'
CURSOS_TXT = {1: 'PRIMER', 2: 'SEGUNDO', 3: 'TERCER', 4: 'CUARTO', 5: 'QUINTO', 6: 'SEXTO'}


# ── helpers de dibujo (las y se miden desde ARRIBA, como en una página web) ──
def _y(y):
    return PAGE_H - y


def _txt(c, x, y, s, font=REGULAR, size=7, align='l'):
    c.setFont(font, size)
    if align == 'c':
        c.drawCentredString(x, _y(y), s)
    elif align == 'r':
        c.drawRightString(x, _y(y), s)
    else:
        c.drawString(x, _y(y), s)


def _segs(c, x, y, segs, size=7, align='l'):
    """Texto compuesto de tramos [(texto, negrita), ...]."""
    ancho = sum(c.stringWidth(t, BOLD if b else REGULAR, size) for t, b in segs)
    cur = x - ancho if align == 'r' else (x - ancho / 2 if align == 'c' else x)
    for t, b in segs:
        f = BOLD if b else REGULAR
        c.setFont(f, size)
        c.drawString(cur, _y(y), t)
        cur += c.stringWidth(t, f, size)


def _h(c, x1, x2, y, w=0.5):
    c.setLineWidth(w)
    c.line(x1, _y(y), x2, _y(y))


def _v(c, x, y1, y2, w=0.5):
    c.setLineWidth(w)
    c.line(x, _y(y1), x, _y(y2))


def _box(c, x1, y1, x2, y2, w=0.8, radio=0):
    c.setLineWidth(w)
    if radio:
        c.roundRect(x1, _y(y2), x2 - x1, y2 - y1, radio, stroke=1, fill=0)
    else:
        c.rect(x1, _y(y2), x2 - x1, y2 - y1, stroke=1, fill=0)


def _nota(v):
    """7.0 -> '7'   ·   7.5 -> '7,5'   ·   None -> ''"""
    if v is None:
        return ''
    v = float(v)
    if v == int(v):
        return str(int(v))
    return ('%.2f' % v).rstrip('0').rstrip('.').replace('.', ',')


def _nombre_completo(d):
    return f"{d['apellido']}, {d['nombre']}".upper()


def _cabecera(c, d):
    _txt(c, L, 26, 'PROA - NIVEL SECUNDARIO', BOLD, 11)
    _txt(c, L, 37, DIRECCION, REGULAR, 6.5)
    _txt(c, R, 31, 'INFORME DE PROGRESO ESCOLAR', BOLD, 11, 'r')
    _h(c, L, R, 45, 0.6)

    _segs(c, L, 59, [('Plan: ', False), (PLAN, True)], 7)
    _segs(c, R, 59, [('Curso: ', False), (str(d['curso']), True),
                     ('  División: ', False), (d['division'], True),
                     ('  Turno: ', False), (d['turno'], True),
                     ('  Ciclo Lectivo: ', False), (str(d['anio_lectivo']), True)], 7, 'r')
    _segs(c, L, 73, [('Estudiante: ', False), (_nombre_completo(d), True),
                     ('      Tipo y N° doc: ', False), (f"DNI - {d['dni']}", True)], 7)
    _segs(c, R, 73, [('Versión IPE: ', False), ('Preliminar', True)], 7, 'r')
    _h(c, L, R, 83, 0.6)


def _firmas(c):
    c.setDash(1, 1.5)
    _h(c, 78, 228, 555, 0.6)
    _h(c, 337, 487, 555, 0.6)
    c.setDash()
    _txt(c, 153, 569, 'Firma del Padre, Madre o Tutor', REGULAR, 7, 'c')
    _txt(c, 412, 569, 'Firma del/la Director/a', REGULAR, 7, 'c')


# ── Página 1: informe de progreso ────────────────────────────────────────────
def _pagina_notas(c, d):
    _cabecera(c, d)

    top, h_g, h_s = 90, 13, 13
    body_top = top + h_g + h_s
    body_bot = 352
    cw = 17
    c1_x1 = 226
    ev_x = [c1_x1 + i * 3 * cw for i in range(8)]       # 8 evaluaciones (N, R1, R2)
    jis_x0 = c1_x1 + 8 * 3 * cw
    jis_x = [jis_x0, jis_x0 + 2 * cw]                    # JIS 1, JIS 2 (N, R)
    colq_x0 = jis_x0 + 4 * cw
    colq_w = 36
    prom_x0 = colq_x0 + 2 * colq_w
    x_end = R

    materias = d['materias']
    nfilas = max(16, len(materias))
    rh = (body_bot - body_top) / nfilas

    # líneas finas: filas
    for i in range(nfilas + 1):
        _h(c, L, x_end, body_top + i * rh, 0.4)
    # líneas finas: celdas N / R1 / R2 y N / R
    for g in range(8):
        for k in (1, 2):
            _v(c, ev_x[g] + k * cw, top + h_g, body_bot, 0.4)
    for g in range(2):
        _v(c, jis_x[g] + cw, top + h_g, body_bot, 0.4)
    # línea entre "Eval n" y "N R1 R2"
    _h(c, c1_x1, colq_x0, top + h_g, 0.5)

    # líneas gruesas: límites de grupo
    for x in ev_x + jis_x + [colq_x0, colq_x0 + colq_w, prom_x0]:
        _v(c, x, top, body_bot, 0.8)
    _h(c, L, x_end, body_top, 0.8)
    _box(c, L, top, x_end, body_bot, 0.9)
    _v(c, c1_x1, top, body_bot, 0.8)

    # encabezados
    _txt(c, (L + c1_x1) / 2, top + 17, 'Espacios Curriculares (E.C.)', BOLD, 7.5, 'c')
    for g in range(8):
        _txt(c, ev_x[g] + 1.5 * cw, top + 9.5, f'Eval {g + 1}', BOLD, 6.5, 'c')
        for k, t in enumerate(('N', 'R1', 'R2')):
            _txt(c, ev_x[g] + k * cw + cw / 2, top + h_g + 9.5, t, BOLD, 6.2, 'c')
    for g in range(2):
        _txt(c, jis_x[g] + cw, top + 9.5, f'JIS {g + 1}', BOLD, 6.5, 'c')
        for k, t in enumerate(('N', 'R')):
            _txt(c, jis_x[g] + k * cw + cw / 2, top + h_g + 9.5, t, BOLD, 6.2, 'c')
    for k, (l1, l2) in enumerate((('Coloquio', 'Dic.'), ('Coloquio', 'Feb.'))):
        cx = colq_x0 + k * colq_w + colq_w / 2
        c.saveState()
        c.translate(cx - 9, _y(top + 20))
        c.rotate(30)
        c.setFont(BOLD, 6.2)
        c.drawString(0, 0, l1)
        c.drawString(3, -7, l2)
        c.restoreState()
    _txt(c, (prom_x0 + x_end) / 2, top + 14, 'Prom.', BOLD, 6.5, 'c')
    _txt(c, (prom_x0 + x_end) / 2, top + 22, 'Final', BOLD, 6.5, 'c')

    # filas de materias
    tam_nombre = 6.2 if rh >= 12 else 5.4
    tam_nota = 7.5 if rh >= 12 else 6.4
    for i, m in enumerate(materias):
        yb = body_top + i * rh + rh / 2 + 2.4
        _txt(c, L + 2, yb, m['nombre'].upper(), REGULAR, tam_nombre)
        for n, celda in m['evals'].items():
            if not 1 <= n <= 8:
                continue
            for k, key in enumerate(('n', 'r1', 'r2')):
                v = _nota(celda.get(key))
                if v:
                    _txt(c, ev_x[n - 1] + k * cw + cw / 2, yb, v, REGULAR, tam_nota, 'c')

    # ── bloque inferior ──
    b_top = 358
    # inasistencias
    ix = [L, L + 90, L + 124, L + 158, L + 192, L + 226, L + 260, L + 294]   # label, justif, injustif, 1/4, 1/2, retiro, total
    _box(c, ix[0], b_top, ix[7], b_top + 42, 0.8)
    _h(c, ix[1], ix[7], b_top + 28, 0.5)                    # sobre los valores
    _h(c, ix[3], ix[5], b_top + 14, 0.5)                    # bajo "Llegadas tarde"
    for x in ix[1:7]:
        if x in (ix[4],):
            _v(c, x, b_top + 14, b_top + 42, 0.5)
        else:
            _v(c, x, b_top, b_top + 42, 0.5)
    _txt(c, (ix[0] + ix[1]) / 2, b_top + 16, 'INASISTENCIAS', BOLD, 6.5, 'c')
    _txt(c, (ix[0] + ix[1]) / 2, b_top + 24, 'DIARIAS', BOLD, 6.5, 'c')
    _txt(c, (ix[1] + ix[2]) / 2, b_top + 17, 'Justif.', BOLD, 6.5, 'c')
    _txt(c, (ix[2] + ix[3]) / 2, b_top + 17, 'Injustif.', BOLD, 6.5, 'c')
    _txt(c, (ix[3] + ix[5]) / 2, b_top + 10, 'Llegadas tarde', BOLD, 6.5, 'c')
    _txt(c, (ix[3] + ix[4]) / 2, b_top + 24, '1/4', BOLD, 6.2, 'c')
    _txt(c, (ix[4] + ix[5]) / 2, b_top + 24, '1/2', BOLD, 6.2, 'c')
    _txt(c, (ix[5] + ix[6]) / 2, b_top + 17, 'Retiro', BOLD, 6.5, 'c')
    _txt(c, (ix[6] + ix[7]) / 2, b_top + 17, 'TOTAL', BOLD, 6.5, 'c')
    total = d['justif'] + d['injustif']
    vals = [d['justif'], d['injustif'], d['tarde_cuarto'], d['tarde_medio'], d['retiro'], total]
    for k, v in enumerate(vals):
        _txt(c, (ix[k + 1] + ix[k + 2]) / 2, b_top + 38, str(v), REGULAR, 7, 'c')
    # estado
    _box(c, ix[0], b_top + 44, ix[1] + 28, b_top + 58, 0.8)
    _v(c, ix[0] + 48, b_top + 44, b_top + 58, 0.5)
    _txt(c, ix[0] + 4, b_top + 54, 'ESTADO', BOLD, 6.8)
    _txt(c, ix[0] + 52, b_top + 54, d['estado'], REGULAR, 6.8)

    # observaciones y E.C. previos
    ob_x1, ob_x2 = 328, 565
    ec_x1, ec_x2 = 570, x_end
    for x1, x2, t in ((ob_x1, ob_x2, 'OBSERVACIONES'), (ec_x1, ec_x2, 'E.C. PREVIOS')):
        _box(c, x1, b_top, x2, b_top + 58, 0.8)
        _h(c, x1, x2, b_top + 13, 0.5)
        _txt(c, (x1 + x2) / 2, b_top + 9.5, t, BOLD, 6.5, 'c')
    if d.get('observaciones'):
        _wrap(c, d['observaciones'], ob_x1 + 4, b_top + 23, ob_x2 - ob_x1 - 8, 6.2, 8, 4)
    if d.get('ec_previos'):
        _wrap(c, d['ec_previos'], ec_x1 + 4, b_top + 23, ec_x2 - ec_x1 - 8, 6.2, 8, 4)

    _firmas(c)


def _wrap(c, texto, x, y, ancho, size, interlinea, max_lineas):
    palabras, linea, lineas = texto.split(), '', []
    for p in palabras:
        prueba = (linea + ' ' + p).strip()
        if c.stringWidth(prueba, REGULAR, size) <= ancho:
            linea = prueba
        else:
            lineas.append(linea)
            linea = p
    if linea:
        lineas.append(linea)
    for i, l in enumerate(lineas[:max_lineas]):
        _txt(c, x, y + i * interlinea, l, REGULAR, size)


# ── Página 2: aprendizajes pendientes ────────────────────────────────────────
def _pagina_pendientes(c, d):
    _cabecera(c, d)
    _txt(c, L, 103, 'Aprendizajes pendientes a evaluar en coloquio de diciembre/febrero', BOLD, 9)

    top, h_head = 118, 29
    x = [L, 228, 230, 276, 278, 714, 716, R]      # (esp. curr.) (eval) (descripción) (firma)
    cols = [(x[0], x[1], 'Espacios Curriculares'), (x[2], x[3], 'Evaluación'),
            (x[4], x[5], 'Descripción'), (x[6], x[7], 'Firma Docente')]
    for x1, x2, t in cols:
        _box(c, x1, top, x2, top + h_head, 0.8, radio=3)
        _txt(c, (x1 + x2) / 2, top + 17, t, BOLD, 7, 'c')

    filas = d['pendientes']
    nfilas = max(1, len(filas))
    rh = 15
    y0 = top + h_head
    for x1, x2, _ in cols:
        _box(c, x1, y0, x2, y0 + nfilas * rh, 0.8)
    for i in range(1, nfilas):
        for x1, x2, _ in cols:
            _h(c, x1, x2, y0 + i * rh, 0.4)
    for i, f in enumerate(filas):
        yb = y0 + i * rh + 10
        _txt(c, x[0] + 2, yb, f['materia'].upper(), REGULAR, 6.2)
        _txt(c, (x[2] + x[3]) / 2, yb, f'EVAL {f["eval"]}', REGULAR, 6.2, 'c')
        _txt(c, x[4] + 2, yb, (f.get('descripcion') or '')[:150], REGULAR, 6.2)

    _firmas(c)


# ── Página 3: coloquios + carátula ───────────────────────────────────────────
def _tabla_coloquio(c, y_titulo, titulo):
    bx1, bx2 = 28, 396
    _txt(c, (bx1 + bx2) / 2, y_titulo, titulo, BOLD, 11, 'c')
    t_top = y_titulo + 8
    xs = [34, 164, 214, 243, 292, 390]          # disciplina, fecha, N°, letra, firma
    h_head, rows, rh = 26, 14, 14.8
    body_top = t_top + h_head
    body_bot = body_top + rows * rh
    _box(c, xs[0], t_top, xs[-1], body_bot, 0.9, radio=5)
    for i in range(1, rows):
        _h(c, xs[0], xs[-1], body_top + i * rh, 0.4)
    _h(c, xs[0], xs[-1], body_top, 0.8)
    _h(c, xs[2], xs[4], t_top + 13, 0.5)
    for x in xs[1:-1]:
        _v(c, x, t_top if x in (xs[1], xs[4]) else t_top + 13, body_bot, 0.6 if x in (xs[1], xs[2], xs[4]) else 0.4)
    _v(c, xs[2], t_top, body_bot, 0.6)
    _v(c, xs[3], t_top + 13, body_bot, 0.4)
    _txt(c, (xs[0] + xs[1]) / 2, t_top + 16, 'DISCIPLINA', BOLD, 7, 'c')
    _txt(c, (xs[1] + xs[2]) / 2, t_top + 16, 'FECHA', BOLD, 7, 'c')
    _txt(c, (xs[2] + xs[4]) / 2, t_top + 9.5, 'CALIFICACIÓN', BOLD, 6.3, 'c')
    _txt(c, (xs[2] + xs[3]) / 2, t_top + 22, 'N°', BOLD, 6.3, 'c')
    _txt(c, (xs[3] + xs[4]) / 2, t_top + 22, 'LETRA', BOLD, 6.3, 'c')
    _txt(c, (xs[4] + xs[5]) / 2, t_top + 16, 'FIRMA DEL PROFESOR', BOLD, 7, 'c')


def _pagina_contratapa(c, d):
    # izquierda: coloquios
    _box(c, 28, 26, 396, 562, 1.2, radio=7)
    _tabla_coloquio(c, 50, 'PERIODO DE EVALUACIÓN: COLOQUIO DICIEMBRE')
    _tabla_coloquio(c, 310, 'PERIODO DE EVALUACIÓN: COLOQUIO FEBRERO')

    # derecha: carátula
    rx1, rx2 = 438, R
    _box(c, rx1, 26, rx2, 562, 1.2, radio=7)
    cx = (rx1 + rx2) / 2
    if os.path.exists(ESCUDO):
        c.drawImage(ESCUDO, cx - 13.5, _y(72), 27, 31.5, mask='auto')
    _txt(c, cx, 82, 'GOBIERNO DE CÓRDOBA', BOLD, 6.2, 'c')
    _txt(c, cx, 91, 'MINISTERIO DE EDUCACIÓN', REGULAR, 6.2, 'c')
    _txt(c, cx, 100, 'SECRETARÍA DE ESTADO DE EDUCACIÓN', REGULAR, 6.2, 'c')
    _txt(c, cx, 109, 'DIRECCIÓN GENERAL DE EDUCACIÓN TÉCNICA Y FORMACIÓN PROFESIONAL', REGULAR, 6.2, 'c')
    _txt(c, cx, 131, 'PROA - NIVEL SECUNDARIO', REGULAR, 8.5, 'c')
    _txt(c, cx, 140, 'Nombre del centro educativo', REGULAR, 4.6, 'c')
    _txt(c, cx, 177, 'Localidad: RIO TERCERO', REGULAR, 8, 'c')
    _txt(c, cx, 189, 'Departamento: TERCERO ARRIBA', REGULAR, 8, 'c')
    _txt(c, cx, 243, 'LIBRETA DE CALIFICACIONES DEL ESTUDIANTE', BOLD, 12, 'c')
    _txt(c, cx, 263, 'CICLO DE ESPECIALIZACIÓN', BOLD, 12, 'c')

    anio_txt = CURSOS_TXT.get(d['curso'], str(d['curso'])) + ' AÑO'
    _segs(c, cx, 489, [('Curso: ', False), (anio_txt, True), ('  Division: ', False), (d['division'], True),
                       ('  Turno: ', False), (d['turno'], True)], 8, 'c')
    _segs(c, cx, 508, [('Estudiante: ', False), (_nombre_completo(d), True)], 8, 'c')
    _segs(c, cx, 524, [('Tipo y N° doc: ', False), (f"DNI - {d['dni']}", True)], 8, 'c')
    _txt(c, cx, 551, f"AÑO LECTIVO {d['anio_lectivo']}", BOLD, 9, 'c')


def generar_libreta_pdf(d):
    """
    d = {
      'nombre', 'apellido', 'dni', 'curso' (1-6), 'division', 'turno', 'anio_lectivo',
      'materias': [ {'nombre': str, 'evals': {1: {'n':7,'r1':None,'r2':None}, ...}} ],
      'justif', 'injustif', 'tarde_cuarto', 'tarde_medio', 'retiro', 'estado',
      'observaciones': str|None, 'ec_previos': str|None,
      'pendientes': [ {'materia', 'eval', 'descripcion'} ]
    }
    """
    buf = io.BytesIO()
    c = canvas.Canvas(buf, pagesize=landscape(A4))
    c.setTitle(f"Libreta - {_nombre_completo(d)}")
    c.setAuthor('KRONO')
    _pagina_notas(c, d)
    c.showPage()
    _pagina_pendientes(c, d)
    c.showPage()
    _pagina_contratapa(c, d)
    c.showPage()
    c.save()
    return buf.getvalue()
