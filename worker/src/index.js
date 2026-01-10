export default {
  async fetch(req, env) {
    // 1. Configuração de CORS (Permite que seu site acesse essa API)
    const origin = req.headers.get("Origin") || "*";
    const headers = {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": origin,
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    };

    if (req.method === "OPTIONS") return new Response(null, { headers });

    try {
      const url = new URL(req.url);

      // --- ROTA DE CHECKOUT (CRIA O PAGAMENTO) ---
      if (req.method === "POST" && url.pathname.includes("checkout")) {
        const { items, email, orderId } = await req.json();

        // Formata itens para o Mercado Pago
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
            // URLs para onde o cliente volta após pagar
            success: "http://localhost:5173/profile", // Volta para a área de pedidos
            failure: "http://localhost:5173/cart",
            pending: "http://localhost:5173/cart"
          },
          auto_return: "approved",
          external_reference: orderId, // O "Crachá" que liga ao Sanity
          // URL que o Mercado Pago vai avisar (Seu Worker)
          // ATENÇÃO: Quando subir para produção, substitua pelo seu subdomínio real
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

      // --- ROTA DE WEBHOOK (RECEBE AVISO DO PAGAMENTO) ---
      if (url.pathname.includes("webhook")) {
        const urlParams = new URLSearchParams(url.search);
        const dataId = urlParams.get('data.id') || urlParams.get('id');
        const type = urlParams.get('type') || urlParams.get('topic');

        if ((type === 'payment' || urlParams.get('topic') === 'payment') && dataId) {
          // Valida no Mercado Pago
          const respPagamento = await fetch(`https://api.mercadopago.com/v1/payments/${dataId}`, {
            headers: { "Authorization": `Bearer ${env.MP_ACCESS_TOKEN}` }
          });
          
          if (respPagamento.ok) {
            const pagamento = await respPagamento.json();
            
            if (pagamento.status === 'approved') {
              const sanityId = pagamento.external_reference;
              
              // Atualiza o Sanity para "Pago"
              if (sanityId && env.SANITY_TOKEN) {
                // ID DO PROJETO BRASIL VAREJO: o4upb251
                await fetch(`https://o4upb251.api.sanity.io/v2021-06-07/data/mutate/production`, {
                  method: "POST",
                  headers: {
                    "Authorization": `Bearer ${env.SANITY_TOKEN}`,
                    "Content-Type": "application/json"
                  },
                  body: JSON.stringify({
                    mutations: [
                      { patch: { id: sanityId, set: { status: 'paid' } } } // 'paid' é o código interno
                    ]
                  })
                });
              }
            }
          }
        }
        return new Response("Webhook Recebido", { status: 200 });
      }

      return new Response(JSON.stringify({ mensagem: "API Brasil Varejo Online" }), { status: 200, headers });

    } catch (err) {
      return new Response(JSON.stringify({ erro: err.message }), { status: 500, headers });
    }
  }
};