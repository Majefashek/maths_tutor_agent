/**
 * useAudioSession — Custom hook for the complete audio pipeline.
 * Manages: AudioContext, AudioWorklet, mic capture, WebSocket worker lifecycle.
 */

import { useRef, useState, useCallback, useEffect } from 'react';

const WS_URL = `ws://${window.location.hostname || 'localhost'}:9000/ws/tutor/session/`;

/**
 * @returns {{
 *   isConnected: boolean,
 *   isSessionActive: boolean,
 *   isMuted: boolean,
 *   isTutorSpeaking: boolean,
 *   transcript: Array<{role: string, text: string, id: number}>,
 *   currentVisual: object|null,
 *   startSession: () => void,
 *   endSession: () => void,
 *   toggleMute: () => void,
 *   sendText: (text: string) => void,
 * }}
 */
export function useAudioSession({ persistSession = false } = {}) {
  const [isConnected, setIsConnected] = useState(false);
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isTutorSpeaking, setIsTutorSpeaking] = useState(false);
  const [transcript, setTranscript] = useState([]);
  const [currentVisual, setCurrentVisual] = useState(null);
  const [isVisualizationLoading, setIsVisualizationLoading] = useState(false);
  const [visualHistory, setVisualHistory] = useState([]);

  const workerRef = useRef(null);
  const audioCtxRef = useRef(null);
  const workletNodeRef = useRef(null);
  const micStreamRef = useRef(null);
  const micProcessorRef = useRef(null);
  const msgIdRef = useRef(0);
  const isMutedRef = useRef(false); // ← tracks mute state without stale closures
  const isInterruptedRef = useRef(false);

  // Keep isMutedRef in sync with isMuted state
  useEffect(() => {
    isMutedRef.current = isMuted;
  }, [isMuted]);

  // ── Server message handler ────────────────────────────────────────
  const handleServerMessage = useCallback((msg) => {
    if (msg.event !== 'audio') {
      console.log('[AudioSession] Server msg:', msg.event, msg.event === 'transcript' ? msg.data?.substring(0, 50) : '');
    }
    switch (msg.event) {
      case 'session_started':
        console.log('[AudioSession] Session confirmed started by server');
        setIsSessionActive(true);
        break;

      case 'audio':
        if (isInterruptedRef.current) return; // Drop in-flight audio if interrupted
        setIsTutorSpeaking(true);
        // Decode base64 → Int16 PCM and send to AudioWorklet
        if (workletNodeRef.current && msg.data) {
          const binary = atob(msg.data);
          const bytes = new Uint8Array(binary.length);
          for (let i = 0; i < binary.length; i++) {
            bytes[i] = binary.charCodeAt(i);
          }
          workletNodeRef.current.port.postMessage({
            type: 'audio',
            samples: bytes.buffer,
          });
        }
        break;

      case 'transcript':
        setTranscript((prev) => {
          const last = prev[prev.length - 1];
          if (last && last.role === msg.role) {
            return [
              ...prev.slice(0, -1),
              { ...last, text: last.text + msg.data, isStreaming: true },
            ];
          }
          return [
            ...prev,
            {
              role: msg.role,
              text: msg.data,
              id: msgIdRef.current++,
              isStreaming: msg.role === 'tutor',
            },
          ];
        });
        break;

      case 'turn_complete':
        console.log('[AudioSession] Turn complete - tutor finished speaking');
        setIsTutorSpeaking(false);
        isInterruptedRef.current = false;
        // Mark the last tutor message as no longer streaming
        setTranscript((prev) => {
          if (prev.length === 0) return prev;
          const last = prev[prev.length - 1];
          if (last.role === 'tutor' && last.isStreaming) {
            return [
              ...prev.slice(0, -1),
              { ...last, isStreaming: false },
            ];
          }
          return prev;
        });
        break;

      case 'VISUAL_GENERATING':
        console.log('[AudioSession] Visual generating:', msg.visual_type, msg.concept);
        setIsVisualizationLoading(true);
        break;

      case 'VISUAL_READY':
        setIsVisualizationLoading(false);
        const visual = msg.data || msg;
        setCurrentVisual(visual);
        setVisualHistory((prev) => [...prev, visual]);
        break;

      case 'interrupted':
        console.log('[AudioSession] Tutor interrupted - clearing audio buffer');
        setIsTutorSpeaking(false);
        isInterruptedRef.current = true;
        if (workletNodeRef.current) {
          workletNodeRef.current.port.postMessage({ type: 'clear' });
        }
        break;

      case 'error':
        console.error('[Server Error]', msg.data);
        break;
    }
  }, []); // safe — only calls stable setState functions

  // ── Ref to always hold the latest handleServerMessage ────────────
  const handleServerMessageRef = useRef(handleServerMessage);
  useEffect(() => {
    handleServerMessageRef.current = handleServerMessage;
  }, [handleServerMessage]);

  // ── Ref to always hold the latest endSession ─────────────────────
  const endSessionRef = useRef(null);

  // ── Worker message handler ────────────────────────────────────────
  const handleWorkerMessage = useCallback((event) => {
    const { type, payload } = event.data;

    switch (type) {
      case 'connected':
        setIsConnected(true);
        // Send start_session as soon as WS is confirmed open
        if (workerRef.current) {
          workerRef.current.postMessage({
            type: 'send',
            payload: { event: 'start_session' },
          });
        }
        break;

      case 'disconnected':
        setIsConnected(false);
        // Full cleanup: mic, AudioContext, worklet, state
        if (endSessionRef.current) {
          endSessionRef.current();
        }
        break;

      case 'error':
        console.error('[AudioSession] Worker error:', event.data.message);
        break;

      case 'message':
        handleServerMessageRef.current(payload); // ← always calls latest version
        break;

      default:
        console.log('[AudioSession] Unknown worker message type:', type);
    }
  }, []); // safe — uses refs instead of direct function references

  // ── Audio Context & Worklet setup ─────────────────────────────────
  const initAudio = useCallback(async () => {
    const ctx = new AudioContext({ sampleRate: 24000 });
    audioCtxRef.current = ctx;

    await ctx.audioWorklet.addModule('/pcmProcessor.js');
    const workletNode = new AudioWorkletNode(ctx, 'pcm-processor');
    workletNode.connect(ctx.destination);
    workletNodeRef.current = workletNode;

    return ctx;
  }, []);

  // ── Mic capture ───────────────────────────────────────────────────
  const startMic = useCallback(async () => {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        sampleRate: 16000,
        channelCount: 1,
        echoCancellation: true,
        noiseSuppression: true,
      },
    });
    micStreamRef.current = stream;

    const ctx = audioCtxRef.current;
    const source = ctx.createMediaStreamSource(stream);
    const processor = ctx.createScriptProcessor(4096, 1, 1);

    processor.onaudioprocess = (e) => {
      if (isMutedRef.current) return; // ← use ref, never stale
      const input = e.inputBuffer.getChannelData(0);

      // Resample from audioContext.sampleRate → 16000
      const ratio = 16000 / ctx.sampleRate;
      const outputLength = Math.floor(input.length * ratio);
      const int16 = new Int16Array(outputLength);

      for (let i = 0; i < outputLength; i++) {
        const srcIndex = Math.floor(i / ratio);
        const sample = Math.max(-1, Math.min(1, input[srcIndex]));
        int16[i] = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
      }

      // Base64 encode and send via worker
      const bytes = new Uint8Array(int16.buffer);
      let binary = '';
      for (let i = 0; i < bytes.length; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      const b64 = btoa(binary);

      if (workerRef.current) {
        workerRef.current.postMessage({ type: 'send_audio', data: b64 });
      } else {
        console.warn('[AudioSession] Mic captured audio but worker is null');
      }
    };

    source.connect(processor);
    processor.connect(ctx.destination);
    micProcessorRef.current = { source, processor };
  }, []); // ← no deps needed, isMuted accessed via ref

  // ── Session control ───────────────────────────────────────────────
  const startSession = useCallback(async () => {
    try {
      // 1. Init audio context
      await initAudio();

      // 2. Create and connect worker
      const worker = new Worker(
        new URL('../workers/socketWorker.js', import.meta.url),
        { type: 'module' }
      );
      worker.onmessage = handleWorkerMessage;
      workerRef.current = worker;

      // 3. Connect WebSocket (start_session is sent from handleWorkerMessage
      //    once the worker confirms 'connected')
      worker.postMessage({ type: 'connect', url: WS_URL });

      // 4. Start mic
      await startMic();
    } catch (err) {
      console.error('[AudioSession] Failed to start:', err);
    }
  }, [initAudio, handleWorkerMessage, startMic]);

  const endSession = useCallback(() => {
    // Stop mic
    if (micProcessorRef.current) {
      micProcessorRef.current.processor.disconnect();
      micProcessorRef.current.source.disconnect();
      micProcessorRef.current = null;
    }
    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach((t) => t.stop());
      micStreamRef.current = null;
    }

    // Clear audio worklet buffer
    if (workletNodeRef.current) {
      workletNodeRef.current.port.postMessage({ type: 'clear' });
      workletNodeRef.current.disconnect();
      workletNodeRef.current = null;
    }

    // Close audio context
    if (audioCtxRef.current) {
      audioCtxRef.current.close();
      audioCtxRef.current = null;
    }

    // Disconnect WebSocket
    if (workerRef.current) {
      workerRef.current.postMessage({
        type: 'send',
        payload: { event: 'end_session' },
      });
      workerRef.current.postMessage({ type: 'disconnect' });
      workerRef.current.terminate();
      workerRef.current = null;
    }

    setIsSessionActive(false);
    setIsConnected(false);
    setIsTutorSpeaking(false);

    // Reset transient UI state unless caller wants to persist
    if (!persistSession) {
      setTranscript([]);
      setCurrentVisual(null);
      setIsVisualizationLoading(false);
      setIsTutorSpeaking(false);
    }
  }, [persistSession]);

  // Keep endSessionRef in sync so handleWorkerMessage can call the latest version
  useEffect(() => {
    endSessionRef.current = endSession;
  }, [endSession]);

  const toggleMute = useCallback(() => {
    setIsMuted((prev) => !prev);
  }, []);

  const sendText = useCallback((text) => {
    if (workerRef.current && text.trim()) {
      workerRef.current.postMessage({ type: 'send_text', data: text });
      setTranscript((prev) => [
        ...prev,
        { role: 'student', text, id: msgIdRef.current++ },
      ]);
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => endSession();
  }, [endSession]);

  return {
    isConnected,
    isSessionActive,
    isMuted,
    isTutorSpeaking,
    transcript,
    currentVisual,
    isVisualizationLoading,
    visualHistory,
    startSession,
    endSession,
    toggleMute,
    sendText,
  };
}