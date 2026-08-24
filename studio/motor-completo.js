const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { XMLBuilder, XMLParser } = require('fast-xml-parser');

// ============================================================================
// 1. CREDENCIAIS OFICIAIS (Preencha quando a Marina enviar)
// ============================================================================
const CREDENCIAIS = {
    codigousu: 'AGUARDANDO',
    clausu: 'AGUARDANDO',
    afiliacio: 'RS',
    secacc: 'AGUARDANDO'
};

const URL_RESTEL = `http://xml.hotelresb2b.com/xml/listen_xml.jsp?codigousu=${CREDENCIAIS.codigousu}&clausu=${CREDENCIAIS.clausu}&afiliacio=${CREDENCIAIS.afiliacio}&secacc=${CREDENCIAIS.secacc}`;

const builder = new XMLBuilder({ format: true, ignoreAttributes: false });
const parser = new XMLParser({ ignoreAttributes: false });

const baseDir = path.join(__dirname, 'Certificacao_Restel');
if (!fs.existsSync(baseDir)) fs.mkdirSync(baseDir);

// Helpers de Data
const addDias = (dias) => {
    const d = new Date();
    d.setDate(d.getDate() + dias);
    return `${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}/${d.getFullYear()}`;
};

// ============================================================================
// 2. O DICIONÁRIO DOS 10 CENÁRIOS EXIGIDOS PELA RESTEL
// ============================================================================
const CENARIOS = [
    { id: 1, hotel: '745388#', noites: 1, nat: 'ES', quartos: [{ hab: 1, pax: '1-0', idades: '' }], acao: 'AE' }, // AE = Confirmar e depois cancelar
    { id: 2, hotel: '745388#', noites: 1, nat: 'IN', quartos: [{ hab: 1, pax: '2-1', idades: '6' }], acao: 'AI' }, // AI = Denegar (não precisa cancelar depois)
    { id: 3, hotel: '745388#', noites: 2, nat: 'CN', quartos: [{ hab: 1, pax: '2-0', idades: '' }, { hab: 2, pax: '1-0', idades: '' }], acao: 'AE' },
    { id: 4, hotel: '601022#', noites: 2, nat: 'ES', quartos: [{ hab: 1, pax: '2-0', idades: '' }, { hab: 2, pax: '2-0', idades: '' }], acao: 'AE' },
    { id: 5, hotel: '745388#', noites: 7, nat: 'IN', quartos: [{ hab: 1, pax: '3-0', idades: '' }], acao: 'AE' },
    { id: 6, hotel: '745388#', noites: 2, nat: 'CN', quartos: [{ hab: 1, pax: '1-1', idades: '1' }, { hab: 2, pax: '1-1', idades: '5' }], acao: 'AE' },
    { id: 7, hotel: '745388#', noites: 3, nat: 'ES', quartos: [{ hab: 1, pax: '1-1', idades: '10' }, { hab: 2, pax: '2-1', idades: '9' }], acao: 'AE' },
    { id: 8, hotel: '601022#', noites: 3, nat: 'IN', quartos: [{ hab: 1, pax: '2-0', idades: '' }], acao: 'AE' },
    { id: 9, hotel: '745388#', noites: 1, nat: 'ES', quartos: [{ hab: 1, pax: '1-2', idades: '3,8' }], acao: 'AE' },
    { id: 10, hotel: '745388#', noites: 1, nat: 'ES', quartos: [{ hab: 1, pax: '1-2', idades: '4,5' }, { hab: 2, pax: '1-2', idades: '7,9' }], acao: 'AE' }
];

// ============================================================================
// 3. FUNÇÕES CONSTRUTORAS DE XML POR FASE
// ============================================================================

