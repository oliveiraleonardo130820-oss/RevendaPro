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
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      clients: {
        Row: {
          bairro: string | null
          cpf: string | null
          created_at: string
          email: string | null
          id: string
          loja_id: string | null
          name: string
          numero: string | null
          phone: string
          rua: string | null
          total_purchases: number
          updated_at: string
          user_id: string
        }
        Insert: {
          bairro?: string | null
          cpf?: string | null
          created_at?: string
          email?: string | null
          id?: string
          loja_id?: string | null
          name: string
          numero?: string | null
          phone: string
          rua?: string | null
          total_purchases?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          bairro?: string | null
          cpf?: string | null
          created_at?: string
          email?: string | null
          id?: string
          loja_id?: string | null
          name?: string
          numero?: string | null
          phone?: string
          rua?: string | null
          total_purchases?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "clients_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      crediario_vendas: {
        Row: {
          client_id: string | null
          created_at: string
          data_venda: string
          desconto: number | null
          dia_vencimento: number
          id: string
          loja_id: string | null
          numero_parcelas: number
          observacoes: string | null
          produto_id: string | null
          produtos: Json | null
          status: string
          updated_at: string
          user_id: string
          valor_entrada: number
          valor_restante: number
          valor_total: number
        }
        Insert: {
          client_id?: string | null
          created_at?: string
          data_venda?: string
          desconto?: number | null
          dia_vencimento: number
          id?: string
          loja_id?: string | null
          numero_parcelas: number
          observacoes?: string | null
          produto_id?: string | null
          produtos?: Json | null
          status?: string
          updated_at?: string
          user_id: string
          valor_entrada?: number
          valor_restante: number
          valor_total: number
        }
        Update: {
          client_id?: string | null
          created_at?: string
          data_venda?: string
          desconto?: number | null
          dia_vencimento?: number
          id?: string
          loja_id?: string | null
          numero_parcelas?: number
          observacoes?: string | null
          produto_id?: string | null
          produtos?: Json | null
          status?: string
          updated_at?: string
          user_id?: string
          valor_entrada?: number
          valor_restante?: number
          valor_total?: number
        }
        Relationships: [
          {
            foreignKeyName: "crediario_vendas_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crediario_vendas_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      despesas: {
        Row: {
          created_at: string
          data: string
          id: string
          loja_id: string | null
          nome: string
          updated_at: string
          user_id: string
          valor: number
        }
        Insert: {
          created_at?: string
          data?: string
          id?: string
          loja_id?: string | null
          nome: string
          updated_at?: string
          user_id: string
          valor: number
        }
        Update: {
          created_at?: string
          data?: string
          id?: string
          loja_id?: string | null
          nome?: string
          updated_at?: string
          user_id?: string
          valor?: number
        }
        Relationships: []
      }
      funcionarios: {
        Row: {
          ativo: boolean
          created_at: string
          email: string
          id: string
          loja_id: string
          nome: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          email: string
          id?: string
          loja_id: string
          nome: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          ativo?: boolean
          created_at?: string
          email?: string
          id?: string
          loja_id?: string
          nome?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "funcionarios_loja_id_fkey"
            columns: ["loja_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      lojas: {
        Row: {
          bairro: string | null
          cidade: string | null
          created_at: string
          id: string
          nome: string
          numero: string | null
          plano: string
          rua: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          bairro?: string | null
          cidade?: string | null
          created_at?: string
          id?: string
          nome: string
          numero?: string | null
          plano?: string
          rua?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          bairro?: string | null
          cidade?: string | null
          created_at?: string
          id?: string
          nome?: string
          numero?: string | null
          plano?: string
          rua?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      monthly_goals: {
        Row: {
          created_at: string
          goal_amount: number
          id: string
          loja_id: string | null
          month: number
          user_id: string
          year: number
        }
        Insert: {
          created_at?: string
          goal_amount?: number
          id?: string
          loja_id?: string | null
          month: number
          user_id: string
          year: number
        }
        Update: {
          created_at?: string
          goal_amount?: number
          id?: string
          loja_id?: string | null
          month?: number
          user_id?: string
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "monthly_goals_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      pagamentos_parcela: {
        Row: {
          created_at: string
          data_pagamento: string
          id: string
          observacoes: string | null
          parcela_id: string
          tipo_parcela: string
          updated_at: string
          user_id: string
          valor_pagamento: number
        }
        Insert: {
          created_at?: string
          data_pagamento: string
          id?: string
          observacoes?: string | null
          parcela_id: string
          tipo_parcela: string
          updated_at?: string
          user_id: string
          valor_pagamento: number
        }
        Update: {
          created_at?: string
          data_pagamento?: string
          id?: string
          observacoes?: string | null
          parcela_id?: string
          tipo_parcela?: string
          updated_at?: string
          user_id?: string
          valor_pagamento?: number
        }
        Relationships: []
      }
      parcelas_crediario: {
        Row: {
          created_at: string
          crediario_venda_id: string
          data_pagamento: string | null
          data_valor_pago: string | null
          data_vencimento: string
          id: string
          loja_id: string | null
          numero_parcela: number
          observacoes: string | null
          status: string
          tipo: string
          updated_at: string
          user_id: string
          valor_pago: number | null
          valor_parcela: number
        }
        Insert: {
          created_at?: string
          crediario_venda_id: string
          data_pagamento?: string | null
          data_valor_pago?: string | null
          data_vencimento: string
          id?: string
          loja_id?: string | null
          numero_parcela: number
          observacoes?: string | null
          status?: string
          tipo?: string
          updated_at?: string
          user_id: string
          valor_pago?: number | null
          valor_parcela: number
        }
        Update: {
          created_at?: string
          crediario_venda_id?: string
          data_pagamento?: string | null
          data_valor_pago?: string | null
          data_vencimento?: string
          id?: string
          loja_id?: string | null
          numero_parcela?: number
          observacoes?: string | null
          status?: string
          tipo?: string
          updated_at?: string
          user_id?: string
          valor_pago?: number | null
          valor_parcela?: number
        }
        Relationships: [
          {
            foreignKeyName: "parcelas_crediario_crediario_venda_id_fkey"
            columns: ["crediario_venda_id"]
            isOneToOne: false
            referencedRelation: "crediario_vendas"
            referencedColumns: ["id"]
          },
        ]
      }
      parcelas_venda: {
        Row: {
          created_at: string
          data_de_vencimento: string
          data_pagamento: string | null
          id: string
          loja_id: string | null
          numero_da_parcela: number
          numero_venda: string | null
          status: string
          updated_at: string
          user_id: string
          valor_da_parcela: number
          valor_pago: number | null
          venda_id: string
        }
        Insert: {
          created_at?: string
          data_de_vencimento: string
          data_pagamento?: string | null
          id?: string
          loja_id?: string | null
          numero_da_parcela: number
          numero_venda?: string | null
          status?: string
          updated_at?: string
          user_id: string
          valor_da_parcela: number
          valor_pago?: number | null
          venda_id: string
        }
        Update: {
          created_at?: string
          data_de_vencimento?: string
          data_pagamento?: string | null
          id?: string
          loja_id?: string | null
          numero_da_parcela?: number
          numero_venda?: string | null
          status?: string
          updated_at?: string
          user_id?: string
          valor_da_parcela?: number
          valor_pago?: number | null
          venda_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "parcelas_venda_venda_id_fkey"
            columns: ["venda_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          commission: number
          created_at: string
          estoque: number
          id: string
          loja_id: string | null
          name: string
          unit_price: number
          updated_at: string
          user_id: string
        }
        Insert: {
          commission: number
          created_at?: string
          estoque?: number
          id?: string
          loja_id?: string | null
          name: string
          unit_price: number
          updated_at?: string
          user_id: string
        }
        Update: {
          commission?: number
          created_at?: string
          estoque?: number
          id?: string
          loja_id?: string | null
          name?: string
          unit_price?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          ativo: boolean
          bairro: string | null
          cidade: string | null
          codigo_convite: string | null
          convidado_por: string | null
          created_at: string
          data_assinatura: string | null
          data_expiracao_assinatura: string | null
          email: string
          id: string
          loja_id: string | null
          name: string
          nome_loja: string | null
          numero: string | null
          plan: string
          ramo_atividade: string | null
          rua: string | null
          stripe_customer_id: string | null
          telefone: string | null
          tipo_usuario: string | null
          updated_at: string
          whatsapp: string | null
        }
        Insert: {
          ativo?: boolean
          bairro?: string | null
          cidade?: string | null
          codigo_convite?: string | null
          convidado_por?: string | null
          created_at?: string
          data_assinatura?: string | null
          data_expiracao_assinatura?: string | null
          email: string
          id: string
          loja_id?: string | null
          name: string
          nome_loja?: string | null
          numero?: string | null
          plan?: string
          ramo_atividade?: string | null
          rua?: string | null
          stripe_customer_id?: string | null
          telefone?: string | null
          tipo_usuario?: string | null
          updated_at?: string
          whatsapp?: string | null
        }
        Update: {
          ativo?: boolean
          bairro?: string | null
          cidade?: string | null
          codigo_convite?: string | null
          convidado_por?: string | null
          created_at?: string
          data_assinatura?: string | null
          data_expiracao_assinatura?: string | null
          email?: string
          id?: string
          loja_id?: string | null
          name?: string
          nome_loja?: string | null
          numero?: string | null
          plan?: string
          ramo_atividade?: string | null
          rua?: string | null
          stripe_customer_id?: string | null
          telefone?: string | null
          tipo_usuario?: string | null
          updated_at?: string
          whatsapp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_loja_id_fkey"
            columns: ["loja_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      sale_items: {
        Row: {
          created_at: string
          id: string
          numero_venda: string | null
          product_id: string
          quantity: number
          sale_id: string
          total_price: number
          unit_price: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          numero_venda?: string | null
          product_id: string
          quantity: number
          sale_id: string
          total_price: number
          unit_price: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          numero_venda?: string | null
          product_id?: string
          quantity?: number
          sale_id?: string
          total_price?: number
          unit_price?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      sales: {
        Row: {
          client_id: string | null
          commission: number
          created_at: string
          desconto: number | null
          due_date: string | null
          id: string
          is_multi_product: boolean | null
          juros_parcelamento: number | null
          loja_id: string | null
          numero_venda: string | null
          observacoes: string | null
          payment_method: string | null
          product_id: string
          quantity: number
          sale_date: string
          sale_group_id: string | null
          total_value: number
          unit_price: number
          user_id: string
        }
        Insert: {
          client_id?: string | null
          commission: number
          created_at?: string
          desconto?: number | null
          due_date?: string | null
          id?: string
          is_multi_product?: boolean | null
          juros_parcelamento?: number | null
          loja_id?: string | null
          numero_venda?: string | null
          observacoes?: string | null
          payment_method?: string | null
          product_id: string
          quantity: number
          sale_date: string
          sale_group_id?: string | null
          total_value: number
          unit_price: number
          user_id: string
        }
        Update: {
          client_id?: string | null
          commission?: number
          created_at?: string
          desconto?: number | null
          due_date?: string | null
          id?: string
          is_multi_product?: boolean | null
          juros_parcelamento?: number | null
          loja_id?: string | null
          numero_venda?: string | null
          observacoes?: string | null
          payment_method?: string | null
          product_id?: string
          quantity?: number
          sale_date?: string
          sale_group_id?: string | null
          total_value?: number
          unit_price?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sales_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      subscribers: {
        Row: {
          created_at: string
          email: string
          id: string
          stripe_customer_id: string | null
          subscribed: boolean
          subscription_end: string | null
          subscription_tier: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          stripe_customer_id?: string | null
          subscribed?: boolean
          subscription_end?: string | null
          subscription_tier?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          stripe_customer_id?: string | null
          subscribed?: boolean
          subscription_end?: string | null
          subscription_tier?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      check_expired_subscriptions: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      generate_next_sale_number: {
        Args: Record<PropertyKey, never> | { p_user_id: string }
        Returns: string
      }
      generate_referral_code: {
        Args: { user_name: string }
        Returns: string
      }
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
