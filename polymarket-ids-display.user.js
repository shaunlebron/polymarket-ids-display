// ==UserScript==
// @name        Polymarket.com display sports IDs
// @match       https://polymarket.com/sports/*
// @description Show slug IDs for sports
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

  const ADDON_ID = "slug-addon"
  const slugToCond = {}
  
  function watchFetch() {
    const origFetch = window.fetch

    window.fetch = async function(url, opts) {
      const {method} = opts
      const response = await origFetch(url, opts)
      if (method == "GET" && url.includes("/games.json")) {
        const json = await response.json();
        for (const {slug,markets} of json.pageProps.dehydratedState.queries[1].state.data) {
          slugToCond[slug] = markets.map(e => e.conditionId).join(',')
        }
        response.json = async function() { return json }
        response.text = async function() { return JSON.stringify(json) }
      }
      return response
    }
  }

  function addSlugToCard(card,slug) {
    const addonEl = card.querySelector("#"+ADDON_ID);
    if (addonEl?.dataset.slug == slug) {
      return
    }
    const refEl = [...card.querySelectorAll("p")].filter(e => e.innerText.endsWith("Vol."))[0]
    if (!refEl) return;
    const cond = slugToCond[slug]
    if (!cond) return;
    const addonHtml = `
      <p data-slug="${slug}" id="${ADDON_ID}" class="${refEl.className}">
          <style>
             #${ADDON_ID} { cursor: pointer; }
             body[data-color-mode=light] #${ADDON_ID} code:active { color: #000; }
             body[data-color-mode=dark] #${ADDON_ID} code:active { color: #fff; }
          </style>
          <code class=slug>[${slug}]</code><br>
          <code class=cond>[${cond.slice(0,16)}…]</code>
      </p>`
    if (addonEl) {
      addonEl.outerHTML = addonHtml
    } else {
      refEl.insertAdjacentHTML("afterend", addonHtml)
    }
    card.querySelector(`#${ADDON_ID} .slug`).addEventListener("click", e => { navigator.clipboard.writeText(slug); e.preventDefault(); e.stopPropagation(); });
    card.querySelector(`#${ADDON_ID} .cond`).addEventListener("click", e => { navigator.clipboard.writeText(cond); e.preventDefault(); e.stopPropagation(); });
  }

  function render() {
    // new styles cards (NBA, NFL)
    for (const card of document.querySelectorAll("[mode=desktop][id]")) {
      const slug = card.id.match(/(.*)-item$/)?.[1]
      if (slug) addSlugToCard(card, slug)
    }

    // old style cards (EBL)
    for (const card of document.querySelectorAll("[data-scroll-anchor^=event-detail-accordion-item-]")) {
      const slug = card.dataset.scrollAnchor.match(/^event-detail-accordion-item-\d+-(.*-\d{4}-\d{2}-\d{2})/)?.[1]
      if (slug) addSlugToCard(card, slug)
    }

    // Game View card
    const card = document.querySelector("#sports-blurred-images-background")?.parentElement
    const scoreboard = document.querySelector("#scoreboard-scroll-container")?.firstChild
    if (card && scoreboard) {
      const activeCardI = [...[...scoreboard.children].entries()].filter(e => e[1].children.length == 3)[0]?.[0]
      if (activeCardI != null) {
        const k = Object.keys(scoreboard).filter(e => e.startsWith("__reactProps"))
        if (k) {
          const slug = scoreboard[k].children.props.children[activeCardI].key
          addSlugToCard(card, slug)
        }
      }
    }
  }

  setInterval(render, 1000)
  watchFetch()

})();
