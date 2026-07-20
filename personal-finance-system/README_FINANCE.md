# 💰 Personal Finance System

Automatic transaction extraction system from Bancolombia SMS messages. Extracts financial data from Messages app and stores it in PostgreSQL for analysis and visualization.

## 🌟 Features

- ✅ **Automatic extraction** from Bancolombia SMS (numbers 87400 and 85540)
- ✅ **Multiple transaction types**:
  - Transfers sent and received
  - QR payments
  - Merchant payments
  - Credit card purchases
- ✅ **Smart categorization**:
  - Savings account transactions
  - Credit card transactions
- ✅ **PostgreSQL database** with optimized schema
- ✅ **Automatic execution** every 6 hours (configurable)
- ✅ **Duplicate detection** - processes each message only once
- ✅ **Comprehensive logging**

## 📋 Requirements

- **macOS** (Monterey or later recommended)
- **iPhone** with messages synced via iCloud
- **Python 3.8+**
- **PostgreSQL 12+**
- **Homebrew** (optional, for easy PostgreSQL installation)

## 🚀 Quick Installation

### 1. Download the project

```bash
cd ~/Documents
mkdir personal-finance
cd personal-finance
# Copy all project files here
```

### 2. Run automatic installation

```bash
chmod +x install_finance.sh
./install_finance.sh
```

The installation script will:
- ✅ Verify Python and PostgreSQL
- ✅ Install PostgreSQL if needed
- ✅ Create Python virtual environment
- ✅ Install dependencies
- ✅ Create database and tables
- ✅ Configure environment variables
- ✅ Run initial test

### 3. Grant permissions

**VERY IMPORTANT:** For the script to read messages:

1. Open **System Settings** → **Privacy & Security**
2. Go to **Full Disk Access**
3. Click the **🔒** to unlock
4. Click **+** and add:
   - **Terminal** (if running from Terminal)
   - **VS Code** or your code editor (if running from there)
5. Restart Terminal/application

### 4. Set up automatic execution

```bash
chmod +x setup_cron_finance.sh
./setup_cron_finance.sh
```

Choose your preferred frequency:
- Every 6 hours (recommended)
- Every 3 hours
- Every 12 hours
- Once daily

## 📱 How It Works

### Data Flow

```
iPhone (SMS) → iCloud → Mac Messages → Python Script → PostgreSQL
```

1. **Bancolombia** sends you an SMS for each transaction
2. The message arrives on your **iPhone**
3. It **automatically syncs** to your Mac via iCloud
4. The **script** reads the Messages database every 6 hours
5. **Extracts and parses** transaction data (amount, merchant, date, etc.)
6. **Saves** to PostgreSQL
7. You can **query and analyze** your finances

### Supported Message Formats

#### 1. Transfers Sent
```
Bancolombia: Transferiste $6,000 desde tu cuenta *2646 a la cuenta *0158970359 
el 24/12/2025 a las 09:10
```

#### 2. Transfers Received
```
Bancolombia: Recibiste una transferencia por $20,000,000 de LUIS VALENCIA 
en tu cuenta **2646, el 27/12/2025 a las 11:55
```

#### 3. QR Payments
```
Bancolombia: JUAN SEBASTIAN VALENCIA JIMENEZ pagaste $4,800.00 por codigo QR 
desde tu cuenta *2646 a la llave 008712247 el 28/12/2025 a las 07:32
```

#### 4. Merchant Payments
```
Bancolombia: Pagaste $100,000.00 a PEXTO COLOMBIA SAS desde tu producto *2646 
el 27/12/2025 20:23:55
```

#### 5. Credit Card Purchases
```
Bancolombia: Compraste COP30,547,00 en ALMACEN MAC POLLO NO con tu T.Cred *4035, 
el 28/12/2025 a las 08:58
```

## 📊 Database Schema

### Main Table: `transactions`

| Column | Type | Description |
|--------|------|-------------|
| id | SERIAL | Unique ID |
| transaction_date | TIMESTAMP | Date and time of transaction |
| description | VARCHAR(500) | Merchant or person name |
| amount | DECIMAL(15,2) | Transaction amount |
| type | VARCHAR(50) | Transaction type |
| account_type | VARCHAR(50) | Savings account or credit card |
| source_account | VARCHAR(50) | Origin account number |
| destination_account | VARCHAR(50) | Destination account/key |
| message_id | VARCHAR(100) | Unique hash to prevent duplicates |
| sender_number | VARCHAR(20) | SMS sender (87400 or 85540) |
| raw_message | TEXT | Original SMS text |
| created_at | TIMESTAMP | When the record was created |

### Available Views

