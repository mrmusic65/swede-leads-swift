import { useState, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Upload, FileText, CheckCircle2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { importCompaniesFromCSV } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

export default function ImportPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [importedCount, setImportedCount] = useState(0);
  const [fileName, setFileName] = useState('');

  const parseCSV = (text: string): Record<string, string>[] => {
    const lines = text.split('\n').filter(l => l.trim());
    if (lines.length < 2) return [];
    const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
    return lines.slice(1).map(line => {
      const values: string[] = [];
      let current = '';
      let inQuotes = false;
      for (const char of line) {
        if (char === '"') { inQuotes = !inQuotes; }
        else if (char === ',' && !inQuotes) { values.push(current.trim()); current = ''; }
        else { current += char; }
      }
      values.push(current.trim());
      const row: Record<string, string> = {};
      headers.forEach((h, i) => { row[h] = values[i] || ''; });
      return row;
    });
  };

  const handleFile = async (file: File) => {
    if (!user) return;
    setFileName(file.name);
    setStatus('loading');
    try {
      const text = await file.text();
      if (!text.trim()) throw new Error('Filen verkar tom.');
      const count = await importCompaniesFromCSV(text, file.name);
      setImportedCount(count);
      setStatus('success');
      toast({ title: 'Import klar!', description: `${count} bolag importerade.` });
    } catch (error: any) {
      setStatus('error');
      toast({ title: 'Importfel', description: error.message, variant: 'destructive' });
    }
  };

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };

  return (
    <div className="space-y-6 max-w-2xl animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Importera CSV</h1>
        <p className="text-sm text-muted-foreground mt-1">Ladda upp en CSV-fil med bolagsdata</p>
      </div>

      <Card>
        <CardContent className="pt-6">
          <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={onFileChange} />
          <div
            className="border-2 border-dashed border-border rounded-lg p-10 text-center cursor-pointer hover:border-primary/50 transition-colors"
            onClick={() => fileRef.current?.click()}
            onDragOver={e => e.preventDefault()}
            onDrop={onDrop}
          >
            {status === 'loading' ? (
              <>
                <FileText className="w-10 h-10 mx-auto text-primary mb-3 animate-pulse" />
                <p className="text-sm font-medium">Importerar {fileName}...</p>
              </>
            ) : status === 'success' ? (
              <>
                <CheckCircle2 className="w-10 h-10 mx-auto text-success mb-3" />
                <p className="text-sm font-medium">{importedCount} bolag importerade!</p>
                <Button size="sm" variant="outline" className="mt-4" onClick={() => setStatus('idle')}>Importera fler</Button>
              </>
            ) : status === 'error' ? (
              <>
                <AlertCircle className="w-10 h-10 mx-auto text-destructive mb-3" />
                <p className="text-sm font-medium">Import misslyckades</p>
                <Button size="sm" variant="outline" className="mt-4" onClick={() => setStatus('idle')}>Försök igen</Button>
              </>
            ) : (
              <>
                <Upload className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
                <p className="text-sm font-medium">Dra och släpp din CSV-fil här</p>
                <p className="text-xs text-muted-foreground mt-1">eller klicka för att välja fil</p>
                <Button size="sm" variant="outline" className="mt-4">Välj fil</Button>
              </>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-4">
            Kolumner: company_name, org_number, city, industry_label, website_status, phone_number (eller svenska namn: namn, organisationsnummer, stad, bransch, etc.)
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
