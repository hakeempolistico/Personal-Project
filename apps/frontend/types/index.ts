export interface User {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: User;
}

export interface Account {
  id: string;
  userId: string;
  name: string;
  type: AccountType;
  balance: number;
  currency: string;
  icon: string | null;
  color: string | null;
  isArchived: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export enum AccountType {
  CHECKING = 'CHECKING',
  SAVINGS = 'SAVINGS',
  CREDIT_CARD = 'CREDIT_CARD',
  WALLET = 'WALLET',
  INVESTMENT = 'INVESTMENT',
}

export interface Category {
  id: string;
  userId: string | null;
  name: string;
  type: CategoryType;
  icon: string | null;
  color: string | null;
  parentId: string | null;
  isSystem: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export enum CategoryType {
  INCOME = 'INCOME',
  EXPENSE = 'EXPENSE',
  TRANSFER = 'TRANSFER',
}

export interface Transaction {
  id: string;
  userId: string;
  accountId: string;
  categoryId: string | null;
  type: TransactionType;
  amount: number;
  description: string | null;
  date: Date;
  notes: string | null;
  isRecurring: boolean;
  recurringId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export enum TransactionType {
  INCOME = 'INCOME',
  EXPENSE = 'EXPENSE',
  TRANSFER = 'TRANSFER',
}

export interface Bill {
  id: string;
  userId: string;
  name: string;
  amount: number;
  dueDay: number;
  frequency: BillFrequency;
  categoryId: string | null;
  accountId: string | null;
  isActive: boolean;
  lastPaidAt: Date | null;
  nextDueAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export enum BillFrequency {
  WEEKLY = 'WEEKLY',
  BIWEEKLY = 'BIWEEKLY',
  MONTHLY = 'MONTHLY',
  QUARTERLY = 'QUARTERLY',
  YEARLY = 'YEARLY',
}

export interface Loan {
  id: string;
  userId: string;
  name: string;
  type: LoanType;
  principal: number;
  interestRate: number;
  termMonths: number;
  startDate: Date;
  endDate: Date | null;
  remainingBalance: number;
  accountId: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export enum LoanType {
  PERSONAL = 'PERSONAL',
  MORTGAGE = 'MORTGAGE',
  AUTO = 'AUTO',
  STUDENT = 'STUDENT',
  CREDIT = 'CREDIT',
  OTHER = 'OTHER',
}

export interface Budget {
  id: string;
  userId: string;
  categoryId: string;
  amount: number;
  period: BudgetPeriod;
  startDate: Date;
  endDate: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export enum BudgetPeriod {
  WEEKLY = 'WEEKLY',
  MONTHLY = 'MONTHLY',
  QUARTERLY = 'QUARTERLY',
  YEARLY = 'YEARLY',
}

export interface SavingsGoal {
  id: string;
  userId: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  deadline: Date | null;
  icon: string | null;
  color: string | null;
  isCompleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  data: Record<string, unknown> | null;
  isRead: boolean;
  createdAt: Date;
}

export enum NotificationType {
  BILL_REMINDER = 'BILL_REMINDER',
  BUDGET_ALERT = 'BUDGET_ALERT',
  GOAL_COMPLETED = 'GOAL_COMPLETED',
  LOAN_PAYMENT = 'LOAN_PAYMENT',
  SYSTEM = 'SYSTEM',
}
