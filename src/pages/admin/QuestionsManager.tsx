import React, { useState, useEffect } from 'react';
import { Search, Plus, Edit2, Trash2, Eye, EyeOff, CheckCircle } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { useAdminStore } from '../../store/useAdminStore';
import { Dropdown } from '../../components/Dropdown';

export const QuestionsManager: React.FC = () => {
  const { questions, deleteQuestion, updateQuestion, chapters, subjects, classes, papers, fetchAllQuestions } = useAdminStore();
  const [selectedClass, setSelectedClass] = useState<string>('');
  const [selectedSubject, setSelectedSubject] = useState<string>('');
  const [selectedChapter, setSelectedChapter] = useState<string>('');
  const [selectedPaper, setSelectedPaper] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const location = useLocation();
  const [notification, setNotification] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 50;

  useEffect(() => {
    fetchAllQuestions();
  }, [fetchAllQuestions]);

  useEffect(() => {
    if (location.state && location.state.message) {
      setNotification(location.state.message);
      const timer = setTimeout(() => {
        setNotification(null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [location]);

  useEffect(() => {
    setCurrentPage(1);
  }, [selectedClass, selectedSubject, selectedChapter, selectedPaper, searchTerm]);

  const toggleStatus = async (id: string, currentStatus: string) => {
    await updateQuestion(id, { status: currentStatus === 'Published' ? 'Draft' : 'Published' });
    setNotification(`Question status updated to ${currentStatus === 'Published' ? 'Draft' : 'Published'}`);
  };

  const handleDeleteQuestion = async (id: string) => {
    await deleteQuestion(id);
    setNotification('Question deleted successfully!');
  };

  const filteredQuestions = questions.filter(q => {
    if (selectedPaper && q.paper_id !== selectedPaper) return false;
    
    if (selectedChapter && q.chapter_id !== selectedChapter) return false;

    const chapter = chapters.find(c => c.id === q.chapter_id);
    
    if (selectedSubject) {
      if (chapter && chapter.subject_id !== selectedSubject) return false;
    }
    
    if (selectedClass) {
      if (chapter) {
        const subject = subjects.find(s => s.id === chapter.subject_id);
        if (subject && subject.class_id !== selectedClass) return false;
      } else {
        return false; // Question has no chapter or chapter not found, so it can't match a class
      }
    }

    if (searchTerm && !q.text.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    return true;
  });

  const paginatedQuestions = filteredQuestions.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);
  const totalPages = Math.ceil(filteredQuestions.length / ITEMS_PER_PAGE);

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto w-full h-full flex flex-col font-sans relative">
      {notification && (
        <div className="absolute top-4 left-1/2 justify-center -translate-x-1/2 flex items-center gap-1.5 px-3 py-1.5 bg-geist-success/10 border border-geist-success text-geist-success rounded-md shadow-sm z-50 animate-in fade-in slide-in-from-top-4">
          <CheckCircle className="w-3.5 h-3.5" />
          <span className="text-xs font-medium">{notification}</span>
        </div>
      )}

      <div className="flex items-center justify-between mb-6">
        <div>
           <h1 className="text-2xl font-medium text-geist-text-primary-light dark:text-geist-text-primary-dark">Questions Manager</h1>
           <p className="text-geist-text-secondary-light dark:text-geist-text-secondary-dark font-light mt-1 text-sm">Central repository of all questions across subjects.</p>
        </div>
        <Link to="/admin/questions/new" className="flex items-center gap-1.5 bg-geist-text-primary-light dark:bg-geist-text-primary-dark text-geist-bg-light dark:text-geist-bg-dark px-3 py-1.5 rounded-md font-medium hover:opacity-80 transition-opacity text-xs min-h-[40px] sm:min-h-[32px]">
          <Plus className="w-3.5 h-3.5" /> Add Question
        </Link>
      </div>

      <div className="bg-geist-bg-light dark:bg-geist-bg-dark border border-geist-border-light dark:border-geist-border-dark rounded-xl overflow-hidden flex flex-col min-h-[500px] shadow-sm">
        
        {/* Toolbar */}
        <div className="p-3 border-b border-geist-border-light dark:border-geist-border-dark flex flex-wrap gap-3 bg-geist-surface-light/50 dark:bg-geist-surface-dark/50">
          <div className="relative flex-1 min-w-[200px] max-w-md">
             <Search className="w-3.5 h-3.5 text-geist-text-secondary-light dark:text-geist-text-secondary-dark absolute left-2.5 top-1/2 -translate-y-1/2" />
             <input 
               type="text" 
               placeholder="Search by ID or content..." 
               value={searchTerm}
               onChange={(e) => setSearchTerm(e.target.value)}
               className="w-full bg-geist-bg-light dark:bg-geist-bg-dark border border-geist-border-light dark:border-geist-border-dark rounded-md pl-8 pr-3 py-1.5 text-xs text-geist-text-primary-light dark:text-geist-text-primary-dark focus:outline-none focus:border-geist-text-secondary-light dark:focus:border-geist-text-secondary-dark"
             />
          </div>
          <div className="w-32 sm:w-40">
            <Dropdown
              value={selectedClass}
              onChange={(v) => { setSelectedClass(v); setSelectedSubject(''); setSelectedChapter(''); }}
              options={[{value: '', label: 'All Classes'}, ...classes.map(c => ({value: c.id, label: c.name}))]}
              placeholder="All Classes"
            />
          </div>
          <div className="w-32 sm:w-40">
            <Dropdown
              value={selectedSubject}
              onChange={(v) => { setSelectedSubject(v); setSelectedChapter(''); }}
              options={[{value: '', label: 'All Subjects'}, ...subjects.filter(s => !selectedClass || s.class_id === selectedClass).map(s => ({value: s.id, label: s.name}))]}
              placeholder="All Subjects"
            />
          </div>
          <div className="w-32 sm:w-40">
            <Dropdown
              value={selectedChapter}
              onChange={setSelectedChapter}
              options={[{value: '', label: 'All Chapters'}, ...chapters.filter(c => !selectedSubject || c.subject_id === selectedSubject).map(c => ({value: c.id, label: c.name}))]}
              placeholder="All Chapters"
            />
          </div>
          <div className="w-32 sm:w-40">
            <Dropdown
              value={selectedPaper}
              onChange={setSelectedPaper}
              options={[{value: '', label: 'All Papers'}, ...papers.map(p => ({value: p.id, label: p.name}))]}
              placeholder="All Papers"
            />
          </div>
        </div>

        {/* Table view */}
        <div className="flex-1 overflow-x-auto">
          <table className="w-full text-left text-xs text-geist-text-secondary-light dark:text-geist-text-secondary-dark">
            <thead className="bg-geist-surface-light dark:bg-geist-surface-dark uppercase border-b border-geist-border-light dark:border-geist-border-dark">
              <tr>
                <th scope="col" className="px-4 py-2 font-medium tracking-wider">ID</th>
                <th scope="col" className="px-4 py-2 font-medium tracking-wider">Content Preview</th>
                <th scope="col" className="px-4 py-2 font-medium tracking-wider">Chapter</th>
                <th scope="col" className="px-4 py-2 font-medium tracking-wider">Subject</th>
                <th scope="col" className="px-4 py-2 font-medium tracking-wider">Status</th>
                <th scope="col" className="px-4 py-2 font-medium tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginatedQuestions.map((q) => {
                const chapter = chapters.find(c => c.id === q.chapter_id);
                const subject = chapter ? subjects.find(s => s.id === chapter.subject_id) : null;
                return (
                <tr key={q.id} className={`border-b border-geist-border-light dark:border-geist-border-dark hover:bg-geist-surface-light dark:hover:bg-geist-surface-dark transition-colors ${q.status === 'Draft' ? 'opacity-60' : ''}`}>
                  <td className="px-4 py-3 font-mono text-[10px] text-geist-text-primary-light dark:text-geist-text-primary-dark" title={q.id}>{q.id.substring(0, 8)}...</td>
                  <td className="px-4 py-3 font-medium text-geist-text-primary-light dark:text-geist-text-primary-dark truncate max-w-[200px]" title={q.text.replace(/<[^>]*>?/gm, '')}>
                    {q.text.replace(/<[^>]*>?/gm, '').substring(0, 40) + (q.text.replace(/<[^>]*>?/gm, '').length > 40 ? '...' : '')}
                  </td>
                  <td className="px-4 py-3">{chapter ? chapter.name : 'Unknown'}</td>
                  <td className="px-4 py-3">{subject ? subject.name : 'Unknown'}</td>
                  <td className="px-4 py-3">
                    <span className={`px-1.5 py-0.5 rounded text-[10px] uppercase font-medium tracking-wide ${q.status === 'Published' ? 'bg-geist-success/10 text-geist-success' : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-500'}`}>
                      {q.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                       <button onClick={() => toggleStatus(q.id, q.status)} className="p-1 text-geist-text-secondary-light hover:text-amber-500 transition-colors rounded hover:bg-geist-surface-light dark:hover:bg-geist-surface-dark" title={q.status === 'Published' ? 'Hide (Draft)' : 'Publish'}>
                         {q.status === 'Published' ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                       </button>
                       <Link to={`/admin/questions/edit/${q.id}`} className="p-1 text-geist-text-secondary-light hover:text-blue-500 transition-colors rounded hover:bg-geist-surface-light dark:hover:bg-geist-surface-dark" title="Edit"><Edit2 className="w-3.5 h-3.5" /></Link>
                       <button onClick={() => handleDeleteQuestion(q.id)} className="p-1 text-geist-text-secondary-light hover:text-geist-error-light dark:hover:text-geist-error-dark transition-colors rounded hover:bg-geist-error-light/10 dark:hover:bg-geist-error-dark/10" title="Delete"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                  </td>
                </tr>
              )})}
              {filteredQuestions.length === 0 && (
                <tr>
                   <td colSpan={6} className="px-4 py-10 text-center text-geist-text-secondary-light dark:text-geist-text-secondary-dark text-sm">No questions found. Add one to get started.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        
        {/* Pagination mock */}
        <div className="p-3 border-t border-geist-border-light dark:border-geist-border-dark flex justify-between items-center text-xs font-medium text-geist-text-secondary-light dark:text-geist-text-secondary-dark bg-geist-surface-light/50 dark:bg-geist-surface-dark/50">
           <span>Showing {Math.min((currentPage - 1) * ITEMS_PER_PAGE + 1, filteredQuestions.length)} to {Math.min(currentPage * ITEMS_PER_PAGE, filteredQuestions.length)} of {filteredQuestions.length} entries</span>
           {totalPages > 1 && (
             <div className="flex items-center gap-1">
               <button
                 onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                 disabled={currentPage === 1}
                 className="px-2 py-1 rounded bg-geist-surface-light dark:bg-geist-surface-dark border border-geist-border-light dark:border-geist-border-dark disabled:opacity-50 hover:bg-geist-border-light dark:hover:bg-geist-border-dark transition-colors"
               >
                 Prev
               </button>
               <span className="px-2">Page {currentPage} of {totalPages}</span>
               <button
                 onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                 disabled={currentPage === totalPages}
                 className="px-2 py-1 rounded bg-geist-surface-light dark:bg-geist-surface-dark border border-geist-border-light dark:border-geist-border-dark disabled:opacity-50 hover:bg-geist-border-light dark:hover:bg-geist-border-dark transition-colors"
               >
                 Next
               </button>
             </div>
           )}
        </div>
      </div>
    </div>
  );
};
