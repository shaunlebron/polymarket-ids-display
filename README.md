# Polymarket IDs for greasemonkey

Some pages like https://polymarket.com/sports/nfl/games don’t display the contest slug

contest slugs are stored in ids of these game cards `<slug>-item`:


```
[mode=desktop][id]
```

```
[data-scroll-anchor^=event-detail-accordion-item-]
```


for conditionIds:

```
games.json?slug=nba&slug=games
response.pageProps.dehydratedState.queries[1].state.data[...].slug
response.pageProps.dehydratedState.queries[1].state.data[...].markets[0].conditionId
```