- `monthly_summary` - Summary by month and type
- `income_vs_expenses` - Income vs expenses by month
- `spending_by_merchant` - Merchants sorted by total spending

## 💻 Usage

### Manual Execution

```bash
# Activate virtual environment
source venv/bin/activate

# Run extractor
python3 transaction_extractor.py
```

### View Logs

```bash
# See latest executions
tail -f transaction_extractor.log
```

### Query Database

```bash
# Connect to database
psql -d personal_finance

# View latest transactions
SELECT * FROM transactions ORDER BY transaction_date DESC LIMIT 10;

# Monthly summary
SELECT * FROM monthly_summary;

# Income vs expenses
SELECT * FROM income_vs_expenses;

# Top merchants
SELECT * FROM spending_by_merchant LIMIT 10;
```

## 🔧 Configuration

### Environment Variables (`.env` file)

```bash
# PostgreSQL Configuration
DB_HOST=localhost
DB_NAME=personal_finance
DB_USER=your_username
DB_PASSWORD=your_password
DB_PORT=5432

# Extractor Configuration
DAYS_BACK=30  # How many days back to search on first run
```

### Change Execution Frequency

```bash
# View current cron jobs
crontab -l

# Edit cron jobs
crontab -e

# Remove automatic execution
crontab -r
```

### Add More Bancolombia Numbers

Edit `transaction_extractor.py`:

```python
BANCOLOMBIA_NUMBERS = ['87400', '85540', 'NEW_NUMBER']
```

## 📈 Useful SQL Queries

```sql
-- Total spent this month
SELECT SUM(amount) 
FROM transactions 
WHERE transaction_date >= DATE_TRUNC('month', CURRENT_DATE)
  AND type IN ('transfer_sent', 'qr_payment', 'merchant_payment', 'credit_card_purchase');

-- Spending by category (account type)
SELECT 
    account_type,
    COUNT(*) as transactions,
    SUM(amount) as total
FROM transactions
WHERE type != 'transfer_received'
GROUP BY account_type;

-- Daily spending trend
SELECT 
    DATE(transaction_date) as date,
    SUM(amount) as daily_total
FROM transactions
WHERE type IN ('transfer_sent', 'qr_payment', 'merchant_payment', 'credit_card_purchase')
GROUP BY DATE(transaction_date)
ORDER BY date DESC
LIMIT 30;

-- Find specific merchant
SELECT * 
FROM transactions 
WHERE description ILIKE '%merchant_name%'
ORDER BY transaction_date DESC;
```

## 🐛 Troubleshooting

### "Messages database not found"

**Solution:** Verify messages are synced:
1. iPhone: Settings → Messages → Messages in iCloud (enabled)
2. Mac: Messages → Settings → iMessage (same account as iPhone)

### "Error connecting to PostgreSQL"

**Solution:**
```bash
# Verify PostgreSQL is running
brew services list

# Start PostgreSQL
brew services start postgresql@14

# Test connection
psql -d personal_finance
```

### "No new messages detected"

**Solution:**
1. Verify Full Disk Access permissions
2. Restart Terminal
3. Run manually to see logs:
   ```bash
   python3 transaction_extractor.py
   ```

### Cron job not executing

**Solution:**
1. Verify cron has Full Disk Access permissions
2. Check the log: `tail -f transaction_extractor.log`
3. Verify cron job: `crontab -l`

## 🔐 Security and Privacy

- ✅ All data is stored **locally** on your Mac
- ✅ No information is sent to external servers
- ✅ Database is password-protected
- ✅ Script has **read-only** access to Messages
- ✅ Original messages are **never modified or deleted**

## 📁 Project Structure

```
personal-finance/
├── transaction_extractor.py    # Main extractor script
├── finance_schema.sql          # Database schema
├── install_finance.sh          # Installation script
├── setup_cron_finance.sh       # Cron configuration
├── requirements.txt            # Python dependencies
├── .env.example               # Environment template
├── .env                       # Your configuration (created during install)
├── venv/                      # Python virtual environment
├── transaction_extractor.log  # Execution logs
└── README.md                  # This file
```

## 🚀 Next Steps (Future Features)

- [ ] Web dashboard for visualization
- [ ] Automatic categorization of expenses
- [ ] Budget tracking and alerts
- [ ] Export to Excel/CSV
- [ ] Monthly reports via email
- [ ] Integration with Google Sheets
- [ ] Mobile app for viewing transactions

## 📄 License

This project is for personal use. Use at your own risk.

## 🤝 Contributing

Found a bug or have an improvement? Share your ideas!

## 📧 Support

If you have issues, check the logs in `transaction_extractor.log`

---

**Made with ❤️ to automatically organize your personal finances**
