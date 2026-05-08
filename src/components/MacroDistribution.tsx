import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip } from 'recharts';

interface MacroDistributionProps {
  karb: number;
  pro: number;
  yag: number;
  darkMode: boolean;
}

export function MacroDistribution({ karb, pro, yag, darkMode }: MacroDistributionProps) {
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
