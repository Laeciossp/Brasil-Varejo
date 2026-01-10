var src_default = {
  async fetch(req, env) {
    // --- CONFIGURAÇÃO DE CORS ---
    const origin = req.headers.get("Origin") || "*";
    const headers = {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": origin,
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Access-Control-Allow-Credentials": "true",
    };

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
        
        // Verificação de Frete Grátis via Sanity
        const productId = body.products?.[0]?.id;
        let isFreeShipping = false;

        if (productId && env.SANITY_PROJECT_ID) {
            try {
                const query = `*[_type == "product" && _id == "${productId}"][0].freeShipping`;
                const sanityUrl = `https://${env.SANITY_PROJECT_ID}.api.sanity.io/v2021-10-21/data/query/${env.SANITY_DATASET || 'production'}?query=${encodeURIComponent(query)}`;
                
                const sanityResp = await fetch(sanityUrl, {
                    headers: { "Authorization": `Bearer ${env.SANITY_TOKEN}` }
                });
                const sanityData = await sanityResp.json();
                
                if (sanityData.result === true) {
                    isFreeShipping = true;
                }
            } catch (e) {
                console.log("Erro ao verificar Sanity:", e);
            }
        }

        // Configurações Gerais
        let handlingTime = 0;
        let cepOrigem = "43805000";
        let token = await env.CARRINHO.get("MELHORENVIO_TOKEN");

        try {
            const sanityQueryConfig = encodeURIComponent('*[_type == "shippingSettings"][0]');
            const configUrl = `https://${env.SANITY_PROJECT_ID}.api.sanity.io/v2021-06-07/data/query/${env.SANITY_DATASET || 'production'}?query=${sanityQueryConfig}`;
            const sanityRespConfig = await fetch(configUrl, {
                headers: { "Authorization": `Bearer ${env.SANITY_TOKEN}` }
            });
            const { result: settings } = await sanityRespConfig.json();
            
            if (settings) {
                handlingTime = settings.handlingTime || 0;
                if (settings.originCep) cepOrigem = settings.originCep.replace(/\D/g, "");
                if (settings.apiToken) token = settings.apiToken;
            }
        } catch(e) { console.log("Erro config sanity", e); }

        // Retorno Frete Grátis (FIXADO EM 12 DIAS)
        if (isFreeShipping) {
             const freeOption = [{
                name: "FRETE GRÁTIS",
                price: 0,
                delivery_time: 12, 
                delivery_range: { min: 5, max: 12 },
                company: { picture: null },
                custom_msg: "Promoção Brasil Varejo"
             }];
             return new Response(JSON.stringify(freeOption), { headers });
        }

        // Cálculo Melhor Envio
        if (!token) return new Response(JSON.stringify([]), { headers });
        
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
      // 4. ROTA: CHECKOUT MERCADO PAGO (CORRIGIDO PARA BOLETO)
      // =================================================================
      if (req.method === "POST" && url.pathname.includes("checkout")) {
        const { items, email, orderId, shipping, tipoPagamento, shippingAddress, customerDocument } = await req.json();
        
        // Verifica se é pagamento à vista (Pix ou Boleto)
        const isCashPayment = (tipoPagamento === 'pix' || tipoPagamento === 'boleto');
        
        const fatorDesconto = isCashPayment ? 0.9 : 1.0;

        const mpItems = items.map((item) => ({
          title: item.title || "Produto Brasil Varejo",
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

        const payerData = {
            email: email || "cliente@brasilvarejo.com",
            identification: { 
                type: "CPF", 
                number: customerDocument?.replace(/\D/g, '') || "00000000000" 
            },
            address: {
                street_name: shippingAddress?.street || "Rua",
                street_number: Number(shippingAddress?.number) || 0,
                zip_code: shippingAddress?.zip || "00000000"
            }
        };

        const preferenceData = {
          items: mpItems,
          payer: payerData,
          back_urls: {
            success: "https://brasil-varejo.vercel.app/profile",
            failure: "https://brasil-varejo.vercel.app/cart",
            pending: "https://brasil-varejo.vercel.app/cart"
          },
          auto_return: "approved",
          external_reference: orderId,
          notification_url: "https://brasil-varejo-api.laeciossp.workers.dev/webhook",
          
          payment_methods: {
            // AQUI ESTAVA O ERRO: AGORA VERIFICA SE É À VISTA (PIX OU BOLETO)
            excluded_payment_types: isCashPayment
              ? [{ id: "credit_card" }, { id: "debit_card" }]  // Se for à vista, TIRA cartões (Sobra Boleto/Ticket e Pix)
              : [{ id: "ticket" }, { id: "bank_transfer" }],   // Se for cartão, TIRA boleto e pix
            installments: 12
          },
          binary_mode: true
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
                  mutations: [
                    {
                      patch: {
                        id: sanityId,
                        set: {
                          status: "paid",
                          paidAt: new Date().toISOString(),
                          paymentMethod: pagamento.payment_method_id
                        }
                      }
                    }
                  ]
                };

                await fetch(`https://${env.SANITY_PROJECT_ID}.api.sanity.io/v2021-06-07/data/mutate/${env.SANITY_DATASET || 'production'}`, {
                  method: "POST",
                  headers: {
                    "Authorization": `Bearer ${env.SANITY_TOKEN}`,
                    "Content-Type": "application/json"
                  },
                  body: JSON.stringify(mutation)
                });

                if (env.RESEND_API_KEY && pagamento.payer.email) {
                    try {
                        await fetch("https://api.resend.com/emails", {
                            method: "POST",
                            headers: {
                                "Authorization": `Bearer ${env.RESEND_API_KEY}`,
                                "Content-Type": "application/json"
                            },
                            body: JSON.stringify({
                                from: "Brasil Varejo <onboarding@resend.dev>",
                                to: [pagamento.payer.email],
                                subject: "Pagamento Aprovado! - Brasil Varejo",
                                html: `
                                    <h1>Obrigado pela sua compra!</h1>
                                    <p>Seu pagamento para o pedido <strong>#${sanityId.slice(-6).toUpperCase()}</strong> foi aprovado.</p>
                                    <p>Estamos preparando seu envio.</p>
                                    <br/>
                                    <p>Equipe Brasil Varejo</p>
                                `
                            })
                        });
                    } catch (emailErr) {
                        console.log("Erro ao enviar email Resend:", emailErr);
                    }
                }
              }
            }
          }
        }
        return new Response("OK", { status: 200 });
      }

      return new Response(JSON.stringify({ status: "API Online", projeto: "Brasil Varejo", versao: "1.2" }), { status: 200, headers });

    } catch (err) {
      return new Response(JSON.stringify({ erro: err.message, stack: err.stack }), { status: 500, headers });
    }
  }
};

export { src_default as default };