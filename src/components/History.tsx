import React, { useEffect, useState } from 'react';
import { db, auth, handleFirestoreError, OperationType } from '../lib/firebase';
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { Play, Download, Trash2, Clock, Music } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface Generation {
  id: string;
  text: string;
  emotion: string;
  voiceName: string;
  audioData: string;
  createdAt: any;
}

export default function History() {
  const [history, setHistory] = useState<Generation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!auth.currentUser) return;

    const path = 'history';
    const q = query(
      collection(db, path),
      where('userId', '==', auth.currentUser.uid),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Generation[];
      setHistory(data);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, path);
    });

    return () => unsubscribe();
  }, []);

  const playAudio = (base64: string) => {
    const audio = new Audio(`data:audio64;base64,${base64}`);
    audio.play();
  };

  const downloadAudio = (base64: string, filename: string) => {
    const link = document.createElement('a');
    link.href = `data:audio/wav;base64,${base64}`;
    link.download = `${filename}.wav`;
    link.click();
  };

  if (loading) return (
    <div className="flex justify-center p-8">
      <div className="animate-pulse text-zinc-500">Loading history...</div>
    </div>
  );

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-medium flex items-center gap-2 text-zinc-800">
        <Clock className="w-5 h-5" /> Saved Voices
      </h2>
      
      {history.length === 0 ? (
        <div className="text-center p-12 border-2 border-dashed border-zinc-200 rounded-3xl bg-zinc-50/50">
          <Music className="w-10 h-10 text-zinc-300 mx-auto mb-3" />
          <p className="text-zinc-500 font-medium">No history yet</p>
          <p className="text-zinc-400 text-sm">Generate some voices to see them here.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <AnimatePresence mode="popLayout">
            {history.map((item) => (
              <motion.div
                key={item.id}
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="group bg-white p-5 rounded-3xl border border-zinc-200 shadow-sm hover:shadow-md transition-all space-y-3"
              >
                <div className="flex justify-between items-start">
                  <span className="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-zinc-100 text-zinc-500">
                    {item.emotion}
                  </span>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={() => playAudio(item.audioData)}
                      className="p-2 hover:bg-zinc-100 rounded-full transition-colors text-zinc-600"
                    >
                      <Play className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => downloadAudio(item.audioData, `voice_${item.id}`)}
                      className="p-2 hover:bg-zinc-100 rounded-full transition-colors text-zinc-600"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                
                <p className="text-sm text-zinc-700 line-clamp-2 italic font-serif">
                  "{item.text}"
                </p>
                
                <div className="flex items-center justify-between mt-4 text-[10px] text-zinc-400">
                  <span className="flex items-center gap-1">
                    Voice: {item.voiceName}
                  </span>
                  <span>
                    {item.createdAt?.toDate ? new Date(item.createdAt.toDate()).toLocaleDateString() : 'Just now'}
                  </span>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
