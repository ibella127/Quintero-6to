from flask import Flask, jsonify
from flask_cors import CORS
import mysql.connector  # <--- ESTA LÍNEA ES LA QUE FALTABA
from mysql.connector import Error

app = Flask(__name__)
CORS(app)

# Tu configuración que ya sabemos que está bien
primero_db = {
    'host': '127.0.0.1', 
    'user': 'root',
    'password': 'root', 
    'database': 'primero_db', 
    'port': 3306,
    'auth_plugin': 'mysql_native_password'
}

@app.route('/estudiantes-primero', methods=['GET'])
def get_estudiantes_primero():
    connection = None
    try:
        # Aquí es donde fallaba antes
        connection = mysql.connector.connect(**primero_db)
        
        if connection.is_connected():
            cursor = connection.cursor(dictionary=True)
            # Usamos el nombre de la tabla tal cual está en tu MySQL (image_2278de.png)
            cursor.execute("SELECT nombre, apellido, gmail FROM Primer_Ano")
            records = cursor.fetchall()
            return jsonify(records)

    except Error as e:
        print(f"Error: {e}")
        return jsonify({"error": str(e)}), 500

    finally:
        if connection and connection.is_connected():
            cursor.close()
            connection.close()

if __name__ == '__main__':
    print("🚀 SERVIDOR KRONO REPARADO Y ACTIVO")
    # Mantenemos el host 0.0.0.0 que nos sirvió para el Firewall
    app.run(debug=True, host='0.0.0.0', port=5000)