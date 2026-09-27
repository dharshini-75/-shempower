/**
 * Financial Engine implementing the 2% reducing balance formula.
 * 
 * Vatti (Monthly Interest) = Remaining Loan Balance * 0.02
 * Principal Reduced (Asal) = Total Payment Received - Vatti
 * New Loan Balance = Remaining Loan Balance - Principal Reduced
 * 
 * @param {number} currentLoanBalance The current outstanding principal
 * @param {number} amountPaid The total payment amount received
 * @returns {object} The split of vattiPaid, asalPaid, and newBalance
 */
function calculateReducingBalance(currentLoanBalance, amountPaid) {
  const interestRate = 0.02; // 2% per month
  const vatti = currentLoanBalance * interestRate;

  let asal = amountPaid - vatti;
  if (asal < 0) asal = 0; // Paid amount was insufficient to cover full vatti

  const newBalance = Math.max(0, currentLoanBalance - asal);

  return {
    vattiPaid: Number(vatti.toFixed(2)),
    asalPaid: Number(asal.toFixed(2)),
    newBalance: Number(newBalance.toFixed(2))
  };
}

module.exports = {
  calculateReducingBalance
};
