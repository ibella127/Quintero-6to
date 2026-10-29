from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS
import pymysql
import os
import smtplib
import random
import time
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import csv
import io
from flask import make_response
from datetime import date, timedelta
import unicodedata

# Hora límite de entrada: si el QR se registra DESPUÉS de esta hora es llegada tarde.
# Si no hay QR registrado en el día, es falta.
HORA_ENTRADA = '08:00:00'

app = Flask(__name__)
CORS(app)


@app.after_request
def _sin_cache(resp):
    """Datos siempre frescos: el navegador no guarda respuestas JSON ni reutiliza HTML/JS/CSS sin revalidar."""
    tipo = (resp.mimetype or '')
    if tipo == 'application/json':
        resp.headers['Cache-Control'] = 'no-store, max-age=0'
    elif tipo in ('text/html', 'text/css', 'text/javascript', 'application/javascript'):
        resp.headers['Cache-Control'] = 'no-cache'
    return resp

# ── DB CONECTADA ───────────────────────────────────────────────
DB = {
    'host': '127.0.0.1',
    'user': 'root',
    'password': 'root', 
    'database': 'krono1_db',
    'port': 3306,
    'cursorclass': pymysql.cursors.DictCursor
}

# ── CONFIG CORREO ──────────────────────────────────────────────
EMAIL_REMITENTE = "ummaleyria09@gmail.com"
EMAIL_APP_PASSWORD = "paew fcqi xmik mgng"  # ── Modificar cuando la web se trabe

otp_store = {}
otp_store_staff = {}  # OTP de Profesores, separado del de alumnos


def _normalizar(txt):
    """minúsculas, sin acentos y sin espacios de más — para comparar nombres/gmails con tolerancia."""
    txt = (txt or '').strip().lower()
    txt = unicodedata.normalize('NFKD', txt).encode('ascii', 'ignore').decode('ascii')
    return ' '.join(txt.split())


def _normalizar_dni(txt):
    """deja solo los dígitos, para comparar '28.650.621' con '28650621' sin problema."""
    return ''.join(ch for ch in (txt or '') if ch.isdigit())

def get_connection():
    return pymysql.connect(**DB)

def enviar_otp(email, codigo, nombre):
    msg = MIMEMultipart("alternative")
    msg["Subject"] = "🔑 Tu código de acceso KRONO"
    msg["From"]    = EMAIL_REMITENTE
    msg["To"]      = email

    html = f"""
    <!DOCTYPE html>
    <html lang="es">
    <head><meta charset="UTF-8"></head>
    <body style="margin:0;padding:0;background:#0c1a2e;font-family:'Georgia',serif;">

      <table width="100%" cellpadding="0" cellspacing="0" style="background:#0c1a2e;padding:40px 0;">
        <tr>
          <td align="center">
            <table width="520" cellpadding="0" cellspacing="0"
                   style="background:#0c1a2e;border:1.5px solid rgba(75,163,217,0.25);
                          border-radius:20px;overflow:hidden;max-width:520px;width:100%;">

              <!-- HEADER con logo texto -->
              <tr>
                <td style="padding:28px 36px 20px;border-bottom:1px solid rgba(75,163,217,0.15);">
                  <p style="margin:0;font-family:'Georgia',serif;font-size:26px;
                             font-weight:700;color:#c8dff0;letter-spacing:4px;
                             text-transform:uppercase;">KRONO</p>
                  <p style="margin:4px 0 0;font-size:11px;color:#4a7a9b;
                             letter-spacing:0.15em;text-transform:uppercase;
                             font-family:Arial,sans-serif;">Sistema de asistencia escolar</p>
                </td>
              </tr>

              <!-- SALUDO -->
              <tr>
                <td style="padding:32px 36px 8px;">
                  <h1 style="margin:0;font-family:'Georgia',serif;font-size:28px;
                              font-weight:700;color:#c8dff0;">
                    Hola, {nombre}
                  </h1>
                  <p style="margin:12px 0 0;font-size:15px;color:#7aa8c8;
                             font-family:Arial,sans-serif;line-height:1.5;">
                    Tu código de acceso a <strong style="color:#a8d4f5;">KRONO</strong> es:
                  </p>
                </td>
              </tr>

              <!-- CÓDIGO -->
              <tr>
                <td style="padding:24px 36px;">
                  <div style="background:#091422;border:1.5px solid rgba(75,163,217,0.3);
                               border-radius:14px;padding:28px 24px;text-align:center;">
                    <span style="font-family:'Courier New',monospace;font-size:48px;
                                 font-weight:700;letter-spacing:12px;color:#4ba3d9;
                                 display:block;line-height:1;">
                      {codigo}
                    </span>
                  </div>
                </td>
              </tr>

              <!-- TRES PUNTOS INFO -->
              <tr>
                <td style="padding:0 36px 8px;">
                  <table cellpadding="0" cellspacing="0">
                    <tr>
                      <td style="padding-right:6px;">
                        <span style="display:inline-block;width:7px;height:7px;
                                     border-radius:50%;background:#4ba3d9;"></span>
                      </td>
                      <td style="padding-right:6px;">
                        <span style="display:inline-block;width:7px;height:7px;
                                     border-radius:50%;background:#4ba3d9;opacity:.6;"></span>
                      </td>
                      <td style="padding-right:10px;">
                        <span style="display:inline-block;width:7px;height:7px;
                                     border-radius:50%;background:#4ba3d9;opacity:.35;"></span>
                      </td>
                      <td>
                        <span style="font-size:11px;color:#4a7a9b;font-family:Arial,sans-serif;
                                     letter-spacing:0.1em;text-transform:uppercase;">info</span>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>

              <!-- TEXTO INFERIOR -->
              <tr>
                <td style="padding:4px 36px 32px;">
                  <p style="margin:0;font-size:13px;color:#4a7a9b;
                             font-family:Arial,sans-serif;line-height:1.6;">
                    Este código expira en <strong style="color:#7aa8c8;">5 minutos</strong>.
                    Si no fuiste vos, ignorá este mensaje.
                  </p>
                </td>
              </tr>

              <!-- FOOTER -->
              <tr>
                <td style="padding:16px 36px;border-top:1px solid rgba(75,163,217,0.12);">
                  <p style="margin:0;font-size:11px;color:#2a4a6a;
                             font-family:Arial,sans-serif;letter-spacing:0.05em;">
                    KRONO — Sistema de asistencia escolar
                  </p>
                </td>
              </tr>

            </table>
          </td>
        </tr>
      </table>

    </body>
    </html>
    """

    msg.attach(MIMEText(html, "html"))
    try:
        server = smtplib.SMTP_SSL("smtp.gmail.com", 465)
        server.login(EMAIL_REMITENTE, EMAIL_APP_PASSWORD)
        server.sendmail(EMAIL_REMITENTE, email, msg.as_string())
        server.quit()
        return True
    except Exception as e:
        print(f"❌ ERROR DE GMAIL: {e}")
        return False


# ═══════════════════════════════════════════════════════════════
#  LOGIN Y ACCESO A ESTUDIANTES
# ═══════════════════════════════════════════════════════════════

@app.route('/solicitar-otp', methods=['POST'])
def solicitar_otp():
    data = request.get_json()
    email = data.get('email', '').strip().lower()
    conn = get_connection()
    try:
        with conn.cursor() as c:
            c.execute("SELECT p.nombre FROM personas p JOIN alumnos a ON p.id_persona = a.id_persona WHERE p.gmail = %s", (email,))
            alumno = c.fetchone()
        
        if not alumno:
            return jsonify({"error": "Correo no registrado"}), 404

        codigo = str(random.randint(100000, 999999))
        otp_store[email] = {"codigo": codigo, "expira": time.time() + 300}
        
        # ESTO ES LO IMPORTANTE: MIRA TU TERMINAL DESPUÉS DE DARLE A "ENTRAR"
        print("\n" + "="*40)
        print(f"🔑 CÓDIGO PARA {email}: {codigo}")
        print("="*40 + "\n")
        
        mail_ok = enviar_otp(email, codigo, alumno['nombre'])
        
        # Si el mail falla (ej: error 535), devolvemos el código en la respuesta
        # para que el alumno pueda entrar igual (útil en desarrollo/presentación)
        respuesta = {"ok": True, "nombre": alumno['nombre']}
        if not mail_ok:
            respuesta["codigo_dev"] = codigo  # solo aparece si el mail no llega
        return jsonify(respuesta)
    finally:
        conn.close()

@app.route('/verificar-otp', methods=['POST'])
def verificar_otp():
    data = request.get_json()
    email = data.get('email', '').strip().lower()
    codigo = data.get('codigo', '').strip()
    entrada = otp_store.get(email)
    
    if not entrada or time.time() > entrada['expira'] or entrada['codigo'] != codigo:
        return jsonify({"error": "Código incorrecto"}), 400

    # Si el código es correcto, devolvemos los datos del alumno para entrar a la pestaña
    conn = get_connection()
    try:
        with conn.cursor() as c:
            c.execute("""
                SELECT p.nombre, p.apellido, p.gmail, a.id_alumno, a.id_curso as anio
                FROM personas p JOIN alumnos a ON p.id_persona = a.id_persona
                WHERE p.gmail = %s
            """, (email,))
            return jsonify(c.fetchone())
    finally:
        conn.close()

# RUTA PARA LA TABLA DE ESTUDIANTES (Evita el 404)
@app.route('/alumnos/<int:anio>', methods=['GET'])
def get_alumnos_anio(anio):
    conn = get_connection()
    try:
        with conn.cursor() as c:
            c.execute("""
                SELECT p.nombre, p.apellido, p.gmail 
                FROM personas p JOIN alumnos a ON p.id_persona = a.id_persona 
                WHERE a.id_curso = %s
            """, (anio,))
            return jsonify(c.fetchall())
    finally:
        conn.close()

@app.route('/prece/alumnos-ingreso/<int:anio>', methods=['GET'])
def prece_alumnos_ingreso(anio):
    """
    Divide a los alumnos de un curso, para una fecha (por defecto HOY), en:
      - sin_qr: no registraron el QR ese día (falta)
      - tarde:  registraron el QR después de HORA_ENTRADA (llegada tarde)
    También devuelve cuántos llegaron a tiempo. Los fines de semana y feriados
    no se consideran días de clase, así que no se marca a nadie como ausente.
    """
    from datetime import datetime
    fecha = request.args.get('fecha') or date.today().isoformat()
    try:
        fecha_d = datetime.strptime(fecha, '%Y-%m-%d').date()
    except ValueError:
        return jsonify({"error": "Fecha inválida (usar AAAA-MM-DD)"}), 400

    def _hora_str(h):
        # Por si la columna es TIME (pymysql devuelve timedelta): HH:MM:SS con ceros
        if isinstance(h, timedelta):
            t = int(h.total_seconds())
            return f"{t // 3600:02d}:{(t % 3600) // 60:02d}:{t % 60:02d}"
        return str(h)

    conn = get_connection()
    try:
        with conn.cursor() as c:
            c.execute("SELECT 1 FROM feriados WHERE fecha = %s LIMIT 1", (fecha_d,))
            es_feriado = c.fetchone() is not None

            c.execute("""
                SELECT a.id_alumno, p.nombre, p.apellido, p.gmail
                FROM alumnos a JOIN personas p ON a.id_persona = p.id_persona
                WHERE a.id_curso = %s
                ORDER BY p.apellido, p.nombre
            """, (anio,))
            alumnos = c.fetchall()

            c.execute("""
                SELECT i.id_alumno, MIN(i.hora) AS hora
                FROM ingresos i JOIN alumnos a ON i.id_alumno = a.id_alumno
                WHERE a.id_curso = %s AND i.fecha = %s
                GROUP BY i.id_alumno
            """, (anio, fecha_d))
            horas = {r['id_alumno']: _hora_str(r['hora']) for r in c.fetchall()}

        resp = {
            "fecha": fecha_d.isoformat(), "total": len(alumnos),
            "sin_qr": [], "tarde": [], "a_tiempo": 0, "aviso": None
        }

        if fecha_d.weekday() >= 5:
            resp["aviso"] = "Ese día es fin de semana: no hay clases."
            return jsonify(resp)
        if es_feriado:
            resp["aviso"] = "Ese día es feriado: no hay clases."
            return jsonify(resp)
        if fecha_d > date.today():
            resp["aviso"] = "Esa fecha todavía no llegó."
            return jsonify(resp)

        for al in alumnos:
            hora = horas.get(al['id_alumno'])
            base = {"nombre": al['nombre'], "apellido": al['apellido'], "gmail": al['gmail']}
            if hora is None:
                resp["sin_qr"].append(base)
            elif hora > HORA_ENTRADA:
                resp["tarde"].append({**base, "hora": hora[:5]})
            else:
                resp["a_tiempo"] += 1

        # Hoy y todavía no pasó el horario de entrada: "sin QR" = aún no ingresó
        from datetime import datetime as _dt
        if fecha_d == date.today() and _dt.now().strftime('%H:%M:%S') <= HORA_ENTRADA:
            resp["aviso"] = "Todavía no pasó el horario de entrada (08:00): estos alumnos aún no registraron el QR."

        resp["tarde"].sort(key=lambda x: x["hora"])
        return jsonify(resp)
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        conn.close()

#DESCARGA DE EXCEL CADA DÍA
@app.route('/descargar-excel/<int:anio>')
def descargar_excel(anio):
    fecha = request.args.get('fecha')
    if not fecha:
        fecha = date.today().isoformat()
        
    conn = get_connection()
    try:
        with conn.cursor() as c:
            # 1) Todos los alumnos del curso
            c.execute("""
                SELECT a.id_alumno, p.apellido, p.nombre
                FROM alumnos a
                JOIN personas p ON a.id_persona = p.id_persona
                WHERE a.id_curso = %s
                ORDER BY p.apellido ASC, p.nombre ASC
            """, (anio,))
            alumnos = c.fetchall()

            # 2) Ingresos del día para ese curso
            c.execute("""
                SELECT i.id_alumno, MIN(i.hora) AS hora
                FROM ingresos i
                JOIN alumnos a ON i.id_alumno = a.id_alumno
                WHERE a.id_curso = %s AND i.fecha = %s
                GROUP BY i.id_alumno
            """, (anio, fecha))
            ingresos_map = {row['id_alumno']: row['hora'] for row in c.fetchall()}

            # 3) Avisos de tardanza del día para ese curso
            c.execute("""
                SELECT av.id_alumno, av.motivo
                FROM avisos_tardanza av
                JOIN alumnos a ON av.id_alumno = a.id_alumno
                WHERE a.id_curso = %s AND av.fecha = %s
            """, (anio, fecha))
            avisos_map = {row['id_alumno']: row['motivo'] for row in c.fetchall()}


        output = io.StringIO()
        writer = csv.writer(output, delimiter=';')
        writer.writerow(['Apellido', 'Nombre', 'Hr Ingreso', 'Estado', 'Motivo'])

        for alumno in alumnos:
            id_al    = alumno['id_alumno']
            apellido = alumno['apellido']
            nombre   = alumno['nombre']
            hora_raw = ingresos_map.get(id_al)

            if hora_raw is None:
                # Sin ingreso → Ausente
                estado = 'Ausente'
                hora_str = ''
                motivo = avisos_map.get(id_al, '')
            else:
                hora_str = str(hora_raw)[:5]          # HH:MM (para mostrar)
                if str(hora_raw) <= HORA_ENTRADA:      # HH:MM:SS
                    estado = 'Presente'
                    motivo = ''
                else:
                    estado = 'Tarde'
                    motivo = avisos_map.get(id_al, '')

            writer.writerow([apellido, nombre, hora_str, estado, motivo])

        contenido = output.getvalue()
        response = make_response(b'\xef\xbb\xbf' + contenido.encode('utf-8-sig'))
        filename = f"KRONO_Asistencia_{anio}Anio_{fecha}.csv"
        response.headers["Content-Disposition"] = f"attachment; filename={filename}"
        response.headers["Content-type"] = "text/csv; charset=utf-8"
        return response

    except Exception as e:
        print(f"Error en Excel: {e}")
        return jsonify({"error": str(e)}), 500
    finally:
        conn.close()


# ── Carpetas de uploads (se crean automáticamente) ─────────────
import os
from datetime import date
from werkzeug.utils import secure_filename
from flask import send_from_directory

BASE_DIR         = os.path.dirname(os.path.abspath(__file__))
UPLOAD_BASE      = os.path.join(os.path.expanduser("~"), 'krono_uploads') 
CERTIFICADOS_DIR = os.path.join(UPLOAD_BASE, 'certificados')
FOTOS_DIR        = os.path.join(UPLOAD_BASE, 'fotos')
DOCUMENTOS_DIR   = os.path.join(UPLOAD_BASE, 'documentos')
for _d in [UPLOAD_BASE, CERTIFICADOS_DIR, FOTOS_DIR, DOCUMENTOS_DIR]:
    os.makedirs(_d, exist_ok=True)

EXTENSIONES_OK = {'png','jpg','jpeg','gif','webp','pdf'}
EXTENSIONES_DOC_OK = {'png','jpg','jpeg','gif','webp','pdf','doc','docx','xls','xlsx','txt'}
def _allowed(fn): return '.' in fn and fn.rsplit('.',1)[1].lower() in EXTENSIONES_OK
def _allowed_doc(fn): return '.' in fn and fn.rsplit('.',1)[1].lower() in EXTENSIONES_DOC_OK

def _id_alumno(gmail):
    conn = get_connection()
    try:
        with conn.cursor() as c:
            c.execute("""SELECT a.id_alumno FROM alumnos a
                          JOIN personas p ON a.id_persona=p.id_persona
                          WHERE p.gmail=%s LIMIT 1""", (gmail,))
            r = c.fetchone()
            return r['id_alumno'] if r else None
    finally: conn.close()

