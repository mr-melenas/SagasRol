import os
import uuid
from fastapi import UploadFile, HTTPException
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    raise RuntimeError("Supabase credentials not found in environment variables.")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
BUCKET_NAME = "rolsitoData"

async def upload_image_to_supabase(file: UploadFile, folder_path: str) -> str:
    """
    Sube una imagen a Supabase Storage y retorna su URL pública.
    
    Args:
        file (UploadFile): Archivo recibido desde FastAPI.
        folder_path (str): Ruta dentro del bucket (ej: "campaigns/1/handouts").
        
    Returns:
        str: URL pública del archivo subido.
    """
    try:
        # 1. Validar extensión y generar nombre único
        filename = file.filename
        extension = filename.split(".")[-1] if "." in filename else "bin"
        unique_name = f"{uuid.uuid4()}.{extension}"
        file_path = f"{folder_path}/{unique_name}"

        # 2. Leer contenido
        file_content = await file.read()

        # 3. Subir a Supabase
        # file_options={"content-type": file.content_type} es importante para que el navegador lo interprete bien
        res = supabase.storage.from_(BUCKET_NAME).upload(
            path=file_path,
            file=file_content,
            file_options={"content-type": file.content_type}
        )

        # 4. Obtener URL pública
        # En versiones nuevas de la librería supabase-py, upload no retorna error directo sino respuesta
        # Si falla, suele lanzar excepción o retornar objeto con error.
        
        # En supabase-py 2.x, get_public_url retorna un string directo
        public_url = supabase.storage.from_(BUCKET_NAME).get_public_url(file_path)
        
        # Ojo: a veces retorna un objeto con un método o propiedad, depende de la versión exacta
        # Pero normalmente es un string.
        
        return public_url

    except Exception as e:
        print(f"Error uploading to Supabase: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to upload image: {str(e)}")
