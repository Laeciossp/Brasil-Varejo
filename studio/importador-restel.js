const axios = require('axios');
const { XMLParser } = require('fast-xml-parser');
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');

class RestelCatalogImporter {
    constructor(config) {
        this.config = config;
        this.urlBase = `http://xml.hotelresb2b.com/xml/listen_xml.jsp?codigousu=${config.codigousu}&clausu=${config.clausu}&afiliacio=${config.afiliacio}&secacc=${config.secacc}`;
        this.parser = new XMLParser({ 
            ignoreAttributes: false, 
            attributeNamePrefix: "@_",
            textNodeName: "text"
        });
    }

    async _enviarRequisicao(xmlString) {
        try {
            const response = await axios.post(this.urlBase, `xml=${encodeURIComponent(xmlString)}`, {
                headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Accept-Encoding': 'gzip, deflate' },
                timeout: 45000 // Aumentado para 45s pois requisições globais são mais pesadas
            });
            return this.parser.parse(response.data);
        } catch (error) {
            return null;
        }
    }

    _toArray(item) {
        if (!item) return [];
        return Array.isArray(item) ? item : [item];
    }

    // 1. XML 5 - BUSCA A LISTA DE TODOS OS PAÍSES DO MUNDO
    async baixarListaPaises() {
        const xml = `<?xml version="1.0" encoding="UTF-8"?>
<peticion>
    <tipo>5</tipo>
    <nombre>Peticion de paises</nombre>
    <agencia>PALASTORE XML INHOUSE BR XML @</agencia>
    <parametros>
        <usuario>${this.config.codusu}</usuario>
        <idioma>1</idioma>
    </parametros>
</peticion>`;
        const res = await this._enviarRequisicao(xml);
        // Tenta capturar o array de países independente de como a Restel aninha o XML
        const paises = res?.respuesta?.parametros?.paises?.pais || res?.respuesta?.param?.paises?.pais || [];
        return this._toArray(paises);
    }

    // 2. XML 17 - BUSCA A LISTA DE HOTÉIS DE UM PAÍS ESPECÍFICO
    async baixarListaHoteis(codPais) {
        const xml = `<?xml version="1.0" encoding="UTF-8"?>
<peticion>
    <tipo>17</tipo>
    <nombre>Peticion de listado de hoteles</nombre>
    <agencia>PALASTORE XML INHOUSE BR XML @</agencia>
    <parametros>
        <pais>${codPais}</pais>
    </parametros>
</peticion>`;
        const res = await this._enviarRequisicao(xml);
        const hoteis = res?.respuesta?.parametros?.hoteles?.hotel || res?.respuesta?.param?.hotls?.hot || [];
        return this._toArray(hoteis);
    }

    // 3. XML 15 - FAZ O DOWNLOAD PROFUNDO DE UM HOTEL ESPECÍFICO
    async baixarDetalhesHotel(codigoCobol) {
        const xml = `<?xml version="1.0" encoding="UTF-8"?>
<peticion>
    <tipo>15</tipo>
    <nombre>Detalle de hotel</nombre>
    <agencia>PALASTORE XML INHOUSE BR XML @</agencia>
    <parametros>
        <usuario>${this.config.codusu}</usuario>
        <hotel>${String(codigoCobol).trim().padStart(6, '0')}</hotel>
        <idioma>1</idioma>
    </parametros>
</peticion>`;
        const res = await this._enviarRequisicao(xml);
        return res?.respuesta?.param?.hotel || res?.respuesta?.parametros?.hotel || res?.respuesta?.hotel || null;
    }

