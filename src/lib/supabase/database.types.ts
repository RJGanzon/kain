export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      app_flags: {
        Row: {
          enabled: boolean
          key: string
        }
        Insert: {
          enabled?: boolean
          key: string
        }
        Update: {
          enabled?: boolean
          key?: string
        }
        Relationships: []
      }
      eatery_menu: {
        Row: {
          created_at: string
          extras: number
          id: string
          late_price: number | null
          order_g: number
          position: number
          price: number
          recipe_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          extras?: number
          id?: string
          late_price?: number | null
          order_g: number
          position?: number
          price: number
          recipe_id: string
          user_id?: string
        }
        Update: {
          created_at?: string
          extras?: number
          id?: string
          late_price?: number | null
          order_g?: number
          position?: number
          price?: number
          recipe_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "eatery_menu_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "recipes"
            referencedColumns: ["id"]
          },
        ]
      }
      family_settings: {
        Row: {
          adults: number
          budget_per_day: number
          days: number
          kids: number
          updated_at: string
          user_id: string
        }
        Insert: {
          adults: number
          budget_per_day: number
          days: number
          kids: number
          updated_at?: string
          user_id?: string
        }
        Update: {
          adults?: number
          budget_per_day?: number
          days?: number
          kids?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      ingredients: {
        Row: {
          aliases: string[]
          category: string
          edible_portion: number
          grams_per_unit: number
          id: string
          name: string
          nutrients: Json
          unit: Database["public"]["Enums"]["unit_t"]
        }
        Insert: {
          aliases?: string[]
          category: string
          edible_portion: number
          grams_per_unit: number
          id: string
          name: string
          nutrients: Json
          unit: Database["public"]["Enums"]["unit_t"]
        }
        Update: {
          aliases?: string[]
          category?: string
          edible_portion?: number
          grams_per_unit?: number
          id?: string
          name?: string
          nutrients?: Json
          unit?: Database["public"]["Enums"]["unit_t"]
        }
        Relationships: []
      }
      markets: {
        Row: {
          city: string
          id: string
          name: string
        }
        Insert: {
          city: string
          id: string
          name: string
        }
        Update: {
          city?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      pot_sales: {
        Row: {
          created_at: string
          id: string
          orders: number
          pot_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          orders: number
          pot_id: string
          user_id?: string
        }
        Update: {
          created_at?: string
          id?: string
          orders?: number
          pot_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pot_sales_pot_id_fkey"
            columns: ["pot_id"]
            isOneToOne: false
            referencedRelation: "pots"
            referencedColumns: ["id"]
          },
        ]
      }
      pots: {
        Row: {
          cooked_at: string
          cooked_kg: number
          date: string
          id: string
          menu_item_id: string
          user_id: string
        }
        Insert: {
          cooked_at?: string
          cooked_kg: number
          date?: string
          id?: string
          menu_item_id: string
          user_id?: string
        }
        Update: {
          cooked_at?: string
          cooked_kg?: number
          date?: string
          id?: string
          menu_item_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pots_menu_item_id_fkey"
            columns: ["menu_item_id"]
            isOneToOne: false
            referencedRelation: "eatery_menu"
            referencedColumns: ["id"]
          },
        ]
      }
      prices: {
        Row: {
          created_at: string
          id: string
          ingredient_id: string
          market_id: string | null
          observed_at: string
          price: number
          reported_by: string | null
          source_tier: Database["public"]["Enums"]["tier_t"]
          status: Database["public"]["Enums"]["price_status_t"]
        }
        Insert: {
          created_at?: string
          id?: string
          ingredient_id: string
          market_id?: string | null
          observed_at: string
          price: number
          reported_by?: string | null
          source_tier: Database["public"]["Enums"]["tier_t"]
          status?: Database["public"]["Enums"]["price_status_t"]
        }
        Update: {
          created_at?: string
          id?: string
          ingredient_id?: string
          market_id?: string | null
          observed_at?: string
          price?: number
          reported_by?: string | null
          source_tier?: Database["public"]["Enums"]["tier_t"]
          status?: Database["public"]["Enums"]["price_status_t"]
        }
        Relationships: [
          {
            foreignKeyName: "prices_ingredient_id_fkey"
            columns: ["ingredient_id"]
            isOneToOne: false
            referencedRelation: "current_prices"
            referencedColumns: ["ingredient_id"]
          },
          {
            foreignKeyName: "prices_ingredient_id_fkey"
            columns: ["ingredient_id"]
            isOneToOne: false
            referencedRelation: "ingredients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prices_market_id_fkey"
            columns: ["market_id"]
            isOneToOne: false
            referencedRelation: "current_prices"
            referencedColumns: ["market_id"]
          },
          {
            foreignKeyName: "prices_market_id_fkey"
            columns: ["market_id"]
            isOneToOne: false
            referencedRelation: "markets"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string | null
          id: string
          market_id: string
          plan: Database["public"]["Enums"]["plan_t"]
          role: Database["public"]["Enums"]["role_t"] | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          id: string
          market_id?: string
          plan?: Database["public"]["Enums"]["plan_t"]
          role?: Database["public"]["Enums"]["role_t"] | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_name?: string | null
          id?: string
          market_id?: string
          plan?: Database["public"]["Enums"]["plan_t"]
          role?: Database["public"]["Enums"]["role_t"] | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_market_id_fkey"
            columns: ["market_id"]
            isOneToOne: false
            referencedRelation: "current_prices"
            referencedColumns: ["market_id"]
          },
          {
            foreignKeyName: "profiles_market_id_fkey"
            columns: ["market_id"]
            isOneToOne: false
            referencedRelation: "markets"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_logs: {
        Row: {
          id: string
          ingredient_id: string
          logged_at: string
          market_id: string
          price_id: string | null
          qty: number
          status: Database["public"]["Enums"]["price_status_t"]
          total_price: number
          unit_price: number
          user_id: string
        }
        Insert: {
          id: string
          ingredient_id: string
          logged_at?: string
          market_id: string
          price_id?: string | null
          qty: number
          status: Database["public"]["Enums"]["price_status_t"]
          total_price: number
          unit_price: number
          user_id: string
        }
        Update: {
          id?: string
          ingredient_id?: string
          logged_at?: string
          market_id?: string
          price_id?: string | null
          qty?: number
          status?: Database["public"]["Enums"]["price_status_t"]
          total_price?: number
          unit_price?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "purchase_logs_ingredient_id_fkey"
            columns: ["ingredient_id"]
            isOneToOne: false
            referencedRelation: "current_prices"
            referencedColumns: ["ingredient_id"]
          },
          {
            foreignKeyName: "purchase_logs_ingredient_id_fkey"
            columns: ["ingredient_id"]
            isOneToOne: false
            referencedRelation: "ingredients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_logs_market_id_fkey"
            columns: ["market_id"]
            isOneToOne: false
            referencedRelation: "current_prices"
            referencedColumns: ["market_id"]
          },
          {
            foreignKeyName: "purchase_logs_market_id_fkey"
            columns: ["market_id"]
            isOneToOne: false
            referencedRelation: "markets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_logs_price_id_fkey"
            columns: ["price_id"]
            isOneToOne: false
            referencedRelation: "prices"
            referencedColumns: ["id"]
          },
        ]
      }
      recipe_items: {
        Row: {
          ingredient_id: string
          qty: number
          recipe_id: string
        }
        Insert: {
          ingredient_id: string
          qty: number
          recipe_id: string
        }
        Update: {
          ingredient_id?: string
          qty?: number
          recipe_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "recipe_items_ingredient_id_fkey"
            columns: ["ingredient_id"]
            isOneToOne: false
            referencedRelation: "current_prices"
            referencedColumns: ["ingredient_id"]
          },
          {
            foreignKeyName: "recipe_items_ingredient_id_fkey"
            columns: ["ingredient_id"]
            isOneToOne: false
            referencedRelation: "ingredients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recipe_items_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "recipes"
            referencedColumns: ["id"]
          },
        ]
      }
      recipes: {
        Row: {
          default_price: number | null
          id: string
          meal_type: Database["public"]["Enums"]["meal_t"]
          name: string
          order_g: number | null
          rice_g: number
        }
        Insert: {
          default_price?: number | null
          id: string
          meal_type: Database["public"]["Enums"]["meal_t"]
          name: string
          order_g?: number | null
          rice_g?: number
        }
        Update: {
          default_price?: number | null
          id?: string
          meal_type?: Database["public"]["Enums"]["meal_t"]
          name?: string
          order_g?: number | null
          rice_g?: number
        }
        Relationships: []
      }
    }
    Views: {
      current_prices: {
        Row: {
          ingredient_id: string | null
          market_id: string | null
          observed_at: string | null
          prev_observed_at: string | null
          prev_price: number | null
          price: number | null
          source_tier: Database["public"]["Enums"]["tier_t"] | null
        }
        Relationships: []
      }
    }
    Functions: {
      activate_business_demo: {
        Args: never
        Returns: Database["public"]["Enums"]["plan_t"]
      }
      reference_price: {
        Args: { p_ingredient: string; p_market: string }
        Returns: {
          observed_at: string
          price: number
          source_tier: Database["public"]["Enums"]["tier_t"]
        }[]
      }
      tier_rank: {
        Args: { t: Database["public"]["Enums"]["tier_t"] }
        Returns: number
      }
    }
    Enums: {
      meal_t: "breakfast" | "ulam"
      plan_t: "free" | "business"
      price_status_t: "accepted" | "flagged"
      role_t: "family" | "eatery"
      tier_t: "contributor" | "user_log" | "da_market" | "da_avg" | "estimate"
      unit_t: "kg" | "L" | "pc" | "bundle" | "can" | "pack"
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
      meal_t: ["breakfast", "ulam"],
      plan_t: ["free", "business"],
      price_status_t: ["accepted", "flagged"],
      role_t: ["family", "eatery"],
      tier_t: ["contributor", "user_log", "da_market", "da_avg", "estimate"],
      unit_t: ["kg", "L", "pc", "bundle", "can", "pack"],
    },
  },
} as const

