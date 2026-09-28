/**
 * In-memory HTTP-ish client.
 *
 * The admin dashboard talks to its services through this thin layer so that
 * swapping the stub for a real HTTP client only requires implementing the
 * same interface. We intentionally introduce artificial delay to make the
 * loading states realistic in dev.
 */

import { generateRequestId } from '../utils/id';
import type {
  AdminApiFailure,
  AdminApiResult,
  AdminApiSuccess,
} from '../types/api.types';

export interface HttpRequest {
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  path: string;
  body?: unknown;
}

let simulatedLatencyMs = 120;

export function setSimulatedLatency(ms: number): void {
  simulatedLatencyMs = Math.max(0, Math.round(ms));
}

export function getSimulatedLatency(): number {
  return simulatedLatencyMs;
}

function delay(ms: number): Promise<void> {
  if (ms <= 0) return Promise.resolve();
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function runRequest<T>(
  handler: () => T | Promise<T>,
): Promise<AdminApiResult<T>> {
  await delay(simulatedLatencyMs);
  const timestamp = new Date().toISOString();
  const requestId = generateRequestId();
  try {
    const data = await handler();
    const result: AdminApiSuccess<T> = {
      status: 'success',
      data,
      requestId,
      timestamp,
    };
    return result;
  } catch (error) {
    const failure: AdminApiFailure = {
      status: 'failure',
      requestId,
      timestamp,
      error: {
        code: 'admin.stub.exception',
        message: error instanceof Error ? error.message : String(error),
      },
    };
    return failure;
  }
}

export function success<T>(data: T): AdminApiSuccess<T> {
  return {
    status: 'success',
    data,
    requestId: generateRequestId(),
    timestamp: new Date().toISOString(),
  };
}

export function failure(code: string, message: string, details?: Record<string, unknown>): AdminApiFailure {
  return {
    status: 'failure',
    requestId: generateRequestId(),
    timestamp: new Date().toISOString(),
    error: { code, message, details },
  };
}
