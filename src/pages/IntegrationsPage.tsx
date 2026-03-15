import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Copy, Check, Plus, Trash2, Loader2, ExternalLink, Webhook, Key, Plug } from 'lucide-react';
import { toast } from 'sonner';

const CRM_INTEGRATIONS = [
  {
    name: 'HubSpot',
    description: 'Synka leads och kontakter med HubSpot CRM automatiskt.',
    logo: 'https://www.vectorlogo.zone/logos/hubspot/hubspot-icon.svg',
    docsUrl: 'https://developers.hubspot.com/docs/api/overview',
    color: 'bg-orange-500/10 border-orange-500/20',
  },
  {
    name: 'Pipedrive',
    description: 'Push nya leads direkt till din Pipedrive-pipeline.',
    logo: 'https://www.vectorlogo.zone/logos/pipedrive/pipedrive-icon.svg',
    docsUrl: 'https://developers.pipedrive.com/docs/api/v1',
    color: 'bg-green-500/10 border-green-500/20',
  },
  {
    name: 'Salesforce',
    description: 'Enterprise-integration med Salesforce CRM.',
    logo: 'https://www.vectorlogo.zone/logos/salesforce/salesforce-icon.svg',
    docsUrl: 'https://developer.salesforce.com/docs/apis',
    color: 'bg-blue-500/10 border-blue-500/20',
  },
];

interface ApiKey {
  id: string;
  name: string;
  key: string;
  created_at: string;
  last_used: string | null;
}

