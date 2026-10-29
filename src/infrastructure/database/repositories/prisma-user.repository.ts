/**
 * @file prisma-user.repository.ts
 * @description Hiện thực hóa hợp đồng IUserRepository sử dụng Prisma ORM và PostgreSQL.
 * @module infrastructure/database/repositories
 */

import { PrismaClient, type Prisma, type User as PrismaUser } from '@prisma/client';
import {
  type IUserRepository,
  type UserSearchCriteria,
  User,
  USER_ROLE,
  USER_STATUS,
  type UserRole,
  type UserStatus,
} from '../../../domain';
import { prisma as defaultPrisma } from '../prisma/client';
import { UserMapper, toBigInt } from '../mappers';

/**
 * Repository quản lý Nhân sự và Tài khoản người dùng.
 */
export class PrismaUserRepository implements IUserRepository {
  private readonly prisma: PrismaClient;

  /**
   * Khởi tạo Repository với PrismaClient instance.
   * @param {PrismaClient} prismaClient Tùy chọn truyền instance khác
   */
  constructor(prismaClient: PrismaClient = defaultPrisma) {
    this.prisma = prismaClient;
  }

  /**
   * Tìm người dùng theo ID nội bộ.
   * @param {string | number} id ID người dùng
   * @returns {Promise<User | null>}
   */
  public async findById(id: string | number): Promise<User | null> {
    const bigId = toBigInt(id);
    if (!bigId) return null;

    const raw = await this.prisma.user.findUnique({
      where: { id: bigId },
    });

    return raw ? UserMapper.toDomain(raw) : null;
  }

  /**
   * Tìm người dùng theo Tên đăng nhập (UC01 - Login).
   * @param {string} username Tên đăng nhập
   * @returns {Promise<User | null>}
   */
  public async findByUsername(username: string): Promise<User | null> {
    const raw = await this.prisma.user.findUnique({
      where: { username: username.trim().toLowerCase() },
    });

    return raw ? UserMapper.toDomain(raw) : null;
  }

  /**
   * Tìm người dùng theo Email.
   * @param {string} email Địa chỉ email
   * @returns {Promise<User | null>}
   */
  public async findByEmail(email: string): Promise<User | null> {
    const raw = await this.prisma.user.findUnique({
      where: { email: email.trim().toLowerCase() },
    });

    return raw ? UserMapper.toDomain(raw) : null;
  }

  /**
   * Tìm người dùng theo Số điện thoại.
   * @param {string} phone Số điện thoại
   * @returns {Promise<User | null>}
   */
  public async findByPhone(phone: string): Promise<User | null> {
    const raw = await this.prisma.user.findUnique({
      where: { phone: phone.trim() },
    });

    return raw ? UserMapper.toDomain(raw) : null;
  }

  /**
   * Lấy danh sách nhân viên trực thuộc một trạm lọc theo vai trò và trạng thái (UC04, UC05).
   * Tối ưu hóa bằng chỉ mục @@index([hubId, role, status]).
   *
   * @param {string | number} hubId ID của trạm
   * @param {UserRole} role Vai trò (tùy chọn)
   * @param {UserStatus} status Trạng thái (tùy chọn)
   * @returns {Promise<User[]>}
   */
  public async findByHub(
    hubId: string | number,
    role?: UserRole,
    status?: UserStatus
  ): Promise<User[]> {
    const bigHubId = toBigInt(hubId);
    if (!bigHubId) return [];

    const where: Prisma.UserWhereInput = {
      hubId: bigHubId,
    };

    if (role) where.role = role;
    if (status) where.status = status;

    const rawUsers = await this.prisma.user.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    return rawUsers.map(UserMapper.toDomain);
  }

  /**
   * Lấy danh sách Shipper đang hoạt động tại trạm để gán đơn (UC16).
   *
   * @param {string | number} hubId ID của trạm
   * @returns {Promise<User[]>}
   */
  public async findActiveShippersByHub(hubId: string | number): Promise<User[]> {
    const bigHubId = toBigInt(hubId);
    if (!bigHubId) return [];

    const rawShippers = await this.prisma.user.findMany({
      where: {
        hubId: bigHubId,
        role: USER_ROLE.SHIPPER,
        status: USER_STATUS.ACTIVE,
      },
      orderBy: { fullName: 'asc' },
    });

    return rawShippers.map(UserMapper.toDomain);
  }

  /**
   * Lưu hoặc cập nhật thông tin nhân viên (UC05, UC06, UC07).
   * @param {User} user Thực thể User
   * @returns {Promise<User>}
   */
  public async save(user: User): Promise<User> {
    const userId = user.getId();
    let savedRaw: PrismaUser;

    if (userId) {
      savedRaw = await this.prisma.user.update({
        where: { id: BigInt(userId) },
        data: UserMapper.toPersistenceUpdate(user),
      });
    } else {
      savedRaw = await this.prisma.user.create({
        data: UserMapper.toPersistenceCreate(user),
      });
    }

    return UserMapper.toDomain(savedRaw);
  }

  /**
   * Tìm kiếm phân trang danh sách nhân sự (UC04).
   * @param {UserSearchCriteria} criteria Tiêu chí lọc và tìm kiếm
   * @returns {Promise<{ users: User[]; total: number }>}
   */
  public async search(
    criteria: UserSearchCriteria
  ): Promise<{ users: User[]; total: number }> {
    const where: Prisma.UserWhereInput = {};

    if (criteria.hubId !== undefined) {
      const bigHubId = toBigInt(criteria.hubId);
      if (bigHubId) where.hubId = bigHubId;
    }

    if (criteria.role) where.role = criteria.role;
    if (criteria.status) where.status = criteria.status;

    if (criteria.searchTerm) {
      const term = criteria.searchTerm.trim();
      where.OR = [
        { username: { contains: term, mode: 'insensitive' } },
        { fullName: { contains: term, mode: 'insensitive' } },
        { email: { contains: term, mode: 'insensitive' } },
        { phone: { contains: term } },
      ];
    }

    const page = Math.max(1, criteria.page ?? 1);
    const limit = Math.max(1, Math.min(100, criteria.limit ?? 20));
    const skip = (page - 1) * limit;

    const [total, rawUsers] = await Promise.all([
      this.prisma.user.count({ where }),
      this.prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return {
      users: rawUsers.map(UserMapper.toDomain),
      total,
    };
  }
}
