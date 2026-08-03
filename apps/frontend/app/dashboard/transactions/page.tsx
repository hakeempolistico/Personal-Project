'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useRouter } from 'next/navigation';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { apiClient } from '@/lib/api-client';
import { formatCurrency, formatDate } from '@/lib/utils';
import { currencies } from '@/lib/currencies';
import { ArrowUpCircle, ArrowDownCircle, ArrowLeftRight, Plus } from 'lucide-react';

const transactionSchema = z.object({
  accountId: z.string().min(1, 'Account is required'),
  categoryId: z.string().optional(),
  type: z.enum(['INCOME', 'EXPENSE', 'TRANSFER']),
  amount: z.coerce.number().positive('Amount must be positive'),
  currency: z.string().default('USD'),
  description: z.string().optional(),
  date: z.string().min(1, 'Date is required'),
  notes: z.string().optional(),
});

type TransactionFormData = z.infer<typeof transactionSchema>;

interface Account {
  id: string;
  name: string;
  type: string;
  currency?: string;
}

interface Category {
  id: string;
  name: string;
  type: string;
}

interface Transaction {
  id: string;
  accountId: string;
  categoryId: string | null;
  type: string;
  amount: string;
  currency: string;
  description: string | null;
  date: string;
}

export default function TransactionsPage() {
  const router = useRouter();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const { toast } = useToast();

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<TransactionFormData>({
    resolver: zodResolver(transactionSchema),
    defaultValues: {
      type: 'EXPENSE',
      date: new Date().toISOString().split('T')[0],
    },
  });

  const transactionType = watch('type');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const transData = await apiClient.get<Transaction[]>('/transactions');
      setTransactions(transData);
    } catch (error) {
      console.error('Failed to fetch transactions:', error);
    }
    try {
      const accData = await apiClient.get<Account[]>('/accounts');
      setAccounts(accData);
    } catch (error) {
      console.error('Failed to fetch accounts:', error);
    }
    try {
      const catData = await apiClient.get<Category[]>('/categories');
      setCategories(catData);
    } catch (error) {
      console.error('Failed to fetch categories:', error);
    }
    setIsLoading(false);
  };

  const onSubmit = async (data: TransactionFormData) => {
    setIsCreating(true);
    try {
      await apiClient.post('/transactions', {
        ...data,
        categoryId: data.categoryId || null,
      });
      toast({ title: 'Transaction created successfully!' });
      reset({ type: 'EXPENSE', date: new Date().toISOString().split('T')[0] });
      setShowForm(false);
      fetchData();
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Failed to create transaction',
        description: error instanceof Error ? error.message : 'An error occurred',
      });
    } finally {
      setIsCreating(false);
    }
  };

  const getTransactionIcon = (type: string) => {
    if (type === 'INCOME') return <ArrowUpCircle className="h-5 w-5 text-green-600" />;
    if (type === 'EXPENSE') return <ArrowDownCircle className="h-5 w-5 text-red-600" />;
    return <ArrowLeftRight className="h-5 w-5 text-blue-600" />;
  };

  const filteredCategories = categories.filter((c) => c.type === transactionType || c.type === 'TRANSFER');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Transactions</h1>
        <p className="text-muted-foreground">Track your income, expenses, and transfers</p>
      </div>

      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Recent Transactions</h2>
        {isLoading ? (
          <p className="text-muted-foreground">Loading transactions...</p>
        ) : transactions.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center">
              <ArrowDownCircle className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No transactions yet. Create your first transaction above.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {transactions.map((trans) => {
              const account = accounts.find((a) => a.id === trans.accountId);
              const category = categories.find((c) => c.id === trans.categoryId);
              return (
                <Card 
                  key={trans.id} 
                  className="cursor-pointer hover:bg-secondary/50 transition-colors"
                  onClick={() => router.push(`/dashboard/transactions/${trans.id}`)}
                >
                  <CardContent className="flex items-center justify-between py-4">
                    <div className="flex items-center gap-4">
                      {getTransactionIcon(trans.type)}
                      <div>
                        <p className="font-medium">{trans.description || 'No description'}</p>
                        <p className="text-sm text-muted-foreground">
                          {account?.name || 'Unknown Account'} • {category?.name || 'Uncategorized'} • {formatDate(trans.date)}
                        </p>
                      </div>
                    </div>
                    <p className={`text-lg font-bold ${trans.type === 'INCOME' ? 'text-green-600' : 'text-red-600'}`}>
                      {trans.type === 'INCOME' ? '+' : '-'}{formatCurrency(parseFloat(trans.amount), trans.currency || 'USD')}
                    </p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Floating Action Button */}
      <button
        onClick={() => setShowForm(true)}
        className="fixed bottom-6 right-6 w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-lg hover:bg-primary/90 transition-colors flex items-center justify-center z-50"
      >
        <Plus className="h-6 w-6" />
      </button>

      {/* Add Transaction Modal */}
      <Dialog open={showForm} onClose={() => setShowForm(false)} title="Add New Transaction" description="Record a new income or expense">
        <DialogContent>
          <form onSubmit={(e) => {
            e.preventDefault();
            handleSubmit(onSubmit)();
          }} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="modal-type">Transaction Type</Label>
                <select
                  id="modal-type"
                  {...register('type')}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  <option value="EXPENSE">Expense</option>
                  <option value="INCOME">Income</option>
                  <option value="TRANSFER">Transfer</option>
                </select>
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
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="modal-amount">Amount</Label>
                <Input id="modal-amount" type="number" step="0.01" placeholder="0.00" {...register('amount')} />
                {errors.amount && <p className="text-sm text-destructive">{errors.amount.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="modal-accountId">Account</Label>
                <select
                  id="modal-accountId"
                  {...register('accountId')}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  <option value="">Select an account</option>
                  {accounts.map((acc) => (
                    <option key={acc.id} value={acc.id}>{acc.name} ({acc.currency || 'USD'})</option>
                  ))}
                </select>
                {errors.accountId && <p className="text-sm text-destructive">{errors.accountId.message}</p>}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="modal-categoryId">Category</Label>
                <select
                  id="modal-categoryId"
                  {...register('categoryId')}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  <option value="">Select a category</option>
                  {filteredCategories.map((cat) => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="modal-date">Date</Label>
                <Input id="modal-date" type="date" {...register('date')} />
                {errors.date && <p className="text-sm text-destructive">{errors.date.message}</p>}
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="modal-description">Description</Label>
              <Input id="modal-description" placeholder="e.g., Grocery shopping" {...register('description')} />
            </div>
            <div className="flex gap-2 justify-end">
              <button 
                type="button" 
                className="h-10 px-4 py-2 rounded-md border border-input bg-background hover:bg-accent hover:text-accent-foreground text-sm font-medium"
                onClick={() => setShowForm(false)}
              >
                Cancel
              </button>
              <button 
                type="submit" 
                disabled={isCreating}
                className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2"
              >
                {isCreating ? 'Creating...' : 'Create Transaction'}
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
