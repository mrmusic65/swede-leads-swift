import { supabase } from '@/integrations/supabase/client';

export interface ParseResult {
  headers: string[];
  preview: Record<string, string>[];
  totalRows: number;
}

export interface ImportResult {
  success: boolean;
  import_id: string;
  total_rows: number;
  imported: number;
  skipped: number;
  duplicates: number;
  skipped_rows: number[];
  duplicate_rows: number[];
  inserted_ids: string[];
  error?: string;
}

export type ColumnMap = Record<string, string>;

export const DB_FIELDS: { key: string; label: string; required: boolean }[] = [
  { key: 'company_name', label: 'Bolagsnamn', required: true },
  { key: 'org_number', label: 'Org.nummer', required: false },
  { key: 'registration_date', label: 'Registreringsdatum', required: false },
  { key: 'company_form', label: 'Bolagsform', required: false },
  { key: 'sni_code', label: 'SNI-kod', required: false },
  { key: 'industry_label', label: 'Bransch', required: false },
  { key: 'address', label: 'Adress', required: false },
  { key: 'postal_code', label: 'Postnummer', required: false },
  { key: 'city', label: 'Stad', required: false },
  { key: 'municipality', label: 'Kommun', required: false },
  { key: 'county', label: 'Län', required: false },
  { key: 'website_url', label: 'Hemsida URL', required: false },
  { key: 'website_status', label: 'Hemsidestatus', required: false },
  { key: 'phone_number', label: 'Telefonnummer', required: false },
  { key: 'phone_status', label: 'Telefonstatus', required: false },
  { key: 'source_primary', label: 'Källa', required: false },
  { key: 'vat_registered', label: 'Momsregistrerad', required: false },
  { key: 'f_tax_registered', label: 'F-skatt', required: false },
  { key: 'employer_registered', label: 'Arbetsgivare', required: false },
  { key: 'industry_group', label: 'Branschgrupp', required: false },
  { key: 'employees_estimate', label: 'Antal anställda', required: false },
];

// Auto-map CSV headers to DB fields based on common names
const AUTO_MAP: Record<string, string[]> = {
  company_name: ['company_name', 'company', 'namn', 'bolagsnamn', 'företagsnamn', 'name', 'företag', 'firma', 'bolag', 'company name', 'companyname'],
  org_number: ['org_number', 'orgnr', 'organisationsnummer', 'org_nr', 'orgnummer', 'org', 'organization_number', 'orgnumber'],
  registration_date: ['registration_date', 'registreringsdatum', 'reg_date', 'datum', 'registered', 'registration date', 'regdatum'],
  company_form: ['company_form', 'bolagsform', 'företagsform', 'form', 'company form', 'companyform'],
  sni_code: ['sni_code', 'sni_kod', 'sni', 'branschkod', 'snikod'],
  industry_label: ['industry_label', 'bransch', 'industry', 'verksamhet', 'branschnamn', 'industrylabel'],
  address: ['address', 'adress', 'gatuadress', 'street', 'streetaddress'],
  postal_code: ['postal_code', 'postnummer', 'postnr', 'zip', 'zipcode', 'zip_code', 'postalcode'],
  city: ['city', 'stad', 'ort', 'postort', 'town'],
  municipality: ['municipality', 'kommun'],
  county: ['county', 'lan', 'län', 'region'],
  website_url: ['website_url', 'hemsida', 'website', 'url', 'webb', 'web', 'homepage', 'websiteurl', 'site'],
  website_status: ['website_status', 'hemsidestatus', 'websitestatus'],
  phone_number: ['phone_number', 'telefon', 'telefonnummer', 'phone', 'tel', 'mobilnummer', 'mobil', 'phonenumber', 'tele'],
  phone_status: ['phone_status', 'telefonstatus', 'phonestatus'],
  source_primary: ['source_primary', 'källa', 'source'],
  vat_registered: ['vat_registered', 'momsregistrerad', 'moms', 'vat'],
  f_tax_registered: ['f_tax_registered', 'fskatt', 'f_skatt', 'ftax'],
  employer_registered: ['employer_registered', 'arbetsgivare', 'employer'],
  industry_group: ['industry_group', 'branschgrupp', 'industrygroup'],
  employees_estimate: ['employees_estimate', 'anställda', 'employees', 'antal_anställda', 'employeesestimate'],
};

export function autoMapColumns(csvHeaders: string[]): ColumnMap {
  const map: ColumnMap = {};
  const lowerHeaders = csvHeaders.map(h => h.toLowerCase().trim());

  for (const [dbField, aliases] of Object.entries(AUTO_MAP)) {
    for (const alias of aliases) {
      const idx = lowerHeaders.indexOf(alias);
      if (idx !== -1) {
        map[dbField] = csvHeaders[idx];
        break;
      }
    }
  }
  return map;
}

export async function parseCSVFile(csvText: string): Promise<ParseResult> {
  const { data, error } = await supabase.functions.invoke('import-csv', {
    body: { action: 'parse', csv_text: csvText },
  });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return data as ParseResult;
}

export async function executeImport(csvText: string, fileName: string, columnMap: ColumnMap): Promise<ImportResult> {
  const { data, error } = await supabase.functions.invoke('import-csv', {
    body: { action: 'import', csv_text: csvText, file_name: fileName, column_map: columnMap },
  });
  if (error) throw error;
  if (data?.error && !data?.success) throw new Error(data.error);
  return data as ImportResult;
}
