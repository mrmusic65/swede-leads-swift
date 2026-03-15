import { useMemo } from 'react';
import { Check, Minus } from 'lucide-react';
import type { Company } from '@/lib/api';

const LOCAL_INDUSTRIES = [
  'Restaurang & Café', 'Bygg & Renovation', 'Frisör & Skönhet',
  'Städ & Facility', 'Hälsa & Träning', 'Bilverkstad & Motor',
  'Hemtjänst & Omsorg', 'Trädgård & Markarbete', 'El & VVS',
  'Flyttfirma', 'Målare & Tapetserare', 'Tandvård', 'Veterinär',
];

interface Criterion {
  label: string;
  points: number;
  met: boolean;
}

export function getScoreCriteria(c: Company): Criterion[] {
  const criteria: Criterion[] = [];

  // Registration recency
  let regMet = false;
  if (c.registration_date) {
    const days = Math.floor((Date.now() - new Date(c.registration_date).getTime()) / (1000 * 60 * 60 * 24));
    regMet = days <= 30;
  }
  criteria.push({ label: 'Nyregistrerat (≤30 dagar)', points: 40, met: regMet });

  // Local service industry
  const industryMet = !!(c.industry_label && LOCAL_INDUSTRIES.includes(c.industry_label));
  criteria.push({ label: 'Lokal tjänstebransch', points: 30, met: industryMet });

  // No website
  const noWebMet = c.website_status === 'no_website_found';
  criteria.push({ label: 'Ingen hemsida', points: 25, met: noWebMet });

  // Social only
  const socialMet = c.website_status === 'social_only';
  criteria.push({ label: 'Bara sociala medier', points: 15, met: socialMet && !noWebMet });

  // Has phone
  const phoneMet = c.phone_status === 'has_phone';
  criteria.push({ label: 'Har telefonnummer', points: 10, met: phoneMet });

  return criteria;
}

export default function ScoreGauge({ score, company }: { score: number; company: Company }) {
  const criteria = useMemo(() => getScoreCriteria(company), [company]);

  // Half-circle SVG gauge
  const radius = 70;
  const strokeWidth = 10;
  const circumference = Math.PI * radius; // half circle
  const progress = Math.min(score / 100, 1);
  const dashOffset = circumference * (1 - progress);

  const color =
    score >= 80 ? 'hsl(172, 66%, 40%)' :
    score >= 60 ? 'hsl(45, 93%, 58%)' :
    score >= 40 ? 'hsl(30, 90%, 55%)' :
    'hsl(0, 0%, 70%)';

  return (
    <div className="space-y-5">
      {/* Gauge */}
      <div className="flex flex-col items-center">
        <svg width="160" height="90" viewBox="0 0 160 90">
          {/* Background arc */}
          <path
            d="M 10 85 A 70 70 0 0 1 150 85"
            fill="none"
            stroke="hsl(var(--muted))"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
          />
          {/* Progress arc */}
          <path
            d="M 10 85 A 70 70 0 0 1 150 85"
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
            style={{ transition: 'stroke-dashoffset 0.8s ease-out, stroke 0.3s' }}
          />
          {/* Score text */}
          <text x="80" y="75" textAnchor="middle" className="fill-foreground text-2xl font-bold" style={{ fontSize: 28 }}>
            {score}
          </text>
          <text x="80" y="88" textAnchor="middle" className="fill-muted-foreground" style={{ fontSize: 10 }}>
            / 100
          </text>
        </svg>
      </div>

      {/* Criteria list */}
      <ul className="space-y-2">
        {criteria.map((c, i) => (
          <li key={i} className="flex items-center gap-2.5">
            <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${
              c.met ? 'bg-emerald-500/15 text-emerald-600' : 'bg-muted text-muted-foreground/50'
            }`}>
              {c.met ? <Check className="w-3 h-3" /> : <Minus className="w-3 h-3" />}
            </div>
            <span className={`text-sm flex-1 ${c.met ? 'text-foreground' : 'text-muted-foreground'}`}>
              {c.label}
            </span>
            <span className={`text-xs font-semibold tabular-nums ${c.met ? 'text-emerald-600' : 'text-muted-foreground/50'}`}>
              {c.met ? `+${c.points}` : '0'}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
