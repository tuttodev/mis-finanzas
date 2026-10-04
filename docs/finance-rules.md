# Reglas financieras

Estas reglas aplican a toda la app. Si una feature necesita romper alguna, la especificación debe decirlo explícitamente.

## Montos y monedas

- Cada transacción guarda un **monto con signo**: los gastos son negativos; los ingresos, reembolsos y la entrada de una transferencia son positivos.
- Los montos se redondean a dos decimales con `roundCurrencyAmount` antes de guardarse o compararse.
- Cada cuenta tiene una sola moneda (`Currency`). **Nunca se suman montos de monedas distintas** sin una conversión explícita: los totales se calculan por moneda.
- El usuario tiene una moneda predeterminada (`profile.defaultCurrency`, por defecto `Currency.COP`); los reportes muestran una moneda a la vez.

## Tipos de movimiento

| Movimiento | Cómo se reconoce | ¿Cuenta como ingreso? | ¿Cuenta como gasto? |
| --- | --- | --- | --- |
| Gasto | `kind = Regular`, monto negativo | No | Sí, por su valor absoluto |
| Ingreso | `kind = Regular`, monto positivo, sin `transferId` | Sí | No |
| Reembolso | `kind = Refund`, monto positivo, `relatedTransactionId` apunta al gasto | No | Resta al gasto de su categoría y su ciclo |
| Transferencia | Dos movimientos con el mismo `transferId` y signos opuestos | No | No |

- Un gasto exige categoría. Los ingresos pueden no tenerla.
- Un reembolso solo puede asociarse a un gasto con presupuesto cuyo ciclo siga abierto, y hereda su categoría, su ciclo y sus etiquetas.
- Una transferencia solo es posible entre cuentas distintas de la misma moneda. Borrar un lado borra ambos.
- Un gasto con reembolsos no se puede borrar hasta borrar sus reembolsos.
- Ejemplo: un gasto de COP 150.000 en Comida y un reembolso de COP 30.000 dejan **COP 120.000** de gasto neto en Comida.

## Fechas y periodos

- Las fechas de transacción son días locales `YYYY-MM-DD` (`toIsoDate`).
- Un mes es el **mes calendario** (`YYYY-MM`), incluido el paso de diciembre a enero; no se usan ventanas móviles de 30 días salvo que la especificación lo pida.
- El gasto neto de un periodo es la suma de gastos menos la suma de reembolsos. Puede ser negativo si los reembolsos superan los gastos; no lo recortes a cero sin que la especificación lo indique.

## Categorías y etiquetas

- Las categorías tienen un `transactionType` (`Income` o `Expense`). Las del sistema tienen un `CategorySlug` conocido (`Other`, `SavingsInterest`, …).
- Los movimientos sin categoría se agrupan como **"Sin categoría"**.
- En cálculos nuevos, agrupa por **ID de categoría**, no por nombre: dos categorías con el mismo nombre son distintas. (La dona de gasto del dashboard agrupa por nombre; no repitas ese patrón.)
- Las etiquetas del sistema no se pueden borrar, ni las que están en uso.

## Presupuestos

- Un presupuesto tiene una moneda y un límite, y trabaja por **ciclos**. El ciclo abierto es el que no tiene `endedAt`.
- Un gasto con presupuesto se asigna al ciclo abierto de ese presupuesto.
- Gastado del ciclo = gastos − reembolsos del ciclo. Progreso = gastado / límite (0 si el límite es 0).
- Reiniciar un presupuesto cierra el ciclo guardando una foto del límite y lo gastado, y abre uno nuevo.

## Plan mensual

- Hay un plan por mes y moneda. Sus partidas son `Income`, `Deduction`, `Expense` o `Group` (`PlanItemType`).
- Ingreso neto = ingresos − deducciones. Sobrante = ingreso neto − gastos planeados.
- Un grupo no tiene monto propio: su total es la suma de sus gastos hijos. Solo los gastos pertenecen a secciones y llevan categoría y etiquetas.
- La importación de colillas de nómina solo está disponible para planes en `PAYROLL_CURRENCY` (COP).

## Datos de prueba

Usa siempre datos ficticios (`src/testing/fixtures.ts`). Nunca copies saldos, transacciones ni nombres reales a pruebas, capturas o documentación.
