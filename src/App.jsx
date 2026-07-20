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
  Unknown: { color: "#EAEAEA", glyph: "❓", soft: "#2a2a2a" }, // elemento exclusivo da Shorekeeper — fora do pool aleatório de fraqueza/resistência dos inimigos
};
const ELEMENT_NAMES = Object.keys(ELEMENTS).filter(e => e !== "Unknown");

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
    skill: { basicMul: 80, skillMul: 260, aoe: true, skillDot: { type: "freeze", mul: 180, turns: 2 }, ultMul: 560, ultAoe: true, ultDot: { type: "freeze", mul: 230, turns: 2 } } }),
  mk({ id: "kaiba", name: "Seto Kaiba", title: "Mestre dos Dragões", element: "Eletro", role: "summoner", rarity: 5, avatar: "🃏", hp: 1180, atk: 720, def: 480, spd: 101, energy: 140, cr: 5, cd: 50, er: 30, elemDmg: 5, tags: ["Eletro", "Invocador", "Deus Egípcio", "Único"],
    skill: { basicMul: 100, kaibaBasic: true, skillMul: 0, kaibaSkill: true, ultMul: 850, kaibaUlt: true } }),
  // ---- T4 ----
  mk({ id: "renji", name: "Renji Abarai", title: "Zabimaru", element: "Chaos", role: "dps", rarity: 4, avatar: "🗡️", hp: 1060, atk: 705, def: 440, spd: 104, energy: 120, tags: ["Caos", "DPS", "Sangramento"],
    skill: { basicMul: 100, skillMul: 215, skillDot: { type: "bleed", mul: 50, turns: 2 }, ultMul: 380 } }),
  mk({ id: "ace", name: "Portgas D. Ace", title: "Punho de Fogo", element: "Fogo", role: "aoe", rarity: 4, avatar: "🔥", hp: 1110, atk: 685, def: 450, spd: 100, energy: 120, tags: ["Fogo", "Área", "Queimadura"],
    skill: { basicMul: 100, skillMul: 160, aoe: true, skillDot: { type: "burn", mul: 55, turns: 2 }, ultMul: 350, ultAoe: true, ultDot: { type: "burn", mul: 85, turns: 3 } } }),
  mk({ id: "usopp", name: "Usopp", title: "Atirador de Elite", element: "Vento", role: "debuffer", rarity: 4, avatar: "🎯", hp: 960, atk: 565, def: 420, spd: 107, energy: 120, tags: ["Vento", "Debuffador", "Suporte"],
    skill: { basicMul: 95, skillMul: 145, skillDebuff: { defDown: 32, vuln: 18, turns: 3 }, ultMul: 260, ultDebuff: { vuln: 28, all: true, turns: 2 } } }),
  mk({ id: "sakura", name: "Sakura Haruno", title: "Força Centena", element: "Holy", role: "dps", rarity: 4, avatar: "🌺", hp: 1150, atk: 660, def: 470, spd: 98, energy: 120, tags: ["Holy", "DPS", "Cura"],
    skill: { basicMul: 100, skillMul: 210, ultMul: 360, ultHeal: { mul: 65, flat: 380, all: true } } }),
  mk({ id: "chopper", name: "Chopper", title: "Médico de Bordo", element: "Glacial", role: "healer", rarity: 4, avatar: "🦌", hp: 1250, atk: 500, def: 520, spd: 100, energy: 120, tags: ["Gelo", "Cura", "Suporte"],
    skill: { basicMul: 60, heal: { mul: 120, flat: 250, all: false }, ultHeal: { mul: 90, flat: 460, all: true }, energyGift: 12 } }),
  mk({ id: "lancer", name: "Lancer", title: "Herói do Caos · Cu Chulainn", element: "Chaos", role: "dps", rarity: 4, avatar: "🏹", hp: 1120, atk: 745, def: 530, spd: 105, energy: 110, tags: ["Caos", "DPS", "Esquiva", "Sobrevivência"],
    skill: { basicMul: 100, lancerSkill: true, skillMul: 0, ultMul: 370, lancerUlt: true } }),
  mk({ id: "nanami", name: "Nanami", title: "7:3 de Proporção", element: "Chaos", role: "dps", rarity: 4, avatar: "💼", hp: 1180, atk: 760, def: 490, spd: 101, energy: 115, cd: 62, tags: ["Caos", "DPS", "Crítico", "Hora Extra"],
    skill: { basicMul: 100, nanamSkill: true, skillMul: 240, ultMul: 310, ultAoe: true, ultDebuff: { defDown: 15, all: true, turns: 2 } } }),
  mk({ id: "nami", name: "Nami", title: "Navegadora dos Ventos", element: "Vento", role: "aoe", rarity: 4, avatar: "🌊", hp: 1050, atk: 730, def: 440, spd: 104, energy: 120, tags: ["Vento", "DoT", "Área", "Ciclone"],
    skill: { basicMul: 90, skillMul: 160, aoe: true, skillDot: { type: "cyclone", mul: 50, turns: 2 }, ultMul: 340, ultAoe: true, namiUlt: true } }),
  mk({ id: "uraraka", name: "Uraraka", title: "Gravidade Zero", element: "Vento", role: "buffer", rarity: 4, avatar: "🎈", hp: 1210, atk: 630, def: 510, spd: 102, energy: 120, tags: ["Vento", "Suporte", "Velocidade", "Controle"],
    skill: { basicMul: 95, uraBasic: true, uraSkill: true, skillMul: 0, ultMul: 290, ultAoe: true, ultBuff: { atk: 15, all: true, turns: 2 } } }),
  // ---- T5 PADRÃO (saem ao perder o 50/50 e no banner permanente) ----
  mk({ id: "kirara", name: "Kirara", title: "Encontro Estelar", element: "Chaos", role: "shield", rarity: 5, avatar: "💫", hp: 1360, atk: 560, def: 620, spd: 99, energy: 90, tags: ["Caos", "Guardião", "Escudo", "Provocar"],
    skill: { basicMul: 80, shield: { defMul: 90, flat: 320 }, taunt: true, ultShield: { defMul: 10, flat: 2000, all: true }, ultBuff: { def: 30, all: true, turns: 2 }, energyGift: 8 } }),
  mk({ id: "yoruichi", name: "Yoruichi", title: "Deusa do Relâmpago", element: "Eletro", role: "dps", rarity: 5, avatar: "🐈‍⬛", hp: 1040, atk: 800, def: 410, spd: 125, energy: 120, cr: 10, cd: 62, tags: ["Eletro", "DPS", "Velocidade", "Ataque Extra"],
    skill: { basicMul: 300, yoruBasic: true, skillMul: 0, yoruSkill: true, ultMul: 2200, yoruUlt: true } }),
  mk({ id: "kiritsugu", name: "Kiritsugu", title: "Caçador de Magos", element: "Virus", role: "debuffer", rarity: 5, avatar: "🔫", hp: 1080, atk: 725, def: 450, spd: 108, energy: 120, cr: 8, cd: 56, tags: ["Vírus", "Debuffador", "Veneno"],
    skill: { basicMul: 100, skillMul: 205, skillDebuff: { defDown: 40, vuln: 22, turns: 3 }, skillDot: { type: "poison", mul: 70, turns: 3 }, ultMul: 365, ultDebuff: { vuln: 30, all: true, turns: 3 } } }),
  // ---- Ryoshu (Limitada) ----
  mk({ id: "ryoshu", name: "Ryoshu", title: "Lamina da Casa das Aranhas", element: "Virus", role: "dps", rarity: 5, avatar: "🕸", hp: 1320, atk: 1060, def: 520, spd: 114, energy: 120, cr: 22, cd: 75, elemDmg: 20.0, tags: ["Virus", "DPS", "Dreno de HP", "Execucao", "Dano Verdadeiro"],
    skill: { basicMul: 120, ryoBasic: true, skillMul: 255, ryoSkill: true, aoe: true, ultMul: 520, ultAoe: true, ryoUlt: true } }),
  // ---- Frieren (Limitada) ----
  mk({ id: "frieren", name: "Frieren", title: "Alem do Fim das Jornadas", element: "Holy", role: "aoe", rarity: 5, avatar: "🧝", hp: 1080, atk: 880, def: 430, spd: 103, energy: 110, cr: 8, cd: 58, elemDmg: 8.0, tags: ["Holy", "Maga", "AoE", "Elementalista", "Suporte"],
    skill: { basicMul: 90, frBasic: true, skillMul: 180, frSkill: true, ultMul: 470, frUlt: true } }),
  // ---- Lupa · A Predadora de Fusão (Limitada) ----
  mk({ id: "lupa", name: "Lupa", title: "A Predadora de Fusão", element: "Fogo", role: "dps", rarity: 5, avatar: "🐺", hp: 1240, atk: 940, def: 460, spd: 107, energy: 200, cr: 12, cd: 68, elemDmg: 6.0, tags: ["Fogo", "DPS", "Detonação de DoT", "Nuke"],
    skill: { basicMul: 150, lupaBasic: true, skillMul: 300, lupaSkill: true, ultMul: 850, ultAoe: true, lupaUlt: true } }),
  // ---- Hitori Gotoh · Bocchi the Rock! (Limitada) ----
  mk({ id: "hitori", name: "Hitori Gotoh", title: "Bocchi the Rock!", element: "Chaos", role: "buffer", rarity: 5, avatar: "🎸", hp: 1120, atk: 480, def: 440, spd: 101, energy: 160, cr: 8, cd: 50, tags: ["Chaos", "Suporte", "Buffer", "Ansiedade Social"],
    skill: { basicMul: 40, hitoriBasic: true, skillMul: 0, hitoriSkill: true, ultMul: 0, hitoriUlt: true } }),
  // ---- Soi Fon (Limitada) ----
  mk({ id: "soifon", name: "Soi Fon", title: "Capitã da 2ª Divisão", element: "Vento", role: "dps", rarity: 5, avatar: "🦋", hp: 1040, atk: 740, def: 420, spd: 118, energy: 120, cr: 8, cd: 56, tags: ["Vento", "Follow-up", "Sub DPS", "Assassina"],
    skill: { basicMul: 100, sfBasic: true, skillMul: 160, sfSkill: true, ultMul: 350, sfUlt: true } }),
  // ---- Omegamon Zwart D (Limitado) ----
  mk({ id: "omegamon", name: "Omegamon Zwart D", title: "Digital Hazard · Defeat", element: "Virus", role: "shield", rarity: 5, avatar: "🛡️", hp: 1900, atk: 950, def: 740, spd: 99, energy: 130, cr: 10, cd: 58, er: 22, elemDmg: 0, tags: ["Vírus", "Guardião", "Tanque", "Corrosão"],
    skill: { basicMul: 100, omgBasic: true, skillMul: 120, omgSkill: true, ultMul: 150, omgUlt: true } }),
    // ---- The Wonder of You (Limitado) ----
    mk({ id: "wonderofyou", name: "The Wonder of You", title: "A Calamidade Inevitável", element: "Chaos", role: "dps", rarity: 5, avatar: "🌑", hp: 1780, atk: 920, def: 590, spd: 109, energy: 130, cr: 14, cd: 62, tags: ["Chaos", "Calamidade", "DPS", "Debuffer"],
      skill: { basicMul: 100, wooBasic: true, skillMul: 210, wooSkill: true, ultMul: 400, wooUlt: true } }),
    // ---- Athena (Limitada) ----
    mk({ id: "athena", name: "Athena", title: "A Autoridade das Sete Casas", element: "Holy", role: "healer", rarity: 5, avatar: "🕊️", hp: 1620, atk: 610, def: 560, spd: 103, energy: 140, cr: 6, cd: 46, er: 20, tags: ["Holy", "Suporte", "Cura", "Buffer"],
      skill: { basicMul: 90, athBasic: true, skillMul: 130, athSkill: true, ultMul: 210, athUlt: true } }),
  // ---- Agumon · The Thermodynamic Core (Limitado) ----
  mk({ id: "agumon", name: "Agumon", title: "O Núcleo Termodinâmico", element: "Fogo", role: "dps", rarity: 5, avatar: "🦖", hp: 1480, atk: 730, def: 520, spd: 106, energy: 120, cr: 10, cd: 58, tags: ["Fogo", "DPS", "Evolução", "Calor"],
      skill: { basicMul: 95, aguBasic: true, skillMul: 165, aguSkill: true, ultMul: 300, aguUlt: true } }),
  // ---- Tsukishiro Yanagi · Teorema da Desordem (Limitada) ----
  mk({ id: "shorekeeper", name: "Shorekeeper", title: "Guardiã da Costa Negra", element: "Unknown", role: "healer", rarity: 5, avatar: "🌌", hp: 2400, atk: 340, def: 460, spd: 100, energy: 130, cr: 5, cd: 50, er: 20, tags: ["Desconhecido", "Suporte", "Cura", "Domínio"],
    skill: { basicMul: 100, shkBasic: true, skillMul: 0, shkSkill: true, ultMul: 300, shkUlt: true } }),
  mk({ id: "yanagi", name: "Tsukishiro Yanagi", title: "Teorema da Desordem", element: "Eletro", role: "debuffer", rarity: 5, avatar: "🌀", hp: 1100, atk: 780, def: 440, spd: 104, energy: 190, cr: 8, cd: 55, tags: ["Eletro", "Suporte de DoT", "Habilitadora", "Perfuração"],
      skill: { basicMul: 100, yanaBasic: true, skillMul: 0, yanaSkill: true, ultMul: 180, yanaUlt: true } }),
  ];
const CHAR_MAP = Object.fromEntries(ROSTER.map((c) => [c.id, c]));
// Tag primária de um personagem (usada como requisito de nó) e todas as tags únicas do elenco
const primaryTag = (def) => (def && def.tags && def.tags[0]) || (def && def.element) || "Geral";
const ALL_TAGS = [...new Set(ROSTER.flatMap((c) => c.tags || []))]; // deduplicadas: tags compartilhadas não criam dungeon extra
const LIMITED_5 = ["miyabi", "kaiba", "ryoshu", "frieren", "soifon", "omegamon", "lupa", "hitori"];     // limitados (pool 50/50): só via rate-up
const FEATURED_LIMITEDS = ["lupa", "hitori"]; // banners ativos agora: só Lupa e Hitori Gotoh (demais limitados encerrados)
const BANNER_DURATIONS = { lupa: 5 * 24 * 60 * 60 * 1000, hitori: 5 * 24 * 60 * 60 * 1000 }; // 5 dias cada
const STANDARD_5 = ["kirara", "yoruichi", "kiritsugu"]; // padrão: caem ao perder o 50/50 e no banner permanente
const DEFAULT_FEATURED_CHAR = "lupa";
// Banner Especial Limitado — pool de 5, dura 3 dias corridos pra TODO mundo (data fixa, não reseta por dispositivo)
const SPECIAL_BANNER_CHARS = ["soifon", "omegamon", "ryoshu", "wonderofyou", "frieren"];
const SPECIAL_BANNER_START = new Date("2026-07-20T18:00:00Z").getTime();
const SPECIAL_BANNER_DURATION_MS = 3 * 24 * 60 * 60 * 1000;
const SPECIAL_BANNER_END = SPECIAL_BANNER_START + SPECIAL_BANNER_DURATION_MS;

/* ---------- ARMAS ---------- */
// Valores de atk e stats secundários = nível MÁXIMO (80). Escalam via weaponLevelMul().
const WEAPONS = [
  // ── ★★★★★ 5-estrelas ────────────────────────────────────────────────────────
  { id: "batera_kessoku", name: "Batera do Kessoku Band", rarity: 5, role: "buffer", atk: 650, critDmg: 64.0, passive: "Sempre que um aliado ataca, o usuário ganha 5 de energia. O usuário concede um avanço de ação de 50% após o uso do supremo. Se o usuário for Hitori Gotoh, a mesma poderá conceder 12% de perfuração quando usar sua perícia para o aliado do primeiro slot.", buff: { hitoriWeapon: true } },
  { id: "presa_calamidade",  name: "Presa da Calamidade Eterna", rarity: 5, role: "dps", atk: 587, critDmg: 48.6, atkPct: 12.0, energyRegen: 12.0, passive: "Aniquilação do Purgatório — Fundição Térmica: +12% de ATK e +12% de Regen. de Energia permanentes. Acúmulo de Incinerador: sempre que causar Dano de Fogo a um inimigo sob DoT, ou detonar/consumir um DoT em campo, ganha 1 acúmulo de Incinerador por 2 turnos (máx 3) — cada acúmulo dá +10% de Dano de Fogo e faz a Ultimate ignorar +6% de DEF (até +30% de Dano de Fogo / 18% de Perfuração no máximo). Colapso Fissural: ao conjurar a Ultimate, consome todos os acúmulos pra ativar Supernova — +25% de Dano Crítico na Suprema, e por 2 turnos a Perícia e o Básico ganham +15% de Dano Final e aplicam Ignição com o dobro da taxa base.", buff: { lupaWeapon: true } },
  { id: "digivice",         name: "Digivice da Coragem",   rarity: 5, role: "dps",      atk: 500, hpFlat: 500, elemDmg: 30.0,    passive: "Sincronia Térmica: +50 de TamerSP máximo; Perícias geram 5 a menos de Calor. Ao Digivolver: restaura 10% do HP Máximo e +10 de VEL por 2 rodadas. No MODO X: a Gaia Force ganha +50% de CRIT DMG e inimigos derrotados por ela não podem ser ressuscitados nem curados por 1 rodada.", buff: { aguWeapon: true } },
  { id: "relampago_fugaz",  name: "Relâmpago Fugaz",       rarity: 5, role: "dps",      hpFlat: 1058, defFlat: 463, spd: 10,      passive: "Passo Fantasma: HP 1058 · DEF 463 · +10 de VEL Base fixa. Efeito 1: +12% da VEL total do portador, sempre ativo. Efeito 2: cada Ataque Extra do portador aumenta o dano dos PRÓXIMOS Ataques Extras dele mesmo em +10% (acumula até 3×, cada acúmulo renova a duração de 2 turnos). Efeito 3 (com VEL > 150): todo Ataque Extra do portador concede +12% de Taxa de CRIT e +24% de CRIT DMG a TODA a equipe por 2 turnos, e recupera 2 de Energia sempre que o Talento intercepta uma ação aliada (independe do limiar de 150 VEL).", buff: { yoruWeapon: true, spdPct: 12 } },
  { id: "sinfonia_estelar",  name: "Sinfonia Estelar",      rarity: 5, role: "healer",   hpFlat: 1270, atk: 423, defFlat: 463, hpPct: 40.0, energyRegen: 20.0, passive: "Atributos Base: Nv. 1: HP 58 | ATK 21 | DEF 21 — Nv. 80 (máximo): HP 1270 | ATK 423 | DEF 463. Efeito Passivo — Eco do Mar Negro (valores no nível máximo): Expansão de Hardware — aumenta o HP Máximo do portador incondicionalmente em 40%. Otimização de Bateria — aumenta a Taxa de Regeneração de Energia do portador em 20%. Sincronização de Rede — ao ativar a Habilidade Suprema, todos os aliados (exceto o portador) regeneram instantaneamente 14 de Energia; além disso, enquanto o efeito da Suprema estiver ativo em campo, o Dano Final de toda a equipe sobe 24%.", buff: { shkWeapon: true } },
  { id: "tecelao_tempo",    name: "Tecelão do Tempo",      rarity: 5, role: "debuffer", hpFlat: 1058, atk: 635, defFlat: 463, critRate: 12.5,      passive: "Atributos Base (Nv. 80): HP 1058 | ATK 635 | DEF 463. Efeito Passivo — Fio da Ruptura Contínua: Sobrecarga Base — aumenta o ATK do portador incondicionalmente em 24% e a Taxa de CRIT dele em 12.5% (no nível máximo). Ressonância de Equipe: aumenta a Taxa de CRIT de TODA a equipe em 7%. Foco em Anomalia: sempre que o portador atacar um inimigo sofrendo pelo menos 1 DoT, ganha o buff Linha do Tempo — cada acúmulo dá +6% de Taxa de Perfuração de DEF ao portador (acumula até 3×, dura 3 turnos). Ressonância da Desordem: se o portador desencadear um dano instantâneo a partir de uma reação de DoT (como a Desordem de Yanagi), esse golpe específico ativa a Fissão Temporal — ignora completamente 12% da Resistência Elemental do alvo e regenera instantaneamente 4 de Energia para o portador.", buff: { yanaWeapon: true, teamCritRate: 7 } },
  { id: "disco_nexo",       name: "Disco de Duelo — Protótipo Nexo", rarity: 5, role: "summoner", hpFlat: 1164, atk: 582, defFlat: 396, critRate: 12,     passive: "Jogo de Alta Linhagem: HP 1164 · ATK 582 · DEF 396 · +12% de Taxa de CRIT sempre ativa. Sempre que o portador puxar uma carta ou ativar uma carta da Mão Virtual, o Monstro Invocado ativo ganha 1 acúmulo de 'Soberania do Duelista' (máx 3): cada acúmulo dá +16% de dano às invocações e faz seus ataques ignorarem +10% de DEF — expira após 2 turnos do monstro. Quando um Monstro Invocado deixa o campo, o portador recupera 6 de Energia instantaneamente e o PRÓXIMO monstro invocado ganha +30% de Dano Crítico por 2 rodadas.", buff: { kaibaWeapon: true } },
  { id: "starblade",        name: "Lâmina Estelar",       rarity: 5, role: "dps",      atk: 882, critDmg: 52.8,                    passive: "Fio Cortante: após a Habilidade, ganha +24% de Bônus de Dano por 2 turnos.",                                                    buff: { onSkill: { dmgBonus: 24, turns: 2 } } },
  { id: "radiant",          name: "Cetro Radiante",        rarity: 5, role: "buffer",   atk: 720, energyRegen: 26.4,                passive: "Pulso de Apoio: ao buffar aliados, concede +12% de Bônus de Dano por 2 turnos.",                                                buff: { onBuff: { dmgBonus: 12, turns: 2 } } },
  { id: "duelo_nexo",        name: "Disco de Duelo — Protótipo Nexo", rarity: 5, role: "summoner", hpFlat: 1164, atk: 582, defFlat: 396, critRate: 12.0, passive: "Atributos Base: HP 1164 | ATK 582 | DEF 396. Efeito Passivo — Jogo de Alta Linhagem: aumenta a Taxa Crítica do portador em 12% / 15% / 18% / 21% / 24% (por nível de refinamento; este jogo aplica o valor de nível 1: 12%). Sempre que o portador utilizar a Perícia para puxar uma carta ou ativar uma carta diretamente de sua Mão Virtual, o Monstro Invocado atualmente ativo no campo ganha 1 acúmulo do status Soberania do Duelista (limite máximo de 3 acúmulos). Cada acúmulo aumenta o Dano causado pelas invocações em 16% / 20% / 24% / 28% / 32% (nível 1: 16%) e faz com que seus ataques ignorem 10% / 12% / 14% / 16% / 18% da DEF dos alvos atingidos (nível 1: 10%). Este efeito expira após 2 turnos do monstro. Quando um Monstro Invocado aliado deixa o campo de batalha (seja por destruição, substituição automática ou mecânica de Tributo), o portador regenera de forma instantânea 6.0 / 7.5 / 9.0 / 10.5 / 12.0 pontos de Energia (nível 1: 6.0). Adicionalmente, o próximo Monstro Invocado que entrar em campo recebe um bônus compulsório de 30% / 37.5% / 45% / 52.5% / 60% de Dano Crítico em todas as suas ações ofensivas por 2 rodadas completas (nível 1: 30%).", buff: { kaibaWeapon: true } },
  { id: "hailstorm",        name: "Nevasca de Outono",     rarity: 5, role: "aoe",      atk: 756, critRate: 36.0, critDmg: 64.8,    passive: "Fio do Zero Absoluto: DoTs de Geada amplificados. Apos a Habilidade, +24% Bonus de Dano por 2 turnos.",                         buff: { onSkill: { dmgBonus: 24, turns: 2 } } },
  { id: "thunderclaws",     name: "Garras do Trovao",      rarity: 5, role: "dps",      atk: 952, critRate: 44.0,                   passive: "Descarga Predatoria: apos a Habilidade, +20% de VEL por 2 turnos.",                                                             buff: { onSkill: { spd: 20, turns: 2 } } },
  { id: "originpistol",     name: "Pistola da Origem",     rarity: 5, role: "debuffer", atk: 840, critDmg: 58.8, extraDefDown: 14,  passive: "Mira Calculada: debuffs reduzem +14% de DEF adicional do alvo." },
  { id: "starmantle",       name: "Manto Estelar",         rarity: 5, role: "shield",   atk: 476, def: 476, shieldBonus: 52,        passive: "Barreira Estelar: +52% no valor dos Escudos gerados pelo portador." },
  { id: "ferrao_borboleta", name: "Ferrao da Borboleta",   rarity: 5, role: "dps",      atk: 840, spd: 36.0, critRate: 36.0,        passive: "Carga Eletrica: acumula 1 carga por golpe de Vento (max 5). Cada carga +10% dano follow-up. Na Postura de Ferrao, consome todas e concede +24% Dano Verdadeiro por carga. Exclusivo: Soi Fon." },
  { id: "glitch_apagamento",name: "Glitch de Apagamento", rarity: 5, role: "shield",   atk: 476, def: 440, omgWeapon: true,        passive: "Instabilidade Digital: +20% HP Maximo. Ao perder HP, +25% Dano de Virus por 2 turnos. Exclusivo (Omegamon): Corrupcao dobrada; Dano Verdadeiro +8 Energia." },
  { id: "lamina_matriarca",  name: "Lamina da Matriarca",    rarity: 5, role: "dps",    atk: 635, hp: 1085, def: 398, critRate: 12.0, passive: "Fio Condutor de Agonia: +12% CRIT Rate permanente. Exclusivo (Ryoshu): ao drenar HP dos aliados, acumula Gotas de Tinta (+15% Dano Fixo por gota, max 3, dura 2 turnos). No inicio de cada turno, cura todos os aliados em 6% do HP Max.", buff: { ryoInkDrops: true, allyHealPct: 6 } },
  { id: "cajado_fim_era",     name: "Cajado do Fim da Era",   rarity: 5, role: "aoe",   atk: 720, critDmg: 52.0, passive: "Heranca de Flamme: +24% de Dano Holy. Ao gerar Pontos de Elemento, recupera 10 de Energia. Apos usar magia com pontos, o proximo ataque do time causa dano extra (+15% ATK de Frieren).", buff: { frElemEnergy: 10, frTeamBonus: true } },
  { id: "calamidade", name: "Calamidade", rarity: 5, role: "dps", hp: 2600, atk: 529, def: 463, passive: "A Tragédia Sempre Encontra um Caminho: +30% de HP máx. Ao conceder um buff a um aliado, aumenta o dano desse aliado em 20% (acumula até 8×). Ao aplicar um debuff a um inimigo, reduz a DEF do alvo em 10% (acumula até 8×).", buff: { wooWeapon: true, onBuff: { dmgBonus: 20, maxStacks: 8 }, onDebuff: { defRedTarget: 10, maxStacks: 8 } } },
    { id: "cetro_autoridade_celestial", name: "Cetro da Autoridade Celestial", rarity: 5, role: "healer", hp: 3200, def: 640, spd: 16, passive: "Sétimo Pilar da Criação — I) Aura de Santuário: +20% de DEF. Ao usar a Perícia, o aliado curado ganha Proteção Zodiácal (+12% CRIT DMG por acúmulo, até 3 acúmulos) e Athena acumula Graça do Olimpo (+400 ATQ fixo por acúmulo, máximo de 3 acúmulos — total de até +1200 ATQ fixo). Os acúmulos duram até o fim do combate e não podem ser removidos. II) O Fluxo de Atena: quando a VEL do usuário for superior a 140, ativa Vontade da Guardiã — toda a cura gerada por habilidades é aumentada em 24%, a cura excedente é convertida em Escudo de Absorção no alvo por 1 rodada e a VEL de Athena é ampliada em mais +16 fixos adicionais (totalizando +32 de VEL com os 16 da arma).", buff: { athWeapon: true, onSkill: { critDmgPerStack: 12, maxStacks: 3, atkPerStack: 400, maxAtkStacks: 3 }, spdThreshold: { spd: 140, healBonus: 24, overHealShield: true, spdBonus: 16 } } },
    // ── ★★★★ 4-estrelas ────────────────────────────────────────────────────────
  { id: "shadowkunai", name: "Kunai Sombria",       rarity: 4, role: "dps",      atk: 528, critDmg: 38.4, defPen: 10,       passive: "Sombra Rastreadora: perfura 10% da DEF do inimigo em todos os ataques." },
  { id: "slingshot",   name: "Estilingue de Elite", rarity: 4, role: "debuffer", atk: 476, critDmg: 28.8, extraDefDown: 12, passive: "Mira de Precisao: debuffs reduzem +12% de DEF adicional." },
  { id: "healstaff",   name: "Bordao Curativo",     rarity: 4, role: "healer",   atk: 396, energyRegen: 22.0, ultEnergy: 10, passive: "Pulso Vital: a Ultimate concede +10 de Energia a todo o time." },
  { id: "chaostome",   name: "Tomo do Caos",        rarity: 4, role: "aoe",      atk: 504, dmgBonus: 36.0,               passive: "Entropia Pura: +36% de Bonus de Dano permanente em todos os ataques." },
  { id: "aegis",       name: "Egide Brilhante",     rarity: 4, role: "shield",   atk: 396, def: 396, shieldBonus: 38,    passive: "Muralha Brilhante: +38% no valor dos Escudos gerados pelo portador." },
];
const WEAPON_MAP = Object.fromEntries(WEAPONS.map((w) => [w.id, w]));
const WEAPON_5_IDS = ["presa_calamidade", "batera_kessoku"]; // banner de armas ativo agora: só as armas de Lupa e Hitori
const DEFAULT_FEATURED_WEAPON = "presa_calamidade";

/* ---------- MOCHILEIRO (seletor de personagem inicial) ---------- */
const BEGINNER_PICK_CHARS = [
  { id: "kirara",    wpn: "starmantle"   },
  { id: "yoruichi",  wpn: "relampago_fugaz" },
  { id: "kiritsugu", wpn: "originpistol" },
  { id: "renji",    wpn: "shadowkunai"  },
  { id: "ace",      wpn: "chaostome"    },
  { id: "usopp",    wpn: "slingshot"    },
  { id: "sakura",   wpn: "starblade"    },
  { id: "chopper",  wpn: "healstaff"    },
  { id: "lancer",   wpn: "shadowkunai"  },
  { id: "nanami",   wpn: "starblade"    },
  { id: "nami",     wpn: "chaostome"    },
  { id: "uraraka",  wpn: "radiant"      },
];

/* ---------- RELÍQUIAS ---------- */
const RELIC_SETS = {
  "Tempestade Eletro": { color: "#B98BFF", el: "Eletro", p2: { elemDmg: 20 }, p4: { critRate: 5 }, flag4: "setEletro4", d2: "+20% de dano Eletro", d4: "+5% CRIT; ao agir (ação avançada/turno) +2% de dano, acumula até 12%" },
  "Sopro Glacial":     { color: "#6FE3FF", el: "Glacial", p2: { critRate: 9, elemDmg: 16 }, flag4: "setGlacial4", d2: "+9% CRIT e +16% de dano Glacial", d4: "ao aplicar DoT glacial (Geada), aplica +3% de vulnerabilidade (acumula até +15%). Além disso, contra alvos Congelados o portador causa +18% de Dano." },
  "Núcleo Ardente":    { color: "#FF6B45", flag2: "setFire2", flag4: "setFire4", d2: "dano de DoT de Fogo +10%", d4: "dano da Ultimate +20%; após a Ultimate, +8% de ATK no próximo turno" },
  "Praga Viral":       { color: "#A6E22E", p2: { dmgBonus: 8 }, flag4: "setViral4", d2: "+8% de dano", d4: "com Sangramento OU Veneno no alvo: +12% de dano; com AMBOS: +20% e cura 8% do HP máx" },
  "Benção Sagrada":    { color: "#FFE08A", p2: { hp: 20 }, flag4: "setHoly4", d2: "+20% de HP máx", d4: "+15% de cura e, ao curar, aplica escudo de 2% do HP máx do alvo" },
  "Protocolo Ômega":  { color: "#00E5CC", el: "Virus", p2: { spd: 5, dmgBonus: 8 }, flag4: "setOmega4", d2: "+5% VEL e +8% Dano", d4: "HP≥75%: +25% ATK e +15% Dano ao time · HP 30–74%: +20% CRIT e +35% CRIT DMG · HP<30% [1x]: +50% ATK, escudo 10% HP ao time, +2 SP" },
  "Asas de Borboleta": { color: "#FF6EE7", p2: { critRate: 8, critDmg: 32 }, p4: { critRate: 10, dmgBonus: 22, atkPct: 10 }, flag4: "setButterfly4", d2: "+8% CRIT Rate e +32% CRIT DMG — bônus amplificados em Ataques de Seguimento", d4: "+10% CRIT Rate, +22% Dano Bônus e +10% ATK; Ataques de Seguimento aplicam [Fragilidade] no alvo (+25% dano recebido por 1 turno) e cada follow-up realizado no mesmo turno concede +1% de CRIT Rate empilhável (máx +10% por combate). Ideal para Soi Fon e futuros personagens de follow-up." },
  "Teia da Agonia": { color: "#8B1A1A", el: "Virus", p2: { hp: 20 }, flag2: "setTeia2", flag4: "setTeia4",
    d2: "+20% de HP Máx — quanto mais HP o portador tiver, maior o Dano Fixo gerado pelos drenos",
    d4: "Dano Fixo causado por dreno de HP de aliados +30%. Além disso, para cada 10% de HP faltando nos aliados após o dreno, o portador ganha +3% de penetração de DEF (máx +30%). Ideal para Ryoshu e futuros personagens de sacrifício de HP." },
  "Além do Horizonte": { color: "#C8E6C9", el: "Holy", p2: { elemDmg: 20 }, flag4: "setHorizonte4",
    d2: "+20% de Dano Holy",
    d4: "Ao conjurar a Ultimate, concede ao time +15% de Dano Bônus e +12% de CRIT DMG por 2 turnos. Se o portador possuir Pontos de Elemento acumulados, cada ponto gera +5% de Dano Bônus adicional ao time (máx +20% extra). Ideal para Frieren e futuros personagens de acumulação de elemento." },
  "Vestígios da Calamidade Eterna": { color: "#6B21A8", el: "Chaos", p2: { energyRegen: 12, elemDmg: 15 }, flag2: "setCalamidade2", flag4: "setCalamidade4",
    d2: "+12% Taxa de Regeneração de Energia · +15% Dano de Chaos · ao aplicar buff ou debuff: recupera 3 de Energia (1× por ação)",
    d4: "A cada buff/debuff aplicado, ganha 1 Acúmulo de Calamidade (máx 10). Cada acúmulo: +4% Dano Chaos · +3% VEL · +4% CRIT DMG. Ao atingir 10 acúmulos: ignora 25% da DEF · duração de todos os buffs e debuffs +30% · ataques causam Golpe de Chaos adicional de 80% ATQ. Ideal para Wonder of You." },
  "Protocolo de Ruína em Cadeia": { color: "#A6E22E", el: null, p2: { atk: 15, defPen: 5 }, flag4: "setRuina4", flag6: "setRuina6",
    d2: "+15% de ATK e +5% de Taxa de Perfuração de DEF.",
    d4: "Sempre que o portador aplicar um DoT ou ativar uma reação instantânea (como a Desordem), o inimigo atingido recebe Falha Estrutural — +18% de dano de QUALQUER fonte de DoT por 2 turnos.",
    d6: "Se o alvo atacado tiver 3+ DoTs diferentes simultâneos, a equipe inteira ganha +20% de Perfuração de DEF contra esse alvo. Quando o portador detona os DoTs acumulados, essa detonação ignora completamente qualquer Escudo/barreira do inimigo." },
  "Arquivos da Costa Negra": { color: "#7FDBFF", el: null, p2: { hp: 18, healBonus: 10 }, flag4: "setCostaNegra4", flag6: "setCostaNegra6",
    d2: "+18% de HP Máximo e +10% de Cura Realizada.",
    d4: "Quando o portador cura ou dá Escudo a um aliado, o alvo entra em Sincronia por 2 turnos — +12% de Dano Final e +6 de VEL. Se a cura acertar a equipe inteira (área/Suprema), todos ganham Sincronia ao mesmo tempo.",
    d6: "+15% de Taxa de Regeneração de Energia. Ao ativar a Suprema, registra toda a Cura Excedente gerada pelos próximos 3 turnos; no fim do turno do portador, 100% dessa Cura Excedente vira uma explosão de Dano Desconhecido em todos os inimigos, escalando com HP e ignorando 45% de DEF/RES." },
  "Servos de um Rei": { color: "#FFD166", el: null, flag2: "setServos2", flag4: "setServos4",
    d2: "+15% de Dano causado por Invocações. Se a Invocação herdar atributos nativos do portador (ATK/VEL), a taxa de conversão desses atributos transferidos é elevada em +10% adicional em combate.",
    d4: "Sempre que a Invocação aliada agir ou atacar na Ordem de Turnos, ganha 1 acúmulo de Sintonia Sincrônica (máx 2). Cada acúmulo dá +20% de Dano Crítico à própria Invocação por 2 turnos. No limite de 2 acúmulos, todos os ataques da Invocação passam a ignorar automaticamente 16% da DEF dos alvos. Além disso, sempre que o portador consumir um Ponto de Habilidade ou ativar a Habilidade Suprema, a Invocação atual avança 15% na Ordem de Turnos imediatamente. Funciona com QUALQUER Invocação do jogo (dragões, monstros do Kaiba, clones, etc.)." },
  "Traje do Astrólogo do Destino": { color: "#D4A017", el: "Holy", p2: { energyRegen: 15 }, flag2: "setAstrologo2", flag4: "setAstrologo4",
    d2: "+15% de Eficiência de Recarga de Energia · ao usar a Perícia, compartilha 10% do atributo mais alto (ATK ou DEF) com o aliado de menor HP por 2 rodadas",
    d4: "Cada Acerto Crítico de qualquer aliado gera 1 Energia Estelar (máx 8). Ao atingir 8 acúmulos: ativa Apogeu do Zodíaco — o próximo ataque ou habilidade causa Dano Adaptativo (muda para a fraqueza elemental do inimigo) e concede +30% de CRIT DMG ao grupo por 1 rodada. Ideal para Athena." },
  "Muralha do Guardião": { color: "#4FC3F7", el: "Holy", p2: { shieldBonus: 30 }, flag2: "setMuralha2",
    d2: "+30% no valor de todos os Escudos gerados pelo portador — toda barreira criada pela Habilidade, Ultimate ou efeito passivo absorve 30% a mais de dano. Ideal para personagens que geram escudos (Kirara, Omegamon etc.).",
    d4: null },
  "Protocolo de Adaptação Universal": { color: "#FF9E45", six: true, p2: { spd: 6, energyRegen: 10 }, flag4: "setAdapt4", flag6: "setAdapt6",
    d2: "+6 de VEL e +10% de Taxa de Regeneração de Energia.",
    d4: "Ao ativar uma Habilidade Suprema, Transformação ou Mudança de Postura: ignora 20% da DEF inimiga e ganha +25% de Dano Bônus Global por 2 rodadas.",
    d6: "Pulso de Emergência: enquanto o portador estiver sob um efeito de transformação ou postura ofensiva gerado por ele mesmo, ele acessa um Reservatório de TamerSP. 2× por batalha, ao usar o Ataque Básico com o TamerSP abaixo de 30% da capacidade total, converte energia ambiente em um Pulso de Emergência — recupera 50% de TamerSP instantaneamente. Ao ativar este Pulso, o próximo ataque ganha +100% de Dano Crítico adicional." },
};
const RELIC_SET_NAMES = Object.keys(RELIC_SETS);
const ROTATING_FARM_SETS = RELIC_SET_NAMES.filter((s) => s !== "Protocolo Ômega"); // Ômega já tem domínio fixo (Rede Corrompida)
function featuredFarmSet() { const wk = Math.floor(Date.now() / (7 * 24 * 3600 * 1000)); return ROTATING_FARM_SETS[wk % ROTATING_FARM_SETS.length]; }
const RELIC_ITEM_ID = {
  "Tempestade Eletro": "item_relic_eletro",
  "Sopro Glacial":     "item_relic_glacial",
  "Núcleo Ardente":    "item_relic_fire",
  "Praga Viral":       "item_relic_viral",
  "Benção Sagrada":    "item_relic_holy",
  "Protocolo Ômega":  "item_relic_omega",
  "Asas de Borboleta": "item_relic_butterfly",
  "Teia da Agonia": "item_relic_teia",
  "Além do Horizonte": "item_relic_horizonte",
  "Vestígios da Calamidade Eterna": "item_relic_calamidade",
  "Protocolo de Ruína em Cadeia": "item_relic_ruina",
  "Arquivos da Costa Negra": "item_relic_costanegra",
  "Servos de um Rei": "item_relic_servos",
  "Traje do Astrólogo do Destino": "item_relic_astrologo",
  "Muralha do Guardião": "item_relic_muralha",
  "Protocolo de Adaptação Universal": "item_relic_adapt",
};
const RELIC_EMOJI = {
  "Tempestade Eletro": "⚡",
  "Sopro Glacial":     "❄️",
  "Núcleo Ardente":    "🔥",
  "Praga Viral":       "🧬",
  "Benção Sagrada":    "✨",
  "Protocolo Ômega":  "☢️",
  "Asas de Borboleta": "🦋",
  "Teia da Agonia": "🕸️",
  "Além do Horizonte": "🌿",
  "Vestígios da Calamidade Eterna": "💀",
  "Protocolo de Ruína em Cadeia": "🕸️",
  "Arquivos da Costa Negra": "🌌",
  "Servos de um Rei": "👑",
  "Traje do Astrólogo do Destino": "🔯",
  "Muralha do Guardião": "🛡️",
  "Protocolo de Adaptação Universal": "🧬",
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
  { id: "item_relic_omega", name: "Relíquia · Protocolo Ômega",      icon: "☢️" },
  { id: "item_relic_mat",   name: "Matéria de Relíquia",              icon: "🔷" },
  { id: "item_relic_teia",     name: "Relíquia · Teia da Agonia",          icon: "🕸️" },
  { id: "item_relic_horizonte",name: "Relíquia · Além do Horizonte",  icon: "🌿" },
  { id: "item_relic_calamidade", name: "Relíquia · Vestígios da Calamidade Eterna", icon: "💀" },
  { id: "item_relic_ruina",      name: "Relíquia · Protocolo de Ruína em Cadeia",     icon: "🕸️" },
  { id: "item_relic_costanegra", name: "Relíquia · Arquivos da Costa Negra",          icon: "🌌" },
  { id: "item_relic_servos",     name: "Relíquia · Servos de um Rei",                icon: "👑" },
  { id: "item_relic_astrologo",  name: "Relíquia · Traje do Astrólogo do Destino",  icon: "🔯" },
  { id: "item_relic_muralha",    name: "Relíquia · Muralha do Guardião",             icon: "🛡️" },
  { id: "item_relic_adapt",      name: "Relíquia · Protocolo de Adaptação Universal", icon: "🧬" },
];
const STAT_LABEL = { hp: "HP", atk: "ATK", def: "DEF", spd: "VEL", critRate: "CRIT", critDmg: "CRIT DMG", dmgBonus: "DANO", energyRegen: "REGEN ENERGIA", healBonus: "CURA", energyMax: "EN", vuln: "VULN", defPen: "PENETRAÇÃO DEF", elemDmg: "DANO ELEM.", dotDmg: "DANO DE DoT", atkP: "ATK", hpP: "HP", defP: "DEF", atkFlat: "ATK", hpFlat: "HP", defFlat: "DEF", breakEffect: "EFEITO DE PERFURAÇÃO", breakEff: "EFICIÊNCIA DE PERFURAÇÃO", followupDmg: "DANO DE ATAQUE EXTRA" };
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
  { i: 5, name: "Corda", main: ["energyRegen", "breakEffect", "atkP", "hpP", "defP"] },
];
// Faixa do MAIN (Lv0 → Lv15)
const MAIN_RANGE = { hpFlat: [45, 705], atkFlat: [22, 352], critRate: [4.1, 32.4], critDmg: [8.1, 64.8], atkP: [4.3, 34.5], hpP: [4.3, 34.5], defP: [5.4, 43.2], spd: [4, 25], elemDmg: [4.8, 38.8], energyRegen: [2.4, 19.4], breakEffect: [4.8, 38.8] };
const relicMainValue = (k, level) => { const [a, b] = MAIN_RANGE[k] || [0, 0]; return a + (b - a) * (Math.min(level || 0, 15) / 15); };
// Tabela de SUBSTATUS: por rolagem sorteia Low/Mid/High (1/3 cada) e SOMA
const SUB_TIERS = { critRate: [2.59, 2.91, 3.24], critDmg: [5.18, 5.83, 6.48], spd: [2.0, 2.3, 2.6], dotDmg: [3.45, 3.88, 4.32], atkP: [3.45, 3.88, 4.32], hpP: [3.45, 3.88, 4.32], defP: [4.32, 4.86, 5.40], atkFlat: [16.93, 19.05, 21.16], hpFlat: [33.87, 38.10, 42.33], defFlat: [16.93, 19.05, 21.16], breakEffect: [5.18, 5.83, 6.48] };
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
const setBonusText = (sd) => { if (!sd) return ""; const p2 = sd.d2 || (sd.p2 ? Object.entries(sd.p2).map(([k, v]) => `+${v}${relicSuffix(k)} ${statName(k)}`).join(", ") : "—"); return `2pç: ${p2} · 4pç: ${sd.d4 || "—"}${sd.d6 ? ` · 6pç: ${sd.d6}` : ""}`; };

/* ---------- STATS ---------- */
const levelMul = (lv) => 0.45 + 0.55 * (Math.min(Math.max(lv || 1, 1), 90) - 1) / 89; // nv1≈0.45 → nv90=1.0 (escala HSR, sem bloat)
const WEAPON_MAX_LEVEL = 80;
const weaponLevelMul = (lv) => 0.15 + 0.85 * (Math.min(Math.max(lv || 1, 1), 80) - 1) / 79; // arma nv1≈0.15 → nv80=1.0 (cresce bastante)
// Custo escalona a cada 20 niveis (HSR-style): Tier1=1 Tier2=2 Tier3=4 Tier4=6 engrenagens
const WPN_TIER_COST = [1, 2, 4, 6];
const weaponCost = (lv) => { const t = Math.min(3, Math.floor((lv - 1) / 20)); return { wmat: WPN_TIER_COST[t], exp: 0 }; };
const weaponTotalCostToMax = (fromLv) => { let tot = 0; for (let lv = fromLv; lv < WEAPON_MAX_LEVEL; lv++) tot += WPN_TIER_COST[Math.min(3, Math.floor((lv - 1) / 20))]; return tot; };

// Passiva de personagem (sempre ativa) — identidade única do kit, descrita em detalhe
const PASSIVE = {
  hitori: { name: "Ansiedade Amplificada", desc: "5 Estrelas - Suporte | Chaos. Ataques básicos não farão nada além de dar uma pequena quantidade de dano de Chaos. Passivas: A cada 3% de dano crítico, Hitori recebe 1 ponto de velocidade. Concede 30 de energia para todos os aliados após ativar seu supremo. Concede 30% de bônus de dano de Holy e Chaos para os aliados nos dois primeiros slots.", flag: "hitoriPassive" },
  lupa: { name: "Fome da Predadora", desc: "Lupa opera como uma força da natureza que se alimenta do caos elemental presente no campo de batalha. Acúmulo de Voracidade: Sempre que Lupa causa Dano de Fogo a um inimigo sob o efeito de qualquer Dano Contínuo (DoT de Fogo, Sangramento, Choque, etc.), ela consome 1 rodada desse efeito e ganha 1 carga de Voracidade (máximo de 10 cargas). Cada carga concede +20% de Dano de Fogo (até +200% no máximo). Cada carga também restaura 5 pontos de Energia instantaneamente para Lupa. Chama Voraz: Quando Lupa possui 10 cargas de Voracidade, ela entra no estado \"Predadora Absoluta\". Seu próximo Ataque Básico ou Perícia ignora 20% da DEF do alvo e consome todas as cargas para garantir que sua próxima Liberação de Ressonância (Ultimate) cause Dano Crítico Garantido.", flag: "lupaVoracity" },
  miyabi:    { name: "Caçadora do Vazio · Geada Profunda", desc: "Talento: sempre que Miyabi atinge um inimigo que esteja sob QUALQUER efeito contínuo (Congelamento, Queimadura, Veneno, Choque ou Sangramento), o golpe causa +30% de dano. Como suas próprias Habilidade e Ultimate marcam congelamento, ela rapidamente se auto-habilita e escala o dano contra alvos já afligidos pela equipe — quanto mais DoTs no campo, mais letal ela fica.", flag: "pShatter" },
  kaiba:     { name: "Regra do Duelista", desc: "Kaiba é limitado a manter apenas 1 Monstro Invocado ativo no campo de batalha por vez. Mecânica de Substituição: se um novo Monstro for invocado enquanto já houver outro ativo, o monstro anterior é destruído imediatamente. Atributos da Invocação: o Monstro Invocado ativo possui sua própria barra de ação na Ordem de Turnos, agindo de forma autônoma. Ele herda 100% da VEL de Kaiba, 100% da Taxa/Dano Crítico dele, e 120% do ATK base dele. Quando Kaiba sofre um ataque, o Monstro Invocado intercepta 30% do dano recebido — como ele não possui uma barra de HP independente, esse dano nunca chega a ser subtraído da vida de Kaiba (na prática, isso se traduz em -30% de todo o dano sofrido por Kaiba enquanto houver um Monstro ativo em campo).", flag: null },
  renji:     { name: "Instinto de Caça · Execução", desc: "Talento: Renji fareja o sangue. Contra inimigos abaixo de 40% de HP, todos os seus ataques causam +25% de dano, transformando-o em um finalizador implacável. Combina com o Sangramento da Habilidade, que mantém o alvo perdendo vida até entrar no alcance de execução.", flag: "pExecute" },
  ace:       { name: "Vontade da Chama · Brasa Viva", desc: "Talento: a Queimadura aplicada por Ace é 30% mais forte que uma queimadura comum e ignora parte da defesa do alvo ao longo do tempo. Cada inimigo aceso continua perdendo vida no início do próprio turno, e Ace amplifica todo o dano que causa a alvos em chamas.", flag: "pScorch" },
  usopp:     { name: "Olho de Águia · Ponto Fraco", desc: "Talento: Usopp mira sempre o ponto vulnerável. Seus debuffs reduzem +12% de DEF adicional do alvo (além do valor base do golpe), abrindo a guarda do inimigo para toda a equipe. Quanto mais ele enfraquece um alvo, mais dano todos passam a causar nele.", flag: "pWeakpoint" },
  sakura:    { name: "Selo Centenário · Mãos que Curam", desc: "Talento: o chakra de cura de Sakura é refinado — a cura do seu Ultimate é 25% mais forte. Ela equilibra dano e suporte: bate forte com os punhos e, no Ultimate, devolve uma parcela enorme de HP a todo o time, segurando a equipe em lutas longas.", flag: "pMedic" },
  chopper:   { name: "Pontos Vitais · Médico Dedicado", desc: "Talento: como médico de bordo, todas as curas de Chopper (Habilidade e Ultimate) são 25% mais fortes. Ele prioriza sempre o aliado mais ferido e ainda distribui energia ao time, mantendo o grupo vivo e com os Ultimates carregados.", flag: "pRegen" },
  kirara:    { name: "Baluarte Estelar", desc: "Talento: os escudos de Kirara são 25% mais resistentes. Ela provoca os inimigos para atrair os ataques e converte a própria DEF altíssima em barreiras grossas para todo o time, sustentando a linha de frente contra os golpes mais pesados dos chefes.", flag: "pBulwark" },
  yoruichi:  { name: "Frequência Shunpo", desc: "Yoruichi opera em uma linha temporal acelerada. Todos os seus multiplicadores de dano ignoram os atributos de ATK e escalam exclusivamente com sua Velocidade (VEL) total. A cada 10 pontos de VEL que Yoruichi possuir acima de 120, o Dano Crítico de todos os Ataques Extras da equipe aumenta em 6% (até um máximo de 60% por padrão, ou 160% com a S6). Clones Residuais (Ataque Extra): sempre que um aliado desferir um Ataque Extra contra um inimigo, Yoruichi intercepta a ação e conjura um Clone Residual instantâneo que ataca o mesmo alvo, causando Dano Eletro equivalente a 500% de sua VEL total. Colapso Elétrico: o jogo contabiliza os Clones Residuais gerados. A cada 3 Clones acionados, o alvo atual sofre uma sobrecarga, recebendo Dano Eletro em Área equivalente a 1500% da VEL de Yoruichi e sofrendo uma redução de 20% na Resistência a Ataques Extras por 2 turnos. Não há limite de vezes que Clones Residuais podem ser ativados por ciclo de turnos.", flag: "pSwift" },
  kiritsugu: { name: "Análise · Caçador de Magos", desc: "Talento: o frio cálculo de Kiritsugu encontra a falha do alvo — toda vulnerabilidade que ele aplica é +12% mais forte. Combinado com o Veneno da Habilidade, ele transforma qualquer inimigo em um alvo que recebe dano amplificado de toda a equipe e ainda derrete ao longo dos turnos.", flag: "pAnalyze" },
  soifon: { name: "Ciclo do Ferrão · Vibração da Morte", desc: "Talento: QUALQUER aliado que agir concede 1 carga de [Vibração de Ferrão] para Soi Fon (máx 3). Com 3 cargas, ela entra em Postura de Ferrão — próximo Ataque Básico causa Dano Verdadeiro (120% ATK, ignora DEF e Escudos). Com [Ferrão da Morte] em algum inimigo, cada ação aliada dispara Ataques Extras instantâneos de Vento nos alvos marcados (máx 2/turno de aliado) — e esses golpes contam pro sistema de Ataque Extra do jogo (reagem com kits como o da Yoruichi).", flag: "sfFollowup" },
  omegamon: { name: "Digital Hazard", desc: "Talento: enquanto Omegamon Zwart D está em campo, o HP Máximo de todos os aliados aumenta em 25%. Sempre que o portador ou um aliado com [Protocolo de Infecção] é atacado, acumula 1 carga de [Vírus Defeat] (máx 5). Cada carga concede +15% de CRIT DMG e reduz a DEF do atacante em 10%. Ao atingir 5 cargas, o próximo ataque remove todos os buffs do alvo e causa Dano Verdadeiro igual a 20% do HP Máximo do portador.", flag: "omgTalent" },
  lancer: { name: "Rune da Imortalidade · Survivance", desc: "Talento: Lancer não pode ser morto por um golpe fatal — a primeira vez por batalha que recebesse dano suficiente para zerar o HP, ele sobrevive com 1 de HP e recupera imediatamente 20% do HP máximo. Esse instinto de sobrevivência o torna o herói mais difícil de abater e combina com a Ultimate de ignição de baixo HP.", flag: "lancerRevive" },
  nanami: { name: "Postura Profissional · Cálculo 7:3", desc: "Talento: Nanami está sempre dentro do expediente — se a batalha ultrapassar o 5º turno de heróis, ele entra em [Hora Extra], ganhando permanentemente +30% de ATK pelo resto do combate. Combinado com a mecânica 7:3 da Habilidade (que dispara Crítico Garantido em danos terminados em 7 ou 3), cada turno longo o torna exponencialmente mais letal.", flag: "nanamHoraExtra" },
  nami: { name: "Aliança dos Piratas · Oportunista", desc: "Talento: sempre que qualquer aliado atacar um inimigo que esteja sob efeito de Ciclone (DoT de Vento), Nami dispara automaticamente um ataque coordenado causando 40% de Dano de Vento. Ela transforma os próprios DoTs em amplificadores de dano passivo — cada aliado que age se torna um gatilho da sua tempestade.", flag: "namiFollowup" },
  uraraka: { name: "Quirk Zero Gravity · Levitação", desc: "Talento: ao usar o Ataque Básico, Uraraka avança sua própria barra de ação em 15%, agindo com mais frequência que a velocidade base indicaria. Além disso, aliados com o buff de Zero Gravity ativo têm a ação dos inimigos que atacam atrasada em 8%, criando uma vantagem de turno cumulativa para a equipe.", flag: "uraAdvance" },
  ryoshu:  { name: "Marionetes de Sangue · Fios da Agonia", desc: "Talento (P.I.P.): o dreno de Ryoshu ignora Escudos aliados, retirando o valor direto da barra vital. Se o aliado drenado possuía Escudo, Ryoshu absorve 30% do valor como ATK temporário. Os aliados não podem morrer pelo dreno (param em 1 HP). Para cada 1% de HP faltando nos aliados após o dreno, Ryoshu ignora 0,5% da DEF dos inimigos (máx 45%).", flag: "ryoTalent" },
  frieren: { name: "Percepção de Milênios · Grimório Oculto", desc: "Talento: Frieren é imune a qualquer debuff de lentidão ou atraso de turno. No início da batalha, ela esconde sua verdadeira força: o Aggro dela é reduzido a quase zero enquanto tiver menos de 50% de energia da Ultimate carregada. Além disso, começa a batalha com 2 Pontos de Elemento aleatórios já acumulados.", flag: "frTalent" },
    wonderofyou: { name: "A Lei Natural do Infortúnio", desc: "Talento passivo de duas vias simultâneas. Via 1 — Proteção pelo Infortúnio: sempre que qualquer aliado receber dano de qualquer fonte (ataque, área, DoT), Wonder of You automaticamente aplica nesse aliado um Buff Único Aleatório dentre os 8 disponíveis — somente se ele ainda não possuir aquele Buff específico. Via 2 — Punição da Calamidade: sempre que qualquer inimigo causar dano a qualquer fonte, esse inimigo recebe automaticamente um dos 4 Debuffs Especiais — somente se ele ainda não o possuir. Ordem de aplicação: Calamidade → Acidente Inevitável → Má Fortuna → Destino Quebrado. Ambas as vias operam sem custo de ação e sem consumo de Pontos de Habilidade.", flag: "pWoo" },
    agumon: { name: "Overclocking Terminal", desc: "CALOR (0-100): Perícias/Supremos aquecem, Básicos resfriam. Calor > 70: ATK e CRIT DMG sobem até +80%, mas perde 5% de HP/turno. Calor = 100: MELTDOWN — regride à forma base e perde 50% do TamerSP. TamerSP paga as Digievoluções (botão 🧬 no turno dele). Sincronia Perfeita no WarGreymon (Calor 90-99 + Trident Arm na rodada anterior) ativa o MODO X.", flag: "pAgu" },
    shorekeeper: { name: "Circuito Forte — Discernimento", desc: "Supremacia Desconhecida: por pertencer ao elemento Desconhecido, todos os ataques de Shorekeeper possuem vantagem elemental absoluta — seus golpes sempre reduzem a barra de Firmeza (Resistência/Perfuração) dos inimigos, ignorando completamente as fraquezas nativas deles. Borboletas Estelares: sempre que um aliado (exceto ela) consome um Ponto de Habilidade ou ativa a Habilidade Suprema, Shorekeeper gera 1 Borboleta Estelar que orbita esse aliado (limite de 3). No início do turno desse aliado, as borboletas o curam em 4% do HP Máximo de Shorekeeper e concedem +5% de Dano Final e +4 de VEL por borboleta ativa.", flag: "pShorekeeper" },
  yanagi: { name: "Teorema da Desordem", desc: "A Mecânica de Desordem: sempre que Yanagi causa dano a um inimigo afetado por pelo menos 1 DoT do jogo (Ignis, Veneno, Choque, Sangramento, Glacier, Corrosão, Ciclone, Fulgur Resonance, Aero Sunder ou Afundamento), ela ativa a Desordem — calcula 120% de todo o dano que os DoTs ativos causariam em 1 turno e soma 150% do ATK atual dela, causando esse total como Dano de Habilidade Eletro instantâneo. Gestão de Recurso (Fagulhas): ativar a Desordem não remove a duração dos DoTs originais, mas consome 1 Fagulha de Anomalia do alvo (aplicada pela Perícia). Perfuração de DEF Dinâmica: a Desordem tem 15% de Perfuração base; para cada TIPO DIFERENTE de DoT ativo no alvo, a Perfuração sobe +5% (até 35% no total com 4+ tipos diferentes). Falha de Reação: se o alvo tiver DoT mas ZERO Fagulhas de Anomalia, a Desordem ocorre em estado Gasto — só 30% do dano calculado e nenhuma Perfuração de DEF.", flag: "pYana" },
    athena: { name: "Eco da Justiça", desc: "Talento passivo de duas funções simultâneas. Função 1 — Eco de Cura: sempre que Athena usar a Perícia (em qualquer Modo), um Eco de Cura é disparado automaticamente em todos os aliados que não foram o alvo principal — cada um recebe 50% do valor total da cura aplicada, calculado após todos os modificadores. Se algum desses aliados estiver com HP abaixo de 50% no momento do Eco, o valor do Eco nele é dobrado (equivalente a 100% do valor original). O Eco não conta como ação separada de Athena. Função 2 — Resistência das Casas: enquanto qualquer aliado estiver sob os buffs das 7 Casas, Athena recebe 100% de Resistência a todos os efeitos de Controle de Grupo — Atordoamento, Congelamento, Imobilização, Silêncio, Confusão e quaisquer outros que impeçam ou alterem sua ação.", flag: "pAth" },
  };
// Corrente de Ressonância / Eidolons — 6 nós ÚNICOS por personagem (estilo HSR/WuWa)
const A_SKILL = { amp: "skill", ampV: 25 }, A_ULT = { amp: "ult", ampV: 50 };
const CONS = {
  hitori: [
    { name: "C1 · Rastreadora de Cinzas", flag: "hitoriC1", desc: "Aumenta a velocidade de Hitori em 12 pontos. Quando Hitori usar o supremo, ela concederá 24% de taxa de perfuração para todos os aliados." },
    { name: "C2 · Conexão de Palco", flag: "hitoriC2", desc: "Concede 10% de chance de crítico para todos os aliados no começo da batalha. Hitori regenera 20% do HP máximo de todos os aliados quando usa o supremo." },
    { name: "C3 · Ansiedade Amplificada", flag: "hitoriC3", desc: "Foco: Otimização da Conversão de Atributos e Amplificação de ATK. Hitori transforma seu pânico interior em uma ressonância rítmica devastadora para a equipe: Aceleração Sinestésica: A taxa de conversão da sua Passiva é aprimorada: agora, a cada 2% de Dano Crítico, Hitori recebe 1 ponto de Velocidade. Impacto Sonoro: O bônus de ATK concedido pela Perícia \"Entoar da solidão\" aumenta de 1000 para 1500 de ATK e passa a ser aplicado para todos os aliados na batalha, e não apenas para um único alvo." },
    { name: "C4 · Fuga de Emergência", flag: "hitoriC4", desc: "Constelação Mediana / Utilitário. Foco: Redução de Custo de Energia, Limpeza de Debuffs e Proteção Anti-Morte. Hitori cria uma zona de conforto para a equipe, garantindo que ninguém caia enquanto a música estiver tocando: Economia de Ritmo: O custo de energia da Liberação de Ressonância (Ult) \"Kessoku Band\" é reduzido permanentemente de 160 para 130 de Energia. Mecanismo de Salvação: Sempre que um aliado prestes a sofrer dano fatal estiver em campo, Hitori nega essa morte, restaura 30% do HP Máximo desse aliado e concede a ele um Escudo de Isolamento equivalente a 100% do Dano Crítico total de Hitori por 2 rodadas (pode ser ativado 1 vez por batalha). Purificação Térmica: Ao utilizar sua Perícia, Hitori remove 1 debuff de todos os aliados." },
    { name: "C5 · Dissonância do Chaos", flag: "hitoriC5", desc: "Foco: Bônus Estatístico Massivo e Expansão Elemental. O domínio de Hitori sobre a energia Chaos atinge o ápice, rompendo as barreiras elementais tradicionais: Hitori ganha um bônus permanente e incondicional de +80% de Dano Crítico. O bônus da sua Passiva para os aliados nos dois primeiros slots aumenta de 30% para 60% de Dano de Holy e Chaos. Além disso, essa amplificação passa a cobrir todos os outros elementos do jogo na proporção de 30% de Bônus de Dano Elemental." },
    { name: "C6 · Bocchi the Rock! — O Solo Lendário", flag: "hitoriC6", desc: "Constelação Absurda. Foco: Game-Breaker, Avanço de Ação Total, Overclock de Atributos e Quebra Absoluta de Defesas. Hitori supera todos os seus medos sociais e assume o controle absoluto do campo de batalha, transformando o combate em uma apresentação ininterrupta: Efeito Kessoku Overclock: Todos os multiplicadores de conversão do Supremo \"Kessoku Band\" são dobrados: Concede 16% do seu Dano Crítico total em forma de Chance de Crítico. Concede 60% do seu Dano Crítico total em forma de Dano Crítico para os aliados. Concede 30% da sua Velocidade em forma de Bônus de Dano Elemental para os dois primeiros slots. A duração do Supremo é estendida de 4 para 6 rodadas. Injeção de Energia & Transbordo Crítico: A regeneração de energia da sua Passiva pós-Supremo aumenta de 30 para 60 de Energia para todos os aliados. Qualquer energia que exceder o limite máximo do aliado é convertida em +2% de Dano Crítico adicional para esse aliado por cada 1 ponto de energia excedente (duração de 2 rodadas). Avanço de Ação Absoluto: Ao ativar o Supremo, os aliados posicionados nos dois primeiros slots recebem um Avanço de Ação de 100% (agindo imediatamente) e seus próximos ataques ignoram 50% da DEF e 30% da Resistência Elemental de todos os inimigos." },
  ],
  lupa: [
    { name: "C1 · Rastreadora de Cinzas", flag: "lupaC1", desc: "Foco: Consistência de Acúmulo e Sustentabilidade de DoTs. Sempre que Lupa utilizar a Perícia de Ressonância \"Salto do Abismo\", a duração dos efeitos de Dano Contínuo (DoT) consumidos no alvo não é mais reduzida pela metade; em vez disso, ela extrai 100% do dano de detonação instantânea mantendo a duração original do efeito intacta no inimigo. Além disso, ao entrar em combate, Lupa aplica automaticamente 1 acúmulo de \"Ignição\" a todos os inimigos no campo por 3 turnos, e sua Taxa de Regeneração de Energia é aumentada em 15% de forma permanente." },
    { name: "C2 · Instinto da Caçadora Implacável", flag: "lupaC2", desc: "Constelação Forte. Foco: Explosão de Multiplicadores, Dano em Área e Quebra de Defesa. Lupa otimiza sua capacidade de predação elemental, transformando o consumo de anomalias em uma onda de choque devastadora: Amplificação de Matilha: Sempre que Lupa consome qualquer efeito de DoT no campo de batalha, todo o grupo recebe um bônus de 30% de Dano de Fogo e 20% de Dano de DoT por 3 turnos. Eco de Detonação: Quando a Perícia de Ressonância \"Salto do Abismo\" detona os DoTs de um alvo principal, 100% do valor total dessa detonação é replicado como Dano de Fogo em área para todos os inimigos adjacentes. Predação Absoluta Aprimorada: Ao atingir o estado \"Predadora Absoluta\" (10 cargas de Voracidade), o efeito de ignorar DEF da próxima habilidade aumenta de 20% para 40%. Além disso, a próxima Liberação de Ressonância (Ultimate) conjurada neste estado recebe um bônus adicional e incondicional de +80% de Dano Crítico." },
    { name: "C3 · Purgatório Terminal", flag: "lupaC3", desc: "Nova Mão Mecânica. Foco: Vulnerabilidade Elemental e Micro-Explosões em Cadeia. Ao consumir ou detonar qualquer efeito de DoT em um inimigo, Lupa grava nele a marca \"Chama Residual\" por 4 turnos. Inimigos marcados com Chama Residual têm sua Resistência a Fogo (RES) reduzida em 25%. Sempre que um inimigo marcado com Chama Residual sofrer dano de qualquer membro da equipe, a marca aciona uma reação térmica que causa 80% do ATK de Lupa como Dano de Fogo Adicional (pode ser ativado até 1 vez por segundo por inimigo)." },
    { name: "C4 · Barreira de Incineradores", flag: "lupaC4", desc: "Constelação Mediana. Foco: Utilitário de Sobrevivência, Regeneração Elemental e Suporte Moderado. Lupa canaliza parte do calor gerado por suas detonações para proteger a si mesma e seus aliados durante o combate: Manto Flamejante: Ao conjurar a Liberação de Ressonância (Ultimate) ou entrar no estado \"Predadora Absoluta\", Lupa concede a todos os membros da equipe um Escudo de Chamas equivalente a 150% do ATK de Lupa por 3 turnos. Ressonância Térmica: Enquanto o Escudo de Chamas estiver ativo, os aliados protegidos ganham 15% de Resistência a Todos os Elementos e regeneram 3 pontos de Energia no início de cada um de seus turnos. Sincronia Ofensiva: Se Lupa atacar um inimigo enquanto estiver protegida por este escudo, seu próprio Dano de Fogo é aumentado em +25%." },
    { name: "C5 · Garra de Almas", flag: "lupaC5", desc: "Foco: Amplificação Incondicional de Dano de Fogo e Consistência Crítica. O domínio de Lupa sobre o elemento Fogo atinge uma pureza devastadora, eliminando qualquer instabilidade em sua condução de energia elemental: Lupa recebe um bônus permanente e incondicional de +75% de Dano de Fogo e +12% de Taxa Crítica. Esse aumento é aplicado diretamente aos atributos base de Lupa, potencializando todas as suas instâncias de dano." },
    { name: "C6 · Estigma Apocalíptico — A Fome Suprema", flag: "lupaC6", desc: "Constelação Absurda. Foco: Game-Breaker, Nuke Apocalíptico e Ignorar 100% de DEF. Lupa remove todas as amarras de sua natureza predatória, reescrevendo as leis de degradação elemental e transformando o campo de batalha em um inferno incondicional: Expansão do Estômago Voraz: O limite máximo de acúmulos de \"Voracidade\" do Circuito Forte é aumentado de 10 para 15 cargas. Para cada carga acima da 10ª (do acúmulo 11 ao 15), Lupa ganha +30% de Dano Crítico adicionais (chegando a um bônus total de +150% de Dano Crítico só pelo Circuito Forte) e reduz a Resistência a Fogo dos inimigos atingidos em 8% por carga. Colapso Sem Limites (Nuke Insano): O escalonamento bônus da Liberação de Ressonância (Ultimate) por rodada de DoT consumida deixa de ter teto e passa de +200% para +350% por rodada. Caso o Nuke consuma 6 ou mais rodadas de DoT simultaneamente, a Habilidade Suprema dispara um segundo impacto imediato denominado \"Cataclismo Secundário\", causando 1.000% do ATK de Lupa como Dano de Fogo Puro, o qual ignora 100% da DEF do inimigo e 50% de sua Resistência Elemental (RES). Estado Overclock Eterno & Re-aplicação Perfeita: A duração do estado Overclock ativado pós-Ultimate é estendida de 2 para 4 turnos. Durante este período, \"Julgamento Solar\" passa a ser engatilhado automaticamente após cada uso de Perícia ou Ataque Básico. Todos os DoTs re-aplicados pelo Overclock retornam com o dano base amplificado em +300% e não podem ser purificados ou removidos pelos inimigos de forma alguma." },
  ],
  miyabi: [
    { name: "C1 · Saque Instantâneo", flag: "miC1", desc: "Ao entrar em combate, Miyabi começa imediatamente com 3 PH (máximo) e entra na Postura Iaido de graça. O primeiro corte aprimorado desta postura causa +50% de dano." },
    { name: "C2 · Fio Prorrogado", flag: "miC2", desc: "A Habilidade Lâminas de Gelo não consome mais PH se for usada contra inimigos Congelados. Além disso, cada acerto crítico recupera 5 de Energia para Miyabi." },
    { name: "C3 · Ritmo da Nevasca", ...A_SKILL, flag: "miC3", desc: "Eleva o nível do Ataque Básico e da Habilidade. Sempre que Miyabi usar a Habilidade, seu ATK aumenta em +20% até o fim do combate (acumula até 3 vezes)." },
    { name: "C4 · Domínio do Zero Absoluto", flag: "miC4", desc: "Ao conjurar a Ultimate Inverno Eterno, o campo vira uma Zona de Geada por 2 turnos. Dentro desta zona, Miyabi fica permanentemente em Postura Iaido e seus Ataques Básicos não precisam acumular nem consumir PH para ativar o corte aprimorado de penetração de DEF." },
    { name: "C5 · Gélido Ancestral", ...A_ULT, desc: "Eleva em +50% o dano da Ultimate (nevasca total em área) e reforça os Nós de Atributo de gelo." },
    { name: "C6 · Estilo Kamakura: Julgamento Final", flag: "miC6", desc: "O limite máximo de PH de Miyabi aumenta para 4. Ao atingir 4 PH, a Postura Iaido evolui para o Corte do Fim dos Tempos: o ataque passa a atingir TODOS os inimigos com 680% de ATK, ignora 50% da DEF e, se eliminar qualquer alvo, reseta instantaneamente a barra de ação de Miyabi para ela jogar de novo." },
  ],
  kaiba: [
    { name: "S1 · Mecânica de Cemitério e Reciclagem de Deck", flag: "kaibaS1", desc: "Sempre que um Monstro Invocado é destruído ou substituído, ele é enviado para o Cemitério (limite máximo de 3 monstros armazenados). Cada monstro presente no Cemitério concede a Kaiba um aumento permanente de +10% na Taxa de Regeneração de Energia e aumenta o Dano Crítico de todas as invocações ativas em 15%. Ao atingir o limite de 3 monstros no Cemitério, Kaiba consome todos os registros para reembaralhar instantaneamente as cartas de monstro de volta ao Deck Holográfico, gerando 1 Ponto de Habilidade e forçando a próxima Perícia a puxar obrigatoriamente uma carta de categoria Magia ou Armadilha." },
    { name: "S2 · Elo de Corrente (Chain Link)", flag: "kaibaS2", desc: "Ao utilizar a Perícia (Puxada do Destino), o sistema verifica a categoria da carta sacada. Se a carta atual pertencer à mesma categoria (Monstro ou Magia/Armadilha) que a carta utilizada na rodada anterior, ativa-se o efeito Chain Link 2: o efeito, dano ou buff da carta atual é executado duas vezes consecutivas na mesma ação. Caso as categorias sejam diferentes, Kaiba realiza um Descarte da carta anterior do Cemitério, desencadeando um contra-ataque reativo que causa Dano Eletro equivalente a 180% do seu ATK a todos os alvos no campo." },
    { name: "S3 · Mecânica de Mão e Invocação por Tributo", flag: "kaibaS3", desc: "Mudança de Kit: o funcionamento da Perícia é completamente reestruturado. Em vez de executar a carta imediatamente após a puxada, a Perícia passa a adicionar as cartas sacadas a uma Mão Virtual (limite máximo de 3 cartas na mão). Kaiba agora pode gerenciar e escolher manualmente qual carta da mão ativar durante a sua fase de ação, gastando o Ponto de Habilidade apenas no momento da ativação real da carta. Aprimoramento do Talento: o limite de monstros simultâneos em campo aumenta para 2. Invocação por Tributo: se Kaiba possuir 2 monstros ativos em campo, ele ganha a habilidade de Tributar ambos (destruindo-os voluntariamente) para conjurar qualquer carta de sua Mão Virtual sem gastar Pontos de Habilidade. Essa ação avança a próxima ação de Kaiba em 100% na Ordem de Turnos e dobra o multiplicador de dano da carta ativada." },
    { name: "S4 · Campo de Duelo: Arena KaibaCorp", flag: "kaibaS4", desc: "Ao ativar a Habilidade Suprema, o cenário do combate é modificado, ativando a zona de campo Arena KaibaCorp por 3 ciclos completos de rodada. Enquanto a Arena estiver ativa, todos os inimigos sofrem uma redução de 18% em suas Resistências Elementais globais. Além disso, sempre que um Monstro Invocado aliado desferir um ataque dentro da Arena, o inimigo com a maior DEF presente no campo tem 35% de sua DEF drenada antes do cálculo do impacto; esse valor de DEF roubado é convertido diretamente em ATK líquido para o monstro atacante até o encerramento do seu turno." },
    { name: "S5 · Sobrecarga do Atormentador", flag: "kaibaS5", desc: "O dano de todos os Monstros Invocados passa a receber um multiplicador multiplicativo extra baseado na proporção entre a barra de Firmeza máxima do inimigo e o ATK total de Kaiba. Se a carta lendária Obelisco, o Atormentador for ativada enquanto a zona de campo Arena KaibaCorp estiver ativa, o impacto do Punho do Destino purga e remove instantaneamente todos os buffs positivos, escudos e melhorias dos inimigos em campo, convertendo cada efeito removido em +60% de multiplicador de Dano Verdadeiro para a detonação." },
    { name: "S6 · Trindade do Caos", flag: "kaibaS6", desc: "Mudança de Kit: a Habilidade Suprema deixa de invocar apenas o Dragão de Olhos Azuis Base e passa a rastrear o histórico de combate da partida. Fusão Neutrônica Absoluta: se o jogo contabilizar que 3 Dragões de Olhos Azuis passaram pelo campo ou pelo Cemitério ao longo do combate, a ativação da Suprema consome esses registros para realizar a Fusão, invocando o Dragão Alado de Olhos Azuis da Eternidade. Mecânica da Fusão: o Dragão da Eternidade ocupa o campo de forma permanente (não pode ser substituído por monstros comuns da Perícia). Ele possui 3 barras de ação independentes na Ordem de Turnos (uma para cada cabeça). Cada cabeça executa um ataque autônomo de 400% de ATK que ignora completamente salvaguardas de imortalidade, efeitos de ressurreição passiva e mecânicas de partilha de dano dos inimigos. Interação Divina: se a carta do Obelisco estiver presente na Mão Virtual ou no Deck no momento em que a Fusão for consolidada, Obelisco é invocado automaticamente como uma unidade de cobertura de Ataque Extra indestrutível no início de cada ciclo, executando um golpe esmagador que atrasa a ação de toda a linha inimiga em 100%." },
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
    { name: "C1 · Aura Estelar", flag: "kirC1", desc: "Mudança de kit: a Habilidade de Kirara passa a conceder escudo a TODO o time. Cada aliado recebe 80% do valor do escudo principal — Kirara para de proteger só um e começa a blindar todos ao mesmo tempo." },
    { name: "C2 · Guardião Cósmico", flag: "kirC2", desc: "Os escudos de Kirara ficam +30% mais fortes. Quando a Habilidade é usada, o aliado com menos escudo recebe +15% de DEF por 2 turnos, empilhando proteção onde mais importa." },
    { name: "C3 · Compressão Estelar", ...A_SKILL, ampV: 30, desc: "Nível da Habilidade +2 / Básico +1. +30% no valor do escudo da Habilidade — cada ponto de DEF se converte em barreiras ainda mais grossas." },
    { name: "C4 · Modo Guardião Ativo", flag: "kirC4", desc: "Mudança de kit: enquanto o escudo de Kirara estiver ativo, todos os aliados ganham +15% de redução de dano adicional. Ao usar a Ultimate, Kirara recupera imediatamente 20 de Energia." },
    { name: "C5 · Muralha do Cosmos", ...A_ULT, ampV: 60, desc: "Nível da Ultimate +2 / Talento +2. +60% no escudo e no buff de DEF do Ultimate — a Constelação Guardiã atinge seu pico de proteção absoluta." },
    { name: "C6 · Muralha Estelar Absoluta", flag: "kirC6", desc: "Capstone: a Ultimate concede escudos 50% mais grossos E +25% de Bônus de Dano ao time por 2 turnos. Enquanto qualquer aliado tiver escudo ativo, Kirara provoca TODOS os inimigos — a guardiã cósmica não descansa." },
  ],
  yoruichi: [
    { name: "S1 · Corrente Corrosiva", flag: "yoruS1", desc: "Sempre que um Clone Residual (gerado pelo Talento) atinge um inimigo, esse inimigo perde 4% de DEF por 2 turnos. O efeito acumula até 5 vezes no mesmo alvo (até -20% de DEF total), tornando Yoruichi uma boa abridora de dano pro resto do time." },
    { name: "S2 · Ressonância Crítica", flag: "yoruS2", desc: "Enquanto um inimigo estiver com a marca de +20% de dano recebido do Colapso Elétrico ativa, o dano registrado pelo Domínio Magnético (o 'Eco' que detona no turno dela) ganha um multiplicador extra igual à Taxa de CRIT atual de Yoruichi — quanto mais CRIT ela tiver, maior a detonação final." },
    { name: "S3 · Sincronia de Combate", flag: "yoruS3", desc: "Mudança de kit: o Talento de Yoruichi passa a reconhecer as Supremas ofensivas dos aliados como Ataques Extras também. Ou seja, toda vez que outro personagem usar a própria Ultimate contra um inimigo, Yoruichi intercepta como se fosse um contra-ataque — conjura um Clone Residual (500% VEL) e soma pro contador do Colapso Elétrico e pro registro do Ponto de Aterramento, mesmo sem nenhum contra-ataque de verdade ter acontecido." },
    { name: "S4 · Fluxo Vital", flag: "yoruS4", desc: "Sempre que o Colapso Elétrico detonar (a cada 3 Clones Residuais acionados), Yoruichi recupera 5 de Energia na hora, e o aliado com menor % de HP da equipe é curado em 10% do HP Máximo dele — dá sustentação extra em lutas longas sem precisar de um healer dedicado só pra ela." },
    { name: "S5 · Aterramento Perfeito", flag: "yoruS5", desc: "A taxa de conversão de dano do Ponto de Aterramento (Perícia) sobe de 35% para 52% — ou seja, o Eco registrado e detonado no início do turno dela fica bem mais forte, tornando o Domínio Magnético uma fonte de dano relevante por si só, não só um habilitador de VEL pro time." },
    { name: "S6 · Sobrecarga Total", flag: "yoruS6", desc: "Mudança de kit: o teto do bônus de Dano Crítico do Talento (Frequência Shunpo) sobe de 60% para 160% — com VEL bem alta, o time inteiro fica com CRIT DMG absurdo nos Ataques Extras. Além disso, a detonação do Ponto de Aterramento deixa de bater só no alvo marcado: o dano principal continua nele, mas 50% desse valor se espalha automaticamente pra TODOS os outros inimigos vivos — vira uma explosão em área no fim da rotação dela." },
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
  lancer: [
    { name: "C1 · Proteção do Herói", flag: "lancerC1", desc: "Mudança de kit: Lancer entra em batalha com 1 carga de Esquiva Absoluta gratuita, evitando o primeiro golpe sem custo." },
    { name: "C2 · Lança Acelerada", stat: "energyMax", value: -15, desc: "Aprimoramento: o custo de Energia da Ultimate cai de 110 para 95, permitindo disparar Gáe Bolg com muito mais frequência." },
    { name: "C3 · Maestria da Lança", amp: "skill", ampV: 25, desc: "Eleva o nível da Habilidade e do Ataque Básico. Bônus de +25% de dano na Proteção contra Flechas." },
    { name: "C4 · Contra-Ataque Espiral", flag: "lancerC4", desc: "Mudança de kit: toda vez que uma Esquiva Absoluta for ativada para bloquear um ataque, Lancer contra-ataca instantaneamente causando 80% de ATK em Dano de Caos." },
    { name: "C5 · Poder da Gáe Bolg", amp: "ult", ampV: 50, desc: "Eleva o nível da Ultimate e do Talento em +50% de dano — a Lança da Morte Perfurante atinge seu pico de lethality." },
    { name: "C6 · Runa da Perfuração", flag: "lancerC6", desc: "Mudança de kit (capstone): Gáe Bolg passa a ignorar 20% da DEF do alvo, além do Crítico Garantido abaixo de 50% de HP — tornando Lancer o DPS de execução definitivo." },
  ],
  nanami: [
    { name: "C1 · Calculista Preciso", stat: "critDmg", value: 20, desc: "Aprimoramento: Dano CRIT de Nanami aumenta permanentemente em +20%." },
    { name: "C2 · Desarmadura Profissional", flag: "nanamC2", desc: "Mudança de kit: a redução de DEF da Ultimate Colapso sobe de 15% para 20%." },
    { name: "C3 · Ritmo do Expediente", amp: "skill", ampV: 25, desc: "Eleva o nível da Habilidade e do Ataque Básico. +25% de dano na Razão 7:3." },
    { name: "C4 · Limpeza de Hora Extra", flag: "nanamC4", desc: "Mudança de kit: ao entrar em Hora Extra (turno 5+), Nanami limpa instantaneamente todos os seus próprios debuffs." },
    { name: "C5 · Colapso Total", amp: "ult", ampV: 50, desc: "Eleva o nível da Ultimate e do Talento em +50% de dano — Colapso vira uma extinção em massa." },
    { name: "C6 · Certeza Matemática", flag: "nanamC6", desc: "Mudança de kit (capstone): a Razão 7:3 sempre causa Crítico Garantido, independentemente do dígito do dano — a proporção torna-se absoluta." },
  ],
  nami: [
    { name: "C1 · Tempestade Prolongada", flag: "namiC1", desc: "Mudança de kit: a duração do DoT Ciclone da Habilidade aumenta para 3 turnos em vez de 2." },
    { name: "C2 · Vento Cortante", flag: "namiC2", desc: "Mudança de kit: Nami causa +15% de Dano de Vento contra alvos com a VEL reduzida pelo Ciclone." },
    { name: "C3 · Gust Aprimorado", amp: "skill", ampV: 25, desc: "Eleva o nível da Habilidade e do Ataque Básico. +25% de dano no Gust Sword." },
    { name: "C4 · Tempestade Energética", flag: "namiC4", desc: "Mudança de kit: ao conjurar Zeus Breeze Tempo, Nami regenera instantaneamente 15 de Energia — reduzindo o ciclo da próxima Ultimate." },
    { name: "C5 · Raio de Zeus", amp: "ult", ampV: 50, desc: "Eleva o nível da Ultimate e do Talento. +50% de dano no Zeus Breeze Tempo." },
    { name: "C6 · Explosão Total de DoT", flag: "namiC6", desc: "Mudança de kit (capstone): o multiplicador de detonação dos DoTs na Ultimate sobe de 60% para 100% — cada DoT explode no seu valor integral." },
  ],
  ryoshu: [
    { name: "C1 · A Primeira Teia", flag: "ryoC1", desc: "Ryoshu entra em batalha com 3 PH. O dreno da Habilidade custa apenas 10% do HP dos aliados, mas os multiplicadores são calculados como 15%." },
    { name: "C2 · Fios Farpados", flag: "ryoC2", desc: "Ao consumir HP de um aliado, ele recebe Fio Guia: dano recebido -30% e 10% do dano mitigado é refletido como Dano Vírus." },
    { name: "C3 · Mestre da Casa das Aranhas", amp: "skill", ampV: 25, desc: "Nível da Habilidade +2 / Nível do Básico +1. +25% de dano em Marionetes de Sangue." },
    { name: "C4 · Estética da Agonia", flag: "ryoC4", desc: "Ryoshu recupera 5 de Energia extra para cada aliado drenado enquanto estiver com buff positivo ativo." },
    { name: "C5 · Arte em Vermelho Escuro", amp: "ult", ampV: 50, desc: "Nível da Ultimate +2 / Nível do Talento +2. +50% de dano em A Tela da Aranha." },
    { name: "C6 · A Oitava Arte: Fio do Destino Cortado", flag: "ryoC6", desc: "O Dano Verdadeiro de Chefes salta de 300% para 600% do HP drenado. Se a Ultimate for usada com todos os aliados abaixo de 50% HP, não consome PH e Ryoshu age novamente." },
  ],
  frieren: [
    { name: "C1 · Despertar da Preguiça", flag: "frC1", desc: "Frieren entra na batalha já com 2 Pontos de Elemento gerados aleatoriamente, permitindo usar opções avançadas do Supremo no primeiro turno." },
    { name: "C2 · Zoltraak Aprimorado (Dispersão)", flag: "frC2", desc: "Quando Frieren escolhe Zoltraak no Supremo, o feixe atravessa o alvo principal e atinge inimigos adjacentes causando 50% do dano." },
    { name: "C3 · Grimório Antigo", amp: "skill", ampV: 25, desc: "Nível da Habilidade +2 / Nível do Básico +1. +25% de dano no Grimório do Colecionador." },
    { name: "C4 · Aura Oculta Repressora", flag: "frC4", desc: "Passivo permanente: Frieren ganha +30% de Taxa de Regeneração de Energia (multiplica todos os ganhos de energia por ×1.30). Enquanto a Suprema estiver cheia (100%), a DEF de todos os inimigos é reduzida em 20% e Frieren regenera +8 de Energia adicional por turno, acelerando drasticamente o próximo ciclo." },
    { name: "C5 · Compressão de Mana Milenar", amp: "ult", ampV: 50, desc: "Nível do Supremo +2 / Nível do Talento +2. +50% de dano em Descompressão de Mana." },
    { name: "C6 · A Maga Que Derrotou o Rei Demônio", flag: "frC6", desc: "Zoltraak causa Morte Instantânea em inimigos comuns/elites com menos de 30% HP. Contra Chefes, ignora 100% da DEF e reduz resistência Holy a zero até o fim da batalha." },
  ],
  uraraka: [
    { name: "C1 · Gravidade Amplificada", flag: "uraC1", desc: "Mudança de kit: o bônus de ATK da Habilidade Zero Gravity sobe de 20% para 25%." },
    { name: "C2 · Escudo Orbital", flag: "uraC2", desc: "Mudança de kit: ao ativar a Ultimate, Uraraka gera um escudo para si mesma equivalente a 10% do HP máximo." },
    { name: "C3 · Zero G Aprimorado", amp: "skill", ampV: 25, desc: "Eleva o nível da Habilidade e do Ataque Básico. +25% de dano no Combate de Gravidade." },
    { name: "C4 · Gravidade Persistente", flag: "uraC4", desc: "Mudança de kit: a duração do buff de ATK global da Ultimate aumenta para 3 turnos em vez de 2." },
    { name: "C5 · Chuva Devastadora", amp: "ult", ampV: 50, desc: "Eleva o nível da Ultimate e do Talento. +50% de dano na Chuva de Destroços." },
    { name: "C6 · Custo Zero", flag: "uraC6", desc: "Mudança de kit (capstone): o aliado com buff de Zero Gravity ativo recebe -10 pontos de custo fixo na própria Ultimate — combinações devastadoras tornam-se muito mais frequentes." },
  ],

    wonderofyou: [
      { name: "E1 · Calamidade Sem Escolha", flag: "wooE1", desc: "Mudança de kit: A Perícia Calamidade Inevitável agora concede todos os 8 Buffs Únicos com 120% da potência original (ex.: Força do Destino passa de +40% ATQ para +48% ATQ). Além disso, os 4 Debuffs Especiais passam a ignorar 35% da Resistência a Efeitos dos inimigos ao serem aplicados. Por fim, sempre que um Buff ativo em um aliado for renovado pela Perícia ou pela Suprema, esse Buff aumenta sua própria duração em +1 turno adicional, podendo acumular até no máximo 6 turnos de duração total." },
      { name: "E2 · Ser Evitado", flag: "wooE2", desc: "Mudança de kit: Os 4 Debuffs Especiais exclusivos de Wonder of You (Calamidade, Acidente Inevitável, Má Fortuna e Destino Quebrado) tornam-se permanentes enquanto ela permanecer vivo em combate — sua duração não diminui mais a cada turno. Esses Debuffs passam a ignorar imunidade a efeitos, ignorar resistência a efeitos, não podem ser dissipados por nenhuma habilidade ou item, não podem ser copiados por outras unidades e não podem ser transferidos. Contra Chefes: a redução de duração de habilidades de controle é limitada a 60% da duração original, mas todos os demais efeitos dos Debuffs Especiais são mantidos integralmente. Adicionalmente, sempre que um inimigo receber qualquer outro debuff de qualquer fonte, um Debuff Especial aleatório (dentre os que ele ainda não possui) é automaticamente aplicado nele também." },
      { name: "E3 · A História Já Foi Escrita", ...A_SKILL, desc: "O nível da Perícia Calamidade Inevitável aumenta em +2 (máximo de nível 15). O nível do Ataque Básico Toque do Fim aumenta em +1 (máximo de nível 10). Além do aumento de nível padrão, todos os multiplicadores numéricos da Perícia são aumentados em 25%: o dano base, os valores dos Buffs concedidos e a potência dos Debuffs Especiais aplicados são todos amplificados por esse fator simultaneamente." },
      { name: "E4 · O Universo Sempre Cobra Seu Preço", flag: "wooE4", desc: "Mudança de kit: para cada tipo de Buff diferente ativo em qualquer aliado da equipe, Wonder of You ganha +6% de Dano Final, +4% de penetração de DEF e +3 de Velocidade (esses bônus são calculados e aplicados dinamicamente a cada turno). Para cada Debuff Especial ativo em qualquer inimigo em campo, Wonder of You e seus aliados ganham +8% de Vulnerabilidade aplicada ao alvo, +5% de eficiência de Quebra de Fraqueza e +5% de Eficiência de Quebra geral contra ele. Efeito especial: se todos os 8 Buffs e todos os 4 Debuffs Especiais estiverem simultaneamente ativos no campo de batalha, todos os aliados recebem uma ação adicional automática ao final de cada turno." },
      { name: "E5 · O Infortúnio Não Conhece Limites", ...A_ULT, desc: "O nível da Suprema Lei da Calamidade Absoluta aumenta em +2 (máximo de nível 15). O nível do Talento A Lei Natural do Infortúnio aumenta em +2 (máximo de nível 15). Além do aumento de nível padrão, a Suprema ganha um efeito adicional: ao ser conjurada, ela verifica todos os Buffs e Debuffs Especiais que estavam ativos antes de sua conjuração e reaplica instantaneamente qualquer um que tenha sido removido ou expirado durante o combate, renovando sua duração completa." },
      { name: "E6 · Wonder of U", flag: "wooE6", desc: "Mudança de kit (Capstone — Eidolão Máximo): Todos os 8 Buffs Únicos concedidos pela Perícia tornam-se permanentes enquanto Wonder of You estiver em campo. Todos os 4 Debuffs Especiais tornam-se permanentes enquanto Wonder of You estiver em campo. Novo efeito — Julgamento da Calamidade: sempre que qualquer inimigo realizar uma das seguintes ações — atacar, usar uma Perícia, usar uma Suprema, invocar unidades aliadas, receber qualquer buff, recuperar HP, remover algum Debuff, ou avançar sua própria barra de ação — ele sofre imediatamente o Julgamento da Calamidade: causa Dano Quântico equivalente a 650% do ATQ de Wonder of You, ignora 60% da DEF do alvo, ignora 50% da Resistência a Todos os Tipos e aplica atraso de ação de 40% no alvo. Proteção aos aliados: enquanto Wonder of You estiver em campo, nenhum aliado pode ter seus Buffs removidos por qualquer fonte. Contenção dos inimigos: nenhum inimigo pode remover os Debuffs Especiais por qualquer meio." },
    ],
    agumon: [
      { name: "C1 · Ignis-X Activation", flag: "aguC1", desc: "Aceleração Térmica: o limite de Calor para entrar no MODO X é reduzido — basta estar ACIMA DE 75 de Calor (em vez de 90-99) ao evoluir para WarGreymon. Permite atingir o potencial máximo da forma Mega muito mais rápido, sem flertar com o Meltdown." },
      { name: "C2 · Data-Stream Overflow", flag: "aguC2", desc: "Acúmulo de TamerSP: o TamerSP máximo sobe para 250. Além disso, sempre que Agumon (em qualquer forma) sofrer dano, ele ganha 1 de TamerSP para cada 5% do HP Máximo recebido em dano. Ele vira um gerador de recursos: apanhar também alimenta a evolução." },
      { name: "C3 · Entropy Equilibrium", flag: "aguC3", desc: "Estabilidade de Calor: a perda de 5% de HP por turno do Overclocking Terminal é REMOVIDA. Com Calor acima de 70, em vez de perder vida, Agumon converte 10% do seu ATK em Escudo a cada rodada. Um bruiser de sustentação que vive no vermelho sem medo." },
      { name: "C4 · X-Antibody Synchro", flag: "aguC4", desc: "Sincronia de Combate: +20% de Dano de Fogo e +25% de Dano Crítico permanentes. Além disso, o Supremo (Pepper Breath, Nova Blast, Tera Destroyer ou Gaia Force) causa +200% de dano em TODAS as formas." },
      { name: "C5 · Gaia Singularit-X", flag: "aguC5", desc: "A Supremacia da Gaia Force: se o alvo sobreviver à Gaia Force, recebe RUPTURA DE REALIDADE por 2 rodadas — todo dano recebido (de qualquer fonte do time) ignora completamente a DEF do inimigo (tratado como Dano Verdadeiro). O abridor de portas supremo contra chefes de altíssima DEF." },
      { name: "C6 · Final Digital Evolution", flag: "aguC6", desc: "A Forma Eterna (Capstone): Agumon já COMEÇA a batalha na forma Greymon. O Calor NUNCA MAIS SOBE (Perícias deixam de gerar Calor) — Digievoluir passa a depender só do TamerSP, sem janela térmica nenhuma. Ele NUNCA regride para a forma base (Agumon), nem por Meltdown, nem por evolução instável — praticamente impossíveis de acontecer já que o Calor não sobe mais. Ao evoluir para WarGreymon, o MODO X é SEMPRE ativado. Se o WarGreymon derrotar um inimigo em MODO X, o modo é ESTENDIDO até o fim da próxima rodada dele." },
    ],
    shorekeeper: [
      { name: "C1 · O Primeiro Arquivo", flag: "shkC1", desc: "As Borboletas Estelares passam a alterar a gravidade ao redor dos aliados. Aliados com pelo menos 1 Borboleta ativa recebem 15% de Redução de Dano de todas as fontes. Além disso, o limite máximo de Borboletas orbitando um único aliado aumenta de 3 para 5." },
      { name: "C2 · Expansão de Servidor", flag: "shkC2", desc: "Shorekeeper sobrecarrega a capacidade de processamento do sistema da equipe. O limite máximo de Pontos de Perícia da equipe é aumentado permanentemente em 2 (o limite padrão de 5 passa a ser 7). Ao entrar em qualquer combate, a equipe já inicia imediatamente com 3 Pontos de Perícia pré-carregados." },
      { name: "C3 · Loop de Memória", amp: "ult", ampV: 20, desc: "Nível da Habilidade Suprema +2 (até o máximo). Nível do Ataque Básico +1 (até o máximo) — eleva o dano da Suprema e do Básico dela." },
      { name: "C4 · Calibração do Caos", flag: "shkC4", desc: "Ao usar a Perícia Teoria do Caos, a Vida Máxima (HP) do aliado curado e da própria Shorekeeper aumenta em 15% por 3 turnos — potencializa dinamicamente os multiplicadores dela, que escalam com HP." },
      { name: "C5 · Cálculos Inescrutáveis", amp: "skill", ampV: 20, desc: "Nível da Perícia +2 (até o máximo). Nível do Talento +2 (até o máximo) — fortalece a cura da Perícia e a potência das Borboletas Estelares." },
      { name: "C6 · Soberana da Costa Negra", flag: "shkC6", desc: "O feixe destrutivo do Estágio 3 (Supernova) da Suprema tem seu multiplicador de dano dobrado (de 330% para 660% do HP de Shorekeeper). Zero Absoluto: enquanto o Estelarador estiver no Estágio 2 ou 3, os ataques de TODOS os aliados passam a ignorar 25% da DEF e 20% da Resistência Elemental dos inimigos." },
    ],
    yanagi: [
      { name: "S1 · Ciclo de Ruído Perfeito", flag: "yanaS1", desc: "Sempre que a reação de Desordem for desencadeada em um inimigo que possua 3 ou mais Fagulhas de Anomalia, o impacto inicial estilhaça a resistência elemental do alvo — a Resistência Elemental correspondente aos elementos dos DoTs atualmente ativos no alvo é reduzida em 15% por 2 turnos. Adicionalmente, quando a própria Yanagi ativa uma Desordem, sua ação é avançada em 20%." },
      { name: "S2 · Contágio Eletromagnético", flag: "yanaS2", desc: "Quando a Habilidade Suprema ativa a Desordem Absoluta, o sistema de Yanagi escaneia o alvo principal (o inimigo com maior HP máximo atingido). Todos os DoTs presentes neste alvo principal são instantaneamente clonados e aplicados a todos os outros inimigos no campo por 2 turnos. Estes DoTs clonados herdam 100% dos multiplicadores originais e recebem um bônus fixo de +10% de Perfuração de DEF." },
      { name: "S3 · Sobrecarga de Capacidade", flag: "yanaS3", desc: "Mudança de Kit: o limitador do equipamento de Yanagi é desativado permanentemente. O limite máximo de Fagulhas de Anomalia que um inimigo pode acumular passa de 5 para 8. Efeito Paralisante: a Perícia é expandida — para cada Fagulha de Anomalia presa ao inimigo, ele perde 3% de seu ATK total. Se um inimigo atingir a carga máxima de 8 Fagulhas, sofre um Apagão Sistêmico imediato: ação atrasada em 40% na Ordem de Turnos e incapaz de usar habilidades em área na próxima rodada." },
      { name: "S4 · Ressonância de Vácuo Absoluto", flag: "yanaS4", desc: "O debuff Isolamento Corrosivo (gerado pela Suprema) ganha propriedades de distorção de realidade. Inimigos sob este efeito perdem a redução inata de dano contra elementos fora de sua fraqueza (tratados como se tivessem fraqueza a todos os elementos para fins de Dano Contínuo). Além disso, sempre que um DoT causar dano a um inimigo sob Isolamento Corrosivo, toda a equipe de Yanagi regenera HP equivalente a 15% do ATK atual dela — permitindo abrir mão de um Healer dedicado." },
      { name: "S5 · Calibração de Singularidade", flag: "yanaS5", desc: "Aumenta o ATK Base de Yanagi em 25%. A restrição natural do jogo sobre Dano Contínuo é ignorada: a Desordem Absoluta (Suprema) agora pode causar Acerto Crítico, calculando o dano assumindo uma Taxa Crítica fixa de 100% e um Dano Crítico fixo de 150%, convertendo o gatilho da Suprema num golpe de finalização nuclear, independente da build de crítico do jogador." },
      { name: "S6 · O Manto do Caos Primordial", flag: "yanaS6", desc: "Mudança de Kit (capstone): a ativação da Desordem não consome mais apenas 1 Fagulha — consome TODAS as Fagulhas de Anomalia do alvo de uma vez. Para cada Fagulha consumida, o dano final da Desordem é multiplicado em +35% (até +280% com 8 Fagulhas via S3). Aura do Fim: o Ataque Básico e a Perícia passam a aplicar passivamente Zero Absoluto por 3 turnos — um DoT coringa que copia o dano base, elemento e multiplicadores do DoT mais forte atualmente em campo. Se o dano da Desordem deixar um inimigo com menos de 10% do HP Máximo, ele é executado imediatamente." },
    ],
    athena: [
      { name: "C1 · Arquitetura do Destino", flag: "athC1", desc: "Mudança de kit: a aba de seleção de aliados da Suprema Expansão das 7 Casas ganha o Modo Totalitário. Nesse modo, além de distribuir os buffs normalmente, Athena pode marcar um único aliado como Guardado pelas Casas. O aliado marcado recebe todos os buffs da Suprema em dobro: +60% de VEL, +60% de DEF e +40% de Taxa de CRIT, em vez dos valores padrão. Os demais aliados não marcados ainda recebem os buffs normais (+30% VEL, +30% DEF, +20% CRIT). Isso permite concentrar todo o poder das Casas em um único Hyper-Carry ou garantir que o personagem mais importante do time nunca seja atingido de forma crítica." },
      { name: "C2 · Sinfonia da Velocidade", flag: "athC2", desc: "Mudança de kit: a Lei da Inércia entra em efeito. Sempre que qualquer aliado sob o efeito dos buffs das 7 Casas (ou seja, enquanto a Suprema estiver ativa) realizar qualquer ação — seja um Ataque Básico, uma Perícia ou qualquer outra habilidade — Athena avança automaticamente sua própria barra de ação em 15%. Esse avanço não conta como uma ação e não consome recursos. O efeito pode ser ativado por qualquer aliado elegível, sem limite de vezes por turno. Isso garante que Athena tenha turnos quase contínuos enquanto o time estiver ativo, permitindo manter o Modo Aprimorado da Perícia ativo praticamente 100% do tempo sem precisar investir pesadamente em Velocidade na build." },
      { name: "C3 · Domínio de Santuário", ...A_SKILL, desc: "O nível da Perícia Bênção do Santuário aumenta em +2 (máximo de nível 15). O nível da Suprema Expansão das 7 Casas aumenta em +2 (máximo de nível 15). Isso amplifica diretamente todos os multiplicadores de cura (mais HP restaurado por uso da Perícia), os valores dos buffs concedidos pela Suprema (maior bônus de VEL, DEF e CRIT) e o dano do Modo Aprimorado da Perícia (escalonamento de ATK + VEL aumentado). Essencial para o conteúdo de End Game onde cada ponto percentual de cura e de buff faz diferença." },
      { name: "C4 · Justiça Retributiva", flag: "athC4", desc: "Mudança de kit: enquanto a Suprema Expansão das 7 Casas estiver ativa, qualquer inimigo que atacar qualquer aliado sob o efeito dos buffs das 7 Casas recebe automaticamente o debuff Julgamento do Santuário: a DEF desse inimigo é reduzida em 20% pela duração de 2 turnos. Contra Chefes: além da redução de DEF, o Chefe também sofre Dano Holy puro (não pode ser resistido por Resistência Holy) a cada ação que ele realizar, calculado como 10% da Velocidade atual de Athena convertida em dano fixo. Esse dano ocorre antes da ação do Chefe ser executada, tornando Athena uma fonte passiva de dano contra conteúdo de alta dificuldade sem precisar de nenhuma ação extra." },
      { name: "C5 · Visão do Zodíaco", ...A_ULT, desc: "O nível do Talento Eco da Justiça aumenta em +2 (máximo de nível 15). O nível do Ataque Básico Julgamento Divino aumenta em +2 (máximo de nível 10). O aumento do Talento amplifica diretamente o valor do Eco de Cura disparado em todos os aliados não-alvo (de 50% para um valor maior conforme a tabela de nível), além de reforçar a Resistência a Controle de Grupo durante as 7 Casas. O aumento do Ataque Básico melhora o dano e a recuperação de energia por uso, otimizando a rotação de energia para conjurar a Suprema mais rapidamente." },
      { name: "C6 · Ascensão Divina: O Trono das 7 Casas", flag: "athC6", desc: "Mudança de kit (Capstone — Constelação Máxima): a Suprema Expansão das 7 Casas perde completamente o limite de duração enquanto Athena estiver viva em campo. Assim que a Suprema é conjurada pela primeira vez, os buffs das 7 Casas (+30% VEL, +30% DEF, +20% CRIT — ou em dobro se C1 estiver ativo) tornam-se Auras Permanentes que persistem até o fim da batalha ou até Athena ser derrotada, sem necessidade de reconjuração. Adicionalmente, a aba de seleção de aliados das 7 Casas pode ser reaberta a qualquer momento a cada 2 turnos de Athena para redistribuir ou mudar os alvos dos buffs sem nenhum custo de Energia. Isso transforma Athena de uma personagem de gerenciamento de buffs em uma Fonte de Poder Infinita, permitindo que o time inteiro opere com buffs permanentes de alto nível do início ao fim do combate." },
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
  kaiba: ["Decreto Corporativo", "Puxada do Destino", "Invocação do Dragão Branco de Olhos Azuis"],
  renji: ["Golpe de Zabimaru", "Hikotsu Taihō", "Hihiō Zabimaru"],
  ace: ["Soco Flamejante", "Punho de Fogo", "Grande Incêndio"],
  usopp: ["Tiro Certeiro", "Estilingue Tático", "Pop Green: Impacto"],
  sakura: ["Golpe Centena", "Soco Esmagador", "Punho Sobre-humano"],
  chopper: ["Investida", "Cuidado Médico", "Operação de Emergência"],
  kirara: ["Toque Estelar", "Escudo Cósmico", "Constelação Guardiã"],
  yoruichi: ["Golpe Relâmpago", "Domínio Magnético", "Shunko: Raijin"],
  kiritsugu: ["Tiro de Origem", "Bala Calculada", "Time Alter: Triple Accel"],
  ryoshu: ["F.P. [Fio Peçonhento]", "M.D.S. [Marionetes de Sangue]", "A.T.D.A. [A Tela da Aranha]"],
  frieren: ["Magia Comum", "Grimório do Colecionador", "Descompressão de Mana"],
  soifon: ["Golpe Duplo da Suzumebachi", "Nigeki Kessatsu", "Jakuhō Raikōben"],
  omegamon: ["Garuru Cannon: Rajada Corrompida", "Grey Sword: Protocolo de Infecção", "All Delete: Recálculo de Vazio"],
  lancer: ["Estocada Rápida", "Proteção contra Flechas", "Gáe Bolg: A Lança da Morte Perfurante"],
  nanami: ["Golpe de Cutelo", "Razão 7:3", "Colapso"],
  nami: ["Golpe com Clima-Tact", "Gust Sword", "Zeus Breeze Tempo"],
  uraraka: ["Combate de Gravidade", "Zero Gravity", "Chuva de Destroços"],
    wonderofyou: ["Toque do Fim", "Calamidade Inevitável", "Lei da Calamidade Absoluta"],
    athena: ["Lança de Luz", "Bênção das Sete Casas", "Julgamento do Olimpo"],
    agumon: ["Garra Afiada", "Baby Flame", "Pepper Breath"],
    shorekeeper: ["Origem da Ciência", "Teoria do Caos", "Fim do Lamento"],
    yanagi: ["Corte Voltaico", "Ciclo de Anomalia", "Eclipse Voltaico"],
  lupa: ["Presa Incandescente", "Salto do Abismo", "Eclipse de Fogo — Cataclismo Apocalíptico"],
  hitori: ["Dedilhado Ansioso", "Entoar da Solidão", "Kessoku Band"],
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
  yoruichi: [
    { stat: "spd", value: 6, label: "VEL +6", cost: 700 },
    { stat: "critDmg", value: 10, label: "CRIT DMG +10%", cost: 700 },
    { stat: "critRate", value: 5, label: "CRIT +5%", cost: 700 },
    { stat: "hp", value: 8, label: "HP +8%", cost: 500 },
    { stat: "def", value: 8, label: "DEF +8%", cost: 500 },
    { stat: "spd", value: 5, label: "VEL +5", cost: 900 },
  ],
  agumon: [
    { stat: "breakEffect", value: 10, label: "Perfuração +10%", cost: 700 },
    { stat: "elemDmg", element: "Fogo", value: 12, label: "Dano de Fogo +12%", cost: 700 },
    { stat: "atk", value: 15, label: "ATK +15%", cost: 900 },
    { stat: "hp", value: 8, label: "HP +8%", cost: 600 },
    { stat: "def", value: 12, label: "DEF +12%", cost: 600 },
    { stat: "elemDmg", element: "Fogo", value: 6, label: "Dano de Fogo +6%", cost: 500 },
  ],
  miyabi: [
    { stat: "atk", value: 6, label: "ATK +6%", cost: 500 },
    { stat: "critRate", value: 5, label: "CRIT +5%", cost: 700 },
    { stat: "critDmg", value: 12, label: "CRIT DMG +12%", cost: 900 },
    { stat: "elemDmg", element: "Glacial", value: 4.8, label: "Dano Glacial +4.8%", cost: 600 },
    { stat: "elemDmg", element: "Glacial", value: 6.4, label: "Dano Glacial +6.4%", cost: 700 },
    { stat: "spd", value: 5, label: "VEL +5", cost: 1100 },
  ],
  ryoshu: [
    { stat: "critRate", value: 5, label: "CRIT +5%", cost: 700 },
    { stat: "critRate", value: 5, label: "CRIT +5%", cost: 700 },
    { stat: "critDmg", value: 12, label: "CRIT DMG +12%", cost: 900 },
    { stat: "elemDmg", element: "Virus", value: 4.8, label: "Dano Vírus +4.8%", cost: 600 },
    { stat: "elemDmg", element: "Virus", value: 6.4, label: "Dano Vírus +6.4%", cost: 700 },
    { stat: "spd", value: 5, label: "VEL +5", cost: 1100 },
  ],
  frieren: [
    { stat: "critRate", value: 5, label: "CRIT +5%", cost: 700 },
    { stat: "critDmg", value: 12, label: "CRIT DMG +12%", cost: 900 },
    { stat: "elemDmg", element: "Holy", value: 4.8, label: "Dano Holy +4.8%", cost: 600 },
    { stat: "elemDmg", element: "Holy", value: 6.4, label: "Dano Holy +6.4%", cost: 700 },
    { stat: "spd", value: 5, label: "VEL +5", cost: 1100 },
    { stat: "atk", value: 6, label: "ATK +6%", cost: 500 },
  ],
  omegamon: [
    { stat: "hp", value: 10, label: "HP +10%", cost: 600 },
    { stat: "def", value: 5, label: "DEF +5%", cost: 500 },
    { stat: "hp", value: 5, label: "HP +5%", cost: 600 },
    { stat: "elemDmg", element: "Virus", value: 10, label: "Dano de Vírus +10%", cost: 700 },
    { stat: "energyRegen", value: 10, label: "Regen de Energia +10%", cost: 700 },
    { stat: "critDmg", value: 12, label: "CRIT DMG +12%", cost: 900 },
  ],
  lancer: [
    { stat: "atk", value: 6, label: "ATK +6%", cost: 500 },
    { stat: "spd", value: 5, label: "VEL +5", cost: 1100 },
    { stat: "elemDmg", element: "Chaos", value: 4.8, label: "Dano Chaos +4.8%", cost: 600 },
    { stat: "elemDmg", element: "Chaos", value: 6.4, label: "Dano Chaos +6.4%", cost: 700 },
    { stat: "critDmg", value: 12, label: "CRIT DMG +12%", cost: 900 },
    { stat: "atk", value: 4, label: "ATK +4%", cost: 500 },
  ],
  nanami: [
    { stat: "critDmg", value: 12, label: "CRIT DMG +12%", cost: 900 },
    { stat: "atk", value: 6, label: "ATK +6%", cost: 500 },
    { stat: "elemDmg", element: "Chaos", value: 4.8, label: "Dano Chaos +4.8%", cost: 600 },
    { stat: "elemDmg", element: "Chaos", value: 6.4, label: "Dano Chaos +6.4%", cost: 700 },
    { stat: "spd", value: 5, label: "VEL +5", cost: 1100 },
    { stat: "atk", value: 4, label: "ATK +4%", cost: 500 },
  ],
  nami: [
    { stat: "elemDmg", element: "Vento", value: 4.8, label: "Dano Vento +4.8%", cost: 600 },
    { stat: "elemDmg", element: "Vento", value: 6.4, label: "Dano Vento +6.4%", cost: 700 },
    { stat: "atk", value: 6, label: "ATK +6%", cost: 500 },
    { stat: "spd", value: 5, label: "VEL +5", cost: 1100 },
    { stat: "atk", value: 4, label: "ATK +4%", cost: 500 },
    { stat: "hp", value: 6, label: "HP +6%", cost: 600 },
  ],
  uraraka: [
    { stat: "spd", value: 5, label: "VEL +5", cost: 1100 },
    { stat: "hp", value: 8, label: "HP +8%", cost: 600 },
    { stat: "atk", value: 4, label: "ATK +4%", cost: 500 },
    { stat: "def", value: 6, label: "DEF +6%", cost: 500 },
    { stat: "hp", value: 6, label: "HP +6%", cost: 600 },
    { stat: "spd", value: 3, label: "VEL +3", cost: 1100 },
  ],
};
const traceNodesOf = (def) => (def && TRACE_NODE_SETS[def.id]) || TRACE_NODES;
const TRACE_MAX = 10;
const traceMul = (level) => 1 + (Math.max(1, level || 1) - 1) * 0.08; // +8% por nível
const traceCost = (level) => 600 + (level - 1) * 450; // jade p/ subir do nível atual
function specialTraces(def) {
    if (def.id === "lupa") return [
      { name: "Rastro 1 · Rastro da Caçada (Ascensão 2)", desc: "Ao entrar em combate, Lupa ganha instantaneamente 3 cargas de Voracidade e 20 pontos de Energia. Além disso, a chance-base de aplicar \"Ignição\" com seus Ataques Básicos e Perícias é aumentada para 100%.", combat: "lupaT1", cost: 2 },
      { name: "Rastro 2 · Combustão Espontânea (Ascensão 4)", desc: "Sempre que Lupa consome um efeito de DoT com sua Perícia ou Ultimate, o Dano Crítico do seu próximo ataque aumenta em +5% para cada rodada de DoT consumida (acumulável até +50% de Dano Crítico Bônus por 2 turnos).", combat: "lupaT2", cost: 2 },
      { name: "Rastro 3 · Fúria Incandescente (Ascensão 6)", desc: "Durante os 2 turnos de Overclock (ativados após o Nuke da Suprema), todo o Dano de Fogo causado por Lupa ignora 15% da Resistência Elemental (RES) dos inimigos. Se um inimigo morrer enquanto estiver afetado pelo estado de Overclock de Lupa, ela regenera 30% da sua Energia Máxima imediatamente.", combat: "lupaT3", cost: 3 },
    ];
    if (def.id === "yoruichi") return [
      { name: "Rastro Especial 1 · Passo de Sombra", desc: "Rastro Especial de combate: no início do combate, Yoruichi regenera 20 de Energia imediatamente. Sempre que um aliado desferir um Ataque Extra, a ação dela avança 6% na Ordem de Turnos — limitado a 3 ativações por Ciclo.", combat: "yoruT1", cost: 2 },
      { name: "Rastro Especial 2 · Condutor de Alta Voltagem", desc: "Rastro Especial de combate: quando o Colapso Elétrico do Talento ativa, o dano de todos os Ataques Extras da equipe sobe +25% por 2 turnos. Além disso, a detonação do Ponto de Aterramento reduz a barra de Resistência (Perfuração) do inimigo principal em um valor fixo, mesmo sem ser do elemento de fraqueza dele.", combat: "yoruT2", cost: 2 },
      { name: "Rastro Especial 3 · Relâmpago Causal", desc: "Rastro Especial de combate: se a VEL de Yoruichi for maior que a do alvo no momento do impacto, os Clones Residuais e o Colapso Elétrico ignoram 18% da DEF dele. Além disso, para cada 10 de VEL acima de 140, a Taxa de Regeneração de Energia dela sobe +4%.", combat: "yoruT3", cost: 3 },
    ];
    if (def.id === "wonderofyou") return [
      { name: "A2 · Marca da Calamidade", desc: "Rastro Especial de combate: os inimigos afetados pelos debuffs exclusivos de Wonder of You (Miss, Vulnerabilidade, Atraso ou Redução de Atributos) recebem +12% de dano de todas as fontes enquanto durar qualquer um desses debuffs.", combat: "wooA2", cost: 2 },
      { name: "A4 · Convite ao Vazio", desc: "Rastro Especial de combate: ao final de cada turno em que pelo menos um inimigo estiver sob 2 ou mais debuffs de Wonder of You simultâneos, ela recupera 10 de Energia extra.", combat: "wooA4", cost: 2 },
      { name: "A6 · A Calamidade Absoluta", desc: "Rastro Especial de combate: se um inimigo atingir 0 debuffs exclusivos dela após tê-los perdido por expiração (não por remoção externa), Wonder of You causa uma explosão residual de 120% do ATK nesse alvo.", combat: "wooA6", cost: 3 },
    ];
    if (def.id === "agumon") return [
      { name: "Rastro · Thermal Efficiency", desc: "Rastro Especial de combate: com 50+ de Calor, usar uma Perícia transfere calor aos aliados — reduz o próprio Calor em 10 adicionais e concede a TODO o time +12% de Bônus de Dano nos ataques por 2 rodadas (Eficiência Térmica).", combat: "aguT1", cost: 2 },
      { name: "Rastro · Core Insulation", desc: "Rastro Especial de combate: ao sofrer um golpe que reduziria seu HP a zero, entra em Sobrecarga de Emergência — sobrevive, remove TODO o Calor, ganha um escudo de 50% do HP Máximo e recupera 30 de TamerSP. Recarga: 3 rodadas.", combat: "aguT2", cost: 2 },
      { name: "Rastro · Critical Pressure", desc: "Rastro Especial de combate: no MODO X, a Penetração de DEF aumenta em 10% para cada 10 pontos de Calor que ele possuía no momento da evolução (máx 50%). Se a Gaia Force derrotar o alvo, WarGreymon executa um ataque de seguimento imediato no inimigo de maior HP, causando 50% do dano original.", combat: "aguT3", cost: 3 },
    ];
    if (def.id === "shorekeeper") return [
      { name: "Rastro Especial 1 · Criptografia de Sobrevivência", desc: "Ao entrar em combate, Shorekeeper regenera instantaneamente 25 pontos de Energia. Além disso, enquanto o Estelarador (Habilidade Suprema) estiver ativo, Shorekeeper ganha imunidade completa a efeitos que atrasem sua ação ou reduzam sua Energia.", combat: "shkT1", cost: 2 },
      { name: "Rastro Especial 2 · Superávit de Enteléquia", desc: "A cura de Shorekeeper não desperdiça dados. Sempre que a cura fornecida pela Perícia ou pelas Borboletas Estelares exceder o HP Máximo do aliado alvo, o valor excedente é instantaneamente convertido em um Escudo de Dados, absorvendo dano equivalente a 100% da cura que sobrou por 2 turnos. Este escudo NÃO acumula com um já ativo — é preciso esperar o anterior acabar antes de gerar um novo.", combat: "shkT2", cost: 2 },
      { name: "Rastro Especial 3 · Amplificação de Banda Larga", desc: "Transforma o HP de Shorekeeper em poder ofensivo bruto para o time. Para cada 1.000 de HP Máximo que ela possuir acima de 4.000, o bônus de Dano Crítico concedido pelo Estágio 1 da Habilidade Suprema aumenta em +2%, até um limite máximo de +20% de Dano Crítico adicional.", combat: "shkT3", cost: 3 },
    ];
    if (def.id === "yanagi") return [
      { name: "Rastro Especial 1 · Condutividade Residual", desc: "Ao entrar em combate, Yanagi distorce imediatamente o campo, aplicando 1 Fagulha de Anomalia a todos os inimigos presentes antes da primeira ação. Adicionalmente, sempre que a Desordem for desencadeada com sucesso (consumindo uma Fagulha), Yanagi regenera 3 de Energia de forma autônoma. Se o inimigo derrotado pela Desordem ainda possuía Fagulhas não utilizadas, ela recupera 5 de Energia extra.", combat: "yanaT1", cost: 2 },
      { name: "Rastro Especial 2 · Catalisador de Simbiose", desc: "Quando um aliado ataca um inimigo que possui Fagulhas de Anomalia e está sofrendo 2 ou mais tipos diferentes de DoT, o ataque do aliado tem 65% de chance-base de consumir 1 Fagulha do alvo para desencadear um Eco de Desordem — causa instantaneamente 50% do dano de uma Desordem tradicional (baseado no ATK atual de Yanagi) e herda a Perfuração de DEF base do Talento dela. Só pode ativar 1 vez por ação de cada aliado.", combat: "yanaT2", cost: 2 },
      { name: "Rastro Especial 3 · Análise de Ponto Cego", desc: "Para cada 1% de Taxa de Perfuração de DEF que Yanagi possuir em seus próprios atributos (via Relíquias, Armas ou Buffs), o dano final da Desordem aumenta em 2.5%, até um teto de +50% de dano. Efeito Bônus de Corrosão: se a Perfuração total aplicada a um inimigo (Yanagi + Talento/Perícia) ultrapassar 40% de DEF Ignorada, o inimigo entra em Fratura Crítica — perde qualquer resistência nativa contra a aplicação de novos DoTs (100% de Acerto de Efeito garantido para o time).", combat: "yanaT3", cost: 3 },
    ];
    if (def.id === "athena") return [
      { name: "Traço I · Guardiã das Casas", desc: "Rastro Especial de combate: ao curar um aliado com HP cheio, o excedente de cura vira um escudo equivalente a 50% do valor, durando 2 turnos.", combat: "athI", cost: 2 },
      { name: "Traço II · Luz Consagrada", desc: "Rastro Especial de combate: enquanto estiver no Modo Aprimorado (após a Ultimate), os Ataques Básicos de Athena (Lança de Luz) também curam o time em 15% do dano causado.", combat: "athII", cost: 2 },
      { name: "Traço III · Julgamento das Sete Casas", desc: "Rastro Especial de combate: a Ultimate de Athena concede +1 de Ponto de Ação (turno extra imediato) à aliada escolhida entre as Casas, uma vez por combate.", combat: "athIII", cost: 3 },
    ];
    if (def.id === "miyabi") return [
    { name: "Vestígio do Poder", desc: "Rastro Especial de combate · Postura Iaido: o Ataque Básico gera 1 PH. Ao acumular o limite de 3 PH, Miyabi entra na Postura Iaido — seu próximo Ataque Básico consome os 3 PH de uma vez para um corte que ignora 30% da DEF do alvo e avança a própria ação dela em 50% na linha do tempo.", combat: "miPostura", cost: 2 },
    { name: "Vestígio da Lâmina", desc: "Rastro Especial de combate · Cortes Residuais: quando Miyabi desfere um acerto CRÍTICO com a Habilidade ou o Ultimate, deixa Cortes Residuais congelados no alvo. Quando ela usa o Ataque Básico contra esse inimigo, os cortes ecoam causando 90% do ATK como dano Glacial extra e estendem a duração de quaisquer DoTs ativos nele em +1 turno.", combat: "miResidual", cost: 2 },
    { name: "Vestígio: Tempestade", desc: "Rastro Especial de combate · Detonação: ao atacar inimigos que já estejam sob efeito de DoT ou com a DEF reduzida, Miyabi consome instantaneamente esses debuffs para gerar uma explosão de 150% de Dano Glacial em área e aplica Congelamento por 1 turno.", combat: "miDetonate", cost: 3 },
  ];
  if (def.id === "kaiba") return [
    { name: "Rastro Especial 1 · Mão Inicial Perfeita", desc: "No início do combate, Kaiba executa uma puxada automática, adicionando 1 carta do Baralho Holográfico à sua Mão Virtual sem consumir Pontos de Habilidade. Sempre que uma carta da categoria Magia ou Armadilha for ativada e resolvida em campo, a posição do Monstro Invocado ativo na Ordem de Turnos é avançada em 22%.", combat: "kaibaT1", cost: 2 },
    { name: "Rastro Especial 2 · Reciclagem Eficiente", desc: "Sempre que um Monstro Invocado for destruído por um inimigo ou enviado ao Cemitério por efeito de Substituição/Tributo, Kaiba regenera 15 pontos de Energia e ganha um bônus de 20% de ATK por 2 turnos. Adicionalmente, o dano infligido por cartas de efeito direto (como o Anel da Destruição e o Vírus Esmaga-Cards) passa a ignorar 25% da DEF dos alvos afetados.", combat: "kaibaT2", cost: 2 },
    { name: "Rastro Especial 3 · Soberania Tecnológica", desc: "Cada monstro registrado no Cemitério aumenta de forma fixa em +8% a Taxa Crítica e em +16% o Dano Crítico de todas as invocações ativas em combate. Se uma invocação de classe Lendária ou Suprema (Obelisco, o Atormentador, ou o Dragão Ultimate) entrar em campo, o impacto inicial de sua habilidade reduz a barra de Firmeza (Resistência/Perfuração) de todos os inimigos em um valor fixo massivo, ignorando completamente os tipos de fraqueza elemental nativa dos alvos.", combat: "kaibaT3", cost: 3 },
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
  if (def.id === "ryoshu") return [
    { name: "Vestígio do Poder (P.I.P.)", desc: "O dreno de Ryoshu ignora Escudos aliados. Se o aliado drenado possuía Escudo, Ryoshu absorve 30% do valor como ATK temporário por 2 turnos. Sinergia com suportes de barreira.", combat: "ryoPIP", cost: 2 },
    { name: "Vestígio da Lâmina (S.E.T.)", desc: "O Dano Fixo gerado pelo HP consumido na Habilidade e Ultimate pode causar Acertos Críticos, respeitando CRIT Rate e CRIT DMG de Ryoshu.", combat: "ryoSET", cost: 2 },
    { name: "Vestígio: Tempestade (A.A.M.)", desc: "Os aliados não podem morrer pelo dreno de Ryoshu (param em 1 HP). Para cada 1% de HP faltando nos aliados após o dreno, Ryoshu ignora 0,5% da DEF dos inimigos (máx 45% de penetração de DEF).", combat: "ryoAAM", cost: 3 },
  ];
  if (def.id === "frieren") return [
    { name: "Vestígio do Poder (Grimório Secreto)", desc: "O Ataque Básico Magia Comum também gera 1 Ponto de Elemento aleatório ao acertar, acelerando o acúmulo para o Supremo.", combat: "frGrimoire", cost: 2 },
    { name: "Vestígio da Lâmina (Zoltraak Silencioso)", desc: "Se Zoltraak for usado contra inimigos do elemento Chaos ou Vírus, o dano CRIT é garantido e o ataque ignora 100% dos Escudos do alvo.", combat: "frZoltraak", cost: 2 },
    { name: "Vestígio: Tempestade (Campo de Flores Eterno)", desc: "A opção Magia de Flores do Supremo também cura 15% do HP Máximo de cada aliado e aplica +10% de bônus de dano ao time por 2 turnos.", combat: "frFlowers", cost: 3 },
  ];
  if (def.id === "lancer") return [
    { name: "Vestígio do Poder", desc: "Rastro Especial de atributo: ATK +15%, reforçando o kit ofensivo de Lancer.", stat: "atk", value: 15, cost: 2 },
    { name: "Vestígio da Lâmina", desc: "Rastro Especial de combate: a Esquiva Absoluta da Habilidade concede ao próximo golpe de Lancer +20% de Dano de Caos adicional — ele desvia e contra-ataca mais forte.", combat: "lancerCounterDmg", cost: 2 },
    { name: "Vestígio: Tempestade", desc: "Rastro Especial de combate: Ataques Básicos de Lancer aumentam o Bônus de Dano Chaos do próximo golpe em +20%, recompensando agressividade constante.", combat: "lancerTempestade", cost: 3 },
  ];
  if (def.id === "nanami") return [
    { name: "Vestígio do Poder", desc: "Rastro Especial de combate: ao entrar em Hora Extra (turno 5+), Nanami ganha +30% de ATK permanentemente pelo resto do combate — o talento de luta longa começa aqui.", combat: "nanamHoraExtra", cost: 2 },
    { name: "Vestígio da Lâmina", desc: "Rastro Especial de combate: Acertos Críticos causados pela Razão 7:3 recuperam 10 de Energia, reduzindo o ciclo da Ultimate em combates longos.", combat: "nanamCritEnergy", cost: 2 },
    { name: "Vestígio: Tempestade", desc: "Rastro Especial de combate: o dano de Nanami contra inimigos com DEF reduzida (efeito da Ultimate) aumenta em +20% — maximizando o combo Colapso → Razão 7:3.", combat: "nanamDefBonus", cost: 3 },
  ];
  if (def.id === "nami") return [
    { name: "Vestígio do Poder", desc: "Rastro Especial de combate: inimigos afetados por Ciclone têm a Velocidade reduzida em 10%, permitindo que a equipe aja com mais frequência em relação a eles.", combat: "namiSlowCyclone", cost: 2 },
    { name: "Vestígio da Lâmina", desc: "Rastro Especial de combate: quando um aliado ataca um inimigo sob efeito de Ciclone, Nami dispara um ataque coordenado causando 40% de Dano de Vento.", combat: "namiFollowup", cost: 2 },
    { name: "Vestígio: Tempestade", desc: "Rastro Especial de combate: aumenta a chance base de aplicar Ciclone e outros status negativos em +25%, tornando o kit muito mais consistente.", combat: "namiDotBoost", cost: 3 },
  ];
  if (def.id === "uraraka") return [
    { name: "Vestígio do Poder", desc: "Rastro Especial de combate: ao usar o Ataque Básico, Uraraka avança sua própria barra de ação em 15%, agindo com mais frequência que o previsto pela velocidade.", combat: "uraAdvance", cost: 2 },
    { name: "Vestígio da Lâmina", desc: "Rastro Especial de combate: Uraraka ganha +15% de DEF enquanto seu HP estiver acima de 50%, tornando-a mais resistente em batalha.", combat: "uraDefBuffer", cost: 2 },
    { name: "Vestígio: Tempestade", desc: "Rastro Especial de combate: o aliado que estiver com o buff de Zero Gravity ativo atrasa a ação do inimigo que atacar em 8%, criando uma vantagem de turno contínua.", combat: "uraDelayEnemies", cost: 3 },
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
  const flat = { hp: 0, atk: 0, def: 0, spd: 0, critRate: 0, critDmg: 0, dmgBonus: 0, energyRegen: 0, healBonus: 0, defPen: 0, dotDmg: 0, breakEffect: 0, breakEff: 0 };
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
  if (w) {
    ["critRate", "critDmg", "energyRegen", "dmgBonus", "defPen", "spd"].forEach((k) => { if (w[k]) flat[k] += w[k] * wm; });
    if (w.atkPct) pct.atk += w.atkPct * wm;
  }

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
    if (setCount[set] >= 6 && sd.p6) for (const k in sd.p6) { if (k === "elemDmg") addElem(sd.el, sd.p6[k]); else addPctOrFlat(k, sd.p6[k]); }
  }
  const nodes = constellationNodes(def);
  for (let i = 0; i < (owned.eidolon || 0); i++) { const n = nodes[i]; if (n && n.stat) addPctOrFlat(n.stat, n.value); }
  const tnodes = traceNodesOf(def);
  (owned.traceNodes || []).forEach((on, i) => { if (on && tnodes[i]) { const nd = tnodes[i]; if (nd.stat === "elemDmg") addElem(nd.element, nd.value); else addPctOrFlat(nd.stat, nd.value); } });
  // ── Hitori: passiva + constelações com stats permanentes (não têm stat/value no nó genérico) ──
  if (owned.id === "hitori") {
    // C1 · Rastreadora de Cinzas: +12 VEL permanente
    if ((owned.eidolon || 0) >= 1) flat.spd += 12;
    // C5 · Dissonância do Chaos: +80% Dano Crítico permanente
    if ((owned.eidolon || 0) >= 5) flat.critDmg += 80;
    // Passiva · Ansiedade Amplificada: a cada 3% de Dano Crítico = +1 VEL (C3 muda para a cada 2%)
    // Calculamos com o CD total já acumulado (base + arma + relíquias + C5 acima)
    const totalCd = def.base.critDmg + flat.critDmg;
    const divisor = (owned.eidolon || 0) >= 3 ? 2 : 3;
    flat.spd += Math.floor(totalCd / divisor);
  }
  // ── Lupa: constelações com stats permanentes ──
  // C1 · Rastreadora de Cinzas: +15% Regen de Energia permanente
  if (owned.id === "lupa" && (owned.eidolon || 0) >= 1) flat.energyRegen += 15;
  // C5 · Garra de Almas: +12% Taxa Crítica e +75% Dano de Fogo (bônus permanentes)
  if (owned.id === "lupa" && (owned.eidolon || 0) >= 5) {
    flat.critRate += 12;
    addElem("Fogo", 75);
  }
  const sts = specialTraces(def);
  (owned.specialTraces || []).forEach((on, i) => { if (on && sts[i] && sts[i].stat) addPctOrFlat(sts[i].stat, sts[i].value); });

  // elemBonus: bônus elemental do próprio elemento (multiplicativo com dmgBonus genérico)
  const elemBonus = elemMap[def.element] || 0;
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
    elemBonus: r1(elemBonus),
    energyRegen: r1(flat.energyRegen),
    healBonus: r1(flat.healBonus),
    breakEffect: r1(flat.breakEffect),
    breakEff: r1(flat.breakEff),
    energyMax: def.base.energyMax,
  };
}

/* ---------- GACHA ---------- */
const RATE = { c5: 0.006, c4: 0.051, soft: 74, hard: 90 };
function rollRarity(pity, hardMode) {
  // hardMode (banner de evento): 5★ mais raro fora do pity — taxa base menor e soft pity mais tardio
  let p5 = hardMode ? 0.004 : RATE.c5;
  const soft = hardMode ? 80 : RATE.soft;
  if (pity + 1 >= soft) p5 += (pity + 1 - (soft - 1)) * 0.06;
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
async function cloudAllyList() {
  if (!Cloud.ready) return [];
  try { const { collection, getDocs, query, orderBy, limit } = Cloud.fs; const snap = await withTimeout(getDocs(query(collection(Cloud.db, "coop"), orderBy("updatedAt", "desc"), limit(30))), 4000, null); if (!snap) return []; const arr = []; snap.forEach((d) => arr.push(d.data())); return arr; } catch { return []; }
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
const TOWER_FLOORS = 200;
const TOWER_BOSSES = {
  50: { name: "Sōsuke Aizen", title: "Shinigami Traidor", element: "Holy", bossKind: "aizen", bossImgId: "boss_tower_50", res: ["Glacial"], weak: ["Fogo", "Virus"] },
  60: { name: "Ryōmen Sukuna", title: "Rei das Maldições", element: "Chaos", bossKind: "sukuna", bossImgId: "boss_tower_60", res: ["Chaos"], weak: ["Holy"] },
  70: { name: "Seto Kaiba · Modo Deus", title: "Portador de Obelisco", element: "Eletro", bossKind: "godkaiba", bossImgId: "boss_tower_70", res: ["Eletro"], weak: ["Fogo", "Virus"] },
  80: { name: "Ryoshu · Matriarca Final", title: "A Aranha que Devora Estrelas", element: "Virus", bossKind: "ryoshu_boss", bossImgId: "boss_tower_80", res: ["Virus"], weak: ["Fogo", "Holy"] },
  90: { name: "Frieren · Além do Fim", title: "A Maga do Milênio Absoluto", element: "Holy", bossKind: "frieren_boss", bossImgId: "boss_tower_90", res: ["Glacial"], weak: ["Fogo", "Virus"] },
  100: { name: "Omegamon · Protocolo Base", title: "Guardião do Cerne de Dados", element: "Virus", bossKind: "omegamon_boss", bossImgId: "boss_tower_100", res: ["Virus"], weak: ["Fogo", "Virus"] },
  110: { name: "Aizen · Transcendência", title: "Além da Ilusão Perfeita", element: "Holy", bossKind: "aizen", bossImgId: "boss_tower_100", res: ["Vento"], weak: ["Fogo", "Virus"] },
  120: { name: "Sukuna · Rei Absoluto", title: "Domínio Infinito", element: "Chaos", bossKind: "sukuna", bossImgId: "boss_tower_110", res: ["Chaos", "Fogo"], weak: ["Holy"] },
  130: { name: "Kaiba · Deus dos Deuses", title: "Obelisco Desperto", element: "Eletro", bossKind: "godkaiba", bossImgId: "boss_tower_120", res: ["Eletro"], weak: ["Fogo", "Virus"] },
  140: { name: "Ryoshu · Tecelã do Destino", title: "Teia que Consome Estrelas", element: "Virus", bossKind: "ryoshu_boss", bossImgId: "boss_tower_130", res: ["Virus", "Chaos"], weak: ["Fogo"] },
  150: { name: "Frieren · Forma Primordial", title: "Milênios de Mana Descomprimida", element: "Holy", bossKind: "frieren_boss", bossImgId: "boss_tower_140", res: ["Glacial", "Vento"], weak: ["Fogo", "Virus"] },
  160: { name: "Soberano do Vazio · Fase I", title: "Primeiro Despertar do Vazio", element: "Chaos", bossKind: "void_sovereign", bossImgId: "boss_tower_150", res: ["Chaos"], weak: ["Holy"] },
  170: { name: "Omegamon · Modo Negativo", title: "Protocolo de Extinção", element: "Virus", bossKind: "omegamon_boss", bossImgId: "boss_tower_170", res: ["Virus", "Chaos"], weak: ["Fogo", "Virus"] },
  180: { name: "Trindade das Sombras", title: "Aizen · Sukuna · Ryoshu Unidos", element: "Chaos", bossKind: "void_sovereign", bossImgId: "boss_tower_180", res: ["Chaos", "Virus"], weak: ["Fogo"] },
  190: { name: "Frieren · A Derradeira", title: "O Fim Além do Fim", element: "Holy", bossKind: "frieren_boss", bossImgId: "boss_tower_190", res: ["Glacial", "Vento"], weak: ["Fogo", "Virus"] },
  200: { name: "Maximillion", title: "O Ilusionista do Tabuleiro", element: "Chaos", bossKind: "maximillion", bossImgId: "boss_tower_200", res: [], weak: ["Chaos", "Holy", "Eletro"] },
};
// Nota: a fraqueza [Unknown] do GDD original foi mapeada para Eletro (não existe elemento "Unknown" neste jogo).
// Floors 90–200 somam exatamente 21.000💎 (90:3000 + 91-199 não-boss:100 + bosses 100-190:500 + 200:3100)
function rewardFor(f) {
  if (f <= 60) return 300;
  if (f <= 69) return 500;
  if (f <= 79) return 1500;
  if (f <= 89) return 2000;
  if (f === 90) return 3000;
  if (f === 200) return 3100;
  if (f % 10 === 0) return 500;
  return 100;
}
// ══════════ TORRE SOMBRIA (Dark Tower) — 10 níveis, só chefes, HP altíssimo, ignoram escudo ══════════
// ══════════ CARTAS DO KAIBA (Puxada do Destino / Mão Virtual) ══════════
const KAIBA_CARDS = {
  vorse:   { name: "Vorse Raider", avatar: "👹", cat: "monster", imgId: "card_vorse", desc: "Monstro · Invoca Vorse Raider ao campo. Ele executa ataques de alvo único de impacto massivo que causam 260% de ATK em Dano Físico e possuem 50% de chance de aplicar Sangramento." },
  kaiser:  { name: "Kaiser Sea Horse", avatar: "🐴", cat: "monster", imgId: "card_kaiser", desc: "Monstro · Invoca Kaiser Sea Horse ao campo. Seus ataques causam 180% de ATK em Dano de Luz/Eletro e regeneram 20 pontos de Energia para Kaiba instantaneamente." },
  saggi:   { name: "Saggi, o Clone das Sombras", avatar: "👤", cat: "monster", imgId: "card_saggi", desc: "Monstro · Invoca Saggi ao campo. Saggi possui baixa capacidade ofensiva (70% de ATK), mas aumenta sua própria taxa de Provocação (Taunt) em 300%, forçando todos os inimigos a atacá-lo por 2 rodadas." },
  judge:   { name: "Juiz", avatar: "⚖️", cat: "monster", imgId: "card_judge", desc: "Monstro · Invoca Juiz ao campo. Seus ataques desferem golpes pesados em Área (AoE), causando 200% de Dano baseado no ATK de Kaiba ao alvo principal e 100% aos alvos adjacentes." },
  obelisk: { name: "Obelisco, o Atormentador", avatar: "🗿", cat: "monster", imgId: "card_obelisk", desc: "Monstro Lendário (Taxa de Puxada: 5%) · Invoca o Deus Egípcio ao campo substituindo qualquer invocação. Obelisco permanece por apenas 1 turno, mas executa o ataque \"Punho do Destino\", causando 750% de Dano Físico/Eletro Global (a todos os inimigos na tela) e ignorando 100% da DEF inimiga." },
  control: { name: "Controlador de Inimigos", avatar: "🎮", cat: "magic", imgId: "card_control", desc: "Magia · Seleciona um inimigo aleatório e atrasa a ação dele na Ordem de Turnos em 40%, impedindo que use habilidades especiais na próxima rodada." },
  shrink:  { name: "Encolher", avatar: "📉", cat: "magic", imgId: "card_shrink", desc: "Magia · Seleciona o inimigo com o maior ATK do campo e reduz o seu ATK e a sua DEF em 35% por 2 turnos completos." },
  flute:   { name: "A Flauta para Invocação de Dragões", avatar: "🎵", cat: "magic", imgId: "card_flute", desc: "Magia · Se o Dragão de Olhos Azuis estiver em campo, avança a ação dele em 100% imediatamente e concede a ele um buff de +50% de Dano Crítico para o próximo ataque. Caso não haja dragões em campo, compra outra carta imediatamente sem gastar pontos." },
  virus:   { name: "Vírus Esmaga-Cards", avatar: "🦠", cat: "trap", imgId: "card_virus", desc: "Armadilha · Contamina o campo inimigo por 2 turnos. Sempre que qualquer inimigo tentar desferir um ataque que cause mais de 150% de dano, o dano desse ataque é mitigado e reduzido para uma taxa fixa de apenas 50%." },
  ring:    { name: "Anel da Destruição", avatar: "💍", cat: "trap", imgId: "card_ring", desc: "Armadilha · Explode um colar no inimigo com menor HP. Causa Dano Verdadeiro massivo equivalente a 25% da Vida Máxima do alvo. Kaiba sofre um contragolpe reativo equivalente a 5% do seu próprio HP atual." },
};
const DARK_TOWER_WEAKNESS = ["Holy", "Fogo", "Vento", "Virus", "Glacial", "Chaos", "Eletro", "Holy", "Fogo", "Vento",
  "Virus", "Glacial", "Chaos", "Eletro", "Holy", "Fogo", "Vento", "Virus", "Glacial", "Chaos",
  "Eletro", "Holy", "Fogo", "Vento", "Virus", "Glacial", "Chaos", "Eletro", "Holy", "Fogo",
  "Vento", "Virus", "Glacial", "Chaos", "Eletro", "Holy", "Fogo", "Vento", "Virus", "Glacial"];
const DARK_TOWER_BOSSES = [
  { name: "Sentinela Sombria",        element: "Chaos",  bossKind: "guardian",       hpMul: 33,  dot: null,     reward: 1600 },
  { name: "Aizen · Eco Sombrio",      element: "Holy",   bossKind: "aizen",          hpMul: 36,  dot: null,     reward: 1600 },
  { name: "Sukuna · Fome Eterna",     element: "Chaos",  bossKind: "sukuna",         hpMul: 38,  dot: "burn",   reward: 1600 },
  { name: "Kaiba · Obelisco Negro",   element: "Eletro", bossKind: "godkaiba",       hpMul: 41,  dot: null,     reward: 1600 },
  { name: "Ryoshu · Teia Sombria",    element: "Virus",  bossKind: "ryoshu_boss",    hpMul: 44,  dot: "poison", reward: 1600 },
  { name: "Frieren · Memória Rota",   element: "Holy",   bossKind: "frieren_boss",   hpMul: 47,  dot: "freeze", reward: 1600 },
  { name: "Omegamon · Núcleo Corrompido", element: "Virus", bossKind: "omegamon_boss", hpMul: 50, dot: "poison", reward: 1600 },
  { name: "Soberano do Vazio · Sombra", element: "Chaos", bossKind: "void_sovereign", hpMul: 52,  dot: "burn",   reward: 1600 },
  { name: "Soberano da Espiral Negra", element: "Chaos", bossKind: "espiral_lord",   hpMul: 56,  dot: "freeze", reward: 1600, espiralLordHpMul: 1 },
  { name: "Maximillion · Máscara Final", element: "Chaos", bossKind: "maximillion",  hpMul: 62,  dot: "poison", reward: 1600 },
  { name: "Sentinela Sombria · Renascida II", element: "Chaos", bossKind: "guardian", hpMul: 66, dot: "burn", reward: 1600 },
  { name: "Aizen · Ilusão Absoluta II", element: "Chaos", bossKind: "aizen", hpMul: 70, dot: "poison", reward: 1600 },
  { name: "Sukuna · Devorador de Eras II", element: "Chaos", bossKind: "sukuna", hpMul: 75, dot: "freeze", reward: 1600 },
  { name: "Kaiba · Singularidade Negra II", element: "Chaos", bossKind: "godkaiba", hpMul: 80, dot: null, reward: 1600 },
  { name: "Ryoshu · Rainha Aracnídea II", element: "Chaos", bossKind: "ryoshu_boss", hpMul: 86, dot: "burn", reward: 1600 },
  { name: "Frieren · Herança dos Mil Anos II", element: "Chaos", bossKind: "frieren_boss", hpMul: 92, dot: "poison", reward: 1600 },
  { name: "Omegamon · Protocolo Definitivo II", element: "Chaos", bossKind: "omegamon_boss", hpMul: 99, dot: "freeze", reward: 1600 },
  { name: "Soberano do Vazio · Colapso Final II", element: "Chaos", bossKind: "void_sovereign", hpMul: 106, dot: null, reward: 1600 },
  { name: "Soberano da Espiral · Além do Caos II", element: "Chaos", bossKind: "espiral_lord", hpMul: 114, dot: "burn", reward: 1600, espiralLordHpMul: 1 },
  { name: "Maximillion · O Ilusionista Eterno II", element: "Chaos", bossKind: "maximillion", hpMul: 123, dot: "poison", reward: 1600 },
  { name: "Sentinela Sombria · Renascida III", element: "Chaos", bossKind: "guardian", hpMul: 132, dot: "freeze", reward: 1600 },
  { name: "Aizen · Ilusão Absoluta III", element: "Chaos", bossKind: "aizen", hpMul: 142, dot: null, reward: 1600 },
  { name: "Sukuna · Devorador de Eras III", element: "Chaos", bossKind: "sukuna", hpMul: 153, dot: "burn", reward: 1600 },
  { name: "Kaiba · Singularidade Negra III", element: "Chaos", bossKind: "godkaiba", hpMul: 165, dot: "poison", reward: 1600 },
  { name: "Ryoshu · Rainha Aracnídea III", element: "Chaos", bossKind: "ryoshu_boss", hpMul: 179, dot: "freeze", reward: 1600 },
  { name: "Frieren · Herança dos Mil Anos III", element: "Chaos", bossKind: "frieren_boss", hpMul: 194, dot: null, reward: 1600 },
  { name: "Omegamon · Protocolo Definitivo III", element: "Chaos", bossKind: "omegamon_boss", hpMul: 210, dot: "burn", reward: 1600 },
  { name: "Soberano do Vazio · Colapso Final III", element: "Chaos", bossKind: "void_sovereign", hpMul: 228, dot: "poison", reward: 1600 },
  { name: "Soberano da Espiral · Além do Caos III", element: "Chaos", bossKind: "espiral_lord", hpMul: 248, dot: "freeze", reward: 1600, espiralLordHpMul: 1 },
  { name: "Maximillion · O Ilusionista Eterno III", element: "Chaos", bossKind: "maximillion", hpMul: 270, dot: null, reward: 1600 },
  { name: "Sentinela Sombria · Renascida IV", element: "Chaos", bossKind: "guardian", hpMul: 294, dot: "burn", reward: 1600 },
  { name: "Aizen · Ilusão Absoluta IV", element: "Chaos", bossKind: "aizen", hpMul: 321, dot: "poison", reward: 1600 },
  { name: "Sukuna · Devorador de Eras IV", element: "Chaos", bossKind: "sukuna", hpMul: 350, dot: "freeze", reward: 1600 },
  { name: "Kaiba · Singularidade Negra IV", element: "Chaos", bossKind: "godkaiba", hpMul: 382, dot: null, reward: 1600 },
  { name: "Ryoshu · Rainha Aracnídea IV", element: "Chaos", bossKind: "ryoshu_boss", hpMul: 418, dot: "burn", reward: 1600 },
  { name: "Frieren · Herança dos Mil Anos IV", element: "Chaos", bossKind: "frieren_boss", hpMul: 458, dot: "poison", reward: 1600 },
  { name: "Omegamon · Protocolo Definitivo IV", element: "Chaos", bossKind: "omegamon_boss", hpMul: 502, dot: "freeze", reward: 1600 },
  { name: "Soberano do Vazio · Colapso Final IV", element: "Chaos", bossKind: "void_sovereign", hpMul: 551, dot: null, reward: 1600 },
  { name: "Soberano da Espiral · Além do Caos IV", element: "Chaos", bossKind: "espiral_lord", hpMul: 605, dot: "burn", reward: 1600, espiralLordHpMul: 1 },
  { name: "Maximillion · O Ilusionista Eterno IV", element: "Chaos", bossKind: "maximillion", hpMul: 665, dot: "poison", reward: 1600 },
].map((b, i) => { const w = DARK_TOWER_WEAKNESS[i]; return { ...b, weak: [w], res: ELEMENT_NAMES.filter(e => e !== w) }; });
function darkTowerEncounter(level, power) {
  const bd = DARK_TOWER_BOSSES[level - 1]; if (!bd) return null;
  return {
    level: 70 + level * 6, boss: true, count: 1, floor: level, isTower: true, darkTower: true,
    teamPower: power || 2500, bossName: bd.name, bossElement: bd.element, bossKind: bd.bossKind, bossImgId: null,
    bossRes: bd.res, bossWeak: bd.weak, darkTowerHpMul: bd.hpMul, darkTowerDot: bd.dot, espiralLordHpMul: bd.espiralLordHpMul,
  };
}
function towerEncounter(f, power) {
  const boss = f % 10 === 0, finalBoss = f === TOWER_FLOORS;
  const bd = TOWER_BOSSES[f];
  return {
    level: f, boss, finalBoss, count: boss ? (f >= 40 ? 2 : 1) : (f <= 4 ? 2 : 3), floor: f, isTower: true, teamPower: power || 2500,
    ...(bd ? { bossName: bd.name, bossTitle: bd.title, bossElement: bd.element, bossKind: bd.bossKind, bossImgId: bd.bossImgId, bossRes: bd.res, bossWeak: bd.weak } : {}),
  };
}
const FARM_STAGES = [
  { id: "facil",   name: "Fácil · Clareira dos Ecos",    level: 20, count: 3, cost: 30, exp: 18,  desc: "Nv 1-20 — introdução. Drop leve de Lágrimas de XP." },
  { id: "medio",   name: "Médio · Ruínas Cintilantes",   level: 50, count: 3, cost: 45, exp: 42,  boss: true, desc: "Nv 20-50 — drop equilibrado (melhor custo/benefício)." },
  { id: "dificil", name: "Difícil · Abismo Estelar",     level: 80, count: 3, cost: 60, exp: 72,  boss: true, desc: "Nv 60-80 — para times fortes. Drop máximo de Lágrimas de XP." },
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
  const url = (ch?.imgId && images[ch.imgId]) || (ch?.id ? images[ch.id] : null);
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
function Panel({ children, style, glow, onClick, ...rest }) {
  return <div onClick={onClick} style={{ background: `linear-gradient(180deg, ${C.panel}, ${C.bg1})`, border: `1px solid ${C.line}`, borderRadius: 18, padding: 16, boxShadow: glow ? `0 0 34px ${glow}26` : "0 10px 28px #00000045", ...style }} {...rest}>{children}</div>;
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
  const [battle, setBattleRaw] = useState(null);
  const battleSeqRef = useRef(0);
  // Garante uma key React sempre única por batalha — sem isso, duas batalhas com o mesmo encounter
  // (comum no Abismo: mesmo nível/quantidade de inimigos, sem mutador, HP cheio) reaproveitam a MESMA
  // instância do componente Battle, cujo estado interno fica "preso" na luta anterior e o combate deixa
  // de contar (o efeito de fim de batalha não dispara de novo).
  function setBattle(next) { setBattleRaw(next ? { ...next, _bid: ++battleSeqRef.current } : null); }
  const [pendingBoss, setPendingBoss] = useState(null);

  const [jade, setJade] = useState(12000);
  const [chronicles, setChronicles] = useState(0);
  const [charTickets, setCharTickets] = useState(15);
  const [weaponTickets, setWeaponTickets] = useState(8);
  const [standardTickets, setStandardTickets] = useState(10);
  const [featuredChar, setFeaturedChar] = useState(DEFAULT_FEATURED_CHAR);
  const [featuredWeapon, setFeaturedWeapon] = useState(DEFAULT_FEATURED_WEAPON);
    const [featuredChar2, setFeaturedChar2] = useState(null);
    useEffect(() => {
      // Rotação de banners por data — ajuste BANNER1_START se precisar adiar/antecipar a troca.
      const BANNER1_START = new Date("2026-07-01T00:00:00Z").getTime(); // Miyabi + Agumon
      const BANNER_DURATION_MS = 21 * 24 * 3600 * 1000; // 21 dias por banner
      const elapsed = Date.now() - BANNER1_START;
      if (elapsed < BANNER_DURATION_MS) {
        setFeaturedChar("miyabi");
        setFeaturedChar2("agumon");
        setFeaturedWeapon("calamidade");
      } else {
        // Banner seguinte: Yanagi + Kaiba, assim que o da Miyabi/Agumon terminar
        setFeaturedChar("yanagi");
        setFeaturedChar2("kaiba");
        setFeaturedWeapon("tecelao_tempo");
      }
    }, []);
  const [pity, setPity] = useState({ char: 0, weapon: 0, standard: 0, special: 0, guaranteeChar: false });
  const [pullHistory, setPullHistory] = useState([]);
  const [owned, setOwned] = useState([
    { id: "ace", level: 1, eidolon: 0, weapon: null, relics: EMPTY_RELICS() },
    { id: "chopper", level: 1, eidolon: 0, weapon: null, relics: EMPTY_RELICS() },
    { id: "usopp", level: 1, eidolon: 0, weapon: null, relics: EMPTY_RELICS() },
  ]);
  const [ownedWeapons, setOwnedWeapons] = useState([]);
  const [relicInv, setRelicInv] = useState([]);
  const [team, setTeam] = useState(["ace", "chopper", "usopp"]);
  const [teamPresets, setTeamPresets] = useState([]); // [{ name, ids: [] }]
  const [stamina, setStamina] = useState(320);
  const [lastStamina, setLastStamina] = useState(Date.now());
  const [playerName, setPlayerName] = useState("Pioneiro");
  const [images, setImages] = useState({});
  const [tierList, setTierList] = useState(TIER_LIST_DEFAULT);
  const [towerCleared, setTowerCleared] = useState(0);
  const [darkTowerCleared, setDarkTowerCleared] = useState(0);
  const [darkTowerClaimed, setDarkTowerClaimed] = useState([]);
  const [towerClaimed, setTowerClaimed] = useState([]);
  const [towerSeason, setTowerSeason] = useState(-1);
  const [towerTop1Claimed, setTowerTop1Claimed] = useState(false);
  const [expItems, setExpItems] = useState(80);
  const [bossMats, setBossMats] = useState(4);
  const [ascMats, setAscMats] = useState(4);
  const [weaponMats, setWeaponMats] = useState(15);
  const [skillMats, setSkillMats] = useState(15);
  const [tagMats, setTagMats] = useState({});
  const [lastWeeklyBoss, setLastWeeklyBoss] = useState(0);
  const [dailyClaimedAt, setDailyClaimedAt] = useState(0);
  const [weeklyClaimedAt, setWeeklyClaimedAt] = useState(0);
  const [bossRushCleared, setBossRushCleared] = useState([]);
  const [draftActive, setDraftActive] = useState(false);
  const [draftRoomCleared, setDraftRoomCleared] = useState(0);
  const [draftClaimedGems, setDraftClaimedGems] = useState(0);
  const [draftBoons, setDraftBoons] = useState([]);
  const [mailClaimed, setMailClaimed] = useState(() => { try { return localStorage.getItem('sr_mail1_claimed_v1') === '1'; } catch { return false; } });
  const [mail2Claimed, setMail2Claimed] = useState(() => { try { return localStorage.getItem('sr_mail2_claimed_v2') === '1'; } catch { return false; } });
  const [mail3Claimed, setMail3Claimed] = useState(() => { try { return localStorage.getItem('sr_mail3_claimed_v2') === '1'; } catch { return false; } });
  const [mail3CharPicked, setMail3CharPicked] = useState(() => { try { return localStorage.getItem('sr_mail3_char_v2') || null; } catch { return null; } });
  const [mailIniciante, setMailIniciante] = useState(() => { try { return localStorage.getItem('sr_mail_iniciante_v1') === '1'; } catch { return false; } });
  const [mail4Claimed, setMail4Claimed] = useState(() => { try { return localStorage.getItem('sr_mail4_claimed_v2') === '1'; } catch { return false; } });
  const [mail5Claimed, setMail5Claimed] = useState(() => { try { return localStorage.getItem('sr_mail5_claimed_v2') === '1'; } catch { return false; } });
  const [mail6Claimed, setMail6Claimed] = useState(() => { try { return localStorage.getItem('sr_mail6_claimed_v1') === '1'; } catch { return false; } });
  const [mail7Claimed, setMail7Claimed] = useState(() => { try { return localStorage.getItem('sr_mail7_claimed_v1') === '1'; } catch { return false; } });
  const [relicMats, setRelicMats] = useState(0);
  const [rouletteCleared, setRouletteCleared] = useState(false);
  const [nextRouletteClaimAt, setNextRouletteClaimAt] = useState(0);
  const [shopResetAt, setShopResetAt] = useState(0);
  const [shopPurchases, setShopPurchases] = useState({});
  // ESPIRAL (2-times, fraquezas aleatórias por semana, reset 7 dias)
  const [espiralClearedAt, setEspiralClearedAt] = useState({}); // { normal:ts, hard:ts, extreme:ts, apex:ts }
  // ══ ABISMO DE DADOS (roguelike) ══
  const [abismoRun, setAbismoRun] = useState(null);            // run atual: { floor, team:[ids], hpMap:{id:pct}, dead:[ids], gold, points, glitches:[], curse, seed, nodeOptions, pendingDraft, utiUsed }
  const [abismoFrags, setAbismoFrags] = useState(0);           // Fragmentos de Dados (moeda isolada — nunca vira gema)
  const [abismoMeta, setAbismoMeta] = useState({});            // Mainframe: { draft4, reroll, sanct70, bolsos, uti }
  const [abismoFirstClears, setAbismoFirstClears] = useState([]); // andares 10/20/30... já premiados (160💎 únicas)
  const [abismoWeekly, setAbismoWeekly] = useState({ key: "", gems: 0 }); // hard cap: 800💎/semana
  const [espiralTeamA, setEspiralTeamA] = useState([]);
  const [espiralTeamB, setEspiralTeamB] = useState([]);
  const [espiralPending, setEspiralPending] = useState(null); // { diff, half, weakA, weakB }

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
      setPity({ char: 0, weapon: 0, standard: 0, special: 0, guaranteeChar: false, ...(s.pity || {}) });
      setPullHistory(s.pullHistory ?? []);
      if (s.owned) setOwned(s.owned.map(normChar).filter((o) => CHAR_MAP[o.id])); setOwnedWeapons((Array.isArray(s.ownedWeapons) ? s.ownedWeapons : []).map((x) => typeof x === "string" ? { id: x, lv: 1 } : x).filter((x) => x && WEAPON_MAP[x.id])); setRelicInv((Array.isArray(s.relicInv) ? s.relicInv : []).filter(isValidRelic));
      if (s.team) setTeam(s.team); if (s.teamPresets) setTeamPresets(s.teamPresets); setStamina(s.stamina ?? 320); setLastStamina(s.lastStamina ?? Date.now());
      setPlayerName(s.playerName ?? "Pioneiro");
      // ── Reset de Temporada da Torre/Boss Rush: reseta pra todos agora, e automaticamente a cada 3 semanas ──
      { const TOWER_SEASON_EPOCH = 1751328000000; // 01/07/2025 00:00 UTC — âncora fixa das temporadas
        const THREE_WEEKS_MS = 21 * 24 * 3600 * 1000;
        const currentSeason = Math.floor((Date.now() - TOWER_SEASON_EPOCH) / THREE_WEEKS_MS);
        const savedSeason = s.towerSeason ?? -1;
        if (savedSeason !== currentSeason) {
          setTowerCleared(0); setTowerClaimed([]); setBossRushCleared([]);
          setTowerSeason(currentSeason);
          if (savedSeason !== -1) flash("🗼 Nova Temporada da Torre! Progresso da Torre e do Boss Rush reiniciados — chefes e fraquezas foram remodelados.", C.gold);
        } else {
          setTowerCleared(s.towerCleared ?? 0); setTowerClaimed(s.towerClaimed ?? []); setBossRushCleared(Array.isArray(s.bossRushCleared) ? s.bossRushCleared : []);
          setTowerSeason(savedSeason);
        }
        setTowerTop1Claimed(s.towerTop1Claimed ?? false);
        setDarkTowerCleared(s.darkTowerCleared ?? 0); setDarkTowerClaimed(Array.isArray(s.darkTowerClaimed) ? s.darkTowerClaimed : []); }
      setExpItems(s.expItems ?? 80); setBossMats(s.bossMats ?? 4); setAscMats(s.ascMats ?? 4); setWeaponMats(s.weaponMats ?? 15); setSkillMats(s.skillMats ?? 15); setTagMats(s.tagMats ?? {}); setLastWeeklyBoss(s.lastWeeklyBoss ?? 0); setChronicles(s.chronicles ?? 0); setDailyClaimedAt(s.dailyClaimedAt ?? 0); setWeeklyClaimedAt(s.weeklyClaimedAt ?? 0);
      setDraftRoomCleared(s.draftRoomCleared ?? 0); setDraftClaimedGems(s.draftClaimedGems ?? 0); setDraftBoons(Array.isArray(s.draftBoons) ? s.draftBoons : []);
      setMailClaimed(prev => prev || (s.mailClaimed ?? false)); setRelicMats(s.relicMats ?? 0); setRouletteCleared(s.rouletteCleared ?? false); setNextRouletteClaimAt(s.nextRouletteClaimAt ?? 0); setShopResetAt(s.shopResetAt ?? 0); setShopPurchases(s.shopPurchases ?? {});
      // mail3/4/5 usam chaves v2 — não carrega valores antigos do save cloud para forçar reaparição
      setMailIniciante(prev => prev || (s.mailIniciante ?? false));
      // (mail4/mail5 resetados via v2 — não restaura do cloud save antigo)
      if (s.espiralClearedAt) setEspiralClearedAt(s.espiralClearedAt);
      if (s.abismoRun !== undefined) setAbismoRun(s.abismoRun || null);
      setAbismoFrags(s.abismoFrags ?? 0); setAbismoMeta(s.abismoMeta || {});
      setAbismoFirstClears(Array.isArray(s.abismoFirstClears) ? s.abismoFirstClears : []);
      setAbismoWeekly(s.abismoWeekly || { key: "", gems: 0 });
    }
    // Carrega fotos do localStorage imediatamente (sem depender do Firebase)
    try { const li = _ls.get("sr_shared_images"); if (li) { const parsed = JSON.parse(li); if (parsed && typeof parsed === "object") setImages(parsed); } } catch {}
    // Carrega a Tier List (editável pelo admin) do localStorage imediatamente
    try { const lt = _ls.get("sr_shared_tierlist"); if (lt) { const parsedT = JSON.parse(lt); if (parsedT && typeof parsedT === "object") setTierList(parsedT); } } catch {}
    // Load admin game settings (draft dungeon active, etc.)
    cloudReady.then(() => cloudGet("meta", "settings")).then((cfg) => {
      if (cfg && cfg.draftActive !== undefined) setDraftActive(!!cfg.draftActive);
    }).catch(() => {});
    setLoaded(true);
    // Firebase em background: atualiza se tiver dados mais recentes
    cloudReady.then(() => cloudGet("meta", "images")).then((sharedImgs) => {
      if (sharedImgs && sharedImgs.map && Object.keys(sharedImgs.map).length > 0) {
        setImages(sharedImgs.map);
        _ls.set("sr_shared_images", JSON.stringify(sharedImgs.map));
      }
    }).catch(() => {});
    cloudReady.then(() => cloudGet("meta", "tierlist")).then((sharedTL) => {
      if (sharedTL && sharedTL.map && Object.keys(sharedTL.map).length > 0) {
        setTierList(sharedTL.map);
        _ls.set("sr_shared_tierlist", JSON.stringify(sharedTL.map));
      }
    }).catch(() => {});
  })(); }, [SAVE_KEY]);

  const lastStaminaRef = useRef(lastStamina);
  useEffect(() => { lastStaminaRef.current = lastStamina; }, [lastStamina]);
  useEffect(() => {
    if (!loaded) return;
    const tick = () => {
      const gained = Math.floor((Date.now() - lastStaminaRef.current) / 5625); // 30 min full (320 stamina × 5625ms)
      if (gained > 0) { setStamina((v) => Math.min(320, v + gained)); setLastStamina(Date.now()); }
    };
    tick();
    const iv = setInterval(tick, 60 * 1000); // catch-up ao vivo a cada minuto (estável: deps [loaded], lê ref)
    return () => clearInterval(iv);
  }, [loaded]); // eslint-disable-line

  useEffect(() => {
    if (!loaded) return;
    writeSave(SAVE_KEY, { jade, chronicles, charTickets, weaponTickets, standardTickets, featuredChar, featuredWeapon, pity, pullHistory, owned, ownedWeapons, relicInv, team, teamPresets, stamina, lastStamina, playerName, images, towerCleared, towerClaimed, towerSeason, towerTop1Claimed, darkTowerCleared, darkTowerClaimed, expItems, bossMats, ascMats, weaponMats, skillMats, tagMats, lastWeeklyBoss, dailyClaimedAt, weeklyClaimedAt, bossRushCleared, draftRoomCleared, draftClaimedGems, draftBoons, mailClaimed, mail2Claimed, relicMats, rouletteCleared, shopResetAt, shopPurchases, mail3Claimed, mail3CharPicked, nextRouletteClaimAt, espiralClearedAt, abismoRun, abismoFrags, abismoMeta, abismoFirstClears, abismoWeekly, mailIniciante, mail4Claimed, mail5Claimed, mail6Claimed, mail7Claimed });
  }, [loaded, SAVE_KEY, jade, chronicles, charTickets, weaponTickets, standardTickets, featuredChar, featuredWeapon, pity, pullHistory, owned, ownedWeapons, relicInv, team, teamPresets, stamina, lastStamina, playerName, images, towerCleared, towerClaimed, towerSeason, towerTop1Claimed, darkTowerCleared, darkTowerClaimed, expItems, bossMats, ascMats, weaponMats, skillMats, tagMats, lastWeeklyBoss, dailyClaimedAt, weeklyClaimedAt, bossRushCleared, draftRoomCleared, draftClaimedGems, draftBoons, mailClaimed, mail2Claimed, relicMats, shopResetAt, shopPurchases, mail3Claimed, mail3CharPicked, nextRouletteClaimAt, espiralClearedAt, abismoRun, abismoFrags, abismoMeta, abismoFirstClears, abismoWeekly, mailIniciante, mail4Claimed, mail5Claimed, mail6Claimed, mail7Claimed]);

  const teamPower = () => Math.round(team.reduce((a, id) => { const s = ownedMap[id] && computeStats(ownedMap[id]); return a + (s ? s.atk : 0); }, 0)) || 2500;
  const pay = (cost) => { if (isAdmin) return true; if (jade < cost) { flash("Jade insuficiente", C.bad); return false; } setJade((j) => j - cost); return true; };

  function grantChar(id, ownedRef) {
    const existed = ownedRef.has(id);
    ownedRef.add(id);
    let atMax = false;
    setOwned((prev) => {
      const ex = prev.find((o) => o.id === id);
      if (ex) {
        if ((ex.eidolon || 0) >= 6) { atMax = true; return prev; } // já em E6 — não some, compensa com Crônicas abaixo
        return prev.map((o) => (o.id === id ? { ...o, eidolon: Math.min(6, (o.eidolon || 0) + 1) } : o));
      }
      return [...prev, normChar({ id, level: 1, eidolon: 0 })];
    });
    if (atMax) { const rarity = CHAR_MAP[id]?.rarity || 5; setChronicles((c) => c + (rarity === 5 ? 40 : 15)); }
    return existed;
  }
  const setOwnedField = (id, patch) => setOwned((prev) => prev.map((o) => (o.id === id ? { ...o, ...patch } : o)));
  function claimMail2Reward() {
    if (mail2Claimed) return;
    setJade((j) => j + 6000);
    setExpItems((v) => v + 150);
    setWeaponMats((v) => v + 150);
    setMail2Claimed(true);
    try { localStorage.setItem('sr_mail2_claimed_v2', '1'); } catch {}
    flash(`📬 +6.000💎 +150📘 +150⚙️ coletados!`, C.gold);
  }
  function claimMail3Reward(charId) {
    if (mail3Claimed) return;
    if (!CHAR_MAP[charId] || CHAR_MAP[charId].rarity !== 5) return;
    const alreadyOwned = owned.some(o => o.id === charId);
    const alreadyMax = owned.some(o => o.id === charId && (o.eidolon || 0) >= 6);
    const ownedRef = new Set(owned.map(o => o.id));
    grantChar(charId, ownedRef);
    setMail3CharPicked(charId);
    setMail3Claimed(true);
    try { localStorage.setItem('sr_mail3_claimed_v2', '1'); localStorage.setItem('sr_mail3_char_v2', charId); } catch {}
    const char = CHAR_MAP[charId];
    if (alreadyMax) flash(`📬 ${char.name} já está em E6! +40 Crônicas compensadas.`, C.gold);
    else if (alreadyOwned) { const cur = owned.find(o => o.id === charId); const newE = Math.min(6, (cur?.eidolon || 0) + 1); flash(`📬 ${char.name} já era seu — Constelação E${newE} desbloqueada!`, C.gold); }
    else flash(`📬 ${char.name} entra no seu elenco!`, C.gold);
  }
  function claimMail6Reward() {
    if (mail6Claimed) return;
    setJade((j) => j + 16000);
    setMail6Claimed(true);
    try { localStorage.setItem('sr_mail6_claimed_v1', '1'); } catch {}
    flash(`📬 +16.000💎 coletadas!`, C.gold);
  }
  function claimMail7Reward() {
    if (mail7Claimed) return;
    setJade((j) => j + 12000);
    setMail7Claimed(true);
    try { localStorage.setItem('sr_mail7_claimed_v1', '1'); } catch {}
    flash(`📬 +12.000💎 coletadas!`, C.gold);
  }
  function claimMail4Reward() {
    if (mail4Claimed) return;
    setJade((j) => j + 7000);
    setMail4Claimed(true);
    try { localStorage.setItem('sr_mail4_claimed_v2', '1'); } catch {}
    flash(`📬 +7.000💎 coletadas!`, C.gold);
  }
  function claimMail5Reward(charId) {
    if (mail5Claimed) return;
    if (!CHAR_MAP[charId] || CHAR_MAP[charId].rarity !== 5) return;
    const alreadyOwned = owned.some(o => o.id === charId);
    const alreadyMax = owned.some(o => o.id === charId && (o.eidolon || 0) >= 6);
    const ownedRef = new Set(owned.map(o => o.id));
    grantChar(charId, ownedRef);
    setMail5Claimed(true);
    try { localStorage.setItem('sr_mail5_claimed_v2', '1'); } catch {}
    const char = CHAR_MAP[charId];
    if (alreadyMax) flash(`📬 ${char.name} já está em E6! +40 Crônicas compensadas.`, C.gold);
    else if (alreadyOwned) { const cur = owned.find(o => o.id === charId); const newE = Math.min(6, (cur?.eidolon || 0) + 1); flash(`📬 ${char.name} já era seu — Constelação E${newE} desbloqueada!`, C.gold); }
    else flash(`📬 ${char.name} entra no seu elenco!`, C.gold);
  }
  function claimTop1Reward(charId, weaponId) {
    if (towerTop1Claimed) return;
    if (!CHAR_MAP[charId] || !WEAPON_MAP[weaponId]) return;
    const ownedRef = new Set(owned.map(o => o.id));
    grantChar(charId, ownedRef);
    setOwnedWeapons((p) => p.some((w) => w.id === weaponId) ? p.map((w) => w.id === weaponId ? { ...w, lv: Math.min(WEAPON_MAX_LEVEL, w.lv + 20) } : w) : [...p, { id: weaponId, lv: 1 }]);
    setTowerTop1Claimed(true);
    flash(`🏆 ${CHAR_MAP[charId].name} e ${WEAPON_MAP[weaponId].name} entram no seu elenco!`, C.gold);
  }
  function onUpgradeRelic(relicId) {
    const cur = relicInv.find((r) => r.id === relicId);
    if (!cur || cur.level >= 15) return;
    const need = 1 + Math.floor((cur.level || 0) / 4);
    if (!isAdmin && relicMats < need) { flash(`Faltam Matérias de Relíquia (precisa ${need}) — compre na Loja 🛒`, C.bad); return; }
    if (!isAdmin) setRelicMats((v) => v - need);
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
    if (!isAdmin) { setWeaponMats((v) => v - c.wmat); }
    const nextLv = lv + 1;
    setOwnedField(id, { weaponLv: nextLv });
    setOwnedWeapons((p) => p.map((w) => w.id === o.weapon ? { ...w, lv: nextLv } : w));
    flash(`Arma → Nível ${nextLv}`, C.good);
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
    // kind: "char" (evento), "standard" (permanente), "weapon", "special" (Especial Limitado, 3 dias)
    const isChar = kind === "char", isStd = kind === "standard", isWeapon = kind === "weapon", isSpecial = kind === "special";
    if (isSpecial && Date.now() >= SPECIAL_BANNER_END) { flash("O Banner Especial já encerrou.", C.bad); return; }
    const tickets = isChar ? charTickets : isStd ? standardTickets : isSpecial ? 0 : weaponTickets;
    const affordableJade = isAdmin ? count : Math.floor(jade / 160);
    if (tickets + affordableJade < count) { flash("Recursos insuficientes", C.bad); return; }
    const useTickets = Math.min(tickets, count);
    const jadeSpent = (count - useTickets) * 160;

    const pool4 = isWeapon ? WEAPONS.filter((w) => w.rarity === 4) : ROSTER.filter((c) => c.rarity === 4);
    let curPity = isChar ? pity.char : isStd ? pity.standard : isSpecial ? (pity.special || 0) : pity.weapon;
    let guar = pity.guaranteeChar;
    let chroniclesGain = 0;
    const results = [];
    const fives = [];
    const ownedRef = new Set(owned.map((o) => o.id));

    for (let i = 0; i < count; i++) {
      const rar = rollRarity(curPity, isChar || isSpecial); // evento e especial: 5★ mais raro fora do pity 90
      if (rar === 5) {
        curPity = 0;
        if (isWeapon) {
          const id = featuredWeapon; // banner de arma: SEM 50/50, sempre o destaque
          setOwnedWeapons((p) => p.some((w) => w.id === id) ? p : [...p, { id, lv: 1 }]);
          results.push({ rarity: 5, kind, id, name: WEAPON_MAP[id].name, weapon: true });
          fives.push({ id, name: WEAPON_MAP[id].name, banner: "Armas" });
        } else if (isStd) {
          const id = pick(STANDARD_5); // permanente: pool padrão
          const dup = grantChar(id, ownedRef);
          results.push({ rarity: 5, kind, id, name: CHAR_MAP[id].name, dup });
          fives.push({ id, name: CHAR_MAP[id].name, banner: "Permanente" });
        } else if (isSpecial) {
          // Especial Limitado: sem 50/50, sai aleatoriamente entre os 5 do evento
          const id = pick(SPECIAL_BANNER_CHARS);
          const dup = grantChar(id, ownedRef);
          results.push({ rarity: 5, kind, id, name: CHAR_MAP[id].name, dup, won: true });
          fives.push({ id, name: CHAR_MAP[id].name, banner: "✦ Especial Limitado" });
        } else {
          // SEM 50/50: todo 5★ do banner de evento É o personagem destaque, sempre
          const id = featuredChar; guar = false;
          const dup = grantChar(id, ownedRef);
          results.push({ rarity: 5, kind, id, name: CHAR_MAP[id].name, dup, won: true });
          fives.push({ id, name: CHAR_MAP[id].name, banner: "Evento ✦ Destaque garantido!" });
        }
      } else if (rar === 4) {
        curPity += 1;
        const it = pick(pool4);
        if (isWeapon) { setOwnedWeapons((p) => p.some((w) => w.id === it.id) ? p : [...p, { id: it.id, lv: 1 }]); results.push({ rarity: 4, kind, id: it.id, name: it.name, weapon: true }); }
        else { const dup = grantChar(it.id, ownedRef); results.push({ rarity: 4, kind, id: it.id, name: it.name, dup }); }
      } else {
        curPity += 1; chroniclesGain += 1;
        results.push({ rarity: 3, kind, id: "shard", name: "Crônica (+1📜)" });
      }
    }
    if (isChar) setPity((p) => ({ ...p, char: curPity, guaranteeChar: guar }));
    else if (isStd) setPity((p) => ({ ...p, standard: curPity }));
    else if (isSpecial) setPity((p) => ({ ...p, special: curPity }));
    else setPity((p) => ({ ...p, weapon: curPity }));
    if (isChar) setCharTickets((t) => t - useTickets); else if (isStd) setStandardTickets((t) => t - useTickets); else if (!isSpecial) setWeaponTickets((t) => t - useTickets);
    if (jadeSpent && !isAdmin) setJade((j) => j - jadeSpent);
    if (chroniclesGain) setChronicles((c) => c + chroniclesGain);
    if (fives.length) setPullHistory((h) => [...fives.map((f) => ({ ...f, t: Date.now() })), ...h].slice(0, 30));
    setPullResults({ kind, results });
  }

  // batalhas
  function startTower(floor) {
    if (floor <= towerCleared) { flash("Andar já concluído — não pode repetir.", C.bad); return; }
    if (floor > towerCleared + 1) { flash("Conclua os andares anteriores primeiro.", C.bad); return; }
    setBattle({ context: "tower", floor, encounter: towerEncounter(floor, teamPower()), ally: null });
  }
  // Avança direto pro próximo andar a partir da tela de vitória — não usa startTower() aqui pq towerCleared
  // ainda não foi atualizado nesse mesmo tick (o setTowerCleared do onBattleEnd é assíncrono), o que sempre
  // bloqueava o avanço por engano. Como já sabemos que o andar atual foi vencido, montamos o próximo direto.
  function advanceTowerFloor(result) {
    const cur = battle; const nextFloor = (cur?.floor || 0) + 1;
    onBattleEnd(result);
    if (nextFloor > TOWER_FLOORS) { flash("Você já venceu todos os andares da Torre!", C.gold); return; }
    setBattle({ context: "tower", floor: nextFloor, encounter: towerEncounter(nextFloor, teamPower()), ally: null });
  }
  function advanceDarkTowerFloor(result) {
    const cur = battle; const nextLevel = (cur?.floor || 0) + 1;
    onBattleEnd(result);
    if (nextLevel > DARK_TOWER_BOSSES.length) { flash("Você já venceu todos os níveis da Torre Sombria!", C.gold); return; }
    const enc = darkTowerEncounter(nextLevel, teamPower());
    if (enc) setBattle({ context: "darktower", floor: nextLevel, encounter: enc, ally: null });
  }
  function startDarkTower(level) {
    if (level <= darkTowerCleared) { flash("Nível já concluído — não pode repetir.", C.bad); return; }
    if (level > darkTowerCleared + 1) { flash("Conclua os níveis anteriores primeiro.", C.bad); return; }
    const enc = darkTowerEncounter(level, teamPower());
    if (!enc) return;
    setBattle({ context: "darktower", floor: level, encounter: enc, ally: null });
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
  function claimDaily() {
    if (Date.now() - dailyClaimedAt < 24 * 3600 * 1000) { flash("Já resgatado hoje. Volte amanhã.", C.bad); return; }
    const tags = ALL_TAGS; const tag = tags[Math.floor(Math.random() * tags.length)];
    setWeaponMats((v) => v + 10); setSkillMats((v) => v + 10); setRelicMats((v) => v + 8);
    setTagMats((m) => ({ ...m, [tag]: (m[tag] || 0) + 2 }));
    setDailyClaimedAt(Date.now());
    flash(`Diária resgatada! +10 ⚙️ +10 💠 +8 🔷 +2 material "${tag}"`, C.good);
  }
  function claimWeekly() {
    if (Date.now() - weeklyClaimedAt < 7 * 24 * 3600 * 1000) { flash("Já resgatado esta semana.", C.bad); return; }
    ALL_TAGS.forEach((tag) => setTagMats((m) => ({ ...m, [tag]: (m[tag] || 0) + 3 })));
    setWeaponMats((v) => v + 40); setSkillMats((v) => v + 40); setBossMats((v) => v + 4); setAscMats((v) => v + 4); setRelicMats((v) => v + 30);
    setWeeklyClaimedAt(Date.now());
    flash(`Semanal resgatada! +40 ⚙️ +40 💠 +4 🔮 +4 🔶 +30 🔷 +3 de cada material de tag`, C.good);
  }
  function startAscension() {
    if (stamina < 40) { flash("Stamina insuficiente (precisa 40)", C.bad); return; }
    setStamina((v) => v - 40);
    setBattle({ context: "ascend", encounter: { level: 50, count: 1, boss: true, ascend: true, bossName: "Guardião da Ascensão", bossKind: "stone", teamPower: teamPower() }, ally: null });
  }
  function startBossRush(bossId) { setPendingBoss(bossId); }
  function launchBossRush(bossId, customTeam) { const bd = BOSS_RUSH_BOSSES.find(function(b){return b.id===bossId;}); if (!bd) return; setPendingBoss(null); setBattle({ context: "bossrush", bossId: bossId, customTeam: customTeam||null, encounter: { bossRush: true, bossId: bossId, level: bd.level, count: 1, boss: true, bossName: bd.name, bossElement: bd.element, bossKind: bd.kind, bossImgId: bd.imgKey, teamPower: teamPower() }, ally: null }); }

  function startDraftRoom(roomIdx, draftTeamIds) {
    if (!draftActive) { flash("A Catacumba não está ativa no momento.", C.bad); return; }
    const lv = 40 + roomIdx * 8;
    const isBoss = roomIdx === 3 || roomIdx === 6;
    // Create synthetic owned entries for draft chars (may not be in player's collection)
    const draftOwnedEntries = draftTeamIds.filter(Boolean).map((id) => {
      if (ownedMap[id]) return ownedMap[id]; // use player's own version if owned
      return { id, level: 70, eidolon: 0, weapon: null, relics: EMPTY_RELICS(), traces: { basic: 5, skill: 5, ult: 5 }, traceNodes: new Array(6).fill(false), specialTraces: [false, false, false] };
    });
    const draftOwnedMap = Object.fromEntries(draftOwnedEntries.map((o) => [o.id, o]));
    setBattle({ context: "draft", draftRoom: roomIdx, customTeam: draftTeamIds, draftOwnedMap, encounter: { level: lv, count: isBoss ? 1 : 2, boss: isBoss, teamPower: teamPower(), bossName: isBoss ? (roomIdx === 6 ? "Soberano da Catacumba" : "Guardião da Catacumba") : null, bossKind: isBoss ? "guardian" : null }, ally: null });
  }
  // Gera fraquezas elementais da semana — seed baseada no número da semana ISO
  /* ══════════ ABISMO DE DADOS — motor da run ══════════ */
  const ABISMO_MUTS = ["pacto_vidro", "miasma", "espelhos", "frenesi", "chao", "vinganca", "explosao", "escalada", "ventos", "masoquista"];
  function startAbismo() {
    const pool = owned.map(o => o.id);
    if (!pool.length) { flash("Você precisa de pelo menos 1 personagem!", C.bad); return; }
    const pioneer = pool[Math.floor(Math.random() * pool.length)];
    const seed = Date.now() % 100000; // semente nova a cada run (anti-macro)
    setAbismoRun({ floor: 1, team: [pioneer], hpMap: {}, dead: [], gold: 50 + (abismoMeta.bolsos ? 100 : 0), points: 0, frags: 0, glitches: [], curse: 0, seed, nodeOptions: abismoNodeOptions(1, seed), pendingDraft: false, utiUsed: false, rerollUsed: false, startedAt: Date.now(), battles: 0 });
    flash(`🕳️ A run começa! Pioneiro(a): ${CHAR_MAP[pioneer]?.name}. Sobreviva.`, C.gold);
  }
  function abismoBattle(kind) {
    const r = abismoRun; if (!r) return;
    const mutIdx = Math.floor((Math.sin(r.seed + r.floor * 77) * 0.5 + 0.5) * ABISMO_MUTS.length) % ABISMO_MUTS.length;
    const lvl = Math.min(95, 6 + r.floor * 2);
    setBattle({ context: "abismo", abismoKind: kind, customTeam: r.team, draftOwnedMap: ownedMap,
      encounter: { level: lvl, count: kind === "boss" ? 2 : kind === "elite" ? 2 : 3, boss: kind === "boss" || kind === "elite",
        bossName: kind === "boss" ? "Núcleo do Abismo · Andar " + r.floor : kind === "elite" ? "Elite Corrompida" : null,
        bossKind: kind === "boss" ? "espiral_lord" : "guardian", espiralLordHpMul: 1.5,
        teamPower: teamPower(), abismo: true, abismoMutator: ABISMO_MUTS[mutIdx],
        abismoGlitches: r.glitches, abismoHp: r.hpMap, abismoCurse: r.curse, abismoUti: !!(abismoMeta.uti && !r.utiUsed) }, ally: null });
  }
  async function claimAbismoFirstClear(floor) {
    if (!window.__abClaims) window.__abClaims = new Set();
    if (window.__abClaims.has(floor)) return; window.__abClaims.add(floor);
    // Validação server-side: o prêmio fica cravado no Firestore por conta.
    // Mesmo apagando/editando o save local, o servidor recusa o segundo resgate.
    const claimId = (email || "anon") + "_abismo_" + floor;
    if (Cloud.ready) {
      const rec = await cloudGet("abismo_claims", claimId);
      if (rec) { setAbismoFirstClears(fc => fc.includes(floor) ? fc : [...fc, floor]); flash("💎 First clear do Andar " + floor + " já registrado no servidor.", C.mute); return; }
      const ok = await cloudSet("abismo_claims", claimId, { email: email || "anon", floor, at: Date.now() });
      if (!ok) { flash("⚠️ Servidor indisponível — o first clear será validado quando reconectar.", C.bad); return; }
    }
    setAbismoFirstClears(fc => fc.includes(floor) ? fc : [...fc, floor]);
    setJade(j => j + 160);
    flash(`💎 FIRST CLEAR — Andar ${floor}: +160 Gemas (registrado ${Cloud.ready ? "no servidor" : "localmente"})!`, C.gold);
  }
  function abismoCashout(r, died) {
    // ── Validação de integridade (anti-macro/anti-cheat) ──
    // 1) Plausibilidade temporal: nenhuma batalha real leva menos de ~6s
    const elapsed = Date.now() - (r.startedAt || 0);
    const minPlausible = (r.battles || 0) * 6000;
    // 2) Teto teórico de pontos por andar alcançado
    const maxPoints = r.floor * 30 + 60;
    const suspicious = (r.battles > 0 && elapsed < minPlausible) || r.points > maxPoints;
    if (suspicious) {
      setAbismoRun(null);
      flash("🚫 RUN REPROVADA pela validação de integridade — recompensas anuladas (progresso rápido/dados implausíveis).", C.bad);
      return;
    }
    // Hard cap semanal de 800💎 vindas dos Pontos de Exploração
    const wk = espiralWeekSeed() + "";
    const cur = abismoWeekly.key === wk ? abismoWeekly.gems : 0;
    const gems = Math.max(0, Math.min(800 - cur, r.points));
    if (gems > 0) { setJade(j => j + gems); setAbismoWeekly({ key: wk, gems: cur + gems }); }
    const xp = Math.floor(r.points / 5);
    if (xp > 0) setExpItems(v => v + xp);
    setAbismoFrags(f => f + (r.frags || 0));
    setAbismoRun(null);
    flash(`${died ? "☠️ A run termina no Andar " + r.floor : "🏁 Retirada estratégica no Andar " + r.floor}. +${gems}💎 (${cur + gems}/800 semanais) · +${xp}📘 · +${r.frags || 0}🧬 Fragmentos`, died ? C.bad : C.gold);
  }
  function abismoAfterWin(kind, res) {
    setAbismoRun(prev => {
      if (!prev) return prev;
      const r = { ...prev, hpMap: { ...prev.hpMap }, dead: [...prev.dead], glitches: [...prev.glitches], team: [...prev.team] };
      (res.heroesHp || []).forEach(h => { r.hpMap[h.id] = h.hpPct; if (!h.alive && !r.dead.includes(h.id)) { r.dead.push(h.id); r.team = r.team.filter(x => x !== h.id); } });
      // Trava de segurança: se um "empate mútuo" zerou o time inteiro no golpe da vitória, encerra a run com segurança
      // em vez de deixar a próxima luta começar sem nenhum herói (isso travava/crashava o jogo).
      if (r.team.length === 0) {
        r.points += kind === "boss" ? 30 : kind === "elite" ? 15 : 10;
        r.frags = (r.frags || 0) + (kind === "boss" ? 40 : kind === "elite" ? 15 : 8);
        setTimeout(() => abismoCashout(r, true), 50);
        return r;
      }
      r.points += kind === "boss" ? 30 : kind === "elite" ? 15 : 10;
      r.battles = (r.battles || 0) + 1;
      r.frags = (r.frags || 0) + (kind === "boss" ? 40 : kind === "elite" ? 15 : 8);
      r.gold += kind === "boss" ? 80 : kind === "elite" ? 35 : 20;
      if (r.curse > 0) r.curse -= 1;
      // First-clear: a cada 10 andares, 160💎 ÚNICAS por conta — validado no SERVIDOR (Firestore)
      if (r.floor % 10 === 0 && !abismoFirstClears.includes(r.floor)) claimAbismoFirstClear(r.floor);
      // Glitch drop: elites/bosses (e Troia bloqueia draft)
      if ((kind === "elite" || kind === "boss") && Math.random() < (kind === "boss" ? 0.65 : 0.4)) {
        const GL_POOL = ["patch", "bateria", "lente", "sanguefrio", "contrato", ...(kind === "boss" ? ["troia"] : [])];
        const avail = GL_POOL.filter(g => !r.glitches.includes(g));
        if (avail.length) { const g = avail[Math.floor(Math.random() * avail.length)]; r.glitches.push(g); flash("🧩 Glitch adquirido: " + ABISMO_GLITCH_INFO[g].n + "!", "#B98BFF"); }
      }
      // Draft após Elite/Boss (bloqueado pelo Cavalo de Troia)
      const _pool = owned.map(o => o.id).filter(id => !r.team.includes(id) && !r.dead.includes(id));
      r.pendingDraft = (kind === "elite" || kind === "boss") && !r.glitches.includes("troia") && r.team.length < 5 && _pool.length > 0;
      r.floor += 1;
      r.nodeOptions = abismoNodeOptions(r.floor, r.seed);
      return r;
    });
  }
  function espiralWeekSeed() {
    const now = new Date();
    const jan1 = new Date(now.getFullYear(), 0, 1);
    const week = Math.floor((now - jan1) / (7 * 24 * 3600 * 1000));
    const ESPIRAL_RESET_OFFSET = 4000; // deslocamento manual: invalida instantaneamente todo espiralClearedAt salvo (reset pra todos) — subido de 2000→4000 pra disparar um novo reset agora
    return now.getFullYear() * 100 + week + ESPIRAL_RESET_OFFSET;
  }
  function espiralWeaknesses(seed) {
    const pool = [...ELEMENT_NAMES];
    const rng = (n) => { let x = Math.sin(seed + n) * 10000; return x - Math.floor(x); };
    const a = pool.splice(Math.floor(rng(1) * pool.length), 1)[0];
    const b = pool.splice(Math.floor(rng(2) * pool.length), 1)[0];
    const c = pool.splice(Math.floor(rng(3) * pool.length), 1)[0];
    const d = pool.splice(Math.floor(rng(4) * pool.length), 1)[0];
    return { weakA: [a, b], weakB: [c, d] };
  }
  function startEspiral(diff, teamA, teamB) {
    const seed = espiralWeekSeed();
    const { weakA, weakB } = espiralWeaknesses(seed);
    const diffCfg = { normal: { level: 60, waves: 1, gem: 2000 }, hard: { level: 75, waves: 2, gem: 4000 }, extreme: { level: 85, waves: 3, gem: 6000 }, apex: { level: 95, waves: 4, gem: 10000 } }[diff];
    if (!diffCfg) return;
    const halfOwned = Object.fromEntries([...teamA, ...teamB].map(id => [id, ownedMap[id] || normChar({ id, level: 70 })]));
    // Começa pela metade A (Time A)
    setEspiralPending({ diff, half: 1, weakA, weakB, diffCfg, teamA, teamB });
    setBattle({ context: "espiral", espiralDiff: diff, espiralHalf: 1, customTeam: teamA, draftOwnedMap: halfOwned,
      encounter: { level: diffCfg.level, count: 3, boss: true, waves: diffCfg.waves, bossName: "Guardião da Espiral", bossKind: "guardian", teamPower: teamPower(), espiral: true, bossWeak: weakA }, ally: null });
  }
  function startRelicDungeon(tier) {
    const cost = tier === 2 ? 60 : tier === 1 ? 45 : 30;
    if (stamina < cost) { flash("Stamina insuficiente (precisa " + cost + ")", C.bad); return; }
    setStamina(function(v){ return v - cost; });
    const level = tier === 2 ? 85 : tier === 1 ? 65 : 45;
    const bossNames = ["Núcleo Corrompido", "Servidor Infectado", "Matriz Fantasma"];
    setBattle({ context: "relicfarm", tier, encounter: { level, count: 2, boss: true, bossName: bossNames[tier] || bossNames[1], bossKind: "guardian", teamPower: teamPower(), relicFarm: true }, ally: null });
  }
  function startRotatingRelicDungeon() {
    const cost = 35;
    if (stamina < cost) { flash("Stamina insuficiente (precisa " + cost + ")", C.bad); return; }
    setStamina(function(v){ return v - cost; });
    setBattle({ context: "relicrotate", encounter: { level: 60, count: 2, boss: true, bossName: "Guardião do Domínio Rotativo · " + featuredFarmSet(), bossKind: "guardian", teamPower: teamPower() }, ally: null });
  }
    function onBattleEnd(result) {
    const b = battle; setBattle(null);
    if (!b || result.abort) return;
    if (b.context === "tower") {
      if (result.win) {
        const f = b.floor;
        if (f === towerCleared + 1 && !towerClaimed.includes(f)) {
          const rw = rewardFor(f); setJade((j) => j + rw); setTowerCleared(f); setTowerClaimed((p) => [...p, f]);
          // Andares 100+: dropar materiais de arma e relíquia (recompensa dos rastros)
          let extraMsg = "";
          if (f >= 100) {
            const wpnDrop = Math.floor(Math.random() * 3) + 2;
            const relicDrop = f % 10 === 0 ? Math.floor(Math.random() * 2) + 2 : 1;
            setWeaponMats(v => v + wpnDrop);
            setRelicMats(v => v + relicDrop);
            extraMsg = ` +${wpnDrop}⚙️ +${relicDrop}🔷`;
          }
          flash(`Andar ${f} conquistado! +${rw}💎${extraMsg}`, C.good);
          // Salvar progresso na tower no Firebase para o ranking global
          const _pName = (playerName || email || "Anon").split("@")[0];
          cloudReady.then(() => cloudSet("tower_lb", _pName, { name: _pName, floor: f, updatedAt: Date.now() }));
        } else { setExpItems((v) => v + 4); flash("Andar repetido — sem gemas, +4 Lácrimas de XP", C.mute); } // anti-exploit: replays não dão gemas
      } else flash("Você caiu na torre…", C.bad);
    } else if (b.context === "darktower") {
      if (result.win) {
        const lvl = b.floor;
        if (lvl === darkTowerCleared + 1 && !darkTowerClaimed.includes(lvl)) {
          const bd = DARK_TOWER_BOSSES[lvl - 1]; const rw = (bd && bd.reward) || 1600;
          setJade((j) => j + rw); setDarkTowerCleared(lvl); setDarkTowerClaimed((p) => [...p, lvl]);
          flash(`🌑 Nível ${lvl} da Torre Sombria conquistado! +${rw}💎`, C.good);
        } else { setExpItems((v) => v + 4); flash("Nível repetido — sem gemas, +4 Lácrimas de XP", C.mute); }
      } else flash("Você caiu na Torre Sombria…", C.bad);
    } else if (b.context === "test") {
      if (result.win) { flash("Vitória de treino! (modo livre, sem recompensas)", C.good); } // anti-exploit: treino é sandbox, sem materiais
      else flash("Derrota", C.bad);
    } else if (b.context === "farm") {
      if (result.win) { setExpItems((v) => v + (b.reward || 8)); flash(`Dungeon limpa! +${b.reward || 8} Lácrimas de XP`, C.good); }
      else flash("Derrota na dungeon", C.bad);
    } else if (b.context === "relicfarm") {
      if (result.win) {
        const tier = b.tier || 1;
        const count = tier === 2 ? 2 : 1;
        const newRelics = Array.from({ length: count }, function() {
          const slot = Math.floor(Math.random() * 6);
          return makeRelic(slot, "Protocolo Ômega");
        });
        setRelicInv(function(inv){ return [...inv, ...newRelics]; });
        setRelicMats(function(v){ return v + 12; });
        flash("Rede Corrompida vencida! +" + count + " Relíquia(s) Protocolo Ômega ☢️ +12 🔷 Matéria de Relíquia (Elenco → Relíquias)", "#00E5CC");
      } else { flash("A Rede Corrompida resistiu…", C.bad); }
    } else if (b.context === "relicrotate") {
      if (result.win) {
        const setN = featuredFarmSet();
        const count = 2 + Math.floor(Math.random() * 2); // "buff de drop": 2-3 relíquias garantidas
        const newRelics = Array.from({ length: count }, function() { return makeRelic(Math.floor(Math.random() * 6), setN); });
        setRelicInv(function(inv){ return [...inv, ...newRelics]; });
        setRelicMats(function(v){ return v + 15; });
        flash(`Domínio Rotativo vencido! +${count} Relíquia(s) "${setN}" · +15 🔷 Matéria de Relíquia`, C.gold);
      } else { flash("O Domínio Rotativo resistiu…", C.bad); }
    } else if (b.context === "tagdungeon") {
      if (result.win) { const t = b.tag; const drop = Math.floor(Math.random() * 2) + 1; setTagMats((m) => ({ ...m, [t]: (m[t] || 0) + drop })); setWeaponMats((v) => v + 14); setSkillMats((v) => v + 14); setBossMats((v) => v + 1); setRelicMats((v) => v + 12); flash(`Dungeon de ${t} concluída! +${drop} material "${t}", +14 ⚙️ Arma, +14 💠 Habilidade, +1 🔮, +12 🔷 Matéria de Relíquia`, C.gold); }
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
    } else if (b.context === "draft") {
      if (result.win) {
        const roomRewards = [200, 200, 200, 400, 250, 250, 1500];
        const rw = roomRewards[b.draftRoom] || 0;
        const newCleared = Math.max(draftRoomCleared, (b.draftRoom || 0) + 1);
        setDraftRoomCleared(newCleared);
        setDraftClaimedGems((v) => v + rw);
        setJade((j) => j + rw);
        flash(`Sala ${(b.draftRoom || 0) + 1} conquistada! +${rw}💎`, C.good);
      } else { flash("Derrotado na Catacumba do Rascunho…", C.bad); }
    } else if (b.context === "abismo") {
      const r0 = abismoRun;
      if (!r0) { setBattle(null); return; }
      if (result.win) {
        abismoAfterWin(b.abismoKind, result);
      } else {
        // Derrota ou recuo em combate = fim da run (permadeath)
        abismoCashout(r0, !result.abort);
      }
      setBattle(null); setScreen("abismo"); return;
    } else if (b.context === "espiral") {
      const pend = espiralPending;
      if (!pend) return;
      if (!result.win) { setEspiralPending(null); flash("Espiral — derrota. Tente novamente!", C.bad); return; }
      if (b.espiralHalf === 1) {
        // Time A venceu — agora Time B entra (metade B); guarda turnos da metade A
        const { diff, weakB, diffCfg, teamA, teamB } = pend;
        const halfOwned = Object.fromEntries([...teamA, ...teamB].map(id => [id, ownedMap[id] || normChar({ id, level: 70 })]));
        setEspiralPending({ ...pend, half: 2, turnsA: result.turns || 0 });
        setBattle({ context: "espiral", espiralDiff: diff, espiralHalf: 2, customTeam: teamB, draftOwnedMap: halfOwned,
          encounter: { level: diffCfg.level, count: 3, boss: true, waves: diffCfg.waves, bossName: "Soberano da Espiral", bossKind: (diff === "extreme" || diff === "apex") ? "espiral_lord" : "guardian", espiralLordHpMul: diff === "apex" ? 2.6 : 1.9, teamPower: teamPower(), espiral: true, bossWeak: weakB }, ally: null });
      } else {
        // Ambos os times venceram — clear completo com sistema de estrelas
        const { diff, diffCfg, turnsA } = pend;
        setEspiralPending(null);
        const weekKey = espiralWeekSeed();
        const totalTurns = (turnsA || 0) + (result.turns || 0);
        // Limites por dificuldade: [3★, 2★]; >2★ limite = 1★ (qualquer vitória)
        const starLimits = { normal:[12,22], hard:[16,28], extreme:[20,36], apex:[24,44] }[diff] || [16,28];
        const newStars = totalTurns <= starLimits[0] ? 3 : totalTurns <= starLimits[1] ? 2 : 1;
        const prevStars = espiralClearedAt[diff + "_" + weekKey] || 0;
        const isFirst = prevStars === 0;
        const isNewBest = newStars > prevStars;
        let reward = 0;
        if (isFirst)        { reward = newStars === 3 ? diffCfg.gem : newStars === 2 ? Math.round(diffCfg.gem * 0.6) : Math.round(diffCfg.gem * 0.3); }
        else if (isNewBest) { reward = newStars === 3 ? Math.round(diffCfg.gem * 0.5) : Math.round(diffCfg.gem * 0.1); }
        else if (prevStars < 3) { reward = Math.round(diffCfg.gem * 0.05); }
        // Se já tem 3★ e não é primeiro, sem recompensa
        if (prevStars >= 3 && !isFirst) reward = 0;
        const starStr = "⭐".repeat(newStars) + "☆".repeat(3 - newStars);
        if (reward > 0) setJade(j => j + reward);
        setEspiralClearedAt(c => ({ ...c, [diff + "_" + weekKey]: Math.max(prevStars, newStars) }));
        flash(`🌀 ESPIRAL ${diff.toUpperCase()} ${starStr} (${totalTurns} turnos)!${reward > 0 ? ` +${reward}💎` : ""}${isFirst ? " (1ª vez!)" : isNewBest ? " (Novo recorde!)" : prevStars >= 3 ? " (Já 3★ — sem bônus)" : ""}`, reward > 0 ? C.gold : C.mute);
      }
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
      if (result.win && !bossRushCleared.includes(b.bossId)) { setBossRushCleared(function(prev){return [...prev, b.bossId];}); const _bd = BOSS_RUSH_BOSSES.find(x => x.id === b.bossId); const _rw = (_bd && _bd.reward) || 1000; setJade(function(j){return j + _rw;}); flash("Boss Rush concluido! +" + _rw + "💎", C.gold); } else if (result.win) { flash("Boss ja foi derrotado — sem recompensa extra.", C.mute); } else { flash("Voce foi derrotado no Boss Rush...", C.bad); }
    }
  }

  if (!loaded) return <div style={{ minHeight: "100vh", background: C.bg0, color: C.mute, display: "flex", alignItems: "center", justifyContent: "center" }}>Sincronizando ressonância…</div>;

  const nav = [["home", "Portal", "✦"], ["gacha", "Invocar", "🎴"], ["roster", "Elenco", "👥"], ["farm", "Farm", "🌱"], ["tower", "Torre", "🗼"], ["darktower", "T. Sombria", "🌑"], ["weekly", "Boss", "👹"], ["coop", "Co-op", "🛰️"], ["relics", "Relíquias", "💠"], ["loja", "Loja", "🛒"], ["correio", "Correio", "📬"], ["social", "Social", "🤝"], ...(draftActive ? [["draft", "Catacumba", "🎲"]] : []), ["roleta", "Pacto", "🎰"], ["espiral", "Espiral", "🌀"], ["abismo", "Abismo", "🕳️"], ["roteiro", "Roteiro", "📖"], ["wiki", "Wiki", "📚"], ["tierlist", "Tier List", "📊"], ["novidades", "Novidades", "🆕"], ...(isAdmin ? [["admin", "Admin", "🛠️"]] : [])];

  const needsNick = loaded && (!playerName || playerName === "Pioneiro");

  return (
    <ImgCtx.Provider value={images}>
      <FontInject />
      {needsNick && <NicknameModal onSave={(nick) => setPlayerName(nick)} />}
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
              <Res icon="🔷" v={relicMats} color="#60c8ff" itemId="item_relic_mat" />
              <Res icon="⚡" v={`${stamina}/320`} color={C.good} />
              <button onClick={onLogout} title={email} className="flex items-center gap-1" style={{ background: C.panelHi, padding: "4px 10px", borderRadius: 99, border: `1px solid ${C.line}`, color: C.mute, fontWeight: 700, fontSize: 13 }}>
                {isAdmin && <span style={{ color: C.gold }}>👑</span>}⎋ Sair
              </button>
            </div>
          </div>
        </div>

        <div style={{ maxWidth: 1000, margin: "0 auto", padding: battle ? "0" : "16px 14px 110px" }}>
          {battle ? (
            <Battle key={battle._bid}
              team={battle.customTeam || team} ownedMap={battle.draftOwnedMap || ownedMap} encounter={battle.encounter} ally={battle.ally} context={battle.context}
              onEnd={onBattleEnd} onRetry={() => setBattle(battle)}
              onNext={battle.context === "tower" ? advanceTowerFloor
                : battle.context === "darktower" ? advanceDarkTowerFloor
                : null}
              flash={flash} />
          ) : pendingBoss ? (
            <BossRushTeamSelect boss={BOSS_RUSH_BOSSES.find(function(b){return b.id===pendingBoss;})} owned={owned} defaultTeam={team} images={images} onCancel={function(){setPendingBoss(null);}} onConfirm={function(t){launchBossRush(pendingBoss,t);}} flash={flash} />
          ) : (
            <>
              {screen === "home" && <Home email={email} isAdmin={isAdmin} playerName={playerName} setPlayerName={setPlayerName} owned={owned} setScreen={setScreen} setJade={setJade} setCharTickets={setCharTickets} setStandardTickets={setStandardTickets} setWeaponTickets={setWeaponTickets} flash={flash} towerCleared={towerCleared} bossRushCleared={bossRushCleared} startBossRush={startBossRush} images={images} setImages={setImages} />}
              {screen === "social" && <Social email={email} flash={flash} />}
              {screen === "gacha" && <Gacha doPull={doPull} pity={pity} jade={jade} chronicles={chronicles} charTickets={charTickets} weaponTickets={weaponTickets} standardTickets={standardTickets} featuredChar={featuredChar} setFeaturedChar={setFeaturedChar} featuredWeapon={featuredWeapon} setFeaturedWeapon={setFeaturedWeapon} pullHistory={pullHistory} owned={owned} ownedWeapons={ownedWeapons} />}
              {screen === "roster" && <Roster owned={owned} ownedWeapons={ownedWeapons} relicInv={relicInv} setOwnedField={setOwnedField} levelUp={levelUp} ascendChar={ascendChar} ascMats={ascMats} jade={jade} isAdmin={isAdmin} expItems={expItems} bossMats={bossMats} traceLevelUp={traceLevelUp} unlockTraceNode={unlockTraceNode} unlockSpecialTrace={unlockSpecialTrace} publish={async (o) => { await publishChar(playerName, o); flash("Publicado no Co-op global", C.good); }} onUpgradeRelic={onUpgradeRelic} weaponLevelUp={weaponLevelUp} weaponMats={weaponMats} skillMats={skillMats} tagMats={tagMats} team={team} setTeam={setTeam} teamPresets={teamPresets} setTeamPresets={setTeamPresets} startTest={startTest} flash={flash} />}
              {screen === "farm" && <Farm stamina={stamina} start={startFarm} expItems={expItems} startTagDungeon={startTagDungeon} tagMats={tagMats} weaponMats={weaponMats} skillMats={skillMats} startRelicDungeon={startRelicDungeon} startRotatingRelicDungeon={startRotatingRelicDungeon} dailyClaimedAt={dailyClaimedAt} weeklyClaimedAt={weeklyClaimedAt} claimDaily={claimDaily} claimWeekly={claimWeekly} />}
              {screen === "tower" && <Tower towerCleared={towerCleared} towerClaimed={towerClaimed} start={startTower} team={team} flash={flash} />}
              {screen === "darktower" && <DarkTowerScreen darkTowerCleared={darkTowerCleared} darkTowerClaimed={darkTowerClaimed} start={startDarkTower} team={team} flash={flash} />}
              {screen === "weekly" && <WeeklyBoss start={startWeekly} stamina={stamina} bossMats={bossMats} lastWeeklyBoss={lastWeeklyBoss} startAscension={startAscension} ascMats={ascMats} />}
              {screen === "coop" && <Coop team={team} ownedMap={ownedMap} stamina={stamina} setStamina={setStamina} setRelicInv={setRelicInv} setRelicMats={setRelicMats} flash={flash} setBattle={setBattle} />}
              {screen === "relics" && <RelicsScreen relicInv={relicInv} setRelicInv={setRelicInv} owned={owned} setRelicMats={setRelicMats} flash={flash} />}
              {screen === "loja" && <Loja chronicles={chronicles} setChronicles={setChronicles} expItems={expItems} setExpItems={setExpItems} weaponMats={weaponMats} setWeaponMats={setWeaponMats} skillMats={skillMats} setSkillMats={setSkillMats} ascMats={ascMats} setAscMats={setAscMats} bossMats={bossMats} setBossMats={setBossMats} relicMats={relicMats} setRelicMats={setRelicMats} stamina={stamina} setStamina={setStamina} shopPurchases={shopPurchases} setShopPurchases={setShopPurchases} shopResetAt={shopResetAt} setShopResetAt={setShopResetAt} owned={owned} setOwned={setOwned} tagMats={tagMats} setTagMats={setTagMats} flash={flash} isAdmin={isAdmin} />}
              {screen === "correio" && <Correio mailClaimed={mailClaimed} setMailClaimed={setMailClaimed} mailIniciante={mailIniciante} setMailIniciante={setMailIniciante} mail2Claimed={mail2Claimed} claimMail2Reward={claimMail2Reward} mail3Claimed={mail3Claimed} mail3CharPicked={mail3CharPicked} claimMail3Reward={claimMail3Reward} mail4Claimed={mail4Claimed} claimMail4Reward={claimMail4Reward} mail5Claimed={mail5Claimed} claimMail5Reward={claimMail5Reward} mail6Claimed={mail6Claimed} claimMail6Reward={claimMail6Reward} mail7Claimed={mail7Claimed} claimMail7Reward={claimMail7Reward} setJade={setJade} setExpItems={setExpItems} setWeaponMats={setWeaponMats} setRelicMats={setRelicMats} setAscMats={setAscMats} playerName={playerName} towerTop1Claimed={towerTop1Claimed} claimTop1Reward={claimTop1Reward} flash={flash} owned={owned} />}
              {screen === "draft" && (draftActive ? <DraftDungeon draftRoomCleared={draftRoomCleared} draftClaimedGems={draftClaimedGems} draftBoons={draftBoons} setDraftBoons={setDraftBoons} startRoom={startDraftRoom} flash={flash} team={team} ownedMap={ownedMap} owned={owned} /> : <Empty msg="A Catacumba do Rascunho não está ativa no momento." />)}
              {screen === "novidades" && <UpdateLog setScreen={setScreen} draftActive={draftActive} />}
              {screen === "roleta" && <RouletteEvent jade={jade} setJade={setJade} rouletteCleared={rouletteCleared} setRouletteCleared={setRouletteCleared} nextRouletteClaimAt={nextRouletteClaimAt} setNextRouletteClaimAt={setNextRouletteClaimAt} />}
              {screen === "abismo" && <AbismoDados run={abismoRun} setRun={setAbismoRun} frags={abismoFrags} setFrags={setAbismoFrags} meta={abismoMeta} setMeta={setAbismoMeta} firstClears={abismoFirstClears} weekly={abismoWeekly} owned={owned} ownedMap={ownedMap} images={images} startAbismo={startAbismo} abismoBattle={abismoBattle} abismoCashout={abismoCashout} flash={flash} />}
              {screen === "espiral" && <Espiral owned={owned} team={team} ownedMap={ownedMap} espiralClearedAt={espiralClearedAt} espiralWeekSeed={espiralWeekSeed} espiralWeaknesses={espiralWeaknesses} startEspiral={startEspiral} images={images} flash={flash} />}
                {screen === "roteiro" && <Roteiro />}
                {screen === "wiki" && <WikiScreen />}
                {screen === "tierlist" && <TierListScreen tierList={tierList} />}
              {screen === "admin" && (isAdmin ? <Admin images={images} setImages={setImages} tierList={tierList} setTierList={setTierList} flash={flash} isAdmin={isAdmin} draftActive={draftActive} setDraftActive={setDraftActive} /> : <Empty msg="Acesso restrito ao administrador." />)}
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
            🏆 RANKING — {BOSS_RUSH_BOSSES.find(b => b.id === bossId)?.name || bossId}
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
          <div style={{ fontWeight: 700, marginBottom: 10 }}>Eventos Ativos</div>
          <div className="flex flex-col gap-3">
            <div style={{ background:"linear-gradient(135deg,#1a0d3a,#0f1a2e)",border:"1px solid #473c80",borderRadius:14,overflow:"hidden" }}>
              <div style={{ background:"linear-gradient(90deg,#6B3CF699,#0076FF44)",padding:"10px 14px",display:"flex",alignItems:"center",gap:10 }}>
                <span style={{ fontSize:22 }}>🎴</span>
                <div><div style={{ fontWeight:800,fontSize:14 }}>Banner de Personagem — Limitado</div><div style={{ fontSize:11,color:C.mute }}>Evento de Invocacao</div></div>
                <div style={{ marginLeft:"auto",background:"#6B3CF633",border:"1px solid #6B3CF688",color:"#B98BFF",borderRadius:99,padding:"2px 10px",fontSize:11,fontWeight:700 }}>ATIVO</div>
              </div>
              <div style={{ padding:"10px 14px" }}>
                <div style={{ display:"flex",gap:8,marginBottom:8,flexWrap:"wrap" }}>
                  {[{n:"Omegamon Zwart D",ico:"🛡️",el:"#A6E22E"},{n:"Soi Fon",ico:"🦋",el:"#74E8A6"}].map((c,i)=>(
                    <div key={i} style={{ display:"flex",alignItems:"center",gap:6,background:c.el+"1a",border:"1px solid "+c.el+"44",borderRadius:10,padding:"5px 10px" }}>
                      <span style={{ fontSize:18 }}>{c.ico}</span>
                      <span style={{ fontWeight:700,fontSize:12,color:c.el }}>{c.n}</span>
                      <span style={{ fontSize:10,color:C.gold,fontWeight:800 }}>5★</span>
                    </div>
                  ))}
                </div>
                <div style={{ fontSize:12,color:C.mute,lineHeight:1.5 }}>Taxa de 5★ garantido ao 90º pull (50/50). Rate-up: 50% de chance de cair o personagem em destaque.</div>
              </div>
            </div>
            <div style={{ background:"linear-gradient(135deg,#1a0d3a,#0d1a0d)",border:"1px solid #7B5CF666",borderRadius:14,overflow:"hidden" }}>
              <div style={{ background:"linear-gradient(90deg,#7B5CF699,transparent)",padding:"10px 14px",display:"flex",alignItems:"center",gap:10 }}>
                <span style={{ fontSize:22 }}>🎲</span>
                <div><div style={{ fontWeight:800,fontSize:14 }}>Catacumba do Rascunho</div><div style={{ fontSize:11,color:C.mute }}>Modo Temporario</div></div>
                <div style={{ marginLeft:"auto",background:"#7B5CF633",border:"1px solid #7B5CF688",color:"#B98BFF",borderRadius:99,padding:"2px 10px",fontSize:11,fontWeight:700 }}>ATIVO</div>
              </div>
              <div style={{ padding:"10px 14px" }}>
                <div style={{ fontSize:12,color:C.mute,lineHeight:1.5 }}>Receba personagens aleatorios, colete Bencaos e conquiste 3.000 diamantes. 7 salas progressivas.</div>
                <div style={{ fontFamily:"monospace",fontWeight:800,color:"#B98BFF",fontSize:13,marginTop:6 }}>Encerra em: {formatCountdown(endgameMs)}</div>
              </div>
            </div>
            <div style={{ background:"linear-gradient(135deg,#1a1205,#0f0d1a)",border:"1px solid #F6C95B44",borderRadius:14,overflow:"hidden" }}>
              <div style={{ background:"linear-gradient(90deg,#F6C95B22,transparent)",padding:"10px 14px",display:"flex",alignItems:"center",gap:10 }}>
                <span style={{ fontSize:22 }}>📬</span>
                <div><div style={{ fontWeight:800,fontSize:14 }}>Pacote de Lancamento</div><div style={{ fontSize:11,color:C.mute }}>Recompensa unica de primeiro login</div></div>
                <div style={{ marginLeft:"auto",background:"#F6C95B22",border:"1px solid #F6C95B77",color:C.gold,borderRadius:99,padding:"2px 10px",fontSize:11,fontWeight:700 }}>CORREIO</div>
              </div>
              <div style={{ padding:"10px 14px" }}>
                <div style={{ fontSize:12,color:C.mute,lineHeight:1.5 }}>12.000 diamantes + 200 Lagrimas de XP + 200 Engrenagens + 100 Materias de Reliquia. Acesse o Correio para coletar.</div>
              </div>
            </div>
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
        <Tile t="Torre Estelar" s="200 andares · 78.500💎 totais" e="🗼" onClick={() => setScreen("tower")} />
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
function Farm({ stamina, start, expItems, startTagDungeon, tagMats, weaponMats, skillMats, startRelicDungeon, startRotatingRelicDungeon, dailyClaimedAt, weeklyClaimedAt, claimDaily, claimWeekly }) {
  const dailyReady = Date.now() - (dailyClaimedAt || 0) > 24 * 3600 * 1000;
  const weeklyReady = Date.now() - (weeklyClaimedAt || 0) > 7 * 24 * 3600 * 1000;
  const featSet = featuredFarmSet();
  return <div className="flex flex-col gap-4">
    <Panel glow="#9be7a0">
      <div className="flex items-center justify-between" style={{ gap: 10 }}>
        <div><div style={{ ...ORB, fontWeight: 800, fontSize: 18 }}>🌱 Domínios de Crescimento</div>
          <div style={{ color: C.mute, fontSize: 13, marginTop: 2 }}>Enfrente mini-dungeons e colete 📘 Lácrimas de XP para subir o nível dos personagens.</div></div>
        <Res icon="📘" v={expItems} color="#9be7a0" itemId="item_exp" />
      </div>
    </Panel>

    <Panel glow="#F6C95B">
      <div style={{ ...ORB, fontWeight: 800, fontSize: 18 }}>📅 Recompensas Diária / Semanal</div>
      <div style={{ color: C.mute, fontSize: 12, marginTop: 2 }}>Materiais garantidos, sem precisar farmar rastro no braço. Grátis, sem custo de Stamina.</div>
      <div className="flex flex-col gap-2 mt-3">
        <div className="flex items-center justify-between" style={{ background: C.panelHi, borderRadius: 10, padding: "10px 14px" }}>
          <div><b style={{ fontSize: 13 }}>Diária</b><div style={{ fontSize: 11, color: C.mute }}>+10 ⚙️ · +10 💠 · +8 🔷 · +2 de uma tag aleatória</div></div>
          <Btn kind={dailyReady ? "primary" : "soft"} disabled={!dailyReady} onClick={claimDaily} style={{ padding: "6px 14px" }}>{dailyReady ? "Resgatar" : "Feito ✓"}</Btn>
        </div>
        <div className="flex items-center justify-between" style={{ background: C.panelHi, borderRadius: 10, padding: "10px 14px" }}>
          <div><b style={{ fontSize: 13 }}>Semanal</b><div style={{ fontSize: 11, color: C.mute }}>+40 ⚙️ · +40 💠 · +4 🔮 · +4 🔶 · +30 🔷 · +3 de cada tag</div></div>
          <Btn kind={weeklyReady ? "primary" : "soft"} disabled={!weeklyReady} onClick={claimWeekly} style={{ padding: "6px 14px" }}>{weeklyReady ? "Resgatar" : "Feito ✓"}</Btn>
        </div>
      </div>
    </Panel>

    {startRotatingRelicDungeon && <Panel glow={RELIC_SETS[featSet]?.color || "#B98BFF"}>
      <div className="flex items-center gap-2"><span style={{ fontSize: 22 }}>🔄</span><b style={{ ...ORB, fontSize: 18, color: RELIC_SETS[featSet]?.color }}>Domínio Rotativo</b></div>
      <div style={{ fontSize: 12, color: C.mute, marginTop: 4 }}>Muda de conjunto toda semana. Esta semana: <b style={{ color: RELIC_SETS[featSet]?.color }}>{featSet}</b> {RELIC_EMOJI[featSet]} — com <Glow color={RELIC_SETS[featSet]?.color}>buff de drop</Glow> (2-3 relíquias garantidas).</div>
      <div style={{ fontSize: 11, color: C.mute, marginTop: 4 }}>{RELIC_SETS[featSet]?.d2}</div>
      <Btn kind={stamina < 35 ? "soft" : "primary"} disabled={stamina < 35} style={{ marginTop: 10 }} onClick={startRotatingRelicDungeon}>35⚡ Entrar</Btn>
    </Panel>}

    {FARM_STAGES.map((st) => <Panel key={st.id}>
      <div className="flex items-center justify-between" style={{ gap: 10 }}>
        <div><b>{st.name}</b><div style={{ color: C.mute, fontSize: 12 }}>Nv {st.level} · {st.count} inimigos{st.boss ? " · Elite" : ""} · recompensa +{st.exp} 📘</div>{st.desc && <div style={{ color: C.dim, fontSize: 11, marginTop: 2 }}>{st.desc}</div>}</div>
        <Btn kind={stamina < st.cost ? "soft" : "primary"} disabled={stamina < st.cost} onClick={() => start(st)}>{st.cost}⚡ Entrar</Btn>
      </div>
    </Panel>)}

    <Panel glow="#00E5CC" style={{ position:"relative", overflow:"hidden" }}>
      <style dangerouslySetInnerHTML={{__html:"@keyframes omgPulse{0%,100%{opacity:.55}50%{opacity:1}} @keyframes omgGrid{from{background-position:0 0}to{background-position:40px 40px}}"}} />
      <div style={{ position:"absolute",inset:0,backgroundImage:"linear-gradient(#00E5CC09 1px,transparent 1px),linear-gradient(90deg,#00E5CC09 1px,transparent 1px)",backgroundSize:"40px 40px",animation:"omgGrid 5s linear infinite",pointerEvents:"none" }} />
      <div style={{ position:"relative" }}>
        <div style={{ display:"flex",alignItems:"center",gap:10,marginBottom:8 }}>
          <span style={{ fontSize:30,animation:"omgPulse 2.2s ease-in-out infinite" }}>☢️</span>
          <div>
            <div style={{ ...ORB,fontWeight:800,fontSize:18,color:"#00E5CC" }}>Rede Corrompida</div>
            <div style={{ fontSize:11,color:"#00E5CC88",fontStyle:"italic" }}>Domínio de Relíquias — Protocolo Ômega</div>
          </div>
        </div>
        <div style={{ fontSize:12,color:C.mute,marginBottom:10,lineHeight:1.5 }}>
          Servidores digitais corrompidos do multiverso. Derrote os guardiões para obter relíquias do set <b style={{color:"#00E5CC"}}>Protocolo Ômega</b> — mecânica única de 3 fases de HP em batalha.
        </div>
        <div style={{ background:"#00E5CC0d",border:"1px solid #00E5CC33",borderRadius:10,padding:"10px 14px",marginBottom:12 }}>
          <div style={{ fontWeight:700,color:"#00E5CC",marginBottom:5,fontSize:12 }}>✦ Bônus — Protocolo Ômega</div>
          <div style={{ fontSize:11,color:C.mute,lineHeight:1.7 }}>
            <span style={{color:"#9be7a0",fontWeight:600}}>2pç:</span> +5% Velocidade e +8% Dano global<br/>
            <span style={{color:"#00E5CC",fontWeight:700}}>4pç — Sistema de Failsafe Digital:</span><br/>
            <span style={{color:"#7CFFB0"}}>  ■ HP ≥ 75% (Supremacia)</span> — +25% ATK, time recebe +15% Dano por 2t<br/>
            <span style={{color:"#FF8C44"}}>  ■ HP 30–74% (Delta)</span> — +20% CRIT Rate, +35% CRIT DMG por 2t<br/>
            <span style={{color:"#FF4444",fontWeight:700}}>  ■ HP &lt; 30% [1× por batalha] (Último Protocolo)</span><br/>
            <span style={{color:"#FF6666",marginLeft:8}}>→ +50% ATK por 3t · Escudo 10% HP ao time · +2 SP</span>
          </div>
        </div>
        <div style={{ display:"flex",flexDirection:"column",gap:8 }}>
          {[{tier:0,cost:30,name:"Rede α — Iniciante",desc:"Servidores básicos. Ideal para iniciar.",badge:"NORMAL",badgeC:"#7CFFB0",drop:"1 relíquia"},{tier:1,cost:45,name:"Rede β — Avançada",desc:"Núcleos corrompidos de alta tensão.",badge:"DIFÍCIL",badgeC:"#FF8C44",drop:"1 relíquia"},{tier:2,cost:60,name:"Rede Ω — Suprema",desc:"Matriz Fantasma. Drop duplo garantido!",badge:"EXTREMO",badgeC:"#FF4444",drop:"2 relíquias"}].map(function(rt){
            const ok = stamina >= rt.cost;
            return (
              <div key={rt.tier} style={{ display:"flex",alignItems:"center",gap:10,background:"#00E5CC08",border:"1px solid #00E5CC22",borderRadius:10,padding:"10px 14px" }}>
                <div style={{ flex:1 }}>
                  <div style={{ display:"flex",alignItems:"center",gap:6,marginBottom:2,flexWrap:"wrap" }}>
                    <span style={{ fontWeight:700,fontSize:13 }}>{rt.name}</span>
                    <span style={{ background:rt.badgeC+"22",color:rt.badgeC,border:"1px solid "+rt.badgeC+"55",borderRadius:6,padding:"1px 7px",fontSize:10,fontWeight:700 }}>{rt.badge}</span>
                    <span style={{ fontSize:10,color:"#00E5CC88" }}>→ {rt.drop}</span>
                  </div>
                  <div style={{ fontSize:11,color:C.mute }}>{rt.desc}</div>
                </div>
                <Btn kind={ok?"primary":"soft"} disabled={!ok} style={{ padding:"6px 16px",fontSize:12,flexShrink:0,background:ok?"linear-gradient(135deg,#00C8B4,#007A6E)":"",border:"none",whiteSpace:"nowrap" }} onClick={function(){ if(startRelicDungeon) startRelicDungeon(rt.tier); }}>{rt.cost}⚡</Btn>
              </div>
            );
          })}
        </div>
      </div>
    </Panel>

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
function useAbsoluteTimer(endTs) {
  const [remaining, setRemaining] = useState(() => Math.max(0, endTs - Date.now()));
  useEffect(() => {
    const id = setInterval(() => setRemaining(Math.max(0, endTs - Date.now())), 1000);
    return () => clearInterval(id);
  }, [endTs]);
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
  const isChar = tab === "char", isStd = tab === "standard", isWeapon = tab === "weapon", isSpecial = tab === "special";
  const ticketCount = isChar ? charTickets : isStd ? standardTickets : isSpecial ? 0 : weaponTickets;
  const ticketIcon = isChar ? "🎴" : isStd ? "🪙" : isSpecial ? "✦" : "🔧";
  const curPity = isChar ? pity.char : isStd ? pity.standard : isSpecial ? (pity.special || 0) : pity.weapon;
  const fc = CHAR_MAP[featuredChar] || CHAR_MAP[DEFAULT_FEATURED_CHAR];
  const fw = WEAPON_MAP[featuredWeapon] || WEAPON_MAP[DEFAULT_FEATURED_WEAPON];
  const cycleChar = (d) => { const i = FEATURED_LIMITEDS.indexOf(featuredChar); setFeaturedChar(FEATURED_LIMITEDS[(i + d + FEATURED_LIMITEDS.length) % FEATURED_LIMITEDS.length]); };
  const cycleWeapon = (d) => { const i = WEAPON_5_IDS.indexOf(featuredWeapon); setFeaturedWeapon(WEAPON_5_IDS[(i + d + WEAPON_5_IDS.length) % WEAPON_5_IDS.length]); };
  const headColor = isWeapon ? "#B98BFF" : isStd ? C.gold : isSpecial ? "#FF5E9E" : ELEMENTS[fc.element].color;
  const arrow = { background: C.panelHi, border: `1px solid ${C.line}`, borderRadius: 8, color: C.text, width: 28, height: 28, fontWeight: 800 };
  const charMs = useBannerTimer("char_" + featuredChar, BANNER_DURATIONS[featuredChar] || (7 * 24 * 60 * 60 * 1000)); // cada personagem tem seu próprio prazo de encerramento
  const weaponMs = useBannerTimer("weapon");
  const specialMs = useAbsoluteTimer(SPECIAL_BANNER_END); // data fixa de verdade — acaba pra todo mundo junto, não reseta por dispositivo
  const specialExpired = specialMs <= 0;
  const bannerMs = isChar ? charMs : isWeapon ? weaponMs : isSpecial ? specialMs : null;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-2" style={{ flexWrap: "wrap" }}>
        <TabBtn active={isChar} onClick={() => setTab("char")}>Evento 🎴</TabBtn>
        {!specialExpired && <TabBtn active={isSpecial} onClick={() => setTab("special")}>Especial ✦</TabBtn>}
        <TabBtn active={isStd} onClick={() => setTab("standard")}>Permanente 🪙</TabBtn>
        <TabBtn active={isWeapon} onClick={() => setTab("weapon")}>Armas 🔧</TabBtn>
      </div>

      <Panel glow={headColor} style={{ position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", inset: 0, background: `radial-gradient(520px 240px at 82% 18%, ${headColor}26, transparent)` }} />
        <div style={{ position: "relative" }}>
          <div style={{ fontSize: 12, letterSpacing: 2, color: C.mute }}>{isChar ? "BANNER DE EVENTO · rate-up 50/50" : isStd ? "BANNER PERMANENTE · pool padrão" : isSpecial ? "✦ BANNER ESPECIAL LIMITADO · 3 DIAS · SEM 50/50" : "BANNER DE ARMAS · sem 50/50"}</div>
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

          {isSpecial && (specialExpired ? (
            <div style={{ padding: "16px 0", textAlign: "center", color: C.mute }}>O Banner Especial encerrou. Volte na Loja/Roteiro pra saber do próximo!</div>
          ) : <>
            <div style={{ ...ORB, fontSize: 20, fontWeight: 800, margin: "4px 0 10px" }}>Convergência Estelar <Rarity n={5} /></div>
            <PoolRow ids={SPECIAL_BANNER_CHARS} ownedSet={ownedSet} />
            <div style={{ fontSize: 13, color: C.mute, marginTop: 10 }}>Evento por tempo limitado — <b style={{ color: "#FF5E9E" }}>3 dias corridos</b>, a mesma data pra todo mundo. Todo 5★ deste banner sai <b>aleatoriamente entre os 5 personagens acima</b> (sem 50/50, sem repetir taxa).</div>
          </>)}

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

          {(!isSpecial || !specialExpired) && <>
          <div style={{ marginTop: 12 }}>
            <div style={{ fontSize: 12, color: C.mute }}>Garantia: 5★ em até 90 · sem 5★ há <b style={{ color: C.gold }}>{curPity}</b>/90{isChar ? " · todo 5★ é o personagem destaque (sem 50/50)" : isSpecial ? " · todo 5★ vem do pool especial (sem 50/50)" : ""}</div>
            <Bar value={curPity} max={90} color={C.gold} />
          </div>
          <div className="flex gap-2 mt-4">
            <Btn disabled={isSpecial && specialExpired} onClick={() => doPull(tab, 1)}>Invocar x1</Btn>
            <Btn kind="soft" disabled={isSpecial && specialExpired} onClick={() => doPull(tab, 10)}>Invocar x10</Btn>
          </div>
          <div style={{ fontSize: 11, color: C.mute, marginTop: 8 }}>{isSpecial ? "160💎 por puxada (sem bilhete próprio)" : `Bilhete ${ticketIcon} ou 160💎 por puxada`} · você tem {!isSpecial && <><b style={{ color: C.text }}>{ticketCount}</b> {ticketIcon}, </>}<b style={{ color: C.text }}>{jade}</b>💎 e <b style={{ color: C.text }}>{chronicles}</b>📜</div>
          </>}
        </div>
      </Panel>

      {isChar && <Panel><b>Pool padrão (perdeu o 50/50)</b><div style={{ marginTop: 8 }}><PoolRow ids={STANDARD_5} ownedSet={ownedSet} /></div></Panel>}

      <Panel>
        <b>Taxas</b>
        <div style={{ fontSize: 13, color: C.mute, marginTop: 6, lineHeight: 1.7 }}>
          5★: 0,6% (sobe a partir da 74ª, garantido na 90ª) · 4★: 5,1% · resto vira Crônicas (+1📜).
          {isChar ? " Evento: 50/50 com garantia — perdeu, o próximo 5★ é o destaque. Use ‹ › para escolher qual limitado fica em destaque." : isStd ? " Permanente: sem 50/50, sai do pool padrão." : isSpecial ? " Especial Limitado: sem 50/50 — todo 5★ sai aleatoriamente entre os 5 personagens do evento. Banner acaba de vez em 3 dias." : " Armas: sem 50/50. Use ‹ › para escolher a arma em destaque."}
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
function Roster({ owned, ownedWeapons, relicInv, setOwnedField, levelUp, ascendChar, ascMats, jade, isAdmin, expItems, bossMats, traceLevelUp, unlockTraceNode, unlockSpecialTrace, publish, onUpgradeRelic, weaponLevelUp, weaponMats, skillMats, tagMats, team, setTeam, teamPresets, setTeamPresets, startTest, flash }) {
  const [sel, setSel] = useState(null);
  const [presetName, setPresetName] = useState("");
  const [showPresets, setShowPresets] = useState(false);
  if (!owned.length) return <Empty msg="Sem personagens. Invoque no banner!" />;
  if (sel) { const o = owned.find((x) => x.id === sel); if (!o) { setSel(null); return null; } return <CharDetail o={o} back={() => setSel(null)} ownedWeapons={ownedWeapons} relicInv={relicInv} setOwnedField={setOwnedField} levelUp={levelUp} ascendChar={ascendChar} ascMats={ascMats} jade={jade} isAdmin={isAdmin} expItems={expItems} bossMats={bossMats} traceLevelUp={traceLevelUp} unlockTraceNode={unlockTraceNode} unlockSpecialTrace={unlockSpecialTrace} publish={publish} onUpgradeRelic={onUpgradeRelic} weaponLevelUp={weaponLevelUp} weaponMats={weaponMats} skillMats={skillMats} tagMats={tagMats} />; }

  const toggle = (id) => setTeam((t) => t.includes(id) ? t.filter((x) => x !== id) : t.length < 4 ? [...t, id] : t);
  function savePreset() {
    const name = presetName.trim() || `Time ${teamPresets.length + 1}`;
    if (!team.length) { flash && flash("Monte uma equipe antes de salvar", C.bad); return; }
    setTeamPresets((p) => [...p, { name, ids: [...team] }]);
    setPresetName("");
    flash && flash(`Preset "${name}" salvo!`, C.good);
  }
  function loadPreset(idx) { const p = teamPresets[idx]; if (p) { setTeam(p.ids.filter((id) => owned.some((o) => o.id === id))); flash && flash(`Preset "${p.name}" carregado`, C.good); } }
  function deletePreset(idx) { setTeamPresets((p) => p.filter((_, i) => i !== idx)); }

  return (
    <div className="flex flex-col gap-3">
      <Panel glow={C.gold}>
        <div className="flex items-center justify-between">
          <b>⚔️ Equipe atual ({team.length}/4)</b>
          <button onClick={() => setShowPresets((v) => !v)} style={{ fontSize: 12, color: C.gold, fontWeight: 700 }}>{showPresets ? "fechar presets ✕" : "📋 Presets"}</button>
        </div>
        <div className="flex gap-2 mt-2">{[0, 1, 2, 3].map((i) => { const id = team[i], def = id && CHAR_MAP[id]; return (
          <div key={i} onClick={() => id && toggle(id)} style={{ flex: 1, border: `1px dashed ${C.line}`, borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", minHeight: 64, cursor: id ? "pointer" : "default" }}>
            {def ? <div style={{ textAlign: "center" }}><div style={{ fontSize: 22 }}>{def.avatar}</div><div style={{ fontSize: 9, color: ELEMENTS[def.element].color }}>{ROLES[def.role].label}</div></div> : <span style={{ color: C.mute, fontSize: 11 }}>vazio</span>}
          </div>); })}</div>
        <div className="flex gap-2 mt-3" style={{ flexWrap: "wrap" }}>
          <Btn disabled={!team.length} onClick={() => team.length ? startTest() : flash("Monte uma equipe", C.bad)} style={{ padding: "6px 14px", fontSize: 12 }}>Batalha de teste ⚔️</Btn>
          <Btn kind="soft" onClick={() => setTeam([])} style={{ padding: "6px 14px", fontSize: 12 }}>Limpar</Btn>
        </div>
        <div style={{ fontSize: 11, color: C.mute, marginTop: 8 }}>Toque no ⚔️ de um personagem abaixo pra equipar/desequipar. Toque num slot preenchido acima pra remover.</div>
        {showPresets && (
          <div style={{ borderTop: `1px solid ${C.line}`, marginTop: 12, paddingTop: 12 }}>
            <b style={{ fontSize: 13 }}>Team Presets</b>
            <div className="flex gap-2 mt-2">
              <input value={presetName} onChange={(e) => setPresetName(e.target.value)} placeholder="nome do preset" style={{ flex: 1, background: C.panel, border: `1px solid ${C.line}`, borderRadius: 8, padding: "6px 10px", fontSize: 12, color: C.text }} />
              <Btn onClick={savePreset} style={{ padding: "6px 12px", fontSize: 12 }}>💾 Salvar atual</Btn>
            </div>
            {teamPresets.length === 0 ? <div style={{ fontSize: 12, color: C.mute, marginTop: 8 }}>Nenhum preset salvo ainda.</div> :
              <div className="flex flex-col gap-2 mt-2">
                {teamPresets.map((p, i) => (
                  <div key={i} className="flex items-center gap-2" style={{ background: C.panelHi, border: `1px solid ${C.line}`, borderRadius: 8, padding: "6px 10px" }}>
                    <div style={{ flex: 1, fontSize: 12, fontWeight: 700 }}>{p.name}</div>
                    <div className="flex gap-1">{p.ids.map((id) => <span key={id} style={{ fontSize: 16 }}>{CHAR_MAP[id]?.avatar || "❓"}</span>)}</div>
                    <button onClick={() => loadPreset(i)} style={{ fontSize: 11, color: C.gold, fontWeight: 700 }}>usar</button>
                    <button onClick={() => deletePreset(i)} style={{ fontSize: 11, color: C.bad }}>excluir</button>
                  </div>
                ))}
              </div>}
          </div>
        )}
      </Panel>
      <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fill,minmax(150px,1fr))" }}>
        {owned.map((o) => {
          const def = CHAR_MAP[o.id]; if (!def) return null; const el = ELEMENTS[def.element]; const inTeam = team.includes(o.id);
          return (
            <div key={o.id} className="text-left active:scale-95 transition" style={{ position: "relative" }}>
              <Panel glow={inTeam ? C.gold : def.rarity === 5 ? C.gold : null} style={{ padding: 12, border: inTeam ? `2px solid ${C.gold}` : undefined, cursor: "pointer" }} onClick={() => setSel(o.id)}>
                <div className="flex items-center gap-2"><Avatar ch={def} size={48} /><div style={{ overflow: "hidden" }}><div style={{ fontWeight: 800, fontSize: 14, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{def.name}</div><Rarity n={def.rarity} /></div></div>
                <div className="flex items-center justify-between mt-2" style={{ fontSize: 11, color: C.mute }}><span>Nv {o.level}</span><span style={{ color: el.color }}>{el.glyph}</span>{o.eidolon > 0 && <span style={{ color: C.gold }}>E{o.eidolon}</span>}</div>
              </Panel>
              <button onClick={(e) => { e.stopPropagation(); toggle(o.id); }} title={inTeam ? "Remover da equipe" : "Equipar na equipe"}
                style={{ position: "absolute", top: 6, right: 6, width: 26, height: 26, borderRadius: 99, background: inTeam ? C.gold : "#00000088", color: inTeam ? "#1a1000" : "#fff", border: `1px solid ${inTeam ? C.gold : C.line}`, fontSize: 13, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800 }}>⚔️</button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function CharDetail({ o, back, ownedWeapons, relicInv, setOwnedField, levelUp, ascendChar, ascMats, jade, isAdmin, expItems, bossMats, traceLevelUp, unlockTraceNode, unlockSpecialTrace, publish, onUpgradeRelic, weaponLevelUp, weaponMats, skillMats, tagMats }) {
  const def = CHAR_MAP[o.id]; const [tab, setTab] = useState("status");
  if (!def) {
    // Corrige crash de tela branca: personagem com id desconhecido/desatualizado (save antigo ou fora de sincronia)
    return (
      <div className="flex flex-col gap-4">
        <button onClick={back} style={{ color: C.mute, fontSize: 13, textAlign: "left" }}>‹ voltar ao elenco</button>
        <Panel glow={C.bad}>
          <div style={{ fontWeight: 800, fontSize: 16, color: C.bad }}>⚠️ Não foi possível carregar este personagem</div>
          <div style={{ fontSize: 13, color: C.mute, marginTop: 6 }}>O ID "{o.id}" não existe mais nos dados do jogo (provavelmente de uma versão antiga do save). Isso não deveria travar o app — volte ao Elenco e tente outro personagem. Se isso aconteceu com vários personagens de uma vez, me avisa que reviso o save.</div>
        </Panel>
      </div>
    );
  }
  const oc = normChar(o);
  const stats = computeStats(o); const el = ELEMENTS[def.element]; const nodes = constellationNodes(def);
  const pass = passiveOf(def); const sts = specialTraces(def);
  const invWeapons = ownedWeapons
    .filter((w, i, arr) => arr.findIndex((x) => x.id === w.id) === i)
    .map((w) => WEAPON_MAP[w.id] ? { ...WEAPON_MAP[w.id], _storedLv: w.lv || 1 } : null)
    .filter(Boolean);
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
          <St k="CRIT" v={stats.critRate.toFixed(1) + "%"} /><St k="CRIT DMG" v={stats.critDmg.toFixed(1) + "%"} /><St k="Bônus Elemental" v={(stats.elemBonus||0).toFixed(1) + "%"} /><St k="Bônus de Dano" v={stats.dmgBonus.toFixed(1) + "%"} /><St k="Cura/Escudo" v={stats.healBonus.toFixed(1) + "%"} />
          <St k="Regen de Energia" v={(stats.energyRegen || 0).toFixed(1) + "%"} /><St k="Penetração de DEF" v={(stats.defPen || 0).toFixed(1) + "%"} /><St k="Dano de DoT" v={(stats.dotDmg || 0).toFixed(1) + "%"} /><St k="Efeito de Perfuração" v={(stats.breakEffect || 0).toFixed(1) + "%"} /><St k="Eficiência de Perfuração" v={(stats.breakEff || 0).toFixed(1) + "%"} /><St k="Energia Máx" v={stats.energyMax} />
        </div>
        {Object.entries(stats.elem || {}).some(([, v]) => v > 0) && <div style={{ fontSize: 11, color: C.mute, marginTop: 8 }}>Dano elemental: {Object.entries(stats.elem).filter(([, v]) => v > 0).map(([k, v]) => `${k} +${v.toFixed(1)}%`).join(" · ")}</div>}
        <div style={{ borderTop: `1px solid ${C.line}`, marginTop: 12, paddingTop: 12 }}><b style={{ fontSize: 13 }}>Habilidades</b><SkillList def={def} stats={stats} /></div>
        {def.id === "agumon" && <div style={{ borderTop: `1px solid ${C.line}`, marginTop: 12, paddingTop: 12 }}>
          <b style={{ fontSize: 13 }}>🧬 Formas de Digievolução</b>
          <div style={{ fontSize: 11, color: C.mute, margin: "4px 0 10px" }}>Em batalha, use o botão 🧬 Digievoluir no turno do Agumon. Cada forma exige TamerSP e uma janela térmica exata de Calor. Você pode enviar uma foto diferente para cada forma no Admin de imagens usando os IDs: <b>agumon</b>, <b>agumon_greymon</b>, <b>agumon_metalgreymon</b>, <b>agumon_wargreymon</b>.</div>
          {AGU_ORDER.map(fid => { const F = AGU_FORMS[fid]; return (
            <div key={fid} style={{ border: `1px solid ${C.line}`, borderRadius: 14, padding: 10, marginBottom: 8, background: C.panelHi }}>
              <div className="flex items-center gap-3">
                <Avatar ch={{ id: F.imgId, element: "Fogo", avatar: F.emoji }} size={46} ring="#FFB74D" />
                <div style={{ flex: 1 }}>
                  <div style={{ ...ORB, fontWeight: 800, fontSize: 13, color: "#FFB74D" }}>{F.emoji} {F.name} <span style={{ fontSize: 10, color: C.mute }}>· {F.stage}</span></div>
                  {F.reqTxt && <div style={{ fontSize: 10, color: "#FF9E45" }}>Requisito: {F.reqTxt}</div>}
                </div>
              </div>
              <div style={{ fontSize: 11, color: C.good, marginTop: 6 }}>▲ {F.buffs}</div>
              <div style={{ marginTop: 6 }}>
                {F.skills.map(([n, d], i) => <div key={i} style={{ fontSize: 11, marginBottom: 4 }}><b style={{ color: C.text }}>{["⚔️", "✦", "💥"][i]} {n}:</b> <span style={{ color: C.mute }}>{d}</span></div>)}
              </div>
            </div>); })}
        </div>}
      </Panel>}
      {tab === "trace" && <Panel>
        <p style={{ fontSize: 13, color: C.mute, marginBottom: 10 }}>Rastros: subir Básico/Habilidade/Ultimate gasta 💠 Cristais de Habilidade (Dungeons de Tag). Os Nós de Atributo gastam 1 🔮 Núcleo + o material da Dungeon da tag do personagem. Os 3 Rastros Especiais usam 🔮 Núcleos de Vestígio (Boss Semanal).</p>
        <b style={{ fontSize: 13 }}>Níveis de Habilidade</b>
        <div className="flex flex-col gap-2 mt-2">
          {[["basic", "Ataque Básico", skillNamesOf(def.id)[0]], ["skill", "Habilidade", skillNamesOf(def.id)[1]], ["ult", "Ultimate", skillNamesOf(def.id)[2]]].map(([key, lbl, nm]) => { const lvl = oc.traces[key] || 1; const max = lvl >= TRACE_MAX; return (
            <div key={key} className="flex items-center justify-between" style={{ background: C.panelHi, borderRadius: 10, padding: "8px 10px" }}>
              <div><div style={{ fontWeight: 700, fontSize: 13 }}>{lbl} <span style={{ color: C.mute, fontWeight: 400 }}>· {nm}</span></div><div style={{ fontSize: 11, color: C.mute }}>Nv {lvl}/{TRACE_MAX} · {key === "basic" ? "dano" : (key === "ult" && (def.id === "sakura" || def.id === "usopp")) ? "dano/cura" : def.id === "omegamon" ? "dano/escudo" : def.role === "healer" ? "cura" : def.role === "shield" ? "escudo" : "dano"} +{Math.round((traceMul(lvl) - 1) * 100)}%</div></div>
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
        <div className="flex items-center justify-between mb-2"><b>Arma equipada</b>{o.weapon && <Btn kind="danger" style={{ padding: "4px 10px" }} onClick={() => { if (o.weapon) setOwnedWeapons((p) => p.map((w) => w.id === o.weapon ? { ...w, lv: o.weaponLv || 1 } : w)); setOwnedField(o.id, { weapon: null }); }}>Remover</Btn>}</div>
        {o.weapon ? (() => {
          const curLv = o.weaponLv || 1;
          const curTier = Math.min(3, Math.floor((curLv - 1) / 20));
          const TLBL = ["Nv 1-20","Nv 21-40","Nv 41-60","Nv 61-80"];
          const TCLR = ["#7CFFB0","#FFD95F","#FF8C44","#FF4466"];
          const toMax = curLv < WEAPON_MAX_LEVEL ? weaponTotalCostToMax(curLv) : 0;
          const cost = weaponCost(curLv);
          return <>
            <WeaponRow w={WEAPON_MAP[o.weapon]} active lv={curLv} />
            <div style={{ background: C.panelHi, border: `1px solid ${C.line}`, borderRadius: 12, padding: "12px 14px", marginTop: 8 }}>
              <div className="flex items-center justify-between" style={{ marginBottom: 10 }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700 }}>Aprimorar Arma</div>
                  <div style={{ fontSize: 10, color: C.mute, marginTop: 2 }}>
                    <b style={{ color: C.gold }}>{weaponMats}</b> engrenagens disponiveis
                    {curLv < WEAPON_MAX_LEVEL && <span> · <b style={{ color: toMax > weaponMats ? C.bad : C.good }}>{toMax}</b> para maximizar</span>}
                  </div>
                </div>
                <Btn kind={curLv >= WEAPON_MAX_LEVEL ? "ghost" : "primary"} disabled={curLv >= WEAPON_MAX_LEVEL} style={{ padding: "6px 14px" }} onClick={() => weaponLevelUp(o.id)}>
                  {curLv >= WEAPON_MAX_LEVEL ? "MAX" : "Up (" + cost.wmat + " engr.)"}
                </Btn>
              </div>
              <div className="grid gap-2" style={{ gridTemplateColumns: "repeat(4,1fr)" }}>
                {[0,1,2,3].map(t => {
                  const tS = t*20+1, tE=(t+1)*20, done=curLv>tE, inT=curLv>=tS&&curLv<=tE;
                  const pct = done?100:inT?((curLv-tS)/19)*100:0;
                  return <div key={t} style={{ opacity: done||inT?1:0.4 }}>
                    <div style={{ fontSize:9,color:TCLR[t],fontWeight:700,marginBottom:3 }}>{TLBL[t]}</div>
                    <div style={{ height:4,background:C.bg1,borderRadius:99,overflow:"hidden" }}>
                      <div style={{ height:"100%",width:pct+"%",background:TCLR[t],borderRadius:99,transition:"width .4s" }}/>
                    </div>
                    <div style={{ fontSize:9,color:C.mute,marginTop:2 }}>{done?<span style={{color:C.good}}>ok</span>:WPN_TIER_COST[t]+" eng./nv"}</div>
                  </div>;
                })}
              </div>
            </div>
          </>;
        })() : <div style={{ color: C.mute, fontSize: 13 }}>Nenhuma arma equipada.</div>}
        <div style={{ borderTop: `1px solid ${C.line}`, margin: "12px 0", paddingTop: 12 }}>
          <b style={{ fontSize: 13 }}>Inventario {invWeapons.length === 0 && "(vazio — invoque armas)"}</b>
          <div className="flex flex-col gap-2 mt-2">{invWeapons.map((w) => <button key={w.id} onClick={() => setOwnedField(o.id, { weapon: w.id, weaponLv: w._storedLv || 1 })} className="text-left active:scale-95"><WeaponRow w={w} active={o.weapon === w.id} match={w.role===def.role} /></button>)}</div>
        </div>
      </Panel>}
      {tab === "relics" && <RelicEquip o={o} setOwnedField={setOwnedField} relicInv={relicInv} onUpgradeRelic={onUpgradeRelic} />}
    </div>
  );
}
function St({ k, v }) { return <div className="flex justify-between" style={{ background: C.panelHi, padding: "8px 10px", borderRadius: 10 }}><span style={{ color: C.mute }}>{k}</span><b>{v}</b></div>; }
function buffText(b) { const p = []; for (const k of ["atk", "def", "spd", "critRate", "critDmg", "dmgBonus"]) if (b[k]) p.push(`+${b[k]}${k === "spd" ? " VEL" : "% " + (STAT_LABEL[k] || k)}`); return `${p.join(", ")}${b.all ? " (time)" : ""} por ${b.turns}t`; }
const SKILL_DESC = {
  hitori: {
    basic: [
      "5 Estrelas - Suporte | Chaos.",
      "Ataques básicos não farão nada além de dar uma pequena quantidade de dano de Chaos.",
    ],
    skill: [
      "<b>Entoar da solidão</b> (Skill)",
      "Concede um aumento fixo de <b>1000 de ATK</b> e <b>12% de velocidade</b> (quando a mesma está upada no máximo), por <b>3 rodadas</b>.",
    ],
    ult: [
      "<b>Kessoku Band</b> (Ultimate)",
      "Concede um aumento de <b>8% de seu dano crítico total</b> em forma de chance de crítico e <b>30% de seu dano crítico</b> na forma do mesmo atributo.",
      "Além disso, Hitori concede um bônus de <b>15% da sua velocidade</b> em forma de bônus de dano elemental para os primeiros dois slots por <b>4 rodadas</b>.",
      "Custo de <b>160</b> de Energia.",
    ],
  },
  lupa: {
    basic: [
      "<b>Presa Incandescente</b>",
      "Causa Dano de Fusão a um único inimigo equivalente a <b>150% do ATK</b> de Lupa.",
      "Aplica \"Ignição\" por <b>3 turnos</b>.",
      "Se o alvo possuir qualquer efeito de DoT ativo, o dano direto deste ataque ganha um multiplicador bônus de <b>+50%</b>.",
    ],
    skill: [
      "<b>Salto do Abismo</b> — Perícia de Ressonância",
      "Custo: <b>1 Ponto de Habilidade</b>",
      "Causa Dano de Fusão massivo igual a <b>300% do ATK</b> de Lupa.",
      "<b>Detonação Expressa:</b> Consome metade da duração restante de todos os DoTs do alvo para causar dano imediato de <b>200% do valor acumulado</b>.",
      "<b>Avanço de Ação:</b> Ao utilizar esta habilidade, a ação de Lupa é avançada em <b>100%</b> (ela ganha um turno extra instantâneo sem consumir Ponto de Habilidade).",
    ],
    ult: [
      "<b>Eclipse de Fogo — Cataclismo Apocalíptico</b> — Liberação de Ressonância (Ultimate)",
      "Custo: <b>200 de Energia</b>",
      "Lupa atinge o ápice de sua fome, colapsando todas as chamas e anomalias do campo de batalha para disparar um golpe definitivo.",
      "<b>Consumo Absoluto:</b> Consome instantaneamente todos os efeitos de DoT de TODOS os inimigos na tela.",
      "<b>Dano Nuke Devastador:</b> Causa Dano de Fusão em área equivalente a <b>850% do ATK</b> de Lupa.",
      "<b>Escalonamento por Anomalia:</b> Para cada rodada de DoT consumida nesta ativação, o multiplicador final deste ataque aumenta em <b>+200%</b> (Exemplo: Consumir 5 rodadas de DoT acumuladas faz o golpe saltar para <b>1.850% do ATK</b> em área).",
      "<b>Perfuração Apocalíptica:</b> O dano deste Nuke ignora automaticamente <b>30% da DEF</b> e <b>20% da Resistência Elemental (RES)</b> de todos os alvos atingidos.",
      "<b>Estado Overclock (Pós-Nuke):</b> Por 2 turnos após conjurar a Suprema:",
      "Seu Ataque Básico é substituído por \"Julgamento Solar\", causando <b>500% do ATK</b> em área com <b>100% de Taxa Crítica garantida</b> e <b>+100% de Dano Crítico Bônus</b>.",
      "Re-aplica todos os DoTs que foram consumidos no Nuke, mas com o dano base desses DoTs amplificado em <b>+120%</b>.",
    ],
  },
  shorekeeper: {
    basic: [
      "<b>Origem da Ciência</b> — causa <b>115% do HP Máximo</b> de Shorekeeper (não do ATK!) em Dano Desconhecido a um único inimigo.",
      "Graças ao Talento, este golpe SEMPRE reduz a barra de Firmeza do alvo, ignorando fraquezas elementais nativas.",
      "Gera <b>+1 Ponto de Habilidade</b>.",
    ],
    skill: [
      "Custo: <b>1 Ponto de Habilidade</b>.",
      "<b>Teoria do Caos</b> — cura o aliado com menor % de HP em <b>20% do HP Máximo de Shorekeeper + 500</b>, e os demais aliados em <b>metade desse valor</b>.",
      "🛡️ <b>Blindagem de Dados</b> (2 turnos) aplicada ao alvo principal — imunidade ao próximo Controle de Grupo (Paralisia, Congelamento, Atordoamento etc.).",
      "⚡ <b>[Rastro 2]</b> Se a cura exceder o HP Máximo do alvo, o excedente é convertido em <b>Escudo de Dados</b> que absorve dano equivalente por 2 turnos.",
      "💜 <b>[C4 · Calibração do Caos]</b> O alvo curado e a própria Shorekeeper ganham <b>+15% de HP Máximo</b> por 3 turnos.",
    ],
    ult: [
      "Custo: <b>130 de Energia</b>.",
      "<b>Fim do Lamento</b> — ativa o domínio Estelarador por 3 turnos.",
      "<b>Estágio 1 (imediato):</b> todo o time ganha <b>+15% de Taxa de CRIT</b> e <b>+30% de Dano Crítico</b>.",
      "<b>Estágio 2 (Sincronia):</b> quando o time gastar 3 Pontos de Habilidade com o domínio ativo, 50% de todo dano aliado passa a herdar a Vantagem Universal de Shorekeeper (sempre quebra Firmeza).",
      "<b>Estágio 3 (Supernova):</b> se a Firmeza de um inimigo quebrar durante o Estágio 2, dispara um feixe que causa <b>330% do HP</b> de Shorekeeper em TODOS os inimigos e atrasa a ação deles em 40%.",
    ],
  },
  miyabi: {
    basic: [
      "Causa <b>110% de ATK</b> em Dano Glacial no inimigo principal — Corte Gélido.",
      "Ganha <b>+1 Ponto de Habilidade</b> e acumula <b>+1 PH (Ponto de Hailstorm)</b>. Ao atingir 3 PH, entra na <b>Postura Iaido</b>.",
      "━━ <b>Postura Iaido ativada (3 PH):</b> ━━",
      "O próximo Ataque Básico consome os 3 PH para um <b>Corte Iaido</b>: <b>165% de ATK</b> em Dano Glacial, ignorando <b>30% da DEF</b> do alvo. Avança a própria ação em <b>50%</b>.",
      "<b>[Vestígio: Cortes Residuais]</b> Acertos Críticos com Habilidade/Ultimate deixam o alvo marcado — o próximo Ataque Básico ecoa <b>90% do ATK</b> extra + estende DoTs ativos em +1 turno.",
      "<b>[Vestígio: Detonação]</b> Ao atacar alvos com DoTs ou DEF reduzida, consome os efeitos para detonar <b>150% de Dano Glacial em área</b> + Congelamento por 1 turno.",
      "<b>[C1]</b> Começa com 3 PH e Postura Iaido ativa. Primeiro Corte +50% de dano.",
      "<b>[C4]</b> Zona de Geada por 2 turnos após a Ultimate — Miyabi mantém Postura Iaido sem gastar PH dentro da zona.",
      "<b>[C6]</b> Limite de PH sobe para 4. Com 4 PH: Corte do Fim dos Tempos — <b>450% em TODOS os inimigos</b>, ignora 50% DEF. Matar qualquer alvo reseta a ação de Miyabi.",
    ],
    skill: [
      "Custo: <b>1 Ponto de Habilidade</b>.",
      "Causa <b>270% de ATK</b> em Dano Glacial a <b>todos os inimigos</b> e aplica <b>Congelamento</b> por 2 turnos (<b>80% ATK/turno</b>).",
      "Se <b>[Cortes Residuais]</b> estiver desbloqueado e for um acerto crítico, deixa marcas de <b>Residual</b> no alvo.",
      "<b>[C2]</b> Se usado contra inimigos já Congelados, <b>não consome PH</b>. Cada acerto crítico recupera <b>+5 de Energia</b>.",
      "<b>[C3]</b> Nível da Habilidade e Básico elevados — +25% de dano.",
    ],
    ult: [
      "Custo: <b>160 de Energia</b>.",
      "Inverno Eterno: causa <b>540% de ATK</b> em Dano Glacial a <b>todos os inimigos</b> e aplica <b>Congelamento</b> profundo por 2 turnos (<b>110% ATK/turno</b>).",
      "Críticos com a Ultimate deixam marcas de <b>Residual</b> em todos os alvos se [Vestígio: Cortes Residuais] estiver ativo.",
      "<b>[C4]</b> Cria Zona de Geada por 2 turnos — Miyabi age em Postura Iaido permanentemente dentro dela sem gastar PH.",
      "<b>[C5]</b> +50% de dano na Ultimate.",
      "<b>[C6]</b> Miyabi em Zona de Geada usa Corte do Fim dos Tempos (450%, ignora 50% DEF, AoE), não o Corte Iaido simples.",
    ],
  },
  kaiba: {
    basic: [
      "<b>Decreto Corporativo</b> — causa Dano a um único inimigo equivalente a <b>100% do ATK</b> de Kaiba.",
      "Ganha <b>+1 Ponto de Habilidade</b>.",
      "✦ <b>Talento — Regra do Duelista:</b> Kaiba é limitado a manter apenas <b>1 Monstro Invocado</b> ativo por vez (2 com S3). Se um novo Monstro for invocado enquanto já houver outro ativo, o mais antigo é destruído imediatamente. O Monstro ativo tem sua própria barra de ação na Ordem de Turnos e age sozinho, herdando <b>100% da VEL</b> de Kaiba, <b>100% da Taxa/Dano Crítico</b> dele, e <b>120% do ATK base</b> dele. Quando Kaiba sofre um ataque, o Monstro intercepta <b>30% do dano recebido</b> — como ele não tem uma barra de HP independente, esse dano nunca chega a ser subtraído da vida de Kaiba (na prática, -30% de dano sofrido enquanto houver Monstro ativo).",
    ],
    skill: [
      "Custo: <b>1 Ponto de Habilidade</b>.",
      "<b>Puxada do Destino</b> — Kaiba saca aleatoriamente 1 de 10 cartas possíveis do Baralho Original. O efeito é executado instantaneamente conforme a categoria da carta:",
      "━━ <b>Cartas de Monstro:</b> ━━",
      "<b>Vorse Raider</b> — invoca ao campo. Ataques de alvo único causando <b>260% de ATK</b> em dano físico, com <b>50% de chance</b> de aplicar Sangramento.",
      "<b>Kaiser Sea Horse</b> — invoca ao campo. Ataques causam <b>180% de ATK</b> em Dano de Luz/Eletro e regeneram <b>20 de Energia</b> para Kaiba instantaneamente ao ser invocado.",
      "<b>Saggi, o Clone das Sombras</b> — invoca ao campo. Baixo dano (<b>70% de ATK</b>), mas provoca (Taunt) TODOS os inimigos a atacá-lo por 2 rodadas.",
      "<b>Juiz</b> — invoca ao campo. Golpes em Área: <b>200% de ATK</b> no alvo principal e <b>100%</b> nos alvos adjacentes.",
      "<b>Obelisco, o Atormentador</b> (Lendário, <b>taxa de puxada fixa de 5%</b>) — substitui qualquer invocação ativa. Executa \"Punho do Destino\": <b>750% de Dano Físico/Eletro em ÁREA</b> (todos os inimigos), ignorando <b>100% da DEF</b> inimiga.",
      "━━ <b>Cartas de Magia:</b> ━━",
      "<b>Controlador de Inimigos</b> — seleciona um inimigo aleatório e atrasa a ação dele em <b>40%</b> na Ordem de Turnos.",
      "<b>Encolher</b> — seleciona o inimigo de maior ATK do campo e reduz o ATK e a DEF dele em <b>35%</b> por 2 turnos.",
      "<b>A Flauta para Invocação de Dragões</b> — se o Dragão Branco estiver em campo, avança a ação dele em <b>100%</b> imediatamente e dá <b>+50% de CRIT DMG</b> no próximo ataque. Se não houver dragão em campo, puxa outra carta imediatamente sem gastar Ponto de Habilidade.",
      "━━ <b>Cartas de Armadilha:</b> ━━",
      "<b>Vírus Esmaga-Cards</b> — protege o time por 2 turnos: qualquer ataque inimigo com multiplicador acima de 150% tem o dano reduzido para apenas <b>50%</b>.",
      "<b>Anel da Destruição</b> — explode o inimigo com menor HP: <b>Dano Verdadeiro</b> equivalente a <b>25% da Vida Máxima</b> do alvo. Kaiba sofre um contragolpe reativo de <b>5% do próprio HP atual</b>.",
    ],
    ult: [
      "Custo: <b>140 de Energia</b>.",
      "<b>Entrada Triunfal:</b> ao entrar em campo, a ação do Dragão avança <b>100%</b> na Ordem de Turnos (age quase imediatamente).",
      "<b>Rajada de Relâmpagos:</b> no turno dele, o Dragão causa Dano Eletro/Fogo devastador — <b>850% do ATK</b> de Kaiba no alvo principal e <b>425%</b> nos alvos adjacentes, removendo todos os buffs positivos dos alvos atingidos. Como Monstro Lendário, o Dragão NÃO pode ser substituído por cartas comuns da Perícia — só sai de campo se for derrotado ou se Kaiba conjurar um novo Dragão Branco pela Suprema.",
    ],
  },
  renji: {
    basic: [
      "Causa <b>100% de ATK</b> em Dano de Caos no inimigo principal — Golpe de Zabimaru.",
      "Ganha <b>+1 Ponto de Habilidade</b>.",
      "✦ <b>Talento — Instinto de Caça:</b> contra inimigos abaixo de <b>40% de HP</b>, todos os ataques causam <b>+25% de dano</b>.",
    ],
    skill: [
      "Custo: <b>1 Ponto de Habilidade</b>.",
      "Causa <b>235% de ATK</b> em Dano de Caos no inimigo principal e aplica <b>Sangramento</b> por 2 turnos (<b>55% ATK/turno</b>).",
      "<b>[S2]</b> O Sangramento causa <b>+40%</b> a mais de dano por turno.",
      "<b>[S3]</b> +25% de dano na Habilidade.",
    ],
    ult: [
      "Custo: <b>120 de Energia</b>.",
      "Hihiō Zabimaru: causa <b>445% de ATK</b> em Dano de Caos no inimigo principal.",
      "✦ Talento: se o alvo estiver com <b><40% de HP</b>, o dano da Ultimate é acrescido de <b>+25%</b> pelo Instinto de Caça.",
      "<b>[S6]</b> Contra inimigos sangrando OU com DEF reduzida: <b>+25% de dano</b> adicional em todos os ataques.",
      "<b>[S5]</b> +50% de dano na Ultimate.",
    ],
  },
  ace: {
    basic: [
      "Causa <b>100% de ATK</b> em Dano de Fogo no inimigo principal — Soco Flamejante.",
      "Ganha <b>+1 Ponto de Habilidade</b>.",
      "✦ <b>Talento — Brasa Viva:</b> a Queimadura aplicada por Ace causa <b>+30% mais dano</b> e ignora parte da defesa ao longo do tempo.",
    ],
    skill: [
      "Custo: <b>1 Ponto de Habilidade</b>.",
      "Causa <b>150% de ATK</b> em Dano de Fogo a <b>todos os inimigos</b> (área) e aplica <b>Queimadura</b> por 2 turnos (<b>55% ATK/turno</b>).",
      "A Queimadura de Ace é reforçada pelo Talento: <b>+30% de dano</b> por turno.",
      "<b>[S2]</b> Queimadura causa +40% a mais de dano.",
    ],
    ult: [
      "Custo: <b>120 de Energia</b>.",
      "Grande Incêndio: causa <b>330% de ATK</b> em Dano de Fogo a <b>todos os inimigos</b> (área) e aplica <b>Queimadura</b> intensa por 3 turnos (<b>85% ATK/turno</b>).",
      "<b>[Núcleo Ardente 4pç]</b> Dano da Ultimate +20% e +8% ATK no turno seguinte.",
      "<b>[S5]</b> +50% de dano na Ultimate.",
    ],
  },
  usopp: {
    basic: [
      "Causa <b>90% de ATK</b> em Dano de Vento no inimigo principal — Tiro Certeiro.",
      "Ganha <b>+1 Ponto de Habilidade</b>.",
      "✦ <b>Talento — Olho de Águia:</b> os debuffs de Usopp reduzem <b>+12% de DEF adicional</b> do alvo além do valor base.",
    ],
    skill: [
      "Custo: <b>1 Ponto de Habilidade</b>.",
      "Causa <b>130% de ATK</b> em Dano de Vento no inimigo principal e reduz a <b>DEF em 32%</b> e aplica <b>+18% de Vulnerabilidade</b> por 3 turnos.",
      "O Talento adiciona +12% de DEF extra reduzida → total de <b>44% de DEF reduzida</b>.",
      "<b>[Vestígio: Erosão]</b> Todos os debuffs de Usopp duram +1 turno e adicionam +12% de vulnerabilidade extra.",
    ],
    ult: [
      "Custo: <b>120 de Energia</b>.",
      "Pop Green: Impacto — aplica <b>+28% de Vulnerabilidade</b> a <b>todos os inimigos</b> por 2 turnos.",
      "Alvos vulneráveis recebem muito mais dano de toda a equipe.",
      "<b>[Vestígio: Erosão]</b> +12% de vulnerabilidade extra em cada debuff → total de <b>+40%</b> nos alvos.",
      "<b>[S5]</b> +50% de dano na Ultimate.",
    ],
  },
  sakura: {
    basic: [
      "Causa <b>100% de ATK</b> em Dano Holy no inimigo principal — Golpe Centena.",
      "Ganha <b>+1 Ponto de Habilidade</b>.",
      "✦ <b>Talento — Mãos que Curam:</b> a cura da Ultimate é <b>+25% mais forte</b>.",
    ],
    skill: [
      "Custo: <b>1 Ponto de Habilidade</b>.",
      "Causa <b>225% de ATK</b> em Dano Holy no inimigo principal — Soco Esmagador.",
      "<b>[Vestígio: Predador]</b> +25% de dano contra alvos com DoT ou DEF reduzida.",
    ],
    ult: [
      "Custo: <b>120 de Energia</b>.",
      "Punho Sobre-humano: causa <b>405% de ATK</b> em Dano Holy no inimigo principal.",
      "Cura <b>todos os aliados</b>: <b>60% do ATK + 350 fixo</b>. Com o Talento: a cura é <b>+25% mais forte</b>.",
      "<b>[Benção Sagrada 4pç]</b> +15% na cura e ao curar aplica escudo de 2% do HP máx do alvo.",
      "<b>[S5]</b> +50% de dano e cura na Ultimate.",
    ],
  },
  chopper: {
    basic: [
      "Causa <b>60% de ATK</b> em Dano Glacial no inimigo principal — Investida.",
      "Ganha <b>+1 Ponto de Habilidade</b>.",
      "✦ <b>Talento — Médico Dedicado:</b> todas as curas de Chopper são <b>+25% mais fortes</b>.",
    ],
    skill: [
      "Custo: <b>1 Ponto de Habilidade</b>.",
      "Cuidado Médico: cura o aliado <b>mais ferido</b> em <b>120% do ATK + 250 fixo</b>.",
      "Com o Talento: a cura é <b>+25% mais forte</b> → efetivamente <b>150% do ATK + 312 fixo</b>.",
      "Doa <b>+12 de Energia</b> a um aliado aleatório.",
    ],
    ult: [
      "Custo: <b>120 de Energia</b>.",
      "Operação de Emergência: cura <b>todos os aliados</b> em <b>90% do ATK + 460 fixo</b>.",
      "Com o Talento: a cura coletiva é <b>+25% mais forte</b> → efetivamente <b>112% do ATK + 575 fixo</b>.",
      "<b>[Benção Sagrada 4pç]</b> +15% na cura e escudo adicional de 2% do HP máximo por aliado curado.",
      "<b>[S5]</b> +50% de dano na Ultimate.",
    ],
  },
  kirara: {
    basic: [
      "Causa <b>80% de ATK</b> em Dano de Caos no inimigo principal.",
      "Ganha <b>+1 Ponto de Habilidade</b>.",
      "✦ <b>Talento — Baluarte Estelar:</b> todos os escudos de Kirara são <b>+25% mais resistentes</b>.",
    ],
    skill: [
      "Custo: <b>1 Ponto de Habilidade</b>.",
      "Gera um <b>Escudo Cósmico</b> para si mesma baseado em <b>90% da DEF + 320 fixo</b>.",
      "Com o Talento: escudo fica <b>+25% mais forte</b>.",
      "Provoca os inimigos para atacarem Kirara em vez dos aliados.",
    ],
    ult: [
      "Custo: <b>120 de Energia</b>.",
      "Constelação Guardiã: gera <b>Escudos para TODOS os aliados</b> baseado em <b>130% da DEF + 480 fixo</b>.",
      "Concede a todos: <b>+30% de DEF</b> por 2 turnos.",
      "Com o Talento: todos os escudos criados são <b>+25% mais resistentes</b>.",
      "<b>[S5]</b> +50% nos escudos e buffs da Ultimate.",
    ],
  },
  yoruichi: {
    basic: [
      "<b>Golpe Relâmpago</b> — causa Dano Eletro a um único inimigo equivalente a <b>300% da VEL total</b> de Yoruichi (não do ATK — todo o kit dela ignora completamente o atributo de Ataque).",
      "Ganha <b>+1 Ponto de Habilidade</b>.",
      "✦ <b>Talento — Frequência Shunpo:</b> Yoruichi opera em uma linha temporal acelerada. Todos os seus multiplicadores de dano ignoram os atributos de ATK e escalam exclusivamente com sua Velocidade (VEL) total.",
      "A cada 10 pontos de VEL que Yoruichi possuir acima de 120, o Dano Crítico de TODOS os Ataques Extras da equipe (não só os dela) aumenta em 6%, até um máximo de 60% por padrão — ou 160% com a constelação S6.",
    ],
    skill: [
      "Custo: <b>1 Ponto de Habilidade</b>.",
      "<b>Domínio Magnético</b> — Yoruichi entra na postura Condução Perfeita por 3 turnos (a duração diminui no início de cada turno natural dela) e marca um único inimigo como <b>Ponto de Aterramento</b>.",
      "<b>Buff de Área:</b> enquanto a postura estiver ativa, toda a equipe ganha um bônus numérico fixo de VEL equivalente a <b>12% da VEL total</b> de Yoruichi.",
      "<b>Registro de Dano (Eco):</b> toda vez que o inimigo marcado como Ponto de Aterramento sofrer dano proveniente de um Ataque Extra — seja de qualquer aliado ou dos próprios Clones Residuais de Yoruichi — o Domínio Magnético registra <b>35% do dano causado</b> (52% com a constelação S5).",
      "<b>Detonação:</b> no início do próximo turno natural de Yoruichi, TODO o dano acumulado no registro é detonado de uma só vez no alvo marcado. Esse dano é classificado como <b>Dano Verdadeiro Eletro</b> — ignora completamente a DEF do alvo e qualquer Escudo de mitigação — e o contador reinicia logo em seguida a zero.",
    ],
    ult: [
      "Custo: <b>120 de Energia</b>.",
      "<b>Shunko: Raijin</b> — causa Dano Eletro massivo a um único inimigo principal, equivalente a <b>2200% da VEL total</b> de Yoruichi.",
      "<b>Efeito Adicional:</b> avança imediatamente a ação de TODOS os outros aliados (não ela mesma) em 25% na Ordem de Turnos.",
      "Além disso, a Suprema insere compulsoriamente <b>2 Clones Residuais</b> diretamente no alvo atingido, acelerando de forma autônoma a ativação do Colapso Elétrico do Talento — sem precisar de nenhum Ataque Extra real de um aliado pra isso.",
    ],
    talent: [
      "✦ <b>Clones Residuais (Ataque Extra):</b> sempre que um aliado desferir um Ataque Extra contra um inimigo, Yoruichi intercepta a ação e conjura um Clone Residual instantâneo que ataca o mesmo alvo, causando Dano Eletro equivalente a <b>500% de sua VEL total</b>.",
      "✦ <b>Colapso Elétrico:</b> o jogo contabiliza os Clones Residuais gerados. A cada 3 Clones acionados, o alvo atual sofre uma sobrecarga, recebendo Dano Eletro em Área equivalente a <b>1500% da VEL</b> de Yoruichi e sofrendo uma redução de 20% na Resistência a Ataques Extras por 2 turnos.",
      "Não há limite de vezes que Clones Residuais podem ser ativados por ciclo de turnos — quanto mais a equipe contra-atacar, mais ela dispara.",
    ],
  },
  kiritsugu: {
    basic: [
      "Causa <b>100% de ATK</b> em Dano de Vírus no inimigo principal — Tiro de Origem.",
      "Ganha <b>+1 Ponto de Habilidade</b>.",
      "✦ <b>Talento — Análise:</b> toda vulnerabilidade aplicada por Kiritsugu é <b>+12% mais forte</b>.",
    ],
    skill: [
      "Custo: <b>1 Ponto de Habilidade</b>.",
      "Bala Calculada: causa <b>205% de ATK</b> em Dano de Vírus no alvo e aplica <b>Veneno</b> por 3 turnos (<b>70% ATK/turno</b>).",
      "Reduz a <b>DEF em 40%</b> e aplica <b>+22% de Vulnerabilidade</b> por 3 turnos.",
      "Com o Talento: a Vulnerabilidade vira <b>+34%</b> no total.",
    ],
    ult: [
      "Custo: <b>120 de Energia</b>.",
      "Time Alter: Triple Accel — causa <b>365% de ATK</b> em Dano de Vírus no alvo e aplica <b>+30% de Vulnerabilidade</b> a <b>todos os inimigos</b> por 3 turnos.",
      "Com o Talento: a Vulnerabilidade total vira <b>+42%</b>.",
      "<b>[S5]</b> +50% de dano na Ultimate.",
    ],
  },
  lancer: {
    basic: [
      "Causa <b>100% de ATK</b> em Dano de Caos no inimigo principal — Estocada Rápida.",
      "Ganha <b>+1 Ponto de Habilidade</b> e <b>+20 de Energia</b>.",
      "✦ <b>Talento — Runa da Imortalidade:</b> a primeira vez que Lancer fosse morto, ele sobrevive com 1 HP e recupera <b>20% do HP máximo</b> (1× por batalha).",
      "<b>[C4]</b> Toda vez que uma Esquiva Absoluta bloquear um ataque, Lancer contra-ataca causando <b>80% de ATK</b> em Dano de Caos.",
    ],
    skill: [
      "Custo: <b>1 Ponto de Habilidade</b>. Ganha <b>+30 de Energia</b>.",
      "Proteção contra Flechas: avança a <b>própria ação em 30%</b> na linha do tempo.",
      "Ganha <b>2 cargas de Esquiva Absoluta</b> — cada uma evita 100% do dano do próximo ataque recebido.",
      "<b>[Vestígio: Contra-golpe]</b> Ao usar a Esquiva Absoluta, o próximo golpe de Lancer ganha <b>+20% de Dano de Caos</b>.",
      "<b>[C1]</b> Entra em batalha com 1 carga de Esquiva Absoluta gratuita.",
      "<b>[C4]</b> Cada Esquiva Absoluta ativada dispara um contra-ataque de <b>80% de ATK</b>.",
    ],
    ult: [
      "Custo: <b>110 de Energia</b> (95 com C2).",
      "Gáe Bolg: A Lança da Morte Perfurante — causa <b>420% de ATK</b> em Dano de Caos no inimigo principal.",
      "━━ <b>Condição Especial:</b> ━━",
      "Se o alvo estiver com <b>menos de 50% de HP</b>: o ataque tem <b>100% de Taxa Crítica Garantida</b>.",
      "O ataque <b>ignora completamente escudos</b> — nenhuma barreira bloqueia a Lança da Morte.",
      "<b>[C6]</b> Gáe Bolg ignora adicionalmente <b>20% da DEF</b> do alvo.",
    ],
  },
  nanami: {
    basic: [
      "Causa <b>100% de ATK</b> em Dano de Caos no inimigo principal — Golpe de Cutelo.",
      "Ganha <b>+1 Ponto de Habilidade</b> e <b>+20 de Energia</b>.",
      "✦ <b>Talento — Hora Extra:</b> após o 5º turno de heróis, Nanami entra em <b>[Hora Extra]</b> e ganha permanentemente <b>+30% de ATK</b> até o fim da partida.",
      "<b>[C4]</b> Ao entrar em Hora Extra, limpa todos os debuffs próprios instantaneamente.",
    ],
    skill: [
      "Custo: <b>1 Ponto de Habilidade</b>. Ganha <b>+30 de Energia</b>.",
      "Razão 7:3: causa <b>240% de ATK</b> em Dano de Caos no inimigo principal.",
      "━━ <b>Mecânica 7:3:</b> ━━",
      "Se o dano final do golpe terminar no dígito <b>7 ou 3</b>, o ataque automaticamente vira um <b>Acerto Crítico Garantido</b>.",
      "<b>[Vestígio: Crit Energy]</b> Críticos da Razão 7:3 recuperam <b>+10 de Energia</b>.",
      "<b>[C6]</b> A Razão 7:3 passa a ter <b>100% de chance de Crítico</b> independente do valor — proporção matemática absoluta.",
    ],
    ult: [
      "Custo: <b>115 de Energia</b>.",
      "Colapso: causa <b>310% de ATK</b> em Dano de Caos a <b>todos os inimigos</b> (área).",
      "Reduz a <b>DEF de todos os inimigos em 15%</b> por 2 turnos.",
      "<b>[Vestígio: Dano vs DEF Reduzida]</b> Nanami causa <b>+20% de dano</b> contra inimigos com DEF reduzida — combo perfeito pós-Ultimate.",
      "<b>[C2]</b> A redução de DEF sobe de 15% para <b>20%</b>.",
      "<b>[C5]</b> +50% de dano na Ultimate.",
    ],
  },
  nami: {
    basic: [
      "Causa <b>90% de ATK</b> em Dano de Vento no inimigo principal — Golpe com Clima-Tact.",
      "Ganha <b>+1 Ponto de Habilidade</b> e <b>+20 de Energia</b>.",
      "✦ <b>Talento — Aliança dos Piratas:</b> quando qualquer aliado atacar um inimigo sob <b>Ciclone</b>, Nami dispara um ataque coordenado causando <b>40% de Dano de Vento</b>.",
    ],
    skill: [
      "Custo: <b>1 Ponto de Habilidade</b>. Ganha <b>+30 de Energia</b>.",
      "Gust Sword: causa <b>160% de ATK</b> em Dano de Vento a <b>todos os inimigos</b> (área).",
      "Aplica <b>Ciclone</b> (DoT de Vento) em todos por 2 turnos — causa <b>50% ATK/turno</b>.",
      "<b>[Vestígio: Ciclone Lento]</b> Inimigos com Ciclone têm a <b>VEL reduzida em 10%</b>.",
      "<b>[C1]</b> Duração do Ciclone aumenta para <b>3 turnos</b>.",
      "<b>[C3]</b> +25% de dano no Gust Sword.",
    ],
    ult: [
      "Custo: <b>120 de Energia</b>.",
      "Zeus Breeze Tempo: causa <b>340% de ATK</b> em Dano de Vento a <b>todos os inimigos</b> (área).",
      "━━ <b>Explosão de DoTs:</b> ━━",
      "Todos os DoTs ativos na tela <b>explodem imediatamente</b>, causando <b>60% do dano original</b> em cada tick sem consumir os turnos restantes do debuff.",
      "<b>[C4]</b> Nami regenera <b>+15 de Energia</b> instantaneamente ao conjurar a Ultimate.",
      "<b>[C6]</b> O multiplicador de explosão dos DoTs sobe de <b>60% para 100%</b> — cada DoT explode no valor integral.",
    ],
  },
  uraraka: {
    basic: [
      "Causa <b>90% de ATK</b> em Dano de Vento no inimigo principal — Combate de Gravidade.",
      "Ganha <b>+1 Ponto de Habilidade</b> e <b>+20 de Energia</b>.",
      "✦ <b>Talento — Levitação:</b> ao usar o Ataque Básico, Uraraka avança a <b>própria barra de ação em 15%</b>, agindo mais cedo que a velocidade indica.",
    ],
    skill: [
      "Custo: <b>1 Ponto de Habilidade</b>. Ganha <b>+30 de Energia</b>.",
      "Zero Gravity: aumenta o <b>ATK de um aliado em 20%</b> e a <b>VEL em +10</b> por 2 turnos.",
      "<b>[C1]</b> O bônus de ATK sobe de 20% para <b>25%</b>.",
      "<b>[Vestígio: Atraso]</b> Quando o aliado buffado atacar, atrasa a ação do inimigo atingido em <b>8%</b>.",
      "<b>[C6]</b> O aliado com Zero Gravity ativo recebe <b>-10 pontos fixos no custo da própria Ultimate</b>.",
    ],
    ult: [
      "Custo: <b>120 de Energia</b>.",
      "Chuva de Destroços: causa <b>260% de ATK</b> em Dano de Vento a <b>todos os inimigos</b> (área).",
      "Aumenta o <b>ATK de todos os aliados em 15%</b> por 2 turnos.",
      "<b>[C2]</b> Ao usar a Ultimate, Uraraka gera um escudo para si baseado em <b>10% do próprio HP máximo</b>.",
      "<b>[C4]</b> A duração do buff de ATK global aumenta para <b>3 turnos</b>.",
      "<b>[C5]</b> +50% de dano na Ultimate.",
    ],
  },
  frieren: {
    basic: [
      "Conjura <b>Magia Comum</b> que atinge <b>TODOS os inimigos</b> em área — <b>90% de ATK</b> em Dano Holy.",
      "Ganha <b>+1 Ponto de Habilidade</b> e <b>+15 de Energia</b>.",
      "<b>[Grimório do Colecionador ativo]</b> Acumula <b>+1 Ponto de Elemento</b> (máx 4 pts).",
      "✦ <b>Talento — Percepção de Milênios · Grimório Oculto:</b> imune a atrasos de turno. Começa a batalha com <b>2 Pontos de Elemento</b> gerados. Aggro reduzido a zero enquanto Energia < 50%.",
    ],
    skill: [
      "Custo: <b>1 Ponto de Habilidade</b>.",
      "Grimório do Colecionador: causa <b>180% de ATK</b> em Dano Holy em <b>TODOS os inimigos</b> (área).",
      "Gera <b>+2 Pontos de Elemento</b> de tipos aleatórios (Fogo/Gelo/Vento/Eletro) — acumula até <b>4 pontos</b> no total.",
      "<b>[Cajado do Fim da Era]</b> Ao gerar pontos, recupera adicionalmente <b>+20 de Energia</b>.",
      "<b>[C2]</b> Cada uso gera <b>+1 Ponto de Elemento</b> extra.",
    ],
    ult: [
      "Custo: <b>110 de Energia</b>. Retém <b>5 de Energia base</b> após o disparo.",
      "Descompressão de Mana — escolhe automaticamente uma das 3 opções conforme a situação em campo:",
      "━━ <b>[Zoltraak]</b> (padrão — alvo único): ━━",
      "Causa <b>500% de ATK</b> em Dano Holy no inimigo principal. Vs Chaos/Vírus: <b>Crítico Garantido</b> e ignora Escudos.",
      "━━ <b>[Reação de Campo]</b> (2+ inimigos vivos com pontos acumulados): ━━",
      "Libera os Pontos de Elemento — dano Holy em <b>TODOS os inimigos</b>. Cada ponto: <b>+30%</b> de dano total (máx ×2.2). Com 3+ pontos: inimigos ficam lentos por 2 turnos.",
      "━━ <b>[Magia de Flores]</b> (algum aliado com <40% HP): ━━",
      "Cura <b>todos os aliados em 20% do HP Máx</b>, remove debuffs e concede <b>+15% de Resistência a Dano</b> por 3 turnos.",
      "<b>[Vestígio: Zoltraak Silencioso]</b> Zoltraak vs Chaos/Vírus: Crítico Garantido + ignora 100% dos Escudos.",
      "<b>[Vestígio: Campo de Flores Eterno]</b> Magia de Flores: cura <b>+15% HP Máx extra</b> e concede <b>+10% Dano Bônus</b> ao time por 2 turnos.",
      "<b>[C1]</b> Começa a batalha com 2 Pontos de Elemento prontos para usar.",
      "<b>[C2]</b> Zoltraak atravessa o alvo e atinge adjacentes por <b>50% do dano</b>.",
      "<b>[C4]</b> Com Energia máxima, reduz passivamente a <b>DEF de todos os inimigos em 15%</b>.",
      "<b>[C6]</b> Zoltraak elimina instantaneamente alvos não-chefe com menos de <b>30% de HP</b>.",
    ],
  },
  ryoshu: {
    basic: [
      "Causa <b>140% de ATK</b> em Dano de Vírus no inimigo principal — Fio de Penumbra.",
      "Ganha <b>+1 Ponto de Habilidade</b>.",
      "Aplica <b>Teia</b>: reduz VEL do alvo em <b>-10%</b> por 2 turnos (acumula até -20%).",
      "✦ <b>Talento — Caçadora das Profundezas:</b> cada ataque contra alvos com DoT ou DEF reduzida ganha <b>+25% de dano</b> adicional.",
    ],
    skill: [
      "Custo: <b>1 Ponto de Habilidade</b>.",
      "Marionetes de Sangue: drena <b>15% do HP Máx</b> de cada aliado e converte em devastação em <b>TODOS os inimigos</b>.",
      "Dano base: <b>300% de ATK</b> + Dano Fixo (×2.4 do HP total drenado).",
      "Acumula <b>Tensão</b> (×1–3) pelo HP drenado — cada nível de Tensão aumenta o Dano Fixo em <b>+18%</b>.",
      "<b>[C1]</b> A Habilidade drena apenas <b>10%</b> do HP dos aliados.",
      "<b>[C2]</b> Aliados drenados recebem <b>+30% de Redução de Dano</b> por 1 turno (Fio Guia).",
      "<b>[C4]</b> Cada aliado com buff ativo concede <b>+5 de Energia</b> ao drenar.",
    ],
    ult: [
      "Custo: <b>120 de Energia</b>.",
      "A Tela da Aranha: drena <b>32% do HP Máx</b> de todos os aliados e desencadeia ataque massivo em <b>TODOS os inimigos</b>.",
      "Dano base: <b>680% de ATK</b> + Dano Fixo massivo (×6 do HP total drenado contra chefes).",
      "Executa inimigos não-chefe com HP menor que o total drenado.",
      "<b>[Vestígio: Instinto de Predadora]</b> Penetra até <b>65% da DEF</b> baseado no HP perdido pelos aliados.",
      "<b>[C5]</b> +50% de dano na Ultimate.",
      "<b>[C6]</b> Dano Verdadeiro vs chefes ×10. Se todos os aliados com <50% HP: Ryoshu <b>age imediatamente de novo</b>.",
    ],
  },
  omegamon: {
    basic: [
      "Dispara a <b>Garuru Cannon</b> — causa <b>100% de ATK</b> em Dano de Vírus no inimigo principal.",
      "Ganha <b>+1 Ponto de Habilidade</b> e <b>+15 de Energia</b>.",
      "Se o alvo estiver sob <b>Corrosão</b>, cura Omegamon em <b>10% do HP Máx</b>.",
      "Se acumular <b>5 cargas de [Vírus Defeat]</b>: remove todos os buffs do alvo e causa <b>Dano Verdadeiro = 20% do HP Máx</b>.",
      "✦ <b>Talento — Digital Hazard:</b> HP Máx de <b>todos os aliados +25%</b>. Ao ser atacado (ou aliado com [Protocolo]): acumula 1 carga de [Vírus Defeat] (máx 5). Cada carga: <b>+15% CRIT DMG</b> e reduz DEF do atacante em <b>-10%</b>.",
    ],
    skill: [
      "Custo: <b>1 Ponto de Habilidade</b>.",
      "Protocolo de Infecção: causa <b>120% de ATK</b> em Dano de Vírus em <b>TODOS os inimigos</b> (área).",
      "Aplica <b>[Protocolo de Infecção]</b> nos aliados por 2 turnos — ativa o sistema de cargas do Talento.",
      "Aplica <b>Corrosão</b> nos inimigos: DoT de Vírus que também cura o time a cada tick.",
      "<b>[Vestígio: Saturação de Vírus]</b> O dano da Ultimate aumenta em <b>0,8% por 1% de HP perdido</b> de Omegamon.",
      "<b>[Vestígio: Contágio de Dados]</b> Aliados com [Protocolo] ganham <b>+20% de Resistência a Dano</b>. Escudo quebrado → Corrosão imediata no agressor.",
    ],
    ult: [
      "Custo: <b>130 de Energia</b>.",
      "ALL DELETE: sacrifica <b>30% do próprio HP</b> e esmaga <b>TODOS os inimigos</b> em área.",
      "Causa <b>150% de ATK</b> (×Saturação) em Dano de Vírus + <b>30% do HP Máx</b> como Dano Verdadeiro.",
      "Aplica <b>Corrosão</b> por 3 turnos em todos — cada tick cura o time proporcionalmente.",
      "<b>[Vestígio: Saturação de Vírus]</b> Cada 1% de HP perdido = <b>+0,8% de dano</b> total (máx ~+40%).",
      "<b>[C4]</b> Todos os inimigos: <b>-15% de VEL</b> por 1 turno após o ALL DELETE.",
      "<b>[C6]</b> Com <30% HP: dano <b>×2</b>. Após o ALL DELETE, <b>revive todos os aliados caídos</b> com 30% de HP.",
    ],
  },
  soifon: {
    basic: [
      "Desfere dois golpes rápidos no inimigo principal — causa <b>100% de ATK</b> em Dano de Vento.",
      "Se o alvo tiver <b>Choque</b> (DoT Eletro ativo), Soi Fon recupera <b>+10 de Energia</b> instantaneamente.",
      "Ganha <b>+1 Ponto de Habilidade</b> ao usar o Ataque Básico.",
      "━━ <b>Arma · Ferrão da Borboleta:</b> acumula <b>1 Carga Elétrica</b> (máx 5) — consumidas ao ativar a Postura de Ferrão. ━━",
      "── <b>✦ POSTURA DE FERRÃO</b> (ativada ao acumular 3 cargas de Vibração de Ferrão): ──",
      "Transforma o próximo Ataque Básico em <b>Dano Verdadeiro de Vento: 120% de ATK</b> — ignora completamente DEF e Escudos do alvo.",
      "<b>[Ferrão da Borboleta]</b> Consome todas as Cargas Elétricas ao disparar — cada carga concede <b>+24% de Dano Verdadeiro</b> adicional.",
      "<b>[C1 · Velo de Borboleta]</b> Ao entrar na Postura, regenera <b>+10 de Energia</b> e ganha <b>+20% de Dano Bônus</b> no golpe de Dano Verdadeiro.",
      "<b>[Vestígio: Sombra Assassina]</b> Ao entrar na Postura, ganha <b>+20% de Dano de Vento</b> por 1 turno.",
      "<b>[C6 · Suprema Execução]</b> Na Postura, o golpe atinge <b>TODOS os inimigos</b> com 40% de penetração de DEF. Eliminar qualquer inimigo recupera <b>100% de Energia</b> e concede <b>+50% de Dano Bônus</b> por 1 turno.",
    ],
    skill: [
      "Custo: <b>1 Ponto de Habilidade</b>.",
      "Executa um ataque preciso — causa <b>160% de ATK</b> em Dano de Vento no inimigo principal.",
      "Aplica <b>[Ferrão da Morte]</b> no alvo por <b>3 turnos</b> (acumula até <b>3 marcas</b> no mesmo alvo).",
      "━━ <b>Efeito passivo da marca [Ferrão da Morte]:</b> ━━",
      "Sempre que um aliado de elemento <b>Eletro</b> atacar um inimigo marcado, Soi Fon dispara automaticamente um <b>follow-up de Vento</b> — máximo de <b>2 follow-ups por turno de aliado</b>.",
      "Cada <b>[Ferrão da Morte]</b> ativo no alvo durante a Ultimate concede <b>+15% de dano</b> à explosão final (as marcas são consumidas no disparo).",
      "<b>[Vestígio: Precisão Mortal]</b> Dano dos follow-ups aumentado em <b>+25%</b>. Cada follow-up realizado concede <b>+15% de CRIT DMG</b> à Soi Fon (acumula até 2× durante o combate).",
      "<b>[C2 · Sincronia Estática]</b> A marca reduz a <b>RES Elemental do alvo em 15%</b> por 3 turnos. Aliados Eletro que acertarem o inimigo marcado concedem <b>+1 carga extra de Vibração</b> a Soi Fon.",
      "<b>[C5 · Assassina do Vento]</b> Multiplicador da Perícia aumentado em <b>+25%</b>. Dano dos follow-ups <b>+15%</b> adicional.",
      "<b>[Ferrão da Borboleta]</b> +1 Carga Elétrica (máx 5) ao usar a Perícia.",
    ],
    ult: [
      "Custo: <b>120 de Energia</b>. Retém <b>5 de Energia base</b> após o disparo (multiplicada pela Regen de Energia).",
      "Dispara o míssil definitivo — causa <b>350% de ATK</b> em Dano de Vento no inimigo principal.",
      "Consome todas as marcas <b>[Ferrão da Morte]</b> do alvo no momento do disparo — cada marca concede <b>+15% de dano</b> adicional à explosão.",
      "Cria uma <b>Zona de Condução Eletromagnética</b> por <b>1 turno</b> — enquanto ativa, inimigos sofrem explosões automáticas de Vento a cada ação.",
      "━━ <b>Vestígios e Constelações:</b> ━━",
      "<b>[Vestígio: Bankai — Jakuhō Raikōben]</b> Contra alvos com HP abaixo de <b>30%</b>: o disparo é um <b>Crítico Garantido</b> com <b>+30% de dano</b>. A Zona de Condução dura <b>2 turnos</b> em vez de 1.",
      "<b>[C3 · Maestria da Suzumebachi]</b> Multiplicador da Ultimate aumentado em <b>+40%</b>.",
      "<b>[C4 · Aura de Condução]</b> Durante a Zona de Condução, o time inteiro ganha <b>+10% de Taxa Crítica</b>. O dano das explosões da zona sobe para <b>70% do ATK</b> de Soi Fon.",
      "<b>[C6 · Suprema Execução]</b> Eliminar o alvo com a Ultimate recupera <b>100% de Energia</b> e concede <b>+50% de Dano Bônus</b> por 1 turno.",
    ],
  },
  wonderofyou: {
    basic: [
      "Ataque Básico — <b>Toque do Fim</b>: causa Dano de Caos a um único inimigo.",
      "Ganha <b>+1 Ponto de Habilidade</b>.",
      "━━ <b>✦ Talento — A Lei Natural do Infortúnio:</b> ━━",
      "• Sempre que um aliado <b>receber dano</b>: aplica automaticamente um <b>Buff Aleatório</b> que ele ainda não possui.",
      "• Sempre que um inimigo <b>causar dano</b>: recebe um <b>Debuff Especial</b> que ainda não possui.",
      "<b>[A2 · Princípio da Causalidade Infinita]</b> Verifica continuamente o campo e ativa dois estágios progressivos. <b>Estágio 1 — Fluxo da Calamidade</b>: ativado quando cada aliado possui 2+ Buffs Únicos E cada inimigo possui 2+ Debuffs Especiais simultaneamente. Enquanto ativo: todos os aliados ganham <b>+25% ATQ, +20% VEL e +35% Dano Final</b>; todos os inimigos sofrem <b>−25% de Resistência</b> a todos os tipos de dano. <b>Estágio 2 — Destino Absoluto</b>: evolui a partir do Estágio 1 quando todos os inimigos possuem os 4 Debuffs Especiais simultaneamente (Calamidade, Acidente Inevitável, Má Fortuna e Destino Quebrado). Mantém todos os bônus do Estágio 1 e adiciona: <b>+20% de dano</b> em todas as fontes para toda a equipe. Ambos os estágios desativam imediatamente se as condições deixarem de ser atendidas e reativam assim que restauradas.",
      "<b>[A4 · O Mundo Sempre Corrige a Si Mesmo]</b> Opera em dois cenários distintos com efeitos automáticos. <b>Cenário 1 — Ao aplicar Buff</b> (por Perícia, Talento ou Suprema): o aliado que recebeu o Buff <b>imediatamente</b> recupera <b>8 de Energia</b>, avança sua barra de ação em <b>12%</b> e tem <b>1 efeito negativo aleatório removido</b> — os três efeitos ocorrem simultaneamente, independentemente do Buff aplicado. <b>Cenário 2 — Ao aplicar Debuff Especial</b> (por qualquer fonte): o inimigo <b>imediatamente</b> perde <b>10 de Energia</b>, tem sua ação atrasada em <b>15%</b> e sofre <b>Dano Quântico de 90% do ATQ</b> de Wonder of You (não escala com CRIT). <b>Mecanismo de Proteção</b>: se qualquer inimigo tentar remover, dissipar ou neutralizar um Debuff Especial por qualquer meio, o efeito de remoção <b>falha completamente</b> e o inimigo recebe o debuff <b>Colapso Causal</b> por 2 turnos — enquanto ativo, ele recebe <b>+35% de dano</b> de todas as fontes.",
      "<b>[A6 · A Calamidade É Uma Constante Universal]</b> Opera em três camadas simultâneas. <b>Camada 1 — Supremacia dos Buffs</b>: enquanto qualquer aliado possuir os 8 Buffs Únicos ao mesmo tempo, todos os ataques de Wonder of You ignoram <b>35% da DEF</b> do alvo, ela ganha <b>+40% CRIT DMG</b> e cada ataque recupera <b>5 de Energia</b>. <b>Camada 2 — Supremacia dos Debuffs</b>: enquanto qualquer inimigo possuir os 4 Debuffs Especiais ao mesmo tempo, esse inimigo fica <b>completamente bloqueado</b> de receber qualquer bônus de ATQ, DEF, VEL ou RES — se algum buff desse tipo tentar ser aplicado, ele é convertido em <b>+15% de dano recebido</b> por 1 turno. <b>Camada 3 — Acumulador de Calamidade</b>: no início de cada rodada de WoY, por cada tipo de Buff diferente ativo em qualquer aliado, toda a equipe ganha <b>+3% de dano</b>; por cada Debuff Especial ativo em qualquer inimigo, todos os inimigos sofrem <b>−4% de DEF</b>. Ambos acumulam livremente com máximo de <b>24 aplicações cada</b> (máx <b>+72% dano</b> da equipe e <b>−96% DEF</b> dos inimigos em condições perfeitas).",
      "<b>[Arma · Calamidade — A Tragédia Sempre Encontra um Caminho]</b> +30% HP máx. Ao conceder buff: +20% dano do aliado (até 8×). Ao aplicar debuff: −10% DEF do alvo (até 8×).",
    ],
    skill: [
      "Custo: <b>1 Ponto de Habilidade</b>.",
      "━━ <b>Calamidade Inevitável</b> ━━",
      "Concede a todos os aliados <b>8 Buffs Aleatórios Únicos</b> por <b>3 turnos</b>:",
      "• <b>Força do Destino</b> — +40% ATQ.",
      "• <b>Muralha da Causalidade</b> — +35% DEF.",
      "• <b>Passos Impossíveis</b> — +30 de VEL.",
      "• <b>Olhos da Verdade</b> — +25% Taxa de CRIT.",
      "• <b>Golpe Inegável</b> — +50% Dano CRIT.",
      "• <b>Fluxo Infinito</b> — +30% Regeneração de Energia.",
      "• <b>Destino Favorável</b> — +40% de Dano causado.",
      "• <b>Milagre Estatístico</b> — ignora 25% da DEF dos inimigos.",
      "Aplica a todos os inimigos <b>4 Debuffs Especiais Únicos</b> por <b>3 turnos</b> (exclusivos de Wonder of You — não podem ser copiados nem dissipados):",
      "• <b>Calamidade</b> — 50% de chance de atrasar a ação em 40% sempre que o inimigo agir.",
      "• <b>Acidente Inevitável</b> — recebe 40% mais dano de todas as fontes.",
      "• <b>Má Fortuna</b> — 35% de chance de falhar completamente ao atacar.",
      "• <b>Destino Quebrado</b> — −40% ATQ, DEF, RES e VEL simultaneamente.",
      "<b>[E1 · Calamidade Sem Escolha]</b> A Perícia concede todos os 8 Buffs com <b>120% da potência original</b>. Os Debuffs Especiais passam a ignorar <b>35% da Resistência a Efeitos</b>. Cada Buff renovado aumenta sua duração em <b>+1 turno</b> (máx 6).",
      "<b>[E2 · Ser Evitado]</b> Os 4 Debuffs Especiais tornam-se <b>permanentes</b> enquanto WoY estiver vivo — ignoram imunidade, resistência, não podem ser dissipados nem copiados. Ao qualquer inimigo receber outro debuff: um Debuff Especial aleatório é também aplicado.",
      "<b>[E3 · A História Já Foi Escrita]</b> Perícia +2 (máx 15), Ataque Básico +1 (máx 10). Todos os multiplicadores numéricos da Perícia +25%.",
    ],
    ult: [
      "Custo: <b>140 de Energia</b>.",
      "━━ <b>Lei da Calamidade Absoluta</b> ━━",
      "Renova todos os <b>Buffs</b> e <b>Debuffs Especiais</b> ativos.",
      "Todos os aliados recebem um <b>turno imediato</b> (avanço de ação 100%).",
      "Todos os inimigos recebem novamente os <b>4 Debuffs Especiais</b>, ignorando <b>40% da Resistência a Efeitos</b>.",
      "Por <b>2 turnos</b>: qualquer inimigo que atacar sofre <b>Dano de Caos de 350% do ATQ</b> de Wonder of You.",
      "<b>[E4 · O Universo Sempre Cobra Seu Preço]</b> Por Buff diferente na equipe: +6% Dano Final, +4% DEF ignorada, +3 VEL. Por Debuff Especial nos inimigos: +8% Vulnerabilidade, +5% Quebra de Fraqueza, +5% Eficiência de Quebra. Com todos os Buffs e Debuffs ativos ao mesmo tempo: todos os aliados recebem <b>ação adicional ao final do turno</b>.",
      "<b>[E5 · O Infortúnio Não Conhece Limites]</b> Suprema +2 (máx 15), Talento +2 (máx 15). A Suprema também <b>reaplica instantaneamente</b> qualquer Buff ou Debuff perdido durante a batalha.",
      "<b>[E6 · Wonder of U]</b> Todos os Buffs e Debuffs Especiais tornam-se <b>permanentes</b>. Sempre que um inimigo atacar, usar Perícia, invocar unidades, ganhar buffs, recuperar HP, remover debuffs ou avançar ação: sofre imediatamente <b>Julgamento da Calamidade</b> — Dano Quântico <b>650% ATQ</b>, ignora 60% DEF e 50% RES, atraso de ação de <b>40%</b>. Aliados não podem ter buffs removidos; inimigos não podem remover Debuffs Especiais.",
    ],
  },
  athena: {
    basic: [
      "Ataque Básico — <b>Julgamento Divino</b>: causa Dano Holy a um único inimigo e regenera Energia para Athena.",
      "━━ <b>✦ Talento — Eco da Justiça:</b> ━━",
      "• Sempre que Athena usa a Perícia (em qualquer modo), dispara um <b>Eco de Cura</b> em todos os aliados que não foram o alvo principal — <b>50% do valor da cura original</b>.",
      "• Enquanto os buffs das <b>7 Casas</b> estiverem ativos: Athena possui <b>100% de Resistência a Controle de Grupo</b> (Atordoamento, Congelamento, etc.).",
      "<b>[Rastro II · Luz Consagrada]</b> Enquanto Athena estiver no <b>Modo Aprimorado</b> (após a Suprema), seus Ataques Básicos também <b>curam todo o time em 15% do dano causado</b> — permitindo manter sustain mesmo na rotação ofensiva.",
      "<b>[Arma · Cetro da Autoridade Celestial — Sétimo Pilar da Criação]</b> I) +20% de DEF; ao usar a Perícia, o aliado curado ganha <b>Proteção Zodiácal</b> (+12% CRIT DMG por acúmulo, até 3×). II) Se VEL > 140: <b>Vontade da Guardiã</b> — cura +24% e excedente vira <b>Escudo de Absorção</b> por 1 rodada.",
    ],
    skill: [
      "Custo: <b>1 Ponto de Habilidade</b>.",
      "━━ <b>Bênção do Santuário</b> (Modo Padrão) ━━",
      "Cura um aliado alvo com base no <b>ATK + DEF</b> de Athena.",
      "Aplica <b>Armadura de Luz</b>: −15% de dano recebido por <b>2 rodadas</b>.",
      "✦ <b>Eco da Justiça</b> (Talento): todos os aliados não-alvo recebem automaticamente <b>50% do valor da cura</b>.",
      "━━ <b>Golpe do Santuário</b> (Modo Aprimorado — após o Supremo) ━━",
      "Em vez de curar, desfere um golpe que causa Dano Holy: <b>120% do ATK + 80% da VEL atual</b> de Athena.",
      "Reduz a <b>Resistência Holy</b> do inimigo atingido em <b>20%</b> por 2 rodadas.",
      "<b>[Rastro I · Guardiã das Casas]</b> Ao curar um aliado além do HP máximo, o <b>excedente de cura vira Escudo</b> equivalente a <b>50% do valor</b>. Com o Cetro da Autoridade Celestial e VEL > 140, o excedente vira escudo <b>integral</b> (o efeito da arma prevalece).",
      "<b>[C2 · Sinfonia da Velocidade]</b> Sempre que um aliado sob as 7 Casas realizar uma ação, Athena avança sua barra de ação em <b>15%</b>.",
      "<b>[C3 · Domínio de Santuário]</b> Nível da Perícia e do Supremo +2 (máx 15).",
      "<b>[C4 · Justiça Retributiva]</b> Inimigos que atacarem aliados sob efeito do Supremo recebem <b>Julgamento do Santuário</b>: DEF −20%; Chefes sofrem Dano Holy puro baseado em <b>10% da VEL de Athena</b> a cada ação.",
    ],
    ult: [
      "Custo: <b>140 de Energia</b>.",
      "━━ <b>Expansão das 7 Casas — Domínio do Éden</b> ━━",
      "Abre a aba de seleção de aliados — distribua os buffs de forma inteligente ou concentre tudo no Hyper-Carry.",
      "Os aliados selecionados recebem por <b>3 rodadas</b>:",
      "• <b>+30% de VEL</b> · <b>+30% de DEF</b> · <b>+20% de Taxa de CRIT</b>.",
      "Athena entra no <b>Modo Aprimorado</b> por 2 rodadas — Perícia passa a ser <b>Golpe do Santuário</b> (dano + quebra de postura).",
      "<b>[Rastro III · Julgamento das Sete Casas]</b> Ao conjurar a Suprema, o aliado <b>escolhido na aba de seleção</b> recebe <b>+1 Ponto de Ação</b> — sua barra de ação avança instantaneamente para o próximo turno. Funciona <b>1 vez por combate</b>.",
      "<b>[C1 · Arquitetura do Destino]</b> Modo Totalitário: marque 1 aliado como <b>Guardado pelas Casas</b> — ele recebe os buffs em dobro (<b>+60% VEL, +60% DEF, +40% CRIT</b>).",
      "<b>[C5 · Visão do Zodíaco]</b> Nível do Talento e do Ataque Básico +2.",
      "<b>[C6 · Ascensão Divina — O Trono das 7 Casas]</b> O Supremo não tem mais duração limitada enquanto Athena estiver em campo — os buffs das 7 Casas tornam-se <b>Auras Permanentes</b>. A aba de seleção pode ser reaberta a cada 2 turnos sem gastar Energia.",
    ],
  },
};

function SkillList({ def, stats }) {
  const s = def.skill || {}, nm = skillNamesOf(def.id);
  const atk = stats ? Math.round(stats.atk) : null;
  const gold = C.gold;
  function hl(html) { return html.replace(/<b>(.*?)<\/b>/g, `<b style="color:${gold};font-weight:600">$1</b>`); }
  function buildLines(kind) {
    const L = [];
    const charDesc = SKILL_DESC[def.id];
    if (charDesc && charDesc[kind]) return charDesc[kind];
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
function WeaponRow({ w, active, match, lv }) {
  const level = Math.min(Math.max(lv || 1, 1), WEAPON_MAX_LEVEL);
  const wm = weaponLevelMul(level);
  const rarColor = w.rarity === 5 ? C.gold : "#B98BFF";
  const atkVal = Math.round((w.atk || 0) * wm);
  const sec = [];
  if (w.critDmg)     sec.push({ k:"CRIT DMG",  v:(w.critDmg*wm).toFixed(1)+"%" });
  if (w.critRate)    sec.push({ k:"CRIT",       v:(w.critRate*wm).toFixed(1)+"%" });
  if (w.atkPct)      sec.push({ k:"ATK%",       v:(w.atkPct*wm).toFixed(1)+"%" });
  if (w.energyRegen) sec.push({ k:"R.ENERGIA",  v:(w.energyRegen*wm).toFixed(1)+"%" });
  if (w.dmgBonus)    sec.push({ k:"DANO+",      v:(w.dmgBonus*wm).toFixed(1)+"%" });
  if (w.defPen)      sec.push({ k:"PERFUR.",    v:(w.defPen*wm).toFixed(1)+"%" });
  if (w.spd)         sec.push({ k:"VEL",        v:(w.spd*wm).toFixed(1) });
  if (w.def)         sec.push({ k:"DEF",        v:Math.round(w.def*wm) });
  if (w.shieldBonus) sec.push({ k:"ESCUDO",     v:w.shieldBonus+"%" });
  return (
    <div style={{ background: active ? C.panelHi : C.panel, border: `2px solid ${active ? rarColor : C.line}`, borderRadius: 12, padding: 12 }}>
      <div className="flex items-center gap-3" style={{ marginBottom: 8 }}>
        <WeaponIcon w={w} size={44} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="flex items-center justify-between gap-1">
            <b style={{ fontSize: 14, color: rarColor }}>{w.name}</b>
            <Rarity n={w.rarity} />
          </div>
          <div style={{ fontSize: 11, color: C.mute }}>{ROLES[w.role]?.label}{match && <Glow color={C.good}> · combina!</Glow>}</div>
          {lv != null && <div style={{ fontSize: 10, color: C.mute }}>Nivel <b style={{ color: rarColor }}>{level}</b>/{WEAPON_MAX_LEVEL}</div>}
        </div>
      </div>
      <div className="flex flex-wrap" style={{ background: C.bg1, borderRadius: 8, padding: "7px 10px", marginBottom: 8 }}>
        <div style={{ textAlign: "center", paddingRight: 12 }}>
          <div style={{ fontSize: 9, color: C.mute, textTransform: "uppercase", letterSpacing: 0.8 }}>ATK</div>
          <div style={{ fontSize: 19, fontWeight: 800, color: rarColor, lineHeight: 1.1 }}>{atkVal}</div>
        </div>
        {sec.map((s, i) => (
          <div key={i} style={{ textAlign: "center", padding: "0 12px", borderLeft: `1px solid ${C.line}` }}>
            <div style={{ fontSize: 9, color: C.mute, textTransform: "uppercase", letterSpacing: 0.8 }}>{s.k}</div>
            <div style={{ fontSize: 19, fontWeight: 800, color: rarColor, lineHeight: 1.1 }}>{s.v}</div>
          </div>
        ))}
      </div>
      <div style={{ fontSize: 11, color: C.mute, lineHeight: 1.5 }}><b style={{ color: rarColor }}>Passiva: </b>{w.passive}</div>
    </div>
  );
}
function RelicEquip({ o, setOwnedField, relicInv, onUpgradeRelic }) {
  const oc = normChar(o);
  const [pickSlot, setPickSlot] = useState(null);
  const [setFilter, setSetFilter] = useState(null);
  const setR = (slot, relic) => { const r = [...oc.relics]; r[slot] = relic; setOwnedField(o.id, { relics: r }); };
  const subScore = (r) => (r.subs || []).reduce((a, s) => a + s.value, 0) + (r.level || 0) * 2;
  return <Panel>
    <b>Relíquias · 6 slots</b>
    <p style={{ fontSize: 11, color: C.mute, marginTop: 2 }}>Corpo aceita DANO/CRIT como principal. Esfera aceita Dano Elemental (de qualquer elemento) ou Regen de Energia. Corda aceita Regen de Energia ou Perfuração.</p>
    <div className="grid grid-cols-2 gap-2 mt-2">
      {RELIC_SLOTS.map((sl) => { const r = oc.relics[sl.i]; const active = pickSlot === sl.i; return (
        <button key={sl.i} onClick={() => { setPickSlot(active ? null : sl.i); setSetFilter(null); }} className="text-left" style={{ background: active ? C.panel : C.panelHi, border: `1px solid ${active ? C.gold : r ? relicSetData(r.set).color : C.line}`, borderRadius: 12, padding: 10, minHeight: 70 }}>
          <div style={{ fontSize: 11, color: C.mute }}>{sl.i + 1}. {sl.name}</div>
          {r ? <><div style={{ fontSize: 12, fontWeight: 700, color: relicSetData(r.set).color, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{r.set} <span style={{ color: C.mute, fontWeight: 600 }}>+{r.level || 0}</span></div><div style={{ fontSize: 12 }}>{relicMainText(r)}</div><div style={{ fontSize: 10, color: C.mute, lineHeight: 1.35 }}>{(r.subs || []).map((s) => `${relicSubLabel(s)} +${s.value.toFixed(1)}`).join(" · ")}</div></> : <div style={{ color: C.mute, fontSize: 12 }}>vazio · toque p/ equipar</div>}
        </button>); })}
    </div>
    {pickSlot != null && (() => {
      const allOpts = relicInv.filter((r) => r.slot === pickSlot);
      const setsHere = [...new Set(allOpts.map((r) => r.set))];
      const opts = (setFilter ? allOpts.filter((r) => r.set === setFilter) : allOpts).slice().sort((a, b) => subScore(b) - subScore(a));
      const bestId = opts.length ? opts[0].id : null;
      return (
      <div style={{ borderTop: `1px solid ${C.line}`, margin: "12px 0 0", paddingTop: 12 }}>
        <div className="flex items-center justify-between"><b style={{ fontSize: 13 }}>Equipar em {RELIC_SLOTS[pickSlot].name}</b>{oc.relics[pickSlot] && <button onClick={() => { setR(pickSlot, null); }} style={{ color: C.bad, fontSize: 12 }}>remover atual</button>}</div>
        {setsHere.length > 1 && <div className="flex gap-1 flex-wrap mt-2">
          <Chip active={!setFilter} onClick={() => setSetFilter(null)}>Todos</Chip>
          {setsHere.map((s) => <Chip key={s} active={setFilter === s} color={relicSetData(s).color} onClick={() => setSetFilter(s)}>{s}</Chip>)}
        </div>}
        {opts.length === 0 ? <div style={{ color: C.mute, fontSize: 12, marginTop: 8 }}>Nenhuma relíquia deste slot. Farme no Co-op ou no Farm.</div> :
          <div className="grid grid-cols-2 gap-2 mt-2" style={{ maxHeight: 260, overflowY: "auto" }}>
            {opts.map((r) => <button key={r.id} onClick={() => { setR(pickSlot, r); setPickSlot(null); }} className="text-left" style={{ background: C.panel, border: `1px solid ${r.id === bestId ? C.gold : relicSetData(r.set).color + "55"}`, borderRadius: 10, padding: 8, position: "relative" }}>
              {r.id === bestId && <div style={{ position: "absolute", top: 6, right: 6, fontSize: 9, fontWeight: 800, color: C.gold }}>★ MELHOR</div>}
              <div style={{ fontSize: 12, fontWeight: 700, color: relicSetData(r.set).color }}>{r.set} <span style={{ color: C.mute }}>+{r.level || 0}</span></div>
              <div style={{ fontSize: 12 }}>{relicMainText(r)}</div>
              <div style={{ fontSize: 10, color: C.mute, lineHeight: 1.35 }}>{(r.subs || []).map((s) => `${relicSubLabel(s)} +${s.value.toFixed(1)}`).join(" · ")}</div>
              {onUpgradeRelic && r.level < 15 && <div onClick={(e) => { e.stopPropagation(); onUpgradeRelic(r.id); }} className="flex items-center gap-1" style={{ marginTop: 4, fontSize: 11, color: C.gold, fontWeight: 700 }}>⬆ Subir (<ItemIcon id="item_relic_mat" emoji="🔷" size={11} /> Matéria)</div>}
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
   TORRE (200 andares = 78500)
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
function TowerLeaderboard() {
  const [rows, setRows] = React.useState(null);
  React.useEffect(() => {
    cloudReady.then(async () => {
      try {
        if (!Cloud.ready) { setRows([]); return; }
        const { collection, getDocs, query, orderBy, limit } = Cloud.fs;
        const snap = await withTimeout(getDocs(query(collection(Cloud.db, "tower_lb"), orderBy("floor", "desc"), limit(20))), 5000, null);
        if (!snap) { setRows([]); return; }
        const arr = [];
        snap.forEach(d => arr.push(d.data()));
        setRows(arr);
      } catch { setRows([]); }
    });
  }, []);
  if (rows === null) return <div style={{ fontSize: 12, color: C.mute, padding: "8px 0" }}>🏆 Carregando ranking…</div>;
  if (!rows.length) return <div style={{ fontSize: 12, color: C.mute, padding: "8px 0" }}>Nenhum dado de ranking ainda. Seja o primeiro!</div>;
  return (
    <Panel style={{ padding: 12 }}>
      <div style={{ fontWeight: 800, fontSize: 13, marginBottom: 8 }}>🏆 Ranking Global — Torre Estelar</div>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
          <thead>
            <tr style={{ color: C.mute, borderBottom: `1px solid ${C.line}` }}>
              <th style={{ textAlign: "left", padding: "4px 8px" }}>#</th>
              <th style={{ textAlign: "left", padding: "4px 8px" }}>Jogador</th>
              <th style={{ textAlign: "right", padding: "4px 8px" }}>Andar</th>
              <th style={{ textAlign: "right", padding: "4px 8px" }}>Progresso</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => {
              const pct = Math.round((r.floor / TOWER_FLOORS) * 100);
              const medal = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i + 1}.`;
              return (
                <tr key={r.name + i} style={{ borderBottom: `1px solid ${C.line}22`, background: i < 3 ? `${C.gold}08` : "transparent" }}>
                  <td style={{ padding: "5px 8px", color: i < 3 ? C.gold : C.mute, fontWeight: i < 3 ? 700 : 400 }}>{medal}</td>
                  <td style={{ padding: "5px 8px", fontWeight: 600 }}>{r.name}</td>
                  <td style={{ padding: "5px 8px", textAlign: "right", color: C.gold, fontWeight: 700 }}>{r.floor}</td>
                  <td style={{ padding: "5px 8px", textAlign: "right", color: C.mute }}>{pct}%</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}
function DarkTowerScreen({ darkTowerCleared, darkTowerClaimed, start, team, flash }) {
  const totalReward = DARK_TOWER_BOSSES.reduce((a, b) => a + b.reward, 0);
  const earned = darkTowerClaimed.reduce((a, l) => a + ((DARK_TOWER_BOSSES[l - 1] && DARK_TOWER_BOSSES[l - 1].reward) || 0), 0);
  return (
    <div className="flex flex-col gap-4">
      <Panel glow="#B98BFF" style={{ position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", inset: 0, background: "radial-gradient(420px 200px at 85% 0%, #B98BFF22, transparent)" }} />
        <div style={{ position: "relative" }}>
          <div style={{ ...ORB, fontSize: 20, fontWeight: 800 }}>🌑 Torre Sombria</div>
          <div style={{ fontSize: 13, color: C.mute, marginTop: 4 }}>40 níveis, cada um contra um único chefe de HP altíssimo. Todos IGNORAM escudos do seu time — não dá pra tankar, só sobreviver e furar. Alguns ainda infectam seus personagens com DoTs periodicamente. Cada chefe resiste a TODOS os elementos menos 1 fraqueza única. <b style={{ color: "#FF6B82" }}>Limite de 10 Ciclos</b> — não derrotar o chefe a tempo é derrota automática. <Glow color="#B98BFF">{totalReward.toLocaleString("pt-BR")}💎 totais</Glow>.</div>
          <div className="flex items-center gap-3 mt-3" style={{ fontSize: 13 }}><span>Progresso: <b style={{ color: "#B98BFF" }}>{darkTowerCleared}/{DARK_TOWER_BOSSES.length}</b></span><span>Gemas ganhas: <b style={{ color: "#86d8ff" }}>{earned.toLocaleString("pt-BR")}/{totalReward.toLocaleString("pt-BR")}</b></span></div>
          <Bar value={earned} max={totalReward} color="#B98BFF" />
        </div>
      </Panel>
      {darkTowerCleared > 0 && darkTowerCleared < DARK_TOWER_BOSSES.length && (() => { const nextLvl = darkTowerCleared + 1; const nb = DARK_TOWER_BOSSES[nextLvl - 1]; return (
        <button onClick={() => { if (!team.length) { flash("Monte uma equipe antes!", "#FF6464"); return; } start(nextLvl); }}
          style={{ background: "linear-gradient(135deg,#B98BFF,#7b2fc9)", color: "#1a1000", border: "none", borderRadius: 14, padding: "14px 20px", fontWeight: 800, fontSize: 15, cursor: "pointer", boxShadow: "0 0 28px #B98BFF66", display: "flex", alignItems: "center", gap: 14, width: "100%" }}>
          <span style={{ fontSize: 22 }}>🌑</span>
          <span style={{ flex: 1, textAlign: "left" }}>Próximo Nível · {nb?.name || ""}</span>
          <span style={{ background: "rgba(0,0,0,0.25)", borderRadius: 10, padding: "4px 14px", fontSize: 22, fontWeight: 900 }}>{nextLvl}</span>
        </button>
      ); })()}
      <div className="flex flex-col gap-2">
        {DARK_TOWER_BOSSES.map((bd, i) => {
          const lvl = i + 1; const cleared = darkTowerCleared >= lvl; const locked = lvl > darkTowerCleared + 1;
          const el = ELEMENTS[bd.element] || { color: C.line, glyph: "✦" };
          return (
            <button key={lvl} disabled={locked} onClick={() => { if (!team.length) { flash("Monte uma equipe antes!", "#FF6464"); return; } start(lvl); }}
              style={{ textAlign: "left", display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", borderRadius: 14, border: `2px solid ${cleared ? "#74E8A6" : locked ? C.line : "#B98BFF"}`, background: cleared ? "#0d2317" : locked ? C.panel : "linear-gradient(135deg,#1c1233,#0e0a1c)", cursor: locked ? "not-allowed" : "pointer", opacity: locked ? 0.5 : 1 }}>
              <div style={{ fontSize: 26, width: 40, textAlign: "center" }}>{cleared ? "✅" : locked ? "🔒" : "🌑"}</div>
              <div style={{ flex: 1 }}>
                <div style={{ ...ORB, fontWeight: 800, fontSize: 14 }}>Nível {lvl} · {bd.name}</div>
                <div style={{ fontSize: 11, color: el.color }}>{el.glyph} {bd.element} · resiste a tudo, fraco a <b style={{ color: (ELEMENTS[bd.weak[0]] || {}).color }}>{bd.weak[0]}</b>{bd.dot ? ` · aplica ${DOT_INFO[bd.dot]?.n || bd.dot}` : ""} · ignora escudo</div>
              </div>
              <div style={{ fontWeight: 800, color: "#F6C95B", fontSize: 13 }}>+{bd.reward}💎</div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
function Tower({ towerCleared, towerClaimed, start, team, flash }) {
  const earned = towerClaimed.reduce((a, f) => a + rewardFor(f), 0);
  const totalReward = 78500; // soma total de todos os andares 1-200
  return (
    <div className="flex flex-col gap-4">
      <Panel glow={C.gold} style={{ position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", inset: 0, background: "radial-gradient(420px 200px at 85% 0%, #6FE3FF22, transparent)" }} />
        <div style={{ position: "relative" }}>
          <div style={{ ...ORB, fontSize: 20, fontWeight: 800 }}>🗼 Torre Estelar</div>
          <div style={{ fontSize: 13, color: C.mute, marginTop: 4 }}>{TOWER_FLOORS} andares · andares do 10 em 10 são chefes com IA avançada · andares 100+ dropam materiais de arma e relíquia · <Glow color={C.gold}>{totalReward.toLocaleString("pt-BR")}💎 totais</Glow>.</div>
          <div className="flex items-center gap-3 mt-3" style={{ fontSize: 13 }}><span>Progresso: <b style={{ color: C.gold }}>{towerCleared}/{TOWER_FLOORS}</b></span><span>Gemas ganhas: <b style={{ color: "#86d8ff" }}>{earned.toLocaleString("pt-BR")}/{totalReward.toLocaleString("pt-BR")}</b></span></div>
          <Bar value={earned} max={totalReward} color={C.gold} />
        </div>
      </Panel>
      {towerCleared > 0 && towerCleared < TOWER_FLOORS && (
        <button onClick={() => { if (!team.length) { flash("Monte uma equipe antes!", "#FF6464"); return; } start(towerCleared + 1); }}
          style={{ background: "linear-gradient(135deg," + C.gold + ",#FF8800)", color:"#1a1000", border:"none", borderRadius:14, padding:"14px 20px", fontWeight:800, fontSize:15, cursor:"pointer", boxShadow:"0 0 28px " + C.gold + "66", display:"flex", alignItems:"center", gap:14, width:"100%" }}>
          <span style={{ fontSize:22 }}>⚔️</span>
          <span style={{ flex:1, textAlign:"left" }}>Proximo Andar</span>
          <span style={{ background:"rgba(0,0,0,0.25)", borderRadius:10, padding:"4px 14px", fontSize:22, fontWeight:900 }}>{towerCleared + 1}</span>
        </button>
      )}
      {towerCleared >= TOWER_FLOORS && (
        <div style={{ background:"linear-gradient(135deg,#FFD700,#FF8C00)", color:"#1a1000", borderRadius:14, padding:"14px 20px", fontWeight:800, fontSize:15, textAlign:"center" }}>
          Torre Estelar Conquistada! Todos os {TOWER_FLOORS} andares concluidos.
        </div>
      )}
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
        <div style={{ fontSize: 11, color: C.mute, marginTop: 10 }}>Toque no andar liberado (dourado) para batalhar. Andares <b>não podem ser repetidos</b> após a vitória. A partir do andar 100, cada vitória também dropa materiais de arma (⚙️) e relíquia (🔷).</div>
      </Panel>
      <TowerLeaderboard />
    </div>
  );
}

/* ==========================================================================
   MOTOR DE COMBATE
   ========================================================================== */
const SAFE_STATS = { hp: 1000, atk: 500, def: 300, spd: 100, critRate: 5, critDmg: 50, dmgBonus: 0, energyRegen: 0, healBonus: 0, defPen: 0, dotDmg: 0, breakEffect: 0, breakEff: 0, elem: {}, energyMax: 120, baseHp: 1000, baseAtk: 500, baseDef: 300 };
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
  for (const sName in setCount) { const sd = RELIC_SETS[sName]; if (!sd) continue; if (setCount[sName] >= 2 && sd.flag2) flags[sd.flag2] = true; if (setCount[sName] >= 4 && sd.flag4) flags[sd.flag4] = true; if (setCount[sName] >= 6 && sd.flag6) flags[sd.flag6] = true; }
  return {
    uid: side + idx, side, id: o.id, name: def.name, avatar: def.avatar, element: def.element, role: ROLES[def.role].key || def.role,
    roleKey: def.role, skill: def.skill, eidolon: o.eidolon || 0, level: o.level || 1,
    tBasic: traceMul(tr.basic), tSkill: traceMul(tr.skill), tUlt: traceMul(tr.ult), stFlags: flags,
    ampBasic: ampB, ampSkill: ampS, ampUlt: ampU, dragons: 0,
    base: stats, hp: Math.round(stats.hp), maxHp: Math.round(stats.hp), shield: 0,
    energy: Math.round(stats.energyMax * 0.2), energyMax: stats.energyMax,
    av: (flags.pSwift ? 0.5 : 1) * 10000 / Math.max(1, stats.spd),
    buffs: (o.weapon?.buff?.spdThreshold && stats.spd > o.weapon.buff.spdThreshold.spd)
      ? [{ stat: "spd", value: o.weapon.buff.spdThreshold.spdBonus || 16, pct: false, turns: 9999, name: "VontadeGuardiã" }]
      : [],
    debuffs: [], dots: [], alive: true,
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
  // Servos de um Rei (2pç): +10% na taxa de conversão de ATK/VEL herdados do portador pela Invocação
  const convBonus = f.setServos2 ? 1.10 : 1;
  const atkMulFinal = cfg.atkMul * convBonus;
  const spdFinal = Math.min(220, Math.round((cfg.spd || 100) * convBonus));
  const atk = effStat(owner, "atk") * atkMulFinal * bonus;
  const hp = Math.round(owner.maxHp * cfg.hpMul);
  // Servos de um Rei (2pç): +15% de Dano causado por Invocações. Base geral de dano das invocações também subiu (+25%).
  const summonDmgBonus = 25 + (f.setServos2 ? 15 : 0);
  return {
    uid: cfg.uid, side: "H", id: cfg.imgKey || "summon", imgId: cfg.imgKey || null, name: cfg.name, avatar: cfg.avatar,
    element: cfg.elements ? cfg.elements[0] : owner.element, elements: cfg.elements || null,
    roleKey: "summon", isSummon: true, auto: true, kind: cfg.kind, mul: cfg.mul, ownerUid: owner.uid, firstHit: cfg.kind === "dragon",
    level: owner.level, life: cfg.life || Infinity, stFlags: {}, tBasic: 1, tSkill: 1, tUlt: 1,
    // Regra do Duelista (Talento): a Invocação herda 100% da Taxa/Dano Crítico EFETIVOS de Kaiba (não só o base) — era aqui que o Talento falhava
    base: { atk, def: effStat(owner, "def") * 0.5, spd: spdFinal, critRate: effStat(owner, "critRate"), critDmg: effStat(owner, "critDmg"), dmgBonus: (owner.base.dmgBonus || 0) + summonDmgBonus, elemBonus: owner.base.elemBonus || 0, hp, energyMax: 0 },
    hp, maxHp: hp, shield: 0, energy: 0, energyMax: 0, av: 10000 / Math.max(1, spdFinal), buffs: [], debuffs: [], dots: [], alive: true, weapon: null,
    _servosOwner: f.setServos2 || f.setServos4 ? owner.uid : null, _hasServos4: !!f.setServos4,
  };
}
function aliveDragons(s, uid) { return s.heroes.filter((h) => h.isSummon && h.kind === "dragon" && h.ownerUid === uid && h.alive); }
function activeMonster(s, uid) { return s.heroes.find((h) => h.isSummon && h.kind === "monster" && h.ownerUid === uid && h.alive) || null; }
function refreshKaibaBuffs(s) {
  const k = s.heroes.find((h) => h.id === "kaiba" && h.alive);
  if (!k) return;
  const mon = activeMonster(s, k.uid);
  k.buffs = k.buffs.filter((b) => b.name !== "Regra do Duelista" && b.name !== "Soberania" && b.name !== "Cemitério");
  // Talento: -30% de dano sofrido enquanto houver Monstro ativo (ele "intercepta" sem ter HP próprio)
  if (mon) k.buffs.push({ stat: "dmgReduce", value: 30, turns: 99, name: "Regra do Duelista" });
  // S1: cada monstro no Cemitério dá +10% Regen de Energia e +15% CRIT DMG às invocações ativas
  const graveN = (k._kaibaGraveyard || []).length;
  if (k.stFlags?.kaibaS1 && graveN > 0) {
    k.buffs.push({ stat: "energyRegen", value: 10 * graveN, turns: 99, name: "Cemitério" });
    if (mon) mon.buffs = mon.buffs.filter(b => b.name !== "Cemitério"), mon.buffs.push({ stat: "critDmg", value: 15 * graveN, turns: 99, name: "Cemitério" });
  }
  // S6: cada monstro no Cemitério dá +8% CRIT / +16% CRIT DMG fixo às invocações ativas
  if (k.stFlags?.kaibaS6 && graveN > 0 && mon) {
    mon.buffs.push({ stat: "critRate", value: 8 * graveN, turns: 99, name: "Cemitério" });
    mon.buffs.push({ stat: "critDmg", value: 16 * graveN, turns: 99, name: "Cemitério" });
  }
}
function makeEnemy(idx, enc) {
  const lvl = enc.level, boss = enc.boss && idx === 0, finalBoss = enc.finalBoss && idx === 0, weekly = enc.weekly && idx === 0, ascend = enc.ascend && idx === 0;
  const power = enc.teamPower || 2500;
  let baseHp;
  if (enc.tagDungeon) {
    // HP fixo baseado no nível — não escala com poder do time (estilo HSR)
    // Ondas regulares têm HP substancialmente maior que dungeons de farm
    baseHp = 210 * Math.pow(lvl, 1.26) + idx * 400;
    if (boss) baseHp *= 4.0; // Guardião da Tag (rebalance: -27%)
  } else {
    // HP atrelado ao PODER da equipe (invariante de escala) — mantém a luta justa mesmo após o rebalanceamento HSR
    baseHp = power * 1.8 + lvl * 40 + idx * 120;
    if (enc.relicFarm) baseHp *= 0.20; // Dungeon de relíquias: bem mais rápida
    if (enc.ascend) baseHp *= 0.35; // Dungeon de ascensão: mais acessível
    // Torre: NPCs do andar 90+ têm HP escalado (1× no 90 → 5× no 200)
    if (enc.isTower && !boss) {
      const f = enc.floor || enc.level;
      if (f >= 90) baseHp *= 1 + (f - 90) / 110 * 4;
    }
    // Torre: HP dos chefes escala exponencialmente — andar 200 = exatamente 5.000.000 HP
    if (enc.isTower && boss) {
      const f = enc.floor || enc.level;
      baseHp = f === 200 ? 5000000 : Math.round(118000 * Math.pow(10, (f - 50) / 105));
    } else if (boss) {
      baseHp *= enc.darkTower ? (enc.darkTowerHpMul || 6) : (finalBoss ? 7.0 : weekly ? 7.0 : ascend ? 2.4 : enc.relicFarm ? 0.85 : 4.0);
    }
  }
  const hp = Math.round(baseHp);
  const towerFloorForAtk = enc.floor || enc.level || 50;
  const atkReduce = enc.relicFarm ? 0.70 : enc.ascend ? 0.45 : enc.isTower ? (towerFloorForAtk >= 100 ? (boss ? 0.95 : 0.72) : 0.60) : 1.0;
  // Dungeons e Torre escalam o ATK para garantir dano de 500–4.000 por hit nos heróis
  const dungeonAtkMult = enc.tagDungeon ? 1.38 : enc.isTower ? Math.min(1.55, 0.9 + Math.max(0, (enc.floor || enc.level || 50) - 50) / 130) : enc.espiral ? 1.3 : enc.abismo ? 1.25 : 1.5;
  const atk = Math.round((power * 0.052 + lvl * 3.5 + 70) * (boss ? 1.3 : 1) * atkReduce * dungeonAtkMult);
  const def = Math.round(power * 0.035 + lvl * 3 + (boss ? power * 0.03 : 0));
  const spd = 102 + idx * 3 + (boss ? 14 : 4);
  if (enc.bossRush && idx === 0) { const bd = BOSS_RUSH_BOSSES.find(function(b){return b.id===enc.bossId;}); if (bd) { const atkBr = Math.round(3300 + (enc.level||90) * 11); const defBr = Math.round(2450 + (enc.level||90) * 8); return { uid: "E0", side: "enemy", name: bd.name, bossTitle: bd.lore, bossImgId: bd.imgKey, avatar: bd.avatar, element: bd.element, level: bd.level, roleKey: "dps", bossKind: bd.kind, boss: true, finalBoss: false, weekly: false, ascend: false, elite: false, res: bd.res || [], weak: bd.weak || [], base: { atk: atkBr, def: defBr, spd: 112, critRate: 15, critDmg: 60, dmgBonus: 0 }, hp: bd.hp, maxHp: bd.hp, shield: 0, av: 10000 / 112, buffs: [], debuffs: [], dots: [], alive: true, actCount: 0, _hasToughness: (bd.weak || []).length > 0, toughness: 150, maxToughness: 150 }; } }
  const bossEl = enc.bossElement || pick(ELEMENT_NAMES);
  const name = ascend ? (enc.bossName || "Guardião da Ascensão") : weekly ? (enc.bossName || "Tirano do Vazio") : finalBoss ? "Soberano do Vazio" : boss ? "Guardião do Andar" : "Aberração " + (idx + 1);
  // Alguns chefes têm RESISTÊNCIA (1-3 elementos) e FRAQUEZA (1-2 elementos)
  let res = [], weak = [];
  // Prioriza res/weak já resolvidos por andar (enc.bossRes/enc.bossWeak definidos em towerEncounter)
  const _tbd = (enc.bossRes || enc.bossWeak) ? null : (enc.bossKind ? Object.values(TOWER_BOSSES).find(b => b.bossKind === enc.bossKind) : null);
  if (enc.bossRes || enc.bossWeak) { res = [...(enc.bossRes || [])]; weak = [...(enc.bossWeak || [])]; }
  else if (_tbd) { res = [...(_tbd.res || [])]; weak = [...(_tbd.weak || [])]; }
  else if (boss && Math.random() < 0.7) {
    const poolE = [...ELEMENT_NAMES]; res.push(bossEl); poolE.splice(poolE.indexOf(bossEl), 1);
    const nRes = Math.floor(Math.random() * 2);
    for (let i = 0; i < nRes && poolE.length; i++) { res.push(poolE.splice(Math.floor(Math.random() * poolE.length), 1)[0]); }
    if (Math.random() < 0.4 && poolE.length) res.push(poolE.splice(Math.floor(Math.random() * poolE.length), 1)[0]);
    const nWeak = 1 + Math.floor(Math.random() * 2);
    for (let i = 0; i < nWeak && poolE.length; i++) { weak.push(poolE.splice(Math.floor(Math.random() * poolE.length), 1)[0]); }
  }
  // Soberano da Espiral (Extremo/Ápice): vida massivamente aumentada
  const _espLordMul = (enc.bossKind === "espiral_lord" && (boss || finalBoss) && idx === 0) ? (enc.espiralLordHpMul || 2.2) : 1;
  const _finalHp = Math.round(hp * _espLordMul);
  return {
    uid: "E" + idx, side: "enemy", name: enc.bossName && (boss || finalBoss) && idx === 0 ? enc.bossName : name, bossTitle: enc.bossTitle || null, bossImgId: enc.bossImgId || null, avatar: ascend ? "🗿" : weekly ? "🦂" : finalBoss ? "🕳️" : boss ? "👑" : ["👾", "👹", "🐲"][idx % 3],
    element: (enc.bossElement && (boss || finalBoss) && idx === 0) ? enc.bossElement : (boss ? bossEl : pick(ELEMENT_NAMES)), level: lvl, roleKey: "dps", bossKind: (idx === 0 ? enc.bossKind : null) || (finalBoss ? "void" : weekly ? "venom" : ascend ? "stone" : "guardian"),
    boss: boss || weekly || ascend, finalBoss, weekly, ascend, elite: !boss && lvl >= 18 && idx === 0, res, weak,
    base: { atk, def, spd, critRate: boss ? 12 : 6, critDmg: 55, dmgBonus: 0 },
    hp: _finalHp, maxHp: _finalHp, shield: 0, av: 10000 / Math.max(1, spd), buffs: [], debuffs: [], dots: [], alive: true, actCount: 0,
    // ── Perfuração (Toughness): apenas Chefes/Elites com fraqueza definida têm barra de Resistência ──
    _hasToughness: (boss || (!boss && lvl >= 18 && idx === 0)) && weak.length > 0,
    _ignoresShield: !!(enc.darkTower && idx === 0), _darkTowerDot: (enc.darkTower && idx === 0) ? (enc.darkTowerDot || null) : null,
    toughness: (boss || (!boss && lvl >= 18 && idx === 0)) ? Math.round(80 + (finalBoss ? 100 : weekly ? 70 : ascend ? 20 : boss ? 40 : 0)) : 0,
    maxToughness: (boss || (!boss && lvl >= 18 && idx === 0)) ? Math.round(80 + (finalBoss ? 100 : weekly ? 70 : ascend ? 20 : boss ? 40 : 0)) : 0,
  };
}
function effStat(u, key) {
  const b0 = (u && u.base) || {};
  let base = b0[key] || 0, flat = 0, pct = 0;
  for (const b of (u.buffs || [])) if (b.stat === key) { if (b.pct) pct += b.value || 0; else flat += b.value || 0; }
  for (const b of (u.debuffs || [])) if (b.stat === key) { if (b.pct) pct += b.value || 0; else flat += b.value || 0; }
  // Ignis: chamas negras consomem a força ofensiva — ATK -10% enquanto ativo
  if (key === "atk" && u && (u.dots || []).some(d => d.type === "burn")) pct -= 10;
  // Aero Sunder: cada acúmulo reduz a DEF em 8% (máx 40%)
  if (key === "def" && u && u.dots) { const _ae = Math.min(5, u.dots.filter(d => d.type === "aero").length); if (_ae > 0) pct -= _ae * 8; }
  // Uraraka (Rastro Lâmina): +15% DEF enquanto HP > 50%
  if (key === "def" && u && u.stFlags && u.stFlags.uraDefBuffer && u.maxHp && u.hp / u.maxHp > 0.5) pct += 15;
  // Cetro da Autoridade Celestial: Aura de Santuário (+20% DEF); Fluxo de Atena (+16 VEL quando VEL > 140)
  if (u && u.weapon && u.weapon.buff && u.weapon.buff.athWeapon) {
    if (key === "def") pct += 20;
    if (key === "spd") {
      const th = u.weapon.buff.spdThreshold;
      const rawSpd = PCT[key] ? base * (1 + pct / 100) + flat : base + flat + pct;
      if (th && rawSpd > th.spd && th.spdBonus) flat += th.spdBonus;
    }
  }
  // Relâmpago Fugaz (Yoruichi): Passo Fantasma — +12% da VEL total
  if (key === "spd" && u && u.weapon?.buff?.yoruWeapon) { const raw = base + flat + pct; flat += raw * 0.12; }
  // Hitori Gotoh: a cada 2-3% de Dano Crítico, +1 de VEL (Ansiedade Amplificada)
  if (key === "spd" && u && u.id === "hitori") flat += hitoriSpdBonus(u);
  const v = PCT[key] ? base * (1 + pct / 100) + flat : base + flat + pct;
  return isFinite(v) ? v : base;
}
function vulnOf(u) { let v = 0; for (const b of u.debuffs) if (b.stat === "vuln") v += b.value; return v; }
function defMult(attacker, defenderDef) { const lvl = (attacker && attacker.level) || 50; const d = Math.max(0, defenderDef || 0); return 1 - d / (d + 200 + 10 * lvl); }
/* ---------- BOSS RUSH BOSSES ---------- */
const BOSS_RUSH_BOSSES = [
  {
    id: "aizen", name: "Sōsuke Aizen", avatar: "\uD83D\uDDE1\uFE0F", imgKey: "boss_aizen",
    hp: 1300000, element: "Holy", reward: 1000,
    lore: "O Shinigami traidor que forjou seu proprio trono no vazio entre os mundos. Kyoka Suigetsu distorce ate a propria realidade dos sentidos.",
    mechanics: [
      "A cada 3 acoes usa Completude Hipnotica: hipnotiza o time, causando dano Holy e reduzindo a Precisao.",
      "Abaixo de 50% de HP ativa Bankai: Contra-Feitico ganha alcance total, paralisando quem o atacar.",
      "Ignora parcialmente Escudos ao atacar (a ilusao passa direto pelas defesas).",
    ],
    kind: "aizen", weak: ["Fogo", "Virus"], res: ["Glacial"], level: 92,
  },
  {
    id: "godkaiba", name: "Seto Kaiba · Modo Deus", avatar: "\uD83D\uDC09", imgKey: "boss_kaiba",
    hp: 1500000, element: "Eletro", reward: 1000,
    lore: "Kaiba fundiu sua alma ao Obelisco, o Atormentador. Um soberano dracônico que nao aceita a derrota como opcao.",
    mechanics: [
      "Ergue Radiacao do Obelisco: escudo massivo e aplica Vulnerabilidade permanente ao time.",
      "Golpes dracônicos ignoram parte da DEF e escalam com o HP perdido.",
      "RESISTENTE A HOLY — evite depender só de dano sagrado contra ele.",
    ],
    kind: "godkaiba", weak: ["Fogo", "Virus"], res: ["Eletro", "Holy"], level: 94,
  },
  {
    id: "void_sovereign", name: "Soberano do Vazio", avatar: "\uD83C\uDF11", imgKey: "boss_void",
    hp: 1900000, element: "Chaos", reward: 1200,
    lore: "Uma fenda consciente na realidade. Cada rodada que passa, ele apaga um pouco mais do que os herois construiram.",
    mechanics: [
      "Fase 2 (abaixo de 60% HP): Eclipse Total — ATK/DEF/VEL sobem e anula buffs temporarios do time.",
      "Pulso do Vazio a cada 3 acoes: dano em area + remove um buff aleatorio de cada aliado.",
      "RESISTENTE A HOLY — assim como o Obelisco, absorve dano sagrado dos fiéis.",
    ],
    kind: "void_sovereign", weak: ["Holy"], res: ["Chaos", "Virus", "Holy"], level: 96,
  },
];
// Recompensa total do Boss Rush (3 chefes, 100% de conclusão): 1000 + 1000 + 1200 = 3.200💎

const DOT_INFO = {
  burn: { c: "#FF6B45", n: "Ignis" },                 // Rework: chamas negras — dano capado em 10% do HP atual + ATK -10% enquanto ativo
  poison: { c: "#A6E22E", n: "Veneno" },
  shock: { c: "#B98BFF", n: "Choque" },
  bleed: { c: "#FF5FC4", n: "Sangramento" },          // Rework (Limbus): não dá tick — o alvo sofre o dano QUANDO ATACA (cap 8% do HP atual por golpe)
  freeze: { c: "#6FE3FF", n: "Glacier" }, geada: { c: "#6FE3FF", n: "Glacier" }, // Rework: DoT de DPS — tick cheio, acumula 3×, +6% de dano Glacial recebido por camada; na 3ª camada QUEBRA DE GELEIRA (nuke, cap 25% HP)
  sinking: { c: "#7EA8FF", n: "Afundamento" },        // Limbus: sem tick — o alvo sofre dano fixo e perde 4 de energia QUANDO É ATINGIDO (Count -1 por golpe)
  corrosao: { c: "#7CFFB0", n: "Corrosão" }, cyclone: { c: "#74E8A6", n: "Ciclone" },
  fulgur: { c: "#FFE45B", n: "Fulgur Resonance" },    // Eletro: hits diretos no alvo drenam 3 de energia e ricocheteiam arco (máx 4/rodada)
  aero: { c: "#9FF5C8", n: "Aero Sunder" },           // Vento: acumula até 5 — cada acúmulo DEF -8%; no 5º, colapso atrasa a ação em 20% (cd interno 2 rodadas)
};
// ══════════════ SISTEMA DE PERFURAÇÃO (Toughness Break, estilo HSR) ══════════════
// Elemento → efeito de Perfuração aplicado quando a Resistência do inimigo é zerada
function applyBreakEffect(attacker, defender, el, fx) {
  const be = effStat(attacker, "breakEffect") || 0; // Efeito de Perfuração: amplifica dano/atraso/DoT da quebra, não a velocidade da quebra
  const lvl = attacker.level || 50;
  const breakDmg = Math.max(1, Math.round(defender.maxToughness * (3 + lvl * 0.05) * (1 + be / 100)));
  defender.hp = Math.max(0, defender.hp - breakDmg);
  if (defender.hp <= 0) defender.alive = false;
  fx.push({ uid: defender.uid, txt: "💢 PERFURAÇÃO! " + breakDmg, crit: true, id: Math.random(), el });
  if (!defender.alive) return;
  // Atraso de ação base +25%; Holy/Chaos/Glacial escalam com o Efeito de Perfuração (cap 3.5x total)
  const isControl = el === "Holy" || el === "Chaos" || el === "Glacial";
  const delayMul = isControl ? Math.min(3.5, 1.25 * (1 + Math.min(2, be / 100))) : 1.25;
  defender.av = (defender.av || 1) * delayMul;
  // Efeito elemental específico
  if (el === "Fogo") {
    const m = Math.max(1, Math.round(effStat(attacker, "atk") * 0.35 * (1 + be / 100)));
    defender.dots.push({ type: "burn", dmg: m, turns: 2 });
  } else if (el === "Vento") {
    if (defender.dots.filter(d => d.type === "aero").length < 5) defender.dots.push({ type: "aero", dmg: Math.max(1, Math.round(effStat(attacker, "atk") * 0.16 * (1 + be / 100))), turns: 3 });
  } else if (el === "Glacial") {
    defender.dots.push({ type: "freeze", dmg: Math.max(1, Math.round(effStat(attacker, "atk") * 0.20 * (1 + be / 100))), turns: 2 });
  } else if (el === "Holy") {
    defender.debuffs.push({ stat: "spd", value: -20, pct: true, turns: 2, name: "Julgamento Divino" });
  } else if (el === "Virus") {
    defender.dots.push({ type: "poison", dmg: Math.max(1, Math.round(effStat(attacker, "atk") * 0.22 * (1 + be / 100))), turns: 2 });
    defender.debuffs.push({ stat: "def", value: -15, pct: true, turns: 2, name: "Corrupção" });
    defender.debuffs.push({ stat: "atk", value: -15, pct: true, turns: 2, name: "Corrupção" });
  } else if (el === "Eletro") {
    if (!defender.dots.some(d => d.type === "fulgur")) defender.dots.push({ type: "fulgur", dmg: Math.max(1, Math.round(effStat(attacker, "atk") * 0.20 * (1 + be / 100))), turns: 2 });
  } else if (el === "Chaos") {
    defender.debuffs = defender.debuffs.filter(d => d.name !== "Colapso Entrópico");
    defender.debuffs.push({ stat: "mark", value: 0, turns: 2, name: "Colapso Entrópico" });
    defender._chaosHits = 0; defender._chaosBaseAtk = effStat(attacker, "atk"); defender._chaosBE = be;
  }
  defender._broken = true;
  // Shorekeeper — Estelarador Estágio 3 (Supernova): se um aliado com Vantagem Universal ativa quebra a Firmeza durante o Estágio 2
  if (attacker.side === "H" && attacker._universalAdvActive) {
    const shkH = (attacker._sibs || []).find(h => h.id === "shorekeeper" && h.alive);
    if (shkH && shkH._domainStage === 2) {
      shkH._domainStage = 3; // consome — só dispara 1x por ativação do domínio
      const allE = defender._sibs || [defender];
      let totNuke = 0;
      allE.filter(e => e.alive).forEach(e => {
        const nukeMul = (shkH.maxHp * (shkH.stFlags?.shkC6 ? 6.6 : 3.3) / Math.max(1, effStat(shkH, "atk"))) * 100; // C6 dobra: 330%→660% do HP
        const rN = dealDamage(shkH, e, nukeMul, fx, { el: "Unknown", isDot: true }); // isDot:true evita reprocessar toughness/universalAdv em loop
        totNuke += rN.dmg;
        e.av = (e.av || 1) * 1.4;
      });
      fx.push({ uid: shkH.uid, txt: "🌌💥 SUPERNOVA! " + totNuke, crit: true, id: Math.random(), el: "Unknown" });
    }
  }
}
// ── CAP GLOBAL DE ESCUDO (jogador): 4.000 por personagem. Ao atingir o teto, não é possível
// adicionar mais escudo até ele zerar por completo (evita empilhamento infinito de escudo).
const SHIELD_CAP = 7000;
function capShieldAdd(u, amt, customCap) {
  if (!u || amt <= 0) return 0;
  const cap = customCap || SHIELD_CAP;
  const cur = u.shield || 0;
  if (cur >= cap) return 0;
  return Math.max(0, Math.min(amt, cap - cur));
}
// Yoruichi — Frequência Shunpo: reage a Ataques Extras de qualquer aliado (contra-ataques da equipe)
function yoruFollowupProc(follower, enemyTarget, dmgDealt, fx) {
  if (!follower || follower.side !== "H" || !enemyTarget || !enemyTarget.alive) return;
  const yoru = (follower._sibs || []).find(h => h.id === "yoruichi" && h.alive);
  if (!yoru || yoru.uid === follower.uid) return;
  const ySpd = effStat(yoru, "spd"), yAtk = Math.max(1, effStat(yoru, "atk"));
  // Rastro Especial 1 · Passo de Sombra: Ataque Extra aliado avança a ação dela em 6% (máx 3× entre os turnos dela)
  if (yoru.stFlags?.yoruT1 && (yoru._yoruT1Uses || 0) < 3) { yoru._yoruT1Uses = (yoru._yoruT1Uses || 0) + 1; yoru.av = Math.max(0.01, (yoru.av || 1) * 0.94); }
  // Rastro Especial 3 · Relâmpago Causal: se a VEL dela for maior que a do alvo, ignora 18% de DEF
  const t3DefPen = (yoru.stFlags?.yoruT3 && ySpd > effStat(enemyTarget, "spd")) ? 18 : 0;
  const cloneMul = (ySpd * 5.0 / yAtk) * 100; // Clone Residual: 500% da VEL
  const cr = dealDamage(yoru, enemyTarget, cloneMul, fx, { el: "Eletro", isYoruClone: true, breakW: 1, defPen: t3DefPen });
  yoru._yoruClones = (yoru._yoruClones || 0) + 1;
  // Relâmpago Fugaz: dano próprio de Ataque Extra +10% por acúmulo (máx 3, dura 2 turnos)
  if (yoru.weapon?.buff?.yoruWeapon) {
    const stW = yoru.buffs.filter(b => b.name === "Passo Fantasma").length;
    if (stW < 3) yoru.buffs.push({ stat: "dmgBonus", value: 10, turns: 2, name: "Passo Fantasma" });
    else { const oldest = yoru.buffs.find(b => b.name === "Passo Fantasma"); if (oldest) oldest.turns = 2; }
    // Regenera 2 de Energia a cada interceptação do Talento
    if (yoru.energyMax) yoru.energy = Math.min(yoru.energyMax, yoru.energy + 2);
    // Com VEL > 150: Ataque Extra do portador dá ao time +12% CRIT e +24% CRIT DMG por 2 turnos
    if (ySpd > 150) {
      (yoru._sibs || []).filter(h => h.alive).forEach(h => { h.buffs = h.buffs.filter(b => b.name !== "Passo Fantasma (Equipe)"); h.buffs.push({ stat: "critRate", value: 12, turns: 2, name: "Passo Fantasma (Equipe)" }); h.buffs.push({ stat: "critDmg", value: 24, turns: 2, name: "Passo Fantasma (Equipe)" }); });
    }
  }
  // S1: cada Clone Residual reduz a DEF do alvo em 4% por 2 turnos (acumula até 5×)
  if (yoru.stFlags?.yoruS1 && enemyTarget.alive) {
    const stacks = enemyTarget.debuffs.filter(d => d.name === "Corrente Corrosiva").length;
    if (stacks < 5) enemyTarget.debuffs.push({ stat: "def", value: -4, pct: true, turns: 2, name: "Corrente Corrosiva" });
  }
  let burstDmg = 0;
  if (yoru._yoruClones % 3 === 0 && enemyTarget._sibs) {
    const burstMul = (ySpd * 15.0 / yAtk) * 100; // Colapso Elétrico: 1500% da VEL em área
    enemyTarget._sibs.filter(e => e.alive).forEach(e => {
      const br = dealDamage(yoru, e, burstMul, fx, { el: "Eletro", isYoruClone: true, breakW: 2, defPen: t3DefPen });
      if (e.uid === enemyTarget.uid) burstDmg = br.dmg;
      e.debuffs.push({ stat: "vuln", value: 20, turns: 2, name: "Colapso Elétrico" }); // -20% RES a Ataques Extras (implementado como +20% de dano recebido)
    });
    pushLogGlobalFx(fx, yoru.uid, "COLAPSO ELÉTRICO!");
    // Rastro Especial 2 · Condutor de Alta Voltagem: +25% de dano de Ataque Extra pra equipe por 2 turnos
    if (yoru.stFlags?.yoruT2) {
      (yoru._sibs || []).filter(h => h.alive).forEach(h => { h.buffs = h.buffs.filter(b => b.name !== "Alta Voltagem"); h.buffs.push({ stat: "dmgBonus", value: 25, turns: 2, name: "Alta Voltagem" }); });
    }
    // S4: ao detonar o Colapso Elétrico, recupera 5 de Energia e cura o aliado com menor HP em 10%
    if (yoru.stFlags?.yoruS4) {
      if (yoru.energyMax) yoru.energy = Math.min(yoru.energyMax, yoru.energy + 5);
      const lowAlly = (yoru._sibs || []).filter(h => h.alive && !h.isSummon).sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp)[0];
      if (lowAlly) { const heal = Math.round(lowAlly.maxHp * 0.10); healUnit(lowAlly, heal, fx); }
    }
  }
  // Registro do Ponto de Aterramento
  if ((yoru._yoruStance || 0) > 0 && yoru._yoruMarkUid === enemyTarget.uid) {
    const rate = yoru.stFlags?.yoruS5 ? 0.52 : 0.35;
    let recAmt = (dmgDealt || 0) * rate + (cr.dmg || 0) * rate + burstDmg * rate;
    // S2: alvos sob Colapso Elétrico recebem o Eco com bônus de Dano Crítico baseado na Taxa de CRIT de Yoruichi
    if (yoru.stFlags?.yoruS2 && enemyTarget.debuffs.some(d => d.name === "Colapso Elétrico")) recAmt *= (1 + effStat(yoru, "critRate") / 100);
    yoru._yoruRecordedDmg = (yoru._yoruRecordedDmg || 0) + recAmt;
  }
}
function spCapOf(s) { const shk = s.heroes && s.heroes.find(h => h.id === "shorekeeper" && h.alive && h.stFlags?.shkC2); return shk ? 7 : 5; }
function pushLog(s, m) { if (m) s.log = [...s.log.slice(-40), m]; }
function pushLogGlobalFx(fx, uid, txt) { fx.push({ uid, txt, crit: true, id: Math.random(), el: "Eletro" }); }
// Yanagi — Teorema da Desordem: gatilho reativo sempre que ela causa dano a um alvo com DoT ativo
function triggerDesordem(yanagi, target, fx, opts) {
  if (!target || !target.alive) return 0;
  const dots = target.dots || [];
  if (!dots.length) return 0;
  const sparks = (target.debuffs || []).filter(d => d.name === "Fagulha de Anomalia");
  const spent = sparks.length > 0;
  const S6 = !!yanagi.stFlags?.yanaS6;
  let consumedN = 0;
  if (spent && !opts?.noConsume) {
    if (S6) { consumedN = sparks.length; target.debuffs = target.debuffs.filter(d => d.name !== "Fagulha de Anomalia"); }
    else { consumedN = 1; const idx = target.debuffs.findIndex(d => d.name === "Fagulha de Anomalia"); if (idx >= 0) target.debuffs.splice(idx, 1); }
  } else if (spent) consumedN = 1;
  const distinctTypes = new Set(dots.map(d => d.type)).size;
  // Protocolo de Ruína em Cadeia (4pç): a Desordem também aplica Falha Estrutural
  if (yanagi.stFlags?.setRuina4 && target.alive) { const exFE = target.debuffs.find(d => d.name === "Falha Estrutural"); if (exFE) exFE.turns = 2; else target.debuffs.push({ stat: "dotAmp", value: 18, turns: 2, name: "Falha Estrutural" }); }
  // Protocolo de Ruína em Cadeia (6pç): com 3+ tipos de DoT no alvo, a equipe toda ganha +20% de Perfuração de DEF contra ele
  if (yanagi.stFlags?.setRuina6 && distinctTypes >= 3) { const exRP = target.debuffs.find(d => d.name === "Ruína em Cadeia"); if (exRP) exRP.turns = 2; else target.debuffs.push({ stat: "teamDefPen", value: 20, turns: 2, name: "Ruína em Cadeia" }); }
  const t3Bonus = yanagi.stFlags?.yanaT3 ? Math.min(50, (effStat(yanagi, "defPen") || 0) * 2.5) : 0;
  const basePen = spent ? Math.min(35, 15 + distinctTypes * 5) : 0;
  const pen = Math.min(85, basePen + (opts?.extraPen || 0) + t3Bonus);
  const dotSum = dots.reduce((a, d) => a + d.dmg, 0);
  const base = dotSum * 1.2 + effStat(yanagi, "atk") * 1.5;
  let mul = opts?.absoluteMul || 1;
  if (S6 && consumedN > 0) mul *= (1 + consumedN * 0.35); // S6: Multiplicador de Caos — +35% por Fagulha consumida
  let finalRaw = spent ? base * mul : base * 0.3; // Falha de Reação: sem Fagulha, só 30%
  let crit = false;
  if (opts?.forceCrit) { finalRaw *= 2.5; crit = true; } // S5: CRIT fixo 100%/150% na Desordem Absoluta
  else if (Math.random() * 100 < effStat(yanagi, "critRate")) { finalRaw *= (1 + effStat(yanagi, "critDmg") / 100); crit = true; }
  const mit = defMult(yanagi, effStat(target, "def") * (1 - pen / 100));
  const dmg = Math.max(1, Math.round(finalRaw * mit));
  target.hp -= dmg; if (target.hp <= 0) { target.hp = 0; target.alive = false; }
  if (S6 && target.alive && target.hp / target.maxHp < 0.10) { target.hp = 0; target.alive = false; fx.push({ uid: target.uid, txt: "EXECUTADO!", crit: true, id: Math.random(), el: "Chaos" }); }
  fx.push({ uid: target.uid, txt: String(dmg), crit, id: Math.random(), el: "Eletro" });
  if (yanagi.stFlags?.yanaT1 && spent && yanagi.energyMax) {
    yanagi.energy = Math.min(yanagi.energyMax, yanagi.energy + 3);
    if (!target.alive && (target.debuffs || []).some(d => d.name === "Fagulha de Anomalia")) yanagi.energy = Math.min(yanagi.energyMax, yanagi.energy + 5);
  }
  // S1: com 3+ Fagulhas no momento do gatilho, reduz RES elemental dos DoTs ativos + avança a ação dela em 20%
  if (yanagi.stFlags?.yanaS1 && sparks.length >= 3 && target.alive) { target.debuffs.push({ stat: "elemRes", value: -15, turns: 2, name: "Ciclo de Ruído" }); yanagi.av = Math.max(0.01, (yanagi.av || 1) * 0.80); }
  return dmg;
}
function dealDamage(attacker, defender, mult, fx, opts) {
  // Lancer Esquiva Absoluta: bloqueia o próximo ataque
  if (defender.id === "lancer" && (defender.lancerDodges || 0) > 0 && attacker.side !== "H" && !opts?.pierceShield) {
    defender.lancerDodges -= 1;
    fx.push({ uid: defender.uid, txt: "ESQUIVOU!", heal: true, id: Math.random(), el: "Chaos" });
    if (defender.stFlags?.lancerCounterDmg) { defender.buffs = defender.buffs.filter(b => b.name !== "Contra-Golpe"); defender.buffs.push({ stat: "dmgBonus", value: 20, turns: 1, name: "Contra-Golpe" }); }
    if (defender.stFlags?.lancerC4) {
      const cntAtk = Math.round(effStat(defender, "atk") * 0.80);
      attacker.hp -= cntAtk; if (attacker.hp <= 0) { attacker.hp = 0; attacker.alive = false; }
      fx.push({ uid: attacker.uid, txt: String(cntAtk), crit: false, id: Math.random(), el: "Chaos" });
      yoruFollowupProc(defender, attacker, cntAtk, fx);
    }
    return { dmg: 0, crit: false };
  }
  // Brave Shield (WarGreymon): 100% de contra-ataque — corte crítico + cura 5% do HP
  if (defender.side === "H" && attacker.side !== "H" && defender.id === "agumon" && (defender.agBrave || 0) > 0 && defender.alive && !opts?.isCounter) {
    const cAtk = Math.round(effStat(defender, "atk") * 0.9 * (1 + effStat(defender, "critDmg") / 100));
    attacker.hp -= cAtk; if (attacker.hp <= 0) { attacker.hp = 0; attacker.alive = false; }
    fx.push({ uid: attacker.uid, txt: String(cAtk), crit: true, id: Math.random(), el: "Fogo" });
    const bh = Math.round(defender.maxHp * 0.05); defender.hp = Math.min(defender.maxHp, defender.hp + bh);
    fx.push({ uid: defender.uid, txt: "+" + bh, heal: true, id: Math.random() });
    yoruFollowupProc(defender, attacker, cAtk, fx);
  }
  // Uraraka (Rastro Tempestade): aliado com Zero Gravity atacado atrasa a ação do inimigo em 8%
  if (defender.side === "H" && attacker.side !== "H" && defender.buffs && defender.buffs.some(b => b.name === "Zero Gravity") && defender._uraDelayFlag) {
    attacker.av = (attacker.av || 1) * 1.08;
  }
  // Glacier: +6% de dano Glacial recebido por camada de gelo (máx 3)
  { const _gl = Math.min(3, (defender.dots || []).filter(d => d.type === "freeze" || d.type === "geada").length);
    if (_gl > 0 && (opts?.el || attacker.element) === "Glacial") mult = mult * (1 + 0.06 * _gl); }
  // Sopro Glacial 4pç: contra alvo Congelado, +18% Dano Bônus (o +20% CRIT é aplicado na taxa de crítico em effStat)
  { const _frozen = (defender.dots || []).some(d => d.type === "freeze" || d.type === "geada");
    if (_frozen && attacker.stFlags?.setGlacial4) mult = mult * 1.18; }
  // Sangramento (Limbus): quem ataca sangrando rasga a ferida — sofre o dano do bleed (cap 8% do HP atual)
  if (!opts?.isDot && !opts?.isCounter) {
    const _bl = (attacker.dots || []).find(d => d.type === "bleed");
    if (_bl) { const bd = Math.max(1, Math.min(Math.round(attacker.hp * 0.08), _bl.dmg)); attacker.hp = Math.max(0, attacker.hp - bd); if (attacker.hp <= 0) attacker.alive = false; _bl.turns -= 1; if (_bl.turns <= 0) attacker.dots = attacker.dots.filter(d => d !== _bl); fx.push({ uid: attacker.uid, txt: String(bd), dot: "bleed", id: Math.random() }); }
  }
  // Nami C2 · Vento Cortante: +15% de dano contra alvos sob Ciclone
  if (attacker.id === "nami" && attacker.stFlags?.namiC2 && (defender.dots || []).some(d => d.type === "cyclone")) {
    mult = mult * 1.15;
  }
  // Nanami (Rastro Tempestade): +20% de dano contra inimigos com DEF reduzida
  if (attacker.id === "nanami" && attacker.stFlags?.nanamDefBonus && (defender.debuffs || []).some(d => d.stat === "def" && d.value < 0)) {
    mult = mult * 1.20;
  }
  // Aizen mechanic: 40% miss chance before Bankai
  if (defender.bossKind === "aizen" && !defender.aiBankai && attacker.side === "H" && !opts?.pierceShield && (defender._aizenMissStreak || 0) < 1 && Math.random() < 0.20) {
    defender._aizenMissStreak = (defender._aizenMissStreak || 0) + 1;
    fx.push({ uid: defender.uid, txt: "ERROU!", crit: false, id: Math.random(), el: attacker.element || "Holy" });
    return { dmg: 0, crit: false };
  }
  if (defender.bossKind === "aizen") defender._aizenMissStreak = 0; // acertou — zera a sequência de erros (pity: nunca erra 2x seguidas)
  const f = attacker.stFlags || {};
  // Mutador Espelhos: 25% de chance de erro em qualquer ataque
  if ((attacker._mut || defender._mut) === "espelhos" && (attacker._espelhosMissStreak || 0) < 1 && Math.random() < 0.15) { attacker._espelhosMissStreak = (attacker._espelhosMissStreak || 0) + 1; fx.push({ uid: defender.uid, txt: "ERROU!", crit: false, id: Math.random() }); return { dmg: 0, crit: false }; }
  if ((attacker._mut || defender._mut) === "espelhos") attacker._espelhosMissStreak = 0;
  // Vírus Esmaga-Cards (Kaiba): ataques inimigos fortes (mult >= 150%) contra o time protegido são reduzidos a 50% de dano
  if (attacker.side === "enemy" && (defender._kaibaVirusTurns || 0) > 0 && mult >= 150) mult = mult * (50 / mult);
  let dmg = effStat(attacker, "atk") * (mult / 100);
  // Mutador Miasma Cegante: Chance Crítica travada em 0%
  const _lupaC5Crit = (attacker.id === "lupa" && f.lupaC5) ? 12 : 0;
  const crit = (attacker._mut || defender._mut) === "miasma" ? false : Math.random() * 100 < Math.min(100, effStat(attacker, "critRate") + _lupaC5Crit);
  if (crit) dmg *= 1 + effStat(attacker, "critDmg") / 100;
  dmg *= 1 + effStat(attacker, "dmgBonus") / 100;
  if (attacker.id === "lupa" && f.lupaC5) dmg *= 1.75; // C5 · Garra de Almas: +75% de Dano de Fogo incondicional
  // ── Hitori Gotoh — Ressonância de Palco: enquanto viva no time, TODO Ataque Extra (follow-up) causa +250% de dano ──
  if (opts?.isFollowup) { const hitoriBuff = (attacker._sibs || []).find((h) => h.id === "hitori" && h.alive); if (hitoriBuff) dmg *= 3.5; }
  // Hitori Gotoh: aura pros 2 primeiros slots — +30% Dano Holy/Chaos (60% com C5), +30% em qualquer elemento também com C5
  { const hitoriAura = (attacker._sibs || []).find((h) => h.id === "hitori" && h.alive);
    if (hitoriAura && attacker.side === "H" && !attacker.isSummon && ["H0", "H1"].includes(attacker.uid)) {
      const el0 = opts?.el || attacker.element;
      const hf = hitoriAura.stFlags || {};
      if (el0 === "Holy" || el0 === "Chaos") dmg *= 1 + (hf.hitoriC5 ? 0.60 : 0.30);
      else if (hf.hitoriC5) dmg *= 1.30;
    } }
  if (f.omgC6 && attacker.id === "omegamon" && (attacker.hp / attacker.maxHp) < 0.3) dmg *= 2; // Final Defeat: +100% Dano de Vírus
  const afflicted = (defender.dots && defender.dots.length) || (defender.debuffs && defender.debuffs.some((d) => d.stat === "def" && d.value < 0));
  if ((f.dmgVsAfflicted || f.afflictedDmg) && afflicted) dmg *= 1.25;
  if (f.pShatter && defender.dots && defender.dots.length) dmg *= 1.3;
    if (f.pWoo && attacker.id === "wonderofyou" && crit) { const cur = defender.debuffs.find((d) => d.name === "Vulnerabilidade da Calamidade"); if (cur) cur.value = Math.min(24, cur.value + 8); else defender.debuffs.push({ stat: "vuln", value: 8, turns: 2, name: "Vulnerabilidade da Calamidade" }); }
  const hpPct = defender.hp / defender.maxHp;
  if (f.lowHpDmg && hpPct < 0.5) dmg *= 1.25;
  if (f.pExecute && hpPct < 0.4) dmg *= 1.25;
  dmg *= 1 + vulnOf(defender) / 100;
  // Resistência / Fraqueza elemental — fraqueza amplifica o bônus elemental do atacante
  const el = opts?.el || attacker.element;
  const baseElemBonus = attacker.base.elemBonus || 0;
  // RES Elemental (debuff "elemRes", ex: Arena KaibaCorp, marcas de Holy/Eletro RES↓): reduz a resistência do alvo, amplificando o dano recebido
  let elemResDebuff = (defender.debuffs || []).filter(d => d.stat === "elemRes").reduce((a, d) => a + (d.value || 0), 0);
  if (attacker.side === "H") { const shkC6b = (attacker._sibs || []).find(h => h.id === "shorekeeper" && h.alive && h.stFlags?.shkC6 && (h._domainStage || 0) >= 2); if (shkC6b) elemResDebuff -= 20; }
  if (elemResDebuff) dmg *= (1 - elemResDebuff / 100);
  if (opts?.resPen) dmg *= (1 + opts.resPen / 100); // ignora X% da RES elemental do alvo (ex: Cataclismo de Lupa)
  if (attacker.id === "lupa" && f.lupaT3 && (attacker._lupaOverclock || 0) > 0 && (opts?.el || attacker.element) === "Fogo") dmg *= 1.15; // Rastro 3: Overclock ignora +15% RES
  // Resistência de Perfuração: enquanto a barra de Resistência estiver ativa, -10% de todo dano recebido
  if (defender._hasToughness && (defender.toughness || 0) > 0 && !opts?.isDot) dmg *= 0.9;
  const universalAdv = el === "Unknown" || !!opts?.universalAdv || (attacker._universalAdvActive && attacker.side === "H" && Math.random() < 0.5); // Shorekeeper: vantagem elemental absoluta (Talento + Estelarador Estágio 2)
  if (defender.res && defender.res.includes(el) && !universalAdv) {
    dmg *= 0.6;
    dmg *= 1 + baseElemBonus / 100; // bônus elemental reduzido pela resistência
  } else if ((defender.weak && defender.weak.includes(el)) || universalAdv) {
    dmg *= 1.5; // bônus base de fraqueza
    dmg *= 1 + (baseElemBonus * 1.5) / 100; // +50% de eficiência elemental na fraqueza
    // Consome a barra de Resistência (Perfuração): básico=1, perícia=2, suprema=3 unidades, escalado pela Eficiência de Perfuração
    if (defender._hasToughness && (defender.toughness || 0) > 0 && !opts?.isDot) {
      const breakW = (opts?.breakW != null ? opts.breakW : (mult >= 300 ? 3 : mult >= 150 ? 2 : 1)) * (1 + (effStat(attacker, "breakEff") || 0) / 100) * ((defender._panic || 0) > 0 ? 2 : 1);
      defender.toughness = Math.max(0, defender.toughness - breakW);
      if (defender.toughness <= 0) applyBreakEffect(attacker, defender, el, fx);
    }
  } else {
    dmg *= 1 + baseElemBonus / 100;
  }
  // 4pç Praga Viral: bônus conforme Sangramento/Veneno no alvo
  if (f.setViral4 && defender.dots) {
    const hasBleed = defender.dots.some((d) => d.type === "bleed"); const hasPoison = defender.dots.some((d) => d.type === "poison");
    if (hasBleed && hasPoison) { dmg *= 1.2; const heal = Math.round(attacker.maxHp * 0.08); if (attacker.side === "H") { attacker.hp = Math.min(attacker.maxHp, attacker.hp + heal); } }
    else if (hasBleed || hasPoison) dmg *= 1.12;
  }
  let pen = Math.min(85, (effStat(attacker, "defPen") || 0) + (opts?.defPen || 0));
  // Protocolo de Ruína em Cadeia (6pç): qualquer aliado ganha +20% de Perfuração de DEF contra um alvo com 3+ DoTs diferentes
  const teamDefPenVal = (defender.debuffs || []).filter(d => d.stat === "teamDefPen").reduce((a, d) => a + (d.value || 0), 0);
  if (teamDefPenVal && attacker.side === "H") pen = Math.min(100, pen + teamDefPenVal);
  // Protocolo de Ruína em Cadeia (6pç): +20% de Perfuração de DEF pra QUALQUER aliado contra um alvo com 3+ DoTs
  if (attacker.side === "H") { const rp = (defender.debuffs || []).find(d => d.name === "Ruína em Cadeia"); if (rp) pen += rp.value; }
  if ((defender.debuffs || []).some(d => d.name === "Ruptura de Realidade")) pen = 100; // C5: dano tratado como Verdadeiro
  if (attacker.id === "agumon" && (attacker.agModoX || 0) > 0 && attacker.stFlags?.aguT3) pen = Math.min(100, pen + Math.min(50, Math.floor((attacker._aguXHeat || 0) / 10) * 10)); // Rastro Critical Pressure
  // C6 · Soberana da Costa Negra (Zero Absoluto): time inteiro ignora 25% de DEF durante o Estágio 2/3 do Estelarador
  if (attacker.side === "H") { const shkC6 = (attacker._sibs || []).find(h => h.id === "shorekeeper" && h.alive && h.stFlags?.shkC6 && (h._domainStage || 0) >= 2); if (shkC6) pen = Math.min(100, pen + 25); }
  dmg *= defMult(attacker, effStat(defender, "def") * (1 - pen / 100));
  dmg = isFinite(dmg) ? Math.max(1, Math.round(dmg)) : 1; // robustez: nunca NaN/Infinity
  if (defender.side === "H" && attacker.side !== "H") {
    const red = (defender.buffs || []).filter((b) => b.stat === "dmgReduce").reduce((a, b) => a + (b.value || 0), 0);
    if (red) dmg = Math.max(1, Math.round(dmg * Math.max(0.1, 1 - red / 100))); // Protocolo de Infecção
    if (defender.id === "omegamon" || (defender.buffs || []).some((b) => b.name === "Protocolo")) defender._omgHit = (defender._omgHit || 0) + 1;
  }
  if (defender.shield > 0 && !opts?.pierceShield && !attacker._ignoresShield) { const shBefore = defender.shield; const a = Math.min(defender.shield, dmg); defender.shield -= a; dmg -= a; if (shBefore > 0 && defender.shield === 0 && defender.id === "omegamon" && defender.stFlags && defender.stFlags.omgContagio && attacker.side !== "H") { attacker.dots = attacker.dots || []; if (!attacker.dots.some(function(d){return d.type==="corrosao";})) attacker.dots.push({ type: "corrosao", dmg: Math.max(1, Math.round(defender.base.atk * 0.35)), turns: 2 }); fx.push({ uid: attacker.uid, txt: "CORROSAO", dot: "corrosao", id: Math.random() }); } }
  else if (defender.shield > 0 && attacker._ignoresShield && !opts?.pierceShield) { fx.push({ uid: defender.uid, txt: "ESCUDO IGNORADO!", crit: true, id: Math.random(), el: "Chaos" }); }
  defender.hp -= dmg;
  if (dmg > 0 && (defender.debuffs || []).some(d => d.name === "Colapso Entrópico")) defender._chaosHits = (defender._chaosHits || 0) + 1;
  if (defender.hp <= 0) {
    if (defender.stFlags?.lancerRevive && !defender._lancerRevived && defender.side === "H") {
      defender._lancerRevived = true; defender.hp = Math.round(defender.maxHp * 0.20); defender.alive = true;
      fx.push({ uid: defender.uid, txt: "IMORTALIDADE!", heal: true, id: Math.random() });
    } else { defender.hp = 0; defender.alive = false; }
  }
  if (!defender.alive && defender.id === "omegamon" && defender.stFlags && defender.stFlags.omgC6 && !defender._c6Used) { defender.hp = 1; defender.alive = true; defender._c6Used = true; fx.push({ uid: defender.uid, txt: "FINAL DEFEAT", heal: true, id: Math.random() }); }
  if (dmg > 0 && defender.weapon && defender.weapon.omgWeapon && defender.alive && !defender.buffs.some(function(b){return b.name==="GlitchBoost";})) { defender.buffs.push({ stat: "dmgBonus", value: 25, turns: 2, name: "GlitchBoost" }); }
  if (defender.side === "H" && !defender.isSummon && defender.energyMax) { const heavy = attacker.boss || mult >= 300; defender.energy = Math.min(defender.energyMax, defender.energy + Math.round((heavy ? 12 : 6) * (1 + (effStat(defender, "energyRegen") || 0) / 100))); }
  if (!defender.alive && attacker.side === "H" && !attacker.isSummon && attacker.energyMax) { attacker.energy = Math.min(attacker.energyMax, attacker.energy + Math.round(6 * (1 + (effStat(attacker, "energyRegen") || 0) / 100))); } // kill: +6 ×ERR
  if (!defender.alive && attacker.id === "lupa" && attacker.stFlags?.lupaT3 && (attacker._lupaOverclock || 0) > 0) { attacker.energy = Math.min(attacker.energyMax, attacker.energy + Math.round(attacker.energyMax * 0.30)); } // Rastro 3: abate no Overclock regenera 30% da Energia Máx
  // ── Afundamento (Limbus): ao ser atingido, sofre dano fixo (potência), perde 4 de energia, Count -1
  if (dmg > 0 && !opts?.isDot && !opts?.isCounter) {
    const snk = (defender.dots || []).find(d => d.type === "sinking");
    if (snk && defender.alive) {
      const sd = Math.max(1, snk.dmg);
      defender.hp = Math.max(0, defender.hp - sd); if (defender.hp <= 0) defender.alive = false;
      if (defender.energyMax) defender.energy = Math.max(0, defender.energy - 4);
      snk.turns -= 1; if (snk.turns <= 0) defender.dots = defender.dots.filter(d => d !== snk);
      fx.push({ uid: defender.uid, txt: String(sd), dot: "sinking", id: Math.random() });
    }
  }
  // ── Fulgur Resonance: alvo eletrizado atingido por hit direto — drena 3 de energia + arco no aliado de menor HP (máx 4/rodada)
  if (dmg > 0 && !opts?.isDot) {
    const fulg = (defender.dots || []).find(d => d.type === "fulgur");
    if (fulg && (defender._fulgHits || 0) < 4) {
      defender._fulgHits = (defender._fulgHits || 0) + 1;
      const shkImmune = defender.id === "shorekeeper" && defender.stFlags?.shkT1 && (defender._domainStage || 0) > 0;
      if (defender.energyMax && !shkImmune) defender.energy = Math.max(0, defender.energy - 3);
      const sibs = (defender._sibs || []).filter(x => x.alive && x.uid !== defender.uid);
      if (sibs.length) {
        const lowSib = sibs.slice().sort((a, b) => (a.hp / a.maxHp) - (b.hp / b.maxHp))[0];
        const arc = Math.max(1, Math.round(fulg.dmg * 0.15));
        lowSib.hp = Math.max(0, lowSib.hp - arc); if (lowSib.hp <= 0) lowSib.alive = false;
        fx.push({ uid: lowSib.uid, txt: String(arc), dot: "fulgur", id: Math.random() });
      }
    }
  }
  // ── Mutadores do Abismo (por unidade) ──
  const MUT = attacker._mut || defender._mut;
  if (MUT === "masoquista" && dmg > 0 && defender.alive) {
    const stacks = defender.buffs.filter(b => b.name === "Masoquista").length;
    if (stacks < 10) defender.buffs.push({ stat: "atk", value: 5, pct: true, turns: 9999, name: "Masoquista" });
  }
  if (MUT === "frenesi" && !defender.alive && attacker.alive) attacker.av = 0; // matar concede turno extra
  // ── Glitches do Abismo ──
  const GL = attacker._glitches || [];
  if (!defender.alive && attacker.side === "H" && GL.includes("sanguefrio")) { const h5 = Math.round(attacker.maxHp * 0.05); attacker.hp = Math.min(attacker.maxHp, attacker.hp + h5); fx.push({ uid: attacker.uid, txt: "+" + h5, heal: true, id: Math.random() }); }
  if (attacker.side === "H" && dmg > 0 && GL.includes("troia")) {
    const tst = attacker.buffs.filter(b => b.name === "Cavalo de Troia").length;
    if (tst < 10) attacker.buffs.push({ stat: "dmgBonus", value: 10, turns: 9999, name: "Cavalo de Troia" });
  }
  // ── Agumon C2: sofrer dano gera TamerSP (1 por 5% do HP Máx recebido) ──
  if (defender.id === "agumon" && defender.stFlags?.aguC2 && dmg > 0) {
    const spGain = Math.floor(dmg / Math.max(1, defender.maxHp * 0.05));
    if (spGain > 0) defender.agSP = Math.min(aguSPMax(defender), (defender.agSP || 0) + spGain);
  }
  // ── Agumon Rastro Core Insulation: sobrevive a golpe fatal (recarga 3 rodadas) ──
  if (!defender.alive && defender.id === "agumon" && defender.stFlags?.aguT2 && (defender._aguInsCd || 0) <= 0) {
    defender.alive = true; defender.hp = 1; defender.agHeat = 0; defender._aguInsCd = 3;
    defender.shield = (defender.shield || 0) + capShieldAdd(defender, Math.round(defender.maxHp * 0.5));
    defender.agSP = Math.min(aguSPMax(defender), (defender.agSP || 0) + 30);
    fx.push({ uid: defender.uid, txt: "⚡ SOBRECARGA DE EMERGÊNCIA!", heal: true, id: Math.random() });
  }
  // ── Agumon C6: abate no MODO X estende o modo ──
  if (!defender.alive && attacker.id === "agumon" && attacker.stFlags?.aguC6 && (attacker.agModoX || 0) > 0) attacker.agModoX = 2;
  // ── Ruptura de Realidade (Agumon C5): todo dano contra o alvo ignora a DEF ──
  // (aplicado no cálculo de pen abaixo via debuff)
  // ── Maximillion, o Ilusionista do Tabuleiro (Torre 200) ──
  if (defender.bossKind === "maximillion" && attacker.side === "H" && dmg > 0 && !opts?.isDot) {
    if (!attacker.isSummon) {
      // Mente Aberta: -35% de dano de personagens principais + rouba Eficiência de Perfuração em ATK (máx 5 stacks)
      // (corrige bug: a redução precisa devolver o HP que já tinha sido debitado com o valor cheio, não só mudar o número exibido)
      const reducedDmg = Math.round(dmg * 0.65); // Mente Aberta: -35% (era -50%, forte demais somado às outras mitigações)
      const refund = dmg - reducedDmg;
      if (refund > 0) defender.hp = Math.min(defender.maxHp, defender.hp + refund);
      dmg = reducedDmg;
      const stacks = defender.buffs.filter(b => b.name === "Olho do Milênio").length;
      if (stacks < 5) defender.buffs.push({ stat: "atk", value: 10, pct: true, turns: 9999, name: "Olho do Milênio" });
      // Fase 2 · Cópia Toon: reflete 50% do dano recebido como Fogo
      if (defender._toonActive) {
        const refl = Math.max(1, Math.round(dmg * 0.5));
        attacker.hp -= refl; if (attacker.hp <= 0) { attacker.hp = 0; attacker.alive = false; }
        fx.push({ uid: attacker.uid, txt: String(refl), crit: false, id: Math.random(), el: "Fogo" });
      }
    } else {
      // Entidade Independente: limpa os stacks de ATK e força o Pânico (Eficiência de Perfuração +100% até o fim do ciclo)
      defender.buffs = defender.buffs.filter(b => b.name !== "Olho do Milênio");
      defender._panic = 2;
      if (defender._toonActive) {
        // Entidades ignoram o reflexo e causam Dano Verdadeiro = 50% da Resistência (Perfuração) restante
        const trueDmg = Math.max(1, Math.round((defender.maxToughness || 100) * 0.5));
        defender.hp = Math.max(0, defender.hp - trueDmg); if (defender.hp <= 0) defender.alive = false;
        fx.push({ uid: defender.uid, txt: String(trueDmg) + "!", crit: true, id: Math.random(), el: "Eletro" });
      }
    }
  }
  if (!defender.alive && defender.side === "H" && defender._uti) { defender._uti = false; defender.hp = 1; defender.alive = true; fx.push({ uid: defender.uid, txt: "UTI: +1 HP!", heal: true, id: Math.random() }); }
  // ── Yoruichi — Frequência Shunpo: gatilho central p/ QUALQUER Ataque Extra aliado (corrige clones que quase nunca disparavam) ──
  if (dmg > 0 && opts?.isFollowup && !opts?.isYoruClone && attacker.side === "H" && !attacker.isSummon && attacker.alive) {
    yoruFollowupProc(attacker, defender, dmg, fx);
  }
  // ── Lupa — Fome da Predadora: TODO Dano de Fogo dela contra alvo com DoT ativo consome 1 rodada e ganha Voracidade ──
  if (dmg > 0 && attacker.id === "lupa" && !attacker.isSummon && attacker.alive && (opts?.el || attacker.element) === "Fogo" && !opts?.noLupaProc) {
    lupaVoracityProc(attacker, defender, fx);
  }
  // ── Lupa C3 · Purgatório Terminal: Chama Residual — qualquer aliado que acerte o alvo marcado dispara uma reação térmica ──
  if (dmg > 0 && defender.alive && attacker.side === "H" && attacker.id !== "lupa" && !opts?.isDot) {
    const cr3 = (defender.debuffs || []).find(d => d.name === "Chama Residual");
    if (cr3 && (defender._lupaResidualHits || 0) < 1) {
      const lupaC3 = (attacker._sibs || []).find(h => h.id === "lupa" && h.alive && h.stFlags?.lupaC3);
      if (lupaC3) {
        defender._lupaResidualHits = (defender._lupaResidualHits || 0) + 1;
        const rd = Math.max(1, Math.round(effStat(lupaC3, "atk") * 0.8));
        defender.hp -= rd; if (defender.hp <= 0) { defender.hp = 0; defender.alive = false; }
        fx.push({ uid: defender.uid, txt: String(rd), crit: false, id: Math.random(), el: "Fogo" });
      }
    }
  }
  fx.push({ uid: defender.uid, txt: String(dmg), crit, id: Math.random(), el: opts?.el || attacker.element, enhanced: !!opts?.enhanced });
  return { dmg, crit };
}
// Sistema de dano de DoT: aleatório, com piso mínimo que escala com o quanto o personagem está investido (ATK efetivo)
function dotDamageRoll(source, m) {
  const atk = effStat(source, "atk");
  const scale = Math.max(0.6, Math.min(2.2, atk / 700)); // 700 = ATK de referência; escala travada pra não estourar o teto
  const variance = 0.85 + Math.random() * 0.30; // variação aleatória de ±15%
  const scaled = Math.round(atk * (m / 100) * variance * scale);
  return Math.max(50000, Math.min(280000, scaled)); // faixa pedida: 50k a 280k de dano de DoT
}
function applyDot(targets, spec, source, fx) {
  const f = source.stFlags || {};
  let m = spec.mul;
  if (f.dotBoost) m *= 1.4;
  if (f.pScorch && spec.type === "burn") m *= 1.3;
  if (f.setFire2 && spec.type === "burn") m *= 1.1; // Núcleo Ardente 2pç
  m *= 1 + (source.base.dotDmg || 0) / 100; // substatus "Dano de DoT"
  const dmg = dotDamageRoll(source, m); // novo sistema: aleatório, piso de 80k escalando com o personagem
  const glacial = spec.type === "freeze" || spec.type === "geada";
  targets.forEach((t) => {
    if (!t.alive) return;
    if (t.bossKind === "maximillion" && t._illusionActive && source && source.side === "H" && !source.isSummon) return; // imune a DoTs de personagens principais
    if ((t._dotCd?.[spec.type] || 0) > 0) { fx.push({ uid: t.uid, txt: "EM RECARGA", crit: false, id: Math.random() }); return; } // cooldown de reaplicação (2 turnos após o fim)
    if (spec.type === "aero" && t.dots.filter(d => d.type === "aero").length >= 5) return; // Aero: máx 5 acúmulos
    if (spec.type === "poison" && t.dots.filter(d => d.type === "poison").length >= 5) return; // Veneno: máx 5 camadas (estilo HSR)
    if (spec.type === "sinking") { const ex = t.dots.find(d => d.type === "sinking"); if (ex) { ex.dmg = Math.min(9999, ex.dmg + dmg); ex.turns = Math.min(9, ex.turns + spec.turns); return; } } // Afundamento: Potência acumula, Count soma
    t.dots.push({ type: spec.type, dmg, turns: spec.turns });
    if (f.setGlacial4 && glacial) { const cur = t.debuffs.find((d) => d.name === "GlacialSet"); if (cur) cur.value = Math.min(15, cur.value + 3); else t.debuffs.push({ stat: "vuln", value: 3, turns: 3, name: "GlacialSet" }); } // Sopro Glacial 4pç (buffado)
    // Protocolo de Ruína em Cadeia (4pç): todo DoT aplicado dá Falha Estrutural — +18% de dano de DoT por 2 turnos
    if (f.setRuina4) { const ex2 = t.debuffs.find(d => d.name === "Falha Estrutural"); if (ex2) { ex2.turns = 2; } else t.debuffs.push({ stat: "dotAmp", value: 18, turns: 2, name: "Falha Estrutural" }); }
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
    const finalMul = 120 * 1.20 * (u.tBasic || 1) * ampB * (1 + wpnBonus);
    const targets = f.sfC6 ? s.enemies.filter(e => e.alive) : (enemy ? [enemy] : []);
    let tot = 0;
    targets.forEach(e => {
      const r = dealDamage(u, e, finalMul, fx, { breakW: 1, el: "Vento", pierceShield: true, defPen: f.sfC6 ? 40 : 100, enhanced: true });
      tot += r.dmg;
      if (!e.alive && f.sfC6) { u.energy = u.energyMax; u.buffs.push({ stat: "dmgBonus", value: 50, turns: 1, name: "ExecSuprema" }); }
    });
    msg = `🦋✨🌿 SOI FON — DANO VERDADEIRO (Postura de Ferrão, APRIMORADO)! ${tot} de Dano de Vento${f.sfC6 ? " em TODOS" : ""}${wpnBonus ? ` +${Math.round(wpnBonus * 100)}% (${wpnCharges} Cargas)` : ""}, ignora DEF e escudos!`;
  } else {
    if (enemy) {
      const r = dealDamage(u, enemy, (sk.basicMul || 100) * (u.tBasic || 1) * ampB, fx, { breakW: 1, el: "Vento" });
      msg = `🦋 ${u.name} desfere dois golpes velozes em ${enemy.name} — ${r.dmg} de Dano de Vento${r.crit ? " (CRÍTICO!)" : ""}.`;
      const hasEletroDot = enemy.dots?.some(d => d.type === "shock");
      if (hasEletroDot) { u.energy = Math.min(u.energyMax, u.energy + 10); msg += " Bônus Eletro: +10 energia!"; }
      if (u.weapon?.id === "ferrao_borboleta") { u.sfWpnCharges = Math.min(5, (u.sfWpnCharges || 0) + 1); msg += ` [Carga Elétrica ${u.sfWpnCharges}/5]`; }
    }
  }
  return msg;
}
function checkNamiFollowup(s, actor, fx) {
  if (!actor || actor.side !== "H" || actor.isSummon) return;
  const nami = s.heroes.find(h => h.id === "nami" && h.alive && h.stFlags && h.stFlags.namiFollowup && h.uid !== actor.uid);
  if (!nami) return;
  const ae = s.enemies.filter(e => e.alive && (e.dots || []).some(d => d.type === "cyclone"));
  if (!ae.length) return;
  const tgt = ae[0];
  const r = dealDamage(nami, tgt, 40 * (nami.tSkill || 1), fx, { breakW: 1, el: "Vento", isFollowup: true });
  s.log = [...s.log.slice(-40), `🌊 NAMI — Ataque Coordenado em ${tgt.name}: ${r.dmg} de Dano de Vento!`];
}
// Ataque Extra da Soi Fon — gatilho próprio do Talento dela (como no HSR, cada personagem define seu próprio gatilho de Ataque Extra; não existe um "sistema" único compartilhado entre personagens).
function checkSoiFonFollowup(s, actor, fx) {
  if (!actor || actor.id === "soifon" || actor.isSummon) return;
  const sf = s.heroes.find(h => h.id === "soifon" && h.alive && !h.isSummon);
  if (!sf) return;
  const ae = s.enemies.filter(e => e.alive);
  if (!ae.length) return;
  // Vibração de Ferrão: QUALQUER aliado que agir concede 1 carga (era só Eletro — agora universal)
  sf.sfCharges = Math.min(3, (sf.sfCharges || 0) + 1);
  const f2 = sf.stFlags || {};
  // C2: aliados de Eletro continuam dando bônus extra (sinergia elemental preservada, mas não é mais requisito)
  if (f2.sfC2 && actor.element === "Eletro") { const anyMarked = ae.some(e => (e.debuffs || []).some(d => d.name === "Ferrão da Morte")); if (anyMarked) sf.sfCharges = Math.min(3, sf.sfCharges + 1); }
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
    const r = dealDamage(sf, tgt, fuMul, fx, { breakW: 1, el: "Vento", isFollowup: true });
    if (f2.sfPrecisao) { const cdStacks = sf.buffs.filter(b => b.name === "PrecisaoFU").length; if (cdStacks < 2) sf.buffs.push({ stat: "critDmg", value: 15, turns: 99, name: "PrecisaoFU" }); }
    fuMsgs.push(`${tgt.name}: ${r.dmg}${r.crit ? " CRÍTICO" : ""}`);
    if (!tgt.alive && f2.sfC6) { sf.energy = sf.energyMax; sf.buffs.push({ stat: "dmgBonus", value: 50, turns: 1, name: "ExecSuprema" }); fuMsgs.push("KILL! Energia máx"); }
  }
  s.sfFollowThisTurn = fuDone;
  if (fuMsgs.length || posturaMsg) s.log = [...s.log.slice(-40), `🦋 SOI FON follow-up Vento [${fuMsgs.join(", ")}]${posturaMsg}`];
}
// ----- Mecânicas da Miyabi -----
function aguSPMax(u) { return 200 + (u.stFlags?.aguC2 ? 50 : 0) + (u.weapon?.buff?.aguWeapon ? 50 : 0); }
function miyabiDetonate(s, u, fx) {
  const ens = aliveEnemies(s);
  const fuel = ens.filter((e) => (e.dots && e.dots.length) || e.debuffs.some((d) => (d.stat === "def" && d.value < 0) || d.stat === "defDown"));
  if (!fuel.length) return 0;
  let tot = 0;
  ens.forEach((e) => {
    e.dots = []; e.debuffs = e.debuffs.filter((d) => !(d.stat === "def" && d.value < 0) && d.stat !== "defDown");
    const r = dealDamage(u, e, 150 * (u.tBasic || 1), fx, { breakW: 1, el: "Glacial" }); tot += r.dmg;
    if (e.alive) e.dots.push({ type: "freeze", dmg: Math.max(1, Math.round(effStat(u, "atk") * 0.3)), turns: 1 });
  });
  return tot;
}
// ── Lupa · A Predadora de Fusão — sistema de Voracidade + Overclock (novo sistema no motor) ──
// ── Hitori Gotoh · Bocchi the Rock! — Passiva de conversão CRIT→VEL, aura Holy/Chaos e Kessoku Band ──
function hitoriSpdBonus(u) {
  const f = u.stFlags || {};
  const divisor = f.hitoriC3 ? 2 : 3; // C3: a cada 2% de Dano Crítico (era 3%)
  return Math.floor(effStat(u, "critDmg") / divisor);
}
function hitoriBasicAttack(s, u, enemy, fx, ampB) {
  if (!enemy || !enemy.alive) enemy = aliveEnemies(s)[0];
  if (!enemy) return `${u.name} não encontra alvo.`;
  const r = dealDamage(u, enemy, 40 * (u.tBasic || 1) * ampB, fx, { el: "Chaos" });
  return `🎸 ${u.name} dedilha timidamente em ${enemy.name} — ${r.dmg} de Dano de Chaos${r.crit ? " (CRÍTICO!)" : ""}. (Ataques básicos dela não fazem muita coisa.)`;
}
function hitoriSkillAttack(s, u, fx) {
  const f = u.stFlags || {};
  const allies = s.heroes.filter((h) => h.alive && !h.isSummon);
  const atkBonus = f.hitoriC3 ? 1500 : 1000;
  const spdBonus = 12;
  const targets = f.hitoriC3 ? allies : allies.filter((h) => h.uid !== u.uid).slice(0, 1).concat(allies.filter((h) => h.uid !== u.uid).length ? [] : [u]);
  targets.forEach((h) => {
    h.buffs = h.buffs.filter((b) => b.name !== "Entoar da Solidão");
    h.buffs.push({ stat: "atk", value: atkBonus, turns: 3, name: "Entoar da Solidão" });
    h.buffs.push({ stat: "spd", value: spdBonus, pct: true, turns: 3, name: "Entoar da Solidão" });
  });
  // C4: Purificação Térmica — remove 1 debuff de todos os aliados
  if (f.hitoriC4) allies.forEach((h) => { if (h.debuffs.length) h.debuffs.shift(); });
  // Arma: se a portadora for Hitori, concede 12% de Perfuração ao aliado do primeiro slot
  if (u.weapon?.buff?.hitoriWeapon) { const slot0 = allies.find((h) => h.uid === "H0"); if (slot0) { slot0.buffs = slot0.buffs.filter((b) => b.name !== "Perfuração da Batera"); slot0.buffs.push({ stat: "defPen", value: 12, turns: 3, name: "Perfuração da Batera" }); } }
  return `🎶 ${u.name} entoa "Entoar da Solidão" — ${targets.length > 1 ? "todo o time" : (targets[0]?.name || "um aliado")} ganha +${atkBonus} de ATK e +${spdBonus}% de VEL por 3 turnos.${f.hitoriC4 ? " Purificação Térmica: remove 1 debuff de todos." : ""}`;
}
function hitoriUltimate(s, u, fx) {
  const f = u.stFlags || {};
  const overclock = !!f.hitoriC6;
  const cd = effStat(u, "critDmg");
  const crGain = Math.round(cd * (overclock ? 0.16 : 0.08));
  const cdGain = Math.round(cd * (overclock ? 0.60 : 0.30));
  const spd = effStat(u, "spd");
  const elemGain = Math.round(spd * (overclock ? 0.30 : 0.15));
  const allies = s.heroes.filter((h) => h.alive && !h.isSummon);
  const dur = overclock ? 6 : 4;
  allies.forEach((h) => {
    h.buffs = h.buffs.filter((b) => b.name !== "Kessoku Band");
    h.buffs.push({ stat: "critRate", value: crGain, turns: dur, name: "Kessoku Band" });
    h.buffs.push({ stat: "critDmg", value: cdGain, turns: dur, name: "Kessoku Band" });
  });
  const frontTwo = allies.filter((h) => ["H0", "H1"].includes(h.uid));
  frontTwo.forEach((h) => { h.buffs = h.buffs.filter((b) => b.name !== "Solo de Hitori"); h.buffs.push({ stat: "elemDmg", value: elemGain, turns: dur, name: "Solo de Hitori" }); });
  const enGain = overclock ? 60 : 30;
  allies.forEach((h) => {
    const before = h.energy; h.energy = Math.min(h.energyMax, h.energy + enGain);
    const overflow = f.hitoriC6 ? Math.max(0, (before + enGain) - h.energyMax) : 0;
    if (overflow > 0) { h.buffs.push({ stat: "critDmg", value: overflow * 2, turns: 2, name: "Transbordo Crítico" }); }
  });
  // C1: +24% Perfuração de DEF pra todo o time
  if (f.hitoriC1) allies.forEach((h) => { h.buffs = h.buffs.filter((b) => b.name !== "Fio Perfurante"); h.buffs.push({ stat: "defPen", value: 24, turns: dur, name: "Fio Perfurante" }); });
  // C2: regenera 20% do HP máximo de todos os aliados
  if (f.hitoriC2) allies.forEach((h) => healUnit(h, Math.round(h.maxHp * 0.20), fx));
  // C6: Avanço de Ação Absoluto pros 2 primeiros slots + ignoram 50% DEF / 30% RES por 1 ataque
  if (overclock) {
    frontTwo.forEach((h) => { h.av = 0.01; h.buffs.push({ stat: "defPen", value: 50, turns: 1, name: "Overclock: Solo" }); h.buffs.push({ stat: "elemRes", value: -30, turns: 1, name: "Overclock: Solo (alvo)" }); });
  }
  return `🎤🔥 ${u.name} solta o "KESSOKU BAND"! +${crGain}% CRIT, +${cdGain}% CRIT DMG pra equipe (${dur}t), +${elemGain}% Dano Elemental pros 2 primeiros slots, +${enGain}⚡ de energia pra todos.${overclock ? " OVERCLOCK: os 2 primeiros slots agem AGORA e ignoram DEF/RES no próximo golpe!" : ""}`;
}
function lupaVorCap(u) { return u.stFlags?.lupaC6 ? 15 : 10; }
// Arma Presa da Calamidade Eterna — Acúmulo de Incinerador (máx 3, +10% Dano de Fogo cada, refresca 2 turnos)
function lupaIncineratorStack(u) {
  if (!u.weapon?.buff?.lupaWeapon) return;
  const stacks = u.buffs.filter((b) => b.name === "Incinerador").length;
  if (stacks < 3) u.buffs.push({ stat: "dmgBonus", value: 10, turns: 2, name: "Incinerador" });
  else u.buffs.filter((b) => b.name === "Incinerador").forEach((b) => (b.turns = 2));
}
function lupaVoracityProc(u, target, fx) {
  if (!target || !target.dots || !target.dots.length) return;
  const dot = target.dots[0]; // consome 1 rodada do primeiro DoT ativo no alvo
  dot.turns -= 1;
  if (dot.turns <= 0) target.dots = target.dots.filter((d) => d !== dot);
  const cap = lupaVorCap(u);
  if ((u._lupaVor || 0) >= cap) return; // já no teto — nada a ganhar
  u._lupaVor = Math.min(cap, (u._lupaVor || 0) + 1);
  u.energy = Math.min(u.energyMax, u.energy + 5);
  fx.push({ uid: u.uid, txt: "🍖+1", heal: true, id: Math.random() });
  lupaIncineratorStack(u);
  lupaPackAmp(u, fx); // C2: Amplificação de Matilha ao consumir qualquer DoT
}
// C2 · Amplificação de Matilha: sempre que Lupa consome QUALQUER DoT, o time ganha +30% Dano de Fogo / +20% Dano de DoT por 3 turnos
function lupaPackAmp(u, fx) {
  if (!u.stFlags?.lupaC2) return;
  (u._sibs || []).filter((h) => h.alive).forEach((h) => {
    h.buffs = h.buffs.filter((b) => b.name !== "Amplificação de Matilha");
    h.buffs.push({ stat: "dmgBonus", value: 30, turns: 3, name: "Amplificação de Matilha" });
    h.buffs.push({ stat: "dotDmg", value: 20, turns: 3, name: "Amplificação de Matilha" });
  });
}
// C4 · Barreira de Incineradores: escudo de chamas ao conjurar Ultimate ou entrar em Predadora Absoluta
function lupaFlameShield(u, s, fx) {
  if (!u.stFlags?.lupaC4) return;
  const sh0 = Math.round(effStat(u, "atk") * 1.5);
  s.heroes.filter((h) => h.alive && !h.isSummon).forEach((h) => {
    h.shield = (h.shield || 0) + capShieldAdd(h, sh0);
    h.buffs = h.buffs.filter((b) => b.name !== "Manto Flamejante");
    h.buffs.push({ stat: "elemRes", value: 15, turns: 3, name: "Manto Flamejante" });
  });
  pushLog(s, `🔥🛡️ ${u.name} — Manto Flamejante! Escudo de ${sh0} e +15% RES a todo elemento por 3 turnos ao time.`);
}
function lupaBasicAttack(s, u, enemy, fx, ampB) {
  const f = u.stFlags || {}, sk = u.skill || {};
  if (!enemy || !enemy.alive) enemy = aliveEnemies(s)[0];
  if (!enemy) return `${u.name} não encontra alvo.`;
  const cap = lupaVorCap(u);
  const predAbs = (u._lupaVor || 0) >= cap;
  const defPen = predAbs ? (f.lupaC2 ? 40 : 20) : 0;
  const vorMul = 1 + Math.min(cap, u._lupaVor || 0) * 0.20;
  const overclock = (u._lupaOverclock || 0) > 0;
  let msg = "";
  if (overclock) {
    // Overclock: o Básico é substituído por Julgamento Solar (área, crítico garantido, +100% CRIT DMG)
    let tot = 0;
    aliveEnemies(s).forEach((e) => { const r = dealDamage(u, e, 500 * (u.tBasic || 1) * ampB * vorMul, fx, { el: "Fogo", breakW: 1, forceCrit: true }); tot += r.dmg; });
    msg = `☀️🔥 JULGAMENTO SOLAR em área — ${tot} de Dano de Fogo (CRÍTICO GARANTIDO)!`;
    lupaReapplyDots(u, s, fx, 120); // reaplica DoTs consumidos com +120% de dano base
  } else {
    const hadDot = (enemy.dots || []).length > 0;
    const bonusMul = hadDot ? 1.5 : 1; // +50% se o alvo já tem DoT ativo
    const r = dealDamage(u, enemy, (sk.basicMul || 150) * (u.tBasic || 1) * ampB * bonusMul * vorMul, fx, { el: "Fogo", breakW: 1, defPen });
    const ignChance = f.lupaT1 ? 1 : 0.85;
    let ignMsg = "";
    const ignMul = (u._lupaSupernova || 0) > 0 ? 120 : 60; // Supernova (arma): Ignição em dobro por 2 turnos pós-Ultimate
    if (enemy.alive && Math.random() < ignChance) { applyDot([enemy], { type: "burn", mul: ignMul, turns: 3 }, u, fx); ignMsg = ignMul > 60 ? " Aplica Ignição (DOBRADA pela Supernova)." : " Aplica Ignição."; }
    msg = `🔥 Presa Incandescente em ${enemy.name} — ${r.dmg} de Dano de Fogo${r.crit ? " (CRÍTICO!)" : ""}${hadDot ? " (+50% vs alvo com DoT)" : ""}.${ignMsg}`;
  }
  // C4: atacar protegida pelo próprio Manto Flamejante dá +25% de Dano de Fogo (aplicado como buff pessoal)
  if (f.lupaC4 && u.buffs.some((b) => b.name === "Manto Flamejante") && !u.buffs.some((b) => b.name === "Sincronia Ofensiva")) {
    u.buffs.push({ stat: "dmgBonus", value: 25, turns: 1, name: "Sincronia Ofensiva" });
  }
  if (predAbs) {
    u._lupaVor = 0; u._lupaGuaranteedCritUlt = true;
    if (f.lupaC4) lupaFlameShield(u, s, fx); // C4: também entra ao atingir Predadora Absoluta
    msg += " 🍖 PREDADORA ABSOLUTA consumida — a próxima Ultimate crava CRÍTICO garantido!";
  }
  return msg;
}
function lupaSkillAttack(s, u, enemy, fx, ampS) {
  const f = u.stFlags || {}, sk = u.skill || {};
  if (!enemy || !enemy.alive) enemy = aliveEnemies(s)[0];
  if (!enemy) return `${u.name} não encontra alvo.`;
  const cap = lupaVorCap(u);
  const vorMul = 1 + Math.min(cap, u._lupaVor || 0) * 0.20;
  const r = dealDamage(u, enemy, (sk.skillMul || 300) * (u.tSkill || 1) * ampS * vorMul, fx, { el: "Fogo", breakW: 2 });
  let msg = `🌋 Salto do Abismo em ${enemy.name} — ${r.dmg} de Dano de Fogo${r.crit ? " (CRÍTICO!)" : ""}.`;
  if ((u._lupaSupernova || 0) > 0 && enemy.alive) { applyDot([enemy], { type: "burn", mul: 120, turns: 3 }, u, fx); msg += " ☄️ Supernova: aplica Ignição em dobro."; }
  // Detonação Expressa: consome metade da duração restante de todos os DoTs do alvo (C1: mantém a duração cheia)
  const dots = (enemy.dots || []).slice();
  if (enemy.alive && dots.length) {
    let consumedRounds = 0, burstBase = 0;
    dots.forEach((d) => {
      const half = Math.max(1, Math.ceil((d.turns || 0) / 2));
      consumedRounds += half; burstBase += d.dmg * half;
      if (!f.lupaC1) d.turns = Math.max(0, d.turns - half); // C1: não reduz a duração
    });
    if (!f.lupaC1) enemy.dots = enemy.dots.filter((d) => d.turns > 0);
    if (burstBase > 0) {
      const burst = Math.round(burstBase * 2.0);
      enemy.hp -= burst; if (enemy.hp <= 0) { enemy.hp = 0; enemy.alive = false; }
      fx.push({ uid: enemy.uid, txt: String(burst), crit: false, id: Math.random(), el: "Fogo" });
      msg += ` 💥 Detonação Expressa: +${burst} de Dano de Fogo (${consumedRounds} rodadas de DoT consumidas)!`;
      const gained = Math.min(consumedRounds, cap - (u._lupaVor || 0));
      if (gained > 0) { u._lupaVor = Math.min(cap, (u._lupaVor || 0) + gained); u.energy = Math.min(u.energyMax, u.energy + gained * 5); lupaIncineratorStack(u); lupaPackAmp(u, fx); }
      // C2 · Eco de Detonação: 100% do burst replicado em área nos inimigos adjacentes
      if (f.lupaC2) { const others = aliveEnemies(s).filter((e) => e.uid !== enemy.uid); if (others.length) { let echoTot = 0; others.forEach((e) => { e.hp -= burst; if (e.hp <= 0) { e.hp = 0; e.alive = false; } fx.push({ uid: e.uid, txt: String(burst), crit: false, id: Math.random(), el: "Fogo" }); echoTot += burst; }); msg += ` Eco de Detonação replica ${burst} em cada inimigo adjacente!`; } }
      // C3 · Purgatório Terminal: marca Chama Residual no alvo
      if (f.lupaC3 && enemy.alive) { const ex = enemy.debuffs.find((d) => d.name === "Chama Residual"); if (ex) ex.turns = 4; else enemy.debuffs.push({ stat: "elemRes", value: -25, el: "Fogo", turns: 4, name: "Chama Residual" }); }
      // Rastro 2 · Combustão Espontânea: +5% CRIT DMG por rodada consumida (máx +50%) por 2 turnos
      if (f.lupaT2) { u.buffs = u.buffs.filter((b) => b.name !== "Combustão Espontânea"); u.buffs.push({ stat: "critDmg", value: Math.min(50, consumedRounds * 5), turns: 2, name: "Combustão Espontânea" }); }
    }
  }
  // Avanço de Ação: 100% — ela ganha um turno extra instantâneo sem gastar PH
  u._avMul = 0; s.sp = Math.min(spCapOf(s), s.sp + 1); // devolve o PH gasto no início do bloco de skill (ver dispatcher)
  msg += " ⏩ Avanço de Ação: Lupa age novamente agora!";
  return msg;
}
// Reaplica os DoTs consumidos na Ultimate (guardados em u._lupaConsumedDots) com dano base amplificado — chamado durante o Overclock
function lupaReapplyDots(u, s, fx, ampPct) {
  const stash = u._lupaConsumedDots || [];
  if (!stash.length) return;
  stash.forEach((rec) => {
    const target = [...aliveEnemies(s)].find((e) => e.uid === rec.uid);
    if (target && target.alive) {
      const mulAmped = Math.round(rec.mul * (1 + ampPct / 100));
      applyDot([target], { type: rec.type, mul: mulAmped, turns: rec.turns }, u, fx);
    }
  });
  if (!u.stFlags?.lupaC6) u._lupaConsumedDots = []; // C6: pode reaplicar em todos os turnos do Overclock (mantém a lista)
}
function lupaUltimate(s, u, fx, ampU) {
  const f = u.stFlags || {}, sk = u.skill || {};
  const enemies = aliveEnemies(s);
  if (!enemies.length) return `${u.name} não encontra alvos.`;
  const cap = lupaVorCap(u);
  // Consumo Absoluto: consome TODOS os DoTs de TODOS os inimigos, somando rodadas pro escalonamento
  let totalRounds = 0;
  u._lupaConsumedDots = [];
  enemies.forEach((e) => {
    (e.dots || []).forEach((d) => { totalRounds += Math.max(0, d.turns); u._lupaConsumedDots.push({ uid: e.uid, type: d.type, mul: d.dmg > 0 ? Math.round((d.dmg / Math.max(1, effStat(u, "atk"))) * 100) : 40, turns: 2 }); });
    e.dots = [];
  });
  const perRound = f.lupaC6 ? 3.5 : 2.0; // C6: +350%/rodada sem teto (era +200%)
  const scaleMul = 1 + totalRounds * perRound;
  const vorMul = 1 + Math.min(cap, u._lupaVor || 0) * 0.20;
  const forceCrit = !!u._lupaGuaranteedCritUlt; u._lupaGuaranteedCritUlt = false;
  const incStacks = u.buffs.filter((b) => b.name === "Incinerador").length;
  const defPen = 30 + incStacks * 6, resPen = 20;
  const supernova = incStacks > 0 && !!u.weapon?.buff?.lupaWeapon;
  let tot = 0;
  enemies.forEach((e) => { const r = dealDamage(u, e, (sk.ultMul || 850) * (u.tUlt || 1) * ampU * scaleMul * vorMul * (supernova ? 1.25 : 1), fx, { el: "Fogo", breakW: 3, defPen, resPen, forceCrit, noLupaProc: true }); tot += r.dmg; });
  let msg = `💥🔥 ECLIPSE DE FOGO — CATACLISMO APOCALÍPTICO! ${tot} de Dano de Fogo em área (${totalRounds} rodadas de DoT consumidas, escalonamento x${scaleMul.toFixed(1)})!`;
  if (supernova) {
    u.buffs = u.buffs.filter((b) => b.name !== "Incinerador" && b.name !== "Supernova");
    u.buffs.push({ stat: "dmgBonus", value: 15, turns: 2, name: "Supernova" });
    u._lupaSupernova = 2;
    msg += ` ☄️ Colapso Fissural (arma): Supernova! +25% CRIT DMG na Suprema (já aplicado), e por 2 turnos a Perícia/Básico ganham +15% de Dano Final e Ignição em dobro.`;
  }
  // C6 · Cataclismo Secundário: 6+ rodadas consumidas de uma vez dispara um segundo impacto de 1000% ATK, ignora 100% DEF / 50% RES
  if (f.lupaC6 && totalRounds >= 6) {
    let tot2 = 0;
    enemies.forEach((e) => { if (e.alive) { const r2 = dealDamage(u, e, 1000 * (u.tUlt || 1) * ampU, fx, { el: "Fogo", breakW: 2, defPen: 100, resPen: 50, forceCrit: true, noLupaProc: true }); tot2 += r2.dmg; } });
    msg += ` ☄️ CATACLISMO SECUNDÁRIO! +${tot2} de Dano de Fogo Puro, ignorando 100% DEF e 50% RES!`;
  }
  // Estado Overclock: 2 turnos (4 com C6)
  u._lupaOverclock = f.lupaC6 ? 4 : 2;
  lupaFlameShield(u, s, fx); // C4: escudo de chamas ao conjurar a Ultimate
  msg += ` 🔥 OVERCLOCK ativado por ${u._lupaOverclock} turnos — o Básico vira Julgamento Solar!`;
  return msg;
}
function miyabiBasicAttack(s, u, enemy, fx, ampB) {
  const f = u.stFlags || {}, sk = u.skill || {};
  if (!enemy || !enemy.alive) enemy = aliveEnemies(s)[0]; // alvo caiu? redireciona em vez de falhar
  const maxPH = f.miC6 ? 4 : 3;
  const frostZone = f.miC4 && (s.frostZone || 0) > 0;
  const inPostura = f.miPostura && (u.posturePH >= maxPH || frostZone);
  let msg = "";
  if (inPostura && f.miC6 && u.posturePH >= 4) {
    const fb = (f.miC1 && !u._firstCut) ? 1.5 : 1; let killed = false, tot = 0;
    aliveEnemies(s).forEach((e) => { const r = dealDamage(u, e, 680 * 1.20 * (u.tBasic || 1) * ampB * fb, fx, { breakW: 1, el: "Glacial", defPen: 50, enhanced: true }); tot += r.dmg; if (!e.alive) killed = true; if (e.alive) applyDot([e], { type: "freeze", mul: 260, turns: 3 }, u, fx); });
    msg = `❄️ MIYABI DESFERE O CORTE DO FIM DOS TEMPOS! ${tot} de Dano Glacial em TODOS, ignorando 50% da DEF, e aplica Congelamento.`;
    if (killed) { u._avMul = 0; msg += " Um alvo foi eliminado — Miyabi joga novamente!"; }
    u._firstCut = true; if (!frostZone) u.posturePH = 0;
  } else if (inPostura) {
    const fb = (f.miC1 && !u._firstCut) ? 1.5 : 1;
    if (enemy) { const r = dealDamage(u, enemy, (sk.basicMul || 110) * 1.75 * (u.tBasic || 1) * ampB * fb, fx, { breakW: 1, el: "Glacial", defPen: 30, enhanced: true }); msg = `❄️🌿 Corte Iaido (APRIMORADO) em ${enemy.name} — ${r.dmg}${r.crit ? " (CRÍTICO!)" : ""}, ignorando 30% da DEF.`; if (enemy.alive) { applyDot([enemy], { type: "freeze", mul: 90, turns: 2 }, u, fx); msg += " Aplica Congelamento."; } }
    u._avMul = 0.5; u._firstCut = true; if (!frostZone) u.posturePH = 0;
  } else {
    if (enemy) { const r = dealDamage(u, enemy, (sk.basicMul || 110) * (u.tBasic || 1) * ampB, fx, { breakW: 1, el: "Glacial" }); msg = `${u.name} usa Corte Gélido em ${enemy.name} — ${r.dmg}${r.crit ? " (CRÍTICO!)" : ""}.`; if (enemy.alive) applyDot([enemy], { type: "freeze", mul: 50, turns: 2 }, u, fx); }
    u.posturePH = Math.min(maxPH, u.posturePH + 1);
    if (u.posturePH >= maxPH) msg += ` (${maxPH} PH — Postura Iaido pronta!)`;
  }
  if (f.miResidual && enemy && enemy.alive && enemy.debuffs.some((d) => d.name === "Residual")) {
    const r = dealDamage(u, enemy, 90, fx, { breakW: 1, el: "Glacial" });
    enemy.dots.forEach((d) => (d.turns += 1));
    enemy.debuffs = enemy.debuffs.filter((d) => d.name !== "Residual");
    msg += ` Cortes Residuais ecoam por ${r.dmg} e estendem os DoTs.`;
  }
  if (f.miDetonate) { const t = miyabiDetonate(s, u, fx); if (t) msg += ` 💥 Detonação Glacial: ${t} em área + Congelamento.`; }
  return msg;
}
// Mutadores do Abismo aplicados após cada ação (chão estilhaçado, vingança, explosão, escalada, ventos)
function applyMutPostAction(s, actor) {
  const mut = actor && actor._mut; if (!mut) return;
  if (mut === "chao" && actor.alive) { const c = Math.max(1, Math.round(actor.maxHp * 0.05)); actor.hp -= c; if (actor.hp <= 0) { actor.hp = 0; actor.alive = false; } s.fx.push({ uid: actor.uid, txt: String(c), dot: "burn", id: Math.random() }); }
  if (mut === "escalada" && actor.side === "enemy" && actor.alive) actor.base.dmgBonus = (actor.base.dmgBonus || 0) + 10;
  if (mut === "ventos" && actor.side === "enemy" && actor.alive) { const rg = Math.round(actor.maxHp * 0.10); actor.hp = Math.min(actor.maxHp, actor.hp + rg); s.fx.push({ uid: actor.uid, txt: "+" + rg, heal: true, id: Math.random() }); }
  // Vingança / Explosão: processa inimigos recém-mortos
  s.enemies.forEach(e => {
    if (!e.alive && !e._mutDeathDone) {
      e._mutDeathDone = true;
      if (mut === "vinganca") s.enemies.forEach(o => { if (o.alive) { o.buffs.push({ stat: "atk", value: 20, pct: true, turns: 9999, name: "Vingança" }); o.buffs.push({ stat: "spd", value: 20, pct: true, turns: 9999, name: "Vingança" }); } });
      if (mut === "explosao") { const bd = Math.round(e.maxHp * 0.15); s.heroes.forEach(h => { if (h.alive && !h.isSummon) { h.hp -= bd; if (h.hp <= 0) { h.hp = 0; h.alive = false; } s.fx.push({ uid: h.uid, txt: String(bd), crit: true, id: Math.random(), el: "Fogo" }); } }); s.log = [...s.log.slice(-40), "💥 " + e.name + " EXPLODE ao morrer — " + bd + " de dano em todos!"]; }
    }
  });
}
function tickDots(u, fx, allies) {
  // Cooldown de reaplicação de DoT (2 turnos inteiros após o encerramento) — decrementa mesmo sem dots ativos
  if (u._dotCd) { for (const k in u._dotCd) { if (u._dotCd[k] > 0) u._dotCd[k] -= 1; } }
  if (!u.dots || !u.dots.length) return;
  let total = 0;
  if ((u._aeroCd || 0) > 0) u._aeroCd -= 1;
  // Glacier: na 3ª camada, QUEBRA DE GELEIRA — consome tudo e detona (trava anti-HK: máx 25% do HP atual)
  { const gl = u.dots.filter(d => d.type === "freeze" || d.type === "geada");
    if (gl.length >= 3) {
      const nuke = Math.min(Math.round(u.hp * 0.25), Math.round(gl.reduce((a, d) => a + d.dmg, 0) * 2));
      u.hp -= nuke; total += nuke;
      u.dots = u.dots.filter(d => d.type !== "freeze" && d.type !== "geada");
      u._dotCd = u._dotCd || {}; u._dotCd.freeze = 2; u._dotCd.geada = 2;
      fx.push({ uid: u.uid, txt: "🧊 QUEBRA DE GELEIRA! " + nuke, crit: true, id: Math.random(), el: "Glacial" });
    } }
  u.dots.forEach((d) => {
    if (d.type === "bleed" || d.type === "sinking") return; // Sangramento/Afundamento não dão tick — disparam por ação/golpe
    let dmg = Math.max(1, Math.round(d.dmg * (1 + vulnOf(u) / 100)));
    // Estase (Yanagi): +25% no dano de todo DoT recebido enquanto durar
    const dotAmp = (u.debuffs || []).filter(b => b.stat === "dotAmp").reduce((a, b) => a + (b.value || 0), 0);
    if (dotAmp) dmg = Math.round(dmg * (1 + dotAmp / 100));
    // Ignis (trava anti-HK): o dano do tick nunca excede 10% do HP atual do alvo
    if (d.type === "burn") dmg = Math.max(1, Math.min(dmg, Math.round(u.hp * 0.25)));
    // Yanagi — Estase (Fagulha de Anomalia): DoTs recebidos ganham +25% de dano + escala com a Perfuração por Carga
    const sparkCt = (u.debuffs || []).filter(b => b.name === "Fagulha de Anomalia").length;
    if (sparkCt > 0) dmg = Math.round(dmg * 1.25 * (1 + Math.min(0.30, sparkCt * 0.05)));
    u.hp -= dmg; total += dmg; d.turns -= 1; fx.push({ uid: u.uid, txt: String(dmg), dot: d.type, id: Math.random() });
    if (d.type === "corrosao" && allies && allies.length) { const h = Math.round(dmg * 0.25 * (d.healMul || 1)); allies.forEach((a) => { if (a.alive && !a.isSummon) healUnit(a, h, fx); }); } // Corrosão cura o time
    // Yanagi S4: DoT em alvo sob Isolamento Corrosivo cura o time dela em 15% do ATK atual dela
    { const yanaS4h = allies && allies.find(h => h.id === "yanagi" && h.alive && h.stFlags?.yanaS4);
      if (yanaS4h && (u.debuffs || []).some(b => b.name === "Isolamento Corrosivo")) { const healAmt = Math.round(effStat(yanaS4h, "atk") * 0.15); allies.forEach(a => { if (a.alive && !a.isSummon) healUnit(a, healAmt, fx); }); } }
  });
  // Aero Sunder: colapso ao atingir 5 acúmulos (com cooldown interno de 2 rodadas — anti Turn-Lock)
  const aeroStacks = u.dots.filter(d => d.type === "aero").length;
  if (aeroStacks >= 5 && (u._aeroCd || 0) <= 0) {
    u.av = (u.av || 1) * 1.2; // atraso de 20% na barra de ação
    u._aeroCd = 2;
    let removed = 0; u.dots = u.dots.filter(d => { if (d.type === "aero" && removed < 3) { removed++; return false; } return true; }); // 5 → 2 acúmulos
    fx.push({ uid: u.uid, txt: "🌪️ COLAPSO!", crit: true, id: Math.random() });
  }
  u._fulgHits = 0; // Fulgur: reseta o limite de 4 ativações por rodada do alvo
  u._lupaResidualHits = 0; // Lupa C3: reseta o limite de 1 reação de Chama Residual por rodada do alvo
  // Cooldown de reaplicação: todo tipo de DoT que encerra agora entra em recarga de 2 turnos antes de poder ser reaplicado
  { const expiring = u.dots.filter(d => d.turns <= 0);
    if (expiring.length) { u._dotCd = u._dotCd || {}; expiring.forEach(d => { u._dotCd[d.type] = 2; }); }
  }
  u.dots = u.dots.filter((d) => d.turns > 0);
  if (u.hp <= 0) { u.hp = 0; u.alive = false; }
  return total;
}
function healUnit(u, amount, fx) {
  let amt = amount; if (u._mut === "ventos") amt = Math.round(amt * 2); if (u._glitchHealHalf) amt = Math.round(amt * 0.5);
  const before = u.hp; u.hp = Math.min(u.maxHp, u.hp + amt); const done = u.hp - before;
  fx.push({ uid: u.uid, txt: "+" + done, heal: true, id: Math.random() });
  // Arquivos da Costa Negra (6pç): registra a Cura Excedente enquanto a Suprema da Shorekeeper estiver rastreando
  const over = amt - done;
  if (over > 0) { const shkH = (u._sibs || []).find(h => h.id === "shorekeeper" && h.alive && h.stFlags?.setCostaNegra6 && (h._costaNegraTrack || 0) > 0); if (shkH) shkH._costaNegraOverheal = (shkH._costaNegraOverheal || 0) + over; }
  return done;
}
// Shorekeeper — Borboletas Estelares: gera 1 pra QUALQUER aliado (exceto ela) que gastar PH ou usar a Suprema
function shkGenButterfly(s, allyUid) {
  const shk = s.heroes.find(h => h.id === "shorekeeper" && h.alive);
  if (!shk || shk.uid === allyUid) return;
  const ally = s.heroes.find(h => h.uid === allyUid && h.alive && !h.isSummon);
  if (!ally) return;
  const cap = shk.stFlags?.shkC1 ? 5 : 3;
  ally._shkButterflies = Math.min(cap, (ally._shkButterflies || 0) + 1);
  // C1 · O Primeiro Arquivo: qualquer aliado com pelo menos 1 Borboleta ativa ganha 15% de Redução de Dano
  if (shk.stFlags?.shkC1 && !ally.buffs.some(b => b.name === "Gravidade Estelar")) ally.buffs.push({ stat: "dmgReduce", value: 15, turns: 9999, name: "Gravidade Estelar" });
}
function advanceServosSummon(s, owner) {
  if (!owner.stFlags?.setServos4) return;
  const mySummon = s.heroes.find(h => h.isSummon && h.alive && h.ownerUid === owner.uid);
  if (mySummon) mySummon.av = Math.max(0.01, (mySummon.av || 1) * 0.85);
}
function tickBuffs(u) {
  u.buffs = u.buffs.map((b) => ({ ...b, turns: b.turns - 1 })).filter((b) => {
    if (b.turns <= 0 && b.name === "Calibração do Caos") { u.maxHp = Math.max(1, u.maxHp - b.value); u.hp = Math.min(u.hp, u.maxHp); }
    return b.turns > 0;
  });
  u.debuffs = u.debuffs.map((b) => ({ ...b, turns: b.turns - 1 })).filter((b) => b.turns > 0);
}
function cloneU(u) { return { ...u, buffs: u.buffs.map((b) => ({ ...b })), debuffs: u.debuffs.map((b) => ({ ...b })), dots: (u.dots || []).map((d) => ({ ...d })), base: { ...u.base }, stFlags: { ...(u.stFlags || {}) } }; }
function findUnit(s, uid) { return [...s.heroes, ...s.enemies].find((u) => u.uid === uid); }
// Suportes: buffs/debuffs escalam com o nível da habilidade + amps de constelação, com teto de +12%
function supAmp(spec, t, amp) {
  const m = Math.min(1.12, Math.max(1, (t || 1) * (amp || 1) - ((t || 1) * (amp || 1) > 1 ? ((t || 1) * (amp || 1) - 1) * 0 : 0)));
  const out = { ...spec };
  ["atk", "def", "spd", "critRate", "critDmg", "value", "defDown", "vuln", "dmgBonus"].forEach(k => { if (typeof out[k] === "number" && out[k] > 0) out[k] = Math.round(out[k] * m * 10) / 10; });
  return out;
}
function applyBuff(targets, spec, name, fx, caster) {
  const extra = caster?.stFlags?.buffPlus && spec.all ? 1 : 0;
  targets.forEach((t) => { for (const stat of ["atk", "def", "critRate", "critDmg", "dmgBonus", "spd"]) if (spec[stat]) {
    if (spec.maxStacks) { const st = t.buffs.filter(b => b.name === name && b.stat === stat).length; if (st >= spec.maxStacks) continue; }
    t.buffs.push({ stat, value: spec[stat], pct: !!PCT[stat], turns: (spec.turns ?? 9999) + extra, name });
  } });
}
function applyDebuff(targets, spec, extraDef, caster) {
  const f = caster?.stFlags || {};
  const plus = f.debuffPlus;
  const defX = (plus ? 0 : 0) + (extraDef || 0) + (f.pWeakpoint ? 12 : 0) + (f.defShredHit ? 0 : 0);
  const vulnX = (plus ? 12 : 0) + (f.pAnalyze ? 12 : 0);
  targets.forEach((t) => {
    if (t.bossKind === "maximillion" && t._illusionActive && caster && caster.side === "H" && !caster.isSummon) return; // imune a debuffs de personagens principais
    if (spec.defDown) t.debuffs.push({ stat: "def", value: -(spec.defDown + defX), pct: true, turns: spec.turns + (plus ? 1 : 0), name: "DEF↓" });
    if (spec.vuln) t.debuffs.push({ stat: "vuln", value: spec.vuln + vulnX, turns: spec.turns + (plus ? 1 : 0), name: "Vuln" });
    if (caster?.weapon?.buff?.onDebuff) {
      const _od = caster.weapon.buff.onDebuff;
      const _st = t.debuffs.filter(d => d.name === "WpnShred").length;
      if (_st < (_od.maxStacks || 8)) t.debuffs.push({ stat: "def", value: -(_od.defRedTarget || 10), pct: true, turns: 2, name: "WpnShred" });
    }
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
function Battle({ team, ownedMap, encounter, ally, context, onEnd, onRetry, onNext, flash }) {
  const [state, setState] = useState(() => {
    const heroes = team.map((id, i) => (ownedMap[id] ? makeUnit(ownedMap[id], "H", i) : null)).filter(Boolean);
    if (ally) heroes.push(makeAllyUnit(ally, heroes.length));
    { const omg = heroes.find((h) => h && h.id === "omegamon" && h.alive); // Talento: +25% HP máx ao time; arma Glitch: +20% ao portador
      heroes.forEach((h) => { if (!h || h.isSummon) return; let mul = 1; if (h.weapon?.omgWeapon) mul *= 1.2; if (omg) mul *= 1.42; if (mul !== 1) { h.maxHp = Math.round(h.maxHp * mul); h.hp = h.maxHp; } });
      if (omg) { omg.omgCharges = 0; omg._c6Used = false; } }
    if (heroes.some((h) => h.stFlags?.pTeamEnergy)) heroes.forEach((h) => { if (h.energyMax) h.energy = Math.min(h.energyMax, h.energy + 15); });
    { const fr = heroes.find((h) => h.id === "frieren" && h.stFlags?.frC4); if (fr) { fr.buffs.push({ stat: "energyRegen", value: 30, pct: false, turns: 99, name: "CicloMilenar" }); } }
    { const fr = heroes.find((h) => h.id === "frieren"); if (fr) { fr._frPoints = 2; } } // Talento + C1: começa com 2 Pontos de Elemento
    { const lc = heroes.find((h) => h.id === "lancer" && h.stFlags?.lancerC1); if (lc) { lc.lancerDodges = 1; } } // C1: 1 Esquiva Absoluta grátis
    { const ag = heroes.find((h) => h.id === "agumon"); if (ag) {
        ag.agHeat = 0; ag.agSP = 0; ag.agForm = "agumon"; ag.agTrident = 0; ag.agModoX = 0; ag.agTempForm = 0; ag.agBrave = 0; ag.imgId = "agumon";
        // C4 · X-Antibody Synchro: +20% de Dano de Fogo + 25% de Dano Crítico permanentes
        if (ag.stFlags?.aguC4) { ag.base.elemBonus = (ag.base.elemBonus || 0) + 20; ag.buffs.push({ stat: "critDmg", value: 25, turns: 9999, name: "X-Antibody Synchro" }); }
        // C6 · Final Digital Evolution: começa a batalha já na forma Greymon
        if (ag.stFlags?.aguC6) {
          ag._aguBaseMaxHp = ag.maxHp;
          ag.agForm = "greymon"; ag.imgId = "agumon_greymon";
          ag.buffs.push({ stat: "def", value: 100, pct: true, turns: 9999, name: "Forma: Greymon" });
          const hpGain = Math.round(ag._aguBaseMaxHp * 0.6); ag.maxHp = ag._aguBaseMaxHp + hpGain; ag.hp = ag.maxHp;
        }
      } }
    { const yoru0 = heroes.find((h) => h.id === "yoruichi"); if (yoru0 && yoru0.stFlags?.yoruT1 && yoru0.energyMax) { yoru0.energy = Math.min(yoru0.energyMax, yoru0.energy + 20); yoru0._yoruT1Uses = 0; } }
    { const shk0 = heroes.find((h) => h.id === "shorekeeper"); if (shk0 && shk0.stFlags?.shkT1 && shk0.energyMax) { shk0.energy = Math.min(shk0.energyMax, shk0.energy + 25); } }
    { const hitori0 = heroes.find((h) => h.id === "hitori" && h.alive);
      if (hitori0) {
        const FOLLOWUP_IDS = ["yoruichi", "soifon", "nami"]; // personagens com mecânica de Ataque Extra no jogo
        heroes.forEach((h) => { if (!h.isSummon && h.alive && FOLLOWUP_IDS.includes(h.id)) h.buffs.push({ stat: "followupDmg", value: 250, turns: 9999, name: "Ressonância de Palco (Hitori)" }); });
      } }
    { const lp0 = heroes.find((h) => h.id === "lupa"); if (lp0) { lp0._lupaVor = 0; lp0._lupaOverclock = 0;
        if (lp0.stFlags?.lupaT1 && lp0.energyMax) { lp0._lupaVor = 3; lp0.energy = Math.min(lp0.energyMax, lp0.energy + 20); } } } // Rastro 1 · Rastro da Caçada
    { const kb0 = heroes.find((h) => h.id === "kaiba"); if (kb0 && kb0.stFlags?.kaibaT1) { const starter = makeSummon(kb0, { uid: "S_" + kb0.uid + "_mon0", name: "Vorse Raider", avatar: "👹", imgKey: "card_vorse", kind: "monster", mul: 260, spd: effStat(kb0, "spd"), atkMul: 1.2, hpMul: 0.001, life: Infinity }); starter.cardBleed = 0.5; heroes.push(starter); } }
    { const yana0 = heroes.find((h) => h.id === "yanagi"); if (yana0 && yana0.weapon?.buff?.teamCritRate) { const critBonus = yana0.weapon.buff.teamCritRate; heroes.forEach(h => { if (!h.isSummon) h.buffs.push({ stat: "critRate", value: critBonus, turns: 9999, name: "Ressonância de Equipe" }); }); } }
    const enemies = Array.from({ length: Math.max(1, Math.min(3, encounter.count)) }, (_, i) => makeEnemy(i, { ...encounter, boss: encounter.boss && (encounter.waves || 1) <= 1 }));
    // _sibs: referências dos aliados de cada lado (Fulgur Resonance precisa achar o de menor HP)
    heroes.forEach(h => { h._sibs = heroes; });
    enemies.forEach(e => { e._sibs = enemies; });
    { const lp1 = heroes.find(h => h.id === "lupa" && h.stFlags?.lupaC1); if (lp1) { enemies.forEach(e => applyDot([e], { type: "burn", mul: 60, turns: 3 }, lp1, [])); lp1.buffs.push({ stat: "energyRegen", value: 15, turns: 9999, name: "Rastreadora de Cinzas" }); } } // C1 · Rastreadora de Cinzas: 1 Ignição em todos ao entrar em combate + Regen Energia +15% permanente
    { const yn0 = heroes.find(h => h.id === "yanagi"); if (yn0 && yn0.stFlags?.yanaT1) { enemies.forEach(e => { e.debuffs.push({ stat: "mark", value: 0, turns: 3, name: "Fagulha de Anomalia" }); }); } }
    // ══ ABISMO DE DADOS: HP persistente (permadeath), mutador do andar e glitches da run ══
    let abLog = [];
    if (encounter.abismo) {
      const hpMap = encounter.abismoHp || {};
      heroes.forEach(h => { if (hpMap[h.id] != null) { h.hp = Math.max(1, Math.min(h.maxHp, Math.round(h.maxHp * hpMap[h.id]))); } });
      const mut = encounter.abismoMutator || null;
      const gls = encounter.abismoGlitches || [];
      [...heroes, ...enemies].forEach(x => { x._mut = mut; });
      heroes.forEach(h => { h._glitches = gls; if (encounter.abismoUti) h._uti = true; });
      if (mut === "pacto_vidro") [...heroes, ...enemies].forEach(x => { x.maxHp = Math.round(x.maxHp / 2); x.hp = Math.min(x.hp, x.maxHp); x.buffs.push({ stat: "critDmg", value: 150, turns: 9999, name: "Pacto de Vidro" }); });
      if (gls.includes("patch")) heroes.forEach(h => { h.shield = (h.shield || 0) + capShieldAdd(h, Math.round(h.maxHp * 0.10)); });
      if (gls.includes("bateria")) heroes.forEach(h => { if (h.energyMax) h.energy = Math.min(h.energyMax, h.energy + 20); });
      if (gls.includes("lente")) heroes.forEach(h => { h.buffs.push({ stat: "critRate", value: 15, turns: 9999, name: "Lente de Aumento" }); });
      if (gls.includes("contrato")) heroes.forEach(h => { h.buffs.push({ stat: "critDmg", value: 80, turns: 9999, name: "Contrato Equivalente" }); h._glitchHealHalf = true; });
      if ((encounter.abismoCurse || 0) > 0) heroes.forEach(h => { h.debuffs.push({ stat: "spd", value: -15, pct: false, turns: 9999, name: "Pesos de Chumbo" }); });
      const MUT_NAMES = { pacto_vidro: "Pacto de Vidro (+150% CRIT DMG, HP pela metade)", miasma: "Miasma Cegante (CRIT travado em 0%)", espelhos: "Espelhos (25% de erro global)", frenesi: "Frenesi (abates concedem turno extra)", chao: "Chão Estilhaçado (agir custa 5% do HP)", vinganca: "Vingança (inimigos abatidos enfurecem os vivos)", explosao: "Explosão (inimigos detonam ao morrer)", escalada: "Escalada (+10% de dano inimigo por ação)", ventos: "Ventos Curativos (curas ×2, inimigos regeneram)", masoquista: "Masoquista (sofrer dano acumula +5% ATK)" };
      if (mut) abLog.push("🌪️ MUTADOR DO ANDAR: " + (MUT_NAMES[mut] || mut));
      if (gls.length) abLog.push("🧩 Glitches ativos: " + gls.length);
    }
    const totalWaves = Math.max(1, Math.min(8, encounter.waves || 1));
    const _shkC2Start = heroes.some(h => h.id === "shorekeeper" && h.stFlags?.shkC2);
    return { heroes, enemies, sp: _shkC2Start ? 6 : 3, wave: 1, totalWaves, heroTurns: 0, enc: encounter, log: [...abLog, totalWaves > 1 ? `⚔️ Dungeon de ${totalWaves} ondas — sobreviva com um só fôlego!` : "⚔️ A batalha começa! A ressonância flui…"], turn: null, over: false, win: false, fx: [], choice: null, summonFx: null, cycle: 1, cycleAv: 0 };
  });
  const [target, setTarget] = useState(0);
  useEffect(() => { const al = state.enemies.filter((e) => e.alive); if (al.length && target >= al.length) setTarget(0); }, [state.enemies, target]);
  useEffect(() => { if (state.summonFx) { const t = setTimeout(() => setState((s) => ({ ...s, summonFx: null })), 1600); return () => clearTimeout(t); } }, [state.summonFx]);
  useEffect(() => { if (state.hitFx) { const t = setTimeout(() => setState((s) => ({ ...s, hitFx: null })), 620); return () => clearTimeout(t); } }, [state.hitFx]);
  const logRef = useRef(null);
  const holdTimer = useRef(null);
  const holdingRef = useRef(false);
  const actionLockRef = useRef(0); // debounce: evita disparo duplicado da mesma ação (toque duplo no mobile, race de setState) — CRÍTICO, não remover
  const [previewKind, setPreviewKind] = useState(null);
  const [inspectUid, setInspectUid] = useState(null); // clique num personagem → painel de status/buffs
  const cardHoldTimer = useRef(null);
  const cardHoldingRef = useRef(false);
  const [cardPreviewIdx, setCardPreviewIdx] = useState(null); // segurar numa carta do Kaiba → mostra a descrição
  const current = state.turn;

  useEffect(() => {
    if (state.over) return;
    if (!current) { const t = setTimeout(advance, 250); return () => clearTimeout(t); }
    if (current.side === "enemy") { const t = setTimeout(enemyAct, 750); return () => clearTimeout(t); }
    if (current.auto || current.isSummon) { const t = setTimeout(() => autoAct(current.uid), 700); return () => clearTimeout(t); }
  }, [current, state.over]); // eslint-disable-line
  useEffect(() => { if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight; }, [state.log]);
  useEffect(() => {
    if (state.over) {
      const heroesHp = state.heroes.filter(h => !h.isSummon).map(h => ({ id: h.id, hpPct: Math.max(0, h.hp / Math.max(1, h.maxHp)), alive: h.alive }));
      // Derrota fora do Abismo: não navega sozinho — espera o jogador escolher "Jogar Novamente" ou "Voltar"
      if (!state.win && context !== "abismo") return;
      // Vitória em conteúdo farmável (ou torre, com botão de avançar direto): também espera escolha do jogador, sem navegar sozinho
      if (state.win && ["farm", "tagdungeon", "coop", "relicfarm", "relicrotate", "tower", "darktower"].includes(context)) return;
      const t = setTimeout(() => onEnd({ win: state.win, turns: state.heroTurns, heroesHp }), 1500);
      return () => clearTimeout(t);
    }
  }, [state.over]); // eslint-disable-line

  function advance() {
    setState((s) => {
      const units = [...s.heroes, ...s.enemies].filter((u) => u.alive);
      if (!units.length) return s;
      units.forEach((u) => { if (!isFinite(u.av) || u.av < 0) u.av = 9999; }); // sanitiza av (robustez)
      const minAv = Math.min(...units.map((u) => u.av));
      units.forEach((u) => (u.av -= minAv));
      const next = units.slice().sort((a, b) => a.av - b.av)[0];
      // Sistema de Ciclos (estilo HSR): 10.000 de Valor de Ação consumidos = 1 Ciclo. Sem limite — só informativo.
      let s2 = { ...s, turn: next };
      s2.cycleAv = (s2.cycleAv || 0) + minAv;
      if (s2.cycleAv >= 10000) {
        s2.cycleAv -= 10000;
        s2.cycle = (s2.cycle || 1) + 1;
        s2.log = [...s2.log, `🔄 CICLO ${s2.cycle}`];
        s2.cycleFlash = { n: s2.cycle, id: Math.random() };
        // Torre Sombria: limite de 10 Ciclos — não derrotou o chefe a tempo, a run é perdida
        if (encounter.darkTower && s2.cycle > 10 && !s2.over) {
          s2.over = true; s2.win = false;
          s2.log = [...s2.log, "⏳ LIMITE DE 10 CICLOS ATINGIDO! A Torre Sombria consome o que restou do seu time..."];
        }
      }
      return s2;
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
    const _now = Date.now();
    if (_now - actionLockRef.current < 400) return; // ignora disparo duplicado da mesma ação (toque duplo / race de estado)
    actionLockRef.current = _now;
    setState((s0) => {
      let s = { ...s0, heroes: s0.heroes.map(cloneU), enemies: s0.enemies.map(cloneU), fx: [] };
      const u = findUnit(s, current.uid); if (!u || !u.alive) { s.turn = null; return s; }
      if (kind === "skill" && s.sp <= 0) return s;
      s.heroTurns = (s.heroTurns || 0) + 1;
      // Nanami Hora Extra
      if (u.id === "nanami" && !u._horaExtra && s.heroTurns >= 5 && f.nanamHoraExtra) {
        u._horaExtra = true; u.buffs.push({ stat: "atk", value: 30, pct: true, turns: 99, name: "HoraExtra" });
        if (f.nanamC4) u.debuffs = []; // limpa debuffs ao entrar em hora extra
        pushLog(s, "💼 NANAMI entra em HORA EXTRA! +30% ATK permanente!");
      }
      // Lamina da Matriarca: heals allies 6% max HP at start of Ryoshu's turn
      if (u.id === "ryoshu" && u.weapon?.id === "lamina_matriarca" && u.weapon.buff?.allyHealPct) {
        const hp6 = u.weapon.buff.allyHealPct;
        s.heroes.filter(h => h.alive && !h.isSummon).forEach(a => { const h = Math.round(a.maxHp * hp6 / 100); healUnit(a, h, s.fx); });
      }
      tickDots(u, s.fx);
      if ((u._kaibaVirusTurns || 0) > 0) u._kaibaVirusTurns -= 1; // Vírus Esmaga-Cards (Kaiba): decai no turno de cada aliado protegido
      if (!u.alive) { pushLog(s, `${u.name} sucumbe ao dano contínuo!`); s = checkEnd(s); s.turn = null; return s; }
      refreshKaibaBuffs(s);
      // Shorekeeper: contagem regressiva do Estelarador nos turnos dela — ao acabar, desliga a Vantagem Universal de todos
      if (u.id === "shorekeeper" && (u._domainTurns || 0) > 0) {
        u._domainTurns -= 1;
        if (u._domainTurns <= 0) {
          u._domainStage = null; u._domainSpSpent = 0;
          s.heroes.forEach(h => { if (h.alive && !h.isSummon) h._universalAdvActive = false; });
          pushLog(s, "🌌 O Estelarador se dissolve — o domínio de Shorekeeper chega ao fim.");
        }
      }
      // Arquivos da Costa Negra (6pç): ao fim da janela de 3 turnos, a Cura Excedente acumulada vira uma explosão de Dano Desconhecido
      if (u.id === "shorekeeper" && (u._costaNegraTrack || 0) > 0) {
        u._costaNegraTrack -= 1;
        if (u._costaNegraTrack <= 0) {
          const over = u._costaNegraOverheal || 0;
          if (over > 0) {
            const nukeMul = (over / Math.max(1, effStat(u, "atk"))) * 100;
            let totCN = 0;
            aliveEnemies(s).forEach(e => { totCN += dealDamage(u, e, nukeMul, s.fx, { el: "Unknown", defPen: 45, isDot: true }).dmg; });
            pushLog(s, `🌌💧 ARQUIVOS DA COSTA NEGRA! ${over} de Cura Excedente detona em ${totCN} de Dano Desconhecido, ignorando 45% de DEF/RES!`);
          }
          u._costaNegraOverheal = 0;
        }
      }
      // Shorekeeper: no início do turno de QUALQUER aliado com Borboletas Estelares, consome todas de uma vez
      if (u.id !== "shorekeeper" && (u._shkButterflies || 0) > 0) {
        const shkH = s.heroes.find(h => h.id === "shorekeeper" && h.alive);
        if (shkH) {
          const n = u._shkButterflies;
          const healAmt = Math.round(shkH.maxHp * 0.04 * n);
          healUnit(u, healAmt, s.fx);
          u.buffs = u.buffs.filter(b => b.name !== "Borboletas Estelares");
          u.buffs.push({ stat: "dmgBonus", value: 5 * n, turns: 1, name: "Borboletas Estelares" }, { stat: "spd", value: 4 * n, pct: false, turns: 1, name: "Borboletas Estelares" });
          pushLog(s, `🦋 ${n} Borboleta(s) Estelar(es) em ${u.name}: +${healAmt} de HP, +${5 * n}% de Dano Final, +${4 * n} de VEL.`);
          if (shkH.stFlags?.setCostaNegra4) { u.buffs = u.buffs.filter(b => b.name !== "Sincronia"); u.buffs.push({ stat: "dmgBonus", value: 12, turns: 2, name: "Sincronia" }, { stat: "spd", value: 6, pct: false, turns: 2, name: "Sincronia" }); }
          u._shkButterflies = 0;
          u.buffs = u.buffs.filter(b => b.name !== "Gravidade Estelar"); // C1: a Redução de Dano só vale enquanto houver Borboleta ativa
        }
      }
      // Yoruichi: início do turno natural dela — detona o Ponto de Aterramento e passa a Condução Perfeita
      if (u.id === "yoruichi") {
        if ((u._yoruRecordedDmg || 0) > 0 && u._yoruMarkUid) {
          const markT = s.enemies.find(e => e.uid === u._yoruMarkUid && e.alive);
          const rec = Math.round(u._yoruRecordedDmg);
          if (markT) {
            if (u.stFlags?.yoruS6) {
              aliveEnemies(s).forEach(e => { const half = Math.round(rec * (e.uid === markT.uid ? 1 : 0.5)); e.hp = Math.max(0, e.hp - half); if (e.hp <= 0) e.alive = false; s.fx.push({ uid: e.uid, txt: String(half), crit: true, id: Math.random(), el: "Eletro" }); });
              pushLog(s, `⚡💥 PONTO DE ATERRAMENTO detona (S6, espalhado)! ${rec} de Dano Verdadeiro no alvo principal, 50% nos demais!`);
            } else {
              markT.hp = Math.max(0, markT.hp - rec); if (markT.hp <= 0) markT.alive = false;
              s.fx.push({ uid: markT.uid, txt: String(rec), crit: true, id: Math.random(), el: "Eletro" });
              pushLog(s, `⚡💥 PONTO DE ATERRAMENTO detona em ${markT.name} — ${rec} de Dano Verdadeiro Eletro!`);
              // Rastro Especial 2: a detonação também reduz a Resistência (Perfuração) em valor fixo, ignorando o elemento de fraqueza
              if (u.stFlags?.yoruT2 && markT._hasToughness && (markT.toughness || 0) > 0) {
                markT.toughness = Math.max(0, markT.toughness - 15);
                if (markT.toughness <= 0) applyBreakEffect(u, markT, "Eletro", s.fx);
              }
            }
          }
          u._yoruRecordedDmg = 0;
        }
        if ((u._yoruStance || 0) > 0) { u._yoruStance -= 1; if (u._yoruStance <= 0) { u._yoruMarkUid = null; u.buffs = u.buffs.filter(b => b.name !== "Condução Perfeita"); s.heroes.forEach(h => { if (h.alive) h.buffs = h.buffs.filter(b => b.name !== "Domínio Magnético"); }); pushLog(s, "⚡ A Condução Perfeita de Yoruichi se dissipa."); } }
        u._yoruT1Uses = 0; // Rastro 1: reseta o limite de avanços de ação a cada turno natural dela
        // Rastro Especial 3: +4% de Regen de Energia pra cada 10 de VEL acima de 140
        if (u.stFlags?.yoruT3) {
          const _yspd3 = effStat(u, "spd");
          u.buffs = u.buffs.filter(b => b.name !== "Relâmpago Causal");
          const _erBonus = Math.max(0, Math.floor((_yspd3 - 140) / 10) * 4);
          if (_erBonus > 0) u.buffs.push({ stat: "energyRegen", value: _erBonus, turns: 9999, name: "Relâmpago Causal" });
        }
        // Talento (Frequência Shunpo): +6% de CRIT DMG em Ataques Extras por 10 de VEL acima de 120 (cap 60%, ou 160% com S6)
        const ySpdT = effStat(u, "spd"); const cap = u.stFlags?.yoruS6 ? 160 : 60;
        const shunpoBonus = Math.max(0, Math.min(cap, Math.floor((ySpdT - 120) / 10) * 6));
        s.heroes.forEach(h => { h.buffs = h.buffs.filter(b => b.name !== "Frequência Shunpo"); if (shunpoBonus > 0 && h.alive) h.buffs.push({ stat: "critDmg", value: shunpoBonus, turns: 9999, name: "Frequência Shunpo" }); });
      }
      // Frieren C4: DEF -15% on all enemies when ult energy is full
      if (u.id === "frieren" && u.stFlags?.frC4 && u.energy >= u.energyMax) {
        aliveEnemies(s).forEach(e => {
          const existingAura = e.debuffs.find(d => d.name === "AuraOculta");
          if (existingAura) { existingAura.value = -20; existingAura.turns = Math.max(existingAura.turns, 2); }
          else e.debuffs.push({ stat: "def", value: -20, turns: 2, name: "AuraOculta" });
        });
        u.energy = Math.min(u.energyMax, u.energy + 8);
      }
      // Kirara C4: team dmgReduce while Kirara has shield active
      if (u.id === "kirara" && u.stFlags?.kirC4 && u.shield > 0) {
        const kAllies = s.heroes.filter(h => h.alive);
        kAllies.forEach(a => { if (!a.buffs.some(b => b.name === "GuardiaoCos")) a.buffs.push({ stat: "dmgReduce", value: 15, turns: 2, name: "GuardiaoCos" }); });
      }
      const fx = s.fx, sk = u.skill, allies = s.heroes.filter((h) => h.alive), enemy = targetEnemy(s);
      const f = u.stFlags || {};
      // ── Protocolo Ômega 4pç: 3 Fases de HP ──────────────────────────────
      if (f.setOmega4 && !u.isSummon) {
        const hpRatio = u.hp / Math.max(1, u.maxHp);
        u.buffs = u.buffs.filter(function(b){ return !b.name.startsWith("Ω·"); });
        allies.forEach(function(a){ a.buffs = a.buffs.filter(function(b){ return b.name !== "Ω·Rede"; }); });
        if (hpRatio >= 0.75) {
          u.buffs.push({ stat: "atk", value: 25, pct: true, turns: 2, name: "Ω·Supremacia" });
          allies.forEach(function(a){ a.buffs.push({ stat: "dmgBonus", value: 15, turns: 2, name: "Ω·Rede" }); });
          if (u._omgPhase !== "sup") { u._omgPhase = "sup"; pushLog(s, "☢️ " + u.name + " — PROTOCOLO SUPREMACIA: +25% ATK, time +15% Dano por 2t."); }
        } else if (hpRatio >= 0.30) {
          u.buffs.push({ stat: "critRate", value: 20, turns: 2, name: "Ω·Delta" });
          u.buffs.push({ stat: "critDmg", value: 35, turns: 2, name: "Ω·Delta" });
          if (u._omgPhase !== "dlt") { u._omgPhase = "dlt"; pushLog(s, "☢️ " + u.name + " — PROTOCOLO DELTA: +20% CRIT, +35% CRIT DMG por 2t."); }
        } else if (!u.omegaEmergency) {
          u.omegaEmergency = true; u._omgPhase = "emg";
          u.buffs.push({ stat: "atk", value: 50, pct: true, turns: 3, name: "Ω·Emergência" });
          allies.forEach(function(a){ a.shield = (a.shield || 0) + capShieldAdd(a, Math.round(u.maxHp * 0.10)); });
          s.sp = Math.min(spCapOf(s), s.sp + 2);
          pushLog(s, "☢️ " + u.name + " — ÚLTIMO PROTOCOLO ATIVADO! +50% ATK, escudo 10% HP ao time, +2 SP!");
        }
      }
      // ────────────────────────────────────────────────────────────────────
      const ampS = u.ampSkill || 1, ampU = u.ampUlt || 1, ampB = u.ampBasic || 1;
      const hb = 1.45 * (1 + (u.base.healBonus || 0) / 100); // +45% base de cura global
      const healMul = (f.healPlus ? 1.3 : 1) * (f.pRegen ? 1.25 : 1);
      const shB = hb * (1 + ((u.weapon?.shieldBonus || 0) + (f.setMuralha2 ? 30 : 0)) / 100) * ((f.shieldPlus || f.kirC2) ? 1.3 : 1) * (f.pBulwark ? 1.25 : 1) * (u.tSkill || 1);
      const enGain = (n) => Math.round(n * (1 + (effStat(u, "energyRegen") || 0) / 100));
      const doHeal = (tgt, amt) => { const done = healUnit(tgt, Math.round(amt * healMul), fx); if (f.healShield) tgt.shield += capShieldAdd(tgt, Math.round(done * 0.3)); };
      let msg = "";

      if (kind === "basic") {
        // Glacies Stasis: usar o Ataque Básico quebra 1 camada de gelo (saída segura), com leve dano de estilhaço
        { const gIdx = u.dots.findIndex(d => d.type === "freeze" || d.type === "geada");
          if (gIdx >= 0) { u.dots.splice(gIdx, 1); const chip = Math.max(1, Math.round(u.maxHp * 0.03)); u.hp = Math.max(1, u.hp - chip); fx.push({ uid: u.uid, txt: "❄️ gelo quebrado (-" + chip + ")", dot: "freeze", id: Math.random() }); } }
        let miyDone = false;
        if (u.id === "miyabi") {
          try { msg = miyabiBasicAttack(s, u, enemy, fx, ampB); }
          catch (err) { if (enemy && enemy.alive) { const r = dealDamage(u, enemy, 110 * (u.tBasic || 1) * ampB, fx, { breakW: 1, el: "Glacial" }); msg = `${u.name} ataca ${enemy.name} — ${r.dmg}.`; } else { msg = `${u.name} ataca.`; } }
          miyDone = true;
        }
        if (!miyDone && u.id === "soifon") { msg = soiFonBasicAttack(s, u, enemy, fx, ampB); miyDone = true; }
        // Ryoshu basic
        if (!miyDone && u.id === "ryoshu" && enemy) {
          const r = dealDamage(u, enemy, (sk.basicMul || 100) * u.tBasic * ampB, fx, { breakW: 1, el: "Virus" });
          if (!enemy.debuffs.some(d => d.name === "Teia")) enemy.debuffs.push({ stat: "spd", value: -10, pct: true, turns: 2, name: "Teia" }); else { const t = enemy.debuffs.find(d => d.name === "Teia"); if (t) t.value = Math.min(-20, t.value - 2); }
          msg = u.name + " usa F.P. em " + enemy.name + " — " + r.dmg + " de Dano Vírus" + (r.crit ? " (CRÍTICO!)" : "") + "! Teia: VEL -5%.";
          miyDone = true;
        }
        // Frieren basic — AOE (Magia Comum atinge todos)
        if (!miyDone && u.id === "frieren") {
          const frEnems = aliveEnemies(s);
          let frTot = 0, frCrit = false;
          frEnems.forEach(e => { const r = dealDamage(u, e, (sk.basicMul || 90) * u.tBasic * ampB, fx, { breakW: 1, el: "Holy" }); frTot += r.dmg; if (r.crit) frCrit = true; });
          if (f.frGrimoire) { u._frPoints = Math.min(4, (u._frPoints || 0) + 1); }
          msg = u.name + " conjura Magia Comum em área — " + frTot + " de Dano Holy" + (frCrit ? " (CRÍTICO!)" : "") + (f.frGrimoire ? (" [" + (u._frPoints||0) + "/4 pts]") : "") + ".";
          miyDone = true;
        }
        if (!miyDone && u.id === "hitori") {
          msg = hitoriBasicAttack(s, u, enemy, fx, ampB);
          miyDone = true;
        }
        if (!miyDone && u.id === "lupa") {
          msg = lupaBasicAttack(s, u, enemy, fx, ampB);
          miyDone = true;
        }
        if (!miyDone && u.id === "omegamon" && enemy) {
          const r = dealDamage(u, enemy, (sk.basicMul || 100) * u.tBasic * ampB, fx, { breakW: 1, el: "Virus" });
          let extra = "";
          if ((enemy.dots || []).some((d) => d.type === "corrosao")) { const h = Math.round(u.maxHp * 0.10); healUnit(u, h, fx); extra = ` Recupera ${h} de HP (alvo corroído).`; }
          if ((u.omgCharges || 0) >= 5 && enemy.alive) { enemy.buffs = []; const td = Math.round(u.maxHp * 0.38); enemy.hp -= td; if (enemy.hp <= 0) { enemy.hp = 0; enemy.alive = false; } fx.push({ uid: enemy.uid, txt: String(td), crit: true, id: Math.random(), el: "Virus" }); if (u.weapon?.omgWeapon) u.energy = Math.min(u.energyMax, u.energy + 8); u.omgCharges = 0; u.buffs = u.buffs.filter((b) => b.name !== "VirusDefeat"); extra += ` ☢️ Vírus Defeat MÁXIMO: remove buffs e causa ${td} de Dano Verdadeiro!`; }
          msg = `🛡️ ${u.name} dispara Garuru Cannon em ${enemy.name} — ${r.dmg} de Dano de Vírus${r.crit ? " (CRÍTICO!)" : ""}.${extra}`;
          miyDone = true;
        }
        if (!miyDone && u.id === "yoruichi" && enemy) {
          const ySpd = effStat(u, "spd"), yAtk = Math.max(1, effStat(u, "atk"));
          const yMul = (ySpd * 3.0 / yAtk) * 100; // 300% da VEL (convertido pra fórmula de %ATK do motor)
          const r = dealDamage(u, enemy, yMul, fx, { el: "Eletro" });
          msg = `⚡ Golpe Relâmpago em ${enemy.name} — ${r.dmg}${r.crit ? " (CRÍTICO!)" : ""}.`;
          miyDone = true;
        }
        if (!miyDone && u.id === "shorekeeper" && enemy) {
          const shkMul = (u.maxHp * 1.15 / Math.max(1, effStat(u, "atk"))) * 100; // 115% do HP Máximo (melhorado de 100%), convertido pra fórmula de %ATK do motor
          const r = dealDamage(u, enemy, shkMul * u.tBasic * ampB, fx, { el: "Unknown", breakW: 1 });
          msg = `🌌 Origem da Ciência em ${enemy.name} — ${r.dmg}${r.crit ? " (CRÍTICO!)" : ""} de Dano Desconhecido — sempre quebra a Firmeza, ignorando fraquezas.`;
          miyDone = true;
        }
        if (!miyDone && u.id === "yanagi" && enemy) {
          const r = dealDamage(u, enemy, (sk.basicMul || 100) * u.tBasic * ampB, fx, { el: "Eletro" });
          const hasSpark = enemy.alive && (enemy.debuffs || []).some(d => d.name === "Fagulha de Anomalia");
          if (hasSpark && enemy.alive) {
            const dsd = triggerDesordem(u, enemy, fx);
            msg = `⚡ Corte Voltaico em ${enemy.name} — ${r.dmg}${r.crit ? " (CRÍTICO!)" : ""}! A Fagulha reage: DESORDEM ativada — +${dsd} de Dano Eletro instantâneo!`;
          } else {
            u.energy = Math.min(u.energyMax, u.energy + 5); u.av = Math.max(0.01, (u.av || 1) * 0.85);
            msg = `⚡ Corte Voltaico em ${enemy.name} — ${r.dmg}${r.crit ? " (CRÍTICO!)" : ""}. Sem Fagulha no alvo: Sobrecarga de Retorno — +5 de Energia e ação avançada em 15%.`;
          }
          miyDone = true;
        }
        if (!miyDone && u.id === "agumon" && enemy) {
          const fm = u.agForm || "agumon";
          if (fm === "agumon") {
            const r = dealDamage(u, enemy, (sk.basicMul || 95) * u.tBasic * ampB, fx, { breakW: 1, el: "Fogo" });
            u.agSP = Math.min(aguSPMax(u), (u.agSP || 0) + 15); u.agHeat = Math.max(0, (u.agHeat || 0) - 20);
            msg = `🦖 Garra Afiada em ${enemy.name} — ${r.dmg}${r.crit ? " (CRÍTICO!)" : ""}. [+15 SP · Calor -20 → ${u.agHeat}]`;
          } else if (fm === "greymon") {
            const hot = (u.agHeat || 0) > 60;
            const r = dealDamage(u, enemy, 140 * u.tBasic * ampB, fx, { breakW: 1, el: "Fogo" });
            if (hot && enemy.alive) enemy.av = (enemy.av || 1) * 1.2;
            u.agSP = Math.min(aguSPMax(u), (u.agSP || 0) + 15); u.agHeat = Math.max(0, (u.agHeat || 0) - 15);
            msg = `🦕 Grande Chifre em ${enemy.name} — ${r.dmg}${r.crit ? " (CRÍTICO!)" : ""}${hot ? " 🔥 O chifre em brasa atrasa a ação do alvo em 20%!" : ""} [Calor → ${u.agHeat}]`;
          } else if (fm === "metalgreymon") {
            const trueDmg = Math.round(effStat(u, "atk") * 1.6 * u.tBasic * ampB);
            enemy.hp -= trueDmg; if (enemy.hp <= 0) { enemy.hp = 0; enemy.alive = false; }
            fx.push({ uid: enemy.uid, txt: String(trueDmg), crit: true, id: Math.random(), el: "Fogo" });
            if (enemy.alive) { const stolen = Math.round(effStat(enemy, "spd") * 0.15); enemy.debuffs.push({ stat: "spd", value: -stolen, pct: false, turns: 2, name: "Trident Arm" }); u.buffs.push({ stat: "spd", value: stolen, pct: false, turns: 2, name: "Trident Arm" }); }
            u.agTrident = 2; u.agSP = Math.min(aguSPMax(u), (u.agSP || 0) + 15); u.agHeat = Math.max(0, (u.agHeat || 0) - 15);
            msg = `🤖 Trident Arm crava em ${enemy.name} — ${trueDmg} de DANO VERDADEIRO! Rouba 15% da VEL. 🎯 Rastreamento p/ WarGreymon ATIVO. [Calor → ${u.agHeat}]`;
          } else {
            let agTot = 0, agCrit = false;
            const bossMul = (enemy.boss || enemy.elite) ? 2 : 1;
            for (let hi = 0; hi < 4 && enemy.alive; hi++) { const r = dealDamage(u, enemy, 65 * bossMul * u.tBasic * ampB, fx, { breakW: 1, el: "Fogo", defPen: 20 }); agTot += r.dmg; if (r.crit) agCrit = true; }
            u.agSP = Math.min(aguSPMax(u), (u.agSP || 0) + 15);
            msg = `⚔️ GREAT TORNADO! 4 cortes das Dramon Killers em ${enemy.name} — ${agTot} total${agCrit ? " (CRÍTICOS!)" : ""}${bossMul === 2 ? " (DOBRADO vs Chefe!)" : ""}.`;
          }
          // Protocolo de Adaptação Universal (6pç): Pulso de Emergência — 2×/batalha, TamerSP < 30% no Básico
          if (u.stFlags?.setAdapt6 && (u._adaptPulseUses || 0) < 2 && (u.agSP || 0) < aguSPMax(u) * 0.30) {
            u._adaptPulseUses = (u._adaptPulseUses || 0) + 1;
            u.agSP = Math.min(aguSPMax(u), (u.agSP || 0) + Math.round(aguSPMax(u) * 0.50));
            u.buffs.push({ stat: "critDmg", value: 100, turns: 2, name: "Pulso de Emergência" });
            msg += " ⚙️ PULSO DE EMERGÊNCIA! +50% de TamerSP instantâneo e o próximo ataque ganha +100% de Dano Crítico!";
          }
          miyDone = true;
        }
        if (!miyDone && u.id === "athena" && enemy) {
          const r = dealDamage(u, enemy, (sk.basicMul || 90) * u.tBasic * ampB, fx, { breakW: 1, el: "Holy" });
          let athExtra = "";
          // Rastro II · Luz Consagrada: no Modo Aprimorado, o básico cura o time em 15% do dano
          if (f.athII && u.athEnhanced && r.dmg > 0) {
            const hAmt = Math.round(r.dmg * 0.15);
            s.heroes.filter(h => h.alive && !h.isSummon).forEach(h => healUnit(h, hAmt, fx));
            athExtra = ` ✨ Luz Consagrada cura o time em ${hAmt}.`;
          }
          msg = `🕊️ ${u.name} usa Julgamento Divino em ${enemy.name} — ${r.dmg} de Dano Holy${r.crit ? " (CRÍTICO!)" : ""}.${athExtra}`;
          miyDone = true;
        }
        if (!miyDone && enemy && sk.basicMul) { const r = dealDamage(u, enemy, sk.basicMul * u.tBasic * ampB, fx, { breakW: 1 }); msg = `${u.name} usa Ataque Básico em ${enemy.name} — ${r.dmg} de dano${r.crit ? " (CRÍTICO!)" : ""}.`; }
        if (f.kcAdvance) { const ds = aliveDragons(s, u.uid); ds.forEach((d) => { d.av = Math.max(0.1, d.av * 0.65); }); if (ds.length) msg += ` Os ${ds.length} dragões avançam na linha do tempo!`; }
        if (u.id === "lancer" && f.lancerTempestade) { u.buffs = u.buffs.filter(b => b.name !== "Tempestade de Lanças"); u.buffs.push({ stat: "dmgBonus", value: 20, turns: 1, name: "Tempestade de Lanças" }); msg += " ⚡ Tempestade de Lanças: +20% no próximo golpe."; }
        if (f.uraAdvance && u.id === "uraraka") { u.av = Math.max(0.1, u.av * 0.85); msg += " Uraraka avança na linha do tempo (Zero G)!"; }
        s.sp = Math.min(spCapOf(s), s.sp + 1); u.energy = Math.min(u.energyMax, u.energy + enGain(sk.enBasic || 15));
      } else if (kind === "skill") {
        if (u.id === "uraraka" && sk.uraSkill) { s.choice = { uid: u.uid, kind: "uraraka" }; return s; }
        s.sp -= 1; u.energy = Math.min(u.energyMax, u.energy + enGain(sk.enSkill || 22)); advanceServosSummon(s, u); shkGenButterfly(s, u.uid);
        // Shorekeeper: Estelarador Estágio 2 — evolui ao acumular 3 PH gastos com o domínio ativo
        { const shkH = s.heroes.find(h => h.id === "shorekeeper" && h.alive);
          if (shkH && shkH._domainStage === 1) {
            shkH._domainSpSpent = (shkH._domainSpSpent || 0) + 1;
            if (shkH._domainSpSpent >= 3) {
              shkH._domainStage = 2;
              s.heroes.forEach(h => { if (h.alive && !h.isSummon) h._universalAdvActive = true; });
              pushLog(s, "🌌⚡ ESTELARADOR — ESTÁGIO 2 (SINCRONIA)! 50% de todo dano da equipe agora herda a Vantagem Universal de Shorekeeper.");
            }
          } }
        if (u.id === "miyabi" && f.miC2 && enemy && (enemy.dots || []).some((d) => d.type === "freeze" || d.type === "geada")) s.sp = Math.min(spCapOf(s), s.sp + 1); // C2: vs Congelado não gasta PH
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
          if (sk.skillMul) { const wpen = u.weapon?.id === "duelo_nexo" ? 30 : 0; let tot = 0; aliveEnemies(s).forEach((e) => { tot += dealDamage(u, e, sk.skillMul * sMul, fx, { breakW: 2, el: "Eletro", defPen: wpen }).dmg; }); if (tot) msg += ` Rajada Eletro em área: ${tot}${wpen ? " (perfura DEF)" : ""}.`; }
          if (f.kS2) { const sh0 = Math.round(effStat(u, "atk") * ampS); const sh = capShieldAdd(u, sh0); u.shield += sh; msg += ` Barreira do Duelista: escudo de ${sh}${sh < sh0 ? " (travado no teto de "+SHIELD_CAP+")" : ""}.`; }
          refreshKaibaBuffs(s);
        }
        else if (u.id === "ryoshu" && sk.ryoSkill) {
          const sMul = u.tSkill * ampS;
          const drainable = allies.filter(a => a.uid !== u.uid && !a.isSummon && a.alive);
          let totalDrained = 0; let tensao = 0;
          drainable.forEach(a => {
            const pct = f.ryoC1 ? 0.10 : 0.15;
            const drained = Math.max(1, Math.round(a.maxHp * pct));
            a.hp = Math.max(1, a.hp - drained);
            totalDrained += drained;
            if (drained > 1000) tensao = Math.min(3, tensao + 1);
            fx.push({ uid: a.uid, txt: "-" + drained, dot: "drain", id: Math.random() });
            if (f.ryoC2) { a.buffs = a.buffs.filter(b => b.name !== "FioGuia"); a.buffs.push({ stat: "dmgReduce", value: 30, turns: 1, name: "FioGuia" }); }
            if (f.ryoPIP && a.shield > 0) { const ab = Math.round(a.shield * 0.30); u.buffs = u.buffs.filter(b => b.name !== "ShieldATK"); u.buffs.push({ stat: "atk", value: ab, pct: false, turns: 2, name: "ShieldATK" }); }
            if (f.ryoC4 && a.buffs.length > 0) u.energy = Math.min(u.energyMax, u.energy + 5);
          });
          u._ryoTensao = tensao;
          if (u.weapon?.id === "lamina_matriarca") u._inkDrops = Math.min(3, (u._inkDrops || 0) + 1);
          const inkMul = u.weapon?.id === "lamina_matriarca" ? (1 + (u._inkDrops || 0) * 0.15) : 1;
          const flatBase = Math.round(totalDrained * 2.40 * (1 + tensao * 0.18) * inkMul * (f.setTeia4 ? 1.40 : 1));
          // Teia 4pc: +3% DEF pen per 10% missing HP on allies (max 30%)
          if (f.setTeia4) { let mp = 0; drainable.forEach(a => { mp += (1 - a.hp/a.maxHp)*100; }); u._teiaDefPen = Math.min(30, Math.round(mp/10)*3); } else u._teiaDefPen = 0;
          let tot = 0;
          aliveEnemies(s).forEach(e => {
            const r = dealDamage(u, e, (sk.skillMul || 220) * sMul, fx, { breakW: 2, el: "Virus", defPen: u._teiaDefPen || 0 });
            tot += r.dmg;
            const critM = (f.ryoSET && Math.random() < (u.base.critRate / 100)) ? (1 + (effStat(u,"critDmg")||50)/100) : 1;
            const fd = Math.round(flatBase * critM);
            e.hp -= fd; if (e.hp <= 0) { e.hp = 0; e.alive = false; }
            fx.push({ uid: e.uid, txt: String(fd), crit: critM > 1, id: Math.random(), el: "Virus" });
            tot += fd;
          });
          msg = u.name + " usa Marionetes de Sangue! Drena " + totalDrained + " HP" + (tensao ? " [Tensão x" + tensao + "]" : "") + " e causa " + tot + " de dano (" + Math.round(flatBase) + " Dano Fixo" + (inkMul > 1 ? " [Gotas de Tinta]" : "") + ")." + (f.ryoC2 ? " [Fio Guia] ao time!" : "");
        }
        else if (u.id === "hitori" && sk.hitoriSkill) {
          msg = hitoriSkillAttack(s, u, fx);
        }
        else if (u.id === "lupa" && sk.lupaSkill) {
          msg = lupaSkillAttack(s, u, enemy, fx, ampS);
        }
        else if (u.id === "frieren" && sk.frSkill) {
          const sMul = u.tSkill * ampS;
          // Grimório do Colecionador — AOE (atinge todos os inimigos)
          const frSkEnems = aliveEnemies(s);
          let frSkTot = 0, frSkCrit = false;
          frSkEnems.forEach(e => { const r = dealDamage(u, e, (sk.skillMul || 180) * sMul, fx, { breakW: 2, el: "Holy" }); frSkTot += r.dmg; if (r.crit) frSkCrit = true; });
          u._frPoints = Math.min(4, (u._frPoints || 0) + 2);
          u._frPointTypes = (u._frPointTypes || []).concat(["Vento","Fogo","Gelo","Eletro"][Math.floor(Math.random()*4)], ["Vento","Fogo","Gelo","Eletro"][Math.floor(Math.random()*4)]).slice(-4);
          if (u.weapon?.id === "cajado_fim_era") u.energy = Math.min(u.energyMax, u.energy + (u.weapon.buff?.frElemEnergy || 10) * 2);
          msg = u.name + " usa Grimório do Colecionador em área — " + frSkTot + " de Dano Holy" + (frSkCrit ? " (CRÍTICO!)" : "") + "! +2 Pts de Elemento (" + (u._frPoints||0) + "/4).";
        }
        else if (u.id === "soifon" && sk.sfSkill && enemy) {
          const sMul = u.tSkill * ampS;
          const r = dealDamage(u, enemy, (sk.skillMul || 160) * sMul, fx, { breakW: 2, el: "Vento" });
          const markCount = (enemy.debuffs || []).filter(d => d.name === "Ferrão da Morte").length;
          if (markCount < 3) enemy.debuffs.push({ stat: "mark", value: 0, turns: 3, name: "Ferrão da Morte" });
          if (f.sfC2) { if (!enemy.debuffs.some(d => d.name === "EletroRES↓")) enemy.debuffs.push({ stat: "elemRes", value: -15, turns: 3, name: "EletroRES↓" }); }
          if (u.weapon?.id === "ferrao_borboleta") u.sfWpnCharges = Math.min(5, (u.sfWpnCharges || 0) + 1);
          msg = `🦋 ${u.name} usa Nigeki Kessatsu em ${enemy.name} — ${r.dmg} de Dano de Vento${r.crit ? " (CRÍTICO!)" : ""}! [Ferrão da Morte] marcado por 3 turnos — follow-ups de aliados Eletro ativarão golpes de acompanhamento!`;
        }
        else if (u.id === "wonderofyou" && sk.wooSkill) {
            const sMul = u.tSkill * ampS;
            const supMul = Math.min(1.12, u.tSkill || 1); // escala o valor dos debuffs/buff com o nível da Perícia (cap +12%, mesma regra dos outros suportes)
            const wooEnemies = aliveEnemies(s);
            let wooTot = 0, wooCrit = false;
            const debuffDur = f.wooE2 ? 9999 : 3; // E2: debuffs permanentes
            const e1Mul = (f.wooE1 ? 1.2 : 1) * supMul; // E1: +20% potência, além da escala de nível
            wooEnemies.forEach((e) => {
              const r = dealDamage(u, e, (sk.skillMul || 210) * sMul / Math.max(1, wooEnemies.length * 0.6), fx, { breakW: 2, el: "Chaos" });
              wooTot += r.dmg; if (r.crit) wooCrit = true;
              // E1: se já existe, renova e estende +1 turno (máx 6); senão aplica
              const addOrExtend = (nm, db) => {
                const ex = e.debuffs.find(d => d.name === nm);
                if (ex) { ex.turns = f.wooE1 ? Math.min(6, ex.turns + 1) : Math.max(ex.turns, debuffDur); ex.value = db.value; }
                else e.debuffs.push(db);
              };
              addOrExtend("Miss da Calamidade", { stat: "missChance", value: Math.round(20 * e1Mul), turns: debuffDur, name: "Miss da Calamidade" });
              addOrExtend("Vuln", { stat: "vuln", value: Math.round(18 * e1Mul), turns: debuffDur, name: "Vuln" });
              addOrExtend("Atraso Fatal", { stat: "spd", value: -Math.round(12 * e1Mul), pct: true, turns: debuffDur, name: "Atraso Fatal" });
              addOrExtend("Colapso de Atributos", { stat: "def", value: -Math.round(15 * e1Mul), pct: true, turns: debuffDur, name: "Colapso de Atributos" });
              if (f.wooA2) addOrExtend("Marca da Calamidade", { stat: "vuln", value: 12, turns: debuffDur, name: "Marca da Calamidade" }); // A2: +12% de dano de todas as fontes
            });
            const dmgBonusVal = Math.round(18 * e1Mul);
            allies.forEach((a) => {
              const ex = a.buffs.find(b => b.name === "Bênção da Calamidade");
              if (ex) { if (f.wooE1) ex.turns = Math.min(6, ex.turns + 1); ex.value = dmgBonusVal; }
              else a.buffs.push({ stat: "dmgBonus", value: dmgBonusVal, turns: 3, name: "Bênção da Calamidade" });
            });
            msg = `🌑 ${u.name} conjura Calamidade Inevitável — ${wooTot} de Dano Chaos${wooCrit ? " (CRÍTICO!)" : ""}! 4 debuffs exclusivos${f.wooE2 ? " PERMANENTES" : ` por ${debuffDur}t`}: Miss +${Math.round(20*e1Mul)}%, Vuln +${Math.round(18*e1Mul)}%, VEL -${Math.round(12*e1Mul)}%, DEF -${Math.round(15*e1Mul)}%.${f.wooE1 ? " [E1: buffs/debuffs existentes estendidos]" : ""}`;
          }
          else if (u.id === "kaiba" && sk.kaibaSkill) {
            const catOf = (id) => (["vorse", "kaiser", "saggi", "judge", "obelisk"].includes(id) ? "monster" : (["control", "shrink", "flute"].includes(id) ? "magic" : "trap"));
            const drawOne = () => {
              const r = Math.random();
              if (r < 0.05) return "obelisk";
              // Tabela de pesos explícita (soma 95): garante que Armadilhas (Vírus/Anel) sempre tenham chance visível
              const table = [
                ["vorse", 12], ["kaiser", 12], ["saggi", 10], ["judge", 11],
                ["control", 10], ["shrink", 10], ["flute", 10],
                ["virus", 10], ["ring", 10],
              ];
              let roll = (r - 0.05) / 0.95 * 95, acc = 0;
              for (const [id, w] of table) { acc += w; if (roll < acc) return id; }
              return "ring";
            };
            let cardId = u._kaibaForceMagic ? ["control", "shrink", "flute", "virus", "ring"][Math.floor(Math.random() * 5)] : drawOne();
            u._kaibaForceMagic = false;
            // S3 (Mudança de Kit): a Perícia passa a ADICIONAR a carta sacada à Mão Virtual (máx 3), sem resolver e SEM gastar o Ponto de Habilidade
            if (u.stFlags?.kaibaS3) {
              u._kaibaHand = u._kaibaHand || [];
              s.sp = Math.min(spCapOf(s), s.sp + 1); // devolve o PH — a puxada em si é gratuita com S3
              if (u._kaibaHand.length >= 3) { msg = "🎴 Mão Virtual cheia (3/3)! Ative uma carta antes de puxar outra."; }
              else { u._kaibaHand.push(cardId); msg = `🎴 Kaiba saca ${KAIBA_CARDS[cardId].name} para a Mão Virtual (${u._kaibaHand.length}/3). Toque na carta pra ativá-la.`; }
              return s;
            }
            const sMulK = u.tSkill * ampS;
            let chainX2 = false, msgPre = "";
            if (u.stFlags?.kaibaS2 && u._kaibaLastCat) {
              if (catOf(cardId) === u._kaibaLastCat) { chainX2 = true; msgPre = "⛓️ CHAIN LINK 2! "; }
              else { let totDisc = 0; aliveEnemies(s).forEach(e => { totDisc += dealDamage(u, e, 180 * sMulK, fx, { el: "Eletro" }).dmg; }); msgPre = `🗑️ Descarte! ${totDisc} de Dano Eletro em área. `; }
            }
            u._kaibaLastCat = catOf(cardId);
            // Se a carta puxada for um Monstro do MESMO tipo que já está em campo, devolve 1 Ponto de Habilidade (não "desperdiça" a puxada)
            { const curMon = activeMonster(s, u.uid);
              const cardName = { vorse: "Vorse Raider", kaiser: "Kaiser Sea Horse", saggi: "Saggi, o Clone das Sombras", judge: "Juiz", obelisk: "Obelisco, o Atormentador" }[cardId];
              if (curMon && cardName && curMon.name === cardName) { s.sp = Math.min(spCapOf(s), s.sp + 1); msgPre += "[Carta repetida — 1 Ponto de Habilidade devolvido!] "; }
            }
            const destroyOld = () => {
              const monsters = s.heroes.filter(h => h.isSummon && h.kind === "monster" && h.ownerUid === u.uid && h.alive);
              const slotLimit = u.stFlags?.kaibaS3 ? 2 : 1;
              if (monsters.length < slotLimit) return; // ainda tem vaga livre — não precisa destruir nada
              const nonLegend = monsters.filter(m => !m.dragonLegendary); // Dragão Branco (Suprema) NÃO pode ser substituído por cartas comuns
              const old = nonLegend[0]; // destrói o mais antigo (nunca o Dragão Lendário)
              if (!old) return; // só há o Dragão em campo — a carta comum não consegue substituí-lo
              if (old) {
                old.alive = false;
                if (u.stFlags?.kaibaS1) { u._kaibaGraveyard = u._kaibaGraveyard || []; if (u._kaibaGraveyard.length < 3) u._kaibaGraveyard.push(old.name); if (u._kaibaGraveyard.length >= 3) { u._kaibaGraveyard = []; s.sp = Math.min(spCapOf(s), s.sp + 1); u._kaibaForceMagic = true; msgPre += "[S1: Cemitério cheio — reembaralha e gera 1 PH!] "; } }
                if (u.stFlags?.kaibaT2) { u.energy = Math.min(u.energyMax, u.energy + 15); u.buffs.push({ stat: "atk", value: 20, pct: true, turns: 2, name: "Reciclagem Eficiente" }); }
                // Arma: ao sair de campo, +6 de Energia e o próximo monstro ganha +30% de CRIT DMG por 2 rodadas
                if (u.weapon?.buff?.kaibaWeapon) { u.energy = Math.min(u.energyMax, u.energy + 6); u._kaibaWpnNextBonus = true; }
              }
            };
            const summonCard = (name, avatar, mul, opts2) => {
              destroyOld();
              const mon = makeSummon(u, { uid: "S_" + u.uid + "_mon" + Math.floor(Math.random() * 1e6), name, avatar, kind: "monster", mul: mul * (chainX2 ? 2 : 1), spd: effStat(u, "spd"), atkMul: 1.2, hpMul: 0.001, life: Infinity });
              if (opts2?.taunt) mon.taunt = true;
              if (opts2?.bleedChance) mon.cardBleed = opts2.bleedChance;
              if (opts2?.onSummonEnergy) u.energy = Math.min(u.energyMax, u.energy + opts2.onSummonEnergy);
              s.heroes.push(mon);
              return mon;
            };
            if (cardId === "vorse") { summonCard("Vorse Raider", "👹", 380, { bleedChance: 0.5 }, "card_vorse"); msg = msgPre + "🎴 VORSE RAIDER! Monstro de impacto pesado (380% ATK), 50% de chance de Sangramento."; }
            else if (cardId === "kaiser") { summonCard("Kaiser Sea Horse", "🐴", 260, { onSummonEnergy: 20 }, "card_kaiser"); msg = msgPre + "🎴 KAISER SEA HORSE! Monstro invocado (260% ATK) — +20 de Energia instantânea."; }
            else if (cardId === "saggi") { summonCard("Saggi, o Clone das Sombras", "👤", 110, { taunt: true }, "card_saggi"); msg = msgPre + "🎴 SAGGI! Monstro de menor dano (110% ATK) mas provoca TODOS os inimigos por 2 rodadas."; }
            else if (cardId === "judge") {
              destroyOld();
              const mon = makeSummon(u, { uid: "S_" + u.uid + "_mon" + Math.floor(Math.random() * 1e6), name: "Juiz", avatar: "⚖️", imgKey: "card_judge", kind: "monster", mul: 280 * (chainX2 ? 2 : 1), spd: effStat(u, "spd"), atkMul: 1.2, hpMul: 0.001, life: Infinity });
              mon.judgeSplash = 140; s.heroes.push(mon);
              msg = msgPre + "🎴 JUIZ! Monstro de área (200% ATK no principal, 100% nos adjacentes).";
            }
            else if (cardId === "obelisk") {
              destroyOld();
              let totOb = 0, purgeCount = 0;
              aliveEnemies(s).forEach(e => {
                if (u.stFlags?.kaibaS5 && e.debuffs.some(d => d.name === "Arena KaibaCorp")) { if (e.buffs.length) purgeCount += e.buffs.length; if (e.shield > 0) { purgeCount += 1; e.shield = 0; } e.buffs = []; }
                totOb += dealDamage(u, e, 750 * (chainX2 ? 2 : 1) * sMulK * (1 + purgeCount * 0.6), fx, { el: "Eletro", defPen: 100 }).dmg;
              });
              msg = msgPre + `🎴✨ OBELISCO, O ATORMENTADOR!!! Punho do Destino — ${totOb} de dano em TODOS os inimigos, ignorando 100% da DEF!${purgeCount ? ` [S5: purgou ${purgeCount} efeitos, +${purgeCount*60}% de Dano Verdadeiro!]` : ""}`;
              if (u.stFlags?.kaibaT3) { aliveEnemies(s).forEach(e => { if (e._hasToughness && e.toughness > 0) { e.toughness = Math.max(0, e.toughness - 30); if (e.toughness <= 0) applyBreakEffect(u, e, "Eletro", fx); } }); msg += " [Rastro 3: Resistência de todos os inimigos reduzida!]"; }
            }
            else if (cardId === "control") {
              const tgt = aliveEnemies(s)[Math.floor(Math.random() * aliveEnemies(s).length)];
              if (tgt) { tgt.av = (tgt.av || 1) * (chainX2 ? 1.8 : 1.4); tgt.debuffs.push({ stat: "mark", value: 0, turns: 1, name: "Controlado" }); msg = msgPre + `🎴 CONTROLADOR DE INIMIGOS! ${tgt.name} atrasado em 40% na Ordem de Turnos.`; }
            }
            else if (cardId === "shrink") {
              const tgt = aliveEnemies(s).sort((a, b) => effStat(b, "atk") - effStat(a, "atk"))[0];
              if (tgt) { const v = chainX2 ? 50 : 35; tgt.debuffs.push({ stat: "atk", value: -v, pct: true, turns: 2, name: "Encolher" }, { stat: "def", value: -v, pct: true, turns: 2, name: "Encolher" }); msg = msgPre + `🎴 ENCOLHER! ${tgt.name} perde ${v}% de ATK e DEF por 2 turnos.`; }
            }
            else if (cardId === "flute") {
              const mon = activeMonster(s, u.uid);
              if (mon) { mon.av = Math.max(0.01, (mon.av || 1) * 0.0); mon.buffs.push({ stat: "critDmg", value: chainX2 ? 100 : 50, turns: 1, name: "Flauta" }); msg = msgPre + "🎴 A FLAUTA! O Monstro ativo avança 100% na Ordem de Turnos e ganha +50% de CRIT DMG no próximo golpe."; }
              else { u._kaibaForceMagic = false; cardId = drawOne(); msg = msgPre + "🎴 A Flauta não encontrou nenhum Dragão em campo — puxa outra carta!"; }
            }
            else if (cardId === "virus") { allies.forEach(a => { a._kaibaVirusTurns = 2; }); msg = msgPre + "🎴 VÍRUS ESMAGA-CARDS! Por 2 turnos, qualquer ataque inimigo acima de 150% de mult. contra seu time tem o dano reduzido pra apenas 50%."; }
            else if (cardId === "ring") {
              const tgt = aliveEnemies(s).sort((a, b) => a.hp - b.hp)[0];
              if (tgt) { const rd = Math.round(tgt.maxHp * 0.25 * (chainX2 ? 2 : 1)); tgt.hp = Math.max(0, tgt.hp - rd); if (tgt.hp <= 0) tgt.alive = false; fx.push({ uid: tgt.uid, txt: String(rd), crit: true, id: Math.random(), el: "Chaos" }); const selfDmg = Math.round(u.hp * 0.05); u.hp = Math.max(1, u.hp - selfDmg); msg = msgPre + `🎴 ANEL DA DESTRUIÇÃO! ${rd} de Dano Verdadeiro em ${tgt.name}. Kaiba sofre ${selfDmg} de contragolpe.`; }
            }
            // Arma: toda puxada de carta dá 1 acúmulo de Soberania do Duelista ao Monstro ativo (máx 3, expira em 2 turnos dele)
            if (u.weapon?.buff?.kaibaWeapon) {
              const monW = activeMonster(s, u.uid);
              if (monW) {
                if (u._kaibaWpnNextBonus) { monW.buffs.push({ stat: "critDmg", value: 30, turns: 2, name: "Nexo: Chegada" }); u._kaibaWpnNextBonus = false; }
                const stacks = monW.buffs.filter(b => b.name === "Soberania do Duelista").length;
                if (stacks < 3) monW.buffs.push({ stat: "dmgBonus", value: 16, turns: 2, name: "Soberania do Duelista" }, { stat: "defPen", value: 10, turns: 2, name: "Soberania do Duelista" });
              }
            }
            // Rastro 1: cartas de Magia/Armadilha avançam o Monstro ativo em 22% na Ordem de Turnos
            if (u.stFlags?.kaibaT1 && catOf(cardId) !== "monster") {
              const monT1 = activeMonster(s, u.uid);
              if (monT1) monT1.av = Math.max(0.01, (monT1.av || 1) * 0.78);
            }
          }
          else if (u.id === "yoruichi" && sk.yoruSkill && enemy) {
            u._yoruStance = 3; u._yoruMarkUid = enemy.uid; u._yoruRecordedDmg = 0;
            u.buffs = u.buffs.filter(b => b.name !== "Condução Perfeita"); u.buffs.push({ stat: "dmgBonus", value: 0, turns: 3, name: "Condução Perfeita" }); // marcador visual (0 = não altera stats)
            const spdBonus = Math.round(effStat(u, "spd") * 0.12);
            allies.forEach(a => { a.buffs = a.buffs.filter(b => b.name !== "Domínio Magnético"); a.buffs.push({ stat: "spd", value: spdBonus, pct: false, turns: 3, name: "Domínio Magnético" }); });
            msg = `🌀 DOMÍNIO MAGNÉTICO! Yoruichi entra em Condução Perfeita por 3 turnos e marca ${enemy.name} como Ponto de Aterramento. Time inteiro ganha +${spdBonus} de VEL.`;
          }
          else if (u.id === "shorekeeper" && sk.shkSkill) {
            const healTargets = allies.filter(a => a.alive);
            const lowest = healTargets.slice().sort((a, b) => (a.hp / a.maxHp) - (b.hp / b.maxHp))[0];
            if (lowest) {
              const mainHeal = Math.round((u.maxHp * 0.20 + 500) * ampS);
              // Registra quanto cada aliado curou para calcular excedente depois
              const healLog = [];
              const doneMain = healUnit(lowest, mainHeal, fx);
              healLog.push({ a: lowest, done: doneMain, amt: mainHeal });
              let tot = doneMain;
              healTargets.filter(a => a.uid !== lowest.uid).forEach(a => {
                const amt = Math.round(mainHeal * 0.5);
                const done = healUnit(a, amt, fx);
                healLog.push({ a, done, amt });
                tot += done;
              });
              // Superávit de Enteléquia (Rastro 2): excedente de cada aliado vira Escudo de Dados para o time todo
              // Só restaura se o aliado estiver com 900 ou menos de escudo; cap individual de 5000
              if (u.stFlags?.shkT2) {
                const SHK_SHIELD_CAP = 14000;
                healLog.forEach(({ a, done, amt }) => {
                  const over = amt - done;
                  if (over > 0 && (a.shield || 0) <= 3000) {
                    const add = Math.max(0, Math.min(over, SHK_SHIELD_CAP - (a.shield || 0)));
                    if (add > 0) { a.shield = (a.shield || 0) + add; fx.push({ uid: a.uid, txt: "🛡️+" + add, heal: true, id: Math.random() }); }
                  }
                });
              }
              lowest.buffs = lowest.buffs.filter(b => b.name !== "Blindagem de Dados");
              lowest.buffs.push({ stat: "ccImmune", value: 1, turns: 2, name: "Blindagem de Dados" });
              // C4 · Calibração do Caos: o alvo curado e a própria Shorekeeper ganham +15% de HP Máximo por 3 turnos
              if (u.stFlags?.shkC4) {
                [lowest, u].forEach(t => { if (!t.buffs.some(b => b.name === "Calibração do Caos")) { const gain = Math.round(t.maxHp * 0.15); t.maxHp += gain; t.hp += gain; t.buffs.push({ stat: "maxhp_shk", value: gain, turns: 3, name: "Calibração do Caos" }); } });
              }
              msg = `🌌 TEORIA DO CAOS! Restauração Sistêmica cura ${tot} de HP no total. ${lowest.name} recebe Blindagem de Dados — imune ao próximo Controle de Grupo por 2 turnos.${u.stFlags?.shkC4 ? " [C4: +15% de HP Máximo por 3 turnos!]" : ""}`;
              // Arquivos da Costa Negra (4pç): cura o time inteiro → Sincronia simultânea pra todos
              if (u.stFlags?.setCostaNegra4) { healTargets.forEach(t => { t.buffs = t.buffs.filter(b => b.name !== "Sincronia"); t.buffs.push({ stat: "dmgBonus", value: 12, turns: 2, name: "Sincronia" }, { stat: "spd", value: 6, pct: false, turns: 2, name: "Sincronia" }); }); msg += " [Sincronia: todo o time +12% de Dano Final e +6 de VEL!]"; }
            }
          }
          else if (u.id === "yanagi" && sk.yanaSkill && enemy) {
            const maxSparks = u.stFlags?.yanaS3 ? 8 : 5;
            const addSparks = (tgt, n) => { const cur = tgt.debuffs.filter(d => d.name === "Fagulha de Anomalia").length; const room = Math.max(0, maxSparks - cur); for (let i = 0; i < Math.min(n, room); i++) tgt.debuffs.push({ stat: "mark", value: 0, turns: 3, name: "Fagulha de Anomalia" }); if (!tgt.debuffs.some(d => d.name === "Estase")) tgt.debuffs.push({ stat: "dotAmp", value: 25, turns: 3, name: "Estase" }); return tgt.debuffs.filter(d => d.name === "Fagulha de Anomalia").length; };
            const others = aliveEnemies(s).filter(e => e.uid !== enemy.uid);
            const hadDots = (enemy.dots || []).length > 0;
            const sp = addSparks(enemy, 3);
            others.forEach(e => addSparks(e, 2));
            if (!hadDots) {
              enemy.dots.push({ type: "shock", dmg: Math.max(1, Math.round(effStat(u, "atk") * 0.80)), turns: 2, unremovable: true });
              msg = `🌀 CICLO DE ANOMALIA! ${enemy.name} não tinha DoT ativo — Protocolo de Segurança força um Choque Parasita (80% ATK, 2 turnos, não pode ser removido)! Fagulhas aplicadas: ${sp} no principal, 2 nos demais.`;
            } else {
              msg = `🌀 CICLO DE ANOMALIA! ${sp} Fagulhas de Anomalia em ${enemy.name} (2 nos demais). Estase ativa: DoTs recebidos por eles causam +25% de dano e ignoram DEF extra por Fagulha.`;
            }
          }
          else if (u.id === "agumon" && sk.aguSkill) {
            const fm = u.agForm || "agumon";
            if (fm === "agumon" && enemy) {
              const r = dealDamage(u, enemy, (sk.skillMul || 165) * u.tSkill * ampS, fx, { breakW: 2, el: "Fogo" });
              u.agSP = Math.min(aguSPMax(u), (u.agSP || 0) + 25); if (!u.stFlags?.aguC6) u.agHeat = Math.min(100, (u.agHeat || 0) + 30);
              msg = `🔥 Baby Flame em ${enemy.name} — ${r.dmg} de Dano de Fogo${r.crit ? " (CRÍTICO!)" : ""}. [+25 SP · Calor +30 → ${u.agHeat}]`;
            } else if (fm === "greymon") {
              let t2 = 0; aliveEnemies(s).forEach(e => { t2 += dealDamage(u, e, 150 * u.tSkill * ampS, fx, { breakW: 2, el: "Fogo" }).dmg; });
              if (!u.stFlags?.aguC6) u.agHeat = Math.min(100, (u.agHeat || 0) + 40); u.agSP = Math.min(aguSPMax(u), (u.agSP || 0) + 25);
              const defGain = Math.round((u.agHeat || 0) * 0.6);
              u.buffs = u.buffs.filter(b => b.name !== "Carapaça Térmica"); u.buffs.push({ stat: "def", value: defGain, pct: true, turns: 2, name: "Carapaça Térmica" });
              msg = `🦕 MEGA FLAME em área — ${t2} de Dano de Fogo! Carapaça Térmica: +${defGain}% DEF por 2 rodadas. [Calor → ${u.agHeat}]`;
            } else if (fm === "metalgreymon") {
              const hot = (u.agHeat || 0) > 80;
              let t3 = 0; aliveEnemies(s).forEach(e => { if (e.shield > 0) { e.shield = 0; fx.push({ uid: e.uid, txt: "ESCUDO DESTRUÍDO!", crit: true, id: Math.random() }); } t3 += dealDamage(u, e, 170 * (hot ? 1.5 : 1) * u.tSkill * ampS, fx, { breakW: 2, el: "Fogo" }).dmg; });
              if (!u.stFlags?.aguC6) u.agHeat = Math.min(100, (u.agHeat || 0) + 35); u.agSP = Math.min(aguSPMax(u), (u.agSP || 0) + 25);
              msg = `🚀 GIGA DESTROYER! Mísseis destroem os escudos — ${t3} de dano${hot ? " (+50% SUPERAQUECIDO!)" : ""}. [Calor → ${u.agHeat}]`;
            } else {
              u.agBrave = 2;
              msg = `🛡️ BRAVE SHIELD! WarGreymon força TODOS os inimigos a atacá-lo por 2 rodadas — cada golpe recebido será respondido com um contra-ataque crítico!`;
            }
            // Rastro Thermal Efficiency: com 50+ de Calor, opcionalmente resfria 10 a mais e buffa o time
            if (u.stFlags?.aguT1 && (u.agHeat || 0) >= 50) {
              u.agHeat = Math.max(0, (u.agHeat || 0) - 10);
              allies.filter(a => a.alive).forEach(a => { a.buffs = a.buffs.filter(b => b.name !== "Eficiência Térmica"); a.buffs.push({ stat: "dmgBonus", value: 12, turns: 2, name: "Eficiência Térmica" }); });
              msg += " 🔥 Eficiência Térmica: o time ganha +12% de Dano de Fogo nos básicos por 2 rodadas (Calor -10 extra)!";
            }
          }
          else if (u.id === "athena" && sk.athSkill) {
            const target = enemy;
            const healTargets = allies.filter((a) => a.alive);
            const lowest = healTargets.slice().sort((a, b) => (a.hp / a.maxHp) - (b.hp / b.maxHp))[0];
            if (u.athEnhanced) {
              // Golpe do Santuário: 120% do ATK + 80% da VEL atual (convertido em multiplicador equivalente)
              const _atk = Math.max(1, effStat(u, "atk"));
              const _spdVal = effStat(u, "spd");
              const finalMul = (120 + (0.8 * _spdVal / _atk) * 100) * u.tSkill * ampS;
              const aEnemies = aliveEnemies(s);
              let aTot = 0, aCrit = false;
              aEnemies.forEach((e) => { const r = dealDamage(u, e, finalMul, fx, { breakW: 2, el: "Holy" }); aTot += r.dmg; if (r.crit) aCrit = true; const ex = e.debuffs.find(d => d.name === "HolyRES↓"); if (ex) { ex.value = -20; ex.turns = 2; } else e.debuffs.push({ stat: "elemRes", value: -20, turns: 2, name: "HolyRES↓" }); });
              msg = `🕊️ ${u.name} usa Golpe do Santuário (120% ATK + 80% VEL) em área — ${aTot} de Dano Holy${aCrit ? " (CRÍTICO!)" : ""}! RES Holy -20% por 2 turnos.`;
            } else if (lowest) {
              // Bênção do Santuário: cura baseada em ATK + DEF, escala com nível da Perícia (C3) e amps
              let healAmt = Math.round((effStat(u, "atk") + effStat(u, "def")) * ((sk.skillMul || 130) / 100) * u.tSkill * ampS);
              // Cetro (Fluxo de Atena): VEL > 140 → toda a cura +24%
              const _athSpd0 = u.weapon?.buff?.spdThreshold;
              const _athSpdActive = _athSpd0 && effStat(u, "spd") > _athSpd0.spd;
              if (_athSpdActive && _athSpd0.healBonus) healAmt = Math.round(healAmt * (1 + _athSpd0.healBonus / 100));
              const _priorHp = lowest.hp;
              healUnit(lowest, healAmt, fx);
              const _overHeal = Math.max(0, healAmt - (lowest.maxHp - _priorHp));
              // Cetro da Autoridade Celestial: Fluxo de Atena — cura excedente vira Escudo integral quando VEL > 140
              if (_overHeal > 0 && _athSpdActive && _athSpd0.overHealShield) {
                const _shA = capShieldAdd(lowest, _overHeal, 4500); lowest.shield = (lowest.shield || 0) + _shA; fx.push({ uid: lowest.uid, txt: "🛡️+" + _shA, heal: true, id: Math.random() });
              } else if (_overHeal > 0 && f.athI) {
                // Rastro I · Guardiã das Casas: excedente vira escudo de 50% do valor
                const shI = capShieldAdd(lowest, Math.round(_overHeal * 0.5), 4500);
                lowest.shield = (lowest.shield || 0) + shI; fx.push({ uid: lowest.uid, txt: "🛡️+" + shI, heal: true, id: Math.random() });
              }
              lowest.buffs = lowest.buffs.filter((b) => b.name !== "Armadura de Luz");
              lowest.buffs.push({ stat: "dmgReduce", value: 15, turns: 2 + (f.athC2 ? 1 : 0), name: "Armadura de Luz" });
              const echoTargets = healTargets.filter((a) => a.uid !== lowest.uid);
              let echoAmt = Math.round(healAmt * 0.5);
              echoTargets.forEach((a) => { const amt = (a.hp / a.maxHp) < 0.5 ? echoAmt * 2 : echoAmt; healUnit(a, amt, fx); });
              if (f.athC4 && (lowest.hp / lowest.maxHp) < 0.5) lowest.energy = Math.min(lowest.energyMax, lowest.energy + 15);
              msg = `🕊️ ${u.name} usa Bênção das Sete Casas em ${lowest.name} — cura ${healAmt} de HP (ATK+DEF) e concede Armadura de Luz (-15% de dano recebido)!${_athSpdActive ? " ✨(Fluxo de Atena ativo)" : ""} Eco da Justiça cura os demais aliados.`;
              // Cetro: Proteção Zodiacal (CRIT DMG no alvo curado) + Graça do Olimpo (ATK fixo em Athena)
              if (u.weapon?.buff?.athWeapon && u.weapon.buff.onSkill) {
                const _onSk = u.weapon.buff.onSkill;
                const _zodSt = lowest.buffs.filter(b => b.name === "ZodiacalDmg").length;
                if (_zodSt < (_onSk.maxStacks || 3)) lowest.buffs.push({ stat: "critDmg", value: _onSk.critDmgPerStack || 12, pct: false, turns: 9999, name: "ZodiacalDmg" });
                const _graceSt = u.buffs.filter(b => b.name === "GraçaOlimpo").length;
                if (_graceSt < (_onSk.maxAtkStacks || 3)) u.buffs.push({ stat: "atk", value: _onSk.atkPerStack || 400, pct: false, turns: 9999, name: "GraçaOlimpo" });
                msg += ` [Cetro: +${_onSk.critDmgPerStack}% CRIT em ${lowest.name}, +${_onSk.atkPerStack} ATQ]`;
              }
            }
          }
          else if (u.id === "omegamon" && sk.omgSkill) {
          const sMul = u.tSkill * ampS;
          const red = 62 + (f.omgContagio ? 28 : 0); // 62% redirect + 28% extra resist
          allies.forEach((a) => { a.buffs = a.buffs.filter((b) => b.name !== "Protocolo"); a.buffs.push({ stat: "dmgReduce", value: red, turns: 2, name: "Protocolo" }); if (f.omgC2) a.buffs.push({ stat: "dmgBonus", value: 25, turns: 2, name: "Contágio+" }); });
          const sh = Math.round(u.maxHp * 0.42); u.shield = Math.max(u.shield, sh);
          // Omegamon agora concede escudo ao time todo (não só a si mesmo)
          const teamSh = Math.round(u.maxHp * 0.22);
          allies.forEach((a) => { if (a.uid !== u.uid) a.shield = (a.shield || 0) + capShieldAdd(a, teamSh); });
          if (enemy) { const r = dealDamage(u, enemy, (sk.skillMul || 120) * sMul, fx, { breakW: 2, el: "Virus" }); msg = `🛡️ ${u.name} ativa Protocolo de Infecção — o time recebe -${red}% de dano por 2 turnos. Omegamon ergue Escudo de Dados de ${sh} e protege aliados com +${teamSh} de escudo cada. Atinge ${enemy.name} por ${r.dmg} de Dano de Vírus${r.crit ? " (CRÍTICO!)" : ""}.`; }
          else msg = `🛡️ ${u.name} ativa Protocolo de Infecção — -${red}% de dano ao time, Escudo de Dados de ${sh} e +${teamSh} de escudo para todos os aliados.`;
        }
        else if (u.id === "lancer" && sk.lancerSkill) {
          u.lancerDodges = (u.lancerDodges || 0) + 2;
          u.av = Math.max(0.1, u.av * 0.70); // advance action 30%
          msg = `🏹 ${u.name} usa Proteção contra Flechas — avança na linha do tempo e ganha 2 Esquivas Absolutas! (${u.lancerDodges} cargas)`;
        }
        else if (u.id === "nanami" && sk.nanamSkill && enemy) {
          const sMul = u.tSkill * ampS;
          const r = dealDamage(u, enemy, (sk.skillMul || 240) * sMul, fx, { breakW: 2 });
          const is73 = (f.nanamC6 || r.dmg % 10 === 7 || r.dmg % 10 === 3);
          let extraCrit = false;
          if (is73 && !r.crit) {
            const bonus = dealDamage(u, enemy, 0.5 * (sk.skillMul || 240) * sMul, fx, { breakW: 2 }); // crit bonus ~50%
            extraCrit = true;
          }
          if ((is73 || f.nanamCritEnergy) && (is73)) u.energy = Math.min(u.energyMax, u.energy + 10);
          msg = `💼 ${u.name} usa Razão 7:3 em ${enemy.name} — ${r.dmg} de dano${is73 ? " — PROPORÇÃO 7:3: CRÍTICO GARANTIDO!" : r.crit ? " (CRÍTICO!)" : ""}.`;
        }
        else if (sk.skillMul && enemy) {
          let msg2Sink = false;
          const onSkillHit = (e, r) => {
            if (!r.crit) return;
            if (f.miResidual && e.alive) { if (!e.debuffs.some((d) => d.name === "Residual")) e.debuffs.push({ stat: "mark", value: 0, turns: 99, name: "Residual" }); }
            if (u.weapon?.id === "hailstorm" && e.alive) { e.debuffs.push({ stat: "def", value: -15, turns: 2, name: "Fio0" }); applyDot([e], { type: "freeze", mul: 40, turns: 2 }, u, fx); }
            if (f.miC2) u.energy = Math.min(u.energyMax, u.energy + enGain(5));
          };
          if (sk.aoe) { let tot = 0, anyCrit = false; aliveEnemies(s).forEach((e) => { const r = dealDamage(u, e, sk.skillMul * sMul, fx, { breakW: 2 }); tot += r.dmg; if (r.crit) anyCrit = true; onSkillHit(e, r); if (u.id === "ryoshu" && e.alive && Math.random() < 0.20) { applyDot([e], { type: "sinking", mul: 45, turns: 3 }, u, fx); msg2Sink = true; } }); msg = `${u.name} usa Habilidade em área — ${tot} de dano total${anyCrit ? " (CRÍTICO!)" : ""}.${msg2Sink ? " 🌊 Afundamento aplicado!" : ""}`; if (f.extraSkillHit && enemy && enemy.alive) { const r2 = dealDamage(u, enemy, sk.skillMul * sMul * 0.4, fx, { breakW: 2 }); msg += ` Corte extra de ${r2.dmg}.`; onSkillHit(enemy, r2); } }
          else { const r = dealDamage(u, enemy, sk.skillMul * sMul, fx, { breakW: 2 }); onSkillHit(enemy, r); msg = `${u.name} usa Habilidade em ${enemy.name} — ${r.dmg}${r.crit ? " (CRÍTICO!)" : ""}.`; if (f.extraSkillHit) { const r2 = dealDamage(u, enemy, sk.skillMul * sMul * 0.4, fx, { breakW: 2 }); onSkillHit(enemy, r2); msg += ` Corte extra de ${r2.dmg}.`; } }
          if (f.miC3) { u.ritmoStacks = Math.min(3, (u.ritmoStacks || 0) + 1); u.buffs = u.buffs.filter((b) => b.name !== "Ritmo"); u.buffs.push({ stat: "atk", value: 20 * u.ritmoStacks, pct: true, turns: 99, name: "Ritmo" }); msg += ` Ritmo da Nevasca x${u.ritmoStacks} (+${20 * u.ritmoStacks}% ATK).`; }
        }
        if (sk.skillDot && enemy) {
          const _dotTargets = sk.aoe ? aliveEnemies(s) : [enemy];
          const _dotCfg = (u.id === "nami" && f.namiC1 && sk.skillDot.type === "cyclone") ? { ...sk.skillDot, turns: 3 } : sk.skillDot;
          applyDot(_dotTargets, _dotCfg, u, fx);
          if (u.id === "nami" && f.namiSlowCyclone && sk.skillDot.type === "cyclone") { _dotTargets.forEach(e => { if (!e.debuffs.some(d => d.name === "Ciclone Lento")) e.debuffs.push({ stat: "spd", value: -10, pct: true, turns: _dotCfg.turns, name: "Ciclone Lento" }); }); }
          msg += ` Aplica ${DOT_INFO[sk.skillDot.type]?.n || "DoT"}${u.id === "nami" && f.namiC1 ? " (3 turnos)" : ""}${u.id === "nami" && f.namiSlowCyclone ? " + VEL -10%" : ""}.`;
        }
        if (sk.skillBuff) { const tg = sk.skillBuff.all ? allies : [u]; applyBuff(tg, supAmp(sk.skillBuff, u.tSkill, ampS), u.name, fx, u); if (u.weapon?.buff?.onBuff) applyBuff(tg, u.weapon.buff.onBuff, u.weapon.name, fx, u); msg = `${u.name} fortalece ${sk.skillBuff.all ? "o time (ATK/CRIT↑)" : "a si (ATK/CRIT↑)"}.`; }
        if (sk.skillDebuff && enemy) { applyDebuff([enemy], supAmp(sk.skillDebuff, u.tSkill, ampS), u.weapon?.extraDefDown, u); msg = `${u.name} reduz a DEF e aplica vulnerabilidade em ${enemy.name}.`; }
        if (f.defShredHit && enemy) applyDebuff([enemy], { defDown: 12, turns: 2 }, 0, u);
        if (sk.heal) { const tgt = allies.slice().sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp)[0]; doHeal(tgt, (effStat(u, "atk") * sk.heal.mul / 100 + sk.heal.flat) * hb * ampS * (u.tSkill || 1)); msg = `${u.name} cura ${tgt.name} (Nv da Perícia +${Math.round(((u.tSkill || 1) - 1) * 100)}%).`; }
        if (sk.shield) {
          const sh = capShieldAdd(u, Math.round((effStat(u, "def") * sk.shield.defMul / 100 + sk.shield.flat) * shB * ampS));
          u.shield += sh;
          if (f.kirC1) {
            const teamSh = Math.round(sh * 0.80);
            allies.forEach((a) => { if (a.uid !== u.uid) a.shield = (a.shield || 0) + capShieldAdd(a, teamSh); });
            if (f.kirC2) { const weakest = allies.slice().sort((a,b) => (a.shield||0) - (b.shield||0))[0]; if (weakest) { weakest.buffs = weakest.buffs.filter(b => b.name !== "GdDefBoost"); weakest.buffs.push({ stat: "def", value: 15, pct: true, turns: 2, name: "GdDefBoost" }); } }
            msg = `💫 ${u.name} projeta [Aura Estelar] — escudo de ${sh} em si e +${teamSh} a TODO o time! Provocação ativa.`;
          } else {
            if (f.kirC2) { const weakest = allies.slice().sort((a,b) => (a.shield||0) - (b.shield||0))[0]; if (weakest) { weakest.buffs = weakest.buffs.filter(b => b.name !== "GdDefBoost"); weakest.buffs.push({ stat: "def", value: 15, pct: true, turns: 2, name: "GdDefBoost" }); } }
            msg = `${u.name} ergue um escudo de ${sh} e provoca os inimigos.`;
          }
        }
        if (u.weapon?.buff?.onSkill && !u.weapon?.buff?.athWeapon) { applyBuff([u], u.weapon.buff.onSkill, u.weapon.name, fx, u); msg += ` [${u.weapon.name}]`; }
        if (sk.energyGift) { const t = allies.filter((a) => a.uid !== u.uid && !a.isSummon)[0]; if (t) { t.energy = Math.min(t.energyMax, t.energy + sk.energyGift); msg += ` Doa ${sk.energyGift} de energia a ${t.name}.`; } }
      } else if (kind === "ult") {
        // Athena C6: pode reabrir a seleção das 7 Casas a cada 2 turnos sem custo de energia
        const _athFreeUlt = u.id === "athena" && u.stFlags?.athC6 && s._athHouseActive && (u._athC6Cd || 0) <= 0;
        const _hitoriUltCost = u.id === "hitori" ? (u.stFlags?.hitoriC4 ? 130 : 160) : null; // C4 · Economia de Ritmo: 160 → 130
        if (_hitoriUltCost != null ? u.energy < _hitoriUltCost : (u.energy < u.energyMax && !_athFreeUlt)) return s;
        advanceServosSummon(s, u); // Servos de um Rei (4pç): a Invocação avança 15% ao ativar a Suprema
        shkGenButterfly(s, u.uid); // Shorekeeper: gera Borboleta Estelar quando um aliado usa a Suprema
        // Protocolo de Adaptação Universal (4pç): Suprema concede -20% DEF ignorada + Dano Global +25% por 2 rodadas
        if (f.setAdapt4) {
          u.buffs = u.buffs.filter(b => b.name !== "Protocolo de Adaptação");
          u.buffs.push({ stat: "defPen", value: 20, turns: 2, name: "Protocolo de Adaptação" });
          u.buffs.push({ stat: "dmgBonus", value: 25, turns: 2, name: "Protocolo de Adaptação" });
        }
        if (u.id === "kirara" && (u.stFlags?.kirC4)) { u.energy = Math.min(u.energyMax, u.energy + 20); } // C4: recupera 20 energia ao usar ult
        if (u.id === "kaiba" && sk.kaibaUlt) {
          const oldMon = activeMonster(s, u.uid);
          if (oldMon) { oldMon.alive = false; if (u.stFlags?.kaibaS1) { u._kaibaGraveyard = u._kaibaGraveyard || []; if (u._kaibaGraveyard.length < 3) u._kaibaGraveyard.push(oldMon.name); } if (u.stFlags?.kaibaT2) { u.energy = Math.min(u.energyMax, u.energy + 15); } }
          u._kaibaBEWCount = (u._kaibaBEWCount || 0) + 1; // S6: rastreia quantos Blue-Eyes passaram pelo campo/Cemitério
          const dragon = makeSummon(u, { uid: "S_" + u.uid + "_bew" + Math.floor(Math.random() * 1e6), name: "Dragão Branco de Olhos Azuis", avatar: "🐉", imgKey: "card_bew", kind: "monster", mul: (sk.ultMul || 850) * (u.tUlt || 1) * ampU, spd: effStat(u, "spd"), atkMul: 1.6, hpMul: 0.003, life: Infinity });
          dragon.dragonSplash = 425 * (u.tUlt || 1) * ampU; dragon.dragonVuln = false; dragon.removeBuffsOnHit = true; dragon.dragonLegendary = true; dragon.buffs.push({ stat: "dmgBonus", value: 40, turns: 9999, name: "Dragão Lendário" });
          dragon.av = 0.01; // Entrada Triunfal: avança 100% na Ordem de Turnos — age quase imediatamente
          s.heroes.push(dragon);
          // S4: ativa a Arena KaibaCorp — -18% de RES elemental nos inimigos por ~3 Ciclos (aprox. 10 turnos)
          if (u.stFlags?.kaibaS4) {
            aliveEnemies(s).forEach(e => { e.debuffs = e.debuffs.filter(d => d.name !== "Arena KaibaCorp"); e.debuffs.push({ stat: "elemRes", value: -18, turns: 10, name: "Arena KaibaCorp" }); });
            pushLog(s, "🏟️ ARENA KAIBACORP ativada! -18% de RES elemental em todos os inimigos por 3 Ciclos.");
          }
          msg = "🐉✨ Kaiba invoca o lendário DRAGÃO BRANCO DE OLHOS AZUIS! Ele avança na Ordem de Turnos e prepara a Rajada de Relâmpagos.";
          if (u.stFlags?.kaibaT3) { aliveEnemies(s).forEach(e => { if (e._hasToughness && e.toughness > 0) { e.toughness = Math.max(0, e.toughness - 30); if (e.toughness <= 0) applyBreakEffect(u, e, "Eletro", fx); } }); msg += " [Rastro 3: Resistência de todos os inimigos reduzida!]"; }
          s.summonFx = { kind: "dragon", id: Math.random() };
        }
        if (u.id === "frieren" && u.stFlags?.frC6) { s.choice = { uid: u.uid, kind: "frieren" }; return s; } // C6: jogador escolhe a forma da Suprema
        if (u.id === "athena" && sk.athUlt) { s.choice = { uid: u.uid, kind: "athena" }; return s; } // jogador escolhe quem recebe a Casa Extra antes de aplicar os buffs
        if (u.id === "soifon" && sk.sfUlt) {
          u.energy = enGain(5);
          if (enemy) {
            const fmMarks = (enemy.debuffs || []).filter(d => d.name === "Ferrão da Morte").length;
            enemy.debuffs = (enemy.debuffs || []).filter(d => d.name !== "Ferrão da Morte");
            const bankaiBuff = (f.sfBankai && enemy.hp / enemy.maxHp < 0.3) ? 1.3 : 1;
            const totalMul = (sk.ultMul || 350) * (u.tUlt || 1) * ampU * bankaiBuff * (1 + fmMarks * 0.15);
            let origCR = null;
            if (f.sfBankai && enemy.hp / enemy.maxHp < 0.3) { origCR = u.base.critRate; u.base = { ...u.base, critRate: 200 }; }
            const r = dealDamage(u, enemy, totalMul, fx, { breakW: 3, el: "Vento" });
            if (origCR !== null) u.base.critRate = origCR;
            const zonaTurns = f.sfBankai ? 2 : 1;
            s.sfZona = { turns: zonaTurns };
            if (f.sfC4) s.heroes.filter(h => h.alive && !h.isSummon).forEach(h => h.buffs.push({ stat: "critRate", value: 10, pct: false, turns: zonaTurns + 1, name: "AuraCond" }));
            if (!enemy.alive && f.sfC6) { u.energy = u.energyMax; u.buffs.push({ stat: "dmgBonus", value: 50, turns: 1, name: "ExecSuprema" }); }
            msg = `💥🦋 JAKUHŌ RAIKŌBEN! ${u.name} dispara o míssil definitivo em ${enemy.name} — ${r.dmg} de Dano de Vento${r.crit ? " CRÍTICO!" : ""}!${fmMarks ? ` (+${fmMarks * 15}% de marcas!)` : ""} Zona de Condução por ${zonaTurns} turno(s)!${f.sfC4 ? " +10% CRIT ao time!" : ""}`;
          }
        } else if (u.id === "wonderofyou" && sk.wooUlt) {
            u.energy = enGain(5);
            const wooEnemies = aliveEnemies(s);
            let wooTot = 0, wooCrit = false;
            const debuffDurUlt = (f.wooE2 || f.wooE6) ? 9999 : 4; // E2/E6: permanente
            const mulX = f.wooE6 ? 2 : 1;
            wooEnemies.forEach((e) => {
              const r = dealDamage(u, e, (sk.ultMul || 400) * (u.tUlt || 1) * ampU / Math.max(1, wooEnemies.length * 0.55), fx, { breakW: 3, el: "Chaos" });
              wooTot += r.dmg; if (r.crit) wooCrit = true;
              // Renova debuffs (remove antigos, reaplica com nova duração/potência)
              ["Miss da Calamidade","Vuln","Atraso Fatal","Colapso de Atributos"].forEach(nm => e.debuffs = e.debuffs.filter(d => d.name !== nm));
              e.debuffs.push({ stat: "missChance", value: 20 * mulX, turns: debuffDurUlt, name: "Miss da Calamidade" });
              e.debuffs.push({ stat: "vuln", value: 18 * mulX, turns: debuffDurUlt, name: "Vuln" });
              e.debuffs.push({ stat: "spd", value: -12 * mulX, pct: true, turns: debuffDurUlt, name: "Atraso Fatal" });
              e.debuffs.push({ stat: "def", value: -15 * mulX, pct: true, turns: debuffDurUlt, name: "Colapso de Atributos" });
              if (f.wooA2 && !e.debuffs.some(d => d.name === "Marca da Calamidade")) e.debuffs.push({ stat: "vuln", value: 12, turns: debuffDurUlt, name: "Marca da Calamidade" });
            });
            if (f.wooE1) u._wooRetal = { turns: 2 };
            // E4: bônus dinâmicos por buffs/debuffs ativos
            if (f.wooE4) {
              const uBStats = new Set(s.heroes.flatMap(h => h.buffs.map(b => b.stat))).size;
              const wooDebuffs = new Set(wooEnemies.flatMap(e => e.debuffs.filter(d => ["Miss da Calamidade","Vuln","Atraso Fatal","Colapso de Atributos"].includes(d.name)).map(d => d.name))).size;
              if (uBStats > 0) { u.buffs.push({ stat: "dmgBonus", value: uBStats * 6, turns: 2, name: "E4-Buffs" }); u.buffs.push({ stat: "defPen", value: uBStats * 4, pct: false, turns: 2, name: "E4-Pen" }); u.buffs.push({ stat: "spd", value: uBStats * 3, pct: false, turns: 2, name: "E4-Spd" }); }
              if (wooDebuffs > 0) wooEnemies.forEach(e => e.debuffs.push({ stat: "vuln", value: wooDebuffs * 8, turns: 2, name: "E4-Vuln" }));
            }
            // E6: ativa Julgamento da Calamidade para todas as ações inimigas
            if (f.wooE6) s._wooJudgment = { uid: u.uid };
            msg = `☠️ LEI DA CALAMIDADE ABSOLUTA! ${u.name} — ${wooTot} de Dano Chaos${wooCrit ? " (CRÍTICO!)" : ""}! Debuffs ${(f.wooE2||f.wooE6) ? "PERMANENTES" : `por ${debuffDurUlt}t`}${f.wooE6 ? ", intensidade×2, JULGAMENTO DA CALAMIDADE ativado!" : f.wooE4 ? ` [E4: bônus dinâmicos aplicados!]` : ""}!`;
          } else if (u.id === "yoruichi" && sk.yoruUlt && enemy) {
            const ySpd = effStat(u, "spd"), yAtk = Math.max(1, effStat(u, "atk"));
            const yMul = (ySpd * 22.0 / yAtk) * 100; // 2200% da VEL
            const r = dealDamage(u, enemy, yMul, fx, { el: "Eletro", breakW: 3 });
            allies.filter(a => a.uid !== u.uid && a.alive).forEach(a => { a.av = (a.av || 1) * 0.75; });
            msg = `⚡⚡ SHUNKO: RAIJIN! ${r.dmg}${r.crit ? " (CRÍTICO!)" : ""} em ${enemy.name}! O resto do time avança 25% na Ordem de Turnos!`;
            // Insere 2 Clones Residuais forçados (conta pro Colapso Elétrico e pro registro do Ponto de Aterramento)
            for (let ci = 0; ci < 2 && enemy.alive; ci++) { dealDamage(u, enemy, yMul * 0.5, fx, { el: "Eletro", isYoruClone: true, isFollowup: true, breakW: 1 }); }
          } else if (u.id === "shorekeeper" && sk.shkUlt) {
            const f = u.stFlags || {};
            // Estágio 1: time inteiro ganha +15% CRIT e +30% CRIT DMG por 3 turnos (Rastro 3 + C3 amplificam o CRIT DMG)
            const t3Bonus = f.shkT3 ? Math.min(20, Math.max(0, Math.floor((u.maxHp - 4000) / 1000) * 2)) : 0;
            const critDmgVal = Math.round((30 + t3Bonus) * ampU);
            s.heroes.forEach(h => { if (h.alive && !h.isSummon) { h.buffs = h.buffs.filter(b => b.name !== "Estelarador"); h.buffs.push({ stat: "critRate", value: 15, turns: 3, name: "Estelarador" }, { stat: "critDmg", value: critDmgVal, turns: 3, name: "Estelarador" }); } });
            s._shkDomain = { turns: 3, stage: 1, spSpent: 0, ownerUid: u.uid };
            u._domainStage = 1; u._domainSpSpent = 0; u._domainTurns = 3;
            if (u.stFlags?.setCostaNegra6) { u._costaNegraTrack = 3; u._costaNegraOverheal = 0; }
            s.heroes.forEach(h => { if (h.alive && !h.isSummon) h._universalAdvActive = false; }); // reseta de uma ativação anterior
            if (u.weapon?.buff?.shkWeapon) { allies.filter(a => a.uid !== u.uid && a.alive).forEach(a => { a.energy = Math.min(a.energyMax, a.energy + 14); }); s.heroes.forEach(h => { if (h.alive && !h.isSummon) { h.buffs = h.buffs.filter(b => b.name !== "Sincronização de Rede"); h.buffs.push({ stat: "dmgBonus", value: 24, turns: 3, name: "Sincronização de Rede" }); } }); }
            msg = `🌌✨ FIM DO LAMENTO! O Estelarador cobre o campo — Estágio 1: todo o time ganha +15% de Taxa de CRIT e +${critDmgVal}% de CRIT DMG por 3 turnos.${u.weapon?.buff?.shkWeapon ? " A arma sincroniza a equipe: +14 de Energia pros aliados e +24% de Dano Final enquanto o domínio durar." : ""}`;
          } else if (u.id === "yanagi" && sk.yanaUlt) {
            const maxSparks = u.stFlags?.yanaS3 ? 8 : 5;
            const targets = aliveEnemies(s);
            targets.forEach(e => { const cur = e.debuffs.filter(d => d.name === "Fagulha de Anomalia").length; for (let i = cur; i < maxSparks; i++) e.debuffs.push({ stat: "mark", value: 0, turns: 3, name: "Fagulha de Anomalia" }); });
            let tot = 0, desTot = 0;
            targets.forEach(e => {
              const r = dealDamage(u, e, (sk.ultMul || 180) * u.tUlt * ampU, fx, { el: "Eletro", breakW: 3 });
              tot += r.dmg;
              if (e.alive && (e.dots || []).length > 0) {
                const dsd = triggerDesordem(u, e, fx, { noConsume: true, absoluteMul: 1.6, forceCrit: !!u.stFlags?.yanaS5 });
                desTot += dsd;
              }
              if (e.alive) { e.debuffs = e.debuffs.filter(d => d.name !== "Isolamento Corrosivo"); e.debuffs.push({ stat: "elemRes", value: -20, turns: 2, name: "Isolamento Corrosivo" }); }
            });
            // S2: clona os DoTs do alvo de maior HP máximo pros demais inimigos por 2 turnos
            if (u.stFlags?.yanaS2 && targets.length > 1) {
              const mainT = targets.slice().sort((a, b) => b.maxHp - a.maxHp)[0];
              if (mainT && mainT.alive && (mainT.dots || []).length) {
                targets.filter(e => e.uid !== mainT.uid && e.alive).forEach(e => { mainT.dots.forEach(d => { e.dots.push({ type: d.type, dmg: Math.round(d.dmg * 1.10), turns: 2 }); }); });
                pushLogGlobalFx(fx, mainT.uid, "S2: DoTs clonados!");
              }
            }
            msg = `⚡🌀 ECLIPSE VOLTAICO! ${tot} de Dano Eletro em área, injeta Fagulhas máximas em todos, e detona DESORDEM ABSOLUTA (+${desTot} de dano) nos alvos com DoT! Isolamento Corrosivo aplicado por 2 turnos.`;
          } else if (u.id === "agumon" && sk.aguUlt) {
            const fm = u.agForm || "agumon";
            const c4Mul = u.stFlags?.aguC4 ? 3 : 1; // C4: +200% de dano da Suprema em todas as formas
            if (fm === "agumon") {
              const hot = (u.agHeat || 0) > 50; const pen = hot ? 40 : 0;
              let tU = 0; aliveEnemies(s).forEach(e => { tU += dealDamage(u, e, (sk.ultMul || 300) * c4Mul * u.tUlt * ampU, fx, { breakW: 3, el: "Fogo", defPen: pen }).dmg; });
              if (hot) u.agHeat = 0;
              u.agSP = Math.min(aguSPMax(u), (u.agSP || 0) + 35);
              msg = `🔥🔥 PEPPER BREATH! ${tU} de Dano de Fogo em todos${hot ? " — TODO o Calor foi convertido em 40% de penetração de DEF!" : ""}. [+35 SP · Calor → ${u.agHeat}]`;
            } else if (fm === "greymon" && enemy) {
              const r = dealDamage(u, enemy, 380 * c4Mul * u.tUlt * ampU, fx, { breakW: 3, el: "Fogo" });
              const transf = Math.round((u.agHeat || 0) / 2); u.agHeat = Math.max(0, (u.agHeat || 0) - transf);
              if (enemy.alive) enemy.debuffs.push({ stat: "atk", value: -30, pct: true, turns: 2, name: "Calor Transferido" });
              u.agSP = Math.min(aguSPMax(u), (u.agSP || 0) + 35);
              msg = `🌋 NOVA BLAST sob ${enemy.name} — ${r.dmg}${r.crit ? " (CRÍTICO!)" : ""}! Metade do Calor é transferida: ATK do alvo -30% por 2 rodadas. [Calor → ${u.agHeat}]`;
            } else if (fm === "metalgreymon") {
              let tU = 0; aliveEnemies(s).forEach(e => { tU += dealDamage(u, e, 330 * c4Mul * u.tUlt * ampU, fx, { breakW: 3, el: "Fogo" }).dmg; if (e.alive) e.av = (e.av || 1) * 1.15; });
              u.agSP = Math.min(aguSPMax(u), (u.agSP || 0) + 35);
              msg = `💥 TERA DESTROYER! ${tU} de dano em todos + a ação de TODOS os inimigos atrasa 15% — a janela perfeita para calcular sua evolução!`;
            } else if (enemy) {
              let mulX = 1, spent = 0;
              if ((u.agModoX || 0) > 0 && (u.agSP || 0) > 0) { spent = u.agSP; mulX = Math.min(2, 1 + spent / 150); u.agSP = 0; }
              const gaia = Math.min(932000, Math.round(effStat(u, "atk") * 6 * c4Mul * mulX * u.tUlt * ampU));
              enemy.hp -= gaia; if (enemy.hp <= 0) { enemy.hp = 0; enemy.alive = false; }
              fx.push({ uid: enemy.uid, txt: String(gaia), crit: true, id: Math.random(), el: "Fogo" });
              msg = `☀️ GAIA FORCE!!! ${gaia} de DANO VERDADEIRO em ${enemy.name}${spent ? ` — o MODO X consumiu ${spent} TamerSP (dano ×${mulX.toFixed(2)})!` : "!"}`;
              if (!enemy.alive) {
                s.heroes.forEach(h => { if (h.alive) h.av = 0.01; }); msg += " 🌟 A energia colapsa — TODO O TIME AVANÇA PARA AGIR IMEDIATAMENTE!";
                if (u.stFlags?.aguT3) { const nextT = aliveEnemies(s).sort((a, b) => b.hp - a.hp)[0]; if (nextT) { const fr = Math.round(gaia * 0.5); nextT.hp -= fr; if (nextT.hp <= 0) { nextT.hp = 0; nextT.alive = false; } fx.push({ uid: nextT.uid, txt: String(fr), crit: true, id: Math.random(), el: "Fogo" }); msg += ` ⚡ Pressão Crítica: ataque de seguimento em ${nextT.name} (${fr})!`; } }
              }
              else if (u.stFlags?.aguC5) { enemy.debuffs = enemy.debuffs.filter(d => d.name !== "Ruptura de Realidade"); enemy.debuffs.push({ stat: "mark", value: 0, turns: 2, name: "Ruptura de Realidade" }); msg += " 💫 RUPTURA DE REALIDADE! Por 2 rodadas, todo dano recebido por ele ignora a DEF!"; }
            }
          } else if (u.id === "ryoshu" && sk.ryoUlt) {
            aliveEnemies(s).forEach(e => { if (e.alive) applyDot([e], { type: "sinking", mul: 60, turns: 3 }, u, fx); });
          u.energy = enGain(5);
          const sMul = u.tUlt * ampU;
          const drainable = allies.filter(a => a.uid !== u.uid && !a.isSummon && a.alive);
          let totalDrained = 0;
          drainable.forEach(a => {
            const drained = Math.max(1, Math.round(a.maxHp * 0.32));
            a.hp = Math.max(1, a.hp - drained);
            totalDrained += drained;
            fx.push({ uid: a.uid, txt: "-" + drained, dot: "drain", id: Math.random() });
            if (f.ryoC2) { a.buffs = a.buffs.filter(b => b.name !== "FioGuia"); a.buffs.push({ stat: "dmgReduce", value: 35, turns: 1, name: "FioGuia" }); }
            if (f.ryoC4 && a.buffs.length > 0) u.energy = Math.min(u.energyMax, u.energy + 8);
          });
          if (u.weapon?.id === "lamina_matriarca") u._inkDrops = Math.min(3, (u._inkDrops || 0) + 1);
          const inkMul2 = u.weapon?.id === "lamina_matriarca" ? (1 + (u._inkDrops || 0) * 0.15) : 1;
          let defPenBonus = 0;
          if (f.ryoAAM) { let mp = 0; drainable.forEach(a => { mp += (1 - a.hp / a.maxHp) * 100; }); defPenBonus = Math.min(65, mp * 0.6); }
          const flatBase2 = Math.round(totalDrained * 4.20 * inkMul2 * (f.setTeia4 ? 1.45 : 1));
          if (f.setTeia4) { let mp2 = 0; drainable.forEach(a => { mp2 += (1-a.hp/a.maxHp)*100; }); defPenBonus = Math.max(defPenBonus, Math.min(30, Math.round(mp2/10)*3)); }
          let tot2 = 0;
          aliveEnemies(s).forEach(e => {
            const isBoss = e.boss || e.elite;
            const r = dealDamage(u, e, (sk.ultMul || 450) * sMul, fx, { breakW: 3, el: "Virus", defPen: defPenBonus });
            tot2 += r.dmg;
            const critM2 = (f.ryoSET && Math.random() < (u.base.critRate/100)) ? (1+(effStat(u,"critDmg")||50)/100) : 1;
            const fd2 = Math.round(flatBase2 * critM2);
            if (!isBoss) { e.hp -= fd2; if (e.hp <= 0) { e.hp = 0; e.alive = false; } }
            else { e.hp = Math.max(1, e.hp - fd2); }
            fx.push({ uid: e.uid, txt: String(fd2), crit: critM2 > 1, id: Math.random(), el: "Virus" });
            tot2 += fd2;
            // Execute non-boss
            if (!isBoss && e.alive && e.hp < totalDrained) { e.hp = 0; e.alive = false; fx.push({ uid: e.uid, txt: "DELETADO!", crit: true, id: Math.random(), el: "Virus" }); }
            // Boss true damage burst
            if (isBoss) { const tdMul = f.ryoC6 ? 10.0 : 6.0; const td = Math.round(totalDrained * tdMul); e.hp = Math.max(1, e.hp - td); fx.push({ uid: e.uid, txt: td + "!", crit: true, id: Math.random(), el: "Virus" }); tot2 += td; }
          });
          const allLow = drainable.every(a => a.hp / a.maxHp < 0.5);
          if (f.ryoC6 && allLow) { u.av = 0.01; }
          msg = "A TELA DA ARANHA! " + u.name + " sacrifica " + totalDrained + " HP do time — " + tot2 + " de dano total!" + (defPenBonus > 0 ? " (perfura " + defPenBonus.toFixed(0) + "% DEF!)" : "") + (f.ryoC6 && allLow ? " [C6] Ryoshu age NOVAMENTE!" : "");
        } else if (u.id === "hitori" && sk.hitoriUlt) {
          u.energy = 0;
          msg = hitoriUltimate(s, u, fx);
        } else if (u.id === "lupa" && sk.lupaUlt) {
          u.energy = enGain(5);
          msg = lupaUltimate(s, u, fx, ampU);
        } else if (u.id === "frieren" && sk.frUlt) {
          u.energy = enGain(5);
          const sMul = u.tUlt * ampU;
          const pts = u._frPoints || 0;
          const enems = aliveEnemies(s);
          const mainT = targetEnemy(s);
          const teamNeedsHeal = allies.some(a => a.hp / a.maxHp < 0.40);
          let ultChoice = "zoltraak";
          if (teamNeedsHeal && pts >= 2) ultChoice = "flowers";
          else if (pts >= 2 && enems.length > 1) ultChoice = "reaction";
          if (ultChoice === "zoltraak" && mainT) {
            const isChaosVirus = mainT.element === "Chaos" || mainT.element === "Virus";
            let origCR = null;
            if (isChaosVirus || f.frZoltraak) { origCR = u.base.critRate; u.base = { ...u.base, critRate: 200 }; }
            const defP = (isChaosVirus && f.frZoltraak) ? 100 : (f.frC6 ? 100 : 0);
            const rz = dealDamage(u, mainT, (sk.ultMul || 500) * sMul, fx, { breakW: 3, el: "Holy", pierceShield: isChaosVirus, defPen: defP });
            if (origCR !== null) u.base.critRate = origCR;
            if (f.frC2 && enems.length > 1) enems.filter(e => e.uid !== mainT.uid && e.alive).forEach(e => dealDamage(u, e, (sk.ultMul || 500) * sMul * 0.5, fx, { breakW: 3, el: "Holy" }));
            if (!mainT.boss && f.frC6 && mainT.hp / mainT.maxHp < 0.30) { mainT.hp = 0; mainT.alive = false; fx.push({ uid: mainT.uid, txt: "APAGADO!", crit: true, id: Math.random() }); }
            if (f.frC4) enems.forEach(e => { const exA = e.debuffs.find(d => d.name === "AuraOculta"); if (exA) { exA.value = -20; exA.turns = Math.max(exA.turns, 3); } else e.debuffs.push({ stat: "def", value: -20, turns: 3, name: "AuraOculta" }); });
            msg = "ZOLTRAAK! " + u.name + " dispara o feixe colossal em " + mainT.name + " — " + rz.dmg + " de Dano Holy" + (rz.crit ? " CRÍTICO!" : "") + "!" + (isChaosVirus ? " Crit Garantido + ignora Escudos!" : "") + (f.frC2 ? " Refração em adjacentes!" : "");
          } else if (ultChoice === "reaction") {
            const dmgMul = 1 + pts * 0.3;
            u._frPoints = 0; u._frPointTypes = [];
            let tot3 = 0;
            enems.forEach(e => { const r = dealDamage(u, e, (sk.ultMul || 500) * sMul * dmgMul * 0.6, fx, { breakW: 3, el: "Holy" }); tot3 += r.dmg; if (pts >= 3) e.debuffs.push({ stat: "spd", value: -15, pct: true, turns: 2, name: "Nevasca" }); });
            if (u.weapon?.buff?.frTeamBonus) allies.forEach(a => a.buffs.push({ stat: "dmgBonus", value: 15, turns: 1, name: "CajadoReacao" }));
            msg = "REAÇÃO DE CAMPO! " + u.name + " libera " + pts + " pontos de elemento — " + tot3 + " de dano em área (×" + dmgMul.toFixed(1) + ")!" + (pts >= 3 ? " Inimigos ficam lentos!" : "");
          } else {
            u._frPoints = Math.max(0, pts - 2);
            const healAmt = Math.round(0.20 * u.maxHp);
            allies.forEach(a => { healUnit(a, healAmt, fx); a.debuffs = []; a.buffs.push({ stat: "dmgReduce", value: 15, turns: 3, name: "CampoFlores" }); });
            if (f.frFlowers) allies.forEach(a => { a.hp = Math.min(a.maxHp, a.hp + Math.round(a.maxHp * 0.15)); a.buffs.push({ stat: "dmgBonus", value: 10, turns: 2, name: "FloraEterna" }); });
            msg = "MAGIA DE FLORES! " + u.name + " faz nascer flores — o time é curado em " + healAmt + ", debuffs removidos e +15% resistência por 3 turnos!" + (f.frFlowers ? " +15% HP e +10% dano ao time!" : "");
          }
          // Alem do Horizonte 4pc: team buff after Frieren ult
          if (u.id === "frieren" && f.setHorizonte4) {
            const extraBonus = Math.min(20, (u._frPoints || 0) * 5);
            allies.forEach(a => {
              a.buffs.push({ stat: "dmgBonus", value: 15 + extraBonus, turns: 2, name: "HorizonteUlt" });
              a.buffs.push({ stat: "critDmg",  value: 12,              turns: 2, name: "HorizonteCrit" });
            });
            msg += (extraBonus > 0 ? " [Além do Horizonte] +15%+" + extraBonus + "% Dano Bônus e +12% CRIT DMG ao time!" : " [Além do Horizonte] +15% Dano Bônus e +12% CRIT DMG ao time!");
          }
        } else if (u.id === "nami" && sk.namiUlt) {
          u.energy = enGain(5);
          const explodeMul = f.namiC6 ? 100 : 60;
          let tot = 0;
          aliveEnemies(s).forEach((e) => {
            const r = dealDamage(u, e, (sk.ultMul || 340) * u.tUlt * ampU, fx, { breakW: 3, el: "Vento" });
            tot += r.dmg;
            // Explode active DoTs
            let dotDmg = 0;
            (e.dots || []).forEach((d) => { const xd = Math.max(1, Math.round(d.dmg * explodeMul / 100)); dotDmg += xd; e.hp -= xd; if (e.hp <= 0) { e.hp = 0; e.alive = false; } fx.push({ uid: e.uid, txt: String(xd), dot: d.type, id: Math.random() }); });
            if (dotDmg) tot += dotDmg;
          });
          if (f.namiC4) u.energy = Math.min(u.energyMax, u.energy + 15);
          msg = `🌊⚡ ZEUS BREEZE TEMPO! ${u.name} — ${tot} de dano total (explosão de DoTs: ${explodeMul}%)!`;
        } else if (u.id === "lancer" && sk.lancerUlt && enemy) {
          u.energy = enGain(5);
          const defPen = f.lancerC6 ? 20 : 0;
          const forceCrit = enemy.hp / enemy.maxHp < 0.50;
          let origCR = null;
          if (forceCrit) { origCR = u.base.critRate; u.base = { ...u.base, critRate: 200 }; }
          const r = dealDamage(u, enemy, (sk.ultMul || 420) * u.tUlt * ampU, fx, { breakW: 3, pierceShield: true, defPen });
          if (origCR !== null) u.base.critRate = origCR;
          msg = `🏹💀 GÁE BOLG! ${u.name} perfura ${enemy.name} com A Lança da Morte — ${r.dmg} de Caos${r.crit ? " CRÍTICO!" : ""}!${forceCrit ? " (CRÍTICO GARANTIDO < 50% HP!)" : ""}${defPen ? ` Perfura ${defPen}% DEF!` : ""}`;
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
            const r = dealDamage(u, e, baseMul, fx, { breakW: 3, el: "Virus" });
            const extraHp = Math.max(1, Math.round(u.maxHp * 0.30 * (1 + vulnOf(e) / 100)));
            e.hp -= extraHp; if (e.hp <= 0) { e.hp = 0; e.alive = false; } fx.push({ uid: e.uid, txt: String(extraHp), id: Math.random(), el: "Virus" });
            tot += r.dmg + extraHp;
            if (e.alive) { e.dots = (e.dots || []).filter((d) => d.type !== "corrosao"); e.dots.push({ type: "corrosao", dmg: Math.max(1, Math.round(effStat(u, "atk") * 0.60 * dblCorr)), turns: 3, healMul: f.omgReescrita ? 1.35 : 1 }); if (f.omgC4) e.debuffs.push({ stat: "spd", value: -15, pct: true, turns: 1, name: "Lentidão" }); }
          });
          if (f.omgC6) { s.heroes.forEach((a) => { if (!a.alive && !a.isSummon) { a.alive = true; a.hp = Math.round(a.maxHp * 0.30); a.shield = 0; a.dots = []; fx.push({ uid: a.uid, txt: "REVIVE", heal: true, id: Math.random() }); } }); }
          msg = `💥🛡️ ALL DELETE! ${u.name} consome ${cost} do próprio HP e arrasa todos os inimigos — ${tot} de Dano de Vírus em área! Aplica [Corrosão] (dano contínuo que cura o time).${f.omgC4 ? " Inimigos ficam lentos!" : ""}${f.omgC6 ? " Revive aliados caídos!" : ""}`;
        } else {
        u.energy = enGain(5); // reembolso HSR: +5 base ×ERR
        const uMul = u.tUlt * ampU * (f.setFire4 ? 1.2 : 1); // Núcleo Ardente 4pç: +20% dano de Ult
        if (sk.ultMul && enemy) { if (sk.ultAoe) { let tot = 0; aliveEnemies(s).forEach((e) => { const r = dealDamage(u, e, sk.ultMul * uMul, fx, { breakW: 3 }); tot += r.dmg; if (r.crit && f.miResidual && e.alive && !e.debuffs.some((d) => d.name === "Residual")) e.debuffs.push({ stat: "mark", value: 0, turns: 99, name: "Residual" }); }); msg = `💥 ${u.name} dispara o Ultimate em área — ${tot} de dano total!`; } else { const r = dealDamage(u, enemy, sk.ultMul * uMul, fx, { breakW: 3 }); if (r.crit && f.miResidual && enemy.alive && !enemy.debuffs.some((d) => d.name === "Residual")) enemy.debuffs.push({ stat: "mark", value: 0, turns: 99, name: "Residual" }); msg = `💥 ${u.name} desencadeia o Ultimate em ${enemy.name} — ${r.dmg}${r.crit ? " (CRÍTICO!)" : ""}!`; } }
        if (f.miC4) { s.frostZone = 3; msg += " Uma ZONA DE GEADA cobre o campo — Miyabi entra em Postura Iaido permanente!"; }
        if (f.setFire4) u.buffs.push({ stat: "atk", value: 8, pct: true, turns: 2, name: "Brasa" });
        if (sk.ultDot && enemy) { applyDot(sk.ultAoe ? aliveEnemies(s) : [enemy], sk.ultDot, u, fx); }
        if (sk.dragonStrike) { const dragon = aliveDragons(s, u.uid)[0]; if (dragon && enemy) { const r = dealDamage(dragon, enemy, sk.dragonStrike, fx, { breakW: 3, el: "Eletro" }); msg += ` ${dragon.name} ataca por ${r.dmg}.`; } }
        if (sk.ultBuff) { const _ub = { ...supAmp(sk.ultBuff, u.tUlt, 1), turns: Math.round(sk.ultBuff.turns * ampU) + (u.id === "uraraka" && f.uraC4 ? 1 : 0) }; applyBuff(allies, _ub, u.name, fx, u); msg += ` Fortalece o time${u.id === "uraraka" && f.uraC4 ? " [C4: 3 turnos]" : ""}.`; }
        if (sk.ultDebuff) { const _ud = { ...supAmp(sk.ultDebuff, u.tUlt, 1), defDown: (sk.ultDebuff.defDown === 15 && u.id === "nanami" && f.nanamC2) ? 20 : (sk.ultDebuff.defDown ? Math.round(sk.ultDebuff.defDown * Math.min(1.12, u.tUlt || 1)) : undefined) }; applyDebuff(aliveEnemies(s), _ud, 0, u); msg += ` Inimigos ficam vulneráveis${u.id === "nanami" && f.nanamC2 ? " [C2: DEF -20%]" : ""}.`; }
        if (sk.ultHeal) { allies.forEach((a) => doHeal(a, (effStat(u, "atk") * sk.ultHeal.mul / 100 + sk.ultHeal.flat) * hb * ampU * (u.tUlt || 1) * (f.pMedic ? 1.25 : 1))); msg = msg ? msg + " Cura toda a equipe." : `💥 ${u.name} cura toda a equipe.`; }
        if (sk.ultShield) {
          const ultShVal = Math.round((effStat(u, "def") * sk.ultShield.defMul / 100 + sk.ultShield.flat) * shB * ampU * (u.tUlt || 1));
          allies.forEach((a) => { a.shield += capShieldAdd(a, ultShVal); });
          msg += ` Escuda a equipe.`;
          if (f.kirC6) {
            const bonusSh = Math.round(ultShVal * 0.50);
            allies.forEach((a) => { a.shield += capShieldAdd(a, bonusSh); });
            applyBuff(allies, { dmgBonus: 25, all: true, turns: 2 }, u.name, fx, u);
            msg += ` 💫 [Muralha Estelar Absoluta] +${bonusSh} escudo extra a todos e +25% Bônus de Dano ao time por 2 turnos!`;
          }
        }
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
      if (u.id === "lupa" && (u._lupaOverclock || 0) > 0) { u._lupaOverclock -= 1; if (u._lupaOverclock <= 0) pushLog(s, `🔥 O Overclock de ${u.name} terminou.`); }
      if (u.id === "lupa" && (u._lupaSupernova || 0) > 0) u._lupaSupernova -= 1;
      if (u.id === "soifon" && s.sfZona) { s.sfZona.turns -= 1; if (s.sfZona.turns <= 0) s.sfZona = null; }
      s.sfFollowThisTurn = 0;
      checkSoiFonFollowup(s, u, s.fx);
      checkNamiFollowup(s, u, s.fx);
      // Yoruichi S3: reconhece Supremas ofensivas de outros aliados como Ataque Extra (gatilho próprio dela, não genérico)
      if (kind === "ult" && u.id !== "yoruichi") {
        const yoru3 = s.heroes.find(h => h.id === "yoruichi" && h.alive && h.stFlags?.yoruS3);
        const t3 = yoru3 && targetEnemy(s);
        if (yoru3 && t3 && t3.alive) {
          const ySpd = effStat(yoru3, "spd"), yAtk = Math.max(1, effStat(yoru3, "atk"));
          const cloneMul = (ySpd * 5.0 / yAtk) * 100;
          const cr3 = dealDamage(yoru3, t3, cloneMul, s.fx, { el: "Eletro", isYoruClone: true, breakW: 1 });
          yoru3._yoruClones = (yoru3._yoruClones || 0) + 1;
          if (yoru3._yoruClones % 3 === 0 && t3._sibs) {
            const burstMul = (ySpd * 15.0 / yAtk) * 100;
            t3._sibs.filter(e => e.alive).forEach(e => { dealDamage(yoru3, e, burstMul, s.fx, { el: "Eletro", isYoruClone: true, breakW: 2 }); e.debuffs.push({ stat: "vuln", value: 20, turns: 2, name: "Colapso Elétrico" }); });
            pushLog(s, "⚡💥 S3: a Suprema aliada dispara o COLAPSO ELÉTRICO de Yoruichi!");
          }
          if ((yoru3._yoruStance || 0) > 0 && yoru3._yoruMarkUid === t3.uid) {
            const rate3 = yoru3.stFlags?.yoruS5 ? 0.52 : 0.35;
            yoru3._yoruRecordedDmg = (yoru3._yoruRecordedDmg || 0) + (cr3.dmg || 0) * rate3;
          }
        }
      }
      // C2 Athena: Lei da Inércia — avança AV de Athena quando aliado sob 7 Casas age
      { const athC2h = s.heroes.find(h => h.id === "athena" && h.alive && h.stFlags?.athC2 && h.uid !== u.uid);
        if (athC2h && s._athHouseActive && u.buffs.some(b => b.name === "Bênção do Olimpo")) {
          athC2h.av = Math.max(0.01, athC2h.av * 0.85); // 15% de avanço
        } }
      // Athena: contagem do Modo Aprimorado (expira após 2-3 turnos dela) + cooldown do C6
      if (u.id === "athena") {
        if (u.athEnhanced) { u._athEnhancedTurns = (u._athEnhancedTurns || 0) - 1; if (u._athEnhancedTurns <= 0) { u.athEnhanced = false; pushLog(s, "🕊️ O Modo Aprimorado de " + u.name + " termina — a Perícia volta a curar."); } }
        if ((u._athC6Cd || 0) > 0) u._athC6Cd -= 1;
      }
      // 7 Casas: desativa a flag quando nenhum aliado tem mais o buff (não-C6)
      if (s._athHouseActive && !s.heroes.some(h => h.alive && h.buffs.some(b => b.name === "Bênção do Olimpo"))) s._athHouseActive = false;
      // ═══ Agumon: termodinâmica no fim do turno dele ═══
      if (u.id === "agumon" && u.alive) {
        // Reforço defensivo: garante que os buffs da forma atual nunca sumam por engano
        const _agFm = u.agForm || "agumon";
        if (_agFm !== "agumon" && !u.buffs.some(b => b.name === "Forma: " + (_agFm === "greymon" ? "Greymon" : _agFm === "metalgreymon" ? "MetalGreymon" : "WarGreymon"))) {
          if (_agFm === "greymon") u.buffs.push({ stat: "def", value: 100, pct: true, turns: 9999, name: "Forma: Greymon" });
          else if (_agFm === "metalgreymon") { u.buffs.push({ stat: "atk", value: 100, pct: true, turns: 9999, name: "Forma: MetalGreymon" }); u.buffs.push({ stat: "dmgBonus", value: 40, turns: 9999, name: "Forma: MetalGreymon" }); }
          else if (_agFm === "wargreymon") { u.buffs.push({ stat: "atk", value: 60, pct: true, turns: 9999, name: "Forma: WarGreymon" }); u.buffs.push({ stat: "dmgBonus", value: 90, turns: 9999, name: "Forma: WarGreymon" }); }
        }
        if ((u.agTrident || 0) > 0) u.agTrident -= 1;
        if ((u.agModoX || 0) > 0) { u.agModoX -= 1; u.agHeat = 0; if (u.agModoX <= 0) { u.buffs = u.buffs.filter(b => b.name !== "MODO X"); pushLog(s, "⚙️ O MODO X se encerra — os sistemas do WarGreymon voltam ao normal."); } }
        // Forma imperfeita: dura 1 turno → regride com 1 de HP e 0 SP
        if ((u.agTempForm || 0) > 0) { u.agTempForm -= 1; if (u.agTempForm <= 0 && !u.stFlags?.aguC6) { aguRevert(u, s, true); } else if (u.agTempForm <= 0) { u.agTempForm = 0; } }
        // Calor > 70: Overclocking (+ATK/+CD até 80%). C3: sem dreno de HP — vira Escudo (10% do ATK/rodada)
        u.buffs = u.buffs.filter(b => b.name !== "Overclocking");
        if ((u.agHeat || 0) > 70 && (u.agModoX || 0) <= 0) {
          const ov = Math.round(((u.agHeat - 70) / 30) * 80);
          u.buffs.push({ stat: "atk", value: ov, pct: true, turns: 9999, name: "Overclocking" });
          u.buffs.push({ stat: "critDmg", value: ov, turns: 9999, name: "Overclocking" });
          if (u.stFlags?.aguC3) { const shGain = Math.round(effStat(u, "atk") * 0.10); u.shield = (u.shield || 0) + shGain; fx.push({ uid: u.uid, txt: "🛡️+" + shGain, heal: true, id: Math.random() }); }
          else { const burn5 = Math.round(u.maxHp * 0.05); u.hp = Math.max(1, u.hp - burn5); fx.push({ uid: u.uid, txt: String(burn5), dot: "burn", id: Math.random() }); }
        }
        // Meltdown a 100 de Calor — C6: nunca regride pra forma base, só perde TamerSP e esfria
        if ((u.agHeat || 0) >= 100 && (u.agForm || "agumon") !== "agumon" && !u.stFlags?.aguC6) {
          aguRevert(u, s, false); u.agSP = Math.round((u.agSP || 0) / 2); u.agHeat = 0;
          pushLog(s, "☢️ MELTDOWN! O núcleo de " + u.name + " colapsa — a evolução desfaz e metade do TamerSP evapora!");
        } else if ((u.agHeat || 0) >= 100) { u.agHeat = 0; u.agSP = Math.round((u.agSP || 0) / 2); pushLog(s, (u.stFlags?.aguC6 ? "☢️ Superaquecimento contido! O núcleo é resfriado à força, mas a Forma Eterna mantém " + u.name + " na forma atual — só perde metade do TamerSP." : "☢️ Superaquecimento! Agumon perde metade do TamerSP ao ventilar o núcleo.")); }
      }
      applyMutPostAction(s, u); // mutadores do Abismo
      // Wonder of You — Rastros A4/A6
      { const woo = s.heroes.find(h => h.id === "wonderofyou" && h.alive);
        const WOO_DEBUFFS = ["Miss da Calamidade","Vuln","Atraso Fatal","Colapso de Atributos"];
        if (woo) {
          // A4: fim do turno da WoY — se algum inimigo tiver 2+ debuffs dela, +10 energia
          if (u.uid === woo.uid && woo.stFlags?.wooA4) {
            const anyTwo = s.enemies.some(e => e.alive && e.debuffs.filter(d => WOO_DEBUFFS.includes(d.name)).length >= 2);
            if (anyTwo) { woo.energy = Math.min(woo.energyMax, woo.energy + 10); }
          }
          // A6: inimigo que perdeu todos os debuffs dela por expiração sofre explosão residual de 120% ATK
          if (woo.stFlags?.wooA6) {
            s.enemies.forEach(e => {
              const cnt = e.debuffs.filter(d => WOO_DEBUFFS.includes(d.name)).length;
              if (e.alive && e._wooHadDebuffs && cnt === 0) {
                const r6 = dealDamage(woo, e, 120, s.fx, { breakW: 2, el: "Chaos" });
                pushLog(s, "☄️ [A6] Explosão residual da Calamidade atinge " + e.name + " — " + r6.dmg + " de Dano Chaos!");
              }
              e._wooHadDebuffs = cnt > 0;
            });
          }
        } }
      s.hitFx = { el: u.element, big: kind === "ult" || sk.ultAoe || (kind === "skill" && sk.aoe), support: !fx.some((x) => !x.heal && !x.dot), id: Math.random() };
      pushLog(s, msg || `${u.name} se prepara.`); s = checkEnd(s); s.turn = null; return s;
    });
  }

  function playKaibaHandCard(cardIdx, tribute) {
    const _now = Date.now();
    if (_now - actionLockRef.current < 400) return;
    actionLockRef.current = _now;
    setState((s0) => {
      let s = { ...s0, heroes: s0.heroes.map(cloneU), enemies: s0.enemies.map(cloneU), fx: [] };
      const u = s.heroes.find(h => h.id === "kaiba" && h.alive); if (!u) { s.turn = null; return s; }
      const hand = u._kaibaHand || [];
      const cardId = hand[cardIdx]; if (!cardId) { s.turn = null; return s; }
      const monsters = s.heroes.filter(h => h.isSummon && h.kind === "monster" && h.ownerUid === u.uid && h.alive);
      const canTribute = tribute && u.stFlags?.kaibaS3 && monsters.length >= 2;
      if (!canTribute && s.sp <= 0) { pushLog(s, "🎴 Sem Ponto de Habilidade pra ativar a carta."); s.turn = null; return s; }
      if (!canTribute) s.sp -= 1;
      u._kaibaHand = hand.filter((_, i) => i !== cardIdx);
      const fx = s.fx, allies = s.heroes.filter(h => h.alive), ampS = u.ampSkill || 1, sMulK = u.tSkill * ampS;
      const catOf = (id) => (["vorse", "kaiser", "saggi", "judge", "obelisk"].includes(id) ? "monster" : (["control", "shrink", "flute"].includes(id) ? "magic" : "trap"));
      let chainX2 = !!canTribute, msgPre = canTribute ? "⚔️ TRIBUTO! Ambos os monstros sacrificados — dano em DOBRO e ação avançada! " : "";
      if (!canTribute && u.stFlags?.kaibaS2 && u._kaibaLastActivatedCat) {
        if (catOf(cardId) === u._kaibaLastActivatedCat) { chainX2 = true; msgPre = "⛓️ CHAIN LINK 2! "; }
        else { let totDisc = 0; aliveEnemies(s).forEach(e => { totDisc += dealDamage(u, e, 180 * sMulK, fx, { el: "Eletro" }).dmg; }); msgPre = `🗑️ Descarte! ${totDisc} de Dano Eletro em área. `; }
      }
      u._kaibaLastActivatedCat = catOf(cardId);
      // Se a carta ativada da mão for um Monstro do MESMO tipo já em campo, devolve 1 Ponto de Habilidade (exceto em Tributo, que já é de graça)
      if (!canTribute) {
        const curMonH = activeMonster(s, u.uid);
        const cardNameH = { vorse: "Vorse Raider", kaiser: "Kaiser Sea Horse", saggi: "Saggi, o Clone das Sombras", judge: "Juiz", obelisk: "Obelisco, o Atormentador" }[cardId];
        if (curMonH && cardNameH && curMonH.name === cardNameH) { s.sp = Math.min(spCapOf(s), s.sp + 1); msgPre += "[Carta repetida — 1 Ponto de Habilidade devolvido!] "; }
      }
      if (canTribute) { monsters.forEach(m => { m.alive = false; if (u.stFlags?.kaibaS1) { u._kaibaGraveyard = u._kaibaGraveyard || []; if (u._kaibaGraveyard.length < 3) u._kaibaGraveyard.push(m.name); } }); u.av = Math.max(0.01, (u.av || 1) * 0.0); }
      const destroyOld = () => {
        const mons = s.heroes.filter(h => h.isSummon && h.kind === "monster" && h.ownerUid === u.uid && h.alive);
        const slotLimit = u.stFlags?.kaibaS3 ? 2 : 1;
        if (mons.length < slotLimit) return;
        const nonLegendH = mons.filter(m => !m.dragonLegendary);
        const old = nonLegendH[0];
        if (!old) return;
        if (old) {
          old.alive = false;
          if (u.stFlags?.kaibaS1) { u._kaibaGraveyard = u._kaibaGraveyard || []; if (u._kaibaGraveyard.length < 3) u._kaibaGraveyard.push(old.name); }
          if (u.stFlags?.kaibaT2) { u.energy = Math.min(u.energyMax, u.energy + 15); u.buffs.push({ stat: "atk", value: 20, pct: true, turns: 2, name: "Reciclagem Eficiente" }); }
          if (u.weapon?.buff?.kaibaWeapon) { u.energy = Math.min(u.energyMax, u.energy + 6); u._kaibaWpnNextBonus = true; }
        }
      };
      const summonCard = (name, avatar, mul, opts2) => {
        destroyOld();
        const mon = makeSummon(u, { uid: "S_" + u.uid + "_mon" + Math.floor(Math.random() * 1e6), name, avatar, kind: "monster", mul: mul * (chainX2 ? 2 : 1), spd: effStat(u, "spd"), atkMul: 1.2, hpMul: 0.001, life: Infinity });
        if (opts2?.taunt) mon.taunt = true;
        if (opts2?.bleedChance) mon.cardBleed = opts2.bleedChance;
        if (opts2?.onSummonEnergy) u.energy = Math.min(u.energyMax, u.energy + opts2.onSummonEnergy);
        s.heroes.push(mon);
        return mon;
      };
      let msg = "";
      if (cardId === "vorse") { summonCard("Vorse Raider", "👹", 380, { bleedChance: 0.5 }, "card_vorse"); msg = msgPre + "🎴 VORSE RAIDER! Monstro de impacto pesado (380% ATK), 50% de chance de Sangramento."; }
      else if (cardId === "kaiser") { summonCard("Kaiser Sea Horse", "🐴", 260, { onSummonEnergy: 20 }, "card_kaiser"); msg = msgPre + "🎴 KAISER SEA HORSE! Monstro invocado (260% ATK) — +20 de Energia instantânea."; }
      else if (cardId === "saggi") { summonCard("Saggi, o Clone das Sombras", "👤", 110, { taunt: true }, "card_saggi"); msg = msgPre + "🎴 SAGGI! Monstro de menor dano (110% ATK) mas provoca TODOS os inimigos por 2 rodadas."; }
      else if (cardId === "judge") { destroyOld(); const mon = makeSummon(u, { uid: "S_" + u.uid + "_mon" + Math.floor(Math.random() * 1e6), name: "Juiz", avatar: "⚖️", imgKey: "card_judge", kind: "monster", mul: 280 * (chainX2 ? 2 : 1), spd: effStat(u, "spd"), atkMul: 1.2, hpMul: 0.001, life: Infinity }); mon.judgeSplash = 140; s.heroes.push(mon); msg = msgPre + "🎴 JUIZ! Monstro de área (200% ATK no principal, 100% nos adjacentes)."; }
      else if (cardId === "obelisk") {
        destroyOld();
        let totOb = 0, purgeCount = 0;
        aliveEnemies(s).forEach(e => {
          if (u.stFlags?.kaibaS5 && e.debuffs.some(d => d.name === "Arena KaibaCorp")) { if (e.buffs.length) purgeCount += e.buffs.length; if (e.shield > 0) { purgeCount += 1; e.shield = 0; } e.buffs = []; }
          totOb += dealDamage(u, e, 750 * (chainX2 ? 2 : 1) * sMulK * (1 + purgeCount * 0.6), fx, { el: "Eletro", defPen: 100 }).dmg;
        });
        msg = msgPre + `🎴✨ OBELISCO, O ATORMENTADOR!!! Punho do Destino — ${totOb} de dano em TODOS os inimigos, ignorando 100% da DEF!${purgeCount ? ` [S5: purgou ${purgeCount} efeitos!]` : ""}`;
        if (u.stFlags?.kaibaT3) { aliveEnemies(s).forEach(e => { if (e._hasToughness && e.toughness > 0) { e.toughness = Math.max(0, e.toughness - 30); if (e.toughness <= 0) applyBreakEffect(u, e, "Eletro", fx); } }); msg += " [Rastro 3!]"; }
      }
      else if (cardId === "control") { const tgt = aliveEnemies(s)[Math.floor(Math.random() * aliveEnemies(s).length)]; if (tgt) { tgt.av = (tgt.av || 1) * (chainX2 ? 1.8 : 1.4); tgt.debuffs.push({ stat: "mark", value: 0, turns: 1, name: "Controlado" }); msg = msgPre + `🎴 CONTROLADOR DE INIMIGOS! ${tgt.name} atrasado em 40%.`; } }
      else if (cardId === "shrink") { const tgt = aliveEnemies(s).sort((a, b) => effStat(b, "atk") - effStat(a, "atk"))[0]; if (tgt) { const v = chainX2 ? 50 : 35; tgt.debuffs.push({ stat: "atk", value: -v, pct: true, turns: 2, name: "Encolher" }, { stat: "def", value: -v, pct: true, turns: 2, name: "Encolher" }); msg = msgPre + `🎴 ENCOLHER! ${tgt.name} perde ${v}% de ATK/DEF por 2 turnos.`; } }
      else if (cardId === "flute") { const mon = activeMonster(s, u.uid); if (mon) { mon.av = 0.01; mon.buffs.push({ stat: "critDmg", value: chainX2 ? 100 : 50, turns: 1, name: "Flauta" }); msg = msgPre + "🎴 A FLAUTA! O Monstro ativo avança e ganha CRIT DMG."; } else { msg = msgPre + "🎴 A Flauta não achou Dragão em campo — efeito perdido."; } }
      else if (cardId === "virus") { allies.forEach(a => { a._kaibaVirusTurns = 2; }); msg = msgPre + "🎴 VÍRUS ESMAGA-CARDS! Time protegido por 2 turnos."; }
      else if (cardId === "ring") { const tgt = aliveEnemies(s).sort((a, b) => a.hp - b.hp)[0]; if (tgt) { const rd = Math.round(tgt.maxHp * 0.25 * (chainX2 ? 2 : 1)); tgt.hp = Math.max(0, tgt.hp - rd); if (tgt.hp <= 0) tgt.alive = false; fx.push({ uid: tgt.uid, txt: String(rd), crit: true, id: Math.random(), el: "Chaos" }); const selfDmg = Math.round(u.hp * 0.05); u.hp = Math.max(1, u.hp - selfDmg); msg = msgPre + `🎴 ANEL DA DESTRUIÇÃO! ${rd} de Dano Verdadeiro. Kaiba sofre ${selfDmg} de contragolpe.`; } }
      if (u.weapon?.buff?.kaibaWeapon) {
        const monW = activeMonster(s, u.uid);
        if (monW) {
          if (u._kaibaWpnNextBonus) { monW.buffs.push({ stat: "critDmg", value: 30, turns: 2, name: "Nexo: Chegada" }); u._kaibaWpnNextBonus = false; }
          const stacks = monW.buffs.filter(b => b.name === "Soberania do Duelista").length;
          if (stacks < 3) monW.buffs.push({ stat: "dmgBonus", value: 16, turns: 2, name: "Soberania do Duelista" }, { stat: "defPen", value: 10, turns: 2, name: "Soberania do Duelista" });
        }
      }
      if (u.stFlags?.kaibaT1 && catOf(cardId) !== "monster") { const monT1 = activeMonster(s, u.uid); if (monT1) monT1.av = Math.max(0.01, (monT1.av || 1) * 0.78); }
      pushLog(s, msg); s = checkEnd(s); s.turn = null; return s;
    });
  }
  function resolveKaibaUlt(which) {
    setState((s0) => {
      let s = { ...s0, heroes: s0.heroes.map(cloneU), enemies: s0.enemies.map(cloneU), fx: [], choice: null };
      const u = s.heroes.find((h) => h.id === "kaiba" && h.alive); if (!u) { s.turn = null; return s; }
      const fx = s.fx, ampU = u.ampUlt || 1, ff = u.stFlags || {};
      const allies = s.heroes.filter((h) => h.alive);
      u.energy = Math.round(5 * (1 + (effStat(u, "energyRegen") || 0) / 100)); // reembolso HSR
      if (u.weapon?.id === "duelo_nexo") s.sp = Math.min(spCapOf(s), (s.sp || 0) + 1); // +1 PH ao time (arma)
      let msg = "";
      if (which === "obelisk") {
        if (!ff.kS6) s.heroes = s.heroes.filter((h) => !(h.isSummon && h.kind === "dragon" && h.ownerUid === u.uid)); // tributa os 3 dragões (S6 os mantém)
        s.summonFx = { kind: "obelisk", id: Math.random() };
        const en = aliveEnemies(s); let tot = 0, killedMain = false;
        const main = en.slice().sort((a, b) => b.hp - a.hp)[0];
        en.forEach((e) => { e.buffs = []; tot += dealDamage(u, e, 1200 * ampU * u.tUlt, fx, { breakW: 3, el: "Eletro", defPen: 20 }).dmg; });
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
        for (let b = 0; b < bursts; b++) { en.forEach((e) => { if (e.alive) ["Eletro", "Holy", "Fogo"].forEach((el) => { tot += dealDamage(ult, e, (850 / 3) * ampU / Math.max(1, en.length), fx, { breakW: 3, el, defPen: 50, pierceShield: true }).dmg; }); }); }
        if (ff.kcMonarch) { u.buffs.push({ stat: "critDmg", value: 40, pct: false, turns: life + 1, name: "Monarca" }); msg += " (Orgulho do Monarca: +40% Dano CRÍTICO!)"; }
        msg = `💥 KAIBA FUNDE OS 3 BLUE-EYES NO DRAGÃO BRANCO DEFINITIVO! RAJADA NEUTRÔNICA TRIPLA${bursts > 1 ? " (×2)" : ""} causa ${tot} de Dano Trimultielemental (Eletro+Holy+Fogo), ignorando 50% das resistências e perfurando escudos. A Fusão luta por ${life} turnos a 180 de Velocidade.` + msg;
      }
      if (ff.kS4) { applyBuff(allies, { critDmg: 35, all: true, turns: 3 }, u.name, fx, u); msg += " Decreto Soberano: +35% Dano CRÍTICO para o time por 3 turnos!"; }
      refreshKaibaBuffs(s);
      tickBuffs(u); u.av = 10000 / Math.max(1, effStat(u, "spd"));
      pushLog(s, msg); s = checkEnd(s); s.turn = null; return s;
    });
  }

  function resolveFrierenUlt(which) {
    setState((s0) => {
      let s = { ...s0, heroes: s0.heroes.map(cloneU), enemies: s0.enemies.map(cloneU), fx: [], choice: null };
      const u = s.heroes.find((h) => h.id === "frieren" && h.alive); if (!u) { s.turn = null; return s; }
      const fx = s.fx, sk = u.skill, allies = s.heroes.filter((h) => h.alive), enems = aliveEnemies(s), mainT = targetEnemy(s);
      const f = u.stFlags || {}, ampU = u.ampUlt || 1;
      const sMul = u.tUlt * ampU;
      const pts = u._frPoints || 0;
      u.energy = Math.round(5 * (1 + (effStat(u, "energyRegen") || 0) / 100));
      let msg = "";
      if (which === "zoltraak" && mainT) {
        const isChaosVirus = mainT.element === "Chaos" || mainT.element === "Virus";
        let origCR = null;
        if (isChaosVirus || f.frZoltraak) { origCR = u.base.critRate; u.base = { ...u.base, critRate: 200 }; }
        const defP = (isChaosVirus && f.frZoltraak) ? 100 : 100; // C6 sempre ignora 100% DEF
        const rz = dealDamage(u, mainT, (sk.ultMul || 500) * sMul, fx, { breakW: 3, el: "Holy", pierceShield: isChaosVirus, defPen: defP });
        if (origCR !== null) u.base.critRate = origCR;
        if (f.frC2 && enems.length > 1) enems.filter(e => e.uid !== mainT.uid && e.alive).forEach(e => dealDamage(u, e, (sk.ultMul || 500) * sMul * 0.5, fx, { breakW: 3, el: "Holy" }));
        if (!mainT.boss && mainT.hp / mainT.maxHp < 0.30) { mainT.hp = 0; mainT.alive = false; fx.push({ uid: mainT.uid, txt: "APAGADO!", crit: true, id: Math.random() }); }
        if (f.frC4) enems.forEach(e => { const exA = e.debuffs.find(d => d.name === "AuraOculta"); if (exA) { exA.value = -20; exA.turns = 3; } else e.debuffs.push({ stat: "def", value: -20, turns: 3, name: "AuraOculta" }); });
        msg = "✨ ZOLTRAAK [Escolha Milenar]! " + u.name + " dispara o feixe absoluto em " + mainT.name + " — " + rz.dmg + " de Dano Holy (ignora 100% DEF!)" + (rz.crit ? " CRÍTICO!" : "") + "!" + (f.frC2 ? " Refração em adjacentes!" : "");
      } else if (which === "reaction") {
        const dmgMul = 1 + pts * 0.3;
        u._frPoints = 0; u._frPointTypes = [];
        let tot3 = 0;
        enems.forEach(e => { const r = dealDamage(u, e, (sk.ultMul || 500) * sMul * dmgMul * 0.6, fx, { breakW: 3, el: "Holy" }); tot3 += r.dmg; if (pts >= 3) e.debuffs.push({ stat: "spd", value: -15, pct: true, turns: 2, name: "Nevasca" }); });
        if (u.weapon?.buff?.frTeamBonus) allies.forEach(a => a.buffs.push({ stat: "dmgBonus", value: 15, turns: 1, name: "CajadoReacao" }));
        msg = "⚗️ REAÇÃO DE CAMPO [Escolha Milenar]! " + u.name + " libera " + pts + " pontos de elemento — " + tot3 + " de dano em área (×" + dmgMul.toFixed(1) + ")!" + (pts >= 3 ? " Inimigos ficam lentos!" : "");
      } else {
        u._frPoints = Math.max(0, pts - 2);
        const healAmt = Math.round(0.25 * u.maxHp); // C6: cura 25% HP (melhorado de 20%)
        allies.forEach(a => { healUnit(a, healAmt, fx); a.debuffs = []; a.buffs.push({ stat: "dmgReduce", value: 15, turns: 3, name: "CampoFlores" }); });
        if (f.frFlowers) allies.forEach(a => { a.hp = Math.min(a.maxHp, a.hp + Math.round(a.maxHp * 0.15)); a.buffs.push({ stat: "dmgBonus", value: 10, turns: 2, name: "FloraEterna" }); });
        msg = "🌸 MAGIA DE FLORES [Escolha Milenar]! " + u.name + " faz nascer flores — o time é curado em " + healAmt + " (25% HP), debuffs removidos e +15% resistência por 3 turnos!";
      }
      if (f.setHorizonte4) {
        const extraBonus = Math.min(20, (u._frPoints || 0) * 5);
        allies.forEach(a => { a.buffs.push({ stat: "dmgBonus", value: 15 + extraBonus, turns: 2, name: "HorizonteUlt" }); a.buffs.push({ stat: "critDmg", value: 12, turns: 2, name: "HorizonteCrit" }); });
        msg += (extraBonus > 0 ? " [Além do Horizonte] +15%+" + extraBonus + "% Dano Bônus e +12% CRIT DMG ao time!" : " [Além do Horizonte] +15% Dano Bônus e +12% CRIT DMG ao time!");
      }
      tickBuffs(u); u.av = 10000 / Math.max(1, effStat(u, "spd"));
      pushLog(s, msg); s = checkEnd(s); s.turn = null; return s;
    });
  }

  function aguRevert(u, s, imperfect) {
    u.buffs = u.buffs.filter(b => !["Forma: Greymon", "Forma: MetalGreymon", "Forma: WarGreymon", "MODO X", "Overclocking"].includes(b.name));
    u.agForm = "agumon"; u.imgId = "agumon"; u.agModoX = 0; u.agBrave = 0; u.agTempForm = 0;
    u.maxHp = u._aguBaseMaxHp || u.maxHp; u.hp = Math.min(u.hp, u.maxHp);
    if (!u._aguBaseEnergyMax) u._aguBaseEnergyMax = u.energyMax;
    u.energyMax = u._aguBaseEnergyMax; u.energy = Math.min(u.energy, u.energyMax);
    if (imperfect) { u.hp = 1; u.agSP = 0; pushLog(s, "💔 A evolução instável colapsa — " + u.name + " regride com 1 de HP e 0 de TamerSP!"); }
  }
  function resolveAgumonEvolve(formId) {
    setState((s0) => {
      let s = { ...s0, heroes: s0.heroes.map(cloneU), enemies: s0.enemies.map(cloneU), fx: [], choice: null };
      const u = s.heroes.find(h => h.id === "agumon" && h.alive); if (!u) { s.turn = null; return s; }
      const F = AGU_FORMS[formId]; if (!F || !F.req) { s.turn = null; return s; }
      if ((u.agSP || 0) < F.req.sp) { pushLog(s, "🧬 TamerSP insuficiente para " + F.name + "."); s.turn = null; return s; }
      u.agSP -= F.req.sp;
      if (!u._aguBaseMaxHp) u._aguBaseMaxHp = u.maxHp;
      // limpa forma anterior
      u.buffs = u.buffs.filter(b => !["Forma: Greymon", "Forma: MetalGreymon", "Forma: WarGreymon", "MODO X"].includes(b.name));
      u.maxHp = u._aguBaseMaxHp; u.hp = Math.min(u.hp, u.maxHp);
      const heatMinX = (formId === "wargreymon" && u.stFlags?.aguC1) ? 75 : F.req.heatMin; // C1: Ignis-X Activation
      // C6: o Calor deixa de ser requisito de Digievolução — só o TamerSP importa
      const inWindow = u.stFlags?.aguC6 || ((u.agHeat || 0) >= heatMinX && (u.agHeat || 0) <= (formId === "wargreymon" ? 100 : F.req.heatMax) && (!F.req.needTrident || (u.agTrident || 0) > 0));
      u.agForm = formId; u.imgId = F.imgId; u.agBrave = 0;
      if (u.stFlags?.setAdapt4) { u.buffs = u.buffs.filter(b => b.name !== "Protocolo de Adaptação"); u.buffs.push({ stat: "defPen", value: 20, turns: 2, name: "Protocolo de Adaptação" }); u.buffs.push({ stat: "dmgBonus", value: 25, turns: 2, name: "Protocolo de Adaptação" }); }
      if (formId === "greymon") {
        u.buffs.push({ stat: "def", value: 100, pct: true, turns: 9999, name: "Forma: Greymon" });
        const hpGain = Math.round(u._aguBaseMaxHp * 0.6); u.maxHp = u._aguBaseMaxHp + hpGain; u.hp = Math.min(u.maxHp, u.hp + hpGain);
        pushLog(s, "🧬 AGUMON DIGIVOLVE PARA... GREYMON! (+100% DEF, +60% HP)"); 
      } else if (formId === "metalgreymon") {
        u.buffs.push({ stat: "atk", value: 100, pct: true, turns: 9999, name: "Forma: MetalGreymon" });
        u.buffs.push({ stat: "dmgBonus", value: 40, turns: 9999, name: "Forma: MetalGreymon" });
        pushLog(s, "🧬 GREYMON ULTRA DIGIVOLVE PARA... METALGREYMON! (+100% ATK, +40% de Dano de Fogo)");
      } else if (formId === "wargreymon") {
        u.buffs.push({ stat: "atk", value: 60, pct: true, turns: 9999, name: "Forma: WarGreymon" });
        // Forma: WarGreymon — +70% de HP Máximo e +70% de Dano Bônus
        const hpGainWG = Math.round(u._aguBaseMaxHp * 0.70); u.maxHp = u._aguBaseMaxHp + hpGainWG; u.hp = Math.min(u.maxHp, u.hp + hpGainWG);
        u.buffs.push({ stat: "dmgBonus", value: 90, turns: 9999, name: "Forma: WarGreymon" });
        if (!u._aguBaseEnergyMax) u._aguBaseEnergyMax = u.energyMax;
        u.energyMax = 250; // Gaia Force exige um núcleo de energia muito maior nesta forma
        const perfectSync = inWindow; // C6 já força inWindow=true acima, então o Modo X sempre ativa
        if (perfectSync) {
          u.agModoX = 2; u._aguXHeat = u.agHeat || 0; u.agHeat = 0; // T3: guarda o Calor do momento da evolução p/ escalar penetração
          u.buffs.push({ stat: "critDmg", value: 150, turns: 9999, name: "MODO X" });
          u.buffs.push({ stat: "spd", value: 60, pct: false, turns: 9999, name: "MODO X" });
          pushLog(s, "🧬⚡ SINCRONIA PERFEITA!!! WARGREYMON desperta no MODO X — +150% CRIT DMG, +60 VEL, núcleo resfriado a 0 por 2 rodadas!");
        } else {
          u.agTempForm = 1;
          pushLog(s, "⚠️ O Digivice REJEITA a sincronia... WarGreymon se mantém por pura força — a forma durará APENAS 1 TURNO antes do colapso!");
        }
      }
      // Evolução fora da janela térmica (Greymon/MetalGreymon): forma instável de 1 turno
      if ((formId === "greymon" || formId === "metalgreymon") && !inWindow && !u.stFlags?.aguC6) { u.agTempForm = 1; pushLog(s, "⚠️ Calor fora da janela (" + F.reqTxt + ") — a forma é INSTÁVEL e durará 1 turno!"); }
      s.turn = null; return s;
    });
  }
  function resolveAthenaUlt(chosenUid) {
    setState((s0) => {
      let s = { ...s0, heroes: s0.heroes.map(cloneU), enemies: s0.enemies.map(cloneU), fx: [], choice: null };
      const u = s.heroes.find((h) => h.id === "athena" && h.alive); if (!u) { s.turn = null; return s; }
      const fx = s.fx, f = u.stFlags || {};
      const allies = s.heroes.filter((h) => h.alive);
      const _wasFree = f.athC6 && u.energy < u.energyMax; // recast gratuito do C6 (não zera energia)
      if (!_wasFree) u.energy = Math.round(5 * (1 + (effStat(u, "energyRegen") || 0) / 100));
      if (f.athC6) u._athC6Cd = 2; // próxima reabertura gratuita em 2 turnos de Athena
      const houseTarget = allies.find((a) => a.uid === chosenUid) || allies.filter(a => a.alive).sort((a, b) => (b.atk || 0) - (a.atk || 0))[0] || u;
      u.athEnhanced = true; u._athEnhancedTurns = f.athC6 ? 2 : 1; // Modo Aprimorado dura 1 turno (2 com C6)
      const houseTurns = f.athC6 ? 9999 : 3; // C6: auras permanentes
      allies.forEach((a) => {
        const isGuardian = a.uid === houseTarget.uid;
        const mult = (isGuardian && f.athC1) ? 2 : 1;
        a.buffs = a.buffs.filter((b) => b.name !== "Bênção do Olimpo");
        a.buffs.push({ stat: "spd",      value: 30 * mult, pct: true, turns: houseTurns, name: "Bênção do Olimpo" });
        a.buffs.push({ stat: "def",      value: 30 * mult, pct: true, turns: houseTurns, name: "Bênção do Olimpo" });
        a.buffs.push({ stat: "critRate", value: 20 * mult,             turns: houseTurns, name: "Bênção do Olimpo" });
        a.buffs.push({ stat: "dmgBonus", value: 20 * mult,             turns: houseTurns, name: "Bênção do Olimpo" });
        a.buffs.push({ stat: "critDmg",  value: 25 * mult,             turns: houseTurns, name: "Bênção do Olimpo" });
      });
      if (f.athIII && !u._athIIIUsed) { houseTarget.av = 0; u._athIIIUsed = true; }
      s._athHouseActive = true; // flag para C2/C4
      const _guardianLine = f.athC1
        ? ` ${houseTarget.name} é o(a) GUARDIÃO(Ã) e recebe tudo em DOBRO: +60% VEL, +60% DEF, +40% CRIT, +40% Dano, +50% CRIT DMG!`
        : ` ${houseTarget.name} é o(a) Guardião(ã) das Sete Casas!`;
      let msg = `🕊️✨ JULGAMENTO DO OLIMPO! ${u.name} invoca as Sete Casas — todo o time recebe +30% VEL, +30% DEF, +20% CRIT, +20% Dano e +25% CRIT DMG${f.athC6 ? " PERMANENTES (C6!)" : ` por ${houseTurns} turnos`}! ${u.name} entra no Modo Aprimorado por ${u._athEnhancedTurns} turnos.${_guardianLine}`;
      tickBuffs(u); u.av = 10000 / Math.max(1, effStat(u, "spd"));
      pushLog(s, msg); s = checkEnd(s); s.turn = null; return s;
    });
  }

  function resolveUrarakaSkill(chosenUid) {
    setState((s0) => {
      let s = { ...s0, heroes: s0.heroes.map(cloneU), enemies: s0.enemies.map(cloneU), fx: [], choice: null };
      const u = s.heroes.find((h) => h.id === "uraraka" && h.alive); if (!u) { s.turn = null; return s; }
      const fx = s.fx, sk = u.skill, f = u.stFlags || {};
      const allies = s.heroes.filter((h) => h.alive);
      s.sp -= 1; u.energy = Math.min(u.energyMax, u.energy + Math.round((sk.enSkill || 22) * (1 + (effStat(u, "energyRegen") || 0) / 100)));
      const buffTarget = allies.find((a) => a.uid === chosenUid) || allies.filter(a => a.uid !== u.uid && !a.isSummon)[0] || u;
      const atkPct = f.uraC1 ? 25 : 20;
      // Não acumula: remove qualquer "Zero Gravity" ativo no alvo antes de aplicar
      buffTarget.buffs = buffTarget.buffs.filter((b) => b.name !== "Zero Gravity");
      applyBuff([buffTarget], { atk: atkPct, spd: 10, turns: 2 }, "Zero Gravity", fx, u);
      if (f.uraDelayEnemies) buffTarget._uraDelayFlag = true; // Rastro: inimigos que atacarem este aliado são atrasados 8%
      let msg = `🎈 ${u.name} usa Zero Gravity em ${buffTarget.name} — +${atkPct}% ATK e +10 VEL por 2 turnos!`;
      if (f.uraC6 && buffTarget.energyMax) { buffTarget.energy = Math.min(buffTarget.energyMax, buffTarget.energy + 10); msg += ` [C6] +10 de Energia para ${buffTarget.name}!`; }
      if (f.uraC2) { const _uraSh = capShieldAdd(u, Math.round(u.maxHp * 0.10)); u.shield = (u.shield || 0) + _uraSh; msg += ` Escudo Orbital: +${_uraSh} de escudo.`; }
      tickBuffs(u); u.av = 10000 / Math.max(1, effStat(u, "spd"));
      pushLog(s, msg); s = checkEnd(s); s.turn = null; return s;
    });
  }

  function autoAct(uid) {
    const _now = Date.now();
    if (_now - actionLockRef.current < 400) return; // trava contra disparo duplicado (ex: invocação atacando 2x)
    actionLockRef.current = _now;
    setState((s0) => {
      let s = { ...s0, heroes: s0.heroes.map(cloneU), enemies: s0.enemies.map(cloneU), fx: [] };
      const u = findUnit(s, uid); if (!u || !u.alive) { s.turn = null; return s; }
      tickDots(u, s.fx);
      if ((u._kaibaVirusTurns || 0) > 0) u._kaibaVirusTurns -= 1; // Vírus Esmaga-Cards (Kaiba): decai no turno de cada aliado protegido
      if (!u.alive) { pushLog(s, `${u.name} sucumbe ao dano contínuo!`); s = checkEnd(s); s.turn = null; return s; }
      refreshKaibaBuffs(s);
      const fx = s.fx, sk = u.skill || {}, allies = s.heroes.filter((h) => h.alive), enemies = aliveEnemies(s);
      let msg = "";
      if (u.isSummon) {
        // Servos de um Rei (4pç): a Invocação ganha 1 acúmulo de Sintonia Sincrônica ao agir (máx 2)
        let servosDefPen = 0;
        if (u._hasServos4) {
          const stacks = u.buffs.filter(b => b.name === "Sintonia Sincrônica").length;
          if (stacks < 2) u.buffs.push({ stat: "critDmg", value: 20, turns: 2, name: "Sintonia Sincrônica" });
          const newStacks = u.buffs.filter(b => b.name === "Sintonia Sincrônica").length;
          if (newStacks >= 2) servosDefPen = 16; // no limite máximo de acúmulos, ignora 16% da DEF automaticamente
        }
        const tgt = enemies.slice().sort((a, b) => a.hp - b.hp)[0];
        const isDragon = u.kind === "dragon";
        const aoeNow = u.firstHit && isDragon; // dragão dá dano em ÁREA no 1º golpe; depois só single-target
        if (tgt) {
          const op = { pierceShield: !!u.pierce, defPen: servosDefPen };
          const hitList = aoeNow ? enemies : [tgt];
          let tot = 0;
          hitList.forEach((e) => {
            if (!e.alive) return;
            if (u.elements && u.elements.length > 1) u.elements.forEach((el) => { tot += dealDamage(u, e, u.mul, fx, { breakW: 1, ...op, el }).dmg; });
            else tot += dealDamage(u, e, u.mul, fx, { breakW: 1, ...op, el: u.element }).dmg;
            if (u.dragonVuln && e.alive) e.debuffs.push({ stat: "vuln", value: 15, turns: 2, name: "Vuln" });
            // Carta: Vorse Raider — 50% de chance de aplicar Sangramento
            if (u.cardBleed && e.alive && Math.random() < u.cardBleed) applyDot([e], { type: "bleed", mul: 30, turns: 3 }, u, fx);
          });
          // Carta: Juiz — golpe em área, 100% do mul nos alvos além do principal
          if (u.judgeSplash) { enemies.filter(e => e.alive && e.uid !== tgt.uid).forEach(e => { tot += dealDamage(u, e, u.judgeSplash, fx, { breakW: 1, el: u.element, defPen: servosDefPen }).dmg; }); }
          // Dragão Branco de Olhos Azuis (Suprema): Rajada de Relâmpagos — dano reduzido nos adjacentes + remove buffs positivos
          if (u.dragonSplash) {
            enemies.filter(e => e.alive && e.uid !== tgt.uid).forEach(e => { tot += dealDamage(u, e, u.dragonSplash, fx, { breakW: 1, el: u.element, defPen: servosDefPen }).dmg; if (u.removeBuffsOnHit) e.buffs = []; });
            if (u.removeBuffsOnHit && tgt.alive) tgt.buffs = [];
          }
          msg = `${u.name} ${aoeNow ? "irrompe em ÁREA" : "investe em " + tgt.name} — ${tot}${u.pierce ? " (perfura escudos)" : ""}${servosDefPen ? " (Sintonia Sincrônica: ignora " + servosDefPen + "% da DEF)" : ""}.`;
          // a investida do dragão recarrega o Mestre dos Dragões
          if (isDragon || u.kind === "monster") { const owner = s.heroes.find((h) => h.uid === u.ownerUid && h.alive); if (owner && owner.energyMax) owner.energy = Math.min(owner.energyMax, owner.energy + Math.round(5 * (1 + (effStat(owner, "energyRegen") || 0) / 100))); }
        }
        if (u.firstHit) u.firstHit = false;
        if (isFinite(u.life)) { u.life -= 1; if (u.life <= 0) { u.alive = false; msg += ` ${u.name} se dissipa.`; } }
      } else {
        const role = u.roleKey;
        if (role === "healer" && (sk.heal || sk.ultHeal)) {
          const tgt = allies.slice().sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp)[0];
          const h = sk.heal || sk.ultHeal || { mul: 120, flat: 600 }; // fallback aumentado
          const _tHeal = sk.ultHeal && !sk.heal ? u.tUlt : u.tSkill;
          const _athSpd = u.weapon?.buff?.spdThreshold;
          const _athSpdActive = _athSpd && effStat(u, "spd") > _athSpd.spd;
          const _spdHealBonus = _athSpdActive ? (1 + _athSpd.healBonus / 100) : 1;
          const _autoHealBoost = 1.35; // boost global para curandeiros automáticos
          const _rawHealAmt = Math.round((effStat(u, "atk") * h.mul / 100 + h.flat) * _tHeal * _spdHealBonus * _autoHealBoost);
          const _priorHp = tgt.hp;
          healUnit(tgt, _rawHealAmt, fx);
          // Cetro: excesso de cura vira escudo quando VEL > 140
          if (_athSpdActive && u.weapon?.buff?.spdThreshold?.overHealShield) {
            const _overHeal = Math.max(0, _rawHealAmt - (tgt.maxHp - _priorHp));
            if (_overHeal > 0) { const _osh = capShieldAdd(tgt, _overHeal); tgt.shield = (tgt.shield || 0) + _osh; if (_osh > 0) fx.push({ uid: tgt.uid, txt: "🛡️+" + _osh, heal: true, id: Math.random() }); }
          }
          msg = `${u.name} cura ${tgt.name}${_athSpdActive ? " ✨(Fluxo de Atena ativo)" : ""}`;
          if (u.weapon?.buff?.athWeapon && u.weapon.buff.onSkill) {
            const _onSk = u.weapon.buff.onSkill;
            const _zodSt = tgt.buffs.filter(b => b.name === "ZodiacalDmg").length;
            if (_zodSt < (_onSk.maxStacks || 3)) tgt.buffs.push({ stat: "critDmg", value: _onSk.critDmgPerStack || 12, pct: false, turns: 9999, name: "ZodiacalDmg" });
            const _graceSt = u.buffs.filter(b => b.name === "GraçaOlimpo").length;
            if (_graceSt < (_onSk.maxAtkStacks || 3)) u.buffs.push({ stat: "atk", value: _onSk.atkPerStack || 400, pct: false, turns: 9999, name: "GraçaOlimpo" });
            msg += ` [Cetro: +${_onSk.critDmgPerStack}% CRIT em ${tgt.name}, +${_onSk.atkPerStack} ATQ]`;
          }
        }
        else if (role === "buffer" && sk.skillBuff) { applyBuff(allies, sk.skillBuff, u.name, fx, u); msg = `${u.name} fortalece o time`; }
        else if (role === "shield" && sk.shield) {
          const shBa = 1 + ((u.weapon?.shieldBonus || 0) + (f.setMuralha2 ? 30 : 0)) / 100;
          const shVal = Math.round((effStat(u, "def") * (sk.shield.defMul / 100) + sk.shield.flat) * shBa * (u.tSkill || 1));
          if (u.stFlags?.kirC1) {
            allies.forEach((a) => { const _sv = a.uid === u.uid ? shVal : Math.round(shVal * 0.80); a.shield = (a.shield || 0) + capShieldAdd(a, _sv); });
            msg = `${u.name} escuda todo o time`;
          } else {
            const tgt = allies.slice().sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp)[0];
            tgt.shield += capShieldAdd(tgt, shVal);
            msg = `${u.name} escuda ${tgt.name}`;
          }
        }
        else if (role === "debuffer" && sk.skillDebuff && enemies[0]) { applyDebuff([enemies[0]], sk.skillDebuff, 0, u); if (sk.skillDot) applyDot([enemies[0]], sk.skillDot, u, fx); if (sk.skillMul) dealDamage(u, enemies[0], sk.skillMul, fx); msg = `${u.name} enfraquece o inimigo`; }
        else { const tgt = enemies.slice().sort((a, b) => b.hp - a.hp)[0]; if (tgt) { const full = u.energyMax && u.energy >= u.energyMax; if (full && sk.ultMul) { u.energy = 0; if (sk.ultAoe) enemies.forEach((e) => dealDamage(u, e, sk.ultMul, fx)); else dealDamage(u, tgt, sk.ultMul, fx); msg = `💥 ${u.name} usa Ultimate!`; } else { const m = sk.skillMul || sk.basicMul || 100; if (sk.aoe && sk.skillMul) enemies.forEach((e) => dealDamage(u, e, m, fx)); else dealDamage(u, tgt, m, fx); if (sk.skillDot) applyDot(sk.aoe ? enemies : [tgt], sk.skillDot, u, fx); u.energy = Math.min(u.energyMax, u.energy + 22); msg = `${u.name} ataca ${tgt.name}`; } } }
      }
      tickBuffs(u); u.av = 10000 / Math.max(1, effStat(u, "spd"));
      s.hitFx = { el: u.element, big: !!(u.elements && u.elements.length > 1), support: !fx.some((x) => !x.heal && !x.dot), id: Math.random() };
      pushLog(s, msg); s = checkEnd(s); s.turn = null; return s;
    });
  }

  function enemyAct() {
    const _now = Date.now();
    if (_now - actionLockRef.current < 400) return; // trava contra disparo duplicado
    actionLockRef.current = _now;
    setState((s0) => {
      let s = { ...s0, heroes: s0.heroes.map(cloneU), enemies: s0.enemies.map(cloneU), fx: [] };
      const u = findUnit(s, current.uid); if (!u || !u.alive) { s.turn = null; return s; }
      tickDots(u, s.fx, s.heroes.filter((h) => h.alive));
      if (!u.alive) { pushLog(s, `${u.name} sucumbe ao dano contínuo!`); s = checkEnd(s); s.turn = null; return s; }
      // Perfuração: se a barra foi quebrada, ela se regenera no início do próprio turno natural do inimigo
      if (u._broken && u._hasToughness) { u.toughness = u.maxToughness; u._broken = false; s.fx.push({ uid: u.uid, txt: "🛡️ Resistência restaurada", heal: true, id: Math.random() }); }
      // Colapso Entrópico (Perfuração Chaos): a marca explode no início do turno do inimigo, escalando com hits sofridos
      { const chaosMark = u.debuffs && u.debuffs.find(d => d.name === "Colapso Entrópico");
        if (chaosMark && u.alive) {
          const chaosDmg = Math.max(1, Math.round((u._chaosBaseAtk || 500) * 1.4 * (1 + (u._chaosHits || 0) * 0.15) * (1 + (u._chaosBE || 0) / 100)));
          u.hp = Math.max(0, u.hp - chaosDmg); if (u.hp <= 0) u.alive = false;
          s.fx.push({ uid: u.uid, txt: "💥 " + chaosDmg, crit: true, id: Math.random(), el: "Chaos" });
          pushLog(s, "💥 Colapso Entrópico explode em " + u.name + " — " + chaosDmg + " de Dano Chaos (amplificado por " + (u._chaosHits || 0) + " hits sofridos)!");
          u.debuffs = u.debuffs.filter(d => d.name !== "Colapso Entrópico"); u._chaosHits = 0;
          if (!u.alive) { s = checkEnd(s); s.turn = null; return s; }
        } }
      const fx = s.fx; u.actCount++;
      refreshKaibaBuffs(s);
      // E6 Wonder of You: Julgamento da Calamidade dispara ANTES de toda ação inimiga
      if (s._wooJudgment) {
        const wooH = s.heroes.find(h => h.uid === s._wooJudgment.uid && h.alive);
        if (wooH) {
          const jDmg = Math.round(effStat(wooH, "atk") * 6.5);
          u.hp = u.boss ? Math.max(1, u.hp - jDmg) : Math.max(0, u.hp - jDmg);
          if (!u.boss && u.hp <= 0) u.alive = false;
          fx.push({ uid: u.uid, txt: jDmg + "!", crit: true, el: "Chaos", id: Math.random() });
          u.av = (u.av || 1000) * 1.4; // atraso 40%
          pushLog(s, `☠️ JULGAMENTO DA CALAMIDADE recai sobre ${u.name}! ${jDmg} de Dano Quântico (E6 WoY) + atraso 40%!`);
          s = checkEnd(s); if (s.over) { s.turn = null; return s; }
        } else { s._wooJudgment = null; } // WoY derrotada — desativa
      }
      const allAllies = s.heroes.filter((h) => h.alive);
      const realHeroes = allAllies.filter((h) => !h.isSummon);
      const targetable = realHeroes.length ? realHeroes : allAllies;
      const enraged = u.boss && u.hp / u.maxHp < 0.4;
      const rage = enraged ? 1.25 : 1;
      const braveTank = allAllies.find((h) => h.id === "agumon" && (h.agBrave || 0) > 0 && h.alive);
      const taunter = braveTank || allAllies.find((h) => (h.skill?.taunt || h.taunt) && h.alive);
      let msg = "";

      const pickTarget = () => {
        if (taunter) return taunter;
        if (!targetable.length) return null; // robustez: sem alvo vivo, o inimigo simplesmente não ataca
        // 25% por membro vivo — distribuição igual, sem preferência por healer ou carry
        return targetable[Math.floor(Math.random() * targetable.length)];
      };

      // Tower Boss special mechanics
      if (u.alive && u.boss && u.bossKind === "aizen") {
        const hpPct = u.hp / u.maxHp;
        if (!u.aiBankai && hpPct <= 0.70) {
          u.aiBankai = true;
          u.hp = Math.min(u.maxHp, u.hp + Math.round(u.maxHp * 0.15));
          u.base = { ...u.base, atk: Math.round(u.base.atk * 1.4), def: Math.round(u.base.def * 1.5) };
          allAllies.forEach(h => h.debuffs.push({ stat: "missChance", value: 35, turns: 2, name: "Ilusão Perfeita" }));
          pushLog(s, `🌌 AIZEN — BANKAI: Kyōka Suigetsu! Restaura 15% HP, ATK×1.4, DEF×1.5. Ilusão Perfeita: chance de miss +35% no time por 2 turnos!`);
        }
        if (!u.aiTranscend && hpPct <= 0.30) {
          u.aiTranscend = true;
          u.res = [...(u.res || []), "Vento", "Glacial"];
          u.base.spd = Math.round(u.base.spd * 1.3);
          allAllies.forEach(h => { h.debuffs.push({ stat: "def", value: -25, pct: true, turns: 3, name: "Transcendência" }); h.energy = Math.max(0, (h.energy || 0) - 20); });
          pushLog(s, `✨ AIZEN — TRANSCENDÊNCIA! VEL×1.3, +RES Vento/Glacial. Time: DEF -25% por 3 turnos e perde 20 de Energia!`);
        }
        // Kurohitsugi: a cada 4 ações no Bankai
        if (u.aiBankai && u.actCount > 0 && u.actCount % 4 === 0) {
          let tot = 0;
          allAllies.forEach(h => { tot += dealDamage(u, h, 115 * rage, fx, { el: "Holy" }).dmg; h.debuffs.push({ stat: "spd", value: -15, pct: true, turns: 2, name: "Kurohitsugi" }); });
          pushLog(s, `⬛ KUROHITSUGI! ${u.name} encerra o time no caixão negro — ${tot} Dano Holy em área + VEL -15% por 2 turnos!`); s = checkEnd(s); s.turn = null; return s;
        }
      }
      if (u.alive && u.boss && u.bossKind === "sukuna") {
        const hpPct = u.hp / u.maxHp;
        if (!u.suRCT && hpPct <= 0.50) {
          u.suRCT = true;
          const heal = Math.round(u.maxHp * 0.20); u.hp = Math.min(u.maxHp, u.hp + heal);
          const t1 = pickTarget();
          if (t1) { dealDamage(u, t1, 160 * rage, fx, {}); t1.debuffs.push({ stat: "def", value: -35, pct: true, turns: 3, name: "Desmembramento" }); }
          pushLog(s, `🩸 SUKUNA — TÉCNICA CURSISTA REVERSA! Restaura ${heal} HP. DESMEMBRAMENTO em ${t1?.name || "alvo"}: DEF -35% por 3 turnos!`);
        }
        if (!u.su10shadows && hpPct <= 0.25) {
          u.su10shadows = true;
          u.base = { ...u.base, atk: Math.round(u.base.atk * 1.6), def: Math.round(u.base.def * 1.3) };
          allAllies.forEach(h => h.debuffs.push({ stat: "vuln", value: 25, turns: 99, name: "10 Sombras" }));
          pushLog(s, `👁️ SUKUNA — 10 SOMBRAS MALDITAS! ATK×1.6, DEF×1.3. Time: Maldição Permanente +25% dano recebido!`);
        }
        // Domínio Expandido a cada 4 ações
        if (u.actCount % 4 === 0 && u.actCount > 0) {
          allAllies.forEach(h => { h.debuffs.push({ stat: "vuln", value: 30, turns: 3, name: "Domínio" }); h.debuffs.push({ stat: "def", value: -30, pct: true, turns: 3, name: "Malrep" }); });
          let tot2 = 0; allAllies.forEach(h => { tot2 += dealDamage(u, h, 90 * rage, fx).dmg; });
          pushLog(s, `🔴 DOMÍNIO EXPANDIDO! ${tot2} Dano Chaos em área + 30% VULN + DEF -30% por 3 turnos!`); s = checkEnd(s); s.turn = null; return s;
        }
        // Hollow Purple a cada 7 ações
        if (u.actCount % 7 === 0 && u.actCount > 0) {
          const mainTgt = pickTarget();
          if (mainTgt) {
            const hpDmg = Math.round(mainTgt.maxHp * 0.45);
            mainTgt.hp = Math.max(mainTgt.boss ? 1 : 0, mainTgt.hp - hpDmg);
            if (!mainTgt.boss && mainTgt.hp <= 0) mainTgt.alive = false;
            fx.push({ uid: mainTgt.uid, txt: "HOLLOW PURPLE!", crit: true, el: "Chaos", id: Math.random() });
            mainTgt.debuffs.push({ stat: "atk", value: -40, pct: true, turns: 2, name: "Desintegração" });
            pushLog(s, `💜 HOLLOW PURPLE! ${u.name} aniquila ${mainTgt.name} — ${hpDmg} de dano absoluto (45% HP máx) + ATK -40% por 2 turnos!`);
            s = checkEnd(s); s.turn = null; return s;
          }
        }
      }
      if (u.alive && u.boss && u.bossKind === "godkaiba") {
        const hpPct = u.hp / u.maxHp;
        if (!u.gkSlifer && hpPct <= 0.75) {
          u.gkSlifer = true;
          u.base = { ...u.base, atk: Math.round(u.base.atk * 1.15), spd: Math.round(u.base.spd * 1.1) };
          pushLog(s, `🐉 GOD KAIBA invoca o DRAGÃO DO TROVÃO! ATK×1.15, VEL×1.1. A batalha acelera!`);
        }
        if (!u.gkObelisco && hpPct <= 0.50) {
          u.gkObelisco = true;
          u.base = { ...u.base, atk: Math.round(u.base.atk * 1.35), def: Math.round(u.base.def * 1.3) };
          u.res = [...(u.res || []), "Holy"];
          u.shield = (u.shield || 0) + Math.round(u.maxHp * 0.25);
          allAllies.forEach(h => h.debuffs.push({ stat: "vuln", value: 20, turns: 99, name: "Radiação Obelisco" }));
          pushLog(s, `⚡ GOD KAIBA — FASE DO OBELISCO! ATK×1.35, DEF×1.3, Escudo +25% HP, resiste Holy. Time: +20% dano recebido permanente!`);
        }
        // Punho do Destino a cada 3 ações
        if (u.actCount % 3 === 0 && u.actCount > 0) {
          let tot2 = 0; allAllies.forEach(h => { tot2 += dealDamage(u, h, 105 * rage, fx, { el: "Eletro" }).dmg; h.debuffs.push({ stat: "atk", value: -20, pct: true, turns: 2, name: "Supressão" }); });
          pushLog(s, `⚡ PUNHO DO DESTINO! ${tot2} Dano Eletro em área + ATK -20% por 2 turnos!`); s = checkEnd(s); s.turn = null; return s;
        }
        // Raio Oblíquo a cada 6 ações
        if (u.actCount % 6 === 0 && u.actCount > 0) {
          const hvy = allAllies.slice().sort((a,b) => effStat(b,"atk")-effStat(a,"atk"))[0];
          if (hvy) { const r1 = dealDamage(u, hvy, 155 * rage, fx, { el:"Eletro", defPen:25 }); pushLog(s, `⚡ RAIO OBLÍQUO! ${u.name} foca ${hvy.name} com raio de alta tensão — ${r1.dmg} (ignora 25% DEF)!`); s = checkEnd(s); s.turn = null; return s; }
        }
      }
      // BOSS RUSH MECHANICS
      if (u.alive && u.boss && u.bossKind === "byakuya") {
        const bankai = u.hp / u.maxHp < 0.5;
        // Fase 3: abaixo de 20% HP — Dispersão Final
        if (!u._byFinalPhase && u.hp / u.maxHp < 0.20) {
          u._byFinalPhase = true;
          u.base = { ...u.base, atk: Math.round(u.base.atk * 1.35) };
          u.res = [...(u.res || []), "Eletro"];
          pushLog(s, "🌸 BYAKUYA — DISPERSÃO FINAL! As pétalas de gelo se tornam poeira de diamante. ATK×1.35, resiste Eletro!");
        }
        if (u.actCount % 3 === 0 && u.actCount > 0) {
          // Senbonzakura consome Marcas de Pétala acumuladas nos alvos
          let tot = 0;
          allAllies.forEach(function(h) {
            const petalStacks = (h._byPetal || 0);
            const hasBleed = (h.dots||[]).some(function(d){return d.type==="bleed";});
            const petalBonus = 1 + 0.25 * petalStacks;
            const mul = 130 * rage * (bankai ? 1.35 : 1) * (hasBleed ? 1.3 : 1) * petalBonus;
            tot += dealDamage(u, h, mul, fx, { el: "Holy" }).dmg;
            if (bankai && h.alive) h.debuffs.push({ stat: "def", value: -20, pct: true, turns: 2, name: "Petala" });
            h._byPetal = 0; // consome as marcas
          });
          msg = "🌸 SENBONZAKURA KAGEYOSHI! " + u.name + " desencadeia mil pétalas — " + tot + " de dano total" + (bankai ? " (BANKAI!)" : "") + "! Marcas consumidas!";
        } else if (!msg) {
          const t = pickTarget();
          if (t) {
            const r = dealDamage(u, t, 110 * rage, fx, { el: "Holy" });
            t._byPetal = Math.min(3, (t._byPetal || 0) + 1); // aplica Marca de Pétala
            if (bankai && t.alive) t.dots.push({ type: "bleed", dmg: Math.round(effStat(u, "atk") * 0.18), turns: 2 });
            msg = u.name + " marca " + t.name + " com uma Pétala (" + (t._byPetal) + "/3) — " + r.dmg + (r.crit ? " CRÍTICO!" : "") + (bankai ? " [Sangramento]" : "") + ".";
          }
        }
      } else if (u.alive && u.boss && u.bossKind === "espiral_lord") {
        // ── Mecânica 1: Escudo Selado (75% e 40% de HP) ──
        const hpPctEsp = u.hp / u.maxHp;
        if (!u._espShield1 && hpPctEsp <= 0.75) {
          u._espShield1 = true; u._espShieldUp = true;
          u.shield = (u.shield || 0) + Math.round(u.maxHp * 0.25);
          pushLog(s, "🔮 ESCUDO SELADO! O Soberano da Espiral se envolve numa barreira arcana — ele NÃO PODE ATACAR enquanto o escudo existir. Destruam-no: ao quebrar, ele perde 15% do HP máximo!");
        }
        if (!u._espShield2 && hpPctEsp <= 0.40) {
          u._espShield2 = true; u._espShieldUp = true;
          u.shield = (u.shield || 0) + Math.round(u.maxHp * 0.25);
          pushLog(s, "🔮 SEGUNDO ESCUDO SELADO! A barreira arcana retorna — quebrem-na para arrancar mais 15% do HP do Soberano!");
        }
        // Escudo quebrado → perde 15% do HP máximo
        if (u._espShieldUp && (u.shield || 0) <= 0) {
          u._espShieldUp = false;
          const loss = Math.round(u.maxHp * 0.15);
          u.hp = Math.max(1, u.hp - loss);
          fx.push({ uid: u.uid, txt: String(loss) + "!", crit: true, id: Math.random(), el: "Chaos" });
          pushLog(s, "💥 O ESCUDO SELADO É DESTRUÍDO! A energia contida explode para dentro — o Soberano perde " + loss + " de HP (15% do máximo)!");
        }
        // Com escudo ativo: não ataca, apenas canaliza
        if (u._espShieldUp && (u.shield || 0) > 0) {
          msg = "🔮 O Soberano da Espiral canaliza energia dentro do Escudo Selado (" + u.shield + ") — incapaz de atacar!";
        } else {
          // ── Mecânica 2: Roleta das Correntes (a cada 5 ações) ──
          if (u.actCount % 5 === 0 && u.actCount > 0) {
            const chainables = allAllies.filter(h => h.alive && !h.isSummon && !(h.debuffs || []).some(d => d.name === "Correntes da Espiral"));
            if (chainables.length) {
              const victim = chainables[Math.floor(Math.random() * chainables.length)];
              victim.debuffs.push({ stat: "mark", value: 0, turns: 2, name: "Correntes da Espiral" });
              victim.av = (victim.av || 1) + 2 * (10000 / Math.max(1, effStat(victim, "spd"))); // atrasa ~2 turnos
              s.espRoulette = { targetUid: victim.uid, id: Math.random() };
              pushLog(s, "⛓️ ROLETA DAS CORRENTES! A roleta gira sobre a equipe... e para em " + victim.name + "! Correntes espirais o(a) prendem — sem agir por 2 turnos!");
              s = checkEnd(s); s.turn = null; return s;
            }
          }
          // Ataque padrão pesado
          if (u.actCount % 3 === 0 && u.actCount > 0) {
            let totEsp = 0; allAllies.forEach(h => { totEsp += dealDamage(u, h, 95 * rage, fx, { el: u.element }).dmg; if (h.alive) applyDot([h], { type: "aero", mul: 16, turns: 3 }, u, fx); });
            msg = "🌀 COLAPSO DA ESPIRAL! O Soberano varre a arena — " + totEsp + " de dano em área + 1 acúmulo de Aero Sunder em todos!";
          } else if (!msg) {
            const t = pickTarget();
            if (t) { const r = dealDamage(u, t, 125 * rage, fx, { el: u.element }); msg = u.name + " esmaga " + t.name + " — " + r.dmg + (r.crit ? " (CRÍTICO!)" : "") + "."; }
          }
        }
      } else if (u.alive && u.boss && (u.bossKind === "frieren" || u.bossKind === "frieren_boss")) {
        if (!u.counterSpell) u.counterSpell = 0;
        u.counterSpell += 1;
        if (u.counterSpell >= 3) {
          u.counterSpell = 0;
          const t = pickTarget();
          if (t) {
            // Talento da Athena (Eco da Justiça): imune a Controle de Grupo enquanto as 7 Casas estiverem ativas
            if (t.id === "athena" && s._athHouseActive) { pushLog(s, "✟ Resistência das Casas! " + t.name + " é IMUNE ao Contra-Feitiço enquanto as 7 Casas estiverem ativas!"); }
            else if (t.buffs.some(b => b.name === "Blindagem de Dados")) { t.buffs = t.buffs.filter(b => b.name !== "Blindagem de Dados"); pushLog(s, "🌌 BLINDAGEM DE DADOS! " + t.name + " absorve o Contra-Feitiço e permanece livre!"); }
            else if (t.id === "shorekeeper" && t.stFlags?.shkT1 && (t._domainStage || 0) > 0) { pushLog(s, "🌌 Criptografia de Sobrevivência! Shorekeeper é imune a atrasos de ação enquanto o Estelarador estiver ativo!"); }
            else { t.debuffs.push({ stat: "spd", value: -9999, pct: false, turns: 1, name: "Paralisia" }); pushLog(s, "CONTRA-FEITCO! " + t.name + " esta paralisado por 1 turno!"); }
          }
        }
        if (!u._frierenForbidden && u.hp / u.maxHp < 0.30) {
          u._frierenForbidden = true;
          u._frManaPool = 80000; // Reserva de Mana: limite total de auto-cura pós-Magia Proibida
          allAllies.forEach(function(h){ if (h.alive) h.dots.push({ type: "freeze", dmg: Math.round(effStat(u,"atk")*0.25), turns: 2 }); });
          const heal = Math.round(u.maxHp * 0.08); u.hp = Math.min(u.maxHp, u.hp + heal);
          // Fase final: Frieren fica mais agressiva (Magia Acumulada)
          u.base = { ...u.base, atk: Math.round(u.base.atk * 1.25), spd: Math.round(u.base.spd * 1.15) };
          pushLog(s, "🔮 MAGIA PROIBIDA! Frieren libera mil anos de feitiços acumulados — restaura " + heal + " HP (+8%), congela todos e ganha ATK×1.25 + VEL×1.15! (Reserva de Mana: 80.000 de auto-cura restante)");
        }
        // Pós-Magia Proibida: cada ataque básico cura Frieren, limitado pela Reserva de Mana (80k no total)
        if (u._frierenForbidden && !msg && (u._frManaPool || 0) > 0) {
          const selfHeal = Math.min(u._frManaPool, Math.round(u.maxHp * 0.06));
          u._frManaPool -= selfHeal;
          u.hp = Math.min(u.maxHp, u.hp + selfHeal);
          fx.push({ uid: u.uid, txt: "+" + selfHeal, heal: true, id: Math.random() });
          if (u._frManaPool <= 0) pushLog(s, "💨 A Reserva de Mana de Frieren se esgotou — ela não consegue mais se regenerar!");
        }
        if (u.actCount % 4 === 0 && u.actCount > 0) {
          let tot = 0;
          for (let wi = 0; wi < 7; wi++) { const t = pickTarget(); if (t && t.alive) tot += dealDamage(u, t, 55 * rage, fx, { el: "Glacial" }).dmg; }
          msg = "🔮 GRAÇA DAS FADAS! Frieren lança 7 ondas mágicas — " + tot + " de Dano Glacial total!";
        } else if (!msg) {
          const t = pickTarget();
          if (t) { const r = dealDamage(u, t, 100 * rage, fx, { el: "Glacial" }); msg = u.name + " conjura feitiço em " + t.name + " — " + r.dmg + (r.crit ? " (CRÍTICO!)" : "") + (u._frierenForbidden ? " [auto-cura]" : "") + "."; }
        }
      } else if (u.alive && u.boss && u.bossKind === "void_sovereign") {
        // Fase 2: abaixo de 60% HP — Soberano do Vazio transcende
        if (!u._voidPhase2 && u.hp / u.maxHp < 0.60) {
          u._voidPhase2 = true;
          u.base = { ...u.base, atk: Math.round(u.base.atk * 1.35), def: Math.round(u.base.def * 1.2), spd: Math.round(u.base.spd * 1.2) };
          u.res = [...(u.res || []), "Fogo"];
          // Anula todos os buffs do time
          allAllies.forEach(h => { h.buffs = h.buffs.filter(b => b.turns >= 9999); }); // mantém só permanentes (C6)
          pushLog(s, `🌑 SOBERANO DO VAZIO — FASE 2: ECLIPSE TOTAL! ATK×1.35, DEF×1.2, VEL×1.2, resiste Fogo. TODOS OS BUFFS TEMPORÁRIOS DO TIME SÃO ANULADOS PELO VAZIO!`);
        }
        // Pulso do Vazio a cada 3 ações — dano + remove 1 buff aleatório
        if (u.actCount % 3 === 0 && u.actCount > 0) {
          let tot = 0;
          allAllies.forEach(h => {
            tot += dealDamage(u, h, 100 * rage, fx, { el: "Chaos" }).dmg;
            if (h.buffs.length > 0) h.buffs.splice(Math.floor(Math.random() * h.buffs.length), 1);
          });
          pushLog(s, `🌑 PULSO DO VAZIO! ${tot} de Dano Chaos em área + 1 buff removido de cada aliado pelo Vazio!`); s = checkEnd(s); s.turn = null; return s;
        }
        // Fragmentação da Realidade a cada 6 ações — dano massivo + penalidade de energia
        if (u.actCount % 6 === 0 && u.actCount > 0) {
          let tot = 0;
          allAllies.forEach(h => {
            tot += dealDamage(u, h, 145 * rage, fx, { el: "Chaos", defPen: 30 }).dmg;
            // Fulgur Resonance leve no alvo do Cleave (pós-rebalance: dot suave, drena energia se ele apanhar de multi-hit)
            if (h.alive && !h.dots.some(d => d.type === "fulgur")) applyDot([h], { type: "fulgur", mul: 22, turns: 2 }, u, fx);
            h.debuffs.push({ stat: "atk", value: -30, pct: true, turns: 2, name: "VazioFragmento" });
            h.energy = Math.max(0, (h.energy || 0) - 25);
          });
          pushLog(s, `🌀 FRAGMENTAÇÃO DA REALIDADE! ${tot} Dano Chaos total (ignora 30% DEF) + ATK -30% por 2 turnos + todos perdem 25 de Energia!`); s = checkEnd(s); s.turn = null; return s;
        }
      } else if (u.alive && u.boss && u.bossKind === "maximillion") {
        // Pânico decai ao fim do ciclo de turnos dele
        if ((u._panic || 0) > 0) u._panic -= 1;
        // Fase 2 aos 50% de HP: Caixa de Imitação — Cópia Toon (espelho refletivo) desperta
        if (!u._toonActive && u.hp / u.maxHp <= 0.50) {
          u._toonActive = true;
          pushLog(s, "🃏 CAIXA DE IMITAÇÃO! Maximillion invoca uma Cópia Toon — ataques dos personagens principais agora são refletidos em 50% como Dano de Fogo! Só Entidades Independentes conseguem atingi-lo de verdade (Dano Verdadeiro na Resistência).");
        }
        // Ilusão de Óptica: liga/desliga a imunidade a debuffs/DoTs dos slots principais a cada 3 ações
        if (u.actCount % 3 === 0) {
          u._illusionActive = !u._illusionActive;
          pushLog(s, u._illusionActive ? "🎭 ILUSÃO DE ÓPTICA! Maximillion fica imune a debuffs e DoTs dos personagens principais — só Entidades Independentes furam essa proteção." : "🎭 A Ilusão de Óptica se dissipa momentaneamente...");
        }
        if (u.actCount % 4 === 0 && u.actCount > 0) {
          let tot = 0; allAllies.forEach(h => { tot += dealDamage(u, h, 120 * rage * ((u._panic || 0) > 0 ? 1.15 : 1), fx, { el: "Chaos" }).dmg; });
          pushLog(s, `🔮 CARTA DO CAOS! ${tot} de Dano Chaos em toda a equipe!`); s = checkEnd(s); s.turn = null; return s;
        }
        { const t = pickTarget(); if (t) { const r = dealDamage(u, t, 135 * rage, fx, { el: "Holy" }); msg = `👁️ ${u.name} lê a mente de ${t.name} e contra-ataca — ${r.dmg}${r.crit ? " (CRÍTICO!)" : ""}.`; } }
      } else if (u.elite && u.actCount === 1) {
        u.buffs.push({ stat: "atk", value: 35, pct: true, turns: 99, name: "Fúria" });
        const t = pickTarget(); const r = t ? dealDamage(u, t, 90 * rage, fx) : { dmg: 0 };
        msg = `${u.name} entra em FÚRIA (ATK↑) e golpeia ${t ? t.name : ""} por ${r.dmg}.`;
      } else if (u.boss && u.bossKind === "venom" && u.actCount % 2 === 0) {
        const t = pickTarget(); if (t) { t.dots.push({ type: "poison", dmg: Math.round(effStat(u, "atk") * 0.5), turns: 3 }); const r = dealDamage(u, t, 60 * rage, fx); msg = `☣️ ${u.name} injeta veneno corrosivo em ${t.name} — ${r.dmg} de dano + Veneno por 3 turnos!`; }
      } else if (u.boss && u.bossKind === "stone" && u.actCount % 3 === 0) {
        u.shield += Math.round(effStat(u, "atk") * 8); const t = pickTarget(); const r = t ? dealDamage(u, t, 135 * rage, fx) : { dmg: 0 };
        msg = `🗿 ${u.name} cristaliza uma carapaça (escudo) e esmaga ${t ? t.name : ""} por ${r.dmg}!`;
      } else if (u.boss && (u.actCount % 3 === 0 || (enraged && u.actCount % 2 === 0))) {
        let tot = 0; allAllies.forEach((h) => { tot += dealDamage(u, h, 48 * rage, fx).dmg; });
        realHeroes.forEach((h) => h.debuffs.push({ stat: "def", value: -25, pct: true, turns: 2, name: "DEF↓" }));
        msg = `💥 ${u.name} desfere um ataque DEVASTADOR em área — ${tot} de dano total e reduz a DEF de todos!${enraged ? " (ENFURECIDO!)" : ""}`;
      } else if (u.boss && u.actCount % 5 === 0) {
        u.shield += Math.round(effStat(u, "atk") * 5); const t = pickTarget(); const r = t ? dealDamage(u, t, 80 * rage, fx) : { dmg: 0 };
        msg = `${u.name} se protege com uma barreira e fere ${t ? t.name : ""} por ${r.dmg}.`;
      } else if (u.boss && Math.random() < 0.3) {
        const carry = targetable.slice().sort((a, b) => effStat(b, "atk") - effStat(a, "atk"))[0];
        if (carry) { carry.debuffs.push({ stat: "vuln", value: 25, turns: 2, name: "Vuln" }); carry.debuffs.push({ stat: "atk", value: -20, pct: true, turns: 2, name: "ATK↓" }); const r = dealDamage(u, carry, 95 * rage, fx); msg = `${u.name} mira ${carry.name}, enfraquecendo seu ATK e aumentando o dano recebido — ${r.dmg} de dano.`; }
      } else {
        const t = pickTarget();
        if (t) { const r = dealDamage(u, t, 100 * rage, fx); msg = `${u.name} ataca ${t.name} — ${r.dmg}${r.crit ? " (CRÍTICO!)" : ""}.`; }
      }
      // C4 Athena: Justiça Retributiva — inimigo que atinge aliado sob 7 Casas recebe DEF↓ e Dano Holy
      { const athC4h = s.heroes.find(h => h.id === "athena" && h.alive && h.stFlags?.athC4 && s._athHouseActive);
        if (athC4h) {
          const houseHeroHit = s.heroes.find(h => h.alive && h.buffs.some(b => b.name === "Bênção do Olimpo") && s.fx.some(x => x.uid === h.uid && !x.heal && !x.dot));
          if (houseHeroHit) {
            if (!u.debuffs.some(d => d.name === "JulgSantuário")) u.debuffs.push({ stat: "def", value: -20, pct: true, turns: 2, name: "JulgSantuário" });
            if (u.boss) {
              const holyDmg = Math.round(effStat(athC4h, "spd") * 10);
              u.hp = Math.max(1, u.hp - holyDmg);
              s.fx.push({ uid: u.uid, txt: String(holyDmg), el: "Holy", id: Math.random() });
              pushLog(s, `✟ [C4 Atena] Justiça Retributiva! ${athC4h.name} condena ${u.name} — ${holyDmg} de Dano Holy puro + DEF -20% por 2 turnos!`);
            }
          }
        } }
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
      // ═══ Agumon: termodinâmica no fim do turno dele ═══
      if (u.id === "agumon" && u.alive) {
        // Reforço defensivo: garante que os buffs da forma atual nunca sumam por engano
        const _agFm = u.agForm || "agumon";
        if (_agFm !== "agumon" && !u.buffs.some(b => b.name === "Forma: " + (_agFm === "greymon" ? "Greymon" : _agFm === "metalgreymon" ? "MetalGreymon" : "WarGreymon"))) {
          if (_agFm === "greymon") u.buffs.push({ stat: "def", value: 100, pct: true, turns: 9999, name: "Forma: Greymon" });
          else if (_agFm === "metalgreymon") { u.buffs.push({ stat: "atk", value: 100, pct: true, turns: 9999, name: "Forma: MetalGreymon" }); u.buffs.push({ stat: "dmgBonus", value: 40, turns: 9999, name: "Forma: MetalGreymon" }); }
          else if (_agFm === "wargreymon") { u.buffs.push({ stat: "atk", value: 60, pct: true, turns: 9999, name: "Forma: WarGreymon" }); u.buffs.push({ stat: "dmgBonus", value: 90, turns: 9999, name: "Forma: WarGreymon" }); }
        }
        if ((u.agTrident || 0) > 0) u.agTrident -= 1;
        if ((u.agModoX || 0) > 0) { u.agModoX -= 1; u.agHeat = 0; if (u.agModoX <= 0) { u.buffs = u.buffs.filter(b => b.name !== "MODO X"); pushLog(s, "⚙️ O MODO X se encerra — os sistemas do WarGreymon voltam ao normal."); } }
        // Forma imperfeita: dura 1 turno → regride com 1 de HP e 0 SP
        if ((u.agTempForm || 0) > 0) { u.agTempForm -= 1; if (u.agTempForm <= 0 && !u.stFlags?.aguC6) { aguRevert(u, s, true); } else if (u.agTempForm <= 0) { u.agTempForm = 0; } }
        // Calor > 70: Overclocking (+ATK/+CD até 80%). C3: sem dreno de HP — vira Escudo (10% do ATK/rodada)
        u.buffs = u.buffs.filter(b => b.name !== "Overclocking");
        if ((u.agHeat || 0) > 70 && (u.agModoX || 0) <= 0) {
          const ov = Math.round(((u.agHeat - 70) / 30) * 80);
          u.buffs.push({ stat: "atk", value: ov, pct: true, turns: 9999, name: "Overclocking" });
          u.buffs.push({ stat: "critDmg", value: ov, turns: 9999, name: "Overclocking" });
          if (u.stFlags?.aguC3) { const shGain = Math.round(effStat(u, "atk") * 0.10); u.shield = (u.shield || 0) + shGain; fx.push({ uid: u.uid, txt: "🛡️+" + shGain, heal: true, id: Math.random() }); }
          else { const burn5 = Math.round(u.maxHp * 0.05); u.hp = Math.max(1, u.hp - burn5); fx.push({ uid: u.uid, txt: String(burn5), dot: "burn", id: Math.random() }); }
        }
        // Meltdown a 100 de Calor — C6: nunca regride pra forma base, só perde TamerSP e esfria
        if ((u.agHeat || 0) >= 100 && (u.agForm || "agumon") !== "agumon" && !u.stFlags?.aguC6) {
          aguRevert(u, s, false); u.agSP = Math.round((u.agSP || 0) / 2); u.agHeat = 0;
          pushLog(s, "☢️ MELTDOWN! O núcleo de " + u.name + " colapsa — a evolução desfaz e metade do TamerSP evapora!");
        } else if ((u.agHeat || 0) >= 100) { u.agHeat = 0; u.agSP = Math.round((u.agSP || 0) / 2); pushLog(s, (u.stFlags?.aguC6 ? "☢️ Superaquecimento contido! O núcleo é resfriado à força, mas a Forma Eterna mantém " + u.name + " na forma atual — só perde metade do TamerSP." : "☢️ Superaquecimento! Agumon perde metade do TamerSP ao ventilar o núcleo.")); }
      }
      applyMutPostAction(s, u); // mutadores do Abismo
      // Torre Sombria: chefes com DoT designado aplicam a cada 3 ações num aliado aleatório
      if (u._darkTowerDot && u.actCount % 3 === 0) {
        const alive2 = s.heroes.filter(h => h.alive && !h.isSummon);
        if (alive2.length) {
          const tgt2 = alive2[Math.floor(Math.random() * alive2.length)];
          applyDot([tgt2], { type: u._darkTowerDot, mul: 30 + Math.round((u.level || 70) * 0.4), turns: 2 }, u, s.fx);
          pushLog(s, "☠️ " + u.name + " infecta " + tgt2.name + " com " + (DOT_INFO[u._darkTowerDot]?.n || u._darkTowerDot) + "!");
        }
      }
      s.hitFx = { el: u.element, big: u.boss && (u.actCount % 3 === 0 || (enraged && u.actCount % 2 === 0)), enemy: true, id: Math.random() };
      pushLog(s, msg); s = checkEnd(s); s.turn = null; return s;
    });
  }

  const isHeroTurn = current && current.side === "H" && !current.auto && !current.isSummon;
  const activeHero = isHeroTurn ? state.heroes.find((h) => h.uid === current.uid) : null;
  const canUlt = activeHero && activeHero.energyMax && (activeHero.energy >= activeHero.energyMax || (activeHero.id === "athena" && activeHero.stFlags?.athC6 && state._athHouseActive && (activeHero._athC6Cd || 0) <= 0));
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

        {!state.over && encounter.isTower && (
          <div style={{ textAlign: "center", marginBottom: 4 }}>
            <span style={{ ...ORB, fontSize: 11, fontWeight: 800, color: encounter.darkTower && (state.cycle || 1) >= 8 ? "#FF6B82" : "#8AA0FF", background: "#161233", border: `1px solid ${encounter.darkTower && (state.cycle || 1) >= 8 ? "#FF6B8255" : "#8AA0FF55"}`, borderRadius: 99, padding: "3px 12px" }}>🔄 CICLO {state.cycle || 1}{encounter.darkTower ? "/10" : ""}</span>
          </div>
        )}
        {state.cycleFlash && encounter.isTower && (
          <div key={state.cycleFlash.id} style={{ position: "fixed", inset: 0, zIndex: 85, display: "flex", alignItems: "center", justifyContent: "center", pointerEvents: "none" }}>
            <style dangerouslySetInnerHTML={{ __html: `@keyframes cycleFlash{0%{opacity:0;transform:scale(1.4)}20%{opacity:1;transform:scale(1)}80%{opacity:1}100%{opacity:0;transform:scale(0.9)}}` }} />
            <div style={{ ...ORB, fontSize: 34, fontWeight: 900, color: "#8AA0FF", textShadow: "0 0 26px #8AA0FFaa", animation: "cycleFlash 1.6s ease both" }}>🔄 CICLO {state.cycleFlash.n}</div>
          </div>
        )}
        {!state.over && <TurnOrderBar units={[...state.heroes, ...state.enemies]} />}

        {/* inimigos */}
        <div className="flex gap-2" style={{ flexWrap: "wrap" }}>
          {state.enemies.map((e, i) => { const al = aliveEnemies(state); const isTarget = al[target]?.uid === e.uid; const eel = ELEMENTS[e.element] || { color: C.line, glyph: "✦" }; return (
            <button key={e.uid} disabled={!e.alive} onClick={() => { const idx = al.findIndex((x) => x.uid === e.uid); if (idx >= 0) { if (isTarget) setInspectUid(e.uid); else setTarget(idx); } }}
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
              {e._hasToughness && <>
                <Bar value={e.toughness} max={e.maxToughness} color={e.toughness > 0 ? "#F2C245" : "#555"} />
                <div style={{ fontSize: 8, color: e.toughness > 0 ? "#F2C245" : "#7CFFB0" }}>{e.toughness > 0 ? `🛡 Resistência ${Math.round(e.toughness)}/${e.maxToughness}` : "💢 PERFURADO!"}</div>
              </>}
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

        {/* ROLETA DAS CORRENTES — overlay do Soberano da Espiral */}
        {state.espRoulette && (() => {
          const vict = state.heroes.find(h => h.uid === state.espRoulette.targetUid);
          return (
            <div key={state.espRoulette.id} style={{ position: "fixed", inset: 0, zIndex: 90, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(4,3,12,0.82)", animation: "srBadge .4s both" }} onClick={() => setState(s0 => ({ ...s0, espRoulette: null }))}>
              <style dangerouslySetInnerHTML={{ __html: `@keyframes espSpin{from{transform:rotate(0)}to{transform:rotate(1080deg)}}@keyframes espChain{0%{opacity:0;transform:scale(2.4)}60%{opacity:1;transform:scale(0.95)}100%{opacity:1;transform:scale(1)}}` }} />
              <div style={{ textAlign: "center" }}>
                <div style={{ ...ORB, fontSize: 16, fontWeight: 900, color: "#B98BFF", letterSpacing: 3, marginBottom: 14 }}>⛓️ ROLETA DAS CORRENTES ⛓️</div>
                <div style={{ position: "relative", width: 120, height: 120, margin: "0 auto 14px" }}>
                  <div style={{ position: "absolute", inset: -10, borderRadius: "50%", border: "3px dashed #B98BFF88", animation: "espSpin 2.2s cubic-bezier(.2,.8,.3,1) both" }} />
                  {vict && <div style={{ position: "absolute", inset: 10, display: "flex", alignItems: "center", justifyContent: "center" }}><Avatar ch={vict} size={90} ring="#B98BFF" /></div>}
                  <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 64, animation: "espChain 2.4s .3s both", pointerEvents: "none" }}>⛓️</div>
                </div>
                <div className="flex gap-2" style={{ justifyContent: "center", marginBottom: 12 }}>
                  {state.heroes.filter(h => h.alive && !h.isSummon).map(h => (
                    <div key={h.uid} style={{ opacity: h.uid === state.espRoulette.targetUid ? 1 : 0.35, filter: h.uid === state.espRoulette.targetUid ? "none" : "grayscale(1)" }}>
                      <Avatar ch={h} size={40} ring={h.uid === state.espRoulette.targetUid ? "#B98BFF" : C.line} />
                    </div>
                  ))}
                </div>
                <div style={{ fontSize: 13, color: C.text, fontWeight: 700 }}>{vict ? vict.name : "?"} foi acorrentado(a) — sem agir por 2 turnos!</div>
                <div style={{ fontSize: 11, color: C.mute, marginTop: 8 }}>(toque para fechar)</div>
              </div>
            </div>
          );
        })()}

        {/* INSPETOR — clique num personagem para ver status, buffs e origem */}
        {inspectUid && (() => {
          const iu = state.heroes.find(h => h.uid === inspectUid) || state.enemies.find(e => e.uid === inspectUid);
          if (!iu) return null;
          const iel = ELEMENTS[iu.element] || { color: C.line };
          const statRow = (lbl, v, base) => (
            <div className="flex items-center justify-between" style={{ fontSize: 12, padding: "3px 0", borderBottom: `1px solid ${C.line}55` }}>
              <span style={{ color: C.mute }}>{lbl}</span>
              <span style={{ fontWeight: 700 }}>{v}{base != null && Math.round(v) !== Math.round(base) ? <span style={{ color: v > base ? C.good : C.bad, fontSize: 10 }}> ({v > base ? "+" : ""}{Math.round(v - base)})</span> : null}</span>
            </div>
          );
          const effLine = (b, isBuff) => (
            <div style={{ fontSize: 11, padding: "5px 8px", borderRadius: 8, background: isBuff ? "#0d2317" : "#2a0f18", border: `1px solid ${isBuff ? C.good : C.bad}44`, marginBottom: 4 }}>
              <div style={{ fontWeight: 700, color: isBuff ? C.good : "#FF8FA0" }}>{b.name || (isBuff ? "Buff" : "Debuff")}</div>
              <div style={{ color: C.mute }}>
                {STAT_LABEL[b.stat] || b.stat}: <b style={{ color: C.text }}>{b.value > 0 && isBuff ? "+" : ""}{b.value}{b.pct ? "%" : (["atk","hp","def","spd"].includes(b.stat) ? "" : "%")}</b>
                {" · "}{b.turns >= 99 ? "permanente" : `${b.turns} turno(s)`}
              </div>
            </div>
          );
          return (
            <div style={{ position: "fixed", inset: 0, zIndex: 95, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(4,3,12,0.78)", padding: 16 }} onClick={() => setInspectUid(null)}>
              <div onClick={(ev) => ev.stopPropagation()} style={{ width: "100%", maxWidth: 360, maxHeight: "82vh", overflowY: "auto", background: C.panel, border: `2px solid ${iel.color}77`, borderRadius: 16, padding: 14, boxShadow: `0 0 30px ${iel.color}33` }}>
                <div className="flex items-center gap-3" style={{ marginBottom: 10 }}>
                  {iu.side === "enemy" ? <EnemyAvatar e={iu} size={48} /> : <Avatar ch={iu} size={48} ring={iel.color} />}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 800, fontSize: 15 }}>{iu.name}</div>
                    <div style={{ fontSize: 11, color: iel.color }}>{(ELEMENTS[iu.element]?.glyph || "✦")} {iu.element} · Nv {iu.level || "?"}{iu.boss ? " · CHEFE" : ""}</div>
                  </div>
                  <button onClick={() => setInspectUid(null)} style={{ background: "transparent", border: `1px solid ${C.line}`, color: C.mute, borderRadius: 8, padding: "4px 10px", cursor: "pointer" }}>✕</button>
                </div>
                <div style={{ marginBottom: 10 }}>
                  {statRow("HP", `${Math.round(iu.hp)} / ${iu.maxHp}`)}
                  {(iu.shield || 0) > 0 && statRow("🛡 Escudo", Math.round(iu.shield))}
                  {statRow("ATK", Math.round(effStat(iu, "atk")), iu.base?.atk)}
                  {statRow("DEF", Math.round(effStat(iu, "def")), iu.base?.def)}
                  {statRow("VEL", Math.round(effStat(iu, "spd")), iu.base?.spd)}
                  {statRow("Taxa de CRIT", Math.round(effStat(iu, "critRate")) + "%", iu.base?.critRate)}
                  {statRow("CRIT DMG", Math.round(effStat(iu, "critDmg")) + "%", iu.base?.critDmg)}
                  {iu.energyMax > 0 && statRow("⚡ Energia", `${Math.round(iu.energy)} / ${iu.energyMax}`)}
                </div>
                {(iu.buffs || []).length > 0 && <div style={{ marginBottom: 8 }}>
                  <div style={{ ...ORB, fontSize: 11, fontWeight: 800, color: C.good, letterSpacing: 1, marginBottom: 6 }}>▲ BUFFS ({iu.buffs.length})</div>
                  {iu.buffs.map((b, i) => <div key={i}>{effLine(b, true)}</div>)}
                </div>}
                {(iu.debuffs || []).length > 0 && <div style={{ marginBottom: 8 }}>
                  <div style={{ ...ORB, fontSize: 11, fontWeight: 800, color: "#FF8FA0", letterSpacing: 1, marginBottom: 6 }}>▼ DEBUFFS ({iu.debuffs.length})</div>
                  {iu.debuffs.map((b, i) => <div key={i}>{effLine(b, false)}</div>)}
                </div>}
                {(iu.dots || []).length > 0 && <div>
                  <div style={{ ...ORB, fontSize: 11, fontWeight: 800, color: "#FFB86B", letterSpacing: 1, marginBottom: 6 }}>☠ EFEITOS CONTÍNUOS (DoT)</div>
                  {iu.dots.map((d, i) => <div key={i} style={{ fontSize: 11, padding: "5px 8px", borderRadius: 8, background: "#2a1a0d", border: "1px solid #FFB86B44", marginBottom: 4 }}>
                    <b style={{ color: DOT_INFO[d.type]?.c || "#FFB86B" }}>{DOT_INFO[d.type]?.n || d.type}</b>
                    <span style={{ color: C.mute }}> · {d.dmg} de dano/turno · {d.turns} turno(s)</span>
                  </div>)}
                </div>}
                {(iu.buffs || []).length === 0 && (iu.debuffs || []).length === 0 && (iu.dots || []).length === 0 &&
                  <div style={{ fontSize: 12, color: C.mute, textAlign: "center", padding: "8px 0" }}>Nenhum efeito ativo.</div>}
                <div style={{ fontSize: 10, color: C.dim, marginTop: 8, textAlign: "center" }}>O nome de cada efeito indica sua origem (habilidade, arma, constelação ou inimigo).</div>
              </div>
            </div>
          );
        })()}

        {/* log */}
        <div ref={logRef} style={{ background: `${C.bg1}cc`, border: `1px solid ${C.line}`, borderRadius: 12, padding: 10, height: 96, overflowY: "auto", fontSize: 12, color: C.mute }}>
          {state.log.map((l, i) => <div key={i} style={{ marginBottom: 2 }}>{l}</div>)}
        </div>

        {/* heróis */}
        {(state.frostZone || 0) > 0 && <div style={{ textAlign: "center", fontSize: 11, color: "#6FE3FF", fontWeight: 700, padding: "2px 0" }}>❄️ Zona de Geada ativa ({state.frostZone}) — Miyabi em Postura Iaido permanente</div>}
        {state.sfZona && <div style={{ textAlign: "center", fontSize: 11, color: ELEMENTS["Vento"]?.color || "#7CFFB0", fontWeight: 700, padding: "2px 0" }}>🦋 Zona de Condução ativa ({state.sfZona.turns}) — Follow-ups e CRIT amplificados!</div>}
        <div className="flex gap-2" style={{ flexWrap: "wrap" }}>
          {state.heroes.map((h) => { const active = current && current.uid === h.uid; const el = ELEMENTS[h.element] || { color: C.line }; const full = !h.isSummon && h.energyMax > 0 && h.energy >= h.energyMax;
            const lupaOC = h.id === "lupa" && (h._lupaOverclock || 0) > 0; return (
            <div key={h.uid} onClick={() => setInspectUid(h.uid)} style={{ flex: 1, minWidth: 112, position: "relative", opacity: h.alive ? 1 : 0.35, border: `2px solid ${lupaOC ? "#FF3B30" : active ? C.gold : el.color + "55"}`, borderRadius: 12, padding: 8, background: lupaOC ? "linear-gradient(180deg,#3a0e08,#150402)" : C.panel, boxShadow: lupaOC ? "0 0 22px #FF3B30aa, 0 0 8px #FF7A2988 inset" : active ? `0 0 16px ${C.gold}55` : "none", cursor: "pointer", animation: lupaOC ? "srLupaFire 1.1s ease-in-out infinite" : "none" }}>
              {lupaOC && <style>{`@keyframes srLupaFire{0%,100%{box-shadow:0 0 18px #FF3B30aa,0 0 6px #FF7A2988 inset}50%{box-shadow:0 0 30px #FF6A00cc,0 0 14px #FFD24988 inset}}`}</style>}
              <FX fx={state.fx} uid={h.uid} />
              <div className="flex items-center gap-2">
                <CombatPortrait h={h} size={40} active={active} />
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", color: lupaOC ? "#FF8A5C" : undefined }}>{lupaOC ? "🔥 " : ""}{h.name}{h.isSummon && <span style={{ color: el.color }}> ⟡</span>}</div>
                  {h.isSummon && isFinite(h.life) && <div style={{ fontSize: 9, color: el.color }}>⏳ {h.life} turno(s)</div>}
                  {!h.isSummon && h.energyMax > 0 && <div style={{ fontSize: 9, color: full ? C.gold : "#B98BFF" }}>⚡ {Math.round(h.energy)}/{h.energyMax}{full ? " · PRONTO" : ""}</div>}
                  {h.id === "agumon" && <div style={{ fontSize: 9, color: (h.agHeat || 0) > 70 ? "#FF7043" : "#FFB74D" }}>{AGU_FORMS[h.agForm || "agumon"]?.emoji} {AGU_FORMS[h.agForm || "agumon"]?.name}{(h.agModoX || 0) > 0 ? " · MODO X⚡" : ""} · 🔥{h.agHeat || 0} · 🧬{h.agSP || 0} SP{(h.agHeat || 0) >= 85 ? " ☢️" : ""}</div>}
                  {h.id === "miyabi" && (h.stFlags?.miPostura) && <div style={{ fontSize: 9, color: "#6FE3FF" }}>{"❄".repeat(Math.min(h.posturePH || 0, h.stFlags?.miC6 ? 4 : 3))}{"·".repeat(Math.max(0, (h.stFlags?.miC6 ? 4 : 3) - (h.posturePH || 0)))} {((h.posturePH || 0) >= (h.stFlags?.miC6 ? 4 : 3)) ? "Postura Iaido!" : "PH"}</div>}
                  {h.id === "soifon" && <div style={{ fontSize: 9, color: ELEMENTS["Vento"]?.color || "#7CFFB0" }}>{h.sfPostura ? "🦋 POSTURA DE FERRÃO!" : `🦋 Vibração ${h.sfCharges || 0}/3`}</div>}
                  {h.id === "lupa" && <div style={{ fontSize: 9, color: lupaOC ? "#FF6A00" : "#FFB86B" }}>{lupaOC ? `🔥🔥 OVERCLOCK! ${h._lupaOverclock}t restantes` : `🍖 Voracidade ${h._lupaVor || 0}/${h.stFlags?.lupaC6 ? 15 : 10}`}</div>}
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
            {(!state.win && context !== "abismo") ? (
              <div className="flex gap-2" style={{ justifyContent: "center", marginTop: 12 }}>
                <Btn kind="primary" onClick={() => onRetry && onRetry()} style={{ padding: "10px 18px", fontWeight: 800 }}>🔁 Jogar Novamente</Btn>
                <Btn kind="soft" onClick={() => onEnd({ win: false, turns: state.heroTurns, heroesHp: state.heroes.filter(h => !h.isSummon).map(h => ({ id: h.id, hpPct: Math.max(0, h.hp / Math.max(1, h.maxHp)), alive: h.alive })) })} style={{ padding: "10px 18px" }}>↩ Voltar</Btn>
              </div>
            ) : state.win && ["farm", "tagdungeon", "coop", "relicfarm", "relicrotate"].includes(context) ? (
              <div className="flex gap-2" style={{ justifyContent: "center", marginTop: 12 }}>
                <Btn kind="primary" onClick={() => onRetry && onRetry()} style={{ padding: "10px 18px", fontWeight: 800 }}>🔁 Farmar de novo</Btn>
                <Btn kind="soft" onClick={() => onEnd({ win: true, turns: state.heroTurns, heroesHp: state.heroes.filter(h => !h.isSummon).map(h => ({ id: h.id, hpPct: Math.max(0, h.hp / Math.max(1, h.maxHp)), alive: h.alive })) })} style={{ padding: "10px 18px" }}>↩ Voltar</Btn>
              </div>
            ) : state.win && ["tower", "darktower"].includes(context) ? (
              <div className="flex gap-2" style={{ justifyContent: "center", marginTop: 12 }}>
                {onNext && <Btn kind="primary" onClick={() => onNext({ win: true, turns: state.heroTurns, heroesHp: state.heroes.filter(h => !h.isSummon).map(h => ({ id: h.id, hpPct: Math.max(0, h.hp / Math.max(1, h.maxHp)), alive: h.alive })) })} style={{ padding: "10px 18px", fontWeight: 800 }}>⏭ Próximo Andar</Btn>}
                <Btn kind="soft" onClick={() => onEnd({ win: true, turns: state.heroTurns, heroesHp: state.heroes.filter(h => !h.isSummon).map(h => ({ id: h.id, hpPct: Math.max(0, h.hp / Math.max(1, h.maxHp)), alive: h.alive })) })} style={{ padding: "10px 18px" }}>↩ Voltar</Btn>
              </div>
            ) : (
              <div style={{ color: C.mute, fontSize: 12, marginTop: 4 }}>voltando…</div>
            )}
          </div>
        ) : state.choice ? (
          <div>
            {state.choice.kind === "frieren" ? (
              <>
                <div style={{ textAlign: "center", ...ORB, fontWeight: 800, fontSize: 14, color: "#C8E6C9", marginBottom: 8 }}>✨ GRIMÓRIO MILENAR — ESCOLHA A FORMA DA SUPREMA</div>
                <div className="flex gap-2" style={{ justifyContent: "center", flexWrap: "wrap" }}>
                  {[
                    { k: "zoltraak", emoji: "✨", name: "Zoltraak", col: "#FFE08A", desc: "Feixe anti-magia focado. Ignora 100% da DEF, Crit Garantido contra Chaos/Vírus. Mata inimigos comuns <30% HP." },
                    { k: "reaction", emoji: "⚗️", name: "Reação de Campo", col: "#6FE3FF", desc: "Libera todos os Pontos de Elemento em explosão AoE. Dano ×(1+pts×0.3). Precisa de ≥1 ponto para potência máxima." },
                    { k: "flowers", emoji: "🌸", name: "Magia de Flores", col: "#A8E6CF", desc: "Cura o time em 25% do HP máx de Frieren, remove todos os debuffs e concede +15% resistência por 3 turnos." },
                  ].map((opt) => (
                    <button key={opt.k} onClick={() => resolveFrierenUlt(opt.k)}
                      style={{ flex: 1, minWidth: 130, maxWidth: 200, textAlign: "left", border: `2px solid ${opt.col}77`, borderRadius: 14, padding: 10, background: "linear-gradient(180deg,#101a14,#080f0a)", cursor: "pointer", boxShadow: `0 0 16px ${opt.col}22` }}>
                      <div className="flex items-center gap-2" style={{ marginBottom: 6 }}>
                        <span style={{ fontSize: 28 }}>{opt.emoji}</span>
                        <span style={{ ...ORB, fontWeight: 800, fontSize: 12, color: opt.col }}>{opt.name}</span>
                      </div>
                      <div style={{ fontSize: 10, color: C.mute, lineHeight: 1.4 }}>{opt.desc}</div>
                    </button>
                  ))}
                </div>
              </>
            ) : state.choice.kind === "agumon_evo" ? (
              <>
                <div style={{ textAlign: "center", ...ORB, fontWeight: 800, fontSize: 14, color: "#FFB74D", marginBottom: 4 }}>🧬 MENU DE DIGIEVOLUÇÃO</div>
                {(() => { const agU = state.heroes.find(h => h.id === "agumon"); if (!agU) return null; return <>
                  <div style={{ textAlign: "center", fontSize: 11, color: C.mute, marginBottom: 8 }}>🔥 Calor: <b style={{ color: (agU.agHeat || 0) > 70 ? "#FF7043" : C.text }}>{agU.agHeat || 0}</b>/100 · 🧬 TamerSP: <b>{agU.agSP || 0}</b> · Trident: {(agU.agTrident || 0) > 0 ? "✅ ativo" : "❌"}</div>
                  <div className="flex flex-col gap-2">
                    {AGU_ORDER.filter(fid => fid !== (agU.agForm || "agumon") && AGU_FORMS[fid].req).map(fid => {
                      const F = AGU_FORMS[fid];
                      const okSP = (agU.agSP || 0) >= F.req.sp;
                      const okHeat = (agU.agHeat || 0) >= F.req.heatMin && (agU.agHeat || 0) <= F.req.heatMax;
                      const okTri = !F.req.needTrident || (agU.agTrident || 0) > 0;
                      const perfect = okHeat && okTri;
                      return <button key={fid} disabled={!okSP} onClick={() => resolveAgumonEvolve(fid)}
                        style={{ textAlign: "left", border: `2px solid ${perfect && okSP ? "#66FF99" : okSP ? "#FFB74D66" : C.line}`, borderRadius: 14, padding: 10, background: okSP ? "linear-gradient(180deg,#2a1c10,#160d05)" : C.panelHi, cursor: okSP ? "pointer" : "not-allowed", opacity: okSP ? 1 : 0.5 }}>
                        <div style={{ ...ORB, fontWeight: 800, fontSize: 13, color: perfect && okSP ? "#66FF99" : "#FFB74D" }}>{F.emoji} {F.name} <span style={{ fontSize: 10, color: C.mute }}>({F.stage})</span>{perfect && okSP ? " ✨ JANELA PERFEITA!" : ""}</div>
                        <div style={{ fontSize: 10, color: C.mute, marginTop: 3 }}>{F.reqTxt} {okSP ? "" : "· SP INSUFICIENTE"}</div>
                        <div style={{ fontSize: 10, color: C.text, marginTop: 3 }}>{F.buffs}</div>
                        {!perfect && okSP && <div style={{ fontSize: 10, color: "#FF7043", marginTop: 3 }}>⚠️ Fora da janela: a forma será INSTÁVEL (1 turno)!</div>}
                      </button>; })}
                  </div>
                  <div style={{ textAlign: "center", marginTop: 8 }}><Btn kind="soft" onClick={() => setState(s0 => ({ ...s0, choice: null, turn: s0.turn }))}>Cancelar</Btn></div>
                </>; })()}
              </>
            ) : state.choice.kind === "athena" ? (
              <>
                <div style={{ textAlign: "center", ...ORB, fontWeight: 800, fontSize: 14, color: "#FFE9A8", marginBottom: 8 }}>🕊️✨ JULGAMENTO DO OLIMPO — ESCOLHA O(A) GUARDIÃO(Ã) DAS SETE CASAS</div>
                <div className="flex gap-2" style={{ justifyContent: "center", flexWrap: "wrap" }}>
                  {state.heroes.filter((h) => h.alive && !h.isSummon).map((h) => (
                    <button key={h.uid} onClick={() => resolveAthenaUlt(h.uid)}
                      style={{ minWidth: 96, textAlign: "center", border: `2px solid ${C.gold}77`, borderRadius: 14, padding: 10, background: "linear-gradient(180deg,#241d3a,#120e22)", cursor: "pointer", boxShadow: `0 0 16px ${C.gold}22` }}>
                      <Avatar ch={h} size={42} ring={C.gold} />
                      <div style={{ ...ORB, fontWeight: 800, fontSize: 11, color: C.gold, marginTop: 6 }}>{h.name}</div>
                    </button>
                  ))}
                </div>
                <div style={{ textAlign: "center", fontSize: 10, color: C.mute, marginTop: 8 }}>Todo o time recebe +30% VEL / +30% DEF / +20% CRIT / +20% Dano / +25% CRIT DMG. O(A) Guardião(ã) escolhido(a) recebe TUDO EM DOBRO se C1 ativo.</div>
              </>
            ) : state.choice.kind === "uraraka" ? (
              <>
                <div style={{ textAlign: "center", ...ORB, fontWeight: 800, fontSize: 14, color: "#B9F3D8", marginBottom: 8 }}>🎈 ZERO GRAVITY — ESCOLHA QUEM RECEBE O BUFF</div>
                <div className="flex gap-2" style={{ justifyContent: "center", flexWrap: "wrap" }}>
                  {state.heroes.filter((h) => h.alive && !h.isSummon).map((h) => (
                    <button key={h.uid} onClick={() => resolveUrarakaSkill(h.uid)}
                      style={{ minWidth: 96, textAlign: "center", border: `2px solid ${C.good}77`, borderRadius: 14, padding: 10, background: "linear-gradient(180deg,#16281f,#0a140f)", cursor: "pointer", boxShadow: `0 0 16px ${C.good}22` }}>
                      <Avatar ch={h} size={42} ring={C.good} />
                      <div style={{ ...ORB, fontWeight: 800, fontSize: 11, color: C.good, marginTop: 6 }}>{h.name}</div>
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <>
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
              </>
            )}
          </div>
        ) : isHeroTurn ? (() => { let nm = skillNamesOf(activeHero.id); if (activeHero.id === "agumon") { const _F = AGU_FORMS[activeHero.agForm || "agumon"]; if (_F) nm = _F.skills.map(x => x[0]); }
          if (activeHero.id === "lupa" && (activeHero._lupaOverclock || 0) > 0) nm = [nm[0] + " → Julgamento Solar ☀️🔥", nm[1], nm[2]]; // Overclock: Básico vira Julgamento Solar
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
            {activeHero.id === "kaiba" && (activeHero._kaibaHand || []).length > 0 && (() => {
              const hand = activeHero._kaibaHand || [];
              const monCount = state.heroes.filter(h => h.isSummon && h.kind === "monster" && h.ownerUid === activeHero.uid && h.alive).length;
              const canTribute = !!(activeHero.stFlags?.kaibaS3 && monCount >= 2);
              const startCardHold = (idx) => { cardHoldingRef.current = false; clearTimeout(cardHoldTimer.current); cardHoldTimer.current = setTimeout(() => { cardHoldingRef.current = true; setCardPreviewIdx(idx); }, 380); };
              const endCardHold = (idx) => { clearTimeout(cardHoldTimer.current); if (cardHoldingRef.current) { cardHoldingRef.current = false; setCardPreviewIdx(null); } else { playKaibaHandCard(idx, false); } };
              return (
                <div style={{ width: "100%", marginBottom: 6 }}>
                  <div style={{ textAlign: "center", fontSize: 10, color: C.gold, fontWeight: 800, letterSpacing: 1, marginBottom: 6 }}>🎴 MÃO VIRTUAL ({hand.length}/3) — segure pra ver a descrição, toque pra ativar</div>
                  <div className="flex gap-2" style={{ justifyContent: "center", flexWrap: "wrap" }}>
                    {hand.map((cid, idx) => { const card = KAIBA_CARDS[cid]; if (!card) return null; return (
                      <button key={idx}
                        onPointerDown={() => startCardHold(idx)} onPointerUp={() => endCardHold(idx)} onPointerLeave={() => clearTimeout(cardHoldTimer.current)}
                        style={{ width: 66, textAlign: "center", border: `2px solid ${card.cat === "monster" ? "#FF9E45" : card.cat === "magic" ? "#B98BFF" : "#6FE3FF"}88`, borderRadius: 12, padding: "8px 4px", background: "linear-gradient(180deg,#241d3a,#120e22)", cursor: "pointer" }}>
                        <Avatar ch={{ id: card.imgId, element: activeHero.element, avatar: card.avatar }} size={36} ring={card.cat === "monster" ? "#FF9E45" : card.cat === "magic" ? "#B98BFF" : "#6FE3FF"} />
                        <div style={{ fontSize: 8, fontWeight: 800, marginTop: 4, lineHeight: 1.2 }}>{card.name}</div>
                      </button>
                    ); })}
                  </div>
                  {cardPreviewIdx != null && hand[cardPreviewIdx] && KAIBA_CARDS[hand[cardPreviewIdx]] && (
                    <div style={{ marginTop: 8, background: C.panelHi, border: `1px solid ${C.gold}55`, borderRadius: 10, padding: 10, maxWidth: 360, marginLeft: "auto", marginRight: "auto" }}>
                      <div style={{ fontWeight: 800, fontSize: 12, color: C.gold, marginBottom: 4 }}>{KAIBA_CARDS[hand[cardPreviewIdx]].name}</div>
                      <div style={{ fontSize: 11, color: C.mute, lineHeight: 1.6 }}>{KAIBA_CARDS[hand[cardPreviewIdx]].desc}</div>
                      <div style={{ fontSize: 9, color: C.dim, marginTop: 6 }}>Solte pra fechar · toque rápido em qualquer carta pra ativar</div>
                    </div>
                  )}
                  {canTribute && (
                    <div style={{ textAlign: "center", marginTop: 8 }}>
                      <div style={{ fontSize: 9, color: C.mute, marginBottom: 4 }}>Tributo disponível: sacrifica os 2 monstros ativos, ativa a carta de graça com dano em DOBRO e avança a ação de Kaiba em 100%.</div>
                      <div className="flex gap-2" style={{ justifyContent: "center", flexWrap: "wrap" }}>
                        {hand.map((cid, idx) => <Btn key={idx} kind="soft" style={{ borderColor: "#FF6B82", color: "#FF6B82", fontSize: 11 }} onClick={() => playKaibaHandCard(idx, true)}>⚔️ Tributar por {KAIBA_CARDS[cid]?.name}</Btn>)}
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}
            <div className="flex gap-2" style={{ flexWrap: "wrap", justifyContent: "center" }}>
              {activeHero.id === "agumon" && (activeHero.agForm || "agumon") !== "wargreymon" &&
                <Btn kind="soft" style={{ borderColor: "#FF9E45", color: "#FFB74D" }} onClick={() => setState(s0 => ({ ...s0, choice: { uid: activeHero.uid, kind: "agumon_evo" } }))}>🧬 Digievoluir</Btn>}
              {_holdBtn("basic", { kind: "soft" }, <>⚔️ {nm[0]}</>)}
              {_holdBtn("skill", { disabled: state.sp <= 0 }, <>✦ {nm[1]} <span style={{ fontSize: 10, opacity: 0.8 }}>(1 PH)</span></>)}
              {_holdBtn("ult", { kind: canUlt ? "primary" : "soft", disabled: !canUlt }, <>{canUlt ? "💥 " : "⏳ "}{nm[2]}</>)}
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
  // Corrige bug: buffs ofensivos (dano/crítico) não refletiam visualmente no retrato — agora acende um selo dourado pulsante
  const buffed = (h.buffs || []).some((b) => ["dmgBonus", "critRate", "critDmg", "elemDmg", "atk", "followupDmg"].includes(b.stat) && (b.value || 0) > 0);
  return <div style={{ position: "relative", width: size, height: size, flexShrink: 0 }}>
    <Avatar ch={h} size={size} ring={active ? C.gold : buffed ? "#FFD249" : el.color} />
    {buffed && <div style={{ position: "absolute", inset: -3, borderRadius: 16, boxShadow: "0 0 10px #FFD249cc", animation: "srBuffPulse 1s ease-in-out infinite", pointerEvents: "none" }} />}
    {buffed && <div style={{ position: "absolute", bottom: -4, right: -4, fontSize: Math.round(size * 0.32), filter: "drop-shadow(0 0 3px #000)" }}>⚔️↑</div>}
    {buffed && <style>{`@keyframes srBuffPulse{0%,100%{opacity:.5}50%{opacity:1}}`}</style>}
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
  let cumAv = 0;
  for (let i = 0; i < (n || 7) && sim.length; i++) {
    sim.sort((a, b) => a.av - b.av);
    const nx = sim[0], t = nx.av;
    sim.forEach((x) => (x.av -= t));
    cumAv += t;
    const cycleBreakBefore = cumAv >= 10000; // marca "|" quando esse turno já cai no próximo Ciclo
    if (cycleBreakBefore) cumAv -= 10000;
    order.push({ ...nx.ref, _cycleBreakBefore: cycleBreakBefore });
    nx.av = 10000 / nx.spd;
  }
  return order;
}
function TurnOrderBar({ units }) {
  const order = predictTurnOrder(units, 7);
  return <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "4px 2px 10px", overflowX: "auto" }}>
    <span style={{ fontSize: 9, color: C.mute, whiteSpace: "nowrap", marginRight: 2 }}>PRÓXIMOS ▸</span>
    {order.map((u, i) => { const el = ELEMENTS[u.element] || { color: C.line }; const enemy = u.side === "enemy"; const isHero = u.side === "H"; return (
      <React.Fragment key={i}>
        {u._cycleBreakBefore && <div style={{ flexShrink: 0, width: 2, height: 30, background: "#8AA0FF77", borderRadius: 2, margin: "0 2px" }} title="Novo Ciclo" />}
        <div style={{ position: "relative", flexShrink: 0 }}>
          <div style={{ width: i === 0 ? 38 : 30, height: i === 0 ? 38 : 30, borderRadius: 99, border: `2px solid ${enemy ? C.bad : el.color}`, background: enemy ? "#2a1018" : C.panelHi, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", boxShadow: i === 0 ? `0 0 8px ${enemy ? C.bad : el.color}` : "none" }}>
            {isHero ? <Avatar ch={{ id: u.id || u.imgKey, element: u.element, avatar: u.avatar }} size={i === 0 ? 38 : 30} /> : <span style={{ fontSize: i === 0 ? 20 : 16 }}>{u.avatar}</span>}
          </div>
          {i === 0 && <div style={{ position: "absolute", bottom: -9, left: 0, right: 0, textAlign: "center", fontSize: 7, color: C.gold, fontWeight: 800 }}>AGORA</div>}
        </div>
      </React.Fragment>); })}
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
  const colorOf = (f) => f.enhanced ? "#5CFF7A" : f.heal ? C.good : f.dot ? (DOT_INFO[f.dot]?.c || "#fff") : f.crit ? C.gold : (f.el && ELEMENTS[f.el]?.color) || "#ffd9d9";
  return <div style={{ position: "absolute", top: -6, left: 0, right: 0, textAlign: "center", pointerEvents: "none", zIndex: 5 }}>
    {items.map((f) => <div key={f.id} style={{ animation: "srFloat 1s ease-out forwards", fontWeight: 800, fontSize: f.enhanced ? 20 : f.crit ? 18 : f.dot ? 11 : 14, color: colorOf(f), textShadow: f.enhanced ? "0 0 10px #5CFF7Aaa, 0 1px 3px #000" : "0 1px 3px #000" }}>{f.dot ? "🔥" : f.enhanced ? "🌿" : ""}{f.txt}{f.crit ? "!" : ""}</div>)}
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
async function fetchAllyList() {
  const cloud = await cloudAllyList(); if (cloud.length) return cloud;
  try {
    const res = await SS.list(PUB_KEY, true);
    if (res?.keys?.length) {
      const items = await Promise.all(res.keys.slice(0, 30).map(async (k) => { try { const r = await SS.get(k, true); return r ? JSON.parse(r.value) : null; } catch { return null; } }));
      return items.filter(Boolean);
    }
  } catch {}
  return [];
}
function defaultAlly() { const o = { id: "yoruichi", level: 70, eidolon: 2, weapon: "thunderclaws", relics: EMPTY_RELICS() }; const st = computeStats(o); return { player: "Aliada IA", name: "Yoruichi", avatar: CHAR_MAP.yoruichi.avatar, element: "Eletro", role: "dps", rarity: 5, level: 70, eidolon: 2, stats: st, skill: CHAR_MAP.yoruichi.skill }; }

function Coop({ team, ownedMap, stamina, setStamina, setRelicInv, setRelicMats, flash, setBattle }) {
  const [setName, setSetName] = useState(RELIC_SET_NAMES[0]);
  const [ally, setAlly] = useState(null);
  const [allyList, setAllyList] = useState([]);
  const [picking, setPicking] = useState(false);
  const [loadingList, setLoadingList] = useState(false);
  useEffect(() => { (async () => setAlly((await fetchRandomAlly()) || defaultAlly()))(); }, []);

  async function openPicker() {
    setPicking(true); setLoadingList(true);
    const list = await fetchAllyList();
    setAllyList(list.length ? list : [defaultAlly()]);
    setLoadingList(false);
  }

  function start() {
    if (stamina < 40) { flash("Stamina insuficiente (precisa 40)", C.bad); return; }
    if (!team.length) { flash("Monte uma equipe", C.bad); return; }
    setStamina((s) => s - 40);
    const onResolve = (res) => {
      if (res.win) {
        const n = 2 + Math.floor(Math.random() * 3), drops = [];
        for (let i = 0; i < n; i++) { drops.push(makeRelic(Math.floor(Math.random() * 6), setName)); }
        setRelicInv((p) => [...p, ...drops]);
        setRelicMats((v) => v + 12);
        flash(`Domínio limpo! +${drops.length} relíquias · +12 🔷 Matéria de Relíquia`, C.good);
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
        <div className="flex gap-2 mt-2">
          <Btn kind="ghost" style={{ padding: "6px 12px" }} onClick={async () => setAlly((await fetchRandomAlly()) || defaultAlly())}>🎲 Aleatório</Btn>
          <Btn kind="ghost" style={{ padding: "6px 12px" }} onClick={openPicker}>📋 Escolher parceiro</Btn>
        </div>
        <div style={{ fontSize: 11, color: C.mute, marginTop: 8 }}>Publique seus personagens no Elenco para aparecerem para outros jogadores.</div>
      </Panel>
      {picking && (
        <Panel glow={C.gold}>
          <div className="flex items-center justify-between"><b>Escolher aliado</b><button onClick={() => setPicking(false)} style={{ color: C.mute, fontSize: 12 }}>fechar ✕</button></div>
          {loadingList ? <div style={{ color: C.mute, fontSize: 12, marginTop: 8 }}>Carregando aliados…</div> :
            <div className="flex flex-col gap-2 mt-2" style={{ maxHeight: 320, overflowY: "auto" }}>
              {allyList.map((a, i) => (
                <button key={i} onClick={() => { setAlly(a); setPicking(false); }} className="flex items-center gap-3 text-left" style={{ background: C.panelHi, border: `1px solid ${C.line}`, borderRadius: 10, padding: 8 }}>
                  <Avatar ch={{ id: a.player === "Aliada IA" ? "yoruichi" : "ally", element: a.element, avatar: a.avatar }} size={40} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 13 }}>{a.name} <Rarity n={a.rarity} /></div>
                    <div style={{ fontSize: 11, color: C.mute }}>de <Glow color={C.gold}>{a.player}</Glow> · Nv {a.level}{a.eidolon ? ` · E${a.eidolon}` : ""} · {ROLES[a.role]?.label} · {ELEMENTS[a.element]?.glyph} {a.element}</div>
                  </div>
                </button>
              ))}
            </div>}
        </Panel>
      )}
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
function RelicsScreen({ relicInv, setRelicInv, owned, setRelicMats, flash }) {
  const [group, setGroup] = useState("set"); // "set" | "slot"
  const [confirmSell, setConfirmSell] = useState(null); // relic id pending sell confirmation
  const [onlyFree, setOnlyFree] = useState(false); // só não-equipadas
  const [confirmBulk, setConfirmBulk] = useState(false);
  if (!relicInv.length) return <Empty msg="Sem relíquias. Vá ao Farm → Rede Corrompida ☢️ para farmar o set Protocolo Ômega, ou ao Co-op para outros sets." />;

  // Mapa de relíquias equipadas: relicId -> [{charName, avatar}]
  const equippedBy = {};
  (owned || []).forEach((o) => {
    const oc = normChar(o); const def = CHAR_MAP[o.id];
    (oc.relics || []).forEach((r) => { if (r && r.id) { (equippedBy[r.id] = equippedBy[r.id] || []).push(def?.name || o.id); } });
  });

  function sellRelic(id) {
    setRelicInv((p) => p.filter((r) => r.id !== id));
    setRelicMats((v) => v + 8);
    setConfirmSell(null);
    flash && flash("Relíquia vendida · +8 🔷 Matéria de Relíquia", C.gold);
  }
  const junk = relicInv.filter((r) => !equippedBy[r.id] && (r.level || 0) === 0);
  function sellJunk() {
    if (!junk.length) return;
    const ids = new Set(junk.map((r) => r.id));
    setRelicInv((p) => p.filter((r) => !ids.has(r.id)));
    setRelicMats((v) => v + junk.length * 8);
    setConfirmBulk(false);
    flash && flash(`${junk.length} relíquias vendidas · +${junk.length * 8} 🔷 Matéria de Relíquia`, C.gold);
  }

  const filtered = onlyFree ? relicInv.filter((r) => !equippedBy[r.id]) : relicInv;
  const groups = (group === "set"
    ? Object.entries(filtered.reduce((acc, r) => { (acc[r.set] = acc[r.set] || []).push(r); return acc; }, {}))
    : RELIC_SLOTS.map((sl) => [sl.name, filtered.filter((r) => (r.slot ?? 0) === sl.i)]).filter(([, list]) => list.length)
  ).map(([label, list]) => [label, list.slice().sort((a, b) => (b.level || 0) - (a.level || 0))]);

  return <div className="flex flex-col gap-4">
    <Panel>
      <div className="flex items-center justify-between flex-wrap gap-2">
        <b>💠 Relíquias ({relicInv.length})</b>
        <div className="flex gap-1 flex-wrap">
          <Chip active={group === "set"} onClick={() => setGroup("set")}>Por conjunto</Chip>
          <Chip active={group === "slot"} onClick={() => setGroup("slot")}>Por slot</Chip>
          <Chip active={onlyFree} onClick={() => setOnlyFree((v) => !v)}>Só não-equipadas</Chip>
        </div>
      </div>
      {junk.length > 0 && (
        <div className="flex items-center justify-between mt-3" style={{ background: "#2a1414", border: `1px solid ${C.bad}55`, borderRadius: 10, padding: "8px 12px" }}>
          <div style={{ fontSize: 12 }}>🗑️ <b>{junk.length}</b> relíquias nível 0 sem uso — dá pra vender.</div>
          {confirmBulk ? (
            <div className="flex gap-1">
              <button onClick={sellJunk} style={{ fontSize: 11, fontWeight: 700, color: "#fff", background: C.bad, borderRadius: 6, padding: "4px 10px" }}>Confirmar</button>
              <button onClick={() => setConfirmBulk(false)} style={{ fontSize: 11, color: C.mute, background: C.panel, borderRadius: 6, padding: "4px 10px" }}>Cancelar</button>
            </div>
          ) : <button onClick={() => setConfirmBulk(true)} style={{ fontSize: 11, fontWeight: 700, color: C.bad }}>Vender todas (+{junk.length * 8} 🔷)</button>}
        </div>
      )}
    </Panel>
    {groups.map(([label, list]) => {
      const setData = group === "set" ? RELIC_SETS[label] : null;
      return (
        <Panel key={label} glow={setData?.color}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {group === "set" && <ItemIcon id={RELIC_ITEM_ID[label]} emoji={RELIC_EMOJI[label] || "💎"} size={22} />}
              <b style={{ color: setData?.color }}>{label}</b>
            </div>
            <span style={{ fontSize: 12, color: C.mute }}>{list.length} peças</span>
          </div>
          {setData && <div style={{ fontSize: 11, color: C.mute, marginTop: 6, lineHeight: 1.5 }}>
            {setData.d2 && <div><b style={{ color: setData.color }}>2pç:</b> {setData.d2}</div>}
            {setData.d4 && <div style={{ marginTop: 2 }}><b style={{ color: setData.color }}>4pç:</b> {setData.d4}</div>}
            {setData.d6 && <div style={{ marginTop: 2 }}><b style={{ color: setData.color }}>6pç:</b> {setData.d6}</div>}
          </div>}
          <div className="grid gap-2 mt-3" style={{ gridTemplateColumns: "repeat(auto-fill,minmax(140px,1fr))" }}>
            {list.map((r) => {
              const equipped = equippedBy[r.id];
              return (
                <div key={r.id} style={{ background: equipped ? "#1d2f22" : C.panelHi, border: `1px solid ${equipped ? C.good : C.line}`, borderRadius: 10, padding: 8, position: "relative" }}>
                  {equipped && <div style={{ position: "absolute", top: 6, right: 6, fontSize: 9, fontWeight: 800, color: C.good, background: "#0d1f13", border: `1px solid ${C.good}`, borderRadius: 6, padding: "1px 5px" }}>✓ EQUIPADA</div>}
                  <div style={{ fontSize: 10, color: C.mute }}>{RELIC_SLOTS[r.slot ?? 0]?.name}{group === "slot" && r.set ? ` · ${r.set}` : ""}</div>
                  <div style={{ fontSize: 12 }}>{relicMainText(r)} <span style={{ color: C.mute }}>+{r.level || 0}</span></div>
                  <div style={{ fontSize: 10, color: C.mute, lineHeight: 1.35, marginTop: 2 }}>{(r.subs || []).map((s) => `${relicSubLabel(s)} +${s.value.toFixed(1)}`).join(" · ")}</div>
                  {equipped && <div style={{ fontSize: 10, color: C.good, marginTop: 4 }}>em {equipped.join(", ")}</div>}
                  {!equipped && (confirmSell === r.id ? (
                    <div className="flex gap-1 mt-2">
                      <button onClick={() => sellRelic(r.id)} style={{ flex: 1, fontSize: 11, fontWeight: 700, color: "#fff", background: C.bad, borderRadius: 6, padding: "3px 0" }}>Confirmar</button>
                      <button onClick={() => setConfirmSell(null)} style={{ flex: 1, fontSize: 11, color: C.mute, background: C.panel, borderRadius: 6, padding: "3px 0" }}>Cancelar</button>
                    </div>
                  ) : (
                    <button onClick={() => setConfirmSell(r.id)} style={{ marginTop: 6, fontSize: 11, color: C.bad, fontWeight: 700 }}>🗑️ Vender (+8 🔷)</button>
                  ))}
                </div>
              );
            })}
          </div>
        </Panel>
      );
    })}
  </div>;
}

/* ==========================================================================
   ADMIN (fotos do Imgur)
   ========================================================================== */
function AdminPlayersTab({ flash }) {
  const images = useImg();
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(null);
  const [gemAmt, setGemAmt] = useState({});
  const [sending, setSending] = useState(null);

  const donateGems = async (p) => {
    const amt = parseInt(gemAmt[p.email], 10);
    if (!amt || amt <= 0) { flash && flash("Digite uma quantidade válida de gemas.", C.bad); return; }
    setSending(p.email);
    try {
      const key = saveKeyFor(p.email);
      const fresh = await loadSave(key);
      if (!fresh) { flash && flash("Não consegui carregar o save desse jogador.", C.bad); setSending(null); return; }
      const updated = { ...fresh, jade: (fresh.jade || 0) + amt };
      await writeSave(key, updated);
      setPlayers((prev) => prev.map((x) => x.email === p.email ? { ...x, jade: (x.jade || 0) + amt } : x));
      setGemAmt((g) => ({ ...g, [p.email]: "" }));
      flash && flash(`💎 ${amt.toLocaleString("pt-BR")} gemas enviadas pra ${p.playerName}!`, C.gold);
    } catch { flash && flash("Erro ao enviar as gemas.", C.bad); }
    setSending(null);
  };

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
                  visto {fmtTime(p.lastSeen)}
                </div>
                <div className="flex items-center gap-1 flex-wrap" style={{ fontSize: 11, color: C.mute, marginTop: 2 }}><ItemIcon id="item_jade" emoji="💎" size={11} /> {p.jade} · <ItemIcon id="item_chronicles" emoji="📜" size={11} /> {p.chronicles} · <ItemIcon id="item_ticket_char" emoji="🎴" size={11} /> {p.charTickets} · 🗼 {p.towerCleared}/{TOWER_FLOORS} · {p.owned.length} personagens ({fiveStars.length} ★5)</div>
              </div>
              <span style={{ color: C.mute, fontSize: 14, marginLeft: 8, flexShrink: 0 }}>{isOpen ? "▲" : "▼"}</span>
            </div>

            {/* Elenco expandido */}
            {isOpen && (
              <div style={{ marginTop: 12, paddingTop: 10, borderTop: `1px solid ${C.line}` }}>
                <div className="flex items-center gap-2" style={{ marginBottom: 12, flexWrap: "wrap" }}>
                  <input
                    type="number" placeholder="Qtd. de gemas" value={gemAmt[p.email] || ""}
                    onClick={(e) => e.stopPropagation()}
                    onChange={(e) => setGemAmt((g) => ({ ...g, [p.email]: e.target.value }))}
                    style={{ width: 130, background: C.panelHi, border: `1px solid ${C.line}`, borderRadius: 8, padding: "6px 10px", color: C.text, fontSize: 13 }}
                  />
                  <button
                    onClick={(e) => { e.stopPropagation(); donateGems(p); }}
                    disabled={sending === p.email}
                    style={{ fontSize: 12, fontWeight: 800, padding: "6px 14px", borderRadius: 8, border: `1px solid ${C.gold}`, background: sending === p.email ? C.panelHi : "#3a2c05", color: C.gold, cursor: sending === p.email ? "wait" : "pointer" }}
                  >{sending === p.email ? "Enviando…" : "💎 Doar Gemas"}</button>
                </div>
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
function Admin({ images, setImages, tierList, setTierList, flash, isAdmin, draftActive, setDraftActive }) {
  const [tab, setTab] = useState("chars");
  const setImg = (id, url) => setImages((m) => { const next = { ...m, [id]: url }; cloudSet("meta", "images", { map: next }); _ls.set("sr_shared_images", JSON.stringify(next)); return next; });
  const clearImg = (id) => setImages((m) => { const n = { ...m }; delete n[id]; cloudSet("meta", "images", { map: n }); _ls.set("sr_shared_images", JSON.stringify(n)); return n; });
  const setCharTier = (charId, newTier) => setTierList((prev) => {
    const next = {}; TIER_ORDER.forEach(t => { next[t] = (prev[t] || []).filter(id => id !== charId); });
    if (newTier) next[newTier] = [...(next[newTier] || []), charId];
    cloudSet("meta", "tierlist", { map: next }); _ls.set("sr_shared_tierlist", JSON.stringify(next));
    flash(newTier ? `${CHAR_MAP[charId]?.name} movido pra ${newTier}` : `${CHAR_MAP[charId]?.name} removido da Tier List`, C.gold);
    return next;
  });
  return (
    <div className="flex flex-col gap-4">
      <Panel glow={C.gold}>
        <div style={{ ...ORB, fontSize: 18, fontWeight: 800 }}>🛠️ Painel Admin</div>
        <p style={{ fontSize: 13, color: C.mute, marginTop: 6 }}>Cole o link direto da imagem (Imgur) de cada personagem e arma. Use o link que termina em <b>.jpg</b>/<b>.png</b> (ex: <span style={{ color: C.text }}>https://i.imgur.com/XXXX.png</span>). A imagem aparece no jogo inteiro na hora.</p>
      </Panel>
      <div className="flex gap-2" style={{ flexWrap: "wrap" }}><TabBtn active={tab === "chars"} onClick={() => setTab("chars")}>Personagens</TabBtn><TabBtn active={tab === "weapons"} onClick={() => setTab("weapons")}>Armas</TabBtn><TabBtn active={tab === "summons"} onClick={() => setTab("summons")}>Invocações</TabBtn><TabBtn active={tab === "items"} onClick={() => setTab("items")}>🎒 Itens</TabBtn><TabBtn active={tab === "bosses"} onClick={() => setTab("bosses")}>💀 Chefes</TabBtn><TabBtn active={tab === "players"} onClick={() => setTab("players")}>👥 Players</TabBtn><TabBtn active={tab === "evento"} onClick={() => setTab("evento")}>🎲 Evento</TabBtn><TabBtn active={tab === "roteiro"} onClick={() => setTab("roteiro")}>🎬 Roteiro</TabBtn><TabBtn active={tab === "tierlist"} onClick={() => setTab("tierlist")}>📊 Tier List</TabBtn></div>
      {tab === "tierlist" && <div className="flex flex-col gap-2">
        <Panel style={{ padding: 10 }}><p style={{ fontSize: 12, color: C.mute }}>Toque no tier pra mover o personagem. As mudanças valem pra todo mundo na hora. "—" tira ele da Tier List.</p></Panel>
        {ROSTER.map((c) => {
          const curTier = TIER_ORDER.find(t => (tierList[t] || []).includes(c.id)) || null;
          return (
            <Panel key={c.id} style={{ padding: "8px 12px" }}>
              <div className="flex items-center gap-2" style={{ flexWrap: "wrap" }}>
                <Avatar ch={c} size={34} ring={(ELEMENTS[c.element] || {}).color} />
                <div style={{ flex: 1, minWidth: 100, fontWeight: 700, fontSize: 13 }}>{c.name}</div>
                {["SSS", "SS", "S", "A", "B", null].map((t) => (
                  <button key={t || "none"} onClick={() => setCharTier(c.id, t)}
                    style={{ fontSize: 11, fontWeight: 800, padding: "4px 10px", borderRadius: 8, border: `1px solid ${curTier === t ? C.gold : C.line}`, background: curTier === t ? "#3a2c05" : C.panelHi, color: curTier === t ? C.gold : C.mute, cursor: "pointer" }}>
                    {t || "—"}
                  </button>
                ))}
              </div>
            </Panel>
          );
        })}
      </div>}
      {tab === "chars" && <div className="flex flex-col gap-2">{ROSTER.map((c) => <AdminRow key={c.id} id={c.id} name={`${c.name} · ${c.element} · ${ROLES[c.role].label}`} rarity={c.rarity} fallback={c.avatar} element={c.element} url={images[c.id] || ""} setImg={setImg} clearImg={clearImg} flash={flash} />)}<Panel style={{ padding: "10px 12px", marginTop: 4 }}><b style={{ fontSize: 13 }}>🦖 Agumon — Formas de Digievolução</b><p style={{ fontSize: 11, color: C.mute, marginTop: 4 }}>Fotos para cada estágio. O ID correto já está indicado em cada linha.</p></Panel><AdminRow key="agumon_greymon" id="agumon_greymon" name="Greymon · Champion · Fogo" rarity={5} fallback="🦕" element="Fogo" url={images["agumon_greymon"] || ""} setImg={setImg} clearImg={clearImg} flash={flash} /><AdminRow key="agumon_metalgreymon" id="agumon_metalgreymon" name="MetalGreymon · Ultimate · Fogo" rarity={5} fallback="🤖" element="Fogo" url={images["agumon_metalgreymon"] || ""} setImg={setImg} clearImg={clearImg} flash={flash} /><AdminRow key="agumon_wargreymon" id="agumon_wargreymon" name="WarGreymon · Mega · Fogo" rarity={5} fallback="⚔️" element="Fogo" url={images["agumon_wargreymon"] || ""} setImg={setImg} clearImg={clearImg} flash={flash} /><Panel style={{ padding: "10px 12px", marginTop: 4 }}><b style={{ fontSize: 13 }}>🎴 Kaiba — Cartas do Baralho</b><p style={{ fontSize: 11, color: C.mute, marginTop: 4 }}>Fotos pra cada uma das 10 cartas que aparecem na Mão Virtual e na Puxada do Destino.</p></Panel>{Object.entries(KAIBA_CARDS).map(([cid, card]) => <AdminRow key={card.imgId} id={card.imgId} name={`${card.name} · ${card.cat === "monster" ? "Monstro" : card.cat === "magic" ? "Magia" : "Armadilha"}`} rarity={cid === "obelisk" ? 5 : 4} fallback={card.avatar} element="Eletro" url={images[card.imgId] || ""} setImg={setImg} clearImg={clearImg} flash={flash} />)}<AdminRow key="card_bew" id="card_bew" name="Dragão Branco de Olhos Azuis · Suprema" rarity={5} fallback="🐉" element="Eletro" url={images["card_bew"] || ""} setImg={setImg} clearImg={clearImg} flash={flash} /></div>}
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
      {tab === "players" && <AdminPlayersTab flash={flash} />}
      {tab === "roteiro" && <AdminRoteiro />}
      {tab === "evento" && <div className="flex flex-col gap-4">
        <Panel glow="#7B5CF6">
          <div style={{ ...ORB, fontSize: 17, fontWeight: 800 }}>🎲 Catacumba do Rascunho</div>
          <p style={{ fontSize: 13, color: C.mute, marginTop: 6, lineHeight: 1.6 }}>Ative ou desative o evento temporário de Draft. Quando ativo, todos os jogadores verão a aba "Catacumba" no menu e poderão participar. Recomendado ativar por 7 dias.</p>
        </Panel>
        <Panel>
          <div className="flex items-center justify-between">
            <div>
              <div style={{ fontWeight: 800, fontSize: 15 }}>{draftActive ? "🟢 EVENTO ATIVO" : "🔴 EVENTO INATIVO"}</div>
              <div style={{ fontSize: 12, color: C.mute, marginTop: 4 }}>Status atual da Catacumba do Rascunho para todos os jogadores.</div>
            </div>
            <Btn kind={draftActive ? "danger" : "primary"} onClick={() => {
              const next = !draftActive;
              setDraftActive(next);
              cloudSet("meta", "settings", { draftActive: next, draftUpdatedAt: Date.now() });
            }}>{draftActive ? "Desativar Evento" : "Ativar Evento"}</Btn>
          </div>
        </Panel>
      </div>}
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


function NicknameModal({ onSave }) {
  const [value, setValue] = React.useState("");
  const [err, setErr] = React.useState("");
  function handleSave() {
    const trimmed = value.trim();
    if (!trimmed || trimmed.length < 2) { setErr("Nick precisa ter pelo menos 2 caracteres."); return; }
    if (trimmed.length > 20) { setErr("Nick não pode passar de 20 caracteres."); return; }
    onSave(trimmed);
  }
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 200, background: "rgba(0,0,0,0.82)", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ background: C.panel, border: `1px solid ${C.gold}`, borderRadius: 18, padding: "32px 28px", maxWidth: 360, width: "90%", boxShadow: `0 0 60px ${C.gold}33`, display: "flex", flexDirection: "column", gap: 16 }}>
        <div style={{ ...ORB, fontWeight: 800, fontSize: 20, textAlign: "center" }}>✨ Escolha seu Nick</div>
        <div style={{ color: C.mute, fontSize: 13, textAlign: "center", lineHeight: 1.6 }}>
          Você ainda não tem um apelido. Antes de continuar, escolha um nick que aparecerá para os outros jogadores.
        </div>
        <input
          value={value}
          onChange={(e) => { setValue(e.target.value); setErr(""); }}
          onKeyDown={(e) => e.key === "Enter" && handleSave()}
          placeholder="Seu nick (2–20 caracteres)"
          maxLength={20}
          autoFocus
          style={{ background: C.panelHi, border: `1px solid ${err ? C.bad : C.line}`, borderRadius: 10, padding: "10px 14px", color: C.text, fontSize: 15, outline: "none", width: "100%", boxSizing: "border-box" }}
        />
        {err && <div style={{ color: C.bad, fontSize: 12, marginTop: -8 }}>{err}</div>}
        <button onClick={handleSave} style={{ background: C.gold, color: C.bg0, border: "none", borderRadius: 99, padding: "12px 0", fontWeight: 800, fontSize: 15, cursor: "pointer", width: "100%", letterSpacing: 1 }}>
          Confirmar Nick
        </button>
      </div>
    </div>
  );
}

/* ==========================================================================
   CATACUMBA DO RASCUNHO (Draft Mode)
   ========================================================================== */
const DRAFT_ROOMS = [
  { idx: 0, name: "Entrada das Sombras",   gem: 200, boss: false, desc: "Ondas de guardiões da catacumba bloqueiam a passagem." },
  { idx: 1, name: "Corredor Crepuscular",  gem: 200, boss: false, desc: "O eco de batalhas antigas ressoa pelas paredes de pedra." },
  { idx: 2, name: "Câmara das Relíquias",  gem: 200, boss: false, desc: "Artefatos corrompidos ganham vida para defender seus tesouros." },
  { idx: 3, name: "Guardião da Câmara",    gem: 400, boss: true,  desc: "Um ser ancestral bloqueia o avanço. Derrote-o para prosseguir." },
  { idx: 4, name: "Labirinto Estelar",     gem: 250, boss: false, desc: "A geometria da dungeon desafia a lógica mortal." },
  { idx: 5, name: "Trono dos Esquecidos",  gem: 250, boss: false, desc: "Heróis caídos retornam como espectros para uma última batalha." },
  { idx: 6, name: "Soberano da Catacumba", gem: 1500, boss: true, desc: "O coração da dungeon — a recompensa máxima de 3000💎 aguarda os valentes." },
];
const DRAFT_BOONS = [
  { id: "b_atk",      name: "Fúria do Rascunho",    desc: "+25% de ATK durante este run",        stat: "atk",      value: 25, icon: "⚔️" },
  { id: "b_crit",     name: "Olho do Destino",       desc: "+20% de Taxa Crítica neste run",       stat: "critRate", value: 20, icon: "👁️" },
  { id: "b_critdmg",  name: "Fio da Morte",          desc: "+40% de Dano Crítico neste run",       stat: "critDmg",  value: 40, icon: "💀" },
  { id: "b_dmg",      name: "Amplificação Caótica",  desc: "+30% de Bônus de Dano neste run",      stat: "dmgBonus", value: 30, icon: "💥" },
  { id: "b_spd",      name: "Relâmpago da Catacumba",desc: "+20 de Velocidade neste run",           stat: "spd",      value: 20, icon: "⚡" },
  { id: "b_hp",       name: "Vitalidade Ancestral",  desc: "+40% de HP máximo neste run",           stat: "hp",       value: 40, icon: "❤️" },
  { id: "b_def",      name: "Armadura de Pedra",     desc: "+30% de DEF durante este run",          stat: "def",      value: 30, icon: "🛡️" },
  { id: "b_energy",   name: "Fluxo de Energia",      desc: "+30% de Regen de Energia neste run",   stat: "energyRegen", value: 30, icon: "🔋" },
];
function pick3(arr) {
  const a = [...arr]; const out = [];
  for (let i = 0; i < 3 && a.length; i++) { const idx = Math.floor(Math.random() * a.length); out.push(...a.splice(idx, 1)); }
  return out;
}
function DraftDungeon({ draftRoomCleared, draftClaimedGems, draftBoons, setDraftBoons, startRoom, flash, team, ownedMap, owned }) {
  const [phase, setPhase] = React.useState("rooms"); // "rooms" | "pick_chars" | "pick_boon"
  const [selectedRoom, setSelectedRoom] = React.useState(null);
  const [charOffers, setCharOffers] = React.useState([]);
  const [pickedChars, setPickedChars] = React.useState([]);
  const [boonOffers, setBoonOffers] = React.useState([]);
  const [showHow, setShowHow] = React.useState(false);

  const allComplete = draftRoomCleared >= DRAFT_ROOMS.length;
  const totalGems = DRAFT_ROOMS.reduce((a, r) => a + r.gem, 0);

  function enterRoom(room) {
    if (room.idx > draftRoomCleared) { flash("Conclua as salas anteriores primeiro.", C.bad); return; }
    if (room.idx < draftRoomCleared) { flash("Esta sala já foi conquistada.", C.mute); return; }
    setSelectedRoom(room);
    // Offer 9 random chars (pick 3 of 3 rounds)
    const pool = ROSTER.filter(c => c.rarity >= 4);
    setCharOffers([pick3(pool), pick3(pool), pick3(pool)]);
    setPickedChars([]);
    setPhase("pick_chars");
  }
  function pickChar(roundIdx, charId) {
    const newPicked = [...pickedChars];
    newPicked[roundIdx] = charId;
    setPickedChars(newPicked);
    if (newPicked.filter(Boolean).length === 3) {
      setTimeout(() => {
        // Create draft ownedMap entries for picked chars
        const draftTeam = newPicked;
        // Launch battle
        startRoom(selectedRoom.idx, draftTeam);
        setPhase("rooms");
      }, 300);
    }
  }
  function offerBoons() {
    const avail = DRAFT_BOONS.filter(b => !draftBoons.find(x => x.id === b.id));
    setBoonOffers(pick3(avail.length >= 3 ? avail : DRAFT_BOONS));
    setPhase("pick_boon");
  }
  function takeBoon(boon) {
    setDraftBoons(prev => [...prev.filter(b => b.id !== boon.id), boon]);
    setPhase("rooms");
    flash(`Bênção obtida: ${boon.name}!`, C.gold);
  }

  if (showHow) return (
    <div className="flex flex-col gap-4">
      <button onClick={() => setShowHow(false)} style={{ color: C.mute, fontSize: 13, textAlign: "left" }}>‹ voltar</button>
      <Panel glow="#7B5CF6">
        <div style={{ ...ORB, fontSize: 18, fontWeight: 800 }}>❓ Como Funciona a Catacumba?</div>
        <div className="flex flex-col gap-4" style={{ marginTop: 14 }}>
          {[
            { icon: "🎲", title: "Modo Rascunho", body: "Você NÃO usa seu time padrão. A cada sala, você escolhe 3 personagens de ofertas aleatórias do ROSTER completo — incluindo heróis que você nem possui na conta! É uma experiência nova a cada run." },
            { icon: "⚔️", title: "Monte seu Time", body: "Para cada um dos 3 slots do time, você recebe 3 opções de personagens diferentes e escolhe 1. No total, 3 rodadas de escolha formam sua equipe de 3 para aquela sala." },
            { icon: "🏆", title: "Recompensas", body: "Cada sala conquistada dá gemas. Salas normais dão 200-250💎, mini-bosses dão 400💎 e o boss final dá 1500💎. Total máximo: 3000💎 por evento!" },
            { icon: "✨", title: "Bênçãos do Rascunho", body: "Após cada vitória, você pode escolher uma Bênção poderosa (buffs de ATK, CRIT, VEL, etc.) que persiste pelo resto do evento. Monte combinações criativas!" },
            { icon: "👑", title: "Ativação por Admin", body: "O evento é temporário e ativado pelo administrador. Quando ativo, aparece no menu como 'Catacumba'." },
          ].map((item, i) => (
            <div key={i} style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
              <div style={{ fontSize: 28, flexShrink: 0 }}>{item.icon}</div>
              <div>
                <div style={{ fontWeight: 800, fontSize: 14, color: C.gold }}>{item.title}</div>
                <div style={{ fontSize: 13, color: C.mute, lineHeight: 1.6, marginTop: 4 }}>{item.body}</div>
              </div>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );

  if (phase === "pick_chars") return (
    <div className="flex flex-col gap-4">
      <button onClick={() => setPhase("rooms")} style={{ color: C.mute, fontSize: 13, textAlign: "left" }}>‹ cancelar seleção</button>
      <Panel glow="#7B5CF6">
        <div style={{ ...ORB, fontSize: 16, fontWeight: 800 }}>🎲 {selectedRoom?.name}</div>
        <div style={{ fontSize: 13, color: C.mute, marginTop: 4 }}>Escolha 1 personagem para cada slot do seu time de rascunho!</div>
      </Panel>
      {[0, 1, 2].map(roundIdx => (
        <Panel key={roundIdx} style={{ border: `1px solid ${pickedChars[roundIdx] ? C.good : C.line}` }}>
          <div style={{ fontWeight: 800, fontSize: 14, marginBottom: 10 }}>
            {pickedChars[roundIdx] ? <span style={{ color: C.good }}>✓ Slot {roundIdx + 1}: {CHAR_MAP[pickedChars[roundIdx]]?.name}</span> : <span>Slot {roundIdx + 1}: Escolha um personagem</span>}
          </div>
          <div className="grid grid-cols-3 gap-2">
            {(charOffers[roundIdx] || []).map((c) => {
              const el = ELEMENTS[c.element] || { color: C.line };
              const picked = pickedChars[roundIdx] === c.id;
              return (
                <button key={c.id} onClick={() => !pickedChars[roundIdx] && pickChar(roundIdx, c.id)}
                  className="active:scale-95 transition" disabled={!!pickedChars[roundIdx]}
                  style={{ background: picked ? `${el.color}33` : C.panelHi, border: `2px solid ${picked ? el.color : C.line}`, borderRadius: 12, padding: 10, textAlign: "center" }}>
                  <div style={{ fontSize: 28 }}>{c.avatar}</div>
                  <div style={{ fontSize: 11, fontWeight: 800, color: c.rarity === 5 ? C.gold : "#B98BFF" }}>{c.name}</div>
                  <div style={{ fontSize: 10, color: el.color }}>{c.element}</div>
                  <div style={{ fontSize: 10, color: C.mute }}>{ROLES[c.role]?.label}</div>
                </button>
              );
            })}
          </div>
        </Panel>
      ))}
    </div>
  );

  if (phase === "pick_boon") return (
    <div className="flex flex-col gap-4">
      <Panel glow={C.gold}>
        <div style={{ ...ORB, fontSize: 16, fontWeight: 800 }}>✨ Escolha uma Bênção</div>
        <div style={{ fontSize: 13, color: C.mute, marginTop: 4 }}>Vitória conquistada! Escolha um poder permanente para o resto do evento.</div>
      </Panel>
      <div className="flex flex-col gap-3">
        {boonOffers.map(b => (
          <button key={b.id} onClick={() => takeBoon(b)} className="text-left active:scale-95">
            <Panel glow={C.gold} style={{ padding: 16 }}>
              <div className="flex items-center gap-3">
                <div style={{ fontSize: 36 }}>{b.icon}</div>
                <div>
                  <div style={{ fontWeight: 800, fontSize: 15, color: C.gold }}>{b.name}</div>
                  <div style={{ fontSize: 13, color: C.mute, marginTop: 4 }}>{b.desc}</div>
                </div>
              </div>
            </Panel>
          </button>
        ))}
        <Btn kind="ghost" onClick={() => setPhase("rooms")}>Pular (sem bênção)</Btn>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col gap-4">
      <Panel glow="#7B5CF6" style={{ position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", inset: 0, background: "radial-gradient(400px 200px at 80% 0%, #7B5CF622, transparent)" }} />
        <div style={{ position: "relative" }}>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div style={{ ...ORB, fontSize: 19, fontWeight: 800 }}>🎲 Catacumba do Rascunho</div>
            <button onClick={() => setShowHow(true)} style={{ background: "rgba(123,92,246,0.2)", border: "1px solid #7B5CF688", color: "#B98BFF", borderRadius: 99, padding: "4px 14px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>❓ Como funciona</button>
          </div>
          <div style={{ fontSize: 13, color: C.mute, marginTop: 4 }}>Evento temporário · 7 salas · 3000💎 no total</div>
          <div className="flex items-center gap-3 mt-3" style={{ fontSize: 13 }}>
            <span>Progresso: <b style={{ color: "#B98BFF" }}>{draftRoomCleared}/{DRAFT_ROOMS.length}</b></span>
            <span>Gemas: <b style={{ color: C.gold }}>{draftClaimedGems}/{totalGems}</b></span>
          </div>
          <Bar value={draftClaimedGems} max={totalGems} color="#7B5CF6" />
        </div>
      </Panel>

      {draftBoons.length > 0 && (
        <Panel>
          <div style={{ fontWeight: 800, fontSize: 13, marginBottom: 8 }}>✨ Bênçãos Ativas ({draftBoons.length})</div>
          <div className="flex flex-wrap gap-2">
            {draftBoons.map(b => (
              <div key={b.id} style={{ background: `${C.gold}22`, border: `1px solid ${C.gold}66`, borderRadius: 99, padding: "3px 12px", fontSize: 11, fontWeight: 700, color: C.gold }}>
                {b.icon} {b.name}
              </div>
            ))}
          </div>
        </Panel>
      )}

      {allComplete ? (
        <Panel style={{ textAlign: "center", padding: 32 }}>
          <div style={{ fontSize: 48 }}>🏆</div>
          <div style={{ ...ORB, fontWeight: 800, fontSize: 20, color: C.gold, marginTop: 8 }}>Catacumba Conquistada!</div>
          <div style={{ color: C.mute, fontSize: 13, marginTop: 8 }}>Você derrotou o Soberano e recolheu as 3000💎. Aguarde o próximo evento!</div>
        </Panel>
      ) : (
        <div className="flex flex-col gap-3">
          {DRAFT_ROOMS.map((room) => {
            const cleared = room.idx < draftRoomCleared;
            const current = room.idx === draftRoomCleared;
            const locked = room.idx > draftRoomCleared;
            return (
              <button key={room.idx} onClick={() => !locked && !cleared && enterRoom(room)}
                disabled={locked || cleared} className="text-left active:scale-95"
                style={{ opacity: locked ? 0.45 : 1, cursor: (locked || cleared) ? "not-allowed" : "pointer" }}>
                <Panel glow={current ? "#7B5CF6" : cleared ? C.good : null}
                  style={{ border: `2px solid ${cleared ? C.good : current ? "#7B5CF6" : C.line}`, padding: 14 }}>
                  <div className="flex items-center justify-between gap-3">
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="flex items-center gap-2">
                        <span style={{ fontSize: 20 }}>{cleared ? "✅" : locked ? "🔒" : room.boss ? "💀" : "🗡️"}</span>
                        <div>
                          <div style={{ fontWeight: 800, fontSize: 14 }}>Sala {room.idx + 1} {room.boss ? "· CHEFE" : ""} — {room.name}</div>
                          <div style={{ fontSize: 12, color: C.mute, marginTop: 2 }}>{room.desc}</div>
                        </div>
                      </div>
                    </div>
                    <div style={{ textAlign: "right", flexShrink: 0 }}>
                      <div style={{ fontWeight: 800, color: cleared ? C.good : C.gold, fontSize: 14 }}>{cleared ? "✓" : `+${room.gem}💎`}</div>
                      {current && <div style={{ fontSize: 11, color: "#7B5CF6", fontWeight: 700 }}>PRÓXIMA</div>}
                    </div>
                  </div>
                </Panel>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ==========================================================================
   UPDATE LOG
   ========================================================================== */
function UpdateLog({ setScreen, draftActive }) {
  return (
    <div className="flex flex-col gap-4">
      <Panel glow={C.gold}>
        <div style={{ ...ORB, fontSize: 20, fontWeight: 800 }}>🆕 Novidades</div>
        <div style={{ fontSize: 13, color: C.mute, marginTop: 4 }}>Últimas atualizações do Stellar Resonance</div>
      </Panel>

      {/* Catacumba */}
      <Panel glow="#7B5CF6">
        <div className="flex items-center gap-3 mb-3">
          <div style={{ fontSize: 32 }}>🎲</div>
          <div>
            <div style={{ ...ORB, fontWeight: 800, fontSize: 16, color: "#B98BFF" }}>NOVO MODO — Catacumba do Rascunho</div>
            <div style={{ fontSize: 11, color: C.mute }}>Evento Temporário · 7 Dias</div>
          </div>
          {draftActive && <span style={{ background: "#7B5CF622", border: "1px solid #7B5CF688", color: "#B98BFF", borderRadius: 99, padding: "2px 10px", fontSize: 11, fontWeight: 700, marginLeft: "auto" }}>ATIVO</span>}
        </div>
        <div className="flex flex-col gap-2" style={{ fontSize: 13, color: C.mute, lineHeight: 1.6 }}>
          <p>Um novo modo de jogo temporário chegou ao Stellar Resonance! Em vez de usar seu time, você <b style={{ color: C.text }}>recebe personagens aleatórios</b> — incluindo heróis que você nem possui.</p>
          <div className="flex flex-col gap-1" style={{ marginTop: 6 }}>
            {["🎲 A cada sala, 3 personagens aleatórios são oferecidos — escolha 1 por slot", "🏆 7 salas progressivas com recompensas crescentes", "💎 Total de 3.000 Gemas por evento", "✨ Colete Bênçãos poderosas após cada vitória", "💀 2 chefes épicos guardam as maiores recompensas"].map((t, i) => (
              <div key={i} style={{ display: "flex", gap: 8 }}><span>{t.slice(0, 2)}</span><span>{t.slice(2)}</span></div>
            ))}
          </div>
        </div>
        {draftActive && <Btn style={{ marginTop: 12 }} onClick={() => setScreen("draft")}>Entrar na Catacumba →</Btn>}
      </Panel>

      {/* Novos T4 */}
      <Panel glow="#B98BFF">
        <div style={{ ...ORB, fontWeight: 800, fontSize: 16, color: "#B98BFF", marginBottom: 12 }}>★★★★ Novos Personagens T4</div>
        <div className="flex flex-col gap-3">
          {[
            { id: "lancer", el: "#FF5FC4", title: "Cu Chulainn · Fate", sub: "DPS Chaos · Sobrevivência Extrema", desc: "Cavaleiro de lança imortal que desafia a morte. Esquiva golpes com cargas de Esquiva Absoluta e perfura escudos com a lendária Gáe Bolg — garantindo Crítico contra alvos enfraquecidos." },
            { id: "nanami", el: "#FF5FC4", title: "Nanami · Jujutsu Kaisen", sub: "DPS Chaos · Críticos Garantidos", desc: "Feiticeiro profissional que torna números em armas. Usa a proporção 7:3 para garantir Críticos e entra em Hora Extra após o 5º turno, ganhando +30% de ATK permanente." },
            { id: "nami", el: "#74E8A6", title: "Nami · One Piece", sub: "DPS Área Vento · DoT + Explosão", desc: "Navegadora dos Piratas do Chapéu de Palha. Aplica Ciclones em todos os inimigos e os faz explodir com Zeus Breeze Tempo, detonando todos os DoTs ativos de uma vez." },
            { id: "uraraka", el: "#74E8A6", title: "Uraraka · My Hero Academia", sub: "Buffer Vento · ATK + Velocidade", desc: "Heroína com o Quirk Gravidade Zero. Buffka aliados com ATK e VEL, age com frequência acima do esperado e atrasa inimigos — controle de turno cirúrgico." },
          ].map(({ id, el, title, sub, desc }) => {
            const def = CHAR_MAP[id];
            return (
              <div key={id} style={{ display: "flex", gap: 12, alignItems: "flex-start", background: `${el}0d`, border: `1px solid ${el}33`, borderRadius: 12, padding: 12 }}>
                <div style={{ fontSize: 32, flexShrink: 0 }}>{def?.avatar}</div>
                <div>
                  <div style={{ fontWeight: 800, fontSize: 14, color: "#B98BFF" }}>{title}</div>
                  <div style={{ fontSize: 11, color: el, fontWeight: 700, marginTop: 2 }}>{sub}</div>
                  <div style={{ fontSize: 12, color: C.mute, marginTop: 6, lineHeight: 1.5 }}>{desc}</div>
                </div>
              </div>
            );
          })}
        </div>
      </Panel>
    </div>
  );
}

/* ==========================================================================
   LOJA (Shop — Wuthering Waves style, weekly stock, chronicles)
   ========================================================================== */
const SHOP_ITEMS = [
  { id: "exp",      label: "📘 Lágrimas de XP",        desc: "×10 por compra · upar personagens",     cost: 30,  limit: 20, qty: 10, cat: "mats" },
  { id: "wpnMat",   label: "⚙️ Engrenagem de Arma",    desc: "×5 por compra · upar armas",            cost: 30,  limit: 20, qty: 5,  cat: "mats" },
  { id: "skillMat", label: "💠 Cristal de Habilidade", desc: "×5 por compra · Básico / Skill / Ult",  cost: 30,  limit: 10, qty: 5,  cat: "mats" },
  { id: "ascMat",   label: "🔶 Núcleo de Ascensão",    desc: "×3 por compra · ascender personagens",  cost: 50,  limit: 5,  qty: 3,  cat: "mats" },
  { id: "bossMat",  label: "🔮 Núcleo de Vestígio",    desc: "×1 por compra · Rastros Especiais",     cost: 50,  limit: 5,  qty: 1,  cat: "mats" },
  { id: "relicMat", label: "🔷 Matéria de Relíquia",   desc: "×5 por compra · upar relíquias",        cost: 40,  limit: 10, qty: 5,  cat: "mats" },
  { id: "energy",   label: "⚡ Recarga de Energia",    desc: "+60 Energia · reposição rápida",         cost: 30,  limit: 5,  qty: 60, cat: "energy" },
  { id: "charCopy", label: "🎭 Cópia de Personagem",   desc: "Eleva +1 Eidolão num personagem (máx E6)", cost: 600, limit: 2, qty: 1,  cat: "special" },
];

function Loja({ chronicles, setChronicles, expItems, setExpItems, weaponMats, setWeaponMats, skillMats, setSkillMats, ascMats, setAscMats, bossMats, setBossMats, relicMats, setRelicMats, stamina, setStamina, shopPurchases, setShopPurchases, shopResetAt, setShopResetAt, owned, setOwned, tagMats, setTagMats, flash, isAdmin }) {
  const [charPick, setCharPick] = React.useState(null);

  const WEEK = 7 * 24 * 3600 * 1000;

  // Compute reset-aware purchases for BOTH rendering and logic — runs on every render.
  // If the week has elapsed, treat the inventory as fully refreshed (empty purchases).
  const isExpired = Date.now() - shopResetAt >= WEEK;
  const activePurchases = isExpired ? {} : shopPurchases;

  // Apply the reset to state on mount (or when the screen opens) so save/load stays consistent.
  React.useEffect(() => {
    if (isExpired) {
      setShopPurchases({});
      setShopResetAt(Date.now());
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const rem = (id, limit) => limit - (activePurchases[id] || 0);

  function buy(item) {
    const curBought = activePurchases[item.id] || 0;
    if (curBought >= item.limit) { flash("Estoque esgotado esta semana!", C.bad); return; }
    if (!isAdmin && chronicles < item.cost) { flash("Crônicas insuficientes — 📜 " + item.cost + " necessários", C.bad); return; }
    if (item.id === "charCopy") { setCharPick({ charCopyBought: curBought }); return; }
    if (!isAdmin) setChronicles((c) => c - item.cost);
    // Functional update: always read prev to avoid stale closure overwrite
    setShopPurchases((prev) => {
      const base = isExpired ? {} : prev;
      return { ...base, [item.id]: (base[item.id] || 0) + 1 };
    });
    if (item.id === "exp")      setExpItems((v) => v + item.qty);
    else if (item.id === "wpnMat")   setWeaponMats((v) => v + item.qty);
    else if (item.id === "skillMat") setSkillMats((v) => v + item.qty);
    else if (item.id === "ascMat")   setAscMats((v) => v + item.qty);
    else if (item.id === "bossMat")  setBossMats((v) => v + item.qty);
    else if (item.id === "relicMat") setRelicMats((v) => v + item.qty);
    else if (item.id === "energy")   setStamina((v) => Math.min(320, v + item.qty));
    const name = item.label.split(" ").slice(1).join(" ");
    flash("Comprado! +" + (item.qty > 1 ? item.qty + " " : "") + name, C.good);
  }

  function applyCharCopy(charId) {
    if (!charPick) return;
    const item = SHOP_ITEMS.find((x) => x.id === "charCopy");
    const curBought = activePurchases.charCopy || 0;
    if (curBought >= item.limit) { flash("Estoque esgotado esta semana!", C.bad); setCharPick(null); return; }
    const o = owned.find((x) => x.id === charId);
    if (!o) { setCharPick(null); return; }
    if ((o.eidolon || 0) >= 6) { flash("Já está em E6 — máximo atingido!", C.bad); setCharPick(null); return; }
    if (!isAdmin) setChronicles((c) => c - item.cost);
    setShopPurchases((prev) => {
      const base = isExpired ? {} : prev;
      return { ...base, charCopy: (base.charCopy || 0) + 1 };
    });
    setOwned((prev) => prev.map((x) => x.id === charId ? { ...x, eidolon: Math.min(6, (x.eidolon || 0) + 1) } : x));
    const def = CHAR_MAP[charId];
    flash((def ? def.name : charId) + " → E" + Math.min(6, (o.eidolon || 0) + 1) + " ✦", C.gold);
    setCharPick(null);
  }

  function buyTagMat(tag) {
    const key = "tag_" + tag;
    const curBought = activePurchases[key] || 0;
    if (curBought >= 3) { flash("Estoque do material " + tag + " esgotado esta semana!", C.bad); return; }
    if (!isAdmin && chronicles < 60) { flash("Crônicas insuficientes — 📜 60 necessários", C.bad); return; }
    if (!isAdmin) setChronicles((c) => c - 60);
    setShopPurchases((prev) => {
      const base = isExpired ? {} : prev;
      return { ...base, [key]: (base[key] || 0) + 1 };
    });
    setTagMats((m) => ({ ...m, [tag]: (m[tag] || 0) + 2 }));
    flash("+2 Material \"" + tag + "\" comprado!", C.good);
  }

  const resetIn = isExpired ? 0 : Math.max(0, Math.ceil((shopResetAt + WEEK - Date.now()) / 3600000));

  return (
    <div className="flex flex-col gap-4">
      {charPick && (
        <div style={{ position: "fixed", inset: 0, zIndex: 80, background: "#000b", display: "flex", alignItems: "center", justifyContent: "center" }} onClick={() => setCharPick(null)}>
          <div style={{ background: C.panel, border: "1px solid " + C.gold, borderRadius: 20, padding: 24, maxWidth: 360, width: "92%", maxHeight: "78vh", overflowY: "auto" }} onClick={(e) => e.stopPropagation()}>
            <div style={{ ...ORB, fontWeight: 800, fontSize: 16, marginBottom: 4 }}>🎭 Escolha o Personagem</div>
            <div style={{ fontSize: 12, color: C.mute, marginBottom: 14 }}>Selecione para receber +1 Eidolão. Custo: 600 📜</div>
            <div className="flex flex-col gap-2">
              {owned.filter((o) => (o.eidolon || 0) < 6).map((o) => {
                const def = CHAR_MAP[o.id]; if (!def) return null;
                return (
                  <div key={o.id} style={{ display: "flex", alignItems: "center", gap: 10, background: C.panelHi, border: "1px solid " + C.line, borderRadius: 12, padding: "10px 14px", cursor: "pointer" }} onClick={() => applyCharCopy(o.id)}>
                    <span style={{ fontSize: 24 }}>{def.avatar}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700 }}>{def.name}</div>
                      <div style={{ fontSize: 11, color: C.mute }}>E{o.eidolon || 0} → E{Math.min(6, (o.eidolon || 0) + 1)}</div>
                    </div>
                    <Btn style={{ padding: "4px 12px", fontSize: 12 }}>Escolher</Btn>
                  </div>
                );
              })}
              {owned.filter((o) => (o.eidolon || 0) < 6).length === 0 && <div style={{ color: C.mute, textAlign: "center", padding: 20 }}>Todos os personagens estão em E6!</div>}
            </div>
            <Btn kind="soft" style={{ marginTop: 14, width: "100%" }} onClick={() => setCharPick(null)}>Cancelar</Btn>
          </div>
        </div>
      )}

      <Panel glow={C.gold}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
          <div>
            <div style={{ ...ORB, fontSize: 18, fontWeight: 800 }}>🛒 Loja Estelar</div>
            <div style={{ fontSize: 13, color: C.mute, marginTop: 4 }}>Gaste 📜 Crônicas em itens exclusivos · Saldo: <b style={{ color: "#e8c97a" }}>{isAdmin ? "∞" : chronicles}</b> 📜</div>
          </div>
          <div style={{ textAlign: "center", background: C.panelHi, border: "1px solid " + C.line, borderRadius: 12, padding: "8px 14px" }}>
            <div style={{ fontSize: 11, color: C.mute }}>Estoque reseta em</div>
            <div style={{ fontWeight: 800, color: C.gold, fontSize: 15 }}>{resetIn > 0 ? resetIn + "h" : "Hoje"}</div>
          </div>
        </div>
      </Panel>

      <Panel glow="#e8c97a">
        <div style={{ ...ORB, fontWeight: 800, fontSize: 15, marginBottom: 12 }}>✦ Itens Semanais</div>
        <div className="flex flex-col gap-3">
          {SHOP_ITEMS.map((item) => {
            const left = rem(item.id, item.limit);
            const canBuy = left > 0 && (isAdmin || chronicles >= item.cost);
            const isSpec = item.cat === "special";
            return (
              <div key={item.id} style={{ display: "flex", alignItems: "center", gap: 12, background: isSpec ? "#e8c97a08" : C.panelHi, border: "1px solid " + (isSpec ? "#e8c97a33" : C.line), borderRadius: 12, padding: "12px 14px" }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>{item.label}</div>
                  <div style={{ fontSize: 11, color: C.mute, marginTop: 2 }}>{item.desc}</div>
                  <div style={{ fontSize: 11, marginTop: 4 }}>
                    <span style={{ color: left > 0 ? C.good : C.bad, fontWeight: 700 }}>Estoque: {left}/{item.limit}</span>
                  </div>
                </div>
                <div style={{ textAlign: "right", flexShrink: 0 }}>
                  <div style={{ fontSize: 12, color: "#e8c97a", fontWeight: 700, marginBottom: 6 }}>{item.cost} 📜</div>
                  <Btn kind={canBuy ? "primary" : "soft"} disabled={!canBuy} style={{ padding: "6px 14px", fontSize: 12 }} onClick={() => buy(item)}>
                    {left <= 0 ? "Esgotado" : "Comprar"}
                  </Btn>
                </div>
              </div>
            );
          })}
        </div>
      </Panel>

      <Panel glow="#B98BFF">
        <div style={{ ...ORB, fontWeight: 800, fontSize: 15, marginBottom: 4 }}>🗝️ Materiais de Dungeon de Tag</div>
        <div style={{ fontSize: 12, color: C.mute, marginBottom: 12 }}>Limite 3×/semana por tag · 60 📜 cada · +2 materiais por compra</div>
        <div className="grid gap-2" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(155px, 1fr))" }}>
          {ALL_TAGS.map((tag) => {
            const key = "tag_" + tag;
            const left = 3 - (shopPurchases[key] || 0);
            const canBuy = left > 0 && (isAdmin || chronicles >= 60);
            return (
              <div key={tag} style={{ background: C.panelHi, border: "1px solid " + C.line, borderRadius: 12, padding: 12 }}>
                <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 2 }}>{tag}</div>
                <div style={{ fontSize: 10, color: C.mute, marginBottom: 6 }}>
                  Estoque: <b style={{ color: left > 0 ? C.good : C.bad }}>{left}/3</b> · Você tem: <b style={{ color: C.gold }}>{(tagMats && tagMats[tag]) || 0}</b>
                </div>
                <Btn kind={canBuy ? "primary" : "soft"} disabled={!canBuy} style={{ padding: "5px 10px", width: "100%", fontSize: 12 }} onClick={() => buyTagMat(tag)}>
                  {left <= 0 ? "Esgotado" : "60 📜 · ×2"}
                </Btn>
              </div>
            );
          })}
        </div>
      </Panel>
    </div>
  );
}

/* ==========================================================================
   CORREIO (Mail — one-time claim, no live player list)
   ========================================================================== */
const MAIL_PKG = [
  { icon: "💎", label: "Jade Estelar",             value: "12.000" },
  { icon: "📘", label: "Lágrimas de XP (Personagem)", value: "200" },
  { icon: "⚙️", label: "Engrenagens de Arma",      value: "200" },
  { icon: "🔷", label: "Matéria de Relíquia",       value: "100" },
];

/* ==========================================================================
   AGUMON — Digievolução (Calor + TamerSP), com Modo X
   ========================================================================== */
const AGU_FORMS = {
  agumon: { name: "Agumon", stage: "Rookie", imgId: "agumon", emoji: "🦖", req: null,
    buffs: "Forma base — gera TamerSP e controla o Calor.",
    skills: [["Garra Afiada", "Golpe físico rápido (95% ATK). +15 TamerSP · Calor -20. Sua ferramenta de resfriamento."],
      ["Baby Flame", "Bola de fogo (165% ATK). +25 TamerSP · Calor +30."],
      ["Pepper Breath", "Fogo em área (300% ATK). Com Calor > 50: consome TODO o Calor e ignora 40% da DEF. +35 TamerSP."]] },
  greymon: { name: "Greymon", stage: "Champion", imgId: "agumon_greymon", emoji: "🦕",
    req: { sp: 50, heatMin: 30, heatMax: 50 }, reqTxt: "50 TamerSP · Calor entre 30-50",
    buffs: "+100% DEF · +60% HP Máximo (a carapaça solidifica com o calor).",
    skills: [["Grande Chifre", "Investida (140% ATK). Com Calor > 60: o chifre em brasa ATRASA a ação do alvo em 20%. Calor -15 · +15 SP."],
      ["Mega Flame", "Fogo em área (150% ATK). Calor +40 · +25 SP. Ganha DEF proporcional ao Calor por 2 rodadas."],
      ["Nova Blast", "Erupção (380% ATK, alvo único). Transfere metade do Calor ao alvo: ATK dele -30% por 2 rodadas. +35 SP."]] },
  metalgreymon: { name: "MetalGreymon", stage: "Ultimate", imgId: "agumon_metalgreymon", emoji: "🤖",
    req: { sp: 100, heatMin: 60, heatMax: 80 }, reqTxt: "100 TamerSP · Calor entre 60-80",
    buffs: "+100% ATK · +40% de Dano de Fogo (reator cibernético ligado).",
    skills: [["Trident Arm", "Garra mecânica: DANO VERDADEIRO (160% ATK). ROUBA 15% da VEL do alvo (2 rodadas) e ativa o rastreamento p/ WarGreymon. Calor -15 · +15 SP."],
      ["Giga Destroyer", "Mísseis em área (170% ATK) que DESTROEM escudos inimigos. Calor +35 · +25 SP. Com Calor > 80: +50% de dano (risco de Meltdown!)."],
      ["Tera Destroyer", "Energia em todos (330% ATK) + atrasa a ação de TODOS os inimigos em 15%. +35 SP."]] },
  wargreymon: { name: "WarGreymon", stage: "Mega", imgId: "agumon_wargreymon", emoji: "⚔️",
    req: { sp: 150, heatMin: 90, heatMax: 99, needTrident: true }, reqTxt: "150 TamerSP · Calor 90-99 (na beira do colapso!) · Trident Arm na rodada anterior · (C1 Ignis-X Activation: basta Calor > 75) · (C6 Final Digital Evolution: Calor deixa de importar — só o TamerSP)",
    buffs: "SINCRONIA PERFEITA → MODO X: +150% CRIT DMG, +60 VEL, Calor travado em 0 por 2 rodadas. Evolução imperfeita: a forma dura 1 turno e ele regride a Agumon com 1 de HP e 0 SP. ⚡ Nesta forma, a Gaia Force custa 250 de Energia (em vez dos 120 padrão) — o núcleo precisa de muito mais poder pra disparar.",
    skills: [["Great Tornado", "4 golpes das Dramon Killers (65% ATK cada, 20% de penetração de DEF). Contra CHEFES/Elites o dano DOBRA. Não gera Calor."],
      ["Brave Shield", "TAUNT ABSOLUTO: todos os inimigos o atacam por 2 rodadas + 100% de CONTRA-ATAQUE (corte crítico + cura 5% do HP)."],
      ["Gaia Force", "DANO VERDADEIRO massivo (600% ATK, alvo único). No MODO X: consome o TamerSP restante → até 2× de dano. Se matar, TODO o time avança para agir imediatamente."]] },
};
const AGU_ORDER = ["agumon", "greymon", "metalgreymon", "wargreymon"];

/* ==========================================================================
   ABISMO DE DADOS — roguelike de labirinto: draft, permadeath, mutadores, glitches
   ========================================================================== */
const ABISMO_GLITCH_INFO = {
  patch:      { n: "Patch de Segurança", r: "🟢", desc: "Aliados começam cada batalha com Escudo de 10% do HP Máx." },
  bateria:    { n: "Bateria Auxiliar", r: "🟢", desc: "Aliados começam com +20 de Energia do Supremo." },
  lente:      { n: "Lente de Aumento", r: "🟢", desc: "+15% de Taxa Crítica para o time." },
  sanguefrio: { n: "Sangue-Frio", r: "🔵", desc: "Derrotar um inimigo cura 5% do HP Máx do atacante." },
  contrato:   { n: "Contrato de Troca Equivalente", r: "🟣", desc: "+80% de CRIT DMG, mas todas as curas são reduzidas pela metade." },
  troia:      { n: "Cavalo de Troia", r: "🔴", desc: "Cada ataque acumula +10% de Dano Final (máx +100%). Penalidade: o Draft fica BLOQUEADO pelo resto da run." },
};
const ABISMO_META_INFO = [
  { id: "draft4",  n: "Módulo de Expansão de Draft", cost: 300, desc: "O Draft oferece 4 opções em vez de 3." },
  { id: "reroll",  n: "Dados Viciados", cost: 250, desc: "1 reroll grátis de Draft por run." },
  { id: "sanct70", n: "Santuário Aprimorado", cost: 200, desc: "Santuários curam 70% do HP (em vez de 50%)." },
  { id: "bolsos",  n: "Bolsos Profundos", cost: 150, desc: "Começa cada run com +100 de Ouro." },
  { id: "uti",     n: "Vagas na UTI", cost: 400, desc: "1 golpe fatal por batalha é reduzido a 1 de HP (o aliado sobrevive)." },
];
function abismoNodeOptions(floor, seedN) {
  if (floor % 10 === 0) return ["boss"];
  const rng = (n) => { const x = Math.sin(seedN * 9301 + floor * 49297 + n * 233) * 43758.5453; return x - Math.floor(x); };
  const pool = [];
  pool.push(rng(1) < 0.5 ? "combate" : "elite");
  pool.push(rng(2) < 0.55 ? "combate" : (rng(3) < 0.5 ? "evento" : "santuario"));
  if (floor % 5 === 0) pool[1] = "santuario";
  return [...new Set(pool)].length > 1 ? pool : [pool[0], "evento"];
}
function AbismoDados({ run, setRun, frags, setFrags, meta, setMeta, firstClears, weekly, owned, ownedMap, images, startAbismo, abismoBattle, abismoCashout, flash }) {
  const [draftOpts, setDraftOpts] = React.useState(null);
  const [eventNode, setEventNode] = React.useState(null);
  function rollDraft(r) {
    const pool = owned.map(o => o.id).filter(id => !r.team.includes(id) && !r.dead.includes(id));
    const n = meta.draft4 ? 4 : 3;
    const opts = [];
    const cp = [...pool];
    while (opts.length < n && cp.length) opts.push(cp.splice(Math.floor(Math.random() * cp.length), 1)[0]);
    return opts;
  }
  function openDraft() { const o = rollDraft(run); if (!o.length) { flash("Nenhum recruta disponível — você precisa possuir mais personagens!", C.bad); setRun(r => ({ ...r, pendingDraft: false })); return; } setDraftOpts(o); }
  function pickDraft(id) {
    setRun(r => ({ ...r, team: id ? [...r.team, id] : r.team, pendingDraft: false }));
    setDraftOpts(null);
    if (id) flash(`⚔️ ${CHAR_MAP[id]?.name} entra na equipe!`, C.gold);
  }
  function enterNode(kind) {
    if (kind === "combate" || kind === "elite" || kind === "boss") { abismoBattle(kind); return; }
    if (kind === "santuario") {
      setRun(r => {
        const hp = { ...r.hpMap }; const cure = meta.sanct70 ? 0.70 : 0.50;
        r.team.forEach(id => { hp[id] = Math.min(1, (hp[id] ?? 1) + cure); });
        flash(`⛪ Santuário: o time recupera ${Math.round(cure * 100)}% do HP.`, C.good);
        const nx = r.floor + 1;
        return { ...r, hpMap: hp, floor: nx, points: r.points + 5, nodeOptions: abismoNodeOptions(nx, r.seed) };
      });
      return;
    }
    if (kind === "evento") {
      setEventNode(Math.random() < 0.5 ? "comerciante" : "poco");
    }
  }
  function resolveEvent(choice) {
    const ev = eventNode; setEventNode(null);
    setRun(r0 => {
      const r = { ...r0, hpMap: { ...r0.hpMap }, glitches: [...r0.glitches], team: [...r0.team], dead: [...r0.dead] };
      if (ev === "comerciante") {
        if (choice === "A") {
          const dps = r.team.slice().sort((a, b) => (CHAR_MAP[b]?.atk || 0) - (CHAR_MAP[a]?.atk || 0))[0];
          r.hpMap[dps] = Math.max(0.05, (r.hpMap[dps] ?? 1) - 0.30);
          const leg = ["troia", "contrato"].filter(g => !r.glitches.includes(g));
          if (leg.length) { const g = leg[Math.floor(Math.random() * leg.length)]; r.glitches.push(g); flash(`🩸 ${CHAR_MAP[dps]?.name} sacrifica 30% do HP... e ganha ${ABISMO_GLITCH_INFO[g].n}!`, "#B98BFF"); }
          else flash("🩸 O sacrifício foi feito, mas o terminal não tinha mais nada a oferecer...", C.bad);
        } else if (choice === "B" && r.dead.length) {
          const rev = r.dead.shift(); r.team.push(rev); r.hpMap[rev] = 1; r.gold = Math.ceil(r.gold / 2);
          flash(`✨ ${CHAR_MAP[rev]?.name} retorna dos mortos com HP cheio! (-50% do Ouro)`, C.gold);
        }
      } else if (ev === "poco") {
        if (choice === "A") { r.team.forEach(id => r.hpMap[id] = 1); r.curse = 3; flash("💧 Cura total! Mas os Pesos de Chumbo (-15 VEL) pesam por 3 combates...", "#6FE3FF"); }
        else if (choice === "B") { r.team.forEach(id => r.hpMap[id] = Math.max(0.05, (r.hpMap[id] ?? 1) - 0.20)); if (!r.glitches.includes("lente")) r.glitches.push("lente"); flash("⚔️ A arma banhada brilha (+15% CRIT pela run), mas custou 20% do HP do time.", C.bad); }
      }
      const nx = r.floor + 1;
      return { ...r, floor: nx, points: r.points + 5, nodeOptions: abismoNodeOptions(nx, r.seed) };
    });
  }
  const wkGems = weekly.gems || 0;
  const NODE_UI = { combate: ["⚔️", "Combate", "Luta padrão · +10 pts · +8🧬"], elite: ["💀", "Elite", "Difícil · +15 pts · +15🧬 · DRAFT ao vencer"], boss: ["👹", "CHEFE DO SETOR", "Núcleo do Abismo · +30 pts · +40🧬 · Glitch quase garantido"], evento: ["❓", "Anomalia", "Escolha de alto risco (RPG de texto)"], santuario: ["⛪", "Santuário", (meta.sanct70 ? "Cura 70%" : "Cura 50%") + " do HP do time"] };
  return <div className="flex flex-col gap-4">
    <Panel glow="#B98BFF">
      <div style={{ ...ORB, fontWeight: 900, fontSize: 20, color: "#B98BFF" }}>🕳️ O Abismo de Dados</div>
      <div style={{ fontSize: 12, color: C.mute, lineHeight: 1.6, marginTop: 4 }}>Roguelike de sobrevivência: draft dinâmico, HP persistente e <b>permadeath</b>. Cada andar tem um Mutador do Caos. Gemas: 160💎 únicas a cada 10 andares (first clear) + até <b>800💎/semana</b> em Pontos de Exploração. Fragmentos 🧬 nunca viram gemas.</div>
      <div style={{ fontSize: 11, color: C.dim, marginTop: 6 }}>🧬 {frags} Fragmentos · 💎 semanais: {wkGems}/800 · First clears: {firstClears.length ? firstClears.join(", ") : "nenhum"}</div>
    </Panel>
    {!run ? <>
      <Panel><Btn kind="primary" style={{ width: "100%", padding: "14px 0", fontSize: 16, fontWeight: 900 }} onClick={startAbismo}>🕳️ INICIAR NOVA RUN</Btn>
        <div style={{ fontSize: 11, color: C.mute, marginTop: 8, textAlign: "center" }}>Você começa com 1 Pioneiro(a) aleatório(a) do seu elenco. Recrute nos Drafts após Elites e Chefes.</div></Panel>
      <Panel glow={C.gold}>
        <div style={{ ...ORB, fontWeight: 800, fontSize: 15, marginBottom: 8 }}>🖥️ Mainframe — Meta-progressão permanente</div>
        {ABISMO_META_INFO.map(m => <div key={m.id} className="flex items-center justify-between" style={{ gap: 10, padding: "8px 0", borderBottom: `1px solid ${C.line}55` }}>
          <div style={{ flex: 1 }}><b style={{ fontSize: 13 }}>{m.n}</b><div style={{ fontSize: 11, color: C.mute }}>{m.desc}</div></div>
          {meta[m.id] ? <span style={{ color: C.good, fontWeight: 800, fontSize: 12 }}>✓ ATIVO</span> :
            <Btn kind={frags >= m.cost ? "primary" : "soft"} disabled={frags < m.cost} onClick={() => { setFrags(f => f - m.cost); setMeta(mm => ({ ...mm, [m.id]: true })); flash("🖥️ Mainframe: " + m.n + " instalado!", C.gold); }}>{m.cost}🧬</Btn>}
        </div>)}
      </Panel>
    </> : <>
      <Panel glow="#B98BFF">
        <div className="flex items-center justify-between">
          <div style={{ ...ORB, fontWeight: 900, fontSize: 17 }}>Andar <span style={{ color: "#B98BFF" }}>{run.floor}</span></div>
          <div style={{ fontSize: 12, color: C.mute }}>🪙 {run.gold} · pts {run.points} · 🧬 {run.frags || 0}</div>
        </div>
        <div className="flex gap-2" style={{ marginTop: 10, flexWrap: "wrap" }}>
          {run.team.map(id => { const hp = Math.round((run.hpMap[id] ?? 1) * 100); return <div key={id} style={{ textAlign: "center", minWidth: 64 }}>
            <Avatar ch={ownedMap[id]} size={44} ring={hp > 50 ? C.good : hp > 25 ? C.gold : C.bad} />
            <div style={{ fontSize: 10, fontWeight: 700, marginTop: 2 }}>{CHAR_MAP[id]?.name}</div>
            <div style={{ fontSize: 10, color: hp > 50 ? C.good : C.bad }}>{hp}% HP</div>
          </div>; })}
          {run.dead.map(id => <div key={id} style={{ textAlign: "center", minWidth: 64, opacity: 0.35, filter: "grayscale(1)" }}>
            <Avatar ch={ownedMap[id]} size={44} ring={C.line} /><div style={{ fontSize: 10, marginTop: 2 }}>☠️ {CHAR_MAP[id]?.name}</div>
          </div>)}
        </div>
        {run.glitches.length > 0 && <div style={{ marginTop: 10, fontSize: 11 }}>
          {run.glitches.map(g => <div key={g} style={{ color: C.mute, padding: "2px 0" }}>{ABISMO_GLITCH_INFO[g].r} <b style={{ color: C.text }}>{ABISMO_GLITCH_INFO[g].n}</b> — {ABISMO_GLITCH_INFO[g].desc}</div>)}
        </div>}
        {run.curse > 0 && <div style={{ fontSize: 11, color: "#6FE3FF", marginTop: 6 }}>⚗️ Pesos de Chumbo: -15 VEL por mais {run.curse} combate(s)</div>}
      </Panel>
      {run.pendingDraft && !draftOpts && <Panel glow={C.gold}>
        <div style={{ ...ORB, fontWeight: 800, fontSize: 14, marginBottom: 6 }}>🎴 DRAFT DISPONÍVEL — recrute 1 aliado</div>
        <Btn kind="primary" style={{ width: "100%" }} onClick={openDraft}>Abrir opções de recrutamento</Btn>
      </Panel>}
      {draftOpts && <Panel glow={C.gold}>
        <div style={{ ...ORB, fontWeight: 800, fontSize: 14, marginBottom: 8 }}>Escolha seu recruta:</div>
        <div className="flex gap-2" style={{ flexWrap: "wrap" }}>
          {draftOpts.map(id => <button key={id} onClick={() => pickDraft(id)} style={{ textAlign: "center", minWidth: 84, border: `2px solid ${C.gold}66`, borderRadius: 14, padding: 10, background: C.panelHi, cursor: "pointer" }}>
            <Avatar ch={ownedMap[id]} size={48} ring={C.gold} />
            <div style={{ fontSize: 11, fontWeight: 800, marginTop: 4 }}>{CHAR_MAP[id]?.name}</div>
            <div style={{ fontSize: 9, color: C.mute }}>{CHAR_MAP[id]?.role === "healer" ? "💚 Cura" : CHAR_MAP[id]?.role === "shield" ? "🛡️ Tanque" : CHAR_MAP[id]?.role === "buffer" ? "✨ Suporte" : "⚔️ DPS"}</div>
          </button>)}
        </div>
        <div className="flex gap-2" style={{ marginTop: 8 }}>
          {meta.reroll && !run.rerollUsed && <Btn kind="soft" onClick={() => { setRun(r => ({ ...r, rerollUsed: true })); setDraftOpts(rollDraft({ ...run, rerollUsed: true })); }}>🎲 Reroll (grátis, 1×)</Btn>}
          <Btn kind="soft" onClick={() => pickDraft(null)}>Recusar todos</Btn>
        </div>
      </Panel>}
      {eventNode && <Panel glow="#B98BFF">
        {eventNode === "comerciante" ? <>
          <div style={{ ...ORB, fontWeight: 800, fontSize: 15, marginBottom: 4 }}>🎭 O Comerciante Clandestino</div>
          <div style={{ fontSize: 12, color: C.mute, fontStyle: "italic", marginBottom: 10 }}>"Um terminal piscando no escuro oferece poder em troca da sua força vital."</div>
          <div className="flex flex-col gap-2">
            <Btn kind="soft" onClick={() => resolveEvent("A")}>A · Sacrificar 30% do HP do seu DPS por 1 Glitch Lendário</Btn>
            <Btn kind="soft" disabled={!run.dead.length} onClick={() => resolveEvent("B")}>B · Dar 50% do Ouro para reviver um aliado morto{!run.dead.length ? " (ninguém morreu)" : ""}</Btn>
            <Btn kind="soft" onClick={() => resolveEvent("C")}>C · Ignorar e seguir em frente</Btn>
          </div>
        </> : <>
          <div style={{ ...ORB, fontWeight: 800, fontSize: 15, marginBottom: 4 }}>🎭 O Poço de Dados Corrompido</div>
          <div style={{ fontSize: 12, color: C.mute, fontStyle: "italic", marginBottom: 10 }}>"Uma fonte de dados pura... mas com um leve tom de ferrugem."</div>
          <div className="flex flex-col gap-2">
            <Btn kind="soft" onClick={() => resolveEvent("A")}>A · Beber: cura 100% do time, mas -15 VEL por 3 combates</Btn>
            <Btn kind="soft" onClick={() => resolveEvent("B")}>B · Banhar a arma: +15% CRIT pela run, mas -20% do HP atual do time</Btn>
            <Btn kind="soft" onClick={() => resolveEvent("C")}>C · Ignorar</Btn>
          </div>
        </>}
      </Panel>}
      {!run.pendingDraft && !draftOpts && !eventNode && <Panel>
        <div style={{ ...ORB, fontWeight: 800, fontSize: 14, marginBottom: 8 }}>🗺️ Escolha sua rota — Andar {run.floor}{run.floor % 10 === 0 ? " · SETOR DE CHEFE" : ""}</div>
        <div className="flex flex-col gap-2">
          {run.nodeOptions.map((nd, i) => <Btn key={i} kind={nd === "boss" ? "primary" : "soft"} style={{ textAlign: "left", padding: "12px 14px" }} onClick={() => enterNode(nd)}>
            <b>{NODE_UI[nd][0]} {NODE_UI[nd][1]}</b><div style={{ fontSize: 11, color: nd === "boss" ? "#FFD9A0" : C.mute, fontWeight: 400 }}>{NODE_UI[nd][2]}</div>
          </Btn>)}
        </div>
        <Btn kind="soft" style={{ width: "100%", marginTop: 10 }} onClick={() => abismoCashout(run, false)}>🏁 Encerrar a run e resgatar recompensas</Btn>
      </Panel>}
    </>}
  </div>;
}

/* ==========================================================================
   ESPIRAL — Modo de endgame: 2 times, fraquezas aleatórias, reset semanal
   ========================================================================== */
const ESPIRAL_DIFFS = [
  { id: "normal",  label: "Normal",    color: "#43A047", gem: 2000,  waves: 1, level: 60,  desc: "1 onda por metade — Introdução ao Espiral." },
  { id: "hard",    label: "Difícil",   color: "#F9A825", gem: 4000,  waves: 2, level: 75,  desc: "2 ondas por metade — Inimigos mais agressivos." },
  { id: "extreme", label: "Extremo",   color: "#EF6C00", gem: 6000,  waves: 3, level: 85,  desc: "3 ondas por metade — Chefes com mecânicas exclusivas." },
  { id: "apex",    label: "Ápice",     color: "#C62828", gem: 10000, waves: 4, level: 95,  desc: "4 ondas por metade — O limite da ressonância. 10.000💎 na 1ª conquista semanal." },
];
const ESPIRAL_WEEK_MS = 7 * 24 * 3600 * 1000;

function Espiral({ owned, team, ownedMap, espiralClearedAt, espiralWeekSeed, espiralWeaknesses, startEspiral, images, flash }) {
  const [diff, setDiff] = useState("normal");
  const [teamA, setTeamA] = useState([]);
  const [teamB, setTeamB] = useState([]);
  const [tab, setTab] = useState("setup"); // "setup" | "info"

  const seed = espiralWeekSeed();
  const { weakA, weakB } = espiralWeaknesses(seed);
  const cfg = ESPIRAL_DIFFS.find(d => d.id === diff);

  // Reset semanal: limpa flags de limpeza antigas
  const weekKey = seed;
  const clearedA = !!espiralClearedAt[diff + "_" + weekKey];
  const msUntilReset = (() => {
    const now = new Date();
    const jan1 = new Date(now.getFullYear(), 0, 1);
    const dayOfYear = Math.floor((now - jan1) / 86400000);
    const daysUntilMonday = (8 - now.getDay()) % 7 || 7;
    return daysUntilMonday * 24 * 3600 * 1000 - (now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds()) * 1000;
  })();

  const allIds = owned.map(o => o.id);
  const usedA = new Set(teamA);
  const usedB = new Set(teamB);

  function toggleSlot(id, which) {
    if (which === "A") {
      if (usedB.has(id)) { flash("Esse personagem já está no Time B.", "#ff8800"); return; }
      if (usedA.has(id)) { setTeamA(p => p.filter(x => x !== id)); }
      else if (teamA.length < 4) { setTeamA(p => [...p, id]); }
      else { flash("Time A já tem 4 personagens.", "#ff8800"); }
    } else {
      if (usedA.has(id)) { flash("Esse personagem já está no Time A.", "#ff8800"); return; }
      if (usedB.has(id)) { setTeamB(p => p.filter(x => x !== id)); }
      else if (teamB.length < 4) { setTeamB(p => [...p, id]); }
      else { flash("Time B já tem 4 personagens.", "#ff8800"); }
    }
  }

  function launch() {
    if (teamA.length < 1 || teamB.length < 1) { flash("Cada time precisa de pelo menos 1 personagem.", "#ff8800"); return; }
    startEspiral(diff, teamA, teamB);
  }

  // Auto-fill de times padrão do jogador na montagem
  useEffect(() => {
    if (teamA.length === 0 && team.length > 0) setTeamA(team.slice(0, Math.min(4, team.length)));
  }, []); // eslint-disable-line

  const halfHours = Math.max(0, Math.ceil(msUntilReset / 3600000));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {/* Header */}
      <Panel glow="#7B5FFF" style={{ textAlign: "center", padding: "18px 16px" }}>
        <div style={{ ...ORB, fontSize: 26, fontWeight: 900, letterSpacing: 2, color: "#a78bff", textShadow: "0 0 32px #7B5FFF88" }}>🌀 ESPIRAL</div>
        <div style={{ fontSize: 12, color: C.mute, marginTop: 4, lineHeight: 1.6 }}>
          Modo de End-Game · 2 times, fraquezas aleatórias por semana, reset toda segunda-feira<br />
          <span style={{ color: "#a78bff" }}>Fraquezas desta semana:</span>{" "}
          <b style={{ color: "#7CFFB0" }}>Time A: {weakA.map(e => ELEMENTS[e]?.glyph + " " + e).join(", ")}</b>{" · "}
          <b style={{ color: "#86d8ff" }}>Time B: {weakB.map(e => ELEMENTS[e]?.glyph + " " + e).join(", ")}</b>
        </div>
        <div style={{ fontSize: 11, color: C.dim, marginTop: 6 }}>Reset em ~{halfHours}h</div>
      </Panel>

      {/* Dificuldade */}
      <div className="flex gap-2" style={{ flexWrap: "wrap" }}>
        {ESPIRAL_DIFFS.map(d => {
          const clr = d.color;
          const wkCleared = !!espiralClearedAt[d.id + "_" + weekKey];
          return (
            <button key={d.id} onClick={() => setDiff(d.id)}
              style={{ flex: 1, minWidth: 100, border: `2px solid ${diff === d.id ? clr : C.line}`, borderRadius: 14, padding: "10px 8px", background: diff === d.id ? clr + "20" : C.panel, cursor: "pointer", transition: "all .2s", position: "relative" }}>
              <div style={{ fontWeight: 800, fontSize: 13, color: clr }}>{d.label}</div>
              <div style={{ fontSize: 10, color: C.mute, marginTop: 2 }}>Nv {d.level} · {d.waves}× onda</div>
              <div style={{ fontSize: 10, color: "#e8c97a", marginTop: 2 }}>{wkCleared ? "✓ Limpo" : d.gem + "💎 (1ª vez)"}</div>
            </button>
          );
        })}
      </div>

      {cfg && <Panel style={{ fontSize: 12, color: C.mute, padding: "10px 14px" }}>{cfg.desc}</Panel>}

      {/* Seleção de times */}
      <div style={{ fontSize: 12, color: C.mute, marginBottom: -6 }}>
        Selecione até 4 personagens para cada time (sem sobreposição). Clique num personagem para alternar entre os times.
      </div>

      {/* Slots de time */}
      <div className="flex gap-2">
        {[["A", teamA, weakA, "#7CFFB0"], ["B", teamB, weakB, "#86d8ff"]].map(([lbl, tm, weak, clr]) => (
          <Panel key={lbl} style={{ flex: 1, padding: 12 }}>
            <div style={{ fontWeight: 800, fontSize: 13, color: clr, marginBottom: 6 }}>
              Time {lbl} · <span style={{ fontSize: 11, fontWeight: 400, color: C.mute }}>Fraqueza: {weak.map(e => ELEMENTS[e]?.glyph + " " + e).join(", ")}</span>
            </div>
            <div className="flex gap-1" style={{ flexWrap: "wrap", marginBottom: 8, minHeight: 44 }}>
              {tm.length === 0
                ? <div style={{ fontSize: 11, color: C.dim }}>Nenhum selecionado</div>
                : tm.map(id => {
                    const ch = CHAR_MAP[id]; const o = ownedMap[id];
                    const el = ch ? ELEMENTS[ch.element] : { color: C.line };
                    const imgUrl = images && images[id];
                    return (
                      <div key={id} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
                        <div style={{ width: 40, height: 40, borderRadius: 10, overflow: "hidden", border: `2px solid ${el.color}`, background: `radial-gradient(circle at 30% 25%, ${el.color}30, ${C.panelHi})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>
                          {imgUrl ? <img src={imgUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <span>{ch?.avatar || "?"}</span>}
                        </div>
                        <div style={{ fontSize: 9, color: C.mute, maxWidth: 40, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{ch?.name || id}</div>
                      </div>
                    );
                  })}
            </div>
            <div style={{ fontSize: 10, color: C.dim }}>{tm.length}/4 personagens</div>
          </Panel>
        ))}
      </div>

      {/* Grade de personagens */}
      <Panel style={{ padding: 12 }}>
        <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 8 }}>Selecionar personagens</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(64px, 1fr))", gap: 6 }}>
          {allIds.map(id => {
            const ch = CHAR_MAP[id]; const o = ownedMap[id];
            const el = ch ? ELEMENTS[ch.element] : { color: C.line };
            const inA = usedA.has(id); const inB = usedB.has(id);
            const imgUrl = images && images[id];
            return (
              <div key={id} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
                <div style={{ position: "relative" }}>
                  <div onClick={() => toggleSlot(id, "A")} style={{ width: 44, height: 44, borderRadius: 10, overflow: "hidden", border: `2px solid ${inA ? "#7CFFB0" : inB ? "#86d8ff" : el.color + "66"}`, background: `radial-gradient(circle at 30% 25%, ${el.color}22, ${C.panelHi})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, cursor: "pointer", opacity: 1 }}>
                    {imgUrl ? <img src={imgUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <span>{ch?.avatar || "?"}</span>}
                  </div>
                  {inA && <div style={{ position: "absolute", top: -4, right: -4, background: "#7CFFB0", borderRadius: 99, width: 14, height: 14, fontSize: 8, color: "#000", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900 }}>A</div>}
                  {inB && <div style={{ position: "absolute", top: -4, right: -4, background: "#86d8ff", borderRadius: 99, width: 14, height: 14, fontSize: 8, color: "#000", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900 }}>B</div>}
                </div>
                <div style={{ fontSize: 8, color: C.mute, maxWidth: 48, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", textAlign: "center" }}>{ch?.name || id}</div>
                {/* B toggle */}
                {inA && <button onClick={() => toggleSlot(id, "B")} style={{ fontSize: 8, background: "#86d8ff22", border: "1px solid #86d8ff66", borderRadius: 6, color: "#86d8ff", padding: "1px 4px", cursor: "pointer" }}>→B</button>}
                {inB && <button onClick={() => toggleSlot(id, "A")} style={{ fontSize: 8, background: "#7CFFB022", border: "1px solid #7CFFB066", borderRadius: 6, color: "#7CFFB0", padding: "1px 4px", cursor: "pointer" }}>→A</button>}
                {!inA && !inB && (
                  <div className="flex gap-1">
                    <button onClick={() => toggleSlot(id, "A")} style={{ fontSize: 7, background: "#7CFFB015", border: "1px solid #7CFFB044", borderRadius: 4, color: "#7CFFB0", padding: "1px 3px", cursor: "pointer" }}>A</button>
                    <button onClick={() => toggleSlot(id, "B")} style={{ fontSize: 7, background: "#86d8ff15", border: "1px solid #86d8ff44", borderRadius: 4, color: "#86d8ff", padding: "1px 3px", cursor: "pointer" }}>B</button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </Panel>

      {/* Botão de lançar */}
      <Btn onClick={launch} style={{ width: "100%", fontSize: 16, padding: "14px 0", background: `linear-gradient(135deg, #7B5FFF, #4a2fa0)`, color: "#fff" }}>
        🌀 Iniciar Espiral — {cfg?.label} (Time A primeiro)
      </Btn>

      {/* Recompensas */}
      <Panel style={{ padding: 12 }}>
        <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 8 }}>Recompensas semanais</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {ESPIRAL_DIFFS.map(d => {
            const wkStars = espiralClearedAt[d.id + "_" + weekKey] || 0;
            const starStr = wkStars >= 3 ? "⭐⭐⭐" : wkStars >= 2 ? "⭐⭐☆" : wkStars >= 1 ? "⭐☆☆" : null;
            return (
              <div key={d.id} className="flex items-center justify-between" style={{ padding: "6px 10px", borderRadius: 10, background: wkStars > 0 ? d.color + "18" : C.panelHi, border: `1px solid ${wkStars > 0 ? d.color : C.line}` }}>
                <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                  <span style={{ fontWeight: 700, color: d.color, fontSize: 12 }}>{d.label}</span>
                  {starStr ? <span style={{ fontSize: 11 }}>{starStr}</span> : <span style={{ fontSize: 10, color: C.mute }}>Não concluído</span>}
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 12, color: "#e8c97a" }}>{d.gem.toLocaleString()}💎</div>
                  <div style={{ fontSize: 10, color: C.dim }}>3★ = full · 2★ = 60% · 1★ = 30%</div>
                </div>
              </div>
            );
          })}
        </div>
      </Panel>
    </div>
  );
}

/* ==========================================================================
   ROLETA RUSSA — O ÚLTIMO PACTO
   ========================================================================== */
function RouletteEvent({ jade, setJade, rouletteCleared, setRouletteCleared, nextRouletteClaimAt, setNextRouletteClaimAt }) {
  const ST = [
    { b:1, reward:300,  name:"O Convite",       color:"#43A047", risk:"1 de 6",
      pre:  "...Então você aceitou o convite.\nCurioso. Ou desesperado?",
      safe: "Sorte de iniciante. Não confunda com destino.",
      dead: "O gatilho escolheu. Eu apenas observo. Como sempre." },
    { b:1, reward:400,  name:"A Confiança",      color:"#7CB342", risk:"1 de 6",
      pre:  "Sobreviveu.\n*gira o cilindro novamente, sem hesitar*\nVamos ver se foi sorte.",
      safe: "Duas vezes... O vazio parece gostar de você hoje.",
      dead: "A segunda câmara tinha seu nome desde o início." },
    { b:2, reward:500,  name:"A Traição",        color:"#F9A825", risk:"2 de 6",
      pre:  "*desliza uma segunda bala lentamente*\nEstava ficando monótono com apenas uma.",
      safe: "2 em 6 e você ainda respira. Genuinamente impressionante.",
      dead: "A segunda bala sempre soube aonde ia.\nEla tem memória longa." },
    { b:3, reward:600,  name:"O Abismo",         color:"#EF6C00", risk:"3 de 6",
      pre:  "*carrega a terceira*\nMetade. Exatamente metade.\nAcho isso... poético.",
      safe: "...Você está me irritando.\nIsso não costuma acontecer.",
      dead: "Metade das chances eram suas.\nVocê encontrou a parte errada." },
    { b:4, reward:900,  name:"Ponto de Quebra",  color:"#C62828", risk:"4 de 6",
      pre:  "4 câmaras carregadas. Apenas 2 livres.\n*a máscara sorri sob o véu*\nAinda quer continuar, Sobrevivente?",
      safe: "Impossível.\nNinguém chegou tão longe em séculos.\nVocê é... diferente. Odeio isso.",
      dead: "4 chances de morrer. 2 de viver.\nVocê encontrou uma das quatro.\nEra apenas estatística." },
    { b:1, reward:300,  name:"O Último Pacto",   color:"#AD1457", risk:"1 de 6 ✦",
      pre:  "*remove cada bala, uma por uma, em silêncio*\n\n...\n\nDeixa eu ser justa.\nUma só.\nQue o Abismo escolha.",
      safe: "...\n\n*inclina a cabeça lentamente pela primeira vez*\n\nVocê venceu.\n\nEm eras de jogo...\nvocê é o primeiro a honrar o pacto inteiro.\n\nPegue suas gemas, Sobrevivente do Abismo.",
      dead: "Até no último momento...\no Abismo reclamou o que era seu.\n\nTeria sido uma história bonita." },
  ];

  const [stIdx, setStIdx]   = useState(0);
  const [phase, setPhase]   = useState('intro');
  const [accum, setAccum]   = useState(0);
  const [rotation, setRotation] = useState(15);
  const [bpos, setBpos]     = useState([]);
  const [fired, setFired]   = useState(null);
  const [ok, setOk]         = useState(null);
  const [shake, setShake]   = useState(false);
  const [extraWins, setExtraWins] = useState(0); // rodadas extras (0–3)

  const st = ST[stIdx];
  const willEarn = accum + st.reward;
  const stColor  = st.color;

  const isExtraPhase = ['extra_offer','extra_between','extra_npc','extra_dead','extra_jackpot'].includes(phase);

  function doShoot() {
    if (phase === 'spinning') return;
    setPhase('spinning'); setFired(null); setBpos([]); setOk(null);
    // Rodadas extras: sempre 1 bala em 6
    const bullets = isExtraPhase ? 1 : st.b;
    const pool = [0,1,2,3,4,5], positions = [];
    for (let i = 0; i < bullets; i++) { const r = Math.floor(Math.random() * pool.length); positions.push(pool.splice(r,1)[0]); }
    const fc = Math.floor(Math.random() * 6);
    const targetR = (360 - fc * 60 + 360) % 360;
    const delta   = ((targetR - ((rotation % 360) + 360) % 360) + 360) % 360;
    const newRot  = rotation + (5 + Math.floor(Math.random() * 4)) * 360 + delta;
    setRotation(newRot);
    setTimeout(() => {
      const hit = positions.includes(fc);
      setBpos(positions); setFired(fc); setOk(!hit);
      if (hit) {
        setShake(true);
        setTimeout(() => {
          setShake(false);
          if (!isExtraPhase) {
            // Perdeu a fase principal: mantém as gemas já conquistadas e bloqueia o modo por 2 dias
            const COOLDOWN_MS = 2 * 24 * 60 * 60 * 1000;
            if (accum > 0) setJade((j) => j + accum);
            setAccum(0);
            setNextRouletteClaimAt(Date.now() + COOLDOWN_MS);
          }
          setPhase(isExtraPhase ? 'extra_dead' : 'dead');
        }, 1100);
      } else {
        if (isExtraPhase) {
          setExtraWins(w => w + 1);
          setTimeout(() => setPhase('extra_npc'), 600);
        } else {
          setAccum(a => a + st.reward);
          setTimeout(() => setPhase('npc_talk'), 600);
        }
      }
    }, 2500);
  }

  function cashout() {
    const COOLDOWN_MS = 2 * 24 * 60 * 60 * 1000;
    setJade(j => j + accum); setAccum(0); setNextRouletteClaimAt(Date.now() + COOLDOWN_MS); setPhase('done');
  }

  function advance() {
    if (isExtraPhase) {
      // Depois de ganhar rodada extra
      if (extraWins >= 3) {
        setJade(j => j + 800); setPhase('extra_jackpot');
      } else {
        setFired(null); setBpos([]); setOk(null); setPhase('extra_between');
      }
    } else if (stIdx >= 5) {
      const now = Date.now();
      const COOLDOWN_MS = 2 * 24 * 60 * 60 * 1000;
      if (now >= (nextRouletteClaimAt || 0)) {
        setJade(j => j + 1200);
        setNextRouletteClaimAt(now + COOLDOWN_MS);
        setPhase('victory');
      } else {
        setPhase('victory_wait');
      }
    } else {
      setStIdx(s => s + 1); setFired(null); setBpos([]); setOk(null); setPhase('between');
    }
  }

  // NPC dialogue — inclui linhas em português para as rodadas extras
  const extraNpcLines = [
    "...\n\n*ergue um dedo lentamente*\n\nUma rodada a mais.\nUm disparo a mais.\n1 de 6.\n\nVocê quer tentar o Abismo além do pacto?",
    "*olha para o cilindro com algo próximo de curiosidade*\n\nDuas vezes além do limite.\nNinguém faz isso.\n\n1 de 6. O Abismo está observando.",
    "*inclina a cabeça devagar — a primeira vez que você a vê se mover assim*\n\nTrês. Você chegou a três.\nSe sobreviver a este...\n\nEu talvez tenha de rever minha opinião sobre a humanidade.",
  ];
  const extraSafeLines = [
    "*pausa longa*\n\n...Você não está brincando, está?\n\nBem. Mais uma rodada, então.",
    "*a máscara se move — ela quase sorriu*\n\nDuas vezes sobreviveu além do pacto.\nIsso não acontecia há séculos.\n\nUma última.",
    "*levanta e inclina a cabeça solenemente*\n\nTrês vezes além do limite.\nVocê venceu o Abismo de dentro.\n\n💎 800 Gemas Extras. Você merece.",
  ];
  const npcText = {
    intro: "Sento-me aqui há eras.\nVocê é o enésimo a sentar nessa cadeira...\n\nMas o primeiro que ainda parece esperançoso.\n\nSeis câmaras. Seis estágios.\nA cada um que vencer, as apostas crescem.\nSe sobreviver a todos os seis... 1200 gemas são suas — mas o Abismo só paga essa recompensa uma vez a cada 2 dias.\n\nSe morrer... você me deve uma história.",
    between: st.pre,
    spinning: isExtraPhase ? (extraNpcLines[extraWins] || extraNpcLines[0]) : st.pre,
    npc_talk: ok ? st.safe : st.dead,
    dead: st.dead,
    victory: ST[5].safe + "\n\n*após um silêncio longo*\n\nO pacto foi honrado... mas o Abismo continua aqui.\nSe quiser tentar além do limite — 3 rodadas opcionais, 1 bala em cada — ganhe as 3 e receba 💎 800 extras.",
    victory_wait: "Você venceu novamente...\nMas o Abismo só paga uma vez a cada dois dias.\n\nVolte quando o cooldown expirar para reclamar suas 1200 gemas.",
    done: "Uma escolha sábia.\nA saída existe para os prudentes.\n\n*acena levemente*\n\nAté a próxima vez, Sobrevivente.",
    extra_offer: extraNpcLines[extraWins] || extraNpcLines[0],
    extra_between: extraWins > 0 ? extraSafeLines[extraWins - 1] : extraNpcLines[0],
    extra_npc: ok ? (extraSafeLines[extraWins - 1] || "...Impressionante.") : "O Abismo reclamou o que era seu.",
    extra_dead: "Aqui termina a ousadia.\n\nVocê foi longe além do pacto.\n\n*a Dama de Branco abaixou a cabeça levemente*\n\nFoi uma honra.",
    extra_jackpot: "*de pé, pela primeira vez em eras*\n\nTrês vezes.\nAlém do pacto.\nAlém do limite.\nAlém do que qualquer um ousou.\n\n💎 800 Gemas Extras. O Abismo reconhece um vencedor.",
  }[phase] ?? (isExtraPhase ? extraNpcLines[extraWins] || "" : st.pre);

  const npcEmoji = ['intro','between'].includes(phase) ? (stIdx >= 4 ? '🩸' : stIdx >= 2 ? '🎭' : '🤍')
    : phase === 'dead' || phase === 'extra_dead' ? '💀'
    : phase === 'victory' || phase === 'extra_jackpot' ? '🫡'
    : ['extra_offer','extra_between'].includes(phase) ? '🎭'
    : ok ? '👁️' : '💀';

  const rouletteOnCooldown = Date.now() < (nextRouletteClaimAt || 0);
    if (rouletteOnCooldown && phase === 'intro') {
      const hoursLeft = Math.max(0, Math.ceil(((nextRouletteClaimAt || 0) - Date.now()) / 3600000));
      return (
        <div style={{ minHeight:320, display:'flex', alignItems:'center', justifyContent:'center', flexDirection:'column', gap:16, textAlign:'center', padding:24 }}>
          <div style={{ fontSize:52 }}>🎭</div>
          <div style={{ ...ORB, fontSize:20, color: C.gold, fontWeight:900 }}>O ÚLTIMO PACTO</div>
          <div style={{ color: C.mute, fontSize:13, lineHeight:1.7 }}>Você já jogou o Pacto recentemente.<br/>O Abismo só permite uma tentativa a cada 2 dias, vença, perca ou saia com as gemas.<br/>Volte em ~{hoursLeft}h para tentar novamente.</div>
        </div>
      );
    }

  return (
    <div style={{ background:`radial-gradient(ellipse at 50% -15%, ${phase==='dead'?'#B71C1C':stColor}44, #060610 62%)`, minHeight:'85vh', paddingBottom:60 }}>
      <style dangerouslySetInnerHTML={{ __html:`
        @keyframes rlShake{0%,100%{transform:translate(0,0)}12%{transform:translate(-9px,6px)}25%{transform:translate(8px,-6px)}37%{transform:translate(-7px,5px)}50%{transform:translate(7px,-4px)}62%{transform:translate(-5px,3px)}75%{transform:translate(5px,-3px)}87%{transform:translate(-3px,2px)}}
        @keyframes rlPulse{0%,100%{opacity:.65}50%{opacity:1}}
        @keyframes rlFade{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}}
        @keyframes rlDeathFlash{0%{background:rgba(183,28,28,.55)}60%{background:rgba(183,28,28,.2)}100%{background:transparent}}
        @keyframes rlWinGlow{0%,100%{box-shadow:0 0 20px ${stColor}44}50%{box-shadow:0 0 55px ${stColor}99,0 0 100px ${stColor}22}}
        @keyframes rlSpin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
      `}} />

      {/* DEATH FLASH OVERLAY */}
      {phase==='dead' && shake && <div style={{ position:'fixed',top:0,left:0,right:0,bottom:0,animation:'rlDeathFlash 1.1s ease-out forwards',pointerEvents:'none',zIndex:9999 }} />}

      {/* HEADER */}
      <div style={{ padding:'20px 16px 6px', textAlign:'center' }}>
        <div style={{ ...ORB, fontSize:10, letterSpacing:4, color:stColor, opacity:.85, marginBottom:4 }}>✦ EVENTO PERMANENTE · RECOMPENSA A CADA 2 DIAS ✦</div>
        <div style={{ ...ORB, fontSize:24, fontWeight:900, color:'#f0f0f8', textShadow:`0 0 32px ${phase==='dead'?'#E53935':stColor}88`, letterSpacing:2 }}>O ÚLTIMO PACTO</div>
        <div style={{ fontSize:11, color:C.mute, marginTop:2 }}>com <span style={{ color:stColor, fontWeight:700 }}>A Dama de Branco</span></div>

        {/* Stage bar */}
        <div className="flex gap-1 mt-3" style={{ justifyContent:'center', position:'relative' }}>
          {ST.map((s,i) => (
            <div key={i} style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:3 }}>
              {i===stIdx && <div style={{ fontSize:9, color:stColor, ...ORB, fontWeight:800 }}>{i+1}/6</div>}
              <div style={{ width:34, height:6, borderRadius:4,
                background: i < stIdx ? s.color : i===stIdx ? stColor : '#1e1e2a',
                border:`1px solid ${i===stIdx ? stColor+'99' : '#2a2a3a'}`,
                opacity: i > stIdx ? 0.35 : 1, transition:'all .4s' }} />
              {i===stIdx && <div style={{ fontSize:8, color:stColor, opacity:.7 }}>{s.risk}</div>}
            </div>
          ))}
        </div>
      </div>

      {/* CURRENT STAGE NAME */}
      {phase !== 'dead' && phase !== 'extra_dead' && phase !== 'victory' && phase !== 'victory_wait' && phase !== 'done' && phase !== 'extra_jackpot' && (
        <div style={{ textAlign:'center', margin:'6px 0 2px' }}>
          <div style={{ ...ORB, fontSize:15, fontWeight:900, color:stColor, letterSpacing:1 }}>{isExtraPhase ? `RODADA EXTRA ${extraWins+1}/3` : st.name.toUpperCase()}</div>
        </div>
      )}

      {/* NPC DIALOGUE */}
      <div key={phase+stIdx} style={{ margin:'10px 14px', padding:'12px 14px', background:'rgba(6,6,18,.85)', border:`1px solid ${stColor}2a`, borderRadius:14, animation:'rlFade .4s ease' }}>
        <div className="flex gap-3">
          <div style={{ flexShrink:0, width:48, height:48, borderRadius:12, background:`linear-gradient(135deg,#10061a,#060410)`, border:`2px solid ${stColor}55`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:24, boxShadow:`0 0 14px ${stColor}33` }}>{npcEmoji}</div>
          <div>
            <div style={{ fontSize:9, color:stColor, ...ORB, fontWeight:800, letterSpacing:2, marginBottom:5 }}>A DAMA DE BRANCO</div>
            <div style={{ fontSize:12, color:'#ccd', lineHeight:1.65, whiteSpace:'pre-line' }}>{npcText}</div>
          </div>
        </div>
      </div>

      {/* ─── CYLINDER ─── */}
      {phase !== 'victory' && phase !== 'victory_wait' && phase !== 'done' && (
        <div style={{ display:'flex', flexDirection:'column', alignItems:'center', margin:'16px 0 8px', animation:shake?'rlShake 1.1s ease':'none' }}>
          {/* Pointer */}
          <div style={{ fontSize:20, color:stColor, lineHeight:1, marginBottom:3, filter:`drop-shadow(0 0 6px ${stColor}88)` }}>▼</div>

          {/* Cylinder */}
          <div style={{ position:'relative', width:168, height:168 }}>
            {/* Outer ring glow */}
            <div style={{ position:'absolute', inset:-4, borderRadius:'50%', border:`2px solid ${stColor}22`, boxShadow:phase==='spinning'?`0 0 40px ${stColor}66,0 0 80px ${stColor}22`:`0 0 16px ${stColor}22`, transition:'box-shadow .6s', pointerEvents:'none' }} />

            {/* Rotating cylinder disk */}
            <div style={{
              width:168, height:168, borderRadius:'50%',
              background:'radial-gradient(circle at 36% 30%, #272730, #0e0e18)',
              border:`4px solid ${phase==='spinning'?stColor:'#333'}`,
              transform:`rotate(${rotation}deg)`,
              transition:phase==='spinning'?'transform 2.5s cubic-bezier(0.10,0.82,0.15,1.0)':'border-color .4s',
              position:'relative',
              boxShadow:'0 6px 30px rgba(0,0,0,.9)',
            }}>
              {/* Center hub */}
              <div style={{ position:'absolute', top:'50%', left:'50%', transform:'translate(-50%,-50%)', width:24, height:24, borderRadius:'50%', background:'#1a1a22', border:`2px solid ${stColor}55`, zIndex:2 }} />

              {/* 6 Chambers */}
              {[0,1,2,3,4,5].map(i => {
                const rad = i * Math.PI / 3;
                const cx  = 50 + 36 * Math.sin(rad);
                const cy  = 50 - 36 * Math.cos(rad);
                const isFired  = fired === i;
                const hasBullet= bpos.includes(i);
                const revealed = fired !== null;
                let bg='#111118', border2='#333', glow2='none', content=null;
                if (revealed) {
                  if (isFired && ok)   { bg='#0d2e12'; border2='#43A047'; glow2=`0 0 14px #43A04799`; content=<span style={{fontSize:10,color:'#43A047'}}>○</span>; }
                  if (isFired && !ok)  { bg='#2a0808'; border2='#E53935'; glow2=`0 0 18px #E5393599`; content=<span style={{fontSize:12}}>🔴</span>; }
                  if (!isFired && hasBullet) { bg='#1a0606'; border2='#7B0000'; content=<span style={{fontSize:8,color:'#7B0000'}}>●</span>; }
                }
                return (
                  <div key={i} style={{ position:'absolute', left:`${cx}%`, top:`${cy}%`, transform:'translate(-50%,-50%)', width:30, height:30, borderRadius:'50%', background:bg, border:`2px solid ${border2}`, boxShadow:glow2, display:'flex', alignItems:'center', justifyContent:'center', transition:'all .35s' }}>
                    {content}
                  </div>
                );
              })}
            </div>

            {/* Hammer/firing pin at right */}
            <div style={{ position:'absolute', top:'50%', right:-28, transform:'translateY(-50%)', display:'flex', alignItems:'center', gap:2 }}>
              <div style={{ width:6, height:14, background:'#444', borderRadius:2 }} />
              <div style={{ width:20, height:10, background:'linear-gradient(90deg,#555,#333)', borderRadius:'0 4px 4px 0', border:'1px solid #444' }} />
            </div>
          </div>

          {/* Chamber status */}
          <div style={{ marginTop:10, fontSize:11, color:C.mute, minHeight:20, textAlign:'center' }}>
            {phase==='spinning' && <span style={{ color:stColor, animation:'rlPulse .75s ease infinite' }}>⟳ Girando o cilindro...</span>}
            {fired!==null && ok  && <span style={{ color:'#43A047', fontWeight:700 }}>✓ Câmara {fired+1} — VAZIA</span>}
            {fired!==null && !ok && <span style={{ color:'#E53935', fontWeight:700 }}>✗ Câmara {fired+1} — CARREGADA</span>}
            {phase==='intro' && <span>Pronto para puxar o gatilho?</span>}
          </div>
        </div>
      )}

      {/* ─── REWARD TRACKER ─── */}
      {phase !== 'victory' && phase !== 'victory_wait' && phase !== 'done' && phase !== 'dead' && !isExtraPhase && (
        <div style={{ margin:'4px 14px 12px', padding:'10px 14px', background:'rgba(6,6,18,.7)', border:`1px solid ${stColor}22`, borderRadius:12, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <div>
            <div style={{ fontSize:9, color:C.mute, ...ORB, letterSpacing:1 }}>ACUMULADO</div>
            <div style={{ fontSize:20, fontWeight:900, color:stColor }}>💎 {accum.toLocaleString()}</div>
          </div>
          <div style={{ textAlign:'right' }}>
            <div style={{ fontSize:9, color:C.mute, ...ORB, letterSpacing:1 }}>SE VENCER ESTE ESTÁGIO</div>
            <div style={{ fontSize:13, color:'#aaa', fontWeight:700 }}>+{st.reward} → <span style={{ color:stColor }}>💎 {willEarn.toLocaleString()}</span></div>
            <div style={{ fontSize:9, color:'#555', marginTop:2 }}>bônus por pacto completo: 💎 1200 (a cada 2 dias)</div>
          </div>
        </div>
      )}

      {/* ─── ACTION AREA ─── */}
      <div style={{ padding:'0 14px', display:'flex', flexDirection:'column', gap:10 }}>

        {/* INTRO */}
        {phase==='intro' && (
          <Btn onClick={doShoot} style={{ background:`linear-gradient(135deg,${stColor}cc,${stColor}88)`, border:'none', color:'#fff', fontWeight:900, fontSize:16, letterSpacing:1, padding:'14px 0' }}>
            🔫  Puxar o Gatilho
          </Btn>
        )}

        {/* BETWEEN STAGES (after surviving, before shooting next) */}
        {phase==='between' && (
          <>
            <Btn onClick={doShoot} style={{ background:`linear-gradient(135deg,${stColor}cc,${stColor}88)`, border:'none', color:'#fff', fontWeight:900, fontSize:15, padding:'13px 0' }}>
              🔫  Continuar — Estágio {stIdx+1}/6
            </Btn>
            {accum>0 && (
              <Btn kind="soft" onClick={cashout} style={{ fontSize:13, color:'#999', padding:'10px 0' }}>
                📤  Encerrar e Coletar 💎 {accum.toLocaleString()}
              </Btn>
            )}
          </>
        )}

        {/* AFTER SURVIVING (npc just spoke) */}
        {phase==='npc_talk' && (
          <>
            <Btn onClick={advance} style={{ background:`linear-gradient(135deg,${stColor}cc,${stColor}88)`, border:'none', color:'#fff', fontWeight:900, fontSize:15, padding:'13px 0' }}>
              {stIdx>=5 ? (Date.now() >= (nextRouletteClaimAt || 0) ? '🏆  Receber 💎 1200 — Você Venceu!' : '🏆  Ver Resultado — Pacto Completo') : `⚔️  Avançar → Estágio ${stIdx+2}/6`}
            </Btn>
            {accum>0 && stIdx<5 && (
              <Btn kind="soft" onClick={cashout} style={{ fontSize:13, color:'#999', padding:'10px 0' }}>
                📤  Coletar e Sair — 💎 {accum.toLocaleString()}
              </Btn>
            )}
          </>
        )}

        {/* DEAD */}
        {phase==='dead' && (
          <div style={{ textAlign:'center', padding:'24px 8px', animation:'rlFade .5s ease' }}>
            <div style={{ fontSize:52, marginBottom:10, filter:'drop-shadow(0 0 20px #E5393566)' }}>💀</div>
            <div style={{ ...ORB, fontSize:22, fontWeight:900, color:'#E53935', textShadow:'0 0 28px #E5393599', letterSpacing:2, marginBottom:10 }}>O ABISMO TE RECLAMOU</div>
            <div style={{ fontSize:13, color:C.mute, lineHeight:1.7, marginBottom:6 }}>
              O Último Pacto encerrou aqui.
            </div>
            {accum>0 && (
              <div style={{ fontSize:12, color:'#663030', fontStyle:'italic', marginBottom:16 }}>
                💎 {accum.toLocaleString()} gemas prometidas... dissoltas no vácuo.
              </div>
            )}
            <div style={{ fontSize:11, color:'#444', fontStyle:'italic', marginTop:8 }}>
              A Dama de Branco aguarda em silêncio.<br/>O pacto pode ser refeito a qualquer momento.
            </div>
          </div>
        )}

        {/* VICTORY */}
        {phase==='victory' && (
          <div style={{ textAlign:'center', padding:'24px 8px', animation:'rlFade .5s ease' }}>
            <div style={{ fontSize:52, marginBottom:10, filter:`drop-shadow(0 0 20px ${C.gold}66)` }}>🏆</div>
            <div style={{ ...ORB, fontSize:22, fontWeight:900, color:C.gold, textShadow:`0 0 30px ${C.gold}88`, letterSpacing:2, marginBottom:6 }}>SOBREVIVENTE DO ABISMO</div>
            <div style={{ fontSize:14, color:'#ddd', marginBottom:4 }}>Você honrou todos os 6 estágios do pacto.</div>
            <div style={{ fontSize:28, fontWeight:900, color:stColor, margin:'12px 0', filter:`drop-shadow(0 0 16px ${stColor}88)` }}>💎 1200 Gemas</div>
            <div style={{ fontSize:11, color:'#666', fontStyle:'italic', marginBottom:16 }}>Em eras de jogo, você é o primeiro a vencer.<br/>A Dama de Branco abaixou a cabeça.</div>
            {/* Botão para rodadas extras opcionais */}
            <Btn onClick={() => { setExtraWins(0); setFired(null); setBpos([]); setOk(null); setPhase('extra_offer'); }}
              style={{ background:`linear-gradient(135deg,#4a0e6a,#2a054a)`, border:`1px solid #7b2fc9`, color:'#e0b8ff', fontWeight:900, fontSize:13, padding:'11px 0', marginBottom:6 }}>
              🎲 Tentar Rodadas Extras (opcional) — 3× 1/6, ganhe 💎 800 bônus
            </Btn>
            <div style={{ fontSize:10, color:'#555', fontStyle:'italic' }}>Opcional. Se morrer nas rodadas extras, as 1200 já são suas.</div>
          </div>
        )}

        {/* EXTRA OFFER / EXTRA BETWEEN */}
        {(phase==='extra_offer' || phase==='extra_between') && (
          <>
            <div style={{ textAlign:'center', padding:'4px 0 8px' }}>
              <div style={{ ...ORB, fontSize:12, color:'#b07cff', letterSpacing:2, marginBottom:4 }}>RODADA EXTRA {extraWins+1}/3 — 1 BALA EM 6</div>
              <div style={{ fontSize:11, color:C.mute }}>Ganhe as 3 rodadas extras para receber 💎 800 adicionais</div>
            </div>
            <Btn onClick={doShoot} style={{ background:`linear-gradient(135deg,#4a0e6a,#2a054a)`, border:`1px solid #7b2fc9`, color:'#e0b8ff', fontWeight:900, fontSize:15, padding:'13px 0' }}>
              🔫 Puxar o Gatilho — Extra {extraWins+1}/3
            </Btn>
          </>
        )}

        {/* EXTRA NPC TALK (sobreviveu a rodada extra) */}
        {phase==='extra_npc' && (
          <Btn onClick={advance} style={{ background:`linear-gradient(135deg,#4a0e6a,#2a054a)`, border:`1px solid #7b2fc9`, color:'#e0b8ff', fontWeight:900, fontSize:15, padding:'13px 0' }}>
            {extraWins >= 3 ? '💎 Receber 800 Gemas — Você Venceu o Abismo!' : `⚔️ Continuar — Rodada Extra ${extraWins+1}/3`}
          </Btn>
        )}

        {/* EXTRA DEAD */}
        {phase==='extra_dead' && (
          <div style={{ textAlign:'center', padding:'24px 8px', animation:'rlFade .5s ease' }}>
            <div style={{ fontSize:52, marginBottom:10, filter:'drop-shadow(0 0 20px #9c27b066)' }}>💀</div>
            <div style={{ ...ORB, fontSize:20, fontWeight:900, color:'#9c27b0', letterSpacing:2, marginBottom:8 }}>O ABISMO TEM PACIÊNCIA INFINITA</div>
            <div style={{ fontSize:14, color:'#ddd', marginBottom:4 }}>Rodada extra encerrada aqui.</div>
            <div style={{ fontSize:13, color:'#888', fontStyle:'italic' }}>Suas 1200 gemas do pacto já foram garantidas.<br/>A Dama de Branco acenou levemente.</div>
          </div>
        )}

        {/* EXTRA JACKPOT — venceu as 3 rodadas extras */}
        {phase==='extra_jackpot' && (
          <div style={{ textAlign:'center', padding:'24px 8px', animation:'rlFade .5s ease' }}>
            <div style={{ fontSize:52, marginBottom:10, filter:`drop-shadow(0 0 24px #7b2fc966)` }}>👑</div>
            <div style={{ ...ORB, fontSize:20, fontWeight:900, color:'#b07cff', textShadow:'0 0 30px #7b2fc988', letterSpacing:2, marginBottom:6 }}>MESTRE DO ABISMO</div>
            <div style={{ fontSize:14, color:'#ddd', marginBottom:4 }}>3 rodadas além do pacto. Ninguém chegou tão longe.</div>
            <div style={{ fontSize:28, fontWeight:900, color:'#b07cff', margin:'12px 0', filter:'drop-shadow(0 0 16px #7b2fc966)' }}>💎 800 Gemas Extras</div>
            <div style={{ fontSize:11, color:'#666', fontStyle:'italic' }}>A Dama de Branco ficou de pé pela primeira vez em eras.</div>
          </div>
        )}

        {/* VICTORY WAIT (cooldown active) */}
        {phase==='victory_wait' && (
          <div style={{ textAlign:'center', padding:'24px 8px', animation:'rlFade .5s ease' }}>
            <div style={{ fontSize:52, marginBottom:10, filter:`drop-shadow(0 0 20px ${C.gold}66)` }}>⏳</div>
            <div style={{ ...ORB, fontSize:20, fontWeight:900, color:C.gold, textShadow:`0 0 26px ${C.gold}77`, letterSpacing:2, marginBottom:6 }}>PACTO JÁ RECOMPENSADO</div>
            <div style={{ fontSize:14, color:'#ddd', marginBottom:4 }}>Você venceu novamente, mas o Abismo só concede as 💎 1200 gemas uma vez a cada 2 dias.</div>
            <div style={{ fontSize:11, color:'#666', fontStyle:'italic', marginTop:8 }}>Volte quando o cooldown expirar para reclamar a recompensa outra vez.</div>
          </div>
        )}

        {/* CASHED OUT */}
        {phase==='done' && (
          <div style={{ textAlign:'center', padding:'24px 8px', animation:'rlFade .5s ease' }}>
            <div style={{ fontSize:44, marginBottom:10 }}>📤</div>
            <div style={{ ...ORB, fontSize:20, fontWeight:800, color:C.gold, marginBottom:6 }}>Pacto Encerrado</div>
            <div style={{ fontSize:14, color:'#ddd', lineHeight:1.7 }}>
              Você coletou <b style={{ color:stColor }}>💎 {accum.toLocaleString()}</b> e se retirou com sabedoria.
            </div>
            <div style={{ fontSize:11, color:'#555', fontStyle:'italic', marginTop:10 }}>A Dama de Branco respeita a prudência.</div>
          </div>
        )}
      </div>
    </div>
  );
}

function Correio({ mailClaimed, setMailClaimed, mailIniciante, setMailIniciante, mail2Claimed, claimMail2Reward, mail3Claimed, mail3CharPicked, claimMail3Reward, mail4Claimed, claimMail4Reward, mail5Claimed, claimMail5Reward, mail6Claimed, claimMail6Reward, mail7Claimed, claimMail7Reward, setJade, setExpItems, setWeaponMats, setRelicMats, setAscMats, playerName, towerTop1Claimed, claimTop1Reward, flash, owned }) {
  const [pickChar3, setPickChar3] = React.useState(null);
  const [pickChar4, setPickChar4] = React.useState(null);
  const [isTop1, setIsTop1] = React.useState(false);
  const [pickChar, setPickChar] = React.useState(null);
  React.useEffect(() => {
    if (towerTop1Claimed || !playerName) return;
    cloudReady.then(async () => {
      try {
        if (!Cloud.ready) return;
        const { collection, getDocs, query, orderBy, limit } = Cloud.fs;
        const snap = await withTimeout(getDocs(query(collection(Cloud.db, "tower_lb"), orderBy("floor", "desc"), limit(1))), 5000, null);
        if (!snap) return;
        let top = null; snap.forEach(d => { if (!top) top = d.data(); });
        if (top && top.name && top.name.trim().toLowerCase() === playerName.trim().toLowerCase()) setIsTop1(true);
      } catch {}
    });
  }, [playerName, towerTop1Claimed]);
  function claimMail() {
    if (mailClaimed) { flash("Correio já coletado!", C.bad); return; }
    // Entrega as recompensas PRIMEIRO, e só então marca como coletado
    setJade((j) => j + 12000);
    setExpItems((v) => v + 200);
    setWeaponMats((v) => v + 200);
    setRelicMats((v) => v + 100);
    setMailClaimed(true);
    try { localStorage.setItem('sr_mail1_claimed_v1', '1'); } catch {}
    flash("📬 Recompensas coletadas! +12.000💎 +200📘 +200⚙️ +100🔷", C.gold);
  }

  function claimMailIniciante() {
    if (mailIniciante) { flash("Correio já coletado!", C.bad); return; }
    setJade((j) => j + 5000);
    setExpItems((v) => v + 300);
    setWeaponMats((v) => v + 150);
    setAscMats((v) => v + 10);
    setMailIniciante(true);
    try { localStorage.setItem('sr_mail_iniciante_v1', '1'); } catch {}
    flash("🌱 Kit do Iniciante coletado! +5.000💎 +300📘 +150⚙️ +10🔶", C.gold);
  }

  const MAIL_INICIANTE_PKG = [
    { icon: "💎", label: "Jade Estelar", value: "5.000" },
    { icon: "📘", label: "Lágrimas de XP (Personagem)", value: "300" },
    { icon: "⚙️", label: "Engrenagens de Arma", value: "150" },
    { icon: "🔶", label: "Núcleos de Ascensão de Personagem", value: "10" },
  ];

  return (
    <div className="flex flex-col gap-4">
      <Panel glow={C.gold}>
        <div style={{ ...ORB, fontSize: 18, fontWeight: 800 }}>📬 Correio</div>
        <div style={{ fontSize: 13, color: C.mute, marginTop: 4 }}>Mensagens e recompensas enviadas pelo sistema.</div>
      </Panel>

      {!mail7Claimed && (
        <Panel glow="#F6C95B">
          <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
            <div style={{ fontSize: 38 }}>💎</div>
            <div style={{ flex: 1 }}>
              <div style={{ ...ORB, fontWeight: 800, fontSize: 15, marginBottom: 6 }}>Presente de Gemas</div>
              <div style={{ fontSize: 13, color: C.mute, lineHeight: 1.65, marginBottom: 14 }}>
                <b style={{ color: C.gold }}>+12.000💎</b> de presente para todos os Pioneiros!
              </div>
              <Btn kind="primary" style={{ width: "100%", padding: "10px 18px", fontWeight: 800 }} onClick={() => claimMail7Reward()}>💎 Coletar</Btn>
            </div>
          </div>
        </Panel>
      )}

      {!mail6Claimed && (
        <Panel glow="#F6C95B">
          <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
            <div style={{ fontSize: 38 }}>💎</div>
            <div style={{ flex: 1 }}>
              <div style={{ ...ORB, fontWeight: 800, fontSize: 15, marginBottom: 6 }}>Grande Bônus de Gemas</div>
              <div style={{ fontSize: 13, color: C.mute, lineHeight: 1.65, marginBottom: 14 }}>
                <b style={{ color: C.gold }}>+16.000💎</b> de presente especial para todos os Pioneiros!
              </div>
              <Btn kind="primary" style={{ width: "100%", padding: "10px 18px", fontWeight: 800 }} onClick={() => claimMail6Reward()}>💎 Coletar</Btn>
            </div>
          </div>
        </Panel>
      )}

      {!mail2Claimed && (
        <Panel glow="#F6C95B">
          <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
            <div style={{ fontSize: 38 }}>🎁</div>
            <div style={{ flex: 1 }}>
              <div style={{ ...ORB, fontWeight: 800, fontSize: 15, marginBottom: 6 }}>Pacote de Recursos</div>
              <div style={{ fontSize: 13, color: C.mute, lineHeight: 1.65, marginBottom: 14 }}>
                <b style={{ color: C.gold }}>+6.000💎</b> · <b>+150📘 Lágrimas de XP</b> · <b>+150⚙️ Engrenagens de Arma</b>
              </div>
              <Btn kind="primary" style={{ width: "100%", padding: "10px 18px", fontWeight: 800 }} onClick={() => claimMail2Reward()}>🎁 Coletar</Btn>
            </div>
          </div>
        </Panel>
      )}

      {!mail3Claimed && (
        <Panel glow="#A78BFA">
          <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
            <div style={{ fontSize: 38 }}>⭐</div>
            <div style={{ flex: 1 }}>
              <div style={{ ...ORB, fontWeight: 800, fontSize: 15, marginBottom: 6 }}>Personagem Especial à Escolha</div>
              <div style={{ fontSize: 13, color: C.mute, lineHeight: 1.65, marginBottom: 14 }}>
                Escolha <b>1 personagem 5★ qualquer</b> do jogo pra entrar direto no seu elenco. Presente especial da equipe Stellar Resonance!
              </div>
              {!pickChar3 ? (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 12 }}>
                  {Object.values(CHAR_MAP).filter(c => c.rarity === 5).map(c => (
                    <Btn key={c.id} kind="soft" style={{ fontSize: 12, padding: "4px 10px" }} onClick={() => setPickChar3(c.id)}>
                      {c.avatar} {c.name}
                    </Btn>
                  ))}
                </div>
              ) : (
                <div style={{ marginBottom: 12 }}>
                  <div style={{ fontSize: 13, color: C.gold, fontWeight: 700, marginBottom: 8 }}>
                    ✓ Selecionado: {CHAR_MAP[pickChar3]?.avatar} {CHAR_MAP[pickChar3]?.name}
                    {owned && owned.some(o => o.id === pickChar3) && (
                      <span style={{ marginLeft: 8, color: "#A78BFA", fontSize: 12 }}>
                        (já possuído — vira E{Math.min(6, ((owned.find(o => o.id === pickChar3)?.eidolon || 0) + 1))})
                      </span>
                    )}
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <Btn kind="soft" style={{ fontSize: 12, padding: "6px 12px" }} onClick={() => setPickChar3(null)}>Trocar</Btn>
                    <Btn kind="primary" style={{ flex: 1, padding: "10px 18px", fontWeight: 800 }} onClick={() => claimMail3Reward(pickChar3)}>⭐ Coletar</Btn>
                  </div>
                </div>
              )}
            </div>
          </div>
        </Panel>
      )}

      {!mail4Claimed && (
        <Panel glow="#F6C95B">
          <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
            <div style={{ fontSize: 38 }}>💎</div>
            <div style={{ flex: 1 }}>
              <div style={{ ...ORB, fontWeight: 800, fontSize: 15, marginBottom: 6 }}>Bônus de Gemas</div>
              <div style={{ fontSize: 13, color: C.mute, lineHeight: 1.65, marginBottom: 14 }}>
                <b style={{ color: C.gold }}>+7.000💎</b> de bônus extra pra você.
              </div>
              <Btn kind="primary" style={{ width: "100%", padding: "10px 18px", fontWeight: 800 }} onClick={() => claimMail4Reward()}>💎 Coletar</Btn>
            </div>
          </div>
        </Panel>
      )}

      {!mail5Claimed && (
        <Panel glow="#F6C95B">
          <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
            <div style={{ fontSize: 38 }}>🎁</div>
            <div style={{ flex: 1 }}>
              <div style={{ ...ORB, fontWeight: 800, fontSize: 15, marginBottom: 6 }}>Personagem à Escolha</div>
              <div style={{ fontSize: 13, color: C.mute, lineHeight: 1.65, marginBottom: 14 }}>
                Escolha <b>1 personagem 5★ qualquer</b> do jogo pra entrar direto no seu elenco.
              </div>
              {!pickChar4 ? (
                <div className="flex gap-2" style={{ flexWrap: "wrap", maxHeight: 260, overflowY: "auto" }}>
                  {ROSTER.filter(c => c.rarity === 5).map(c => (
                    <button key={c.id} onClick={() => setPickChar4(c.id)} style={{ textAlign: "center", width: 72, border: `2px solid ${C.gold}55`, borderRadius: 12, padding: 6, background: C.panelHi, cursor: "pointer" }}>
                      <Avatar ch={c} size={44} ring={C.gold} />
                      <div style={{ fontSize: 9, fontWeight: 700, marginTop: 3, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{c.name}</div>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <Avatar ch={CHAR_MAP[pickChar4]} size={56} ring={C.gold} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 700 }}>{CHAR_MAP[pickChar4]?.name}</div>
                    <button onClick={() => setPickChar4(null)} style={{ color: C.bad, background: "none", border: "none", cursor: "pointer", fontSize: 11 }}>trocar</button>
                  </div>
                  <Btn kind="primary" style={{ padding: "10px 18px", fontWeight: 800 }} onClick={() => claimMail5Reward(pickChar4)}>🎁 Coletar</Btn>
                </div>
              )}
            </div>
          </div>
        </Panel>
      )}

      {isTop1 && !towerTop1Claimed && (
        <Panel glow="#FFD700">
          <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
            <div style={{ fontSize: 38 }}>🏆</div>
            <div style={{ flex: 1 }}>
              <div className="flex items-center gap-2" style={{ marginBottom: 8, flexWrap: "wrap" }}>
                <div style={{ ...ORB, fontWeight: 800, fontSize: 15 }}>🏆 Campeão(ã) da Torre</div>
                <span style={{ background: "#3a2c05", color: "#FFD700", border: "1px solid #FFD700", borderRadius: 99, padding: "2px 10px", fontSize: 11, fontWeight: 700 }}>#1 NO RANKING</span>
              </div>
              <div style={{ fontSize: 13, color: C.mute, lineHeight: 1.65, marginBottom: 14 }}>
                Você é atualmente <b style={{ color: C.text }}>o(a) primeiro(a) colocado(a)</b> no ranking global da Torre! Como prêmio, escolha <b>1 personagem qualquer</b> do jogo e <b>1 arma qualquer</b> — ambos entram direto no seu elenco.
              </div>
              {!pickChar ? (
                <div className="flex gap-2" style={{ flexWrap: "wrap", maxHeight: 260, overflowY: "auto" }}>
                  {ROSTER.map(c => (
                    <button key={c.id} onClick={() => setPickChar(c.id)} style={{ textAlign: "center", width: 72, border: `2px solid ${C.gold}55`, borderRadius: 12, padding: 6, background: C.panelHi, cursor: "pointer" }}>
                      <Avatar ch={c} size={44} ring={C.gold} />
                      <div style={{ fontSize: 9, fontWeight: 700, marginTop: 3, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{c.name}</div>
                    </button>
                  ))}
                </div>
              ) : (
                <>
                  <div style={{ fontSize: 12, color: C.mute, marginBottom: 8 }}>Personagem escolhido: <b style={{ color: C.gold }}>{CHAR_MAP[pickChar]?.name}</b> — <button onClick={() => setPickChar(null)} style={{ color: C.bad, background: "none", border: "none", cursor: "pointer", fontSize: 11 }}>trocar</button></div>
                  <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 6 }}>Escolha a arma:</div>
                  <div className="flex gap-2" style={{ flexWrap: "wrap", maxHeight: 220, overflowY: "auto" }}>
                    {WEAPONS.map(w => (
                      <button key={w.id} onClick={() => claimTop1Reward(pickChar, w.id)} style={{ textAlign: "center", width: 76, border: `2px solid ${C.gold}55`, borderRadius: 12, padding: 6, background: C.panelHi, cursor: "pointer" }}>
                        <WeaponIcon w={w} size={40} />
                        <div style={{ fontSize: 8, fontWeight: 700, marginTop: 3, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{w.name}</div>
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </Panel>
      )}

      <Panel glow={mailClaimed ? C.mute : "#7B5CF6"}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
          <div style={{ fontSize: 38 }}>{mailClaimed ? "✉️" : "📮"}</div>
          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
              <div style={{ ...ORB, fontWeight: 800, fontSize: 15 }}>🎉 Pacote de Boas-vindas</div>
              {mailClaimed && <span style={{ background: C.panelHi, color: C.mute, border: "1px solid " + C.line, borderRadius: 99, padding: "2px 10px", fontSize: 11, fontWeight: 700 }}>COLETADO</span>}
            </div>
            <div style={{ fontSize: 13, color: C.mute, lineHeight: 1.65, marginBottom: 14 }}>
              Obrigado por jogar <b style={{ color: C.text }}>Stellar Resonance</b>! Aqui está o pacote de lançamento para você começar sua jornada com tudo que precisa. Boas lutas, Pioneiro ✦
            </div>
            <div style={{ background: C.panelHi, border: "1px solid " + C.line, borderRadius: 14, padding: 14, marginBottom: 14 }}>
              <div style={{ fontWeight: 700, fontSize: 12, marginBottom: 10, color: C.gold }}>📦 Conteúdo do pacote:</div>
              <div className="flex flex-col gap-3">
                {MAIL_PKG.map((r, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <span style={{ fontSize: 24, width: 32, textAlign: "center" }}>{r.icon}</span>
                    <div style={{ flex: 1, fontWeight: 600 }}>{r.label}</div>
                    <span style={{ fontWeight: 800, color: C.gold, fontSize: 16 }}>×{r.value}</span>
                  </div>
                ))}
              </div>
            </div>
            <Btn disabled={mailClaimed} kind={mailClaimed ? "soft" : "primary"} style={{ width: "100%", padding: "13px 0", fontSize: 15, fontWeight: 800, letterSpacing: 1 }} onClick={claimMail}>
              {mailClaimed ? "✓ Recompensas já coletadas" : "📦 Coletar Recompensas"}
            </Btn>
          </div>
        </div>
      </Panel>

      <Panel glow={mailIniciante ? C.mute : "#4ade80"}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
          <div style={{ fontSize: 38 }}>{mailIniciante ? "✉️" : "🌱"}</div>
          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
              <div style={{ ...ORB, fontWeight: 800, fontSize: 15 }}>🌱 Kit do Iniciante</div>
              {mailIniciante
                ? <span style={{ background: C.panelHi, color: C.mute, border: "1px solid " + C.line, borderRadius: 99, padding: "2px 10px", fontSize: 11, fontWeight: 700 }}>COLETADO</span>
                : <span style={{ background: "#052e16", color: "#4ade80", border: "1px solid #22c55e", borderRadius: 99, padding: "2px 10px", fontSize: 11, fontWeight: 700 }}>DISPONÍVEL</span>}
            </div>
            <div style={{ fontSize: 13, color: C.mute, lineHeight: 1.65, marginBottom: 14 }}>
              Um empurrãozinho pra começar bem: gemas, XP de personagem, engrenagens de arma e núcleos de ascensão. Boa jornada, Pioneiro ✦
            </div>
            <div style={{ background: C.panelHi, border: "1px solid " + C.line, borderRadius: 14, padding: 14, marginBottom: 14 }}>
              <div style={{ fontWeight: 700, fontSize: 12, marginBottom: 10, color: C.gold }}>📦 Conteúdo:</div>
              <div className="flex flex-col gap-3">
                {MAIL_INICIANTE_PKG.map((r, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <span style={{ fontSize: 24, width: 32, textAlign: "center" }}>{r.icon}</span>
                    <div style={{ flex: 1, fontWeight: 600 }}>{r.label}</div>
                    <span style={{ fontWeight: 800, color: C.gold, fontSize: 16 }}>×{r.value}</span>
                  </div>
                ))}
              </div>
            </div>
            <Btn disabled={mailIniciante} kind={mailIniciante ? "soft" : "primary"} style={{ width: "100%", padding: "13px 0", fontSize: 15, fontWeight: 800, letterSpacing: 1 }} onClick={claimMailIniciante}>
              {mailIniciante ? "✓ Recompensas já coletadas" : "📦 Coletar Recompensas"}
            </Btn>
          </div>
        </div>
      </Panel>

      <Panel>
        <div style={{ textAlign: "center", padding: "24px 0" }}>
          <div style={{ fontSize: 34, marginBottom: 8 }}>📭</div>
          <div style={{ color: C.mute, fontSize: 13 }}>Nenhuma outra mensagem por enquanto.<br/>Fique atento a eventos e atualizações futuras!</div>
        </div>
      </Panel>
    </div>
  );
}

/* ==========================================================================
     ROTEIRO - Modo Historia (acessível a todos os jogadores)
     ========================================================================== */
/* ==========================================================================
   TIER LIST — estilo Prydwen: fileiras por tier, cards agrupados, papel/nicho visível
   ========================================================================== */
const ROLE_INFO = {
  dps: { n: "DPS", c: "#FF6B45", icon: "⚔️" }, aoe: { n: "AoE / Controle", c: "#74E8A6", icon: "🌪️" },
  healer: { n: "Suporte de Cura", c: "#6FE3FF", icon: "💚" }, shield: { n: "Suporte de Escudo", c: "#4FC3F7", icon: "🛡️" },
  buffer: { n: "Suporte / Buff", c: "#F6C95B", icon: "✨" }, debuffer: { n: "Debuffer", c: "#B98BFF", icon: "☠️" },
  summoner: { n: "Invocador", c: "#FFE45B", icon: "🐉" },
};
const TIER_INFO = {
  SSS: { c: "#FF3B7C", label: "O topo absoluto — redefinem o teto de poder do jogo, praticamente obrigatórios no endgame de ponta." },
  SS: { c: "#FF9E45", label: "Melhores da atualidade — moldam a meta, valem qualquer investimento." },
  S:  { c: "#F6C95B", label: "Excelentes em quase todo time — carregam conteúdo endgame com facilidade." },
  A:  { c: "#74E8A6", label: "Muito bons, fortes com build correta ou papel específico no time." },
  B:  { c: "#6FE3FF", label: "Sólidos e viáveis — competitivos com investimento ou sinergia certa." },
};
const TIER_LIST_DEFAULT = {
  SSS: ["agumon"],
  SS: ["wonderofyou", "ryoshu"],
  S:  ["miyabi", "yoruichi", "frieren", "soifon", "kiritsugu"],
  A:  ["kaiba", "kirara", "omegamon", "athena", "chopper", "uraraka"],
  B:  ["nanami", "nami", "sakura", "ace", "usopp", "lancer", "renji"],
};
const TIER_ORDER = ["SSS", "SS", "S", "A", "B"];
function TierListScreen({ tierList }) {
  const TL = tierList || TIER_LIST_DEFAULT;
  const [roleFilter, setRoleFilter] = React.useState("all");
  return <div className="flex flex-col gap-4">
    <Panel glow="#F6C95B">
      <div style={{ ...ORB, fontWeight: 900, fontSize: 20 }}>📊 Tier List — Stellar Resonance</div>
      <div style={{ fontSize: 12, color: C.mute, marginTop: 4 }}>Avaliação geral de poder no elenco atual (PvE, endgame: Torre / Espiral / Abismo). Baseada no kit, teto de dano/utilidade e facilidade de build — não substitui sinergia de time.</div>
      <div className="flex gap-2" style={{ flexWrap: "wrap", marginTop: 10 }}>
        <button onClick={() => setRoleFilter("all")} style={{ fontSize: 11, fontWeight: 700, padding: "4px 10px", borderRadius: 99, border: `1px solid ${roleFilter === "all" ? C.gold : C.line}`, background: roleFilter === "all" ? "#3a2c05" : C.panelHi, color: roleFilter === "all" ? C.gold : C.mute, cursor: "pointer" }}>Todos</button>
        {Object.entries(ROLE_INFO).map(([k, r]) => (
          <button key={k} onClick={() => setRoleFilter(k)} style={{ fontSize: 11, fontWeight: 700, padding: "4px 10px", borderRadius: 99, border: `1px solid ${roleFilter === k ? r.c : C.line}`, background: roleFilter === k ? r.c + "22" : C.panelHi, color: roleFilter === k ? r.c : C.mute, cursor: "pointer" }}>{r.icon} {r.n}</button>
        ))}
      </div>
    </Panel>
    {TIER_ORDER.filter(t => TL[t] && TL[t].length).map(tier => {
      const ids = (TL[tier] || []).filter(id => roleFilter === "all" || CHAR_MAP[id]?.role === roleFilter);
      if (!ids.length) return null;
      const ti = TIER_INFO[tier];
      return (
        <Panel key={tier} glow={ti.c}>
          <div className="flex items-center gap-3" style={{ marginBottom: 10 }}>
            <div style={{ ...ORB, fontWeight: 900, fontSize: 26, color: ti.c, width: 54, textAlign: "center", textShadow: `0 0 16px ${ti.c}66` }}>{tier}</div>
            <div style={{ fontSize: 11, color: C.mute, flex: 1 }}>{ti.label}</div>
          </div>
          <div className="flex gap-3" style={{ flexWrap: "wrap" }}>
            {ids.map(id => {
              const c = CHAR_MAP[id]; if (!c) return null;
              const ri = ROLE_INFO[c.role] || { n: c.role, c: C.mute, icon: "✦" };
              const el = ELEMENTS[c.element] || { color: C.line };
              return (
                <div key={id} style={{ width: 96, textAlign: "center", border: `1px solid ${C.line}`, borderRadius: 14, padding: 8, background: C.panelHi }}>
                  <Avatar ch={c} size={56} ring={el.color} />
                  <div style={{ fontSize: 11, fontWeight: 800, marginTop: 5, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{c.name}</div>
                  <div style={{ fontSize: 9, color: ri.c, marginTop: 2 }}>{ri.icon} {ri.n}</div>
                  <div style={{ fontSize: 9, color: C.dim }}>{"★".repeat(c.rarity)}</div>
                </div>
              );
            })}
          </div>
        </Panel>
      );
    })}
    <Panel>
      <div style={{ fontSize: 11, color: C.dim, lineHeight: 1.6 }}>A tier list é atualizada conforme rebalanceamentos e novos personagens chegam ao jogo. Personagens fora dela ainda não foram avaliados formalmente.</div>
    </Panel>
  </div>;
}

/* ==========================================================================
   WIKI — como os efeitos ao longo do tempo (DoTs) funcionam
   ========================================================================== */
const WIKI_DOTS = [
  { n: "Ignis", c: "#FF6B45", icon: "🔥", tag: "Fogo · dano por turno", txt: "Dano no início do turno do alvo. O dano do tick é sempre limitado a no máximo 10% do HP ATUAL do alvo (trava anti-hit-kill — nunca mata sozinho). Enquanto ativo, o ATK do alvo cai 10%: chamas negras consomem a força ofensiva de quem está queimando." },
  { n: "Sangramento", c: "#FF5FC4", icon: "🩸", tag: "Físico · dano ao atacar (sem tick)", txt: "Não causa dano sozinho no início do turno. Em vez disso, toda vez que o alvo sangrando DESFERE um ataque, ele mesmo sofre o dano do sangramento (limitado a 8% do próprio HP atual por golpe). Pune quem insiste em atacar em vez de se curar ou fugir." },
  { n: "Glacier", c: "#6FE3FF", icon: "🧊", tag: "Glacial · dano por turno, acumula 3×", txt: "DoT de dano cheio (sem redução), acumula até 3 camadas no mesmo alvo. Cada camada ativa aumenta em +6% o dano recebido de fontes Glaciais (até +18% com 3 camadas). Ao atingir a 3ª camada, ocorre QUEBRA DE GELEIRA: todas as camadas são consumidas numa detonação única (limitada a 25% do HP atual do alvo)." },
  { n: "Afundamento", c: "#7EA8FF", icon: "🌊", tag: "Chaos/Virus · dano ao ser atingido (sem tick)", txt: "Não causa dano sozinho. Toda vez que o alvo afundado É ATINGIDO por um ataque, sofre dano fixo (a Potência do efeito) e perde 4 de Energia da Ultimate; a Contagem cai 1 a cada acerto. Reaplicar Afundamento no mesmo alvo ACUMULA a potência e soma a contagem, em vez de substituir. Ótimo contra alvos que dependem de Energia para a Suprema." },
  { n: "Veneno", c: "#A6E22E", icon: "☠️", tag: "Virus · dano por turno, acumula 5×", txt: "DoT clássico de dano por turno. Pode acumular até 5 camadas independentes no mesmo alvo, cada uma tickando seu próprio dano — quanto mais reaplicado, mais dano total por rodada." },
  { n: "Choque", c: "#B98BFF", icon: "⚡", tag: "Eletro · dano por turno", txt: "DoT elétrico padrão: dano no início do turno do alvo, sem mecânica de acúmulo especial." },
  { n: "Fulgur Resonance", c: "#FFE45B", icon: "⚡", tag: "Eletro · gatilho por hit direto", txt: "Não causa dano por turno. Quando o alvo eletrizado é atingido por um golpe DIRETO (não-DoT), a corrente estática é induzida: cada hit drena 3 de Energia do alvo e descarrega um arco secundário (15% do dano original) no aliado dele com menor HP. Limitado a 4 ativações por rodada — não trava a Ultimate de um chefe inteiro num só combo." },
  { n: "Aero Sunder", c: "#9FF5C8", icon: "🌪️", tag: "Vento · acumula 5×, colapsa", txt: "Reduz a eficiência de Postura/Escudo do alvo em 8% por camada ativa (até 40% com 5). Ao atingir 5 camadas, ocorre o Colapso: a ação do alvo é atrasada em 20% na barra de turnos e as camadas voltam a 2. O colapso tem cooldown interno de 2 rodadas no mesmo alvo — evita travar o turno dele para sempre." },
  { n: "Corrosão", c: "#7CFFB0", icon: "🧪", tag: "dano por turno que cura o time de quem aplicou", txt: "DoT que, a cada tick, cura os aliados de quem o aplicou em 25% do dano causado." },
  { n: "Ciclone", c: "#74E8A6", icon: "🌀", tag: "Vento · dano por turno", txt: "DoT de vento padrão aplicado por algumas habilidades (ex: Nami)." },
];
function WikiScreen() {
  return <div className="flex flex-col gap-4">
    <Panel glow="#8AA0FF">
      <div style={{ ...ORB, fontWeight: 900, fontSize: 20 }}>📚 Wiki — Efeitos de Combate</div>
      <div style={{ fontSize: 12, color: C.mute, marginTop: 4 }}>Como os efeitos ao longo do tempo (DoTs) e efeitos de gatilho funcionam no motor de batalha.</div>
    </Panel>
    <Panel glow="#F2C245">
      <div style={{ ...ORB, fontWeight: 800, fontSize: 15, marginBottom: 4 }}>⏳ Recarga de Reaplicação de DoT</div>
      <div style={{ fontSize: 12, color: C.mute, lineHeight: 1.75 }}>
        Todo DoT (de qualquer tipo) que <b>termina naturalmente</b> num alvo entra numa recarga de <b>2 turnos inteiros</b> antes de poder ser reaplicado nesse mesmo alvo — evita manter um alvo perpetuamente sob o mesmo efeito só reaplicando sem parar. Enquanto o DoT ainda estiver ATIVO, reaplicar continua funcionando normalmente (acumula/estende); a recarga só entra em ação depois que ele acaba.
      </div>
    </Panel>
    <Panel glow="#8AA0FF">
      <div style={{ ...ORB, fontWeight: 800, fontSize: 15, marginBottom: 4 }}>🔄 Sistema de Ciclos (Torre)</div>
      <div style={{ fontSize: 12, color: C.mute, lineHeight: 1.75 }}>
        Assim como no Honkai: Star Rail, o combate acompanha um relógio global de Valor de Ação: cada 10.000 de VA consumidos entre todos os personagens e inimigos equivale a <b>1 Ciclo</b>. Na Torre, um indicador mostra o ciclo atual e pisca ao trocar. Não há limite de ciclos — é só informativo, pra você comparar a velocidade da sua equipe entre tentativas.
      </div>
    </Panel>
    <Panel glow="#F2C245">
      <div style={{ ...ORB, fontWeight: 800, fontSize: 15, marginBottom: 4 }}>🛡️💢 Sistema de Perfuração (Resistência)</div>
      <div style={{ fontSize: 12, color: C.mute, lineHeight: 1.75 }}>
        Chefes e Elites com fraqueza elemental têm uma <b>barra de Resistência</b> além do HP. Enquanto ela estiver ativa, o inimigo recebe <b>-10% de todo dano</b>. Só ataques do elemento que ele é FRACO consomem a barra: Ataque Básico tira 1 unidade, Perícia 2, Suprema 3 — qualquer personagem consegue quebrar, não só um "boneco de perfuração" dedicado.<br/><br/>
        Ao zerar, ocorre a <b>Perfuração</b>: dano instantâneo baseado no tamanho da barra e no nível de quem quebrou, atraso na ação do inimigo, e um efeito exclusivo do elemento (Fogo queima, Vento lacera acumulando, Glacial congela, Holy atrasa e reduz VEL, Vírus corrói DEF/ATK, Eletro aplica Fulgur Resonance, Chaos marca uma explosão que cresce a cada hit sofrido até estourar no turno do inimigo).<br/><br/>
        A barra se regenera sozinha no início do próximo turno natural do inimigo. Dois atributos de build controlam isso: <b>Efeito de Perfuração</b> (amplifica o dano/atraso/DoT da quebra — não a velocidade) e <b>Eficiência de Perfuração</b> (faz cada ataque tirar mais unidades da barra — esse é o atributo que só personagens dedicados a esse nicho conseguem empilhar alto, 100%+, pra quebrar quase instantaneamente).
      </div>
    </Panel>
    <Panel>
      <div style={{ ...ORB, fontWeight: 800, fontSize: 15, marginBottom: 4 }}>🕒 DoTs de tick clássico vs. DoTs de gatilho</div>
      <div style={{ fontSize: 12, color: C.mute, lineHeight: 1.7 }}>
        A maioria dos efeitos (Ignis, Glacier, Veneno, Choque, Corrosão, Ciclone) causa dano automaticamente no <b>início do turno do alvo afetado</b> — o "tick". Já <b>Sangramento</b>, <b>Afundamento</b> e <b>Fulgur Resonance</b> não têm tick: eles ficam "armados" e disparam quando uma condição acontece (o alvo ataca, o alvo é atingido, etc). <b>Aero Sunder</b> é híbrido: causa dano no tick E acumula até colapsar.
      </div>
    </Panel>
    {WIKI_DOTS.map(d => (
      <Panel key={d.n} glow={d.c}>
        <div className="flex items-center gap-2" style={{ marginBottom: 6 }}>
          <span style={{ fontSize: 22 }}>{d.icon}</span>
          <div>
            <div style={{ ...ORB, fontWeight: 800, fontSize: 14, color: d.c }}>{d.n}</div>
            <div style={{ fontSize: 10, color: C.mute }}>{d.tag}</div>
          </div>
        </div>
        <div style={{ fontSize: 12, color: C.text, lineHeight: 1.65 }}>{d.txt}</div>
      </Panel>
    ))}
    <Panel>
      <div style={{ ...ORB, fontWeight: 800, fontSize: 15, marginBottom: 4 }}>🛡️ Travas Anti-Hit-Kill</div>
      <div style={{ fontSize: 12, color: C.mute, lineHeight: 1.7 }}>
        Todo efeito com potencial de dano explosivo tem um teto: Ignis (10% do HP atual por tick), Sangramento (8% do HP atual do atacante por golpe), Glacier na Quebra de Geleira (25% do HP atual). Isso garante que nenhum DoT sozinho elimine um personagem instantaneamente — o combate sempre dá uma chance de reação.
      </div>
    </Panel>
  </div>;
}

function Roteiro() {
  const [chapter, setChapter] = React.useState(0);

  const STORY_ACTS = [
    {
      title: "ATO I · A Fissura sobre Nova Eridu",
      color: "#60c8ff", icon: "🌆",
      lines: [
        { t: "scene",  txt: "NOVA ERIDU — DISTRITO CENTRAL · NOITE" },
        { t: "action", txt: "A cidade pulsa com seu habitual jazz neon. Hologramas flutuantes vendem cápsulas de comida, androides entregam encomendas e o hum constante dos geradores Ether permeia o ar salgado." },
        { t: "hud",    txt: "[ BGM: Zenless Zone Zero — Hollow Deep ]" },
        { t: "action", txt: "No 37º andar da Sede da Seção 6, Miyabi encerra o último relatório do dia. A katana de gelo permanece apoiada na janela de vidro — reflexo de seu rosto impassível contra as luzes da cidade." },
        { t: "char",   ch: "MIYABI",   txt: "Setenta e dois incidentes de Hollow esta semana. Três a mais que a média. Não é aceitável." },
        { t: "char",   ch: "YANAGI",   txt: "Mais especificamente, 72,4. Mas temos um problema maior: o formulário de dano ambiental do Setor 9 ainda não foi aprovado." },
        { t: "char",   ch: "HARUMASA", txt: "Espera — é quase 23h. Meu turno acabou às 22h. Na verdade, às 21h57. Eu tenho testemunhas." },
        { t: "action", txt: "Uma fissura dimensional corta o céu como vidro rachado. Estática vermelho-violeta expande em ondas — prédios tremem, o forno holográfico de uma lanchonete explode, e o céu se parte em três." },
        { t: "hud",    txt: "[ ALERTA: ANOMALIA DIMENSIONAL — NÍVEL DESCONHECIDO ]" },
        { t: "char",   ch: "YANAGI",   txt: "Energia Ether fora dos parâmetros. Este tipo de fissura não consta em nenhum arquivo da Comissão." },
        { t: "char",   ch: "HARUMASA", txt: "Alguém pode pedir lamen antes de a gente ir morrer?" },
        { t: "char",   ch: "MIYABI",   txt: "Silêncio. [pausa] Movam-se." },
      ],
    },
    {
      title: "ATO II · Battle Royale — Katana × Cartas",
      color: "#B98BFF", icon: "⚔️",
      lines: [
        { t: "scene",  txt: "PRAÇA CENTRAL · DOIS MINUTOS DEPOIS" },
        { t: "action", txt: "A Fissura cobre metade do céu, latejando com energia violeta. Miyabi empunha a katana — o chão ao redor de seus pés congela em cristais hexagonais perfeitos." },
        { t: "hud",    txt: "[ FASE: CONFRONTO DIMENSIONAL — Miyabi vs ??? ]" },
        { t: "action", txt: "Da Fissura emerge uma figura: alta, sobretudo branco, Duel Disk ativo no braço esquerdo. Seto Kaiba desce ao chão como se a gravidade fosse uma sugestão." },
        { t: "char",   ch: "KAIBA",    txt: "Que primitivos. Construíram uma cidade inteira sobre ruínas tecnológicas e chamam de progresso. [ajusta o Duel Disk] Ao menos a hostil me é familiar." },
        { t: "char",   ch: "MIYABI",   txt: "Identifique-se e declare suas intenções." },
        { t: "char",   ch: "KAIBA",    txt: "Seto Kaiba. Kaiba Corporation. Minhas intenções? [pausa longa] Avaliar a competição." },
        { t: "char",   ch: "HARUMASA", txt: "Ele está com um Duel Disk? Como no desenho? [sussurra] Yanagi, você está vendo isso?" },
        { t: "char",   ch: "YANAGI",   txt: "Vejo. E estou calculando os danos estruturais projetados. A estimativa é catastrófica." },
        { t: "action", txt: "Kaiba ergue o Duel Disk. Miyabi reconhece a ameaça e ataca primeiro — três cortes em arco, cada um deixando uma camada de gelo no ar." },
        { t: "char",   ch: "KAIBA",    txt: "Invoco — Blue-Eyes White Dragon. DESTRUIÇÃO DO RAIO EXPLOSIVO." },
        { t: "action", txt: "O dragão branco materializa-se com um rugido que racha janelas por seis quarteirões. Miyabi salta e congela o feixe no meio do ar com um único gesto da katana." },
        { t: "char",   ch: "MIYABI",   txt: "Impressionante. Mas previsível." },
        { t: "hud",    txt: "[ STATUS: IMPASSE — Nenhum dos combatentes está disposto a recuar ]" },
        { t: "char",   ch: "KAIBA",    txt: "[pela primeira vez, um traço de respeito na voz] Você é melhor do que o esperado." },
      ],
    },
    {
      title: "ATO III · O Terceiro Inimigo",
      color: "#FF5FC4", icon: "💀",
      lines: [
        { t: "scene",  txt: "PRAÇA CENTRAL · O IMPASSE QUEBRA" },
        { t: "action", txt: "A Fissura no céu colapsa — mas em vez de fechar, expande. Do vazio entre dimensões emerge algo diferente: forma pura e antimatéria, uma ENTIDADE CLASSE OMEGA." },
        { t: "hud",    txt: "[ NOVA AMEAÇA DETECTADA — CLASSE OMEGA · PROTOCOLO DE EVACUAÇÃO IMEDIATO ]" },
        { t: "action", txt: "A entidade não fala. Ela pulsa. Cada pulso apaga um fragmento da realidade — hologramas somem, concreto se dissolve." },
        { t: "char",   ch: "YANAGI",   txt: "Esta entidade consome a própria estrutura da realidade. Os formulários para isso não existem. Terei que criar um novo do zero." },
        { t: "char",   ch: "HARUMASA", txt: "[pela primeira vez sem reclamar do horário] Ok. Isso é sério. Arco elétrico ativado." },
        { t: "action", txt: "Miyabi e Kaiba param de brigar. Uma trégua não declarada se forma — zero palavras, zero gestos." },
        { t: "char",   ch: "KAIBA",    txt: "Eu detesto trabalho em equipe. [pausa] Mas detesto mais perder." },
        { t: "char",   ch: "MIYABI",   txt: "Proteja a ala sul. Minha equipe cobre o norte." },
        { t: "hud",    txt: "[ BGM: STELLAR RESONANCE — BOSS THEME · VOLUME MÁXIMO ]" },
        { t: "action", txt: "No minuto trinta e três, Miyabi e o Blue-Eyes Ultimate Dragon atacam simultaneamente — gelo e relâmpago fundidos em um único ponto de impacto." },
        { t: "hud",    txt: "[ ENTIDADE CLASSE OMEGA — NEUTRALIZADA ]" },
      ],
    },
    {
      title: "ATO IV · O Monarca e a Pioneira",
      color: "#FFD700", icon: "👑",
      lines: [
        { t: "scene",  txt: "PRAÇA CENTRAL · PÓS-BATALHA" },
        { t: "action", txt: "A poeira baixa. A Fissura fecha-se como uma ferida que cicatriza rápido demais. Nova Eridu permanece de pé — danificada, mas de pé." },
        { t: "char",   ch: "YANAGI",   txt: "Dezoito prédios com dano estrutural parcial, quarenta e dois carros danificados. E o formulário de ocorrência dimensional que terei que criar do zero." },
        { t: "char",   ch: "HARUMASA", txt: "Ia falar que tô com fome, mas agora só quero dormir. As duas coisas." },
        { t: "action", txt: "Kaiba afasta os hologramas residuais com um gesto. O sobretudo branco está imaculado — nem uma mancha." },
        { t: "char",   ch: "KAIBA",    txt: "A cidade tem potencial. A tecnologia Ether é primitiva mas o conceito é sólido. [olha para Miyabi] A força de defesa é... adequada." },
        { t: "char",   ch: "MIYABI",   txt: "'Adequada.' Que elogio generoso." },
        { t: "char",   ch: "KAIBA",    txt: "[baixo, definitivo] Eu vim ver o macaco." },
        { t: "action", txt: "Miyabi não pisca. O gelo ao redor de seus pés expande dois centímetros — involuntário." },
        { t: "char",   ch: "MIYABI",   txt: "[após uma pausa perfeita] Então você o encontrou." },
        { t: "hud",    txt: "[ FIM DO ATO IV — STELLAR RESONANCE × CROSSOVER ARC · 完 ]" },
        { t: "action", txt: "Kaiba sobe de volta ao topo do dragão. A Fissura já fechou. Yanagi já está digitando. Harumasa já está ligando para o lamen. Miyabi olha para o céu vazio." },
        { t: "scene",  txt: "[ PRÓXIMO ARC: A ORIGEM DA ENTIDADE CLASSE OMEGA ]" },
      ],
    },
  ];

  const CH_COLORS = { MIYABI: "#60c8ff", YANAGI: "#B98BFF", HARUMASA: "#FF8C44", KAIBA: "#FFD700" };
  const act = STORY_ACTS[chapter];

  const renderLine = (line, i) => {
    if (line.t === "scene") return (
      <div key={i} style={{ textAlign:"center",padding:"10px 0",fontFamily:"monospace",fontSize:11,color:C.mute,letterSpacing:2,textTransform:"uppercase",borderTop:"1px solid "+C.line,borderBottom:"1px solid "+C.line,margin:"10px 0" }}>{line.txt}</div>
    );
    if (line.t === "hud") return (
      <div key={i} style={{ background:"#00E5CC0d",border:"1px solid #00E5CC33",borderRadius:8,padding:"8px 14px",fontSize:12,color:"#00E5CC",fontFamily:"monospace",margin:"6px 0" }}>{line.txt}</div>
    );
    if (line.t === "action") return (
      <div key={i} style={{ fontSize:13,color:C.mute,lineHeight:1.75,padding:"6px 0",fontStyle:"italic" }}>{line.txt}</div>
    );
    if (line.t === "char") {
      const col = CH_COLORS[line.ch] || C.gold;
      return (
        <div key={i} style={{ margin:"8px 0" }}>
          <span style={{ fontWeight:800,fontSize:12,color:col,letterSpacing:1,textTransform:"uppercase",marginRight:8 }}>{line.ch}</span>
          <span style={{ fontSize:13,color:C.text,lineHeight:1.7 }}>{line.txt}</span>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="flex flex-col gap-4">
      <Panel glow={C.gold}>
        <div style={{ ...ORB, fontSize:18,fontWeight:800 }}>📖 Roteiro</div>
        <div style={{ fontSize:13,color:C.mute,marginTop:4 }}>Stellar Resonance × Crossover Arc — Capítulo I</div>
      </Panel>
      <Panel>
        <div className="flex gap-2 flex-wrap">
          {STORY_ACTS.map((a,i) => (
            <button key={i} onClick={()=>setChapter(i)} style={{ padding:"7px 14px",borderRadius:99,fontWeight:700,fontSize:12,border:"1px solid "+(chapter===i ? a.color : C.line),background:chapter===i ? a.color+"22" : "transparent",color:chapter===i ? a.color : C.mute,cursor:"pointer",transition:"all .2s" }}>
              {a.icon} {a.title.split("·")[0].trim()}
            </button>
          ))}
        </div>
      </Panel>
      <Panel glow={act.color} style={{ borderLeft:"3px solid "+act.color }}>
        <div style={{ ...ORB,fontWeight:800,fontSize:16,color:act.color,marginBottom:2 }}>{act.icon} {act.title}</div>
        <div style={{ width:40,height:2,background:act.color,borderRadius:2,marginBottom:16,opacity:0.6 }} />
        <div className="flex flex-col">
          {act.lines.map((line,i) => renderLine(line,i))}
        </div>
      </Panel>
      <div className="flex gap-2">
        {chapter > 0 && <Btn kind="ghost" style={{ flex:1 }} onClick={()=>setChapter(c=>c-1)}>← Ato Anterior</Btn>}
        {chapter < STORY_ACTS.length - 1 && <Btn kind="primary" style={{ flex:1 }} onClick={()=>setChapter(c=>c+1)}>Próximo Ato →</Btn>}
        {chapter === STORY_ACTS.length - 1 && <div style={{ flex:1,textAlign:"center",padding:"10px",color:C.mute,fontSize:13,background:C.panelHi,borderRadius:12 }}>Fim do Arco · Novo capítulo em breve</div>}
      </div>
    </div>
  );
}

  
/* ADMIN ROTEIRO - Story mode, admin-only
   ========================================================================== */
function AdminRoteiro() {
  const [chapter, setChapter] = React.useState(0);

  const ACTS = [
    {
      title: "ATO I · A Fissura sobre Nova Eridu",
      color: "#60c8ff", icon: "🌆",
      lines: [
        { t: "scene",  txt: "NOVA ERIDU — DISTRITO CENTRAL · NOITE" },
        { t: "action", txt: "A cidade pulsa com seu habitual jazz neon. Hologramas flutuantes vendem cápsulas de comida, androides entregam encomendas e o hum constante dos geradores Ether permeia o ar salgado." },
        { t: "hud",    txt: "[ BGM: Zenless Zone Zero — Hollow Deep ]" },
        { t: "action", txt: "No 37º andar da Sede da Seção 6, Miyabi encerra o último relatório do dia. A katana de gelo permanece apoiada na janela de vidro — reflexo de seu rosto impassível contra as luzes da cidade." },
        { t: "char",   ch: "MIYABI",   txt: "Setenta e dois incidentes de Hollow esta semana. Três a mais que a média. Não é aceitável." },
        { t: "char",   ch: "YANAGI",   txt: "Mais especificamente, 72,4. Mas temos um problema maior: o formulário de dano ambiental do Setor 9 ainda não foi aprovado. Se não assinarmos até meia-noite, perdemos o reembolso municipal." },
        { t: "char",   ch: "HARUMASA", txt: "Espera — é quase 23h. Meu turno acabou às 22h. Na verdade, às 21h57. Eu tenho testemunhas." },
        { t: "action", txt: "Uma fissura dimensional corta o céu como vidro rachado. Estática vermelho-violeta expande em ondas — prédios tremem, o forno holográfico de uma lanchonete explode, e o céu se parte em três." },
        { t: "hud",    txt: "[ ALERTA: ANOMALIA DIMENSIONAL — NÍVEL DESCONHECIDO ]" },
        { t: "char",   ch: "YANAGI",   txt: "Energia Ether fora dos parâmetros. Este tipo de fissura não consta em nenhum arquivo da Comissão. Vou precisar criar um formulário de ocorrência inédita — levará semanas." },
        { t: "char",   ch: "HARUMASA", txt: "Semanas? Eu tenho fome agora. Alguém pode pedir lamen antes de a gente ir morrer?" },
        { t: "char",   ch: "MIYABI",   txt: "Silêncio. [pausa] Movam-se." },
      ],
    },
    {
      title: "ATO II · Battle Royale — Katana × Cartas",
      color: "#B98BFF", icon: "⚔️",
      lines: [
        { t: "scene",  txt: "PRAÇA CENTRAL · DOIS MINUTOS DEPOIS" },
        { t: "action", txt: "A Seção 6 chega à praça. A Fissura cobre metade do céu, latejando com energia violeta. Miyabi empunha a katana — o chão ao redor de seus pés congela, formando cristais hexagonais perfeitos." },
        { t: "hud",    txt: "[ FASE: CONFRONTO DIMENSIONAL — Miyabi vs ??? ]" },
        { t: "action", txt: "Da Fissura emerge uma figura: alta, sobretudo branco de golas pontiagudas, Duel Disk ativo no braço esquerdo. Seto Kaiba desce ao chão como se a gravidade fosse uma sugestão." },
        { t: "char",   ch: "KAIBA",    txt: "Que primitivos. Construíram uma cidade inteira sobre ruínas tecnológicas e chamam de progresso. [ajusta o Duel Disk] Ao menos a hostil me é familiar." },
        { t: "char",   ch: "MIYABI",   txt: "Identifique-se e declare suas intenções." },
        { t: "char",   ch: "KAIBA",    txt: "Seto Kaiba. Kaiba Corporation. Dono de aproximadamente 34% do mercado global de tecnologia holográfica — incluindo, presumo, os brinquedos que vocês chamam de sistema de defesa. Minhas intenções? [pausa longa] Avaliar a competição." },
        { t: "char",   ch: "HARUMASA", txt: "Ele está com um Duel Disk? Como no desenho? [sussurra] Yanagi, você está vendo isso?" },
        { t: "char",   ch: "YANAGI",   txt: "[ajustando óculos, já com prancheta nas mãos] Vejo. E estou calculando os danos estruturais projetados se aquele dispositivo for ativado em área urbana. A estimativa é catastrófica." },
        { t: "action", txt: "Kaiba ergue o Duel Disk. Cinco cartas materializam-se no campo — energia sólida, hologramas com peso físico real. Miyabi reconhece a ameaça e ataca primeiro." },
        { t: "hud",    txt: "[ BATALHA: MIYABI · Estilo Kamakura Ativo · Partículas de Gelo: MÁXIMO ]" },
        { t: "action", txt: "Ela avança em linha reta — três cortes em arco, cada um deixando uma camada de gelo no ar. Kaiba deflecte com o próprio Duel Disk, usando-o como escudo." },
        { t: "char",   ch: "KAIBA",    txt: "Invoco — Blue-Eyes White Dragon. DESTRUIÇÃO DO RAIO EXPLOSIVO." },
        { t: "action", txt: "O dragão branco materializa-se com um rugido que racha janelas por seis quarteirões. Miyabi salta, congela o feixe de energia no meio do ar com um único gesto da katana." },
        { t: "char",   ch: "MIYABI",   txt: "Impressionante. Mas previsível." },
        { t: "action", txt: "A batalha dura quatro minutos e dezessete segundos. Miyabi é veloz demais para as invocações de Kaiba; Kaiba é imune ao gelo — o sobretudo é feito de fibra cerâmica resistente a variações de temperatura." },
        { t: "hud",    txt: "[ STATUS: IMPASSE — Nenhum dos combatentes está disposto a recuar ]" },
        { t: "char",   ch: "KAIBA",    txt: "[pela primeira vez, um traço de respeito na voz] Você é melhor do que o esperado." },
        { t: "char",   ch: "MIYABI",   txt: "E você é uma ameaça que não consta em nenhum protocolo." },
      ],
    },
    {
      title: "ATO III · O Terceiro Inimigo",
      color: "#FF5FC4", icon: "💀",
      lines: [
        { t: "scene",  txt: "PRAÇA CENTRAL · O IMPASSE QUEBRA" },
        { t: "action", txt: "A Fissura no céu colapsa — mas em vez de fechar, expande. Do vazio entre dimensões emerge algo diferente: não hologramas, não Ether. Forma pura e antimatéria, um ser sem rosto classificado depois como ENTIDADE CLASSE OMEGA." },
        { t: "hud",    txt: "[ NOVA AMEAÇA DETECTADA — CLASSE OMEGA · PROTOCOLO DE EVACUAÇÃO IMEDIATO ]" },
        { t: "action", txt: "A entidade não fala. Ela pulsa. Cada pulso apaga um fragmento da realidade — hologramas somem, concreto se dissolve, e o ar adquire o sabor metálico de algo errado em nível fundamental." },
        { t: "char",   ch: "YANAGI",   txt: "Esta entidade não emite Ether. Ela consome a própria estrutura da realidade. Os formulários para isso não existem. Terei que criar um novo formulário do zero." },
        { t: "char",   ch: "HARUMASA", txt: "[pela primeira vez sem reclamar do horário] Ok. Isso é sério. Arco elétrico ativado. Vou pedir desculpa pelo lamen depois." },
        { t: "action", txt: "Miyabi e Kaiba param de brigar. Uma trégua não declarada se forma no olhar que trocam — zero palavras, zero gestos. A linguagem universal dos que reconhecem um inimigo maior." },
        { t: "char",   ch: "KAIBA",    txt: "Eu detesto trabalho em equipe. [pausa] Mas detesto mais perder." },
        { t: "char",   ch: "MIYABI",   txt: "Proteja a ala sul. Minha equipe cobre o norte." },
        { t: "char",   ch: "KAIBA",    txt: "[sem olhar para ela] Eu sei o que fazer." },
        { t: "action", txt: "A batalha começa de verdade. Miyabi em uma frente, Kaiba com os três Blue-Eyes em outra, Harumasa cobrindo ângulos com flechas de relâmpago, Yanagi dirigindo evacuação e calculando vetores em tempo real." },
        { t: "hud",    txt: "[ BGM: STELLAR RESONANCE — BOSS THEME · VOLUME MÁXIMO ]" },
        { t: "action", txt: "No minuto trinta e três, Miyabi e o Blue-Eyes Ultimate Dragon atacam simultaneamente — gelo e relâmpago fundidos em um único ponto de impacto." },
        { t: "hud",    txt: "[ ENTIDADE CLASSE OMEGA — NEUTRALIZADA · DANO AMBIENTAL: EXTENSIVO ]" },
      ],
    },
    {
      title: "ATO IV · O Monarca e a Pioneira",
      color: "#FFD700", icon: "👑",
      lines: [
        { t: "scene",  txt: "PRAÇA CENTRAL · PÓS-BATALHA" },
        { t: "action", txt: "A poeira baixa. A Fissura fecha-se como uma ferida que cicatriza rápido demais. Nova Eridu permanece de pé — danificada, mas de pé." },
        { t: "char",   ch: "YANAGI",   txt: "Dezoito prédios com dano estrutural parcial, quarenta e dois carros danificados, um gerador de Ether fora de operação. E o formulário de ocorrência dimensional que eu terei que criar do zero. Três dias de papelada, no mínimo." },
        { t: "char",   ch: "HARUMASA", txt: "Ia falar que tô com fome, mas agora só quero dormir. [pausa] As duas coisas." },
        { t: "action", txt: "Kaiba afasta os hologramas residuais com um gesto. O sobretudo branco está imaculado — nem uma mancha. Ele observa a cidade com a expressão de alguém inventariando uma aquisição corporativa." },
        { t: "char",   ch: "KAIBA",    txt: "A cidade tem potencial. A tecnologia Ether é primitiva mas o conceito é sólido. [olha para Miyabi] A força de defesa é... adequada." },
        { t: "char",   ch: "MIYABI",   txt: "'Adequada.' Que elogio generoso." },
        { t: "char",   ch: "KAIBA",    txt: "Não é um elogio. É uma avaliação técnica." },
        { t: "action", txt: "Uma pausa. O vento passa entre eles carregando cinzas e o cheiro de ozônio. Kaiba vira-se para Miyabi — olha diretamente nos seus olhos, com toda a arrogância corporativa e toda a frieza calculista que o definem." },
        { t: "char",   ch: "KAIBA",    txt: "[baixo, definitivo] Eu vim ver o macaco." },
        { t: "action", txt: "Miyabi não pisca. O gelo ao redor de seus pés expande dois centímetros — involuntário. O único sinal de que a frase a atingiu." },
        { t: "char",   ch: "MIYABI",   txt: "[após uma pausa perfeita] Então você o encontrou." },
        { t: "hud",    txt: "[ FIM DO ATO IV — STELLAR RESONANCE × CROSSOVER ARC · 完 ]" },
        { t: "action", txt: "Kaiba sobe de volta ao topo do dragão. A Fissura já fechou. O Blue-Eyes alça voo em direção ao horizonte sem olhar para trás. Yanagi já está digitando. Harumasa já está ligando para o lamen. Miyabi olha para o céu vazio." },
        { t: "scene",  txt: "[ PRÓXIMO ARC: A ORIGEM DA ENTIDADE CLASSE OMEGA ]" },
      ],
    },
  ];

  const CH_COLORS = { MIYABI: "#60c8ff", YANAGI: "#B98BFF", HARUMASA: "#FF8C44", KAIBA: "#FFD700" };
  const act = ACTS[chapter];

  const renderLine = (line, i) => {
    if (line.t === "scene") return (
      <div key={i} style={{ textAlign: "center", padding: "10px 0", fontFamily: "monospace", fontSize: 11, color: C.mute, letterSpacing: 2, textTransform: "uppercase", borderTop: "1px solid " + C.line, borderBottom: "1px solid " + C.line, margin: "10px 0" }}>{line.txt}</div>
    );
    if (line.t === "hud") return (
      <div key={i} style={{ background: "#00E5CC0d", border: "1px solid #00E5CC33", borderRadius: 8, padding: "8px 14px", fontSize: 12, color: "#00E5CC", fontFamily: "monospace", margin: "6px 0" }}>{line.txt}</div>
    );
    if (line.t === "action") return (
      <div key={i} style={{ fontSize: 13, color: C.mute, lineHeight: 1.75, fontStyle: "italic", padding: "4px 0" }}>{line.txt}</div>
    );
    if (line.t === "char") {
      const color = CH_COLORS[line.ch] || C.text;
      return (
        <div key={i} style={{ margin: "10px 0" }}>
          <div style={{ fontWeight: 800, fontSize: 11, color, letterSpacing: 2, marginBottom: 3, textTransform: "uppercase" }}>{line.ch}</div>
          <div style={{ fontSize: 14, color: C.text, lineHeight: 1.65, paddingLeft: 14, borderLeft: "3px solid " + color + "44" }}>{line.txt}</div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="flex flex-col gap-4">
      <Panel glow={C.gold}>
        <div style={{ ...ORB, fontSize: 16, fontWeight: 800 }}>🎬 Roteiro · Stellar Resonance × Crossover Arc</div>
        <p style={{ fontSize: 13, color: C.mute, marginTop: 6, lineHeight: 1.6 }}>Conteúdo exclusivo do Admin. Roteiro completo do Arco de Crossover: Seção 6 × Seto Kaiba × Entidade Classe Omega.</p>
      </Panel>
      <div className="flex gap-2" style={{ flexWrap: "wrap" }}>
        {ACTS.map((a, i) => <TabBtn key={i} active={chapter === i} onClick={() => setChapter(i)}>{a.icon} Ato {i + 1}</TabBtn>)}
      </div>
      <Panel glow={act.color}>
        <div style={{ ...ORB, fontWeight: 800, fontSize: 16, color: act.color, marginBottom: 18 }}>{act.title}</div>
        <div className="flex flex-col">{act.lines.map(renderLine)}</div>
      </Panel>
    </div>
  );
}

function Social({ email, flash }) {
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    (async () => {
      try {
        const accounts = await loadAccounts();
        const entries = await Promise.all(
          Object.entries(accounts).map(async ([em, acc]) => {
            let nick = null;
            try { const sv = await loadSave(saveKeyFor(em)); nick = sv?.playerName || null; } catch {}
            return {
              id: em,
              isAdmin: em === ADMIN_EMAIL,
              isMe: em === email,
              nick: (nick && nick !== "Pioneiro") ? nick : em.split("@")[0],
              lastSeen: acc.lastSeen || acc.created || 0,
            };
          })
        );
        entries.sort((a, b) => b.lastSeen - a.lastSeen);
        setPlayers(entries);
      } catch {}
      setLoading(false);
    })();
  }, [email]);
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
            return (
              <div key={p.id} className="flex items-center justify-between" style={{ padding: "10px 0", borderBottom: `1px solid ${C.line}` }}>
                <div>
                  <div style={{ fontWeight: 700, color: C.text }}>
                    {p.nick}
                    {p.isMe && <span style={{ color: C.mute, fontSize: 11 }}> · você</span>}
                    {p.isAdmin && <Glow color={C.gold}> 👑</Glow>}
                  </div>
                  <span style={{ fontSize: 11, marginTop: 3, display: "inline-block", background: online ? "rgba(0,255,136,0.15)" : "rgba(255,255,255,0.05)", color: online ? C.good : C.mute, padding: "1px 8px", borderRadius: 20, fontWeight: 700 }}>
                    {online ? "ONLINE" : "Offline"}
                  </span>
                </div>
                {!p.isMe && (
                  <button onClick={() => flash(`Solicitação enviada para ${p.nick}! 🤝`, C.good)}
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
