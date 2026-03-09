
-- Create enums
CREATE TYPE public.website_status AS ENUM ('has_website', 'social_only', 'no_website_found', 'unknown');
CREATE TYPE public.phone_status AS ENUM ('has_phone', 'missing', 'unknown');
CREATE TYPE public.import_status AS ENUM ('pending', 'processing', 'completed', 'failed');

-- Create timestamp update function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Companies table
CREATE TABLE public.companies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_name TEXT NOT NULL,
  org_number TEXT NOT NULL,
  registration_date DATE,
  company_form TEXT,
  sni_code TEXT,
  industry_label TEXT,
  address TEXT,
  postal_code TEXT,
  city TEXT,
  municipality TEXT,
  county TEXT,
  website_url TEXT,
  website_status public.website_status NOT NULL DEFAULT 'unknown',
  phone_number TEXT,
  phone_status public.phone_status NOT NULL DEFAULT 'unknown',
  source_primary TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view companies"
  ON public.companies FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert companies"
  ON public.companies FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update companies"
  ON public.companies FOR UPDATE TO authenticated USING (true);

CREATE TRIGGER update_companies_updated_at
  BEFORE UPDATE ON public.companies
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_companies_city ON public.companies(city);
CREATE INDEX idx_companies_county ON public.companies(county);
CREATE INDEX idx_companies_website_status ON public.companies(website_status);
CREATE INDEX idx_companies_registration_date ON public.companies(registration_date);
CREATE INDEX idx_companies_industry_label ON public.companies(industry_label);

-- Imports table
CREATE TABLE public.imports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  source_name TEXT,
  file_name TEXT NOT NULL,
  imported_rows INTEGER DEFAULT 0,
  status public.import_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.imports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own imports"
  ON public.imports FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can create imports"
  ON public.imports FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own imports"
  ON public.imports FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- Notes table
CREATE TABLE public.notes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  note_text TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own notes"
  ON public.notes FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can create notes"
  ON public.notes FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own notes"
  ON public.notes FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE INDEX idx_notes_company_id ON public.notes(company_id);

-- Saved filters table
CREATE TABLE public.saved_filters (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  filter_json JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.saved_filters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own filters"
  ON public.saved_filters FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can create filters"
  ON public.saved_filters FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own filters"
  ON public.saved_filters FOR DELETE TO authenticated USING (auth.uid() = user_id);
