const $ = (id) => document.getElementById(id);

const translations = {
  fi:{title:"TikTok-tarkistin",heroTitle:"-tarkistin",subtitle:"Julkisten profiilitietojen tarkistus.",searchPlaceholder:"@käyttäjänimi",search:"Hae",matchesTitle:"Lähimmät osumat",region:"Maa / region",language:"Kieli",videoPlaceholder:"TikTok-videon linkki",checkVideo:"Tarkista video",followers:"Seuraajat",following:"Seuratut",likes:"Tykkäykset",videos:"Videot",details:"Lisätiedot",created:"Tili luotu",private:"Yksityinen tili",verified:"Vahvistettu",source:"Lähde",openProfile:"Avaa TikTok-profiili",ad:"Mainos",yes:"Kyllä",no:"Ei",loading:"Haetaan…",nameLoading:"Etsitään käyttäjiä…",notFound:"Käyttäjää ei löytynyt. Tarkista käyttäjänimi, esimerkiksi @frostedpixel_fi.",searchError:"Haku epäonnistui.",videoChecking:"Tarkistetaan videota…",videoNoRegion:"Videosta ei löytynyt region-tietoa.",checkCount:"tarkistusta",followersShort:"seuraajaa"},
  en:{title:"TikTok Checker",heroTitle:"Checker",subtitle:"Check public profile information.",searchPlaceholder:"@username",search:"Search",matchesTitle:"Closest matches",region:"Country / region",language:"Language",videoPlaceholder:"TikTok video URL",checkVideo:"Check video",followers:"Followers",following:"Following",likes:"Likes",videos:"Videos",details:"More details",created:"Account created",private:"Private account",verified:"Verified",source:"Source",openProfile:"Open TikTok profile",ad:"Ad",yes:"Yes",no:"No",loading:"Loading…",nameLoading:"Searching users…",notFound:"User not found. Check the username, for example @frostedpixel_fi.",searchError:"Search failed.",videoChecking:"Checking video…",videoNoRegion:"No region data found in this video.",checkCount:"checks",followersShort:"followers"},
  sv:{title:"TikTok-kontroll",heroTitle:"-kontroll",subtitle:"Kontroll av offentlig profilinformation.",searchPlaceholder:"@användarnamn",search:"Sök",matchesTitle:"Närmaste träffar",region:"Land / region",language:"Språk",videoPlaceholder:"TikTok-videolänk",checkVideo:"Kontrollera video",followers:"Följare",following:"Följer",likes:"Gilla-markeringar",videos:"Videor",details:"Mer information",created:"Konto skapat",private:"Privat konto",verified:"Verifierat",source:"Källa",openProfile:"Öppna TikTok-profil",ad:"Annons",yes:"Ja",no:"Nej",loading:"Hämtar…",nameLoading:"Söker användare…",notFound:"Användaren hittades inte.",searchError:"Sökningen misslyckades.",videoChecking:"Kontrollerar video…",videoNoRegion:"Ingen regioninformation hittades i videon.",checkCount:"kontroller",followersShort:"följare"},
  de:{title:"TikTok-Check",heroTitle:"-Check",subtitle:"Öffentliche Profilinformationen prüfen.",searchPlaceholder:"@Benutzername",search:"Suchen",matchesTitle:"Ähnlichste Treffer",region:"Land / Region",language:"Sprache",videoPlaceholder:"TikTok-Video-URL",checkVideo:"Video prüfen",followers:"Follower",following:"Folgt",likes:"Likes",videos:"Videos",details:"Weitere Details",created:"Konto erstellt",private:"Privates Konto",verified:"Verifiziert",source:"Quelle",openProfile:"TikTok-Profil öffnen",ad:"Anzeige",yes:"Ja",no:"Nein",loading:"Wird geladen…",nameLoading:"Benutzer werden gesucht…",notFound:"Benutzer nicht gefunden.",searchError:"Suche fehlgeschlagen.",videoChecking:"Video wird geprüft…",videoNoRegion:"Keine Regionsdaten im Video gefunden.",checkCount:"Prüfungen",followersShort:"Follower"},
  fr:{title:"Vérificateur TikTok",heroTitle:"Vérificateur",subtitle:"Vérification des informations publiques du profil.",searchPlaceholder:"@nom d’utilisateur",search:"Rechercher",matchesTitle:"Résultats proches",region:"Pays / région",language:"Langue",videoPlaceholder:"URL de la vidéo TikTok",checkVideo:"Vérifier la vidéo",followers:"Abonnés",following:"Abonnements",likes:"J’aime",videos:"Vidéos",details:"Plus de détails",created:"Compte créé",private:"Compte privé",verified:"Vérifié",source:"Source",openProfile:"Ouvrir le profil TikTok",ad:"Publicité",yes:"Oui",no:"Non",loading:"Chargement…",nameLoading:"Recherche d’utilisateurs…",notFound:"Utilisateur introuvable.",searchError:"La recherche a échoué.",videoChecking:"Vérification de la vidéo…",videoNoRegion:"Aucune donnée de région trouvée dans cette vidéo.",checkCount:"vérifications",followersShort:"abonnés"},
  es:{title:"Verificador de TikTok",heroTitle:"Verificador",subtitle:"Comprobación de información pública del perfil.",searchPlaceholder:"@usuario",search:"Buscar",matchesTitle:"Coincidencias más cercanas",region:"País / región",language:"Idioma",videoPlaceholder:"URL del vídeo de TikTok",checkVideo:"Comprobar vídeo",followers:"Seguidores",following:"Siguiendo",likes:"Me gusta",videos:"Vídeos",details:"Más información",created:"Cuenta creada",private:"Cuenta privada",verified:"Verificado",source:"Fuente",openProfile:"Abrir perfil de TikTok",ad:"Anuncio",yes:"Sí",no:"No",loading:"Cargando…",nameLoading:"Buscando usuarios…",notFound:"Usuario no encontrado.",searchError:"La búsqueda ha fallado.",videoChecking:"Comprobando vídeo…",videoNoRegion:"No se encontraron datos de región en este vídeo.",checkCount:"comprobaciones",followersShort:"seguidores"}
};

