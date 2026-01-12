import { create } from 'zustand'
import { persist } from 'zustand/middleware'

const useCartStore = create(
  persist(
    (set, get) => ({
      // --- ESTADOS ---
      items: [],
      favorites: [],
      globalCep: 'Informe seu CEP', // Estado global persistente do CEP
      selectedShipping: null, 
      tipoPagamento: 'cartao', 
      customer: {
        document: '', 
        addresses: [],
        activeAddressId: null
      },
      
      // --- SETTERS GLOBAIS ---
      setGlobalCep: (cep) => set({ globalCep: cep }),

      // --- LÓGICA DE FAVORITOS ---
      toggleFavorite: (product) => set((state) => {
        const isFav = state.favorites.find(item => item._id === product._id);
        if (isFav) {
          return { favorites: state.favorites.filter(item => item._id !== product._id) };
        }
        return { favorites: [...state.favorites, product] };
      }),

      // --- LÓGICA DO CARRINHO ---
      addItem: (product) => {
        const items = get().items
        const existingItem = items.find((item) => item._id === product._id)
        if (existingItem) {
          set({ items: items.map((item) => item._id === product._id ? { ...item, quantity: item.quantity + 1 } : item) })
        } else {
          // Garante que logistics venha junto se existir no produto
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
      
      // --- SETTERS GERAIS ---
      setShipping: (shipping) => set({ selectedShipping: shipping }),
      
      setTipoPagamento: (tipo) => set({ tipoPagamento: tipo }),
      
      setDocument: (doc) => set((state) => ({ customer: { ...state.customer, document: doc } })),
      
      // --- GESTÃO DE ENDEREÇOS ---
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

      updateAddress: (id, updatedAddress) => set((state) => ({
        customer: {
          ...state.customer,
          addresses: state.customer.addresses.map((addr) => 
            addr.id === id ? { ...updatedAddress, id } : addr 
          )
        }
      })),

      setActiveAddress: (id) => set((state) => ({ customer: { ...state.customer, activeAddressId: id } })),

      // --- CÁLCULOS TOTAIS ---
      getTotalPrice: () => {
        const { items, selectedShipping, tipoPagamento } = get();
        if (!items || items.length === 0) return 0;

        const subtotalProdutos = items.reduce((total, item) => total + (Number(item.price) * item.quantity), 0);
        const valorFrete = selectedShipping ? Number(selectedShipping.price) : 0;

        // Regra: 10% de desconto no PIX/Boleto apenas sobre os produtos
        if (tipoPagamento === 'pix' || tipoPagamento === 'boleto') {
          return (subtotalProdutos * 0.9) + valorFrete;
        }

        return subtotalProdutos + valorFrete;
      },
      
      // Limpa carrinho e frete, reseta pagamento
      clearCart: () => set({ items: [], selectedShipping: null, tipoPagamento: 'cartao' })
    }),
    { name: 'cart-storage' } // Nome no LocalStorage
  )
)

export default useCartStore;