import {defineCliConfig} from 'sanity/cli'

export default defineCliConfig({
  api: {
    projectId: 'o4upb251', // <--- IMPORTANTE: Pegue este código no manage.sanity.io ou no terminal quando criou o projeto
    dataset: 'production'
  }
})