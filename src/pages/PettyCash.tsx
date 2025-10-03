import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatINR } from '@/lib/currency';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

const PettyCash = () => {
  const [advances, setAdvances] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAdvances();
  }, []);

  const fetchAdvances = async () => {
    try {
      const { data, error } = await supabase
        .from('petty_cash_advance')
        .select('*, employees(name), projects(name)')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAdvances(data || []);
    } catch (error) {
      console.error('Error fetching advances:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Petty Cash Advances</h1>
        <p className="text-muted-foreground">Track employee advances and expenses</p>
      </div>

      <Card>
        <CardContent className="pt-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee</TableHead>
                <TableHead>Project</TableHead>
                <TableHead className="text-right">Advance</TableHead>
                <TableHead className="text-right">Spent</TableHead>
                <TableHead className="text-right">Returned</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {advances.map((adv) => (
                <TableRow key={adv.id}>
                  <TableCell className="font-medium">{adv.employees?.name}</TableCell>
                  <TableCell>{adv.projects?.name || '-'}</TableCell>
                  <TableCell className="text-right">{formatINR(parseFloat(String(adv.advance_amount)))}</TableCell>
                  <TableCell className="text-right">{formatINR(parseFloat(String(adv.expense_total)))}</TableCell>
                  <TableCell className="text-right">{formatINR(parseFloat(String(adv.returned_amount)))}</TableCell>
                  <TableCell><Badge variant="outline">{adv.status}</Badge></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default PettyCash;
