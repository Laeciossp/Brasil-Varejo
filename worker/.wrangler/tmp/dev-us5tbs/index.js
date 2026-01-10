var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// .wrangler/tmp/bundle-XhIaGk/checked-fetch.js
var urls = /* @__PURE__ */ new Set();
function checkURL(request, init) {
  const url = request instanceof URL ? request : new URL(
    (typeof request === "string" ? new Request(request, init) : request).url
  );
  if (url.port && url.port !== "443" && url.protocol === "https:") {
    if (!urls.has(url.toString())) {
      urls.add(url.toString());
      console.warn(
        `WARNING: known issue with \`fetch()\` requests to custom HTTPS ports in published Workers:
 - ${url.toString()} - the custom port will be ignored when the Worker is published using the \`wrangler deploy\` command.
`
      );
    }
  }
}
__name(checkURL, "checkURL");
globalThis.fetch = new Proxy(globalThis.fetch, {
  apply(target, thisArg, argArray) {
    const [request, init] = argArray;
    checkURL(request, init);
    return Reflect.apply(target, thisArg, argArray);
  }
});

// .wrangler/tmp/bundle-XhIaGk/strip-cf-connecting-ip-header.js
function stripCfConnectingIPHeader(input, init) {
  const request = new Request(input, init);
  request.headers.delete("CF-Connecting-IP");
  return request;
}
__name(stripCfConnectingIPHeader, "stripCfConnectingIPHeader");
globalThis.fetch = new Proxy(globalThis.fetch, {
  apply(target, thisArg, argArray) {
    return Reflect.apply(target, thisArg, [
      stripCfConnectingIPHeader.apply(null, argArray)
    ]);
  }
});

