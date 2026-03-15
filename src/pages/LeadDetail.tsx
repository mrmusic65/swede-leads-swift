import { useParams, Link } from 'react-router-dom';
import { useState, useEffect, useCallback } from 'react';
import { fetchCompanyById, fetchNotes, addNote, calculateLeadScore, type Company, type Note } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import ScoreBadge from '@/components/ScoreBadge';
import ScoreGauge from '@/components/ScoreGauge';
import WebsiteStatusBadge from '@/components/WebsiteStatusBadge';
import PhoneStatusBadge from '@/components/PhoneStatusBadge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import {
  ArrowLeft, Megaphone, Building2, MapPin, Calendar,
  Phone, Globe, Hash, Briefcase, StickyNote, Copy, Check, Loader2, RefreshCw,
  X, Save, ChevronDown, ChevronUp, Clock, ClipboardList, Info,
  Search, Lightbulb, Zap
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

type ContentType = 'sales_pitch';
type ResearchResult = { points: string[]; usage: { current: number; limit: number; plan: string } };

const TYPE_LABELS: Record<string, string> = {
  sales_pitch: 'Säljpitch',
  research: 'Research',
};

const PLAN_LIMITS: Record<string, number> = {
  starter: 25,
  pro: 100,
  enterprise: -1,
};

interface SavedContent {
  id: string;
  type: string;
  content: string;
  created_at: string;
}

