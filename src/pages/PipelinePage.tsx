import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { calculateLeadScore, fetchDistinctCities, fetchDistinctIndustries, type Company } from '@/lib/api';
import { fetchLeadNoteCounts } from '@/lib/lead-notes-api';
import { logLeadActivity } from '@/lib/lead-notes-api';
import { useAuth } from '@/hooks/useAuth';
import LeadSlideOver from '@/components/LeadSlideOver';
import ScoreBadge from '@/components/ScoreBadge';
import IndustryBadge from '@/components/IndustryBadge';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { LayoutGrid, List, MessageSquare, MapPin, ArrowRight } from 'lucide-react';
import { toast } from '@/components/ui/sonner';
import {
  DndContext,
  DragOverlay,
  closestCorners,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
} from '@dnd-kit/core';
import { useDroppable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { Link } from 'react-router-dom';

type PipelineStage = 'new' | 'contacted' | 'meeting' | 'customer' | 'not_interested';

const STAGES: { id: PipelineStage; label: string; color: string; bgColor: string; dotColor: string }[] = [
  { id: 'new', label: 'Ny', color: 'text-muted-foreground', bgColor: 'bg-muted/50', dotColor: 'bg-muted-foreground' },
  { id: 'contacted', label: 'Kontaktad', color: 'text-blue-600', bgColor: 'bg-blue-50 dark:bg-blue-950/30', dotColor: 'bg-blue-500' },
  { id: 'meeting', label: 'Möte bokat', color: 'text-violet-600', bgColor: 'bg-violet-50 dark:bg-violet-950/30', dotColor: 'bg-violet-500' },
  { id: 'customer', label: 'Kund', color: 'text-emerald-600', bgColor: 'bg-emerald-50 dark:bg-emerald-950/30', dotColor: 'bg-emerald-500' },
  { id: 'not_interested', label: 'Ej intressant', color: 'text-red-600', bgColor: 'bg-red-50 dark:bg-red-950/30', dotColor: 'bg-red-500' },
];

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '–';
  const d = new Date(dateStr);
  return d.toLocaleDateString('sv-SE', { day: 'numeric', month: 'short' });
}

// Droppable column
function DroppableColumn({ stage, children, count }: { stage: typeof STAGES[number]; children: React.ReactNode; count: number }) {
  const { setNodeRef, isOver } = useDroppable({ id: stage.id });
  return (
    <div
      ref={setNodeRef}
      className={`flex flex-col min-w-[240px] w-full rounded-xl border transition-colors ${isOver ? 'border-primary/50 bg-primary/5' : 'border-border/50 bg-card/30'}`}
    >
      <div className="flex items-center gap-2 px-3 py-3 border-b border-border/30">
        <div className={`w-2 h-2 rounded-full ${stage.dotColor}`} />
        <span className={`text-sm font-semibold ${stage.color}`}>{stage.label}</span>
        <Badge variant="secondary" className="ml-auto text-[10px] h-5 min-w-[1.25rem] justify-center">{count}</Badge>
      </div>
      <div className="flex-1 overflow-y-auto p-2 space-y-2 min-h-[200px] max-h-[calc(100vh-240px)]">
        {children}
      </div>
    </div>
  );
}

// Draggable lead card
function LeadCard({
  company,
  score,
  noteCount,
  onClick,
  isDragging,
}: {
  company: Company;
  score: number;
  noteCount: number;
  onClick: () => void;
  isDragging?: boolean;
}) {
  return (
    <div
      className={`rounded-lg border bg-card p-3 cursor-grab active:cursor-grabbing transition-shadow ${isDragging ? 'shadow-lg opacity-80 rotate-1' : 'shadow-sm hover:shadow-md'}`}
    >
      <div className="flex items-start justify-between gap-2 mb-1.5">
        <button
          onClick={(e) => { e.stopPropagation(); onClick(); }}
          className="text-sm font-semibold text-foreground hover:text-primary hover:underline text-left truncate"
        >
          {company.company_name}
        </button>
        <ScoreBadge score={score} />
      </div>
      {company.industry_label && (
        <div className="mb-1.5">
          <IndustryBadge industry={company.industry_label} />
        </div>
      )}
      <div className="flex items-center justify-between text-[11px] text-muted-foreground">
        <span className="flex items-center gap-1">
          {company.city && <><MapPin className="w-3 h-3" />{company.city}</>}
          {company.city && company.registration_date && ' · '}
          {formatDate(company.registration_date)}
        </span>
        {noteCount > 0 && (
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="flex items-center gap-0.5 text-muted-foreground">
                <MessageSquare className="w-3 h-3" />
                {noteCount}
              </span>
            </TooltipTrigger>
            <TooltipContent>{noteCount} anteckning{noteCount !== 1 ? 'ar' : ''}</TooltipContent>
          </Tooltip>
        )}
      </div>
    </div>
  );
}

