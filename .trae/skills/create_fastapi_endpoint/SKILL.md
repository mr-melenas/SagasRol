---
name: create_fastapi_endpoint
description: Crea un endpoint RESTful en /backend siguiendo los estándares de SagasRol (SQLAlchemy + Pydantic).
---

Cuando el usuario pida un nuevo endpoint:
1. **Contexto de Directorio**: Asegúrate de que los cambios se propongan para la carpeta `/backend`. Si se requieren nuevas librerías, indica que se debe usar `pip install` y actualizar `requirements.txt`.
2. **Estándar de Lenguaje**: Todo el código, nombres de funciones, variables y logs deben estar en **INGLÉS**.
3. **Inyección de Dependencias**: Usa estrictamente `db: Session = Depends(get_db)` y, si la ruta es protegida, `current_user = Depends(get_current_user)`.
4. **Modelos y Schemas**:
    - Genera o actualiza modelos en `models.py` usando SQLAlchemy.
    - Crea schemas Pydantic (Base, Create, Response) en `schemas.py`.
5. **Lógica de Base de Datos**:
    - Para operaciones de escritura (POST/PATCH/DELETE), es CRÍTICO llamar a `db.commit()` y `db.refresh(obj)`.
    - Implementa manejo de errores con `HTTPException` (400 para validaciones, 403 para permisos, 404 para no encontrados).
6. **Gestión de Archivos**: Si el endpoint implica subida de archivos, utiliza la utilidad de Supabase (Bucket: `rolsitoData`) generando UUIDs para los nombres.
7. **Arquitectura**: Dado que `campaigns.py` está saturado, si el endpoint pertenece a un nuevo dominio (ej. Assets, SystemMaker), sugiere crear un nuevo router separado.