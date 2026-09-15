# TikTok Checker – region-debug

Tämä testiversio tekee tarkoituksella vain yhden region-haun:

`__UNIVERSAL_DATA_FOR_REHYDRATION__`
→ `__DEFAULT_SCOPE__`
→ `webapp.user-detail`
→ `userInfo`
→ `user`
→ `region`

Se ei päättele maata kielestä, biosta tai käyttäjänimestä, eikä tässä versiossa
käytetä videoiden `locationCreated`-kenttää tai erillistä `/api/user/detail/`-kutsua.

Lisätiedoissa näkyy:
- TikTok-sivun HTTP-vastaus
- löytyikö `region`-avain käyttäjäobjektista
- `region`-kentän raaka-arvo

Näin voidaan testata yksiselitteisesti, antaako TikTok kyseiselle julkiselle
tilille regionin juuri profiilisivun mukana toimitetussa datassa.

Tietoja ei tallenneta sovelluksen omaan tietokantaan.
