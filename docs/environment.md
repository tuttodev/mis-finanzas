# Entorno

## Requisitos

- Node.js 20.9 o superior (lo exige Next.js 16).
- Un proyecto de Supabase. Para desarrollo usa uno distinto al de producción siempre que puedas.

## Configuración local

```bash
npm install                 # instala dependencias y activa los git hooks (.githooks/)
cp .env.example .env.local  # y completa los valores
npm run dev                 # http://localhost:322
```

| Variable | Para qué | ¿Obligatoria? |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | URL del proyecto de Supabase | Sí |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Llave pública (anon / publishable) de Supabase | Sí |
| `NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN`, `NEXT_PUBLIC_POSTHOG_HOST` | Analítica de producto | No |
| `NEXT_PUBLIC_GA_MEASUREMENT_ID` | Google Analytics | No |
| `NEXT_PUBLIC_SITE_URL` | URL canónica para SEO | No |

Todas las variables `NEXT_PUBLIC_*` llegan al navegador: nunca pongas ahí una llave `service_role` ni otro secreto. `.env.local` está ignorado por Git; no lo subas.

## Base de datos

- El esquema vive en `supabase/migrations/`. Un cambio de esquema es una migración nueva, nunca una edición de una migración existente.
- Las pruebas SQL de políticas (RLS) están en `supabase/tests/`.
- Las políticas RLS son las que protegen los datos de cada usuario; la llave pública no es un secreto.

## Vistas previas (Vercel)

Cada PR genera un deployment de vista previa. Para que compile y funcione, las variables de Supabase deben existir en el entorno **Preview** de Vercel sin restringirlas a una rama. Revisa las features nuevas en la vista previa con datos ficticios y sin exponer saldos reales en capturas.
