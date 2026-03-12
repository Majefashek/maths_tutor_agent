/**
 * TranscriptPanel — Live scrolling conversation transcript.
 */

import { useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function TranscriptPanel({ transcript }) {
  const bottomRef = useRef(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [transcript]);

  return (
    <div className="transcript-container">
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
            <div className="text">{msg.text}</div>
          </motion.div>
        ))}
      </AnimatePresence>

      <div ref={bottomRef} />
    </div>
  );
}
