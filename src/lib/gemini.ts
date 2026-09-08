import { GoogleGenAI, Type, ThinkingLevel } from "@google/genai";

// Using the API key provided by the environment
const getApiKey = () => {
  // Vite will replace process.env.GEMINI_API_KEY with the actual string value (including quotes)
  // because of the 'define' configuration in vite.config.ts
  const key = process.env.GEMINI_API_KEY;
  
  if (key && key !== "process.env.GEMINI_API_KEY") return key;
  
  // Fallback for different environments
  try {
    if (typeof process !== 'undefined' && process.env && process.env.GEMINI_API_KEY) {
      return process.env.GEMINI_API_KEY;
    }
  } catch (e) {}
  
  return undefined;
};

const apiKey = getApiKey();
if (!apiKey || apiKey === "MISSING") {
  console.error("GEMINI_API_KEY is missing! Please check your environment variables or Secrets panel.");
} else if (!apiKey.startsWith("AIza")) {
  console.error("HATA: API anahtarınız 'AIza' ile başlamıyor. Yanlış bir metni kopyalamış olabilirsiniz! Lütfen Google AI Studio'dan tekrar alın.");
} else {
  console.log("API Anahtarı algılandı (Format doğru).");
}

let genAIInstance: GoogleGenAI | null = null;
const getGenAI = () => {
  if (!genAIInstance) {
    genAIInstance = new GoogleGenAI({ apiKey: apiKey || "MISSING" });
  }
  return genAIInstance;
};

import { Food, AnalysisResult } from '../types';

// Akıllı Önbellek Yapıları
const ANALYSIS_CACHE_KEY = 'gliskor_analysis_cache';
const NUTRITION_CACHE_KEY = 'gliskor_nutrition_cache';

interface CachedAnalysis {
  timestamp: number;
  result: AnalysisResult;
}

interface CachedNutrition {
  timestamp: number;
  data: Food;
}

function getCache(): Record<string, CachedAnalysis> {
  try {
    const saved = localStorage.getItem(ANALYSIS_CACHE_KEY);
    return saved ? JSON.parse(saved) : {};
  } catch {
    return {};
  }
}

function getNutritionCache(): Record<string, CachedNutrition> {
  try {
    const saved = localStorage.getItem(NUTRITION_CACHE_KEY);
    return saved ? JSON.parse(saved) : {};
  } catch {
    return {};
  }
}

function setCache(foodName: string, result: AnalysisResult) {
  try {
    const cache = getCache();
    cache[foodName.toLowerCase()] = {
      timestamp: Date.now(),
      result
    };
    const keys = Object.keys(cache);
    if (keys.length > 50) delete cache[keys[0]];
    localStorage.setItem(ANALYSIS_CACHE_KEY, JSON.stringify(cache));
  } catch (e) {
    console.error("Cache save error:", e);
  }
}

function setNutritionCache(foodName: string, data: Food) {
  try {
    const cache = getNutritionCache();
    cache[foodName.toLowerCase()] = {
      timestamp: Date.now(),
      data
    };
    localStorage.setItem(NUTRITION_CACHE_KEY, JSON.stringify(cache));
  } catch (e) {
    console.error("Nutrition Cache save error:", e);
  }
}

export type { AnalysisResult };

