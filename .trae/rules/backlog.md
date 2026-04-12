# Backlog de Progreso SagasRol

## Objetivo
Este documento resume el estado actual de la aplicacion para tener una referencia rapida de:
- funcionalidades ya implementadas
- funcionalidades en progreso o parcialmente completas
- funcionalidades pendientes o siguientes pasos recomendados

## Estado General
- Monorepo activo con separacion clara entre `backend` y `frontend`.
- Stack principal en uso:
  - Backend: FastAPI + SQLAlchemy + Pydantic + PostgreSQL
  - Frontend: React + TypeScript + Tailwind + React Router
  - Auth: Clerk
  - Storage: Supabase Storage
- El foco reciente del desarrollo esta en el `Campaign Lobby` y especialmente en la gestion de contenido y assets para GM.

## Completado

### Base del dominio
- Modelo `Universe` disponible y relacionado con campañas.
- Modelo `Campaign` disponible y relacionado con GM, universo, miembros, personajes, notas, handouts y assets.
- Modelo `Asset` para activos base del universo implementado.
- Modelo `CampaignAsset` creado para activos propios de campaña.
- Relaciones ORM principales entre usuario, universo, campaña, personajes y assets presentes en `backend/models.py`.

### Campaigns API
- Creacion de campañas.
- Listado de campañas del usuario separando `mastering` y `playing`.
- Union a campaña por codigo de invitacion.
- Actualizacion de datos base de campaña.
- Subida de banner de campaña a Supabase.
- Endpoint de lobby con datos agregados de:
  - campaña
  - rol GM / jugador
  - party
  - notas
  - handouts

### Lobby de campaña en frontend
- Pantalla de lobby implementada en `CampaignLobby.tsx`.
- Navegacion por tabs:
  - Resumen
  - Grupo
  - Diario
  - Biblioteca
  - Recursos (solo GM)
- Carga inicial y polling del lobby.
- Vista de error y vista de loading.
- Edicion de descripcion de campaña para GM.
- Subida de banner de campaña para GM.

### Gestion de grupo y asistencia
- Visualizacion de miembros del grupo.
- Distincion entre GM, jugadores, personaje asignado y usuario actual.
- Flujo de asistencia:
  - solicitud de asistencia por jugador
  - resolucion por GM
  - estados `UNKNOWN`, `PENDING`, `CONFIRMED`, `DECLINED`, `REJECTED`
- Registro de auditoria para asistencia mediante `AttendanceLog`.

### Notas y biblioteca
- Notas privadas de campaña implementadas.
- Restriccion de visibilidad entre GM y jugadores aplicada en backend.
- Handouts implementados:
  - creacion textual
  - subida de archivo
  - actualizacion
  - cambio de visibilidad
  - borrado
- Tab de biblioteca integrado en el lobby.

### Assets de campaña
- Tab `Assets` visible solo para GM.
- Endpoint `GET /campaigns/{campaign_id}/assets` implementado.
- Endpoint `POST /campaigns/{campaign_id}/assets` implementado.
- Endpoint `PATCH /campaigns/{campaign_id}/assets/{asset_id}/preselect` implementado.
- Endpoint `POST /campaigns/{campaign_id}/assets/copy-from-universe` implementado.
- Endpoint `PATCH /campaigns/{campaign_id}/assets/{asset_id}` implementado para editar nombre y tags.
- Endpoint `DELETE /campaigns/{campaign_id}/assets/{asset_id}` implementado.
- Distincion entre:
  - assets heredados del universo
  - assets propios de campaña
- Bandeja de sesion con assets preseleccionados.
- Copia de assets desde universo a campaña.
- Subida de assets de campaña con preview previa.
- Edicion inline de nombre y etiquetas para assets de campaña.
- Eliminacion de assets de campaña desde UI.
- Validacion basica en frontend de tipo de archivo y peso maximo.
- Validacion basica en backend de duplicado de nombre por campaña.
- Soporte de tags en `Asset` y `CampaignAsset`.

