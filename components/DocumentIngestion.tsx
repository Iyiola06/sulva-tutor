
import React, { useState, useRef, useEffect } from 'react';
import { SavedMaterial } from '../types';

interface DocumentIngestionProps {
  onProcessed: (text: string) => void;
}

const STORAGE_KEY = 'sulva_saved_materials';
const MAX_SAVED_ITEMS = 10;

const DocumentIngestion: React.FC<DocumentIngestionProps> = ({ onProcessed }) => {
  const [text, setText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [savedMaterials, setSavedMaterials] = useState<SavedMaterial[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        setSavedMaterials(JSON.parse(stored));
      } catch (e) {
        console.error('Failed to parse stored materials', e);
      }
    }
  }, []);

  const saveMaterial = (content: string, name: string, type: 'file' | 'text') => {
    const newMaterial: SavedMaterial = {
      id: crypto.randomUUID(),
      name: name || 'Untitled Note',
      content,
      timestamp: Date.now(),
      type
    };

    const updated = [newMaterial, ...savedMaterials].slice(0, MAX_SAVED_ITEMS);
    setSavedMaterials(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  };

  const deleteMaterial = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = savedMaterials.filter(m => m.id !== id);
    setSavedMaterials(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  };

  const processFile = async (file: File) => {
    setFileName(file.name);
    setIsProcessing(true);
    try {
      let fullText = '';
      if (file.type === 'application/pdf') {
        const arrayBuffer = await file.arrayBuffer();
        const pdfjsLib = (window as any).pdfjsLib;
        pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
        
        const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
        const pdf = await loadingTask.promise;
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const content = await page.getTextContent();
          const pageText = content.items.map((item: any) => item.str).join(' ');
          fullText += pageText + '\n';
        }
      } else if (file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || file.name.endsWith('.docx')) {
        const arrayBuffer = await file.arrayBuffer();
        const mammoth = (window as any).mammoth;
        const result = await mammoth.extractRawText({ arrayBuffer });
        fullText = result.value;
      } else if (file.type === 'application/vnd.openxmlformats-officedocument.presentationml.presentation' || file.name.endsWith('.pptx')) {
        const arrayBuffer = await file.arrayBuffer();
        const JSZip = (window as any).JSZip;
        const zip = await JSZip.loadAsync(arrayBuffer);
        const slideFiles = Object.keys(zip.files)
          .filter(name => name.startsWith('ppt/slides/slide') && name.endsWith('.xml'))
          .sort((a, b) => {
            const numA = parseInt(a.match(/\d+/)?.[0] || '0');
            const numB = parseInt(b.match(/\d+/)?.[0] || '0');
            return numA - numB;
          });

        const parser = new DOMParser();
        for (const slideFile of slideFiles) {
          const content = await zip.files[slideFile].async('string');
          const xmlDoc = parser.parseFromString(content, 'text/xml');
          const textNodes = xmlDoc.getElementsByTagName('a:t');
          let slideText = '';
          for (let i = 0; i < textNodes.length; i++) slideText += textNodes[i].textContent + ' ';
          if (slideText.trim()) fullText += `--- Slide ---\n${slideText.trim()}\n\n`;
        }
      } else {
        fullText = await file.text();
      }

      setText(fullText);
      saveMaterial(fullText, file.name, 'file');
      onProcessed(fullText);
    } catch (err) {
      console.error('Error parsing file:', err);
      alert('Failed to parse document. Please check the file format.');
      setFileName(null);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleManualSubmit = () => {
    if (text.trim().length < 50) {
      alert('Please provide more content (at least 50 characters) for a better study experience.');
      return;
    }
    const name = text.substring(0, 30).trim() + (text.length > 30 ? '...' : '');
    saveMaterial(text, name, 'text');
    onProcessed(text);
  };

  return (
    <div className="space-y-8">
      {savedMaterials.length > 0 && (
        <div className="animate-in fade-in slide-in-from-top-4 duration-500">
          <div className="flex items-center justify-between mb-4 px-2">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Recently Studied</h3>
            <span className="text-[10px] font-bold text-slate-300">{savedMaterials.length}/10 slots</span>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-4 no-scrollbar -mx-2 px-2">
            {savedMaterials.map((m) => (
              <div 
                key={m.id}
                onClick={() => onProcessed(m.content)}
                className="flex-shrink-0 w-48 bg-white p-4 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md hover:border-brand-200 transition-all cursor-pointer group relative"
              >
                <button 
                  onClick={(e) => deleteMaterial(m.id, e)}
                  className="absolute top-2 right-2 w-6 h-6 rounded-full bg-slate-50 text-slate-300 hover:bg-rose-50 hover:text-rose-500 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <i className="fas fa-times text-[10px]"></i>
                </button>
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-3 ${m.type === 'file' ? 'bg-brand-50 text-brand-600' : 'bg-amber-50 text-amber-500'}`}>
                  <i className={`fas ${m.type === 'file' ? 'fa-file-alt' : 'fa-paragraph'} text-xs`}></i>
                </div>
                <p className="font-bold text-slate-900 text-xs truncate mb-1">{m.name}</p>
                <p className="text-[9px] text-slate-400 font-medium">
                  {new Date(m.timestamp).toLocaleDateString()}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-white p-5 md:p-8 rounded-[1.5rem] md:rounded-[2rem] shadow-xl shadow-slate-200/50 border border-slate-100">
        <div className="mb-6 md:mb-8">
          <h2 className="text-xl md:text-2xl font-bold text-slate-900 mb-1 md:mb-2">Knowledge Source</h2>
          <p className="text-sm md:text-base text-slate-500">Provide your study material to get started.</p>
        </div>

        <div className="space-y-4 md:space-y-6">
          <div 
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={(e) => { e.preventDefault(); setIsDragging(false); if (e.dataTransfer.files?.[0]) processFile(e.dataTransfer.files[0]); }}
            className={`relative group border-2 border-dashed rounded-xl md:rounded-2xl p-6 md:p-10 text-center transition-all cursor-pointer ${
              isDragging 
                ? 'border-brand-600 bg-brand-50/50 scale-[1.01] ring-4 ring-brand-100' 
                : fileName 
                  ? 'border-green-200 bg-green-50/30' 
                  : 'border-slate-200 hover:border-brand-400 hover:bg-brand-50/30'
            }`}
          >
            <input type="file" ref={fileInputRef} onChange={(e) => e.target.files?.[0] && processFile(e.target.files[0])} className="hidden" accept=".pdf,.txt,.docx,.pptx" />
            
            <div className="flex flex-col items-center">
              <div className={`w-12 h-12 md:w-16 md:h-16 rounded-xl md:rounded-2xl flex items-center justify-center mb-3 md:mb-4 transition-all ${
                isDragging ? 'bg-brand-600 text-white scale-110 rotate-12' :
                fileName ? 'bg-green-100 text-green-600' : 'bg-brand-100 text-brand-600 group-hover:scale-110'
              }`}>
                <i className={`fas ${isDragging ? 'fa-arrow-down' : fileName ? 'fa-check-circle' : 'fa-cloud-upload-alt'} text-xl md:text-2xl`}></i>
              </div>
              <p className="font-bold text-slate-900 text-base md:text-lg">{fileName ? fileName : 'Upload document'}</p>
              <p className="text-[10px] md:text-sm text-slate-400 mt-1 md:mt-2">Drag & drop or click (PDF, Word, PPTX)</p>
            </div>
          </div>

          <div className="flex items-center gap-3 py-1">
            <div className="h-px bg-slate-100 flex-grow"></div>
            <span className="text-[9px] font-black uppercase text-slate-300 tracking-[0.2em]">OR</span>
            <div className="h-px bg-slate-100 flex-grow"></div>
          </div>

          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Paste your raw notes here..."
            className="w-full h-32 md:h-40 p-4 md:p-5 rounded-xl md:rounded-2xl border border-slate-200 focus:ring-4 focus:ring-brand-100 focus:border-brand-600 resize-none transition-all placeholder:text-slate-300 text-sm md:text-base text-slate-700 leading-relaxed font-medium"
          />

          <button
            onClick={handleManualSubmit}
            disabled={isProcessing || !text.trim()}
            className="w-full h-12 md:h-14 bg-brand-600 text-white text-sm md:text-base font-bold rounded-xl md:rounded-2xl hover:bg-brand-700 disabled:bg-slate-200 disabled:text-slate-400 transition-all shadow-xl shadow-brand-100 flex items-center justify-center group active:scale-95"
          >
            {isProcessing ? <i className="fas fa-spinner fa-spin mr-3"></i> : <>Analyze and Start <i className="fas fa-arrow-right ml-3 group-hover:translate-x-1 transition-transform"></i></>}
          </button>
        </div>
      </div>
    </div>
  );
};

export default DocumentIngestion;
