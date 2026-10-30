'use client';

/**
 * @file use-geolocation.ts
 * @description Custom React Hook hỗ trợ Shipper trích xuất tọa độ GPS thực tế từ thiết bị di động/trình duyệt.
 * Phục vụ nghiệp vụ Xác nhận Giao hàng thành công kèm bằng chứng tọa độ POD (UC18).
 * @module presentation/hooks
 */

import { useState, useCallback } from 'react';

export interface CoordinatesState {
  lat: number | null;
  lng: number | null;
}

export interface UseGeolocationReturn {
  /** Tọa độ vĩ độ và kinh độ hiện tại */
  coordinates: CoordinatesState;
  /** Trạng thái đang lấy định vị GPS */
  isLocating: boolean;
  /** Thông điệp lỗi nếu không lấy được định vị */
  error: string | null;
  /** Hàm kích hoạt lấy tọa độ GPS từ trình duyệt */
  getLocation: () => Promise<CoordinatesState | null>;
  /** Đặt lại trạng thái tọa độ */
  resetLocation: () => void;
}

/**
 * Hook quản lý định vị địa lý GPS cho Shipper.
 */
export function useGeolocation(): UseGeolocationReturn {
  const [coordinates, setCoordinates] = useState<CoordinatesState>({ lat: null, lng: null });
  const [isLocating, setIsLocating] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const getLocation = useCallback((): Promise<CoordinatesState | null> => {
    setIsLocating(true);
    setError(null);

    return new Promise((resolve) => {
      if (typeof window === 'undefined' || !navigator.geolocation) {
        const errorMsg = 'Thiết bị hoặc trình duyệt không hỗ trợ định vị GPS';
        setError(errorMsg);
        setIsLocating(false);
        resolve(null);
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const newCoords: CoordinatesState = {
            lat: Number(position.coords.latitude.toFixed(6)),
            lng: Number(position.coords.longitude.toFixed(6)),
          };
          setCoordinates(newCoords);
          setIsLocating(false);
          resolve(newCoords);
        },
        (err) => {
          let errorMsg = 'Không thể lấy được vị trí GPS hiện tại';
          if (err.code === err.PERMISSION_DENIED) {
            errorMsg = 'Ứng dụng chưa được cấp quyền truy cập định vị GPS';
          } else if (err.code === err.TIMEOUT) {
            errorMsg = 'Quá thời gian lấy tín hiệu GPS từ vệ tinh';
          }
          setError(errorMsg);
          setIsLocating(false);
          resolve(null);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 30000,
        }
      );
    });
  }, []);

  const resetLocation = useCallback(() => {
    setCoordinates({ lat: null, lng: null });
    setError(null);
    setIsLocating(false);
  }, []);

  return {
    coordinates,
    isLocating,
    error,
    getLocation,
    resetLocation,
  };
}
