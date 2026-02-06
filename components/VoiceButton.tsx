
import React, { useState } from 'react';
import { generateSpeech } from '../services/aiService';

interface VoiceButtonProps {
  text: string;
  size?: 'sm' | 'md';
}

async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

const VoiceButton: React.FC<VoiceButtonProps> = ({ text, size = 'md' }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handlePlay = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isPlaying || isLoading) return;

    setIsLoading(true);
    try {
      const audioData = await generateSpeech(text);
      if (audioData) {
        const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
        const buffer = await decodeAudioData(audioData, audioCtx, 24000, 1);
        const source = audioCtx.createBufferSource();
        source.buffer = buffer;
        source.connect(audioCtx.destination);
        source.onended = () => setIsPlaying(false);
        setIsPlaying(true);
        source.start(0);
      }
    } catch (e) {
      console.error("Speech playback failed", e);
    } finally {
      setIsLoading(false);
    }
  };

  const btnSize = size === 'sm' ? 'w-8 h-8 text-xs' : 'w-10 h-10 text-sm';

  return (
    <button
      onClick={handlePlay}
      className={`${btnSize} rounded-full flex items-center justify-center transition-all bg-brand-50 text-brand-600 hover:bg-brand-100 border border-brand-200 shadow-sm ${isPlaying ? 'animate-pulse' : ''}`}
      title="Listen to content"
      disabled={isLoading}
    >
      {isLoading ? (
        <i className="fas fa-spinner fa-spin"></i>
      ) : isPlaying ? (
        <i className="fas fa-volume-up"></i>
      ) : (
        <i className="fas fa-volume-low"></i>
      )}
    </button>
  );
};

export default VoiceButton;
