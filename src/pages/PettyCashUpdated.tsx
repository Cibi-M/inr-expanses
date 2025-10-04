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
import { Card, CardContent } from '@/components/ui/card';
import { Plus, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import { formatINR } from '@/lib/currency';
import { Badge } from '@/components/ui/badge';

interface Advance {
  id: string;
  employee_id: string;
  project_id: string | null;
  advance_amount: number;
  expense_total: number;
  returned_amount: number;
  status: string;
  notes: string;
  employees?: { name: string };
  projects?: { name: string };
}

const PettyCash = () => {
  const [advances, setAdvances] = useState<Advance[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [completeDialogOpen, setCompleteDialogOpen] = useState(false);
  const [selectedAdvance, setSelectedAdvance] = useState<Advance | null>(null);

  const [formData, setFormData] = useState({
    employee_id: '',
    project_id: '',
    advance_amount: '',
    type: 'personal' as 'personal' | 'office',
    notes: '',
  });

  const [completeData, setCompleteData] = useState({
    expense_total: '',
    returned_amount: '',
  });

  useEffect(() => {
    fetchAdvances();
    fetchEmployees();
    fetchProjects();
  }, []);

  const fetchAdvances = async () => {
    try {
      const { data, error } = await supabase
        .from('petty_cash_advance')
        .select('*, employees(name), projects(name)')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAdvances(data || []);
    } catch (error: any) {
      toast.error('Failed to fetch advances');
    } finally {
      setLoading(false);
    }
  };

  const fetchEmployees = async () => {
    try {
      const { data, error } = await supabase
        .from('employees')
        .select('id, name')
        .order('name');

      if (error) throw error;
      setEmployees(data || []);
    } catch (error: any) {
      toast.error('Failed to fetch employees');
    }
  };

  const fetchProjects = async () => {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('id, name')
        .order('name');

      if (error) throw error;
      setProjects(data || []);
    } catch (error: any) {
      toast.error('Failed to fetch projects');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.type === 'office' && !formData.project_id) {
      toast.error('Project is required for office expenses');
      return;
    }

    try {
      const advanceData = {
        employee_id: formData.employee_id,
        project_id: formData.type === 'office' ? formData.project_id : null,
        advance_amount: parseFloat(formData.advance_amount),
        expense_total: 0,
        returned_amount: 0,
        status: 'open' as 'open' | 'partially_returned' | 'closed',
        notes: formData.notes,
      };

      const { error } = await supabase
        .from('petty_cash_advance')
        .insert([advanceData]);

      if (error) throw error;
      toast.success('Petty cash advance created successfully');
      setDialogOpen(false);
      resetForm();
      fetchAdvances();
    } catch (error: any) {
      toast.error(error.message || 'Failed to create advance');
    }
  };

  const handleComplete = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedAdvance) return;

    try {
      const expenseTotal = parseFloat(completeData.expense_total);
      const returnedAmount = parseFloat(completeData.returned_amount);
      const advanceAmount = Number(selectedAdvance.advance_amount);

      if (expenseTotal + returnedAmount !== advanceAmount) {
        toast.error('Expense + Returned amount must equal Advance amount');
        return;
      }

      const { error } = await supabase
        .from('petty_cash_advance')
        .update({
          expense_total: expenseTotal,
          returned_amount: returnedAmount,
          status: 'closed',
        })
        .eq('id', selectedAdvance.id);

      if (error) throw error;
      toast.success('Petty cash transaction completed');
      setCompleteDialogOpen(false);
      setSelectedAdvance(null);
      setCompleteData({ expense_total: '', returned_amount: '' });
      fetchAdvances();
    } catch (error: any) {
      toast.error(error.message || 'Failed to complete transaction');
    }
  };

  const resetForm = () => {
    setFormData({
      employee_id: '',
      project_id: '',
      advance_amount: '',
      type: 'personal',
      notes: '',
    });
  };

  const openCompleteDialog = (advance: Advance) => {
    setSelectedAdvance(advance);
    setCompleteData({
      expense_total: '',
      returned_amount: '',
    });
    setCompleteDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Petty Cash Advances</h1>
          <p className="text-muted-foreground">
            Track employee advances and expenses
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              New Transaction
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>New Petty Cash Transaction</DialogTitle>
              <DialogDescription>
                Create a new petty cash advance
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="employee">Employee *</Label>
                <Select
                  value={formData.employee_id}
                  onValueChange={(value) => setFormData({ ...formData, employee_id: value })}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select employee" />
                  </SelectTrigger>
                  <SelectContent>
                    {employees.map((e) => (
                      <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="type">Type *</Label>
                <Select
                  value={formData.type}
                  onValueChange={(value: any) => setFormData({ ...formData, type: value, project_id: value === 'personal' ? '' : formData.project_id })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="personal">Personal</SelectItem>
                    <SelectItem value="office">Office</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {formData.type === 'office' && (
                <div className="space-y-2">
                  <Label htmlFor="project">Project *</Label>
                  <Select
                    value={formData.project_id}
                    onValueChange={(value) => setFormData({ ...formData, project_id: value })}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select project" />
                    </SelectTrigger>
                    <SelectContent>
                      {projects.map((p) => (
                        <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="advance_amount">Advance Amount (₹) *</Label>
                <Input
                  id="advance_amount"
                  type="number"
                  step="0.01"
                  value={formData.advance_amount}
                  onChange={(e) => setFormData({ ...formData, advance_amount: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={2}
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">Create Advance</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Dialog open={completeDialogOpen} onOpenChange={setCompleteDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Complete Transaction</DialogTitle>
            <DialogDescription>
              Enter the final amounts for this advance
            </DialogDescription>
          </DialogHeader>
          {selectedAdvance && (
            <form onSubmit={handleComplete} className="space-y-4">
              <div className="p-3 bg-muted rounded-lg space-y-1">
                <p className="text-sm text-muted-foreground">Employee</p>
                <p className="font-medium">{selectedAdvance.employees?.name}</p>
                <p className="text-sm text-muted-foreground mt-2">Advance Amount</p>
                <p className="font-medium">{formatINR(Number(selectedAdvance.advance_amount))}</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="expense_total">Amount Spent (₹) *</Label>
                <Input
                  id="expense_total"
                  type="number"
                  step="0.01"
                  value={completeData.expense_total}
                  onChange={(e) => setCompleteData({ ...completeData, expense_total: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="returned_amount">Amount Returned (₹) *</Label>
                <Input
                  id="returned_amount"
                  type="number"
                  step="0.01"
                  value={completeData.returned_amount}
                  onChange={(e) => setCompleteData({ ...completeData, returned_amount: e.target.value })}
                  required
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setCompleteDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">Complete</Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>

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
                  <TableHead>Employee</TableHead>
                  <TableHead>Project</TableHead>
                  <TableHead className="text-right">Advance</TableHead>
                  <TableHead className="text-right">Spent</TableHead>
                  <TableHead className="text-right">Returned</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {advances.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground">
                      No advances found
                    </TableCell>
                  </TableRow>
                ) : (
                  advances.map((adv) => (
                    <TableRow key={adv.id}>
                      <TableCell className="font-medium">{adv.employees?.name}</TableCell>
                      <TableCell>{adv.projects?.name || '-'}</TableCell>
                      <TableCell className="text-right">
                        {formatINR(Number(adv.advance_amount))}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatINR(Number(adv.expense_total))}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatINR(Number(adv.returned_amount))}
                      </TableCell>
                      <TableCell>
                        <Badge variant={adv.status === 'closed' ? 'secondary' : 'default'}>
                          {adv.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {adv.status !== 'closed' && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openCompleteDialog(adv)}
                          >
                            <CheckCircle className="h-4 w-4" />
                          </Button>
                        )}
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

export default PettyCash;
