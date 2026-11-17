import { getSupabaseClient } from '@/lib/supabase/client'

export async function markNotificationRead(id: string) {
  const supabase = getSupabaseClient()
  const { error } = await supabase.from('notifications').update({ read: true }).eq('id', id)
  if (error) throw new Error(error.message)
}

export async function markAllNotificationsRead(userId: string) {
  const supabase = getSupabaseClient()
  const { error } = await supabase.from('notifications').update({ read: true }).eq('user_id', userId)
  if (error) throw new Error(error.message)
}