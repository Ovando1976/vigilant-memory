import React, { createContext, useContext, useReducer } from 'react';

/* ---------- state ---------- */
const initialState = { darkMode: false, gtaMode: false };

function reducer(state, action) {
  switch (action.type) {
    case 'TOGGLE_DARK':
      return { ...state, darkMode: !state.darkMode };
    case 'TOGGLE_GTA':
      return { ...state, gtaMode: !state.gtaMode };
    default:
      return state;
  }
}

/* ---------- context ---------- */
const ArgonControllerContext = createContext();

/* ---------- provider ---------- */
export function ArgonControllerProvider({ children }) {
  const value = useReducer(reducer, initialState);
  return (
    <ArgonControllerContext.Provider value={value}>
      {children}
    </ArgonControllerContext.Provider>
  );
}

/* ---------- hook ---------- */
export const useArgonController = () => {
  const ctx = useContext(ArgonControllerContext);
  if (!ctx)
    throw new Error(
      'useArgonController must be used within ArgonControllerProvider',
    );
  return ctx; // [state, dispatch]
};
