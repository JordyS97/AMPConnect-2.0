-- AMPConnect Database Schema

-- Drop existing tables
DROP TABLE IF EXISTS activity_logs CASCADE;
DROP TABLE IF EXISTS upload_history CASCADE;
DROP TABLE IF EXISTS transaction_items CASCADE;
DROP TABLE IF EXISTS transactions CASCADE;
DROP TABLE IF EXISTS otp_codes CASCADE;
DROP TABLE IF EXISTS parts CASCADE;
DROP TABLE IF EXISTS customers CASCADE;
DROP TABLE IF EXISTS admins CASCADE;

-- Admins table
CREATE TABLE admins (
  id SERIAL PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(20) NOT NULL DEFAULT 'admin' CHECK (role IN ('super_admin', 'admin', 'viewer')),
  status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  last_login TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Customers table
CREATE TABLE customers (
  id SERIAL PRIMARY KEY,
  no_customer VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(255),
  email VARCHAR(255) UNIQUE,
  phone VARCHAR(20),
  address TEXT,
  password_hash VARCHAR(255),
  total_points INTEGER DEFAULT 0,
  tier VARCHAR(20) DEFAULT 'Silver' CHECK (tier IN ('Silver', 'Gold', 'Diamond')),
  is_verified BOOLEAN DEFAULT false,
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- OTP codes table
CREATE TABLE otp_codes (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) NOT NULL,
  code VARCHAR(6) NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  used BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Parts / Stock table
CREATE TABLE parts (
  id SERIAL PRIMARY KEY,
  no_part VARCHAR(100) UNIQUE NOT NULL,
  nama_part VARCHAR(255) NOT NULL,
  group_part VARCHAR(100),
  group_material VARCHAR(100),
  group_tobpm VARCHAR(100),
  qty INTEGER DEFAULT 0,
  amount DECIMAL(15,2) DEFAULT 0,
  last_updated TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Transactions (sales headers)
CREATE TABLE transactions (
  id SERIAL PRIMARY KEY,
  no_faktur VARCHAR(100) UNIQUE NOT NULL,
  tanggal DATE NOT NULL,
  customer_id INTEGER REFERENCES customers(id),
  no_customer VARCHAR(50),
  tipe_faktur VARCHAR(50),
  total_faktur DECIMAL(15,2) DEFAULT 0,
  diskon DECIMAL(15,2) DEFAULT 0,
  net_sales DECIMAL(15,2) DEFAULT 0,
  gp_percent DECIMAL(5,2) DEFAULT 0,
  gross_profit DECIMAL(15,2) DEFAULT 0,
  points_earned INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Transaction items (sales detail lines)
CREATE TABLE transaction_items (
  id SERIAL PRIMARY KEY,
  transaction_id INTEGER REFERENCES transactions(id) ON DELETE CASCADE,
  no_part VARCHAR(100),
  nama_part VARCHAR(255),
  qty INTEGER DEFAULT 0,
  price DECIMAL(15,2) DEFAULT 0,
  subtotal DECIMAL(15,2) DEFAULT 0
);

-- Upload history
CREATE TABLE upload_history (
  id SERIAL PRIMARY KEY,
  admin_id INTEGER REFERENCES admins(id),
  admin_username VARCHAR(50),
  file_type VARCHAR(20) NOT NULL CHECK (file_type IN ('sales', 'stock')),
  file_name VARCHAR(255) NOT NULL,
  rows_processed INTEGER DEFAULT 0,
  success_count INTEGER DEFAULT 0,
  failed_count INTEGER DEFAULT 0,
  status VARCHAR(20) DEFAULT 'processing' CHECK (status IN ('processing', 'completed', 'failed')),
  error_log TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Activity logs
CREATE TABLE activity_logs (
  id SERIAL PRIMARY KEY,
  user_type VARCHAR(20) NOT NULL CHECK (user_type IN ('customer', 'admin')),
  user_id INTEGER,
  user_name VARCHAR(255),
  action VARCHAR(100) NOT NULL,
  description TEXT,
  ip_address VARCHAR(45),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_transactions_customer ON transactions(customer_id);
CREATE INDEX idx_transactions_date ON transactions(tanggal);
CREATE INDEX idx_transactions_no_customer ON transactions(no_customer);
CREATE INDEX idx_transaction_items_tx ON transaction_items(transaction_id);
CREATE INDEX idx_parts_group_part ON parts(group_part);
CREATE INDEX idx_parts_group_material ON parts(group_material);
CREATE INDEX idx_parts_qty ON parts(qty);
CREATE INDEX idx_activity_logs_created ON activity_logs(created_at);
CREATE INDEX idx_customers_no_customer ON customers(no_customer);
CREATE INDEX idx_otp_email ON otp_codes(email);
