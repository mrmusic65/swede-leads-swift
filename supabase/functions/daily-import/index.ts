import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// ═══════════════════════════════════════════════════════════════
// Canonical types
// ═══════════════════════════════════════════════════════════════

interface NormalizedCompany {
  company_name: string;
  org_number?: string;
  registration_date?: string;
  company_form?: string;
  sni_code?: string;
  industry_label?: string;
  industry_group?: string;
  address?: string;
  postal_code?: string;
  city?: string;
  municipality?: string;
  county?: string;
  website_url?: string;
  phone_number?: string;
  source_primary?: string;
  vat_registered?: boolean;
  f_tax_registered?: boolean;
  employer_registered?: boolean;
  employees_estimate?: string;
  company_age_days?: number;
}

interface ProviderResult {
  companies: NormalizedCompany[];
}

interface DataProvider {
  name: string;
  /** Provider role description for logging */
  role: string;
  /** Fields this provider is authoritative for */
  ownedFields: string[];
  /** If true, this provider enriches existing records instead of inserting new ones */
  enrichOnly?: boolean;
  fetch(): Promise<ProviderResult>;
}

// ═══════════════════════════════════════════════════════════════
// Shared helpers
// ═══════════════════════════════════════════════════════════════

function computeAgeDays(regDate?: string | null): number | null {
  if (!regDate) return null;
  const d = new Date(regDate);
  if (isNaN(d.getTime())) return null;
  return Math.floor((Date.now() - d.getTime()) / 86400000);
}

const SOCIAL_DOMAINS = ["facebook.com", "instagram.com", "linktr.ee", "bokadirekt.se"];

function detectWebsiteStatus(url?: string | null): string {
  if (!url || url.trim() === "") return "no_website_found";
  const lower = url.toLowerCase();
  if (SOCIAL_DOMAINS.some((d) => lower.includes(d))) return "social_only";
  return "has_website";
}

function detectPhoneStatus(phone?: string | null): string {
  if (!phone || phone.trim() === "") return "missing";
  return "has_phone";
}

// ═══════════════════════════════════════════════════════════════
// Normalization layer
// ═══════════════════════════════════════════════════════════════

function buildInsertRecord(company: NormalizedCompany, providerName: string) {
  const ageDays = company.company_age_days ?? computeAgeDays(company.registration_date);
  return {
    company_name: company.company_name,
    org_number: company.org_number || null,
    registration_date: company.registration_date || null,
    company_form: company.company_form || null,
    sni_code: company.sni_code || null,
    industry_label: company.industry_label || null,
    industry_group: company.industry_group || null,
    address: company.address || null,
    postal_code: company.postal_code || null,
    city: company.city || null,
    municipality: company.municipality || null,
    county: company.county || null,
    website_url: company.website_url || null,
    website_status: detectWebsiteStatus(company.website_url),
    phone_number: company.phone_number || null,
    phone_status: detectPhoneStatus(company.phone_number),
    source_primary: company.source_primary || "daily-import",
    source_provider: providerName,
    vat_registered: company.vat_registered ?? null,
    f_tax_registered: company.f_tax_registered ?? null,
    employer_registered: company.employer_registered ?? null,
    employees_estimate: company.employees_estimate || null,
    company_age_days: ageDays,
  };
}

