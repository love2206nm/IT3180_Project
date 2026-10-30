'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { BadgeDollarSign, ArrowLeft, CheckCircle2, XCircle, Wallet, User, Clock, AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '../../../../presentation/components/ui/button';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../../../presentation/components/ui/table';
import { CODSettlementBadge } from '../../../../presentation/components/ui/badge';
import { CODSettlementReviewDialog } from '../../../../presentation/components/cod/cod-settlement-review-dialog';
import { COD_SETTLEMENT_STATUS, type CODSettlementStatus } from '../../../../domain/constants/cod-status.constant';
import { useServerAction } from '../../../../presentation/hooks/use-server-action';
import { useAudioFeedback } from '../../../../presentation/hooks/use-audio-feedback';
import { reviewCODSettlementAction, getCODSettlementsListAction } from '../../../../presentation/actions/cod.actions';
import type { ReviewCODSettlementInputDTO } from '../../../../application/dtos/cod.dto';

interface SettlementItem {
  id: string;
  settlementCode: string;
  shipperName: string;
  totalOrdersCount: number;
  totalCodAmount: number;
  status: CODSettlementStatus;
  createdAt: string;
  notes?: string;
}

export default function HubCODSettlementsPage() {
  const [settlements, setSettlements] = useState<SettlementItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedSettlement, setSelectedSettlement] = useState<SettlementItem | null>(null);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const { playSuccess, playError } = useAudioFeedback();

  const loadSettlements = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await getCODSettlementsListAction();
      if (res.success) {
        setSettlements(
          res.data.map((item) => ({
            id: item.id,
            settlementCode: item.settlementCode,
            shipperName: item.shipperName || `Shipper #${item.shipperId}`,
            totalOrdersCount: item.totalOrdersCount,
            totalCodAmount: item.totalCodAmount,
            status: item.status,
            createdAt: new Date(item.createdAt).toLocaleString('vi-VN'),
            notes: item.notes || undefined,
          }))
        );
      }
    } catch {
      // Ignore
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSettlements();
  }, [loadSettlements]);

  const { execute: executeReview, isPending } = useServerAction(reviewCODSettlementAction, {
    onSuccess: (data) => {
      playSuccess();
      const updatedStatus = data.status as CODSettlementStatus;
      setSettlements((prev) =>
        prev.map((s) => (s.id === data.id ? { ...s, status: updatedStatus } : s))
      );
      setIsReviewModalOpen(false);
      setSelectedSettlement(null);
      setNotification({
        type: 'success',
        message:
          updatedStatus === COD_SETTLEMENT_STATUS.CONFIRMED
            ? `Đã xác nhận thu đủ ${data.totalCodAmount.toLocaleString('vi-VN')} ₫ cho phiên ${data.settlementCode}!`
            : `Đã từ chối phiên nộp tiền ${data.settlementCode}. Đơn hàng đã được mở khóa để Shipper nộp lại.`,
      });
      loadSettlements();
    },
    onError: (err) => {
      playError();
      setNotification({
        type: 'error',
        message: `Xử lý đối soát thất bại: ${err}`,
      });
    },
  });

  const handleOpenReview = (item: SettlementItem) => {
    setSelectedSettlement(item);
    setIsReviewModalOpen(true);
  };

  const handleReviewSubmit = async (payload: ReviewCODSettlementInputDTO) => {
    await executeReview(payload);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
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
              <BadgeDollarSign className="w-6 h-6 text-emerald-600" />
              Quản Lý Đối Soát Tiền Thu Hộ COD
            </h1>
            <p className="text-xs text-slate-500">
              Kiểm đếm tiền mặt, duyệt hoặc từ chối các phiên bàn giao tiền COD cuối ca của Shipper
            </p>
          </div>
        </div>
      </div>

      {/* Thông báo kết quả */}
      {notification && (
        <div
          className={`p-4 rounded-xl border text-xs flex items-center justify-between animate-fade-in ${
            notification.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          <div className="flex items-center gap-2.5">
            {notification.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
            )}
            <span className="font-semibold">{notification.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setNotification(null)}
            className="text-slate-400 hover:text-slate-600"
          >
            &times;
          </button>
        </div>
      )}

      {/* Settlements Table */}
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Mã Phiên Nộp</TableHead>
            <TableHead>Tài Xế Giao Hàng</TableHead>
            <TableHead>Số Lượng Đơn</TableHead>
            <TableHead>Tổng Tiền COD Cần Nộp</TableHead>
            <TableHead>Thời Gian Tạo</TableHead>
            <TableHead>Trạng Thái</TableHead>
            <TableHead className="text-right">Duyệt Thu Tiền</TableHead>
          </TableRow>
        </TableHeader>

        <TableBody>
          {isLoading ? (
            <TableRow>
              <TableCell colSpan={7} className="text-center py-8 text-xs text-slate-400">
                <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-primary" />
                Đang tải danh sách phiên đối soát COD...
              </TableCell>
            </TableRow>
          ) : settlements.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} className="text-center py-8 text-xs text-slate-400">
                Chưa có phiên nộp tiền COD nào tại trạm
              </TableCell>
            </TableRow>
          ) : (
            settlements.map((item) => (
              <TableRow key={item.id}>
                <TableCell className="font-mono font-bold text-primary">{item.settlementCode}</TableCell>
                <TableCell>
                  <p className="font-semibold text-slate-900 text-xs">{item.shipperName}</p>
                  {item.notes && <p className="text-[11px] text-slate-400 italic">{item.notes}</p>}
                </TableCell>
                <TableCell className="font-mono text-xs">{item.totalOrdersCount} đơn</TableCell>
                <TableCell className="font-mono font-bold text-emerald-600 text-sm">
                  {item.totalCodAmount.toLocaleString('vi-VN')} ₫
                </TableCell>
                <TableCell className="font-mono text-slate-500 text-xs">{item.createdAt}</TableCell>
                <TableCell>
                  <CODSettlementBadge status={item.status} />
                </TableCell>
                <TableCell className="text-right">
                  {item.status === COD_SETTLEMENT_STATUS.PENDING ? (
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => handleOpenReview(item)}
                      className="text-xs h-8"
                    >
                      <BadgeDollarSign className="w-3.5 h-3.5 mr-1" />
                      Đối Soát & Phê Duyệt
                    </Button>
                  ) : (
                    <span className="text-xs text-slate-400 italic">
                      {item.status === COD_SETTLEMENT_STATUS.CONFIRMED ? 'Đã thu tiền' : 'Đã từ chối'}
                    </span>
                  )}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      {/* Modal Đối soát và Duyệt nộp tiền COD */}
      <CODSettlementReviewDialog
        isOpen={isReviewModalOpen}
        onClose={() => {
          setIsReviewModalOpen(false);
          setSelectedSettlement(null);
        }}
        settlement={selectedSettlement}
        onReview={handleReviewSubmit}
        isPending={isPending}
      />
    </div>
  );
}
