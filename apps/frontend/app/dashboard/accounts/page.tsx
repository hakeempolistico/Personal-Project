'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { apiClient } from '@/lib/api-client';
import { formatCurrency } from '@/lib/utils';
import { Wallet, CreditCard, PiggyBank, Landmark, Plus } from 'lucide-react';

const accountSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  type: z.enum(['CHECKING', 'SAVINGS', 'CREDIT_CARD', 'WALLET', 'INVESTMENT']),
  balance: z.coerce.number().default(0),
});

type AccountFormData = z.infer<typeof accountSchema>;

interface Account {
  id: string;
  name: string;
  type: string;
  balance: number;
  currency: string;
}

interface Settings {
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
  const [settings, setSettings] = useState<Settings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [showModal, setShowModal] = useState(false);
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
    },
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [accData, settingsData] = await Promise.all([
        apiClient.get<Account[]>('/accounts'),
        apiClient.get<Settings>('/settings'),
      ]);
      setAccounts(accData);
      setSettings(settingsData);
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const onSubmit = async (data: AccountFormData) => {
    setIsCreating(true);
    try {
      await apiClient.post('/accounts', data);
      toast({ title: 'Account created successfully!' });
      reset({ type: 'CHECKING', balance: 0 });
      setShowModal(false);
      fetchData();
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

  const displayCurrency = settings?.currency || 'PHP';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Accounts</h1>
        <p className="text-muted-foreground">Manage your bank accounts and wallets</p>
      </div>

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
                  <p className="text-2xl font-bold">{formatCurrency(account.balance, displayCurrency)}</p>
                  <p className="text-sm text-muted-foreground">{account.type.replace('_', ' ')}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Floating Action Button */}
      <button
        onClick={() => setShowModal(true)}
        className="fixed bottom-6 right-6 w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-lg hover:bg-primary/90 transition-colors flex items-center justify-center z-50"
      >
        <Plus className="h-6 w-6" />
      </button>

      {/* Add Account Modal */}
      <Dialog open={showModal} onClose={() => setShowModal(false)} title="Add New Account" description="Create a new account to track your finances">
        <DialogContent>
          <form onSubmit={(e) => {
            e.preventDefault();
            handleSubmit(onSubmit)();
          }} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="modal-name">Account Name</Label>
              <Input id="modal-name" placeholder="e.g., Main Checking" {...register('name')} />
              {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="modal-type">Account Type</Label>
              <select
                id="modal-type"
                {...register('type')}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                {accountTypes.map((type) => (
                  <option key={type.value} value={type.value}>{type.label}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="modal-balance">Initial Balance</Label>
              <Input id="modal-balance" type="number" step="0.01" placeholder="0.00" {...register('balance')} />
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
                className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2"
              >
                {isCreating ? 'Creating...' : 'Create Account'}
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