    // 4. PROCESSADOR HÍBRIDO (POR PAÍS)
    async importarEAtualizarHibrido(prismaClient, codPais) {
        try {
            console.log(`🌍 Baixando lista de hotéis para o país: ${codPais}...`);
            const listaMestra = await this.baixarListaHoteis(codPais);
            
            if (listaMestra.length === 0) {
                console.log(`📍 Nenhum hotel encontrado no país ${codPais}. Pulando...`);
                return;
            }

            console.log(`📊 Encontrados ${listaMestra.length} hotéis em ${codPais}. Iniciando extração profunda...`);
            
            let processados = 0;
            let erros = 0;

            for (const item of listaMestra) {
                const cobol = item['@_codigo'] || item.codigo || item.cobol;
                if (!cobol) continue;

                const ht = await this.baixarDetalhesHotel(cobol);
                
                if (ht) {
                    const name = ht['@_nombre'] || ht.nombre || item.nombre || "Hotel Restel";
                    const address = ht['@_direccion'] || ht.direccion || "";
                    const zipCode = ht['@_cp'] || ht.cp || "";
                    
                    const catRaw = ht['@_categoria'] || ht.categoria || "0";
                    const category = parseInt(String(catRaw).replace(/\D/g, '')) || 0;

                    let latitude = 0, longitude = 0;
                    if (ht.plano) {
                        latitude = parseFloat(ht.plano['@_latitud'] || ht.plano.latitud) || 0;
                        longitude = parseFloat(ht.plano['@_longitud'] || ht.plano.longitud) || 0;
                    }

                    let description = "";
                    if (ht.descripciones && ht.descripciones.descripcion) {
                        const descList = this._toArray(ht.descripciones.descripcion);
                        const primeiraDesc = descList[0];
                        description = typeof primeiraDesc === 'object' ? (primeiraDesc.text || primeiraDesc['#text'] || "") : primeiraDesc;
                    }

                    let images = [];
                    if (ht.fotos && ht.fotos.foto) {
                        const fotoList = this._toArray(ht.fotos.foto);
                        images = fotoList.map(f => typeof f === 'object' ? (f.text || f['#text'] || f['@_url']) : f)
                                         .filter(url => typeof url === 'string' && url.startsWith('http'));
                    }

                    let amenities = [];
                    if (ht.servicios && ht.servicios.servicio) {
                        const servList = this._toArray(ht.servicios.servicio);
                        amenities = servList.map(s => typeof s === 'object' ? (s['@_desc'] || s.text || s['#text']) : s)
                                            .filter(Boolean);
                    }

                    const dadosMapeados = {
                        name: String(name).trim(),
                        address: String(address).trim(),
                        zipCode: String(zipCode).trim(),
                        category: category,
                        latitude: latitude,
                        longitude: longitude,
                        description: String(description).trim(),
                        images: images,
                        amenities: amenities,
                        countryCode: codPais,
                        updatedAt: new Date()
                    };

                    await prismaClient.restelHotel.upsert({
                        where: { cobol: String(cobol) },
                        update: dadosMapeados,
                        create: {
                            cobol: String(cobol),
                            ...dadosMapeados
                        }
                    });

                    processados++;
                    if (processados % 20 === 0) {
                        console.log(`✨ Progresso [${codPais}]: ${processados} hotéis importados...`);
                    }
                } else {
                    erros++;
                }

                // Respiro de 150ms para evitar bloqueio por DDoS na API da Restel
                await new Promise(resolve => setTimeout(resolve, 150));
            }

            console.log(`✅ País ${codPais} concluído! Sucesso: ${processados} | Falhas Restel: ${erros}`);
        } catch (error) {
            console.error(`❌ Erro crítico no país ${codPais}:`, error.message);
        }
    }

    // 5. O GRANDE ORQUESTRADOR GLOBAL
    async sincronizarMundo(prismaClient) {
        console.log("🌍 Iniciando Mapeamento GLOBAL de Países (XML 5)...");
        const paises = await this.baixarListaPaises();

        if (paises.length === 0) {
            console.log("❌ Nenhum país foi retornado pela API da Restel. Verifique se o IP do seu computador está liberado no painel da Restel de produção.");
            return;
        }

        console.log(`🗺️ Catálogo de Produção confirmou: ${paises.length} países disponíveis. Iniciando varredura mundial!`);

        for (const pais of paises) {
            const codPais = pais['@_codigo'] || pais.codigo;
            const nomePais = pais['@_nombre'] || pais.nombre || codPais;
            
            if (!codPais) continue;

            console.log(`\n======================================================`);
            console.log(`✈️  Iniciando importação do País: ${nomePais} (${codPais})`);
            console.log(`======================================================`);
            
            await this.importarEAtualizarHibrido(prismaClient, codPais);
        }

        console.log("\n🎉 SINCRONIZAÇÃO MUNDIAL CONCLUÍDA COM SUCESSO!");
    }
}

module.exports = RestelCatalogImporter;

// ==========================================
// BLOCO DE EXECUÇÃO AUTOMÁTICA
// ==========================================
if (require.main === module) {
    // URL EXATA COM A PORTA 6543 QUE RESOLVEU O PROBLEMA DO BANCO
    const DATABASE_URL = "postgresql://postgres.vcqiilytjrrurdbscmio:Saopedro31%23@aws-0-us-west-2.pooler.supabase.com:6543/postgres?pgbouncer=true";
    
    const pool = new Pool({ connectionString: DATABASE_URL });
    const adapter = new PrismaPg(pool);
    const prisma = new PrismaClient({ adapter });

    const importer = new RestelCatalogImporter({
        codigousu: "PPAK",      // Certifique-se de que estas credenciais 
        clausu: "xml528786",    // são efetivamente as de PRODUÇÃO enviadas 
        afiliacio: "RS",        // pela Restel (geralmente eles enviam senhas 
        secacc: "164338",       // diferentes para o ambiente de produção).
        codusu: "BJ0932"
    });

    console.log(`🚀 Acionando Robô de Sincronização GLOBAL Restel...`);
    
    // Chama o Orquestrador Mundial ao invés de um país só
    importer.sincronizarMundo(prisma)
        .then(async () => {
            console.log("✅ Conexão com o Supabase encerrada com segurança.");
            await prisma.$disconnect();
            process.exit(0);
        })
        .catch(async (err) => {
            console.error("❌ Erro fatal na execução:", err);
            await prisma.$disconnect();
            process.exit(1);
        });
}