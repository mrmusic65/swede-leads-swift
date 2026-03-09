import { useParams, Link } from 'react-router-dom';
import { useState } from 'react';
import { mockCompanies, mockNotes, type Note } from '@/lib/mock-data';
import ScoreBadge from '@/components/ScoreBadge';
import WebsiteStatusBadge from '@/components/WebsiteStatusBadge';
import PhoneStatusBadge from '@/components/PhoneStatusBadge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, Mail, MessageSquare, Monitor, Building2, MapPin, Calendar, Phone, Globe, Hash, Briefcase, StickyNote } from 'lucide-react';

export default function LeadDetail() {
  const { id } = useParams();
  const company = mockCompanies.find(c => c.id === id);
  const [notes, setNotes] = useState<Note[]>(mockNotes.filter(n => n.company_id === id));
  const [newNote, setNewNote] = useState('');

  if (!company) {
    return (
      <div className="text-center py-20">
        <p className="text-muted-foreground">Bolaget hittades inte.</p>
        <Link to="/leads" className="text-primary hover:underline text-sm mt-2 inline-block">Tillbaka till leads</Link>
      </div>
    );
  }

  const addNote = () => {
    if (!newNote.trim()) return;
    setNotes(prev => [...prev, { id: `n-${Date.now()}`, company_id: company.id, content: newNote, created_at: new Date().toISOString() }]);
    setNewNote('');
  };

  const scoreExplanation = [];
  const daysSinceReg = Math.floor((Date.now() - new Date(company.registration_date).getTime()) / (1000 * 60 * 60 * 24));
  if (daysSinceReg <= 30) scoreExplanation.push('Nyregistrerat (senaste 30 dagarna): +30');
  else if (daysSinceReg <= 60) scoreExplanation.push('Registrerat senaste 60 dagarna: +15');
  if (company.website_status === 'no_website_found') scoreExplanation.push('Ingen hemsida: +40');
  else if (company.website_status === 'social_only') scoreExplanation.push('Bara sociala medier: +20');
  if (company.phone_status === 'has_phone') scoreExplanation.push('Telefonnummer tillgängligt: +15');
  if (['Restaurang & Café', 'Bygg & Renovation', 'Frisör & Skönhet', 'Städ & Facility', 'Hälsa & Träning'].includes(company.industry_label)) {
    scoreExplanation.push('Lokal tjänstebransch: +15');
  }

  const infoItems = [
    { icon: Hash, label: 'Org.nummer', value: company.org_number },
    { icon: Briefcase, label: 'Bolagsform', value: company.company_form },
    { icon: Calendar, label: 'Registrerad', value: company.registration_date },
    { icon: Building2, label: 'Bransch', value: company.industry_label },
    { icon: MapPin, label: 'Adress', value: `${company.address}, ${company.postal_code} ${company.city}` },
    { icon: MapPin, label: 'Kommun / Län', value: `${company.municipality}, ${company.county}` },
    { icon: Globe, label: 'Hemsida', value: company.website_url || '—' },
    { icon: Phone, label: 'Telefon', value: company.phone_number || '—' },
  ];

  return (
    <div className="space-y-6 max-w-4xl animate-fade-in">
      <Link to="/leads" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft className="w-4 h-4" /> Tillbaka till leads
      </Link>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{company.company_name}</h1>
          <p className="text-sm text-muted-foreground mt-1">{company.city} · {company.industry_label}</p>
        </div>
        <div className="flex items-center gap-2">
          <WebsiteStatusBadge status={company.website_status} />
          <PhoneStatusBadge status={company.phone_status} />
          <ScoreBadge score={company.lead_score} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">Bolagsinformation</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {infoItems.map(item => (
              <div key={item.label} className="flex items-start gap-2.5">
                <item.icon className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">{item.label}</p>
                  <p className="text-sm font-medium break-all">{item.value}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">Lead Score</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3 mb-4">
              <div className="text-3xl font-bold">{company.lead_score}</div>
              <span className="text-xs text-muted-foreground">/ 100</span>
            </div>
            <ul className="space-y-1.5">
              {scoreExplanation.map((s, i) => (
                <li key={i} className="text-xs text-muted-foreground flex items-start gap-1.5">
                  <span className="text-success mt-0.5">✓</span> {s}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button size="sm" className="gap-1.5">
          <Mail className="w-3.5 h-3.5" /> Generera kall e-post
        </Button>
        <Button size="sm" variant="outline" className="gap-1.5">
          <MessageSquare className="w-3.5 h-3.5" /> Generera DM
        </Button>
        <Button size="sm" variant="outline" className="gap-1.5">
          <Monitor className="w-3.5 h-3.5" /> Generera webbdemo-prompt
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <StickyNote className="w-4 h-4" /> Anteckningar
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {notes.length === 0 && <p className="text-sm text-muted-foreground">Inga anteckningar ännu.</p>}
          {notes.map(note => (
            <div key={note.id} className="border-l-2 border-primary/30 pl-3">
              <p className="text-sm">{note.content}</p>
              <p className="text-xs text-muted-foreground mt-1">{new Date(note.created_at).toLocaleString('sv-SE')}</p>
            </div>
          ))}
          <div className="flex gap-2">
            <Textarea
              placeholder="Skriv en anteckning..."
              value={newNote}
              onChange={e => setNewNote(e.target.value)}
              className="min-h-[60px]"
            />
          </div>
          <Button size="sm" onClick={addNote} disabled={!newNote.trim()}>
            Spara anteckning
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
