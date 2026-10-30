'use client';

/**
 * @file use-barcode-scanner.ts
 * @description Custom React Hook hỗ trợ máy quét mã vạch chuyên dụng (USB/Laser Hardware Scanner).
 * Nhận diện chuỗi ký tự gõ tốc độ cao (< 50ms giữa các phím) kết thúc bằng phím Enter,
 * tự động duy trì Focus vào ô quét và kích hoạt hàm xử lý mã bưu kiện.
 * @module presentation/hooks
 */

import { useRef, useEffect, useCallback } from 'react';

export interface UseBarcodeScannerOptions {
  /** Hàm callback được gọi khi quét mã thành công */
  onScan: (barcode: string) => void | Promise<void>;
  /** Độ dài tối thiểu của mã vạch hợp lệ (mặc định 6 ký tự) */
  minLength?: number;
  /** Khoảng thời gian tối đa giữa 2 ký tự của máy quét (ms, mặc định 50ms) */
  maxIntervalMs?: number;
  /** Tự động duy trì focus vào ô nhập liệu (mặc định true) */
  autoFocus?: boolean;
}

export interface UseBarcodeScannerReturn {
  /** Ref gắn vào phần tử HTMLInputElement để quản lý focus */
  inputRef: React.RefObject<HTMLInputElement | null>;
  /** Hàm chủ động chuyển focus lại vào ô quét */
  focus: () => void;
  /** Hàm xử lý submit thủ công từ form HTML */
  handleManualSubmit: (e: React.FormEvent<HTMLFormElement> | React.SyntheticEvent) => void;
}

/**
 * Hook lắng nghe và xử lý tín hiệu từ máy quét mã vạch cầm tay.
 */
export function useBarcodeScanner(options: UseBarcodeScannerOptions): UseBarcodeScannerReturn {
  const {
    onScan,
    minLength = 6,
    maxIntervalMs = 60,
    autoFocus = true,
  } = options;

  const inputRef = useRef<HTMLInputElement | null>(null);
  const bufferRef = useRef<string>('');
  const lastKeyTimeRef = useRef<number>(0);

  const focus = useCallback(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  // Tự động giữ focus khi trang tải xong
  useEffect(() => {
    if (autoFocus) {
      focus();
    }
  }, [autoFocus, focus]);

  // Lắng nghe phím bấm tốc độ cao từ máy quét phần cứng
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Bỏ qua các phím điều khiển hệ thống
      if (e.ctrlKey || e.altKey || e.metaKey) return;

      const now = Date.now();
      const interval = now - lastKeyTimeRef.current;
      lastKeyTimeRef.current = now;

      if (e.key === 'Enter') {
        const scannedText = bufferRef.current.trim().toUpperCase();
        bufferRef.current = '';

        if (scannedText.length >= minLength) {
          e.preventDefault();
          void onScan(scannedText);
        }
        return;
      }

      // Nếu chỉ là một ký tự hiển thị được
      if (e.key.length === 1) {
        // Nếu khoảng cách giữa 2 phím quá dài (> maxIntervalMs), reset buffer
        if (interval > maxIntervalMs) {
          bufferRef.current = e.key;
        } else {
          bufferRef.current += e.key;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onScan, minLength, maxIntervalMs]);

  // Xử lý khi người dùng nhấn Enter trực tiếp trên input
  const handleManualSubmit = useCallback(
    (e: React.FormEvent<HTMLFormElement> | React.SyntheticEvent) => {
      e.preventDefault();
      if (!inputRef.current) return;

      const code = inputRef.current.value.trim().toUpperCase();
      if (code.length >= minLength) {
        inputRef.current.value = '';
        void onScan(code);
      }
      focus();
    },
    [onScan, minLength, focus]
  );

  return {
    inputRef,
    focus,
    handleManualSubmit,
  };
}
