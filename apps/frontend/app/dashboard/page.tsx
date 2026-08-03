'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatCurrency, formatDateShort } from '@/lib/utils';
import { apiClient } from '@/lib/api-client';
import { useToast } from '@/hooks/use-toast';
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  PiggyBank,
  Receipt,
  Calendar,
  CheckCircle,
  AlertCircle,
  Clock,
  Sparkles,
  Target,
  ArrowRight,
  Zap,
} from 'lucide-react';

interface Account {
  id: string;
  name: string;
  type: string;
  balance: string;
  currency: string;
}

interface Transaction {
  id: string;
  type: string;
  amount: string;
  description: string;
  date: string;
  accountId: string;
  account?: Account;
}

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
  account?: Account;
}

interface Settings {
  currency: string;
}

const billFrequencyLabels: Record<string, string> = {
  WEEKLY: 'Weekly',
  BIWEEKLY: 'Bi-weekly',
  MONTHLY: 'Monthly',
  QUARTERLY: 'Quarterly',
  YEARLY: 'Yearly',
};

export default function DashboardPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [upcomingBills, setUpcomingBills] = useState<Bill[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [payingBillId, setPayingBillId] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [accData, transData, billsData, settingsData] = await Promise.all([
          apiClient.get<Account[]>('/accounts'),
          apiClient.get<Transaction[]>('/transactions'),
          apiClient.get<Bill[]>('/bills/upcoming?days=30'),
          apiClient.get<Settings>('/settings'),
        ]);
        setAccounts(accData);
        setTransactions(transData);
        setUpcomingBills(billsData);
        setSettings(settingsData);
      } catch (error) {
        console.error('Failed to fetch data:', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  const displayCurrency = settings?.currency || 'PHP';
  const totalBalance = accounts.reduce((sum, acc) => sum + parseFloat(acc.balance), 0);

  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();
  const monthlyTransactions = transactions.filter((t) => {
    const date = new Date(t.date);
    return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
  });
  const monthlyIncome = monthlyTransactions
    .filter((t) => t.type === 'INCOME')
    .reduce((sum, t) => sum + parseFloat(t.amount), 0);
  const monthlyExpenses = monthlyTransactions
    .filter((t) => t.type === 'EXPENSE')
    .reduce((sum, t) => sum + parseFloat(t.amount), 0);
  const savingsRate = monthlyIncome > 0 ? ((monthlyIncome - monthlyExpenses) / monthlyIncome) * 100 : 0;

  const recentTransactions = transactions.slice(0, 5);

  // Calculate upcoming bills stats
  const totalDueSoon = upcomingBills
    .filter((b) => {
      const days = getDaysUntilDue(b.nextDueAt);
      return days <= 7;
    })
    .reduce((sum, b) => sum + parseFloat(b.amount), 0);
  const dueSoonCount = upcomingBills.filter((b) => getDaysUntilDue(b.nextDueAt) <= 7).length;

  const getDaysUntilDue = (nextDueAt: string) => {
    const now = new Date();
    const due = new Date(nextDueAt);
    return Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  };

  const getBillStatus = (nextDueAt: string) => {
    const days = getDaysUntilDue(nextDueAt);
    if (days < 0) return { variant: 'destructive' as const, icon: AlertCircle, label: `Overdue by ${Math.abs(days)} days`, color: 'text-red-600 bg-red-100' };
    if (days === 0) return { variant: 'destructive' as const, icon: Zap, label: 'Due today!', color: 'text-red-600 bg-red-100' };
    if (days <= 3) return { variant: 'destructive' as const, icon: Clock, label: `Due in ${days} days`, color: 'text-orange-600 bg-orange-100' };
    if (days <= 7) return { variant: 'secondary' as const, icon: Calendar, label: `Due in ${days} days`, color: 'text-yellow-600 bg-yellow-100' };
    return { variant: 'outline' as const, icon: Calendar, label: formatDateShort(nextDueAt), color: 'text-blue-600 bg-blue-100' };
  };

  const handleMarkAsPaid = async (billId: string) => {
    setPayingBillId(billId);
    try {
      await apiClient.post(`/bills/${billId}/paid`);
      toast({ title: 'Bill marked as paid!' });
      const billsData = await apiClient.get<Bill[]>('/bills/upcoming?days=30');
      setUpcomingBills(billsData);
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Failed to mark bill as paid',
        description: error instanceof Error ? error.message : 'An error occurred',
      });
    } finally {
      setPayingBillId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome to your personal finance tracker
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between pb-2 bg-gradient-to-br from-blue-50 to-blue-100">
            <div className="flex items-center gap-2">
              <div className="rounded-full bg-blue-500 p-2">
                <Wallet className="h-4 w-4 text-white" />
              </div>
              <CardTitle className="text-sm font-medium">Total Balance</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-blue-600">{formatCurrency(totalBalance, displayCurrency)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Across {accounts.length} account{accounts.length !== 1 ? 's' : ''}
            </p>
          </CardContent>
        </Card>

        <Card className="overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between pb-2 bg-gradient-to-br from-green-50 to-green-100">
            <div className="flex items-center gap-2">
              <div className="rounded-full bg-green-500 p-2">
                <TrendingUp className="h-4 w-4 text-white" />
              </div>
              <CardTitle className="text-sm font-medium">Income</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(monthlyIncome, displayCurrency)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">This month</p>
          </CardContent>
        </Card>

        <Card className="overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between pb-2 bg-gradient-to-br from-red-50 to-red-100">
            <div className="flex items-center gap-2">
              <div className="rounded-full bg-red-500 p-2">
                <TrendingDown className="h-4 w-4 text-white" />
              </div>
              <CardTitle className="text-sm font-medium">Expenses</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-red-600">
              {formatCurrency(monthlyExpenses, displayCurrency)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">This month</p>
          </CardContent>
        </Card>

        <Card className="overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between pb-2 bg-gradient-to-br from-purple-50 to-purple-100">
            <div className="flex items-center gap-2">
              <div className="rounded-full bg-purple-500 p-2">
                <PiggyBank className="h-4 w-4 text-white" />
              </div>
              <CardTitle className="text-sm font-medium">Savings Rate</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-purple-600">{savingsRate.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground mt-1">
              {monthlyIncome > 0 ? formatCurrency(monthlyIncome - monthlyExpenses, displayCurrency) : '$0'} saved
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Transactions */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="rounded-full bg-orange-100 p-2">
                <Receipt className="h-4 w-4 text-orange-600" />
              </div>
              <CardTitle>Recent Transactions</CardTitle>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/dashboard/transactions">
                View all <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {recentTransactions.length === 0 ? (
            <div className="text-center py-8">
              <Receipt className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">
                No transactions yet. Start by adding an account and recording your
                first transaction.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {recentTransactions.map((trans) => (
                <div key={trans.id} className="flex justify-between items-center py-2 border-b last:border-0">
                  <div className="flex items-center gap-3">
                    <div className={`rounded-full p-2 ${trans.type === 'INCOME' ? 'bg-green-100' : 'bg-red-100'}`}>
                      {trans.type === 'INCOME' ? (
                        <TrendingUp className={`h-4 w-4 text-green-600`} />
                      ) : (
                        <TrendingDown className={`h-4 w-4 text-red-600`} />
                      )}
                    </div>
                    <div>
                      <p className="font-medium">{trans.description || 'No description'}</p>
                      <p className="text-sm text-muted-foreground">
                        {trans.account?.name || 'Unknown'} • {formatDateShort(trans.date)}
                      </p>
                    </div>
                  </div>
                  <p className={`font-medium ${trans.type === 'INCOME' ? 'text-green-600' : 'text-red-600'}`}>
                    {trans.type === 'INCOME' ? '+' : '-'}{formatCurrency(parseFloat(trans.amount), displayCurrency)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Upcoming Bills */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="rounded-full bg-amber-100 p-2">
                <Calendar className="h-4 w-4 text-amber-600" />
              </div>
              <CardTitle>Upcoming Bills</CardTitle>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/dashboard/bills">
                View all <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {upcomingBills.length === 0 ? (
            <div className="text-center py-8">
              <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm text-muted-foreground mb-3">
                No upcoming bills. Add bills to track your recurring expenses.
              </p>
              <Button asChild>
                <Link href="/dashboard/bills">Add your first bill</Link>
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Summary */}
              <div className="flex items-center gap-4 p-3 rounded-lg bg-amber-50 border border-amber-200">
                <div className="rounded-full bg-amber-500 p-2">
                  <Clock className="h-4 w-4 text-white" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-amber-800">
                    {formatCurrency(totalDueSoon, displayCurrency)} due in next 7 days
                  </p>
                  <p className="text-xs text-amber-600">
                    {dueSoonCount} bill{dueSoonCount !== 1 ? 's' : ''} need attention
                  </p>
                </div>
              </div>

              {/* Bill List */}
              <div className="space-y-3">
                {upcomingBills.slice(0, 5).map((bill) => {
                  const status = getBillStatus(bill.nextDueAt);
                  const StatusIcon = status.icon;
                  return (
                    <div
                      key={bill.id}
                      className="flex items-center justify-between p-3 rounded-lg border hover:bg-accent/50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`rounded-full p-2 ${status.color}`}>
                          <StatusIcon className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="font-medium">{bill.name}</p>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span>{billFrequencyLabels[bill.frequency] || bill.frequency}</span>
                            <span>•</span>
                            <span>{bill.account?.name || 'No account'}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <p className="font-medium">{formatCurrency(parseFloat(bill.amount), displayCurrency)}</p>
                          <Badge variant={status.variant} className="text-xs">
                            {status.label}
                          </Badge>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={payingBillId === bill.id}
                          onClick={() => handleMarkAsPaid(bill.id)}
                          className="ml-2"
                        >
                          <CheckCircle className="h-4 w-4 mr-1" />
                          {payingBillId === bill.id ? 'Processing...' : 'Paid'}
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card className="overflow-hidden">
          <CardHeader className="bg-gradient-to-br from-indigo-50 to-indigo-100 pb-4">
            <div className="flex items-center gap-2">
              <div className="rounded-full bg-indigo-500 p-2">
                <Sparkles className="h-4 w-4 text-white" />
              </div>
              <CardTitle className="text-lg">Getting Started</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="pt-4">
            <ol className="space-y-3">
              {[
                { text: 'Add your bank accounts', icon: Wallet },
                { text: 'Set up your categories', icon: Target },
                { text: 'Record your transactions', icon: Receipt },
                { text: 'Set budgets and goals', icon: PiggyBank },
              ].map((item, index) => (
                <li key={index} className="flex items-center gap-3 text-sm">
                  <span className="flex items-center justify-center w-6 h-6 rounded-full bg-indigo-100 text-indigo-600 text-xs font-bold">
                    {index + 1}
                  </span>
                  <span className="flex items-center gap-2 text-muted-foreground">
                    <item.icon className="h-4 w-4" />
                    {item.text}
                  </span>
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>

        <Card className="overflow-hidden">
          <CardHeader className="bg-gradient-to-br from-pink-50 to-pink-100 pb-4">
            <div className="flex items-center gap-2">
              <div className="rounded-full bg-pink-500 p-2">
                <PiggyBank className="h-4 w-4 text-white" />
              </div>
              <CardTitle className="text-lg">Savings Goals</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="text-center py-4">
              <div className="rounded-full bg-pink-100 w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <Target className="h-8 w-8 text-pink-600" />
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                Set goals to track your savings progress
              </p>
              <Button variant="outline" className="w-full" asChild>
                <Link href="/dashboard/savings-goals">
                  <PiggyBank className="h-4 w-4 mr-2" />
                  Create a goal
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="overflow-hidden">
          <CardHeader className="bg-gradient-to-br from-cyan-50 to-cyan-100 pb-4">
            <div className="flex items-center gap-2">
              <div className="rounded-full bg-cyan-500 p-2">
                <Target className="h-4 w-4 text-white" />
              </div>
              <CardTitle className="text-lg">Quick Actions</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="pt-4 space-y-2">
            <Button variant="outline" className="w-full justify-start" asChild>
              <Link href="/dashboard/accounts">
                <Wallet className="h-4 w-4 mr-2" />
                Add Account
              </Link>
            </Button>
            <Button variant="outline" className="w-full justify-start" asChild>
              <Link href="/dashboard/transactions">
                <Receipt className="h-4 w-4 mr-2" />
                Add Transaction
              </Link>
            </Button>
            <Button variant="outline" className="w-full justify-start" asChild>
              <Link href="/dashboard/bills">
                <Calendar className="h-4 w-4 mr-2" />
                Add Bill
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
