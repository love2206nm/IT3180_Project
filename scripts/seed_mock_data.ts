/**
 * @file seed_mock_data.ts
 * @description Script nạp dữ liệu mẫu giả lập (Mock Data Seeder) phục vụ kiểm thử E2E.
 * Tự động ánh xạ khóa ngoại giữa Hubs, Users, Zones, Orders và Settlements.
 * @module scripts
 */

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import {
  MOCK_HUBS,
  MOCK_USERS,
  MOCK_ZONES,
  MOCK_SHIPPER_ZONE_ASSIGNMENTS,
  MOCK_ORDERS,
  MOCK_SETTLEMENTS,
} from '../tests/mock-data';
import { cleanMockData } from './clean_mock_data';

const defaultPrisma = new PrismaClient();

export interface SeedMockResult {
  hubsCount: number;
  usersCount: number;
  zonesCount: number;
  ordersCount: number;
  settlementsCount: number;
}

/**
 * Nạp dữ liệu giả lập vào cơ sở dữ liệu PostgreSQL.
 * @param prismaClient Tùy chọn truyền instance PrismaClient
 */
export async function seedMockData(prismaClient: PrismaClient = defaultPrisma): Promise<SeedMockResult> {
  console.log('🚀 [MOCK SEED] Bắt đầu nạp dữ liệu Mock Data vào cơ sở dữ liệu...');

  // 1. Dọn dẹp dữ liệu mock cũ trước khi nạp để bảo đảm tính idempotent
  await cleanMockData(prismaClient);

  // 2. Nạp Hubs
  const hubIdMap = new Map<string, bigint>();
  for (const hubData of MOCK_HUBS) {
    const created = await prismaClient.hub.create({
      data: hubData,
    });
    hubIdMap.set(hubData.code, created.id);
  }
  console.log(`   ✔ Đã nạp ${hubIdMap.size} Trạm giao nhận Mock.`);

  // 3. Nạp Users
  const userIdMap = new Map<string, bigint>();
  const defaultPasswordHash = await bcrypt.hash('Password@123', 10);

  for (const userData of MOCK_USERS) {
    const hubId = userData.hubCode ? hubIdMap.get(userData.hubCode) ?? null : null;
    const created = await prismaClient.user.create({
      data: {
        username: userData.username,
        fullName: userData.fullName,
        email: userData.email,
        phone: userData.phone,
        role: userData.role,
        status: userData.status,
        passwordHash: defaultPasswordHash,
        hubId,
      },
    });
    userIdMap.set(userData.username, created.id);
  }
  console.log(`   ✔ Đã nạp ${userIdMap.size} Tài khoản Nhân sự Mock.`);

  // 4. Nạp Tuyến giao hàng (Delivery Zones)
  const zoneIdMap = new Map<string, bigint>();
  for (const zoneData of MOCK_ZONES) {
    const hubId = hubIdMap.get(zoneData.hubCode);
    if (!hubId) continue;

    const created = await prismaClient.deliveryZone.create({
      data: {
        code: zoneData.code,
        name: zoneData.name,
        district: zoneData.district,
        ward: zoneData.ward,
        description: zoneData.description,
        hubId,
      },
    });
    zoneIdMap.set(zoneData.code, created.id);
  }

  // Phân công tuyến cho Shipper
  for (const assignment of MOCK_SHIPPER_ZONE_ASSIGNMENTS) {
    const shipperId = userIdMap.get(assignment.shipperUsername);
    const zoneId = zoneIdMap.get(assignment.zoneCode);
    if (shipperId && zoneId) {
      await prismaClient.shipperZone.create({
        data: {
          shipperId,
          zoneId,
          status: assignment.status,
        },
      });
    }
  }
  console.log(`   ✔ Đã nạp ${zoneIdMap.size} Tuyến giao hàng và phân công tuyến Mock.`);

  // 5. Nạp Đơn hàng (Orders) & Logs
  const orderIdMap = new Map<string, bigint>();
  for (const orderData of MOCK_ORDERS) {
    const currentHubId = orderData.currentHubCode ? hubIdMap.get(orderData.currentHubCode) ?? null : null;
    const assignedShipperId = orderData.assignedShipperUsername
      ? userIdMap.get(orderData.assignedShipperUsername) ?? null
      : null;

    const created = await prismaClient.order.create({
      data: {
        trackingCode: orderData.trackingCode,
        currentHubId,
        assignedShipperId,
        senderName: orderData.senderName,
        senderPhone: orderData.senderPhone,
        senderAddress: orderData.senderAddress,
        receiverName: orderData.receiverName,
        receiverPhone: orderData.receiverPhone,
        receiverAddress: orderData.receiverAddress,
        receiverProvince: orderData.receiverProvince,
        receiverDistrict: orderData.receiverDistrict,
        receiverWard: orderData.receiverWard,
        weightGram: orderData.weightGram,
        lengthCm: orderData.lengthCm,
        widthCm: orderData.widthCm,
        heightCm: orderData.heightCm,
        codAmount: orderData.codAmount,
        shippingFee: orderData.shippingFee,
        paymentBy: orderData.paymentBy,
        paymentStatus: orderData.paymentStatus,
        currentStatus: orderData.currentStatus,
        deliveryAttempts: orderData.deliveryAttempts,
        maxAttempts: orderData.maxAttempts,
        notes: orderData.notes,
      },
    });
    orderIdMap.set(orderData.trackingCode, created.id);

    // Tạo bản ghi log kiểm vết cho từng đơn
    const actorId = assignedShipperId ?? userIdMap.get('mock_staff') ?? userIdMap.get('mock_admin')!;
    await prismaClient.orderStatusLog.create({
      data: {
        orderId: created.id,
        hubId: currentHubId,
        actorId,
        newStatus: orderData.currentStatus,
        note: `Khởi tạo bản ghi Mock: ${orderData.notes}`,
      },
    });
  }
  console.log(`   ✔ Đã nạp ${orderIdMap.size} Đơn hàng và Lịch sử hành trình Mock.`);

  // 6. Nạp Phiên đối soát COD (Settlements) & Chi tiết
  let settlementsCount = 0;
  for (const setItem of MOCK_SETTLEMENTS) {
    const hubId = hubIdMap.get(setItem.hubCode);
    const shipperId = userIdMap.get(setItem.shipperUsername);
    const managerId = setItem.managerUsername ? userIdMap.get(setItem.managerUsername) ?? null : null;

    if (!hubId || !shipperId) continue;

    const created = await prismaClient.cODSettlement.create({
      data: {
        settlementCode: setItem.settlementCode,
        hubId,
        shipperId,
        managerId,
        totalCodAmount: setItem.totalCodAmount,
        totalOrdersCount: setItem.totalOrdersCount,
        status: setItem.status,
        notes: setItem.notes,
        settledAt: new Date(),
      },
    });

    for (const trackingCode of setItem.orderTrackingCodes) {
      const orderId = orderIdMap.get(trackingCode);
      if (orderId) {
        await prismaClient.cODSettlementDetail.create({
          data: {
            settlementId: created.id,
            orderId,
            codCollected: setItem.totalCodAmount,
          },
        });
      }
    }
    settlementsCount += 1;
  }
  console.log(`   ✔ Đã nạp ${settlementsCount} Phiên đối soát COD Mock.`);
  console.log('🎉 [MOCK SEED] Hoàn tất nạp dữ liệu Mock Data thành công!\n');

  return {
    hubsCount: hubIdMap.size,
    usersCount: userIdMap.size,
    zonesCount: zoneIdMap.size,
    ordersCount: orderIdMap.size,
    settlementsCount,
  };
}

// Thực thi khi gọi trực tiếp qua CLI (node / tsx)
if (process.argv[1]?.includes('seed_mock_data')) {
  seedMockData(defaultPrisma)
    .catch((err) => {
      console.error('❌ [LỖI SEED MOCK]:', err);
      process.exit(1);
    })
    .finally(async () => {
      await defaultPrisma.$disconnect();
    });
}