export default function IntegrationsPage() {
  const { user } = useAuth();
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [copiedWebhook, setCopiedWebhook] = useState(false);

  const webhookUrl = user
    ? `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/zapier-webhook?user_id=${user.id}`
    : '';

  useEffect(() => {
    if (user) loadKeys();
  }, [user]);

  const loadKeys = async () => {
    const { data } = await supabase
      .from('api_keys' as any)
      .select('*')
      .eq('user_id', user!.id)
      .order('created_at', { ascending: false });
    setApiKeys((data as any as ApiKey[]) || []);
    setLoading(false);
  };

  const generateKey = async () => {
    if (!user) return;
    setGenerating(true);
    const key = `lr_${crypto.randomUUID().replace(/-/g, '')}`;
    const { error } = await (supabase as any)
      .from('api_keys')
      .insert({ user_id: user.id, key, name: newKeyName.trim() || 'Default' });
    if (error) {
      toast.error('Kunde inte skapa API-nyckel');
    } else {
      toast.success('API-nyckel skapad');
      setNewKeyName('');
      loadKeys();
    }
    setGenerating(false);
  };

  const revokeKey = async (id: string) => {
    const { error } = await (supabase as any).from('api_keys').delete().eq('id', id);
    if (error) toast.error('Kunde inte ta bort');
    else {
      toast.success('API-nyckel återkallad');
      loadKeys();
    }
  };

  const copyToClipboard = async (text: string, id?: string) => {
    await navigator.clipboard.writeText(text);
    if (id) {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } else {
      setCopiedWebhook(true);
      setTimeout(() => setCopiedWebhook(false), 2000);
    }
    toast.success('Kopierad till urklipp');
  };

  const maskKey = (key: string) => `${key.slice(0, 7)}${'•'.repeat(20)}${key.slice(-4)}`;

  return (
    <div className="space-y-8 max-w-3xl animate-fade-in">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Integrationer</h1>
        <p className="text-sm text-muted-foreground mt-1">Anslut externa tjänster och hantera API-åtkomst</p>
      </div>

      {/* CRM Integrations */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2"><Plug className="w-4 h-4 text-primary" />CRM-integrationer</CardTitle>
          <CardDescription>Anslut ditt CRM för att synka leads automatiskt</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-3">
            {CRM_INTEGRATIONS.map(crm => (
              <div key={crm.name} className={`rounded-xl border p-4 flex flex-col items-center text-center gap-3 ${crm.color}`}>
                <img src={crm.logo} alt={crm.name} className="w-10 h-10" loading="lazy" />
                <div>
                  <p className="text-sm font-semibold">{crm.name}</p>
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{crm.description}</p>
                </div>
                <div className="flex flex-col gap-1.5 w-full mt-auto">
                  <Button size="sm" variant="outline" className="w-full" disabled>
                    <Plug className="w-3.5 h-3.5 mr-1.5" />Anslut
                  </Button>
                  <a href={crm.docsUrl} target="_blank" rel="noopener noreferrer" className="text-[10px] text-muted-foreground hover:text-foreground transition-colors flex items-center justify-center gap-1">
                    Dokumentation <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                </div>
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-4 text-center">CRM-integrationer kommer snart. Kontakta oss om du vill ha tidig tillgång.</p>
        </CardContent>
      </Card>

      {/* Zapier */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2"><Webhook className="w-4 h-4 text-primary" />Zapier / Webhook</CardTitle>
          <CardDescription>Använd din unika Webhook-URL i Zapier för att automatiskt skicka leads</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-sm font-medium mb-2">Din Webhook-URL</p>
            <div className="flex gap-2">
              <Input value={webhookUrl} readOnly className="font-mono text-xs bg-muted/50" />
              <Button size="sm" variant="outline" onClick={() => copyToClipboard(webhookUrl)} className="shrink-0">
                {copiedWebhook ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-2">Skicka en POST-request med JSON-data till denna URL för att skapa nya leads.</p>
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Zapier-guide</p>
              <p className="text-xs text-muted-foreground mt-0.5">Lär dig skapa ett Zap som skickar leads automatiskt</p>
            </div>
            <a href="https://zapier.com/apps/webhook/integrations" target="_blank" rel="noopener noreferrer">
              <Button size="sm" variant="ghost" className="gap-1.5 text-xs">
                Öppna guide <ExternalLink className="w-3 h-3" />
              </Button>
            </a>
          </div>
        </CardContent>
      </Card>

      {/* API Keys */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2"><Key className="w-4 h-4 text-primary" />API-nycklar</CardTitle>
          <CardDescription>Generera och hantera API-nycklar för programmatisk åtkomst</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Generate new key */}
          <div>
            <p className="text-sm font-medium mb-2">Skapa ny nyckel</p>
            <div className="flex gap-2">
              <Input
                placeholder="Nyckelnamn (t.ex. 'Produktion')"
                value={newKeyName}
                onChange={e => setNewKeyName(e.target.value)}
                className="flex-1"
                onKeyDown={e => e.key === 'Enter' && generateKey()}
              />
              <Button size="sm" onClick={generateKey} disabled={generating} className="gap-1.5 shrink-0">
                {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                Generera
              </Button>
            </div>
          </div>

          <Separator />

          {/* Keys table */}
          {loading ? (
            <div className="flex justify-center py-6"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
          ) : apiKeys.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">Inga API-nycklar skapade ännu.</p>
          ) : (
            <div className="rounded-lg border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Namn</TableHead>
                    <TableHead className="text-xs">Nyckel</TableHead>
                    <TableHead className="text-xs">Skapad</TableHead>
                    <TableHead className="text-xs w-20"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {apiKeys.map(k => (
                    <TableRow key={k.id}>
                      <TableCell className="text-sm font-medium">{k.name}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          <code className="text-xs text-muted-foreground font-mono">{maskKey(k.key)}</code>
                          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => copyToClipboard(k.key, k.id)}>
                            {copiedId === k.id ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {new Date(k.created_at).toLocaleDateString('sv-SE')}
                      </TableCell>
                      <TableCell>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive">
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Återkalla API-nyckel</AlertDialogTitle>
                              <AlertDialogDescription>Är du säker? Alla applikationer som använder denna nyckel slutar fungera omedelbart.</AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Avbryt</AlertDialogCancel>
                              <AlertDialogAction onClick={() => revokeKey(k.id)}>Återkalla</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          <div className="flex items-center justify-between pt-1">
            <p className="text-xs text-muted-foreground">Nycklar har full läsbehörighet till dina leads.</p>
            <a href="#" className="text-xs text-primary hover:underline flex items-center gap-1">
              API-dokumentation <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
