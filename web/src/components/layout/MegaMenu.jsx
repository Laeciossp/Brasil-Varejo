import React, { useState, useEffect } from 'react';
import { X, ChevronRight, ChevronLeft, ArrowRight, Home } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { client } from '../../lib/sanity'; // Certifique-se que o caminho está certo
import { Link } from 'react-router-dom';

const MegaMenu = ({ isOpen, onClose }) => {
  const [categories, setCategories] = useState([]);
  const [menuStack, setMenuStack] = useState([]); // Pilha de navegação (Histórico)
  const [loading, setLoading] = useState(true);

  // Busca as categorias no Sanity ao carregar
  useEffect(() => {
    const fetchCategories = async () => {
      // Query GROQ para pegar categorias ativas
      const query = `*[_type == "category" && isActive == true]{
        _id,
        title,
        slug,
        isRoot,
        "parent": parent._ref,
        "icon": icon.asset->url,
        "hasChildren": count(*[_type == "category" && references(^._id) && isActive == true]) > 0
      }`;
      
      try {
        const data = await client.fetch(query);
        setCategories(data);
        setLoading(false);
      } catch (error) {
        console.error("Erro ao carregar menu:", error);
        setLoading(false);
      }
    };

    if (isOpen && categories.length === 0) {
      fetchCategories();
    }
  }, [isOpen]);

  // Lógica para filtrar o nível atual do menu
  const getCurrentItems = () => {
    if (menuStack.length === 0) {
      // Nível 0: Apenas categorias marcadas como 'isRoot'
      return categories.filter(c => c.isRoot);
    } else {
      // Nível Profundo: Filhos da categoria atual
      const parentId = menuStack[menuStack.length - 1];
      return categories.filter(c => c.parent === parentId);
    }
  };

  const getTitle = () => {
    if (menuStack.length === 0) return "Departamentos";
    const currentId = menuStack[menuStack.length - 1];
    return categories.find(c => c._id === currentId)?.title || "Voltar";
  };

  const handlePush = (id) => {
    setMenuStack([...menuStack, id]);
  };

  const handlePop = () => {
    setMenuStack(menuStack.slice(0, -1));
  };

  // Reseta o menu quando fecha
  useEffect(() => {
    if (!isOpen) {
      const timer = setTimeout(() => setMenuStack([]), 300);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const currentLevelItems = getCurrentItems();

  return (
    <div className="fixed inset-0 z-[60] flex font-sans">
      {/* Overlay Escuro */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm" 
        onClick={onClose} 
      />

      {/* O Menu Lateral Branco */}
      <motion.div 
        initial={{ x: '-100%' }}
        animate={{ x: 0 }}
        exit={{ x: '-100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className="relative bg-white w-[85%] max-w-[350px] h-full shadow-2xl flex flex-col z-20"
      >
        {/* Cabeçalho do Menu */}
        <div className="bg-brand-blue text-white h-16 shrink-0 flex items-center justify-between px-4 shadow-md z-10">
          {menuStack.length > 0 ? (
            <button 
              onClick={handlePop} 
              className="flex items-center gap-2 font-bold hover:bg-brand-darkBlue p-2 rounded-md transition-colors"
            >
              <ChevronLeft className="w-6 h-6" /> Voltar
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <span className="font-bold text-xl">Olá, Cliente</span>
            </div>
          )}
          <button 
            onClick={onClose}
            className="p-2 hover:bg-brand-darkBlue rounded-full transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Lista de Itens */}
        <div className="flex-1 overflow-y-auto bg-white relative">
            <div className="pb-4">
                <h3 className="text-xl font-bold text-brand-blue px-6 py-5 border-b border-gray-100 flex items-center gap-2">
                  {menuStack.length === 0 && <Home className="w-5 h-5 mb-1" />}
                  {getTitle()}
                </h3>

                {loading ? (
                  <div className="flex flex-col items-center justify-center p-8 text-gray-500 gap-2">
                    <div className="w-6 h-6 border-2 border-brand-blue border-t-transparent rounded-full animate-spin"></div>
                    <p>Carregando...</p>
                  </div>
                ) : (
                  <ul className="py-2">
                    <AnimatePresence mode='popLayout' initial={false}>
                      {currentLevelItems.map((item) => (
                        <motion.li 
                          key={item._id}
                          initial={{ opacity: 0, x: 20 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -20 }}
                          transition={{ duration: 0.2 }}
                        >
                          {item.hasChildren ? (
                              <button 
                                onClick={() => handlePush(item._id)}
                                className="w-full flex items-center justify-between px-6 py-4 hover:bg-gray-50 text-left text-gray-700 font-medium transition-colors border-b border-gray-50"
                              >
                                <span className="text-base">{item.title}</span>
                                <ChevronRight className="w-5 h-5 text-gray-400" />
                              </button>
                          ) : (
                              <Link 
                                to={`/category/${item.slug?.current}`} 
                                onClick={onClose}
                                className="block w-full px-6 py-4 hover:bg-brand-blue/5 text-gray-700 hover:text-brand-blue transition-colors border-b border-gray-50"
                              >
                                {item.title}
                              </Link>
                          )}
                        </motion.li>
                      ))}
                    </AnimatePresence>
                  </ul>
                )}
                
                {!loading && currentLevelItems.length === 0 && (
                  <div className="p-6 text-gray-500 text-center">
                    Nenhuma subcategoria encontrada aqui.
                  </div>
                )}
            </div>
            
            {menuStack.length === 0 && (
                <div className="border-t border-gray-200 mt-2 p-6 bg-gray-50 space-y-4">
                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Destaques</h4>
                    <Link to="/deals" onClick={onClose} className="flex items-center gap-3 font-bold text-brand-blue hover:underline">
                        <ArrowRight className="w-4 h-4" /> Ofertas do Dia
                    </Link>
                    <Link to="/support" onClick={onClose} className="flex items-center gap-3 font-medium text-gray-600 hover:text-gray-900">
                        Central de Ajuda
                    </Link>
                </div>
            )}
        </div>
      </motion.div>
    </div>
  );
};

export default MegaMenu;