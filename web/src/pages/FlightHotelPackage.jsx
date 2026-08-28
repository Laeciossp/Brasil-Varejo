import React from 'react';
import usePackageStore from '../store/usePackageStore';

export default function FlightHotelPackage() {
  const { 
    activeView, setActiveView,
    searchParams, selectedFlight, selectedHotel, 
    hotelsList, flightsList, 
    filters, setSearchText, changeSelectedHotel, changeSelectedFlight 
  } = usePackageStore();

  const packageTotalPrice = selectedFlight.basePrice + selectedHotel.price + selectedFlight.priceDiff;
  const filteredHotels = hotelsList.filter(h => h.name.toLowerCase().includes(filters.text.toLowerCase()));

  return (
    <div className="max-w-[1200px] mx-auto font-sans bg-[#f2f2f2] p-4 md:p-8 min-h-screen">
      
      {/* 1. BARRA DE BUSCA SUPERIOR (BRANCA/CLARA) */}
      <div className="bg-white border border-gray-200 rounded-lg p-3 flex flex-col md:flex-row items-center justify-between shadow-sm mb-6">
        <div className="flex flex-wrap items-center gap-6 w-full md:w-auto">
          
          <div className="flex flex-col">
            <span className="text-[10px] font-bold text-gray-400 uppercase">De</span>
            <span className="font-bold text-sm text-gray-800">{searchParams.origName}</span>
          </div>
          <span className="text-gray-300">↔</span>
          
          <div className="flex flex-col">
            <span className="text-[10px] font-bold text-gray-400 uppercase">Destino</span>
            <span className="font-bold text-sm text-gray-800">{searchParams.destName}</span>
          </div>
          <div className="hidden md:block w-px h-8 bg-gray-200"></div>
          
          <div className="flex flex-col">
            <span className="text-[10px] font-bold text-gray-400 uppercase">Ida</span>
            <span className="font-bold text-sm text-gray-800">{searchParams.dateOut}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] font-bold text-gray-400 uppercase">Volta</span>
            <span className="font-bold text-sm text-gray-800">{searchParams.dateIn}</span>
          </div>
          <div className="hidden md:block w-px h-8 bg-gray-200"></div>

          <div className="flex flex-col">
            <span className="text-[10px] font-bold text-gray-400 uppercase">Passageiros</span>
            <span className="font-bold text-sm text-gray-800">{searchParams.pax}</span>
          </div>
        </div>

        <button className="mt-4 md:mt-0 bg-white hover:bg-gray-50 border border-gray-300 text-gray-700 font-bold py-2 px-6 rounded-lg transition-colors flex items-center gap-2 text-sm shadow-sm">
          <span className="text-purple-600">🔍</span> Trocar
        </button>
      </div>

      {/* 2. CARD DE DESTAQUE: OFERTA SELECIONADA */}
      <div className="border border-gray-200 rounded-xl shadow-sm bg-white overflow-hidden mb-10">
        <div className="px-6 py-3 border-b border-gray-100 flex justify-between items-center">
          <span className="font-bold text-gray-900 text-lg">Oferta selecionada</span>
          <span className="text-sm text-green-600 hidden md:block">Você está economizando tempo e dinheiro ao reservar voo e hotel juntos</span>
        </div>
        
        <div className="p-6 grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
          
          {/* Sessão Hotel */}
          <div className="col-span-1 md:col-span-4 flex gap-4 relative">
            <img src={selectedHotel.image} className="w-28 h-24 object-cover rounded-md border border-gray-200" alt="Hotel" />
            <div className="w-full">
              <div className="flex justify-between items-start mb-1">
                <span className="text-xs font-bold text-gray-800">Hotel</span>
                {/* BOTÃO TROCAR HOTEL */}
                <button 
                  onClick={() => setActiveView('hotel')}
                  className={`text-xs font-medium hover:underline ${activeView === 'hotel' ? 'text-gray-400' : 'text-blue-600'}`}>
                  Trocar
                </button>
              </div>
              <h3 className="font-bold text-gray-900 text-sm leading-tight">{selectedHotel.name} <span className="text-yellow-400">{'★'.repeat(selectedHotel.stars)}</span></h3>
              <p className="text-xs text-gray-600 mt-1">Quarto Standard - {selectedHotel.mealPlan}</p>
              <p className="text-[11px] text-gray-500 mt-1">6 noites, 05/02/2027 - 11/02/2027</p>
            </div>
          </div>

          <div className="hidden md:block col-span-1 border-r border-dashed border-gray-200 h-24 mx-auto"></div>

          {/* Sessão Voo */}
          <div className="col-span-1 md:col-span-4 relative">
             <div className="flex justify-between items-start mb-3">
                <span className="text-xs font-bold text-gray-800">Voo</span>
                {/* BOTÃO TROCAR VOO */}
                <button 
                  onClick={() => setActiveView('flight')}
                  className={`text-xs font-medium hover:underline ${activeView === 'flight' ? 'text-gray-400' : 'text-blue-600'}`}>
                  Trocar
                </button>
             </div>
            
            <div className="flex justify-between items-center mb-3">
              <div className="flex items-center gap-2"><span className="bg-orange-500 text-white text-[10px] px-1 rounded">GOL</span> <span className="font-bold text-sm">{selectedFlight.outbound.departure} <span className="text-xs text-gray-500 font-normal">{searchParams.orig}</span></span></div>
              <div className="flex flex-col items-center flex-1 px-4"><span className="text-[10px] text-gray-400">{selectedFlight.outbound.duration}</span><div className="w-full border-t border-solid border-gray-300 my-0.5"></div><span className="text-[10px] text-green-600">{selectedFlight.outbound.type}</span></div>
              <span className="font-bold text-sm">{selectedFlight.outbound.arrival} <span className="text-xs text-gray-500 font-normal">{searchParams.dest}</span></span>
            </div>

            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2"><span className="bg-orange-500 text-white text-[10px] px-1 rounded">GOL</span> <span className="font-bold text-sm">{selectedFlight.inbound.departure} <span className="text-xs text-gray-500 font-normal">{searchParams.dest}</span></span></div>
              <div className="flex flex-col items-center flex-1 px-4"><span className="text-[10px] text-gray-400">{selectedFlight.inbound.duration}</span><div className="w-full border-t border-solid border-gray-300 my-0.5"></div><span className="text-[10px] text-green-600">{selectedFlight.inbound.type}</span></div>
              <span className="font-bold text-sm">{selectedFlight.inbound.arrival} <span className="text-xs text-gray-500 font-normal">{searchParams.orig}</span></span>
            </div>
          </div>

          <div className="hidden md:block col-span-1 border-r border-dashed border-gray-200 h-24 mx-auto"></div>

          {/* Sessão Preço */}
          <div className="col-span-1 md:col-span-2 text-center">
            <span className="text-xl font-black text-gray-900 block">R$ {packageTotalPrice} <span className="text-xs text-gray-500 font-normal">/pessoa</span></span>
            <span className="text-xs text-gray-500 mb-3 block">Total: R$ {packageTotalPrice * searchParams.pax}</span>
            <button className="w-full bg-[#9158d0] hover:bg-[#7736bf] text-white font-bold py-2.5 rounded-lg transition text-sm">
              Reservar agora
            </button>
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* RENDERIZAÇÃO CONDICIONAL: HOTEL OU VOO */}
      {/* ======================================================== */}
      
      <h2 className="text-xl font-bold text-gray-900 mb-6">
        {activeView === 'hotel' ? 'Selecione o seu hotel' : 'Selecione o seu voo'}
      </h2>
      
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        
        {/* SIDEBAR DE FILTROS DINÂMICA */}
        <div className="col-span-1">
          <span className="text-sm font-medium text-gray-500 mb-4 block">Filtros</span>
          
          {activeView === 'hotel' ? (
            /* Filtros de Hotel */
            <div className="bg-white border border-gray-200 p-4 rounded-lg shadow-sm">
              <label className="text-sm font-bold block mb-2">Nome do alojamento</label>
              <input type="text" placeholder="Buscar..." value={filters.text} onChange={(e) => setSearchText(e.target.value)} className="w-full border border-gray-300 rounded mb-4 p-2 text-sm" />
              <label className="text-sm font-bold block mb-2">Regime</label>
              <label className="flex items-center gap-2 text-sm text-gray-700 mb-2"><input type="checkbox" className="rounded" /> Café da manhã (3)</label>
            </div>
          ) : (
            /* Filtros de Voo (Baseado na sua imagem) */
            <div className="bg-white border border-gray-200 p-4 rounded-lg shadow-sm">
              <label className="text-sm font-bold block mb-3">Escalas</label>
              <label className="flex items-center justify-between text-sm text-gray-700 mb-2"><span><input type="checkbox" className="mr-2" /> Direto</span> <span className="text-gray-400">(1)</span></label>
              <label className="flex items-center justify-between text-sm text-gray-700 mb-2"><span><input type="checkbox" className="mr-2" /> 1 escala</span> <span className="text-gray-400">(986)</span></label>
              <label className="flex items-center justify-between text-sm text-gray-700 mb-6"><span><input type="checkbox" className="mr-2" /> 2 escalas</span> <span className="text-gray-400">(6530)</span></label>
              
              <label className="text-sm font-bold block mb-3">Horário da partida</label>
              <span className="text-xs text-gray-500 block mb-1 uppercase">Ida</span>
              <span className="text-sm font-medium text-gray-800 block">03:35 - 23:55</span>
            </div>
          )}
        </div>

        {/* ÁREA DA LISTA (HOTÉIS OU VOOS) */}
        <div className="col-span-1 md:col-span-3 space-y-4">
          
          {activeView === 'hotel' && (
            filteredHotels.map(hotel => {
              const isSelected = hotel.id === selectedHotel.id;
              return (
                <div key={hotel.id} className={`bg-white rounded-lg flex flex-col md:flex-row shadow-sm ${isSelected ? 'border-2 border-blue-600' : 'border border-gray-200'}`}>
                  {isSelected && <div className="bg-blue-600 text-white text-xs px-3 py-1 absolute rounded-br-lg">✓ Hotel selecionado</div>}
                  <img src={hotel.image} className="w-full md:w-64 h-48 object-cover rounded-l-lg" alt="" />
                  <div className="p-4 flex-1"><h3 className="font-bold">{hotel.name}</h3></div>
                  <div className="p-4 border-l min-w-[200px] text-center">
                    <span className="font-black text-xl block">R$ {selectedFlight.basePrice + hotel.price}</span>
                    <button onClick={() => changeSelectedHotel(hotel)} className="mt-2 w-full bg-[#9158d0] text-white py-2 rounded">Selecionar</button>
                  </div>
                </div>
              )
            })
          )}

          {activeView === 'flight' && (
            <>
              {/* Abas Superiores de Voo */}
              <div className="flex border border-gray-200 rounded-lg bg-white overflow-hidden text-center mb-4">
                <div className="flex-1 py-3 border-b-2 border-blue-600 font-bold text-gray-900 bg-gray-50">Melhor Opção</div>
                <div className="flex-1 py-3 border-b-2 border-transparent text-gray-600 hover:bg-gray-50 cursor-pointer">Mais barata</div>
                <div className="flex-1 py-3 border-b-2 border-transparent text-gray-600 hover:bg-gray-50 cursor-pointer border-l border-gray-200">Mais rápida</div>
              </div>

              {/* Lista de Voos */}
              {flightsList.map(flight => {
                const isSelected = flight.id === selectedFlight.id;
                return (
                  <div key={flight.id} className={`bg-white rounded-lg shadow-sm overflow-hidden ${isSelected ? 'border-2 border-blue-600' : 'border border-gray-200'}`}>
                    {isSelected && <div className="bg-blue-600 text-white text-xs font-bold px-4 py-2">✓ Voo selecionado</div>}
                    
                    <div className="flex flex-col md:flex-row">
                      <div className="p-6 flex-1 flex flex-col justify-center gap-6">
                        
                        <div className="flex items-center gap-6">
                          <span className="text-orange-500 font-black italic text-xl w-16 text-center">{flight.cia}</span>
                          <div className="flex-1 flex justify-between items-center max-w-sm mx-auto">
                            <div className="text-center"><span className="font-bold text-lg">{flight.outbound.departure}</span><p className="text-xs text-gray-500">SSA</p></div>
                            <div className="flex-1 px-4 text-center"><p className="text-[10px] text-gray-400 mb-1">{flight.outbound.duration}</p><div className="border-t border-gray-300"></div><p className="text-[10px] text-green-500 mt-1">{flight.outbound.type}</p></div>
                            <div className="text-center"><span className="font-bold text-lg">{flight.outbound.arrival}</span><p className="text-xs text-gray-500">JPA</p></div>
                          </div>
                        </div>

                        <div className="flex items-center gap-6">
                          <span className="text-orange-500 font-black italic text-xl w-16 text-center">{flight.cia}</span>
                          <div className="flex-1 flex justify-between items-center max-w-sm mx-auto">
                            <div className="text-center"><span className="font-bold text-lg">{flight.inbound.departure}</span><p className="text-xs text-gray-500">JPA</p></div>
                            <div className="flex-1 px-4 text-center"><p className="text-[10px] text-gray-400 mb-1">{flight.inbound.duration}</p><div className="border-t border-gray-300"></div><p className="text-[10px] text-green-500 mt-1">{flight.inbound.type}</p></div>
                            <div className="text-center"><span className="font-bold text-lg">{flight.inbound.arrival}</span><p className="text-xs text-gray-500">SSA</p></div>
                          </div>
                        </div>

                      </div>
                      
                      <div className="bg-white border-t md:border-t-0 md:border-l border-gray-200 p-6 flex flex-col items-center justify-center min-w-[220px]">
                        <span className="text-xs text-gray-500 mb-1">Voo + Hotel</span>
                        <span className="font-bold text-lg text-gray-900">+ R$ {flight.priceDiff} <span className="text-xs font-normal">/Pessoa</span></span>
                        
                        {!isSelected ? (
                          <button onClick={() => changeSelectedFlight(flight)} className="mt-4 w-full bg-[#9158d0] hover:bg-[#7736bf] text-white font-bold py-2 rounded-lg text-sm transition">
                            Selecionar voo
                          </button>
                        ) : (
                          <button disabled className="mt-4 w-full bg-blue-100 text-blue-700 font-bold py-2 rounded-lg text-sm">
                            Selecionado
                          </button>
                        )}
                        <span className="text-xs text-blue-600 mt-3 hover:underline cursor-pointer">Detalhes</span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </>
          )}

        </div>
      </div>
    </div>
  );
}