
import { supabase } from '../lib/supabaseClient';
import { QuizMode, Quiz, GradingResult, StudyBreakdown } from "../types";

// All AI operations now go through Supabase Edge Functions for security
// API keys are stored server-side only

export const generateQuiz = async (sourceText: string, mode: QuizMode, count: number): Promise<Quiz> => {
  const { data, error } = await supabase.functions.invoke('generate-quiz', {
    body: { sourceText, mode, count },
  });

  if (error) {
    console.error('Quiz generation error:', error);
    throw new Error('Failed to generate quiz. Please try again.');
  }

  return data;
};

export const generateIllustration = async (prompt: string): Promise<string | null> => {
  // This feature would need a separate Edge Function
  // For now, return null as it's a nice-to-have feature
  console.warn('Illustration generation not yet implemented in Edge Functions');
  return null;
};

export const generateSpeech = async (text: string): Promise<Uint8Array | null> => {
  // This feature would need a separate Edge Function
  // For now, return null as it's a nice-to-have feature
  console.warn('Speech generation not yet implemented in Edge Functions');
  return null;
};

export const generateStudyBlueprint = async (sourceText: string): Promise<StudyBreakdown> => {
  const { data, error } = await supabase.functions.invoke('generate-blueprint', {
    body: { sourceText },
  });

  if (error) {
    console.error('Blueprint generation error:', error);
    throw new Error('Failed to generate study blueprint. Please try again.');
  }

  return data;
};

export const generateChapterDetails = async (title: string, text: string): Promise<any> => {
  // This would require a separate Edge Function or extending generate-blueprint
  // For now, implements basic structure
  return {
    keyPoints: [{ title: 'Loading...', content: 'Details will load shortly' }],
  };
};

export const askFollowUpQuestion = async (userQuestion: string, title: string, content: string, fullText: string, history: any[]): Promise<string> => {
  // This would require a separate Edge Function for chat functionality
  // For now, return a placeholder
  return "This feature requires additional Edge Function setup. Coming soon!";
};

export const gradeHandwrittenAnswer = async (img: string, q: string, ctx: string): Promise<GradingResult> => {
  const { data, error } = await supabase.functions.invoke('grade-answer', {
    body: { imageData: img, question: q, context: ctx },
  });

  if (error) {
    console.error('Grading error:', error);
    throw new Error('Failed to grade answer. Please try again.');
  }

  return data;
};

export const gradeTypedAnswer = async (answer: string, q: string, ctx: string): Promise<GradingResult> => {
  const { data, error } = await supabase.functions.invoke('grade-answer', {
    body: { typedAnswer: answer, question: q, context: ctx },
  });

  if (error) {
    console.error('Grading error:', error);
    throw new Error('Failed to grade answer. Please try again.');
  }

  return data;
};
