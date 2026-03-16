/**
 * TranscriptPanel — Live scrolling conversation transcript.
 * - TranscriptMessage is React.memo'd to avoid re-renders on every chunk.
 * - A bouncing-dots typing indicator shows while a tutor message is streaming.
 * - Auto-scroll only fires when the user is already near the bottom (~100 px).
 */

import React, { useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';

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
  // Preprocess text to ensure \[ \] and \( \) become $$ $$ and $ $
  const formattedText = (msg.text || '')
    .replace(/\\\[([\s\S]*?)\\\]/g, '$$$$$1$$$$')
    .replace(/\\\(([\s\S]*?)\\\)/g, '$$$1$$');

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
      <div className="text text-markdown">
        <ReactMarkdown
          remarkPlugins={[remarkMath]}
          rehypePlugins={[rehypeKatex]}
        >
          {formattedText}
        </ReactMarkdown>
        {msg.isStreaming && <TypingDots />}
      </div>
    </motion.div>
  );
});

/* ── Panel ─────────────────────────────────────────────────────────── */
export default function TranscriptPanel({ transcript }) {
  const containerRef = useRef(null);
  const bottomRef = useRef(null);

  // Track if we should auto-scroll
  const autoScrollRef = useRef(true);

  /**
   * Returns true when the scroll container is within ~100 px of the bottom.
   */
  const checkNearBottom = useCallback(() => {
    const el = containerRef.current;
    if (!el) return true;
    const distanceToBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    return distanceToBottom < 100;
  }, []);

  // Update auto-scroll lock based on user scrolling
  const handleScroll = () => {
    const nearBottom = checkNearBottom();
    autoScrollRef.current = nearBottom;
  };

  // Auto-scroll only when the user hasn't scrolled up
  useEffect(() => {
    if (autoScrollRef.current) {
      // Determine if a message is currently streaming
      const isStreaming = transcript.some(m => m.isStreaming);
      
      // Use instant scroll during streaming to avoid "twitching"
      // Use smooth scroll for new messages (non-streaming)
      bottomRef.current?.scrollIntoView({ 
        behavior: isStreaming ? 'auto' : 'smooth' 
      });
    }
  }, [transcript]);

  return (
    <div 
      className="transcript-container" 
      ref={containerRef}
      onScroll={handleScroll}
    >
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

      <div ref={bottomRef} style={{ height: '1px' }} />
    </div>
  );
}
