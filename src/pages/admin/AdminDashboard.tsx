import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Users, FileQuestion, Activity, AlertCircle, RefreshCw, Database } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { Dropdown } from '../../components/Dropdown';
import { useAdminStore } from '../../store/useAdminStore';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer,
  ScatterChart, Scatter, ZAxis, CartesianGrid, PieChart, Pie, Cell, Legend
} from 'recharts';

interface DashboardStats {
  active_users_24h: number;
  questions_solved_today: number;
  chapter_accuracy: { chapter_name: string; total_attempts: number; accuracy_rate: number }[];
  recent_users?: { user_id: string; attempts_count: number; last_active: string }[];
}

interface BottleneckQuestion {
  question_id: string;
  question_text: string;
  exam_type: string;
  avg_time_taken: number;
  total_attempts: number;
  failure_rate?: number;
  short_text?: string;
}

const COLORS = ['var(--color-geist-success)', '#f59e0b', 'var(--color-geist-error-light)'];

export const AdminDashboard: React.FC = () => {
  const { exams } = useAdminStore();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [scatterData, setScatterData] = useState<any[]>([]);
  const [difficultyDistribution, setDifficultyDistribution] = useState<any[]>([]);
  const [totalQuestions, setTotalQuestions] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [examTypeFilter, setExamTypeFilter] = useState('All');
  
  const [liveQuestionsSolved, setLiveQuestionsSolved] = useState<number | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data: statsData, error: statsError } = await supabase.rpc('get_admin_dashboard_stats');
      if (statsError) throw statsError;

      let query = supabase.from('bottleneck_questions').select('*');
      if (examTypeFilter !== 'All') {
        query = query.eq('exam_type', examTypeFilter);
      }
      const { data: bottleneckData, error: btnError } = await query;
      if (btnError) throw btnError;

      const { data: difficultyData, error: diffError } = await supabase.from('question_difficulty_stats').select('*');
      if (diffError) throw diffError;

      const { count: questionsCount, error: countError } = await supabase.from('questions').select('id', { count: 'exact', head: true });
      if (!countError && questionsCount !== null) {
        setTotalQuestions(questionsCount);
      }

      let easy = 0, medium = 0, hard = 0;
      const diffMap = new Map((difficultyData || []).map(d => {
         const rate = d.failure_rate_percent || 0;
         if (rate < 30) easy++;
         else if (rate <= 70) medium++;
         else hard++;
         return [d.question_id, rate];
      }));

      setDifficultyDistribution([
        { name: 'Easy (<30% Fail)', value: easy },
        { name: 'Medium (30-70% Fail)', value: medium },
        { name: 'Hard (>70% Fail)', value: hard }
      ]);

      const mappedScatter = (bottleneckData || []).map(b => ({
        ...b,
        failure_rate: diffMap.get(b.question_id) || 0,
        short_text: b.question_text.length > 30 ? b.question_text.substring(0, 30) + '...' : b.question_text
      }));

      setStats(statsData as DashboardStats);
      setLiveQuestionsSolved((statsData as DashboardStats).questions_solved_today || 0);
      setScatterData(mappedScatter);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to fetch dashboard data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();

    const channel = supabase
      .channel('schema-db-changes')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'question_attempts' },
        (payload) => {
          setLiveQuestionsSolved((prev) => (prev !== null ? prev + 1 : 1));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [examTypeFilter]);

  if (loading && !stats) {
    return (
      <div className="p-4 md:p-6 lg:p-8 max-w-6xl mx-auto w-full h-full flex flex-col font-sans animate-pulse">
        <div className="h-6 bg-geist-surface-light dark:bg-geist-surface-dark rounded w-1/4 mb-6"></div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          {[1,2,3,4].map(i => <div key={i} className="h-28 bg-geist-surface-light dark:bg-geist-surface-dark rounded-xl"></div>)}
        </div>
        <div className="h-60 bg-geist-surface-light dark:bg-geist-surface-dark rounded-xl mb-6"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 md:p-6 max-w-6xl mx-auto w-full h-full flex flex-col font-sans">
        <div className="flex flex-col items-center justify-center h-full text-center">
          <AlertCircle className="w-10 h-10 text-geist-error-light dark:text-geist-error-dark mb-4" />
          <h2 className="text-lg font-medium text-geist-text-primary-light dark:text-geist-text-primary-dark mb-2">Error Loading Dashboard</h2>
          <p className="text-geist-text-secondary-light dark:text-geist-text-secondary-dark text-sm max-w-md mx-auto">{error}</p>
          <button onClick={fetchData} className="mt-6 flex items-center gap-2 px-4 py-2 bg-geist-text-primary-light dark:bg-geist-text-primary-dark text-geist-bg-light dark:text-geist-bg-dark rounded-md text-sm font-medium hover:opacity-90 transition-opacity">
            <RefreshCw className="w-4 h-4" /> Retry
          </button>
        </div>
      </div>
    );
  }

  const weakChapters = stats?.chapter_accuracy
    ? [...stats.chapter_accuracy]
        .sort((a, b) => a.accuracy_rate - b.accuracy_rate)
        .slice(0, 10)
    : [];

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-6xl mx-auto w-full h-full flex flex-col font-sans overflow-y-auto no-scrollbar">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
        <h1 className="text-xl font-semibold text-geist-text-primary-light dark:text-geist-text-primary-dark flex items-center gap-2.5">
          Overview
          <span className="flex h-2.5 w-2.5 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-geist-success opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-geist-success"></span>
          </span>
        </h1>
        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          <Link 
             to="/admin/question-types" 
             className="px-3 py-1.5 text-[11px] font-medium bg-geist-surface-light dark:bg-geist-surface-dark border border-geist-border-light dark:border-geist-border-dark rounded-lg hover:bg-geist-border-light dark:hover:bg-geist-border-dark transition-colors"
          >
            Manage Question Types
          </Link>
          <Link 
             to="/admin/books-sets" 
             className="px-3 py-1.5 text-[11px] font-medium bg-geist-surface-light dark:bg-geist-surface-dark border border-geist-border-light dark:border-geist-border-dark rounded-lg hover:bg-geist-border-light dark:hover:bg-geist-border-dark transition-colors"
          >
            Manage Books / Sets
          </Link>
          <Dropdown
            value={examTypeFilter}
            onChange={setExamTypeFilter}
            options={[
              { value: 'All', label: 'All Exams' },
              ...exams.map(e => ({ value: e.id, label: e.name }))
            ]}
          />
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-geist-bg-light dark:bg-geist-bg-dark border border-geist-border-light dark:border-geist-border-dark rounded-xl p-5 flex flex-col relative overflow-hidden group">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 rounded-md bg-geist-surface-light dark:bg-geist-surface-dark border border-geist-border-light dark:border-geist-border-dark flex items-center justify-center">
              <Users className="w-4 h-4 text-geist-text-primary-light dark:text-geist-text-primary-dark" />
            </div>
            <h2 className="text-[11px] font-medium text-geist-text-secondary-light dark:text-geist-text-secondary-dark uppercase tracking-wider">Active Users (24h)</h2>
          </div>
          <p className="text-3xl font-semibold text-geist-text-primary-light dark:text-geist-text-primary-dark">{stats?.active_users_24h || 0}</p>
        </div>

        <div className="bg-geist-bg-light dark:bg-geist-bg-dark border border-geist-border-light dark:border-geist-border-dark rounded-xl p-5 flex flex-col">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 rounded-md bg-geist-success/10 border border-geist-success/20 flex items-center justify-center">
              <Activity className="w-4 h-4 text-geist-success" />
            </div>
            <h2 className="text-[11px] font-medium text-geist-text-secondary-light dark:text-geist-text-secondary-dark uppercase tracking-wider">Live Solved (Today)</h2>
          </div>
          <p className="text-3xl font-semibold text-geist-text-primary-light dark:text-geist-text-primary-dark">{liveQuestionsSolved || 0}</p>
        </div>

        <div className="bg-geist-bg-light dark:bg-geist-bg-dark border border-geist-border-light dark:border-geist-border-dark rounded-xl p-5 flex flex-col">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 rounded-md bg-geist-surface-light dark:bg-geist-surface-dark border border-geist-border-light dark:border-geist-border-dark flex items-center justify-center">
              <Database className="w-4 h-4 text-geist-text-primary-light dark:text-geist-text-primary-dark" />
            </div>
            <h2 className="text-[11px] font-medium text-geist-text-secondary-light dark:text-geist-text-secondary-dark uppercase tracking-wider">Total Questions</h2>
          </div>
          <p className="text-3xl font-semibold text-geist-text-primary-light dark:text-geist-text-primary-dark">{totalQuestions}</p>
        </div>

        <div className="bg-geist-bg-light dark:bg-geist-bg-dark border border-geist-border-light dark:border-geist-border-dark rounded-xl p-5 flex flex-col">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 rounded-md bg-geist-error-light/10 dark:bg-geist-error-dark/10 border border-geist-error-light/20 dark:border-geist-error-dark/20 flex items-center justify-center">
              <FileQuestion className="w-4 h-4 text-geist-error-light dark:text-geist-error-dark" />
            </div>
            <h2 className="text-[11px] font-medium text-geist-text-secondary-light dark:text-geist-text-secondary-dark uppercase tracking-wider">Bottleneck Questions</h2>
          </div>
          <p className="text-3xl font-semibold text-geist-text-primary-light dark:text-geist-text-primary-dark">{scatterData.length}</p>
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        <div className="bg-geist-bg-light dark:bg-geist-bg-dark border border-geist-border-light dark:border-geist-border-dark rounded-xl p-5 h-[350px]">
          <h2 className="text-[11px] font-medium text-geist-text-secondary-light dark:text-geist-text-secondary-dark uppercase tracking-wider mb-4">Top 10 Weak Chapters (Live)</h2>
          {weakChapters.length === 0 ? (
            <div className="h-full flex items-center justify-center text-geist-text-secondary-light dark:text-geist-text-secondary-dark text-xs">No attempts data yet</div>
          ) : (
            <ResponsiveContainer width="100%" height="85%">
              <BarChart data={weakChapters} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#888" opacity={0.2} />
                <XAxis type="number" domain={[0, 100]} hide />
                <YAxis dataKey="chapter_name" type="category" width={110} tick={{ fontSize: 10, fill: '#888' }} axisLine={false} tickLine={false} />
                <RechartsTooltip cursor={{ fill: 'transparent' }} contentStyle={{ backgroundColor: 'var(--color-geist-bg-light)', border: '1px solid var(--color-geist-border-light)', borderRadius: '6px', fontSize: '11px' }} />
                <Bar dataKey="accuracy_rate" fill="var(--color-geist-error-light)" radius={[0, 3, 3, 0]} barSize={16} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="bg-geist-bg-light dark:bg-geist-bg-dark border border-geist-border-light dark:border-geist-border-dark rounded-xl p-5 h-[350px]">
          <h2 className="text-[11px] font-medium text-geist-text-secondary-light dark:text-geist-text-secondary-dark uppercase tracking-wider mb-4">Question Difficulty Split</h2>
          {difficultyDistribution.every(d => d.value === 0) ? (
             <div className="h-full flex items-center justify-center text-geist-text-secondary-light dark:text-geist-text-secondary-dark text-xs">No attempt data to calculate difficulty</div>
          ) : (
            <ResponsiveContainer width="100%" height="85%">
              <PieChart>
                <Pie
                  data={difficultyDistribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {difficultyDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <RechartsTooltip contentStyle={{ backgroundColor: 'var(--color-geist-bg-light)', border: '1px solid var(--color-geist-border-light)', borderRadius: '6px', fontSize: '11px' }} />
                <Legend wrapperStyle={{ fontSize: '11px' }} verticalAlign="bottom" height={36} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="bg-geist-bg-light dark:bg-geist-bg-dark border border-geist-border-light dark:border-geist-border-dark rounded-xl p-5 h-[350px]">
          <h2 className="text-[11px] font-medium text-geist-text-secondary-light dark:text-geist-text-secondary-dark uppercase tracking-wider mb-4">Time-Drain vs Failure Rate</h2>
          {scatterData.length === 0 ? (
             <div className="h-full flex items-center justify-center text-geist-text-secondary-light dark:text-geist-text-secondary-dark text-xs">No bottleneck questions found</div>
          ) : (
            <ResponsiveContainer width="100%" height="85%">
              <ScatterChart margin={{ top: 10, right: 20, bottom: 10, left: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#888" opacity={0.2} />
                <XAxis type="number" dataKey="failure_rate" name="Failure Rate" unit="%" tick={{ fontSize: 10, fill: '#888' }} label={{ value: 'Failure Rate %', position: 'insideBottom', offset: -10, fill: '#888', fontSize: 10 }} />
                <YAxis type="number" dataKey="avg_time_taken" name="Time Taken" unit="s" tick={{ fontSize: 10, fill: '#888' }} label={{ value: 'Avg Time (s)', angle: -90, position: 'insideLeft', fill: '#888', fontSize: 10 }} />
                <ZAxis type="number" dataKey="total_attempts" range={[40, 250]} name="Attempts" />
                <RechartsTooltip cursor={{ strokeDasharray: '3 3' }} contentStyle={{ backgroundColor: 'var(--color-geist-bg-light)', border: '1px solid var(--color-geist-border-light)', borderRadius: '6px', fontSize: '11px' }} />
                <Scatter name="Questions" data={scatterData} fill="var(--color-geist-success)" opacity={0.7} />
              </ScatterChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <div className="bg-geist-bg-light dark:bg-geist-bg-dark border border-geist-border-light dark:border-geist-border-dark rounded-xl overflow-hidden mb-6">
         <div className="p-4 border-b border-geist-border-light dark:border-geist-border-dark flex justify-between items-center bg-geist-surface-light/30 dark:bg-geist-surface-dark/30">
            <h2 className="text-[11px] font-medium text-geist-text-secondary-light dark:text-geist-text-secondary-dark uppercase tracking-wider">Recent Active Users</h2>
         </div>
         <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-geist-text-secondary-light dark:text-geist-text-secondary-dark">
               <thead className="bg-geist-surface-light/50 dark:bg-geist-surface-dark/50 border-b border-geist-border-light dark:border-geist-border-dark">
                  <tr>
                     <th className="px-4 py-2.5 font-medium text-[10px] uppercase tracking-wider">User ID</th>
                     <th className="px-4 py-2.5 font-medium text-[10px] uppercase tracking-wider">Recent Attempts</th>
                     <th className="px-4 py-2.5 font-medium text-[10px] uppercase tracking-wider text-right">Last Active</th>
                  </tr>
               </thead>
               <tbody className="divide-y divide-geist-border-light dark:divide-geist-border-dark">
                  {stats?.recent_users && stats.recent_users.length > 0 ? (
                     stats.recent_users.map(u => (
                        <tr key={u.user_id} className="hover:bg-geist-surface-light/30 dark:hover:bg-geist-surface-dark/30 transition-colors">
                           <td className="px-4 py-3 font-mono text-xs text-geist-text-primary-light dark:text-geist-text-primary-dark">{u.user_id.substring(0, 13)}...</td>
                           <td className="px-4 py-3 text-xs">{u.attempts_count}</td>
                           <td className="px-4 py-3 text-xs text-right">{new Date(u.last_active).toLocaleString()}</td>
                        </tr>
                     ))
                  ) : (
                     <tr>
                        <td colSpan={3} className="px-4 py-6 text-center text-xs text-geist-text-secondary-light dark:text-geist-text-secondary-dark">No recent users found.</td>
                     </tr>
                  )}
               </tbody>
            </table>
         </div>
      </div>
    </div>
  );
};

