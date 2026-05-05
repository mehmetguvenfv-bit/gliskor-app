/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect, useCallback, ReactNode, ErrorInfo } from 'react';
import { Search, X, ChevronRight, Info, Brain, Loader2, AlertTriangle, Lightbulb, Droplets, Beef, Wheat, Plus, Minus, Edit2, Trash2, Moon, Activity, Leaf, Thermometer, CheckCircle2, Zap, Utensils, ShoppingBasket, Sparkles, User, History, Sun, Waves, Camera, Upload, Image as ImageIcon, Trophy, Star, Target, Flame, Award, RefreshCcw, Mic, MicOff } from 'lucide-react';

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
import { analyzeFood, getNutritionData, analyzePlateImage, getCoachResponse, analyzeBarcode, type AnalysisResult, type NutritionData, type PlateAnalysisResult } from './lib/gemini';
import { CURRENT_VERSION, VERSION_HISTORY } from './constants/versions';
import { auth, db, signInWithGoogle, logout } from './lib/firebase';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { doc, setDoc, getDoc, collection, query, where, onSnapshot, addDoc, orderBy, limit, Timestamp, serverTimestamp } from 'firebase/firestore';

interface Food {
  isim: string;
  kat: string;
  gi: number;
  karb: number;
  lif: number;
  pro: number;
  yag: number;
  kal: number;
}

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
  mealType: 'Kahvaltı' | 'Öğle' | 'Akşam' | 'Atıştırmalık';
}

const foods: Food[] = [
  {isim:"Beyaz ekmek",kat:"Tahıllar",gi:75,karb:49,lif:2.7,pro:9.0,yag:3.2,kal:265},
  {isim:"Tam tahıl ekmek",kat:"Tahıllar",gi:51,karb:41,lif:6.8,pro:9.0,yag:3.5,kal:247},
  {isim:"Çavdar ekmeği",kat:"Tahıllar",gi:41,karb:48,lif:5.8,pro:8.5,yag:3.3,kal:259},
  {isim:"Beyaz pirinç",kat:"Tahıllar",gi:72,karb:28,lif:0.4,pro:2.7,yag:0.3,kal:130},
  {isim:"Esmer pirinç",kat:"Tahıllar",gi:55,karb:23,lif:1.8,pro:2.6,yag:0.9,kal:112},
  {isim:"Bulgur",kat:"Tahıllar",gi:46,karb:19,lif:4.5,pro:3.1,yag:0.2,kal:83},
  {isim:"Yulaf ezmesi",kat:"Tahıllar",gi:55,karb:27,lif:4.0,pro:5.0,yag:3.0,kal:150},
  {isim:"Beyaz makarna",kat:"Tahıllar",gi:49,karb:25,lif:1.8,pro:5.0,yag:0.9,kal:131},
  {isim:"Tam buğday makarna",kat:"Tahıllar",gi:42,karb:22,lif:3.9,pro:7.5,yag:0.8,kal:124},
  {isim:"Mısır gevreği",kat:"Tahıllar",gi:81,karb:84,lif:1.2,pro:7.0,yag:0.4,kal:357},
  {isim:"Kinoa",kat:"Tahıllar",gi:53,karb:22,lif:2.8,pro:4.4,yag:1.9,kal:120},
  {isim:"Elma",kat:"Meyveler",gi:36,karb:14,lif:2.4,pro:0.3,yag:0.2,kal:52},
  {isim:"Armut",kat:"Meyveler",gi:38,karb:15,lif:3.1,pro:0.4,yag:0.1,kal:57},
  {isim:"Muz",kat:"Meyveler",gi:62,karb:23,lif:2.6,pro:1.1,yag:0.3,kal:89},
  {isim:"Karpuz",kat:"Meyveler",gi:76,karb:8,lif:0.4,pro:0.6,yag:0.2,kal:30},
  {isim:"Çilek",kat:"Meyveler",gi:40,karb:8,lif:2.0,pro:0.7,yag:0.3,kal:32},
  {isim:"Üzüm",kat:"Meyveler",gi:59,karb:18,lif:0.9,pro:0.7,yag:0.2,kal:69},
  {isim:"Portakal",kat:"Meyveler",gi:43,karb:12,lif:2.4,pro:0.9,yag:0.1,kal:47},
  {isim:"Kavun",kat:"Meyveler",gi:65,karb:8,lif:0.9,pro:0.5,yag:0.2,kal:34},
  {isim:"Kiraz",kat:"Meyveler",gi:22,karb:16,lif:2.1,pro:1.1,yag:0.3,kal:63},
  {isim:"Şeftali",kat:"Meyveler",gi:42,karb:10,lif:1.5,pro:0.9,yag:0.3,kal:39},
  {isim:"Brokoli",kat:"Sebzeler",gi:15,karb:7,lif:2.6,pro:2.8,yag:0.4,kal:34},
  {isim:"Ispanak",kat:"Sebzeler",gi:15,karb:3,lif:2.2,pro:2.9,yag:0.4,kal:23},
  {isim:"Domates",kat:"Sebzeler",gi:30,karb:4,lif:1.2,pro:0.9,yag:0.2,kal:18},
  {isim:"Havuç",kat:"Sebzeler",gi:39,karb:10,lif:2.8,pro:0.9,yag:0.2,kal:41},
  {isim:"Patates (haşlanmış)",kat:"Sebzeler",gi:78,karb:20,lif:1.8,pro:2.0,yag:0.1,kal:87},
  {isim:"Tatlı patates",kat:"Sebzeler",gi:61,karb:20,lif:3.0,pro:1.6,yag:0.1,kal:86},
  {isim:"Mısır",kat:"Sebzeler",gi:52,karb:19,lif:2.0,pro:3.2,yag:1.2,kal:86},
  {isim:"Bezelye",kat:"Sebzeler",gi:48,karb:14,lif:5.0,pro:5.4,yag:0.4,kal:81},
  {isim:"Kabak",kat:"Sebzeler",gi:15,karb:3,lif:1.0,pro:1.2,yag:0.2,kal:17},
  {isim:"Patlıcan",kat:"Sebzeler",gi:20,karb:6,lif:3.0,pro:1.0,yag:0.2,kal:25},
  {isim:"Kola",kat:"İçecekler",gi:63,karb:11,lif:0,pro:0,yag:0,kal:42},
  {isim:"Portakal suyu",kat:"İçecekler",gi:57,karb:10,lif:0.2,pro:0.7,yag:0.2,kal:45},
  {isim:"Çay (şekersiz)",kat:"İçecekler",gi:0,karb:0,lif:0,pro:0.1,yag:0,kal:1},
  {isim:"Türk kahvesi",kat:"İçecekler",gi:0,karb:0,lif:0,pro:0.3,yag:0,kal:2},
  {isim:"Ayran",kat:"İçecekler",gi:35,karb:5,lif:0,pro:3.5,yag:1.5,kal:50},
  {isim:"Enerji içeceği",kat:"İçecekler",gi:68,karb:11,lif:0,pro:0.5,yag:0,kal:45},
  {isim:"Maden suyu",kat:"İçecekler",gi:0,karb:0,lif:0,pro:0,yag:0,kal:0},
  {isim:"Süt (tam yağlı)",kat:"Süt ürünleri",gi:27,karb:5,lif:0,pro:3.2,yag:3.9,kal:61},
  {isim:"Yoğurt (sade)",kat:"Süt ürünleri",gi:36,karb:7,lif:0,pro:5.7,yag:3.3,kal:61},
  {isim:"Meyveli yoğurt",kat:"Süt ürünleri",gi:33,karb:19,lif:0.1,pro:3.5,yag:1.2,kal:95},
  {isim:"Beyaz peynir",kat:"Süt ürünleri",gi:0,karb:1,lif:0,pro:18.0,yag:20.0,kal:264},
  {isim:"Kaşar peyniri",kat:"Süt ürünleri",gi:0,karb:1.3,lif:0,pro:25.0,yag:33.0,kal:393},
  {isim:"Dondurma",kat:"Süt ürünleri",gi:57,karb:24,lif:0,pro:3.5,yag:7.0,kal:207},
  {isim:"Kefir",kat:"Süt ürünleri",gi:32,karb:5,lif:0,pro:3.8,yag:3.5,kal:52},
  {isim:"Kuru fasulye",kat:"Baklagiller",gi:24,karb:22,lif:6.4,pro:8.7,yag:0.5,kal:127},
  {isim:"Nohut",kat:"Baklagiller",gi:28,karb:27,lif:7.6,pro:8.9,yag:2.6,kal:164},
  {isim:"Kırmızı mercimek",kat:"Baklagiller",gi:26,karb:20,lif:7.9,pro:9.0,yag:0.4,kal:116},
  {isim:"Yeşil mercimek",kat:"Baklagiller",gi:30,karb:20,lif:7.0,pro:9.0,yag:0.4,kal:116},
  {isim:"Barbunya",kat:"Baklagiller",gi:39,karb:22,lif:6.5,pro:8.7,yag:0.5,kal:127},
  {isim:"Bakla",kat:"Baklagiller",gi:40,karb:20,lif:8.0,pro:7.6,yag:0.5,kal:110},
  {isim:"Mercimek çorbası",kat:"Türk yemekleri",gi:29,karb:10,lif:5.0,pro:6.5,yag:2.5,kal:85},
  {isim:"Tarhana çorbası",kat:"Türk yemekleri",gi:52,karb:14,lif:1.8,pro:4.0,yag:2.5,kal:93},
  {isim:"Beyaz pilav",kat:"Türk yemekleri",gi:72,karb:28,lif:0.4,pro:2.5,yag:2.8,kal:145},
  {isim:"Peynirli börek",kat:"Türk yemekleri",gi:59,karb:30,lif:1.2,pro:7.5,yag:12.0,kal:258},
  {isim:"İmam bayıldı",kat:"Türk yemekleri",gi:30,karb:10,lif:3.2,pro:1.8,yag:8.0,kal:118},
  {isim:"Karnıyarık",kat:"Türk yemekleri",gi:35,karb:12,lif:3.5,pro:8.0,yag:10.0,kal:170},
  {isim:"Kuru fasulye yemeği",kat:"Türk yemekleri",gi:24,karb:22,lif:6.4,pro:8.7,yag:4.0,kal:160},
  {isim:"Adana kebap",kat:"Protein Kaynakları",gi:5,karb:1,lif:0.6,pro:14.0,yag:19.0,kal:239},
  {isim:"Döner (tavuk)",kat:"Protein Kaynakları",gi:10,karb:2,lif:0.3,pro:20.0,yag:8.0,kal:165},
  {isim:"Mantı",kat:"Türk yemekleri",gi:55,karb:30,lif:1.5,pro:12.0,yag:8.0,kal:240},
  {isim:"Lahmacun",kat:"Türk yemekleri",gi:60,karb:32,lif:1.8,pro:10.0,yag:7.0,kal:230},
  {isim:"Pide (peynirli)",kat:"Türk yemekleri",gi:65,karb:35,lif:1.5,pro:12.0,yag:8.0,kal:260},
  {isim:"Dolma (zeytinyağlı)",kat:"Türk yemekleri",gi:35,karb:18,lif:2.0,pro:2.5,yag:5.0,kal:128},
  {isim:"Cacık",kat:"Türk yemekleri",gi:15,karb:4,lif:0.5,pro:3.5,yag:3.0,kal:57},
  {isim:"Humus",kat:"Türk yemekleri",gi:25,karb:12,lif:4.0,pro:5.0,yag:6.0,kal:116},
  {isim:"Simit",kat:"Tahıllar",gi:70,karb:57,lif:2.5,pro:10,yag:4,kal:310},
  {isim:"Poğaça (peynirli)",kat:"Tahıllar",gi:65,karb:38,lif:1.5,pro:8,yag:15,kal:310},
  {isim:"Sucuklu Yumurta",kat:"Türk yemekleri",gi:5,karb:2,lif:0.5,pro:15,yag:25,kal:290},
  {isim:"Menemen",kat:"Türk yemekleri",gi:30,karb:8,lif:2.5,pro:12,yag:18,kal:240},
  {isim:"Kısır",kat:"Türk yemekleri",gi:45,karb:25,lif:6,pro:5,yag:12,kal:220},
  {isim:"İçli Köfte (haşlanmış)",kat:"Türk yemekleri",gi:50,karb:28,lif:4,pro:12,yag:15,kal:290},
  {isim:"Kumpir (sade)",kat:"Türk yemekleri",gi:75,karb:45,lif:5,pro:6,yag:10,kal:290},
  {isim:"Pekmez",kat:"İçecekler",gi:75,karb:75,lif:0,pro:0,yag:0,kal:290},
  {isim:"Bal",kat:"İçecekler",gi:65,karb:82,lif:0,pro:0.3,yag:0,kal:304},
  {isim:"Tahin",kat:"Kuruyemişler",gi:25,karb:21,lif:9,pro:18,yag:54,kal:640},
  {isim:"Pekmez-Tahin",kat:"Türk yemekleri",gi:45,karb:48,lif:4.5,pro:9,yag:27,kal:442},
  {isim:"Zeytin (siyah)",kat:"Sebzeler",gi:15,karb:6,lif:3,pro:1,yag:11,kal:115},
  {isim:"Zeytin (yeşil)",kat:"Sebzeler",gi:15,karb:4,lif:3,pro:1,yag:15,kal:145},
  {isim:"Yumurta (haşlanmış)",kat:"Protein Kaynakları",gi:0,karb:1,lif:0,pro:13,yag:11,kal:155},
  {isim:"Pastırma",kat:"Türk yemekleri",gi:0,karb:1,lif:0,pro:30,yag:12,kal:230},
  {isim:"Sucuk",kat:"Türk yemekleri",gi:0,karb:2,lif:0,pro:14,yag:30,kal:330},
  {isim:"Sosis",kat:"Türk yemekleri",gi:0,karb:2,lif:0,pro:12,yag:28,kal:310},
  {isim:"Salam",kat:"Türk yemekleri",gi:0,karb:3,lif:0,pro:13,yag:25,kal:290},
  {isim:"Tavuk Nugget",kat:"Türk yemekleri",gi:45,karb:15,lif:0.5,pro:14,yag:18,kal:280},
  {isim:"Peksimet",kat:"Tahıllar",gi:70,karb:70,lif:3,pro:10,yag:5,kal:365},
  {isim:"Gözleme (peynirli)",kat:"Türk yemekleri",gi:60,karb:40,lif:2,pro:10,yag:15,kal:335},
  {isim:"Boyoz",kat:"Tahıllar",gi:75,karb:45,lif:1.5,pro:7,yag:25,kal:430},
  {isim:"Kumru",kat:"Türk yemekleri",gi:70,karb:40,lif:2,pro:15,yag:25,kal:445},
  {isim:"Acem Pilavı",kat:"Türk yemekleri",gi:72,karb:35,lif:1.5,pro:8,yag:12,kal:280},
  {isim:"Acılı Ezme",kat:"Türk yemekleri",gi:25,karb:8,lif:2.5,pro:1.5,yag:4,kal:75},
  {isim:"Ada Çayı",kat:"İçecekler",gi:0,karb:0.5,lif:0,pro:0,yag:0,kal:2},
  {isim:"Adana Dürüm",kat:"Türk yemekleri",gi:65,karb:45,lif:2.5,pro:22,yag:28,kal:520},
  {isim:"Ahududu Nektarı",kat:"İçecekler",gi:60,karb:12,lif:0.2,pro:0.2,yag:0,kal:50},
  {isim:"Ahududu Reçeli",kat:"İçecekler",gi:65,karb:65,lif:1.5,pro:0.5,yag:0,kal:260},
  {isim:"Akıtma",kat:"Tahıllar",gi:65,karb:45,lif:1.2,pro:8,yag:12,kal:320},
  {isim:"Alabalık (Füme)",kat:"Türk yemekleri",gi:0,karb:0,lif:0,pro:24,yag:8,kal:170},
  {isim:"Mercimek Köftesi",kat:"Türk yemekleri",gi:35,karb:22,lif:6,pro:8,yag:10,kal:210},
  {isim:"Zeytinyağlı Taze Fasulye",kat:"Sebzeler",gi:25,karb:8,lif:3.5,pro:2,yag:6,kal:95},
  {isim:"Tavuk Suyu Çorba",kat:"Türk yemekleri",gi:30,karb:5,lif:0.5,pro:8,yag:4,kal:85},
  {isim:"Ayva Tatlısı",kat:"Türk yemekleri",gi:65,karb:45,lif:3,pro:0.5,yag:0,kal:180},
  {isim:"Sütlaç",kat:"Türk yemekleri",gi:60,karb:35,lif:0.5,pro:4,yag:3,kal:185},
  {isim:"Baklava",kat:"Türk yemekleri",gi:75,karb:55,lif:1,pro:5,yag:25,kal:460},
  {isim:"Kısır (bol yeşillikli)",kat:"Türk yemekleri",gi:40,karb:20,lif:7,pro:4,yag:10,kal:185},
  {isim:"Mücver",kat:"Türk yemekleri",gi:50,karb:15,lif:2.5,pro:6,yag:12,kal:195},
  {isim:"Hamsi Tava",kat:"Türk yemekleri",gi:45,karb:10,lif:0.5,pro:18,yag:15,kal:250},
  {isim:"Palamut Izgara",kat:"Türk yemekleri",gi:0,karb:0,lif:0,pro:22,yag:12,kal:200},
  {isim:"Kuzu Şiş",kat:"Protein Kaynakları",gi:0,karb:0,lif:0,pro:25,yag:18,kal:260},
  {isim:"Kelle Paça Çorbası",kat:"Türk yemekleri",gi:10,karb:2,lif:0,pro:15,yag:12,kal:180},
  {isim:"İşkembe Çorbası",kat:"Türk yemekleri",gi:15,karb:3,lif:0,pro:12,yag:10,kal:150},
  {isim:"Sarma (etli)",kat:"Türk yemekleri",gi:45,karb:15,lif:2.5,pro:10,yag:12,kal:210},
  {isim:"Közlenmiş Patlıcan Salatası",kat:"Sebzeler",gi:15,karb:5,lif:3,pro:1.5,yag:5,kal:70},
  {isim:"Közlenmiş Biber",kat:"Sebzeler",gi:15,karb:6,lif:2.5,pro:1,yag:4,kal:65},
  {isim:"Semizotu Yemeği",kat:"Sebzeler",gi:15,karb:4,lif:2,pro:2,yag:5,kal:70},
  {isim:"Bamya Yemeği",kat:"Sebzeler",gi:20,karb:7,lif:3.5,pro:2,yag:4,kal:75},
  {isim:"Enginar (zeytinyağlı)",kat:"Sebzeler",gi:20,karb:10,lif:5,pro:3,yag:6,kal:110},
  {isim:"Kereviz (zeytinyağlı)",kat:"Sebzeler",gi:25,karb:9,lif:3,pro:1.5,yag:5,kal:90},
  {isim:"Pırasa (zeytinyağlı)",kat:"Sebzeler",gi:30,karb:12,lif:3,pro:2,yag:5,kal:105},
  {isim:"Ispanak Borani",kat:"Türk yemekleri",gi:15,karb:5,lif:2.5,pro:4,yag:6,kal:95},
  {isim:"Şakşuka",kat:"Türk yemekleri",gi:40,karb:12,lif:3,pro:2,yag:15,kal:190},
  {isim:"Haydari",kat:"Türk yemekleri",gi:15,karb:4,lif:0,pro:6,yag:12,kal:150},
  {isim:"Gavurdağı Salatası",kat:"Türk yemekleri",gi:15,karb:6,lif:3,pro:2,yag:12,kal:140},
  {isim:"Çoban Salatası",kat:"Türk yemekleri",gi:15,karb:5,lif:2,pro:1,yag:5,kal:70},
  {isim:"Piyaz",kat:"Türk yemekleri",gi:30,karb:15,lif:6,pro:8,yag:10,kal:185},
  {isim:"Revani",kat:"Türk yemekleri",gi:70,karb:50,lif:0.5,pro:4,yag:12,kal:320},
  {isim:"Şekerpare",kat:"Türk yemekleri",gi:70,karb:55,lif:0.5,pro:3,yag:15,kal:360},
  {isim:"Kadayıf",kat:"Türk yemekleri",gi:75,karb:60,lif:1,pro:4,yag:18,kal:420},
  {isim:"Güllaç",kat:"Türk yemekleri",gi:60,karb:40,lif:0.5,pro:5,yag:6,kal:235},
  {isim:"Aşure",kat:"Türk yemekleri",gi:55,karb:45,lif:6,pro:6,yag:8,kal:280},
  {isim:"Kabak Tatlısı",kat:"Türk yemekleri",gi:65,karb:35,lif:3,pro:1,yag:5,kal:190},
  {isim:"Helva (irmik)",kat:"Türk yemekleri",gi:70,karb:55,lif:1,pro:4,yag:20,kal:410},
  {isim:"Helva (un)",kat:"Türk yemekleri",gi:75,karb:60,lif:0.5,pro:3,yag:25,kal:480},
  {isim:"Lokum",kat:"Türk yemekleri",gi:80,karb:85,lif:0,pro:0,yag:0,kal:340},
  {isim:"Pişi",kat:"Türk yemekleri",gi:75,karb:45,lif:1,pro:7,yag:20,kal:390},
  {isim:"Bazlama",kat:"Tahıllar",gi:65,karb:50,lif:2,pro:8,yag:3,kal:260},
  {isim:"Lavaş",kat:"Tahıllar",gi:70,karb:55,lif:2,pro:9,yag:4,kal:290},
  {isim:"Yufka",kat:"Tahıllar",gi:70,karb:60,lif:1.5,pro:10,yag:2,kal:300},
  {isim:"Kraker (tuzlu)",kat:"Tahıllar",gi:70,karb:65,lif:2,pro:8,yag:15,kal:430},
  {isim:"Bisküvi (sade)",kat:"Tahıllar",gi:70,karb:70,lif:1.5,pro:6,yag:18,kal:470},
  {isim:"Gofret",kat:"Tahıllar",gi:75,karb:65,lif:1,pro:5,yag:25,kal:510},
  {isim:"Cips (patates)",kat:"Tahıllar",gi:80,karb:50,lif:3,pro:6,yag:35,kal:540},
  {isim:"Patlamış Mısır (yağlı)",kat:"Tahıllar",gi:65,karb:55,lif:10,pro:9,yag:25,kal:480},
  {isim:"Kestane (haşlanmış)",kat:"Meyveler",gi:60,karb:45,lif:8,pro:3,yag:2,kal:210},
  {isim:"Kestane (kebap)",kat:"Meyveler",gi:65,karb:50,lif:8,pro:3,yag:2,kal:230},
  {isim:"Hurma",kat:"Meyveler",gi:70,karb:75,lif:7,pro:2,yag:0.5,kal:280},
  {isim:"Kuru Üzüm",kat:"Meyveler",gi:65,karb:79,lif:4,pro:3,yag:0.5,kal:300},
  {isim:"Kuru Kayısı",kat:"Meyveler",gi:35,karb:63,lif:7,pro:3,yag:0.5,kal:240},
  {isim:"Kuru İncir",kat:"Meyveler",gi:50,karb:64,lif:10,pro:3,yag:1,kal:250},
  {isim:"Ceviz",kat:"Kuruyemişler",gi:15,karb:14,lif:7,pro:15,yag:65,kal:700},
  {isim:"Fındık",kat:"Kuruyemişler",gi:15,karb:17,lif:10,pro:15,yag:61,kal:680},
  {isim:"Badem",kat:"Kuruyemişler",gi:15,karb:22,lif:12,pro:21,yag:50,kal:620},
  {isim:"Antep Fıstığı",kat:"Kuruyemişler",gi:15,karb:28,lif:10,pro:20,yag:45,kal:600},
  {isim:"Yer Fıstığı",kat:"Kuruyemişler",gi:15,karb:16,lif:9,pro:26,yag:49,kal:610},
  {isim:"Ay Çekirdeği",kat:"Kuruyemişler",gi:15,karb:20,lif:9,pro:21,yag:51,kal:580},
  {isim:"Kabak Çekirdeği",kat:"Kuruyemişler",gi:15,karb:11,lif:6,pro:30,yag:49,kal:560},
  {isim:"Leblebi (sarı)",kat:"Baklagiller",gi:30,karb:58,lif:15,pro:20,yag:6,kal:360},
  {isim:"Leblebi (beyaz)",kat:"Baklagiller",gi:30,karb:60,lif:15,pro:19,yag:5,kal:350},
  {isim:"Bira",kat:"Alkol",gi:70,karb:4,lif:0,pro:0.5,yag:0,kal:43},
  {isim:"Şarap (sek)",kat:"Alkol",gi:0,karb:2.6,lif:0,pro:0.1,yag:0,kal:85},
  {isim:"Rakı",kat:"Alkol",gi:0,karb:2,lif:0,pro:0,yag:0,kal:285},
  {isim:"Votka",kat:"Alkol",gi:0,karb:0,lif:0,pro:0,yag:0,kal:230},
  {isim:"Viski",kat:"Alkol",gi:0,karb:0,lif:0,pro:0,yag:0,kal:250},
  {isim:"Tatlı Kokteyl",kat:"Alkol",gi:85,karb:25,lif:0,pro:0,yag:0,kal:200},
  {isim:"Alabalık Kızartma",kat:"Türk yemekleri",gi:45,karb:8,lif:0,pro:22,yag:15,kal:260},
  {isim:"Alaca Çorbası",kat:"Türk yemekleri",gi:35,karb:18,lif:6,pro:8,yag:5,kal:145},
  {isim:"Ali Nazik",kat:"Türk yemekleri",gi:30,karb:12,lif:4,pro:15,yag:18,kal:240},
  {isim:"Altın Çörek",kat:"Tahıllar",gi:70,karb:55,lif:2,pro:8,yag:15,kal:380},
  {isim:"Amasra Salatası",kat:"Sebzeler",gi:15,karb:6,lif:3,pro:2,yag:8,kal:110},
  {isim:"Amerikan Salatası",kat:"Türk yemekleri",gi:45,karb:12,lif:2,pro:3,yag:25,kal:280},
  {isim:"Anadolu Çorbası",kat:"Türk yemekleri",gi:40,karb:20,lif:5,pro:7,yag:4,kal:140},
  {isim:"Analı Kızlı Çorba",kat:"Türk yemekleri",gi:45,karb:25,lif:4,pro:12,yag:10,kal:230},
  {isim:"Ananas Konservesi",kat:"Meyveler",gi:65,karb:15,lif:1.5,pro:0.5,yag:0.1,kal:60},
  {isim:"Ananas Nektarı",kat:"İçecekler",gi:60,karb:13,lif:0.2,pro:0.3,yag:0.1,kal:55},
  {isim:"Ananas Reçeli",kat:"İçecekler",gi:65,karb:65,lif:1,pro:0.4,yag:0,kal:260},
];

