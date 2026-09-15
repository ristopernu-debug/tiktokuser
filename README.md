# TikTok Public Location Analyzer v2

Mobiiliystävällinen GitHub Pages -sovellus, joka arvioi julkisista tekstivihjeistä
TikTok-käyttäjän todennäköistä maa- tai kaupunkitasoista sijaintia.

## Ominaisuudet

- mobiiliystävällinen käyttöliittymä
- TikTok-käyttäjänimi tai profiililinkki
- profiilikortti
- todennäköisin maa / kaupunki
- confidence %
- löydetyt vihjeet
- vaihtoehtoiset sijainnit
- toimii täysin selaimessa
- ei backend-palvelinta

## Turvarajaukset

Sovellus ei:
- selvitä IP-osoitteita
- hae GPS-sijaintia
- paikanna käyttäjää reaaliajassa
- selvitä kotiosoitetta
- kierrä TikTokin kirjautumista tai yksityisyysrajoituksia

## GitHub Pages

1. Luo uusi repository GitHubissa.
2. Pura ZIP ja lataa tiedostot repositoryn juureen.
3. Avaa **Settings → Pages**.
4. Valitse **Deploy from a branch**.
5. Valitse `main` ja `/root`.
6. Tallenna.

## Huomio automaattisesta TikTok-datan hausta

Tämä staattinen GitHub Pages -versio ei yritä scraperilla lukea TikTok-profiileja suoraan.
Jos myöhemmin halutaan automaattinen julkisten profiilitietojen haku, se kannattaa toteuttaa
erillisellä backendillä ja TikTokin sallimien rajapintojen / käyttöehtojen mukaisesti.
