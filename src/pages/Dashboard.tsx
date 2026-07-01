import React, { useState, useEffect } from 'react';
import { Play, CheckCircle2, ChevronRight, Folder, FolderOpen, FileText, Circle, CheckCircle, Flame, Plus, Clock, Target, Activity, Calendar } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useUserStore } from '../store/useUserStore';
import { useAuthStore } from '../store/useAuthStore';
import { usePlannerStore } from '../store/usePlannerStore';

// --- GEIST UI COMPONENTS ---

const GeistBadge = ({ children, type = 'warning' }: { children: React.ReactNode, type?: 'warning' | 'error' | 'success' | 'default' }) => {
  const colors = {
    warning: 'bg-amber-50 text-amber-600 border-amber-200 dark:bg-amber-900/10 dark:text-amber-500 dark:border-amber-900/50',
    error: 'bg-geist-error-light/10 text-geist-error-light border-geist-error-light/20 dark:bg-geist-error-dark/10 dark:text-geist-error-dark dark:border-geist-error-dark/50',
    success: 'bg-geist-success/10 text-geist-success border-geist-success/20 dark:bg-geist-success/10 dark:text-geist-success dark:border-geist-success/50',
    default: 'bg-geist-surface-light text-geist-text-secondary-light border-geist-border-light dark:bg-geist-surface-dark dark:text-geist-text-secondary-dark dark:border-geist-border-dark'
  };
  return (
    <span className={`inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-medium border ${colors[type]}`}>
      {children}
    </span>
  );
};

const GeistFieldset = ({ title, description, children, className = '' }: { title: string, description?: string, children: React.ReactNode, className?: string }) => (
  <div className={`border border-geist-border-light dark:border-geist-border-dark rounded-xl bg-geist-bg-light dark:bg-geist-bg-dark overflow-hidden flex flex-col h-full shadow-sm ${className}`}>
    <div className="px-4 py-3 border-b border-geist-border-light dark:border-geist-border-dark bg-geist-surface-light/30 dark:bg-geist-surface-dark/30">
      <h3 className="text-sm font-medium text-geist-text-primary-light dark:text-geist-text-primary-dark">{title}</h3>
      {description && <p className="text-xs text-geist-text-secondary-light dark:text-geist-text-secondary-dark mt-0.5">{description}</p>}
    </div>
    <div className="flex-1 flex flex-col p-0 overflow-hidden">
      {children}
    </div>
  </div>
);

const FileTreeNode = ({ label, children, level = 0, isFile = false, status = 'none' }: any) => {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <div className="font-sans">
      <div 
        className={`flex items-center gap-2.5 py-1.5 px-2 hover:bg-geist-surface-light dark:hover:bg-geist-surface-dark cursor-pointer text-sm rounded-md transition-colors ${level > 0 ? 'ml-3 border-l border-geist-border-light dark:border-geist-border-dark pl-3 rounded-l-none' : ''}`}
        onClick={() => !isFile && setIsOpen(!isOpen)}
      >
        {!isFile && (
          <ChevronRight className={`w-3.5 h-3.5 text-geist-text-secondary-light dark:text-geist-text-secondary-dark transition-transform ${isOpen ? 'rotate-90' : ''}`} />
        )}
        {isFile ? (
          <FileText className="w-3.5 h-3.5 text-geist-text-secondary-light dark:text-geist-text-secondary-dark shrink-0" />
        ) : isOpen ? (
          <FolderOpen className="w-3.5 h-3.5 text-geist-text-secondary-light dark:text-geist-text-secondary-dark shrink-0" />
        ) : (
          <Folder className="w-3.5 h-3.5 text-geist-text-secondary-light dark:text-geist-text-secondary-dark shrink-0" />
        )}
        <span className={`flex-1 truncate ${isFile ? 'text-geist-text-secondary-light dark:text-geist-text-secondary-dark text-[13px]' : 'text-geist-text-primary-light dark:text-geist-text-primary-dark font-medium text-[13px]'}`}>{label}</span>
        {status === 'complete' && <CheckCircle className="w-3.5 h-3.5 text-geist-success dark:text-geist-success shrink-0" />}
        {status === 'partial' && <Circle className="w-3.5 h-3.5 text-geist-border-light dark:text-geist-border-dark shrink-0" />}
      </div>
      {isOpen && !isFile && children && (
        <div className="animate-in fade-in slide-in-from-top-1 duration-200 mt-0.5">
          {children}
        </div>
      )}
    </div>
  );
};

