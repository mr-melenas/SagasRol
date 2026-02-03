from sqlalchemy import create_engine, text
import os
from dotenv import load_dotenv

# Cargar variables de entorno
load_dotenv()

# Obtener URL de la base de datos
DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    print("Error: DATABASE_URL no está configurada en el archivo .env")
    exit(1)

# Fix para SQLAlchemy que requiere postgresql:// en lugar de postgres://
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

# Crear motor de conexión
engine = create_engine(DATABASE_URL)

def test_check_universes():
    print(f"Conectando a: {DATABASE_URL}")
    try:
        with engine.connect() as connection:
            print("\n--- Verificando tabla 'universes' ---")
            result = connection.execute(text("SELECT id, name, gm_id FROM universes"))
            universes = result.fetchall()
            
            if not universes:
                print("La tabla 'universes' está vacía.")
            else:
                print(f"Se encontraron {len(universes)} universos:")
                for u in universes:
                    print(f"ID: {u.id} | Name: {u.name} | GM_ID: {u.gm_id}")

            print("\n--- Verificando tabla 'users' ---")
            result_users = connection.execute(text("SELECT id, username, role FROM users"))
            users = result_users.fetchall()
            if not users:
                print("La tabla 'users' está vacía.")
            else:
                print(f"Se encontraron {len(users)} usuarios:")
                for u in users:
                    print(f"ID: {u.id} | Username: {u.username} | Role: {u.role}")

    except Exception as e:
        print(f"Error al conectar o consultar la base de datos: {e}")

if __name__ == "__main__":
    test_check_universes()
