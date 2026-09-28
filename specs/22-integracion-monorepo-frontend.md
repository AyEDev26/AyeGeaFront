# SPEC 22 — Integrar este proyecto como carpeta `frontend/` del monorepo AyeCore en GitHub

> **Status:** Aprobado
> **Depends on:** SPEC 02 (scaffolding del proyecto Quasar)
> **Date:** 2026-09-24
> **Objective:** Publicar este proyecto, con su historial de commits, como carpeta `frontend/` (al mismo nivel que `backend/`) del repo `https://github.com/AyEDev26/AyeCore.git`, y dejar un procedimiento repetible para que los cambios que se sigan haciendo aquí lleguen a `frontend/` mediante Pull Request.

---

## Por qué existe esta spec

Este repo (`HomeAyeCore`) no tiene ningún `remote`: el frontend solo existe en local. El backend vive en `backend/` de un repo de GitHub, y se quiere unificar ambos en ese repo sin cambiar la forma de trabajar (specs, ramas `spec-NN-slug`, `/spec` y `/spec-impl` siguen ejecutándose aquí).

Tres hallazgos de la fase de análisis condicionan el diseño:

1. **`git subtree push` no sirve en este sentido.** Solo funciona desde el repo que contiene la carpeta `frontend/`. Como el proyecto está en la raíz de este repo, la sincronización se hace desde un clon del monorepo con `git subtree add` / `git subtree pull`, leyendo de este repo.
2. **Hay archivos versionados que no deben viajar.** `specs/`, `.agents/`, `.claude/skills/` (3 symlinks), `.vscode/extensions.json` y `skills-lock.json` están en el índice de git, aunque `.gitignore` ya excluye la mayoría (se añadieron al `.gitignore` sin llegar a hacer `git rm --cached`). `subtree` los subiría.
3. **El historial está limpio de secretos.** `deploy/` y `notas-jcn/` nunca se commitearon, y no hay ninguna versión de `deploy/deploy.sh` ni de `.env*` en los 56 commits. La contraseña SSH en texto plano de `deploy.sh` no llega a GitHub por ningún camino.

---2

## Scope

**In:**

- Comprobar el acceso al repo `https://github.com/AyEDev26/AyeCore.git` (rama base `main`, existe `backend/`, no existe `frontend/`).
- En este repo: dejar de versionar `specs/`, `.agents/`, `.claude/`, `.vscode/extensions.json` y `skills-lock.json` (`git rm --cached`, los archivos permanecen en disco), y añadir `skills-lock.json` al `.gitignore`. Historial **sin reescribir**.
- Añadir a `CLAUDE.md` una sección con el procedimiento de sincronización con el monorepo.
- Clonar AyeCore en `~/DESARROLLO/AyeCore`.
- Importar la rama `main` de este repo en `frontend/` del clon con `git subtree add` (sin `--squash`, historial preservado), sobre la rama `frontend-import`, y publicarla para abrir un Pull Request contra `main`.
- Verificar que `frontend/` compila desde su nueva ubicación (`npm ci` y `npm run build`).
- Definir y probar el procedimiento de sincronizaciones posteriores (`git subtree pull` sobre una rama `frontend-sync-YYYYMMDD` + PR). Flujo **unidireccional**: este repo → GitHub.

**Out of scope (para specs futuras):**

- Reescribir el historial (`git filter-repo`) para eliminar specs/skills de los commits antiguos.
- Publicar `specs/`, `.claude/`, `.agents/`, `deploy/` o `notas-jcn/` en GitHub.
- Subir las ramas `spec-NN-slug` a GitHub — solo `main` viaja.
- Edición de `frontend/` directamente en el monorepo y traer esos cambios de vuelta (flujo bidireccional).
- Workflows de CI/CD (GitHub Actions), `docker-compose`, README raíz, scripts raíz del monorepo o cualquier cambio fuera de `frontend/` en el repo de GitHub.
- Mover o adaptar `deploy/deploy.sh` a la nueva estructura, y limpiar la contraseña SSH hardcodeada (sigue siendo el aviso de seguridad de `CLAUDE.md`; `deploy/` permanece solo local).
- Cambiar el destino del proxy de la API (`quasar.config.ts` sigue apuntando a `https://empresa1.ayecore.es`).
- Reescribir las rutas de los commits antiguos bajo `frontend/` (limitación conocida de `subtree`, ver Decisiones).

