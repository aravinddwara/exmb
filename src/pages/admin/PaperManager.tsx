import React, { useState } from 'react';
import { Layers, Plus, Filter, Calendar, Folder, Edit2, Trash2, Check, GripVertical } from 'lucide-react';
import { useAdminStore, PaperData } from '../../store/useAdminStore';
import { v4 as uuidv4 } from 'uuid';
import { Dropdown } from '../../components/Dropdown';
import { ValidatedInput } from '../../components/ValidatedInput';
import { Toast } from '../../components/Toast';

export const PaperManager: React.FC = () => {
  const { exams, papers, addPaper, deletePaper, updatePaper, questions, reorderPapers } = useAdminStore();
  
  const [showAddPaper, setShowAddPaper] = useState(false);
  const [newPaper, setNewPaper] = useState<Partial<PaperData>>({
    name: '', exam_id: '', year: new Date().getFullYear(), status: 'Published'
  });
  const [notification, setNotification] = useState<string | null>(null);
  const [draggedPaper, setDraggedPaper] = useState<{ index: number, examId: string } | null>(null);

  const handleCreatePaper = async () => {
    if (!newPaper.name || !newPaper.exam_id) return;
    await addPaper({
      id: uuidv4(),
      name: newPaper.name,
      exam_id: newPaper.exam_id,
      year: newPaper.year || null,
      status: newPaper.status || 'Draft',
    });
    setShowAddPaper(false);
    setNewPaper({ name: '', exam_id: '', year: new Date().getFullYear(), status: 'Published' });
    setNotification('Paper created successfully!');
  };

  const togglePaperStatus = async (id: string, currentStatus: string) => {
    await updatePaper(id, { status: currentStatus === 'Published' ? 'Draft' : 'Published' });
    setNotification(`Paper status updated to ${currentStatus === 'Published' ? 'Draft' : 'Published'}`);
  };

  const handleDeletePaper = async (id: string) => {
    await deletePaper(id);
    setNotification('Paper deleted successfully!');
  };

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-6xl mx-auto w-full h-full flex flex-col font-sans relative">
      {notification && <Toast message={notification} onClose={() => setNotification(null)} />}
      <div className="flex justify-between items-start mb-6">
        <div>
           <h1 className="text-2xl font-medium text-geist-text-primary-light dark:text-geist-text-primary-dark">Paper Manager</h1>
           <p className="text-geist-text-secondary-light dark:text-geist-text-secondary-dark font-light mt-1 text-sm">Manage PYQs and mock papers for each exam.</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowAddPaper(true)} className="flex items-center gap-1.5 bg-geist-text-primary-light dark:bg-geist-text-primary-dark text-geist-bg-light dark:text-geist-bg-dark px-3 py-1.5 rounded-md font-medium hover:opacity-80 transition-opacity text-xs min-h-[40px] sm:min-h-[32px]">
            <Plus className="w-3.5 h-3.5" /> Create Paper
          </button>
        </div>
      </div>

      {showAddPaper && (
        <div className="mb-6 p-4 bg-geist-surface-light dark:bg-geist-surface-dark border border-geist-border-light dark:border-geist-border-dark rounded-xl space-y-3">
          <h3 className="text-sm font-medium text-geist-text-primary-light dark:text-geist-text-primary-dark">Create New Paper</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            <ValidatedInput type="text" placeholder="Paper Name (e.g. JEE Main 2024 Shift 1)" value={newPaper.name} onChange={val => setNewPaper({...newPaper, name: val})} className="bg-geist-bg-light dark:bg-geist-bg-dark border border-geist-border-light dark:border-geist-border-dark rounded-md px-3 py-1.5 text-xs outline-none w-full text-geist-text-primary-light dark:text-geist-text-primary-dark focus:border-geist-text-secondary-light" />
            <Dropdown
              value={newPaper.exam_id || ''}
              onChange={val => setNewPaper({...newPaper, exam_id: val})}
              options={exams.map(e => ({value: e.id, label: e.name}))}
              placeholder="Select Target Exam"
            />
            <ValidatedInput type="number" placeholder="Year" value={newPaper.year?.toString() || ''} onChange={val => setNewPaper({...newPaper, year: parseInt(val)})} className="bg-geist-bg-light dark:bg-geist-bg-dark border border-geist-border-light dark:border-geist-border-dark rounded-md px-3 py-1.5 text-xs outline-none w-full text-geist-text-primary-light dark:text-geist-text-primary-dark focus:border-geist-text-secondary-light" />
          </div>
          <div className="flex gap-2 justify-end">
            <button onClick={() => setShowAddPaper(false)} className="px-3 py-1.5 rounded-md text-xs font-medium text-geist-text-secondary-light dark:text-geist-text-secondary-dark hover:bg-geist-surface-light dark:hover:bg-geist-surface-dark transition-colors">Cancel</button>
            <button onClick={handleCreatePaper} className="px-3 py-1.5 rounded-md text-xs font-medium bg-geist-text-primary-light dark:bg-geist-text-primary-dark text-geist-bg-light dark:text-geist-bg-dark hover:opacity-90">Create Paper</button>
          </div>
        </div>
      )}

      <div className="space-y-4">
        {exams.map(exam => {
          const examPapers = papers.filter(p => p.exam_id === exam.id);

          return (
            <div key={exam.id} className="bg-geist-bg-light dark:bg-geist-bg-dark border border-geist-border-light dark:border-geist-border-dark rounded-xl overflow-hidden shadow-sm">
               <div className="bg-geist-surface-light/50 dark:bg-geist-surface-dark/50 p-3 border-b border-geist-border-light dark:border-geist-border-dark flex justify-between items-center group">
                 <div className="flex items-center gap-2">
                    <Folder className="w-4 h-4 text-geist-text-secondary-light dark:text-geist-text-secondary-dark" />
                    <h2 className="text-sm font-semibold text-geist-text-primary-light dark:text-geist-text-primary-dark">{exam.name}</h2>
                 </div>
               </div>

               <div className="p-3 space-y-2">
                 {examPapers.length === 0 ? (
                   <p className="text-xs text-geist-text-secondary-light dark:text-geist-text-secondary-dark italic py-3 text-center">No papers for this exam. Click 'Create Paper' to add one.</p>
                 ) : (
                   examPapers.map((paper, index) => (
                      <div 
                        key={paper.id} 
                        className={`rounded-lg p-3 flex flex-col sm:flex-row sm:items-center justify-between hover:bg-geist-surface-light dark:hover:bg-geist-surface-dark transition-all bg-transparent gap-3 sm:gap-0 ${draggedPaper?.examId === exam.id && draggedPaper?.index === index ? 'opacity-50' : ''}`}
                        draggable
                        onDragStart={(e) => {
                          e.dataTransfer.effectAllowed = 'move';
                          setDraggedPaper({ index, examId: exam.id });
                        }}
                        onDragOver={(e) => {
                          e.preventDefault();
                          if (draggedPaper?.examId === exam.id) {
                            e.dataTransfer.dropEffect = 'move';
                          } else {
                            e.dataTransfer.dropEffect = 'none';
                          }
                        }}
                        onDrop={(e) => {
                          e.preventDefault();
                          if (draggedPaper && draggedPaper.examId === exam.id && draggedPaper.index !== index) {
                            reorderPapers(draggedPaper.index, index, exam.id);
                          }
                          setDraggedPaper(null);
                        }}
                        onDragEnd={() => setDraggedPaper(null)}
                      >
                         <div className="flex items-start sm:items-center gap-3">
                            <div className="cursor-grab opacity-50 hover:opacity-100 mt-1 sm:mt-0" onClick={e => e.stopPropagation()}>
                               <GripVertical className="w-4 h-4 text-geist-text-secondary-light dark:text-geist-text-secondary-dark" />
                            </div>
                            <div className={`w-8 h-8 rounded-md flex items-center justify-center shrink-0 ${paper.status === 'Published' ? 'bg-geist-success/10 text-geist-success' : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-500'}`}>
                               <Layers className="w-4 h-4" />
                            </div>
                            <div>
                               <h3 className="text-sm font-medium text-geist-text-primary-light dark:text-geist-text-primary-dark line-clamp-1">{paper.name}</h3>
                               <div className="flex items-center gap-2 mt-0.5 text-[10px] text-geist-text-secondary-light dark:text-geist-text-secondary-dark uppercase font-medium tracking-wide">
                                  {paper.year && <span className="px-1.5 py-0.5 rounded border border-geist-border-light dark:border-geist-border-dark bg-geist-surface-light dark:bg-geist-surface-dark">{paper.year}</span>}
                                  <span className="flex items-center gap-1"><Filter className="w-2.5 h-2.5" /> {questions.filter(q => q.paper_id === paper.id).length} Qs</span>
                               </div>
                            </div>
                         </div>
                         <div className="flex items-center gap-2 self-end sm:self-auto">
                            <button onClick={() => togglePaperStatus(paper.id, paper.status)} className={`text-[10px] font-medium px-2 py-1 rounded border transition-colors ${paper.status === 'Published' ? 'border-amber-200 text-amber-700 hover:bg-amber-50 dark:border-amber-900 dark:text-amber-500 dark:hover:bg-amber-900/30' : 'border-geist-success/30 text-geist-success hover:bg-geist-success/10'}`}>
                               To {paper.status === 'Published' ? 'Draft' : 'Published'}
                            </button>
                            <button onClick={() => handleDeletePaper(paper.id)} className="text-xs font-medium px-2 py-1 rounded hover:bg-geist-error-light/10 dark:hover:bg-geist-error-dark/10 text-geist-error-light dark:text-geist-error-dark transition-colors flex items-center justify-center min-h-[28px] min-w-[28px]">
                               <Trash2 className="w-3.5 h-3.5" />
                            </button>
                         </div>
                      </div>
                   ))
                 )}
               </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
