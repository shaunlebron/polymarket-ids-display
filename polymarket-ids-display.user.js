// ==UserScript==
// @name        Polymarket.com display market IDs
// @match       https://polymarket.com/*
// @description add market IDs to polymarket pages
// @namespace   com.shaunlebron.mint.js
// @author      Shaun Williams
// @version     1.3.0
// @homepage    https://github.com/shaunlebron/polymarket-ids-display
// @updateURL   https://raw.githubusercontent.com/shaunlebron/polymarket-ids-display/refs/heads/main/polymarket-ids-display.user.js
// @downloadURL https://raw.githubusercontent.com/shaunlebron/polymarket-ids-display/refs/heads/main/polymarket-ids-display.user.js
// @grant       none
// @noframes
// ==/UserScript==
//


(function() {

  const $ = (a,b) => { [a,b] = a && b ? [a,b] : [document,a]; return a.querySelector(b) }
  const $$ = (a,b) => { [a,b] = a && b ? [a,b] : [document,a]; return a.querySelectorAll(b) }

  // From: https://stackoverflow.com/a/74240138/142317
  function getReactProps(parent, target) {
    const keyof_ReactProps = Object.keys(parent).find(k => k.startsWith("__reactProps$"));
    const symof_ReactFragment = Symbol.for("react.fragment");

    //Find the path from target to parent
    const path = [];
    let elem = target;
    while (elem !== parent) {
      let index = 0;
      for (let sibling = elem; sibling != null;) {
        if (sibling[keyof_ReactProps]) index++;
        sibling = sibling.previousElementSibling;
      }
      path.push({ child: elem, index });
      elem = elem.parentElement;
    }
    //Walk down the path to find the react state props
    let state = elem[keyof_ReactProps];
    for (let i = path.length - 1; i >= 0 && state != null; i--) {
      //Find the target child state index
      let childStateIndex = 0, childElemIndex = 0;
      while (childStateIndex < state.children.length) {
        const childState = state.children[childStateIndex];
        if (childState instanceof Object) {
          //Fragment children are inlined in the parent DOM element
          let isFragment = childState.type === symof_ReactFragment && childState.props.children.length;
          childElemIndex += isFragment ? childState.props.children.length : 1;
          if (childElemIndex === path[i].index) break;
        }
        childStateIndex++;
      }
      const childState = state.children[childStateIndex] ?? (childStateIndex === 0 ? state.children : null);
      state = childState?.props;
      elem = path[i].child;
    }
    return state;
  }

  function getReactFiber(e) {
    const k = Object.keys(e).find(k => k.startsWith("__reactFiber$"));
    return e[k];
  }

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

  function addIdsToCard(card,{slug,cond}) {
    const addonEl = $(card, "#"+ADDON_ID);
    if (addonEl?.dataset.slug == slug && addonEl?.dataset.cond == cond) {
      return
    }
    const refEl = [...$$(card, "p")].filter(e => e.innerText.endsWith("Vol."))[0]
    if (!refEl) return;
    const maxW = 16
    const abbrev = (s='') => s.length < maxW ? s : s.slice(0,maxW) + '…';
    const addonHtml = `
      <p data-slug="${slug}" id="${ADDON_ID}" class="${refEl.className}">
          <style>
             #${ADDON_ID} { cursor: pointer; }
             body[data-color-mode=light] #${ADDON_ID} code:active { color: #000; }
             body[data-color-mode=dark] #${ADDON_ID} code:active { color: #fff; }
          </style>
          <code class=slug>[${abbrev(slug)}]</code><br>
          <code class=cond>[${abbrev(cond)}]</code>
      </p>`
    if (addonEl) {
      addonEl.outerHTML = addonHtml
    } else {
      refEl.insertAdjacentHTML("afterend", addonHtml)
    }
    slug && $(card, `#${ADDON_ID} .slug`).addEventListener("click", e => { navigator.clipboard.writeText(slug); e.preventDefault(); e.stopPropagation(); });
    cond && $(card, `#${ADDON_ID} .cond`).addEventListener("click", e => { navigator.clipboard.writeText(cond); e.preventDefault(); e.stopPropagation(); });
  }

  function renderSports() {
    // league overview
    for (const card of $$("#event-detail-container ul li")) {
      const slug = card.id
      if (slug) addIdsToCard(card, {slug, cond: slugToCond[slug]})
    }

    // Game View card
    const card = $(".sports-in-game-overlay")
    if (card) {
      const market = getReactFiber(card)?.pendingProps?.children?.[0]?.props?.marketsForSocial?.[0]
      if (market) addIdsToCard(card, {slug: market.slug, cond: market.conditionId})
    }
  }

  function renderEvent() {
    const embedPath = 'M8.293 6.293L2.586 12 8.293 17.707 9.707 16.293 5.414 12 9.707 7.707zM15.707 17.707L21.414 12 15.707 6.293 14.293 7.707 18.586 12 14.293 16.293z';
    const btn = $(`path[d='${embedPath}']`).closest("button")
    const {event} = getReactProps(btn.parentElement, btn)
    const {slug} = event
    const cond = event.markets.map(e => e.conditionId).join(',')
    const card = $("#event-detail-container")
    addIdsToCard(card, {slug,cond})
  }

  function render() {
    const {pathname} = document.location;
    if (pathname.startsWith("/sports/")) {
      renderSports()
    } else if (pathname.startsWith("/event/")) {
      renderEvent()
    }
  }

  setInterval(render, 1000)
  watchFetch()

})();
