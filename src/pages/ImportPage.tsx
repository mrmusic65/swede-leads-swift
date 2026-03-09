import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Upload, FileText, CheckCircle2, AlertCircle, ArrowRight, ArrowLeft, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import ColumnMapper from '@/components/ColumnMapper';
import { parseCSVFile, executeImport, autoMapColumns, DB_FIELDS, type ColumnMap, type ParseResult, type ImportResult } from '@/lib/import-api';

type Step = 'upload' | 'map' | 'importing' | 'results';

export default function ImportPage() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<Step>('upload');
  const [csvText, setCsvText] = useState('');
  const [fileName, setFileName] = useState('');
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);
  const [columnMap, setColumnMap] = useState<ColumnMap>({});
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [loading, setLoading] = useState(false);

  const handleFile = async (file: File) => {
    setLoading(true);
    try {
      const text = await file.text();
      if (!text.trim()) throw new Error('Filen verkar tom.');
      setCsvText(text);
      setFileName(file.name);

      const result = await parseCSVFile(text);
      setParseResult(result);

      // Auto-map columns
      const auto = autoMapColumns(result.headers);
      setColumnMap(auto);
      setStep('map');
    } catch (error: any) {
      toast({ title: 'Fel', description: error.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleImport = async () => {
    if (!columnMap.company_name) {
      toast({ title: 'Saknas', description: 'Du måste mappa "Bolagsnamn" till en CSV-kolumn.', variant: 'destructive' });
      return;
    }

    setStep('importing');
    try {
      const result = await executeImport(csvText, fileName, columnMap);
      setImportResult(result);
      setStep('results');
    } catch (error: any) {
      toast({ title: 'Importfel', description: error.message, variant: 'destructive' });
      setStep('map');
    }
  };

  const goToLeads = () => {
    const ids = importResult?.inserted_ids;
    if (ids && ids.length > 0) {
      // Store IDs in sessionStorage for highlighting
      sessionStorage.setItem('highlight_import_ids', JSON.stringify(ids));
    }
    navigate('/leads');
  };

  const reset = () => {
    setStep('upload');
    setCsvText('');
    setFileName('');
    setParseResult(null);
    setColumnMap({});
    setImportResult(null);
    if (fileRef.current) fileRef.current.value = '';
  };

  const mappedCount = Object.keys(columnMap).length;
  const requiredMapped = DB_FIELDS.filter(f => f.required).every(f => columnMap[f.key]);

  return (
    <div className="space-y-6 max-w-3xl animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Importera CSV</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {step === 'upload' && 'Steg 1: Ladda upp din CSV-fil'}
          {step === 'map' && 'Steg 2: Mappa kolumner till databasfält'}
          {step === 'importing' && 'Importerar...'}
          {step === 'results' && 'Import klar'}
        </p>
      </div>

      {/* Step indicators */}
      <div className="flex items-center gap-2 text-xs">
        {(['upload', 'map', 'results'] as const).map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            {i > 0 && <div className="w-8 h-px bg-border" />}
            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold ${
              step === s || (step === 'importing' && s === 'results')
                ? 'bg-primary text-primary-foreground'
                : step === 'results' || (step === 'map' && s === 'upload') || (step === 'results' && s === 'map') || (step === 'importing' && s !== 'results')
                  ? 'bg-success text-success-foreground'
                  : 'bg-muted text-muted-foreground'
            }`}>
              {i + 1}
            </div>
            <span className="text-muted-foreground hidden sm:inline">
              {s === 'upload' && 'Ladda upp'}
              {s === 'map' && 'Mappa kolumner'}
              {s === 'results' && 'Resultat'}
            </span>
          </div>
        ))}
      </div>

      {/* ── STEP 1: Upload ── */}
      {step === 'upload' && (
        <Card>
          <CardContent className="pt-6">
            <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
            <div
              className="border-2 border-dashed border-border rounded-lg p-10 text-center cursor-pointer hover:border-primary/50 transition-colors"
              onClick={() => fileRef.current?.click()}
              onDragOver={e => e.preventDefault()}
              onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files?.[0]; if (f) handleFile(f); }}
            >
              {loading ? (
                <>
                  <Loader2 className="w-10 h-10 mx-auto text-primary mb-3 animate-spin" />
                  <p className="text-sm font-medium">Läser fil...</p>
                </>
              ) : (
                <>
                  <Upload className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
                  <p className="text-sm font-medium">Dra och släpp din CSV-fil här</p>
                  <p className="text-xs text-muted-foreground mt-1">eller klicka för att välja fil (max 5MB)</p>
                  <Button size="sm" variant="outline" className="mt-4">Välj fil</Button>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── STEP 2: Column Mapping ── */}
      {step === 'map' && parseResult && (
        <>
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <FileText className="w-4 h-4 text-primary" />
                  {fileName} — {parseResult.totalRows} rader, {parseResult.headers.length} kolumner
                </CardTitle>
                <span className="text-xs text-muted-foreground">{mappedCount} fält mappade</span>
              </div>
            </CardHeader>
            <CardContent>
              <ColumnMapper
                csvHeaders={parseResult.headers}
                columnMap={columnMap}
                onChange={setColumnMap}
                preview={parseResult.preview}
              />
            </CardContent>
          </Card>

          <div className="flex items-center justify-between">
            <Button variant="ghost" size="sm" onClick={reset}>
              <ArrowLeft className="w-4 h-4 mr-1" /> Tillbaka
            </Button>
            <Button size="sm" onClick={handleImport} disabled={!requiredMapped} className="gap-1.5">
              Importera {parseResult.totalRows} rader <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        </>
      )}

      {/* ── STEP: Importing ── */}
      {step === 'importing' && (
        <Card>
          <CardContent className="pt-6 text-center py-16">
            <Loader2 className="w-10 h-10 mx-auto text-primary mb-3 animate-spin" />
            <p className="text-sm font-medium">Importerar {parseResult?.totalRows} rader...</p>
            <p className="text-xs text-muted-foreground mt-1">Kontrollerar dubbletter och validerar data</p>
          </CardContent>
        </Card>
      )}

      {/* ── STEP 3: Results ── */}
      {step === 'results' && importResult && (
        <>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center mb-6">
                {importResult.imported > 0 ? (
                  <CheckCircle2 className="w-12 h-12 mx-auto text-success mb-3" />
                ) : (
                  <AlertCircle className="w-12 h-12 mx-auto text-warning mb-3" />
                )}
                <h2 className="text-lg font-bold">
                  {importResult.imported > 0 ? 'Import klar!' : 'Ingen data importerades'}
                </h2>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <ResultStat label="Totalt rader" value={importResult.total_rows} />
                <ResultStat label="Importerade" value={importResult.imported} variant="success" />
                <ResultStat label="Överhoppade" value={importResult.skipped} variant={importResult.skipped > 0 ? 'warning' : 'default'} />
                <ResultStat label="Dubbletter" value={importResult.duplicates} variant={importResult.duplicates > 0 ? 'warning' : 'default'} />
              </div>

              {importResult.skipped > 0 && importResult.skipped_rows.length > 0 && (
                <div className="mt-4 p-3 bg-muted rounded-lg">
                  <p className="text-xs font-medium text-muted-foreground mb-1">Överhoppade rader (saknar bolagsnamn):</p>
                  <p className="text-xs text-muted-foreground">Rad {importResult.skipped_rows.join(', ')}</p>
                </div>
              )}

              {importResult.duplicates > 0 && importResult.duplicate_rows.length > 0 && (
                <div className="mt-3 p-3 bg-muted rounded-lg">
                  <p className="text-xs font-medium text-muted-foreground mb-1">Dubbletter (org.nr eller namn+stad finns redan):</p>
                  <p className="text-xs text-muted-foreground">Rad {importResult.duplicate_rows.join(', ')}</p>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="flex items-center justify-between">
            <Button variant="ghost" size="sm" onClick={reset}>
              Importera fler
            </Button>
            {importResult.imported > 0 && (
              <Button size="sm" onClick={goToLeads} className="gap-1.5">
                Visa importerade leads <ArrowRight className="w-4 h-4" />
              </Button>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function ResultStat({ label, value, variant = 'default' }: { label: string; value: number; variant?: 'default' | 'success' | 'warning' }) {
  return (
    <div className="text-center p-3 bg-muted/50 rounded-lg">
      <p className={`text-2xl font-bold ${
        variant === 'success' ? 'text-success' :
        variant === 'warning' ? 'text-warning' :
        ''
      }`}>
        {value}
      </p>
      <p className="text-xs text-muted-foreground mt-1">{label}</p>
    </div>
  );
}
