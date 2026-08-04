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

app = Flask(__name__)
CORS(app)

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
                SELECT i.id_alumno, i.hora
                FROM ingresos i
                JOIN alumnos a ON i.id_alumno = a.id_alumno
                WHERE a.id_curso = %s AND i.fecha = %s
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

        HORA_ENTRADA = '07:40'

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
                hora_str = str(hora_raw)[:5]          # HH:MM
                hora_cmp = hora_str.replace(':', '')   # HHMM para comparar
                if hora_cmp <= HORA_ENTRADA.replace(':', ''):
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
    """Genera (si hace falta) y devuelve la cantidad de faltas por alumno de un curso."""
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

            c.execute("""
                SELECT f.id_alumno, COUNT(*) AS total
                FROM faltas f
                JOIN alumnos a ON f.id_alumno = a.id_alumno
                WHERE a.id_curso = %s AND f.fecha BETWEEN %s AND %s
                GROUP BY f.id_alumno
            """, (anio, inicio, ayer))
            faltas_map = {r['id_alumno']: r['total'] for r in c.fetchall()}

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

        return [{
            "id_alumno":    al['id_alumno'],
            "nombre":       al['nombre'],
            "apellido":     al['apellido'],
            "gmail":        al['gmail'],
            "ausencias":    faltas_map.get(al['id_alumno'], 0),
            "dias_habiles": dias_habiles
        } for al in alumnos]
    finally:
        conn.close()