---

## Data model

Esta spec no introduce estructuras de datos de aplicación. Fija los nombres que usa el procedimiento:

```text
Repo destino (GitHub):     https://github.com/AyEDev26/AyeCore.git
Rama base destino:         main
Prefijo en el monorepo:    frontend/        (junto a backend/)
Clon local del monorepo:   ~/DESARROLLO/AyeCore
Origen (este repo):        /Users/juancardona/DESARROLLO/HomeAyeCore  (rama main)
Rama del import inicial:   frontend-import
Ramas de sincronización:   frontend-sync-YYYYMMDD
Rama de esta spec:         spec-22-integracion-monorepo-frontend
```

Archivos que cambian **en este repo**: `.gitignore`, `CLAUDE.md` y el índice de git (entradas de `specs/`, `.agents/`, `.claude/`, `.vscode/extensions.json`, `skills-lock.json`). No se modifica nada de `src/`.

---

## Implementation plan

1. **Verificar el repo destino** (sin cambios). Comprobar con las credenciales del usuario (osxkeychain/PAT) que `git ls-remote --symref https://github.com/AyEDev26/AyeCore.git` responde. Una consulta anónima devolvió _"Repository not found"_: el repo puede ser privado o la URL tener un error. Prueba manual: la salida muestra `HEAD -> refs/heads/main`. Si falla, **parar** y resolver el acceso antes de seguir.
2. **Dejar de versionar lo que no debe viajar** (en la rama `spec-22-integracion-monorepo-frontend`): `git rm --cached -r specs .agents .claude skills-lock.json .vscode/extensions.json`, y añadir `skills-lock.json` al `.gitignore`. Prueba manual: `git ls-files specs .agents .claude .vscode skills-lock.json` no devuelve nada, los archivos siguen en disco (`ls specs/`, `ls .claude/skills`) y `git status` solo muestra las eliminaciones del índice y el cambio de `.gitignore`. Commit a decisión del usuario.
3. **Documentar el procedimiento** en una sección nueva de `CLAUDE.md`: relación con el monorepo, ruta del clon, regla de que `frontend/` en GitHub es de solo publicación, y los comandos de sincronización del paso 9. Prueba manual: la sección se lee de principio a fin sin depender de esta spec.
4. **Integrar en `main` de este repo** los pasos 2 y 3 (merge decidido por el usuario), porque `subtree` importa lo que hay en `main`. Prueba manual: `git ls-tree -r main --name-only` no contiene `specs/`, `.agents/`, `.claude/`, `skills-lock.json` ni `.vscode/`.
5. **Clonar el monorepo:** `git clone https://github.com/AyEDev26/AyeCore.git ~/DESARROLLO/AyeCore` y `git switch -c frontend-import`. Prueba manual: existe `backend/`, no existe `frontend/`, `git status` limpio.
6. **Importar con historial:** en el clon, `git subtree add --prefix=frontend /Users/juancardona/DESARROLLO/HomeAyeCore main` (sin `--squash`). Prueba manual: `ls frontend/` muestra `package.json`, `src/`, `quasar.config.ts`; `git log --oneline | head` muestra el commit de merge de subtree.
7. **Verificar el resultado en el clon:**
   - `git diff main --stat -- backend` vacío (el backend no cambió).
   - `git ls-tree -r HEAD --name-only frontend` sin `specs/`, `.agents/`, `.claude/`, `deploy/`, `notas-jcn/`, `skills-lock.json`, `.env*`.
   - `git log --all -- 'frontend/deploy' 'deploy' 'notas-jcn'` vacío.
   - `git rev-list --count HEAD` incluye los 56 commits de este repo.
   - `cd frontend && npm ci && npm run build` genera `frontend/dist/spa/index.html`, y `git status` sigue limpio (no aparecen `node_modules/` ni `dist/`).
