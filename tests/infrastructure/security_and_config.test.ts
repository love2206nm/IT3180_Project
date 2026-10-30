/**
 * @file security_and_config.test.ts
 * @description Unit tests kiểm tra tính hợp lệ của Module Cấu hình Environment (Fail-Fast Zod)
 * và Dịch vụ Quản lý Token / Chống Brute-Force (JwtAuthTokenService).
 */

import { test, describe, after } from 'node:test';
import assert from 'node:assert/strict';
import { env } from '../../src/infrastructure/config/env';
import { JwtAuthTokenService } from '../../src/infrastructure/security/jwt-auth-token.service';
import { USER_ROLE } from '../../src/domain/constants/roles.constant';

describe('Infrastructure Layer: Security & Configuration Integrity Suite', () => {
  const jwtService = new JwtAuthTokenService();

  after(() => {
    jwtService.destroy();
  });

  describe('Config Module (env.ts)', () => {
    test('env: successfully validates and loads environment variables', () => {
      assert.equal(typeof env.DATABASE_URL, 'string');
      assert.equal(typeof env.JWT_SECRET, 'string');
      assert.equal(env.JWT_SECRET.length >= 32, true);
      assert.equal(['development', 'test', 'production'].includes(env.NODE_ENV), true);
      assert.equal(typeof env.PORT, 'number');
    });
  });

  describe('JwtAuthTokenService (Token Lifecycle & Revocation)', () => {
    test('generateToken: automatically injects a unique jti identifier', () => {
      const payload = {
        userId: 'user-test-123',
        username: 'secure_shipper',
        role: USER_ROLE.SHIPPER,
        hubId: 'hub-01',
      };

      const token = jwtService.generateToken(payload);
      assert.equal(typeof token, 'string');

      const verified = jwtService.verifyToken(token);
      assert.notEqual(verified, null);
      assert.equal(verified!.userId, 'user-test-123');
      assert.equal(typeof verified!.jti, 'string');
      assert.equal(verified!.jti!.length > 10, true);
    });

    test('revokeToken: revokes token by jti and prevents further verification', async () => {
      const payload = {
        userId: 'user-logout-456',
        username: 'logged_out_user',
        role: USER_ROLE.HUB_STAFF,
        hubId: 'hub-02',
      };

      const token = jwtService.generateToken(payload);
      const verifiedBefore = jwtService.verifyToken(token);
      assert.notEqual(verifiedBefore, null);

      await jwtService.revokeToken(token);

      const isRevoked = await jwtService.isTokenRevoked(token);
      assert.equal(isRevoked, true);

      const verifiedAfter = jwtService.verifyToken(token);
      assert.equal(verifiedAfter, null);
    });
  });

  describe('JwtAuthTokenService (Brute-Force & Lockout Protection)', () => {
    test('recordFailedLogin & checkLoginLockout: temporarily locks account after 5 failed attempts', async () => {
      const targetUser = 'attacker_account_test';

      await jwtService.resetLoginAttempts(targetUser);

      // 4 lần đầu không khóa
      for (let i = 1; i <= 4; i++) {
        const status = await jwtService.recordFailedLogin(targetUser);
        assert.equal(status.isLocked, false);
      }

      // Lần thứ 5: Khóa 15 phút
      const lockedStatus = await jwtService.recordFailedLogin(targetUser);
      assert.equal(lockedStatus.isLocked, true);
      assert.equal(lockedStatus.remainingMinutes, 15);

      // Kiểm tra trạng thái khóa
      const currentCheck = await jwtService.checkLoginLockout(targetUser);
      assert.equal(currentCheck.isLocked, true);
      assert.equal(currentCheck.remainingMinutes! > 0, true);

      // Đăng nhập thành công -> Reset
      await jwtService.resetLoginAttempts(targetUser);
      const afterReset = await jwtService.checkLoginLockout(targetUser);
      assert.equal(afterReset.isLocked, false);
    });
  });
});