def _init_tablas():
    conn = get_connection()
    try:
        with conn.cursor() as c:
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
            sql = """SELECT p.nombre,p.apellido,p.gmail,m.fecha,m.motivo,m.certificado
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
            agrup[k]['motivos'].append({'fecha':str(f['fecha']),'motivo':f['motivo'],'certificado':f['certificado']})
        return jsonify(list(agrup.values()))
    except Exception as e:
        return jsonify({"error":str(e)}), 500
    finally: conn.close()

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
    HORA_ENTRADA = '07:40'
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
            c.execute("""SELECT COUNT(*) AS total FROM ingresos
                          WHERE id_alumno = %s AND fecha >= %s AND hora > %s""",
                      (al['id_alumno'], inicio, HORA_ENTRADA))
            total = c.fetchone()['total']

        return jsonify({"total": total})
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        conn.close()

@app.route('/prece/evidencias', methods=['GET'])
def get_evidencias():
    anio = request.args.get('anio', type=int)
    conn = get_connection()
    try:
        with conn.cursor() as c:
            sql = """SELECT fc.id, p.nombre,p.apellido,p.gmail,fc.fecha,fc.descripcion,fc.archivo
                       FROM fotos_clase fc
                       JOIN alumnos a ON fc.id_alumno=a.id_alumno
                       JOIN personas p ON a.id_persona=p.id_persona"""
            params = []
            if anio:
                sql += " WHERE a.id_curso=%s"; params.append(anio)
            sql += " ORDER BY fc.fecha DESC"
            c.execute(sql, params)
            rows = c.fetchall()
        for r in rows: r['fecha'] = str(r['fecha'])
        return jsonify(rows)
    except Exception as e:
        return jsonify({"error":str(e)}), 500
    finally: conn.close()

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
            for a in alumnos:
                c.execute(
                    "INSERT INTO avisos_tardanza (id_alumno, fecha, hora, motivo) VALUES (%s, %s, %s, %s)",
                    (a['id_alumno'], fecha, hora, motivo)
                )
        conn.commit()
        return jsonify({"ok": True, "total": len(alumnos)})
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

    if not id_alumno or not mensaje:
        return jsonify({"error": "Faltan datos"}), 400

    conn = get_connection()
    try:
        with conn.cursor() as c:
            c.execute(
                "INSERT INTO anuncios_alumno (id_alumno, fecha, hora, mensaje) VALUES (%s, %s, %s, %s)",
                (id_alumno, fecha, hora, mensaje)
            )
        conn.commit()
        return jsonify({"ok": True})
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

@app.route('/prece/eliminar-foto/<int:foto_id>', methods=['DELETE'])
def eliminar_foto(foto_id):
    """Preceptor elimina una foto de evidencia."""
    conn = get_connection()
    try:
        with conn.cursor() as c:
            c.execute("SELECT archivo FROM fotos_clase WHERE id = %s", (foto_id,))
            row = c.fetchone()
        if not row:
            return jsonify({"error": "Foto no encontrada"}), 404
        # Eliminar archivo del disco
        archivo_path = os.path.join(FOTOS_DIR, row['archivo'])
        if os.path.exists(archivo_path):
            os.remove(archivo_path)
        # Eliminar registro de la DB
        with conn.cursor() as c:
            c.execute("DELETE FROM fotos_clase WHERE id = %s", (foto_id,))
        conn.commit()
        return jsonify({"ok": True})
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        conn.close()

@app.route('/<path:filename>')
def serve_static(filename): return send_from_directory(BASE_DIR, filename)


# ═══════════════════════════════════════════════════════════════
#  LOGIN POR TARJETA RFID
# ═══════════════════════════════════════════════════════════════

@app.route('/login-tarjeta', methods=['POST'])
def login_tarjeta():
    """
    Verifica el identificador de tarjeta (nombre o ID/IP).
    Busca en la tabla tarjetas_rfid si existe un registro activo
    para ese identificador y devuelve los datos del alumno.
    JSON entrada: { identificador: str }
    """
    data = request.get_json()
    identificador = data.get('identificador', '').strip()

    if not identificador:
        return jsonify({"error": "Ingresá tu nombre o ID de tarjeta."}), 400

    conn = None
    try:
        conn = get_connection()
        with conn.cursor() as c:
            # Crear tabla si no existe
            c.execute("""
                CREATE TABLE IF NOT EXISTS tarjetas_rfid (
                    id            INT AUTO_INCREMENT PRIMARY KEY,
                    id_alumno     INT NOT NULL,
                    nombre_tarjeta VARCHAR(200) NOT NULL COMMENT 'Nombre o IP/ID del lector',
                    activa        BOOLEAN DEFAULT TRUE,
                    creado_en     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (id_alumno) REFERENCES alumnos(id_alumno)
                )
            """)

            # Buscar por nombre_tarjeta (case-insensitive) o por id exacto
            c.execute("""
                SELECT t.id_alumno, p.nombre, p.apellido, p.gmail,
                       a.id_curso AS anio
                FROM tarjetas_rfid t
                JOIN alumnos  a ON t.id_alumno  = a.id_alumno
                JOIN personas p ON a.id_persona = p.id_persona
                WHERE LOWER(t.nombre_tarjeta) = LOWER(%s)
                  AND t.activa = TRUE
                LIMIT 1
            """, (identificador,))
            alumno = c.fetchone()

        if not alumno:
            return jsonify({"error": "Tarjeta no reconocida. Verificá el nombre o ID."}), 404

        return jsonify({
            "ok":       True,
            "gmail":    alumno['gmail'],
            "nombre":   alumno['nombre'],
            "apellido": alumno['apellido'],
            "anio":     alumno['anio']
        })

    except Exception as e:
        print(f"❌ /login-tarjeta: {e}")
        return jsonify({"error": str(e)}), 500
    finally:
        if conn: conn.close()


@app.route('/tarjetas', methods=['GET'])
def listar_tarjetas():
    """Lista todas las tarjetas registradas (para gestión desde preceptoría)."""
    conn = None
    try:
        conn = get_connection()
        with conn.cursor() as c:
            c.execute("""
                SELECT t.id, t.nombre_tarjeta, t.activa,
                       p.nombre, p.apellido, p.gmail, a.id_curso
                FROM tarjetas_rfid t
                JOIN alumnos  a ON t.id_alumno  = a.id_alumno
                JOIN personas p ON a.id_persona = p.id_persona
                ORDER BY p.apellido, p.nombre
            """)
            return jsonify(c.fetchall())
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        if conn: conn.close()


@app.route('/tarjetas/asignar', methods=['POST'])
def asignar_tarjeta():
    """
    Asigna o actualiza la tarjeta de un alumno.
    JSON: { gmail: str, nombre_tarjeta: str }
    """
    data          = request.get_json()
    gmail         = data.get('gmail', '').strip()
    nombre_tarjeta = data.get('nombre_tarjeta', '').strip()

    if not gmail or not nombre_tarjeta:
        return jsonify({"error": "Faltan datos."}), 400

    id_al = _id_alumno(gmail)
    if not id_al:
        return jsonify({"error": "Alumno no encontrado."}), 404

    conn = None
    try:
        conn = get_connection()
        with conn.cursor() as c:
            # Desactivar tarjetas anteriores del alumno
            c.execute("UPDATE tarjetas_rfid SET activa=FALSE WHERE id_alumno=%s", (id_al,))
            # Insertar nueva
            c.execute(
                "INSERT INTO tarjetas_rfid (id_alumno, nombre_tarjeta) VALUES (%s, %s)",
                (id_al, nombre_tarjeta)
            )
        conn.commit()
        return jsonify({"ok": True})
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        if conn: conn.close()

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

        with conn.cursor() as c:
            c.execute(
                "INSERT INTO ingresos (id_alumno, fecha, hora) VALUES (%s, %s, %s)",
                (id_alumno, fecha, hora)
            )
        conn.commit()
        return jsonify({
            "ok":      True,
            "nombre":  alumno['nombre'],
            "apellido":alumno['apellido'],
            "hora":    hora[:5],   # HH:MM
            "anio":    alumno['id_curso']
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
    HORA_ENTRADA = '07:40'
    conn = get_connection()
    try:
        with conn.cursor() as c:
            # Total alumnos del curso
            c.execute("SELECT COUNT(*) AS total FROM alumnos WHERE id_curso = %s", (anio,))
            total = c.fetchone()['total']

            # Ingresos de hoy para ese curso
            c.execute("""
                SELECT i.id_alumno, LEFT(i.hora, 5) AS hhmm
                FROM ingresos i
                JOIN alumnos a ON i.id_alumno = a.id_alumno
                WHERE a.id_curso = %s AND i.fecha = %s
            """, (anio, hoy))
            ingresos = c.fetchall()

        presentes = sum(1 for r in ingresos if r['hhmm'] <= HORA_ENTRADA)
        tardes    = sum(1 for r in ingresos if r['hhmm'] >  HORA_ENTRADA)
        ausentes  = max(0, total - presentes - tardes)

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
    Devuelve la cantidad de días ausentes por alumno.
    Solo cuenta como "día de clase" los días en que AL MENOS UN alumno
    del curso registró ingreso en el escáner. Así evitamos contar como
    ausencia los días en que el escáner no funcionó o no hubo clases.
    """
    from datetime import date
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

            # Todos los ingresos del curso en el período
            c.execute("""
                SELECT i.id_alumno, i.fecha
                FROM ingresos i
                JOIN alumnos a ON i.id_alumno = a.id_alumno
                WHERE a.id_curso = %s AND i.fecha >= %s
            """, (anio, inicio))
            ingresos_rows = c.fetchall()

        # Set de (id_alumno, fecha_str) con ingreso
        ingresos_set = {(r['id_alumno'], str(r['fecha'])) for r in ingresos_rows}

        # Días reales de clase = fechas con al menos 1 ingreso del curso
        dias_con_clases = sorted({str(r['fecha']) for r in ingresos_rows})

        resultado = []
        for al in alumnos:
            id_al = al['id_alumno']
            ausencias = sum(1 for dia in dias_con_clases if (id_al, dia) not in ingresos_set)
            resultado.append({
                "id_alumno":    id_al,
                "nombre":       al['nombre'],
                "apellido":     al['apellido'],
                "gmail":        al['gmail'],
                "ausencias":    ausencias,
                "dias_habiles": len(dias_con_clases)
            })

        return jsonify(resultado)
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        conn.close()


