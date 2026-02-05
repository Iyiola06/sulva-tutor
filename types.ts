
export enum QuizMode {
  MULTIPLE_CHOICE = 'Multiple Choice',
  FILL_GAP = 'Fill in the Gap',
  THEORY = 'Theory'
}

export type AppView = 'main' | 'privacy' | 'terms' | 'help';

export interface SavedMaterial {
  id: string;
  name: string;
  content: string;
  timestamp: number;
  type: 'file' | 'text';
}

export interface QuizQuestion {
  question: string;
  options?: string[];
  correctAnswer?: string | number;
  explanation: string;
  keyConcepts?: string[];
}

export interface Quiz {
  mode: QuizMode;
  questions: QuizQuestion[];
}

export interface GradingResult {
  ocrText: string;
  score: number;
  feedback: string;
  strengths: string[];
  weaknesses: string[];
  noHandwritingDetected?: boolean;
}

export interface SessionScore {
  questionIdx: number;
  score: number; // 0 to 100
  userAnswer: string;
  isCorrect: boolean;
}

export interface QuizSessionResult {
  averageScore: number;
  scores: SessionScore[];
  mode: QuizMode;
  timestamp: number;
}

export interface StudySession {
  id: string;
  sourceText: string;
  quiz?: Quiz;
  timestamp: number;
}