function buildEnrichRecord(company: NormalizedCompany) {
  const updates: Record<string, unknown> = {};
  const ageDays = company.company_age_days ?? computeAgeDays(company.registration_date);

  if (company.vat_registered !== undefined) updates.vat_registered = company.vat_registered;
  if (company.f_tax_registered !== undefined) updates.f_tax_registered = company.f_tax_registered;
  if (company.employer_registered !== undefined) updates.employer_registered = company.employer_registered;
  if (company.employees_estimate) updates.employees_estimate = company.employees_estimate;
  if (company.industry_group) updates.industry_group = company.industry_group;
  if (ageDays !== null) updates.company_age_days = ageDays;
  if (company.phone_number) {
    updates.phone_number = company.phone_number;
    updates.phone_status = "has_phone";
  }
  if (company.website_url) {
    updates.website_url = company.website_url;
    updates.website_status = detectWebsiteStatus(company.website_url);
  }
  if (company.address) updates.address = company.address;
  if (company.postal_code) updates.postal_code = company.postal_code;
  if (company.city) updates.city = company.city;
  if (company.municipality) updates.municipality = company.municipality;
  if (company.county) updates.county = company.county;
  if (company.sni_code) updates.sni_code = company.sni_code;
  if (company.industry_label) updates.industry_label = company.industry_label;
  if (company.company_form) updates.company_form = company.company_form;
  if (company.registration_date) updates.registration_date = company.registration_date;

  return updates;
}

// ═══════════════════════════════════════════════════════════════
//  PROVIDER: Bolagsverket
//  Role: Primary source for newly registered companies.
//  Owned fields: company_name, org_number, registration_date,
//    company_form, address, postal_code, city, municipality, county
// ═══════════════════════════════════════════════════════════════

/** Normalize raw Bolagsverket registration record */
function normalizeBolagsverket(raw: Record<string, any>): NormalizedCompany {
  return {
    company_name: raw.namn || raw.company_name || raw.foretagsnamn || "",
    org_number: (raw.organisationsnummer || raw.org_number || raw.orgnr || "").replace(/\D/g, ""),
    registration_date: raw.registreringsdatum || raw.registration_date || null,
    company_form: raw.bolagsform || raw.company_form || null,
    address: raw.adress || raw.address || raw.gatuadress || null,
    postal_code: raw.postnummer || raw.postal_code || null,
    city: raw.postort || raw.city || null,
    municipality: raw.kommun || raw.municipality || null,
    county: raw.lan || raw.county || null,
    source_primary: "bolagsverket",
  };
}

const bolagsverketProvider: DataProvider = {
  name: "bolagsverket",
  role: "Primary source: newly registered companies, org data, addresses",
  ownedFields: [
    "company_name", "org_number", "registration_date", "company_form",
    "address", "postal_code", "city", "municipality", "county",
  ],
  async fetch(): Promise<ProviderResult> {
    const apiKey = Deno.env.get("BOLAGSVERKET_API_KEY");
    if (!apiKey) {
      console.log("[provider:bolagsverket] API key not configured – skipping.");
      return { companies: [] };
    }

    try {
      // TODO: Replace with actual Bolagsverket API endpoint
      // Example flow:
      //   const res = await fetch("https://api.bolagsverket.se/v1/registrations/new", {
      //     headers: { "Authorization": `Bearer ${apiKey}`, "Accept": "application/json" },
      //   });
      //   if (!res.ok) throw new Error(`Bolagsverket API ${res.status}`);
      //   const rawData = await res.json();
      //   return { companies: rawData.registrations.map(normalizeBolagsverket) };

      console.log("[provider:bolagsverket] Ready for integration – returning empty.");
      return { companies: [] };
    } catch (err) {
      console.error("[provider:bolagsverket] Fetch error:", err);
      throw err;
    }
  },
};

// ═══════════════════════════════════════════════════════════════
//  PROVIDER: SCB (Statistiska centralbyrån)
//  Role: Enrichment source for industry classification &
//        company structure data.
//  Owned fields: sni_code, industry_label, industry_group,
//    employees_estimate
// ═══════════════════════════════════════════════════════════════

