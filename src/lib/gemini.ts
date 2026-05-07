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

// Akıllı Önbellek Yapıları
const ANALYSIS_CACHE_KEY = 'gliskor_analysis_cache';
const NUTRITION_CACHE_KEY = 'gliskor_nutrition_cache';

interface CachedAnalysis {
  timestamp: number;
  result: AnalysisResult;
}

interface CachedNutrition {
  timestamp: number;
  data: NutritionData;
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

function setNutritionCache(foodName: string, data: NutritionData) {
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
  satietyScore: number;
  inflammatoryScore: number;
  cookingMethodImpact: string;
  foodPairingAdvice: string;
  pairingSuggestions: {
    name: string;
    icon: string;
    reason: string;
  }[];
  kal: number;
  karb: number;
  pro: number;
  yag: number;
  circadianData: {
    hour: string;
    impact: number;
    label: string;
  }[];
  metabolicMemory: string;
  nutrientAccumulation: string;
  systemicInflammationRisk: {
    level: number;
    warning: string;
  };
  microbiotaResilience: {
    score: number;
    description: string;
  };
  threeMonthProjection: {
    weightChange: string;
    insulinImpact: string;
    energyLevel: string;
  };
  cumulativeFeedback: string;
  eatingSuitabilityScore: number;
  lightStatus: 'GREEN' | 'YELLOW' | 'RED';
  lightDescription: string;
  isFromCache?: boolean;
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
  // Önce önbelleğe bak
  const cache = getNutritionCache();
  const cached = cache[foodName.toLowerCase()];
  const CACHE_TTL = 30 * 24 * 60 * 60 * 1000; // 30 gün

  if (cached && (Date.now() - cached.timestamp < CACHE_TTL)) {
    console.log("Using cached nutrition for:", foodName);
    return cached.data;
  }

  const model = "gemini-3-flash-preview";
  
  const systemInstruction = `Besin veri tabanısın. 100g için verileri JSON formatında sağla: { "isim": string, "gi": number, "karb": number, "lif": number, "pro": number, "yag": number, "kal": number }. Hata yapma, sadece JSON dön.`;

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
    reason: string;
  }[];
  totalCalories: number;
  overallMetabolicScore: number;
  generalAdvice: string;
}

