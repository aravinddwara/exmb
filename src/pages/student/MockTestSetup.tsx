import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useUserStore } from '../../store/useUserStore';
import { ChevronRight, Award, Play } from 'lucide-react';
import { motion } from 'motion/react';

export const MockTestSetup: React.FC = () => {
  const { papers, exams } = useUserStore();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [selectedExam, setSelectedExam] = useState<string>('');

  useEffect(() => {
    const examIdParam = searchParams.get('examId');
    if (examIdParam) {
      setSelectedExam(examIdParam);
    }
  }, [searchParams]);

  
  const filteredPapers = papers.filter(p => (!selectedExam || p.exam_id === selectedExam));

  const startMockTest = (paper_id: string) => {
    localStorage.setItem('mocktest_config', JSON.stringify({ paper_id }));
    navigate('/mock-test/session');
  };

  return (
    <div className="flex flex-col min-h-full w-full font-sans bg-geist-bg-light dark:bg-geist-bg-dark overflow-hidden">
      {/* Header */}
      <div className="px-4 md:px-8 py-4 border-b border-geist-border-light dark:border-geist-border-dark shrink-0 z-10 sticky top-0 bg-geist-bg-light/80 dark:bg-geist-bg-dark/80 backdrop-blur-md">
        <div className="flex items-center gap-1.5 text-geist-text-secondary-light dark:text-geist-text-secondary-dark mb-1">
          <button onClick={() => navigate('/dashboard')} className="text-xs hover:text-geist-text-primary-light dark:hover:text-geist-text-primary-dark transition-colors">Dashboard</button>
          <span className="text-xs text-geist-text-secondary-light dark:text-geist-text-secondary-dark">/</span>
          <span className="text-xs font-medium text-geist-text-primary-light dark:text-geist-text-primary-dark">
            Mock Tests
          </span>
        </div>
        <h1 className="text-xl md:text-2xl font-semibold text-geist-text-primary-light dark:text-geist-text-primary-dark leading-tight">
          Mock Tests
        </h1>
      </div>

      <div className="flex-1 overflow-y-auto p-4 md:p-8 max-w-7xl mx-auto w-full">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <p className="text-geist-text-secondary-light dark:text-geist-text-secondary-dark text-sm">
              Select a paper to start your test under exam conditions.
            </p>
          </div>
          
          <div>
            <select 
              value={selectedExam} 
              onChange={e => setSelectedExam(e.target.value)}
              className="w-full sm:w-auto bg-geist-surface-light dark:bg-geist-surface-dark border border-geist-border-light dark:border-geist-border-dark rounded-md px-3 py-1.5 text-xs text-geist-text-primary-light dark:text-geist-text-primary-dark outline-none focus:border-geist-text-secondary-light dark:focus:border-geist-text-secondary-dark transition-colors"
            >
              <option value="">All Exams</option>
              {exams.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
            </select>
          </div>
        </div>

      {filteredPapers.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-geist-border-light dark:border-geist-border-dark rounded-xl">
          <p className="text-geist-text-secondary-light dark:text-geist-text-secondary-dark text-sm">No mock tests available matching your selection.</p>
        </div>
      ) : (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
        >
          {filteredPapers.map(paper => {
            const exam = exams.find(e => e.id === paper.exam_id);

            return (
              <motion.div 
                whileHover={{ y: -2 }}
                key={paper.id} 
                className="bg-geist-bg-light dark:bg-geist-bg-dark border border-geist-border-light dark:border-geist-border-dark rounded-xl p-5 flex flex-col hover:border-geist-text-secondary-light dark:hover:border-geist-text-secondary-dark transition-all group shadow-sm hover:shadow-md"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="w-8 h-8 bg-geist-success/10 text-geist-success rounded-md flex items-center justify-center">
                    <Award className="w-4 h-4" />
                  </div>
                  {paper.year && (
                    <span className="text-[10px] font-medium px-1.5 py-0.5 bg-geist-surface-light dark:bg-geist-surface-dark text-geist-text-secondary-light dark:text-geist-text-secondary-dark rounded border border-geist-border-light dark:border-geist-border-dark">
                      {paper.year}
                    </span>
                  )}
                </div>
                
                <h3 className="text-[15px] font-medium text-geist-text-primary-light dark:text-geist-text-primary-dark mb-1 line-clamp-2 leading-tight" title={paper.name}>{paper.name}</h3>
                <p className="text-xs text-geist-text-secondary-light dark:text-geist-text-secondary-dark mb-4">{exam?.name}</p>
                
                <div className="mt-auto pt-4 border-t border-geist-border-light dark:border-geist-border-dark flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="text-[10px] uppercase tracking-wider text-geist-text-secondary-light dark:text-geist-text-secondary-dark mb-0.5">Duration</span>
                    <span className="text-xs font-medium text-geist-text-primary-light dark:text-geist-text-primary-dark">{exam?.duration_minutes || 180} mins</span>
                  </div>
                  
                  <button 
                    onClick={() => startMockTest(paper.id)}
                    className="flex items-center gap-1.5 text-xs font-medium bg-geist-text-primary-light dark:bg-geist-text-primary-dark text-geist-bg-light dark:text-geist-bg-dark px-3 py-1.5 rounded-md hover:opacity-90 transition-opacity min-h-[32px]"
                  >
                    Start
                    <Play className="w-3 h-3" />
                  </button>
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      )}
      </div>
    </div>
  );
};
