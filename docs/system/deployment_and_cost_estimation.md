# Hướng Dẫn Triển Khai Docker, Vận Hành & Bảng Dự Toán Chi Phí Hạ Tầng

Tài liệu này cung cấp hướng dẫn toàn diện về **đóng gói Container hóa (Docker)**, **quy trình triển khai sản xuất (Production Deployment)**, **kịch bản giả lập 23 Use Cases**, và **bảng dự toán chi phí chi tiết** (hạ tầng máy chủ, lưu trữ ảnh POD và cước phí vận hành logistics) cho Hệ thống Quản lý Delivery Hub (IT3180).

---

## 1. Kiến Trúc Container Hóa (Docker Architecture)

Hệ thống được thiết kế đóng gói dưới dạng Multi-stage Standalone Container tối ưu dung lượng và tuân thủ các nguyên tắc bảo mật:

```mermaid
flowchart TD
    subgraph Host ["Máy chủ Host / VPS / Cloud Server"]
        subgraph DockerBridge ["Docker Bridge Network (delivery_hub_network)"]
            
            subgraph AppContainer ["Container: delivery-hub-app (Node.js 20 Alpine)"]
                Entry["docker-entrypoint.sh<br>(Prisma migrate deploy -> node server.js)"]
                NextApp["Next.js 16 Standalone Server (Port 3000)<br>User non-root: nextjs:nodejs"]
                HealthAPI["GET /api/health (Liveness/Readiness Probe)"]
                Entry --> NextApp
                NextApp --> HealthAPI
            end

            subgraph DBContainer ["Container: delivery-hub-postgres (PostgreSQL 16 Alpine)"]
                PG["PostgreSQL Server (Port 5432)<br>Database: delivery_hub"]
                PGHealth["Healthcheck Probe: pg_isready"]
                PG --> PGHealth
            end

            subgraph StorageVolume ["Docker Persistent Storage"]
                PGData["pgdata_production<br>(Lưu trữ CSDL vĩnh viễn)"]
            end
        end

        ReverseProxy["Nginx / Cloudflare Tunnel<br>(Reverse Proxy, SSL Let's Encrypt Port 80/443)"]
    end

    Client["Client Trình duyệt / Mobile Web"] -->|HTTPS 443| ReverseProxy
    ReverseProxy -->|HTTP Proxy Pass :3000| NextApp
    NextApp -->|Kết nối TCP :5432| PG
    PG -.->|Mount| PGData

    subgraph StorageCloud ["Dịch vụ Lưu Trữ Đám Mây Ngoài"]
        R2["Cloudflare R2 Storage<br>(Lưu trữ Ảnh bằng chứng giao hàng POD)"]
    end

    NextApp -.->|Upload POD Image (SSRF Whitelisted)| R2
```

### Đặc tính kỹ thuật của Container:
1. **Next.js Standalone Build:** Giảm kích thước image từ $\sim 1.5\text{ GB}$ (full `node_modules`) xuống còn $\sim 150\text{ MB}$, chỉ sao chép các tệp thực thi thực tế trong `.next/standalone` và tài sản tĩnh trong `.next/static`.
2. **Alpine Linux Security:** Chạy dưới quyền người dùng không có đặc quyền root (`nextjs:nodejs`, UID/GID 1001), cài đặt thư viện hệ thống cần thiết `openssl` và `libc6-compat`.
3. **Automated Migration Entrypoint:** Tệp `deploy/docker-entrypoint.sh` tự động chạy `npx prisma migrate deploy` trước khi máy chủ Next.js khởi động, bảo đảm cấu trúc CSDL luôn đồng bộ mà không làm mất dữ liệu sản xuất.
4. **Healthcheck & Uptime Monitoring:** Endpoint `GET /api/health` kiểm tra kết nối CSDL và thời gian hoạt động của máy chủ, tích hợp với Docker Healthcheck Probe (`CMD curl -f http://localhost:3000/api/health || exit 1`).

---

## 2. Danh Mục Lệnh Điều Khiển & Vận Hành (Convenience Scripts)

Các lệnh vận hành nhanh đã được cấu hình sẵn trong `package.json`:

| Lệnh thực thi | Mục đích sử dụng | Mô tả kỹ thuật |
|:---|:---|:---|
| `npm run docker:build` | Đóng gói Image | Thực thi Docker Compose build cho cả Web App |
| `npm run docker:up` | Khởi chạy hệ thống | Chạy ngầm (`-d`) PostgreSQL 16 và Next.js App |
| `npm run docker:down` | Dừng hệ thống | Dừng và thu hồi containers nhưng bảo toàn Volume dữ liệu |
| `npm run docker:logs` | Xem nhật ký Web App | Bám sát live log stream của Web App |
| `npm run docker:simulate` | Diễn tập 23 Use Cases | Chạy kịch bản tự động kiểm thử toàn bộ 23 Use Cases |
| `npm run verify` | Kiểm tra Kiến trúc | Chạy bộ guardrail 5 Vòng lặp (`verify_loops.mjs`) |
| `npm run test:all` | Chạy 143 Unit/E2E Tests | Chạy toàn bộ 143 bài test tự động của hệ thống |

---

## 3. Bảng Dự Toán Toàn Diện Chi Phí Hạ Tầng & Logistics

### 3.1. So sánh 3 Kịch bản Hạ tầng Cloud / Tháng

| Hạng mục | Kịch bản 1: Sinh viên / Demo Đồ án (10.000 đơn) | Kịch bản 2: VPS Doanh nghiệp Vừa (100.000 đơn/tháng) | Kịch bản 3: Doanh nghiệp Lớn Toàn quốc (1.000.000 đơn/năm) |
|:---|:---:|:---:|:---:|
| **Kiến trúc đề xuất** | **Serverless + Free Cloud** | **VPS Self-Hosted Docker Compose** | **Managed Cloud Containers (AWS/GCP)** |
| **Máy chủ Web App** | Vercel Hobby (0 VNĐ) | VPS Vietnix / Vultr 2 vCPU, 4GB RAM (~150.000 - 180.000 VNĐ) | AWS ECS / Google Cloud Run (~500.000 VNĐ) |
| **Cơ sở dữ liệu** | Supabase Free 500MB (0 VNĐ) | PostgreSQL 16 Container trên VPS (0 VNĐ) | Supabase Pro / AWS RDS Postgres (~600.000 VNĐ) |
| **Lưu trữ ảnh POD** | Cloudflare R2 Free 10GB (0 VNĐ) | Cloudflare R2 20GB (~4.000 VNĐ) | Cloudflare R2 200GB (~75.000 VNĐ) |
| **Băng thông mạng (Egress)** | Miễn phí (Cloudflare R2 $0 egress) | Miễn phí trong gói VPS (2TB traffic) | AWS Data Transfer Out (~50.000 VNĐ) |
| **Tên miền & SSL** | Domain miễn phí `.vercel.app` (0 VNĐ) | Tên miền `.vn` / `.com` (~30.000 VNĐ/tháng) | Domain Doanh nghiệp + Cloudflare WAF (~30.000 VNĐ) |
| **TỔNG CHI PHÍ HẠ TẦNG / THÁNG** | **0 VNĐ / tháng** *(100% Miễn phí)* | **~184.000 VNĐ / tháng** | **~1.255.000 VNĐ / tháng** |
| **Chi phí trung bình trên mỗi đơn** | **0 VNĐ / đơn** | **~1,84 VNĐ / đơn** | **~1,25 VNĐ / đơn** |

---

### 3.2. Tính toán Chi tiết Dung lượng Lưu trữ & Ảnh POD

1. **Dung lượng Cơ sở dữ liệu PostgreSQL:**
   * Mỗi đơn hàng tiêu tốn trung bình $\sim 1.5\text{ KB}$ (bao gồm bản ghi `orders` và $4 - 6$ bản ghi lịch sử `order_status_logs`).
   * $100.000\text{ đơn hàng/tháng} \times 1.5\text{ KB} = 150\text{ MB/tháng}$.
   * Volume $20\text{ GB SSD}$ trên VPS đáp ứng thoải mái hơn 10 năm dữ liệu vận hành.
