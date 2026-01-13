// src/context/ZipCodeContext.jsx
import { createContext, useState, useContext } from "react";

const ZipCodeContext = createContext();

export function ZipCodeProvider({ children }) {
  const [globalCep, setGlobalCep] = useState("");

  return (
    <ZipCodeContext.Provider value={{ globalCep, setGlobalCep }}>
      {children}
    </ZipCodeContext.Provider>
  );
}

export function useZipCode() {
  return useContext(ZipCodeContext);
}