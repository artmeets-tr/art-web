import { supabase } from '../lib/supabase';
import { Proposal, ProposalItem } from '../types';
import { handleSupabaseQuery, handleSupabaseListQuery, handleSupabaseSingleQuery, getUsersInRegion, checkActiveSession } from './utils/supabaseHelpers';
import { userService } from './userService';

/**
 * Teklif işlemleri için servis
 */
export const proposalService = {
  /**
   * Tüm teklifleri getirir, kullanıcı rolüne göre filtreleme yapar
   * @returns Teklif listesi
   */
  async getAll(): Promise<Proposal[]> {
    try {
      // Mevcut kullanıcı bilgilerini al
      const currentUser = await userService.getCurrentUser();
      
      if (!currentUser) {
        throw new Error('Kullanıcı bilgisi bulunamadı. Lütfen tekrar giriş yapın.');
      }
      
      // SupabaseAuth token kontrolü
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('Oturum bilgisi bulunamadı. Lütfen tekrar giriş yapın.');
      }
      
      // Sorgu oluştur
      let query = supabase
        .from('proposals')
        .select(`
          id,
          clinic_id,
          user_id,
          currency,
          discount,
          total_amount,
          status,
          notes,
          approved_by,
          approved_at,
          rejected_by,
          rejected_at,
          created_at,
          updated_at,
          installment_count,
          first_payment_date,
          installment_amount
        `);
      
      // Rol bazlı filtreleme
      if (currentUser.role === 'regional_manager' && currentUser.region_id) {
        // Bölge yöneticisi ise, yalnızca kendi bölgesindeki kullanıcıların tekliflerini görür
        const usersInRegion = await getUsersInRegion(currentUser.region_id);
        query = query.in('user_id', usersInRegion);
      } else if (currentUser.role === 'field_user') {
        // Saha kullanıcısı ise, yalnızca kendi tekliflerini görür
        query = query.eq('user_id', currentUser.id);
      }
      
      // Tarihe göre sırala, en yeniler önce
      query = query.order('created_at', { ascending: false });
      
      // Sorguyu çalıştır
      const data = await handleSupabaseListQuery<any>(
        query,
        'Teklifler alınırken hata'
      );
      
      // İlişkili verileri alalım
      if (data.length > 0) {
        // Benzersiz clinic_id ve user_id dizileri oluşturalım
        const clinicIds = Array.from(new Set(data.map((p: any) => p.clinic_id)));
        const userIds = Array.from(new Set(data.map((p: any) => p.user_id)));
        
        // Klinikleri ve kullanıcıları ayrı sorgularla alalım
        const [clinicsData, usersData] = await Promise.all([
          clinicIds.length > 0 
            ? handleSupabaseListQuery<any>(
                supabase
                  .from('clinics')
                  .select('id, name, region_id, region:regions(id, name)')
                  .in('id', clinicIds),
                'Klinik bilgileri alınırken hata'
              )
            : Promise.resolve([]),
            
          userIds.length > 0
            ? handleSupabaseListQuery<any>(
                supabase
                  .from('users')
                  .select('id, name, email')
                  .in('id', userIds),
                'Kullanıcı bilgileri alınırken hata'
              )
            : Promise.resolve([])
        ]);
        
        // Klinik ve kullanıcı verilerini hızlı erişim için Map'e dönüştürelim
        const clinicsMap = new Map();
        clinicsData.forEach((clinic: any) => {
          clinicsMap.set(clinic.id, clinic);
        });
        
        const usersMap = new Map();
        usersData.forEach((user: any) => {
          usersMap.set(user.id, user);
        });
        
        // Her bir proposal için ilişkili clinic ve user bilgilerini ekleyelim
        const enrichedData = data.map((proposal: any) => ({
          ...proposal,
          clinic: clinicsMap.get(proposal.clinic_id) || null,
          user: usersMap.get(proposal.user_id) || null,
        }));
        
        return enrichedData as Proposal[];
      }
      
      return data as Proposal[];
    } catch (error) {
      console.error('Teklifler alınırken hata:', error);
      throw error;
    }
  },
  
  /**
   * Tek bir teklifi ID'ye göre getirir
   * @param id Teklif ID'si
   * @returns Teklif detayları
   */
  async getById(id: number): Promise<Proposal> {
    try {
      // Ana proposal verisini alalım
      const data = await handleSupabaseSingleQuery<any>(
        supabase
          .from('proposals')
          .select(`
            id,
            clinic_id,
            user_id,
            currency,
            discount,
            total_amount,
            status,
            notes,
            approved_by,
            approved_at,
            rejected_by,
            rejected_at,
            created_at,
            updated_at,
            installment_count,
            first_payment_date,
            installment_amount
          `)
          .eq('id', id)
          .single(),
        `Teklif #${id} alınırken hata`
      );
      
      // İlişkili verileri ayrı sorgularla alalım
      const [clinicData, userData, approverData, itemsData] = await Promise.all([
        data && data.clinic_id ? supabase.from('clinics')
          .select('id, name, region_id, region:regions(id, name)')
          .eq('id', data.clinic_id)
          .single() : { data: null, error: null },
          
        data && data.user_id ? supabase.from('users')
          .select('id, name, email')
          .eq('id', data.user_id)
          .single() : { data: null, error: null },
          
        data && data.approved_by ? supabase.from('users')
          .select('id, name, email')
          .eq('id', data.approved_by)
          .single() : { data: null, error: null },
          
        supabase.from('proposal_items')
          .select(`
            id,
            proposal_id,
            product_id,
            quantity,
            excess,
            discount,
            unit_price,
            total_price,
            created_at,
            product:products(id, name, price, category)
          `)
          .eq('proposal_id', id)
          .order('created_at', { ascending: true })
      ]);
      
      // Tüm verileri birleştirelim
      const enrichedData = {
        ...(data as any),
        clinic: clinicData.data || null,
        user: userData.data || null,
        approver: approverData.data || null,
        items: itemsData.data || [],
      };
      
      return enrichedData as Proposal;
    } catch (error) {
      console.error(`Teklif #${id} alınırken hata:`, error);
      throw error;
    }
  },
  
  /**
   * Yeni bir teklif oluşturur
   * @param proposal Yeni teklif bilgileri
   * @returns Oluşturulan teklif
   */
  async create(proposal: Partial<Proposal>): Promise<Proposal> {
    try {
      // Önce ana teklifi oluştur
      const proposalData = await handleSupabaseSingleQuery<any>(
        supabase
          .from('proposals')
          .insert({
            user_id: proposal.user_id,
            clinic_id: proposal.clinic_id,
            currency: proposal.currency,
            discount: proposal.discount,
            total_amount: proposal.total_amount,
            status: proposal.status,
            notes: proposal.notes,
            installment_count: proposal.installment_count,
            first_payment_date: proposal.first_payment_date,
            installment_amount: proposal.installment_amount
          })
          .select()
          .single(),
        'Teklif oluşturulurken hata'
      );
      
      // Teklif öğelerini ekle
      if (proposal.items && proposal.items.length > 0 && proposalData) {
        const newItems = proposal.items.map(item => ({
          proposal_id: proposalData.id,
          product_id: item.product_id,
          quantity: item.quantity,
          excess: item.excess,
          discount: item.discount,
          unit_price: item.unit_price,
          total_price: item.total_price
        }));
        
        const { error: itemsError } = await supabase
          .from('proposal_items')
          .insert(newItems);
        
        if (itemsError) {
          console.error('Teklif öğeleri eklenirken hata:', itemsError);
          throw new Error(`Teklif öğeleri eklenirken hata: ${itemsError.message}`);
        }
      }
      
      // Yeni teklifin tüm bilgilerini al
      return this.getById(proposalData ? proposalData.id : 0);
    } catch (error) {
      console.error('Teklif oluşturulurken hata:', error);
      throw error;
    }
  },
  
  /**
   * Mevcut bir teklifi günceller
   * @param id Teklif ID'si
   * @param updates Güncellenecek bilgiler
   * @returns Güncellenmiş teklif
   */
  async update(id: number, updates: Partial<Proposal>): Promise<Proposal> {
    try {
      // Mevcut kullanıcı bilgilerini al
      const currentUser = await userService.getCurrentUser();
      
      if (!currentUser) {
        throw new Error('Kullanıcı bilgisi bulunamadı. Lütfen tekrar giriş yapın.');
      }
      
      // SupabaseAuth token kontrolü
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('Oturum bilgisi bulunamadı. Lütfen tekrar giriş yapın.');
      }
      
      // Mevcut teklifi kontrol et
      const existingProposal = await this.getById(id);
      
      if (!existingProposal) {
        throw new Error(`#${id} ID'li teklif bulunamadı`);
      }
      
      // Durum değişikliği varsa, onaylandı/reddedildi tarihlerini ayarla
      const isStatusChange = updates.status && existingProposal.status !== updates.status;
      
      // items değişikliğini ayrı tut, diğer tüm güncelleme alanlarını kopyala
      const { items, ...updatesToApply } = updates;
      
      // Teklif ana bilgilerini güncelle
      const data = await handleSupabaseSingleQuery<any>(
        supabase
          .from('proposals')
          .update({
            ...updatesToApply,
            // Durum değişikliği varsa ilgili bilgileri ekle
            ...(isStatusChange && updates.status === 'approved' ? {
              approved_by: currentUser.id,
              approved_at: new Date().toISOString()
            } : {}),
            ...(isStatusChange && updates.status === 'rejected' ? {
              rejected_by: currentUser.id,
              rejected_at: new Date().toISOString()
            } : {})
          })
          .eq('id', id)
          .select()
          .single(),
        'Teklif güncellenirken hata'
      );
      
      // Teklif öğeleri güncellenecekse
      if (items && items.length > 0) {
        // Önce mevcut öğeleri silelim
        const { error: deleteError } = await supabase
          .from('proposal_items')
          .delete()
          .eq('proposal_id', id);
        
        if (deleteError) {
          console.error('Mevcut teklif öğeleri silinirken hata:', deleteError);
          throw new Error(`Mevcut teklif öğeleri silinirken hata: ${deleteError.message}`);
        }
        
        // Sonra yeni öğeleri ekleyelim
        const newItems = items.map(item => ({
          proposal_id: id,
          product_id: item.product_id,
          quantity: item.quantity,
          excess: item.excess,
          discount: item.discount,
          unit_price: item.unit_price,
          total_price: item.total_price
        }));
        
        const { error: insertError } = await supabase
          .from('proposal_items')
          .insert(newItems);
        
        if (insertError) {
          console.error('Yeni teklif öğeleri eklenirken hata:', insertError);
          throw new Error(`Yeni teklif öğeleri eklenirken hata: ${insertError.message}`);
        }
      }
      
      // Güncellenmiş teklifi getir
      return this.getById(id);
    } catch (error) {
      console.error(`Teklif #${id} güncellenirken hata:`, error);
      throw error;
    }
  },
  
  /**
   * Teklif durumunu günceller (onaylama, reddetme)
   * @param id Teklif ID'si
   * @param newStatus Yeni durum
   * @param notes Notlar (opsiyonel)
   * @returns Güncellenmiş teklif
   */
  async updateStatus(id: number, newStatus: Proposal['status'], notes?: string): Promise<Proposal> {
    try {
      // Mevcut kullanıcı bilgilerini al
      const currentUser = await userService.getCurrentUser();
      
      if (!currentUser) {
        throw new Error('Kullanıcı bilgisi bulunamadı. Lütfen tekrar giriş yapın.');
      }
      
      // Güncellenecek alanları oluştur
      const updates: Record<string, any> = {
        status: newStatus
      };
      
      // Notlar varsa güncelle
      if (notes) {
        updates.notes = notes;
      }
      
      // Onaylama veya reddetme durumuna göre ek bilgileri ekle
      if (newStatus === 'approved') {
        updates.approved_by = currentUser.id;
        updates.approved_at = new Date().toISOString();
        updates.rejected_by = null;
        updates.rejected_at = null;
      } else if (newStatus === 'rejected') {
        updates.rejected_by = currentUser.id;
        updates.rejected_at = new Date().toISOString();
        updates.approved_by = null;
        updates.approved_at = null;
      }
      
      // Teklifi güncelle
      return handleSupabaseSingleQuery<Proposal>(
        supabase
          .from('proposals')
          .update(updates)
          .eq('id', id)
          .select(`
            id,
            clinic_id,
            user_id,
            currency,
            discount,
            total_amount,
            status,
            notes,
            approved_by,
            approved_at,
            rejected_by,
            rejected_at,
            created_at,
            updated_at,
            installment_count,
            first_payment_date,
            installment_amount
          `)
          .single(),
        'Teklif durumu güncellenirken hata'
      ) as Promise<Proposal>;
    } catch (error) {
      console.error(`Teklif #${id} durumu güncellenirken hata:`, error);
      throw error;
    }
  },
  
  // Diğer teklif işlemleri...
};