8. **Publicar y abrir PR:** `git push -u origin frontend-import`; abrir el Pull Request `frontend-import` → `main` en GitHub y **fusionarlo con "Create a merge commit"** (no squash ni rebase). Prueba manual: tras el merge, `main` de GitHub contiene `frontend/` y `backend/`.
9. **Probar el procedimiento de sincronización:** en el clon, `git switch main && git pull`, luego `git switch -c frontend-sync-YYYYMMDD` y `git subtree pull --prefix=frontend /Users/juancardona/DESARROLLO/HomeAyeCore main -m "chore(frontend): sync desde HomeAyeCore"`. Prueba manual: responde _"Already up to date"_ (sin merges nuevos ni conflictos), lo que confirma que el PR se fusionó de forma compatible con subtree. Descartar la rama de prueba. Para una sincronización real: mismo comando tras haber integrado cambios en `main` de este repo, `git push -u origin frontend-sync-YYYYMMDD` y PR con "Create a merge commit".

---

## Acceptance criteria

- [ ] `git ls-remote https://github.com/AyEDev26/AyeCore.git` responde con las credenciales del usuario y la rama por defecto es `main`.
- [ ] En este repo, `git ls-files specs .agents .claude .vscode skills-lock.json` no devuelve nada, y esos archivos siguen existiendo en disco.
- [ ] `.gitignore` incluye `skills-lock.json` y `git status` no muestra archivos sin seguimiento tras el `git rm --cached`.
- [ ] `git log` de este repo conserva los mismos 56 commits originales (historial no reescrito, hashes idénticos).
- [ ] `CLAUDE.md` contiene la sección del procedimiento de sincronización con la ruta del clon y los comandos.
- [ ] Existe `~/DESARROLLO/AyeCore` con remote `origin` apuntando a `https://github.com/AyEDev26/AyeCore.git`.
- [ ] En la rama `frontend-import`, `frontend/` contiene `package.json`, `src/`, `quasar.config.ts` y `CLAUDE.md`, y `backend/` no tiene cambios.
- [ ] `frontend/` no contiene `specs/`, `.agents/`, `.claude/`, `deploy/`, `notas-jcn/`, `skills-lock.json` ni ningún `.env*`.
- [ ] Ningún commit del historial publicado toca `deploy/` ni `notas-jcn/` (`git log --all -- deploy notas-jcn` vacío).
- [ ] El historial de `frontend-import` incluye los 56 commits de este repo.
- [ ] Desde `frontend/`, `npm ci` y `npm run build` terminan sin errores y generan `frontend/dist/spa/index.html`.
- [ ] Tras `build`, `git status` del clon está limpio (`node_modules/` y `dist/` ignorados).
- [ ] El PR `frontend-import` → `main` se fusiona con merge commit, y `main` de GitHub contiene `backend/` y `frontend/`.
- [ ] `git subtree pull --prefix=frontend /Users/juancardona/DESARROLLO/HomeAyeCore main` en el clon responde _"Already up to date"_ tras el merge del PR.
- [ ] Este repo sigue funcionando igual: `npm run build` y `npm run lint` terminan sin errores en `HomeAyeCore`.

---

## Decisions

- **Sí:** este repo sigue siendo la fuente y GitHub el destino de publicación. Es lo que el usuario pidió ("seguir trabajando en mi proyecto") y mantiene el flujo `/spec` → `/spec-impl` sin cambios.
- **Sí:** `git subtree add` / `git subtree pull` desde un clon del monorepo. Viene con git (2.55 instalado), sin dependencias extra, y permite repetir la sincronización.
- **No:** `git subtree push` desde este repo. No aplica: solo funciona cuando el prefijo ya existe en el repo desde el que se ejecuta.
- **No:** `git filter-repo --to-subdirectory-filter frontend`. Reescribiría las rutas de los commits (mejor `blame`/`log` por ruta), pero requiere instalar la herramienta y repetir el filtrado en cada sincronización; más frágil. **Consecuencia aceptada:** con `subtree`, los commits importados conservan sus rutas originales (sin prefijo `frontend/`), así que en GitHub `git log frontend/src/x` solo muestra los merges. El historial completo sigue disponible en el propio commit importado.
- **Sí:** preservar historial (sin `--squash`), por trazabilidad de las specs y sus features.
- **Sí:** `git rm --cached` con historial intacto para lo que no debe viajar. No hay secretos en esos commits antiguos, y reescribir cambiaría todos los hashes y rompería la sincronización.
- **Aceptado:** `specs/`, `.agents/`, `.claude/` y `.vscode/extensions.json` seguirán apareciendo en los **commits antiguos** dentro de GitHub, pero no en la punta de `frontend/`. Se acepta porque no contienen información sensible.
- **Sí:** `CLAUDE.md` viaja (documentación del proyecto). `skills-lock.json` no viaja: describe skills que tampoco viajan.
- **Sí:** solo `main` se publica. Las ramas `spec-NN-slug` ya están integradas y no aportan al repo compartido.
- **Sí:** rama + Pull Request en vez de push directo a `main`, porque `main` es compartido con el backend.
- **Sí:** el PR se fusiona con **merge commit**. Squash o rebase reescriben los commits importados y `subtree pull` perdería la base común.
- **Sí:** flujo unidireccional; `frontend/` en GitHub es de solo publicación. Evita conflictos en los `pull`.
- **Sí:** clon en `~/DESARROLLO/AyeCore`, fuera de este repo, para no anidar repositorios.

