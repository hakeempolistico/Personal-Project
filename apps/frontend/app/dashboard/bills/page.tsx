'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { apiClient } from '@/lib/api-client';
import { formatCurrency, formatDate } from '@/lib/utils';
import { currencies } from '@/lib/currencies';
import { Plus, Calendar, DollarSign, RefreshCw, Trash2, CheckCircle } from 'lucide-react';

const billSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  amount: z.coerce.number().positive('Amount must be positive'),
  currency: z.string().default('USD'),
  dueDay: z.coerce.number().min(1).max(31),
  frequency: z.string().min(1, 'Frequency is required'),
  categoryId: z.string().optional(),
  accountId: z.string().optional(),
});

type BillFormData = z.infer<typeof billSchema>;

const payBillSchema = z.object({
  accountId: z.string().min(1, 'Account is required'),
  amount: z.coerce.number().positive('Amount must be positive').optional(),
  notes: z.string().optional(),
});

type PayBillFormData = z.infer<typeof payBillSchema>;

interface Bill {
  id: string;
  name: string;
  amount: string;
  currency: string;
  dueDay: number;
  frequency: string;
  categoryId: string | null;
  accountId: string | null;
  isActive: boolean;
  lastPaidAt: string | null;
  nextDueAt: string;
  createdAt: string;
}

interface Account {
  id: string;
  name: string;
  type: string;
  balance: string;
  currency: string;
}

const frequencyLabels: Record<string, string> = {
  WEEKLY: 'Weekly',
  BIWEEKLY: 'Bi-weekly',
  MONTHLY: 'Monthly',
  QUARTERLY: 'Quarterly',
  YEARLY: 'Yearly',
};

