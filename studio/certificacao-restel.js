const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { XMLParser } = require('fast-xml-parser');

// ============================================================================
// 1. CREDENCIAIS OFICIAIS
// ============================================================================
const CREDENCIAIS = {
    codigousu: 'PPAK',       
    clausu: 'xml528786',     
    afiliacio: 'RS',         
    secacc: '164338',        
    codusu: 'BJ0932'         
};

const URL_RESTEL = `http://xml.hotelresb2b.com/xml/listen_xml.jsp?codigousu=${CREDENCIAIS.codigousu}&clausu=${CREDENCIAIS.clausu}&afiliacio=${CREDENCIAIS.afiliacio}&secacc=${CREDENCIAIS.secacc}`;
const parser = new XMLParser({ ignoreAttributes: false });

const baseDir = path.join(__dirname, 'Certificacao_Restel');
if (!fs.existsSync(baseDir)) fs.mkdirSync(baseDir);

// Retorna Data no formato estrito MM/DD/AAAA
const getStrDate = (d) => {
    return `${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}/${d.getFullYear()}`;
};

const getDataEntrada = () => {
    const d = new Date();
    d.setDate(d.getDate() + 3); // Apenas 3 dias no futuro para garantir inventário de teste
    return getStrDate(d);
};

const getDataSalida = (noites) => {
    const d = new Date();
    d.setDate(d.getDate() + 3 + noites);
    return getStrDate(d);
};

// ============================================================================
// 2. O DICIONÁRIO DOS 10 CENÁRIOS
// ============================================================================
const CENARIOS = [
    { id: 1, hotel: '745388', noites: 1, nat: 'ES', quartos: [{ num: 1, pax: '1-0', idades: '' }], acao: 'AE' }, 
    { id: 2, hotel: '745388', noites: 1, nat: 'IN', quartos: [{ num: 1, pax: '2-1', idades: '6' }], acao: 'AI' }, 
    { id: 3, hotel: '745388', noites: 2, nat: 'CN', quartos: [{ num: 1, pax: '2-0', idades: '' }, { num: 1, pax: '1-0', idades: '' }], acao: 'AE' },
    { id: 4, hotel: '601022', noites: 2, nat: 'ES', quartos: [{ num: 2, pax: '2-0', idades: '' }], acao: 'AE', exigeTarifaC: true },
    { id: 5, hotel: '745388', noites: 7, nat: 'IN', quartos: [{ num: 1, pax: '3-0', idades: '' }], acao: 'AE' },
    { id: 6, hotel: '745388', noites: 2, nat: 'CN', quartos: [{ num: 2, pax: '1-1', idades: '1,5' }], acao: 'AE' },
    { id: 7, hotel: '745388', noites: 3, nat: 'ES', quartos: [{ num: 1, pax: '1-1', idades: '10' }, { num: 1, pax: '2-1', idades: '9' }], acao: 'AE' },
    { id: 8, hotel: '601022', noites: 3, nat: 'IN', quartos: [{ num: 1, pax: '2-0', idades: '' }], acao: 'AE' },
    { id: 9, hotel: '745388', noites: 2, nat: 'ES', quartos: [{ num: 1, pax: '1-2', idades: '3,8' }], acao: 'AE' },
    { id: 10, hotel: '745388', noites: 1, nat: 'ES', quartos: [{ num: 2, pax: '1-2', idades: '4,5,7,9' }], acao: 'AE' }
];

// ============================================================================
// 3. MONTADORES DE XML MANUAIS (ORDEM ESTRITA DO MANUAL RESTEL)
// ============================================================================

function montarXML110(cenario) {
    const dataEnt = getDataEntrada();
    const dataSal = getDataSalida(cenario.noites);
    
    // Pega os quartos ou cria vazios para preencher as 3 tags obrigatórias
    const q1 = cenario.quartos[0] || { num: 0, pax: '2-0', idades: '' };
    const q2 = cenario.quartos[1] || { num: 0, pax: '2-0', idades: '' };
    const q3 = cenario.quartos[2] || { num: 0, pax: '2-0', idades: '' };

    return `<?xml version="1.0" encoding="UTF-8"?>
<peticion>
    <tipo>110</tipo>
    <nombre>Servicio de disponibilidad por lista de hoteles</nombre>
    <agencia>Palastore</agencia>
    <parametros>
        <hotel>745388#994214#962243#601022#758213#752553#</hotel>
        <pais>MV</pais>
        <pais_cliente>${cenario.nat}</pais_cliente>
        <categoria>0</categoria>
        <fechaentrada>${dataEnt}</fechaentrada>
        <fechasalida>${dataSal}</fechasalida>
        <afiliacion>${CREDENCIAIS.afiliacio}</afiliacion>
        <usuario>${CREDENCIAIS.codusu}</usuario>
        <numhab1>${q1.num}</numhab1>
        <paxes1>${q1.pax}</paxes1>
        <edades1>${q1.idades}</edades1>
        <numhab2>${q2.num}</numhab2>
        <paxes2>${q2.pax}</paxes2>
        <edades2>${q2.idades}</edades2>
        <numhab3>${q3.num}</numhab3>
        <paxes3>${q3.pax}</paxes3>
        <edades3>${q3.idades}</edades3>
        <idioma>1</idioma>
        <informacion_hotel>0</informacion_hotel>
        <tarifas_reembolsables>0</tarifas_reembolsables>
        <comprimido>2</comprimido>
        <gastos>1</gastos>
    </parametros>
</peticion>`;
}

