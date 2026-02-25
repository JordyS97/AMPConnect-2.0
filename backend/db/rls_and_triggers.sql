-- =======================================================
-- Database Security Updates: Row-Level Security & Triggers
-- =======================================================

-- 1. Create updated_at trigger function for Audit Purposes
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. Apply Trigger to Tables
-- For Customers
DROP TRIGGER IF EXISTS update_customers_updated_at ON customers;
CREATE TRIGGER update_customers_updated_at
BEFORE UPDATE ON customers
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- For Admins
DROP TRIGGER IF EXISTS update_admins_updated_at ON admins;
CREATE TRIGGER update_admins_updated_at
BEFORE UPDATE ON admins
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- For Parts (using last_updated as the column name)
CREATE OR REPLACE FUNCTION update_last_updated_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.last_updated = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_parts_last_updated ON parts;
CREATE TRIGGER update_parts_last_updated
BEFORE UPDATE ON parts
FOR EACH ROW
EXECUTE FUNCTION update_last_updated_column();


-- 3. Enable Row-Level Security (RLS)
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE parts ENABLE ROW LEVEL SECURITY;

-- 4. Create Policies for Transactions Table
-- Note: 'app.current_user_id' and 'app.user_role' will need to be set per transaction in the app 
-- using SET LOCAL app.current_user_id = 'XYZ' in the backend, but since PostgreSQL connection pooling 
-- is stateless, enforcing it perfectly at the DB level requires wrapper functions. 
-- For a standard Node+PG app with a shared pool, RLS is often enforced by passing the ID to the query.
-- However, as requested, here are the explicit RLS policies if connection-scoped variables are used:

-- Drop existing if any
DROP POLICY IF EXISTS "Bengkel select own transactions" ON transactions;
DROP POLICY IF EXISTS "Bengkel update own transactions" ON transactions;
DROP POLICY IF EXISTS "Admin manage parts" ON parts;
DROP POLICY IF EXISTS "Admin full access transactions" ON transactions;

-- Bengkel (Customers) Policy for Transactions 
CREATE POLICY "Bengkel select own transactions" ON transactions
FOR SELECT
USING (
    current_setting('app.user_role', true) = 'customer' 
    AND customer_id = NULLIF(current_setting('app.current_user_id', true), '')::int
);

CREATE POLICY "Bengkel update own transactions" ON transactions
FOR UPDATE
USING (
    current_setting('app.user_role', true) = 'customer' 
    AND customer_id = NULLIF(current_setting('app.current_user_id', true), '')::int
);

-- Admin Policy for Transactions (Full Access)
CREATE POLICY "Admin full access transactions" ON transactions
USING (current_setting('app.user_role', true) IN ('admin', 'super_admin'));


-- 5. Create Policies for Parts Table
-- Admin Policy for Parts
CREATE POLICY "Admin manage parts" ON parts
USING (current_setting('app.user_role', true) IN ('admin', 'super_admin'));

-- Customer Policy for Parts (Read-Only)
CREATE POLICY "Customer read parts" ON parts
FOR SELECT
USING (current_setting('app.user_role', true) = 'customer');


-- Note: A PostgreSQL Superuser bypasses RLS by default. Ensure the DB user for the app is not a superuser 
-- OR use `ALTER TABLE table_name FORCE ROW LEVEL SECURITY` if using superuser (not recommended for production).
