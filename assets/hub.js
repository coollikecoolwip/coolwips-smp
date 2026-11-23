/* CoolWips SMP Player Hub - no secrets or private server details in this public file. */
(()=>{'use strict';
const cfg=Object.assign({javaAddress:'play.coolwip.xyz',javaVersion:'26.2',bedrockAddress:'coolwip.playit.plus',bedrockPort:19132,bedrockConfirmed:true,statsUrl:'assets/data/players.json',marketUrl:'assets/data/market.json',updatesUrl:'assets/data/updates.json',supabaseUrl:'',supabasePublishableKey:''},window.COOLWIPS_HUB||{});
const $=id=>document.getElementById(id);
const tabs=['status','join','leaderboards','market','players','reports','staff','updates'];
const model={players:[],market:[],updates:[],events:[],accessToken:null};
const fmtNumber=n=>Number.isFinite(Number(n))?Number(n).toLocaleString('en-US'):'—';
const safeDate=v=>{if(!v)return 'Not supplied';const d=new Date(v);return Number.isFinite(d.getTime())?d.toLocaleDateString(undefined,{year:'numeric',month:'short',day:'numeric'}):'Not supplied'};
const el=(tag,klass,content)=>{const item=document.createElement(tag);if(klass)item.className=klass;if(content!==undefined)item.textContent=String(content);return item};
function notice(message){const n=$('global-notice');n.textContent=message;n.hidden=false;clearTimeout(notice.timer);notice.timer=setTimeout(()=>n.hidden=true,4500)}
function showTab(){const requested=location.hash.slice(1);if(requested==='staff'){location.replace('https://staff.coolwip.xyz/staff');return}const tab=tabs.includes(requested)?requested:'status';for(const t of tabs){const view=$(t);if(view)view.hidden=t!==tab}document.querySelectorAll('[data-tab]').forEach(a=>{const active=a.dataset.tab===tab;a.classList.toggle('active',active);if(active)a.setAttribute('aria-current','page');else a.removeAttribute('aria-current')});}
window.addEventListener('hashchange',showTab);showTab();
$('year').textContent=String(new Date().getFullYear());
$('java-address').textContent=cfg.javaAddress;$('join-java').textContent=cfg.javaAddress;
$('bedrock-address').textContent=cfg.bedrockAddress||'Not configured';
$('join-bedrock').textContent=cfg.bedrockAddress||'Custom address pending';
$('join-bedrock-port').textContent='Port: '+(cfg.bedrockPort||19132)+(cfg.bedrockConfirmed?'':' · confirm your new custom address');
async function copy(value){try{await navigator.clipboard.writeText(value);notice('Copied: '+value)}catch{notice('Copy manually: '+value)}}
document.querySelectorAll('[data-copy-address]').forEach(btn=>btn.addEventListener('click',()=>{const which=btn.dataset.copyAddress;const host=which==='java'?cfg.javaAddress:cfg.bedrockAddress;if(host)copy(host);else notice('Server address has not been configured')}));
async function fetchJson(url,timeout=12000){const ctrl=new AbortController();const timer=setTimeout(()=>ctrl.abort(),timeout);try{const response=await fetch(url,{signal:ctrl.signal,cache:'no-store'});if(!response.ok)throw Error('HTTP '+response.status);return await response.json()}finally{clearTimeout(timer)}}
async function checkEdition(edition,host){const state=$(edition+'-state'),count=$(edition+'-count'),version=$(edition+'-version');state.className='status-pill';state.textContent='Checking…';count.textContent='—';version.textContent='Contacting server status service…';if(!host){state.textContent='Not configured';version.textContent='Add an address in hub-config.js';return}
if(edition==='bedrock'){
  // NetherNet signaling is HTTP(S), not the older RakNet UDP server-list ping.
  // Do not interpret a failed external checker as proof that gameplay is offline.
  const port=Number(cfg.bedrockPort)||19132;
  const url='https://icefetch.tools.kt04.com/api/info?host='+encodeURIComponent(host)+'&port='+encodeURIComponent(port);
  try{
    const data=await fetchJson(url,15000);
    if(data&&data.ok===true&&data.info&&typeof data.info==='object'&&Number(data.status)>=200&&Number(data.status)<300){
      state.textContent='Online';state.classList.add('online');
      count.textContent=Number.isFinite(Number(data.info.players))?fmtNumber(data.info.players):'—';
      version.textContent=data.info.version?'Version: '+String(data.info.version):'NetherNet signaling responding';
    }else{
      state.textContent='Status unavailable';
      version.textContent='NetherNet could not be verified. Try connecting in Minecraft.';
    }
  }catch(err){
    state.textContent='Status unavailable';
    version.textContent='NetherNet check unavailable. The server may still be online.';
  }
  return;
}
try{const result=await fetchJson('https://api.mcstatus.io/v2/status/java/'+encodeURIComponent(host)+'?query=false',15000);
if(result.online===true){state.textContent='Online';state.classList.add('online');count.textContent=fmtNumber(result.players&&result.players.online);version.textContent='Java version: '+(cfg.javaVersion||'26.2');}
else if(result.online===false){state.textContent='Offline (check)';state.classList.add('offline');version.textContent='Status API could not reach the server';}
else{state.textContent='Unavailable';version.textContent='No reliable result available';}}
catch(err){state.textContent='Unavailable';version.textContent='Could not complete public status check';}
}
async function refreshStatus(){const btn=$('refresh-status');btn.disabled=true;await Promise.all([checkEdition('java',cfg.javaAddress),checkEdition('bedrock',cfg.bedrockAddress)]);btn.disabled=false;$('status-note').textContent='Last checked: '+new Date().toLocaleTimeString()+'. Java status: mcstatus.io. Bedrock NetherNet status: iceFetch. A failed Bedrock check does not prove the server is offline.';}
$('refresh-status').addEventListener('click',refreshStatus);refreshStatus();setInterval(()=>{if(document.visibilityState==='visible')refreshStatus()},180000);
async function loadPublicFeeds(){const [p,m,u]=await Promise.allSettled([fetchJson(cfg.statsUrl),fetchJson(cfg.marketUrl),fetchJson(cfg.updatesUrl)]);if(p.status==='fulfilled'&&Array.isArray(p.value.players)){model.players=p.value.players.filter(v=>v&&typeof v.name==='string');$('leaderboard-updated').textContent=p.value.updatedAt?'Statistics updated '+safeDate(p.value.updatedAt):'No player statistics have been published yet.';}
if(m.status==='fulfilled'&&Array.isArray(m.value.items)){model.market=m.value.items.filter(v=>v&&typeof v.name==='string');$('market-updated').textContent=m.value.updatedAt?'Market prices updated '+safeDate(m.value.updatedAt):'No market prices have been published yet.';}
if(u.status==='fulfilled'){model.updates=Array.isArray(u.value.updates)?u.value.updates:[];model.events=Array.isArray(u.value.events)?u.value.events:[];}
renderLeaders();renderMarket();renderFeeds();}
function addCell(row,value,klass){const cell=el('td',klass,String(value));row.appendChild(cell);return cell}
function renderLeaders(){const body=$('leaderboard-rows');body.replaceChildren();const q=$('leaderboard-search').value.trim().toLowerCase();const metric=$('leaderboard-sort').value;const filtered=model.players.filter(p=>p.name.toLowerCase().includes(q)).sort((a,b)=>(Number(b[metric])||0)-(Number(a[metric])||0));for(const [i,p] of filtered.entries()){const tr=el('tr');addCell(tr,i+1);const td=el('td');const a=el('a','player-link',p.name);a.href='#players';a.addEventListener('click',()=>{$('player-search').value=p.name;renderProfile(p.name)});td.appendChild(a);tr.appendChild(td);addCell(tr,typeof p.balance==='number'?fmtNumber(p.balance):'—');addCell(tr,typeof p.kills==='number'?fmtNumber(p.kills):'—');addCell(tr,typeof p.playtimeHours==='number'?fmtNumber(p.playtimeHours)+' h':'—');body.appendChild(tr)}$('leaderboard-empty').hidden=filtered.length>0;$('leaderboard-empty').textContent=model.players.length?'No players match your search.':'Player statistics have not been connected yet.'}
$('leaderboard-search').addEventListener('input',renderLeaders);$('leaderboard-sort').addEventListener('change',renderLeaders);
function renderMarket(){const body=$('market-rows');body.replaceChildren();const q=$('market-search').value.trim().toLowerCase();const category=$('market-category').value;const categories=[...new Set(model.market.map(x=>x.category).filter(x=>typeof x==='string'&&x))].sort();const select=$('market-category');if(select.options.length!==categories.length+1){select.replaceChildren(new Option('All categories',''));for(const name of categories)select.add(new Option(name,name));select.value=category;}
const items=model.market.filter(i=>(!category||i.category===category)&&i.name.toLowerCase().includes(q)).sort((a,b)=>a.name.localeCompare(b.name));
for(const item of items){const tr=el('tr');addCell(tr,item.name);addCell(tr,item.category||'Other');addCell(tr,typeof item.buy==='number'?fmtNumber(item.buy):'—');addCell(tr,typeof item.sell==='number'?fmtNumber(item.sell):'—');addCell(tr,typeof item.changePct==='number'?(item.changePct>0?'+':'')+item.changePct.toFixed(1)+'%':'—');body.appendChild(tr);}
$('market-empty').hidden=items.length>0;$('market-empty').textContent=model.market.length?'No items match your filters.':'Live economy prices have not been connected yet.';}
$('market-search').addEventListener('input',renderMarket);$('market-category').addEventListener('change',renderMarket);
function renderProfile(name){if(!/^[A-Za-z0-9_]{3,16}$/.test(name)){notice('Enter a valid Java Minecraft username (3–16 characters).');return}const p=model.players.find(v=>v.name.toLowerCase()===name.toLowerCase());$('player-profile').hidden=false;$('player-name').textContent=p?p.name:name;$('player-avatar').src='https://mc-heads.net/avatar/'+encodeURIComponent(name)+'/104';$('player-avatar').alt='Avatar for '+name;$('player-summary').textContent=p?'Public CoolWips SMP player statistics':'No published server statistics for this username yet.';const stats=$('player-stats');stats.replaceChildren();if(p){if(typeof p.balance==='number')stats.appendChild(el('span','', 'Balance: '+fmtNumber(p.balance)));if(typeof p.kills==='number')stats.appendChild(el('span','', 'Kills: '+fmtNumber(p.kills)));if(typeof p.playtimeHours==='number')stats.appendChild(el('span','', 'Playtime: '+fmtNumber(p.playtimeHours)+' h'));}else stats.appendChild(el('span','','Avatar lookup only'));}
$('player-form').addEventListener('submit',event=>{event.preventDefault();renderProfile($('player-search').value.trim())});
function renderFeed(listId,items,emptyText){const holder=$(listId);holder.replaceChildren();if(!items.length){holder.appendChild(el('div','feed-card empty-state',emptyText));return}const sorted=[...items].sort((a,b)=>String(b.date||'').localeCompare(String(a.date||'')));for(const item of sorted){if(!item||typeof item.title!=='string')continue;const article=el('article','feed-card');article.appendChild(el('span','kind',item.category||'Community'));article.appendChild(el('h3','',item.title));if(item.date){const time=el('time','',safeDate(item.date));time.dateTime=item.date;article.appendChild(time)}if(item.description)article.appendChild(el('p','',item.description));holder.appendChild(article)}}
function renderFeeds(){renderFeed('updates-list',model.updates,'No announcements have been published yet.');renderFeed('events-list',model.events,'No upcoming events have been announced yet.')}
function hasBackend(){return /^https:\/\/[-\w.]+\.supabase\.co\/?$/.test(cfg.supabaseUrl)&&typeof cfg.supabasePublishableKey==='string'&&cfg.supabasePublishableKey.length>10}
const backend=hasBackend();if(backend){$('report-mode').textContent='Reports are submitted securely to the private ticket database.'}else{$('report-mode').textContent='The private ticket database is not connected yet. Submit opens an email draft addressed to CoolWips SMP reports.';}
async function api(path,body,token,method='POST'){if(!backend)throw Error('Secure ticket backend is not configured');const url=cfg.supabaseUrl.replace(/\/$/,'')+path;const headers={'apikey':cfg.supabasePublishableKey};if(token)headers.Authorization='Bearer '+token;if(body!==undefined)headers['Content-Type']='application/json';if(path.includes('/rest/v1/'))headers.Prefer='return=representation';const r=await fetch(url,{method,headers,body:body===undefined?undefined:JSON.stringify(body)});const text=await r.text();let data;try{data=text?JSON.parse(text):null}catch{data=text}if(!r.ok)throw Error(data&&typeof data==='object'?(data.message||data.error_description||data.error||'Request failed'):'Request failed');return data}
$('report-form').addEventListener('submit',async event=>{event.preventDefault();const category=$('report-category').value,username=$('report-username').value.trim(),details=$('report-details').value.trim(),output=$('report-result');if(username.length<2||username.length>32||details.length<12){output.textContent='Please provide your username and at least 12 characters of detail.';return}const btn=$('submit-report');btn.disabled=true;output.textContent='';try{if(backend){const code=await api('/rest/v1/rpc/submit_report',{p_category:category,p_username:username,p_details:details});output.textContent='Report submitted. Save your private ticket code: '+String(code);$('report-form').reset()}else{const subject='CoolWips SMP '+category+' report - '+username;const body='Minecraft username: '+username+'\nCategory: '+category+'\n\nDetails:\n'+details;const mailto='mailto:'+encodeURIComponent(cfg.reportsEmail||'admin@coolwip.xyz')+'?subject='+encodeURIComponent(subject)+'&body='+encodeURIComponent(body);const link=el('a');link.href=mailto;document.body.appendChild(link);link.click();link.remove();output.textContent='Your email app should open a draft. You must send the email to submit your report.';}}catch(e){output.textContent='Could not submit the report: '+e.message}finally{btn.disabled=false}});
$('ticket-form').addEventListener('submit',async event=>{event.preventDefault();const output=$('ticket-result'),code=$('ticket-code').value.trim();if(!backend){output.textContent='Online ticket tracking requires the private ticket backend to be configured.';return}if(!/^[a-f0-9]{24}$/.test(code)){output.textContent='Enter the 24-character ticket code you received.';return}output.textContent='Checking…';try{const result=await api('/rest/v1/rpc/report_status',{p_code:code});output.textContent=Array.isArray(result)&&result[0]?'Status: '+result[0].status+' (submitted '+safeDate(result[0].submitted_at)+')':'No ticket found for that code.'}catch(e){output.textContent='Unable to check ticket: '+e.message}});
loadPublicFeeds();
})();