---

## Risks

| Riesgo                                                                                                                                                                                                            | Mitigación                                                                                                                                                                                                |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| El repo devuelve _"not found"_ sin credenciales (privado, sin acceso del usuario, o URL errónea).                                                                                                                 | Paso 1 lo verifica antes de tocar nada. Si falla: autenticar (PAT en osxkeychain o SSH) o corregir la URL.                                                                                                |
| El PR se fusiona con squash/rebase (o una regla de la rama lo fuerza) y se pierde la base común para `subtree`.                                                                                                   | Elegir "Create a merge commit". Si el repo lo prohíbe, replantear el mecanismo (spec nueva); el paso 9 lo detecta pronto porque el `pull` fallaría o duplicaría el historial.                             |
| Ya existe algún `package.json`, `pnpm-workspace.yaml` o tooling en la raíz del monorepo que interfiera con `frontend/` (este repo tiene su propio `pnpm-workspace.yaml`, aunque usa `npm` y `package-lock.json`). | El paso 7 ejecuta `npm ci` y `npm run build` dentro de `frontend/`. Si falla por interferencia con la raíz, se documenta el ajuste sin tocar la raíz del monorepo (fuera de alcance) y se abre otra spec. |
| `.gitignore` de `frontend/` no cubre `node_modules/`, `dist/` o `.quasar/` dentro del monorepo.                                                                                                                   | El `.gitignore` de este repo viaja como `frontend/.gitignore` y sus reglas se aplican en esa carpeta; el paso 7 comprueba que `git status` queda limpio tras el build.                                    |
| Tras `git rm --cached`, cambiar a una rama `spec-NN` antigua puede fallar ("untracked working tree files would be overwritten") porque en ella esos archivos siguen versionados.                                  | Esas ramas ya están integradas y no se necesitan. Si hiciera falta, usar `git stash -u` o un `git worktree` aparte.                                                                                       |
| Se sincroniza sin haber integrado antes en `main` de este repo, y se publica un estado a medias.                                                                                                                  | `subtree pull` lee `main` (no la rama de trabajo). El procedimiento de `CLAUDE.md` indica integrar en `main` antes de sincronizar.                                                                        |
| Alguien edita `frontend/` directamente en GitHub y el siguiente `pull` genera conflictos.                                                                                                                         | Regla de solo publicación documentada en `CLAUDE.md`. Si ocurre, resolver el conflicto en el clon durante el `pull`.                                                                                      |

---

## What is **not** in this spec

- Reescritura del historial ni eliminación de specs/skills de commits antiguos.
- Publicación de `specs/`, `.claude/`, `.agents/`, `deploy/` o `notas-jcn/`.
- Subida de las ramas `spec-NN-slug`.
- Edición bidireccional entre este repo y `frontend/` en GitHub.
- CI/CD, `docker-compose`, README raíz o cualquier cambio fuera de `frontend/` en el repo de GitHub.
- Traslado de `deploy/deploy.sh` y limpieza de su contraseña SSH.
- Cambio del destino del proxy de la API.
- Rutas de commits antiguos reescritas bajo `frontend/`.

Cada uno de estos, si se necesita, va en su propia spec.
