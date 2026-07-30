import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/require-role";
import { authErrorResponse } from "@/lib/api/route-auth";

const FALLBACK_EXCHANGE_RATES: Record<string, number> = {
  INR: 1.0,
  USD: 83.0,
  AED: 22.6,
  RM: 18.2,
  SGD: 62.5,
  AUD: 54.5,
};

export async function GET(req: Request) {
  try {
    // 1. Authorize session
    await requireRole(["admin", "employee"]);

    const url = new URL(req.url);
    const base = (url.searchParams.get("base") || "USD").toUpperCase();

    try {
      // Create an AbortController to safeguard against slow/unreachable external APIs
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 1500); // 1.5 seconds threshold

      // Fetch live rates from a fast, free, keyless, public Exchange Rate API
      const res = await fetch(`https://open.er-api.com/v6/latest/${base}`, {
        signal: controller.signal,
        next: { revalidate: 3600 }, // Cache on Next.js side for 1 hour
      });
      clearTimeout(timeoutId);

      if (!res.ok) {
        throw new Error(`Failed to fetch exchange rates: ${res.statusText}`);
      }

      const data = await res.json();
      if (data.result === "success" && data.rates) {
        return NextResponse.json({
          success: true,
          data: {
            source: "live",
            base,
            rates: data.rates,
          }
        });
      }
    } catch (fetchErr: any) {
      if (fetchErr?.name === "AbortError" || fetchErr?.code === 20) {
        console.warn(`[Forex Proxy] Connection timeout (1500ms) reached while fetching live exchange rates for ${base}. Falling back to offline rates.`);
      } else {
        const msg = fetchErr instanceof Error ? fetchErr.message : String(fetchErr);
        console.warn(`[Forex Proxy] Network fetch failed for ${base} (${msg}). Falling back to offline rates.`);
      }
    }

    // 2. Fallback to offline computed rates
    const baseInr = FALLBACK_EXCHANGE_RATES[base] || 83.0;
    const computedRates: Record<string, number> = {};

    Object.keys(FALLBACK_EXCHANGE_RATES).forEach((currency) => {
      const targetInr = FALLBACK_EXCHANGE_RATES[currency];
      // base -> target = baseInr / targetInr
      // Keep full precision for finance-grade stability, rounding only at persistence or display
      computedRates[currency] = baseInr / targetInr;
    });

    return NextResponse.json({
      success: true,
      data: {
        source: "fallback",
        base,
        rates: computedRates,
      }
    });
  } catch (error) {
    return authErrorResponse(error, "Failed to load exchange rates");
  }
}
