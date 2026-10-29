/**
 * @file prisma_schema.test.ts
 * @description Unit tests kiểm tra tính toàn vẹn của Prisma Schema, các Models và Chỉ mục (Indexes)
 * đối soát trực tiếp với database_design.md và 23 Use Cases.
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '../..');
const SCHEMA_PATH = path.join(ROOT_DIR, 'src/infrastructure/database/prisma/schema.prisma');

describe('Infrastructure Layer: Prisma Schema & Indexing Integrity Test Suite', () => {
  const schemaContent = fs.readFileSync(SCHEMA_PATH, 'utf-8');

  test('Prisma Schema: File exists and uses PostgreSQL provider', () => {
    assert.equal(fs.existsSync(SCHEMA_PATH), true);
    assert.equal(/provider\s*=\s*"postgresql"/.test(schemaContent), true);
    assert.equal(/url\s*=\s*env\("DATABASE_URL"\)/.test(schemaContent), true);
  });

  test('Prisma Schema: Contains all 8 core models from database_design.md', () => {
    const requiredModels = [
      'model Hub',
      'model User',
      'model DeliveryZone',
      'model ShipperZone',
      'model Order',
      'model OrderStatusLog',
      'model CODSettlement',
      'model CODSettlementDetail',
    ];

    for (const model of requiredModels) {
      assert.equal(
        schemaContent.includes(model),
        true,
        `Prisma schema thiếu model bắt buộc: ${model}`
      );
    }
  });

  test('Prisma Schema: Contains all 7 Enums matching Domain Constants', () => {
    const requiredEnums = [
      'enum UserRole',
      'enum UserStatus',
      'enum HubStatus',
      'enum PaymentBy',
      'enum PaymentStatus',
      'enum OrderStatus',
      'enum CODSettlementStatus',
    ];

    for (const en of requiredEnums) {
      assert.equal(
        schemaContent.includes(en),
        true,
        `Prisma schema thiếu enum bắt buộc: ${en}`
      );
    }
  });

  test('Prisma Indexing: All 12 indexes for 23 Use Cases are present', () => {
    // Danh sách 12 Indexes đã được thiết kế tối ưu cho 23 Use Cases
    const requiredIndexes = [
      // UC04, UC16: User hub & role
      '@@index([hubId, role, status])',
      // UC08: Shipper zone
      '@@index([shipperId, status])',
      '@@index([zoneId])',
      // UC10: Order receiver & sender phone
      '@@index([receiverPhone])',
      '@@index([senderPhone])',
      // UC10, UC16, UC20, UC21: Hub & Order status
      '@@index([currentHubId, currentStatus])',
      // UC16: Geographic clustering for dispatching
      '@@index([currentHubId, receiverDistrict, receiverWard])',
      // UC17: Shipper delivery screen
      '@@index([assignedShipperId, currentStatus])',
      // UC22: COD settlement calculation
      '@@index([assignedShipperId, currentStatus, paymentStatus])',
      // UC10: Order created timestamp sort
      '@@index([createdAt(sort: Desc)])',
      // UC11, UC23: Order status timeline
      '@@index([orderId, createdAt(sort: Desc)])',
      // UC22: COD settlement lookups
      '@@index([hubId, status])',
      '@@index([shipperId, status])',
    ];

    for (const idx of requiredIndexes) {
      assert.equal(
        schemaContent.includes(idx),
        true,
        `Prisma schema thiếu chỉ mục tối ưu hóa: ${idx}`
      );
    }
  });

  test('Prisma Client: client.ts exports singleton instance properly', async () => {
    const clientFilePath = path.join(ROOT_DIR, 'src/infrastructure/database/prisma/client.ts');
    assert.equal(fs.existsSync(clientFilePath), true);

    const clientContent = fs.readFileSync(clientFilePath, 'utf-8');
    assert.equal(clientContent.includes('export const prisma'), true);
    assert.equal(clientContent.includes('globalThis.prismaGlobal'), true);
  });
});
