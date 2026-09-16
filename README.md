# TikTok-tarkistin / TikTok Checker - V9

V9 on HERO WIDTH V8 -pakettiin tehty ulkoasupäivitys. Se sisältää koko
sovelluksen, ei pelkkää CSS-korjausta. Julkisten profiilitietojen haku ja
palvelimen rajapintatiedostot on säilytetty muuttumattomina.

## V9:n muutokset

- Hae-painike ja tekijän alatunniste: metsänvihreä #244A3B.
- Tilastot yhdellä vaaleanvihreällä #EEF7F3-pinnalla, hennot erotinviivat.
- Tilastoluvut 26 px työpöydällä; mobiilissa 24 px ja 2 x 2 -asettelu.
- Hero-teksti alkaa paperilapun jälkeen. Taustan oikealla puolella on kevyt
  CSS-häivytys. Alkuperäistä kuvaa ei muokattu.
- Banneri, mainosten ulkoreunat ja alatunniste jakavat saman kokonaisleveyden.
- Profiililinkki on reunustettu painike ulkoisen linkin kuvakkeella.
- Sivumainospaikoissa ei ole katkoviivoja; Mainos-merkintä on yläreunassa.
- Enintään 1120 px leveässä näkymässä molemmat mainospaikat ovat
  sisällön alla koko sisältöleveyden mittaisina, 110 px korkeina.
- Enintään 600 px leveässä näkymässä mainospaikat ovat 96 px korkeita.
- Hakukenttä ja Hae-painike pysyvät samalla rivillä myös mobiilissa.
- CSS on koottu yhdeksi tiedostoksi; vanhat ristiriitaiset versio-ohitukset
  eivät jää voimaan. Käyttöliittymän kielet: FI, EN, SV, DE, FR, ES.

## Käyttöönotto nykyiseen projektiin

1. Pura ZIP-paketti.
2. Kopioi KOKO SISÄLTÖ nykyisen projektin juureen ja korvaa samannimiset
   tiedostot. Säilytä nykyinen palvelinkonfiguraatio ja mahdolliset omat salaisuudet.
3. Tee uusi julkaisu nykyiseen Vercel-projektiisi. Rajapintojen, riippuvuuksien
   tai ympäristömuuttujien muutoksia ei tarvita tätä ulkoasupäivitystä varten.
4. Tarkista uusi näkymä sekä tietokoneella että puhelimella. CSS- ja
   JavaScript-linkeissä on v=9-versioparametri vanhan selainvälimuistin varalta.

Pelkkän ulkoasun esikatselu paikallisesti:

```sh
cd public
python3 -m http.server 8000
```

Paikallinen staattinen palvelin ei suorita /api/profile-rajapintaa.
Varsinainen haku tarvitsee sovelluksen palvelinympäristön.

## Säilyvä toiminta ja rajaukset

Haku on tarkka käyttäjätunnushaku. @ ei ole pakollinen; näyttönimien
hakua ei oteta tässä versiossa uudelleen käyttöön. Paketissa säilyvä
vanha api/search.js ei ole käyttöliittymän hakupolussa.

Metadatan region-lähde pysyy avattavissa Lisätiedoissa. Videometadatan
region-arvo ei varmista henkilön kotimaata tai nykyistä fyysistä sijaintia.
Automaattisen tietohaun onnistuminen riippuu palautuvasta julkisesta datasta.

Mainospaikat ovat tyhjiä paikkamerkkejä: paketissa ei ole mainosverkoston
skriptejä, mainostunnuksia tai uutta seurantaa. Oikean mainoksen sovitus ja
verkoston asetukset on tehtävä erikseen ennen oikeiden mainosten käyttöä.
Selaimen sisällönestäjä voi edelleen piilottaa mainoksia.

## Tarkistukset

Ulkoasu tarkistettiin Chromium-selaimessa offline-testidatalla: 12 näyttöleveyttä
(320-1920 px) ja 6 kieltä, yhteensä 72 asettelu- ja kielitarkistusta.
Myös profiilin lataus, virhetilanne, Lisätiedot, kielen vaihto ja videolinkin
varahaku testattiin simuloiduilla vastauksilla. Ei JavaScript-ajovirheitä
näissä testeissä.

Testidataa tai testikuvakaappauksia ei sisälly julkaistavaan sivuun.
V9:n varsinaista live-TikTok-hakua ei testattu. Profiilihakulogiikka, palvelimen
rajapintatiedostot, kuva ja riippuvuudet ovat tavutasolla samat kuin V8:ssa.
