// baixador-pexels.js
const fs = require('fs');
const path = require('path');
const axios = require('axios');

// === COLOQUE SUA CHAVE DO PEXELS AQUI ===
const PEXELS_API_KEY = 'ma2V0AFB8gbZzVMG1s3et5pQBucc10Bnl8DwjytITR21BuZd76EkLTiz'; 

const destinosNacionais = [
    "Rio de Janeiro", "Fernando de Noronha", "Foz do Iguaçu", "Salvador", "Lençóis Maranhenses", "Gramado", "Bonito", "Porto de Galinhas", "Paraty", "Chapada dos Veadeiros", "Jericoacoara", "Ouro Preto", "Búzios", "Florianópolis", "Maragogi", "Jalapão", "Campos do Jordão", "Praia da Pipa", "Pantanal", "Manaus", "Morro de São Paulo", "Chapada Diamantina", "Ilhabela", "Petrópolis", "Canela", "João Pessoa", "Angra dos Reis", "Arraial do Cabo", "Maceió", "Curitiba", "São Paulo", "Brasilia", "Fortaleza", "Belo Horizonte", "Recife", "Porto Alegre", "Goiânia", "Belém", "São Luís", "Natal", "Teresina", "Aracaju", "Cuiabá", "Campo Grande", "Vitória", "Campinas", "Santos", "Caldas Novas", "Balneário Camboriú", "Cabo Frio"
];

const destinosInternacionais = [
    "Paris", "Roma", "Londres", "Nova York", "Tokyo", "Barcelona", "Amsterdam", "Lisboa", "Florence", "Veneza", "Kyoto", "Cairo", "Atenas", "Machu Picchu", "Istanbul", "Sydney", "Dubai", "Bangkok", "Singapore", "Bali", "Praga", "Cape Town", "Buenos Aires", "Milan", "Seville", "Reykjavik", "Viena", "Munich", "Marrakech", "Palma de Mallorca", "Kuala Lumpur", "Seoul", "Mecca", "Phuket", "Shanghai", "Hong Kong", "Antalya", "Osaka", "Cancun", "Las Vegas", "Miami", "Los Angeles", "Berlin"
];

function slugify(text) {
    return text.toString().normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim().replace(/[^a-z0-9 -]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-');
}

// Função inteligente que tenta de novo se a API bloquear (Anti-Spam)
async function buscarComRetry(url, headers, tentativas = 3) {
    for (let i = 0; i < tentativas; i++) {
        try {
            return await axios.get(url, { headers });
        } catch (erro) {
            // Código 429 significa "Too Many Requests" (Fomos bloqueados por spam)
            if (erro.response && erro.response.status === 429) {
                console.log(`   ⏳ Alerta Anti-Spam do Pexels! Pausando por 10 segundos... (Tentativa ${i+1} de ${tentativas})`);
                await new Promise(r => setTimeout(r, 10000)); // Espera 10 segundos
            } else {
                throw erro; // Se for outro erro (ex: sem internet), repassa o erro
            }
        }
    }
    throw new Error("Limite de tentativas excedido.");
}

async function baixarDoPexels(cidade, categoria) {
    const nomeArquivo = `${slugify(cidade)}.jpg`;
    const pastaDestino = path.join(__dirname, 'imagens_baixadas', categoria);
    const caminhoCompleto = path.join(pastaDestino, nomeArquivo);

    if (!fs.existsSync(pastaDestino)) fs.mkdirSync(pastaDestino, { recursive: true });

    // Se já baixou essa foto (ex: Rio de Janeiro que rodou antes de dar erro), ele pula!
    if (fs.existsSync(caminhoCompleto)) {
        console.log(`   ⏭️ Já baixada: ${nomeArquivo} (Pulando...)`);
        return;
    }

    try {
        console.log(`\n🔎 Buscando: ${cidade}...`);
        
        const termoBusca = encodeURIComponent(`${cidade} landmark tourism travel`);
        const urlBusca = `https://api.pexels.com/v1/search?query=${termoBusca}&per_page=1&orientation=landscape`;

        // Usa a nossa função blindada com Retry
        const respostaBusca = await buscarComRetry(urlBusca, { Authorization: PEXELS_API_KEY });

        if (respostaBusca.data.photos && respostaBusca.data.photos.length > 0) {
            const imgUrl = respostaBusca.data.photos[0].src.large2x;
            console.log(`   📸 Baixando foto premium...`);

            // Baixa a imagem
            const respostaImg = await axios.get(imgUrl, { responseType: 'arraybuffer' });
            fs.writeFileSync(caminhoCompleto, Buffer.from(respostaImg.data, 'binary'));
            console.log(`   ✅ Salvo em: /imagens_baixadas/${categoria}/${nomeArquivo}`);
        } else {
            console.log(`   ⚠️ Nenhuma foto encontrada para ${cidade}.`);
        }

    } catch (erro) {
        // Agora o log de erro diz exatamente o que houve (Código do erro ou mensagem)
        const msgErro = erro.response ? `Erro HTTP ${erro.response.status}` : erro.message;
        console.error(`   ❌ Erro ao baixar foto de ${cidade}: ${msgErro}`);
    }
}

async function iniciarProcesso() {
    if (PEXELS_API_KEY === 'COLE_SUA_CHAVE_AQUI') {
        console.error("❌ ALERTA: Você esqueceu de colocar a sua chave da Pexels na linha 7 do código!");
        return;
    }

    console.log("🚀 Iniciando Motor de Imagens PEXELS (120 Destinos)...\n");

    console.log("--- BAIXANDO DESTINOS NACIONAIS ---");
    for (const cidade of destinosNacionais) {
        await baixarDoPexels(cidade, 'nacionais');
        await new Promise(r => setTimeout(r, 2000)); // Aumentei a pausa para 2 segundos para acalmar a API
    }

    console.log("\n--- BAIXANDO DESTINOS INTERNACIONAIS ---");
    for (const cidade of destinosInternacionais) {
        await baixarDoPexels(cidade, 'internacionais');
        await new Promise(r => setTimeout(r, 2000)); // Aumentei a pausa para 2 segundos para acalmar a API
    }

    console.log("\n🎉 CONCLUÍDO! Arraste a pasta 'imagens_baixadas' para dentro da pasta 'public/images/destinos/' do seu projeto React!");
}

iniciarProcesso();