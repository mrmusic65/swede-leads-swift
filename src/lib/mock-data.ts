export type WebsiteStatus = 'has_website' | 'social_only' | 'no_website_found' | 'unknown';
export type PhoneStatus = 'has_phone' | 'missing' | 'unknown';

export interface Company {
  id: string;
  company_name: string;
  org_number: string;
  registration_date: string;
  company_form: string;
  sni_code: string;
  industry_label: string;
  address: string;
  postal_code: string;
  city: string;
  municipality: string;
  county: string;
  website_url: string | null;
  website_status: WebsiteStatus;
  phone_number: string | null;
  phone_status: PhoneStatus;
  source_primary: string;
  lead_score: number;
  created_at: string;
  updated_at: string;
}

export interface Note {
  id: string;
  company_id: string;
  content: string;
  created_at: string;
}

const cities = ['Stockholm', 'Göteborg', 'Malmö', 'Uppsala', 'Linköping', 'Västerås', 'Örebro', 'Helsingborg', 'Jönköping', 'Norrköping', 'Lund', 'Umeå'];
const counties = ['Stockholms län', 'Västra Götalands län', 'Skåne län', 'Uppsala län', 'Östergötlands län', 'Västmanlands län', 'Örebro län'];
const industries = ['Restaurang & Café', 'Bygg & Renovation', 'Frisör & Skönhet', 'Städ & Facility', 'Konsult & IT', 'Handel & E-handel', 'Transport & Logistik', 'Hälsa & Träning', 'Juridik & Ekonomi', 'Fastighet & Mäkleri'];
const companyForms = ['AB', 'Enskild firma', 'HB', 'KB'];
const sniCodes = ['56100', '43210', '96021', '81210', '62010', '47190', '49410', '93130', '69100', '68310'];

function randomFrom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomDate(daysBack: number): string {
  const d = new Date();
  d.setDate(d.getDate() - Math.floor(Math.random() * daysBack));
  return d.toISOString().split('T')[0];
}

function generateCompany(i: number): Company {
  const city = randomFrom(cities);
  const industry = randomFrom(industries);
  const industryIndex = industries.indexOf(industry);
  const websiteStatuses: WebsiteStatus[] = ['no_website_found', 'no_website_found', 'no_website_found', 'social_only', 'social_only', 'has_website', 'unknown'];
  const ws = randomFrom(websiteStatuses);
  const phoneStatuses: PhoneStatus[] = ['has_phone', 'has_phone', 'missing', 'unknown'];
  const ps = randomFrom(phoneStatuses);
  const regDate = randomDate(90);
  const daysSinceReg = Math.floor((Date.now() - new Date(regDate).getTime()) / (1000 * 60 * 60 * 24));

  let score = 0;
  if (daysSinceReg <= 30) score += 30;
  else if (daysSinceReg <= 60) score += 15;
  if (ws === 'no_website_found') score += 40;
  else if (ws === 'social_only') score += 20;
  if (ps === 'has_phone') score += 15;
  if (['Restaurang & Café', 'Bygg & Renovation', 'Frisör & Skönhet', 'Städ & Facility', 'Hälsa & Träning'].includes(industry)) score += 15;

  return {
    id: `comp-${i.toString().padStart(4, '0')}`,
    company_name: `${randomFrom(['Nya', 'Svenska', 'Norra', 'Söder', 'Väst', 'Öst'])} ${industry.split(' ')[0]} ${randomFrom(['AB', 'Stockholm', 'Gruppen', 'Service', 'Partner', 'Nordic'])}`,
    org_number: `${5561000000 + i}`,
    registration_date: regDate,
    company_form: randomFrom(companyForms),
    sni_code: sniCodes[industryIndex] || '62010',
    industry_label: industry,
    address: `${randomFrom(['Storgatan', 'Kungsgatan', 'Drottninggatan', 'Vasagatan', 'Sveavägen'])} ${Math.floor(Math.random() * 100) + 1}`,
    postal_code: `${Math.floor(Math.random() * 90000) + 10000}`,
    city,
    municipality: city,
    county: randomFrom(counties),
    website_url: ws === 'has_website' ? `https://www.example-${i}.se` : ws === 'social_only' ? `https://instagram.com/company${i}` : null,
    website_status: ws,
    phone_number: ps === 'has_phone' ? `070-${Math.floor(Math.random() * 9000000) + 1000000}` : null,
    phone_status: ps,
    source_primary: 'Bolagsverket',
    lead_score: Math.min(score, 100),
    created_at: regDate,
    updated_at: new Date().toISOString(),
  };
}

export const mockCompanies: Company[] = Array.from({ length: 80 }, (_, i) => generateCompany(i + 1));

export const mockNotes: Note[] = [
  { id: 'n1', company_id: 'comp-0001', content: 'Kontaktad via telefon, intresserad av offert.', created_at: '2026-03-07T10:30:00Z' },
  { id: 'n2', company_id: 'comp-0001', content: 'Skickat offert på hemsida, väntar svar.', created_at: '2026-03-08T14:00:00Z' },
  { id: 'n3', company_id: 'comp-0003', content: 'Ingen svar på samtal.', created_at: '2026-03-06T09:00:00Z' },
];

// Dashboard stats
export function getDashboardStats() {
  const now = new Date();
  const thirtyDaysAgo = new Date(now);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const newLast30 = mockCompanies.filter(c => new Date(c.registration_date) >= thirtyDaysAgo).length;
  const noWebsite = mockCompanies.filter(c => c.website_status === 'no_website_found').length;
  const socialOnly = mockCompanies.filter(c => c.website_status === 'social_only').length;
  const highestScore = Math.max(...mockCompanies.map(c => c.lead_score));

  const industryCounts: Record<string, number> = {};
  const cityCounts: Record<string, number> = {};
  mockCompanies.forEach(c => {
    industryCounts[c.industry_label] = (industryCounts[c.industry_label] || 0) + 1;
    cityCounts[c.city] = (cityCounts[c.city] || 0) + 1;
  });

  const topIndustries = Object.entries(industryCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, count]) => ({ name, count }));

  const topCities = Object.entries(cityCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, count]) => ({ name, count }));

  return { newLast30, noWebsite, socialOnly, highestScore, topIndustries, topCities };
}
