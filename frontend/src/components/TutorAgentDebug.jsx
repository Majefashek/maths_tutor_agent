/**
 * TutorAgentDebug — Isolated Debug UI for the Tutor Agent.
 * Focuses on real-time voice and text interaction.
 */

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAudioSession } from '../hooks/useAudioSession';
import TranscriptPanel from './TranscriptPanel';

export default function TutorAgentDebug() {
  const {
    isConnected,
    isSessionActive,
    isMuted,
    isTutorSpeaking,
    transcript,
    startSession,
    endSession,
    toggleMute,
    sendText,
  } = useAudioSession();

  const [textInput, setTextInput] = useState('');
  const scrollRef = useRef(null);

  // Auto-scroll transcript
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [transcript]);

  const handleSendText = (e) => {
    e.preventDefault();
    if (textInput.trim()) {
      sendText(textInput);
      setTextInput('');
    }
  };

  return (
    <div className="debug-layout" style={{ 
      padding: '1rem', 
      maxWidth: '800px', 
      margin: '0 auto',
      display: 'flex',
      flexDirection: 'column',
      gap: '1.5rem',
      height: '100vh',
      maxHeight: '100vh',
      color: '#fff',
      overflow: 'hidden'
    }}>
      {/* ─── Header ──────────────────────────────────────────────── */}
      <header className="glass-card" style={{ 
        padding: '1rem', 
        borderRadius: '1rem',
        background: 'rgba(30, 41, 59, 0.7)',
        backdropFilter: 'blur(10px)',
        border: '1px solid rgba(255,255,255,0.1)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexShrink: 0
      }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.2rem', background: 'linear-gradient(to right, #60a5fa, #a855f7)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Tutor Agent Debug
          </h1>
          <p style={{ margin: 0, opacity: 0.6, fontSize: '0.8rem' }}>Real-time Interaction</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ 
            width: '10px', 
            height: '10px', 
            borderRadius: '50%', 
            background: isTutorSpeaking ? '#10b981' : isConnected ? '#3b82f6' : '#ef4444',
            boxShadow: isTutorSpeaking ? '0 0 10px #10b981' : 'none'
          }} />
          <span style={{ fontSize: '0.8rem', fontWeight: 500 }}>
            {isTutorSpeaking ? 'Speaking' : isConnected ? 'Connected' : 'Offline'}
          </span>
        </div>
      </header>

      {/* ─── Transcript Area ────────────────────────────────────────── */}
      <div className="glass-card" style={{ 
        flex: 1, 
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        borderRadius: '1rem',
        background: 'rgba(30, 41, 59, 0.4)',
        border: '1px solid rgba(255,255,255,0.05)',
        minHeight: 0
      }}>
        <div style={{ flex: 1, overflowY: 'auto', padding: '1rem' }} ref={scrollRef}>
          <TranscriptPanel transcript={transcript} />
        </div>

        {/* Text Input Form */}
        {isSessionActive && (
          <form 
            onSubmit={handleSendText}
            style={{ 
              padding: '0.75rem', 
              background: 'rgba(15, 23, 42, 0.6)',
              display: 'flex',
              gap: '0.5rem',
              borderTop: '1px solid rgba(255,255,255,0.05)',
              flexShrink: 0
            }}
          >
            <input
              type="text"
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              placeholder="Ask anything..."
              style={{
                flex: 1,
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '0.5rem',
                padding: '0.6rem 1rem',
                color: '#fff',
                outline: 'none',
                fontSize: '0.9rem'
              }}
            />
            <button 
              type="submit"
              className="btn-primary"
              style={{
                border: 'none',
                borderRadius: '0.5rem',
                padding: '0 1rem',
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: '0.9rem'
              }}
            >
              Send
            </button>
          </form>
        )}
      </div>

      {/* ─── Controls ───────────────────────────────────────────── */}
      <footer style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        gap: '1rem',
        padding: '0.5rem',
        flexShrink: 0
      }}>
        {!isSessionActive ? (
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => {
              console.log('Starting debug session...');
              startSession();
            }}
            id="start-debug-btn"
            style={{
              padding: '1rem 2.5rem',
              borderRadius: '2rem',
              background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
              color: '#fff',
              border: 'none',
              fontSize: '1.1rem',
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: '0 10px 15px -3px rgba(59, 130, 246, 0.3)',
              zIndex: 100
            }}
          >
            Start Debug Session
          </motion.button>
        ) : (
          <>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginRight: 'auto' }}>
              <div style={{ display: 'flex', gap: '3px', height: '24px', alignItems: 'flex-end' }}>
                {[1, 0.6, 0.8, 0.4, 0.9].map((h, i) => (
                  <motion.div
                    key={i}
                    animate={{ height: isTutorSpeaking ? ['20%', '80%', '40%', '100%', '20%'] : '20%' }}
                    transition={{ repeat: Infinity, duration: 0.6, delay: i * 0.1 }}
                    style={{ width: '4px', background: '#3b82f6', borderRadius: '2px' }}
                  />
                ))}
              </div>
              <span style={{ fontSize: '0.8rem', opacity: 0.6 }}>Tutor Audio</span>
            </div>

            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={toggleMute}
              style={{
                width: '50px',
                height: '50px',
                borderRadius: '50%',
                background: isMuted ? '#ef4444' : 'rgba(255,255,255,0.1)',
                border: '1px solid rgba(255,255,255,0.1)',
                fontSize: '1.5rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              {isMuted ? '🔇' : '🎤'}
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={endSession}
              style={{
                padding: '0.75rem 1.5rem',
                borderRadius: '1rem',
                background: 'rgba(239, 68, 68, 0.2)',
                color: '#ef4444',
                border: '1px solid rgba(239, 68, 68, 0.2)',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              End Session
            </motion.button>
          </>
        )}
      </footer>
    </div>
  );
}
