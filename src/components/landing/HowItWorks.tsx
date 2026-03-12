import { Radio, SlidersHorizontal, Rocket } from 'lucide-react';
import ScrollReveal from './ScrollReveal';

const steps = [
  {
    icon: Radio,
    title: 'Realtidsbevakning',
    desc: 'Vi bevakar nya bolagsregistreringar i Sverige i realtid.',
  },
  {
    icon: SlidersHorizontal,
    title: 'Filtrera & matcha',
    desc: 'Du filtrerar på bransch, stad och bolagsform.',
  },
  {
    icon: Rocket,
    title: 'Leads samma dag',
    desc: 'Du får kvalificerade leads direkt i appen samma dag de startar.',
  },
];

export default function HowItWorks() {
  return (
    <section className="py-24 px-6 lg:px-12" style={{ background: '#F5F0E8' }}>
      <div className="max-w-5xl mx-auto text-center">
        <ScrollReveal>
          <h2 className="text-3xl lg:text-4xl font-serif mb-4" style={{ color: '#2c2a25', fontFamily: '"Georgia", serif' }}>
            Hur det fungerar
          </h2>
          <p className="text-base mb-16 max-w-lg mx-auto" style={{ color: '#8a8578' }}>
            Tre enkla steg till dina nästa kunder
          </p>
        </ScrollReveal>
        <div className="grid md:grid-cols-3 gap-10">
          {steps.map((s, i) => (
            <ScrollReveal key={i} delay={i * 0.15}>
              <div className="flex flex-col items-center text-center">
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-5" style={{ background: '#e8f5f2' }}>
                  <s.icon className="w-7 h-7" style={{ color: '#2d9f8f' }} />
                </div>
                <div className="text-sm font-bold mb-1 rounded-full px-3 py-0.5 w-fit mx-auto" style={{ background: '#efece6', color: '#8a8578' }}>
                  Steg {i + 1}
                </div>
                <h3 className="text-lg font-semibold mt-3 mb-2" style={{ color: '#2c2a25' }}>{s.title}</h3>
                <p className="text-sm leading-relaxed max-w-xs mx-auto" style={{ color: '#8a8578' }}>{s.desc}</p>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
}
