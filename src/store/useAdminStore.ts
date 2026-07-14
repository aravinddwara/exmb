import { create } from 'zustand';
import { supabase } from '../lib/supabase';

export type ExamType = string;
export type QuestionType = 'SINGLE_CHOICE' | 'MULTIPLE_CHOICE' | 'NUMERICAL' | 'INTEGER' | 'MATRIX_MATCH';

export interface ClassData {
  id: string;
  name: string;
  order_index?: number;
}

export interface SubjectData {
  id: string;
  name: string;
  class_id: string;
  order_index?: number;
}

export interface ChapterData {
  id: string;
  name: string;
  subject_id: string;
  order_index?: number;
}

export interface TopicData {
  id: string;
  name: string;
  chapter_id: string;
  order_index?: number;
}

export interface ExamData {
  id: string;
  type: ExamType;
  name: string;
  class_ids?: string[];
  subject_ids?: string[];
  duration_minutes?: number;
  order_index?: number;
}

export interface PaperData {
  id: string;
  name: string;
  exam_id: string;
  year: number | null;
  status: 'Published' | 'Draft';
  questionCount?: number;
  order_index?: number;
}

export interface QuestionTypeData {
  id: string;
  name: string;
  description?: string;
  order_index?: number;
}

export interface BookSetData {
  id: string;
  name: string;
  description?: string;
  order_index?: number;
}

export interface QuestionData {
  id: string;
  text: string;
  question_images?: any;
  option_1?: string;
  option_1_image?: string;
  option_2?: string;
  option_2_image?: string;
  option_3?: string;
  option_3_image?: string;
  option_4?: string;
  option_4_image?: string;
  options: any;
  correct_option: number | null;
  explanation?: string;
  explanation_images?: any;
  type: string;
  difficulty: string;
  positive_marks: number;
  negative_marks: number;
  chapter_id: string;
  topic_id?: string | null;
  paper_id: string | null;
  book_set_id?: string | null;
  question_type_id?: string | null;
  status: 'Published' | 'Draft';
  created_at?: string;
}

interface AdminState {
  classes: ClassData[];
  subjects: SubjectData[];
  chapters: ChapterData[];
  topics: TopicData[];
  exams: ExamData[];
  papers: PaperData[];
  questions: QuestionData[];
  questionTypes: QuestionTypeData[];
  booksSets: BookSetData[];
  isLoading: boolean;
  
  fetchCoreData: () => Promise<void>;
  fetchAllQuestions: () => Promise<void>;
  fetchPapers: (examId: string) => Promise<void>;
  fetchQuestionsForPaper: (paperId: string) => Promise<void>;
  fetchQuestionsForChapter: (chapterId: string) => Promise<void>;

  addExam: (exam: ExamData) => Promise<void>;
  updateExam: (id: string, exam: Partial<ExamData>) => Promise<void>;
  reorderExams: (startIndex: number, endIndex: number) => void;
  deleteExam: (id: string) => Promise<void>;

  addClass: (cls: ClassData) => Promise<void>;
  updateClass: (id: string, name: string) => Promise<void>;
  reorderClasses: (startIndex: number, endIndex: number) => void;
  deleteClass: (id: string) => Promise<void>;

  addSubject: (subject: SubjectData) => Promise<void>;
  updateSubject: (id: string, name: string) => Promise<void>;
  reorderSubjects: (startIndex: number, endIndex: number, classId: string) => void;
  deleteSubject: (id: string) => Promise<void>;

  addChapter: (chapter: ChapterData) => Promise<void>;
  updateChapter: (id: string, name: string) => Promise<void>;
  reorderChapters: (startIndex: number, endIndex: number, subjectId: string) => void;
  deleteChapter: (id: string) => Promise<void>;

  addTopic: (topic: TopicData) => Promise<void>;
  updateTopic: (id: string, name: string) => Promise<void>;
  reorderTopics: (startIndex: number, endIndex: number, chapterId: string) => void;
  deleteTopic: (id: string) => Promise<void>;

  addPaper: (paper: PaperData) => Promise<void>;
  updatePaper: (id: string, paper: Partial<PaperData>) => Promise<void>;
  deletePaper: (id: string) => Promise<void>;
  reorderPapers: (startIndex: number, endIndex: number, examId: string) => void;
  
