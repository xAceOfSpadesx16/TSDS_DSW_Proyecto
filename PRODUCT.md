# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Público general que necesita hacer un sorteo rápido, sin registrarse. Incluye personas que organizan equipos, eligen ganadores, giran una ruleta o tiran dados en contextos cotidianos, grupales o de aula. No hay un nicho único confirmado. El registro es opcional y no debe ser un requisito para completar un sorteo.

Audiencia secundaria: docentes y evaluadores de la asignatura Diseño de Aplicativos Web, que revisan accesibilidad y semántica.

## Product Purpose

Thrive Randomizer reúne cinco herramientas de aleatorización (equipos, sorteo con pesos, ruleta, dados y números) en una sola aplicación web en español. Existe para resolver una decisión o un reparto de forma rápida, comprensible y confiable. El éxito significa que una persona puede completar un sorteo sin cuenta, entender por qué el resultado es válido y, si quiere, conservar el historial iniciando sesión. También debe sentirse lo bastante lúdico como para volver a usarlo.

## Positioning

Una suite de cinco herramientas en una sola interfaz, usable de punta a punta sin registro, con historial sincronizado como capa opcional. Se diferencia de una app de un solo dado o una sola ruleta por cubrir equipos, pesos, ruleta, dados y números con un lenguaje y un historial comunes.

## Operating Context

- Uso en navegador, en escritorio y en móvil, para sorteos puntuales y dinámicas de grupo.
- El flujo principal debe funcionar sin una cuenta; el backend agrega login, registro e historial.
- Proyecto académico de Diseño de Aplicativos Web. La evaluación incluye accesibilidad y semántica; esas cualidades no deben degradarse.
- La integración con el backend (login, registro e historiales) debe mantenerse por requisito de la asignatura.
- El historial de invitado se persiste en `localStorage` (máximo 100 entradas) y los sorteos que no llegan al backend quedan como pendientes persistidos por usuario, también en `localStorage`.

## Capabilities and Constraints

- Cinco módulos: Generador de Equipos, Sorteo con Pesos, Ruleta de Decisiones, Dados RPG y Números Aleatorios.
- Autenticación JWT opcional, registro, historial por usuario y sincronización con backend Laravel.
- Los sorteos funcionan sin sesión; el historial de invitado vive en `localStorage`, está acotado a 100 entradas y se importa a la cuenta al iniciar sesión. Los pendientes de sincronización también se persisten para sobrevivir a una recarga.
- Stack actual: Vite + React 18 + TypeScript, Tailwind, Zustand, React Router; backend Laravel 12.
- Interfaz en español, con voseo como tono confirmado.
- No hay una restricción visual confirmada ni un compromiso de conservar todos los features actuales; el estado actual es evidencia, no una prohibición de cambio.
- La accesibilidad y la semántica son requisitos de evaluación, no un extra.

## Brand Commitments

- Nombre: Thrive Randomizer.
- Idioma: español.
- Voz: voseo, cercana y lúdica, no corporativa.
- No se confirmaron logotipos, paleta, tipografía ni otros activos de marca como compromisos vinculantes.

## Evidence on Hand

- Aplicación funcional con cinco módulos, autenticación JWT, historial local y sincronizado, y persistencia en `localStorage` del historial de invitado y de los sorteos pendientes.
- Suite de tests actual: **94** backend, **398** frontend (40 archivos) y **48** E2E de Playwright; el type check del frontend es `tsc -b`.
- Documentación técnica en `Frontend/README.md` y `design.md`.
- No hay testimonios, clientes, métricas de uso, casos de estudio ni contenido de marketing real. No inventarlos.

## Product Principles

1. El sorteo primero: toda herramienta debe completarse sin cuenta; el registro es una mejora, nunca una puerta.
2. La equidad debe ser visible: si una regla no se puede cumplir, decirlo; nunca devolver un resultado que la contradiga en silencio.
3. Un solo lenguaje: español con voseo, términos consistentes y resultados explicables.
4. La accesibilidad y la semántica son parte del producto, no una capa de pulido.
5. El historial acompaña al sorteo: conserva lo importante sin convertirse en el centro ni en un requisito.

## Accessibility & Inclusion

- Requisito académico explícito: accesibilidad y semántica evaluadas; no deben quedar degradadas.
- El flujo principal debe poder completarse con teclado y con tecnologías de asistencia.
- El producto debe funcionar en móvil y en escritorio sin depender de un puntero.
- No se confirmaron estándares formales adicionales (por ejemplo, WCAG 2.2 AA) ni auditorías externas.