## En Progreso

### Assets avanzados
- La base funcional esta construida, pero aun no esta cerrada como sistema completo de gestion.
- La experiencia actual cubre bien assets de campaña, pero no cubre todavia de forma equivalente la edicion parcial de assets del universo desde el contexto de campaña.
- La carga actual contempla un archivo por accion; el requerimiento de carga multiple aun no esta terminado.
- La validacion de nombres y tags existe, pero aun necesita refuerzo para:
  - caracteres permitidos
  - normalizacion
  - mensajes de error mas consistentes

### Robustez tecnica
- `backend/routers/campaigns.py` concentra demasiada responsabilidad y ya es un archivo grande.
- No se ve aun una capa de servicios separada para campañas, lobby, handouts y assets.
- Falta una estrategia clara de migraciones para cambios recientes de modelos como `CampaignAsset.tags`.

### Calidad y testing
- Hubo pruebas puntuales durante la integracion de assets, pero no queda una suite estable y consolidada en el repo para esa funcionalidad.
- Faltan pruebas automatizadas persistentes de backend y frontend para la pestaña de assets.

## Pendiente

### Assets del universo
- Permitir editar tags de assets del universo desde una interfaz controlada por permisos.
- Definir claramente si el nombre del asset del universo puede editarse o si solo cambian sus tags.
- Añadir auditoria especifica para cambios sobre assets del universo y assets de campaña.

### Carga multiple de assets
- Subida de multiples imagenes en una sola operacion.
- Preview individual por archivo antes de confirmar.
- Renombrado individual por archivo antes de enviar.
- Gestion de tags por archivo dentro del lote.
- Estado visual por archivo durante la subida.

### Validaciones de negocio faltantes
- Restriccion fuerte de caracteres especiales en nombre de archivo y nombre logico del asset.
- Validacion centralizada de tamaño y formatos permitidos en backend.
- Límite de tags reforzado en backend con respuestas consistentes.
- Prevencion robusta de duplicados contemplando mayusculas/minusculas y espacios.

### Persistencia y base de datos
- Crear o verificar migraciones reales para:
  - tabla `campaign_assets`
  - columna `tags` en assets de campaña
  - cualquier ajuste adicional requerido
- Revisar consistencia entre esquema de SQLAlchemy y estructura real de PostgreSQL.

### UX y producto
- Reemplazar `alert()` por sistema de toast/notificaciones consistente.
- Mostrar estados vacios y errores mas ricos en la pestaña de assets.
- Añadir filtros por tag y/o categoria.
- Añadir buscador de assets.
- Mejorar feedback visual despues de copiar desde universo.
- Mostrar si un asset viene de universo o es propio de campaña con badges mas claros.

### Testing
- Backend:
  - listar assets
  - subir asset
  - editar nombre y tags
  - borrar asset
  - copiar desde universo
  - permisos GM / jugador
  - validaciones de duplicado
  - validaciones de maximo de tags
- Frontend:
  - render de tabs del lobby
  - visibilidad de tab `Recursos` solo para GM
  - flujo de preview de subida
  - guardado de edicion inline
  - borrado con confirmacion
  - manejo de errores de red y validacion

## Riesgos / Deuda Tecnica
- `campaigns.py` necesita refactor por tamaño y mezcla de dominios.
- Falta confirmar que todos los cambios recientes tengan migracion aplicada en la base real.
- El sistema de auditoria hoy cubre asistencia, pero no cubre todavia assets.
- Algunas decisiones de negocio de assets del universo vs assets de campaña siguen implicitas y conviene formalizarlas.

## Siguiente Prioridad Recomendada
1. Estabilizar assets con migraciones y tests automatizados reales.
2. Completar validaciones de backend para nombres, formatos y tags.
3. Implementar carga multiple con preview por archivo.
4. Añadir auditoria de cambios para assets.
5. Refactorizar `campaigns.py` separando rutas o servicios por dominio.
