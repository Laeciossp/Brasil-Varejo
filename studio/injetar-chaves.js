const { createClient } = require('@sanity/client');

// Conexão com o seu Sanity (Com permissão de escrita/edição)
const client = createClient({
  projectId: 'o4upb251',
  dataset: 'production',
  useCdn: false,
  apiVersion: '2023-05-03',
  token: 'skmLtdy7ME2lnyS0blM3IWiNv0wuWzBG4egK7jUYdVVkBktLngwz47GbsPPdq5NLX58WJEiR3bmW0TBpeMtBhPNEIxf5mk6uQ14PvbGYKlWQdSiP2uWdBDafWhVAGMw5RYh3IyKhDSmqEqSLg1bEzzYVEwcGWDZ9tEPmZhNDkljeyvY6IcEO'
});

// Dicionário Universal de Chaves Mestras (Ship Codes)
const CHAVES_MESTRAS = {
  // === ROYAL CARIBBEAN ===
  "wonder of the seas": "WY",
  "symphony of the seas": "SY",
  "harmony of the seas": "HM",
  "oasis of the seas": "OA",
  "allure of the seas": "AL",
  "icon of the seas": "IC",
  "utopia of the seas": "UT",
  "star of the seas": "ST",
  "freedom of the seas": "FR",
  "independence of the seas": "IG",
  "liberty of the seas": "LB",
  "voyager of the seas": "VY",
  "navigator of the seas": "NV",
  "mariner of the seas": "MA",
  "adventure of the seas": "AD",
  "explorer of the seas": "EX",
  "radiance of the seas": "RD",
  "serenade of the seas": "SR",
  "brilliance of the seas": "BR",
  "jewel of the seas": "JW",
  "quantum of the seas": "QN",
  "anthem of the seas": "AN",
  "ovation of the seas": "OV",
  "odyssey of the seas": "OY",
  "spectrum of the seas": "SQ",
  "grandeur of the seas": "GR",
  "vision of the seas": "VI",
  "enchantment of the seas": "EN",
  "rhapsody of the seas": "RH",

  // === CELEBRITY CRUISES ===
  "celebrity edge": "EG",
  "celebrity apex": "AE",
  "celebrity beyond": "BY",
  "celebrity ascent": "AX",
  "celebrity xcel": "XC",
  "celebrity flora": "FL",
  "celebrity silhouette": "SI",
  "celebrity reflection": "RF",
  "celebrity eclipse": "EC",
  "celebrity equinox": "EQ",
  "celebrity solstice": "SL",
  "celebrity millennium": "ML",
  "celebrity constellation": "CS",
  "celebrity infinity": "IN",
  "celebrity summit": "SM",
  "celebrity xpedition": "XP",
  "celebrity xploration": "XO",

  // === MSC CRUISES ===
  "msc seaview": "SV",
  "msc seaside": "SE",
  "msc seascape": "SS",
  "msc grandiosa": "GR",
  "msc virtuosa": "VI",
  "msc euribia": "EU",
  "msc meraviglia": "ME",
  "msc bellissima": "BE",
  "msc preziosa": "PR",
  "msc splendida": "SP",
  "msc fantasia": "FA",
  "msc divina": "DI",
  "msc musica": "MU",
  "msc orchestra": "OR",
  "msc poesia": "PO",
  "msc magnifica": "MA",
  "msc lirica": "LI",
  "msc opera": "OP",
  "msc armonia": "AR",
  "msc sinfonia": "SI",
  "msc world europa": "WE",
  "msc world america": "WA",

  // === COSTA CRUZEIROS ===
  "costa smeralda": "SM",
  "costa toscana": "TO",
  "costa firenze": "FI",
  "costa venezia": "VZ",
  "costa diadema": "DI",
  "costa fascinosa": "FA",
  "costa favolosa": "FC",
  "costa deliziosa": "DE",
  "costa luminosa": "LU",
  "costa pacifica": "PA",
  "costa serena": "SE",
  "costa fortuna": "FO",
  "costa magica": "MA"
};

const normalizarString = (str) => {
  return str.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
};

async function injetarChavesNoSanity() {
  console.log("🚀 Iniciando varredura no Sanity...\n");

  try {
    // 1. Busca todos os navios cadastrados no seu Sanity
    const navios = await client.fetch(`*[_type == "navio"]{_id, nome}`);
    console.log(`📦 Encontrados ${navios.length} navios no banco de dados.`);

    let atualizados = 0;

    // 2. Loop para cruzar nomes e injetar o código
    for (const navio of navios) {
      const nomeSanity = normalizarString(navio.nome);
      const chaveMestra = CHAVES_MESTRAS[nomeSanity];

      if (chaveMestra) {
        console.log(`🔄 Injetando chave [${chaveMestra}] no navio: ${navio.nome}`);
        
        // Comando PATCH oficial do Sanity para atualizar apenas este campo
        await client.patch(navio._id)
          .set({ codigoOperadora: chaveMestra })
          .commit();
          
        atualizados++;
      } else {
        console.log(`⚠️ Chave não encontrada no dicionário para: ${navio.nome}`);
      }
    }

    console.log(`\n✅ Processo concluído! ${atualizados} navios atualizados com a Chave Mestra.`);

  } catch (error) {
    console.error("❌ Erro fatal ao acessar o Sanity:", error.message);
  }
}

injetarChavesNoSanity();