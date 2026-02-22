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
      achievements: {
        Row: {
          annual_year: number | null
          category: string
          created_at: string
          criteria_type: string
          criteria_value: number
          description: string | null
          icon: string
          id: string
          is_annual: boolean
          name: string
          rarity: string
          xp_reward: number
        }
        Insert: {
          annual_year?: number | null
          category?: string
          created_at?: string
          criteria_type: string
          criteria_value?: number
          description?: string | null
          icon?: string
          id?: string
          is_annual?: boolean
          name: string
          rarity?: string
          xp_reward?: number
        }
        Update: {
          annual_year?: number | null
          category?: string
          created_at?: string
          criteria_type?: string
          criteria_value?: number
          description?: string | null
          icon?: string
          id?: string
          is_annual?: boolean
          name?: string
          rarity?: string
          xp_reward?: number
        }
        Relationships: []
      }
      attendance: {
        Row: {
          class_id: string
          created_at: string | null
          date: string
          id: string
          marked_by: string | null
          notes: string | null
          present: boolean
          self_checked_in: boolean
          student_id: string
        }
        Insert: {
          class_id: string
          created_at?: string | null
          date: string
          id?: string
          marked_by?: string | null
          notes?: string | null
          present?: boolean
          self_checked_in?: boolean
          student_id: string
        }
        Update: {
          class_id?: string
          created_at?: string | null
          date?: string
          id?: string
          marked_by?: string | null
          notes?: string | null
          present?: boolean
          self_checked_in?: boolean
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
          {
            foreignKeyName: "attendance_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      class_schedule: {
        Row: {
          class_id: string
          created_at: string | null
          date: string
          end_time: string
          id: string
          is_cancelled: boolean | null
          notes: string | null
          start_time: string
        }
        Insert: {
          class_id: string
          created_at?: string | null
          date: string
          end_time: string
          id?: string
          is_cancelled?: boolean | null
          notes?: string | null
          start_time: string
        }
        Update: {
          class_id?: string
          created_at?: string | null
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
          enrolled_at: string | null
          id: string
          student_id: string
        }
        Insert: {
          class_id: string
          enrolled_at?: string | null
          id?: string
          student_id: string
        }
        Update: {
          class_id?: string
          enrolled_at?: string | null
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
          {
            foreignKeyName: "class_students_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      classes: {
        Row: {
          created_at: string | null
          description: string | null
          dojo_id: string | null
          id: string
          is_active: boolean | null
          martial_art: string
          max_students: number | null
          name: string
          schedule: Json | null
          sensei_id: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          dojo_id?: string | null
          id?: string
          is_active?: boolean | null
          martial_art?: string
          max_students?: number | null
          name: string
          schedule?: Json | null
          sensei_id?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          dojo_id?: string | null
          id?: string
          is_active?: boolean | null
          martial_art?: string
          max_students?: number | null
          name?: string
          schedule?: Json | null
          sensei_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "classes_dojo_id_fkey"
            columns: ["dojo_id"]
            isOneToOne: false
            referencedRelation: "dojos"
            referencedColumns: ["id"]
          },
        ]
      }
      dojo_senseis: {
        Row: {
          created_at: string | null
          dojo_id: string
          id: string
          sensei_id: string
        }
        Insert: {
          created_at?: string | null
          dojo_id: string
          id?: string
          sensei_id: string
        }
        Update: {
          created_at?: string | null
          dojo_id?: string
          id?: string
          sensei_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "dojo_senseis_dojo_id_fkey"
            columns: ["dojo_id"]
            isOneToOne: false
            referencedRelation: "dojos"
            referencedColumns: ["id"]
          },
        ]
      }
      dojo_subscriptions: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          created_at: string
          dojo_id: string
          expires_at: string | null
          id: string
          receipt_submitted_at: string | null
          receipt_url: string | null
          status: string
          tier: string
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          dojo_id: string
          expires_at?: string | null
          id?: string
          receipt_submitted_at?: string | null
          receipt_url?: string | null
          status?: string
          tier: string
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          dojo_id?: string
          expires_at?: string | null
          id?: string
          receipt_submitted_at?: string | null
          receipt_url?: string | null
          status?: string
          tier?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "dojo_subscriptions_dojo_id_fkey"
            columns: ["dojo_id"]
            isOneToOne: false
            referencedRelation: "dojos"
            referencedColumns: ["id"]
          },
        ]
      }
      dojo_users: {
        Row: {
          created_at: string | null
          dojo_id: string
          id: string
          is_owner: boolean | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          dojo_id: string
          id?: string
          is_owner?: boolean | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          dojo_id?: string
          id?: string
          is_owner?: boolean | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "dojo_users_dojo_id_fkey"
            columns: ["dojo_id"]
            isOneToOne: false
            referencedRelation: "dojos"
            referencedColumns: ["id"]
          },
        ]
      }
      dojos: {
        Row: {
          address: string | null
          checkin_token: string
          color_accent: string | null
          color_primary: string | null
          color_secondary: string | null
          created_at: string | null
          daily_interest_percent: number
          description: string | null
          email: string | null
          grace_days: number
          id: string
          is_active: boolean | null
          late_fee_fixed: number
          late_fee_percent: number
          logo_url: string | null
          name: string
          phone: string | null
          pix_key: string | null
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          checkin_token?: string
          color_accent?: string | null
          color_primary?: string | null
          color_secondary?: string | null
          created_at?: string | null
          daily_interest_percent?: number
          description?: string | null
          email?: string | null
          grace_days?: number
          id?: string
          is_active?: boolean | null
          late_fee_fixed?: number
          late_fee_percent?: number
          logo_url?: string | null
          name: string
          phone?: string | null
          pix_key?: string | null
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          checkin_token?: string
          color_accent?: string | null
          color_primary?: string | null
          color_secondary?: string | null
          created_at?: string | null
          daily_interest_percent?: number
          description?: string | null
          email?: string | null
          grace_days?: number
          id?: string
          is_active?: boolean | null
          late_fee_fixed?: number
          late_fee_percent?: number
          logo_url?: string | null
          name?: string
          phone?: string | null
          pix_key?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      graduation_history: {
        Row: {
          approved_by: string | null
          created_at: string | null
          from_belt: string | null
          graduation_date: string
          id: string
          notes: string | null
          student_id: string
          to_belt: string
        }
        Insert: {
          approved_by?: string | null
          created_at?: string | null
          from_belt?: string | null
          graduation_date: string
          id?: string
          notes?: string | null
          student_id: string
          to_belt: string
        }
        Update: {
          approved_by?: string | null
          created_at?: string | null
          from_belt?: string | null
          graduation_date?: string
          id?: string
          notes?: string | null
          student_id?: string
          to_belt?: string
        }
        Relationships: [
          {
            foreignKeyName: "graduation_history_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      guardian_minors: {
        Row: {
          created_at: string | null
          guardian_user_id: string
          id: string
          minor_user_id: string
          relationship: string | null
        }
        Insert: {
          created_at?: string | null
          guardian_user_id: string
          id?: string
          minor_user_id: string
          relationship?: string | null
        }
        Update: {
          created_at?: string | null
          guardian_user_id?: string
          id?: string
          minor_user_id?: string
          relationship?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "guardian_minors_minor_user_id_fkey"
            columns: ["minor_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      leaderboard_history: {
        Row: {
          created_at: string
          dojo_id: string
          final_rank: number
          final_xp: number
          id: string
          user_id: string
          year: number
        }
        Insert: {
          created_at?: string
          dojo_id: string
          final_rank: number
          final_xp?: number
          id?: string
          user_id: string
          year: number
        }
        Update: {
          created_at?: string
          dojo_id?: string
          final_rank?: number
          final_xp?: number
          id?: string
          user_id?: string
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "leaderboard_history_dojo_id_fkey"
            columns: ["dojo_id"]
            isOneToOne: false
            referencedRelation: "dojos"
            referencedColumns: ["id"]
          },
        ]
      }
      monthly_fee_plan_classes: {
        Row: {
          class_id: string
          created_at: string
          id: string
          plan_id: string
        }
        Insert: {
          class_id: string
          created_at?: string
          id?: string
          plan_id: string
        }
        Update: {
          class_id?: string
          created_at?: string
          id?: string
          plan_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "monthly_fee_plan_classes_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "monthly_fee_plan_classes_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "monthly_fee_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      monthly_fee_plans: {
        Row: {
          amount: number
          created_at: string
          created_by: string
          dojo_id: string
          due_day: number
          id: string
          is_active: boolean
          name: string
          updated_at: string
        }
        Insert: {
          amount: number
          created_at?: string
          created_by: string
          dojo_id: string
          due_day?: number
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          created_by?: string
          dojo_id?: string
          due_day?: number
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "monthly_fee_plans_dojo_id_fkey"
            columns: ["dojo_id"]
            isOneToOne: false
            referencedRelation: "dojos"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string | null
          id: string
          message: string
          read: boolean | null
          related_id: string | null
          title: string
          type: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          message: string
          read?: boolean | null
          related_id?: string | null
          title: string
          type?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          message?: string
          read?: boolean | null
          related_id?: string | null
          title?: string
          type?: string | null
          user_id?: string
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount: number
          category: Database["public"]["Enums"]["payment_category"]
          created_at: string | null
          description: string | null
          due_date: string
          id: string
          notes: string | null
          paid_date: string | null
          receipt_status: Database["public"]["Enums"]["receipt_status"] | null
          receipt_url: string | null
          reference_month: string | null
          status: Database["public"]["Enums"]["payment_status"] | null
          student_id: string
          updated_at: string | null
        }
        Insert: {
          amount: number
          category?: Database["public"]["Enums"]["payment_category"]
          created_at?: string | null
          description?: string | null
          due_date: string
          id?: string
          notes?: string | null
          paid_date?: string | null
          receipt_status?: Database["public"]["Enums"]["receipt_status"] | null
          receipt_url?: string | null
          reference_month?: string | null
          status?: Database["public"]["Enums"]["payment_status"] | null
          student_id: string
          updated_at?: string | null
        }
        Update: {
          amount?: number
          category?: Database["public"]["Enums"]["payment_category"]
          created_at?: string | null
          description?: string | null
          due_date?: string
          id?: string
          notes?: string | null
          paid_date?: string | null
          receipt_status?: Database["public"]["Enums"]["receipt_status"] | null
          receipt_url?: string | null
          reference_month?: string | null
          status?: Database["public"]["Enums"]["payment_status"] | null
          student_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      profiles: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          avatar_url: string | null
          belt_grade: string | null
          birth_date: string | null
          blocked_reason: string | null
          created_at: string | null
          dark_mode: boolean
          dojo_id: string | null
          email: string | null
          guardian_email: string | null
          guardian_user_id: string | null
          is_blocked: boolean
          is_federated: boolean
          is_scholarship: boolean
          name: string
          phone: string | null
          registration_status: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          avatar_url?: string | null
          belt_grade?: string | null
          birth_date?: string | null
          blocked_reason?: string | null
          created_at?: string | null
          dark_mode?: boolean
          dojo_id?: string | null
          email?: string | null
          guardian_email?: string | null
          guardian_user_id?: string | null
          is_blocked?: boolean
          is_federated?: boolean
          is_scholarship?: boolean
          name: string
          phone?: string | null
          registration_status?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          avatar_url?: string | null
          belt_grade?: string | null
          birth_date?: string | null
          blocked_reason?: string | null
          created_at?: string | null
          dark_mode?: boolean
          dojo_id?: string | null
          email?: string | null
          guardian_email?: string | null
          guardian_user_id?: string | null
          is_blocked?: boolean
          is_federated?: boolean
          is_scholarship?: boolean
          name?: string
          phone?: string | null
          registration_status?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_dojo_id_fkey"
            columns: ["dojo_id"]
            isOneToOne: false
            referencedRelation: "dojos"
            referencedColumns: ["id"]
          },
        ]
      }
      push_subscriptions: {
        Row: {
          auth_key: string
          created_at: string | null
          endpoint: string
          id: string
          p256dh: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          auth_key: string
          created_at?: string | null
          endpoint: string
          id?: string
          p256dh: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          auth_key?: string
          created_at?: string | null
          endpoint?: string
          id?: string
          p256dh?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      season_rewards: {
        Row: {
          earned_at: string
          final_rank: number | null
          final_xp: number | null
          id: string
          reward_type: string
          reward_value: string
          season_id: string
          user_id: string
        }
        Insert: {
          earned_at?: string
          final_rank?: number | null
          final_xp?: number | null
          id?: string
          reward_type: string
          reward_value: string
          season_id: string
          user_id: string
        }
        Update: {
          earned_at?: string
          final_rank?: number | null
          final_xp?: number | null
          id?: string
          reward_type?: string
          reward_value?: string
          season_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "season_rewards_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "seasons"
            referencedColumns: ["id"]
          },
        ]
      }
      season_xp: {
        Row: {
          created_at: string
          current_streak: number
          id: string
          last_activity_date: string | null
          level: number
          longest_streak: number
          season_id: string
          total_xp: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          current_streak?: number
          id?: string
          last_activity_date?: string | null
          level?: number
          longest_streak?: number
          season_id: string
          total_xp?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          current_streak?: number
          id?: string
          last_activity_date?: string | null
          level?: number
          longest_streak?: number
          season_id?: string
          total_xp?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "season_xp_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "seasons"
            referencedColumns: ["id"]
          },
        ]
      }
      seasons: {
        Row: {
          border_style: string | null
          color_accent: string
          color_primary: string
          created_at: string
          end_date: string
          icon: string
          id: string
          is_active: boolean
          name: string
          quarter: number
          slug: string
          start_date: string
          theme: string
          title_reward: string | null
          xp_multiplier: number
          year: number
        }
        Insert: {
          border_style?: string | null
          color_accent?: string
          color_primary?: string
          created_at?: string
          end_date: string
          icon?: string
          id?: string
          is_active?: boolean
          name: string
          quarter: number
          slug: string
          start_date: string
          theme: string
          title_reward?: string | null
          xp_multiplier?: number
          year: number
        }
        Update: {
          border_style?: string | null
          color_accent?: string
          color_primary?: string
          created_at?: string
          end_date?: string
          icon?: string
          id?: string
          is_active?: boolean
          name?: string
          quarter?: number
          slug?: string
          start_date?: string
          theme?: string
          title_reward?: string | null
          xp_multiplier?: number
          year?: number
        }
        Relationships: []
      }
      settings: {
        Row: {
          created_at: string
          id: string
          key: string
          updated_at: string
          value: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          key: string
          updated_at?: string
          value?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          key?: string
          updated_at?: string
          value?: string | null
        }
        Relationships: []
      }
      student_achievements: {
        Row: {
          achievement_id: string
          id: string
          unlocked_at: string
          user_id: string
        }
        Insert: {
          achievement_id: string
          id?: string
          unlocked_at?: string
          user_id: string
        }
        Update: {
          achievement_id?: string
          id?: string
          unlocked_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_achievements_achievement_id_fkey"
            columns: ["achievement_id"]
            isOneToOne: false
            referencedRelation: "achievements"
            referencedColumns: ["id"]
          },
        ]
      }
      student_xp: {
        Row: {
          created_at: string
          current_streak: number
          id: string
          last_activity_date: string | null
          level: number
          longest_streak: number
          total_xp: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          current_streak?: number
          id?: string
          last_activity_date?: string | null
          level?: number
          longest_streak?: number
          total_xp?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          current_streak?: number
          id?: string
          last_activity_date?: string | null
          level?: number
          longest_streak?: number
          total_xp?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      task_templates: {
        Row: {
          belt_level: string
          category: string
          correct_option: number | null
          created_at: string
          description: string | null
          difficulty: string
          id: string
          martial_art: string
          options: Json | null
          title: string
          video_url: string | null
        }
        Insert: {
          belt_level: string
          category?: string
          correct_option?: number | null
          created_at?: string
          description?: string | null
          difficulty?: string
          id?: string
          martial_art: string
          options?: Json | null
          title: string
          video_url?: string | null
        }
        Update: {
          belt_level?: string
          category?: string
          correct_option?: number | null
          created_at?: string
          description?: string | null
          difficulty?: string
          id?: string
          martial_art?: string
          options?: Json | null
          title?: string
          video_url?: string | null
        }
        Relationships: []
      }
      tasks: {
        Row: {
          assigned_by: string
          assigned_to: string
          category: string
          completed_at: string | null
          created_at: string
          description: string | null
          due_date: string | null
          evidence_text: string | null
          id: string
          priority: string
          review_note: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          template_id: string | null
          title: string
          updated_at: string
          xp_value: number
        }
        Insert: {
          assigned_by: string
          assigned_to: string
          category?: string
          completed_at?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          evidence_text?: string | null
          id?: string
          priority?: string
          review_note?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          template_id?: string | null
          title: string
          updated_at?: string
          xp_value?: number
        }
        Update: {
          assigned_by?: string
          assigned_to?: string
          category?: string
          completed_at?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          evidence_text?: string | null
          id?: string
          priority?: string
          review_note?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          template_id?: string | null
          title?: string
          updated_at?: string
          xp_value?: number
        }
        Relationships: [
          {
            foreignKeyName: "tasks_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "task_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
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
      class_in_dojo: {
        Args: { _class_id: string; _user_id: string }
        Returns: boolean
      }
      get_active_dojos_public: {
        Args: never
        Returns: {
          id: string
          name: string
        }[]
      }
      get_dojo_by_checkin_token: {
        Args: { _token: string }
        Returns: {
          id: string
          logo_url: string
          name: string
        }[]
      }
      get_sensei_dojo_ids: { Args: { _user_id: string }; Returns: string[] }
      get_student_class_ids: {
        Args: { _student_id: string }
        Returns: string[]
      }
      get_user_dojo_id: { Args: { _user_id: string }; Returns: string }
      get_user_dojo_id_safe: { Args: { _user_id: string }; Returns: string }
      get_user_dojos: {
        Args: { _user_id: string }
        Returns: {
          address: string | null
          checkin_token: string
          color_accent: string | null
          color_primary: string | null
          color_secondary: string | null
          created_at: string | null
          daily_interest_percent: number
          description: string | null
          email: string | null
          grace_days: number
          id: string
          is_active: boolean | null
          late_fee_fixed: number
          late_fee_percent: number
          logo_url: string | null
          name: string
          phone: string | null
          pix_key: string | null
          updated_at: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "dojos"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_enrolled_in_class: {
        Args: { _class_id: string; _student_id: string }
        Returns: boolean
      }
      is_staff: { Args: { _user_id: string }; Returns: boolean }
      mark_overdue_payments: { Args: never; Returns: undefined }
      remove_user_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "super_admin" | "dono" | "admin" | "sensei" | "student"
      belt_grade:
        | "branca"
        | "bordo"
        | "cinza"
        | "azul_escura"
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
      payment_category:
        | "mensalidade"
        | "material"
        | "taxa_exame"
        | "evento"
        | "matricula"
        | "outro"
      payment_status: "pendente" | "pago" | "atrasado"
      receipt_status: "pendente_verificacao" | "aprovado" | "rejeitado"
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
      app_role: ["super_admin", "dono", "admin", "sensei", "student"],
      belt_grade: [
        "branca",
        "bordo",
        "cinza",
        "azul_escura",
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
      payment_category: [
        "mensalidade",
        "material",
        "taxa_exame",
        "evento",
        "matricula",
        "outro",
      ],
      payment_status: ["pendente", "pago", "atrasado"],
      receipt_status: ["pendente_verificacao", "aprovado", "rejeitado"],
      registration_status: ["pendente", "aprovado", "rejeitado"],
    },
  },
} as const
