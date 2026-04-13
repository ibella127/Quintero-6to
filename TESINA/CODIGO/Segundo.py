import mysql.connector
from mysql.connector import errorcode
import time # Importamos la librería time para medir y diagnosticar

# --- 🛠️ CORRECCIÓN 1: Usar IP explícita para evitar problemas de localhost ---
# Es más seguro usar la dirección IP de loopback (127.0.0.1) que 'localhost'
DB_CONFIG = {
    'host': '127.0.0.1', 
    'user': 'root',
    'password': 'root',
    'database': 'Segundo_db',
    'port': '3306',
    # El timeout ayuda a evitar que se quede 'colgado' indefinidamente
    'connection_timeout': 5
}

def get_segundo_año():
    """
    Se conecta a la base de datos y recupera todos los registros de la tabla Segundo Año.
    """
    conn = None
    cursor = None
    start_time = time.time() # 🛠️ Para medir cuánto tarda la conexión
    
    try:
        # 🛠️ Punto de Diagnóstico: Indicamos que el intento va a comenzar
        print(">>> Intentando conectar a la base de datos...")
        
        conn = mysql.connector.connect(**DB_CONFIG)
        
        end_time = time.time()
        print(f">>> Conexión establecida en {end_time - start_time:.2f} segundos.")


        if conn.is_connected():
            print("Conectado exitosamente a la base de datos MySQL. ¡Éxito! 🎉")
            cursor = conn.cursor()
            
            # Aquí es donde le dices a Python qué tabla leer
            cursor.execute("SELECT * FROM segundo_año")
            records = cursor.fetchall()

            if records:
                print("\n--- Estudiantes en Segundo Año ---")
                # 🛠️ Mejorar la impresión para hacerla más clara
                for row in records:
                    print(row)
            else:
                print("\nNo se encontraron estudiantes en la tabla segundo_año.")

    # 🛠️ CORRECCIÓN 2: Capturar errores más específicos y el timeout
    except mysql.connector.Error as err:
        if err.errno == errorcode.ER_ACCESS_DENIED_ERROR:
            print("Error: Acceso denegado (usuario o contraseña incorrectos).")
        elif err.errno == errorcode.ER_BAD_DB_ERROR:
            print("Error: La base de datos 'Segundo_db' no existe.")
        elif 'timed out' in str(err) or err.errno == 2003: # 2003 es Can't connect to MySQL server
            # Este es el error más probable si el script se queda 'colgado' o falla silenciosamente
            print(f"\n❌ Error Crítico: No se pudo establecer conexión (Timeout o Servidor Inactivo).")
            print("Verifica que el servicio de MySQL esté activo en tu Administrador de Servicios.")
            print(f"Detalle del error: {err}")
        else:
            print(f"Error de conexión a la base de datos (Otro): {err}")
    
    except Exception as e:
        print(f"Ocurrió un error inesperado: {e}")

    finally:
        if cursor:
            cursor.close()
        # 🛠️ La comprobación se hace más robusta para evitar errores si 'conn' es None
        if conn is not None and conn.is_connected():
            conn.close()
            print("Conexión MySQL cerrada.")


if __name__ == "__main__":
    get_segundo_año()