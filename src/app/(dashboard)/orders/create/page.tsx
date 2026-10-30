'use client';

/**
 * @file page.tsx (orders/create)
 * @description Màn hình Tạo Đơn Hàng Tại Quầy theo giao diện KiotViet POS 2 cột.
 * Cột trái nhập thông tin người gửi, người nhận, quy cách kiện hàng;
 * Cột phải là Phiếu bưu gửi tính cước tự động & nút Tạo đơn màu xanh lá to bản.
 * @module app/(dashboard)/orders/create
 */

import React, { useState, useTransition } from 'react';
import Link from 'next/link';
import {
  Package,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Calculator,
  User,
  MapPin,
  Box,
  CreditCard,
  FileText,
  Printer,
  PlusCircle,
  Loader2,
} from 'lucide-react';
import { PAYMENT_BY, type PaymentBy } from '../../../../domain/constants/payment.constant';
import { createOrderAction } from '../../../../presentation/actions/order.actions';
import { isSuccess, isFailure } from '../../../../application/interfaces';
import { KiotNumericInput } from '../../../../presentation/components/ui/kiot-numeric-input';

export default function CreateOrderPOSPage() {
  const [senderName, setSenderName] = useState('Kho Trung Tâm Hà Nội');
  const [senderPhone, setSenderPhone] = useState('0912345678');
  const [senderAddress, setSenderAddress] = useState('123 Xuân Thủy, Cầu Giấy, Hà Nội');

  const [receiverName, setReceiverName] = useState('');
  const [receiverPhone, setReceiverPhone] = useState('');
  const [receiverAddress, setReceiverAddress] = useState('');
  const [receiverProvince, setReceiverProvince] = useState('Hà Nội');
  const [receiverDistrict, setReceiverDistrict] = useState('Cầu Giấy');
  const [receiverWard, setReceiverWard] = useState('Dịch Vọng Hậu');

  const [weightGram, setWeightGram] = useState(500);
  const [lengthCm, setLengthCm] = useState(20);
  const [widthCm, setWidthCm] = useState(15);
  const [heightCm, setHeightCm] = useState(5);
  const [codAmount, setCodAmount] = useState(0);
  const [paymentBy, setPaymentBy] = useState<string>(PAYMENT_BY.RECEIVER);
  const [notes, setNotes] = useState('');

  const [createdOrderCode, setCreatedOrderCode] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Tính cước logistics ước tính Kiot POS
  const volumetricWeight = Math.round((lengthCm * widthCm * heightCm) / 5);
  const billableWeight = Math.max(weightGram, volumetricWeight);
  const estimatedShippingFee =
    billableWeight <= 1000 ? 20000 : 20000 + Math.ceil((billableWeight - 1000) / 500) * 5000;

  const totalPayableByReceiver =
    paymentBy === PAYMENT_BY.RECEIVER ? codAmount + estimatedShippingFee : codAmount;

  const handleResetForm = (): void => {
    setReceiverName('');
    setReceiverPhone('');
    setReceiverAddress('');
    setCodAmount(0);
    setNotes('');
    setCreatedOrderCode(null);
    setErrorMessage(null);
  };

  const handleSubmit = (e: React.FormEvent): void => {
    e.preventDefault();
    setErrorMessage(null);

    startTransition(async () => {
      try {
        const res = await createOrderAction({
          senderName,
          senderPhone,
          senderAddress,
          receiverName,
          receiverPhone,
          receiverAddress,
          receiverProvince,
          receiverDistrict,
          receiverWard,
          weightGram: Number(weightGram),
          lengthCm: Number(lengthCm),
          widthCm: Number(widthCm),
          heightCm: Number(heightCm),
          codAmount: Number(codAmount),
          paymentBy: paymentBy as PaymentBy,
          notes: notes || undefined,
        });

        if (isSuccess(res)) {
          setCreatedOrderCode(res.data.trackingCode);
        } else if (isFailure(res)) {
          setErrorMessage(res.error || 'Tạo đơn hàng thất bại');
        }
      } catch (err) {
        setErrorMessage(err instanceof Error ? err.message : 'Lỗi hệ thống khi tạo đơn');
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
              <Package className="w-4 h-4 text-[#0066CC]" />
              Tạo Đơn Hàng Tại Quầy (Kiot POS)
            </h1>
            <p className="text-[11px] text-slate-500">
              Nhập bưu gửi, tính cước tự động và sinh mã vận đơn trực tiếp tại bưu cục
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleResetForm}
            className="rounded border border-slate-300 bg-white hover:bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-700 transition-colors shadow-2xs"
          >
            Làm mới form
          </button>
        </div>
      </div>

      {/* Thông báo tạo đơn thành công */}
      {createdOrderCode && (
        <div className="rounded border border-emerald-300 bg-emerald-50 p-4 shadow-xs animate-in fade-in">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="text-sm font-bold text-emerald-900">
                Tạo Đơn Hàng Thành Công!
              </h3>
              <p className="text-xs text-emerald-800 mt-1">
                Mã vận đơn bưu cục:{' '}
                <span className="font-mono font-bold text-base text-emerald-950 underline ml-1">
                  {createdOrderCode}
                </span>
              </p>
              <div className="flex items-center gap-2 mt-3">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="flex items-center gap-1 rounded bg-emerald-700 hover:bg-emerald-800 text-white px-3 py-1.5 text-xs font-semibold shadow-xs"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>In phiếu gửi (F9)</span>
                </button>
                <button
                  type="button"
                  onClick={handleResetForm}
                  className="flex items-center gap-1 rounded border border-emerald-600 bg-white hover:bg-emerald-50 text-emerald-800 px-3 py-1.5 text-xs font-medium"
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  <span>Tiếp tục tạo đơn khác</span>
                </button>
                <Link
                  href="/orders"
                  className="rounded border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 px-3 py-1.5 text-xs font-medium"
                >
                  Về danh sách đơn
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Thông báo lỗi nếu có */}
      {errorMessage && (
        <div className="rounded border border-rose-300 bg-rose-50 p-3 shadow-xs flex items-center gap-2 text-rose-800 text-xs">
          <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Bố Cục 2 Cột Chuẩn KiotViet POS */}
      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-3 items-start">
        {/* Cột Trái (Chiếm 2/3 không gian): Thông tin Người gửi, Người nhận, Bưu phẩm */}
        <div className="lg:col-span-2 space-y-3">
          {/* Khối 1: Thông tin người gửi */}
          <div className="bg-white p-3.5 rounded border border-slate-200 shadow-xs space-y-2.5">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 uppercase tracking-wide border-b border-slate-100 pb-2">
              <User className="w-3.5 h-3.5 text-[#0066CC]" />
              <span>1. Thông Tin Người Gửi (Bưu Cục Gửi)</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Họ tên / Đơn vị gửi <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={senderName}
                  onChange={(e) => setSenderName(e.target.value)}
                  className="w-full h-8 px-2.5 bg-slate-50 border border-slate-300 rounded text-slate-900 focus:bg-white focus:ring-1 focus:ring-[#0066CC]"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Số điện thoại <span className="text-rose-500">*</span>
                </label>
                <input
                  type="tel"
                  required
                  value={senderPhone}
                  onChange={(e) => setSenderPhone(e.target.value)}
                  className="w-full h-8 px-2.5 bg-slate-50 border border-slate-300 rounded text-slate-900 font-mono focus:bg-white focus:ring-1 focus:ring-[#0066CC]"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-slate-700 font-semibold mb-1">
                  Địa chỉ bưu cục gửi <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={senderAddress}
                  onChange={(e) => setSenderAddress(e.target.value)}
                  className="w-full h-8 px-2.5 bg-slate-50 border border-slate-300 rounded text-slate-900 focus:bg-white focus:ring-1 focus:ring-[#0066CC]"
                />
              </div>
            </div>
          </div>

          {/* Khối 2: Thông tin người nhận */}
          <div className="bg-white p-3.5 rounded border border-slate-200 shadow-xs space-y-2.5">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 uppercase tracking-wide border-b border-slate-100 pb-2">
              <MapPin className="w-3.5 h-3.5 text-emerald-600" />
              <span>2. Thông Tin Người Nhận (Khách Hàng)</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Họ tên người nhận <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: Hoàng Mai Linh"
                  value={receiverName}
                  onChange={(e) => setReceiverName(e.target.value)}
                  className="w-full h-8 px-2.5 bg-slate-50 border border-slate-300 rounded text-slate-900 focus:bg-white focus:ring-1 focus:ring-[#0066CC]"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Số điện thoại người nhận <span className="text-rose-500">*</span>
                </label>
                <input
                  type="tel"
                  required
                  placeholder="Ví dụ: 0987654321"
                  value={receiverPhone}
                  onChange={(e) => setReceiverPhone(e.target.value)}
                  className="w-full h-8 px-2.5 bg-slate-50 border border-slate-300 rounded text-slate-900 font-mono focus:bg-white focus:ring-1 focus:ring-[#0066CC]"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Tỉnh / Thành phố</label>
                <input
                  type="text"
                  value={receiverProvince}
                  onChange={(e) => setReceiverProvince(e.target.value)}
                  className="w-full h-8 px-2.5 bg-slate-50 border border-slate-300 rounded text-slate-900 focus:bg-white focus:ring-1 focus:ring-[#0066CC]"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Quận / Huyện</label>
                <input
                  type="text"
                  value={receiverDistrict}
                  onChange={(e) => setReceiverDistrict(e.target.value)}
                  className="w-full h-8 px-2.5 bg-slate-50 border border-slate-300 rounded text-slate-900 focus:bg-white focus:ring-1 focus:ring-[#0066CC]"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Phường / Xã</label>
                <input
                  type="text"
                  value={receiverWard}
                  onChange={(e) => setReceiverWard(e.target.value)}
                  className="w-full h-8 px-2.5 bg-slate-50 border border-slate-300 rounded text-slate-900 focus:bg-white focus:ring-1 focus:ring-[#0066CC]"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Địa chỉ số nhà, tên đường <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Số nhà 45 ngõ 12..."
                  value={receiverAddress}
                  onChange={(e) => setReceiverAddress(e.target.value)}
                  className="w-full h-8 px-2.5 bg-slate-50 border border-slate-300 rounded text-slate-900 focus:bg-white focus:ring-1 focus:ring-[#0066CC]"
                />
              </div>
            </div>
          </div>

          {/* Khối 3: Kích thước & Trọng lượng bưu kiện */}
          <div className="bg-white p-3.5 rounded border border-slate-200 shadow-xs space-y-2.5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <span className="flex items-center gap-1.5 text-xs font-bold text-slate-800 uppercase tracking-wide">
                <Box className="w-3.5 h-3.5 text-amber-600" />
                <span>3. Trọng Lượng & Kích Thước Kiện Hàng</span>
              </span>
              <span className="text-[11px] text-blue-700 bg-blue-50 px-2 py-0.5 rounded font-mono font-semibold">
                Khối lượng tính cước: {billableWeight} g
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <KiotNumericInput
                label="Trọng lượng (gram)"
                value={weightGram}
                onChange={setWeightGram}
                min={50}
                max={50000}
                suffix="g"
                defaultFallback={500}
              />

              <KiotNumericInput
                label="Dài (cm)"
                value={lengthCm}
                onChange={setLengthCm}
                min={1}
                max={200}
                suffix="cm"
                defaultFallback={20}
              />

              <KiotNumericInput
                label="Rộng (cm)"
                value={widthCm}
                onChange={setWidthCm}
                min={1}
                max={200}
                suffix="cm"
                defaultFallback={15}
              />

              <KiotNumericInput
                label="Cao (cm)"
                value={heightCm}
                onChange={setHeightCm}
                min={1}
                max={200}
                suffix="cm"
                defaultFallback={5}
              />
            </div>
          </div>
        </div>

        {/* Cột Phải (Chiếm 1/3 không gian): Phiếu bưu gửi POS & Nút Tạo Đơn Xanh Lá */}
        <div className="bg-white p-4 rounded border border-slate-200 shadow-sm space-y-3.5 sticky top-16">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900 uppercase tracking-wide border-b border-slate-200 pb-2.5">
            <CreditCard className="w-4 h-4 text-[#0066CC]" />
            <span>Phiếu Bưu Gửi & Tính Cước (POS)</span>
          </div>

          {/* Ô nhập tiền thu hộ COD */}
          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1">
              Tiền Thu Hộ COD (VNĐ):
            </label>
            <KiotNumericInput
              value={codAmount}
              onChange={setCodAmount}
              min={0}
              max={100000000}
              suffix="VNĐ"
              isCurrency={true}
              defaultFallback={0}
              className="h-10 text-base font-bold bg-amber-50/60 border-2 border-amber-300 focus:ring-2 focus:ring-amber-500"
            />
          </div>

          {/* Người trả cước */}
          <div>
            <label className="block text-xs font-semibold text-slate-800 mb-1.5">
              Bên thanh toán cước:
            </label>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <label className="flex items-center gap-1.5 p-2 rounded border border-slate-200 cursor-pointer hover:bg-slate-50">
                <input
                  type="radio"
                  name="payment_by"
                  value={PAYMENT_BY.RECEIVER}
                  checked={paymentBy === PAYMENT_BY.RECEIVER}
                  onChange={() => setPaymentBy(PAYMENT_BY.RECEIVER)}
                  className="w-3.5 h-3.5 text-[#0066CC]"
                />
                <span className="font-medium text-slate-800">Người nhận trả</span>
              </label>

              <label className="flex items-center gap-1.5 p-2 rounded border border-slate-200 cursor-pointer hover:bg-slate-50">
                <input
                  type="radio"
                  name="payment_by"
                  value={PAYMENT_BY.SENDER}
                  checked={paymentBy === PAYMENT_BY.SENDER}
                  onChange={() => setPaymentBy(PAYMENT_BY.SENDER)}
                  className="w-3.5 h-3.5 text-[#0066CC]"
                />
                <span className="font-medium text-slate-800">Người gửi trả</span>
              </label>
            </div>
          </div>

          {/* Ghi chú bưu gửi */}
          <div>
            <label className="block text-xs font-semibold text-slate-800 mb-1">
              Ghi chú phát hàng:
            </label>
            <textarea
              rows={2}
              placeholder="Ví dụ: Cho xem hàng, gọi trước khi phát..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full p-2 bg-slate-50 border border-slate-300 rounded text-xs text-slate-900 focus:bg-white focus:ring-1 focus:ring-[#0066CC]"
            />
          </div>

          {/* Chi tiết hóa đơn Kiot POS */}
          <div className="bg-slate-50 p-3 rounded border border-slate-200 space-y-2 text-xs">
            <div className="flex justify-between text-slate-600">
              <span>Cước vận chuyển:</span>
              <span className="font-mono font-semibold text-slate-900">
                {estimatedShippingFee.toLocaleString('vi-VN')} đ
              </span>
            </div>

            <div className="flex justify-between text-slate-600">
              <span>Tiền thu hộ COD:</span>
              <span className="font-mono font-semibold text-[#EA580C]">
                {codAmount.toLocaleString('vi-VN')} đ
              </span>
            </div>

            <div className="border-t border-slate-200 pt-2 flex justify-between items-center">
              <span className="font-bold text-slate-900">Tổng khách phải trả:</span>
              <span className="font-mono font-bold text-base text-[#16A34A]">
                {totalPayableByReceiver.toLocaleString('vi-VN')} đ
              </span>
            </div>
          </div>

          {/* NÚT TẠO ĐƠN TO BẢN MÀU XANH LÁ KIOTVIET */}
          <button
            type="submit"
            disabled={isPending}
            className="w-full flex items-center justify-center gap-2 rounded bg-[#16A34A] hover:bg-[#15803D] text-white py-3 px-4 font-bold text-sm shadow-md transition-all active:scale-98 cursor-pointer disabled:opacity-50"
          >
            {isPending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Đang xử lý bưu phẩm...</span>
              </>
            ) : (
              <>
                <Package className="w-4 h-4" />
                <span>TẠO ĐƠN & PHÁT HÀNH (F9)</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
