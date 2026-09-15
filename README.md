# TikTok Checker 2.2

Tämä versio ei yritä generoida TikTokin allekirjoituksia tai kiertää bot-suojausta.

Region-logiikka:
1. TikTokin profiilin julkinen `region`
2. jos puuttuu, selain kerää profiilissa näkyvät julkiset `/video/...`-linkit
3. avataan enintään 3 julkista videosivua normaalisti
4. luetaan videosivun julkisesta hydration-datasta `locationCreated`
5. jos arvoa ei löydy, näytetään N/A

Lisätiedoissa näkyy:
- Videolinkkejä löytyi
- Videoita tarkistettu
- Region-lähde

Ei TikMatrixia. Ei Omar-Thing API:a. Ei API-avainta.
