import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {mkdir} from 'node:fs/promises';
import path from 'node:path';
const require=createRequire(import.meta.url);
export async function checkPlansUI({origin,cookie}){
 const {chromium}=require('playwright'),browser=await chromium.launch({headless:true}),errors=[];
 const folder=path.resolve('.sites-runtime/plan-ui');await mkdir(folder,{recursive:true});
 try{
  for(const width of [320,390,768,1024]){
   const context=await browser.newContext({viewport:{width,height:900},isMobile:width<768,hasTouch:true});
   await context.addCookies(cookie.split('; ').filter(Boolean).map(c=>({name:c.slice(0,c.indexOf('=')),value:c.slice(c.indexOf('=')+1),url:origin})));
   const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
   await page.goto(origin+'/#module=technicalPlans');await page.locator('.plan-card').first().waitFor();
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true,'Horizontal page overflow at '+width);
   await page.locator('.plan-card').filter({hasText:'Plan Tunis'}).first().click();await page.locator('.plan-viewport').waitFor();
   assert.equal(await page.locator('.plan-viewer-toolbar button[aria-pressed=true]').textContent(),'3D');
   const polygon=page.locator('.plan-viewport polygon[data-plan-object^="panel-"]').last();await polygon.click({force:true});await page.locator('.plan-selection').waitFor();
   await page.getByRole('button',{name:'2D',exact:true}).click();assert.equal(await page.getByRole('button',{name:'2D',exact:true}).getAttribute('aria-pressed'),'true');
   await page.getByRole('button',{name:'3D',exact:true}).click();const before=await polygon.getAttribute('points');await page.getByRole('button',{name:'Zoomer',exact:true}).click();assert.notEqual(await polygon.getAttribute('points'),before);
   await page.getByRole('button',{name:'Agrandir le plan',exact:true}).click();await page.locator('.plan-fullscreen').waitFor();assert.equal(await page.locator('.plan-fullscreen .plan-viewport').count(),1);await page.keyboard.press('Escape');
   await page.screenshot({path:path.join(folder,'plan-'+width+'.png'),fullPage:true});await page.keyboard.press('Escape');
   await page.goto(origin+'/#module=clients');await page.locator('.records-panel tbody tr').first().waitFor();
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true,'Record cards overflow at '+width);
   await context.close();
  }
  assert.deepEqual(errors,[]);console.log('PASS: phone/tablet widths, no page overflow, 3D object selection, zoom, 2D switch, expanded view and responsive record cards.');
 }finally{await browser.close();}
}
