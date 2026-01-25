import React, { useState, useEffect } from 'react';
import { Download, Share, PlusSquare, X, Smartphone } from 'lucide-react';

export default function InstallApp({ className = "", showLabel = true }) {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showIOSInstruction, setShowIOSInstruction] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // Verifica se é iOS
    setIsIOS(/iPhone|iPad|iPod/.test(navigator.userAgent));

    // Verifica se já está instalado (Modo Standalone)
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
    }

    // Captura evento do Chrome/Android
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, []);

  const handleInstallClick = () => {
    if (isIOS) {
      setShowIOSInstruction(true);
    } else if (deferredPrompt) {
      deferredPrompt.prompt();
      deferredPrompt.userChoice.then((choiceResult) => {
        if (choiceResult.outcome === 'accepted') {
          setDeferredPrompt(null);
        }
      });
    } else {
      alert("Para instalar, utilize a opção 'Adicionar à Tela de Início' do seu navegador.");
    }
  };

  // Se já estiver instalado, não mostra nada
  if (isInstalled) return null;

  // Se não for iOS e não tiver evento do Chrome (ex: Desktop Firefox), esconde
  if (!deferredPrompt && !isIOS) return null;

  return (
    <>
      <button 
        onClick={handleInstallClick}
        className={`flex items-center gap-2 transition-all active:scale-95 ${className}`}
      >
        <div className="relative">
          <Smartphone size={20} className="animate-pulse" />
          <div className="absolute -top-1 -right-1 w-2 h-2 bg-green-500 rounded-full border border-white"></div>
        </div>
        {showLabel && <span className="font-bold text-xs uppercase tracking-tight">Baixar App</span>}
      </button>

      {/* MODAL IOS */}
      {showIOSInstruction && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-sm rounded-3xl p-6 shadow-2xl relative mb-4">
            <button 
              onClick={() => setShowIOSInstruction(false)}
              className="absolute top-4 right-4 bg-gray-100 p-1 rounded-full text-gray-500 hover:text-gray-900"
            >
              <X size={20} />
            </button>
            
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="w-16 h-16 bg-crocus-deep/10 text-crocus-deep rounded-2xl flex items-center justify-center mb-2">
                <Smartphone size={32} />
              </div>
              <h3 className="text-xl font-black text-gray-900 uppercase italic tracking-tighter">Instalar no iPhone</h3>
              <p className="text-gray-500 text-sm font-medium leading-relaxed">
                A Apple não permite instalação automática. Siga os passos abaixo para ter nosso app:
              </p>
              
              <div className="w-full space-y-3 mt-4 text-left bg-gray-50 p-4 rounded-xl border border-gray-100">
                <div className="flex items-center gap-3 text-sm text-gray-700">
                  <span className="flex items-center justify-center w-6 h-6 bg-blue-100 text-blue-600 rounded-full font-bold text-xs">1</span>
                  <span>Toque em <Share size={14} className="inline mx-1 text-blue-500"/> <strong>Compartilhar</strong> na barra inferior.</span>
                </div>
                <div className="w-full h-px bg-gray-200"></div>
                <div className="flex items-center gap-3 text-sm text-gray-700">
                  <span className="flex items-center justify-center w-6 h-6 bg-blue-100 text-blue-600 rounded-full font-bold text-xs">2</span>
                  <span>Role e escolha <PlusSquare size={14} className="inline mx-1 text-gray-600"/> <strong>Adicionar à Tela de Início</strong>.</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}