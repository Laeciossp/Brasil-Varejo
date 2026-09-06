import { create } from 'zustand';

const usePackageStore = create((set, get) => ({
  activeView: 'none', // 'none' (recolhido), 'hotel', 'flight'
  setActiveView: (view) => set({ activeView: view }),

  searchParams: {
    origin: { id: 'SAO', name: 'São Paulo' }, 
    destination: { id: 'RIO', name: 'Rio de Janeiro' }, 
    dateOut: '2026-12-18',
    dateIn: '2026-12-20',
    adults: 2,
    children: 0,
    infants: 0,
    rooms: 1,
    holdBagsIda: 0,
    holdBagsVolta: 0
  },
  setSearchParams: (params) => set((state) => ({ searchParams: { ...state.searchParams, ...params } })),

  flightsResults: [],
  hotelsResults: [],
  transfersResult: null, 

  setFlightsResults: (results) => set({ flightsResults: results }),
  setHotelsResults: (results) => set({ hotelsResults: results }),
  setTransfersResult: (result) => set({ transfersResult: result }),

  selectedFlight: null,
  selectedHotel: null,
  selectedTransfer: null,

  changeSelectedFlight: (flight) => set({ selectedFlight: flight, activeView: 'none' }),
  changeSelectedHotel: (hotel) => set({ selectedHotel: hotel, activeView: 'none' }),
  changeSelectedTransfer: (transfer) => set({ selectedTransfer: transfer, activeView: 'none' }),
  
  removeFlight: () => set({ selectedFlight: null }),
  removeHotel: () => set({ selectedHotel: null }),
  removeTransfer: () => set({ selectedTransfer: null }),

  flightFilters: { stops: 'all' },
  setFlightFilters: (filters) => set((state) => ({ flightFilters: { ...state.flightFilters, ...filters } })),

  hotelFilters: { stars: [], meals: [], freeCancellation: false },
  setHotelFilters: (filters) => set((state) => ({ hotelFilters: { ...state.hotelFilters, ...filters } })),

  isLoading: false,
  setLoading: (loading) => set({ isLoading: loading }),
  error: null,
  setError: (error) => set({ error }),

  getPackageTotals: () => {
    const { selectedFlight, selectedHotel, selectedTransfer, searchParams } = get();
    const totalPax = Math.max(1, (searchParams.adults || 0) + (searchParams.children || 0));

    // Calcula custo de bagagem extra se houver
    const bagCost = ((searchParams.holdBagsIda || 0) + (searchParams.holdBagsVolta || 0)) * 120;

    const flightTotal = selectedFlight ? (Number(selectedFlight.precoBase || selectedFlight.safeTotal || selectedFlight.precoFinal || selectedFlight.price) || 0) + bagCost : 0;
    const hotelTotal = selectedHotel ? (Number(selectedHotel.ofertas?.[0]?.precoVenda || selectedHotel.price) || 0) : 0;
    const transferTotal = selectedTransfer ? (Number(selectedTransfer.precoFinal || selectedTransfer.price) || 0) : 0;

    const totalGeral = flightTotal + hotelTotal + transferTotal;
    const precoPorPessoa = totalGeral / totalPax;

    return { totalGeral, precoPorPessoa, totalPax, bagCost };
  }
}));

export default usePackageStore;