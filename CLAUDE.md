# CLAUDE.md

Este archivo proporciona guía a Claude Code (claude.ai/code) al trabajar con código en este repositorio.

## Objetivo

El objetivo de este proyecto es la gestión y mantenimiento de activos de una empresa, sean materiales, vehñiculos o equipamiento.

Se trata únicmente de un proyecto de frontend, ya que el backend de este proyecto y los otros proyectos que se cree a partir de esta base se harán en otros repositorios mediante el consumo de una API desarrollada en Laravel.

La API usada para este proyecto está definida en:
https://empresa1.ayecore.es/api/documentation/

El stack teconológico para este proyecto es:

Frontend:

- Vue 3 (Setup composition API)
- Quasar (Quasar V2 - sin legacy code)
- Vite
- Pinia
- TypeScript

## Estado del proyecto

Lo que existe hasta ahora:

- Skills de Claude Code instaladas que definen el flujo de desarrollo (ver más abajo).
- `deploy/` — un script de despliegue (`deploy.sh`) y un `nginx.conf.example` escritos por adelantado para el stack previsto: una **SPA Quasar/Vue 3 construida con Vite**, desplegada vía `rsync`+`ssh` a un servidor con nginx, donde el frontend llama a un backend independiente en `/api/v1/...` (proxied por nginx, mismo origen, Vue Router en modo hash). Trátalos como la arquitectura objetivo una vez se scaffoldee el frontend — `deploy.sh` espera `npm ci` / `npm run build` y un directorio de salida `dist/spa` (la ruta de build SPA por defecto de Quasar).
- `notas-jcn/guia-estilo-visual-corestarter.md` — una guía de estilo visual (en español) para replicar en la UI de este proyecto una vez arranque el trabajo de frontend: tarjetas glassmorphism, paleta teal / blue-grey, tipografía Outfit+Roboto, convenciones de componentes Quasar (inputs densos, tablas compactas con cabeceras teal oscuro, ítems de navegación activos en forma de píldora). Consúltala antes de tomar cualquier decisión visual/UI; también está instalada la skill `frontend-design` para guía general de diseño de UI.

Actualiza este archivo cuando se scaffoldee código de aplicación real (framework, lenguaje, tooling, comandos de test/build).

**Nota de seguridad:** `deploy/deploy.sh` tiene actualmente una contraseña SSH y una IP de servidor hardcodeadas en texto plano como overrides de variables locales cerca del inicio del archivo (`DEPLOY_SSH_PASS`, `DEPLOY_HOST`). No repliques ese patrón — el script ya admite pasar `DEPLOY_SSH_PASS`/`DEPLOY_HOST`, etc. como variables de entorno. Adviértelo si te piden comitear o limpiar `deploy/`.

## Flujo de trabajo: desarrollo guiado por specs

Este proyecto usa un flujo spec-first mediante dos skills personalizadas (instaladas en `.claude/skills`, enlazadas simbólicamente desde `.agents/skills`, registradas en `skills-lock.json`):

- **`/spec <descripción>`** — Diseñador de specs guiado. Aclara una idea mediante bloques de preguntas (alcance, modelo de datos, integración, persistencia, UX/estados, riesgos) antes de escribir nada, y luego guarda el resultado en `specs/NN-slug.md` en estado `Draft`. Nunca escribe código ni propone implementación. Hace de 3 a 5 preguntas por bloque y no se detiene hasta poder nombrar todos los archivos que cambian, el primer/último paso ejecutable, y cómo verificar que está terminado.
- **`/spec-impl <NN-slug>`** — Implementa únicamente una spec _aprobada_. Se niega a continuar a menos que el campo de estado de la spec diga `Approved` (o un equivalente en cualquier idioma — p. ej. `Aprobado`). Al aprobarse, crea/cambia a una rama llamada `spec-NN-slug`, muestra el objetivo/alcance/plan/criterios de aceptación de la spec, y luego implementa el plan paso a paso, pausando para revisión después de cada uno. Nunca comitea automáticamente — los commits son decisión del usuario.

Implicaciones prácticas para trabajar en este repo:

- Las nuevas funcionalidades deben pasar primero por `/spec` para producir `specs/NN-slug.md`; no empieces a implementar una funcionalidad no trivial sin una spec.
- Una spec debe pasar manualmente de `Draft` a `Approved` por el usuario (no por Claude) antes de que `/spec-impl` toque código.
- El comportamiento de creación de ramas de `/spec-impl` se controla mediante `specs/.spec-config.yml` (`AutoCreateBranch: true` por defecto — crea/cambia de rama sin preguntar; `false` pide confirmación primero). Este archivo lo siembra `/spec` la primera vez que se usa y no debe sobrescribirse una vez existe.
- Las respuestas de spec e implementación deben coincidir con el idioma en el que el usuario escribió la solicitud.

Responde siempre en español.
Usa frontend-design para diseñar interfaces de usuario
