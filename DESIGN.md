---
name: Thrive Randomizer
description: Suite de sorteos rápidos con una piel de papel cálido, tinta cobalto y sellos de goma.
colors:
  canvas: "#f3efe6"
  surface: "#fbf8f1"
  surface-hover: "#f0e9dc"
  surface-sunken: "#e7dfd1"
  ink: "#221f1a"
  muted: "#5b554b"
  action: "#1f4fb5"
  action-hover: "#173e8f"
  action-active: "#102e6b"
  on-action: "#f8fbff"
  control-border: "#807669"
  focus: "#b45309"
  error: "#a32121"
  error-strong: "#7f1d1d"
  success: "#1f6b47"
  warning: "#92400e"
typography:
  display:
    fontFamily: "Bricolage Grotesque, Segoe UI, system-ui, sans-serif"
    fontSize: "2.625rem"
    fontWeight: 700
    lineHeight: 1.095
    letterSpacing: "-0.02em"
  display-mobile:
    fontFamily: "Bricolage Grotesque, Segoe UI, system-ui, sans-serif"
    fontSize: "2rem"
    fontWeight: 700
    lineHeight: 1.125
    letterSpacing: "-0.02em"
  headline:
    fontFamily: "Bricolage Grotesque, Segoe UI, system-ui, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 700
    lineHeight: 1.1667
    letterSpacing: "normal"
  body:
    fontFamily: "Segoe UI, system-ui, -apple-system, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.5625
  mono:
    fontFamily: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace"
    fontSize: "2.75rem"
    fontWeight: 700
    lineHeight: 1.09
  label:
    fontFamily: "Segoe UI, system-ui, -apple-system, sans-serif"
    fontSize: "0.8125rem"
    fontWeight: 600
    lineHeight: 1.46
  registration:
    fontFamily: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace"
    fontSize: "0.75rem"
    fontWeight: 400
    lineHeight: 1.4
rounded:
  card: "10px"
  control: "8px"
  chip: "4px"
  stamp: "2px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "32px"
components:
  button-primary:
    backgroundColor: "{colors.action}"
    textColor: "{colors.on-action}"
    rounded: "{rounded.control}"
    padding: "8px 16px"
    height: "44px"
  button-primary-hover:
    backgroundColor: "{colors.action-hover}"
    textColor: "{colors.on-action}"
    rounded: "{rounded.control}"
    padding: "8px 16px"
    height: "44px"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    padding: "8px 16px"
    height: "44px"
  input:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    padding: "8px 12px"
    height: "44px"
  card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.card}"
    padding: "16px"
  chip:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.chip}"
    padding: "4px 12px"
  nav-active:
    backgroundColor: "{colors.action}"
    textColor: "{colors.on-action}"
    rounded: "{rounded.control}"
    padding: "8px 16px"
---

# Design System: Thrive Randomizer

## Overview

**Creative North Star: "El taller de sellos de barrio"**

Thrive Randomizer se siente como una hoja de trabajo sobre la mesa de un taller de impresión: papel cálido, tinta cobalto y piezas que se apoyan con un relieve suave. La interfaz es luminosa y manual, no una consola nocturna. La profundidad viene de sombras de goma sobre superficies sólidas, pero cada control conserva borde, relleno y foco para que la accesibilidad no dependa de la sombra.

La dirección es de modo claro único. No hay tema oscuro ni conmutador: el uso diurno, en una mesa de cocina o una oficina con luz natural, pide superficies que reflejen poca luz y un contraste de tinta sobre papel. La tinta cobalto se reserva para acciones, foco de selección y sellos; el resto se lee como papel y lápiz.

La aplicación es una herramienta de trabajo, no una landing page. Prioriza escaneo, resultados legibles y controles de 44×44 px. La expresividad se concentra en la tipografía display, los íconos de módulo y el sello de los resultados; el resto se mantiene quieto.

**Key Characteristics:**
- Papel cálido, tinta casi negra y un único acento cobalto.
- Neumorfismo accesible: volumen con sombras exactas, nunca como única affordance.
- Display Bricolage Grotesque, cuerpo del sistema y resultados monoespaciados.
- Tarjetas de 10 px, controles de 8 px, chips de 4 px y sellos de 2 px.
- Sin degradados, sin glass y sin texto con opacidad.

## Colors

La paleta es una hoja de papel con dos tintas: una negra para leer y una cobalto para actuar. El verde y el ladrillo aparecen solo como estados semánticos o colores de datos. Los colores de datos de la ruleta y de los equipos viven centralizados en `src/lib/palette.ts`; no son tokens de interfaz y nunca se escriben en JSX.

### Primary
- **Cobalt Stamp** (`#1f4fb5`): fondo de acciones primarias, enlace activo, borde de la ficha de dado seleccionada y texto de enlaces. Alcanza 7.11:1 con Paper White.
- **Deep Cobalt** (`#173e8f`): hover de acciones; 10.2:1 con Paper White.
- **Active Cobalt** (`#102e6b`): estado presionado y bordes de máximo contraste.

