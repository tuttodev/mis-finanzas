-- Personal Finance Database Schema
-- Stores transactions extracted from Bancolombia messages

DROP TABLE IF EXISTS transactions CASCADE;

CREATE TABLE transactions (
    id SERIAL PRIMARY KEY,
    
    -- Transaction details
    transaction_date TIMESTAMP NOT NULL,
    description VARCHAR(500) NOT NULL,
    amount DECIMAL(15, 2) NOT NULL,
    
    -- Transaction type
    type VARCHAR(50) NOT NULL,
    -- Values: 'transfer_sent', 'transfer_received', 'qr_payment', 'merchant_payment', 'credit_card_purchase'
    
    -- Account information
    account_type VARCHAR(50) NOT NULL,
    -- Values: 'savings_account', 'credit_card'
    
    source_account VARCHAR(50),      -- Origin account number (e.g., *2646, *4035)
    destination_account VARCHAR(50),  -- Destination account/key
    
    -- Metadata
    message_id VARCHAR(100) UNIQUE NOT NULL,  -- To prevent duplicates
    sender_number VARCHAR(20) NOT NULL,       -- SMS sender (87400 or 85540)
    raw_message TEXT,                         -- Original message text
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CONSTRAINT chk_transaction_type CHECK (
        type IN ('transfer_sent', 'transfer_received', 'qr_payment', 'merchant_payment', 'credit_card_purchase', 'debit_card_purchase', 'atm_withdrawal')
    ),
    CONSTRAINT chk_account_type CHECK (
        account_type IN ('savings_account', 'credit_card', 'debit_card')
    )
);

-- Indexes for better performance
CREATE INDEX idx_transaction_date ON transactions(transaction_date DESC);
CREATE INDEX idx_type ON transactions(type);
CREATE INDEX idx_account_type ON transactions(account_type);
CREATE INDEX idx_sender_number ON transactions(sender_number);
CREATE INDEX idx_created_at ON transactions(created_at DESC);

-- View for monthly summary
CREATE OR REPLACE VIEW monthly_summary AS
SELECT 
    DATE_TRUNC('month', transaction_date) as month,
    type,
    account_type,
    COUNT(*) as transaction_count,
    SUM(amount) as total_amount
FROM transactions
GROUP BY DATE_TRUNC('month', transaction_date), type, account_type
ORDER BY month DESC, type;

-- View for income vs expenses
CREATE OR REPLACE VIEW income_vs_expenses AS
SELECT 
    DATE_TRUNC('month', transaction_date) as month,
    SUM(CASE WHEN type = 'transfer_received' THEN amount ELSE 0 END) as income,
    SUM(CASE WHEN type IN ('transfer_sent', 'qr_payment', 'merchant_payment', 'credit_card_purchase') 
        THEN amount ELSE 0 END) as expenses,
    SUM(CASE WHEN type = 'transfer_received' THEN amount ELSE -amount END) as balance
FROM transactions
GROUP BY DATE_TRUNC('month', transaction_date)
ORDER BY month DESC;

-- View for spending by merchant
CREATE OR REPLACE VIEW spending_by_merchant AS
SELECT 
    description,
    COUNT(*) as purchase_count,
    SUM(amount) as total_spent,
    AVG(amount) as average_amount,
    MAX(transaction_date) as last_purchase
FROM transactions
WHERE type IN ('merchant_payment', 'credit_card_purchase')
GROUP BY description
ORDER BY total_spent DESC;

COMMENT ON TABLE transactions IS 'Stores all financial transactions extracted from Bancolombia SMS messages';
COMMENT ON COLUMN transactions.message_id IS 'Unique hash of the message to prevent duplicate entries';
