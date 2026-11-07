import { VoiceRecorder } from './voice-recorder';

class FakeMediaRecorder {
  static last: FakeMediaRecorder;
  state: 'inactive' | 'recording' = 'inactive';
  mimeType = 'audio/webm;codecs=opus';
  ondataavailable?: (event: { data: Blob }) => void;
  onstop?: () => void;

  constructor(
    readonly stream: { getTracks: () => { stop: () => void }[] },
    readonly options: MediaRecorderOptions,
  ) {
    FakeMediaRecorder.last = this;
  }

  start(): void {
    this.state = 'recording';
  }

  stop(): void {
    this.state = 'inactive';
    this.ondataavailable?.({ data: new Blob(['voice']) });
    this.onstop?.();
  }
}

describe('VoiceRecorder', () => {
  const track = { stop: vi.fn() };

  beforeEach(() => {
    vi.useFakeTimers();
    track.stop.mockClear();
    vi.stubGlobal('MediaRecorder', FakeMediaRecorder);
    vi.stubGlobal('navigator', {
      mediaDevices: { getUserMedia: vi.fn(async () => ({ getTracks: () => [track] })) },
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('records the microphone and hands back the voice with its length', async () => {
    const recorder = new VoiceRecorder(60, () => {});
    expect(VoiceRecorder.supported()).toBe(true);

    await recorder.start();
    expect(FakeMediaRecorder.last.options.audioBitsPerSecond).toBe(32_000);
    vi.advanceTimersByTime(12_400);
    expect(recorder.seconds()).toBe(12);

    const voice = await recorder.stop();
    expect(voice?.seconds).toBe(12);
    expect(voice?.blob.type).toBe('audio/webm;codecs=opus');
    expect(track.stop).toHaveBeenCalled();
    expect(recorder.seconds()).toBeNull();
  });

  it('stops at the limit and lets the microphone go when discarded', async () => {
    const onLimit = vi.fn();
    const recorder = new VoiceRecorder(60, onLimit);
    await recorder.start();
    vi.advanceTimersByTime(60_000);
    expect(onLimit).toHaveBeenCalledTimes(1);
    expect(recorder.seconds()).toBe(60);

    recorder.cancel();
    expect(track.stop).toHaveBeenCalled();
    expect(recorder.seconds()).toBeNull();
    expect(await recorder.stop()).toBeNull();
  });
});
