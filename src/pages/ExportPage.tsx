import { Card, CardContent } from '@/components/ui/card';
import { Download } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function ExportPage() {
  return (
    <div className="space-y-6 max-w-2xl animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Exportera CSV</h1>
        <p className="text-sm text-muted-foreground mt-1">Ladda ner leads som CSV-fil</p>
      </div>

      <Card>
        <CardContent className="pt-6 space-y-4">
          <p className="text-sm text-muted-foreground">
            Exportera alla leads baserat på dina aktiva filter. Filen innehåller all bolagsinformation, lead scores, och kontaktuppgifter.
          </p>
          <Button className="gap-1.5">
            <Download className="w-4 h-4" /> Ladda ner CSV
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
