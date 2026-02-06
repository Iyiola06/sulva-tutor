
import React, { useRef, useState, useEffect } from 'react';

interface CameraCaptureProps {
  onCapture: (base64: string) => void;
  onCancel: () => void;
}

const CameraCapture: React.FC<CameraCaptureProps> = ({ onCapture, onCancel }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      });
      setStream(mediaStream);
      if (videoRef.current) videoRef.current.srcObject = mediaStream;
    } catch (err) {
      setError('Could not access camera. Ensure permissions are granted.');
    }
  };

  useEffect(() => {
    startCamera();
    return () => stream?.getTracks().forEach(track => track.stop());
  }, []);

  const takePicture = () => {
    if (videoRef.current && canvasRef.current) {
      const context = canvasRef.current.getContext('2d');
      if (context) {
        canvasRef.current.width = videoRef.current.videoWidth;
        canvasRef.current.height = videoRef.current.videoHeight;
        context.drawImage(videoRef.current, 0, 0);
        onCapture(canvasRef.current.toDataURL('image/jpeg', 0.8));
      }
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black flex flex-col items-center justify-center p-4 backdrop-blur-md">
      <div className="relative w-full max-w-lg aspect-[3/4] rounded-3xl overflow-hidden bg-slate-900 shadow-2xl border border-white/10">
        {error ? (
          <div className="flex flex-col items-center justify-center h-full p-8 text-white text-center">
            <i className="fas fa-exclamation-triangle text-4xl text-rose-500 mb-4"></i>
            <p>{error}</p>
            <button onClick={onCancel} className="mt-6 px-8 py-3 bg-white/10 rounded-full hover:bg-brand-600 transition-colors">Go Back</button>
          </div>
        ) : (
          <>
            <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
            <div className="absolute inset-0 border-[2px] border-white/20 m-10 rounded-2xl pointer-events-none">
              <div className="absolute top-0 left-0 w-12 h-12 border-t-4 border-l-4 border-brand-500 rounded-tl-2xl"></div>
              <div className="absolute top-0 right-0 w-12 h-12 border-t-4 border-r-4 border-brand-500 rounded-tr-2xl"></div>
              <div className="absolute bottom-0 left-0 w-12 h-12 border-b-4 border-l-4 border-brand-500 rounded-bl-2xl"></div>
              <div className="absolute bottom-0 right-0 w-12 h-12 border-b-4 border-r-4 border-brand-500 rounded-br-2xl"></div>
            </div>
          </>
        )}
      </div>
      <canvas ref={canvasRef} className="hidden" />
      {!error && (
        <div className="flex items-center space-x-12 mt-12">
          <button onClick={onCancel} className="w-14 h-14 flex items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 transition-all"><i className="fas fa-times text-xl"></i></button>
          <button onClick={takePicture} className="w-24 h-24 flex items-center justify-center rounded-full bg-white p-1 hover:scale-105 active:scale-95 transition-all shadow-[0_0_30px_rgba(255,255,255,0.3)]">
            <div className="w-full h-full rounded-full border-4 border-brand-600 bg-white flex items-center justify-center"><div className="w-14 h-14 rounded-full bg-brand-600"></div></div>
          </button>
          <div className="w-14 h-14"></div>
        </div>
      )}
      <p className="text-white/60 text-xs font-bold uppercase tracking-widest mt-10">Capture your handwriting clearly</p>
    </div>
  );
};

export default CameraCapture;
