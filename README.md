# TikTok Checker 2.1

Tämä versio yrittää hakea TikTokin videolistan suoraan selaimen omassa kontekstissa
sen jälkeen, kun profiilin `secUid` on saatu.

Region-järjestys:
1. profiilin oma `region`
2. `/api/post/item_list/` -> julkisten videoiden `locationCreated`
3. N/A

Maatietoa ei päätellä kielestä, käyttäjänimestä tai biosta.

Jos Lisätiedot-kohdassa lukee:
- Videolistan tila: OK (...) -> endpoint vastasi
- Videoita tarkistettu: >0 -> locationCreated voidaan testata
- TikTok ei palauttanut videolistaa -> kutsu vaatii vielä TikTokin allekirjoitusparametreja/session lisätietoja

Ei TikMatrixia. Ei Omar-Thing API:a. Ei API-avainta.
