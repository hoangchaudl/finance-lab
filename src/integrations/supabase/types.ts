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
      agent_api_tokens: {
        Row: {
          created_at: string | null
          id: string
          is_active: boolean | null
          label: string | null
          last_used_at: string | null
          token_hash: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          label?: string | null
          last_used_at?: string | null
          token_hash: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          label?: string | null
          last_used_at?: string | null
          token_hash?: string
          user_id?: string
        }
        Relationships: []
      }
      assets: {
        Row: {
          created_at: string
          emoji: string
          id: string
          name: string
          user_id: string
          value: number
        }
        Insert: {
          created_at?: string
          emoji?: string
          id?: string
          name: string
          user_id: string
          value?: number
        }
        Update: {
          created_at?: string
          emoji?: string
          id?: string
          name?: string
          user_id?: string
          value?: number
        }
        Relationships: []
      }
      categories: {
        Row: {
          created_at: string
          emoji: string
          id: string
          name: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          emoji?: string
          id?: string
          name: string
          type: string
          user_id: string
        }
        Update: {
          created_at?: string
          emoji?: string
          id?: string
          name?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      category_allocations: {
        Row: {
          category_id: string
          id: string
          percentage: number
          user_id: string
        }
        Insert: {
          category_id: string
          id?: string
          percentage?: number
          user_id: string
        }
        Update: {
          category_id?: string
          id?: string
          percentage?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "category_allocations_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      goals: {
        Row: {
          created_at: string
          current: number
          id: string
          name: string
          target: number
          user_id: string
        }
        Insert: {
          created_at?: string
          current?: number
          id?: string
          name: string
          target?: number
          user_id: string
        }
        Update: {
          created_at?: string
          current?: number
          id?: string
          name?: string
          target?: number
          user_id?: string
        }
        Relationships: []
      }
      monthly_plans: {
        Row: {
          category_id: string
          id: string
          month_key: string
          planned: number
          user_id: string
        }
        Insert: {
          category_id: string
          id?: string
          month_key: string
          planned?: number
          user_id: string
        }
        Update: {
          category_id?: string
          id?: string
          month_key?: string
          planned?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "monthly_plans_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      portfolio_entries: {
        Row: {
          account: string
          created_at: string
          current_price: number
          id: string
          name: string
          notes: string | null
          purchase_price: number
          quantity: number
          tier: string | null
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          account?: string
          created_at?: string
          current_price?: number
          id?: string
          name: string
          notes?: string | null
          purchase_price?: number
          quantity?: number
          tier?: string | null
          type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          account?: string
          created_at?: string
          current_price?: number
          id?: string
          name?: string
          notes?: string | null
          purchase_price?: number
          quantity?: number
          tier?: string | null
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          birth_year: number
          created_at: string
          essentials_pct: number
          id: string
          inflation_rate: number
          lifestyle_pct: number
          monthly_expenses: number
          return_rate: number
          savings_pct: number
          updated_at: string
        }
        Insert: {
          birth_year?: number
          created_at?: string
          essentials_pct?: number
          id: string
          inflation_rate?: number
          lifestyle_pct?: number
          monthly_expenses?: number
          return_rate?: number
          savings_pct?: number
          updated_at?: string
        }
        Update: {
          birth_year?: number
          created_at?: string
          essentials_pct?: number
          id?: string
          inflation_rate?: number
          lifestyle_pct?: number
          monthly_expenses?: number
          return_rate?: number
          savings_pct?: number
          updated_at?: string
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          amount: number
          created_at: string
          due_day: number
          id: string
          name: string
          user_id: string
        }
        Insert: {
          amount?: number
          created_at?: string
          due_day?: number
          id?: string
          name: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          due_day?: number
          id?: string
          name?: string
          user_id?: string
        }
        Relationships: []
      }
      telegram_bot_logs: {
        Row: {
          created_at: string
          id: string
          parsed: Json | null
          raw_text: string | null
          status: string
          telegram_chat_id: number | null
        }
        Insert: {
          created_at?: string
          id?: string
          parsed?: Json | null
          raw_text?: string | null
          status?: string
          telegram_chat_id?: number | null
        }
        Update: {
          created_at?: string
          id?: string
          parsed?: Json | null
          raw_text?: string | null
          status?: string
          telegram_chat_id?: number | null
        }
        Relationships: []
      }
      telegram_links: {
        Row: {
          created_at: string
          link_code: string | null
          linked_at: string | null
          pending: Json | null
          telegram_chat_id: number | null
          user_id: string
        }
        Insert: {
          created_at?: string
          link_code?: string | null
          linked_at?: string | null
          pending?: Json | null
          telegram_chat_id?: number | null
          user_id: string
        }
        Update: {
          created_at?: string
          link_code?: string | null
          linked_at?: string | null
          pending?: Json | null
          telegram_chat_id?: number | null
          user_id?: string
        }
        Relationships: []
      }
      transactions: {
        Row: {
          amount: number
          category_id: string | null
          created_at: string
          date: string
          id: string
          note: string | null
          portfolio_entry_id: string | null
          quality: string | null
          quantity: number | null
          realized_gain: number | null
          type: string
          user_id: string
        }
        Insert: {
          amount: number
          category_id?: string | null
          created_at?: string
          date: string
          id?: string
          note?: string | null
          portfolio_entry_id?: string | null
          quality?: string | null
          quantity?: number | null
          realized_gain?: number | null
          type: string
          user_id: string
        }
        Update: {
          amount?: number
          category_id?: string | null
          created_at?: string
          date?: string
          id?: string
          note?: string | null
          portfolio_entry_id?: string | null
          quality?: string | null
          quantity?: number | null
          realized_gain?: number | null
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transactions_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_portfolio_entry_id_fkey"
            columns: ["portfolio_entry_id"]
            isOneToOne: false
            referencedRelation: "portfolio_entries"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
