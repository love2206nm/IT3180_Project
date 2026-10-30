'use client';

/**
 * @file barcode-scanner-box.tsx
 * @description Component Hộp Quét Mã Vạch chuyên nghiệp dành cho Bưu cục và Kho điều phối.
 * Tương thích hoàn hảo với súng quét mã vạch cầm tay (USB/Laser Hardware Scanner) và hỗ trợ gõ tay.
 * Phục vụ nghiệp vụ Quét Inbound nhập trạm (UC15) và Điều phối gán Shipper (UC16).
 * @module presentation/components/shipment
 */

import React, { useState } from 'react';
import { ScanBarcode, Volume2, VolumeX, Loader2, Sparkles, X } from 'lucide-react';
import { Button } from '../ui/button';
import { useBarcodeScanner } from '../../hooks/use-barcode-scanner';
import { useAudioFeedback } from '../../hooks/use-audio-feedback';

export interface BarcodeScannerBoxProps {
  /** Callback kích hoạt khi quét được mã hợp lệ */
  onScan: (barcode: string) => void | Promise<void>;
  /** Trạng thái máy chủ đang xử lý dữ liệu của mã vừa quét */
  isProcessing?: boolean;
  /** Tiêu đề hộp quét */
  title?: string;
  /** Hướng dẫn hiển thị trong ô nhập liệu */
  placeholder?: string;
  /** Mô tả phụ */
  description?: string;
  className?: string;
}

export const BarcodeScannerBox: React.FC<BarcodeScannerBoxProps> = ({
  onScan,
  isProcessing = false,
  title = 'Quét mã vận đơn bưu kiện',
  placeholder = 'Bấm súng quét hoặc gõ mã vận đơn (VD: TRK-20261029-XXXX)...',
  description = 'Sẵn sàng nhận tín hiệu từ máy quét mã vạch laser. Con trỏ tự động duy trì trong ô nhập.',
  className = '',
}) => {
  const [manualCode, setManualCode] = useState('');
  const { isAudioEnabled, toggleAudio, playSuccess, playError } = useAudioFeedback(true);

  const handleScanCode = async (code: string) => {
    try {
      await onScan(code);
      playSuccess();
    } catch {
      playError();
    }
  };

  const { inputRef, focus, handleManualSubmit } = useBarcodeScanner({
    onScan: handleScanCode,
    minLength: 5,
    autoFocus: true,
  });

  const onSubmitForm = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const code = manualCode.trim().toUpperCase();
    if (!code) return;

    setManualCode('');
    void handleScanCode(code);
    focus();
  };

  const clearInput = () => {
    setManualCode('');
    focus();
  };

  return (
    <div className={`bg-white rounded-xl border border-slate-200 p-6 shadow-sm ${className}`}>
      {/* Header hộp quét */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-primary/10 text-primary rounded-lg">
            <ScanBarcode className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-800 text-base">{title}</h3>
            <p className="text-xs text-slate-500">{description}</p>
          </div>
        </div>

        {/* Nút bật tắt âm thanh */}
        <button
          type="button"
          onClick={toggleAudio}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
            isAudioEnabled
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
              : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100'
          }`}
          title={isAudioEnabled ? 'Đang bật âm thanh phản hồi' : 'Đang tắt âm thanh'}
        >
          {isAudioEnabled ? (
            <>
              <Volume2 className="w-3.5 h-3.5" />
              <span>Âm thanh: Bật</span>
            </>
          ) : (
            <>
              <VolumeX className="w-3.5 h-3.5" />
              <span>Âm thanh: Tắt</span>
            </>
          )}
        </button>
      </div>

      {/* Form nhập liệu & quét mã */}
      <form onSubmit={onSubmitForm} className="relative flex items-center gap-3">
        <div className="relative flex-1">
          <input
            ref={inputRef}
            type="text"
            value={manualCode}
            onChange={(e) => setManualCode(e.target.value)}
            placeholder={placeholder}
            disabled={isProcessing}
            className="w-full pl-11 pr-10 py-3.5 text-base font-mono uppercase bg-slate-50 border-2 border-slate-200 rounded-xl focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all placeholder:normal-case placeholder:font-sans placeholder:text-slate-400 disabled:opacity-60"
          />
          <ScanBarcode className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />

          {manualCode && (
            <button
              type="button"
              onClick={clearInput}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 rounded"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <Button
          type="submit"
          disabled={isProcessing || !manualCode.trim()}
          className="h-12 px-6 font-semibold shrink-0"
        >
          {isProcessing ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Đang xử lý...
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4 mr-1.5" />
              Xác nhận
            </>
          )}
        </Button>
      </form>

      {/* Gợi ý phím tắt */}
      <div className="mt-3 flex items-center justify-between text-[11px] text-slate-400">
        <span>Mẹo: Nhấn phím Enter để quét nhanh nếu nhập bằng bàn phím.</span>
        <span className="font-mono text-emerald-600 font-medium">● Máy quét đang hoạt động</span>
      </div>
    </div>
  );
};