/** Map SCB industry codes to human-readable groups */
function mapSniToIndustryGroup(sniCode: string): string {
  const prefix = sniCode.slice(0, 2);
  const groupMap: Record<string, string> = {
    "01": "Jordbruk", "02": "Skogsbruk", "03": "Fiske",
    "10": "Livsmedel", "13": "Textil", "16": "Trä & Papper",
    "25": "Tillverkning", "41": "Bygg & Installation", "42": "Bygg & Installation",
    "43": "Bygg & Installation", "45": "Detaljhandel", "46": "Detaljhandel",
    "47": "Detaljhandel", "49": "Transport", "55": "Hotell & Restaurang",
    "56": "Hotell & Restaurang", "62": "IT & Teknik", "63": "IT & Teknik",
    "64": "Finans & Försäkring", "68": "Fastighet & Service",
    "69": "Ekonomi & Juridik", "70": "Ekonomi & Juridik",
    "71": "Teknik & Arkitektur", "72": "Forskning",
    "81": "Fastighet & Service", "85": "Utbildning",
    "86": "Hälsa & Fritid", "87": "Hälsa & Fritid", "88": "Hälsa & Fritid",
    "90": "Kultur & Media", "93": "Hälsa & Fritid", "96": "Tjänster",
  };
  return groupMap[prefix] || "Övrigt";
}

/** Normalize raw SCB industry/structure record */
function normalizeScb(raw: Record<string, any>): NormalizedCompany {
  const sniCode = raw.sni_kod || raw.sni_code || raw.sni || "";
  return {
    company_name: raw.foretagsnamn || raw.company_name || "",
    org_number: (raw.organisationsnummer || raw.org_number || "").replace(/\D/g, ""),
    sni_code: sniCode || null,
    industry_label: raw.branschnamn || raw.industry_label || raw.naringsgren || null,
    industry_group: raw.industry_group || (sniCode ? mapSniToIndustryGroup(sniCode) : null),
    employees_estimate: raw.antal_anstallda || raw.employees_estimate || raw.storleksklass || null,
    source_primary: "scb",
  };
}

const scbProvider: DataProvider = {
  name: "scb",
  role: "Enrichment: industry classification (SNI), employee estimates, industry groups",
  ownedFields: ["sni_code", "industry_label", "industry_group", "employees_estimate"],
  enrichOnly: true,
  async fetch(): Promise<ProviderResult> {
    const apiKey = Deno.env.get("SCB_API_KEY");
    if (!apiKey) {
      console.log("[provider:scb] API key not configured – skipping.");
      return { companies: [] };
    }

    try {
      // TODO: Replace with actual SCB API call
      // SCB provides statistical data via their open API (https://www.scb.se/api/)
      // Example flow:
      //   const res = await fetch("https://api.scb.se/OV0104/v1/doris/sv/ssd/FDB/FDB_Bransch", {
      //     method: "POST",
      //     headers: { "Content-Type": "application/json" },
      //     body: JSON.stringify({ query: [...], response: { format: "json" } }),
      //   });
      //   if (!res.ok) throw new Error(`SCB API ${res.status}`);
      //   const rawData = await res.json();
      //   return { companies: rawData.data.map(normalizeScb) };

      console.log("[provider:scb] Ready for integration – returning empty.");
      return { companies: [] };
    } catch (err) {
      console.error("[provider:scb] Fetch error:", err);
      throw err;
    }
  },
};

// ═══════════════════════════════════════════════════════════════
//  PROVIDER: Skatteverket
//  Role: Enrichment source for tax registration status.
//  Owned fields: vat_registered, f_tax_registered,
//    employer_registered
// ═══════════════════════════════════════════════════════════════

/** Normalize raw Skatteverket tax status record */
function normalizeSkatteverket(raw: Record<string, any>): NormalizedCompany {
  // Handle various boolean representations from the API
  const toBool = (val: any): boolean | undefined => {
    if (val === undefined || val === null) return undefined;
    if (typeof val === "boolean") return val;
    const s = String(val).toLowerCase().trim();
    if (["true", "1", "ja", "yes", "j"].includes(s)) return true;
    if (["false", "0", "nej", "no", "n"].includes(s)) return false;
    return undefined;
  };

  return {
    company_name: raw.foretagsnamn || raw.company_name || raw.namn || "",
    org_number: (raw.organisationsnummer || raw.org_number || raw.orgnr || "").replace(/\D/g, ""),
    vat_registered: toBool(raw.momsregistrerad ?? raw.vat_registered ?? raw.moms),
    f_tax_registered: toBool(raw.fskatt ?? raw.f_tax_registered ?? raw.f_skatt),
    employer_registered: toBool(raw.arbetsgivare ?? raw.employer_registered ?? raw.ag_registrerad),
    source_primary: "skatteverket",
  };
}