export async function analyzePlateImage(base64Image: string, profileContext: string = ""): Promise<PlateAnalysisResult> {
  const model = "gemini-3-flash-preview";
  
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
  const model = "gemini-3-flash-preview";
  
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
  const model = "gemini-3-flash-preview";
  
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

export async function analyzeFood(
  foodName: string, 
  highGYCount: number = 0, 
  profileContext: string = "", 
  staticData?: NutritionData & { mScore?: number, nScore?: number },
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
      ii: gi * 0.9,
      fr: 0,
      lp: staticData.lif,
      mx: staticData.karb > 20 ? "solid" : "liquid",
      score: staticData.mScore,
      healthScore: staticData.nScore,
      insulinEffect: status === 'GREEN' ? "Düşük/Stabil" : status === 'YELLOW' ? "Orta Şeker Yanıtı" : "Yüksek İnsülin Salınımı",
      metabolicEffect: `Bu besin ${gi} GI ve ${gy} GY değerine sahip. Karbonhidrat: ${staticData.karb}g, Lif: ${staticData.lif}g.`,
      functionalBenefit: "Yerel veri tabanı eşleşmesi ile saniyeler içinde analiz edildi.",
      profileComments: {
        weightLoss: "Porsiyon kontrolü ile uygun.",
        diabetic: gi < 55 ? "Düşük riskli." : "Dikkatli olunmalı.",
        athlete: "Enerji kaynağı olarak kullanılabilir.",
        celiac: "İçerik kontrolü önerilir."
      },
      warning: status === 'RED' ? "Porsiyonu küçültün veya protein ile dengeleyin." : "Dengeli tüketim önerilir.",
      suggestion: "Yanına yeşil yapraklı sebze ekleyerek emilimi yavaşlatabilirsiniz.",
      satietyScore: Math.min(10, Math.round((staticData.pro || 0) * 0.5 + (staticData.lif || 0) * 2)),
      inflammatoryScore: (staticData.lif || 0) > 3 ? 2 : 5,
      cookingMethodImpact: "Pişirme yöntemi GI değerini %10-20 etkileyebilir.",
      foodPairingAdvice: "Sirke veya limon eklemek sindirimi yavaşlatır.",
      pairingSuggestions: [
        { name: "Ceviz", icon: "🥜", reason: "Sağlıklı yağlar emilimi yavaşlatır" },
        { name: "Yoğurt", icon: "🥛", reason: "Protein glisemik yükü dengeler" }
      ],
      kal: staticData.kal,
      karb: staticData.karb,
      pro: staticData.pro,
      yag: staticData.yag,
      circadianData: [
        { hour: "08:00", impact: 8, label: "İdeal" },
        { hour: "14:00", impact: 7, label: "Uygun" },
        { hour: "21:00", impact: 3, label: "Riskli" }
      ],
      metabolicMemory: "Fizyolojik denge aralığında.",
      nutrientAccumulation: "Bilinmiyor (Detaylı AI analizi gerekir).",
      systemicInflammationRisk: { level: 4, warning: "Normal." },
      microbiotaResilience: { score: 6, description: "Lif orta seviye." },
      threeMonthProjection: { weightChange: "Stabil", insulinImpact: "Nötr", energyLevel: "Dengeli" },
      cumulativeFeedback: "Bu analiz yerel veritabanı hesaplamaları ile anında üretilmiştir.",
      eatingSuitabilityScore: Number(((staticData.nScore * 0.35) + (staticData.mScore * 0.4) + (Math.min(10, (staticData.pro || 0) + (staticData.lif || 0)) * 0.25)).toFixed(1)),
      lightStatus: status,
      lightDescription: status === 'GREEN' ? "YEŞİL IŞIK: Mükemmel seçim." : status === 'YELLOW' ? "SARI IŞIK: Uygun ama porsiyona dikkat." : "KIRMIZI IŞIK: Porsiyonu azaltın.",
      isFromCache: true
    };
    return localResult;
  }

  const model = "gemini-3-flash-preview";
  
  let staticContext = "";
  if (staticData) {
    // 2. VERİTABANI VARSA AI'YA "DAHA AZ DÜŞÜN" DE (KOTA TASARRUFU - ADIM 2)
    staticContext = `VERİ MEVCUT: GI:${staticData.gi}, Karb:${staticData.karb}g, Lif:${staticData.lif}g, Pro:${staticData.pro}g, Yağ:${staticData.yag}g, Kal:${staticData.kal}kcal. HESAPLAMA YAPMA, BU VERİLERİ YORUMLA.`;
  }

  const systemInstruction = `Kıdemli Biyokimya Uzmanı olarak besinleri modern tıp ve NOVA'ya göre analiz et.
  KRİTER: Gi, Gy, Ii, Fr, Lp, Mx, Kal, Karb, Pro, Yag, Doygunluk, Enflamasyon.
  ÖZEL:
  - Enflamasyon > 4 ise Skor max 6.
  - Gece (21:00+) Karb/Yağ %20 ceza.
  - eatingSuitabilityScore: (Health*0.35)+(Score*0.3)+(Satiety*0.15)-(Inflight*0.2).
  - JSON formatında tam veri dön.`;

  const prompt = `"${foodName}" besini için analiz yap. 
  Kullanıcının günlük yüksek GY öğün sayısı: ${highGYCount}. 
  Profil: ${profileContext} 
  Statik Veri: ${staticContext} 
  Geçmiş Veriler (Kümülatif Analiz İçin): ${historyContext} 
  Yanıtı JSON formatında sağla.`;

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
            satietyScore: { type: Type.NUMBER },
            inflammatoryScore: { type: Type.NUMBER },
            cookingMethodImpact: { type: Type.STRING },
            foodPairingAdvice: { type: Type.STRING },
            pairingSuggestions: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING },
                  icon: { type: Type.STRING },
                  reason: { type: Type.STRING }
                },
                required: ["name", "icon", "reason"]
              }
            },
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
            },
            metabolicMemory: { type: Type.STRING },
            nutrientAccumulation: { type: Type.STRING },
            systemicInflammationRisk: {
              type: Type.OBJECT,
              properties: {
                level: { type: Type.NUMBER },
                warning: { type: Type.STRING }
              },
              required: ["level", "warning"]
            },
            microbiotaResilience: {
              type: Type.OBJECT,
              properties: {
                score: { type: Type.NUMBER },
                description: { type: Type.STRING }
              },
              required: ["score", "description"]
            },
            threeMonthProjection: {
              type: Type.OBJECT,
              properties: {
                weightChange: { type: Type.STRING },
                insulinImpact: { type: Type.STRING },
                energyLevel: { type: Type.STRING }
              },
              required: ["weightChange", "insulinImpact", "energyLevel"]
            },
            cumulativeFeedback: { type: Type.STRING },
            eatingSuitabilityScore: { type: Type.NUMBER },
            lightStatus: { type: Type.STRING, enum: ["GREEN", "YELLOW", "RED"] },
            lightDescription: { type: Type.STRING }
          },
          required: [
            "foodName", "gi", "gy", "ii", "fr", "lp", "mx", "score", "healthScore", 
            "satietyScore", "inflammatoryScore", "cookingMethodImpact", "foodPairingAdvice", 
            "pairingSuggestions", "insulinEffect", "metabolicEffect", "functionalBenefit", 
            "profileComments", "warning", "suggestion", "kal", "karb", "pro", "yag", 
            "circadianData", "metabolicMemory", "nutrientAccumulation", "systemicInflammationRisk",
            "microbiotaResilience", "threeMonthProjection", "cumulativeFeedback",
            "eatingSuitabilityScore", "lightStatus", "lightDescription"
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
