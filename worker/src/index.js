export default {
  async fetch(req, env) {
    // 1. Configuração de CORS (Permite que seu site acesse o Worker)
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

      // =================================================================
      // ROTA 1: CÁLCULO DE FRETE (MELHOR ENVIO / CORREIOS)
      // =================================================================
      if (url.pathname === "/shipping") {
        const body = await req.json();
        const { to, products } = body; 

        // Token do Melhor Envio
        const meToken = env.MELHORENVIO_TOKEN; 

        // Monta o payload para a API do Melhor Envio
        const payload = {
            from: { postal_code: "43805000" }, // Seu CEP de Origem
            to: { postal_code: to.postal_code },
            products: products.map(p => ({
                id: p.id,
                width: p.width || 15,
                height: p.height || 15,
                length: p.length || 15,
                weight: p.weight || 0.5,
                insurance_value: p.insurance_value || 50,
                quantity: p.quantity || 1
            })),
            options: { receipt: false, own_hand: false },
            services: "1,2" // 1=PAC, 2=SEDEX
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

        if (!resp.ok) {
            return new Response(JSON.stringify([]), { headers });
        }

        const data = await resp.json();
        return new Response(JSON.stringify(data), { headers });
      }

      // =================================================================
      // ROTA 2: CHECKOUT (MERCADO PAGO) - COM BLOQUEIO DE PAGAMENTO
      // =================================================================
      if (url.pathname === "/checkout") {
        const { 
            items, 
            shipping, 
            email, 
            tipoPagamento, 
            shippingAddress, 
            customerDocument, 
            totalAmount, 
            orderId 
        } = await req.json();

        // 1. Configura quais métodos bloquear
        let excludedPaymentTypes = [];
        let maxInstallments = 12;

        if (tipoPagamento === 'pix') {
             // PIX: Bloqueia cartões e boleto
             excludedPaymentTypes = [
                 { id: "credit_card" },
                 { id: "debit_card" },
                 { id: "ticket" },
                 { id: "atm" }
             ];
             maxInstallments = 1;
        } else if (tipoPagamento === 'cartao') {
             // Cartão: Bloqueia PIX e Boleto
             excludedPaymentTypes = [
                 { id: "bank_transfer" }, // PIX
                 { id: "ticket" },
                 { id: "atm" }
             ];
        }

        // 2. Calcula desconto se necessário
        const itemsTotal = items.reduce((acc, item) => acc + (item.price * item.quantity), 0);
        const shippingCost = Number(shipping) || 0;
        const grossTotal = itemsTotal + shippingCost;
        
        let mpItems = items.map(item => ({
            title: item.title,
            quantity: Number(item.quantity),
            currency_id: "BRL",
            unit_price: Number(item.price)
        }));

        // Se o total pago for menor que a soma bruta, adiciona desconto
        if (totalAmount < grossTotal) {
            const discountDiff = grossTotal - totalAmount;
            mpItems.push({
                title: "Desconto PIX (-10%)",
                quantity: 1,
                currency_id: "BRL",
                unit_price: -Number(discountDiff.toFixed(2))
            });
        }

        // 3. Cria a preferência
        const preferenceBody = {
          items: mpItems,
          shipments: {
            cost: shippingCost,
            mode: "not_specified"
          },
          payer: {
            email: email,
            identification: {
                type: "CPF",
                number: customerDocument
            },
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
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${env.MP_ACCESS_TOKEN}`
          },
          body: JSON.stringify(preferenceBody)
        });

        const mpData = await mpResp.json();

        if (!mpResp.ok) {
           throw new Error(JSON.stringify(mpData));
        }

        return new Response(JSON.stringify({ 
            url: mpData.init_point, 
            id_preferencia: mpData.id 
        }), { headers });
      }

      // =================================================================
      // ROTA 3: WEBHOOK
      // =================================================================
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
                        const mutation = {
                            mutations: [{
                                patch: {
                                    id: sanityId,
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
        }
        return new Response("OK", { status: 200 });
      }

      return new Response(JSON.stringify({ status: "Online" }), { status: 200, headers });

    } catch (err) {
      return new Response(JSON.stringify({ error: err.message }), { status: 500, headers });
    }
  },
};