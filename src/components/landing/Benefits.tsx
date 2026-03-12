import { Zap, BarChart3, Bell } from 'lucide-react';
import ScrollReveal from './ScrollReveal';

const benefits = [
  {
    icon: Zap,
    title: 'Alltid först på plats',
    desc: 'Få tillgång till nya bolag innan de ens hunnit kontaktas av konkurrenter.',
  },
  {
    icon: BarChart3,
    title: 'Smart lead-scoring',
    desc: 'Varje lead poängsätts automatiskt så du vet vem du ska ringa först.',
  },
  {
    icon: Bell,
    title: 'Bevakningar & alerts',
    desc: 'Sätt upp filter en gång och få notiser när rätt bolag dyker upp.',
  },
];

export default function Benefits() {
  return (
    <section className="py-24 px-6 lg:px-12" style={{ background: '#EFECE6' }}>
      <div className="max-w-5xl mx-auto">
        <ScrollReveal>
          <h2 className="text-3xl lg:text-4xl font-serif text-center mb-16" style={{ color: '#2c2a25', fontFamily: '"Georgia", serif' }}>
            Varför LeadRadar?
          </h2>
        </ScrollReveal>
        <div className="grid md:grid-cols-3 gap-8">
          {benefits.map((b, i) => (
            <ScrollReveal key={i} delay={i * 0.15}>
              <div className="rounded-2xl p-8 border border-black/[0.05] bg-white h-full">
                <div className="w-14 h-14 rounded-xl flex items-center justify-center mb-6" style={{ background: '#e8f5f2' }}>
                  <b.icon className="w-6 h-6" style={{ color: '#2d9f8f' }} />
                </div>
                <h3 className="text-lg font-semibold mb-3" style={{ color: '#2c2a25' }}>{b.title}</h3>
                <p className="text-sm leading-relaxed" style={{ color: '#8a8578' }}>{b.desc}</p>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
}