function montarXML24(linhaHotel) {
    return `<?xml version="1.0" encoding="UTF-8"?>
<peticion>
  <nombre>Observaciones hoteles</nombre>
  <agencia>Palastore</agencia>
  <tipo>24</tipo>
  <parametros>
    <lin>${linhaHotel}</lin>
  </parametros>
</peticion>`;
}

function montarXML144(linhaHotel) {
    return `<?xml version="1.0" encoding="UTF-8"?>
<peticion>
  <tipo>144</tipo>
  <nombre>Servicio de gastos de cancelacion</nombre>
  <agencia>Palastore</agencia>
  <parametros>
    <datos_reserva>
      <lin>${linhaHotel}</lin>
      <idioma>1</idioma>
    </datos_reserva>
  </parametros>
</peticion>`;
}

function montarXML202(cenario, linhaHotel, codigoHotelEscolhido) {
    let paxesXML = '';
    cenario.quartos.forEach(q => {
        const numAdultos = parseInt(q.pax.split('-')[0]);
        const numCriancas = parseInt(q.pax.split('-')[1]);
        const idadesCriancas = q.idades ? q.idades.toString().split(',') : [];
        let idadesIndex = 0;

        for(let quartoAtual = 0; quartoAtual < q.num; quartoAtual++) {
            // CORREÇÃO: Inserida a idade de 30 anos para os adultos
            for(let i=0; i < numAdultos; i++) {
                paxesXML += `<pax><titulo>Sr.</titulo><nombrePax>Prueba</nombrePax><apellidos>Pruebas</apellidos><edad>30</edad></pax>\n`;
            }
            for(let i=0; i < numCriancas; i++) {
                paxesXML += `<pax><titulo>Niño</titulo><nombrePax>Nino</nombrePax><apellidos>Pruebas</apellidos><edad>${idadesCriancas[idadesIndex] || '8'}</edad></pax>\n`;
                idadesIndex++;
            }
        }
    });

    return `<?xml version="1.0" encoding="UTF-8"?>
<peticion>
  <nombre>Servicio de pre-reserva</nombre>
  <agencia>PALASTORE XML INHOUSE BR XML @</agencia>
  <tipo>202</tipo>
  <parametros>
    <codigo_hotel>${codigoHotelEscolhido || cenario.hotel}</codigo_hotel>
    <nombre_cliente>CLIENTE TEST</nombre_cliente>
    <email>test@test.com</email>
    <telefono>123456789</telefono>
    <num_expediente>00000000</num_expediente>
    <forma_pago>44</forma_pago>
    <res>
      <lin>${linhaHotel}</lin>
    </res>
    <paxes>
      ${paxesXML}
    </paxes>
  </parametros>
</peticion>`;
}

function montarXML3(localizador, acao) {
    return `<?xml version="1.0" encoding="UTF-8"?>
<peticion>
  <nombre>Servicio de confirmacion</nombre>
  <agencia>PALASTORE XML INHOUSE BR XML @</agencia>
  <tipo>3</tipo>
  <parametros>
    <localizador>${localizador}</localizador>
    <accion>${acao}</accion>
  </parametros>
</peticion>`;
}

function montarXML142(localizador) {
    return `<?xml version="1.0" encoding="UTF-8"?>
<peticion>
  <tipo>142</tipo>
  <nombre>Servicio de gastos</nombre>
  <parametros>
    <usuario>${CREDENCIAIS.codusu}</usuario>
    <localizador>${localizador}</localizador>
    <idioma>1</idioma>
  </parametros>
</peticion>`;
}

function montarXML401(locLargo, locCurto) {
    return `<?xml version="1.0" encoding="UTF-8"?>
<peticion>
  <nombre>Servicio de anulacion</nombre>
  <agencia>PALASTORE XML INHOUSE BR XML @</agencia>
  <tipo>401</tipo>
  <parametros>
    <localizador_largo>${locLargo}</localizador_largo>
    <localizador_corto>${locCurto}</localizador_corto>
  </parametros>
</peticion>`;
}

async function dispararAPI(xmlString) {
    const payload = `xml=${encodeURIComponent(xmlString)}`;
    return await axios.post(URL_RESTEL, payload, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Accept-Encoding': 'gzip, deflate' }
    });
}

