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
  circadianData: {
    hour: string;
    impact: number;
    label: string;
  }[];
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

    return JSON.parse(response.text);
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
    reason: string;
  }[];
  totalCalories: number;
  overallMetabolicScore: number;
  generalAdvice: string;
}

export async function analyzePlateImage(base64Image: string, profileContext: string = ""): Promise<PlateAnalysisResult> {
  const model = "gemini-3.1-flash-lite-preview";
  
  const systemInstruction = `Sen uzman bir görsel besin analistisin. Bir tabak fotoğrafındaki besinleri tanımlar, porsiyonlarını tahmin eder ve metabolik sağlık (insülin direnci) açısından puanlarsın.
  
  Analiz Kuralları:
  1. Fotoğraftaki her bir besini ayrı ayrı tanımla.
  2. Porsiyon büyüklüğünü (gram veya adet/kaşık bazında) tahmin et.
  3. Her besin için 1-10 arası bir metabolik skor ver (10 en sağlıklı).
  4. Toplam kaloriyi ve genel bir metabolik puanı hesapla.
  5. Kullanıcının profiline göre (varsa) özel tavsiyeler ver.`;

  const prompt = `Bu tabaktaki besinleri analiz et. ${profileContext} Yanıtı JSON formatında sağla.`;

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
                  reason: { type: Type.STRING }
                },
                required: ["name", "portion", "estimatedCalories", "score", "reason"]
              }
            },
            totalCalories: { type: Type.NUMBER },
            overallMetabolicScore: { type: Type.NUMBER },
            generalAdvice: { type: Type.STRING }
          },
          required: ["identifiedFoods", "totalCalories", "overallMetabolicScore", "generalAdvice"]
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

export async function getCoachResponse(messages: {role: 'user' | 'assistant', content: string}[], profileContext: string = ""): Promise<string> {
  const model = "gemini-3.1-flash-lite-preview";
  
  const systemInstruction = `Sen GliSkor uygulamasının uzman AI Beslenme Koçusun. Kullanıcılara insülin direnci, glisemik indeks ve sağlıklı beslenme konularında rehberlik edersin.
  
  Kişiliğin:
  - Bilimsel ama anlaşılır (teknik terimleri açıkla).
  - Motive edici ve destekleyici.
  - Aksiyon odaklı (her zaman pratik bir tavsiye ver).
  - Kullanıcının sağlık verilerine (varsa) saygılı.
  
  Kullanıcı Profili: ${profileContext}`;

  try {
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
      message: messages[messages.length - 1].content
    });
    return response.text || "Üzgünüm, şu an yanıt veremiyorum.";
  } catch (error) {
    console.error("Koç yanıt hatası:", error);
    return "Üzgünüm, şu an yanıt veremiyorum. Lütfen daha sonra tekrar deneyin.";
  }
}

export async function analyzeBarcode(barcode: string): Promise<NutritionData | null> {
  const model = "gemini-3.1-flash-lite-preview";
  
  const systemInstruction = `Sen bir barkod ve ürün veri tabanısın. Verilen barkod numarası için ürünün adını ve 100g porsiyon bazında besin değerlerini sağla.
  Eğer ürünü bulamazsan null döndür.`;

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
  2. Sağlık Skoru (healthScore): 1-10 arası. 10 en besleyici, 1 en boş kalorili.
  
  Eğer sana veritabanı değerleri (staticContext) verilmişse, o değerleri kaynak olarak kullan. Verilmemişse kendi bilgilerine göre tahmin et.
  
  Çıktı Formatı Gereksinimleri:
  - insulinEffect: "Düşük", "Orta-Düşük", "Orta", "Yüksek" gibi sözel bir ifade.
  - metabolicEffect: Besinin metabolizma üzerindeki etkisi hakkında 2-3 cümlelik teknik açıklama.
  - functionalBenefit: Besinin içerdiği vitamin, mineral veya lif gibi faydalı bileşenler hakkında açıklama.
  - profileComments: 4 farklı profil için (kilo vermek isteyen, diyabetik, sporcu, çölyak) kısa, aksiyon odaklı tavsiyeler.
  - warning: Pişirme süresi, sos içeriği veya porsiyon kontrolü gibi kritik bir uyarı.
  - suggestion: Genel bir biyohack veya eşleşme tavsiyesi.
  - circadianData: Besinin günün farklı saatlerindeki (08:00, 12:00, 16:00, 20:00, 00:00) metabolik etkisini (1-10 arası puan) ve kısa bir etiketi sağla.`;

  const prompt = `"${foodName}" besini için analiz yap. Kullanıcının günlük yüksek GY öğün sayısı: ${highGYCount}. ${profileContext} ${staticContext} Yanıtı JSON formatında sağla.`;

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
            gi: { type: Type.NUMBER },
            gy: { type: Type.NUMBER },
            ii: { type: Type.NUMBER },
            fr: { type: Type.NUMBER },
            lp: { type: Type.NUMBER },
            mx: { type: Type.STRING, enum: ["liquid", "solid"] },
            score: { type: Type.NUMBER },
            healthScore: { type: Type.NUMBER },
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
            yag: { type: Type.NUMBER },
            circadianData: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  hour: { type: Type.STRING },
                  impact: { type: Type.NUMBER },
                  label: { type: Type.STRING }
                },
                required: ["hour", "impact", "label"]
              }
            }
          },
          required: ["foodName", "gi", "gy", "ii", "fr", "lp", "mx", "score", "healthScore", "insulinEffect", "metabolicEffect", "functionalBenefit", "profileComments", "warning", "suggestion", "kal", "karb", "pro", "yag", "circadianData"]
        }
      }
    });

    console.log("AI Food Analysis Response:", response.text);

    if (!response.text) {
      throw new Error("Boş yanıt alındı.");
    }

    return JSON.parse(response.text);
  } catch (error: any) {
    console.error("Besin analizi hatası:", error);
    throw new Error(`Besin analizi yapılamadı: ${error?.message || 'Bilinmeyen hata'}`);
  }
}