@app.route('/dir/tardanzas-alumno/<int:anio>', methods=['GET'])
def dir_tardanzas_alumno(anio):
    """
    Devuelve la cantidad de llegadas tarde por alumno en el año lectivo,
    basado en registros reales del escáner (tabla ingresos, hora > 07:40).
    También incluye los motivos de los avisos de preceptoría del mismo alumno.
    """
    from datetime import date
    HORA_ENTRADA = '07:40'
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

            # Ingresos tarde del período
            c.execute("""
                SELECT i.id_alumno, LEFT(i.hora, 5) AS hhmm, i.fecha
                FROM ingresos i
                JOIN alumnos a ON i.id_alumno = a.id_alumno
                WHERE a.id_curso = %s AND i.fecha >= %s AND LEFT(i.hora, 5) > %s
            """, (anio, inicio, HORA_ENTRADA))
            tard_rows = c.fetchall()

            # Avisos de preceptoría (para obtener motivos)
            c.execute("""
                SELECT av.id_alumno, av.motivo
                FROM avisos_tardanza av
                JOIN alumnos a ON av.id_alumno = a.id_alumno
                WHERE a.id_curso = %s AND av.fecha >= %s
            """, (anio, inicio))
            avisos_rows = c.fetchall()

        # Agrupar tardanzas por alumno
        tard_map = {}
        for r in tard_rows:
            tard_map.setdefault(r['id_alumno'], 0)
            tard_map[r['id_alumno']] += 1

        # Agrupar motivos de avisos por alumno
        motivos_map = {}
        for r in avisos_rows:
            motivos_map.setdefault(r['id_alumno'], [])
            if r['motivo']:
                motivos_map[r['id_alumno']].append(r['motivo'])

        resultado = []
        for al in alumnos:
            id_al = al['id_alumno']
            motivos = motivos_map.get(id_al, [])
            # Top 3 motivos más frecuentes
            from collections import Counter
            top3 = [m for m, _ in Counter(motivos).most_common(3)]
            resultado.append({
                "id_alumno":  id_al,
                "nombre":     al['nombre'],
                "apellido":   al['apellido'],
                "gmail":      al['gmail'],
                "tardanzas":  tard_map.get(id_al, 0),
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
    HORA_ENTRADA = '07:40'
    inicio = date(date.today().year, 3, 1).isoformat()

    conn = get_connection()
    try:
        with conn.cursor() as c:
            # Tardanzas reales del escáner, traemos fecha y hora individuales
            c.execute("""
                SELECT i.fecha, LEFT(i.hora, 5) AS hhmm
                FROM ingresos i
                JOIN alumnos a ON i.id_alumno = a.id_alumno
                WHERE a.id_curso = %s
                  AND i.fecha >= %s
                  AND LEFT(i.hora, 5) > %s
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
    Devuelve ausencias reales agrupadas por mes para un curso,
    basado en ingresos del escáner QR (días sin registro).
    Incluye top 3 motivos de falta subidos por alumnos.
    """
    from datetime import date
    from collections import Counter
    inicio = date(date.today().year, 3, 1).isoformat()

    conn = get_connection()
    try:
        with conn.cursor() as c:
            # Todos los alumnos del curso
            c.execute("""
                SELECT a.id_alumno FROM alumnos a WHERE a.id_curso = %s
            """, (anio,))
            ids_alumnos = {r['id_alumno'] for r in c.fetchall()}

            # Todos los ingresos del curso desde marzo
            c.execute("""
                SELECT i.id_alumno, i.fecha
                FROM ingresos i
                JOIN alumnos a ON i.id_alumno = a.id_alumno
                WHERE a.id_curso = %s AND i.fecha >= %s
            """, (anio, inicio))
            ingresos_rows = c.fetchall()

            # Motivos de falta subidos por alumnos
            c.execute("""
                SELECT mf.fecha, mf.motivo
                FROM motivos_falta mf
                JOIN alumnos a ON mf.id_alumno = a.id_alumno
                WHERE a.id_curso = %s AND mf.fecha >= %s
                  AND mf.motivo IS NOT NULL AND mf.motivo != ''
            """, (anio, inicio))
            motivos_rows = c.fetchall()

        # Set de (id_alumno, fecha) con ingreso
        ingresos_set = {(r['id_alumno'], str(r['fecha'])) for r in ingresos_rows}

        # Días con clase = fechas donde al menos 1 alumno del curso ingresó
        dias_con_clase = sorted({str(r['fecha']) for r in ingresos_rows})

        # Contar ausencias por mes
        ausencias_por_mes = {}
        for dia in dias_con_clase:
            mes = dia[:7]
            ausentes_hoy = sum(1 for id_al in ids_alumnos if (id_al, dia) not in ingresos_set)
            ausencias_por_mes[mes] = ausencias_por_mes.get(mes, 0) + ausentes_hoy

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


if __name__ == '__main__':
    _init_tablas()
    print('📁 Uploads:', UPLOAD_BASE)
    app.run(debug=True, port=5000)
