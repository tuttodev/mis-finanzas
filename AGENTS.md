# Jireh Finanzas · Mapa para agentes

Jireh Finanzas es una app de finanzas personales y familiares (Next.js App Router + Supabase) para manejar cuentas, transacciones, presupuestos, categorías, etiquetas y el plan mensual. Este archivo es un mapa: lee el documento enlazado antes de tocar esa área.

## Antes de cambiar código

| Si vas a… | Lee primero |
| --- | --- |
| Crear o mover cualquier archivo | [Arquitectura](docs/architecture.md) |
| Tocar dinero, saldos, presupuestos o el plan | [Reglas financieras](docs/finance-rules.md) |
| Escribir o cambiar pruebas | [Pruebas](docs/testing.md) |
| Construir una feature nueva | [Especificaciones](specs/) — empieza desde [specs/_template.md](specs/_template.md) |
| Configurar el entorno o una vista previa | [Entorno](docs/environment.md) |
| Publicar | [Release](docs/release.md) |

## Rutas clave

- Rutas y páginas: `src/app/` (el dashboard es `src/app/app/page.tsx`).
- Funcionalidades: `src/modules/<módulo>/{domain,data,application,ui}`.
- Composición de repositorios: `src/infrastructure/repositories.ts`.
- Enums compartidos: `src/shared/domain`, `src/shared/navigation`, `src/shared/query`, `src/shared/analytics`.
- Repositorios en memoria para pruebas: `src/testing/`.
- Esquema de base de datos: `supabase/migrations/`.

## Reglas que no se negocian

1. **Enums de TypeScript para todo valor fijo** (tipos, estados, slugs, rutas, query keys, tablas, eventos). Nada de strings sueltos en componentes ni en otras capas. Los textos que ve el usuario viven en mapas de etiquetas dentro de `ui/`.
2. **Supabase solo en `src/infrastructure/` y `src/modules/*/data/supabase/`.** La UI y los casos de uso hablan con interfaces de repositorio.
3. **La lógica de negocio va en `domain/` con su prueba.** Nunca calcules totales dentro de JSX.
4. **Una moneda a la vez.** Nunca sumes COP con USD (ni ninguna otra pareja) sin una conversión explícita.
5. **Cada feature es una feature real del producto**, con su especificación en `specs/`.
6. **Nunca uses datos reales** de usuarios ni credenciales en pruebas, capturas o commits.

## Cómo comprobar tu trabajo

```bash
npm install        # también activa los git hooks
npm test           # pruebas de dominio y casos de uso
npm run lint
npm run build
npm run dev        # http://localhost:322
```

Una tarea está terminada solo cuando `npm test`, `npm run lint` y `npm run build` pasan. Los hooks de `.githooks/` lo hacen cumplir en cada commit y push; no los saltes con `--no-verify`.

## Límite de publicación

Producción se publica únicamente cuando el dueño del proyecto aprueba y mergea un PR a `main`. No ejecutes `npm run deploy` ni `vercel --prod`. Sigue [docs/release.md](docs/release.md).
