import { create } from 'zustand'
import { persist } from 'zustand/middleware'

const useCartStore = create(
  persist(
    (set, get) => ({
      items: [],
      selectedShipping: null,
      tipoPagamento: 'cartao', 
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

      removeItem: (productId) => {
        const newItems = get().items.filter((item) => item._id !== productId);
        set({ 
          items: newItems,
          selectedShipping: newItems.length === 0 ? null : get().selectedShipping 
        });
      },
      
      setShipping: (shipping) => set({ selectedShipping: shipping }),
      setTipoPagamento: (tipo) => set({ tipoPagamento: tipo }),
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

      // CORREÇÃO: Desconto apenas sobre os PRODUTOS
      getTotalPrice: () => {
        const { items, selectedShipping, tipoPagamento } = get();
        if (!items || items.length === 0) return 0;

        const subtotalProdutos = items.reduce((total, item) => total + (item.price * item.quantity), 0);
        const valorFrete = selectedShipping ? parseFloat(selectedShipping.price) : 0;

        if (tipoPagamento === 'pix') {
          // 10% de desconto apenas no subtotal, frete integral
          return (subtotalProdutos * 0.9) + valorFrete;
        }

        return subtotalProdutos + valorFrete;
      },
      
      clearCart: () => set({ items: [], selectedShipping: null, tipoPagamento: 'cartao' })
    }),
    { name: 'cart-storage' }
  )
)

export default useCartStore;