// src/index.js
var src_default = {
  async fetch(req, env) {
    const origin = req.headers.get("Origin") || "*";
    const headers = {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": origin,
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Access-Control-Allow-Credentials": "true"
    };
    if (req.method === "OPTIONS") {
      return new Response(null, { headers });
    }
    try {
      const url = new URL(req.url);
      if (url.pathname === "/login/melhorenvio") {
        const client_id = env.MELHORENVIO_CLIENT_ID;
        const redirect_uri = "https://brasil-varejo-api.laeciossp.workers.dev/callback/melhorenvio";
        const scope = "shipping-calculate shipping-checkout shipping-info user-read";
        const authUrl = `https://www.melhorenvio.com.br/oauth/authorize?client_id=${client_id}&redirect_uri=${encodeURIComponent(redirect_uri)}&response_type=code&scope=${encodeURIComponent(scope)}`;
        return Response.redirect(authUrl, 302);
      }
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
        return new Response(JSON.stringify({ error: "Erro na autoriza\xE7\xE3o" }), { status: 400, headers });
      }
      if (req.method === "POST" && url.pathname.includes("shipping")) {
        const body = await req.json();
        const sanityQuery = encodeURIComponent('*[_type == "shippingSettings"][0]');
        const sanityResp = await fetch(`https://o4upb251.api.sanity.io/v2021-06-07/data/query/production?query=${sanityQuery}`);
        const { result: settings } = await sanityResp.json();
        const token = settings?.apiToken || await env.CARRINHO.get("MELHORENVIO_TOKEN");
        const cepOrigem = settings?.originCep?.replace(/\D/g, "") || "43805000";
        const handlingTime = settings?.handlingTime || 0;
        if (!token)
          return new Response(JSON.stringify([]), { headers });
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
      if (req.method === "POST" && url.pathname.includes("checkout")) {
        const { items, email, orderId, shipping, tipoPagamento } = await req.json();
        const fatorDesconto = tipoPagamento === "pix" ? 0.9 : 1;
        const mpItems = items.map((item) => ({
          title: item.title || "Produto Brasil Varejo",
          quantity: Number(item.quantity || 1),
          unit_price: Number((Number(item.price) * fatorDesconto).toFixed(2)),
          currency_id: "BRL"
        }));
        if (shipping > 0) {
          mpItems.push({
            title: "Frete Brasil Varejo",
            quantity: 1,
            unit_price: Number((Number(shipping) * fatorDesconto).toFixed(2)),
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
          // LÓGICA DE BLOQUEIO DE MÉTODOS
          payment_methods: {
            excluded_payment_types: tipoPagamento === "pix" ? [{ id: "credit_card" }, { id: "debit_card" }] : [{ id: "ticket" }, { id: "bank_transfer" }],
            // Bloqueia Pix/Boleto
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
        return new Response(JSON.stringify({
          url: mpSession.init_point,
          id_preferencia: mpSession.id
        }), { headers });
      }
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
                          paidAt: (/* @__PURE__ */ new Date()).toISOString(),
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

// node_modules/wrangler/templates/middleware/middleware-ensure-req-body-drained.ts
var drainBody = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } finally {
    try {
      if (request.body !== null && !request.bodyUsed) {
        const reader = request.body.getReader();
        while (!(await reader.read()).done) {
        }
      }
    } catch (e) {
      console.error("Failed to drain the unused request body.", e);
    }
  }
}, "drainBody");
var middleware_ensure_req_body_drained_default = drainBody;

// node_modules/wrangler/templates/middleware/middleware-miniflare3-json-error.ts
function reduceError(e) {
  return {
    name: e?.name,
    message: e?.message ?? String(e),
    stack: e?.stack,
    cause: e?.cause === void 0 ? void 0 : reduceError(e.cause)
  };
}
__name(reduceError, "reduceError");
var jsonError = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } catch (e) {
    const error = reduceError(e);
    return Response.json(error, {
      status: 500,
      headers: { "MF-Experimental-Error-Stack": "true" }
    });
  }
}, "jsonError");
var middleware_miniflare3_json_error_default = jsonError;

// .wrangler/tmp/bundle-XhIaGk/middleware-insertion-facade.js
var __INTERNAL_WRANGLER_MIDDLEWARE__ = [
  middleware_ensure_req_body_drained_default,
  middleware_miniflare3_json_error_default
];
var middleware_insertion_facade_default = src_default;

// node_modules/wrangler/templates/middleware/common.ts
var __facade_middleware__ = [];
function __facade_register__(...args) {
  __facade_middleware__.push(...args.flat());
}
__name(__facade_register__, "__facade_register__");
function __facade_invokeChain__(request, env, ctx, dispatch, middlewareChain) {
  const [head, ...tail] = middlewareChain;
  const middlewareCtx = {
    dispatch,
    next(newRequest, newEnv) {
      return __facade_invokeChain__(newRequest, newEnv, ctx, dispatch, tail);
    }
  };
  return head(request, env, ctx, middlewareCtx);
}
__name(__facade_invokeChain__, "__facade_invokeChain__");
function __facade_invoke__(request, env, ctx, dispatch, finalMiddleware) {
  return __facade_invokeChain__(request, env, ctx, dispatch, [
    ...__facade_middleware__,
    finalMiddleware
  ]);
}
__name(__facade_invoke__, "__facade_invoke__");

// .wrangler/tmp/bundle-XhIaGk/middleware-loader.entry.ts
var __Facade_ScheduledController__ = class {
  constructor(scheduledTime, cron, noRetry) {
    this.scheduledTime = scheduledTime;
    this.cron = cron;
    this.#noRetry = noRetry;
  }
  #noRetry;
  noRetry() {
    if (!(this instanceof __Facade_ScheduledController__)) {
      throw new TypeError("Illegal invocation");
    }
    this.#noRetry();
  }
};
__name(__Facade_ScheduledController__, "__Facade_ScheduledController__");
function wrapExportedHandler(worker) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return worker;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  const fetchDispatcher = /* @__PURE__ */ __name(function(request, env, ctx) {
    if (worker.fetch === void 0) {
      throw new Error("Handler does not export a fetch() function.");
    }
    return worker.fetch(request, env, ctx);
  }, "fetchDispatcher");
  return {
    ...worker,
    fetch(request, env, ctx) {
      const dispatcher = /* @__PURE__ */ __name(function(type, init) {
        if (type === "scheduled" && worker.scheduled !== void 0) {
          const controller = new __Facade_ScheduledController__(
            Date.now(),
            init.cron ?? "",
            () => {
            }
          );
          return worker.scheduled(controller, env, ctx);
        }
      }, "dispatcher");
      return __facade_invoke__(request, env, ctx, dispatcher, fetchDispatcher);
    }
  };
}
__name(wrapExportedHandler, "wrapExportedHandler");
function wrapWorkerEntrypoint(klass) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return klass;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  return class extends klass {
    #fetchDispatcher = (request, env, ctx) => {
      this.env = env;
      this.ctx = ctx;
      if (super.fetch === void 0) {
        throw new Error("Entrypoint class does not define a fetch() function.");
      }
      return super.fetch(request);
    };
    #dispatcher = (type, init) => {
      if (type === "scheduled" && super.scheduled !== void 0) {
        const controller = new __Facade_ScheduledController__(
          Date.now(),
          init.cron ?? "",
          () => {
          }
        );
        return super.scheduled(controller);
      }
    };
    fetch(request) {
      return __facade_invoke__(
        request,
        this.env,
        this.ctx,
        this.#dispatcher,
        this.#fetchDispatcher
      );
    }
  };
}
__name(wrapWorkerEntrypoint, "wrapWorkerEntrypoint");
var WRAPPED_ENTRY;
if (typeof middleware_insertion_facade_default === "object") {
  WRAPPED_ENTRY = wrapExportedHandler(middleware_insertion_facade_default);
} else if (typeof middleware_insertion_facade_default === "function") {
  WRAPPED_ENTRY = wrapWorkerEntrypoint(middleware_insertion_facade_default);
}
var middleware_loader_entry_default = WRAPPED_ENTRY;
export {
  __INTERNAL_WRANGLER_MIDDLEWARE__,
  middleware_loader_entry_default as default
};
//# sourceMappingURL=index.js.map
