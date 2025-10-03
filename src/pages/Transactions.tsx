import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Plus, ArrowUp, ArrowDown } from 'lucide-react';
import { toast } from 'sonner';
import { formatINR } from '@/lib/currency';
import { Badge } from '@/components/ui/badge';

interface Transaction {
  id: string;
  project_id: string;
  customer_id: string;
  transaction_type: string;
  fund_source: string;
  amount: number;
  payment_mode: string;
  reason: string;
  metadata: any;
  created_at: string;
  customers?: { name: string };
  projects?: { name: string };
}

const Transactions = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);

  const [formData, setFormData] = useState({
    customer_id: '',
    project_id: '',
    transaction_type: 'credit' as 'credit' | 'debit',
    fund_source: 'bank' as 'cash' | 'bank',
    amount: '',
    payment_mode: '',
    reason: '',
    metadata: {} as any,
  });

  useEffect(() => {
    fetchTransactions();
    fetchCustomers();
  }, []);

  useEffect(() => {
    if (formData.customer_id) {
      fetchProjectsByCustomer(formData.customer_id);
    }
  }, [formData.customer_id]);

  const fetchTransactions = async () => {
    try {
      const { data, error } = await supabase
        .from('transactions')
        .select('*, customers(name), projects(name)')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTransactions(data || []);
    } catch (error: any) {
      toast.error('Failed to fetch transactions');
    } finally {
      setLoading(false);
    }
  };

  const fetchCustomers = async () => {
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('id, name')
        .order('name');

      if (error) throw error;
      setCustomers(data || []);
    } catch (error: any) {
      toast.error('Failed to fetch customers');
    }
  };

  const fetchProjectsByCustomer = async (customerId: string) => {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('id, name')
        .eq('customer_id', customerId)
        .order('name');

      if (error) throw error;
      setProjects(data || []);
    } catch (error: any) {
      toast.error('Failed to fetch projects');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const txData = {
        ...formData,
        amount: parseFloat(formData.amount),
      };

      const { error } = await supabase
        .from('transactions')
        .insert([txData]);

      if (error) throw error;
      toast.success('Transaction created successfully');
      setDialogOpen(false);
      resetForm();
      fetchTransactions();
    } catch (error: any) {
      toast.error(error.message || 'Failed to create transaction');
    }
  };

  const resetForm = () => {
    setFormData({
      customer_id: '',
      project_id: '',
      transaction_type: 'credit',
      fund_source: 'bank',
      amount: '',
      payment_mode: '',
      reason: '',
      metadata: {},
    });
    setProjects([]);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Transactions</h1>
          <p className="text-muted-foreground">
            Track all project payments and expenses
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Transaction
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Add Transaction</DialogTitle>
              <DialogDescription>
                Record a new payment or expense
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="customer">Customer *</Label>
                <Select
                  value={formData.customer_id}
                  onValueChange={(value) => setFormData({ ...formData, customer_id: value, project_id: '' })}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select customer" />
                  </SelectTrigger>
                  <SelectContent>
                    {customers.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="project">Project *</Label>
                <Select
                  value={formData.project_id}
                  onValueChange={(value) => setFormData({ ...formData, project_id: value })}
                  required
                  disabled={!formData.customer_id}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={formData.customer_id ? "Select project" : "Select customer first"} />
                  </SelectTrigger>
                  <SelectContent>
                    {projects.map((p) => (
                      <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="transaction_type">Type *</Label>
                  <Select
                    value={formData.transaction_type}
                    onValueChange={(value: any) => setFormData({ ...formData, transaction_type: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="credit">Credit (Income)</SelectItem>
                      <SelectItem value="debit">Debit (Expense)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="fund_source">Fund Source *</Label>
                  <Select
                    value={formData.fund_source}
                    onValueChange={(value: any) => setFormData({ ...formData, fund_source: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash">Cash</SelectItem>
                      <SelectItem value="bank">Bank</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="amount">Amount (₹) *</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="payment_mode">Payment Mode *</Label>
                <Input
                  id="payment_mode"
                  placeholder="e.g., NEFT, UPI, Cash, Cheque"
                  value={formData.payment_mode}
                  onChange={(e) => setFormData({ ...formData, payment_mode: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="reason">Reason *</Label>
                <Textarea
                  id="reason"
                  value={formData.reason}
                  onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                  rows={3}
                  required
                />
              </div>
              {formData.fund_source === 'bank' && (
                <div className="space-y-2">
                  <Label htmlFor="utr">Bank Reference (UTR/Transaction ID)</Label>
                  <Input
                    id="utr"
                    placeholder="Enter bank reference"
                    value={formData.metadata.utr || ''}
                    onChange={(e) => setFormData({ 
                      ...formData, 
                      metadata: { ...formData.metadata, utr: e.target.value }
                    })}
                  />
                </div>
              )}
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">
                  Create Transaction
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent className="pt-6">
          {loading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-16 bg-muted animate-pulse rounded" />
              ))}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Project</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Fund</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Mode</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground">
                      No transactions found
                    </TableCell>
                  </TableRow>
                ) : (
                  transactions.map((tx) => (
                    <TableRow key={tx.id}>
                      <TableCell className="text-sm">
                        {new Date(tx.created_at).toLocaleDateString('en-IN')}
                      </TableCell>
                      <TableCell>{tx.customers?.name || '-'}</TableCell>
                      <TableCell>{tx.projects?.name || '-'}</TableCell>
                      <TableCell>
                        <Badge 
                          variant={tx.transaction_type === 'credit' ? 'default' : 'destructive'}
                          className="gap-1"
                        >
                          {tx.transaction_type === 'credit' ? (
                            <ArrowDown className="h-3 w-3" />
                          ) : (
                            <ArrowUp className="h-3 w-3" />
                          )}
                          {tx.transaction_type}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{tx.fund_source}</Badge>
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatINR(parseFloat(tx.amount))}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {tx.payment_mode}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Transactions;
