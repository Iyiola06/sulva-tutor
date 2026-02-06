
import React, { useState, useEffect } from 'react';
import { StudyBreakdown, StudyChapter } from '../types';
import VoiceButton from './VoiceButton';
import { askFollowUpQuestion, generateChapterDetails } from '../services/aiService';

interface StudyBreakdownViewProps {
  breakdown: StudyBreakdown;
  sourceText: string;
  onStartQuiz: () => void;
  onRestart: () => void;
}

const ChapterSkeleton = () => (
  <div className="bg-white p-8 md:p-10 rounded-[2rem] border border-slate-50 shadow-sm animate-pulse space-y-6">
    <div className="flex gap-6">
      <div className="w-1/3 space-y-3">
        <div className="h-6 bg-slate-100 rounded-lg w-3/4"></div>
        <div className="h-2 bg-slate-50 rounded-full w-1/2"></div>
      </div>
      <div className="w-2/3 space-y-3">
        <div className="h-4 bg-slate-50 rounded-lg w-full"></div>
        <div className="h-4 bg-slate-50 rounded-lg w-5/6"></div>
      </div>
    </div>
  </div>
);

const MnemonicCard: React.FC<{ acronym: string; phrase: string; description: string }> = ({ acronym, phrase, description }) => (
  <div className="bg-gradient-to-br from-brand-600 to-brand-800 p-8 rounded-[2rem] text-white shadow-xl shadow-brand-200/50 mb-8 border border-white/10 group overflow-hidden relative">
    <div className="absolute top-6 right-6 flex flex-col gap-2">
       <VoiceButton text={`${phrase}. ${description}`} size="sm" />
    </div>
    <div className="relative z-10">
      <div className="flex items-center gap-3 mb-6">
        <div className="px-3 py-1 bg-white/20 rounded-full text-[10px] font-black uppercase tracking-widest">Memory Booster</div>
      </div>
      <h4 className="text-4xl md:text-5xl font-black mb-4 tracking-tighter">
        {acronym.split('').map((char, i) => (
          <span key={i} className="inline-block hover:scale-110 transition-transform cursor-default mr-1">{char}</span>
        ))}
      </h4>
      <p className="text-xl md:text-2xl font-black text-brand-100 leading-tight mb-4">{phrase}</p>
      <div className="h-px bg-white/20 w-16 mb-4"></div>
      <p className="text-sm text-brand-100/70 font-bold leading-relaxed">{description}</p>
    </div>
  </div>
);

