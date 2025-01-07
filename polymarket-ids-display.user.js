// ==UserScript==
// @name        Polymarket.com IDs display
// @match       https://polymarket.com/*
// @description Show slug IDs for some events
// @namespace   com.shaunlebron.mint.js
// @author      Shaun Williams
// @version     1.0.0
// @homepage    https://github.com/shaunlebron/polymarket-ids-display
// @updateURL   https://github.com/shaunlebron/polymarket-ids-display/raw/master/polymarket-ids-display.user.js
// @downloadURL https://github.com/shaunlebron/polymarket-ids-display/raw/master/polymarket-ids-display.user.js
// @grant       none
// @noframes
// ==/UserScript==
//

(function() {

  const slugToCond = {}
  
  function watchFetch() {
    const origFetch = window.fetch

    window.fetch = async function(url, opts) {
      const {method} = opts
      const response = await origFetch(url, opts)
      if (method == "GET" && url.includes("/games.json")) {
        const json = await response.json();
        console.log("json", json)
        for (const {slug,markets} of json.pageProps.dehydratedState.queries[1].state.data) {
          slugToCond[slug] = markets.map(e => e.conditionId).join(',')
        }
        response.json = async function() { return json }
        response.text = async function() { return JSON.stringify(json) }
        console.log("SLUGS", slugToCond)
      }
      return response
    }
  }

  function addSlugToCard(card,slug) {
    const slugEl = card.querySelector("#slug");
    if (slugEl) return;
    const refEl = [...card.querySelectorAll("p")].filter(e => e.innerText.endsWith("Vol."))[0]
    if (!refEl) return;
    if (!slugToCond[slug]) return;
    refEl.insertAdjacentHTML("afterend", `<p id="slug" class="${refEl.className}"><code>${slugToCond[slug]}</code></p>`)
    card.querySelector("#slug").addEventListener("click", e => { navigator.clipboard.writeText(slug); e.preventDefault(); e.stopPropagation(); });
  }

  function render() {
    for (const card of document.querySelectorAll("[mode=desktop][id]")) {
      const slug = card.id.match(/(.*)-item$/)?.[1]
      if (slug) addSlugToCard(card, slug)
    }
    for (const card of document.querySelectorAll("[data-scroll-anchor^=event-detail-accordion-item-]")) {
      const slug = card.dataset.scrollAnchor.match(/^event-detail-accordion-item-\d+-(.*-\d{4}-\d{2}-\d{2})/)?.[1]
      if (slug) addSlugToCard(card, slug)
    }
  }

  setInterval(render, 1000)
  watchFetch()

})();
