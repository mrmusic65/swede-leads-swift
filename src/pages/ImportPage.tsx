import { Card, CardContent } from '@/components/ui/card';
import { Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function ImportPage() {
  return (
    <div className="space-y-6 max-w-2xl animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Importera CSV</h1>
        <p className="text-sm text-muted-foreground mt-1">Ladda upp en CSV-fil med bolagsdata</p>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="border-2 border-dashed border-border rounded-lg p-10 text-center">
            <Upload className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
            <p className="text-sm font-medium">Dra och släpp din CSV-fil här</p>
            <p className="text-xs text-muted-foreground mt-1">eller klicka för att välja fil</p>
            <Button size="sm" variant="outline" className="mt-4">
              Välj fil
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-4">
            Filen bör innehålla kolumner: company_name, org_number, city, industry_label, website_status, phone_number
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
