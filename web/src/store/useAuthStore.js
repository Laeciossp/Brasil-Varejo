import { create } from 'zustand';

const useAuthStore = create((set) => ({
  user: {
    name: 'Cliente Teste',
    email: 'cliente@exemplo.com',
    id: 'user_123456'
  }, // Deixe null para testar deslogado
  isAuthenticated: true,
  
  login: (userData) => set({ user: userData, isAuthenticated: true }),
  logout: () => set({ user: null, isAuthenticated: false }),
}));

export default useAuthStore;