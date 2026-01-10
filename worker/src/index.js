var src_default = {
  async fetch(req, env) {
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

      // --- 1. ROTA: LOGIN MELHOR ENVIO ---
      if (url.pathname === "/login/melhorenvio") {
        const client_id = env.MELHORENVIO_CLIENT_ID;
        const redirect_uri = "https://brasil-varejo-api.laeciossp.workers.dev/callback/melhorenvio";
        const scope = "shipping-calculate shipping-checkout shipping-info user-read";
        const authUrl = `https://www.melhorenvio.com.br/oauth/authorize?client_id=${client_id}&redirect_uri=${encodeURIComponent(redirect_uri)}&response_type=code&scope=${encodeURIComponent(scope)}`;
        return Response.redirect(authUrl, 302);
      }

      // --- 2. ROTA: CALLBACK MELHOR ENVIO ---
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
        return new Response(JSON.stringify({ error: "Erro na autorização" }), { status: 400, headers });
      }

      // --- 3. ROTA: CÁLCULO DE FRETE ---
      if (req.method === "POST" && url.pathname.includes("shipping")) {
        const body = await req.json();
        const sanityQuery = encodeURIComponent('*[_type == "shippingSettings"][0]');
        const sanityResp = await fetch(`https://o4upb251.api.sanity.io/v2021-06-07/data/query/production?query=${sanityQuery}`);
        const { result: settings } = await sanityResp.json();
        
        const token = settings?.apiToken || await env.CARRINHO.get("MELHORENVIO_TOKEN");
        const cepOrigem = settings?.originCep?.replace(/\D/g, "") || "43805000";
        const handlingTime = settings?.handlingTime || 0;

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
            "User-Agent": "Brasil Varejo (laeciossp@gmail.com)"
          },
          body: JSON.stringify(payload)
        });

        const fretes = await meResponse.json();
        const resultado = Array.isArray(fretes) ? fretes.filter((f) => !f.error).map((f) => ({
          ...f,
          delivery_time: Number(f.delivery_time) + Number(handlingTime),
          custom_delivery_range: f.delivery_range ? {
            min: Number(f.delivery_range.min) + Number(handlingTime),
            max: Number(f.delivery_range.max) + Number(handlingTime)
          } : null
        })) : [];

        return new Response(JSON.stringify(resultado), { headers });
      }

      // --- 4. ROTA: CHECKOUT MERCADO PAGO ---
      if (req.method === "POST" && url.pathname.includes("checkout")) {
        const { items, email, orderId, shipping, tipoPagamento } = await req.json();
        
        // Fator de desconto 10% (0.9) apenas para Pix ou Boleto
        const fatorDesconto = (tipoPagamento === 'pix' || tipoPagamento === 'boleto') ? 0.9 : 1.0;

        // APLICA DESCONTO APENAS NOS ITENS
        const mpItems = items.map((item) => ({
          title: item.title || "Produto Brasil Varejo",
          quantity: Number(item.quantity || 1),
          // Desconto aplicado aqui
          unit_price: Number((Number(item.price) * fatorDesconto).toFixed(2)),
          currency_id: "BRL"
        }));

        // FRETE COM VALOR INTEGRAL (SEM DESCONTO)
        if (shipping > 0) {
          mpItems.push({
            title: "Frete Brasil Varejo",
            quantity: 1,
            unit_price: Number(Number(shipping).toFixed(2)),
            currency_id: "BRL"
          });
        }

        const preferenceData = {
          items: mpItems,
          payer: { email: email || "cliente@brasilvarejo.com" },
          back_urls: {
            success: "https://brasil-varejo.vercel.app/profile",
            failure: "https://brasil-varejo.vercel.app/cart",
            pending: "https://brasil-varejo.vercel.app/cart"
          },
          auto_return: "approved",
          external_reference: orderId,
          notification_url: "https://brasil-varejo-api.laeciossp.workers.dev/webhook",
          
          payment_methods: {
            excluded_payment_types: tipoPagamento === 'pix' 
              ? [{ id: "credit_card" }, { id: "debit_card" }] 
              : [{ id: "ticket" }, { id: "bank_transfer" }],
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

      // --- 5. ROTA: WEBHOOK MERCADO PAGO ---
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
              
              if (sanityId && env.SANITY_TOKEN) {
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

                await fetch(`https://o4upb251.api.sanity.io/v2021-06-07/data/mutate/production`, {
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

      return new Response(JSON.stringify({ status: "API Online", projeto: "Brasil Varejo" }), { status: 200, headers });

    } catch (err) {
      return new Response(JSON.stringify({ erro: err.message }), { status: 500, headers });
    }
  }
};

export { src_default as default };