const localeMap={fi:"fi-FI",en:"en-US",sv:"sv-SE",de:"de-DE",fr:"fr-FR",es:"es-ES"};
let uiLang="fi";
let currentUsername="";
let currentData=null;

function t(key){return translations[uiLang]?.[key]||translations.en[key]||key}
function chooseInitialLanguage(){const saved=localStorage.getItem("tiktokCheckerLanguage");if(translations[saved])return saved;const browser=(navigator.language||"en").slice(0,2).toLowerCase();return translations[browser]?browser:"en"}
function applyLanguage(lang){uiLang=translations[lang]?lang:"en";localStorage.setItem("tiktokCheckerLanguage",uiLang);document.documentElement.lang=uiLang;$("uiLanguage").value=uiLang;document.querySelectorAll("[data-i18n]").forEach(el=>{el.textContent=t(el.dataset.i18n)});document.querySelectorAll("[data-i18n-placeholder]").forEach(el=>{el.placeholder=t(el.dataset.i18nPlaceholder)});if(currentData)render(currentData,currentUsername);updateCheckCounter()}

function normalizeQuery(value=""){return value.trim().replace(/^https?:\/\/(www\.)?tiktok\.com\/@/i,"").split(/[?#]/)[0].replace(/\/$/,"")}
function cleanUsername(value=""){return normalizeQuery(value).replace(/^@/,"").replace(/[^A-Za-z0-9._]/g,"").slice(0,64)}
function looksLikeUsername(value=""){const raw=value.trim();return raw.startsWith("@")||/^https?:\/\/(www\.)?tiktok\.com\/@/i.test(raw)}
function compact(value){const n=Number(value);return Number.isFinite(n)?new Intl.NumberFormat(localeMap[uiLang],{notation:"compact",maximumFractionDigits:1}).format(n):"–"}
function yesNo(v){if(v===true)return t("yes");if(v===false)return t("no");return "–"}
function regionName(code){if(!code)return"N/A";const c=String(code).toUpperCase();try{const n=new Intl.DisplayNames([uiLang],{type:"region"}).of(c);return n&&n!==c?`${c} · ${n}`:c}catch{return c}}
function languageName(code){if(!code)return"N/A";const c=String(code).toLowerCase().replace("_","-");try{const n=new Intl.DisplayNames([uiLang],{type:"language"}).of(c.split("-")[0]);return n?`${c} · ${n}`:c}catch{return c}}

const CHECK_COUNT_KEY="tiktokCheckerSuccessfulChecks";
function getCheckCount(){const n=Number(localStorage.getItem(CHECK_COUNT_KEY)||0);return Number.isFinite(n)&&n>=0?Math.floor(n):0}
function updateCheckCounter(){const el=$("checkCounter");if(!el)return;const count=getCheckCount();el.textContent=`${new Intl.NumberFormat(localeMap[uiLang]).format(count)} ${t("checkCount")}`}
function incrementCheckCounter(){localStorage.setItem(CHECK_COUNT_KEY,String(getCheckCount()+1));updateCheckCounter()}

function render(data,username){currentData=data;currentUsername=username;const u=data.user||{},s=data.stats||{};$("nickname").textContent=u.nickname||username;$("handle").textContent=`@${u.uniqueId||username}`;$("region").textContent=regionName(u.region);$("language").textContent=languageName(u.language);$("videoFallback").classList.toggle("hidden",!!u.region);$("regionSourceRow").classList.toggle("hidden",!u.region);$("regionSource").textContent=data.regionSource||"TikTok";
 const avatar=$("avatar"),fallback=$("avatarFallback");fallback.textContent=(u.nickname||username).charAt(0).toUpperCase();if(u.avatar){avatar.src=u.avatar;avatar.alt=u.nickname||username;avatar.classList.remove("hidden");fallback.classList.add("hidden")}else{avatar.classList.add("hidden");fallback.classList.remove("hidden")}
 if(u.signature){$("bio").textContent=u.signature;$("bioWrap").classList.remove("hidden")}else $("bioWrap").classList.add("hidden");
 $("followers").textContent=compact(s.followerCount);$("following").textContent=compact(s.followingCount);$("likes").textContent=compact(s.heartCount);$("videos").textContent=compact(s.videoCount);$("userId").textContent=u.id||"–";$("created").textContent=u.createTime?new Date(Number(u.createTime)*1000).toLocaleString(localeMap[uiLang]):"–";$("privateAccount").textContent=yesNo(u.privateAccount);$("verified").textContent=yesNo(u.verified);$("profileLink").href=`https://www.tiktok.com/@${encodeURIComponent(u.uniqueId||username)}`;$("result").classList.remove("hidden")}

async function fetchProfile(username,videoUrl=""){const qs=new URLSearchParams({username});if(videoUrl)qs.set("videoUrl",videoUrl);const res=await fetch(`/api/profile?${qs}`);const data=await res.json().catch(()=>({}));if(!res.ok)throw Object.assign(new Error(data.error||t("searchError")),{status:res.status});return data}
async function searchUsers(q){const res=await fetch(`/api/search?q=${encodeURIComponent(q)}`);const data=await res.json().catch(()=>({}));if(!res.ok)throw new Error(data.error||t("searchError"));return Array.isArray(data.results)?data.results:[]}

function showMatches(results){const list=$("matchList");list.innerHTML="";if(!results.length){$("matches").classList.add("hidden");return}results.slice(0,6).forEach(item=>{const btn=document.createElement("button");btn.type="button";btn.className="matchItem";const initial=(item.nickname||item.username||"?").charAt(0).toUpperCase();const avatar=item.avatar?`<img class="matchAvatar" src="${item.avatar.replace(/"/g,"&quot;")}" alt="">`:`<span class="matchAvatar matchAvatarFallback">${initial}</span>`;btn.innerHTML=`${avatar}<span class="matchText"><span class="matchName">${escapeHtml(item.nickname||item.username)}</span><span class="matchHandle">@${escapeHtml(item.username)}</span></span>${Number.isFinite(Number(item.followers))?`<span class="matchFollowers">${compact(item.followers)} ${t("followersShort")}</span>`:""}`;btn.addEventListener("click",()=>loadExactProfile(item.username));list.appendChild(btn)});$("matches").classList.remove("hidden")}
function escapeHtml(s=""){return String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}

async function loadExactProfile(username){$("matches").classList.add("hidden");$("result").classList.add("hidden");$("status").className="status";$("status").textContent=t("loading");$("username").value=`@${username}`;$("searchBtn").disabled=true;try{const data=await fetchProfile(username);render(data,username);incrementCheckCounter();$("status").textContent=""}catch(err){$("status").className="status error";$("status").textContent=err?.message||t("searchError")}finally{$("searchBtn").disabled=false}}

$("form").addEventListener("submit",async e=>{e.preventDefault();const raw=$("username").value.trim();if(!raw)return;$("result").classList.add("hidden");$("matches").classList.add("hidden");$("status").className="status";$("videoStatus").textContent="";$("videoUrl").value="";$("searchBtn").disabled=true;
 try{
   const username=cleanUsername(raw);
   if(!username)throw new Error(t("notFound"));
   $("status").textContent=t("loading");
   const data=await fetchProfile(username);
   render(data,username);
   incrementCheckCounter();
   $("status").textContent="";
 }catch(err){
   $("status").className="status error";
   $("status").textContent=err?.status===404?t("notFound"):(err?.message||t("searchError"));
 }finally{$("searchBtn").disabled=false}
});

$("videoForm").addEventListener("submit",async e=>{e.preventDefault();const username=currentUsername||cleanUsername($("username").value);const videoUrl=$("videoUrl").value.trim();if(!username||!videoUrl)return;$("videoBtn").disabled=true;$("videoStatus").className="videoStatus";$("videoStatus").textContent=t("videoChecking");try{const data=await fetchProfile(username,videoUrl);render(data,username);if(data?.user?.region)$("videoStatus").textContent="";else{$("videoStatus").className="videoStatus error";$("videoStatus").textContent=t("videoNoRegion")}}catch(err){$("videoStatus").className="videoStatus error";$("videoStatus").textContent=err?.message||t("searchError")}finally{$("videoBtn").disabled=false}});

$("uiLanguage").addEventListener("change",e=>applyLanguage(e.target.value));
applyLanguage(chooseInitialLanguage());
