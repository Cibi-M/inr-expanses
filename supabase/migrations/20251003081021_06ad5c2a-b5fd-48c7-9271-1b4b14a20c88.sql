-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create enum types
CREATE TYPE public.project_status AS ENUM ('prospect', 'active', 'completed', 'cancelled');
CREATE TYPE public.transaction_type AS ENUM ('credit', 'debit');
CREATE TYPE public.fund_source AS ENUM ('cash', 'bank');
CREATE TYPE public.advance_status AS ENUM ('open', 'partially_returned', 'closed');

-- Create profiles table for user data
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  email TEXT,
  phone TEXT,
  role TEXT DEFAULT 'user',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- Create customers table
CREATE TABLE public.customers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  address TEXT,
  phone_number TEXT,
  email TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view customers" ON public.customers
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can create customers" ON public.customers
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update customers" ON public.customers
  FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Authenticated users can delete customers" ON public.customers
  FOR DELETE TO authenticated USING (true);

-- Create projects table
CREATE TABLE public.projects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  estimated_total DECIMAL(15, 2) NOT NULL DEFAULT 0,
  remaining_amount DECIMAL(15, 2) NOT NULL DEFAULT 0,
  status public.project_status DEFAULT 'prospect',
  start_date DATE,
  end_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view projects" ON public.projects
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can create projects" ON public.projects
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update projects" ON public.projects
  FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Authenticated users can delete projects" ON public.projects
  FOR DELETE TO authenticated USING (true);

