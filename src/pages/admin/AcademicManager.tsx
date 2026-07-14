import React, { useState } from 'react';
import { useAdminStore } from '../../store/useAdminStore';
import { Plus, Edit2, Trash2, Folder, ChevronDown, ChevronRight, GripVertical } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { ValidatedInput } from '../../components/ValidatedInput';

export const AcademicManager: React.FC = () => {
  const { classes, subjects, chapters, topics, addClass, updateClass, deleteClass, addSubject, updateSubject, deleteSubject, addChapter, updateChapter, deleteChapter, addTopic, updateTopic, deleteTopic, reorderClasses, reorderSubjects, reorderChapters, reorderTopics } = useAdminStore();

  const [expandedClasses, setExpandedClasses] = useState<Record<string, boolean>>({});
  const [expandedSubjects, setExpandedSubjects] = useState<Record<string, boolean>>({});
  const [expandedChapters, setExpandedChapters] = useState<Record<string, boolean>>({});

  const [draggedClassIndex, setDraggedClassIndex] = useState<number | null>(null);
  const [draggedSubjectIndex, setDraggedSubjectIndex] = useState<{index: number, classId: string} | null>(null);
  const [draggedChapterIndex, setDraggedChapterIndex] = useState<{index: number, subjectId: string} | null>(null);
  const [draggedTopicIndex, setDraggedTopicIndex] = useState<{index: number, chapterId: string} | null>(null);

  const toggleClass = (id: string) => setExpandedClasses(prev => ({...prev, [id]: !prev[id]}));
  const toggleSubject = (id: string) => setExpandedSubjects(prev => ({...prev, [id]: !prev[id]}));
  const toggleChapter = (id: string) => setExpandedChapters(prev => ({...prev, [id]: !prev[id]}));

  const [promptModal, setPromptModal] = useState<{
    isOpen: boolean;
    title: string;
    value: string;
    onSave: (val: string) => void;
  }>({ isOpen: false, title: '', value: '', onSave: () => {} });

  const [deleteConfirm, setDeleteConfirm] = useState<{id: string, type: 'class'|'subject'|'chapter'|'topic'} | null>(null);

  const openPrompt = (title: string, initialValue: string, onSave: (val: string) => void) => {
    setPromptModal({ isOpen: true, title, value: initialValue, onSave });
  };

  const handleAddClass = () => {
    openPrompt("Enter Class/Grade Name", "", (name) => {
      if (name.trim()) addClass({ id: uuidv4(), name: name.trim() });
    });
  };

  const handleAddSubject = (classId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    openPrompt("Enter Subject Name", "", (name) => {
      if (name.trim()) {
        addSubject({ id: uuidv4(), name: name.trim(), class_id: classId });
        setExpandedClasses(prev => ({...prev, [classId]: true}));
      }
    });
  };

  const handleAddChapter = (subjectId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    openPrompt("Enter Chapter Name", "", (name) => {
      if (name.trim()) {
        addChapter({ id: uuidv4(), name: name.trim(), subject_id: subjectId });
        setExpandedSubjects(prev => ({...prev, [subjectId]: true}));
      }
    });
  };

  const handleAddTopic = (chapterId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    openPrompt("Enter Topic Name", "", (name) => {
      if (name.trim()) {
        addTopic({ id: uuidv4(), name: name.trim(), chapter_id: chapterId });
        setExpandedChapters(prev => ({...prev, [chapterId]: true}));
      }
    });
  };

  const startEdit = (id: string, name: string, type: 'class' | 'subject' | 'chapter' | 'topic', e: React.MouseEvent) => {
    e.stopPropagation();
    openPrompt(`Edit ${type} name`, name, (newName) => {
      if (newName.trim() && newName.trim() !== name) {
        if (type === 'class') updateClass(id, newName.trim());
        else if (type === 'subject') updateSubject(id, newName.trim());
        else if (type === 'chapter') updateChapter(id, newName.trim());
        else updateTopic(id, newName.trim());
      }
    });
  };

  const handleDelete = (id: string, type: 'class' | 'subject' | 'chapter' | 'topic', e: React.MouseEvent) => {
    e.stopPropagation();
    setDeleteConfirm({ id, type });
  };

  const confirmDelete = () => {
    if (!deleteConfirm) return;
    if (deleteConfirm.type === 'class') deleteClass(deleteConfirm.id);
    else if (deleteConfirm.type === 'subject') deleteSubject(deleteConfirm.id);
    else if (deleteConfirm.type === 'chapter') deleteChapter(deleteConfirm.id);
    else deleteTopic(deleteConfirm.id);
    setDeleteConfirm(null);
  };

  return (
    <div className="p-6 lg:p-8 max-w-6xl mx-auto w-full h-full flex flex-col font-sans overflow-hidden">
      <div className="flex justify-between items-start mb-6 shrink-0">
        <div>
           <h1 className="text-3xl font-medium text-geist-text-primary-light dark:text-geist-text-primary-dark">Academic Manager</h1>
           <p className="text-geist-text-secondary-light dark:text-geist-text-secondary-dark font-light mt-1">Manage classes, subjects, and chapters.</p>
        </div>
        <button onClick={handleAddClass} className="flex items-center gap-1.5 bg-geist-text-primary-light dark:bg-geist-text-primary-dark text-geist-bg-light dark:text-geist-bg-dark px-3 py-1.5 rounded-md font-medium hover:opacity-80 transition-opacity text-xs min-h-[40px] sm:min-h-[32px]">
          <Plus className="w-3.5 h-3.5" /> Add Class
        </button>
      </div>

      <div className="space-y-4 overflow-y-auto pr-2 pb-10 flex-1 min-h-0">
        {classes.map((cls, classIndex) => (
          <div 
            key={cls.id} 
            className={`border border-geist-border-light dark:border-geist-border-dark rounded-lg overflow-hidden bg-geist-bg-light dark:bg-geist-bg-dark transition-all ${draggedClassIndex === classIndex ? 'opacity-50' : ''}`}
            draggable
            onDragStart={(e) => {
              e.dataTransfer.effectAllowed = 'move';
              setDraggedClassIndex(classIndex);
            }}
            onDragOver={(e) => {
              e.preventDefault();
              e.dataTransfer.dropEffect = 'move';
            }}
            onDrop={(e) => {
              e.preventDefault();
              if (draggedClassIndex !== null && draggedClassIndex !== classIndex) {
                reorderClasses(draggedClassIndex, classIndex);
              }
              setDraggedClassIndex(null);
            }}
            onDragEnd={() => setDraggedClassIndex(null)}
          >
             <div 
                className="p-3 flex justify-between items-center group cursor-pointer hover:bg-geist-surface-light dark:hover:bg-geist-surface-dark transition-colors"
                onClick={() => toggleClass(cls.id)}
             >
               <div className="flex items-center gap-2">
                 <div className="cursor-grab opacity-50 hover:opacity-100" onClick={e => e.stopPropagation()}>
                   <GripVertical className="w-4 h-4 text-geist-text-secondary-light dark:text-geist-text-secondary-dark" />
                 </div>
                 {expandedClasses[cls.id] ? <ChevronDown className="w-4 h-4 text-geist-text-secondary-light dark:text-geist-text-secondary-dark" /> : <ChevronRight className="w-4 h-4 text-geist-text-secondary-light dark:text-geist-text-secondary-dark" />}
                 <span className="font-semibold text-sm text-geist-text-primary-light dark:text-geist-text-primary-dark">{cls.name}</span>
               </div>
               <div className="flex items-center gap-1 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                 <button onClick={(e) => startEdit(cls.id, cls.name, 'class', e)} className="min-h-[40px] min-w-[40px] sm:min-h-[28px] sm:min-w-[28px] flex items-center justify-center text-geist-text-secondary-light dark:text-geist-text-secondary-dark hover:text-geist-text-primary-light dark:hover:text-geist-text-primary-dark transition-colors rounded hover:bg-geist-border-light dark:hover:bg-geist-border-dark"><Edit2 className="w-3.5 h-3.5" /></button>
                 <button onClick={(e) => handleDelete(cls.id, 'class', e)} className="text-geist-error-light dark:text-geist-error-dark min-h-[40px] min-w-[40px] sm:min-h-[28px] sm:min-w-[28px] flex items-center justify-center rounded hover:bg-geist-error-light/10 dark:hover:bg-geist-error-dark/10"><Trash2 className="w-3.5 h-3.5" /></button>
                 <button onClick={(e) => handleAddSubject(cls.id, e)} className="text-[11px] font-medium flex items-center gap-1 text-geist-text-secondary-light dark:text-geist-text-secondary-dark hover:text-geist-text-primary-light dark:hover:text-geist-text-primary-dark transition-colors min-h-[40px] sm:min-h-[28px] px-2 rounded hover:bg-geist-border-light dark:hover:bg-geist-border-dark"><Plus className="w-3 h-3" /> Add Subject</button>
               </div>
             </div>
             
             {expandedClasses[cls.id] && (
               <div className="p-2 space-y-2 bg-geist-surface-light dark:bg-geist-surface-dark border-t border-geist-border-light dark:border-geist-border-dark">
                 {subjects.filter(s => s.class_id === cls.id).map((subject, subjectIndex) => (
                    <div 
                      key={subject.id} 
                      className={`ml-2 bg-geist-bg-light dark:bg-geist-bg-dark border border-geist-border-light dark:border-geist-border-dark rounded overflow-hidden transition-all ${draggedSubjectIndex?.classId === cls.id && draggedSubjectIndex?.index === subjectIndex ? 'opacity-50' : ''}`}
                      draggable
                      onDragStart={(e) => {
                        e.stopPropagation();
                        e.dataTransfer.effectAllowed = 'move';
                        setDraggedSubjectIndex({index: subjectIndex, classId: cls.id});
                      }}
                      onDragOver={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        e.dataTransfer.dropEffect = 'move';
                      }}
                      onDrop={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        if (draggedSubjectIndex && draggedSubjectIndex.classId === cls.id && draggedSubjectIndex.index !== subjectIndex) {
                          reorderSubjects(draggedSubjectIndex.index, subjectIndex, cls.id);
                        }
                        setDraggedSubjectIndex(null);
                      }}
                      onDragEnd={(e) => {
                        e.stopPropagation();
                        setDraggedSubjectIndex(null);
                      }}
                    >
                       <div 
                         className="flex items-center justify-between p-2 cursor-pointer group hover:bg-geist-surface-light dark:hover:bg-geist-surface-dark transition-colors"
                         onClick={(e) => { e.stopPropagation(); toggleSubject(subject.id); }}
                       >
                         <div className="flex items-center gap-2">
                           <div className="cursor-grab opacity-50 hover:opacity-100" onClick={e => e.stopPropagation()}>
                             <GripVertical className="w-3.5 h-3.5 text-geist-text-secondary-light dark:text-geist-text-secondary-dark" />
                           </div>
                           {expandedSubjects[subject.id] ? <ChevronDown className="w-3.5 h-3.5 text-geist-text-secondary-light dark:text-geist-text-secondary-dark" /> : <ChevronRight className="w-3.5 h-3.5 text-geist-text-secondary-light dark:text-geist-text-secondary-dark" />}
                           <span className="flex items-center gap-1.5 text-[13px] text-geist-text-primary-light dark:text-geist-text-primary-dark font-medium"><Folder className="w-3.5 h-3.5 text-geist-text-secondary-light dark:text-geist-text-secondary-dark" /> {subject.name}</span>
                         </div>
                         <div className="flex items-center gap-1 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                           <button onClick={(e) => startEdit(subject.id, subject.name, 'subject', e)} className="min-h-[40px] min-w-[40px] sm:min-h-[28px] sm:min-w-[28px] flex items-center justify-center text-geist-text-secondary-light dark:text-geist-text-secondary-dark hover:text-geist-text-primary-light dark:hover:text-geist-text-primary-dark transition-colors rounded hover:bg-geist-border-light dark:hover:bg-geist-border-dark"><Edit2 className="w-3 h-3" /></button>
                           <button onClick={(e) => handleDelete(subject.id, 'subject', e)} className="text-geist-error-light dark:text-geist-error-dark min-h-[40px] min-w-[40px] sm:min-h-[28px] sm:min-w-[28px] flex items-center justify-center rounded hover:bg-geist-error-light/10 dark:hover:bg-geist-error-dark/10"><Trash2 className="w-3 h-3" /></button>
                           <button onClick={(e) => handleAddChapter(subject.id, e)} className="text-[10px] font-medium flex items-center gap-1 text-geist-text-secondary-light dark:text-geist-text-secondary-dark hover:text-geist-text-primary-light dark:hover:text-geist-text-primary-dark transition-colors min-h-[40px] sm:min-h-[28px] px-2 rounded hover:bg-geist-border-light dark:hover:bg-geist-border-dark"><Plus className="w-2.5 h-2.5" /> Add Chapter</button>
                         </div>
                       </div>
                       
                       {expandedSubjects[subject.id] && (
                         <div className="space-y-1 p-2 bg-geist-surface-light dark:bg-geist-surface-dark border-t border-geist-border-light dark:border-geist-border-dark">
                             {chapters.filter(c => c.subject_id === subject.id).map((chapter, chapterIndex) => (
                               <div key={chapter.id} className="flex flex-col ml-6 space-y-1">
                                 <div 
                                   className={`flex items-center justify-between group/chap bg-geist-bg-light dark:bg-geist-bg-dark hover:bg-geist-border-light dark:hover:bg-geist-border-dark p-2 rounded transition-colors ${draggedChapterIndex?.subjectId === subject.id && draggedChapterIndex?.index === chapterIndex ? 'opacity-50' : ''}`}
                                   draggable
                                   onDragStart={(e) => {
                                     e.stopPropagation();
                                     e.dataTransfer.effectAllowed = 'move';
                                     setDraggedChapterIndex({index: chapterIndex, subjectId: subject.id});
                                   }}
                                   onDragOver={(e) => {
                                     e.preventDefault();
                                     e.stopPropagation();
                                     e.dataTransfer.dropEffect = 'move';
                                   }}
                                   onDrop={(e) => {
                                     e.preventDefault();
                                     e.stopPropagation();
                                     if (draggedChapterIndex && draggedChapterIndex.subjectId === subject.id && draggedChapterIndex.index !== chapterIndex) {
                                       reorderChapters(draggedChapterIndex.index, chapterIndex, subject.id);
                                     }
                                     setDraggedChapterIndex(null);
                                   }}
                                   onDragEnd={(e) => {
                                     e.stopPropagation();
                                     setDraggedChapterIndex(null);
                                   }}
                                   onClick={(e) => { e.stopPropagation(); toggleChapter(chapter.id); }}
                                 >
                                   <div className="flex items-center gap-2 w-full cursor-pointer">
                                     <div className="cursor-grab opacity-50 hover:opacity-100" onClick={e => e.stopPropagation()}>
                                       <GripVertical className="w-3 h-3 text-geist-text-secondary-light dark:text-geist-text-secondary-dark" />
                                     </div>
                                     {expandedChapters[chapter.id] ? <ChevronDown className="w-3 h-3 text-geist-text-secondary-light dark:text-geist-text-secondary-dark" /> : <ChevronRight className="w-3 h-3 text-geist-text-secondary-light dark:text-geist-text-secondary-dark" />}
                                     <span className="text-[13px] text-geist-text-primary-light dark:text-geist-text-primary-dark">{chapter.name}</span>
                                   </div>
                                   <div className="flex items-center gap-1 opacity-100 sm:opacity-0 group-hover/chap:opacity-100 transition-opacity">
                                     <button onClick={(e) => startEdit(chapter.id, chapter.name, 'chapter', e)} className="min-h-[36px] min-w-[36px] sm:min-h-[28px] sm:min-w-[28px] flex items-center justify-center text-geist-text-secondary-light dark:text-geist-text-secondary-dark hover:text-geist-text-primary-light dark:hover:text-geist-text-primary-dark transition-colors hover:bg-geist-surface-light dark:hover:bg-geist-surface-dark rounded"><Edit2 className="w-3 h-3" /></button>
                                     <button onClick={(e) => handleDelete(chapter.id, 'chapter', e)} className="text-geist-error-light dark:text-geist-error-dark min-h-[36px] min-w-[36px] sm:min-h-[28px] sm:min-w-[28px] flex items-center justify-center hover:bg-geist-error-light/10 dark:hover:bg-geist-error-dark/10 rounded"><Trash2 className="w-3 h-3" /></button>
                                     <button onClick={(e) => handleAddTopic(chapter.id, e)} className="text-[9px] font-medium flex items-center gap-1 text-geist-text-secondary-light dark:text-geist-text-secondary-dark hover:text-geist-text-primary-light dark:hover:text-geist-text-primary-dark transition-colors min-h-[36px] sm:min-h-[28px] px-2 rounded hover:bg-geist-border-light dark:hover:bg-geist-border-dark"><Plus className="w-2.5 h-2.5" /> Add Topic</button>
                                   </div>
                                 </div>
                                 {expandedChapters[chapter.id] && (
                                   <div className="space-y-1 p-2 bg-geist-surface-light dark:bg-geist-surface-dark border-t border-geist-border-light dark:border-geist-border-dark">
                                      {topics.filter(t => t.chapter_id === chapter.id).map((topic, topicIndex) => (
                                         <div 
                                           key={topic.id} 
                                           className={`flex items-center justify-between group/topic bg-geist-bg-light dark:bg-geist-bg-dark hover:bg-geist-border-light dark:hover:bg-geist-border-dark p-2 rounded transition-colors ml-6 ${draggedTopicIndex?.chapterId === chapter.id && draggedTopicIndex?.index === topicIndex ? 'opacity-50' : ''}`}
                                           draggable
                                           onDragStart={(e) => {
                                             e.stopPropagation();
                                             e.dataTransfer.effectAllowed = 'move';
                                             setDraggedTopicIndex({index: topicIndex, chapterId: chapter.id});
                                           }}
                                           onDragOver={(e) => {
                                             e.preventDefault();
                                             e.stopPropagation();
                                             e.dataTransfer.dropEffect = 'move';
                                           }}
                                           onDrop={(e) => {
                                             e.preventDefault();
                                             e.stopPropagation();
                                             if (draggedTopicIndex && draggedTopicIndex.chapterId === chapter.id && draggedTopicIndex.index !== topicIndex) {
                                               reorderTopics(draggedTopicIndex.index, topicIndex, chapter.id);
                                             }
                                             setDraggedTopicIndex(null);
                                           }}
                                           onDragEnd={(e) => {
                                             e.stopPropagation();
                                             setDraggedTopicIndex(null);
                                           }}
                                         >
                                           <div className="flex items-center gap-2 w-full">
                                             <div className="cursor-grab opacity-50 hover:opacity-100" onClick={e => e.stopPropagation()}>
                                               <GripVertical className="w-2.5 h-2.5 text-geist-text-secondary-light dark:text-geist-text-secondary-dark" />
                                             </div>
                                             <span className="text-[12px] text-geist-text-primary-light dark:text-geist-text-primary-dark">{topic.name}</span>
                                           </div>
                                           <div className="flex items-center gap-1 opacity-100 sm:opacity-0 group-hover/topic:opacity-100 transition-opacity">
                                             <button onClick={(e) => startEdit(topic.id, topic.name, 'topic', e)} className="min-h-[36px] min-w-[36px] sm:min-h-[28px] sm:min-w-[28px] flex items-center justify-center text-geist-text-secondary-light dark:text-geist-text-secondary-dark hover:text-geist-text-primary-light dark:hover:text-geist-text-primary-dark transition-colors hover:bg-geist-surface-light dark:hover:bg-geist-surface-dark rounded"><Edit2 className="w-2.5 h-2.5" /></button>
                                             <button onClick={(e) => handleDelete(topic.id, 'topic', e)} className="text-geist-error-light dark:text-geist-error-dark min-h-[36px] min-w-[36px] sm:min-h-[28px] sm:min-w-[28px] flex items-center justify-center hover:bg-geist-error-light/10 dark:hover:bg-geist-error-dark/10 rounded"><Trash2 className="w-2.5 h-2.5" /></button>
                                           </div>
                                         </div>
                                      ))}
                                   </div>
                                 )}
                               </div>
                            ))}
                         </div>
                       )}
                    </div>
                 ))}
               </div>
             )}
          </div>
        ))}
      </div>
      
      {promptModal.isOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-geist-bg-light dark:bg-geist-bg-dark rounded-xl p-6 max-w-sm w-full border border-geist-border-light dark:border-geist-border-dark shadow-xl">
            <h3 className="text-lg font-semibold text-geist-text-primary-light dark:text-geist-text-primary-dark mb-4">{promptModal.title}</h3>
            <ValidatedInput 
              autoFocus 
              type="text" 
              maxLength={100}
              value={promptModal.value}
              onChange={(val) => setPromptModal(prev => ({...prev, value: val}))}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  promptModal.onSave(promptModal.value);
                  setPromptModal({ isOpen: false, title: '', value: '', onSave: () => {} });
                }
              }}
            />
            <div className="flex justify-end gap-3">
              <button 
                onClick={() => setPromptModal({ isOpen: false, title: '', value: '', onSave: () => {} })}
                className="px-4 py-2 text-sm font-medium text-geist-text-secondary-light dark:text-geist-text-secondary-dark hover:bg-geist-surface-light dark:hover:bg-geist-surface-dark rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={() => {
                  promptModal.onSave(promptModal.value);
                  setPromptModal({ isOpen: false, title: '', value: '', onSave: () => {} });
                }}
                className="px-4 py-2 text-sm font-medium bg-geist-success text-white rounded-lg hover:opacity-90 transition-opacity"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-geist-bg-light dark:bg-geist-bg-dark rounded-xl p-6 max-w-sm w-full border border-geist-border-light dark:border-geist-border-dark shadow-xl">
            <h3 className="text-lg font-semibold text-geist-text-primary-light dark:text-geist-text-primary-dark mb-2">Delete {deleteConfirm.type}</h3>
            <p className="text-sm text-geist-text-secondary-light dark:text-geist-text-secondary-dark mb-6">
              Are you sure you want to delete this {deleteConfirm.type}? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button 
                onClick={() => setDeleteConfirm(null)}
                className="px-4 py-2 text-sm font-medium text-geist-text-secondary-light dark:text-geist-text-secondary-dark hover:bg-geist-surface-light dark:hover:bg-geist-surface-dark rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={confirmDelete}
                className="px-4 py-2 text-sm font-medium bg-geist-error-light dark:bg-geist-error-dark text-white rounded-lg hover:opacity-90 transition-opacity"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
