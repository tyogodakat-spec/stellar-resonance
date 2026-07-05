import React, { useState, useContext, createContext, useEffect, useReducer, useRef, useCallback, useMemo } from "react";
import ReactDOM from "react-dom/client";
import "./index.css";

// Contexto de imagens
const ImgCtx = createContext();
const ImgProvider = ({ children }) => {
  const [images, setImages] = useState({});
  return <ImgCtx.Provider value={{ images, setImages }}>{children}</ImgCtx.Provider>;
};

// CORES
const C = {
  bg: "#0a0e27",
  bgPanel: "#1a1f3a",
  panelHi: "#252d4a",
  text: "#e8e8e8",
  mute: "#9a9fab",
  bad: "#ff6b6b",
  good: "#51cf66",
  gold: "#ffd700",
  purple: "#9a7dff",
  orange: "#ffb84d",
};

// ELEMENTOS
const ELEMENTS = {
  Fogo: { color: "#ff6b35", glyph: "🔥" },
  Água: { color: "#00a8ff", glyph: "💧" },
  Gelo: { color: "#7dd3fc", glyph: "❄️" },
  Vento: { color: "#22c55e", glyph: "🌪️" },
  Raio: { color: "#fbbf24", glyph: "⚡" },
  Luz: { color: "#fef08a", glyph: "✨" },
  Escuridão: { color: "#a78bfa", glyph: "🌙" },
  Físico: { color: "#d1d5db", glyph: "⚔️" },
};

const STAT_LABEL = {
  atk: "ATQ",
  def: "DEF",
  hp: "VD",
  spd: "VEL",
  crit: "TX.CRIT",
  critDmg: "DMG CRIT",
  elemDmg: "DMG ELEM",
  healBonus: "CURA",
  defIgnore: "IGN.DEF",
  dmgBonus: "DMG BONUS",
  breakEffect: "QUEBRA",
  energyRegen: "REGEN",
  atkFlat: "ATQ",
  defFlat: "DEF",
  hpFlat: "VD",
};

// ============== ATRIBUTOS RELACIONAIS ==============
const MAIN_RANGE = {
  atk: [280, 540],
  def: [140, 270],
  hp: [420, 810],
  spd: [20, 40],
  crit: [8, 32],
  critDmg: [40, 80],
  elemDmg: [28, 54],
  healBonus: [8, 16],
  defIgnore: [8, 32],
  dmgBonus: [8, 32],
  breakEffect: [40, 88],
  energyRegen: [4, 8],
};

// ============== SUBSETS ==============
const SUB_TIERS = {
  atk: [16, 24, 32, 40],
  def: [8, 12, 16, 20],
  hp: [21, 32, 43, 54],
  spd: [1, 2, 3, 4],
  crit: [2, 3, 4, 6],
  critDmg: [5, 8, 10, 16],
  elemDmg: [4, 6, 8, 12],
  healBonus: [2, 3, 4, 7],
  defIgnore: [2, 3, 4, 6],
  dmgBonus: [2, 3, 4, 6],
  breakEffect: [5, 8, 10, 16],
  energyRegen: [1, 2, 3, 4],
  atkFlat: [16, 24, 32, 40],
  defFlat: [8, 12, 16, 20],
  hpFlat: [21, 32, 43, 54],
};

const PCT = { atk: 1, def: 1, hp: 1, spd: 0, crit: 1, critDmg: 1, elemDmg: 1, healBonus: 1, defIgnore: 1, dmgBonus: 1, breakEffect: 1, energyRegen: 1 };

// ============== CONJUNTOS DE RELÍQUIAS ==============
const RELIC_SETS = {
  "Benção Sagrada": "item_relic_holy",
  "Protocolo Ômega": "item_relic_omega",
  "Asas de Borboleta": "item_relic_butterfly",
  "Teia da Agonia": "item_relic_teia",
  "Além do Horizonte": "item_relic_horizonte",
  "Persistência Infinita": "item_relic_persist",
  "Cura Celestial": "item_relic_heal",
  "Chama Eterna": "item_relic_flame",
};

function App() {
  return (
    <ImgProvider>
      <div style={{ backgroundColor: C.bg, color: C.text, minHeight: "100vh" }}>
        <h1>Stellar Resonance</h1>
        {/* Seu conteúdo aqui */}
      </div>
    </ImgProvider>
  );
}

export default App;
