// studio/schemas/index.js
import product from './product'
import category from './category'
import shippingSettings from './shippingSettings'
import carrierConfig from './carrierConfig'
import order from './order'
import customer from './customer' // <--- IMPORTAR AQUI

export const schemaTypes = [
  product,
  category,
  shippingSettings,
  carrierConfig,
  order,
  customer // <--- ADICIONAR AQUI
]