  addQuestion: (question: QuestionData) => Promise<void>;
  addQuestionsBulk: (questions: QuestionData[]) => Promise<void>;
  updateQuestion: (id: string, question: Partial<QuestionData>) => Promise<void>;
  deleteQuestion: (id: string) => Promise<void>;

  addQuestionType: (qt: QuestionTypeData) => Promise<void>;
  deleteQuestionType: (id: string) => Promise<void>;
  reorderQuestionTypes: (startIndex: number, endIndex: number) => void;
  addBookSet: (bs: BookSetData) => Promise<void>;
  deleteBookSet: (id: string) => Promise<void>;
  reorderBookSets: (startIndex: number, endIndex: number) => void;
}

export const useAdminStore = create<AdminState>((set, get) => ({
  classes: [],
  subjects: [],
  chapters: [],
  topics: [],
  exams: [],
  papers: [],
  questions: [],
  questionTypes: [],
  booksSets: [],
  isLoading: false,

  fetchCoreData: async () => {
    set({ isLoading: true });
    try {
      const [clsRes, subRes, chapRes, topicRes, examRes, paperRes, qtRes, bsRes] = await Promise.all([
        supabase.from('classes').select('*'),
        supabase.from('subjects').select('*'),
        supabase.from('chapters').select('*'),
        supabase.from('topics').select('*'),
        supabase.from('exams').select('*'),
        supabase.from('papers').select('*'),
        supabase.from('question_types').select('*'),
        supabase.from('books_sets').select('*')
      ]);

      set({
        classes: (clsRes.data || []).sort((a: any, b: any) => (a.order_index || 0) - (b.order_index || 0)),
        subjects: (subRes.data || []).sort((a: any, b: any) => (a.order_index || 0) - (b.order_index || 0)),
        chapters: (chapRes.data || []).sort((a: any, b: any) => (a.order_index || 0) - (b.order_index || 0)),
        topics: (topicRes.data || []).sort((a: any, b: any) => (a.order_index || 0) - (b.order_index || 0)),
        exams: (examRes.data || []).sort((a: any, b: any) => (a.order_index || 0) - (b.order_index || 0)),
        papers: (paperRes.data || []).sort((a: any, b: any) => (a.order_index || 0) - (b.order_index || 0)),
        questionTypes: (qtRes.data || []).sort((a: any, b: any) => (a.order_index || 0) - (b.order_index || 0)),
        booksSets: (bsRes.data || []).sort((a: any, b: any) => (a.order_index || 0) - (b.order_index || 0))
      });
    } catch (error) {
      console.error('Error fetching core data:', error);
    } finally {
      set({ isLoading: false });
    }
  },

  fetchAllQuestions: async () => {
    set({ isLoading: true });
    try {
      let allData: any[] = [];
      let from = 0;
      let to = 999;
      let hasMore = true;
      const MAX_PAGES = 20; // Safety guard against infinite loops

      let page = 0;
      while (hasMore && page < MAX_PAGES) {
        page++;
        const { data, error } = await supabase.from('questions').select('*').range(from, to);
        if (error) throw error;
        
        if (data && data.length > 0) {
          allData = [...allData, ...data];
          if (data.length < 1000) {
             hasMore = false;
          } else {
             from += 1000;
             to += 1000;
          }
        } else {
          hasMore = false;
        }
      }
      set({ questions: allData });
    } catch (error: any) {
      console.error('Error fetching all questions:', error);
    } finally {
      set({ isLoading: false });
    }
  },

  fetchPapers: async (examId: string) => {
    set({ isLoading: true });
    try {
      const { data } = await supabase.from('papers').select('*').eq('exam_id', examId);
      set({ papers: data || [] });
    } catch (error) {
      console.error('Error fetching papers:', error);
    } finally {
      set({ isLoading: false });
    }
  },

  fetchQuestionsForPaper: async (paperId: string) => {
    set({ isLoading: true });
    try {
      let allQuestions: any[] = [];
      let from = 0;
      let to = 999;
      let hasMore = true;
      let page = 0;
      while (hasMore && page < 20) {
        page++;
        const { data, error } = await supabase.from('questions').select('*')
          .eq('paper_id', paperId)
          .range(from, to);
        if (error) throw error;
        if (data && data.length > 0) {
          allQuestions = [...allQuestions, ...data];
          if (data.length < 1000) hasMore = false;
          else { from += 1000; to += 1000; }
        } else {
          hasMore = false;
        }
      }
      set({ questions: allQuestions });
    } catch (error) {
      console.error('Error fetching questions for paper:', error);
    } finally {
      set({ isLoading: false });
    }
  },

  fetchQuestionsForChapter: async (chapterId: string) => {
    set({ isLoading: true });
    try {
      let allQuestions: any[] = [];
      let from = 0;
      let to = 999;
      let hasMore = true;
      let page = 0;
      while (hasMore && page < 20) {
        page++;
        const { data, error } = await supabase.from('questions').select('*')
          .eq('chapter_id', chapterId)
          .range(from, to);
        if (error) throw error;
        if (data && data.length > 0) {
          allQuestions = [...allQuestions, ...data];
          if (data.length < 1000) hasMore = false;
          else { from += 1000; to += 1000; }
        } else {
          hasMore = false;
        }
      }
      set({ questions: allQuestions });
    } catch (error) {
      console.error('Error fetching questions for chapter:', error);
    } finally {
      set({ isLoading: false });
    }
  },

  addClass: async (cls) => {
    const { error } = await supabase.from('classes').insert([cls]);
    if (error) throw error;
    set({ classes: [...get().classes, cls] });
  },

  updateClass: async (id, name) => {
    const { error } = await supabase.from('classes').update({ name }).eq('id', id);
    if (error) throw error;
    set({ classes: get().classes.map(c => c.id === id ? { ...c, name } : c) });
  },

  reorderClasses: async (startIndex, endIndex) => {
    const newClasses = Array.from(get().classes);
    const [removed] = newClasses.splice(startIndex, 1);
    newClasses.splice(endIndex, 0, removed);
    
    const updatedClasses = newClasses.map((cls, index) => ({ ...cls, order_index: index }));
    set({ classes: updatedClasses });

    try {
      await Promise.all(updatedClasses.map(c => 
        supabase.from('classes').update({ order_index: c.order_index }).eq('id', c.id)
      ));
    } catch (error) {
      console.error('Error updating class order:', error);
    }
  },

  reorderSubjects: async (startIndex, endIndex, classId) => {
    const allSubjects = get().subjects;
    const classSubjects = allSubjects.filter(s => s.class_id === classId);
    const otherSubjects = allSubjects.filter(s => s.class_id !== classId);
    
    const [removed] = classSubjects.splice(startIndex, 1);
    classSubjects.splice(endIndex, 0, removed);
    
    const updatedClassSubjects = classSubjects.map((s, index) => ({ ...s, order_index: index }));
    set({ subjects: [...updatedClassSubjects, ...otherSubjects] });

    try {
      await Promise.all(updatedClassSubjects.map(s => 
        supabase.from('subjects').update({ order_index: s.order_index }).eq('id', s.id)
      ));
    } catch (error) {
      console.error('Error updating subject order:', error);
    }
  },

  reorderChapters: async (startIndex, endIndex, subjectId) => {
    const allChapters = get().chapters;
    const subjectChapters = allChapters.filter(c => c.subject_id === subjectId);
    const otherChapters = allChapters.filter(c => c.subject_id !== subjectId);
    
    const [removed] = subjectChapters.splice(startIndex, 1);
    subjectChapters.splice(endIndex, 0, removed);
    
    const updatedSubjectChapters = subjectChapters.map((c, index) => ({ ...c, order_index: index }));
    set({ chapters: [...updatedSubjectChapters, ...otherChapters] });

    try {
      await Promise.all(updatedSubjectChapters.map(c => 
        supabase.from('chapters').update({ order_index: c.order_index }).eq('id', c.id)
      ));
    } catch (error) {
      console.error('Error updating chapter order:', error);
    }
  },

  reorderExams: async (startIndex, endIndex) => {
    const newExams = Array.from(get().exams);
    const [removed] = newExams.splice(startIndex, 1);
    newExams.splice(endIndex, 0, removed);
    
    const updatedExams = newExams.map((e, index) => ({ ...e, order_index: index }));
    set({ exams: updatedExams });

    try {
      await Promise.all(updatedExams.map(e => 
        supabase.from('exams').update({ order_index: e.order_index }).eq('id', e.id)
      ));
    } catch (error) {
      console.error('Error updating exam order:', error);
    }
  },

  reorderPapers: async (startIndex, endIndex, examId) => {
    const allPapers = get().papers;
    const examPapers = allPapers.filter(p => p.exam_id === examId);
    const otherPapers = allPapers.filter(p => p.exam_id !== examId);
    
    const [removed] = examPapers.splice(startIndex, 1);
    examPapers.splice(endIndex, 0, removed);
    
    const updatedExamPapers = examPapers.map((p, index) => ({ ...p, order_index: index }));
    set({ papers: [...updatedExamPapers, ...otherPapers] });

    try {
      await Promise.all(updatedExamPapers.map(p => 
        supabase.from('papers').update({ order_index: p.order_index }).eq('id', p.id)
      ));
    } catch (error) {
      console.error('Error updating paper order:', error);
    }
  },

  reorderBookSets: async (startIndex, endIndex) => {
    const newBookSets = Array.from(get().booksSets);
    const [removed] = newBookSets.splice(startIndex, 1);
    newBookSets.splice(endIndex, 0, removed);
    
    const updatedBookSets = newBookSets.map((b, index) => ({ ...b, order_index: index }));
    set({ booksSets: updatedBookSets });

    try {
      await Promise.all(updatedBookSets.map(b => 
        supabase.from('books_sets').update({ order_index: b.order_index }).eq('id', b.id)
      ));
    } catch (error) {
      console.error('Error updating book set order:', error);
    }
  },

  reorderQuestionTypes: async (startIndex, endIndex) => {
    const newQuestionTypes = Array.from(get().questionTypes);
    const [removed] = newQuestionTypes.splice(startIndex, 1);
    newQuestionTypes.splice(endIndex, 0, removed);
    
    const updatedQuestionTypes = newQuestionTypes.map((q, index) => ({ ...q, order_index: index }));
    set({ questionTypes: updatedQuestionTypes });

    try {
      await Promise.all(updatedQuestionTypes.map(q => 
        supabase.from('question_types').update({ order_index: q.order_index }).eq('id', q.id)
      ));
    } catch (error) {
      console.error('Error updating question type order:', error);
    }
  },

  deleteClass: async (id) => {
    const { error } = await supabase.from('classes').delete().eq('id', id);
    if (error) throw error;
    set({ classes: get().classes.filter(c => c.id !== id) });
  },

  addSubject: async (subject) => {
    const { error } = await supabase.from('subjects').insert([subject]);
    if (error) throw error;
    set({ subjects: [...get().subjects, subject] });
  },

  updateSubject: async (id, name) => {
    const { error } = await supabase.from('subjects').update({ name }).eq('id', id);
    if (error) throw error;
    set({ subjects: get().subjects.map(s => s.id === id ? { ...s, name } : s) });
  },

  deleteSubject: async (id) => {
    const { error } = await supabase.from('subjects').delete().eq('id', id);
    if (error) throw error;
    set({ subjects: get().subjects.filter(s => s.id !== id) });
  },

  addChapter: async (chapter) => {
    const { error } = await supabase.from('chapters').insert([chapter]);
    if (error) throw error;
    set({ chapters: [...get().chapters, chapter] });
  },

  updateChapter: async (id, name) => {
    const { error } = await supabase.from('chapters').update({ name }).eq('id', id);
    if (error) throw error;
    set({ chapters: get().chapters.map(c => c.id === id ? { ...c, name } : c) });
  },

  deleteChapter: async (id) => {
    const { error } = await supabase.from('chapters').delete().eq('id', id);
    if (error) throw error;
    set({ chapters: get().chapters.filter(c => c.id !== id) });
  },

  addTopic: async (topic) => {
    const { error } = await supabase.from('topics').insert([topic]);
    if (error) throw error;
    set({ topics: [...get().topics, topic] });
  },

  updateTopic: async (id, name) => {
    const { error } = await supabase.from('topics').update({ name }).eq('id', id);
    if (error) throw error;
    set({ topics: get().topics.map(t => t.id === id ? { ...t, name } : t) });
  },

  deleteTopic: async (id) => {
    const { error } = await supabase.from('topics').delete().eq('id', id);
    if (error) throw error;
    set({ topics: get().topics.filter(t => t.id !== id) });
  },

  reorderTopics: async (startIndex, endIndex, chapterId) => {
    const allTopics = get().topics;
    const chapterTopics = allTopics.filter(t => t.chapter_id === chapterId);
    const otherTopics = allTopics.filter(t => t.chapter_id !== chapterId);
    
    const [removed] = chapterTopics.splice(startIndex, 1);
    chapterTopics.splice(endIndex, 0, removed);
    
    const updatedTopics = chapterTopics.map((t, index) => ({ ...t, order_index: index }));
    set({ topics: [...updatedTopics, ...otherTopics] });

    try {
      await Promise.all(updatedTopics.map(t => 
        supabase.from('topics').update({ order_index: t.order_index }).eq('id', t.id)
      ));
    } catch (error) {
      console.error('Error updating topic order:', error);
    }
  },

  addExam: async (exam) => {
    const { error } = await supabase.from('exams').insert([exam]);
    if (error) throw error;
    set({ exams: [...get().exams, exam] });
  },

  updateExam: async (id, updates) => {
    const { error } = await supabase.from('exams').update(updates).eq('id', id);
    if (error) throw error;
    set({ exams: get().exams.map(e => e.id === id ? { ...e, ...updates } : e) });
  },

  deleteExam: async (id) => {
    const { error } = await supabase.from('exams').delete().eq('id', id);
    if (error) throw error;
    set({ exams: get().exams.filter(e => e.id !== id) });
  },

  addPaper: async (paper) => {
    const { error } = await supabase.from('papers').insert([paper]);
    if (error) throw error;
    set({ papers: [...get().papers, paper] });
  },

  updatePaper: async (id, updates) => {
    const { error } = await supabase.from('papers').update(updates).eq('id', id);
    if (error) throw error;
    set({ papers: get().papers.map(p => p.id === id ? { ...p, ...updates } : p) });
  },

  deletePaper: async (id) => {
    const { error } = await supabase.from('papers').delete().eq('id', id);
    if (error) throw error;
    set({ papers: get().papers.filter(p => p.id !== id) });
  },

  addQuestion: async (question) => {
    const { error } = await supabase.from('questions').insert([question]);
    if (error) throw error;
    set({ questions: [...get().questions, question] });
  },

  addQuestionsBulk: async (questionsArray) => {
    const chunkSize = 500;
    for (let i = 0; i < questionsArray.length; i += chunkSize) {
      const chunk = questionsArray.slice(i, i + chunkSize);
      const { error } = await supabase.from('questions').upsert(chunk, { onConflict: 'id' });
      if (error) throw error;
    }
    
    // Instead of naive append, merge to handle upserts locally, or just re-fetch. 
    // We'll merge by ID.
    set(state => {
      const existingMap = new Map(state.questions.map(q => [q.id, q]));
      questionsArray.forEach(q => existingMap.set(q.id, q));
      return { questions: Array.from(existingMap.values()) };
    });
  },

  updateQuestion: async (id, updates) => {
    const { error } = await supabase.from('questions').update(updates).eq('id', id);
    if (error) throw error;
    set({ questions: get().questions.map(q => q.id === id ? { ...q, ...updates } : q) });
  },

  deleteQuestion: async (id) => {
    const { error } = await supabase.from('questions').delete().eq('id', id);
    if (error) throw error;
    set({ questions: get().questions.filter(q => q.id !== id) });
  },

  addQuestionType: async (qt) => {
    const { error } = await supabase.from('question_types').insert([qt]);
    if (error) throw error;
    set({ questionTypes: [...get().questionTypes, qt] });
  },

  deleteQuestionType: async (id) => {
    const { error } = await supabase.from('question_types').delete().eq('id', id);
    if (error) throw error;
    set({ questionTypes: get().questionTypes.filter(qt => qt.id !== id) });
  },

  addBookSet: async (bs) => {
    const { error } = await supabase.from('books_sets').insert([bs]);
    if (error) throw error;
    set({ booksSets: [...get().booksSets, bs] });
  },

  deleteBookSet: async (id) => {
    const { error } = await supabase.from('books_sets').delete().eq('id', id);
    if (error) throw error;
    set({ booksSets: get().booksSets.filter(bs => bs.id !== id) });
  }
}));
