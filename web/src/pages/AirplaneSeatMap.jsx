import React, { useState, useEffect } from 'react';
import { Plane, Info, AlertTriangle } from 'lucide-react';
import { formatCurrency } from '../lib/utils'; 

export default function AirplaneSeatMap({ offerId, onSeatSelect }) {
  const [seatMapData, setSeatMapData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedSeat, setSelectedSeat] = useState(null);
  const [mapUnavailable, setMapUnavailable] = useState(false);

  useEffect(() => {
    const fetchSeatMap = async () => {
      try {
        const baseUrl = import.meta.env.VITE_API_URL || 'https://palastore-flights-api.laeciossp.workers.dev';
        const response = await fetch(`${baseUrl}/seat-maps?offer_id=${offerId}`);
        const data = await response.json();
        
        // Se a API da Duffel trouxer o mapa real da Cia Aérea, usamos ele.
        if (data && data.data && data.data.length > 0) {
          setSeatMapData(data.data[0]); 
        } else {
          // Se a Cia Aérea bloqueou o mapa para esta tarifa, registramos a indisponibilidade.
          setMapUnavailable(true);
        }
      } catch (error) {
        console.error("Erro ao buscar mapa:", error);
        setMapUnavailable(true);
      } finally {
        setLoading(false);
      }
    };

    if (offerId) fetchSeatMap();
  }, [offerId]);

  const handleSeatClick = (seat) => {
    if (seat.type !== 'seat' || !seat.available_services || seat.available_services.length === 0) return;
    
    if (selectedSeat?.designator === seat.designator) {
      setSelectedSeat(null);
      onSeatSelect(null);
      return;
    }

    const price = parseFloat(seat.available_services[0].total_amount) * 1.15; // Mantém sua margem nas poltronas pagas
    const seatInfo = { designator: seat.designator, price, serviceId: seat.available_services[0].id };
    
    setSelectedSeat(seatInfo);
    onSeatSelect(seatInfo); 
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-10 bg-gray-50 rounded-xl border border-gray-100">
        <Plane className="animate-bounce text-purple-400 mb-3" size={32} />
        <p className="text-sm font-bold text-gray-500 uppercase tracking-widest">Carregando Aeronave...</p>
      </div>
    );
  }

  // A TELA DE TRANSPARÊNCIA: Quando a tarifa (ex: Promo/Light) não permite escolha antecipada via API
  if (mapUnavailable || !seatMapData || !seatMapData.cabins || seatMapData.cabins.length === 0) {
    return (
      <div className="bg-orange-50 border border-orange-200 p-5 rounded-xl flex flex-col md:flex-row gap-4 items-center md:items-start text-orange-800 shadow-sm">
        <div className="bg-orange-100 p-3 rounded-full text-orange-600">
           <AlertTriangle size={24} />
        </div>
        <div>
           <h4 className="font-bold text-base mb-1">Mapa de Assentos Indisponível</h4>
           <p className="text-sm">A companhia aérea não disponibilizou a escolha antecipada de assentos para as regras desta tarifa.</p>
           <p className="text-sm font-bold mt-2 text-orange-900">A alocação da sua poltrona será feita gratuitamente no momento do Check-in.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
      <div className="bg-gray-900 text-white p-4 text-center">
        <h3 className="font-black text-lg">Escolha seu Assento</h3>
        <p className="text-xs text-gray-400">Selecione uma poltrona disponível abaixo.</p>
      </div>

      <div className="flex justify-center gap-4 py-3 bg-gray-50 border-b border-gray-100 text-xs font-bold text-gray-600">
         <div className="flex items-center gap-1"><div className="w-4 h-4 bg-gray-200 rounded-t-lg"></div> Ocupado</div>
         <div className="flex items-center gap-1"><div className="w-4 h-4 bg-green-100 border border-green-500 rounded-t-lg"></div> Livre</div>
         <div className="flex items-center gap-1"><div className="w-4 h-4 bg-orange-500 rounded-t-lg shadow-sm"></div> Selecionado</div>
      </div>

      <div className="p-6 overflow-x-auto bg-[#f8f9fa] flex justify-center max-h-[500px]">
        <div className="bg-white p-6 rounded-[40px] border-8 border-gray-200 shadow-inner w-fit mx-auto min-w-[280px]">
          
          <div className="w-full flex justify-center mb-8 border-b-2 border-gray-100 pb-4">
             <Plane size={32} className="text-gray-300" />
          </div>

          {seatMapData.cabins[0].rows.map((row, rowIndex) => (
            <div key={rowIndex} className="flex justify-center items-center mb-3 gap-2">
              
              <div className="w-6 text-center text-[10px] font-black text-gray-400 mr-2">
                 {row.sections[0].elements.find(e => e.type === 'seat')?.designator.replace(/[A-Z]/g, '') || ''}
              </div>

              {row.sections[0].elements.map((element, elIndex) => {
                if (element.type === 'empty') {
                  return <div key={elIndex} className="w-8 h-10"></div>; 
                }

                if (element.type === 'seat') {
                  const isAvailable = element.available_services && element.available_services.length > 0;
                  const isSelected = selectedSeat?.designator === element.designator;
                  
                  let seatClass = "w-10 h-10 rounded-t-lg rounded-b flex items-center justify-center text-[10px] font-bold transition-all relative group cursor-not-allowed bg-gray-200 text-gray-400"; 
                  
                  if (isAvailable) {
                    if (isSelected) {
                        seatClass = "w-10 h-10 rounded-t-xl rounded-b flex items-center justify-center text-[10px] font-black cursor-pointer transition-all bg-orange-500 text-white shadow-md shadow-orange-500/30 scale-110 z-10 border border-orange-600";
                    } else {
                        seatClass = "w-10 h-10 rounded-t-xl rounded-b flex items-center justify-center text-[10px] font-bold cursor-pointer transition-all bg-green-50 text-green-700 border border-green-300 hover:bg-green-100 hover:scale-105";
                    }
                  }

                  const seatPrice = isAvailable ? parseFloat(element.available_services[0].total_amount) * 1.15 : 0;

                  return (
                    <div key={elIndex} className="relative">
                      <button 
                        onClick={() => handleSeatClick(element)} 
                        className={seatClass}
                        disabled={!isAvailable}
                      >
                        {element.designator.slice(-1)} 
                      </button>
                      
                      {isAvailable && !isSelected && (
                          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-gray-900 text-white text-[10px] px-2 py-1 rounded shadow-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
                              {seatPrice === 0 ? 'Grátis' : formatCurrency(seatPrice)}
                          </div>
                      )}
                    </div>
                  );
                }
                return null;
              })}
            </div>
          ))}

        </div>
      </div>
    </div>
  );
}