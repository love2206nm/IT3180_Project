/**
 * @file route.ts
 * @description Healthcheck & Monitoring API Route (GET /api/health).
 * Dùng cho Docker Container Healthcheck, Kubernetes Liveness / Readiness Probes,
 * và công cụ giám sát Uptime bên ngoài (UptimeRobot, BetterUptime).
 * @module app/api/health
 */

import { NextResponse } from 'next/server';
import { appContainer } from '../../../infrastructure/di/container';

interface HealthCheckSuccessResponse {
  readonly status: 'ok';
  readonly uptime: number;
  readonly timestamp: string;
  readonly database: 'connected';
  readonly version: string;
}

interface HealthCheckFailureResponse {
  readonly status: 'error';
  readonly uptime: number;
  readonly timestamp: string;
  readonly database: 'disconnected';
  readonly version: string;
  readonly error: string;
}

type HealthCheckResponse = HealthCheckSuccessResponse | HealthCheckFailureResponse;

export const dynamic = 'force-dynamic';

/**
 * Xử lý yêu cầu kiểm tra sức khỏe hệ thống (Health Check Probe)
 *
 * @returns {Promise<NextResponse<HealthCheckResponse>>} Phản hồi HTTP 200 nếu toàn hệ thống khỏe mạnh, hoặc HTTP 503 nếu lỗi CSDL
 */
export async function GET(): Promise<NextResponse<HealthCheckResponse>> {
  const uptime: number = process.uptime();
  const timestamp: string = new Date().toISOString();
  const version: string = '1.0.0';

  try {
    const isDbConnected: boolean = await appContainer.checkHealth();

    if (!isDbConnected) {
      return NextResponse.json<HealthCheckFailureResponse>(
        {
          status: 'error',
          uptime,
          timestamp,
          database: 'disconnected',
          version,
          error: 'Database connection failed or unreachable',
        },
        { status: 503 }
      );
    }

    return NextResponse.json<HealthCheckSuccessResponse>(
      {
        status: 'ok',
        uptime,
        timestamp,
        database: 'connected',
        version,
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    // Ghi log chi tiết lỗi ra máy chủ phục vụ giám sát nội bộ, không serialize ra JSON phản hồi client
    console.error('[HEALTHCHECK_ERROR]', error);

    return NextResponse.json<HealthCheckFailureResponse>(
      {
        status: 'error',
        uptime,
        timestamp,
        database: 'disconnected',
        version,
        error: 'Database connection failed or unreachable',
      },
      { status: 503 }
    );
  }
}
