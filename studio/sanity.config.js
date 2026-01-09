import {defineConfig} from 'sanity'
import {structureTool} from 'sanity/structure'
import {visionTool} from '@sanity/vision'
import {schemaTypes} from './schemas' // <--- Aqui ele puxa o nosso index.js

export default defineConfig({
  name: 'default',
  title: 'Clone Marketplace', // O nome que aparece na aba do navegador

  projectId: 'o4upb251', // <--- Mesma ID do arquivo acima
  dataset: 'production',

  plugins: [
    structureTool(), // Cria o menu lateral visual
    visionTool()     // Ferramenta para testar queries (aquela lupa)
  ],

  schema: {
    types: schemaTypes, // Carrega nossos produtos, pedidos, categorias...
  },
})