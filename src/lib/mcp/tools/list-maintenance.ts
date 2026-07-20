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
  name: "list_maintenance_tickets",
  title: "Lister les tickets de maintenance",
  description: "List maintenance tickets visible to the signed-in user, optionally filtered by house or status.",
  inputSchema: {
    house_id: z.string().uuid().optional(),
    status: z.enum(["open", "in_progress", "resolved", "closed"]).optional(),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ house_id, status }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    let q = supabaseForUser(ctx)
      .from("maintenance_tickets")
      .select("id, house_id, title, description, status, priority, created_at")
      .order("created_at", { ascending: false })
      .limit(100);
    if (house_id) q = q.eq("house_id", house_id);
    if (status) q = q.eq("status", status);
    const { data, error } = await q;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data) }],
      structuredContent: { tickets: data ?? [] },
    };
  },
});
