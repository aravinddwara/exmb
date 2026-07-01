import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/useAuthStore';
import { useUserStore } from '../../store/useUserStore';
import { MarkdownRenderer } from '../../components/MarkdownRenderer';
import { AlertCircle, Search, Trash2, Folder, Filter, X } from 'lucide-react';
import { CustomDropdown } from '../../components/CustomDropdown';
import { QuestionReviewModal } from '../../components/QuestionReviewModal';

export const MistakesPage: React.FC = () => {
  const { user } = useAuthStore();
  const { questions, academicTree } = useUserStore();
  const [mistakes, setMistakes] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  const [selectedClass, setSelectedClass] = useState<string>('All');
  const [selectedSubject, setSelectedSubject] = useState<string>('All');
  const [selectedChapter, setSelectedChapter] = useState<string>('All');

  const [reviewQuestions, setReviewQuestions] = useState<any[]>([]);
  const [reviewIndex, setReviewIndex] = useState(-1);
  const [isMobileFiltersOpen, setIsMobileFiltersOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 30;

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedClass, selectedSubject, selectedChapter]);

  useEffect(() => {
    if (user) {
      const fetchMistakes = async () => {
        let allData: any[] = [];
        let from = 0;
        let to = 999;
        let hasMore = true;
        while (hasMore) {
          const { data } = await supabase.from('mistakes').select('*').eq('user_id', user.id).range(from, to);
          if (data && data.length > 0) {
            allData = [...allData, ...data];
            if (data.length < 1000) hasMore = false;
            else { from += 1000; to += 1000; }
          } else {
            hasMore = false;
          }
        }
        setMistakes(allData);
      };
      fetchMistakes();
    }
  }, [user]);

  const removeMistake = async (id: string) => {
    if (!user) return;
    await supabase.from('mistakes').delete().eq('user_id', user.id).eq('question_id', id);
    setMistakes(prev => prev.filter(m => m.question_id !== id));
  };

  const getAcademicPath = (chapterId: string) => {
    for (const cls of academicTree) {
       for (const sub of (cls.children || [])) {
          for (const chap of (sub.children || [])) {
             if (chap.id === chapterId) {
                return { className: cls.name, subjectName: sub.name, chapterName: chap.name, classId: cls.id, subjectId: sub.id, chapterId: chap.id };
             }
          }
       }
    }
    return { className: 'Unknown', subjectName: 'Unknown', chapterName: 'Unknown', classId: '', subjectId: '', chapterId: '' };
  };

  const mistakeMap = new Map(mistakes.map(m => [m.question_id, m.mistake_count]));

  const mistakeQuestions = useMemo(() => {
    return questions
      .filter(q => mistakeMap.has(q.id))
      .map(q => ({ ...q, path: getAcademicPath(q.chapter_id) }));
  }, [questions, mistakes, academicTree]);

  const classes = useMemo(() => Array.from(new Set(mistakeQuestions.map(q => q.path.className).filter(c => c !== 'Unknown'))), [mistakeQuestions]);
  const subjects = useMemo(() => Array.from(new Set(mistakeQuestions.filter(q => selectedClass === 'All' || q.path.className === selectedClass).map(q => q.path.subjectName).filter(s => s !== 'Unknown'))), [mistakeQuestions, selectedClass]);
  const chapters = useMemo(() => Array.from(new Set(mistakeQuestions.filter(q => (selectedClass === 'All' || q.path.className === selectedClass) && (selectedSubject === 'All' || q.path.subjectName === selectedSubject)).map(q => q.path.chapterName).filter(c => c !== 'Unknown'))), [mistakeQuestions, selectedClass, selectedSubject]);

  const displayQuestions = mistakeQuestions
    .filter(q => q.text?.toLowerCase().includes(searchTerm.toLowerCase()))
    .filter(q => selectedClass === 'All' || q.path.className === selectedClass)
    .filter(q => selectedSubject === 'All' || q.path.subjectName === selectedSubject)
    .filter(q => selectedChapter === 'All' || q.path.chapterName === selectedChapter)
    .sort((a, b) => (mistakeMap.get(b.id) || 0) - (mistakeMap.get(a.id) || 0));

  const totalPages = Math.ceil(displayQuestions.length / ITEMS_PER_PAGE);
  const paginatedQuestions = displayQuestions.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  const groupedQuestions = paginatedQuestions.reduce((acc, q) => {
    const key = `${q.path.className} > ${q.path.subjectName}`;
    if (!acc[key]) acc[key] = [];
    acc[key].push(q);
    return acc;
  }, {} as Record<string, typeof displayQuestions>);

  return (
    <div className="flex flex-col min-h-full w-full font-sans bg-geist-bg-light dark:bg-geist-bg-dark overflow-hidden">
      {/* Header */}
      <div className="px-4 md:px-8 py-4 border-b border-geist-border-light dark:border-geist-border-dark shrink-0 z-10 sticky top-0 bg-geist-bg-light/80 dark:bg-geist-bg-dark/80 backdrop-blur-md">
        <div className="flex items-center gap-1.5 text-geist-text-secondary-light dark:text-geist-text-secondary-dark mb-1">
          <button onClick={() => window.history.back()} className="text-xs hover:text-geist-text-primary-light dark:hover:text-geist-text-primary-dark transition-colors">Dashboard</button>
          <span className="text-xs text-geist-text-secondary-light dark:text-geist-text-secondary-dark">/</span>
          <span className="text-xs font-medium text-geist-text-primary-light dark:text-geist-text-primary-dark">
            Mistake Book
          </span>
        </div>
        <h1 className="text-xl md:text-2xl font-semibold text-geist-text-primary-light dark:text-geist-text-primary-dark leading-tight">
          Mistake Book
        </h1>
      </div>

      <div className="flex-1 overflow-y-auto p-4 md:p-8 max-w-7xl mx-auto w-full">
        <div className="mb-6">
          <p className="text-geist-text-secondary-light dark:text-geist-text-secondary-dark text-sm">
            Review questions you got wrong to improve your performance.
          </p>
        </div>

        <div className="bg-geist-surface-light dark:bg-geist-surface-dark border border-geist-border-light dark:border-geist-border-dark p-2 rounded-xl mb-6 flex flex-col md:flex-row md:items-center gap-3">
        <div className="flex items-center flex-1 w-full pl-2">
          <Search className="w-5 h-5 text-geist-text-secondary-light dark:text-geist-text-secondary-dark shrink-0" />
          <input 
            type="text" 
            placeholder="Search mistakes..." 
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="flex-1 bg-transparent border-none outline-none text-sm placeholder-geist-text-secondary-light text-geist-text-primary-light dark:text-geist-text-primary-dark ml-2 min-w-0"
          />
          <button 
            className="md:hidden p-2 text-geist-text-secondary-light dark:text-geist-text-secondary-dark hover:bg-geist-surface-light dark:hover:bg-geist-surface-dark rounded-md transition-colors"
            onClick={() => setIsMobileFiltersOpen(true)}
          >
            <Filter className="w-5 h-5" />
          </button>
        </div>
        <div className="hidden md:flex items-center gap-2 border-l border-geist-border-light dark:border-geist-border-dark pl-3">
          <Filter className="w-4 h-4 text-geist-text-secondary-light dark:text-geist-text-secondary-dark shrink-0" />
          <CustomDropdown 
             className="w-[110px] shrink-0"
             value={selectedClass}
             onChange={val => { setSelectedClass(val); setSelectedSubject('All'); setSelectedChapter('All'); }}
             options={classes}
             placeholder="All Classes"
          />
          <CustomDropdown 
             className="w-[110px] shrink-0"
             value={selectedSubject}
             onChange={val => { setSelectedSubject(val); setSelectedChapter('All'); }}
             options={subjects}
             placeholder="All Subjects"
          />
          <CustomDropdown 
             className="w-[110px] shrink-0"
             value={selectedChapter}
             onChange={val => setSelectedChapter(val)}
             options={chapters}
             placeholder="All Chapters"
          />
        </div>
      </div>

      <div className="grid gap-8">
        {Object.keys(groupedQuestions).length === 0 ? (
          <div className="text-center py-20 text-geist-text-secondary-light dark:text-geist-text-secondary-dark text-sm">
            No mistakes found.
          </div>
        ) : (
          Object.keys(groupedQuestions).map(groupKey => (
            <div key={groupKey} className="space-y-4">
              <div className="flex items-center gap-2 text-geist-text-secondary-light dark:text-geist-text-secondary-dark border-b border-geist-border-light dark:border-geist-border-dark pb-2 mb-4">
                <Folder className="w-4 h-4" />
                <h2 className="text-sm font-semibold tracking-wide uppercase">{groupKey}</h2>
              </div>
              <div className="grid gap-4">
                {groupedQuestions[groupKey].map((q, qIndex) => (
                  <div 
                    key={q.id} 
                    onClick={() => { setReviewQuestions(groupedQuestions[groupKey]); setReviewIndex(qIndex); }}
                    className="bg-geist-bg-light dark:bg-geist-bg-dark border border-geist-border-light dark:border-geist-border-dark p-4 rounded-xl shadow-sm relative pr-12 cursor-pointer hover:border-blue-500/30 transition-colors"
                  >
                     <button 
                        onClick={(e) => { e.stopPropagation(); removeMistake(q.id); }}
                        className="absolute top-4 right-4 text-geist-text-secondary-light hover:text-geist-error-light transition-colors"
                        title="Remove from Mistake Book"
                     >
                        <Trash2 className="w-5 h-5" />
                     </button>
                     <div className="mb-2 flex items-center flex-wrap gap-2">
                        <span className="text-[10px] font-medium bg-geist-surface-light dark:bg-geist-surface-dark px-1.5 py-0.5 rounded border border-geist-border-light dark:border-geist-border-dark uppercase tracking-wider text-geist-text-secondary-light">
                           {q.type}
                        </span>
                        <span className="text-[10px] font-medium bg-geist-error-light/10 text-geist-error-light px-1.5 py-0.5 rounded border border-geist-error-light/20 flex items-center gap-1">
                           <AlertCircle className="w-3 h-3" />
                           {mistakeMap.get(q.id)} mistakes
                        </span>
                        <span className="text-[10px] font-medium text-geist-text-secondary-light bg-geist-surface-light dark:bg-geist-surface-dark px-1.5 py-0.5 rounded border border-geist-border-light dark:border-geist-border-dark">
                          {q.path.chapterName}
                        </span>
                     </div>
                     <MarkdownRenderer content={q.text || ''} className="text-sm line-clamp-3" />
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
      
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-8 p-4 bg-geist-surface-light dark:bg-geist-surface-dark border border-geist-border-light dark:border-geist-border-dark rounded-xl">
           <span className="text-xs font-medium text-geist-text-secondary-light dark:text-geist-text-secondary-dark">
             Showing {Math.min((currentPage - 1) * ITEMS_PER_PAGE + 1, displayQuestions.length)} to {Math.min(currentPage * ITEMS_PER_PAGE, displayQuestions.length)} of {displayQuestions.length} mistakes
           </span>
           <div className="flex items-center gap-1">
             <button
               onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
               disabled={currentPage === 1}
               className="px-3 py-1.5 rounded-md text-xs font-medium bg-geist-bg-light dark:bg-geist-bg-dark border border-geist-border-light dark:border-geist-border-dark disabled:opacity-50 hover:bg-geist-border-light dark:hover:bg-geist-border-dark transition-colors text-geist-text-primary-light dark:text-geist-text-primary-dark"
             >
               Prev
             </button>
             <span className="px-3 text-xs font-medium text-geist-text-primary-light dark:text-geist-text-primary-dark">Page {currentPage} of {totalPages}</span>
             <button
               onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
               disabled={currentPage === totalPages}
               className="px-3 py-1.5 rounded-md text-xs font-medium bg-geist-bg-light dark:bg-geist-bg-dark border border-geist-border-light dark:border-geist-border-dark disabled:opacity-50 hover:bg-geist-border-light dark:hover:bg-geist-border-dark transition-colors text-geist-text-primary-light dark:text-geist-text-primary-dark"
             >
               Next
             </button>
           </div>
        </div>
      )}
      </div>

      {reviewIndex >= 0 && (
        <QuestionReviewModal 
          questions={reviewQuestions}
          initialIndex={reviewIndex}
          onClose={() => setReviewIndex(-1)}
          title="Review Mistakes"
        />
      )}

      {/* Mobile Filters Bottom Sheet */}
      {isMobileFiltersOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center md:hidden">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsMobileFiltersOpen(false)} />
          <div className="relative w-full bg-geist-bg-light dark:bg-geist-bg-dark rounded-t-2xl p-6 pb-10 flex flex-col gap-6 animate-in slide-in-from-bottom-full border-t border-geist-border-light dark:border-geist-border-dark shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-geist-text-primary-light dark:text-geist-text-primary-dark flex items-center gap-2">
                <Filter className="w-5 h-5" /> Filters
              </h3>
              <button onClick={() => setIsMobileFiltersOpen(false)} className="p-2 text-geist-text-secondary-light dark:text-geist-text-secondary-dark hover:bg-geist-surface-light dark:hover:bg-geist-surface-dark rounded-full transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-geist-text-secondary-light dark:text-geist-text-secondary-dark">Class</label>
                <CustomDropdown 
                   className="w-full"
                   value={selectedClass}
                   onChange={val => { setSelectedClass(val); setSelectedSubject('All'); setSelectedChapter('All'); }}
                   options={classes}
                   placeholder="All Classes"
                />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-geist-text-secondary-light dark:text-geist-text-secondary-dark">Subject</label>
                <CustomDropdown 
                   className="w-full"
                   value={selectedSubject}
                   onChange={val => { setSelectedSubject(val); setSelectedChapter('All'); }}
                   options={subjects}
                   placeholder="All Subjects"
                />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-geist-text-secondary-light dark:text-geist-text-secondary-dark">Chapter</label>
                <CustomDropdown 
                   className="w-full"
                   value={selectedChapter}
                   onChange={val => setSelectedChapter(val)}
                   options={chapters}
                   placeholder="All Chapters"
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
