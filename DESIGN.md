---
name: Thrive Randomizer
description: Suite de sorteos rápidos con un relieve neumórfico de papel cálido, tinta cobalto y sellos de goma.
colors:
  canvas: "#ece6da"
  surface: "#ece6da"
  surface-hover: "#e5ded0"
  surface-sunken: "#e2dacb"
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
  error-active: "#5c1111"
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
  card: "24px"
  control: "14px"
  chip: "8px"
  stamp: "4px"
  pill: "999px"
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
    rounded: "{rounded.pill}"
    padding: "8px 16px"
    height: "44px"
  button-primary-hover:
    backgroundColor: "{colors.action-hover}"
    textColor: "{colors.on-action}"
    rounded: "{rounded.pill}"
    padding: "8px 16px"
    height: "44px"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    rounded: "{rounded.pill}"
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
    rounded: "{rounded.pill}"
    padding: "8px 16px"
---

# Design System: Thrive Randomizer

## Overview

**Creative North Star: "El taller de sellos de barrio"**

Thrive Randomizer se siente como una pieza de papel de goma sobre la mesa de un taller de impresión: un solo material cálido, relieve amplio y tinta cobalto para actuar. La página y las tarjetas comparten el mismo tono; la profundidad aparece por dos sombras opuestas, una luz arriba a la izquierda y una sombra abajo a la derecha. El resultado es táctil, luminoso y manual, no una consola nocturna.

La dirección es de modo claro único. No hay tema oscuro ni conmutador: el uso diurno pide superficies que reflejen poca luz y un contraste de tinta sobre papel. La tinta cobalto se reserva para acciones, foco de selección y sellos; el resto se lee como papel y lápiz.

La aplicación es una herramienta de trabajo, no una landing page. Prioriza escaneo, resultados legibles y controles de 44×44 px. La expresividad se concentra en la tipografía display, los íconos de módulo y el relieve de los contenedores; el resto se mantiene quieto.

**Key Characteristics:**
- Un solo material: fondo y superficies comparten `#ece6da`.
- Neumorfismo de relieve marcado: sombras amplias y suaves, nunca como única affordance.
- Tarjetas de 24 px, controles de 14 px, chips de 8 px y acciones en píldora.
- Contenedores sin borde en reposo; los controles conservan borde o relleno de al menos 3:1.
- Display Bricolage Grotesque, cuerpo del sistema y resultados monoespaciados.
- Sin degradados, sin glass y sin texto con opacidad.

## Colors

La paleta es un solo papel cálido con dos tintas: una casi negra para leer y una cobalto para actuar. El verde y el ladrillo aparecen solo como estados semánticos o colores de datos. Los colores de datos de la ruleta y de los equipos viven centralizados en `src/lib/palette.ts`; no son tokens de interfaz y nunca se escriben en JSX.

### Primary
- **Cobalt Stamp** (`#1f4fb5`): fondo de acciones primarias, enlace activo, borde de la ficha de dado seleccionada y texto de enlaces. Alcanza 7.11:1 con Paper White.
- **Deep Cobalt** (`#173e8f`): hover de acciones; 9.53:1 con Paper White.
- **Active Cobalt** (`#102e6b`): estado presionado; 12.45:1 con Paper White.

### Neutral
- **Workshop Paper** (`#ece6da`): fondo global y superficie de tarjetas, formularios, diálogos y barras. Es el único material visible en reposo.
- **Worn Paper** (`#e5ded0`): hover de superficies, navegación inactiva y estados de apoyo.
- **Pressed Paper** (`#e2dacb`): pistas hundidas, fondos de resultado y estados deshabilitados.
- **Rubber Ink** (`#221f1a`): texto principal; 13.21:1 sobre Workshop Paper.
- **Faded Ink** (`#5b554b`): texto secundario, ayudas y metadatos; 5.94:1 sobre Workshop Paper y 5.31:1 sobre Pressed Paper.
- **Pencil Edge** (`#807669`): borde de controles; 3.59:1 sobre Workshop Paper y 3.21:1 sobre Pressed Paper.
- **Amber Registration** (`#b45309`): outline de foco; 4.04:1 sobre Workshop Paper.
- **Red Correction** (`#a32121`) y **Green Approval** (`#1f6b47`): error y éxito; 6.04:1 y 5.20:1 sobre Workshop Paper.
- **Support:** `--color-scrim` para el velo de diálogos, `--color-action-soft` para fondos de apoyo y `--color-warning` para avisos; no son colores de texto ni de control en la interfaz actual.

### Contrast Table

Todos los pares se recalcularon con luminancia relativa WCAG sobre el nuevo material `#ece6da`.

