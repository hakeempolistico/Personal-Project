'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
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
import { formatCurrency, formatDate } from '@/lib/utils';
import { ArrowLeft, Banknote, Calendar, DollarSign, Percent, Clock, Trash2, Edit, CreditCard } from 'lucide-react';

const paymentSchema = z.object({
  accountId: z.string().min(1, 'Account is required'),
  amount: z.coerce.number().positive('Amount must be positive'),
  notes: z.string().optional(),
});

type PaymentFormData = z.infer<typeof paymentSchema>;

interface LoanPayment {
  id: string;
  amount: number;
  balanceAfter: number;
  notes: string | null;
  createdAt: string;
  account?: {
    id: string;
    name: string;
  };
}

interface Loan {
  id: string;
  name: string;
  type: string;
  principal: number;
  interestRate: number;
  termMonths: number;
  startDate: string;
  endDate: string | null;
  remainingBalance: number;
  accountId: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  account?: {
    id: string;
    name: string;
  };
  payments?: LoanPayment[];
}

interface Account {
  id: string;
  name: string;
  type: string;
  balance: string;
  currency: string;
}

const loanTypes = [
  { value: 'PERSONAL', label: 'Personal Loan' },
  { value: 'MORTGAGE', label: 'Mortgage' },
  { value: 'AUTO', label: 'Auto Loan' },
  { value: 'STUDENT', label: 'Student Loan' },
  { value: 'CREDIT', label: 'Credit Line' },
  { value: 'OTHER', label: 'Other' },
];

const loanTypeColors: Record<string, string> = {
  PERSONAL: 'secondary',
  MORTGAGE: 'warning',
  AUTO: 'default',
  STUDENT: 'secondary',
  CREDIT: 'destructive',
  OTHER: 'outline',
};

