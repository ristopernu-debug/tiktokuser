import chromium from "@sparticuz/chromium";
import puppeteer from "puppeteer-core";

function cleanQuery(value=""){
  return String(value).trim().replace(/[\u0000-\u001f]/g,"").slice(0,80);
}
function normalizeUser(x={}){
  const u=x?.userInfo?.user||x?.user||x?.author||x;
  const s=x?.userInfo?.stats||x?.stats||{};
  const username=u?.uniqueId||u?.unique_id||u?.username;
  if(!username) return null;
  return {
    username:String(username),
    nickname:String(u?.nickname||u?.displayName||u?.display_name||username).slice(0,80),
    avatar:u?.avatarThumb||u?.avatarMedium||u?.avatarLarger||u?.avatar_url||null,
    followers:Number(s?.followerCount??s?.follower_count??u?.followerCount??NaN)
  };
}
function collectUsers(value,out,depth=0){
  if(depth>9||value==null) return;
  if(Array.isArray(value)){for(const v of value) collectUsers(v,out,depth+1);return;}
  if(typeof value!=="object") return;
  const hit=normalizeUser(value); if(hit) out.push(hit);
  for(const v of Object.values(value)) collectUsers(v,out,depth+1);
}
function uniqueRank(items,q){
  const query=q.toLowerCase().replace(/^@/,"");
  const seen=new Set();
  return items.filter(x=>{
    const k=x.username.toLowerCase(); if(seen.has(k)) return false; seen.add(k); return true;
  }).map(x=>{
    const u=x.username.toLowerCase(), n=x.nickname.toLowerCase();
    let score=0;
    if(u===query) score+=1000;
    if(u.startsWith(query)) score+=500;
    if(n===query) score+=450;
    if(n.startsWith(query)) score+=250;
    if(u.includes(query)) score+=180;
    if(n.includes(query)) score+=120;
    return {...x,score};
  }).filter(x=>x.score>0).sort((a,b)=>b.score-a.score-(Number(b.followers)||0)+(Number(a.followers)||0)).slice(0,8).map(({score,...x})=>x);
}

export default async function handler(req,res){
  res.setHeader("Content-Type","application/json; charset=utf-8");
  res.setHeader("Cache-Control","public, s-maxage=180, stale-while-revalidate=600");
  if(req.method!=="GET") return res.status(405).json({error:"Method not allowed"});
  const q=cleanQuery(req.query.q);
  if(q.length<2) return res.status(400).json({error:"Search query is too short"});

  let browser;
  try{
    browser=await puppeteer.launch({args:chromium.args,defaultViewport:{width:1280,height:900},executablePath:await chromium.executablePath(),headless:chromium.headless});
    const page=await browser.newPage();
    await page.setUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36");
    await page.setExtraHTTPHeaders({"Accept-Language":"en-US,en;q=0.9"});
    const captured=[];
    page.on("response",async response=>{
      const url=response.url();
      if(!/\/api\/search\/user|search\/user/i.test(url)) return;
      try{const ct=response.headers()["content-type"]||"";if(ct.includes("json")){const json=await response.json();collectUsers(json,captured)}}catch{}
    });
    await page.goto(`https://www.tiktok.com/search/user?q=${encodeURIComponent(q)}`,{waitUntil:"domcontentloaded",timeout:22000});
    await new Promise(r=>setTimeout(r,2500));
    try{await page.evaluate(()=>window.scrollTo(0,Math.min(document.body.scrollHeight,1200)));await new Promise(r=>setTimeout(r,1200))}catch{}

    const pageData=await page.evaluate(()=>{
      const users=[];
      const push=(username,nickname,avatar)=>{if(username)users.push({username,nickname:nickname||username,avatar:avatar||null})};
      for(const a of document.querySelectorAll('a[href^="/@"],a[href*="tiktok.com/@"]')){
        try{const m=new URL(a.href,location.origin).pathname.match(/^\/@([^/?#]+)/);if(!m)continue;const username=decodeURIComponent(m[1]);const box=a.closest('[data-e2e*="search-user"],li,div[class*="User"],div[class*="user"]')||a.parentElement||a;const img=box.querySelector?.('img');const text=(box.innerText||a.innerText||"").split("\n").map(s=>s.trim()).filter(Boolean);const nickname=text.find(x=>x!==`@${username}`&&x.toLowerCase()!==username.toLowerCase())||username;push(username,nickname,img?.src)}catch{}
      }
      const walk=(v,d=0)=>{if(d>9||v==null)return;if(Array.isArray(v)){v.forEach(x=>walk(x,d+1));return}if(typeof v!=="object")return;const u=v?.userInfo?.user||v?.user||v?.author||v;const username=u?.uniqueId||u?.unique_id||u?.username;if(username)push(String(username),String(u?.nickname||u?.displayName||u?.display_name||username),u?.avatarThumb||u?.avatarMedium||u?.avatarLarger||u?.avatar_url||null);Object.values(v).forEach(x=>walk(x,d+1))};
      for(const id of ["__UNIVERSAL_DATA_FOR_REHYDRATION__","SIGI_STATE"]){const el=document.getElementById(id);if(el?.textContent){try{walk(JSON.parse(el.textContent))}catch{}}}
      return users;
    });
    const results=uniqueRank([...captured,...pageData],q);
    return res.status(200).json({results});
  }catch(err){
    return res.status(500).json({error:"TikTok user search is temporarily unavailable"});
  }finally{if(browser){try{await browser.close()}catch{}}}
}
