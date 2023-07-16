import { NextFetchEvent, NextRequest, NextResponse } from "next/server";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(5, "10 s"),
});

export default async function middleware(
  request: NextRequest,
  event: NextFetchEvent
): Promise<Response | undefined> {
  const ip = request.headers.get("x-forwarded-for") ?? request.ip ?? "";
  const { success, pending, limit, reset, remaining } = await ratelimit.limit(
    ip
  );

  if (!success) {
    const now = Date.now();
    const retryAfter = Math.floor((reset - now) / 1000);
    return NextResponse.json(
      {
        errorMessage: "Blocked due to too many requests",
      },
      {
        status: 429,
        statusText: "Too Many Requests",
        headers: {
          ["retry-after"]: `${retryAfter}`,
        },
      }
    );
  }

  return NextResponse.next();
}

export const config = {
  matcher: "/api/:path*",
};
