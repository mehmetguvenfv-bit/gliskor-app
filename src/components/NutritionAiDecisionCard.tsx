import React from 'react';
import { NutritionAiReport, Food } from '../types';
import { 
  CheckCircle, 
  AlertCircle, 
  AlertTriangle, 
  XCircle, 
  ShieldCheck, 
  Sparkles, 
  Scale, 
  Flame, 
  Utensils, 
  HeartHandshake, 
  Check, 
  MinusCircle, 
  Zap, 
  ArrowRightCircle, 
  HelpCircle,
  Clock
} from 'lucide-react';

interface NutritionAiDecisionCardProps {
  report?: NutritionAiReport;
  food?: Food;
  darkMode?: boolean;
  userProfile?: any;
}

export function generateFallbackNutritionReport(food: Food, profile?: any): NutritionAiReport {
  const pro = food.pro || 0;
  const lif = food.lif || 0;
  const karb = food.karb || 0;
  const yag = food.yag || 0;
  const kal = food.kal || 0;
  const gi = food.gi || 0;

  // Decision & Score Heuristic
  let skor = 6.0;
  // Protein & Fiber reward
  skor += Math.min(2.5, (pro / 15) * 1.5);
  skor += Math.min(2.0, (lif / 6) * 1.5);
  // High sugar / GI penalty
  if (gi > 60) skor -= 1.8;
  else if (gi < 40) skor += 1.0;
  if (kal > 350) skor -= 0.8;
  if (yag > 25) skor -= 0.6;
  
  skor = Math.max(1.0, Math.min(9.8, Number(skor.toFixed(1))));

  let karar: NutritionAiReport['karar'] = '🟡 ÖLÇÜLÜ TÜKET';
  if (skor >= 8.5) karar = '🟢 ÇOK İYİ';
  else if (skor >= 7.0) karar = '🟢 İYİ SEÇİM';
  else if (skor >= 5.0) karar = '🟡 ÖLÇÜLÜ TÜKET';
  else if (skor >= 3.0) karar = '🟠 SINIRLI TÜKET';
  else karar = '🔴 MÜMKÜNSE KAÇIN';

  const avantajlar: string[] = [];
  const dezavantajlar: string[] = [];

  if (pro >= 12) avantajlar.push(`Yüksek protein yoğunluğu (${pro}g / 100g), tokluk ve kas onarımını destekler.`);
  else if (pro >= 6) avantajlar.push(`Dengeli protein kaynağı (${pro}g / 100g).`);

  if (lif >= 3) avantajlar.push(`Lif içeriği (${lif}g) sindirimi düzenlemeye ve glisemik yanıtı yumuşatmaya katkı sağlar.`);
  if (gi <= 45) avantajlar.push(`Düşük glisemik indeks (${gi} GI), kan şekerinde ani fırlamalara yol açmaz.`);

  if (food.demir && food.demir > 1) avantajlar.push(`Demir (${food.demir} mg) içeriği ile hücresel oksijen taşınmasını destekler.`);
  if (food.potasyum && food.potasyum > 200) avantajlar.push(`Potasyum (${food.potasyum} mg) elektrolit dengesini korur.`);

  if (avantajlar.length === 0) avantajlar.push('Temel besin enerjisi sağlar.');

  if (gi > 60) dezavantajlar.push(`Yüksek glisemik indeks (${gi} GI), insülin salınımını hızlandırabilir.`);
  if (karb > 45 && lif < 2) dezavantajlar.push('Hızlı sindirilen karbonhidrat oranı yüksektir, tokluk süresi kısa olabilir.');
  if (kal > 300) dezavantajlar.push(`Yüksek enerji yoğunluğu (${kal} kcal / 100g), porsiyon kontrolü şarttır.`);
  if (yag > 20) dezavantajlar.push(`Toplam yağ oranı yüksek (${yag}g), pişirme yöntemine dikkat edilmelidir.`);

  if (dezavantajlar.length === 0) dezavantajlar.push('Aşırı porsiyonda kalori fazlalığı oluşturabilir.');

  // User profile customization
  const goal = profile?.goal || 'Sağlıklı Yaşam';
  let kullaniciyaOzel = `Hedefiniz "${goal}": Bu besin öğününüzün makro dengesine göre entegre edilebilir.`;
  if (goal === 'Kilo Verme') {
    if (kal > 250) kullaniciyaOzel = 'Kilo verme hedefiniz için porsiyonu sınırlı tutup yanında bol lifli yeşillik tercih etmeniz önerilir.';
    else kullaniciyaOzel = 'Düşük/orta kalori yoğunluğu ile kalori açığı oluşturma sürecinizle uyumludur.';
  } else if (goal === 'Kas Kazanımı') {
    if (pro >= 10) kullaniciyaOzel = 'Kas kazanımı hedefiniz için değerli bir protein katkısı sunar.';
  }

  const porsiyon = food.portionLabel || `1 Standart Porsiyon (${food.portionGram || 100}g) [Varsayım]`;

  return {
    karar,
    skor,
    porsiyon,
    kaloriVeMakrolar: {
      kalori: food.portionGram ? Math.round((kal * food.portionGram) / 100) : kal,
      protein: food.portionGram ? Number(((pro * food.portionGram) / 100).toFixed(1)) : pro,
      karbonhidrat: food.portionGram ? Number(((karb * food.portionGram) / 100).toFixed(1)) : karb,
      yag: food.portionGram ? Number(((yag * food.portionGram) / 100).toFixed(1)) : yag,
      lif: food.portionGram ? Number(((lif * food.portionGram) / 100).toFixed(1)) : lif,
      tahminiMi: !food.portionGram
    },
    avantajlar,
    dezavantajlar,
    kullaniciyaOzelDegerlendirme: kullaniciyaOzel,
    dahaIyiKombinasyon: lif < 2 
      ? 'Yanına zeytinyağlı mevsim salatası veya fermente yoğurt/ayran ekleyerek glisemik dengeyi ve tokluğu artırın.'
      : 'Öğünü bol su ve hafif bir protein kaynağıyla tamamlamak metabolik denge sağlar.',
    alternatif: food.kat === 'Türk yemekleri'
      ? 'Kızartma veya aşırı yağda pişirmek yerine fırında veya ızgarada hazırlayarak yağ oranını %40 azaltabilirsiniz.'
      : 'Tam tahıllı veya daha az işlenmiş varyasyonlarını tercih etmek besin yoğunluğunu artırır.',
    kisaSonuc: skor >= 7.0 
      ? 'Evet, porsiyonunuza dikkat ederek güvenle tüketebilirsiniz.'
      : skor >= 5.0
      ? 'Ölçülü porsiyonla ve yanında lifli sebzelerle tüketmeniz daha uygun bir karardır.'
      : 'Sık tüketim yerine özel günlerde sınırlı miktarda tutulması hedefleriniz açısından daha avantajlıdır.'
  };
}