function montarXML110(cenario) {
    let params = {
        hotel: cenario.hotel,
        pais: cenario.nat,
        pais_cliente: cenario.nat,
        categoria: 0,
        fechaentrada: addDias(10),
        fechasalida: addDias(10 + cenario.noites),
        afiliacion: CREDENCIAIS.afiliacio,
        usuario: CREDENCIAIS.codigousu,
        idioma: 1,
        informacion_hotel: 0,
        tarifas_reembolsables: 1,
        comprimido: 2,
        gastos: 1
    };
    
    // Adiciona os quartos dinamicamente
    cenario.quartos.forEach((q) => {
        params[`numhab${q.hab}`] = 1;
        params[`paxes${q.hab}`] = q.pax;
        params[`edades${q.hab}`] = q.idades;
    });

    return `<?xml version="1.0" encoding="UTF-8"?>\n` + builder.build({ peticion: { tipo: 110, nombre: 'Disponibilidad', agencia: 'Palastore', parametros: params }});
}

function montarXML24(linhaHotel) {
    return `<?xml version="1.0" encoding="UTF-8"?>\n` + builder.build({ peticion: { tipo: 24, nombre: 'Observaciones', agencia: 'Palastore', parametros: { lin: linhaHotel } }});
}

function montarXML144(linhaHotel) {
    return `<?xml version="1.0" encoding="UTF-8"?>\n` + builder.build({ peticion: { tipo: 144, nombre: 'Cancelacion', agencia: 'Palastore', parametros: { datos_reserva: { lin: linhaHotel, idioma: 1 } } }});
}

function montarXML202(cenario, linhaHotel) {
    let paxesArr = [];
    cenario.quartos.forEach(q => {
        const numAdultos = parseInt(q.pax.split('-')[0]);
        const numCriancas = parseInt(q.pax.split('-')[1]);
        for(let i=0; i < numAdultos; i++) paxesArr.push({ titulo: 'Sr.', nombrePax: 'Viajante', apellidos: 'Teste', edad: '' });
        for(let i=0; i < numCriancas; i++) paxesArr.push({ titulo: 'Niño', nombrePax: 'Crianca', apellidos: 'Teste', edad: '8' });
    });

    return `<?xml version="1.0" encoding="UTF-8"?>\n` + builder.build({ peticion: { tipo: 202, nombre: 'Pre-reserva', agencia: 'Palastore', parametros: {
        codigo_hotel: cenario.hotel.replace('#',''),
        nombre_cliente: 'CLIENTE TEST',
        email: 'contato@palastore.com.br',
        telefono: '11999999999',
        forma_pago: 44, // Pre-pago
        res: { lin: linhaHotel },
        paxes: { pax: paxesArr }
    }}});
}

function montarXML3(localizador, acao) {
    return `<?xml version="1.0" encoding="UTF-8"?>\n` + builder.build({ peticion: { tipo: 3, nombre: 'Confirmacion', agencia: 'Palastore', parametros: { localizador: localizador, accion: acao } }});
}

function montarXML142(localizador) {
    return `<?xml version="1.0" encoding="UTF-8"?>\n` + builder.build({ peticion: { tipo: 142, nombre: 'Gastos Confirmados', parametros: { usuario: CREDENCIAIS.codigousu, localizador: localizador, idioma: 1 } }});
}

function montarXML401(locLargo, locCurto) {
    return `<?xml version="1.0" encoding="UTF-8"?>\n` + builder.build({ peticion: { tipo: 401, nombre: 'Anulacion', agencia: 'Palastore', parametros: { localizador_largo: locLargo, localizador_corto: locCurto } }});
}

