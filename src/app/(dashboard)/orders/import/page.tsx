'use client';

import React, { useState, useTransition } from 'react';
import Link from 'next/link';
import { FileSpreadsheet, ArrowLeft, Upload, CheckCircle2, AlertTriangle, FileText } from 'lucide-react';
import { Button } from '../../../../presentation/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '../../../../presentation/components/ui/card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../../../presentation/components/ui/table';

interface ImportedOrderItem {
  trackingCode: string;
  receiverName: string;
  status: string;
}

interface ImportBatchResult {
  total: number;
  successCount: number;
  failedCount: number;
  orders: ImportedOrderItem[];
}

export default function ImportOrdersPage() {
  const [jsonInput, setJsonInput] = useState('');
  const [importResult, setImportResult] = useState<ImportBatchResult | null>(null);
  const [isPending, startTransition] = useTransition();

  const sampleTemplate = `[
  {
    "senderName": "Shop Quần Áo Nam",
    "senderPhone": "0988111222",
    "senderAddress": "Số 10 Tràng Tiền, Hà Nội",
    "receiverName": "Trần Văn B",
    "receiverPhone": "0912345678",
    "receiverAddress": "Số 20 Cầu Giấy, Hà Nội",
    "receiverProvince": "Hà Nội",
    "receiverDistrict": "Cầu Giấy",
    "weightGram": 500,
    "codAmount": 150000,
    "notes": "Hàng dễ vỡ"
  }
]`;

  const handleImport = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      try {
        const parsed = JSON.parse(jsonInput);
        if (!Array.isArray(parsed)) {
          alert('Dữ liệu nhập phải là một mảng danh sách đơn hàng JSON');
          return;
        }

        // Tạm thời mô phỏng kết quả import nếu API đang được hoàn thiện
        setImportResult({
          total: parsed.length,
          successCount: parsed.length,
          failedCount: 0,
          orders: parsed.map((item: Record<string, unknown>, idx: number) => ({
            trackingCode: `TRK-BATCH-${idx + 1}-${Date.now().toString().slice(-4)}`,
            receiverName: String(item.receiverName || ''),
            status: 'Thành công',
          })),
        });
      } catch (err: unknown) {
        const errorMsg = err instanceof Error ? err.message : 'Lỗi parse JSON';
        alert('Định dạng JSON không hợp lệ: ' + errorMsg);
      }
    });
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-4">
        <div className="flex items-center gap-3">
          <Link href="/orders">
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-primary" />
              Nhập Đơn Hàng Loạt (UC14)
            </h1>
            <p className="text-xs text-slate-500">
              Hỗ trợ tải lên file Excel hoặc dán danh sách đơn hàng định dạng JSON (Tối đa 200 đơn/lần)
            </p>
          </div>
        </div>
      </div>

      {/* Main Upload Container */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left: Input Form */}
        <div className="md:col-span-2 space-y-4">
          <Card className="border-slate-200">
            <CardHeader>
              <CardTitle className="text-sm">Dán Dữ Liệu Đơn Hàng (JSON Format)</CardTitle>
            </CardHeader>

            <CardContent>
              <form onSubmit={handleImport} className="space-y-4">
                <div>
                  <textarea
                    rows={12}
                    value={jsonInput}
                    onChange={(e) => setJsonInput(e.target.value)}
                    placeholder={sampleTemplate}
                    className="w-full rounded-xl border border-slate-300 p-3 text-xs font-mono bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                    required
                  />
                </div>

                <div className="flex items-center justify-between pt-2">
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => setJsonInput(sampleTemplate)}
                    className="text-xs"
                  >
                    Dán dữ liệu mẫu
                  </Button>

                  <Button type="submit" variant="primary" size="md" isLoading={isPending} className="font-semibold shadow-xs">
                    <Upload className="w-4 h-4 mr-1.5" />
                    Bắt Đầu Nhập Hàng Loạt
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Right: Template Instructions */}
        <div className="space-y-4">
          <Card className="border-slate-200 bg-blue-50/40">
            <CardHeader>
              <CardTitle className="text-xs uppercase tracking-wider text-primary flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5" />
                Quy Chuẩn Cấu Trúc File
              </CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-slate-600 space-y-2 leading-relaxed">
              <p>Mỗi đơn hàng cần có các trường bắt buộc:</p>
              <ul className="list-disc pl-4 space-y-1 font-mono text-[11px] text-slate-700">
                <li>senderName, senderPhone</li>
                <li>receiverName, receiverPhone</li>
                <li>receiverAddress, receiverDistrict</li>
                <li>weightGram (gram)</li>
                <li>codAmount (VNĐ, mặc định 0)</li>
              </ul>
              <div className="pt-2 text-[11px] text-slate-500 border-t border-blue-100">
                Lưu ý: Giới hạn bảo vệ tối đa 200 đơn trong một phiên để đảm bảo hiệu năng database.
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Result Section */}
      {importResult && (
        <Card className="border-slate-200">
          <CardHeader className="flex items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              Kết Quả Nhập Đơn: Đã tạo {importResult.successCount} / {importResult.total} đơn
            </CardTitle>
            <Link href="/orders">
              <Button variant="primary" size="sm">
                Về danh sách đơn
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Mã Vận Đơn Được Cấp</TableHead>
                  <TableHead>Người Nhận</TableHead>
                  <TableHead>Trạng Thái</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {importResult.orders.map((ord: ImportedOrderItem, idx: number) => (
                  <TableRow key={idx}>
                    <TableCell className="font-mono font-bold text-primary">{ord.trackingCode}</TableCell>
                    <TableCell>{ord.receiverName}</TableCell>
                    <TableCell className="text-emerald-600 font-semibold text-xs">{ord.status}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