function calculateGY(f: Food) {
  const net = Math.max(0, f.karb - f.lif);
  return Math.round((f.gi * net) / 100 * 10) / 10;
}

function isProcessedMeat(name: string) {
  const processedKeywords = ['sucuk', 'salam', 'sosis', 'pastırma', 'nugget', 'jambon', 'füme'];
  return processedKeywords.some(kw => name.toLowerCase().includes(kw));
}

function generateStaticAnalysis(f: Food) {
  const gy = calculateGY(f);
  const gi = f.gi;
  const lif = f.lif;
  const pro = f.pro;

  let metabolicEffect = "";
  let functionalBenefit = "";
  let warning = "";
  const profileComments = {
    weightLoss: "",
    diabetic: "",
    athlete: "",
    celiac: ""
  };

  // Metabolic Effect
  if (gi > 70) {
    metabolicEffect = "Yüksek glisemik indeks nedeniyle kan şekerinde ani yükselmeye ve ardından hızlı insülin salınımına neden olur. Bu durum yağ depolama fazını tetikleyebilir.";
  } else if (gi > 55) {
    metabolicEffect = "Orta düzeyde glisemik etkiye sahiptir. Kan şekerini dengeli bir hızda yükseltir, ancak porsiyon kontrolü metabolik sağlık için kritiktir.";
  } else {
    metabolicEffect = "Düşük glisemik indeksi sayesinde kan şekerini yavaş ve dengeli yükseltir. İnsülin yanıtı stabildir, uzun süreli tokluk hissi sağlar.";
  }

  if (gy > 20) {
    metabolicEffect += " Glisemik yükü yüksek olduğu için toplam insülin yükü fazladır.";
  }

  // Functional Benefit
  if (lif > 5) {
    functionalBenefit = "Yüksek lif içeriği sayesinde sindirim sistemini destekler ve bağırsak mikrobiyotasını besler. Şeker emilimini yavaşlatır.";
  } else if (pro > 15) {
    functionalBenefit = "Yüksek protein içeriği kas onarımını destekler ve termojenik etkisiyle metabolizmaya canlandırır. Tokluk süresini uzatır.";
  } else if (f.kat === 'Kuruyemişler') {
    functionalBenefit = "Sağlıklı yağ asitleri ve E vitamini kaynağıdır. Hücre zarını korur ve beyin sağlığını destekler.";
  } else if (f.kat === 'Protein Kaynakları') {
    functionalBenefit = "Vücudun temel yapı taşıdır. Kas kütlesini korur ve metabolik hızı artırır.";
  } else if (f.kat.includes("Sebze")) {
    functionalBenefit = "Zengin mikrobesin ve antioksidan içeriğiyle hücresel sağlığı korur, enflamasyonu azaltmaya yardımcı olur.";
  } else {
    functionalBenefit = "Temel enerji kaynağı sağlar. Yanında lifli gıdalarla tüketilmesi metabolik verimliliği artırır.";
  }

  // Profile Comments
  if (f.kat === 'Alkol') {
    profileComments.weightLoss = "Alkol yağ yakımını 24 saate kadar durdurabilir. Kilo verme sürecinde tamamen kaçınılmalıdır.";
    profileComments.diabetic = "Alkol şeker metabolizmasını bozar ve hipoglisemi riskini artırır. Çok tehlikelidir.";
    profileComments.athlete = "Alkol protein sentezini engeller ve toparlanma sürecini ciddi şekilde yavaşlatır.";
  } else if (gi > 60 || gy > 15) {
    profileComments.weightLoss = "Porsiyon kontrolü hayati önem taşır; yanında mutlaka bol sirkeli bir yeşil salata tüketilmelidir.";
    profileComments.diabetic = "Yüksek glisemik yük nedeniyle kan şekerinde ani dalgalanmalara yol açar, tüketilecekse çok küçük porsiyonda kalmalıdır.";
    profileComments.athlete = "Antrenman sonrası glikojen depolarını doldurmak için etkili bir yakıt olabilir ancak sedanter dönemde sınırlanmalıdır.";
  } else {
    profileComments.weightLoss = "Düşük kalorili ve doyurucu yapısıyla kilo verme sürecinde güvenle tercih edilebilir.";
    profileComments.diabetic = "Kan şekeri dostu bir besindir, diyabetik bireyler için ideal bir karbonhidrat kaynağıdır.";
    profileComments.athlete = "Antrenman öncesi sürdürülebilir enerji sağlamak için mükemmel bir seçimdir.";
  }

  profileComments.celiac = f.kat.includes("Tahıl") && !f.isim.toLowerCase().includes("karabuğday") && !f.isim.toLowerCase().includes("pirinç") && !f.isim.toLowerCase().includes("mısır")
    ? "Gluten içerir; çölyak hastaları ve gluten hassasiyeti olanlar için uygun değildir."
    : "Doğal olarak gluten içermez ancak çapraz bulaşma riskine karşı dikkatli olunmalıdır.";

  // Warning
  if (f.kat === 'Alkol') {
    warning = "Alkol karaciğer yükünü artırır ve metabolizmayı dondurur. Özellikle Rakı gibi yüksek alkollü içecekler metabolik sağlığı ciddi şekilde tehdit eder.";
  } else if (gi > 70) {
    warning = "Bu besin yüksek glisemik indekse sahiptir. Tek başına tüketmek yerine mutlaka protein veya sağlıklı yağlarla eşleştirin.";
  } else if (isProcessedMeat(f.isim)) {
    warning = "İşlenmiş et ürünleri yüksek sodyum ve katkı maddesi içerir. Tüketim sıklığını minimumda tutun.";
  } else {
    warning = "Dengeli bir öğün için porsiyon kontrolüne dikkat edin ve bol su ile destekleyin.";
  }

  const circadianData = [
    { hour: '08:00', impact: Math.max(1, 10 - (gi / 15)), label: gi > 70 ? 'Riskli' : 'İdeal' },
    { hour: '12:00', impact: Math.max(1, 10 - (gi / 20)), label: gi > 70 ? 'Dikkat' : 'İdeal' },
    { hour: '16:00', impact: Math.max(1, 10 - (gi / 18)), label: gi > 70 ? 'Dikkat' : 'İdeal' },
    { hour: '20:00', impact: Math.max(1, 10 - (gi / 12)), label: 'Riskli' },
    { hour: '00:00', impact: Math.max(1, 10 - (gi / 8)), label: 'Kritik' }
  ];

  return {
    metabolicEffect,
    functionalBenefit,
    profileComments,
    warning,
    insulinEffect: gi > 70 ? "Yüksek" : gi > 55 ? "Orta" : "Düşük",
    circadianData
  };
}

