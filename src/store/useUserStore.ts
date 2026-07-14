import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { ExamData, PaperData, QuestionData } from './useAdminStore';

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

    // Fetch aggregated question counts from the new safe view
    const countsRes = await supabase.from('academic_question_counts').select('*');
    const countsData = countsRes.data || [];

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
          // Chapter count is the sum of all its topic counts (and questions without a topic)
          const chapQuestionsCount = countsData
            .filter(c => c.chapter_id === chap.id)
            .reduce((sum, c) => sum + Number(c.question_count), 0);
            
          return {
            id: chap.id,
            name: chap.name,
            type: 'Chapter',
            questionCount: chapQuestionsCount,
            children: topics.filter(t => t.chapter_id === chap.id).map(topic => {
              const topicQuestionsCount = countsData
                .find(c => c.topic_id === topic.id)?.question_count || 0;
              return {
                id: topic.id,
                name: topic.name,
                type: 'Topic',
                questionCount: Number(topicQuestionsCount)
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
      const checkDate = new Date();
      
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



    // Let's just fetch the chapter_ids for the attempted questions
    const attemptedQuestionIds = [...new Set(attempts.map((a: any) => a.question_id))];
    let attemptedQuestionsMeta: any[] = [];
    if (attemptedQuestionIds.length > 0) {
      const { data: qMeta } = await supabase.from('questions_for_students')
        .select('id, chapter_id')
        .in('id', attemptedQuestionIds);
      attemptedQuestionsMeta = qMeta || [];
    }

    const classProgress = classes.map(cls => {
      const classSubjects = subjects.filter(s => s.class_id === cls.id).map(s => s.id);
      const classChapters = chapters.filter(c => classSubjects.includes(c.subject_id)).map(c => c.id);
      
      const classTotalQuestions = countsData
        .filter(c => classChapters.includes(c.chapter_id))
        .reduce((sum, c) => sum + Number(c.question_count), 0);
      
      const classAttemptedQuestions = new Set(
        attempts
          .filter((a: any) => {
            const q = attemptedQuestionsMeta.find(qi => qi.id === a.question_id);
            return q && classChapters.includes(q.chapter_id || '');
          })
          .map((a: any) => a.question_id)
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
      papers: (papersRes.data || []).map(p => ({ ...p, questionCount: 0 })), // We will load paper counts dynamically if needed
      booksSets,
      questions: [], // No longer storing all questions globally
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
