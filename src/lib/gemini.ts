import { GoogleGenAI, Type, ThinkingLevel } from "@google/genai";

// Using the API key provided by the environment
const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey || apiKey === "MISSING") {
  console.error("GEMINI_API_KEY is missing! Please check your environment variables or Secrets panel.");
} else if (!apiKey.startsWith("AIza")) {
  console.error("HATA: API anahtarınız 'AIza' ile başlamıyor. Yanlış bir metni kopyalamış olabilirsiniz! Lütfen Google AI Studio'dan tekrar alın.");
} else {
  console.log("API Anahtarı algılandı (Format doğru).");
}
const ai = new GoogleGenAI({ apiKey: apiKey || "MISSING" });

export interface AnalysisResult {
  foodName: string;
  gi: number;
  gy: number;
  ii: number;
  fr: number;
  lp: number;
  mx: "liquid" | "solid";
  score: number;
  healthScore: number;
  insulinEffect: string;
  metabolicEffect: string;
  functionalBenefit: string;
  profileComments: {
    weightLoss: string;
    diabetic: string;
    athlete: string;
    celiac: string;
  };
  warning: string;
  suggestion: string;
  kal: number;
  karb: number;
  pro: number;
  yag: number;
}

export interface NutritionData {
  isim: string;
  kat: string;
  gi: number;
  karb: number;
  lif: number;
  pro: number;
  yag: number;
  kal: number;
}

