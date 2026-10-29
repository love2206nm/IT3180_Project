/**
 * @file storage.service.interface.ts
 * @description Hợp đồng dịch vụ Lưu trữ Tệp / Hình ảnh bằng chứng giao hàng (Storage Service Port).
 * @module domain/interface/services
 */

/**
 * Cổng giao tiếp lưu trữ đối tượng (Object Storage Port - Cloudflare R2 / S3 / Local).
 */
export interface IStorageService {
  /**
   * Tải ảnh bằng chứng giao hàng (POD) lên hệ thống lưu trữ đám mây.
   * @param fileBuffer Dữ liệu nhị phân của tệp ảnh
   * @param fileName Tên tệp mong muốn
   * @param mimeType Định dạng tệp (image/jpeg, image/png, image/webp)
   * @returns URL công khai hoặc URL đã ký để truy cập ảnh
   */
  uploadPODImage(fileBuffer: Uint8Array, fileName: string, mimeType: string): Promise<string>;

  /**
   * Xóa tệp khỏi bộ lưu trữ theo URL.
   * @param fileUrl URL của tệp cần xóa
   * @returns true nếu xóa thành công
   */
  deleteFile(fileUrl: string): Promise<boolean>;
}
