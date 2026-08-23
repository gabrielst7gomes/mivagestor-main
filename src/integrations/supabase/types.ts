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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      assinaturas: {
        Row: {
          aviso_venc_1d: string | null
          aviso_venc_3d: string | null
          aviso_vencida: string | null
          created_at: string
          id: string
          metodo: string | null
          mp_preapproval_id: string | null
          periodo_fim: string | null
          periodo_inicio: string | null
          recorrencia_ativa: boolean
          status: string
          trial_fim: string | null
          ultimo_pagamento_id: string | null
          updated_at: string
          user_id: string
          valor: number
        }
        Insert: {
          aviso_venc_1d?: string | null
          aviso_venc_3d?: string | null
          aviso_vencida?: string | null
          created_at?: string
          id?: string
          metodo?: string | null
          mp_preapproval_id?: string | null
          periodo_fim?: string | null
          periodo_inicio?: string | null
          recorrencia_ativa?: boolean
          status?: string
          trial_fim?: string | null
          ultimo_pagamento_id?: string | null
          updated_at?: string
          user_id: string
          valor?: number
        }
        Update: {
          aviso_venc_1d?: string | null
          aviso_venc_3d?: string | null
          aviso_vencida?: string | null
          created_at?: string
          id?: string
          metodo?: string | null
          mp_preapproval_id?: string | null
          periodo_fim?: string | null
          periodo_inicio?: string | null
          recorrencia_ativa?: boolean
          status?: string
          trial_fim?: string | null
          ultimo_pagamento_id?: string | null
          updated_at?: string
          user_id?: string
          valor?: number
        }
        Relationships: []
      }
      cartoes: {
        Row: {
          bandeira: string | null
          cor: string | null
          created_at: string
          dia_fechamento: number | null
          dia_vencimento: number | null
          id: string
          limite: number | null
          nome: string
          ordem: number
          updated_at: string
          user_id: string
        }
        Insert: {
          bandeira?: string | null
          cor?: string | null
          created_at?: string
          dia_fechamento?: number | null
          dia_vencimento?: number | null
          id?: string
          limite?: number | null
          nome: string
          ordem?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          bandeira?: string | null
          cor?: string | null
          created_at?: string
          dia_fechamento?: number | null
          dia_vencimento?: number | null
          id?: string
          limite?: number | null
          nome?: string
          ordem?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      categorias: {
        Row: {
          created_at: string
          emoji: string
          id: string
          kind: string
          nome: string
          ordem: number
          thiing: string
          user_id: string
        }
        Insert: {
          created_at?: string
          emoji?: string
          id?: string
          kind: string
          nome: string
          ordem?: number
          thiing?: string
          user_id: string
        }
        Update: {
          created_at?: string
          emoji?: string
          id?: string
          kind?: string
          nome?: string
          ordem?: number
          thiing?: string
          user_id?: string
        }
        Relationships: []
      }
      compromissos: {
        Row: {
          concluido: boolean
          conta_id: string | null
          created_at: string
          data_hora: string
          id: string
          local: string | null
          notificado_dia_anterior: boolean
          notificado_no_dia: boolean
          observacoes: string | null
          receita_id: string | null
          titulo: string
          updated_at: string
          user_id: string
        }
        Insert: {
          concluido?: boolean
          conta_id?: string | null
          created_at?: string
          data_hora: string
          id?: string
          local?: string | null
          notificado_dia_anterior?: boolean
          notificado_no_dia?: boolean
          observacoes?: string | null
          receita_id?: string | null
          titulo: string
          updated_at?: string
          user_id: string
        }
        Update: {
          concluido?: boolean
          conta_id?: string | null
          created_at?: string
          data_hora?: string
          id?: string
          local?: string | null
          notificado_dia_anterior?: boolean
          notificado_no_dia?: boolean
          observacoes?: string | null
          receita_id?: string | null
          titulo?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "compromissos_conta_id_fkey"
            columns: ["conta_id"]
            isOneToOne: false
            referencedRelation: "contas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "compromissos_receita_id_fkey"
            columns: ["receita_id"]
            isOneToOne: false
            referencedRelation: "receitas"
            referencedColumns: ["id"]
          },
        ]
      }
      contas: {
        Row: {
          cartao_id: string | null
          categoria: string
          compra_grupo_id: string | null
          created_at: string
          data_pagamento: string | null
          data_vencimento: string
          descricao: string
          id: string
          origem_recorrente_id: string | null
          pago: boolean
          parcela_atual: number | null
          parcelas_total: number | null
          recorrente: boolean
          user_id: string
          valor: number
        }
        Insert: {
          cartao_id?: string | null
          categoria: string
          compra_grupo_id?: string | null
          created_at?: string
          data_pagamento?: string | null
          data_vencimento: string
          descricao: string
          id?: string
          origem_recorrente_id?: string | null
          pago?: boolean
          parcela_atual?: number | null
          parcelas_total?: number | null
          recorrente?: boolean
          user_id: string
          valor: number
        }
        Update: {
          cartao_id?: string | null
          categoria?: string
          compra_grupo_id?: string | null
          created_at?: string
          data_pagamento?: string | null
          data_vencimento?: string
          descricao?: string
          id?: string
          origem_recorrente_id?: string | null
          pago?: boolean
          parcela_atual?: number | null
          parcelas_total?: number | null
          recorrente?: boolean
          user_id?: string
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "contas_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      creditos_indicacao: {
        Row: {
          created_at: string
          descricao: string | null
          id: string
          indicada_id: string | null
          pagamento_id: string | null
          saque_id: string | null
          tipo: string
          user_id: string
          valor: number
        }
        Insert: {
          created_at?: string
          descricao?: string | null
          id?: string
          indicada_id?: string | null
          pagamento_id?: string | null
          saque_id?: string | null
          tipo: string
          user_id: string
          valor: number
        }
        Update: {
          created_at?: string
          descricao?: string | null
          id?: string
          indicada_id?: string | null
          pagamento_id?: string | null
          saque_id?: string | null
          tipo?: string
          user_id?: string
          valor?: number
        }
        Relationships: []
      }
      indicacoes: {
        Row: {
          codigo_usado: string
          created_at: string
          id: string
          indicada_id: string
          indicador_id: string
        }
        Insert: {
          codigo_usado: string
          created_at?: string
          id?: string
          indicada_id: string
          indicador_id: string
        }
        Update: {
          codigo_usado?: string
          created_at?: string
          id?: string
          indicada_id?: string
          indicador_id?: string
        }
        Relationships: []
      }
      pagamentos: {
        Row: {
          assinatura_id: string | null
          cobranca_ate: string | null
          cobranca_de: string | null
          created_at: string
          id: string
          metodo: string
          mp_payment_id: string | null
          mp_status: string | null
          pago_em: string | null
          pix_expires_at: string | null
          pix_qr_code: string | null
          pix_qr_code_base64: string | null
          status: string
          updated_at: string
          user_id: string
          valor: number
        }
        Insert: {
          assinatura_id?: string | null
          cobranca_ate?: string | null
          cobranca_de?: string | null
          created_at?: string
          id?: string
          metodo: string
          mp_payment_id?: string | null
          mp_status?: string | null
          pago_em?: string | null
          pix_expires_at?: string | null
          pix_qr_code?: string | null
          pix_qr_code_base64?: string | null
          status?: string
          updated_at?: string
          user_id: string
          valor: number
        }
        Update: {
          assinatura_id?: string | null
          cobranca_ate?: string | null
          cobranca_de?: string | null
          created_at?: string
          id?: string
          metodo?: string
          mp_payment_id?: string | null
          mp_status?: string | null
          pago_em?: string | null
          pix_expires_at?: string | null
          pix_qr_code?: string | null
          pix_qr_code_base64?: string | null
          status?: string
          updated_at?: string
          user_id?: string
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "pagamentos_assinatura_id_fkey"
            columns: ["assinatura_id"]
            isOneToOne: false
            referencedRelation: "assinaturas"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          codigo_indicacao: string | null
          created_at: string
          id: string
          indicado_por: string | null
          nome: string | null
          tutorial_concluido: boolean
          whatsapp: string | null
        }
        Insert: {
          avatar_url?: string | null
          codigo_indicacao?: string | null
          created_at?: string
          id: string
          indicado_por?: string | null
          nome?: string | null
          tutorial_concluido?: boolean
          whatsapp?: string | null
        }
        Update: {
          avatar_url?: string | null
          codigo_indicacao?: string | null
          created_at?: string
          id?: string
          indicado_por?: string | null
          nome?: string | null
          tutorial_concluido?: boolean
          whatsapp?: string | null
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          id: string
          p256dh: string
          updated_at: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          id?: string
          p256dh: string
          updated_at?: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          id?: string
          p256dh?: string
          updated_at?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      receitas: {
        Row: {
          categoria: string | null
          created_at: string
          data_recebimento: string
          descricao: string
          id: string
          tipo: string
          user_id: string
          valor: number
        }
        Insert: {
          categoria?: string | null
          created_at?: string
          data_recebimento: string
          descricao: string
          id?: string
          tipo: string
          user_id: string
          valor: number
        }
        Update: {
          categoria?: string | null
          created_at?: string
          data_recebimento?: string
          descricao?: string
          id?: string
          tipo?: string
          user_id?: string
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "receitas_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      reserva_movimentos: {
        Row: {
          created_at: string
          data: string
          id: string
          observacao: string | null
          reserva_id: string
          tipo: string
          user_id: string
          valor: number
        }
        Insert: {
          created_at?: string
          data?: string
          id?: string
          observacao?: string | null
          reserva_id: string
          tipo?: string
          user_id: string
          valor: number
        }
        Update: {
          created_at?: string
          data?: string
          id?: string
          observacao?: string | null
          reserva_id?: string
          tipo?: string
          user_id?: string
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "reserva_movimentos_reserva_id_fkey"
            columns: ["reserva_id"]
            isOneToOne: false
            referencedRelation: "reservas"
            referencedColumns: ["id"]
          },
        ]
      }
      reservas: {
        Row: {
          cor: string | null
          created_at: string
          id: string
          meta: number | null
          nome: string
          ordem: number
          tipo: string
          updated_at: string
          user_id: string
        }
        Insert: {
          cor?: string | null
          created_at?: string
          id?: string
          meta?: number | null
          nome: string
          ordem?: number
          tipo?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          cor?: string | null
          created_at?: string
          id?: string
          meta?: number | null
          nome?: string
          ordem?: number
          tipo?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      saques: {
        Row: {
          chave_pix: string
          created_at: string
          id: string
          observacao_admin: string | null
          pago_em: string | null
          status: string
          tipo_chave: string
          updated_at: string
          user_id: string
          valor: number
        }
        Insert: {
          chave_pix: string
          created_at?: string
          id?: string
          observacao_admin?: string | null
          pago_em?: string | null
          status?: string
          tipo_chave: string
          updated_at?: string
          user_id: string
          valor: number
        }
        Update: {
          chave_pix?: string
          created_at?: string
          id?: string
          observacao_admin?: string | null
          pago_em?: string | null
          status?: string
          tipo_chave?: string
          updated_at?: string
          user_id?: string
          valor?: number
        }
        Relationships: []
      }
      system_settings: {
        Row: {
          chave: string
          updated_at: string
          valor: Json
        }
        Insert: {
          chave: string
          updated_at?: string
          valor: Json
        }
        Update: {
          chave?: string
          updated_at?: string
          valor?: Json
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
      admin_ativar_plano: {
        Args: { _dias: number; _user_id: string }
        Returns: undefined
      }
      admin_atualizar_saque: {
        Args: { _novo_status: string; _observacao?: string; _saque_id: string }
        Returns: undefined
      }
      admin_cancelar_plano: { Args: { _user_id: string }; Returns: undefined }
      admin_estender_trial: {
        Args: { _dias: number; _user_id: string }
        Returns: undefined
      }
      admin_listar_pagamentos: {
        Args: never
        Returns: {
          cobranca_ate: string
          cobranca_de: string
          created_at: string
          email: string
          id: string
          metodo: string
          nome: string
          pago_em: string
          status: string
          user_id: string
          valor: number
        }[]
      }
      admin_listar_saques: {
        Args: never
        Returns: {
          chave_pix: string
          created_at: string
          email: string
          id: string
          nome: string
          observacao_admin: string
          pago_em: string
          status: string
          tipo_chave: string
          user_id: string
          valor: number
        }[]
      }
      admin_listar_usuarias: {
        Args: never
        Returns: {
          avatar_url: string
          criado_em: string
          email: string
          id: string
          metodo: string
          nome: string
          periodo_fim: string
          periodo_inicio: string
          status: string
          total_pago: number
          trial_fim: string
          valor: number
          whatsapp: string
        }[]
      }
      admin_stats: { Args: never; Returns: Json }
      aplicar_credito_indicacao: {
        Args: { _pagamento_id: string }
        Returns: undefined
      }
      aplicar_saldo_em_pagamento: {
        Args: { _pagamento_id: string; _valor_solicitado: number }
        Returns: number
      }
      dias_restantes: { Args: { _user_id: string }; Returns: number }
      gerar_codigo_indicacao: { Args: never; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: never; Returns: boolean }
      replicar_recorrentes: {
        Args: { _ano: number; _mes: number; _user_id: string }
        Returns: undefined
      }
      saldo_cartao: { Args: { _cartao_id: string }; Returns: number }
      saldo_indicacao: { Args: { _user_id: string }; Returns: number }
      seed_categorias_padrao: { Args: { _user_id: string }; Returns: undefined }
      solicitar_saque: {
        Args: { _chave_pix: string; _tipo_chave: string; _valor: number }
        Returns: string
      }
      tem_acesso: { Args: { _user_id: string }; Returns: boolean }
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
