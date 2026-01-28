import socket
import os
import sys
from urllib.parse import urlparse

# URL de la base de datos (copiada de tu .env)
DB_URL = "postgresql://postgres:mZUv3-dNN*UkA4@db.ehwmlowgjuuhvdjqyzqs.supabase.co:5432/postgres"

def check_connection():
    print("--- Diagnóstico de Conexión a Supabase ---")
    
    try:
        parsed = urlparse(DB_URL)
        hostname = parsed.hostname
        port = parsed.port or 5432
        
        print(f"1. Host objetivo: {hostname}")
        print(f"2. Puerto objetivo: {port}")
        
        # Prueba DNS
        print("\n[Prueba DNS] Intentando resolver IP...")
        try:
            ip = socket.gethostbyname(hostname)
            print(f"✅ ÉXITO: IP resuelta es {ip}")
        except socket.gaierror as e:
            print(f"❌ FALLO DNS: No se pudo resolver el nombre del host. Error: {e}")
            print("   -> Posible causa: Bloqueo de DNS, VPN activa, o URL mal escrita.")
            return

        # Prueba TCP
        print(f"\n[Prueba TCP] Intentando conectar al puerto {port}...")
        try:
            sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            sock.settimeout(5) # 5 segundos timeout
            result = sock.connect_ex((hostname, port))
            if result == 0:
                print(f"✅ ÉXITO: Puerto {port} accesible.")
            else:
                print(f"❌ FALLO TCP: No se pudo conectar al puerto (Código: {result})")
                print("   -> Posible causa: Firewall corporativo/router bloqueando puerto 5432.")
            sock.close()
        except Exception as e:
            print(f"❌ ERROR TCP: {e}")

    except Exception as e:
        print(f"Error general en script: {e}")

if __name__ == "__main__":
    check_connection()
