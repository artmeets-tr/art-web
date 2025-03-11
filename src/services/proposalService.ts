import { supabase } from '../lib/supabase';
import { Proposal } from '../types';
import { handleSupabaseQuery, getUsersInRegion, checkActiveSession } from './utils/supabaseHelpers';
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
      // 1. Admin ve manager: Tüm teklifleri görebilir (filtre yok)
      // 2. Bölge Müdürü: Kendi bölgesindeki teklifleri görebilir
      // 3. Saha kullanıcıları: Kendi teklifleri + onaylanmış olanlar
      
      if (currentUser.role === 'regional_manager') {
        if (currentUser.region_id) {
          // Bölgedeki kullanıcıları bul
          const userIds = await getUsersInRegion(currentUser.region_id);
          
          if (userIds.length > 0) {
            // Bölgedeki kullanıcıların tekliflerini filtrele
            query = query.in('user_id', userIds);
          }
        }
      } else if (currentUser.role === 'field_user') {
        if (currentUser.region_id) {
          // Aynı bölgedeki kullanıcıları bul
          const userIds = await getUsersInRegion(currentUser.region_id);
          
          if (userIds.length > 0) {
            // Kendi teklifleri VEYA
            // Onayladığı teklifler VEYA 
            // (Onaylanmış VE aynı bölgede olan) teklifler
            query = query.or(
              `user_id.eq.${currentUser.id},` +
              `approved_by.eq.${currentUser.id},` + 
              `and(status.eq.approved,user_id.in.(${userIds.join(',')}))`
            );
          } else {
            // Bölgede başka kullanıcı yoksa, sadece kendi tekliflerini göster
            query = query.or(`user_id.eq.${currentUser.id},approved_by.eq.${currentUser.id}`);
          }
        } else {
          // Bölge ID'si yoksa sadece kendi tekliflerini ve onayladıklarını göster
          query = query.or(`user_id.eq.${currentUser.id},approved_by.eq.${currentUser.id}`);
        }
      }
      
      // Sorguyu çalıştır ve sonuçları tarihe göre sırala
      const data = await handleSupabaseQuery(
        query.order('created_at', { ascending: false }),
        'Teklifler alınırken hata'
      );
      
      // İlişkili verileri alalım
      if (data.length > 0) {
        // Benzersiz clinic_id ve user_id dizileri oluşturalım
        const clinicIds = Array.from(new Set(data.map(p => p.clinic_id)));
        const userIds = Array.from(new Set(data.map(p => p.user_id)));
        
        // Klinikleri ve kullanıcıları ayrı sorgularla alalım
        const [clinicsData, usersData] = await Promise.all([
          supabase.from('clinics')
            .select('id, name, region_id, region:regions(id, name)')
            .in('id', clinicIds),
          supabase.from('users')
            .select('id, name, email')
            .in('id', userIds)
        ]);
        
        // Hata kontrolü
        if (clinicsData.error) {
          throw new Error(clinicsData.error.message);
        }
        if (usersData.error) {
          throw new Error(usersData.error.message);
        }
        
        // İlişkili verileri ana verilerle birleştirelim
        const clinicsMap = new Map(clinicsData.data.map(c => [c.id, c]));
        const usersMap = new Map(usersData.data.map(u => [u.id, u]));
        
        // Her bir proposal için ilişkili clinic ve user bilgilerini ekleyelim
        const enrichedData = data.map(proposal => ({
          ...proposal,
          clinic: clinicsMap.get(proposal.clinic_id) || null,
          user: usersMap.get(proposal.user_id) || null,
        }));
        
        return enrichedData as unknown as Proposal[];
      }
      
      return data as unknown as Proposal[];
    } catch (error) {
      console.error("Teklifler alınırken hata:", error);
      throw error;
    }
  },
  
  /**
   * Belirli bir teklifi ID'ye göre getirir
   * @param id Teklif ID'si
   * @returns Teklif
   */
  async getById(id: number): Promise<Proposal> {
    try {
      // ID kontrolü - geçersiz değerler için erken hata fırlatma
      if (isNaN(id) || id <= 0) {
        throw new Error(`Geçersiz teklif ID: ${id}`);
      }
      
      // Ana proposal verisini alalım
      const data = await handleSupabaseQuery(
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
        data.clinic_id ? supabase.from('clinics')
          .select('id, name, region_id, region:regions(id, name)')
          .eq('id', data.clinic_id)
          .single() : { data: null, error: null },
          
        data.user_id ? supabase.from('users')
          .select('id, name, email')
          .eq('id', data.user_id)
          .single() : { data: null, error: null },
          
        data.approved_by ? supabase.from('users')
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
            unit_price,
            excess_percentage,
            created_at,
            product:products (id, name, price, category, currency)
          `)
          .eq('proposal_id', id)
      ]);
      
      // Hata kontrolü
      if (itemsData.error) {
        throw new Error(itemsData.error.message);
      }
      
      // Tüm verileri birleştirelim
      const enrichedData = {
        ...data,
        clinic: clinicData.data || null,
        user: userData.data || null,
        approver: approverData.data || null,
        items: itemsData.data || []
      };
      
      return enrichedData as unknown as Proposal;
    } catch (error) {
      console.error(`Teklif #${id} alınırken hata:`, error);
      throw error;
    }
  },

  /**
   * Yeni bir teklif oluşturur
   * @param proposal Teklif bilgileri
   * @returns Oluşturulan teklif
   */
  async create(proposal: Partial<Proposal>): Promise<Proposal> {
    try {
      // Yeni oluşturulan tekliflerin durumu her zaman "pending" olmalı
      proposal.status = 'pending';
      
      // Önce ana teklifi oluştur
      const proposalData = await handleSupabaseQuery(
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
      
      // Teklif öğeleri varsa ekle
      if (proposal.items && proposal.items.length > 0) {
        const newItems = proposal.items.map(item => ({
          proposal_id: proposalData.id,
          product_id: item.product_id,
          quantity: item.quantity,
          excess: item.excess,
          unit_price: item.unit_price,
          excess_percentage: item.excess_percentage
        }));
        
        const { error: itemError } = await supabase
          .from('proposal_items')
          .insert(newItems);
        
        if (itemError) throw new Error(itemError.message);
      }
      
      return proposalData as Proposal;
    } catch (error) {
      console.error('Teklif oluşturma hatası:', error);
      throw error;
    }
  },
  
  /**
   * Bir teklifi günceller
   * @param id Teklif ID'si
   * @param updates Güncellenecek alanlar
   * @returns Güncellenmiş teklif
   */
  async update(id: number, updates: Partial<Proposal>): Promise<Proposal> {
    try {
      // Mevcut kullanıcı bilgilerini al
      const currentUser = await userService.getCurrentUser();
      
      if (!currentUser) {
        throw new Error('Kullanıcı bilgisi bulunamadı. Lütfen tekrar giriş yapın.');
      }
      
      // Önce mevcut teklifi al
      const { data: existingProposal, error: fetchError } = await supabase
        .from('proposals')
        .select('*')
        .eq('id', id)
        .single();
      
      if (fetchError) throw new Error(fetchError.message);
      
      // Durum (status) değişikliği var mı kontrol et
      const isStatusChange = updates.status && updates.status !== existingProposal.status;
      const isContentChange = Object.keys(updates).some(key => 
        key !== 'status' && updates[key as keyof Proposal] !== existingProposal[key as keyof Proposal]
      );
      
      // Rol bazlı yetki kontrolü
      const isAdminOrManager = ['admin', 'manager'].includes(currentUser.role);
      const isRegionalManager = currentUser.role === 'regional_manager';
      const isFieldUser = currentUser.role === 'field_user';
      const isOwner = currentUser.id === existingProposal.user_id;
      
      // Bölge müdürü için kontrol: Teklif sahibi onun bölgesinde mi?
      let isInRegion = false;
      
      if (isRegionalManager && currentUser.region_id) {
        // Teklif sahibinin bölge ID'sini kontrol et
        const { data: ownerUser, error: ownerError } = await supabase
          .from('users')
          .select('region_id')
          .eq('id', existingProposal.user_id)
          .single();
        
        if (!ownerError && ownerUser && ownerUser.region_id === currentUser.region_id) {
          isInRegion = true;
        }
      }
      
      // İçerik değişikliği yapılıyorsa kontrol et
      if (isContentChange) {
        // Saha kullanıcıları hiçbir durumda teklif içeriğini değiştiremez
        if (isFieldUser) {
          throw new Error('Saha kullanıcıları teklif içeriğini değiştiremez. Sadece onaylanmış tekliflerin durumunu ilerletebilirsiniz.');
        }
        
        // Bölge müdürü, sadece kendi bölgesindeki tekliflerin içeriğini değiştirebilir
        if (isRegionalManager && !isInRegion) {
          throw new Error('Sadece kendi bölgenizdeki tekliflerin içeriğini değiştirebilirsiniz.');
        }
      }
      
      // Durum değişikliği yapılıyorsa kontrol et
      if (isStatusChange) {
        // Teklif henüz onaylanmamış ve kullanıcı admin/manager değilse
        if (existingProposal.status === 'pending' && !isAdminOrManager && !isRegionalManager) {
          throw new Error('Sadece admin, yönetici ve bölge müdürleri teklifleri onaylayabilir.');
        }
        
        // Bölge müdürü, başka bölgedeki tekliflerin durumunu değiştiremez
        if (isRegionalManager && !isInRegion) {
          throw new Error('Sadece kendi bölgenizdeki tekliflerin durumunu değiştirebilirsiniz.');
        }
        
        // Saha kullanıcısı, onaylanmış teklifin durumunu değiştirmeye çalışıyor
        if (isFieldUser && existingProposal.status !== 'pending') {
          // Durum hiyerarşisi - sırası önemli
          const statusHierarchy = [
            'pending',           // Bekliyor
            'approved',          // Onaylandı
            'contract_received', // Sözleşme Alındı
            'in_transfer',       // Transfer Aşamasında
            'delivered'          // Teslim Edildi
          ];
          
          const currentIndex = statusHierarchy.indexOf(existingProposal.status);
          const newIndex = statusHierarchy.indexOf(updates.status!);
          
          // Geçersiz durum değişikliği veya geriye dönüş
          if (newIndex === -1 || newIndex < currentIndex) {
            throw new Error('Geçersiz durum değişikliği. Sadece ileri yönde ilerleyebilirsiniz.');
          }
        }
      }
      
      // Özel durumlar: Her durumdan bunlara geçiş yapılabilir, ancak sadece admin/manager yapabilir
      const specialStatuses = ['rejected', 'expired'];
      if (isStatusChange && specialStatuses.includes(updates.status!) && !isAdminOrManager) {
        throw new Error('Sadece admin ve yöneticiler teklifi reddedebilir veya süresini dolmuş olarak işaretleyebilir.');
      }
      
      // Teklif kalemlerini güncellemeden önce ayır
      const { items, ...proposalUpdates } = updates;
      
      // İçerik değişikliği olmadan sadece durum değişikliği mi yapılıyor?
      let updatesToApply = proposalUpdates;
      
      // Saha kullanıcısı sadece durum değişikliği yapabilir
      if (isFieldUser) {
        // Sadece durum değişikliğini al, diğer değişiklikleri yok say
        updatesToApply = isStatusChange ? { status: updates.status } : {};
      }
      
      // Teklif ana bilgilerini güncelle
      const data = await handleSupabaseQuery(
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
      
      // Eğer teklif kalemleri güncellenecekse ve admin/yönetici veya bölge müdürü ise
      if (items && items.length > 0 && (isAdminOrManager || (isRegionalManager && isInRegion))) {
        // Önce mevcut kalemleri sil
        const { error: deleteError } = await supabase
          .from('proposal_items')
          .delete()
          .eq('proposal_id', id);
        
        if (deleteError) throw new Error(deleteError.message);
        
        // Sonra yeni kalemleri ekle
        const newItems = items.map(item => ({
          proposal_id: id,
          product_id: item.product_id,
          quantity: item.quantity,
          excess: item.excess,
          unit_price: item.unit_price,
          excess_percentage: item.excess_percentage
        }));
        
        const { error: insertError } = await supabase
          .from('proposal_items')
          .insert(newItems);
        
        if (insertError) throw new Error(insertError.message);
      }
      
      return data as Proposal;
    } catch (error) {
      console.error('Teklif güncelleme hatası:', error);
      throw error;
    }
  },
  
  /**
   * Teklif durumu değiştirme fonksiyonu
   * @param id Teklif ID'si
   * @param newStatus Yeni durum
   * @param notes Notlar
   * @returns Güncellenmiş teklif
   */
  async updateStatus(id: number, newStatus: Proposal['status'], notes?: string): Promise<Proposal> {
    try {
      // Mevcut kullanıcı bilgilerini al
      const currentUser = await userService.getCurrentUser();
      
      if (!currentUser) {
        throw new Error('Kullanıcı bilgisi bulunamadı. Lütfen tekrar giriş yapın.');
      }
      
      // Önce mevcut teklifi al
      const { data: existingProposal, error: fetchError } = await supabase
        .from('proposals')
        .select('*')
        .eq('id', id)
        .single();
      
      if (fetchError) {
        throw new Error(fetchError.message);
      }
      
      // Durum değişikliği için rol bazlı izin kontrolleri
      const isAdminOrManager = ['admin', 'manager'].includes(currentUser.role);
      const isRegionalManager = currentUser.role === 'regional_manager';
      const isFieldUser = currentUser.role === 'field_user';
      const isOwner = existingProposal.user_id === currentUser.id;
      
      // Durum hiyerarşisi - sırası önemli
      const statusHierarchy = [
        'pending',           // Bekliyor
        'approved',          // Onaylandı
        'contract_received', // Sözleşme Alındı
        'in_transfer',       // Transfer Aşamasında
        'delivered'          // Teslim Edildi
      ];
      
      const currentIndex = statusHierarchy.indexOf(existingProposal.status);
      const newIndex = statusHierarchy.indexOf(newStatus);
      
      // 1. Temel İzin Kontrolü: Sadece admin/manager veya teklifi oluşturan değişiklik yapabilir
      if (!isAdminOrManager && !isOwner) {
        throw new Error('Bu teklifi değiştirme yetkiniz bulunmuyor.');
      }
      
      // 2. Geçerli durum değişikliği kontrolü
      if (newIndex === -1) {
        throw new Error('Geçersiz durum değişikliği.');
      }
      
      // 3. İleri/geri hareket kontrolü
      // Admin/manager ve bölge müdürü değilse sadece ileri yönde ilerlemesine izin ver
      if (!isAdminOrManager && !isRegionalManager && newIndex < currentIndex) {
        throw new Error('Teklif durumunu geriye doğru değiştiremezsiniz.');
      }
      
      // 4. Yönetici gerektiren işlemler
      // "Bekliyor" durumundan "Onaylandı" durumuna geçiş sadece admin/manager/bölge müdürü tarafından yapılabilir
      if (!isAdminOrManager && !isRegionalManager && existingProposal.status === 'pending' && newStatus === 'approved') {
        throw new Error('Sadece yöneticiler ve bölge müdürleri teklifleri onaylayabilir.');
      }
      
      // 5. Özel durumlar için izin kontrolü
      // Reddedilmiş (rejected) ve süresi dolmuş (expired) statülerine geçiş sadece admin/manager yapabilir
      if (!isAdminOrManager && (newStatus === 'rejected' || newStatus === 'expired')) {
        throw new Error('Sadece admin ve yöneticiler teklifi reddedebilir veya süresini dolmuş olarak işaretleyebilir.');
      }
      
      // Geçerli durum güncellemelerini hazırla
      const updates: any = {
        status: newStatus
      };
      
      // Eğer notlar verildiyse ekle
      if (notes) {
        updates.notes = notes;
      }
      
      // Onaylama veya reddetme durumları için ek bilgiler
      if (newStatus === 'approved') {
        updates.approved_by = currentUser.id;
        updates.approved_at = new Date().toISOString();
      } else if (newStatus === 'rejected') {
        updates.rejected_by = currentUser.id;
        updates.rejected_at = new Date().toISOString();
      }
      
      // Teklifi güncelle
      return handleSupabaseQuery(
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
      );
    } catch (error) {
      console.error('Durum güncelleme hatası:', error);
      throw error;
    }
  }
};