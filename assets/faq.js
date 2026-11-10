/* Private, local-only FAQ search. No requests or analytics. */
(() => {
 'use strict';
 const input=document.getElementById('faq-search-input');
 const status=document.getElementById('faq-results');
 const empty=document.getElementById('faq-empty');
 if(!input||!status||!empty)return;
 const groups=Array.from(document.querySelectorAll('.faq-group'));
 const items=groups.flatMap(g=>Array.from(g.querySelectorAll('.faq-question')));
 const normal=text=>text.toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g,'');
 const apply=()=>{
   const q=normal(input.value.trim());
   let matches=0;
   for(const group of groups){
     let visible=0;
     for(const item of group.querySelectorAll('.faq-question')){
       const show=!q||normal(item.textContent).includes(q);
       item.hidden=!show;
       if(show){matches++;visible++;item.classList.remove('reveal-pending');item.classList.add('reveal-in');}
     }
     group.hidden=visible===0;
   }
   empty.hidden=matches!==0;
   status.textContent=q?(matches+' matching '+(matches===1?'question':'questions')):('Showing all '+items.length+' questions');
 };
 input.addEventListener('input',apply);
 apply();
})();
