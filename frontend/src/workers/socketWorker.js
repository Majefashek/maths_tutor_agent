/**
 * Socket Web Worker
 * Manages the WebSocket connection to the Django backend off the main thread.
 * Communicates with the main thread via postMessage.
 */

/** @type {WebSocket|null} */
let ws = null;

/**
 * Message types from main thread:
 *   {type: 'connect', url: string}
 *   {type: 'disconnect'}
 *   {type: 'send', payload: object}
 *   {type: 'send_audio', data: string}  — base64 PCM
 *   {type: 'send_text', data: string}
 */
self.onmessage = (event) => {
  const { type, ...rest } = event.data;

  switch (type) {
    case 'connect':
      connect(rest.url);
      break;
    case 'disconnect':
      disconnect();
      break;
    case 'send':
      send(rest.payload);
      break;
    case 'send_audio':
      if (ws && ws.readyState === WebSocket.OPEN) {
        send({ event: 'audio', data: rest.data });
      }
      break;
    case 'send_text':
      send({ event: 'text', data: rest.data });
      break;
    default:
      console.warn('[SocketWorker] Unknown message type:', type);
  }
};

function connect(url) {
  disconnect(); // clean up any existing connection

  ws = new WebSocket(url);

  ws.onopen = () => {
    self.postMessage({ type: 'connected' });
  };

  ws.onclose = (e) => {
    self.postMessage({ type: 'disconnected', code: e.code, reason: e.reason });
    ws = null;
  };

  ws.onerror = (e) => {
    self.postMessage({ type: 'error', message: 'WebSocket error' });
  };

  ws.onmessage = (e) => {
    try {
      const msg = JSON.parse(e.data);
      if (msg.event !== 'audio') {
        console.log('[SocketWorker] Received:', msg.event);
      }
      self.postMessage({ type: 'message', payload: msg });
    } catch {
      console.warn('[SocketWorker] Non-JSON message received');
    }
  };
}

function disconnect() {
  if (ws) {
    ws.close();
    ws = null;
  }
}

function send(payload) {
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(payload));
  }
}
