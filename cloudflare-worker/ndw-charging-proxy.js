// Cloudflare Worker: CORS proxy for the NDW DAFNE charge-point GeoJSON API.
// The NDW API itself has no CORS headers, so the browser on pricemapp.com
// can't call it directly. This worker forwards the request server-side and
// adds the CORS headers the browser needs. Deploy via the Cloudflare
// dashboard (Workers & Pages -> Create -> paste this file) - see
// cloudflare-worker/README.md for the exact steps.

const NDW_BASE_URL = 'https://dotnl.ndw.nu/api/rest/geojson/dynamic-road-status/charge-point-data/v1/features';

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
};

export default {
    async fetch(request) {
        if (request.method === 'OPTIONS') {
            return new Response(null, { headers: corsHeaders });
        }

        const url = new URL(request.url);
        const bbox = url.searchParams.get('bbox');

        if (!bbox) {
            return new Response(JSON.stringify({ error: 'Missing bbox parameter' }), {
                status: 400,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
        }

        const ndwUrl = `${NDW_BASE_URL}?bbox=${encodeURIComponent(bbox)}`;

        // Cache each bbox at Cloudflare's edge for 15s so pan/zoom doesn't
        // hammer NDW's 10 req/s limit when several visitors share a viewport
        const response = await fetch(ndwUrl, {
            cf: { cacheTtl: 15, cacheEverything: true },
        });

        const body = await response.text();

        return new Response(body, {
            status: response.status,
            headers: { ...corsHeaders, 'Content-Type': 'application/geo+json' },
        });
    },
};
