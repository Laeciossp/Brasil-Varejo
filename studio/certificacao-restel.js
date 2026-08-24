const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { XMLBuilder, XMLParser } = require('fast-xml-parser');

// ============================================================================
// 1. ÁREA DE CREDENCIAIS (Aguardando e-mail da Marina)
// ============================================================================
const CREDENCIAIS = {
    codigousu: 'AGUARDANDO',
    clausu: 'AGUARDANDO',
    afiliacio: 'RS', // Padrão da Restel
    secacc: 'AGUARDANDO'
};

// O Endpoint único e obrigatório de todas as requisições
const ENDPOINT_RESTEL = `http://xml.hotelresb2b.com/xml/listen_xml.jsp?codigousu=${CREDENCIAIS.codigousu}&clausu=${CREDENCIAIS.clausu}&afiliacio=${CREDENCIAIS.afiliacio}&secacc=${CREDENCIAIS.secacc}`;

// ============================================================================
// 2. PREPARAÇÃO DO AMBIENTE (Pastas da Certificação)
// ============================================================================
console.log('🚀 Iniciando Motor de Certificação Restel...');

const baseDir = path.join(__dirname, 'Certificacao_Restel');

// Criar pasta principal se não existir
if (!fs.existsSync(baseDir)) {
    fs.mkdirSync(baseDir);
    console.log('📁 Pasta base "Certificacao_Restel" criada.');
}

// O manual exige 10 cenários de testes
for (let i = 1; i <= 10; i++) {
    const escDir = path.join(baseDir, `Escenario${i}`);
    if (!fs.existsSync(escDir)) {
        fs.mkdirSync(escDir);
    }
}
console.log('📂 Todas as 10 pastas de cenários (Escenario1 até Escenario10) foram geradas com sucesso!');

// ============================================================================
// 3. CONSTRUTOR DO XML 110 (Disponibilidade) - O Molde
// ============================================================================
// O Escenario 1 pede: 1 adulto, 1 noite, hotel 745388, cliente espanhol (ES)
function gerarPeticion110Escenario1() {
    // Calculando datas dinamicamente (para amanhã e depois de amanhã)
    const hoje = new Date();
    const amanha = new Date(hoje);
    amanha.setDate(amanha.getDate() + 1);
    const depoisDeAmanha = new Date(hoje);
    depoisDeAmanha.setDate(depoisDeAmanha.getDate() + 2);

    const formataData = (d) => `${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}/${d.getFullYear()}`;

    // Montagem da estrutura JSON que será convertida em XML perfeito para a Restel
    const objetoXML = {
        peticion: {
            tipo: 110,
            nombre: 'Servicio de disponibilidad por lista de hoteles',
            agencia: 'Palastore Turismo',
            parametros: {
                hotel: '745388#', // O hotel de certificação exigido com a # obrigatória
                pais: 'ES',
                pais_cliente: 'ES',
                categoria: 0,
                fechaentrada: formataData(amanha),
                fechasalida: formataData(depoisDeAmanha),
                afiliacion: CREDENCIAIS.afiliacio,
                usuario: CREDENCIAIS.codigousu,
                numhab1: 1,
                paxes1: '1-0', // 1 Adulto, 0 Crianças
                edades1: '',
                numhab2: 0,
                paxes2: '2-0',
                edades2: '',
                numhab3: 0,
                paxes3: '2-0',
                edades3: '',
                idioma: 1, // 1 = Espanhol
                informacion_hotel: 0,
                tarifas_reembolsables: 1, // Altamente recomendado pelo manual
                comprimido: 2, // Sempre enviar 2 como mandatório
                gastos: 1 // Recuperar gastos de cancelamento
            }
        }
    };

    // Configurando o construtor para criar o XML no padrão exigido
    const builder = new XMLBuilder({
        format: true,
        ignoreAttributes: false
    });

    const xmlString = `<?xml version="1.0" encoding="UTF-8"?>\n` + builder.build(objetoXML);
    
    // Salvando o arquivo na pasta Escenario1
    const arquivoPath = path.join(baseDir, 'Escenario1', 'Peticion110.xml');
    fs.writeFileSync(arquivoPath, xmlString, 'utf-8');
    
    console.log('📄 Arquivo "Peticion110.xml" do Escenario 1 gerado perfeitamente!');
}

gerarPeticion110Escenario1();

console.log('\n✅ Tudo pronto! Assim que as credenciais chegarem, ativaremos a função de disparo HTTP para os servidores deles.');