import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const useCartStore = create(
  persist(
    (set, get) => ({
      // --- ESTADOS ---
      items: [],
      favorites: [],
      globalCep: 'Informe seu CEP', 
      selectedShipping: null, 
      tipoPagamento: 'cartao', 
      customer: {
        document: '', 
        addresses: [],
        activeAddressId: null
      },
      
      // --- SETTERS GLOBAIS ---
      setGlobalCep: (cep) => set({ globalCep: cep }),

      // --- FAVORITOS ---
      toggleFavorite: (product) => set((state) => {
        const isFav = state.favorites.find(item => item._id === product._id);
        if (isFav) {
          return { favorites: state.favorites.filter(item => item._id !== product._id) };
        }
        return { favorites: [...state.favorites, product] };
      }),

      // --- CARRINHO (BLINDADO) ---
      addItem: (product) => {
        const { items } = get();
        // SEGURANÇA: Garante que o preço seja salvo como número
        const safePrice = Number(product.price) || 0;
        
        const existingItem = items.find((item) => item.sku === product.sku || item._id === product._id);

        if (existingItem) {
          set({
            items: items.map((item) =>
              (item.sku === product.sku || item._id === product._id)
                ? { ...item, quantity: Number(item.quantity) + 1 }
                : item
            ),
          });
        } else {
          // Salva o item novo com preço numérico garantido
          set({ items: [...items, { ...product, price: safePrice, quantity: 1 }] });
        }
      },

      updateQuantity: (productId, quantity) => {
        if (quantity < 1) return;
        set({
          items: get().items.map((item) =>
            item._id === productId ? { ...item, quantity: Number(quantity) } : item
          ),
        });
      },

      removeItem: (productId, sku) => {
        const newItems = get().items.filter((item) => item._id !== productId && item.sku !== sku);
        set({ 
          items: newItems,
          selectedShipping: newItems.length === 0 ? null : get().selectedShipping 
        });
      },
      
      // --- SETTERS GERAIS ---
      setShipping: (shipping) => set({ selectedShipping: shipping }),
      setTipoPagamento: (tipo) => set({ tipoPagamento: tipo }),
      setDocument: (doc) => set((state) => ({ customer: { ...state.customer, document: doc } })),
      
      // --- ENDEREÇOS ---
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

      // --- CÁLCULO TOTAL (CORREÇÃO DO NAN) ---
      getTotalPrice: () => {
        const { items, selectedShipping, tipoPagamento } = get();
        
        // 1. Soma dos Produtos (Força Number em tudo)
        const subtotalProdutos = items.reduce((total, item) => {
          return total + (Number(item.price) * Number(item.quantity));
        }, 0);

        // 2. Soma do Frete (Força Number)
        const valorFrete = selectedShipping && selectedShipping.price 
          ? Number(selectedShipping.price) 
          : 0;

        // 3. Aplica regra de desconto se houver
        if (tipoPagamento === 'pix' || tipoPagamento === 'boleto') {
          return (subtotalProdutos * 0.9) + valorFrete;
        }

        return subtotalProdutos + valorFrete;
      },
      
      clearCart: () => set({ items: [], selectedShipping: null, tipoPagamento: 'cartao' })
    }),
    { name: 'cart-storage' }
  )
);

export default useCartStore;