def _generar_faltas(anio):
    """
    Genera (si no existen todavía) las faltas automáticas de un curso:
    para cada día hábil (lunes a viernes, sin contar feriados) desde el
    1° de marzo hasta AYER, si un alumno no tiene ingreso de QR ese día
    se le registra una falta en la tabla `faltas`.
    No procesa HOY (la jornada puede seguir en curso) y es idempotente
    gracias al UNIQUE(id_alumno, fecha), así que se puede llamar cada vez
    que se abre la pestaña de Faltas sin generar duplicados.
    """
    conn = get_connection()
    try:
        with conn.cursor() as c:
            c.execute("SELECT id_alumno FROM alumnos WHERE id_curso = %s", (anio,))
            ids_alumnos = [r['id_alumno'] for r in c.fetchall()]
            if not ids_alumnos:
                return

            inicio = date(date.today().year, 3, 1)
            ayer   = date.today() - timedelta(days=1)
            if inicio > ayer:
                return

            c.execute("SELECT fecha FROM feriados WHERE fecha BETWEEN %s AND %s", (inicio, ayer))
            feriados_set = {r['fecha'] for r in c.fetchall()}

            placeholders = ','.join(['%s'] * len(ids_alumnos))

            # Falta = QR NO registrado. Si quedó alguna falta de un día en que
            # el alumno sí tiene QR registrado, se corrige (se borra).
            c.execute(f"""
                DELETE f FROM faltas f
                JOIN ingresos i ON i.id_alumno = f.id_alumno AND i.fecha = f.fecha
                WHERE f.id_alumno IN ({placeholders})
            """, tuple(ids_alumnos))
            conn.commit()

            c.execute(f"""
                SELECT id_alumno, fecha FROM ingresos
                WHERE id_alumno IN ({placeholders}) AND fecha BETWEEN %s AND %s
            """, (*ids_alumnos, inicio, ayer))
            ingresos_set = {(r['id_alumno'], r['fecha']) for r in c.fetchall()}

            c.execute(f"""
                SELECT id_alumno, fecha FROM faltas
                WHERE id_alumno IN ({placeholders}) AND fecha BETWEEN %s AND %s
            """, (*ids_alumnos, inicio, ayer))
            faltas_set = {(r['id_alumno'], r['fecha']) for r in c.fetchall()}

            dias_habiles = []
            d = inicio
            while d <= ayer:
                if d.weekday() < 5 and d not in feriados_set:
                    dias_habiles.append(d)
                d += timedelta(days=1)

            nuevas = [
                (id_al, dia)
                for id_al in ids_alumnos
                for dia in dias_habiles
                if (id_al, dia) not in ingresos_set and (id_al, dia) not in faltas_set
            ]

            if nuevas:
                c.executemany(
                    "INSERT IGNORE INTO faltas (id_alumno, fecha) VALUES (%s, %s)",
                    nuevas
                )
                conn.commit()
    finally:
        conn.close()

def _listado_faltas_curso(anio):
    """Genera (si hace falta) y devuelve, por alumno de un curso, el total de
    faltas, cuántas de esas faltas tienen un motivo justificado cargado
    (tabla `motivos_falta`, cruzado por fecha) y los motivos más frecuentes."""
    from collections import Counter

    _generar_faltas(anio)

    inicio = date(date.today().year, 3, 1)
    ayer   = date.today() - timedelta(days=1)

    conn = get_connection()
    try:
        with conn.cursor() as c:
            c.execute("""
                SELECT a.id_alumno, p.nombre, p.apellido, p.gmail
                FROM alumnos a
                JOIN personas p ON a.id_persona = p.id_persona
                WHERE a.id_curso = %s
                ORDER BY p.apellido, p.nombre
            """, (anio,))
            alumnos = c.fetchall()

            # Faltas totales por alumno (con su fecha, para cruzar con motivos)
            c.execute("""
                SELECT f.id_alumno, f.fecha
                FROM faltas f
                JOIN alumnos a ON f.id_alumno = a.id_alumno
                WHERE a.id_curso = %s AND f.fecha BETWEEN %s AND %s
            """, (anio, inicio, ayer))
            faltas_fechas_map = {}
            for r in c.fetchall():
                faltas_fechas_map.setdefault(r['id_alumno'], set()).add(r['fecha'])

            # Motivos de falta cargados por el alumno (fecha + texto del motivo)
            c.execute("""
                SELECT mf.id_alumno, mf.fecha, mf.motivo
                FROM motivos_falta mf
                JOIN alumnos a ON mf.id_alumno = a.id_alumno
                WHERE a.id_curso = %s
            """, (anio,))
            motivos_por_alumno = {}
            for r in c.fetchall():
                motivos_por_alumno.setdefault(r['id_alumno'], []).append(r)

            if inicio > ayer:
                dias_habiles = 0
            else:
                c.execute("SELECT fecha FROM feriados WHERE fecha BETWEEN %s AND %s", (inicio, ayer))
                feriados_set = {r['fecha'] for r in c.fetchall()}
                dias_habiles = sum(
                    1 for i in range((ayer - inicio).days + 1)
                    if (inicio + timedelta(days=i)).weekday() < 5
                       and (inicio + timedelta(days=i)) not in feriados_set
                )

        resultado = []
        for al in alumnos:
            id_al        = al['id_alumno']
            fechas_falta = faltas_fechas_map.get(id_al, set())
            motivos_al   = motivos_por_alumno.get(id_al, [])

            # Solo cuenta como "con motivo" el motivo que corresponde a un día
            # efectivamente marcado como falta (evita contar motivos sueltos).
            con_motivo = len({m['fecha'] for m in motivos_al if m['fecha'] in fechas_falta})
            top3 = [m for m, _ in Counter(m['motivo'] for m in motivos_al).most_common(3)]

            resultado.append({
                "id_alumno":        id_al,
                "nombre":           al['nombre'],
                "apellido":         al['apellido'],
                "gmail":            al['gmail'],
                "ausencias":        len(fechas_falta),
                "con_motivo":       con_motivo,
                "motivos_frecuentes": top3,
                "dias_habiles":     dias_habiles
            })
        return resultado
    finally:
        conn.close()

def _init_tablas():
    conn = get_connection()
    try:
        with conn.cursor() as c:
            # Las tarjetas RFID ya no se usan: se elimina la tabla si quedó de antes
            c.execute("DROP TABLE IF EXISTS tarjetas_rfid")
            c.execute("""CREATE TABLE IF NOT EXISTS motivos_falta (
                id INT AUTO_INCREMENT PRIMARY KEY,
                id_alumno INT NOT NULL,
                fecha DATE NOT NULL,
                motivo TEXT NOT NULL,
                certificado VARCHAR(300) DEFAULT NULL,
                creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (id_alumno) REFERENCES alumnos(id_alumno)
            )""")
            c.execute("""CREATE TABLE IF NOT EXISTS motivos_tardanza (
                id INT AUTO_INCREMENT PRIMARY KEY,
                id_alumno INT NOT NULL,
                fecha DATE NOT NULL,
                motivo TEXT NOT NULL,
                certificado VARCHAR(300) DEFAULT NULL,
                creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (id_alumno) REFERENCES alumnos(id_alumno)
            )""")
            c.execute("""CREATE TABLE IF NOT EXISTS fotos_clase (
                id INT AUTO_INCREMENT PRIMARY KEY,
                id_alumno INT NOT NULL,
                fecha DATE NOT NULL,
                descripcion VARCHAR(300),
                archivo VARCHAR(300) NOT NULL,
                creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (id_alumno) REFERENCES alumnos(id_alumno)
            )""")
            c.execute("""CREATE TABLE IF NOT EXISTS avisos_tardanza (
                id INT AUTO_INCREMENT PRIMARY KEY,
                id_alumno INT NOT NULL,
                fecha DATE NOT NULL,
                hora VARCHAR(10) NOT NULL,
                motivo TEXT NOT NULL,
                anotado BOOLEAN DEFAULT FALSE,
                creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (id_alumno) REFERENCES alumnos(id_alumno)
            )""")
            c.execute("""CREATE TABLE IF NOT EXISTS anuncios_alumno (
                id INT AUTO_INCREMENT PRIMARY KEY,
                id_alumno INT NOT NULL,
                fecha DATE NOT NULL,
                hora VARCHAR(10) NOT NULL,
                mensaje TEXT NOT NULL,
                leido BOOLEAN DEFAULT FALSE,
                creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (id_alumno) REFERENCES alumnos(id_alumno)
            )""")
            # anuncios_alumno puede ya existir de antes sin la columna 'leido'
            # (CREATE TABLE IF NOT EXISTS no la agrega sola) — la sumamos a mano.
            try:
                c.execute("ALTER TABLE anuncios_alumno ADD COLUMN leido BOOLEAN DEFAULT FALSE")
                conn.commit()
            except Exception:
                pass  # ya existe la columna, no pasa nada
            # Un registro por cada aviso enviado a un curso/año completo
            # (los avisos_tardanza individuales por alumno siguen existiendo y apuntan acá con id_envio).
            c.execute("""CREATE TABLE IF NOT EXISTS avisos_envios (
                id            INT AUTO_INCREMENT PRIMARY KEY,
                id_curso      INT NOT NULL,
                fecha         DATE NOT NULL,
                hora          VARCHAR(10) NOT NULL,
                motivo        TEXT NOT NULL,
                total_alumnos INT NOT NULL DEFAULT 0,
                creado_en     TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )""")
            try:
                c.execute("ALTER TABLE avisos_tardanza ADD COLUMN id_envio INT NULL")
                conn.commit()
            except Exception:
                pass  # ya existe la columna
            # Peticiones de documentación: una por alumno
            c.execute("""CREATE TABLE IF NOT EXISTS peticiones_documentacion (
                id           INT AUTO_INCREMENT PRIMARY KEY,
                id_alumno    INT NOT NULL,
                fecha        DATE NOT NULL,
                hora         VARCHAR(10) NOT NULL,
                documento    VARCHAR(300) NOT NULL,
                mensaje      TEXT NULL,
                estado       VARCHAR(12) NOT NULL DEFAULT 'pendiente',
                id_documento INT NULL,
                entregado_en DATETIME NULL,
                creado_en    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (id_alumno) REFERENCES alumnos(id_alumno)
            )""")
            c.execute("""CREATE TABLE IF NOT EXISTS ingresos (
                id        INT AUTO_INCREMENT PRIMARY KEY,
                id_alumno INT NOT NULL,
                fecha     DATE NOT NULL,
                hora      VARCHAR(8) NOT NULL,
                creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (id_alumno) REFERENCES alumnos(id_alumno)
            )""")
            c.execute("""CREATE TABLE IF NOT EXISTS documentos (
                id          INT AUTO_INCREMENT PRIMARY KEY,
                id_alumno   INT NOT NULL,
                fecha       DATE NOT NULL,
                descripcion VARCHAR(300),
                archivo     VARCHAR(300) NOT NULL,
                creado_en   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (id_alumno) REFERENCES alumnos(id_alumno)
            )""")
            c.execute("""CREATE TABLE IF NOT EXISTS feriados (
                id          INT AUTO_INCREMENT PRIMARY KEY,
                fecha       DATE NOT NULL UNIQUE,
                descripcion VARCHAR(200) NOT NULL,
                tipo        VARCHAR(20) NOT NULL DEFAULT 'nacional'
            )""")
            c.execute("""CREATE TABLE IF NOT EXISTS faltas (
                id        INT AUTO_INCREMENT PRIMARY KEY,
                id_alumno INT NOT NULL,
                fecha     DATE NOT NULL,
                creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE KEY uniq_falta (id_alumno, fecha),
                FOREIGN KEY (id_alumno) REFERENCES alumnos(id_alumno)
            )""")
            c.execute("""CREATE TABLE IF NOT EXISTS notas (
                id          INT AUTO_INCREMENT PRIMARY KEY,
                id_alumno   INT NOT NULL,
                materia     VARCHAR(100) NOT NULL,
                trimestre   VARCHAR(20) NOT NULL,
                nota        DECIMAL(4,2) NOT NULL,
                observacion VARCHAR(300) DEFAULT NULL,
                id_profesor INT DEFAULT NULL,
                recu_numero   INT DEFAULT NULL,
                recu_titulo   VARCHAR(150) DEFAULT NULL,
                recu_nota     DECIMAL(4,2) DEFAULT NULL,
                recu_creado_en TIMESTAMP NULL DEFAULT NULL,
                r1_nota       DECIMAL(4,2) DEFAULT NULL,
                r2_nota       DECIMAL(4,2) DEFAULT NULL,
                creado_en   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (id_alumno) REFERENCES alumnos(id_alumno)
            )""")
            # notas puede ya existir de antes sin las columnas de recuperatorio
            # (CREATE TABLE IF NOT EXISTS no las agrega sola) — las sumamos a mano.
            for _col_sql in (
                "ALTER TABLE notas ADD COLUMN recu_numero INT DEFAULT NULL",
                "ALTER TABLE notas ADD COLUMN recu_titulo VARCHAR(150) DEFAULT NULL",
                "ALTER TABLE notas ADD COLUMN recu_nota DECIMAL(4,2) DEFAULT NULL",
                "ALTER TABLE notas ADD COLUMN recu_creado_en TIMESTAMP NULL DEFAULT NULL",
                "ALTER TABLE notas ADD COLUMN id_profesor INT DEFAULT NULL",
                "ALTER TABLE notas ADD COLUMN r1_nota DECIMAL(4,2) DEFAULT NULL",
                "ALTER TABLE notas ADD COLUMN r2_nota DECIMAL(4,2) DEFAULT NULL",
            ):
                try:
                    c.execute(_col_sql)
                    conn.commit()
                except Exception:
                    pass  # ya existe la columna, no pasa nada

            # Recuperatorios cargados con el modal viejo (N° de evaluación 1 o 2)
            # pasan a R1 / R2. Solo completa si R1/R2 están vacíos, así que se puede
            # repetir en cada arranque sin pisar nada.
            for _n in (1, 2):
                try:
                    c.execute(
                        f"UPDATE notas SET r{_n}_nota = recu_nota "
                        f"WHERE recu_numero = %s AND recu_nota IS NOT NULL AND r{_n}_nota IS NULL",
                        (_n,))
                    conn.commit()
                except Exception:
                    pass

            # ── PROFESORES / PRECEPTORÍA ──────────────────────────
            # es_preceptor = TRUE  → entra por Preceptoría (gmail + nombre + apellido + DNI, sin OTP)
            # es_preceptor = FALSE → entra por Profesores  (gmail + nombre completo, con OTP por mail)
            c.execute("""CREATE TABLE IF NOT EXISTS profesores (
                id_profesor  INT AUTO_INCREMENT PRIMARY KEY,
                nombre       VARCHAR(120) NOT NULL,
                apellido     VARCHAR(120) NOT NULL,
                gmail        VARCHAR(150) NOT NULL UNIQUE,
                dni          VARCHAR(15) DEFAULT NULL,
                materias     VARCHAR(300) DEFAULT NULL,
                cursos       VARCHAR(100) DEFAULT NULL,
                es_preceptor BOOLEAN NOT NULL DEFAULT FALSE,
                genero       CHAR(1) DEFAULT NULL,
                creado_en    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )""")
            # profesores puede ya existir sin la columna genero ('M' = profesor, 'F' = profesora)
            try:
                c.execute("ALTER TABLE profesores ADD COLUMN genero CHAR(1) DEFAULT NULL")
                conn.commit()
            except Exception:
                pass  # ya existe la columna, no pasa nada

            FERIADOS_FIJOS = [
                ('2026-01-01', 'Año Nuevo'),
                ('2026-02-16', 'Carnaval'),
                ('2026-02-17', 'Carnaval'),
                ('2026-03-24', 'Día Nacional de la Memoria por la Verdad y la Justicia'),
                ('2026-03-23', 'Día no laborable (puente turístico)'),
                ('2026-04-02', 'Día del Veterano y de los Caídos en la Guerra de Malvinas'),
                ('2026-04-03', 'Viernes Santo'),
                ('2026-05-01', 'Día del Trabajador'),
                ('2026-05-25', 'Día de la Revolución de Mayo'),
                ('2026-06-17', 'Paso a la Inmortalidad del Gral. Martín Miguel de Güemes'),
                ('2026-06-20', 'Paso a la Inmortalidad del Gral. Manuel Belgrano'),
                ('2026-07-09', 'Día de la Independencia'),
                ('2026-08-17', 'Paso a la Inmortalidad del Gral. José de San Martín'),
                ('2026-10-12', 'Día del Respeto a la Diversidad Cultural'),
                ('2026-11-20', 'Día de la Soberanía Nacional'),
                ('2026-12-08', 'Inmaculada Concepción de María'),
                ('2026-12-25', 'Navidad'),
            ]
            for fecha, desc in FERIADOS_FIJOS:
                c.execute(
                    "INSERT IGNORE INTO feriados (fecha, descripcion, tipo) VALUES (%s, %s, 'nacional')",
                    (fecha, desc)
                )

            # Semilla de profesores/preceptoría (planilla "Lista de profes").
            # INSERT IGNORE: si el gmail ya existe no lo pisa, así se puede
            # re-ejecutar sin duplicar ni perder ediciones manuales.
            PROFESORES_SEED = [
                ('Leonardo Osmar', 'Calvi', 'localvi@escuelasproa.edu.ar', None, 'Física / Biología / Química / Club de ciencias', '1ro - 2do - 3ro - 4to - 5to', False),
                ('Alexia', 'Galfre', 'agalfre@escuelasproa.edu.ar', None, 'Química', '6to - 2do', False),
                ('Mariana', 'Gubaro', 'mgubaro@escuelasproa.edu.ar', None, 'Matemáticas', '6to', False),
                ('Carmen', 'Devallis', 'cdevallis@escuelasproa.edu.ar', None, 'Matemáticas / Sistema y entornos', '1ro - 2do', False),
                ('Verónia', 'Hepp', 'vhepp@escuelasproa.edu.ar', None, 'Matemáticas', '4to - 5to', False),
                ('Valeria Nieves', 'Villalba', 'vnvillalba@escuelasproa.edu.ar', None, 'Programación / Estructura y almacenamiento de datos / Club de ciencias / Robótica', '3ro - 4to - 5to', False),
                ('Pablo', 'Torres', 'pmtorres@escuelasproa.edu.ar', None, 'Club de ciencias / Diseño de interfaces y usabilidad / Desarrollo de Apps móviles / Algoritmo y programación', '2do - 6to - 4to - 3ro', False),
                ('Marysol', 'Tello', 'matello@escuelasproa.edu.ar', None, 'Programación / Desarrollo de Apps móviles / Testing', '6to', False),
                ('Agustina', 'Seleme', 'asoledadseleme@escuelasproa.edu.ar', None, 'Inglés', '6to - 5to', False),
                ('Natalia', 'Quinteros', 'nataliaquinteros@escuelasproa.edu.ar', None, 'Inglés / TIA', '6to - 5to - 4to', False),
                ('Debora', 'Buratti', 'dburatti@escuelasproa.edu.ar', None, 'Lengua y Literatura', '1ro - 2do - 3ro - 5to - 6to', False),
                ('Florencia', 'Felici', 'mffelici@escuelasproa.edu.ar', None, 'FVT / Ciudadanía y política', '6to', False),
                ('Marina', 'Badino', 'mbadino@escuelasproa.edu.ar', None, 'Teatro / Club de arte / Danza', '1ro - 3ro - 4to - 6to', False),
                ('Yoavi', 'Costamagna', 'ycostamagna@escuelasproa.edu.ar', None, 'Música', '5to', False),
                ('Paula', 'Tresca', 'ptresca@escuelasproa.edu.ar', None, 'Artística', '4to', False),
                ('Edgar', 'Busto', 'edgarbusto@escuelasproa.edu.ar', None, 'Educación Física / Club', '6to', False),
                ('Sofia', 'Phileas', 'sphileas@escuelasproa.edu.ar', None, 'Educación Física / Club', '6to - 1ro', False),
                ('Blas', 'Bonsano', 'bbonzano@escuelasproa.edu.ar', None, 'Geografía', '1ro - 2do - 3ro - 4to', False),
                ('Soledad', 'Muñoz', 'msmunoz@escuelasproa.edu.ar', None, 'Ciudadanía y Participación / Filosofía', '6to', False),
                ('Facundo', 'Martinez', 'fmartinez@escuelasproa.edu.ar', None, 'Inglés / TIA', '1ro', False),
                ('Meliza', 'Ferroni', 'mferroni@escuelasproa.edu.ar', None, 'Tecnología', '3ro', False),
                ('Carina', 'Bruera', 'cabruera@escuelasproa.edu.ar', None, 'Educación Física / Club', '2do - 3ro', False),
                ('Juan Pablo', 'Freggiaro', 'jpfreggiaro@escuelasproa.edu.ar', None, 'Educación Física / Club', '5to', False),
                ('Evelin', 'Menazzi', 'ermenazzi@escuelasproa.edu.ar', None, 'Lengua y Literatura', '4to', False),
                ('Julieta', 'Demichellis', 'jdemichelis@escuelasproa.edu.ar', None, 'Tecnología', '1ro - 2do', False),
                ('Emanuel', 'Pacho', 'epacho@escuelasproa.edu.ar', '28650621', None, None, True),
                ('Lorena', 'Pizarro', 'lspizarro@escuelasproa.edu.ar', '27541557', None, None, True),
                ('Antonella', 'Monchietti', 'advmonchietti@escuelasproa.edu.ar', None, 'Club de arte', '2do', False),
                ('Sofi', 'Druetta', 'sfdrueta@escuelasproa.edu.ar', None, 'Coordinadora', None, False),
                ('Elisa', 'Selva', 'ebselva@escuelasproa.edu.ar', None, 'FVT / Ciudadanía', '5to', False),
            ]
            for nombre, apellido, gmail, dni, materias, cursos, es_prece in PROFESORES_SEED:
                c.execute("""
                    INSERT IGNORE INTO profesores (nombre, apellido, gmail, dni, materias, cursos, es_preceptor)
                    VALUES (%s, %s, %s, %s, %s, %s, %s)
                """, (nombre, apellido, gmail, dni, materias, cursos, es_prece))

            # Género de los docentes de la planilla (solo completa los que están vacíos,
            # así no pisa lo que se cambie después desde el panel de Directivos).
            _NOMBRES_MASC = {'Leonardo Osmar', 'Pablo', 'Edgar', 'Blas', 'Facundo',
                             'Juan Pablo', 'Emanuel', 'Yoavi'}
            for nombre, apellido, gmail, dni, materias, cursos, es_prece in PROFESORES_SEED:
                c.execute(
                    "UPDATE profesores SET genero = %s WHERE gmail = %s AND genero IS NULL",
                    ('M' if nombre in _NOMBRES_MASC else 'F', gmail))
        conn.commit()
        print("✅ Tablas auxiliares listas.")
    finally: conn.close()

