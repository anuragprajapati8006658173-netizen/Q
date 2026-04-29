/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { auth, signInWithGoogle, db, handleFirestoreError, OperationType } from './lib/firebase';
import { onAuthStateChanged, User, signOut } from 'firebase/auth';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { 
  Mic2, 
  Sparkles, 
  Play, 
  Download, 
  History as HistoryIcon, 
  Settings, 
  LogOut,
  ChevronRight,
  Loader2,
  Volume2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { EMOTIONS, generateSpeech, detectEmotion, VoiceEmotion } from './services/ttsService';
import History from './components/History';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [text, setText] = useState('');
  const [emotion, setEmotion] = useState<VoiceEmotion>('Normal');
  const [voiceName, setVoiceName] = useState<'Puck' | 'Charon' | 'Kore' | 'Fenrir' | 'Zephyr'>('Kore');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isDetecting, setIsDetecting] = useState(false);
  const [currentAudio, setCurrentAudio] = useState<string | null>(null);
  const [autoDetect, setAutoDetect] = useState(true);
  
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#FDFDFB] flex flex-col items-center justify-center p-6 space-y-4">
        <div className="w-16 h-16 bg-[#5A5A40] rounded-full flex items-center justify-center text-white shadow-lg animate-pulse">
          <Mic2 className="w-8 h-8" />
        </div>
        <p className="text-zinc-400 font-medium animate-pulse">SwarBhav Loading...</p>
      </div>
    );
  }

  const handleGenerate = async () => {
    if (!text.trim() || !user) return;
    
    setIsGenerating(true);
    let finalEmotion = emotion;

    try {
      if (autoDetect) {
        setIsDetecting(true);
        finalEmotion = await detectEmotion(text);
        setEmotion(finalEmotion);
        setIsDetecting(false);
      }

      const base64 = await generateSpeech(text, finalEmotion, voiceName);
      setCurrentAudio(base64);

      // Save to History
      const path = 'history';
      try {
        await addDoc(collection(db, path), {
          text,
          emotion: finalEmotion,
          voiceName,
          audioData: base64,
          userId: user.uid,
          createdAt: serverTimestamp()
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, path);
      }

      // Auto play
      const audio = new Audio(`data:audio/wav;base64,${base64}`);
      audio.play();
    } catch (error) {
      console.error("Generation failed", error);
    } finally {
      setIsGenerating(false);
      setIsDetecting(false);
    }
  };

  const handleDownload = () => {
    if (!currentAudio) return;
    const link = document.createElement('a');
    link.href = `data:audio/wav;base64,${currentAudio}`;
    link.download = `swarbhav_${Date.now()}.wav`;
    link.click();
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-[#F5F5F0] flex flex-col items-center justify-center p-6 font-sans">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center max-w-md space-y-8"
        >
          <div className="w-24 h-24 bg-[#5A5A40] rounded-full mx-auto flex items-center justify-center text-white shadow-xl shadow-zinc-200">
            <Mic2 className="w-12 h-12" />
          </div>
          <div className="space-y-4">
            <h1 className="text-5xl font-serif text-[#1a1a1a] tracking-tight leading-tight">
              SwarBhav AI
            </h1>
            <p className="text-zinc-500 text-lg leading-relaxed px-4">
              Bring your stories to life with emotional high-quality AI voices.
              Haste, Rote aur Gate hue voices in seconds.
            </p>
          </div>
          <button 
            onClick={signInWithGoogle}
            className="w-full py-5 px-8 bg-[#5A5A40] text-white rounded-full text-lg font-medium shadow-lg hover:shadow-xl hover:bg-[#4a4a35] transition-all flex items-center justify-center gap-3 group"
          >
            Sign in with Google
            <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FDFDFB] text-[#1a1a1a] font-sans pb-20">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 h-20 bg-white/80 backdrop-blur-md border-b border-zinc-100 z-50 flex items-center justify-between px-6 md:px-12">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-[#5A5A40] rounded-xl flex items-center justify-center text-white">
            <Mic2 className="w-6 h-6" />
          </div>
          <span className="text-xl font-serif font-bold">SwarBhav</span>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="hidden md:block text-right">
            <p className="text-xs font-bold text-zinc-800 uppercase tracking-widest">{user.displayName}</p>
            <p className="text-[10px] text-zinc-400">Pro Creator</p>
          </div>
          <button 
            onClick={() => signOut(auth)}
            className="p-2 hover:bg-zinc-100 rounded-full transition-colors"
          >
            <LogOut className="w-5 h-5 text-zinc-400" />
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto pt-32 px-6 grid grid-cols-1 lg:grid-cols-12 gap-12">
        {/* Input Section */}
        <div className="lg:col-span-7 space-y-10">
          <section className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-3xl font-serif">Voice Customizer</h2>
              <div className="flex items-center gap-2 bg-zinc-100 p-1 rounded-full">
                <button 
                  onClick={() => setAutoDetect(true)}
                  className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${autoDetect ? 'bg-white shadow-sm text-zinc-800' : 'text-zinc-500 hover:text-zinc-700'}`}
                >
                  AUTO
                </button>
                <button 
                  onClick={() => setAutoDetect(false)}
                  className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${!autoDetect ? 'bg-white shadow-sm text-zinc-800' : 'text-zinc-500 hover:text-zinc-700'}`}
                >
                  MANUAL
                </button>
              </div>
            </div>

            <div className="relative">
              <textarea 
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Type your story here... AI will automatically detect the mood."
                className="w-full h-64 p-8 rounded-[40px] border-2 border-zinc-100 bg-white focus:border-[#5A5A40] focus:ring-0 text-xl font-serif leading-relaxed resize-none transition-all placeholder:text-zinc-300 shadow-sm"
              />
              <div className="absolute top-8 right-8 text-zinc-200">
                <Volume2 className="w-12 h-12 rotate-[-5deg]" />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Select Emotion</label>
                <div className="flex flex-wrap gap-2">
                  {EMOTIONS.map((e) => (
                    <button
                      key={e}
                      disabled={autoDetect && !isDetecting}
                      onClick={() => setEmotion(e)}
                      className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                        emotion === e 
                          ? 'bg-[#5A5A40] text-white shadow-lg' 
                          : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
                      } ${autoDetect ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      {e}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Select Voice Profile</label>
                <select 
                  value={voiceName}
                  onChange={(e) => setVoiceName(e.target.value as any)}
                  className="w-full p-4 rounded-3xl bg-zinc-100 border-none focus:ring-2 focus:ring-[#5A5A40] font-medium text-sm text-zinc-700"
                >
                  <option value="Kore">Kore (Natural & Sweet)</option>
                  <option value="Puck">Puck (Cheerful & High)</option>
                  <option value="Charon">Charon (Deep & Resonant)</option>
                  <option value="Fenrir">Fenrir (Calm & Strong)</option>
                  <option value="Zephyr">Zephyr (Soft & Airy)</option>
                </select>
              </div>
            </div>

            <button 
              onClick={handleGenerate}
              disabled={isGenerating || !text.trim()}
              className="w-full py-6 bg-[#5A5A40] text-white rounded-[40px] text-xl font-bold shadow-xl shadow-zinc-200 hover:shadow-2xl hover:bg-[#4a4a35] disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-4 group"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-6 h-6 animate-spin" />
                  {isDetecting ? "Detecting Mood..." : "Finding your Voice..."}
                </>
              ) : (
                <>
                  <Sparkles className="w-6 h-6 group-hover:scale-125 transition-transform" />
                  Generate Emotional Voice
                </>
              )}
            </button>
          </section>

          <AnimatePresence>
            {currentAudio && (
              <motion.section 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-[#5A5A40] p-8 rounded-[40px] text-white flex items-center justify-between shadow-2xl shadow-zinc-200"
              >
                <div className="flex items-center gap-6">
                  <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center">
                    <Play 
                      className="w-8 h-8 fill-white cursor-pointer hover:scale-110 transition-transform" 
                      onClick={() => {
                        const audio = new Audio(`data:audio/wav;base64,${currentAudio}`);
                        audio.play();
                      }}
                    />
                  </div>
                  <div>
                    <h3 className="text-xl font-medium">Ready to download</h3>
                    <p className="text-white/60 text-sm">{emotion} voice generated</p>
                  </div>
                </div>
                <button 
                  onClick={handleDownload}
                  className="bg-white text-[#5A5A40] px-8 py-4 rounded-full font-bold flex items-center gap-2 hover:bg-zinc-100 transition-colors"
                >
                  <Download className="w-5 h-5" />
                  Download MP3
                </button>
              </motion.section>
            )}
          </AnimatePresence>
        </div>

        {/* History Section */}
        <div className="lg:col-span-5 border-l border-zinc-100 pl-0 lg:pl-12">
          <History />
        </div>
      </main>

      {/* Footer Navigation (Mobile) */}
      <nav className="fixed bottom-0 left-0 right-0 h-20 bg-white border-t border-zinc-100 md:hidden flex items-center justify-around px-6 z-50">
        <button className="flex flex-col items-center gap-1 text-[#5A5A40]">
          <Mic2 className="w-6 h-6" />
          <span className="text-[10px] font-bold">CREATE</span>
        </button>
        <button className="flex flex-col items-center gap-1 text-zinc-300">
          <HistoryIcon className="w-6 h-6" />
          <span className="text-[10px] font-bold">SAVED</span>
        </button>
        <button className="flex flex-col items-center gap-1 text-zinc-300">
          <Settings className="w-6 h-6" />
          <span className="text-[10px] font-bold">PROFILE</span>
        </button>
      </nav>
    </div>
  );
}