| Primer plano | Fondo | Ratio | Uso |
|---|---|---:|---|
| Rubber Ink `#221f1a` | Workshop Paper `#ece6da` | 13.21:1 | Texto principal |
| Faded Ink `#5b554b` | Workshop Paper `#ece6da` | 5.94:1 | Texto secundario |
| Cobalt Stamp `#1f4fb5` | Workshop Paper `#ece6da` | 5.94:1 | Enlaces y texto de acción |
| Amber Registration `#b45309` | Workshop Paper `#ece6da` | 4.04:1 | Foco (no texto) |
| Pencil Edge `#807669` | Workshop Paper `#ece6da` | 3.59:1 | Borde de control |
| Red Correction `#a32121` | Workshop Paper `#ece6da` | 6.04:1 | Error |
| Green Approval `#1f6b47` | Workshop Paper `#ece6da` | 5.20:1 | Éxito |
| Faded Ink `#5b554b` | Pressed Paper `#e2dacb` | 5.31:1 | Deshabilitado |
| Pencil Edge `#807669` | Pressed Paper `#e2dacb` | 3.21:1 | Borde de control hundido |
| Paper White `#f8fbff` | Cobalt Stamp `#1f4fb5` | 7.11:1 | Texto de acción |
| Paper White `#f8fbff` | Deep Cobalt `#173e8f` | 9.53:1 | Hover de acción |
| Paper White `#f8fbff` | Active Cobalt `#102e6b` | 12.45:1 | Acción presionada |
| Paper White `#f8fbff` | Red Correction `#a32121` | 7.23:1 | Acción destructiva |
| Paper White `#f8fbff` | Red Strong `#7f1d1d` | 9.65:1 | Hover destructivo |
| Paper White `#f8fbff` | Red Active `#5c1111` | 13.11:1 | Destructivo presionado |
| Paper White `#f8fbff` | Green Approval `#1f6b47` | 6.22:1 | Confirmación |

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

Las pantallas de sorteo comparten el mismo `workspace-grid` y el mismo ritmo vertical: 12–16 px entre bloques, 24 px entre secciones. Las tarjetas usan 16–24 px de padding. El header mide 56 px, flota con sombra Low y la navegación se colapsa debajo de 1024 px en un panel con botón de 44×44 px.

Todos los controles interactivos tienen al menos 44×44 px. El foco es un outline de 2 px Amber Registration con offset de 2 px (`--focus-width` y `--focus-offset`); en `prefers-contrast: more` pasa a 3 px y los bordes de control a 2 px de tinta.

## Elevation & Depth

El sistema es neumórfico de un solo material: la página y las tarjetas comparten el mismo tono, y el volumen se construye con dos sombras opuestas sobre un fondo sólido. Los contenedores no llevan borde en reposo; la sombra y el cambio de tono bastan. Los controles sí conservan borde o relleno de 3:1 para que la interacción no dependa de la sombra.

### Shadow Vocabulary
- **Flat** (`none`): superficies que no deben competir, como el fondo de página.
- **Low** (`-4px -4px 10px rgba(255, 255, 255, 0.85), 4px 4px 10px rgba(84, 72, 55, 0.18)`): header, footer, chips, botones secundarios y fichas de dado en reposo.
- **Raised** (`-8px -8px 18px rgba(255, 255, 255, 0.9), 8px 8px 18px rgba(84, 72, 55, 0.22)`): tarjetas, formularios, hero de landing, historial, resultados en tarjeta y acciones primarias.
- **High** (`-14px -14px 28px rgba(255, 255, 255, 0.95), 14px 14px 30px rgba(84, 72, 55, 0.26)`): diálogos, menú móvil, botón flotante, ruleta y hoja móvil del historial.
- **Pressed** (`inset 6px 6px 12px rgba(84, 72, 55, 0.22), inset -6px -6px 12px rgba(255, 255, 255, 0.9)`): inputs, selects, pistas de progreso, resultado de dados y ficha activa.
- **Arrow** (`0 3px 6px rgba(34, 31, 26, 0.28)`): sombra corta del puntero triangular de la ruleta.

### Named Rules
**The Rubber Volume Rule.** La sombra nunca es la única señal de un control. Todo control tiene borde o relleno con contraste ≥3:1; todo foco tiene outline visible. Los contenedores pueden perder el borde porque no son componentes interactivos.

**The High-Contrast Fallback Rule.** Con `prefers-contrast: more`, todas las sombras pasan a `none`, los controles y los contenedores `.panel` reciben borde sólido de 2 px Rubber Ink y el texto secundario pasa a Rubber Ink. La geometría no cambia.

## Shapes

La forma es la de una pieza de goma recortada: esquinas generosas, bordes suaves y acciones en píldora. Las tarjetas usan 24 px; los controles, 14 px; los chips, 8 px; los sellos, 4 px; las acciones y los interruptores, píldora completa.

Los contenedores (tarjetas, paneles, secciones e historial) no llevan borde en reposo. Los controles (inputs, selects, textareas, chips, botones fantasma, summary y fichas de dado) conservan borde de 1 px Pencil Edge o relleno cobalto. En alto contraste, `.panel` recupera un borde de 2 px.

