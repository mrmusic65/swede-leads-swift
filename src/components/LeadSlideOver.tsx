import { useEffect, useState, useCallback, useRef } from 'react';
import { X, Phone, ExternalLink, Building2, Calendar, MapPin, Hash, Briefcase, FileText, Globe, Pencil, Trash2, MessageSquare, PhoneCall, Mail, CalendarDays, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import ScoreBadge from '@/components/ScoreBadge';
import LeadStatusBadge from '@/components/LeadStatusBadge';
import IndustryBadge from '@/components/IndustryBadge';
import WebsiteStatusBadge from '@/components/WebsiteStatusBadge';
import { calculateLeadScore, type Company } from '@/lib/api';
import { fetchTimeline, createLeadNote, updateLeadNote, deleteLeadNote, logLeadActivity, type TimelineItem, type NoteType, type LeadNote } from '@/lib/lead-notes-api';
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

const NOTE_TYPES: { key: NoteType; label: string; icon: typeof MessageSquare }[] = [
  { key: 'note', label: 'Anteckning', icon: MessageSquare },
  { key: 'call', label: 'Samtal', icon: PhoneCall },
  { key: 'email', label: 'E-post', icon: Mail },
  { key: 'meeting', label: 'Möte', icon: CalendarDays },
];

const NOTE_TYPE_COLORS: Record<NoteType, string> = {
  note: 'text-primary bg-primary/10',
  call: 'text-warning bg-warning/10',
  email: 'text-info bg-info/10',
  meeting: 'text-success bg-success/10',
};

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('sv-SE', { day: 'numeric', month: 'short', year: 'numeric' });
}

function relativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just nu';
  if (mins < 60) return `${mins} min sedan`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} tim sedan`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days} dag${days > 1 ? 'ar' : ''} sedan`;
  return formatDate(dateStr);
}

function isNewLead(dateStr: string | null): boolean {
  if (!dateStr) return false;
  return Date.now() - new Date(dateStr).getTime() < 7 * 24 * 60 * 60 * 1000;
}


const MAX_CHARS = 2000;

interface LeadSlideOverProps {
  company: Company | null;
  open: boolean;
  onClose: () => void;
  onStatusChange?: (id: string, status: LeadStatus) => void;
}

