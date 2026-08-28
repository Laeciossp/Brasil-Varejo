// studio/schemas/index.js

// --- Schemas do E-commerce e Turismo ---
import product from './product'
import category from './category'
import shippingSettings from './shippingSettings'
import carrierConfig from './carrierConfig'
import order from './order'
import customer from './customer'
import staff from './staff'
import tour from './tour' 
import navio from './navio' // 👈 Nova importação do schema de Cruzeiros/Navios

// --- Schemas da Home / Page Builder ---
import hero from './hero'
import featuredBanners from './featuredBanners'
import departmentsSection from './departments'
import productCarousel from './productCarousel'
import homePage from './homePage'

export const schemaTypes = [
  // E-commerce & Turismo Core
  product,
  category,
  shippingSettings,
  carrierConfig,
  order,
  customer,
  staff,
  tour,
  navio, // 👈 Declare o navio aqui para ele aparecer no painel do Sanity

  // Page Builder da Home
  hero,
  featuredBanners,
  departmentsSection,
  productCarousel,
  homePage
]