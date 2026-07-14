import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { ExamData, PaperData, ClassData, SubjectData, ChapterData, QuestionData } from './useAdminStore';

export interface AcademicNode {
  id: string;
  name: string;
  type: 'Class' | 'Subject' | 'Chapter' | 'Topic';
  children?: AcademicNode[];
  questionCount?: number;
}

export interface UserExamStat {
  user_id: string;
  exam_id: string;
  exam_name: string;
  subject_id: string;
  subject_name: string;
  chapter_id: string;
  chapter_name: string;
  total_attempts: number;
  correct_attempts: number;
  accuracy_rate: number;
  avg_time_seconds: number;
}

export interface UserProgressData {
  classId: string;
  className: string;
  progress: number;
  totalQuestions: number;
  completedQuestions: number;
}

export interface BookSetData {
  id: string;
  name: string;
  description?: string;
}

interface UserState {
  academicTree: AcademicNode[];
  exams: ExamData[];
  papers: PaperData[];
  booksSets: BookSetData[];
  questions: QuestionData[];
  totalSolved: number;
  streak: number;
  userExamStats: UserExamStat[];
  classProgress: UserProgressData[];
  attempts: any[];
  isLoading: boolean;
  isInitialized: boolean;
  fetchData: () => Promise<void>;
  fetchQuestionsByChapter: (chapterId: string) => Promise<void>;
  fetchQuestionsByPaper: (paperId: string) => Promise<void>;
}

