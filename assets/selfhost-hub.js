/* Public player report intake for the private CoolWips staff backend. No credentials are stored here. */
(()=>{'use strict';
const base=(window.COOLWIPS_HUB||{}).selfHostedApi;
if(!base)return;
if(base!=='https://staff.coolwip.xyz')throw Error('Unapproved report backend origin');
const $=id=>document.getElementById(id);
async function post(path,body){
 const r=await fetch(base+'/v1/'+path,{method:'POST',credentials:'omit',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
 const data=await r.json().catch(()=>({}));
 if(!r.ok)throw Error(data.error||'Request failed');
 return data;
}
function replace(id){const old=$(id),fresh=old.cloneNode(true);old.replaceWith(fresh);return fresh}
replace('report-form').onsubmit=async e=>{
 e.preventDefault();const button=$('submit-report');button.disabled=true;
 try{const result=await post('reports',{category:$('report-category').value,username:$('report-username').value.trim(),details:$('report-details').value.trim()});$('report-result').textContent='Report submitted. Keep this private ticket code: '+result.code;e.target.reset()}
 catch(err){$('report-result').textContent='Unable to submit: '+err.message}
 finally{button.disabled=false}
};
replace('ticket-form').onsubmit=async e=>{
 e.preventDefault();
 try{const result=await post('report-status',{code:$('ticket-code').value.trim()});$('ticket-result').textContent='Status: '+result.status}
 catch(err){$('ticket-result').textContent=err.message}
};
$('ticket-code').maxLength=48;
$('report-mode').textContent='Reports are saved privately to the staff Control Room.';
const panel=$('staff-login-panel');
if(panel){panel.replaceChildren();const link=document.createElement('a');link.href=base+'/staff';link.textContent='Open the CoolWips Staff Desk →';panel.append(link)}
})();
