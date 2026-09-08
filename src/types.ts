export type NutritionAiDecision = 
  | '🟢 ÇOK İYİ'
  | '🟢 İYİ SEÇİM'
  | '🟡 ÖLÇÜLÜ TÜKET'
  | '🟠 SINIRLI TÜKET'
  | '🔴 MÜMKÜNSE KAÇIN';

export interface NutritionAiReport {
  karar: NutritionAiDecision;
  skor: number;
  porsiyon: string;
  kaloriVeMakrolar: {
    kalori: number;
    protein: number;
    karbonhidrat: number;
    yag: number;
    lif?: number;
    seker?: number;
    doymusYag?: number;
    sodyum?: number;
    tahminiMi?: boolean;
  };
  avantajlar: string[];
  dezavantajlar: string[];
  kullaniciyaOzelDegerlendirme: string;
  dahaIyiKombinasyon: string;
  alternatif: string;
  kisaSonuc: string;
}

export interface Food {
  isim: string;
  kat: string;
  gi: number;
  karb: number;
  lif: number;
  pro: number;
  yag: number;
  kal: number;
  score: number;
  isFromCache?: boolean;
  citizenAnalysis?: AnalysisResult['citizenAnalysis'];
  nutritionAiReport?: NutritionAiReport;
  portionGram?: number;
  portionLabel?: string;
  kolesterol?: number;
  vitA?: number;
  vitC?: number;
  potasyum?: number;
  kalsiyum?: number;
  demir?: number;
  verdict?: string;
}

export type MealSequence = 'standard' | 'carbsFirst' | 'ideal';

export interface ConsumptionContext {
  isCooked: boolean;
  mealSequence: MealSequence;
  hasAcid: boolean;
  isLiquid: boolean;
  isResistant: boolean;
  hour: number;
  isProcessed: boolean;
  hasMovement: boolean;
  highGYCount: number;
  isLowSleep: boolean;
  isStressed: boolean;
}

export interface AnalysisResult {
  foodName: string;
  gi: number;
  gy: number;
  lif: number;
  kat: string;
  score: number;
  lightStatus: 'GREEN' | 'YELLOW' | 'RED';
  lightDescription: string;
  citizenAnalysis: {
    scores: {
      kanSekeri: { score: number; max: number; desc: string };
      besinYogunlugu: { score: number; max: number; desc: string };
      yagKalitesi: { score: number; max: number; desc: string };
      lifOrani: { score: number; max: number; desc: string };
      islenmislik: { score: number; max: number; desc: string };
    };
    aiNote: string;
    eforKarsiligi: string;
    hataAlarmlari: string[];
    iyilestirmeHack: string;
    vatandasSorulari: {
      kiloVerme: string;
      tansiyonSeker: string;
    };
    detailedReport?: string;
  };
  isFromCache?: boolean;
  kal: number;
  karb: number;
  pro: number;
  yag: number;
  portionGram?: number;
  portionLabel?: string;
  kolesterol?: number;
  vitA?: number;
  vitC?: number;
  potasyum?: number;
  kalsiyum?: number;
  demir?: number;
  verdict?: string;
  suggestion?: string;
  nutritionAiReport?: NutritionAiReport;
}
