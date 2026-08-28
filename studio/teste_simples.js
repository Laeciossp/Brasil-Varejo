const axios = require('axios');

const CREDENCIAIS = {
    codigousu: 'PPAK',
    clausu: 'xml528786',
    afiliacio: 'RS',
    secacc: '164338',
    codusu: 'BJ0932'
};

const URL_RESTEL = `http://xml.hotelresb2b.com/xml/listen_xml.jsp?codigousu=${CREDENCIAIS.codigousu}&clausu=${CREDENCIAIS.clausu}&afiliacio=${CREDENCIAIS.afiliacio}&secacc=${CREDENCIAIS.secacc}`;

// Data fixa de teste para garantir formato MM/DD/YYYY
const xmlTeste = `<?xml version="1.0" encoding="UTF-8"?>
<peticion>
    <tipo>110</tipo>
    <nombre>Servicio de disponibilidad</nombre>
    <agencia>Palastore</agencia>
    <parametros>
        <hotel>745388#</hotel>
        <pais>MV</pais>
        <pais_cliente>ES</pais_cliente>
        <categoria>0</categoria>
        <fechaentrada>09/10/2026</fechaentrada>
        <fechasalida>09/11/2026</fechasalida>
        <afiliacion>${CREDENCIAIS.afiliacio}</afiliacion>
        <usuario>${CREDENCIAIS.codusu}</usuario>
        <numhab1>1</numhab1>
        <paxes1>2-0</paxes1>
        <edades1></edades1>
        <numhab2>0</numhab2>
        <paxes2>2-0</paxes2>
        <edades2></edades2>
        <numhab3>0</numhab3>
        <paxes3>2-0</paxes3>
        <edades3></edades3>
        <idioma>1</idioma>
        <informacion_hotel>0</informacion_hotel>
        <tarifas_reembolsables>1</tarifas_reembolsables>
        <comprimido>2</comprimido>
        <gastos>1</gastos>
    </parametros>
</peticion>`;

async function testar() {
    try {
        console.log('Enviando teste simples para o hotel 745388...');
        const payload = `xml=${encodeURIComponent(xmlTeste)}`;
        const res = await axios.post(URL_RESTEL, payload, {
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
        });
        console.log('\nRESPOSTA DA RESTEL:');
        console.log(res.data);
    } catch (e) {
        console.error('Erro:', e.message);
    }
}

testar();