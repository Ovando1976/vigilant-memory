import React, { createContext, useContext, useReducer } from "react";

/* ---------- state ---------- */
const storeKey = "argonPrefs";
const baseState = { darkMode: false, gtaMode: false };

function init(initial) {
  try {
    return JSON.parse(localStorage.getItem(storeKey)) || initial;
  } catch {
    return initial;
  }
}

function reducer(state, action) {
  switch (action.type) {
    case "TOGGLE_DARK": {
      const next = { ...state, darkMode: !state.darkMode };
      try { localStorage.setItem(storeKey, JSON.stringify(next)); } catch {}
      return next;
    }
    case "TOGGLE_GTA": {
      const next = { ...state, gtaMode: !state.gtaMode };
      try { localStorage.setItem(storeKey, JSON.stringify(next)); } catch {}
      return next;
    }
    default:
      return state;
  }
}

/* ---------- context ---------- */
const ArgonControllerContext = createContext();

/* ---------- provider ---------- */
export function ArgonControllerProvider({ children }) {
  const value = useReducer(reducer, baseState, init);
  return (
    <ArgonControllerContext.Provider value={value}>
      {children}
    </ArgonControllerContext.Provider>
  );
}

/* ---------- hook ---------- */
export const useArgonController = () => {
  const ctx = useContext(ArgonControllerContext);
  if (!ctx) throw new Error("useArgonController must be used within ArgonControllerProvider");
  return ctx; // [state, dispatch]
};