import ScrollReveal from './ScrollReveal';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

const faqs = [
  {
    q: 'Hur ofta uppdateras leads?',
    a: 'Vårt system bevakar nya bolagsregistreringar dagligen. Du får nya leads samma dag de registreras hos Bolagsverket.',
  },
  {
    q: 'Kan jag exportera till mitt CRM?',
    a: 'Ja! Du kan exportera leads som CSV och enkelt importera dem i valfritt CRM-system.',
  },
  {
    q: 'Vad är skillnaden på planerna?',
    a: 'Planerna skiljer sig i antal leads per månad, antal bevakningar och tillgång till avancerade filter och lead-scoring. Se vår prissättning ovan för detaljer.',
  },
  {
    q: 'Kan jag avsluta när som helst?',
    a: 'Absolut. Inga bindningstider — du kan uppgradera, nedgradera eller avsluta din plan när du vill.',
  },
];

export default function Faq() {
  return (
    <section className="py-24 px-6 lg:px-12" style={{ background: '#F5F0E8' }}>
      <div className="max-w-2xl mx-auto">
        <ScrollReveal>
          <h2
            className="text-3xl lg:text-4xl font-serif text-center mb-12"
            style={{ color: '#2c2a25', fontFamily: '"Georgia", serif' }}
          >
            Vanliga frågor
          </h2>
        </ScrollReveal>
        <ScrollReveal delay={0.1}>
          <Accordion type="single" collapsible className="space-y-3">
            {faqs.map((f, i) => (
              <AccordionItem
                key={i}
                value={`faq-${i}`}
                className="rounded-2xl border border-black/[0.05] bg-white px-6 overflow-hidden"
                style={{ borderBottom: 'none' }}
              >
                <AccordionTrigger
                  className="text-left text-[15px] font-semibold py-5 hover:no-underline"
                  style={{ color: '#2c2a25' }}
                >
                  {f.q}
                </AccordionTrigger>
                <AccordionContent
                  className="text-sm leading-relaxed pb-5"
                  style={{ color: '#8a8578' }}
                >
                  {f.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </ScrollReveal>
      </div>
    </section>
  );
}
