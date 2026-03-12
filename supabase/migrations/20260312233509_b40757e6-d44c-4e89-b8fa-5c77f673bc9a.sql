
CREATE TYPE public.lead_status AS ENUM ('ny', 'kontaktad', 'kvalificerad', 'ej_intressant');

ALTER TABLE public.companies ADD COLUMN lead_status public.lead_status NOT NULL DEFAULT 'ny'::public.lead_status;
