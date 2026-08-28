import { create } from 'zustand';

const usePackageStore = create((set) => ({
  // Qual lista exibir embaixo? 'hotel' ou 'flight'
  activeView: 'hotel',
  setActiveView: (view) => set({ activeView: view }),

  // 1. Dados da Busca Superior
  searchParams: {
    orig: 'SSA', dest: 'JPA',
    origName: 'Salvador', destName: 'João Pessoa',
    dateOut: 'sex. 5 de fev. de 2027', dateIn: 'qui. 11 de fev. de 2027',
    pax: 1
  },

  // 2. Voo Selecionado no Topo
  selectedFlight: {
    id: 1,
    cia: 'GOL',
    outbound: { departure: '14:40', arrival: '16:05', duration: '1h 25m', type: 'Direto' },
    inbound: { departure: '12:05', arrival: '13:40', duration: '1h 35m', type: 'Direto' },
    priceDiff: 0, // Diferença de preço em relação ao pacote base
    basePrice: 1500
  },

  // 3. Hotel Selecionado no Topo
  selectedHotel: {
    id: 1,
    name: 'Guarany Hotel Express',
    stars: 3,
    image: 'https://images.unsplash.com/photo-1611892440504-42a792e24d32?q=80&w=300',
    mealPlan: 'Café da manhã',
    price: 2489 
  },

  // 4. Listas de Opções (Simulando API Restel e Kiwi)
  hotelsList: [
    { id: 1, name: 'Guarany Hotel Express', stars: 3, price: 2489, mealPlan: 'Café da manhã', image: 'https://images.unsplash.com/photo-1611892440504-42a792e24d32?q=80&w=300' },
    { id: 2, name: 'Nord Luxxor Tambaú', stars: 4, price: 3200, mealPlan: 'Meia pensão', image: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?q=80&w=300' },
  ],
  
  flightsList: [
    { id: 1, cia: 'GOL', priceDiff: 0, outbound: { departure: '14:40', arrival: '16:05', duration: '1h 25m', type: 'Direto' }, inbound: { departure: '12:05', arrival: '13:40', duration: '1h 35m', type: 'Direto' } },
    { id: 2, cia: 'AZUL', priceDiff: 250, outbound: { departure: '09:15', arrival: '10:45', duration: '1h 30m', type: 'Direto' }, inbound: { departure: '15:20', arrival: '16:50', duration: '1h 30m', type: 'Direto' } },
  ],

  // 5. Filtros Atuais
  filters: { text: '' },
  setSearchText: (text) => set((state) => ({ filters: { ...state.filters, text } })),
  
  // Ações de Troca
  changeSelectedHotel: (hotel) => set({ selectedHotel: hotel }),
  changeSelectedFlight: (flight) => set({ selectedFlight: flight })
}));

export default usePackageStore;