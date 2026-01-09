import { create } from 'zustand'
import { persist } from 'zustand/middleware'

const useCartStore = create(
  persist(
    (set, get) => ({
      items: [],
      
      // Adicionar item
      addItem: (product) => {
        const items = get().items
        const existingItem = items.find((item) => item._id === product._id)

        if (existingItem) {
          // Se já existe, aumenta a quantidade
          const updatedItems = items.map((item) =>
            item._id === product._id
              ? { ...item, quantity: item.quantity + 1 }
              : item
          )
          set({ items: updatedItems })
        } else {
          // Se não existe, adiciona com quantidade 1
          set({ items: [...items, { ...product, quantity: 1 }] })
        }
      },

      // Remover item
      removeItem: (productId) => {
        set({ items: get().items.filter((item) => item._id !== productId) })
      },

      // Atualizar quantidade
      updateQuantity: (productId, quantity) => {
        if (quantity < 1) return
        set({
          items: get().items.map((item) =>
            item._id === productId ? { ...item, quantity } : item
          ),
        })
      },

      // Limpar carrinho
      clearCart: () => set({ items: [] }),

      // Cálculos
      getTotalPrice: () => {
        return get().items.reduce((total, item) => total + (item.price * item.quantity), 0)
      },
      
      getItemsCount: () => {
        return get().items.reduce((count, item) => count + item.quantity, 0)
      }
    }),
    {
      name: 'cart-storage', // Nome no LocalStorage do navegador
    }
  )
)

export default useCartStore