export const useUserStore = create<UserState>((set, get) => ({
  academicTree: [],
  exams: [],
  papers: [],
  booksSets: [],
  questions: [],
  totalSolved: 0,
  streak: 0,
  userExamStats: [],
  classProgress: [],
  attempts: [],
  isLoading: false,
  isInitialized: false,

  fetchData: async () => {
    set({ isLoading: true });

    // Ensure session is available
    const { data: { session } } = await supabase.auth.getSession();
    const userId = session?.user?.id;

    // Fetch data
    const [
      clsRes, subRes, chapRes, topicRes,
      examsRes, papersRes, attemptsRes, booksSetsRes
    ] = await Promise.all([
      supabase.from('classes').select('*').order('order_index'),
      supabase.from('subjects').select('*').order('order_index'),
      supabase.from('chapters').select('*').order('order_index'),
      supabase.from('topics').select('*').order('order_index'),
      supabase.from('exams').select('*').order('order_index'),
      supabase.from('papers').select('*').eq('status', 'Published').order('order_index'),
      supabase.from('question_attempts').select('*').order('created_at', { ascending: false }).limit(5000),
      supabase.from('books_sets').select('*').order('order_index')
    ]);

    // Fetch from the safe view — excludes correct_option, explanation, explanation_images
    let allQuestions: any[] = [];
    let from = 0;
    let to = 999;
    let hasMore = true;
    const MAX_PAGES = 20; // Safety guard against infinite loops
    let page = 0;
    while (hasMore && page < MAX_PAGES) {
      page++;
      const { data, error } = await supabase.from('questions_for_students')
        .select('*')
        .range(from, to);
      if (error) {
         console.error(error);
         break;
      }
      if (data && data.length > 0) {
        allQuestions = [...allQuestions, ...data];
        if (data.length < 1000) hasMore = false;
        else { from += 1000; to += 1000; }
      } else {
        hasMore = false;
      }
    }

    const classes = clsRes.data || [];
    const subjects = subRes.data || [];
    const chapters = chapRes.data || [];
    const topics = topicRes.data || [];
    const booksSets = booksSetsRes.data || [];

    // Build the Academic Tree
    const academicTree: AcademicNode[] = classes.map(cls => ({
      id: cls.id,
      name: cls.name,
      type: 'Class',
      children: subjects.filter(sub => sub.class_id === cls.id).map(sub => ({
        id: sub.id,
        name: sub.name,
        type: 'Subject',
        children: chapters.filter(chap => chap.subject_id === sub.id).map(chap => {
          const chapQuestionsCount = allQuestions.filter(q => q.chapter_id === chap.id).length;
          return {
            id: chap.id,
            name: chap.name,
            type: 'Chapter',
            questionCount: chapQuestionsCount,
            children: topics.filter(t => t.chapter_id === chap.id).map(topic => {
              const topicQuestionsCount = allQuestions.filter(q => q.topic_id === topic.id).length;
              return {
                id: topic.id,
                name: topic.name,
                type: 'Topic',
                questionCount: topicQuestionsCount
              };
            })
          };
        })
      }))
    }));

    // Calculate total solved
    const attempts = attemptsRes.data || [];
    const totalSolved = attempts.length;
    
    // Calculate Streak
    let currentStreak = 0;
    if (attempts.length > 0) {
      const dates = [...new Set(attempts.map(a => new Date(a.created_at).toDateString()))].sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
      const today = new Date().toDateString();
      const yesterday = new Date(Date.now() - 86400000).toDateString();
      
      let streakCount = 0;
      let checkDate = new Date();
      
      if (dates[0] === today || dates[0] === yesterday) {
         let currentIdx = dates[0] === today ? 0 : 0;
         let checkTime = dates[0] === today ? new Date(today).getTime() : new Date(yesterday).getTime();
         
         while(currentIdx < dates.length) {
            if (new Date(dates[currentIdx]).getTime() === checkTime) {
               streakCount++;
               checkTime -= 86400000;
               currentIdx++;
            } else {
               break;
            }
         }
      }
      currentStreak = streakCount;
    }
    
    // Fetch user_exam_stats
    let userStats: UserExamStat[] = [];
    if (userId) {
      const { data: statsData } = await supabase.from('user_exam_stats').select('*').eq('user_id', userId);
      userStats = statsData || [];
    }

    const classProgress = classes.map(cls => {
      const classSubjects = subjects.filter(s => s.class_id === cls.id).map(s => s.id);
      const classChapters = chapters.filter(c => classSubjects.includes(c.subject_id)).map(c => c.id);
      
      const classTotalQuestions = allQuestions.filter(q => classChapters.includes(q.chapter_id || '')).length;
      
      const classAttemptedQuestions = new Set(
        attempts
          .filter(a => {
            const q = allQuestions.find(qi => qi.id === a.question_id);
            return q && classChapters.includes(q.chapter_id || '');
          })
          .map(a => a.question_id)
      ).size;

      return {
        classId: cls.id,
        className: cls.name,
        totalQuestions: classTotalQuestions,
        completedQuestions: classAttemptedQuestions,
        progress: classTotalQuestions > 0 ? (classAttemptedQuestions / classTotalQuestions) * 100 : 0
      };
    });

    set({
      academicTree,
      exams: examsRes.data || [],
      papers: (papersRes.data || []).map(p => ({ ...p, questionCount: allQuestions.filter(q => q.paper_id === p.id).length })),
      booksSets,
      questions: allQuestions,
      totalSolved,
      streak: currentStreak,
      userExamStats: userStats,
      classProgress,
      attempts,
      isLoading: false,
      isInitialized: true
    });
  },

  fetchQuestionsByChapter: async (chapterId: string) => {
    set({ isLoading: true });
    let allQuestions: any[] = [];
    let from = 0;
    let to = 999;
    let hasMore = true;
    let page = 0;
    while (hasMore && page < 20) {
      page++;
      const { data, error } = await supabase.from('questions_for_students')
        .select('*')
        .eq('chapter_id', chapterId)
        .range(from, to);
      
      if (error) { console.error(error); break; }
      if (data && data.length > 0) {
        allQuestions = [...allQuestions, ...data];
        if (data.length < 1000) hasMore = false;
        else { from += 1000; to += 1000; }
      } else {
        hasMore = false;
      }
    }
    set({ questions: allQuestions, isLoading: false });
  },

  fetchQuestionsByPaper: async (paperId: string) => {
    set({ isLoading: true });
    let allQuestions: any[] = [];
    let from = 0;
    let to = 999;
    let hasMore = true;
    let page = 0;
    while (hasMore && page < 20) {
      page++;
      const { data, error } = await supabase.from('questions_for_students')
        .select('*')
        .eq('paper_id', paperId)
        .range(from, to);
      
      if (error) { console.error(error); break; }
      if (data && data.length > 0) {
        allQuestions = [...allQuestions, ...data];
        if (data.length < 1000) hasMore = false;
        else { from += 1000; to += 1000; }
      } else {
        hasMore = false;
      }
    }
    set({ questions: allQuestions, isLoading: false });
  }
}));
