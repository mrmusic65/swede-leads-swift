export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      alert_runs: {
        Row: {
          created_at: string
          id: string
          matched_count: number
          run_timestamp: string
          watchlist_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          matched_count?: number
          run_timestamp?: string
          watchlist_id: string
        }
        Update: {
          created_at?: string
          id?: string
          matched_count?: number
          run_timestamp?: string
          watchlist_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "alert_runs_watchlist_id_fkey"
            columns: ["watchlist_id"]
            isOneToOne: false
            referencedRelation: "saved_watchlists"
            referencedColumns: ["id"]
          },
        ]
      }
      companies: {
        Row: {
          address: string | null
          city: string | null
          company_age_days: number | null
          company_form: string | null
          company_name: string
          county: string | null
          created_at: string
          employees_estimate: string | null
          employer_registered: boolean | null
          f_tax_registered: boolean | null
          id: string
          industry_group: string | null
          industry_label: string | null
          last_address_change_date: string | null
          municipality: string | null
          org_number: string | null
          phone_number: string | null
          phone_status: Database["public"]["Enums"]["phone_status"]
          postal_code: string | null
          registration_date: string | null
          sni_code: string | null
          source_primary: string | null
          source_provider: string | null
          updated_at: string
          vat_registered: boolean | null
          website_status: Database["public"]["Enums"]["website_status"]
          website_url: string | null
        }
        Insert: {
          address?: string | null
          city?: string | null
          company_age_days?: number | null
          company_form?: string | null
          company_name: string
          county?: string | null
          created_at?: string
          employees_estimate?: string | null
          employer_registered?: boolean | null
          f_tax_registered?: boolean | null
          id?: string
          industry_group?: string | null
          industry_label?: string | null
          last_address_change_date?: string | null
          municipality?: string | null
          org_number?: string | null
          phone_number?: string | null
          phone_status?: Database["public"]["Enums"]["phone_status"]
          postal_code?: string | null
          registration_date?: string | null
          sni_code?: string | null
          source_primary?: string | null
          source_provider?: string | null
          updated_at?: string
          vat_registered?: boolean | null
          website_status?: Database["public"]["Enums"]["website_status"]
          website_url?: string | null
        }
        Update: {
          address?: string | null
          city?: string | null
          company_age_days?: number | null
          company_form?: string | null
          company_name?: string
          county?: string | null
          created_at?: string
          employees_estimate?: string | null
          employer_registered?: boolean | null
          f_tax_registered?: boolean | null
          id?: string
          industry_group?: string | null
          industry_label?: string | null
          last_address_change_date?: string | null
          municipality?: string | null
          org_number?: string | null
          phone_number?: string | null
          phone_status?: Database["public"]["Enums"]["phone_status"]
          postal_code?: string | null
          registration_date?: string | null
          sni_code?: string | null
          source_primary?: string | null
          source_provider?: string | null
          updated_at?: string
          vat_registered?: boolean | null
          website_status?: Database["public"]["Enums"]["website_status"]
          website_url?: string | null
        }
        Relationships: []
      }
      company_events: {
        Row: {
          company_id: string
          created_at: string
          event_date: string
          event_label: string | null
          event_payload: Json | null
          event_source: string | null
          event_type: Database["public"]["Enums"]["company_event_type"]
          id: string
        }
        Insert: {
          company_id: string
          created_at?: string
          event_date?: string
          event_label?: string | null
          event_payload?: Json | null
          event_source?: string | null
          event_type: Database["public"]["Enums"]["company_event_type"]
          id?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          event_date?: string
          event_label?: string | null
          event_payload?: Json | null
          event_source?: string | null
          event_type?: Database["public"]["Enums"]["company_event_type"]
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_events_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      contact_messages: {
        Row: {
          created_at: string
          email: string
          id: string
          message: string
          name: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          message: string
          name: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          message?: string
          name?: string
        }
        Relationships: []
      }
      imports: {
        Row: {
          created_at: string
          duplicate_rows: number | null
          error_message: string | null
          fetched_rows: number | null
          file_name: string
          id: string
          imported_rows: number | null
          skipped_rows: number | null
          source_name: string | null
          status: Database["public"]["Enums"]["import_status"]
          user_id: string
        }
        Insert: {
          created_at?: string
          duplicate_rows?: number | null
          error_message?: string | null
          fetched_rows?: number | null
          file_name: string
          id?: string
          imported_rows?: number | null
          skipped_rows?: number | null
          source_name?: string | null
          status?: Database["public"]["Enums"]["import_status"]
          user_id: string
        }
        Update: {
          created_at?: string
          duplicate_rows?: number | null
          error_message?: string | null
          fetched_rows?: number | null
          file_name?: string
          id?: string
          imported_rows?: number | null
          skipped_rows?: number | null
          source_name?: string | null
          status?: Database["public"]["Enums"]["import_status"]
          user_id?: string
        }
        Relationships: []
      }
      notes: {
        Row: {
          company_id: string
          created_at: string
          id: string
          note_text: string
          user_id: string
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          note_text: string
          user_id: string
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          note_text?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notes_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          stripe_customer_id: string | null
        }
        Insert: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          stripe_customer_id?: string | null
        }
        Update: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          stripe_customer_id?: string | null
        }
        Relationships: []
      }
      saved_filters: {
        Row: {
          created_at: string
          filter_json: Json
          id: string
          name: string
          user_id: string
        }
        Insert: {
          created_at?: string
          filter_json?: Json
          id?: string
          name: string
          user_id: string
        }
        Update: {
          created_at?: string
          filter_json?: Json
          id?: string
          name?: string
          user_id?: string
        }
        Relationships: []
      }
      saved_watchlists: {
        Row: {
          created_at: string
          filters_json: Json
          id: string
          name: string
          user_id: string
        }
        Insert: {
          created_at?: string
          filters_json?: Json
          id?: string
          name: string
          user_id: string
        }
        Update: {
          created_at?: string
          filters_json?: Json
          id?: string
          name?: string
          user_id?: string
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          cancel_at_period_end: boolean
          created_at: string
          current_period_end: string | null
          current_period_start: string | null
          id: string
          plan_tier: string
          status: string
          stripe_price_id: string | null
          stripe_subscription_id: string | null
          trial_end: string | null
          user_id: string
        }
        Insert: {
          cancel_at_period_end?: boolean
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          plan_tier?: string
          status?: string
          stripe_price_id?: string | null
          stripe_subscription_id?: string | null
          trial_end?: string | null
          user_id: string
        }
        Update: {
          cancel_at_period_end?: boolean
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          plan_tier?: string
          status?: string
          stripe_price_id?: string | null
          stripe_subscription_id?: string | null
          trial_end?: string | null
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      company_event_type:
        | "company_registered"
        | "vat_registered"
        | "f_tax_registered"
        | "employer_registered"
        | "address_changed"
        | "industry_changed"
        | "employee_count_updated"
      import_status: "pending" | "processing" | "completed" | "failed"
      phone_status: "has_phone" | "missing" | "unknown"
      website_status:
        | "has_website"
        | "social_only"
        | "no_website_found"
        | "unknown"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      company_event_type: [
        "company_registered",
        "vat_registered",
        "f_tax_registered",
        "employer_registered",
        "address_changed",
        "industry_changed",
        "employee_count_updated",
      ],
      import_status: ["pending", "processing", "completed", "failed"],
      phone_status: ["has_phone", "missing", "unknown"],
      website_status: [
        "has_website",
        "social_only",
        "no_website_found",
        "unknown",
      ],
    },
  },
} as const
