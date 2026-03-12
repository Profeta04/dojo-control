import {
  createHandler, verifyAuth, getServiceClient,
  jsonResponse, safeLog,
} from "../_shared/validation.ts";

/**
 * Cleanup old notifications (>30 days) and stale push subscriptions.
 * Designed to run as a daily cron job.
 */
Deno.serve(createHandler(async (req) => {
  const auth = await verifyAuth(req);
  if (auth instanceof Response) return auth;

  const supabaseAdmin = getServiceClient();

  // Delete read notifications older than 30 days
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const cutoffDate = thirtyDaysAgo.toISOString();

  const { count: deletedRead } = await supabaseAdmin
    .from("notifications")
    .delete({ count: "exact" })
    .eq("read", true)
    .lt("created_at", cutoffDate);

  // Delete unread notifications older than 60 days
  const sixtyDaysAgo = new Date();
  sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);
  const cutoffDateUnread = sixtyDaysAgo.toISOString();

  const { count: deletedUnread } = await supabaseAdmin
    .from("notifications")
    .delete({ count: "exact" })
    .eq("read", false)
    .lt("created_at", cutoffDateUnread);

  // Delete push subscriptions not updated in 90 days (likely stale)
  const ninetyDaysAgo = new Date();
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
  const staleCutoff = ninetyDaysAgo.toISOString();

  const { count: deletedSubs } = await supabaseAdmin
    .from("push_subscriptions")
    .delete({ count: "exact" })
    .lt("updated_at", staleCutoff);

  safeLog("CLEANUP_NOTIFICATIONS", {
    deletedRead: deletedRead || 0,
    deletedUnread: deletedUnread || 0,
    deletedStaleSubs: deletedSubs || 0,
  });

  return jsonResponse({
    deletedRead: deletedRead || 0,
    deletedUnread: deletedUnread || 0,
    deletedStaleSubs: deletedSubs || 0,
  });
}, { rateLimit: false }));
