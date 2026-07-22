# Memoria técnica: Carta a Sofi

Este archivo conserva las decisiones y el trabajo realizado para poder trasladarlo a un proyecto Astro limpio. El proyecto actual nació desde el template de blog de Astro; la recomendación para continuar es crear un proyecto mínimo y copiar sólo las piezas listadas aquí.

## Objetivo del proyecto

Construir una carta/sitio visual para Sofi, pensado principalmente para celular, con recursos expresivos inspirados en videojuegos:

- Texto con BBCode y animaciones tipo `RichTextLabel` de Godot.
- Texto progresivo tipo terminal o caja de diálogo.
- Secuencias de mensajes que avanzan al tocar cuando termina la escritura.
- Fotografías con apariencia de foto instantánea y una nota manuscrita debajo.
- Diseño mobile-first, accesible y sin frameworks de UI adicionales.

## Componentes implementados

### `RichTextLabel.astro`

Archivos necesarios:

- `src/components/RichTextLabel.astro`
- `src/lib/rich-text-bbcode.ts`
- `src/styles/rich-text.css`

Uso:

```astro
<RichTextLabel
  as="h1"
  text="Una [wave amp=4]carta[/wave] para [rainbow]Sofi[/rainbow]"
/>
```

BBCode permitido:

- Formato: `[b]`, `[i]`, `[u]`, `[s]`.
- Color y tamaño: `[color=#ff4fa3]`, `[font_size=32]`.
- Efectos: `[wave]`, `[shake]`, `[rainbow]`, `[pulse]`.
- Los efectos se pueden anidar con formato y color.
- Los parámetros numéricos y colores se validan y limitan.
- El contenido HTML se escapa; sólo se generan las etiquetas permitidas.
- Se segmenta por grafemas para no romper emojis ni caracteres acentuados.
- Los espacios, espacios consecutivos, tabulaciones y saltos de línea se preservan. Los espacios animados se generan como `.rt-space` con `&nbsp;`.
- Las animaciones respetan `prefers-reduced-motion`.

### `TypewriterText.astro`

Archivos necesarios:

- `src/components/TypewriterText.astro`
- `src/lib/rich-text-bbcode.ts`
- `src/styles/rich-text.css`

Uso con BBCode y varios mensajes:

```astro
---
const dialogos = [
  '[color=#72d7ff]Conexión establecida.[/color]',
  'Las palabras también tienen [wave amp=2]ritmo[/wave].',
  '[rainbow]Fin de la transmisión.[/rainbow]',
];
---

<TypewriterText
  messages={dialogos}
  bbcode
  speed={38}
  delay={350}
  punctuationPause={260}
  cursorCharacter="_"
  advanceOnClick
/>
```

Props principales:

- `text?: string`: un solo mensaje.
- `messages?: string[]`: secuencia de mensajes.
- `bbcode?: boolean`: procesa cada mensaje con el parser seguro.
- `speed`, `delay`, `humanize`, `punctuationPause`.
- `cursor`, `cursorCharacter`.
- `loop`, `loopDelay`.
- `startWhenVisible`: comienza mediante `IntersectionObserver`.
- `advanceOnClick`: avanza al siguiente mensaje sólo cuando termina el actual.
- `clickToSkip`: opcionalmente completa el mensaje actual al tocar.
- `nextLabel`: texto del indicador de continuación.
- `controls`: muestra botón para repetir.

API pública del custom element interno `sofi-typewriter-text`:

- `play()`
- `reset()`
- `restart()`
- `next()`
- `skip()`

Eventos:

- `typewriter:start`
- `typewriter:character`
- `typewriter:message`
- `typewriter:complete`
- `typewriter:sequence-complete`

Decisiones importantes:

