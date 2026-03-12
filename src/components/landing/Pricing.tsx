import { Check } from 'lucide-react';
import ScrollReveal from './ScrollReveal';

const plans = [
  {
    name: 'Starter',
    price: '990',
    features: ['100 leads/månad', 'Grundläggande filter', 'E-postexport', '1 bevakning'],
    highlighted: false,
  },
  {
    name: 'Pro',
    price: '2 490',
    features: ['500 leads/månad', 'Avancerade filter', 'Lead-scoring', '10 bevakningar', 'API-åtkomst'],
    highlighted: true,
  },
  {
    name: 'Enterprise',
    price: '5 990',
    features: ['Obegränsade leads', 'Alla filter & scoring', 'Prioriterad support', 'Obegränsade bevakningar', 'Dedikerad kontakt'],
    highlighted: false,
  },
];

interface PricingProps {
  onSignUp: () => void;
}

export default function Pricing({ onSignUp }: PricingProps) {
  return (
    <section className="py-24 px-6 lg:px-12" style={{ background: '#F5F0E8' }}>
      <div className="max-w-5xl mx-auto text-center">
        <ScrollReveal>
          <h2 className="text-3xl lg:text-4xl font-serif mb-4" style={{ color: '#2c2a25', fontFamily: '"Georgia", serif' }}>
            Enkel & transparent prissättning
          </h2>
          <p className="text-base mb-16 max-w-lg mx-auto" style={{ color: '#8a8578' }}>
            Välj den plan som passar ditt behov
          </p>
        </ScrollReveal>
        <div className="grid md:grid-cols-3 gap-8">
          {plans.map((p, i) => (
            <ScrollReveal key={p.name} delay={i * 0.15}>
              <div
                className="rounded-2xl p-8 border text-left flex flex-col h-full"
                style={{
                  background: p.highlighted ? '#2c2a25' : '#fff',
                  borderColor: p.highlighted ? '#2c2a25' : 'rgba(0,0,0,0.05)',
                }}
              >
                <span className="text-sm font-medium mb-1" style={{ color: p.highlighted ? '#9a9488' : '#8a8578' }}>
                  {p.name}
                </span>
                <div className="flex items-baseline gap-1 mb-6">
                  <span className="text-4xl font-bold" style={{ color: p.highlighted ? '#fff' : '#2c2a25' }}>
                    {p.price}
                  </span>
                  <span className="text-sm" style={{ color: p.highlighted ? '#9a9488' : '#8a8578' }}>
                    kr/mån
                  </span>
                </div>
                <ul className="space-y-3 mb-8 flex-1">
                  {p.features.map((f) => (
                    <li key={f} className="flex items-center gap-2.5 text-sm" style={{ color: p.highlighted ? '#d5d0c6' : '#5c5850' }}>
                      <Check className="w-4 h-4 shrink-0" style={{ color: '#2d9f8f' }} />
                      {f}
                    </li>
                  ))}
                </ul>
                <button
                  onClick={onSignUp}
                  className="w-full h-12 rounded-full text-sm font-semibold transition-all hover:opacity-90"
                  style={{
                    background: p.highlighted ? '#2d9f8f' : '#efece6',
                    color: p.highlighted ? '#fff' : '#2c2a25',
                  }}
                >
                  Kom igång
                </button>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
}
