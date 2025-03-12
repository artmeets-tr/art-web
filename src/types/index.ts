// Kullanıcı rolleri için enum tanımı
export enum UserRoleEnum {
  ADMIN = 'admin',
  MANAGER = 'manager',
  REGIONAL_MANAGER = 'regional_manager',
  FIELD_USER = 'field_user'
}

export type UserRole = UserRoleEnum | 'admin' | 'manager' | 'regional_manager' | 'field_user';

export type User = {
  id: string;
  email: string;
  name?: string;
  first_name?: string;
  last_name?: string;
  role: UserRole;
  region_id?: number;
  status: 'active' | 'inactive';
  created_at?: string;
  user_regions?: { region_id: number; regions?: { id: number; name: string } }[];
  // Supabase join sonucu olarak region bilgisi
  region?: { id: number; name: string };
};

export type Region = {
  id: number;
  name: string;
  created_at?: string;
  status: 'active' | 'inactive';
};

export type Clinic = {
  id: number;
  name: string;
  address?: string;
  contact_person?: string;
  contact_info?: string;
  email?: string;
  region_id: number;
  status: 'active' | 'inactive';
  created_at?: string;
  created_by?: string;
  region?: Region;
};

export type Product = {
  id: number;
  name: string;
  category: 'implant' | 'accessory' | 'tool' | 'other';
  price: number;
  description?: string;
  status: 'active' | 'inactive';
  created_at?: string;
  currency?: 'TRY' | 'USD' | 'EUR';
};

export type Proposal = {
  id: number;
  user_id: string;
  clinic_id: number;
  currency: 'TRY' | 'USD' | 'EUR';
  discount: number;
  total_amount: number;
  status: 'pending' | 'approved' | 'rejected' | 'expired' | 'contract_received' | 'in_transfer' | 'delivered';
  notes?: string;
  approved_by?: string;
  approved_at?: string;
  rejected_by?: string;
  rejected_at?: string;
  updated_at?: string;
  created_at?: string;
  installment_count?: number;
  first_payment_date?: string;
  installment_amount?: number;
  clinic?: Clinic;
  user?: User;
  items?: ProposalItem[];
};

export type ProposalItem = {
  id: number;
  proposal_id: number;
  product_id: number;
  quantity: number;
  excess: boolean;
  unit_price: number;
  discount?: number;
  total_price: number;
  created_at?: string;
  excess_percentage?: number;
  product?: Product;
};

export type SurgeryReport = {
  id: number;
  user_id: string;
  clinic_id: number;
  date: string;
  time: string;
  product_id?: number;
  patient_name: string;
  surgery_type: string;
  notes?: string;
  status: 'scheduled' | 'completed' | 'cancelled';
  created_at?: string;
  clinic?: Clinic;
  user?: User;
  product?: Product;
};

export type VisitReport = {
  id: number;
  user_id: string;
  clinic_id: number;
  subject: string;
  date: string;
  time: string;
  contact_person?: string;
  notes?: string;
  follow_up_required?: boolean;
  follow_up_date?: string;
  created_at?: string;
  clinic?: Clinic;
  user?: User;
}; 