type MealSequence = 'standard' | 'carbsFirst' | 'ideal';

function GlucoseCurve({ gi, gy, color, darkMode }: { gi: number, gy: number, color: string, darkMode: boolean }) {
  const height = Math.min(30, (gy / 20) * 25 + 5);
  const peakX = Math.max(20, 50 - (gi / 100) * 15);
  
  return (
    <div className={`mt-4 h-[50px] w-full rounded-2xl overflow-hidden relative border group/curve ${darkMode ? 'bg-white/5 border-white/10' : 'bg-black/5 border-black/10'}`}>
      <div className={`absolute inset-0 opacity-0 group-hover/curve:opacity-100 transition-opacity ${darkMode ? 'bg-white/5' : 'bg-black/5'}`} />
      <svg width="100%" height="50" viewBox="0 0 100 50" preserveAspectRatio="none" className="absolute bottom-0">
        <defs>
          <linearGradient id={`grad-${color}`} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={color} stopOpacity="0.3" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        <path 
          d={`M 0 50 Q ${peakX} ${50 - height * 1.5} 100 50`} 
          fill="none" 
          stroke={color} 
          strokeWidth="3"
          strokeLinecap="round"
          className="drop-shadow-[0_0_8px_rgba(255,255,255,0.3)]"
        />
        <path 
          d={`M 0 50 Q ${peakX} ${50 - height * 1.5} 100 50 L 100 50 L 0 50 Z`} 
          fill={`url(#grad-${color})`}
        />
      </svg>
      <div className="absolute top-2 left-4 text-[0.6rem] text-zinc-500 font-black uppercase tracking-[0.2em] opacity-50 group-hover/curve:opacity-100 transition-opacity">Glikoz Eğrisi</div>
    </div>
  );
}

