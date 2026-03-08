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
      booking_guests: {
        Row: {
          booking_id: string
          created_at: string
          id: string
          name: string
          type: Database["public"]["Enums"]["guest_type"]
        }
        Insert: {
          booking_id: string
          created_at?: string
          id?: string
          name: string
          type?: Database["public"]["Enums"]["guest_type"]
        }
        Update: {
          booking_id?: string
          created_at?: string
          id?: string
          name?: string
          type?: Database["public"]["Enums"]["guest_type"]
        }
        Relationships: [
          {
            foreignKeyName: "booking_guests_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      bookings: {
        Row: {
          created_at: string
          end_date: string
          house_id: string
          id: string
          start_date: string
          status: Database["public"]["Enums"]["booking_status"]
          unit_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          end_date: string
          house_id: string
          id?: string
          start_date: string
          status?: Database["public"]["Enums"]["booking_status"]
          unit_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          end_date?: string
          house_id?: string
          id?: string
          start_date?: string
          status?: Database["public"]["Enums"]["booking_status"]
          unit_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bookings_house_id_fkey"
            columns: ["house_id"]
            isOneToOne: false
            referencedRelation: "houses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "house_units"
            referencedColumns: ["id"]
          },
        ]
      }
      documents: {
        Row: {
          created_at: string
          file_url: string
          house_id: string
          id: string
          title: string
          type: Database["public"]["Enums"]["document_type"]
          uploaded_by: string
        }
        Insert: {
          created_at?: string
          file_url: string
          house_id: string
          id?: string
          title: string
          type?: Database["public"]["Enums"]["document_type"]
          uploaded_by: string
        }
        Update: {
          created_at?: string
          file_url?: string
          house_id?: string
          id?: string
          title?: string
          type?: Database["public"]["Enums"]["document_type"]
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "documents_house_id_fkey"
            columns: ["house_id"]
            isOneToOne: false
            referencedRelation: "houses"
            referencedColumns: ["id"]
          },
        ]
      }
      expense_shares: {
        Row: {
          amount: number
          expense_id: string
          id: string
          user_id: string
        }
        Insert: {
          amount: number
          expense_id: string
          id?: string
          user_id: string
        }
        Update: {
          amount?: number
          expense_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "expense_shares_expense_id_fkey"
            columns: ["expense_id"]
            isOneToOne: false
            referencedRelation: "expenses"
            referencedColumns: ["id"]
          },
        ]
      }
      expenses: {
        Row: {
          amount: number
          created_at: string
          description: string
          house_id: string
          id: string
          paid_by: string
        }
        Insert: {
          amount: number
          created_at?: string
          description: string
          house_id: string
          id?: string
          paid_by: string
        }
        Update: {
          amount?: number
          created_at?: string
          description?: string
          house_id?: string
          id?: string
          paid_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "expenses_house_id_fkey"
            columns: ["house_id"]
            isOneToOne: false
            referencedRelation: "houses"
            referencedColumns: ["id"]
          },
        ]
      }
      families: {
        Row: {
          created_at: string
          created_by: string
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          created_by: string
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      family_members: {
        Row: {
          created_at: string
          family_id: string
          id: string
          role: Database["public"]["Enums"]["family_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          family_id: string
          id?: string
          role?: Database["public"]["Enums"]["family_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          family_id?: string
          id?: string
          role?: Database["public"]["Enums"]["family_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "family_members_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
        ]
      }
      house_guides: {
        Row: {
          content: string | null
          created_at: string
          house_id: string
          id: string
          title: string
          type: Database["public"]["Enums"]["guide_type"]
          updated_at: string
        }
        Insert: {
          content?: string | null
          created_at?: string
          house_id: string
          id?: string
          title: string
          type?: Database["public"]["Enums"]["guide_type"]
          updated_at?: string
        }
        Update: {
          content?: string | null
          created_at?: string
          house_id?: string
          id?: string
          title?: string
          type?: Database["public"]["Enums"]["guide_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "house_guides_house_id_fkey"
            columns: ["house_id"]
            isOneToOne: false
            referencedRelation: "houses"
            referencedColumns: ["id"]
          },
        ]
      }
      house_members: {
        Row: {
          created_at: string
          house_id: string
          id: string
          role: string
          user_id: string
        }
        Insert: {
          created_at?: string
          house_id: string
          id?: string
          role?: string
          user_id: string
        }
        Update: {
          created_at?: string
          house_id?: string
          id?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "house_members_house_id_fkey"
            columns: ["house_id"]
            isOneToOne: false
            referencedRelation: "houses"
            referencedColumns: ["id"]
          },
        ]
      }
      house_memories: {
        Row: {
          created_at: string
          created_by: string
          description: string | null
          house_id: string
          id: string
          title: string
          visit_end: string | null
          visit_start: string | null
        }
        Insert: {
          created_at?: string
          created_by: string
          description?: string | null
          house_id: string
          id?: string
          title: string
          visit_end?: string | null
          visit_start?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string
          description?: string | null
          house_id?: string
          id?: string
          title?: string
          visit_end?: string | null
          visit_start?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "house_memories_house_id_fkey"
            columns: ["house_id"]
            isOneToOne: false
            referencedRelation: "houses"
            referencedColumns: ["id"]
          },
        ]
      }
      house_news: {
        Row: {
          content: string | null
          created_at: string
          created_by: string
          house_id: string
          id: string
          title: string
        }
        Insert: {
          content?: string | null
          created_at?: string
          created_by: string
          house_id: string
          id?: string
          title: string
        }
        Update: {
          content?: string | null
          created_at?: string
          created_by?: string
          house_id?: string
          id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "house_news_house_id_fkey"
            columns: ["house_id"]
            isOneToOne: false
            referencedRelation: "houses"
            referencedColumns: ["id"]
          },
        ]
      }
      house_units: {
        Row: {
          capacity: number | null
          created_at: string
          description: string | null
          house_id: string
          id: string
          name: string
          parent_id: string | null
          type: Database["public"]["Enums"]["unit_type"]
        }
        Insert: {
          capacity?: number | null
          created_at?: string
          description?: string | null
          house_id: string
          id?: string
          name: string
          parent_id?: string | null
          type?: Database["public"]["Enums"]["unit_type"]
        }
        Update: {
          capacity?: number | null
          created_at?: string
          description?: string | null
          house_id?: string
          id?: string
          name?: string
          parent_id?: string | null
          type?: Database["public"]["Enums"]["unit_type"]
        }
        Relationships: [
          {
            foreignKeyName: "house_units_house_id_fkey"
            columns: ["house_id"]
            isOneToOne: false
            referencedRelation: "houses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "house_units_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "house_units"
            referencedColumns: ["id"]
          },
        ]
      }
      houses: {
        Row: {
          capacity: number | null
          created_at: string
          description: string | null
          family_id: string | null
          id: string
          location: string | null
          name: string
          owner_id: string | null
          photo_url: string | null
        }
        Insert: {
          capacity?: number | null
          created_at?: string
          description?: string | null
          family_id?: string | null
          id?: string
          location?: string | null
          name: string
          owner_id?: string | null
          photo_url?: string | null
        }
        Update: {
          capacity?: number | null
          created_at?: string
          description?: string | null
          family_id?: string | null
          id?: string
          location?: string | null
          name?: string
          owner_id?: string | null
          photo_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "houses_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
        ]
      }
      maintenance_tickets: {
        Row: {
          created_at: string
          created_by: string
          description: string | null
          house_id: string
          id: string
          status: Database["public"]["Enums"]["ticket_status"]
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          description?: string | null
          house_id: string
          id?: string
          status?: Database["public"]["Enums"]["ticket_status"]
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          description?: string | null
          house_id?: string
          id?: string
          status?: Database["public"]["Enums"]["ticket_status"]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "maintenance_tickets_house_id_fkey"
            columns: ["house_id"]
            isOneToOne: false
            referencedRelation: "houses"
            referencedColumns: ["id"]
          },
        ]
      }
      memory_photos: {
        Row: {
          created_at: string
          id: string
          image_url: string
          memory_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          image_url: string
          memory_id: string
        }
        Update: {
          created_at?: string
          id?: string
          image_url?: string
          memory_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "memory_photos_memory_id_fkey"
            columns: ["memory_id"]
            isOneToOne: false
            referencedRelation: "house_memories"
            referencedColumns: ["id"]
          },
        ]
      }
      users_profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string | null
          first_name: string | null
          id: string
          last_name: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          first_name?: string | null
          id?: string
          last_name?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          first_name?: string | null
          id?: string
          last_name?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      vote_responses: {
        Row: {
          created_at: string
          id: string
          response: Database["public"]["Enums"]["vote_response"]
          user_id: string
          vote_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          response: Database["public"]["Enums"]["vote_response"]
          user_id: string
          vote_id: string
        }
        Update: {
          created_at?: string
          id?: string
          response?: Database["public"]["Enums"]["vote_response"]
          user_id?: string
          vote_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vote_responses_vote_id_fkey"
            columns: ["vote_id"]
            isOneToOne: false
            referencedRelation: "votes"
            referencedColumns: ["id"]
          },
        ]
      }
      votes: {
        Row: {
          created_at: string
          created_by: string
          deadline: string | null
          description: string | null
          house_id: string
          id: string
          title: string
        }
        Insert: {
          created_at?: string
          created_by: string
          deadline?: string | null
          description?: string | null
          house_id: string
          id?: string
          title: string
        }
        Update: {
          created_at?: string
          created_by?: string
          deadline?: string | null
          description?: string | null
          house_id?: string
          id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "votes_house_id_fkey"
            columns: ["house_id"]
            isOneToOne: false
            referencedRelation: "houses"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_family_id_from_house: { Args: { _house_id: string }; Returns: string }
      get_house_id_from_booking: {
        Args: { _booking_id: string }
        Returns: string
      }
      get_house_id_from_expense: {
        Args: { _expense_id: string }
        Returns: string
      }
      get_house_id_from_memory: {
        Args: { _memory_id: string }
        Returns: string
      }
      get_house_id_from_unit: { Args: { _unit_id: string }; Returns: string }
      get_house_id_from_vote: { Args: { _vote_id: string }; Returns: string }
      is_family_admin: {
        Args: { _family_id: string; _user_id: string }
        Returns: boolean
      }
      is_family_member: {
        Args: { _family_id: string; _user_id: string }
        Returns: boolean
      }
      is_house_admin: {
        Args: { _house_id: string; _user_id: string }
        Returns: boolean
      }
      is_house_member: {
        Args: { _house_id: string; _user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      booking_status: "pending" | "approved" | "refused" | "cancelled"
      document_type: "legal" | "insurance" | "invoice" | "other"
      family_role: "admin" | "member"
      guest_type: "family" | "friend"
      guide_type: "arrival" | "departure" | "rules" | "practical_info"
      ticket_status: "open" | "in_progress" | "resolved"
      unit_type: "building" | "room"
      vote_response: "yes" | "no" | "abstain"
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
      booking_status: ["pending", "approved", "refused", "cancelled"],
      document_type: ["legal", "insurance", "invoice", "other"],
      family_role: ["admin", "member"],
      guest_type: ["family", "friend"],
      guide_type: ["arrival", "departure", "rules", "practical_info"],
      ticket_status: ["open", "in_progress", "resolved"],
      unit_type: ["building", "room"],
      vote_response: ["yes", "no", "abstain"],
    },
  },
} as const
