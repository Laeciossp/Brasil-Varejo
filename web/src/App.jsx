import React, { useEffect } from 'react'; 
import { Routes, Route, Navigate, useLocation } from 'react-router-dom'; 
import { SignedIn, SignedOut, RedirectToSignIn } from "@clerk/clerk-react";

import Header from './components/Header';
import Footer from './components/Footer';

import Home from './pages/Home';
import ProductDetails from './pages/ProductDetails';
import CategoryPage from './pages/CategoryPage'; 
import Cart from './pages/Cart';
import Profile from './pages/Profile';
import Success from './pages/Success';
import Favorites from './pages/Favorites';
import SearchPage from './pages/SearchPage';
import ViagensPage from './pages/ViagensPage';
import TourDetails from './pages/TourDetails';
import FlightSearch from './pages/FlightSearch';
import HotelSearch from './pages/HotelSearch';
import HotelDetails from './pages/HotelDetails'; // <-- IMPORT DA NOVA PÁGINA DE DETALHES
import FlightHotelPackage from './pages/FlightHotelPackage';
import PalastoreCruzeiros from './pages/PalastoreCruzeiros'; 

import BrandPage from './pages/BrandPage';

import About from './pages/About';
import Terms from './pages/Terms';
import Privacy from './pages/Privacy';
import Policies from './pages/Policies';

function App() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return (
    <div className="flex flex-col min-h-screen bg-[#f2f2f2] font-sans text-gray-900">
      
      <Header />
      
      <main className="flex-grow">
        <Routes>
          <Route path="/" element={<Home />} />
          
          <Route path="/product/:slug" element={<ProductDetails />} />
          <Route path="/produto/:slug" element={<ProductDetails />} />
          
          <Route path="/roteiro/:slug" element={<TourDetails />} />
          
          <Route path="/category/:slug" element={<CategoryPage />} />
          <Route path="/categoria/:slug" element={<CategoryPage />} />
          
          <Route path="/marca/:brandName" element={<BrandPage />} />

          <Route path="/busca" element={<SearchPage />} />
          <Route path="/cart" element={<Cart />} />
          <Route path="/favoritos" element={<Favorites />} />

          <Route path="/viagens" element={<ViagensPage />} />
               
          <Route path="/voos" element={<FlightSearch />} />
          <Route path="/hoteis" element={<HotelSearch />} />
          <Route path="/hotel-details" element={<HotelDetails />} /> {/* <-- ROTA REGISTRADA PARA O CLIQUE FUNCIONAR */}
          <Route path="/voo-hotel" element={<FlightHotelPackage />} />
          <Route path="/cruzeiros" element={<PalastoreCruzeiros />} />

          <Route path="/sobre" element={<About />} />
          <Route path="/termos-de-uso" element={<Terms />} />
          <Route path="/politica-de-privacidade" element={<Privacy />} />
          <Route path="/politicas" element={<Policies />} />

          <Route 
            path="/profile" 
            element={
              <>
                <SignedIn>
                  <Profile />
                </SignedIn>
                <SignedOut>
                  <RedirectToSignIn />
                </SignedOut>
              </>
            } 
          />

          <Route path="/sucesso" element={<Success />} />
          
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </main>

      <Footer />
      
    </div>
  );
}

export default App;