export default function LeadSlideOver({ company, open, onClose, onStatusChange }: LeadSlideOverProps) {
  const { user } = useAuth();
  const [timeline, setTimeline] = useState<TimelineItem[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [newNote, setNewNote] = useState('');
  const [noteType, setNoteType] = useState<NoteType>('note');
  const [saving, setSaving] = useState(false);
  const [currentStatus, setCurrentStatus] = useState<LeadStatus>('ny');
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const loadTimeline = useCallback(async (leadId: string, offset = 0) => {
    const result = await fetchTimeline(leadId, 20, offset);
    if (offset === 0) {
      setTimeline(result.items);
    } else {
      setTimeline(prev => [...prev, ...result.items]);
    }
    setHasMore(result.hasMore);
  }, []);

  useEffect(() => {
    if (company) {
      setCurrentStatus((company as any).lead_status ?? 'ny');
      loadTimeline(company.id);
      setNewNote('');
      setEditingNoteId(null);
    }
  }, [company?.id, loadTimeline]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onClose]);

  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  // Cmd+Enter to save
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter' && newNote.trim()) {
        e.preventDefault();
        handleAddNote();
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, newNote]);

  const handleStatusChange = useCallback(async (status: LeadStatus) => {
    if (!company || !user) return;
    const oldStatus = currentStatus;
    setCurrentStatus(status);
    const { error } = await supabase.from('companies').update({ lead_status: status }).eq('id', company.id);
    if (error) { toast.error('Kunde inte uppdatera status'); setCurrentStatus(oldStatus); return; }

    await logLeadActivity(company.id, user.id, 'status_change', oldStatus, status);
    toast.success(`Status ändrad till "${PIPELINE_STEPS.find(s => s.key === status)?.label}"`);
    onStatusChange?.(company.id, status);
    loadTimeline(company.id);
  }, [company, user, currentStatus, onStatusChange, loadTimeline]);

  const handleAddNote = useCallback(async () => {
    if (!company || !user || !newNote.trim()) return;
    setSaving(true);
    try {
      await createLeadNote(company.id, user.id, newNote, noteType);
      setNewNote('');
      toast.success('Anteckning sparad');
      loadTimeline(company.id);
    } catch { toast.error('Kunde inte spara anteckning'); }
    finally { setSaving(false); }
  }, [company, user, newNote, noteType, loadTimeline]);

  const handleUpdateNote = useCallback(async (noteId: string) => {
    if (!editContent.trim() || !company) return;
    try {
      await updateLeadNote(noteId, editContent);
      setEditingNoteId(null);
      toast.success('Anteckning uppdaterad');
      loadTimeline(company.id);
    } catch { toast.error('Kunde inte uppdatera'); }
  }, [editContent, company, loadTimeline]);

  const handleDeleteNote = useCallback(async (noteId: string) => {
    if (!company) return;
    try {
      await deleteLeadNote(noteId);
      toast.success('Anteckning borttagen');
      loadTimeline(company.id);
    } catch { toast.error('Kunde inte ta bort'); }
  }, [company, loadTimeline]);

  const handleLoadMore = useCallback(async () => {
    if (!company) return;
    setLoadingMore(true);
    try { await loadTimeline(company.id, timeline.length); }
    finally { setLoadingMore(false); }
  }, [company, timeline.length, loadTimeline]);

  const handleExport = useCallback(async () => {
    if (!company) return;
    const { exportSelectedCompaniesCSV } = await import('@/lib/api');
    exportSelectedCompaniesCSV([company]);
  }, [company]);

  if (!company) return null;

  const score = calculateLeadScore(company);
  const statusIdx = PIPELINE_STEPS.findIndex(s => s.key === currentStatus);

  return (
    <>
      <div
        className={cn(
          'fixed inset-0 z-40 bg-foreground/20 backdrop-blur-sm transition-opacity duration-300',
          open ? 'opacity-100' : 'opacity-0 pointer-events-none'
        )}
        onClick={onClose}
      />

      <div
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
          <button onClick={onClose} className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
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

            {company.phone_number && (
              <a href={`tel:${company.phone_number}`} className="flex items-center gap-2 text-sm font-medium text-primary hover:underline underline-offset-2">
                <Phone className="w-4 h-4" /> {company.phone_number}
              </a>
            )}
            {company.website_url && (
              <a href={company.website_url.startsWith('http') ? company.website_url : `https://${company.website_url}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm font-medium text-primary hover:underline underline-offset-2">
                <ExternalLink className="w-4 h-4" /> {company.website_url}
              </a>
            )}
          </div>

          {/* Pipeline */}
          <div className="px-6 pb-6">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Pipeline</p>
            <div className="flex items-center gap-1">
              {PIPELINE_STEPS.map((step, i) => {
                const isActive = i === statusIdx;
                const isPast = i < statusIdx;
                return (
                  <button key={step.key} onClick={() => handleStatusChange(step.key)} className={cn(
                    'flex-1 py-2 px-1 text-[11px] font-medium rounded-lg border transition-all duration-200 text-center',
                    isActive ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                      : isPast ? 'bg-primary/10 text-primary border-primary/20'
                      : 'bg-muted/50 text-muted-foreground border-border hover:bg-muted'
                  )}>
                    {step.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Add note */}
          <div className="px-6 pb-4 space-y-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Ny anteckning</p>

            {/* Type selector */}
            <div className="flex gap-1">
              {NOTE_TYPES.map(t => {
                const Icon = t.icon;
                const isSelected = noteType === t.key;
                return (
                  <button
                    key={t.key}
                    onClick={() => setNoteType(t.key)}
                    className={cn(
                      'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-medium border transition-all duration-200',
                      isSelected
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-muted/40 text-muted-foreground border-border hover:bg-muted'
                    )}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    {t.label}
                  </button>
                );
              })}
            </div>

            <div className="relative">
              <Textarea
                ref={textareaRef}
                placeholder="Skriv en anteckning..."
                value={newNote}
                onChange={e => { if (e.target.value.length <= MAX_CHARS) setNewNote(e.target.value); }}
                className="min-h-[80px] text-sm resize-none bg-muted/30 border-border/60"
                rows={3}
              />
              <span className="absolute bottom-2 right-3 text-[10px] text-muted-foreground">
                {newNote.length}/{MAX_CHARS}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <Button size="sm" onClick={handleAddNote} disabled={!newNote.trim() || saving} className="rounded-full px-5 gap-2">
                {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                {saving ? 'Sparar...' : 'Spara anteckning'}
              </Button>
              <span className="text-[10px] text-muted-foreground">⌘+Enter</span>
            </div>
          </div>

          {/* Timeline */}
          <div className="px-6 pb-6 space-y-1">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Aktivitet</p>

            {timeline.length === 0 ? (
              <p className="text-sm text-muted-foreground italic py-4">Ingen aktivitet ännu.</p>
            ) : (
              <div className="space-y-0">
                {timeline.map(item => (
                  <TimelineEntry
                    key={item.data.id}
                    item={item}
                    editingNoteId={editingNoteId}
                    editContent={editContent}
                    onStartEdit={(note) => { setEditingNoteId(note.id); setEditContent(note.content); }}
                    onCancelEdit={() => setEditingNoteId(null)}
                    onSaveEdit={handleUpdateNote}
                    onDelete={handleDeleteNote}
                    onEditContentChange={setEditContent}
                  />
                ))}
              </div>
            )}

            {hasMore && (
              <Button variant="ghost" size="sm" onClick={handleLoadMore} disabled={loadingMore} className="w-full text-xs text-muted-foreground">
                {loadingMore ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : null}
                Visa fler
              </Button>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center gap-3 p-4 border-t border-border bg-muted/20">
          <Button variant="outline" size="sm" className="flex-1 gap-2 rounded-full" onClick={handleExport}>
            <FileText className="w-4 h-4" /> Exportera
          </Button>
          <Button size="sm" className="flex-1 gap-2 rounded-full" onClick={() => {
            const orgNr = company.org_number?.replace(/\D/g, '') ?? '';
            window.open(`https://www.bolagsverket.se/foretag/${orgNr}`, '_blank');
          }}>
            <ExternalLink className="w-4 h-4" /> Bolagsverket
          </Button>
        </div>
      </div>
    </>
  );
}

