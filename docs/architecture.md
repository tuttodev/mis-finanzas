# Arquitectura

La app está organizada en **módulos por funcionalidad** con **puertos y adaptadores**. Cada módulo encapsula una parte del negocio y no depende de Supabase directamente: depende de interfaces de repositorio que se conectan a una implementación en un solo lugar.

## Mapa de carpetas

```
src/
├── app/                 Rutas de Next.js: páginas delgadas y route handlers (api/)
├── modules/<módulo>/
│   ├── domain/          Tipos, enums y reglas puras del negocio (+ __tests__)
│   ├── data/
│   │   ├── <x>.repository.ts       Interfaz (puerto) que usa la aplicación
│   │   └── supabase/               Adaptador: consultas, DTOs y mapeo DTO → dominio
│   ├── application/     Casos de uso (validan y orquestan) y queries de React Query (+ __tests__)
│   └── ui/              Componentes, mapas de etiquetas y enums propios de la UI del módulo
├── shared/              Lo que usan varios módulos: Currency, UI base, formateadores,
│                        QueryKey, AppRoute, AnalyticsEvent, providers
├── infrastructure/      Cliente de Supabase, enums de tablas/buckets, extracción de PDF
│   └── repositories.ts  Raíz de composición: elige el adaptador de cada repositorio
└── testing/             Repositorios en memoria y datos ficticios para pruebas
```

Módulos actuales: `accounts`, `auth`, `budgets`, `categories`, `dashboard`, `feedback`, `planning`, `profile`, `tags`, `transactions`.

## Responsabilidad de cada capa

| Capa | Contiene | No puede |
| --- | --- | --- |
| `domain/` | Tipos, enums, funciones puras con reglas y cálculos | Importar React, Next.js, Supabase ni `infrastructure/` |
| `data/` | Interfaz del repositorio y su adaptador; DTOs en `snake_case` y su mapeo | Contener validaciones ni reglas de negocio |
| `application/` | Casos de uso que validan entradas, combinan repositorios y llaman al dominio; `queryOptions` por módulo | Importar Supabase ni componentes |
| `ui/` | Componentes del módulo y etiquetas visibles (`ACCOUNT_TYPE_LABELS`, …) | Calcular reglas de negocio o consultar datos sin pasar por `application/` |
| `app/` | Páginas que componen la UI de los módulos con sus queries y casos de uso | Tener lógica propia |

Dirección de dependencias:

```
app/ · ui/  →  application/  →  domain/
                    │
                    └→ repositories (infrastructure/repositories.ts) → data/supabase (implementa data/*.repository.ts)
```

## Recorrido de una acción

Crear una cuenta:

1. `src/app/app/account-form/page.tsx` llama `createAccount({ name, type: AccountType.Savings, currency })`.
2. `modules/accounts/application/accounts.use-cases.ts` valida el nombre y llama `repositories.accounts.create(...)`.
3. `infrastructure/repositories.ts` resuelve `accounts` a `SupabaseAccountsRepository`.
4. `modules/accounts/data/supabase/supabase-accounts.repository.ts` inserta en `SupabaseTable.Accounts` y devuelve un `Account`.
5. La página invalida `[QueryKey.Accounts]` y la lista se refresca.

Leer datos sigue el mismo camino: la página usa `useQuery(accountQueries.list())`; la query llama al caso de uso y este al repositorio.

## Dónde va una feature nueva

**Si amplía un módulo existente** (por ejemplo, un cálculo nuevo del dashboard):

1. Regla pura y sus tipos en `modules/<módulo>/domain/`, con prueba en `domain/__tests__/`.
2. Si necesita datos nuevos, un método en la interfaz `data/<x>.repository.ts` y su implementación en `data/supabase/`. Reutiliza consultas existentes cuando sirvan.
3. Orquestación en `application/<módulo>.use-cases.ts` y, si se lee desde la UI, una entrada en `<módulo>.queries.ts`.
4. Componente en `modules/<módulo>/ui/` y uso en la página de `src/app/`.

**Si es un concepto nuevo** (por ejemplo, metas de ahorro), crea `modules/<nuevo-módulo>/` con las mismas cuatro capas y además:

- registra el repositorio en `Repositories` y en `createSupabaseRepositories()` de `infrastructure/repositories.ts`;
- agrega la tabla a `SupabaseTable` y la migración en `supabase/migrations/`;
- agrega su `QueryKey`, su `AppRoute` y sus `AnalyticsEvent`;
- si va en el menú, agrega la pestaña en `shared/ui/layout/bottom-nav.tsx`.

## Cómo decidir dónde va algo

- ¿Es un cálculo o una regla? → `domain/`, con prueba.
- ¿Toca la base de datos, el almacenamiento o un servicio externo? → `data/`, detrás de una interfaz.
- ¿Valida, combina varias fuentes o es algo que el usuario "hace"? → `application/`.
- ¿Es visual y solo lo usa este módulo? → `modules/<módulo>/ui/`.
- ¿Lo usan dos módulos o más? → `shared/`.
- ¿Es un valor fijo (tipo, estado, slug, ruta, tabla, evento)? → un `enum` de TypeScript.

## Convenciones

- **Enums:** `enum` de TypeScript para todo valor fijo. Los valores coinciden con lo que se guarda (`AccountType.Savings = 'savings'`); las etiquetas en español viven en mapas de `ui/`.
- **Nombres de archivo:** `kebab-case` con sufijo de rol: `*.types.ts`, `*.enum.ts`, `*.repository.ts`, `supabase-*.repository.ts`, `*.dto.ts`, `*.use-cases.ts`, `*.queries.ts`.
- **Query keys:** la raíz siempre es un `QueryKey`; invalidar la raíz refresca todas sus variantes.
- **Rutas:** `AppRoute` para páginas estáticas, `appRoutes.*` y `withSearchParams()` para páginas con ID o parámetros.
- **Errores visibles:** los casos de uso y adaptadores lanzan `Error` con un mensaje en español listo para mostrarse en un toast.
- **Moneda y redondeo:** montos en número con dos decimales (`roundCurrencyAmount`); formato con `formatCurrency(value, currency)`.
