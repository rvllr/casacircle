import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const today = new Date().toISOString().split("T")[0];

    // Find approved bookings where start_date has passed and payment is overdue
    const { data: overdueBookings, error: bookingsError } = await supabase
      .from("bookings")
      .select("id, start_date, end_date, user_id, house_id, total_price, amount_paid, payment_status, houses(name)")
      .in("payment_status", ["unpaid", "partial"])
      .eq("status", "approved")
      .lte("start_date", today);

    if (bookingsError) {
      throw bookingsError;
    }

    if (!overdueBookings || overdueBookings.length === 0) {
      return new Response(
        JSON.stringify({ message: "No overdue payments found", count: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check which bookings already have a recent notification (last 24h) to avoid spam
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    let notificationsSent = 0;

    for (const booking of overdueBookings) {
      // Check if a notification was already sent recently for this booking
      const { data: existingNotif } = await supabase
        .from("notifications")
        .select("id")
        .eq("user_id", booking.user_id)
        .eq("type", "payment_overdue")
        .gte("created_at", oneDayAgo)
        .contains("metadata", { booking_id: booking.id })
        .limit(1);

      if (existingNotif && existingNotif.length > 0) {
        continue; // Already notified recently
      }

      const houseName = (booking.houses as any)?.name || "la maison";
      const remaining = (Number(booking.total_price) || 0) - (Number(booking.amount_paid) || 0);
      const statusLabel = booking.payment_status === "unpaid" ? "impayée" : "partiellement payée";

      const title = "Paiement en retard";
      const body = `Votre réservation pour ${houseName} (${booking.start_date} → ${booking.end_date}) est ${statusLabel}. Reste dû : ${remaining.toFixed(2)} €.`;

      const { error: insertError } = await supabase
        .from("notifications")
        .insert({
          user_id: booking.user_id,
          house_id: booking.house_id,
          type: "payment_overdue",
          title,
          body,
          metadata: { booking_id: booking.id, remaining_amount: remaining },
        });

      if (!insertError) {
        notificationsSent++;
      }

      // Also notify house admins
      const { data: admins } = await supabase
        .from("house_members")
        .select("user_id")
        .eq("house_id", booking.house_id)
        .in("role", ["admin", "owner"]);

      if (admins) {
        // Get booker name
        const { data: profile } = await supabase
          .from("users_profiles")
          .select("first_name, last_name")
          .eq("user_id", booking.user_id)
          .maybeSingle();

        const bookerName = profile?.first_name
          ? `${profile.first_name} ${profile.last_name || ""}`.trim()
          : "Un membre";

        for (const admin of admins) {
          if (admin.user_id === booking.user_id) continue;

          const { data: existingAdminNotif } = await supabase
            .from("notifications")
            .select("id")
            .eq("user_id", admin.user_id)
            .eq("type", "payment_overdue_admin")
            .gte("created_at", oneDayAgo)
            .contains("metadata", { booking_id: booking.id })
            .limit(1);

          if (existingAdminNotif && existingAdminNotif.length > 0) continue;

          await supabase.from("notifications").insert({
            user_id: admin.user_id,
            house_id: booking.house_id,
            type: "payment_overdue_admin",
            title: "Paiement en retard",
            body: `${bookerName} a un paiement ${statusLabel} pour ${houseName} (${booking.start_date} → ${booking.end_date}). Reste dû : ${remaining.toFixed(2)} €.`,
            metadata: { booking_id: booking.id, remaining_amount: remaining },
          });
          notificationsSent++;
        }
      }
    }

    return new Response(
      JSON.stringify({ message: "Done", notifications_sent: notificationsSent }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