const skatteverketProvider: DataProvider = {
  name: "skatteverket",
  role: "Enrichment: VAT registration, F-tax, employer registration status",
  ownedFields: ["vat_registered", "f_tax_registered", "employer_registered"],
  enrichOnly: true,
  async fetch(): Promise<ProviderResult> {
    const apiKey = Deno.env.get("SKATTEVERKET_API_KEY");
    if (!apiKey) {
      console.log("[provider:skatteverket] API key not configured – skipping.");
      return { companies: [] };
    }

    try {
      // TODO: Replace with actual Skatteverket API endpoint
      // Example flow:
      //   const res = await fetch("https://api.skatteverket.se/v1/registrations/status", {
      //     headers: { "Authorization": `Bearer ${apiKey}`, "Accept": "application/json" },
      //   });
      //   if (!res.ok) throw new Error(`Skatteverket API ${res.status}`);
      //   const rawData = await res.json();
      //   return { companies: rawData.companies.map(normalizeSkatteverket) };

      console.log("[provider:skatteverket] Ready for integration – returning empty.");
      return { companies: [] };
    } catch (err) {
      console.error("[provider:skatteverket] Fetch error:", err);
      throw err;
    }
  },
};

// ═══════════════════════════════════════════════════════════════
//  PROVIDER: Placeholder (dev/test sample data)
// ═══════════════════════════════════════════════════════════════

