/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect, useCallback, ReactNode, ErrorInfo } from 'react';
import { Search, X, ChevronRight, Info, Brain, Loader2, AlertTriangle, Lightbulb, Droplets, Beef, Wheat, Plus, Minus, Edit2, Trash2, Moon, Activity, Leaf, Thermometer, CheckCircle2, Zap, Utensils, ShoppingBasket, Sparkles, User, History, Sun, Waves, Camera, Upload, Image as ImageIcon, Trophy, Star, Target, Flame, Award, RefreshCcw, Mic, MicOff, TrendingUp, Check, Timer, Footprints, Scale, Clock, Database } from 'lucide-react';

// Error Boundary Component
interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error("Uncaught error:", error, errorInfo);
  }

  render() {
    const { hasError } = this.state;
    const { children } = this.props;

    if (hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center p-6 bg-[#F5F5F0] text-black text-center">
          <div className="max-w-md w-full p-10 bg-white rounded-[3rem] shadow-2xl border border-black/5">
            <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
              <AlertTriangle size={40} className="text-red-500" />
            </div>
            <h1 className="text-2xl font-black mb-4 tracking-tight">Bir Hata Oluştu</h1>
            <p className="text-zinc-500 mb-8 leading-relaxed">
              Uygulama yüklenirken beklenmedik bir sorunla karşılaştık. Lütfen sayfayı yenilemeyi deneyin.
            </p>
            <button 
              onClick={() => window.location.reload()}
              className="w-full py-4 bg-black text-white rounded-2xl font-bold flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-[0.98] transition-all"
            >
              <RefreshCcw size={18} />
              Sayfayı Yenile
            </button>
          </div>
        </div>
      );
    }
    return children;
  }
}
import { motion, AnimatePresence } from 'framer-motion';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, AreaChart, Area, XAxis, YAxis, CartesianGrid, BarChart, Bar, Legend } from 'recharts';
import { analyzeFood, getNutritionData, analyzePlateImage, getCoachResponse, analyzeBarcode, type PlateAnalysisResult } from './lib/gemini';
import { Food, AnalysisResult, ConsumptionContext, MealSequence } from './types';
import { 
  calculateGY, 
  calculateMetabolicScore, 
  calculateNutritionalScore, 
  calculateEffectiveGI 
} from './lib/metabolic';
import { CURRENT_VERSION, VERSION_HISTORY } from './constants/versions';
import { auth, db, signInWithGoogle, logout } from './lib/firebase';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { doc, setDoc, getDoc, collection, query, where, onSnapshot, addDoc, orderBy, limit, Timestamp, serverTimestamp } from 'firebase/firestore';

import { initialFoods } from './data/foods';
import { NutritionAiDecisionCard } from './components/NutritionAiDecisionCard';

interface UserStats {
  points: number;
  level: number;
  streak: number;
  lastLogDate: string | null;
  totalLogs: number;
  bestMetabolicScore: number;
}

interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  unlockedAt: number | null;
  requirement: number;
  progress: number;
  type: 'streak' | 'points' | 'score' | 'logs';
}

interface LogEntry {
  id: string;
  food: Food;
  amount: number;
  timestamp: number;
  mealType: 'Kahvaltı' | 'Öğle' | 'Akşam' | 'Atıştırmalık' | 'Analiz';
}

const foods: Food[] = initialFoods;



