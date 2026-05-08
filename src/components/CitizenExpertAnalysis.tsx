import React from 'react';
import { motion } from 'framer-motion';
import { Brain, Sparkles, Zap, Activity } from 'lucide-react';

interface CitizenExpertAnalysisProps {
  analysis: any;
  darkMode: boolean;
}

const getRingColor = (s: number) => {
  if (s >= 8) return '#2D5016';
  if (s >= 5) return '#8B5E00';
  if (s >= 3) return '#7A2E00';
  return '#6B0F0F';
};

export const CitizenExpertAnalysis = ({ analysis, darkMode }: CitizenExpertAnalysisProps) => {
  if (!analysis) return null;
  const ca = analysis.citizenAnalysis;
  if (!ca) return null;

  const scoreData = [
    { label: "Kan Şekeri", ...(ca.scores?.kanSekeri || { score: 0, max: 30, desc: "Bilinmiyor" }), color: "bg-blue-500" },
    { label: "Besin Yoğunluğu", ...(ca.scores?.besinYogunlugu || { score: 0, max: 25, desc: "Bilinmiyor" }), color: "bg-emerald-500" },
    { label: "Yağ Kalitesi", ...(ca.scores?.yagKalitesi || { score: 0, max: 20, desc: "Bilinmiyor" }), color: "bg-amber-500" },
    { label: "Lif Oranı", ...(ca.scores?.lifOrani || { score: 0, max: 15, desc: "Bilinmiyor" }), color: "bg-indigo-500" },
    { label: "İşlenmişlik", ...(ca.scores?.islenmislik || { score: 0, max: 10, desc: "Bilinmiyor" }), color: "bg-rose-500" }
  ];

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-1000">
      {/* Precision Scoring Cards */}
      <div className="grid grid-cols-1 gap-6 px-4">
        {scoreData.map((item, idx) => (
          <div key={idx} className="group">
            <div className="flex justify-between items-end mb-2 px-1">
              <div className="flex flex-col">
                <span className={`text-[0.65rem] font-black uppercase tracking-[0.2em] mb-0.5 ${darkMode ? 'text-zinc-500' : 'text-zinc-400'}`}>
                  {item.label}
                </span>
                <span className={`text-[0.85rem] font-bold ${darkMode ? 'text-zinc-300' : 'text-zinc-800'}`}>
                  {item.desc}
                </span>
              </div>
              <div className="flex items-baseline gap-1">
                <span className={`text-[1.1rem] font-black font-mono ${darkMode ? 'text-white' : 'text-black'}`}>
                  {item.score}
                </span>
                <span className="text-[0.7rem] font-bold text-zinc-500">/ {item.max}</span>
              </div>
            </div>
            <div className="score-track bg-zinc-800/10 dark:bg-white/5 h-2">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${(item.score / item.max) * 100}%` }}
                transition={{ duration: 1.5, ease: "circOut", delay: idx * 0.1 }}
                className={`score-bar ${item.color} shadow-sm h-full rounded-full`}
              />
            </div>
          </div>
        ))}
      </div>

      <div className="px-4">
        <div className={`p-8 rounded-[2rem] border relative overflow-hidden ${darkMode ? 'bg-zinc-900/50 border-white/5' : 'bg-zinc-50 border-black/5'}`}>
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <Brain size={64} />
          </div>
          <div className="relative z-10 flex gap-6 items-start">
            <div className="w-12 h-12 rounded-2xl bg-[#2DFF73]/10 flex items-center justify-center shrink-0">
              <Sparkles size={24} className="text-[#2DFF73]" />
            </div>
            <div>
              <div className="text-[0.65rem] font-black uppercase tracking-[0.2em] text-zinc-500 mb-2">Metabolik Projeksiyon</div>
              <p className={`text-[1rem] sm:text-[1.1rem] font-medium leading-relaxed italic ${darkMode ? 'text-white' : 'text-zinc-800'}`}>
                "{ca.aiNote || 'Derinlemesine analiz hazır.'}"
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 px-4">
        <div className={`p-6 rounded-[2rem] border ${darkMode ? 'bg-white/5 border-white/5' : 'bg-black/5 border-black/5'}`}>
          <div className="text-[0.65rem] font-black uppercase tracking-widest text-zinc-500 mb-4 opacity-50">Tıbbi Yaklaşım</div>
          <div className="space-y-4">
            <div>
              <div className="text-[0.75rem] font-black text-zinc-400 mb-1">Metabolik Uygunluk</div>
              <p className={`text-[0.9rem] font-bold ${darkMode ? 'text-zinc-300' : 'text-zinc-700'}`}>{ca.vatandasSorulari?.kiloVerme || 'Analiz Edilmedi'}</p>
            </div>
            <div>
              <div className="text-[0.75rem] font-black text-zinc-400 mb-1">Glisemik Güvenlik</div>
              <p className={`text-[0.9rem] font-bold ${darkMode ? 'text-zinc-300' : 'text-zinc-700'}`}>{ca.vatandasSorulari?.tansiyonSeker || 'Analiz Edilmedi'}</p>
            </div>
          </div>
        </div>

        <div className={`p-6 rounded-[2rem] border backdrop-blur-xl ${darkMode ? 'bg-emerald-500/5 border-emerald-500/10' : 'bg-emerald-50 border-emerald-100'}`}>
          <div className="flex items-center gap-3 mb-4">
            <Zap size={18} className="text-emerald-500" />
            <span className="text-[0.65rem] font-black uppercase tracking-widest text-emerald-500">Beslenme Hack'i</span>
          </div>
          <p className={`text-[0.95rem] font-bold leading-relaxed ${darkMode ? 'text-emerald-100/90' : 'text-emerald-900/90'}`}>
            {ca.iyilestirmeHack || 'Analiz bekleniyor...'}
          </p>
        </div>
      </div>

      <div className="px-4 pb-6">
        <div className={`p-8 rounded-[2.5rem] border flex items-center gap-8 ${darkMode ? 'bg-blue-500/5 border-blue-500/10' : 'bg-blue-50 border-blue-100'}`}>
          <div className="w-14 h-14 rounded-2xl bg-blue-500 flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
            <Activity size={24} />
          </div>
          <div>
            <div className="text-[0.65rem] font-black uppercase tracking-widest text-blue-500 mb-1 opacity-60">Optimum Hareket</div>
            <h3 className={`text-[1.1rem] sm:text-[1.3rem] font-black tracking-tight ${darkMode ? 'text-white' : 'text-black'}`}>
              Etkiyi sıfırlamak için <span className="text-blue-500">{ca.eforKarsiligi || 'hafif yürüyüş yeterli.'}</span>
            </h3>
          </div>
        </div>
      </div>
    </div>
  );
};
