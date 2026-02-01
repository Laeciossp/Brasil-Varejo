export default {
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

      // --- ROTA DE FRETE (COM DIAGNÓSTICO DE ERRO) ---
      if (url.pathname === "/shipping") {
        const body = await req.json();
        const { to, products } = body; 

        const meToken = env.MELHORENVIO_TOKEN; 
        
        // DEDO-DURO 1: Se não tiver token configurado
        if (!meToken) {
             return new Response(JSON.stringify([{
                 name: "ERRO: Token Ausente",
                 price: 0,
                 delivery_time: 0,
                 company: "Sistema"
             }]), { headers });
        }

        const cleanToCep = to.postal_code.replace(/\D/g, '');

        const payload = {
            from: { postal_code: "43850000" }, // Seu CEP (São Sebastião)
            to: { postal_code: cleanToCep },
            products: products.map(p => ({
                id: p.id,
                width: Number(p.width) || 15,
                height: Number(p.height) || 15,
                length: Number(p.length) || 15,
                weight: Number(p.weight) || 0.5,
                insurance_value: Number(p.insurance_value) || 50,
                quantity: Number(p.quantity) || 1
            })),
            options: { receipt: false, own_hand: false },
            services: "1,2" // Correios (PAC/SEDEX)
        };

        const resp = await fetch("https://melhorenvio.com.br/api/v2/me/shipment/calculate", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${meToken}`,
                "Accept": "application/json"
            },
            body: JSON.stringify(payload)
        });

        // DEDO-DURO 2: Se a API der erro, mostra no site
        if (!resp.ok) {
            const errorText = await resp.text();
            console.error("Erro API:", errorText);
            return new Response(JSON.stringify([{
                 name: "ERRO API (Ver Console)",
                 price: 0,
                 delivery_time: 0,
                 company: "Melhor Envio"
             }]), { headers });
        }

        const data = await resp.json();
        return new Response(JSON.stringify(data), { headers });
      }

      // --- ROTA CHECKOUT (Mantida Intacta) ---
      if (url.pathname === "/checkout") {
        const { items, shipping, email, tipoPagamento, shippingAddress, customerDocument, totalAmount, orderId } = await req.json();

        let excludedPaymentTypes = [];
        let maxInstallments = 12;

        if (tipoPagamento === 'pix') {
             excludedPaymentTypes = [{ id: "credit_card" }, { id: "debit_card" }, { id: "ticket" }, { id: "atm" }];
             maxInstallments = 1;
        } else if (tipoPagamento === 'cartao') {
             excludedPaymentTypes = [{ id: "bank_transfer" }, { id: "ticket" }, { id: "atm" }];
        }

        const itemsTotal = items.reduce((acc, item) => acc + (item.price * item.quantity), 0);
        const shippingCost = Number(shipping) || 0;
        const grossTotal = itemsTotal + shippingCost;
        
        let mpItems = items.map(item => ({
            title: item.title,
            quantity: Number(item.quantity),
            currency_id: "BRL",
            unit_price: Number(item.price)
        }));

        if (totalAmount < grossTotal) {
            const discountDiff = grossTotal - totalAmount;
            mpItems.push({
                title: "Desconto PIX (-10%)",
                quantity: 1,
                currency_id: "BRL",
                unit_price: -Number(discountDiff.toFixed(2))
            });
        }

        const preferenceBody = {
          items: mpItems,
          shipments: { cost: shippingCost, mode: "not_specified" },
          payer: {
            email: email,
            identification: { type: "CPF", number: customerDocument },
            address: {
                zip_code: shippingAddress?.zip || "",
                street_name: shippingAddress?.street || "",
                street_number: Number(shippingAddress?.number) || 0,
                city_name: shippingAddress?.city || "",
                federal_unit: shippingAddress?.state || ""
            }
          },
          payment_methods: {
            excluded_payment_types: excludedPaymentTypes,
            installments: maxInstallments
          },
          back_urls: {
            success: "https://palastore.com.br/sucesso",
            failure: "https://palastore.com.br/erro",
            pending: "https://palastore.com.br/pendente"
          },
          auto_return: "approved",
          external_reference: orderId || `ORDER-${Date.now()}`
        };

        const mpResp = await fetch("https://api.mercadopago.com/checkout/preferences", {
          method: "POST",
          headers: { "Content-Type": "application/json", "Authorization": `Bearer ${env.MP_ACCESS_TOKEN}` },
          body: JSON.stringify(preferenceBody)
        });

        const mpData = await mpResp.json();
        if (!mpResp.ok) throw new Error(JSON.stringify(mpData));

        return new Response(JSON.stringify({ url: mpData.init_point, id_preferencia: mpData.id }), { headers });
      }

      // --- ROTA WEBHOOK (Mantida Intacta) ---
      if (url.pathname === "/webhook" && req.method === "POST") {
        const query = new URLSearchParams(url.search);
        const type = query.get("type") || (await req.json()).type;
        if (type === "payment") {
          const dataId = query.get("data.id") || (await req.json()).data?.id;
          if (dataId) {
             const respPagamento = await fetch(`https://api.mercadopago.com/v1/payments/${dataId}`, {
                headers: { "Authorization": `Bearer ${env.MP_ACCESS_TOKEN}` }
             });
             if (respPagamento.ok) {
                const pagamento = await respPagamento.json();
                if (pagamento.status === "approved") {
                    const sanityId = pagamento.external_reference;
                    if (sanityId && env.SANITY_TOKEN && env.SANITY_PROJECT_ID) {
                        const mutation = { mutations: [{ patch: { id: sanityId, set: { status: "paid", paymentMethod: pagamento.payment_method_id } } }] };
                        await fetch(`https://${env.SANITY_PROJECT_ID}.api.sanity.io/v2021-06-07/data/mutate/${env.SANITY_DATASET || 'production'}`, {
                            method: "POST", headers: { "Authorization": `Bearer ${env.SANITY_TOKEN}`, "Content-Type": "application/json" }, body: JSON.stringify(mutation)
                        });
                    }
                }
             }
          }
        }
        return new Response("OK", { status: 200 });
      }

      return new Response(JSON.stringify({ status: "Online" }), { status: 200, headers });

    } catch (err) {
      return new Response(JSON.stringify({ error: err.message }), { status: 500, headers });
    }
  },
};