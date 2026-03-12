/**
 * AudioWorklet Processor — PCM Playback
 * Receives raw PCM 24kHz Int16 chunks and writes them to the audio output.
 * Runs entirely off the main thread for zero-jank audio.
 */
class PCMProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    /** @type {Float32Array[]} */
    this._buffer = [];
    this._bufferOffset = 0;

    this.port.onmessage = (event) => {
      if (event.data.type === 'audio') {
        // Convert Int16 PCM → Float32 and queue
        const int16 = new Int16Array(event.data.samples);
        const float32 = new Float32Array(int16.length);
        for (let i = 0; i < int16.length; i++) {
          float32[i] = int16[i] / 32768;
        }
        this._buffer.push(float32);
      } else if (event.data.type === 'clear') {
        this._buffer = [];
        this._bufferOffset = 0;
      }
    };
  }

  process(inputs, outputs) {
    const output = outputs[0];
    if (!output || !output[0]) return true;

    const channel = output[0];
    let written = 0;

    while (written < channel.length && this._buffer.length > 0) {
      const current = this._buffer[0];
      const remaining = current.length - this._bufferOffset;
      const needed = channel.length - written;
      const toCopy = Math.min(remaining, needed);

      channel.set(
        current.subarray(this._bufferOffset, this._bufferOffset + toCopy),
        written
      );

      written += toCopy;
      this._bufferOffset += toCopy;

      if (this._bufferOffset >= current.length) {
        this._buffer.shift();
        this._bufferOffset = 0;
      }
    }

    // Fill rest with silence
    for (let i = written; i < channel.length; i++) {
      channel[i] = 0;
    }

    return true;
  }
}

registerProcessor('pcm-processor', PCMProcessor);
