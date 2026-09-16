import chromium from "@sparticuz/chromium";
import puppeteer from "puppeteer-core";

function cleanQuery(value=""){
  return String(value).trim().replace(/[\u0000-\u001f]/g,"").slice(0,80);
}

export default async function handler(req,res){
  res.setHeader("Content-Type","application/json; charset=utf-8");
  res.setHeader("Cache-Control","public, s-maxage=300, stale-while-revalidate=600");
  if(req.method!=="GET") return res.status(405).json({error:"Method not allowed"});
  const q=cleanQuery(req.query.q);
  if(q.length<2) return res.status(400).json({error:"Search query is too short"});

  let browser;
  try{
    browser=await puppeteer.launch({args:chromium.args,defaultViewport:{width:1280,height:900},executablePath:await chromium.executablePath(),headless:chromium.headless});
    const page=await browser.newPage();
    await page.setUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36");
    await page.setExtraHTTPHeaders({"Accept-Language":"en-US,en;q=0.9"});
    const url=`https://www.tiktok.com/search/user?q=${encodeURIComponent(q)}`;
    await page.goto(url,{waitUntil:"domcontentloaded",timeout:20000});
    try{await page.waitForSelector('a[href^="/@"],a[href*="tiktok.com/@"]',{timeout:6000})}catch{}

    const results=await page.evaluate(()=>{
      const out=[];const seen=new Set();
      const links=[...document.querySelectorAll('a[href^="/@"],a[href*="tiktok.com/@"]')];
      for(const a of links){
        let path="";try{path=new URL(a.href,location.origin).pathname}catch{continue}
        const m=path.match(/^\/@([^/?#]+)/);if(!m)continue;const username=decodeURIComponent(m[1]);
        if(!username||seen.has(username.toLowerCase())||/^(login|signup|explore)$/i.test(username))continue;
        const box=a.closest('[data-e2e*="search-user"],li,div[class*="DivUserContainer"],div[class*="user"]')||a.parentElement||a;
        const img=box.querySelector?.('img');
        const text=(box.innerText||a.innerText||"").split("\n").map(s=>s.trim()).filter(Boolean);
        let nickname=text.find(x=>x!==`@${username}`&&x.toLowerCase()!==username.toLowerCase()&&!/^\d/.test(x))||username;
        const followerText=text.find(x=>/followers?|seuraaj|följare|abonn/i.test(x))||"";
        let followers=null;const fm=followerText.replace(/,/g,"").match(/([\d.]+)\s*([KMB])?/i);if(fm){let n=Number(fm[1]);const mult={K:1e3,M:1e6,B:1e9}[String(fm[2]||"").toUpperCase()]||1;followers=Math.round(n*mult)}
        out.push({username,nickname:nickname.slice(0,80),avatar:img?.src||null,followers});seen.add(username.toLowerCase());
        if(out.length>=12)break;
      }
      return out;
    });

    return res.status(200).json({results:results.slice(0,8)});
  }catch(err){
    return res.status(500).json({error:"TikTok user search is temporarily unavailable"});
  }finally{
    if(browser){try{await browser.close()}catch{}}
  }
}