export default function PipelinePage() {
  const { user } = useAuth();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [noteCounts, setNoteCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'kanban' | 'list'>('kanban');
  const [filterCity, setFilterCity] = useState('');
  const [filterIndustry, setFilterIndustry] = useState('');
  const [cities, setCities] = useState<string[]>([]);
  const [industries, setIndustries] = useState<string[]>([]);
  const [selectedLead, setSelectedLead] = useState<Company | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const loadData = useCallback(async () => {
    setLoading(true);
    const { data, error } = await (supabase as any)
      .from('companies')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(500);

    if (!error && data) {
      setCompanies(data);
      const ids = data.map((c: Company) => c.id);
      if (ids.length > 0) {
        const counts = await fetchLeadNoteCounts(ids);
        setNoteCounts(counts);
      }
    }
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  useEffect(() => {
    Promise.all([fetchDistinctCities(), fetchDistinctIndustries()]).then(([c, i]) => {
      setCities(c);
      setIndustries(i);
    });
  }, []);

  const filtered = useMemo(() => {
    return companies.filter(c => {
      if (filterCity && c.city !== filterCity) return false;
      if (filterIndustry && c.industry_label !== filterIndustry) return false;
      return true;
    });
  }, [companies, filterCity, filterIndustry]);

  const grouped = useMemo(() => {
    const map: Record<PipelineStage, Company[]> = {
      new: [], contacted: [], meeting: [], customer: [], not_interested: [],
    };
    filtered.forEach(c => {
      const stage = ((c as any).pipeline_stage || 'new') as PipelineStage;
      if (map[stage]) map[stage].push(c);
      else map.new.push(c);
    });
    return map;
  }, [filtered]);

  const scores = useMemo(() => {
    const m: Record<string, number> = {};
    companies.forEach(c => { m[c.id] = calculateLeadScore(c); });
    return m;
  }, [companies]);

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveId(null);
    const { active, over } = event;
    if (!over) return;
    const companyId = active.id as string;
    const newStage = over.id as PipelineStage;
    const company = companies.find(c => c.id === companyId);
    if (!company) return;
    const oldStage = (company as any).pipeline_stage || 'new';
    if (oldStage === newStage) return;

    // Optimistic update
    setCompanies(prev => prev.map(c => c.id === companyId ? { ...c, pipeline_stage: newStage } as any : c));

    const { error } = await (supabase as any)
      .from('companies')
      .update({ pipeline_stage: newStage })
      .eq('id', companyId);

    if (error) {
      toast.error('Kunde inte uppdatera pipeline-steg');
      setCompanies(prev => prev.map(c => c.id === companyId ? { ...c, pipeline_stage: oldStage } as any : c));
    } else {
      toast.success(`Flyttad till ${STAGES.find(s => s.id === newStage)?.label}`);
      if (user) {
        const oldLabel = STAGES.find(s => s.id === oldStage)?.label || oldStage;
        const newLabel = STAGES.find(s => s.id === newStage)?.label || newStage;
        await logLeadActivity(companyId, user.id, 'pipeline_change', oldLabel, newLabel);
      }
    }
  };

  const activeCompany = activeId ? companies.find(c => c.id === activeId) : null;

  const handleLeadUpdated = () => { loadData(); };

  if (loading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-10 w-60" />
        <div className="flex gap-4">
          {[1,2,3,4,5].map(i => <Skeleton key={i} className="h-[400px] flex-1 rounded-xl" />)}
        </div>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="flex flex-wrap items-center gap-3 px-6 py-4 border-b border-border/40">
          <h1 className="text-xl font-bold text-foreground mr-auto">Pipeline</h1>
          <Select value={filterIndustry} onValueChange={v => setFilterIndustry(v === '_all' ? '' : v)}>
            <SelectTrigger className="w-44 h-9 text-xs"><SelectValue placeholder="Bransch" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="_all">Alla branscher</SelectItem>
              {industries.map(i => <SelectItem key={i} value={i}>{i.length > 30 ? i.slice(0, 28) + '…' : i}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filterCity} onValueChange={v => setFilterCity(v === '_all' ? '' : v)}>
            <SelectTrigger className="w-36 h-9 text-xs"><SelectValue placeholder="Stad" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="_all">Alla städer</SelectItem>
              {cities.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
          <ToggleGroup type="single" value={viewMode} onValueChange={v => v && setViewMode(v as 'kanban' | 'list')} className="border rounded-lg p-0.5">
            <ToggleGroupItem value="kanban" className="h-8 w-8 p-0"><LayoutGrid className="w-4 h-4" /></ToggleGroupItem>
            <ToggleGroupItem value="list" className="h-8 w-8 p-0"><List className="w-4 h-4" /></ToggleGroupItem>
          </ToggleGroup>
        </div>

        {/* Content */}
        {viewMode === 'kanban' ? (
          <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
            <div className="flex-1 overflow-x-auto p-4">
              <div className="flex gap-3 min-w-max">
                {STAGES.map(stage => {
                  const items = grouped[stage.id];
                  return (
                    <DroppableColumn key={stage.id} stage={stage} count={items.length}>
                      {items.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground/60">
                          <p className="text-xs mb-2">Dra dina leads hit för att starta din säljprocess</p>
                          <Button variant="ghost" size="sm" className="text-xs" asChild>
                            <Link to="/leads">Importera från Leads <ArrowRight className="w-3 h-3 ml-1" /></Link>
                          </Button>
                        </div>
                      ) : (
                        items.map(c => (
                          <DraggableCard key={c.id} id={c.id}>
                            <LeadCard
                              company={c}
                              score={scores[c.id] || 0}
                              noteCount={noteCounts[c.id] || 0}
                              onClick={() => setSelectedLead(c)}
                            />
                          </DraggableCard>
                        ))
                      )}
                    </DroppableColumn>
                  );
                })}
              </div>
            </div>
            <DragOverlay>
              {activeCompany && (
                <LeadCard
                  company={activeCompany}
                  score={scores[activeCompany.id] || 0}
                  noteCount={noteCounts[activeCompany.id] || 0}
                  onClick={() => {}}
                  isDragging
                />
              )}
            </DragOverlay>
          </DndContext>
        ) : (
          /* List view */
          <div className="flex-1 overflow-auto p-4">
            <div className="rounded-xl border border-border/50 overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/30">
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Bolag</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Steg</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Bransch</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Stad</th>
                    <th className="text-center px-4 py-3 font-medium text-muted-foreground">Score</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(c => {
                    const stage = STAGES.find(s => s.id === ((c as any).pipeline_stage || 'new'));
                    return (
                      <tr key={c.id} className="border-b border-border/20 hover:bg-muted/20">
                        <td className="px-4 py-3">
                          <button onClick={() => setSelectedLead(c)} className="font-medium text-foreground hover:text-primary hover:underline">
                            {c.company_name}
                          </button>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`text-xs font-medium ${stage?.color}`}>{stage?.label}</span>
                        </td>
                        <td className="px-4 py-3"><IndustryBadge industry={c.industry_label} /></td>
                        <td className="px-4 py-3 text-muted-foreground">{c.city || '–'}</td>
                        <td className="px-4 py-3 text-center"><ScoreBadge score={scores[c.id] || 0} /></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {selectedLead && (
          <LeadSlideOver
            company={selectedLead}
            open={!!selectedLead}
            onClose={() => setSelectedLead(null)}
            onLeadUpdated={handleLeadUpdated}
          />
        )}
      </div>
    </TooltipProvider>
  );
}

// Draggable wrapper
function DraggableCard({ id, children }: { id: string; children: React.ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable(id);
  const style = transform ? { transform: `translate(${transform.x}px, ${transform.y}px)` } : undefined;

  return (
    <div ref={setNodeRef} style={style} {...listeners} {...attributes} className={isDragging ? 'opacity-30' : ''}>
      {children}
    </div>
  );
}

function useDraggable(id: string) {
  const { setNodeRef, attributes, listeners, transform, isDragging } = require('@dnd-kit/core').useDraggable({ id });
  return { setNodeRef, attributes, listeners, transform, isDragging };
}
