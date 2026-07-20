import { createClient } from "@supabase/supabase-js";
import { defineTool, type ToolContext } from "@lovable.dev/mcp-js";
import { z } from "zod";

function supabaseForUser(ctx: ToolContext) {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
    global: { headers: { Authorization: `Bearer ${ctx.getToken()}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export default defineTool({
  name: "list_bookings",
  title: "Lister les réservations",
  description:
    "List bookings visible to the signed-in user. Optionally filter by house_id, status, or date range.",
  inputSchema: {
    house_id: z.string().uuid().optional().describe("Filter to a specific house."),
    status: z
      .enum(["pending", "approved", "refused", "cancelled"])
      .optional()
      .describe("Filter by booking status."),
    from: z.string().optional().describe("ISO date; only bookings ending on/after this date."),
    to: z.string().optional().describe("ISO date; only bookings starting on/before this date."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ house_id, status, from, to }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    let q = supabaseForUser(ctx)
      .from("bookings")
      .select("id, house_id, user_id, start_date, end_date, status, created_at")
      .order("start_date", { ascending: false })
      .limit(100);
    if (house_id) q = q.eq("house_id", house_id);
    if (status) q = q.eq("status", status);
    if (from) q = q.gte("end_date", from);
    if (to) q = q.lte("start_date", to);
    const { data, error } = await q;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data) }],
      structuredContent: { bookings: data ?? [] },
    };
  },
});
