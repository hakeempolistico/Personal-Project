'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { apiClient } from '@/lib/api-client';
import { formatCurrency } from '@/lib/utils';
import { currencies } from '@/lib/currencies';
import { Banknote, TrendingUp, Percent } from 'lucide-react';

const loanSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  type: z.enum(['PERSONAL', 'MORTGAGE', 'AUTO', 'STUDENT', 'CREDIT', 'OTHER']),
  principal: z.coerce.number().positive('Principal must be positive'),
  currency: z.string().default('USD'),
  interestRate: z.coerce.number().min(0).max(100),
  termMonths: z.coerce.number().positive('Term must be positive'),
  startDate: z.string().min(1, 'Start date is required'),
  accountId: z.string().optional(),
});

type LoanFormData = z.infer<typeof loanSchema>;

interface Account {
  id: string;
  name: string;
  currency?: string;
}

interface Loan {
  id: string;
  name: string;
  type: string;
  principal: string;
  currency: string;
  interestRate: string;
  termMonths: number;
  remainingBalance: string;
  startDate: string;
  isActive: boolean;
}

const loanTypes = [
  { value: 'PERSONAL', label: 'Personal Loan' },
  { value: 'MORTGAGE', label: 'Mortgage' },
  { value: 'AUTO', label: 'Auto Loan' },
  { value: 'STUDENT', label: 'Student Loan' },
  { value: 'CREDIT', label: 'Credit Line' },
  { value: 'OTHER', label: 'Other' },
];

const loanTypeColors: Record<string, 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning'> = {
  PERSONAL: 'secondary',
  MORTGAGE: 'warning',
  AUTO: 'default',
  STUDENT: 'secondary',
  CREDIT: 'destructive',
  OTHER: 'outline',
};

export default function LoansPage() {
  const [loans, setLoans] = useState<Loan[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<LoanFormData>({
    resolver: zodResolver(loanSchema),
    defaultValues: {
      type: 'PERSONAL',
      interestRate: 0,
      termMonths: 12,
      startDate: new Date().toISOString().split('T')[0],
    },
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [loanData, accData] = await Promise.all([
        apiClient.get<Loan[]>('/loans'),
        apiClient.get<Account[]>('/accounts'),
      ]);
      setLoans(loanData);
      setAccounts(accData);
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const onSubmit = async (data: LoanFormData) => {
    setIsCreating(true);
    try {
      await apiClient.post('/loans', {
        ...data,
        accountId: data.accountId || null,
      });
      toast({ title: 'Loan created successfully!' });
      reset({ type: 'PERSONAL', interestRate: 0, termMonths: 12, startDate: new Date().toISOString().split('T')[0] });
      fetchData();
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Failed to create loan',
        description: error instanceof Error ? error.message : 'An error occurred',
      });
    } finally {
      setIsCreating(false);
    }
  };

  const getLoanTypeLabel = (type: string) => {
    return loanTypes.find((t) => t.value === type)?.label || type;
  };

  const totalDebt = loans.reduce((sum, loan) => sum + parseFloat(String(loan.remainingBalance)), 0);
  const totalPrincipal = loans.reduce((sum, loan) => sum + parseFloat(String(loan.principal)), 0);
  const avgInterestRate = loans.length > 0
    ? (loans.reduce((sum, loan) => sum + parseFloat(String(loan.interestRate)), 0) / loans.length).toFixed(2)
    : '0.00';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Loans</h1>
        <p className="text-muted-foreground">Track and manage your loans and debts</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Outstanding</CardTitle>
            <Banknote className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{formatCurrency(totalDebt)}</p>
            <p className="text-xs text-muted-foreground">{loans.length} active loans</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Original</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{formatCurrency(totalPrincipal)}</p>
            <p className="text-xs text-muted-foreground">Original loan amounts</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Avg Interest Rate</CardTitle>
            <Percent className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{avgInterestRate}%</p>
            <p className="text-xs text-muted-foreground">Across all loans</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Add New Loan</CardTitle>
          <CardDescription>Add a new loan to track your debt</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">Loan Name</Label>
                <Input id="name" placeholder="e.g., Car Loan" {...register('name')} />
                {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="type">Loan Type</Label>
                <select
                  id="type"
                  {...register('type')}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  {loanTypes.map((type) => (
                    <option key={type.value} value={type.value}>{type.label}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="principal">Principal Amount</Label>
                <Input id="principal" type="number" step="0.01" placeholder="0.00" {...register('principal')} />
                {errors.principal && <p className="text-sm text-destructive">{errors.principal.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="currency">Currency</Label>
                <select
                  id="currency"
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
              <div className="space-y-2">
                <Label htmlFor="interestRate">Interest Rate (%)</Label>
                <Input id="interestRate" type="number" step="0.01" placeholder="0.00" {...register('interestRate')} />
                {errors.interestRate && <p className="text-sm text-destructive">{errors.interestRate.message}</p>}
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="termMonths">Term (Months)</Label>
                <Input id="termMonths" type="number" placeholder="12" {...register('termMonths')} />
                {errors.termMonths && <p className="text-sm text-destructive">{errors.termMonths.message}</p>}
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="startDate">Start Date</Label>
                <Input id="startDate" type="date" {...register('startDate')} />
                {errors.startDate && <p className="text-sm text-destructive">{errors.startDate.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="accountId">Linked Account (Optional)</Label>
                <select
                  id="accountId"
                  {...register('accountId')}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  <option value="">No linked account</option>
                  {accounts.map((acc) => (
                    <option key={acc.id} value={acc.id}>{acc.name}</option>
                  ))}
                </select>
              </div>
            </div>
            <Button type="submit" disabled={isCreating}>
              {isCreating ? 'Creating...' : 'Create Loan'}
            </Button>
          </form>
        </CardContent>
      </Card>

      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Your Loans</h2>
        {isLoading ? (
          <p className="text-muted-foreground">Loading loans...</p>
        ) : loans.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center">
              <Banknote className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No loans yet. Add your first loan above.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {loans.map((loan) => {
              const principal = parseFloat(String(loan.principal));
              const remaining = parseFloat(String(loan.remainingBalance));
              const paid = principal - remaining;
              const progress = principal > 0 ? Math.round((paid / principal) * 100) : 0;
              const currency = loan.currency || 'USD';
              return (
                <Card
                  key={loan.id}
                  className="cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => router.push(`/dashboard/loans/${loan.id}`)}
                >
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle>{loan.name}</CardTitle>
                      <div className="flex gap-2">
                        <Badge variant={loanTypeColors[loan.type]}>
                          {getLoanTypeLabel(loan.type)}
                        </Badge>
                        <Badge variant={loan.isActive ? 'success' : 'secondary'}>
                          {loan.isActive ? 'Active' : 'Paid'}
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Remaining Balance</span>
                        <span className="font-bold text-red-600">{formatCurrency(remaining, currency)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Original Principal</span>
                        <span>{formatCurrency(principal, currency)}</span>
                      </div>
                      <div className="h-2 w-full rounded-full bg-secondary mt-3">
                        <div
                          className="h-2 rounded-full bg-green-600 transition-all"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>{progress}% paid</span>
                        <span>{loan.interestRate}% APR</span>
                      </div>
                    </div>
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
