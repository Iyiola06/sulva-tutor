
import React, { useState } from 'react';
import Layout from './Layout';
import DocumentIngestion from './DocumentIngestion';
import QuizView from './QuizView';
import StudyBreakdownView from './StudyBreakdownView';
import { PrivacyPage, TermsPage, HelpPage } from './StaticPages';
import { QuizMode, Quiz, AppView, StudyBreakdown } from '../types';
import { generateQuiz, generateStudyBlueprint } from '../services/aiService';
import { useAuth } from '../contexts/AuthProvider';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';

const Dashboard: React.FC = () => {
    const [currentView, setCurrentView] = useState<AppView>('main');
    const [sourceText, setSourceText] = useState<string | null>(null);
    const [quizMode, setQuizMode] = useState<QuizMode>(QuizMode.MULTIPLE_CHOICE);
    const [questionCount, setQuestionCount] = useState(5);
    const [quiz, setQuiz] = useState<Quiz | null>(null);
    const [breakdown, setBreakdown] = useState<StudyBreakdown | null>(null);
    const [loading, setLoading] = useState(false);

    const { user, isPro } = useAuth();
    const navigate = useNavigate();

    const checkLimit = async () => {
        if (isPro) return true;

        // Count quizzes generated today
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const { count, error } = await supabase
            .from('usage_logs')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', user?.id)
            .eq('action_type', 'generate_quiz')
            .gte('created_at', today.toISOString());

        if (error) {
            console.error('Error checking limit:', error);
            return true; // Fail open if error
        }

        if ((count || 0) >= 3) {
            alert('You have reached your daily limit of 3 quizzes. Upgrade to Pro for unlimited access!');
            navigate('/pricing');
            return false;
        }

        return true;
    };

    const logUsage = async (action: string) => {
        if (!user) return;
        await supabase.from('usage_logs').insert({
            user_id: user.id,
            action_type: action
        });
    };

    const handleDocumentProcessed = (text: string) => {
        setSourceText(text);
    };

    const handleStartQuiz = async () => {
        if (!sourceText) return;

        const allowed = await checkLimit();
        if (!allowed) return;

        setLoading(true);
        try {
            const generatedQuiz = await generateQuiz(sourceText, quizMode, questionCount);
            setQuiz(generatedQuiz);
            setCurrentView('main');
            logUsage('generate_quiz');
        } catch (err) {
            console.error(err);
            alert('Failed to generate quiz.');
        } finally {
            setLoading(false);
        }
    };

    const handleGenerateBreakdown = async () => {
        if (!sourceText) return;

        const allowed = await checkLimit();
        if (!allowed) return;

        setLoading(true);
        try {
            const blueprint = await generateStudyBlueprint(sourceText);
            setBreakdown(blueprint);
            setCurrentView('breakdown');
        } catch (err) {
            console.error(err);
            alert('Failed to analyze material.');
        } finally {
            setLoading(false);
        }
    };

    const handleRestart = () => {
        setQuiz(null);
        setBreakdown(null);
        setSourceText(null);
        setLoading(false);
        setCurrentView('main');
    };

    const renderContent = () => {
        if (currentView === 'privacy') return <PrivacyPage />;
        if (currentView === 'terms') return <TermsPage />;
        if (currentView === 'help') return <HelpPage />;

        if (currentView === 'breakdown' && breakdown && sourceText) {
            return (
                <StudyBreakdownView
                    breakdown={breakdown}
                    sourceText={sourceText}
                    onStartQuiz={() => setCurrentView('main')}
                    onRestart={handleRestart}
                />
            );
        }

        if (!sourceText) {
            return (
                <div className="max-w-5xl mx-auto space-y-16 animate-in fade-in duration-1000">
                    <div className="text-center max-w-3xl mx-auto px-2 pt-10">
                        <h2 className="text-3xl md:text-6xl font-black text-slate-900 mb-6 tracking-tight leading-tight">Master any topic with <span className="text-brand-600">Sulva AI.</span></h2>
                        <p className="text-base md:text-xl text-slate-500 font-medium">Your personalized study companion for neural retention and handwritten grading.</p>
                    </div>
                    <DocumentIngestion onProcessed={handleDocumentProcessed} />
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pb-10">
                        {[{ icon: 'fa-bolt', title: 'Neural Synthesis', desc: 'Parallel chapter processing for immediate, retention-focused study maps.' }, { icon: 'fa-brain', title: 'Smart Mnemonics', desc: 'AI-generated abbreviations that make complex lists stick in your mind.' }, { icon: 'fa-feather', title: 'Hybrid Input', desc: 'Grade theory answers written by hand or typed directly into the app.' }].map((f, i) => (
                            <div key={i} className="bg-white p-8 rounded-[2rem] border border-slate-50 shadow-sm hover:shadow-xl transition-all">
                                <div className="w-14 h-14 bg-brand-50 text-brand-600 rounded-2xl flex items-center justify-center mb-6"><i className={`fas ${f.icon} text-2xl`}></i></div>
                                <h3 className="font-black text-slate-900 text-lg mb-2">{f.title}</h3>
                                <p className="text-slate-500 text-sm font-medium leading-relaxed">{f.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            );
        }

        if (!quiz) {
            return (
                <div className="max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-8 duration-700 px-2">
                    <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
                        <div className="lg:col-span-2">
                            <div className="bg-brand-600 p-10 rounded-[3rem] shadow-2xl text-white h-full flex flex-col justify-between group">
                                <div>
                                    <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform"><i className="fas fa-file-invoice text-2xl"></i></div>
                                    <h3 className="text-3xl font-black mb-4 tracking-tight">Full Study Guide</h3>
                                    <p className="text-brand-100 font-medium leading-relaxed mb-8">Generate abbreviations, key terms, and summaries for deep retention.</p>
                                </div>
                                <button onClick={handleGenerateBreakdown} disabled={loading} className="w-full bg-white text-brand-600 font-black py-4 rounded-2xl hover:bg-brand-50 transition-all flex items-center justify-center gap-3 shadow-xl">
                                    {loading ? <i className="fas fa-spinner fa-spin"></i> : <><i className="fas fa-bolt"></i> Generate Guide</>}
                                </button>
                            </div>
                        </div>
                        <div className="lg:col-span-3">
                            <div className="bg-white p-12 rounded-[3rem] shadow-2xl border border-slate-50">
                                <h2 className="text-2xl font-black text-slate-900 mb-8 tracking-tight">Quiz Setup</h2>
                                <div className="space-y-8">
                                    <div>
                                        <label className="block text-[9px] font-black text-slate-400 mb-4 uppercase tracking-[0.2em]">Study Mode</label>
                                        <div className="grid grid-cols-1 gap-3">
                                            {[QuizMode.MULTIPLE_CHOICE, QuizMode.FILL_GAP, QuizMode.THEORY].map((mode) => (
                                                <button key={mode} onClick={() => setQuizMode(mode)} className={`p-4 rounded-2xl border-2 text-left transition-all flex items-center ${quizMode === mode ? 'border-brand-600 bg-brand-50 text-brand-900 ring-4 ring-brand-50' : 'border-slate-100 bg-white text-slate-500 hover:border-brand-200'}`}>
                                                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center mr-4 shrink-0 transition-all ${quizMode === mode ? 'bg-brand-600 text-white shadow-brand-100' : 'bg-slate-50 text-slate-400'}`}><i className={`fas ${mode === QuizMode.MULTIPLE_CHOICE ? 'fa-list-check' : mode === QuizMode.FILL_GAP ? 'fa-pencil-ruler' : 'fa-feather-pointed'}`}></i></div>
                                                    <div><p className="font-black text-base">{mode}</p></div>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                    <div>
                                        <div className="flex justify-between mb-4"><label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Questions: {questionCount}</label></div>
                                        <div className="px-4 py-6 bg-slate-50 rounded-2xl">
                                            <input type="range" min="1" max="50" value={questionCount} onChange={e => setQuestionCount(parseInt(e.target.value))} className="w-full accent-brand-600" />
                                        </div>
                                    </div>
                                    <div className="pt-6 flex gap-3">
                                        <button onClick={() => setSourceText(null)} className="px-6 py-4 rounded-2xl border border-slate-200 font-black text-slate-500 text-xs">Reset</button>
                                        <button onClick={handleStartQuiz} disabled={loading} className="flex-1 bg-brand-600 text-white font-black py-4 rounded-2xl hover:bg-brand-700 shadow-xl transition-all">
                                            {loading ? <i className="fas fa-spinner fa-spin"></i> : 'Begin Assessment'}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            );
        }

        return <QuizView quiz={quiz} sourceText={sourceText} onRestart={handleRestart} />;
    };

    return <Layout onNavigate={setCurrentView}>{renderContent()}</Layout>;
};

export default Dashboard;