export default function BillsPage() {
  const [bills, setBills] = useState<Bill[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [payingBillId, setPayingBillId] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [showPayModal, setShowPayModal] = useState(false);
  const [selectedBill, setSelectedBill] = useState<Bill | null>(null);
  const { toast } = useToast();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<BillFormData>({
    resolver: zodResolver(billSchema),
    defaultValues: {
      frequency: 'MONTHLY',
      dueDay: 1,
    },
  });

  const {
    register: registerPay,
    handleSubmit: handleSubmitPay,
    reset: resetPay,
    formState: { errors: payErrors },
  } = useForm<PayBillFormData>();

  useEffect(() => {
    fetchBills();
    fetchAccounts();
  }, []);

  const fetchBills = async () => {
    try {
      const data = await apiClient.get<Bill[]>('/bills');
      setBills(data);
    } catch (error) {
      console.error('Failed to fetch bills:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchAccounts = async () => {
    try {
      const data = await apiClient.get<Account[]>('/accounts');
      setAccounts(data);
    } catch (error) {
      console.error('Failed to fetch accounts:', error);
    }
  };

  const onSubmit = async (data: BillFormData) => {
    console.log('Form submitted with data:', data);
    setIsCreating(true);
    try {
      await apiClient.post('/bills', data);
      toast({ title: 'Bill created successfully!' });
      reset({ frequency: 'MONTHLY', dueDay: 1 });
      setShowModal(false);
      fetchBills();
    } catch (error) {
      console.error('Failed to create bill:', error);
      toast({
        variant: 'destructive',
        title: 'Failed to create bill',
        description: error instanceof Error ? error.message : 'An error occurred',
      });
    } finally {
      setIsCreating(false);
    }
  };

  const openPayModal = (bill: Bill) => {
    setSelectedBill(bill);
    resetPay({ accountId: bill.accountId || '', amount: undefined, notes: '' });
    setShowPayModal(true);
  };

  const handlePayBill = async (data: PayBillFormData) => {
    if (!selectedBill) return;
    setPayingBillId(selectedBill.id);
    try {
      await apiClient.post(`/bills/${selectedBill.id}/pay`, {
        accountId: data.accountId,
        amount: data.amount,
        notes: data.notes,
      });
      toast({ title: 'Bill paid successfully! Transaction created.' });
      setShowPayModal(false);
      setSelectedBill(null);
      resetPay();
      fetchBills();
    } catch (error) {
      console.error('Failed to pay bill:', error);
      toast({
        variant: 'destructive',
        title: 'Failed to pay bill',
        description: error instanceof Error ? error.message : 'An error occurred',
      });
    } finally {
      setPayingBillId(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this bill?')) return;
    
    try {
      await apiClient.delete(`/bills/${id}`);
      toast({ title: 'Bill deleted successfully!' });
      fetchBills();
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Failed to delete bill',
      });
    }
  };

  const getDaysUntilDue = (nextDueAt: string) => {
    const now = new Date();
    const due = new Date(nextDueAt);
    const diff = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return diff;
  };

  const getDueBadge = (nextDueAt: string) => {
    const days = getDaysUntilDue(nextDueAt);
    if (days < 0) {
      return <Badge variant="destructive">Overdue</Badge>;
    } else if (days <= 3) {
      return <Badge variant="destructive">Due soon</Badge>;
    } else if (days <= 7) {
      return <Badge variant="secondary">Due in {days} days</Badge>;
    }
    return <Badge variant="outline">{formatDate(nextDueAt)}</Badge>;
  };

  const totalMonthly = bills
    .filter((b) => b.isActive)
    .reduce((sum, bill) => {
      switch (bill.frequency) {
        case 'WEEKLY': return sum + Number(bill.amount) * 4;
        case 'BIWEEKLY': return sum + Number(bill.amount) * 2;
        case 'MONTHLY': return sum + Number(bill.amount);
        case 'QUARTERLY': return sum + Number(bill.amount) / 3;
        case 'YEARLY': return sum + Number(bill.amount) / 12;
        default: return sum;
      }
    }, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Bills</h1>
        <p className="text-muted-foreground">Track your recurring bills and subscriptions</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Bills</p>
                <p className="text-2xl font-bold">{bills.filter((b) => b.isActive).length}</p>
              </div>
              <DollarSign className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Monthly Total</p>
                <p className="text-2xl font-bold">{formatCurrency(totalMonthly)}</p>
              </div>
              <Calendar className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Due This Week</p>
                <p className="text-2xl font-bold">
                  {bills.filter((b) => {
                    const days = getDaysUntilDue(b.nextDueAt);
                    return b.isActive && days >= 0 && days <= 7;
                  }).length}
                </p>
              </div>
              <RefreshCw className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Your Bills</h2>
        {isLoading ? (
          <p className="text-muted-foreground">Loading bills...</p>
        ) : bills.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center">
              <DollarSign className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No bills yet. Add your first bill above.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {bills.map((bill) => (
              <Card key={bill.id} className={!bill.isActive ? 'opacity-60' : ''}>
                <CardContent className="pt-6">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="font-semibold text-lg">{bill.name}</h3>
                      <p className="text-2xl font-bold text-primary">
                        {formatCurrency(Number(bill.amount), bill.currency || 'USD')}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {frequencyLabels[bill.frequency] || bill.frequency}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      {getDueBadge(bill.nextDueAt)}
                      <Badge variant={bill.isActive ? 'default' : 'secondary'}>
                        {bill.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => openPayModal(bill)}
                      disabled={payingBillId === bill.id}
                    >
                      <CheckCircle className="mr-2 h-4 w-4" />
                      {payingBillId === bill.id ? 'Processing...' : 'Pay Bill'}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(bill.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Floating Action Button */}
      <button
        id="add-bill-fab"
        onClick={() => setShowModal(true)}
        className="fixed bottom-6 right-6 w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-lg hover:bg-primary/90 transition-colors flex items-center justify-center z-50"
      >
        <Plus className="h-6 w-6" />
      </button>

      {/* Add Bill Modal */}
      <Dialog open={showModal} onClose={() => setShowModal(false)} title="Add New Bill" description="Add a recurring bill or subscription">
        <DialogContent>
          <form id="bill-form" onSubmit={(e) => {
            console.log('Form submit event triggered');
            e.preventDefault();
            handleSubmit(onSubmit)();
          }} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="modal-name">Bill Name</Label>
              <Input id="modal-name" placeholder="e.g., Internet" {...register('name')} />
              {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="modal-amount">Amount</Label>
                <Input id="modal-amount" type="number" step="0.01" placeholder="0.00" {...register('amount')} />
                {errors.amount && <p className="text-sm text-destructive">{errors.amount.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="modal-currency">Currency</Label>
                <select
                  id="modal-currency"
                  {...register('currency')}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  {currencies.map((curr) => (
                    <option key={curr.code} value={curr.code}>
                      {curr.code} ({curr.symbol})
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="modal-dueDay">Due Day (1-31)</Label>
              <Input id="modal-dueDay" type="number" min="1" max="31" {...register('dueDay')} />
              {errors.dueDay && <p className="text-sm text-destructive">{errors.dueDay.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="modal-frequency">Frequency</Label>
              <select
                id="modal-frequency"
                {...register('frequency')}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <option value="WEEKLY">Weekly</option>
                <option value="BIWEEKLY">Bi-weekly</option>
                <option value="MONTHLY">Monthly</option>
                <option value="QUARTERLY">Quarterly</option>
                <option value="YEARLY">Yearly</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="modal-account">Default Account (Optional)</Label>
              <select
                id="modal-account"
                {...register('accountId')}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <option value="">No default account</option>
                {accounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>{acc.name}</option>
                ))}
              </select>
            </div>
            <div className="flex gap-2 justify-end">
              <button 
                type="button" 
                className="h-10 px-4 py-2 rounded-md border border-input bg-background hover:bg-accent hover:text-accent-foreground text-sm font-medium"
                onClick={() => setShowModal(false)}
              >
                Cancel
              </button>
              <button 
                type="submit" 
                disabled={isCreating}
                onClick={() => console.log('Submit button clicked')}
                className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2"
              >
                {isCreating ? 'Creating...' : 'Add Bill'}
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Pay Bill Modal */}
      <Dialog open={showPayModal} onClose={() => setShowPayModal(false)} title={`Pay ${selectedBill?.name || 'Bill'}`} description="Select an account to pay from">
        <DialogContent>
          <form onSubmit={handleSubmitPay(handlePayBill)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="pay-account">Pay From Account *</Label>
              <select
                id="pay-account"
                {...registerPay('accountId')}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <option value="">Select an account</option>
                {accounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.name} ({formatCurrency(Number(acc.balance), acc.currency)})
                  </option>
                ))}
              </select>
              {payErrors.accountId && <p className="text-sm text-destructive">{payErrors.accountId.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="pay-amount">Amount (optional)</Label>
              <Input 
                id="pay-amount" 
                type="number" 
                step="0.01" 
                placeholder={`Default: ${selectedBill?.amount || '0.00'}`} 
                {...registerPay('amount')} 
              />
              {payErrors.amount && <p className="text-sm text-destructive">{payErrors.amount.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="pay-notes">Notes (optional)</Label>
              <Input 
                id="pay-notes" 
                placeholder="e.g., Electricity bill" 
                {...registerPay('notes')} 
              />
            </div>
            <div className="flex gap-2 justify-end">
              <button 
                type="button" 
                className="h-10 px-4 py-2 rounded-md border border-input bg-background hover:bg-accent hover:text-accent-foreground text-sm font-medium"
                onClick={() => {
                  setShowPayModal(false);
                  setSelectedBill(null);
                  resetPay();
                }}
              >
                Cancel
              </button>
              <button 
                type="submit" 
                disabled={payingBillId !== null}
                className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2"
              >
                {payingBillId !== null ? 'Processing...' : 'Pay Bill'}
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
