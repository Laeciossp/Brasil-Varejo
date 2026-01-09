// studio/schemas/index.js

import product from './product'
import category from './category'
import shippingSettings from './shippingSettings'
import carrierConfig from './carrierConfig'
import order from './order'

export const schemaTypes = [
  product,
  category,
  shippingSettings,
  carrierConfig,
  order
]