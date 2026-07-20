-- ===============================================================================
-- USEFUL SQL QUERIES FOR PERSONAL FINANCE ANALYSIS
-- Copy and paste these queries in your PostgreSQL client
-- ===============================================================================

-- -------------------------------------------------------------------------------
-- 1. VIEW LATEST 20 TRANSACTIONS
-- -------------------------------------------------------------------------------
SELECT 
    transaction_date,
    type,
    description,
    amount,
    account_type,
    source_account
FROM transactions
ORDER BY transaction_date DESC
LIMIT 20;


-- -------------------------------------------------------------------------------
-- 2. MONTHLY INCOME VS EXPENSES (Last 12 months)
-- -------------------------------------------------------------------------------
SELECT * FROM income_vs_expenses;


-- -------------------------------------------------------------------------------
-- 3. SPENDING BY MERCHANT (Top 20)
-- -------------------------------------------------------------------------------
SELECT * FROM spending_by_merchant LIMIT 20;


-- -------------------------------------------------------------------------------
-- 4. TOTAL SPENT THIS MONTH
-- -------------------------------------------------------------------------------
SELECT 
    SUM(amount) as total_spent
FROM transactions
WHERE transaction_date >= DATE_TRUNC('month', CURRENT_DATE)
  AND type IN ('transfer_sent', 'qr_payment', 'merchant_payment', 'credit_card_purchase');


-- -------------------------------------------------------------------------------
-- 5. TOTAL INCOME THIS MONTH
-- -------------------------------------------------------------------------------
SELECT 
    SUM(amount) as total_income
FROM transactions
WHERE transaction_date >= DATE_TRUNC('month', CURRENT_DATE)
  AND type = 'transfer_received';


-- -------------------------------------------------------------------------------
-- 6. CREDIT CARD vs SAVINGS ACCOUNT SPENDING
-- -------------------------------------------------------------------------------
SELECT 
    account_type,
    COUNT(*) as transaction_count,
    SUM(amount) as total_amount,
    AVG(amount) as average_amount
FROM transactions
WHERE type IN ('transfer_sent', 'qr_payment', 'merchant_payment', 'credit_card_purchase')
GROUP BY account_type
ORDER BY total_amount DESC;


-- -------------------------------------------------------------------------------
-- 7. DAILY SPENDING TREND (Last 30 days)
-- -------------------------------------------------------------------------------
SELECT 
    DATE(transaction_date) as date,
    COUNT(*) as transactions,
    SUM(amount) as daily_total
FROM transactions
WHERE transaction_date >= CURRENT_DATE - INTERVAL '30 days'
  AND type IN ('transfer_sent', 'qr_payment', 'merchant_payment', 'credit_card_purchase')
GROUP BY DATE(transaction_date)
ORDER BY date DESC;


-- -------------------------------------------------------------------------------
-- 8. TRANSACTIONS BY TYPE
-- -------------------------------------------------------------------------------
SELECT 
    type,
    COUNT(*) as count,
    SUM(amount) as total,
    AVG(amount) as average,
    MIN(amount) as minimum,
    MAX(amount) as maximum
FROM transactions
GROUP BY type
ORDER BY total DESC;


-- -------------------------------------------------------------------------------
-- 9. WEEKLY SPENDING AVERAGE
-- -------------------------------------------------------------------------------
SELECT 
    EXTRACT(DOW FROM transaction_date) as day_of_week,
    CASE EXTRACT(DOW FROM transaction_date)
        WHEN 0 THEN 'Sunday'
        WHEN 1 THEN 'Monday'
        WHEN 2 THEN 'Tuesday'
        WHEN 3 THEN 'Wednesday'
        WHEN 4 THEN 'Thursday'
        WHEN 5 THEN 'Friday'
        WHEN 6 THEN 'Saturday'
    END as day_name,
    COUNT(*) as transactions,
    SUM(amount) as total,
    AVG(amount) as average
FROM transactions
WHERE type IN ('transfer_sent', 'qr_payment', 'merchant_payment', 'credit_card_purchase')
GROUP BY EXTRACT(DOW FROM transaction_date)
ORDER BY day_of_week;


-- -------------------------------------------------------------------------------
-- 10. FIND TRANSACTIONS BY MERCHANT NAME
-- -------------------------------------------------------------------------------
-- Replace 'MERCHANT_NAME' with the merchant you're looking for
SELECT 
    transaction_date,
    description,
    amount,
    account_type,
    type
