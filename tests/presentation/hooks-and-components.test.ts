/**
 * @file hooks-and-components.test.ts
 * @description Unit Test Suite kiểm tra tính toàn vẹn và hợp lệ của Presentation Hooks & Components.
 * @module tests/presentation
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import * as PresentationModule from '../../src/presentation/index';
import * as HooksModule from '../../src/presentation/hooks/index';
import * as ComponentsModule from '../../src/presentation/components/index';
import { maskReceiverName } from '../../src/application/use-cases/orders/get-public-tracking.use-case';
import { ORDER_STATUS } from '../../src/domain/constants/order-status.constant';
import { USER_ROLE } from '../../src/domain/constants/roles.constant';
import { USER_STATUS } from '../../src/domain/constants/user-status.constant';
import { COD_SETTLEMENT_STATUS } from '../../src/domain/constants/cod-status.constant';

describe('Presentation Layer: Hooks & Components Module Integrity Test', () => {
  it('PresentationModule correctly exports hooks, components and actions', () => {
    // Kiểm tra exports hooks
    assert.ok(typeof HooksModule.useServerAction === 'function');
    assert.ok(typeof HooksModule.useAudioFeedback === 'function');
    assert.ok(typeof HooksModule.useBarcodeScanner === 'function');
    assert.ok(typeof HooksModule.useDebounce === 'function');
    assert.ok(typeof HooksModule.useGeolocation === 'function');

    // Kiểm tra exports components
    assert.ok(typeof ComponentsModule.OrderTimeline === 'function');
    assert.ok(typeof ComponentsModule.OrderActionControls === 'function');
    assert.ok(typeof ComponentsModule.BarcodeScannerBox === 'function');
    assert.ok(typeof ComponentsModule.PODCaptureDialog === 'function');
    assert.ok(typeof ComponentsModule.FailedAttemptDialog === 'function');
    assert.ok(typeof ComponentsModule.CODSettlementReviewDialog === 'function');
    assert.ok(typeof ComponentsModule.StaffFormDialog === 'function');

    // Kiểm tra UI primitives (React Component / ForwardRef)
    assert.ok(Boolean(ComponentsModule.Button));
    assert.ok(Boolean(ComponentsModule.Card));
    assert.ok(Boolean(ComponentsModule.Dialog));
    assert.ok(Boolean(ComponentsModule.Input));
    assert.ok(Boolean(ComponentsModule.OrderStatusBadge));
    assert.ok(Boolean(ComponentsModule.RoleBadge));
    assert.ok(Boolean(ComponentsModule.UserStatusBadge));
    assert.ok(Boolean(ComponentsModule.CODSettlementBadge));
  });

  it('maskReceiverName: masks recipient full name safely against PII scraping', () => {
    assert.equal(maskReceiverName('Nguyễn'), 'N****n');
    assert.equal(maskReceiverName('Nguyễn Văn An'), 'N***** V** A*');
    assert.equal(maskReceiverName('Lê Thu Trang'), 'L* T** T***g');
    assert.equal(maskReceiverName(''), '***');
  });

  it('domain constants are rigorously exposed for UI badge mapping', () => {
    assert.ok(ORDER_STATUS.CREATED);
    assert.ok(ORDER_STATUS.AT_HUB);
    assert.ok(ORDER_STATUS.OUT_FOR_DELIVERY);
    assert.ok(ORDER_STATUS.DELIVERED);
    assert.ok(ORDER_STATUS.FAILED_ATTEMPT);
    assert.ok(ORDER_STATUS.RETURN_PENDING);
    assert.ok(ORDER_STATUS.RETURNED);
    assert.ok(ORDER_STATUS.CANCELLED);

    assert.ok(USER_ROLE.ADMIN);
    assert.ok(USER_ROLE.HUB_MANAGER);
    assert.ok(USER_ROLE.HUB_STAFF);
    assert.ok(USER_ROLE.SHIPPER);

    assert.ok(USER_STATUS.ACTIVE);
    assert.ok(USER_STATUS.LOCKED);

    assert.ok(COD_SETTLEMENT_STATUS.PENDING);
    assert.ok(COD_SETTLEMENT_STATUS.CONFIRMED);
    assert.ok(COD_SETTLEMENT_STATUS.REJECTED);
  });
});
