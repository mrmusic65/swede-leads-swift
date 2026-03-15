import { useEffect, useState, useRef, useCallback } from 'react';
import { X, Phone, ExternalLink, Globe, Building2, Calendar, MapPin, Hash, Briefcase, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import ScoreBadge from '@/components/ScoreBadge';
import LeadStatusBadge from '@/components/LeadStatusBadge';
import IndustryBadge from '@/components/IndustryBadge';
import WebsiteStatusBadge from '@/components/WebsiteStatusBadge';
import { calculateLeadScore, fetchNotes, addNote, type Company, type Note } from '@/lib/api';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

type LeadStatus = 'ny' | 'kontaktad' | 'kvalificerad' | 'ej_intressant';

const PIPELINE_STEPS: { key: LeadStatus; label: string }[] = [
  { key: 'ny', label: 'Ny' },
  { key: 'kontaktad', label: 'Kontaktad' },
  { key: 'kvalificerad', label: 'Kvalificerad' },
  { key: 'ej_intressant', label: 'Ej intressant' },
];

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toLocaleDateString('sv-SE', { day: 'numeric', month: 'short', year: 'numeric' });
}

function isNewLead(dateStr: string | null): boolean {
  if (!dateStr) return false;
  return Date.now() - new Date(dateStr).getTime() < 7 * 24 * 60 * 60 * 1000;
}

interface LeadSlideOverProps {
  company: Company | null;
  open: boolean;
  onClose: () => void;
  onStatusChange?: (id: string, status: LeadStatus) => void;
}