const placeholderProvider: DataProvider = {
  name: "placeholder",
  role: "Development: sample data for testing the pipeline",
  ownedFields: [],
  async fetch(): Promise<ProviderResult> {
    console.log("[provider:placeholder] Returning sample test data.");
    const now = Date.now();
    const day = 86400000;
    const companies: NormalizedCompany[] = [
      {
        company_name: "Nordisk Webbyrå AB", org_number: "5591234567",
        registration_date: new Date(now - 5 * day).toISOString().split("T")[0],
        company_form: "AB", sni_code: "62010", industry_label: "Dataprogrammering",
        industry_group: "IT & Teknik", address: "Storgatan 12", postal_code: "11122",
        city: "Stockholm", municipality: "Stockholm", county: "Stockholms län",
        website_url: "https://nordiskwebbyra.se", phone_number: "08-123 45 67",
        source_primary: "daily-import", vat_registered: true, f_tax_registered: true,
        employer_registered: true, employees_estimate: "10-19",
      },
      {
        company_name: "Malmö Kafferosteri AB", org_number: "5599876543",
        registration_date: new Date(now - 10 * day).toISOString().split("T")[0],
        company_form: "AB", sni_code: "10830", industry_label: "Framställning av kaffe och te",
        industry_group: "Livsmedel", address: "Brogatan 7", postal_code: "21143",
        city: "Malmö", municipality: "Malmö", county: "Skåne län",
        website_url: "https://www.instagram.com/malmokafferosteri", phone_number: "040-987 65 43",
        source_primary: "daily-import", vat_registered: true, f_tax_registered: true,
        employer_registered: true, employees_estimate: "5-9",
      },
      {
        company_name: "Göteborgs Städservice HB", org_number: "9691112233",
        registration_date: new Date(now - 3 * day).toISOString().split("T")[0],
        company_form: "HB", sni_code: "81210", industry_label: "Lokalvård",
        industry_group: "Fastighet & Service", address: "Vasagatan 44", postal_code: "41124",
        city: "Göteborg", municipality: "Göteborg", county: "Västra Götalands län",
        website_url: null, phone_number: "031-555 12 34",
        source_primary: "daily-import", vat_registered: true, f_tax_registered: false,
        employer_registered: false, employees_estimate: "1-4",
      },
      {
        company_name: "Uppsala Hundtrim EF", org_number: "8801015566",
        registration_date: new Date(now - 20 * day).toISOString().split("T")[0],
        company_form: "EF", sni_code: "96090", industry_label: "Övriga konsumenttjänster",
        industry_group: "Tjänster", address: "Kungsgatan 3", postal_code: "75320",
        city: "Uppsala", municipality: "Uppsala", county: "Uppsala län",
        website_url: "https://www.facebook.com/uppsalahundtrim", phone_number: null,
        source_primary: "daily-import", vat_registered: false, f_tax_registered: true,
        employer_registered: false, employees_estimate: "1",
      },
      {
        company_name: "Sundsvall El & VVS AB", org_number: "5564321098",
        registration_date: new Date(now - 7 * day).toISOString().split("T")[0],
        company_form: "AB", sni_code: "43210", industry_label: "Elinstallation",
        industry_group: "Bygg & Installation", address: "Industrivägen 18", postal_code: "85233",
        city: "Sundsvall", municipality: "Sundsvall", county: "Västernorrlands län",
        website_url: "https://sundsvallelvvs.se", phone_number: "060-12 34 56",
        source_primary: "daily-import", vat_registered: true, f_tax_registered: true,
        employer_registered: true, employees_estimate: "20-49",
      },
      {
        company_name: "Luleå Friskvård AB", org_number: "5597771234",
        registration_date: new Date(now - 2 * day).toISOString().split("T")[0],
        company_form: "AB", sni_code: "93110", industry_label: "Drift av sportanläggningar",
        industry_group: "Hälsa & Fritid", address: "Norra Strandgatan 5", postal_code: "97231",
        city: "Luleå", municipality: "Luleå", county: "Norrbottens län",
        website_url: null, phone_number: null,
        source_primary: "daily-import", vat_registered: true, f_tax_registered: true,
        employer_registered: false, employees_estimate: "5-9",
      },
      {
        company_name: "Karlstad Bygg & Tak AB", org_number: "5562229988",
        registration_date: new Date(now - 15 * day).toISOString().split("T")[0],
        company_form: "AB", sni_code: "43910", industry_label: "Takarbeten",
        industry_group: "Bygg & Installation", address: "Hamngatan 22", postal_code: "65224",
        city: "Karlstad", municipality: "Karlstad", county: "Värmlands län",
        website_url: "https://www.bokadirekt.se/karlstadbygg", phone_number: "054-22 33 44",
        source_primary: "daily-import", vat_registered: true, f_tax_registered: true,
        employer_registered: true, employees_estimate: "10-19",
      },
      {
        company_name: "Örebro Digital Redovisning AB", org_number: "5568887766",
        registration_date: new Date(now - 1 * day).toISOString().split("T")[0],
        company_form: "AB", sni_code: "69201", industry_label: "Redovisning och bokföring",
        industry_group: "Ekonomi & Juridik", address: "Drottninggatan 10", postal_code: "70211",
        city: "Örebro", municipality: "Örebro", county: "Örebro län",
        website_url: "https://orebroredovisning.se", phone_number: "019-88 77 66",
        source_primary: "daily-import", vat_registered: true, f_tax_registered: true,
        employer_registered: true, employees_estimate: "5-9",
      },
      {
        company_name: "Växjö Snickerifabrik AB", org_number: "5563334455",
        registration_date: new Date(now - 25 * day).toISOString().split("T")[0],
        company_form: "AB", sni_code: "16230", industry_label: "Tillverkning av byggnadssnickerier",
        industry_group: "Tillverkning", address: "Fabriksvägen 8", postal_code: "35246",
        city: "Växjö", municipality: "Växjö", county: "Kronobergs län",
        website_url: null, phone_number: "0470-33 44 55",
        source_primary: "daily-import", vat_registered: true, f_tax_registered: true,
        employer_registered: true, employees_estimate: "50-99",
      },
      {
        company_name: "Helsingborg Yogastudio EF", org_number: "9001019876",
        registration_date: new Date(now - 8 * day).toISOString().split("T")[0],
        company_form: "EF", sni_code: "93130", industry_label: "Gymverksamhet",
        industry_group: "Hälsa & Fritid", address: "Bruksgatan 15", postal_code: "25225",
        city: "Helsingborg", municipality: "Helsingborg", county: "Skåne län",
        website_url: "https://linktr.ee/hbgyoga", phone_number: null,
        source_primary: "daily-import", vat_registered: false, f_tax_registered: true,
        employer_registered: false, employees_estimate: "1",
      },
      {
        company_name: "Linköping AI Solutions AB", org_number: "5565556677",
        registration_date: new Date(now - 4 * day).toISOString().split("T")[0],
        company_form: "AB", sni_code: "62020", industry_label: "Datakonsultverksamhet",
        industry_group: "IT & Teknik", address: "Teknikringen 1", postal_code: "58330",
        city: "Linköping", municipality: "Linköping", county: "Östergötlands län",
        website_url: "https://linkopingai.se", phone_number: "013-55 66 77",
        source_primary: "daily-import", vat_registered: true, f_tax_registered: true,
        employer_registered: true, employees_estimate: "10-19",
      },
      {
        company_name: "Norrköping Blommor & Trädgård EF", org_number: "7805054321",
        registration_date: new Date(now - 12 * day).toISOString().split("T")[0],
        company_form: "EF", sni_code: "47761", industry_label: "Blomsterhandel",
        industry_group: "Detaljhandel", address: "Blomstervägen 2", postal_code: "60228",
        city: "Norrköping", municipality: "Norrköping", county: "Östergötlands län",
        website_url: null, phone_number: null,
        source_primary: "daily-import", vat_registered: true, f_tax_registered: false,
        employer_registered: false, employees_estimate: "1",
      },
    ];
    return { companies };
  },
};