export function NutritionAiDecisionCard({
  report,
  food,
  darkMode = true,
  userProfile
}: NutritionAiDecisionCardProps) {
  const activeReport = report || (food ? generateFallbackNutritionReport(food, userProfile) : undefined);

  if (!activeReport) {
    return null;
  }

  // Decision Badge Styling
  const getDecisionBadge = (karar: NutritionAiReport['karar']) => {
    switch (karar) {
      case '🟢 ÇOK İYİ':
        return {
          bg: darkMode ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400' : 'bg-emerald-50 border-emerald-200 text-emerald-800',
          indicator: 'bg-emerald-500',
          icon: <CheckCircle className="text-emerald-500 shrink-0" size={20} />,
          title: 'ÇOK İYİ'
        };
      case '🟢 İYİ SEÇİM':
        return {
          bg: darkMode ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300' : 'bg-emerald-50/70 border-emerald-200 text-emerald-700',
          indicator: 'bg-emerald-400',
          icon: <CheckCircle className="text-emerald-500 shrink-0" size={20} />,
          title: 'İYİ SEÇİM'
        };
      case '🟡 ÖLÇÜLÜ TÜKET':
        return {
          bg: darkMode ? 'bg-amber-500/15 border-amber-500/30 text-amber-300' : 'bg-amber-50 border-amber-200 text-amber-800',
          indicator: 'bg-amber-400',
          icon: <AlertCircle className="text-amber-500 shrink-0" size={20} />,
          title: 'ÖLÇÜLÜ TÜKET'
        };
      case '🟠 SINIRLI TÜKET':
        return {
          bg: darkMode ? 'bg-orange-500/15 border-orange-500/30 text-orange-300' : 'bg-orange-50 border-orange-200 text-orange-800',
          indicator: 'bg-orange-500',
          icon: <AlertTriangle className="text-orange-500 shrink-0" size={20} />,
          title: 'SINIRLI TÜKET'
        };
      case '🔴 MÜMKÜNSE KAÇIN':
        return {
          bg: darkMode ? 'bg-rose-500/15 border-rose-500/30 text-rose-300' : 'bg-rose-50 border-rose-200 text-rose-800',
          indicator: 'bg-rose-500',
          icon: <XCircle className="text-rose-500 shrink-0" size={20} />,
          title: 'MÜMKÜNSE KAÇIN'
        };
      default:
        return {
          bg: darkMode ? 'bg-zinc-800 border-zinc-700 text-zinc-300' : 'bg-zinc-100 border-zinc-200 text-zinc-800',
          indicator: 'bg-zinc-400',
          icon: <ShieldCheck size={20} />,
          title: karar
        };
    }
  };

  const badge = getDecisionBadge(activeReport.karar);

  // Score color
  const getScoreColor = (score: number) => {
    if (score >= 8.5) return '#10B981';
    if (score >= 7.0) return '#34D399';
    if (score >= 5.0) return '#F59E0B';
    if (score >= 3.0) return '#F97316';
    return '#EF4444';
  };

  const scoreColor = getScoreColor(activeReport.skor);

  return (
    <div className={`rounded-2xl border transition-all ${darkMode ? 'bg-[#0D0D0E] border-white/10 text-zinc-100' : 'bg-white border-slate-200 text-slate-900'} shadow-xl overflow-hidden`}>
      
      {/* Top Banner: Nutrition AI Assistant Branding & 1. KARAR */}
      <div className={`p-5 sm:p-6 border-b ${darkMode ? 'bg-gradient-to-r from-emerald-950/30 to-transparent border-white/10' : 'bg-gradient-to-r from-emerald-50/70 to-slate-50 border-slate-200'}`}>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#2DFF73] text-black flex items-center justify-center font-black shadow-sm">
              <Sparkles size={18} />
            </div>
            <div>
              <div className="text-[0.65rem] font-black uppercase tracking-wider text-emerald-500 dark:text-[#2DFF73]">
                Nutrition AI • Karar Destek Asistanı
              </div>
              <h3 className="text-base sm:text-lg font-black tracking-tight flex items-center gap-2">
                Beslenme Kalitesi ve Karar Analizi
              </h3>
            </div>
          </div>

          {/* 1. KARAR BADGE */}
          <div className={`px-4 py-2 rounded-xl border flex items-center gap-2.5 shadow-sm font-black text-sm tracking-wide ${badge.bg}`}>
            {badge.icon}
            <span>1. KARAR:</span>
            <span className="underline underline-offset-4 decoration-2">{activeReport.karar}</span>
          </div>
        </div>
      </div>

      <div className="p-5 sm:p-7 space-y-6">

        {/* 2. SKOR & 3. PORSİYON & 4. KALORİ VE MAKROLAR Grid */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
          
          {/* 2. SKOR (0-10) */}
          <div className={`md:col-span-4 p-5 rounded-2xl border flex flex-col justify-between ${darkMode ? 'bg-white/[0.03] border-white/10' : 'bg-slate-50/70 border-slate-200'}`}>
            <div className="flex items-center justify-between mb-3">
              <span className="text-[0.7rem] font-bold uppercase tracking-wider text-zinc-400">
                2. BESLENME KALİTESİ SKORU
              </span>
              <Scale size={16} className="text-zinc-400" />
            </div>

            <div className="flex items-baseline gap-2 my-1">
              <span className="text-4xl font-black font-mono tracking-tight" style={{ color: scoreColor }}>
                {activeReport.skor}
              </span>
              <span className="text-xs font-bold text-zinc-400">/ 10</span>
            </div>

            <div className="w-full bg-zinc-200 dark:bg-zinc-800 h-2 rounded-full overflow-hidden mt-3">
              <div 
                className="h-full rounded-full transition-all duration-700" 
                style={{ width: `${(activeReport.skor / 10) * 100}%`, backgroundColor: scoreColor }}
              />
            </div>
            <p className="text-[0.68rem] text-zinc-400 mt-2 font-medium">
              Protein, lif, mikronutrient, tokluk ve işlenmişlik kriterlerine dayalı objektif ağırlıklı puan.
            </p>
          </div>

          {/* 3. PORSİYON & 4. KALORİ VE MAKROLAR */}
          <div className={`md:col-span-8 p-5 rounded-2xl border ${darkMode ? 'bg-white/[0.03] border-white/10' : 'bg-slate-50/70 border-slate-200'}`}>
            <div className="flex flex-wrap items-center justify-between gap-2 mb-3 pb-2 border-b border-black/5 dark:border-white/5">
              <div className="flex items-center gap-2">
                <Utensils size={16} className="text-emerald-500 dark:text-[#2DFF73]" />
                <span className="text-[0.7rem] font-bold uppercase tracking-wider text-zinc-400">
                  3. PORSİYON:
                </span>
                <span className="text-xs font-black">
                  {activeReport.porsiyon}
                </span>
              </div>
              {activeReport.kaloriVeMakrolar.tahminiMi && (
                <span className="text-[0.65rem] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-500 dark:text-amber-400 font-semibold border border-amber-500/20">
                  Standart Porsiyon Varsayımı
                </span>
              )}
            </div>

            <div className="text-[0.7rem] font-bold uppercase tracking-wider text-zinc-400 mb-2">
              4. KALORİ VE MAKROLAR:
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <div className={`p-2.5 rounded-xl border ${darkMode ? 'bg-black/40 border-white/5' : 'bg-white border-slate-200'}`}>
                <div className="text-[0.65rem] text-zinc-400 font-medium">Enerji</div>
                <div className="text-base font-black text-amber-500 font-mono">{activeReport.kaloriVeMakrolar.kalori} <span className="text-[0.65rem] font-normal text-zinc-400">kcal</span></div>
              </div>
              <div className={`p-2.5 rounded-xl border ${darkMode ? 'bg-black/40 border-white/5' : 'bg-white border-slate-200'}`}>
                <div className="text-[0.65rem] text-zinc-400 font-medium">Protein</div>
                <div className="text-base font-black text-emerald-500 font-mono">{activeReport.kaloriVeMakrolar.protein} <span className="text-[0.65rem] font-normal text-zinc-400">g</span></div>
              </div>
              <div className={`p-2.5 rounded-xl border ${darkMode ? 'bg-black/40 border-white/5' : 'bg-white border-slate-200'}`}>
                <div className="text-[0.65rem] text-zinc-400 font-medium">Karbonhidrat</div>
                <div className="text-base font-black text-blue-500 font-mono">{activeReport.kaloriVeMakrolar.karbonhidrat} <span className="text-[0.65rem] font-normal text-zinc-400">g</span></div>
              </div>
              <div className={`p-2.5 rounded-xl border ${darkMode ? 'bg-black/40 border-white/5' : 'bg-white border-slate-200'}`}>
                <div className="text-[0.65rem] text-zinc-400 font-medium">Yağ / Lif</div>
                <div className="text-base font-black text-purple-400 font-mono">
                  {activeReport.kaloriVeMakrolar.yag}g <span className="text-[0.65rem] font-normal text-zinc-400">/ {activeReport.kaloriVeMakrolar.lif || 0}g lif</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 5. AVANTAJLAR & 6. DEZAVANTAJLAR */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          
          {/* 5. AVANTAJLAR */}
          <div className={`p-4 sm:p-5 rounded-2xl border ${darkMode ? 'bg-emerald-950/15 border-emerald-500/20' : 'bg-emerald-50/60 border-emerald-200'}`}>
            <div className="flex items-center gap-2 mb-3 text-emerald-600 dark:text-emerald-400 font-black text-xs uppercase tracking-wider">
              <Check size={16} />
              <span>5. AVANTAJLAR</span>
            </div>
            <ul className="space-y-2">
              {activeReport.avantajlar.map((av, idx) => (
                <li key={idx} className="flex items-start gap-2 text-xs leading-relaxed text-slate-700 dark:text-zinc-300">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0 mt-1.5" />
                  <span>{av}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* 6. DEZAVANTAJLAR */}
          <div className={`p-4 sm:p-5 rounded-2xl border ${darkMode ? 'bg-rose-950/15 border-rose-500/20' : 'bg-rose-50/60 border-rose-200'}`}>
            <div className="flex items-center gap-2 mb-3 text-rose-600 dark:text-rose-400 font-black text-xs uppercase tracking-wider">
              <MinusCircle size={16} />
              <span>6. DEZAVANTAJLAR & DİKKAT EDİLECEKLER</span>
            </div>
            <ul className="space-y-2">
              {activeReport.dezavantajlar.map((dz, idx) => (
                <li key={idx} className="flex items-start gap-2 text-xs leading-relaxed text-slate-700 dark:text-zinc-300">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0 mt-1.5" />
                  <span>{dz}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* 7. KULLANICIYA ÖZEL DEĞERLENDİRME */}
        <div className={`p-4 sm:p-5 rounded-2xl border ${darkMode ? 'bg-blue-950/20 border-blue-500/20 text-blue-200' : 'bg-blue-50 border-blue-200 text-blue-950'}`}>
          <div className="flex items-center gap-2 mb-2 text-blue-500 dark:text-blue-400 font-black text-xs uppercase tracking-wider">
            <HeartHandshake size={16} />
            <span>7. KULLANICIYA ÖZEL DEĞERLENDİRME</span>
          </div>
          <p className="text-xs sm:text-sm leading-relaxed font-medium">
            {activeReport.kullaniciyaOzelDegerlendirme}
          </p>
        </div>

        {/* 8. DAHA İYİ KOMBİNASYON & 9. ALTERNATİF */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          
          {/* 8. DAHA İYİ KOMBİNASYON */}
          <div className={`p-4 sm:p-5 rounded-2xl border ${darkMode ? 'bg-white/[0.03] border-white/10' : 'bg-slate-50 border-slate-200'}`}>
            <div className="flex items-center gap-2 mb-2 text-amber-500 dark:text-amber-400 font-black text-xs uppercase tracking-wider">
              <Zap size={16} />
              <span>8. DAHA İYİ KOMBİNASYON</span>
            </div>
            <p className="text-xs sm:text-sm leading-relaxed text-slate-700 dark:text-zinc-300">
              {activeReport.dahaIyiKombinasyon}
            </p>
          </div>

          {/* 9. ALTERNATİF */}
          <div className={`p-4 sm:p-5 rounded-2xl border ${darkMode ? 'bg-white/[0.03] border-white/10' : 'bg-slate-50 border-slate-200'}`}>
            <div className="flex items-center gap-2 mb-2 text-indigo-500 dark:text-indigo-400 font-black text-xs uppercase tracking-wider">
              <ArrowRightCircle size={16} />
              <span>9. BESLEYİCİ ALTERNATİF & PİŞİRME</span>
            </div>
            <p className="text-xs sm:text-sm leading-relaxed text-slate-700 dark:text-zinc-300">
              {activeReport.alternatif}
            </p>
          </div>
        </div>

        {/* 10. KISA SONUÇ */}
        <div className={`p-5 rounded-2xl border-2 flex items-start gap-3.5 ${
          activeReport.karar.includes('ÇOK İYİ') || activeReport.karar.includes('İYİ SEÇİM')
            ? (darkMode ? 'bg-emerald-500/10 border-emerald-500/40 text-white' : 'bg-emerald-50 border-emerald-300 text-emerald-950')
            : activeReport.karar.includes('ÖLÇÜLÜ')
            ? (darkMode ? 'bg-amber-500/10 border-amber-500/40 text-white' : 'bg-amber-50 border-amber-300 text-amber-950')
            : (darkMode ? 'bg-rose-500/10 border-rose-500/40 text-white' : 'bg-rose-50 border-rose-300 text-rose-950')
        }`}>
          <div className="p-2 rounded-xl bg-black/10 dark:bg-white/10 shrink-0 mt-0.5">
            <HelpCircle size={20} className={activeReport.karar.includes('ÇOK İYİ') ? 'text-emerald-500' : 'text-amber-500'} />
          </div>
          <div>
            <div className="text-[0.7rem] font-black uppercase tracking-wider opacity-75 mb-1">
              10. KISA SONUÇ ("Bunu yiyebilir miyim?")
            </div>
            <div className="text-sm sm:text-base font-bold leading-relaxed">
              "{activeReport.kisaSonuc}"
            </div>
          </div>
        </div>

      </div>

      {/* Footer Medical Disclaimer */}
      <div className={`px-6 py-3 border-t text-[0.65rem] text-zinc-400 flex items-center justify-between ${darkMode ? 'bg-white/[0.02] border-white/5' : 'bg-slate-50 border-slate-200'}`}>
        <span>Tıbbi teşhis ve reçete yerine geçmez. Kişisel sağlık durumunuz için hekiminize ve diyetisyeninize danışınız.</span>
        <span className="font-semibold text-emerald-500 dark:text-[#2DFF73]">Nutrition AI Decision Support</span>
      </div>

    </div>
  );
}
