import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import ScrollReveal from './ScrollReveal';

export default function ContactForm() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    // Simulate send — replace with edge function / email service later
    await new Promise((r) => setTimeout(r, 800));
    toast({
      title: 'Meddelande skickat!',
      description: 'Vi återkommer inom 24 timmar.',
    });
    setName('');
    setEmail('');
    setMessage('');
    setLoading(false);
  };

  const inputStyle: React.CSSProperties = {
    background: '#fff',
    borderColor: '#d5d0c6',
    color: '#2c2a25',
    boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
  };

  return (
    <section className="py-24 px-6 lg:px-12" style={{ background: '#EFECE6' }}>
      <div className="max-w-lg mx-auto">
        <ScrollReveal>
          <h2
            className="text-3xl lg:text-4xl font-serif text-center mb-3"
            style={{ color: '#2c2a25', fontFamily: '"Georgia", serif' }}
          >
            Har du frågor?
          </h2>
          <p className="text-base text-center mb-10" style={{ color: '#8a8578' }}>
            Vi svarar inom 24&nbsp;h
          </p>
        </ScrollReveal>

        <ScrollReveal delay={0.1}>
          <form onSubmit={handleSubmit} className="space-y-4">
            <input
              type="text"
              placeholder="Ditt namn"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              maxLength={100}
              className="w-full h-12 px-4 rounded-full border text-sm outline-none transition-shadow focus:ring-2"
              style={inputStyle}
              onFocus={(e) => (e.currentTarget.style.borderColor = '#2d9f8f')}
              onBlur={(e) => (e.currentTarget.style.borderColor = '#d5d0c6')}
            />
            <input
              type="email"
              placeholder="E-postadress"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              maxLength={255}
              className="w-full h-12 px-4 rounded-full border text-sm outline-none transition-shadow focus:ring-2"
              style={inputStyle}
              onFocus={(e) => (e.currentTarget.style.borderColor = '#2d9f8f')}
              onBlur={(e) => (e.currentTarget.style.borderColor = '#d5d0c6')}
            />
            <textarea
              placeholder="Ditt meddelande"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              required
              maxLength={1000}
              rows={4}
              className="w-full px-5 py-4 rounded-2xl border text-sm outline-none transition-shadow focus:ring-2 resize-none"
              style={inputStyle}
              onFocus={(e) => (e.currentTarget.style.borderColor = '#2d9f8f')}
              onBlur={(e) => (e.currentTarget.style.borderColor = '#d5d0c6')}
            />
            <button
              type="submit"
              disabled={loading}
              className="w-full h-12 rounded-full text-sm font-semibold text-white transition-all hover:opacity-90 disabled:opacity-50"
              style={{ background: '#2d9f8f' }}
            >
              {loading ? 'Skickar...' : 'Skicka meddelande'}
            </button>
          </form>
        </ScrollReveal>
      </div>
    </section>
  );
}