// ═══════════════════════════════════════════════════════════════
// Change detection engine
// ═══════════════════════════════════════════════════════════════

function detectChanges(
  existing: Record<string, any>,
  incoming: NormalizedCompany,
  providerName: string,
): { events: any[]; addressChanged: boolean } {
  const events: any[] = [];
  const today = new Date().toISOString().split("T")[0];
  let addressChanged = false;

  if (incoming.f_tax_registered === true && existing.f_tax_registered !== true) {
    events.push({
      company_id: existing.id, event_type: "f_tax_registered", event_date: today,
      event_source: providerName,
      event_label: `${incoming.company_name || existing.company_name} fick F-skattsedel`,
    });
  }
  if (incoming.vat_registered === true && existing.vat_registered !== true) {
    events.push({
      company_id: existing.id, event_type: "vat_registered", event_date: today,
      event_source: providerName,
      event_label: `${incoming.company_name || existing.company_name} momsregistrerades`,
    });
  }
  if (incoming.employer_registered === true && existing.employer_registered !== true) {
    events.push({
      company_id: existing.id, event_type: "employer_registered", event_date: today,
      event_source: providerName,
      event_label: `${incoming.company_name || existing.company_name} registrerades som arbetsgivare`,
    });
  }
  if (incoming.address && existing.address && incoming.address !== existing.address) {
    addressChanged = true;
    events.push({
      company_id: existing.id, event_type: "address_changed", event_date: today,
      event_source: providerName,
      event_label: `${incoming.company_name || existing.company_name} bytte adress`,
      event_payload: { old_address: existing.address, new_address: incoming.address },
    });
  }
  if (incoming.employees_estimate && existing.employees_estimate &&
      incoming.employees_estimate !== existing.employees_estimate) {
    events.push({
      company_id: existing.id, event_type: "employee_count_updated", event_date: today,
      event_source: providerName,
      event_label: `${incoming.company_name || existing.company_name} ändrade antal anställda`,
      event_payload: { old: existing.employees_estimate, new: incoming.employees_estimate },
    });
  }

  return { events, addressChanged };
}