### Neutral
- **Workshop Paper** (`#f3efe6`): fondo global del documento.
- **Fresh Sheet** (`#fbf8f1`): tarjetas, formularios, diálogos y barras.
- **Worn Paper** (`#f0e9dc`): hover de superficies y navegación inactiva.
- **Pressed Paper** (`#e7dfd1`): pistas hundidas, fondos de resultado y estados deshabilitados.
- **Rubber Ink** (`#221f1a`): texto principal; 15.48:1 sobre Fresh Sheet.
- **Faded Ink** (`#5b554b`): texto secundario, ayudas y metadatos; 6.96:1 sobre Fresh Sheet.
- **Pencil Edge** (`#807669`): borde de controles y separadores; 4.20:1 sobre Fresh Sheet y 3.88:1 sobre Workshop Paper.
- **Amber Registration** (`#b45309`): outline de foco; 4.73:1 sobre Fresh Sheet.
- **Red Correction** (`#a32121`) y **Green Approval** (`#1f6b47`): error y éxito; 7.08:1 y 6.09:1 sobre Fresh Sheet.

### Named Rules
**The One Cobalt Rule.** El cobalto aparece en acciones, en la ficha activa, en enlaces y en el sello de resultados. No se usa como fondo de secciones enteras ni como decoración de tarjetas.

**The Ink-on-Paper Rule.** El texto corrido usa Rubber Ink. Faded Ink se reserva para ayudas, fechas y metadatos; nunca para párrafos completos.

## Typography

**Display Font:** Bricolage Grotesque (con Segoe UI, system-ui, sans-serif)
**Body Font:** Segoe UI (con system-ui, -apple-system, sans-serif)
**Label/Mono Font:** monoespaciada del sistema (ui-monospace, SFMono-Regular, Menlo, Consolas)

**Character:** Bricolage aporta la firma manual del taller; el cuerpo del sistema mantiene la legibilidad densa de una herramienta. La monoespaciada solo aparece donde el número es el resultado, no como decoración.

### Hierarchy
- **Display** (700, 42/46 px en desktop; 32/36 px en mobile, tracking −0.02em): `h1` de cada pantalla. Una sola `h1` por página.
- **Headline** (700, 24/28 px): `h2` de sección y títulos de diálogo.
- **Title** (700, 18–20/24 px): títulos de tarjetas, equipos y resultados secundarios.
- **Body** (400, 16/25 px, máximo 65–75 caracteres por línea): texto de interfaz y ayudas.
- **Label** (600, 13/19 px): etiquetas de formulario, fechas y metadatos.
- **Result** (700, 44/48 px, cifras tabulares): número de la tirada de dados y resultados principales. Los porcentajes y pesos usan la misma mono a tamaño de cuerpo.

### Named Rules
**The Stamp Rule.** Bricolage se usa en títulos, sellos y la marca. No se usa en párrafos, etiquetas de formulario ni botones.

**The Monospace Results Rule.** La monoespaciada solo se usa para cifras de resultado, porcentajes, pesos y la marca de registro. Nunca para texto corrido.

## Layout

El área de trabajo tiene un ancho máximo de 1120 px (`workspace`) y se centra con padding de 16 px (24 px desde 640 px). En desktop desde 1024 px se divide en una columna principal flexible y una columna de historial de 280 px; en mobile el historial se convierte en una hoja inferior con un botón flotante de 44 px.

Las pantallas de sorteo comparten el mismo `workspace-grid` y el mismo ritmo vertical: 16 px entre bloques, 24 px entre secciones. Las tarjetas usan 16–24 px de padding. El header mide 56 px y la navegación se colapsa debajo de 1024 px en un panel con botón de 44×44 px.

Todos los controles interactivos tienen al menos 44×44 px. El foco es un outline de 2 px Amber Registration con offset de 2 px (`--focus-width` y `--focus-offset`); en `prefers-contrast: more` pasa a 3 px y los bordes de control a 2 px de tinta.

## Elevation & Depth

El sistema es neumórfico y híbrido: la sombra da volumen de papel de goma, pero el borde de tinta y el cambio de tono sostienen la jerarquía cuando la sombra no se percibe. Las sombras siempre se aplican sobre fondos sólidos; no hay degradados.

### Shadow Vocabulary
- **Low** (`-3px -3px 8px rgba(255, 255, 255, 0.95), 4px 4px 10px rgba(84, 72, 55, 0.14)`): botones, fichas de dado, chips y header.
- **Raised** (`-6px -6px 14px rgba(255, 255, 255, 0.96), 7px 7px 16px rgba(84, 72, 55, 0.18)`): tarjetas, formularios, panel de landing y sidebar de historial en desktop.
- **High** (`-10px -10px 24px rgba(255, 255, 255, 0.98), 14px 14px 30px rgba(84, 72, 55, 0.22)`): diálogos, menú móvil, botón flotante, ruleta y hoja móvil del historial.
- **Pressed** (`inset 4px 4px 9px rgba(84, 72, 55, 0.16), inset -4px -4px 9px rgba(255, 255, 255, 0.95)`): inputs, pistas de progreso, resultado de dados y ficha activa.