const ChapterChat: React.FC<{ chapter: StudyChapter; sourceText: string }> = ({ chapter, sourceText }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [question, setQuestion] = useState('');
  const [history, setHistory] = useState<{ role: 'user' | 'model'; text: string }[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim() || isLoading) return;
    const userMsg = question.trim();
    setQuestion('');
    setHistory(prev => [...prev, { role: 'user', text: userMsg }]);
    setIsLoading(true);
    try {
      const content = chapter.keyPoints?.map(p => `${p.title}: ${p.content}`).join('\n') || '';
      const res = await askFollowUpQuestion(userMsg, chapter.title, content, sourceText, history);
      setHistory(prev => [...prev, { role: 'model', text: res }]);
    } finally { setIsLoading(false); }
  };

  if (!isOpen) return (
    <button onClick={() => setIsOpen(true)} className="mt-6 flex items-center gap-2 text-[10px] font-black uppercase text-brand-600 bg-brand-50 px-5 py-2.5 rounded-full border border-brand-100 hover:bg-brand-100 transition-all">
      <i className="fas fa-comment-dots"></i> Deep Dive with AI
    </button>
  );

  return (
    <div className="mt-8 bg-slate-900 rounded-[2rem] overflow-hidden border border-slate-800 shadow-2xl">
      <div className="p-4 bg-slate-800 flex justify-between items-center"><h5 className="text-[10px] font-black text-white uppercase tracking-widest">Tutor Session</h5><button onClick={() => setIsOpen(false)} className="text-slate-400 p-2"><i className="fas fa-times"></i></button></div>
      <div className="p-6 h-64 overflow-y-auto space-y-4 no-scrollbar flex flex-col">
        {history.map((msg, i) => (
          <div key={i} className={`flex items-start gap-2 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
            <div className={`max-w-[75%] px-4 py-3 rounded-2xl text-xs ${msg.role === 'user' ? 'bg-brand-600 text-white rounded-br-none' : 'bg-slate-800 text-slate-300 border border-slate-700 rounded-bl-none'}`}>{msg.text}</div>
            <VoiceButton text={msg.text} size="sm" />
          </div>
        ))}
        {isLoading && <div className="animate-pulse flex gap-2"><div className="w-1.5 h-1.5 bg-brand-600 rounded-full"></div><div className="w-1.5 h-1.5 bg-brand-600 rounded-full"></div></div>}
      </div>
      <form onSubmit={handleSend} className="p-4 flex gap-2"><input value={question} onChange={e => setQuestion(e.target.value)} placeholder="Clarify something..." className="flex-grow bg-slate-800 text-white text-xs px-4 py-2 rounded-xl border border-slate-700 outline-none" /><button type="submit" className="bg-brand-600 text-white w-10 h-10 rounded-xl"><i className="fas fa-paper-plane"></i></button></form>
    </div>
  );
};

const StudyBreakdownView: React.FC<StudyBreakdownViewProps> = ({ breakdown: initialBreakdown, sourceText, onStartQuiz, onRestart }) => {
  const [breakdown, setBreakdown] = useState<StudyBreakdown>(initialBreakdown);
  const [loadedCount, setLoadedCount] = useState(0);

  useEffect(() => {
    const loadDetails = async () => {
      const promises = breakdown.chapters.map(async (chapter, index) => {
        try {
          const data: any = await generateChapterDetails(chapter.title, sourceText);
          setBreakdown(prev => {
            const next = { ...prev };
            next.chapters[index] = { ...next.chapters[index], keyPoints: data.keyPoints, mnemonic: data.mnemonic, isLoading: false };
            return next;
          });
          setLoadedCount(prev => prev + 1);
        } catch (e) {}
      });
      await Promise.all(promises);
    };
    loadDetails();
  }, []);

  return (
    <div className="max-w-4xl mx-auto px-4 animate-in fade-in duration-700 pb-24 text-left">
      <div className="flex justify-between items-center mb-10">
        <button onClick={onRestart} className="px-5 py-2.5 bg-white rounded-xl shadow-sm border border-slate-100 text-xs font-black text-slate-500 hover:text-brand-600 transition-all">
          <i className="fas fa-arrow-left mr-2"></i> Change Source
        </button>
        <div className="bg-brand-600 text-white px-5 py-2 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-3">
          {loadedCount === breakdown.chapters.length ? <><i className="fas fa-check-circle"></i> Memory Engine Active</> : <><i className="fas fa-spinner fa-spin"></i> Analyzing... {loadedCount}/{breakdown.chapters.length}</>}
        </div>
      </div>

      <div className="space-y-16">
        <div className="bg-white p-8 md:p-14 rounded-[2.5rem] md:rounded-[4rem] shadow-2xl border border-slate-50 overflow-hidden relative">
          <div className="absolute top-8 right-8">
             <VoiceButton text={breakdown.summary} />
          </div>
          <div className="absolute top-0 right-0 w-64 h-64 bg-brand-50 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl opacity-50"></div>
          <h2 className="text-2xl md:text-3xl font-black text-slate-900 mb-6 tracking-tight">Subject Synthesis</h2>
          <p className="text-slate-600 text-lg font-bold leading-relaxed italic border-l-8 border-brand-100 pl-8 mb-8">{breakdown.summary}</p>
          
          {breakdown.grandMnemonic && (
            <div className="bg-slate-900 p-8 rounded-[2rem] text-white flex justify-between items-center">
              <div>
                <p className="text-[10px] font-black uppercase text-brand-400 mb-2 tracking-[0.3em]">Master Retention Hook</p>
                <h3 className="text-3xl md:text-5xl font-black mb-2 tracking-tighter">{breakdown.grandMnemonic.acronym}</h3>
                <p className="text-base font-bold text-slate-400">{breakdown.grandMnemonic.full}</p>
              </div>
              <VoiceButton text={`${breakdown.grandMnemonic.acronym} stands for ${breakdown.grandMnemonic.full}`} />
            </div>
          )}
        </div>

        <div className="space-y-12">
          {breakdown.chapters.map((chapter, chapterIdx) => (
            <div key={chapterIdx} className="space-y-6">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-brand-600 text-white rounded-2xl flex items-center justify-center text-sm font-black shadow-lg shadow-brand-100">{chapterIdx + 1}</div>
                  <h4 className="text-2xl font-black text-slate-900 tracking-tight">{chapter.title}</h4>
                </div>
                {chapter.keyPoints && <VoiceButton text={`Chapter ${chapterIdx + 1}: ${chapter.title}`} size="sm" />}
              </div>
              {!chapter.keyPoints ? <ChapterSkeleton /> : (
                <div className="grid grid-cols-1 gap-6">
                  {chapter.mnemonic && <MnemonicCard acronym={chapter.mnemonic.acronym} phrase={chapter.mnemonic.phrase} description={chapter.mnemonic.description} />}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {chapter.keyPoints.map((point, i) => (
                      <div key={i} className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm hover:border-brand-100 transition-all group relative">
                        <div className="absolute top-6 right-6">
                          <VoiceButton text={`${point.title}. ${point.content}`} size="sm" />
                        </div>
                        <h5 className="font-black text-slate-900 text-lg mb-4 flex items-center gap-3"><span className="w-2 h-2 bg-brand-400 rounded-full"></span>{point.title}</h5>
                        <p className="text-slate-500 font-bold leading-relaxed text-sm pr-6">{point.content}</p>
                      </div>
                    ))}
                  </div>
                  <ChapterChat chapter={chapter} sourceText={sourceText} />
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="pt-12 text-center">
          <button onClick={onStartQuiz} className="px-12 py-5 bg-brand-600 text-white font-black rounded-full hover:bg-brand-700 transition-all shadow-2xl shadow-brand-100 active:scale-95 group">
            Start Knowledge Assessment <i className="fas fa-bolt ml-3"></i>
          </button>
        </div>
      </div>
    </div>
  );
};

export default StudyBreakdownView;
