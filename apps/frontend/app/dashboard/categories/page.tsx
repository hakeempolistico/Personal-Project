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
import { Tags, ArrowUpCircle, ArrowDownCircle } from 'lucide-react';

const categorySchema = z.object({
  name: z.string().min(1, 'Name is required'),
  type: z.enum(['INCOME', 'EXPENSE', 'TRANSFER']),
  icon: z.string().optional(),
  color: z.string().optional(),
});

type CategoryFormData = z.infer<typeof categorySchema>;

interface Category {
  id: string;
  name: string;
  type: string;
  icon: string | null;
  color: string | null;
  isSystem: boolean;
}

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const { toast } = useToast();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CategoryFormData>({
    resolver: zodResolver(categorySchema),
    defaultValues: {
      type: 'EXPENSE',
    },
  });

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const data = await apiClient.get<Category[]>('/categories');
      setCategories(data);
    } catch (error) {
      console.error('Failed to fetch categories:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const onSubmit = async (data: CategoryFormData) => {
    setIsCreating(true);
    try {
      await apiClient.post('/categories', data);
      toast({ title: 'Category created successfully!' });
      reset();
      fetchCategories();
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Failed to create category',
        description: error instanceof Error ? error.message : 'An error occurred',
      });
    } finally {
      setIsCreating(false);
    }
  };

  const getCategoryIcon = (type: string) => {
    if (type === 'INCOME') return <ArrowUpCircle className="h-5 w-5 text-green-600" />;
    if (type === 'EXPENSE') return <ArrowDownCircle className="h-5 w-5 text-red-600" />;
    return <Tags className="h-5 w-5 text-blue-600" />;
  };

  const incomeCategories = categories.filter((c) => c.type === 'INCOME');
  const expenseCategories = categories.filter((c) => c.type === 'EXPENSE');
  const transferCategories = categories.filter((c) => c.type === 'TRANSFER');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Categories</h1>
        <p className="text-muted-foreground">Organize your transactions with categories</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Add New Category</CardTitle>
          <CardDescription>Create categories to classify your transactions</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">Category Name</Label>
                <Input id="name" placeholder="e.g., Groceries" {...register('name')} />
                {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="type">Category Type</Label>
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
            </div>
            <Button type="submit" disabled={isCreating}>
              {isCreating ? 'Creating...' : 'Create Category'}
            </Button>
          </form>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ArrowUpCircle className="h-5 w-5 text-green-600" />
              Income Categories
            </CardTitle>
          </CardHeader>
          <CardContent>
            {incomeCategories.length === 0 ? (
              <p className="text-sm text-muted-foreground">No income categories yet.</p>
            ) : (
              <ul className="space-y-2">
                {incomeCategories.map((cat) => (
                  <li key={cat.id} className="flex items-center gap-2">
                    {getCategoryIcon(cat.type)}
                    <span>{cat.name}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ArrowDownCircle className="h-5 w-5 text-red-600" />
              Expense Categories
            </CardTitle>
          </CardHeader>
          <CardContent>
            {expenseCategories.length === 0 ? (
              <p className="text-sm text-muted-foreground">No expense categories yet.</p>
            ) : (
              <ul className="space-y-2">
                {expenseCategories.map((cat) => (
                  <li key={cat.id} className="flex items-center gap-2">
                    {getCategoryIcon(cat.type)}
                    <span>{cat.name}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Tags className="h-5 w-5 text-blue-600" />
              Transfer Categories
            </CardTitle>
          </CardHeader>
          <CardContent>
            {transferCategories.length === 0 ? (
              <p className="text-sm text-muted-foreground">No transfer categories yet.</p>
            ) : (
              <ul className="space-y-2">
                {transferCategories.map((cat) => (
                  <li key={cat.id} className="flex items-center gap-2">
                    {getCategoryIcon(cat.type)}
                    <span>{cat.name}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
