
import React from 'react';

const Card: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="bg-white p-8 md:p-14 rounded-[2rem] md:rounded-[3rem] shadow-2xl shadow-slate-200/50 border border-slate-50 animate-in fade-in slide-in-from-bottom-4 duration-500">
    {children}
  </div>
);

// Fixed: removed stray 'Section' identifier after closing parenthesis to prevent redeclaration errors
const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <section className="mb-8">
    <h3 className="text-xl font-black text-slate-900 mb-4">{title}</h3>
    <div className="text-slate-600 font-medium leading-relaxed space-y-4">
      {children}
    </div>
  </section>
);

export const PrivacyPage: React.FC = () => (
  <Card>
    <h2 className="text-3xl md:text-4xl font-black text-slate-900 mb-8">Privacy Policy</h2>
    <Section title="Data Handling">
      <p>At Sulva-Tutor AI, your privacy is a core priority. Our AI tutor processes your uploaded documents locally and via secure, transient API calls to generate study materials.</p>
      <p>We do not store your personal documents permanently on our servers. All analysis happens in real-time to facilitate your study session.</p>
    </Section>
    <Section title="Camera & Images">
      <p>When you use the handwritten answer grading feature, the camera access is used strictly to capture your answer. These images are transmitted securely for processing and are not used for any purpose other than grading your current session.</p>
    </Section>
    <Section title="Cookies & Analytics">
      <p>We use minimal session cookies to maintain the state of your current quiz. No third-party tracking or advertising data is harvested from your usage of this tool.</p>
    </Section>
  </Card>
);

export const TermsPage: React.FC = () => (
  <Card>
    <h2 className="text-3xl md:text-4xl font-black text-slate-900 mb-8">Terms of Service</h2>
    <Section title="Usage Agreement">
      <p>By using Sulva-Tutor AI, you agree to use the service for educational purposes only. You are responsible for the content you upload and must ensure it does not violate any third-party copyrights.</p>
    </Section>
    <Section title="AI Disclaimer">
      <p>While our neural models are highly advanced, AI-generated content can occasionally be inaccurate. Sulva-Tutor AI is a study aid, not a definitive academic source. Always cross-reference critical information with your official textbooks.</p>
    </Section>
    <Section title="Limitation of Liability">
      <p>Sulva-Tutor AI provides this tool "as is" without any express or implied warranties. We are not liable for any academic performance outcomes or data loss during your sessions.</p>
    </Section>
  </Card>
);

export const HelpPage: React.FC = () => (
  <Card>
    <h2 className="text-3xl md:text-4xl font-black text-slate-900 mb-8">Help Center</h2>
    <Section title="How to Start">
      <p>Simply upload a PDF, Word document, or paste your notes directly into the homepage. Our AI will analyze the text to build a customized curriculum for you.</p>
    </Section>
    <Section title="Grading Handwritten Answers">
      <p>For 'Theory' mode, write your answer on physical paper. When prompted, use your device's camera to snap a clear, top-down photo. For best results, ensure good lighting and clear handwriting.</p>
    </Section>
    <Section title="Common Questions">
      <div className="space-y-4">
        <div>
          <h4 className="font-bold text-slate-900">What file types are supported?</h4>
          <p className="text-sm">We support PDF, DOCX, PPTX, and plain text files.</p>
        </div>
        <div>
          <h4 className="font-bold text-slate-900">Why did grading fail?</h4>
          <p className="text-sm">Grading usually fails due to poor lighting, blurry images, or extremely small handwriting. Try taking the photo again in a brighter environment.</p>
        </div>
        <div>
          <h4 className="font-bold text-slate-900">Is my data saved?</h4>
          <p className="text-sm">No, sessions are ephemeral. If you refresh the page, your current quiz progress will be reset to protect your privacy.</p>
        </div>
      </div>
    </Section>
  </Card>
);
