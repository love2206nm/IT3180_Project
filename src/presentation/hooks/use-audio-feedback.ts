'use client';

/**
 * @file use-audio-feedback.ts
 * @description Custom React Hook quản lý âm thanh phản hồi cho các thao tác quét mã và thông báo.
 * Tích hợp Web Audio API, cung cấp cờ bật/tắt âm thanh và các hàm phát âm thành công / cảnh báo.
 * @module presentation/hooks
 */

import { useState, useCallback, useEffect } from 'react';
import { playBeepSound, playBuzzSound } from '../components/ui/audio-feedback.helper';

const AUDIO_STORAGE_KEY = 'delivery_hub_audio_feedback_enabled';

export interface UseAudioFeedbackReturn {
  /** Trạng thái âm thanh có đang được bật hay không */
  isAudioEnabled: boolean;
  /** Bật hoặc tắt âm thanh */
  toggleAudio: () => void;
  /** Đặt trạng thái âm thanh */
  setAudioEnabled: (enabled: boolean) => void;
  /** Phát âm thanh Beep xác nhận thành công */
  playSuccess: () => void;
  /** Phát âm thanh Buzz cảnh báo lỗi / quét thất bại */
  playError: () => void;
}

/**
 * Hook quản lý âm thanh phản hồi máy quét tại bưu cục.
 *
 * @param defaultEnabled Trạng thái mặc định ban đầu (mặc định true)
 */
export function useAudioFeedback(defaultEnabled: boolean = true): UseAudioFeedbackReturn {
  const [isAudioEnabled, setIsAudioEnabled] = useState<boolean>(defaultEnabled);

  // Đọc tùy chọn người dùng từ localStorage khi client mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(AUDIO_STORAGE_KEY);
      if (saved !== null) {
        setIsAudioEnabled(saved === 'true');
      }
    } catch {
      // Bỏ qua lỗi truy cập storage (ví dụ SSR hoặc private browsing)
    }
  }, []);

  const setAudioEnabled = useCallback((enabled: boolean) => {
    setIsAudioEnabled(enabled);
    try {
      localStorage.setItem(AUDIO_STORAGE_KEY, String(enabled));
    } catch {
      // Bỏ qua
    }
  }, []);

  const toggleAudio = useCallback(() => {
    setAudioEnabled(!isAudioEnabled);
  }, [isAudioEnabled, setAudioEnabled]);

  const playSuccess = useCallback(() => {
    if (isAudioEnabled) {
      playBeepSound();
    }
  }, [isAudioEnabled]);

  const playError = useCallback(() => {
    if (isAudioEnabled) {
      playBuzzSound();
    }
  }, [isAudioEnabled]);

  return {
    isAudioEnabled,
    toggleAudio,
    setAudioEnabled,
    playSuccess,
    playError,
  };
}
