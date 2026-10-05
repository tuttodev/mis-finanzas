# 001 · Comparación mensual de gastos por categoría

Estado: implementada · Pruebas: `src/modules/dashboard/domain/__tests__/category-spending-comparison.test.ts`

## Objetivo

En el dashboard, la persona ve cuánto gastó en cada categoría en el mes actual y en el mes anterior, y cuánto subió o bajó, para detectar rápido en qué está gastando más. Si gasta en varias monedas, ve una comparación por moneda, sin mezclarlas.

## Fuera de alcance

- Conversión entre monedas o un total combinado de varias monedas.
- Tablas o consultas nuevas en la base de datos: se reutiliza la consulta del dashboard.
- Cambios a la dona de "Gasto por categoría" ni a los presupuestos.
- Ventanas móviles de 30 días: se comparan meses calendario.

## Comportamiento visible

- Una sección "Gastos por categoría: este mes vs. el anterior" en el dashboard, debajo de la dona de gasto por categoría, con **un bloque por moneda**.
- Primero va el bloque de la moneda predeterminada del perfil, que siempre se muestra (aunque esté vacío). Después, un bloque por cada otra moneda que tenga gasto por categoría en alguno de los dos meses, en el orden de `Currency`. Una moneda sin gastos en ninguno de los dos meses no tiene bloque.
- El subtítulo de cada bloque muestra los dos meses (por ejemplo, "oct de 2026 vs. sept de 2026") y su moneda.
- El mes actual va del día 1 a hoy; el mes anterior es el mes calendario completo.
- Cada fila muestra la categoría, el gasto neto del mes actual, el del mes anterior y la diferencia (actual − anterior). Una diferencia positiva es más gasto y se muestra en el color de gastos; una negativa es ahorro y se muestra en el color de ingresos.
- Debajo de la diferencia se muestra el cambio porcentual frente al mes anterior solo si el gasto del mes anterior fue positivo; si no, el texto "Sin porcentaje: el mes anterior no tuvo gasto positivo".
- Dentro de cada bloque, las filas se ordenan por el gasto del mes actual de mayor a menor, luego por el del mes anterior y luego por nombre.
- Los movimientos sin categoría aparecen como una fila "Sin categoría".
- Si la moneda predeterminada no tuvo gastos en ninguno de los dos meses, su bloque muestra "No hay gastos por categoría en ninguno de los dos meses".
- Con el modo privado activo, montos, diferencias y porcentajes se ocultan.

## Dónde vive

- Reglas puras: `compareCategorySpending()` (una moneda) y `compareCategorySpendingByCurrency()` (un bloque por moneda) en `src/modules/dashboard/domain/category-spending-comparison.ts`.
- Orquestación: `getDashboard()` en `src/modules/dashboard/application/dashboard.use-cases.ts`, que agrega `categoryComparisons` (uno por moneda) a `DashboardData`.
- UI: `src/modules/dashboard/ui/category-spending-comparison.tsx`, usada en `src/app/app/page.tsx`.
- Reglas aplicadas: montos con signo, una moneda a la vez, reembolsos, transferencias y meses calendario de [docs/finance-rules.md](../../docs/finance-rules.md).

## Criterios de aceptación

- **AC-1** En el mes anterior hay un gasto de COP 150.000 y un reembolso de COP 30.000 en Comida; en el mes actual, un gasto de COP 200.000 y un reembolso de COP 50.000. La fila de Comida muestra COP 150.000 actual, COP 120.000 anterior, diferencia de COP 30.000 y +25 %.
- **AC-2** Las transferencias, los ingresos, los movimientos de cuentas en otra moneda y los de meses distintos a los dos comparados no cambian ninguna fila.
- **AC-3** Una categoría con gasto solo en el mes actual muestra COP 0 en el anterior y sin porcentaje. Una con gasto solo en el mes anterior muestra COP 0 en el actual, diferencia negativa y −100 %.
- **AC-4** Con la fecha en enero de 2027, el mes anterior es diciembre de 2026.
- **AC-5** Si los reembolsos superan los gastos de un mes, el gasto neto queda negativo y no se recorta a cero. Si el mes anterior tuvo gasto cero o negativo, no hay porcentaje.
- **AC-6** Si ningún mes tiene gastos por categoría, la comparación no tiene filas.
- **AC-7** Dos categorías distintas con el mismo nombre aparecen como dos filas separadas; los movimientos sin categoría se agrupan en "Sin categoría".
- **AC-8** Con COP como moneda predeterminada, COP 1.500.000 de Vivienda en una cuenta COP y USD 300 de Vivienda en una cuenta USD en el mes actual producen dos bloques: COP primero, con Vivienda en COP 1.500.000, y USD después, con Vivienda en USD 300. Ningún bloque suma montos de otra moneda. Una moneda sin gastos en los dos meses no aparece, salvo la predeterminada.

Cada ID de aceptación aparece en el nombre de la prueba que lo verifica.
