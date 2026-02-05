
import React, { useState } from 'react';
import Layout from './components/Layout';
import DocumentIngestion from './components/DocumentIngestion';
import QuizView from './components/QuizView';
import { PrivacyPage, TermsPage, HelpPage } from './components/StaticPages';
import { QuizMode, Quiz, AppView } from './types';
import { generateQuiz } from './services/aiService';

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<AppView>('main');
  const [sourceText, setSourceText] = useState<string | null>(null);
  const [quizMode, setQuizMode] = useState<QuizMode>(QuizMode.MULTIPLE_CHOICE);
  const [questionCount, setQuestionCount] = useState(5);
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [loading, setLoading] = useState(false);

  const handleDocumentProcessed = (text: string) => {
    setSourceText(text);
  };

  const handleStartQuiz = async () => {
    if (!sourceText) return;
    setLoading(true);
    try {
      const generatedQuiz = await generateQuiz(sourceText, quizMode, questionCount);
      setQuiz(generatedQuiz);
    } catch (err) {
      console.error(err);
      alert('Failed to generate quiz. Try refreshing or using a different document.');
    } finally {
      setLoading(false);
    }
  };

  const handleRestart = () => {
    setQuiz(null);
    setSourceText(null);
    setLoading(false);
    setCurrentView('main');
  };

  const renderContent = () => {
    if (currentView === 'privacy') return <PrivacyPage />;
    if (currentView === 'terms') return <TermsPage />;
    if (currentView === 'help') return <HelpPage />;

    if (!sourceText) {
      return (
        <div className="max-w-5xl mx-auto space-y-10 md:space-y-16 animate-in fade-in duration-1000">
          <div className="text-center max-w-3xl mx-auto px-2">
            <h2 className="text-3xl md:text-6xl font-black text-slate-900 mb-4 md:mb-6 tracking-tight leading-tight">
              Master any topic with <span className="text-indigo-600">AI Tutoring.</span>
            </h2>
            <p className="text-base md:text-xl text-slate-500 font-medium">
              Turn your lecture notes into high-impact interactive quizzes.
            </p>
          </div>
          
          <DocumentIngestion onProcessed={handleDocumentProcessed} />
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8 pt-4">
            {[
              { icon: 'fa-brain', title: 'Smart Analysis', desc: 'Neural parsing builds deep questions from your specific documents.' },
              { icon: 'fa-camera-retro', title: 'Paper Grading', desc: 'Write on paper, snap a photo, and get instant detailed evaluation.' },
              { icon: 'fa-chart-pie', title: 'Study Analytics', desc: 'Detailed scores show you exactly where to focus your study time.' }
            ].map((feature, i) => (
              <div key={i} className="bg-white p-6 md:p-8 rounded-[1.5rem] md:rounded-[2rem] border border-slate-50 shadow-sm hover:shadow-xl transition-all duration-300">
                <div className="w-12 h-12 md:w-14 md:h-14 bg-indigo-50 text-indigo-600 rounded-xl md:rounded-2xl flex items-center justify-center mb-4 md:mb-6">
                  <i className={`fas ${feature.icon} text-xl md:text-2xl`}></i>
                </div>
                <h3 className="font-black text-slate-900 text-base md:text-lg mb-2">{feature.title}</h3>
                <p className="text-slate-500 text-sm md:text-base font-medium leading-relaxed">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      );
    }

    if (!quiz) {
      return (
        <div className="max-w-2xl mx-auto animate-in fade-in slide-in-from-bottom-8 duration-700 px-2">
          <div className="bg-white p-8 md:p-14 rounded-[2rem] md:rounded-[3rem] shadow-2xl shadow-slate-200/50 border border-slate-50">
            <h2 className="text-2xl md:text-3xl font-black text-slate-900 mb-8 md:mb-10 text-center">
              Quiz Setup
            </h2>
            
            <div className="space-y-8 md:space-y-10">
              <div>
                <label className="block text-[9px] md:text-[10px] font-black text-slate-400 mb-4 uppercase tracking-[0.2em]">Select Type</label>
                <div className="grid grid-cols-1 gap-3">
                  {[QuizMode.MULTIPLE_CHOICE, QuizMode.FILL_GAP, QuizMode.THEORY].map((mode) => (
                    <button
                      key={mode}
                      onClick={() => setQuizMode(mode)}
                      className={`p-4 md:p-5 rounded-xl md:rounded-2xl border-2 text-left transition-all flex items-center group ${
                        quizMode === mode 
                          ? 'border-indigo-600 bg-indigo-50 text-indigo-900 ring-4 ring-indigo-50/50' 
                          : 'border-slate-100 bg-white text-slate-500 hover:border-slate-200'
                      }`}
                    >
                      <div className={`w-10 h-10 md:w-12 md:h-12 rounded-lg md:rounded-xl flex items-center justify-center mr-4 md:mr-5 shrink-0 transition-all ${
                        quizMode === mode ? 'bg-indigo-600 text-white' : 'bg-slate-50 text-slate-400 group-hover:bg-indigo-100 group-hover:text-indigo-600'
                      }`}>
                        <i className={`fas ${
                          mode === QuizMode.MULTIPLE_CHOICE ? 'fa-list-check' : 
                          mode === QuizMode.FILL_GAP ? 'fa-pencil-ruler' : 'fa-feather-pointed'
                        } text-base md:text-xl`}></i>
                      </div>
                      <div>
                        <p className="font-black text-base md:text-lg">{mode}</p>
                        <p className="text-[10px] md:text-xs font-bold opacity-60">
                          {mode === QuizMode.MULTIPLE_CHOICE && 'Test recognition skills.'}
                          {mode === QuizMode.FILL_GAP && 'Contextual recall practice.'}
                          {mode === QuizMode.THEORY && 'Handwritten feedback.'}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-4">
                  <label className="block text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Quantity</label>
                  <span className="bg-slate-900 text-white px-3 py-1 rounded-full font-black text-[10px] md:text-xs">
                    {questionCount} Challenges
                  </span>
                </div>
                <div className="px-4 py-6 md:py-8 bg-slate-50 rounded-[1.5rem] md:rounded-[2rem]">
                  <input
                    type="range"
                    min="1"
                    max="50"
                    step="1"
                    value={questionCount}
                    onChange={(e) => setQuestionCount(parseInt(e.target.value))}
                    className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                  />
                  <div className="flex justify-between text-[8px] md:text-[10px] text-slate-400 font-black mt-4 uppercase tracking-widest px-1">
                    <span>1</span>
                    <span>50</span>
                  </div>
                </div>
              </div>

              <div className="pt-6 md:pt-8 border-t border-slate-100 flex flex-col md:flex-row gap-3 md:gap-4">
                <button
                  onClick={() => setSourceText(null)}
                  className="w-full md:w-auto px-6 py-3 md:px-8 md:py-4 rounded-xl md:rounded-2xl border border-slate-200 font-black text-slate-500 hover:bg-slate-50 active:scale-95 transition-all text-xs md:text-sm"
                >
                  Change Material
                </button>
                <button
                  onClick={handleStartQuiz}
                  disabled={loading}
                  className="flex-1 bg-indigo-600 text-white font-black py-3 md:py-4 rounded-xl md:rounded-2xl hover:bg-indigo-700 shadow-xl shadow-indigo-200 disabled:opacity-50 transition-all active:scale-95 flex justify-center items-center text-sm md:text-base"
                >
                  {loading ? (
                    <><i className="fas fa-spinner fa-spin mr-2 md:mr-3"></i> Generating...</>
                  ) : (
                    <>Start Session</>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return (
      <QuizView 
        quiz={quiz} 
        sourceText={sourceText} 
        onRestart={handleRestart}
      />
    );
  };

  return (
    <Layout onNavigate={setCurrentView}>
      {renderContent()}
    </Layout>
  );
};

export default App;
