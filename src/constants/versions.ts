export interface VersionNote {
  version: string;
  date: string;
  changes: string[];
}

export const VERSION_HISTORY: VersionNote[] = [
  {
    version: "v2.5.0",
    date: "3 Nisan 2026",
    changes: [
      "Gelişmiş AI ve Görüntü İşleme (Plate Analysis) özelliği eklendi.",
      "Tabak fotoğrafından besin tanımlama ve metabolik puanlama motoru devreye alındı.",
      "Kamera ve galeri üzerinden hızlı besin analizi desteği sağlandı.",
      "Tanımlanan besinlerin toplu olarak günlüğe eklenmesi özelliği eklendi."
    ]
  },
  {
    version: "v2.4.0",
    date: "3 Nisan 2026",
    changes: [
      "Günlük Öğün Takibi (Tracking) sistemi eklendi.",
      "Günlük Toplam Glikoz Yükü (Daily GL) hesaplama motoru devreye alındı.",
      "Metabolik Performans Skoru ile günlük analiz özelliği eklendi.",
      "Besinleri doğrudan günlüğe ekleme ve geçmişi yönetme imkanı sağlandı."
    ]
  },
  {
    version: "v2.3.0",
    date: "3 Nisan 2026",
    changes: [
      "Kişiselleştirilmiş Metabolik Profil sistemi eklendi.",
      "Boy, Aktivite Seviyesi ve Hedef bazlı dinamik skorlama algoritması devreye alındı.",
      "Profil modalı yeni veri alanları ile genişletildi.",
      "AI analiz motoru artık kullanıcı hedeflerine göre özel tavsiyeler üretiyor."
    ]
  },
  {
    version: "v2.2.0",
    date: "2 Nisan 2026",
    changes: [
      "Çift kaydırma çubuğu sorunu giderildi (Modal açıkken sayfa kaydırması engellendi).",
      "Karanlık ve Aydınlık mod için özel, zarif kaydırma çubukları (scrollbar) eklendi.",
      "Mobil ve tablet cihazlar için modal yerleşimleri ve yazı boyutları optimize edildi.",
      "Besin Ekleme ve Profil modalları Aydınlık Mod için tamamen uyumlu hale getirildi.",
      "Analizi Paylaş özelliği düzeltildi ve başarı bildirimleri eklendi.",
      "Mobil cihazlarda başlık, logo ve buton yerleşimleri iyileştirildi.",
      "Bento Grid ve grafik bileşenleri mobil uyumluluğu artırıldı.",
      "Modallarda uzun başlıkların taşma sorunu (text-wrapping) çözüldü."
    ]
  },
  {
    version: "v2.1.0",
    date: "2 Nisan 2026",
    changes: [
      "AI Analiz sonuçları için Bento Grid düzeni eklendi.",
      "Sirkadiyen Ritim Grafiği (Metabolik Zamanlama) eklendi.",
      "Yükleme durumları için Skeleton Loader animasyonları eklendi.",
      "Profil modalı ve footer tasarımı modernize edildi.",
      "Sistem performansı ve AI yanıt hızı optimize edildi."
    ]
  },
  {
    version: "v2.0.0",
    date: "15 Mart 2026",
    changes: [
      "Google Gemini AI entegrasyonu tamamlandı.",
      "Metabolik sağlık ve insülin direnci analiz motoru eklendi.",
      "Besin veritabanı senkronizasyon özelliği eklendi.",
      "Karanlık mod desteği ve yeni UI tasarımı."
    ]
  }
];

export const CURRENT_VERSION = VERSION_HISTORY[0].version;