export const Dashboard: React.FC = () => {
  const { academicTree, papers, attempts, questions, streak } = useUserStore();
  const { user } = useAuthStore();
  const { tasks, fetchTasks } = usePlannerStore();
  const navigate = useNavigate();

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  // Group stats by subject and chapter from attempts globally
  const chapterStatsMap = new Map<string, { totalAttempts: number, correctAttempts: number, totalTime: number }>();
  const chapterAnalyticsMap = new Map<string, { chapterName: string, subjectName: string, totalAttempts: number, correctAttempts: number, totalTime: number }>();
  
  attempts.forEach(att => {
    const q = questions.find(q => q.id === att.question_id);
    if (q) {
        let subjectName = 'Unknown';
        let chapterName = 'Unknown';
        
        for (const cls of academicTree) {
           for (const sub of (cls.children || [])) {
              for (const chap of (sub.children || [])) {
                 if (chap.id === q.chapter_id) {
                    subjectName = sub.name;
                    chapterName = chap.name;
                 }
              }
           }
        }
        
        if (!chapterStatsMap.has(q.chapter_id)) {
           chapterStatsMap.set(q.chapter_id, { totalAttempts: 0, correctAttempts: 0, totalTime: 0 });
        }
        if (!chapterAnalyticsMap.has(q.chapter_id)) {
           chapterAnalyticsMap.set(q.chapter_id, { chapterName, subjectName, totalAttempts: 0, correctAttempts: 0, totalTime: 0 });
        }
        
        const chapStat = chapterStatsMap.get(q.chapter_id)!;
        chapStat.totalAttempts++;
        if (att.is_correct) chapStat.correctAttempts++;
        chapStat.totalTime += att.time_taken_seconds || 0;

        const chapAnalytic = chapterAnalyticsMap.get(q.chapter_id)!;
        chapAnalytic.totalAttempts++;
        if (att.is_correct) chapAnalytic.correctAttempts++;
        chapAnalytic.totalTime += att.time_taken_seconds || 0;
    }
  });

  const formatTime = (seconds: number) => {
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.round(seconds % 60);
    if (m > 0) return `${m}m ${s}s`;
    return `${s}s`;
  };

  const chapterAnalytics = Array.from(chapterAnalyticsMap.values()).map(data => ({
    name: data.chapterName,
    subject: data.subjectName,
    accuracy: data.totalAttempts > 0 ? Math.round((data.correctAttempts / data.totalAttempts) * 100) : 0,
    speed: data.totalAttempts > 0 ? formatTime(data.totalTime / data.totalAttempts) : '0s',
    status: data.totalAttempts > 0 ? ((data.correctAttempts / data.totalAttempts) * 100 < 60 && data.totalAttempts > 5 ? 'Weak' : 'Good') : 'New'
  })).sort((a, b) => a.accuracy - b.accuracy);

  // Get most recently practiced chapter
  const recentChapterAttempt = [...attempts].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];
  let recentChapter: any = null;
  let recentChapterProgress = 0;
  
  if (recentChapterAttempt) {
     const q = questions.find(q => q.id === recentChapterAttempt.question_id);
     if (q && q.chapter_id) {
        for (const cls of academicTree) {
           for (const sub of (cls.children || [])) {
              for (const chap of (sub.children || [])) {
                 if (chap.id === q.chapter_id) {
                    recentChapter = chap;
                 }
              }
           }
        }
        
        if (recentChapter) {
           const chapQs = questions.filter(cq => cq.chapter_id === recentChapter.id);
           if (chapQs.length > 0) {
              const chapQIds = new Set(chapQs.map(cq => cq.id));
              const attempted = new Set(attempts.filter(a => chapQIds.has(a.question_id)).map(a => a.question_id)).size;
              recentChapterProgress = Math.round((attempted / chapQs.length) * 100);
           }
        }
     }
  }

  const handleResumePractice = () => {
    if (!recentChapter) return;
    const filter = {
      classIds: [],
      subjectIds: [],
      chapterIds: [recentChapter.id],
      sourceType: 'All',
      sourceId: '',
      timeLimit: 0
    };
    localStorage.setItem('practice_config', JSON.stringify(filter));
    navigate('/practice/session');
  };

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todaysTasks = tasks.filter(task => {
    const taskDate = new Date(task.date);
    taskDate.setHours(0, 0, 0, 0);
    return taskDate.getTime() === today.getTime();
  });

  return (
    <div className="flex flex-col min-h-full w-full font-sans bg-geist-bg-light dark:bg-geist-bg-dark overflow-hidden">
      {/* Header */}
      <div className="px-4 md:px-6 py-4 border-b border-geist-border-light dark:border-geist-border-dark shrink-0 z-10 sticky top-0 bg-geist-bg-light/80 dark:bg-geist-bg-dark/80 backdrop-blur-md flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-semibold tracking-tight text-geist-text-primary-light dark:text-geist-text-primary-dark leading-tight">
            Welcome back{user?.email ? `, ${user.email.split('@')[0]}` : ''}
          </h1>
          <p className="text-geist-text-secondary-light dark:text-geist-text-secondary-dark text-sm mt-0.5">Let's keep your momentum going.</p>
        </div>
        <div className="flex items-center gap-3">
           <div className="bg-geist-surface-light dark:bg-geist-surface-dark border border-geist-border-light dark:border-geist-border-dark pl-2 pr-4 py-1.5 rounded-full flex items-center gap-2 shadow-sm">
              <div className="w-6 h-6 flex items-center justify-center"><Flame className="w-4 h-4 text-orange-500 fill-orange-500" /></div>
              <span className="text-lg font-bold text-orange-500">{streak}</span>
              <span className="text-[10px] font-semibold text-geist-text-secondary-light uppercase tracking-wider hidden sm:inline">Day Streak</span>
           </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 md:p-6 max-w-7xl mx-auto w-full space-y-6">

        {/* Quick Actions & Continue Practice */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6">
          <div className="lg:col-span-2">
            {recentChapter ? (
              <div className="h-full bg-geist-text-primary-light dark:bg-geist-text-primary-dark text-geist-bg-light dark:text-geist-bg-dark rounded-2xl p-5 md:p-6 flex flex-col justify-between shadow-md relative overflow-hidden group">
                <div className="absolute -right-10 -top-10 w-40 h-40 bg-white/10 dark:bg-black/10 rounded-full blur-2xl group-hover:bg-white/20 dark:group-hover:bg-black/20 transition-all duration-700"></div>
                <div className="relative z-10">
                  <div className="flex items-center gap-2 text-[10px] md:text-xs uppercase tracking-wider font-semibold opacity-80 mb-2">
                    <Clock className="w-3.5 h-3.5" /> Continue Practicing
                  </div>
                  <div className="text-xl md:text-2xl font-medium leading-tight max-w-[80%]">{recentChapter.name}</div>
                </div>
                <div className="mt-8 relative z-10">
                  <div className="flex justify-between items-center text-xs mb-2 font-medium opacity-90">
                    <span>Chapter Progress</span>
                    <span>{recentChapterProgress}%</span>
                  </div>
                  <div className="w-full h-2 bg-black/20 dark:bg-white/20 rounded-full overflow-hidden">
                    <div className="h-full bg-geist-success transition-all duration-500" style={{ width: `${recentChapterProgress}%` }} />
                  </div>
                  <button onClick={handleResumePractice} className="mt-5 w-full bg-geist-bg-light dark:bg-geist-bg-dark text-geist-text-primary-light dark:text-geist-text-primary-dark py-2.5 rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity flex items-center justify-center gap-2 shadow-sm">
                    Resume Chapter <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ) : (
              <div className="h-full bg-geist-surface-light dark:bg-geist-surface-dark border border-geist-border-light dark:border-geist-border-dark rounded-2xl p-6 flex flex-col items-center justify-center text-center shadow-sm">
                 <Target className="w-10 h-10 text-geist-text-secondary-light dark:text-geist-text-secondary-dark mb-3 opacity-50" />
                 <h3 className="text-sm font-medium text-geist-text-primary-light dark:text-geist-text-primary-dark mb-1">No Recent Activity</h3>
                 <span className="text-xs text-geist-text-secondary-light dark:text-geist-text-secondary-dark">Start practicing topics to see your recent chapter here.</span>
              </div>
            )}
          </div>
          
          <div className="grid grid-cols-2 lg:grid-cols-1 gap-4 lg:gap-4">
            <Link to="/practice/setup" className="flex flex-col items-start justify-center h-full bg-geist-bg-light dark:bg-geist-bg-dark border border-geist-border-light dark:border-geist-border-dark p-4 md:p-3 rounded-2xl hover:border-geist-text-primary-light dark:hover:border-geist-text-primary-dark transition-all shadow-sm hover:shadow-md group">
               <div className="w-8 h-8 rounded-full bg-geist-surface-light dark:bg-geist-surface-dark flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                 <Plus className="w-4 h-4 text-geist-text-primary-light dark:text-geist-text-primary-dark" />
               </div>
               <span className="text-sm font-semibold text-geist-text-primary-light dark:text-geist-text-primary-dark">Custom Practice</span>
               <span className="text-[10px] text-geist-text-secondary-light dark:text-geist-text-secondary-dark mt-0.5">Setup practice by topics</span>
            </Link>
            <Link to="/mock-test/setup" className="flex flex-col items-start justify-center h-full bg-geist-bg-light dark:bg-geist-bg-dark border border-geist-border-light dark:border-geist-border-dark p-4 md:p-3 rounded-2xl hover:border-geist-text-primary-light dark:hover:border-geist-text-primary-dark transition-all shadow-sm hover:shadow-md group">
               <div className="w-8 h-8 rounded-full bg-geist-surface-light dark:bg-geist-surface-dark flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                 <FileText className="w-4 h-4 text-geist-text-primary-light dark:text-geist-text-primary-dark" />
               </div>
               <span className="text-sm font-semibold text-geist-text-primary-light dark:text-geist-text-primary-dark">Custom Mock Test</span>
               <span className="text-[10px] text-geist-text-secondary-light dark:text-geist-text-secondary-dark mt-0.5">Create personalized tests</span>
            </Link>
            <Link to="/exams" className="flex flex-col items-start justify-center h-full col-span-2 lg:col-span-1 bg-geist-bg-light dark:bg-geist-bg-dark border border-geist-border-light dark:border-geist-border-dark p-4 md:p-3 rounded-2xl hover:border-geist-text-primary-light dark:hover:border-geist-text-primary-dark transition-all shadow-sm hover:shadow-md group">
               <div className="w-8 h-8 rounded-full bg-geist-surface-light dark:bg-geist-surface-dark flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                 <Target className="w-4 h-4 text-geist-text-primary-light dark:text-geist-text-primary-dark" />
               </div>
               <span className="text-sm font-semibold text-geist-text-primary-light dark:text-geist-text-primary-dark">Standard Mock Tests</span>
               <span className="text-[10px] text-geist-text-secondary-light dark:text-geist-text-secondary-dark mt-0.5">Take standard full mock tests</span>
            </Link>
          </div>
        </div>

        {/* Today's Schedule */}
        <div className="bg-geist-surface-light dark:bg-geist-surface-dark border border-geist-border-light dark:border-geist-border-dark rounded-2xl p-5 md:p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold flex items-center gap-2">
              <Calendar className="w-4 h-4 text-geist-text-secondary-light dark:text-geist-text-secondary-dark" />
              Today's Schedule
            </h2>
            <Link to="/planner" className="text-xs font-medium text-geist-text-secondary-light dark:text-geist-text-secondary-dark hover:text-geist-text-primary-light dark:hover:text-geist-text-primary-dark transition-colors flex items-center gap-1">
              View Planner <ChevronRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {todaysTasks.length > 0 ? todaysTasks.slice(0, 3).map((task) => (
              <div key={task.id} className="bg-geist-bg-light dark:bg-geist-bg-dark border border-geist-border-light dark:border-geist-border-dark rounded-xl p-4 flex flex-col justify-between hover:border-geist-text-secondary-light/50 dark:hover:border-geist-text-secondary-dark/50 transition-colors">
                <div>
                  <h3 className="text-sm font-medium truncate">{task.title}</h3>
                  <p className="text-xs text-geist-text-secondary-light dark:text-geist-text-secondary-dark mt-1">
                    {task.subject_id ? academicTree.flatMap(c => c.children || []).find(s => s.id === task.subject_id)?.name || 'Custom Subject' : 'Custom Subject'}
                  </p>
                </div>
                <div className="mt-4 flex items-center justify-between">
                  <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-1 rounded-md bg-geist-surface-light dark:bg-geist-surface-dark border border-geist-border-light dark:border-geist-border-dark text-geist-text-secondary-light dark:text-geist-text-secondary-dark">
                    {{
                      'not-started': 'Planned',
                      'in-progress': 'Ongoing',
                      'completed': 'Done',
                      'revision': 'Revision'
                    }[task.status] || task.status.replace('-', ' ')}
                  </span>
                  <Link to="/pomodoro" className="text-xs font-medium text-geist-text-primary-light dark:text-geist-text-primary-dark hover:underline flex items-center gap-1">
                    <Clock className="w-3 h-3" /> Focus
                  </Link>
                </div>
              </div>
            )) : (
              <div className="col-span-1 md:col-span-3 h-24 bg-geist-bg-light dark:bg-geist-bg-dark border border-geist-border-light border-dashed dark:border-geist-border-dark rounded-xl flex flex-col items-center justify-center text-geist-text-secondary-light dark:text-geist-text-secondary-dark">
                <span className="text-sm font-medium">No tasks scheduled for today</span>
                <Link to="/planner" className="text-xs hover:underline mt-1">Plan your day</Link>
              </div>
            )}
          </div>
        </div>

        {/* Analytics & History */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <GeistFieldset 
            title="Accuracy & Speed Analytics" 
            description="Average time per question vs. Accuracy rate mapped by chapter."
            className="md:h-[350px]"
          >
            <div className="overflow-x-auto overflow-y-auto h-full no-scrollbar">
              <table className="w-full text-sm text-left">
                <thead className="bg-geist-surface-light/80 dark:bg-geist-surface-dark/80 text-geist-text-secondary-light dark:text-geist-text-secondary-dark sticky top-0 z-10 backdrop-blur-md">
                  <tr>
                    <th className="px-4 py-2.5 font-medium text-xs">Chapter</th>
                    <th className="px-4 py-2.5 font-medium text-xs">Subject</th>
                    <th className="px-4 py-2.5 font-medium text-xs">Accuracy</th>
                    <th className="px-4 py-2.5 font-medium text-xs">Avg Speed</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-geist-border-light dark:divide-geist-border-dark bg-geist-bg-light dark:bg-geist-bg-dark">
                  {chapterAnalytics.length > 0 ? chapterAnalytics.map((stat, i) => (
                    <tr key={i} className="hover:bg-geist-surface-light/50 dark:hover:bg-geist-surface-dark/50 transition-colors">
                      <td className="px-4 py-3 font-medium text-geist-text-primary-light dark:text-geist-text-primary-dark text-[13px]">
                        <div className="flex items-center gap-2">
                           <span className="truncate max-w-[150px]">{stat.name}</span>
                           {stat.status === 'Weak' && <GeistBadge type="warning">Weak</GeistBadge>}
                        </div>
                      </td>
                      <td className="px-4 py-3 font-medium text-geist-text-secondary-light dark:text-geist-text-secondary-dark text-[12px]">{stat.subject}</td>
                      <td className="px-4 py-3 font-mono text-[13px]">{stat.accuracy}%</td>
                      <td className="px-4 py-3 font-mono text-[13px]">{stat.speed}</td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan={4} className="px-4 py-8 text-center flex flex-col items-center justify-center text-geist-text-secondary-light dark:text-geist-text-secondary-dark h-full">
                        <Activity className="w-6 h-6 mb-2 opacity-50" />
                        <span className="text-xs">No analytics available yet.</span>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </GeistFieldset>

          <GeistFieldset title="Explore Topics" description="Class > Subject > Chapter hierarchy." className="md:h-[350px]">
            <div className="p-3 h-full overflow-y-auto bg-geist-bg-light dark:bg-geist-bg-dark no-scrollbar">
              {academicTree.map(cls => (
                <FileTreeNode key={cls.id} label={cls.name} level={0}>
                  {cls.children?.map(sub => (
                    <FileTreeNode key={sub.id} label={sub.name} level={1}>
                      {sub.children?.map(chap => {
                        const chapStat = chapterStatsMap.get(chap.id);
                        let status = 'none';
                        if (chapStat && chapStat.totalAttempts > 0) {
                          const acc = (chapStat.correctAttempts / chapStat.totalAttempts) * 100;
                          status = acc > 80 ? 'complete' : 'partial';
                        }
                        return (
                          <div 
                            key={chap.id} 
                            onClick={() => {
                              localStorage.setItem('practice_config', JSON.stringify({ chapterIds: [chap.id], classes: [], subjects: [] }));
                              navigate('/practice/session');
                            }} 
                            className="block outline-none cursor-pointer"
                          >
                            <FileTreeNode label={chap.name} isFile status={status} level={2} />
                          </div>
                        );
                      })}
                    </FileTreeNode>
                  ))}
                </FileTreeNode>
              ))}
              {academicTree.length === 0 && (
                <div className="flex items-center justify-center h-full text-geist-text-secondary-light dark:text-geist-text-secondary-dark text-xs">No academic structure available.</div>
              )}
            </div>
          </GeistFieldset>
        </div>
      </div>
    </div>
  );
};
