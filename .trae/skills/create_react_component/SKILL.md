---
name: create_react_component
description: Genera componentes en /frontend con React 18, TypeScript, Tailwind y lógica de UI optimista.
---

Cuando el usuario pida un nuevo componente de React:
1. **Contexto de Directorio**: Los archivos deben crearse dentro de `/frontend`.
2. **Estándar de Lenguaje**: 
    - Código (componentes, props, hooks, variables) en **INGLÉS**.
    - Texto visible para el usuario (labels, botones, mensajes) en **ESPAÑOL**.
3. **Arquitectura de Componente**:
    - Usa componentes funcionales y Hooks de React 18.
    - Define interfaces de TypeScript para las `Props`.
4. **UX y Estado**:
    - **Optimistic UI**: Si el componente realiza mutaciones de datos, implementa lógica para actualizar el estado local inmediatamente y revertirlo si el servidor falla.
    - Maneja y muestra explícitamente los estados de `loading` y `error`.
5. **Estilo y Assets**:
    - Usa Tailwind CSS para el diseño.
    - Utiliza iconos de `lucide-react` para la interfaz.
6. **Visión Agnóstica (RPG Engine)**: Si el componente es para la Hoja de Personaje o el Lobby, debe ser dinámico y capaz de renderizar datos basados en el JSON del sistema de juego, evitando campos estáticos.