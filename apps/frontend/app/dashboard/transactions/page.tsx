'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useRouter } from 'next/navigation';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { apiClient } from '@/lib/api-client';
import { formatCurrency, formatDate } from '@/lib/utils';
import { ArrowUpCircle, ArrowDownCircle, ArrowLeftRight } from 'lucide-react';

const transactionSchema = z.object({
  accountId: z.string().min(1, 'Account is required'),
  categoryId: z.string().optional(),
  type: z.enum(['INCOME', 'EXPENSE', 'TRANSFER']),
  amount: z.coerce.number().positive('Amount must be positive'),
  description: z.string().optional(),
  date: z.string().min(1, 'Date is required'),
  notes: z.string().optional(),
});

type TransactionFormData = z.infer<typeof transactionSchema>;

interface Account {
  id: string;
  name: string;
  type: string;
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
  amount: number;
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

      <Card>
        <CardHeader>
          <CardTitle>Add New Transaction</CardTitle>
          <CardDescription>Record a new income or expense</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="type">Transaction Type</Label>
                <select
                  id="type"
                  {...register('type')}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  <option value="EXPENSE">Expense</option>
                  <option value="INCOME">Income</option>
                  <option value="TRANSFER">Transfer</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="amount">Amount</Label>
                <Input id="amount" type="number" step="0.01" placeholder="0.00" {...register('amount')} />
                {errors.amount && <p className="text-sm text-destructive">{errors.amount.message}</p>}
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="accountId">Account</Label>
                <select
                  id="accountId"
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
                <Label htmlFor="categoryId">Category</Label>
                <select
                  id="categoryId"
                  {...register('categoryId')}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  <option value="">Select a category</option>
                  {filteredCategories.map((cat) => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="date">Date</Label>
                <Input id="date" type="date" {...register('date')} />
                {errors.date && <p className="text-sm text-destructive">{errors.date.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Input id="description" placeholder="e.g., Grocery shopping" {...register('description')} />
              </div>
            </div>
            <Button type="submit" disabled={isCreating}>
              {isCreating ? 'Creating...' : 'Create Transaction'}
            </Button>
          </form>
        </CardContent>
      </Card>

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
                      {trans.type === 'INCOME' ? '+' : '-'}{formatCurrency(trans.amount)}
                    </p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
