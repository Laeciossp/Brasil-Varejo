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

      // --- ROTA DE FRETE (Mantida Intacta) ---
      if (url.pathname === "/shipping") {
        const body = await req.json();
        const { to, products } = body; 

        const meToken = env.MELHORENVIO_TOKEN; 
        
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
            from: { postal_code: "43850000" }, 
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
            services: "1,2" 
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

      // --- ROTA CHECKOUT (Criação do pedido no Sanity seguindo o schema order.js) ---
      if (url.pathname === "/checkout") {
        if (req.method !== "POST") {
             return new Response(JSON.stringify({ error: "O método deve ser POST" }), { status: 405, headers });
        }

        let bodyData;
        try {
            bodyData = await req.json();
        } catch (e) {
            return new Response(JSON.stringify({ error: "Corpo da requisição vazio ou JSON inválido." }), { status: 400, headers });
        }

        const { items, shipping, email, tipoPagamento, shippingAddress, customerDocument, totalAmount, orderId, customerName } = bodyData;

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
            id: item.id || `item-${Date.now()}`,
            title: item.title,
            description: item.title,
            quantity: Number(item.quantity),
            currency_id: "BRL",
            unit_price: Number(item.price),
            picture_url: item.picture_url
        }));

        if (totalAmount < grossTotal) {
            const discountDiff = grossTotal - totalAmount;
            mpItems.push({
                id: 'discount-pix',
                title: "Desconto PIX (-5%)",
                description: "Desconto PIX (-5%)",
                quantity: 1,
                currency_id: "BRL",
                unit_price: -Number(discountDiff.toFixed(2))
            });
        }

        const nomeCompleto = customerName ? customerName.trim().split(' ') : ['Cliente', ''];
        const finalOrderId = orderId || `ORDER-${Date.now()}`;

        const preferenceBody = {
          items: mpItems,
          shipments: { cost: shippingCost, mode: "not_specified" },
          payer: {
            name: nomeCompleto[0],
            surname: nomeCompleto.length > 1 ? nomeCompleto.slice(1).join(' ') : 'Palastore',
            email: email,
            identification: { type: "CPF", number: customerDocument }
          },
          payment_methods: { excluded_payment_types: excludedPaymentTypes, installments: maxInstallments },
          back_urls: {
            success: "https://palastore.com.br/sucesso",
            failure: "https://palastore.com.br/erro",
            pending: "https://palastore.com.br/pendente"
          },
          auto_return: "approved",
          external_reference: finalOrderId 
        };

        const mpResp = await fetch("https://api.mercadopago.com/checkout/preferences", {
          method: "POST",
          headers: { "Content-Type": "application/json", "Authorization": `Bearer ${env.MP_ACCESS_TOKEN}` },
          body: JSON.stringify(preferenceBody)
        });

        const mpData = await mpResp.json();
        if (!mpResp.ok) throw new Error(JSON.stringify(mpData));

        // CRIA NO SANITY (Baseado no Schema order.js)
        if (env.SANITY_TOKEN && env.SANITY_PROJECT_ID) {
            const sanityMutation = {
              mutations: [{
                createIfNotExists: {
                  _id: finalOrderId,
                  _type: "order",
                  orderNumber: finalOrderId,
                  status: "pending",
                  totalAmount: Number(totalAmount),
                  paymentMethod: tipoPagamento,
                  customer: {
                    name: customerName || "Cliente App",
                    email: email || "",
                    cpf: customerDocument || ""
                  },
                  items: items.map((i, index) => ({
                    _key: `${Date.now()}-${index}`,
                    productName: i.title,
                    quantity: Number(i.quantity),
                    price: Number(i.price),
                    imageUrl: i.picture_url
                  }))
                }
              }]
            };

            await fetch(`https://${env.SANITY_PROJECT_ID}.api.sanity.io/v2021-06-07/data/mutate/${env.SANITY_DATASET || 'production'}`, {
                method: "POST",
                headers: { "Authorization": `Bearer ${env.SANITY_TOKEN}`, "Content-Type": "application/json" },
                body: JSON.stringify(sanityMutation)
            });
        }

        return new Response(JSON.stringify({ url: mpData.init_point, id_preferencia: mpData.id }), { headers });
      }

      // --- ROTA WEBHOOK (ATUALIZA SANITY E FIREBASE QUANDO APROVADO) ---
      if (url.pathname === "/webhook" && req.method === "POST") {
        const query = new URLSearchParams(url.search);
        const bodyText = await req.text();
        let payloadJson = {};
        try { payloadJson = JSON.parse(bodyText); } catch(e) {}

        const type = query.get("type") || payloadJson.type;
        
        if (type === "payment") {
          const dataId = query.get("data.id") || payloadJson.data?.id;
          if (dataId) {
             const respPagamento = await fetch(`https://api.mercadopago.com/v1/payments/${dataId}`, {
                headers: { "Authorization": `Bearer ${env.MP_ACCESS_TOKEN}` }
             });
             if (respPagamento.ok) {
                const pagamento = await respPagamento.json();
                
                if (pagamento.status === "approved") {
                    const orderId = pagamento.external_reference; // Ex: APP-1787183766505
                    
                    if (orderId) {
                        // 1. ATUALIZA NO SANITY PARA 'paid'
                        if (env.SANITY_TOKEN && env.SANITY_PROJECT_ID) {
                            const mutation = { mutations: [{ patch: { id: orderId, set: { status: "paid", paymentMethod: pagamento.payment_method_id } } }] };
                            await fetch(`https://${env.SANITY_PROJECT_ID}.api.sanity.io/v2021-06-07/data/mutate/${env.SANITY_DATASET || 'production'}`, {
                                method: "POST", headers: { "Authorization": `Bearer ${env.SANITY_TOKEN}`, "Content-Type": "application/json" }, body: JSON.stringify(mutation)
                            });
                        }

                        // 2. ATUALIZA NO FIREBASE FIRESTORE PARA 'PAID' (Faz o App mudar na hora)
                        if (env.FIREBASE_PROJECT_ID && env.FIREBASE_CLIENT_EMAIL && env.FIREBASE_PRIVATE_KEY) {
                           try {
                             const accessToken = await getGoogleAccessToken(env.FIREBASE_CLIENT_EMAIL, env.FIREBASE_PRIVATE_KEY);
                             
                             await fetch(`https://firestore.googleapis.com/v1/projects/${env.FIREBASE_PROJECT_ID}/databases/(default)/documents/bookings/${orderId}?updateMask.fieldPaths=status`, {
                                method: "PATCH",
                                headers: {
                                   "Authorization": `Bearer ${accessToken}`,
                                   "Content-Type": "application/json"
                                },
                                body: JSON.stringify({
                                   fields: {
                                      status: { stringValue: "PAID" }
                                   }
                                })
                             });
                           } catch (err) {
                             console.error("Erro ao atualizar Firebase:", err);
                           }
                        }
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

// --- FUNÇÃO AUXILIAR PARA ASSINAR JWT DO FIREBASE NA CLOUDFLARE ---
async function getGoogleAccessToken(clientEmail, privateKeyPEM) {
  const pemHeader = "-----BEGIN PRIVATE KEY-----";
  const pemFooter = "-----END PRIVATE KEY-----";
  let pemContents = privateKeyPEM.replace(pemHeader, "").replace(pemFooter, "").replace(/\s/g, "");
  let binaryDerString = atob(pemContents);
  let binaryDer = new Uint8Array(binaryDerString.length);
  for (let i = 0; i < binaryDerString.length; i++) {
    binaryDer[i] = binaryDerString.charCodeAt(i);
  }

  const key = await crypto.subtle.importKey(
    "pkcs8",
    binaryDer.buffer,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "RS256", typ: "JWT" };
  const payload = {
    iss: clientEmail,
    scope: "https://www.googleapis.com/auth/datastore",
    aud: "https://oauth2.googleapis.com/token",
    exp: now + 3600,
    iat: now
  };

  const stringifiedHeader = btoa(JSON.stringify(header)).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
  const stringifiedPayload = btoa(JSON.stringify(payload)).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
  const signatureInput = `${stringifiedHeader}.${stringifiedPayload}`;

  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    key,
    new TextEncoder().encode(signatureInput)
  );

  const stringifiedSignature = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");

  const jwt = `${signatureInput}.${stringifiedSignature}`;

  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `grant_type=authorization_code&assertion=${jwt}`
  });
  
  const tokenData = await tokenRes.json();
  return tokenData.access_token;
} 