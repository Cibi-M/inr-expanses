import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatINR } from '@/lib/currency';
import { 
  TrendingUp, 
  TrendingDown, 
  Wallet, 
  Building2,
  AlertCircle,
  ArrowUpRight
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Link } from 'react-router-dom';

interface DashboardStats {
  activeProjects: number;
  totalOutstanding: number;
  cashOnHand: number;
  bankBalance: number;
  monthExpenses: number;
  openAdvances: number;
}

const Dashboard = () => {
  const [stats, setStats] = useState<DashboardStats>({
    activeProjects: 0,
    totalOutstanding: 0,
    cashOnHand: 0,
    bankBalance: 0,
    monthExpenses: 0,
    openAdvances: 0,
  });
  const [topProjects, setTopProjects] = useState<any[]>([]);
  const [recentTransactions, setRecentTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      // Fetch active projects count and outstanding
      const { data: projects } = await supabase
        .from('projects')
        .select('*')
        .eq('status', 'active');

      const activeProjects = projects?.length || 0;
      const totalOutstanding = projects?.reduce((sum, p) => sum + parseFloat(String(p.remaining_amount || 0)), 0) || 0;

      // Fetch cash and bank balances
      const { data: transactions } = await supabase
        .from('transactions')
        .select('*');

      let cashOnHand = 0;
      let bankBalance = 0;
      let monthExpenses = 0;

      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      transactions?.forEach(t => {
        const amount = parseFloat(String(t.amount || 0));
        const createdAt = new Date(t.created_at);

        if (t.fund_source === 'cash') {
          cashOnHand += t.transaction_type === 'credit' ? amount : -amount;
        } else {
          bankBalance += t.transaction_type === 'credit' ? amount : -amount;
        }

        if (t.transaction_type === 'debit' && createdAt >= startOfMonth) {
          monthExpenses += amount;
        }
      });

      // Fetch open advances
      const { data: advances } = await supabase
        .from('petty_cash_advance')
        .select('*')
        .in('status', ['open', 'partially_returned']);

      // Fetch top 5 projects by remaining amount
      const { data: topProjectsData } = await supabase
        .from('projects')
        .select('*, customers(name)')
        .eq('status', 'active')
        .order('remaining_amount', { ascending: false })
        .limit(5);

      // Fetch recent transactions
      const { data: recentTxData } = await supabase
        .from('transactions')
        .select('*, customers(name), projects(name)')
        .order('created_at', { ascending: false })
        .limit(10);

      setStats({
        activeProjects,
        totalOutstanding,
        cashOnHand: Math.max(0, cashOnHand),
        bankBalance: Math.max(0, bankBalance),
        monthExpenses,
        openAdvances: advances?.length || 0,
      });

      setTopProjects(topProjectsData || []);
      setRecentTransactions(recentTxData || []);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    {
      title: 'Active Projects',
      value: stats.activeProjects,
      icon: Building2,
      color: 'text-primary',
      bgColor: 'bg-primary/10',
    },
    {
      title: 'Total Outstanding',
      value: formatINR(stats.totalOutstanding),
      icon: AlertCircle,
      color: 'text-accent',
      bgColor: 'bg-accent/10',
    },
    {
      title: 'Cash On Hand',
      value: formatINR(stats.cashOnHand),
      icon: Wallet,
      color: 'text-success',
      bgColor: 'bg-success/10',
    },
    {
      title: 'Bank Balance',
      value: formatINR(stats.bankBalance),
      icon: TrendingUp,
      color: 'text-primary',
      bgColor: 'bg-primary/10',
    },
    {
      title: 'Month Expenses',
      value: formatINR(stats.monthExpenses),
      icon: TrendingDown,
      color: 'text-destructive',
      bgColor: 'bg-destructive/10',
    },
    {
      title: 'Open Advances',
      value: stats.openAdvances,
      icon: Wallet,
      color: 'text-accent',
      bgColor: 'bg-accent/10',
    },
  ];

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-32 bg-muted rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Overview of your furnishing business performance
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {statCards.map((stat, idx) => {
          const Icon = stat.icon;
          return (
            <Card key={idx} className="hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
                <div className={`h-10 w-10 rounded-lg ${stat.bgColor} flex items-center justify-center`}>
                  <Icon className={`h-5 w-5 ${stat.color}`} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {typeof stat.value === 'number' && !stat.title.includes('Projects') && !stat.title.includes('Advances')
                    ? stat.value
                    : stat.value}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Top Projects */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Top Projects by Outstanding</span>
              <Link to="/projects">
                <Badge variant="outline" className="cursor-pointer">
                  View All <ArrowUpRight className="ml-1 h-3 w-3" />
                </Badge>
              </Link>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {topProjects.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No active projects yet
                </p>
              ) : (
                topProjects.map((project) => (
                  <div key={project.id} className="flex items-center justify-between">
                    <div className="space-y-1">
                      <p className="text-sm font-medium leading-none">{project.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {project.customers?.name}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">{formatINR(parseFloat(project.remaining_amount))}</p>
                      <div className="w-24 bg-secondary rounded-full h-2 mt-1">
                        <div
                          className="bg-primary h-2 rounded-full"
                          style={{
                            width: `${Math.max(0, Math.min(100, ((parseFloat(project.estimated_total) - parseFloat(project.remaining_amount)) / parseFloat(project.estimated_total)) * 100))}%`,
                          }}
                        />
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Recent Transactions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Recent Transactions</span>
              <Link to="/transactions">
                <Badge variant="outline" className="cursor-pointer">
                  View All <ArrowUpRight className="ml-1 h-3 w-3" />
                </Badge>
              </Link>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentTransactions.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No transactions yet
                </p>
              ) : (
                recentTransactions.map((tx) => (
                  <div key={tx.id} className="flex items-center justify-between">
                    <div className="space-y-1">
                      <p className="text-sm font-medium leading-none">
                        {tx.projects?.name || 'N/A'}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {tx.customers?.name} • {tx.fund_source}
                      </p>
                    </div>
                    <div className="text-right">
                      <Badge variant={tx.transaction_type === 'credit' ? 'default' : 'destructive'}>
                        {tx.transaction_type === 'credit' ? '+' : '-'}{formatINR(parseFloat(tx.amount))}
                      </Badge>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
