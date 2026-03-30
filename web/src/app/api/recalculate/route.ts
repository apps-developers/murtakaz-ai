import { NextResponse } from "next/server";
import { recalculateAllDerivedEntities } from "@/actions/entities";

/**
 * POST /api/recalculate
 * 
 * Recalculates all derived entity values (pillars, objectives, departments, initiatives)
 * Can be called by:
 * - Cron jobs (e.g., Vercel Cron, AWS EventBridge)
 * - Admin panel
 * - External systems with API key
 * 
 * Headers:
 * - Authorization: Bearer <CRON_SECRET> (optional, for cron job verification)
 */
export async function POST(request: Request) {
  // Verify cron secret if configured
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const authHeader = request.headers.get("Authorization");
    const token = authHeader?.replace("Bearer ", "");
    if (token !== cronSecret) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  try {
    const result = await recalculateAllDerivedEntities();
    
    if (!result.success) {
      return NextResponse.json(
        { error: "Recalculation failed" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      calculated: result.calculated,
      results: result.results,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[API] Recalculation failed:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/recalculate
 * 
 * Health check endpoint for cron job monitoring
 */
export async function GET() {
  return NextResponse.json({
    status: "ok",
    endpoint: "POST /api/recalculate to trigger recalculation",
    timestamp: new Date().toISOString(),
  });
}
