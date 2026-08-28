const axios = require('axios');

const CREDENCIAIS = {
    codigousu: 'PPAK',
    clausu: 'xml528786',
    afiliacio: 'RS',
    secacc: '164338',
    codusu: 'BJ0932'
};

const URL_RESTEL = `http://xml.hotelresb2b.com/xml/listen_xml.jsp?codigousu=${CREDENCIAIS.codigousu}&clausu=${CREDENCIAIS.clausu}&afiliacio=${CREDENCIAIS.afiliacio}&secacc=${CREDENCIAIS.secacc}`;

// XML 15 - Informação Estática do Hotel (Não depende de disponibilidade de datas)
const xmlInfo = `<?xml version="1.0" encoding="UTF-8"?>
<peticion>
    <tipo>15</tipo>
    <nombre>Servicio de información de hotel</nombre>
    <agencia>Palastore</agencia>
    <parametros>
        <codigo>745388</codigo>
        <idioma>1</idioma>
    </parametros>
</peticion>`;

async function testarInfo() {
    try {
        console.log('Buscando informações estáticas do hotel 745388 (XML 15)...');
        const payload = `xml=${encodeURIComponent(xmlInfo)}`;
        const res = await axios.post(URL_RESTEL, payload, {
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
        });
        console.log('\nRESPOSTA DA RESTEL (XML 15):');
        console.log(res.data);
    } catch (e) {
        console.error('Erro:', e.message);
    }
}

testarInfo();