2. **Dung lượng Ảnh bằng chứng giao hàng (POD):**
   * Mỗi ảnh chụp giao hàng được nén WebP/JPEG tối ưu $\sim 200\text{ KB}$.
   * $100.000\text{ đơn} \times 200\text{ KB} = 20\text{ GB lưu trữ/tháng}$.
   * Giá Cloudflare R2: $0.015\text{ USD/GB/tháng}$. $20\text{ GB} = 0.30\text{ USD} \approx 7.500\text{ VNĐ/tháng}$. Băng thông xem ảnh miễn phí $100\%$ ($0\text{ USD Egress}$).

---

### 3.3. Biểu Phí Nghiệp Vụ Vận Chuyển & Dịch Vụ COD

Biểu phí chuẩn hóa được tính toán tự động trong `CreateOrderUseCase`:

1. **Khối lượng quy đổi thể tích (Volumetric Weight):**
   $$\text{BillableWeight (gram)} = \max\left(\text{WeightGram},\; \frac{\text{Dài (cm)} \times \text{Rộng (cm)} \times \text{Cao (cm)}}{5000} \times 1000\right)$$
2. **Cước phí vận chuyển tiêu chuẩn:**
   * **Cơ bản ($\le 1.000\text{g}$):** $20.000\text{ VNĐ}$.
   * **Mỗi nấc $500\text{g}$ vượt thêm:** $+5.000\text{ VNĐ}$.
   * **Cước phí tối đa khống chế an toàn:** $10.000.000\text{ VNĐ}$ (chống lỗi nhập liệu tràn số).
3. **Phí dịch vụ thu hộ COD:**
   * Thu hộ $\le 3.000.000\text{ VNĐ}$: Miễn phí tiền dịch vụ thu hộ.
   * Thu hộ $> 3.000.000\text{ VNĐ}$: Phí bảo hiểm rủi ro tiền mặt $0.5\%$ giá trị thu hộ (tối đa $50.000.000\text{ VNĐ}$).

---

## 4. Hướng Dẫn Triển Khai Thực Tế

### 4.1. Chạy trên Docker cục bộ (Local Development / Testing)
```powershell
# 1. Khởi chạy cụm PostgreSQL và Web App qua Docker Compose
npm run docker:up

# 2. Xem log khởi động của ứng dụng
npm run docker:logs

# 3. Chạy kiểm thử diễn tập toàn diện 23 Use Cases
npm run docker:simulate

# 4. Khi cần tắt cụm container
npm run docker:down
```

### 4.2. Triển khai lên Máy chủ VPS Ubuntu / Debian (Production Deployment)
1. Cài đặt Docker và Docker Compose trên VPS:
   ```bash
   sudo apt update && sudo apt install -y docker.io docker-compose git
   ```
2. Clone mã nguồn dự án:
   ```bash
   git clone <REPO_URL> /opt/delivery-hub
   cd /opt/delivery-hub
   ```
3. Tạo file cấu hình môi trường từ mẫu:
   ```bash
   cp deploy/.env.production.example deploy/.env
   # Chỉnh sửa JWT_SECRET và mật khẩu DB bí mật
   nano deploy/.env
   ```
4. Khởi chạy hệ thống:
   ```bash
   docker compose -f deploy/docker-compose.yml up -d --build
   ```
5. Cấu hình Nginx Reverse Proxy và SSL Certbot Let's Encrypt trỏ về cổng `3000`.

---

## 5. Giám Sát Sức Khỏe Hệ Thống (Health Check API)

* **Endpoint:** `GET http://localhost:3000/api/health`
* **Mẫu phản hồi thành công (HTTP 200 OK):**
```json
{
  "status": "ok",
  "uptime": 1284.52,
  "timestamp": "2026-10-30T04:10:00.000Z",
  "database": "connected",
  "version": "1.0.0"
}
```
* **Mẫu phản hồi khi sự cố CSDL (HTTP 503 Service Unavailable):**
```json
{
  "status": "error",
  "uptime": 1285.10,
  "timestamp": "2026-10-30T04:10:01.000Z",
  "database": "disconnected",
  "version": "1.0.0",
  "error": "Database connection failed or unreachable"
}
```
