/**
 * @file user.entity.ts
 * @description Thực thể Nhân sự & Tài khoản Người dùng trong hệ thống Delivery Hub.
 * @module domain/entities
 */

import { USER_ROLE, type UserRole } from '../constants/roles.constant';
import { USER_STATUS, type UserStatus } from '../constants/user-status.constant';
import { PhoneNumber } from '../value-objects/phone-number.vo';

export interface UserProps {
  id?: string | number | null;
  hubId?: string | number | null;
  username: string;
  passwordHash: string;
  fullName: string;
  email: string;
  phone: PhoneNumber;
  role: UserRole;
  status?: UserStatus;
  lastLoginAt?: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * Thực thể quản lý tài khoản và quyền hạn nhân sự (Quản lý, Nhân viên kho, Shipper, Admin).
 */
export class User {
  private readonly id: string | number | null;
  private hubId: string | number | null;
  private username: string;
  private passwordHash: string;
  private fullName: string;
  private email: string;
  private phone: PhoneNumber;
  private role: UserRole;
  private status: UserStatus;
  private lastLoginAt: Date | null;
  private readonly createdAt: Date;
  private updatedAt: Date;

  constructor(props: UserProps) {
    this.id = props.id ?? null;
    this.hubId = props.hubId ?? null;
    this.username = props.username.trim().toLowerCase();
    this.passwordHash = props.passwordHash;
    this.fullName = props.fullName.trim();
    this.email = props.email.trim().toLowerCase();
    this.phone = props.phone;
    this.role = props.role;
    this.status = props.status ?? USER_STATUS.ACTIVE;
    this.lastLoginAt = props.lastLoginAt ?? null;
    this.createdAt = props.createdAt ?? new Date();
    this.updatedAt = props.updatedAt ?? new Date();
  }

  // --- Getters ---
  public getId(): string | number | null { return this.id; }
  public getHubId(): string | number | null { return this.hubId; }
  public getUsername(): string { return this.username; }
  public getPasswordHash(): string { return this.passwordHash; }
  public getFullName(): string { return this.fullName; }
  public getEmail(): string { return this.email; }
  public getPhone(): PhoneNumber { return this.phone; }
  public getRole(): UserRole { return this.role; }
  public getStatus(): UserStatus { return this.status; }
  public getLastLoginAt(): Date | null { return this.lastLoginAt; }
  public getCreatedAt(): Date { return this.createdAt; }
  public getUpdatedAt(): Date { return this.updatedAt; }

  // --- Domain Logic Methods ---

  public isActive(): boolean {
    return this.status === USER_STATUS.ACTIVE;
  }

  public isShipper(): boolean {
    return this.role === USER_ROLE.SHIPPER;
  }

  public isHubManager(): boolean {
    return this.role === USER_ROLE.HUB_MANAGER;
  }

  public isAdmin(): boolean {
    return this.role === USER_ROLE.ADMIN;
  }

  /**
   * Khóa / Vô hiệu hóa tài khoản nhân viên (Soft Delete - UC08).
   */
  public deactivate(): void {
    this.status = USER_STATUS.INACTIVE;
    this.touch();
  }

  /**
   * Mở khóa / Kích hoạt lại tài khoản.
   */
  public activate(): void {
    this.status = USER_STATUS.ACTIVE;
    this.touch();
  }

  /**
   * Khóa tài khoản do vi phạm hoặc nhập sai pass quá giới hạn.
   */
  public lock(): void {
    this.status = USER_STATUS.LOCKED;
    this.touch();
  }

  /**
   * Ghi nhận thời điểm đăng nhập thành công gần nhất (UC01).
   */
  public recordLogin(): void {
    this.lastLoginAt = new Date();
    this.touch();
  }

  /**
   * Điều chuyển nhân viên sang trạm khác (UC07).
   */
  public changeHub(newHubId: string | number): void {
    this.hubId = newHubId;
    this.touch();
  }

  /**
   * Cập nhật thông tin cá nhân (UC04, UC07).
   */
  public updateProfile(fullName: string, phone: PhoneNumber): void {
    this.fullName = fullName.trim();
    this.phone = phone;
    this.touch();
  }

  /**
   * Đổi mật khẩu tài khoản (UC03).
   */
  public updatePassword(newPasswordHash: string): void {
    this.passwordHash = newPasswordHash;
    this.touch();
  }

  private touch(): void {
    this.updatedAt = new Date();
  }
}
