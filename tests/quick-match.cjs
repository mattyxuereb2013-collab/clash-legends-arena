const {chromium}=require('playwright');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({channel:'chrome',headless:true,args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const contexts=[];
 try{
  const pages=[];
  for(let n=0;n<2;n++){
   const ctx=await browser.newContext({viewport:{width:1365,height:768}});contexts.push(ctx);
   const page=await ctx.newPage();pages.push(page);
   page.on('pageerror',e=>console.error('Quick match browser error:',e.message));
   await page.goto('http://127.0.0.1:8765/?e2e=1',{waitUntil:'load',timeout:45000});
   await page.locator('#welcomeName').fill('QuickTester'+n);
   await page.locator('#deviceLaptop').click();await page.locator('#welcomeGo').click();
   await page.locator('#modesBtn').click();
   await page.getByRole('button',{name:/ONLINE 1V1/}).click();
  }
  await Promise.all(pages.map(p=>p.getByRole('button',{name:/QUICK MATCH/}).click()));
  await Promise.all(pages.map(p=>p.waitForFunction(()=>window.__clashTest?.snapshot().online===true&&window.__clashTest?.snapshot().alive===1,null,{timeout:45000})));
  const roomCodes=await Promise.all(pages.map(p=>p.evaluate(()=>window.clashLiveDuel?.roomCode)));
  assert.equal(roomCodes[0],roomCodes[1],'quick match opponents must share a room');
  assert.match(roomCodes[0],/^[A-HJ-NP-Z2-9]{8}$/);
  assert.notEqual(await pages[0].evaluate(()=>window.clashLiveDuel.host),await pages[1].evaluate(()=>window.clashLiveDuel.host),'exactly one host is required');
  console.log('PASS: matchmaking queue paired two people into the same active online duel room');
 }finally{for(const ctx of contexts)await ctx.close();await browser.close()}
})().catch(e=>{console.error('FAIL online quick-match integration:',e);process.exitCode=1});
