import { Food, ConsumptionContext } from '../types';

/**
 * METABOLIC KERNEL v2.1
 * Inspired by Unix philosophy: Minimalist, Precise, Stateless.
 * Refactored for Dennis Ritchie's preference for clean structures.
 * "Write programs that do one thing and do it well."
 */

export function calculateEffectiveGI(f: Food, ctx: Partial<ConsumptionContext>): number {
  let effectiveGI = f.gi;
  const lowerName = f.isim.toLowerCase();

  if (ctx.isProcessed) effectiveGI += 15;

  if (ctx.isCooked) {
    if (f.kat === 'Sebzeler' && (lowerName.includes('havuç') || lowerName.includes('patates') || lowerName.includes('mısır'))) {
       effectiveGI *= 1.8;
    } else if (f.kat === 'Sebzeler' || f.kat === 'Tahıllar' || f.kat === 'Baklagiller') {
       effectiveGI *= 1.3;
    }
  }

  return effectiveGI;
}

export function calculateGY(f: Food, ctx: Partial<ConsumptionContext> = {}): number {
  const effectiveGI = calculateEffectiveGI(f, ctx);
  const net = Math.max(0, f.karb - f.lif);
  return (effectiveGI * net) / 100;
}

export function calculateMetabolicScore(f: Food, ctx: ConsumptionContext, profile?: any): number {
  const lowerName = f.isim.toLowerCase();
  
  // Industrial/Starch detection
  const industrialKeywords = ['bisküvi', 'gofret', 'şekerli', 'şurup', 'lokum', 'baklava'];
  const isIndustrial = industrialKeywords.some(kw => lowerName.includes(kw));
  
  const hiddenStarchKeywords = ['dolma', 'pilav', 'pirinç', 'köfte', 'mantı', 'börek'];
  const isHiddenStarch = hiddenStarchKeywords.some(kw => lowerName.includes(kw));

  const lif = isIndustrial ? 0 : f.lif;
  const effectiveGI = calculateEffectiveGI(f, ctx);
  const net = Math.max(0, f.karb - lif);
  const gy = (effectiveGI * net) / 100;

  // Penalties (Cezalar)
  const giCeza = Math.max(0, (effectiveGI - 45) * 2.5); 
  const gyCeza = Math.max(0, (gy - 10) * 4.0);
  
  let ham = (gy * 3.0) + (effectiveGI * 1.5) + giCeza + gyCeza - (lif * 12.0) - (f.pro * 5.0) - (f.yag * 2.5);
  
  // Ultra-processed detection
  const processedKeywords = ['sucuk', 'salam', 'sosis', 'pastırma', 'nugget', 'jambon', 'hazır paketli', 'füme', 'konserve', 'şekerli', 'soslu', 'kızarmış'];
  if (processedKeywords.some(kw => lowerName.includes(kw))) {
    ham += (['soslu', 'kızarmış', 'şekerli'].some(kw => lowerName.includes(kw)) ? 120 : 90);
  }

  // Dietary context penalties
  if (f.kat === 'Türk yemekleri' || f.kat === 'Süt ürünleri') {
    if (f.yag > 10 && f.yag * 9 > f.kal * 0.4) ham += 40;
  }

  if ((f.kat === 'Meyveler' && f.karb > 15) || lowerName.includes('bal') || lowerName.includes('pekmez') || lowerName.includes('reçel')) {
    ham += 35;
  }

  if (net > 15 && lif < 1.5) ham += 40;
  if (ctx.isLiquid) ham += 60;

  if (ctx.isResistant && (f.kat === 'Tahıllar' || f.kat === 'Baklagiller' || f.kat === 'Kuruyemişler' || lowerName.includes('patates'))) {
    ham -= 40;
  }

  // Sequence and environmental mods
  if (ctx.mealSequence === 'carbsFirst') ham *= 1.3;
  else if (ctx.mealSequence === 'ideal') ham *= 0.6;
  
  if (ctx.hasAcid) ham *= 0.9;
  if (ctx.hasMovement) ham *= 0.8;
  if (f.kat === 'Alkol') ham += 100;
  if (ctx.highGYCount >= 3) ham *= 1.15;
  if (ctx.isLowSleep || ctx.isStressed) ham *= 1.1;

  if (ctx.hour >= 20 || ctx.hour < 6) {
    if (net > 10) ham *= 1.2;
  }

  // Profile-based adjustments
  if (profile) {
    if (profile.insulinResistance === 'Yüksek') ham *= 1.25;
    else if (profile.insulinResistance === 'Orta') ham *= 1.15;
    else if (profile.insulinResistance === 'Düşük') ham *= 1.05;

    const age = parseInt(profile.age);
    if (age > 50) ham *= 1.1;
    else if (age > 40) ham *= 1.05;

    if (profile.activityLevel === 'Çok Aktif') ham *= 0.85;
    else if (profile.activityLevel === 'Aktif') ham *= 0.92;
    else if (profile.activityLevel === 'Sedanter') ham *= 1.1;

    if (profile.goal === 'Kilo Verme' && gy > 10) ham *= 1.15;
    if (profile.goal === 'Kas Kazanımı' && f.pro > 15) ham *= 0.9;
  }

  const norm = Math.max(0, Math.min(180, ham));
  let score = Math.max(1, Math.min(10, Math.round(10 - (norm / 180) * 9)));

  // Hard caps for known bad items
  if (['sosis', 'sucuk', 'salam'].some(kw => lowerName.includes(kw))) score = Math.min(score, 3.5);
  if (lowerName.includes('midye dolma')) score = 2.5;
  if (isIndustrial) score = 1.5;
  if (lowerName === 'rakı') score = Math.min(score, 2.0);

  return score;
}

export function calculateNutritionalScore(f: Food): number {
  const lowerName = f.isim.toLowerCase();
  let score = 5.0;

  score += (f.lif * 0.4);
  score += (f.pro * 0.2);

  if (f.kal > 400) score -= 1.5;
  else if (f.kal > 250) score -= 0.5;

  const ultraProcessed = ['sosis', 'sucuk', 'salam', 'bisküvi', 'gofret', 'cips', 'kola', 'enerji içeceği', 'nugget'];
  if (ultraProcessed.some(kw => lowerName.includes(kw))) score -= 4.0;

  if (f.kat === 'Sebzeler') score += 2.5;
  if (f.kat === 'Baklagiller') score += 2.0;
  if (f.kat === 'Meyveler') score += 1.5;
  if (f.kat === 'Alkol') score -= 5.0;
  if (f.kat === 'İçecekler' && f.karb > 5) score -= 2.0;

  const naturalSuperfoods = ['ceviz', 'fındık', 'badem', 'zeytinyağı', 'yumurta', 'balık', 'kefir', 'yoğurt'];
  if (naturalSuperfoods.some(kw => lowerName.includes(kw))) score += 1.5;

  if (f.karb > 20 && f.lif < 2) score -= 1.5;

  return Math.max(1, Math.min(10, Math.round(score * 10) / 10));
}
