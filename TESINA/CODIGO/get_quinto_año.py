import mysql.connector
from mysql.connector import errorcode
import time
import sys # Importamos sys para imprimir errores críticos

# Configuración de la base de datos
DB_CONFIG = {
    'host': '127.0.0.1',
    'user': 'root',
    'password': 'root',
    'database': 'cicloorientado_db', 
    'port': 3306, 
    'connection_timeout': 5
}

def get_quinto_ano():
    """
    Se conecta a la base de datos y recupera todos los registros de la tabla quinto_año.
    Retorna una lista de tuplas con los datos o una lista vacía en caso de error.
    """
    conn = None
    cursor = None
    records = [] # <<< INICIALIZACIÓN CRUCIAL: Siempre empezamos con una lista vacía
    start_time = time.time()

    try:
        print(">>> Intentando conectar a la base de datos...")
        conn = mysql.connector.connect(**DB_CONFIG)
        end_time = time.time()
        print(f">>> Conexión establecida en {end_time - start_time:.2f} segundos.")

        if conn.is_connected():
            print("Conectado exitosamente a la base de datos MySQL. 🎉")
            cursor = conn.cursor()

            # Consulta a la tabla (usar comillas invertidas)
            # Nota: Si tu tabla solo tiene 3 columnas (ID, Nombre y Mail) 
            # y no tiene una columna de 'Apellido', debes cambiar el SELECT * # a SELECT id, nombre, gmail
            cursor.execute("SELECT * FROM `quinto_año`")
            records = cursor.fetchall() # <<< Se asignan los datos aquí

            if records:
                print("\n--- Estudiantes en Quinto Año ---")
                for row in records:
                    print(row)
            else:
                print("\nNo se encontraron estudiantes en la tabla 'quinto_año'.")

    except mysql.connector.Error as err:
        if err.errno == errorcode.ER_ACCESS_DENIED_ERROR:
            print("❌ Error: Acceso denegado (usuario o contraseña incorrectos).", file=sys.stderr)
        elif err.errno == errorcode.ER_BAD_DB_ERROR:
            print("❌ Error: La base de datos especificada no existe.", file=sys.stderr)
        elif 'timed out' in str(err) or err.errno == 2003:
            print("❌ Error Crítico: No se pudo conectar al servidor MySQL.", file=sys.stderr)
            print("Verifica que el servicio de MySQL esté activo.", file=sys.stderr)
            print(f"Detalle del error: {err}", file=sys.stderr)
        else:
            print(f"❌ Otro error de conexión: {err}", file=sys.stderr)
        
        records = [] # <<< CRUCIAL: En caso de error, el resultado devuelto es una lista vacía

    except Exception as e:
        print(f"❌ Error inesperado: {e}", file=sys.stderr)
        records = [] # <<< CRUCIAL: En caso de error, el resultado devuelto es una lista vacía

    finally:
        if cursor:
            cursor.close()
        if conn is not None and conn.is_connected():
            conn.close()
            print("Conexión MySQL cerrada.")

    return records # <<< CRUCIAL: ¡Siempre se devuelve una lista (vacía o con datos)!

# Ejecutar solo si se llama directamente este script
if __name__ == "__main__":
    get_quinto_ano()