function PairingBox({ food, score, darkMode }: { food: Food, score: number, darkMode: boolean }) {
  if (score >= 6) return null;
  
  const pairings = [
    { name: "Zeytinyağı", icon: "🫒" },
    { name: "Çiğ Badem", icon: "🥜" },
    { name: "Ceviz", icon: "🧠" },
    { name: "Avokado", icon: "🥑" },
    { name: "Haşlanmış Yumurta", icon: "🥚" },
    { name: "Lor Peyniri", icon: "🧀" }
  ];
  
  const selected = pairings.sort(() => 0.5 - Math.random()).slice(0, 2);
  
  return (
    <div className={`mt-8 p-6 ${darkMode ? 'bg-white/5' : 'bg-zinc-50'} rounded-2xl relative overflow-hidden group/pairing`}>
      <div className="text-[0.65rem] font-black text-zinc-500 uppercase mb-4 flex items-center gap-2 tracking-[0.2em] relative z-10">
        İDEAL EŞLEŞME
      </div>
      <div className="flex flex-wrap gap-3 relative z-10">
        {selected.map(p => (
          <div key={p.name} className={`flex items-center gap-2.5 ${darkMode ? 'bg-white/5 border-white/10 text-zinc-200' : 'bg-white border-black/5 text-zinc-800'} px-3.5 py-2 rounded-xl text-[0.8rem] border shadow-sm transition-all cursor-default`}>
            <span className="text-lg">{p.icon}</span> 
            <span className="font-bold tracking-tight">{p.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function CircadianRhythmWidget({ data, darkMode }: { data: any[], darkMode: boolean }) {
  const getRingColorLocal = (s: number) => {
    if (s >= 8) return '#2D5016';
    if (s >= 5) return '#8B5E00';
    if (s >= 3) return '#7A2E00';
    return '#6B0F0F';
  };

  return (
    <div className={`p-5 xs:p-8 rounded-[1.5rem] sm:rounded-[2.5rem] border ${darkMode ? 'bg-white/5 border-white/5' : 'bg-black/5 border-black/5'} flex flex-col h-full w-full`}>
      <div className="text-[0.55rem] xs:text-[0.6rem] font-black text-zinc-500 uppercase tracking-[0.3em] mb-6">SİRKADİYEN METABOLİK YANIT</div>
      <div className="flex-1 w-full min-h-[150px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="colorImpact" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#2DFF73" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#2DFF73" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={darkMode ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)"} />
            <XAxis 
              dataKey="hour" 
              axisLine={false} 
              tickLine={false} 
              tick={{ fontSize: 10, fill: '#71717a', fontWeight: 'bold' }}
            />
            <YAxis hide domain={[0, 10]} />
            <RechartsTooltip 
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  return (
                    <div className={`p-3 rounded-xl border shadow-xl ${darkMode ? 'bg-[#1A1A1A] border-white/10' : 'bg-white border-black/10'}`}>
                      <div className="text-[0.6rem] font-black text-zinc-500 uppercase mb-1">{payload[0].payload.hour}</div>
                      <div className="flex items-center gap-2">
                        <div className="text-[1rem] font-black" style={{ color: getRingColorLocal(payload[0].value as number) }}>
                          {payload[0].value}/10
                        </div>
                        <div className={`text-[0.6rem] font-black px-2 py-0.5 rounded-full ${payload[0].payload.label === 'İdeal' ? 'bg-emerald-500/10 text-emerald-500' : payload[0].payload.label === 'Dikkat' ? 'bg-orange-500/10 text-orange-500' : 'bg-red-500/10 text-red-500'}`}>
                          {payload[0].payload.label}
                        </div>
                      </div>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Area 
              type="monotone" 
              dataKey="impact" 
              stroke="#2DFF73" 
              strokeWidth={3}
              fillOpacity={1} 
              fill="url(#colorImpact)" 
              animationDuration={2000}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-4 flex justify-between items-center">
        <div className="text-[0.65rem] text-zinc-500 font-medium leading-tight max-w-[70%]">
          Vücudun insülin duyarlılığı akşam saatlerinde azaldığı için aynı besin gece daha yüksek glisemik yanıt oluşturur.
        </div>
        <div className="flex flex-col items-end">
          <span className="text-[0.5rem] text-zinc-500 font-black uppercase">En İdeal Zaman</span>
          <span className="text-[0.8rem] font-black text-[#2DFF73]">08:00 - 12:00</span>
        </div>
      </div>
    </div>
  );
}





function SkeletonLoader({ darkMode }: { darkMode: boolean }) {
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 md:p-8 bg-black/80 backdrop-blur-sm">
      <div className={`rounded-[3rem] relative border shadow-[0_0_100px_rgba(0,0,0,0.5)] overflow-hidden max-w-4xl w-full max-h-[95vh] overflow-y-auto custom-scrollbar flex flex-col ${darkMode ? 'bg-[#0A0A0A] text-white border-white/10' : 'bg-[#F5F5F0] text-black border-black/10'}`}>
        <div className="p-8 md:p-12 pb-4 border-b border-white/5">
          <div className="flex flex-col md:flex-row justify-between items-start gap-8">
            <div className="flex-1 w-full">
              <div className={`h-16 w-2/3 rounded-2xl animate-pulse mb-4 ${darkMode ? 'bg-white/5' : 'bg-black/5'}`} />
              <div className={`h-6 w-1/4 rounded-full animate-pulse ${darkMode ? 'bg-white/5' : 'bg-black/5'}`} />
            </div>
            <div className="flex gap-3 flex-wrap justify-end">
              <div className={`w-12 h-12 rounded-full animate-pulse ${darkMode ? 'bg-white/5' : 'bg-black/5'}`} />
              <div className={`w-12 h-12 rounded-full animate-pulse ${darkMode ? 'bg-white/5' : 'bg-black/5'}`} />
              <div className={`w-12 h-12 rounded-full animate-pulse ${darkMode ? 'bg-white/5' : 'bg-black/5'}`} />
              <div className={`w-12 h-12 rounded-full animate-pulse ${darkMode ? 'bg-white/5' : 'bg-black/5'}`} />
            </div>
          </div>
        </div>

        <div className="p-6 md:p-10 pt-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className={`md:col-span-1 md:row-span-2 h-[300px] rounded-[2.5rem] animate-pulse ${darkMode ? 'bg-white/5' : 'bg-black/5'}`} />
            <div className={`md:col-span-3 h-[120px] rounded-[2.5rem] animate-pulse ${darkMode ? 'bg-white/5' : 'bg-black/5'}`} />
            <div className={`md:col-span-3 h-[100px] rounded-[2.5rem] animate-pulse ${darkMode ? 'bg-white/5' : 'bg-black/5'}`} />
            <div className={`md:col-span-4 h-[200px] rounded-[2.5rem] animate-pulse ${darkMode ? 'bg-white/5' : 'bg-black/5'}`} />
            <div className={`md:col-span-2 h-[100px] rounded-[2.5rem] animate-pulse ${darkMode ? 'bg-white/5' : 'bg-black/5'}`} />
            <div className={`md:col-span-2 h-[100px] rounded-[2.5rem] animate-pulse ${darkMode ? 'bg-white/5' : 'bg-black/5'}`} />
            <div className={`md:col-span-4 h-[80px] rounded-[2.5rem] animate-pulse ${darkMode ? 'bg-white/5' : 'bg-black/5'}`} />
          </div>
        </div>
      </div>
    </div>
  );
}



function getHackerAdvice(f: Food, s: number, darkMode: boolean) {
  const lowerName = f.isim.toLowerCase();
  const processedKeywords = ['sucuk', 'salam', 'sosis', 'pastırma', 'nugget', 'jambon', 'hazır paketli', 'füme', 'konserve', 'şekerli', 'soslu', 'kızarmış'];
  const isUltraProcessed = processedKeywords.some(kw => lowerName.includes(kw));
  const isProcessedMeat = ['sucuk', 'salam', 'sosis', 'pastırma', 'jambon', 'nugget'].some(kw => lowerName.includes(kw));

  if (isProcessedMeat) {
    return (
      <div className="space-y-4">
        <p className="text-[0.75rem] font-black text-zinc-400 uppercase tracking-[0.2em] flex items-center gap-2">
          <Brain size={16} className="text-blue-400" />
          Biyohack: Antioksidan Zorunluluğu
        </p>
        <div className={`${darkMode ? 'glass border-white/10' : 'light-glass border-black/10'} rounded-2xl p-4`}>
          <div className="flex items-center gap-3 mb-3">
            <div className={`p-2 rounded-xl border ${darkMode ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-emerald-500/5 border-emerald-500/10'}`}>
              <Leaf size={16} className="text-emerald-400" />
            </div>
            <span className={`text-[0.8rem] font-black uppercase tracking-widest ${darkMode ? 'text-zinc-100' : 'text-zinc-900'}`}>C Vitamini Kalkanı</span>
          </div>
          <ul className="space-y-3">
            <li className={`text-[0.9rem] leading-relaxed ${darkMode ? 'text-zinc-300' : 'text-zinc-700'}`}>
              <div className={`font-bold mb-1 ${darkMode ? 'text-zinc-100' : 'text-zinc-900'}`}>• Bol limonlu maydanoz veya yeşil biber ekle.</div>
              <div className="text-[0.75rem] text-zinc-500 italic pl-4 border-l-2 border-blue-500/30 ml-1">
                <span className="font-black not-italic text-blue-400">NEDEN?</span> C vitamini, işlenmiş etlerdeki nitritin zararlı bileşiklere dönüşmesini biyokimyasal olarak engeller.
              </div>
            </li>
          </ul>
        </div>
      </div>
    );
  }

  if (isUltraProcessed && !isProcessedMeat) {
    return (
      <div className="space-y-4">
        <p className="text-[0.75rem] font-black text-zinc-400 uppercase tracking-[0.2em] flex items-center gap-2">
          <Brain size={16} className="text-blue-400" />
          Anti-Enflamatuar Eşleşme Zorunluluğu
        </p>
        <div className={`${darkMode ? 'glass border-white/10' : 'light-glass border-black/10'} rounded-2xl p-4`}>
          <div className="flex items-center gap-3 mb-3">
            <div className={`p-2 rounded-xl border ${darkMode ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-emerald-500/5 border-emerald-500/10'}`}>
              <Leaf size={16} className="text-emerald-400" />
            </div>
            <span className={`text-[0.8rem] font-black uppercase tracking-widest ${darkMode ? 'text-zinc-100' : 'text-zinc-900'}`}>Antioksidan Kalkanı</span>
          </div>
          <ul className="space-y-3">
            <li className={`text-[0.9rem] leading-relaxed ${darkMode ? 'text-zinc-300' : 'text-zinc-700'}`}>
              <div className={`font-bold mb-1 ${darkMode ? 'text-zinc-100' : 'text-zinc-900'}`}>• Bol limonlu maydanoz, Kırmızı kapya biber veya Yeşil çay ekle.</div>
              <div className="text-[0.75rem] text-zinc-500 italic pl-4 border-l-2 border-blue-500/30 ml-1">
                <span className="font-black not-italic text-blue-400">NEDEN?</span> Antioksidanlar ultra-işlenmiş gıdaların yarattığı oksidatif stresi azaltmaya yardımcı olur.
              </div>
            </li>
          </ul>
        </div>
      </div>
    );
  }

  const isStarchy = f.kat === 'Tahıllar' || f.kat === 'Baklagiller' || lowerName.includes('patates') || lowerName.includes('ekmek') || lowerName.includes('makarna') || lowerName.includes('pirinç');
  
  const barriers: { title: string, icon: ReactNode, suggestions: { text: string, why: string }[] }[] = [];

  // 1. Asit Filtresi (Soluble Fiber Shield / Acid Filter)
  if (isStarchy || f.gi > 60) {
    barriers.push({
      title: 'Asit Filtresi',
      icon: <Droplets size={14} className="text-amber-600" />,
      suggestions: [
        { 
          text: "1 yemek kaşığı elma sirkesi, limon suyu veya yarım yeşil elma ekle.", 
          why: "Asetik asit ve pektin, amilaz enzimini geçici olarak yavaşlatarak nişastanın şekere dönüşme hızını %30'a kadar düşürür." 
        }
      ]
    });
  }

  // 2. Lif & Yağ Kalkanı (Gastric Emptying Retarders)
  if (s < 6) {
    const fatOptions = [
      { text: "10 adet çiğ badem veya 2 tam ceviz ekle.", why: "Magnezyum ve sağlıklı yağlar midenin boşalma süresini uzatır." },
      { text: "1 tatlı kaşığı sızma zeytinyağı gezdir.", why: "Yağlar glikozun ince bağırsağa 'damla damla' sızmasını sağlar." },
      { text: "1 yemek kaşığı chia veya keten tohumu ekle.", why: "Çözünür lifler mide içeriğini jelleştirerek emilimi yavaşlatır." }
    ];
    barriers.push({
      title: 'Lif & Yağ Kalkanı',
      icon: <Leaf size={14} className="text-emerald-600" />,
      suggestions: [fatOptions[Math.floor(Date.now() / 86400000) % fatOptions.length]]
    });
  }

  // 3. Protein Bariyeri (Glukagon Dengesi)
  if (s < 6) {
    const proteinOptions = [
      { text: "2 adet yumurta beyazı veya 1 tam yumurta ekle.", why: "Protein alımı glukagon salgılatarak insülinin depolama etkisini dengeler." },
      { text: "3 yemek kaşığı edamame veya mercimek filizi ekle.", why: "Bitkisel proteinler insülin yanıtını stabilize eder." },
      { text: "Öğününe kolajen desteği veya kemik suyu dahil et.", why: "Amino asitler glikoz metabolizmasını optimize eder." }
    ];
    barriers.push({
      title: 'Protein Bariyeri',
      icon: <Beef size={14} className="text-rose-600" />,
      suggestions: [proteinOptions[Math.floor(Date.now() / 43200000) % proteinOptions.length]]
    });
  }

  // 4. Dirençli Nişasta Dönüşümü (Resistant Starch Hack)
  if (isStarchy && s < 7) {
    barriers.push({
      title: 'Dirençli Nişasta',
      icon: <Thermometer size={14} className="text-blue-600" />,
      suggestions: [
        { 
          text: "Besini pişirdikten sonra 12-24 saat buzdolabında bekletip tekrar ısıt.", 
          why: "Bu teknikle nişasta kristalleşir ve glisemik yükü %40'a kadar düşebilir." 
        }
      ]
    });
  }

  if (barriers.length === 0) {
    return (
      <div className="p-3 bg-green-50 rounded-xl border border-green-100">
        <p className="text-[0.8rem] text-green-800 flex items-center gap-2">
          <Info size={14} /> Bu besin zaten metabolik olarak oldukça dengeli.
        </p>
      </div>
    );
  }
  return (
    <div className="space-y-4">
      <p className="text-[0.6rem] font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-2">
        <Brain size={14} className="text-blue-400" />
        METABOLİK STRATEJİ
      </p>
      
      <div className="grid gap-3">
        {barriers.map((b, i) => (
          <div key={i} className={`p-4 rounded-xl border ${darkMode ? 'bg-white/5 border-white/5' : 'bg-zinc-50 border-black/5'}`}>
            <div className="flex items-center gap-2.5 mb-3">
              <div className={`p-1.5 rounded-lg ${darkMode ? 'bg-blue-500/10 text-blue-400' : 'bg-blue-500/5 text-blue-500'}`}>
                {b.icon}
              </div>
              <span className={`text-[0.75rem] font-bold uppercase tracking-widest ${darkMode ? 'text-zinc-200' : 'text-zinc-800'}`}>{b.title}</span>
            </div>
            <ul className="space-y-2">
              {b.suggestions.map((sug, j) => (
                <li key={j} className="text-[0.85rem]">
                  <div className={`font-medium ${darkMode ? 'text-zinc-300' : 'text-zinc-700'}`}>• {sug.text}</div>
                  <div className="text-[0.7rem] text-zinc-500 italic mt-0.5 pl-3 border-l border-zinc-500/20">
                    Neden: {sug.why}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}

const getStatusInfo = (s: number, hour: number = new Date().getHours(), karb: number = 0, lif: number = 0) => {
  const net = Math.max(0, karb - lif);
  const isNight = (hour >= 20 || hour < 6) && net > 10;
  
  if (isNight) {
    return {
      cls: 'bg-red-500/10 text-red-400 border-red-500/20',
      dot: 'bg-red-500',
      label: 'Yeme',
      sub: 'Gece Karbonhidrat Riski',
      action: 'AVOID',
      color: '#EF4444'
    };
  }
  
  if (s >= 8) return {
    cls: 'bg-[#2DFF73]/10 text-[#2DFF73] border-[#2DFF73]/20',
    dot: 'bg-[#2DFF73]',
    label: 'Güvenle Ye',
    sub: 'Metabolik Dostu',
    action: 'ENJOY',
    color: '#2DFF73'
  };
  
  if (s >= 5) return {
    cls: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    dot: 'bg-blue-500',
    label: 'Ölçülü Ye',
    sub: 'Porsiyon Kontrolü',
    action: 'MODERATION',
    color: '#3B82F6'
  };
  
  if (s >= 3.5) return {
    cls: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
    dot: 'bg-orange-500',
    label: 'Dikkatli Ol',
    sub: 'Glikoz Piki Riski',
    action: 'CAUTION',
    color: '#F59E0B'
  };
  
  return {
    cls: 'bg-red-500/10 text-red-400 border-red-500/20',
    dot: 'bg-red-500',
    label: 'Uzak Dur',
    sub: 'Yüksek Glisemik Yük',
    action: 'AVOID',
    color: '#EF4444'
  };
};

function getRingColor(s: number) {
  if (s >= 8) return '#2DFF73';
  if (s >= 5) return '#3B82F6';
  if (s >= 3.5) return '#F59E0B';
  return '#EF4444';
}

function getTip(f: Food, s: number, ctx: ConsumptionContext) {
  const g = Number(calculateGY(f, ctx).toFixed(1));
  const net = Math.max(0, f.karb - f.lif);
  let tip = "";
  
  if (s >= 8) tip = `${f.isim}, düşük glisemik yük (GY: ${g}) ile kan şekerini stabil tutar. İnsülin direnci olan bireyler için güvenli bir seçim.`;
  else if (s >= 5) tip = `${f.isim} orta düzeyde glisemik etkiye sahip (GY: ${g}). Porsiyon kontrolüne dikkat edin; tek başına değil, protein veya lif kaynağıyla tüketin.`;
  else if (s >= 3) tip = `${f.isim}, yüksek GI (${f.gi}) nedeniyle kan şekerini hızlı yükseltebilir. Küçük porsiyonlar tercih edin ve yanına mutlaka protein ekleyin.`;
  else tip = `${f.isim} insülin direnci olan bireyler için önerilmez. GI: ${f.gi}, GY: ${g}. Daha düşük glisemik alternatifler tercih edilmeli.`;

  if ((ctx.hour >= 20 || ctx.hour < 6) && net > 10) {
    tip += " ⚠️ GECE UYARISI: Saat 20:00'den sonra karbonhidrat tüketimi insülin direncini %20 daha fazla zorlar ve yağ depolanmasını artırır.";
  }

  if (ctx.isLowSleep || ctx.isStressed) {
    tip += " ⚠️ KORTİZOL UYARISI: Az uyku veya stres nedeniyle insülin direnciniz geçici olarak artmış durumda. Vücudunuz glikozu kandan çekmekte zorlanabilir.";
  }

  if (ctx.isProcessed) {
    tip += " ⚠️ SOS/İŞLENMİŞ UYARISI: Gizli fruktoz şurubu ve katkı maddeleri karaciğer yağlanması riskini artırır.";
  }

  const processedKeywords = ['sucuk', 'salam', 'sosis', 'pastırma', 'nugget', 'füme', 'hazır', 'konserve', 'şekerli', 'işlenmiş'];
  const lowerName = f.isim.toLowerCase();
  const isUltraProcessed = processedKeywords.some(kw => lowerName.includes(kw));
  
  // --- SÖZEL ANALİZ UYARILARI ---
  if (['sosis', 'sucuk', 'salam', 'işlenmiş'].some(kw => lowerName.includes(kw))) {
    tip += " ⚠️ KRİTİK UYARI: Gizli Nitrit ve Enflamasyon Riski.";
  }
  if (lowerName.includes('midye dolma')) {
    tip += " ⚠️ KRİTİK UYARI: Yüksek Rafine Nişasta (Pirinç) Yükü.";
  }
  if (['kokoreç', 'ciğer', 'kelle paça'].some(kw => lowerName.includes(kw))) {
    tip += " ⚠️ KRİTİK UYARI: Düşük Gİ (+) ama Yüksek Doymuş Yağ (!).";
    if (!lowerName.includes('ekmek') && !lowerName.includes('dürüm')) {
      tip += " Ekmeksiz tüketildiğinde güvenlidir.";
    }
  }
  if (['bisküvi', 'gofret', 'şekerli', 'şurup'].some(kw => lowerName.includes(kw))) {
    tip += " ⚠️ KRİTİK UYARI: Endüstriyel Şeker ve Un Yükü (Lif 0).";
  }

  if (isUltraProcessed && !tip.includes('Gizli Nitrit')) {
    tip += " ⚠️ KRİTİK UYARI: Yüksek doymuş yağ ve nitrit içeriği, kronik enflamasyonu tetikleyerek insülin reseptör duyarlılığını uzun vadede azaltabilir.";
  }

  const isAnimalProduct = f.kat === 'Türk yemekleri' || f.kat === 'Süt ürünleri';
  const isHighSaturatedFat = isAnimalProduct && (f.yag > 10 && f.yag * 9 > f.kal * 0.4);
  if (isHighSaturatedFat && !isUltraProcessed) {
    tip += " ⚠️ YAĞ KALİTESİ: Yüksek doymuş yağ ve nitrit içeriği, kronik enflamasyonu tetikleyerek insülin reseptör duyarlılığını uzun vadede azaltabilir.";
  }

  const isHighFructose = (f.kat === 'Meyveler' && f.karb > 15) || lowerName.includes('bal') || lowerName.includes('pekmez') || lowerName.includes('reçel') || lowerName.includes('şekerli');
  if (isHighFructose) {
    tip += " ⚠️ FRUKTOZ UYARISI: Doğrudan kana karışmasa da karaciğer yağlanması üzerinden dolaylı insülin direnci riski taşır.";
  }

  if (f.kat === 'Alkol') {
    const lowerName = f.isim.toLowerCase();
    if (lowerName.includes('bira') || lowerName.includes('kokteyl') || lowerName.includes('tatlı')) {
      tip += " ⚠️ ALKOL UYARISI: Bu içecek vücudun yağ yakımını tamamen durdurur ve ertesi gün şiddetli 'rebound' (açlık krizi) riskini artırır.";
    } else {
      tip += " ⚠️ METABOLİK YÜK: Sek şarap veya damıtılmış içkilerin Gİ değeri düşük olsa da, karaciğer üzerindeki metabolik yükü çok yüksektir ve yağ yakımını geçici olarak askıya alır.";
    }
  }

  if (ctx.highGYCount >= 3) {
    tip += " ⚠️ İNSÜLİN PENCERESİ: Bugün zaten 3 kez yüksek glisemik yük sınırını aştın. Vücudunun dinlenmeye (açlık penceresine) ihtiyacı var. Bu öğün metabolizmanı zorlayabilir.";
  }

  if (s < 4) {
    tip += " ⚠️ CRASH UYARISI: Bu yemeği şu anki haliyle yersen, yaklaşık 90-120 dakika sonra kan şekerin hızla düşecek (crash) ve tekrar tatlı krizine gireceksin. Bunu engellemek için tabağına 1 avuç yeşillik ekle.";
  }

  return tip;
}

function getDietitianNote(mScore: number, nScore: number, f: Food) {
  const lowerName = f.isim.toLowerCase();
  const isStarchy = f.kat === 'Tahıllar' || f.kat === 'Baklagiller' || lowerName.includes('patates') || lowerName.includes('ekmek') || lowerName.includes('makarna') || lowerName.includes('pirinç');
  
  if (mScore >= 7 && nScore >= 7) {
    return {
      title: "Mükemmel Seçim (Süper Gıda)",
      text: `${f.isim} hem kan şekerini dengeler hem de vücudunu besler. Kilo verme sürecinde istediğin kadar (doyana kadar) güvenle tüketebilirsin.`,
      color: "text-emerald-500",
      bg: "bg-emerald-500/10",
      border: "border-emerald-500/20",
      icon: <CheckCircle2 size={16} />
    };
  }
  
  if (mScore < 7 && nScore >= 7) {
    let advice = isStarchy ? "Porsiyonu 3-4 yemek kaşığı ile sınırla ve yanına mutlaka yoğurt/ayran ekle." : "Porsiyon kontrolü yaparak tüketebilirsin.";
    return {
      title: "Besleyici ama Dikkatli Ol",
      text: `${f.isim} besin değeri yüksek olsa da kan şekerini yükseltebilir. ${advice}`,
      color: "text-orange-500",
      bg: "bg-orange-500/10",
      border: "border-orange-500/20",
      icon: <Info size={16} />
    };
  }
  
  if (mScore >= 7 && nScore < 7) {
    return {
      title: "Düşük Kalorili / Boş Kalori",
      text: `${f.isim} kilo aldırmaz ama vücuduna pek bir faydası yok. Yanına mutlaka taze bir salata veya sebze ekleyerek öğünü zenginleştir.`,
      color: "text-blue-500",
      bg: "bg-blue-500/10",
      border: "border-blue-500/20",
      icon: <Zap size={16} />
    };
  }
  
  return {
    title: "Diyet Sürecinde Önerilmez",
    text: `${f.isim} hem metabolizmanı yavaşlatır hem de yağ depolanmasını tetikleyebilir. Kilo verme sürecindeysen bu gıdadan uzak durmanı veya çok nadir tüketmeni öneririm.`,
    color: "text-red-500",
    bg: "bg-red-500/10",
    border: "border-red-500/20",
    icon: <AlertTriangle size={16} />
  };
}

function UnifiedFoodDetail({ 
  food, 
  ctx, 
  profile, 
  darkMode, 
  onAdd, 
  onPlate, 
  onLog, 
  onClose, 
  onEdit, 
  onDelete, 
  isAiResult = false,
  dbAverage = { kal: 180, pro: 8, karb: 22, yag: 8 }
}: { 
  food: Food, 
  ctx: ConsumptionContext, 
  profile: any, 
  darkMode: boolean, 
  onAdd?: () => void,
  onPlate: () => void,
  onLog: (f: Food, score: number) => void,
  onClose: () => void,
  onEdit?: () => void,
  onDelete?: () => void,
  isAiResult?: boolean,
  dbAverage?: { kal: number; pro: number; karb: number; yag: number }
}) {
  const mScore = calculateMetabolicScore(food, ctx, profile);
  const status = getStatusInfo(mScore, ctx.hour, food.karb, food.lif);

  return (
    <div className={`overflow-hidden max-w-5xl w-full relative max-h-[92vh] flex flex-col ${darkMode ? 'bg-[#0A0A0A] text-white' : 'bg-white text-slate-900'} rounded-3xl border ${darkMode ? 'border-white/10' : 'border-black/5'} shadow-2xl`}>
      {/* Header Controls */}
      <div className={`sticky top-0 z-50 px-6 py-4 border-b ${darkMode ? 'bg-[#0A0A0A]/95 border-white/10' : 'bg-white/95 border-black/5'} backdrop-blur-xl flex items-center justify-between gap-4`}>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#2DFF73] text-black flex items-center justify-center font-black shadow-sm shrink-0">
            <Sparkles size={18} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[0.65rem] font-black uppercase tracking-wider text-emerald-500 dark:text-[#2DFF73]">
                Nutrition AI
              </span>
              <span className={`px-2 py-0.5 border rounded text-[0.6rem] font-bold uppercase tracking-wider ${darkMode ? 'bg-white/5 border-white/10 text-zinc-400' : 'bg-black/5 border-black/10 text-zinc-500'}`}>
                {food.kat}
              </span>
            </div>
            <h3 className="text-base sm:text-lg font-black tracking-tight leading-tight">
              {food.isim}
            </h3>
          </div>
          {!isAiResult && onEdit && (
            <div className="flex gap-1.5 border-l border-white/10 pl-2">
              <button onClick={onEdit} className="p-1.5 rounded-lg hover:bg-white/5 text-zinc-500 hover:text-white transition-all"><Edit2 size={14} /></button>
              <button onClick={onDelete} className="p-1.5 rounded-lg hover:bg-white/5 text-zinc-500 hover:text-red-500 transition-all"><Trash2 size={14} /></button>
            </div>
          )}
        </div>

        {/* Status Indicator & Action buttons */}
        <div className="flex items-center gap-3">
          <div className={`hidden sm:flex px-3 py-1.5 rounded-lg border items-center gap-2 ${status.cls}`}>
            <div className={`w-1.5 h-1.5 rounded-full ${status.dot}`} />
            <div className="text-[0.65rem] font-bold uppercase tracking-wider">{status.label}</div>
          </div>

          <div className="flex gap-2">
            <button 
              onClick={onPlate}
              title="Tabağa Ekle"
              className="w-9 h-9 rounded-lg bg-[#2DFF73] text-black cursor-pointer flex items-center justify-center hover:opacity-90 transition-all shadow-md shadow-[#2DFF73]/20"
            >
              <Plus size={18} />
            </button>
            <button 
              onClick={onClose}
              title="Kapat"
              className={`w-9 h-9 rounded-lg border flex items-center justify-center ${darkMode ? 'text-zinc-400 bg-white/5 border-white/10 hover:text-white' : 'text-zinc-500 bg-white border-black/10 hover:text-black'}`}
            >
              <X size={18} />
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area - Nutrition AI Decision Report */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-4 sm:p-6">
        <NutritionAiDecisionCard 
          report={food.nutritionAiReport} 
          food={food} 
          darkMode={darkMode} 
          userProfile={profile} 
        />
      </div>

      {/* Footer Actions */}
      <div className={`p-4 sm:p-6 border-t ${darkMode ? 'bg-[#0A0A0A]/80 border-white/10' : 'bg-slate-50 border-black/5'}`}>
        <div className="flex flex-col sm:flex-row gap-3 max-w-2xl mx-auto w-full">
          <button 
            onClick={() => {
              onLog(food, mScore);
            }}
            className="flex-1 py-3.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold uppercase tracking-wider text-xs transition-all shadow-md shadow-blue-500/20"
          >
            Günlüğe Ekle
          </button>
          <button 
            onClick={onPlate}
            className="flex-1 py-3.5 rounded-xl bg-[#2DFF73] hover:opacity-95 text-black font-bold uppercase tracking-wider text-xs transition-all shadow-md shadow-[#2DFF73]/20"
          >
            Tabağa Ekle
          </button>
          {isAiResult && onAdd && (
            <button 
              onClick={onAdd}
              className={`flex-1 py-3.5 rounded-xl font-bold uppercase tracking-wider text-xs transition-all border ${darkMode ? 'bg-white/10 hover:bg-white/15 text-white border-white/10' : 'bg-white hover:bg-slate-100 text-slate-800 border-slate-200'}`}
            >
              Listeme Kaydet
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// Dennis Ritchie style: use specialized transformers for data mapping
const transformAiResultToFood = (res: AnalysisResult, ctx: ConsumptionContext, profile: any): Food => {
  const baseFood: Food = {
    isim: res.foodName,
    kat: res.kat || "Besin",
    gi: res.gi,
    karb: res.karb,
    lif: res.lif,
    pro: res.pro,
    yag: res.yag,
    kal: res.kal,
    score: res.score,
    isFromCache: res.isFromCache,
    citizenAnalysis: res.citizenAnalysis,
    portionGram: res.portionGram,
    portionLabel: res.portionLabel,
    kolesterol: res.kolesterol,
    vitA: res.vitA,
    vitC: res.vitC,
    potasyum: res.potasyum,
    kalsiyum: res.kalsiyum,
    demir: res.demir,
    verdict: res.verdict,
    nutritionAiReport: res.nutritionAiReport
  };
  
  // Dennis Ritchie: "Stateless precision is key."
  // Recalculate score locally to ensure consistency with the list view logic
  const localScore = calculateMetabolicScore(baseFood, ctx, profile);
  return { ...baseFood, score: localScore };
};

function CoachCard({ food, ctx, profile, darkMode }: { food: Food, ctx: ConsumptionContext, profile: any, darkMode: boolean }) {
  const [loading, setLoading] = useState(false);
  const [advice, setAdvice] = useState<string | null>(null);

  const getAdvice = async () => {
    setLoading(true);
    try {
      const prompt = `Rhonda Patrick görüşü. Besin: ${food.isim}. (15 kelime).`;
      const res = await getCoachResponse([{ role: 'user', content: prompt }], profile.goal);
      setAdvice(res);
    } catch (e) {
      setAdvice("Veri hatası.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`mt-6 p-5 rounded-2xl border ${darkMode ? 'bg-white/5 border-white/5' : 'bg-zinc-50 border-black/5'}`}>
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-[#2DFF73]/20 flex items-center justify-center text-[#2DFF73] shrink-0">
            <Brain size={18} />
          </div>
          <div className="min-w-0">
            <h4 className="text-[0.8rem] font-bold truncate">PROFESYONEL ÖNERİ</h4>
            <p className="text-[0.6rem] text-zinc-500 uppercase tracking-widest truncate">Mentor Görüşü</p>
          </div>
        </div>
        {!advice && !loading && (
          <button 
            onClick={getAdvice}
            className={`px-4 py-2 rounded-lg text-[0.65rem] font-bold uppercase transition-all ${darkMode ? 'bg-[#2DFF73] text-black' : 'bg-black text-white'}`}
          >
            ÖĞREN
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex items-center gap-2 py-4">
          <Loader2 size={14} className="animate-spin text-[#2DFF73]" />
          <span className="text-[0.7rem] text-zinc-500">Analiz ediliyor...</span>
        </div>
      ) : advice && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className={`mt-4 text-[0.85rem] leading-relaxed italic border-l-2 border-[#2DFF73] pl-4 ${darkMode ? 'text-zinc-300' : 'text-zinc-700'}`}
        >
          "{advice}"
        </motion.div>
      )}
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <GliSkorApp />
    </ErrorBoundary>
  );
}

function DiscoverySection({ darkMode, onSelect }: { darkMode: boolean, onSelect: (food: string) => void }) {
  const heroes = initialFoods.filter(f => f.score >= 9.6).slice(0, 4);
  
  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="mt-16 space-y-12 pb-12"
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="space-y-4">
          <h3 className={`text-[0.6rem] font-bold uppercase tracking-widest ${darkMode ? 'text-zinc-500' : 'text-zinc-400'}`}>
            METABOLİK ŞAMPİYONLAR
          </h3>
          <div className="grid grid-cols-2 gap-3">
            {heroes.map((f, i) => (
              <button 
                key={i}
                onClick={() => onSelect(f.isim)}
                className={`p-5 rounded-2xl border text-left transition-all ${darkMode ? 'bg-white/5 border-white/5 hover:bg-white/10' : 'bg-white border-black/5 hover:bg-zinc-50 shadow-sm'}`}
              >
                <div className="text-[0.9rem] font-bold mb-1 tracking-tight">{f.isim}</div>
                <div className="text-[1.5rem] font-black text-[#2DFF73]">{f.score}</div>
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <h3 className={`text-[0.6rem] font-bold uppercase tracking-widest ${darkMode ? 'text-zinc-500' : 'text-zinc-400'}`}>
            PRENSİP
          </h3>
          <div className={`p-8 rounded-2xl border ${darkMode ? 'bg-white/5 border-white/5' : 'bg-zinc-50 border-black/5'}`}>
             <p className={`text-[1.1rem] font-medium leading-relaxed italic ${darkMode ? 'text-zinc-300' : 'text-zinc-700'}`}>
               "Kan şekeri kontrolü, sadece kilo yönetimi değil, hücresel sağlığın temelidir."
             </p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function GliSkorApp() {
  // User Profile State
  const [userProfile, setUserProfile] = useState<{
    age: string;
    weight: string;
    height: string;
    gender: string;
    activityLevel: string;
    goal: string;
    hba1c: string;
    insulinResistance: string;
  }>(() => {
    try {
      const saved = localStorage.getItem('gliskor_profile');
      return saved ? JSON.parse(saved) : { 
        age: '', 
        weight: '', 
        height: '',
        gender: 'Belirtilmemiş', 
        activityLevel: 'Orta Derece',
        goal: 'Sağlıklı Yaşam',
        hba1c: '', 
        insulinResistance: 'Yok' 
      };
    } catch (e) {
      console.error("Profile parse error:", e);
      return { 
        age: '', weight: '', height: '', gender: 'Belirtilmemiş', 
        activityLevel: 'Orta Derece', goal: 'Sağlıklı Yaşam', 
        hba1c: '', insulinResistance: 'Yok' 
      };
    }
  });

  const [foodList, setFoodList] = useState<Food[]>(() => {
    try {
      const saved = localStorage.getItem('gliskor_foods');
      if (saved) {
        const parsed = JSON.parse(saved);
        // Fallback ve göç mantığı:isim alanı eksikse name veya foodName'den kurtar
        return parsed.map((f: any) => ({
          ...f,
          isim: f.isim || f.name || f.foodName || 'Tanımsız Besin'
        }));
      }
      return initialFoods;
    } catch (e) {
      console.error("Foods parse error:", e);
      return initialFoods;
    }
  });

  const dbAverage = useMemo(() => {
    if (!foodList || foodList.length === 0) return { kal: 180, pro: 8, karb: 22, yag: 8 };
    const totals = foodList.reduce((acc, f) => ({
      kal: acc.kal + (f.kal || 0),
      pro: acc.pro + (f.pro || 0),
      karb: acc.karb + (f.karb || 0),
      yag: acc.yag + (f.yag || 0)
    }), { kal: 0, pro: 0, karb: 0, yag: 0 });
    const count = foodList.length;
    return {
      kal: Math.round(totals.kal / count),
      pro: Math.round(totals.pro / count),
      karb: Math.round(totals.karb / count),
      yag: Math.round(totals.yag / count)
    };
  }, [foodList]);
  const [searchVal, setSearchVal] = useState('');
  const [activeCat, setActiveCat] = useState('Tümü');
  const [sortMode, setSortMode] = useState<'skor' | 'gi' | 'isim'>('skor');
  const [selectedFood, setSelectedFood] = useState<Food | null>(null);
  const [aiResult, setAiResult] = useState<AnalysisResult | null>(null);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [isDeepAnalysing, setIsDeepAnalysing] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiSuccess, setAiSuccess] = useState<string | null>(null);
  const [quickFilter, setQuickFilter] = useState<'none' | 'super' | 'protein' | 'lowcarb'>('none');

  // History State
  const [history, setHistory] = useState<AnalysisResult[]>(() => {
    try {
      const saved = localStorage.getItem('gliskor_history');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      console.error("History parse error:", e);
      return [];
    }
  });

  // Plate Builder State
  const [plate, setPlate] = useState<Food[]>(() => {
    try {
      const saved = localStorage.getItem('gliskor_plate');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      console.error("Plate parse error:", e);
      return [];
    }
  });

  // Daily Log State
  const [dailyLog, setDailyLog] = useState<LogEntry[]>(() => {
    try {
      const saved = localStorage.getItem('gliskor_daily_log');
      if (!saved) return [];
      const parsed = JSON.parse(saved);
      // Filter for today only
      const today = new Date().setHours(0, 0, 0, 0);
      return parsed.filter((entry: LogEntry) => new Date(entry.timestamp).setHours(0, 0, 0, 0) === today);
    } catch (e) {
      console.error("Daily log parse error:", e);
      return [];
    }
  });

  const [darkMode, setDarkMode] = useState(true);
  const [isPlateOpen, setIsPlateOpen] = useState(false);
  const [isTrackingOpen, setIsTrackingOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isVersionHistoryOpen, setIsVersionHistoryOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isPlateAnalysisOpen, setIsPlateAnalysisOpen] = useState(false);
  const [isAchievementsOpen, setIsAchievementsOpen] = useState(false);
  const [isChallengeOpen, setIsChallengeOpen] = useState(false);
  const [isCoachOpen, setIsCoachOpen] = useState(false);
  const [isBarcodeOpen, setIsBarcodeOpen] = useState(false);
  const [isStatsOpen, setIsStatsOpen] = useState(false);
  const [isRecipeOpen, setIsRecipeOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [waterIntake, setWaterIntake] = useState(0);
  const [coachMessages, setCoachMessages] = useState<{role: 'user' | 'assistant', content: string; image?: string}[]>([]);
  const [coachImagePreview, setCoachImagePreview] = useState<string | null>(null);
  const [isCoachLoading, setIsCoachLoading] = useState(false);
  const [plateAnalysisResult, setPlateAnalysisResult] = useState<PlateAnalysisResult | null>(null);
  const [isPlateAnalysisLoading, setIsPlateAnalysisLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState({ current: 0, total: 0 });

  // Firebase Auth Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      if (user) {
        // Load user data from Firestore
        const userRef = doc(db, 'users', user.uid);
        getDoc(userRef).then((docSnap) => {
          if (docSnap.exists()) {
            const data = docSnap.data();
            setUserProfile(prev => ({ ...prev, ...data }));
            if (data.achievements) {
              setAchievements(data.achievements);
            }
            if (data.points !== undefined) {
              setUserStats(prev => ({
                ...prev,
                points: data.points || 0,
                level: data.level || 1,
                streak: data.streak || 0
              }));
            }
            if (data.foodList && Array.isArray(data.foodList)) {
              // Local listeyi Firestore'dan gelenle birleştir (Tekrar edenleri temizle)
              setFoodList(prev => {
                const combined = [...prev, ...data.foodList];
                const unique = Array.from(new Map(combined.map(item => [item.isim.toLowerCase(), item])).values());
                return unique;
              });
            }
          } else {
            // Create initial profile
            setDoc(userRef, {
              uid: user.uid,
              email: user.email,
              displayName: user.displayName,
              createdAt: serverTimestamp(),
              ...userProfile
            });
          }
        });

        // Sync Food Logs
        const logsRef = collection(db, 'users', user.uid, 'foodLogs');
        const today = new Date().setHours(0, 0, 0, 0);
        const q = query(logsRef, where('timestamp', '>=', new Date(today).toISOString()));
        const unsubscribeLogs = onSnapshot(q, (snapshot) => {
          const logs: LogEntry[] = [];
          snapshot.forEach((doc) => {
            const data = doc.data();
            logs.push({
              id: doc.id,
              food: data as Food,
              amount: data.amount || 100,
              timestamp: new Date(data.timestamp).getTime(),
              mealType: data.mealType || 'Atıştırmalık'
            });
          });
          setDailyLog(logs);
        });

        return () => unsubscribeLogs();
      }
    });
    return () => unsubscribe();
  }, []);

  const handleLogin = async () => {
    try {
      setAiError(null);
      await signInWithGoogle();
    } catch (error: any) {
      if (error?.code === 'auth/popup-closed-by-user') {
        setAiError("Giriş penceresi kapatıldı. Lütfen tekrar deneyin ve pencerenin açılmasına izin verin.");
      } else {
        setAiError("Giriş yapılamadı. Lütfen internet bağlantınızı kontrol edin.");
      }
      setTimeout(() => setAiError(null), 5000);
    }
  };

  const handleLogout = async () => {
    try {
      setAiError(null);
      await logout();
      setDailyLog([]);
      setAiSuccess("Çıkış yapıldı.");
      setTimeout(() => setAiSuccess(null), 3000);
    } catch (error) {
      setAiError("Çıkış yapılamadı. Lütfen tekrar deneyin.");
      setTimeout(() => setAiError(null), 5000);
    }
  };

  // Gamification State
  const [userStats, setUserStats] = useState<UserStats>(() => {
    const saved = localStorage.getItem('gliskor_stats');
    return saved ? JSON.parse(saved) : {
      points: 0,
      level: 1,
      streak: 0,
      lastLogDate: null,
      totalLogs: 0,
      bestMetabolicScore: 0
    };
  });

  const [achievements, setAchievements] = useState<Achievement[]>(() => {
    const saved = localStorage.getItem('gliskor_achievements');
    if (saved) return JSON.parse(saved);
    
    return [
      { id: 'streak_3', title: 'İstikrar Abidesi', description: '3 gün üst üste kayıt yap', icon: '🔥', unlockedAt: null, requirement: 3, progress: 0, type: 'streak' },
      { id: 'streak_7', title: 'Metabolizma Ustası', description: '7 gün üst üste kayıt yap', icon: '🏆', unlockedAt: null, requirement: 7, progress: 0, type: 'streak' },
      { id: 'points_1000', title: 'Bilge Gurme', description: '1000 puana ulaş', icon: '🧠', unlockedAt: null, requirement: 1000, progress: 0, type: 'points' },
      { id: 'score_90', title: 'Mükemmel Tabak', description: '90+ metabolik skorlu bir öğün ye', icon: '✨', unlockedAt: null, requirement: 90, progress: 0, type: 'score' },
      { id: 'logs_50', title: 'Kayıt Makinesi', description: 'Toplam 50 öğün kaydet', icon: '📊', unlockedAt: null, requirement: 50, progress: 0, type: 'logs' },
    ];
  });

  const [showAchievementToast, setShowAchievementToast] = useState<Achievement | null>(null);

  const updateGamification = useCallback((score: number) => {
    setUserStats(prev => {
      const today = new Date().toISOString().split('T')[0];
      const lastDate = prev.lastLogDate;
      let newStreak = prev.streak;

      if (lastDate !== today) {
        if (lastDate) {
          const last = new Date(lastDate);
          const current = new Date(today);
          const diff = Math.floor((current.getTime() - last.getTime()) / (1000 * 60 * 60 * 24));
          if (diff === 1) {
            newStreak += 1;
          } else if (diff > 1) {
            newStreak = 1;
          }
        } else {
          newStreak = 1;
        }
      }

      const pointsEarned = Math.max(5, Math.round(score / 5));
      const newPoints = prev.points + pointsEarned;
      const newLevel = Math.floor(newPoints / 500) + 1;

      const updated = {
        ...prev,
        points: newPoints,
        level: newLevel,
        streak: newStreak,
        lastLogDate: today,
        totalLogs: prev.totalLogs + 1,
        bestMetabolicScore: Math.max(prev.bestMetabolicScore, score)
      };

      if (currentUser) {
        const userRef = doc(db, 'users', currentUser.uid);
        setDoc(userRef, {
          points: newPoints,
          level: newLevel,
          streak: newStreak,
          lastLogDate: today,
          totalLogs: updated.totalLogs,
          bestMetabolicScore: updated.bestMetabolicScore
        }, { merge: true }).catch(err => console.error("Error updating stats:", err));
      }

      return updated;
    });
  }, []);

  useEffect(() => {
    setAchievements(prev => {
      let changed = false;
      const next = prev.map(achievement => {
        if (achievement.unlockedAt) return achievement;

        let progress = 0;
        let unlocked = false;

        switch (achievement.type) {
          case 'streak':
            progress = userStats.streak;
            unlocked = progress >= achievement.requirement;
            break;
          case 'points':
            progress = userStats.points;
            unlocked = progress >= achievement.requirement;
            break;
          case 'score':
            progress = userStats.bestMetabolicScore;
            unlocked = progress >= achievement.requirement;
            break;
          case 'logs':
            progress = userStats.totalLogs;
            unlocked = progress >= achievement.requirement;
            break;
        }

        if (unlocked && !achievement.unlockedAt) {
          changed = true;
          setShowAchievementToast(achievement);
          setTimeout(() => setShowAchievementToast(null), 5000);
          return { ...achievement, progress, unlockedAt: Date.now() };
        }

        if (progress !== achievement.progress) {
          changed = true;
          return { ...achievement, progress };
        }

        return achievement;
      });
      if (changed && currentUser) {
        const userRef = doc(db, 'users', currentUser.uid);
        setDoc(userRef, { achievements: next }, { merge: true }).catch(err => console.error("Error syncing achievements:", err));
      }
      return changed ? next : prev;
    });
  }, [userStats, currentUser]);

  // Persistence Effects
  useEffect(() => {
    localStorage.setItem('gliskor_stats', JSON.stringify(userStats));
  }, [userStats]);

  useEffect(() => {
    localStorage.setItem('gliskor_achievements', JSON.stringify(achievements));
  }, [achievements]);

  useEffect(() => {
    localStorage.setItem('gliskor_foods', JSON.stringify(foodList));
    if (currentUser) {
      const userRef = doc(db, 'users', currentUser.uid);
      // Sadece standart listede olmayan (kullanıcının eklediği) besinleri senkronize etsek daha iyi ama 
      // tüm listeyi senkronize etmek daha kolay ve güvenli
      setDoc(userRef, { foodList }, { merge: true }).catch(err => console.error("Error syncing foods:", err));
    }
  }, [foodList, currentUser]);

  useEffect(() => {
    localStorage.setItem('gliskor_plate', JSON.stringify(plate));
  }, [plate]);

  useEffect(() => {
    localStorage.setItem('gliskor_profile', JSON.stringify(userProfile));
    if (currentUser) {
      const userRef = doc(db, 'users', currentUser.uid);
      setDoc(userRef, userProfile, { merge: true }).catch(err => console.error("Error syncing profile:", err));
    }
  }, [userProfile, currentUser]);

  useEffect(() => {
    localStorage.setItem('gliskor_history', JSON.stringify(history));
  }, [history]);

  useEffect(() => {
    localStorage.setItem('gliskor_daily_log', JSON.stringify(dailyLog));
  }, [dailyLog]);

  // Algoritma Değişkenleri
  const [isCooked, setIsCooked] = useState(false);
  const [mealSequence, setMealSequence] = useState<MealSequence>('standard');
  const [hasAcid, setHasAcid] = useState(false);
  const [isLiquid, setIsLiquid] = useState(false);
  const [isResistant, setIsResistant] = useState(false);
  const [consumptionHour, setConsumptionHour] = useState(new Date().getHours());
  const [isProcessed, setIsProcessed] = useState(false);
  const [hasMovement, setHasMovement] = useState(false);
  const [highGYCount, setHighGYCount] = useState(0);
  const [isLowSleep, setIsLowSleep] = useState(false);
  const [isStressed, setIsStressed] = useState(false);

  // Consolidate consumption context
  const consumptionContext = useMemo((): ConsumptionContext => ({
    isCooked,
    mealSequence,
    hasAcid,
    isLiquid,
    isResistant,
    hour: consumptionHour,
    isProcessed,
    hasMovement,
    highGYCount,
    isLowSleep,
    isStressed
  }), [isCooked, mealSequence, hasAcid, isLiquid, isResistant, consumptionHour, isProcessed, hasMovement, highGYCount, isLowSleep, isStressed]);

  const metabolicScore = useMemo(() => selectedFood ? calculateMetabolicScore(selectedFood, consumptionContext, userProfile) : 0, [selectedFood, consumptionContext, userProfile]);
  const nutritionalScore = useMemo(() => selectedFood ? calculateNutritionalScore(selectedFood) : 0, [selectedFood]);

  // Daily Totals
  const dailyTotals = useMemo(() => {
    return dailyLog.reduce((acc, entry) => {
      const factor = entry.amount / 100;
      const gl = (entry.food.gi * (entry.food.karb * factor)) / 100;
      return {
        calories: acc.calories + (entry.food.kal * factor),
        carbs: acc.carbs + (entry.food.karb * factor),
        protein: acc.protein + (entry.food.pro * factor),
        fat: acc.fat + (entry.food.yag * factor),
        gl: acc.gl + gl
      };
    }, { calories: 0, carbs: 0, protein: 0, fat: 0, gl: 0 });
  }, [dailyLog]);

  const dailyMetabolicPerformance = useMemo(() => {
    if (dailyTotals.gl === 0) return 100;
    // GL < 100 is low, 100-120 is medium, > 120 is high for a whole day?
    // Actually, daily GL targets are usually < 100.
    const score = Math.max(0, 100 - (dailyTotals.gl * 0.8));
    return Math.round(score);
  }, [dailyTotals.gl]);

  // Modal states for Add/Edit
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingFood, setEditingFood] = useState<Food | null>(null);
  const [formData, setFormData] = useState<Food>({
    isim: '', kat: 'Sebzeler', gi: 0, karb: 0, lif: 0, pro: 0, yag: 0, kal: 0, score: 7
  });
  const [formErrors, setFormErrors] = useState<Partial<Record<keyof Food, string>>>({});
  const [isFilling, setIsFilling] = useState(false);

  const addToLog = async (food: Food, amount: number = 100, mealType: LogEntry['mealType'] = 'Atıştırmalık', score: number = 70) => {
    const timestamp = Date.now();
    const newEntry: LogEntry = {
      id: Math.random().toString(36).substr(2, 9),
      food,
      amount,
      timestamp,
      mealType
    };

    if (currentUser) {
      try {
        const logsRef = collection(db, 'users', currentUser.uid, 'foodLogs');
        await addDoc(logsRef, {
          ...food,
          amount,
          timestamp: new Date(timestamp).toISOString(),
          mealType,
          uid: currentUser.uid
        });
      } catch (error) {
        console.error("Error adding to Firestore:", error);
      }
    } else {
      setDailyLog(prev => [...prev, newEntry]);
    }

    updateGamification(score);
    setAiSuccess(`${food.isim} günlüğe eklendi! +${Math.max(5, Math.round(score / 5))} Puan`);
    setTimeout(() => setAiSuccess(null), 3000);
  };

  const handleCoachMessage = async (text: string, image?: string) => {
    if (!text.trim() && !image) return;
    const newMessages = [...coachMessages, { role: 'user' as const, content: text, image }];
    setCoachMessages(newMessages);
    setIsCoachLoading(true);
    try {
      const profileContext = `Kullanıcı: ${userProfile.age || 'Bilinmiyor'} yaş, ${userProfile.weight || 'Bilinmiyor'}kg, Hedef: ${userProfile.goal}. Bugünkü Tüketim: ${Math.round(dailyTotals.calories)} kcal, ${Math.round(dailyTotals.carbs)}g karb, ${Math.round(dailyTotals.protein)}g protein.`;
      const response = await getCoachResponse(newMessages, profileContext);
      setCoachMessages(prev => [...prev, { role: 'assistant' as const, content: response }]);
    } catch (error) {
      setAiError("Nutrition AI şu an yanıt veremiyor.");
    } finally {
      setIsCoachLoading(false);
    }
  };

  const handleBarcodeScan = async (barcode: string) => {
    setIsAiLoading(true);
    try {
      const result = await analyzeBarcode(barcode);
      if (result) {
        setSelectedFood(result);
        setAiSuccess(`${result.isim} bulundu!`);
        setIsBarcodeOpen(false);
      } else {
        setAiError("Barkod bulunamadı.");
      }
    } catch (error) {
      setAiError("Barkod analizi sırasında bir hata oluştu.");
    } finally {
      setIsAiLoading(false);
    }
  };

  useEffect(() => {
    let scanner: any = null;
    if (isBarcodeOpen) {
      import('html5-qrcode').then(({ Html5QrcodeScanner }) => {
        scanner = new Html5QrcodeScanner("reader", { fps: 10, qrbox: { width: 250, height: 250 } }, false);
        scanner.render((decodedText: string) => {
          handleBarcodeScan(decodedText);
          scanner?.clear();
        }, (error: any) => {
          // console.warn(error);
        });
      }).catch(err => console.error("Scanner import error:", err));
    }
    return () => {
      if (scanner) {
        scanner.clear().catch((err: any) => console.error("Scanner clear error:", err));
      }
    };
  }, [isBarcodeOpen]);

  const removeFromLog = (id: string) => {
    setDailyLog(prev => prev.filter(entry => entry.id !== id));
  };

  const handlePlateImageAnalysis = async (file: File) => {
    setIsPlateAnalysisLoading(true);
    setAiError(null);
    setIsPlateAnalysisOpen(true);
    
    try {
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve, reject) => {
        reader.onload = () => {
          const base64 = (reader.result as string).split(',')[1];
          resolve(base64);
        };
        reader.onerror = reject;
      });
      reader.readAsDataURL(file);
      const base64Image = await base64Promise;

      const profileContext = `Kullanıcı Profili: ${userProfile.age} yaşında, ${userProfile.weight}kg, ${userProfile.height}cm, ${userProfile.activityLevel} aktivite seviyesi, Hedef: ${userProfile.goal}.`;
      const result = await analyzePlateImage(base64Image, profileContext);
      setPlateAnalysisResult(result);
    } catch (error) {
      console.error("Plate analysis error:", error);
      setAiError("Fotoğraf analizi sırasında bir hata oluştu.");
      setIsPlateAnalysisOpen(false);
    } finally {
      setIsPlateAnalysisLoading(false);
    }
  };

  // YEREL YORUM MOTORU (Maximum Hız İçin)
  const generateStaticAnalysis = (f: Food) => {
    const s = calculateMetabolicScore(f, consumptionContext, userProfile);
    return {
      insulinEffect: getTip(f, s, consumptionContext),
      dietaryNote: getDietitianNote(s, calculateNutritionalScore(f), f)
    };
  };

  const generateLocalComment = useCallback((data: any, mScore: number) => {
    const gi = data.gi;
    const pro = data.pro || 0;
    const lif = data.lif || 0;
    
    let lightStatus: 'GREEN' | 'YELLOW' | 'RED' = 'YELLOW';
    let lightDescription = '';
    let warning = '';
    
    if (mScore >= 8.5) {
      lightStatus = 'GREEN';
      lightDescription = 'YEŞİL IŞIK: Mükemmel seçim.';
      warning = 'Huzurla tüketebilirsiniz.';
    } else if (mScore < 5.5) {
      lightStatus = 'RED';
      lightDescription = 'KIRMIZI IŞIK: Dikkatli ve sınırlı tüketilmelidir.';
      warning = 'Porsiyonu küçültün veya protein ile dengeleyin.';
    } else {
      lightDescription = 'SARI IŞIK: Dengeli tüketilmesi gereken bir besin.';
      warning = 'Yanına bir miktar lif/yeşillik eklemek daha iyi olur.';
    }

    return { 
      lightStatus, 
      lightDescription, 
      warning,
      metabolicEffect: `GI: ${gi} | Karb: ${data.karb}g | Lif: ${lif}g. İnsülin yanıtı ${mScore > 8 ? 'stabil' : 'kontrollü'} görünüyor.`,
      citizenAnalysis: {
        aiNote: "Yerel veritabanı motoru tarafından oluşturulan ön analiz.",
        scores: {
          kanSekeri: { score: mScore > 7 ? 24 : 12, max: 30, desc: mScore > 7 ? "Stabil" : "Yüksek glisemik risk" },
          besinYogunlugu: { score: lif > 3 ? 20 : 12, max: 25, desc: lif > 3 ? "Yüksek lif" : "Orta yoğunluk" },
          yagKalitesi: { score: data.yag < 10 ? 16 : 10, max: 20, desc: "Standart" },
          lifOrani: { score: lif > 5 ? 13 : 4, max: 15, desc: lif > 5 ? "Zengin" : "Düşük" },
          islenmislik: { score: 7, max: 10, desc: "Doğal içerik" }
        },
        vatandasSorulari: {
          kiloVerme: mScore >= 8.5 ? "Kilo vermeye çok uygun." : "Porsiyon kontrolü ile mümkün.",
          tansiyonSeker: mScore >= 8.5 ? "Şeker dostu bir seçim." : "Ölçülü tüketilmelidir."
        },
        hataAlarmlari: [
          "Aç karnına tek başına tüketmek",
          "Hızlı ve çiğnemeden yemek",
          "Yanında şekerli içecek tercih etmek"
        ],
        iyilestirmeHack: "Bir miktar sirke veya limon ekleyerek glisemik yükü düşürebilirsiniz.",
        eforKarsiligi: `${Math.round((data.kal || 0) / 5)} dakika tempolu yürüyüş bu kaloriyi yakmak için yeterlidir.`
      }
    };
  }, []);

  const handleAiAnalysis = useCallback(async (name: string) => {
    if (!name || name.trim().length < 2) {
      setAiError("Lütfen analiz etmek için geçerli bir besin adı girin.");
      return;
    }

    setIsAiLoading(true);
    setIsDeepAnalysing(true);
    setAiError(null);
    setAiResult(null);
    const searchName = name.trim();
    console.log("Starting Maximum Speed AI Analysis for:", searchName);
    
    try {
      // 1. CONTEXT HAZIRLA
      const profileContext = `Kullanıcı Profili: Yaş ${userProfile.age || 'Bilinmiyor'}, Kilo ${userProfile.weight || 'Bilinmiyor'}, Boy ${userProfile.height || 'Bilinmiyor'}, Cinsiyet ${userProfile.gender}, Aktivite Seviyesi ${userProfile.activityLevel}, Hedef ${userProfile.goal}, HbA1c ${userProfile.hba1c || 'Bilinmiyor'}, İnsülin Direnci Seviyesi ${userProfile.insulinResistance || 'Bilinmiyor'}.`;
      const recentAnalyses = history.map(h => h.foodName).join(", ");
      const logSummary = dailyLog.map(l => l.food?.isim || '').filter(Boolean).join(", ");
      const historyContext = `Son analizler: ${recentAnalyses}. Bugüne kadarki kayıtlar: ${logSummary}.`;

      // 2. AKILLI EŞLEŞME (DB) - %100 Hız
      const nameLower = searchName.toLowerCase();
      const staticFood = foodList.find(f => 
        f.isim.toLowerCase() === nameLower || 
        nameLower.includes(f.isim.toLowerCase()) ||
        f.isim.toLowerCase().includes(nameLower)
      );

      let staticDataForDeep = undefined;
      
      if (staticFood) {
        const mScore = calculateMetabolicScore(staticFood, consumptionContext, userProfile);
        const nScore = calculateNutritionalScore(staticFood);
        staticDataForDeep = { ...staticFood, mScore, nScore };

        // YEREL MOTORLA ANINDA KARAR OLUŞTUR
        const localDecision = generateLocalComment(staticFood, mScore);

        const preliminaryResult: AnalysisResult = {
          foodName: searchName,
          gi: staticFood.gi,
          gy: Number(((staticFood.gi * staticFood.karb) / 100).toFixed(1)),
          lif: staticFood.lif,
          kat: staticFood.kat,
          score: mScore,
          kal: staticFood.kal,
          karb: staticFood.karb,
          pro: staticFood.pro,
          yag: staticFood.yag,
          lightStatus: mScore >= 8.5 ? 'GREEN' : mScore < 5.5 ? 'RED' : 'YELLOW',
          lightDescription: "Veritabanı eşleşmesi ile analiz edildi.",
          citizenAnalysis: {
            aiNote: "Veritabanı bazlı hızlı metabolik projeksiyon.",
            scores: {
              kanSekeri: { score: mScore > 7 ? 24 : 12, max: 30, desc: "Hesaplanıyor..." },
              besinYogunlugu: { score: 12, max: 25, desc: "Hesaplanıyor..." },
              yagKalitesi: { score: 10, max: 20, desc: "Hesaplanıyor..." },
              lifOrani: { score: 7, max: 15, desc: "Hesaplanıyor..." },
              islenmislik: { score: 5, max: 10, desc: "Hesaplanıyor..." }
            },
            vatandasSorulari: {
              kiloVerme: "Uygunluk analizi...",
              tansiyonSeker: "Etki analizi..."
            },
            hataAlarmlari: [],
            iyilestirmeHack: "Detaylar yükleniyor...",
            eforKarsiligi: "Hesaplanıyor..."
          }
        };
        setAiResult(preliminaryResult);
        setIsAiLoading(false);
      }

      // Paralle AI Call Deep
      const deepPromise = analyzeFood(searchName, highGYCount, profileContext, staticDataForDeep, historyContext);

      // 3. FAST-PATH AI (Eğer DB'de yoksa sadece sayıları getir)
      if (!staticFood) {
        getNutritionData(searchName).then(data => {
          setAiResult(prev => {
            if (prev && !prev.isFromCache) return prev;
            const mScore = calculateMetabolicScore(data as any, consumptionContext, userProfile);
            const nScore = calculateNutritionalScore(data as any);
            const localDecision = generateLocalComment(data, mScore);

            return {
              foodName: searchName,
              gi: data.gi,
              gy: Number(((data.gi * data.karb) / 100).toFixed(1)),
              lif: data.lif,
              kat: data.kat,
              score: mScore,
              kal: data.kal,
              karb: data.karb,
              pro: data.pro,
              yag: data.yag,
              lightStatus: localDecision.lightStatus,
              lightDescription: localDecision.lightDescription,
              citizenAnalysis: localDecision.citizenAnalysis,
              isFromCache: true
            };
          });
          setIsAiLoading(false);
          
          // Akışta veritabanına ekleme kaldırıldı - Kullanıcı onayı beklenecek
        }).catch(e => console.log("Fast nutrition error:", e));
      }

      const finalResult = await deepPromise;
      setAiResult({ ...finalResult, isFromCache: false });
      setHistory(prev => [finalResult, ...prev].slice(0, 20));
      
      setIsAiLoading(false);
      setIsDeepAnalysing(false);
    } catch (err: any) {
      console.error("AI Analysis major failure:", err);
      setAiError(err?.message || "Analiz sırasında bir hata oluştu.");
      setIsAiLoading(false);
      setIsDeepAnalysing(false);
    }
  }, [highGYCount, userProfile, foodList, isCooked, mealSequence, hasAcid, isLiquid, isResistant, consumptionHour, isProcessed, hasMovement, isLowSleep, isStressed, history, dailyLog, generateLocalComment]);

  const startListening = useCallback(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Tarayıcınız sesli komut desteği sağlamıyor.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'tr-TR';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setIsListening(true);
    };

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setSearchVal(transcript);
      setIsListening(false);
      handleAiAnalysis(transcript);
    };

    recognition.onerror = (event: any) => {
      console.error("Speech recognition error:", event.error);
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.start();
  }, [handleAiAnalysis]);

  const syncDatabaseWithAi = async () => {
    if (isSyncing) return;
    setIsSyncing(true);
    setSyncProgress({ current: 0, total: foodList.length });
    
    const updatedList = [...foodList];
    
    for (let i = 0; i < foodList.length; i++) {
      try {
        const food = foodList[i];
        const result = await analyzeFood(food.isim, 0, "");
        
        updatedList[i] = {
          ...food,
          gi: result.gi,
          karb: result.karb,
          pro: result.pro,
          yag: result.yag,
          kal: result.kal,
          lif: result.lif
        };
        
        setSyncProgress(prev => ({ ...prev, current: i + 1 }));
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (err) {
        console.error(`Error syncing ${foodList[i].isim}:`, err);
      }
    }
    
    setFoodList(updatedList);
    setIsSyncing(false);
    alert("Veritabanı başarıyla güncellendi!");
  };

  useEffect(() => {
    const isAnyModalOpen = selectedFood || aiResult || isFormOpen || isHistoryOpen || isProfileOpen || isPlateOpen;
    if (isAnyModalOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [selectedFood, aiResult, isFormOpen, isHistoryOpen, isProfileOpen, isPlateOpen]);

  const handleAiFill = async () => {
    if (!formData.isim.trim()) {
      setFormErrors({ isim: 'Önce bir besin adı girmelisiniz' });
      return;
    }
    
    // VERİTABANI ÖNCELİĞİ (KOTA VE HIZ TASARRUFU)
    // Akıllı Eşleşme: Eğer veritabanımızda benzer bir isim varsa AI'yı beklemeden getir
    const nameLower = formData.isim.trim().toLowerCase();
    const existingFood = foodList.find(f => 
      f.isim.toLowerCase() === nameLower || 
      nameLower.includes(f.isim.toLowerCase()) ||
      f.isim.toLowerCase().includes(nameLower)
    );

    if (existingFood) {
      console.log("Maximum Speed: Match found in database for", formData.isim);
      setFormData({
        ...existingFood,
        isim: formData.isim // Kullanıcının girdiği ismi koru
      });
      return;
    }

    setIsFilling(true);
    setFormErrors({});
    try {
      const data = await getNutritionData(formData.isim);
      setFormData(data);
    } catch (err) {
      console.error("AI Fill Error:", err);
      setFormErrors({ isim: 'Besin verileri alınamadı. Lütfen adı kontrol edin.' });
    } finally {
      setIsFilling(false);
    }
  };

  const handleSaveFood = () => {
    const errors: Partial<Record<keyof Food, string>> = {};
    if (!formData.isim.trim()) errors.isim = 'İsim boş olamaz';
    if (!formData.kat.trim()) errors.kat = 'Kategori seçilmeli';
    if (formData.gi < 0) errors.gi = 'GI negatif olamaz';
    if (formData.karb < 0) errors.karb = 'Karbonhidrat negatif olamaz';
    if (formData.lif < 0) errors.lif = 'Lif negatif olamaz';
    if (formData.pro < 0) errors.pro = 'Protein negatif olamaz';
    if (formData.yag < 0) errors.yag = 'Yağ negatif olamaz';
    if (formData.kal < 0) errors.kal = 'Kalori negatif olamaz';

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    const finalFood: Food = {
      ...formData,
      score: calculateMetabolicScore(formData, consumptionContext, userProfile)
    };

    if (editingFood) {
      setFoodList(prev => prev.map(f => f.isim === editingFood.isim ? finalFood : f));
    } else {
      if (foodList.some(f => f.isim.toLowerCase() === formData.isim.toLowerCase())) {
        setFormErrors({ isim: 'Bu isimde bir besin zaten var' });
        return;
      }
      setFoodList(prev => [finalFood, ...prev]);
    }
    setIsFormOpen(false);
    setEditingFood(null);
    setFormData({ isim: '', kat: 'Sebzeler', gi: 0, karb: 0, lif: 0, pro: 0, yag: 0, kal: 0, score: 7 });
    setFormErrors({});
  };

  const handleDeleteFood = (isim: string) => {
    setFoodList(prev => prev.filter(f => f.isim !== isim));
    setSelectedFood(null);
  };

  const openAddModal = () => {
    setEditingFood(null);
    setFormData({ isim: '', kat: 'Sebzeler', gi: 0, karb: 0, lif: 0, pro: 0, yag: 0, kal: 0, score: 7 });
    setFormErrors({});
    setIsFormOpen(true);
  };

  const openEditModal = (f: Food) => {
    setEditingFood(f);
    setFormData({ ...f });
    setFormErrors({});
    setIsFormOpen(true);
  };

  const addToPlate = (f: Food) => {
    if (plate.length >= 6) return;
    setPlate([...plate, f]);
  };

  const removeFromPlate = (idx: number) => {
    setPlate(plate.filter((_, i) => i !== idx));
  };

  const plateAnalysis = useMemo(() => {
    if (plate.length === 0) return null;
    
    const totalKarb = plate.reduce((sum, f) => sum + f.karb, 0);
    const totalLif = plate.reduce((sum, f) => sum + f.lif, 0);
    const totalPro = plate.reduce((sum, f) => sum + f.pro, 0);
    const totalKal = plate.reduce((sum, f) => sum + f.kal, 0);
    
    // Basit bir ortalama skor mantığı
    const avgM = plate.reduce((sum, f) => sum + calculateMetabolicScore(f, consumptionContext, userProfile), 0) / plate.length;
    const avgN = plate.reduce((sum, f) => sum + calculateNutritionalScore(f), 0) / plate.length;
    
    let verdict = "";
    if (avgM >= 7) verdict = "Bu tabak metabolik olarak harika dengelenmiş! Kilo verme sürecine tam destek.";
    else if (avgM >= 5) verdict = "Dengeli bir öğün ancak porsiyonlara dikkat etmelisin.";
    else verdict = "Bu kombinasyon kan şekerini çok yorabilir. Lif veya protein miktarını artırmayı dene.";

    if (totalPro < 15 && plate.length > 1) verdict += " ⚠️ Not: Protein miktarı biraz düşük kalmış.";
    if (totalLif < 5 && plate.length > 1) verdict += " ⚠️ Not: Lif miktarını artırmak tokluk süreni uzatır.";

    return { m: Math.round(avgM * 10) / 10, n: Math.round(avgN * 10) / 10, verdict, totalKal, totalKarb, totalLif, totalPro };
  }, [plate, isCooked, mealSequence, hasAcid, isLiquid, isResistant, consumptionHour, isProcessed, hasMovement, highGYCount, isLowSleep, isStressed]);

  const cats = useMemo(() => ['Tümü', ...new Set(foodList.map(f => f.kat))], [foodList]);

  const filteredFoods = useMemo(() => {
    let list = foodList.filter(f => {
      const catOk = activeCat === 'Tümü' || f.kat === activeCat;
      const srchOk = !searchVal || f.isim.toLowerCase().includes(searchVal.toLowerCase()) || f.kat.toLowerCase().includes(searchVal.toLowerCase());
      
      let filterOk = true;
      if (quickFilter === 'super') {
        const m = calculateMetabolicScore(f, consumptionContext, userProfile);
        const n = calculateNutritionalScore(f);
        filterOk = m >= 7 && n >= 7;
      } else if (quickFilter === 'protein') {
        filterOk = f.pro >= 10;
      } else if (quickFilter === 'lowcarb') {
        filterOk = f.karb <= 10;
      }

      return catOk && srchOk && filterOk;
    });

    list.sort((a, b) => {
      if (sortMode === 'skor') return calculateMetabolicScore(b, consumptionContext, userProfile) - calculateMetabolicScore(a, consumptionContext, userProfile);
      if (sortMode === 'gi')   return a.gi - b.gi;
      if (sortMode === 'isim') return a.isim.localeCompare(b.isim, 'tr');
      return 0;
    });

    return list;
  }, [foodList, searchVal, activeCat, sortMode, quickFilter, isCooked, mealSequence, hasAcid, isLiquid, isResistant, consumptionHour, isProcessed, hasMovement, highGYCount, isLowSleep, isStressed]);

  return (
    <div className={`min-h-screen overflow-x-hidden transition-all duration-700 ${darkMode ? 'bg-[#0A0A0A] text-zinc-100' : 'bg-[#FAFAF9] text-zinc-900'} pb-28 font-sans selection:bg-[#2DFF73] selection:text-black`}>
      <a 
        href="#main-content" 
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[1000] focus:px-6 focus:py-3 focus:bg-[#2DFF73] focus:text-black focus:font-black focus:rounded-xl focus:shadow-2xl"
      >
        İçeriğe Atla
      </a>
      {/* Achievement Toast */}
      <AnimatePresence>
        {showAchievementToast && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.9 }}
            className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[300] w-[90%] max-w-[400px]"
          >
            <div className={`p-4 rounded-[2rem] border shadow-2xl flex items-center gap-4 ${darkMode ? 'bg-[#1A1A1A] border-[#2DFF73]/30 text-white' : 'bg-white border-[#2DFF73]/30 text-black'}`}>
              <div className="w-16 h-16 rounded-2xl bg-[#2DFF73]/20 flex items-center justify-center text-3xl shadow-inner">
                {showAchievementToast.icon}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <Trophy size={14} className="text-[#2DFF73]" />
                  <span className="text-[0.6rem] font-black text-[#2DFF73] uppercase tracking-widest">Başarım Açıldı!</span>
                </div>
                <h4 className="text-[1.1rem] font-black leading-tight mt-0.5">{showAchievementToast.title}</h4>
                <p className="text-[0.75rem] text-zinc-500 font-medium">{showAchievementToast.description}</p>
              </div>
              <button 
                onClick={() => setShowAchievementToast(null)}
                className="p-2 rounded-full hover:bg-white/5"
              >
                <X size={20} className="text-zinc-500" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Achievements Modal */}
      <AnimatePresence>
        {isAchievementsOpen && (
          <div className="fixed inset-0 z-[250] flex items-center justify-center p-4 md:p-8 bg-black/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className={`rounded-[3rem] relative border shadow-2xl overflow-hidden max-w-2xl w-full max-h-[90vh] flex flex-col ${darkMode ? 'bg-[#0A0A0A] text-white border-white/10' : 'bg-[#F5F5F0] text-black border-black/10'}`}
            >
              <div className="p-8 pb-4 border-b border-white/5 flex justify-between items-center">
                <div>
                  <h2 className="text-[2rem] font-black tracking-tighter leading-none">Başarımlar</h2>
                  <p className="text-[0.8rem] text-zinc-500 font-black uppercase tracking-widest mt-2">Metabolik Yolculuğun</p>
                </div>
                <button 
                  onClick={() => setIsAchievementsOpen(false)}
                  className={`p-4 rounded-2xl transition-all ${darkMode ? 'bg-white/5 hover:bg-white/10' : 'bg-black/5 hover:bg-black/10'}`}
                >
                  <X size={24} />
                </button>
              </div>

              <div className="p-8 overflow-y-auto custom-scrollbar">
                <div className="grid grid-cols-1 gap-4">
                  {achievements.map((achievement) => (
                    <div 
                      key={achievement.id}
                      className={`p-5 rounded-[2rem] border transition-all flex items-center gap-5 ${achievement.unlockedAt ? (darkMode ? 'bg-[#2DFF73]/5 border-[#2DFF73]/20' : 'bg-[#2DFF73]/5 border-[#2DFF73]/20') : (darkMode ? 'bg-white/5 border-white/5 opacity-60' : 'bg-black/5 border-black/5 opacity-60')}`}
                    >
                      <div className={`w-16 h-16 rounded-2xl flex items-center justify-center text-3xl shadow-lg ${achievement.unlockedAt ? 'bg-[#2DFF73] text-black' : (darkMode ? 'bg-white/10' : 'bg-black/10')}`}>
                        {achievement.icon}
                      </div>
                      <div className="flex-1">
                        <div className="flex justify-between items-start mb-1">
                          <h4 className="text-[1.1rem] font-black leading-tight">{achievement.title}</h4>
                          {achievement.unlockedAt && (
                            <div className="flex items-center gap-1 text-[#2DFF73]">
                              <CheckCircle2 size={14} />
                              <span className="text-[0.6rem] font-black uppercase">Tamamlandı</span>
                            </div>
                          )}
                        </div>
                        <p className="text-[0.8rem] text-zinc-500 font-medium mb-3">{achievement.description}</p>
                        
                        <div className="w-full h-2 bg-black/20 rounded-full overflow-hidden">
                          <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: `${Math.min(100, (achievement.progress / achievement.requirement) * 100)}%` }}
                            className={`h-full rounded-full ${achievement.unlockedAt ? 'bg-[#2DFF73]' : 'bg-zinc-500'}`}
                          />
                        </div>
                        <div className="flex justify-between mt-1.5">
                          <span className="text-[0.6rem] font-black text-zinc-500 uppercase">{achievement.progress} / {achievement.requirement}</span>
                          <span className="text-[0.6rem] font-black text-zinc-500 uppercase">{Math.round(Math.min(100, (achievement.progress / achievement.requirement) * 100))}%</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className={`mt-8 p-6 rounded-[2rem] border ${darkMode ? 'bg-white/5 border-white/5' : 'bg-black/5 border-black/5'}`}>
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-[1.2rem] font-black tracking-tight">İstatistiklerin</h3>
                    <Award className="text-[#2DFF73]" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex flex-col">
                      <span className="text-[0.6rem] font-black text-zinc-500 uppercase tracking-widest">Toplam Puan</span>
                      <span className="text-[1.5rem] font-black">{userStats.points}</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[0.6rem] font-black text-zinc-500 uppercase tracking-widest">Mevcut Seri</span>
                      <span className="text-[1.5rem] font-black">{userStats.streak} Gün</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[0.6rem] font-black text-zinc-500 uppercase tracking-widest">Toplam Kayıt</span>
                      <span className="text-[1.5rem] font-black">{userStats.totalLogs}</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[0.6rem] font-black text-zinc-500 uppercase tracking-widest">En İyi Skor</span>
                      <span className="text-[1.5rem] font-black">{userStats.bestMetabolicScore}</span>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Daily Challenge Modal */}
      <AnimatePresence>
        {isChallengeOpen && (
          <div className="fixed inset-0 z-[250] flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className={`max-w-lg w-full p-10 md:p-12 text-center relative overflow-hidden rounded-[3rem] ${darkMode ? 'bg-[#0A0A0A] text-white border border-white/10' : 'bg-[#FAFAF9] text-black border border-black/5 shadow-2xl'}`}
            >
              <div className="absolute top-0 right-0 w-40 h-40 bg-[#2DFF73]/10 blur-[60px] -mr-20 -mt-20" />
              <div className="w-20 h-20 rounded-3xl bg-[#2DFF73]/20 flex items-center justify-center mx-auto mb-8 text-[#2DFF73]">
                <Target size={40} />
              </div>
              <h2 className="text-[2.5rem] font-black tracking-tighter leading-none mb-4">Günün Görevi</h2>
              <p className="text-[1.1rem] font-medium text-zinc-500 mb-10 leading-relaxed font-sans">
                "Bugün her öğünden önce 1 bardak sirkeli su içerek glisemik tepkiyi %30'a kadar düşür!"
              </p>
              <div className="flex flex-col gap-4">
                <button 
                  onClick={() => {
                    setIsChallengeOpen(false);
                    updateGamification(100);
                    setAiSuccess("Görev tamamlandı! +20 Puan");
                  }}
                  className="w-full py-5 rounded-2xl bg-[#2DFF73] text-black font-black uppercase tracking-widest hover:scale-[1.02] active:scale-[0.98] transition-all"
                >
                  Görevi Tamamladım
                </button>
                <button 
                  onClick={() => setIsChallengeOpen(false)}
                  className={`w-full py-5 rounded-2xl font-black uppercase tracking-widest transition-all ${darkMode ? 'bg-white/5 text-white hover:bg-white/10' : 'bg-black/5 text-black hover:bg-black/10'}`}
                >
                  Daha Sonra
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <header className={`sticky top-0 z-[100] backdrop-blur-2xl border-b transition-all duration-500 ${darkMode ? 'bg-black/80 border-white/5' : 'bg-white/80 border-black/5 shadow-sm'} px-8 flex items-center justify-center`}>
        <div className="max-w-[1200px] w-full flex justify-between items-center py-5">
          <div role="banner" className="flex items-center gap-3">
            <div className={`text-[1.3rem] font-black tracking-tight flex items-center ${darkMode ? 'text-white' : 'text-black'}`}>
              <span className="opacity-40">GLI</span>
              <span className="text-[#2DFF73]">SKOR</span>
            </div>
          </div>
          
          <div className="flex gap-3 items-center">
            {/* Simple Stats */}
            <div className={`hidden sm:flex items-center gap-4 px-4 py-1.5 rounded-full border ${darkMode ? 'bg-white/5 border-white/5' : 'bg-black/5 border-black/5'}`}>
              <div className="flex items-center gap-2">
                <span className="text-[0.6rem] font-bold text-zinc-500">GY</span>
                <span className={`text-[0.85rem] font-bold ${dailyTotals.gl > 100 ? 'text-red-500' : 'text-[#2DFF73]'}`}>{Math.round(dailyTotals.gl)}</span>
              </div>
              <div className="w-px h-3 bg-zinc-500/20" />
              <div className="flex items-center gap-2">
                <Flame size={12} className="text-orange-500" />
                <span className="text-[0.85rem] font-bold">{userStats.streak}</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button 
                onClick={() => setDarkMode(!darkMode)}
                className={`p-2.5 rounded-lg border transition-all ${darkMode ? 'bg-white/5 border-white/10 text-zinc-400' : 'bg-white border-black/10 text-zinc-500 shadow-sm'}`}
              >
                {darkMode ? <Sun size={18} /> : <Moon size={18} />}
              </button>
              
              <button 
                onClick={() => setIsProfileOpen(true)}
                className={`p-1 rounded-lg border transition-all ${darkMode ? 'bg-white/5 border-white/10' : 'bg-white border-black/10 shadow-sm'}`}
              >
                <div className="w-8 h-8 rounded-md bg-[#2DFF73] flex items-center justify-center text-black">
                  <User size={16} />
                </div>
              </button>
            </div>
          </div>
        </div>
      </header>

      <main id="main-content" className="p-4 xs:p-6 md:p-8 pt-12 md:pt-24 max-w-[1200px] mx-auto overflow-visible">
        {/* Main Search Area */}
        <div className="max-w-[700px] mx-auto text-center mb-12 md:mb-20 px-4">
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className={`text-[3rem] xs:text-[4rem] md:text-[5rem] font-black tracking-tighter leading-tight mb-8 ${darkMode ? 'text-white' : 'text-zinc-900'}`}
          >
            Metabolik <br /> <span className="text-[#2DFF73]">Dengeni Keşfet.</span>
          </motion.h1>
          
          <div className={`p-1.5 rounded-2xl border transition-all duration-300 flex flex-col md:flex-row items-stretch gap-1.5 ${darkMode ? 'bg-white/5 border-white/5' : 'bg-white border-black/5 shadow-lg shadow-black/[0.03]'}`}>
            <div className="flex-1 flex items-center px-5 gap-3 py-1">
              <Search className={darkMode ? 'text-zinc-600' : 'text-zinc-300'} size={20} />
              <input 
                type="text" 
                placeholder="Örn: Portakal Suyu" 
                value={searchVal}
                onChange={(e) => setSearchVal(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAiAnalysis(searchVal)}
                className={`flex-1 bg-transparent border-none py-3 focus:outline-none font-bold ${darkMode ? 'text-white placeholder-zinc-700' : 'text-black placeholder-zinc-300'}`}
              />
            </div>
            
            <div className="flex gap-1.5">
              <button 
                onClick={startListening}
                className={`w-12 h-12 flex items-center justify-center rounded-xl transition-all ${isListening ? 'bg-red-500 text-white' : darkMode ? 'bg-white/5 text-zinc-500' : 'bg-zinc-100 text-zinc-500'}`}
              >
                {isListening ? <MicOff size={20} /> : <Mic size={20} />}
              </button>
              <button 
                onClick={() => handleAiAnalysis(searchVal)}
                disabled={!searchVal || isAiLoading}
                className={`px-8 rounded-xl font-bold uppercase text-[0.75rem] tracking-widest transition-all ${!searchVal || isAiLoading ? 'bg-zinc-800 text-zinc-600' : 'bg-[#2DFF73] text-black hover:opacity-90'}`}
              >
                Analiz
              </button>
            </div>
          </div>
          
          <div className="mt-8 flex flex-wrap justify-center gap-4">
             {['Hünnap', 'Kuru Fasulye', 'Limonlu Su', 'Mercimek'].map(tag => (
               <button 
                 key={tag}
                 onClick={() => {
                   setSearchVal(tag);
                   handleAiAnalysis(tag);
                 }}
                 className={`px-4 py-1.5 rounded-xl border text-[0.7rem] font-bold transition-all hover:scale-105 active:scale-95 ${darkMode ? 'bg-white/5 border-white/5 text-zinc-500 hover:text-[#2DFF73] hover:border-[#2DFF73]/30' : 'bg-white border-black/5 shadow-sm text-zinc-400 hover:text-emerald-600 hover:border-emerald-200'}`}
               >
                 {tag}
               </button>
             ))}
          </div>
        </div>

        {!aiResult && <DiscoverySection darkMode={darkMode} onSelect={(val) => {
          setSearchVal(val);
          handleAiAnalysis(val);
        }} />}
      </main>

      {/* Floating Bottom Navigation */}
      <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[150] w-auto">
        <div className={`p-2.5 rounded-[3rem] border shadow-2xl flex items-center gap-2 ${darkMode ? 'bg-[#0A0A0A]/90 border-white/10' : 'bg-white/95 border-black/5'} backdrop-blur-2xl`}>
           <button 
              onClick={() => {
                setAiResult(null);
                setSearchVal('');
              }} 
              className={`p-4 rounded-3xl transition-all ${!aiResult ? 'bg-[#2DFF73] text-black' : 'text-zinc-500 hover:text-black dark:hover:text-white'}`}
           >
              <Search size={22} strokeWidth={2.5} />
           </button>
           <button 
              onClick={() => setIsPlateOpen(true)}
              className={`p-4 rounded-3xl transition-all relative ${isPlateOpen ? 'bg-[#2DFF73] text-black' : 'text-zinc-500 hover:text-black dark:hover:text-white'}`}
           >
              <Utensils size={22} strokeWidth={2.5} />
              {plate.length > 0 && (
                <div className="absolute top-2 right-2 w-4 h-4 bg-orange-500 rounded-full border-2 border-white dark:border-black" />
              )}
           </button>
           <button 
              onClick={() => setIsTrackingOpen(true)}
              className={`p-4 rounded-3xl transition-all ${isTrackingOpen ? 'bg-[#2DFF73] text-black' : 'text-zinc-500 hover:text-black dark:hover:text-white'}`}
           >
              <Activity size={22} strokeWidth={2.5} />
           </button>
           <button 
              onClick={() => setIsCoachOpen(true)}
              className={`p-4 rounded-3xl transition-all ${isCoachOpen ? 'bg-[#2DFF73] text-black' : 'text-zinc-500 hover:text-black dark:hover:text-white'}`}
           >
              <Brain size={22} strokeWidth={2.5} />
           </button>
        </div>
      </div>

      <AnimatePresence>
        {isAiLoading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <SkeletonLoader darkMode={darkMode} />
          </motion.div>
        )}

        {aiError && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[250] w-[90%] max-w-md"
          >
            <div className={`p-4 rounded-2xl border flex items-center gap-4 shadow-2xl ${darkMode ? 'bg-red-500/10 border-red-500/20 text-red-400' : 'bg-red-50 border-red-100 text-red-600'}`}>
              <div className={`p-2 rounded-xl ${darkMode ? 'bg-red-500/20' : 'bg-red-500/10'}`}>
                <AlertTriangle size={20} />
              </div>
              <div className="flex-1">
                <p className="text-[0.85rem] font-bold leading-tight">{aiError}</p>
              </div>
              <button onClick={() => setAiError(null)} className="p-1 hover:bg-black/5 rounded-lg transition-colors">
                <X size={16} />
              </button>
            </div>
          </motion.div>
        )}

        {aiResult && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex items-center justify-center p-2 xs:p-4 md:p-8 bg-black/90 backdrop-blur-md"
          >
            <UnifiedFoodDetail 
              food={transformAiResultToFood(aiResult, consumptionContext, userProfile)}
              ctx={consumptionContext}
              profile={userProfile}
              darkMode={darkMode}
              isAiResult={true}
              dbAverage={dbAverage}
              onClose={() => setAiResult(null)}
              onLog={(f, s) => {
                addToLog(f, 100, 'Analiz', s);
                setAiResult(null);
              }}
              onPlate={() => {
                addToPlate(transformAiResultToFood(aiResult, consumptionContext, userProfile));
                setAiResult(null);
              }}
              onAdd={() => {
                const newFood = transformAiResultToFood(aiResult, consumptionContext, userProfile);
                if (!foodList.some(f => f.isim.toLowerCase() === newFood.isim.toLowerCase())) {
                  setFoodList(prev => [newFood, ...prev]);
                  setAiSuccess(`${newFood.isim} listeye eklendi!`);
                  setTimeout(() => setAiSuccess(null), 2000);
                }
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {selectedFood && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex items-center justify-center p-2 xs:p-4 md:p-8 bg-black/90 backdrop-blur-md"
          >
            <UnifiedFoodDetail 
              food={selectedFood}
              ctx={consumptionContext}
              profile={userProfile}
              darkMode={darkMode}
              isAiResult={false}
              dbAverage={dbAverage}
              onClose={() => setSelectedFood(null)}
              onLog={(f, s) => {
                addToLog(f, 100, 'Atıştırmalık', s);
                setSelectedFood(null);
              }}
              onPlate={() => {
                addToPlate(selectedFood);
                setSelectedFood(null);
              }}
              onEdit={() => openEditModal(selectedFood)}
              onDelete={() => {
                if(window.confirm(`${selectedFood.isim} silinsin mi?`)) {
                  handleDeleteFood(selectedFood.isim);
                  setSelectedFood(null);
                }
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* AI Coach Modal */}
      <AnimatePresence>
        {isCoachOpen && (
          <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className={`w-full max-w-2xl h-[80vh] rounded-[3rem] border flex flex-col overflow-hidden ${darkMode ? 'bg-[#0A0A0A] border-white/10' : 'bg-white border-black/10'}`}
            >
              <div className="p-6 border-b border-white/5 flex justify-between items-center bg-[#2DFF73]/5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#2DFF73] flex items-center justify-center text-black shadow-[0_0_20px_rgba(45,255,115,0.3)]">
                    <Brain size={20} />
                  </div>
                  <div>
                    <h2 className="text-lg font-black tracking-tight">Nutrition AI</h2>
                    <p className="text-[0.65rem] font-black text-[#2DFF73] uppercase tracking-widest">Beslenme Analiz & Karar Destek Asistanı</p>
                  </div>
                </div>
                <button onClick={() => setIsCoachOpen(false)} className="p-2 hover:bg-white/5 rounded-full transition-all">
                  <X size={20} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {coachMessages.length === 0 && (
                  <div className="text-center py-6">
                    <div className="w-12 h-12 rounded-2xl bg-[#2DFF73]/10 text-[#2DFF73] flex items-center justify-center mx-auto mb-3">
                      <Sparkles size={24} />
                    </div>
                    <h3 className="text-base font-black mb-1">Merhaba! Ben Nutrition AI.</h3>
                    <p className="text-xs text-zinc-400 max-w-sm mx-auto leading-relaxed">
                      Herhangi bir yiyeceği yazabilir veya fotoğrafını yükleyebilirsiniz. Genel kalite, porsiyon ve günün bağlamına göre 10 maddelik bilimsel karar raporu üretirim.
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-5 text-left">
                      {[
                        "Bunu yiyebilir miyim? (1 porsiyon kıymalı pide ve salata)",
                        "Tatlı krizim var, sağlıklı bir alternatif ve kombinasyon öner",
                        "Bugün çok karbonhidrat tükettim, akşam öğünümü nasıl dengelemeliyim?",
                        "1 kutu gazlı içecek içtim, metabolik etkisini değerlendir"
                      ].map((q, i) => (
                        <button 
                          key={i} 
                          onClick={() => handleCoachMessage(q)} 
                          className={`p-3 rounded-xl border text-xs font-semibold text-left transition-all ${darkMode ? 'bg-white/5 border-white/5 hover:bg-white/10 text-zinc-300' : 'bg-black/5 border-black/5 hover:bg-black/10 text-zinc-800'}`}
                        >
                          {q}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {coachMessages.map((m, i) => (
                  <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[85%] p-4 rounded-2xl text-[0.85rem] font-medium leading-relaxed ${
                      m.role === 'user' 
                        ? 'bg-[#2DFF73] text-black rounded-tr-none' 
                        : (darkMode ? 'bg-white/5 border border-white/10 text-zinc-200 rounded-tl-none' : 'bg-zinc-100 border border-zinc-200 text-zinc-900 rounded-tl-none')
                    }`}>
                      {m.image && (
                        <img 
                          src={m.image} 
                          alt="Görsel" 
                          className="w-48 h-32 object-cover rounded-xl mb-2 border border-black/10 shadow-sm"
                        />
                      )}
                      <div className="whitespace-pre-wrap">{m.content}</div>
                    </div>
                  </div>
                ))}
                {isCoachLoading && (
                  <div className="flex justify-start">
                    <div className={`p-4 rounded-2xl rounded-tl-none flex items-center gap-3 ${darkMode ? 'bg-white/5 border border-white/10 text-zinc-400' : 'bg-zinc-100 border border-zinc-200 text-zinc-600'}`}>
                      <Loader2 className="animate-spin text-[#2DFF73]" size={18} />
                      <span className="text-xs font-semibold">Nutrition AI 10 maddelik analizi hazırlıyor...</span>
                    </div>
                  </div>
                )}
              </div>

              <div className="p-4 sm:p-6 border-t border-white/5 space-y-2">
                {coachImagePreview && (
                  <div className="relative inline-block">
                    <img 
                      src={coachImagePreview} 
                      alt="Önizleme" 
                      className="w-20 h-20 object-cover rounded-xl border border-[#2DFF73]/50 shadow-md"
                    />
                    <button 
                      onClick={() => setCoachImagePreview(null)}
                      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow hover:bg-red-600 transition-all"
                    >
                      <X size={12} />
                    </button>
                  </div>
                )}
                <div className="relative flex items-center gap-2">
                  <label 
                    htmlFor="coach-file-upload" 
                    className={`p-3 rounded-xl border cursor-pointer transition-all flex items-center justify-center shrink-0 ${darkMode ? 'bg-white/5 border-white/10 hover:bg-white/10 text-zinc-400' : 'bg-black/5 border-black/10 hover:bg-black/10 text-zinc-600'}`}
                    title="Fotoğraf yükle"
                  >
                    <Camera size={20} />
                    <input 
                      id="coach-file-upload" 
                      type="file" 
                      accept="image/*" 
                      className="hidden" 
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onload = () => {
                            setCoachImagePreview(reader.result as string);
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                    />
                  </label>
                  <input 
                    type="text" 
                    placeholder="Bir yiyecek yazın veya 'Bunu yiyebilir miyim?' diye sorun..." 
                    className={`flex-1 bg-white/5 border border-white/10 rounded-2xl py-3.5 pl-4 pr-12 text-sm focus:outline-none focus:border-[#2DFF73]/50 transition-all ${darkMode ? 'text-white' : 'text-black'}`}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        const val = (e.target as HTMLInputElement).value;
                        if (val.trim() || coachImagePreview) {
                          handleCoachMessage(val || "Bu görseldeki yiyeceği analiz et.", coachImagePreview || undefined);
                          (e.target as HTMLInputElement).value = '';
                          setCoachImagePreview(null);
                        }
                      }
                    }}
                    id="coach-input"
                  />
                  <button 
                    onClick={() => {
                      const input = document.getElementById('coach-input') as HTMLInputElement;
                      const val = input ? input.value : '';
                      if (val.trim() || coachImagePreview) {
                        handleCoachMessage(val || "Bu görseldeki yiyeceği analiz et.", coachImagePreview || undefined);
                        if (input) input.value = '';
                        setCoachImagePreview(null);
                      }
                    }}
                    className="absolute right-2 p-2 bg-[#2DFF73] text-black rounded-xl hover:scale-105 transition-all shadow-md"
                  >
                    <ChevronRight size={18} />
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Barcode Scanner Modal */}
      <AnimatePresence>
        {isBarcodeOpen && (
          <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="w-full max-w-md aspect-square rounded-[3rem] border border-white/10 bg-black overflow-hidden relative"
            >
              <div id="reader" className="w-full h-full"></div>
              <div className="absolute inset-0 pointer-events-none border-[40px] border-black/40 flex items-center justify-center">
                <div className="w-64 h-48 border-2 border-[#2DFF73] rounded-2xl relative">
                  <div className="absolute top-0 left-0 w-4 h-4 border-t-4 border-l-4 border-[#2DFF73] -translate-x-1 -translate-y-1"></div>
                  <div className="absolute top-0 right-0 w-4 h-4 border-t-4 border-r-4 border-[#2DFF73] translate-x-1 -translate-y-1"></div>
                  <div className="absolute bottom-0 left-0 w-4 h-4 border-b-4 border-l-4 border-[#2DFF73] -translate-x-1 translate-y-1"></div>
                  <div className="absolute bottom-0 right-0 w-4 h-4 border-b-4 border-r-4 border-[#2DFF73] translate-x-1 translate-y-1"></div>
                  <motion.div 
                    animate={{ top: ['0%', '100%', '0%'] }}
                    transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                    className="absolute left-0 right-0 h-0.5 bg-[#2DFF73] shadow-[0_0_15px_#2DFF73]"
                  />
                </div>
              </div>
              <button 
                onClick={() => setIsBarcodeOpen(false)}
                className="absolute top-6 right-6 p-3 bg-black/50 hover:bg-black rounded-full text-white transition-all z-10"
              >
                <X size={24} />
              </button>
              <div className="absolute bottom-10 left-0 right-0 text-center px-8">
                <p className="text-white font-black uppercase tracking-widest text-[0.7rem] bg-black/50 py-2 rounded-full inline-block px-6">Barkodu Çerçevenin İçine Alın</p>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Stats & Trends Modal */}
      <AnimatePresence>
        {isStatsOpen && (
          <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className={`w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-3xl border p-8 sm:p-10 ${darkMode ? 'bg-[#0A0A0A] border-white/5' : 'bg-white border-black/5 shadow-2xl'}`}
            >
              <div className="flex justify-between items-center mb-10">
                <div>
                  <h2 className="text-2xl font-black tracking-tight">Analiz Paneli</h2>
                  <p className="text-zinc-500 text-[0.8rem] font-medium">Haftalık metabolik seyir raporu</p>
                </div>
                <button onClick={() => setIsStatsOpen(false)} className={`p-2 rounded-xl border ${darkMode ? 'bg-white/5 border-white/5' : 'bg-black/5 border-black/5'}`}>
                  <X size={20} />
                </button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className={`p-6 rounded-2xl border ${darkMode ? 'bg-white/5 border-white/5' : 'bg-white border-black/5'}`}>
                  <h3 className="text-[0.8rem] font-bold uppercase tracking-widest mb-6 flex items-center gap-2">
                    <Activity className="text-[#2DFF73]" size={16} />
                    Glisemik Profil
                  </h3>
                  <div className="h-[220px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={[
                        { day: 'Pzt', gl: 85 }, { day: 'Sal', gl: 110 }, { day: 'Çar', gl: 95 }, { day: 'Per', gl: 120 }, { day: 'Cum', gl: 80 }, { day: 'Cmt', gl: 140 }, { day: 'Paz', gl: 90 }
                      ]}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} strokeOpacity={0.1} />
                        <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 600}} />
                        <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 600}} />
                        <Area type="monotone" dataKey="gl" stroke="#2DFF73" strokeWidth={3} fill="#2DFF73" fillOpacity={0.05} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className={`p-6 rounded-2xl border ${darkMode ? 'bg-white/5 border-white/5' : 'bg-white border-black/5'}`}>
                  <h3 className="text-[0.8rem] font-bold uppercase tracking-widest mb-6 flex items-center gap-2">
                    <Flame className="text-orange-500" size={16} />
                    Enerji Alımı
                  </h3>
                  <div className="h-[220px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={[
                        { day: 'Pzt', cal: 1800 }, { day: 'Sal', cal: 2100 }, { day: 'Çar', cal: 1950 }, { day: 'Per', cal: 2200 }, { day: 'Cum', cal: 1850 }, { day: 'Cmt', cal: 2500 }, { day: 'Paz', cal: 2000 }
                      ]}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} strokeOpacity={0.1} />
                        <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 600}} />
                        <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 600}} />
                        <Bar dataKey="cal" fill="#FF6B2B" radius={[4, 4, 0, 0]} barSize={20} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
                {[
                  { label: 'ORTALAMA YÜK', value: '98', status: 'Optimal', color: 'text-[#2DFF73]' },
                  { label: 'PİK SEVİYE', value: '140', status: '+%40 Artış', color: 'text-red-500' },
                  { label: 'HEDEF UYUMU', value: '%85', status: 'Başarılı', color: 'text-blue-400' }
                ].map((s, i) => (
                  <div key={i} className={`p-4 rounded-xl border ${darkMode ? 'bg-white/5 border-white/5' : 'bg-white border-black/5'}`}>
                    <span className="text-[0.55rem] font-bold text-zinc-500 uppercase tracking-widest">{s.label}</span>
                    <div className="flex items-end justify-between mt-1">
                      <span className="text-[1.2rem] font-black">{s.value}</span>
                      <span className={`text-[0.6rem] font-bold ${s.color}`}>{s.status}</span>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {aiSuccess && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[250] px-6 py-3 rounded-full bg-emerald-500 text-white font-black text-[0.8rem] shadow-2xl">
          {aiSuccess}
        </div>
      )}

      <div className="max-w-[900px] mx-auto mt-6 px-4 sm:px-8 flex items-center justify-between">
        <span className="text-[0.8rem] text-[#A8A39E] font-bold">{filteredFoods.length} besin listelendi (Listeniz boş ise arama yapıp ekleyebilirsiniz)</span>
      </div>

      <div className="max-w-[1000px] mx-auto mt-8 px-4 flex flex-wrap justify-center gap-6 border-y border-black/5 dark:border-white/5 py-6">
        {[
          { color: '#2DFF73', label: 'Güvenli (8-10)' },
          { color: '#FACC15', label: 'Ölçülü (5-7)' },
          { color: '#F97316', label: 'Dikkatli (3-4)' },
          { color: '#EF4444', label: 'Kaçın (1-2)' }
        ].map((item, i) => (
          <div key={i} className="flex items-center gap-2 group">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
            <span className="text-[0.65rem] font-bold text-zinc-500 uppercase tracking-widest">{item.label}</span>
          </div>
        ))}
      </div>

                    <div className="max-w-[1000px] mx-auto mt-10 px-4 sm:px-8 grid grid-cols-1 xs:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        {filteredFoods.length === 0 ? (
          <div className="col-span-full text-center py-20 text-zinc-600 text-[1.1rem] font-medium">Bu arama için sonuç bulunamadı.</div>
        ) : (
          filteredFoods.map((f, idx) => {
            const mScore = calculateMetabolicScore(f, consumptionContext, userProfile);
            const nScore = calculateNutritionalScore(f);
            const g = calculateGY(f, consumptionContext);
            const st = getStatusInfo(mScore, consumptionHour, f.karb, f.lif);
            const col = getRingColor(nScore); // Use nScore for color
            const note = getDietitianNote(mScore, nScore, f);

            return (
              <motion.div 
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                key={f.isim}
                onClick={() => setSelectedFood(f)}
                className={`p-6 xs:p-8 rounded-[2rem] md:rounded-[2.5rem] border transition-all duration-500 cursor-pointer group relative overflow-hidden flex flex-col justify-between h-full ${darkMode ? 'bg-black/20 border-white/5 hover:border-[#2DFF73]/30 hover:bg-[#2DFF73]/5' : 'bg-white border-black/5 shadow-xl hover:shadow-2xl hover:border-emerald-200 shadow-black/[0.02]'}`}
              >
                <div className="flex flex-col gap-6 relative z-10">
                  <div className="flex items-start justify-between">
                    <div className="flex flex-col gap-1">
                      <span className="text-[0.65rem] font-black uppercase tracking-[0.2em] text-zinc-500">
                        {f.kat}
                      </span>
                      <h2 className={`text-[1.4rem] md:text-[1.6rem] font-black leading-tight tracking-tighter ${darkMode ? 'text-white' : 'text-zinc-900'} group-hover:text-[#2DFF73] transition-colors`}>
                        {f.isim}
                      </h2>
                    </div>
                    <div className="flex flex-col items-end">
                      <span className="text-[2rem] md:text-[2.5rem] font-black text-[#2DFF73] leading-none">
                        {mScore}
                      </span>
                      <span className="text-[0.6rem] font-black uppercase tracking-widest text-zinc-500 mt-1">Metabolic</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4 py-4 border-y border-black/5 dark:border-white/5">
                    {[
                      { val: f.gi, label: 'GI' },
                      { val: g.toFixed(1), label: 'GY' },
                      { val: f.kal.toFixed(0), label: 'KCAL' }
                    ].map((item, i) => (
                      <div key={i} className="flex flex-col">
                        <span className={`text-[1rem] md:text-[1.1rem] font-black ${darkMode ? 'text-white' : 'text-black'}`}>{item.val}</span>
                        <span className="text-[0.6rem] font-black text-zinc-500 uppercase tracking-widest">{item.label}</span>
                      </div>
                    ))}
                  </div>

                  <div className="flex gap-3 mt-2">
                    <button 
                      onClick={(e) => { e.stopPropagation(); addToLog(f, 100, 'Atıştırmalık', mScore); }}
                      className={`flex-1 py-3 rounded-xl text-[0.7rem] font-black uppercase tracking-widest transition-all ${darkMode ? 'bg-white/5 text-zinc-400 hover:bg-white/10 hover:text-white' : 'bg-black/5 text-zinc-500 hover:bg-black/10 hover:text-black'}`}
                    >
                      Ekle
                    </button>
                    <button 
                      onClick={(e) => { e.stopPropagation(); addToPlate(f); }}
                      className="flex-1 py-3 rounded-xl bg-[#2DFF73] text-black text-[0.7rem] font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-lg shadow-[#2DFF73]/10"
                    >
                      Tabağa At
                    </button>
                  </div>
                </div>
                
                {/* Decoration */}
                <div className="absolute -right-8 -bottom-8 w-24 h-24 bg-[#2DFF73]/5 blur-[40px] rounded-full group-hover:bg-[#2DFF73]/10 transition-all" />
              </motion.div>
            );
          })
        )}
      </div>

      <AnimatePresence>
        {isFormOpen && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-xl z-[200] flex items-center justify-center p-4" onClick={() => setIsFormOpen(false)}>
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className={`rounded-[3rem] w-full max-w-[500px] p-10 relative max-h-[90vh] overflow-y-auto custom-scrollbar border shadow-2xl ${darkMode ? 'bg-[#0A0A0A] border-white/10 text-white' : 'bg-[#F5F5F0] border-black/10 text-black'}`}
              onClick={(e) => e.stopPropagation()}
            >
              <button 
                className={`absolute top-8 right-8 w-10 h-10 rounded-full border flex items-center justify-center transition-all ${darkMode ? 'bg-white/5 border-white/10 text-zinc-400 hover:bg-white/10' : 'bg-black/5 border-black/10 text-zinc-500 hover:bg-black/10'}`}
                onClick={() => setIsFormOpen(false)}
              >
                <X size={20} />
              </button>
              
              <h2 className={`text-[2.2rem] font-black tracking-tighter mb-8 bg-gradient-to-br bg-clip-text text-transparent ${darkMode ? 'from-white to-zinc-500' : 'from-black to-zinc-600'}`}>
                {editingFood ? 'Besini Düzenle' : 'Yeni Besin Ekle'}
              </h2>
              
              <div className="space-y-6">
                <div className="flex gap-3 items-end">
                  <div className="flex-1">
                    <label className="text-[0.7rem] font-black uppercase text-zinc-500 mb-2 block tracking-[0.2em] ml-1">Besin Adı</label>
                    <input 
                      type="text" 
                      className={`w-full bg-white/5 border rounded-2xl px-5 py-4 outline-none focus:border-emerald-500/50 text-zinc-100 transition-all ${formErrors.isim ? 'border-red-500' : 'border-white/10'}`}
                      value={formData.isim}
                      onChange={e => setFormData({...formData, isim: e.target.value})}
                      placeholder="Örn: Avokado"
                    />
                  </div>
                  <button 
                    onClick={handleAiFill}
                    disabled={isFilling}
                    className="bg-emerald-500 text-black p-4 rounded-2xl hover:bg-emerald-400 transition-all disabled:opacity-50 h-[60px] flex items-center gap-2 px-6 shadow-[0_0_20px_rgba(16,185,129,0.3)]"
                    title="AI ile Doldur"
                  >
                    {isFilling ? <Loader2 className="animate-spin" size={20} /> : <Brain size={20} />}
                    <span className="text-[0.85rem] font-black uppercase tracking-widest">AI</span>
                  </button>
                </div>
                {formErrors.isim && <p className="text-red-400 text-[0.75rem] mt-[-12px] font-medium ml-1">{formErrors.isim}</p>}

                <div>
                  <label className="text-[0.7rem] font-black uppercase text-zinc-500 mb-2 block tracking-[0.2em] ml-1">Kategori</label>
                  <div className="relative">
                    <select 
                      className={`w-full border rounded-2xl px-5 py-4 outline-none focus:border-emerald-500/50 appearance-none transition-all ${darkMode ? 'bg-white/5 border-white/10 text-zinc-100 [&>option]:bg-zinc-900 [&>option]:text-white' : 'bg-black/5 border-black/10 text-zinc-900 [&>option]:bg-white [&>option]:text-black'}`}
                      value={formData.kat}
                      onChange={e => setFormData({...formData, kat: e.target.value})}
                    >
                      {['Tahıllar', 'Meyveler', 'Sebzeler', 'İçecekler', 'Süt ürünleri', 'Baklagiller', 'Türk yemekleri', 'Alkol'].map(c => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                    <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none opacity-50">
                      <ChevronRight size={16} className="rotate-90" />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[0.7rem] font-black uppercase text-zinc-500 mb-2 block tracking-[0.2em] ml-1">Glisemik İndeks (GI)</label>
                    <input 
                      type="number" 
                      className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 outline-none focus:border-emerald-500/50 text-zinc-100"
                      value={formData.gi}
                      onChange={e => setFormData({...formData, gi: Number(e.target.value)})}
                    />
                  </div>
                  <div>
                    <label className="text-[0.7rem] font-black uppercase text-zinc-500 mb-2 block tracking-[0.2em] ml-1">Karbonhidrat (g)</label>
                    <input 
                      type="number" 
                      className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 outline-none focus:border-emerald-500/50 text-zinc-100"
                      value={formData.karb}
                      onChange={e => setFormData({...formData, karb: Number(e.target.value)})}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[0.7rem] font-black uppercase text-zinc-500 mb-2 block tracking-[0.2em] ml-1">Lif (g)</label>
                    <input 
                      type="number" 
                      className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 outline-none focus:border-emerald-500/50 text-zinc-100"
                      value={formData.lif}
                      onChange={e => setFormData({...formData, lif: Number(e.target.value)})}
                    />
                  </div>
                  <div>
                    <label className="text-[0.7rem] font-black uppercase text-zinc-500 mb-2 block tracking-[0.2em] ml-1">Protein (g)</label>
                    <input 
                      type="number" 
                      className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 outline-none focus:border-emerald-500/50 text-zinc-100"
                      value={formData.pro}
                      onChange={e => setFormData({...formData, pro: Number(e.target.value)})}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[0.7rem] font-black uppercase text-zinc-500 mb-2 block tracking-[0.2em] ml-1">Yağ (g)</label>
                    <input 
                      type="number" 
                      className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 outline-none focus:border-emerald-500/50 text-zinc-100"
                      value={formData.yag}
                      onChange={e => setFormData({...formData, yag: Number(e.target.value)})}
                    />
                  </div>
                  <div>
                    <label className="text-[0.7rem] font-black uppercase text-zinc-500 mb-2 block tracking-[0.2em] ml-1">Kalori (kcal)</label>
                    <input 
                      type="number" 
                      className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 outline-none focus:border-emerald-500/50 text-zinc-100"
                      value={formData.kal}
                      onChange={e => setFormData({...formData, kal: Number(e.target.value)})}
                    />
                  </div>
                </div>

                <div className="flex gap-4 pt-6">
                  <button
                    type="button"
                    onClick={() => setIsFormOpen(false)}
                    className="flex-1 py-5 rounded-2xl border border-white/10 text-zinc-500 font-black uppercase tracking-widest hover:bg-white/5 transition-all"
                  >
                    İptal
                  </button>
                  <button
                    onClick={handleSaveFood}
                    className="flex-[2] py-5 rounded-2xl bg-emerald-500 text-black font-black uppercase tracking-widest hover:bg-emerald-400 transition-all shadow-[0_0_30px_rgba(16,185,129,0.4)]"
                  >
                    {editingFood ? 'Güncelle' : 'Kaydet'}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Profile Modal */}
      <AnimatePresence>
        {isVersionHistoryOpen && (
          <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className={`rounded-[3rem] border shadow-2xl overflow-hidden max-w-2xl w-full p-10 max-h-[80vh] flex flex-col ${darkMode ? 'bg-[#0A0A0A] border-white/10' : 'bg-[#F5F5F0] border-black/10'}`}
            >
              <div className="flex items-center justify-between mb-8 shrink-0">
                <div>
                  <h3 className={`text-[2rem] font-black tracking-tighter bg-gradient-to-br bg-clip-text text-transparent ${darkMode ? 'from-white to-zinc-500' : 'from-black to-zinc-600'}`}>Sürüm Notları</h3>
                  <p className="text-zinc-500 text-[0.8rem] font-bold uppercase tracking-widest mt-1">GliSkor Gelişim Günlüğü</p>
                </div>
                <button 
                  onClick={() => setIsVersionHistoryOpen(false)}
                  className={`w-12 h-12 rounded-full border flex items-center justify-center transition-all ${darkMode ? 'bg-white/5 border-white/10 text-zinc-400 hover:bg-white/10' : 'bg-black/5 border-black/10 text-zinc-500 hover:bg-black/10'}`}
                >
                  <X size={24} />
                </button>
              </div>

              <div className="overflow-y-auto pr-4 custom-scrollbar space-y-8">
                {VERSION_HISTORY.map((v, idx) => (
                  <div key={v.version} className={`relative pl-8 border-l-2 ${idx === 0 ? 'border-[#2DFF73]' : 'border-zinc-800'}`}>
                    <div className={`absolute -left-[9px] top-0 w-4 h-4 rounded-full border-2 ${idx === 0 ? 'bg-[#2DFF73] border-[#2DFF73]' : 'bg-zinc-900 border-zinc-800'}`} />
                    <div className="flex items-baseline gap-3 mb-4">
                      <span className={`text-[1.5rem] font-black tracking-tighter ${idx === 0 ? 'text-[#2DFF73]' : 'text-zinc-400'}`}>{v.version}</span>
                      <span className="text-zinc-500 text-[0.7rem] font-bold uppercase tracking-widest">{v.date}</span>
                      {idx === 0 && (
                        <span className="bg-[#2DFF73]/10 text-[#2DFF73] text-[0.6rem] px-2 py-0.5 rounded-full font-black uppercase tracking-widest">Güncel</span>
                      )}
                    </div>
                    <ul className="space-y-3">
                      {v.changes.map((change, i) => (
                        <li key={i} className="flex gap-3 text-[0.9rem] text-zinc-400 leading-relaxed">
                          <span className="text-[#2DFF73] mt-1.5 shrink-0">•</span>
                          <span>{change}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>

              <div className="mt-8 pt-8 border-t border-white/5 shrink-0">
                <button 
                  onClick={() => setIsVersionHistoryOpen(false)}
                  className="w-full bg-white/5 hover:bg-white/10 text-white py-4 rounded-2xl font-bold transition-all"
                >
                  Kapat
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {isProfileOpen && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className={`rounded-[2.5rem] sm:rounded-[3rem] border shadow-2xl overflow-y-auto custom-scrollbar max-w-lg w-full p-6 sm:p-10 max-h-[90vh] ${darkMode ? 'bg-[#0A0A0A] border-white/10' : 'bg-[#F5F5F0] border-black/10'}`}
            >
              <div className="flex items-center justify-between mb-6 sm:mb-10">
                <h3 className={`text-[1.5rem] sm:text-[2rem] font-black tracking-tighter bg-gradient-to-br bg-clip-text text-transparent ${darkMode ? 'from-white to-zinc-500' : 'from-black to-zinc-600'}`}>Profilim</h3>
                <button 
                  onClick={() => setIsProfileOpen(false)}
                  className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full border flex items-center justify-center transition-all ${darkMode ? 'bg-white/5 border-white/10 text-zinc-400 hover:bg-white/10' : 'bg-black/5 border-black/10 text-zinc-500 hover:bg-black/10'}`}
                >
                  <X size={20} className="sm:w-6 sm:h-6" />
                </button>
              </div>

              <div className="space-y-8">
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[0.7rem] font-black text-zinc-500 uppercase tracking-widest ml-1">Yaş</label>
                    <input 
                      type="number" 
                      value={userProfile.age || ''} 
                      onChange={(e) => setUserProfile({ ...userProfile, age: e.target.value })}
                      className={`w-full border rounded-2xl px-5 py-4 focus:outline-none focus:ring-2 focus:ring-[#2DFF73]/20 transition-all ${darkMode ? 'bg-white/5 border-white/10 text-white placeholder-zinc-600' : 'bg-black/5 border-black/10 text-black placeholder-zinc-400'}`}
                      placeholder="Yaşınız"
                    />
                  </div>
                  <div className="space-y-2 relative">
                    <label className="text-[0.7rem] font-black text-zinc-500 uppercase tracking-widest ml-1">Cinsiyet</label>
                    <div className="relative">
                      <select 
                        value={userProfile.gender}
                        onChange={(e) => setUserProfile({ ...userProfile, gender: e.target.value })}
                        className={`w-full border rounded-2xl px-5 py-4 focus:outline-none focus:ring-2 focus:ring-[#2DFF73]/20 transition-all appearance-none ${darkMode ? 'bg-white/5 border-white/10 text-white [&>option]:bg-zinc-900 [&>option]:text-white' : 'bg-black/5 border-black/10 text-black [&>option]:bg-white [&>option]:text-black'}`}
                      >
                        <option value="Belirtilmemiş">Belirtilmemiş</option>
                        <option value="Erkek">Erkek</option>
                        <option value="Kadın">Kadın</option>
                      </select>
                      <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none opacity-50">
                        <ChevronRight size={16} className="rotate-90" />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[0.7rem] font-black text-zinc-500 uppercase tracking-widest ml-1">Kilo (kg)</label>
                    <input 
                      type="number" 
                      value={userProfile.weight || ''} 
                      onChange={(e) => setUserProfile({ ...userProfile, weight: e.target.value })}
                      className={`w-full border rounded-2xl px-5 py-4 focus:outline-none focus:ring-2 focus:ring-[#2DFF73]/20 transition-all ${darkMode ? 'bg-white/5 border-white/10 text-white placeholder-zinc-600' : 'bg-black/5 border-black/10 text-black placeholder-zinc-400'}`}
                      placeholder="Kilonuz"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[0.7rem] font-black text-zinc-500 uppercase tracking-widest ml-1">Boy (cm)</label>
                    <input 
                      type="number" 
                      value={userProfile.height || ''} 
                      onChange={(e) => setUserProfile({ ...userProfile, height: e.target.value })}
                      className={`w-full border rounded-2xl px-5 py-4 focus:outline-none focus:ring-2 focus:ring-[#2DFF73]/20 transition-all ${darkMode ? 'bg-white/5 border-white/10 text-white placeholder-zinc-600' : 'bg-black/5 border-black/10 text-black placeholder-zinc-400'}`}
                      placeholder="Boyunuz"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[0.7rem] font-black text-zinc-500 uppercase tracking-widest ml-1">Aktivite Seviyesi</label>
                    <div className="relative">
                      <select 
                        value={userProfile.activityLevel}
                        onChange={(e) => setUserProfile({ ...userProfile, activityLevel: e.target.value })}
                        className={`w-full border rounded-2xl px-5 py-4 focus:outline-none focus:ring-2 focus:ring-[#2DFF73]/20 transition-all appearance-none ${darkMode ? 'bg-white/5 border-white/10 text-white [&>option]:bg-zinc-900 [&>option]:text-white' : 'bg-black/5 border-black/10 text-black [&>option]:bg-white [&>option]:text-black'}`}
                      >
                        <option value="Sedanter">Sedanter (Hareketsiz)</option>
                        <option value="Hafif Aktif">Hafif Aktif</option>
                        <option value="Orta Derece">Orta Derece</option>
                        <option value="Aktif">Aktif</option>
                        <option value="Çok Aktif">Çok Aktif</option>
                      </select>
                      <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none opacity-50">
                        <ChevronRight size={16} className="rotate-90" />
                      </div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[0.7rem] font-black text-zinc-500 uppercase tracking-widest ml-1">Hedef</label>
                    <div className="relative">
                      <select 
                        value={userProfile.goal}
                        onChange={(e) => setUserProfile({ ...userProfile, goal: e.target.value })}
                        className={`w-full border rounded-2xl px-5 py-4 focus:outline-none focus:ring-2 focus:ring-[#2DFF73]/20 transition-all appearance-none ${darkMode ? 'bg-white/5 border-white/10 text-white [&>option]:bg-zinc-900 [&>option]:text-white' : 'bg-black/5 border-black/10 text-black [&>option]:bg-white [&>option]:text-black'}`}
                      >
                        <option value="Sağlıklı Yaşam">Sağlıklı Yaşam</option>
                        <option value="Kilo Verme">Kilo Verme</option>
                        <option value="Kas Kazanımı">Kas Kazanımı</option>
                        <option value="Kilo Koruma">Kilo Koruma</option>
                      </select>
                      <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none opacity-50">
                        <ChevronRight size={16} className="rotate-90" />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[0.7rem] font-black text-zinc-500 uppercase tracking-widest ml-1">HbA1c (%)</label>
                    <input 
                      type="number" 
                      step="0.1"
                      value={userProfile.hba1c || ''} 
                      onChange={(e) => setUserProfile({ ...userProfile, hba1c: e.target.value })}
                      className={`w-full border rounded-2xl px-5 py-4 focus:outline-none focus:ring-2 focus:ring-[#2DFF73]/20 transition-all ${darkMode ? 'bg-white/5 border-white/10 text-white placeholder-zinc-600' : 'bg-black/5 border-black/10 text-black placeholder-zinc-400'}`}
                      placeholder="HbA1c"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[0.7rem] font-black text-zinc-500 uppercase tracking-widest ml-1">İnsülin Direnci</label>
                    <div className="relative">
                      <select 
                        value={userProfile.insulinResistance}
                        onChange={(e) => setUserProfile({ ...userProfile, insulinResistance: e.target.value })}
                        className={`w-full border rounded-2xl px-5 py-4 focus:outline-none focus:ring-2 focus:ring-[#2DFF73]/20 transition-all appearance-none ${darkMode ? 'bg-white/5 border-white/10 text-white [&>option]:bg-zinc-900 [&>option]:text-white' : 'bg-black/5 border-black/10 text-black [&>option]:bg-white [&>option]:text-black'}`}
                      >
                        <option value="Yok">Yok</option>
                        <option value="Düşük">Düşük</option>
                        <option value="Orta">Orta</option>
                        <option value="Yüksek">Yüksek</option>
                      </select>
                      <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none opacity-50">
                        <ChevronRight size={16} className="rotate-90" />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-4 space-y-4">
                  <button 
                    onClick={() => {
                      if (window.confirm("Tüm kişiselleştirilmiş veriler silinecek ve varsayılan veritabanına dönülecek. Onaylıyor musunuz?")) {
                        setFoodList(foods);
                        localStorage.removeItem('gliskor_foods');
                        setIsProfileOpen(false);
                      }
                    }}
                    className={`w-full py-4 rounded-2xl border flex items-center justify-center gap-3 transition-all ${darkMode ? 'bg-red-500/10 border-red-500/20 text-red-400 hover:bg-red-500/20' : 'bg-red-50 border-red-100 text-red-600 hover:bg-red-100'}`}
                  >
                    <Trash2 size={18} />
                    <span className="font-bold">Veritabanını Sıfırla</span>
                  </button>

                  <button 
                    onClick={syncDatabaseWithAi}
                    disabled={isSyncing}
                    className={`w-full py-4 rounded-2xl border flex items-center justify-center gap-3 transition-all ${isSyncing ? 'bg-zinc-800 border-zinc-700 text-zinc-500 cursor-not-allowed' : 'bg-blue-500/10 border-blue-500/20 text-blue-400 hover:bg-blue-500/20 shadow-lg shadow-blue-500/5'}`}
                  >
                    {isSyncing ? (
                      <>
                        <Loader2 size={18} className="animate-spin" />
                        <span>Senkronize Ediliyor... ({syncProgress.current}/{syncProgress.total})</span>
                      </>
                    ) : (
                      <>
                        <Sparkles size={18} />
                        <span className="font-bold">Veritabanını AI ile Güncelle</span>
                      </>
                    )}
                  </button>

                  <button 
                    onClick={() => setIsProfileOpen(false)}
                    className="w-full bg-[#2DFF73] text-black py-5 rounded-2xl font-black text-[0.9rem] uppercase tracking-widest hover:scale-[1.02] active:scale-[0.98] transition-all shadow-[0_10px_30px_rgba(45,255,115,0.2)]"
                  >
                    Profili Güncelle
                  </button>

                  <div className={`flex items-center justify-center gap-2 text-[0.6rem] font-bold tracking-[0.05em] uppercase mt-6 transition-colors ${darkMode ? 'text-[#2DFF73]/60' : 'text-emerald-700/60'}`}>
                    <span className="opacity-60">Engineered by</span>
                    <span className="font-black tracking-widest">Mgv</span>
                    <span className="mx-1 opacity-20">|</span>
                    <span className="opacity-60">Powered by</span>
                    <span className="font-black tracking-widest">Google AI Studio</span>
                    <span className="mx-1 opacity-20">|</span>
                    <button 
                      onClick={() => {
                        setIsProfileOpen(false);
                        setIsVersionHistoryOpen(true);
                      }}
                      className="opacity-40 font-mono hover:opacity-100 hover:text-[#2DFF73] transition-all cursor-help"
                    >
                      {CURRENT_VERSION}
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Plate Analysis Modal */}
      <AnimatePresence>
        {isPlateAnalysisOpen && (
          <div className="fixed inset-0 z-[250] flex items-center justify-center p-4 bg-black/90 backdrop-blur-2xl">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 40 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 40 }}
              className={`rounded-[3rem] border shadow-2xl overflow-hidden max-w-3xl w-full flex flex-col max-h-[90vh] ${darkMode ? 'bg-[#0A0A0A] border-white/10' : 'bg-[#F5F5F0] border-black/10'}`}
            >
              <div className={`p-8 sm:p-10 border-b flex items-center justify-between ${darkMode ? 'border-white/5' : 'border-black/5'}`}>
                <div>
                  <h3 className={`text-[1.8rem] sm:text-[2.2rem] font-black tracking-tighter bg-gradient-to-br bg-clip-text text-transparent ${darkMode ? 'from-white to-zinc-500' : 'from-black to-zinc-600'}`}>Tabak Analizi</h3>
                  <p className="text-zinc-500 text-[0.8rem] font-medium mt-1">AI tarafından tanımlanan besinler ve metabolik etkileri</p>
                </div>
                <button 
                  onClick={() => {
                    setIsPlateAnalysisOpen(false);
                    setPlateAnalysisResult(null);
                  }}
                  className={`w-12 h-12 rounded-full border flex items-center justify-center transition-all ${darkMode ? 'bg-white/5 border-white/10 text-zinc-400 hover:bg-white/10' : 'bg-black/5 border-black/10 text-zinc-500 hover:bg-black/10'}`}
                >
                  <X size={24} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-8 sm:p-10 space-y-10 custom-scrollbar">
                {isPlateAnalysisLoading ? (
                  <div className="py-20 flex flex-col items-center justify-center text-center">
                    <div className="relative w-24 h-24 mb-8">
                      <motion.div 
                        animate={{ rotate: 360 }}
                        transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                        className="absolute inset-0 border-4 border-t-[#2DFF73] border-r-transparent border-b-transparent border-l-transparent rounded-full"
                      />
                      <div className="absolute inset-4 rounded-full bg-[#2DFF73]/10 flex items-center justify-center">
                        <Brain className="text-[#2DFF73] animate-pulse" size={32} />
                      </div>
                    </div>
                    <h4 className={`text-[1.4rem] font-black mb-2 ${darkMode ? 'text-white' : 'text-black'}`}>Tabak Analiz Ediliyor...</h4>
                    <p className="text-zinc-500 max-w-xs mx-auto text-[0.9rem]">AI besinleri tanımlıyor ve metabolik yüklerini hesaplıyor. Lütfen bekleyin.</p>
                  </div>
                ) : plateAnalysisResult ? (
                  <>
                    {/* Top Decision Banner */}
                    {plateAnalysisResult.overallDecision && (
                      <div className={`p-5 rounded-2xl border flex flex-wrap items-center justify-between gap-3 ${
                        plateAnalysisResult.overallDecision.includes('ÇOK İYİ') || plateAnalysisResult.overallDecision.includes('İYİ SEÇİM')
                          ? (darkMode ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300' : 'bg-emerald-50 border-emerald-200 text-emerald-900')
                          : plateAnalysisResult.overallDecision.includes('ÖLÇÜLÜ')
                          ? (darkMode ? 'bg-amber-500/15 border-amber-500/30 text-amber-300' : 'bg-amber-50 border-amber-200 text-amber-900')
                          : (darkMode ? 'bg-rose-500/15 border-rose-500/30 text-rose-300' : 'bg-rose-50 border-rose-200 text-rose-900')
                      }`}>
                        <div className="flex items-center gap-2">
                          <Sparkles size={18} className="text-[#2DFF73]" />
                          <span className="text-xs font-black uppercase tracking-wider">Nutrition AI Tabağın Kararı:</span>
                        </div>
                        <span className="text-sm font-black underline underline-offset-4 decoration-2">
                          {plateAnalysisResult.overallDecision}
                        </span>
                      </div>
                    )}

                    {/* Summary Stats */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div className={`p-4 rounded-2xl border ${darkMode ? 'bg-white/5 border-white/5' : 'bg-black/5 border-black/5'}`}>
                        <div className="text-[0.6rem] font-black text-zinc-500 uppercase tracking-widest mb-1">Toplam Kalori</div>
                        <div className="flex items-baseline gap-1">
                          <span className={`text-2xl font-black ${darkMode ? 'text-white' : 'text-black'}`}>{plateAnalysisResult.totalCalories}</span>
                          <span className="text-xs font-bold text-zinc-500">kcal</span>
                        </div>
                      </div>
                      <div className={`p-4 rounded-2xl border ${darkMode ? 'bg-white/5 border-white/5' : 'bg-black/5 border-black/5'}`}>
                        <div className="text-[0.6rem] font-black text-zinc-500 uppercase tracking-widest mb-1">Kalite Skoru</div>
                        <div className="flex items-baseline gap-1">
                          <span className="text-2xl font-black text-[#2DFF73]">{plateAnalysisResult.overallMetabolicScore}</span>
                          <span className="text-xs font-bold text-zinc-500">/10</span>
                        </div>
                      </div>
                      <div className={`p-4 rounded-2xl border ${darkMode ? 'bg-white/5 border-white/5' : 'bg-black/5 border-black/5'}`}>
                        <div className="text-[0.6rem] font-black text-zinc-500 uppercase tracking-widest mb-1">Protein / Karb</div>
                        <div className="text-sm font-black mt-1 text-emerald-400">
                          {plateAnalysisResult.totalProtein || 0}g <span className="text-zinc-500 font-normal">/ {plateAnalysisResult.totalCarbs || 0}g</span>
                        </div>
                      </div>
                      <div className={`p-4 rounded-2xl border ${darkMode ? 'bg-white/5 border-white/5' : 'bg-black/5 border-black/5'}`}>
                        <div className="text-[0.6rem] font-black text-zinc-500 uppercase tracking-widest mb-1">Yağ / Lif</div>
                        <div className="text-sm font-black mt-1 text-amber-400">
                          {plateAnalysisResult.totalFat || 0}g <span className="text-zinc-500 font-normal">/ {plateAnalysisResult.totalFiber || 0}g</span>
                        </div>
                      </div>
                    </div>

                    {/* Identified Foods */}
                    <div className="space-y-4">
                      <h4 className="text-[0.75rem] font-black text-zinc-500 uppercase tracking-[0.2em] ml-2">Tanımlanan Besinler ve Değerlendirmeler</h4>
                      <div className="grid gap-3">
                        {plateAnalysisResult.identifiedFoods.map((food, i) => (
                          <div 
                            key={i}
                            className={`p-5 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 group transition-all ${darkMode ? 'bg-white/[0.02] border-white/5 hover:bg-white/[0.04]' : 'bg-black/[0.02] border-black/5 hover:bg-black/[0.04]'}`}
                          >
                            <div className="flex items-start gap-4">
                              <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-black text-base shrink-0 ${food.score >= 8 ? 'bg-emerald-500/10 text-emerald-400' : food.score >= 5 ? 'bg-orange-500/10 text-orange-400' : 'bg-red-500/10 text-red-400'}`}>
                                {food.score}
                              </div>
                              <div>
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className={`font-black text-base tracking-tight ${darkMode ? 'text-white' : 'text-black'}`}>{food.name}</span>
                                  {food.decision && (
                                    <span className="text-[0.65rem] px-2 py-0.5 rounded-md font-bold bg-white/10 dark:bg-white/10 border border-white/10">
                                      {food.decision}
                                    </span>
                                  )}
                                </div>
                                <div className="text-[0.7rem] font-bold text-zinc-400 uppercase tracking-wider mt-0.5">
                                  {food.portion} • {food.estimatedCalories} kcal
                                </div>
                                <p className="text-xs text-zinc-400 mt-1.5 leading-relaxed italic">"{food.reason}"</p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Öğün Dengesi & Eksik Besinler */}
                    {(plateAnalysisResult.mealBalanceAnalysis || (plateAnalysisResult.missingNutrients && plateAnalysisResult.missingNutrients.length > 0)) && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {plateAnalysisResult.mealBalanceAnalysis && (
                          <div className={`p-5 rounded-2xl border ${darkMode ? 'bg-white/5 border-white/5' : 'bg-black/5 border-black/5'}`}>
                            <div className="text-[0.7rem] font-black uppercase tracking-wider text-emerald-400 mb-2">Öğün Dengesi Analizi</div>
                            <p className="text-xs leading-relaxed text-zinc-300">{plateAnalysisResult.mealBalanceAnalysis}</p>
                          </div>
                        )}
                        {plateAnalysisResult.missingNutrients && plateAnalysisResult.missingNutrients.length > 0 && (
                          <div className={`p-5 rounded-2xl border ${darkMode ? 'bg-amber-950/15 border-amber-500/20' : 'bg-amber-50 border-amber-200'}`}>
                            <div className="text-[0.7rem] font-black uppercase tracking-wider text-amber-500 mb-2">Eksik / Geliştirilebilir Öğeler</div>
                            <ul className="space-y-1">
                              {plateAnalysisResult.missingNutrients.map((mis, idx) => (
                                <li key={idx} className="text-xs text-zinc-300 flex items-center gap-1.5">
                                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                                  <span>{mis}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Daha İyi Kombinasyon & Alternatif */}
                    {(plateAnalysisResult.betterCombination || plateAnalysisResult.alternativeSuggestion) && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {plateAnalysisResult.betterCombination && (
                          <div className={`p-5 rounded-2xl border ${darkMode ? 'bg-white/5 border-white/5' : 'bg-black/5 border-black/5'}`}>
                            <div className="text-[0.7rem] font-black uppercase tracking-wider text-blue-400 mb-2">Daha İyi Kombinasyon</div>
                            <p className="text-xs leading-relaxed text-zinc-300">{plateAnalysisResult.betterCombination}</p>
                          </div>
                        )}
                        {plateAnalysisResult.alternativeSuggestion && (
                          <div className={`p-5 rounded-2xl border ${darkMode ? 'bg-white/5 border-white/5' : 'bg-black/5 border-black/5'}`}>
                            <div className="text-[0.7rem] font-black uppercase tracking-wider text-purple-400 mb-2">Besleyici Alternatif</div>
                            <p className="text-xs leading-relaxed text-zinc-300">{plateAnalysisResult.alternativeSuggestion}</p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* General Advice */}
                    <div className={`p-6 rounded-2xl border ${darkMode ? 'bg-white/5 border-white/5' : 'bg-black/5 border-black/5'}`}>
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-8 h-8 rounded-full bg-[#2DFF73]/10 flex items-center justify-center text-[#2DFF73]">
                          <Lightbulb size={18} />
                        </div>
                        <span className="text-[0.75rem] font-black uppercase tracking-widest">Nutrition AI Sonuç Değerlendirmesi</span>
                      </div>
                      <p className={`text-sm leading-relaxed font-medium ${darkMode ? 'text-zinc-300' : 'text-zinc-700'}`}>
                        {plateAnalysisResult.generalAdvice}
                      </p>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-4">
                      <button 
                        onClick={() => {
                          setIsPlateAnalysisOpen(false);
                          setPlateAnalysisResult(null);
                        }}
                        className={`flex-1 py-5 rounded-[2rem] font-black uppercase tracking-[0.2em] text-[0.8rem] transition-all border ${darkMode ? 'bg-white/5 border-white/10 text-white hover:bg-white/10' : 'bg-black/5 border-black/10 text-black hover:bg-black/10'}`}
                      >
                        Kapat
                      </button>
                      <button 
                        onClick={() => {
                          // Add all identified foods to daily log
                          plateAnalysisResult.identifiedFoods.forEach(food => {
                            const mockFood: Food = {
                              isim: food.name,
                              kat: 'Diğer',
                              gi: 50, // Mock values for identified foods
                              karb: 20,
                              lif: 2,
                              pro: 5,
                              yag: 5,
                              kal: food.estimatedCalories,
                              score: food.score
                            };
                            addToLog(mockFood, 100, 'Atıştırmalık', food.score);
                          });
                          setIsPlateAnalysisOpen(false);
                          setPlateAnalysisResult(null);
                        }}
                        className="flex-1 py-5 rounded-[2rem] bg-[#2DFF73] text-black font-black uppercase tracking-[0.2em] text-[0.8rem] hover:scale-[1.02] active:scale-[0.98] transition-all shadow-[0_10px_30px_rgba(45,255,115,0.2)]"
                      >
                        Tümünü Günlüğe Ekle
                      </button>
                    </div>
                  </>
                ) : null}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Daily Log Modal */}
      <AnimatePresence>
        {isTrackingOpen && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl">
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className={`rounded-3xl border shadow-2xl overflow-hidden max-w-2xl w-full flex flex-col max-h-[85vh] ${darkMode ? 'bg-[#0A0A0A] border-white/5' : 'bg-white border-black/5'}`}
            >
              <div className={`p-8 border-b flex items-center justify-between ${darkMode ? 'border-white/5' : 'border-black/5'}`}>
                <div>
                  <h3 className="text-2xl font-black tracking-tight">Günlük Takip</h3>
                  <p className="text-zinc-500 text-[0.75rem] font-medium mt-1">Bugünkü metabolik seyir özeti</p>
                </div>
                <button 
                  onClick={() => setIsTrackingOpen(false)}
                  className={`w-10 h-10 rounded-xl border flex items-center justify-center transition-all ${darkMode ? 'bg-white/5 border-white/5 text-zinc-400' : 'bg-black/5 border-black/5 text-zinc-500'}`}
                >
                  <X size={20} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    { label: 'Skor', value: dailyMetabolicPerformance, unit: '/100', color: 'text-[#2DFF73]' },
                    { label: 'GY', value: Math.round(dailyTotals.gl), unit: '', color: 'text-zinc-400' },
                    { label: 'Kcal', value: Math.round(dailyTotals.calories), unit: '', color: 'text-zinc-400' },
                    { label: 'Karb', value: Math.round(dailyTotals.carbs), unit: 'g', color: 'text-zinc-400' }
                  ].map((stat, i) => (
                    <div key={i} className={`p-4 rounded-xl border ${darkMode ? 'bg-white/5 border-white/5' : 'bg-zinc-50 border-black/5'}`}>
                      <div className="text-[0.55rem] font-bold text-zinc-500 uppercase tracking-widest mb-1">{stat.label}</div>
                      <div className="flex items-baseline gap-1">
                        <span className={`text-[1.2rem] font-black ${stat.color}`}>{stat.value}</span>
                        <span className="text-[0.6rem] font-medium text-zinc-500">{stat.unit}</span>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="space-y-4">
                  <h4 className="text-[0.65rem] font-bold text-zinc-500 uppercase tracking-widest ml-1">Kayıtlar</h4>
                  {dailyLog.length === 0 ? (
                    <div className="py-12 text-center text-zinc-500 text-[0.8rem] font-medium uppercase tracking-widest">Kayıt bulunamadı</div>
                  ) : (
                    <div className="space-y-3">
                      {dailyLog.map((entry) => (
                        <div 
                          key={entry.id}
                          className={`p-4 rounded-xl border flex items-center justify-between ${darkMode ? 'bg-white/5 border-white/5' : 'bg-white border-black/5'}`}
                        >
                          <div className="flex items-center gap-4">
                            <div className="text-[0.65rem] font-bold text-zinc-500 opacity-50 font-mono">
                              {new Date(entry.timestamp).getHours()}:{new Date(entry.timestamp).getMinutes().toString().padStart(2, '0')}
                            </div>
                            <div>
                              <div className="font-bold text-[0.95rem]">{entry.food.isim}</div>
                              <div className="text-[0.65rem] text-zinc-500 uppercase tracking-widest">
                                {entry.amount}g • {entry.mealType} • {Math.round((entry.food.gi * (entry.food.karb * entry.amount / 100)) / 100)} GY
                              </div>
                            </div>
                          </div>
                          <button onClick={() => removeFromLog(entry.id)} className="p-2 hover:bg-red-500/10 text-zinc-500 hover:text-red-400 rounded-lg transition-all">
                            <Trash2 size={16} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Metabolic Advice */}
                {dailyLog.length > 0 && (
                  <div className={`p-6 rounded-2xl border ${dailyMetabolicPerformance > 80 ? 'border-emerald-500/20 bg-emerald-500/5' : dailyMetabolicPerformance > 60 ? 'border-orange-500/20 bg-orange-500/5' : 'border-red-500/20 bg-red-500/5'}`}>
                    <div className="flex items-center gap-3 mb-3">
                      <Lightbulb size={20} />
                      <span className="text-[0.7rem] font-bold uppercase tracking-widest">Metabolik Durum</span>
                    </div>
                    <p className={`text-[0.85rem] leading-relaxed font-medium ${darkMode ? 'text-zinc-400' : 'text-zinc-600'}`}>
                      {dailyMetabolicPerformance > 80 
                        ? "Harika! Bugün metabolik yükün oldukça düşük."
                        : dailyMetabolicPerformance > 60
                        ? "Metabolik yükün sınırda. Lif ve protein miktarını artırabilirsin."
                        : "Bugün glikoz yükün yüksek. Hareket etmeye çalışmalısın."}
                    </p>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {isHistoryOpen && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className={`rounded-[3rem] border shadow-2xl overflow-hidden max-w-2xl w-full flex flex-col max-h-[85vh] ${darkMode ? 'bg-[#0A0A0A] border-white/10' : 'bg-[#F5F5F0] border-black/10'}`}
            >
              <div className={`p-10 border-b flex items-center justify-between ${darkMode ? 'border-white/5' : 'border-black/5'}`}>
                <div>
                  <h3 className={`text-[2rem] font-black tracking-tighter bg-gradient-to-br bg-clip-text text-transparent ${darkMode ? 'from-white to-zinc-500' : 'from-black to-zinc-600'}`}>Analiz Geçmişi</h3>
                  <p className="text-zinc-500 text-[0.8rem] font-medium mt-1">Son yaptığınız AI analizleri</p>
                </div>
                <div className="flex items-center gap-4">
                  <button 
                    onClick={() => setHistory([])}
                    className="text-[0.7rem] font-black uppercase tracking-widest text-zinc-500 hover:text-red-400 transition-colors"
                  >
                    Temizle
                  </button>
                  <button 
                    onClick={() => setIsHistoryOpen(false)}
                    className={`w-12 h-12 rounded-full border flex items-center justify-center transition-all ${darkMode ? 'bg-white/5 border-white/10 text-zinc-400 hover:bg-white/10' : 'bg-black/5 border-black/10 text-zinc-500 hover:bg-black/10'}`}
                  >
                    <X size={24} />
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-10 space-y-6 custom-scrollbar">
                {history.length === 0 ? (
                  <div className="py-20 text-center">
                    <div className={`w-20 h-20 rounded-full border flex items-center justify-center mx-auto mb-6 ${darkMode ? 'bg-white/5 border-white/10' : 'bg-black/5 border-black/10'}`}>
                      <History size={32} className="text-zinc-600" />
                    </div>
                    <p className="text-zinc-500 font-medium">Henüz bir analiz geçmişiniz yok.</p>
                  </div>
                ) : (
                  [...history].reverse().map((item, i) => (
                    <div 
                      key={i} 
                      className={`rounded-[2rem] p-6 border transition-all group cursor-pointer ${darkMode ? 'glass border-white/5 hover:border-white/20' : 'light-glass border-black/5 hover:border-black/10 shadow-md'}`}
                      onClick={() => {
                        setAiResult(item);
                        setIsHistoryOpen(false);
                      }}
                    >
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-2xl bg-[#2DFF73]/10 flex items-center justify-center text-[#2DFF73] font-black text-[1.1rem]">
                            {item.score}
                          </div>
                          <div>
                            <h4 className={`font-black text-[1.2rem] tracking-tight group-hover:text-[#2DFF73] transition-colors ${darkMode ? 'text-white' : 'text-black'}`}>{item.foodName}</h4>
                            <p className="text-zinc-500 text-[0.7rem] font-black uppercase tracking-widest mt-0.5">Skor: {item.score}/10</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className={`font-black text-[0.9rem] ${darkMode ? 'text-zinc-400' : 'text-zinc-500'}`}>GY: {item.gy}</div>
                          <div className="text-zinc-600 text-[0.65rem] font-black uppercase tracking-widest mt-1">GI: {item.gi}</div>
                        </div>
                      </div>
                      <p className={`text-[0.8rem] line-clamp-2 leading-relaxed opacity-70 group-hover:opacity-100 transition-opacity ${darkMode ? 'text-zinc-400' : 'text-zinc-500'}`}>
                        {item.suggestion || item.citizenAnalysis?.aiNote || "Metabolik analiz sonucu"}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Plate Builder Floating Panel */}
      <div className="fixed bottom-24 lg:bottom-8 right-6 z-[150]">
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setIsPlateOpen(!isPlateOpen)}
          className="w-16 h-16 rounded-full bg-[#2DFF73] text-black flex items-center justify-center shadow-xl shadow-[#2DFF73]/20 relative"
        >
          <Utensils size={28} />
          {plate.length > 0 && (
            <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-black text-white text-[0.7rem] font-bold flex items-center justify-center border-2 border-[#2DFF73]">
              {plate.length}
            </div>
          )}
        </motion.button>

        <AnimatePresence>
          {isPlateOpen && (
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              className={`absolute bottom-20 right-0 w-[calc(100vw-3rem)] md:w-[350px] rounded-3xl border shadow-2xl flex flex-col overflow-hidden ${darkMode ? 'bg-[#0A0A0A] border-white/5' : 'bg-white border-black/5'}`}
            >
              <div className={`p-6 border-b flex justify-between items-center ${darkMode ? 'bg-white/5' : 'bg-zinc-50'}`}>
                <h3 className="text-xl font-black tracking-tight">Tabağım</h3>
                <div className="flex items-center gap-2">
                  <button onClick={() => setPlate([])} className="text-[0.6rem] font-bold text-zinc-500 uppercase">Temizle</button>
                  <button onClick={() => setIsPlateOpen(false)} className="p-1.5 opacity-50 hover:opacity-100 transition-opacity">
                    <X size={18} />
                  </button>
                </div>
              </div>

              <div className="p-6 space-y-6">
                {plate.length === 0 ? (
                  <div className="py-8 text-center text-zinc-500 text-[0.8rem] font-medium uppercase tracking-widest">Tabak Boş</div>
                ) : (
                  <>
                    <div className="space-y-2 max-h-[200px] overflow-y-auto custom-scrollbar">
                      {plate.map((p, i) => (
                        <div key={i} className={`flex items-center justify-between p-3 rounded-xl border ${darkMode ? 'bg-white/5 border-white/5' : 'bg-zinc-50 border-black/5'}`}>
                          <div className="flex items-center gap-3">
                            <div className="font-bold text-[0.85rem]">{p.isim}</div>
                            <div className="text-[0.65rem] text-zinc-500">{p.kal} kcal</div>
                          </div>
                          <button onClick={() => removeFromPlate(i)} className="text-zinc-500 hover:text-red-500 transition-colors">
                            <Trash2 size={14} />
                          </button>
                        </div>
                      ))}
                    </div>

                    {plateAnalysis && (
                      <div className={`p-5 rounded-2xl border ${darkMode ? 'bg-[#2DFF73]/5 border-[#2DFF73]/10' : 'bg-zinc-50 border-black/5'}`}>
                        <div className="flex justify-between mb-4">
                          <div className="text-center">
                            <div className="text-[0.5rem] font-bold text-zinc-500 uppercase tracking-widest mb-1">İnsülin</div>
                            <div className="text-[1.2rem] font-black" style={{ color: getRingColor(plateAnalysis.m) }}>{plateAnalysis.m}</div>
                          </div>
                          <div className="text-center">
                            <div className="text-[0.5rem] font-bold text-zinc-500 uppercase tracking-widest mb-1">Metabolizma</div>
                            <div className="text-[1.2rem] font-black" style={{ color: getRingColor(plateAnalysis.n) }}>{plateAnalysis.n}</div>
                          </div>
                        </div>
                        <p className="text-[0.8rem] italic text-zinc-500 leading-relaxed">"{plateAnalysis.verdict}"</p>
                      </div>
                    )}
                  </>
                )}
                <button 
                  onClick={() => setIsPlateOpen(false)}
                  className="w-full py-4 rounded-xl bg-[#2DFF73] text-black font-bold uppercase tracking-widest text-[0.75rem]"
                >
                  Kapat
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
