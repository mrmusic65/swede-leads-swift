import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Play, Loader2, CheckCircle2, AlertCircle, Clock } from 'lucide-react';

interface ImportResult {
  success: boolean;
  imported: number;
  duplicates: number;
  skipped: number;
  total?: number;
  message?: string;
  error?: string;
}

export default function AdminPage() {
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastImport, setLastImport] = useState<string | null>(null);

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
    </div>
  );
}
