export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      user_profiles: {
        Row: {
          id: string;
          full_name: string | null;
          phone: string | null;
          avatar_url: string | null;
          points_balance: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          full_name?: string | null;
          phone?: string | null;
          avatar_url?: string | null;
          points_balance?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          full_name?: string | null;
          phone?: string | null;
          avatar_url?: string | null;
          points_balance?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
      addresses: {
        Row: {
          id: string;
          user_id: string;
          label: string | null;
          street: string | null;
          ext_no: string | null;
          int_no: string | null;
          neighborhood: string | null;
          city: string | null;
          state: string | null;
          zip: string | null;
          is_default: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          label?: string | null;
          street?: string | null;
          ext_no?: string | null;
          int_no?: string | null;
          neighborhood?: string | null;
          city?: string | null;
          state?: string | null;
          zip?: string | null;
          is_default?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          label?: string | null;
          street?: string | null;
          ext_no?: string | null;
          int_no?: string | null;
          neighborhood?: string | null;
          city?: string | null;
          state?: string | null;
          zip?: string | null;
          is_default?: boolean;
          created_at?: string;
        };
      };
      carts: {
        Row: {
          id: string;
          user_id: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      cart_items: {
        Row: {
          id: string;
          cart_id: string;
          sku: string;
          name: string;
          price: number;
          qty: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          cart_id: string;
          sku: string;
          name: string;
          price: number;
          qty: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          cart_id?: string;
          sku?: string;
          name?: string;
          price?: number;
          qty?: number;
          created_at?: string;
        };
      };
      orders: {
        Row: {
          id: string;
          user_id: string | null;
          status: string;
          fulfillment_method: string;
          address_id: string | null;
          pickup_location: string | null;
          contact_name: string | null;
          contact_phone: string | null;
          contact_email: string | null;
          subtotal: number;
          shipping_cost: number;
          discount_amount: number;
          points_redeemed: number;
          total: number;
          stripe_session_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          status?: string;
          fulfillment_method: string;
          address_id?: string | null;
          pickup_location?: string | null;
          contact_name?: string | null;
          contact_phone?: string | null;
          contact_email?: string | null;
          subtotal: number;
          shipping_cost?: number;
          discount_amount?: number;
          points_redeemed?: number;
          total: number;
          stripe_session_id?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string | null;
          status?: string;
          fulfillment_method?: string;
          address_id?: string | null;
          pickup_location?: string | null;
          contact_name?: string | null;
          contact_phone?: string | null;
          contact_email?: string | null;
          subtotal?: number;
          shipping_cost?: number;
          discount_amount?: number;
          points_redeemed?: number;
          total?: number;
          stripe_session_id?: string | null;
          created_at?: string;
        };
      };
      order_items: {
        Row: {
          id: string;
          order_id: string;
          sku: string;
          name: string;
          price: number;
          qty: number;
        };
        Insert: {
          id?: string;
          order_id: string;
          sku: string;
          name: string;
          price: number;
          qty: number;
        };
        Update: {
          id?: string;
          order_id?: string;
          sku?: string;
          name?: string;
          price?: number;
          qty?: number;
        };
      };
      points_ledger: {
        Row: {
          id: string;
          user_id: string;
          order_id: string | null;
          type: string;
          points: number;
          note: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          order_id?: string | null;
          type: string;
          points: number;
          note?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          order_id?: string | null;
          type?: string;
          points?: number;
          note?: string | null;
          created_at?: string;
        };
      };
    };
  };
}
