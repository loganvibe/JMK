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
      activity_log: {
        Row: {
          action: string
          created_at: string
          description: string | null
          entity_id: string | null
          entity_type: string | null
          id: string
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string
          description?: string | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string
          description?: string | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      ai_usage: {
        Row: {
          created_at: string
          credits_limit: number
          credits_used: number
          id: string
          month: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          credits_limit?: number
          credits_used?: number
          id?: string
          month?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          credits_limit?: number
          credits_used?: number
          id?: string
          month?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      ai_usage_logs: {
        Row: {
          created_at: string
          credits_used: number
          feature: string
          id: string
          project_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          credits_used?: number
          feature: string
          id?: string
          project_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          credits_used?: number
          feature?: string
          id?: string
          project_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_usage_logs_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      app_settings: {
        Row: {
          created_at: string
          free_mode_message: string | null
          id: string
          payments_enabled: boolean
          pricing_mode: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          free_mode_message?: string | null
          id?: string
          payments_enabled?: boolean
          pricing_mode?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          free_mode_message?: string | null
          id?: string
          payments_enabled?: boolean
          pricing_mode?: string
          updated_at?: string
        }
        Relationships: []
      }
      courses: {
        Row: {
          code: string | null
          created_at: string
          department_id: string | null
          id: string
          level: string | null
          name: string
        }
        Insert: {
          code?: string | null
          created_at?: string
          department_id?: string | null
          id?: string
          level?: string | null
          name: string
        }
        Update: {
          code?: string | null
          created_at?: string
          department_id?: string | null
          id?: string
          level?: string | null
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "courses_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
      data_analyses: {
        Row: {
          created_at: string
          findings: Json
          id: string
          method: string | null
          model: string | null
          narrative: string | null
          project_id: string
          raw_input: string | null
          tables: Json
          title: string
          user_id: string
        }
        Insert: {
          created_at?: string
          findings?: Json
          id?: string
          method?: string | null
          model?: string | null
          narrative?: string | null
          project_id: string
          raw_input?: string | null
          tables?: Json
          title?: string
          user_id: string
        }
        Update: {
          created_at?: string
          findings?: Json
          id?: string
          method?: string | null
          model?: string | null
          narrative?: string | null
          project_id?: string
          raw_input?: string | null
          tables?: Json
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "data_analyses_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      defense_question_bank: {
        Row: {
          category: string
          created_at: string
          department: string | null
          difficulty: string
          id: string
          question: string
          sample_answer: string | null
          updated_at: string
        }
        Insert: {
          category: string
          created_at?: string
          department?: string | null
          difficulty?: string
          id?: string
          question: string
          sample_answer?: string | null
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          department?: string | null
          difficulty?: string
          id?: string
          question?: string
          sample_answer?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      defense_sessions: {
        Row: {
          answers: Json
          created_at: string
          feedback: Json | null
          id: string
          project_id: string
          questions: Json
          score: number | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          answers?: Json
          created_at?: string
          feedback?: Json | null
          id?: string
          project_id: string
          questions?: Json
          score?: number | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          answers?: Json
          created_at?: string
          feedback?: Json | null
          id?: string
          project_id?: string
          questions?: Json
          score?: number | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "defense_sessions_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      defense_summaries: {
        Row: {
          content: Json
          created_at: string
          id: string
          project_id: string
          summary_type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          content?: Json
          created_at?: string
          id?: string
          project_id: string
          summary_type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: Json
          created_at?: string
          id?: string
          project_id?: string
          summary_type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "defense_summaries_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      departments: {
        Row: {
          ai_guidance: string | null
          common_methodologies: string[] | null
          created_at: string
          description: string | null
          faculty_id: string | null
          id: string
          name: string
          specializations: string[] | null
        }
        Insert: {
          ai_guidance?: string | null
          common_methodologies?: string[] | null
          created_at?: string
          description?: string | null
          faculty_id?: string | null
          id?: string
          name: string
          specializations?: string[] | null
        }
        Update: {
          ai_guidance?: string | null
          common_methodologies?: string[] | null
          created_at?: string
          description?: string | null
          faculty_id?: string | null
          id?: string
          name?: string
          specializations?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "departments_faculty_id_fkey"
            columns: ["faculty_id"]
            isOneToOne: false
            referencedRelation: "faculties"
            referencedColumns: ["id"]
          },
        ]
      }
      error_logs: {
        Row: {
          created_at: string
          details: Json
          id: string
          message: string
          scope: string
          severity: string
          source: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          details?: Json
          id?: string
          message: string
          scope: string
          severity?: string
          source?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          details?: Json
          id?: string
          message?: string
          scope?: string
          severity?: string
          source?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      faculties: {
        Row: {
          created_at: string
          id: string
          name: string
          university_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          university_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          university_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "faculties_university_id_fkey"
            columns: ["university_id"]
            isOneToOne: false
            referencedRelation: "universities"
            referencedColumns: ["id"]
          },
        ]
      }
      literature_sources: {
        Row: {
          authors: string | null
          citation: string | null
          created_at: string
          id: string
          project_id: string
          relevance: string | null
          summary: string | null
          title: string
          url: string | null
          user_id: string
          venue: string | null
          year: string | null
        }
        Insert: {
          authors?: string | null
          citation?: string | null
          created_at?: string
          id?: string
          project_id: string
          relevance?: string | null
          summary?: string | null
          title: string
          url?: string | null
          user_id: string
          venue?: string | null
          year?: string | null
        }
        Update: {
          authors?: string | null
          citation?: string | null
          created_at?: string
          id?: string
          project_id?: string
          relevance?: string | null
          summary?: string | null
          title?: string
          url?: string | null
          user_id?: string
          venue?: string | null
          year?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "literature_sources_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          id: string
          link: string | null
          read: boolean
          title: string
          type: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          link?: string | null
          read?: boolean
          title: string
          type?: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          link?: string | null
          read?: boolean
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      originality_reports: {
        Row: {
          ai_likelihood: number
          chapter: string | null
          created_at: string
          flagged: Json
          id: string
          model: string | null
          originality_score: number
          project_id: string
          section_type: string | null
          suggestions: Json
          user_id: string
          verdict: string | null
        }
        Insert: {
          ai_likelihood?: number
          chapter?: string | null
          created_at?: string
          flagged?: Json
          id?: string
          model?: string | null
          originality_score?: number
          project_id: string
          section_type?: string | null
          suggestions?: Json
          user_id: string
          verdict?: string | null
        }
        Update: {
          ai_likelihood?: number
          chapter?: string | null
          created_at?: string
          flagged?: Json
          id?: string
          model?: string | null
          originality_score?: number
          project_id?: string
          section_type?: string | null
          suggestions?: Json
          user_id?: string
          verdict?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "originality_reports_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_transactions: {
        Row: {
          amount: number
          created_at: string
          currency: string
          id: string
          metadata: Json
          provider: string
          reference: string
          status: string
          transaction_type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          currency?: string
          id?: string
          metadata?: Json
          provider: string
          reference: string
          status?: string
          transaction_type?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string
          id?: string
          metadata?: Json
          provider?: string
          reference?: string
          status?: string
          transaction_type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          academic_level: string | null
          avatar_url: string | null
          course: string | null
          created_at: string
          department: string | null
          email: string | null
          faculty: string | null
          full_name: string | null
          graduation_year: number | null
          id: string
          preferred_model: string
          university: string | null
          updated_at: string
        }
        Insert: {
          academic_level?: string | null
          avatar_url?: string | null
          course?: string | null
          created_at?: string
          department?: string | null
          email?: string | null
          faculty?: string | null
          full_name?: string | null
          graduation_year?: number | null
          id: string
          preferred_model?: string
          university?: string | null
          updated_at?: string
        }
        Update: {
          academic_level?: string | null
          avatar_url?: string | null
          course?: string | null
          created_at?: string
          department?: string | null
          email?: string | null
          faculty?: string | null
          full_name?: string | null
          graduation_year?: number | null
          id?: string
          preferred_model?: string
          university?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      project_ai_history: {
        Row: {
          action: string | null
          ai_response: string | null
          chapter: string | null
          created_at: string
          id: string
          project_id: string
          section_type: string | null
          user_id: string
          user_request: string | null
        }
        Insert: {
          action?: string | null
          ai_response?: string | null
          chapter?: string | null
          created_at?: string
          id?: string
          project_id: string
          section_type?: string | null
          user_id: string
          user_request?: string | null
        }
        Update: {
          action?: string | null
          ai_response?: string | null
          chapter?: string | null
          created_at?: string
          id?: string
          project_id?: string
          section_type?: string | null
          user_id?: string
          user_request?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "project_ai_history_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_checklists: {
        Row: {
          checklist_item: string
          completed: boolean
          created_at: string
          id: string
          project_id: string
          sort_order: number
          updated_at: string
          user_id: string
        }
        Insert: {
          checklist_item: string
          completed?: boolean
          created_at?: string
          id?: string
          project_id: string
          sort_order?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          checklist_item?: string
          completed?: boolean
          created_at?: string
          id?: string
          project_id?: string
          sort_order?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_checklists_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_citations: {
        Row: {
          created_at: string
          formatted: string
          id: string
          metadata: Json | null
          project_id: string | null
          source_type: string | null
          style: string
          user_id: string
        }
        Insert: {
          created_at?: string
          formatted: string
          id?: string
          metadata?: Json | null
          project_id?: string | null
          source_type?: string | null
          style?: string
          user_id: string
        }
        Update: {
          created_at?: string
          formatted?: string
          id?: string
          metadata?: Json | null
          project_id?: string | null
          source_type?: string | null
          style?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_citations_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_collaborators: {
        Row: {
          created_at: string
          email: string
          id: string
          owner_id: string
          project_id: string
          role: string
          status: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          owner_id: string
          project_id: string
          role?: string
          status?: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          owner_id?: string
          project_id?: string
          role?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_collaborators_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_comments: {
        Row: {
          author_email: string | null
          author_id: string
          body: string
          chapter: string | null
          created_at: string
          id: string
          project_id: string
          resolved: boolean
          section_type: string | null
        }
        Insert: {
          author_email?: string | null
          author_id: string
          body: string
          chapter?: string | null
          created_at?: string
          id?: string
          project_id: string
          resolved?: boolean
          section_type?: string | null
        }
        Update: {
          author_email?: string | null
          author_id?: string
          body?: string
          chapter?: string | null
          created_at?: string
          id?: string
          project_id?: string
          resolved?: boolean
          section_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "project_comments_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_documents: {
        Row: {
          analysis: Json | null
          created_at: string
          extracted_content: string | null
          file_name: string
          file_size: number | null
          file_type: string | null
          file_url: string
          id: string
          project_id: string | null
          updated_at: string
          upload_status: string
          user_id: string
        }
        Insert: {
          analysis?: Json | null
          created_at?: string
          extracted_content?: string | null
          file_name: string
          file_size?: number | null
          file_type?: string | null
          file_url: string
          id?: string
          project_id?: string | null
          updated_at?: string
          upload_status?: string
          user_id: string
        }
        Update: {
          analysis?: Json | null
          created_at?: string
          extracted_content?: string | null
          file_name?: string
          file_size?: number | null
          file_type?: string | null
          file_url?: string
          id?: string
          project_id?: string | null
          updated_at?: string
          upload_status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_documents_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_memory: {
        Row: {
          citation_style: string | null
          formatting_preference: string | null
          id: string
          memory: Json | null
          notes: string | null
          project_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          citation_style?: string | null
          formatting_preference?: string | null
          id?: string
          memory?: Json | null
          notes?: string | null
          project_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          citation_style?: string | null
          formatting_preference?: string | null
          id?: string
          memory?: Json | null
          notes?: string | null
          project_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_memory_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: true
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_refinement_requests: {
        Row: {
          created_at: string
          document_id: string | null
          id: string
          project_id: string | null
          refinement_status: string
          updated_at: string
          user_answers: Json
          user_id: string
        }
        Insert: {
          created_at?: string
          document_id?: string | null
          id?: string
          project_id?: string | null
          refinement_status?: string
          updated_at?: string
          user_answers?: Json
          user_id: string
        }
        Update: {
          created_at?: string
          document_id?: string | null
          id?: string
          project_id?: string | null
          refinement_status?: string
          updated_at?: string
          user_answers?: Json
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_refinement_requests_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "project_documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_refinement_requests_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_section_versions: {
        Row: {
          change_summary: string | null
          created_at: string
          id: string
          new_content: string | null
          old_content: string | null
          project_id: string | null
          section_id: string | null
          source: string | null
          user_id: string
        }
        Insert: {
          change_summary?: string | null
          created_at?: string
          id?: string
          new_content?: string | null
          old_content?: string | null
          project_id?: string | null
          section_id?: string | null
          source?: string | null
          user_id: string
        }
        Update: {
          change_summary?: string | null
          created_at?: string
          id?: string
          new_content?: string | null
          old_content?: string | null
          project_id?: string | null
          section_id?: string | null
          source?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_section_versions_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_section_versions_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "project_sections"
            referencedColumns: ["id"]
          },
        ]
      }
      project_sections: {
        Row: {
          chapter: string
          content: string | null
          created_at: string
          id: string
          order_index: number
          project_id: string
          section_type: string
          status: string
          title: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          chapter: string
          content?: string | null
          created_at?: string
          id?: string
          order_index?: number
          project_id: string
          section_type: string
          status?: string
          title?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          chapter?: string
          content?: string | null
          created_at?: string
          id?: string
          order_index?: number
          project_id?: string
          section_type?: string
          status?: string
          title?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_sections_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          abstract: string | null
          chapters_completed: number
          course: string | null
          created_at: string
          department: string | null
          description: string | null
          difficulty_level: string | null
          expected_outcome: string | null
          id: string
          methodology: string | null
          notes: string | null
          objectives: string | null
          problem_statement: string | null
          progress: Json
          progress_percent: number
          project_area: string | null
          project_type: string | null
          research_field: string | null
          research_questions: string | null
          scope: string | null
          status: string
          title: string
          topic: string | null
          topic_type: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          abstract?: string | null
          chapters_completed?: number
          course?: string | null
          created_at?: string
          department?: string | null
          description?: string | null
          difficulty_level?: string | null
          expected_outcome?: string | null
          id?: string
          methodology?: string | null
          notes?: string | null
          objectives?: string | null
          problem_statement?: string | null
          progress?: Json
          progress_percent?: number
          project_area?: string | null
          project_type?: string | null
          research_field?: string | null
          research_questions?: string | null
          scope?: string | null
          status?: string
          title: string
          topic?: string | null
          topic_type?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          abstract?: string | null
          chapters_completed?: number
          course?: string | null
          created_at?: string
          department?: string | null
          description?: string | null
          difficulty_level?: string | null
          expected_outcome?: string | null
          id?: string
          methodology?: string | null
          notes?: string | null
          objectives?: string | null
          problem_statement?: string | null
          progress?: Json
          progress_percent?: number
          project_area?: string | null
          project_type?: string | null
          research_field?: string | null
          research_questions?: string | null
          scope?: string | null
          status?: string
          title?: string
          topic?: string | null
          topic_type?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      research_fields: {
        Row: {
          created_at: string
          department_hint: string | null
          description: string | null
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          department_hint?: string | null
          description?: string | null
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          department_hint?: string | null
          description?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      service_orders: {
        Row: {
          amount: number
          created_at: string
          id: string
          order_status: string
          payment_reference: string | null
          payment_status: string
          request_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          order_status?: string
          payment_reference?: string | null
          payment_status?: string
          request_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          order_status?: string
          payment_reference?: string | null
          payment_status?: string
          request_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_orders_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "service_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      service_requests: {
        Row: {
          admin_note: string | null
          admin_price: number | null
          category: string
          created_at: string
          deadline: string | null
          department: string | null
          description: string
          file_urls: Json
          id: string
          requirements: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_note?: string | null
          admin_price?: number | null
          category: string
          created_at?: string
          deadline?: string | null
          department?: string | null
          description: string
          file_urls?: Json
          id?: string
          requirements?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_note?: string | null
          admin_price?: number | null
          category?: string
          created_at?: string
          deadline?: string | null
          department?: string | null
          description?: string
          file_urls?: Json
          id?: string
          requirements?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      subscription_plans: {
        Row: {
          active: boolean
          ai_limits: Json
          created_at: string
          currency: string
          description: string | null
          features: Json
          id: string
          name: string
          price: number
          slug: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          active?: boolean
          ai_limits?: Json
          created_at?: string
          currency?: string
          description?: string | null
          features?: Json
          id?: string
          name: string
          price?: number
          slug: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          active?: boolean
          ai_limits?: Json
          created_at?: string
          currency?: string
          description?: string | null
          features?: Json
          id?: string
          name?: string
          price?: number
          slug?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          created_at: string
          expires_at: string | null
          id: string
          provider: string | null
          status: string
          tier: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          expires_at?: string | null
          id?: string
          provider?: string | null
          status?: string
          tier?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string | null
          id?: string
          provider?: string | null
          status?: string
          tier?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      supervisor_feedback: {
        Row: {
          analysis: Json | null
          created_at: string
          id: string
          project_id: string | null
          raw_feedback: string
          source: string | null
          user_id: string
        }
        Insert: {
          analysis?: Json | null
          created_at?: string
          id?: string
          project_id?: string | null
          raw_feedback: string
          source?: string | null
          user_id: string
        }
        Update: {
          analysis?: Json | null
          created_at?: string
          id?: string
          project_id?: string | null
          raw_feedback?: string
          source?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "supervisor_feedback_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      universities: {
        Row: {
          city: string | null
          country: string | null
          created_at: string
          formatting_preferences: Json | null
          id: string
          name: string
          short_name: string | null
          type: string | null
          updated_at: string
        }
        Insert: {
          city?: string | null
          country?: string | null
          created_at?: string
          formatting_preferences?: Json | null
          id?: string
          name: string
          short_name?: string | null
          type?: string | null
          updated_at?: string
        }
        Update: {
          city?: string | null
          country?: string | null
          created_at?: string
          formatting_preferences?: Json | null
          id?: string
          name?: string
          short_name?: string | null
          type?: string | null
          updated_at?: string
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
      user_subscriptions: {
        Row: {
          created_at: string
          expiry_date: string | null
          id: string
          payment_reference: string | null
          plan_id: string
          start_date: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          expiry_date?: string | null
          id?: string
          payment_reference?: string | null
          plan_id: string
          start_date?: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          expiry_date?: string | null
          id?: string
          payment_reference?: string | null
          plan_id?: string
          start_date?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "subscription_plans"
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
      app_role: "admin" | "user"
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
      app_role: ["admin", "user"],
    },
  },
} as const
