import React, { useEffect, useRef } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { CheckCircle, Clock, ArrowRight, Package } from 'lucide-react';
import confetti from 'canvas-confetti'; // Importando os confetes
import useCartStore from '../store/useCartStore';

export default function Success() {
  const [searchParams] = useSearchParams();
  const { clearCart } = useCartStore();
  const hasProcessed = useRef(false);

  const status = searchParams.get('status');
  const paymentId = searchParams.get('payment_id');
  const isApproved = status === 'approved';
  const isPending = status === 'pending';

  useEffect(() => {
    // 1. Limpa o carrinho se o status for válido
    if ((isApproved || isPending) && !hasProcessed.current) {
      clearCart();
      
      // 2. Dispara confetes apenas se a compra for aprovada na hora!
      if (isApproved) {
        const duration = 3 * 1000;
        const animationEnd = Date.now() + duration;
        const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };

        const interval = setInterval(function() {
          const timeLeft = animationEnd - Date.now();
          if (timeLeft <= 0) return clearInterval(interval);

          const particleCount = 50 * (timeLeft / duration);
          confetti({ ...defaults, particleCount, origin: { x: Math.random(), y: Math.random() - 0.2 } });
        }, 250);
      }
      
      hasProcessed.current = true;
    }
  }, [isApproved, isPending, clearCart]);

  return (
    <div className="min-h-[80vh] flex items-center justify-center p-6 bg-slate-50">
      <div className="max-w-md w-full bg-white rounded-[40px] p-10 shadow-2xl text-center border border-white relative overflow-hidden">
        
        <div className="flex justify-center mb-8">
          <div className={`p-6 rounded-full animate-bounce ${isPending ? 'bg-amber-100 text-amber-600' : 'bg-green-100 text-green-600'}`}>
            {isPending ? <Clock size={48} /> : <CheckCircle size={48} />}
          </div>
        </div>

        <h1 className="text-3xl font-black text-slate-900 uppercase tracking-tighter mb-3 italic">
          {isPending ? 'Pedido Recebido!' : 'Compra Aprovada!'}
        </h1>
        
        <p className="text-slate-500 font-bold text-sm leading-relaxed mb-8">
          {isPending 
            ? 'Seu pedido está aguardando o pagamento. Assim que confirmado, iniciaremos o envio!'
            : 'Parabéns! Sua compra foi confirmada. Prepare o coração, seus produtos estão a caminho!'
          }
        </p>

        {paymentId && (
          <div className="bg-slate-50 rounded-3xl p-6 mb-8 border border-dashed border-slate-200">
            <span className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">Código da Transação</span>
            <span className="block font-mono font-black text-crocus-deep text-lg">#{paymentId}</span>
          </div>
        )}

        <div className="space-y-4">
          <Link 
            to="/profile" 
            className="w-full bg-crocus-deep text-white flex items-center justify-center gap-2 py-4 rounded-2xl font-black uppercase tracking-widest hover:scale-[1.02] transition-all shadow-xl shadow-crocus-deep/20"
          >
            <Package size={20} /> Meus Pedidos
          </Link>
          
          <Link 
            to="/" 
            className="w-full text-slate-400 font-black uppercase text-[10px] hover:text-crocus-vivid transition-all flex items-center justify-center gap-1 tracking-widest"
          >
            Continuar Comprando <ArrowRight size={14} />
          </Link>
        </div>
      </div>
    </div>
  );
}