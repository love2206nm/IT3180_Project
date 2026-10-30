/**
 * @file container.ts
 * @description Composition Root & Dependency Injection (DI) Container của toàn bộ hệ thống.
 * Áp dụng mẫu thiết kế On-Demand Lazy Singleton (TypeScript Getters) để tối ưu hóa hiệu năng 0ms overhead,
 * đồng thời bảo đảm phân tách ranh giới Clean Architecture tuyệt đối:
 * Tầng Presentation Actions chỉ gọi Use Cases thông qua Container, không bao giờ import Database client trực tiếp.
 * @module infrastructure/di
 */

import {
  PrismaUserRepository,
  PrismaHubRepository,
  PrismaOrderRepository,
  PrismaOrderStatusLogRepository,
  PrismaDeliveryZoneRepository,
  PrismaCODSettlementRepository,
} from '../database/repositories';
import {
  BcryptPasswordHasherService,
  JwtAuthTokenService,
} from '../security';
import type {
  IUserRepository,
  IHubRepository,
  IOrderRepository,
  IOrderStatusLogRepository,
  IDeliveryZoneRepository,
  ICODSettlementRepository,
} from '../../domain';
import type {
  IPasswordHasherService,
  IAuthTokenService,
} from '../../application/interfaces';
import {
  LoginUserUseCase,
  ChangePasswordUseCase,
  UpdateProfileUseCase,
  GetProfileUseCase,
  GetStaffListUseCase,
  CreateStaffUseCase,
  UpdateStaffUseCase,
  ToggleStaffStatusUseCase,
  AssignShipperZoneUseCase,
  CreateOrderUseCase,
  GetOrderListUseCase,
  GetOrderDetailUseCase,
  UpdateOrderUseCase,
  CancelOrderUseCase,
  ImportOrdersUseCase,
  GetPublicTrackingUseCase,
  CheckInHubUseCase,
  AssignOrdersToShipperUseCase,
  MarkDeliveredUseCase,
  MarkFailedAttemptUseCase,
  ProcessReturnOrderUseCase,
  GetHubStatisticsUseCase,
  CreateCODSettlementUseCase,
  ReviewCODSettlementUseCase,
} from '../../application/use-cases';

/**
 * Tùy chọn truyền dependencies ghi đè (hữu ích cho Unit Tests / Integration Mocks)
 */
export interface ContainerDependencies {
  userRepository?: IUserRepository;
  hubRepository?: IHubRepository;
  orderRepository?: IOrderRepository;
  orderStatusLogRepository?: IOrderStatusLogRepository;
  deliveryZoneRepository?: IDeliveryZoneRepository;
  codSettlementRepository?: ICODSettlementRepository;
  passwordHasherService?: IPasswordHasherService;
  authTokenService?: IAuthTokenService;
}

/**
 * Trung tâm phối hợp phụ thuộc (Composition Root) của hệ thống.
 */
export class AppContainer {
  // 1. Singleton Repositories & Security Services
  public userRepository: IUserRepository;
  public hubRepository: IHubRepository;
  public orderRepository: IOrderRepository;
  public orderStatusLogRepository: IOrderStatusLogRepository;
  public deliveryZoneRepository: IDeliveryZoneRepository;
  public codSettlementRepository: ICODSettlementRepository;
  public passwordHasherService: IPasswordHasherService;
  public authTokenService: IAuthTokenService;

  // 2. Lazy Cached Use Case Instances
  // Phân hệ 1: Xác thực & Hồ sơ (UC01 - UC03)
  private _loginUserUseCase?: LoginUserUseCase;
  private _changePasswordUseCase?: ChangePasswordUseCase;
  private _updateProfileUseCase?: UpdateProfileUseCase;
  private _getProfileUseCase?: GetProfileUseCase;

  // Phân hệ 2: Nhân sự (UC04 - UC08)
  private _getStaffListUseCase?: GetStaffListUseCase;
  private _createStaffUseCase?: CreateStaffUseCase;
  private _updateStaffUseCase?: UpdateStaffUseCase;
  private _toggleStaffStatusUseCase?: ToggleStaffStatusUseCase;
  private _assignShipperZoneUseCase?: AssignShipperZoneUseCase;

  // Phân hệ 3: Đơn hàng (UC09 - UC14, UC23)
  private _createOrderUseCase?: CreateOrderUseCase;
  private _getOrderListUseCase?: GetOrderListUseCase;
  private _getOrderDetailUseCase?: GetOrderDetailUseCase;
  private _updateOrderUseCase?: UpdateOrderUseCase;
  private _cancelOrderUseCase?: CancelOrderUseCase;
  private _importOrdersUseCase?: ImportOrdersUseCase;
  private _getPublicTrackingUseCase?: GetPublicTrackingUseCase;

  // Phân hệ 4: Điều phối vận chuyển (UC15 - UC20)
  private _checkInHubUseCase?: CheckInHubUseCase;
  private _assignOrdersToShipperUseCase?: AssignOrdersToShipperUseCase;
  private _markDeliveredUseCase?: MarkDeliveredUseCase;
  private _markFailedAttemptUseCase?: MarkFailedAttemptUseCase;
  private _processReturnOrderUseCase?: ProcessReturnOrderUseCase;

