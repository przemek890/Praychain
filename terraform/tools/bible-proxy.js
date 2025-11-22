export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    if (request.method !== 'GET') {
      return new Response('Method not allowed', { 
        status: 405,
        headers: corsHeaders 
      });
    }

    try {
      const apiPath = url.pathname.replace(/^\/api/, '');
      
      if (!apiPath || apiPath === '/') {
        return new Response(JSON.stringify({
          error: 'Missing API path',
          usage: 'Use /api/biblia/bw/{book}/{chapter}',
          example: '/api/biblia/bw/rdz/1'
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      const targetUrl = `https://www.biblia.info.pl/api${apiPath}${url.search}`;
      
      console.log(`Proxying: ${targetUrl}`);

      const proxyHeaders = new Headers();
      proxyHeaders.set('Accept-Language', 'pl-PL,pl;q=0.9,en;q=0.8');
      proxyHeaders.set('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
      proxyHeaders.set('Accept', 'application/json, text/plain, */*');
      proxyHeaders.set('Accept-Encoding', 'gzip, deflate, br');
      proxyHeaders.set('Connection', 'keep-alive');
      proxyHeaders.set('Referer', 'https://www.biblia.info.pl/');
      proxyHeaders.set('Origin', 'https://www.biblia.info.pl');
      
      const response = await fetch(targetUrl, {
        method: 'GET',
        headers: proxyHeaders,
        cf: {
          cacheEverything: true,
          cacheTtl: 3600,
        }
      });

      const data = await response.text();
      
      return new Response(data, {
        status: response.status,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json; charset=utf-8',
          'Cache-Control': 'public, max-age=3600',
        }
      });

    } catch (error) {
      console.error('Proxy error:', error);
      
      return new Response(JSON.stringify({
        error: 'Proxy failed',
        message: error.message,
        timestamp: new Date().toISOString()
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
  }
};