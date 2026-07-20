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
  name: "create_booking",
  title: "Créer une réservation",
  description:
    "Request a booking on a house for the signed-in user. Status starts as 'pending' and awaits admin approval.",
  inputSchema: {
    house_id: z.string().uuid().describe("The house to book."),
    start_date: z.string().describe("Start date (YYYY-MM-DD)."),
    end_date: z.string().describe("End date (YYYY-MM-DD), exclusive check-out."),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  handler: async ({ house_id, start_date, end_date }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const { data, error } = await supabaseForUser(ctx)
      .from("bookings")
      .insert({ house_id, user_id: ctx.getUserId(), start_date, end_date, status: "pending" })
      .select()
      .single();
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: `Réservation créée (${data.id}) — en attente de validation.` }],
      structuredContent: { booking: data },
    };
  },
});
