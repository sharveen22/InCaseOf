import crypto from "crypto";
import type { NextRequest } from "next/server";

const WINDOW_SECONDS = 15 * 60;
const MAX_FAILURES_PER_IP = 10;
const MAX_FAILURES_PER_FOLDER = 50;

type RedisValue = string | number | null;

interface LimitResult {
  limited: boolean;
  retryAfterSeconds?: number;
}

function isConfigured(): boolean {
  return Boolean(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN);
}

function hash(value: string): string {
  return crypto.createHash("sha256").update(value).digest("base64url").slice(0, 24);
}

function clientIp(request: NextRequest): string {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) return forwardedFor.split(",")[0].trim();

  return (
    request.headers.get("x-real-ip") ||
    request.headers.get("cf-connecting-ip") ||
    "unknown"
  );
}

function keys(folderId: string, request: NextRequest) {
  const folderHash = hash(folderId);
  const ipHash = hash(clientIp(request));
  return {
    ip: `rl:shared-view:${folderHash}:ip:${ipHash}`,
    folder: `rl:shared-view:${folderHash}:folder`,
  };
}

async function redisCommand<T = unknown>(command: RedisValue[]): Promise<T> {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) throw new Error("rate_limit_not_configured");

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(command),
    cache: "no-store",
  });

  const json = (await res.json()) as { result?: T; error?: string };
  if (!res.ok || json.error) {
    throw new Error(json.error || `Redis command failed (${res.status})`);
  }

  return json.result as T;
}

function count(value: RedisValue): number {
  if (typeof value === "number") return value;
  if (typeof value === "string") return Number.parseInt(value, 10) || 0;
  return 0;
}

export async function checkSharedViewLimit(
  folderId: string,
  request: NextRequest
): Promise<LimitResult> {
  if (!isConfigured()) return { limited: false };

  try {
    const rateKeys = keys(folderId, request);
    const [ipCount, folderCount] = await redisCommand<RedisValue[]>([
      "MGET",
      rateKeys.ip,
      rateKeys.folder,
    ]);

    if (count(ipCount) >= MAX_FAILURES_PER_IP || count(folderCount) >= MAX_FAILURES_PER_FOLDER) {
      return { limited: true, retryAfterSeconds: WINDOW_SECONDS };
    }
  } catch (err) {
    console.warn("rate limit check failed:", err);
  }

  return { limited: false };
}

export async function recordSharedViewFailure(
  folderId: string,
  request: NextRequest
): Promise<void> {
  if (!isConfigured()) return;

  try {
    const rateKeys = keys(folderId, request);
    const [ipCount, folderCount] = await Promise.all([
      redisCommand<number>(["INCR", rateKeys.ip]),
      redisCommand<number>(["INCR", rateKeys.folder]),
    ]);

    await Promise.all([
      ipCount === 1 ? redisCommand<number>(["EXPIRE", rateKeys.ip, WINDOW_SECONDS]) : null,
      folderCount === 1 ? redisCommand<number>(["EXPIRE", rateKeys.folder, WINDOW_SECONDS]) : null,
    ]);
  } catch (err) {
    console.warn("rate limit failure record failed:", err);
  }
}

export async function clearSharedViewFailures(
  folderId: string,
  request: NextRequest
): Promise<void> {
  if (!isConfigured()) return;

  try {
    const rateKeys = keys(folderId, request);
    await redisCommand<number>(["DEL", rateKeys.ip, rateKeys.folder]);
  } catch (err) {
    console.warn("rate limit clear failed:", err);
  }
}
