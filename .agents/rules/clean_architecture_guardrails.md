# RÀO CHẮN KIẾN TRÚC CLEAN ARCHITECTURE (CLEAN ARCHITECTURE GUARDRAILS)
**Áp dụng cho:** Toàn bộ mã nguồn trong thư mục `src/`

---

## 1. Cấu trúc Phân tầng & Trách nhiệm Từng Thư mục

```text
src/
├── domain/                                <-- TẦNG 1: DOENTERPRISE BUSINESS RULES
│   ├── entities/                          # Các thực thể nghiệp vụ hạt nhân (Order, User, Hub, ShipmentLog...)
│   ├── interface/
│   │   ├── repositories/                  # Hợp đồng lưu trữ (IOrderRepository, IUserRepository, IHubRepository...)
│   │   └── services/                      # Hợp đồng dịch vụ ngoài (INotificationService, IStorageService...)
│   ├── value-objects/                     # Đối tượng giá trị bất biến (TrackingCode, Money, PhoneNumber, Address...)
│   ├── constants/                         # Enums, Consts (ORDER_STATUS, USER_ROLE, PAYMENT_STATUS...)
│   └── exceptions/                        # Ngoại lệ nghiệp vụ (OrderNotFoundException, InvalidStatusTransitionException...)
│
├── application/                           # TẦNG 2: APPLICATION BUSINESS RULES
│   ├── use-cases/
│   │   ├── auth/                          # LoginUseCase, LogoutUseCase...
│   │   ├── staff/                         # CreateStaffUseCase, UpdateStaffUseCase, AssignZoneUseCase...
│   │   ├── orders/                        # CreateOrderUseCase, GetOrderDetailUseCase, UpdateOrderUseCase...
│   │   ├── shipments/                     # CheckInHubUseCase, AssignShipperUseCase, UpdateDeliveryProgressUseCase...
│   │   └── cod/                           # SettleCODUseCase, ReconcileCODUseCase...
│   ├── dtos/                              # Input/Output DTOs có Zod validation schemas
│   └── interfaces/                        # IUseCase contract
│
├── infrastructure/                        # TẦNG 3: FRAMEWORKS & DRIVERS
│   ├── database/
│   │   ├── prisma/                        # Prisma schema, PrismaClient singleton instance
│   │   ├── repositories/                  # Triển khai thực tế các interface (PrismaOrderRepository...)
│   │   └── mappers/                       # Chuyển đổi dữ liệu (Prisma Model <-> Domain Entity)
│   ├── storage/                           # Adapter tải ảnh POD lên Cloudflare R2 / S3
│   ├── security/                          # BcryptHasher, JWTHelper
│   └── config/                            # Đọc và validate biến môi trường (.env)
│
├── presentation/                          # TẦNG 4: INTERFACE ADAPTERS (NEXT.JS UI)
│   ├── actions/                           # Next.js Server Actions (Cầu nối giữa UI và Application Use Cases)
│   ├── components/                        # Shared UI Components (Table, Dialog, BarcodeScanner, Timeline...)
│   └── hooks/                             # React Client hooks (useScanner, useTracking, useDebounce...)
│
└── app/                                   # TẦNG 5: NEXT.JS APP ROUTER
    ├── (auth)/login/                      # Màn hình đăng nhập
    ├── (dashboard)/                       # Không gian làm việc theo vai trò
    │   ├── admin/                         # Quản lý Hub, nhân sự toàn hệ thống
    │   ├── staff/                         # Quét mã Inbound, phân loại, điều phối giao
    │   ├── shipper/                       # Mobile giao diện cho Shipper, chụp ảnh POD, thu COD
    │   └── cod/                           # Đối soát tiền thu hộ
    ├── tracking/                          # Tra cứu vận đơn công khai
    └── api/                               # Route Handlers cho Webhooks / Export
```

---

## 2. Quy tắc Ranh giới Nhập khẩu (Import Boundary Rules)

### Quy tắc 1: Domain là Vùng Độc lập Tuyệt đối
* Files trong `src/domain/**/*` **CHỈ ĐƯỢC PHÉP** import lẫn nhau bên trong `src/domain`.
* **CẤM:** Không được import từ `src/application`, `src/infrastructure`, `src/presentation`, `src/app` hay bất kỳ thư viện ORM nào (`@prisma/client`).

### Quy tắc 2: Application chỉ phụ thuộc Domain
* Files trong `src/application/**/*` được phép import từ `src/domain`.
* **CẤM:** Không được import trực tiếp từ `src/infrastructure` hoặc `src/presentation`.
* Mọi thao tác lưu trữ CSDL phải gọi qua `src/domain/interface/repositories/`.

### Quy tắc 3: Infrastructure là Tầng Triển khai
* Files trong `src/infrastructure/**/*` được phép import từ `src/domain` và `src/application`.
* Triển khai các interface từ `src/domain/interface/repositories/`.
* Sử dụng `src/infrastructure/database/mappers/` để đảm bảo kết quả trả về cho Application luôn là **Domain Entity thuần túy**, không để lộ Prisma Model ra ngoài.

### Quy tắc 4: Presentation & App gọi Use Cases
* Files trong `src/presentation/**/*` và `src/app/**/*` gọi các Use Case tại `src/application/use-cases/` (thông qua Server Actions hoặc Dependency Injection).
* **CẤM:** Không được import trực tiếp từ `src/infrastructure/database` để query CSDL (bỏ qua tầng Use Case).
