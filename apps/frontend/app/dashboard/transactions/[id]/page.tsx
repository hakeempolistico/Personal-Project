'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { apiClient } from '@/lib/api-client';
import { formatCurrency, formatDate } from '@/lib/utils';
import { ArrowLeft, ArrowUpCircle, ArrowDownCircle, ArrowLeftRight, Calendar, Building2, Tag, FileText, Trash2, Edit } from 'lucide-react';

interface Transaction {
  id: string;
  accountId: string;
  categoryId: string | null;
  type: string;
  amount: string;
  description: string | null;
  date: string;
  notes: string | null;
  isRecurring: boolean;
  recurringId: string | null;
  createdAt: string;
  account?: {
    id: string;
    name: string;
    type: string;
  };
  category?: {
    id: string;
    name: string;
  };
}

export default function TransactionDetailPage() {
  const router = useRouter();
  const params = useParams();
  const [transaction, setTransaction] = useState<Transaction | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchTransaction();
  }, [params.id]);

  const fetchTransaction = async () => {
    try {
      const data = await apiClient.get<Transaction>(`/transactions/${params.id}`);
      setTransaction(data);
    } catch (error) {
      console.error('Failed to fetch transaction:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to load transaction',
      });
      router.push('/dashboard/transactions');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this transaction?')) return;
    
    setIsDeleting(true);
    try {
      await apiClient.delete(`/transactions/${params.id}`);
      toast({ title: 'Transaction deleted successfully!' });
      router.push('/dashboard/transactions');
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Failed to delete transaction',
        description: error instanceof Error ? error.message : 'An error occurred',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const getTransactionIcon = () => {
    if (transaction?.type === 'INCOME') return <ArrowUpCircle className="h-6 w-6 text-green-600" />;
    if (transaction?.type === 'EXPENSE') return <ArrowDownCircle className="h-6 w-6 text-red-600" />;
    return <ArrowLeftRight className="h-6 w-6 text-blue-600" />;
  };

  const getTypeBadge = () => {
    const variants: Record<string, { bg: string; text: string }> = {
      INCOME: { bg: 'bg-green-100', text: 'text-green-700' },
      EXPENSE: { bg: 'bg-red-100', text: 'text-red-700' },
      TRANSFER: { bg: 'bg-blue-100', text: 'text-blue-700' },
    };
    const variant = variants[transaction?.type || 'EXPENSE'];
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${variant.bg} ${variant.text}`}>
        {transaction?.type === 'INCOME' ? 'Income' : transaction?.type === 'EXPENSE' ? 'Expense' : 'Transfer'}
      </span>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Loading transaction...</p>
      </div>
    );
  }

  if (!transaction) {
    return null;
  }

  const amount = parseFloat(transaction.amount);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            {getTransactionIcon()}
            {transaction.description || 'Transaction Details'}
          </h1>
          <p className="text-muted-foreground">
            {formatDate(transaction.date)}
          </p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Transaction Overview</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center py-2 border-b">
                <span className="text-muted-foreground">Amount</span>
                <span className={`text-2xl font-bold ${
                  transaction.type === 'INCOME' ? 'text-green-600' : 'text-red-600'
                }`}>
                  {transaction.type === 'INCOME' ? '+' : '-'}{formatCurrency(amount)}
                </span>
              </div>
              <div className="flex justify-between items-center py-2 border-b">
                <span className="text-muted-foreground">Type</span>
                {getTypeBadge()}
              </div>
              <div className="flex justify-between items-center py-2 border-b">
                <span className="text-muted-foreground">Status</span>
                <Badge variant={transaction.isRecurring ? "secondary" : "outline"}>
                  {transaction.isRecurring ? 'Recurring' : 'One-time'}
                </Badge>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3 py-2 border-b">
                <Building2 className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Account</p>
                  <p className="font-medium">{transaction.account?.name || 'Unknown Account'}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 py-2 border-b">
                <Tag className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Category</p>
                  <p className="font-medium">{transaction.category?.name || 'Uncategorized'}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 py-2 border-b">
                <Calendar className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Date</p>
                  <p className="font-medium">{formatDate(transaction.date)}</p>
                </div>
              </div>
              {transaction.notes && (
                <div className="flex items-start gap-3 py-2">
                  <FileText className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm text-muted-foreground">Notes</p>
                    <p className="font-medium">{transaction.notes}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button variant="outline" className="w-full justify-start" disabled>
                <Edit className="mr-2 h-4 w-4" />
                Edit Transaction
              </Button>
              <Button
                variant="destructive"
                className="w-full justify-start"
                onClick={handleDelete}
                disabled={isDeleting}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                {isDeleting ? 'Deleting...' : 'Delete Transaction'}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Metadata</CardTitle>
              <CardDescription>Additional information about this transaction</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Transaction ID</span>
                <span className="font-mono text-xs">{transaction.id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Created</span>
                <span>{formatDate(transaction.createdAt)}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
