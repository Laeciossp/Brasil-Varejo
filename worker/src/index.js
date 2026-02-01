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

    if (req.method === "OPTIONS") return new Response(null, { headers });

    try {
      const url = new URL(req.url);

      // --- ROTAS DE FRETE E LOGIN (MANTIDAS IGUAIS) ---
      if (url.pathname === "/login/melhorenvio") {
        /* ... (Mantenha o código de login igual) ... */
        const client_id = env.MELHORENVIO_CLIENT_ID;
        const redirect_uri = "https://brasil-varejo-api.laeciossp.workers.dev/callback/melhorenvio";
        const scope = "shipping-calculate shipping-checkout shipping-info user-read";
        const authUrl = `https://www.melhorenvio.com.br/oauth/authorize?client_id=${client_id}&redirect_uri=${encodeURIComponent(redirect_uri)}&response_type=code&scope=${encodeURIComponent(scope)}`;
        return Response.redirect(authUrl, 302);
      }

      if (url.pathname === "/callback/melhorenvio") {
         /* ... (Mantenha o callback igual) ... */
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
          return new Response("Autorizado com Sucesso!", { headers });
        }
        return new Response(JSON.stringify({ error: "Erro auth" }), { status: 400, headers });
      }

      if (req.method === "POST" && url.pathname.includes("shipping")) {
         /* ... (Mantenha o cálculo de frete igual) ... */
        const body = await req.json();
        // Lógica simplificada de frete para economizar espaço aqui na resposta
        // (Use o seu código de frete original aqui, ele não é o problema)
        const token = await env.CARRINHO.get("MELHORENVIO_TOKEN");
        if (!token) return new Response(JSON.stringify([]), { headers });
        
        const payload = {
          from: { postal_code: "43805000" },
          to: { postal_code: (body.to?.postal_code || "").replace(/\D/g, "") },
          products: (body.products || []).map(p => ({
            id: p.id, width: 15, height: 15, length: 15, weight: 0.5, insurance_value: p.insurance_value, quantity: p.quantity
          }))
        };
        const meResponse = await fetch("https://www.melhorenvio.com.br/api/v2/me/shipment/calculate", {
          method: "POST",
          headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json", "User-Agent": "Brasil Varejo" },
          body: JSON.stringify(payload)
        });
        const fretes = await meResponse.json();
        return new Response(JSON.stringify(fretes), { headers });
      }

      // =================================================================
      // 4. ROTA: CHECKOUT (MODIFICADA - SÓ PAGAMENTO)
      // =================================================================
      if (req.method === "POST" && url.pathname.includes("checkout")) {
        const reqData = await req.json();
        // Recebemos o orderId criado pelo Site
        const { items, email, shipping, tipoPagamento, orderId, shippingAddress, customerDocument } = reqData;

        // REMOVIDO: Bloco que criava pedido no Sanity (PASSO A)
        // Agora confiamos que o Site já criou e nos mandou o orderId correto.

        // --- GERAR PAGAMENTO NO MERCADO PAGO ---
        const isCashPayment = (tipoPagamento === 'pix' || tipoPagamento === 'boleto');
        const fatorDesconto = isCashPayment ? 0.9 : 1.0;

        const mpItems = items.map((item) => ({
          title: item.title || item.name || "Produto Palastore",
          quantity: Number(item.quantity || 1),
          unit_price: Number((Number(item.price) * fatorDesconto).toFixed(2)),
          currency_id: "BRL"
        }));

        if (Number(shipping) > 0) {
          mpItems.push({ title: "Frete", quantity: 1, unit_price: Number(Number(shipping).toFixed(2)), currency_id: "BRL" });
        }

        const cleanCPF = (customerDocument || "").replace(/\D/g, '');
        
        const payerData = {
            email: email,
            first_name: shippingAddress?.alias || "Cliente",
            identification: { type: "CPF", number: cleanCPF }
        };

        const preferenceData = {
          items: mpItems,
          payer: payerData,
          back_urls: {
            success: "https://palastore.com.br/sucesso", 
            failure: "https://palastore.com.br/cart",
            pending: "https://palastore.com.br/sucesso"
          },
          auto_return: "approved",
          external_reference: orderId, // USA O ID QUE VEIO DO SITE
          notification_url: "https://brasil-varejo-api.laeciossp.workers.dev/webhook",
          payment_methods: {
            excluded_payment_types: tipoPagamento === 'boleto' ? [{ id: "credit_card" }] : [],
            installments: 12
          }
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
            return new Response(JSON.stringify({ error: "Erro MP", details: mpSession }), { status: 400, headers });
        }

        return new Response(JSON.stringify({ 
          url: mpSession.init_point,
          id_preferencia: mpSession.id 
        }), { headers });
      }

      // =================================================================
      // 5. ROTA: WEBHOOK (ATUALIZA O STATUS DO PEDIDO)
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
              const sanityId = pagamento.external_reference; // ID vindo do Sanity
              
              // Atualiza o pedido existente para "Pago"
              if (sanityId && env.SANITY_TOKEN && env.SANITY_PROJECT_ID) {
                const mutation = {
                  mutations: [{
                      patch: {
                        id: sanityId, // Busca pelo ID correto
                        set: { status: "paid", paymentMethod: pagamento.payment_method_id }
                      }
                  }]
                };
                await fetch(`https://${env.SANITY_PROJECT_ID}.api.sanity.io/v2021-06-07/data/mutate/${env.SANITY_DATASET || 'production'}`, {
                  method: "POST",
                  headers: { "Authorization": `Bearer ${env.SANITY_TOKEN}`, "Content-Type": "application/json" },
                  body: JSON.stringify(mutation)
                });
              }
            }
          }
        }
        return new Response("OK", { status: 200 });
      }

      return new Response(JSON.stringify({ status: "Online" }), { status: 200, headers });

    } catch (err) {
      return new Response(JSON.stringify({ erro: err.message }), { status: 500, headers });
    }
  }
};
export { src_default as default };