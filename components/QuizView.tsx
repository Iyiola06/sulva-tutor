
import React, { useState, useEffect, useRef } from 'react';
import { Quiz, QuizMode, GradingResult, SessionScore, QuizSessionResult } from '../types';
import CameraCapture from './CameraCapture';
import { gradeHandwrittenAnswer } from '../services/aiService';

interface QuizViewProps {
  quiz: Quiz;
  sourceText: string;
  onRestart: () => void;
}

const QuizView: React.FC<QuizViewProps> = ({ quiz, sourceText, onRestart }) => {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<number, any>>({});
  const [sessionScores, setSessionScores] = useState<SessionScore[]>([]);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [gradingResult, setGradingResult] = useState<GradingResult | null>(null);
  const [isGrading, setIsGrading] = useState(false);
  const [showExplanation, setShowExplanation] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const [typedAnswer, setTypedAnswer] = useState('');
  const [retakeCount, setRetakeCount] = useState(2); // 2 chances to retake = 3 total attempts
  const [showEmptyAlert, setShowEmptyAlert] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const question = quiz.questions[currentIdx];
  const isLast = currentIdx === quiz.questions.length - 1;
  const progress = ((currentIdx + 1) / quiz.questions.length) * 100;

  useEffect(() => {
    if (quiz.mode === QuizMode.FILL_GAP && !showExplanation && inputRef.current) {
      inputRef.current.focus();
    }
  }, [currentIdx, showExplanation, quiz.mode]);

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
      userAnswer: typeof userAnswer === 'object' ? 'Handwritten' : String(userAnswer),
      isCorrect
    };

    setSessionScores(prev => [...prev, newScore]);
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
    setShowEmptyAlert(false);

    try {
      const result = await gradeHandwrittenAnswer(base64, question.question, sourceText);
      
      if (result.noHandwritingDetected && retakeCount > 0) {
        setRetakeCount(prev => prev - 1);
        setShowEmptyAlert(true);
      } else {
        setGradingResult(result);
        setAnswers({ ...answers, [currentIdx]: result });
        calculateAndAddScore(result);
        setShowEmptyAlert(false);
      }
    } catch (err) {
      console.error(err);
      alert('Analysis failed. Please try a clearer photo.');
    } finally {
      setIsGrading(false);
    }
  };

  const nextQuestion = () => {
    if (!isLast) {
      setCurrentIdx(currentIdx + 1);
      setShowExplanation(false);
      setGradingResult(null);
      setTypedAnswer('');
      setRetakeCount(2); 
      setShowEmptyAlert(false);
    } else {
      setShowSummary(true);
    }
  };

  const isCurrentAnswered = () => {
    if (quiz.mode === QuizMode.MULTIPLE_CHOICE) return showExplanation;
    if (quiz.mode === QuizMode.FILL_GAP) return showExplanation;
    if (quiz.mode === QuizMode.THEORY) return !!gradingResult;
    return false;
  };

  if (showSummary) {
    const avgScore = Math.round(sessionScores.reduce((acc, s) => acc + s.score, 0) / sessionScores.length);
    const correctCount = sessionScores.filter(s => s.isCorrect).length;
    
    let performanceLabel = "Keep Practicing";
    let colorClass = "text-rose-600";
    if (avgScore >= 90) { performanceLabel = "Expert Mastery"; colorClass = "text-emerald-600"; }
    else if (avgScore >= 75) { performanceLabel = "Solid Performance"; colorClass = "text-indigo-600"; }
    else if (avgScore >= 50) { performanceLabel = "Gaining Knowledge"; colorClass = "text-amber-600"; }

    return (
      <div className="max-w-4xl mx-auto px-2 md:px-4 animate-in fade-in zoom-in-95 duration-700 pb-12">
        <div className="bg-white rounded-[2rem] md:rounded-[3rem] shadow-2xl shadow-slate-200 border border-slate-50 overflow-hidden">
          <div className="p-8 md:p-12 text-center border-b border-slate-50 bg-slate-50/30">
            <h2 className="text-2xl md:text-3xl font-black text-slate-900 mb-2">Session Summary</h2>
            <p className="text-slate-400 font-bold uppercase text-[9px] md:text-[10px] tracking-[0.3em]">Knowledge Retained</p>
          </div>

          <div className="p-6 md:p-12">
            <div className="flex flex-col md:flex-row items-center justify-around gap-8 md:gap-12 mb-10 md:mb-16">
              <div className="relative w-36 h-36 md:w-48 md:h-48">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                  <circle cx="18" cy="18" r="16" fill="none" className="stroke-slate-100" strokeWidth="3" />
                  <circle 
                    cx="18" cy="18" r="16" fill="none" 
                    className={`transition-all duration-1000 ease-out ${avgScore >= 70 ? 'stroke-emerald-500' : 'stroke-indigo-600'}`} 
                    strokeWidth="3" 
                    strokeDasharray={`${avgScore}, 100`} 
                    strokeLinecap="round" 
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-3xl md:text-5xl font-black text-slate-900">{avgScore}%</span>
                  <span className="text-[9px] md:text-[10px] font-bold text-slate-400 uppercase tracking-widest">Average</span>
                </div>
              </div>

              <div className="text-center md:text-left space-y-4 w-full md:w-auto">
                <h3 className={`text-2xl md:text-4xl font-black ${colorClass}`}>{performanceLabel}</h3>
                <div className="grid grid-cols-2 gap-3 md:gap-4">
                  <div className="p-3 md:p-4 bg-slate-50 rounded-xl md:rounded-2xl border border-slate-100 shadow-sm">
                    <p className="text-[8px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Success</p>
                    <p className="text-lg md:text-xl font-black text-slate-900">{correctCount} / {quiz.questions.length}</p>
                  </div>
                  <div className="p-3 md:p-4 bg-slate-50 rounded-xl md:rounded-2xl border border-slate-100 shadow-sm">
                    <p className="text-[8px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Time</p>
                    <p className="text-lg md:text-xl font-black text-slate-900">~{quiz.questions.length * 2}m</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-3 md:space-y-4 mb-8 md:mb-12">
              <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest mb-4">Breakdown</h4>
              {sessionScores.map((s, idx) => (
                <div key={idx} className="flex items-center gap-3 md:gap-4 p-4 md:p-5 bg-white border border-slate-100 rounded-xl md:rounded-2xl hover:shadow-md transition-all group hover:scale-[1.01]">
                  <div className={`w-8 h-8 md:w-10 md:h-10 rounded-lg md:rounded-xl flex items-center justify-center shrink-0 font-black text-xs md:text-sm ${s.isCorrect ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}`}>
                    {s.isCorrect ? <i className="fas fa-check"></i> : <i className="fas fa-times"></i>}
                  </div>
                  <div className="flex-grow overflow-hidden text-left">
                    <p className="text-xs md:text-sm font-bold text-slate-900 truncate">Q{idx + 1}: {quiz.questions[idx].question}</p>
                    <p className="text-[8px] md:text-[10px] text-slate-400 font-medium truncate">Answer: {s.userAnswer}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <span className={`text-[10px] md:text-sm font-black ${s.score >= 70 ? 'text-emerald-600' : 'text-slate-400'}`}>{s.score} pts</span>
                  </div>
                </div>
              ))}
            </div>

            <button 
              onClick={onRestart}
              className="w-full h-14 md:h-16 bg-slate-900 text-white font-black rounded-xl md:rounded-2xl hover:bg-indigo-600 shadow-xl transition-all active:scale-95 flex items-center justify-center gap-3"
            >
              <i className="fas fa-redo-alt text-sm"></i>
              Try Another Session
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-1 md:px-4">
      {/* Header Info */}
      <div className="mb-6 md:mb-10 text-center relative px-2">
        <div className="absolute left-0 top-1/2 -translate-y-1/2">
           <button 
            onClick={onRestart}
            className="w-8 h-8 md:w-10 md:h-10 flex items-center justify-center rounded-lg md:rounded-xl bg-white border border-slate-100 text-slate-400 hover:text-red-500 hover:border-red-100 transition-all hover:scale-110 active:scale-90 group shadow-sm"
            title="Exit"
          >
            <i className="fas fa-times group-hover:rotate-90 transition-transform"></i>
          </button>
        </div>
        
        <div className="inline-flex flex-col items-center">
          <span className="text-[8px] md:text-[10px] font-black uppercase tracking-[0.3em] text-indigo-500 mb-1">
            {quiz.mode}
          </span>
          <h2 className="text-lg md:text-2xl font-black text-slate-900">
            {currentIdx + 1} of {quiz.questions.length}
          </h2>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full h-1 md:h-1.5 bg-slate-100 rounded-full mb-8 md:mb-12 overflow-hidden shadow-inner mx-auto max-w-sm md:max-w-none">
        <div 
          className="h-full bg-indigo-600 rounded-full transition-all duration-700 ease-out shadow-[0_0_10px_rgba(79,70,229,0.4)]"
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="bg-white rounded-[1.5rem] md:rounded-[2.5rem] shadow-2xl shadow-slate-200/40 border border-slate-50 overflow-hidden relative min-h-[400px] md:min-h-[500px] flex flex-col mx-2">
        <div className="p-6 md:p-14 flex-grow">
          <div className="mb-6 md:mb-10 text-left">
            <h3 className="text-xl md:text-3xl font-extrabold text-slate-900 leading-tight">
              {question.question}
            </h3>
          </div>

          {/* MULTIPLE CHOICE */}
          {quiz.mode === QuizMode.MULTIPLE_CHOICE && (
            <div className="grid grid-cols-1 gap-3 md:gap-4">
              {question.options?.map((option, idx) => {
                const isSelected = answers[currentIdx] === idx;
                const isCorrect = idx === question.correctAnswer;
                const showFeedback = showExplanation;
                
                let btnClass = "w-full text-left p-4 md:p-6 rounded-xl md:rounded-2xl border-2 transition-all flex items-center group ";
                if (showFeedback) {
                  if (isCorrect) btnClass += "border-emerald-500 bg-emerald-50 text-emerald-900 shadow-emerald-100/50 shadow-sm";
                  else if (isSelected) btnClass += "border-rose-500 bg-rose-50 text-rose-900 shadow-rose-100/50 shadow-sm";
                  else btnClass += "border-slate-50 bg-slate-50/50 text-slate-400 opacity-50";
                } else {
                  btnClass += isSelected 
                    ? "border-indigo-600 bg-indigo-50 text-indigo-900 shadow-lg shadow-indigo-100 scale-[1.02]" 
                    : "border-slate-100 hover:border-indigo-200 hover:bg-slate-50 hover:scale-[1.01] hover:shadow-md text-slate-600 active:scale-95";
                }

                return (
                  <button 
                    key={idx} 
                    onClick={() => !showExplanation && handleMCQSelect(idx)}
                    disabled={showExplanation}
                    className={btnClass}
                  >
                    <div className={`w-7 h-7 md:w-8 md:h-8 rounded-lg flex items-center justify-center mr-3 md:mr-4 shrink-0 font-black text-xs md:text-sm transition-colors ${
                      showFeedback && isCorrect ? 'bg-emerald-500 text-white' : 
                      showFeedback && isSelected ? 'bg-rose-500 text-white' :
                      isSelected ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-400 group-hover:bg-indigo-100 group-hover:text-indigo-600'
                    }`}>
                      {String.fromCharCode(65 + idx)}
                    </div>
                    <span className="font-bold text-sm md:text-base">{option}</span>
                  </button>
                );
              })}
            </div>
          )}

          {/* FILL IN THE GAP */}
          {quiz.mode === QuizMode.FILL_GAP && (
            <div className="space-y-6 md:space-y-8">
              {!showExplanation ? (
                <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                  <form onSubmit={handleGapSubmit} className="flex flex-col gap-3 md:flex-row md:gap-4">
                    <input 
                      ref={inputRef}
                      type="text"
                      autoFocus
                      value={typedAnswer}
                      onChange={(e) => setTypedAnswer(e.target.value)}
                      placeholder="Type answer..."
                      className="flex-1 h-12 md:h-16 px-4 md:px-6 rounded-xl md:rounded-2xl border-2 border-slate-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 transition-all outline-none font-bold text-base md:text-xl placeholder:text-slate-300 hover:border-slate-300 shadow-sm"
                    />
                    <button 
                      type="submit"
                      disabled={!typedAnswer.trim()}
                      className="h-12 md:h-16 px-6 md:px-10 bg-indigo-600 text-white font-black rounded-xl md:rounded-2xl hover:bg-indigo-700 disabled:bg-slate-200 disabled:text-slate-400 transition-all shadow-xl shadow-indigo-100 flex items-center justify-center hover:scale-105 active:scale-95"
                    >
                      Check
                    </button>
                  </form>
                  <p className="mt-3 text-[9px] font-bold text-slate-400 text-center uppercase tracking-widest">
                    Submit to verify
                  </p>
                </div>
              ) : (
                <div className="p-5 md:p-8 rounded-[1.2rem] md:rounded-[2rem] bg-slate-50 border border-slate-100 space-y-4 md:space-y-6 animate-in zoom-in-95 duration-300 shadow-inner">
                  <div className="flex flex-col md:flex-row gap-4 md:gap-8 justify-between">
                    <div className="flex-1">
                      <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">Your Answer</p>
                      <div className={`p-3 md:p-5 rounded-lg md:rounded-xl border-2 font-black text-base md:text-xl flex items-center justify-between shadow-sm ${
                        typedAnswer.toLowerCase().trim() === (question.correctAnswer as string).toLowerCase().trim() 
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-700' 
                        : 'bg-rose-50 border-rose-200 text-rose-700'
                      }`}>
                        <span>{typedAnswer}</span>
                        <i className={`fas ${typedAnswer.toLowerCase().trim() === (question.correctAnswer as string).toLowerCase().trim() ? 'fa-check-circle' : 'fa-times-circle'}`}></i>
                      </div>
                    </div>
                    <div className="flex-1">
                      <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">Correct</p>
                      <div className="p-3 md:p-5 rounded-lg md:rounded-xl border-2 border-indigo-200 bg-indigo-50 font-black text-base md:text-xl text-indigo-700 shadow-sm">
                        {question.correctAnswer}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* THEORY SECTION */}
          {quiz.mode === QuizMode.THEORY && (
            <div className="space-y-6 md:space-y-8">
              {!gradingResult && !isGrading && (
                <div className="flex flex-col items-center py-8 md:py-12 bg-slate-50 rounded-2xl md:rounded-3xl border-2 border-dashed border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/20 transition-all group">
                  <div className="w-12 h-12 md:w-16 md:h-16 bg-white rounded-xl md:rounded-2xl flex items-center justify-center shadow-lg text-slate-300 mb-4 md:mb-6 group-hover:scale-110 group-hover:text-indigo-500 transition-all">
                    <i className="fas fa-camera text-xl md:text-2xl"></i>
                  </div>
                  
                  {showEmptyAlert ? (
                    <div className="px-4 md:px-8 text-center animate-in slide-in-from-top-2 duration-300">
                       <p className="text-rose-600 font-black text-base md:text-lg mb-1">Retry Image</p>
                       <p className="text-xs md:text-sm text-slate-500 font-bold mb-4 md:mb-6 leading-relaxed">
                        We couldn't see your handwriting. <br/>Attempts: <span className="text-indigo-600">{retakeCount} left</span>
                       </p>
                    </div>
                  ) : (
                    <p className="text-xs md:text-base text-slate-500 font-bold max-w-xs text-center leading-relaxed px-4 md:px-6 mb-4 md:mb-6">
                      Write your answer, then snap a clear photo.
                    </p>
                  )}

                  <button 
                    onClick={() => setIsCameraOpen(true)}
                    className="bg-indigo-600 text-white font-black py-3 px-8 md:py-4 md:px-10 rounded-xl md:rounded-2xl hover:bg-indigo-700 shadow-xl hover:scale-105 active:scale-95 transition-all text-sm md:text-base"
                  >
                    {showEmptyAlert ? 'Retake Photo' : 'Capture Answer'}
                  </button>
                </div>
              )}

              {isGrading && (
                <div className="flex flex-col items-center py-12 md:py-16 text-center">
                  <div className="w-12 h-12 md:w-16 md:h-16 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mb-4 md:mb-6"></div>
                  <p className="text-base md:text-lg font-black text-slate-800 animate-pulse">Grading...</p>
                </div>
              )}

              {gradingResult && (
                <div className="space-y-6 md:space-y-8 animate-in fade-in slide-in-from-bottom-6 duration-500">
                  <div className="bg-slate-900 rounded-2xl md:rounded-3xl p-5 md:p-6 shadow-xl">
                    <p className="text-[8px] md:text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em] mb-2 md:mb-3 text-left">Your Text</p>
                    <p className="text-slate-300 italic font-medium leading-relaxed text-sm md:text-base text-left">
                      {gradingResult.noHandwritingDetected ? "[Nothing readable detected]" : `"${gradingResult.ocrText}"`}
                    </p>
                  </div>

                  <div className="flex flex-col md:flex-row items-center gap-4 md:gap-6 p-5 md:p-6 bg-white rounded-2xl md:rounded-3xl border border-slate-100 shadow-sm">
                    <div className="relative w-20 h-20 md:w-24 md:h-24 shrink-0 hover:scale-110 transition-transform">
                      <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                        <circle cx="18" cy="18" r="16" fill="none" className="stroke-slate-100" strokeWidth="3" />
                        <circle cx="18" cy="18" r="16" fill="none" className="stroke-indigo-600" strokeWidth="3" strokeDasharray={`${gradingResult.score}, 100`} strokeLinecap="round" />
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center font-black text-lg md:text-xl text-slate-900">{gradingResult.score}</div>
                    </div>
                    <div className="text-center md:text-left">
                      <h4 className="font-black text-slate-900 text-base md:text-lg">Score Breakdown</h4>
                      <p className="text-slate-500 text-xs md:text-sm leading-relaxed">{gradingResult.feedback}</p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                    <div className="p-4 md:p-5 bg-emerald-50 rounded-xl md:rounded-2xl border border-emerald-100 shadow-sm text-left">
                      <p className="text-[8px] md:text-[10px] font-black text-emerald-600 uppercase mb-1 md:mb-2 tracking-widest">Strengths</p>
                      <ul className="text-[10px] md:text-xs font-bold text-emerald-900 space-y-1">
                        {gradingResult.strengths.length > 0 
                          ? gradingResult.strengths.map((s, i) => <li key={i}>• {s}</li>)
                          : <li className="italic opacity-50">Nothing yet</li>
                        }
                      </ul>
                    </div>
                    <div className="p-4 md:p-5 bg-amber-50 rounded-xl md:rounded-2xl border border-amber-100 shadow-sm text-left">
                      <p className="text-[8px] md:text-[10px] font-black text-amber-600 uppercase mb-1 md:mb-2 tracking-widest">To Improve</p>
                      <ul className="text-[10px] md:text-xs font-bold text-amber-900 space-y-1">
                        {gradingResult.weaknesses.length > 0
                          ? gradingResult.weaknesses.map((w, i) => <li key={i}>• {w}</li>)
                          : <li className="italic opacity-50">Nothing yet</li>
                        }
                      </ul>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* LEARNING INSIGHT / EXPLANATION */}
          {showExplanation && (
            <div className="mt-6 md:mt-10 p-5 md:p-8 bg-indigo-50/50 rounded-[1.2rem] md:rounded-[2rem] border border-indigo-100 animate-in slide-in-from-top-4 duration-500 shadow-sm text-left">
              <div className="flex items-center text-indigo-900 font-black uppercase text-[10px] tracking-widest mb-2">
                <i className="fas fa-lightbulb mr-2"></i> Tutor Insight
              </div>
              <p className="text-indigo-900/80 font-bold leading-relaxed text-xs md:text-base">{question.explanation}</p>
            </div>
          )}
        </div>

        {/* Action Bar */}
        <div className="bg-slate-50/50 px-6 md:px-10 py-5 md:py-8 border-t border-slate-100 flex items-center justify-between sticky bottom-0 z-50 backdrop-blur-sm">
          <div className="text-slate-400 font-black text-[8px] md:text-xs uppercase tracking-widest">
            {currentIdx + 1}/{quiz.questions.length}
          </div>
          <button 
            onClick={nextQuestion}
            disabled={!isCurrentAnswered()}
            className="h-10 md:h-12 px-5 md:px-8 bg-slate-900 text-white font-black rounded-lg md:rounded-2xl disabled:bg-slate-200 disabled:text-slate-400 transition-all flex items-center group shadow-xl hover:bg-indigo-600 hover:scale-105 active:scale-95 text-xs md:text-sm"
          >
            {isLast ? 'Results' : 'Continue'} 
            <i className="fas fa-arrow-right ml-2 md:ml-3 group-hover:translate-x-1 transition-transform"></i>
          </button>
        </div>
      </div>

      {isCameraOpen && (
        <CameraCapture 
          onCapture={handleCapture}
          onCancel={() => setIsCameraOpen(false)}
        />
      )}
    </div>
  );
};

export default QuizView;
