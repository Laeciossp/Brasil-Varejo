import { create } from 'zustand'
import { persist } from 'zustand/middleware'

const useCartStore = create(
  persist(
    (set, get) => ({
      items: [],
      selectedShipping: null,
      customer: {
        document: '', 
        addresses: [],
        activeAddressId: null
      },
      
      addItem: (product) => {
        const items = get().items
        const existingItem = items.find((item) => item._id === product._id)
        if (existingItem) {
          set({ items: items.map((item) => item._id === product._id ? { ...item, quantity: item.quantity + 1 } : item) })
        } else {
          set({ items: [...items, { ...product, quantity: 1 }] })
        }
      },

      updateQuantity: (productId, quantity) => {
        if (quantity < 1) return
        set({ items: get().items.map((item) => item._id === productId ? { ...item, quantity } : item) })
      },

      removeItem: (productId) => set({ items: get().items.filter((item) => item._id !== productId) }),
      
      setShipping: (shipping) => set({ selectedShipping: shipping }),

      setDocument: (doc) => set((state) => ({ customer: { ...state.customer, document: doc } })),
      
      addAddress: (address) => set((state) => {
        const newAddress = { ...address, id: Math.random().toString(36).substr(2, 9) };
        return { 
          customer: { 
            ...state.customer, 
            addresses: [...state.customer.addresses, newAddress],
            activeAddressId: newAddress.id 
          } 
        };
      }),

      setActiveAddress: (id) => set((state) => ({ customer: { ...state.customer, activeAddressId: id } })),

      // CORREÇÃO: Zera o preço se o carrinho estiver vazio
      getTotalPrice: () => {
        const { items, selectedShipping } = get();
        if (items.length === 0) return 0;

        const subtotal = items.reduce((total, item) => total + (item.price * item.quantity), 0);
        const shippingPrice = selectedShipping ? parseFloat(selectedShipping.price) : 0;
        return subtotal + shippingPrice;
      },
      
      clearCart: () => set({ items: [], selectedShipping: null })
    }),
    { name: 'cart-storage' }
  )
)

export default useCartStore