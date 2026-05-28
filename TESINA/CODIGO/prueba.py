import pymysql
import sys

print("--- PROBANDO CON PYMYSQL (PLAN B) ---")

try:
    # Cambia los datos por los tuyos reales
    connection = pymysql.connect(
        host='127.0.0.1',
        user='root',
        password='root', # Tu pass aquí
        database='ciclobasico_db', # Tu DB aquí
        connect_timeout=5
    )
    
    print("¡CONECTADO!")
    
    with connection.cursor() as cursor:
        cursor.execute("SHOW TABLES;")
        tablas = cursor.fetchall()
        print(f"Tablas encontradas: {tablas}")
        
    connection.close()
    print("--- PRUEBA FINALIZADA CON ÉXITO ---")

except Exception as e:
    print(f"ERROR: {e}")