- Cada mensaje se prerenderiza en un `<template>` seguro.
- Los caracteres se ocultan con `hidden` y se revelan uno por uno; `.rt-char[hidden]` tiene `display: none !important` para que el cursor avance de verdad.
- El nombre interno cambió de `typewriter-text` a `sofi-typewriter-text` para evitar una definición antigua retenida por HMR durante el desarrollo.
- La secuencia puede controlarse con toque, `Enter` o espacio.
- El texto completo se anuncia mediante una región `aria-live` cuando termina.
- El área táctil y las alturas de la demo se diseñaron para celular.

### `InstantPhoto.astro`

Archivo necesario:

- `src/components/InstantPhoto.astro`

Uso:

```astro
---
import foto from '../assets/mi-foto.jpg';
---

<InstantPhoto
  src={foto}
  alt="Descripción de la fotografía"
  note="Nuestro pequeño instante ♡"
  date="Julio, 2026"
  rotation={3}
  tape
/>
```

Props:

- `src: ImageMetadata | string` y `alt: string`.
- `note`, `date`, `dateTime`.
- `aspect`: `square`, `portrait` o `landscape`.
- `size`: `small`, `medium` o `large`.
- `paper`: `white` o `cream`.
- `rotation`: se limita entre −7° y 7°.
- `tape`: cinta adhesiva decorativa.
- `pixelated`: conserva nítido el pixel art.
- `loading`: `lazy` o `eager`.

El componente usa `<Image />` para imports locales optimizados y `<img>` para rutas públicas o remotas. Está construido como `<figure>` + `<figcaption>`.

## Assets añadidos

- `src/assets/sofi_portrait.png`: retrato pixel art de Sofi; usar `pixelated` al mostrarlo.
- `src/assets/fonts/HopeGold.woff`: fuente añadida y registrada, pero finalmente no usada en la terminal.

La terminal debe usar una pila monoespaciada de programación:

```css
font-family:
  ui-monospace,
  SFMono-Regular,
  Menlo,
  Monaco,
  Consolas,
  "Liberation Mono",
  "Courier New",
  monospace;
```

## Configuración de fuentes

`astro.config.mjs` registra Atkinson y Hope Gold mediante `fontProviders.local()`. `BaseHead.astro` sólo precarga actualmente `--font-atkinson`. Hope Gold puede eliminarse del proyecto limpio si no se utilizará.

## Qué copiar al proyecto Astro limpio

Copiar primero:

```text
src/components/RichTextLabel.astro
src/components/TypewriterText.astro
src/components/InstantPhoto.astro
src/lib/rich-text-bbcode.ts
src/styles/rich-text.css
src/assets/sofi_portrait.png
```

Después:

1. Importar los componentes en la página principal nueva.
2. Importar `rich-text.css` únicamente mediante los componentes, como ya ocurre.
3. Copiar las secciones útiles de `src/pages/index.astro`, no toda la página del blog.
4. Crear un layout mínimo con `<BaseHead />`, contenido y footer propios.
5. No copiar `src/content/blog`, rutas `/blog`, RSS ni los componentes del header del template salvo que realmente se necesiten.
6. Cambiar `SITE_DESCRIPTION`, que todavía conserva el texto genérico del starter.
7. Mantener `<html lang="es">` y el diseño mobile-first.

## Estado y validación

- El último commit existente para el primer bloque de trabajo fue `83ce628 feat: add animated rich text components`.
- Hay cambios posteriores sin commit, incluidos Typewriter con BBCode/secuencias, correcciones de espacios, InstantPhoto, assets y personalizaciones del usuario.
- No descartar el worktree actual al crear el proyecto nuevo.
- La última validación ejecutada fue `npm run build`, que completó correctamente las 8 rutas.

## Recomendación para el nuevo proyecto

Crear Astro con el template mínimo, no con el blog starter. Mantener la nueva página como una experiencia de una sola ruta y extraer componentes sólo cuando sean realmente reutilizables. La lógica expresiva ya está aislada y puede trasladarse sin las dependencias del blog.
