// Based on https://developers.cloudflare.com/workers/tutorials/configure-your-cdn

addEventListener('fetch', (event) => {
    event.respondWith(handleRequest(event));
});

const CLOUD_URL = `https://res.cloudinary.com/${CLOUD_NAME}/image`;

async function serveAsset(event) {
    const url = new URL(event.request.url);
    const cache = caches.default;
    let response = await cache.match(event.request);
    const cloudinaryURL = `${CLOUD_URL}${url.pathname}`;
    if (!response) {
        response = await fetch(cloudinaryURL, { headers: event.request.headers });

        // Only cache the response if it's successful
        if (response.status >= 200 && response.status < 300) {
            // Cache for however long, here is 4 hours.
            const headers = new Headers(response.headers);
            headers.set('cache-control', `public, max-age=14400`);
            headers.set('vary', 'Accept');

            response = new Response(response.body, { ...response, headers });
            event.waitUntil(cache.put(event.request, response.clone()));
        }
    }
    return { response, cloudinaryURL };
}

async function handleRequest(event) {
    console.log('Requesting the image');
    if (event.request.method === 'GET') {
        let { response, cloudinaryURL } = await serveAsset(event);
        if (response.status > 399) {
            response = new Response(response.statusText, { status: response.status });
        }
        const clonedResponse = response.clone();
        const newResponse = new Response(clonedResponse.body, clonedResponse);
        newResponse.headers.append('origin-image-url', cloudinaryURL);
        return newResponse;
    } else {
        return new Response('Method not allowed', { status: 405 });
    }
}
