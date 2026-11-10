/* CoolWips experience: progressive, reduced-motion-aware enhancements. */
(()=>{'use strict';
 const doc=document;
 const reduced=window.matchMedia('(prefers-reduced-motion: reduce)');
 const coarse=window.matchMedia('(pointer: coarse)');
 const nav=doc.querySelector('.nav-shell');
 const progress=doc.querySelector('.scroll-progress');
 const up=doc.querySelector('.back-to-top');
 let scrollFrame=0;
 const drawScroll=()=>{
   scrollFrame=0;
   const amount=Math.min(1,Math.max(0,scrollY/Math.max(1,doc.documentElement.scrollHeight-innerHeight)));
   if(progress)progress.style.width=(amount*100).toFixed(2)+'%';
   if(nav)nav.classList.toggle('is-scrolled',scrollY>18);
   if(up)up.classList.toggle('visible',scrollY>650);
 };
 const schedule=()=>{if(!scrollFrame)scrollFrame=requestAnimationFrame(drawScroll)};
 addEventListener('scroll',schedule,{passive:true});
 addEventListener('resize',schedule,{passive:true});
 drawScroll();
 if(up)up.addEventListener('click',()=>window.scrollTo({top:0,behavior:reduced.matches?'auto':'smooth'}));
 const items=[...doc.querySelectorAll('.section-head,.feature,.staff-card,.founder-card,.join-card,.rule-group,.faq details,.help-card,.help-alert,.console-ip-panel,.help-troubleshoot,.void-manifesto .wrap,.closing .wrap')];
 if(!reduced.matches&&'IntersectionObserver' in window){
   const observer=new IntersectionObserver((entries,obs)=>{
     for(const entry of entries){
       if(!entry.isIntersecting)continue;
       entry.target.classList.remove('reveal-pending');
       entry.target.classList.add('reveal-in');
       obs.unobserve(entry.target);
     }
   },{threshold:.06,rootMargin:'0px 0px -20px 0px'});
   items.forEach(el=>{if(el.getBoundingClientRect().top>innerHeight*.93){el.classList.add('reveal-pending');observer.observe(el)}});
   const ensureVisible=()=>{if(reduced.matches)items.forEach(el=>{observer.unobserve(el);el.classList.remove('reveal-pending');el.classList.add('reveal-in')})};
   reduced.addEventListener?.('change',ensureVisible);
 }
 if(!reduced.matches&&!coarse.matches){
   doc.querySelectorAll('.feature,.staff-card,.founder-card,.help-card').forEach(card=>{
     let frame=0,x=0,y=0;
     card.addEventListener('pointermove',e=>{
       x=e.clientX;y=e.clientY;
       if(!frame)frame=requestAnimationFrame(()=>{
         frame=0;const r=card.getBoundingClientRect();
         card.style.setProperty('--spot-x',((x-r.left)/r.width*100).toFixed(1)+'%');
         card.style.setProperty('--spot-y',((y-r.top)/r.height*100).toFixed(1)+'%');
       });
     },{passive:true});
     card.addEventListener('pointerleave',()=>{
       if(frame)cancelAnimationFrame(frame);
       frame=0;card.style.removeProperty('--spot-x');card.style.removeProperty('--spot-y');
     },{passive:true});
   });
   doc.querySelectorAll('.btn').forEach(button=>{
     button.addEventListener('pointerdown',e=>{
       const rect=button.getBoundingClientRect();
       const dot=doc.createElement('span');dot.className='ripple';
       dot.style.setProperty('--rx',(e.clientX-rect.left)+'px');
       dot.style.setProperty('--ry',(e.clientY-rect.top)+'px');
       button.appendChild(dot);
       dot.addEventListener('animationend',()=>dot.remove(),{once:true});
     });
   });
 }
 const navLinks=[...doc.querySelectorAll('#navLinks a[href^="#"]')];
 if('IntersectionObserver' in window){
   const tracked=navLinks.map(a=>doc.getElementById(a.hash.slice(1))).filter(Boolean);
   const observer=new IntersectionObserver(entries=>{
     const visible=entries.filter(e=>e.isIntersecting);
     if(!visible.length)return;
     visible.sort((a,b)=>b.intersectionRatio-a.intersectionRatio);
     const selected=visible[0].target.id;
     navLinks.forEach(a=>{
       const active=a.hash==='#'+selected;
       a.classList.toggle('is-active',active);
       if(active)a.setAttribute('aria-current','location');else a.removeAttribute('aria-current');
     });
   },{rootMargin:'-20% 0px -55% 0px',threshold:[0,.1,.4]});
   tracked.forEach(el=>observer.observe(el));
 }

})();