Los íconos son SVG inline de 24×24 px, trazo de 2 px, extremos rectos y un punto de tinta lleno. Cada módulo tiene su propio dibujo: dados con pips, tres líneas de ábaco, sector de ruleta con muesca, tres fichas de equipo y balanza de fiel.

## Components

### Buttons
- **Shape:** píldora, altura mínima 44 px.
- **Primary:** Cobalt Stamp sobre Paper White; padding 8×16 px; sombra Raised; hover Deep Cobalt; activo Active Cobalt y Pressed.
- **Ghost:** fondo transparente, borde Pencil Edge, texto Rubber Ink; sombra Low; hover Worn Paper y borde cobalto; activo Pressed.
- **Danger:** Red Correction con Paper White; sombra Raised; hover Red Strong; activo Red Active y Pressed.
- **Focus:** outline de 2 px Amber Registration, offset 2 px. Deshabilitado: Pressed Paper, Faded Ink, sin sombra y cursor `not-allowed`.

### Chips
- **Style:** Workshop Paper, borde Pencil Edge, radio 8 px, texto Rubber Ink, sombra Low.
- **State:** las opciones de la ruleta muestran un punto del color de la opción; el botón de quitar mide 44×44 px y usa Faded Ink con hover Red Correction.

### Cards / Containers
- **Corner Style:** 24 px.
- **Background:** Workshop Paper sobre Workshop Paper; el mismo material.
- **Shadow Strategy:** Raised para tarjetas y formularios; Low para filas y chips; High para overlays; Pressed para resultados y estados hundidos.
- **Border:** ninguno en reposo. `.panel` recupera 2 px Rubber Ink con `prefers-contrast: more`.
- **Internal Padding:** 16–24 px.

### Inputs / Fields
- **Style:** Workshop Paper, borde Pencil Edge de 1 px, radio 14 px, altura mínima 44 px, sombra Pressed.
- **Focus:** outline Amber Registration de 2 px con offset 2 px.
- **Error / Disabled:** borde Red Correction y mensaje con `role="alert"`; deshabilitado con Pressed Paper, Faded Ink y sin sombra. Los controles nativos (checkbox, select, number, color) conservan su semántica y reciben `accent-color` cobalto.

### Navigation
- **Style:** header de 56 px sobre Workshop Paper, marca en Bricolage, enlaces de 44 px, sin borde inferior y con sombra Low.
- **States:** enlace activo con Cobalt Stamp, Paper White y sombra Raised; inactivo Faded Ink; hover Worn Paper y Rubber Ink.
- **Mobile:** botón de 44×44 px en píldora, panel desplegable con sombra High, cierre con Escape y foco al primer enlace.

### Signature: Roulette
La ruleta usa un color de datos distinto por opción y calcula el color de etiqueta con contraste ≥4.5:1; si un color intermedio no alcanza con tinta ni con papel, lo oscurece hasta lograrlo. Las etiquetas se dibujan siempre horizontales, fuera de la rotación del disco, para que nunca queden invertidas. El disco y el puntero viven sobre el mismo material; el centro es Rubber Ink. En mobile, el alta de opciones es un `details` plegable y la acción “Girar ruleta” queda en el primer viewport.

## Do's and Don'ts

### Do:
- **Do** usar los tokens de `src/index.css` a través de Tailwind; no escribir hexadecimales en componentes.
- **Do** mantener un solo material para fondo y contenedores; el relieve se construye con `--shadow-low`, `--shadow-raised`, `--shadow-high` y `--shadow-pressed`.
- **Do** mantener 4.5:1 para texto normal, 3:1 para texto grande y 3:1 para bordes de control y foco (WCAG 1.4.3 y 1.4.11).
- **Do** mantener un outline visible de 2 px Amber Registration con offset 2 px en todo control (WCAG 2.4.7).
- **Do** usar 44×44 px como mínimo de todo control interactivo.
- **Do** probar `prefers-contrast: more`: sombras `none`, bordes sólidos de 2 px en controles y `.panel`, y texto secundario en tinta.
- **Do** usar voseo en la copy de la interfaz y resultados.
- **Do** reservar la monoespaciada para resultados y cifras.

### Don't:
- **Don't** usar degradados en `src/` ni en el canvas.
- **Don't** usar violeta dominante, glass, backdrop blur decorativo ni texto con opacidad.
- **Don't** poner borde a tarjetas o paneles en reposo: el volumen lo da la sombra; el borde se reserva a controles y alto contraste.
- **Don't** usar la sombra como única affordance ni quitar el borde de un control.
- **Don't** usar `text-white` ni hexadecimales sueltos en JSX: usá `text-on-action` o el token correspondiente.
- **Don't** invertir las etiquetas de la ruleta ni confiar en que un color de usuario siempre tendrá contraste.
- **Don't** cambiar la semántica nativa de checkbox, select, number o color solo por estilos.