export default function LoanDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const [loan, setLoan] = useState<Loan | null>(null);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isPaying, setIsPaying] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<PaymentFormData>({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      accountId: '',
      notes: '',
    },
  });

  useEffect(() => {
    fetchLoan();
    fetchAccounts();
  }, [params.id]);

  const fetchLoan = async () => {
    try {
      const data = await apiClient.get<Loan>(`/loans/${params.id}`);
      setLoan(data);
      // Set default account if loan has linked account
      if (data.accountId) {
        reset((formValues) => ({
          ...formValues,
          accountId: data.accountId || '',
        }));
      }
    } catch (error) {
      console.error('Failed to fetch loan:', error);
      toast({
        variant: 'destructive',
        title: 'Failed to load loan',
        description: 'Could not fetch loan details. Please try again.',
      });
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

  const onSubmitPayment = async (data: PaymentFormData) => {
    setIsPaying(true);
    try {
      const result = await apiClient.post<{ loan: Loan }>(`/loans/${params.id}/payment`, {
        accountId: data.accountId,
        amount: data.amount,
        notes: data.notes,
      });
      setLoan(result.loan);
      toast({ title: 'Payment successful! Transaction created.' });
      reset({ accountId: data.accountId, amount: undefined as unknown as number, notes: '' });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Payment failed',
        description: error instanceof Error ? error.message : 'An error occurred',
      });
    } finally {
      setIsPaying(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this loan? This action cannot be undone.')) {
      return;
    }
    setIsDeleting(true);
    try {
      await apiClient.delete(`/loans/${params.id}`);
      toast({ title: 'Loan deleted successfully!' });
      router.push('/dashboard/loans');
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Failed to delete loan',
        description: error instanceof Error ? error.message : 'An error occurred',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const getLoanTypeLabel = (type: string) => {
    return loanTypes.find((t) => t.value === type)?.label || type;
  };

  const getProgressPercentage = () => {
    if (!loan) return 0;
    const paid = loan.principal - loan.remainingBalance;
    return Math.round((paid / loan.principal) * 100);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Loading loan details...</p>
      </div>
    );
  }

  if (!loan) {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4">
        <p className="text-muted-foreground">Loan not found.</p>
        <Button variant="outline" onClick={() => router.push('/dashboard/loans')}>
          Back to Loans
        </Button>
      </div>
    );
  }

  const progress = getProgressPercentage();
  const paidAmount = loan.principal - loan.remainingBalance;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.push('/dashboard/loans')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{loan.name}</h1>
          <div className="flex items-center gap-2 mt-1">
            <Badge variant={loanTypeColors[loan.type] as any}>
              {getLoanTypeLabel(loan.type)}
            </Badge>
            <Badge variant={loan.isActive ? 'success' : 'secondary'}>
              {loan.isActive ? 'Active' : 'Paid Off'}
            </Badge>
          </div>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Banknote className="h-5 w-5" />
                Loan Overview
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Original Principal</p>
                  <p className="text-xl font-semibold">{formatCurrency(loan.principal)}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Remaining Balance</p>
                  <p className="text-xl font-semibold text-red-600">
                    {formatCurrency(loan.remainingBalance)}
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Paid Progress</span>
                  <span className="font-medium">{progress}%</span>
                </div>
                <div className="h-3 w-full rounded-full bg-secondary">
                  <div
                    className="h-3 rounded-full bg-green-600 transition-all"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <p className="text-sm text-muted-foreground text-right">
                  {formatCurrency(paidAmount)} paid
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                <div className="flex items-center gap-2">
                  <Percent className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Interest Rate</p>
                    <p className="font-medium">{loan.interestRate}%</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Term</p>
                    <p className="font-medium">{loan.termMonths} months</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Start Date</p>
                    <p className="font-medium">{formatDate(loan.startDate)}</p>
                  </div>
                </div>
                {loan.account && (
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Linked Account</p>
                      <p className="font-medium">{loan.account.name}</p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {loan.isActive && (
            <Card>
              <CardHeader>
                <CardTitle>Make a Payment</CardTitle>
                <CardDescription>
                  Enter the amount you want to pay towards this loan
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit(onSubmitPayment)} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="accountId">Pay From Account *</Label>
                    <select
                      id="accountId"
                      {...register('accountId')}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    >
                      <option value="">Select an account</option>
                      {accounts.map((acc) => (
                        <option key={acc.id} value={acc.id}>
                          {acc.name} ({formatCurrency(Number(acc.balance), acc.currency)})
                        </option>
                      ))}
                    </select>
                    {errors.accountId && (
                      <p className="text-sm text-destructive">{errors.accountId.message}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="amount">Payment Amount</Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                        $
                      </span>
                      <Input
                        id="amount"
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        className="pl-7"
                        {...register('amount')}
                      />
                    </div>
                    {errors.amount && (
                      <p className="text-sm text-destructive">{errors.amount.message}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="notes">Notes (optional)</Label>
                    <Input
                      id="notes"
                      placeholder="e.g., Monthly payment"
                      {...register('notes')}
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button type="submit" disabled={isPaying} className="flex-1">
                      {isPaying ? 'Processing...' : 'Make Payment'}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => reset({ accountId: loan.accountId || '', amount: undefined as unknown as number, notes: '' })}
                      disabled={isPaying}
                    >
                      Reset
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button variant="outline" className="w-full justify-start" disabled>
                <Edit className="mr-2 h-4 w-4" />
                Edit Loan Details
              </Button>
              <Button
                variant="destructive"
                className="w-full justify-start"
                onClick={handleDelete}
                disabled={isDeleting}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                {isDeleting ? 'Deleting...' : 'Delete Loan'}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Payment History
              </CardTitle>
              <CardDescription>Your recent payments for this loan</CardDescription>
            </CardHeader>
            <CardContent>
              {!loan.payments || loan.payments.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No payments recorded yet.
                </p>
              ) : (
                <div className="space-y-3">
                  {loan.payments.map((payment) => (
                    <div
                      key={payment.id}
                      className="flex items-center justify-between p-3 bg-secondary/50 rounded-lg"
                    >
                      <div>
                        <p className="font-medium text-green-600">
                          -{formatCurrency(payment.amount)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatDate(payment.createdAt)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-muted-foreground">Balance after</p>
                        <p className="font-medium">{formatCurrency(payment.balanceAfter)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
