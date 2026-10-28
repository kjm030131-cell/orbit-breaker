// Old address (orbitbreaker.pages.dev): everything moves to the new address.
// sw.js is answered with a worker that clears the old offline cache and unregisters itself,
// so browsers that installed the old site stop serving stale pages.
const NEW = "https://arclight-game.pages.dev";
const SW = `self.addEventListener("install",()=>self.skipWaiting());
self.addEventListener("activate",e=>e.waitUntil((async()=>{for(const k of await caches.keys())await caches.delete(k);
await self.registration.unregister();for(const c of await self.clients.matchAll({type:"window"}))c.navigate(c.url)})()));`;
export default {
  async fetch(request) {
    const url = new URL(request.url);
    if (url.pathname === "/sw.js") return new Response(SW, { headers: { "content-type": "text/javascript", "cache-control": "no-store" } });
    return Response.redirect(NEW + url.pathname + url.search, 301);
  },
};
