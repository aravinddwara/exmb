export type Stream = string;
export type Subject = string;
export type QuestionArchetype = 'mcq' | 'assertion_reason' | 'matrix_match';
export type Difficulty = 'easy' | 'medium' | 'hard';
export type QuestionStatus = 'answered' | 'marked_for_review' | 'answered_and_marked' | 'not_visited' | 'visited';

export interface UserProfile {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  target_stream: Stream | null;
  streak_counter: number;
}

export interface Question {
  id: string;
  exam_type: Stream;
  subject: Subject;
  chapter: string;
  topic?: string;
  year?: number;
  archetype: QuestionArchetype;
  question_text: string;
  question_image_url?: string;
  options: any[];
  correct_option: any;
  explanation_text?: string;
  explanation_image_url?: string;
  difficulty: Difficulty;
}

export interface TestSession {
  id: string;
  user_id: string;
  session_type: 'custom' | 'pyq_mock';
  status: 'in_progress' | 'completed' | 'abandoned';
  time_left: number;
  started_at: string;
  completed_at?: string;
  metrics?: any;
}

export interface UserResponse {
  id: string;
  test_session_id: string;
  question_id: string;
  user_id: string;
  selected_option: any;
  status: QuestionStatus;
  time_spent: number;
}
