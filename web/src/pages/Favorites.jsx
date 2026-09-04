import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Heart, ShoppingCart, Trash2, ArrowLeft, Building2 } from 'lucide-react';
import useCartStore from '../store/useCartStore';
import { urlFor } from '../lib/sanity';
import { formatCurrency } from '../lib/utils';

export default function Favorites() {
  const { favorites, toggleFavorite, addItem } = useCartStore();
  const navigate = useNavigate();

  if (favorites.length === 0) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-10 text-center">
        <div className="bg-slate-100 p-8 rounded-full mb-6 animate-in zoom-in">
             <Heart size={60} className="text-slate-300" />
        </div>
        <h2 className="text-3xl font-black text-slate-900 uppercase italic tracking-tighter mb-2">Sua lista está vazia</h2>
        <p className="text-slate-500 mb-8 font-medium max-w-md">Salve seus itens preferidos da Palastore aqui para não perder nenhuma oferta de vista.</p>
        <Link to="/" className="bg-crocus-deep text-white px-8 py-4 rounded-2xl font-black uppercase text-xs shadow-xl shadow-crocus-deep/20 hover:scale-105 transition-transform">
          Explorar Loja
        </Link>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-6xl px-4 py-12">
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-10">
        <div className="flex items-center gap-4">
            <Link to="/" className="p-3 bg-white border border-slate-100 rounded-2xl shadow-sm hover:bg-slate-50 transition-colors"><ArrowLeft size={20} className="text-slate-700"/></Link>
            <div>
                <h1 className="text-3xl font-black text-slate-900 uppercase tracking-tighter italic">Meus Favoritos</h1>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{favorites.length} itens salvos</p>
            </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {favorites.map((item) => {
          const isHotel = item.type === 'hotel';

          // Resolve a imagem de forma segura dependendo se é Hotel ou Produto
          let resolvedImageUrl = null;
          if (isHotel) {
            resolvedImageUrl = item.image;
          } else {
            resolvedImageUrl = item.image ? item.image : (item.images?.[0] ? urlFor(item.images[0]).url() : null);
          }

          return (
            <div key={item._id} className="bg-white rounded-[32px] p-6 shadow-sm border border-slate-100 group relative hover:shadow-xl transition-all flex flex-col">
              
              <button 
                onClick={() => toggleFavorite(item)}
                className="absolute top-4 right-4 p-2.5 bg-red-50 text-red-500 rounded-full hover:bg-red-500 hover:text-white transition-all z-10"
                title="Remover dos favoritos"
              >
                <Trash2 size={18} />
              </button>

              <div 
                onClick={() => {
                  if (isHotel) {
                    navigate('/hotel-details', {
                      state: {
                        hotel: item.originalHotelData,
                        checkInDate: item.checkInDate,
                        checkOutDate: item.checkOutDate,
                        rooms: item.rooms,
                        residency: item.residency
                      }
                    });
                  } else {
                    navigate(`/product/${item.slug?.current}`);
                  }
                }} 
                className="block cursor-pointer flex-1"
              >
                <div className="w-full h-48 mb-6 bg-slate-50 rounded-2xl p-4 flex items-center justify-center relative overflow-hidden">
                   
                   {isHotel && (
                     <div className="absolute top-3 left-3 bg-blue-600 text-white text-[10px] font-black uppercase px-2 py-1 rounded-md z-10 flex items-center gap-1 shadow-sm">
                       <Building2 size={12}/> Hotel
                     </div>
                   )}
                   
                   {resolvedImageUrl ? (
                      <img 
                          src={resolvedImageUrl} 
                          alt={item.name || item.title} 
                          className={`w-full h-full object-${isHotel ? 'cover' : 'contain'} group-hover:scale-110 transition-transform duration-500 rounded-xl`}
                      />
                   ) : (
                      <div className="text-slate-300 font-bold uppercase text-[10px]">Sem Imagem</div>
                   )}
                </div>
                <h3 className="font-bold text-slate-800 mb-1 truncate text-lg leading-tight">{item.name || item.title}</h3>
                <p className="text-2xl font-black text-crocus-deep mb-6">
                 {isHotel ? `BRL ${item.price.toLocaleString('pt-BR', {minimumFractionDigits: 2})}` : formatCurrency(item.price)}
                </p>
              </div>

              {isHotel ? (
                <button 
                  onClick={() => {
                    navigate('/hotel-details', {
                      state: {
                        hotel: item.originalHotelData, checkInDate: item.checkInDate, checkOutDate: item.checkOutDate, rooms: item.rooms, residency: item.residency
                      }
                    });
                  }}
                  className="w-full mt-auto bg-[#ffc107] text-gray-900 py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest flex items-center justify-center gap-2 hover:bg-yellow-500 transition-all cursor-pointer shadow-sm"
                >
                  <Building2 size={16} /> Ver Hotel e Reservar
                </button>
              ) : (
                <button 
                  onClick={(e) => {
                    e.preventDefault(); e.stopPropagation();
                    const productForCart = { ...item, image: resolvedImageUrl };
                    addItem(productForCart);
                    toggleFavorite(item);
                  }}
                  className="w-full mt-auto bg-slate-900 text-white py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest flex items-center justify-center gap-2 hover:bg-orange-500 hover:shadow-orange-500/30 transition-all cursor-pointer"
                >
                  <ShoppingCart size={16} /> Mover para Carrinho
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}