import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Question, QuestionStatus } from '../types';

export interface TestState {
  sessionId: string | null;
  questions: Question[];
  currentQuestionIndex: number;
  timeLeft: number;
  responses: Record<string, {
    selected_option: any;
    status: QuestionStatus;
    time_spent: number;
  }>;
  isActive: boolean;
  initTest: (sessionId: string, questions: Question[], durationSeconds: number) => void;
  setCurrentIndex: (index: number) => void;
  nextQuestion: () => void;
  prevQuestion: () => void;
  answerQuestion: (questionId: string, option: any) => void;
  markForReview: (questionId: string) => void;
  clearResponse: (questionId: string) => void;
  tickTimer: () => void;
  endTest: () => void;
}

export const useTestStore = create<TestState>()(
  persist(
    (set, get) => ({
      sessionId: null,
      questions: [],
      currentQuestionIndex: 0,
      timeLeft: 0,
      responses: {},
      isActive: false,

      initTest: (sessionId, questions, durationSeconds) => {
        const initialResponses: Record<string, any> = {};
        questions.forEach(q => {
          initialResponses[q.id] = { selected_option: null, status: 'not_visited', time_spent: 0 };
        });
        
        if (questions.length > 0) {
          initialResponses[questions[0].id].status = 'visited';
        }

        set({
          sessionId,
          questions,
          currentQuestionIndex: 0,
          timeLeft: durationSeconds,
          responses: initialResponses,
          isActive: true
        });
      },

      setCurrentIndex: (index) => {
        set((state) => {
          const newResponses = { ...state.responses };
          const targetQId = state.questions[index]?.id;
          if (targetQId && newResponses[targetQId]?.status === 'not_visited') {
            newResponses[targetQId] = { ...newResponses[targetQId], status: 'visited' };
          }
          return { currentQuestionIndex: index, responses: newResponses };
        });
      },

      nextQuestion: () => {
        const { currentQuestionIndex, questions } = get();
        if (currentQuestionIndex < questions.length - 1) {
          get().setCurrentIndex(currentQuestionIndex + 1);
        }
      },

      prevQuestion: () => {
        const { currentQuestionIndex } = get();
        if (currentQuestionIndex > 0) {
          get().setCurrentIndex(currentQuestionIndex - 1);
        }
      },

      answerQuestion: (questionId, option) => {
        set((state) => {
          const currentStatus = state.responses[questionId]?.status;
          let newStatus: QuestionStatus = 'answered';
          
          if (currentStatus === 'marked_for_review' || currentStatus === 'answered_and_marked') {
            newStatus = 'answered_and_marked';
          }
          
          return {
            responses: {
              ...state.responses,
              [questionId]: {
                ...state.responses[questionId],
                selected_option: option,
                status: newStatus
              }
            }
          };
        });
      },

      markForReview: (questionId) => {
        set((state) => {
          const resp = state.responses[questionId];
          const hasAnswer = resp?.selected_option !== null && resp?.selected_option !== undefined;
          return {
            responses: {
              ...state.responses,
              [questionId]: {
                ...resp,
                status: hasAnswer ? 'answered_and_marked' : 'marked_for_review'
              }
            }
          };
        });
      },

      clearResponse: (questionId) => {
        set((state) => ({
          responses: {
            ...state.responses,
            [questionId]: {
              ...state.responses[questionId],
              selected_option: null,
              status: 'visited'
            }
          }
        }));
      },

      tickTimer: () => {
        const { currentQuestionIndex, questions, isActive } = get();
        if (!isActive) return;

        set((state) => {
          if (state.timeLeft <= 0) {
             return { isActive: false, timeLeft: 0 };
          }

          const qId = questions[currentQuestionIndex]?.id;
          const newResponses = { ...state.responses };
          
          if (qId && newResponses[qId]) {
            newResponses[qId] = {
               ...newResponses[qId],
               time_spent: (newResponses[qId].time_spent || 0) + 1
            };
          }

          return { timeLeft: state.timeLeft - 1, responses: newResponses };
        });
      },

      endTest: () => {
        set({ isActive: false, sessionId: null, questions: [], responses: {}, timeLeft: 0 });
        // Clear persisted state on test end
        try { sessionStorage.removeItem('test-session-storage'); } catch {}
      }
    }),
    {
      name: 'test-session-storage',
      // Use sessionStorage instead of localStorage — dies when tab closes
      storage: {
        getItem: (name) => {
          const str = sessionStorage.getItem(name);
          return str ? JSON.parse(str) : null;
        },
        setItem: (name, value) => sessionStorage.setItem(name, JSON.stringify(value)),
        removeItem: (name) => sessionStorage.removeItem(name),
      },
      // Don't persist timeLeft — it must come from the live timer, not storage
      partialize: (state) => ({
        sessionId: state.sessionId,
        questions: state.questions,
        currentQuestionIndex: state.currentQuestionIndex,
        responses: state.responses,
        isActive: state.isActive,
      } as TestState),
    }
  )
);
