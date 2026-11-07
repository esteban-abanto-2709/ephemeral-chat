import { signal } from '@angular/core';

const bitsPerSecond = 32_000;

export interface Voice {
  blob: Blob;
  seconds: number;
}

export class VoiceRecorder {
  private readonly _seconds = signal<number | null>(null);
  readonly seconds = this._seconds.asReadonly();
  private recorder?: MediaRecorder;
  private started = 0;
  private timer?: ReturnType<typeof setInterval>;

  constructor(
    private readonly maxSeconds: number,
    private readonly onLimit: () => void,
  ) {}

  static supported(): boolean {
    return typeof MediaRecorder !== 'undefined' && !!navigator.mediaDevices?.getUserMedia;
  }

  async start(): Promise<void> {
    if (this.recorder) {
      return;
    }
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    this.recorder = new MediaRecorder(stream, { audioBitsPerSecond: bitsPerSecond });
    this.recorder.start();
    this.started = Date.now();
    this._seconds.set(0);
    this.timer = setInterval(() => {
      const seconds = this.elapsed();
      this._seconds.set(Math.min(seconds, this.maxSeconds));
      if (seconds >= this.maxSeconds) {
        this.onLimit();
      }
    }, 250);
  }

  stop(): Promise<Voice | null> {
    const recorder = this.recorder;
    if (!recorder) {
      return Promise.resolve(null);
    }
    const seconds = Math.min(this.maxSeconds, Math.max(1, Math.round(this.elapsedExactly())));
    return new Promise((resolve) => {
      const chunks: Blob[] = [];
      recorder.ondataavailable = (event) => chunks.push(event.data);
      recorder.onstop = () =>
        resolve({ blob: new Blob(chunks, { type: recorder.mimeType }), seconds });
      this.end();
    });
  }

  cancel(): void {
    this.end();
  }

  private end(): void {
    clearInterval(this.timer);
    if (this.recorder && this.recorder.state !== 'inactive') {
      this.recorder.stop();
    }
    this.recorder?.stream.getTracks().forEach((track) => track.stop());
    this.recorder = undefined;
    this._seconds.set(null);
  }

  private elapsed(): number {
    return Math.floor(this.elapsedExactly());
  }

  private elapsedExactly(): number {
    return (Date.now() - this.started) / 1000;
  }
}