export async function getNutritionData(foodName: string): Promise<Food> {
  // Önce önbelleğe bak
  const cache = getNutritionCache();
  const cached = cache[foodName.toLowerCase()];
  const CACHE_TTL = 30 * 24 * 60 * 60 * 1000; // 30 gün

  if (cached && (Date.now() - cached.timestamp < CACHE_TTL)) {
    console.log("Using cached nutrition for:", foodName);
    return cached.data;
  }

  const model = "gemini-3-flash-preview";
  
  const systemInstruction = `Besin veri tabanısın. 100g için verileri JSON formatında sağla: { "isim": string, "gi": number, "karb": number, "lif": number, "pro": number, "yag": number, "kal": number }. Sadece JSON dön.`;

  const prompt = `${foodName} verisi.`;

  try {
    const response = await getGenAI().models.generateContent({
      model,
      contents: prompt,
      config: {
        systemInstruction,
        thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
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

    const result = JSON.parse(response.text);
    setNutritionCache(foodName, result);
    return result;
  } catch (error: any) {
    console.error("Besin verisi hatası:", error);
    throw new Error(`Besin verileri alınamadı: ${error?.message || 'Bilinmeyen hata'}`);
  }
}

export interface PlateAnalysisResult {
  identifiedFoods: {
    name: string;
    portion: string;
    estimatedCalories: number;
    score: number;
    decision: '🟢 ÇOK İYİ' | '🟢 İYİ SEÇİM' | '🟡 ÖLÇÜLÜ TÜKET' | '🟠 SINIRLI TÜKET' | '🔴 MÜMKÜNSE KAÇIN';
    reason: string;
  }[];
  totalCalories: number;
  totalProtein?: number;
  totalCarbs?: number;
  totalFat?: number;
  totalFiber?: number;
  totalSugar?: number;
  totalSodium?: number;
  overallMetabolicScore: number;
  overallDecision: '🟢 ÇOK İYİ' | '🟢 İYİ SEÇİM' | '🟡 ÖLÇÜLÜ TÜKET' | '🟠 SINIRLI TÜKET' | '🔴 MÜMKÜNSE KAÇIN';
  mealBalanceAnalysis: string;
  missingNutrients: string[];
  betterCombination: string;
  alternativeSuggestion: string;
  generalAdvice: string;
}

export async function analyzePlateImage(base64Image: string, profileContext: string = ""): Promise<PlateAnalysisResult> {
  const model = "gemini-3-flash-preview";
  
  const systemInstruction = `Sen "Nutrition AI" adlı profesyonel bir beslenme analiz ve karar destek asistanısın.

Görevin: Bir tabak veya yiyecek fotoğrafındaki yiyecekleri tanımlamak, porsiyonlarını belirlemek, kalori ve makro besinlerini hesaplamak, kombinasyon dengesini analiz etmek ve her yiyecek ile toplam öğün için net bir karar üretmektir.

TEMEL PRENSİP:
Yalnızca "sağlıklı / sağlıksız" deme.
Şu 3 şeyi birbirinden ayır:
1. Ürünün genel beslenme kalitesi
2. Belirli porsiyonun beslenme profili
3. Bu yiyeceğin mevcut kullanıcı için uygunluğu

KARAR SINIFLARI (Her yiyecek ve toplam öğün için BİRİNİ seç):
🟢 ÇOK İYİ
🟢 İYİ SEÇİM
🟡 ÖLÇÜLÜ TÜKET
🟠 SINIRLI TÜKET
🔴 MÜMKÜNSE KAÇIN

0-10 Arasında BESLENME KALİTESİ SKORU oluştur.
Porsiyonu belirt, belirtilmemişse standart porsiyon varsayımını açıkla.
Kombinasyon Analizi: Toplam kalori, protein, karbonhidrat, yağ, lif, şeker ve sodyumu topla; eksik makro veya besin grubunu (örn. lif/sebze/protein eksiği) belirt.
Alternatif Sistemi: Daha iyi hazırlanma şekli ve daha avantajlı alternatif öner.`;

  const prompt = `Bu tabak fotoğrafındaki besinleri detaylı analiz et. ${profileContext} JSON formatında yanıtla.`;

  try {
    const response = await getGenAI().models.generateContent({
      model,
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: "image/jpeg",
              data: base64Image.split(',')[1] || base64Image
            }
          },
          { text: prompt }
        ]
      },
      config: {
        systemInstruction,
        thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            identifiedFoods: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING },
                  portion: { type: Type.STRING },
                  estimatedCalories: { type: Type.NUMBER },
                  score: { type: Type.NUMBER },
                  decision: { 
                    type: Type.STRING, 
                    enum: ['🟢 ÇOK İYİ', '🟢 İYİ SEÇİM', '🟡 ÖLÇÜLÜ TÜKET', '🟠 SINIRLI TÜKET', '🔴 MÜMKÜNSE KAÇIN'] 
                  },
                  reason: { type: Type.STRING }
                },
                required: ["name", "portion", "estimatedCalories", "score", "decision", "reason"]
              }
            },
            totalCalories: { type: Type.NUMBER },
            totalProtein: { type: Type.NUMBER },
            totalCarbs: { type: Type.NUMBER },
            totalFat: { type: Type.NUMBER },
            totalFiber: { type: Type.NUMBER },
            totalSugar: { type: Type.NUMBER },
            totalSodium: { type: Type.NUMBER },
            overallMetabolicScore: { type: Type.NUMBER },
            overallDecision: { 
              type: Type.STRING, 
              enum: ['🟢 ÇOK İYİ', '🟢 İYİ SEÇİM', '🟡 ÖLÇÜLÜ TÜKET', '🟠 SINIRLI TÜKET', '🔴 MÜMKÜNSE KAÇIN'] 
            },
            mealBalanceAnalysis: { type: Type.STRING },
            missingNutrients: { type: Type.ARRAY, items: { type: Type.STRING } },
            betterCombination: { type: Type.STRING },
            alternativeSuggestion: { type: Type.STRING },
            generalAdvice: { type: Type.STRING }
          },
          required: [
            "identifiedFoods", 
            "totalCalories", 
            "overallMetabolicScore", 
            "overallDecision", 
            "mealBalanceAnalysis", 
            "missingNutrients", 
            "betterCombination", 
            "alternativeSuggestion", 
            "generalAdvice"
          ]
        }
      }
    });

    console.log("AI Plate Analysis Response:", response.text);

    if (!response.text) {
      throw new Error("Boş yanıt alındı.");
    }

    return JSON.parse(response.text);
  } catch (error: any) {
    console.error("Tabak analizi hatası:", error);
    throw new Error(`Tabak analizi yapılamadı: ${error?.message || 'Bilinmeyen hata'}`);
  }
}