export default function LeadDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const { toast } = useToast();
  const [company, setCompany] = useState<Company | null>(null);
  const [notes, setNotes] = useState<Note[]>([]);
  const [newNote, setNewNote] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [copiedPhone, setCopiedPhone] = useState(false);
  const [copiedInfo, setCopiedInfo] = useState(false);
  const [copiedContactInfo, setCopiedContactInfo] = useState(false);

  // AI generation state (sales pitch)
  const [generating, setGenerating] = useState<ContentType | null>(null);
  const [generatedContent, setGeneratedContent] = useState<{ type: ContentType; content: string } | null>(null);
  const [editableContent, setEditableContent] = useState('');
  const [copiedContent, setCopiedContent] = useState(false);

  // Research state
  const [researching, setResearching] = useState(false);
  const [researchResult, setResearchResult] = useState<ResearchResult | null>(null);
  const [copiedResearch, setCopiedResearch] = useState(false);
  const [searchUsage, setSearchUsage] = useState<{ current: number; limit: number; plan: string } | null>(null);

  // Previous content history
  const [previousContent, setPreviousContent] = useState<SavedContent[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  const currentMonth = new Date().toISOString().slice(0, 7);

  const loadSearchUsage = useCallback(async () => {
    if (!user) return;
    const { data } = await (supabase as any)
      .from('search_usage')
      .select('count')
      .eq('user_id', user.id)
      .eq('month', currentMonth)
      .single();

    // Get plan
    const { data: sub } = await (supabase as any)
      .from('subscriptions')
      .select('plan_tier, status')
      .eq('user_id', user.id)
      .in('status', ['active', 'trialing'])
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    const plan = sub?.plan_tier || 'starter';
    const limit = PLAN_LIMITS[plan] ?? 25;
    setSearchUsage({ current: data?.count || 0, limit, plan });
  }, [user, currentMonth]);

  const loadPreviousContent = useCallback(async (leadId: string) => {
    const { data } = await (supabase as any)
      .from('lead_content')
      .select('id, type, content, created_at')
      .eq('lead_id', leadId)
      .order('created_at', { ascending: false });
    if (data) setPreviousContent(data);
  }, []);

  useEffect(() => {
    if (!id) return;
    Promise.all([fetchCompanyById(id), fetchNotes(id)])
      .then(([c, n]) => { setCompany(c); setNotes(n); })
      .catch(() => toast({ title: 'Fel', description: 'Kunde inte ladda bolag.', variant: 'destructive' }))
      .finally(() => setLoading(false));
    loadPreviousContent(id);
  }, [id]);

  useEffect(() => { loadSearchUsage(); }, [loadSearchUsage]);

  useEffect(() => {
    if (generatedContent) setEditableContent(generatedContent.content);
  }, [generatedContent]);

  if (loading) {
    return <div className="space-y-4 max-w-4xl"><Skeleton className="h-8 w-48" /><Skeleton className="h-64 w-full" /></div>;
  }

  if (!company) {
    return (
      <div className="text-center py-20">
        <p className="text-muted-foreground">Bolaget hittades inte.</p>
        <Link to="/leads" className="text-primary hover:underline text-sm mt-2 inline-block">Tillbaka till leads</Link>
      </div>
    );
  }

  const score = calculateLeadScore(company);

  // Research handler
  const handleResearch = async () => {
    if (!user || !company) return;

    if (searchUsage && searchUsage.limit !== -1 && searchUsage.current >= searchUsage.limit) {
      return; // limit reached, button is disabled
    }

    setResearching(true);
    setResearchResult(null);
    setCopiedResearch(false);

    try {
      const { data, error } = await supabase.functions.invoke('research-lead', {
        body: {
          lead: {
            company_name: company.company_name,
            city: company.city,
            industry: company.industry_label,
            org_number: company.org_number,
          },
        },
      });

      if (error) throw error;
      if (data?.error === 'limit_reached') {
        setSearchUsage({ current: data.current, limit: data.limit, plan: data.plan });
        toast({ title: 'Sökgräns nådd', description: data.message, variant: 'destructive' });
        return;
      }
      if (data?.error) throw new Error(data.error);

      const content = data.content as string;
      const points = content
        .split(/\n/)
        .map((l: string) => l.replace(/^\d+\.\s*/, '').trim())
        .filter((l: string) => l.length > 5);

      setResearchResult({ points, usage: data.usage });
      setSearchUsage(data.usage);

      // Save to lead_content
      await (supabase as any).from('lead_content').insert({
        lead_id: company.id,
        user_id: user.id,
        type: 'research',
        content,
      });
      loadPreviousContent(company.id);
    } catch (e: any) {
      toast({ title: 'Fel', description: e.message || 'Kunde inte researcha bolaget.', variant: 'destructive' });
    } finally {
      setResearching(false);
    }
  };

  const handleCopyResearch = async () => {
    if (!researchResult) return;
    const text = researchResult.points.map((p, i) => `${i + 1}. ${p}`).join('\n');
    await navigator.clipboard.writeText(text);
    setCopiedResearch(true);
    setTimeout(() => setCopiedResearch(false), 2000);
  };

  // Sales pitch generation
  const handleGenerate = async (type: ContentType) => {
    if (!user || !company) return;
    setGenerating(type);
    setGeneratedContent(null);
    setCopiedContent(false);

    try {
      const { data, error } = await supabase.functions.invoke('generate-lead-content', {
        body: {
          type,
          lead: {
            company_name: company.company_name,
            industry: company.industry_label,
            city: company.city,
            company_form: company.company_form,
            registration_date: company.registration_date,
          },
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setGeneratedContent({ type, content: data.content });

      await (supabase as any).from('lead_content').insert({
        lead_id: company.id,
        user_id: user.id,
        type,
        content: data.content,
      });
      loadPreviousContent(company.id);
    } catch (e: any) {
      toast({ title: 'Fel', description: e.message || 'Kunde inte generera innehåll.', variant: 'destructive' });
    } finally {
      setGenerating(null);
    }
  };

  const handleCopyContent = async () => {
    if (!editableContent) return;
    await navigator.clipboard.writeText(editableContent);
    setCopiedContent(true);
    setTimeout(() => setCopiedContent(false), 2000);
  };

  const showMoveToContactedToast = () => {
    if (!company || company.pipeline_stage !== 'new') return;
    toast({
      title: `Vill du flytta ${company.company_name} till Kontaktad?`,
      description: '',
      duration: 10000,
      action: (
        <div className="flex gap-2 mt-1">
          <Button size="sm" variant="default" className="h-7 text-xs" onClick={async () => {
            await (supabase as any).from('companies').update({ pipeline_stage: 'contacted' }).eq('id', company.id);
            if (user) {
              await (supabase as any).from('lead_activity').insert({
                lead_id: company.id, user_id: user.id, action: 'status_changed',
                old_value: 'Ny', new_value: 'Kontaktad',
              });
            }
            setCompany({ ...company, pipeline_stage: 'contacted' });
            toast({ title: 'Uppdaterat', description: `${company.company_name} flyttad till Kontaktad.` });
          }}>Ja, flytta</Button>
          <Button size="sm" variant="outline" className="h-7 text-xs">Behåll som Ny</Button>
        </div>
      ),
    });
  };

  const handleSaveToNotes = async () => {
    if (!generatedContent || !company || !user) return;
    try {
      const noteText = `Säljpitch: ${editableContent}`;
      const note = await addNote(company.id, user.id, noteText);
      setNotes(prev => [...prev, note]);
      toast({ title: 'Sparat', description: 'Säljpitchen har sparats som anteckning.' });
    } catch {
      toast({ title: 'Fel', description: 'Kunde inte spara anteckning.', variant: 'destructive' });
      return;
    }
    showMoveToContactedToast();
  };

  const handleAddNote = async () => {
    if (!newNote.trim() || !user) return;
    setSaving(true);
    try {
      const note = await addNote(company.id, user.id, newNote.trim());
      setNotes(prev => [...prev, note]);
      setNewNote('');
    } catch {
      toast({ title: 'Fel', description: 'Kunde inte spara anteckning.', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleCopyPhone = async () => {
    if (!company.phone_number) return;
    await navigator.clipboard.writeText(company.phone_number);
    setCopiedPhone(true);
    setTimeout(() => setCopiedPhone(false), 2000);
    toast({ title: 'Kopierat', description: 'Telefonnummer kopierat.' });
  };

  const handleCopyInfo = async () => {
    const lines = [
      company.company_name,
      `Org: ${company.org_number}`,
      company.industry_label && `Bransch: ${company.industry_label}`,
      company.address && `Adress: ${[company.address, company.postal_code, company.city].filter(Boolean).join(', ')}`,
      company.phone_number && `Tel: ${company.phone_number}`,
      company.website_url && `Webb: ${company.website_url}`,
    ].filter(Boolean).join('\n');
    await navigator.clipboard.writeText(lines);
    setCopiedInfo(true);
    setTimeout(() => setCopiedInfo(false), 2000);
    toast({ title: 'Kopierat', description: 'Bolagsinformation kopierad.' });
  };

  const handleCopyContactInfo = async () => {
    const lines = [
      `Bolagsnamn: ${company.company_name}`,
      `Org.nummer: ${company.org_number || '—'}`,
      `Telefon: ${company.phone_number || '—'}`,
      `Adress: ${[company.address, company.postal_code, company.city].filter(Boolean).join(', ') || '—'}`,
      `Bransch: ${company.industry_label || '—'}`,
      `Stad: ${company.city || '—'}`,
    ].join('\n');
    await navigator.clipboard.writeText(lines);
    setCopiedContactInfo(true);
    setTimeout(() => setCopiedContactInfo(false), 2000);
  };

  const infoItems = [
    { icon: Hash, label: 'Org.nummer', value: company.org_number },
    { icon: Briefcase, label: 'Bolagsform', value: company.company_form || '—' },
    { icon: Calendar, label: 'Registrerad', value: company.registration_date || '—' },
    { icon: Building2, label: 'Bransch', value: company.industry_label || '—' },
    { icon: MapPin, label: 'Adress', value: [company.address, company.postal_code, company.city].filter(Boolean).join(', ') || '—' },
    { icon: MapPin, label: 'Kommun / Län', value: [company.municipality, company.county].filter(Boolean).join(', ') || '—' },
    { icon: Globe, label: 'Hemsida', value: company.website_url || '—' },
  ];

  const limitReached = searchUsage && searchUsage.limit !== -1 && searchUsage.current >= searchUsage.limit;
  const searchesRemaining = searchUsage
    ? searchUsage.limit === -1
      ? '∞'
      : `${searchUsage.limit - searchUsage.current}`
    : '...';

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
        <div className="flex items-center gap-2 flex-wrap">
          <WebsiteStatusBadge status={company.website_status} />
          <PhoneStatusBadge status={company.phone_status} />
          <ScoreBadge score={score} />
          <Button size="sm" variant="outline" className="gap-1.5 h-7 text-xs" onClick={handleCopyInfo}>
            {copiedInfo ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
            {copiedInfo ? 'Kopierat' : 'Kopiera info'}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3"><CardTitle className="text-sm font-semibold">Bolagsinformation</CardTitle></CardHeader>
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
            <div className="flex items-start gap-2.5">
              <Phone className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
              <div className="flex-1">
                <p className="text-xs text-muted-foreground">Telefon</p>
                <div className="flex items-center gap-1.5">
                  <p className="text-sm font-medium">{company.phone_number || '—'}</p>
                  {company.phone_number && (
                    <button onClick={handleCopyPhone} className="inline-flex items-center justify-center w-5 h-5 rounded text-muted-foreground hover:text-foreground hover:bg-accent transition-colors" title="Kopiera telefonnummer">
                      {copiedPhone ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-sm font-semibold">Lead Score</CardTitle></CardHeader>
          <CardContent>
            <ScoreGauge score={score} company={company} />
          </CardContent>
        </Card>
      </div>

      {/* Action Buttons */}
      <div className="space-y-2">
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant="default"
            className="gap-1.5"
            disabled={researching || !!limitReached}
            onClick={handleResearch}
          >
            {researching ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
            {researching ? 'Söker...' : 'Researcha bolaget'}
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="gap-1.5"
            disabled={generating !== null}
            onClick={() => handleGenerate('sales_pitch')}
          >
            {generating === 'sales_pitch' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Megaphone className="w-3.5 h-3.5" />}
            {generating === 'sales_pitch' ? 'Genererar...' : 'Generera säljpitch'}
          </Button>
          <Button
            size="sm"
            variant="outline"
            className={`gap-1.5 transition-colors ${copiedContactInfo ? 'border-emerald-500 text-emerald-600' : ''}`}
            onClick={handleCopyContactInfo}
          >
            {copiedContactInfo ? <Check className="w-3.5 h-3.5" /> : <ClipboardList className="w-3.5 h-3.5" />}
            {copiedContactInfo ? 'Kopierat!' : 'Kopiera kontaktinfo'}
          </Button>
        </div>
        <div className="flex flex-col gap-1">
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <Search className="w-3 h-3 shrink-0" />
            {limitReached
              ? <span className="text-destructive font-medium">Alla sökningar förbrukade denna månad</span>
              : <span>{searchesRemaining} sökningar kvar denna månad</span>
            }
          </p>
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <Info className="w-3 h-3 shrink-0" />
            E-postadresser till beslutsfattare kommer inom kort via vår Creditsafe-integration.
          </p>
        </div>
      </div>

      {/* Limit Reached Upgrade CTA */}
      {limitReached && (
        <Card className="border-destructive/30 bg-destructive/5">
          <CardContent className="py-4">
            <p className="text-sm font-medium mb-2">
              Du har använt alla dina sökningar för denna månad.
              {searchUsage?.plan === 'starter' && ' Uppgradera till Pro för 100 sökningar/månad.'}
            </p>
            <Link to="/subscription">
              <Button size="sm" variant="default" className="gap-1.5">
                <Zap className="w-3.5 h-3.5" />
                Uppgradera
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}

      {/* Research Loading */}
      {researching && (
        <Card className="border-primary/20 bg-primary/[0.02]">
          <CardContent className="py-6 flex items-center justify-center gap-3">
            <Loader2 className="w-5 h-5 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Söker efter information om {company.company_name}...</p>
          </CardContent>
        </Card>
      )}

      {/* Research Results */}
      {researchResult && !researching && (
        <Card className="border-primary/20 bg-primary/[0.02]">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Lightbulb className="w-4 h-4 text-teal-500" />
                Säljargument
              </CardTitle>
              <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => setResearchResult(null)}>
                <X className="w-3.5 h-3.5" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <ul className="space-y-2.5">
              {researchResult.points.map((point, i) => (
                <li key={i} className="flex items-start gap-2.5">
                  <Lightbulb className="w-4 h-4 text-teal-500 mt-0.5 shrink-0" />
                  <p className="text-sm leading-relaxed">{point}</p>
                </li>
              ))}
            </ul>
            <div className="flex flex-wrap gap-2 pt-1">
              <Button
                size="sm"
                variant="outline"
                className={`gap-1.5 h-8 text-xs transition-colors ${copiedResearch ? 'border-emerald-500 text-emerald-600' : ''}`}
                onClick={handleCopyResearch}
              >
                {copiedResearch ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                {copiedResearch ? 'Kopierat!' : 'Kopiera alla punkter'}
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="gap-1.5 h-8 text-xs"
                disabled={researching || !!limitReached}
                onClick={handleResearch}
              >
                <RefreshCw className="w-3 h-3" />
                Sök igen
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Generated Sales Pitch */}
      {generatedContent && (
        <Card className="border-primary/20 bg-primary/[0.02]">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold">{TYPE_LABELS[generatedContent.type]}</CardTitle>
              <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => setGeneratedContent(null)}>
                <X className="w-3.5 h-3.5" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <Textarea
              value={editableContent}
              onChange={e => setEditableContent(e.target.value)}
              className="min-h-[160px] text-sm leading-relaxed bg-background border-border resize-y"
            />
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="outline" className={`gap-1.5 h-8 text-xs transition-colors ${copiedContent ? 'border-emerald-500 text-emerald-600' : ''}`} onClick={handleCopyContent}>
                {copiedContent ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                {copiedContent ? 'Kopierat!' : 'Kopiera'}
              </Button>
              <Button size="sm" variant="outline" className="gap-1.5 h-8 text-xs" disabled={generating !== null} onClick={() => handleGenerate(generatedContent.type)}>
                <RefreshCw className="w-3 h-3" /> Regenerera
              </Button>
              <Button size="sm" className="gap-1.5 h-8 text-xs" onClick={handleSaveToNotes}>
                <Save className="w-3 h-3" /> Spara till anteckningar
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Previous Generated Content */}
      {previousContent.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <button onClick={() => setShowHistory(!showHistory)} className="flex items-center justify-between w-full text-left">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Tidigare genererat innehåll ({previousContent.length})
              </CardTitle>
              {showHistory ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
            </button>
          </CardHeader>
          {showHistory && (
            <CardContent className="space-y-3 pt-0">
              {previousContent.map(item => (
                <div key={item.id} className="border rounded-lg p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                      {TYPE_LABELS[item.type] || item.type}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(item.created_at).toLocaleString('sv-SE')}
                    </span>
                  </div>
                  <p className="text-sm whitespace-pre-wrap leading-relaxed text-muted-foreground line-clamp-4">{item.content}</p>
                  <Button size="sm" variant="ghost" className="gap-1.5 h-7 text-xs" onClick={async () => {
                    await navigator.clipboard.writeText(item.content);
                    toast({ title: 'Kopierat', description: 'Texten har kopierats.' });
                  }}>
                    <Copy className="w-3 h-3" /> Kopiera
                  </Button>
                </div>
              ))}
            </CardContent>
          )}
        </Card>
      )}

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
              <p className="text-sm">{note.note_text}</p>
              <p className="text-xs text-muted-foreground mt-1">{new Date(note.created_at).toLocaleString('sv-SE')}</p>
            </div>
          ))}
          <Textarea placeholder="Skriv en anteckning..." value={newNote} onChange={e => setNewNote(e.target.value)} className="min-h-[60px]" />
          <Button size="sm" onClick={handleAddNote} disabled={!newNote.trim() || saving}>
            {saving ? 'Sparar...' : 'Spara anteckning'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
