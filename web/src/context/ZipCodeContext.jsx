import { createContext, useContext, useState, useEffect } from "react";

const ZipCodeContext = createContext();

export function ZipCodeProvider({ children }) {
  // 1. Ao iniciar, tenta pegar do LocalStorage. Se não tiver, começa vazio.
  const [globalCep, setGlobalCep] = useState(() => {
    const savedCep = localStorage.getItem("palastore_user_cep");
    return savedCep || "";
  });

  // 2. Toda vez que o globalCep mudar, salvamos no LocalStorage
  useEffect(() => {
    if (globalCep) {
      localStorage.setItem("palastore_user_cep", globalCep);
    }
  }, [globalCep]);

  return (
    <ZipCodeContext.Provider value={{ globalCep, setGlobalCep }}>
      {children}
    </ZipCodeContext.Provider>
  );
}

export function useZipCode() {
  return useContext(ZipCodeContext);
}