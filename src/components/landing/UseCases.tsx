import { Globe, PhoneCall, Calculator, Wrench } from 'lucide-react';
import ScrollReveal from './ScrollReveal';

const cases = [
  {
    icon: Globe,
    title: 'Webbyråer',
    desc: 'Hitta företag utan hemsida och erbjud dem en professionell närvaro online.',
  },
  {
    icon: PhoneCall,
    title: 'Säljteam',
    desc: 'Var först med att kontakta nyregistrerade bolag innan konkurrenterna hinner.',
  },
  {
    icon: Calculator,
    title: 'Redovisningsbyråer',
    desc: 'Nå nya företagare som behöver hjälp med bokföring och ekonomi.',
  },
  {
    icon: Wrench,
    title: 'Hantverkare & service',
    desc: 'Väx lokalt genom att hitta nya bolag i ditt område som behöver dina tjänster.',
  },
];

export default function UseCases() {
  return (
    <section className="py-24 px-6 lg:px-12" style={{ background: '#F5F0E8' }}>
      <div className="max-w-5xl mx-auto">
        <ScrollReveal>
          <h2
            className="text-3xl lg:text-4xl font-serif text-center mb-4"
            style={{ color: '#2c2a25', fontFamily: '"Georgia", serif' }}
          >
            Vilka använder LeadRadar?
          </h2>
          <p className="text-base text-center mb-16 max-w-lg mx-auto" style={{ color: '#8a8578' }}>
            Företag i alla branscher som vill hitta nya kunder snabbare
          </p>
        </ScrollReveal>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {cases.map((c, i) => (
            <ScrollReveal key={i} delay={i * 0.1}>
              <div className="rounded-2xl p-7 border border-black/[0.05] bg-white h-full">
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center mb-5"
                  style={{ background: '#e8f5f2' }}
                >
                  <c.icon className="w-5 h-5" style={{ color: '#2d9f8f' }} />
                </div>
                <h3 className="text-base font-semibold mb-2" style={{ color: '#2c2a25' }}>
                  {c.title}
                </h3>
                <p className="text-sm leading-relaxed" style={{ color: '#8a8578' }}>
                  {c.desc}
                </p>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
}