// ============================================================================
// 4. MOTOR EXECUTOR
// ============================================================================
async function executarCertificacaoReal() {
    console.log('🚀 Iniciando disparos reais para a certificação Restel...\n');

    for (const cenario of CENARIOS) {
        console.log(`\n================== PROCESSANDO ESCENARIO ${cenario.id} ==================`);
        const pastaCenario = path.join(baseDir, `Escenario${cenario.id}`);
        if (!fs.existsSync(pastaCenario)) fs.mkdirSync(pastaCenario);

        const salvarReqRes = (nome, reqXML, resXML) => {
            fs.writeFileSync(path.join(pastaCenario, `Peticion${nome}.xml`), reqXML);
            fs.writeFileSync(path.join(pastaCenario, `Respuesta${nome}.xml`), resXML);
        };

        try {
            // === PASSO 1: XML 110 ===
            console.log('-> Disparando XML 110 (Disponibilidade por Lista)...');
            const xml110 = montarXML110(cenario);
            const res110 = await dispararAPI(xml110);
            salvarReqRes('110', xml110, res110.data);

            let json110 = parser.parse(res110.data);
            let hotéisResp = json110?.respuesta?.param?.hotls?.hot;
            if (!hotéisResp) {
                console.log(`⚠️ Nenhum hotel retornado no Escenario ${cenario.id}. (Verifique Respuesta110.xml)`);
                continue;
            }

            let arrayHoteis = Array.isArray(hotéisResp) ? hotéisResp : [hotéisResp];
            let hotelEncontrado = arrayHoteis.find(h => String(h.cod) === String(cenario.hotel));

            if (!hotelEncontrado) {
                 console.log(`⚠️ O hotel ${cenario.hotel} não estava na resposta do Escenario ${cenario.id}.`);
                 continue;
            }

            let codigoHotelCobol = hotelEncontrado.cod;
            let linhaCapturada = null;

            let linhasDisponiveis = [];
            function buscarLinhas(obj) {
                if (Array.isArray(obj)) {
                    obj.forEach(buscarLinhas);
                } else if (obj && typeof obj === 'object') {
                    if (obj.lin) linhasDisponiveis.push(obj.lin);
                    Object.values(obj).forEach(buscarLinhas);
                }
            }
            buscarLinhas(hotelEncontrado);

            if (linhasDisponiveis.length > 0) {
                if (cenario.exigeTarifaC) {
                    let linhaC = linhasDisponiveis.find(l => l.includes('#C+#') || l.includes('#C #'));
                    linhaCapturada = linhaC ? linhaC : linhasDisponiveis[0];
                } else {
                    linhaCapturada = linhasDisponiveis[0];
                }
            }

            if (!linhaCapturada) {
                console.log(`⚠️ Nenhuma linha de disponibilidad encontrada no Escenario ${cenario.id}.`);
                continue;
            }

            console.log(`🏨 Hotel selecionado: ${codigoHotelCobol} | Linha capturada!`);

            // === PASSO 2 E 3: XML 24 e 144 ===
            console.log('-> Disparando XML 24 e 144...');
            const xml24 = montarXML24(linhaCapturada);
            const res24 = await dispararAPI(xml24);
            salvarReqRes('24', xml24, res24.data);

            const xml144 = montarXML144(linhaCapturada);
            const res144 = await dispararAPI(xml144);
            salvarReqRes('144', xml144, res144.data);

            // === PASSO 4: XML 202 ===
            console.log('-> Disparando XML 202 (Pré-reserva)...');
            const xml202 = montarXML202(cenario, linhaCapturada, codigoHotelCobol);
            const res202 = await dispararAPI(xml202);
            salvarReqRes('202', xml202, res202.data);

            let json202 = parser.parse(res202.data);
            let locTemporario = json202?.respuesta?.parametros?.n_localizador;

            if (!locTemporario) {
                console.log(`⚠️ Pré-reserva falhou para o Escenario ${cenario.id}.`);
                continue;
            }

            // === PASSO 5: XML 3 ===
            console.log(`-> Disparando XML 3 (Ação: ${cenario.acao})...`);
            const xml3 = montarXML3(locTemporario, cenario.acao);
            const res3 = await dispararAPI(xml3);
            salvarReqRes('3', xml3, res3.data);

            let json3 = parser.parse(res3.data);
            let locCurto = json3?.respuesta?.parametros?.localizador_corto;

            // === PASSO 6 E 7: XML 142 e 401 ===
            if (cenario.acao === 'AE' && locCurto) {
                console.log('-> Disparando XML 142 e 401 (Cancelando a reserva de teste)...');
                
                const xml142 = montarXML142(locTemporario);
                const res142 = await dispararAPI(xml142);
                salvarReqRes('142', xml142, res142.data);

                const xml401 = montarXML401(locTemporario, locCurto);
                const res401 = await dispararAPI(xml401);
                salvarReqRes('401', xml401, res401.data);
            }

            console.log(`✅ Escenario ${cenario.id} Concluído!`);

        } catch (erro) {
            console.error(`❌ Erro no Escenario ${cenario.id}:`, erro.message);
        }

        await new Promise(r => setTimeout(r, 2000));
    }
    
    console.log('\n🎉 CERTIFICAÇÃO CONCLUÍDA! Pastas e arquivos XML gerados com sucesso.');
}

executarCertificacaoReal();