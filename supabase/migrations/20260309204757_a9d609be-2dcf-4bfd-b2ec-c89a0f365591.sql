
ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS vat_registered boolean DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS f_tax_registered boolean DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS employer_registered boolean DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS industry_group text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS employees_estimate text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS company_age_days integer DEFAULT NULL;
