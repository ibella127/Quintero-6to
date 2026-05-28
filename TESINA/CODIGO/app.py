from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS
import pymysql
import os
import smtplib
import random
import time
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

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
EMAIL_APP_PASSWORD = "tzec mgkz mvcp zfop"  # ── Modificar cuando la web se trabe

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
        
        # 🔥 ESTO ES LO IMPORTANTE: MIRA TU TERMINAL DESPUÉS DE DARLE A "ENTRAR"
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


# ── Carpetas de uploads (se crean automáticamente) ─────────────
import os
from datetime import date
from werkzeug.utils import secure_filename
from flask import send_from_directory

BASE_DIR         = os.path.dirname(os.path.abspath(__file__))
UPLOAD_BASE      = os.path.join(BASE_DIR, 'uploads')
CERTIFICADOS_DIR = os.path.join(UPLOAD_BASE, 'certificados')
FOTOS_DIR        = os.path.join(UPLOAD_BASE, 'fotos')
for _d in [UPLOAD_BASE, CERTIFICADOS_DIR, FOTOS_DIR]:
    os.makedirs(_d, exist_ok=True)

EXTENSIONES_OK = {'png','jpg','jpeg','gif','webp','pdf'}
def _allowed(fn): return '.' in fn and fn.rsplit('.',1)[1].lower() in EXTENSIONES_OK

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

def _init_tablas():
    conn = get_connection()
    try:
        with conn.cursor() as c:
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
            c.execute("""CREATE TABLE IF NOT EXISTS ingresos (
                id        INT AUTO_INCREMENT PRIMARY KEY,
                id_alumno INT NOT NULL,
                fecha     DATE NOT NULL,
                hora      VARCHAR(8) NOT NULL,
                creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (id_alumno) REFERENCES alumnos(id_alumno)
            )""")
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

if __name__ == '__main__':
    _init_tablas()
    print('📁 Uploads:', UPLOAD_BASE)
    app.run(debug=True, port=5000)