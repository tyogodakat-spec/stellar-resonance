import React, { useState, useEffect, useRef, useMemo, createContext, useContext } from "react";

/* ==========================================================================
   STELLAR RESONANCE — gacha de anime
   Combate por turno (HSR) · correntes de ressonância (WuWa) · summon (Aglaea)
   Single-file. Save via window.storage. Fotos via painel Admin (Imgur).
   ========================================================================== */

/* ---------- TEMA ---------- */
const C = {
  bg0: "#070613", bg1: "#100E26", panel: "#181433", panelHi: "#221C47",
  line: "#322a63", lineHi: "#473c80", gold: "#F6C95B", goldDim: "#A9842F",
  text: "#EDEBFF", mute: "#9089C4", dim: "#615a93", good: "#74E8A6", bad: "#FF6B82",
};
const ELEMENTS = {
  Holy:    { color: "#FFE08A", glyph: "✟", soft: "#3a3216" },
  Chaos:   { color: "#FF5FC4", glyph: "۞", soft: "#3a1733" },
  Glacial: { color: "#6FE3FF", glyph: "❉", soft: "#103238" },
  Fogo:    { color: "#FF6B45", glyph: "✦", soft: "#3a1810" },
  Vento:   { color: "#74E8A6", glyph: "↟", soft: "#103325" },
  Virus:   { color: "#A6E22E", glyph: "☣", soft: "#26330f" },
  Eletro:  { color: "#B98BFF", glyph: "⚡", soft: "#241439" },
};
const ELEMENT_NAMES = Object.keys(ELEMENTS);

const ROLES = {
  dps:      { label: "DPS", desc: "Dano em alvo único." },
  aoe:      { label: "DPS Área", desc: "Dano a todos os inimigos." },
  healer:   { label: "Curandeiro", desc: "Restaura HP e energia." },
  buffer:   { label: "Suporte", desc: "Aumenta ATK / CRIT / dano dos aliados." },
  debuffer: { label: "Debuffador", desc: "Reduz DEF e aplica vulnerabilidade." },
  shield:   { label: "Guardião", desc: "Concede escudos e provoca." },
  summoner: { label: "Invocador", desc: "Invoca uma unidade independente." },
};

/* ---------- PERSONAGENS (fan game) ---------- */
function mk(o) {
  return {
    id: o.id, name: o.name, element: o.element, role: o.role, rarity: o.rarity, avatar: o.avatar,
    title: o.title || "",
    base: { hp: o.hp, atk: o.atk, def: o.def, spd: o.spd, critRate: o.cr || 5, critDmg: o.cd || 50, energyMax: o.energy, energyRegen: o.er || 0, elemDmg: o.elemDmg || 0 },
    tags: o.tags || [],
    skill: o.skill,
  };
}
const ROSTER = [
  // ---- T5 ----
  mk({ id: "miyabi", name: "Miyabi", title: "Caçadora do Vazio", element: "Glacial", role: "aoe", rarity: 5, avatar: "🌸", hp: 1060, atk: 790, def: 420, spd: 103, energy: 160, cr: 8, cd: 60, tags: ["Gelo", "DPS", "Área", "Anomalia"],
    skill: { basicMul: 110, skillMul: 270, aoe: true, skillDot: { type: "freeze", mul: 80, turns: 2 }, ultMul: 540, ultAoe: true, ultDot: { type: "freeze", mul: 110, turns: 2 } } }),
  mk({ id: "kaiba", name: "Seto Kaiba", title: "Mestre dos Dragões", element: "Eletro", role: "summoner", rarity: 5, avatar: "🃏", hp: 1180, atk: 720, def: 480, spd: 101, energy: 300, cr: 5, cd: 50, er: 30, elemDmg: 5, tags: ["Eletro", "Invocador", "Deus Egípcio", "Único"],
    skill: { basicMul: 100, enBasic: 15, enSkill: 22, skillMul: 140, aoe: true, kaibaUlt: true, summon: { name: "Blue-Eyes White Dragon", avatar: "🐉", hpMul: 0.7, atkMul: 1.0, mul: 96, spd: 115 } } }),
  // ---- T4 ----
  mk({ id: "renji", name: "Renji Abarai", title: "Zabimaru", element: "Chaos", role: "dps", rarity: 4, avatar: "🗡️", hp: 1060, atk: 705, def: 440, spd: 104, energy: 120, tags: ["Caos", "DPS", "Sangramento"],
    skill: { basicMul: 100, skillMul: 235, skillDot: { type: "bleed", mul: 55, turns: 2 }, ultMul: 445 } }),
  mk({ id: "ace", name: "Portgas D. Ace", title: "Punho de Fogo", element: "Fogo", role: "aoe", rarity: 4, avatar: "🔥", hp: 1110, atk: 685, def: 450, spd: 100, energy: 120, tags: ["Fogo", "Área", "Queimadura"],
    skill: { basicMul: 100, skillMul: 150, aoe: true, skillDot: { type: "burn", mul: 55, turns: 2 }, ultMul: 330, ultAoe: true, ultDot: { type: "burn", mul: 85, turns: 3 } } }),
  mk({ id: "usopp", name: "Usopp", title: "Atirador de Elite", element: "Vento", role: "debuffer", rarity: 4, avatar: "🎯", hp: 960, atk: 565, def: 420, spd: 107, energy: 120, tags: ["Vento", "Debuffador", "Suporte"],
    skill: { basicMul: 90, skillMul: 130, skillDebuff: { defDown: 32, vuln: 18, turns: 3 }, ultMul: 220, ultDebuff: { vuln: 28, all: true, turns: 2 } } }),
  mk({ id: "sakura", name: "Sakura Haruno", title: "Força Centena", element: "Holy", role: "dps", rarity: 4, avatar: "🌺", hp: 1150, atk: 660, def: 470, spd: 98, energy: 120, tags: ["Holy", "DPS", "Cura"],
    skill: { basicMul: 100, skillMul: 225, ultMul: 405, ultHeal: { mul: 60, flat: 350, all: true } } }),
  mk({ id: "chopper", name: "Chopper", title: "Médico de Bordo", element: "Glacial", role: "healer", rarity: 4, avatar: "🦌", hp: 1250, atk: 500, def: 520, spd: 100, energy: 120, tags: ["Gelo", "Cura", "Suporte"],
    skill: { basicMul: 60, heal: { mul: 120, flat: 250, all: false }, ultHeal: { mul: 90, flat: 460, all: true }, energyGift: 12 } }),
  // ---- T5 PADRÃO (saem ao perder o 50/50 e no banner permanente) ----
  mk({ id: "kirara", name: "Kirara", title: "Encontro Estelar", element: "Chaos", role: "shield", rarity: 5, avatar: "💫", hp: 1360, atk: 560, def: 620, spd: 99, energy: 120, tags: ["Caos", "Guardião", "Escudo", "Provocar"],
    skill: { basicMul: 80, shield: { defMul: 90, flat: 320 }, taunt: true, ultShield: { defMul: 130, flat: 480, all: true }, ultBuff: { def: 30, all: true, turns: 2 }, energyGift: 8 } }),
  mk({ id: "yoruichi", name: "Yoruichi", title: "Deusa do Relâmpago", element: "Eletro", role: "dps", rarity: 5, avatar: "🐈‍⬛", hp: 1040, atk: 800, def: 410, spd: 125, energy: 120, cr: 10, cd: 62, tags: ["Eletro", "DPS", "Velocidade", "Choque"],
    skill: { basicMul: 110, skillMul: 260, skillBuff: { critRate: 20, spd: 12, all: false, turns: 2 }, skillDot: { type: "shock", mul: 45, turns: 2 }, ultMul: 510 } }),
  mk({ id: "kiritsugu", name: "Kiritsugu", title: "Caçador de Magos", element: "Virus", role: "debuffer", rarity: 5, avatar: "🔫", hp: 1080, atk: 725, def: 450, spd: 108, energy: 120, cr: 8, cd: 56, tags: ["Vírus", "Debuffador", "Veneno"],
    skill: { basicMul: 100, skillMul: 205, skillDebuff: { defDown: 40, vuln: 22, turns: 3 }, skillDot: { type: "poison", mul: 70, turns: 3 }, ultMul: 365, ultDebuff: { vuln: 30, all: true, turns: 3 } } }),
  // ---- Soi Fon (Limitada) ----
  mk({ id: "soifon", name: "Soi Fon", title: "Capitã da 2ª Divisão", element: "Vento", role: "dps", rarity: 5, avatar: "🦋", hp: 1040, atk: 740, def: 420, spd: 118, energy: 120, cr: 8, cd: 56, tags: ["Vento", "Follow-up", "Sinergia", "Assassina"],
    skill: { basicMul: 100, sfBasic: true, skillMul: 160, sfSkill: true, ultMul: 350, sfUlt: true } }),
  // ---- Omegamon Zwart D (Limitado) ----
  mk({ id: "omegamon", name: "Omegamon Zwart D", title: "Digital Hazard · Defeat", element: "Virus", role: "shield", rarity: 5, avatar: "🛡️", hp: 1480, atk: 700, def: 560, spd: 96, energy: 130, cr: 5, cd: 50, er: 15, elemDmg: 0, tags: ["Vírus", "Guardião", "Tanque", "Corrosão"],
    skill: { basicMul: 100, omgBasic: true, skillMul: 120, omgSkill: true, ultMul: 150, omgUlt: true } }),
];
const CHAR_MAP = Object.fromEntries(ROSTER.map((c) => [c.id, c]));
// Tag primária de um personagem (usada como requisito de nó) e todas as tags únicas do elenco
const primaryTag = (def) => (def && def.tags && def.tags[0]) || (def && def.element) || "Geral";
const ALL_TAGS = [...new Set(ROSTER.flatMap((c) => c.tags || []))]; // deduplicadas: tags compartilhadas não criam dungeon extra
const LIMITED_5 = ["miyabi", "kaiba", "soifon", "omegamon"];     // limitados (pool 50/50): só via rate-up
const FEATURED_LIMITEDS = ["omegamon", "soifon"]; // banners de evento ATIVOS no carrossel (6 dias)
const STANDARD_5 = ["kirara", "yoruichi", "kiritsugu"]; // padrão: caem ao perder o 50/50 e no banner permanente
const DEFAULT_FEATURED_CHAR = "omegamon";

/* ---------- ARMAS ---------- */
const WEAPONS = [
  { id: "starblade", name: "Lâmina Estelar", rarity: 5, role: "dps", atk: 180, critDmg: 28, passive: "Após usar Habilidade: +24% dano por 2 turnos.", buff: { onSkill: { dmgBonus: 24, turns: 2 } } },
  { id: "radiant", name: "Cetro Radiante", rarity: 5, role: "buffer", atk: 130, energyRegen: 12, passive: "Ao buffar aliados: +12% dano por 2 turnos.", buff: { onBuff: { dmgBonus: 12, turns: 2 } } },
  { id: "dragoncannon", name: "Disco de Duelo X", rarity: 5, role: "summoner", atk: 120, atkPct: 24, passive: "Visão do Sócio Majoritário: +24% de ATK. Exclusivo (Kaiba): cada Blue-Eyes em campo concede +18% de Dano CRÍTICO (máx +54%); a Habilidade injeta +30% de Perfuração de DEF e a Suprema concede +1 PH ao time." },
  { id: "hailstorm", name: "Nevasca de Outono", rarity: 5, role: "aoe", atk: 130, atkPct: 10, critRate: 18, critDmg: 30, passive: "Fio do Zero Absoluto: +10% de ATK, +18% CRIT e +36% CRIT DMG. Os DoTs de Geada da portadora ficam mais fortes, amplificando o dano Glacial.", buff: { onSkill: { dmgBonus: 24, turns: 2 } } },
  { id: "thunderclaws", name: "Garras do Trovão", rarity: 5, role: "dps", atk: 185, critRate: 22, passive: "Após Habilidade: +20% VEL por 2 turnos.", buff: { onSkill: { spd: 20, turns: 2 } } },
  { id: "originpistol", name: "Pistola da Origem", rarity: 5, role: "debuffer", atk: 165, critDmg: 30, extraDefDown: 14, passive: "Debuffs reduzem +14% DEF adicional e +30% CRIT DMG." },
  { id: "starmantle", name: "Manto Estelar", rarity: 5, role: "shield", atk: 110, def: 110, shieldBonus: 26, passive: "+26% no valor dos escudos." },
  { id: "ferrao_borboleta", name: "Ferrão da Borboleta", rarity: 5, role: "dps", atk: 150, spd: 20, critRate: 18, passive: "VEL +20%. CRIT +18%. Dano de Vento acumula [Carga Elétrica] (máx 5): cada marca +10% dano de follow-up. Ao entrar na Postura de Ferrão, consome todas as marcas e concede +24% de Dano Verdadeiro por marca consumida. Passiva ativa apenas em Soi Fon." },
  { id: "shadowkunai", name: "Kunai Sombria", rarity: 4, role: "dps", atk: 150, passive: "+150 ATK base." },
  { id: "slingshot", name: "Estilingue de Elite", rarity: 4, role: "debuffer", atk: 140, extraDefDown: 12, passive: "Debuffs reduzem +12% DEF adicional." },
  { id: "healstaff", name: "Bordão Curativo", rarity: 4, role: "healer", atk: 110, energyRegen: 10, ultEnergy: 10, passive: "Ult dá +10 energia ao time." },
  { id: "chaostome", name: "Tomo do Caos", rarity: 4, role: "aoe", atk: 150, dmgBonus: 18, passive: "+18% bônus de dano." },
  { id: "aegis", name: "Égide Brilhante", rarity: 4, role: "shield", atk: 100, def: 80, shieldBonus: 20, passive: "+20% no valor dos escudos." },
  { id: "glitch_apagamento", name: "Glitch de Apagamento", rarity: 5, role: "shield", atk: 110, def: 90, omgWeapon: true, passive: "Instabilidade Digital: +20% de HP Máximo. Quando o portador perde HP, +25% de Dano de Vírus por 2 turnos. Exclusivo (Omegamon): bônus de [Corrosão] dobrado; ao causar Dano Verdadeiro, +8 de Energia." },
];
const WEAPON_MAP = Object.fromEntries(WEAPONS.map((w) => [w.id, w]));
const WEAPON_5_IDS = WEAPONS.filter((w) => w.rarity === 5).map((w) => w.id);
const DEFAULT_FEATURED_WEAPON = "starblade";

/* ---------- RELÍQUIAS ---------- */
const RELIC_SETS = {
  "Tempestade Eletro": { color: "#B98BFF", el: "Eletro", p2: { elemDmg: 20 }, p4: { critRate: 5 }, flag4: "setEletro4", d2: "+20% de dano Eletro", d4: "+5% CRIT; ao agir (ação avançada/turno) +2% de dano, acumula até 12%" },
  "Sopro Glacial":     { color: "#6FE3FF", el: "Glacial", p2: { critRate: 7, elemDmg: 10 }, flag4: "setGlacial4", d2: "+7% CRIT e +10% de dano Glacial", d4: "ao aplicar DoT glacial (Geada), aplica +2% de vulnerabilidade — acumula com outras vulnerabilidades até +7%" },
  "Núcleo Ardente":    { color: "#FF6B45", flag2: "setFire2", flag4: "setFire4", d2: "dano de DoT de Fogo +10%", d4: "dano da Ultimate +20%; após a Ultimate, +8% de ATK no próximo turno" },
  "Praga Viral":       { color: "#A6E22E", p2: { dmgBonus: 8 }, flag4: "setViral4", d2: "+8% de dano", d4: "com Sangramento OU Veneno no alvo: +12% de dano; com AMBOS: +20% e cura 8% do HP máx" },
  "Benção Sagrada":    { color: "#FFE08A", p2: { hp: 20 }, flag4: "setHoly4", d2: "+20% de HP máx", d4: "+15% de cura e, ao curar, aplica escudo de 2% do HP máx do alvo" },
};
const RELIC_SET_NAMES = Object.keys(RELIC_SETS);
const RELIC_ITEM_ID = {
  "Tempestade Eletro": "item_relic_eletro",
  "Sopro Glacial":     "item_relic_glacial",
  "Núcleo Ardente":    "item_relic_fire",
  "Praga Viral":       "item_relic_viral",
  "Benção Sagrada":    "item_relic_holy",
};
const RELIC_EMOJI = {
  "Tempestade Eletro": "⚡",
  "Sopro Glacial":     "❄️",
  "Núcleo Ardente":    "🔥",
  "Praga Viral":       "🧬",
  "Benção Sagrada":    "✨",
};
const GAME_ITEMS = [
  { id: "item_jade",        name: "Jade Estelar",           icon: "💎" },
  { id: "item_chronicles",  name: "Crônicas",               icon: "📜" },
  { id: "item_ticket_char", name: "Bilhete de Personagem",  icon: "🎴" },
  { id: "item_ticket_wpn",  name: "Bilhete de Arma",        icon: "🔧" },
  { id: "item_ticket_std",  name: "Bilhete Permanente",     icon: "🪙" },
  { id: "item_exp",         name: "Lágrimas de XP",         icon: "📘" },
  { id: "item_boss_mat",    name: "Núcleo de Vestígio",     icon: "🔮" },
  { id: "item_asc_mat",     name: "Núcleo de Ascensão",     icon: "🔶" },
  { id: "item_wpn_mat",     name: "Engrenagem de Arma",     icon: "⚙️" },
  { id: "item_skill_mat",   name: "Cristal de Habilidade",  icon: "💠" },
  { id: "item_relic_eletro","name": "Relíquia · Tempestade Eletro", icon: "⚡" },
  { id: "item_relic_glacial","name":"Relíquia · Sopro Glacial",     icon: "❄️" },
  { id: "item_relic_fire",  name: "Relíquia · Núcleo Ardente",      icon: "🔥" },
  { id: "item_relic_viral", name: "Relíquia · Praga Viral",         icon: "🧬" },
  { id: "item_relic_holy",  name: "Relíquia · Benção Sagrada",      icon: "✨" },
];
const STAT_LABEL = { hp: "HP", atk: "ATK", def: "DEF", spd: "VEL", critRate: "CRIT", critDmg: "CRIT DMG", dmgBonus: "DANO", energyRegen: "REGEN ENERGIA", healBonus: "CURA", energyMax: "EN", vuln: "VULN", defPen: "PERFURAÇÃO", elemDmg: "DANO ELEM.", dotDmg: "DANO DE DoT", atkP: "ATK", hpP: "HP", defP: "DEF", atkFlat: "ATK", hpFlat: "HP", defFlat: "DEF" };
const PCT = { hp: 1, atk: 1, def: 1 };
// Quais chaves são exibidas com "%": tudo menos VEL e os *Flat
const isFlatKey = (k) => k === "spd" || k === "atkFlat" || k === "hpFlat" || k === "defFlat" || k === "energyMax";
const statSuffix = (k) => isFlatKey(k) ? "" : "%";
const statName = (k) => STAT_LABEL[k] || k;
// ----- Relíquias estilo Honkai: Star Rail -----
// 6 slots. Cabeça/Mãos têm main fixo; os outros sorteiam o main de um pool.
const RELIC_SLOTS = [
  { i: 0, name: "Cabeça", main: ["hpFlat"] },
  { i: 1, name: "Mãos", main: ["atkFlat"] },
  { i: 2, name: "Corpo", main: ["critRate", "critDmg", "atkP", "hpP", "defP"] },
  { i: 3, name: "Pés", main: ["spd", "atkP", "hpP", "defP"] },
  { i: 4, name: "Esfera", main: ["elemDmg", "atkP", "hpP", "defP"] },
  { i: 5, name: "Corda", main: ["energyRegen", "atkP", "hpP", "defP"] },
];
// Faixa do MAIN (Lv0 → Lv15)
const MAIN_RANGE = { hpFlat: [45, 705], atkFlat: [22, 352], critRate: [4.1, 32.4], critDmg: [8.1, 64.8], atkP: [4.3, 34.5], hpP: [4.3, 34.5], defP: [5.4, 43.2], spd: [4, 25], elemDmg: [4.8, 38.8], energyRegen: [2.4, 19.4] };
const relicMainValue = (k, level) => { const [a, b] = MAIN_RANGE[k] || [0, 0]; return a + (b - a) * (Math.min(level || 0, 15) / 15); };
// Tabela de SUBSTATUS: por rolagem sorteia Low/Mid/High (1/3 cada) e SOMA
const SUB_TIERS = { critRate: [2.59, 2.91, 3.24], critDmg: [5.18, 5.83, 6.48], spd: [2.0, 2.3, 2.6], dotDmg: [3.45, 3.88, 4.32], atkP: [3.45, 3.88, 4.32], hpP: [3.45, 3.88, 4.32], defP: [4.32, 4.86, 5.40], atkFlat: [16.93, 19.05, 21.16], hpFlat: [33.87, 38.10, 42.33], defFlat: [16.93, 19.05, 21.16] };
const SUB_KEYS = Object.keys(SUB_TIERS);
const tierRoll = (k) => { const t = SUB_TIERS[k]; return t[Math.floor(Math.random() * t.length)]; };
const RELIC_MAX_LEVEL = 15;
const relicSubLabel = (s) => statName(s.stat) + (isFlatKey(s.stat) ? "" : "%");
function makeRelic(slotIdx, setName) {
  const slot = RELIC_SLOTS[slotIdx]; const main = pick(slot.main);
  const r = { id: "r" + Date.now() + slotIdx + Math.random().toString(36).slice(2, 5), set: setName, slot: slotIdx, level: 0, main, mainElement: main === "elemDmg" ? pick(ELEMENT_NAMES) : null, subs: [] };
  const n = Math.random() < 0.5 ? 3 : 4; // dropa com 3 ou 4 substatus
  const avail = SUB_KEYS.filter((k) => k !== main);
  for (let i = 0; i < n; i++) { const idx = Math.floor(Math.random() * avail.length); const k = avail.splice(idx, 1)[0]; r.subs.push({ stat: k, value: tierRoll(k) }); }
  return r;
}
// Upgrade aditivo: +3/+6/+9/+12/+15. Se tiver 3 subs, o 1º gatilho adiciona o 4º; senão soma aleatório.
function upgradeRelic(r) {
  if (!r || r.level >= RELIC_MAX_LEVEL) return r;
  const nr = { ...r, level: r.level + 3, subs: r.subs.map((s) => ({ ...s })) };
  if (nr.subs.length < 4) { const avail = SUB_KEYS.filter((k) => k !== nr.main && !nr.subs.some((s) => s.stat === k)); const k = pick(avail); nr.subs.push({ stat: k, value: tierRoll(k) }); }
  else { const s = nr.subs[Math.floor(Math.random() * nr.subs.length)]; s.value += tierRoll(s.stat); }
  return nr;
}
const EMPTY_RELICS = () => [null, null, null, null, null, null];
function relicLabel(r) { if (!r) return ""; return r.main === "elemDmg" ? `Dano ${r.mainElement}` : statName(r.main); }
function relicSuffix(key) { return isFlatKey(key) ? "" : "%"; }
const relicMainText = (r) => `${relicLabel(r)} +${relicMainValue(r.main, r.level).toFixed(1)}${relicSuffix(r.main)}`;
const relicSetData = (name) => RELIC_SETS[name] || { color: "#8a8f9c" }; // acesso seguro (saves antigos com sets removidos)
function isValidRelic(r) { return !!(r && typeof r === "object" && r.main && MAIN_RANGE[r.main] && RELIC_SETS[r.set] && Array.isArray(r.subs)); }
function sanitizeRelicSlots(arr) { const out = (Array.isArray(arr) ? arr.slice(0, 6) : []).map((r) => (isValidRelic(r) ? r : null)); while (out.length < 6) out.push(null); return out; }
const setBonusText = (sd) => { if (!sd) return ""; const p2 = sd.d2 || (sd.p2 ? Object.entries(sd.p2).map(([k, v]) => `+${v}${relicSuffix(k)} ${statName(k)}`).join(", ") : "—"); return `2pç: ${p2} · 4pç: ${sd.d4 || "—"}`; };

/* ---------- STATS ---------- */
const levelMul = (lv) => 0.45 + 0.55 * (Math.min(Math.max(lv || 1, 1), 90) - 1) / 89; // nv1≈0.45 → nv90=1.0 (escala HSR, sem bloat)
const WEAPON_MAX_LEVEL = 80;
const weaponLevelMul = (lv) => 0.15 + 0.85 * (Math.min(Math.max(lv || 1, 1), 80) - 1) / 79; // arma nv1≈0.15 → nv80=1.0 (cresce bastante)
const weaponCost = (lv) => ({ wmat: 1, exp: 1 + Math.floor(lv / 15) });

// Passiva de personagem (sempre ativa) — identidade única do kit, descrita em detalhe
const PASSIVE = {
  miyabi:    { name: "Caçadora do Vazio · Geada Profunda", desc: "Talento: sempre que Miyabi atinge um inimigo que esteja sob QUALQUER efeito contínuo (Congelamento, Queimadura, Veneno, Choque ou Sangramento), o golpe causa +30% de dano. Como suas próprias Habilidade e Ultimate marcam congelamento, ela rapidamente se auto-habilita e escala o dano contra alvos já afligidos pela equipe — quanto mais DoTs no campo, mais letal ela fica.", flag: "pShatter" },
  kaiba:     { name: "Inversão de Ações", desc: "Talento (Bateria & Auto-Buff): para cada Blue-Eyes ativo no campo, o ATK de Kaiba aumenta em 20% e sua Taxa de Regeneração de Energia aumenta em +15% — acumulando até 3 vezes. Com o campo cheio (3 dragões), são +60% de ATK e +45% de recarga de energia, fazendo Kaiba carregar a Suprema cada vez mais rápido conforme o exército cresce. Os dragões herdam o ATK turbinado no momento em que são invocados.", flag: null },
  renji:     { name: "Instinto de Caça · Execução", desc: "Talento: Renji fareja o sangue. Contra inimigos abaixo de 40% de HP, todos os seus ataques causam +25% de dano, transformando-o em um finalizador implacável. Combina com o Sangramento da Habilidade, que mantém o alvo perdendo vida até entrar no alcance de execução.", flag: "pExecute" },
  ace:       { name: "Vontade da Chama · Brasa Viva", desc: "Talento: a Queimadura aplicada por Ace é 30% mais forte que uma queimadura comum e ignora parte da defesa do alvo ao longo do tempo. Cada inimigo aceso continua perdendo vida no início do próprio turno, e Ace amplifica todo o dano que causa a alvos em chamas.", flag: "pScorch" },
  usopp:     { name: "Olho de Águia · Ponto Fraco", desc: "Talento: Usopp mira sempre o ponto vulnerável. Seus debuffs reduzem +12% de DEF adicional do alvo (além do valor base do golpe), abrindo a guarda do inimigo para toda a equipe. Quanto mais ele enfraquece um alvo, mais dano todos passam a causar nele.", flag: "pWeakpoint" },
  sakura:    { name: "Selo Centenário · Mãos que Curam", desc: "Talento: o chakra de cura de Sakura é refinado — a cura do seu Ultimate é 25% mais forte. Ela equilibra dano e suporte: bate forte com os punhos e, no Ultimate, devolve uma parcela enorme de HP a todo o time, segurando a equipe em lutas longas.", flag: "pMedic" },
  chopper:   { name: "Pontos Vitais · Médico Dedicado", desc: "Talento: como médico de bordo, todas as curas de Chopper (Habilidade e Ultimate) são 25% mais fortes. Ele prioriza sempre o aliado mais ferido e ainda distribui energia ao time, mantendo o grupo vivo e com os Ultimates carregados.", flag: "pRegen" },
  kirara:    { name: "Baluarte Estelar", desc: "Talento: os escudos de Kirara são 25% mais resistentes. Ela provoca os inimigos para atrair os ataques e converte a própria DEF altíssima em barreiras grossas para todo o time, sustentando a linha de frente contra os golpes mais pesados dos chefes.", flag: "pBulwark" },
  yoruichi:  { name: "Deusa Veloz · Shunko", desc: "Talento: a velocidade divina de Yoruichi adianta drasticamente sua barra de ação — ela quase sempre age primeiro na batalha, aplicando Choque e abrindo o combate antes do inimigo reagir. Sua altíssima VEL também significa turnos mais frequentes ao longo da luta.", flag: "pSwift" },
  kiritsugu: { name: "Análise · Caçador de Magos", desc: "Talento: o frio cálculo de Kiritsugu encontra a falha do alvo — toda vulnerabilidade que ele aplica é +12% mais forte. Combinado com o Veneno da Habilidade, ele transforma qualquer inimigo em um alvo que recebe dano amplificado de toda a equipe e ainda derrete ao longo dos turnos.", flag: "pAnalyze" },
  soifon: { name: "Ciclo do Ferrão · Vibração da Morte", desc: "Talento: aliados que causam Dano de Eletro concedem 1 carga de [Vibração de Ferrão] para Soi Fon (máx 3). Com 3 cargas, ela entra em Postura de Ferrão — próximo Ataque Básico causa Dano Verdadeiro (120% ATK, ignora DEF e Escudos). Com [Ferrão da Morte] no alvo e ataques Eletro de aliados, dispara follow-ups instantâneos de Vento (máx 2/turno de aliado).", flag: "sfFollowup" },
  omegamon: { name: "Digital Hazard", desc: "Talento: enquanto Omegamon Zwart D está em campo, o HP Máximo de todos os aliados aumenta em 25%. Sempre que o portador ou um aliado com [Protocolo de Infecção] é atacado, acumula 1 carga de [Vírus Defeat] (máx 5). Cada carga concede +15% de CRIT DMG e reduz a DEF do atacante em 10%. Ao atingir 5 cargas, o próximo ataque remove todos os buffs do alvo e causa Dano Verdadeiro igual a 20% do HP Máximo do portador.", flag: "omgTalent" },
};
// Corrente de Ressonância / Eidolons — 6 nós ÚNICOS por personagem (estilo HSR/WuWa)
const A_SKILL = { amp: "skill", ampV: 25 }, A_ULT = { amp: "ult", ampV: 50 };
const CONS = {
  miyabi: [
    { name: "C1 · Saque Instantâneo", flag: "miC1", desc: "Ao entrar em combate, Miyabi começa imediatamente com 3 PH (máximo) e entra na Postura Iaido de graça. O primeiro corte aprimorado desta postura causa +50% de dano." },
    { name: "C2 · Fio Prorrogado", flag: "miC2", desc: "A Habilidade Lâminas de Gelo não consome mais PH se for usada contra inimigos Congelados. Além disso, cada acerto crítico recupera 5 de Energia para Miyabi." },
    { name: "C3 · Ritmo da Nevasca", ...A_SKILL, flag: "miC3", desc: "Eleva o nível do Ataque Básico e da Habilidade. Sempre que Miyabi usar a Habilidade, seu ATK aumenta em +20% até o fim do combate (acumula até 3 vezes)." },
    { name: "C4 · Domínio do Zero Absoluto", flag: "miC4", desc: "Ao conjurar a Ultimate Inverno Eterno, o campo vira uma Zona de Geada por 2 turnos. Dentro desta zona, Miyabi fica permanentemente em Postura Iaido e seus Ataques Básicos não precisam acumular nem consumir PH para ativar o corte aprimorado de penetração de DEF." },
    { name: "C5 · Gélido Ancestral", ...A_ULT, desc: "Eleva em +50% o dano da Ultimate (nevasca total em área) e reforça os Nós de Atributo de gelo." },
    { name: "C6 · Estilo Kamakura: Julgamento Final", flag: "miC6", desc: "O limite máximo de PH de Miyabi aumenta para 4. Ao atingir 4 PH, a Postura Iaido evolui para o Corte do Fim dos Tempos: o ataque passa a atingir TODOS os inimigos com 450% de ATK, ignora 50% da DEF e, se eliminar qualquer alvo, reseta instantaneamente a barra de ação de Miyabi para ela jogar de novo." },
  ],
  kaiba: [
    { name: "S1 · Pressão Dracônica", flag: "kS1", desc: "Mudança de kit: os ataques dos Dragões (e da Fusão Definitiva) passam a quebrar a guarda elemental do alvo, aplicando +15% de vulnerabilidade a Eletro/Holy/Fogo por 2 turnos. Cada golpe dracônico deixa o inimigo recebendo cada vez mais dano da sua equipe inteira." },
    { name: "S2 · Barreira do Duelista", flag: "kS2", desc: "Mudança de kit: sempre que Kaiba usa a Perícia (Ascensão do Dragão Branco), ele ergue para si um escudo equivalente a 100% do seu ATK. Como ele invoca dragões com frequência, isso o mantém praticamente sempre protegido na linha de frente." },
    { name: "S3 · Treinamento de Elite", amp: "skill", ampV: 25, desc: "Aprimoramento: eleva o nível da Perícia (+25% de dano da Ascensão do Dragão Branco) e reforça o Ataque Básico, aumentando todo o dano Eletro de Kaiba e, por consequência, o que os dragões herdam." },
    { name: "S4 · Decreto Soberano", flag: "kS4", desc: "Mudança de kit: ativar a Suprema (Obelisco ou Dragão Definitivo) concede +35% de Dano CRÍTICO a TODA a equipe por 3 turnos. O Ultimate de Kaiba deixa de ser só uma bomba e vira também um buff coletivo devastador." },
    { name: "S5 · Poder Absoluto", amp: "ult", ampV: 50, desc: "Aprimoramento: eleva o nível da Suprema e do Talento (+50% no dano do Punho do Destino do Obelisco e da Rajada Neutrônica do Dragão Definitivo)." },
    { name: "S6 · Trindade Divina", flag: "kS6", desc: "Mudança de kit (capstone): escolher o Obelisco passa a NÃO sacrificar os dragões — eles permanecem em campo após o Punho do Destino. E escolher o Dragão Definitivo faz a Fusão durar +1 turno e executar a Rajada Neutrônica Tripla DUAS vezes seguidas ao entrar. A forma final absoluta do monarca dos dragões." },
  ],
  renji: [
    { name: "S1 · Rugido de Zabimaru", stat: "atk", value: 8, desc: "Aprimoramento: ATK +8%." },
    { name: "S2 · Presas Sangrentas", flag: "dotBoost", desc: "Mudança de kit: o Sangramento aplicado por Renji causa +40% de dano por turno, tornando o DoT uma fonte de dano comparável aos próprios golpes." },
    { name: "S3 · Chicote Serpente", ...A_SKILL, desc: "Eleva em +25% o dano da Habilidade (Zabimaru estendido em chicote)." },
    { name: "S4 · Instinto Selvagem", stat: "critRate", value: 8, desc: "Aprimoramento: Taxa de CRIT +8%." },
    { name: "S5 · Hihiō Zabimaru", ...A_ULT, desc: "Eleva em +50% o dano do Ultimate (forma babuíno-serpente)." },
    { name: "S6 · Bankai Total", flag: "afflictedDmg", desc: "Mudança de kit: contra inimigos sangrando OU com DEF reduzida, Renji causa +25% de dano. Combinado ao próprio Sangramento, ele vira o carrasco de alvos afligidos." },
  ],
  ace: [
    { name: "S1 · Chama Viva", stat: "atk", value: 8, desc: "Aprimoramento: ATK +8%." },
    { name: "S2 · Brasa Eterna", flag: "dotBoost", desc: "Mudança de kit: a Queimadura de Ace causa +40% de dano por turno (somado à passiva). O fogo passa a responder por boa parte do dano total." },
    { name: "S3 · Lança de Fogo", ...A_SKILL, desc: "Eleva em +25% o dano da Habilidade em área." },
    { name: "S4 · Inferno", flag: "afflictedDmg", desc: "Mudança de kit: contra inimigos em chamas ou com DEF reduzida, +25% de dano em todos os golpes." },
    { name: "S5 · Grande Incêndio", ...A_ULT, desc: "Eleva em +50% o dano do Ultimate em área." },
    { name: "S6 · Vontade Flamejante", flag: "ultRefund", desc: "Mudança de kit: após o Ultimate, Ace recupera 40 de energia, permitindo encadear Ultimates muito mais rápido em lutas longas." },
  ],
  usopp: [
    { name: "S1 · Mira Precisa", stat: "critRate", value: 8, desc: "Aprimoramento: Taxa de CRIT +8%." },
    { name: "S2 · Munição Especial", flag: "debuffPlus", desc: "Mudança de kit: todos os debuffs de Usopp duram +1 turno e aplicam +12% de vulnerabilidade adicional, ampliando a janela em que o time inteiro causa dano extra." },
    { name: "S3 · Tiro Certeiro", ...A_SKILL, desc: "Eleva em +25% o dano da Habilidade." },
    { name: "S4 · Estilhaço", flag: "defShredHit", desc: "Mudança de kit: os ataques de Usopp passam a estilhaçar a armadura — cada golpe reduz +12% de DEF do alvo por 2 turnos, empilhando com seus outros debuffs." },
    { name: "S5 · Pop Green: Impacto", ...A_ULT, desc: "Eleva em +50% o dano do Ultimate." },
    { name: "S6 · Lenda do Atirador", flag: "vulnUlt", desc: "Mudança de kit: o Ultimate marca TODOS os inimigos com +25% de vulnerabilidade por 2 turnos, virando um amplificador de dano para a equipe inteira." },
  ],
  sakura: [
    { name: "S1 · Força Centena", stat: "atk", value: 8, desc: "Aprimoramento: ATK +8%." },
    { name: "S2 · Ninjutsu Médico", flag: "healPlus", desc: "Mudança de kit: todas as curas de Sakura ficam +30% mais fortes (somado à passiva), permitindo que ela segure o time sozinha enquanto causa dano." },
    { name: "S3 · Soco Esmagador", ...A_SKILL, desc: "Eleva em +25% o dano da Habilidade." },
    { name: "S4 · Selo de Yin", stat: "critDmg", value: 20, desc: "Aprimoramento: CRIT DMG +20%." },
    { name: "S5 · Punho Sobre-humano", ...A_ULT, desc: "Eleva em +50% o dano E a cura do Ultimate." },
    { name: "S6 · Selo Centenário", flag: "cleanseUlt", desc: "Mudança de kit: o Ultimate também REMOVE 1 debuff de cada aliado, limpando o time enquanto cura e causa dano em área." },
  ],
  chopper: [
    { name: "S1 · Diagnóstico", stat: "healBonus", value: 15, desc: "Aprimoramento: Bônus de cura +15%." },
    { name: "S2 · Rumble Ball", flag: "healPlus", desc: "Mudança de kit: todas as curas de Chopper ficam +30% mais fortes (com a passiva, a cura se torna colossal)." },
    { name: "S3 · Cuidado Intensivo", ...A_SKILL, desc: "Eleva em +25% o efeito de cura da Habilidade." },
    { name: "S4 · Barreira Médica", flag: "healShield", desc: "Mudança de kit: além de curar, Chopper concede um ESCUDO igual a 30% do valor curado — recupera HP e ainda previne o próximo dano." },
    { name: "S5 · Operação de Emergência", ...A_ULT, desc: "Eleva em +50% a cura do Ultimate em área." },
    { name: "S6 · Médico de Bordo", flag: "reviveEnergy", desc: "Mudança de kit: o Ultimate concede +20 de energia a TODA a equipe, acelerando os Ultimates dos DPS e transformando Chopper num motor de rotação." },
  ],
  kirara: [
    { name: "S1 · Postura Firme", stat: "def", value: 10, desc: "Aprimoramento: DEF +10%." },
    { name: "S2 · Encontro Estelar", flag: "shieldPlus", desc: "Mudança de kit: os escudos de Kirara ficam +30% mais fortes (somado à passiva), criando barreiras quase intransponíveis." },
    { name: "S3 · Abraço Cósmico", ...A_SKILL, desc: "Eleva em +25% o valor do escudo da Habilidade." },
    { name: "S4 · Coração Resiliente", stat: "hp", value: 12, desc: "Aprimoramento: HP +12%." },
    { name: "S5 · Constelação Guardiã", ...A_ULT, desc: "Eleva em +50% o escudo e o buff de DEF do Ultimate em área." },
    { name: "S6 · Muralha Viva", flag: "ultDmgBuff", desc: "Mudança de kit: o Ultimate concede +20% de bônus de dano a TODA a equipe por 2 turnos — Kirara deixa de ser só defensiva e passa a turbinar o dano do grupo." },
  ],
  yoruichi: [
    { name: "S1 · Deusa da Velocidade", stat: "spd", value: 10, desc: "Aprimoramento: VEL +10, agindo ainda antes na ordem de turnos." },
    { name: "S2 · Shunko Crepitante", flag: "dotBoost", desc: "Mudança de kit: o Choque de Yoruichi causa +40% de dano por turno." },
    { name: "S3 · Punho Relâmpago", ...A_SKILL, desc: "Eleva em +25% o dano da Habilidade." },
    { name: "S4 · Forma Felina", stat: "critDmg", value: 25, desc: "Aprimoramento: CRIT DMG +25%." },
    { name: "S5 · Shunko: Raijin", ...A_ULT, desc: "Eleva em +50% o dano do Ultimate." },
    { name: "S6 · Velocidade Divina", flag: "ultRefund", desc: "Mudança de kit: após o Ultimate, Yoruichi recupera 40 de energia — graças à VEL altíssima, ela consegue encadear Ultimates em sequência." },
  ],
  kiritsugu: [
    { name: "S1 · Olhar Clínico", stat: "critRate", value: 8, desc: "Aprimoramento: Taxa de CRIT +8%." },
    { name: "S2 · Bala de Origem", flag: "dotBoost", desc: "Mudança de kit: o Veneno de Kiritsugu causa +40% de dano por turno." },
    { name: "S3 · Tiro Calculado", ...A_SKILL, desc: "Eleva em +25% o dano da Habilidade." },
    { name: "S4 · Caçador de Magos", flag: "debuffPlus", desc: "Mudança de kit: debuffs duram +1 turno e aplicam +12% de vulnerabilidade adicional." },
    { name: "S5 · Time Alter: Triple Accel", ...A_ULT, desc: "Eleva em +50% o dano do Ultimate." },
    { name: "S6 · Origem da Morte", flag: "afflictedDmg", desc: "Mudança de kit: +25% de dano contra inimigos envenenados ou com DEF reduzida — combina com o próprio veneno para um teto de dano altíssimo." },
  ],
  soifon: [
    { name: "C1 · Velo de Borboleta", flag: "sfC1", desc: "Ao entrar na Postura de Ferrão, Soi Fon regenera 10 de Energia e ganha +20% de Bônus de Dano para o seu próximo golpe de Dano Verdadeiro." },
    { name: "C2 · Sincronia Estática", flag: "sfC2", desc: "A marca [Ferrão da Morte] reduz a RES elemental do inimigo em 15%. Quando um aliado Eletro acerta um inimigo marcado, Soi Fon ganha 1 carga extra de Vibração de Ferrão." },
    { name: "C3 · Maestria da Suzumebachi", ...A_ULT, ampV: 40, desc: "Aumenta o multiplicador da Jakuhō Raikōben em +40% e eleva o nível do Ataque Básico." },
    { name: "C4 · Aura de Condução", flag: "sfC4", desc: "Enquanto a Zona de Condução estiver ativa, todos os aliados ganham +10% de Taxa Crítica. O dano das explosões da zona aumenta para 70% do ATK de Soi Fon." },
    { name: "C5 · Assassina do Vento", ...A_SKILL, ampV: 25, desc: "Aumenta o multiplicador da Perícia em +25% e eleva o dano dos follow-ups em +15%." },
    { name: "C6 · Jakuhō Raikōben: Suprema Execução", flag: "sfC6", desc: "A Postura de Ferrão atinge TODOS os inimigos, ignorando 40% da DEF. Ao eliminar um inimigo, Soi Fon recupera 100% de Energia instantaneamente e ganha +50% de Bônus de Dano no próximo turno." },
  ],
  omegamon: [
    { name: "C1 · Sobrecarga Viral", flag: "omgC1", desc: "O limite de [Vírus Defeat] sobe para 8. Ao atingir o limite, a Velocidade aumenta em 25 por 2 turnos." },
    { name: "C2 · Vetor de Contágio", flag: "omgC2", desc: "Aliados sob [Protocolo de Infecção] causam +20% de dano." },
    { name: "C3 · Núcleo Sobrescrito", ...A_ULT, ampV: 50, desc: "Aumenta o multiplicador da Ultimate em +50% e eleva o nível do Ataque Básico." },
    { name: "C4 · Lentidão Sistêmica", flag: "omgC4", desc: "Ao usar a Ultimate, todos os inimigos têm a Velocidade reduzida em 15% por 1 turno." },
    { name: "C5 · Protocolo Aprimorado", ...A_SKILL, ampV: 25, desc: "Aumenta o multiplicador da Perícia em +25% e reforça o Talento." },
    { name: "C6 · Final Defeat", flag: "omgC6", desc: "Abaixo de 30% de HP, ativa [Final Defeat]: Omegamon não pode morrer por 1 turno e seu Dano de Vírus aumenta em 100%. A cura da Ultimate revive aliados derrotados com 30% de HP." },
  ],
};
const GENERIC_CONS = [
  { name: "S1 · Despertar", stat: "atk", value: 8, desc: "ATK +8%." },
  { name: "S2 · Vínculo", stat: "critRate", value: 8, desc: "Taxa de CRIT +8%." },
  { name: "S3 · Ressonância", ...A_SKILL, desc: "Dano da Habilidade +20%." },
  { name: "S4 · Plenitude", stat: "critDmg", value: 24, desc: "CRIT DMG +24%." },
  { name: "S5 · Ímpeto", ...A_ULT, desc: "Dano do Ultimate +40%." },
  { name: "S6 · Transcendência", stat: "spd", value: 12, desc: "VEL +12." },
];
function constellationNodes(def) { return CONS[def.id] || GENERIC_CONS; }
function passiveOf(def) { return PASSIVE[def.id] || { name: "Instinto", desc: "Combatente experiente.", flag: null }; }
const SKILL_NAMES = {
  miyabi: ["Corte Gélido", "Lâminas de Gelo", "Inverno Eterno"],
  kaiba: ["Descarga de Energia", "Invocar Blue-Eyes", "Invocação Suprema"],
  renji: ["Golpe de Zabimaru", "Hikotsu Taihō", "Hihiō Zabimaru"],
  ace: ["Soco Flamejante", "Punho de Fogo", "Grande Incêndio"],
  usopp: ["Tiro Certeiro", "Estilingue Tático", "Pop Green: Impacto"],
  sakura: ["Golpe Centena", "Soco Esmagador", "Punho Sobre-humano"],
  chopper: ["Investida", "Cuidado Médico", "Operação de Emergência"],
  kirara: ["Toque Estelar", "Escudo Cósmico", "Constelação Guardiã"],
  yoruichi: ["Golpe Relâmpago", "Shunko", "Shunko: Raijin"],
  kiritsugu: ["Tiro de Origem", "Bala Calculada", "Time Alter: Triple Accel"],
  soifon: ["Golpe Duplo da Suzumebachi", "Nigeki Kessatsu", "Jakuhō Raikōben"],
  omegamon: ["Garuru Cannon: Rajada Corrompida", "Grey Sword: Protocolo de Infecção", "All Delete: Recálculo de Vazio"],
};
const skillNamesOf = (id) => SKILL_NAMES[id] || ["Ataque Básico", "Habilidade", "Ultimate"];

/* ---------- RASTROS (estilo HSR) ---------- */
const TRACE_NODES = [
  { stat: "atk", value: 6, label: "ATK +6%", cost: 500 },
  { stat: "critRate", value: 5, label: "CRIT +5%", cost: 700 },
  { stat: "critDmg", value: 12, label: "CRIT DMG +12%", cost: 900 },
  { stat: "def", value: 8, label: "DEF +8%", cost: 500 },
  { stat: "hp", value: 8, label: "HP +8%", cost: 600 },
  { stat: "spd", value: 5, label: "VEL +5", cost: 1100 },
];
// Nós específicos por personagem (Hypercarry de Gelo etc.). Quem não tiver usa o set genérico.
const TRACE_NODE_SETS = {
  miyabi: [
    { stat: "atk", value: 6, label: "ATK +6%", cost: 500 },
    { stat: "critRate", value: 5, label: "CRIT +5%", cost: 700 },
    { stat: "critDmg", value: 12, label: "CRIT DMG +12%", cost: 900 },
    { stat: "elemDmg", element: "Glacial", value: 4.8, label: "Dano Glacial +4.8%", cost: 600 },
    { stat: "elemDmg", element: "Glacial", value: 6.4, label: "Dano Glacial +6.4%", cost: 700 },
    { stat: "spd", value: 5, label: "VEL +5", cost: 1100 },
  ],
  omegamon: [
    { stat: "hp", value: 10, label: "HP +10%", cost: 600 },
    { stat: "def", value: 5, label: "DEF +5%", cost: 500 },
    { stat: "hp", value: 5, label: "HP +5%", cost: 600 },
    { stat: "elemDmg", element: "Virus", value: 10, label: "Dano de Vírus +10%", cost: 700 },
    { stat: "energyRegen", value: 10, label: "Regen de Energia +10%", cost: 700 },
    { stat: "critDmg", value: 12, label: "CRIT DMG +12%", cost: 900 },
  ],
};
const traceNodesOf = (def) => (def && TRACE_NODE_SETS[def.id]) || TRACE_NODES;
const TRACE_MAX = 10;
const traceMul = (level) => 1 + (Math.max(1, level || 1) - 1) * 0.08; // +8% por nível
const traceCost = (level) => 600 + (level - 1) * 450; // jade p/ subir do nível atual
function specialTraces(def) {
  if (def.id === "miyabi") return [
    { name: "Vestígio do Poder", desc: "Rastro Especial de combate · Postura Iaido: o Ataque Básico gera 1 PH. Ao acumular o limite de 3 PH, Miyabi entra na Postura Iaido — seu próximo Ataque Básico consome os 3 PH de uma vez para um corte que ignora 30% da DEF do alvo e avança a própria ação dela em 50% na linha do tempo.", combat: "miPostura", cost: 2 },
    { name: "Vestígio da Lâmina", desc: "Rastro Especial de combate · Cortes Residuais: quando Miyabi desfere um acerto CRÍTICO com a Habilidade ou o Ultimate, deixa Cortes Residuais congelados no alvo. Quando ela usa o Ataque Básico contra esse inimigo, os cortes ecoam causando 90% do ATK como dano Glacial extra e estendem a duração de quaisquer DoTs ativos nele em +1 turno.", combat: "miResidual", cost: 2 },
    { name: "Vestígio: Tempestade", desc: "Rastro Especial de combate · Detonação: ao atacar inimigos que já estejam sob efeito de DoT ou com a DEF reduzida, Miyabi consome instantaneamente esses debuffs para gerar uma explosão de 150% de Dano Glacial em área e aplica Congelamento por 1 turno.", combat: "miDetonate", cost: 3 },
  ];
  if (def.id === "kaiba") return [
    { name: "Tecnologia KaibaCorp", desc: "Rastro Especial de combate: quando Kaiba usa o Ataque Básico (Decreto Corporativo), TODOS os Blue-Eyes ativos avançam 35% na linha do tempo de ação — eles atacam muito mais cedo, acelerando o dano e a construção do tabuleiro.", combat: "kcAdvance", cost: 2 },
    { name: "Controle de Ações", desc: "Rastro Especial de combate: enquanto houver pelo menos 2 Blue-Eyes em campo, Kaiba fica IMUNE a debuffs e penalidades de atributo — os inimigos não conseguem reduzir sua DEF nem aplicar vulnerabilidade nele.", combat: "kcImmune", cost: 2 },
    { name: "Orgulho do Monarca", desc: "Rastro Especial de combate: se o Obelisco eliminar o alvo principal, Kaiba recupera 100 de Energia instantaneamente. Se o Dragão Definitivo for invocado, o Dano CRÍTICO de Kaiba aumenta em +40% enquanto a Fusão durar.", combat: "kcMonarch", cost: 3 },
  ];
  if (def.id === "soifon") return [
    { name: "Vestígio: Sombra Assassina", desc: "Rastro Especial de combate · ao entrar na Postura de Ferrão (3 cargas de Vibração), Soi Fon ganha +20% de Bônus de Dano de Vento por 1 turno.", combat: "sfSombra", cost: 2 },
    { name: "Vestígio: Precisão Mortal", desc: "Rastro Especial de combate · o dano dos follow-ups é aumentado em +25%. Sempre que Soi Fon realizar um follow-up, ganha +15% de CRIT DMG (acumula até 2 vezes) durante o combate.", combat: "sfPrecisao", cost: 2 },
    { name: "Vestígio: Bankai — Jakuhō Raikōben", desc: "Rastro Especial de combate · ao usar a Ultimate contra alvos com menos de 30% de HP, o ataque é um CRÍTICO GARANTIDO e causa +30% de dano. A Zona de Condução criada dura 2 rodadas em vez de 1.", combat: "sfBankai", cost: 3 },
  ];
  if (def.id === "omegamon") return [
    { name: "Vestígio: Saturação de Vírus", desc: "Rastro Especial de combate · o dano da Ultimate aumenta em 0,8% para cada 1% de HP que o portador tiver perdido.", combat: "omgSaturacao", cost: 2 },
    { name: "Vestígio: Contágio de Dados", desc: "Rastro Especial de combate · aliados com [Protocolo de Infecção] ganham +20% de resistência a dano. Se o Escudo de Dados for quebrado, o inimigo que o quebrou sofre [Corrosão] imediata.", combat: "omgContagio", cost: 2 },
    { name: "Vestígio: Reescrita de Sistema", desc: "Rastro Especial de combate · a cura recebida por Omegamon via [Corrosão] inimiga é +25% mais eficaz.", combat: "omgReescrita", cost: 3 },
  ];
  const third = {
    dps: { name: "Vestígio: Predador", desc: "Rastro Especial de combate: contra inimigos sob qualquer DoT OU com a DEF reduzida, este personagem causa +25% de dano. É o gatilho que recompensa equipes que aplicam efeitos contínuos e quebras de armadura antes de liberar o dano.", combat: "dmgVsAfflicted" },
    aoe: { name: "Vestígio: Tempestade", desc: "Rastro Especial de combate: contra inimigos sob qualquer DoT OU com a DEF reduzida, este personagem causa +25% de dano em todos os golpes — ideal para limpar ondas já afligidas.", combat: "dmgVsAfflicted" },
    debuffer: { name: "Vestígio: Erosão", desc: "Rastro Especial de combate: todos os debuffs aplicados por este personagem passam a durar +1 turno e adicionam +12% de vulnerabilidade extra ao alvo, multiplicando o dano que a equipe inteira causa.", combat: "debuffPlus" },
    healer: { name: "Vestígio: Égide Vital", desc: "Rastro Especial de combate: além de curar, cada cura concede um ESCUDO igual a 30% do valor curado ao alvo — o personagem passa a recuperar HP e prevenir dano ao mesmo tempo.", combat: "healShield" },
    buffer: { name: "Vestígio: Harmonia", desc: "Rastro Especial de combate: todos os buffs concedidos aos aliados duram +1 turno, mantendo a equipe fortalecida por mais tempo.", combat: "buffPlus" },
    shield: { name: "Vestígio: Muralha", desc: "Rastro Especial de combate: todos os escudos gerados por este personagem ficam +30% mais fortes, criando barreiras que aguentam até os golpes de chefe.", combat: "shieldPlus" },
    summoner: { name: "Vestígio: Vínculo do Dragão", desc: "Rastro Especial de combate: a unidade invocada (dragões, Obelisco, Dragão Definitivo) recebe +30% de ATK, elevando muito o dano do exército invocado.", combat: "summonPlus" },
  }[def.role] || { name: "Vestígio: Poder Oculto", desc: "Rastro Especial de combate: +25% de dano contra inimigos afligidos.", combat: "dmgVsAfflicted" };
  return [
    { name: "Vestígio do Poder", desc: "Rastro Especial de atributo: ATK +15%. O reforço básico que potencializa todo o kit do personagem.", stat: "atk", value: 15, cost: 2 },
    { name: "Vestígio da Lâmina", desc: "Rastro Especial de atributo: CRIT DMG +30%, elevando o teto de dano dos golpes críticos.", stat: "critDmg", value: 30, cost: 2 },
    { ...third, cost: 3 },
  ];
}
function normChar(o) {
  o = o && typeof o === "object" ? o : {};
  return {
    asc: 0,
    ...o,
    level: Math.min(Math.max(1, Math.floor(o.level || 1)), MAX_LEVEL),
    weaponLv: Math.min(Math.max(1, Math.floor(o.weaponLv || 1)), WEAPON_MAX_LEVEL),
    eidolon: Math.min(6, Math.max(0, Math.floor(o.eidolon || 0))),
    weapon: o.weapon && WEAPON_MAP[o.weapon] ? o.weapon : null,
    relics: sanitizeRelicSlots(o.relics),
    traces: { basic: 1, skill: 1, ult: 1, ...(o.traces || {}) },
    traceNodes: o.traceNodes && o.traceNodes.length === TRACE_NODES.length ? o.traceNodes : TRACE_NODES.map(() => false),
    specialTraces: o.specialTraces && o.specialTraces.length === 3 ? o.specialTraces : [false, false, false],
  };
}

function computeStats(owned) {
  const def = CHAR_MAP[owned.id];
  if (!def) return null;
  const m = levelMul(owned.level || 1);
  // flats = somados DEPOIS da % (não recebem multiplicador). pct = % que incide SÓ na base (personagem + arma).
  const flat = { hp: 0, atk: 0, def: 0, spd: 0, critRate: 0, critDmg: 0, dmgBonus: 0, energyRegen: 0, healBonus: 0, defPen: 0, dotDmg: 0 };
  const pct = { hp: 0, atk: 0, def: 0 };
  const elemMap = {}; ELEMENT_NAMES.forEach((e) => (elemMap[e] = 0));
  const addPctOrFlat = (k, v) => { if (PCT[k]) pct[k] += v; else if (flat[k] !== undefined) flat[k] += v; };
  const addElem = (el, v) => { if (el) elemMap[el] = (elemMap[el] || 0) + v; };
  // chave de relíquia → destino (substats e mains usam atkP/hpP/defP (%) e atkFlat/hpFlat/defFlat (flat))
  const applyRelicStat = (key, val, element) => {
    switch (key) {
      case "atkP": pct.atk += val; break; case "hpP": pct.hp += val; break; case "defP": pct.def += val; break;
      case "atkFlat": flat.atk += val; break; case "hpFlat": flat.hp += val; break; case "defFlat": flat.def += val; break;
      case "critRate": flat.critRate += val; break; case "critDmg": flat.critDmg += val; break; case "spd": flat.spd += val; break;
      case "dotDmg": flat.dotDmg += val; break; case "energyRegen": flat.energyRegen += val; break;
      case "elemDmg": addElem(element, val); break; default: addPctOrFlat(key, val);
    }
  };
  // BASE = nativo do personagem (por nível) + nativo da arma. A % incide só aqui.
  const w = owned.weapon ? WEAPON_MAP[owned.weapon] : null;
  const wm = weaponLevelMul(owned.weaponLv || 1);
  const baseHp = def.base.hp * m + (w?.hp || 0) * wm;
  const baseAtk = def.base.atk * m + (w?.atk || 0) * wm;
  const baseDef = def.base.def * m + (w?.def || 0) * wm;
  flat.energyRegen += def.base.energyRegen || 0;
  if (def.base.elemDmg) addElem(def.element, def.base.elemDmg);
  if (w) { ["critRate", "critDmg", "energyRegen", "dmgBonus", "defPen", "spd"].forEach((k) => { if (w[k]) flat[k] += w[k]; }); if (w.atkPct) pct.atk += w.atkPct; }

  const setCount = {};
  (owned.relics || []).forEach((r) => {
    if (!r) return;
    setCount[r.set] = (setCount[r.set] || 0) + 1;
    applyRelicStat(r.main, relicMainValue(r.main, r.level), r.mainElement);
    (r.subs || []).forEach((s) => applyRelicStat(s.stat, s.value, null));
  });
  for (const set in setCount) {
    const sd = RELIC_SETS[set]; if (!sd) continue;
    if (setCount[set] >= 2 && sd.p2) for (const k in sd.p2) { if (k === "elemDmg") addElem(sd.el, sd.p2[k]); else addPctOrFlat(k, sd.p2[k]); }
    if (setCount[set] >= 4 && sd.p4) for (const k in sd.p4) { if (k === "elemDmg") addElem(sd.el, sd.p4[k]); else addPctOrFlat(k, sd.p4[k]); }
  }
  const nodes = constellationNodes(def);
  for (let i = 0; i < (owned.eidolon || 0); i++) { const n = nodes[i]; if (n && n.stat) addPctOrFlat(n.stat, n.value); }
  const tnodes = traceNodesOf(def);
  (owned.traceNodes || []).forEach((on, i) => { if (on && tnodes[i]) { const nd = tnodes[i]; if (nd.stat === "elemDmg") addElem(nd.element, nd.value); else addPctOrFlat(nd.stat, nd.value); } });
  const sts = specialTraces(def);
  (owned.specialTraces || []).forEach((on, i) => { if (on && sts[i] && sts[i].stat) addPctOrFlat(sts[i].stat, sts[i].value); });

  // dano elemental do próprio elemento entra no dmgBonus; de outros elementos fica registrado em elem (uso situacional)
  flat.dmgBonus += elemMap[def.element] || 0;
  const r1 = (x) => Math.round(x * 10) / 10;
  return {
    defPen: r1(flat.defPen), dotDmg: r1(flat.dotDmg), elem: elemMap,
    baseHp: Math.round(baseHp), baseAtk: Math.round(baseAtk), baseDef: Math.round(baseDef),
    hp: r1(baseHp * (1 + pct.hp / 100) + flat.hp),
    atk: r1(baseAtk * (1 + pct.atk / 100) + flat.atk),
    def: r1(baseDef * (1 + pct.def / 100) + flat.def),
    spd: r1(def.base.spd + flat.spd),
    critRate: r1(Math.min(100, def.base.critRate + flat.critRate)),
    critDmg: r1(def.base.critDmg + flat.critDmg),
    dmgBonus: r1(flat.dmgBonus),
    energyRegen: r1(flat.energyRegen),
    healBonus: r1(flat.healBonus),
    energyMax: def.base.energyMax,
  };
}

/* ---------- GACHA ---------- */
const RATE = { c5: 0.006, c4: 0.051, soft: 74, hard: 90 };
function rollRarity(pity) {
  let p5 = RATE.c5;
  if (pity + 1 >= RATE.soft) p5 += (pity + 1 - (RATE.soft - 1)) * 0.06;
  if (pity + 1 >= RATE.hard) return 5;
  const r = Math.random();
  if (r < p5) return 5;
  if (r < p5 + RATE.c4) return 4;
  return 3;
}
const pick = (a) => a[Math.floor(Math.random() * a.length)];

/* ---------- SAVE ---------- */
const LEGACY_SAVE_KEY = "sr_save_v2";
const PUB_KEY = "sr_pub_";
const ACCOUNTS_KEY = "sr_accounts";
const SESSION_KEY = "sr_session";
const ADMIN_EMAIL = "raphaelfadul@gmail.com";
const emailKey = (e) => (e || "").trim().toLowerCase();
const validEmail = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailKey(e));
function hashPass(s) { let h = 5381; for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) >>> 0; return h.toString(36); }
function saveKeyFor(email) { return "sr_save_" + hashPass("u:" + emailKey(email)); }

// Wrapper resiliente: usa window.storage quando existe, espelha em localStorage e em memória.
// Assim a conta/progresso persistem mesmo que um dos meios falhe ou trave.
const hasStorage = () => typeof window !== "undefined" && window.storage && typeof window.storage.get === "function";
const _mem = {};
const _ls = {
  get: (k) => { try { return typeof localStorage !== "undefined" ? localStorage.getItem(k) : null; } catch { return null; } },
  set: (k, v) => { try { if (typeof localStorage !== "undefined") localStorage.setItem(k, v); } catch {} },
  del: (k) => { try { if (typeof localStorage !== "undefined") localStorage.removeItem(k); } catch {} },
};
function withTimeout(promise, ms, fallback) {
  return new Promise((resolve) => {
    let done = false;
    const t = setTimeout(() => { if (!done) { done = true; resolve(fallback); } }, ms);
    Promise.resolve(promise).then(
      (v) => { if (!done) { done = true; clearTimeout(t); resolve(v); } },
      () => { if (!done) { done = true; clearTimeout(t); resolve(fallback); } }
    );
  });
}
// ===== NUVEM (Firebase / Firestore) =====
// Liga sozinho quando o jogo é HOSPEDADO (Vercel etc.). No preview do Claude a rede
// externa é bloqueada, então o import falha de propósito e o jogo segue no localStorage.
// IMPORTANTE: configure as Regras do Firestore no console (a apiKey Web não é segredo).
const firebaseConfig = {
  apiKey: "AIzaSyAtJ1yMg8h5yhbTIREnL2o_nSjS4Dc8_n8",
  authDomain: "sites2-f1930.firebaseapp.com",
  projectId: "sites2-f1930",
  storageBucket: "sites2-f1930.firebasestorage.app",
  messagingSenderId: "513187956568",
  appId: "1:513187956568:web:d95cb2780de7b5a8b8c72d",
  measurementId: "G-TTT4SKQEB3",
};
const Cloud = { ready: false, tried: false, db: null, fs: null };
const _fbSafeId = (k) => String(k).replace(/[^a-zA-Z0-9_.@-]/g, "_").slice(0, 380);
async function initCloud() {
  if (Cloud.ready || Cloud.tried) return;
  Cloud.tried = true;
  try {
    const appMod = await import("firebase/app");
    const fs = await import("firebase/firestore");
    const app = appMod.initializeApp(firebaseConfig);
    Cloud.db = fs.getFirestore(app);
    Cloud.fs = fs;
    Cloud.ready = true;
    try { const an = await import("firebase/analytics"); Cloud.analytics = an.getAnalytics(app); } catch { /* Analytics é opcional (só no browser) */ }
    console.info("[Cloud] Firebase conectado — save na nuvem e co-op global ativos.");
  } catch (e) { /* preview/offline: segue no localStorage */ }
}
async function cloudGet(coll, id) {
  if (!Cloud.ready) return null;
  try { const { doc, getDoc } = Cloud.fs; const snap = await withTimeout(getDoc(doc(Cloud.db, coll, _fbSafeId(id))), 4000, null); return snap && snap.exists() ? snap.data() : null; } catch { return null; }
}
async function cloudSet(coll, id, data) {
  if (!Cloud.ready) return false;
  try { const { doc, setDoc } = Cloud.fs; await withTimeout(setDoc(doc(Cloud.db, coll, _fbSafeId(id)), data), 4000, null); return true; } catch { return false; }
}
async function cloudRandomAlly() {
  if (!Cloud.ready) return null;
  try { const { collection, getDocs, query, orderBy, limit } = Cloud.fs; const snap = await withTimeout(getDocs(query(collection(Cloud.db, "coop"), orderBy("updatedAt", "desc"), limit(30))), 4000, null); if (!snap) return null; const arr = []; snap.forEach((d) => arr.push(d.data())); return arr.length ? arr[Math.floor(Math.random() * arr.length)] : null; } catch { return null; }
}
const cloudReady = initCloud(); // guarda a promise para await posterior

const SS = {
  get: async (k, shared) => {
    if (shared) { if (!hasStorage()) return null; try { return await withTimeout(window.storage.get(k, true), 2200, null); } catch { return null; } }
    if (hasStorage()) { try { const r = await withTimeout(window.storage.get(k), 2200, undefined); if (r && r.value != null) { _mem[k] = r.value; _ls.set(k, r.value); return r; } } catch {} }
    const lv = _ls.get(k); if (lv != null) { _mem[k] = lv; return { key: k, value: lv }; }
    if (_mem[k] != null) return { key: k, value: _mem[k] };
    return null;
  },
  set: async (k, v, shared) => {
    if (!shared) { _mem[k] = v; _ls.set(k, v); }
    if (hasStorage()) { try { return await withTimeout(window.storage.set(k, v, shared), 2200, null); } catch { return null; } }
    return { key: k, value: v };
  },
  del: async (k, shared) => {
    if (!shared) { delete _mem[k]; _ls.del(k); }
    if (hasStorage() && typeof window.storage.delete === "function") { try { return await withTimeout(window.storage.delete(k, shared), 2200, null); } catch {} }
    return { key: k, deleted: true };
  },
  list: async (p, shared) => { if (!hasStorage() || typeof window.storage.list !== "function") return null; try { return await withTimeout(window.storage.list(p, shared), 2200, null); } catch { return null; } },
};
async function loadSave(key) { const c = await cloudGet("saves", key); if (c && c.data) return c.data; const r = await SS.get(key); try { return r ? JSON.parse(r.value) : null; } catch { return null; } }
async function writeSave(key, d) { try { await SS.set(key, JSON.stringify(d)); } catch {} cloudSet("saves", key, { data: d, updatedAt: Date.now() }); }
async function loadAccounts() {
  // localStorage primeiro: confiável no mesmo dispositivo
  const r = await SS.get(ACCOUNTS_KEY);
  let local = {};
  try { if (r) local = JSON.parse(r.value) || {}; } catch {}
  // Firebase em background: merge de contas de outros dispositivos
  try {
    const c = await cloudGet("meta", "accounts");
    if (c && c.list && Object.keys(c.list).length > 0) {
      const merged = { ...c.list, ...local }; // local tem prioridade
      try { await SS.set(ACCOUNTS_KEY, JSON.stringify(merged)); } catch {}
      return merged;
    }
  } catch {}
  return local;
}
async function saveAccounts(a) { try { await SS.set(ACCOUNTS_KEY, JSON.stringify(a)); } catch {} cloudSet("meta", "accounts", { list: a }); }

/* ---------- TORRE ---------- */
const TOWER_FLOORS = 70;
const TOWER_BOSSES = {
  50: { name: "Sōsuke Aizen", title: "Shinigami Traidor", element: "Holy", bossKind: "aizen", bossImgId: "boss_tower_50", res: ["Holy", "Virus"], weak: ["Fogo", "Eletro"] },
  60: { name: "Seto Kaiba · Modo Deus", title: "Portador de Obelisco", element: "Eletro", bossKind: "godkaiba", bossImgId: "boss_tower_60", res: ["Eletro", "Holy"], weak: ["Chaos", "Glacial"] },
  70: { name: "Ryōmen Sukuna", title: "Rei das Maldições", element: "Chaos", bossKind: "sukuna", bossImgId: "boss_tower_70", res: ["Chaos", "Fogo", "Virus"], weak: ["Holy"] },
};
function rewardFor(f) { if (f <= 60) return 300; if (f <= 69) return 500; return 1500; } // soma = 24000
function towerEncounter(f, power) {
  const boss = f % 10 === 0, finalBoss = f === TOWER_FLOORS;
  const bd = TOWER_BOSSES[f];
  return {
    level: f, boss, finalBoss, count: boss ? (f >= 40 ? 2 : 1) : (f <= 4 ? 2 : 3), floor: f, teamPower: power || 2500,
    ...(bd ? { bossName: bd.name, bossTitle: bd.title, bossElement: bd.element, bossKind: bd.bossKind, bossImgId: bd.bossImgId, bossRes: bd.res, bossWeak: bd.weak } : {}),
  };
}
const FARM_STAGES = [
  { id: "f1", name: "Clareira dos Ecos", level: 12, count: 3, cost: 30, exp: 16 },
  { id: "f2", name: "Ruínas Cintilantes", level: 28, count: 3, cost: 40, exp: 30, boss: true },
  { id: "f3", name: "Abismo Estelar", level: 46, count: 3, cost: 60, exp: 50, boss: true },
];
function expToLevel(level) { return 2 + Math.floor(level / 10); } // Lácrimas de XP por nível (curva suave)
const ASC_GATES = [20, 40, 60, 80];      // níveis em que é preciso ascender (derrotar o Guardião da Ascensão)
const ASC_COST = [2, 4, 8, 15];          // Núcleos de Ascensão exigidos em cada portão
const MAX_LEVEL = 90;
const levelCap = (asc) => (asc >= ASC_GATES.length ? MAX_LEVEL : ASC_GATES[asc]); // asc0→20, asc1→40, asc2→60, asc3→80, asc4→90

/* ==========================================================================
   IMAGENS (contexto)
   ========================================================================== */
const ImgCtx = createContext({});
const useImg = () => useContext(ImgCtx);

/* ==========================================================================
   UI BÁSICOS
   ========================================================================== */
function Glow({ color, children, style }) { return <span style={{ color, textShadow: `0 0 14px ${color}55`, ...style }}>{children}</span>; }
function Bar({ value, max, color, bg = "#0b0920", h = 8, glow }) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  return <div style={{ background: bg, borderRadius: 99, height: h, overflow: "hidden", width: "100%" }}>
    <div style={{ width: pct + "%", height: "100%", background: color, transition: "width .35s ease", borderRadius: 99, boxShadow: glow ? `0 0 8px ${color}` : "none" }} />
  </div>;
}
function Rarity({ n }) { return <span style={{ color: n === 5 ? C.gold : n === 4 ? "#B98BFF" : "#6d8fb8", letterSpacing: 1, fontSize: 12 }}>{"★".repeat(n)}</span>; }
function ImgFill({ url, fallback, size }) {
  const [err, setErr] = useState(false);
  useEffect(() => { setErr(false); }, [url]);
  if (url && !err) return <img src={url} alt="" onError={() => setErr(true)} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />;
  return <span style={{ fontSize: size * 0.5 }}>{fallback}</span>;
}
function Avatar({ ch, size = 56, ring }) {
  const images = useImg();
  const url = ch?.id ? images[ch.id] : null;
  const el = ELEMENTS[ch.element] || { color: C.line };
  return <div style={{
    width: size, height: size, borderRadius: 14, display: "flex", alignItems: "center", justifyContent: "center",
    overflow: "hidden", background: `radial-gradient(circle at 30% 25%, ${el.color}30, ${C.panelHi})`,
    border: `2px solid ${ring || el.color}`, boxShadow: `0 0 14px ${el.color}38`, flexShrink: 0,
  }}><ImgFill url={url} fallback={ch.avatar} size={size} /></div>;
}
function WeaponIcon({ w, size = 44 }) {
  const images = useImg();
  const url = w?.id ? images[w.id] : null;
  const color = w.rarity === 5 ? C.gold : "#B98BFF";
  return <div style={{ width: size, height: size, borderRadius: 12, overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center", background: `radial-gradient(circle at 30% 25%, ${color}28, ${C.panelHi})`, border: `2px solid ${color}88`, flexShrink: 0 }}>
    <ImgFill url={url} fallback="🗡️" size={size} />
  </div>;
}
function Btn({ children, onClick, kind = "primary", disabled, style, ...rest }) {
  const k = {
    primary: { background: `linear-gradient(135deg, ${C.gold}, ${C.goldDim})`, color: "#1a1200" },
    soft: { background: C.panelHi, color: C.text, border: `1px solid ${C.line}` },
    ghost: { background: "transparent", color: C.text, border: `1px solid ${C.line}` },
    danger: { background: "#3a1525", color: C.bad, border: `1px solid #5a2238` },
  }[kind];
  return <button onClick={onClick} disabled={disabled} className="px-4 py-2 rounded-xl font-bold text-sm transition active:scale-95"
    style={{ opacity: disabled ? 0.4 : 1, cursor: disabled ? "not-allowed" : "pointer", letterSpacing: 0.3, ...k, ...style }} {...rest}>{children}</button>;
}
function Panel({ children, style, glow }) {
  return <div style={{ background: `linear-gradient(180deg, ${C.panel}, ${C.bg1})`, border: `1px solid ${C.line}`, borderRadius: 18, padding: 16, boxShadow: glow ? `0 0 34px ${glow}26` : "0 10px 28px #00000045", ...style }}>{children}</div>;
}
function TabBtn({ active, onClick, children }) {
  return <button onClick={onClick} className="px-4 py-2 rounded-xl text-sm font-bold transition"
    style={{ background: active ? C.gold : C.panelHi, color: active ? "#1a1200" : C.mute, border: `1px solid ${active ? C.gold : C.line}` }}>{children}</button>;
}
function Chip({ active, color, onClick, children }) {
  return <button onClick={onClick} className="px-3 py-1 rounded-lg text-sm font-bold transition active:scale-95"
    style={{ background: active ? color : C.panelHi, color: active ? "#160f02" : C.mute, border: `1px solid ${active ? color : C.line}` }}>{children}</button>;
}
function ElTag({ el }) { const e = ELEMENTS[el]; return <Glow color={e.color}>{e.glyph} {el}</Glow>; }
function Empty({ msg }) { return <Panel style={{ textAlign: "center", padding: 32 }}><div style={{ fontSize: 36, marginBottom: 8 }}>🌌</div><div style={{ color: C.mute }}>{msg}</div></Panel>; }

function FontInject() {
  useEffect(() => {
    const l = document.createElement("link");
    l.rel = "stylesheet"; l.href = "https://fonts.googleapis.com/css2?family=Orbitron:wght@600;700;800&display=swap";
    document.head.appendChild(l);
    return () => { try { document.head.removeChild(l); } catch {} };
  }, []);
  return null;
}
const ORB = { fontFamily: "Orbitron, ui-sans-serif, system-ui, sans-serif" };

/* ==========================================================================
   APP
   ========================================================================== */
function Game({ email, isAdmin, onLogout }) {
  const SAVE_KEY = useMemo(() => saveKeyFor(email), [email]);
  const [loaded, setLoaded] = useState(false);
  const [screen, setScreen] = useState("home");
  const [toast, setToast] = useState(null);
  const [pullResults, setPullResults] = useState(null);
  const [battle, setBattle] = useState(null);
  const [pendingBoss, setPendingBoss] = useState(null);

  const [jade, setJade] = useState(12000);
  const [chronicles, setChronicles] = useState(0);
  const [charTickets, setCharTickets] = useState(15);
  const [weaponTickets, setWeaponTickets] = useState(8);
  const [standardTickets, setStandardTickets] = useState(10);
  const [featuredChar, setFeaturedChar] = useState(DEFAULT_FEATURED_CHAR);
  const [featuredWeapon, setFeaturedWeapon] = useState(DEFAULT_FEATURED_WEAPON);
  const [pity, setPity] = useState({ char: 0, weapon: 0, standard: 0, guaranteeChar: false });
  const [pullHistory, setPullHistory] = useState([]);
  const [owned, setOwned] = useState([
    { id: "ace", level: 1, eidolon: 0, weapon: null, relics: EMPTY_RELICS() },
    { id: "chopper", level: 1, eidolon: 0, weapon: null, relics: EMPTY_RELICS() },
    { id: "usopp", level: 1, eidolon: 0, weapon: null, relics: EMPTY_RELICS() },
  ]);
  const [ownedWeapons, setOwnedWeapons] = useState([]);
  const [relicInv, setRelicInv] = useState([]);
  const [team, setTeam] = useState(["ace", "chopper", "usopp"]);
  const [stamina, setStamina] = useState(240);
  const [lastStamina, setLastStamina] = useState(Date.now());
  const [playerName, setPlayerName] = useState("Pioneiro");
  const [images, setImages] = useState({});
  const [towerCleared, setTowerCleared] = useState(0);
  const [towerClaimed, setTowerClaimed] = useState([]);
  const [expItems, setExpItems] = useState(80);
  const [bossMats, setBossMats] = useState(4);
  const [ascMats, setAscMats] = useState(4);
  const [weaponMats, setWeaponMats] = useState(15);
  const [skillMats, setSkillMats] = useState(15);
  const [tagMats, setTagMats] = useState({});
  const [lastWeeklyBoss, setLastWeeklyBoss] = useState(0);
  const [bossRushCleared, setBossRushCleared] = useState([]);

  const ownedMap = useMemo(() => Object.fromEntries(owned.map((o) => [o.id, o])), [owned]);
  const flash = (msg, color) => { setToast({ msg, color: color || C.gold }); setTimeout(() => setToast(null), 2200); };

  useEffect(() => { (async () => {
    let s = await loadSave(SAVE_KEY);
    if (!s) { const legacy = await loadSave(LEGACY_SAVE_KEY); if (legacy) s = legacy; } // migra progresso anterior na 1ª entrada
    if (s) {
      setJade(s.jade ?? 12000); setCharTickets(s.charTickets ?? 15); setWeaponTickets(s.weaponTickets ?? 8);
      setStandardTickets(s.standardTickets ?? 10);
      setFeaturedChar(FEATURED_LIMITEDS.includes(s.featuredChar) ? s.featuredChar : DEFAULT_FEATURED_CHAR);
      setFeaturedWeapon(WEAPON_5_IDS.includes(s.featuredWeapon) ? s.featuredWeapon : DEFAULT_FEATURED_WEAPON);
      setPity({ char: 0, weapon: 0, standard: 0, guaranteeChar: false, ...(s.pity || {}) });
      setPullHistory(s.pullHistory ?? []);
      if (s.owned) setOwned(s.owned.map(normChar).filter((o) => CHAR_MAP[o.id])); setOwnedWeapons((Array.isArray(s.ownedWeapons) ? s.ownedWeapons : []).filter((id) => WEAPON_MAP[id])); setRelicInv((Array.isArray(s.relicInv) ? s.relicInv : []).filter(isValidRelic));
      if (s.team) setTeam(s.team); setStamina(s.stamina ?? 240); setLastStamina(s.lastStamina ?? Date.now());
      setPlayerName(s.playerName ?? "Pioneiro");
      setTowerCleared(s.towerCleared ?? 0); setTowerClaimed(s.towerClaimed ?? []);
      setExpItems(s.expItems ?? 80); setBossMats(s.bossMats ?? 4); setAscMats(s.ascMats ?? 4); setWeaponMats(s.weaponMats ?? 15); setSkillMats(s.skillMats ?? 15); setTagMats(s.tagMats ?? {}); setLastWeeklyBoss(s.lastWeeklyBoss ?? 0); setChronicles(s.chronicles ?? 0); setBossRushCleared(Array.isArray(s.bossRushCleared) ? s.bossRushCleared : []);
    }
    // Carrega fotos do localStorage imediatamente (sem depender do Firebase)
    try { const li = _ls.get("sr_shared_images"); if (li) { const parsed = JSON.parse(li); if (parsed && typeof parsed === "object") setImages(parsed); } } catch {}
    setLoaded(true);
    // Firebase em background: atualiza se tiver dados mais recentes
    cloudReady.then(() => cloudGet("meta", "images")).then((sharedImgs) => {
      if (sharedImgs && sharedImgs.map && Object.keys(sharedImgs.map).length > 0) {
        setImages(sharedImgs.map);
        _ls.set("sr_shared_images", JSON.stringify(sharedImgs.map));
      }
    }).catch(() => {});
  })(); }, [SAVE_KEY]);

  const lastStaminaRef = useRef(lastStamina);
  useEffect(() => { lastStaminaRef.current = lastStamina; }, [lastStamina]);
  useEffect(() => {
    if (!loaded) return;
    const tick = () => {
      const gained = Math.floor((Date.now() - lastStaminaRef.current) / (6 * 60 * 1000));
      if (gained > 0) { setStamina((v) => Math.min(240, v + gained)); setLastStamina(Date.now()); }
    };
    tick();
    const iv = setInterval(tick, 60 * 1000); // catch-up ao vivo a cada minuto (estável: deps [loaded], lê ref)
    return () => clearInterval(iv);
  }, [loaded]); // eslint-disable-line

  useEffect(() => {
    if (!loaded) return;
    writeSave(SAVE_KEY, { jade, chronicles, charTickets, weaponTickets, standardTickets, featuredChar, featuredWeapon, pity, pullHistory, owned, ownedWeapons, relicInv, team, stamina, lastStamina, playerName, images, towerCleared, towerClaimed, expItems, bossMats, ascMats, weaponMats, skillMats, tagMats, lastWeeklyBoss, bossRushCleared });
  }, [loaded, SAVE_KEY, jade, chronicles, charTickets, weaponTickets, standardTickets, featuredChar, featuredWeapon, pity, pullHistory, owned, ownedWeapons, relicInv, team, stamina, lastStamina, playerName, images, towerCleared, towerClaimed, expItems, bossMats, ascMats, weaponMats, skillMats, tagMats, lastWeeklyBoss, bossRushCleared]);

  const teamPower = () => Math.round(team.reduce((a, id) => { const s = ownedMap[id] && computeStats(ownedMap[id]); return a + (s ? s.atk : 0); }, 0)) || 2500;
  const pay = (cost) => { if (isAdmin) return true; if (jade < cost) { flash("Jade insuficiente", C.bad); return false; } setJade((j) => j - cost); return true; };

  function grantChar(id, ownedRef) {
    const existed = ownedRef.has(id);
    ownedRef.add(id);
    setOwned((prev) => {
      const ex = prev.find((o) => o.id === id);
      if (ex) return prev.map((o) => (o.id === id ? { ...o, eidolon: Math.min(6, (o.eidolon || 0) + 1) } : o));
      return [...prev, normChar({ id, level: 1, eidolon: 0 })];
    });
    return existed;
  }
  const setOwnedField = (id, patch) => setOwned((prev) => prev.map((o) => (o.id === id ? { ...o, ...patch } : o)));
  function onUpgradeRelic(relicId) {
    const cur = relicInv.find((r) => r.id === relicId);
    if (!cur || cur.level >= 15) return;
    const need = 1 + Math.floor((cur.level || 0) / 4);
    if (!isAdmin && expItems < need) { flash(`Faltam Lácrimas de XP (precisa ${need})`, C.bad); return; }
    if (!isAdmin) setExpItems((v) => v - need);
    const up = upgradeRelic(cur);
    setRelicInv((prev) => prev.map((r) => (r.id === relicId ? up : r)));
    setOwned((prev) => prev.map((o) => ({ ...o, relics: (o.relics || []).map((r) => (r && r.id === relicId ? up : r)) })));
    flash(`Relíquia melhorada para +${up.level}`, C.good);
  }
  function levelUp(id) {
    const o = ownedMap[id]; if (!o) return;
    const cap = levelCap(o.asc || 0);
    if (o.level >= MAX_LEVEL) { flash("Nível máximo (90)", C.gold); return; }
    if (o.level >= cap) { flash(`Ascenda primeiro para passar do nível ${cap}`, C.bad); return; }
    const needExp = expToLevel(o.level);
    if (!isAdmin && expItems < needExp) { flash(`Faltam Lácrimas de XP (precisa ${needExp})`, C.bad); return; }
    if (!isAdmin) setExpItems((v) => v - needExp);
    setOwnedField(id, { level: Math.min(cap, o.level + 1) });
  }
  function ascendChar(id) {
    const o = ownedMap[id]; if (!o) return;
    const asc = o.asc || 0;
    if (asc >= ASC_GATES.length) { flash("Ascensão máxima atingida", C.gold); return; }
    if (o.level < ASC_GATES[asc]) { flash(`Chegue ao nível ${ASC_GATES[asc]} para ascender`, C.bad); return; }
    const cost = ASC_COST[asc];
    if (!isAdmin && ascMats < cost) { flash(`Faltam Núcleos de Ascensão (precisa ${cost})`, C.bad); return; }
    if (!isAdmin) setAscMats((v) => v - cost);
    setOwnedField(id, { asc: asc + 1 });
    flash(`Ascensão concluída! Limite de nível: ${levelCap(asc + 1)}`, C.gold);
  }
  function weaponLevelUp(id) {
    const o = ownedMap[id]; if (!o || !o.weapon) { flash("Equipe uma arma primeiro", C.bad); return; }
    const lv = o.weaponLv || 1;
    if (lv >= WEAPON_MAX_LEVEL) { flash("Arma no nível máximo (80)", C.gold); return; }
    const c = weaponCost(lv);
    if (!isAdmin && weaponMats < c.wmat) { flash(`Faltam Engrenagens de Arma (precisa ${c.wmat})`, C.bad); return; }
    if (!isAdmin && expItems < c.exp) { flash(`Faltam Lácrimas de XP (precisa ${c.exp})`, C.bad); return; }
    if (!isAdmin) { setWeaponMats((v) => v - c.wmat); setExpItems((v) => v - c.exp); }
    setOwnedField(id, { weaponLv: lv + 1 });
    flash(`Arma → Nível ${lv + 1}`, C.good);
  }
  function traceLevelUp(id, which) {
    const o = normChar(ownedMap[id] || { id }); const lvl = o.traces[which] || 1;
    if (lvl >= TRACE_MAX) { flash("Rastro no máximo", C.gold); return; }
    const needSkill = 1 + Math.floor(lvl / 3);
    const needBoss = lvl >= 5 ? 1 : 0; // a partir do nível 5, exige 1 Núcleo de Vestígio
    if (!isAdmin && skillMats < needSkill) { flash(`Faltam Cristais de Habilidade (precisa ${needSkill})`, C.bad); return; }
    if (!isAdmin && needBoss > 0 && bossMats < needBoss) { flash("Falta 1 Núcleo de Vestígio (obrigatório a partir do nível 5)", C.bad); return; }
    if (!isAdmin) { setSkillMats((v) => v - needSkill); if (needBoss > 0) setBossMats((v) => v - needBoss); }
    setOwnedField(id, { traces: { ...o.traces, [which]: lvl + 1 } });
    flash(`${which === "basic" ? "Básico" : which === "skill" ? "Habilidade" : "Ultimate"} → Nv ${lvl + 1}`, C.good);
  }
  function unlockTraceNode(id, idx) {
    const o = normChar(ownedMap[id] || { id }); if (o.traceNodes[idx]) return;
    const def = CHAR_MAP[id]; const tag = primaryTag(def);
    if (!isAdmin && bossMats < 1) { flash("Falta 1 Núcleo de Vestígio para o nó", C.bad); return; }
    if (!isAdmin && (tagMats[tag] || 0) < 1) { flash(`Falta material da Dungeon de Tag "${tag}"`, C.bad); return; }
    if (!isAdmin) { setBossMats((v) => v - 1); setTagMats((m) => ({ ...m, [tag]: (m[tag] || 0) - 1 })); }
    const arr = o.traceNodes.slice(); arr[idx] = true; setOwnedField(id, { traceNodes: arr });
    flash("Nó de atributo desbloqueado", C.good);
  }
  function unlockSpecialTrace(id, idx) {
    const o = normChar(ownedMap[id] || { id }); if (o.specialTraces[idx]) return;
    const def = CHAR_MAP[id]; const st = specialTraces(def)[idx]; const cost = st.cost;
    if (bossMats < cost) { flash(`Faltam Núcleos de Vestígio (precisa ${cost})`, C.bad); return; }
    setBossMats((v) => v - cost);
    const arr = o.specialTraces.slice(); arr[idx] = true; setOwnedField(id, { specialTraces: arr });
    flash(`Rastro Especial desbloqueado: ${st.name}`, C.gold);
  }

  function doPull(kind, count) {
    // kind: "char" (evento), "standard" (permanente), "weapon"
    const isChar = kind === "char", isStd = kind === "standard", isWeapon = kind === "weapon";
    const tickets = isChar ? charTickets : isStd ? standardTickets : weaponTickets;
    const affordableJade = isAdmin ? count : Math.floor(jade / 160);
    if (tickets + affordableJade < count) { flash("Recursos insuficientes", C.bad); return; }
    const useTickets = Math.min(tickets, count);
    const jadeSpent = (count - useTickets) * 160;

    const pool4 = isWeapon ? WEAPONS.filter((w) => w.rarity === 4) : ROSTER.filter((c) => c.rarity === 4);
    let curPity = isChar ? pity.char : isStd ? pity.standard : pity.weapon;
    let guar = pity.guaranteeChar;
    let chroniclesGain = 0;
    const results = [];
    const fives = [];
    const ownedRef = new Set(owned.map((o) => o.id));

    for (let i = 0; i < count; i++) {
      const rar = rollRarity(curPity);
      if (rar === 5) {
        curPity = 0;
        if (isWeapon) {
          const id = featuredWeapon; // banner de arma: SEM 50/50, sempre o destaque
          setOwnedWeapons((p) => [...p, id]);
          results.push({ rarity: 5, kind, id, name: WEAPON_MAP[id].name, weapon: true });
          fives.push({ id, name: WEAPON_MAP[id].name, banner: "Armas" });
        } else if (isStd) {
          const id = pick(STANDARD_5); // permanente: pool padrão
          const dup = grantChar(id, ownedRef);
          results.push({ rarity: 5, kind, id, name: CHAR_MAP[id].name, dup });
          fives.push({ id, name: CHAR_MAP[id].name, banner: "Permanente" });
        } else {
          let id, won;
          if (guar || Math.random() < 0.5) { id = featuredChar; guar = false; won = true; } // ganhou o 50/50
          else { id = pick(STANDARD_5); guar = true; won = false; } // perdeu: cai um padrão
          const dup = grantChar(id, ownedRef);
          results.push({ rarity: 5, kind, id, name: CHAR_MAP[id].name, dup, won });
          fives.push({ id, name: CHAR_MAP[id].name, banner: won ? "Evento (50/50 ✓)" : "Evento (perdeu 50/50)" });
        }
      } else if (rar === 4) {
        curPity += 1;
        const it = pick(pool4);
        if (isWeapon) { setOwnedWeapons((p) => [...p, it.id]); results.push({ rarity: 4, kind, id: it.id, name: it.name, weapon: true }); }
        else { const dup = grantChar(it.id, ownedRef); results.push({ rarity: 4, kind, id: it.id, name: it.name, dup }); }
      } else {
        curPity += 1; chroniclesGain += 1;
        results.push({ rarity: 3, kind, id: "shard", name: "Crônica (+1📜)" });
      }
    }
    if (isChar) setPity((p) => ({ ...p, char: curPity, guaranteeChar: guar }));
    else if (isStd) setPity((p) => ({ ...p, standard: curPity }));
    else setPity((p) => ({ ...p, weapon: curPity }));
    if (isChar) setCharTickets((t) => t - useTickets); else if (isStd) setStandardTickets((t) => t - useTickets); else setWeaponTickets((t) => t - useTickets);
    if (jadeSpent && !isAdmin) setJade((j) => j - jadeSpent);
    if (chroniclesGain) setChronicles((c) => c + chroniclesGain);
    if (fives.length) setPullHistory((h) => [...fives.map((f) => ({ ...f, t: Date.now() })), ...h].slice(0, 30));
    setPullResults({ kind, results });
  }

  // batalhas
  function startTower(floor) {
    if (floor <= towerCleared) { flash("Andar já concluído — não pode repetir.", C.bad); return; }
    if (floor > towerCleared + 1) { flash("Conclua os andares anteriores primeiro.", C.bad); return; }
    if (stamina < 5) { flash("Stamina insuficiente (precisa 5)", C.bad); return; }
    setStamina((v) => v - 5);
    setBattle({ context: "tower", floor, encounter: towerEncounter(floor, teamPower()), ally: null });
  }
  function startTest() {
    const lv = Math.round(team.reduce((a, id) => a + (ownedMap[id]?.level || 1), 0) / Math.max(1, team.length)) + 4;
    setBattle({ context: "test", encounter: { level: lv, count: 3, boss: false, teamPower: teamPower() }, ally: null });
  }
  function startFarm(stage) {
    if (stamina < stage.cost) { flash(`Stamina insuficiente (precisa ${stage.cost})`, C.bad); return; }
    setStamina((v) => v - stage.cost);
    setBattle({ context: "farm", reward: stage.exp, encounter: { level: stage.level, count: stage.count, boss: !!stage.boss, teamPower: teamPower() }, ally: null });
  }
  function startTagDungeon(tag) {
    if (!team.length) { flash("Monte uma equipe", C.bad); return; }
    if (stamina < 30) { flash("Stamina insuficiente (precisa 30)", C.bad); return; }
    setStamina((v) => v - 30);
    const lv = Math.round(team.reduce((a, id) => a + (ownedMap[id]?.level || 1), 0) / Math.max(1, team.length)) + 6;
    // tagDungeon=true → HP fixo baseado no nível, não escala com poder do time (estilo HSR)
    setBattle({ context: "tagdungeon", tag, encounter: { level: lv, count: 3, waves: 6, boss: true, tag, bossName: `Guardião da Tag · ${tag}`, bossKind: "guardian", teamPower: teamPower(), tagDungeon: true }, ally: null });
  }
  function startWeekly() {
    if (stamina < 50) { flash("Stamina insuficiente (precisa 50)", C.bad); return; }
    setStamina((v) => v - 50);
    const weeklyReady = Date.now() - lastWeeklyBoss > 7 * 24 * 3600 * 1000;
    setBattle({ context: "weekly", weeklyReady, encounter: { level: 55, count: 1, boss: true, weekly: true, finalBoss: false, bossName: "Tirano do Vazio", teamPower: teamPower() }, ally: null });
  }
  function startAscension() {
    if (stamina < 40) { flash("Stamina insuficiente (precisa 40)", C.bad); return; }
    setStamina((v) => v - 40);
    setBattle({ context: "ascend", encounter: { level: 50, count: 1, boss: true, ascend: true, bossName: "Guardião da Ascensão", bossKind: "stone", teamPower: teamPower() }, ally: null });
  }
  function startBossRush(bossId) { setPendingBoss(bossId); }
  function launchBossRush(bossId, customTeam) { const bd = BOSS_RUSH_BOSSES.find(function(b){return b.id===bossId;}); if (!bd) return; setPendingBoss(null); setBattle({ context: "bossrush", bossId: bossId, customTeam: customTeam||null, encounter: { bossRush: true, bossId: bossId, level: bd.level, count: 1, boss: true, bossName: bd.name, bossElement: bd.element, bossKind: bd.kind, bossImgId: bd.imgKey, teamPower: teamPower() }, ally: null }); }
  function onBattleEnd(result) {
    const b = battle; setBattle(null);
    if (!b || result.abort) return;
    if (b.context === "tower") {
      if (result.win) {
        const f = b.floor;
        if (f === towerCleared + 1 && !towerClaimed.includes(f)) {
          const rw = rewardFor(f); setJade((j) => j + rw); setTowerCleared(f); setTowerClaimed((p) => [...p, f]);
          flash(`Andar ${f} conquistado! +${rw}💎`, C.good);
        } else { setExpItems((v) => v + 4); flash("Andar repetido — sem gemas, +4 Lácrimas de XP", C.mute); } // anti-exploit: replays não dão gemas
      } else flash("Você caiu na torre…", C.bad);
    } else if (b.context === "test") {
      if (result.win) { flash("Vitória de treino! (modo livre, sem recompensas)", C.good); } // anti-exploit: treino é sandbox, sem materiais
      else flash("Derrota", C.bad);
    } else if (b.context === "farm") {
      if (result.win) { setExpItems((v) => v + (b.reward || 8)); flash(`Dungeon limpa! +${b.reward || 8} Lácrimas de XP`, C.good); }
      else flash("Derrota na dungeon", C.bad);
    } else if (b.context === "tagdungeon") {
      if (result.win) { const t = b.tag; const drop = Math.floor(Math.random() * 2) + 1; setTagMats((m) => ({ ...m, [t]: (m[t] || 0) + drop })); setWeaponMats((v) => v + 5); setSkillMats((v) => v + 5); setBossMats((v) => v + 1); flash(`Dungeon de ${t} concluída! +${drop} material "${t}", +5 ⚙️ Arma, +5 💠 Habilidade, +1 🔮`, C.gold); }
      else flash("A dungeon resistiu…", C.bad);
    } else if (b.context === "weekly") {
      if (result.win) {
        const bonus = b.weeklyReady ? 5 : 2; setBossMats((v) => v + bonus);
        if (b.weeklyReady) setLastWeeklyBoss(Date.now());
        flash(`Boss derrotado! +${bonus} Núcleo(s) de Vestígio${b.weeklyReady ? " (bônus semanal!)" : ""}`, C.gold);
      } else flash("O boss te derrotou…", C.bad);
    } else if (b.context === "ascend") {
      if (result.win) { setAscMats((v) => v + 3); flash("Guardião derrotado! +3 Núcleos de Ascensão 🔶", C.gold); }
      else flash("O Guardião da Ascensão te derrotou…", C.bad);
    } else if (b.context === "coop") {
      if (b.onResolve) b.onResolve(result);
    } else if (b.context === "bossrush") {
      if (result.win) {
        const _brid = b.bossId;
        const _brTurns = result.turns || 0;
        const _brPlayer = (playerName || email || "Anon").split("@")[0];
        const _brEmail = email || "anon";
        cloudReady.then(async function() {
          try {
            const lb = await cloudGet("bossrush_lb", _brid);
            const scores = (lb && Array.isArray(lb.scores)) ? lb.scores : [];
            const idx = scores.findIndex(function(x){ return x.email === _brEmail; });
            const entry = { player: _brPlayer, email: _brEmail, turns: _brTurns, at: Date.now() };
            if (idx >= 0) { if (_brTurns < scores[idx].turns || scores[idx].turns === 0) scores[idx] = entry; }
            else scores.push(entry);
            scores.sort(function(a,b){ return a.turns - b.turns; });
            await cloudSet("bossrush_lb", _brid, { scores: scores.slice(0, 50) });
          } catch(e) {}
        });
      }
      if (result.win && !bossRushCleared.includes(b.bossId)) { setBossRushCleared(function(prev){return [...prev, b.bossId];}); setJade(function(j){return j + 400;}); flash("Boss Rush concluido! +400", C.gold); } else if (result.win) { flash("Boss ja foi derrotado — sem recompensa extra.", C.mute); } else { flash("Voce foi derrotado no Boss Rush...", C.bad); }
    }
  }

  if (!loaded) return <div style={{ minHeight: "100vh", background: C.bg0, color: C.mute, display: "flex", alignItems: "center", justifyContent: "center" }}>Sincronizando ressonância…</div>;

  const nav = [["home", "Portal", "✦"], ["gacha", "Invocar", "🎴"], ["roster", "Elenco", "👥"], ["team", "Equipe", "⚔️"], ["farm", "Farm", "🌱"], ["tower", "Torre", "🗼"], ["weekly", "Boss", "👹"], ["coop", "Co-op", "🛰️"], ["relics", "Relíquias", "💠"], ["social", "Social", "🤝"], ...(isAdmin ? [["admin", "Admin", "🛠️"]] : [])];

  return (
    <ImgCtx.Provider value={images}>
      <FontInject />
      <div style={{ minHeight: "100vh", background: `radial-gradient(1200px 600px at 75% -12%, ${C.bg1}, ${C.bg0}), radial-gradient(900px 500px at 10% 110%, #160d2e, ${C.bg0})`, color: C.text, fontFamily: "ui-sans-serif, system-ui, 'Segoe UI', sans-serif" }}>
        {/* TOP BAR */}
        <div style={{ position: "sticky", top: 0, zIndex: 30, backdropFilter: "blur(10px)", background: `${C.bg0}d9`, borderBottom: `1px solid ${C.line}` }}>
          <div className="px-4 py-3 flex items-center justify-between" style={{ maxWidth: 1000, margin: "0 auto", gap: 8, flexWrap: "wrap" }}>
            <span style={{ ...ORB, fontWeight: 800, letterSpacing: 2, fontSize: 17 }}><Glow color={C.gold}>STELLAR</Glow> RESONANCE</span>
            <div className="flex items-center gap-2 text-sm" style={{ flexWrap: "wrap" }}>
              <Res icon="💎" v={isAdmin ? "∞" : jade} color="#86d8ff" itemId="item_jade" />
              <Res icon="📜" v={chronicles} color="#e8c97a" itemId="item_chronicles" />
              <Res icon="📘" v={expItems} color="#9be7a0" itemId="item_exp" />
              <Res icon="🔶" v={ascMats} color="#ffb86b" itemId="item_asc_mat" />
              <Res icon="🔮" v={bossMats} color={C.gold} itemId="item_boss_mat" />
              <Res icon="🎴" v={charTickets} color={C.gold} itemId="item_ticket_char" />
              <Res icon="🔧" v={weaponTickets} color="#B98BFF" itemId="item_ticket_wpn" />
              <Res icon="⚡" v={`${stamina}`} color={C.good} />
              <button onClick={onLogout} title={email} className="flex items-center gap-1" style={{ background: C.panelHi, padding: "4px 10px", borderRadius: 99, border: `1px solid ${C.line}`, color: C.mute, fontWeight: 700, fontSize: 13 }}>
                {isAdmin && <span style={{ color: C.gold }}>👑</span>}⎋ Sair
              </button>
            </div>
          </div>
        </div>

        <div style={{ maxWidth: 1000, margin: "0 auto", padding: battle ? "0" : "16px 14px 110px" }}>
          {battle ? (
            <Battle key={JSON.stringify(battle.encounter) + battle.context + (battle.floor || 0)}
              team={battle.customTeam || team} ownedMap={ownedMap} encounter={battle.encounter} ally={battle.ally} context={battle.context}
              onEnd={onBattleEnd} flash={flash} />
          ) : pendingBoss ? (
            <BossRushTeamSelect boss={BOSS_RUSH_BOSSES.find(function(b){return b.id===pendingBoss;})} owned={owned} defaultTeam={team} images={images} onCancel={function(){setPendingBoss(null);}} onConfirm={function(t){launchBossRush(pendingBoss,t);}} flash={flash} />
          ) : (
            <>
              {screen === "home" && <Home email={email} isAdmin={isAdmin} playerName={playerName} setPlayerName={setPlayerName} owned={owned} setScreen={setScreen} setJade={setJade} setCharTickets={setCharTickets} setStandardTickets={setStandardTickets} setWeaponTickets={setWeaponTickets} flash={flash} towerCleared={towerCleared} bossRushCleared={bossRushCleared} startBossRush={startBossRush} images={images} setImages={setImages} />}
              {screen === "social" && <Social email={email} flash={flash} />}
              {screen === "gacha" && <Gacha doPull={doPull} pity={pity} jade={jade} chronicles={chronicles} charTickets={charTickets} weaponTickets={weaponTickets} standardTickets={standardTickets} featuredChar={featuredChar} setFeaturedChar={setFeaturedChar} featuredWeapon={featuredWeapon} setFeaturedWeapon={setFeaturedWeapon} pullHistory={pullHistory} owned={owned} ownedWeapons={ownedWeapons} />}
              {screen === "roster" && <Roster owned={owned} ownedWeapons={ownedWeapons} relicInv={relicInv} setOwnedField={setOwnedField} levelUp={levelUp} ascendChar={ascendChar} ascMats={ascMats} jade={jade} isAdmin={isAdmin} expItems={expItems} bossMats={bossMats} traceLevelUp={traceLevelUp} unlockTraceNode={unlockTraceNode} unlockSpecialTrace={unlockSpecialTrace} publish={async (o) => { await publishChar(playerName, o); flash("Publicado no Co-op global", C.good); }} onUpgradeRelic={onUpgradeRelic} weaponLevelUp={weaponLevelUp} weaponMats={weaponMats} skillMats={skillMats} tagMats={tagMats} />}
              {screen === "team" && <TeamScreen owned={owned} team={team} setTeam={setTeam} startTest={startTest} flash={flash} />}
              {screen === "farm" && <Farm stamina={stamina} start={startFarm} expItems={expItems} startTagDungeon={startTagDungeon} tagMats={tagMats} weaponMats={weaponMats} skillMats={skillMats} />}
              {screen === "tower" && <Tower towerCleared={towerCleared} towerClaimed={towerClaimed} start={startTower} team={team} flash={flash} />}
              {screen === "weekly" && <WeeklyBoss start={startWeekly} stamina={stamina} bossMats={bossMats} lastWeeklyBoss={lastWeeklyBoss} startAscension={startAscension} ascMats={ascMats} />}
              {screen === "coop" && <Coop team={team} ownedMap={ownedMap} stamina={stamina} setStamina={setStamina} setRelicInv={setRelicInv} flash={flash} setBattle={setBattle} />}
              {screen === "relics" && <RelicsScreen relicInv={relicInv} />}
              {screen === "admin" && (isAdmin ? <Admin images={images} setImages={setImages} flash={flash} /> : <Empty msg="Acesso restrito ao administrador." />)}
            </>
          )}
        </div>

        {!battle && (
          <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 40, background: `${C.bg0}f5`, borderTop: `1px solid ${C.line}`, backdropFilter: "blur(10px)" }}>
            <div className="flex items-center px-2 py-2" style={{ maxWidth: 1000, margin: "0 auto", overflowX: "auto", gap: 2 }}>
              {nav.map(([k, label, ic]) => (
                <button key={k} onClick={() => setScreen(k)} className="flex flex-col items-center px-3 py-1 rounded-xl transition" style={{ minWidth: 62, color: screen === k ? C.gold : C.mute, position: "relative" }}>
                  {screen === k && <span style={{ position: "absolute", top: -8, width: 26, height: 3, borderRadius: 9, background: C.gold, boxShadow: `0 0 10px ${C.gold}` }} />}
                  <span style={{ fontSize: 18 }}>{ic}</span><span style={{ fontSize: 11, fontWeight: 700 }}>{label}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {toast && <div style={{ position: "fixed", top: 76, left: "50%", transform: "translateX(-50%)", zIndex: 70, background: C.panelHi, border: `1px solid ${toast.color}`, color: toast.color, padding: "10px 18px", borderRadius: 99, fontWeight: 700, boxShadow: `0 0 26px ${toast.color}45` }}>{toast.msg}</div>}
        {pullResults && <PullModal data={pullResults} onClose={() => setPullResults(null)} />}
      </div>
    </ImgCtx.Provider>
  );
}

function ItemIcon({ id, emoji, size = 18 }) {
  const images = useImg();
  const url = id ? images[id] : null;
  const [err, setErr] = useState(false);
  useEffect(() => { setErr(false); }, [url]);
  if (url && !err) return <img src={url} alt="" onError={() => setErr(true)} style={{ width: size, height: size, objectFit: "cover", borderRadius: 3, flexShrink: 0, display: "block" }} />;
  return <span>{emoji}</span>;
}
function Res({ icon, v, color, itemId }) {
  return <span className="flex items-center gap-1" style={{ background: C.panelHi, padding: "4px 10px", borderRadius: 99, border: `1px solid ${C.line}` }}><ItemIcon id={itemId} emoji={icon} size={18} /><b style={{ color }}>{v}</b></span>;
}

/* ==========================================================================
   HOME
   ========================================================================== */
function formatCountdown(ms) {
  const total = Math.floor(ms / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n) => String(n).padStart(2, "0");
  return `${pad(h)}h ${pad(m)}m ${pad(s)}s`;
}
function NickEditor({ playerName, setPlayerName, flash }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [blocked, setBlocked] = useState(null);
  useEffect(() => {
    const ts = localStorage.getItem("sr_nick_last_change");
    if (ts) {
      const diff = Date.now() - parseInt(ts, 10);
      const seven = 7 * 24 * 60 * 60 * 1000;
      if (diff < seven) setBlocked(Math.ceil((seven - diff) / (24 * 60 * 60 * 1000)));
    }
  }, []);
  const startEdit = () => {
    if (blocked) { flash(`Bloqueado: aguarde ${blocked} dia(s) para alterar o nick.`, C.bad); return; }
    setDraft(playerName); setEditing(true);
  };
  const save = () => {
    const n = draft.trim();
    if (!n) { flash("Nick não pode estar vazio.", C.bad); return; }
    if (n.length > 20) { flash("Nick muito longo (máx 20 caracteres).", C.bad); return; }
    setPlayerName(n);
    localStorage.setItem("sr_nick_last_change", String(Date.now()));
    setBlocked(7); setEditing(false);
    flash("Nickname atualizado! Próxima troca liberada em 7 dias.", C.good);
  };
  if (editing) return (
    <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
      <input value={draft} onChange={(e) => setDraft(e.target.value)} autoFocus maxLength={20}
        style={{ background: C.panelHi, border: `1px solid ${C.gold}`, borderRadius: 10, padding: "6px 10px", color: C.text, outline: "none", ...ORB, fontSize: 22, fontWeight: 800, flex: 1, minWidth: 0 }}
        onKeyDown={(e) => { if (e.key === "Enter") save(); if (e.key === "Escape") setEditing(false); }} />
      <Btn style={{ padding: "6px 12px" }} onClick={save}>Salvar</Btn>
      <Btn kind="ghost" style={{ padding: "6px 10px" }} onClick={() => setEditing(false)}>✕</Btn>
    </div>
  );
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <div style={{ ...ORB, fontSize: 24, fontWeight: 800 }}>{playerName}</div>
      <button onClick={startEdit} title={blocked ? `Bloqueado por ${blocked} dia(s)` : "Editar nickname"}
        style={{ background: "none", border: `1px solid ${blocked ? C.line : C.gold}`, borderRadius: 8, color: blocked ? C.mute : C.gold, padding: "3px 9px", cursor: "pointer", fontSize: 12, fontWeight: 700 }}>
        {blocked ? `🔒 ${blocked}d` : "✎"}
      </button>
    </div>
  );
}
function BossPhotoBtn({ boss, images, setImages }) {
  const fileRef = React.useRef();
  function handleImg(e) {
    const file = e.target.files && e.target.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = function(ev) {
      const b64 = ev.target.result;
      const newImgs = Object.assign({}, images || {}, { [boss.imgKey]: b64 });
      setImages(newImgs);
      try { _ls.set("sr_shared_images", JSON.stringify(newImgs)); } catch(x) {}
      cloudReady.then(function(){ return cloudSet("meta", "images", { map: newImgs }); }).catch(function(){});
    };
    reader.readAsDataURL(file);
  }
  return (
    <React.Fragment>
      <button onClick={function(){fileRef.current && fileRef.current.click();}} style={{ position: "absolute", bottom: 8, right: 8, background: "#221C47", border: "1px solid #F6C95B", color: "#F6C95B", borderRadius: 8, padding: "3px 8px", fontSize: 11, fontWeight: 700, zIndex: 2 }}>📷 Foto</button>
      <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleImg} />
    </React.Fragment>
  );
}
function BossRushLeaderboard({ bossId }) {
  const [scores, setScores] = useState(null);
  const [open, setOpen] = useState(false);
  function load() {
    setScores(null);
    cloudReady.then(function() { return cloudGet("bossrush_lb", bossId); }).then(function(lb) {
      const list = (lb && Array.isArray(lb.scores)) ? lb.scores : [];
      list.sort(function(a,b){ return a.turns - b.turns; });
      setScores(list);
    }).catch(function(){ setScores([]); });
  }
  const medals = ["🥇","🥈","🥉"];
  return (
    <div style={{ marginTop: 8 }}>
      <button onClick={function(){ if (!open) load(); setOpen(function(o){return !o;}); }}
        style={{ background: "none", border: `1px solid ${C.line}`, color: C.mute, borderRadius: 8, padding: "4px 12px", fontSize: 12, fontWeight: 700, cursor: "pointer", width: "100%" }}>
        {open ? "▲ Ocultar Ranking" : "🏆 Ver Ranking Global"}
      </button>
      {open && (
        <div style={{ marginTop: 8, background: "rgba(255,255,255,0.03)", borderRadius: 10, border: `1px solid ${C.line}`, overflow: "hidden" }}>
          <div style={{ padding: "8px 14px", background: "rgba(246,201,91,0.08)", borderBottom: `1px solid ${C.line}`, fontWeight: 800, fontSize: 12, letterSpacing: 1, color: C.gold }}>
            🏆 RANKING — {bossId === "byakuya" ? "Byakuya Kuchiki" : bossId === "sukuna" ? "Ryomen Sukuna" : "Frieren"}
            <button onClick={load} style={{ float: "right", background: "none", border: "none", color: C.mute, fontSize: 11, cursor: "pointer" }}>↺ Atualizar</button>
          </div>
          {scores === null && <div style={{ padding: "12px", color: C.mute, fontSize: 12, textAlign: "center" }}>Carregando…</div>}
          {scores !== null && scores.length === 0 && <div style={{ padding: "12px", color: C.mute, fontSize: 12, textAlign: "center" }}>Nenhum registro ainda. Seja o primeiro!</div>}
          {scores !== null && scores.map(function(s, i) {
            return (
              <div key={s.email} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 14px", borderBottom: i < scores.length-1 ? `1px solid ${C.line}` : "none", background: i === 0 ? "rgba(246,201,91,0.06)" : "transparent" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 16, minWidth: 24 }}>{medals[i] || `#${i+1}`}</span>
                  <span style={{ fontWeight: i === 0 ? 800 : 600, color: i === 0 ? C.gold : C.text, fontSize: 13 }}>{s.player || s.email.split("@")[0]}</span>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontWeight: 800, fontSize: 14, color: i === 0 ? C.gold : C.text }}>{s.turns} <span style={{ fontSize: 11, fontWeight: 400, color: C.mute }}>turnos</span></div>
                  <div style={{ fontSize: 10, color: C.dim }}>{s.at ? new Date(s.at).toLocaleDateString("pt-BR") : ""}</div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
function ContentTabs({ bossRushCleared, startBossRush, isAdmin, images, setImages }) {
  const [tab, setTab] = useState("historia");
  const historiaMs = useBannerTimer("content_historia", 3 * 24 * 60 * 60 * 1000);
  const endgameMs  = useBannerTimer("content_endgame",  7 * 24 * 60 * 60 * 1000);
  return (
    <Panel>
      <b>Cronogramas</b>
      <div className="flex gap-2 mt-3" style={{ flexWrap: "wrap" }}>
        <TabBtn active={tab === "historia"} onClick={() => setTab("historia")}>📖 História</TabBtn>
        <TabBtn active={tab === "eventos"}  onClick={() => setTab("eventos")}>🎉 Eventos</TabBtn>
        <TabBtn active={tab === "endgame"}  onClick={() => setTab("endgame")}>⚡ End Game</TabBtn>
      </div>
      {tab === "historia" && <div style={{ marginTop: 12 }}>
        <div style={{ fontWeight: 700, marginBottom: 4 }}>Próximo Capítulo da Campanha</div>
        <div style={{ fontSize: 13, color: C.mute, marginBottom: 8 }}>Aguarde a liberação dos novos servidores da história principal:</div>
        <div style={{ fontFamily: "monospace", fontWeight: 800, fontSize: 22, color: "#ffcc00", textAlign: "center", letterSpacing: 2, padding: "10px 0" }}>{formatCountdown(historiaMs)}</div>
      </div>}
      {tab === "eventos" && <div style={{ marginTop: 12 }}>
        <div style={{ fontWeight: 700, marginBottom: 8 }}>Eventos Ativos</div>
        <div style={{ textAlign: "center", padding: "16px 0", background: C.panelHi, borderRadius: 10 }}>
          <div style={{ color: C.mute, fontWeight: 700, fontSize: 13, letterSpacing: 1, textTransform: "uppercase" }}>Eventos Indefinidos</div>
          <div style={{ color: C.dim, fontSize: 12, marginTop: 4 }}>Fique atento às notas de atualização futuras.</div>
        </div>
      </div>}
      {tab === "endgame" && <div style={{ marginTop: 12 }}>
        <style dangerouslySetInnerHTML={{__html: "@keyframes brCardGlow{0%,100%{box-shadow:none}50%{box-shadow:0 0 28px var(--bcol,#fff4),0 0 60px var(--bcol,#fff2)}} @keyframes clearedShine{from{background-position:200% center}to{background-position:-200% center}}" }} />
        <div style={{ display:"flex",justifyContent:"space-between",alignItems:"baseline",marginBottom:4 }}>
          <div style={{ fontWeight:900,fontSize:18 }}>⚡ Boss Rush</div>
          <div style={{ fontSize:11,color:C.mute }}>{(bossRushCleared||[]).length}/{BOSS_RUSH_BOSSES.length} derrotados</div>
        </div>
        <div style={{ fontSize:12,color:C.mute,marginBottom:14 }}>Chefes únicos de End Game. Monte seu time antes da batalha — cada boss dá +400💎 na primeira vitória.</div>
        <div style={{ display:"flex",flexDirection:"column",gap:20 }}>
          {BOSS_RUSH_BOSSES.map(function(boss) {
            const cleared = bossRushCleared && bossRushCleared.includes(boss.id);
            const el = ELEMENTS[boss.element] || ELEMENTS.Holy;
            const imgUrl = images && images[boss.imgKey];
            const diffLabel = boss.level >= 90 ? {txt:"EXTREMO",c:"#FF4444"} : boss.level >= 85 ? {txt:"DIFÍCIL",c:"#FF8C44"} : {txt:"NORMAL",c:C.good};
            return (
              <div key={boss.id} style={{ borderRadius:18,overflow:"hidden",border:cleared?"2px solid "+C.good+"66":"2px solid "+el.color+"88","--bcol":el.color,animation:cleared?"none":"brCardGlow 3s ease-in-out infinite",boxShadow:cleared?"none":"0 4px 32px "+el.color+"18",transition:"all .3s" }}>
                <div style={{ position:"relative",height:170,background:"linear-gradient(135deg,"+el.color+"44 0%,"+((el.soft)||"#0b0920")+" 60%)",display:"flex",alignItems:"center",overflow:"hidden" }}>
                  {imgUrl
                    ? <img src={imgUrl} alt={boss.name} style={{ position:"absolute",inset:0,width:"100%",height:"100%",objectFit:"cover",objectPosition:"top",maskImage:"linear-gradient(to right,rgba(0,0,0,.95) 30%,rgba(0,0,0,.3))",WebkitMaskImage:"linear-gradient(to right,rgba(0,0,0,.95) 30%,rgba(0,0,0,.3))" }} />
                    : <div style={{ position:"absolute",right:"5%",fontSize:95,opacity:.5,filter:"drop-shadow(0 0 32px "+el.color+")" }}>{boss.avatar}</div>}
                  {cleared && (
                    <div style={{ position:"absolute",inset:0,background:"#000d",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:8 }}>
                      <span style={{ fontSize:32 }}>🏆</span>
                      <span style={{ background:"linear-gradient(90deg,"+C.good+",#fff,"+C.good+")",backgroundSize:"200%",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",fontWeight:900,fontSize:22,letterSpacing:4,animation:"clearedShine 2s linear infinite" }}>DERRUBADO</span>
                      <BossRushLeaderboard bossId={boss.id} />
                    </div>
                  )}
                  {!cleared && <BossRushLeaderboard bossId={boss.id} />}
                  <div style={{ position:"relative",zIndex:2,padding:"14px 16px",flex:1 }}>
                    <div style={{ display:"flex",gap:5,marginBottom:5,flexWrap:"wrap" }}>
                      <span style={{ background:el.color+"33",border:"1px solid "+el.color+"77",borderRadius:8,padding:"2px 8px",fontSize:10,color:el.color,fontWeight:700 }}>{el.glyph} {boss.element}</span>
                      <span style={{ background:diffLabel.c+"22",border:"1px solid "+diffLabel.c+"66",borderRadius:8,padding:"2px 8px",fontSize:10,color:diffLabel.c,fontWeight:800 }}>{diffLabel.txt}</span>
                      <span style={{ background:"#00000077",borderRadius:8,padding:"2px 8px",fontSize:10,color:C.gold,fontWeight:700 }}>+400💎</span>
                    </div>
                    <div style={{ fontWeight:900,fontSize:20,color:"#fff",textShadow:"0 0 20px "+el.color }}>{boss.name}</div>
                    <div style={{ fontSize:11,color:"#aaa5d5",marginTop:4,fontStyle:"italic",lineHeight:1.4,maxWidth:220 }}>{boss.lore}</div>
                    <div style={{ marginTop:7,display:"flex",gap:5,flexWrap:"wrap" }}>
                      <span style={{ fontSize:11,color:C.bad,fontWeight:700 }}>❤️ {boss.hp.toLocaleString("pt-BR")}</span>
                      {(boss.weak||[]).map(function(e){ return React.createElement('span',{key:e,style:{background:"#00ff8818",color:"#7CFFB0",border:"1px solid #7CFFB044",borderRadius:6,padding:"1px 6px",fontSize:10,fontWeight:700}},"FRACO "+(ELEMENTS[e]&&ELEMENTS[e].glyph||"")); })}
                      {(boss.res||[]).map(function(e){ return React.createElement('span',{key:e,style:{background:"#ffffff08",color:"#9aa0b5",border:"1px solid #ffffff18",borderRadius:6,padding:"1px 6px",fontSize:10}},"RES "+(ELEMENTS[e]&&ELEMENTS[e].glyph||"")); })}
                    </div>
                  </div>
                </div>
                <div style={{ padding:"12px 16px",background:"#0b0920ee" }}>
                  <div style={{ fontSize:10,color:C.mute,fontWeight:700,letterSpacing:1,marginBottom:7,textTransform:"uppercase" }}>Mecânicas de Combate</div>
                  <div style={{ display:"flex",flexDirection:"column",gap:5,marginBottom:12 }}>
                    {boss.mechanics.map(function(m,i){ return (
                      <div key={i} style={{ display:"flex",gap:8,alignItems:"flex-start",background:el.color+"0d",borderRadius:8,padding:"6px 10px",border:"1px solid "+el.color+"1a" }}>
                        <span style={{ color:el.color,fontWeight:800,flexShrink:0 }}>⚡</span>
                        <span style={{ fontSize:11,color:"#ccc5e5",lineHeight:1.5 }}>{m}</span>
                      </div>
                    ); })}
                  </div>
                  {!cleared
                    ? <Btn kind="primary" onClick={function(){if(startBossRush) startBossRush(boss.id);}}
                        style={{ width:"100%",justifyContent:"center",fontWeight:800,fontSize:14,padding:"10px 0",background:"linear-gradient(135deg,"+el.color+"cc,"+el.color+"88)",border:"none",boxShadow:"0 4px 20px "+el.color+"44" }}>
                        ⚔️ Desafiar — Escolher Time
                      </Btn>
                    : <div style={{ textAlign:"center",color:C.good,fontWeight:700,fontSize:13,padding:"8px 0" }}>✓ Derrotado — sem nova recompensa</div>}
                </div>
              </div>
            );
          })}
        </div>
      </div>}
    </Panel>
  );
}
function Home({ email, isAdmin, playerName, setPlayerName, owned, setScreen, setJade, setCharTickets, setStandardTickets, setWeaponTickets, flash, towerCleared, bossRushCleared, startBossRush, images, setImages }) {
  const fives = owned.filter((o) => CHAR_MAP[o.id]?.rarity === 5).length;
  return (
    <div className="flex flex-col gap-4">
      <Panel glow={C.gold} style={{ position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", inset: 0, background: "radial-gradient(420px 200px at 90% 0%, #B98BFF22, transparent)" }} />
        <div className="flex items-center justify-between" style={{ position: "relative" }}>
          <div>
            <div style={{ fontSize: 12, color: C.mute, letterSpacing: 2 }}>BEM-VINDO,</div>
            <NickEditor playerName={playerName} setPlayerName={setPlayerName} flash={flash} />
            <div style={{ color: C.mute, fontSize: 13 }}>Personagens: {owned.length} · 5★: {fives} · Torre: andar {towerCleared}/{TOWER_FLOORS}</div>
            <div style={{ color: C.dim, fontSize: 12, marginTop: 2 }}>conta: {email}{isAdmin && <Glow color={C.gold}> · 👑 admin</Glow>}</div>
          </div>
          <div style={{ fontSize: 44 }}>🌌</div>
        </div>
      </Panel>
      <div className="grid grid-cols-2 gap-3">
        <Tile t="Invocar" s="Banner de personagem e armas" e="🎴" onClick={() => setScreen("gacha")} />
        <Tile t="Torre Estelar" s="70 andares · 24.000💎 totais" e="🗼" onClick={() => setScreen("tower")} />
        <Tile t="Farm de XP" s="Mini-dungeons · Lácrimas de XP" e="🌱" onClick={() => setScreen("farm")} />
        <Tile t="Boss Semanal" s="Núcleos p/ Rastros Especiais" e="👹" onClick={() => setScreen("weekly")} />
      </div>
      {isAdmin && <Panel glow={C.gold}><div className="flex items-center gap-2"><span style={{ fontSize: 22 }}>👑</span><div><b>Modo Administrador</b><div style={{ color: C.mute, fontSize: 12 }}>Gemas infinitas ativas. Invocações e melhorias não consomem 💎.</div></div></div></Panel>}
      <ContentTabs bossRushCleared={bossRushCleared} startBossRush={startBossRush} isAdmin={isAdmin} images={images} setImages={setImages} />
      <Panel>
        <b>Como o suporte muda a batalha</b>
        <p style={{ color: C.mute, fontSize: 13, lineHeight: 1.65, marginTop: 6 }}>
          Buffs e debuffs são recalculados a cada golpe. <Glow color={ELEMENTS.Chaos.color}>Kirara</Glow> provoca os inimigos e protege o time com escudos,
          <Glow color={ELEMENTS.Glacial.color}> Chopper</Glow> cura e dá energia, <Glow color={ELEMENTS.Vento.color}> Usopp</Glow> reduz DEF e aplica vulnerabilidade,
          e <Glow color={ELEMENTS.Eletro.color}> Seto Kaiba</Glow> invoca até 3 Blue-Eyes (cada um mais fraco) e, com 3 em campo, libera o Obelisco ou o Dragão Definitivo no Ultimate.
        </p>
      </Panel>
    </div>
  );
}
function Tile({ t, s, e, onClick }) {
  return <button onClick={onClick} className="text-left active:scale-95 transition"><Panel style={{ height: "100%" }}><div style={{ fontSize: 28 }}>{e}</div><div style={{ fontWeight: 800, marginTop: 6 }}>{t}</div><div style={{ color: C.mute, fontSize: 12 }}>{s}</div></Panel></button>;
}
function Farm({ stamina, start, expItems, startTagDungeon, tagMats, weaponMats, skillMats }) {
  return <div className="flex flex-col gap-4">
    <Panel glow="#9be7a0">
      <div className="flex items-center justify-between" style={{ gap: 10 }}>
        <div><div style={{ ...ORB, fontWeight: 800, fontSize: 18 }}>🌱 Domínios de Crescimento</div>
          <div style={{ color: C.mute, fontSize: 13, marginTop: 2 }}>Enfrente mini-dungeons e colete 📘 Lácrimas de XP para subir o nível dos personagens.</div></div>
        <Res icon="📘" v={expItems} color="#9be7a0" itemId="item_exp" />
      </div>
    </Panel>
    {FARM_STAGES.map((st) => <Panel key={st.id}>
      <div className="flex items-center justify-between" style={{ gap: 10 }}>
        <div><b>{st.name}</b><div style={{ color: C.mute, fontSize: 12 }}>Nv {st.level} · {st.count} inimigos{st.boss ? " · Elite" : ""} · recompensa +{st.exp} 📘</div></div>
        <Btn kind={stamina < st.cost ? "soft" : "primary"} disabled={stamina < st.cost} onClick={() => start(st)}>{st.cost}⚡ Entrar</Btn>
      </div>
    </Panel>)}
    <Panel glow="#B98BFF">
      <div style={{ ...ORB, fontWeight: 800, fontSize: 18 }}>🗝️ Dungeons de Tag</div>
      <div style={{ color: C.mute, fontSize: 12, marginTop: 2 }}>Uma dungeon por tag do elenco (tags repetidas não geram dungeon extra). 6 ondas. Dropam: <b>⚙️ Engrenagens de Arma</b> (subir armas), <b>💠 Cristais de Habilidade</b> (subir Básico/Habilidade/Ultimate) e o <b>material da tag</b> (necessário, junto de 1 🔮 Núcleo, para destravar Nós de Atributo).</div>
      <div className="flex items-center gap-3 mt-2" style={{ fontSize: 12, flexWrap: "wrap" }}><span className="flex items-center gap-1"><ItemIcon id="item_wpn_mat" emoji="⚙️" size={14} /> <b style={{ color: C.gold }}>{weaponMats}</b></span><span className="flex items-center gap-1"><ItemIcon id="item_skill_mat" emoji="💠" size={14} /> <b style={{ color: C.gold }}>{skillMats}</b></span></div>
      <div className="grid gap-2 mt-3" style={{ gridTemplateColumns: "repeat(auto-fill,minmax(150px,1fr))" }}>
        {ALL_TAGS.map((tag) => <div key={tag} style={{ background: C.panelHi, border: `1px solid ${C.line}`, borderRadius: 10, padding: 10 }}>
          <div style={{ fontWeight: 700, fontSize: 13 }}>{tag}</div>
          <div style={{ fontSize: 10, color: C.mute, marginBottom: 6 }}>Material “{tag}”: <b style={{ color: C.gold }}>{(tagMats && tagMats[tag]) || 0}</b></div>
          <Btn kind={stamina < 30 ? "soft" : "primary"} disabled={stamina < 30} style={{ padding: "5px 10px", width: "100%" }} onClick={() => startTagDungeon(tag)}>30⚡ · 6 ondas</Btn>
        </div>)}
      </div>
    </Panel>
  </div>;
}
function WeeklyBoss({ start, stamina, bossMats, lastWeeklyBoss, startAscension, ascMats }) {
  const ready = Date.now() - lastWeeklyBoss > 7 * 24 * 3600 * 1000;
  const days = Math.max(0, Math.ceil((7 * 24 * 3600 * 1000 - (Date.now() - lastWeeklyBoss)) / (24 * 3600 * 1000)));
  return <div className="flex flex-col gap-4">
    <Panel glow={C.gold} style={{ position: "relative", overflow: "hidden" }}>
      <div style={{ position: "absolute", inset: 0, background: "radial-gradient(420px 200px at 90% 0%, #ffcf4a22, transparent)" }} />
      <div style={{ position: "relative" }}>
        <div style={{ fontSize: 40 }}>🦂</div>
        <div style={{ ...ORB, fontWeight: 800, fontSize: 20 }}>Tirano do Vazio</div>
        <div style={{ color: C.mute, fontSize: 13, marginTop: 4 }}>Um chefe poderoso que escala com a força da sua equipe. Derrote-o para coletar 🔮 Núcleos de Vestígio, usados para desbloquear os 3 Rastros Especiais de cada personagem.</div>
        <div className="flex items-center gap-3" style={{ marginTop: 10, flexWrap: "wrap" }}>
          <Res icon="🔮" v={bossMats} color={C.gold} itemId="item_boss_mat" />
          <span style={{ fontSize: 12, color: ready ? C.good : C.mute }}>{ready ? "✅ Bônus semanal disponível (+3)" : `Bônus semanal em ${days} dia(s) · clears extras dão +1`}</span>
        </div>
        <Btn kind={stamina < 50 ? "soft" : "primary"} disabled={stamina < 50} style={{ marginTop: 12 }} onClick={start}>Desafiar o boss — 50⚡</Btn>
      </div>
    </Panel>
    <Panel glow="#ffb86b" style={{ position: "relative", overflow: "hidden" }}>
      <div style={{ position: "absolute", inset: 0, background: "radial-gradient(420px 200px at 90% 0%, #ffb86b22, transparent)" }} />
      <div style={{ position: "relative" }}>
        <div style={{ fontSize: 40 }}>🗿</div>
        <div style={{ ...ORB, fontWeight: 800, fontSize: 20 }}>Guardião da Ascensão</div>
        <div style={{ color: C.mute, fontSize: 13, marginTop: 4 }}>Boss único e blindado. Derrote-o para coletar 🔶 Núcleos de Ascensão, necessários para romper os limites de nível dos personagens nos níveis 20, 40, 60 e 80 (custos 3 · 7 · 15 · 30).</div>
        <div className="flex items-center gap-3" style={{ marginTop: 10, flexWrap: "wrap" }}>
          <Res icon="🔶" v={ascMats} color="#ffb86b" itemId="item_asc_mat" />
        </div>
        <Btn kind={stamina < 40 ? "soft" : "primary"} disabled={stamina < 40} style={{ marginTop: 12 }} onClick={startAscension}>Desafiar o Guardião — 40⚡</Btn>
      </div>
    </Panel>
    <Panel><b>Como funcionam os Rastros Especiais</b><p style={{ color: C.mute, fontSize: 13, lineHeight: 1.6, marginTop: 6 }}>Cada personagem tem 3 Rastros Especiais: dois de atributo e um com efeito único de combate. Abra o personagem no <b>Elenco</b> → aba <b>Rastros</b> para gastar os Núcleos e desbloqueá-los.</p></Panel>
  </div>;
}

/* ==========================================================================
   GACHA + CINEMATIC
   ========================================================================== */
function useBannerTimer(key, durationMs = 5 * 24 * 60 * 60 * 1000) {
  const storageKey = "sr_banner_end_" + key;
  const getEnd = () => {
    const stored = localStorage.getItem(storageKey);
    if (stored) return parseInt(stored, 10);
    const end = Date.now() + durationMs;
    localStorage.setItem(storageKey, String(end));
    return end;
  };
  const [remaining, setRemaining] = useState(() => Math.max(0, getEnd() - Date.now()));
  useEffect(() => {
    const tick = () => {
      let end = parseInt(localStorage.getItem(storageKey) || "0", 10);
      if (!end || Date.now() >= end) {
        end = Date.now() + durationMs;
        localStorage.setItem(storageKey, String(end));
      }
      setRemaining(Math.max(0, end - Date.now()));
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [key]); // eslint-disable-line
  return remaining;
}
function BannerTimer({ ms, color }) {
  if (ms == null) return null;
  const total = Math.floor(ms / 1000);
  const d = Math.floor(total / 86400);
  const h = Math.floor((total % 86400) / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n) => String(n).padStart(2, "0");
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, marginTop: 3 }}>
      <span>⏳</span>
      <span style={{ color: C.mute }}>Encerra em:</span>
      <span style={{ fontFamily: "monospace", fontWeight: 700, color: color || C.gold, letterSpacing: 1 }}>
        {d}d {pad(h)}:{pad(m)}:{pad(s)}
      </span>
    </div>
  );
}
function Gacha({ doPull, pity, jade, chronicles, charTickets, weaponTickets, standardTickets, featuredChar, setFeaturedChar, featuredWeapon, setFeaturedWeapon, pullHistory, owned, ownedWeapons }) {
  const [tab, setTab] = useState("char");
  const ownedSet = new Set((owned || []).map((o) => o.id));
  const isChar = tab === "char", isStd = tab === "standard", isWeapon = tab === "weapon";
  const ticketCount = isChar ? charTickets : isStd ? standardTickets : weaponTickets;
  const ticketIcon = isChar ? "🎴" : isStd ? "🪙" : "🔧";
  const curPity = isChar ? pity.char : isStd ? pity.standard : pity.weapon;
  const fc = CHAR_MAP[featuredChar] || CHAR_MAP[DEFAULT_FEATURED_CHAR];
  const fw = WEAPON_MAP[featuredWeapon] || WEAPON_MAP[DEFAULT_FEATURED_WEAPON];
  const cycleChar = (d) => { const i = FEATURED_LIMITEDS.indexOf(featuredChar); setFeaturedChar(FEATURED_LIMITEDS[(i + d + FEATURED_LIMITEDS.length) % FEATURED_LIMITEDS.length]); };
  const cycleWeapon = (d) => { const i = WEAPON_5_IDS.indexOf(featuredWeapon); setFeaturedWeapon(WEAPON_5_IDS[(i + d + WEAPON_5_IDS.length) % WEAPON_5_IDS.length]); };
  const headColor = isWeapon ? "#B98BFF" : isStd ? C.gold : ELEMENTS[fc.element].color;
  const arrow = { background: C.panelHi, border: `1px solid ${C.line}`, borderRadius: 8, color: C.text, width: 28, height: 28, fontWeight: 800 };
  const charMs = useBannerTimer("char", 6 * 24 * 60 * 60 * 1000); // banner de evento dura 6 dias
  const weaponMs = useBannerTimer("weapon");
  const bannerMs = isChar ? charMs : isWeapon ? weaponMs : null;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-2" style={{ flexWrap: "wrap" }}>
        <TabBtn active={isChar} onClick={() => setTab("char")}>Evento 🎴</TabBtn>
        <TabBtn active={isStd} onClick={() => setTab("standard")}>Permanente 🪙</TabBtn>
        <TabBtn active={isWeapon} onClick={() => setTab("weapon")}>Armas 🔧</TabBtn>
      </div>

      <Panel glow={headColor} style={{ position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", inset: 0, background: `radial-gradient(520px 240px at 82% 18%, ${headColor}26, transparent)` }} />
        <div style={{ position: "relative" }}>
          <div style={{ fontSize: 12, letterSpacing: 2, color: C.mute }}>{isChar ? "BANNER DE EVENTO · rate-up 50/50" : isStd ? "BANNER PERMANENTE · pool padrão" : "BANNER DE ARMAS · sem 50/50"}</div>
          {!isStd && <BannerTimer ms={bannerMs} color={headColor} />}

          {isChar && <>
            <div className="flex items-center gap-2" style={{ margin: "4px 0 12px" }}>
              <button onClick={() => cycleChar(-1)} style={arrow}>‹</button>
              <div style={{ ...ORB, fontSize: 20, fontWeight: 800, flex: 1, textAlign: "center" }}>{fc.name} <Rarity n={5} /></div>
              <button onClick={() => cycleChar(1)} style={arrow}>›</button>
            </div>
            <div className="flex items-center gap-4">
              <Avatar ch={fc} size={76} />
              <div style={{ fontSize: 13, color: C.mute }}>
                Destaque (limitado): <ElTag el={fc.element} /> · {ROLES[fc.role].label}
                <div style={{ marginTop: 4 }}>Ganhou o 50/50 → <b style={{ color: headColor }}>{fc.name}</b></div>
                <div>Perdeu o 50/50 → um do pool padrão (abaixo)</div>
              </div>
            </div>
          </>}

          {isStd && <>
            <div style={{ ...ORB, fontSize: 20, fontWeight: 800, margin: "4px 0 10px" }}>Pool Padrão <Rarity n={5} /></div>
            <PoolRow ids={STANDARD_5} ownedSet={ownedSet} />
            <div style={{ fontSize: 12, color: C.mute, marginTop: 8 }}>Sem rate-up: todo 5★ vem deste pool. É aqui que você farma os 3 padrão direto.</div>
          </>}

          {isWeapon && <>
            <div className="flex items-center gap-2" style={{ margin: "4px 0 12px" }}>
              <button onClick={() => cycleWeapon(-1)} style={arrow}>‹</button>
              <div style={{ ...ORB, fontSize: 20, fontWeight: 800, flex: 1, textAlign: "center" }}>{fw.name} <Rarity n={5} /></div>
              <button onClick={() => cycleWeapon(1)} style={arrow}>›</button>
            </div>
            <div className="flex items-center gap-4">
              <WeaponIcon w={fw} size={70} />
              <div style={{ fontSize: 13, color: C.mute }}>{fw.passive}<div style={{ marginTop: 6 }}>Sem 50/50 — todo 5★ é <b style={{ color: headColor }}>{fw.name}</b>.</div></div>
            </div>
          </>}

          <div style={{ marginTop: 12 }}>
            <div style={{ fontSize: 12, color: C.mute }}>Garantia: 5★ em até 90 · sem 5★ há <b style={{ color: C.gold }}>{curPity}</b>/90{isChar && pity.guaranteeChar ? " · próximo 5★ é o destaque garantido!" : ""}</div>
            <Bar value={curPity} max={90} color={C.gold} />
          </div>
          <div className="flex gap-2 mt-4">
            <Btn onClick={() => doPull(tab, 1)}>Invocar x1</Btn>
            <Btn kind="soft" onClick={() => doPull(tab, 10)}>Invocar x10</Btn>
          </div>
          <div style={{ fontSize: 11, color: C.mute, marginTop: 8 }}>Bilhete {ticketIcon} ou 160💎 por puxada · você tem <b style={{ color: C.text }}>{ticketCount}</b> {ticketIcon}, <b style={{ color: C.text }}>{jade}</b>💎 e <b style={{ color: C.text }}>{chronicles}</b>📜</div>
        </div>
      </Panel>

      {isChar && <Panel><b>Pool padrão (perdeu o 50/50)</b><div style={{ marginTop: 8 }}><PoolRow ids={STANDARD_5} ownedSet={ownedSet} /></div></Panel>}

      <Panel>
        <b>Taxas</b>
        <div style={{ fontSize: 13, color: C.mute, marginTop: 6, lineHeight: 1.7 }}>
          5★: 0,6% (sobe a partir da 74ª, garantido na 90ª) · 4★: 5,1% · resto vira Crônicas (+1📜).
          {isChar ? " Evento: 50/50 com garantia — perdeu, o próximo 5★ é o destaque. Use ‹ › para escolher qual limitado fica em destaque." : isStd ? " Permanente: sem 50/50, sai do pool padrão." : " Armas: sem 50/50. Use ‹ › para escolher a arma em destaque."}
        </div>
      </Panel>

      {pullHistory && pullHistory.length > 0 && <Panel>
        <b>Últimos 5★</b>
        <div className="flex flex-col gap-1 mt-2" style={{ maxHeight: 180, overflowY: "auto" }}>
          {pullHistory.map((f, i) => <div key={i} className="flex items-center justify-between" style={{ fontSize: 12 }}>
            <span><Glow color={C.gold}>★</Glow> {f.name}</span><span style={{ color: C.mute }}>{f.banner}</span>
          </div>)}
        </div>
      </Panel>}
    </div>
  );
}
function PoolRow({ ids, ownedSet }) {
  return <div className="flex gap-3" style={{ flexWrap: "wrap" }}>{ids.map((id) => { const c = CHAR_MAP[id]; return (
    <div key={id} style={{ textAlign: "center", width: 66 }}>
      <Avatar ch={c} size={48} />
      <div style={{ fontSize: 10, color: C.mute, marginTop: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{c.name}</div>
      <div style={{ fontSize: 9, color: ownedSet.has(id) ? C.good : C.dim }}>{ownedSet.has(id) ? "no elenco" : ROLES[c.role].label}</div>
    </div>); })}</div>;
}

function PullModal({ data, onClose }) {
  const has5 = data.results.some((r) => r.rarity === 5);
  const has4 = data.results.some((r) => r.rarity === 4 && r.id !== "shard");
  const limited5 = data.results.find((r) => r.rarity === 5 && !r.weapon && (r.won === true || LIMITED_5.includes(r.id)));
  const star5Weapon = data.results.find((r) => r.rarity === 5 && r.weapon);
  const featured = !!limited5;
  const [phase, setPhase] = useState(has5 ? "warp" : "reveal");
  useEffect(() => { if (phase === "warp") { const t = setTimeout(() => setPhase("reveal"), featured ? 2100 : 1700); return () => clearTimeout(t); } }, [phase]); // eslint-disable-line
  const top = has5 ? C.gold : has4 ? "#B98BFF" : "#6d8fb8";
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 90, background: "#000", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }} onClick={() => phase === "warp" && setPhase("reveal")}>
      <style>{`
        @keyframes srPop{from{transform:scale(.35);opacity:0}to{transform:scale(1);opacity:1}}
        @keyframes srRay{to{transform:rotate(360deg)}}
        @keyframes srRing{0%{transform:scale(.2);opacity:0}40%{opacity:.9}100%{transform:scale(2.6);opacity:0}}
        @keyframes srCore{0%,100%{transform:scale(1);opacity:.85}50%{transform:scale(1.25);opacity:1}}
        @keyframes srStreak{0%{transform:translate(-50%,-50%) rotate(var(--a)) translateY(0);opacity:0}30%{opacity:1}100%{transform:translate(-50%,-50%) rotate(var(--a)) translateY(-60vh);opacity:0}}
        @keyframes srShine{to{background-position:200% center}}
        @keyframes srHero{0%{transform:scale(.5) translateY(20px);opacity:0;filter:blur(8px)}60%{opacity:1;filter:blur(0)}100%{transform:scale(1) translateY(0);opacity:1}}
        @keyframes srHalo{0%,100%{box-shadow:0 0 40px #ffcf4a,0 0 90px #ff7adf66}50%{box-shadow:0 0 70px #ffe08a,0 0 140px #7adfff66}}
        @keyframes srBadge{0%{transform:translateY(8px);opacity:0}100%{transform:translateY(0);opacity:1}}
      `}</style>
      {phase === "warp" ? (
        <div style={{ position: "fixed", inset: 0, overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center" }}>
          {Array.from({ length: featured ? 28 : 16 }).map((_, i) => { const n = featured ? 28 : 16; const col = featured ? `hsl(${(i / n) * 360},90%,65%)` : top; return (
            <div key={i} style={{ position: "absolute", left: "50%", top: "50%", width: 3, height: "55vh", background: `linear-gradient(${col}, transparent)`, transformOrigin: "center bottom", "--a": `${i * (360 / n)}deg`, animation: `srStreak ${featured ? 2 : 1.6}s ${i * 0.03}s ease-out forwards` }} />); })}
          {featured && <div style={{ position: "absolute", width: 420, height: 420, borderRadius: "50%", border: "2px solid #ff7adf", animation: "srRing 2s .2s ease-out forwards" }} />}
          <div style={{ position: "absolute", width: 300, height: 300, borderRadius: "50%", border: `2px solid ${top}`, animation: "srRing 1.6s ease-out forwards" }} />
          <div style={{ width: 120, height: 120, borderRadius: "50%", background: `radial-gradient(circle, ${top}, ${top}55 50%, transparent 72%)`, boxShadow: `0 0 80px ${top}`, animation: "srCore 1.6s ease-in-out infinite" }} />
          <div style={{ position: "absolute", bottom: 30, color: featured ? C.gold : C.mute, fontSize: 12, fontWeight: featured ? 800 : 400, letterSpacing: featured ? 2 : 0 }}>{featured ? "✦ RESSONÂNCIA LIMITADA ✦" : "toque para revelar"}</div>
        </div>
      ) : (
        <div onClick={(e) => e.stopPropagation()} style={{ maxWidth: 760, width: "100%" }}>
          {(limited5 || star5Weapon) && (() => { const r = limited5 || star5Weapon; const isW = !!r.weapon; const obj = isW ? WEAPON_MAP[r.id] : CHAR_MAP[r.id]; return (
            <div style={{ textAlign: "center", marginBottom: 14, animation: "srHero .8s both" }}>
              <div style={{ display: "inline-block", padding: 6, animation: "srHalo 2.4s ease-in-out infinite", borderRadius: "50%" }}>
                {isW ? <WeaponIcon w={obj} size={92} /> : <Avatar ch={obj} size={92} ring={C.gold} />}
              </div>
              <div style={{ marginTop: 10, ...ORB, fontWeight: 800, fontSize: 22, background: "linear-gradient(90deg,#ffcf4a,#ff7adf,#7adfff,#ffcf4a)", backgroundSize: "200% auto", WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent", animation: "srShine 3s linear infinite" }}>{obj.name}</div>
              <div style={{ animation: "srBadge .6s .3s both", marginTop: 4, fontSize: 12, fontWeight: 800, letterSpacing: 2, color: C.gold }}>{isW && !limited5 ? "ARMA LENDÁRIA ★5" : r.won ? "VITÓRIA NO 50/50 · ★5 LIMITADO" : "★5 LIMITADO OBTIDO"}{r.dup ? " · CONSTELAÇÃO +1" : ""}</div>
            </div>); })()}
          <div className="grid grid-cols-5 gap-2" style={{ marginBottom: 16 }}>
            {data.results.map((r, i) => {
              const isShard = r.id === "shard";
              const isWeapon = !!r.weapon;
              const color = r.rarity === 5 ? C.gold : r.rarity === 4 ? "#B98BFF" : "#6d8fb8";
              return (
                <div key={i} style={{ animation: `srPop .45s ${i * 0.05}s both`, position: "relative", background: C.panel, border: `2px solid ${color}`, borderRadius: 12, padding: 8, textAlign: "center", boxShadow: `0 0 18px ${color}55`, overflow: "hidden" }}>
                  {r.rarity === 5 && <div style={{ position: "absolute", inset: -40, background: `repeating-conic-gradient(${color}33 0deg 12deg, transparent 12deg 24deg)`, animation: "srRay 8s linear infinite" }} />}
                  <div style={{ position: "relative" }}>
                    <div style={{ height: 34, display: "flex", alignItems: "center", justifyContent: "center" }}>
                      {isShard ? <ItemIcon id="item_chronicles" emoji="📜" size={26} /> : isWeapon ? <WeaponIcon w={WEAPON_MAP[r.id]} size={30} /> : <Avatar ch={CHAR_MAP[r.id]} size={30} />}
                    </div>
                    <div style={{ fontSize: 11, fontWeight: 700, color }}>{r.rarity >= 4 ? "★".repeat(r.rarity) : "✦"}{r.dup ? " E+1" : ""}</div>
                    <div style={{ fontSize: 9, color: C.mute, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{r.name}</div>
                    {r.rarity === 5 && r.won === false && <div style={{ fontSize: 8, color: C.bad }}>perdeu 50/50</div>}
                  </div>
                </div>
              );
            })}
          </div>
          <div className="flex justify-center"><Btn onClick={onClose}>Confirmar</Btn></div>
        </div>
      )}
    </div>
  );
}

/* ==========================================================================
   ELENCO + DETALHE
   ========================================================================== */
function Roster({ owned, ownedWeapons, relicInv, setOwnedField, levelUp, ascendChar, ascMats, jade, isAdmin, expItems, bossMats, traceLevelUp, unlockTraceNode, unlockSpecialTrace, publish, onUpgradeRelic, weaponLevelUp, weaponMats, skillMats, tagMats }) {
  const [sel, setSel] = useState(null);
  if (!owned.length) return <Empty msg="Sem personagens. Invoque no banner!" />;
  if (sel) { const o = owned.find((x) => x.id === sel); if (!o) { setSel(null); return null; } return <CharDetail o={o} back={() => setSel(null)} ownedWeapons={ownedWeapons} relicInv={relicInv} setOwnedField={setOwnedField} levelUp={levelUp} ascendChar={ascendChar} ascMats={ascMats} jade={jade} isAdmin={isAdmin} expItems={expItems} bossMats={bossMats} traceLevelUp={traceLevelUp} unlockTraceNode={unlockTraceNode} unlockSpecialTrace={unlockSpecialTrace} publish={publish} onUpgradeRelic={onUpgradeRelic} weaponLevelUp={weaponLevelUp} weaponMats={weaponMats} skillMats={skillMats} tagMats={tagMats} />; }
  return (
    <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fill,minmax(150px,1fr))" }}>
      {owned.map((o) => {
        const def = CHAR_MAP[o.id]; if (!def) return null; const el = ELEMENTS[def.element];
        return <button key={o.id} onClick={() => setSel(o.id)} className="text-left active:scale-95 transition">
          <Panel glow={def.rarity === 5 ? C.gold : null} style={{ padding: 12 }}>
            <div className="flex items-center gap-2"><Avatar ch={def} size={48} /><div style={{ overflow: "hidden" }}><div style={{ fontWeight: 800, fontSize: 14, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{def.name}</div><Rarity n={def.rarity} /></div></div>
            <div className="flex items-center justify-between mt-2" style={{ fontSize: 11, color: C.mute }}><span>Nv {o.level}</span><span style={{ color: el.color }}>{el.glyph}</span>{o.eidolon > 0 && <span style={{ color: C.gold }}>E{o.eidolon}</span>}</div>
          </Panel>
        </button>;
      })}
    </div>
  );
}

function CharDetail({ o, back, ownedWeapons, relicInv, setOwnedField, levelUp, ascendChar, ascMats, jade, isAdmin, expItems, bossMats, traceLevelUp, unlockTraceNode, unlockSpecialTrace, publish, onUpgradeRelic, weaponLevelUp, weaponMats, skillMats, tagMats }) {
  const def = CHAR_MAP[o.id]; const [tab, setTab] = useState("status");
  const oc = normChar(o);
  const stats = computeStats(o); const el = ELEMENTS[def.element]; const nodes = constellationNodes(def);
  const pass = passiveOf(def); const sts = specialTraces(def);
  const invWeapons = [...new Set(ownedWeapons)].map((id) => WEAPON_MAP[id]).filter(Boolean);
  const needExp = expToLevel(o.level);
  const asc = o.asc || 0; const cap = levelCap(asc);
  const atCap = o.level >= cap && asc < ASC_GATES.length;
  const ascCost = asc < ASC_COST.length ? ASC_COST[asc] : 0;
  return (
    <div className="flex flex-col gap-4">
      <button onClick={back} style={{ color: C.mute, fontSize: 13, textAlign: "left" }}>‹ voltar ao elenco</button>
      <Panel glow={el.color}>
        <div className="flex items-center gap-4">
          <Avatar ch={def} size={76} />
          <div style={{ flex: 1 }}>
            <div style={{ ...ORB, fontSize: 22, fontWeight: 800 }}>{def.name}</div>
            <div style={{ fontSize: 12, color: C.mute }}>{def.title}</div>
            <div style={{ fontSize: 13 }}><ElTag el={def.element} /> · {ROLES[def.role].label} · <Rarity n={def.rarity} /></div>
          </div>
        </div>
        {def.tags && def.tags.length > 0 && <div className="flex gap-1 flex-wrap" style={{ marginTop: 8 }}>{def.tags.map((t) => <span key={t} style={{ fontSize: 10, fontWeight: 700, color: el.color, background: `${el.color}1e`, border: `1px solid ${el.color}55`, borderRadius: 99, padding: "2px 8px" }}>{t}</span>)}</div>}
        <div style={{ marginTop: 10, background: `${el.color}14`, border: `1px solid ${el.color}44`, borderRadius: 10, padding: "8px 10px" }}>
          <div style={{ fontSize: 12, fontWeight: 800, color: el.color }}>✦ Passiva — {pass.name}</div>
          <div style={{ fontSize: 12, color: C.mute, marginTop: 2, lineHeight: 1.5 }}>{pass.desc}</div>
        </div>
        <div className="flex items-center gap-2 mt-3" style={{ flexWrap: "wrap" }}>
          <span style={{ fontSize: 13 }}>Nível {o.level}/{cap}{cap < MAX_LEVEL ? ` (máx ${MAX_LEVEL})` : ""}</span>
          {atCap
            ? <Btn kind="primary" style={{ padding: "6px 12px" }} onClick={() => ascendChar(o.id)}>Ascender {isAdmin ? "(admin)" : <span className="flex items-center gap-1">(<ItemIcon id="item_asc_mat" emoji="🔶" size={13} />{ascCost})</span>}</Btn>
            : <Btn kind="soft" style={{ padding: "6px 12px" }} onClick={() => levelUp(o.id)}>Subir nível {isAdmin ? "(admin)" : <span className="flex items-center gap-1">(<ItemIcon id="item_exp" emoji="📘" size={13} />{needExp})</span>}</Btn>}
          <Btn kind="ghost" style={{ padding: "6px 12px", marginLeft: "auto" }} onClick={() => publish(o)}>Publicar p/ Co-op</Btn>
        </div>
        {atCap && <div className="flex items-center gap-1 flex-wrap" style={{ fontSize: 11, color: "#ffb86b", marginTop: 6 }}>Limite de nível atingido — derrote o Guardião da Ascensão (aba Boss) para conseguir <ItemIcon id="item_asc_mat" emoji="🔶" size={11} /> Núcleos de Ascensão. Você tem {ascMats}.</div>}
      </Panel>
      <div className="flex gap-2" style={{ flexWrap: "wrap" }}>
        <TabBtn active={tab === "status"} onClick={() => setTab("status")}>Status</TabBtn>
        <TabBtn active={tab === "trace"} onClick={() => setTab("trace")}>Rastros</TabBtn>
        <TabBtn active={tab === "const"} onClick={() => setTab("const")}>Constelação</TabBtn>
        <TabBtn active={tab === "weapon"} onClick={() => setTab("weapon")}>Arma</TabBtn>
        <TabBtn active={tab === "relics"} onClick={() => setTab("relics")}>Relíquias</TabBtn>
      </div>
      {tab === "status" && <Panel>
        <div className="grid grid-cols-2 gap-2" style={{ fontSize: 14 }}>
          <St k="HP" v={Math.round(stats.hp)} /><St k="ATK" v={Math.round(stats.atk)} /><St k="DEF" v={Math.round(stats.def)} /><St k="VEL" v={Math.round(stats.spd)} />
          <St k="CRIT" v={stats.critRate.toFixed(1) + "%"} /><St k="CRIT DMG" v={stats.critDmg.toFixed(1) + "%"} /><St k="Bônus de Dano" v={stats.dmgBonus.toFixed(1) + "%"} /><St k="Cura/Escudo" v={stats.healBonus.toFixed(1) + "%"} />
          <St k="Regen de Energia" v={(stats.energyRegen || 0).toFixed(1) + "%"} /><St k="Perfuração" v={(stats.defPen || 0).toFixed(1) + "%"} /><St k="Dano de DoT" v={(stats.dotDmg || 0).toFixed(1) + "%"} /><St k="Energia Máx" v={stats.energyMax} />
        </div>
        {Object.entries(stats.elem || {}).some(([, v]) => v > 0) && <div style={{ fontSize: 11, color: C.mute, marginTop: 8 }}>Dano elemental: {Object.entries(stats.elem).filter(([, v]) => v > 0).map(([k, v]) => `${k} +${v.toFixed(1)}%`).join(" · ")}</div>}
        <div style={{ borderTop: `1px solid ${C.line}`, marginTop: 12, paddingTop: 12 }}><b style={{ fontSize: 13 }}>Habilidades</b><SkillList def={def} stats={stats} /></div>
      </Panel>}
      {tab === "trace" && <Panel>
        <p style={{ fontSize: 13, color: C.mute, marginBottom: 10 }}>Rastros: subir Básico/Habilidade/Ultimate gasta 💠 Cristais de Habilidade (Dungeons de Tag). Os Nós de Atributo gastam 1 🔮 Núcleo + o material da Dungeon da tag do personagem. Os 3 Rastros Especiais usam 🔮 Núcleos de Vestígio (Boss Semanal).</p>
        <b style={{ fontSize: 13 }}>Níveis de Habilidade</b>
        <div className="flex flex-col gap-2 mt-2">
          {[["basic", "Ataque Básico", skillNamesOf(def.id)[0]], ["skill", "Habilidade", skillNamesOf(def.id)[1]], ["ult", "Ultimate", skillNamesOf(def.id)[2]]].map(([key, lbl, nm]) => { const lvl = oc.traces[key] || 1; const max = lvl >= TRACE_MAX; return (
            <div key={key} className="flex items-center justify-between" style={{ background: C.panelHi, borderRadius: 10, padding: "8px 10px" }}>
              <div><div style={{ fontWeight: 700, fontSize: 13 }}>{lbl} <span style={{ color: C.mute, fontWeight: 400 }}>· {nm}</span></div><div style={{ fontSize: 11, color: C.mute }}>Nv {lvl}/{TRACE_MAX} · dano +{Math.round((traceMul(lvl) - 1) * 100)}%</div></div>
              <Btn kind={max ? "ghost" : "soft"} disabled={max} style={{ padding: "5px 10px" }} onClick={() => traceLevelUp(o.id, key)}>{max ? "MÁX" : isAdmin ? "Subir" : (<span className="flex items-center gap-1 flex-wrap" style={{ justifyContent: "center" }}><span className="flex items-center gap-1"><ItemIcon id="item_skill_mat" emoji="💠" size={13} />{1 + Math.floor(lvl / 3)}</span>{lvl >= 5 && <span className="flex items-center gap-1">+<ItemIcon id="item_boss_mat" emoji="🔮" size={13} />1</span>}</span>)}</Btn>
            </div>); })}
        </div>
        <b style={{ fontSize: 13, display: "block", marginTop: 12 }}>Nós de Atributo</b>
        <div className="grid grid-cols-2 gap-2 mt-2">
          {traceNodesOf(def).map((n, i) => {
            const on = oc.traceNodes[i];
            const tag = primaryTag(def);
            const bossHave = bossMats;
            const tagHave = tagMats[tag] || 0;
            const canAfford = isAdmin || (bossHave >= 1 && tagHave >= 1);
            return (
            <button key={i} disabled={on || (!isAdmin && !canAfford)} onClick={() => unlockTraceNode(o.id, i)} className="text-left" style={{ background: on ? `${el.color}22` : C.panelHi, border: `1px solid ${on ? el.color : !isAdmin && !canAfford ? C.bad : C.line}`, borderRadius: 10, padding: "8px 10px", opacity: on ? 1 : canAfford ? 0.92 : 0.65 }}>
              <div style={{ fontWeight: 700, fontSize: 12 }}>{n.label} {on && <Glow color={C.good}>✓</Glow>}</div>
              <div style={{ fontSize: 11, color: C.mute }}>
                {on ? "ativo" : isAdmin ? "ativar" : (
                  <span className="flex items-center gap-1 flex-wrap">
                    <span className="flex items-center gap-1"><ItemIcon id="item_boss_mat" emoji="🔮" size={11} /><span style={{ color: bossHave >= 1 ? C.text : C.bad, fontWeight: 700 }}>{bossHave}/1</span></span>
                    <span>·</span>
                    <span style={{ color: tagHave >= 1 ? C.text : C.bad, fontWeight: 700 }}>🗝️{tag} {tagHave}/1</span>
                  </span>
                )}
              </div>
            </button>); })}
        </div>
        <b style={{ fontSize: 13, display: "block", marginTop: 12 }}>Rastros Especiais <span className="flex items-center gap-1" style={{ color: C.gold, display: "inline-flex", fontWeight: 400 }}>(<ItemIcon id="item_boss_mat" emoji="🔮" size={13} /> {bossMats})</span></b>
        <div className="flex flex-col gap-2 mt-2">
          {sts.map((st, i) => { const on = oc.specialTraces[i]; return (
            <div key={i} className="flex items-center justify-between gap-2" style={{ background: on ? `${C.gold}16` : C.panelHi, border: `1px solid ${on ? C.gold : C.line}`, borderRadius: 10, padding: "8px 10px" }}>
              <div style={{ minWidth: 0 }}><div style={{ fontWeight: 700, fontSize: 13, color: on ? C.gold : C.text }}>{st.name} {on && <Glow color={C.good}>✓</Glow>}</div><div style={{ fontSize: 11, color: C.mute }}>{st.desc}</div></div>
              <Btn kind={on ? "ghost" : "primary"} disabled={on} style={{ padding: "5px 10px", whiteSpace: "nowrap" }} onClick={() => unlockSpecialTrace(o.id, i)}>{on ? "ativo" : <span className="flex items-center gap-1"><ItemIcon id="item_boss_mat" emoji="🔮" size={13} />{st.cost}</span>}</Btn>
            </div>); })}
        </div>
      </Panel>}
      {tab === "const" && <Panel>
        <p style={{ fontSize: 13, color: C.mute, marginBottom: 12 }}>Corrente de Ressonância — desbloqueia com duplicatas. Cada nó muda o kit de forma única e tem efeito real em combate.</p>
        <div className="flex flex-col gap-2">
          {nodes.map((n, i) => { const u = i < (o.eidolon || 0); return (
            <div key={i} className="flex items-center gap-3" style={{ opacity: u ? 1 : 0.45 }}>
              <div style={{ width: 36, height: 36, borderRadius: 99, border: `2px solid ${u ? el.color : C.line}`, background: u ? `${el.color}22` : "transparent", display: "flex", alignItems: "center", justifyContent: "center", color: u ? el.color : C.mute, fontWeight: 800, flexShrink: 0 }}>{i + 1}</div>
              <div><div style={{ fontWeight: 700, fontSize: 14 }}>{n.name} {u && <Glow color={C.good}>✓</Glow>}</div><div style={{ fontSize: 12, color: C.mute }}>{n.desc}</div></div>
            </div>); })}
        </div>
        <div style={{ marginTop: 12, fontSize: 12, color: C.mute }}>Nós ativos: <b style={{ color: C.gold }}>{o.eidolon || 0}/6</b></div>
      </Panel>}
      {tab === "weapon" && <Panel>
        <div className="flex items-center justify-between mb-2"><b>Arma equipada</b>{o.weapon && <Btn kind="danger" style={{ padding: "4px 10px" }} onClick={() => setOwnedField(o.id, { weapon: null })}>Remover</Btn>}</div>
        {o.weapon ? <>
          <WeaponRow w={WEAPON_MAP[o.weapon]} active />
          <div className="flex items-center justify-between mt-2" style={{ background: C.panelHi, border: `1px solid ${C.line}`, borderRadius: 10, padding: "8px 10px" }}>
            <div><div style={{ fontSize: 12, fontWeight: 700 }}>Nível da Arma: <span style={{ color: C.gold }}>{o.weaponLv || 1}/{WEAPON_MAX_LEVEL}</span></div>
              {(o.weaponLv || 1) < WEAPON_MAX_LEVEL ? <div className="flex items-center gap-1" style={{ fontSize: 10, color: C.mute }}>Custa <ItemIcon id="item_wpn_mat" emoji="⚙️" size={10} />{weaponCost(o.weaponLv || 1).wmat} · <ItemIcon id="item_exp" emoji="📘" size={10} />{weaponCost(o.weaponLv || 1).exp}</div> : <div style={{ fontSize: 10, color: C.gold }}>nível máximo</div>}</div>
            <Btn kind={(o.weaponLv || 1) >= WEAPON_MAX_LEVEL ? "ghost" : "primary"} disabled={(o.weaponLv || 1) >= WEAPON_MAX_LEVEL} style={{ padding: "5px 12px", whiteSpace: "nowrap" }} onClick={() => weaponLevelUp(o.id)}>{(o.weaponLv || 1) >= WEAPON_MAX_LEVEL ? "MÁX" : isAdmin ? "Subir" : "⬆ Subir"}</Btn>
          </div>
          <div className="flex items-center gap-1" style={{ fontSize: 10, color: C.mute, marginTop: 4 }}><ItemIcon id="item_wpn_mat" emoji="⚙️" size={10} /> Engrenagens de Arma: <b style={{ color: C.gold }}>{weaponMats}</b> · ganhe nas Dungeons de Tag.</div>
        </> : <div style={{ color: C.mute, fontSize: 13 }}>Nenhuma.</div>}
        <div style={{ borderTop: `1px solid ${C.line}`, margin: "12px 0", paddingTop: 12 }}>
          <b style={{ fontSize: 13 }}>Inventário {invWeapons.length === 0 && "(vazio — invoque armas)"}</b>
          <div className="flex flex-col gap-2 mt-2">{invWeapons.map((w) => <button key={w.id} onClick={() => setOwnedField(o.id, { weapon: w.id })} className="text-left active:scale-95"><WeaponRow w={w} match={w.role === def.role} /></button>)}</div>
        </div>
      </Panel>}
      {tab === "relics" && <RelicEquip o={o} setOwnedField={setOwnedField} relicInv={relicInv} onUpgradeRelic={onUpgradeRelic} />}
    </div>
  );
}
function St({ k, v }) { return <div className="flex justify-between" style={{ background: C.panelHi, padding: "8px 10px", borderRadius: 10 }}><span style={{ color: C.mute }}>{k}</span><b>{v}</b></div>; }
function buffText(b) { const p = []; for (const k of ["atk", "def", "spd", "critRate", "critDmg", "dmgBonus"]) if (b[k]) p.push(`+${b[k]}${k === "spd" ? " VEL" : "% " + (STAT_LABEL[k] || k)}`); return `${p.join(", ")}${b.all ? " (time)" : ""} por ${b.turns}t`; }
function SkillList({ def, stats }) {
  const s = def.skill || {}, nm = skillNamesOf(def.id);
  const atk = stats ? Math.round(stats.atk) : null;
  const gold = C.gold;
  function hl(html) { return html.replace(/<b>(.*?)<\/b>/g, `<b style="color:${gold};font-weight:600">$1</b>`); }
  function buildLines(kind) {
    const L = [];
    if (kind === "basic") {
      const mul = s.basicMul || 100;
      L.push(`Dano: <b>${mul}% de ATK</b>`);
      if (atk) L.push(`≈ <b>${Math.round(atk * mul / 100)}</b> de dano (sem crítico)`);
      L.push(`Ganha <b>+1 Ponto de Habilidade</b>`);
    } else if (kind === "skill") {
      L.push(`Custo: <b>1 Ponto de Habilidade</b>`);
      if (s.skillMul) { L.push(`Dano: <b>${s.skillMul}% de ATK</b>${s.aoe ? " — Área" : ""}`); if (atk) L.push(`≈ <b>${Math.round(atk * s.skillMul / 100)}</b> de dano`); }
      if (s.skillDot) L.push(`Aplica <b>${DOT_INFO[s.skillDot.type]?.n || s.skillDot.type}</b>: <b>${s.skillDot.mul}% ATK</b>/turno por <b>${s.skillDot.turns}</b> turno${s.skillDot.turns > 1 ? "s" : ""}`);
      if (s.heal) L.push(`Cura: <b>${s.heal.mul}% de ATK</b> (+${s.heal.flat || 0} fixo)${s.heal.all ? " para todos" : ""}`);
      if (s.shield) L.push(`Escudo: <b>${s.shield.mul || s.shield.defMul}% de ATK/DEF</b> (+${s.shield.flat || 0} fixo)`);
      if (s.skillBuff) { const st = (s.skillBuff.stat || "atk").toUpperCase(); L.push(`+<b>${s.skillBuff.value}% ${st}</b> por <b>${s.skillBuff.turns}</b> turnos${s.skillBuff.all ? " (para todos)" : ""}`); }
      if (s.skillDebuff) L.push(`Reduz DEF em <b>${s.skillDebuff.defDown || 0}%</b>, +<b>${s.skillDebuff.vuln || 0}%</b> dano recebido por <b>${s.skillDebuff.turns}</b> turnos`);
      if (s.summon) L.push(`Invoca <b>${s.summon.name}</b> (${s.summon.mul}% do ATK por turno próprio)`);
      if (s.energyGift) L.push(`Dá <b>${s.energyGift}</b> de energia a um aliado`);
      if (s.taunt) L.push(`Provoca inimigos para atacar este personagem`);
      if (s.basicMul && !s.skillMul && !s.heal && !s.shield) L.push(`Dano Básico: <b>${s.basicMul}% de ATK</b>`);
    } else if (kind === "ult") {
      if (s.ultMul) { L.push(`Dano: <b>${s.ultMul}% de ATK</b>${s.ultAoe ? " — Área" : ""}`); if (atk) L.push(`≈ <b>${Math.round(atk * s.ultMul / 100)}</b> de dano`); }
      if (s.dragonStrike) L.push(`Dragão ataca por <b>${s.dragonStrike}% do ATK</b>`);
      if (s.ultDot) L.push(`Aplica <b>${DOT_INFO[s.ultDot.type]?.n || s.ultDot.type}</b>: <b>${s.ultDot.mul}% ATK</b>/turno por <b>${s.ultDot.turns}</b> turno${s.ultDot.turns > 1 ? "s" : ""}`);
      if (s.ultHeal) L.push(`Cura: <b>${s.ultHeal.mul}% de ATK</b> (+${s.ultHeal.flat || 0} fixo) para todos`);
      if (s.ultShield) L.push(`Escudo para todos: <b>${s.ultShield.mul || s.ultShield.defMul}%</b> (+${s.ultShield.flat || 0} fixo)`);
      if (s.ultBuff) { const st = (s.ultBuff.stat || "atk").toUpperCase(); L.push(`+<b>${s.ultBuff.value}% ${st}</b> por <b>${s.ultBuff.turns}</b> turnos${s.ultBuff.all ? " (para todos)" : ""}`); }
      if (s.ultDebuff) L.push(`+<b>${s.ultDebuff.vuln}%</b> dano recebido por todos os inimigos por <b>${s.ultDebuff.turns}</b> turnos`);
      if (s.kaibaUlt) L.push(`Escolha: invocar <b>Obelisco do Atormentador</b> ou <b>Dragão Definitivo</b>`);
    }
    return L;
  }
  const kindMeta = [
    { kind: "basic", badge: "Ataque Básico", name: nm[0] },
    { kind: "skill", badge: "Perícia",       name: nm[1] },
    { kind: "ult",   badge: "Ultimate",      name: nm[2] },
  ];
  return (
    <div className="flex flex-col gap-2 mt-2">
      {kindMeta.map(({ kind, badge, name }) => {
        const lines = buildLines(kind);
        return (
          <div key={kind} style={{ background: C.bg1, border: `1px solid ${C.line}`, borderRadius: 8, padding: "10px 12px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: `1px solid ${C.line}`, paddingBottom: 6, marginBottom: 8 }}>
              <span style={{ fontWeight: 700, fontSize: 13, color: "#fff" }}>{name}</span>
              <span style={{ background: C.panelHi, color: C.gold, padding: "2px 7px", borderRadius: 4, fontSize: 10, textTransform: "uppercase", letterSpacing: 1 }}>{badge}</span>
            </div>
            {lines.length === 0 && <span style={{ fontSize: 12, color: C.dim }}>—</span>}
            {lines.map((l, i) => <div key={i} style={{ fontSize: 12, color: C.mute, lineHeight: 1.75 }} dangerouslySetInnerHTML={{ __html: hl(l) }} />)}
          </div>
        );
      })}
    </div>
  );
}
function WeaponRow({ w, active, match }) {
  return <div style={{ background: active ? C.panelHi : C.panel, border: `1px solid ${active ? C.gold : C.line}`, borderRadius: 12, padding: 10 }}>
    <div className="flex items-center gap-2"><WeaponIcon w={w} size={36} /><div style={{ flex: 1 }}><div className="flex items-center justify-between"><b style={{ fontSize: 14 }}>{w.name}</b><Rarity n={w.rarity} /></div><div style={{ fontSize: 11, color: C.mute }}>{ROLES[w.role]?.label} {match && <Glow color={C.good}>· combina!</Glow>}</div></div></div>
    <div style={{ fontSize: 12, color: C.mute, marginTop: 6 }}>{w.passive}</div>
  </div>;
}
function RelicEquip({ o, setOwnedField, relicInv, onUpgradeRelic }) {
  const oc = normChar(o);
  const [pickSlot, setPickSlot] = useState(null);
  const setR = (slot, relic) => { const r = [...oc.relics]; r[slot] = relic; setOwnedField(o.id, { relics: r }); };
  return <Panel>
    <b>Relíquias · 6 slots</b>
    <p style={{ fontSize: 11, color: C.mute, marginTop: 2 }}>Corpo aceita DANO/CRIT como principal. Esfera aceita Dano Elemental (de qualquer elemento) ou Regen de Energia. Corda aceita Regen de Energia ou Perfuração.</p>
    <div className="grid grid-cols-2 gap-2 mt-2">
      {RELIC_SLOTS.map((sl) => { const r = oc.relics[sl.i]; const active = pickSlot === sl.i; return (
        <button key={sl.i} onClick={() => setPickSlot(active ? null : sl.i)} className="text-left" style={{ background: active ? C.panel : C.panelHi, border: `1px solid ${active ? C.gold : r ? relicSetData(r.set).color : C.line}`, borderRadius: 12, padding: 10, minHeight: 70 }}>
          <div style={{ fontSize: 11, color: C.mute }}>{sl.i + 1}. {sl.name}</div>
          {r ? <><div style={{ fontSize: 12, fontWeight: 700, color: relicSetData(r.set).color, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{r.set} <span style={{ color: C.mute, fontWeight: 600 }}>+{r.level || 0}</span></div><div style={{ fontSize: 12 }}>{relicMainText(r)}</div><div style={{ fontSize: 10, color: C.mute, lineHeight: 1.35 }}>{(r.subs || []).map((s) => `${relicSubLabel(s)} +${s.value.toFixed(1)}`).join(" · ")}</div></> : <div style={{ color: C.mute, fontSize: 12 }}>vazio · toque p/ equipar</div>}
        </button>); })}
    </div>
    {pickSlot != null && (() => { const opts = relicInv.filter((r) => r.slot === pickSlot); return (
      <div style={{ borderTop: `1px solid ${C.line}`, margin: "12px 0 0", paddingTop: 12 }}>
        <div className="flex items-center justify-between"><b style={{ fontSize: 13 }}>Equipar em {RELIC_SLOTS[pickSlot].name}</b>{oc.relics[pickSlot] && <button onClick={() => { setR(pickSlot, null); }} style={{ color: C.bad, fontSize: 12 }}>remover atual</button>}</div>
        {opts.length === 0 ? <div style={{ color: C.mute, fontSize: 12, marginTop: 8 }}>Nenhuma relíquia deste slot. Farme no Co-op.</div> :
          <div className="grid grid-cols-2 gap-2 mt-2" style={{ maxHeight: 260, overflowY: "auto" }}>
            {opts.map((r) => <button key={r.id} onClick={() => { setR(pickSlot, r); setPickSlot(null); }} className="text-left" style={{ background: C.panel, border: `1px solid ${relicSetData(r.set).color}55`, borderRadius: 10, padding: 8 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: relicSetData(r.set).color }}>{r.set} <span style={{ color: C.mute }}>+{r.level || 0}</span></div>
              <div style={{ fontSize: 12 }}>{relicMainText(r)}</div>
              <div style={{ fontSize: 10, color: C.mute, lineHeight: 1.35 }}>{(r.subs || []).map((s) => `${relicSubLabel(s)} +${s.value.toFixed(1)}`).join(" · ")}</div>
              {onUpgradeRelic && r.level < 15 && <div onClick={(e) => { e.stopPropagation(); onUpgradeRelic(r.id); }} className="flex items-center gap-1" style={{ marginTop: 4, fontSize: 11, color: C.gold, fontWeight: 700 }}>⬆ Subir +3 (<ItemIcon id="item_exp" emoji="📘" size={11} /> Lágrimas)</div>}
            </button>)}
          </div>}
      </div>); })()}
  </Panel>;
}

/* ==========================================================================
   EQUIPE
   ========================================================================== */
function TeamScreen({ owned, team, setTeam, startTest, flash }) {
  const toggle = (id) => setTeam((t) => t.includes(id) ? t.filter((x) => x !== id) : t.length < 4 ? [...t, id] : t);
  return (
    <div className="flex flex-col gap-4">
      <Panel glow={C.gold}>
        <b>Equipe ({team.length}/4)</b>
        <div className="flex gap-2 mt-2">{[0, 1, 2, 3].map((i) => { const id = team[i], def = id && CHAR_MAP[id]; return (
          <div key={i} style={{ flex: 1, border: `1px dashed ${C.line}`, borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", minHeight: 70 }}>
            {def ? <div style={{ textAlign: "center" }}><div style={{ fontSize: 24 }}>{def.avatar}</div><div style={{ fontSize: 10, color: ELEMENTS[def.element].color }}>{ROLES[def.role].label}</div></div> : <span style={{ color: C.mute, fontSize: 12 }}>vazio</span>}
          </div>); })}</div>
        <div className="flex gap-2 mt-3"><Btn disabled={!team.length} onClick={() => team.length ? startTest() : flash("Monte uma equipe", C.bad)}>Batalha de teste ⚔️</Btn><Btn kind="soft" onClick={() => setTeam([])}>Limpar</Btn></div>
        <div style={{ fontSize: 12, color: C.mute, marginTop: 8 }}>Dica: 1-2 DPS + suportes. Coloque o Kaiba pra invocar o dragão em combate.</div>
      </Panel>
      <div className="grid gap-2" style={{ gridTemplateColumns: "repeat(auto-fill,minmax(150px,1fr))" }}>
        {owned.map((o) => { const def = CHAR_MAP[o.id]; if (!def) return null; const active = team.includes(o.id); return (
          <button key={o.id} onClick={() => toggle(o.id)} className="text-left active:scale-95">
            <Panel style={{ padding: 10, border: `1px solid ${active ? C.gold : C.line}` }} glow={active ? C.gold : null}>
              <div className="flex items-center gap-2"><Avatar ch={def} size={40} ring={active ? C.gold : null} /><div style={{ overflow: "hidden" }}><div style={{ fontWeight: 700, fontSize: 13, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{def.name}</div><div style={{ fontSize: 11, color: ELEMENTS[def.element].color }}>{ROLES[def.role].label}</div></div></div>
            </Panel>
          </button>); })}
      </div>
    </div>
  );
}

/* ==========================================================================
   TORRE (70 andares = 24000)
   ========================================================================== */
function TowerBossCard({ floorNum, towerCleared, start, team, flash }) {
  const images = useImg();
  const bd = TOWER_BOSSES[floorNum];
  if (!bd) return null;
  const el = ELEMENTS[bd.element] || { color: C.line, glyph: "✦" };
  const cleared = floorNum <= towerCleared;
  const current = floorNum === towerCleared + 1;
  const locked = floorNum > towerCleared + 1;
  const imgUrl = images[bd.bossImgId];
  return (
    <Panel glow={el.color} style={{ padding: 0, overflow: "hidden", opacity: locked ? 0.6 : 1 }}>
      <div style={{ position: "relative", minHeight: 100, background: `linear-gradient(135deg, ${el.color}22, #0b0920)` }}>
        {imgUrl && <img src={imgUrl} alt={bd.name} style={{ position: "absolute", right: 0, top: 0, bottom: 0, width: "45%", objectFit: "cover", objectPosition: "center top", maskImage: "linear-gradient(to left, rgba(0,0,0,0.9), transparent)", WebkitMaskImage: "linear-gradient(to left, rgba(0,0,0,0.9), transparent)" }} />}
        <div style={{ position: "relative", padding: "12px 14px" }}>
          <div style={{ fontSize: 10, letterSpacing: 2, color: el.color, fontWeight: 700 }}>ANDAR {floorNum} · CHEFE DE TORRE</div>
          <div style={{ fontSize: 18, fontWeight: 800, marginTop: 2 }}>{bd.name}</div>
          <div style={{ fontSize: 11, color: C.mute }}>{bd.title}</div>
          <div className="flex gap-1 flex-wrap" style={{ marginTop: 6, fontSize: 10 }}>
            <span style={{ color: el.color }}>{el.glyph} {bd.element}</span>
            {bd.res?.map(r => <span key={r} style={{ color: "#9aa0b5", background: "#ffffff11", borderRadius: 6, padding: "1px 5px" }}>RES {ELEMENTS[r]?.glyph} {r}</span>)}
            {bd.weak?.map(w => <span key={w} style={{ color: "#7CFFB0", background: "#00ff8811", borderRadius: 6, padding: "1px 5px" }}>FRACO {ELEMENTS[w]?.glyph} {w}</span>)}
          </div>
          <div style={{ marginTop: 10 }}>
            {cleared ? <span style={{ color: C.good, fontWeight: 700, fontSize: 12 }}>✓ Derrotado</span> :
            <Btn disabled={locked} onClick={() => { if (!team.length) { flash("Monte uma equipe", C.bad); return; } start(floorNum); }} style={{ padding: "5px 16px", fontSize: 12 }}>
              {locked ? "🔒 Bloqueado" : "⚔️ Desafiar"}
            </Btn>}
          </div>
        </div>
      </div>
    </Panel>
  );
}
function BossRushTeamSelect({ boss, owned, defaultTeam, images, onCancel, onConfirm, flash }) {
  const [sel, setSel] = React.useState(defaultTeam || []);
  const el = (boss && ELEMENTS[boss.element]) || ELEMENTS.Holy;
  const imgUrl = boss && images && images[boss.imgKey];
  const toggle = (id) => setSel(function(t){ return t.includes(id) ? t.filter(function(x){return x!==id;}) : t.length < 4 ? [...t, id] : t; });
  if (!boss) return null;
  const diffLabel = boss.level >= 90 ? {txt:"EXTREMO",c:"#FF4444"} : boss.level >= 85 ? {txt:"DIFÍCIL",c:"#FF8C44"} : {txt:"NORMAL",c:C.good};
  return (
    <div className="flex flex-col gap-4" style={{ paddingBottom: 40 }}>
      <style dangerouslySetInnerHTML={{__html: "@keyframes brSlideIn{from{opacity:0;transform:translateY(28px)}to{opacity:1;transform:none}} @keyframes brGlow{0%,100%{box-shadow:0 0 18px " + el.color + "44}50%{box-shadow:0 0 40px " + el.color + "99,0 0 80px " + el.color + "22}}" }} />
      <div style={{ borderRadius: 18, overflow:"hidden", border:"2px solid "+el.color, animation:"brGlow 2.5s ease-in-out infinite", boxShadow:"0 8px 40px "+el.color+"22" }}>
        <div style={{ position:"relative", height:180, background:"linear-gradient(135deg,"+el.color+"44,#0b0920 60%)", display:"flex", alignItems:"center", overflow:"hidden" }}>
          {imgUrl
            ? <img src={imgUrl} alt={boss.name} style={{ position:"absolute",right:0,top:0,width:"55%",height:"100%",objectFit:"cover",objectPosition:"top",maskImage:"linear-gradient(to left,rgba(0,0,0,.9),transparent)",WebkitMaskImage:"linear-gradient(to left,rgba(0,0,0,.9),transparent)" }} />
            : <div style={{ position:"absolute",right:"8%",fontSize:88,opacity:.55,filter:"drop-shadow(0 0 28px "+el.color+")" }}>{boss.avatar}</div>}
          <div style={{ position:"relative",zIndex:2,padding:"16px 18px",flex:1 }}>
            <div style={{ display:"flex",gap:6,marginBottom:6,flexWrap:"wrap" }}>
              <span style={{ background:el.color+"33",border:"1px solid "+el.color+"88",borderRadius:8,padding:"2px 9px",fontSize:10,color:el.color,fontWeight:700 }}>{el.glyph} {boss.element}</span>
              <span style={{ background:diffLabel.c+"22",border:"1px solid "+diffLabel.c+"66",borderRadius:8,padding:"2px 9px",fontSize:10,color:diffLabel.c,fontWeight:800 }}>{diffLabel.txt}</span>
              <span style={{ background:"#00000066",borderRadius:8,padding:"2px 9px",fontSize:10,color:C.gold,fontWeight:700 }}>+400💎 Recompensa</span>
            </div>
            <div style={{ fontSize:24,fontWeight:900,color:"#fff",textShadow:"0 0 24px "+el.color }}>{boss.name}</div>
            <div style={{ fontSize:12,color:"#aaa5d5",marginTop:4,fontStyle:"italic",lineHeight:1.4,maxWidth:220 }}>{boss.lore}</div>
            <div style={{ marginTop:8,display:"flex",gap:6,flexWrap:"wrap" }}>
              <span style={{ fontSize:11,color:C.bad,fontWeight:700 }}>❤️ {boss.hp.toLocaleString("pt-BR")}</span>
              {(boss.weak||[]).map(function(e){ return React.createElement('span',{key:e,style:{background:"#00ff8818",color:"#7CFFB0",border:"1px solid #7CFFB055",borderRadius:6,padding:"1px 7px",fontSize:10,fontWeight:700}},"FRACO "+(ELEMENTS[e]&&ELEMENTS[e].glyph||e)); })}
              {(boss.res||[]).map(function(e){ return React.createElement('span',{key:e,style:{background:"#ffffff08",color:"#9aa0b5",border:"1px solid #ffffff18",borderRadius:6,padding:"1px 7px",fontSize:10}},"RES "+(ELEMENTS[e]&&ELEMENTS[e].glyph||e)); })}
            </div>
          </div>
        </div>
        <div style={{ padding:"12px 16px",background:"#0b0920ee" }}>
          <div style={{ fontSize:10,color:C.mute,fontWeight:700,letterSpacing:1,marginBottom:6 }}>MECÂNICAS</div>
          <div className="flex flex-col gap-2">
            {(boss.mechanics||[]).map(function(m,i){ return (
              <div key={i} style={{ display:"flex",gap:8,alignItems:"flex-start",background:el.color+"0e",borderRadius:8,padding:"6px 10px",border:"1px solid "+el.color+"22" }}>
                <span style={{ color:el.color,fontWeight:800,flexShrink:0 }}>⚡</span>
                <span style={{ fontSize:11,color:"#ccc5e5",lineHeight:1.5 }}>{m}</span>
              </div>
            ); })}
          </div>
        </div>
      </div>

      <Panel glow={el.color} style={{ padding:16 }}>
        <div style={{ fontWeight:800,fontSize:15,marginBottom:12 }}>⚔️ Monte seu time ({sel.length}/4)</div>
        <div style={{ display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:8,marginBottom:14 }}>
          {[0,1,2,3].map(function(i){
            const id=sel[i]; const def=id&&CHAR_MAP[id];
            return (
              <div key={i} onClick={function(){ if(def) setSel(function(t){return t.filter(function(x){return x!==id;});}); }}
                style={{ borderRadius:12,border:"2px "+(def?"solid "+el.color:"dashed "+C.line),minHeight:88,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:8,background:def?el.color+"18":"transparent",cursor:def?"pointer":"default",transition:"all .2s" }}>
                {def ? (<>
                  <Avatar ch={def} size={44} />
                  <div style={{ fontSize:9,color:"#fff",fontWeight:700,textAlign:"center",marginTop:4,maxWidth:60,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>{def.name}</div>
                  <div style={{ fontSize:8,color:el.color,fontWeight:700,marginTop:2 }}>✕ tirar</div>
                </>) : <span style={{ color:C.dim,fontSize:12,fontWeight:600 }}>Slot {i+1}</span>}
              </div>
            );
          })}
        </div>
        <div style={{ display:"flex",gap:8 }}>
          <Btn kind="ghost" onClick={onCancel} style={{ flex:1 }}>← Voltar</Btn>
          <Btn onClick={function(){ if(!sel.length){flash("Monte uma equipe!",C.bad);return;} onConfirm(sel); }}
            style={{ flex:2,justifyContent:"center",fontWeight:800,fontSize:14,background:"linear-gradient(135deg,"+el.color+"cc,"+el.color+"88)",border:"none",boxShadow:"0 4px 20px "+el.color+"44" }}
            disabled={!sel.length}>
            ⚔️ Iniciar Batalha
          </Btn>
        </div>
      </Panel>

      <div>
        <div style={{ fontWeight:700,fontSize:13,color:C.mute,marginBottom:8 }}>Seus Personagens</div>
        <div className="grid gap-2" style={{ gridTemplateColumns:"repeat(auto-fill,minmax(145px,1fr))" }}>
          {owned.map(function(o){
            const def=CHAR_MAP[o.id]; if(!def) return null;
            const active=sel.includes(o.id);
            return (
              <button key={o.id} onClick={function(){toggle(o.id);}} style={{ textAlign:"left",outline:"none",border:"none",background:"none",padding:0,cursor:"pointer" }}>
                <Panel style={{ padding:10,border:"2px solid "+(active?el.color:C.line),transition:"all .18s",transform:active?"scale(1.04)":"scale(1)" }} glow={active?el.color:null}>
                  <div className="flex items-center gap-2">
                    <Avatar ch={def} size={40} ring={active?el.color:null} />
                    <div style={{ overflow:"hidden" }}>
                      <div style={{ fontWeight:700,fontSize:12,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",maxWidth:82 }}>{def.name}</div>
                      <div style={{ fontSize:10,color:ELEMENTS[def.element]&&ELEMENTS[def.element].color }}>{ROLES[def.role]&&ROLES[def.role].label}</div>
                      <div style={{ fontSize:9,color:C.mute }}>Nv. {o.level}</div>
                    </div>
                  </div>
                  {active && <div style={{ marginTop:5,fontSize:10,color:el.color,fontWeight:800,textAlign:"center" }}>✓ Posição {sel.indexOf(o.id)+1}</div>}
                </Panel>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
function Tower({ towerCleared, towerClaimed, start, team, flash }) {
  const earned = towerClaimed.reduce((a, f) => a + rewardFor(f), 0);
  return (
    <div className="flex flex-col gap-4">
      <Panel glow={C.gold} style={{ position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", inset: 0, background: "radial-gradient(420px 200px at 85% 0%, #6FE3FF22, transparent)" }} />
        <div style={{ position: "relative" }}>
          <div style={{ ...ORB, fontSize: 20, fontWeight: 800 }}>🗼 Torre Estelar</div>
          <div style={{ fontSize: 13, color: C.mute, marginTop: 4 }}>{TOWER_FLOORS} andares. As primeiras conquistas somam exatamente <Glow color={C.gold}>24.000💎</Glow>. Andares múltiplos de 10 são chefes com IA avançada.</div>
          <div className="flex items-center gap-3 mt-3" style={{ fontSize: 13 }}><span>Progresso: <b style={{ color: C.gold }}>{towerCleared}/{TOWER_FLOORS}</b></span><span>Gemas ganhas: <b style={{ color: "#86d8ff" }}>{earned}/24000</b></span></div>
          <Bar value={earned} max={24000} color={C.gold} />
        </div>
      </Panel>
      {/* Boss cards for floors 50, 60, 70 */}
      <div style={{ fontSize: 12, fontWeight: 700, color: C.mute, letterSpacing: 1 }}>⚠️ CHEFES ESPECIAIS DA TORRE</div>
      <div className="flex flex-col gap-3">
        {Object.keys(TOWER_BOSSES).map(f => <TowerBossCard key={f} floorNum={Number(f)} towerCleared={towerCleared} start={start} team={team} flash={flash} />)}
      </div>
      <Panel>
        <div className="grid gap-2" style={{ gridTemplateColumns: "repeat(auto-fill,minmax(58px,1fr))" }}>
          {Array.from({ length: TOWER_FLOORS }, (_, i) => i + 1).map((f) => {
            const cleared = f <= towerCleared, current = f === towerCleared + 1, locked = f > towerCleared + 1, boss = f % 10 === 0;
            const isTowerBoss = !!TOWER_BOSSES[f];
            const color = cleared ? C.good : current ? C.gold : C.line;
            return <button key={f} disabled={locked || cleared} onClick={() => { if (!team.length) { flash("Monte uma equipe", C.bad); return; } start(f); }}
              className="active:scale-95 transition" style={{ aspectRatio: "1", borderRadius: 12, border: `2px solid ${isTowerBoss && !cleared ? (ELEMENTS[TOWER_BOSSES[f]?.element]?.color || color) : color}`, background: boss ? `${color}1f` : C.panelHi, color: locked ? C.dim : C.text, opacity: locked ? 0.5 : cleared ? 0.7 : 1, position: "relative", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", cursor: (locked || cleared) ? "not-allowed" : "pointer" }}>
              <span style={{ fontSize: boss ? 16 : 13, fontWeight: 800 }}>{isTowerBoss ? (cleared ? "✓" : "💀") : boss ? "☠" : f}</span>
              {boss && <span style={{ fontSize: 9, color: C.mute }}>{f}</span>}
              {cleared && !isTowerBoss && <span style={{ position: "absolute", top: 2, right: 4, color: C.good, fontSize: 10 }}>✓</span>}
            </button>;
          })}
        </div>
        <div style={{ fontSize: 11, color: C.mute, marginTop: 10 }}>Toque no andar liberado (dourado) para batalhar. Cada andar custa <b>5⚡</b> e <b>não pode ser repetido</b> após a vitória.</div>
      </Panel>
    </div>
  );
}

/* ==========================================================================
   MOTOR DE COMBATE
   ========================================================================== */
const SAFE_STATS = { hp: 1000, atk: 500, def: 300, spd: 100, critRate: 5, critDmg: 50, dmgBonus: 0, energyRegen: 0, healBonus: 0, defPen: 0, dotDmg: 0, elem: {}, energyMax: 120, baseHp: 1000, baseAtk: 500, baseDef: 300 };
function makeUnit(o, side, idx) {
  const def = CHAR_MAP[o.id]; const stats = computeStats(o);
  if (!def || !stats) return null; // robustez: personagem desconhecido/sem stats não entra em batalha
  const tr = o.traces || { basic: 1, skill: 1, ult: 1 };
  const sts = specialTraces(def); const flags = {};
  (o.specialTraces || []).forEach((on, i) => { if (on && sts[i] && sts[i].combat) flags[sts[i].combat] = true; });
  // constelação: amplificações + flags por nó desbloqueado
  let ampB = 1, ampS = 1, ampU = 1;
  const nodes = constellationNodes(def);
  for (let i = 0; i < (o.eidolon || 0); i++) { const n = nodes[i]; if (!n) continue; if (n.amp === "skill") ampS += n.ampV / 100; else if (n.amp === "ult") ampU += n.ampV / 100; else if (n.amp === "basic") ampB += n.ampV / 100; if (n.flag) flags[n.flag] = true; }
  // passiva sempre ativa
  const pass = passiveOf(def); if (pass.flag) flags[pass.flag] = true;
  // flags de conjunto de relíquias (2pç/4pç)
  const setCount = {}; (o.relics || []).forEach((r) => { if (r) setCount[r.set] = (setCount[r.set] || 0) + 1; });
  for (const sName in setCount) { const sd = RELIC_SETS[sName]; if (!sd) continue; if (setCount[sName] >= 2 && sd.flag2) flags[sd.flag2] = true; if (setCount[sName] >= 4 && sd.flag4) flags[sd.flag4] = true; }
  return {
    uid: side + idx, side, id: o.id, name: def.name, avatar: def.avatar, element: def.element, role: ROLES[def.role].key || def.role,
    roleKey: def.role, skill: def.skill, eidolon: o.eidolon || 0, level: o.level || 1,
    tBasic: traceMul(tr.basic), tSkill: traceMul(tr.skill), tUlt: traceMul(tr.ult), stFlags: flags,
    ampBasic: ampB, ampSkill: ampS, ampUlt: ampU, dragons: 0,
    base: stats, hp: Math.round(stats.hp), maxHp: Math.round(stats.hp), shield: 0,
    energy: Math.round(stats.energyMax * 0.2), energyMax: stats.energyMax,
    av: (flags.pSwift ? 0.5 : 1) * 10000 / Math.max(1, stats.spd), buffs: [], debuffs: [], dots: [], alive: true,
    posturePH: flags.miC1 ? (flags.miC6 ? 4 : 3) : 0, ritmoStacks: 0,
    weapon: o.weapon ? WEAPON_MAP[o.weapon] : null, hasSummon: false,
  };
}
function makeAllyUnit(ally, idx) {
  const stats = (ally && ally.stats && isFinite(ally.stats.hp)) ? ally.stats : SAFE_STATS;
  return {
    uid: "A" + idx, side: "H", id: "ally_" + idx, name: ally.name + " ⭐", avatar: ally.avatar, element: ally.element,
    roleKey: ally.role, skill: ally.skill, eidolon: ally.eidolon || 0, level: ally.level || 60, auto: true, coopOwner: ally.player,
    tBasic: 1.3, tSkill: 1.3, tUlt: 1.3, stFlags: {},
    base: stats, hp: Math.round(stats.hp), maxHp: Math.round(stats.hp), shield: 0,
    energy: Math.round((stats.energyMax || 120) * 0.2), energyMax: stats.energyMax || 120,
    av: 10000 / Math.max(1, stats.spd || 100), buffs: [], debuffs: [], dots: [], alive: true, weapon: null, hasSummon: false,
  };
}
function makeSummon(owner, cfg) {
  const f = owner.stFlags || {};
  const bonus = (f.summonPlus ? 1.3 : 1) * (f.pDragonLord ? 1.2 : 1);
  const atk = effStat(owner, "atk") * cfg.atkMul * bonus;
  const hp = Math.round(owner.maxHp * cfg.hpMul);
  return {
    uid: cfg.uid, side: "H", id: cfg.imgKey || "summon", name: cfg.name, avatar: cfg.avatar,
    element: cfg.elements ? cfg.elements[0] : owner.element, elements: cfg.elements || null,
    roleKey: "summon", isSummon: true, auto: true, kind: cfg.kind, mul: cfg.mul, ownerUid: owner.uid, firstHit: cfg.kind === "dragon",
    level: owner.level, life: cfg.life || Infinity, stFlags: {}, tBasic: 1, tSkill: 1, tUlt: 1,
    base: { atk, def: owner.base.def * 0.5, spd: cfg.spd, critRate: owner.base.critRate, critDmg: owner.base.critDmg, dmgBonus: owner.base.dmgBonus, hp, energyMax: 0 },
    hp, maxHp: hp, shield: 0, energy: 0, energyMax: 0, av: 10000 / Math.max(1, cfg.spd), buffs: [], debuffs: [], dots: [], alive: true, weapon: null,
  };
}
function aliveDragons(s, uid) { return s.heroes.filter((h) => h.isSummon && h.kind === "dragon" && h.ownerUid === uid && h.alive); }
function refreshKaibaBuffs(s) {
  const k = s.heroes.find((h) => h.id === "kaiba" && h.alive);
  if (!k) return;
  const n = aliveDragons(s, k.uid).length;
  k.buffs = k.buffs.filter((b) => b.name !== "Inversão" && b.name !== "DiscoDuelo");
  if (n > 0) {
    k.buffs.push({ stat: "atk", value: 20 * n, pct: true, turns: 99, name: "Inversão" });
    k.buffs.push({ stat: "energyRegen", value: 15 * n, pct: false, turns: 99, name: "Inversão" });
    if (k.weapon?.id === "dragoncannon") k.buffs.push({ stat: "critDmg", value: 18 * n, pct: false, turns: 99, name: "DiscoDuelo" }); // +18% CRIT DMG por dragão
  }
  if (k.stFlags?.kcImmune && n >= 2) k.debuffs = []; // Controle de Ações: imune a debuffs com 2+ dragões
}
function makeEnemy(idx, enc) {
  const lvl = enc.level, boss = enc.boss && idx === 0, finalBoss = enc.finalBoss && idx === 0, weekly = enc.weekly && idx === 0, ascend = enc.ascend && idx === 0;
  const power = enc.teamPower || 2500;
  let baseHp;
  if (enc.tagDungeon) {
    // HP fixo baseado no nível — não escala com poder do time (estilo HSR)
    // Ondas regulares têm HP substancialmente maior que dungeons de farm
    baseHp = 280 * Math.pow(lvl, 1.28) + idx * 500;
    if (boss) baseHp *= 5.5; // Guardião da Tag é bem mais resistente
  } else {
    // HP atrelado ao PODER da equipe (invariante de escala) — mantém a luta justa mesmo após o rebalanceamento HSR
    baseHp = power * 2.4 + lvl * 50 + idx * 150;
    if (boss) baseHp *= finalBoss ? 7.2 : weekly ? 8.5 : ascend ? 7.8 : 4.6;
  }
  const hp = Math.round(baseHp);
  const atk = Math.round((power * 0.06 + lvl * 4 + 80) * (boss ? 1.35 : 1));
  const def = Math.round(power * 0.035 + lvl * 3 + (boss ? power * 0.03 : 0));
  const spd = 95 + idx * 3 + (boss ? 4 : 0);
  if (enc.bossRush && idx === 0) { const bd = BOSS_RUSH_BOSSES.find(function(b){return b.id===enc.bossId;}); if (bd) { const atkBr = Math.round(3500 + (enc.level||90) * 12); const defBr = Math.round(2200 + (enc.level||90) * 8); return { uid: "E0", side: "enemy", name: bd.name, bossTitle: bd.lore, bossImgId: bd.imgKey, avatar: bd.avatar, element: bd.element, level: bd.level, roleKey: "dps", bossKind: bd.kind, boss: true, finalBoss: false, weekly: false, ascend: false, elite: false, res: bd.res || [], weak: bd.weak || [], base: { atk: atkBr, def: defBr, spd: 90, critRate: 15, critDmg: 60, dmgBonus: 0 }, hp: bd.hp, maxHp: bd.hp, shield: bd.kind === "sukuna" ? 200000 : 0, av: 10000 / 90, buffs: [], debuffs: [], dots: [], alive: true, actCount: 0 }; } }
  const bossEl = enc.bossElement || pick(ELEMENT_NAMES);
  const name = ascend ? (enc.bossName || "Guardião da Ascensão") : weekly ? (enc.bossName || "Tirano do Vazio") : finalBoss ? "Soberano do Vazio" : boss ? "Guardião do Andar" : "Aberração " + (idx + 1);
  // Alguns chefes têm RESISTÊNCIA (1-3 elementos) e FRAQUEZA (1-2 elementos)
  let res = [], weak = [];
  const _tbd = enc.bossKind ? Object.values(TOWER_BOSSES).find(b => b.bossKind === enc.bossKind) : null;
  if (_tbd) { res = [...(_tbd.res || [])]; weak = [...(_tbd.weak || [])]; }
  else if (boss && Math.random() < 0.7) {
    const poolE = [...ELEMENT_NAMES]; res.push(bossEl); poolE.splice(poolE.indexOf(bossEl), 1);
    const nRes = Math.floor(Math.random() * 2);
    for (let i = 0; i < nRes && poolE.length; i++) { res.push(poolE.splice(Math.floor(Math.random() * poolE.length), 1)[0]); }
    if (Math.random() < 0.4 && poolE.length) res.push(poolE.splice(Math.floor(Math.random() * poolE.length), 1)[0]);
    const nWeak = 1 + Math.floor(Math.random() * 2);
    for (let i = 0; i < nWeak && poolE.length; i++) { weak.push(poolE.splice(Math.floor(Math.random() * poolE.length), 1)[0]); }
  }
  return {
    uid: "E" + idx, side: "enemy", name: enc.bossName && (boss || finalBoss) && idx === 0 ? enc.bossName : name, bossTitle: enc.bossTitle || null, bossImgId: enc.bossImgId || null, avatar: ascend ? "🗿" : weekly ? "🦂" : finalBoss ? "🕳️" : boss ? "👑" : ["👾", "👹", "🐲"][idx % 3],
    element: (enc.bossElement && (boss || finalBoss) && idx === 0) ? enc.bossElement : (boss ? bossEl : pick(ELEMENT_NAMES)), level: lvl, roleKey: "dps", bossKind: enc.bossKind || (finalBoss ? "void" : weekly ? "venom" : ascend ? "stone" : "guardian"),
    boss: boss || weekly || ascend, finalBoss, weekly, ascend, elite: !boss && lvl >= 18 && idx === 0, res, weak,
    base: { atk, def, spd, critRate: boss ? 12 : 6, critDmg: 55, dmgBonus: 0 },
    hp, maxHp: hp, shield: 0, av: 10000 / Math.max(1, spd), buffs: [], debuffs: [], dots: [], alive: true, actCount: 0,
  };
}
function effStat(u, key) {
  const b0 = (u && u.base) || {};
  let base = b0[key] || 0, flat = 0, pct = 0;
  for (const b of (u.buffs || [])) if (b.stat === key) { if (b.pct) pct += b.value || 0; else flat += b.value || 0; }
  for (const b of (u.debuffs || [])) if (b.stat === key) { if (b.pct) pct += b.value || 0; else flat += b.value || 0; }
  const v = PCT[key] ? base * (1 + pct / 100) + flat : base + flat + pct;
  return isFinite(v) ? v : base;
}
function vulnOf(u) { let v = 0; for (const b of u.debuffs) if (b.stat === "vuln") v += b.value; return v; }
function defMult(attacker, defenderDef) { const lvl = (attacker && attacker.level) || 50; const d = Math.max(0, defenderDef || 0); return 1 - d / (d + 200 + 10 * lvl); }
/* ---------- BOSS RUSH BOSSES ---------- */
const BOSS_RUSH_BOSSES = [
  {
    id: "byakuya", name: "Byakuya Kuchiki", avatar: "\uD83C\uDF38", imgKey: "boss_byakuya",
    hp: 600000, element: "Holy", reward: 400,
    lore: "Capitao da 6a Divisao da Gotei 13. Petalas de cerejeira feitas de gelo cortam sem piedade.",
    mechanics: [
      "A cada 3 acoes usa Senbonzakura Kageyoshi: mil petalas causam dano em area a todos os aliados.",
      "Abaixo de 50% de HP entra no Bankai completo: cada petala reduz a DEF dos alvos por 2 turnos.",
      "Aliados com Sangramento recebem +30% de dano das petalas.",
    ],
    kind: "byakuya", weak: ["Chaos","Virus"], res: ["Holy"], level: 80,
  },
  {
    id: "sukuna", name: "Ryomen Sukuna", avatar: "\uD83D\uDC79", imgKey: "boss_sukuna",
    hp: 1200000, element: "Chaos", reward: 400,
    lore: "O Rei das Maldicoes. Seu Dominio Amaldicoado envolve tudo no caos absoluto.",
    mechanics: [
      "A cada 2 acoes usa Cleave: corte frontal que ignora 30% de DEF.",
      "Ao atingir 70% e 40% de HP expande o Dominio Amaldicoado: -30% DEF e +30% Vuln em todos por 3 turnos.",

    ],

    kind: "sukuna", weak: ["Virus"], res: ["Chaos","Holy"], level: 90,
  },
  {
    id: "frieren", name: "Frieren", avatar: "\uD83E\uDDD9", imgKey: "boss_frieren",
    hp: 1500000, element: "Glacial", reward: 400,
    lore: "A Maga do Pos-Alem. Feiticos acumulados por mais de mil anos.",
    mechanics: [
      "A cada 4 acoes conjura Graca das Fadas: 7 ondas de magia Glacial em alvos aleatorios.",
      "Acumula [Contra-Feitco] a cada ataque recebido (max 3) — ao atingir 3 cargas, paralisa o atacante por 1 turno.",
      "Abaixo de 30% de HP ativa Magia Proibida: Geada em todos os aliados e recupera 5% do HP maximo.",
    ],
    kind: "frieren", weak: ["Fogo","Holy"], res: ["Glacial","Eletro"], level: 95,
  },
];

const DOT_INFO = { burn: { c: "#FF6B45", n: "Queimadura" }, poison: { c: "#A6E22E", n: "Veneno" }, shock: { c: "#B98BFF", n: "Choque" }, bleed: { c: "#FF5FC4", n: "Sangramento" }, freeze: { c: "#6FE3FF", n: "Geada" }, geada: { c: "#6FE3FF", n: "Geada" }, corrosao: { c: "#7CFFB0", n: "Corrosão" } };
function dealDamage(attacker, defender, mult, fx, opts) {
  // Aizen mechanic: 40% miss chance before Bankai
  if (defender.bossKind === "aizen" && !defender.aiBankai && attacker.side === "H" && Math.random() < 0.40 && !opts?.pierceShield) {
    fx.push({ uid: defender.uid, txt: "ERROU!", crit: false, id: Math.random(), el: attacker.element || "Holy" });
    return { dmg: 0, crit: false };
  }
  const f = attacker.stFlags || {};
  let dmg = effStat(attacker, "atk") * (mult / 100);
  const crit = Math.random() * 100 < Math.min(100, effStat(attacker, "critRate"));
  if (crit) dmg *= 1 + effStat(attacker, "critDmg") / 100;
  dmg *= 1 + effStat(attacker, "dmgBonus") / 100;
  if (f.omgC6 && attacker.id === "omegamon" && (attacker.hp / attacker.maxHp) < 0.3) dmg *= 2; // Final Defeat: +100% Dano de Vírus
  const afflicted = (defender.dots && defender.dots.length) || (defender.debuffs && defender.debuffs.some((d) => d.stat === "def" && d.value < 0));
  if ((f.dmgVsAfflicted || f.afflictedDmg) && afflicted) dmg *= 1.25;
  if (f.pShatter && defender.dots && defender.dots.length) dmg *= 1.3;
  const hpPct = defender.hp / defender.maxHp;
  if (f.lowHpDmg && hpPct < 0.5) dmg *= 1.25;
  if (f.pExecute && hpPct < 0.4) dmg *= 1.25;
  dmg *= 1 + vulnOf(defender) / 100;
  // Resistência / Fraqueza elemental do alvo (alguns chefes)
  const el = opts?.el || attacker.element;
  if (defender.res && defender.res.includes(el)) dmg *= 0.6;
  else if (defender.weak && defender.weak.includes(el)) dmg *= 1.5;
  // 4pç Praga Viral: bônus conforme Sangramento/Veneno no alvo
  if (f.setViral4 && defender.dots) {
    const hasBleed = defender.dots.some((d) => d.type === "bleed"); const hasPoison = defender.dots.some((d) => d.type === "poison");
    if (hasBleed && hasPoison) { dmg *= 1.2; const heal = Math.round(attacker.maxHp * 0.08); if (attacker.side === "H") { attacker.hp = Math.min(attacker.maxHp, attacker.hp + heal); } }
    else if (hasBleed || hasPoison) dmg *= 1.12;
  }
  const pen = Math.min(85, (effStat(attacker, "defPen") || 0) + (opts?.defPen || 0));
  dmg *= defMult(attacker, effStat(defender, "def") * (1 - pen / 100));
  dmg = isFinite(dmg) ? Math.max(1, Math.round(dmg)) : 1; // robustez: nunca NaN/Infinity
  if (defender.side === "H" && attacker.side !== "H") {
    const red = (defender.buffs || []).filter((b) => b.stat === "dmgReduce").reduce((a, b) => a + (b.value || 0), 0);
    if (red) dmg = Math.max(1, Math.round(dmg * Math.max(0.1, 1 - red / 100))); // Protocolo de Infecção
    if (defender.id === "omegamon" || (defender.buffs || []).some((b) => b.name === "Protocolo")) defender._omgHit = (defender._omgHit || 0) + 1;
  }
  if (defender.shield > 0 && !opts?.pierceShield) { const shBefore = defender.shield; const a = Math.min(defender.shield, dmg); defender.shield -= a; dmg -= a; if (shBefore > 0 && defender.shield === 0 && defender.id === "omegamon" && defender.stFlags && defender.stFlags.omgContagio && attacker.side !== "H") { attacker.dots = attacker.dots || []; if (!attacker.dots.some(function(d){return d.type==="corrosao";})) attacker.dots.push({ type: "corrosao", dmg: Math.max(1, Math.round(defender.base.atk * 0.35)), turns: 2 }); fx.push({ uid: attacker.uid, txt: "CORROSAO", dot: "corrosao", id: Math.random() }); } }
  defender.hp -= dmg; if (defender.hp <= 0) { defender.hp = 0; defender.alive = false; }
  if (!defender.alive && defender.id === "omegamon" && defender.stFlags && defender.stFlags.omgC6 && !defender._c6Used) { defender.hp = 1; defender.alive = true; defender._c6Used = true; fx.push({ uid: defender.uid, txt: "FINAL DEFEAT", heal: true, id: Math.random() }); }
  if (dmg > 0 && defender.weapon && defender.weapon.omgWeapon && defender.alive && !defender.buffs.some(function(b){return b.name==="GlitchBoost";})) { defender.buffs.push({ stat: "dmgBonus", value: 25, turns: 2, name: "GlitchBoost" }); }
  if (defender.side === "H" && !defender.isSummon && defender.energyMax) { const heavy = attacker.boss || mult >= 300; defender.energy = Math.min(defender.energyMax, defender.energy + Math.round((heavy ? 12 : 6) * (1 + (effStat(defender, "energyRegen") || 0) / 100))); }
  if (!defender.alive && attacker.side === "H" && !attacker.isSummon && attacker.energyMax) { attacker.energy = Math.min(attacker.energyMax, attacker.energy + Math.round(6 * (1 + (effStat(attacker, "energyRegen") || 0) / 100))); } // kill: +6 ×ERR
  fx.push({ uid: defender.uid, txt: String(dmg), crit, id: Math.random(), el: opts?.el || attacker.element });
  return { dmg, crit };
}
function applyDot(targets, spec, source, fx) {
  const f = source.stFlags || {};
  let m = spec.mul;
  if (f.dotBoost) m *= 1.4;
  if (f.pScorch && spec.type === "burn") m *= 1.3;
  if (f.setFire2 && spec.type === "burn") m *= 1.1; // Núcleo Ardente 2pç
  m *= 1 + (source.base.dotDmg || 0) / 100; // substatus "Dano de DoT"
  const dmg = Math.max(1, Math.round(effStat(source, "atk") * (m / 100)));
  const glacial = spec.type === "freeze" || spec.type === "geada";
  targets.forEach((t) => {
    if (!t.alive) return;
    t.dots.push({ type: spec.type, dmg, turns: spec.turns });
    if (f.setGlacial4 && glacial) { const cur = t.debuffs.find((d) => d.name === "GlacialSet"); if (cur) cur.value = Math.min(7, cur.value + 2); else t.debuffs.push({ stat: "vuln", value: 2, turns: 3, name: "GlacialSet" }); } // Sopro Glacial 4pç
  });
}
// ----- Mecânicas da Soi Fon -----
function soiFonBasicAttack(s, u, enemy, fx, ampB) {
  const f = u.stFlags || {}, sk = u.skill || {};
  let msg = "";
  if (u.sfPostura) {
    u.sfPostura = false;
    const wpnCharges = (u.weapon?.id === "ferrao_borboleta") ? (u.sfWpnCharges || 0) : 0;
    const wpnBonus = wpnCharges * 0.24;
    if (wpnCharges > 0) u.sfWpnCharges = 0;
    const finalMul = 120 * (u.tBasic || 1) * ampB * (1 + wpnBonus);
    const targets = f.sfC6 ? s.enemies.filter(e => e.alive) : (enemy ? [enemy] : []);
    let tot = 0;
    targets.forEach(e => {
      const r = dealDamage(u, e, finalMul, fx, { el: "Vento", pierceShield: true, defPen: f.sfC6 ? 40 : 100 });
      tot += r.dmg;
      if (!e.alive && f.sfC6) { u.energy = u.energyMax; u.buffs.push({ stat: "dmgBonus", value: 50, turns: 1, name: "ExecSuprema" }); }
    });
    msg = `🦋✨ SOI FON — DANO VERDADEIRO (Postura de Ferrão)! ${tot} de Dano de Vento${f.sfC6 ? " em TODOS" : ""}${wpnBonus ? ` +${Math.round(wpnBonus * 100)}% (${wpnCharges} Cargas)` : ""}, ignora DEF e escudos!`;
  } else {
    if (enemy) {
      const r = dealDamage(u, enemy, (sk.basicMul || 100) * (u.tBasic || 1) * ampB, fx, { el: "Vento" });
      msg = `🦋 ${u.name} desfere dois golpes velozes em ${enemy.name} — ${r.dmg} de Dano de Vento${r.crit ? " (CRÍTICO!)" : ""}.`;
      const hasEletroDot = enemy.dots?.some(d => d.type === "shock");
      if (hasEletroDot) { u.energy = Math.min(u.energyMax, u.energy + 10); msg += " Bônus Eletro: +10 energia!"; }
      if (u.weapon?.id === "ferrao_borboleta") { u.sfWpnCharges = Math.min(5, (u.sfWpnCharges || 0) + 1); msg += ` [Carga Elétrica ${u.sfWpnCharges}/5]`; }
    }
  }
  return msg;
}
function checkSoiFonFollowup(s, actor, fx) {
  if (!actor || actor.element !== "Eletro" || actor.id === "soifon") return;
  const sf = s.heroes.find(h => h.id === "soifon" && h.alive && !h.isSummon);
  if (!sf) return;
  const ae = s.enemies.filter(e => e.alive);
  if (!ae.length) return;
  sf.sfCharges = Math.min(3, (sf.sfCharges || 0) + 1);
  const f2 = sf.stFlags || {};
  if (f2.sfC2) { const anyMarked = ae.some(e => (e.debuffs || []).some(d => d.name === "Ferrão da Morte")); if (anyMarked) sf.sfCharges = Math.min(3, sf.sfCharges + 1); }
  let posturaMsg = "";
  if (sf.sfCharges >= 3) {
    sf.sfCharges = 0; sf.sfPostura = true;
    if (f2.sfC1) { sf.energy = Math.min(sf.energyMax, sf.energy + 10); sf.buffs.push({ stat: "dmgBonus", value: 20, turns: 1, name: "VeloBorboleta" }); }
    if (f2.sfSombra) sf.buffs.push({ stat: "dmgBonus", value: 20, turns: 1, name: "SombraAssassina" });
    posturaMsg = " 🦋 POSTURA DE FERRÃO ativada!";
  } else { posturaMsg = ` (Vibração ${sf.sfCharges}/3)`; }
  const markedEnemies = ae.filter(e => (e.debuffs || []).some(d => d.name === "Ferrão da Morte"));
  if (!markedEnemies.length) { s.log = [...s.log.slice(-40), `🦋 Soi Fon acumula Vibração${posturaMsg}`]; return; }
  const maxFU = 2;
  let fuDone = s.sfFollowThisTurn || 0;
  const fuMsgs = [];
  for (const tgt of markedEnemies) {
    if (fuDone >= maxFU) break; fuDone++;
    let fuMul = 120 * (sf.tSkill || 1);
    if (f2.sfPrecisao) fuMul *= 1.25;
    if (f2.sfC5) fuMul *= 1.15;
    if (sf.weapon?.id === "ferrao_borboleta") { const wc = sf.sfWpnCharges || 0; if (wc > 0) { fuMul *= (1 + wc * 0.10); sf.sfWpnCharges = Math.min(5, wc + 1); } }
    const r = dealDamage(sf, tgt, fuMul, fx, { el: "Vento" });
    if (f2.sfPrecisao) { const cdStacks = sf.buffs.filter(b => b.name === "PrecisaoFU").length; if (cdStacks < 2) sf.buffs.push({ stat: "critDmg", value: 15, turns: 99, name: "PrecisaoFU" }); }
    fuMsgs.push(`${tgt.name}: ${r.dmg}${r.crit ? " CRÍTICO" : ""}`);
    if (!tgt.alive && f2.sfC6) { sf.energy = sf.energyMax; sf.buffs.push({ stat: "dmgBonus", value: 50, turns: 1, name: "ExecSuprema" }); fuMsgs.push("KILL! Energia máx"); }
  }
  s.sfFollowThisTurn = fuDone;
  if (fuMsgs.length || posturaMsg) s.log = [...s.log.slice(-40), `🦋 SOI FON follow-up Vento [${fuMsgs.join(", ")}]${posturaMsg}`];
}
// ----- Mecânicas da Miyabi -----
function miyabiDetonate(s, u, fx) {
  const ens = aliveEnemies(s);
  const fuel = ens.filter((e) => (e.dots && e.dots.length) || e.debuffs.some((d) => (d.stat === "def" && d.value < 0) || d.stat === "defDown"));
  if (!fuel.length) return 0;
  let tot = 0;
  ens.forEach((e) => {
    e.dots = []; e.debuffs = e.debuffs.filter((d) => !(d.stat === "def" && d.value < 0) && d.stat !== "defDown");
    const r = dealDamage(u, e, 150 * (u.tBasic || 1), fx, { el: "Glacial" }); tot += r.dmg;
    if (e.alive) e.dots.push({ type: "freeze", dmg: Math.max(1, Math.round(effStat(u, "atk") * 0.3)), turns: 1 });
  });
  return tot;
}
function miyabiBasicAttack(s, u, enemy, fx, ampB) {
  const f = u.stFlags || {}, sk = u.skill || {};
  const maxPH = f.miC6 ? 4 : 3;
  const frostZone = f.miC4 && (s.frostZone || 0) > 0;
  const inPostura = f.miPostura && (u.posturePH >= maxPH || frostZone);
  let msg = "";
  if (inPostura && f.miC6 && u.posturePH >= 4) {
    const fb = (f.miC1 && !u._firstCut) ? 1.5 : 1; let killed = false, tot = 0;
    aliveEnemies(s).forEach((e) => { const r = dealDamage(u, e, 450 * (u.tBasic || 1) * ampB * fb, fx, { el: "Glacial", defPen: 50 }); tot += r.dmg; if (!e.alive) killed = true; });
    msg = `❄️ MIYABI DESFERE O CORTE DO FIM DOS TEMPOS! ${tot} de Dano Glacial em TODOS, ignorando 50% da DEF.`;
    if (killed) { u._avMul = 0; msg += " Um alvo foi eliminado — Miyabi joga novamente!"; }
    u._firstCut = true; if (!frostZone) u.posturePH = 0;
  } else if (inPostura) {
    const fb = (f.miC1 && !u._firstCut) ? 1.5 : 1;
    if (enemy) { const r = dealDamage(u, enemy, (sk.basicMul || 110) * 1.5 * (u.tBasic || 1) * ampB * fb, fx, { el: "Glacial", defPen: 30 }); msg = `❄️ Corte Iaido em ${enemy.name} — ${r.dmg}${r.crit ? " (CRÍTICO!)" : ""}, ignorando 30% da DEF.`; }
    u._avMul = 0.5; u._firstCut = true; if (!frostZone) u.posturePH = 0;
  } else {
    if (enemy) { const r = dealDamage(u, enemy, (sk.basicMul || 110) * (u.tBasic || 1) * ampB, fx, { el: "Glacial" }); msg = `${u.name} usa Corte Gélido em ${enemy.name} — ${r.dmg}${r.crit ? " (CRÍTICO!)" : ""}.`; }
    u.posturePH = Math.min(maxPH, u.posturePH + 1);
    if (u.posturePH >= maxPH) msg += ` (${maxPH} PH — Postura Iaido pronta!)`;
  }
  if (f.miResidual && enemy && enemy.alive && enemy.debuffs.some((d) => d.name === "Residual")) {
    const r = dealDamage(u, enemy, 90, fx, { el: "Glacial" });
    enemy.dots.forEach((d) => (d.turns += 1));
    enemy.debuffs = enemy.debuffs.filter((d) => d.name !== "Residual");
    msg += ` Cortes Residuais ecoam por ${r.dmg} e estendem os DoTs.`;
  }
  if (f.miDetonate) { const t = miyabiDetonate(s, u, fx); if (t) msg += ` 💥 Detonação Glacial: ${t} em área + Congelamento.`; }
  return msg;
}
function tickDots(u, fx, allies) {
  if (!u.dots || !u.dots.length) return;
  let total = 0;
  u.dots.forEach((d) => { const dmg = Math.max(1, Math.round(d.dmg * (1 + vulnOf(u) / 100))); u.hp -= dmg; total += dmg; d.turns -= 1; fx.push({ uid: u.uid, txt: String(dmg), dot: d.type, id: Math.random() });
    if (d.type === "corrosao" && allies && allies.length) { const h = Math.round(dmg * 0.25 * (d.healMul || 1)); allies.forEach((a) => { if (a.alive && !a.isSummon) healUnit(a, h, fx); }); } // Corrosão cura o time
  });
  u.dots = u.dots.filter((d) => d.turns > 0);
  if (u.hp <= 0) { u.hp = 0; u.alive = false; }
  return total;
}
function healUnit(u, amount, fx) { const before = u.hp; u.hp = Math.min(u.maxHp, u.hp + amount); const done = u.hp - before; fx.push({ uid: u.uid, txt: "+" + done, heal: true, id: Math.random() }); return done; }
function tickBuffs(u) { u.buffs = u.buffs.map((b) => ({ ...b, turns: b.turns - 1 })).filter((b) => b.turns > 0); u.debuffs = u.debuffs.map((b) => ({ ...b, turns: b.turns - 1 })).filter((b) => b.turns > 0); }
function cloneU(u) { return { ...u, buffs: u.buffs.map((b) => ({ ...b })), debuffs: u.debuffs.map((b) => ({ ...b })), dots: (u.dots || []).map((d) => ({ ...d })), base: { ...u.base }, stFlags: { ...(u.stFlags || {}) } }; }
function findUnit(s, uid) { return [...s.heroes, ...s.enemies].find((u) => u.uid === uid); }
function applyBuff(targets, spec, name, fx, caster) {
  const extra = caster?.stFlags?.buffPlus && spec.all ? 1 : 0;
  targets.forEach((t) => { for (const stat of ["atk", "def", "critRate", "critDmg", "dmgBonus", "spd"]) if (spec[stat]) t.buffs.push({ stat, value: spec[stat], pct: !!PCT[stat], turns: spec.turns + extra, name }); });
}
function applyDebuff(targets, spec, extraDef, caster) {
  const f = caster?.stFlags || {};
  const plus = f.debuffPlus;
  const defX = (plus ? 0 : 0) + (extraDef || 0) + (f.pWeakpoint ? 12 : 0) + (f.defShredHit ? 0 : 0);
  const vulnX = (plus ? 12 : 0) + (f.pAnalyze ? 12 : 0);
  targets.forEach((t) => {
    if (spec.defDown) t.debuffs.push({ stat: "def", value: -(spec.defDown + defX), pct: true, turns: spec.turns + (plus ? 1 : 0), name: "DEF↓" });
    if (spec.vuln) t.debuffs.push({ stat: "vuln", value: spec.vuln + vulnX, turns: spec.turns + (plus ? 1 : 0), name: "Vuln" });
  });
}

function EnemyAvatar({ e, size = 40 }) {
  const images = useImg();
  const imgId = e.bossImgId || e.id;
  const url = imgId ? images[imgId] : null;
  const el = ELEMENTS[e.element] || { color: C.line };
  if (url) return <img src={url} alt={e.name} style={{ width: size, height: size, objectFit: "cover", objectPosition: "top", borderRadius: 8, border: `2px solid ${el.color}88`, flexShrink: 0 }} />;
  return <span style={{ fontSize: e.boss ? 30 : 26, lineHeight: 1 }}>{e.avatar}</span>;
}
function Battle({ team, ownedMap, encounter, ally, context, onEnd, flash }) {
  const [state, setState] = useState(() => {
    const heroes = team.map((id, i) => (ownedMap[id] ? makeUnit(ownedMap[id], "H", i) : null)).filter(Boolean);
    if (ally) heroes.push(makeAllyUnit(ally, heroes.length));
    { const omg = heroes.find((h) => h && h.id === "omegamon" && h.alive); // Talento: +25% HP máx ao time; arma Glitch: +20% ao portador
      heroes.forEach((h) => { if (!h || h.isSummon) return; let mul = 1; if (h.weapon?.omgWeapon) mul *= 1.2; if (omg) mul *= 1.25; if (mul !== 1) { h.maxHp = Math.round(h.maxHp * mul); h.hp = h.maxHp; } });
      if (omg) { omg.omgCharges = 0; omg._c6Used = false; } }
    if (heroes.some((h) => h.stFlags?.pTeamEnergy)) heroes.forEach((h) => { if (h.energyMax) h.energy = Math.min(h.energyMax, h.energy + 15); });
    const enemies = Array.from({ length: Math.max(1, Math.min(3, encounter.count)) }, (_, i) => makeEnemy(i, { ...encounter, boss: encounter.boss && (encounter.waves || 1) <= 1 }));
    const totalWaves = Math.max(1, Math.min(8, encounter.waves || 1));
    return { heroes, enemies, sp: 3, wave: 1, totalWaves, heroTurns: 0, enc: encounter, log: [totalWaves > 1 ? `⚔️ Dungeon de ${totalWaves} ondas — sobreviva com um só fôlego!` : "⚔️ A batalha começa! A ressonância flui…"], turn: null, over: false, win: false, fx: [], choice: null, summonFx: null };
  });
  const [target, setTarget] = useState(0);
  useEffect(() => { const al = state.enemies.filter((e) => e.alive); if (al.length && target >= al.length) setTarget(0); }, [state.enemies, target]);
  useEffect(() => { if (state.summonFx) { const t = setTimeout(() => setState((s) => ({ ...s, summonFx: null })), 1600); return () => clearTimeout(t); } }, [state.summonFx]);
  useEffect(() => { if (state.hitFx) { const t = setTimeout(() => setState((s) => ({ ...s, hitFx: null })), 620); return () => clearTimeout(t); } }, [state.hitFx]);
  const logRef = useRef(null);
  const holdTimer = useRef(null);
  const holdingRef = useRef(false);
  const [previewKind, setPreviewKind] = useState(null);
  const current = state.turn;

  useEffect(() => {
    if (state.over) return;
    if (!current) { const t = setTimeout(advance, 250); return () => clearTimeout(t); }
    if (current.side === "enemy") { const t = setTimeout(enemyAct, 750); return () => clearTimeout(t); }
    if (current.auto || current.isSummon) { const t = setTimeout(() => autoAct(current.uid), 700); return () => clearTimeout(t); }
  }, [current, state.over]); // eslint-disable-line
  useEffect(() => { if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight; }, [state.log]);
  useEffect(() => { if (state.over) { const t = setTimeout(() => onEnd({ win: state.win, turns: state.heroTurns }), 1500); return () => clearTimeout(t); } }, [state.over]); // eslint-disable-line

  function advance() {
    setState((s) => {
      const units = [...s.heroes, ...s.enemies].filter((u) => u.alive);
      if (!units.length) return s;
      units.forEach((u) => { if (!isFinite(u.av) || u.av < 0) u.av = 9999; }); // sanitiza av (robustez)
      const minAv = Math.min(...units.map((u) => u.av));
      units.forEach((u) => (u.av -= minAv));
      const next = units.slice().sort((a, b) => a.av - b.av)[0];
      return { ...s, turn: next };
    });
  }
  function checkEnd(s) {
    const h = s.heroes.some((u) => u.alive && !u.isSummon);
    if (!h) return { ...s, over: true, win: false };
    const e = s.enemies.some((u) => u.alive);
    if (e) return s;
    if ((s.wave || 1) < (s.totalWaves || 1)) {
      const nextWave = (s.wave || 1) + 1;
      const enc = s.enc || {};
      const baseLvl = enc.level || 30;
      const isLast = nextWave >= (s.totalWaves || 1);
      const newEnemies = Array.from({ length: Math.max(1, Math.min(3, enc.count || 3)) }, (_, i) => makeEnemy(i, { ...enc, level: baseLvl + (nextWave - 1) * 2, boss: !!enc.boss && isLast }));
      s.log = [...s.log.slice(-40), isLast ? `🌊 Onda final ${nextWave}/${s.totalWaves} — o Guardião aparece!` : `🌊 Onda ${nextWave}/${s.totalWaves} — novos inimigos surgem!`];
      return { ...s, enemies: newEnemies, wave: nextWave, turn: null };
    }
    return { ...s, over: true, win: true };
  }
  const pushLog = (s, m) => { if (m) s.log = [...s.log.slice(-40), m]; };

  function aliveEnemies(s) { return s.enemies.filter((e) => e.alive); }
  function targetEnemy(s) { const al = aliveEnemies(s); return al[target] || al[0]; }

  function skillPreviewLines(hero, kind) {
    const sk = hero.skill || {};
    const atk = Math.round(effStat(hero, "atk"));
    const lines = [];
    if (kind === "basic") {
      const mul = sk.basicMul || 100;
      lines.push(`Dano: <b>${mul}% de ATK</b>`);
      if (atk) lines.push(`≈ <b>${Math.round(atk * mul / 100)}</b> de dano (sem crítico)`);
      lines.push(`Ganha <b>+1 Ponto de Habilidade</b>`);
    } else if (kind === "skill") {
      lines.push(`Custo: <b>1 Ponto de Habilidade</b>`);
      if (sk.skillMul) { lines.push(`Dano: <b>${sk.skillMul}% de ATK</b>${sk.aoe ? " — Área" : ""}`); if (atk) lines.push(`≈ <b>${Math.round(atk * sk.skillMul / 100)}</b> de dano`); }
      if (sk.skillDot) lines.push(`Aplica <b>${DOT_INFO[sk.skillDot.type]?.n || sk.skillDot.type}</b>: ${sk.skillDot.mul}% ATK/turno por ${sk.skillDot.turns}t`);
      if (sk.heal) lines.push(`Cura: <b>${sk.heal.mul}% de ATK</b>${sk.heal.aoe ? " para todos" : ""}`);
      if (sk.shield) lines.push(`Escudo: <b>${sk.shield.mul}% de ATK</b>`);
      if (sk.skillBuff) lines.push(`+<b>${sk.skillBuff.value}% ${(sk.skillBuff.stat || "atk").toUpperCase()}</b> por ${sk.skillBuff.turns} turnos`);
      if (sk.skillDebuff) lines.push(`Reduz <b>${(sk.skillDebuff.stat || "def").toUpperCase()}</b> em ${sk.skillDebuff.value}%`);
      if (sk.summon) lines.push(`Invoca <b>${sk.summon.name}</b>`);
    } else if (kind === "ult") {
      if (sk.ultMul) { lines.push(`Dano: <b>${sk.ultMul}% de ATK</b>${sk.ultAoe ? " — Área" : ""}`); if (atk) lines.push(`≈ <b>${Math.round(atk * sk.ultMul / 100)}</b> de dano`); }
      if (sk.ultDot) lines.push(`Aplica <b>${DOT_INFO[sk.ultDot.type]?.n || sk.ultDot.type}</b>: ${sk.ultDot.mul}% ATK/turno por ${sk.ultDot.turns}t`);
      if (sk.ultHeal) lines.push(`Cura: <b>${sk.ultHeal.mul}% de ATK</b>${sk.ultHeal.aoe ? " para todos" : ""}`);
      if (sk.ultShield) lines.push(`Escudo: <b>${sk.ultShield.mul}% de ATK</b>`);
      if (sk.ultBuff) lines.push(`+<b>${sk.ultBuff.value}% ${(sk.ultBuff.stat || "atk").toUpperCase()}</b> por ${sk.ultBuff.turns} turnos`);
    }
    return lines;
  }
  function startHold(kind) {
    holdingRef.current = false;
    clearTimeout(holdTimer.current);
    holdTimer.current = setTimeout(() => { holdingRef.current = true; setPreviewKind(kind); }, 400);
  }
  function endHold(kind) {
    clearTimeout(holdTimer.current);
    if (holdingRef.current) { holdingRef.current = false; setPreviewKind(null); }
    else { heroAction(kind); }
  }
  function cancelHold() {
    clearTimeout(holdTimer.current);
    holdingRef.current = false;
    setPreviewKind(null);
  }
  function heroAction(kind) {
    setState((s0) => {
      let s = { ...s0, heroes: s0.heroes.map(cloneU), enemies: s0.enemies.map(cloneU), fx: [] };
      const u = findUnit(s, current.uid); if (!u || !u.alive) { s.turn = null; return s; }
      if (kind === "skill" && s.sp <= 0) return s;
      s.heroTurns = (s.heroTurns || 0) + 1;
      tickDots(u, s.fx);
      if (!u.alive) { pushLog(s, `${u.name} sucumbe ao dano contínuo!`); s = checkEnd(s); s.turn = null; return s; }
      refreshKaibaBuffs(s);
      const fx = s.fx, sk = u.skill, allies = s.heroes.filter((h) => h.alive), enemy = targetEnemy(s);
      const f = u.stFlags || {};
      const ampS = u.ampSkill || 1, ampU = u.ampUlt || 1, ampB = u.ampBasic || 1;
      const hb = 1 + (u.base.healBonus || 0) / 100;
      const healMul = (f.healPlus ? 1.3 : 1) * (f.pRegen ? 1.25 : 1);
      const shB = hb * (1 + (u.weapon?.shieldBonus || 0) / 100) * (f.shieldPlus ? 1.3 : 1) * (f.pBulwark ? 1.25 : 1);
      const enGain = (n) => Math.round(n * (1 + (effStat(u, "energyRegen") || 0) / 100));
      const doHeal = (tgt, amt) => { const done = healUnit(tgt, Math.round(amt * healMul), fx); if (f.healShield) tgt.shield += Math.round(done * 0.3); };
      let msg = "";

      if (kind === "basic") {
        let miyDone = false;
        if (u.id === "miyabi" && (f.miPostura || f.miResidual || f.miDetonate)) { msg = miyabiBasicAttack(s, u, enemy, fx, ampB); miyDone = true; }
        if (!miyDone && u.id === "soifon") { msg = soiFonBasicAttack(s, u, enemy, fx, ampB); miyDone = true; }
        if (!miyDone && u.id === "omegamon" && enemy) {
          const r = dealDamage(u, enemy, (sk.basicMul || 100) * u.tBasic * ampB, fx, { el: "Virus" });
          let extra = "";
          if ((enemy.dots || []).some((d) => d.type === "corrosao")) { const h = Math.round(u.maxHp * 0.05); healUnit(u, h, fx); extra = ` Recupera ${h} de HP (alvo corroído).`; }
          if ((u.omgCharges || 0) >= 5 && enemy.alive) { enemy.buffs = []; const td = Math.round(u.maxHp * 0.20); enemy.hp -= td; if (enemy.hp <= 0) { enemy.hp = 0; enemy.alive = false; } fx.push({ uid: enemy.uid, txt: String(td), crit: true, id: Math.random(), el: "Virus" }); if (u.weapon?.omgWeapon) u.energy = Math.min(u.energyMax, u.energy + 8); u.omgCharges = 0; u.buffs = u.buffs.filter((b) => b.name !== "VirusDefeat"); extra += ` ☢️ Vírus Defeat MÁXIMO: remove buffs e causa ${td} de Dano Verdadeiro!`; }
          msg = `🛡️ ${u.name} dispara Garuru Cannon em ${enemy.name} — ${r.dmg} de Dano de Vírus${r.crit ? " (CRÍTICO!)" : ""}.${extra}`;
          miyDone = true;
        }
        if (!miyDone && enemy && sk.basicMul) { const r = dealDamage(u, enemy, sk.basicMul * u.tBasic * ampB, fx); msg = `${u.name} usa Ataque Básico em ${enemy.name} — ${r.dmg} de dano${r.crit ? " (CRÍTICO!)" : ""}.`; }
        if (f.kcAdvance) { const ds = aliveDragons(s, u.uid); ds.forEach((d) => { d.av = Math.max(0.1, d.av * 0.65); }); if (ds.length) msg += ` Os ${ds.length} dragões avançam na linha do tempo!`; }
        s.sp = Math.min(5, s.sp + 1); u.energy = Math.min(u.energyMax, u.energy + enGain(sk.enBasic || 15));
      } else if (kind === "skill") {
        s.sp -= 1; u.energy = Math.min(u.energyMax, u.energy + enGain(sk.enSkill || 22));
        if (u.id === "miyabi" && f.miC2 && enemy && (enemy.dots || []).some((d) => d.type === "freeze" || d.type === "geada")) s.sp = Math.min(5, s.sp + 1); // C2: vs Congelado não gasta PH
        const sMul = u.tSkill * ampS;
        if (sk.summon) {
          const dragons = aliveDragons(s, u.uid);
          if (dragons.length >= 3) { msg = `${u.name} já comanda 3 ${sk.summon.name}s em campo — invocação bloqueada.`; }
          else {
            const idx = dragons.length;
            const d = makeSummon(u, { uid: `S_${u.uid}_d${Math.floor(Math.random() * 1e6)}`, name: sk.summon.name + (idx > 0 ? ` #${idx + 1}` : ""), avatar: sk.summon.avatar, atkMul: sk.summon.atkMul, hpMul: sk.summon.hpMul, mul: sk.summon.mul, spd: sk.summon.spd, kind: "dragon", index: idx, imgKey: "dragon" });
            d.dragonVuln = !!f.kS1;
            if (f.summonHaste) d.av = 1;
            s.heroes.push(d);
            msg = `${u.name} invoca ${d.name} (${idx + 1}/3 dragões em campo).`;
          }
          if (sk.skillMul) { const wpen = u.weapon?.id === "dragoncannon" ? 30 : 0; let tot = 0; aliveEnemies(s).forEach((e) => { tot += dealDamage(u, e, sk.skillMul * sMul, fx, { el: "Eletro", defPen: wpen }).dmg; }); if (tot) msg += ` Rajada Eletro em área: ${tot}${wpen ? " (perfura DEF)" : ""}.`; }
          if (f.kS2) { const sh = Math.round(effStat(u, "atk") * ampS); u.shield += sh; msg += ` Barreira do Duelista: escudo de ${sh}.`; }
          refreshKaibaBuffs(s);
        }
        else if (u.id === "soifon" && sk.sfSkill && enemy) {
          const sMul = u.tSkill * ampS;
          const r = dealDamage(u, enemy, (sk.skillMul || 160) * sMul, fx, { el: "Vento" });
          const markCount = (enemy.debuffs || []).filter(d => d.name === "Ferrão da Morte").length;
          if (markCount < 3) enemy.debuffs.push({ stat: "mark", value: 0, turns: 3, name: "Ferrão da Morte" });
          if (f.sfC2) { if (!enemy.debuffs.some(d => d.name === "EletroRES↓")) enemy.debuffs.push({ stat: "elemRes", value: -15, turns: 3, name: "EletroRES↓" }); }
          if (u.weapon?.id === "ferrao_borboleta") u.sfWpnCharges = Math.min(5, (u.sfWpnCharges || 0) + 1);
          msg = `🦋 ${u.name} usa Nigeki Kessatsu em ${enemy.name} — ${r.dmg} de Dano de Vento${r.crit ? " (CRÍTICO!)" : ""}! [Ferrão da Morte] marcado por 3 turnos — follow-ups de aliados Eletro ativarão golpes de acompanhamento!`;
        }
        else if (u.id === "omegamon" && sk.omgSkill) {
          const sMul = u.tSkill * ampS;
          const red = 50 + (f.omgContagio ? 20 : 0); // 50% redirect + 20% extra resist
          allies.forEach((a) => { a.buffs = a.buffs.filter((b) => b.name !== "Protocolo"); a.buffs.push({ stat: "dmgReduce", value: red, turns: 2, name: "Protocolo" }); if (f.omgC2) a.buffs.push({ stat: "dmgBonus", value: 20, turns: 2, name: "Contágio+" }); });
          const sh = Math.round(u.maxHp * 0.25); u.shield = Math.max(u.shield, sh);
          if (enemy) { const r = dealDamage(u, enemy, (sk.skillMul || 120) * sMul, fx, { el: "Virus" }); msg = `🛡️ ${u.name} ativa Protocolo de Infecção — o time recebe -${red}% de dano por 2 turnos e ele ergue um Escudo de Dados de ${sh}. Atinge ${enemy.name} por ${r.dmg} de Dano de Vírus${r.crit ? " (CRÍTICO!)" : ""}.`; }
          else msg = `🛡️ ${u.name} ativa Protocolo de Infecção — -${red}% de dano ao time e Escudo de Dados de ${sh}.`;
        }
        else if (sk.skillMul && enemy) {
          const onSkillHit = (e, r) => {
            if (!r.crit) return;
            if (f.miResidual && e.alive) { if (!e.debuffs.some((d) => d.name === "Residual")) e.debuffs.push({ stat: "mark", value: 0, turns: 99, name: "Residual" }); }
            if (u.weapon?.id === "hailstorm" && e.alive) { e.debuffs.push({ stat: "def", value: -15, turns: 2, name: "Fio0" }); applyDot([e], { type: "freeze", mul: 40, turns: 2 }, u, fx); }
            if (f.miC2) u.energy = Math.min(u.energyMax, u.energy + enGain(5));
          };
          if (sk.aoe) { let tot = 0, anyCrit = false; aliveEnemies(s).forEach((e) => { const r = dealDamage(u, e, sk.skillMul * sMul, fx); tot += r.dmg; if (r.crit) anyCrit = true; onSkillHit(e, r); }); msg = `${u.name} usa Habilidade em área — ${tot} de dano total${anyCrit ? " (CRÍTICO!)" : ""}.`; if (f.extraSkillHit && enemy && enemy.alive) { const r2 = dealDamage(u, enemy, sk.skillMul * sMul * 0.4, fx); msg += ` Corte extra de ${r2.dmg}.`; onSkillHit(enemy, r2); } }
          else { const r = dealDamage(u, enemy, sk.skillMul * sMul, fx); onSkillHit(enemy, r); msg = `${u.name} usa Habilidade em ${enemy.name} — ${r.dmg}${r.crit ? " (CRÍTICO!)" : ""}.`; if (f.extraSkillHit) { const r2 = dealDamage(u, enemy, sk.skillMul * sMul * 0.4, fx); onSkillHit(enemy, r2); msg += ` Corte extra de ${r2.dmg}.`; } }
          if (f.miC3) { u.ritmoStacks = Math.min(3, (u.ritmoStacks || 0) + 1); u.buffs = u.buffs.filter((b) => b.name !== "Ritmo"); u.buffs.push({ stat: "atk", value: 20 * u.ritmoStacks, pct: true, turns: 99, name: "Ritmo" }); msg += ` Ritmo da Nevasca x${u.ritmoStacks} (+${20 * u.ritmoStacks}% ATK).`; }
        }
        if (sk.skillDot && enemy) { applyDot(sk.aoe ? aliveEnemies(s) : [enemy], sk.skillDot, u, fx); msg += ` Aplica ${DOT_INFO[sk.skillDot.type]?.n || "DoT"}.`; }
        if (sk.skillBuff) { const tg = sk.skillBuff.all ? allies : [u]; applyBuff(tg, sk.skillBuff, u.name, fx, u); if (u.weapon?.buff?.onBuff) applyBuff(tg, u.weapon.buff.onBuff, u.weapon.name, fx, u); msg = `${u.name} fortalece ${sk.skillBuff.all ? "o time (ATK/CRIT↑)" : "a si (ATK/CRIT↑)"}.`; }
        if (sk.skillDebuff && enemy) { applyDebuff([enemy], sk.skillDebuff, u.weapon?.extraDefDown, u); msg = `${u.name} reduz a DEF e aplica vulnerabilidade em ${enemy.name}.`; }
        if (f.defShredHit && enemy) applyDebuff([enemy], { defDown: 12, turns: 2 }, 0, u);
        if (sk.heal) { const tgt = allies.slice().sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp)[0]; doHeal(tgt, (effStat(u, "atk") * sk.heal.mul / 100 + sk.heal.flat) * hb * ampS); msg = `${u.name} cura ${tgt.name}.`; }
        if (sk.shield) { const sh = Math.round((effStat(u, "def") * sk.shield.defMul / 100 + sk.shield.flat) * shB * ampS); u.shield += sh; msg = `${u.name} ergue um escudo de ${sh} e provoca os inimigos.`; }
        if (u.weapon?.buff?.onSkill) { applyBuff([u], u.weapon.buff.onSkill, u.weapon.name, fx, u); msg += ` [${u.weapon.name}]`; }
        if (sk.energyGift) { const t = allies.filter((a) => a.uid !== u.uid && !a.isSummon)[0]; if (t) { t.energy = Math.min(t.energyMax, t.energy + sk.energyGift); msg += ` Doa ${sk.energyGift} de energia a ${t.name}.`; } }
      } else if (kind === "ult") {
        if (u.energy < u.energyMax) return s;
        if (u.id === "kaiba") { if (aliveDragons(s, u.uid).length >= 3) { s.choice = { uid: u.uid }; return s; } else { return s; } } // Suprema só com 3 dragões
        if (u.id === "soifon" && sk.sfUlt) {
          u.energy = enGain(5);
          if (enemy) {
            const fmMarks = (enemy.debuffs || []).filter(d => d.name === "Ferrão da Morte").length;
            enemy.debuffs = (enemy.debuffs || []).filter(d => d.name !== "Ferrão da Morte");
            const bankaiBuff = (f.sfBankai && enemy.hp / enemy.maxHp < 0.3) ? 1.3 : 1;
            const totalMul = (sk.ultMul || 350) * (u.tUlt || 1) * ampU * bankaiBuff * (1 + fmMarks * 0.15);
            let origCR = null;
            if (f.sfBankai && enemy.hp / enemy.maxHp < 0.3) { origCR = u.base.critRate; u.base = { ...u.base, critRate: 200 }; }
            const r = dealDamage(u, enemy, totalMul, fx, { el: "Vento" });
            if (origCR !== null) u.base.critRate = origCR;
            const zonaTurns = f.sfBankai ? 2 : 1;
            s.sfZona = { turns: zonaTurns };
            if (f.sfC4) s.heroes.filter(h => h.alive && !h.isSummon).forEach(h => h.buffs.push({ stat: "critRate", value: 10, pct: false, turns: zonaTurns + 1, name: "AuraCond" }));
            if (!enemy.alive && f.sfC6) { u.energy = u.energyMax; u.buffs.push({ stat: "dmgBonus", value: 50, turns: 1, name: "ExecSuprema" }); }
            msg = `💥🦋 JAKUHŌ RAIKŌBEN! ${u.name} dispara o míssil definitivo em ${enemy.name} — ${r.dmg} de Dano de Vento${r.crit ? " CRÍTICO!" : ""}!${fmMarks ? ` (+${fmMarks * 15}% de marcas!)` : ""} Zona de Condução por ${zonaTurns} turno(s)!${f.sfC4 ? " +10% CRIT ao time!" : ""}`;
          }
        } else if (u.id === "omegamon" && sk.omgUlt) {
          u.energy = enGain(5);
          const cost = Math.round(u.hp * 0.30); u.hp = Math.max(1, u.hp - cost); if (u.weapon && u.weapon.omgWeapon && !u.buffs.some(function(b){return b.name==="GlitchBoost";})) u.buffs.push({ stat: "dmgBonus", value: 25, turns: 2, name: "GlitchBoost" });
          const lostPct = (1 - u.hp / u.maxHp) * 100;
          const satur = f.omgSaturacao ? (1 + 0.008 * lostPct) : 1;
          const c6 = (f.omgC6 && u.hp / u.maxHp < 0.3) ? 2 : 1;
          const dblCorr = u.weapon?.omgWeapon ? 2 : 1;
          const baseMul = (sk.ultMul || 150) * u.tUlt * ampU * satur * c6;
          let tot = 0;
          aliveEnemies(s).forEach((e) => {
            const r = dealDamage(u, e, baseMul, fx, { el: "Virus" });
            const extraHp = Math.max(1, Math.round(u.maxHp * 0.15 * (1 + vulnOf(e) / 100)));
            e.hp -= extraHp; if (e.hp <= 0) { e.hp = 0; e.alive = false; } fx.push({ uid: e.uid, txt: String(extraHp), id: Math.random(), el: "Virus" });
            tot += r.dmg + extraHp;
            if (e.alive) { e.dots = (e.dots || []).filter((d) => d.type !== "corrosao"); e.dots.push({ type: "corrosao", dmg: Math.max(1, Math.round(effStat(u, "atk") * 0.30 * dblCorr)), turns: 2, healMul: f.omgReescrita ? 1.25 : 1 }); if (f.omgC4) e.debuffs.push({ stat: "spd", value: -15, pct: true, turns: 1, name: "Lentidão" }); }
          });
          if (f.omgC6) { s.heroes.forEach((a) => { if (!a.alive && !a.isSummon) { a.alive = true; a.hp = Math.round(a.maxHp * 0.30); a.shield = 0; a.dots = []; fx.push({ uid: a.uid, txt: "REVIVE", heal: true, id: Math.random() }); } }); }
          msg = `💥🛡️ ALL DELETE! ${u.name} consome ${cost} do próprio HP e arrasa todos os inimigos — ${tot} de Dano de Vírus em área! Aplica [Corrosão] (dano contínuo que cura o time).${f.omgC4 ? " Inimigos ficam lentos!" : ""}${f.omgC6 ? " Revive aliados caídos!" : ""}`;
        } else {
        u.energy = enGain(5); // reembolso HSR: +5 base ×ERR
        const uMul = u.tUlt * ampU * (f.setFire4 ? 1.2 : 1); // Núcleo Ardente 4pç: +20% dano de Ult
        if (sk.ultMul && enemy) { if (sk.ultAoe) { let tot = 0; aliveEnemies(s).forEach((e) => { const r = dealDamage(u, e, sk.ultMul * uMul, fx); tot += r.dmg; if (r.crit && f.miResidual && e.alive && !e.debuffs.some((d) => d.name === "Residual")) e.debuffs.push({ stat: "mark", value: 0, turns: 99, name: "Residual" }); }); msg = `💥 ${u.name} dispara o Ultimate em área — ${tot} de dano total!`; } else { const r = dealDamage(u, enemy, sk.ultMul * uMul, fx); if (r.crit && f.miResidual && enemy.alive && !enemy.debuffs.some((d) => d.name === "Residual")) enemy.debuffs.push({ stat: "mark", value: 0, turns: 99, name: "Residual" }); msg = `💥 ${u.name} desencadeia o Ultimate em ${enemy.name} — ${r.dmg}${r.crit ? " (CRÍTICO!)" : ""}!`; } }
        if (f.miC4) { s.frostZone = 3; msg += " Uma ZONA DE GEADA cobre o campo — Miyabi entra em Postura Iaido permanente!"; }
        if (f.setFire4) u.buffs.push({ stat: "atk", value: 8, pct: true, turns: 2, name: "Brasa" });
        if (sk.ultDot && enemy) { applyDot(sk.ultAoe ? aliveEnemies(s) : [enemy], sk.ultDot, u, fx); }
        if (sk.dragonStrike) { const dragon = aliveDragons(s, u.uid)[0]; if (dragon && enemy) { const r = dealDamage(dragon, enemy, sk.dragonStrike, fx, { el: "Eletro" }); msg += ` ${dragon.name} ataca por ${r.dmg}.`; } }
        if (sk.ultBuff) { applyBuff(allies, { ...sk.ultBuff, turns: Math.round(sk.ultBuff.turns * ampU) }, u.name, fx, u); msg += ` Fortalece o time.`; }
        if (sk.ultDebuff) { applyDebuff(aliveEnemies(s), sk.ultDebuff, 0, u); msg += ` Inimigos ficam vulneráveis.`; }
        if (sk.ultHeal) { allies.forEach((a) => doHeal(a, (effStat(u, "atk") * sk.ultHeal.mul / 100 + sk.ultHeal.flat) * hb * ampU * (f.pMedic ? 1.25 : 1))); msg = msg ? msg + " Cura toda a equipe." : `💥 ${u.name} cura toda a equipe.`; }
        if (sk.ultShield) { allies.forEach((a) => (a.shield += Math.round((effStat(u, "def") * sk.ultShield.defMul / 100 + sk.ultShield.flat) * shB * ampU))); msg += ` Escuda a equipe.`; }
        if (f.vulnUlt) { applyDebuff(aliveEnemies(s), { vuln: 25, turns: 2 }, 0, u); msg += ` (Juízo: +25% vulnerabilidade)`; }
        if (f.cleanseUlt) { allies.forEach((a) => { if (a.debuffs.length) a.debuffs.shift(); }); msg += ` (Remove debuffs)`; }
        if (f.ultDmgBuff) { applyBuff(allies, { dmgBonus: 20, all: true, turns: 2 }, u.name, fx, u); msg += ` (+20% dano à equipe)`; }
        if (f.reviveEnergy) { allies.forEach((a) => { if (a.energyMax) a.energy = Math.min(a.energyMax, a.energy + 20); }); msg += ` (+20 energia à equipe)`; }
        if (f.ultRefund) { u.energy = Math.min(u.energyMax, 40); msg += ` (recupera 40 energia)`; }
        if (u.weapon?.ultEnergy) allies.forEach((a) => { if (a.energyMax) a.energy = Math.min(a.energyMax, a.energy + u.weapon.ultEnergy); });
        } // end soifon ult else
      }
      tickBuffs(u); u.av = 10000 / Math.max(1, effStat(u, "spd"));
      if (u._avMul != null) { u.av = Math.max(0.01, u.av * u._avMul); u._avMul = null; }
      if (u.id === "miyabi" && (s.frostZone || 0) > 0) s.frostZone -= 1;
      if (u.id === "soifon" && s.sfZona) { s.sfZona.turns -= 1; if (s.sfZona.turns <= 0) s.sfZona = null; }
      s.sfFollowThisTurn = 0;
      checkSoiFonFollowup(s, u, s.fx);
      s.hitFx = { el: u.element, big: kind === "ult" || sk.ultAoe || (kind === "skill" && sk.aoe), support: !fx.some((x) => !x.heal && !x.dot), id: Math.random() };
      pushLog(s, msg || `${u.name} se prepara.`); s = checkEnd(s); s.turn = null; return s;
    });
  }

  function resolveKaibaUlt(which) {
    setState((s0) => {
      let s = { ...s0, heroes: s0.heroes.map(cloneU), enemies: s0.enemies.map(cloneU), fx: [], choice: null };
      const u = s.heroes.find((h) => h.id === "kaiba" && h.alive); if (!u) { s.turn = null; return s; }
      const fx = s.fx, ampU = u.ampUlt || 1, ff = u.stFlags || {};
      const allies = s.heroes.filter((h) => h.alive);
      u.energy = Math.round(5 * (1 + (effStat(u, "energyRegen") || 0) / 100)); // reembolso HSR
      if (u.weapon?.id === "dragoncannon") s.sp = Math.min(5, (s.sp || 0) + 1); // +1 PH ao time (arma)
      let msg = "";
      if (which === "obelisk") {
        if (!ff.kS6) s.heroes = s.heroes.filter((h) => !(h.isSummon && h.kind === "dragon" && h.ownerUid === u.uid)); // tributa os 3 dragões (S6 os mantém)
        s.summonFx = { kind: "obelisk", id: Math.random() };
        const en = aliveEnemies(s); let tot = 0, killedMain = false;
        const main = en.slice().sort((a, b) => b.hp - a.hp)[0];
        en.forEach((e) => { e.buffs = []; tot += dealDamage(u, e, 1200 * ampU * u.tUlt, fx, { el: "Eletro", defPen: 20 }).dmg; });
        applyDebuff(aliveEnemies(s), { defDown: 40, turns: 3 }, 0, u);
        aliveEnemies(s).forEach((e) => { if (e.hp / e.maxHp < 0.25) { e.hp = 0; e.alive = false; if (main && e.uid === main.uid) killedMain = true; fx.push({ uid: e.uid, txt: "EXECUTADO", crit: true, id: Math.random() }); } });
        if (ff.kcMonarch && killedMain) { u.energy = Math.min(u.energyMax, u.energy + 100); msg += " (Orgulho do Monarca: +100 energia!)"; }
        msg = `💥 KAIBA INVOCA OBELISCO, O ATORMENTADOR! PUNHO DO DESTINO causa ${tot} de Dano Eletro em área, remove os buffs inimigos e reduz a DEF em 40% por 3 turnos. Inimigos abaixo de 25% de HP são DESTRUÍDOS.` + msg + (ff.kS6 ? " Os dragões permaneceram em campo!" : "");
      } else {
        s.heroes = s.heroes.filter((h) => !(h.isSummon && h.kind === "dragon" && h.ownerUid === u.uid)); // funde os 3 dragões
        const life = ff.kS6 ? 3 : 2;
        const ult = makeSummon(u, { uid: `S_${u.uid}_special`, name: "Blue-Eyes Ultimate Dragon", avatar: "🐲", atkMul: 2.4, hpMul: 1.8, mul: 200, spd: 180, kind: "ultimate", life, elements: ["Eletro", "Holy", "Fogo"], imgKey: "ultimate" });
        ult.pierce = true;
        s.heroes.push(ult);
        s.summonFx = { kind: "ultimate", id: Math.random() };
        const bursts = ff.kS6 ? 2 : 1;
        const en = aliveEnemies(s); let tot = 0;
        for (let b = 0; b < bursts; b++) { en.forEach((e) => { if (e.alive) ["Eletro", "Holy", "Fogo"].forEach((el) => { tot += dealDamage(ult, e, (850 / 3) * ampU / Math.max(1, en.length), fx, { el, defPen: 50, pierceShield: true }).dmg; }); }); }
        if (ff.kcMonarch) { u.buffs.push({ stat: "critDmg", value: 40, pct: false, turns: life + 1, name: "Monarca" }); msg += " (Orgulho do Monarca: +40% Dano CRÍTICO!)"; }
        msg = `💥 KAIBA FUNDE OS 3 BLUE-EYES NO DRAGÃO BRANCO DEFINITIVO! RAJADA NEUTRÔNICA TRIPLA${bursts > 1 ? " (×2)" : ""} causa ${tot} de Dano Trimultielemental (Eletro+Holy+Fogo), ignorando 50% das resistências e perfurando escudos. A Fusão luta por ${life} turnos a 180 de Velocidade.` + msg;
      }
      if (ff.kS4) { applyBuff(allies, { critDmg: 35, all: true, turns: 3 }, u.name, fx, u); msg += " Decreto Soberano: +35% Dano CRÍTICO para o time por 3 turnos!"; }
      refreshKaibaBuffs(s);
      tickBuffs(u); u.av = 10000 / Math.max(1, effStat(u, "spd"));
      pushLog(s, msg); s = checkEnd(s); s.turn = null; return s;
    });
  }

  function autoAct(uid) {
    setState((s0) => {
      let s = { ...s0, heroes: s0.heroes.map(cloneU), enemies: s0.enemies.map(cloneU), fx: [] };
      const u = findUnit(s, uid); if (!u || !u.alive) { s.turn = null; return s; }
      tickDots(u, s.fx);
      if (!u.alive) { pushLog(s, `${u.name} sucumbe ao dano contínuo!`); s = checkEnd(s); s.turn = null; return s; }
      refreshKaibaBuffs(s);
      const fx = s.fx, sk = u.skill || {}, allies = s.heroes.filter((h) => h.alive), enemies = aliveEnemies(s);
      let msg = "";
      if (u.isSummon) {
        const tgt = enemies.slice().sort((a, b) => a.hp - b.hp)[0];
        const isDragon = u.kind === "dragon";
        const aoeNow = u.firstHit && isDragon; // dragão dá dano em ÁREA no 1º golpe; depois só single-target
        if (tgt) {
          const op = { pierceShield: !!u.pierce };
          const hitList = aoeNow ? enemies : [tgt];
          let tot = 0;
          hitList.forEach((e) => {
            if (!e.alive) return;
            if (u.elements && u.elements.length > 1) u.elements.forEach((el) => { tot += dealDamage(u, e, u.mul, fx, { ...op, el }).dmg; });
            else tot += dealDamage(u, e, u.mul, fx, { ...op, el: u.element }).dmg;
            if (u.dragonVuln && e.alive) e.debuffs.push({ stat: "vuln", value: 15, turns: 2, name: "Vuln" });
          });
          msg = `${u.name} ${aoeNow ? "irrompe em ÁREA" : "investe em " + tgt.name} — ${tot}${u.pierce ? " (perfura escudos)" : ""}.`;
          // a investida do dragão recarrega o Mestre dos Dragões
          if (isDragon) { const owner = s.heroes.find((h) => h.uid === u.ownerUid && h.alive); if (owner && owner.energyMax) owner.energy = Math.min(owner.energyMax, owner.energy + Math.round(5 * (1 + (effStat(owner, "energyRegen") || 0) / 100))); }
        }
        if (u.firstHit) u.firstHit = false;
        if (isFinite(u.life)) { u.life -= 1; if (u.life <= 0) { u.alive = false; msg += ` ${u.name} se dissipa.`; } }
      } else {
        const role = u.roleKey;
        if (role === "healer" && (sk.heal || sk.ultHeal)) { const tgt = allies.slice().sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp)[0]; const h = sk.heal || { mul: 80, flat: 300 }; healUnit(tgt, Math.round(effStat(u, "atk") * h.mul / 100 + h.flat), fx); msg = `${u.name} cura ${tgt.name}`; }
        else if (role === "buffer" && sk.skillBuff) { applyBuff(allies, sk.skillBuff, u.name, fx, u); msg = `${u.name} fortalece o time`; }
        else if (role === "shield" && sk.shield) { const tgt = allies.slice().sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp)[0]; tgt.shield += Math.round(effStat(u, "def") * (sk.shield.defMul / 100) + sk.shield.flat); msg = `${u.name} escuda ${tgt.name}`; }
        else if (role === "debuffer" && sk.skillDebuff && enemies[0]) { applyDebuff([enemies[0]], sk.skillDebuff, 0, u); if (sk.skillDot) applyDot([enemies[0]], sk.skillDot, u, fx); if (sk.skillMul) dealDamage(u, enemies[0], sk.skillMul, fx); msg = `${u.name} enfraquece o inimigo`; }
        else { const tgt = enemies.slice().sort((a, b) => b.hp - a.hp)[0]; if (tgt) { const full = u.energyMax && u.energy >= u.energyMax; if (full && sk.ultMul) { u.energy = 0; if (sk.ultAoe) enemies.forEach((e) => dealDamage(u, e, sk.ultMul, fx)); else dealDamage(u, tgt, sk.ultMul, fx); msg = `💥 ${u.name} usa Ultimate!`; } else { const m = sk.skillMul || sk.basicMul || 100; if (sk.aoe && sk.skillMul) enemies.forEach((e) => dealDamage(u, e, m, fx)); else dealDamage(u, tgt, m, fx); if (sk.skillDot) applyDot(sk.aoe ? enemies : [tgt], sk.skillDot, u, fx); u.energy = Math.min(u.energyMax, u.energy + 22); msg = `${u.name} ataca ${tgt.name}`; } } }
      }
      tickBuffs(u); u.av = 10000 / Math.max(1, effStat(u, "spd"));
      s.hitFx = { el: u.element, big: !!(u.elements && u.elements.length > 1), support: !fx.some((x) => !x.heal && !x.dot), id: Math.random() };
      pushLog(s, msg); s = checkEnd(s); s.turn = null; return s;
    });
  }

  function enemyAct() {
    setState((s0) => {
      let s = { ...s0, heroes: s0.heroes.map(cloneU), enemies: s0.enemies.map(cloneU), fx: [] };
      const u = findUnit(s, current.uid); if (!u || !u.alive) { s.turn = null; return s; }
      tickDots(u, s.fx, s.heroes.filter((h) => h.alive));
      if (!u.alive) { pushLog(s, `${u.name} sucumbe ao dano contínuo!`); s = checkEnd(s); s.turn = null; return s; }
      const fx = s.fx; u.actCount++;
      refreshKaibaBuffs(s);
      const allAllies = s.heroes.filter((h) => h.alive);
      const realHeroes = allAllies.filter((h) => !h.isSummon);
      const targetable = realHeroes.length ? realHeroes : allAllies;
      const enraged = u.boss && u.hp / u.maxHp < 0.4;
      const rage = enraged ? 1.25 : 1;
      const taunter = allAllies.find((h) => h.skill?.taunt && h.alive);
      let msg = "";

      const pickTarget = () => {
        if (taunter) return taunter;
        const healer = targetable.find((h) => h.roleKey === "healer");
        const carry = targetable.slice().sort((a, b) => effStat(b, "atk") - effStat(a, "atk"))[0];
        const weakest = targetable.slice().sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp)[0];
        const r = Math.random();
        if (healer && r < 0.32) return healer;        // negar sustento
        if ((u.boss || r < 0.45)) return carry;        // ameaçar o DPS
        return weakest;                                 // finalizar o mais fraco
      };

      // Tower Boss special mechanics
      if (u.alive && u.boss && u.bossKind === "aizen") {
        const hpPct = u.hp / u.maxHp;
        if (!u.aiBankai && hpPct <= 0.70) { u.aiBankai = true; u.hp = Math.min(u.maxHp, u.hp + Math.round(u.maxHp * 0.15)); u.base = { ...u.base, atk: Math.round(u.base.atk * 1.4), def: Math.round(u.base.def * 1.5) }; pushLog(s, `🌌 AIZEN entra em BANKAI — Kyōka Suigetsu! Restaura 15% HP, ATK×1.4, DEF×1.5. Ataques não têm mais 40% de chance de errar!`); }
        if (!u.aiTranscend && hpPct <= 0.30) { u.aiTranscend = true; u.res = [...(u.res || []), "Vento", "Glacial"]; u.base.spd = Math.round(u.base.spd * 1.3); pushLog(s, `✨ AIZEN transcende! Resistência total e VEL ×1.3 — ele é invencível!`); }
      }
      if (u.alive && u.boss && u.bossKind === "sukuna") {
        const hpPct = u.hp / u.maxHp;
        if (!u.suRCT && hpPct <= 0.50) { u.suRCT = true; const heal = Math.round(u.maxHp * 0.20); u.hp = Math.min(u.maxHp, u.hp + heal); pushLog(s, `🩸 SUKUNA ativa Técnica Cursista Reversa — restaura ${heal} HP (20%)!`); }
        if (!u.su10shadows && hpPct <= 0.25) { u.su10shadows = true; u.base = { ...u.base, atk: Math.round(u.base.atk * 1.6), def: Math.round(u.base.def * 1.3) }; pushLog(s, `👁️ SUKUNA invoca as 10 Sombras! ATK×1.6, DEF×1.3!`); }
        if (u.actCount % 5 === 0 && u.actCount > 0) {
          allAllies.forEach(h => { h.debuffs.push({ stat: "vuln", value: 30, turns: 3, name: "Domínio" }); h.debuffs.push({ stat: "def", value: -30, pct: true, turns: 3, name: "Malrep" }); });
          let tot2 = 0; allAllies.forEach(h => { tot2 += dealDamage(u, h, 220 * rage, fx).dmg; }); pushLog(s, `🔴 SUKUNA expande o DOMÍNIO AMALDIÇOADO! ${tot2} dano em todos + 30% VULN + -30% DEF por 3 turnos!`); s = checkEnd(s); s.turn = null; return s;
        }
      }
      if (u.alive && u.boss && u.bossKind === "godkaiba") {
        const hpPct = u.hp / u.maxHp;
        if (!u.gkObelisco && hpPct <= 0.50) { u.gkObelisco = true; u.base = { ...u.base, atk: Math.round(u.base.atk * 1.5), def: Math.round(u.base.def * 1.3) }; u.res = [...(u.res || []), "Holy"]; pushLog(s, `⚡ GOD KAIBA entra na FASE DO OBELISCO! ATK×1.5, DEF×1.3, resiste Holy!`); }
        if (u.actCount % 3 === 0 && u.actCount > 0) {
          let tot2 = 0; allAllies.forEach(h => { tot2 += dealDamage(u, h, 160 * rage, fx, { el: "Eletro" }).dmg; h.debuffs.push({ stat: "atk", value: -20, pct: true, turns: 2, name: "Supressão" }); }); pushLog(s, `⚡ PUNHO DO DESTINO! ${tot2} dano Eletro em área + ATK↓20% por 2 turnos!`); s = checkEnd(s); s.turn = null; return s;
        }
      }
      // BOSS RUSH MECHANICS
      if (u.alive && u.boss && u.bossKind === "byakuya") {
        const bankai = u.hp / u.maxHp < 0.5;
        if (u.actCount % 3 === 0 && u.actCount > 0) {
          let tot = 0;
          allAllies.forEach(function(h) {
            const hasBleed = (h.dots||[]).some(function(d){return d.type==="bleed";});
            const mul = 200 * rage * (bankai ? 1.35 : 1) * (hasBleed ? 1.3 : 1);
            tot += dealDamage(u, h, mul, fx, { el: "Holy" }).dmg;
            if (bankai && h.alive) h.debuffs.push({ stat: "def", value: -20, pct: true, turns: 2, name: "Petala" });
          });
          msg = "SENBONZAKURA KAGEYOSHI! " + u.name + " desencadeia mil petalas - " + tot + " de dano total" + (bankai ? " (BANKAI!)" : "") + "!";
        } else if (!msg) {
          const t = pickTarget();
          if (t) { const r = dealDamage(u, t, 110 * rage, fx, { el: "Holy" }); msg = u.name + " ataca " + t.name + " com petalas - " + r.dmg + (r.crit ? " (CRITICO!)" : "") + "."; }
        }
      } else if (u.alive && u.boss && u.bossKind === "sukuna") {
        const hpPctS = u.hp / u.maxHp;
        if (!u._sukDom70 && hpPctS <= 0.70) { u._sukDom70 = true; allAllies.forEach(function(h){ h.debuffs.push({ stat: "def", value: -30, pct: true, turns: 3, name: "Dominio" }); h.debuffs.push({ stat: "vuln", value: 30, turns: 3, name: "Dominio" }); }); pushLog(s, "SUKUNA expande o DOMINIO AMALDICAO! -30% DEF e +30% Vuln!"); }
        if (!u._sukDom40 && hpPctS <= 0.40) { u._sukDom40 = true; allAllies.forEach(function(h){ h.debuffs.push({ stat: "def", value: -30, pct: true, turns: 3, name: "Dominio2" }); h.debuffs.push({ stat: "vuln", value: 30, turns: 3, name: "Dominio2" }); }); pushLog(s, "SUKUNA expande o DOMINIO NOVAMENTE! Todos enfraquecidos!"); }
        if (u.actCount > 0 && u.actCount % 5 === 0 && u.shield === 0) { u.shield = 200000; pushLog(s, "Sukuna reconstroi a [Tecnica Maldita]! Escudo de 200.000 HP! Use Virus/Hazard Digital!"); }
        if (u.actCount % 2 === 0 && u.actCount > 0) {
          const t = pickTarget();
          if (t) { const r = dealDamage(u, t, 180 * rage, fx, { defPen: 30 }); msg = "SUKUNA usa CLEAVE em " + t.name + " - " + r.dmg + " de dano!" + (r.crit ? " CRITICO!" : ""); }
        } else if (!msg) {
          const t = pickTarget();
          if (t) { const r = dealDamage(u, t, 120 * rage, fx); msg = u.name + " ataca " + t.name + " - " + r.dmg + (r.crit ? " (CRITICO!)" : "") + "."; }
        }
      } else if (u.alive && u.boss && u.bossKind === "frieren") {
        if (!u.counterSpell) u.counterSpell = 0;
        u.counterSpell += 1;
        if (u.counterSpell >= 3) {
          u.counterSpell = 0;
          const t = pickTarget();
          if (t) { t.debuffs.push({ stat: "spd", value: -9999, pct: false, turns: 1, name: "Paralisia" }); pushLog(s, "CONTRA-FEITCO! " + t.name + " esta paralisado por 1 turno!"); }
        }
        if (!u._frierenForbidden && u.hp / u.maxHp < 0.30) {
          u._frierenForbidden = true;
          allAllies.forEach(function(h){ if (h.alive) h.dots.push({ type: "freeze", dmg: Math.round(effStat(u,"atk")*0.25), turns: 2 }); });
          const heal = Math.round(u.maxHp * 0.05); u.hp = Math.min(u.maxHp, u.hp + heal);
          pushLog(s, "MAGIA PROIBIDA! Frieren recupera " + heal + " HP e congela todos os aliados!");
        }
        if (u.actCount % 4 === 0 && u.actCount > 0) {
          let tot = 0;
          for (let wi = 0; wi < 7; wi++) { const t = pickTarget(); if (t && t.alive) tot += dealDamage(u, t, 80 * rage, fx, { el: "Glacial" }).dmg; }
          msg = "GRACA DAS FADAS! Frieren lanca 7 ondas magicas - " + tot + " de Dano Glacial total!";
        } else if (!msg) {
          const t = pickTarget();
          if (t) { const r = dealDamage(u, t, 100 * rage, fx, { el: "Glacial" }); msg = u.name + " conjura feitco em " + t.name + " - " + r.dmg + (r.crit ? " (CRITICO!)" : "") + "."; }
        }
      } else if (u.elite && u.actCount === 1) {
        u.buffs.push({ stat: "atk", value: 35, pct: true, turns: 99, name: "Fúria" });
        const t = pickTarget(); const r = t ? dealDamage(u, t, 90 * rage, fx) : { dmg: 0 };
        msg = `${u.name} entra em FÚRIA (ATK↑) e golpeia ${t ? t.name : ""} por ${r.dmg}.`;
      } else if (u.boss && u.bossKind === "venom" && u.actCount % 2 === 0) {
        const t = pickTarget(); if (t) { t.dots.push({ type: "poison", dmg: Math.round(effStat(u, "atk") * 0.5), turns: 3 }); const r = dealDamage(u, t, 60 * rage, fx); msg = `☣️ ${u.name} injeta veneno corrosivo em ${t.name} — ${r.dmg} de dano + Veneno por 3 turnos!`; }
      } else if (u.boss && u.bossKind === "stone" && u.actCount % 3 === 0) {
        u.shield += Math.round(u.maxHp * 0.18); const t = pickTarget(); const r = t ? dealDamage(u, t, 135 * rage, fx) : { dmg: 0 };
        msg = `🗿 ${u.name} cristaliza uma carapaça (escudo) e esmaga ${t ? t.name : ""} por ${r.dmg}!`;
      } else if (u.boss && (u.actCount % 3 === 0 || (enraged && u.actCount % 2 === 0))) {
        let tot = 0; allAllies.forEach((h) => { tot += dealDamage(u, h, 72 * rage, fx).dmg; });
        realHeroes.forEach((h) => h.debuffs.push({ stat: "def", value: -25, pct: true, turns: 2, name: "DEF↓" }));
        msg = `💥 ${u.name} desfere um ataque DEVASTADOR em área — ${tot} de dano total e reduz a DEF de todos!${enraged ? " (ENFURECIDO!)" : ""}`;
      } else if (u.boss && u.actCount % 5 === 0) {
        u.shield += Math.round(u.maxHp * 0.12); const t = pickTarget(); const r = t ? dealDamage(u, t, 80 * rage, fx) : { dmg: 0 };
        msg = `${u.name} se protege com uma barreira e fere ${t ? t.name : ""} por ${r.dmg}.`;
      } else if (u.boss && Math.random() < 0.3) {
        const carry = targetable.slice().sort((a, b) => effStat(b, "atk") - effStat(a, "atk"))[0];
        if (carry) { carry.debuffs.push({ stat: "vuln", value: 25, turns: 2, name: "Vuln" }); carry.debuffs.push({ stat: "atk", value: -20, pct: true, turns: 2, name: "ATK↓" }); const r = dealDamage(u, carry, 95 * rage, fx); msg = `${u.name} mira ${carry.name}, enfraquecendo seu ATK e aumentando o dano recebido — ${r.dmg} de dano.`; }
      } else {
        const t = pickTarget();
        if (t) { const r = dealDamage(u, t, 100 * rage, fx); msg = `${u.name} ataca ${t.name} — ${r.dmg}${r.crit ? " (CRÍTICO!)" : ""}.`; }
      }
      { const omg = s.heroes.find((h) => h.id === "omegamon" && h.alive);
        if (omg) {
          let hits = 0; s.heroes.forEach((h) => { if (h._omgHit) { hits += h._omgHit; h._omgHit = 0; } });
          if (hits > 0) {
            const cap = omg.stFlags?.omgC1 ? 8 : 5;
            omg.omgCharges = Math.min(cap, (omg.omgCharges || 0) + hits);
            omg.buffs = omg.buffs.filter((b) => b.name !== "VirusDefeat");
            if (omg.omgCharges > 0) omg.buffs.push({ stat: "critDmg", value: 15 * omg.omgCharges, turns: 99, name: "VirusDefeat" });
            u.debuffs.push({ stat: "def", value: -10 * hits, pct: true, turns: 3, name: "VírusDef" });
            if (omg.omgCharges >= cap && omg.stFlags?.omgC1) omg.buffs.push({ stat: "spd", value: 25, turns: 2, name: "Sobrecarga" });
            pushLog(s, `☢️ [Vírus Defeat] x${omg.omgCharges} — +${15 * omg.omgCharges}% CRIT DMG em ${omg.name}; DEF do atacante reduzida.`);
          }
        } }
      tickBuffs(u); u.av = 10000 / Math.max(1, effStat(u, "spd"));
      s.hitFx = { el: u.element, big: u.boss && (u.actCount % 3 === 0 || (enraged && u.actCount % 2 === 0)), enemy: true, id: Math.random() };
      pushLog(s, msg); s = checkEnd(s); s.turn = null; return s;
    });
  }

  const isHeroTurn = current && current.side === "H" && !current.auto && !current.isSummon;
  const activeHero = isHeroTurn ? state.heroes.find((h) => h.uid === current.uid) : null;
  const canUlt = activeHero && activeHero.energyMax && activeHero.energy >= activeHero.energyMax && (activeHero.id !== "kaiba" || aliveDragons(state, activeHero.uid).length >= 3);
  const stageEl = (current ? ELEMENTS[current.element] : null) || ELEMENTS.Holy;

  return (
    <div style={{ minHeight: "calc(100vh - 56px)", display: "flex", flexDirection: "column" }}>
      <style>{`@keyframes srFloat{0%{transform:translateY(0);opacity:1}100%{transform:translateY(-40px);opacity:0}}`}</style>
      <div style={{ padding: "12px 14px", flex: 1, display: "flex", flexDirection: "column", gap: 12, background: `radial-gradient(700px 300px at 50% 12%, ${stageEl?.soft || "#1a1433"}, transparent)` }}>
        <div className="flex items-center justify-between">
          <span style={{ ...ORB, fontWeight: 800, fontSize: 14 }}>{context === "tower" ? `🗼 Andar ${encounter.floor}` : context === "coop" ? "🛰️ Domínio Co-op" : context === "tagdungeon" ? `🗝️ ${encounter.tag || "Dungeon"}` : "⚔️ Batalha"}{(state.totalWaves || 1) > 1 && <span style={{ color: C.gold }}> · Onda {state.wave}/{state.totalWaves}</span>}</span>
          {current && <span style={{ fontSize: 12, color: C.mute }}>Vez de <Glow color={stageEl.color}>{current.name}</Glow></span>}
          {!state.over && <button onClick={() => onEnd({ win: false, abort: true, turns: state.heroTurns })} style={{ fontSize: 12, color: C.mute, border: `1px solid ${C.line}`, borderRadius: 8, padding: "3px 10px" }}>Recuar</button>}
        </div>

        {!state.over && <TurnOrderBar units={[...state.heroes, ...state.enemies]} />}

        {/* inimigos */}
        <div className="flex gap-2" style={{ flexWrap: "wrap" }}>
          {state.enemies.map((e, i) => { const al = aliveEnemies(state); const isTarget = al[target]?.uid === e.uid; const eel = ELEMENTS[e.element] || { color: C.line, glyph: "✦" }; return (
            <button key={e.uid} disabled={!e.alive} onClick={() => { const idx = al.findIndex((x) => x.uid === e.uid); if (idx >= 0) setTarget(idx); }}
              style={{ flex: 1, minWidth: 96, position: "relative", opacity: e.alive ? 1 : 0.3, border: `2px solid ${isTarget && e.alive ? C.bad : C.line}`, borderRadius: 12, padding: 8, background: e.boss ? "linear-gradient(180deg,#2a1020,#160a16)" : C.panel, boxShadow: isTarget && e.alive ? `0 0 14px ${C.bad}66` : "none" }}>
              <FX fx={state.fx} uid={e.uid} />
              <div className="flex items-center justify-between" style={{ marginBottom: 2 }}>
                <span style={{ fontSize: 9, color: eel.color }}>{eel.glyph} {e.boss ? "CHEFE" : `Nv ${e.level}`}</span>
                {e.shield > 0 && <span style={{ fontSize: 9, color: "#9fdcff" }}>🛡{Math.round(e.shield)}</span>}
              </div>
              <EnemyAvatar e={e} size={e.boss ? 48 : 36} />
              <div style={{ fontSize: 10, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{e.name}</div>
              <Bar value={e.hp} max={e.maxHp} color={C.bad} />
              <div style={{ fontSize: 9, color: C.mute }}>{Math.round(e.hp)} / {e.maxHp}</div>
              <DotPips unit={e} />
              {(e.res?.length > 0 || e.weak?.length > 0) && <div style={{ fontSize: 8, lineHeight: 1.3, marginTop: 1 }}>
                {e.res?.length > 0 && <div style={{ color: "#9aa0b5" }}>RES: {e.res.map((el) => ELEMENTS[el]?.glyph || el).join("")}</div>}
                {e.weak?.length > 0 && <div style={{ color: "#7CFFB0" }}>FRACO: {e.weak.map((el) => ELEMENTS[el]?.glyph || el).join("")}</div>}
              </div>}
              {e.debuffs.length > 0 && <div style={{ fontSize: 9, color: "#FF8FA0", marginTop: 1 }}>{[...new Set(e.debuffs.map((d) => d.name))].join(" ")}</div>}
            </button>); })}
        </div>
        {state.summonFx && <SummonFx data={state.summonFx} />}
        {state.hitFx && <AttackFx data={state.hitFx} />}

        {/* log */}
        <div ref={logRef} style={{ background: `${C.bg1}cc`, border: `1px solid ${C.line}`, borderRadius: 12, padding: 10, height: 96, overflowY: "auto", fontSize: 12, color: C.mute }}>
          {state.log.map((l, i) => <div key={i} style={{ marginBottom: 2 }}>{l}</div>)}
        </div>

        {/* heróis */}
        {(state.frostZone || 0) > 0 && <div style={{ textAlign: "center", fontSize: 11, color: "#6FE3FF", fontWeight: 700, padding: "2px 0" }}>❄️ Zona de Geada ativa ({state.frostZone}) — Miyabi em Postura Iaido permanente</div>}
        {state.sfZona && <div style={{ textAlign: "center", fontSize: 11, color: ELEMENTS["Vento"]?.color || "#7CFFB0", fontWeight: 700, padding: "2px 0" }}>🦋 Zona de Condução ativa ({state.sfZona.turns}) — Follow-ups e CRIT amplificados!</div>}
        <div className="flex gap-2" style={{ flexWrap: "wrap" }}>
          {state.heroes.map((h) => { const active = current && current.uid === h.uid; const el = ELEMENTS[h.element] || { color: C.line }; const full = !h.isSummon && h.energyMax > 0 && h.energy >= h.energyMax; return (
            <div key={h.uid} style={{ flex: 1, minWidth: 112, position: "relative", opacity: h.alive ? 1 : 0.35, border: `2px solid ${active ? C.gold : el.color + "55"}`, borderRadius: 12, padding: 8, background: C.panel, boxShadow: active ? `0 0 16px ${C.gold}55` : "none" }}>
              <FX fx={state.fx} uid={h.uid} />
              <div className="flex items-center gap-2">
                <CombatPortrait h={h} size={40} active={active} />
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{h.name}{h.isSummon && <span style={{ color: el.color }}> ⟡</span>}</div>
                  {h.isSummon && isFinite(h.life) && <div style={{ fontSize: 9, color: el.color }}>⏳ {h.life} turno(s)</div>}
                  {!h.isSummon && h.energyMax > 0 && <div style={{ fontSize: 9, color: full ? C.gold : "#B98BFF" }}>⚡ {Math.round(h.energy)}/{h.energyMax}{full ? " · PRONTO" : ""}</div>}
                  {h.id === "miyabi" && (h.stFlags?.miPostura) && <div style={{ fontSize: 9, color: "#6FE3FF" }}>{"❄".repeat(Math.min(h.posturePH || 0, h.stFlags?.miC6 ? 4 : 3))}{"·".repeat(Math.max(0, (h.stFlags?.miC6 ? 4 : 3) - (h.posturePH || 0)))} {((h.posturePH || 0) >= (h.stFlags?.miC6 ? 4 : 3)) ? "Postura Iaido!" : "PH"}</div>}
                  {h.id === "soifon" && <div style={{ fontSize: 9, color: ELEMENTS["Vento"]?.color || "#7CFFB0" }}>{h.sfPostura ? "🦋 POSTURA DE FERRÃO!" : `🦋 Vibração ${h.sfCharges || 0}/3`}</div>}
                </div>
              </div>
              {h.shield > 0 && <div style={{ fontSize: 10, color: "#9fdcff", marginTop: 3 }}>🛡 {Math.round(h.shield)}</div>}
              <div style={{ marginTop: 3 }}><Bar value={h.hp} max={h.maxHp} color={C.good} /></div>
              <div style={{ fontSize: 9, color: C.mute }}>{Math.round(h.hp)} / {h.maxHp}</div>
              <DotPips unit={h} />
              {h.buffs.length > 0 && <div style={{ fontSize: 9, color: C.good, marginTop: 1 }}>{[...new Set(h.buffs.map((b) => b.stat))].slice(0, 4).map((s) => "↑" + (STAT_LABEL[s] || s)).join(" ")}</div>}
              {h.debuffs.length > 0 && <div style={{ fontSize: 9, color: "#FF8FA0", marginTop: 1 }}>{[...new Set(h.debuffs.map((d) => d.name))].join(" ")}</div>}
            </div>); })}
        </div>

        {/* PH */}
        <div className="flex items-center gap-2" style={{ fontSize: 13 }}>
          <span style={{ color: C.mute }}>Pontos de Habilidade</span>
          {Array.from({ length: 5 }).map((_, i) => <span key={i} style={{ width: 13, height: 13, borderRadius: 99, background: i < state.sp ? C.gold : C.line, boxShadow: i < state.sp ? `0 0 6px ${C.gold}` : "none" }} />)}
        </div>
      </div>

      {/* ações */}
      <div style={{ padding: "12px 14px 20px", background: `${C.bg0}f0`, borderTop: `1px solid ${C.line}` }}>
        {state.over ? (
          <div style={{ textAlign: "center" }}>
            <div style={{ ...ORB, fontWeight: 800, fontSize: 24, color: state.win ? C.good : C.bad, textShadow: `0 0 18px ${(state.win ? C.good : C.bad)}66` }}>{state.win ? "VITÓRIA" : "DERROTA"}</div>
            <div style={{ color: C.mute, fontSize: 12, marginTop: 4 }}>voltando…</div>
          </div>
        ) : state.choice ? (
          <div>
            <div style={{ textAlign: "center", ...ORB, fontWeight: 800, fontSize: 14, color: C.gold, marginBottom: 8 }}>3 DRAGÕES EM CAMPO — ESCOLHA A INVOCAÇÃO SUPREMA</div>
            <div className="flex gap-3" style={{ justifyContent: "center", flexWrap: "wrap" }}>
              {[{ k: "obelisk", id: "obelisk", emoji: "🗿", name: "Obelisco, o Atormentador", desc: "Tributa os 3 dragões: explosão SAGRADA (Holy) massiva em área agora + Obelisco luta 2 turnos com dano bruto altíssimo." },
                { k: "ultimate", id: "ultimate", emoji: "🐲", name: "Dragão Branco Definitivo", desc: "Funde os 3 Blue-Eyes: dragão independente por 5 turnos com dano Elétrico + Glacial a cada ataque." }].map((opt) => (
                <button key={opt.k} onClick={() => resolveKaibaUlt(opt.k)}
                  style={{ flex: 1, minWidth: 150, maxWidth: 230, textAlign: "left", border: `2px solid ${C.gold}77`, borderRadius: 14, padding: 10, background: "linear-gradient(180deg,#1a1530,#0f0b22)", cursor: "pointer", boxShadow: `0 0 16px ${C.gold}22` }}>
                  <div className="flex items-center gap-2" style={{ marginBottom: 6 }}>
                    <Avatar ch={{ id: opt.id, element: opt.k === "obelisk" ? "Holy" : "Eletro", avatar: opt.emoji }} size={42} ring={C.gold} />
                    <span style={{ ...ORB, fontWeight: 800, fontSize: 13, color: C.gold }}>{opt.name}</span>
                  </div>
                  <div style={{ fontSize: 11, color: C.mute, lineHeight: 1.4 }}>{opt.desc}</div>
                </button>))}
            </div>
          </div>
        ) : isHeroTurn ? (() => { const nm = skillNamesOf(activeHero.id); const kaiba3 = activeHero.id === "kaiba" && aliveDragons(state, activeHero.uid).length >= 3;
          const _kindLabel = { basic: "Ataque Básico", skill: "Perícia · 1 PH", ult: "Ultimate" };
          const _kindName  = { basic: nm[0], skill: nm[1], ult: nm[2] };
          const _holdBtn = (kind, btnProps, children) => <Btn {...btnProps} onClick={null}
            onPointerDown={() => startHold(kind)} onPointerUp={() => endHold(kind)}
            onPointerLeave={cancelHold} onPointerCancel={cancelHold}
            style={{ flex: 1, minWidth: 96, userSelect: "none", WebkitUserSelect: "none", ...btnProps.style }}>{children}</Btn>;
          return (
          <div style={{ position: "relative" }}>
            {previewKind && (() => {
              const pvLines = skillPreviewLines(activeHero, previewKind);
              return <div style={{ position: "absolute", bottom: "calc(100% + 8px)", left: "50%", transform: "translateX(-50%)", width: 272, background: "rgba(7,6,19,0.98)", border: `2px solid ${C.gold}`, borderRadius: 8, padding: "12px 14px", zIndex: 50, boxShadow: `0 8px 32px rgba(0,0,0,0.85), 0 0 20px ${C.gold}22`, pointerEvents: "none" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: `1px solid ${C.line}`, paddingBottom: 6, marginBottom: 8 }}>
                  <span style={{ fontWeight: 700, fontSize: 14, color: "#fff" }}>{_kindName[previewKind]}</span>
                  <span style={{ background: C.panelHi, color: C.gold, padding: "2px 7px", borderRadius: 4, fontSize: 10, textTransform: "uppercase", letterSpacing: 1 }}>{_kindLabel[previewKind]}</span>
                </div>
                {pvLines.map((l, i) => <div key={i} style={{ fontSize: 12, color: C.mute, lineHeight: 1.75 }} dangerouslySetInnerHTML={{ __html: l.replace(/<b>(.*?)<\/b>/g, `<b style="color:${C.gold};font-weight:600">$1</b>`) }} />)}
                <div style={{ fontSize: 10, color: C.dim, marginTop: 8, borderTop: `1px solid ${C.line}`, paddingTop: 6 }}>Solte para cancelar · Clique rápido para usar</div>
              </div>;
            })()}
            <div className="flex gap-2" style={{ flexWrap: "wrap", justifyContent: "center" }}>
              {_holdBtn("basic", { kind: "soft" }, <>⚔️ {nm[0]}</>)}
              {_holdBtn("skill", { disabled: state.sp <= 0 }, <>✦ {nm[1]} <span style={{ fontSize: 10, opacity: 0.8 }}>(1 PH)</span></>)}
              {_holdBtn("ult", { kind: canUlt ? "primary" : "soft", disabled: !canUlt }, <>{canUlt ? "💥 " : "⏳ "}{activeHero.id === "kaiba" && activeHero.energy >= activeHero.energyMax && !kaiba3 ? `Precisa 3 dragões (${aliveDragons(state, activeHero.uid).length}/3)` : kaiba3 && canUlt ? "Invocação Suprema" : nm[2]}</>)}
            </div>
            <div style={{ textAlign: "center", fontSize: 11, color: C.mute, marginTop: 6 }}>{abilityHint(activeHero)}</div>
          </div>); })() : <div style={{ textAlign: "center", color: C.mute, fontSize: 13 }}>{current && (current.side === "enemy") ? "⚔️ Turno do inimigo…" : "🤝 Aliado agindo…"}</div>}
      </div>
    </div>
  );
}
function abilityHint(h) {
  const sk = h.skill || {};
  if (h.id === "kaiba") return "Habilidade invoca Blue-Eyes (até 3). Com 3 em campo, o Ultimate libera Obelisco ou o Dragão Definitivo.";
  const parts = [];
  if (sk.heal || sk.ultHeal) parts.push("cura aliados");
  if (sk.shield || sk.ultShield) parts.push("concede escudo");
  if (sk.skillBuff || sk.ultBuff) parts.push("fortalece o time");
  if (sk.skillDebuff || sk.ultDebuff) parts.push("enfraquece inimigos");
  if (sk.skillDot) parts.push(DOT_INFO[sk.skillDot.type]?.n?.toLowerCase());
  if (sk.aoe || sk.ultAoe) parts.push("dano em área");
  return parts.length ? "Esta unidade " + parts.join(", ") + "." : "Concentre o Ultimate para o golpe decisivo.";
}
function EnergyRing({ pct, full, size }) {
  const r = size / 2 - 2, c = 2 * Math.PI * r, off = c * (1 - Math.max(0, Math.min(1, pct)));
  return <svg width={size} height={size} style={{ position: "absolute", top: -3, left: -3, transform: "rotate(-90deg)", pointerEvents: "none" }}>
    <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#2a2350" strokeWidth="3" />
    <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={full ? C.gold : "#B98BFF"} strokeWidth="3" strokeDasharray={c} strokeDashoffset={off} strokeLinecap="round" style={{ filter: full ? `drop-shadow(0 0 4px ${C.gold})` : "none", transition: "stroke-dashoffset .35s" }} />
  </svg>;
}
function DotPips({ unit }) {
  if (!unit.dots || !unit.dots.length) return null;
  return <div style={{ display: "flex", gap: 3, justifyContent: "center", marginTop: 2, flexWrap: "wrap" }}>
    {unit.dots.map((d, i) => <span key={i} title={DOT_INFO[d.type]?.n} style={{ fontSize: 8, color: "#08060f", background: DOT_INFO[d.type]?.c || "#fff", borderRadius: 99, padding: "0 4px", fontWeight: 800 }}>{(DOT_INFO[d.type]?.n || "?")[0]}{d.turns}</span>)}
  </div>;
}
function CombatPortrait({ h, size = 44, active }) {
  const el = ELEMENTS[h.element] || { color: C.line };
  const pct = h.energyMax ? h.energy / h.energyMax : 0;
  const full = h.energyMax && h.energy >= h.energyMax;
  return <div style={{ position: "relative", width: size, height: size, flexShrink: 0 }}>
    <Avatar ch={h} size={size} ring={active ? C.gold : el.color} />
    {!h.isSummon && h.energyMax > 0 && <EnergyRing pct={pct} full={full} size={size} />}
  </div>;
}
function AttackFx({ data }) {
  const el = ELEMENTS[data.el] || { color: "#fff", glyph: "✦" };
  const support = data.support;
  const color = support ? C.good : el.color;
  const glyph = support ? "✦" : el.glyph;
  const big = data.big;
  const size = big ? 220 : 130;
  const streaks = support ? 0 : (big ? 14 : 9);
  return <div style={{ position: "fixed", inset: 0, zIndex: 55, pointerEvents: "none", display: "flex", alignItems: "center", justifyContent: "center", animation: big ? "srShakeAll .42s ease-in-out" : "none" }}>
    <style>{`
      @keyframes srAtkPop{0%{transform:scale(.3);opacity:0}25%{opacity:1}100%{transform:scale(1.4);opacity:0}}
      @keyframes srAtkStreak{0%{transform:translate(-50%,-50%) rotate(var(--a)) translateY(0);opacity:0}30%{opacity:1}100%{transform:translate(-50%,-50%) rotate(var(--a)) translateY(${big ? -260 : -150}px);opacity:0}}
      @keyframes srShakeAll{0%,100%{transform:translate(0,0)}20%{transform:translate(-6px,4px)}40%{transform:translate(5px,-4px)}60%{transform:translate(-4px,-3px)}80%{transform:translate(4px,3px)}}
    `}</style>
    <div style={{ position: "absolute", width: size, height: size, borderRadius: "50%", background: `radial-gradient(circle, ${color}cc, ${color}33 45%, transparent 70%)`, boxShadow: `0 0 ${big ? 90 : 45}px ${color}`, animation: "srAtkPop .55s ease-out forwards" }} />
    {Array.from({ length: streaks }).map((_, i) => <div key={i} style={{ position: "absolute", left: "50%", top: "50%", width: big ? 4 : 3, height: big ? 80 : 50, background: `linear-gradient(${color}, transparent)`, transformOrigin: "center bottom", "--a": `${i * (360 / Math.max(1, streaks))}deg`, animation: `srAtkStreak ${big ? 0.6 : 0.5}s ${i * 0.015}s ease-out forwards` }} />)}
    <div style={{ position: "absolute", fontSize: big ? 80 : 46, textShadow: `0 0 24px ${color}`, animation: "srAtkPop .55s ease-out forwards" }}>{glyph}</div>
    {big && !support && <div style={{ position: "absolute", bottom: "26%", ...ORB, fontWeight: 800, fontSize: 16, color, textShadow: "0 2px 8px #000", animation: "srAtkPop .7s ease-out forwards" }}>{data.el}</div>}
  </div>;
}
function predictTurnOrder(units, n) {
  const sim = units.filter((u) => u.alive).map((u) => ({ ref: u, av: (isFinite(u.av) && u.av >= 0 ? u.av : 9999), spd: Math.max(1, effStat(u, "spd")) }));
  const order = [];
  for (let i = 0; i < (n || 7) && sim.length; i++) {
    sim.sort((a, b) => a.av - b.av);
    const nx = sim[0], t = nx.av;
    sim.forEach((x) => (x.av -= t));
    order.push(nx.ref);
    nx.av = 10000 / nx.spd;
  }
  return order;
}
function TurnOrderBar({ units }) {
  const order = predictTurnOrder(units, 7);
  return <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "4px 2px 10px", overflowX: "auto" }}>
    <span style={{ fontSize: 9, color: C.mute, whiteSpace: "nowrap", marginRight: 2 }}>PRÓXIMOS ▸</span>
    {order.map((u, i) => { const el = ELEMENTS[u.element] || { color: C.line }; const enemy = u.side === "enemy"; const isHero = u.side === "H"; return (
      <div key={i} style={{ position: "relative", flexShrink: 0 }}>
        <div style={{ width: i === 0 ? 38 : 30, height: i === 0 ? 38 : 30, borderRadius: 99, border: `2px solid ${enemy ? C.bad : el.color}`, background: enemy ? "#2a1018" : C.panelHi, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", boxShadow: i === 0 ? `0 0 8px ${enemy ? C.bad : el.color}` : "none" }}>
          {isHero ? <Avatar ch={{ id: u.id || u.imgKey, element: u.element, avatar: u.avatar }} size={i === 0 ? 38 : 30} /> : <span style={{ fontSize: i === 0 ? 20 : 16 }}>{u.avatar}</span>}
        </div>
        {i === 0 && <div style={{ position: "absolute", bottom: -9, left: 0, right: 0, textAlign: "center", fontSize: 7, color: C.gold, fontWeight: 800 }}>AGORA</div>}
      </div>); })}
  </div>;
}
function SummonFx({ data }) {
  const gold = data.kind === "obelisk";
  return <div style={{ position: "fixed", inset: 0, zIndex: 60, pointerEvents: "none", display: "flex", alignItems: "center", justifyContent: "center", animation: "srSummon 1.6s ease-out forwards" }}>
    <style>{`@keyframes srSummon{0%{opacity:0;transform:scale(.6)}18%{opacity:1}55%{opacity:1;transform:scale(1.05)}100%{opacity:0;transform:scale(1.2)}}`}</style>
    <div style={{ position: "absolute", inset: 0, background: gold ? "radial-gradient(circle at 50% 55%, #ffd76a55, transparent 60%)" : "radial-gradient(circle at 50% 55%, #6fd6ff55, transparent 60%)" }} />
    <div style={{ width: 6, height: "70%", background: gold ? "linear-gradient(#fff,#ffcf4a,transparent)" : "linear-gradient(#fff,#6fd6ff,transparent)", boxShadow: gold ? "0 0 60px 20px #ffcf4a" : "0 0 60px 20px #6fd6ff", borderRadius: 99 }} />
    <div style={{ position: "absolute", fontSize: 90, textShadow: gold ? "0 0 30px #ffcf4a" : "0 0 30px #6fd6ff" }}>{gold ? "🗿" : "🐲"}</div>
    <div style={{ position: "absolute", bottom: "22%", ...ORB, fontWeight: 800, fontSize: 18, color: gold ? "#ffcf4a" : "#6fd6ff", textShadow: "0 2px 10px #000" }}>{gold ? "OBELISCO, O ATORMENTADOR!" : "DRAGÃO BRANCO DEFINITIVO!"}</div>
  </div>;
}
function FX({ fx, uid }) {
  const items = fx.filter((f) => f.uid === uid);
  if (!items.length) return null;
  const colorOf = (f) => f.heal ? C.good : f.dot ? (DOT_INFO[f.dot]?.c || "#fff") : f.crit ? C.gold : (f.el && ELEMENTS[f.el]?.color) || "#ffd9d9";
  return <div style={{ position: "absolute", top: -6, left: 0, right: 0, textAlign: "center", pointerEvents: "none", zIndex: 5 }}>
    {items.map((f) => <div key={f.id} style={{ animation: "srFloat 1s ease-out forwards", fontWeight: 800, fontSize: f.crit ? 18 : f.dot ? 11 : 14, color: colorOf(f), textShadow: "0 1px 3px #000" }}>{f.dot ? "🔥" : ""}{f.txt}{f.crit ? "!" : ""}</div>)}
  </div>;
}

/* ==========================================================================
   CO-OP (storage compartilhado)
   ========================================================================== */
async function publishChar(playerName, o) {
  try {
    const def = CHAR_MAP[o.id]; if (!def) return;
    const payload = { player: playerName, name: def.name, avatar: def.avatar, element: def.element, role: def.role, rarity: def.rarity, level: o.level, eidolon: o.eidolon, stats: computeStats(o), skill: def.skill, updatedAt: Date.now() };
    const ok = await cloudSet("coop", playerName + "_" + def.id, payload); // co-op global de verdade
    if (!ok) await SS.set(PUB_KEY + def.id + "_" + Math.random().toString(36).slice(2, 6), JSON.stringify(payload), true);
  } catch {}
}
async function fetchRandomAlly() {
  const cloud = await cloudRandomAlly(); if (cloud) return cloud;
  try { const res = await SS.list(PUB_KEY, true); if (res?.keys?.length) { const r = await SS.get(pick(res.keys), true); if (r) return JSON.parse(r.value); } } catch {}
  return null;
}
function defaultAlly() { const o = { id: "yoruichi", level: 70, eidolon: 2, weapon: "thunderclaws", relics: EMPTY_RELICS() }; const st = computeStats(o); return { player: "Aliada IA", name: "Yoruichi", avatar: CHAR_MAP.yoruichi.avatar, element: "Eletro", role: "dps", rarity: 5, level: 70, eidolon: 2, stats: st, skill: CHAR_MAP.yoruichi.skill }; }

function Coop({ team, ownedMap, stamina, setStamina, setRelicInv, flash, setBattle }) {
  const [setName, setSetName] = useState(RELIC_SET_NAMES[0]);
  const [ally, setAlly] = useState(null);
  useEffect(() => { (async () => setAlly((await fetchRandomAlly()) || defaultAlly()))(); }, []);

  function start() {
    if (stamina < 40) { flash("Stamina insuficiente (precisa 40)", C.bad); return; }
    if (!team.length) { flash("Monte uma equipe", C.bad); return; }
    setStamina((s) => s - 40);
    const onResolve = (res) => {
      if (res.win) {
        const n = 2 + Math.floor(Math.random() * 3), drops = [];
        for (let i = 0; i < n; i++) { drops.push(makeRelic(Math.floor(Math.random() * 6), setName)); }
        setRelicInv((p) => [...p, ...drops]); flash(`Domínio limpo! +${drops.length} relíquias`, C.good);
      } else flash("O domínio resistiu…", C.bad);
    };
    setBattle({ context: "coop", encounter: { level: 45, count: 3, boss: true }, ally, onResolve });
  }

  return (
    <div className="flex flex-col gap-4">
      <Panel glow={C.good}>
        <div className="flex items-center gap-2"><span style={{ fontSize: 22 }}>🛰️</span><b style={{ ...ORB, fontSize: 18 }}>Domínio Cooperativo</b></div>
        <p style={{ fontSize: 13, color: C.mute, marginTop: 6 }}>Sua equipe + um 5º personagem <Glow color={C.gold}>de outro jogador real</Glow> (publicado no Co-op global). Limpe pra farmar o conjunto escolhido — o co-op dá mais drops.</p>
      </Panel>
      <Panel>
        <b>Aliado co-op</b>
        {ally && <div className="flex items-center gap-3 mt-2"><Avatar ch={{ id: ally.player === "Aliada IA" ? "yoruichi" : "ally", element: ally.element, avatar: ally.avatar }} size={48} /><div><div style={{ fontWeight: 700 }}>{ally.name} <Rarity n={ally.rarity} /></div><div style={{ fontSize: 12, color: C.mute }}>de <Glow color={C.gold}>{ally.player}</Glow> · Nv {ally.level}{ally.eidolon ? ` · E${ally.eidolon}` : ""} · {ROLES[ally.role]?.label}</div></div></div>}
        <Btn kind="ghost" style={{ marginTop: 10, padding: "6px 12px" }} onClick={async () => setAlly((await fetchRandomAlly()) || defaultAlly())}>Trocar aliado</Btn>
        <div style={{ fontSize: 11, color: C.mute, marginTop: 8 }}>Publique seus personagens no Elenco para aparecerem para outros jogadores.</div>
      </Panel>
      <Panel>
        <b>Conjunto a farmar</b>
        <div className="flex gap-1 flex-wrap mt-2">{RELIC_SET_NAMES.map((s) => <Chip key={s} active={setName === s} color={RELIC_SETS[s].color} onClick={() => setSetName(s)}>{s}</Chip>)}</div>
        <div style={{ fontSize: 12, color: C.mute, marginTop: 8 }}>{setBonusText(RELIC_SETS[setName])}</div>
      </Panel>
      <Panel>
        <div className="flex items-center justify-between"><b>Custo</b><span>40 ⚡ (você tem {stamina})</span></div>
        <Btn disabled={stamina < 40} style={{ marginTop: 10 }} onClick={start}>Iniciar domínio cooperativo</Btn>
      </Panel>
    </div>
  );
}

/* ==========================================================================
   RELÍQUIAS
   ========================================================================== */
function RelicsScreen({ relicInv }) {
  if (!relicInv.length) return <Empty msg="Sem relíquias. Vá ao Co-op farmar conjuntos." />;
  const bySet = {}; relicInv.forEach((r) => (bySet[r.set] = bySet[r.set] || []).push(r));
  return <div className="flex flex-col gap-4">{Object.entries(bySet).map(([set, list]) => (
    <Panel key={set} glow={RELIC_SETS[set]?.color}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ItemIcon id={RELIC_ITEM_ID[set]} emoji={RELIC_EMOJI[set] || "💎"} size={22} />
          <b style={{ color: RELIC_SETS[set]?.color }}>{set}</b>
        </div>
        <span style={{ fontSize: 12, color: C.mute }}>{list.length} peças</span>
      </div>
      <div style={{ fontSize: 12, color: C.mute, marginTop: 2 }}>4pç: {RELIC_SETS[set]?.d4}</div>
      <div className="grid gap-2 mt-3" style={{ gridTemplateColumns: "repeat(auto-fill,minmax(130px,1fr))" }}>
        {list.map((r) => <div key={r.id} style={{ background: C.panelHi, border: `1px solid ${C.line}`, borderRadius: 10, padding: 8 }}><div style={{ fontSize: 10, color: C.mute }}>{RELIC_SLOTS[r.slot ?? 0]?.name}</div><div style={{ fontSize: 12 }}>{relicMainText(r)} <span style={{color:C.mute}}>+{r.level||0}</span></div></div>)}
      </div>
    </Panel>))}</div>;
}

/* ==========================================================================
   ADMIN (fotos do Imgur)
   ========================================================================== */
function AdminPlayersTab() {
  const images = useImg();
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const accounts = await loadAccounts();
      const entries = await Promise.all(
        Object.entries(accounts).map(async ([em, acc]) => {
          let save = null;
          try { save = await loadSave(saveKeyFor(em)); } catch {}
          return {
            email: em,
            lastSeen: acc.lastSeen || acc.created || 0,
            playerName: save?.playerName || em.split("@")[0],
            owned: (save?.owned || []).filter((o) => CHAR_MAP[o.id]),
            team: save?.team || [],
            jade: save?.jade || 0,
            chronicles: save?.chronicles || 0,
            towerCleared: save?.towerCleared || 0,
            charTickets: save?.charTickets || 0,
          };
        })
      );
      entries.sort((a, b) => b.lastSeen - a.lastSeen);
      setPlayers(entries);
    } catch {}
    setLoading(false);
  };

  useEffect(() => { load(); }, []); // eslint-disable-line

  const online = (ts) => ts && Date.now() - ts < 10 * 60 * 1000;
  const fmtTime = (ts) => {
    if (!ts) return "nunca";
    const d = Date.now() - ts;
    if (d < 60000) return "agora mesmo";
    if (d < 3600000) return `${Math.floor(d / 60000)} min atrás`;
    if (d < 86400000) return `${Math.floor(d / 3600000)}h atrás`;
    return `${Math.floor(d / 86400000)}d atrás`;
  };

  const onlineCount = players.filter((p) => online(p.lastSeen)).length;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div style={{ fontSize: 13, color: C.mute }}>
          <span style={{ color: C.good, fontWeight: 700 }}>{onlineCount} online</span>
          {" · "}{players.length} conta(s) registrada(s)
        </div>
        <Btn kind="ghost" style={{ padding: "4px 12px", fontSize: 12 }} onClick={load}>🔄 Atualizar</Btn>
      </div>

      {loading && (
        <div style={{ color: C.mute, textAlign: "center", padding: 32, fontSize: 14 }}>
          Carregando dados dos jogadores…
        </div>
      )}

      {!loading && players.length === 0 && (
        <div style={{ color: C.mute, textAlign: "center", padding: 32 }}>Nenhuma conta encontrada.</div>
      )}

      {!loading && players.map((p) => {
        const isOnline = online(p.lastSeen);
        const isOpen = expanded === p.email;
        const fiveStars = p.owned.filter((o) => CHAR_MAP[o.id]?.rarity === 5);

        return (
          <Panel key={p.email} style={{ padding: 12, border: `1px solid ${isOnline ? C.good + "44" : C.line}`, cursor: "pointer" }}>
            {/* Cabeçalho clicável */}
            <div className="flex items-center justify-between" onClick={() => setExpanded(isOpen ? null : p.email)}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="flex items-center gap-2">
                  <span style={{
                    width: 8, height: 8, borderRadius: "50%", flexShrink: 0,
                    background: isOnline ? C.good : C.dim,
                    boxShadow: isOnline ? `0 0 8px ${C.good}` : "none",
                    display: "inline-block"
                  }} />
                  <span style={{ fontWeight: 800, color: C.text, fontSize: 15 }}>{p.playerName}</span>
                  {p.email === ADMIN_EMAIL && <Glow color={C.gold}>👑</Glow>}
                  <span style={{
                    fontSize: 10, padding: "1px 7px", borderRadius: 99, fontWeight: 700,
                    background: isOnline ? "rgba(0,255,136,0.15)" : "rgba(255,255,255,0.05)",
                    color: isOnline ? C.good : C.mute,
                  }}>{isOnline ? "ONLINE" : "Offline"}</span>
                </div>
                <div style={{ fontSize: 11, color: C.dim, marginTop: 3, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {p.email} · visto {fmtTime(p.lastSeen)}
                </div>
                <div className="flex items-center gap-1 flex-wrap" style={{ fontSize: 11, color: C.mute, marginTop: 2 }}><ItemIcon id="item_jade" emoji="💎" size={11} /> {p.jade} · <ItemIcon id="item_chronicles" emoji="📜" size={11} /> {p.chronicles} · <ItemIcon id="item_ticket_char" emoji="🎴" size={11} /> {p.charTickets} · 🗼 {p.towerCleared}/{TOWER_FLOORS} · {p.owned.length} personagens ({fiveStars.length} ★5)</div>
              </div>
              <span style={{ color: C.mute, fontSize: 14, marginLeft: 8, flexShrink: 0 }}>{isOpen ? "▲" : "▼"}</span>
            </div>

            {/* Elenco expandido */}
            {isOpen && (
              <div style={{ marginTop: 12, paddingTop: 10, borderTop: `1px solid ${C.line}` }}>
                {p.owned.length === 0 && <div style={{ color: C.dim, fontSize: 12 }}>Sem personagens ainda.</div>}
                <div className="flex flex-wrap gap-2">
                  {p.owned.map((o) => {
                    const def = CHAR_MAP[o.id];
                    if (!def) return null;
                    const inTeam = p.team.includes(o.id);
                    const el = ELEMENTS[def.element] || { color: C.line };
                    return (
                      <div key={o.id} style={{ textAlign: "center", width: 60 }}>
                        <div style={{ position: "relative", display: "inline-block" }}>
                          <Avatar ch={def} size={48} ring={inTeam ? C.gold : undefined} />
                          {inTeam && (
                            <span style={{
                              position: "absolute", top: -3, right: -5, fontSize: 8,
                              background: C.gold, color: "#1a1200",
                              borderRadius: 99, padding: "1px 4px", fontWeight: 800
                            }}>EQ</span>
                          )}
                        </div>
                        <div style={{ fontSize: 9, color: C.mute, marginTop: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{def.name}</div>
                        <div style={{ fontSize: 9, color: def.rarity === 5 ? C.gold : "#B98BFF", fontWeight: 700 }}>
                          Nv{o.level}{o.eidolon ? ` E${o.eidolon}` : ""}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </Panel>
        );
      })}
    </div>
  );
}
function Admin({ images, setImages, flash }) {
  const [tab, setTab] = useState("chars");
  const setImg = (id, url) => setImages((m) => { const next = { ...m, [id]: url }; cloudSet("meta", "images", { map: next }); _ls.set("sr_shared_images", JSON.stringify(next)); return next; });
  const clearImg = (id) => setImages((m) => { const n = { ...m }; delete n[id]; cloudSet("meta", "images", { map: n }); _ls.set("sr_shared_images", JSON.stringify(n)); return n; });
  return (
    <div className="flex flex-col gap-4">
      <Panel glow={C.gold}>
        <div style={{ ...ORB, fontSize: 18, fontWeight: 800 }}>🛠️ Painel Admin</div>
        <p style={{ fontSize: 13, color: C.mute, marginTop: 6 }}>Cole o link direto da imagem (Imgur) de cada personagem e arma. Use o link que termina em <b>.jpg</b>/<b>.png</b> (ex: <span style={{ color: C.text }}>https://i.imgur.com/XXXX.png</span>). A imagem aparece no jogo inteiro na hora.</p>
      </Panel>
      <div className="flex gap-2" style={{ flexWrap: "wrap" }}><TabBtn active={tab === "chars"} onClick={() => setTab("chars")}>Personagens</TabBtn><TabBtn active={tab === "weapons"} onClick={() => setTab("weapons")}>Armas</TabBtn><TabBtn active={tab === "summons"} onClick={() => setTab("summons")}>Invocações</TabBtn><TabBtn active={tab === "items"} onClick={() => setTab("items")}>🎒 Itens</TabBtn><TabBtn active={tab === "bosses"} onClick={() => setTab("bosses")}>💀 Chefes</TabBtn><TabBtn active={tab === "players"} onClick={() => setTab("players")}>👥 Players</TabBtn></div>
      {tab === "chars" && <div className="flex flex-col gap-2">{ROSTER.map((c) => <AdminRow key={c.id} id={c.id} name={`${c.name} · ${c.element} · ${ROLES[c.role].label}`} rarity={c.rarity} fallback={c.avatar} element={c.element} url={images[c.id] || ""} setImg={setImg} clearImg={clearImg} flash={flash} />)}</div>}
      {tab === "weapons" && <div className="flex flex-col gap-2">{WEAPONS.map((w) => <AdminRow key={w.id} id={w.id} name={`${w.name} · ${ROLES[w.role].label}`} rarity={w.rarity} fallback="🗡️" weapon url={images[w.id] || ""} setImg={setImg} clearImg={clearImg} flash={flash} />)}</div>}
      {tab === "summons" && <div className="flex flex-col gap-2">
        <Panel style={{ padding: 10 }}><p style={{ fontSize: 12, color: C.mute }}>Fotos das invocações do Kaiba. Aparecem no campo de batalha e na tela de escolha do Ultimate.</p></Panel>
        {[["dragon", "Blue-Eyes White Dragon", "Eletro", "🐉"], ["obelisk", "Obelisco, o Atormentador", "Holy", "🗿"], ["ultimate", "Blue-Eyes Ultimate Dragon", "Eletro", "🐲"]].map(([id, nm, elv, fb]) =>
          <AdminRow key={id} id={id} name={nm} rarity={5} fallback={fb} element={elv} url={images[id] || ""} setImg={setImg} clearImg={clearImg} flash={flash} />)}
      </div>}
      {tab === "items" && <div className="flex flex-col gap-2">
        <Panel style={{ padding: 10 }}><p style={{ fontSize: 12, color: C.mute }}>Cole links de imagem (Imgur .png/.jpg) para cada item. As fotos aparecem no inventário e nas telas do jogo.</p></Panel>
        {GAME_ITEMS.map((it) => <AdminItemRow key={it.id} id={it.id} name={it.name} icon={it.icon} url={images[it.id] || ""} setImg={setImg} clearImg={clearImg} flash={flash} />)}
      </div>}
      {tab === "bosses" && <div className="flex flex-col gap-2">
        <Panel style={{ padding: 10 }}><p style={{ fontSize: 12, color: C.mute }}>Fotos dos chefes especiais da Torre (andares 50, 60, 70). Cole o link direto da imagem (Imgur .png/.jpg). A foto aparece no painel da Torre e na tela de batalha.</p></Panel>
        {Object.entries(TOWER_BOSSES).map(([f, bd]) => {
          const el = ELEMENTS[bd.element] || { color: C.line };
          return <AdminRow key={bd.bossImgId} id={bd.bossImgId} name={`Andar ${f} · ${bd.name} · ${bd.title}`} rarity={5} fallback="💀" element={bd.element} url={images[bd.bossImgId] || ""} setImg={setImg} clearImg={clearImg} flash={flash} />;
        })}
        <Panel style={{ padding: 10, marginTop: 8 }}><b style={{ fontSize: 13 }}>⚡ Boss Rush — End Game</b><p style={{ fontSize: 12, color: C.mute, marginTop: 4 }}>Fotos dos chefes do Boss Rush (End Game). Cole o link direto da imagem (Imgur .png/.jpg).</p></Panel>
        {BOSS_RUSH_BOSSES.map((boss) => <AdminRow key={boss.imgKey} id={boss.imgKey} name={boss.name + " · " + boss.element} rarity={5} fallback={boss.avatar} element={boss.element} url={images[boss.imgKey] || ""} setImg={setImg} clearImg={clearImg} flash={flash} />)}
      </div>}
      {tab === "players" && <AdminPlayersTab />}
    </div>
  );
}
function AdminItemRow({ id, name, icon, url, setImg, clearImg, flash }) {
  const images = useImg();
  const imgUrl = url || images[id] || "";
  const [val, setVal] = useState(imgUrl);
  const [imgErr, setImgErr] = useState(false);
  useEffect(() => setVal(imgUrl), [imgUrl]);
  useEffect(() => { setImgErr(false); }, [imgUrl]);
  return (
    <Panel style={{ padding: 12 }}>
      <div className="flex items-center gap-3">
        <div style={{ width: 48, height: 48, borderRadius: 12, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, flexShrink: 0, overflow: "hidden" }}>
          {imgUrl && !imgErr ? <img src={imgUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} onError={() => setImgErr(true)} /> : icon}
        </div>
        <div style={{ flex: 1, overflow: "hidden" }}><div style={{ fontWeight: 700, fontSize: 13 }}>{name}</div><div style={{ fontSize: 11, color: C.mute }}>{id}</div></div>
      </div>
      <div className="flex gap-2 mt-2">
        <input value={val} onChange={(e) => setVal(e.target.value)} placeholder="https://i.imgur.com/...png" style={{ flex: 1, background: C.panelHi, border: `1px solid ${C.line}`, borderRadius: 10, padding: "8px 10px", color: C.text, outline: "none", fontSize: 13 }} />
        <Btn style={{ padding: "6px 12px" }} onClick={() => { const v = val.trim(); if (v && !/^https?:\/\//.test(v)) { flash("Link precisa começar com http", C.bad); return; } setImg(id, v); flash("Foto salva", C.good); }}>Salvar</Btn>
        {imgUrl && <Btn kind="danger" style={{ padding: "6px 12px" }} onClick={() => { clearImg(id); setVal(""); }}>Limpar</Btn>}
      </div>
    </Panel>
  );
}
function AdminRow({ id, name, rarity, fallback, element, weapon, url, setImg, clearImg, flash }) {
  const [val, setVal] = useState(url);
  useEffect(() => setVal(url), [url]);
  const color = rarity === 5 ? C.gold : "#B98BFF";
  return (
    <Panel style={{ padding: 12 }}>
      <div className="flex items-center gap-3">
        {weapon ? <WeaponIcon w={{ id, rarity }} size={48} /> : <Avatar ch={{ id, element, avatar: fallback }} size={48} />}
        <div style={{ flex: 1, overflow: "hidden" }}><div style={{ fontWeight: 700, fontSize: 13 }}>{name}</div><Rarity n={rarity} /></div>
      </div>
      <div className="flex gap-2 mt-2">
        <input value={val} onChange={(e) => setVal(e.target.value)} placeholder="https://i.imgur.com/...png" style={{ flex: 1, background: C.panelHi, border: `1px solid ${C.line}`, borderRadius: 10, padding: "8px 10px", color: C.text, outline: "none", fontSize: 13 }} />
        <Btn style={{ padding: "6px 12px" }} onClick={() => { const v = val.trim(); if (v && !/^https?:\/\//.test(v)) { flash("Link precisa começar com http", C.bad); return; } setImg(id, v); flash("Foto salva", C.good); }}>Salvar</Btn>
        {url && <Btn kind="danger" style={{ padding: "6px 12px" }} onClick={() => { clearImg(id); setVal(""); }}>Limpar</Btn>}
      </div>
    </Panel>
  );
}


function Social({ email, flash }) {
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    loadAccounts().then((accounts) => {
      const list = Object.entries(accounts).map(([em, data]) => ({
        email: em,
        lastSeen: data.lastSeen || data.created || 0,
      })).sort((a, b) => b.lastSeen - a.lastSeen);
      setPlayers(list);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);
  const isOnline = (ts) => ts && Date.now() - ts < 10 * 60 * 1000;
  return (
    <div className="flex flex-col gap-4">
      <Panel glow="#007aff">
        <div style={{ ...ORB, fontWeight: 800, fontSize: 18 }}>🤝 Social</div>
        <div style={{ color: C.mute, fontSize: 13, marginTop: 4 }}>Jogadores registrados. Online = ativo nos últimos 10 min.</div>
      </Panel>
      <Panel>
        <b>Jogadores</b>
        {loading && <div style={{ color: C.mute, fontSize: 13, marginTop: 8 }}>Carregando…</div>}
        <div className="flex flex-col" style={{ marginTop: 8 }}>
          {!loading && players.length === 0 && <div style={{ color: C.mute, fontSize: 13 }}>Nenhum jogador encontrado.</div>}
          {players.map((p) => {
            const online = isOnline(p.lastSeen);
            const isMe = p.email === email;
            const nick = p.email.split("@")[0];
            return (
              <div key={p.email} className="flex items-center justify-between" style={{ padding: "10px 0", borderBottom: `1px solid ${C.line}` }}>
                <div>
                  <div style={{ fontWeight: 700, color: C.text }}>
                    {nick}
                    {isMe && <span style={{ color: C.mute, fontSize: 11 }}> · você</span>}
                    {p.email === ADMIN_EMAIL && <Glow color={C.gold}> 👑</Glow>}
                  </div>
                  <span style={{ fontSize: 11, marginTop: 3, display: "inline-block", background: online ? "rgba(0,255,136,0.15)" : "rgba(255,255,255,0.05)", color: online ? C.good : C.mute, padding: "1px 8px", borderRadius: 20, fontWeight: 700 }}>
                    {online ? "ONLINE" : "Offline"}
                  </span>
                </div>
                {!isMe && (
                  <button onClick={() => flash(`Solicitação enviada para ${nick}! 🤝`, C.good)}
                    style={{ background: "#007aff", color: "#fff", border: "none", padding: "6px 14px", borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                    Adicionar
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </Panel>
    </div>
  );
}
/* ==========================================================================
   LOGIN (local, por email) + PORTÃO DE AUTENTICAÇÃO
   ========================================================================== */
function Login({ onLogin }) {
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [pass2, setPass2] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit() {
    setErr("");
    const e = emailKey(email);
    if (!validEmail(e)) { setErr("Digite um email válido."); return; }
    if (pass.length < 4) { setErr("A senha precisa de pelo menos 4 caracteres."); return; }
    if (mode === "register" && pass !== pass2) { setErr("As senhas não conferem."); return; }
    setBusy(true);
    try {
      const accounts = await loadAccounts();
      if (mode === "register") {
        if (accounts[e]) { setErr("Já existe uma conta com esse email. Faça login."); setBusy(false); return; }
        accounts[e] = { hash: hashPass(pass), created: Date.now(), lastSeen: Date.now() };
        await saveAccounts(accounts);
        await onLogin(e);
      } else {
        const acc = accounts[e];
        if (!acc) { setErr("Conta não encontrada. Crie uma conta."); setBusy(false); return; }
        if (acc.hash !== hashPass(pass)) { setErr("Senha incorreta."); setBusy(false); return; }
        accounts[e] = { ...acc, lastSeen: Date.now() };
        await saveAccounts(accounts);
        await onLogin(e);
      }
    } catch {
      setErr("Erro ao acessar o armazenamento.");
      setBusy(false);
    }
  }
  const onKey = (ev) => { if (ev.key === "Enter") submit(); };

  return (
    <div style={{ minHeight: "100vh", background: `radial-gradient(1200px 600px at 75% -12%, ${C.bg1}, ${C.bg0}), radial-gradient(900px 500px at 10% 110%, #160d2e, ${C.bg0})`, color: C.text, fontFamily: "ui-sans-serif, system-ui, 'Segoe UI', sans-serif", display: "flex", alignItems: "center", justifyContent: "center", padding: 18 }}>
      <div style={{ width: "100%", maxWidth: 420 }}>
        <div style={{ textAlign: "center", marginBottom: 18 }}>
          <div style={{ fontSize: 44 }}>🌌</div>
          <div style={{ ...ORB, fontWeight: 800, letterSpacing: 3, fontSize: 24 }}><Glow color={C.gold}>STELLAR</Glow> RESONANCE</div>
          <div style={{ color: C.mute, fontSize: 13, marginTop: 2 }}>{mode === "login" ? "Entre na sua conta" : "Crie sua conta de Pioneiro"}</div>
        </div>
        <Panel glow={C.gold}>
          <div className="flex gap-2 mb-3">
            <TabBtn active={mode === "login"} onClick={() => { setMode("login"); setErr(""); }}>Entrar</TabBtn>
            <TabBtn active={mode === "register"} onClick={() => { setMode("register"); setErr(""); }}>Criar conta</TabBtn>
          </div>
          <label style={{ fontSize: 12, color: C.mute }}>Email</label>
          <input value={email} onChange={(e) => setEmail(e.target.value)} onKeyDown={onKey} type="email" autoComplete="email" placeholder="voce@email.com"
            style={{ width: "100%", background: C.panelHi, border: `1px solid ${C.line}`, borderRadius: 10, padding: "10px 12px", color: C.text, outline: "none", fontSize: 14, marginTop: 4, marginBottom: 12 }} />
          <label style={{ fontSize: 12, color: C.mute }}>Senha</label>
          <input value={pass} onChange={(e) => setPass(e.target.value)} onKeyDown={onKey} type="password" autoComplete={mode === "login" ? "current-password" : "new-password"} placeholder="••••••"
            style={{ width: "100%", background: C.panelHi, border: `1px solid ${C.line}`, borderRadius: 10, padding: "10px 12px", color: C.text, outline: "none", fontSize: 14, marginTop: 4, marginBottom: 12 }} />
          {mode === "register" && <>
            <label style={{ fontSize: 12, color: C.mute }}>Confirmar senha</label>
            <input value={pass2} onChange={(e) => setPass2(e.target.value)} onKeyDown={onKey} type="password" autoComplete="new-password" placeholder="••••••"
              style={{ width: "100%", background: C.panelHi, border: `1px solid ${C.line}`, borderRadius: 10, padding: "10px 12px", color: C.text, outline: "none", fontSize: 14, marginTop: 4, marginBottom: 12 }} />
          </>}
          {err && <div style={{ color: C.bad, fontSize: 13, marginBottom: 10 }}>{err}</div>}
          <Btn onClick={submit} disabled={busy} style={{ width: "100%" }}>{busy ? "Aguarde…" : mode === "login" ? "Entrar" : "Criar conta e entrar"}</Btn>
          <div style={{ fontSize: 11, color: C.dim, marginTop: 12, lineHeight: 1.5 }}>
            Login local no seu dispositivo (sem servidor). Cada conta tem seu próprio progresso salvo.
          </div>
        </Panel>
      </div>
    </div>
  );
}

/* ==========================================================================
   ERROR BOUNDARY — captura crashes de render e mostra mensagem amigável
   ========================================================================== */
class ErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { error: null }; }
  static getDerivedStateFromError(err) { return { error: err }; }
  componentDidCatch(err, info) { console.error('[Stellar Resonance] Erro de render:', err, info); }
  handleReset() { this.setState({ error: null }); }
  render() {
    if (this.state.error) {
      return (
        <div style={{ minHeight: '100vh', background: C.bg0, color: C.text, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24, fontFamily: 'ui-sans-serif, system-ui, sans-serif', gap: 16 }}>
          <div style={{ fontSize: 48 }}>⚠️</div>
          <div style={{ ...ORB, fontWeight: 800, fontSize: 20, color: C.gold }}>Algo deu errado</div>
          <div style={{ color: C.mute, fontSize: 14, maxWidth: 420, textAlign: 'center', lineHeight: 1.6 }}>
            Ocorreu um erro inesperado. Seu progresso está salvo — clique abaixo para tentar novamente.
          </div>
          <div style={{ color: C.dim, fontSize: 11, fontFamily: 'monospace', background: C.panel, padding: '8px 14px', borderRadius: 8, maxWidth: 480, wordBreak: 'break-all', textAlign: 'center' }}>
            {String(this.state.error?.message || this.state.error)}
          </div>
          <button onClick={() => this.handleReset()} style={{ marginTop: 8, background: C.gold, color: C.bg0, fontWeight: 800, fontSize: 14, padding: '10px 28px', borderRadius: 99, border: 'none', cursor: 'pointer', letterSpacing: 1 }}>
            Tentar novamente
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

function AppInner() {
  const [ready, setReady] = useState(false);
  const [session, setSession] = useState(null);

  useEffect(() => {
    let alive = true;
    const safety = setTimeout(() => { if (alive) setReady(true); }, 2600); // garante que a tela nunca trava
    (async () => {
      const r = await SS.get(SESSION_KEY);
      try { if (r) { const e = JSON.parse(r.value); if (e && alive) setSession(emailKey(e)); } } catch {}
      if (alive) { clearTimeout(safety); setReady(true); }
    })();
    return () => { alive = false; clearTimeout(safety); };
  }, []);

  async function doLogin(emailRaw) {
    const e = emailKey(emailRaw);
    setSession(e);
    await SS.set(SESSION_KEY, JSON.stringify(e));
  }
  async function doLogout() {
    setSession(null);
    await SS.del(SESSION_KEY);
  }

  if (!ready) return (
    <div style={{ minHeight: "100vh", background: C.bg0, color: C.mute, display: "flex", alignItems: "center", justifyContent: "center" }}>Carregando…</div>
  );
  if (!session) return (<><FontInject /><Login onLogin={doLogin} /></>);
  return <Game key={session} email={session} isAdmin={session === ADMIN_EMAIL} onLogout={doLogout} />;
}
export default function App() {
  return <ErrorBoundary><AppInner /></ErrorBoundary>;
}
