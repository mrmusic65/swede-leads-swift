import { Check } from 'lucide-react';
import ScrollReveal from './ScrollReveal';

const advantages = [
  'Spara 5+ timmar i veckan på manuell prospektering',
  'Kontakta bolag inom 48 timmar från registrering',
  'Filtrera på bransch, stad och bolagsform',
  'Automatiska alerts när rätt bolag dyker upp',
];

export default function ConcreteAdvantages() {
  return (
    <section className="py-24 px-6 lg:px-12" style={{ background: '#EFECE6' }}>
      <div className="max-w-3xl mx-auto">
        <ScrollReveal>
          <h2
            className="text-3xl lg:text-4xl font-serif text-center mb-12"
            style={{ color: '#2c2a25', fontFamily: '"Georgia", serif' }}
          >
            Konkreta fördelar
          </h2>
        </ScrollReveal>
        <div className="space-y-5">
          {advantages.map((a, i) => (
            <ScrollReveal key={i} delay={i * 0.1}>
              <div className="flex items-start gap-4 rounded-2xl bg-white border border-black/[0.05] p-6">
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5"
                  style={{ background: '#e8f5f2' }}
                >
                  <Check className="w-4 h-4" style={{ color: '#2d9f8f' }} />
                </div>
                <span className="text-base font-medium" style={{ color: '#2c2a25' }}>
                  {a}
                </span>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
}
