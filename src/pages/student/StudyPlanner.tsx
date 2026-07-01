import React, { useState, useEffect, useMemo, useRef } from 'react';
import { ChevronLeft, ChevronRight, Plus, Trash2, Calendar as CalendarIcon, BookOpen, Clock, CheckCircle2, CircleDashed, ArrowRightCircle, RefreshCcw, Book, GripVertical } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { usePlannerStore, TaskStatus } from '../../store/usePlannerStore';
import { useUserStore } from '../../store/useUserStore';
import { Dropdown } from '../../components/Dropdown';

const STATUS_CONFIG = {
  'not-started': { label: 'Planned', icon: CircleDashed, color: 'text-geist-text-secondary-light dark:text-geist-text-secondary-dark' },
  'in-progress': { label: 'Ongoing', icon: ArrowRightCircle, color: 'text-blue-500' },
  'completed': { label: 'Done', icon: CheckCircle2, color: 'text-emerald-500' },
  'revision': { label: 'Revision', icon: RefreshCcw, color: 'text-purple-500' },
};

const StatusDropdown = ({ currentStatus, onUpdate }: { currentStatus: TaskStatus, onUpdate: (status: TaskStatus) => void }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const CurrentIcon = STATUS_CONFIG[currentStatus].icon;

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 px-2 py-1.5 rounded-md cursor-pointer transition-colors hover:bg-geist-surface-light dark:hover:bg-geist-surface-dark border border-transparent hover:border-geist-border-light dark:hover:border-geist-border-dark"
      >
        <CurrentIcon className={`w-5 h-5 ${STATUS_CONFIG[currentStatus].color}`} />
        <span className="text-xs font-medium text-geist-text-secondary-light dark:text-geist-text-secondary-dark hidden sm:inline-block">
          {STATUS_CONFIG[currentStatus].label}
        </span>
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 5 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 5 }}
            transition={{ duration: 0.15 }}
            className="absolute left-0 mt-2 w-40 z-50 bg-geist-bg-light dark:bg-geist-bg-dark border border-geist-border-light dark:border-geist-border-dark rounded-xl shadow-xl overflow-hidden p-1"
          >
            {(Object.keys(STATUS_CONFIG) as TaskStatus[]).map(status => {
              const Icon = STATUS_CONFIG[status].icon;
              return (
                <button
                  key={status}
                  onClick={() => {
                    onUpdate(status);
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-2 text-sm rounded-lg transition-colors ${
                    currentStatus === status 
                      ? 'bg-geist-surface-light dark:bg-geist-surface-dark font-medium' 
                      : 'hover:bg-geist-surface-light dark:hover:bg-geist-surface-dark text-geist-text-secondary-light dark:text-geist-text-secondary-dark'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${STATUS_CONFIG[status].color}`} />
                  {STATUS_CONFIG[status].label}
                </button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

interface SortableTaskItemProps {
  task: any;
  updateTaskStatus: (id: string, status: TaskStatus) => void;
  deleteTask: (id: string) => void;
  getTaskDisplayDetails: (task: any) => string;
}

const SortableTaskItem = ({ task, updateTaskStatus, deleteTask, getTaskDisplayDetails }: SortableTaskItemProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className={`group bg-geist-bg-light dark:bg-geist-bg-dark border rounded-xl p-4 shadow-sm transition-colors flex items-center justify-between gap-4 ${isDragging ? 'border-blue-500 shadow-md' : 'border-geist-border-light dark:border-geist-border-dark hover:border-geist-text-secondary-light/50 dark:hover:border-geist-text-secondary-dark/50'}`}>
      <div className="flex items-start md:items-center gap-3 w-full">
        <div {...attributes} {...listeners} className="cursor-grab hover:text-geist-text-primary-light dark:hover:text-geist-text-primary-dark text-geist-text-secondary-light dark:text-geist-text-secondary-dark -ml-2 p-1">
          <GripVertical className="w-5 h-5" />
        </div>
        <div className="relative shrink-0 mt-0.5 md:mt-0">
          <StatusDropdown 
            currentStatus={task.status} 
            onUpdate={(newStatus) => updateTaskStatus(task.id, newStatus)} 
          />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className={`text-sm font-medium truncate ${task.status === 'completed' ? 'line-through text-geist-text-secondary-light dark:text-geist-text-secondary-dark' : ''}`}>
            {task.title}
          </h4>
          <p className="text-xs text-geist-text-secondary-light dark:text-geist-text-secondary-dark mt-1 font-medium truncate">
            {getTaskDisplayDetails(task)}
          </p>
        </div>
      </div>
      <button
        onClick={() => deleteTask(task.id)}
        className="p-2 text-geist-text-secondary-light dark:text-geist-text-secondary-dark hover:text-rose-500 opacity-100 md:opacity-0 group-hover:opacity-100 transition-all rounded-md hover:bg-rose-500/10 shrink-0"
        title="Delete Task"
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  );
};

export const StudyPlanner: React.FC = () => {
  const { tasks, sessions, fetchTasks, addTask, updateTaskStatus, deleteTask } = usePlannerStore();
  const { academicTree } = useUserStore();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  
  // Add Task Modal State
  const [isAdding, setIsAdding] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('');
  const [selectedChapterId, setSelectedChapterId] = useState<string>('');
  
  const [customClass, setCustomClass] = useState('');
  const [customSubject, setCustomSubject] = useState('');
  const [customChapter, setCustomChapter] = useState('');
  const [newTaskStatus, setNewTaskStatus] = useState<TaskStatus>('not-started');
  const [filterStatus, setFilterStatus] = useState<TaskStatus | 'all'>('all');

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

  const daysInMonth = getDaysInMonth(currentDate.getFullYear(), currentDate.getMonth());
  const firstDay = getFirstDayOfMonth(currentDate.getFullYear(), currentDate.getMonth());

  const prevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1));
  const nextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1));

  const formatDateString = (date: Date) => {
    const d = new Date(date);
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().split('T')[0];
  };

  const selectedDateStr = formatDateString(selectedDate);
  
  const statusOrder: Record<TaskStatus, number> = {
    'not-started': 1,
    'in-progress': 2,
    'revision': 3,
    'completed': 4,
  };

  const tasksForSelectedDate = useMemo(() => {
    return tasks
      .filter(t => t.date === selectedDateStr && (filterStatus === 'all' || t.status === filterStatus))
      .sort((a, b) => {
        if (statusOrder[a.status] !== statusOrder[b.status]) {
          return statusOrder[a.status] - statusOrder[b.status];
        }
        return (a.display_order || 0) - (b.display_order || 0);
      });
  }, [tasks, selectedDateStr, filterStatus]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = tasksForSelectedDate.findIndex((t) => t.id === active.id);
    const newIndex = tasksForSelectedDate.findIndex((t) => t.id === over.id);

    if (oldIndex !== -1 && newIndex !== -1) {
      const activeTask = tasksForSelectedDate[oldIndex];

      const newTasks = arrayMove(tasksForSelectedDate, oldIndex, newIndex);
      
      const updatedTasks = newTasks.map((t, index) => ({
        ...t,
        display_order: index,
      }));

      usePlannerStore.getState().reorderTasks(updatedTasks);
    }
  };

  const totalFocusTime = useMemo(() => {
    return sessions
      .filter(s => s.session_type === 'focus' && s.completed)
      .reduce((acc, curr) => acc + curr.duration_seconds, 0);
  }, [sessions]);

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;
    
    await addTask({
      title: newTaskTitle,
      class_id: selectedClassId === 'custom' ? undefined : (selectedClassId || undefined),
      subject_id: selectedSubjectId === 'custom' ? undefined : (selectedSubjectId || undefined),
      chapter_id: selectedChapterId === 'custom' ? undefined : (selectedChapterId || undefined),
      custom_class: selectedClassId === 'custom' ? customClass : undefined,
      custom_subject: selectedSubjectId === 'custom' ? customSubject : undefined,
      custom_chapter: selectedChapterId === 'custom' ? customChapter : undefined,
      date: selectedDateStr,
      status: newTaskStatus
    });
    
    setNewTaskTitle('');
    setSelectedClassId('');
    setSelectedSubjectId('');
    setSelectedChapterId('');
    setCustomClass('');
    setCustomSubject('');
    setCustomChapter('');
    setNewTaskStatus('not-started');
    setIsAdding(false);
  };

  const getTaskDisplayDetails = (task: any) => {
    if (task.custom_subject || task.custom_chapter) {
      return `${task.custom_subject || ''} ${task.custom_chapter ? ' - ' + task.custom_chapter : ''}`;
    }
    
    const cls = academicTree.find(c => c.id === task.class_id);
    const sub = cls?.children?.find(s => s.id === task.subject_id);
    const chap = sub?.children?.find(c => c.id === task.chapter_id);
    
    return [sub?.name, chap?.name].filter(Boolean).join(' - ') || 'No subject info';
  };

  const renderCalendar = () => {
    const days = [];
    const monthStr = currentDate.toLocaleString('default', { month: 'long' });
    const year = currentDate.getFullYear();

    // Headers
    ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].forEach(day => {
      days.push(
        <div key={`h-${day}`} className="text-center text-[10px] font-semibold text-geist-text-secondary-light dark:text-geist-text-secondary-dark uppercase tracking-wider py-2">
          {day}
        </div>
      );
    });

    // Empty cells
    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} className="p-2" />);
    }

    // Days
    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(year, currentDate.getMonth(), d);
      const dateStr = formatDateString(date);
      const isSelected = dateStr === selectedDateStr;
      const isToday = dateStr === formatDateString(new Date());
      const dayTasks = tasks.filter(t => t.date === dateStr);
      
      const allCompleted = dayTasks.length > 0 && dayTasks.every(t => t.status === 'completed');

      days.push(
        <button
          key={`day-${d}`}
          onClick={() => setSelectedDate(date)}
          className={`relative h-12 flex flex-col items-center justify-start pt-1.5 rounded-lg border transition-all ${
            isSelected
              ? 'border-geist-text-primary-light dark:border-geist-text-primary-dark bg-geist-surface-light dark:bg-geist-surface-dark'
              : 'border-transparent hover:bg-geist-surface-light dark:hover:bg-geist-surface-dark'
          }`}
        >
          <span className={`text-sm font-medium ${
            isSelected 
              ? 'text-geist-text-primary-light dark:text-geist-text-primary-dark' 
              : isToday
                ? 'text-blue-500 font-bold'
                : 'text-geist-text-secondary-light dark:text-geist-text-secondary-dark'
          }`}>
            {d}
          </span>
          {dayTasks.length > 0 && (
            <div className="flex gap-0.5 mt-1">
              <div className={`w-1.5 h-1.5 rounded-full ${allCompleted ? 'bg-emerald-500' : 'bg-blue-500'}`} />
            </div>
          )}
        </button>
      );
    }

    return (
      <div className="bg-geist-bg-light dark:bg-geist-bg-dark border border-geist-border-light dark:border-geist-border-dark rounded-xl p-4 shadow-sm">
        <div className="flex items-center justify-between mb-4 px-2">
          <h2 className="text-lg font-semibold tracking-tight">
            {monthStr} {year}
          </h2>
          <div className="flex gap-1">
            <button onClick={prevMonth} className="p-1.5 rounded-md hover:bg-geist-surface-light dark:hover:bg-geist-surface-dark transition-colors">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button onClick={nextMonth} className="p-1.5 rounded-md hover:bg-geist-surface-light dark:hover:bg-geist-surface-dark transition-colors">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
        <div className="grid grid-cols-7 gap-1">
          {days}
        </div>
      </div>
    );
  };

  const selectedClass = academicTree.find(c => c.id === selectedClassId);
  const selectedSubject = selectedClass?.children?.find(s => s.id === selectedSubjectId);

  return (
    <div className="h-full flex flex-col">
      <header className="px-4 md:px-6 py-5 border-b border-geist-border-light dark:border-geist-border-dark shrink-0">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-geist-surface-light dark:bg-geist-surface-dark border border-geist-border-light dark:border-geist-border-dark hidden md:block">
              <CalendarIcon className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-lg md:text-xl font-semibold tracking-tight">Study Planner</h1>
              <p className="text-xs md:text-sm text-geist-text-secondary-light dark:text-geist-text-secondary-dark">Manage your chapter-level study schedule</p>
            </div>
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-auto p-4 md:p-6">
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Calendar */}
          <div className="lg:col-span-1 space-y-6">
            {renderCalendar()}
            
            <div className="bg-geist-surface-light/50 dark:bg-geist-surface-dark/50 border border-geist-border-light dark:border-geist-border-dark rounded-xl p-4">
              <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
                <Clock className="w-4 h-4" /> Statistics
              </h3>
              <div className="space-y-3 text-sm text-geist-text-secondary-light dark:text-geist-text-secondary-dark">
                <div className="flex justify-between items-center border-b border-geist-border-light dark:border-geist-border-dark pb-2">
                  <span>Total Planned</span>
                  <span className="font-medium text-geist-text-primary-light dark:text-geist-text-primary-dark">{tasks.length}</span>
                </div>
                <div className="flex justify-between items-center border-b border-geist-border-light dark:border-geist-border-dark pb-2">
                  <span>Completed</span>
                  <span className="font-medium text-emerald-500">{tasks.filter(t => t.status === 'completed').length}</span>
                </div>
                <div className="flex justify-between items-center border-b border-geist-border-light dark:border-geist-border-dark pb-2">
                  <span>In Progress</span>
                  <span className="font-medium text-blue-500">{tasks.filter(t => t.status === 'in-progress').length}</span>
                </div>
                <div className="flex justify-between items-center pt-1">
                  <span>Total Focus Time</span>
                  <span className="font-medium text-purple-500">{Math.floor(totalFocusTime / 3600)}h {Math.floor((totalFocusTime % 3600) / 60)}m</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Tasks for Selected Date */}
          <div className="lg:col-span-2 flex flex-col h-auto min-h-[500px]">
            <div className="flex items-center justify-between mb-4 shrink-0">
              <h2 className="text-base md:text-lg font-semibold tracking-tight">
                Schedule for {selectedDate.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
              </h2>
              <div className="flex items-center gap-2">
                <Dropdown
                  value={filterStatus}
                  onChange={(val) => setFilterStatus(val as TaskStatus | 'all')}
                  options={[
                    { value: 'all', label: 'All Status' },
                    ...(Object.keys(STATUS_CONFIG) as TaskStatus[]).map(status => ({
                      value: status,
                      label: STATUS_CONFIG[status].label
                    }))
                  ]}
                  placeholder="Filter by status"
                />
                <button
                  onClick={() => setIsAdding(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-geist-text-primary-light dark:bg-geist-text-primary-dark text-geist-bg-light dark:text-geist-bg-dark rounded-lg text-xs md:text-sm font-medium transition-transform hover:scale-105 active:scale-95"
                >
                  <Plus className="w-4 h-4" /> Add Task
                </button>
              </div>
            </div>

            {isAdding && (
              <form onSubmit={handleAddTask} className="bg-geist-surface-light dark:bg-geist-surface-dark border border-geist-border-light dark:border-geist-border-dark rounded-xl p-4 mb-4 shadow-sm shrink-0 flex flex-col gap-3">
                <input
                  type="text"
                  placeholder="Plan Title (e.g. Revise Optics Formulas)"
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  className="w-full bg-geist-bg-light dark:bg-geist-bg-dark border border-geist-border-light dark:border-geist-border-dark rounded-lg px-3 py-2 text-sm outline-none focus:border-geist-text-secondary-light dark:focus:border-geist-text-secondary-dark"
                  autoFocus
                />
                
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <Dropdown
                    value={selectedClassId}
                    onChange={setSelectedClassId}
                    options={[
                      ...academicTree.map(c => ({ value: c.id, label: c.name })),
                      { value: 'custom', label: 'Custom...' }
                    ]}
                    placeholder="Select Class..."
                  />

                  <Dropdown
                    value={selectedSubjectId}
                    onChange={setSelectedSubjectId}
                    disabled={!selectedClassId && selectedClassId !== 'custom'}
                    options={
                      selectedClassId === 'custom' 
                        ? [{ value: 'custom', label: 'Custom...' }]
                        : [
                            ...(selectedClass?.children?.map(s => ({ value: s.id, label: s.name })) || []),
                            { value: 'custom', label: 'Custom...' }
                          ]
                    }
                    placeholder="Select Subject..."
                  />

                  <Dropdown
                    value={selectedChapterId}
                    onChange={setSelectedChapterId}
                    disabled={!selectedSubjectId && selectedSubjectId !== 'custom'}
                    options={
                      selectedSubjectId === 'custom'
                        ? [{ value: 'custom', label: 'Custom...' }]
                        : [
                            ...(selectedSubject?.children?.map(c => ({ value: c.id, label: c.name })) || []),
                            { value: 'custom', label: 'Custom...' }
                          ]
                    }
                    placeholder="Select Chapter..."
                  />
                </div>

                {(selectedClassId === 'custom' || selectedSubjectId === 'custom' || selectedChapterId === 'custom') && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                    {selectedClassId === 'custom' && (
                      <input type="text" placeholder="Custom Class" value={customClass} onChange={e => setCustomClass(e.target.value)} className="w-full bg-geist-bg-light dark:bg-geist-bg-dark border border-geist-border-light dark:border-geist-border-dark rounded-lg px-3 py-2 text-sm outline-none" />
                    )}
                    {selectedSubjectId === 'custom' && (
                      <input type="text" placeholder="Custom Subject" value={customSubject} onChange={e => setCustomSubject(e.target.value)} className="w-full bg-geist-bg-light dark:bg-geist-bg-dark border border-geist-border-light dark:border-geist-border-dark rounded-lg px-3 py-2 text-sm outline-none" />
                    )}
                    {selectedChapterId === 'custom' && (
                      <input type="text" placeholder="Custom Chapter" value={customChapter} onChange={e => setCustomChapter(e.target.value)} className="w-full bg-geist-bg-light dark:bg-geist-bg-dark border border-geist-border-light dark:border-geist-border-dark rounded-lg px-3 py-2 text-sm outline-none" />
                    )}
                  </div>
                )}

                <div className="flex gap-3 justify-between items-center mt-2">
                  <div className="w-48">
                    <Dropdown
                      value={newTaskStatus}
                      onChange={(val) => setNewTaskStatus(val as TaskStatus)}
                      options={(Object.keys(STATUS_CONFIG) as TaskStatus[]).map(status => ({
                        value: status,
                        label: STATUS_CONFIG[status].label
                      }))}
                      placeholder="Status"
                    />
                  </div>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => setIsAdding(false)} className="px-4 py-2 hover:bg-geist-bg-light dark:hover:bg-geist-bg-dark rounded-lg text-sm font-medium transition-colors">
                      Cancel
                    </button>
                    <button type="submit" className="px-4 py-2 bg-geist-text-primary-light dark:bg-geist-text-primary-dark text-geist-bg-light dark:text-geist-bg-dark rounded-lg text-sm font-medium">
                      Save Task
                    </button>
                  </div>
                </div>
              </form>
            )}

            <div className="flex-1 space-y-3 pb-8">
              {tasksForSelectedDate.length === 0 && !isAdding ? (
                <div className="h-64 flex flex-col items-center justify-center text-geist-text-secondary-light dark:text-geist-text-secondary-dark border-2 border-dashed border-geist-border-light dark:border-geist-border-dark rounded-xl p-8">
                  <Book className="w-8 h-8 mb-3 opacity-20" />
                  <p className="text-sm">No chapters scheduled for this day.</p>
                </div>
              ) : (
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                  <SortableContext items={tasksForSelectedDate.map(t => t.id)} strategy={verticalListSortingStrategy}>
                    {tasksForSelectedDate.map(task => (
                      <SortableTaskItem
                        key={task.id}
                        task={task}
                        updateTaskStatus={updateTaskStatus}
                        deleteTask={deleteTask}
                        getTaskDisplayDetails={getTaskDisplayDetails}
                      />
                    ))}
                  </SortableContext>
                </DndContext>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