  // Phân hệ 5: COD & Hiệu suất (UC21 - UC22)
  private _getHubStatisticsUseCase?: GetHubStatisticsUseCase;
  private _createCODSettlementUseCase?: CreateCODSettlementUseCase;
  private _reviewCODSettlementUseCase?: ReviewCODSettlementUseCase;

  /**
   * Khởi tạo Container với các Singletons mặc định (hoặc nhận overrides khi chạy mock tests).
   * @param {ContainerDependencies} [overrides] Tùy chọn ghi đè dependencies
   */
  constructor(overrides: ContainerDependencies = {}) {
    this.userRepository = overrides.userRepository ?? new PrismaUserRepository();
    this.hubRepository = overrides.hubRepository ?? new PrismaHubRepository();
    this.orderRepository = overrides.orderRepository ?? new PrismaOrderRepository();
    this.orderStatusLogRepository =
      overrides.orderStatusLogRepository ?? new PrismaOrderStatusLogRepository();
    this.deliveryZoneRepository =
      overrides.deliveryZoneRepository ?? new PrismaDeliveryZoneRepository();
    this.codSettlementRepository =
      overrides.codSettlementRepository ?? new PrismaCODSettlementRepository();
    this.passwordHasherService =
      overrides.passwordHasherService ?? new BcryptPasswordHasherService();
    this.authTokenService =
      overrides.authTokenService ?? new JwtAuthTokenService();
  }

  /**
   * Đặt lại toàn bộ cache Use Cases và ghi đè dependencies (phục vụ Unit Tests).
   * @param {ContainerDependencies} [overrides] Danh sách dependencies mới
   */
  public reset(overrides: ContainerDependencies = {}): void {
    this._loginUserUseCase = undefined;
    this._changePasswordUseCase = undefined;
    this._updateProfileUseCase = undefined;
    this._getProfileUseCase = undefined;
    this._getStaffListUseCase = undefined;
    this._createStaffUseCase = undefined;
    this._updateStaffUseCase = undefined;
    this._toggleStaffStatusUseCase = undefined;
    this._assignShipperZoneUseCase = undefined;
    this._createOrderUseCase = undefined;
    this._getOrderListUseCase = undefined;
    this._getOrderDetailUseCase = undefined;
    this._updateOrderUseCase = undefined;
    this._cancelOrderUseCase = undefined;
    this._importOrdersUseCase = undefined;
    this._getPublicTrackingUseCase = undefined;
    this._checkInHubUseCase = undefined;
    this._assignOrdersToShipperUseCase = undefined;
    this._markDeliveredUseCase = undefined;
    this._markFailedAttemptUseCase = undefined;
    this._processReturnOrderUseCase = undefined;
    this._getHubStatisticsUseCase = undefined;
    this._createCODSettlementUseCase = undefined;
    this._reviewCODSettlementUseCase = undefined;

    if (overrides.userRepository) this.userRepository = overrides.userRepository;
    if (overrides.hubRepository) this.hubRepository = overrides.hubRepository;
    if (overrides.orderRepository) this.orderRepository = overrides.orderRepository;
    if (overrides.orderStatusLogRepository) this.orderStatusLogRepository = overrides.orderStatusLogRepository;
    if (overrides.deliveryZoneRepository) this.deliveryZoneRepository = overrides.deliveryZoneRepository;
    if (overrides.codSettlementRepository) this.codSettlementRepository = overrides.codSettlementRepository;
    if (overrides.passwordHasherService) this.passwordHasherService = overrides.passwordHasherService;
    if (overrides.authTokenService) this.authTokenService = overrides.authTokenService;
  }

  // ===========================================================================
  // LAZY GETTERS CHO TỪNG PHÂN HỆ NGHIỆP VỤ
  // ===========================================================================

  /**
   * Phân hệ 1: Xác thực & Quản lý Tài khoản (UC01 - UC03)
   */
  public get auth() {
    return {
      login: (): LoginUserUseCase =>
        (this._loginUserUseCase ??= new LoginUserUseCase(
          this.userRepository,
          this.passwordHasherService,
          this.authTokenService
        )),
      changePassword: (): ChangePasswordUseCase =>
        (this._changePasswordUseCase ??= new ChangePasswordUseCase(
          this.userRepository,
          this.passwordHasherService
        )),
      updateProfile: (): UpdateProfileUseCase =>
        (this._updateProfileUseCase ??= new UpdateProfileUseCase(
          this.userRepository
        )),
      getProfile: (): GetProfileUseCase =>
        (this._getProfileUseCase ??= new GetProfileUseCase(
          this.userRepository
        )),
    };
  }

