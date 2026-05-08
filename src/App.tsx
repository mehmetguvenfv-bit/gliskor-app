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

class ErrorBoundary extends (React.Component as any) {
  constructor(props: any) {
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
import { GlucoseCurve } from './components/GlucoseCurve';
import { MacroDistribution } from './components/MacroDistribution';
import { CitizenExpertAnalysis } from './components/CitizenExpertAnalysis';

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
    <div className={`mt-8 p-6 ${darkMode ? 'bg-[#2DFF73]/5 border-[#2DFF73]/20' : 'bg-emerald-50 border-emerald-100'} rounded-[2rem] relative overflow-hidden group/pairing`}>
      <div className="absolute top-0 right-0 w-32 h-32 bg-[#2DFF73]/10 blur-[50px] -mr-16 -mt-16 group-hover/pairing:bg-[#2DFF73]/20 transition-colors" />
      <div className="text-[0.75rem] font-black text-[#2DFF73] uppercase mb-4 flex items-center gap-2 tracking-[0.2em] relative z-10">
        <div className="w-5 h-5 rounded-full bg-[#2DFF73]/20 flex items-center justify-center">
          <Plus size={12} className="text-[#2DFF73]" strokeWidth={4} />
        </div>
        İDEAL EŞLEŞME
      </div>
      <div className="flex gap-4 relative z-10">
        {selected.map(p => (
          <div key={p.name} className={`flex items-center gap-3 ${darkMode ? 'bg-white/5 border-white/10' : 'bg-white border-black/5'} px-4 py-3 rounded-2xl text-[0.85rem] ${darkMode ? 'text-zinc-100' : 'text-zinc-900'} border shadow-xl hover:scale-105 transition-all cursor-default`}>
            <span className="text-xl filter drop-shadow-[0_0_5px_rgba(255,255,255,0.2)]">{p.icon}</span> 
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
      <p className="text-[0.75rem] font-black text-zinc-400 uppercase tracking-[0.2em] flex items-center gap-2">
        <Brain size={16} className="text-blue-400" />
        Eşleşme Seçenekleri (Biyokimyasal Bariyerler)
      </p>
      
      <div className="grid gap-3">
        {barriers.map((b, i) => (
          <div key={i} className={`${darkMode ? 'glass border-white/10' : 'light-glass border-black/10'} rounded-2xl p-4`}>
            <div className="flex items-center gap-3 mb-3">
              <div className={`p-2 rounded-xl border ${darkMode ? 'bg-blue-500/10 border-blue-500/20' : 'bg-blue-500/5 border-blue-500/10'}`}>
                {b.icon}
              </div>
              <span className={`text-[0.8rem] font-black uppercase tracking-widest ${darkMode ? 'text-zinc-100' : 'text-zinc-900'}`}>{b.title}</span>
            </div>
            <ul className="space-y-3">
              {b.suggestions.map((sug, j) => (
                <li key={j} className={`text-[0.9rem] leading-relaxed ${darkMode ? 'text-zinc-300' : 'text-zinc-700'}`}>
                  <div className={`font-bold mb-1 ${darkMode ? 'text-zinc-100' : 'text-zinc-900'}`}>• {sug.text}</div>
                  <div className="text-[0.75rem] text-zinc-500 italic pl-4 border-l-2 border-blue-500/30 ml-1">
                    <span className="font-black not-italic text-blue-400">NEDEN?</span> {sug.why}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      
      <p className="text-[0.7rem] italic text-zinc-500 pt-2">
        * Bu bariyerler, glikozun kana karışma hızını mekanik ve kimyasal olarak yavaşlatır.
      </p>
    </div>
  );
}

const getStatusInfo = (s: number, hour: number = new Date().getHours(), karb: number = 0, lif: number = 0) => {
  const net = Math.max(0, karb - lif);
  const isNight = (hour >= 20 || hour < 6) && net > 10;
  
  if (isNight) {
    return {
      cls: 'bg-red-500/20 text-red-400 border-red-500/30 neon-red',
      dot: 'bg-red-400',
      label: 'KESİNLİKLE YEME',
      sub: 'Gece Karbonhidrat Riski',
      action: 'AVOID',
      color: '#FF4444'
    };
  }
  
  if (s >= 8) return {
    cls: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30 neon-green',
    dot: 'bg-emerald-400',
    label: 'GÜVENLE YE',
    sub: 'Metabolik Dostu',
    action: 'ENJOY',
    color: '#2DFF73'
  };
  
  if (s >= 5) return {
    cls: 'bg-blue-500/20 text-blue-400 border-blue-500/30 neon-blue',
    dot: 'bg-blue-400',
    label: 'ÖLÇÜLÜ YE',
    sub: 'Porsiyon Kontrolü',
    action: 'MODERATION',
    color: '#4DA6FF'
  };
  
  if (s >= 3.5) return {
    cls: 'bg-orange-500/20 text-orange-400 border-orange-500/30 neon-orange',
    dot: 'bg-orange-400',
    label: 'DİKKATLİ OL',
    sub: 'Glikoz Piki Riski',
    action: 'CAUTION',
    color: '#FFA500'
  };
  
  return {
    cls: 'bg-red-500/20 text-red-400 border-red-500/30 neon-red',
    dot: 'bg-red-400',
    label: 'UZAK DUR',
    sub: 'İnsülin Düşmanı',
    action: 'AVOID',
    color: '#FF4444'
  };
};

function getRingColor(s: number) {
  if (s >= 8) return '#2DFF73';
  if (s >= 5) return '#4DA6FF';
  if (s >= 3.5) return '#FFA500';
  return '#FF4444';
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
      color: "text-emerald-400",
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
      color: "text-orange-400",
      bg: "bg-orange-500/10",
      border: "border-orange-500/20",
      icon: <Info size={16} />
    };
  }
  
  if (mScore >= 7 && nScore < 7) {
    return {
      title: "Düşük Kalorili / Boş Kalori",
      text: `${f.isim} kilo aldırmaz ama vücuduna pek bir faydası yok. Yanına mutlaka taze bir salata veya sebze ekleyerek öğünü zenginleştir.`,
      color: "text-blue-400",
      bg: "bg-blue-500/10",
      border: "border-blue-500/20",
      icon: <Zap size={16} />
    };
  }
  
  return {
    title: "Diyet Sürecinde Önerilmez",
    text: `${f.isim} hem metabolizmanı yavaşlatır hem de yağ depolanmasını tetikleyebilir. Kilo verme sürecindeysen bu gıdadan uzak durmanı veya çok nadir tüketmeni öneririm.`,
    color: "text-red-400",
    bg: "bg-red-500/10",
    border: "border-red-500/20",
    icon: <AlertTriangle size={16} />
  };
}

function UnifiedFoodDetail({ food, ctx, profile, darkMode, onAdd, onPlate, onLog, onClose, onEdit, onDelete, isAiResult = false }: { 
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
  isAiResult?: boolean
}) {
  const mScore = calculateMetabolicScore(food, ctx, profile);
  const nScore = calculateNutritionalScore(food);
  const gy = calculateGY(food, ctx);
  const status = getStatusInfo(mScore, ctx.hour, food.karb, food.lif);
  const dietitian = getDietitianNote(mScore, nScore, food);
  const hackerAdvice = getHackerAdvice(food, mScore, darkMode);

  return (
    <div className={`rounded-[2.5rem] sm:rounded-[3.5rem] w-full max-w-5xl relative max-h-[92vh] overflow-hidden border shadow-2xl flex flex-col ${darkMode ? 'bg-[#080808] text-white border-white/10' : 'bg-[#FAFAF9] text-black border-black/10'}`}>
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: `radial-gradient(${darkMode ? '#fff' : '#000'} 1px, transparent 0)`, backgroundSize: '32px 32px' }} />
      
      {/* Header Controls */}
      <div className={`sticky top-0 z-50 p-6 xs:p-8 border-b backdrop-blur-2xl ${darkMode ? 'bg-[#080808]/80 border-white/5' : 'bg-[#FAFAF9]/80 border-black/5'}`}>
        <div className="flex flex-col md:flex-row justify-between items-center gap-6">
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className={`flex-1 w-full p-4 xs:p-5 rounded-3xl border-2 flex items-center gap-4 xs:gap-6 shadow-xl ${status.cls}`}
          >
            <div className="relative shrink-0">
              <div className={`w-10 h-10 rounded-full ${status.dot} flex items-center justify-center shadow-inner`}>
                <Activity size={20} className="text-black/40" />
              </div>
              <div className={`absolute inset-0 w-10 h-10 rounded-full animate-ping opacity-20 ${status.dot}`} />
            </div>
            <div className="flex flex-col min-w-0">
              <div className="text-[0.55rem] font-black uppercase tracking-[0.3em] opacity-60 truncate">SİSTEM ANALİZİ / {status.action}</div>
              <div className="text-[1.1rem] xs:text-[1.3rem] font-black tracking-tight leading-tight uppercase font-mono truncate">{status.label}</div>
              <div className="text-[0.65rem] font-bold opacity-80 mt-0.5 truncate">{status.sub}</div>
            </div>
          </motion.div>

          <div className="flex gap-3 shrink-0">
            <button 
              onClick={onPlate}
              className="w-12 h-12 rounded-2xl bg-[#2DFF73] text-black cursor-pointer flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-lg shadow-[#2DFF73]/20"
              title="Tabağa Ekle"
            >
              <Plus size={24} strokeWidth={3} />
            </button>
            <button 
              onClick={onClose}
              className={`w-12 h-12 rounded-2xl border flex items-center justify-center transition-all hover:scale-105 active:scale-95 ${darkMode ? 'text-zinc-500 hover:text-white bg-white/5 border-white/10' : 'text-zinc-400 hover:text-black bg-black/5 border-black/10'}`}
            >
              <X size={24} />
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar p-6 xs:p-8 md:p-12 pt-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 md:gap-16">
          <div className="lg:col-span-7 space-y-12">
            <div>
              <div className="flex items-center gap-3 mb-8">
                <span className={`px-3 py-1 border rounded-lg text-[0.6rem] font-black uppercase tracking-widest ${darkMode ? 'bg-white/5 border-white/10 text-zinc-400' : 'bg-black/5 border-black/10 text-zinc-500'}`}>
                  {food.kat}
                </span>
                {!isAiResult && onEdit && (
                  <div className="flex gap-2 border-l border-white/10 pl-3">
                    <button onClick={onEdit} className="p-1.5 rounded-lg hover:bg-white/5 text-zinc-500 hover:text-white transition-all"><Edit2 size={14} /></button>
                    <button onClick={onDelete} className="p-1.5 rounded-lg hover:bg-white/5 text-zinc-500 hover:text-red-500 transition-all"><Trash2 size={14} /></button>
                  </div>
                )}
                {isAiResult && (
                  <span className={`px-2 py-1 rounded-lg text-[0.6rem] font-black uppercase tracking-widest flex items-center gap-1 ${darkMode ? 'bg-[#2DFF73]/10 text-[#2DFF73]' : 'bg-[#2DFF73]/20 text-emerald-700'}`}>
                    <Zap size={10} strokeWidth={3} /> AI ANALİZİ
                  </span>
                )}
                {isAiResult && food.isFromCache && (
                  <span className={`px-2 py-1 rounded-lg text-[0.6rem] font-black uppercase tracking-widest flex items-center gap-1 ${darkMode ? 'bg-blue-500/10 text-blue-400' : 'bg-blue-100 text-blue-700'}`}>
                    <Database size={10} /> ÖNBELLEK
                  </span>
                )}
              </div>
              
              <h2 className={`text-[2.8rem] xs:text-[3.8rem] md:text-[5.5rem] font-black leading-[0.85] tracking-tighter mb-10 bg-gradient-to-br bg-clip-text text-transparent break-words ${darkMode ? 'from-white via-white to-zinc-600' : 'from-black to-zinc-600'}`}>
                {food.isim}
              </h2>
              
              <div className="grid grid-cols-2 xs:grid-cols-4 gap-4">
                {[
                  { label: 'Metabolik Skor', val: mScore, color: status.color, unit: '/10' },
                  { label: 'Sistem Yükü', val: gy.toFixed(1), color: gy > 10 ? '#FF6B6B' : '#60A5FA', unit: 'gy' },
                  { label: 'Glikoz Tepkisi', val: food.gi, color: food.gi > 55 ? '#FFA500' : '#2DFF73', unit: 'gi' },
                  { label: 'Kalori', val: food.kal.toFixed(0), color: '#A1A1AA', unit: 'kcal' }
                ].map((s, i) => (
                  <div key={i} className={`p-5 rounded-3xl border transition-all hover:scale-[1.02] ${darkMode ? 'bg-zinc-900 border-white/5' : 'bg-white border-black/5 shadow-sm'}`}>
                    <span className="text-[0.55rem] font-black uppercase tracking-widest text-zinc-500 block mb-2">{s.label}</span>
                    <div className="flex items-baseline gap-1">
                      <span className="text-[1.8rem] font-black font-mono leading-none" style={{ color: s.color }}>{s.val}</span>
                      <span className="text-[0.6rem] font-bold text-zinc-500 opacity-60">{s.unit}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <GlucoseCurve gi={food.gi} gy={gy} color={status.color} darkMode={darkMode} />

            <div className={`p-8 rounded-[2.5rem] border ${darkMode ? 'bg-white/5 border-white/5' : 'bg-white border-black/5 shadow-xl shadow-black/5'}`}>
              <div className="flex items-center gap-3 mb-6">
                <div className={`w-10 h-10 rounded-2xl flex items-center justify-center border ${dietitian.bg} ${dietitian.border} ${dietitian.color}`}>
                  {dietitian.icon}
                </div>
                <h4 className={`text-[1.2rem] font-black tracking-tight ${dietitian.color}`}>{dietitian.title}</h4>
              </div>
              <p className={`text-[1.1rem] leading-relaxed font-medium ${darkMode ? 'text-zinc-300' : 'text-zinc-700'}`}>
                {dietitian.text}
              </p>
            </div>

            {hackerAdvice}
          </div>

          <div className="lg:col-span-5 space-y-10">
            <MacroDistribution karb={food.karb} pro={food.pro} yag={food.yag} darkMode={darkMode} />
            
            <MentorCard food={food} ctx={ctx} profile={profile} darkMode={darkMode} />

            <div className={`p-8 rounded-[2.5rem] border ${darkMode ? 'bg-[#2DFF73]/5 border-[#2DFF73]/20' : 'bg-emerald-50 border-emerald-100/50'}`}>
              <h4 className="text-[0.65rem] font-black uppercase tracking-[0.3em] text-[#2DFF73] mb-6">SİSTEM TAVSİYESİ</h4>
              <p className={`text-[1rem] italic leading-relaxed font-medium ${darkMode ? 'text-zinc-400' : 'text-zinc-600'}`}>
                {getTip(food, mScore, ctx)}
              </p>
            </div>

            {isAiResult && onAdd && (
              <button 
                onClick={onAdd}
                className="w-full py-6 rounded-3xl bg-[#2DFF73] text-black font-black uppercase tracking-[0.2em] text-[1rem] shadow-[0_20px_50px_rgba(45,255,115,0.3)] hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-3"
              >
                <Plus size={24} strokeWidth={3} />
                LİSTEYE KAYDET
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Footer Actions */}
      <div className={`p-8 border-t backdrop-blur-2xl ${darkMode ? 'bg-[#080808]/80 border-white/5' : 'bg-[#FAFAF9]/80 border-black/5'}`}>
        <div className="flex flex-col sm:flex-row gap-4 max-w-2xl mx-auto w-full">
          <button 
            onClick={() => {
              onLog(food, mScore);
            }}
            className={`flex-1 py-5 rounded-3xl font-black uppercase tracking-[0.2em] text-[0.85rem] transition-all border shadow-2xl ${darkMode ? 'bg-blue-600 text-white border-blue-500 shadow-blue-500/20 hover:bg-blue-500' : 'bg-black text-white hover:bg-zinc-800'}`}
          >
            Günlüğe Kaydet
          </button>
          <button 
            onClick={onClose}
            className={`flex-1 py-5 rounded-3xl font-black uppercase tracking-[0.2em] text-[0.85rem] transition-all border ${darkMode ? 'bg-zinc-800 text-white border-white/10 hover:bg-zinc-700' : 'bg-white text-black border-black/10 hover:bg-zinc-50'}`}
          >
            Sonucu Kapat
          </button>
        </div>
      </div>
    </div>

  );
}

function MentorCard({ food, ctx, profile, darkMode }: { food: Food, ctx: ConsumptionContext, profile: any, darkMode: boolean }) {
  const [loading, setLoading] = useState(false);
  const [advice, setAdvice] = useState<string | null>(null);

  const getAdvice = async () => {
    setLoading(true);
    try {
      const profileContext = `Yaş: ${profile.age}, Kilo: ${profile.weight}, Hedef: ${profile.goal}, İnsülin Direnci: ${profile.insulinResistance}`;
      const prompt = `Sen Dr. Rhonda Patrick'sin. Besin: ${food.isim}. GI: ${food.gi}. Saat: ${ctx.hour}:00. Bu besini şu an yeme konusunda biyokimyasal, uzun ömür (longevity) ve mikro besin odaklı bir analiz yap. İnsülin hassasiyeti, inflamasyon ve hücresel sağlık açısından konuş. Çok teknik ama anlaşılır ol. 35 kelimeyi geçme.`;
      const res = await getCoachResponse([{ role: 'user', content: prompt }], profileContext);
      setAdvice(res);
    } catch (e) {
      setAdvice("Hücresel veri hattında kesinti oluştu. Lütfen tekrar dene.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`p-8 rounded-[2.5rem] border overflow-hidden relative transition-all ${darkMode ? 'bg-zinc-900 border-white/5 hover:border-emerald-500/30' : 'bg-white border-black/5 hover:shadow-xl'}`}>
      <div className="absolute top-0 right-0 w-40 h-40 bg-emerald-500/5 blur-[60px] -mr-20 -mt-20" />
      
      <div className="flex items-center justify-between mb-8 relative z-10">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center text-white shadow-xl shadow-emerald-500/20">
            <Sparkles size={28} />
          </div>
          <div>
            <h4 className="text-[1.1rem] font-black tracking-tight">DR. RHONDA PATRICK</h4>
            <span className="text-[0.6rem] font-black text-emerald-500 uppercase tracking-widest bg-emerald-500/10 px-2 py-0.5 rounded-full">Longevity Expert</span>
          </div>
        </div>
      </div>

      <div className="relative z-10 min-h-[100px] flex flex-col justify-center">
        {loading ? (
          <div className="flex flex-col items-center py-6 gap-3">
             <Loader2 size={24} className="animate-spin text-emerald-500" />
             <span className="text-[0.65rem] font-black uppercase text-zinc-500 tracking-[0.2em] animate-pulse">BİYOMETRİK ANALİZ YAPILIYOR...</span>
          </div>
        ) : advice ? (
          <motion.div 
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            className={`text-[1rem] font-medium leading-relaxed italic border-l-4 border-emerald-500 pl-6 ${darkMode ? 'text-zinc-200' : 'text-zinc-800'}`}
          >
            "{advice}"
            <button 
              onClick={() => setAdvice(null)}
              className="mt-5 block text-[0.65rem] font-black text-emerald-500 uppercase tracking-[0.2em] hover:underline"
            >
              YENİ BİYOLOJİK ANALİZ
            </button>
          </motion.div>
        ) : (
          <div className="space-y-6">
            <p className="text-[0.9rem] text-zinc-500 font-medium leading-relaxed">
              Bu besinin hücresel düzeyde, epigenetik saatine ve metabolik yolaklarına (mTOR, AMPK) olan etkisini Rhonda Patrick perspektifiyle analiz edelim mi?
            </p>
            <button 
              onClick={getAdvice}
              className={`w-full py-5 rounded-2xl font-black text-[0.85rem] uppercase tracking-widest transition-all ${darkMode ? 'bg-emerald-500 text-black shadow-lg shadow-emerald-500/20' : 'bg-black text-white hover:bg-zinc-800'} hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2`}
            >
              <Activity size={16} />
              BİYOLOJİK ANALİZ İSTE
            </button>
          </div>
        )}
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
    isFromCache: res.isFromCache
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
      const profileContext = `Yaş: ${profile.age}, Kilo: ${profile.weight}, Hedef: ${profile.goal}, İnsülin Direnci: ${profile.insulinResistance}`;
      const prompt = `${food.isim} (GI: ${food.gi}, Karb: ${food.karb}g, Lif: ${food.lif}g) hakkında, günün bu saatinde (${ctx.hour}:00) ve şu anki bağlamda (Düşük Uyku: ${ctx.isLowSleep ? 'Evet' : 'Hayır'}) bana bir mentor/koç tavsiyesi ver. Kısa, öz ve Dennis Ritchie tarzında olsun.`;
      const res = await getCoachResponse([{ role: 'user', content: prompt }], profileContext);
      setAdvice(res);
    } catch (e) {
      setAdvice("Veri hattında bir parazit oluştu. Tekrar dene.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`mt-6 p-6 rounded-[2rem] border transition-all ${darkMode ? 'bg-zinc-900/50 border-white/10 shadow-[0_0_50px_rgba(45,255,115,0.05)]' : 'bg-white border-black/5 shadow-xl'}`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-[#2DFF73] to-emerald-400 flex items-center justify-center shadow-lg">
            <Brain size={20} className="text-black" />
          </div>
          <div>
            <h4 className={`text-[0.8rem] font-black tracking-tight ${darkMode ? 'text-white' : 'text-zinc-900'}`}>AI MENTOR</h4>
            <p className="text-[0.6rem] text-zinc-500 font-bold uppercase tracking-widest">Sistem Analisti</p>
          </div>
        </div>
        {!advice && !loading && (
          <button 
            onClick={getAdvice}
            className={`px-4 py-2 rounded-xl text-[0.7rem] font-black transition-all hover:scale-105 active:scale-95 ${darkMode ? 'bg-[#2DFF73] text-black shadow-[0_0_20px_rgba(45,255,115,0.4)]' : 'bg-black text-white'}`}
          >
            FİKİR AL
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex items-center gap-3 py-4">
          <Loader2 size={16} className="animate-spin text-[#2DFF73]" />
          <span className="text-[0.75rem] font-mono text-zinc-500 animate-pulse">VERİ ANALİZ EDİLİYOR...</span>
        </div>
      ) : advice ? (
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`text-[0.9rem] leading-relaxed font-medium ${darkMode ? 'text-zinc-300' : 'text-zinc-700'} border-l-4 border-[#2DFF73] pl-4 italic`}
        >
          "{advice}"
          <div className="mt-4 flex justify-end">
            <button 
              onClick={() => setAdvice(null)}
              className="text-[0.6rem] font-black text-zinc-500 hover:text-[#2DFF73] transition-colors"
            >
              YENİLE
            </button>
          </div>
        </motion.div>
      ) : (
        <p className="text-[0.8rem] text-zinc-500 italic">
          "Besin sadece yakıt değildir; o bir sistem girdisidir. Doğru girdiyi seçmek için mentorunla konuş."
        </p>
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
  const metabolicHeroes = initialFoods.filter(f => f.score >= 9.5).slice(0, 4);
  
  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.3 }}
      className="mt-20 space-y-12"
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
        <div className="space-y-6">
          <h3 className={`text-[0.6rem] font-black uppercase tracking-[0.4em] ${darkMode ? 'text-zinc-600' : 'text-zinc-400'}`}>
            Metabolik İndeks: Altın Liste
          </h3>
          <div className="grid grid-cols-2 gap-4">
            {metabolicHeroes.map((food, i) => (
              <button 
                key={i}
                onClick={() => onSelect(food.isim)}
                className={`flex flex-col items-start p-5 rounded-2xl border transition-all ${darkMode ? 'bg-zinc-900 border-white/5 hover:border-[#2DFF73]/40' : 'bg-white border-black/5 hover:shadow-xl'}`}
              >
                <span className={`text-[0.8rem] font-bold mb-2 ${darkMode ? 'text-white' : 'text-zinc-900'}`}>{food.isim}</span>
                <span className="text-[1.5rem] font-black font-mono text-[#2DFF73]">{food.score}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-6">
          <h3 className={`text-[0.6rem] font-black uppercase tracking-[0.4em] ${darkMode ? 'text-zinc-600' : 'text-zinc-400'}`}>
            Sistem Öğretisi
          </h3>
          <div className={`p-8 rounded-2xl border ${darkMode ? 'bg-zinc-900/50 border-white/10' : 'bg-zinc-50 border-black/5'}`}>
             <p className={`text-[0.9rem] font-medium leading-[1.8] italic ${darkMode ? 'text-zinc-400' : 'text-zinc-600'}`}>
               "Vücut bir sistemdir; besinler girdi verileridir. Glikoz pikini minimize etmek, sistem kararlılığını (homeostazis) artırır."
             </p>
             <div className="mt-8 pt-8 border-t border-dashed border-zinc-700/20">
               <span className={`text-[0.6rem] font-black font-mono uppercase tracking-[0.2em] ${darkMode ? 'text-zinc-700' : 'text-zinc-300'}`}>Kernel Release: Alpha-1</span>
             </div>
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
      return foods;
    } catch (e) {
      console.error("Foods parse error:", e);
      return foods;
    }
  });
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
  const [coachMessages, setCoachMessages] = useState<{role: 'user' | 'assistant', content: string}[]>([]);
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

  const handleCoachMessage = async (text: string) => {
    if (!text.trim()) return;
    const newMessages = [...coachMessages, { role: 'user' as const, content: text }];
    setCoachMessages(newMessages);
    setIsCoachLoading(true);
    try {
      const profileContext = `Kullanıcı: ${userProfile.age} yaş, ${userProfile.weight}kg, ${userProfile.goal} hedefi.`;
      const response = await getCoachResponse(newMessages, profileContext);
      setCoachMessages(prev => [...prev, { role: 'assistant' as const, content: response }]);
    } catch (error) {
      setAiError("Koç şu an yanıt veremiyor.");
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
      const logSummary = dailyLog.map(l => l.isim).join(", ");
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
              className={`rounded-[3rem] border shadow-2xl overflow-hidden max-w-lg w-full p-8 sm:p-12 text-center ${darkMode ? 'bg-[#0A0A0A] text-white border-white/10' : 'bg-[#F5F5F0] text-black border-black/10'}`}
            >
              <div className="w-24 h-24 rounded-full bg-[#2DFF73]/10 flex items-center justify-center mx-auto mb-8">
                <Target size={48} className="text-[#2DFF73]" />
              </div>
              <h2 className="text-[2.5rem] font-black tracking-tighter leading-none mb-4">Günün Görevi</h2>
              <p className="text-[1.1rem] font-medium text-zinc-500 mb-8 leading-relaxed">
                "Bugün her öğünden önce 1 bardak sirkeli su içerek glisemik tepkiyi %30'a kadar düşür!"
              </p>
              <div className="flex flex-col gap-4">
                <button 
                  onClick={() => {
                    setIsChallengeOpen(false);
                    updateGamification(100);
                    setAiSuccess("Görev tamamlandı! +20 Puan");
                  }}
                  className="w-full py-5 rounded-2xl bg-[#2DFF73] text-black font-black uppercase tracking-widest hover:scale-[1.02] active:scale-[0.98] transition-all shadow-[0_10px_30px_rgba(45,255,115,0.2)]"
                >
                  Görevi Tamamladım
                </button>
                <button 
                  onClick={() => setIsChallengeOpen(false)}
                  className={`w-full py-5 rounded-2xl font-black uppercase tracking-widest transition-all border ${darkMode ? 'bg-white/5 border-white/10 text-white hover:bg-white/10' : 'bg-black/5 border-black/10 text-black hover:bg-black/10'}`}
                >
                  Daha Sonra
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <header className={`sticky top-0 z-[100] backdrop-blur-2xl border-b transition-all duration-500 ${darkMode ? 'bg-black/50 border-white/5' : 'bg-white/70 border-black/5'} px-4 sm:px-8 py-3 sm:py-5`}>
        <div className="max-w-[1200px] mx-auto flex justify-between items-center">
          <div role="banner" className="flex items-center gap-4">
            <div className={`text-[1.4rem] sm:text-[1.8rem] font-black tracking-tighter flex items-center ${darkMode ? 'text-white' : 'text-black'}`}>
              <span className="opacity-40">GLI</span>
              <span className="text-[#2DFF73]">SKOR</span>
            </div>
          </div>
          
          <div className="flex gap-2 sm:gap-4 items-center">
            {/* Professional Summary Bar */}
            <div className="hidden md:flex items-center gap-6 px-6 py-2 rounded-2xl border border-white/5 bg-white/5">
              <div className="flex flex-col">
                <span className="text-[0.55rem] font-black text-zinc-500 uppercase tracking-widest">GÜNLÜK GY</span>
                <span className={`text-[0.9rem] font-black ${dailyTotals.gl > 100 ? 'text-rose-500' : 'text-[#2DFF73]'}`}>{Math.round(dailyTotals.gl)} / 100</span>
              </div>
              <div className="w-px h-6 bg-white/10" />
              <div className="flex flex-col">
                <span className="text-[0.55rem] font-black text-zinc-500 uppercase tracking-widest">AKTİF SERİ</span>
                <div className="flex items-center gap-1">
                  <Flame size={12} className="text-orange-500 fill-orange-500" />
                  <span className="text-[0.9rem] font-black">{userStats.streak} Gün</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button 
                onClick={() => setDarkMode(!darkMode)}
                className={`p-3 rounded-2xl transition-all border ${darkMode ? 'bg-white/5 border-white/5 hover:bg-white/10' : 'bg-black/5 border-black/5 hover:bg-black/10'}`}
              >
                {darkMode ? <Sun size={18} /> : <Moon size={18} />}
              </button>
              
              <button 
                onClick={() => setIsProfileOpen(true)}
                className={`w-11 h-11 rounded-2xl overflow-hidden border transition-all ${darkMode ? 'bg-white/5 border-white/10 hover:border-[#2DFF73]/50' : 'bg-black/5 border-black/10 hover:border-[#2DFF73]/50'}`}
              >
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#2DFF73] to-emerald-700">
                  <User size={20} className="text-black" />
                </div>
              </button>
            </div>
          </div>
        </div>
      </header>

      <main id="main-content" className="pb-40">
        <div className="max-w-[800px] mx-auto mt-20 sm:mt-32 px-4 sm:px-8">
          {/* Main Search Area */}
          <div className="text-center mb-16 px-4">
            <motion.h1 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`text-[3.5rem] sm:text-[5.5rem] font-black tracking-tighter leading-[0.8] mb-6 ${darkMode ? 'text-white' : 'text-zinc-900'}`}
            >
              Pure <br /> <span className="text-[#2DFF73]">Metabolic.</span>
            </motion.h1>
            <p className="text-[0.65rem] sm:text-[0.75rem] text-zinc-500 font-bold uppercase tracking-[0.6em] max-w-lg mx-auto opacity-40">
              Data-Driven Nutrition Architecture
            </p>
          </div>

          <div className={`group border rounded-[2.5rem] p-2 flex flex-col md:flex-row items-stretch gap-2 transition-all duration-500 hover:border-[#2DFF73]/30 ${darkMode ? 'bg-zinc-900 border-white/5 shadow-2xl shadow-black/50' : 'bg-white border-black/5 shadow-xl shadow-zinc-200'}`}>
            <div className="flex-1 flex items-center px-6 gap-4">
              <Search className={`transition-colors group-focus-within:text-[#2DFF73] ${darkMode ? 'text-zinc-600' : 'text-zinc-300'}`} size={20} />
              <input 
                type="text" 
                placeholder="Besin veya marka analiz et..." 
                value={searchVal}
                onChange={(e) => setSearchVal(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAiAnalysis(searchVal)}
                className={`flex-1 bg-transparent border-none py-6 focus:outline-none font-bold text-[1.1rem] sm:text-[1.2rem] ${darkMode ? 'text-white placeholder-zinc-800' : 'text-black placeholder-zinc-300'}`}
              />
            </div>
            
            <div className="flex items-center gap-2 p-1">
              <button 
                onClick={startListening}
                className={`flex items-center justify-center w-14 h-14 rounded-2xl transition-all ${isListening ? 'bg-red-500 text-white animate-pulse' : darkMode ? 'bg-white/5 text-zinc-500 hover:text-white' : 'bg-zinc-100 text-zinc-400 hover:text-black'}`}
              >
                {isListening ? <MicOff size={20} /> : <Mic size={20} />}
              </button>
              <button 
                onClick={() => handleAiAnalysis(searchVal)}
                disabled={!searchVal || isAiLoading}
                className="bg-[#2DFF73] text-black px-8 py-5 rounded-2xl font-black text-[0.8rem] uppercase tracking-widest hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 flex items-center gap-2"
              >
                {isAiLoading ? <Loader2 className="animate-spin" size={18} /> : <Sparkles size={18} />}
                ANALİZ
              </button>
            </div>
          </div>
          
          <div className="mt-12 flex justify-center gap-8 opacity-40 hover:opacity-100 transition-opacity">
             <button 
                onClick={() => setIsHistoryOpen(true)}
                className="flex items-center gap-2 text-[0.7rem] font-black uppercase tracking-[0.2em] text-zinc-500 hover:text-[#2DFF73] transition-all"
             >
                <History size={14} /> Kayıtlar
             </button>
             <button 
                onClick={() => setIsBarcodeOpen(true)}
                className="flex items-center gap-2 text-[0.7rem] font-black uppercase tracking-[0.2em] text-zinc-500 hover:text-[#2DFF73] transition-all"
             >
                <Camera size={14} /> Barkod
             </button>
          </div>
          
          {!aiResult && <DiscoverySection darkMode={darkMode} onSelect={(val) => {
            setSearchVal(val);
            handleAiAnalysis(val);
          }} />}
        </div>
      </main>

      {/* Floating Bottom Navigation */}
      <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[150] w-auto">
        <div className={`p-1.5 rounded-[2.5rem] border shadow-2xl backdrop-blur-3xl flex items-center gap-1 ${darkMode ? 'bg-zinc-900/80 border-white/10' : 'bg-white/90 border-black/10'}`}>
           <button 
              onClick={() => {
                setAiResult(null);
                setSearchVal('');
              }} 
              className={`p-4 rounded-3xl transition-all ${!aiResult ? (darkMode ? 'text-[#2DFF73] bg-white/5' : 'text-[#2DFF73] bg-black/5') : 'text-zinc-500 hover:text-zinc-300'}`}
           >
              <Search size={20} />
           </button>
           <button 
              onClick={() => setIsPlateOpen(true)}
              className={`p-4 rounded-3xl transition-all text-zinc-500 hover:text-zinc-300`}
           >
              <Utensils size={20} />
           </button>
           <button 
              onClick={() => setIsTrackingOpen(true)}
              className={`p-4 rounded-3xl transition-all text-zinc-500 hover:text-zinc-300`}
           >
              <Activity size={20} />
           </button>
           <button 
              onClick={() => setIsCoachOpen(true)}
              className={`p-4 rounded-3xl transition-all text-zinc-500 hover:text-zinc-300`}
           >
              <Brain size={20} />
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
                  <div className="w-10 h-10 rounded-full bg-[#2DFF73] flex items-center justify-center text-black">
                    <Brain size={20} />
                  </div>
                  <div>
                    <h2 className="text-lg font-black tracking-tight">AI Beslenme Koçu</h2>
                    <p className="text-[0.7rem] font-bold text-[#2DFF73] uppercase tracking-widest">Çevrimiçi • Uzman Analist</p>
                  </div>
                </div>
                <button onClick={() => setIsCoachOpen(false)} className="p-2 hover:bg-white/5 rounded-full transition-all">
                  <X size={20} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {coachMessages.length === 0 && (
                  <div className="text-center py-12">
                    <Sparkles className="mx-auto text-[#2DFF73] mb-4" size={32} />
                    <p className="text-zinc-500 font-medium">Merhaba! Ben senin kişisel beslenme koçunum. Bugün sana nasıl yardımcı olabilirim?</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-6">
                      {["Akşam yemeği için sağlıklı bir önerin var mı?", "Tatlı krizini nasıl yönetirim?", "İnsülin direncini kırmak için ne yapmalıyım?", "Spordan sonra ne yemeliyim?"].map((q, i) => (
                        <button key={i} onClick={() => handleCoachMessage(q)} className={`p-3 rounded-xl border text-[0.8rem] font-bold text-left transition-all ${darkMode ? 'bg-white/5 border-white/5 hover:bg-white/10' : 'bg-black/5 border-black/5 hover:bg-black/10'}`}>
                          {q}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {coachMessages.map((m, i) => (
                  <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[80%] p-4 rounded-2xl text-[0.9rem] font-medium leading-relaxed ${m.role === 'user' ? 'bg-[#2DFF73] text-black rounded-tr-none' : 'bg-white/5 border border-white/5 text-zinc-200 rounded-tl-none'}`}>
                      {m.content}
                    </div>
                  </div>
                ))}
                {isCoachLoading && (
                  <div className="flex justify-start">
                    <div className="bg-white/5 border border-white/5 p-4 rounded-2xl rounded-tl-none">
                      <Loader2 className="animate-spin text-[#2DFF73]" size={20} />
                    </div>
                  </div>
                )}
              </div>

              <div className="p-6 border-t border-white/5">
                <div className="relative">
                  <input 
                    type="text" 
                    placeholder="Mesajını yaz..." 
                    className={`w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-6 pr-16 focus:outline-none focus:border-[#2DFF73]/50 transition-all ${darkMode ? 'text-white' : 'text-black'}`}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        const val = (e.target as HTMLInputElement).value;
                        if (val.trim()) {
                          handleCoachMessage(val);
                          (e.target as HTMLInputElement).value = '';
                        }
                      }
                    }}
                    id="coach-input"
                  />
                  <button 
                    onClick={() => {
                      const input = document.getElementById('coach-input') as HTMLInputElement;
                      if (input && input.value.trim()) {
                        handleCoachMessage(input.value);
                        input.value = '';
                      }
                    }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-2 bg-[#2DFF73] text-black rounded-xl hover:scale-105 transition-all"
                  >
                    <ChevronRight size={20} />
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
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className={`w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-[3rem] border p-8 sm:p-12 ${darkMode ? 'bg-[#0A0A0A] border-white/10' : 'bg-white border-black/10'}`}
            >
              <div className="flex justify-between items-center mb-12">
                <div>
                  <h2 className="text-3xl font-black tracking-tighter">Beslenme Trendlerin</h2>
                  <p className="text-zinc-500 font-medium">Son 7 günlük glisemik yük ve kalori analizi</p>
                </div>
                <button onClick={() => setIsStatsOpen(false)} className="p-3 hover:bg-white/5 rounded-full transition-all">
                  <X size={24} />
                </button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className={`p-8 rounded-[2.5rem] border ${darkMode ? 'bg-white/5 border-white/5' : 'bg-black/5 border-black/5'}`}>
                  <h3 className="text-lg font-black mb-6 flex items-center gap-2">
                    <Activity className="text-[#2DFF73]" size={20} />
                    Glisemik Yük Trendi
                  </h3>
                  <div className="h-[250px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={[
                        { day: 'Pzt', gl: 85 }, { day: 'Sal', gl: 110 }, { day: 'Çar', gl: 95 }, { day: 'Per', gl: 120 }, { day: 'Cum', gl: 80 }, { day: 'Cmt', gl: 140 }, { day: 'Paz', gl: 90 }
                      ]}>
                        <defs>
                          <linearGradient id="colorGl" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#2DFF73" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#2DFF73" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={darkMode ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)"} />
                        <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{fontSize: 12, fontWeight: 700}} />
                        <YAxis axisLine={false} tickLine={false} tick={{fontSize: 12, fontWeight: 700}} />
                        <RechartsTooltip contentStyle={{borderRadius: '1rem', border: 'none', boxShadow: '0 10px 30px rgba(0,0,0,0.1)'}} />
                        <Area type="monotone" dataKey="gl" stroke="#2DFF73" strokeWidth={4} fillOpacity={1} fill="url(#colorGl)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className={`p-8 rounded-[2.5rem] border ${darkMode ? 'bg-white/5 border-white/5' : 'bg-black/5 border-black/5'}`}>
                  <h3 className="text-lg font-black mb-6 flex items-center gap-2">
                    <Flame className="text-orange-500" size={20} />
                    Kalori Dağılımı
                  </h3>
                  <div className="h-[250px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={[
                        { day: 'Pzt', cal: 1800 }, { day: 'Sal', cal: 2100 }, { day: 'Çar', cal: 1950 }, { day: 'Per', cal: 2200 }, { day: 'Cum', cal: 1850 }, { day: 'Cmt', cal: 2500 }, { day: 'Paz', cal: 2000 }
                      ]}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={darkMode ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)"} />
                        <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{fontSize: 12, fontWeight: 700}} />
                        <YAxis axisLine={false} tickLine={false} tick={{fontSize: 12, fontWeight: 700}} />
                        <RechartsTooltip />
                        <Bar dataKey="cal" fill="#FF6B2B" radius={[10, 10, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4">
                {[
                  { label: 'Ortalama GY', value: '98', status: 'İyi', color: 'text-[#2DFF73]' },
                  { label: 'En Yüksek GY', value: '140', status: 'Yüksek', color: 'text-red-500' },
                  { label: 'Hedef Uyumu', value: '%85', status: 'Harika', color: 'text-blue-400' }
                ].map((s, i) => (
                  <div key={i} className={`p-6 rounded-2xl border ${darkMode ? 'bg-white/5 border-white/5' : 'bg-black/5 border-black/5'}`}>
                    <span className="text-[0.6rem] font-black text-zinc-500 uppercase tracking-widest">{s.label}</span>
                    <div className="flex items-end gap-2 mt-1">
                      <span className="text-2xl font-black">{s.value}</span>
                      <span className={`text-[0.7rem] font-bold mb-1 ${s.color}`}>{s.status}</span>
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

      <div className="max-w-[1000px] mx-auto mt-12 px-4 sm:px-8 grid grid-cols-2 sm:flex sm:flex-wrap justify-center gap-x-6 gap-y-8 sm:gap-8 border-y border-white/5 py-6 sm:py-10">
        {[
          { color: '#2DFF73', label: '8–10 GÜVENLİ', desc: 'Metabolik denge' },
          { color: '#FACC15', label: '5–7 ÖLÇÜLÜ', desc: 'Porsiyon kontrolü' },
          { color: '#F97316', label: '3–4 DİKKATLİ', desc: 'Yüksek insülin' },
          { color: '#EF4444', label: '1–2 KAÇIN', desc: 'Kritik seviye' }
        ].map((item, i) => (
          <div key={i} className="flex items-center gap-3 sm:gap-4 group justify-center sm:justify-start">
            <div className="w-2.5 h-2.5 sm:w-3 h-3 rounded-full shadow-[0_0_10px_rgba(255,255,255,0.2)] transition-all group-hover:scale-125 shrink-0" style={{ backgroundColor: item.color, boxShadow: `0 0 15px ${item.color}40` }} />
            <div className="flex flex-col">
              <div className={`text-[0.65rem] sm:text-[0.75rem] font-black tracking-widest leading-none ${darkMode ? 'text-white' : 'text-black'}`}>{item.label}</div>
              <div className="text-[0.55rem] sm:text-[0.6rem] font-medium text-zinc-500 uppercase tracking-wider mt-1">{item.desc}</div>
            </div>
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
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                key={f.isim}
                onClick={() => setSelectedFood(f)}
                className={`p-8 rounded-2xl border transition-all cursor-pointer ${darkMode ? 'bg-zinc-900 border-white/5 hover:border-[#2DFF73]/40' : 'bg-white border-black/5 hover:shadow-2xl hover:shadow-zinc-200'}`}
              >
                <div className="flex flex-col gap-6">
                  <div className="flex items-start justify-between">
                    <div className="flex flex-col gap-1">
                      <span className={`text-[0.6rem] font-bold uppercase tracking-[0.3em] opacity-40 ${darkMode ? 'text-zinc-500' : 'text-zinc-400'}`}>
                        {f.kat}
                      </span>
                      <h2 className={`text-[1.3rem] font-black leading-tight tracking-tight ${darkMode ? 'text-white' : 'text-zinc-900'}`}>
                        {f.isim}
                      </h2>
                    </div>
                    <div className="flex flex-col items-end">
                      <span className="text-[1.8rem] font-black font-mono text-[#2DFF73] leading-none">
                        {mScore}
                      </span>
                      <span className="text-[0.55rem] font-black uppercase tracking-widest text-zinc-500 mt-1">META SCORE</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3 border-t border-dashed border-zinc-700/20 pt-6">
                    {[
                      { val: f.gi, label: 'GI' },
                      { val: g.toFixed(1), label: 'GY' },
                      { val: f.kal.toFixed(0), label: 'KCAL' }
                    ].map((item, i) => (
                      <div key={i} className="flex flex-col">
                        <span className={`text-[1rem] font-black font-mono ${darkMode ? 'text-white' : 'text-black'}`}>{item.val}</span>
                        <span className="text-[0.55rem] font-bold text-zinc-500 uppercase tracking-widest">{item.label}</span>
                      </div>
                    ))}
                  </div>

                  <div className="flex gap-2">
                    <button 
                      onClick={(e) => { e.stopPropagation(); addToLog(f, 100, 'Atıştırmalık', mScore); }}
                      className={`flex-1 py-3 rounded-xl text-[0.7rem] font-black uppercase tracking-[0.2em] transition-all ${darkMode ? 'bg-white/5 text-zinc-400 hover:bg-[#2DFF73] hover:text-black' : 'bg-zinc-100 text-zinc-500 hover:bg-black hover:text-white'}`}
                    >
                      Log
                    </button>
                    <button 
                      onClick={(e) => { e.stopPropagation(); addToPlate(f); }}
                      className={`flex-1 py-3 rounded-xl text-[0.7rem] font-black uppercase tracking-[0.2em] transition-all ${darkMode ? 'bg-[#2DFF73]/10 text-[#2DFF73] hover:bg-[#2DFF73] hover:text-black border border-[#2DFF73]/20' : 'bg-zinc-100 text-zinc-500 hover:bg-black hover:text-white'}`}
                    >
                      Plate
                    </button>
                  </div>
                </div>
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
                    {/* Summary Stats */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className={`p-6 rounded-[2rem] border ${darkMode ? 'bg-white/5 border-white/5' : 'bg-black/5 border-black/5'}`}>
                        <div className="text-[0.65rem] font-black text-zinc-500 uppercase tracking-widest mb-2">Toplam Kalori</div>
                        <div className="flex items-baseline gap-1">
                          <span className={`text-[2rem] font-black ${darkMode ? 'text-white' : 'text-black'}`}>{plateAnalysisResult.totalCalories}</span>
                          <span className="text-[0.8rem] font-bold text-zinc-500">kcal</span>
                        </div>
                      </div>
                      <div className={`p-6 rounded-[2rem] border ${darkMode ? 'bg-white/5 border-white/5' : 'bg-black/5 border-black/5'}`}>
                        <div className="text-[0.65rem] font-black text-zinc-500 uppercase tracking-widest mb-2">Metabolik Skor</div>
                        <div className="flex items-baseline gap-1">
                          <span className={`text-[2rem] font-black text-[#2DFF73]`}>{plateAnalysisResult.overallMetabolicScore}</span>
                          <span className="text-[0.8rem] font-bold text-zinc-500">/10</span>
                        </div>
                      </div>
                    </div>

                    {/* Identified Foods */}
                    <div className="space-y-4">
                      <h4 className="text-[0.75rem] font-black text-zinc-500 uppercase tracking-[0.2em] ml-2">Tanımlanan Besinler</h4>
                      <div className="grid gap-4">
                        {plateAnalysisResult.identifiedFoods.map((food, i) => (
                          <div 
                            key={i}
                            className={`p-6 rounded-[2.5rem] border flex items-center justify-between group transition-all ${darkMode ? 'bg-white/[0.02] border-white/5 hover:bg-white/[0.04]' : 'bg-black/[0.02] border-black/5 hover:bg-black/[0.04]'}`}
                          >
                            <div className="flex items-center gap-5">
                              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center font-black text-[1.2rem] ${food.score >= 8 ? 'bg-emerald-500/10 text-emerald-400' : food.score >= 5 ? 'bg-orange-500/10 text-orange-400' : 'bg-red-500/10 text-red-400'}`}>
                                {food.score}
                              </div>
                              <div>
                                <div className={`font-black text-[1.1rem] tracking-tight ${darkMode ? 'text-white' : 'text-black'}`}>{food.name}</div>
                                <div className="text-[0.7rem] font-bold text-zinc-500 uppercase tracking-wider mt-0.5">
                                  Tahmini: {food.portion} • {food.estimatedCalories} kcal
                                </div>
                                <p className="text-[0.75rem] text-zinc-600 mt-2 leading-relaxed italic">"{food.reason}"</p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* General Advice */}
                    <div className={`p-8 rounded-[2.5rem] border ${darkMode ? 'bg-white/5 border-white/5' : 'bg-black/5 border-black/5'}`}>
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 rounded-full bg-[#2DFF73]/10 flex items-center justify-center text-[#2DFF73]">
                          <Lightbulb size={20} />
                        </div>
                        <span className="text-[0.8rem] font-black uppercase tracking-widest">Uzman Tavsiyesi</span>
                      </div>
                      <p className={`text-[0.95rem] leading-relaxed font-medium ${darkMode ? 'text-zinc-400' : 'text-zinc-600'}`}>
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
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className={`rounded-[3rem] border shadow-2xl overflow-hidden max-w-2xl w-full flex flex-col max-h-[85vh] ${darkMode ? 'bg-[#0A0A0A] border-white/10' : 'bg-[#F5F5F0] border-black/10'}`}
            >
              <div className={`p-10 border-b flex items-center justify-between ${darkMode ? 'border-white/5' : 'border-black/5'}`}>
                <div>
                  <h3 className={`text-[2rem] font-black tracking-tighter bg-gradient-to-br bg-clip-text text-transparent ${darkMode ? 'from-white to-zinc-500' : 'from-black to-zinc-600'}`}>Günlük Takip</h3>
                  <p className="text-zinc-500 text-[0.8rem] font-medium mt-1">Bugün tükettiğiniz besinler ve metabolik yükünüz</p>
                </div>
                <button 
                  onClick={() => setIsTrackingOpen(false)}
                  className={`w-12 h-12 rounded-full border flex items-center justify-center transition-all ${darkMode ? 'bg-white/5 border-white/10 text-zinc-400 hover:bg-white/10' : 'bg-black/5 border-black/10 text-zinc-500 hover:bg-black/10'}`}
                >
                  <X size={24} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-10 space-y-8 custom-scrollbar">
                {/* Daily Stats Dashboard */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {[
                    { label: 'Metabolik Skor', value: dailyMetabolicPerformance, unit: '/100', color: 'text-[#2DFF73]' },
                    { label: 'Toplam GY', value: Math.round(dailyTotals.gl), unit: '', color: 'text-blue-400' },
                    { label: 'Kalori', value: Math.round(dailyTotals.calories), unit: 'kcal', color: 'text-zinc-400' },
                    { label: 'Karbonhidrat', value: Math.round(dailyTotals.carbs), unit: 'g', color: 'text-orange-400' }
                  ].map((stat, i) => (
                    <div key={i} className={`p-4 rounded-2xl border ${darkMode ? 'bg-white/5 border-white/5' : 'bg-black/5 border-black/5'}`}>
                      <div className="text-[0.6rem] font-black text-zinc-500 uppercase tracking-widest mb-1">{stat.label}</div>
                      <div className="flex items-baseline gap-1">
                        <span className={`text-[1.4rem] font-black ${stat.color}`}>{stat.value}</span>
                        <span className="text-[0.6rem] font-bold text-zinc-600">{stat.unit}</span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Daily Log List */}
                <div className="space-y-4">
                  <h4 className="text-[0.7rem] font-black text-zinc-500 uppercase tracking-[0.2em] ml-1">Metabolik Koşullar</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Time */}
                    <div className={`p-4 rounded-2xl border ${darkMode ? 'bg-white/5 border-white/5' : 'bg-zinc-50 border-black/5'}`}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Clock size={16} className="text-zinc-500" />
                          <span className="text-[0.6rem] font-black uppercase tracking-widest text-zinc-500">Saat: {consumptionHour}:00</span>
                        </div>
                        <div className="flex gap-2">
                          <button onClick={() => setConsumptionHour(Math.max(0, consumptionHour - 1))} className="p-1.5 hover:bg-black/10 rounded-lg"><Minus size={14} /></button>
                          <button onClick={() => setConsumptionHour(Math.min(23, consumptionHour + 1))} className="p-1.5 hover:bg-black/10 rounded-lg"><Plus size={14} /></button>
                        </div>
                      </div>
                    </div>
                    {/* Sleep */}
                    <button 
                      onClick={() => setIsLowSleep(!isLowSleep)}
                      className={`p-4 rounded-2xl border flex items-center justify-between transition-all ${isLowSleep ? 'bg-red-500/10 border-red-500/20 text-red-500' : (darkMode ? 'bg-white/5 border-white/5 text-zinc-500' : 'bg-zinc-50 border-black/5 text-zinc-600')}`}
                    >
                      <span className="text-[0.75rem] font-black uppercase tracking-widest">Uykusuzum</span>
                      <div className={`w-8 h-4 rounded-full relative ${isLowSleep ? 'bg-red-500' : 'bg-zinc-700'}`}>
                        <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all ${isLowSleep ? 'right-0.5' : 'left-0.5'}`} />
                      </div>
                    </button>
                    {/* Stress */}
                    <button 
                      onClick={() => setIsStressed(!isStressed)}
                      className={`p-4 rounded-2xl border flex items-center justify-between transition-all ${isStressed ? 'bg-amber-500/10 border-amber-500/20 text-amber-500' : (darkMode ? 'bg-white/5 border-white/5 text-zinc-500' : 'bg-zinc-50 border-black/5 text-zinc-600')}`}
                    >
                      <span className="text-[0.75rem] font-black uppercase tracking-widest">Stresliyim</span>
                      <div className={`w-8 h-4 rounded-full relative ${isStressed ? 'bg-amber-500' : 'bg-zinc-700'}`}>
                        <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all ${isStressed ? 'right-0.5' : 'left-0.5'}`} />
                      </div>
                    </button>
                    {/* Active */}
                    <button 
                      onClick={() => setHasMovement(!hasMovement)}
                      className={`p-4 rounded-2xl border flex items-center justify-between transition-all ${hasMovement ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500' : (darkMode ? 'bg-white/5 border-white/5 text-zinc-500' : 'bg-zinc-50 border-black/5 text-zinc-600')}`}
                    >
                      <span className="text-[0.75rem] font-black uppercase tracking-widest">Hareketliyim</span>
                      <div className={`w-8 h-4 rounded-full relative ${hasMovement ? 'bg-emerald-500' : 'bg-zinc-700'}`}>
                        <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all ${hasMovement ? 'right-0.5' : 'left-0.5'}`} />
                      </div>
                    </button>
                  </div>

                  <h4 className="text-[0.7rem] font-black text-zinc-500 uppercase tracking-[0.2em] ml-1 mt-8">Bugünkü Kayıtlar</h4>
                  {dailyLog.length === 0 ? (
                    <div className="py-12 text-center">
                      <Activity size={32} className="text-zinc-700 mx-auto mb-4 opacity-20" />
                      <p className="text-zinc-600 font-medium">Henüz bir kayıt eklemediniz.</p>
                    </div>
                  ) : (
                    dailyLog.map((entry) => (
                      <div 
                        key={entry.id}
                        className={`p-5 rounded-2xl border flex items-center justify-between group ${darkMode ? 'bg-white/[0.02] border-white/5' : 'bg-black/[0.02] border-black/5'}`}
                      >
                        <div className="flex items-center gap-4">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-[0.7rem] font-black ${darkMode ? 'bg-white/5 text-zinc-400' : 'bg-black/5 text-zinc-500'}`}>
                            {new Date(entry.timestamp).getHours()}:{new Date(entry.timestamp).getMinutes().toString().padStart(2, '0')}
                          </div>
                          <div>
                            <div className="font-black text-[1rem] tracking-tight">{entry.food.isim}</div>
                            <div className="text-[0.65rem] font-bold text-zinc-500 uppercase tracking-wider">
                              {entry.amount}g • {entry.mealType} • {Math.round((entry.food.gi * (entry.food.karb * entry.amount / 100)) / 100)} GY
                            </div>
                          </div>
                        </div>
                        <button 
                          onClick={() => removeFromLog(entry.id)}
                          className="w-10 h-10 rounded-full flex items-center justify-center text-zinc-600 hover:text-red-400 hover:bg-red-400/10 transition-all opacity-0 group-hover:opacity-100"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    ))
                  )}
                </div>

                {/* Metabolic Advice */}
                {dailyLog.length > 0 && (
                  <div className={`p-6 rounded-[2rem] border ${dailyMetabolicPerformance > 80 ? 'border-emerald-500/20 bg-emerald-500/5' : dailyMetabolicPerformance > 60 ? 'border-orange-500/20 bg-orange-500/5' : 'border-red-500/20 bg-red-500/5'}`}>
                    <div className="flex items-center gap-3 mb-3">
                      <Lightbulb className={dailyMetabolicPerformance > 80 ? 'text-emerald-500' : dailyMetabolicPerformance > 60 ? 'text-orange-500' : 'text-red-500'} size={20} />
                      <span className="text-[0.7rem] font-black uppercase tracking-widest">Günlük Metabolik Durum</span>
                    </div>
                    <p className={`text-[0.85rem] leading-relaxed font-medium ${darkMode ? 'text-zinc-400' : 'text-zinc-600'}`}>
                      {dailyMetabolicPerformance > 80 
                        ? "Harika gidiyorsun! Bugün metabolik yükün oldukça düşük. Bu dengeyi korumak yağ yakımını ve enerjini maksimize eder."
                        : dailyMetabolicPerformance > 60
                        ? "Metabolik yükün sınırda. Bir sonraki öğününde lif ve protein miktarını artırıp karbonhidratı azaltarak dengeleyebilirsin."
                        : "Bugün glikoz yükün oldukça yüksek. İnsülin direnci riskini azaltmak için bol su içmeli ve hafif bir yürüyüş yapmalısın."}
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
                        {item.suggestion}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modals Follow Below */}

      {/* Plate Builder Floating Panel - Adjusted for Bottom Nav */}
      <div className="fixed bottom-24 lg:bottom-8 right-4 xs:right-8 z-[150]">
        <motion.button
          whileHover={{ scale: 1.05, y: -5 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setIsPlateOpen(!isPlateOpen)}
          className="w-20 h-20 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-700 text-black flex items-center justify-center shadow-[0_10px_40px_rgba(16,185,129,0.4)] relative group"
        >
          <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity rounded-full" />
          <Utensils size={32} />
          {plate.length > 0 && (
            <motion.div 
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className={`absolute -top-2 -right-2 w-9 h-9 rounded-full flex items-center justify-center text-[1rem] font-black shadow-2xl z-20 border-2 ${darkMode ? 'bg-[#2DFF73] text-black border-[#0A0A0A]' : 'bg-black text-white border-white'}`}
            >
              {plate.length}
            </motion.div>
          )}
        </motion.button>

        <AnimatePresence>
          {isPlateOpen && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20, x: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0, x: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20, x: 20 }}
              className={`absolute bottom-24 right-0 w-[calc(100vw-40px)] md:w-[400px] max-h-[calc(100vh-140px)] overflow-y-auto custom-scrollbar rounded-[3rem] border shadow-2xl flex flex-col ${darkMode ? 'bg-[#0A0A0A] border-white/10 glass' : 'bg-[#F5F5F0] border-black/10 light-glass'}`}
            >
              <div className={`sticky top-0 z-30 p-8 pb-4 backdrop-blur-xl border-b ${darkMode ? 'bg-[#0A0A0A]/80 border-white/5' : 'bg-[#F5F5F0]/80 border-black/5'}`}>
                <div className="flex items-center justify-between">
                  <h3 className={`text-[1.8rem] font-black tracking-tighter bg-gradient-to-br bg-clip-text text-transparent ${darkMode ? 'from-white to-zinc-500' : 'from-black to-zinc-600'}`}>Tabağım</h3>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => setPlate([])}
                      className="text-[0.65rem] font-black uppercase tracking-widest text-zinc-500 hover:text-red-400 transition-colors mr-2"
                    >
                      Temizle
                    </button>
                    <button 
                      onClick={() => setIsPlateOpen(false)}
                      className={`w-10 h-10 rounded-full border flex items-center justify-center transition-all ${darkMode ? 'bg-white/5 border-white/10 text-zinc-400 hover:bg-white/10' : 'bg-black/5 border-black/10 text-zinc-500 hover:bg-black/10'}`}
                    >
                      <X size={20} />
                    </button>
                  </div>
                </div>
              </div>

              <div className="p-8 pt-4">

                {plate.length === 0 ? (
                  <div className="py-12 text-center">
                    <div className={`w-20 h-20 rounded-full border flex items-center justify-center mx-auto mb-6 ${darkMode ? 'bg-white/5 border-white/10' : 'bg-black/5 border-black/10'}`}>
                      <Utensils size={32} className="text-zinc-600" />
                    </div>
                    <p className="text-zinc-500 font-medium">Tabağın henüz boş.</p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                      {plate.map((p, i) => (
                        <div key={i} className={`flex items-center justify-between p-4 border rounded-2xl group transition-all ${darkMode ? 'bg-white/5 border-white/10 hover:border-emerald-500/30' : 'bg-black/5 border-black/10 hover:border-emerald-500/30 shadow-sm'}`}>
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-400 font-black text-[0.8rem]">
                              {i + 1}
                            </div>
                            <div>
                              <p className={`font-bold text-[0.9rem] ${darkMode ? 'text-zinc-100' : 'text-zinc-900'}`}>{p.isim}</p>
                              <p className="text-zinc-500 text-[0.75rem] font-medium">{p.kal} kcal</p>
                            </div>
                          </div>
                          <button 
                            onClick={() => removeFromPlate(i)}
                            className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${darkMode ? 'bg-white/5 text-zinc-500 hover:bg-red-500/20 hover:text-red-400' : 'bg-black/5 text-zinc-500 hover:bg-red-500/20 hover:text-red-400'}`}
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      ))}
                    </div>

                    {plateAnalysis && (
                      <div className={`p-6 rounded-[2rem] border relative overflow-hidden ${darkMode ? 'bg-gradient-to-br from-emerald-500/10 to-blue-500/10 border-white/10' : 'bg-gradient-to-br from-emerald-500/5 to-blue-500/5 border-black/10 shadow-lg'}`}>
                        <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 blur-[50px] rounded-full -mr-16 -mt-16" />
                        <div className="relative z-10">
                          <div className="flex items-center justify-between mb-4">
                            <span className="text-[0.75rem] font-black uppercase text-zinc-400 tracking-widest">Tabak Analizi</span>
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                              <span className="text-emerald-400 text-[0.75rem] font-black uppercase tracking-widest">Canlı</span>
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-6 mb-8">
                <div className={`p-4 rounded-2xl border ${darkMode ? 'bg-white/5 border-white/5' : 'bg-black/5 border-black/5 shadow-sm'}`}>
                  <p className="text-[0.65rem] font-black uppercase text-zinc-500 mb-2 tracking-[0.2em]">İnsülin Skoru</p>
                  <div className="flex items-end gap-2">
                    <p className="text-[2.2rem] font-black tracking-tighter leading-none" style={{ color: getRingColor(plateAnalysis.m), textShadow: darkMode ? `0 0 15px ${getRingColor(plateAnalysis.m)}40` : 'none' }}>
                      {plateAnalysis.m}
                    </p>
                    <span className="text-[0.8rem] font-black text-zinc-600 mb-1">/10</span>
                  </div>
                </div>
                <div className={`p-4 rounded-2xl border ${darkMode ? 'bg-white/5 border-white/5' : 'bg-black/5 border-black/5 shadow-sm'}`}>
                  <p className="text-[0.65rem] font-black uppercase text-zinc-500 mb-2 tracking-[0.2em]">Sağlık Skoru</p>
                  <div className="flex items-end gap-2">
                    <p className="text-[2.2rem] font-black tracking-tighter leading-none" style={{ color: getRingColor(plateAnalysis.n), textShadow: darkMode ? `0 0 15px ${getRingColor(plateAnalysis.n)}40` : 'none' }}>
                      {plateAnalysis.n}
                    </p>
                    <span className="text-[0.8rem] font-black text-zinc-600 mb-1">/10</span>
                  </div>
                </div>
                          </div>
                          
                          <div className={`p-6 rounded-[1.5rem] border mb-8 relative group/verdict backdrop-blur-md ${darkMode ? 'bg-black/40 border-white/5' : 'bg-white/40 border-black/5 shadow-sm'}`}>
                            <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500/50 rounded-full" />
                            <p className={`text-[0.85rem] leading-relaxed italic font-medium ${darkMode ? 'text-zinc-300' : 'text-zinc-700'}`}>"{plateAnalysis.verdict}"</p>
                          </div>

                          <div className="grid grid-cols-4 gap-3 text-center mb-8">
                            {[
                              { val: plateAnalysis.totalKal, label: 'kcal' },
                              { val: `${plateAnalysis.totalKarb}g`, label: 'karb' },
                              { val: `${plateAnalysis.totalPro}g`, label: 'pro' },
                              { val: `${plateAnalysis.totalLif}g`, label: 'lif' }
                            ].map((stat, i) => (
                              <div key={i} className={`py-3 rounded-2xl border transition-colors ${darkMode ? 'bg-white/5 border-white/5 hover:bg-white/10' : 'bg-black/5 border-black/5 hover:bg-black/10 shadow-sm'}`}>
                                <div className={`text-[0.9rem] font-black tracking-tight ${darkMode ? 'text-white' : 'text-black'}`}>{stat.val}</div>
                                <div className="text-[0.55rem] text-zinc-500 font-black uppercase tracking-widest mt-1">{stat.label}</div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}

                    <button 
                      className="w-full py-5 rounded-[2rem] bg-[#2DFF73] text-black font-black uppercase tracking-[0.2em] text-[0.8rem] hover:scale-[1.02] active:scale-[0.98] transition-all shadow-[0_10px_30px_rgba(45,255,115,0.2)]"
                      onClick={() => setIsPlateOpen(false)}
                    >
                      Analizi Kapat
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
