import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Play, Loader2, CheckCircle2, AlertCircle, Clock, FileText, ChevronDown, ChevronUp } from 'lucide-react';

interface ImportResult {
  success: boolean;
  imported: number;
  duplicates: number;
  skipped: number;
  total?: number;
  message?: string;
  error?: string;
}

interface ImportLog {
  id: string;
  created_at: string;
  file_name: string;
  source_name: string | null;
  status: string;
  fetched_rows: number | null;
  imported_rows: number | null;
  skipped_rows: number | null;
  duplicate_rows: number | null;
  error_message: string | null;
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
    completed: { label: 'Slutförd', variant: 'default' },
    failed: { label: 'Misslyckad', variant: 'destructive' },
    processing: { label: 'Pågår', variant: 'secondary' },
    pending: { label: 'Väntar', variant: 'outline' },
  };
  const m = map[status] ?? { label: status, variant: 'outline' as const };
  return <Badge variant={m.variant} className="text-xs">{m.label}</Badge>;
}

export default function AdminPage() {
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastImport, setLastImport] = useState<string | null>(null);
  const [logs, setLogs] = useState<ImportLog[]>([]);
  const [logsLoading, setLogsLoading] = useState(true);
  const [expandedLog, setExpandedLog] = useState<string | null>(null);

  const fetchLogs = async () => {
    setLogsLoading(true);
    const { data } = await supabase
      .from('imports')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);
    setLogs((data as unknown as ImportLog[]) ?? []);
    setLogsLoading(false);
  };

  useEffect(() => {
    fetchLogs();
  }, [result]);

  useEffect(() => {
    supabase
      .from('imports')
      .select('created_at')
      .eq('source_name', 'daily-import')
      .eq('status', 'completed')
      .order('created_at', { ascending: false })
      .limit(1)
      .then(({ data }) => {
        if (data && data.length > 0) {
          setLastImport(data[0].created_at);
        }
      });
  }, [result]);

  const runImport = async () => {
    setRunning(true);
    setResult(null);
    setError(null);
    try {
      const { data, error: fnError } = await supabase.functions.invoke('daily-import');
      if (fnError) throw fnError;
      setResult(data as ImportResult);
    } catch (err: any) {
      setError(err.message || 'Unknown error');
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Admin</h1>
        <p className="text-sm text-muted-foreground mt-1">Hantera daglig import och systemjobb</p>
      </div>

      {/* Manual import trigger */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Play className="w-4 h-4 text-primary" />
            Daglig import
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4 flex-wrap">
            <Button onClick={runImport} disabled={running} size="sm">
              {running ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Kör import...</>
              ) : (
                <><Play className="w-4 h-4 mr-2" /> Kör import nu</>
              )}
            </Button>

            {lastImport && (
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Clock className="w-3 h-3" />
                Senaste lyckade import: {new Date(lastImport).toLocaleString('sv-SE')}
              </span>
            )}
          </div>

          {result && (
            <div className="rounded-lg border bg-secondary/30 p-4 space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium">
                <CheckCircle2 className="w-4 h-4 text-success" />
                Import slutförd
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                <div>
                  <p className="text-muted-foreground text-xs">Totalt hämtade</p>
                  <p className="font-semibold">{result.total ?? (result.imported + result.skipped + result.duplicates)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Importerade</p>
                  <p className="font-semibold text-success">{result.imported}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Överhoppade</p>
                  <p className="font-semibold">{result.skipped}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Dubbletter</p>
                  <p className="font-semibold text-warning">{result.duplicates}</p>
                </div>
              </div>
              {result.message && (
                <p className="text-xs text-muted-foreground">{result.message}</p>
              )}
            </div>
          )}

          {error && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-destructive mt-0.5" />
              <div>
                <p className="text-sm font-medium text-destructive">Import misslyckades</p>
                <p className="text-xs text-muted-foreground mt-1">{error}</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Import Logs */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <FileText className="w-4 h-4 text-primary" />
            Import Logs
          </CardTitle>
        </CardHeader>
        <CardContent>
          {logsLoading ? (
            <p className="text-sm text-muted-foreground">Laddar loggar...</p>
          ) : logs.length === 0 ? (
            <p className="text-sm text-muted-foreground">Inga importer loggade ännu.</p>
          ) : (
            <div className="space-y-2">
              {logs.map(log => {
                const isExpanded = expandedLog === log.id;
                const isFailed = log.status === 'failed';
                return (
                  <div
                    key={log.id}
                    className={`rounded-lg border p-3 transition-colors ${isFailed ? 'border-destructive/30 bg-destructive/5' : 'bg-secondary/20'}`}
                  >
                    <button
                      onClick={() => setExpandedLog(isExpanded ? null : log.id)}
                      className="w-full flex items-center justify-between text-left"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <StatusBadge status={log.status} />
                        <span className="text-sm font-medium truncate">{log.source_name || log.file_name}</span>
                        <span className="text-xs text-muted-foreground shrink-0">
                          {new Date(log.created_at).toLocaleString('sv-SE')}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 shrink-0 ml-2">
                        {log.imported_rows != null && (
                          <span className="text-xs text-muted-foreground">
                            {log.imported_rows} importerade
                          </span>
                        )}
                        {isExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                      </div>
                    </button>

                    {isExpanded && (
                      <div className="mt-3 pt-3 border-t border-border space-y-3">
                        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-sm">
                          <div>
                            <p className="text-muted-foreground text-xs">Hämtade</p>
                            <p className="font-semibold">{log.fetched_rows ?? '–'}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground text-xs">Importerade</p>
                            <p className="font-semibold text-success">{log.imported_rows ?? '–'}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground text-xs">Överhoppade</p>
                            <p className="font-semibold">{log.skipped_rows ?? '–'}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground text-xs">Dubbletter</p>
                            <p className="font-semibold text-warning">{log.duplicate_rows ?? '–'}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground text-xs">Källa</p>
                            <p className="font-semibold truncate">{log.source_name || '–'}</p>
                          </div>
                        </div>

                        {log.error_message && (
                          <div className="rounded-md bg-destructive/10 border border-destructive/20 p-3">
                            <p className="text-xs font-medium text-destructive mb-1">Felmeddelande</p>
                            <pre className="text-xs text-muted-foreground whitespace-pre-wrap break-all font-mono">
                              {log.error_message}
                            </pre>
                          </div>
                        )}

                        <div className="text-xs text-muted-foreground">
                          <span className="font-medium">Filnamn:</span> {log.file_name}
                          <span className="mx-2">·</span>
                          <span className="font-medium">ID:</span> {log.id}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
