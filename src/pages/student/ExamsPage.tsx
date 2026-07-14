import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUserStore } from '../../store/useUserStore';
import { ChevronRight, Play, Network, Search, ArrowLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export const ExamsPage: React.FC = () => {
  const { exams, papers } = useUserStore();
  const navigate = useNavigate();

  const [activeExamId, setActiveExamId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Auto-select on desktop can be handled by CSS, but let's not force it to keep drilldown clean
  // We'll leave it as null initially so mobile shows the list first.

  const activeExam = useMemo(() => exams.find(e => e.id === activeExamId), [exams, activeExamId]);
  
  const filteredExams = useMemo(() => {
    return exams.filter(e => e.name.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [exams, searchQuery]);

  const examPapers = useMemo(() => {
    const p = papers.filter(p => p.exam_id === activeExamId).sort((a, b) => (b.year || 0) - (a.year || 0));
    if (searchQuery && activeExamId) {
      return p.filter(x => x.name.toLowerCase().includes(searchQuery.toLowerCase()));
    }
    return p;
  }, [papers, activeExamId, searchQuery]);

  const startMockTest = (paper_id: string) => {
    localStorage.setItem('mocktest_config', JSON.stringify({ paper_id }));
    navigate('/mock-test/session');
  };

  if (exams.length === 0) {
    return (
      <div className="flex flex-col min-h-full w-full font-sans bg-geist-bg-light dark:bg-geist-bg-dark">
        <div className="px-4 md:px-8 py-4 border-b border-geist-border-light dark:border-geist-border-dark">
          <h1 className="text-xl md:text-2xl font-semibold text-geist-text-primary-light dark:text-geist-text-primary-dark">Mock Tests</h1>
        </div>
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="text-center py-16">
            <p className="text-geist-text-secondary-light dark:text-geist-text-secondary-dark text-sm">No exams available at the moment.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-full w-full font-sans bg-geist-bg-light dark:bg-geist-bg-dark overflow-hidden">
      {/* Mobile Header (Hidden on Desktop when exam is selected) */}
      <div className={`px-4 md:px-8 py-4 border-b border-geist-border-light dark:border-geist-border-dark shrink-0 z-10 sticky top-0 bg-geist-bg-light/80 dark:bg-geist-bg-dark/80 backdrop-blur-md ${activeExamId ? 'hidden md:block' : 'block'}`}>
        <div className="flex items-center gap-1.5 text-geist-text-secondary-light dark:text-geist-text-secondary-dark mb-1">
          <button onClick={() => navigate('/dashboard')} className="text-xs hover:text-geist-text-primary-light dark:hover:text-geist-text-primary-dark transition-colors">Dashboard</button>
          <ChevronRight className="w-3 h-3" />
          <span className="text-xs font-medium text-geist-text-primary-light dark:text-geist-text-primary-dark">
            Exams & Papers
          </span>
        </div>
        <h1 className="text-xl md:text-2xl font-semibold text-geist-text-primary-light dark:text-geist-text-primary-dark leading-tight">
          Mock Tests
        </h1>
      </div>

      <div className="flex flex-1 min-h-0 relative">
        {/* Left Pane: Exams */}
        <div className={`w-full md:w-[350px] lg:w-[400px] flex-shrink-0 flex flex-col border-r border-geist-border-light dark:border-geist-border-dark bg-geist-bg-light dark:bg-geist-bg-dark transition-all duration-300 ${activeExamId ? 'hidden md:flex' : 'flex'}`}>
          <div className="p-4 border-b border-geist-border-light dark:border-geist-border-dark shrink-0">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-geist-text-secondary-light dark:text-geist-text-secondary-dark" />
              <input 
                type="text" 
                placeholder="Search exams..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-geist-surface-light dark:bg-geist-surface-dark border border-geist-border-light dark:border-geist-border-dark rounded-xl pl-9 pr-4 py-2.5 text-sm text-geist-text-primary-light dark:text-geist-text-primary-dark outline-none focus:border-geist-text-primary-light dark:focus:border-geist-text-primary-dark transition-colors"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto no-scrollbar p-3">
            <div className="space-y-1.5">
              {filteredExams.map((exam) => (
                <button
                  key={exam.id}
                  onClick={() => {
                    setActiveExamId(exam.id);
                    setSearchQuery('');
                  }}
                  className={`w-full flex items-center justify-between p-3.5 rounded-xl transition-all outline-none border ${
                    activeExamId === exam.id
                      ? 'bg-geist-surface-light dark:bg-geist-surface-dark border-geist-border-light dark:border-geist-border-dark shadow-sm'
                      : 'bg-transparent border-transparent hover:bg-geist-surface-light/50 dark:hover:bg-geist-surface-dark/50'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${activeExamId === exam.id ? 'bg-geist-text-primary-light text-geist-bg-light dark:bg-geist-text-primary-dark dark:text-geist-bg-dark' : 'bg-geist-surface-light dark:bg-geist-surface-dark text-geist-text-secondary-light dark:text-geist-text-secondary-dark'}`}>
                      <Network className="w-5 h-5" />
                    </div>
                    <div className="flex flex-col text-left min-w-0">
                      <span className={`text-sm font-medium truncate ${activeExamId === exam.id ? 'text-geist-text-primary-light dark:text-geist-text-primary-dark' : 'text-geist-text-primary-light dark:text-geist-text-primary-dark'}`}>
                        {exam.name}
                      </span>
                      <span className="text-xs text-geist-text-secondary-light dark:text-geist-text-secondary-dark">
                        {exam.duration_minutes ? `${exam.duration_minutes} mins` : 'Timed'}
                      </span>
                    </div>
                  </div>
                  <ChevronRight className={`w-4 h-4 shrink-0 transition-transform ${activeExamId === exam.id ? 'text-geist-text-primary-light dark:text-geist-text-primary-dark translate-x-1' : 'text-geist-text-secondary-light dark:text-geist-text-secondary-dark'}`} />
                </button>
              ))}
              {filteredExams.length === 0 && (
                <div className="text-center py-8 text-sm text-geist-text-secondary-light dark:text-geist-text-secondary-dark">
                  No exams found.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Pane: Papers */}
        <div className={`flex-1 flex-col bg-geist-surface-light/30 dark:bg-geist-surface-dark/30 z-20 md:flex ${activeExamId ? 'flex' : 'hidden md:flex'}`}>
          {activeExam ? (
            <>
              <div className="p-4 border-b border-geist-border-light dark:border-geist-border-dark bg-geist-bg-light/80 dark:bg-geist-bg-dark/80 backdrop-blur-md sticky top-0 z-10 flex flex-col gap-3">
                <div className="flex items-center gap-3">
                  <button 
                    onClick={() => setActiveExamId(null)}
                    className="md:hidden p-2 -ml-2 rounded-lg hover:bg-geist-surface-light dark:hover:bg-geist-surface-dark text-geist-text-secondary-light dark:text-geist-text-secondary-dark transition-colors"
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </button>
                  <h2 className="text-lg font-semibold text-geist-text-primary-light dark:text-geist-text-primary-dark line-clamp-1">
                    {activeExam.name} Papers
                  </h2>
                </div>
                <div className="relative md:hidden">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-geist-text-secondary-light dark:text-geist-text-secondary-dark" />
                  <input 
                    type="text" 
                    placeholder="Search papers..." 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-geist-surface-light dark:bg-geist-surface-dark border border-geist-border-light dark:border-geist-border-dark rounded-xl pl-9 pr-4 py-2 text-sm text-geist-text-primary-light dark:text-geist-text-primary-dark outline-none focus:border-geist-text-primary-light dark:focus:border-geist-text-primary-dark transition-colors"
                  />
                </div>
                <div className="hidden md:flex relative max-w-sm">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-geist-text-secondary-light dark:text-geist-text-secondary-dark" />
                  <input 
                    type="text" 
                    placeholder="Search papers..." 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-geist-bg-light dark:bg-geist-bg-dark border border-geist-border-light dark:border-geist-border-dark rounded-lg pl-9 pr-4 py-2 text-sm text-geist-text-primary-light dark:text-geist-text-primary-dark outline-none focus:border-geist-text-primary-light dark:focus:border-geist-text-primary-dark transition-colors"
                  />
                </div>
              </div>

              <div className="flex-1 p-4 md:p-6 overflow-y-auto no-scrollbar">
                <div className="flex flex-col gap-2 max-w-4xl mx-auto">
                  <AnimatePresence>
                    {examPapers.map((paper) => (
                      <motion.div
                        key={paper.id}
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="group flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-xl border border-geist-border-light dark:border-geist-border-dark bg-geist-bg-light dark:bg-geist-bg-dark hover:border-geist-text-primary-light dark:hover:border-geist-text-primary-dark transition-all shadow-sm hover:shadow-md gap-3"
                      >
                        <div className="flex flex-col gap-1 min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <h3 className="text-sm font-medium text-geist-text-primary-light dark:text-geist-text-primary-dark truncate" title={paper.name}>
                              {paper.name}
                            </h3>
                            {paper.year && (
                              <span className="text-[10px] font-medium px-1.5 py-0.5 bg-geist-surface-light dark:bg-geist-surface-dark text-geist-text-secondary-light dark:text-geist-text-secondary-dark rounded border border-geist-border-light dark:border-geist-border-dark whitespace-nowrap shrink-0">
                                {paper.year}
                              </span>
                            )}
                          </div>
                        </div>
                        
                        <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
                          <div className="flex items-center gap-2">
                            {activeExam?.duration_minutes && (
                              <span className="text-xs font-medium px-2 py-0.5 rounded-md bg-geist-surface-light dark:bg-geist-surface-dark text-geist-text-secondary-light dark:text-geist-text-secondary-dark border border-geist-border-light dark:border-geist-border-dark">
                                {activeExam.duration_minutes}m
                              </span>
                            )}
                          </div>
                          <button
                            onClick={() => startMockTest(paper.id)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-geist-text-primary-light dark:bg-geist-text-primary-dark text-geist-bg-light dark:text-geist-bg-dark text-xs font-medium hover:opacity-90 transition-opacity whitespace-nowrap"
                          >
                            <Play className="w-3.5 h-3.5" />
                            Start
                          </button>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
                {examPapers.length === 0 && (
                  <div className="text-center py-16">
                    <p className="text-geist-text-secondary-light dark:text-geist-text-secondary-dark text-sm">No papers found.</p>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="hidden md:flex flex-1 items-center justify-center p-8">
              <div className="text-center max-w-sm">
                <div className="w-16 h-16 bg-geist-surface-light dark:bg-geist-surface-dark rounded-2xl flex items-center justify-center mx-auto mb-4 border border-geist-border-light dark:border-geist-border-dark">
                  <Network className="w-8 h-8 text-geist-text-secondary-light dark:text-geist-text-secondary-dark" />
                </div>
                <h3 className="text-lg font-medium text-geist-text-primary-light dark:text-geist-text-primary-dark mb-2">Select an Exam</h3>
                <p className="text-sm text-geist-text-secondary-light dark:text-geist-text-secondary-dark">
                  Choose an exam from the left panel to view its available papers and start a mock test.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