# ══ MOTIVOS ════════════════════════════════════════════════════

@app.route('/motivo-tardanza', methods=['POST'])
def guardar_motivo():
    gmail  = request.form.get('gmail','').strip()
    motivo = request.form.get('motivo','').strip()
    if not gmail or not motivo:
        return jsonify({"error":"Faltan datos"}), 400
    id_al = _id_alumno(gmail)
    if not id_al:
        return jsonify({"error":"Alumno no encontrado"}), 404
    cert = None
    if 'certificado' in request.files:
        f = request.files['certificado']
        if f and f.filename and _allowed(f.filename):
            safe = secure_filename(f.filename)
            cert = f"{gmail.replace('@','_')}_{date.today()}_{safe}"
            f.save(os.path.join(CERTIFICADOS_DIR, cert))
    conn = get_connection()
    try:
        with conn.cursor() as c:
            c.execute("INSERT INTO motivos_tardanza (id_alumno,fecha,motivo,certificado) VALUES (%s,%s,%s,%s)",
                      (id_al, date.today(), motivo, cert))
        conn.commit()
        return jsonify({"ok":True,"certificado":cert})
    except Exception as e:
        return jsonify({"error":str(e)}), 500
    finally: conn.close()

@app.route('/prece/motivos', methods=['GET'])
def get_motivos():
    anio = request.args.get('anio', type=int)
    conn = get_connection()
    try:
        with conn.cursor() as c:
            sql = """SELECT m.id, p.nombre,p.apellido,p.gmail,m.fecha,m.motivo,m.certificado
                       FROM motivos_tardanza m
                       JOIN alumnos a ON m.id_alumno=a.id_alumno
                       JOIN personas p ON a.id_persona=p.id_persona"""
            params = []
            if anio:
                sql += " WHERE a.id_curso=%s"; params.append(anio)
            sql += " ORDER BY p.apellido,p.nombre,m.fecha DESC"
            c.execute(sql, params)
            filas = c.fetchall()
        agrup = {}
        for f in filas:
            k = f['gmail']
            if k not in agrup:
                agrup[k] = {'gmail':f['gmail'],'nombre':f['nombre'],'apellido':f['apellido'],'motivos':[]}
            agrup[k]['motivos'].append({'id':f['id'],'fecha':str(f['fecha']),'motivo':f['motivo'],'certificado':f['certificado']})
        return jsonify(list(agrup.values()))
    except Exception as e:
        return jsonify({"error":str(e)}), 500
    finally: conn.close()

@app.route('/prece/eliminar-motivo/<int:motivo_id>', methods=['DELETE'])
def eliminar_motivo(motivo_id):
    """Preceptor elimina un motivo de tardanza (y su certificado, si tenía)."""
    conn = get_connection()
    try:
        with conn.cursor() as c:
            c.execute("SELECT certificado FROM motivos_tardanza WHERE id = %s", (motivo_id,))
            row = c.fetchone()
        if not row:
            return jsonify({"error": "Motivo no encontrado"}), 404
        if row['certificado']:
            cert_path = os.path.join(CERTIFICADOS_DIR, row['certificado'])
            if os.path.exists(cert_path):
                os.remove(cert_path)
        with conn.cursor() as c:
            c.execute("DELETE FROM motivos_tardanza WHERE id = %s", (motivo_id,))
        conn.commit()
        return jsonify({"ok": True})
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        conn.close()

# ══ FOTOS ══════════════════════════════════════════════════════

@app.route('/foto-clase', methods=['POST'])
def guardar_foto():
    gmail = request.form.get('gmail','').strip()
    desc  = request.form.get('descripcion','').strip()
    if not gmail or 'foto' not in request.files:
        return jsonify({"error":"Faltan datos"}), 400
    id_al = _id_alumno(gmail)
    if not id_al:
        return jsonify({"error":"Alumno no encontrado"}), 404
    f = request.files['foto']
    if not f or not _allowed(f.filename):
        return jsonify({"error":"Formato no permitido"}), 400
    safe = secure_filename(f.filename)
    fn   = f"{gmail.replace('@','_')}_{date.today()}_{safe}"
    f.save(os.path.join(FOTOS_DIR, fn))
    conn = get_connection()
    try:
        with conn.cursor() as c:
            c.execute("INSERT INTO fotos_clase (id_alumno,fecha,descripcion,archivo) VALUES (%s,%s,%s,%s)",
                      (id_al, date.today(), desc, fn))
        conn.commit()
        return jsonify({"ok":True,"archivo":fn})
    except Exception as e:
        return jsonify({"error":str(e)}), 500
    finally: conn.close()

@app.route('/mis-fotos/<path:gmail>', methods=['GET'])
def get_mis_fotos(gmail):
    conn = get_connection()
    try:
        with conn.cursor() as c:
            c.execute("""SELECT fc.fecha,fc.descripcion,fc.archivo
                           FROM fotos_clase fc
                           JOIN alumnos a ON fc.id_alumno=a.id_alumno
                           JOIN personas p ON a.id_persona=p.id_persona
                           WHERE p.gmail=%s ORDER BY fc.fecha DESC""", (gmail,))
            rows = c.fetchall()
        return jsonify([{'fecha':str(r['fecha']),'descripcion':r['descripcion'],
                         'url':f"http://127.0.0.1:5000/uploads/fotos/{r['archivo']}"} for r in rows])
    except Exception as e:
        return jsonify({"error":str(e)}), 500
    finally: conn.close()

@app.route('/mis-motivos/<path:gmail>', methods=['GET'])
def get_mis_motivos(gmail):
    """
    Motivos (de tardanza y de falta) del alumno logueado, junto con el
    certificado adjunto si lo tienen. Alimenta el abanico "Certificados"
    en Alumno → Mis fotos y certificados.
    """
    conn = get_connection()
    try:
        with conn.cursor() as c:
            c.execute("""SELECT mt.fecha, mt.motivo, mt.certificado, 'tardanza' AS tipo
                           FROM motivos_tardanza mt
                           JOIN alumnos a ON mt.id_alumno = a.id_alumno
                           JOIN personas p ON a.id_persona = p.id_persona
                           WHERE p.gmail = %s
                         UNION ALL
                         SELECT mf.fecha, mf.motivo, mf.certificado, 'falta' AS tipo
                           FROM motivos_falta mf
                           JOIN alumnos a ON mf.id_alumno = a.id_alumno
                           JOIN personas p ON a.id_persona = p.id_persona
                           WHERE p.gmail = %s
                         ORDER BY fecha DESC""", (gmail, gmail))
            rows = c.fetchall()
        return jsonify([{'fecha': str(r['fecha']), 'motivo': r['motivo'],
                         'certificado': r['certificado'], 'tipo': r['tipo']} for r in rows])
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally: conn.close()

# ══ DOCUMENTACIÓN (archivos genéricos subidos por el alumno) ═══

@app.route('/documentacion', methods=['POST'])
def guardar_documento():
    gmail = request.form.get('gmail', '').strip()
    desc  = request.form.get('descripcion', '').strip()
    id_peticion = request.form.get('id_peticion', type=int)   # opcional: responde a una petición
    if not gmail or 'archivo' not in request.files:
        return jsonify({"error": "Faltan datos"}), 400
    id_al = _id_alumno(gmail)
    if not id_al:
        return jsonify({"error": "Alumno no encontrado"}), 404
    f = request.files['archivo']
    if not f or not f.filename or not _allowed_doc(f.filename):
        return jsonify({"error": "Formato no permitido"}), 400
    from werkzeug.utils import secure_filename
    safe = secure_filename(f.filename)
    fn   = f"{gmail.replace('@','_')}_{date.today()}_{safe}"
    f.save(os.path.join(DOCUMENTOS_DIR, fn))
    conn = get_connection()
    try:
        with conn.cursor() as c:
            c.execute("INSERT INTO documentos (id_alumno,fecha,descripcion,archivo) VALUES (%s,%s,%s,%s)",
                      (id_al, date.today(), desc, fn))
            id_doc = c.lastrowid
            if id_peticion:
                # Solo se marca si la petición es de ESTE alumno y estaba pendiente
                c.execute("""UPDATE peticiones_documentacion
                              SET estado='entregado', id_documento=%s, entregado_en=NOW()
                            WHERE id=%s AND id_alumno=%s AND estado='pendiente'""",
                          (id_doc, id_peticion, id_al))
        conn.commit()
        return jsonify({"ok": True, "archivo": fn})
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally: conn.close()

@app.route('/mis-documentos/<path:gmail>', methods=['GET'])
def get_mis_documentos(gmail):
    conn = get_connection()
    try:
        with conn.cursor() as c:
            c.execute("""SELECT d.fecha, d.descripcion, d.archivo
                           FROM documentos d
                           JOIN alumnos a ON d.id_alumno = a.id_alumno
                           JOIN personas p ON a.id_persona = p.id_persona
                           WHERE p.gmail = %s ORDER BY d.fecha DESC""", (gmail,))
            rows = c.fetchall()
        return jsonify([{'fecha': str(r['fecha']), 'descripcion': r['descripcion'],
                         'url': f"http://127.0.0.1:5000/uploads/documentos/{r['archivo']}"} for r in rows])
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally: conn.close()

@app.route('/prece/documentos', methods=['GET'])
def get_documentos_prece():
    anio = request.args.get('anio', type=int)
    conn = get_connection()
    try:
        with conn.cursor() as c:
            sql = """SELECT d.id, p.nombre, p.apellido, p.gmail, d.fecha, d.descripcion, d.archivo
                       FROM documentos d
                       JOIN alumnos a ON d.id_alumno = a.id_alumno
                       JOIN personas p ON a.id_persona = p.id_persona"""
            params = []
            if anio:
                sql += " WHERE a.id_curso = %s"; params.append(anio)
            sql += " ORDER BY d.fecha DESC"
            c.execute(sql, params)
            rows = c.fetchall()
        for r in rows: r['fecha'] = str(r['fecha'])
        return jsonify(rows)
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally: conn.close()

@app.route('/prece/eliminar-documento/<int:doc_id>', methods=['DELETE'])
def eliminar_documento(doc_id):
    """Preceptor elimina un documento subido por un alumno."""
    conn = get_connection()
    try:
        with conn.cursor() as c:
            c.execute("SELECT archivo FROM documentos WHERE id = %s", (doc_id,))
            row = c.fetchone()
        if not row:
            return jsonify({"error": "Documento no encontrado"}), 404
        archivo_path = os.path.join(DOCUMENTOS_DIR, row['archivo'])
        if os.path.exists(archivo_path):
            os.remove(archivo_path)
        with conn.cursor() as c:
            c.execute("""UPDATE peticiones_documentacion
                          SET estado='pendiente', id_documento=NULL, entregado_en=NULL
                        WHERE id_documento=%s""", (doc_id,))
            c.execute("DELETE FROM documentos WHERE id = %s", (doc_id,))
        conn.commit()
        return jsonify({"ok": True})
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        conn.close()

@app.route('/uploads/documentos/<path:filename>')
def serve_documento_file(filename): return send_from_directory(DOCUMENTOS_DIR, filename)

# ══ FERIADOS (para excluir faltas automáticas) ═════════════════

@app.route('/feriados', methods=['GET'])
def get_feriados():
    """Lista los feriados/excepciones cargados, del año actual en adelante."""
    conn = get_connection()
    try:
        inicio = date(date.today().year, 1, 1)
        with conn.cursor() as c:
            c.execute("SELECT id, fecha, descripcion, tipo FROM feriados WHERE fecha >= %s ORDER BY fecha", (inicio,))
            rows = c.fetchall()
        for r in rows: r['fecha'] = str(r['fecha'])
        return jsonify(rows)
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        conn.close()

@app.route('/feriados', methods=['POST'])
def agregar_feriado():
    """
    Preceptoría agrega una excepción (paro, suspensión de clases, etc).
    Si ya existían faltas automáticas generadas para esa fecha, se borran.
    """
    data  = request.get_json(silent=True) or {}
    fecha = data.get('fecha')
    desc  = (data.get('descripcion') or '').strip()
    if not fecha or not desc:
        return jsonify({"error": "Faltan datos"}), 400

    conn = get_connection()
    try:
        with conn.cursor() as c:
            c.execute(
                "INSERT INTO feriados (fecha, descripcion, tipo) VALUES (%s, %s, 'excepcion') "
                "ON DUPLICATE KEY UPDATE descripcion = VALUES(descripcion)",
                (fecha, desc)
            )
            c.execute("DELETE FROM faltas WHERE fecha = %s", (fecha,))
        conn.commit()
        return jsonify({"ok": True})
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        conn.close()

@app.route('/feriados/<int:feriado_id>', methods=['DELETE'])
def eliminar_feriado(feriado_id):
    """Quita un feriado/excepción cargado (los días vuelven a ser hábiles)."""
    conn = get_connection()
    try:
        with conn.cursor() as c:
            c.execute("DELETE FROM feriados WHERE id = %s", (feriado_id,))
        conn.commit()
        return jsonify({"ok": True})
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        conn.close()

# ══ FALTAS (persistidas, con exclusión de fines de semana/feriados) ══

