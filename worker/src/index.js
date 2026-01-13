var src_default = {
  async fetch(req, env) {
    // --- CONFIGURAÇÃO DE CORS (Essencial para o navegador aceitar a resposta) ---
    const origin = req.headers.get("Origin") || "*";
    const headers = {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": origin,
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Access-Control-Allow-Credentials": "true",
    };

    // Responde requisições de "pre-flight" do navegador
    if (req.method === "OPTIONS") {
      return new Response(null, { headers });
    }

    try {
      const url = new URL(req.url);

      // =================================================================
      // 1. ROTA: LOGIN MELHOR ENVIO
      // =================================================================
      if (url.pathname === "/login/melhorenvio") {
        const client_id = env.MELHORENVIO_CLIENT_ID;
        const redirect_uri = "https://brasil-varejo-api.laeciossp.workers.dev/callback/melhorenvio";
        const scope = "shipping-calculate shipping-checkout shipping-info user-read";
        const authUrl = `https://www.melhorenvio.com.br/oauth/authorize?client_id=${client_id}&redirect_uri=${encodeURIComponent(redirect_uri)}&response_type=code&scope=${encodeURIComponent(scope)}`;
        return Response.redirect(authUrl, 302);
      }

      // =================================================================
      // 2. ROTA: CALLBACK MELHOR ENVIO
      // =================================================================
      if (url.pathname === "/callback/melhorenvio") {
        const code = url.searchParams.get("code");
        
        const response = await fetch("https://www.melhorenvio.com.br/oauth/token", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            grant_type: "authorization_code",
            client_id: env.MELHORENVIO_CLIENT_ID,
            client_secret: env.MELHORENVIO_CLIENT_SECRET,
            redirect_uri: "https://brasil-varejo-api.laeciossp.workers.dev/callback/melhorenvio",
            code
          })
        });

        const data = await response.json();

        if (data.access_token) {
          // Salva o token no KV (CARRINHO)
          await env.CARRINHO.put("MELHORENVIO_TOKEN", data.access_token);
          return new Response("Autorizado com Sucesso no Brasil Varejo! Pode fechar esta aba.", { headers });
        }
        return new Response(JSON.stringify({ error: "Erro na autorização", details: data }), { status: 400, headers });
      }

      // =================================================================
      // 3. ROTA: CÁLCULO DE FRETE
      // =================================================================
      if (req.method === "POST" && url.pathname.includes("shipping")) {
        const body = await req.json();
        
        // --- A. Verifica Frete Grátis no Sanity ---
        const productId = body.products?.[0]?.id;
        let isFreeShipping = false;
        
        if (productId && env.SANITY_PROJECT_ID) {
             try {
                 const query = encodeURIComponent(`*[_type == "product" && _id == "${productId}"][0].freeShipping`);
                 const sanityUrl = `https://${env.SANITY_PROJECT_ID}.api.sanity.io/v2021-10-21/data/query/${env.SANITY_DATASET || 'production'}?query=${query}`;
                 
                 const sanityResp = await fetch(sanityUrl, { 
                    headers: { "Authorization": `Bearer ${env.SANITY_TOKEN}` }
                 });
                 const sanityData = await sanityResp.json();
                 if (sanityData.result === true) isFreeShipping = true;
             } catch(e) { console.log("Erro Sanity Frete:", e); }
        }

        // --- B. Configurações Gerais ---
        let handlingTime = 0; // Dias de manuseio
        let cepOrigem = "43805000"; 
        let token = await env.CARRINHO.get("MELHORENVIO_TOKEN");

        // --- C. Retorno Rápido se for Frete Grátis ---
        if (isFreeShipping) {
             return new Response(JSON.stringify([{
                name: "FRETE GRÁTIS",
                price: 0,
                delivery_time: 12, 
                delivery_range: { min: 5, max: 12 },
                company: { picture: null },
                custom_msg: "Promoção Brasil Varejo"
             }]), { headers });
        }

        if (!token) return new Response(JSON.stringify([]), { headers });

        // --- D. Payload para Melhor Envio ---
        const payload = {
          from: { postal_code: cepOrigem },
          to: { postal_code: (body.to?.postal_code || body.cepDestino || "").replace(/\D/g, "") },
          products: (body.products || body.items || []).map((p) => ({
            id: p.id || "item",
            width: Number(p.width || 15),
            height: Number(p.height || 15),
            length: Number(p.length || 15),
            weight: Number(p.weight || 0.5),
            insurance_value: Number(p.insurance_value || 100),
            quantity: Number(p.quantity || 1)
          }))
        };

        const meResponse = await fetch("https://www.melhorenvio.com.br/api/v2/me/shipment/calculate", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json",
            "Accept": "application/json",
            "User-Agent": "Brasil Varejo"
          },
          body: JSON.stringify(payload)
        });

        const fretes = await meResponse.json();
        
        const resultado = Array.isArray(fretes) ? fretes.filter((f) => !f.error).map((f) => ({
          ...f,
          name: f.company?.name || f.name,
          delivery_time: Number(f.delivery_time) + Number(handlingTime),
          custom_delivery_range: f.delivery_range ? {
            min: Number(f.delivery_range.min) + Number(handlingTime),
            max: Number(f.delivery_range.max) + Number(handlingTime)
          } : null
        })) : [];

        return new Response(JSON.stringify(resultado), { headers });
      }

      // =================================================================
      // 4. ROTA: CHECKOUT (CORRIGIDA - ID GERADO MANUALMENTE)
      // =================================================================
      if (req.method === "POST" && url.pathname.includes("checkout")) {
        const reqData = await req.json();
        const { items, email, shipping, tipoPagamento, shippingAddress, customerDocument, totalAmount } = reqData;

        // Validação de segurança básica para o documento
        const finalDocument = customerDocument || shippingAddress?.cpf || shippingAddress?.cnpj || "";

        // [CORREÇÃO] Gera o ID manualmente para não depender da resposta do Sanity
        const generatedId = `order-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;

        // --- PASSO A: PREPARAR O PEDIDO PARA O SANITY ---
        const newOrder = {
            _type: 'order',
            _id: generatedId, // ID forçado
            orderNumber: `PALA-${Math.floor(Date.now() / 1000)}`,
            status: 'pending',
            totalAmount: totalAmount || 0,
            customerEmail: email,
            customerDocument: finalDocument,
            shippingAddress: {
                ...shippingAddress,
                cpf: shippingAddress?.cpf || finalDocument // Garante CPF no endereço
            },
            paymentMethod: tipoPagamento,
            items: items.map(item => ({
                _key: Math.random().toString(36).substr(2, 9),
                productName: item.name || item.title,
                quantity: item.quantity,
                price: item.price
            }))
        };

        const mutationUrl = `https://${env.SANITY_PROJECT_ID}.api.sanity.io/v2021-06-07/data/mutate/${env.SANITY_DATASET || 'production'}`;
        
        // Envia para o Sanity usando 'create' ou 'createIfNotExists' com nosso ID
        const sanityResponse = await fetch(mutationUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${env.SANITY_TOKEN}`
            },
            body: JSON.stringify({ mutations: [{ createIfNotExists: newOrder }] })
        });

        // Verificação de erro do Sanity (apenas para log, não trava se o ID já estiver definido)
        const sanityResult = await sanityResponse.json();
        if (sanityResult.error) {
             throw new Error(`Erro Sanity: ${JSON.stringify(sanityResult.error)}`);
        }

        // --- PASSO B: GERAR PAGAMENTO NO MERCADO PAGO ---
        const isCashPayment = (tipoPagamento === 'pix' || tipoPagamento === 'boleto');
        const fatorDesconto = isCashPayment ? 0.9 : 1.0;

        const mpItems = items.map((item) => ({
          title: item.title || item.name || "Produto Palastore",
          quantity: Number(item.quantity || 1),
          unit_price: Number((Number(item.price) * fatorDesconto).toFixed(2)),
          currency_id: "BRL"
        }));

        if (Number(shipping) > 0) {
          mpItems.push({
            title: "Frete e Envio",
            quantity: 1,
            unit_price: Number(Number(shipping).toFixed(2)),
            currency_id: "BRL"
          });
        }

        const cleanCPF = finalDocument.replace(/\D/g, '');
        
        const payerData = {
            email: email,
            first_name: shippingAddress?.alias || "Cliente",
            identification: { type: "CPF", number: cleanCPF }
        };

        // Regras de exclusão de pagamento
        let excludedMethods = [];
        if (tipoPagamento === 'boleto') {
            excludedMethods = [{ id: "credit_card" }, { id: "debit_card" }, { id: "bank_transfer" }];
        } else if (tipoPagamento === 'pix') {
            excludedMethods = [{ id: "credit_card" }, { id: "debit_card" }, { id: "ticket" }];
        } else {
            excludedMethods = [{ id: "ticket" }, { id: "bank_transfer" }];
        }

        const preferenceData = {
          items: mpItems,
          payer: payerData,
          back_urls: {
            success: "https://palastore.com.br/sucesso", 
            failure: "https://palastore.com.br/cart",
            pending: "https://palastore.com.br/sucesso"
          },
          auto_return: "approved",
          external_reference: generatedId, // Link correto com o ID que geramos
          notification_url: "https://brasil-varejo-api.laeciossp.workers.dev/webhook",
          payment_methods: {
            excluded_payment_types: excludedMethods,
            installments: 12
          },
          expires: true,
          date_of_expiration: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString()
        };

        const mpResponse = await fetch("https://api.mercadopago.com/checkout/preferences", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${env.MP_ACCESS_TOKEN}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify(preferenceData)
        });

        const mpSession = await mpResponse.json();
        
        if (!mpResponse.ok) {
            return new Response(JSON.stringify({ error: "Erro MercadoPago", details: mpSession }), { status: 400, headers });
        }

        return new Response(JSON.stringify({ 
          url: mpSession.init_point,
          id_preferencia: mpSession.id 
        }), { headers });
      }

      // =================================================================
      // 5. ROTA: WEBHOOK
      // =================================================================
      if (url.pathname.includes("webhook")) {
        const urlParams = new URLSearchParams(url.search);
        const dataId = urlParams.get("data.id") || urlParams.get("id");

        if (dataId) {
          const respPagamento = await fetch(`https://api.mercadopago.com/v1/payments/${dataId}`, {
            headers: { "Authorization": `Bearer ${env.MP_ACCESS_TOKEN}` }
          });

          if (respPagamento.ok) {
            const pagamento = await respPagamento.json();
            
            if (pagamento.status === "approved") {
              const sanityId = pagamento.external_reference;
              
              if (sanityId && env.SANITY_TOKEN && env.SANITY_PROJECT_ID) {
                const mutation = {
                  mutations: [{
                      patch: {
                        id: sanityId,
                        set: {
                          status: "paid",
                          paidAt: new Date().toISOString(),
                          paymentMethod: pagamento.payment_method_id
                        }
                      }
                  }]
                };

                await fetch(`https://${env.SANITY_PROJECT_ID}.api.sanity.io/v2021-06-07/data/mutate/${env.SANITY_DATASET || 'production'}`, {
                  method: "POST",
                  headers: {
                    "Authorization": `Bearer ${env.SANITY_TOKEN}`,
                    "Content-Type": "application/json"
                  },
                  body: JSON.stringify(mutation)
                });
              }
            }
          }
        }
        return new Response("OK", { status: 200 });
      }

      return new Response(JSON.stringify({ status: "API Online", versao: "3.0-AutoID-Fix" }), { status: 200, headers });

    } catch (err) {
      // Retorno de erro amigável para debug
      return new Response(JSON.stringify({ 
          erro: err.message, 
          stack: err.stack,
          dica: "Se for erro do Sanity, verifique se o Schema suporta os campos enviados."
      }), { status: 500, headers });
    }
  }
};

export { src_default as default };