FROM transactions
WHERE description ILIKE '%MERCHANT_NAME%'
ORDER BY transaction_date DESC;


-- -------------------------------------------------------------------------------
-- 11. LARGEST TRANSACTIONS (Top 10)
-- -------------------------------------------------------------------------------
SELECT 
    transaction_date,
    description,
    amount,
    type,
    account_type
FROM transactions
ORDER BY amount DESC
LIMIT 10;


-- -------------------------------------------------------------------------------
-- 12. TRANSACTIONS IN A SPECIFIC DATE RANGE
-- -------------------------------------------------------------------------------
-- Replace dates as needed
SELECT 
    transaction_date,
    type,
    description,
    amount
FROM transactions
WHERE transaction_date BETWEEN '2025-01-01' AND '2025-01-31'
ORDER BY transaction_date DESC;


-- -------------------------------------------------------------------------------
-- 13. MONTHLY BREAKDOWN BY ACCOUNT TYPE
-- -------------------------------------------------------------------------------
SELECT 
    TO_CHAR(DATE_TRUNC('month', transaction_date), 'Mon YYYY') as month,
    account_type,
    COUNT(*) as transactions,
    SUM(amount) as total
FROM transactions
WHERE type IN ('transfer_sent', 'qr_payment', 'merchant_payment', 'credit_card_purchase')
GROUP BY DATE_TRUNC('month', transaction_date), account_type
ORDER BY DATE_TRUNC('month', transaction_date) DESC, account_type;


-- -------------------------------------------------------------------------------
-- 14. AVERAGE SPENDING PER TRANSACTION TYPE
-- -------------------------------------------------------------------------------
SELECT 
    type,
    account_type,
    COUNT(*) as count,
    AVG(amount) as average_amount,
    STDDEV(amount) as std_deviation
FROM transactions
GROUP BY type, account_type
ORDER BY average_amount DESC;


-- -------------------------------------------------------------------------------
-- 15. TOTAL TRANSACTIONS BY SENDER NUMBER
-- -------------------------------------------------------------------------------
SELECT 
    sender_number,
    COUNT(*) as total_messages,
    COUNT(DISTINCT DATE(transaction_date)) as days_with_transactions,
    MIN(transaction_date) as first_transaction,
    MAX(transaction_date) as last_transaction
FROM transactions
GROUP BY sender_number;


-- ===============================================================================
-- USEFUL VIEWS
-- ===============================================================================

-- Create a view for current month summary
CREATE OR REPLACE VIEW current_month_summary AS
SELECT 
    type,
    account_type,
    COUNT(*) as transactions,
    SUM(amount) as total
FROM transactions
WHERE transaction_date >= DATE_TRUNC('month', CURRENT_DATE)
GROUP BY type, account_type
ORDER BY total DESC;

-- Query the view
SELECT * FROM current_month_summary;


-- ===============================================================================
-- MAINTENANCE QUERIES
-- ===============================================================================

-- Count total transactions
SELECT COUNT(*) as total_transactions FROM transactions;

-- Check for duplicates (should return 0)
SELECT message_id, COUNT(*) 
FROM transactions 
GROUP BY message_id 
HAVING COUNT(*) > 1;

-- Database size
SELECT pg_size_pretty(pg_database_size('personal_finance')) as database_size;

-- Table size
SELECT pg_size_pretty(pg_total_relation_size('transactions')) as table_size;


-- ===============================================================================
-- EXPORT QUERIES
-- ===============================================================================

-- Export to CSV (run from terminal)
-- \copy (SELECT * FROM transactions ORDER BY transaction_date DESC) TO '~/Desktop/transactions.csv' CSV HEADER;

-- Export monthly summary to CSV
-- \copy (SELECT * FROM monthly_summary) TO '~/Desktop/monthly_summary.csv' CSV HEADER;


-- ===============================================================================
-- NOTES
-- ===============================================================================
-- 
-- Transaction Types:
-- - transfer_sent: Money sent from your account
-- - transfer_received: Money received to your account
-- - qr_payment: QR code payments
-- - merchant_payment: Payments to merchants
-- - credit_card_purchase: Credit card purchases
--
-- Account Types:
-- - savings_account: Transactions from savings account (cuenta *2646)
-- - credit_card: Transactions from credit card (T.Cred *4035)
--
-- ===============================================================================
