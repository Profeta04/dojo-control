import { supabase } from "@/integrations/supabase/client";

export interface Announcement {
  id: string;
  dojo_id: string;
  created_by: string;
  title: string;
  content: string;
  image_url: string | null;
  file_url: string | null;
  is_urgent: boolean;
  is_pinned: boolean;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
  author_name?: string;
}

export async function fetchAnnouncements(dojoId: string): Promise<Announcement[]> {
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("announcements")
    .select("*")
    .eq("dojo_id", dojoId)
    .or(`expires_at.is.null,expires_at.gt.${now}`)
    .order("is_pinned", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) throw error;

  // Fetch author names
  const userIds = [...new Set((data || []).map((a: any) => a.created_by))];
  if (userIds.length === 0) return (data || []) as Announcement[];

  const { data: profiles } = await supabase
    .from("profiles")
    .select("user_id, name")
    .in("user_id", userIds);

  const nameMap = new Map((profiles || []).map((p: any) => [p.user_id, p.name]));

  return (data || []).map((a: any) => ({
    ...a,
    author_name: nameMap.get(a.created_by) || "Desconhecido",
  })) as Announcement[];
}

export async function createAnnouncement(
  announcement: {
    dojo_id: string;
    created_by: string;
    title: string;
    content: string;
    image_url?: string | null;
    is_urgent?: boolean;
    is_pinned?: boolean;
    expires_at?: string | null;
  }
) {
  const { data, error } = await supabase
    .from("announcements")
    .insert(announcement)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateAnnouncement(
  id: string,
  updates: Partial<{
    title: string;
    content: string;
    image_url: string | null;
    is_urgent: boolean;
    is_pinned: boolean;
    expires_at: string | null;
  }>
) {
  const { data, error } = await supabase
    .from("announcements")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteAnnouncement(id: string) {
  const { error } = await supabase
    .from("announcements")
    .delete()
    .eq("id", id);

  if (error) throw error;
}

export async function uploadAnnouncementImage(file: File): Promise<string> {
  const ext = file.name.split(".").pop();
  const path = `${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage
    .from("announcement-images")
    .upload(path, file, { upsert: true });

  if (error) throw error;

  const { data } = supabase.storage
    .from("announcement-images")
    .getPublicUrl(path);

  return data.publicUrl;
}

export async function notifyDojoStudents(dojoId: string, title: string, message: string) {
  // Get all students in this dojo
  const { data: students } = await supabase
    .from("profiles")
    .select("user_id")
    .eq("dojo_id", dojoId)
    .eq("registration_status", "aprovado");

  if (!students || students.length === 0) return;

  // Insert in-app notifications
  const notifications = students.map((s: any) => ({
    user_id: s.user_id,
    title,
    message,
    type: "announcement",
  }));

  await supabase.from("notifications").insert(notifications);

  // Send push notifications
  const { data: subscriptions } = await supabase
    .from("push_subscriptions")
    .select("*")
    .in("user_id", students.map((s: any) => s.user_id));

  if (subscriptions && subscriptions.length > 0) {
    await supabase.functions.invoke("send-push-notification", {
      body: {
        subscriptions: subscriptions.map((sub: any) => ({
          endpoint: sub.endpoint,
          keys: { p256dh: sub.p256dh, auth: sub.auth_key },
        })),
        title,
        body: message,
      },
    });
  }
}
