type BalanceTransaction = {
  amount: number;
};

function toCents(amount: number) {
  return Math.round(Number(amount) * 100);
}

/**
 * Calculates an account balance from signed transaction amounts.
 * Income and refunds are positive; expenses are negative.
 */
export function calculateAccountBalance(transactions: BalanceTransaction[]) {
  const totalCents = transactions.reduce(
    (total, transaction) => total + toCents(transaction.amount),
    0,
  );

  return totalCents / 100;
}
