const {chromium}=require('playwright');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({channel:'chrome',headless:true,args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const pages=[],contexts=[];
 try{
  for(const name of ['RoomHost','RoomGuest']){
   const ctx=await browser.newContext({viewport:{width:1365,height:768}});contexts.push(ctx);
   const p=await ctx.newPage();pages.push(p);
   p.on('pageerror',e=>console.error('PAGE ERROR '+name+': '+e.message));
   await p.goto('http://127.0.0.1:8765/?e2e=1',{waitUntil:'load',timeout:45000});
   await p.locator('#welcomeName').fill(name);
   await p.locator('#deviceLaptop').click();
   await p.locator('#welcomeGo').click();
   await p.locator('#modesBtn').click();
   await p.getByRole('button',{name:/ONLINE 1V1/}).click();
   await p.waitForSelector('#popupOptions button');
   assert.match(await p.locator('#popupTitle').innerText(),/ONLINE 1V1/);
  }
  const [host,guest]=pages;
  await host.getByRole('button',{name:/CREATE PRIVATE ROOM/}).click();
  await host.waitForFunction(()=>/^⚔️ ROOM CODE: [A-Z2-9]{8}$/.test(document.querySelector('#popupTitle').textContent),{timeout:12000});
  const title=await host.locator('#popupTitle').innerText(),code=title.match(/[A-Z2-9]{8}$/)[0];
  await guest.getByRole('button',{name:/JOIN WITH ROOM CODE/}).click();
  await guest.locator('#popupOptions input').fill(code);
  await guest.getByRole('button',{name:'JOIN ROOM'}).click();
  await Promise.all(pages.map(p=>p.waitForFunction(()=>Boolean(window.__clashTest?.snapshot().online&&window.__clashTest?.snapshot().alive===1),{timeout:25000})));
  console.log('PASS: real Supabase room connection with both players, one remote rival per client');
  await Promise.all(pages.map(p=>p.evaluate(()=>window.__clashTest.skipIntro())));
  await host.evaluate(()=>window.__clashTest.shootAt(0));
  await guest.waitForFunction(()=>window.__clashTest?.snapshot().heroHP<100,{timeout:8000});
  const guestHP=await guest.evaluate(()=>window.__clashTest.snapshot().heroHP);
  assert(guestHP>0&&guestHP<100,'received online projectile should damage guest locally');
  assert((await guest.evaluate(()=>window.__clashTest.snapshot().damageNumbers))>0,'incoming online hit should produce a visible damage indicator');
  console.log('PASS: live attack broadcast caused damage on remote client (guest HP '+guestHP+')');
  const netGuard=await guest.evaluate(()=>{
    const before=window.__clashTest.snapshot().remote;
    window.clashGameReceiveFrame({x:2200,y:1500,hp:before.hp,angle:0});
    const after=window.__clashTest.snapshot().remote;
    return {jump:Math.hypot(after.x-before.x,after.y-before.y),after}
  });
  assert(netGuard.jump<=241,'remote state packets must not teleport an opponent across the arena');
  const flood=await guest.evaluate(()=>{
    const before=window.__clashTest.snapshot().shots;
    window.clashGameReceiveShot({angle:0});
    window.clashGameReceiveShot({angle:0});
    return window.__clashTest.snapshot().shots-before;
  });
  assert(flood<=3,'remote fire packets must be rate-limited to one attack burst');
  console.log('PASS: online movement and firing packet sanity limits');
  assert.equal(await guest.evaluate(()=>localStorage.getItem('clashGameMode')),'duel');
  await host.evaluate(()=>window.__clashTest.forceWin());
  await host.waitForSelector('.result-card',{timeout:12000});
  assert.equal(await host.evaluate(()=>Number(localStorage.getItem('clashBoltTrophies')||0)),0,'online peer duel must not award trophies');
  assert.match(await host.locator('.result-card').innerText(),/ONLINE 1V1|FRIENDLY DUEL/);
  assert.match(await host.locator('.result-card').innerText(),/NO RANKED REWARDS/);
  assert.equal(await host.evaluate(()=>Number(localStorage.getItem('clashLegendsWins')||0)),0,'unranked duel should not affect offline career wins');
  console.log('PASS: unranked online duel gives no trophies');
 }finally{for(const c of contexts)await c.close();await browser.close()}
})().catch(e=>{console.error('FAIL real-time online-duel integration',e);process.exitCode=1});