export async function getCoachResponse(
  messages: { role: 'user' | 'assistant'; content: string; image?: string }[], 
  profileContext: string = ""
): Promise<string> {
  const model = "gemini-3-flash-preview";
  
  const systemInstruction = `Sen "Nutrition AI" adlı profesyonel bir beslenme analiz ve karar destek asistanısın.

ANA GÖREVİN:
Kullanıcının yazdığı veya fotoğrafını gönderdiği yiyecek ve içecekleri analiz etmek; mevcut besin verilerini kullanarak beslenme kalitesini değerlendirmek; porsiyon, kalori, makro besinler, lif, şeker, sodyum, doymuş yağ, mikrobesinler ve işlenmişlik gibi faktörleri değerlendirmek; ardından kullanıcının hedeflerini ve o günkü tüketimini dikkate alarak anlaşılır bir karar üretmektir.

TEMEL PRENSİP:
Sen yalnızca "sağlıklı / sağlıksız" demeyeceksin.
Şu üç şeyi birbirinden ayıracaksın:
1. Ürünün genel beslenme kalitesi
2. Belirli porsiyonun beslenme profili
3. Bu yiyeceğin mevcut kullanıcı ve mevcut gün için uygunluğu

Örneğin yüksek kalorili bir yiyecek otomatik olarak "kötü" değildir.
Düşük kalorili bir yiyecek de otomatik olarak "iyi" değildir.
Kullanıcının amacı, porsiyon, öğün bağlamı ve günlük toplam tüketim mutlaka dikkate alınmalıdır.

────────────────────────
KARAR SINIFLARI
────────────────────────
Her analiz sonunda aşağıdaki kararlardan BİRİNİ seç:
🟢 ÇOK İYİ
🟢 İYİ SEÇİM
🟡 ÖLÇÜLÜ TÜKET
🟠 SINIRLI TÜKET
🔴 MÜMKÜNSE KAÇIN

Karar yalnızca yiyeceğin adına göre verilmemelidir.

────────────────────────
PUANLAMA
────────────────────────
0–10 arasında BESLENME KALİTESİ SKORU oluştur.
Değerlendirme kriterleri:
• Protein kalitesi ve miktarı
• Lif
• Vitamin ve mineral yoğunluğu
• Eklenmiş şeker
• Toplam şeker
• Doymuş yağ
• Trans yağ
• Sodyum
• Kalori yoğunluğu
• İşlenmişlik seviyesi
• Besin yoğunluğu
• Tokluk potansiyeli

Skoru oluştururken tek bir faktörün bütün sonucu domine etmesine izin verme.
Bir ürün hakkında güvenilir besin verisi bulunmuyorsa değerleri uydurma. Tahmin yapman gerekiyorsa bunu açıkça "tahmini" olarak belirt.

────────────────────────
KİŞİSELLEŞTİRME
────────────────────────
Kullanıcı Profili ve Günlük Veriler: ${profileContext}
Kullanıcı hakkında bilmediğin bilgileri varsayma, hedef yoksa genel beslenme kalitesi üzerinden değerlendirme yap.

────────────────────────
PORSİYON
────────────────────────
Porsiyon belirtilmemişse standart porsiyon kullan. Ancak standart porsiyonun varsayım olduğunu belirt.
Kullanıcı miktar belirtirse (örn. "2 tabak", "1 şişe", "330 ml", "200 gram") hesaplamayı buna göre yap.
Birden fazla yiyecek verilirse her yiyeceği ayrı analiz et ve ardından toplam öğünü değerlendir.

────────────────────────
KOMBİNASYON ANALİZİ
────────────────────────
Bir öğünde birden fazla yiyecek varsa toplam kalori, protein, karb, yağ, lif, şeker ve sodyumu topla. Öğünün dengesini analiz et ve eksik makro/besin grubunu (sebze, lif, protein vb.) açıkla.

────────────────────────
ALTERNATİF SİSTEMİ
────────────────────────
1. Mevcut yiyeceği değerlendir.
2. Daha iyi hazırlanma şeklini öner.
3. Benzer fakat beslenme açısından daha avantajlı alternatif öner (kullanıcıya zorunlu tutmadan).

────────────────────────
DİL VE ÜSLUP
────────────────────────
Türkçe konuş. Kısa, net ve anlaşılır ol. Önce sonucu söyle, sonra nedenini açıkla.
Gereksiz akademik terminoloji kullanma. Kullanıcıyı suçlama, utandırma veya korkutma.
"Kesinlikle bunu yeme" gibi ifadeleri yalnızca gerçekten gerekli olduğunda kullan. Tek bir yiyeceği şeytanlaştırma.
Beslenmeyi toplam günlük ve haftalık düzen içinde değerlendir.

────────────────────────
TIBBİ SINIRLAR
────────────────────────
Doktor veya diyetisyen rolü üstlenme. Hastalık teşhisi koyma. İlaç veya kesin tıbbi tedavi önerisi verme. Gerektiğinde bir sağlık uzmanına danışılmasını öner.

────────────────────────
ÇIKTI KURALI
────────────────────────
Kullanıcı bir besin, yemek, öğün veya "Bunu yiyebilir miyim?" diye sorduğunda ya da bir fotoğraf gönderdiğinde yanıtında HER ZAMAN şu 10 maddelik yapıyı kullan:

1. KARAR: [🟢 ÇOK İYİ / 🟢 İYİ SEÇİM / 🟡 ÖLÇÜLÜ TÜKET / 🟠 SINIRLI TÜKET / 🔴 MÜMKÜNSE KAÇIN]
2. SKOR: [0-10 Arasında Puan, örn. 7.8/10]
3. PORSİYON: [Porsiyon miktarı ve standart varsayım notu]
4. KALORİ VE MAKROLAR: [Kalori, Protein, Karb, Yağ, Lif, Şeker, Sodyum vb.]
5. AVANTAJLAR: [Madde imleriyle besin değerleri ve faydaları]
6. DEZAVANTAJLAR: [Madde imleriyle dikkat edilmesi gereken noktalar]
7. KULLANICIYA ÖZEL DEĞERLENDİRME: [Hedefine, günün saatine ve o günkü kalan kalori/makro ihtiyacına göre değerlendirme]
8. DAHA İYİ KOMBİNASYON: [Öğünü dengeleyecek ekleme/çıkarmalar]
9. ALTERNATİF: [Daha iyi pişirme tekniği veya avantajlı muadil besin]
10. KISA SONUÇ: ["Bunu yiyebilir miyim?" sorusunun net, anlaşılır cevabı]

Genel sohbet sorularında da bu profesyonel, yapıcı ve bilimsel yaklaşımı koru.`;

  try {
    const lastMessage = messages[messages.length - 1];
    
    // Check if last message has an image
    if (lastMessage && lastMessage.image) {
      const parts: any[] = [
        {
          inlineData: {
            mimeType: "image/jpeg",
            data: lastMessage.image.split(',')[1] || lastMessage.image
          }
        },
        { text: lastMessage.content || "Bu besini veya öğünü Nutrition AI kriterlerine göre analiz et." }
      ];

      const response = await getGenAI().models.generateContent({
        model,
        contents: { parts },
        config: {
          systemInstruction,
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
        }
      });
      return response.text || "Üzgünüm, analiz üretilemedi.";
    }

    const chat = getGenAI().chats.create({
      model,
      history: messages.slice(0, -1).map(m => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }]
      })),
      config: {
        systemInstruction,
        thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
      }
    });

    const response = await chat.sendMessage({
      message: lastMessage.content
    });
    return response.text || "Üzgünüm, şu an yanıt veremiyorum.";
  } catch (error) {
    console.error("Nutrition AI yanıt hatası:", error);
    return "Üzgünüm, şu an analiz oluşturulamadı. Lütfen daha sonra tekrar deneyin.";
  }
}

