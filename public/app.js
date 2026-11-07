const $ = id => document.getElementById(id);
let backendOK = false;
let sentences = [];
let currentAudio = null;

function isCodeLike(line){
  const s = line.trim();
  if(!s) return true;
  if(s.length < 2) return true;
  const low = s.toLowerCase();
  if(low.includes('http') || low.includes('www.') || (s.includes('@') && low.includes('.com'))) return true;
  if(/^p[aá]gina\s+\d+\s+de\s+\d+/i.test(s)) return true;
  if(/^[\d\s\-\_\.\,\;\:]+$/.test(s)) return true;
  if(/^[\_\-\=\*\.]{3,}$/.test(s)) return true;
  const symbols = [...s].filter(c => '{}[]();=_\\|#<>$%^&*~`'.includes(c)).length;
  if(s.length>0 && symbols/s.length>0.25) return true;
  const letters = [...s].filter(c=>/[A-Za-zÁÉÍÓÚáéíóúü]/.test(c));
  if(letters.length>=8){
    const vowels = letters.filter(c=>'aeiouáéíóúüAEIOUÁÉÍÓÚÜ'.includes(c)).length;
    if(vowels/letters.length<0.18) return true;
  }
  if(/^(?:[A-Za-z]\s){3,}[A-Za-z]$/.test(s)) return true;
  return false;
}
function cleanText(raw){
  if(!raw) return '';
  raw = raw.replace(/(\w+)-\s*\n\s*(\w+)/g,'$1$2');
  const lines = raw.split('\n');
  const counts = {};
  lines.forEach(l=>{ const k=l.trim().toLowerCase(); if(k.length>10) counts[k]=(counts[k]||0)+1; });
  const kept=[];
  for(let line of lines){
    let s=line.trim();
    if(!s) continue;
    if(counts[s.toLowerCase()]>3 && s.length<120) continue;
    if(isCodeLike(s)) continue;
    s=s.replace(/https?:\/\/\S+|www\.\S+/g,'').replace(/\S+@\S+\.\w+/g,'').trim();
    if(s.length<3) continue;
    kept.push(s);
  }
  return kept.join(' ').replace(/\s+/g,' ').trim();
}
function splitSentences(text){
  if(!text) return [];
  const abbrev=['Dr.','Dra.','Sr.','Sra.','etc.','No.'];
  let prot=text;
  abbrev.forEach((a,i)=> prot=prot.split(a).join(`__AB${i}__`));
  const parts=prot.split(/(?<=[.!?])\s+(?=[A-ZÁÉÍÓÚÜ¿¡"])/);
  const out=[];
  for(let p of parts){
    abbrev.forEach((a,i)=> p=p.split(`__AB${i}__`).join(a));
    p=p.trim();
    if(p.length<25) continue;
    if(p.split(' ').length<4) continue;
    while(p.length>220){
      let cut=p.lastIndexOf(',',220);
      if(cut===-1) cut=p.lastIndexOf(' ',220);
      if(cut===-1) break;
      const chunk=p.slice(0,cut).trim();
      if(chunk.split(' ').length>=4) out.push(chunk);
      p=p.slice(cut+1).trim();
    }
    if(p && p.split(' ').length>=4) out.push(p);
  }
  return out;
}
async function checkBackend(){
  try{
    const r=await fetch('http://localhost:8000/api/health');
    if(r.ok){ backendOK=true; $('mode').textContent='✅ Modo Codespaces: Docling + Edge-TTS — voz neural real'; $('mode').style.background='#1a2f1a'; return; }
  }catch(e){}
  backendOK=false;
  $('mode').textContent='⚠️ Modo página sola: limpieza + voz del navegador. Para voz neural, abre Codespaces y corre el backend en puerto 8000.';
}
checkBackend();
$('btnExtract').onclick=async()=>{
  const f=$('file').files[0];
  if(!f){ $('status').textContent='Sube un PDF primero'; return; }
  $('status').textContent='Limpiando texto…';
  if(backendOK){
    const fd=new FormData(); fd.append('file',f);
    const r=await fetch('http://localhost:8000/api/extract',{method:'POST',body:fd});
    const data=await r.json();
    $('preview').value=data.cleaned;
    sentences=data.sentences;
    $('status').textContent=`Listo: ${sentences.length} oraciones limpias. Revisa el texto y dale Narrar.`;
    return;
  }
  // Fallback local con PDF.js
  const buf=await f.arrayBuffer();
  const pdf=await pdfjsLib.getDocument({data:buf}).promise;
  let raw='';
  for(let i=1;i<=pdf.numPages;i++){
    const page=await pdf.getPage(i);
    const tc=await page.getTextContent();
    raw+=tc.items.map(it=>it.str).join(' ')+'\n';
  }
  const cleaned=cleanText(raw);
  $('preview').value=cleaned;
  sentences=splitSentences(cleaned);
  $('status').textContent=`Listo local: ${sentences.length} oraciones limpias.`;
};
$('btnPlay').onclick=async()=>{
  const text=$('preview').value.trim();
  if(!text){ $('status').textContent='No hay texto limpio para narrar'; return; }
  const voice=$('voice').value;
  if(backendOK){
    $('status').textContent='Generando audio neural…';
    const fd=new FormData(); fd.append('text', text.slice(0,4000)); fd.append('voice', voice);
    const r=await fetch('http://localhost:8000/api/narrate',{method:'POST',body:fd});
    if(!r.ok){ $('status').textContent='Error en backend, revisa terminal'; return; }
    const blob=await r.blob();
    const url=URL.createObjectURL(blob);
    const a=$('audio'); a.src=url; a.style.display='block'; a.play();
    currentAudio=url;
    $('status').textContent='Sonando con voz neural Edge-TTS';
    return;
  }
  // Browser TTS fallback con texto ya limpio, por oraciones
  speechSynthesis.cancel();
  const sents=splitSentences(text);
  $('status').textContent=`Narrando ${sents.length} oraciones con voz del navegador…`;
  let i=0;
  const speakNext=()=>{
    if(i>=sents.length){ $('status').textContent='Terminado'; return; }
    const u=new SpeechSynthesisUtterance(sents[i]);
    const lang=voice.slice(0,5); u.lang=lang; u.rate=1;
    u.onend=()=>{ i++; speakNext(); };
    speechSynthesis.speak(u);
  };
  speakNext();
};
$('btnStop').onclick=()=>{ speechSynthesis.cancel(); const a=$('audio'); a.pause(); $('status').textContent='Detenido'; };
$('btnDownload').onclick=async()=>{
  if(currentAudio){ const a=document.createElement('a'); a.href=currentAudio; a.download='narr4r.mp3'; a.click(); return; }
  $('status').textContent='Primero dale Narrar en modo Codespaces para generar MP3';
};
