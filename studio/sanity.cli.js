import {defineCliConfig} from 'sanity/cli'

export default defineCliConfig({
  api: {
    projectId: 'o4upb251',
    dataset: 'production'
  }, // <--- A vírgula que faltava estava aqui
  
  studioHost: 'brasil-varejo-admin' 
})