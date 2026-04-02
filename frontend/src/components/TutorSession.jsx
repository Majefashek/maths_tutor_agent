/**
 * TutorSession — Main session component.
 * Orchestrates the audio session, controls, transcript, and visual engine.
 */

import { useState } from 'react';
import { motion } from 'framer-motion';
import { useAudioSession } from '../hooks/useAudioSession';
import VisualEngine from './VisualEngine';
import TranscriptPanel from './TranscriptPanel';

export default function TutorSession() {
  const {
    isConnected,
    isSessionActive,
    isMuted,
    isTutorSpeaking,
    transcript,
    currentVisual,
    isVisualizationLoading,
    startSession,
    endSession,
    toggleMute,
    sendText,
  } = useAudioSession();

  const [textInput, setTextInput] = useState('');

  const handleSendText = (e) => {
    e.preventDefault();
    if (textInput.trim()) {
      sendText(textInput);
      setTextInput('');
    }
  };

  return (
    <div className="app-layout">
      {/* ─── Header ──────────────────────────────────────────────── */}
      <header className="app-header glass-card">
        <div>
          <h1>✨ Maths Tutor AI</h1>
          <span className="subtitle">Powered by Gemini</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span
            className={`status-dot ${
              isTutorSpeaking ? 'speaking' : isConnected ? 'connected' : 'disconnected'
            }`}
          />
          <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
            {isTutorSpeaking
              ? 'Tutor is speaking…'
              : isSessionActive
              ? 'Session active'
              : 'Ready'}
          </span>
        </div>
      </header>

      {/* ─── Visual Panel ────────────────────────────────────────── */}
      <div className="visual-panel glass-card">
        <VisualEngine visual={currentVisual} isLoading={isVisualizationLoading} />
      </div>

      {/* ─── Chat Panel ──────────────────────────────────────────── */}
      <div className="chat-panel glass-card" style={{ display: 'flex', flexDirection: 'column' }}>
        <TranscriptPanel transcript={transcript} />

        {/* Text input */}
        {isSessionActive && (
          <form className="text-input-container" onSubmit={handleSendText}>
            <input
              type="text"
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              placeholder="Type a question…"
              id="text-question-input"
            />
            <button type="submit" className="btn btn-primary btn-icon" title="Send">
              ➤
            </button>
          </form>
        )}
      </div>

      {/* ─── Control Bar ─────────────────────────────────────────── */}
      <div className="control-bar glass-card">
        {!isSessionActive ? (
          <motion.button
            className="btn btn-primary btn-lg"
            onClick={startSession}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            title="Start lesson"
            id="start-session-btn"
          >
            🎙
          </motion.button>
        ) : (
          <>
            {/* Audio Visualizer */}
            <div className={`audio-visualizer ${isTutorSpeaking ? 'active' : ''}`}>
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="bar" style={{ height: '8px' }} />
              ))}
            </div>

            {/* Mute Toggle */}
            <motion.button
              className={`btn btn-icon ${isMuted ? 'btn-danger' : 'btn-ghost'}`}
              onClick={toggleMute}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              title={isMuted ? 'Unmute' : 'Mute'}
              id="mute-toggle-btn"
            >
              {isMuted ? '🔇' : '🎤'}
            </motion.button>

            {/* End Session */}
            <motion.button
              className="btn btn-danger btn-icon"
              onClick={endSession}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              title="End lesson"
              id="end-session-btn"
            >
              ⏹
            </motion.button>
          </>
        )}
      </div>
    </div>
  );
}
