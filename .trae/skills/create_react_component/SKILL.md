---
name: create_react_component
description: Genera un nuevo componente de React usando Tailwind, tipado de TypeScript e iconos de Lucide.
---

Cuando el usuario te pida crear un nuevo componente de React para la UI:
1. Crea el archivo `.tsx` en la ruta adecuada.
2. Usa `export default function NombreComponente()`.
3. Define las `interface Props { ... }` si el componente recibe propiedades.
4. Añade un contenedor principal usando Tailwind con soporte para dark mode por defecto (ej. `className="p-4 bg-gray-800 rounded-lg text-white"`).
5. Si el componente representa una acción, incluye el manejo de estados `loading` y `error`.
6. Termina devolviendo el código listo para ser copiado o aplicado al workspace.