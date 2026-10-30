'use client';

/**
 * @file page.tsx
 * @description Màn hình Quét Inbound Nhập Kho Bưu Cục.
 * Hỗ trợ súng quét mã vạch tốc độ cao, âm thanh phản hồi Web Audio API,
 * và kết nối trực tiếp với Server Action checkInHubAction.
 * @module app/(dashboard)/shipments/inbound
 */

import React, { useState, useTransition } from 'react';
import Link from 'next/link';
import { ScanBarcode, ArrowLeft, CheckCircle2, AlertCircle, Volume2, VolumeX, Package, Sparkles } from 'lucide-react';
import { Button } from '../../../../presentation/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '../../../../presentation/components/ui/card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../../../presentation/components/ui/table';
import { OrderStatusBadge } from '../../../../presentation/components/ui/badge';
import { checkInHubAction } from '../../../../presentation/actions/shipment.actions';
import { isSuccess } from '../../../../application/interfaces';
import { useAudioFeedback } from '../../../../presentation/hooks/use-audio-feedback';
import { useBarcodeScanner } from '../../../../presentation/hooks/use-barcode-scanner';
import { ORDER_STATUS } from '../../../../domain/constants/order-status.constant';

interface ScannedItem {
  trackingCode: string;
  timestamp: string;
  status: 'SUCCESS' | 'ERROR';
  message: string;
}

export default function InboundScanPage() {
  const [scannedList, setScannedList] = useState<ScannedItem[]>([]);
  const [isPending, startTransition] = useTransition();
  const { isAudioEnabled, toggleAudio, playSuccess, playError } = useAudioFeedback(true);

  const processScan = (code: string) => {
    startTransition(async () => {
      try {
        const res = await checkInHubAction({ trackingCode: code, hubId: '' });

        if (isSuccess(res)) {
          playSuccess();
          const newItem: ScannedItem = {
            trackingCode: res.data.trackingCode,
            timestamp: new Date().toLocaleTimeString('vi-VN'),
            status: 'SUCCESS',
            message: `Đã nhập kho ${res.data.hubName} thành công (${res.data.status})`,
          };
          setScannedList((prev) => [newItem, ...prev]);
        } else {
          playError();
          const errorItem: ScannedItem = {
            trackingCode: code,
            timestamp: new Date().toLocaleTimeString('vi-VN'),
            status: 'ERROR',
            message: res.error,
          };
          setScannedList((prev) => [errorItem, ...prev]);
        }
      } catch (err: unknown) {
        playError();
        const errorMsg = err instanceof Error ? err.message : 'Lỗi kết nối máy chủ';
        const errorItem: ScannedItem = {
          trackingCode: code,
          timestamp: new Date().toLocaleTimeString('vi-VN'),
          status: 'ERROR',
          message: errorMsg,
        };
        setScannedList((prev) => [errorItem, ...prev]);
      }
    });
  };

  const { inputRef, focus, handleManualSubmit } = useBarcodeScanner({
    onScan: processScan,
    minLength: 5,
    autoFocus: true,
  });

  const successCount = scannedList.filter((s) => s.status === 'SUCCESS').length;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div className="flex items-center gap-3">
          <Link href="/hub/dashboard">
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <ScanBarcode className="w-6 h-6 text-primary" />
              Quét Inbound Nhập Kho Trạm
            </h1>
            <p className="text-xs text-slate-500">
              Chế độ máy quét mã vạch tốc độ cao tại cửa kho bưu cục, tự động cập nhật trạng thái AT_HUB vào CSDL
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={toggleAudio}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-colors cursor-pointer ${
              isAudioEnabled ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-400 border-slate-200'
            }`}
          >
            {isAudioEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
            {isAudioEnabled ? 'Âm thanh: Bật' : 'Âm thanh: Tắt'}
          </button>

          <div className="px-3 py-1.5 bg-blue-50 border border-blue-200 rounded-lg text-xs font-mono font-bold text-primary">
            Đã nhập: {successCount} kiện
          </div>
        </div>
      </div>

      {/* Main Barcode Scanner Input Box */}
      <Card className="border-primary/30 bg-gradient-to-br from-blue-50/60 via-white to-blue-50/20 shadow-md">
        <CardContent className="p-6">
          <form onSubmit={handleManualSubmit} className="space-y-3">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-primary" />
              Cửa Nhận Tín Hiệu Súng Bắn Mã Vạch (Barcode / QR Scanner)
            </label>

            <div className="relative">
              <ScanBarcode className="w-6 h-6 absolute left-4 top-3.5 text-primary animate-pulse" />
              <input
                ref={inputRef}
                placeholder="Đặt con trỏ tại đây và bóp cò máy quét (hoặc gõ mã và nhấn Enter)..."
                disabled={isPending}
                className="w-full h-14 pl-14 pr-32 text-base font-mono font-bold uppercase text-slate-900 bg-white border-2 border-primary/50 rounded-2xl shadow-inner focus:outline-none focus:ring-4 focus:ring-primary/20 focus:border-primary placeholder:text-slate-400 placeholder:font-normal placeholder:text-xs"
                autoComplete="off"
              />
              <Button
                type="submit"
                variant="primary"
                size="md"
                className="absolute right-2.5 top-2.5 h-9 rounded-xl font-semibold shadow-xs"
                isLoading={isPending}
              >
                Nhập Kho
              </Button>
            </div>
            <p className="text-[11px] text-slate-400 italic">
              Mẹo: Hệ thống tự động nhận dạng chuỗi kết thúc của súng quét (CR/LF Enter) và phát tiếng Beep tức thì.
            </p>
          </form>
        </CardContent>
      </Card>

      {/* Real-time Inbound Scanned Items List */}
      <Card className="border-slate-200">
        <CardHeader className="flex items-center justify-between py-3 px-5 bg-slate-50/50">
          <CardTitle className="text-xs uppercase tracking-wider text-slate-500 flex items-center gap-2">
            <Package className="w-4 h-4 text-primary" />
            Danh Sách Kiện Hàng Vừa Quét Nhập Kho (Phiên Hiện Tại)
          </CardTitle>
          <span className="text-[11px] font-mono text-slate-400">{scannedList.length} lượt thao tác</span>
        </CardHeader>

        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Thời Gian</TableHead>
                <TableHead>Mã Vận Đơn Bưu Phẩm</TableHead>
                <TableHead>Trạng Thái Mới</TableHead>
                <TableHead>Thông Điệp Hệ Thống</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {scannedList.length > 0 ? (
                scannedList.map((item, idx) => (
                  <TableRow key={idx} className={item.status === 'ERROR' ? 'bg-red-50/50' : ''}>
                    <TableCell className="font-mono text-slate-500 text-xs">{item.timestamp}</TableCell>
                    <TableCell className="font-mono font-bold text-primary">{item.trackingCode}</TableCell>
                    <TableCell>
                      {item.status === 'SUCCESS' ? (
                        <OrderStatusBadge status={ORDER_STATUS.AT_HUB} />
                      ) : (
                        <span className="text-xs text-red-600 font-bold">LỖI QUÉT</span>
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-slate-600">
                      <div className="flex items-center gap-1.5">
                        {item.status === 'SUCCESS' ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        ) : (
                          <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                        )}
                        <span>{item.message}</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-12 text-slate-400">
                    Chưa có kiện hàng nào được quét. Hãy bắt đầu quét mã kiện hàng đầu tiên!
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
