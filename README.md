# TikTok Checker – integroitu postilista + videometadata

Tämä versio käyttää yhtä Vercel-funktiota ja yhtä Chromium-sessiota:

1. Julkisen TikTok-profiilin hydration-JSON.
2. Samassa TikTok-selainistunnossa kutsu `/api/post/item_list/` käyttäjän `secUid`:lla.
3. Jos postilista palauttaa videon, tarkistetaan siitä `locationCreated` ja muut region/country-kentät.
4. Ensimmäinen video avataan lisäksi TikTokin julkisena videosivuna ja tarkistetaan `webapp.video-detail`-JSON.
5. Maa näytetään vain, jos TikTok palauttaa kaksikirjaimisen region-arvon. Kieltä, bioa tai käyttäjänimeä ei käytetä arvaukseen.

## Vercel

Lataa projektin sisältö GitHub-repositorion juureen. Vercel käyttää `vercel.json`-asetuksia ja Node 20+:aa.

Huom: TikTok voi muuttaa julkisen web-rajapintansa toimintaa tai estää automaattisia pyyntöjä. Diagnostiikka näyttää Post API:n HTTP-tilan ja virheen, jotta nähdään toimiiko selainistunnon sisäinen kutsu Vercelistä.
