import React, { useState } from 'react';
import { useAdminStore, ExamType } from '../../store/useAdminStore';
import { Plus, Edit2, Trash2, Check, Clock, BookOpen, GraduationCap, GripVertical } from 'lucide-react';
import { ValidatedInput } from '../../components/ValidatedInput';
import { v4 as uuidv4 } from 'uuid';
import { Dropdown } from '../../components/Dropdown';

export const ExamManager: React.FC = () => {
  const { exams, classes, subjects, addExam, updateExam, deleteExam, reorderExams } = useAdminStore();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [editType, setEditType] = useState<ExamType>('JEE_MAIN');
  const [editDuration, setEditDuration] = useState<number>(180);
  const [editClassIds, setEditClassIds] = useState<string[]>([]);
  const [editSubjectIds, setEditSubjectIds] = useState<string[]>([]);
  const [draggedExamIndex, setDraggedExamIndex] = useState<number | null>(null);

  const [showAddForm, setShowAddForm] = useState(false);
  const [newExam, setNewExam] = useState({
    name: '',
    type: '',
    class_ids: [] as string[],
    subject_ids: [] as string[],
    duration_minutes: 180
  });

  const sortedClasses = [...classes].sort((a, b) => (a.order_index || 0) - (b.order_index || 0));
  const sortedSubjects = [...subjects].sort((a, b) => (a.order_index || 0) - (b.order_index || 0));

  const handleCreateExam = () => {
    if (!newExam.name || !newExam.type) return;
    addExam({
      id: uuidv4(),
      name: newExam.name,
      type: newExam.type,
      class_ids: newExam.class_ids,
      subject_ids: newExam.subject_ids,
      duration_minutes: newExam.duration_minutes
    });
    setShowAddForm(false);
    setNewExam({ name: '', type: '', class_ids: [], subject_ids: [], duration_minutes: 180 });
  };

  const toggleSubject = (subjectId: string) => {
    setNewExam(prev => {
      const isSelected = prev.subject_ids.includes(subjectId);
      if (isSelected) {
        return { ...prev, subject_ids: prev.subject_ids.filter(id => id !== subjectId) };
      } else {
        return { ...prev, subject_ids: [...prev.subject_ids, subjectId] };
      }
    });
  };

  const toggleClass = (classId: string) => {
    setNewExam(prev => {
      const isSelected = prev.class_ids.includes(classId);
      if (isSelected) {
        return { ...prev, class_ids: prev.class_ids.filter(id => id !== classId) };
      } else {
        return { ...prev, class_ids: [...prev.class_ids, classId] };
      }
    });
  };

  const toggleEditSubject = (subjectId: string) => {
    setEditSubjectIds(prev => prev.includes(subjectId) ? prev.filter(id => id !== subjectId) : [...prev, subjectId]);
  };

  const toggleEditClass = (classId: string) => {
    setEditClassIds(prev => prev.includes(classId) ? prev.filter(id => id !== classId) : [...prev, classId]);
  };

  const handleUpdateExam = (id: string) => {
    if (!editValue || !editType) return;
    updateExam(id, { 
      name: editValue, 
      type: editType, 
      duration_minutes: editDuration,
      class_ids: editClassIds,
      subject_ids: editSubjectIds
    });
    setEditingId(null);
  };

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-6xl mx-auto w-full h-full flex flex-col font-sans">
      <div className="flex justify-between items-start mb-6">
        <div>
           <h1 className="text-2xl font-medium text-geist-text-primary-light dark:text-geist-text-primary-dark">Exam Manager</h1>
           <p className="text-geist-text-secondary-light dark:text-geist-text-secondary-dark font-light mt-1 text-sm">Manage target exams and their configurations.</p>
        </div>
        <button onClick={() => setShowAddForm(true)} className="flex items-center gap-1.5 bg-geist-text-primary-light dark:bg-geist-text-primary-dark text-geist-bg-light dark:text-geist-bg-dark px-3 py-1.5 rounded-md font-medium hover:opacity-80 transition-opacity text-xs min-h-[40px] sm:min-h-[32px]">
          <Plus className="w-3.5 h-3.5" /> Add Exam
        </button>
      </div>

      {showAddForm && (
        <div className="mb-6 p-4 bg-geist-surface-light dark:bg-geist-surface-dark border border-geist-border-light dark:border-geist-border-dark rounded-xl space-y-4">
          <h3 className="text-sm font-medium text-geist-text-primary-light dark:text-geist-text-primary-dark">Configure New Exam</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[11px] font-medium text-geist-text-secondary-light dark:text-geist-text-secondary-dark uppercase tracking-wider">Exam Name</label>
              <ValidatedInput type="text" placeholder="e.g. JEE Main 2024" value={newExam.name} onChange={val => setNewExam({...newExam, name: val})} className="bg-geist-bg-light dark:bg-geist-bg-dark border border-geist-border-light dark:border-geist-border-dark rounded-md px-3 py-1.5 text-xs outline-none w-full text-geist-text-primary-light dark:text-geist-text-primary-dark focus:border-geist-text-secondary-light" />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-medium text-geist-text-secondary-light dark:text-geist-text-secondary-dark uppercase tracking-wider">Exam Code</label>
              <ValidatedInput type="text" placeholder="e.g. JEE_MAIN" value={newExam.type} onChange={val => setNewExam({...newExam, type: val})} className="bg-geist-bg-light dark:bg-geist-bg-dark border border-geist-border-light dark:border-geist-border-dark rounded-md px-3 py-1.5 text-xs outline-none w-full text-geist-text-primary-light dark:text-geist-text-primary-dark focus:border-geist-text-secondary-light" />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-medium text-geist-text-secondary-light dark:text-geist-text-secondary-dark uppercase tracking-wider">Duration (Minutes)</label>
              <ValidatedInput type="number" placeholder="180" value={newExam.duration_minutes.toString()} onChange={val => setNewExam({...newExam, duration_minutes: parseInt(val) || 0})} className="bg-geist-bg-light dark:bg-geist-bg-dark border border-geist-border-light dark:border-geist-border-dark rounded-md px-3 py-1.5 text-xs outline-none w-full text-geist-text-primary-light dark:text-geist-text-primary-dark focus:border-geist-text-secondary-light" />
            </div>
            <div className="space-y-2 col-span-1 md:col-span-2">
               <label className="text-[11px] font-medium text-geist-text-secondary-light dark:text-geist-text-secondary-dark uppercase tracking-wider">Target Grades (Optional)</label>
               <div className="flex flex-wrap gap-2">
                 {sortedClasses.map(c => {
                   const isSelected = newExam.class_ids.includes(c.id);
                   return (
                     <button
                       key={c.id}
                       onClick={() => toggleClass(c.id)}
                       className={`px-3 py-1.5 rounded-md text-xs font-medium border transition-colors ${isSelected ? 'bg-geist-text-primary-light dark:bg-geist-text-primary-dark text-geist-bg-light dark:text-geist-bg-dark border-geist-text-primary-light dark:border-geist-text-primary-dark' : 'bg-geist-bg-light dark:bg-geist-bg-dark text-geist-text-secondary-light dark:text-geist-text-secondary-dark border-geist-border-light dark:border-geist-border-dark hover:border-geist-text-secondary-light'}`}
                     >
                       {c.name}
                     </button>
                   );
                 })}
               </div>
            </div>
          </div>

          <div className="space-y-2 pt-2">
             <label className="text-[11px] font-medium text-geist-text-secondary-light dark:text-geist-text-secondary-dark uppercase tracking-wider">Select Subjects</label>
             <div className="flex flex-wrap gap-2">
               {sortedSubjects
                 .filter(s => newExam.class_ids.length === 0 || newExam.class_ids.includes(s.class_id))
                 .map(subject => {
                 const isSelected = newExam.subject_ids.includes(subject.id);
                 return (
                   <button
                     key={subject.id}
                     onClick={() => toggleSubject(subject.id)}
                     className={`px-3 py-1.5 rounded-md text-xs font-medium border transition-colors ${isSelected ? 'bg-geist-text-primary-light dark:bg-geist-text-primary-dark text-geist-bg-light dark:text-geist-bg-dark border-geist-text-primary-light dark:border-geist-text-primary-dark' : 'bg-geist-bg-light dark:bg-geist-bg-dark text-geist-text-secondary-light dark:text-geist-text-secondary-dark border-geist-border-light dark:border-geist-border-dark hover:border-geist-text-secondary-light'}`}
                   >
                     {subject.name}
                   </button>
                 );
               })}
               {subjects.filter(s => newExam.class_ids.length === 0 || newExam.class_ids.includes(s.class_id)).length === 0 && (
                 <p className="text-xs text-geist-text-secondary-light dark:text-geist-text-secondary-dark italic">No subjects available.</p>
               )}
             </div>
          </div>

          <div className="flex gap-2 justify-end pt-2">
            <button onClick={() => setShowAddForm(false)} className="px-3 py-1.5 rounded-md text-xs font-medium text-geist-text-secondary-light dark:text-geist-text-secondary-dark hover:bg-geist-surface-light dark:hover:bg-geist-surface-dark transition-colors">Cancel</button>
            <button onClick={handleCreateExam} className="px-3 py-1.5 rounded-md text-xs font-medium bg-geist-text-primary-light dark:bg-geist-text-primary-dark text-geist-bg-light dark:text-geist-bg-dark hover:opacity-90">Save Exam</button>
          </div>
        </div>
      )}

      <div className="space-y-4">
        {exams.map((exam, index) => {
          const examClasses = classes.filter(c => exam.class_ids?.includes(c.id));
          return (
            <div 
              key={exam.id} 
              className={`border border-geist-border-light dark:border-geist-border-dark rounded-lg p-3 flex justify-between items-center group bg-geist-bg-light dark:bg-geist-bg-dark shadow-sm transition-opacity ${draggedExamIndex === index ? 'opacity-50' : ''}`}
              draggable
              onDragStart={(e) => {
                e.dataTransfer.effectAllowed = 'move';
                setDraggedExamIndex(index);
              }}
              onDragOver={(e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
              }}
              onDrop={(e) => {
                e.preventDefault();
                if (draggedExamIndex !== null && draggedExamIndex !== index) {
                  reorderExams(draggedExamIndex, index);
                }
                setDraggedExamIndex(null);
              }}
              onDragEnd={() => setDraggedExamIndex(null)}
            >
               {editingId === exam.id ? (
                 <div className="flex flex-col gap-3 flex-1">
                   <div className="flex items-center gap-3">
                     <input autoFocus value={editValue} onChange={(e) => setEditValue(e.target.value)} className="bg-geist-surface-light dark:bg-geist-surface-dark border border-geist-border-light dark:border-geist-border-dark p-1.5 text-xs rounded flex-1 focus:outline-none focus:border-geist-text-secondary-light text-geist-text-primary-light dark:text-geist-text-primary-dark" />
                     <input value={editType} onChange={(e) => setEditType(e.target.value)} placeholder="Code" className="bg-geist-surface-light dark:bg-geist-surface-dark border border-geist-border-light dark:border-geist-border-dark p-1.5 text-xs rounded focus:outline-none focus:border-geist-text-secondary-light text-geist-text-primary-light dark:text-geist-text-primary-dark w-24" />
                     <input type="number" value={editDuration} onChange={(e) => setEditDuration(parseInt(e.target.value) || 0)} placeholder="Mins" className="bg-geist-surface-light dark:bg-geist-surface-dark border border-geist-border-light dark:border-geist-border-dark p-1.5 text-xs rounded focus:outline-none focus:border-geist-text-secondary-light text-geist-text-primary-light dark:text-geist-text-primary-dark w-16" />
                     <button onClick={() => handleUpdateExam(exam.id)} className="p-1.5 text-geist-success hover:bg-geist-success/10 rounded min-h-[36px] min-w-[36px] sm:min-h-[28px] sm:min-w-[28px] flex items-center justify-center"><Check className="w-3.5 h-3.5" /></button>
                   </div>
                   <div className="flex flex-wrap gap-2">
                     <span className="text-[10px] text-geist-text-secondary-light dark:text-geist-text-secondary-dark uppercase flex items-center">Grades:</span>
                     {sortedClasses.map(c => (
                       <button
                         key={c.id}
                         onClick={() => toggleEditClass(c.id)}
                         className={`px-2 py-0.5 rounded text-[10px] font-medium border transition-colors ${editClassIds.includes(c.id) ? 'bg-geist-text-primary-light dark:bg-geist-text-primary-dark text-geist-bg-light dark:text-geist-bg-dark border-geist-text-primary-light dark:border-geist-text-primary-dark' : 'bg-transparent text-geist-text-secondary-light dark:text-geist-text-secondary-dark border-geist-border-light dark:border-geist-border-dark hover:border-geist-text-secondary-light'}`}
                       >
                         {c.name}
                       </button>
                     ))}
                   </div>
                   <div className="flex flex-col gap-2">
                     <div className="flex flex-wrap gap-2">
                       <span className="text-[10px] text-geist-text-secondary-light dark:text-geist-text-secondary-dark uppercase flex items-center">Available Subjects:</span>
                       {sortedSubjects
                         .filter(s => editClassIds.length === 0 || editClassIds.includes(s.class_id))
                         .filter(s => !editSubjectIds.includes(s.id))
                         .map(subject => (
                           <button
                             key={subject.id}
                             onClick={() => toggleEditSubject(subject.id)}
                             className="px-2 py-0.5 rounded text-[10px] font-medium border bg-transparent text-geist-text-secondary-light dark:text-geist-text-secondary-dark border-geist-border-light dark:border-geist-border-dark hover:border-geist-text-secondary-light"
                           >
                             + {subject.name}
                           </button>
                       ))}
                     </div>
                     <div className="flex flex-wrap gap-2 mt-1">
                       <span className="text-[10px] text-geist-text-secondary-light dark:text-geist-text-secondary-dark uppercase flex items-center" title="Drag to reorder subjects for exam paper question ordering">Selected Subjects (Drag to Reorder):</span>
                       {editSubjectIds.map((subId, idx) => {
                         const subject = subjects.find(s => s.id === subId);
                         if (!subject) return null;
                         return (
                           <button
                             key={subId}
                             draggable
                             onDragStart={(e) => {
                               e.dataTransfer.setData('text/plain', idx.toString());
                               e.dataTransfer.effectAllowed = 'move';
                             }}
                             onDragOver={(e) => e.preventDefault()}
                             onDrop={(e) => {
                               e.preventDefault();
                               const fromIdx = parseInt(e.dataTransfer.getData('text/plain'));
                               if (!isNaN(fromIdx) && fromIdx !== idx) {
                                 const newIds = [...editSubjectIds];
                                 const [movedId] = newIds.splice(fromIdx, 1);
                                 newIds.splice(idx, 0, movedId);
                                 setEditSubjectIds(newIds);
                               }
                             }}
                             onClick={() => toggleEditSubject(subId)}
                             className="px-2 py-0.5 rounded text-[10px] font-medium border cursor-grab active:cursor-grabbing bg-geist-text-primary-light dark:bg-geist-text-primary-dark text-geist-bg-light dark:text-geist-bg-dark border-geist-text-primary-light dark:border-geist-text-primary-dark group relative"
                           >
                             <span className="flex items-center gap-1">
                               <GripVertical className="w-2.5 h-2.5 opacity-50" /> {subject.name} <span className="opacity-0 group-hover:opacity-100 ml-1">×</span>
                             </span>
                           </button>
                         );
                       })}
                     </div>
                   </div>
                 </div>
               ) : (
                 <div className="flex items-center gap-3">
                   <div className="cursor-grab opacity-50 hover:opacity-100" onClick={e => e.stopPropagation()}>
                     <GripVertical className="w-4 h-4 text-geist-text-secondary-light dark:text-geist-text-secondary-dark" />
                   </div>
                   <div>
                     <div className="flex items-center gap-2">
                       <span className="font-semibold text-sm text-geist-text-primary-light dark:text-geist-text-primary-dark">{exam.name}</span>
                       <span className="px-1.5 py-0.5 bg-geist-surface-light dark:bg-geist-surface-dark border border-geist-border-light dark:border-geist-border-dark text-[10px] rounded uppercase text-geist-text-secondary-light dark:text-geist-text-secondary-dark">{exam.type}</span>
                     </div>
                     <div className="flex items-center gap-3 mt-1.5 text-[10px] text-geist-text-secondary-light dark:text-geist-text-secondary-dark font-medium">
                        {exam.duration_minutes && <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {exam.duration_minutes} min</span>}
                        {examClasses.length > 0 && <span className="flex items-center gap-1"><GraduationCap className="w-3 h-3" /> {examClasses.map(c => c.name).join(', ')}</span>}
                        {exam.subject_ids && exam.subject_ids.length > 0 && <span className="flex items-center gap-1"><BookOpen className="w-3 h-3" /> {exam.subject_ids.length} Subjects</span>}
                     </div>
                   </div>
                 </div>
               )}
               
               {editingId !== exam.id && (
                 <div className="flex items-center gap-1 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                   <button onClick={() => {setEditingId(exam.id); setEditValue(exam.name); setEditType(exam.type); setEditDuration(exam.duration_minutes || 180); setEditClassIds(exam.class_ids || []); setEditSubjectIds(exam.subject_ids || []);}} className="p-1.5 hover:bg-geist-surface-light dark:hover:bg-geist-surface-dark rounded text-geist-text-secondary-light dark:text-geist-text-secondary-dark hover:text-geist-text-primary-light dark:hover:text-geist-text-primary-dark min-h-[36px] min-w-[36px] sm:min-h-[28px] sm:min-w-[28px] flex items-center justify-center"><Edit2 className="w-3.5 h-3.5" /></button>
                   <button onClick={() => deleteExam(exam.id)} className="p-1.5 hover:bg-geist-error-light/10 dark:hover:bg-geist-error-dark/10 text-geist-error-light dark:text-geist-error-dark rounded min-h-[36px] min-w-[36px] sm:min-h-[28px] sm:min-w-[28px] flex items-center justify-center"><Trash2 className="w-3.5 h-3.5" /></button>
                 </div>
               )}
            </div>
          );
        })}
        {exams.length === 0 && (
          <p className="text-center text-geist-text-secondary-light dark:text-geist-text-secondary-dark py-10 text-sm">No exams configured.</p>
        )}
      </div>
    </div>
  );
};
