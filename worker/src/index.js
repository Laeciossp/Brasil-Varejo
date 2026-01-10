export default {
  async fetch(req, env) {
    const origin = req.headers.get("Origin") || "*";
    const headers = {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": origin,
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    };

    if (req.method === "OPTIONS") return new Response(null, { headers });

    try {
      const url = new URL(req.url);

      // --- ROTA DE LOGIN MELHOR ENVIO (PARA VOCÊ AUTORIZAR) ---
      if (url.pathname === "/login/melhorenvio") {
        const client_id = env.MELHORENVIO_CLIENT_ID;
        const redirect_uri = "https://brasil-varejo-api.laeciossp.workers.dev/callback/melhorenvio";
        const scope = "shipping-calculate shipping-checkout shipping-info user-read";
        
        const authUrl = `https://www.melhorenvio.com.br/oauth/authorize?client_id=${client_id}&redirect_uri=${encodeURIComponent(redirect_uri)}&response_type=code&scope=${encodeURIComponent(scope)}`;
        
        return Response.redirect(authUrl, 302);
      }

      // --- ROTA DE CALLBACK MELHOR ENVIO (RECEBE O TOKEN) ---
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
            code: code
          })
        });
        const data = await response.json();
        // Salva o token no KV para uso futuro
        await env.CARRINHO.put("MELHORENVIO_TOKEN", data.access_token);
        return new Response("Autorizado com Sucesso no Brasil Varejo! Pode fechar esta aba.", { headers });
      }

      // --- ROTA DE CÁLCULO DE FRETE (EVITA TELA BRANCA NO SITE) ---
      if (req.method === "POST" && url.pathname.includes("shipping")) {
        const body = await req.json();
        const token = await env.CARRINHO.get("MELHORENVIO_TOKEN");

        if (!token) {
          return new Response(JSON.stringify([]), { headers }); // Retorna array vazio para não quebrar o .map
        }

        const meResponse = await fetch("https://www.melhorenvio.com.br/api/v2/me/shipment/calculate", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json",
            "User-Agent": "Brasil Varejo (laeciossp@gmail.com)"
          },
          body: JSON.stringify(body)
        });

        const fretes = await meResponse.json();
        return new Response(JSON.stringify(Array.isArray(fretes) ? fretes : []), { headers });
      }

      // --- ROTA DE CHECKOUT (MERCADO PAGO) ---
      if (req.method === "POST" && url.pathname.includes("checkout")) {
        const { items, email, orderId } = await req.json();
        const mpItems = items.map(item => ({
          title: item.title || item.nome || "Produto Brasil Varejo",
          quantity: Number(item.quantity || item.qtd || 1),
          unit_price: Number(item.price || item.preco),
          currency_id: "BRL",
        }));

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
          notification_url: "https://brasil-varejo-api.laeciossp.workers.dev/webhook" 
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
        return new Response(JSON.stringify({ url: mpSession.init_point }), { headers });
      }

      // --- ROTA DE WEBHOOK (MERCADO PAGO -> SANITY) ---
      if (url.pathname.includes("webhook")) {
        const urlParams = new URLSearchParams(url.search);
        const dataId = urlParams.get('data.id') || urlParams.get('id');
        if (dataId) {
          const respPagamento = await fetch(`https://api.mercadopago.com/v1/payments/${dataId}`, {
            headers: { "Authorization": `Bearer ${env.MP_ACCESS_TOKEN}` }
          });
          if (respPagamento.ok) {
            const pagamento = await respPagamento.json();
            if (pagamento.status === 'approved') {
              const sanityId = pagamento.external_reference;
              if (sanityId && env.SANITY_TOKEN) {
                await fetch(`https://o4upb251.api.sanity.io/v2021-06-07/data/mutate/production`, {
                  method: "POST",
                  headers: {
                    "Authorization": `Bearer ${env.SANITY_TOKEN}`,
                    "Content-Type": "application/json"
                  },
                  body: JSON.stringify({
                    mutations: [{ patch: { id: sanityId, set: { status: 'paid' } } }]
                  })
                });
              }
            }
          }
        }
        return new Response("OK", { status: 200 });
      }

      return new Response(JSON.stringify({ mensagem: "API Brasil Varejo Online" }), { status: 200, headers });

    } catch (err) {
      return new Response(JSON.stringify({ erro: err.message }), { status: 500, headers });
    }
  }
};