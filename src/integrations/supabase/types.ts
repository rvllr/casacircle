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
      blocked_periods: {
        Row: {
          created_at: string
          created_by: string
          end_date: string
          house_id: string
          id: string
          reason: string | null
          start_date: string
        }
        Insert: {
          created_at?: string
          created_by: string
          end_date: string
          house_id: string
          id?: string
          reason?: string | null
          start_date: string
        }
        Update: {
          created_at?: string
          created_by?: string
          end_date?: string
          house_id?: string
          id?: string
          reason?: string | null
          start_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "blocked_periods_house_id_fkey"
            columns: ["house_id"]
            isOneToOne: false
            referencedRelation: "houses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "blocked_periods_house_id_fkey"
            columns: ["house_id"]
            isOneToOne: false
            referencedRelation: "public_houses"
            referencedColumns: ["id"]
          },
        ]
      }
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
          amount_paid: number | null
          cleaning_fee: number | null
          cleaning_fee_paid: boolean
          created_at: string
          end_date: string
          guest_count: number | null
          house_id: string
          id: string
          notes: string | null
          payment_status: Database["public"]["Enums"]["payment_status"]
          start_date: string
          status: Database["public"]["Enums"]["booking_status"]
          total_price: number | null
          unit_id: string | null
          user_id: string
        }
        Insert: {
          amount_paid?: number | null
          cleaning_fee?: number | null
          cleaning_fee_paid?: boolean
          created_at?: string
          end_date: string
          guest_count?: number | null
          house_id: string
          id?: string
          notes?: string | null
          payment_status?: Database["public"]["Enums"]["payment_status"]
          start_date: string
          status?: Database["public"]["Enums"]["booking_status"]
          total_price?: number | null
          unit_id?: string | null
          user_id: string
        }
        Update: {
          amount_paid?: number | null
          cleaning_fee?: number | null
          cleaning_fee_paid?: boolean
          created_at?: string
          end_date?: string
          guest_count?: number | null
          house_id?: string
          id?: string
          notes?: string | null
          payment_status?: Database["public"]["Enums"]["payment_status"]
          start_date?: string
          status?: Database["public"]["Enums"]["booking_status"]
          total_price?: number | null
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
            foreignKeyName: "bookings_house_id_fkey"
            columns: ["house_id"]
            isOneToOne: false
            referencedRelation: "public_houses"
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
      decision_register: {
        Row: {
          abstain_count: number | null
          created_at: string
          decided_at: string
          decision: string
          description: string | null
          house_id: string
          id: string
          majority_rule: string | null
          no_count: number | null
          no_weighted: number | null
          title: string
          vote_id: string | null
          voting_mode: string | null
          yes_count: number | null
          yes_weighted: number | null
        }
        Insert: {
          abstain_count?: number | null
          created_at?: string
          decided_at?: string
          decision?: string
          description?: string | null
          house_id: string
          id?: string
          majority_rule?: string | null
          no_count?: number | null
          no_weighted?: number | null
          title: string
          vote_id?: string | null
          voting_mode?: string | null
          yes_count?: number | null
          yes_weighted?: number | null
        }
        Update: {
          abstain_count?: number | null
          created_at?: string
          decided_at?: string
          decision?: string
          description?: string | null
          house_id?: string
          id?: string
          majority_rule?: string | null
          no_count?: number | null
          no_weighted?: number | null
          title?: string
          vote_id?: string | null
          voting_mode?: string | null
          yes_count?: number | null
          yes_weighted?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "decision_register_house_id_fkey"
            columns: ["house_id"]
            isOneToOne: false
            referencedRelation: "houses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "decision_register_house_id_fkey"
            columns: ["house_id"]
            isOneToOne: false
            referencedRelation: "public_houses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "decision_register_vote_id_fkey"
            columns: ["vote_id"]
            isOneToOne: false
            referencedRelation: "votes"
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
          {
            foreignKeyName: "documents_house_id_fkey"
            columns: ["house_id"]
            isOneToOne: false
            referencedRelation: "public_houses"
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
          category: Database["public"]["Enums"]["expense_category"]
          created_at: string
          description: string
          expense_date: string | null
          house_id: string
          id: string
          paid_by: string
        }
        Insert: {
          amount: number
          category?: Database["public"]["Enums"]["expense_category"]
          created_at?: string
          description: string
          expense_date?: string | null
          house_id: string
          id?: string
          paid_by: string
        }
        Update: {
          amount?: number
          category?: Database["public"]["Enums"]["expense_category"]
          created_at?: string
          description?: string
          expense_date?: string | null
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
          {
            foreignKeyName: "expenses_house_id_fkey"
            columns: ["house_id"]
            isOneToOne: false
            referencedRelation: "public_houses"
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
      family_tree_nodes: {
        Row: {
          birth_year: number | null
          created_at: string
          death_year: number | null
          family_id: string
          id: string
          name: string
          parent_node_id: string | null
          photo_url: string | null
          user_id: string | null
        }
        Insert: {
          birth_year?: number | null
          created_at?: string
          death_year?: number | null
          family_id: string
          id?: string
          name: string
          parent_node_id?: string | null
          photo_url?: string | null
          user_id?: string | null
        }
        Update: {
          birth_year?: number | null
          created_at?: string
          death_year?: number | null
          family_id?: string
          id?: string
          name?: string
          parent_node_id?: string | null
          photo_url?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "family_tree_nodes_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "family_tree_nodes_parent_node_id_fkey"
            columns: ["parent_node_id"]
            isOneToOne: false
            referencedRelation: "family_tree_nodes"
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
          {
            foreignKeyName: "house_guides_house_id_fkey"
            columns: ["house_id"]
            isOneToOne: false
            referencedRelation: "public_houses"
            referencedColumns: ["id"]
          },
        ]
      }
      house_history_events: {
        Row: {
          created_at: string
          created_by: string
          description: string | null
          event_date: string
          event_type: string
          house_id: string
          id: string
          photo_url: string | null
          title: string
        }
        Insert: {
          created_at?: string
          created_by: string
          description?: string | null
          event_date: string
          event_type?: string
          house_id: string
          id?: string
          photo_url?: string | null
          title: string
        }
        Update: {
          created_at?: string
          created_by?: string
          description?: string | null
          event_date?: string
          event_type?: string
          house_id?: string
          id?: string
          photo_url?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "house_history_events_house_id_fkey"
            columns: ["house_id"]
            isOneToOne: false
            referencedRelation: "houses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "house_history_events_house_id_fkey"
            columns: ["house_id"]
            isOneToOne: false
            referencedRelation: "public_houses"
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
          {
            foreignKeyName: "house_members_house_id_fkey"
            columns: ["house_id"]
            isOneToOne: false
            referencedRelation: "public_houses"
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
          {
            foreignKeyName: "house_memories_house_id_fkey"
            columns: ["house_id"]
            isOneToOne: false
            referencedRelation: "public_houses"
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
          {
            foreignKeyName: "house_news_house_id_fkey"
            columns: ["house_id"]
            isOneToOne: false
            referencedRelation: "public_houses"
            referencedColumns: ["id"]
          },
        ]
      }
      house_pricing: {
        Row: {
          accepted_payments: string[]
          base_price: number
          cap_amount: number | null
          cleaning_fee: number | null
          cleaning_mode: Database["public"]["Enums"]["cleaning_mode"]
          created_at: string
          house_id: string
          id: string
          is_active: boolean
          payment_instructions: string | null
          payment_method: Database["public"]["Enums"]["payment_method"]
          pricing_mode: Database["public"]["Enums"]["pricing_mode"]
          updated_at: string
        }
        Insert: {
          accepted_payments?: string[]
          base_price?: number
          cap_amount?: number | null
          cleaning_fee?: number | null
          cleaning_mode?: Database["public"]["Enums"]["cleaning_mode"]
          created_at?: string
          house_id: string
          id?: string
          is_active?: boolean
          payment_instructions?: string | null
          payment_method?: Database["public"]["Enums"]["payment_method"]
          pricing_mode?: Database["public"]["Enums"]["pricing_mode"]
          updated_at?: string
        }
        Update: {
          accepted_payments?: string[]
          base_price?: number
          cap_amount?: number | null
          cleaning_fee?: number | null
          cleaning_mode?: Database["public"]["Enums"]["cleaning_mode"]
          created_at?: string
          house_id?: string
          id?: string
          is_active?: boolean
          payment_instructions?: string | null
          payment_method?: Database["public"]["Enums"]["payment_method"]
          pricing_mode?: Database["public"]["Enums"]["pricing_mode"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "house_pricing_house_id_fkey"
            columns: ["house_id"]
            isOneToOne: true
            referencedRelation: "houses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "house_pricing_house_id_fkey"
            columns: ["house_id"]
            isOneToOne: true
            referencedRelation: "public_houses"
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
            foreignKeyName: "house_units_house_id_fkey"
            columns: ["house_id"]
            isOneToOne: false
            referencedRelation: "public_houses"
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
          access_code: string | null
          booking_auto_approve: boolean
          capacity: number | null
          created_at: string
          description: string | null
          emergency_contact: string | null
          family_id: string | null
          id: string
          is_public: boolean
          join_code: string | null
          location: string | null
          name: string
          owner_id: string | null
          photo_url: string | null
          property_mode: string
          wifi_name: string | null
          wifi_password: string | null
        }
        Insert: {
          access_code?: string | null
          booking_auto_approve?: boolean
          capacity?: number | null
          created_at?: string
          description?: string | null
          emergency_contact?: string | null
          family_id?: string | null
          id?: string
          is_public?: boolean
          join_code?: string | null
          location?: string | null
          name: string
          owner_id?: string | null
          photo_url?: string | null
          property_mode?: string
          wifi_name?: string | null
          wifi_password?: string | null
        }
        Update: {
          access_code?: string | null
          booking_auto_approve?: boolean
          capacity?: number | null
          created_at?: string
          description?: string | null
          emergency_contact?: string | null
          family_id?: string | null
          id?: string
          is_public?: boolean
          join_code?: string | null
          location?: string | null
          name?: string
          owner_id?: string | null
          photo_url?: string | null
          property_mode?: string
          wifi_name?: string | null
          wifi_password?: string | null
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
          priority: Database["public"]["Enums"]["ticket_priority"]
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
          priority?: Database["public"]["Enums"]["ticket_priority"]
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
          priority?: Database["public"]["Enums"]["ticket_priority"]
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
          {
            foreignKeyName: "maintenance_tickets_house_id_fkey"
            columns: ["house_id"]
            isOneToOne: false
            referencedRelation: "public_houses"
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
      notifications: {
        Row: {
          body: string | null
          created_at: string
          house_id: string | null
          id: string
          is_read: boolean
          metadata: Json | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          house_id?: string | null
          id?: string
          is_read?: boolean
          metadata?: Json | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          house_id?: string | null
          id?: string
          is_read?: boolean
          metadata?: Json | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_house_id_fkey"
            columns: ["house_id"]
            isOneToOne: false
            referencedRelation: "houses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_house_id_fkey"
            columns: ["house_id"]
            isOneToOne: false
            referencedRelation: "public_houses"
            referencedColumns: ["id"]
          },
        ]
      }
      ownership_history: {
        Row: {
          changed_by: string
          created_at: string
          house_id: string
          id: string
          new_percentage: number | null
          old_percentage: number | null
          reason: string | null
          user_id: string
        }
        Insert: {
          changed_by: string
          created_at?: string
          house_id: string
          id?: string
          new_percentage?: number | null
          old_percentage?: number | null
          reason?: string | null
          user_id: string
        }
        Update: {
          changed_by?: string
          created_at?: string
          house_id?: string
          id?: string
          new_percentage?: number | null
          old_percentage?: number | null
          reason?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ownership_history_house_id_fkey"
            columns: ["house_id"]
            isOneToOne: false
            referencedRelation: "houses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ownership_history_house_id_fkey"
            columns: ["house_id"]
            isOneToOne: false
            referencedRelation: "public_houses"
            referencedColumns: ["id"]
          },
        ]
      }
      ownership_shares: {
        Row: {
          created_at: string
          house_id: string
          id: string
          percentage: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          house_id: string
          id?: string
          percentage?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          house_id?: string
          id?: string
          percentage?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ownership_shares_house_id_fkey"
            columns: ["house_id"]
            isOneToOne: false
            referencedRelation: "houses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ownership_shares_house_id_fkey"
            columns: ["house_id"]
            isOneToOne: false
            referencedRelation: "public_houses"
            referencedColumns: ["id"]
          },
        ]
      }
      pricing_periods: {
        Row: {
          created_at: string
          end_date: string | null
          end_day: number
          end_month: number
          house_id: string
          id: string
          is_recurring: boolean
          name: string
          price_type: Database["public"]["Enums"]["price_type"]
          price_value: number
          priority: number
          start_date: string | null
          start_day: number
          start_month: number
        }
        Insert: {
          created_at?: string
          end_date?: string | null
          end_day: number
          end_month: number
          house_id: string
          id?: string
          is_recurring?: boolean
          name: string
          price_type?: Database["public"]["Enums"]["price_type"]
          price_value?: number
          priority?: number
          start_date?: string | null
          start_day: number
          start_month: number
        }
        Update: {
          created_at?: string
          end_date?: string | null
          end_day?: number
          end_month?: number
          house_id?: string
          id?: string
          is_recurring?: boolean
          name?: string
          price_type?: Database["public"]["Enums"]["price_type"]
          price_value?: number
          priority?: number
          start_date?: string | null
          start_day?: number
          start_month?: number
        }
        Relationships: [
          {
            foreignKeyName: "pricing_periods_house_id_fkey"
            columns: ["house_id"]
            isOneToOne: false
            referencedRelation: "houses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pricing_periods_house_id_fkey"
            columns: ["house_id"]
            isOneToOne: false
            referencedRelation: "public_houses"
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
          phone: string | null
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
          phone?: string | null
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
          phone?: string | null
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
          majority_rule: string
          title: string
          voting_mode: string
        }
        Insert: {
          created_at?: string
          created_by: string
          deadline?: string | null
          description?: string | null
          house_id: string
          id?: string
          majority_rule?: string
          title: string
          voting_mode?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          deadline?: string | null
          description?: string | null
          house_id?: string
          id?: string
          majority_rule?: string
          title?: string
          voting_mode?: string
        }
        Relationships: [
          {
            foreignKeyName: "votes_house_id_fkey"
            columns: ["house_id"]
            isOneToOne: false
            referencedRelation: "houses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "votes_house_id_fkey"
            columns: ["house_id"]
            isOneToOne: false
            referencedRelation: "public_houses"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      public_houses: {
        Row: {
          booking_auto_approve: boolean | null
          capacity: number | null
          created_at: string | null
          description: string | null
          family_id: string | null
          id: string | null
          is_public: boolean | null
          location: string | null
          name: string | null
          photo_url: string | null
        }
        Insert: {
          booking_auto_approve?: boolean | null
          capacity?: number | null
          created_at?: string | null
          description?: string | null
          family_id?: string | null
          id?: string | null
          is_public?: boolean | null
          location?: string | null
          name?: string | null
          photo_url?: string | null
        }
        Update: {
          booking_auto_approve?: boolean | null
          capacity?: number | null
          created_at?: string | null
          description?: string | null
          family_id?: string | null
          id?: string | null
          is_public?: boolean | null
          location?: string | null
          name?: string | null
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
      is_co_member: {
        Args: { _target_user_id: string; _viewer_id: string }
        Returns: boolean
      }
      is_family_admin: {
        Args: { _family_id: string; _user_id: string }
        Returns: boolean
      }
      is_family_member: {
        Args: { _family_id: string; _user_id: string }
        Returns: boolean
      }
      is_house_active_member: {
        Args: { _house_id: string; _user_id: string }
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
      join_house_by_code: {
        Args: { _join_code: string; _user_id: string }
        Returns: string
      }
    }
    Enums: {
      booking_status: "pending" | "approved" | "refused" | "cancelled"
      cleaning_mode: "included" | "optional" | "mandatory"
      document_type: "legal" | "insurance" | "invoice" | "other"
      expense_category:
        | "courses"
        | "travaux"
        | "entretien"
        | "energie"
        | "assurance"
        | "taxes"
        | "menage"
        | "autre"
      family_role: "admin" | "member"
      guest_type: "family" | "friend"
      guide_type: "arrival" | "departure" | "rules" | "practical_info"
      payment_method: "declarative" | "stripe" | "both"
      payment_status: "not_applicable" | "unpaid" | "partial" | "paid"
      price_type: "absolute" | "multiplier"
      pricing_mode: "per_night" | "per_person" | "per_person_per_night"
      ticket_priority: "low" | "medium" | "high" | "urgent"
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
      cleaning_mode: ["included", "optional", "mandatory"],
      document_type: ["legal", "insurance", "invoice", "other"],
      expense_category: [
        "courses",
        "travaux",
        "entretien",
        "energie",
        "assurance",
        "taxes",
        "menage",
        "autre",
      ],
      family_role: ["admin", "member"],
      guest_type: ["family", "friend"],
      guide_type: ["arrival", "departure", "rules", "practical_info"],
      payment_method: ["declarative", "stripe", "both"],
      payment_status: ["not_applicable", "unpaid", "partial", "paid"],
      price_type: ["absolute", "multiplier"],
      pricing_mode: ["per_night", "per_person", "per_person_per_night"],
      ticket_priority: ["low", "medium", "high", "urgent"],
      ticket_status: ["open", "in_progress", "resolved"],
      unit_type: ["building", "room"],
      vote_response: ["yes", "no", "abstain"],
    },
  },
} as const
