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
// 2. MOTOR DE IMPORTAÇÃO (CARGA COMPLETA: XML 17 -> XML 15 -> SUPABASE)
// ============================================================================
async function iniciarTrator() {
    console.log("🚀 Iniciando Trator de Importação Restel (COM DIAGNÓSTICO E FILTRAGEM)...");

    const xml17 = `<?xml version="1.0" encoding="UTF-8"?>
<peticion>
  <tipo>17</tipo>
  <nombre>Servicio de listado de hoteles</nombre>
  <agencia>Palastore</agencia>
</peticion>`;

    try {
        console.log("📡 Baixando lista mestre de hotéis (XML 17)... Isso pode levar alguns segundos.");
        const res17 = await dispararAPI(xml17);
        
        // Exibe um trecho do XML bruto para fins de diagnóstico no terminal
        console.log("📦 Resposta bruta da Restel (XML 17 - Início):", String(res17.data).substring(0, 300));

        const json17 = parser.parse(res17.data);
        
        // Tenta múltiplos caminhos possíveis na estrutura da resposta da Restel para o XML 17
        let hoteis = json17?.respuesta?.parametros?.hoteles?.hotel 
                  || json17?.respuesta?.hoteles?.hotel 
                  || json17?.respuesta?.hotel;

        if (!hoteis) {
            console.log("⚠️ Caminho padrão não encontrado. Estrutura completa recebida do XML 17:", JSON.stringify(json17).substring(0, 800));
            return;
        }
        
        if (!Array.isArray(hoteis)) hoteis = [hoteis];
        
        const totalHoteis = hoteis.length;
        console.log(`✅ ${totalHoteis} registros totais identificados na Restel.`);
        console.log(`⏳ Iniciando processamento... (Apenas códigos estritamente numéricos serão consultados)`);

        let contador = 0;

        for (const h of hoteis) {
            contador++;
            // Mapeia possíveis nomes da chave do código cobol dependendo do retorno do XML 17
            const codigoBruto = String(h.hot_codcobol || h.codigo || h.cod || "").trim();

            // 🛑 BLINDAGEM: Descarta imediatamente qualquer código que contenha letras (regiões, zonas, etc.)
            if (!/^\d+$/.test(codigoBruto)) {
                console.log(`[${contador}/${totalHoteis}] ⏩ Ignorando código não numérico/grupo: ${codigoBruto}`);
                continue;
            }

            const cobol = codigoBruto.padStart(6, '0');
            
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
                const json15 = parser.parse(res15.data);
                
                const details = json15?.respuesta?.parametros?.hotel;
                if (!details) {
                    console.log(`[${contador}/${totalHoteis}] ⚠️ Cobol ${cobol}: Detalhes vazios.`);
                    continue;
                }

                // Sanitiza os arrays de Imagens e Comodidades
                let imagens = [];
                if (details.fotos && details.fotos.foto) {
                    imagens = Array.isArray(details.fotos.foto) ? details.fotos.foto : [details.fotos.foto];
                }

                let comodidades = [];
                if (details.servicios && details.servicios.servicio) {
                    const servs = Array.isArray(details.servicios.servicio) ? details.servicios.servicio : [details.servicios.servicio];
                    comodidades = servs.map(s => s.desc_serv);
                }

                // Grava ou atualiza no Supabase garantindo que o Cobol é puramente numérico
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
                    console.error(`[${contador}/${totalHoteis}] ❌ Erro DB - Cobol ${cobol}:`, error.message);
                } else {
                    console.log(`[${contador}/${totalHoteis}] 💾 Salvo com sucesso: ${details.nombre_h} (${cobol})`);
                }

            } catch (err) {
                console.error(`[${contador}/${totalHoteis}] ❌ Erro API - Cobol ${cobol}:`, err.message);
            }

            // Intervalo de segurança (300ms) para respeitar o limite de requisições da Restel
            await new Promise(r => setTimeout(r, 300));
        }

        console.log("\n🎉 IMPORTAÇÃO 100% FINALIZADA! Apenas hotéis válidos com código numérico foram processados.");

    } catch (error) {
        console.error("❌ Falha crítica no Trator Restel:", error.message);
    }
}

iniciarTrator();