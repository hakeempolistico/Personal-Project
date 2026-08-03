'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useRouter } from 'next/navigation';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { apiClient } from '@/lib/api-client';
import { formatCurrency, formatDate } from '@/lib/utils';
import { ArrowUpCircle, ArrowDownCircle, ArrowLeftRight, Plus } from 'lucide-react';

const transactionSchema = z.object({
  accountId: z.string().min(1, 'Account is required'),
  category: z.string().optional(),
  type: z.enum(['INCOME', 'EXPENSE', 'TRANSFER']),
  amount: z.coerce.number().positive('Amount must be positive'),
  description: z.string().optional(),
  date: z.string().min(1, 'Date is required'),
  notes: z.string().optional(),
  toAccountId: z.string().optional(),
});

type TransactionFormData = z.infer<typeof transactionSchema>;

interface Account {
  id: string;
  name: string;
  type: string;
  currency?: string;
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

interface Settings {
  currency: string;
}

// Static categories
const STATIC_CATEGORIES = {
  EXPENSE: [
    { id: 'food', name: 'Food & Dining', icon: '🍔' },
    { id: 'housing', name: 'Housing', icon: '🏠' },
    { id: 'transportation', name: 'Transportation', icon: '🚗' },
    { id: 'healthcare', name: 'Healthcare', icon: '💊' },
    { id: 'entertainment', name: 'Entertainment', icon: '🎬' },
    { id: 'shopping', name: 'Shopping', icon: '🛒' },
    { id: 'utilities', name: 'Utilities', icon: '📱' },
    { id: 'education', name: 'Education', icon: '📚' },
    { id: 'other_expense', name: 'Other', icon: '💰' },
  ],
  INCOME: [
    { id: 'salary', name: 'Salary', icon: '💼' },
    { id: 'freelance', name: 'Freelance', icon: '💵' },
    { id: 'investment', name: 'Investment', icon: '📈' },
    { id: 'gift', name: 'Gift', icon: '🎁' },
    { id: 'other_income', name: 'Other', icon: '💰' },
  ],
  TRANSFER: [
    { id: 'internal_transfer', name: 'Internal Transfer', icon: '🔄' },
  ],
};

export default function TransactionsPage() {
  const router = useRouter();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const { toast } = useToast();

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<TransactionFormData>({
    resolver: zodResolver(transactionSchema),
    defaultValues: {
      type: 'EXPENSE',
      date: new Date().toISOString().split('T')[0],
    },
  });

  const transactionType = watch('type') || 'EXPENSE';
  const fromAccountId = watch('accountId');

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
      const settingsData = await apiClient.get<Settings>('/settings');
      setSettings(settingsData);
    } catch (error) {
      console.error('Failed to fetch settings:', error);
    }
    setIsLoading(false);
  };

  const onSubmit = async (data: TransactionFormData) => {
    setIsCreating(true);
    try {
      // Use dedicated transfer endpoint for transfers
      if (data.type === 'TRANSFER') {
        if (!data.toAccountId) {
          toast({
            variant: 'destructive',
            title: 'Transfer requires destination account',
            description: 'Please select a destination account for the transfer.',
          });
          setIsCreating(false);
          return;
        }
        if (data.accountId === data.toAccountId) {
          toast({
            variant: 'destructive',
            title: 'Invalid transfer',
            description: 'Source and destination accounts must be different.',
          });
          setIsCreating(false);
          return;
        }
        await apiClient.post('/transactions/transfer', {
          fromAccountId: data.accountId,
          toAccountId: data.toAccountId,
          amount: data.amount,
          description: data.description,
          date: data.date,
          notes: data.notes,
        });
        toast({ title: 'Transfer completed successfully!' });
      } else {
        await apiClient.post('/transactions', {
          accountId: data.accountId,
          type: data.type,
          amount: data.amount,
          description: data.description,
          date: data.date,
          notes: data.notes,
        });
        toast({ title: 'Transaction created successfully!' });
      }
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

  // For transfers, determine if this is money coming in (credit) or going out (debit)
  const isIncomingTransfer = (trans: Transaction) => {
    if (trans.type !== 'TRANSFER') return false;
    // If description starts with "Transfer from", it's money coming into this account
    return trans.description?.startsWith('Transfer from') || false;
  };

  const getAmountDisplay = (trans: Transaction) => {
    const amount = parseFloat(trans.amount);
    const isIncoming = trans.type === 'INCOME' || isIncomingTransfer(trans);
    
    return {
      prefix: isIncoming ? '+' : '-',
      className: isIncoming ? 'text-green-600' : 'text-red-600',
    };
  };

  const displayCurrency = settings?.currency || 'PHP';
  
  // For transfers, exclude the from account from the to account options
  const toAccountOptions = accounts.filter(a => a.id !== fromAccountId);

  // Get static categories for the current transaction type
  const staticCategories = STATIC_CATEGORIES[transactionType as keyof typeof STATIC_CATEGORIES] || [];

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
                          {account?.name || 'Unknown Account'} • {formatDate(trans.date)}
                        </p>
                      </div>
                    </div>
                    <p className={`text-lg font-bold ${getAmountDisplay(trans).className}`}>
                      {getAmountDisplay(trans).prefix}{formatCurrency(parseFloat(trans.amount), displayCurrency)}
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
      <Dialog open={showForm} onClose={() => setShowForm(false)} title={transactionType === 'TRANSFER' ? 'Transfer Money' : 'Add New Transaction'} description={transactionType === 'TRANSFER' ? 'Move money between your accounts' : 'Record a new income or expense'}>
        <DialogContent>
          <form onSubmit={(e) => {
            e.preventDefault();
            handleSubmit(onSubmit)();
          }} className="space-y-4">
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
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="modal-amount">Amount</Label>
                <Input id="modal-amount" type="number" step="0.01" placeholder="0.00" {...register('amount')} />
                {errors.amount && <p className="text-sm text-destructive">{errors.amount.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="modal-date">Date</Label>
                <Input id="modal-date" type="date" {...register('date')} />
                {errors.date && <p className="text-sm text-destructive">{errors.date.message}</p>}
              </div>
            </div>

            {/* For Transfers: From Account */}
            {transactionType === 'TRANSFER' && (
              <div className="space-y-2">
                <Label htmlFor="modal-from-accountId">From Account</Label>
                <select
                  id="modal-from-accountId"
                  {...register('accountId')}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  <option value="">Select source account</option>
                  {accounts.map((acc) => (
                    <option key={acc.id} value={acc.id}>{acc.name}</option>
                  ))}
                </select>
                {errors.accountId && <p className="text-sm text-destructive">{errors.accountId.message}</p>}
              </div>
            )}

            {/* For Transfers: To Account */}
            {transactionType === 'TRANSFER' && (
              <div className="space-y-2">
                <Label htmlFor="modal-to-accountId">To Account</Label>
                <select
                  id="modal-to-accountId"
                  {...register('toAccountId')}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  <option value="">Select destination account</option>
                  {toAccountOptions.map((acc) => (
                    <option key={acc.id} value={acc.id}>{acc.name}</option>
                  ))}
                </select>
              </div>
            )}

            {/* For non-Transfers: Account and Category */}
            {transactionType !== 'TRANSFER' && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="modal-accountId">Account</Label>
                    <select
                      id="modal-accountId"
                      {...register('accountId')}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    >
                      <option value="">Select an account</option>
                      {accounts.map((acc) => (
                        <option key={acc.id} value={acc.id}>{acc.name}</option>
                      ))}
                    </select>
                    {errors.accountId && <p className="text-sm text-destructive">{errors.accountId.message}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="modal-category">Category</Label>
                    <select
                      id="modal-category"
                      {...register('category')}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    >
                      <option value="">Select a category</option>
                      {staticCategories.map((cat) => (
                        <option key={cat.id} value={cat.id}>{cat.icon} {cat.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </>
            )}

            <div className="space-y-2">
              <Label htmlFor="modal-description">Description</Label>
              <Input id="modal-description" placeholder={transactionType === 'TRANSFER' ? 'e.g., Monthly savings' : 'e.g., Grocery shopping'} {...register('description')} />
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
                {isCreating ? 'Processing...' : transactionType === 'TRANSFER' ? 'Transfer' : 'Create Transaction'}
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