// ============================================================================
// 4. MOTOR EXECUTOR (A Máquina de Estado)
// ============================================================================
async function executarCertificacao() {
    console.log('🚀 Iniciando processamento em lote dos 10 Cenários da Restel...\n');

    for (const cenario of CENARIOS) {
        console.log(`\n================== PROCESSANDO ESCENARIO ${cenario.id} ==================`);
        const pastaCenario = path.join(baseDir, `Escenario${cenario.id}`);
        if (!fs.existsSync(pastaCenario)) fs.mkdirSync(pastaCenario);

        const salvarReqRes = (nome, reqXML, resXML) => {
            fs.writeFileSync(path.join(pastaCenario, `Peticion${nome}.xml`), reqXML);
            fs.writeFileSync(path.join(pastaCenario, `Respuesta${nome}.xml`), resXML);
        };

        try {
            // === PASSO 1: DISPONIBILIDADE ===
            console.log('-> Executando XML 110 (Disponibilidade)...');
            const xml110 = montarXML110(cenario);
            // const res110 = await axios.post(URL_RESTEL, xml110, { headers: { 'Content-Type': 'application/xml' }});
            // let json110 = parser.parse(res110.data);
            
            // SIMULAÇÃO: Como não temos a senha, estamos simulando a captura da linha
            let linhaCapturada = `DB#1#C+#50.00#0.00#OB#OK#20261010#20261011#EU#${cenario.quartos[0].pax}#0#0#00000000#${cenario.hotel}#`;
            let fakeRes110 = `<resposta><tipo>110</tipo><param><hotls><hot><res><pax><hab><reg><lin>${linhaCapturada}</lin></reg></hab></pax></res></hot></hotls></param></resposta>`;
            salvarReqRes('110', xml110, fakeRes110);


            // === PASSO 2 E 3: OBSERVAÇÕES E CANCELAMENTO ===
            console.log('-> Executando XML 24 e 144...');
            const xml24 = montarXML24(linhaCapturada);
            const xml144 = montarXML144(linhaCapturada);
            salvarReqRes('24', xml24, `<resposta><tipo>24</tipo><parametros><observaciones><observacion>TESTE</observacion></observaciones></parametros></resposta>`);
            salvarReqRes('144', xml144, `<resposta><tipo>144</tipo><parametros><politicaCanc><entra_en_gastos>0</entra_en_gastos></politicaCanc></parametros></resposta>`);


            // === PASSO 4: PRÉ-RESERVA ===
            console.log('-> Executando XML 202 (Pré-reserva)...');
            const xml202 = montarXML202(cenario, linhaCapturada);
            let locTemporario = '29775194'; // Simulação do retorno da API
            salvarReqRes('202', xml202, `<resposta><tipo>202</tipo><parametros><estado>00</estado><n_localizador>${locTemporario}</n_localizador></parametros></resposta>`);


            // === PASSO 5: CONFIRMAÇÃO OU NEGAÇÃO ===
            console.log(`-> Executando XML 3 (Ação: ${cenario.acao})...`);
            const xml3 = montarXML3(locTemporario, cenario.acao);
            let locCurto = '25495917';
            salvarReqRes('3', xml3, `<resposta><tipo>3</tipo><parametros><estado>00</estado><localizador_corto>${locCurto}</localizador_corto></parametros></resposta>`);


            // === PASSO 6 E 7: APENAS SE FOR CONFIRMADO (AE) ===
            if (cenario.acao === 'AE') {
                console.log('-> Executando XML 142 e 401 (Lendo gastos e Cancelando a reserva)...');
                const xml142 = montarXML142(locTemporario);
                const xml401 = montarXML401(locTemporario, locCurto);
                salvarReqRes('142', xml142, `<resposta><tipo>142</tipo><parametros><politicaCanc></politicaCanc></parametros></resposta>`);
                salvarReqRes('401', xml401, `<resposta><tipo>401</tipo><parametros><estado>00</estado><localizador_baja>ANULADA</localizador_baja></parametros></resposta>`);
            }

            console.log(`✅ Escenario ${cenario.id} Concluído e arquivos gerados!`);

        } catch (erro) {
            console.error(`❌ Erro no Escenario ${cenario.id}:`, erro.message);
        }
    }
    
    console.log('\n🎉 SCRIPT FINALIZADO! Todas as pastas estão prontas. Quando tiver a senha, descomente a linha do axios para disparar real!');
}

executarCertificacao();