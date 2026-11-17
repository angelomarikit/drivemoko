/**
 * Minimal public schema types for Phase 2 auth.
 * Replace with `supabase gen types typescript` once the full schema is stable.
 */
export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          role: 'admin' | 'owner' | 'partner' | 'customer'
          full_name: string
          email: string
          phone: string
          address: string
          title: string
          status: 'active' | 'suspended'
          license_number: string | null
          emergency_name: string | null
          emergency_phone: string | null
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: Partial<Database['public']['Tables']['profiles']['Row']> & { id: string }
        Update: Partial<Database['public']['Tables']['profiles']['Row']>
      }
      partner_profiles: {
        Row: {
          profile_id: string
          share_rate_bps: number
          agreement_signed_at: string | null
          created_at: string
        }
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: {
      app_role: 'admin' | 'owner' | 'partner' | 'customer'
      account_status: 'active' | 'suspended'
    }
  }
}