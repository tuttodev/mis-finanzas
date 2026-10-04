# Pruebas

`npm test` corre con [tsx](https://tsx.is) todos los archivos `src/**/__tests__/*.test.{ts,mjs}`. Usa `node:test` y `node:assert/strict`; no hay que registrar las pruebas en ningún lado.

## Dónde van

Junto al código que prueban, en una carpeta `__tests__/` de la misma capa:

```
src/modules/budgets/domain/budget-progress.ts
src/modules/budgets/domain/__tests__/budget-progress.test.ts
```

## Qué se prueba

| Prioridad | Qué | Dónde | Cómo |
| --- | --- | --- | --- |
| Siempre | Reglas y cálculos del dominio | `modules/*/domain/__tests__/` | Datos ficticios de entrada y resultado esperado; sin red ni base de datos |
| Siempre que haya lógica | Casos de uso que validan o combinan repositorios | `modules/*/application/__tests__/` | Con repositorios en memoria (ver abajo) |
| Cuando el mapeo no es trivial | Conversión DTO ↔ dominio de un adaptador | `modules/*/data/supabase/__tests__/` | Una fila con formato de Supabase y el objeto de dominio esperado |
| Utilidades compartidas | Formateadores y helpers | `shared/**/__tests__/` | Igual que el dominio |

No se escriben pruebas unitarias para componentes ni páginas: no tienen lógica y se validan en la vista previa.

## Casos de uso con repositorios en memoria

`setupInMemoryRepositories()` (en `src/testing/`) conecta repositorios en memoria en la raíz de composición y te los devuelve para sembrar datos e inspeccionarlos. Los repositorios que no implementa fallan con un mensaje claro si un caso de uso los usa.

```ts
import { setupInMemoryRepositories } from '@/testing/in-memory-repositories';
import { anAccount } from '@/testing/fixtures';

test('a transfer creates two opposite movements', async () => {
  const repos = setupInMemoryRepositories();
  await createTransfer({ fromAccount: anAccount({ id: 'a' }), toAccount: anAccount({ id: 'b' }), amount: 300_000, date: '2026-10-03', description: 'Ahorro' });
  assert.equal(repos.transactions.transactions.length, 2);
});
```

Llama `setupInMemoryRepositories()` al inicio de **cada** prueba para empezar desde cero. Si un caso de uso necesita un repositorio que aún no tiene versión en memoria, créala en `src/testing/` implementando la interfaz del módulo.

## Reglas

1. Toda función nueva en `domain/` lleva su prueba.
2. Todo caso de uso con validaciones o con más de un repositorio lleva su prueba.
3. En una feature con especificación, cada criterio de aceptación (`AC-1`, `AC-2`, …) aparece en el nombre de la prueba que lo verifica.
4. Prueba la regla de negocio, no la implementación: compara resultados, no llamadas internas.
5. Usa datos ficticios (`src/testing/fixtures.ts`); nunca datos reales.
6. Una prueba que falla antes de implementar la feature es la señal esperada en SDD; no la borres ni la desactives para avanzar.
