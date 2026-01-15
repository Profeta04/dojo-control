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
      attendance: {
        Row: {
          class_id: string
          created_at: string
          date: string
          id: string
          marked_by: string
          notes: string | null
          present: boolean
          student_id: string
        }
        Insert: {
          class_id: string
          created_at?: string
          date?: string
          id?: string
          marked_by: string
          notes?: string | null
          present?: boolean
          student_id: string
        }
        Update: {
          class_id?: string
          created_at?: string
          date?: string
          id?: string
          marked_by?: string
          notes?: string | null
          present?: boolean
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendance_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
        ]
      }
      class_schedule: {
        Row: {
          class_id: string
          created_at: string
          created_by: string
          date: string
          end_time: string
          id: string
          is_cancelled: boolean | null
          notes: string | null
          start_time: string
        }
        Insert: {
          class_id: string
          created_at?: string
          created_by: string
          date: string
          end_time: string
          id?: string
          is_cancelled?: boolean | null
          notes?: string | null
          start_time: string
        }
        Update: {
          class_id?: string
          created_at?: string
          created_by?: string
          date?: string
          end_time?: string
          id?: string
          is_cancelled?: boolean | null
          notes?: string | null
          start_time?: string
        }
        Relationships: [
          {
            foreignKeyName: "class_schedule_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
        ]
      }
      class_students: {
        Row: {
          class_id: string
          enrolled_at: string
          id: string
          student_id: string
        }
        Insert: {
          class_id: string
          enrolled_at?: string
          id?: string
          student_id: string
        }
        Update: {
          class_id?: string
          enrolled_at?: string
          id?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "class_students_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
        ]
      }
      classes: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean | null
          max_students: number | null
          name: string
          schedule: string
          sensei_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          max_students?: number | null
          name: string
          schedule: string
          sensei_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          max_students?: number | null
          name?: string
          schedule?: string
          sensei_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      events: {
        Row: {
          created_at: string
          created_by: string
          description: string | null
          event_date: string
          event_time: string | null
          event_type: string | null
          id: string
          location: string | null
          title: string
        }
        Insert: {
          created_at?: string
          created_by: string
          description?: string | null
          event_date: string
          event_time?: string | null
          event_type?: string | null
          id?: string
          location?: string | null
          title: string
        }
        Update: {
          created_at?: string
          created_by?: string
          description?: string | null
          event_date?: string
          event_time?: string | null
          event_type?: string | null
          id?: string
          location?: string | null
          title?: string
        }
        Relationships: []
      }
      graduation_history: {
        Row: {
          created_at: string
          graduation_date: string
          id: string
          new_belt: Database["public"]["Enums"]["belt_grade"]
          notes: string | null
          previous_belt: Database["public"]["Enums"]["belt_grade"] | null
          promoted_by: string
          student_id: string
        }
        Insert: {
          created_at?: string
          graduation_date?: string
          id?: string
          new_belt: Database["public"]["Enums"]["belt_grade"]
          notes?: string | null
          previous_belt?: Database["public"]["Enums"]["belt_grade"] | null
          promoted_by: string
          student_id: string
        }
        Update: {
          created_at?: string
          graduation_date?: string
          id?: string
          new_belt?: Database["public"]["Enums"]["belt_grade"]
          notes?: string | null
          previous_belt?: Database["public"]["Enums"]["belt_grade"] | null
          promoted_by?: string
          student_id?: string
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount: number
          created_at: string
          due_date: string
          id: string
          notes: string | null
          paid_date: string | null
          reference_month: string
          registered_by: string
          status: Database["public"]["Enums"]["payment_status"]
          student_id: string
          updated_at: string
        }
        Insert: {
          amount: number
          created_at?: string
          due_date: string
          id?: string
          notes?: string | null
          paid_date?: string | null
          reference_month: string
          registered_by: string
          status?: Database["public"]["Enums"]["payment_status"]
          student_id: string
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          due_date?: string
          id?: string
          notes?: string | null
          paid_date?: string | null
          reference_month?: string
          registered_by?: string
          status?: Database["public"]["Enums"]["payment_status"]
          student_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          avatar_url: string | null
          belt_grade: Database["public"]["Enums"]["belt_grade"] | null
          created_at: string
          email: string
          id: string
          name: string
          phone: string | null
          registration_status:
            | Database["public"]["Enums"]["registration_status"]
            | null
          updated_at: string
          user_id: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          avatar_url?: string | null
          belt_grade?: Database["public"]["Enums"]["belt_grade"] | null
          created_at?: string
          email: string
          id?: string
          name: string
          phone?: string | null
          registration_status?:
            | Database["public"]["Enums"]["registration_status"]
            | null
          updated_at?: string
          user_id: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          avatar_url?: string | null
          belt_grade?: Database["public"]["Enums"]["belt_grade"] | null
          created_at?: string
          email?: string
          id?: string
          name?: string
          phone?: string | null
          registration_status?:
            | Database["public"]["Enums"]["registration_status"]
            | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      assign_user_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: undefined
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      remove_user_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "admin" | "sensei" | "student"
      belt_grade:
        | "branca"
        | "cinza"
        | "azul"
        | "amarela"
        | "laranja"
        | "verde"
        | "roxa"
        | "marrom"
        | "preta_1dan"
        | "preta_2dan"
        | "preta_3dan"
        | "preta_4dan"
        | "preta_5dan"
        | "preta_6dan"
        | "preta_7dan"
        | "preta_8dan"
        | "preta_9dan"
        | "preta_10dan"
      payment_status: "pendente" | "pago" | "atrasado"
      registration_status: "pendente" | "aprovado" | "rejeitado"
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
      app_role: ["admin", "sensei", "student"],
      belt_grade: [
        "branca",
        "cinza",
        "azul",
        "amarela",
        "laranja",
        "verde",
        "roxa",
        "marrom",
        "preta_1dan",
        "preta_2dan",
        "preta_3dan",
        "preta_4dan",
        "preta_5dan",
        "preta_6dan",
        "preta_7dan",
        "preta_8dan",
        "preta_9dan",
        "preta_10dan",
      ],
      payment_status: ["pendente", "pago", "atrasado"],
      registration_status: ["pendente", "aprovado", "rejeitado"],
    },
  },
} as const
