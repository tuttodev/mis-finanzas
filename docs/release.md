# Release

Producción se publica **solo** cuando el dueño del proyecto aprueba y mergea un PR a `main`. Vercel despliega `main` automáticamente por su integración con Git.

## Antes de pedir aprobación

1. La rama pasa `npm test`, `npm run lint` y `npm run build` (los hooks lo comprueban en cada commit y push).
2. Si la feature tiene especificación, todos sus criterios de aceptación tienen prueba y pasan.
3. La vista previa del PR en Vercel compila y la feature se revisó ahí con datos ficticios.
4. El PR describe qué cambia, enlaza la especificación y lista lo que falta comprobar a mano.

## Publicar

1. El dueño revisa el diff y la vista previa, y mergea el PR a `main`.
2. Vercel crea un único deployment de producción desde ese commit. No se despliega además por CLI.
3. Se verifica en producción la feature publicada y que el commit desplegado es el aprobado.

## Lo que un agente nunca hace

- Ejecutar `npm run deploy`, `vercel --prod` ni hacer push directo a `main`.
- Mergear un PR sin la aprobación explícita del dueño.
- Cambiar variables de entorno de producción.

## Si algo falla en producción

Usa **Instant Rollback** de Vercel para volver al deployment anterior, abre un PR con la corrección y repite este proceso. Cada error nuevo se convierte en una regla, una prueba o un documento del harness.
