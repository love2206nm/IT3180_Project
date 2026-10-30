'use client';

/**
 * @file page.tsx (orders/import)
 * @description Màn hình Nhập Đơn Hàng Hàng Loạt chuẩn KiotViet.
 * Hỗ trợ nhập danh sách bưu gửi theo lô, tải mẫu dữ liệu và hiển thị bảng kết quả nén cao.
 * @module app/(dashboard)/orders/import
 */

import React, { useState, useTransition } from 'react';
import Link from 'next/link';
import {
  FileSpreadsheet,
  ArrowLeft,
  Upload,
  CheckCircle2,
  AlertCircle,
  FileText,
  Loader2,
  Package,
} from 'lucide-react';
import { importOrdersAction } from '../../../../presentation/actions/order.actions';
import { isSuccess, isFailure } from '../../../../application/interfaces';
import type { ImportOrdersResultDTO } from '../../../../application/use-cases/orders/import-orders.use-case';

export default function ImportOrdersKiotPage() {
  const [jsonInput, setJsonInput] = useState<string>('');
  const [importResult, setImportResult] = useState<ImportOrdersResultDTO | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const sampleTemplate = `[
  {
    "senderName": "Kho Trung Tâm",
    "senderPhone": "0988111222",
    "senderAddress": "Số 10 Tràng Tiền, Hoàn Kiếm, Hà Nội",
    "receiverName": "Nguyễn Văn An",
    "receiverPhone": "0912345678",
    "receiverAddress": "Số 20 Cầu Giấy, Cầu Giấy, Hà Nội",
    "receiverProvince": "Hà Nội",
    "receiverDistrict": "Cầu Giấy",
    "weightGram": 500,
    "lengthCm": 20,
    "widthCm": 15,
    "heightCm": 5,
    "codAmount": 150000,
    "notes": "Hàng điện tử dễ vỡ"
  }
]`;

  const handleImport = (e: React.FormEvent): void => {
    e.preventDefault();
    setErrorMessage(null);

    startTransition(async () => {
      try {
        const parsed = JSON.parse(jsonInput);
        if (!Array.isArray(parsed)) {
          setErrorMessage('Dữ liệu nhập phải là một mảng danh sách đơn hàng JSON');
          return;
        }

        const res = await importOrdersAction({ orders: parsed });
        if (isSuccess(res)) {
          setImportResult(res.data);
        } else if (isFailure(res)) {
          setErrorMessage(res.error || 'Nhập đơn hàng loạt thất bại');
        }
      } catch (err) {
        setErrorMessage(
          err instanceof Error
            ? `Lỗi định dạng: ${err.message}`
            : 'Dữ liệu nhập không hợp lệ. Vui lòng kiểm tra lại định dạng JSON.'
        );
      }
    });
  };

  return (
    <div className="space-y-3">
      {/* Top Header Kiot Style */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white px-4 py-2.5 rounded border border-slate-200 shadow-xs">
        <div className="flex items-center gap-2">
          <Link
            href="/orders"
            className="flex h-7 w-7 items-center justify-center rounded border border-slate-200 hover:bg-slate-100 text-slate-600 transition-colors"
            title="Quay lại danh sách"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-sm font-bold text-slate-900 uppercase tracking-wide flex items-center gap-1.5">
              <FileSpreadsheet className="w-4 h-4 text-[#0066CC]" />
              Nhập Đơn Hàng Hàng Loạt (Batch Import)
            </h1>
            <p className="text-[11px] text-slate-500">
              Nhập dữ liệu nhiều bưu gửi cùng lúc từ file hoặc dữ liệu JSON có sẵn
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setJsonInput(sampleTemplate)}
            className="rounded border border-slate-300 bg-white hover:bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-700 transition-colors shadow-2xs"
          >
            Tải mẫu dữ liệu mẫu
          </button>
        </div>
      </div>

      {/* Thông báo lỗi nếu có */}
      {errorMessage && (
        <div className="rounded border border-rose-300 bg-rose-50 p-3 shadow-xs flex items-center gap-2 text-rose-800 text-xs">
          <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Kết quả nhập thành công */}
      {importResult && (
        <div className="rounded border border-emerald-300 bg-emerald-50 p-4 shadow-xs space-y-3 animate-in fade-in">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              <div>
                <h3 className="text-xs font-bold text-emerald-900">
                  Nhập Dữ Liệu Hoàn Tất: {importResult.successCount} / {importResult.totalRequested} đơn thành công
                </h3>
                <p className="text-[11px] text-emerald-700">Các mã vận đơn đã được sinh tự động vào kho</p>
              </div>
            </div>

            <Link
              href="/orders"
              className="rounded bg-emerald-700 hover:bg-emerald-800 text-white px-3 py-1 text-xs font-semibold shadow-xs"
            >
              Xem danh sách đơn hàng
            </Link>
          </div>

          {importResult.trackingCodes.length > 0 && (
            <div className="overflow-x-auto bg-white rounded border border-emerald-200">
              <table className="w-full text-xs text-left">
                <thead className="bg-emerald-100/60 text-emerald-900 font-semibold border-b border-emerald-200">
                  <tr>
                    <th className="py-2 px-3 w-12 text-center">#</th>
                    <th className="py-2 px-3">Mã Vận Đơn Khởi Tạo</th>
                    <th className="py-2 px-3 text-center">Trạng Thái Khởi Tạo</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-emerald-100">
                  {importResult.trackingCodes.map((code, idx) => (
                    <tr key={code} className="hover:bg-emerald-50/40">
                      <td className="py-1.5 px-3 text-center text-slate-400 font-mono text-[11px]">{idx + 1}</td>
                      <td className="py-1.5 px-3 font-mono font-bold text-[#0066CC]">{code}</td>
                      <td className="py-1.5 px-3 text-center">
                        <span className="inline-block px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 text-emerald-800">
                          CREATED
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Khung Nhập Dữ Liệu Kiot Style */}
      <form onSubmit={handleImport} className="bg-white p-4 rounded border border-slate-200 shadow-xs space-y-3">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
          <label className="text-xs font-bold text-slate-800 uppercase tracking-wide flex items-center gap-1.5">
            <FileText className="w-3.5 h-3.5 text-[#0066CC]" />
            <span>Nội Dung Danh Sách Bưu Gửi (Định Dạng JSON)</span>
          </label>
          <span className="text-[11px] text-slate-400">Có thể dán trực tiếp từ file xuất của đối tác</span>
        </div>

        <textarea
          rows={12}
          required
          value={jsonInput}
          onChange={(e) => setJsonInput(e.target.value)}
          placeholder={sampleTemplate}
          className="w-full p-3 font-mono text-xs bg-slate-50 border border-slate-300 rounded text-slate-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#0066CC]"
        />

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
          <Link
            href="/orders"
            className="rounded border border-slate-300 bg-white hover:bg-slate-50 px-4 py-2 text-xs font-medium text-slate-700 transition-colors"
          >
            Hủy bỏ
          </Link>

          <button
            type="submit"
            disabled={isPending}
            className="flex items-center gap-1.5 rounded bg-[#16A34A] hover:bg-[#15803D] text-white px-5 py-2 text-xs font-bold shadow-xs transition-colors cursor-pointer disabled:opacity-50"
          >
            {isPending ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Đang xử lý lô hàng...</span>
              </>
            ) : (
              <>
                <Upload className="w-3.5 h-3.5" />
                <span>Tiến Hành Nhập Đơn Hàng Loạt</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