export async function getNutritionData(foodName: string): Promise<NutritionData> {
  const model = "gemini-3.1-flash-lite-preview";
  
  const systemInstruction = `Sen bir besin değerleri veri tabanısın. Verilen besin adı için 100g porsiyon bazında besin değerlerini sağla.
  Kategoriler: Tahıllar, Meyveler, Sebzeler, İçecekler, Süt ürünleri, Baklagiller, Türk yemekleri, Alkol, Kuruyemişler, Protein Kaynakları.`;

  const prompt = `"${foodName}" besini için besin değerlerini JSON formatında sağla.`;

  try {
    const response = await ai.models.generateContent({
      model,
      contents: prompt,
      config: {
        systemInstruction,
        thinkingConfig: { thinkingLevel: ThinkingLevel.MINIMAL },
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            isim: { type: Type.STRING },
            kat: { type: Type.STRING, enum: ['Tahıllar', 'Meyveler', 'Sebzeler', 'İçecekler', 'Süt ürünleri', 'Baklagiller', 'Türk yemekleri', 'Alkol', 'Kuruyemişler', 'Protein Kaynakları'] },
            gi: { type: Type.NUMBER },
            karb: { type: Type.NUMBER },
            lif: { type: Type.NUMBER },
            pro: { type: Type.NUMBER },
            yag: { type: Type.NUMBER },
            kal: { type: Type.NUMBER }
          },
          required: ["isim", "kat", "gi", "karb", "lif", "pro", "yag", "kal"]
        }
      }
    });

    console.log("AI Nutrition Response:", response.text);

    if (!response.text) {
      throw new Error("Boş yanıt alındı.");
    }

    return JSON.parse(response.text);
  } catch (error) {
    console.error("Besin verisi hatası:", error);
    throw new Error("Besin verileri alınamadı.");
  }
}
export async function analyzeFood(foodName: string, highGYCount: number = 0, profileContext: string = "", staticData?: NutritionData & { mScore?: number, nScore?: number }): Promise<AnalysisResult> {
  const model = "gemini-3.1-flash-lite-preview";
  
  let staticContext = "";
  if (staticData) {
    staticContext = `
    BU BESİN VERİTABANIMIZDA KAYITLI. LÜTFEN ANALİZİ BU DEĞERLERE GÖRE YAP:
    - Glisemik İndeks (GI): ${staticData.gi}
    - Karbonhidrat: ${staticData.karb}g
    - Lif: ${staticData.lif}g
    - Protein: ${staticData.pro}g
    - Yağ: ${staticData.yag}g
    - Kalori: ${staticData.kal}kcal
    - Hesaplanan Metabolik Skor: ${staticData.mScore || 'Bilinmiyor'}
    - Hesaplanan Sağlık Skoru: ${staticData.nScore || 'Bilinmiyor'}
    
    ÖNEMLİ: Çıktıdaki 'gi', 'gy', 'lp', 'kal', 'score' ve 'healthScore' değerlerini bu verilere sadık kalarak belirle. 
    'score' için 'mScore' değerini, 'healthScore' için 'nScore' değerini temel al.
    `;
  }

  const systemInstruction = `Sen kıdemli bir Biyokimya Uzmanı ve Beslenme Analistisin. Besinleri modern tıp ve NOVA gıda sınıflandırmasına göre analiz edersin.
  
  Analiz Kriterleri:
  - Gi (Glisemik İndeks), Gy (Glisemik Yük), Ii (İnsülin İndeksi), Fr (Fruktoz Oranı), Lp (Lif/Posa), Mx (Besin Matrisi: liquid/solid), Kal (Kalori), Karb (Karbonhidrat), Pro (Protein), Yag (Yağ).
  
  Skorlama Mantığı:
  1. İnsülin Direnci Etki Skoru (score): 1-10 arası. 10 en sağlıklı (düşük risk), 1 en riskli. 
     Formül: R = ((Gy * 0.4) + (Ii * 0.3) + (Fr * 0.3)) / (Lp + 1). Bu değeri normalize et (10 - normalize_R).
  2. Sağlık Skoru (healthScore): 1-10 arası. 10 en besleyici, 1 en boş kalorili.
     Kriterler: Vitamin, mineral, lif ve protein yoğunluğu yüksekse artır; ultra-işlenmiş, katkı maddeli veya boş kalorili ise düşür.
  
  Eğer sana veritabanı değerleri (staticContext) verilmişse, o değerleri kaynak olarak kullan. Verilmemişse kendi bilgilerine göre tahmin et.
  
  Mantıksal Kurallar:
  1. Düşük Lif & Yüksek GI: Lp < 2 ve Gi > 70 ise skoru %40 artır.
  2. Fruktoz: Yüksekse "Karaciğer Direnci" uyarısı ekle.
  3. Sıvı Matris: Mx == "liquid" ise tüm negatif etkileri x1.5 ile çarp.
  4. Yemek Sırası: Karbonhidrat önceyse GY +%30, lif önceyse GY -%40.
  5. Pişirme: Sıvı/Püre ise -30 puan. Sıcak nişasta GI +%20. Soğutulmuş nişasta +20 puan iyileştirme.
  6. Sirkadiyen Ritim: Saat 20:00 sonrası yüksek karbonhidrat hasar puanını 2 katına çıkar.
  7. Ultra-İşlenmiş Gıdalar (NOVA): İşlenmiş etler, paketli şekerli gıdalar vb. için skoru doğrudan 45 puan düşür. "Kritik Uyarı" ekle.
  8. Sözel Analiz: İsimdeki anahtar kelimelere (Sosis, Midye Dolma vb.) göre spesifik skor ve uyarılar ata.
  9. Biyohack Tavsiyesi: İşlenmiş etler için C vitamini (limon/biber) öner. Diğerleri için sirke, tarçın vb. öner.
  10. Karaciğer Yükü: %50 üzeri fruktoz için karaciğer yağlanması uyarısı ver.
  11. Hareket: Yemek sonrası yürüyüş için puanı %20 iyileştir.
  12. Alkol: Yağ yakımını durdurma uyarısı ekle.
  
  Çıktı Formatı Gereksinimleri:
  - insulinEffect: "Düşük", "Orta-Düşük", "Orta", "Yüksek" gibi sözel bir ifade.
  - metabolicEffect: Besinin metabolizma üzerindeki etkisi (kan şekeri, insülin vb.) hakkında 2-3 cümlelik teknik açıklama.
  - functionalBenefit: Besinin içerdiği vitamin, mineral veya lif gibi faydalı bileşenler hakkında açıklama.
  - profileComments: 4 farklı profil için (kilo vermek isteyen, diyabetik, sporcu, çölyak) kısa, aksiyon odaklı tavsiyeler.
  - warning: Pişirme süresi, sos içeriği veya porsiyon kontrolü gibi kritik bir uyarı.
  - suggestion: Genel bir biyohack veya eşleşme tavsiyesi.
  - kal: 100g için kalori değeri.
  - karb: 100g için karbonhidrat değeri (gram).
  - pro: 100g için protein değeri (gram).
  - yag: 100g için yağ değeri (gram).`;

  const prompt = `"${foodName}" besini için analiz yap. Kullanıcının günlük yüksek GY öğün sayısı: ${highGYCount}. ${profileContext} ${staticContext} Yanıtı JSON formatında sağla.`;


  try {
    const response = await ai.models.generateContent({
      model,
      contents: prompt,
      config: {
        systemInstruction,
        thinkingConfig: { thinkingLevel: ThinkingLevel.MINIMAL },
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            foodName: { type: Type.STRING },
            gi: { type: Type.NUMBER },
            gy: { type: Type.NUMBER },
            ii: { type: Type.NUMBER },
            fr: { type: Type.NUMBER },
            lp: { type: Type.NUMBER },
            mx: { type: Type.STRING, enum: ["liquid", "solid"] },
            score: { type: Type.NUMBER, description: "1-10 scale (Insulin/Metabolic risk)" },
            healthScore: { type: Type.NUMBER, description: "1-10 scale (Nutritional density)" },
            insulinEffect: { type: Type.STRING },
            metabolicEffect: { type: Type.STRING },
            functionalBenefit: { type: Type.STRING },
            profileComments: {
              type: Type.OBJECT,
              properties: {
                weightLoss: { type: Type.STRING },
                diabetic: { type: Type.STRING },
                athlete: { type: Type.STRING },
                celiac: { type: Type.STRING }
              },
              required: ["weightLoss", "diabetic", "athlete", "celiac"]
            },
            warning: { type: Type.STRING },
            suggestion: { type: Type.STRING },
            kal: { type: Type.NUMBER },
            karb: { type: Type.NUMBER },
            pro: { type: Type.NUMBER },
            yag: { type: Type.NUMBER }
          },
          required: ["foodName", "gi", "gy", "ii", "fr", "lp", "mx", "score", "healthScore", "insulinEffect", "metabolicEffect", "functionalBenefit", "profileComments", "warning", "suggestion", "kal", "karb", "pro", "yag"]
        }
      }
    });

    console.log("AI Analysis Response:", response.text);

    if (!response.text) {
      throw new Error("Boş yanıt alındı.");
    }

    return JSON.parse(response.text);
  } catch (error: any) {
    console.error("Analiz hatası:", error);
    
    // API anahtarı hataları için daha spesifik mesaj
    if (error?.message?.includes("API key")) {
      throw new Error(`API Anahtarı Hatası: ${error.message}. Lütfen Vercel'de anahtarınızı güncelleyip Redeploy yapın.`);
    }
    
    throw new Error("Besin analizi yapılamadı. Lütfen API anahtarınızı ve internet bağlantınızı kontrol edin.");
  }
}
