---
name: create_fastapi_endpoint
description: Crea un endpoint RESTful completo incluyendo su modelo Pydantic, lógica de BD y manejo de errores.
---

Cuando el usuario te pida crear un nuevo endpoint:
1. Pide confirmación sobre si se necesita un nuevo modelo SQLAlchemy o si ya existe.
2. Genera el código para el `schema.py` (Pydantic base, Create, Update y Response).
3. Genera la ruta en el `router` correspondiente.
4. Incluye SIEMPRE `Depends(get_current_user)` si es una ruta protegida.
5. Incluye la lógica de base de datos con manejo de excepciones (`HTTPException 404/403`).
6. Asegúrate de incluir `db.commit()` y `db.refresh()` para métodos POST/PATCH/PUT.
7. Devuelve el código estructurado en bloques por archivo para fácil implementación.