function PairingBox({ food, score }: { food: Food, score: number }) {
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
    <div className="mt-8 p-6 bg-[#2DFF73]/5 border border-[#2DFF73]/20 rounded-[2rem] relative overflow-hidden group/pairing">
      <div className="absolute top-0 right-0 w-32 h-32 bg-[#2DFF73]/10 blur-[50px] -mr-16 -mt-16 group-hover/pairing:bg-[#2DFF73]/20 transition-colors" />
      <div className="text-[0.75rem] font-black text-[#2DFF73] uppercase mb-4 flex items-center gap-2 tracking-[0.2em] relative z-10">
        <div className="w-5 h-5 rounded-full bg-[#2DFF73]/20 flex items-center justify-center">
          <Plus size={12} className="text-[#2DFF73]" strokeWidth={4} />
        </div>
        İDEAL EŞLEŞME
      </div>
      <div className="flex gap-4 relative z-10">
        {selected.map(p => (
          <div key={p.name} className="flex items-center gap-3 bg-white/5 px-4 py-3 rounded-2xl text-[0.85rem] text-zinc-100 border border-white/10 shadow-xl hover:bg-white/10 hover:border-[#2DFF73]/30 transition-all cursor-default">
            <span className="text-xl filter drop-shadow-[0_0_5px_rgba(255,255,255,0.2)]">{p.icon}</span> 
            <span className="font-bold tracking-tight">{p.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function CircadianRhythmWidget({ data, darkMode }: { data: any[], darkMode: boolean }) {
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
                        <div className="text-[1rem] font-black" style={{ color: getRingColor(payload[0].value as number) }}>
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

function MacroDistribution({ karb, pro, yag, darkMode }: { karb: number, pro: number, yag: number, darkMode: boolean }) {
  const data = [
    { name: 'Karb', value: karb, color: '#F59E0B' },
    { name: 'Pro', value: pro, color: '#3B82F6' },
    { name: 'Yağ', value: yag, color: '#EF4444' },
  ].filter(item => item.value > 0);

  const total = data.reduce((acc, curr) => acc + curr.value, 0);

  return (
    <div className={`p-5 xs:p-8 rounded-[1.5rem] sm:rounded-[2.5rem] border ${darkMode ? 'bg-white/5 border-white/5' : 'bg-black/5 border-black/5'} flex flex-col items-center justify-center h-full w-full min-h-[350px] sm:min-h-0`}>
      <div className="text-[0.6rem] xs:text-[0.7rem] font-black text-zinc-500 uppercase tracking-[0.3em] mb-6 w-full text-center">MAKRO DAĞILIMI (100g)</div>
      <div className="w-full h-[180px] xs:h-[220px] relative">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius="65%"
              outerRadius="90%"
              paddingAngle={0}
              minAngle={15}
              dataKey="value"
              stroke={darkMode ? '#121212' : '#F5F5F0'}
              strokeWidth={2}
              animationBegin={0}
              animationDuration={1500}
              startAngle={90}
              endAngle={450}
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <RechartsTooltip 
              contentStyle={{ 
                backgroundColor: darkMode ? '#1A1A1A' : '#FFFFFF', 
                borderRadius: '12px', 
                border: 'none',
                boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                color: darkMode ? '#FFFFFF' : '#000000'
              }}
              itemStyle={{ fontSize: '10px', fontWeight: 'black', textTransform: 'uppercase' }}
              cursor={{ fill: 'transparent' }}
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className={`text-[1.1rem] xs:text-[1.4rem] font-black leading-none ${darkMode ? 'text-white' : 'text-black'}`}>{total.toFixed(1)}g</span>
          <span className="text-[0.45rem] xs:text-[0.55rem] text-zinc-500 font-black uppercase mt-1">Makro</span>
        </div>
      </div>
      <div className="flex flex-wrap justify-center gap-x-4 sm:gap-x-6 gap-y-3 mt-8 w-full">
        {data.map((item) => (
          <div key={item.name} className="flex flex-col items-center min-w-[50px] xs:min-w-[70px]">
            <div className="flex items-center gap-2 mb-1.5">
              <div className="w-2 h-2 xs:w-2.5 h-2.5 rounded-full shadow-sm" style={{ backgroundColor: item.color }}></div>
              <span className="text-[0.55rem] xs:text-[0.65rem] text-zinc-500 font-black uppercase tracking-wider">{item.name}</span>
            </div>
            <span className={`text-[0.8rem] xs:text-[1rem] font-black leading-none ${darkMode ? 'text-white' : 'text-black'}`}>{item.value}g</span>
            <span className="text-[0.55rem] xs:text-[0.6rem] text-zinc-500 font-bold mt-1.5">{total > 0 ? ((item.value / total) * 100).toFixed(0) : 0}%</span>
          </div>
        ))}
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
            <div className="flex gap-4">
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

function calculateMetabolicScore(f: Food, isCooked: boolean = false, mealSequence: MealSequence = 'standard', hasAcid: boolean = false, isLiquid: boolean = false, isResistant: boolean = false, hour: number = new Date().getHours(), isProcessed: boolean = false, hasMovement: boolean = false, highGYCount: number = 0, isLowSleep: boolean = false, isStressed: boolean = false, profile?: any) {
  const lowerName = f.isim.toLowerCase();
  
  // 4. Endüstriyel Şeker & Un Filtresi (Lif 0 kabul et)
  const industrialKeywords = ['bisküvi', 'gofret', 'şekerli', 'şurup', 'lokum', 'baklava'];
  const isIndustrial = industrialKeywords.some(kw => lowerName.includes(kw));
  
  // 2. Gizli Nişasta Filtresi (Kategori Değişimi)
  const hiddenStarchKeywords = ['dolma', 'pilav', 'pirinç', 'köfte', 'mantı', 'börek'];
  const isHiddenStarch = hiddenStarchKeywords.some(kw => lowerName.includes(kw));

  const tempF = { 
    ...f, 
    lif: isIndustrial ? 0 : f.lif,
    kat: isHiddenStarch ? 'Rafine Karbonhidrat Bazlı' : f.kat
  };

  let effectiveGI = tempF.gi;
  
  if (isProcessed) effectiveGI += 15;

  if (isCooked) {
    if (tempF.kat === 'Sebzeler' && (lowerName.includes('havuç') || lowerName.includes('patates') || lowerName.includes('mısır'))) {
       effectiveGI *= 1.8;
    } else if (tempF.kat === 'Sebzeler' || tempF.kat === 'Tahıllar' || tempF.kat === 'Baklagiller') {
       effectiveGI *= 1.3;
    }
  }

  const net = Math.max(0, tempF.karb - tempF.lif);
  const gy = (effectiveGI * net) / 100;
  
  const giCeza = Math.max(0, (effectiveGI - 45) * 2.5); 
  const gyCeza = Math.max(0, (gy - 10) * 4.0);
  
  let ham = (gy * 3.0) + (effectiveGI * 1.5) + giCeza + gyCeza - (tempF.lif * 12.0) - (tempF.pro * 5.0) - (tempF.yag * 2.5);
  
  const processedKeywords = ['sucuk', 'salam', 'sosis', 'pastırma', 'nugget', 'jambon', 'hazır paketli', 'füme', 'konserve', 'şekerli', 'soslu', 'kızarmış'];
  const isUltraProcessed = processedKeywords.some(kw => lowerName.includes(kw));
  if (isUltraProcessed) {
    const smartPredictionPenalty = ['soslu', 'kızarmış', 'şekerli'].some(kw => lowerName.includes(kw)) ? 120 : 90;
    ham += smartPredictionPenalty;
  }

  const isAnimalProduct = tempF.kat === 'Türk yemekleri' || tempF.kat === 'Süt ürünleri';
  const isHighSaturatedFat = isAnimalProduct && (tempF.yag > 10 && tempF.yag * 9 > tempF.kal * 0.4);
  if (isHighSaturatedFat) ham += 40;

  const isHighFructose = (tempF.kat === 'Meyveler' && tempF.karb > 15) || lowerName.includes('bal') || lowerName.includes('pekmez') || lowerName.includes('reçel');
  if (isHighFructose) ham += 35;

  if (net > 15 && tempF.lif < 1.5) ham += 40;
  if (isLiquid) ham += 60;

  if (isResistant && (tempF.kat === 'Tahıllar' || tempF.kat === 'Baklagiller' || tempF.kat === 'Kuruyemişler' || lowerName.includes('patates'))) {
    ham -= 40;
  }

  if (mealSequence === 'carbsFirst') ham *= 1.3;
  else if (mealSequence === 'ideal') ham *= 0.6;
  
  if (hasAcid) ham *= 0.9;
  if (hasMovement) ham *= 0.8;
  if (tempF.kat === 'Alkol') ham += 100; // Increased penalty for alcohol (liver load)
  if (highGYCount >= 3) ham *= 1.15;
  if (isLowSleep || isStressed) ham *= 1.1;

  if (hour >= 20 || hour < 6) {
    if (net > 10) ham *= 1.2;
  }

  // Profil Bazlı Dinamik Düzeltmeler
  if (profile) {
    // İnsülin Direnci Cezası
    if (profile.insulinResistance === 'Yüksek') ham *= 1.25;
    else if (profile.insulinResistance === 'Orta') ham *= 1.15;
    else if (profile.insulinResistance === 'Düşük') ham *= 1.05;

    // Yaş Cezası (Metabolizma yavaşlaması)
    const age = parseInt(profile.age);
    if (age > 50) ham *= 1.1;
    else if (age > 40) ham *= 1.05;

    // Aktivite Seviyesi Bonusu
    if (profile.activityLevel === 'Çok Aktif') ham *= 0.85;
    else if (profile.activityLevel === 'Aktif') ham *= 0.92;
    else if (profile.activityLevel === 'Sedanter') ham *= 1.1;

    // Hedef Bazlı Düzeltme
    if (profile.goal === 'Kilo Verme' && gy > 10) ham *= 1.15;
    if (profile.goal === 'Kas Kazanımı' && tempF.pro > 15) ham *= 0.9;
  }

  const norm = Math.max(0, Math.min(180, ham));
  let score = Math.max(1, Math.min(10, Math.round(10 - (norm / 180) * 9)));

  const ultraProcessedMeats = ['sosis', 'sucuk', 'salam', 'işlenmiş'];
  if (ultraProcessedMeats.some(kw => lowerName.includes(kw))) score = Math.min(score, 3.5);
  if (lowerName.includes('midye dolma')) score = 2.5;
  
  const offalNames = ['kokoreç', 'ciğer', 'kelle paça'];
  if (offalNames.some(kw => lowerName.includes(kw))) {
    score = Math.max(score, 7.5); 
    if (lowerName.includes('ekmek arası') || lowerName.includes('dürüm')) score = 3.0;
  }

  if (isIndustrial) score = 1.5;
  if (lowerName === 'rakı') score = Math.min(score, 2.0); // Rakı specific hard cap

  return score;
}

function calculateNutritionalScore(f: Food) {
  const lowerName = f.isim.toLowerCase();
  let score = 5.0; // Nötr başlangıç

  // 1. Besin Yoğunluğu (Protein ve Lif Bonusu)
  score += (f.lif * 0.4); // Lif çok değerli
  score += (f.pro * 0.2); // Protein değerli

  // 2. Kalori Yoğunluğu Cezası (Boş kalori filtresi)
  if (f.kal > 400) score -= 1.5;
  else if (f.kal > 250) score -= 0.5;

  // 3. İşlenmişlik Cezası (NOVA Standartları)
  const ultraProcessed = ['sosis', 'sucuk', 'salam', 'bisküvi', 'gofret', 'cips', 'kola', 'enerji içeceği', 'nugget'];
  if (ultraProcessed.some(kw => lowerName.includes(kw))) score -= 4.0;

  // 4. Kategori Bazlı Değerlendirme
  if (f.kat === 'Sebzeler') score += 2.5;
  if (f.kat === 'Baklagiller') score += 2.0;
  if (f.kat === 'Meyveler') score += 1.5;
  if (f.kat === 'Alkol') score -= 5.0;
  if (f.kat === 'İçecekler' && f.karb > 5) score -= 2.0; // Şekerli içecekler

  // 5. Doğallık Bonusu
  const naturalSuperfoods = ['ceviz', 'fındık', 'badem', 'zeytinyağı', 'yumurta', 'balık', 'kefir', 'yoğurt'];
  if (naturalSuperfoods.some(kw => lowerName.includes(kw))) score += 1.5;

  // 6. Şeker Oranı Cezası
  if (f.karb > 20 && f.lif < 2) score -= 1.5;

  return Math.max(1, Math.min(10, Math.round(score * 10) / 10));
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

function getStatusInfo(s: number, hour: number = new Date().getHours(), karb: number = 0, lif: number = 0) {
  const net = Math.max(0, karb - lif);
  if ((hour >= 20 || hour < 6) && net > 10) {
    return {cls:'bg-red-500/20 text-red-400 border-red-500/30 neon-red', dot: 'bg-red-400', label:'TEHLİKELİ (Gece Atıştırmalığı)'};
  }
  if (s >= 8) return {cls:'bg-emerald-500/20 text-emerald-400 border-emerald-500/30 neon-green', dot: 'bg-emerald-400', label:'Güvenli tüket'};
  if (s >= 5) return {cls:'bg-blue-500/20 text-blue-400 border-blue-500/30 neon-blue', dot: 'bg-blue-400', label:'Ölçülü tüket'};
  if (s >= 3) return {cls:'bg-orange-500/20 text-orange-400 border-orange-500/30 neon-orange', dot: 'bg-orange-400', label:'Dikkatli ol'};
  return              {cls:'bg-red-500/20 text-red-400 border-red-500/30 neon-red', dot: 'bg-red-400', label:'Kaçın'};
}

function getRingColor(s: number) {
  if (s >= 8) return '#2D5016';
  if (s >= 5) return '#8B5E00';
  if (s >= 3) return '#7A2E00';
  return '#6B0F0F';
}

function getTip(f: Food, s: number, hour: number = new Date().getHours(), isProcessed: boolean = false, highGYCount: number = 0, isLowSleep: boolean = false, isStressed: boolean = false) {
  const g = calculateGY(f);
  const net = Math.max(0, f.karb - f.lif);
  let tip = "";
  
  if (s >= 8) tip = `${f.isim}, düşük glisemik yük (GY: ${g}) ile kan şekerini stabil tutar. İnsülin direnci olan bireyler için güvenli bir seçim.`;
  else if (s >= 5) tip = `${f.isim} orta düzeyde glisemik etkiye sahip (GY: ${g}). Porsiyon kontrolüne dikkat edin; tek başına değil, protein veya lif kaynağıyla tüketin.`;
  else if (s >= 3) tip = `${f.isim}, yüksek GI (${f.gi}) nedeniyle kan şekerini hızlı yükseltebilir. Küçük porsiyonlar tercih edin ve yanına mutlaka protein ekleyin.`;
  else tip = `${f.isim} insülin direnci olan bireyler için önerilmez. GI: ${f.gi}, GY: ${g}. Daha düşük glisemik alternatifler tercih edilmeli.`;

  if ((hour >= 20 || hour < 6) && net > 10) {
    tip += " ⚠️ GECE UYARISI: Saat 20:00'den sonra karbonhidrat tüketimi insülin direncini %20 daha fazla zorlar ve yağ depolanmasını artırır.";
  }

  if (isLowSleep || isStressed) {
    tip += " ⚠️ KORTİZOL UYARISI: Az uyku veya stres nedeniyle insülin direnciniz geçici olarak artmış durumda. Vücudunuz glikozu kandan çekmekte zorlanabilir.";
  }

  if (isProcessed) {
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

  if (highGYCount >= 3) {
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

export default function App() {
  return (
    <ErrorBoundary>
      <GliSkorApp />
    </ErrorBoundary>
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
      return saved ? JSON.parse(saved) : foods;
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
  }, [foodList]);

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

  const metabolicScore = useMemo(() => selectedFood ? calculateMetabolicScore(selectedFood, isCooked, mealSequence, hasAcid, isLiquid, isResistant, consumptionHour, isProcessed, hasMovement, highGYCount, isLowSleep, isStressed, userProfile) : 0, [selectedFood, isCooked, mealSequence, hasAcid, isLiquid, isResistant, consumptionHour, isProcessed, hasMovement, highGYCount, isLowSleep, isStressed, userProfile]);
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
    isim: '', kat: 'Sebzeler', gi: 0, karb: 0, lif: 0, pro: 0, yag: 0, kal: 0
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

  const handleAiAnalysis = useCallback(async (name: string) => {
    if (!name || name.trim().length < 2) {
      setAiError("Lütfen analiz etmek için geçerli bir besin adı girin.");
      return;
    }

    setIsAiLoading(true);
    setAiError(null);
    console.log("Starting AI Analysis for:", name);
    
    try {
      // Find food in database to provide context
      const staticFood = foodList.find(f => f.isim.toLowerCase() === name.toLowerCase());
      let staticData = undefined;
      
      if (staticFood) {
        const mScore = calculateMetabolicScore(
          staticFood, 
          isCooked, 
          mealSequence, 
          hasAcid, 
          isLiquid, 
          isResistant, 
          consumptionHour, 
          isProcessed, 
          hasMovement, 
          highGYCount, 
          isLowSleep, 
          isStressed
        );
        const nScore = calculateNutritionalScore(staticFood);
        staticData = { ...staticFood, mScore, nScore };
      }

      // Include user profile context in the analysis
      const profileContext = `Kullanıcı Profili: Yaş ${userProfile.age || 'Bilinmiyor'}, Kilo ${userProfile.weight || 'Bilinmiyor'}, Boy ${userProfile.height || 'Bilinmiyor'}, Cinsiyet ${userProfile.gender}, Aktivite Seviyesi ${userProfile.activityLevel}, Hedef ${userProfile.goal}, HbA1c ${userProfile.hba1c || 'Bilinmiyor'}, İnsülin Direnci Seviyesi ${userProfile.insulinResistance || 'Bilinmiyor'}.`;
      
      console.log("Calling analyzeFood with context...");
      const result = await analyzeFood(name, highGYCount, profileContext, staticData);
      console.log("AI Analysis Result received:", result);
      
      setAiResult(result);
      setHistory(prev => [result, ...prev].slice(0, 20)); // Keep last 20
    } catch (err: any) {
      console.error("AI Analysis Error Details:", err);
      const errorMessage = err?.message || "Analiz sırasında bir hata oluştu.";
      setAiError(`${errorMessage} Lütfen tekrar deneyin.`);
    } finally {
      setIsAiLoading(false);
    }
  }, [highGYCount, userProfile, foodList, isCooked, mealSequence, hasAcid, isLiquid, isResistant, consumptionHour, isProcessed, hasMovement, isLowSleep, isStressed]);

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
          lif: result.lp
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

    if (editingFood) {
      setFoodList(prev => prev.map(f => f.isim === editingFood.isim ? formData : f));
    } else {
      if (foodList.some(f => f.isim.toLowerCase() === formData.isim.toLowerCase())) {
        setFormErrors({ isim: 'Bu isimde bir besin zaten var' });
        return;
      }
      setFoodList(prev => [formData, ...prev]);
    }
    setIsFormOpen(false);
    setEditingFood(null);
    setFormData({ isim: '', kat: 'Sebzeler', gi: 0, karb: 0, lif: 0, pro: 0, yag: 0, kal: 0 });
    setFormErrors({});
  };

  const handleDeleteFood = (isim: string) => {
    setFoodList(prev => prev.filter(f => f.isim !== isim));
    setSelectedFood(null);
  };

  const openAddModal = () => {
    setEditingFood(null);
    setFormData({ isim: '', kat: 'Sebzeler', gi: 0, karb: 0, lif: 0, pro: 0, yag: 0, kal: 0 });
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
    const avgM = plate.reduce((sum, f) => sum + calculateMetabolicScore(f, isCooked, mealSequence, hasAcid, isLiquid, isResistant, consumptionHour, isProcessed, hasMovement, highGYCount, isLowSleep, isStressed), 0) / plate.length;
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
        const m = calculateMetabolicScore(f, isCooked, mealSequence, hasAcid, isLiquid, isResistant, consumptionHour, isProcessed, hasMovement, highGYCount, isLowSleep, isStressed);
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
      if (sortMode === 'skor') return calculateMetabolicScore(b, isCooked, mealSequence, hasAcid, isLiquid, isResistant, consumptionHour, isProcessed, hasMovement, highGYCount, isLowSleep, isStressed) - calculateMetabolicScore(a, isCooked, mealSequence, hasAcid, isLiquid, isResistant, consumptionHour, isProcessed, hasMovement, highGYCount, isLowSleep, isStressed);
      if (sortMode === 'gi')   return a.gi - b.gi;
      if (sortMode === 'isim') return a.isim.localeCompare(b.isim, 'tr');
      return 0;
    });

    return list;
  }, [searchVal, activeCat, sortMode, isCooked, mealSequence, hasAcid, isLiquid, isResistant, consumptionHour, isProcessed, hasMovement, highGYCount, isLowSleep, isStressed]);

  return (
    <div className={`min-h-screen overflow-x-hidden transition-colors duration-500 ${darkMode ? 'bg-[#0A0A0A] text-[#E4E3E0]' : 'bg-[#F5F5F0] text-[#141414] light-mode'} pb-20 font-sans selection:bg-[#2DFF73] selection:text-black`}>
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

      <header className={`sticky top-0 z-[100] backdrop-blur-2xl border-b transition-colors duration-500 ${darkMode ? 'bg-black/50 border-white/5' : 'bg-white/50 border-black/5'} px-3 sm:px-8 py-2.5 sm:py-5`}>
        <div className="max-w-[1200px] mx-auto flex justify-between items-center">
          <div role="banner">
            <div className={`logo text-[1.1rem] xs:text-[1.8rem] sm:text-[2.5rem] font-bold tracking-tighter transition-colors flex items-center ${darkMode ? 'text-white' : 'text-black'}`}>
              <span>Gli</span>
              <Utensils aria-hidden="true" className={`text-[#2DFF73] mx-1 sm:mx-2 w-5 h-5 xs:w-6 xs:h-6 sm:w-8 sm:h-8`} />
              <span className="text-[#2DFF73] italic">Skor</span>
            </div>
            <div className={`text-[0.5rem] xs:text-[0.65rem] sm:text-[0.85rem] font-black tracking-[0.1em] uppercase mt-1 transition-colors hidden min-[380px]:block ${darkMode ? 'text-zinc-100' : 'text-zinc-900'}`}>Metabolik Sağlık ve İnsülin Analizi</div>
          </div>
          
          <div className="flex gap-1 xs:gap-2 sm:gap-4 items-center">
            {/* Gamification Stats - Mobile Compact / Desktop Full */}
            <div className="flex items-center gap-1.5 xs:gap-2 sm:gap-3 sm:mr-4" role="status" aria-label="Kullanıcı İstatistikleri">
              {/* Level/Points */}
              <div 
                onClick={() => setIsAchievementsOpen(true)}
                className={`flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1.5 rounded-full border cursor-pointer transition-all hover:scale-105 ${darkMode ? 'bg-white/5 border-white/10 hover:bg-white/10' : 'bg-black/5 border-black/10 hover:bg-black/10'}`}
                aria-label={`Seviye ${userStats.level}, ${userStats.points} puan`}
              >
                <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center shadow-lg" aria-hidden="true">
                  <span className="text-[0.6rem] sm:text-[0.7rem] font-black text-white">{userStats.level}</span>
                </div>
                <div className="flex flex-col">
                  <span className={`text-[0.65rem] sm:text-[0.75rem] font-black leading-none ${darkMode ? 'text-white' : 'text-black'}`}>{userStats.points} <span className="hidden xs:inline">Puan</span></span>
                </div>
              </div>

              {/* GY Stats - Hidden on very small, visible from xs */}
              <div className={`hidden min-[400px]:flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1.5 rounded-full border ${darkMode ? 'bg-white/5 border-white/10' : 'bg-black/5 border-black/10'}`} aria-label={`Günlük Glikoz Yükü: ${Math.round(dailyTotals.gl)} / 100`}>
                <Activity size={12} aria-hidden="true" className={`sm:w-3.5 sm:h-3.5 ${dailyTotals.gl > 100 ? "text-red-500" : "text-[#2DFF73]"}`} />
                <div className="flex flex-col">
                  <span className={`text-[0.65rem] sm:text-[0.75rem] font-black leading-none ${darkMode ? 'text-white' : 'text-black'}`}>{Math.round(dailyTotals.gl)}<span className="hidden sm:inline"> / 100</span></span>
                </div>
              </div>

              {/* Streak */}
              <div className={`flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1.5 rounded-full border ${darkMode ? 'bg-white/5 border-white/10' : 'bg-black/5 border-black/10'}`} aria-label={`Seri: ${userStats.streak} gün`}>
                <Flame size={12} aria-hidden="true" className={`sm:w-3.5 sm:h-3.5 ${userStats.streak > 0 ? "text-orange-500 fill-orange-500 animate-pulse" : "text-zinc-500"}`} />
                <span className={`text-[0.65rem] sm:text-[0.75rem] font-black leading-none ${darkMode ? 'text-white' : 'text-black'}`}>{userStats.streak} <span className="hidden xs:inline">Gün</span></span>
              </div>

              <button 
                onClick={() => setIsChallengeOpen(true)}
                className={`p-1.5 sm:p-2 rounded-full border transition-all hover:scale-110 hidden xs:flex ${darkMode ? 'bg-white/5 border-white/10 text-[#2DFF73]' : 'bg-black/5 border-black/10 text-emerald-600'}`}
                title="Günün Görevi"
              >
                <Target size={14} sm:size={18} aria-hidden="true" />
              </button>
            </div>

            <div className="flex items-center gap-1 xs:gap-1.5 sm:gap-2">
              <button 
                onClick={() => setDarkMode(!darkMode)}
                className={`p-2 xs:p-2.5 sm:p-3.5 rounded-xl sm:rounded-2xl transition-all border group ${darkMode ? 'bg-white/5 text-zinc-400 border-white/5 hover:bg-white/10 hover:text-white' : 'bg-black/5 text-zinc-500 border-black/5 hover:bg-black/10 hover:text-black'}`}
                aria-label={darkMode ? "Aydınlık Moda Geç" : "Karanlık Moda Geç"}
              >
                {darkMode ? <Sun size={16} aria-hidden="true" className="xs:w-[18px] xs:h-[18px] group-hover:rotate-45 transition-transform" /> : <Moon size={16} aria-hidden="true" className="xs:w-[18px] xs:h-[18px] group-hover:-rotate-12 transition-transform" />}
              </button>

              {/* Desktop-only header buttons */}
              <div className="hidden lg:flex items-center gap-1 xs:gap-1.5 sm:gap-2">
                <button 
                  onClick={() => setIsHistoryOpen(true)}
                  className={`p-2 xs:p-2.5 sm:p-3.5 rounded-xl sm:rounded-2xl transition-all border group ${darkMode ? 'bg-white/5 text-zinc-400 border-white/5 hover:bg-white/10 hover:text-white' : 'bg-black/5 text-zinc-500 border-black/5 hover:bg-black/10 hover:text-black'}`}
                  aria-label="Analiz Geçmişi"
                >
                  <History size={16} aria-hidden="true" className="xs:w-[18px] xs:h-[18px] group-hover:rotate-[-12deg] transition-transform" />
                </button>
                <button 
                  onClick={() => setIsTrackingOpen(true)}
                  className={`p-2 xs:p-2.5 sm:p-3.5 rounded-xl sm:rounded-2xl transition-all border group relative ${darkMode ? 'bg-white/5 text-zinc-400 border-white/5 hover:bg-white/10 hover:text-white' : 'bg-black/5 text-zinc-500 border-black/5 hover:bg-black/10 hover:text-black'}`}
                  aria-label="Günlük Takip"
                >
                  <Activity size={16} aria-hidden="true" className="xs:w-[18px] xs:h-[18px] group-hover:scale-110 transition-transform" />
                  {dailyLog.length > 0 && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 bg-[#2DFF73] text-black text-[0.6rem] font-black rounded-full flex items-center justify-center animate-pulse" aria-hidden="true">
                      {dailyLog.length}
                    </span>
                  )}
                </button>
                <button 
                  onClick={() => setIsProfileOpen(true)}
                  className={`p-2 xs:p-2.5 sm:p-3.5 rounded-xl sm:rounded-2xl transition-all border group ${darkMode ? 'bg-white/5 text-zinc-400 border-white/5 hover:bg-white/10 hover:text-white' : 'bg-black/5 text-zinc-500 border-black/5 hover:bg-black/10 hover:text-black'}`}
                  aria-label="Profil Ayarları"
                >
                  <User size={16} aria-hidden="true" className="xs:w-[18px] xs:h-[18px] group-hover:scale-110 transition-transform" />
                </button>
              </div>

              {!currentUser ? (
                <button 
                  onClick={handleLogin}
                  className="bg-white text-black p-2 xs:p-2.5 sm:p-3.5 rounded-xl sm:rounded-2xl hover:bg-zinc-200 transition-all shadow-lg flex items-center gap-2 font-black text-[0.65rem] xs:text-[0.7rem] sm:text-[0.8rem] uppercase tracking-widest px-3 xs:px-4 sm:px-6"
                >
                  <Sparkles size={16} />
                  <span className="hidden sm:inline">Giriş Yap</span>
                </button>
              ) : (
                <button 
                  onClick={handleLogout}
                  className={`p-2 xs:p-2.5 sm:p-3.5 rounded-xl sm:rounded-2xl transition-all border group ${darkMode ? 'bg-red-500/10 text-red-400 border-red-500/20' : 'bg-red-500/5 text-red-600 border-red-500/10'}`}
                  title="Çıkış Yap"
                >
                  <X size={16} />
                </button>
              )}
              <button 
                onClick={openAddModal}
                className="bg-[#2DFF73] text-black p-2 xs:p-2.5 sm:p-3.5 rounded-xl sm:rounded-2xl hover:bg-[#2DFF73]/90 transition-all shadow-[0_0_30px_rgba(45,255,115,0.3)] hover:scale-105 active:scale-95 flex items-center gap-1.5 xs:gap-2 font-black text-[0.65rem] xs:text-[0.7rem] sm:text-[0.8rem] uppercase tracking-widest px-3 xs:px-4 sm:px-6"
                aria-label="Yeni Besin Ekle"
              >
                <Plus size={16} aria-hidden="true" className="w-[16px] h-[16px] xs:w-[18px] xs:h-[18px]" strokeWidth={3} />
                <span className="hidden sm:inline">Besin Ekle</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <main id="main-content">
        <div className="max-w-[900px] mx-auto mt-6 sm:mt-10 px-4 sm:px-8">
        <div className={`border rounded-[25px] sm:rounded-[30px] flex items-center px-4 sm:px-6 gap-2 sm:gap-4 transition-all focus-within:ring-2 focus-within:ring-[#2DFF73]/20 focus-within:border-[#2DFF73]/30 group ${darkMode ? 'bg-[#141412] border-white/5' : 'bg-white border-black/5 shadow-xl'}`}>
          <Search className={`${darkMode ? 'text-[#A8A39E]' : 'text-zinc-400'} group-focus-within:text-[#2DFF73] transition-colors hidden xs:block`} size={20} />
          <input 
            type="text" 
            placeholder="Besin veya marka ara..." 
            value={searchVal}
            onChange={(e) => setSearchVal(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAiAnalysis(searchVal)}
            className={`flex-1 bg-transparent border-none py-4 sm:py-6 focus:outline-none font-medium text-[0.9rem] sm:text-[1rem] ${darkMode ? 'text-white placeholder-zinc-600' : 'text-black placeholder-zinc-400'}`}
          />
          <div className="flex items-center gap-1 sm:gap-2 flex-wrap justify-end">
            <input 
              type="file" 
              id="plate-image-upload" 
              accept="image/*" 
              className="hidden" 
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handlePlateImageAnalysis(file);
              }}
            />
            <div className="flex items-center gap-1 sm:gap-2">
              <button 
                onClick={() => document.getElementById('plate-image-upload')?.click()}
                className={`p-2 sm:p-3.5 rounded-xl sm:rounded-2xl transition-all border group ${darkMode ? 'bg-white/5 text-zinc-400 border-white/5 hover:bg-white/10 hover:text-white' : 'bg-black/5 text-zinc-500 border-black/5 hover:bg-black/10 hover:text-black'}`}
                title="Fotoğraf Yükle"
              >
                <ImageIcon size={16} className="sm:w-5 sm:h-5" />
              </button>
              <button 
                onClick={startListening}
                className={`p-2 sm:p-3.5 rounded-xl sm:rounded-2xl transition-all border group ${isListening ? 'bg-red-500/20 text-red-500 border-red-500/30' : darkMode ? 'bg-white/5 text-zinc-400 border-white/5 hover:bg-white/10 hover:text-white' : 'bg-black/5 text-zinc-500 border-black/5 hover:bg-black/10 hover:text-black'}`}
                title="Sesli Komut"
              >
                {isListening ? <MicOff size={16} className="sm:w-5 sm:h-5 animate-pulse" /> : <Mic size={16} className="sm:w-5 sm:h-5" />}
              </button>
              <button 
                onClick={() => setIsBarcodeOpen(true)}
                className={`p-2 sm:p-3.5 rounded-xl sm:rounded-2xl transition-all border group ${darkMode ? 'bg-white/5 text-zinc-400 border-white/5 hover:bg-white/10 hover:text-white' : 'bg-black/5 text-zinc-500 border-black/5 hover:bg-black/10 hover:text-black'}`}
                title="Barkod Tara"
              >
                <Search size={16} className="sm:w-5 sm:h-5" />
              </button>
              <button 
                onClick={() => setIsCoachOpen(true)}
                className={`p-2 sm:p-3.5 rounded-xl sm:rounded-2xl transition-all border group ${darkMode ? 'bg-[#2DFF73]/10 text-[#2DFF73] border-[#2DFF73]/20 hover:bg-[#2DFF73]/20' : 'bg-[#2DFF73]/5 text-emerald-600 border-[#2DFF73]/10 hover:bg-[#2DFF73]/10'}`}
                title="AI Koç"
              >
                <Brain size={16} className="sm:w-5 sm:h-5" />
              </button>
            </div>
            <div className="flex items-center gap-1 sm:gap-2">
              <button 
                onClick={() => setIsStatsOpen(true)}
                className={`p-2 sm:p-3.5 rounded-xl sm:rounded-2xl transition-all border group ${darkMode ? 'bg-white/5 text-zinc-400 border-white/5 hover:bg-white/10 hover:text-white' : 'bg-black/5 text-zinc-500 border-black/5 hover:bg-black/10 hover:text-black'}`}
                title="İstatistikler"
              >
                <Activity size={16} className="sm:w-5 sm:h-5" />
              </button>
              <button 
                onClick={() => handleAiAnalysis(searchVal)}
                disabled={!searchVal || isAiLoading}
                className="bg-[#2DFF73] text-black px-3 sm:px-6 py-2 sm:py-3 rounded-xl sm:rounded-2xl font-black text-[0.65rem] sm:text-[0.8rem] uppercase tracking-widest hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:grayscale flex items-center gap-2 shrink-0"
              >
                {isAiLoading ? <Loader2 className="animate-spin" size={12} /> : <Sparkles size={12} />}
                <span className="hidden xs:inline">Analiz Et</span>
                <span className="xs:hidden">AI</span>
              </button>
            </div>
          </div>
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
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="fixed inset-0 z-[200] flex items-center justify-center p-2 xs:p-4 md:p-8 bg-black/80 backdrop-blur-sm"
          >
            <div className={`rounded-[2rem] sm:rounded-[3rem] relative border shadow-[0_0_100px_rgba(0,0,0,0.5)] overflow-hidden max-w-4xl w-full max-h-[92vh] sm:max-h-[90vh] overflow-y-auto custom-scrollbar flex flex-col ${darkMode ? 'bg-[#0A0A0A] text-white border-white/10' : 'bg-[#F5F5F0] text-black border-black/10'}`}>
              {/* Background Glows */}
              <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] opacity-5 pointer-events-none blur-[80px] bg-emerald-500 rounded-full" />
              <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] opacity-5 pointer-events-none blur-[80px] bg-blue-500 rounded-full" />
              
              <div className={`sticky top-0 z-50 p-4 xs:p-8 md:p-12 pb-4 backdrop-blur-xl border-b ${darkMode ? 'bg-[#0A0A0A]/80 border-white/5' : 'bg-[#F5F5F0]/80 border-black/5'}`}>
                <button 
                  onClick={() => setAiResult(null)}
                  className={`absolute top-4 right-4 xs:top-8 xs:right-8 transition-all hover:rotate-90 z-50 p-2 rounded-full ${darkMode ? 'text-zinc-500 hover:text-white bg-white/5' : 'text-zinc-400 hover:text-black bg-black/5'}`}
                >
                  <X size={20} className="sm:w-6 sm:h-6" />
                </button>
                
                <div className="relative z-10">
                  {/* Header Section */}
                  <div className="flex flex-col md:flex-row justify-between items-start gap-4 md:gap-8">
                    <div className="flex-1 pr-10 xs:pr-16 md:pr-0">
                      <h2 className={`text-[1.8rem] xs:text-[2.2rem] sm:text-[3rem] md:text-[4.5rem] font-black leading-[0.9] tracking-tighter mb-4 bg-gradient-to-b bg-clip-text text-transparent break-words ${darkMode ? 'from-white to-zinc-500' : 'from-black to-zinc-600'}`}>
                        {aiResult.foodName}
                      </h2>
                      <div className="flex items-center gap-3">
                        <span className={`px-4 py-1.5 border rounded-full text-[0.6rem] sm:text-[0.7rem] font-black uppercase tracking-widest ${darkMode ? 'bg-white/5 border-white/10 text-zinc-400' : 'bg-black/5 border-black/10 text-zinc-500'}`}>
                          {foods.find(f => f.isim === aiResult.foodName)?.kat || "Besin"}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 shrink-0">
                      {/* Scores in Bento Style */}
                      <div className="flex items-center gap-4">
                        <div className="flex flex-col items-center">
                          <div className="w-[40px] h-[40px] sm:w-[48px] sm:h-[48px] relative">
                            <svg width="100%" height="100%" viewBox="0 0 48 48" className="-rotate-90">
                              <circle cx="24" cy="24" r="21" fill="none" stroke={darkMode ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)"} strokeWidth="4"/>
                              <circle 
                                cx="24" cy="24" r="21" fill="none" stroke={getRingColor(aiResult.score)} strokeWidth="4"
                                strokeDasharray={`${((aiResult.score / 10) * 2 * Math.PI * 21).toFixed(1)} ${(2 * Math.PI * 21).toFixed(1)}`}
                                strokeLinecap="round"
                              />
                            </svg>
                            <div className="absolute inset-0 flex items-center justify-center text-[0.8rem] sm:text-[1rem] font-black" style={{ color: getRingColor(aiResult.score) }}>
                              {aiResult.score}
                            </div>
                          </div>
                          <span className="text-[0.4rem] sm:text-[0.45rem] text-zinc-500 font-black tracking-widest mt-1 uppercase">Metabolik</span>
                        </div>
                        <div className="flex flex-col items-center">
                          <div className="w-[40px] h-[40px] sm:w-[48px] sm:h-[48px] relative">
                            <svg width="100%" height="100%" viewBox="0 0 48 48" className="-rotate-90">
                              <circle cx="24" cy="24" r="21" fill="none" stroke={darkMode ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)"} strokeWidth="4"/>
                              <circle 
                                cx="24" cy="24" r="21" fill="none" stroke={getRingColor(aiResult.healthScore)} strokeWidth="4"
                                strokeDasharray={`${((aiResult.healthScore / 10) * 2 * Math.PI * 21).toFixed(1)} ${(2 * Math.PI * 21).toFixed(1)}`}
                                strokeLinecap="round"
                              />
                            </svg>
                            <div className="absolute inset-0 flex items-center justify-center text-[0.8rem] sm:text-[1rem] font-black" style={{ color: getRingColor(aiResult.healthScore) }}>
                              {aiResult.healthScore}
                            </div>
                          </div>
                          <span className="text-[0.4rem] sm:text-[0.45rem] text-zinc-500 font-black tracking-widest mt-1 uppercase">Sağlık</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-3 xs:p-5 sm:p-8 md:p-10 pt-4 relative z-10 overflow-x-hidden">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 sm:gap-5">
                  
                  {/* Row 1: Macro Chart & Metabolic Effect */}
                  <div className="sm:col-span-2 md:col-span-1 md:row-span-2 min-h-[300px] xs:min-h-[350px] sm:min-h-0">
                    <MacroDistribution 
                      karb={aiResult.karb} 
                      pro={aiResult.pro} 
                      yag={aiResult.yag} 
                      darkMode={darkMode} 
                    />
                  </div>

                  <div className={`sm:col-span-2 md:col-span-3 p-5 xs:p-8 rounded-[1.5rem] sm:rounded-[2.5rem] border flex flex-col justify-center ${darkMode ? 'bg-white/5 border-white/5' : 'bg-black/5 border-black/5 shadow-sm'}`}>
                    <div className="text-[0.55rem] sm:text-[0.6rem] font-black text-zinc-500 uppercase tracking-[0.3em] mb-3">METABOLİK ETKİ</div>
                    <p className={`text-[0.9rem] sm:text-[1rem] leading-relaxed font-medium ${darkMode ? 'text-zinc-300' : 'text-zinc-700'}`}>
                      {aiResult.metabolicEffect}
                    </p>
                  </div>

                  {/* Row 2: Stats Grid */}
                  <div className={`sm:col-span-2 md:col-span-3 p-4 sm:p-6 rounded-[1.5rem] sm:rounded-[2.5rem] border ${darkMode ? 'bg-white/5 border-white/5' : 'bg-black/5 border-black/5'}`}>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
                      {[
                        { label: 'Kalori', value: aiResult.kal, color: 'text-zinc-500' },
                        { label: 'GI', value: aiResult.gi, color: 'text-orange-400' },
                        { label: 'GL', value: aiResult.gy, color: 'text-blue-400' },
                        { label: 'Lif', value: `${aiResult.lp}g`, color: 'text-emerald-400' }
                      ].map((item, i) => (
                        <div key={i} className="flex flex-col items-center text-center p-2">
                          <div className={`text-[1.4rem] sm:text-[1.8rem] font-black tracking-tighter ${darkMode ? 'text-white' : 'text-black'}`}>
                            {item.value}
                          </div>
                          <div className="text-[0.55rem] sm:text-[0.6rem] text-zinc-500 uppercase tracking-widest font-black">{item.label}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Row 3: Circadian Rhythm Widget */}
                  <div className="sm:col-span-2 md:col-span-4 min-h-[300px] xs:min-h-[350px] sm:min-h-0">
                    <CircadianRhythmWidget data={aiResult.circadianData} darkMode={darkMode} />
                  </div>

                  {/* Row 4: Insulin Bar & Functional Benefit */}
                  <div className={`sm:col-span-1 md:col-span-2 p-6 sm:p-8 rounded-[1.5rem] sm:rounded-[2.5rem] border flex flex-col justify-center ${darkMode ? 'bg-white/5 border-white/5' : 'bg-black/5 border-black/5'}`}>
                    <div className="flex justify-between items-center mb-3">
                      <span className="text-[0.6rem] sm:text-[0.65rem] font-black uppercase tracking-widest text-zinc-500">İnsülin Etkisi</span>
                      <span className={`text-[0.75rem] sm:text-[0.8rem] font-black ${aiResult.score > 7 ? 'text-red-500' : aiResult.score > 4 ? 'text-orange-500' : 'text-emerald-500'}`}>
                        {aiResult.insulinEffect || (aiResult.score > 7 ? 'Yüksek' : aiResult.score > 4 ? 'Orta' : 'Düşük')}
                      </span>
                    </div>
                    <div className={`h-2.5 w-full rounded-full overflow-hidden ${darkMode ? 'bg-white/10' : 'bg-black/10'}`}>
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${aiResult.score * 10}%` }}
                        transition={{ duration: 1, ease: "circOut" }}
                        className="h-full rounded-full"
                        style={{ 
                          background: `linear-gradient(90deg, #10B981 0%, #F59E0B 50%, #EF4444 100%)`,
                        }}
                      />
                    </div>
                  </div>

                  <div className={`sm:col-span-1 md:col-span-2 p-6 sm:p-8 rounded-[1.5rem] sm:rounded-[2.5rem] border flex flex-col justify-center ${darkMode ? 'bg-white/5 border-white/5' : 'bg-black/5 border-black/5'}`}>
                    <div className="text-[0.55rem] sm:text-[0.6rem] font-black text-zinc-500 uppercase tracking-[0.3em] mb-3">FONKSİYONEL FAYDA</div>
                    <p className={`text-[0.9rem] sm:text-[1rem] leading-relaxed font-medium ${darkMode ? 'text-zinc-300' : 'text-zinc-700'}`}>
                      {aiResult.functionalBenefit}
                    </p>
                  </div>

                  {/* Row 4: Warning & Profile Comments */}
                  <div className={`sm:col-span-2 md:col-span-4 p-6 sm:p-8 rounded-[1.5rem] sm:rounded-[2.5rem] border border-orange-500/20 bg-orange-500/5 flex flex-col sm:flex-row gap-4 sm:gap-6 items-start sm:items-center`}>
                    <AlertTriangle className="w-6 h-6 sm:w-8 sm:h-8 text-orange-500 shrink-0" />
                    <p className={`text-[0.85rem] sm:text-[0.95rem] font-bold leading-relaxed ${darkMode ? 'text-orange-200' : 'text-orange-900'}`}>
                      {aiResult.warning}
                    </p>
                  </div>

                  <div className="md:col-span-4 mt-4">
                    <div className="text-[0.6rem] font-black text-zinc-500 uppercase tracking-[0.3em] mb-6 text-center">PROFİL BAZLI YORUM</div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                      {[
                        { title: 'Kilo Verme', text: aiResult.profileComments?.weightLoss, color: 'border-emerald-500/30 bg-emerald-500/5', titleColor: 'text-emerald-500' },
                        { title: 'Diyabetik', text: aiResult.profileComments?.diabetic, color: 'border-orange-500/30 bg-orange-500/5', titleColor: 'text-orange-500' },
                        { title: 'Sporcu', text: aiResult.profileComments?.athlete, color: 'border-blue-500/30 bg-blue-500/5', titleColor: 'text-blue-500' },
                        { title: 'Çölyak', text: aiResult.profileComments?.celiac, color: 'border-red-500/30 bg-red-500/5', titleColor: 'text-red-500' }
                      ].map((p, i) => (
                        <div key={i} className={`p-6 rounded-[2rem] border ${p.color}`}>
                          <h4 className={`text-[0.75rem] font-black mb-2 uppercase tracking-wider ${p.titleColor}`}>{p.title}</h4>
                          <p className={`text-[0.8rem] leading-relaxed font-medium ${darkMode ? 'text-zinc-400' : 'text-zinc-600'}`}>{p.text}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                </div>

                <div className="flex flex-col sm:flex-row gap-4 mt-12">
                  <button 
                    onClick={() => {
                      const food: Food = {
                        isim: aiResult.foodName,
                        kat: aiResult.category || 'Diğer',
                        gi: aiResult.gi,
                        karb: aiResult.karb,
                        lif: aiResult.lp,
                        pro: aiResult.pro,
                        yag: aiResult.yag,
                        kal: aiResult.kal
                      };
                      addToLog(food, 100, 'Atıştırmalık', aiResult.score);
                    }}
                    className={`flex-1 py-5 rounded-[2rem] font-black uppercase tracking-[0.2em] text-[0.8rem] transition-all border ${darkMode ? 'bg-blue-500/10 border-blue-500/20 text-blue-400 hover:bg-blue-500/20' : 'bg-blue-500/5 border-blue-500/10 text-blue-600 hover:bg-blue-500/10'}`}
                  >
                    Günlüğe Ekle
                  </button>
                  <button 
                    onClick={async () => {
                      const text = `${aiResult.foodName} Analizi:\nSağlık Skoru: ${aiResult.healthScore}/10\nMetabolik Etki: ${aiResult.metabolicEffect}\nUyarı: ${aiResult.warning}`;
                      
                      try {
                        if (navigator.share) {
                          await navigator.share({
                            title: 'GliSkor Analizi',
                            text: text,
                          });
                          setAiSuccess("Analiz başarıyla paylaşıldı!");
                        } else {
                          await navigator.clipboard.writeText(text);
                          setAiSuccess("Analiz panoya kopyalandı!");
                        }
                      } catch (err) {
                        console.error("Paylaşım hatası:", err);
                        if (err instanceof Error && err.name !== 'AbortError') {
                          setAiError("Paylaşım sırasında bir sorun oluştu.");
                        }
                      }
                      
                      setTimeout(() => {
                        setAiSuccess(null);
                        setAiError(null);
                      }, 3000);
                    }}
                    className={`flex-1 py-5 rounded-[2rem] font-black uppercase tracking-[0.2em] text-[0.8rem] transition-all border ${darkMode ? 'bg-white/5 border-white/10 text-white hover:bg-white/10' : 'bg-black/5 border-black/10 text-black hover:bg-black/10'}`}
                  >
                    Analizi Paylaş
                  </button>
                  <button 
                    onClick={() => setAiResult(null)}
                    className="flex-1 py-5 rounded-[2rem] bg-[#2DFF73] text-black font-black uppercase tracking-[0.2em] text-[0.8rem] hover:scale-[1.02] active:scale-[0.98] transition-all shadow-[0_10px_30px_rgba(45,255,115,0.2)]"
                  >
                    Kapat
                  </button>
                </div>
              </div>
            </div>
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
        <div className="max-w-[900px] mx-auto mt-4 px-4 sm:px-8">
          <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-4 py-4 rounded-2xl text-[0.85rem] font-bold flex items-center gap-3 shadow-lg shadow-emerald-500/5">
            <CheckCircle2 size={18} />
            {aiSuccess}
          </div>
        </div>
      )}

      <div className="max-w-[900px] mx-auto mt-4 px-4 sm:px-8 flex gap-2 flex-wrap">
        <button 
          onClick={() => setQuickFilter(quickFilter === 'super' ? 'none' : 'super')}
          className={`flex items-center gap-1.5 text-[0.7rem] px-3 py-1.5 rounded-full border transition-all ${quickFilter === 'super' ? 'bg-green-600 border-green-600 text-white' : 'bg-white border-green-100 text-green-700 hover:bg-green-50'}`}
        >
          <Sparkles size={12} /> Süper Gıdalar
        </button>
        <button 
          onClick={() => setQuickFilter(quickFilter === 'protein' ? 'none' : 'protein')}
          className={`flex items-center gap-1.5 text-[0.7rem] px-3 py-1.5 rounded-full border transition-all ${quickFilter === 'protein' ? 'bg-rose-600 border-rose-600 text-white' : 'bg-white border-rose-100 text-rose-700 hover:bg-rose-50'}`}
        >
          <Beef size={12} /> Yüksek Protein
        </button>
        <button 
          onClick={() => setQuickFilter(quickFilter === 'lowcarb' ? 'none' : 'lowcarb')}
          className={`flex items-center gap-1.5 text-[0.7rem] px-3 py-1.5 rounded-full border transition-all ${quickFilter === 'lowcarb' ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white border-blue-100 text-blue-700 hover:bg-blue-50'}`}
        >
          <Wheat size={12} /> Düşük Karb
        </button>
      </div>

      <div className="max-w-[900px] mx-auto mt-4 px-4 sm:px-8 flex gap-2 flex-wrap">
        {cats.map(cat => (
          <button
            key={cat}
            onClick={() => setActiveCat(cat)}
            className={`text-[0.75rem] px-[14px] py-[6px] rounded-[50px] border transition-all cursor-pointer whitespace-nowrap font-bold ${
              activeCat === cat 
                ? 'bg-[#2DFF73] border-[#2DFF73] text-black' 
                : `${darkMode ? 'bg-white/5 border-white/10 text-[#A8A39E]' : 'bg-black/5 border-black/10 text-zinc-500'} hover:border-[#2DFF73] ${darkMode ? 'hover:text-white' : 'hover:text-black'}`
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Info Section - More Subtle & Professional */}
      <div className="max-w-[900px] mx-auto mt-6 px-4 sm:px-8">
        <div className={`rounded-3xl p-6 sm:p-8 flex flex-col sm:flex-row gap-6 sm:gap-12 border transition-all ${darkMode ? 'bg-white/[0.02] border-white/5' : 'bg-black/[0.02] border-black/5 shadow-sm'}`}>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-2 h-2 rounded-full bg-[#FF6B2B] shadow-[0_0_10px_rgba(255,107,43,0.5)]"></div>
              <span className={`text-[0.75rem] font-black uppercase tracking-widest ${darkMode ? 'text-white/70' : 'text-black/70'}`}>İnsülin Skoru</span>
            </div>
            <p className="text-[0.75rem] text-zinc-500 font-medium leading-relaxed">
              Besinin kan şekeri ve insülin üzerindeki etkisini ölçer. <span className={darkMode ? 'text-white' : 'text-black'}>10</span> en güvenli, <span className={darkMode ? 'text-white' : 'text-black'}>1</span> en riskli değerdir.
            </p>
          </div>
          <div className={`w-px hidden sm:block ${darkMode ? 'bg-white/5' : 'bg-black/5'}`} />
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-2 h-2 rounded-full bg-[#2B6BFF] shadow-[0_0_10px_rgba(43,107,255,0.5)]"></div>
              <span className={`text-[0.75rem] font-black uppercase tracking-widest ${darkMode ? 'text-white/70' : 'text-black/70'}`}>Sağlık Skoru</span>
            </div>
            <p className="text-[0.75rem] text-zinc-500 font-medium leading-relaxed">
              Besinin vitamin, mineral, lif ve protein yoğunluğunu ölçer. <span className={darkMode ? 'text-white' : 'text-black'}>10</span> en besleyici, <span className={darkMode ? 'text-white' : 'text-black'}>1</span> en boş kalorili değerdir.
            </p>
          </div>
        </div>
      </div>

      {/* Control Panel - More Dashboard-like */}
      <div className="max-w-[900px] mx-auto mt-8 px-4 sm:px-8 flex flex-col gap-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
          <div className={`p-1.5 rounded-2xl border flex gap-1 ${darkMode ? 'bg-white/[0.02] border-white/5' : 'bg-black/[0.02] border-black/5'}`}>
            {[
              { id: 'hot', label: 'SICAK', active: isCooked && !isResistant, onClick: () => { setIsCooked(true); setIsResistant(false); } },
              { id: 'res', label: 'DİRENÇLİ', active: isResistant, onClick: () => { setIsCooked(false); setIsResistant(true); } },
              { id: 'raw', label: 'ÇİĞ', active: !isCooked && !isResistant, onClick: () => { setIsCooked(false); setIsResistant(false); } }
            ].map((t) => (
              <button
                key={t.id}
                onClick={t.onClick}
                className={`flex-1 py-3 sm:py-2.5 rounded-xl text-[0.6rem] sm:text-[0.65rem] font-black tracking-widest transition-all ${t.active ? (darkMode ? 'bg-white text-black' : 'bg-black text-white') : 'opacity-40 hover:opacity-100'}`}
              >
                {t.label}
              </button>
            ))}
          </div>
          
          <div className={`p-1.5 rounded-2xl border flex gap-1 ${darkMode ? 'bg-white/[0.02] border-white/5' : 'bg-black/[0.02] border-black/5'}`}>
            {[
              { id: 'ideal', label: 'İDEAL', active: mealSequence === 'ideal', onClick: () => setMealSequence('ideal') },
              { id: 'standard', label: 'STANDART', active: mealSequence === 'standard', onClick: () => setMealSequence('standard') },
              { id: 'carbs', label: 'KARB ÖNCE', active: mealSequence === 'carbsFirst', onClick: () => setMealSequence('carbsFirst') }
            ].map((m) => (
              <button
                key={m.id}
                onClick={m.onClick}
                className={`flex-1 py-3 sm:py-2.5 rounded-xl text-[0.6rem] sm:text-[0.65rem] font-black tracking-widest transition-all ${m.active ? (darkMode ? 'bg-white text-black' : 'bg-black text-white') : 'opacity-40 hover:opacity-100'}`}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex gap-2">
          {[
            { id: 'asit', label: 'ASİT', active: hasAcid, onClick: () => setHasAcid(!hasAcid), icon: <Droplets size={12} /> },
            { id: 'sivi', label: 'SIVI', active: isLiquid, onClick: () => setIsLiquid(!isLiquid), icon: <Waves size={12} /> },
            { id: 'islenmis', label: 'İŞLENMİŞ', active: isProcessed, onClick: () => setIsProcessed(!isProcessed), icon: <AlertTriangle size={12} /> }
          ].map((f) => (
            <button
              key={f.id}
              onClick={f.onClick}
              className={`flex-1 py-3 sm:py-4 rounded-xl sm:rounded-2xl border flex items-center justify-center gap-1.5 sm:gap-2 text-[0.6rem] sm:text-[0.65rem] font-black tracking-widest transition-all ${f.active ? 'bg-red-500/20 border-red-500/40 text-red-500 shadow-lg' : (darkMode ? 'bg-white/[0.02] border-white/5 opacity-40 hover:opacity-100' : 'bg-black/[0.02] border-black/5 opacity-40 hover:opacity-100')}`}
            >
              {f.icon}
              <span className="xs:inline">{f.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Metabolic Dashboard - Compact & Professional */}
      <div className="max-w-[900px] mx-auto mt-6 px-4 sm:px-8">
        <div className={`p-6 sm:p-8 rounded-[2rem] border grid grid-cols-1 md:grid-cols-2 gap-8 ${darkMode ? 'bg-white/[0.02] border-white/5' : 'bg-black/[0.02] border-black/5 shadow-sm'}`}>
          
          {/* Circadian */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className={`p-2 rounded-lg ${darkMode ? 'bg-indigo-500/10 text-indigo-400' : 'bg-indigo-500/5 text-indigo-600'}`}>
                  <Activity size={14} />
                </div>
                <span className="text-[0.65rem] font-black uppercase tracking-widest opacity-60">Sirkadiyen Ritim</span>
              </div>
              <span className="text-[0.8rem] font-black font-mono">{consumptionHour.toString().padStart(2, '0')}:00</span>
            </div>
            <input 
              type="range" min="0" max="23" value={consumptionHour} 
              onChange={(e) => setConsumptionHour(parseInt(e.target.value))}
              className="w-full accent-[#2DFF73] h-1.5 bg-white/5 rounded-full appearance-none cursor-pointer"
            />
          </div>

          {/* Insulin Window */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className={`p-2 rounded-lg ${darkMode ? 'bg-red-500/10 text-red-400' : 'bg-red-500/5 text-red-600'}`}>
                  <Zap size={14} />
                </div>
                <span className="text-[0.65rem] font-black uppercase tracking-widest opacity-60">İnsülin Penceresi</span>
              </div>
              <div className="flex items-center gap-3">
                <button onClick={() => setHighGYCount(Math.max(0, highGYCount - 1))} className="opacity-40 hover:opacity-100 transition-opacity"><Minus size={14} /></button>
                <span className="text-[0.8rem] font-black font-mono w-4 text-center">{highGYCount}</span>
                <button onClick={() => setHighGYCount(highGYCount + 1)} className="opacity-40 hover:opacity-100 transition-opacity"><Plus size={14} /></button>
              </div>
            </div>
            <div className="flex gap-1">
              {[...Array(5)].map((_, i) => (
                <div key={i} className={`h-1.5 flex-1 rounded-full transition-colors ${i < highGYCount ? 'bg-red-500' : (darkMode ? 'bg-white/5' : 'bg-black/5')}`} />
              ))}
            </div>
          </div>

          {/* Sleep */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className={`p-2 rounded-lg ${darkMode ? 'bg-blue-500/10 text-blue-400' : 'bg-blue-500/5 text-blue-600'}`}>
                  <Moon size={14} />
                </div>
                <span className="text-[0.65rem] font-black uppercase tracking-widest opacity-60">Uyku Kalitesi</span>
              </div>
              <button 
                onClick={() => setIsLowSleep(!isLowSleep)}
                className={`text-[0.65rem] font-black px-4 py-1.5 rounded-full border transition-all ${!isLowSleep ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-500' : 'bg-red-500/20 border-red-500/40 text-red-500'}`}
              >
                {!isLowSleep ? 'İyi Uyudum' : 'Az Uyudum'}
              </button>
            </div>
          </div>

          {/* Stress */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className={`p-2 rounded-lg ${darkMode ? 'bg-orange-500/10 text-orange-400' : 'bg-orange-500/5 text-orange-600'}`}>
                  <Thermometer size={14} />
                </div>
                <span className="text-[0.65rem] font-black uppercase tracking-widest opacity-60">Stres Seviyesi</span>
              </div>
              <button 
                onClick={() => setIsStressed(!isStressed)}
                className={`text-[0.65rem] font-black px-4 py-1.5 rounded-full border transition-all ${!isStressed ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-500' : 'bg-red-500/20 border-red-500/40 text-red-500'}`}
              >
                {!isStressed ? 'Sakinim' : 'Stresliyim'}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-[900px] mx-auto mt-6 px-4 sm:px-8 flex items-center justify-between">
        <span className="text-[0.8rem] text-[#A8A39E] font-light">{filteredFoods.length} besin listelendi</span>
        <div className="flex gap-[6px]">
          {(['skor', 'gi', 'isim'] as const).map(mode => (
            <button
              key={mode}
              onClick={() => setSortMode(mode)}
              className={`text-[0.75rem] px-3 py-[5px] rounded-[50px] border transition-all cursor-pointer ${
                sortMode === mode 
                  ? 'bg-[#1A1612] text-white border-[#1A1612]' 
                  : 'bg-transparent border-[rgba(26,22,18,0.10)] text-[#6B6560]'
              }`}
            >
              {mode === 'skor' ? 'Skora göre' : mode === 'gi' ? "GI'ye göre" : 'A–Z'}
            </button>
          ))}
        </div>
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
            const mScore = calculateMetabolicScore(f, isCooked, mealSequence, hasAcid, isLiquid, isResistant, consumptionHour, isProcessed, hasMovement, highGYCount, isLowSleep, isStressed);
            const nScore = calculateNutritionalScore(f);
            const g = calculateGY(f);
            const st = getStatusInfo(mScore, consumptionHour, f.karb, f.lif);
            const col = getRingColor(nScore); // Use nScore for color
            const note = getDietitianNote(mScore, nScore, f);

            return (
              <motion.div 
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                key={f.isim}
                onClick={() => setSelectedFood(f)}
                className={`${darkMode ? 'glass border-white/5 hover:border-white/20' : 'light-glass border-black/5 hover:border-black/10 shadow-[0_20px_40px_rgba(0,0,0,0.1)]'} rounded-[2rem] sm:rounded-[3rem] p-6 sm:p-10 cursor-pointer transition-all hover:-translate-y-3 relative group flex flex-col h-full overflow-hidden border`}
              >
                {/* Decorative background glow */}
                <div className="absolute top-0 right-0 w-32 h-32 blur-[60px] opacity-0 group-hover:opacity-20 transition-opacity rounded-full -mr-16 -mt-16" style={{ backgroundColor: col }} />
                
                <div className="flex items-start justify-between mb-6 sm:mb-8 gap-4 relative z-10">
                  <div className="flex items-start gap-4 flex-1 min-w-0">
                    <div className="min-w-0 flex-1 flex flex-col min-h-[70px] sm:min-h-[85px]">
                      <div className={`text-[1.25rem] sm:text-[1.4rem] font-black leading-[1.1] line-clamp-2 tracking-tight group-hover:text-[#2DFF73] transition-colors ${darkMode ? 'text-white' : 'text-black'}`}>{f.isim}</div>
                      <div className={`text-[0.65rem] sm:text-[0.7rem] font-black mt-auto pt-2 uppercase tracking-[0.25em] opacity-70 ${darkMode ? 'text-zinc-500' : 'text-zinc-400'}`}>{f.kat}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                    <div className="flex items-center gap-2">
                      {/* Metabolic Score Ring (Smaller) */}
                      <div className="w-[36px] h-[36px] sm:w-[40px] sm:h-[40px] shrink-0 relative" title="Metabolik Skor">
                        <svg width="100%" height="100%" viewBox="0 0 40 40" className="-rotate-90">
                          <circle cx="20" cy="20" r="18" fill="none" stroke={darkMode ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.03)"} strokeWidth="4"/>
                          <circle 
                            cx="20" cy="20" r="18" fill="none" stroke={getRingColor(mScore)} strokeWidth="4"
                            strokeDasharray={`${((mScore / 10) * 2 * Math.PI * 18).toFixed(1)} ${(2 * Math.PI * 18).toFixed(1)}`}
                            strokeLinecap="round"
                          />
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center text-[0.6rem] sm:text-[0.7rem] font-black" style={{ color: getRingColor(mScore) }}>
                          {mScore}
                        </div>
                      </div>
                      {/* Health Score Ring (Main) */}
                      <div className="w-[48px] h-[48px] sm:w-[56px] sm:h-[56px] shrink-0 relative" title="Sağlık Skoru">
                        <svg width="100%" height="100%" viewBox="0 0 56 56" className="-rotate-90">
                          <circle cx="28" cy="28" r="25" fill="none" stroke={darkMode ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.03)"} strokeWidth="6"/>
                          <circle 
                            cx="28" cy="28" r="25" fill="none" stroke={col} strokeWidth="6"
                            strokeDasharray={`${((nScore / 10) * 2 * Math.PI * 25).toFixed(1)} ${(2 * Math.PI * 25).toFixed(1)}`}
                            strokeLinecap="round"
                          />
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center text-[1rem] sm:text-[1.2rem] font-black" style={{ color: col }}>
                          {nScore}
                        </div>
                      </div>
                    </div>
                    <button 
                      onClick={(e) => { e.stopPropagation(); addToLog(f, 100, 'Atıştırmalık', mScore); }}
                      className={`w-10 h-10 sm:w-12 sm:h-12 border rounded-xl sm:rounded-2xl shadow-xl flex items-center justify-center hover:bg-blue-500 hover:text-white hover:border-blue-500 hover:scale-110 transition-all shrink-0 group/log ${darkMode ? 'bg-white/5 border-white/10 text-white' : 'bg-black/5 border-black/10 text-black'}`}
                      title="Günlüğe Ekle"
                    >
                      <Activity size={20} className="sm:w-6 sm:h-6 group-hover/log:scale-110 transition-transform" strokeWidth={3} />
                    </button>
                    <button 
                      onClick={(e) => { e.stopPropagation(); addToPlate(f); }}
                      className={`w-10 h-10 sm:w-12 sm:h-12 border rounded-xl sm:rounded-2xl shadow-xl flex items-center justify-center hover:bg-[#2DFF73] hover:text-black hover:border-[#2DFF73] hover:scale-110 transition-all shrink-0 group/add ${darkMode ? 'bg-white/5 border-white/10 text-white' : 'bg-black/5 border-black/10 text-black'}`}
                      title="Tabağa Ekle"
                    >
                      <Plus size={20} className="sm:w-6 sm:h-6 group-hover/add:rotate-90 transition-transform" strokeWidth={3} />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4 mb-8 relative z-10">
                  {[
                    { val: f.gi, label: 'GI' },
                    { val: g, label: 'GY' },
                    { val: f.kal, label: 'kcal' }
                  ].map((item, i) => (
                    <div key={i} className={`rounded-3xl py-5 px-2 text-center border transition-colors ${darkMode ? 'bg-white/5 border-white/5 group-hover:bg-white/10' : 'bg-black/5 border-black/5 group-hover:bg-black/10'}`}>
                      <div className={`text-[1.2rem] font-black tracking-tighter ${darkMode ? 'text-white' : 'text-black'}`}>{item.val}</div>
                      <div className={`text-[0.65rem] font-black uppercase tracking-widest mt-1.5 ${darkMode ? 'text-zinc-500' : 'text-zinc-400'}`}>{item.label}</div>
                    </div>
                  ))}
                </div>

                <div className="flex-1 relative z-10">
                  <div className={`inline-flex items-center gap-3 text-[0.75rem] font-black px-5 py-2.5 rounded-full uppercase tracking-widest border shadow-xl backdrop-blur-md ${st.cls}`}>
                    <span className={`w-2.5 h-2.5 rounded-full ${st.dot} shadow-[0_0_8px_currentColor]`}></span>{st.label}
                  </div>
                </div>

                <div className="mt-8 pt-8 border-t border-white/5 relative z-10">
                  <GlucoseCurve gi={f.gi} gy={g} color={col} darkMode={darkMode} />
                </div>
              </motion.div>
            );
          })
        )}
      </div>

      <AnimatePresence>
        {selectedFood && (
          <div 
            className="fixed inset-0 bg-black/80 backdrop-blur-xl z-[100] flex items-center justify-center p-2 xs:p-4"
            onClick={() => setSelectedFood(null)}
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className={`rounded-[2rem] sm:rounded-[3rem] w-full max-w-4xl p-4 xs:p-8 md:p-12 relative max-h-[92vh] sm:max-h-[90vh] overflow-y-auto custom-scrollbar border shadow-2xl ${darkMode ? 'bg-[#0A0A0A] text-white border-white/10' : 'bg-[#F5F5F0] text-black border-black/10'}`}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="absolute top-4 right-4 xs:top-8 xs:right-8 flex gap-2 xs:gap-3 z-50">
                <button 
                  onClick={() => addToPlate(selectedFood)}
                  disabled={plate.length >= 6}
                  className="w-9 h-9 xs:w-12 xs:h-12 rounded-full bg-emerald-500 text-black cursor-pointer flex items-center justify-center hover:bg-emerald-400 transition-all disabled:opacity-50 shadow-[0_0_20px_rgba(16,185,129,0.4)]"
                  title="Tabağa Ekle"
                >
                  <Plus size={18} className="xs:w-6 xs:h-6" />
                </button>
                <button 
                  className={`w-9 h-9 xs:w-12 xs:h-12 rounded-full border flex items-center justify-center transition-all hover:rotate-90 ${darkMode ? 'text-zinc-500 hover:text-white bg-white/5 border-white/10' : 'text-zinc-400 hover:text-black bg-black/5 border-black/10'}`}
                  onClick={() => setSelectedFood(null)}
                >
                  <X size={18} className="xs:w-6 xs:h-6" />
                </button>
              </div>

              {(() => {
                const staticAnalysis = generateStaticAnalysis(selectedFood);
                const healthScore = Math.round((metabolicScore + nutritionalScore) / 2);
                
                return (
                  <>
                    <div className="mb-8 sm:mb-12">
                      <h2 className={`text-[1.8rem] xs:text-[3rem] md:text-[4.5rem] font-black leading-[0.9] tracking-tighter mb-6 bg-gradient-to-b bg-clip-text text-transparent pr-20 xs:pr-24 ${darkMode ? 'from-white to-zinc-500' : 'from-black to-zinc-600'} break-words`}>
                        {selectedFood.isim}
                      </h2>
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                        <div className="flex items-center gap-3 flex-wrap">
                          <span className={`px-4 py-1.5 border rounded-full text-[0.7rem] font-black uppercase tracking-widest ${darkMode ? 'bg-white/5 border-white/10 text-zinc-400' : 'bg-black/5 border-black/10 text-zinc-500'}`}>
                            {selectedFood.kat}
                          </span>
                          <div className="flex gap-2">
                            <button 
                              onClick={() => openEditModal(selectedFood)}
                              className="p-2 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20 hover:bg-blue-500/20 transition-all"
                              title="Düzenle"
                            >
                              <Edit2 size={16} />
                            </button>
                            <button 
                              onClick={() => {
                                if(window.confirm(`${selectedFood.isim} silinsin mi?`)) handleDeleteFood(selectedFood.isim);
                              }}
                              className="p-2 rounded-xl bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 transition-all"
                              title="Sil"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-4">
                          {/* Metabolic Score */}
                          <div className="flex flex-col items-center">
                            <div className="w-[48px] h-[48px] relative">
                              <svg width="48" height="48" viewBox="0 0 48 48" className="-rotate-90">
                                <circle cx="24" cy="24" r="21" fill="none" stroke={darkMode ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)"} strokeWidth="4"/>
                                <circle 
                                  cx="24" cy="24" r="21" fill="none" stroke={getRingColor(metabolicScore)} strokeWidth="4"
                                  strokeDasharray={`${((metabolicScore / 10) * 2 * Math.PI * 21).toFixed(1)} ${(2 * Math.PI * 21).toFixed(1)}`}
                                  strokeLinecap="round"
                                />
                              </svg>
                              <div className="absolute inset-0 flex items-center justify-center text-[1rem] font-black" style={{ color: getRingColor(metabolicScore) }}>
                                {metabolicScore}
                              </div>
                            </div>
                            <span className="text-[0.45rem] text-zinc-500 font-black tracking-widest mt-1 uppercase">Metabolik</span>
                          </div>
                          {/* Health Score */}
                          <div className="flex flex-col items-center">
                            <div className="relative w-24 h-24 flex items-center justify-center">
                              <svg className="w-full h-full -rotate-90">
                                <circle cx="48" cy="48" r="40" fill="none" stroke={darkMode ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)"} strokeWidth="8" />
                                <motion.circle 
                                  cx="48" cy="48" r="40" fill="none" 
                                  stroke={getRingColor(nutritionalScore)} 
                                  strokeWidth="8"
                                  strokeDasharray="251.2"
                                  initial={{ strokeDashoffset: 251.2 }}
                                  animate={{ strokeDashoffset: 251.2 - (nutritionalScore / 10) * 251.2 }}
                                  transition={{ duration: 1.5, ease: "circOut" }}
                                  strokeLinecap="round"
                                />
                              </svg>
                              <div className="absolute inset-0 flex flex-col items-center justify-center">
                                <span className="text-[1.8rem] font-black leading-none tracking-tighter" style={{ color: getRingColor(nutritionalScore) }}>{nutritionalScore}</span>
                                <span className="text-[0.5rem] text-zinc-500 font-black tracking-widest mt-0.5">SAĞLIK</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Main Stats Grid */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mb-12">
                      {[
                        { label: 'Kalori / 100g', value: selectedFood.kal, color: 'text-zinc-500' },
                        { label: 'GI değeri', value: selectedFood.gi, color: 'text-orange-400' },
                        { label: 'GL (porsiyon)', value: calculateGY(selectedFood), color: 'text-blue-400' },
                        { label: 'Lif / 100g', value: `${selectedFood.lif}g`, color: 'text-emerald-400' }
                      ].map((item, i) => (
                        <div key={i} className={`p-4 xs:p-6 rounded-[1.5rem] sm:rounded-[2rem] border flex flex-col items-center text-center transition-all ${darkMode ? 'bg-white/5 border-white/5' : 'bg-black/5 border-black/10'}`}>
                          <div className={`text-[1.8rem] font-black mb-1 tracking-tighter ${darkMode ? 'text-white' : 'text-black'}`}>
                            {item.value}
                          </div>
                          <div className="text-[0.6rem] text-zinc-500 uppercase tracking-widest font-black">{item.label}</div>
                        </div>
                      ))}
                    </div>

                    {/* Insulin Effect Bar */}
                    <div className="mb-12">
                      <div className="flex justify-between items-center mb-4">
                        <span className="text-[0.75rem] font-black uppercase tracking-widest text-zinc-500">İnsülin Etkisi</span>
                        <span className={`text-[0.85rem] font-black ${metabolicScore < 4 ? 'text-red-500' : metabolicScore < 7 ? 'text-orange-500' : 'text-emerald-500'}`}>
                          {staticAnalysis.insulinEffect}
                        </span>
                      </div>
                      <div className={`h-3 w-full rounded-full overflow-hidden ${darkMode ? 'bg-white/5' : 'bg-black/5'}`}>
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: `${(10 - metabolicScore + 1) * 10}%` }}
                          transition={{ duration: 1, ease: "circOut" }}
                          className="h-full rounded-full"
                          style={{ 
                            background: `linear-gradient(90deg, #10B981 0%, #F59E0B 50%, #EF4444 100%)`,
                          }}
                        />
                      </div>
                    </div>

                    {/* Detailed Analysis Sections */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
                      <div className={`p-8 rounded-[2.5rem] border ${darkMode ? 'bg-white/5 border-white/5' : 'bg-black/5 border-black/5'}`}>
                        <div className="text-[0.7rem] font-black text-zinc-500 uppercase tracking-[0.3em] mb-4">METABOLİK ETKİ</div>
                        <p className={`text-[1rem] leading-relaxed font-medium ${darkMode ? 'text-zinc-300' : 'text-zinc-700'}`}>
                          {staticAnalysis.metabolicEffect}
                        </p>
                      </div>
                      <div className={`p-8 rounded-[2.5rem] border ${darkMode ? 'bg-white/5 border-white/5' : 'bg-black/5 border-black/5'}`}>
                        <div className="text-[0.7rem] font-black text-zinc-500 uppercase tracking-[0.3em] mb-4">FONKSİYONEL FAYDA</div>
                        <p className={`text-[1rem] leading-relaxed font-medium ${darkMode ? 'text-zinc-300' : 'text-zinc-700'}`}>
                          {staticAnalysis.functionalBenefit}
                        </p>
                      </div>
                    </div>

                    {/* Profile Based Comments */}
                    <div className="mb-12">
                      <div className="text-[0.7rem] font-black text-zinc-500 uppercase tracking-[0.3em] mb-6 text-center">PROFİL BAZLI YORUM</div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {[
                          { title: 'Kilo vermek isteyen', text: staticAnalysis.profileComments.weightLoss, color: 'border-emerald-500/30 bg-emerald-500/5', titleColor: 'text-emerald-500' },
                          { title: 'Diyabetik / İnsülin direnci', text: staticAnalysis.profileComments.diabetic, color: 'border-orange-500/30 bg-orange-500/5', titleColor: 'text-orange-500' },
                          { title: 'Sporcu', text: staticAnalysis.profileComments.athlete, color: 'border-blue-500/30 bg-blue-500/5', titleColor: 'text-blue-500' },
                          { title: 'Çölyak / Gluten hassasiyeti', text: staticAnalysis.profileComments.celiac, color: 'border-red-500/30 bg-red-500/5', titleColor: 'text-red-500' }
                        ].map((p, i) => (
                          <div key={i} className={`p-6 rounded-[2rem] border ${p.color}`}>
                            <h4 className={`text-[0.85rem] font-black mb-2 ${p.titleColor}`}>{p.title}</h4>
                            <p className={`text-[0.85rem] leading-relaxed font-medium ${darkMode ? 'text-zinc-400' : 'text-zinc-600'}`}>{p.text}</p>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Warning Box */}
                    <div className="bg-orange-500/10 rounded-[2rem] p-6 border border-orange-500/20 flex gap-4 items-start mb-12">
                      <AlertTriangle className="w-6 h-6 text-orange-500 shrink-0 mt-1" />
                      <p className={`text-[0.9rem] font-bold leading-relaxed ${darkMode ? 'text-orange-200' : 'text-orange-900'}`}>
                        {staticAnalysis.warning}
                      </p>
                    </div>

                    {/* Glucose Curve & Tips */}
                    <div className={`rounded-[2.5rem] p-8 mb-12 border relative overflow-hidden ${darkMode ? 'glass border-white/10' : 'light-glass border-black/10 shadow-lg'}`}>
                      <div className="absolute top-0 right-0 p-6 opacity-10">
                        <Activity size={80} className="text-emerald-400" />
                      </div>
                      <div className="text-[0.75rem] font-black text-emerald-400 uppercase tracking-[0.3em] mb-4 flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></div>
                        İnsülin Direnci Notu
                      </div>
                      <div className={`text-[1.1rem] font-medium leading-relaxed mb-8 relative z-10 ${darkMode ? 'text-zinc-100' : 'text-zinc-900'}`}>
                        {getTip(selectedFood, metabolicScore, consumptionHour, isProcessed, highGYCount, isLowSleep, isStressed)}
                      </div>
                      <div className={`relative z-10 rounded-3xl p-6 border ${darkMode ? 'bg-white/5 border-white/5' : 'bg-black/5 border-black/5'}`}>
                        <GlucoseCurve 
                          gi={selectedFood.gi} 
                          gy={calculateGY(selectedFood)} 
                          color={getRingColor(metabolicScore)} 
                          darkMode={darkMode}
                        />
                      </div>
                    </div>

                    <div className="mb-12">
                      {getHackerAdvice(selectedFood, metabolicScore, darkMode)}
                    </div>

                    {/* Meal Conditions Section */}
                    <div className={`mt-10 pt-8 border-t ${darkMode ? 'border-white/10' : 'border-black/10'}`}>
                      <p className="text-[0.75rem] font-black uppercase text-zinc-500 mb-6 tracking-[0.2em] text-center">Öğün Koşullarını Güncelle</p>
                      <div className="grid grid-cols-1 gap-4">
                        <div className={`flex border rounded-2xl overflow-hidden p-1 gap-1 ${darkMode ? 'bg-white/5 border-white/10' : 'bg-black/5 border-black/10'}`}>
                          <button 
                            onClick={() => { setIsCooked(true); setIsResistant(false); }}
                            className={`flex-1 py-3 px-2 rounded-xl text-[0.75rem] font-black uppercase tracking-wider transition-all ${isCooked && !isResistant ? 'bg-orange-500 text-black shadow-[0_0_15px_rgba(249,115,22,0.4)]' : 'text-zinc-500 hover:bg-white/5'}`}
                          >
                            Sıcak
                          </button>
                          <button 
                            onClick={() => { setIsCooked(false); setIsResistant(true); }}
                            className={`flex-1 py-3 px-2 rounded-xl text-[0.75rem] font-black uppercase tracking-wider transition-all ${isResistant ? 'bg-blue-500 text-black shadow-[0_0_15px_rgba(59,130,246,0.4)]' : 'text-zinc-500 hover:bg-white/5'}`}
                          >
                            Dirençli
                          </button>
                          <button 
                            onClick={() => { setIsCooked(false); setIsResistant(false); }}
                            className={`flex-1 py-3 px-2 rounded-xl text-[0.75rem] font-black uppercase tracking-wider transition-all ${!isCooked && !isResistant ? 'bg-zinc-700 text-white shadow-[0_0_15px_rgba(63,63,70,0.4)]' : 'text-zinc-500 hover:bg-white/5'}`}
                          >
                            Çiğ
                          </button>
                        </div>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <button 
                            onClick={() => setIsProcessed(!isProcessed)}
                            className={`flex items-center justify-between p-4 rounded-2xl border transition-all ${isProcessed ? 'bg-red-500/10 border-red-500/30 text-red-400 shadow-[0_0_20px_rgba(239,68,68,0.1)]' : 'bg-white/5 border-white/10 text-zinc-400'}`}
                          >
                            <div className="flex items-center gap-3">
                              <AlertTriangle size={18} className={isProcessed ? 'text-red-400' : 'text-zinc-500'} />
                              <span className="text-[0.8rem] font-medium">Soslu / İşlenmiş mi?</span>
                            </div>
                            <div className={`w-10 h-5 rounded-full relative transition-colors ${isProcessed ? 'bg-red-500' : 'bg-zinc-700'}`}>
                              <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${isProcessed ? 'right-1' : 'left-1'}`} />
                            </div>
                          </button>
                          
                          <button 
                            onClick={() => setIsLiquid(!isLiquid)}
                            className={`flex items-center justify-between p-4 rounded-2xl border transition-all ${isLiquid ? 'bg-purple-500/10 border-purple-500/30 text-purple-400 shadow-[0_0_20px_rgba(168,85,247,0.1)]' : 'bg-white/5 border-white/10 text-zinc-400'}`}
                          >
                            <div className="flex items-center gap-3">
                              <Droplets size={18} className={isLiquid ? 'text-purple-400' : 'text-zinc-500'} />
                              <span className="text-[0.8rem] font-medium">Sıvı / Püre mi?</span>
                            </div>
                            <div className={`w-10 h-5 rounded-full relative transition-colors ${isLiquid ? 'bg-purple-500' : 'bg-zinc-700'}`}>
                              <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${isLiquid ? 'right-1' : 'left-1'}`} />
                            </div>
                          </button>

                          <button 
                            onClick={() => setMealSequence(mealSequence === 'ideal' ? 'standard' : 'ideal')}
                            className={`flex items-center justify-between p-4 rounded-2xl border transition-all ${mealSequence === 'ideal' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.1)]' : 'bg-white/5 border-white/10 text-zinc-400'}`}
                          >
                            <div className="flex items-center gap-3">
                              <Wheat size={18} className={mealSequence === 'ideal' ? 'text-emerald-400' : 'text-zinc-500'} />
                              <span className="text-[0.8rem] font-medium">İdeal Sıra mı?</span>
                            </div>
                            <div className={`w-10 h-5 rounded-full relative transition-colors ${mealSequence === 'ideal' ? 'bg-emerald-500' : 'bg-zinc-700'}`}>
                              <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${mealSequence === 'ideal' ? 'right-1' : 'left-1'}`} />
                            </div>
                          </button>

                          <button 
                            onClick={() => setHasAcid(!hasAcid)}
                            className={`flex items-center justify-between p-4 rounded-2xl border transition-all ${hasAcid ? 'bg-yellow-500/10 border-yellow-500/30 text-yellow-400 shadow-[0_0_20px_rgba(234,179,8,0.1)]' : 'bg-white/5 border-white/10 text-zinc-400'}`}
                          >
                            <div className="flex items-center gap-3">
                              <Droplets size={18} className={hasAcid ? 'text-yellow-400' : 'text-zinc-500'} />
                              <span className="text-[0.8rem] font-medium">Limon / Sirke var mı?</span>
                            </div>
                            <div className={`w-10 h-5 rounded-full relative transition-colors ${hasAcid ? 'bg-yellow-500' : 'bg-zinc-700'}`}>
                              <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${hasAcid ? 'right-1' : 'left-1'}`} />
                            </div>
                          </button>
                        </div>

                        <div className={`flex items-center justify-between p-4 rounded-2xl border ${darkMode ? 'bg-white/5 border-white/10' : 'bg-black/5 border-black/10'}`}>
                          <div className="flex items-center gap-3">
                            <Loader2 size={18} className="text-indigo-400" />
                            <span className="text-[0.8rem] text-zinc-400 font-medium">Bugün kaç kez 20+ GY öğün yedin?</span>
                          </div>
                          <div className="flex items-center gap-4">
                            <button 
                              onClick={() => setHighGYCount(Math.max(0, highGYCount - 1))}
                              className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-zinc-100 hover:bg-white/20 transition-all"
                            >-</button>
                            <span className={`text-[1.1rem] font-black ${highGYCount >= 3 ? 'text-red-400' : 'text-zinc-100'}`}>{highGYCount}</span>
                            <button 
                              onClick={() => setHighGYCount(highGYCount + 1)}
                              className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-zinc-100 hover:bg-white/20 transition-all"
                            >+</button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </>
                );
              })()}

            </motion.div>
          </div>
        )}
      </AnimatePresence>

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
                              kal: food.estimatedCalories
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
                  <h4 className="text-[0.7rem] font-black text-zinc-500 uppercase tracking-[0.2em] ml-1">Bugünkü Kayıtlar</h4>
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

      </main>

      {/* Bottom Navigation for Mobile */}
      <div className="fixed bottom-0 left-0 right-0 z-[160] lg:hidden">
        <div className={`flex items-center justify-around p-3 pb-6 border-t backdrop-blur-2xl transition-colors ${darkMode ? 'bg-black/80 border-white/10' : 'bg-white/80 border-black/10 shadow-[0_-10px_30px_rgba(0,0,0,0.05)]'}`}>
          <button 
            onClick={() => {
              window.scrollTo({ top: 0, behavior: 'smooth' });
              setSearchVal('');
              setActiveCat('Tümü');
            }}
            className={`flex flex-col items-center gap-1 transition-all ${!isTrackingOpen && !isCoachOpen && !isProfileOpen ? 'text-[#2DFF73]' : 'text-zinc-500'}`}
          >
            <Utensils size={20} />
            <span className="text-[0.6rem] font-bold uppercase tracking-widest">Katalog</span>
          </button>
          <button 
            onClick={() => {
              setIsTrackingOpen(true);
              setIsCoachOpen(false);
              setIsProfileOpen(false);
            }}
            className={`flex flex-col items-center gap-1 transition-all ${isTrackingOpen ? 'text-[#2DFF73]' : 'text-zinc-500'}`}
          >
            <Activity size={20} />
            <span className="text-[0.6rem] font-bold uppercase tracking-widest">Takip</span>
          </button>
          <button 
            onClick={() => {
              setIsCoachOpen(true);
              setIsTrackingOpen(false);
              setIsProfileOpen(false);
            }}
            className={`flex flex-col items-center gap-1 transition-all ${isCoachOpen ? 'text-[#2DFF73]' : 'text-zinc-500'}`}
          >
            <Brain size={20} />
            <span className="text-[0.6rem] font-bold uppercase tracking-widest">Koç</span>
          </button>
          <button 
            onClick={() => {
              setIsHistoryOpen(true);
              setIsTrackingOpen(false);
              setIsCoachOpen(false);
              setIsProfileOpen(false);
            }}
            className={`flex flex-col items-center gap-1 transition-all ${isHistoryOpen ? 'text-[#2DFF73]' : 'text-zinc-500'}`}
          >
            <History size={20} />
            <span className="text-[0.6rem] font-bold uppercase tracking-widest">Geçmiş</span>
          </button>
          <button 
            onClick={() => {
              setIsProfileOpen(true);
              setIsTrackingOpen(false);
              setIsCoachOpen(false);
            }}
            className={`flex flex-col items-center gap-1 transition-all ${isProfileOpen ? 'text-[#2DFF73]' : 'text-zinc-500'}`}
          >
            <User size={20} />
            <span className="text-[0.6rem] font-bold uppercase tracking-widest">Profil</span>
          </button>
        </div>
      </div>

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