-- Create employees table
CREATE TABLE public.employees (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  department TEXT,
  email TEXT,
  phone TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view employees" ON public.employees
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can create employees" ON public.employees
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update employees" ON public.employees
  FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Authenticated users can delete employees" ON public.employees
  FOR DELETE TO authenticated USING (true);

-- Create petty_cash_advance table
CREATE TABLE public.petty_cash_advance (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  advance_amount DECIMAL(15, 2) NOT NULL DEFAULT 0,
  expense_total DECIMAL(15, 2) NOT NULL DEFAULT 0,
  returned_amount DECIMAL(15, 2) NOT NULL DEFAULT 0,
  status public.advance_status DEFAULT 'open',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.petty_cash_advance ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view advances" ON public.petty_cash_advance
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can create advances" ON public.petty_cash_advance
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update advances" ON public.petty_cash_advance
  FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Authenticated users can delete advances" ON public.petty_cash_advance
  FOR DELETE TO authenticated USING (true);

-- Create transactions table
CREATE TABLE public.transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  transaction_type public.transaction_type NOT NULL,
  fund_source public.fund_source NOT NULL,
  amount DECIMAL(15, 2) NOT NULL CHECK (amount >= 0),
  payment_mode TEXT,
  reason TEXT NOT NULL,
  metadata JSONB,
  related_employee_id UUID REFERENCES public.employees(id) ON DELETE SET NULL,
  related_advance_id UUID REFERENCES public.petty_cash_advance(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view transactions" ON public.transactions
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can create transactions" ON public.transactions
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update transactions" ON public.transactions
  FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Authenticated users can delete transactions" ON public.transactions
  FOR DELETE TO authenticated USING (true);

-- Create activity_log for audit trail
CREATE TABLE public.activity_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  actor_type TEXT,
  actor_id UUID,
  action TEXT NOT NULL,
  data JSONB,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view activity logs" ON public.activity_log
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "System can insert activity logs" ON public.activity_log
  FOR INSERT TO authenticated WITH CHECK (true);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON public.customers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON public.projects
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_employees_updated_at BEFORE UPDATE ON public.employees
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_petty_cash_advance_updated_at BEFORE UPDATE ON public.petty_cash_advance
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_transactions_updated_at BEFORE UPDATE ON public.transactions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'full_name',
    NEW.email
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to update project remaining_amount after transaction
CREATE OR REPLACE FUNCTION public.update_project_remaining_amount()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  amount_change DECIMAL(15, 2);
BEGIN
  -- Calculate amount change based on transaction type
  IF TG_OP = 'INSERT' THEN
    IF NEW.transaction_type = 'credit' THEN
      amount_change := -NEW.amount; -- Credit reduces remaining amount
    ELSE
      amount_change := NEW.amount; -- Debit increases remaining amount
    END IF;
    
    -- Update project remaining_amount
    UPDATE public.projects
    SET remaining_amount = remaining_amount + amount_change
    WHERE id = NEW.project_id;
    
    -- Log the change
    INSERT INTO public.activity_log (actor_type, action, data)
    VALUES (
      'system',
      'project_balance_updated',
      jsonb_build_object(
        'project_id', NEW.project_id,
        'transaction_id', NEW.id,
        'transaction_type', NEW.transaction_type,
        'amount', NEW.amount,
        'amount_change', amount_change
      )
    );
  ELSIF TG_OP = 'UPDATE' THEN
    -- Reverse old transaction effect
    IF OLD.transaction_type = 'credit' THEN
      amount_change := OLD.amount;
    ELSE
      amount_change := -OLD.amount;
    END IF;
    
    -- Apply new transaction effect
    IF NEW.transaction_type = 'credit' THEN
      amount_change := amount_change - NEW.amount;
    ELSE
      amount_change := amount_change + NEW.amount;
    END IF;
    
    UPDATE public.projects
    SET remaining_amount = remaining_amount + amount_change
    WHERE id = NEW.project_id;
    
    INSERT INTO public.activity_log (actor_type, action, data)
    VALUES (
      'system',
      'project_balance_updated',
      jsonb_build_object(
        'project_id', NEW.project_id,
        'transaction_id', NEW.id,
        'old_amount', OLD.amount,
        'new_amount', NEW.amount,
        'amount_change', amount_change
      )
    );
  ELSIF TG_OP = 'DELETE' THEN
    -- Reverse transaction effect
    IF OLD.transaction_type = 'credit' THEN
      amount_change := OLD.amount;
    ELSE
      amount_change := -OLD.amount;
    END IF;
    
    UPDATE public.projects
    SET remaining_amount = remaining_amount + amount_change
    WHERE id = OLD.project_id;
    
    INSERT INTO public.activity_log (actor_type, action, data)
    VALUES (
      'system',
      'project_balance_updated',
      jsonb_build_object(
        'project_id', OLD.project_id,
        'transaction_id', OLD.id,
        'amount', OLD.amount,
        'amount_change', amount_change,
        'operation', 'delete'
      )
    );
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER update_project_balance_on_transaction
  AFTER INSERT OR UPDATE OR DELETE ON public.transactions
  FOR EACH ROW EXECUTE FUNCTION public.update_project_remaining_amount();

-- Function to initialize project remaining_amount
CREATE OR REPLACE FUNCTION public.initialize_project_remaining_amount()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.remaining_amount := NEW.estimated_total;
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_initial_remaining_amount
  BEFORE INSERT ON public.projects
  FOR EACH ROW EXECUTE FUNCTION public.initialize_project_remaining_amount();

-- Insert seed data
-- Seed customers
INSERT INTO public.customers (name, address, phone_number, email, notes) VALUES
  ('Rajesh Kumar', '123 MG Road, Bangalore', '+91-9876543210', 'rajesh.kumar@email.com', 'Premium customer, prefers contemporary designs'),
  ('Priya Sharma', '456 Park Street, Mumbai', '+91-9876543211', 'priya.sharma@email.com', 'Budget-conscious, looking for modular furniture'),
  ('Amit Patel', '789 Ring Road, Ahmedabad', '+91-9876543212', 'amit.patel@email.com', 'Corporate client, office furnishing');

-- Seed employees
INSERT INTO public.employees (name, department, email, phone) VALUES
  ('Suresh Kumar', 'Procurement', 'suresh@company.com', '+91-9123456789'),
  ('Anita Desai', 'Installation', 'anita@company.com', '+91-9123456790');

-- Seed projects
INSERT INTO public.projects (customer_id, name, description, estimated_total, status, start_date) VALUES
  ((SELECT id FROM public.customers WHERE name = 'Rajesh Kumar'), 'Living Room Furnishing', 'Complete living room setup with sofa, TV unit, and coffee table', 150000.00, 'active', '2025-01-15'),
  ((SELECT id FROM public.customers WHERE name = 'Priya Sharma'), 'Bedroom Makeover', 'Modular wardrobe and bed with storage', 85000.00, 'active', '2025-02-01'),
  ((SELECT id FROM public.customers WHERE name = 'Amit Patel'), 'Office Furniture', 'Workstations, cabinets, and conference table', 320000.00, 'prospect', '2025-03-01');

-- Seed transactions
INSERT INTO public.transactions (project_id, customer_id, transaction_type, fund_source, amount, payment_mode, reason, metadata) VALUES
  (
    (SELECT id FROM public.projects WHERE name = 'Living Room Furnishing'),
    (SELECT id FROM public.customers WHERE name = 'Rajesh Kumar'),
    'credit',
    'bank',
    50000.00,
    'NEFT',
    'Advance payment for project',
    '{"bank": "HDFC Bank", "utr": "UTR202501150001", "account_last4": "1234"}'
  ),
  (
    (SELECT id FROM public.projects WHERE name = 'Living Room Furnishing'),
    (SELECT id FROM public.customers WHERE name = 'Rajesh Kumar'),
    'debit',
    'bank',
    35000.00,
    'UPI',
    'Payment to supplier for sofa',
    '{"bank": "ICICI Bank", "utr": "UPI202501180001", "supplier": "Modern Furniture Co."}'
  ),
  (
    (SELECT id FROM public.projects WHERE name = 'Bedroom Makeover'),
    (SELECT id FROM public.customers WHERE name = 'Priya Sharma'),
    'credit',
    'cash',
    25000.00,
    'Cash',
    'Initial deposit',
    '{}'
  );

-- Seed petty cash advance
INSERT INTO public.petty_cash_advance (employee_id, project_id, advance_amount, expense_total, returned_amount, status, notes) VALUES
  (
    (SELECT id FROM public.employees WHERE name = 'Suresh Kumar'),
    (SELECT id FROM public.projects WHERE name = 'Living Room Furnishing'),
    10000.00,
    7500.00,
    2000.00,
    'partially_returned',
    'For miscellaneous procurement items'
  ),
  (
    (SELECT id FROM public.employees WHERE name = 'Anita Desai'),
    NULL,
    5000.00,
    5000.00,
    0.00,
    'open',
    'Installation tools and materials'
  );

-- Add related transactions for petty cash
INSERT INTO public.transactions (project_id, customer_id, transaction_type, fund_source, amount, payment_mode, reason, related_employee_id, related_advance_id) VALUES
  (
    (SELECT id FROM public.projects WHERE name = 'Living Room Furnishing'),
    (SELECT id FROM public.customers WHERE name = 'Rajesh Kumar'),
    'debit',
    'cash',
    10000.00,
    'Cash',
    'Petty cash advance to Suresh Kumar',
    (SELECT id FROM public.employees WHERE name = 'Suresh Kumar'),
    (SELECT id FROM public.petty_cash_advance WHERE employee_id = (SELECT id FROM public.employees WHERE name = 'Suresh Kumar'))
  ),
  (
    (SELECT id FROM public.projects WHERE name = 'Living Room Furnishing'),
    (SELECT id FROM public.customers WHERE name = 'Rajesh Kumar'),
    'credit',
    'cash',
    2000.00,
    'Cash',
    'Returned balance from petty cash advance',
    (SELECT id FROM public.employees WHERE name = 'Suresh Kumar'),
    (SELECT id FROM public.petty_cash_advance WHERE employee_id = (SELECT id FROM public.employees WHERE name = 'Suresh Kumar'))
  );