// --- Sub-components ---

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

interface TimelineEntryProps {
  item: TimelineItem;
  editingNoteId: string | null;
  editContent: string;
  onStartEdit: (note: LeadNote) => void;
  onCancelEdit: () => void;
  onSaveEdit: (noteId: string) => void;
  onDelete: (noteId: string) => void;
  onEditContentChange: (val: string) => void;
}

function TimelineEntry({ item, editingNoteId, editContent, onStartEdit, onCancelEdit, onSaveEdit, onDelete, onEditContentChange }: TimelineEntryProps) {
  if (item.kind === 'activity') {
    const a = item.data;
    const oldLabel = PIPELINE_STEPS.find(s => s.key === a.old_value)?.label ?? a.old_value;
    const newLabel = PIPELINE_STEPS.find(s => s.key === a.new_value)?.label ?? a.new_value;
    return (
      <div className="flex gap-3 py-3 border-b border-border/30 last:border-0">
        <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center shrink-0 mt-0.5">
          <span className="text-[10px] text-muted-foreground font-medium">{getInitials(a.user_id)}</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs text-muted-foreground">
            Status ändrad: <span className="font-medium text-foreground">{oldLabel}</span> → <span className="font-medium text-foreground">{newLabel}</span>
          </p>
          <p className="text-[10px] text-muted-foreground mt-0.5">{relativeTime(a.created_at)}</p>
        </div>
      </div>
    );
  }

  const note = item.data;
  const typeConfig = NOTE_TYPES.find(t => t.key === note.note_type) ?? NOTE_TYPES[0];
  const Icon = typeConfig.icon;
  const colorClass = NOTE_TYPE_COLORS[note.note_type];
  const isEditing = editingNoteId === note.id;

  return (
    <div className="flex gap-3 py-3 border-b border-border/30 last:border-0">
      <div className={cn('w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5', colorClass)}>
        <Icon className="w-3.5 h-3.5" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">{typeConfig.label}</span>
          <div className="flex items-center gap-1">
            <button onClick={() => onStartEdit(note)} className="p-1 rounded text-muted-foreground hover:text-foreground transition-colors">
              <Pencil className="w-3 h-3" />
            </button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <button className="p-1 rounded text-muted-foreground hover:text-destructive transition-colors">
                  <Trash2 className="w-3 h-3" />
                </button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Ta bort anteckning?</AlertDialogTitle>
                  <AlertDialogDescription>Denna åtgärd kan inte ångras.</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Avbryt</AlertDialogCancel>
                  <AlertDialogAction onClick={() => onDelete(note.id)}>Ta bort</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>

        {isEditing ? (
          <div className="mt-1 space-y-2">
            <Textarea
              value={editContent}
              onChange={e => onEditContentChange(e.target.value)}
              className="min-h-[60px] text-sm resize-none"
              autoFocus
            />
            <div className="flex gap-2">
              <Button size="sm" className="h-7 text-xs rounded-full px-3" onClick={() => onSaveEdit(note.id)}>Spara</Button>
              <Button size="sm" variant="ghost" className="h-7 text-xs rounded-full px-3" onClick={onCancelEdit}>Avbryt</Button>
            </div>
          </div>
        ) : (
          <p className="text-sm text-foreground mt-1 whitespace-pre-wrap">{note.content}</p>
        )}
        <p className="text-[10px] text-muted-foreground mt-1">{relativeTime(note.created_at)}</p>
      </div>
    </div>
  );
}

function getInitials(userId: string): string {
  return userId.slice(0, 2).toUpperCase();
}
