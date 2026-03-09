
-- Add last_address_change_date to companies
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS last_address_change_date date;

-- Add employee_count_updated to event type enum
ALTER TYPE public.company_event_type ADD VALUE IF NOT EXISTS 'employee_count_updated';
