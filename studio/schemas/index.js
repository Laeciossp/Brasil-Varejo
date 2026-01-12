// studio/schemas/index.js

// --- Schemas do E-commerce (Existentes) ---
import product from './product'
import category from './category'
import shippingSettings from './shippingSettings'
import carrierConfig from './carrierConfig'
import order from './order'
import customer from './customer'

// --- Schemas da Home / Page Builder (Novos) ---
import hero from './hero'
import featuredBanners from './featuredBanners'
import departmentsSection from './departments'
import productCarousel from './productCarousel'
import homePage from './homePage'

export const schemaTypes = [
  // E-commerce Core
  product,
  category,
  shippingSettings,
  carrierConfig,
  order,
  customer,

  // Page Builder da Home
  hero,
  featuredBanners,
  departmentsSection,
  productCarousel,
  homePage
]