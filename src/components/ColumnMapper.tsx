import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { DB_FIELDS, type ColumnMap } from '@/lib/import-api';
import { Check, AlertCircle } from 'lucide-react';

interface ColumnMapperProps {
  csvHeaders: string[];
  columnMap: ColumnMap;
  onChange: (map: ColumnMap) => void;
  preview: Record<string, string>[];
}

export default function ColumnMapper({ csvHeaders, columnMap, onChange, preview }: ColumnMapperProps) {
  const usedCsvHeaders = new Set(Object.values(columnMap));

  const handleChange = (dbField: string, csvHeader: string) => {
    const next = { ...columnMap };
    if (csvHeader === '__none__') {
      delete next[dbField];
    } else {
      next[dbField] = csvHeader;
    }
    onChange(next);
  };

  const mappedCsvHeader = (dbField: string) => columnMap[dbField];

  // Get a preview value for a mapped field
  const getPreview = (dbField: string): string => {
    const csvCol = columnMap[dbField];
    if (!csvCol || !preview[0]) return '—';
    return preview[0][csvCol] || '—';
  };

  return (
    <div className="space-y-1">
      <div className="grid grid-cols-[1fr,auto,1fr,1fr] gap-3 items-center px-1 py-2 text-xs font-medium text-muted-foreground border-b">
        <span>Databasfält</span>
        <span></span>
        <span>CSV-kolumn</span>
        <span>Förhandsvisning</span>
      </div>
      {DB_FIELDS.map(field => {
        const mapped = mappedCsvHeader(field.key);
        const isMapped = !!mapped;

        return (
          <div
            key={field.key}
            className="grid grid-cols-[1fr,auto,1fr,1fr] gap-3 items-center px-1 py-1.5 rounded-md hover:bg-muted/30 transition-colors"
          >
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">{field.label}</span>
              {field.required && (
                <Badge variant="destructive" className="text-[10px] px-1.5 py-0">Krav</Badge>
              )}
            </div>

            <div className="w-5 flex justify-center">
              {isMapped ? (
                <Check className="w-4 h-4 text-success" />
              ) : field.required ? (
                <AlertCircle className="w-4 h-4 text-destructive" />
              ) : (
                <span className="w-4 h-4 rounded-full border border-border" />
              )}
            </div>

            <Select
              value={mapped || '__none__'}
              onValueChange={v => handleChange(field.key, v)}
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="Välj kolumn..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">— Hoppa över —</SelectItem>
                {csvHeaders.map(h => (
                  <SelectItem
                    key={h}
                    value={h}
                    disabled={usedCsvHeaders.has(h) && columnMap[field.key] !== h}
                  >
                    {h}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <span className="text-xs text-muted-foreground truncate">
              {getPreview(field.key)}
            </span>
          </div>
        );
      })}
    </div>
  );
}
