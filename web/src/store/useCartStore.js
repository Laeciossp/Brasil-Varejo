import { create } from 'zustand'
import { persist } from 'zustand/middleware'

const useCartStore = create(
  persist(
    (set, get) => ({
      items: [],
      selectedShipping: null, // Armazena objeto completo do frete (inclusive preço 0)
      tipoPagamento: 'cartao', // 'pix' ou 'cartao'
      customer: {
        document: '', 
        addresses: [],
        activeAddressId: null
      },
      
      // Adicionar item preservando todos os dados (incluindo flag de frete grátis)
      addItem: (product) => {
        const items = get().items
        const existingItem = items.find((item) => item._id === product._id)
        if (existingItem) {
          set({ items: items.map((item) => item._id === product._id ? { ...item, quantity: item.quantity + 1 } : item) })
        } else {
          // Garante que logistics e outros campos venham junto
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
          // Se esvaziar o carrinho, limpa o frete selecionado
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

      // LÓGICA DE PREÇO TOTAL (Corrigida e Segura)
      getTotalPrice: () => {
        const { items, selectedShipping, tipoPagamento } = get();
        if (!items || items.length === 0) return 0;

        // 1. Soma dos produtos
        const subtotalProdutos = items.reduce((total, item) => total + (Number(item.price) * item.quantity), 0);
        
        // 2. Valor do frete (Trata string "0.00" ou null como 0)
        const valorFrete = selectedShipping ? Number(selectedShipping.price) : 0;

        // 3. Regra de Desconto
        if (tipoPagamento === 'pix') {
          // 10% de desconto APENAS nos produtos + Frete cheio
          return (subtotalProdutos * 0.9) + valorFrete;
        }

        // Cartão (Sem desconto)
        return subtotalProdutos + valorFrete;
      },
      
      clearCart: () => set({ items: [], selectedShipping: null, tipoPagamento: 'cartao' })
    }),
    { name: 'cart-storage' }
  )
)

export default useCartStore;