### Named Rules
**The Rubber Volume Rule.** La sombra nunca es la única señal de un control. Todo control tiene borde o relleno con contraste ≥3:1; todo foco tiene outline visible.

**The High-Contrast Fallback Rule.** Con `prefers-contrast: more`, todas las sombras pasan a `none`, los bordes de control a 2 px de Rubber Ink y el texto secundario a Rubber Ink. La geometría no cambia.

## Shapes

La forma es la de una hoja recortada a mano: esquinas apenas redondeadas, bordes de lápiz y sellos rectangulares. Las tarjetas usan 10 px; los controles, 8 px; los chips, 4 px; los sellos, 2 px. Los botones tipo píldora se reservan para acciones secundarias flotantes, como el botón de historial en mobile.

Los íconos son SVG inline de 24×24 px, trazo de 2 px, extremos rectos y un punto de tinta lleno. Cada módulo tiene su propio dibujo: dados con pips, tres líneas de ábaco, sector de ruleta con muesca, tres fichas de equipo y balanza de fiel.

## Components

### Buttons
- **Shape:** rectángulo de 8 px, altura mínima 44 px.
- **Primary:** Cobalt Stamp sobre Paper White; padding 8×16 px; sombra Low; hover Deep Cobalt; activo Pressed.
- **Ghost:** fondo transparente, borde Pencil Edge, texto Rubber Ink; hover Fresh Sheet y borde cobalto.
- **Danger:** Red Correction con Paper White; hover Red Strong.
- **Focus:** outline de 2 px Amber Registration, offset 2 px. Deshabilitado: Pressed Paper, Faded Ink, sin sombra y cursor `not-allowed`.

### Chips
- **Style:** Fresh Sheet, borde Pencil Edge, radio 4 px, texto Rubber Ink, sombra Low.
- **State:** las opciones de la ruleta muestran un punto del color de la opción; el botón de quitar mide 44×44 px y usa Faded Ink con hover Red Correction.

### Cards / Containers
- **Corner Style:** 10 px.
- **Background:** Fresh Sheet sobre Workshop Paper.
- **Shadow Strategy:** Raised en desktop; High para la hoja móvil del historial. Las tarjetas de resultado usan Low o Pressed según su función.
- **Border:** 1 px Pencil Edge.
- **Internal Padding:** 16–24 px.

### Inputs / Fields
- **Style:** Fresh Sheet, borde Pencil Edge de 1 px, radio 8 px, altura mínima 44 px, sombra Pressed.
- **Focus:** outline Amber Registration de 2 px con offset 2 px.
- **Error / Disabled:** borde Red Correction y mensaje con `role="alert"`; deshabilitado con Pressed Paper, Faded Ink y sin sombra. Los controles nativos (checkbox, select, number, color) conservan su semántica y reciben `accent-color` cobalto.

### Navigation
- **Style:** header de 56 px sobre Fresh Sheet, marca en Bricolage, enlaces de 44 px y borde inferior Pencil Edge.
- **States:** enlace activo con Cobalt Stamp y Paper White; inactivo Faded Ink; hover Fresh Sheet y Rubber Ink.
- **Mobile:** botón de 44×44 px, panel desplegable con sombra High, cierre con Escape y foco al primer enlace.

### Signature: Roulette
La ruleta usa un color de datos distinto por opción y calcula el color de etiqueta con contraste ≥4.5:1; si un color intermedio no alcanza con tinta ni con papel, lo oscurece hasta lograrlo. Las etiquetas se dibujan siempre horizontales, fuera de la rotación del disco, para que nunca queden invertidas. El puntero es Cobalt Stamp; el centro es Rubber Ink.

## Do's and Don'ts

### Do:
- **Do** usar los tokens de `src/index.css` a través de Tailwind; no escribir hexadecimales en componentes.
- **Do** mantener 4.5:1 para texto normal, 3:1 para texto grande y 3:1 para bordes de control y foco (WCAG 1.4.3 y 1.4.11).
- **Do** mantener un outline visible de 2 px Amber Registration con offset 2 px en todo control (WCAG 2.4.7).
- **Do** usar 44×44 px como mínimo de todo control interactivo.
- **Do** probar `prefers-contrast: more`: sombras `none`, bordes sólidos de 2 px y texto secundario en tinta.
- **Do** usar voseo en la copy de la interfaz y resultados.
- **Do** reservar la monoespaciada para resultados y cifras.

### Don't:
- **Don't** usar degradados en `src/` ni en el canvas.
- **Don't** usar violeta dominante, glass, backdrop blur decorativo ni texto con opacidad.
- **Don't** usar la sombra como única affordance ni quitar el borde de un control.
- **Don't** usar `text-white` ni hexadecimales sueltos en JSX: usá `text-on-action` o el token correspondiente.
- **Don't** invertir las etiquetas de la ruleta ni confiar en que un color de usuario siempre tendrá contraste.
- **Don't** cambiar la semántica nativa de checkbox, select, number o color solo por estilos.
