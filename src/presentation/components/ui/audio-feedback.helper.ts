/**
 * @file audio-feedback.helper.ts
 * @description Trình phát âm thanh phản hồi tức thì cho thao tác máy quét Barcode / QR
 * sử dụng Web Audio API tích hợp sẵn của trình duyệt (Zero dependencies, không cần file .mp3).
 * @module presentation/components/ui
 */

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

/**
 * Phát tiếng Beep thanh (880Hz) xác nhận quét mã thành công (UC15).
 */
export function playBeepSound(): void {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, ctx.currentTime); // Nốt A5

    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.12);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.12);
  } catch {
    // Trình duyệt không hỗ trợ hoặc chặn audio policy
  }
}

/**
 * Phát tiếng Buzz trầm (220Hz) cảnh báo quét mã lỗi / sai trạm / trùng mã (UC15).
 */
export function playBuzzSound(): void {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(220, ctx.currentTime); // Nốt A3 trầm

    gain.gain.setValueAtTime(0.2, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.3);
  } catch {
    // Trình duyệt không hỗ trợ hoặc chặn audio policy
  }
}

