export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    
    // --- Configuração de CORS (Permite que seu site acesse o Worker) ---
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*", // Em produção, troque '*' pelo seu domínio real
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    };

    // Responde ao "pré-voo" do navegador (OPTIONS)
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    // --- Roteamento da API ---

    // 1. Rota de Frete: /api/shipping
    if (url.pathname === "/api/shipping" && request.method === "POST") {
      try {
        const body = await request.json();
        const { cepDestino } = body;

        if (!cepDestino) throw new Error("CEP é obrigatório");

        // AQUI ENTRARIA A CHAMADA REAL PARA O MELHOR ENVIO
        // Por enquanto, vamos simular para o Front funcionar
        const mockFrete = [
          { name: "PAC", price: 25.50, days: 7, company: "Correios" },
          { name: "SEDEX", price: 42.90, days: 2, company: "Correios" },
          { name: "JadLog .Com", price: 19.90, days: 5, company: "Jadlog" }
        ];

        return new Response(JSON.stringify(mockFrete), {
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });

      } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), { 
          status: 400, 
          headers: corsHeaders 
        });
      }
    }

    // 2. Rota de Consulta EAN: /api/ean
    if (url.pathname === "/api/ean" && request.method === "GET") {
      const ean = url.searchParams.get("code");
      
      // Simulação de resposta segura
      const mockProduct = {
        title: "Produto Exemplo (Vindo do Worker)",
        description: "Descrição segura processada pelo servidor.",
        ean: ean
      };

      return new Response(JSON.stringify(mockProduct), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // Rota padrão (Erro 404)
    return new Response("Rota não encontrada no Worker", { status: 404, headers: corsHeaders });
  },
};