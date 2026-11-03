// Local synthesis only. Focus changes from refresh/startup never produce a tone.
(()=>{let context,armedAt=-Infinity,lastAt=0,lastFocus='';
 const enabled=()=>typeof state!=='undefined'&&state?.settings?.uiSounds!==false;
 function audio(){if(!context)context=new AudioContext();if(context.state==='suspended')context.resume().catch(()=>{});return context;}
 function play(kind){if(!enabled()||!document.hasFocus())return;const now=performance.now();if(now-lastAt<55)return;try{const ctx=audio();if(ctx.state!=='running')return;lastAt=now;const o=ctx.createOscillator(),gain=ctx.createGain(),t=ctx.currentTime;o.type='sine';o.frequency.setValueAtTime(kind==='confirm'?660:kind==='back'?390:490,t);o.frequency.exponentialRampToValueAtTime(kind==='confirm'?880:kind==='back'?260:570,t+.065);gain.gain.setValueAtTime(0,t);gain.gain.linearRampToValueAtTime(.035,t+.008);gain.gain.exponentialRampToValueAtTime(.0001,t+.085);o.connect(gain);gain.connect(ctx.destination);o.start(t);o.stop(t+.09);o.onended=()=>{o.disconnect();gain.disconnect();};}catch{}}
 function arm(){armedAt=performance.now();}
 window.novaSounds={arm,play};
 document.addEventListener('keydown',e=>{if(e.isTrusted){arm();if(e.key==='Enter')play('confirm');}},true);
 document.addEventListener('pointerdown',e=>{if(e.isTrusted){arm();try{audio();}catch{}}},true);
 document.addEventListener('click',e=>{if(e.isTrusted&&e.target.closest('button'))play('confirm');},true);
 document.addEventListener('focusin',e=>{const el=e.target,key=[el.id,...Object.entries(el.dataset||{}).flat()].join(':')||el.getAttribute('aria-label')||el.textContent?.slice(0,80);if(performance.now()-armedAt<350&&key!==lastFocus)play('navigate');lastFocus=key;});
})();
