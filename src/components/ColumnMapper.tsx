import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DB_FIELDS, type ColumnMap } from '@/lib/import-api';
import { Check, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { useState } from 'react';

interface ColumnMapperProps {
  csvHeaders: string[];
  columnMap: ColumnMap;
  onChange: (map: ColumnMap) => void;
  preview: Record<string, string>[];
}

export default function ColumnMapper({ csvHeaders, columnMap, onChange, preview }: ColumnMapperProps) {
  const [showUnmapped, setShowUnmapped] = useState(false);
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

  const mappedFields = DB_FIELDS.filter(f => columnMap[f.key]);
  const unmappedFields = DB_FIELDS.filter(f => !columnMap[f.key]);
  const mappedCount = mappedFields.length;

  const getPreviewValue = (dbField: string, rowIdx: number): string => {
    const csvCol = columnMap[dbField];
    if (!csvCol || !preview[rowIdx]) return '—';
    return preview[rowIdx][csvCol] || '—';
  };

  return (
    <div className="space-y-5">
      {/* Summary */}
      <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
        <Check className="w-5 h-5 text-success shrink-0" />
        <p className="text-sm">
          <span className="font-semibold">{mappedCount} av {DB_FIELDS.length}</span> fält mappade automatiskt.
          {mappedCount > 0 && ' Granska nedan och importera direkt om det ser korrekt ut.'}
        </p>
      </div>

      {/* Mapped fields - compact view */}
      {mappedFields.length > 0 && (
        <div className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground mb-2">Mappade fält</p>
          <div className="grid grid-cols-[1fr,auto,1fr,1fr] gap-3 items-center px-1 py-1.5 text-xs font-medium text-muted-foreground border-b">
            <span>Databasfält</span>
            <span></span>
            <span>CSV-kolumn</span>
            <span>Exempel</span>
          </div>
          {mappedFields.map(field => (
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
              <Check className="w-4 h-4 text-success" />
              <Select
                value={columnMap[field.key] || '__none__'}
                onValueChange={v => handleChange(field.key, v)}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">— Hoppa över —</SelectItem>
                  {csvHeaders.map(h => (
                    <SelectItem key={h} value={h} disabled={usedCsvHeaders.has(h) && columnMap[field.key] !== h}>
                      {h}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <span className="text-xs text-muted-foreground truncate">{getPreviewValue(field.key, 0)}</span>
            </div>
          ))}
        </div>
      )}

      {/* Unmapped fields - collapsed by default */}
      {unmappedFields.length > 0 && (
        <div>
          <button
            type="button"
            onClick={() => setShowUnmapped(!showUnmapped)}
            className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            {showUnmapped ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            {unmappedFields.length} ej mappade fält (sätts till null)
          </button>

          {showUnmapped && (
            <div className="mt-2 space-y-1">
              {unmappedFields.map(field => (
                <div
                  key={field.key}
                  className="grid grid-cols-[1fr,auto,1fr] gap-3 items-center px-1 py-1.5 rounded-md hover:bg-muted/30 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">{field.label}</span>
                    {field.required && (
                      <Badge variant="destructive" className="text-[10px] px-1.5 py-0">Krav</Badge>
                    )}
                  </div>
                  <span className="w-4 h-4 rounded-full border border-border flex items-center justify-center" />
                  <Select
                    value="__none__"
                    onValueChange={v => handleChange(field.key, v)}
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="Välj kolumn..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">— Hoppa över —</SelectItem>
                      {csvHeaders.map(h => (
                        <SelectItem key={h} value={h} disabled={usedCsvHeaders.has(h)}>
                          {h}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Preview table - shown by default */}
      {preview.length > 0 && mappedFields.length > 0 && (
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-2">
            Förhandsvisning ({Math.min(preview.length, 10)} rader)
          </p>
          <div className="border rounded-lg overflow-auto max-h-80">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs w-10">#</TableHead>
                  {mappedFields.map(f => (
                    <TableHead key={f.key} className="text-xs whitespace-nowrap">{f.label}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {preview.slice(0, 10).map((row, i) => (
                  <TableRow key={i}>
                    <TableCell className="text-xs text-muted-foreground">{i + 1}</TableCell>
                    {mappedFields.map(f => (
                      <TableCell key={f.key} className="text-xs truncate max-w-[200px]">
                        {row[columnMap[f.key]] || '—'}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}
    </div>
  );
}