export default function LeadSlideOver({ company, open, onClose, onStatusChange }: LeadSlideOverProps) {
  const { user } = useAuth();
  const [notes, setNotes] = useState<Note[]>([]);
  const [newNote, setNewNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [currentStatus, setCurrentStatus] = useState<LeadStatus>('ny');
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (company) {
      setCurrentStatus((company as any).lead_status ?? 'ny');
      fetchNotes(company.id).then(setNotes).catch(() => setNotes([]));
    }
  }, [company?.id]);

  // Escape key
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onClose]);

  // Lock body scroll
  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  const handleStatusChange = useCallback(async (status: LeadStatus) => {
    if (!company) return;
    setCurrentStatus(status);
    const { error } = await supabase.from('companies').update({ lead_status: status }).eq('id', company.id);
    if (error) { toast.error('Kunde inte uppdatera status'); return; }
    toast.success(`Status ändrad till "${PIPELINE_STEPS.find(s => s.key === status)?.label}"`);
    onStatusChange?.(company.id, status);
  }, [company, onStatusChange]);

  const handleAddNote = useCallback(async () => {
    if (!company || !user || !newNote.trim()) return;
    setSaving(true);
    try {
      const note = await addNote(company.id, user.id, newNote);
      setNotes(prev => [...prev, note]);
      setNewNote('');
      toast.success('Anteckning sparad');
    } catch { toast.error('Kunde inte spara anteckning'); }
    finally { setSaving(false); }
  }, [company, user, newNote]);

  const handleExport = useCallback(() => {
    if (!company) return;
    const { exportSelectedCompaniesCSV } = require('@/lib/api');
    exportSelectedCompaniesCSV([company]);
  }, [company]);

  if (!company) return null;

  const score = calculateLeadScore(company);
  const statusIdx = PIPELINE_STEPS.findIndex(s => s.key === currentStatus);

  return (
    <>
      {/* Backdrop */}
      <div
        className={cn(
          'fixed inset-0 z-40 bg-foreground/20 backdrop-blur-sm transition-opacity duration-300',
          open ? 'opacity-100' : 'opacity-0 pointer-events-none'
        )}
        onClick={onClose}
      />

      {/* Panel */}
      <div
        ref={panelRef}
        className={cn(
          'fixed top-0 right-0 z-50 h-full w-full sm:w-[480px] bg-background border-l border-border shadow-2xl flex flex-col transition-transform duration-300 ease-out',
          open ? 'translate-x-0' : 'translate-x-full'
        )}
      >
        {/* Header */}
        <div className="flex items-start justify-between p-6 border-b border-border">
          <div className="space-y-2 min-w-0 flex-1">
            <h2 className="text-xl font-bold text-foreground truncate pr-4">{company.company_name}</h2>
            <div className="flex items-center gap-2 flex-wrap">
              <ScoreBadge score={score} />
              <LeadStatusBadge status={currentStatus} />
              {isNewLead(company.registration_date) && (
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Nytt
                </span>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto">
          {/* Company info grid */}
          <div className="p-6 space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <InfoField icon={<Hash className="w-3.5 h-3.5" />} label="Org.nummer" value={company.org_number} />
              <InfoField icon={<Briefcase className="w-3.5 h-3.5" />} label="Bransch" value={company.industry_label}>
                {company.industry_label && <IndustryBadge industry={company.industry_label} />}
              </InfoField>
              <InfoField icon={<MapPin className="w-3.5 h-3.5" />} label="Stad" value={company.city} />
              <InfoField icon={<Building2 className="w-3.5 h-3.5" />} label="Bolagsform" value={company.company_form} />
              <InfoField icon={<Calendar className="w-3.5 h-3.5" />} label="Reg.datum" value={formatDate(company.registration_date)} />
              <InfoField icon={<Globe className="w-3.5 h-3.5" />} label="Webbstatus">
                <WebsiteStatusBadge status={company.website_status} />
              </InfoField>
            </div>

            {/* Clickable phone */}
            {company.phone_number && (
              <a
                href={`tel:${company.phone_number}`}
                className="flex items-center gap-2 text-sm font-medium text-primary hover:underline underline-offset-2"
              >
                <Phone className="w-4 h-4" />
                {company.phone_number}
              </a>
            )}

            {/* Clickable website */}
            {company.website_url && (
              <a
                href={company.website_url.startsWith('http') ? company.website_url : `https://${company.website_url}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm font-medium text-primary hover:underline underline-offset-2"
              >
                <ExternalLink className="w-4 h-4" />
                {company.website_url}
              </a>
            )}
          </div>

          {/* Pipeline status */}
          <div className="px-6 pb-6">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Pipeline</p>
            <div className="flex items-center gap-1">
              {PIPELINE_STEPS.map((step, i) => {
                const isActive = i === statusIdx;
                const isPast = i < statusIdx;
                return (
                  <button
                    key={step.key}
                    onClick={() => handleStatusChange(step.key)}
                    className={cn(
                      'flex-1 py-2 px-1 text-[11px] font-medium rounded-lg border transition-all duration-200 text-center',
                      isActive
                        ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                        : isPast
                          ? 'bg-primary/10 text-primary border-primary/20'
                          : 'bg-muted/50 text-muted-foreground border-border hover:bg-muted'
                    )}
                  >
                    {step.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Notes */}
          <div className="px-6 pb-6 space-y-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Anteckningar</p>
            <div className="space-y-2">
              <Textarea
                placeholder="Lägg till anteckning..."
                value={newNote}
                onChange={e => setNewNote(e.target.value)}
                className="min-h-[80px] text-sm resize-none bg-muted/30 border-border/60"
              />
              <Button
                size="sm"
                onClick={handleAddNote}
                disabled={!newNote.trim() || saving}
                className="rounded-full px-5"
              >
                {saving ? 'Sparar...' : 'Spara'}
              </Button>
            </div>

            {notes.length > 0 ? (
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {notes.map(n => (
                  <div key={n.id} className="p-3 rounded-lg bg-muted/30 border border-border/40">
                    <p className="text-sm text-foreground">{n.note_text}</p>
                    <p className="text-[10px] text-muted-foreground mt-1">{formatDate(n.created_at)}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground italic">Inga anteckningar ännu.</p>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center gap-3 p-4 border-t border-border bg-muted/20">
          <Button variant="outline" size="sm" className="flex-1 gap-2 rounded-full" onClick={handleExport}>
            <FileText className="w-4 h-4" /> Exportera detta lead
          </Button>
          <Button
            size="sm"
            className="flex-1 gap-2 rounded-full"
            onClick={() => {
              const orgNr = company.org_number?.replace(/\D/g, '') ?? '';
              window.open(`https://www.bolagsverket.se/foretag/${orgNr}`, '_blank');
            }}
          >
            <ExternalLink className="w-4 h-4" /> Öppna Bolagsverket
          </Button>
        </div>
      </div>
    </>
  );
}

function InfoField({ icon, label, value, children }: { icon: React.ReactNode; label: string; value?: string | null; children?: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-1.5 text-muted-foreground">
        {icon}
        <span className="text-[11px] font-medium uppercase tracking-wider">{label}</span>
      </div>
      {children || <p className="text-sm font-medium text-foreground">{value || '—'}</p>}
    </div>
  );
}