export async function analyzeBarcode(barcode: string): Promise<Food | null> {
  const model = "gemini-3-flash-preview";
  
  const systemInstruction = `Teknik Ürün Analisti. Girdi: Barkod. Beklenen: JSON (100g). Ek metin yasak.
Şablon: { "isim": string, "kat": string, "gi": number, "karb": number, "lif": number, "pro": number, "yag": number, "kal": number }`;

  const prompt = `"${barcode}" barkodlu ürünün besin değerlerini JSON formatında sağla.`;

  try {
    const response = await getGenAI().models.generateContent({
      model,
      contents: prompt,
      config: {
        systemInstruction,
        thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            isim: { type: Type.STRING },
            kat: { type: Type.STRING },
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

    if (!response.text || response.text.includes("null")) return null;
    return JSON.parse(response.text);
  } catch (error) {
    console.error("Barkod analizi hatası:", error);
    return null;
  }
}

export async function analyzeFood(
  foodName: string, 
  highGYCount: number = 0, 
  profileContext: string = "", 
  staticData?: Food & { mScore?: number, nScore?: number },
  historyContext: string = ""
): Promise<AnalysisResult> {
  // 1. ÖNCE ÖNBELLEĞE BAK (KOTA TASARRUFU - ADIM 1)
  const cache = getCache();
  const cached = cache[foodName.toLowerCase()];
  const CACHE_TTL = 30 * 24 * 60 * 60 * 1000; // 30 gün

  if (cached && (Date.now() - cached.timestamp < CACHE_TTL)) {
    console.log("Using cached analysis for:", foodName);
    return { ...cached.result, isFromCache: true };
  }

  // 2. YEREL ANALİZ MOTORU (Eğer veritabanında puanlar varsa AI'yı beklemeden sonuç dön)
  if (staticData && staticData.mScore !== undefined && staticData.nScore !== undefined) {
    console.log("Maximum Speed: Local Heuristic used for", foodName);
    const gi = staticData.gi;
    const gy = Number(((gi * staticData.karb) / 100).toFixed(1));
    
    let status: 'GREEN' | 'YELLOW' | 'RED' = 'YELLOW';
    if (staticData.mScore >= 8.5) status = 'GREEN';
    else if (staticData.mScore < 5.5) status = 'RED';

    const localResult: AnalysisResult = {
      foodName: foodName,
      gi: gi,
      gy: gy,
      lif: staticData.lif,
      kat: staticData.kat || "Besin",
      score: staticData.mScore || 70,
      kal: staticData.kal,
      karb: staticData.karb,
      pro: staticData.pro,
      yag: staticData.yag,
      lightStatus: status,
      lightDescription: status === 'GREEN' ? "YEŞİL IŞIK: Mükemmel seçim." : status === 'YELLOW' ? "SARI IŞIK: Uygun ama porsiyona dikkat." : "KIRMIZI IŞIK: Porsiyonu azaltın.",
      isFromCache: true,
      citizenAnalysis: {
        scores: {
          kanSekeri: { score: status === 'GREEN' ? 28 : 15, max: 30, desc: status === 'GREEN' ? "Kan şekerini yavaş yükseltir." : "Kan şekerini hızlı yükseltebilir." },
          besinYogunlugu: { score: staticData.lif > 3 ? 22 : 15, max: 25, desc: staticData.lif > 3 ? "Yüksek vitamin/mineral." : "Orta yoğunluk." },
          yagKalitesi: { score: 15, max: 20, desc: "Besin değerleri dengeli." },
          lifOrani: { score: Math.round(staticData.lif * 2), max: 15, desc: staticData.lif > 3 ? "Bağırsak dostudur." : "Lif oranı artırılabilir." },
          islenmislik: { score: 9, max: 10, desc: "Az işlenmiş ürün." }
        },
        aiNote: "Mevcut verilerle hızlı analiz yapıldı.",
        eforKarsiligi: `${Math.round(staticData.kal / 5)} dakika yürüyüş`,
        hataAlarmlari: ["Aşırı porsiyon", "Hızlı tüketim", "Susuz bırakmak"],
        iyilestirmeHack: "Yeşillik ekleyerektüketin.",
        vatandasSorulari: {
          kiloVerme: "Kontrollü tüketim önerilir.",
          tansiyonSeker: "Dengeli bir besindir."
        }
      }
    };
    return localResult;
  }

  const model = "gemini-3-flash-preview";
  
  let staticContext = "";
  if (staticData) {
    // 2. VERİTABANI VARSA AI'YA "DAHA AZ DÜŞÜN" DE (KOTA TASARRUFU - ADIM 2)
    staticContext = `VERİ MEVCUT: GI:${staticData.gi}, Karb:${staticData.karb}g, Lif:${staticData.lif}g, Pro:${staticData.pro}g, Yağ:${staticData.yag}g, Kal:${staticData.kal}kcal. HESAPLAMA YAPMA, BU VERİLERİ YORUMLA.`;
  }

  const systemInstruction = `Sen "Nutrition AI" adlı profesyonel bir beslenme analiz ve karar destek asistanısın.

ANA GÖREVİN:
Verilen yiyeceği analiz etmek; beslenme kalitesini değerlendirmek; porsiyon, kalori, makro besinler, lif, şeker, sodyum, doymuş yağ ve işlenmişliği değerlendirmek; kullanıcının hedeflerine ve metabolik durumuna göre anlaşılır bir karar üretmektir.

TEMEL PRENSİP:
Yalnızca "sağlıklı / sağlıksız" deme. Şunları ayır:
1. Ürünün genel beslenme kalitesi
2. Belirli porsiyonun beslenme profili
3. Bu yiyeceğin kullanıcı için uygunluğu

KARAR SINIFLARI (BİRİNİ SEÇ):
🟢 ÇOK İYİ | 🟢 İYİ SEÇİM | 🟡 ÖLÇÜLÜ TÜKET | 🟠 SINIRLI TÜKET | 🔴 MÜMKÜNSE KAÇIN

PUANLAMA: 0–10 arasında BESLENME KALİTESİ SKORU oluştur.
Porsiyon belirtilmemişse standart porsiyon varsayımı yap.

Analiz formatında hem citizenAnalysis hem de nutritionAiReport alanlarını eksiksiz doldur.
nutritionAiReport içinde:
1. karar (5 sınıftan biri)
2. skor (0-10)
3. porsiyon (varsayım olduğunu belirt)
4. kaloriVeMakrolar (kalori, protein, karbonhidrat, yag, lif, seker, doymusYag, sodyum)
5. avantajlar (dizi)
6. dezavantajlar (dizi)
7. kullaniciyaOzelDegerlendirme
8. dahaIyiKombinasyon
9. alternatif (hazırlama veya muadil)
10. kisaSonuc ("Bunu yiyebilir miyim?" sorusuna doğrudan net cevap)

Ayrıca 'detailedReport' alanında derinlemesine metabolik analizi de sağla. Sadece JSON dön.`;

  const prompt = `Lütfen şu besini Nutrition AI standartlarında analiz et: ${foodName}. ${staticContext} ${profileContext} ${historyContext}`;

  try {
    const response = await getGenAI().models.generateContent({
      model,
      contents: prompt,
      config: {
        systemInstruction,
        thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            foodName: { type: Type.STRING },
            kat: { type: Type.STRING },
            score: { type: Type.NUMBER },
            lightStatus: { type: Type.STRING, enum: ["GREEN", "YELLOW", "RED"] },
            lightDescription: { type: Type.STRING },
            kal: { type: Type.NUMBER },
            karb: { type: Type.NUMBER },
            pro: { type: Type.NUMBER },
            yag: { type: Type.NUMBER },
            gi: { type: Type.NUMBER },
            gy: { type: Type.NUMBER },
            lif: { type: Type.NUMBER },
            nutritionAiReport: {
              type: Type.OBJECT,
              properties: {
                karar: { 
                  type: Type.STRING, 
                  enum: ['🟢 ÇOK İYİ', '🟢 İYİ SEÇİM', '🟡 ÖLÇÜLÜ TÜKET', '🟠 SINIRLI TÜKET', '🔴 MÜMKÜNSE KAÇIN'] 
                },
                skor: { type: Type.NUMBER },
                porsiyon: { type: Type.STRING },
                kaloriVeMakrolar: {
                  type: Type.OBJECT,
                  properties: {
                    kalori: { type: Type.NUMBER },
                    protein: { type: Type.NUMBER },
                    karbonhidrat: { type: Type.NUMBER },
                    yag: { type: Type.NUMBER },
                    lif: { type: Type.NUMBER },
                    seker: { type: Type.NUMBER },
                    doymusYag: { type: Type.NUMBER },
                    sodyum: { type: Type.NUMBER }
                  },
                  required: ["kalori", "protein", "karbonhidrat", "yag"]
                },
                avantajlar: { type: Type.ARRAY, items: { type: Type.STRING } },
                dezavantajlar: { type: Type.ARRAY, items: { type: Type.STRING } },
                kullaniciyaOzelDegerlendirme: { type: Type.STRING },
                dahaIyiKombinasyon: { type: Type.STRING },
                alternatif: { type: Type.STRING },
                kisaSonuc: { type: Type.STRING }
              },
              required: [
                "karar", "skor", "porsiyon", "kaloriVeMakrolar", 
                "avantajlar", "dezavantajlar", "kullaniciyaOzelDegerlendirme", 
                "dahaIyiKombinasyon", "alternatif", "kisaSonuc"
              ]
            },
            citizenAnalysis: {
              type: Type.OBJECT,
              properties: {
                scores: {
                  type: Type.OBJECT,
                  properties: {
                    kanSekeri: { type: Type.OBJECT, properties: { score: { type: Type.NUMBER }, max: { type: Type.NUMBER }, desc: { type: Type.STRING } }, required: ["score", "max", "desc"] },
                    besinYogunlugu: { type: Type.OBJECT, properties: { score: { type: Type.NUMBER }, max: { type: Type.NUMBER }, desc: { type: Type.STRING } }, required: ["score", "max", "desc"] },
                    yagKalitesi: { type: Type.OBJECT, properties: { score: { type: Type.NUMBER }, max: { type: Type.NUMBER }, desc: { type: Type.STRING } }, required: ["score", "max", "desc"] },
                    lifOrani: { type: Type.OBJECT, properties: { score: { type: Type.NUMBER }, max: { type: Type.NUMBER }, desc: { type: Type.STRING } }, required: ["score", "max", "desc"] },
                    islenmislik: { type: Type.OBJECT, properties: { score: { type: Type.NUMBER }, max: { type: Type.NUMBER }, desc: { type: Type.STRING } }, required: ["score", "max", "desc"] }
                  },
                  required: ["kanSekeri", "besinYogunlugu", "yagKalitesi", "lifOrani", "islenmislik"]
                },
                aiNote: { type: Type.STRING },
                detailedReport: { type: Type.STRING },
                eforKarsiligi: { type: Type.STRING },
                hataAlarmlari: { type: Type.ARRAY, items: { type: Type.STRING } },
                iyilestirmeHack: { type: Type.STRING },
                vatandasSorulari: {
                  type: Type.OBJECT,
                  properties: {
                    kiloVerme: { type: Type.STRING },
                    tansiyonSeker: { type: Type.STRING }
                  },
                  required: ["kiloVerme", "tansiyonSeker"]
                }
              },
              required: ["scores", "aiNote", "detailedReport", "eforKarsiligi", "hataAlarmlari", "iyilestirmeHack", "vatandasSorulari"]
            }
          },
          required: [
            "foodName", "score", "lightStatus", "lightDescription", 
            "kal", "karb", "pro", "yag", "gi", "gy", "lif",
            "citizenAnalysis"
          ]
        }
      }
    });

    console.log("AI Food Analysis Response:", response.text);

    if (!response.text) {
      throw new Error("Boş yanıt alındı.");
    }

    const finalResult = JSON.parse(response.text);
    // Analizi önbelleğe kaydet
    setCache(foodName, finalResult);
    return finalResult;
  } catch (error: any) {
    console.error("Besin analizi hatası:", error);
    throw new Error(`Besin analizi yapılamadı: ${error?.message || 'Bilinmeyen hata'}`);
  }
}
