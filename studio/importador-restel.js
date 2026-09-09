const axios = require('axios');
const { XMLParser } = require('fast-xml-parser');
const { createClient } = require('@supabase/supabase-js');

// ============================================================================
// 1. CONFIGURAÇÕES E CREDENCIAIS
// ============================================================================
const CREDENCIAIS = {
    codigousu: 'PPAK',       
    clausu: 'xml528786',     
    afiliacio: 'RS',         
    secacc: '164338',        
    codusu: 'BJ0932'         
};

const SUPABASE_URL = 'https://vcqiilytjrrurdbscmio.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZjcWlpbHl0anJydXJkYnNjbWlvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NjYwODAyOCwiZXhwIjoyMTAyMTg0MDI4fQ.vhrjAMAazVKS1YPV9Ld9g-1f_ohlJ-s-Zydeo5gQo8M'; 
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const URL_RESTEL = `http://xml.hotelresb2b.com/xml/listen_xml.jsp?codigousu=${CREDENCIAIS.codigousu}&clausu=${CREDENCIAIS.clausu}&afiliacio=${CREDENCIAIS.afiliacio}&secacc=${CREDENCIAIS.secacc}`;
const parser = new XMLParser({ ignoreAttributes: false });

async function dispararAPI(xmlString) {
    const payload = `xml=${encodeURIComponent(xmlString)}`;
    return await axios.post(URL_RESTEL, payload, {
        headers: { 
            'Content-Type': 'application/x-www-form-urlencoded', 
            'Accept-Encoding': 'gzip, deflate' 
        },
        timeout: 60000
    });
}

// ============================================================================
// 2. MOTOR DE FORÇA BRUTA (COM RADAR PARA O 000279)
// ============================================================================
async function iniciarTratorForcaBruta() {
    console.log("🚀 INICIANDO IMPORTADOR RESTEL (MODO FORÇA BRUTA CORRIGIDO)");
    
    // Vamos testar apenas do 275 ao 285 para focar onde o 000279 está e ser mais rápido
    const INICIO = 275;
    const FIM = 285; 
    
    let salvos = 0;

    console.log(`\n⏳ Varrendo Cobols do ${INICIO} ao ${FIM}...\n`);

    for (let i = INICIO; i <= FIM; i++) {
        const cobol = String(i).padStart(6, '0');
        
        const xml15 = `<?xml version="1.0" encoding="UTF-8"?>
<peticion>
  <tipo>15</tipo>
  <nombre>Servicio de informacion de hotel</nombre>
  <agencia>Palastore</agencia>
  <parametros>
    <codigo>${cobol}</codigo>
    <idioma>1</idioma>
  </parametros>
</peticion>`;

        try {
            const res15 = await dispararAPI(xml15);
            
            // RADAR: Se for o 000279, imprime o XML cru que a Restel devolveu
            if (cobol === "000279") {
                console.log(`\n\n🎯 [RADAR] RESPOSTA BRUTA DA RESTEL PARA O COBOL 000279:`);
                console.log(res15.data);
                console.log(`------------------------------------------------------\n`);
            }

            const json15 = parser.parse(res15.data);
            
            // Correção: Aceita tanto <parametros> quanto <param> do sandbox
            const param15 = json15?.respuesta?.parametros || json15?.respuesta?.param;
            const details = param15?.hotel;
            
            if (!details || !details.nombre_h) {
                process.stdout.write(`.`);
                continue;
            }

            console.log(`\n🏨 [Cobol ${cobol}] ENCONTRADO: ${details.nombre_h}`);

            let imagens = [];
            if (details.fotos && details.fotos.foto) {
                imagens = Array.isArray(details.fotos.foto) ? details.fotos.foto : [details.fotos.foto];
            }

            let comodidades = [];
            if (details.servicios && details.servicios.servicio) {
                const servs = Array.isArray(details.servicios.servicio) ? details.servicios.servicio : [details.servicios.servicio];
                comodidades = servs.map(s => s.desc_serv);
            }

            const { error } = await supabase.from('RestelHotel').upsert({
                cobol: cobol,
                name: details.nombre_h || "Sem Nome",
                category: parseInt(details.categoria) || 0,
                countryCode: details.pais || "",
                province: details.provincia || "",
                city: details.poblacion || "",
                address: details.direccion || "",
                zipCode: details.cp || "",
                latitude: parseFloat(details.latitud) || 0,
                longitude: parseFloat(details.longitud) || 0,
                description: details.desc_hotel || "",
                images: imagens,
                amenities: comodidades,
                updatedAt: new Date().toISOString()
            }, { onConflict: 'cobol' });

            if (error) {
                console.error(`❌ Erro DB - Cobol ${cobol}:`, error.message);
            } else {
                salvos++;
                console.log(`✅ Salvo no Supabase com sucesso!`);
            }

        } catch (err) {
            console.error(`\n❌ Erro de requisição no Cobol ${cobol}:`, err.message);
        }

        await new Promise(r => setTimeout(r, 200));
    }

    console.log(`\n\n🎉 VARREDURA FINALIZADA! Total de hotéis importados: ${salvos}`);
}

iniciarTratorForcaBruta();