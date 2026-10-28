const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const names=['Bolt','Ember','Moss','Violet','Frost','Ricochet','Nova','Terra'];
(async()=>{
 const browser=await chromium.launch({channel:'chrome',headless:true,args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 try{
  const page=await browser.newPage({viewport:{width:1280,height:720}});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:8765/?e2e=1',{waitUntil:'domcontentloaded',timeout:45000});
  await page.locator('#welcomeName').fill('MatrixTester');
  await page.locator('#deviceLaptop').click();
  await page.locator('#welcomeGo').click();
  for(let i=0;i<8;i++){
   await page.evaluate(index=>{
    if(index>0)localStorage.setItem('clashOwned'+['BOLT','EMBER','MOSS','VIOLET','FROST','RICOCHET','NOVA','TERRA'][index],'yes');
    localStorage.setItem('clashLegendsFighter',String(index));
    localStorage.setItem('clashGameMode','showdown');
   },i);
   await page.locator('#start').click();
   let snap=await page.evaluate(()=>window.__clashTest.snapshot());
   assert.equal(snap.selectedFighter,i,'selected fighter did not reach battle');
   assert.equal(snap.alive,9,'Solo must spawn nine opponents');
   await page.evaluate(()=>window.__clashTest.forceWin());
   await page.waitForSelector('#again',{timeout:14000});
   const trophy=await page.evaluate(name=>Number(localStorage.getItem('clash'+name+'Trophies')||0),names[i]);
   assert.equal(trophy,12,'new fighter victory should award 12 trophies');
   assert.match(await page.locator('.result-fighter').innerText(),new RegExp(names[i],'i'));
   await page.locator('#again').click();
   await page.waitForSelector('#start',{timeout:15000});
   console.log('PASS FIGHTER',names[i]);
  }
  assert.deepEqual(errors,[],'browser exceptions occurred');
  console.log('PASS all eight selectable fighters, solo spawns, win results, independent trophy storage');
 }finally{await browser.close()}
})().catch(e=>{console.error('FAIL gameplay matrix',e);process.exitCode=1});
