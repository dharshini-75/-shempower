const { calculateReducingBalance } = require('../utils/mathEngine');

describe('SHEmpower 2% Reducing Balance Math Engine Tests', () => {
  
  test('Month 1 Repayment: ₹5,000 opening balance, ₹600 paid', () => {
    const currentBalance = 5000;
    const amountPaid = 600;
    
    const result = calculateReducingBalance(currentBalance, amountPaid);
    
    expect(result.vattiPaid).toBe(100.00);
    expect(result.asalPaid).toBe(500.00);
    expect(result.newBalance).toBe(4500.00);
  });

  test('Month 2 Repayment: ₹4,500 opening balance, ₹590 paid', () => {
    const currentBalance = 4500;
    const amountPaid = 590;
    
    const result = calculateReducingBalance(currentBalance, amountPaid);
    
    expect(result.vattiPaid).toBe(90.00);
    expect(result.asalPaid).toBe(500.00);
    expect(result.newBalance).toBe(4000.00);
  });

  test('Underpayment Edge Case: ₹5,000 balance, ₹50 paid (insufficient to cover ₹100 interest)', () => {
    const currentBalance = 5000;
    const amountPaid = 50;
    
    const result = calculateReducingBalance(currentBalance, amountPaid);
    
    expect(result.vattiPaid).toBe(100.00);
    expect(result.asalPaid).toBe(0.00);
    expect(result.newBalance).toBe(5000.00);
  });

  test('Clearance Edge Case: ₹1,000 balance, ₹2,000 paid (overpayment)', () => {
    const currentBalance = 1000;
    const amountPaid = 2000;
    
    const result = calculateReducingBalance(currentBalance, amountPaid);
    
    expect(result.vattiPaid).toBe(20.00);
    expect(result.asalPaid).toBe(1980.00);
    expect(result.newBalance).toBe(0.00);
  });

  test('No Outstanding Balance: ₹0 balance, ₹100 paid', () => {
    const currentBalance = 0;
    const amountPaid = 100;
    
    const result = calculateReducingBalance(currentBalance, amountPaid);
    
    expect(result.vattiPaid).toBe(0.00);
    expect(result.asalPaid).toBe(100.00);
    expect(result.newBalance).toBe(0.00);
  });
});
