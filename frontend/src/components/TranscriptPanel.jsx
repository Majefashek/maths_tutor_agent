/**
 * TranscriptPanel — Live scrolling conversation transcript.
 * - TranscriptMessage is React.memo'd to avoid re-renders on every chunk.
 * - A bouncing-dots typing indicator shows while a tutor message is streaming.
 * - Auto-scroll only fires when the user is already near the bottom (~100 px).
 */

import React, { useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

/* ── Typing indicator (three bouncing dots) ────────────────────────── */
function TypingDots() {
  return (
    <span className="typing-dots" aria-label="Tutor is speaking">
      <span className="typing-dot" />
      <span className="typing-dot" />
      <span className="typing-dot" />
    </span>
  );
}

/* ── Single transcript message (memoised) ──────────────────────────── */
const TranscriptMessage = React.memo(function TranscriptMessage({ msg }) {
  return (
    <motion.div
      key={msg.id}
      initial={{ opacity: 0, y: 10, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
      className={`transcript-message ${msg.role}`}
    >
      <div className="role">
        {msg.role === 'tutor' ? '🎓 Tutor' : '🙋 You'}
      </div>
      <div className="text">
        {msg.text}
        {msg.isStreaming && <TypingDots />}
      </div>
    </motion.div>
  );
});

/* ── Panel ─────────────────────────────────────────────────────────── */
export default function TranscriptPanel({ transcript }) {
  const containerRef = useRef(null);
  const bottomRef = useRef(null);

  /**
   * Returns true when the scroll container is within ~100 px of the bottom.
   */
  const isNearBottom = useCallback(() => {
    const el = containerRef.current;
    if (!el) return true; // default to scrolling if ref not ready
    return el.scrollHeight - el.scrollTop - el.clientHeight < 100;
  }, []);

  // Auto-scroll only when the user hasn't scrolled up
  useEffect(() => {
    if (isNearBottom()) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [transcript, isNearBottom]);

  return (
    <div className="transcript-container" ref={containerRef}>
      {transcript.length === 0 && (
        <div
          style={{
            textAlign: 'center',
            color: 'var(--text-muted)',
            padding: '40px 20px',
          }}
        >
          <p style={{ fontSize: '1.5rem', marginBottom: '8px' }}>💬</p>
          <p>Your conversation will appear here…</p>
        </div>
      )}

      <AnimatePresence initial={false}>
        {transcript.map((msg) => (
          <TranscriptMessage key={msg.id} msg={msg} />
        ))}
      </AnimatePresence>

      <div ref={bottomRef} />
    </div>
  );
}
