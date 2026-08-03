'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { apiClient } from '@/lib/api-client';
import { formatCurrency } from '@/lib/utils';
import { Wallet, CreditCard, PiggyBank, Landmark } from 'lucide-react';

const accountSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  type: z.enum(['CHECKING', 'SAVINGS', 'CREDIT_CARD', 'WALLET', 'INVESTMENT']),
  balance: z.coerce.number().default(0),
  currency: z.string().default('USD'),
});

type AccountFormData = z.infer<typeof accountSchema>;

interface Account {
  id: string;
  name: string;
  type: string;
  balance: number;
  currency: string;
}

const accountTypes = [
  { value: 'CHECKING', label: 'Checking Account', icon: Landmark },
  { value: 'SAVINGS', label: 'Savings Account', icon: PiggyBank },
  { value: 'CREDIT_CARD', label: 'Credit Card', icon: CreditCard },
  { value: 'WALLET', label: 'Wallet', icon: Wallet },
  { value: 'INVESTMENT', label: 'Investment', icon: Wallet },
];

export default function AccountsPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const { toast } = useToast();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<AccountFormData>({
    resolver: zodResolver(accountSchema),
    defaultValues: {
      type: 'CHECKING',
      balance: 0,
      currency: 'USD',
    },
  });

  useEffect(() => {
    fetchAccounts();
  }, []);

  const fetchAccounts = async () => {
    try {
      const data = await apiClient.get<Account[]>('/accounts');
      setAccounts(data);
    } catch (error) {
      console.error('Failed to fetch accounts:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const onSubmit = async (data: AccountFormData) => {
    setIsCreating(true);
    try {
      await apiClient.post('/accounts', data);
      toast({ title: 'Account created successfully!' });
      reset();
      fetchAccounts();
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Failed to create account',
        description: error instanceof Error ? error.message : 'An error occurred',
      });
    } finally {
      setIsCreating(false);
    }
  };

  const getAccountIcon = (type: string) => {
    const accountType = accountTypes.find((t) => t.value === type);
    const Icon = accountType?.icon || Wallet;
    return <Icon className="h-5 w-5" />;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Accounts</h1>
        <p className="text-muted-foreground">Manage your bank accounts and wallets</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Add New Account</CardTitle>
          <CardDescription>Create a new account to track your finances</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">Account Name</Label>
                <Input id="name" placeholder="e.g., Main Checking" {...register('name')} />
                {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="type">Account Type</Label>
                <select
                  id="type"
                  {...register('type')}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  {accountTypes.map((type) => (
                    <option key={type.value} value={type.value}>{type.label}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="balance">Initial Balance</Label>
                <Input id="balance" type="number" step="0.01" placeholder="0.00" {...register('balance')} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="currency">Currency</Label>
                <Input id="currency" placeholder="USD" {...register('currency')} />
              </div>
            </div>
            <Button type="submit" disabled={isCreating}>
              {isCreating ? 'Creating...' : 'Create Account'}
            </Button>
          </form>
        </CardContent>
      </Card>

      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Your Accounts</h2>
        {isLoading ? (
          <p className="text-muted-foreground">Loading accounts...</p>
        ) : accounts.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center">
              <Wallet className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No accounts yet. Create your first account above.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {accounts.map((account) => (
              <Card key={account.id}>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <div className="flex items-center gap-2">
                    {getAccountIcon(account.type)}
                    <CardTitle className="text-lg">{account.name}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold">{formatCurrency(account.balance, account.currency)}</p>
                  <p className="text-sm text-muted-foreground">{account.type.replace('_', ' ')}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