// ═══════════════════════════════════════════════════════════════
// Provider registry
// ═══════════════════════════════════════════════════════════════

const PROVIDERS: DataProvider[] = [
  bolagsverketProvider,
  scbProvider,
  skatteverketProvider,
  placeholderProvider,
];

// ═══════════════════════════════════════════════════════════════
// Main handler
// ═══════════════════════════════════════════════════════════════

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  let requestedProvider: string | null = null;
  try {
    const body = await req.json();
    requestedProvider = body?.provider ?? null;
  } catch { /* no body – run all */ }

  const providersToRun = requestedProvider
    ? PROVIDERS.filter((p) => p.name === requestedProvider)
    : PROVIDERS;

  const perProviderResults: Record<string, {
    fetched: number; imported: number; enriched: number;
    duplicates: number; skipped: number; role: string; error?: string;
  }> = {};

  let totalImported = 0;
  let totalEnriched = 0;
  let totalDuplicates = 0;
  let totalSkipped = 0;
  let totalFetched = 0;

  for (const provider of providersToRun) {
    let provImported = 0;
    let provEnriched = 0;
    let provDuplicates = 0;
    let provSkipped = 0;
    let provFetched = 0;
    let provError: string | undefined;

    console.log(`[daily-import][${provider.name}] Starting — role: ${provider.role}`);

    try {
      const result = await provider.fetch();
      const companies = result.companies;
      provFetched = companies.length;

      for (const company of companies) {
        if (!company.company_name && !company.org_number) {
          provSkipped++;
          continue;
        }

        // ── Enrich-only providers ──
        if (provider.enrichOnly) {
          if (!company.org_number) { provSkipped++; continue; }

          const { data: existingRows } = await supabase
            .from("companies")
            .select("id, company_name, vat_registered, f_tax_registered, employer_registered, employees_estimate, address, city, postal_code")
            .eq("org_number", company.org_number)
            .limit(1);

          if (!existingRows || existingRows.length === 0) { provSkipped++; continue; }

          const existing = existingRows[0];
          const enrichData = buildEnrichRecord(company);
          if (Object.keys(enrichData).length === 0) { provSkipped++; continue; }

          const { events, addressChanged } = detectChanges(existing, company, provider.name);
          if (addressChanged) {
            enrichData.last_address_change_date = new Date().toISOString().split("T")[0];
          }

          const { error } = await supabase
            .from("companies")
            .update(enrichData)
            .eq("org_number", company.org_number);

          if (error) {
            console.error(`[daily-import][${provider.name}] Enrich error for ${company.org_number}:`, error.message);
            provSkipped++;
          } else {
            provEnriched++;
            if (events.length > 0) {
              await supabase.from("company_events").insert(events).then(({ error: evErr }) => {
                if (evErr) console.error(`[daily-import][${provider.name}] Event error:`, evErr.message);
              });
            }
          }
          continue;
        }

        // ── Insert providers: dedup by org_number ──
        let isDuplicate = false;
        if (company.org_number) {
          const { data: existingRows } = await supabase
            .from("companies")
            .select("id, company_name, vat_registered, f_tax_registered, employer_registered, employees_estimate, address")
            .eq("org_number", company.org_number)
            .limit(1);
          if (existingRows && existingRows.length > 0) {
            const existing = existingRows[0];
            const enrichData = buildEnrichRecord(company);
            if (Object.keys(enrichData).length > 0) {
              const { events, addressChanged } = detectChanges(existing, company, provider.name);
              if (addressChanged) {
                enrichData.last_address_change_date = new Date().toISOString().split("T")[0];
              }
              await supabase.from("companies").update(enrichData).eq("org_number", company.org_number);
              if (events.length > 0) {
                await supabase.from("company_events").insert(events).then(({ error: evErr }) => {
                  if (evErr) console.error(`[daily-import][${provider.name}] Event error:`, evErr.message);
                });
              }
              provEnriched++;
            }
            isDuplicate = true;
          }
        } else if (company.company_name) {
          let q = supabase.from("companies").select("id").eq("company_name", company.company_name);
          if (company.city) q = q.eq("city", company.city);
          const { data: existing } = await q.limit(1);
          if (existing && existing.length > 0) isDuplicate = true;
        }

        if (isDuplicate) { provDuplicates++; continue; }

        // ── New company insertion ──
        const record = buildInsertRecord(company, provider.name);
        const { data: inserted, error } = await supabase.from("companies").insert(record).select("id").single();
        if (error) {
          console.error(`[daily-import][${provider.name}] Insert error:`, error.message);
          provSkipped++;
        } else {
          provImported++;
          const events: any[] = [
            {
              company_id: inserted.id, event_type: "company_registered",
              event_date: company.registration_date || new Date().toISOString().split("T")[0],
              event_source: provider.name,
              event_label: `${company.company_name} registrerades`,
              event_payload: { org_number: company.org_number, city: company.city, industry_label: company.industry_label },
            },
          ];
          if (company.vat_registered) {
            events.push({ company_id: inserted.id, event_type: "vat_registered",
              event_date: company.registration_date || new Date().toISOString().split("T")[0],
              event_source: provider.name, event_label: `${company.company_name} momsregistrerades` });
          }
          if (company.f_tax_registered) {
            events.push({ company_id: inserted.id, event_type: "f_tax_registered",
              event_date: company.registration_date || new Date().toISOString().split("T")[0],
              event_source: provider.name, event_label: `${company.company_name} fick F-skattsedel` });
          }
          if (company.employer_registered) {
            events.push({ company_id: inserted.id, event_type: "employer_registered",
              event_date: company.registration_date || new Date().toISOString().split("T")[0],
              event_source: provider.name, event_label: `${company.company_name} registrerades som arbetsgivare` });
          }
          await supabase.from("company_events").insert(events).then(({ error: evErr }) => {
            if (evErr) console.error(`[daily-import][${provider.name}] Event insert error:`, evErr.message);
          });
        }
      }
    } catch (err) {
      provError = String(err);
      console.error(`[daily-import][${provider.name}] Error:`, err);
    }

    perProviderResults[provider.name] = {
      fetched: provFetched, imported: provImported, enriched: provEnriched,
      duplicates: provDuplicates, skipped: provSkipped, role: provider.role,
      error: provError,
    };

    totalFetched += provFetched;
    totalImported += provImported;
    totalEnriched += provEnriched;
    totalDuplicates += provDuplicates;
    totalSkipped += provSkipped;

    // Log provider run to imports table
    await supabase.from("imports").insert({
      file_name: `daily-import-${provider.name}-${new Date().toISOString().split("T")[0]}`,
      user_id: "00000000-0000-0000-0000-000000000000",
      imported_rows: provImported,
      fetched_rows: provFetched,
      skipped_rows: provSkipped,
      duplicate_rows: provDuplicates,
      status: provError ? "failed" : "completed",
      source_name: provider.name,
      error_message: provError || null,
    }).then(({ error }) => {
      if (error) console.error(`[daily-import] Log error for ${provider.name}:`, error.message);
    });
  }

  const response = {
    success: true,
    total: totalFetched,
    imported: totalImported,
    enriched: totalEnriched,
    duplicates: totalDuplicates,
    skipped: totalSkipped,
    providers: perProviderResults,
  };

  console.log("[daily-import] Result:", JSON.stringify(response));

  return new Response(JSON.stringify(response), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
