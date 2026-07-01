import { create } from 'zustand';
import { supabase } from '../lib/supabase';

export type TaskStatus = 'not-started' | 'in-progress' | 'completed' | 'revision';

export interface StudyTask {
  id: string;
  user_id: string;
  title: string;
  class_id?: string;
  subject_id?: string;
  chapter_id?: string;
  custom_class?: string;
  custom_subject?: string;
  custom_chapter?: string;
  date: string; // YYYY-MM-DD
  status: TaskStatus;
  display_order?: number;
  created_at?: string;
}

export interface PomodoroSession {
  id: string;
  study_plan_id?: string;
  duration_seconds: number;
  session_type: string;
  completed: boolean;
  created_at?: string;
}

interface PlannerState {
  tasks: StudyTask[];
  sessions: PomodoroSession[];
  isLoading: boolean;
  fetchTasks: () => Promise<void>;
  addTask: (task: Omit<StudyTask, 'id' | 'user_id' | 'created_at'>) => Promise<void>;
  updateTaskStatus: (id: string, status: TaskStatus) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
  addPomodoroSession: (session: Omit<PomodoroSession, 'id' | 'created_at'>) => Promise<void>;
  reorderTasks: (reorderedTasks: StudyTask[]) => Promise<void>;
}

export const usePlannerStore = create<PlannerState>((set, get) => ({
  tasks: [],
  sessions: [],
  isLoading: false,

  fetchTasks: async () => {
    set({ isLoading: true });
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      
      const [tasksRes, sessionsRes] = await Promise.all([
        supabase.from('study_plans').select('*').order('date', { ascending: true }),
        supabase.from('pomodoro_sessions').select('*').order('created_at', { ascending: false })
      ]);

      if (tasksRes.error) throw tasksRes.error;
      if (sessionsRes.error) throw sessionsRes.error;

      set({ tasks: tasksRes.data || [], sessions: sessionsRes.data || [] });
    } catch (error) {
      console.error('Error fetching planner data:', error);
    } finally {
      set({ isLoading: false });
    }
  },

  addTask: async (task) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data, error } = await supabase.from('study_plans').insert([{
        ...task,
        user_id: session.user.id
      }]).select().single();

      if (error) throw error;
      set((state) => ({ tasks: [...state.tasks, data] }));
    } catch (error) {
      console.error('Error adding task:', error);
    }
  },

  updateTaskStatus: async (id, status) => {
    try {
      // Optimistic update
      set((state) => ({
        tasks: state.tasks.map((t) => t.id === id ? { ...t, status } : t)
      }));

      const { error } = await supabase.from('study_plans').update({ status }).eq('id', id);
      if (error) throw error;
    } catch (error) {
      console.error('Error updating task status:', error);
      // Revert optimism if needed (simple implementation ignores revert for now)
    }
  },

  deleteTask: async (id) => {
    try {
      // Optimistic update
      set((state) => ({
        tasks: state.tasks.filter((t) => t.id !== id)
      }));

      const { error } = await supabase.from('study_plans').delete().eq('id', id);
      if (error) throw error;
    } catch (error) {
      console.error('Error deleting task:', error);
    }
  },

  reorderTasks: async (reorderedTasks) => {
    try {
      // Optimistic update
      set((state) => {
        const reorderedIds = new Set(reorderedTasks.map(t => t.id));
        const otherTasks = state.tasks.filter(t => !reorderedIds.has(t.id));
        return { tasks: [...otherTasks, ...reorderedTasks] };
      });

      // Build upsert payload
      const updates = reorderedTasks.map(t => ({
        id: t.id,
        user_id: t.user_id,
        title: t.title,
        date: t.date,
        status: t.status,
        display_order: t.display_order,
        class_id: t.class_id,
        subject_id: t.subject_id,
        chapter_id: t.chapter_id,
        custom_class: t.custom_class,
        custom_subject: t.custom_subject,
        custom_chapter: t.custom_chapter,
      }));

      const { error } = await supabase.from('study_plans').upsert(updates);
      if (error) throw error;
    } catch (error) {
      console.error('Error reordering tasks:', error);
      get().fetchTasks(); // refresh on fail
    }
  },

  addPomodoroSession: async (sessionInfo) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data, error } = await supabase.from('pomodoro_sessions').insert([{
        ...sessionInfo,
        user_id: session.user.id
      }]).select().single();

      if (error) throw error;
      set((state) => ({ sessions: [data, ...state.sessions] }));
    } catch (error) {
      console.error('Error adding pomodoro session:', error);
    }
  }
}));
