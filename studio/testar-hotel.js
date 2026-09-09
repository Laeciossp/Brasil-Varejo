const axios = require('axios');

const FIREBASE_PROXY_URL = 'https://us-central1-palastore-turismo.cloudfunctions.net/proxyRestelTrator';

async function testarCertificacion() {
    console.log("🧪 Testando requisição XML 110 para o hotel de homologação (745388)...");

    // XML 110 oficial extraído diretamente da documentação da Restel para o hotel de teste
    const xml110Test = `<?xml version="1.0" encoding="UTF-8"?>
<peticion>
   <tipo>110</tipo>
   <nombre>Servicio de disponibilidad por lista de hoteles</nombre>
   <agencia>Palastore</agencia>
   <parametros>
      <hotel>745388#</hotel>
      <pais>MV</pais>
      <pais_cliente>BR</pais_cliente>
      <categoria>0</categoria>
      <fechaentrada>12/15/2026</fechaentrada>
      <fechasalida>12/16/2026</fechasalida>
      <afiliacion>RS</afiliacion>
      <usuario>BJ0932</usuario>
      <numhab1>1</numhab1>
      <paxes1>2-0</paxes1>
      <edades1 />
      <numhab2>0</numhab2>
      <paxes2>2-0</paxes2>
      <edades2 />
      <numhab3>0</numhab3>
      <paxes3>2-0</paxes3>
      <edades3 />
      <idioma>1</idioma>
      <informacion_hotel>0</informacion_hotel>
      <tarifas_reembolsables>0</tarifas_reembolsables>
      <comprimido>2</comprimido>
      <gastos>1</gastos>
   </parametros>
</peticion>`;

    try {
        const response = await axios.post(FIREBASE_PROXY_URL, {
            xmlPayload: xml110Test
        }, {
            headers: { 'Content-Type': 'application/json' },
            timeout: 60000
        });

        console.log("\n📦 Resposta da Restel para o Hotel de Teste:");
        console.log(response.data);
    } catch (e) {
        console.error("❌ Erro:", e.message);
    }
}

testarCertificacion();