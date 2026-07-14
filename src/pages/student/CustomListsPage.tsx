import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/useAuthStore';
import { useUserStore } from '../../store/useUserStore';
import { MarkdownRenderer } from '../../components/MarkdownRenderer';
import { List, Plus, Trash2 } from 'lucide-react';
import { QuestionReviewModal } from '../../components/QuestionReviewModal';

export const CustomListsPage: React.FC = () => {
  const { user } = useAuthStore();
  const { questions, academicTree } = useUserStore();
  const [lists, setLists] = useState<any[]>([]);
  const [items, setItems] = useState<any[]>([]);
  const [activeListId, setActiveListId] = useState<string | null>(null);
  const [newListTitle, setNewListTitle] = useState('');

  const [reviewQuestions, setReviewQuestions] = useState<any[]>([]);
  const [reviewIndex, setReviewIndex] = useState(-1);
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 30;

  useEffect(() => {
    if (user) {
      fetchLists();
      fetchItems();
    }
  }, [user]);

  const fetchLists = async () => {
    const { data } = await supabase.from('custom_lists').select('*').eq('user_id', user?.id);
    if (data) {
       setLists(data);
       if (data.length > 0 && !activeListId) setActiveListId(data[0].id);
    }
  };

  const fetchItems = async () => {
    let allData: any[] = [];
    let from = 0;
    let to = 999;
    let hasMore = true;
    while (hasMore) {
      const { data } = await supabase.from('custom_list_items').select('*').range(from, to);
      if (data && data.length > 0) {
        allData = [...allData, ...data];
        if (data.length < 1000) hasMore = false;
        else { from += 1000; to += 1000; }
      } else {
        hasMore = false;
      }
    }
    setItems(allData);
  };

  const createList = async () => {
    if (!newListTitle.trim() || !user) return;
    const { data } = await supabase.from('custom_lists').insert({ user_id: user.id, name: newListTitle }).select();
    if (data && data[0]) {
       setLists([...lists, data[0]]);
       setActiveListId(data[0].id);
       setNewListTitle('');
    }
  };

  const deleteList = async (id: string) => {
    if (!user) return;
    await supabase.from('custom_lists').delete().eq('id', id);
    setLists(lists.filter(l => l.id !== id));
    if (activeListId === id) setActiveListId(lists[0]?.id || null);
  };

  const removeItem = async (id: string) => {
    await supabase.from('custom_list_items').delete().eq('id', id);
    setItems(items.filter(i => i.id !== id));
  };

  const getAcademicPath = (chapterId: string) => {
    for (const cls of academicTree) {
       for (const sub of (cls.children || [])) {
          for (const chap of (sub.children || [])) {
             if (chap.id === chapterId) {
                return { className: cls.name, subjectName: sub.name, chapterName: chap.name };
             }
          }
       }
    }
    return { className: 'Unknown', subjectName: 'Unknown', chapterName: 'Unknown' };
  };

  useEffect(() => {
    setCurrentPage(1);
  }, [activeListId]);

  const activeItems = items.filter(i => i.list_id === activeListId);
  const displayQuestions = activeItems.map(i => {
     const q = questions.find(q => q.id === i.question_id);
     if (!q) return null;
     const path = getAcademicPath(q.chapter_id);
     return { ...q, itemId: i.id, path };
  }).filter(Boolean);

  const totalPages = Math.ceil(displayQuestions.length / ITEMS_PER_PAGE);
  const paginatedQuestions = displayQuestions.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  return (
    <div className="flex flex-col min-h-full w-full font-sans bg-geist-bg-light dark:bg-geist-bg-dark overflow-hidden">
      {/* Header */}
      <div className="px-4 md:px-8 py-4 border-b border-geist-border-light dark:border-geist-border-dark shrink-0 z-10 sticky top-0 bg-geist-bg-light/80 dark:bg-geist-bg-dark/80 backdrop-blur-md">
        <div className="flex items-center gap-1.5 text-geist-text-secondary-light dark:text-geist-text-secondary-dark mb-1">
          <button onClick={() => window.history.back()} className="text-xs hover:text-geist-text-primary-light dark:hover:text-geist-text-primary-dark transition-colors">Dashboard</button>
          <span className="text-xs text-geist-text-secondary-light dark:text-geist-text-secondary-dark">/</span>
          <span className="text-xs font-medium text-geist-text-primary-light dark:text-geist-text-primary-dark">
            Custom Lists
          </span>
        </div>
        <h1 className="text-xl md:text-2xl font-semibold text-geist-text-primary-light dark:text-geist-text-primary-dark leading-tight">
          Custom Lists
        </h1>
      </div>

      <div className="flex-1 overflow-y-auto p-4 md:p-8 max-w-7xl mx-auto w-full">
        <div className="mb-6">
          <p className="text-geist-text-secondary-light dark:text-geist-text-secondary-dark text-sm">
            Organize questions into your own custom collections.
          </p>
        </div>

        <div className="flex flex-col lg:flex-row gap-6">
         {/* Sidebar for Lists */}
         <div className="w-full lg:w-64 flex flex-col gap-4">
            <div className="flex items-center gap-2">
               <input 
                  type="text" 
                  value={newListTitle} 
                  onChange={e => setNewListTitle(e.target.value)} 
                  placeholder="New list name" 
                  className="flex-1 bg-geist-surface-light dark:bg-geist-surface-dark border border-geist-border-light dark:border-geist-border-dark p-2 rounded text-sm focus:outline-none focus:border-geist-text-secondary-light text-geist-text-primary-light dark:text-geist-text-primary-dark"
                  onKeyDown={e => e.key === 'Enter' && createList()}
               />
               <button onClick={createList} className="p-2 bg-geist-text-primary-light dark:bg-geist-text-primary-dark text-geist-bg-light dark:text-geist-bg-dark rounded hover:opacity-80 transition-opacity">
                  <Plus className="w-4 h-4" />
               </button>
            </div>
            
            <div className="flex flex-col gap-2">
               {lists.map(list => (
                  <div key={list.id} className={`group flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors ${activeListId === list.id ? 'bg-geist-surface-light dark:bg-geist-surface-dark border-geist-border-light dark:border-geist-border-dark font-medium' : 'border-transparent text-geist-text-secondary-light hover:bg-geist-surface-light/50 dark:hover:bg-geist-surface-dark/50'}`} onClick={() => setActiveListId(list.id)}>
                     <div className="flex items-center gap-2">
                        <List className="w-4 h-4 shrink-0" />
                        <span className="text-sm truncate w-32">{list.name}</span>
                     </div>
                     <button onClick={(e) => { e.stopPropagation(); deleteList(list.id); }} className="text-geist-text-secondary-light hover:text-geist-error-light opacity-100 lg:opacity-0 lg:group-hover:opacity-100 p-1 transition-opacity">
                        <Trash2 className="w-3.5 h-3.5" />
                     </button>
                  </div>
               ))}
               {lists.length === 0 && (
                  <div className="text-sm text-geist-text-secondary-light italic p-2">No lists created.</div>
               )}
            </div>
         </div>

         {/* Main Content */}
         <div className="flex-1">
            {activeListId ? (
               <div className="grid gap-4">
               {displayQuestions.length === 0 ? (
                 <div className="text-center py-20 bg-geist-surface-light/50 dark:bg-geist-surface-dark/50 rounded-xl border border-dashed border-geist-border-light dark:border-geist-border-dark text-geist-text-secondary-light dark:text-geist-text-secondary-dark text-sm">
                   This list is empty. Add questions during practice sessions.
                 </div>
               ) : (
                 <>
                   {paginatedQuestions.map((q: any, qIndex: number) => (
                     <div 
                       key={q.id} 
                       onClick={() => { setReviewQuestions(paginatedQuestions); setReviewIndex(qIndex); }}
                       className="bg-geist-bg-light dark:bg-geist-bg-dark border border-geist-border-light dark:border-geist-border-dark p-4 rounded-xl shadow-sm relative pr-12 cursor-pointer hover:border-blue-500/30 transition-colors"
                     >
                        <button 
                           onClick={(e) => { e.stopPropagation(); removeItem(q.itemId); }}
                           className="absolute top-4 right-4 text-geist-text-secondary-light hover:text-geist-error-light transition-colors"
                           title="Remove from list"
                        >
                           <Trash2 className="w-5 h-5" />
                        </button>
                        <div className="mb-2 flex items-center flex-wrap gap-2">
                           <span className="text-[10px] font-medium bg-geist-surface-light dark:bg-geist-surface-dark px-1.5 py-0.5 rounded border border-geist-border-light dark:border-geist-border-dark uppercase tracking-wider text-geist-text-secondary-light">
                              {q.type}
                           </span>
                           <span className="text-[10px] font-medium text-geist-text-secondary-light bg-geist-surface-light dark:bg-geist-surface-dark px-1.5 py-0.5 rounded border border-geist-border-light dark:border-geist-border-dark">
                             {q.path.className} • {q.path.subjectName} • {q.path.chapterName}
                           </span>
                        </div>
                        <MarkdownRenderer content={q.text || ''} className="text-sm line-clamp-3" />
                     </div>
                   ))}
                   
                   {totalPages > 1 && (
                     <div className="flex items-center justify-between mt-4 p-4 bg-geist-surface-light dark:bg-geist-surface-dark border border-geist-border-light dark:border-geist-border-dark rounded-xl">
                        <span className="text-xs font-medium text-geist-text-secondary-light dark:text-geist-text-secondary-dark">
                          Showing {Math.min((currentPage - 1) * ITEMS_PER_PAGE + 1, displayQuestions.length)} to {Math.min(currentPage * ITEMS_PER_PAGE, displayQuestions.length)} of {displayQuestions.length} questions
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
                 </>
               )}
             </div>
            ) : (
               <div className="text-center py-20 text-geist-text-secondary-light dark:text-geist-text-secondary-dark text-sm">
                  Select or create a list to view questions.
               </div>
            )}
         </div>
      </div>
      </div>

      {reviewIndex >= 0 && (
        <QuestionReviewModal 
          questions={reviewQuestions}
          initialIndex={reviewIndex}
          onClose={() => setReviewIndex(-1)}
          title="Review Custom List"
        />
      )}
    </div>
  );
};