@app.route('/prece/faltas/<int:anio>', methods=['GET'])
def prece_faltas_curso(anio):
    try:
        return jsonify(_listado_faltas_curso(anio))
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/mis-faltas/<path:gmail>', methods=['GET'])
def get_mis_faltas(gmail):
    """
    Faltas del alumno logueado (tabla persistida `faltas`), separadas en
    justificadas / injustificadas según si tiene un motivo de falta
    cargado para esa misma fecha. Alimenta el gráfico de barras por mes.
    """
    conn = get_connection()
    try:
        with conn.cursor() as c:
            c.execute("""SELECT a.id_alumno, a.id_curso FROM alumnos a
                          JOIN personas p ON a.id_persona = p.id_persona
                          WHERE p.gmail = %s LIMIT 1""", (gmail,))
            al = c.fetchone()
        if not al:
            return jsonify({"error": "Alumno no encontrado"}), 404

        _generar_faltas(al['id_curso'])

        with conn.cursor() as c:
            c.execute("SELECT fecha FROM faltas WHERE id_alumno = %s", (al['id_alumno'],))
            faltas_fechas = {r['fecha'] for r in c.fetchall()}

            c.execute("SELECT fecha FROM motivos_falta WHERE id_alumno = %s", (al['id_alumno'],))
            justificadas_fechas = {r['fecha'] for r in c.fetchall()}

        detalle = [{
            "fecha": str(f),
            "tipo": "justificada" if f in justificadas_fechas else "injustificada"
        } for f in sorted(faltas_fechas)]

        return jsonify({
            "detalle": detalle,
            "total": len(detalle),
            "justificadas": sum(1 for d in detalle if d['tipo'] == 'justificada'),
            "injustificadas": sum(1 for d in detalle if d['tipo'] == 'injustificada')
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        conn.close()

@app.route('/mis-tardanzas/<path:gmail>', methods=['GET'])
def get_mis_tardanzas(gmail):
    """Cantidad de llegadas tarde del alumno logueado en el ciclo lectivo."""
    inicio = date(date.today().year, 3, 1)

    conn = get_connection()
    try:
        with conn.cursor() as c:
            c.execute("""SELECT a.id_alumno FROM alumnos a
                          JOIN personas p ON a.id_persona = p.id_persona
                          WHERE p.gmail = %s LIMIT 1""", (gmail,))
            al = c.fetchone()
        if not al:
            return jsonify({"error": "Alumno no encontrado"}), 404

        with conn.cursor() as c:
            # Un día cuenta como tarde si el PRIMER QR del día se registró después de la hora límite
            c.execute("""SELECT COUNT(*) AS total FROM (
                              SELECT fecha, MIN(hora) AS hora FROM ingresos
                              WHERE id_alumno = %s AND fecha >= %s
                              GROUP BY fecha
                          ) t WHERE t.hora > %s""",
                      (al['id_alumno'], inicio, HORA_ENTRADA))
            total = c.fetchone()['total']

        return jsonify({"total": total})
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        conn.close()

@app.route('/mis-notas/<path:gmail>', methods=['GET'])
def get_mis_notas(gmail):
    """
    Promedio del alumno logueado según las notas que cargaron sus profesores.
    Regla (la misma que se le explica al alumno en el panel, por transparencia):
      · de cada MATERIA cuenta una sola nota: la última que se cargó (con su trimestre);
      · si esa nota tiene recuperatorio, cuenta el último (R2 si existe, si no R1),
        aunque sea más bajo que la nota original: no se elige "la mejor";
      · promedio = suma de esas notas / cantidad de materias.
    """
    conn = get_connection()
    try:
        with conn.cursor() as c:
            c.execute("""SELECT a.id_alumno FROM alumnos a
                          JOIN personas p ON a.id_persona = p.id_persona
                          WHERE p.gmail = %s LIMIT 1""", (gmail,))
            al = c.fetchone()
            if not al:
                return jsonify({"error": "Alumno no encontrado"}), 404
            c.execute("""SELECT id, materia, trimestre, nota, r1_nota, r2_nota
                           FROM notas WHERE id_alumno = %s ORDER BY id""",
                      (al['id_alumno'],))
            filas = c.fetchall()

        def _num(v):
            return None if v is None else float(v)

        # 1) Por materia + trimestre: último valor cargado (no vacío) de cada columna
        #    y el id de la última fila cargada (sirve para saber cuál es la más reciente).
        #    Las materias se comparan sin tildes ni mayúsculas ("Matemática" = "matematica").
        grupos = {}
        for f in filas:
            clave = (_norm_txt(f['materia']), f['trimestre'])
            g = grupos.setdefault(clave, {
                'materia': f['materia'], 'trimestre': f['trimestre'],
                'nota': None, 'r1': None, 'r2': None, 'ultimo_id': 0
            })
            g['materia'] = f['materia']
            for col, campo in (('nota', 'nota'), ('r1', 'r1_nota'), ('r2', 'r2_nota')):
                if _num(f[campo]) is not None:
                    g[col] = _num(f[campo])
            g['ultimo_id'] = max(g['ultimo_id'], f['id'])

        # 2) De cada materia se queda con el trimestre cuya nota se cargó última
        por_materia = {}
        for (mat_norm, _tri), g in grupos.items():
            if g['nota'] is None and g['r1'] is None and g['r2'] is None:
                continue
            actual = por_materia.get(mat_norm)
            if actual is None or g['ultimo_id'] > actual['ultimo_id']:
                por_materia[mat_norm] = g

        detalle = []
        for g in por_materia.values():
            # Última nota cargada: el recuperatorio más reciente (R2 > R1) reemplaza a la nota original
            ultima = g['r2'] if g['r2'] is not None else (g['r1'] if g['r1'] is not None else g['nota'])
            detalle.append({
                "materia": g['materia'],
                "trimestre": g['trimestre'],
                "nota": g['nota'],
                "r1": g['r1'],
                "r2": g['r2'],
                "cuenta": ultima,
            })
        detalle.sort(key=lambda d: _norm_txt(d['materia']))

        promedio = round(sum(d['cuenta'] for d in detalle) / len(detalle), 2) if detalle else None
        return jsonify({
            "detalle": detalle,
            "cantidad": len(detalle),
            "promedio": promedio
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        conn.close()

# ══ AVISOS DE TARDANZA (cargados por preceptor) ════════════════

@app.route('/prece/avisos', methods=['POST'])
def crear_aviso():
    """Preceptor carga un aviso de llegada tarde para un alumno individual."""
    data      = request.get_json()
    id_alumno = data.get('id_alumno')
    fecha     = data.get('fecha')
    hora      = data.get('hora')
    motivo    = data.get('motivo', '').strip()

    if not all([id_alumno, fecha, hora, motivo]):
        return jsonify({"error": "Faltan datos"}), 400

    conn = get_connection()
    try:
        with conn.cursor() as c:
            c.execute(
                "INSERT INTO avisos_tardanza (id_alumno, fecha, hora, motivo) VALUES (%s, %s, %s, %s)",
                (id_alumno, fecha, hora, motivo)
            )
        conn.commit()
        return jsonify({"ok": True})
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        conn.close()

@app.route('/prece/avisos/curso', methods=['POST'])
def crear_aviso_curso():
    """Preceptor carga un aviso para TODOS los alumnos de un curso."""
    data     = request.get_json()
    id_curso = data.get('id_curso')
    fecha    = data.get('fecha')
    hora     = data.get('hora')
    motivo   = data.get('motivo', '').strip()

    if not all([id_curso, fecha, hora, motivo]):
        return jsonify({"error": "Faltan datos"}), 400

    conn = get_connection()
    try:
        with conn.cursor() as c:
            c.execute("SELECT id_alumno FROM alumnos WHERE id_curso = %s", (id_curso,))
            alumnos = c.fetchall()

        if not alumnos:
            return jsonify({"error": f"No hay alumnos en {id_curso}° año"}), 404

        with conn.cursor() as c:
            # El envío se guarda UNA sola vez (para el historial)...
            c.execute(
                "INSERT INTO avisos_envios (id_curso, fecha, hora, motivo, total_alumnos) VALUES (%s, %s, %s, %s, %s)",
                (id_curso, fecha, hora, motivo, len(alumnos))
            )
            id_envio = c.lastrowid
            # ...y cada alumno sigue recibiendo su aviso como siempre.
            for a in alumnos:
                c.execute(
                    "INSERT INTO avisos_tardanza (id_alumno, fecha, hora, motivo, id_envio) VALUES (%s, %s, %s, %s, %s)",
                    (a['id_alumno'], fecha, hora, motivo, id_envio)
                )
        conn.commit()
        return jsonify({"ok": True, "total": len(alumnos), "id_envio": id_envio})
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        conn.close()

@app.route('/prece/avisos/<int:anio>', methods=['GET'])
def get_avisos_curso(anio):
    """Devuelve los avisos pendientes de un curso para que el preceptor los vea."""
    conn = get_connection()
    try:
        with conn.cursor() as c:
            c.execute("""
                SELECT av.id, p.nombre, p.apellido, p.gmail,
                       av.fecha, av.hora, av.motivo, av.anotado
                FROM avisos_tardanza av
                JOIN alumnos a ON av.id_alumno = a.id_alumno
                JOIN personas p ON a.id_persona = p.id_persona
                WHERE a.id_curso = %s
                ORDER BY av.fecha DESC, av.hora DESC
            """, (anio,))
            rows = c.fetchall()
        for r in rows:
            r['fecha'] = str(r['fecha'])
        return jsonify(rows)
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        conn.close()

@app.route('/mis-avisos/<path:gmail>', methods=['GET'])
def get_mis_avisos(gmail):
    """Devuelve los avisos pendientes (no anotados) del alumno logueado."""
    conn = get_connection()
    try:
        with conn.cursor() as c:
            c.execute("""
                SELECT av.id, av.fecha, av.hora, av.motivo
                FROM avisos_tardanza av
                JOIN alumnos a ON av.id_alumno = a.id_alumno
                JOIN personas p ON a.id_persona = p.id_persona
                WHERE p.gmail = %s AND av.anotado = FALSE
                ORDER BY av.fecha DESC
            """, (gmail,))
            rows = c.fetchall()
        for r in rows:
            r['fecha'] = str(r['fecha'])
        return jsonify(rows)
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        conn.close()

@app.route('/avisos/anotado/<int:aviso_id>', methods=['POST'])
def marcar_anotado(aviso_id):
    """El alumno tilda el aviso como visto → se marca anotado=TRUE."""
    conn = get_connection()
    try:
        with conn.cursor() as c:
            c.execute("UPDATE avisos_tardanza SET anotado = TRUE WHERE id = %s", (aviso_id,))
        conn.commit()
        return jsonify({"ok": True})
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        conn.close()

# ══ EVIDENCIAS: historial de avisos y de peticiones de documentación ══

def _hora_hhmm(h):
    return str(h)[:5] if h is not None else ''


@app.route('/prece/historial-avisos', methods=['GET'])
def historial_avisos():
    """
    Historial de avisos de ingreso tarde, UNO por envío al curso/año
    (no uno por alumno). Filtros opcionales: ?anio=N y ?fecha=YYYY-MM-DD.
    Los avisos anteriores a que existiera la tabla de envíos (sin id_envio)
    se reconstruyen agrupando por curso + fecha + hora + motivo.
    """
    anio  = request.args.get('anio', type=int)
    fecha = (request.args.get('fecha') or '').strip()
    conn = get_connection()
    try:
        with conn.cursor() as c:
            filtros, params = '', []
            if anio:
                filtros += ' AND id_curso = %s'; params.append(anio)
            if fecha:
                filtros += ' AND fecha = %s';    params.append(fecha)
            c.execute(f"""SELECT id, id_curso AS anio, fecha, hora, motivo, total_alumnos AS total
                            FROM avisos_envios WHERE 1=1 {filtros}""", params)
            envios = c.fetchall()

            filtros2, params2 = '', []
            if anio:
                filtros2 += ' AND a.id_curso = %s'; params2.append(anio)
            if fecha:
                filtros2 += ' AND av.fecha = %s';   params2.append(fecha)
            c.execute(f"""SELECT a.id_curso AS anio, av.fecha, av.hora, av.motivo, COUNT(*) AS total
                            FROM avisos_tardanza av
                            JOIN alumnos a ON av.id_alumno = a.id_alumno
                           WHERE av.id_envio IS NULL {filtros2}
                           GROUP BY a.id_curso, av.fecha, av.hora, av.motivo""", params2)
            antiguos = c.fetchall()

        resultado = []
        for r in envios:
            resultado.append({"id": r['id'], "anio": r['anio'], "fecha": str(r['fecha']),
                              "hora": _hora_hhmm(r['hora']), "motivo": r['motivo'], "total": r['total']})
        for r in antiguos:
            resultado.append({"id": None, "anio": r['anio'], "fecha": str(r['fecha']),
                              "hora": _hora_hhmm(r['hora']), "motivo": r['motivo'], "total": r['total']})
        resultado.sort(key=lambda x: (x['fecha'], x['hora']), reverse=True)
        return jsonify(resultado)
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        conn.close()


@app.route('/prece/historial-avisos/detalle', methods=['GET'])
def historial_avisos_detalle():
    """
    Detalle de un envío: datos del aviso y alumnos relacionados.
    ?id=N (envío) o, para avisos antiguos: ?anio=&fecha=&hora=&motivo=
    """
    id_envio = request.args.get('id', type=int)
    conn = get_connection()
    try:
        with conn.cursor() as c:
            if id_envio:
                c.execute("""SELECT id, id_curso AS anio, fecha, hora, motivo, total_alumnos AS total, creado_en
                               FROM avisos_envios WHERE id = %s""", (id_envio,))
                env = c.fetchone()
                if not env:
                    return jsonify({"error": "Aviso no encontrado"}), 404
                c.execute("""SELECT p.nombre, p.apellido, av.anotado
                               FROM avisos_tardanza av
                               JOIN alumnos a ON av.id_alumno = a.id_alumno
                               JOIN personas p ON a.id_persona = p.id_persona
                              WHERE av.id_envio = %s
                              ORDER BY p.apellido, p.nombre""", (id_envio,))
                alumnos = c.fetchall()
            else:
                anio   = request.args.get('anio', type=int)
                fecha  = (request.args.get('fecha') or '').strip()
                hora   = (request.args.get('hora') or '').strip()
                motivo = request.args.get('motivo') or ''
                if not (anio and fecha and hora):
                    return jsonify({"error": "Faltan datos"}), 400
                c.execute("""SELECT p.nombre, p.apellido, av.anotado
                               FROM avisos_tardanza av
                               JOIN alumnos a ON av.id_alumno = a.id_alumno
                               JOIN personas p ON a.id_persona = p.id_persona
                              WHERE av.id_envio IS NULL AND a.id_curso = %s AND av.fecha = %s
                                AND LEFT(av.hora, 5) = %s AND av.motivo = %s
                              ORDER BY p.apellido, p.nombre""", (anio, fecha, hora[:5], motivo))
                alumnos = c.fetchall()
                env = {"id": None, "anio": anio, "fecha": fecha, "hora": hora, "motivo": motivo,
                       "total": len(alumnos), "creado_en": None}

        return jsonify({
            "id": env['id'], "anio": env['anio'], "fecha": str(env['fecha']),
            "hora": _hora_hhmm(env['hora']), "motivo": env['motivo'], "total": env['total'],
            "enviado_en": str(env['creado_en']) if env.get('creado_en') else None,
            "alumnos": [{"nombre": a['nombre'], "apellido": a['apellido'], "anotado": bool(a['anotado'])}
                        for a in alumnos]
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        conn.close()


@app.route('/prece/peticiones', methods=['POST'])
def crear_peticion():
    """Preceptor pide un documento a UN alumno. También le llega como anuncio."""
    from datetime import datetime
    data      = request.get_json() or {}
    id_alumno = data.get('id_alumno')
    documento = (data.get('documento') or '').strip()
    mensaje   = (data.get('mensaje') or '').strip()
    if not id_alumno or not documento:
        return jsonify({"error": "Elegí un alumno y escribí el documento que se solicita."}), 400

    ahora = datetime.now()
    fecha, hora = ahora.strftime('%Y-%m-%d'), ahora.strftime('%H:%M')
    conn = get_connection()
    try:
        with conn.cursor() as c:
            c.execute("SELECT id_alumno FROM alumnos WHERE id_alumno = %s", (id_alumno,))
            if not c.fetchone():
                return jsonify({"error": "Alumno no encontrado"}), 404
            c.execute("""INSERT INTO peticiones_documentacion (id_alumno, fecha, hora, documento, mensaje)
                         VALUES (%s, %s, %s, %s, %s)""", (id_alumno, fecha, hora, documento, mensaje or None))
            id_pet = c.lastrowid
            # Aviso privado al alumno (mismo mecanismo que los anuncios existentes)
            texto = f"📄 Se te solicita presentar: {documento}."
            if mensaje:
                texto += f" {mensaje}"
            c.execute("INSERT INTO anuncios_alumno (id_alumno, fecha, hora, mensaje) VALUES (%s, %s, %s, %s)",
                      (id_alumno, fecha, hora, texto))
        conn.commit()
        return jsonify({"ok": True, "id": id_pet})
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        conn.close()


@app.route('/prece/peticiones', methods=['GET'])
def listar_peticiones():
    """Historial de peticiones. Filtros: ?anio=N ?estado=pendiente|entregado ?fecha=YYYY-MM-DD"""
    anio   = request.args.get('anio', type=int)
    estado = (request.args.get('estado') or '').strip()
    fecha  = (request.args.get('fecha') or '').strip()
    conn = get_connection()
    try:
        with conn.cursor() as c:
            sql = """SELECT pd.id, pd.fecha, pd.hora, pd.documento, pd.estado,
                            p.nombre, p.apellido, a.id_curso AS anio
                       FROM peticiones_documentacion pd
                       JOIN alumnos  a ON pd.id_alumno  = a.id_alumno
                       JOIN personas p ON a.id_persona = p.id_persona
                      WHERE 1=1"""
            params = []
            if anio:
                sql += " AND a.id_curso = %s";  params.append(anio)
            if estado in ('pendiente', 'entregado'):
                sql += " AND pd.estado = %s";   params.append(estado)
            if fecha:
                sql += " AND pd.fecha = %s";    params.append(fecha)
            sql += " ORDER BY pd.fecha DESC, pd.hora DESC, pd.id DESC"
            c.execute(sql, params)
            rows = c.fetchall()
        for r in rows:
            r['fecha'] = str(r['fecha'])
            r['hora']  = _hora_hhmm(r['hora'])
        return jsonify(rows)
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        conn.close()


@app.route('/prece/peticiones/<int:pet_id>', methods=['GET'])
def detalle_peticion(pet_id):
    """Detalle de una petición, con el archivo presentado si ya fue entregada."""
    conn = get_connection()
    try:
        with conn.cursor() as c:
            c.execute("""SELECT pd.id, pd.fecha, pd.hora, pd.documento, pd.mensaje, pd.estado,
                                pd.id_documento, pd.entregado_en,
                                p.nombre, p.apellido, p.gmail, a.id_curso AS anio
                           FROM peticiones_documentacion pd
                           JOIN alumnos  a ON pd.id_alumno  = a.id_alumno
                           JOIN personas p ON a.id_persona = p.id_persona
                          WHERE pd.id = %s""", (pet_id,))
            r = c.fetchone()
            if not r:
                return jsonify({"error": "Petición no encontrada"}), 404
            archivo = None
            if r['id_documento']:
                c.execute("SELECT fecha, descripcion, archivo FROM documentos WHERE id = %s", (r['id_documento'],))
                d = c.fetchone()
                if d:
                    archivo = {"fecha": str(d['fecha']), "descripcion": d['descripcion'],
                               "nombre": d['archivo'],
                               "url": f"http://127.0.0.1:5000/uploads/documentos/{d['archivo']}"}
        return jsonify({
            "id": r['id'], "fecha": str(r['fecha']), "hora": _hora_hhmm(r['hora']),
            "documento": r['documento'], "mensaje": r['mensaje'] or '', "estado": r['estado'],
            "entregado_en": str(r['entregado_en']) if r['entregado_en'] else None,
            "nombre": r['nombre'], "apellido": r['apellido'], "gmail": r['gmail'], "anio": r['anio'],
            "archivo": archivo
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        conn.close()


@app.route('/prece/peticiones/<int:pet_id>/estado', methods=['POST'])
def cambiar_estado_peticion(pet_id):
    """Marca una petición como entregada o pendiente a mano (ej: se entregó en papel)."""
    estado = ((request.get_json() or {}).get('estado') or '').strip()
    if estado not in ('pendiente', 'entregado'):
        return jsonify({"error": "Estado inválido"}), 400
    conn = get_connection()
    try:
        with conn.cursor() as c:
            if estado == 'entregado':
                c.execute("UPDATE peticiones_documentacion SET estado='entregado', entregado_en=COALESCE(entregado_en, NOW()) WHERE id=%s", (pet_id,))
            else:
                c.execute("UPDATE peticiones_documentacion SET estado='pendiente', id_documento=NULL, entregado_en=NULL WHERE id=%s", (pet_id,))
        conn.commit()
        return jsonify({"ok": True})
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        conn.close()


@app.route('/prece/peticiones/<int:pet_id>', methods=['DELETE'])
def eliminar_peticion(pet_id):
    conn = get_connection()
    try:
        with conn.cursor() as c:
            c.execute("DELETE FROM peticiones_documentacion WHERE id = %s", (pet_id,))
        conn.commit()
        return jsonify({"ok": True})
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        conn.close()


@app.route('/mis-peticiones/<path:gmail>', methods=['GET'])
def mis_peticiones(gmail):
    """Peticiones PENDIENTES del alumno logueado (para elegir a cuál responde al subir un documento)."""
    conn = get_connection()
    try:
        with conn.cursor() as c:
            c.execute("""SELECT pd.id, pd.fecha, pd.documento
                           FROM peticiones_documentacion pd
                           JOIN alumnos  a ON pd.id_alumno  = a.id_alumno
                           JOIN personas p ON a.id_persona = p.id_persona
                          WHERE p.gmail = %s AND pd.estado = 'pendiente'
                          ORDER BY pd.fecha DESC, pd.id DESC""", (gmail,))
            rows = c.fetchall()
        for r in rows:
            r['fecha'] = str(r['fecha'])
        return jsonify(rows)
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        conn.close()


# ══ ANUNCIOS (mensajes privados del preceptor) ══════════════════

@app.route('/prece/anuncios', methods=['POST'])
def crear_anuncio():
    """
    Preceptor envía un mensaje privado a un alumno individual.
    fecha/hora se generan acá si el cliente no las manda (el formulario
    de "Enviar anuncio" solo envía id_alumno + mensaje) — antes esto
    hacía que la validación de abajo fallara siempre con "Faltan datos"
    y el anuncio nunca se guardaba, por eso no llegaban las notificaciones.
    """
    import datetime as _dt
    data      = request.get_json() or {}
    id_alumno = data.get('id_alumno')
    fecha     = data.get('fecha') or _dt.date.today().isoformat()
    hora      = data.get('hora') or _dt.datetime.now().strftime('%H:%M')
    mensaje   = (data.get('mensaje') or '').strip()
    # Opcional: si el preceptor indica un documento, además del anuncio queda
    # registrada una petición de documentación (se ve en Evidencias).
    documento = (data.get('documento') or '').strip()[:300]

    if not id_alumno or not mensaje:
        return jsonify({"error": "Faltan datos"}), 400

    conn = get_connection()
    try:
        with conn.cursor() as c:
            c.execute(
                "INSERT INTO anuncios_alumno (id_alumno, fecha, hora, mensaje) VALUES (%s, %s, %s, %s)",
                (id_alumno, fecha, hora, mensaje)
            )
            if documento:
                c.execute(
                    """INSERT INTO peticiones_documentacion (id_alumno, fecha, hora, documento, mensaje)
                       VALUES (%s, %s, %s, %s, %s)""",
                    (id_alumno, fecha, hora, documento, mensaje)
                )
        conn.commit()
        return jsonify({"ok": True, "peticion": bool(documento)})
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        conn.close()

@app.route('/prece/anuncios/<int:anio>', methods=['GET'])
def get_anuncios_curso(anio):
    """Devuelve los mensajes privados enviados a alumnos de un curso, para que el preceptor los vea."""
    conn = get_connection()
    try:
        with conn.cursor() as c:
            c.execute("""
                SELECT an.id, p.nombre, p.apellido, p.gmail,
                       an.fecha, an.hora, an.mensaje, an.leido
                FROM anuncios_alumno an
                JOIN alumnos a ON an.id_alumno = a.id_alumno
                JOIN personas p ON a.id_persona = p.id_persona
                WHERE a.id_curso = %s
                ORDER BY an.fecha DESC, an.hora DESC
            """, (anio,))
            rows = c.fetchall()
        for r in rows:
            r['fecha']     = str(r['fecha'])
            r['leido']     = bool(r['leido'])
            r['creado_en'] = f"{r['fecha']} · {r['hora']}"
        return jsonify(rows)
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        conn.close()

@app.route('/mis-anuncios/<path:gmail>', methods=['GET'])
def get_mis_anuncios(gmail):
    """Devuelve los mensajes privados PENDIENTES (no leídos) del alumno logueado."""
    conn = get_connection()
    try:
        with conn.cursor() as c:
            c.execute("""
                SELECT an.id, an.fecha, an.hora, an.mensaje
                FROM anuncios_alumno an
                JOIN alumnos a ON an.id_alumno = a.id_alumno
                JOIN personas p ON a.id_persona = p.id_persona
                WHERE p.gmail = %s AND (an.leido = FALSE OR an.leido IS NULL)
                ORDER BY an.fecha DESC, an.hora DESC
            """, (gmail,))
            rows = c.fetchall()
        for r in rows:
            r['fecha'] = str(r['fecha'])
        return jsonify(rows)
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        conn.close()

@app.route('/anuncios/leido/<int:anuncio_id>', methods=['POST'])
def marcar_anuncio_leido(anuncio_id):
    """El alumno marca un mensaje privado (anuncio) como leído."""
    conn = get_connection()
    try:
        with conn.cursor() as c:
            c.execute("UPDATE anuncios_alumno SET leido = TRUE WHERE id = %s", (anuncio_id,))
        conn.commit()
        return jsonify({"ok": True})
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        conn.close()

@app.route('/prece/eliminar-anuncio/<int:anuncio_id>', methods=['DELETE'])
def eliminar_anuncio(anuncio_id):
    """Preceptor elimina un mensaje privado enviado."""
    conn = get_connection()
    try:
        with conn.cursor() as c:
            c.execute("DELETE FROM anuncios_alumno WHERE id = %s", (anuncio_id,))
        conn.commit()
        return jsonify({"ok": True})
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        conn.close()

@app.route('/alumnos-lista/<int:anio>', methods=['GET'])
def get_alumnos_lista(anio):
    """Devuelve id_alumno + nombre + apellido para el selector del formulario de avisos."""
    conn = get_connection()
    try:
        with conn.cursor() as c:
            c.execute("""
                SELECT a.id_alumno, p.nombre, p.apellido
                FROM alumnos a JOIN personas p ON a.id_persona = p.id_persona
                WHERE a.id_curso = %s ORDER BY p.apellido, p.nombre
            """, (anio,))
            return jsonify(c.fetchall())
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        conn.close()

# ── Servir archivos ─────────────────────────────────────────────
@app.route('/uploads/certificados/<path:filename>')
def serve_cert(filename): return send_from_directory(CERTIFICADOS_DIR, filename)

@app.route('/uploads/fotos/<path:filename>')
def serve_foto_file(filename): return send_from_directory(FOTOS_DIR, filename)

@app.route('/prece/eliminar-aviso/<int:aviso_id>', methods=['DELETE'])
def eliminar_aviso(aviso_id):
    """Preceptor elimina un aviso de tardanza."""
    conn = get_connection()
    try:
        with conn.cursor() as c:
            c.execute("DELETE FROM avisos_tardanza WHERE id = %s", (aviso_id,))
        conn.commit()
        return jsonify({"ok": True})
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        conn.close()

@app.route('/<path:filename>')
def serve_static(filename): return send_from_directory(BASE_DIR, filename)


# ══ INGRESOS QR ════════════════════════════════════════════════

@app.route('/registrar-ingreso', methods=['POST'])
def registrar_ingreso():
    """Registra el ingreso de un alumno escaneado por QR."""
    from datetime import datetime
    data      = request.get_json()
    id_alumno = data.get('id_alumno')
    if not id_alumno:
        return jsonify({"error": "Falta id_alumno"}), 400

    ahora = datetime.now()
    fecha = ahora.strftime('%Y-%m-%d')
    hora  = ahora.strftime('%H:%M:%S')

    conn = get_connection()
    try:
        with conn.cursor() as c:
            # Verificar que el alumno existe y traer su nombre
            c.execute("""
                SELECT p.nombre, p.apellido, a.id_curso
                FROM alumnos a JOIN personas p ON a.id_persona = p.id_persona
                WHERE a.id_alumno = %s
            """, (id_alumno,))
            alumno = c.fetchone()
        if not alumno:
            return jsonify({"error": "Alumno no encontrado"}), 404

        # Un solo ingreso por día: si ya escaneó, se conserva el PRIMERO
        # (así un segundo escaneo no cambia si llegó a tiempo o tarde).
        ya_registrado = False
        with conn.cursor() as c:
            c.execute(
                "SELECT MIN(hora) AS hora FROM ingresos WHERE id_alumno = %s AND fecha = %s",
                (id_alumno, fecha)
            )
            previo = c.fetchone()
            if previo and previo['hora']:
                ya_registrado = True
                hora = str(previo['hora'])
            else:
                c.execute(
                    "INSERT INTO ingresos (id_alumno, fecha, hora) VALUES (%s, %s, %s)",
                    (id_alumno, fecha, hora)
                )
                conn.commit()
        return jsonify({
            "ok":            True,
            "nombre":        alumno['nombre'],
            "apellido":      alumno['apellido'],
            "hora":          hora[:5],   # HH:MM
            "tarde":         hora > HORA_ENTRADA,   # QR registrado después de las 08:00
            "ya_registrado": ya_registrado,
            "anio":          alumno['id_curso']
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        conn.close()

@app.route('/ingresos/<int:anio>', methods=['GET'])
def get_ingresos(anio):
    """Devuelve ingresos de hoy de un curso para preceptoría."""
    from datetime import date
    hoy  = date.today().isoformat()
    conn = get_connection()
    try:
        with conn.cursor() as c:
            c.execute("""
                SELECT p.nombre, p.apellido, i.hora, i.fecha
                FROM ingresos i
                JOIN alumnos  a ON i.id_alumno  = a.id_alumno
                JOIN personas p ON a.id_persona = p.id_persona
                WHERE a.id_curso = %s AND i.fecha = %s
                ORDER BY i.hora ASC
            """, (anio, hoy))
            rows = c.fetchall()
        for r in rows:
            r['fecha'] = str(r['fecha'])
        return jsonify(rows)
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        conn.close()

@app.route('/ingresos-fecha/<int:anio>', methods=['GET'])
def get_ingresos_fecha(anio):
    """Devuelve ingresos de una fecha específica para preceptoría."""
    fecha = request.args.get('fecha')
    if not fecha:
        from datetime import date
        fecha = date.today().isoformat()
    conn = get_connection()
    try:
        with conn.cursor() as c:
            c.execute("""
                SELECT p.nombre, p.apellido, i.hora, i.fecha
                FROM ingresos i
                JOIN alumnos  a ON i.id_alumno  = a.id_alumno
                JOIN personas p ON a.id_persona = p.id_persona
                WHERE a.id_curso = %s AND i.fecha = %s
                ORDER BY i.hora ASC
            """, (anio, fecha))
            rows = c.fetchall()
        for r in rows:
            r['fecha'] = str(r['fecha'])
        return jsonify(rows)
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        conn.close()

# ══ ESTADÍSTICAS PARA DIRECTIVOS (basadas en ingresos reales del escáner) ══

@app.route('/dir/asistencia-hoy/<int:anio>', methods=['GET'])
def dir_asistencia_hoy(anio):
    """
    Devuelve presentes, tardes y ausentes de HOY para un curso,
    basado en la tabla ingresos (registros del escáner QR).
    """
    from datetime import date
    hoy = date.today().isoformat()
    conn = get_connection()
    try:
        with conn.cursor() as c:
            # Total alumnos del curso
            c.execute("SELECT COUNT(*) AS total FROM alumnos WHERE id_curso = %s", (anio,))
            total = c.fetchone()['total']

            # Ingresos de hoy para ese curso
            c.execute("""
                SELECT i.id_alumno, MIN(i.hora) AS hora
                FROM ingresos i
                JOIN alumnos a ON i.id_alumno = a.id_alumno
                WHERE a.id_curso = %s AND i.fecha = %s
                GROUP BY i.id_alumno
            """, (anio, hoy))
            ingresos = c.fetchall()

        presentes = sum(1 for r in ingresos if r['hora'] <= HORA_ENTRADA)
        tardes    = sum(1 for r in ingresos if r['hora'] >  HORA_ENTRADA)
        ausentes  = max(0, total - presentes - tardes)   # sin QR registrado = falta

        return jsonify({
            "total":     total,
            "presentes": presentes,
            "tardes":    tardes,
            "ausentes":  ausentes
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        conn.close()


@app.route('/dir/faltas-alumno/<int:anio>', methods=['GET'])
def dir_faltas_alumno(anio):
    """
    Devuelve, por alumno, la cantidad de faltas, cuántas tienen un motivo
    justificado cargado (tabla `motivos_falta`, cruzado por fecha) y los
    motivos más frecuentes.
    Regla: hay falta cuando el QR NO fue registrado en un día hábil.
    Usa la misma fuente que preceptoría y que el panel del alumno
    (tabla `faltas`), así los tres paneles muestran los mismos números.
    """
    try:
        return jsonify(_listado_faltas_curso(anio))
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/dir/tardanzas-alumno/<int:anio>', methods=['GET'])
def dir_tardanzas_alumno(anio):
    """
    Devuelve, por alumno, la cantidad de llegadas tarde reales (escáner,
    tabla ingresos, primer QR del día después de las 08:00), cuántas de esas tardanzas tienen un
    motivo cargado por el propio alumno para la misma fecha (tabla
    motivos_tardanza, cruzado por fecha) y los motivos más frecuentes.
    Importante: Directivos solo usa motivos subidos por los ALUMNOS.
    Los avisos cargados por preceptoría (avisos_tardanza) son harina de
    otro costal y no entran acá.
    """
    from datetime import date
    from collections import Counter
    inicio = date(date.today().year, 3, 1).isoformat()

    conn = get_connection()
    try:
        with conn.cursor() as c:
            c.execute("""
                SELECT a.id_alumno, p.nombre, p.apellido, p.gmail
                FROM alumnos a
                JOIN personas p ON a.id_persona = p.id_persona
                WHERE a.id_curso = %s
                ORDER BY p.apellido, p.nombre
            """, (anio,))
            alumnos = c.fetchall()

            # Ingresos tarde del período (fecha real de cada tardanza)
            # (se toma el PRIMER QR de cada día: si ese fue después de la hora límite, es tarde)
            c.execute("""
                SELECT t.id_alumno, t.fecha FROM (
                    SELECT i.id_alumno, i.fecha, MIN(i.hora) AS hora
                    FROM ingresos i
                    JOIN alumnos a ON i.id_alumno = a.id_alumno
                    WHERE a.id_curso = %s AND i.fecha >= %s
                    GROUP BY i.id_alumno, i.fecha
                ) t
                WHERE t.hora > %s
            """, (anio, inicio, HORA_ENTRADA))
            tard_rows = c.fetchall()

            # Motivos subidos por los propios alumnos (con fecha, para cruzar con la tardanza real)
            c.execute("""
                SELECT m.id_alumno, m.fecha, m.motivo
                FROM motivos_tardanza m
                JOIN alumnos a ON m.id_alumno = a.id_alumno
                WHERE a.id_curso = %s AND m.fecha >= %s
            """, (anio, inicio))
            motivos_rows = c.fetchall()

        # Fechas de tardanza real por alumno
        tard_fechas_map = {}
        for r in tard_rows:
            tard_fechas_map.setdefault(r['id_alumno'], set()).add(str(r['fecha']))

        # Motivos (fecha + texto) subidos por cada alumno
        motivos_por_alumno = {}
        for r in motivos_rows:
            motivos_por_alumno.setdefault(r['id_alumno'], []).append(
                {'fecha': str(r['fecha']), 'motivo': r['motivo']}
            )

        resultado = []
        for al in alumnos:
            id_al = al['id_alumno']
            fechas_tarde = tard_fechas_map.get(id_al, set())
            motivos_al = motivos_por_alumno.get(id_al, [])

            con_motivo = len({m['fecha'] for m in motivos_al if m['fecha'] in fechas_tarde})
            top3 = [m for m, _ in Counter(m['motivo'] for m in motivos_al if m['motivo']).most_common(3)]

            resultado.append({
                "id_alumno":  id_al,
                "nombre":     al['nombre'],
                "apellido":   al['apellido'],
                "gmail":      al['gmail'],
                "tardanzas":  len(fechas_tarde),
                "con_motivo": con_motivo,
                "topMotivos": top3
            })

        return jsonify(resultado)
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        conn.close()


@app.route('/prece/avisos/<int:anio>/meses', methods=['GET'])
def get_meses_avisos(anio):
    """Devuelve los meses (año-mes) que tienen avisos registrados para un curso."""
    conn = get_connection()
    try:
        with conn.cursor() as c:
            c.execute("""
                SELECT DISTINCT av.fecha
                FROM avisos_tardanza av
                JOIN alumnos a ON av.id_alumno = a.id_alumno
                WHERE a.id_curso = %s
                ORDER BY av.fecha DESC
            """, (anio,))
            rows = c.fetchall()
        # Agrupar por año-mes único
        meses_vistos = {}
        for r in rows:
            fecha = str(r['fecha'])
            anio_mes = fecha[:7]  # "YYYY-MM"
            if anio_mes not in meses_vistos:
                partes = anio_mes.split('-')
                meses_vistos[anio_mes] = {
                    'anio_mes': anio_mes,
                    'anio': int(partes[0]),
                    'mes': int(partes[1])
                }
        return jsonify(list(meses_vistos.values()))
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        conn.close()

@app.route('/prece/avisos/<int:anio>/mes/<string:anio_mes>', methods=['GET'])
def get_avisos_curso_mes(anio, anio_mes):
    """Devuelve los avisos de un curso filtrados por mes (YYYY-MM)."""
    conn = get_connection()
    try:
        with conn.cursor() as c:
            c.execute("""
                SELECT av.id, p.nombre, p.apellido, p.gmail,
                       av.fecha, av.hora, av.motivo, av.anotado
                FROM avisos_tardanza av
                JOIN alumnos a ON av.id_alumno = a.id_alumno
                JOIN personas p ON a.id_persona = p.id_persona
                WHERE a.id_curso = %s AND av.fecha LIKE %s
                ORDER BY av.fecha DESC, av.hora DESC
            """, (anio, anio_mes + '%'))
            rows = c.fetchall()
        for r in rows:
            r['fecha'] = str(r['fecha'])
            r['anotado'] = bool(r['anotado'])
        return jsonify(rows)
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        conn.close()


@app.route('/prece/avisos/<int:anio>/fecha/<string:fecha>', methods=['DELETE'])
def eliminar_avisos_curso_fecha(anio, fecha):
    """Elimina todos los avisos de un curso para una fecha exacta (YYYY-MM-DD)."""
    conn = get_connection()
    try:
        with conn.cursor() as c:
            c.execute("""
                DELETE av FROM avisos_tardanza av
                JOIN alumnos a ON av.id_alumno = a.id_alumno
                WHERE a.id_curso = %s AND av.fecha = %s
            """, (anio, fecha))
            eliminados = c.rowcount
        conn.commit()
        return jsonify({"ok": True, "eliminados": eliminados})
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        conn.close()

@app.route('/prece/avisos', methods=['GET'])
def get_avisos_general():
    anio = request.args.get('anio', type=int)
    conn = get_connection()
    try:
        with conn.cursor() as c:
            sql = """
                SELECT av.id, p.gmail, p.nombre, p.apellido,
                       av.fecha, av.hora, av.motivo, av.anotado,
                       a.id_curso AS anio
                FROM avisos_tardanza av
                JOIN alumnos  a ON av.id_alumno = a.id_alumno
                JOIN personas p ON a.id_persona = p.id_persona
            """
            params = []
            if anio:
                sql += " WHERE a.id_curso = %s"
                params.append(anio)
            sql += " ORDER BY av.fecha DESC"
            c.execute(sql, params)
            rows = c.fetchall()

            # Total de alumnos por curso
            c.execute("SELECT id_curso, COUNT(*) AS total FROM alumnos GROUP BY id_curso")
            totales = {r['id_curso']: r['total'] for r in c.fetchall()}

        for r in rows:
            r['fecha']          = str(r['fecha'])
            r['anotado']        = bool(r['anotado'])
            r['total_curso']    = totales.get(r['anio'], 0)
        return jsonify(rows)
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        conn.close()


@app.route('/dir/tendencias/<int:anio>', methods=['GET'])
def dir_tendencias(anio):
    from datetime import date
    from collections import Counter
    inicio = date(date.today().year, 3, 1).isoformat()

    conn = get_connection()
    try:
        with conn.cursor() as c:
            # Tardanzas reales del escáner, traemos fecha y hora individuales
            c.execute("""
                SELECT t.fecha FROM (
                    SELECT i.id_alumno, i.fecha, MIN(i.hora) AS hora
                    FROM ingresos i
                    JOIN alumnos a ON i.id_alumno = a.id_alumno
                    WHERE a.id_curso = %s AND i.fecha >= %s
                    GROUP BY i.id_alumno, i.fecha
                ) t
                WHERE t.hora > %s
            """, (anio, inicio, HORA_ENTRADA))
            tard_rows = c.fetchall()

            # Motivos subidos por alumnos
            c.execute("""
                SELECT m.fecha, m.motivo
                FROM motivos_tardanza m
                JOIN alumnos a ON m.id_alumno = a.id_alumno
                WHERE a.id_curso = %s
                  AND m.fecha >= %s
                  AND m.motivo IS NOT NULL
                  AND m.motivo != ''
            """, (anio, inicio))
            motivos_rows = c.fetchall()

        # Agrupar tardanzas por mes (YYYY-MM)
        tard_por_mes = {}
        for r in tard_rows:
            mes = str(r['fecha'])[:7]
            tard_por_mes[mes] = tard_por_mes.get(mes, 0) + 1

        # Agrupar motivos por mes
        motivos_por_mes = {}
        for r in motivos_rows:
            mes = str(r['fecha'])[:7]
            motivos_por_mes.setdefault(mes, []).append(r['motivo'])

        todos_meses = sorted(
            set(tard_por_mes.keys()) | set(motivos_por_mes.keys()),
            reverse=True
        )

        resultado = []
        for mes in todos_meses:
            motivos = motivos_por_mes.get(mes, [])
            top3 = [m for m, _ in Counter(motivos).most_common(3)]
            resultado.append({
                "mes":        mes,
                "tardanzas":  tard_por_mes.get(mes, 0),
                "topMotivos": top3
            })

        return jsonify(resultado)
    except Exception as e:
        print(f"❌ /dir/tendencias: {e}")
        return jsonify({"error": str(e)}), 500
    finally:
        conn.close()


@app.route('/motivo-falta', methods=['POST'])
def guardar_motivo_falta():
    gmail  = request.form.get('gmail', '').strip()
    fecha  = request.form.get('fecha', '').strip()
    motivo = request.form.get('motivo', '').strip()
    if not gmail or not motivo or not fecha:
        return jsonify({"error": "Faltan datos"}), 400
    id_al = _id_alumno(gmail)
    if not id_al:
        return jsonify({"error": "Alumno no encontrado"}), 404
    cert = None
    if 'certificado' in request.files:
        f = request.files['certificado']
        if f and f.filename and _allowed(f.filename):
            safe = secure_filename(f.filename)
            cert = f"{gmail.replace('@','_')}_{fecha}_{safe}"
            f.save(os.path.join(CERTIFICADOS_DIR, cert))
    conn = get_connection()
    try:
        with conn.cursor() as c:
            c.execute(
                "INSERT INTO motivos_falta (id_alumno, fecha, motivo, certificado) VALUES (%s, %s, %s, %s)",
                (id_al, fecha, motivo, cert)
            )
        conn.commit()
        return jsonify({"ok": True, "certificado": cert})
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        conn.close()


@app.route('/dir/tendencias-faltas/<int:anio>', methods=['GET'])
def dir_tendencias_faltas(anio):
    """
    Devuelve las faltas (QR no registrado en un día hábil) agrupadas por
    mes para un curso, desde la tabla `faltas`.
    Incluye top 3 motivos de falta subidos por alumnos.
    """
    from collections import Counter
    inicio = date(date.today().year, 3, 1)
    ayer   = date.today() - timedelta(days=1)

    _generar_faltas(anio)

    conn = get_connection()
    try:
        with conn.cursor() as c:
            c.execute("""
                SELECT f.fecha
                FROM faltas f
                JOIN alumnos a ON f.id_alumno = a.id_alumno
                WHERE a.id_curso = %s AND f.fecha BETWEEN %s AND %s
            """, (anio, inicio, ayer))
            faltas_rows = c.fetchall()

            # Motivos de falta subidos por alumnos
            c.execute("""
                SELECT mf.fecha, mf.motivo
                FROM motivos_falta mf
                JOIN alumnos a ON mf.id_alumno = a.id_alumno
                WHERE a.id_curso = %s AND mf.fecha >= %s
                  AND mf.motivo IS NOT NULL AND mf.motivo != ''
            """, (anio, inicio))
            motivos_rows = c.fetchall()

        # Contar faltas por mes
        ausencias_por_mes = {}
        for r in faltas_rows:
            mes = str(r['fecha'])[:7]
            ausencias_por_mes[mes] = ausencias_por_mes.get(mes, 0) + 1

        # Agrupar motivos por mes
        motivos_por_mes = {}
        for r in motivos_rows:
            mes = str(r['fecha'])[:7]
            motivos_por_mes.setdefault(mes, []).append(r['motivo'])

        todos_meses = sorted(
            set(ausencias_por_mes.keys()) | set(motivos_por_mes.keys()),
            reverse=True
        )

        resultado = []
        for mes in todos_meses:
            motivos = motivos_por_mes.get(mes, [])
            top3 = [m for m, _ in Counter(motivos).most_common(3)]
            resultado.append({
                "mes":        mes,
                "ausencias":  ausencias_por_mes.get(mes, 0),
                "topMotivos": top3
            })

        return jsonify(resultado)
    except Exception as e:
        print(f"❌ /dir/tendencias-faltas: {e}")
        return jsonify({"error": str(e)}), 500
    finally:
        conn.close()


# ═══════════════════════════════════════════════════════════════
#  LOGIN Y ACCESO A PROFESORES (gmail + nombre completo + OTP)
# ═══════════════════════════════════════════════════════════════

@app.route('/profesores/solicitar-otp', methods=['POST'])
def solicitar_otp_profesor():
    data = request.get_json(force=True) or {}
    email  = (data.get('email') or '').strip().lower()
    nombre_ingresado = data.get('nombre') or ''

    if not email or not nombre_ingresado.strip():
        return jsonify({"error": "Completá tu correo y tu nombre."}), 400

    conn = get_connection()
    try:
        with conn.cursor() as c:
            c.execute("""
                SELECT nombre, apellido, gmail, materias, cursos
                FROM profesores
                WHERE gmail = %s AND es_preceptor = FALSE
            """, (email,))
            prof = c.fetchone()

        if not prof:
            return jsonify({"error": "Correo no registrado como profesor."}), 404

        nombre_bd = _normalizar(f"{prof['nombre']} {prof['apellido']}")
        nombre_bd_inv = _normalizar(f"{prof['apellido']} {prof['nombre']}")
        if _normalizar(nombre_ingresado) not in (nombre_bd, nombre_bd_inv):
            return jsonify({"error": "El nombre no coincide con el correo ingresado."}), 401

        codigo = str(random.randint(100000, 999999))
        otp_store_staff[email] = {"codigo": codigo, "expira": time.time() + 300}

        print("\n" + "=" * 40)
        print(f"🔑 CÓDIGO PROFESOR PARA {email}: {codigo}")
        print("=" * 40 + "\n")

        mail_ok = enviar_otp(email, codigo, prof['nombre'])

        respuesta = {"ok": True, "nombre": prof['nombre']}
        if not mail_ok:
            respuesta["codigo_dev"] = codigo  # solo aparece si el mail no llega
        return jsonify(respuesta)
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        conn.close()


@app.route('/profesores/verificar-otp', methods=['POST'])
def verificar_otp_profesor():
    data = request.get_json(force=True) or {}
    email  = (data.get('email') or '').strip().lower()
    codigo = (data.get('codigo') or '').strip()
    entrada = otp_store_staff.get(email)

    if not entrada or time.time() > entrada['expira'] or entrada['codigo'] != codigo:
        return jsonify({"error": "Código incorrecto o vencido."}), 400

    del otp_store_staff[email]  # se usa una sola vez

    conn = get_connection()
    try:
        with conn.cursor() as c:
            c.execute("""
                SELECT nombre, apellido, gmail, materias, cursos
                FROM profesores
                WHERE gmail = %s AND es_preceptor = FALSE
            """, (email,))
            return jsonify(c.fetchone())
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        conn.close()


# ═══════════════════════════════════════════════════════════════
#  LOGIN Y ACCESO A PRECEPTORÍA (gmail + nombre + apellido + DNI, sin OTP)
# ═══════════════════════════════════════════════════════════════

@app.route('/preceptoria/login', methods=['POST'])
def login_preceptoria():
    data = request.get_json(force=True) or {}
    email    = (data.get('email') or '').strip().lower()
    nombre   = data.get('nombre') or ''
    apellido = data.get('apellido') or ''
    dni      = data.get('dni') or ''

    if not email or not nombre.strip() or not apellido.strip() or not dni.strip():
        return jsonify({"error": "Completá correo, nombre, apellido y DNI."}), 400

    conn = get_connection()
    try:
        with conn.cursor() as c:
            c.execute("""
                SELECT nombre, apellido, gmail, dni
                FROM profesores
                WHERE gmail = %s AND es_preceptor = TRUE
            """, (email,))
            prece = c.fetchone()

        if not prece:
            return jsonify({"error": "Correo no registrado como preceptor/a."}), 404

        coincide_nombre   = _normalizar(nombre) == _normalizar(prece['nombre'])
        coincide_apellido = _normalizar(apellido) == _normalizar(prece['apellido'])
        coincide_dni      = _normalizar_dni(dni) == _normalizar_dni(prece['dni'] or '')

        if not (coincide_nombre and coincide_apellido and coincide_dni):
            return jsonify({"error": "Los datos no coinciden con los registrados."}), 401

        return jsonify({
            "ok": True,
            "nombre": prece['nombre'],
            "apellido": prece['apellido'],
            "gmail": prece['gmail']
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        conn.close()


@app.route('/profesores/perfil', methods=['GET'])
def perfil_profesor():
    """Datos actuales del profesor (materias y cursos) para refrescar la sesión al entrar."""
    gmail = (request.args.get('gmail') or '').strip().lower()
    if not gmail:
        return jsonify({"error": "Falta el correo"}), 400
    conn = get_connection()
    try:
        with conn.cursor() as c:
            c.execute("""
                SELECT nombre, apellido, gmail, materias, cursos
                FROM profesores
                WHERE LOWER(gmail) = %s AND es_preceptor = FALSE
            """, (gmail,))
            fila = c.fetchone()
        if not fila:
            return jsonify({"error": "Profesor no encontrado"}), 404
        return jsonify(fila)
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        conn.close()


# ══ NOTAS — PROFESORES ═══════════════════════════════════════

@app.route('/profesores/notas', methods=['POST'])
def crear_nota():
    """Carga una nota nueva para un alumno."""
    data = request.get_json(force=True) or {}
    id_alumno   = data.get('id_alumno')
    materia     = (data.get('materia') or '').strip()
    trimestre   = (data.get('trimestre') or '').strip()
    nota        = data.get('nota')
    observacion = (data.get('observacion') or '').strip() or None
    gmail_prof  = (data.get('gmail') or '').strip().lower()

    if not id_alumno or not materia or not trimestre or nota is None:
        return jsonify({"error": "Faltan datos obligatorios (alumno, materia, trimestre, nota)"}), 400
    try:
        nota = float(nota)
    except (TypeError, ValueError):
        return jsonify({"error": "La nota debe ser un número"}), 400
    if nota < 1 or nota > 10:
        return jsonify({"error": "La nota debe estar entre 1 y 10"}), 400

    conn = get_connection()
    try:
        with conn.cursor() as c:
            # Profesor que carga la nota (se identifica por su gmail de sesión)
            id_profesor = None
            if gmail_prof:
                c.execute("SELECT id_profesor FROM profesores WHERE LOWER(gmail) = %s", (gmail_prof,))
                fila = c.fetchone()
                if fila:
                    id_profesor = fila['id_profesor']
            c.execute("""
                INSERT INTO notas (id_alumno, materia, trimestre, nota, observacion, id_profesor)
                VALUES (%s, %s, %s, %s, %s, %s)
            """, (id_alumno, materia, trimestre, nota, observacion, id_profesor))
        conn.commit()
        return jsonify({"ok": True}), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        conn.close()


@app.route('/profesores/notas/<int:anio>', methods=['GET'])
def get_notas_curso(anio):
    """Lista todas las notas cargadas para los alumnos de un curso."""
    conn = get_connection()
    try:
        with conn.cursor() as c:
            c.execute("""
                SELECT n.id, n.id_alumno, p.nombre, p.apellido,
                       n.materia, n.trimestre, n.nota, n.observacion, n.creado_en,
                       n.recu_numero, n.recu_titulo, n.recu_nota, n.recu_creado_en,
                       n.r1_nota, n.r2_nota
                FROM notas n
                JOIN alumnos a  ON n.id_alumno = a.id_alumno
                JOIN personas p ON a.id_persona = p.id_persona
                WHERE a.id_curso = %s
                ORDER BY p.apellido, p.nombre, n.trimestre, n.materia
            """, (anio,))
            return jsonify(c.fetchall())
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        conn.close()


@app.route('/profesores/notas/<int:nota_id>/recuperatorio', methods=['PUT'])
def guardar_recuperatorio(nota_id):
    """Carga o edita la nota de un recuperatorio para una nota ya existente."""
    data = request.get_json(force=True) or {}
    numero = data.get('numero')
    titulo = (data.get('titulo') or '').strip()
    nota   = data.get('nota')

    if numero is None or not titulo or nota is None:
        return jsonify({"error": "Completá número de evaluación, título y nota"}), 400
    try:
        numero = int(numero)
    except (TypeError, ValueError):
        return jsonify({"error": "El número de evaluación debe ser un número"}), 400
    try:
        nota = float(nota)
    except (TypeError, ValueError):
        return jsonify({"error": "La nota debe ser un número"}), 400
    if nota < 1 or nota > 10:
        return jsonify({"error": "La nota debe estar entre 1 y 10"}), 400

    conn = get_connection()
    try:
        with conn.cursor() as c:
            c.execute("""
                UPDATE notas
                   SET recu_numero=%s, recu_titulo=%s, recu_nota=%s, recu_creado_en=NOW()
                 WHERE id=%s
            """, (numero, titulo, nota, nota_id))
            if c.rowcount == 0:
                return jsonify({"error": "No se encontró la nota"}), 404
        conn.commit()
        return jsonify({"ok": True})
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        conn.close()


@app.route('/profesores/notas/<int:nota_id>/recuperatorio', methods=['DELETE'])
def eliminar_recuperatorio(nota_id):
    """Quita el recuperatorio cargado sobre una nota (no borra la nota en sí)."""
    conn = get_connection()
    try:
        with conn.cursor() as c:
            c.execute("""
                UPDATE notas
                   SET recu_numero=NULL, recu_titulo=NULL, recu_nota=NULL, recu_creado_en=NULL
                 WHERE id=%s
            """, (nota_id,))
        conn.commit()
        return jsonify({"ok": True})
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        conn.close()


@app.route('/profesores/recuperatorio', methods=['POST'])
def cargar_recuperatorio():
    """Guarda una nota como R1 o R2 de la nota que el alumno ya tiene en esa
    materia y trimestre (la más reciente). Se usa desde la tarjeta 5 del panel."""
    data = request.get_json(force=True) or {}
    id_alumno = data.get('id_alumno')
    materia   = (data.get('materia') or '').strip()
    trimestre = (data.get('trimestre') or '').strip()
    numero    = data.get('numero')
    nota      = data.get('nota')

    if not id_alumno or not materia or not trimestre or numero is None or nota is None:
        return jsonify({"error": "Faltan datos obligatorios (alumno, materia, trimestre, recuperatorio, nota)"}), 400
    try:
        numero = int(numero)
    except (TypeError, ValueError):
        return jsonify({"error": "El recuperatorio debe ser 1 o 2"}), 400
    if numero not in (1, 2):
        return jsonify({"error": "El recuperatorio debe ser 1 o 2"}), 400
    try:
        nota = float(nota)
    except (TypeError, ValueError):
        return jsonify({"error": "La nota debe ser un número"}), 400
    if nota < 1 or nota > 10:
        return jsonify({"error": "La nota debe estar entre 1 y 10"}), 400

    columna = 'r1_nota' if numero == 1 else 'r2_nota'   # lista fija, no viene del cliente
    conn = get_connection()
    try:
        with conn.cursor() as c:
            c.execute("""
                SELECT id FROM notas
                 WHERE id_alumno=%s AND materia=%s AND trimestre=%s
                 ORDER BY id DESC LIMIT 1
            """, (id_alumno, materia, trimestre))
            fila = c.fetchone()
            if not fila:
                return jsonify({"error": "No tiene una nota cargada en esa materia y trimestre. Cargá primero la nota."}), 404
            c.execute(f"UPDATE notas SET {columna}=%s WHERE id=%s", (nota, fila['id']))
        conn.commit()
        return jsonify({"ok": True, "id": fila['id']})
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        conn.close()


@app.route('/profesores/notas/<int:nota_id>/recuperatorios', methods=['PUT'])
def guardar_recuperatorios(nota_id):
    """Guarda R1 y R2 de una nota a la vez (null = quitar). Se usa desde el botón Editar."""
    data = request.get_json(force=True) or {}
    valores = []
    for clave in ('r1', 'r2'):
        v = data.get(clave)
        if v is None or v == '':
            valores.append(None)
            continue
        try:
            v = float(v)
        except (TypeError, ValueError):
            return jsonify({"error": "Las notas deben ser números entre 1 y 10"}), 400
        if v < 1 or v > 10:
            return jsonify({"error": "Las notas deben ser números entre 1 y 10"}), 400
        valores.append(v)

    conn = get_connection()
    try:
        with conn.cursor() as c:
            c.execute("SELECT id FROM notas WHERE id=%s", (nota_id,))
            if not c.fetchone():
                return jsonify({"error": "No se encontró la nota"}), 404
            # También se limpia el recuperatorio del modal viejo, así no vuelve a migrarse.
            c.execute("""
                UPDATE notas
                   SET r1_nota=%s, r2_nota=%s,
                       recu_numero=NULL, recu_titulo=NULL, recu_nota=NULL, recu_creado_en=NULL
                 WHERE id=%s
            """, (valores[0], valores[1], nota_id))
        conn.commit()
        return jsonify({"ok": True})
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        conn.close()


@app.route('/profesores/notas/<int:nota_id>', methods=['PUT'])
def editar_nota(nota_id):
    """Edita una nota existente (materia, trimestre, nota, observación)."""
    data = request.get_json(force=True) or {}
    materia     = (data.get('materia') or '').strip()
    trimestre   = (data.get('trimestre') or '').strip()
    nota        = data.get('nota')
    observacion = (data.get('observacion') or '').strip() or None

    if not materia or not trimestre or nota is None:
        return jsonify({"error": "Faltan datos obligatorios (materia, trimestre, nota)"}), 400
    try:
        nota = float(nota)
    except (TypeError, ValueError):
        return jsonify({"error": "La nota debe ser un número"}), 400
    if nota < 1 or nota > 10:
        return jsonify({"error": "La nota debe estar entre 1 y 10"}), 400

    conn = get_connection()
    try:
        with conn.cursor() as c:
            c.execute("""
                UPDATE notas SET materia=%s, trimestre=%s, nota=%s, observacion=%s
                WHERE id=%s
            """, (materia, trimestre, nota, observacion, nota_id))
        conn.commit()
        return jsonify({"ok": True})
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        conn.close()


@app.route('/profesores/eliminar-nota/<int:nota_id>', methods=['DELETE'])
def eliminar_nota(nota_id):
    """Elimina una nota cargada."""
    conn = get_connection()
    try:
        with conn.cursor() as c:
            c.execute("DELETE FROM notas WHERE id=%s", (nota_id,))
        conn.commit()
        return jsonify({"ok": True})
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        conn.close()


# ══ DIRECTIVOS — MOTIVOS DE NOTAS BAJAS ══════════════════════

NOTA_BAJA_LIMITE = 7   # nota menor a esto = nota baja (pide motivos)

# (clave, texto exacto que guarda el panel de profesores)
MOTIVOS_NOTAS = [
    ('estudio',       'Falta de estudio / compromiso'),
    ('comprension',   'Dificultades en la comprensión'),
    ('inasistencias', 'Inasistencias'),
    ('personales',    'Problemas personales / familiares'),
    ('grupal',        'Trabajo grupal / cuaderno incompleto'),
    ('otros',         'Otros'),
]
_MOTIVO_POR_TEXTO = {texto: clave for clave, texto in MOTIVOS_NOTAS}
# La tabla y la evolución agrupan en 4 columnas (como en el diseño)
_GRUPO_DE_MOTIVO = {
    'estudio': 'estudio', 'comprension': 'comprension', 'inasistencias': 'inasistencias',
    'personales': 'otros', 'grupal': 'otros', 'otros': 'otros',
}
_GRUPOS = ['estudio', 'comprension', 'inasistencias', 'otros']


def _claves_de_observacion(obs):
    """'A | B | texto libre' -> {'estudio', 'otros'}. Lo que no está en la lista cuenta como 'otros'."""
    claves = set()
    for parte in (obs or '').split('|'):
        parte = parte.strip()
        if parte:
            claves.add(_MOTIVO_POR_TEXTO.get(parte, 'otros'))
    return claves


def _pct(parte, total):
    return round(parte * 100.0 / total, 1) if total else 0


def _norm_txt(s):
    """Minúsculas y sin tildes, para comparar nombres de materias."""
    import unicodedata
    s = unicodedata.normalize('NFD', (s or '').strip().lower())
    return ''.join(ch for ch in s if unicodedata.category(ch) != 'Mn')


_CURSO_TEXTO_A_NUM = {'1ro': 1, '2do': 2, '3ro': 3, '4to': 4, '5to': 5, '6to': 6}


def _materias_cursos_de(fila_prof):
    """('Matemáticas / Física', '4to - 5to') -> ({'matematicas','fisica'}, {4, 5})"""
    materias = {_norm_txt(m) for m in (fila_prof.get('materias') or '').split('/') if m.strip()}
    cursos = set()
    for c in (fila_prof.get('cursos') or '').split('-'):
        n = _CURSO_TEXTO_A_NUM.get(c.strip().lower())
        if n:
            cursos.add(n)
    return materias, cursos


def _notas_del_profesor(filas, id_profesor, c):
    """
    Deja solo las filas (notas) que cargó ese profesor.
    Si la nota guarda el profesor, se usa ese dato; las notas viejas (sin profesor guardado)
    se deducen por la materia y el curso que dicta.
    """
    c.execute("SELECT materias, cursos FROM profesores WHERE id_profesor = %s", (id_profesor,))
    prof = c.fetchone() or {}
    materias_prof, cursos_prof = _materias_cursos_de(prof)

    def _es_del_profesor(f):
        if f['id_profesor'] is not None:
            return f['id_profesor'] == id_profesor
        return (_norm_txt(f['materia']) in materias_prof
                and (not cursos_prof or f['id_curso'] in cursos_prof))

    return [f for f in filas if _es_del_profesor(f)]


@app.route('/dir/profesores/<int:id_profesor>/notas', methods=['GET'])
def dir_notas_de_profesor(id_profesor):
    """
    Notas que cargó un profesor, las más nuevas primero.
    ?desde=7 deja solo las notas de 7 o más (las "altas").
    """
    LIMITE = 300
    desde = request.args.get('desde', type=float)
    conn = get_connection()
    try:
        with conn.cursor() as c:
            c.execute("""
                SELECT n.id, n.id_profesor, a.id_curso, p.nombre, p.apellido,
                       n.materia, n.trimestre, n.nota, n.observacion,
                       n.r1_nota, n.r2_nota, n.creado_en
                FROM notas n
                JOIN alumnos a  ON n.id_alumno = a.id_alumno
                JOIN personas p ON a.id_persona = p.id_persona
                ORDER BY n.creado_en DESC, n.id DESC
            """)
            propias = _notas_del_profesor(c.fetchall(), id_profesor, c)
        if desde is not None:
            propias = [f for f in propias if float(f['nota']) >= desde]
        total = len(propias)
        resumen = {
            'total': total,
            'promedio': round(sum(float(f['nota']) for f in propias) / total, 2) if total else None,
            'alumnos': len({(f['apellido'], f['nombre'], f['id_curso']) for f in propias}),
            'materias': len({f['materia'] for f in propias}),
        }
        notas = [{
            'id': f['id'], 'curso': f['id_curso'],
            'alumno': f"{f['apellido']}, {f['nombre']}",
            'materia': f['materia'], 'trimestre': f['trimestre'],
            'nota': float(f['nota']),
            'r1': float(f['r1_nota']) if f['r1_nota'] is not None else None,
            'r2': float(f['r2_nota']) if f['r2_nota'] is not None else None,
            'observacion': f['observacion'],
            'fecha': f['creado_en'].strftime('%d/%m/%Y') if f['creado_en'] else '',
        } for f in propias[:LIMITE]]
        return jsonify({'total': total, 'limite': LIMITE, 'resumen': resumen, 'notas': notas})
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        conn.close()


@app.route('/dir/profesores-lista', methods=['GET'])
def dir_profesores_lista():
    """Profesores (sin preceptores) para el filtro del panel de directivos."""
    conn = get_connection()
    try:
        with conn.cursor() as c:
            c.execute("""
                SELECT id_profesor, nombre, apellido
                FROM profesores
                WHERE es_preceptor = FALSE
                ORDER BY apellido, nombre
            """)
            return jsonify(c.fetchall())
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        conn.close()


_CURSO_NUM_A_TEXTO = {1: '1ro', 2: '2do', 3: '3ro', 4: '4to', 5: '5to', 6: '6to'}


@app.route('/dir/profesores-detalle', methods=['GET'])
def dir_profesores_detalle():
    """Profesores y profesoras (sin preceptores) para las tarjetas del panel de directivos."""
    conn = get_connection()
    try:
        with conn.cursor() as c:
            c.execute("""
                SELECT id_profesor, nombre, apellido, gmail, materias, cursos, genero
                FROM profesores
                WHERE es_preceptor = FALSE
                ORDER BY apellido, nombre
            """)
            filas = c.fetchall()
        profesores = [f for f in filas if f['genero'] != 'F']
        profesoras = [f for f in filas if f['genero'] == 'F']
        return jsonify({'profesores': profesores, 'profesoras': profesoras})
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        conn.close()


@app.route('/dir/profesores/<int:id_profesor>', methods=['PUT'])
def dir_actualizar_profesor(id_profesor):
    """
    Actualiza materias y/o años (cursos) de un profesor. Body JSON, todo opcional:
      { "materias": "Matemáticas / Física", "cursos": [1, 2, 5], "genero": "M" | "F" }
    """
    data = request.get_json(silent=True) or {}
    sets, valores = [], []

    if 'materias' in data:
        partes = [m.strip() for m in str(data['materias'] or '').replace(',', '/').split('/')]
        materias = ' / '.join(m for m in partes if m)[:300]
        sets.append('materias = %s')
        valores.append(materias or None)

    if 'cursos' in data:
        try:
            nums = sorted({int(n) for n in (data['cursos'] or [])})
        except (TypeError, ValueError):
            return jsonify({"error": "Años inválidos"}), 400
        if any(n not in _CURSO_NUM_A_TEXTO for n in nums):
            return jsonify({"error": "Los años van de 1 a 6"}), 400
        sets.append('cursos = %s')
        valores.append(' - '.join(_CURSO_NUM_A_TEXTO[n] for n in nums) or None)

    if 'genero' in data:
        if data['genero'] not in ('M', 'F'):
            return jsonify({"error": "Género inválido"}), 400
        sets.append('genero = %s')
        valores.append(data['genero'])

    if not sets:
        return jsonify({"error": "No hay nada para actualizar"}), 400

    conn = get_connection()
    try:
        with conn.cursor() as c:
            c.execute("SELECT id_profesor FROM profesores WHERE id_profesor = %s AND es_preceptor = FALSE",
                      (id_profesor,))
            if not c.fetchone():
                return jsonify({"error": "Profesor no encontrado"}), 404
            c.execute(f"UPDATE profesores SET {', '.join(sets)} WHERE id_profesor = %s",
                      (*valores, id_profesor))
        conn.commit()
        return jsonify({"ok": True})
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        conn.close()


@app.route('/dir/profesores/<int:id_profesor>', methods=['DELETE'])
def dir_eliminar_profesor(id_profesor):
    """
    Quita un profesor. Las notas que ya cargó quedan en el sistema (conservan su id_profesor),
    pero ya no puede ingresar al panel de Profesores.
    """
    conn = get_connection()
    try:
        with conn.cursor() as c:
            c.execute("DELETE FROM profesores WHERE id_profesor = %s AND es_preceptor = FALSE",
                      (id_profesor,))
            if c.rowcount == 0:
                return jsonify({"error": "Profesor no encontrado"}), 404
        conn.commit()
        return jsonify({"ok": True})
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        conn.close()


# ══════════════════════════════════════════════════════════════
#  DIRECTIVOS: gestión de estudiantes (altas, bajas, ingresantes, 6° año)
# ══════════════════════════════════════════════════════════════
import re as _re

# Tablas que guardan datos de un alumno (se limpian antes de borrarlo)
_TABLAS_CON_ALUMNO = ['peticiones_documentacion', 'motivos_falta', 'motivos_tardanza', 'fotos_clase', 'avisos_tardanza',
                      'anuncios_alumno', 'anuncios', 'ingresos', 'documentos', 'faltas',
                      'notas']


def _borrar_alumnos(c, ids):
    """Borra alumnos (y todo su historial) dentro de la transacción del cursor `c`."""
    ids = list(ids)
    if not ids:
        return 0
    ph = ','.join(['%s'] * len(ids))
    c.execute(f"SELECT DISTINCT id_persona FROM alumnos WHERE id_alumno IN ({ph})", ids)
    personas = [r['id_persona'] for r in c.fetchall()]
    for tabla in _TABLAS_CON_ALUMNO:
        try:
            c.execute(f"DELETE FROM {tabla} WHERE id_alumno IN ({ph})", ids)
        except pymysql.MySQLError as e:
            if e.args[0] not in (1146, 1054):   # tabla o columna inexistente: se ignora
                raise
    c.execute(f"DELETE FROM alumnos WHERE id_alumno IN ({ph})", ids)
    borrados = c.rowcount
    if personas:
        pph = ','.join(['%s'] * len(personas))
        c.execute(f"""DELETE FROM personas WHERE id_persona IN ({pph})
                      AND id_persona NOT IN (SELECT id_persona FROM alumnos)""", personas)
    return borrados


def _validar_estudiante(d):
    """Devuelve (datos_limpios, None) o (None, motivo_del_error)."""
    nombre   = ' '.join(str(d.get('nombre') or '').split())
    apellido = ' '.join(str(d.get('apellido') or '').split())
    dni      = _normalizar_dni(str(d.get('dni') or ''))
    gmail    = str(d.get('gmail') or '').strip().lower()
    if not nombre or not apellido:
        return None, 'falta nombre o apellido'
    if len(nombre) > 100 or len(apellido) > 100:
        return None, 'nombre o apellido demasiado largo'
    if not (6 <= len(dni) <= 9):
        return None, 'DNI inválido'
    if not _re.fullmatch(r'[^@\s]+@[^@\s]+\.[^@\s]+', gmail) or len(gmail) > 150:
        return None, 'gmail inválido'
    return {'nombre': nombre, 'apellido': apellido, 'dni': int(dni), 'gmail': gmail}, None


def _insertar_estudiante(c, datos, curso):
    c.execute("SELECT id_persona FROM personas WHERE LOWER(gmail) = %s LIMIT 1", (datos['gmail'],))
    if c.fetchone():
        return 'ese gmail ya está registrado'
    c.execute("INSERT INTO personas (nombre, apellido, DNI, gmail) VALUES (%s, %s, %s, %s)",
              (datos['nombre'], datos['apellido'], datos['dni'], datos['gmail']))
    c.execute("INSERT INTO alumnos (id_persona, id_curso) VALUES (%s, %s)", (c.lastrowid, curso))
    return None


@app.route('/dir/estudiantes-resumen', methods=['GET'])
def dir_estudiantes_resumen():
    """Cantidad de estudiantes por año y total."""
    conn = get_connection()
    try:
        with conn.cursor() as c:
            c.execute("SELECT id_curso, COUNT(*) AS n FROM alumnos GROUP BY id_curso")
            por_curso = {str(f['id_curso']): f['n'] for f in c.fetchall()}
        return jsonify({'total': sum(por_curso.values()), 'por_curso': por_curso})
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        conn.close()


@app.route('/dir/estudiantes/curso/<int:anio>', methods=['GET'])
def dir_estudiantes_curso(anio):
    """Estudiantes de un año, para la lista de bajas."""
    conn = get_connection()
    try:
        with conn.cursor() as c:
            c.execute("""
                SELECT a.id_alumno, p.nombre, p.apellido, p.gmail
                FROM alumnos a JOIN personas p ON a.id_persona = p.id_persona
                WHERE a.id_curso = %s ORDER BY p.apellido, p.nombre
            """, (anio,))
            return jsonify(c.fetchall())
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        conn.close()


@app.route('/dir/estudiantes', methods=['POST'])
def dir_agregar_estudiante():
    """Agrega un estudiante. Body: { nombre, apellido, dni, gmail, curso (1-6) }"""
    data = request.get_json(silent=True) or {}
    try:
        curso = int(data.get('curso'))
    except (TypeError, ValueError):
        return jsonify({"error": "Elegí el año"}), 400
    if curso not in range(1, 7):
        return jsonify({"error": "Los años van de 1 a 6"}), 400
    datos, error = _validar_estudiante(data)
    if error:
        return jsonify({"error": error[0].upper() + error[1:]}), 400

    conn = get_connection()
    try:
        with conn.cursor() as c:
            error = _insertar_estudiante(c, datos, curso)
            if error:
                conn.rollback()
                return jsonify({"error": error[0].upper() + error[1:]}), 400
        conn.commit()
        return jsonify({"ok": True})
    except Exception as e:
        conn.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        conn.close()


@app.route('/dir/estudiantes/ingresantes', methods=['POST'])
def dir_agregar_ingresantes():
    """
    Agrega varios ingresantes a 1° año. Body: { "estudiantes": [ {nombre, apellido, dni, gmail}, ... ] }
    Agrega los válidos y devuelve en `omitidos` los que no (con su número de línea y el motivo).
    """
    data = request.get_json(silent=True) or {}
    lista = data.get('estudiantes')
    if not isinstance(lista, list) or not lista:
        return jsonify({"error": "No hay estudiantes para agregar"}), 400
    if len(lista) > 500:
        return jsonify({"error": "Son demasiados de una vez (máximo 500)"}), 400

    conn = get_connection()
    agregados, omitidos, vistos = 0, [], set()
    try:
        with conn.cursor() as c:
            for i, d in enumerate(lista, start=1):
                datos, error = _validar_estudiante(d if isinstance(d, dict) else {})
                if not error and datos['gmail'] in vistos:
                    error = 'gmail repetido en la lista'
                if not error:
                    error = _insertar_estudiante(c, datos, 1)
                if error:
                    omitidos.append({'linea': i, 'motivo': error})
                else:
                    vistos.add(datos['gmail'])
                    agregados += 1
        conn.commit()
        return jsonify({"ok": True, "agregados": agregados, "omitidos": omitidos})
    except Exception as e:
        conn.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        conn.close()


@app.route('/dir/estudiantes/<int:id_alumno>', methods=['DELETE'])
def dir_baja_estudiante(id_alumno):
    """Da de baja a un estudiante que ya no está en la institución (borra también su historial)."""
    conn = get_connection()
    try:
        with conn.cursor() as c:
            if _borrar_alumnos(c, [id_alumno]) == 0:
                conn.rollback()
                return jsonify({"error": "Estudiante no encontrado"}), 404
        conn.commit()
        return jsonify({"ok": True})
    except Exception as e:
        conn.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        conn.close()


@app.route('/dir/estudiantes/<int:id_alumno>/anio', methods=['PUT'])
def dir_cambiar_anio_estudiante(id_alumno):
    """Cambia de año a un estudiante (por ejemplo, si repite). Body: { curso (1-6) }"""
    data = request.get_json(silent=True) or {}
    try:
        curso = int(data.get('curso'))
    except (TypeError, ValueError):
        return jsonify({"error": "Elegí el año"}), 400
    if curso not in range(1, 7):
        return jsonify({"error": "Los años van de 1 a 6"}), 400

    conn = get_connection()
    try:
        with conn.cursor() as c:
            c.execute("SELECT id_curso FROM alumnos WHERE id_alumno = %s", (id_alumno,))
            fila = c.fetchone()
            if not fila:
                return jsonify({"error": "Estudiante no encontrado"}), 404
            anterior = fila['id_curso']
            if anterior == curso:
                return jsonify({"error": f"El estudiante ya está en {curso}° año"}), 400
            c.execute("UPDATE alumnos SET id_curso = %s WHERE id_alumno = %s", (curso, id_alumno))
        conn.commit()
        return jsonify({"ok": True, "anio_anterior": anterior, "anio_nuevo": curso})
    except Exception as e:
        conn.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        conn.close()


@app.route('/dir/estudiantes/anio/<int:anio>', methods=['DELETE'])
def dir_eliminar_anio(anio):
    """Elimina por completo a un año. Por seguridad solo se permite 6° (los que egresan)."""
    if anio != 6:
        return jsonify({"error": "Solo se puede eliminar por completo a 6° año"}), 400
    conn = get_connection()
    try:
        with conn.cursor() as c:
            c.execute("SELECT id_alumno FROM alumnos WHERE id_curso = %s", (anio,))
            ids = [f['id_alumno'] for f in c.fetchall()]
            borrados = _borrar_alumnos(c, ids)
        conn.commit()
        return jsonify({"ok": True, "eliminados": borrados})
    except Exception as e:
        conn.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        conn.close()


@app.route('/dir/motivos-notas', methods=['GET'])
def dir_motivos_notas():
    """
    Resumen de los motivos de notas bajas (nota < 7).
    Filtro opcional: ?profesor=<id_profesor>
    """
    from collections import Counter, defaultdict
    import re

    profesor = request.args.get('profesor', type=int)

    conn = get_connection()
    try:
        with conn.cursor() as c:
            c.execute("""
                SELECT n.materia, n.trimestre, n.observacion, n.id_profesor,
                       a.id_curso, YEAR(n.creado_en) AS anio
                FROM notas n
                JOIN alumnos a ON n.id_alumno = a.id_alumno
                WHERE n.nota < %s
            """, (NOTA_BAJA_LIMITE,))
            filas = c.fetchall()

            if profesor:
                filas = _notas_del_profesor(filas, profesor, c)
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        conn.close()

    sin_motivo = 0
    notas_con_motivo = 0
    cont_motivos = Counter()                       # menciones por motivo (6)
    por_materia = defaultdict(lambda: {'notas': 0, **{g: 0 for g in _GRUPOS}})
    por_periodo = defaultdict(lambda: {'notas': 0, **{g: 0 for g in _GRUPOS}})
    insasist_por_curso = Counter()

    for f in filas:
        claves = _claves_de_observacion(f['observacion'])
        if not claves:
            sin_motivo += 1
            continue
        notas_con_motivo += 1
        grupos = {_GRUPO_DE_MOTIVO[k] for k in claves}

        for k in claves:
            cont_motivos[k] += 1
        if 'inasistencias' in claves:
            insasist_por_curso[f['id_curso']] += 1

        m = por_materia[f['materia']]
        m['notas'] += 1
        for g in grupos:
            m[g] += 1

        d = re.search(r'\d', f['trimestre'] or '')
        tri = int(d.group()) if d else 0
        anio = f['anio'] or 0
        p = por_periodo[(anio, tri)]
        p['notas'] += 1
        for g in grupos:
            p[g] += 1

    total_menciones = sum(cont_motivos.values())

    # El año lectivo actual siempre muestra sus 4 trimestres (aunque no tengan notas todavía)
    from datetime import date
    for t in (1, 2, 3, 4):
        por_periodo[(date.today().year, t)]  # defaultdict: crea el período vacío si falta

    motivos = [{
        'clave': clave, 'nombre': texto,
        'cantidad': cont_motivos.get(clave, 0),
        'porcentaje': _pct(cont_motivos.get(clave, 0), total_menciones),
    } for clave, texto in MOTIVOS_NOTAS]

    def _fila_grupos(d):
        tot = sum(d[g] for g in _GRUPOS)
        return {g: _pct(d[g], tot) for g in _GRUPOS}

    materias = sorted(por_materia.items(), key=lambda kv: -kv[1]['notas'])
    tabla_materias = [{'materia': nom, 'notas': d['notas'], **_fila_grupos(d)} for nom, d in materias]

    evolucion = []
    for (anio, tri), d in sorted(por_periodo.items()):
        etiqueta = f"{tri}° Trim." if tri else "Sin trimestre"
        if anio:
            etiqueta += f" {anio}"
        evolucion.append({'periodo': etiqueta, 'notas': d['notas'], **_fila_grupos(d)})

    # ── Observaciones automáticas ──
    observaciones = []
    if notas_con_motivo:
        top = max(motivos, key=lambda x: x['cantidad'])
        nombre_top = top['nombre'].lower()
        observaciones.append(
            f"El motivo más frecuente de notas bajas es {nombre_top}, "
            f"representando el {round(top['porcentaje'])}% del total."
        )
        if materias:
            top2 = materias[:2]
            suma = sum(d['notas'] for _, d in top2)
            nombres = ' y '.join(n for n, _ in top2)
            verbo = 'concentran' if len(top2) > 1 else 'concentra'
            observaciones.append(f"{nombres} {verbo} el {round(_pct(suma, notas_con_motivo))}% de las notas bajas.")
        n_inas = cont_motivos.get('inasistencias', 0)
        if n_inas:
            cursos = [f"{cur}°" for cur, _ in sorted(insasist_por_curso.items(), key=lambda kv: (-kv[1], kv[0]))[:2]]
            donde = ' y '.join(cursos)
            observaciones.append(
                f"El {round(_pct(n_inas, notas_con_motivo))}% de las notas bajas se relaciona con "
                f"inasistencias, principalmente en {donde} año."
            )
        else:
            observaciones.append("Ninguna nota baja se relaciona con inasistencias.")

    return jsonify({
        'total_notas_bajas': notas_con_motivo,
        'sin_motivo': sin_motivo,
        'total_menciones': total_menciones,
        'motivos': motivos,
        'por_materia': tabla_materias,
        'evolucion': evolucion,
        'observaciones': observaciones,
    })


# ══ DIRECTIVOS — ESTADÍSTICAS ACADÉMICAS ═════════════════════
# Solo lectura: agrega las notas ya cargadas por los profesores (tabla `notas`).
# Regla de nota vigente: la misma que usa /mis-notas (panel del alumno):
#   · por alumno + año lectivo + materia + trimestre se toma el último valor cargado
#     de `nota`, `r1_nota` y `r2_nota`;
#   · cuenta la mejor de las tres;
#   · aprobada = cuenta >= NOTA_BAJA_LIMITE (7).
# Categorías reales del sistema:
#   · aprobada     → la nota original ya es >= 7
#   · recuperada   → la nota original es < 7 pero R1/R2 llegó a 7 o más
#   · desaprobada  → ni la nota ni los recuperatorios llegan a 7

@app.route('/dir/estadisticas-academicas', methods=['GET'])
def dir_estadisticas_academicas():
    """
    Filtros opcionales (querystring):
      anio_lectivo  → año de carga de la nota (sin parámetro = el más reciente con datos; 0 = todos)
      curso         → 1 a 6
      materia       → nombre exacto de la materia
      trimestre     → 1 a 4
    """
    import re
    from collections import defaultdict

    f_anio    = request.args.get('anio_lectivo', type=int)
    f_curso   = request.args.get('curso', type=int)
    f_materia = (request.args.get('materia') or '').strip()
    f_trim    = request.args.get('trimestre', type=int)

    conn = get_connection()
    try:
        with conn.cursor() as c:
            c.execute("SELECT id_curso, COUNT(*) AS n FROM alumnos GROUP BY id_curso")
            alumnos_por_curso = {int(f['id_curso']): int(f['n']) for f in c.fetchall()}
            c.execute("""
                SELECT n.id, n.id_alumno, a.id_curso, n.materia, n.trimestre,
                       n.nota, n.r1_nota, n.r2_nota, YEAR(n.creado_en) AS anio
                FROM notas n
                JOIN alumnos a ON n.id_alumno = a.id_alumno
                ORDER BY n.id
            """)
            filas = c.fetchall()
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        conn.close()

    def _f(v):
        return None if v is None else float(v)

    # ── Una nota vigente por alumno + año + materia + trimestre ──
    grupos = {}
    for f in filas:
        d = re.search(r'\d', f['trimestre'] or '')
        tri = int(d.group()) if d else 0
        anio = int(f['anio'] or 0)
        materia = (f['materia'] or '').strip()
        clave = (f['id_alumno'], anio, _norm_txt(materia), tri)
        g = grupos.setdefault(clave, {
            'alumno': f['id_alumno'], 'curso': int(f['id_curso']), 'anio': anio,
            'materia': materia, 'tri': tri, 'nota': None, 'r1': None, 'r2': None,
        })
        g['materia'] = materia or g['materia']
        for col, campo in (('nota', 'nota'), ('r1', 'r1_nota'), ('r2', 'r2_nota')):
            v = _f(f[campo])
            if v is not None:
                g[col] = v

    vigentes = []
    for g in grupos.values():
        valores = [v for v in (g['nota'], g['r1'], g['r2']) if v is not None]
        if not valores:
            continue
        cuenta = max(valores)
        if cuenta >= NOTA_BAJA_LIMITE:
            g['estado'] = 'aprobada' if (g['nota'] is not None and g['nota'] >= NOTA_BAJA_LIMITE) else 'recuperada'
        else:
            g['estado'] = 'desaprobada'
        g['cuenta'] = cuenta
        vigentes.append(g)

    # ── Opciones de los filtros (salen de los datos reales) ──
    anios    = sorted({g['anio'] for g in vigentes if g['anio']}, reverse=True)
    materias = {}
    for g in vigentes:
        materias.setdefault(_norm_txt(g['materia']), g['materia'])

    if f_anio is None:                      # sin parámetro: año actual si tiene datos, si no el más reciente
        hoy = date.today().year
        f_anio = hoy if hoy in anios else (anios[0] if anios else 0)

    # El filtro "Materia" solo ofrece materias con notas cargadas en el año y curso elegidos
    claves_mat = {_norm_txt(g['materia']) for g in vigentes
                  if (not f_anio or g['anio'] == f_anio) and (not f_curso or g['curso'] == f_curso)}
    lista_materias = sorted((materias[k] for k in claves_mat), key=_norm_txt)

    def _ok_anio(g):    return not f_anio or g['anio'] == f_anio
    def _ok_curso(g):   return not f_curso or g['curso'] == f_curso
    def _ok_materia(g): return not f_materia or _norm_txt(g['materia']) == _norm_txt(f_materia)
    def _ok_trim(g):    return not f_trim or g['tri'] == f_trim

    def _resumen(lista):
        n = len(lista)
        ap = sum(1 for g in lista if g['estado'] == 'aprobada')
        rc = sum(1 for g in lista if g['estado'] == 'recuperada')
        ds = sum(1 for g in lista if g['estado'] == 'desaprobada')
        return {
            'total': n, 'aprobadas': ap, 'recuperadas': rc, 'desaprobadas': ds,
            'pct_directas':     _pct(ap, n)      if n else None,
            'pct_recuperadas':  _pct(rc, n)      if n else None,
            'pct_aprobadas':    _pct(ap + rc, n) if n else None,
            'pct_desaprobadas': _pct(ds, n)      if n else None,
            'promedio': round(sum(g['cuenta'] for g in lista) / n, 2) if n else None,
        }

    # Conjunto principal (KPIs y dona): todos los filtros
    principal = [g for g in vigentes if _ok_anio(g) and _ok_curso(g) and _ok_materia(g) and _ok_trim(g)]
    res = _resumen(principal)

    cursos_alumnos = [f_curso] if f_curso else sorted(alumnos_por_curso)
    alumnos_registrados = sum(alumnos_por_curso.get(cu, 0) for cu in cursos_alumnos)
    alumnos_con_notas = len({g['alumno'] for g in principal})

    # Evolución por trimestre: ignora el filtro de período (si no, sería un solo punto)
    base_evol = [g for g in vigentes if _ok_anio(g) and _ok_curso(g) and _ok_materia(g)]
    evolucion = []
    for t in (1, 2, 3, 4):
        r = _resumen([g for g in base_evol if g['tri'] == t])
        evolucion.append({'trimestre': t, 'etiqueta': f'{t}° Trim.', **r})

    # Rendimiento por materia: ignora el filtro de materia (si no, sería una sola barra)
    por_mat = defaultdict(list)
    for g in vigentes:
        if _ok_anio(g) and _ok_curso(g) and _ok_trim(g):
            por_mat[_norm_txt(g['materia'])].append(g)
    por_materia = []
    for k, lista in por_mat.items():
        r = _resumen(lista)
        por_materia.append({'materia': materias.get(k, k), **r})
    por_materia.sort(key=lambda m: (-(m['promedio'] or 0), _norm_txt(m['materia'])))

    # Comparación entre cursos: ignora el filtro de curso (compara 1° a 6°)
    por_curso = []
    for cu in range(1, 7):
        r = _resumen([g for g in vigentes if g['curso'] == cu and _ok_anio(g) and _ok_materia(g) and _ok_trim(g)])
        por_curso.append({'curso': cu, 'etiqueta': f'{cu}° año', **r})

    return jsonify({
        'filtros': {'anios': anios, 'materias': lista_materias},
        'aplicados': {'anio_lectivo': f_anio, 'curso': f_curso or 0, 'materia': f_materia, 'trimestre': f_trim or 0},
        'kpis': {
            'alumnos_registrados': alumnos_registrados,
            'alumnos_con_notas': alumnos_con_notas,
            'notas_cargadas': res['total'],
            'pct_aprobadas': res['pct_aprobadas'],
            'pct_desaprobadas': res['pct_desaprobadas'],
        },
        'distribucion': {
            'total': res['total'], 'aprobadas': res['aprobadas'],
            'recuperadas': res['recuperadas'], 'desaprobadas': res['desaprobadas'],
        },
        'evolucion': evolucion,
        'por_materia': por_materia,
        'por_curso': por_curso,
    })


# ══ DIRECTIVOS — DESCARGAR LIBRETAS (PDF) ═════════════════════
# Arma la libreta de un estudiante con las notas que cargaron los profesores
# (tabla `notas`), sus faltas y llegadas tarde, y la devuelve como PDF con el
# formato de la libreta oficial (ver libreta_pdf.py).
#   · Eval N = trimestre N (columnas N / R1 / R2 de la libreta = nota / r1_nota / r2_nota)
#   · Aprendizaje pendiente = materia+trimestre cuya mejor nota (N, R1, R2) sigue por debajo de 7
#   · Inasistencias: justificadas = falta con motivo cargado para esa fecha (igual que el panel del alumno)

def _datos_libreta(id_alumno):
    import re

    conn = get_connection()
    try:
        with conn.cursor() as c:
            c.execute("""
                SELECT a.id_alumno, a.id_curso, p.nombre, p.apellido, p.DNI AS dni
                FROM alumnos a JOIN personas p ON a.id_persona = p.id_persona
                WHERE a.id_alumno = %s
            """, (id_alumno,))
            al = c.fetchone()
            if not al:
                return None
            c.execute("""
                SELECT id, materia, trimestre, nota, r1_nota, r2_nota, observacion,
                       recu_numero, recu_nota, YEAR(creado_en) AS anio
                FROM notas WHERE id_alumno = %s ORDER BY id
            """, (id_alumno,))
            filas = c.fetchall()
    finally:
        conn.close()

    # Año lectivo: el actual; si el alumno no tiene notas de este año, el último con notas
    anio = date.today().year
    anios = {int(f['anio']) for f in filas if f['anio']}
    if anios and anio not in anios:
        anio = max(anios)
    filas = [f for f in filas if not f['anio'] or int(f['anio']) == anio]

    def _f(v):
        return None if v is None else float(v)

    # Una nota vigente por materia + trimestre (último valor cargado de N, R1 y R2)
    orden_materias, grupos = [], {}
    for f in filas:
        d = re.search(r'\d', f['trimestre'] or '')
        tri = int(d.group()) if d else 0
        materia = (f['materia'] or '').strip()
        if not materia or not 1 <= tri <= 8:
            continue
        clave_m = _norm_txt(materia)
        if clave_m not in orden_materias:
            orden_materias.append(clave_m)
        g = grupos.setdefault((clave_m, tri), {'materia': materia, 'n': None, 'r1': None, 'r2': None, 'desc': None})
        # Recuperatorio viejo (recu_numero/recu_nota) si todavía no se pasó a r1_nota/r2_nota
        r1v, r2v = f['r1_nota'], f['r2_nota']
        if f.get('recu_nota') is not None:
            if f.get('recu_numero') == 1 and r1v is None: r1v = f['recu_nota']
            if f.get('recu_numero') == 2 and r2v is None: r2v = f['recu_nota']
        for col, v in (('n', f['nota']), ('r1', r1v), ('r2', r2v)):
            v = _f(v)
            if v is not None:
                g[col] = v
        # Descripción del pendiente: texto libre de la observación (sin los motivos predefinidos)
        libres = [p.strip() for p in (f['observacion'] or '').split('|')
                  if p.strip() and p.strip() not in _MOTIVO_POR_TEXTO]
        if libres:
            g['desc'] = ' - '.join(libres)

    materias, pendientes = [], []
    for clave_m in orden_materias:
        evals, nombre = {}, None
        for (cm, tri), g in sorted(grupos.items(), key=lambda kv: kv[0][1]):
            if cm != clave_m:
                continue
            nombre = g['materia']
            evals[tri] = {'n': g['n'], 'r1': g['r1'], 'r2': g['r2']}
            valores = [v for v in (g['n'], g['r1'], g['r2']) if v is not None]
            if valores and max(valores) < NOTA_BAJA_LIMITE:
                pendientes.append({'materia': g['materia'], 'eval': tri, 'descripcion': g['desc'] or ''})
        if nombre:
            materias.append({'nombre': nombre, 'evals': evals})

    # Inasistencias y llegadas tarde (mismas reglas que /mis-faltas y /mis-tardanzas)
    curso = int(al['id_curso'])
    try:
        _generar_faltas(curso)
    except Exception as e:
        print(f"⚠️ libreta: no se pudieron actualizar las faltas: {e}")
    inicio = date(anio, 3, 1)
    conn = get_connection()
    try:
        with conn.cursor() as c:
            c.execute("SELECT fecha FROM faltas WHERE id_alumno = %s AND fecha >= %s AND YEAR(fecha) = %s",
                      (id_alumno, inicio, anio))
            faltas = {r['fecha'] for r in c.fetchall()}
            c.execute("SELECT fecha FROM motivos_falta WHERE id_alumno = %s", (id_alumno,))
            justificadas = {r['fecha'] for r in c.fetchall()}
            c.execute("""SELECT COUNT(*) AS total FROM (
                              SELECT fecha, MIN(hora) AS hora FROM ingresos
                              WHERE id_alumno = %s AND fecha >= %s AND YEAR(fecha) = %s
                              GROUP BY fecha
                          ) t WHERE t.hora > %s""",
                      (id_alumno, inicio, anio, HORA_ENTRADA))
            tardes = c.fetchone()['total']
    finally:
        conn.close()

    return {
        'nombre': al['nombre'], 'apellido': al['apellido'],
        'dni': str(al['dni'] or ''), 'curso': curso, 'division': 'A', 'turno': 'MAÑANA Y TARDE',
        'anio_lectivo': anio,
        'materias': materias, 'pendientes': pendientes,
        'justif': len(faltas & justificadas), 'injustif': len(faltas - justificadas),
        'tarde_cuarto': int(tardes or 0), 'tarde_medio': 0, 'retiro': 0,
        'estado': 'REGULAR', 'observaciones': None, 'ec_previos': None,
    }


@app.route('/dir/libreta/<int:id_alumno>/pdf', methods=['GET'])
def dir_libreta_pdf(id_alumno):
    """Descarga la libreta del estudiante en PDF."""
    try:
        from libreta_pdf import generar_libreta_pdf
        datos = _datos_libreta(id_alumno)
        if not datos:
            return jsonify({"error": "Estudiante no encontrado"}), 404
        pdf = generar_libreta_pdf(datos)
        nombre = _normalizar(f"{datos['apellido']} {datos['nombre']}").replace(' ', '_')
        resp = make_response(pdf)
        resp.headers['Content-Type'] = 'application/pdf'
        resp.headers['Content-Disposition'] = f'attachment; filename=Libreta_{nombre}_{datos["anio_lectivo"]}.pdf'
        return resp
    except ImportError:
        return jsonify({"error": "Falta instalar reportlab (pip install reportlab)"}), 500
    except Exception as e:
        print(f"❌ /dir/libreta: {e}")
        return jsonify({"error": str(e)}), 500


if __name__ == '__main__':
    _init_tablas()
    print('📁 Uploads:', UPLOAD_BASE)
    app.run(debug=True, port=5000)
