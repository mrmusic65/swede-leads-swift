import { CheckCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

export default function SubscriptionSuccessPage() {
  return (
    <div className="max-w-lg mx-auto flex items-center justify-center py-20">
      <Card className="text-center">
        <CardContent className="pt-8 pb-8 space-y-6">
          <div className="flex justify-center">
            <CheckCircle className="h-16 w-16 text-green-500" />
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-bold tracking-tight">Betalningen lyckades!</h1>
            <p className="text-muted-foreground">
              Tack för din prenumeration. Din plan är nu aktiv och du har tillgång till alla funktioner.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Button asChild>
              <Link to="/">Gå till dashboarden</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link to="/subscription">Visa prenumeration</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
