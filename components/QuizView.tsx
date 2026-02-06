
import React, { useState, useEffect, useRef } from 'react';
import { Quiz, QuizMode, GradingResult, SessionScore } from '../types';
import CameraCapture from './CameraCapture';
import VoiceButton from './VoiceButton';
import { gradeHandwrittenAnswer, gradeTypedAnswer, generateIllustration } from '../services/aiService';

interface QuizViewProps {
  quiz: Quiz;
  sourceText: string;
  onRestart: () => void;
}

const SulvaLogo = ({ className = "w-8 h-8", fillColor = "currentColor" }) => (
  <svg viewBox="0 0 100 100" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M50 50 L85 50 A35 35 0 0 0 50 15 Z" fill={fillColor} />
    <path d="M50 50 L15 50 A35 35 0 0 0 50 85 Z" fill={fillColor} />
  </svg>
);

const GRADING_MESSAGES = [
  "Enhancing ink contrast...",
  "Transcribing handwriting...",
  "Contextualizing response...",
  "Consulting source material...",
  "Applying grading rubric...",
  "Synthesizing feedback..."
];

const QuizView: React.FC<QuizViewProps> = ({ quiz, sourceText, onRestart }) => {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<number, any>>({});
  const [sessionScores, setSessionScores] = useState<SessionScore[]>([]);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [theoryInputMode, setTheoryInputMode] = useState<'none' | 'camera' | 'typing'>('none');
  const [gradingResult, setGradingResult] = useState<GradingResult | null>(null);
  const [isGrading, setIsGrading] = useState(false);
  const [gradingStep, setGradingStep] = useState(0);
  const [showExplanation, setShowExplanation] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const [typedAnswer, setTypedAnswer] = useState('');
  const [illustrationUrl, setIllustrationUrl] = useState<string | null>(null);
  const [isIllustrating, setIsIllustrating] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const questions = quiz.questions || [];
  const question = questions[currentIdx];
  const isLast = currentIdx === questions.length - 1;
  const progress = questions.length > 0 ? ((currentIdx + 1) / questions.length) * 100 : 0;

  useEffect(() => {
    let interval: any;
    if (isGrading) {
      setGradingStep(0);
      interval = setInterval(() => {
        setGradingStep(prev => (prev + 1) % GRADING_MESSAGES.length);
      }, 1500);
    }
    return () => clearInterval(interval);
  }, [isGrading]);

  const triggerIllustration = async (qText: string) => {
    setIsIllustrating(true);
    setIllustrationUrl(null);
    try {
      const url = await generateIllustration(qText);
      setIllustrationUrl(url);
    } finally {
      setIsIllustrating(false);
    }
  };

  const calculateAndAddScore = (userAnswer: any) => {
    let score = 0;
    let isCorrect = false;

    if (quiz.mode === QuizMode.MULTIPLE_CHOICE) {
      isCorrect = userAnswer === question.correctAnswer;
      score = isCorrect ? 100 : 0;
    } else if (quiz.mode === QuizMode.FILL_GAP) {
      isCorrect = userAnswer.toLowerCase().trim() === (question.correctAnswer as string).toLowerCase().trim();
      score = isCorrect ? 100 : 0;
    } else if (quiz.mode === QuizMode.THEORY) {
      score = (userAnswer as GradingResult).score;
      isCorrect = score >= 70;
    }

    const newScore: SessionScore = {
      questionIdx: currentIdx,
      score,
      userAnswer: typeof userAnswer === 'object' ? (userAnswer.ocrText || 'Written Answer') : String(userAnswer),
      isCorrect
    };

    setSessionScores(prev => [...prev, newScore]);
    triggerIllustration(question.question);
  };

  const handleMCQSelect = (idx: number) => {
    setAnswers({ ...answers, [currentIdx]: idx });
    calculateAndAddScore(idx);
    setShowExplanation(true);
  };

  const handleGapSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!typedAnswer.trim()) return;
    setAnswers({ ...answers, [currentIdx]: typedAnswer });
    calculateAndAddScore(typedAnswer);
    setShowExplanation(true);
  };

  const handleCapture = async (base64: string) => {
    setIsCameraOpen(false);
    setIsGrading(true);
    setGradingResult(null);
    try {
      const result = await gradeHandwrittenAnswer(base64, question.question, sourceText);
      setGradingResult(result);
      setAnswers({ ...answers, [currentIdx]: result });
      calculateAndAddScore(result);
    } finally {
      setIsGrading(false);
    }
  };

  const handleTypedTheorySubmit = async () => {
    if (!typedAnswer.trim()) return;
    setIsGrading(true);
    setTheoryInputMode('none');
    try {
      const result = await gradeTypedAnswer(typedAnswer, question.question, sourceText);
      setGradingResult(result);
      setAnswers({ ...answers, [currentIdx]: result });
      calculateAndAddScore(result);
    } finally {
      setIsGrading(false);
    }
  };

  const isCurrentAnswered = () => answers[currentIdx] !== undefined;

  const nextQuestion = () => {
    if (!isLast) {
      setCurrentIdx(currentIdx + 1);
      setShowExplanation(false);
      setGradingResult(null);
      setTypedAnswer('');
      setIllustrationUrl(null);
      setTheoryInputMode('none');
    } else {
      setShowSummary(true);
    }
  };

  if (showSummary) {
    const avgScore = sessionScores.length > 0 ? Math.round(sessionScores.reduce((acc, s) => acc + s.score, 0) / sessionScores.length) : 0;
    const correctCount = sessionScores.filter(s => s.isCorrect).length;
    return (
      <div className="max-w-4xl mx-auto px-2 animate-in fade-in zoom-in-95 duration-700 pb-12">
        <div className="bg-white rounded-[2rem] shadow-2xl border border-slate-50 overflow-hidden">
          <div className="p-8 text-center border-b border-slate-50 bg-brand-50/30">
            <h2 className="text-2xl font-black text-slate-900 mb-2">Session Summary</h2>
            <p className="text-brand-600 font-bold uppercase text-[9px] tracking-[0.3em]">Knowledge Retained</p>
          </div>
          <div className="p-12">
            <div className="flex flex-col md:flex-row items-center justify-around gap-8 mb-16">
              <div className="relative w-48 h-48">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                  <circle cx="18" cy="18" r="16" fill="none" className="stroke-slate-100" strokeWidth="3" />
                  <circle cx="18" cy="18" r="16" fill="none" className="stroke-brand-600" strokeWidth="3" strokeDasharray={`${avgScore}, 100`} strokeLinecap="round" />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-5xl font-black text-slate-900">{avgScore}%</span>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Score</span>
                </div>
              </div>
              <div className="text-center md:text-left space-y-4">
                <h3 className="text-4xl font-black text-brand-600">Great Job</h3>
                <p className="text-lg font-bold text-slate-500">{correctCount} of {questions.length} questions correct.</p>
              </div>
            </div>
            <button onClick={onRestart} className="w-full h-14 bg-brand-600 text-white font-black rounded-xl hover:bg-brand-700 shadow-xl transition-all active:scale-95 flex items-center justify-center gap-3">
              <i className="fas fa-redo-alt"></i> Try Another Session
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4">
      <div className="mb-10 text-center relative">
        <div className="absolute left-0 top-1/2 -translate-y-1/2 flex gap-2">
           <button onClick={onRestart} className="w-10 h-10 rounded-xl bg-white border border-slate-100 text-slate-400 hover:text-red-500 transition-all shadow-sm flex items-center justify-center">
            <i className="fas fa-times"></i>
          </button>
        </div>
        <div className="inline-flex flex-col items-center">
          <span className="text-[10px] font-black uppercase tracking-[0.3em] text-brand-600 mb-1">{quiz.mode}</span>
          <h2 className="text-2xl font-black text-slate-900">{currentIdx + 1} of {questions.length}</h2>
        </div>
      </div>

      <div className="w-full h-1.5 bg-slate-100 rounded-full mb-12 overflow-hidden shadow-inner">
        <div className="h-full bg-brand-600 rounded-full transition-all duration-700" style={{ width: `${progress}%` }} />
      </div>

      <div className="bg-white rounded-[2.5rem] shadow-2xl border border-slate-50 overflow-hidden flex flex-col">
        <div className="p-14 flex-grow">
          <div className="flex items-start justify-between gap-4 mb-8">
            <h3 className="text-3xl font-extrabold text-slate-900 leading-tight">
              {question?.question}
            </h3>
            <VoiceButton text={question?.question} />
          </div>

          {quiz.mode === QuizMode.MULTIPLE_CHOICE && (
            <div className="grid grid-cols-1 gap-4">
              {question?.options?.map((option, idx) => {
                const isSelected = answers[currentIdx] === idx;
                const isCorrect = idx === question.correctAnswer;
                let btnClass = "w-full text-left p-6 rounded-2xl border-2 transition-all flex items-center group ";
                if (showExplanation) {
                  if (isCorrect) btnClass += "border-emerald-500 bg-emerald-50 text-emerald-900";
                  else if (isSelected) btnClass += "border-rose-500 bg-rose-50 text-rose-900";
                  else btnClass += "border-slate-50 opacity-50";
                } else {
                  btnClass += isSelected ? "border-brand-600 bg-brand-50 text-brand-900" : "border-slate-100 hover:border-brand-200 hover:bg-slate-50";
                }
                return (
                  <button key={idx} onClick={() => !showExplanation && handleMCQSelect(idx)} disabled={showExplanation} className={btnClass}>
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center mr-4 font-black transition-colors ${showExplanation && isCorrect ? 'bg-emerald-500 text-white' : isSelected ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-400'}`}>
                      {String.fromCharCode(65 + idx)}
                    </div>
                    <span className="font-bold text-lg">{option}</span>
                  </button>
                );
              })}
            </div>
          )}

          {quiz.mode === QuizMode.FILL_GAP && (
            <div className="space-y-6">
              <form onSubmit={handleGapSubmit} className="relative">
                <input ref={inputRef} type="text" value={typedAnswer} onChange={e => setTypedAnswer(e.target.value)} disabled={showExplanation} placeholder="Type your answer here..." className={`w-full p-6 rounded-2xl border-2 text-xl font-bold transition-all outline-none ${showExplanation ? (typedAnswer.toLowerCase().trim() === (question.correctAnswer as string).toLowerCase().trim() ? 'border-emerald-500 bg-emerald-50 text-emerald-900' : 'border-rose-500 bg-rose-50 text-rose-900') : 'border-slate-100 focus:border-brand-600 focus:ring-4 focus:ring-brand-50 bg-slate-50/50'}`} />
                {!showExplanation && <button type="submit" disabled={!typedAnswer.trim()} className="absolute right-3 top-1/2 -translate-y-1/2 w-12 h-12 bg-brand-600 text-white rounded-xl flex items-center justify-center hover:bg-brand-700 shadow-lg"><i className="fas fa-check"></i></button>}
              </form>
            </div>
          )}

          {quiz.mode === QuizMode.THEORY && !gradingResult && !isGrading && theoryInputMode === 'none' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-8">
              <button onClick={() => setIsCameraOpen(true)} className="flex flex-col items-center gap-4 p-8 bg-white border-2 border-slate-100 rounded-[2rem] hover:border-brand-600 hover:bg-brand-50/20 transition-all group">
                <div className="w-16 h-16 bg-brand-50 text-brand-600 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform"><i className="fas fa-camera text-2xl"></i></div>
                <p className="font-black text-slate-900 text-xl">Handwritten</p>
              </button>
              <button onClick={() => setTheoryInputMode('typing')} className="flex flex-col items-center gap-4 p-8 bg-white border-2 border-slate-100 rounded-[2rem] hover:border-brand-600 hover:bg-brand-50/20 transition-all group">
                <div className="w-16 h-16 bg-brand-50 text-brand-600 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform"><i className="fas fa-keyboard text-2xl"></i></div>
                <p className="font-black text-slate-900 text-xl">Type Answer</p>
              </button>
            </div>
          )}

          {theoryInputMode === 'typing' && !isGrading && !gradingResult && (
            <div className="space-y-4">
              <textarea value={typedAnswer} onChange={e => setTypedAnswer(e.target.value)} placeholder="Type your answer here..." className="w-full h-48 p-6 rounded-[1.5rem] border-2 border-slate-100 focus:border-brand-600 focus:ring-4 focus:ring-brand-100 outline-none text-slate-700 font-medium leading-relaxed resize-none shadow-inner" />
              <div className="flex gap-3">
                <button onClick={() => setTheoryInputMode('none')} className="px-6 h-14 rounded-2xl border border-slate-200 font-black text-slate-400 text-xs uppercase">Back</button>
                <button onClick={handleTypedTheorySubmit} disabled={!typedAnswer.trim()} className="flex-1 h-14 bg-brand-600 text-white font-black rounded-2xl shadow-xl hover:bg-brand-700 transition-all">Grade Answer</button>
              </div>
            </div>
          )}

          {isGrading && (
            <div className="flex flex-col items-center py-20 text-center">
              <div className="relative w-24 h-24 mb-8">
                <div className="absolute inset-0 border-4 border-brand-100 rounded-full"></div>
                <div className="absolute inset-0 border-4 border-brand-600 border-t-transparent rounded-full animate-spin"></div>
              </div>
              <p className="text-xl font-black text-slate-800">{GRADING_MESSAGES[gradingStep]}</p>
            </div>
          )}

          {(showExplanation || gradingResult) && (
            <div className="mt-10 space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-700">
              {isIllustrating ? (
                <div className="w-full aspect-square md:aspect-[2/1] bg-slate-50 rounded-[2rem] animate-pulse flex items-center justify-center">
                  <i className="fas fa-image text-4xl text-slate-200"></i>
                </div>
              ) : illustrationUrl && (
                <div className="w-full bg-slate-50 rounded-[2rem] overflow-hidden border border-slate-100 shadow-sm">
                  <img src={illustrationUrl} alt="Concept Illustration" className="w-full h-auto object-contain hover:scale-105 transition-transform duration-700" />
                </div>
              )}

              <div className="p-10 bg-brand-50/50 rounded-[2.5rem] border border-brand-100 relative group">
                <div className="absolute top-8 right-8">
                  <VoiceButton text={gradingResult ? gradingResult.feedback : (question?.explanation || "")} />
                </div>
                <div className="flex items-center text-brand-700 font-black uppercase text-[10px] tracking-widest mb-4">
                  <i className="fas fa-lightbulb mr-2"></i> Tutor Insight
                </div>
                <p className="text-brand-900/80 font-bold leading-relaxed text-lg">
                  {gradingResult ? gradingResult.feedback : question?.explanation}
                </p>
                {gradingResult && (
                   <div className="mt-6 flex items-center gap-4 p-4 bg-white rounded-2xl border border-brand-100">
                      <div className="w-12 h-12 rounded-full border-2 border-brand-600 flex items-center justify-center font-black text-brand-600">{gradingResult.score}</div>
                      <p className="text-sm font-black text-slate-600">Grading Accuracy Score</p>
                   </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="bg-slate-50/50 px-14 py-8 border-t border-slate-100 flex items-center justify-between sticky bottom-0 z-50 backdrop-blur-md">
          <div className="text-slate-400 font-black text-sm uppercase tracking-widest">{currentIdx + 1} / {questions.length}</div>
          <button onClick={nextQuestion} disabled={!isCurrentAnswered()} className="h-14 px-10 bg-brand-600 text-white font-black rounded-2xl disabled:bg-slate-200 transition-all flex items-center shadow-xl hover:bg-brand-700 active:scale-95 group">
            {isLast ? 'Finish Session' : 'Continue Learning'} <i className="fas fa-arrow-right ml-3 group-hover:translate-x-1 transition-transform"></i>
          </button>
        </div>
      </div>

      {isCameraOpen && <CameraCapture onCapture={handleCapture} onCancel={() => setIsCameraOpen(false)} />}
    </div>
  );
};

export default QuizView;