  /**
   * Phân hệ 2: Quản lý Nhân sự & Phân quyền (UC04 - UC08)
   */
  public get staff() {
    return {
      getStaffList: (): GetStaffListUseCase =>
        (this._getStaffListUseCase ??= new GetStaffListUseCase(
          this.userRepository,
          this.hubRepository
        )),
      createStaff: (): CreateStaffUseCase =>
        (this._createStaffUseCase ??= new CreateStaffUseCase(
          this.userRepository,
          this.hubRepository,
          this.passwordHasherService
        )),
      updateStaff: (): UpdateStaffUseCase =>
        (this._updateStaffUseCase ??= new UpdateStaffUseCase(
          this.userRepository,
          this.hubRepository
        )),
      toggleStaffStatus: (): ToggleStaffStatusUseCase =>
        (this._toggleStaffStatusUseCase ??= new ToggleStaffStatusUseCase(
          this.userRepository
        )),
      assignShipperZone: (): AssignShipperZoneUseCase =>
        (this._assignShipperZoneUseCase ??= new AssignShipperZoneUseCase(
          this.userRepository,
          this.deliveryZoneRepository
        )),
    };
  }

  /**
   * Phân hệ 3: Quản trị Đơn hàng & Tra cứu Công khai (UC09 - UC14, UC23)
   */
  public get orders() {
    return {
      createOrder: (): CreateOrderUseCase =>
        (this._createOrderUseCase ??= new CreateOrderUseCase(
          this.orderRepository,
          this.hubRepository
        )),
      getOrderList: (): GetOrderListUseCase =>
        (this._getOrderListUseCase ??= new GetOrderListUseCase(
          this.orderRepository,
          this.hubRepository,
          this.userRepository
        )),
      getOrderDetail: (): GetOrderDetailUseCase =>
        (this._getOrderDetailUseCase ??= new GetOrderDetailUseCase(
          this.orderRepository,
          this.orderStatusLogRepository,
          this.hubRepository,
          this.userRepository
        )),
      updateOrder: (): UpdateOrderUseCase =>
        (this._updateOrderUseCase ??= new UpdateOrderUseCase(
          this.orderRepository,
          this.hubRepository
        )),
      cancelOrder: (): CancelOrderUseCase =>
        (this._cancelOrderUseCase ??= new CancelOrderUseCase(
          this.orderRepository
        )),
      importOrders: (): ImportOrdersUseCase =>
        (this._importOrdersUseCase ??= new ImportOrdersUseCase(
          this.orderRepository,
          this.hubRepository
        )),
      getPublicTracking: (): GetPublicTrackingUseCase =>
        (this._getPublicTrackingUseCase ??= new GetPublicTrackingUseCase(
          this.orderRepository,
          this.orderStatusLogRepository,
          this.hubRepository
        )),
    };
  }

  /**
   * Phân hệ 4: Điều phối & Vòng đời Vận chuyển (UC15 - UC20)
   */
  public get shipments() {
    return {
      checkInHub: (): CheckInHubUseCase =>
        (this._checkInHubUseCase ??= new CheckInHubUseCase(
          this.orderRepository,
          this.hubRepository
        )),
      assignOrdersToShipper: (): AssignOrdersToShipperUseCase =>
        (this._assignOrdersToShipperUseCase ??= new AssignOrdersToShipperUseCase(
          this.orderRepository,
          this.userRepository
        )),
      markDelivered: (): MarkDeliveredUseCase =>
        (this._markDeliveredUseCase ??= new MarkDeliveredUseCase(
          this.orderRepository
        )),
      markFailedAttempt: (): MarkFailedAttemptUseCase =>
        (this._markFailedAttemptUseCase ??= new MarkFailedAttemptUseCase(
          this.orderRepository
        )),
      processReturnOrder: (): ProcessReturnOrderUseCase =>
        (this._processReturnOrderUseCase ??= new ProcessReturnOrderUseCase(
          this.orderRepository
        )),
    };
  }

  /**
   * Phân hệ 5: Báo cáo Hiệu suất & Đối soát COD (UC21 - UC22)
   */
  public get cod() {
    return {
      getHubStatistics: (): GetHubStatisticsUseCase =>
        (this._getHubStatisticsUseCase ??= new GetHubStatisticsUseCase(
          this.orderRepository,
          this.userRepository
        )),
      createCODSettlement: (): CreateCODSettlementUseCase =>
        (this._createCODSettlementUseCase ??= new CreateCODSettlementUseCase(
          this.codSettlementRepository,
          this.orderRepository,
          this.hubRepository,
          this.userRepository
        )),
      reviewCODSettlement: (): ReviewCODSettlementUseCase =>
        (this._reviewCODSettlementUseCase ??= new ReviewCODSettlementUseCase(
          this.codSettlementRepository,
          this.hubRepository,
          this.userRepository
        )),
    };
  }

  /**
   * Kiểm tra trạng thái kết nối tới Cơ sở dữ liệu (Database Health Probe)
   * Phục vụ Endpoint GET /api/health và Container Liveness/Readiness Probe.
   * 
   * @returns {Promise<boolean>} True nếu CSDL sẵn sàng, False nếu mất kết nối
   */
  public async checkHealth(): Promise<boolean> {
    try {
      await this.hubRepository.findAll();
      return true;
    } catch {
      return false;
    }
  }
}

/**
 * Singleton instance toàn cục của Composition Root
 */
export const appContainer = new AppContainer();
