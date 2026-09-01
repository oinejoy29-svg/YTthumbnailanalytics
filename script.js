const START_DATE = "2026-04-03";
const MEMBERS = [
  "逢田珠里依","天野香乃愛","市原愛弓","江角怜音","大信田美月","大西葵",
  "小澤愛実","髙橋舞","藤沢莉子","村山結香","山田杏佳","山野愛月"
];

let DATA = {subscribers:[], videos:[], updatedAt:null, memo:""};
let subsChart, newSubsChart;
let rangeDays = 30;
let rangeOffset = 0;

const $ = id => document.getElementById(id);
const fmt = n => Number(n ?? 0).toLocaleString("ja-JP");
const dateObj = s => new Date(`${s}T00:00:00+09:00`);
const ymd = d => {
  const y=d.getFullYear(),m=String(d.getMonth()+1).padStart(2,"0"),day=String(d.getDate()).padStart(2,"0");
  return `${y}-${m}-${day}`;
};
const jpDate = s => s ? s.replaceAll("-","/") : "—";

function daysSinceStart(){
  const a=dateObj(START_DATE), b=new Date();
  const todayJST = new Date(b.toLocaleString("en-US",{timeZone:"Asia/Tokyo"}));
  return Math.max(0,Math.floor((todayJST-a)/86400000)+1);
}
function todayJST(){
  return new Intl.DateTimeFormat("en-CA",{timeZone:"Asia/Tokyo",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date());
}
function updateHeader(){
  const t=todayJST();
  $("periodText").textContent=`${jpDate(START_DATE)} 〜 ${t.replaceAll("-","/")}`;
  $("dayCount").textContent=`（${daysSinceStart()}日）`;
  if(DATA.updatedAt){
    $("updatedAt").textContent=new Intl.DateTimeFormat("ja-JP",{timeZone:"Asia/Tokyo",dateStyle:"short",timeStyle:"short"}).format(new Date(DATA.updatedAt));
  }
}
function detectTags(video){
  return MEMBERS.filter(m => `${video.title||""} ${video.description||""}`.includes(m));
}
function normalizeVideos(){
  DATA.videos=(DATA.videos||[]).map(v=>({...v,tags:v.tags?.length?v.tags:detectTags(v)}));
}
function latestRecord(){
  const a=[...(DATA.subscribers||[])].sort((x,y)=>x.date.localeCompare(y.date));
  return a[a.length-1];
}
function previousRecord(date){
  const a=[...(DATA.subscribers||[])].filter(x=>x.date<date).sort((x,y)=>y.date.localeCompare(x.date));
  return a[0];
}
function renderSummary(){
  const latest=latestRecord();
  const current=DATA.currentSubscriberCount ?? latest?.count ?? 0;
  $("currentSubs").textContent=`${fmt(current)}人`;
  if(latest){
    const prev=previousRecord(latest.date);
    const diff=prev ? latest.count-prev.count : 0;
    $("latestNew").textContent=`${diff>=0?"+":""}${fmt(diff)}人`;
    $("latestDate").textContent=`最新日：${jpDate(latest.date)}`;
  }
  const diffs=[];
  const sorted=[...(DATA.subscribers||[])].sort((a,b)=>a.date.localeCompare(b.date));
  for(let i=1;i<sorted.length;i++) diffs.push(sorted[i].count-sorted[i-1].count);
  $("avgNew").textContent=diffs.length?(diffs.reduce((a,b)=>a+b,0)/diffs.length).toFixed(1):"0.0";
  $("videoCount").textContent=`${fmt(DATA.videos.length)}本`;
}
function buildRolling(){
  const videos=[...DATA.videos];
  if(!videos.length) return;
  const shuffled=videos.sort(()=>Math.random()-.5);
  const lanes=[[],[],[]];
  // A thumbnail is assigned to one lane only, so the three visible streams do not share the same item.
  shuffled.forEach((v,i)=>lanes[i%3].push(v));
  lanes.forEach((arr,i)=>{
    const twice=[...arr,...arr];
    $(`lane${i}`).innerHTML=twice.map(v=>`<img class="thumb-roll" src="${v.thumbnail}" alt="" loading="lazy">`).join("");
  });
}
function renderTags(){
  $("tagSelect").innerHTML='<option value="">すべてのメンバー</option>'+MEMBERS.map(m=>`<option>${m}</option>`).join("");
}
function durationNum(v){return Number(v.durationSeconds||0)}
function renderVideos(){
  const sort=$("sortSelect").value, tag=$("tagSelect").value;
  let list=DATA.videos.filter(v=>!tag || (v.tags||detectTags(v)).includes(tag));
  list.sort((a,b)=>{
    if(sort==="popular") return Number(b.viewCount||0)-Number(a.viewCount||0);
    if(sort==="newest") return String(b.date).localeCompare(String(a.date));
    if(sort==="oldest") return String(a.date).localeCompare(String(b.date));
    if(sort==="longest") return durationNum(b)-durationNum(a);
    return durationNum(a)-durationNum(b);
  });
  $("videoGrid").innerHTML=list.map(v=>`
    <article class="video-card">
      <img src="${v.thumbnail}" alt="" loading="lazy">
      <div class="video-info">
        <div class="video-title">${escapeHtml(v.title||"")}</div>
        <div class="video-meta">${fmt(v.viewCount)}回　・　${jpDate(v.date)}　・　${v.duration||""}</div>
        <div class="tags">${(v.tags||detectTags(v)).map(t=>`<span class="tag">${escapeHtml(t)}</span>`).join("")}</div>
      </div>
    </article>`).join("");
}
function escapeHtml(s){return String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}

function getChartRows(){
  const rows=[...(DATA.subscribers||[])].sort((a,b)=>a.date.localeCompare(b.date));
  if(rangeDays==="all") return rows;
  const latest=rows[rows.length-1]?.date || START_DATE;
  const end=new Date(`${latest}T00:00:00+09:00`);
  end.setDate(end.getDate()+rangeOffset*Number(rangeDays));
  const start=new Date(end); start.setDate(start.getDate()-Number(rangeDays)+1);
  return rows.filter(r=>dateObj(r.date)>=start && dateObj(r.date)<=end);
}
function chartVideoTitles(date){
  return DATA.videos.filter(v=>v.date===date).map(v=>v.title);
}
function renderCharts(){
  const rows=getChartRows();
  if(!rows.length)return;
  const all=[...(DATA.subscribers||[])].sort((a,b)=>a.date.localeCompare(b.date));
  const fixedMin=Math.floor(Math.min(...all.map(r=>r.count))/10)*10;
  const fixedMax=Math.ceil(Math.max(...all.map(r=>r.count))/10)*10+10;
  const labels=rows.map(r=>jpDate(r.date));
  const pointColors=rows.map(r=>chartVideoTitles(r.date).length?"#FF3030":"#FFF36A");
  const borderColors=rows.map(r=>chartVideoTitles(r.date).length?"#FF3030":"#111");
  const common={responsive:true,maintainAspectRatio:false,interaction:{mode:"index",intersect:false},plugins:{legend:{display:false},tooltip:{
    callbacks:{label:(ctx)=>{
      const r=rows[ctx.dataIndex], titles=chartVideoTitles(r.date);
      let text=` 登録者数：${fmt(r.count)}人`;
      if(titles.length) text+=`\n🎬 ${titles.join("\n🎬 ")}`;
      return text;
    }}
  }},scales:{x:{ticks:{maxRotation:0,autoSkip:true,maxTicksLimit:10},grid:{display:false}},y:{min:fixedMin,max:fixedMax,ticks:{callback:v=>fmt(v)}}}};
  if(subsChart)subsChart.destroy();
  subsChart=new Chart($("subsChart"),{type:"line",data:{labels,datasets:[{data:rows.map(r=>r.count),borderColor:"#111",backgroundColor:"#111",pointBackgroundColor:pointColors,pointBorderColor:borderColors,pointRadius:5,pointHoverRadius:7,tension:.28,borderWidth:2}]},options:common});
  if(newSubsChart)newSubsChart.destroy();
  const newVals=rows.map(r=>{const p=previousRecord(r.date);return p?r.count-p.count:0});
  newSubsChart=new Chart($("newSubsChart"),{type:"bar",data:{labels,datasets:[{data:newVals,backgroundColor:rows.map(r=>chartVideoTitles(r.date).length?"#FF3030":"#FFF36A"),borderColor:"#111",borderWidth:1}]},options:{...common,plugins:{...common.plugins,tooltip:{callbacks:{label:(ctx)=>` 新規登録者数：${ctx.raw>=0?"+":""}${fmt(ctx.raw)}人`}}}}});
  const first=rows[0].date,last=rows[rows.length-1].date;
  $("rangeLabel").textContent=`${jpDate(first)} – ${jpDate(last)}`;
}
function renderMemo(){
  const stored=localStorage.getItem("joyMemo");
  $("memoText").value=stored ?? DATA.memo ?? "";
  $("memoText").disabled=true;
}
function setMemoEdit(on){
  $("memoText").disabled=!on;
  $("memoEdit").style.display=on?"none":"inline-block";
  $("memoSave").style.display=on?"inline-block":"none";
  $("memoCancel").style.display=on?"inline-block":"none";
  if(on)$("memoText").focus();
}
function openCollage(){
  $("collageModal").classList.add("open");
  $("collageModal").setAttribute("aria-hidden","false");
  buildCollagePages();
}
function closeCollage(){
  $("collageModal").classList.remove("open");
  $("collageModal").setAttribute("aria-hidden","true");
}
function buildCollagePages(){
  const pages=Math.max(1,Math.ceil(DATA.videos.length/100));
  $("collagePages").innerHTML=Array.from({length:pages},(_,i)=>`<button class="page-btn ${i===0?"active":""}" data-page="${i}">${i*100+1}〜${Math.min((i+1)*100,DATA.videos.length)}</button>`).join("");
  document.querySelectorAll(".page-btn").forEach(b=>b.onclick=()=>renderCollage(Number(b.dataset.page)));
  renderCollage(0);
}
function renderCollage(page){
  document.querySelectorAll(".page-btn").forEach(b=>b.classList.toggle("active",Number(b.dataset.page)===page));
  const list=DATA.videos.slice().sort((a,b)=>String(a.date).localeCompare(String(b.date))).slice(page*100,page*100+100);
  $("collageGrid").innerHTML=Array.from({length:100},(_,i)=>list[i]?`<img src="${list[i].thumbnail}" alt="" crossorigin="anonymous">`:"<div style='aspect-ratio:16/9;background:#fff'></div>").join("");
  $("downloadCollage").dataset.page=page;
}
async function downloadCollage(){
  const page=Number($("downloadCollage").dataset.page||0);
  const list=DATA.videos.slice().sort((a,b)=>String(a.date).localeCompare(String(b.date))).slice(page*100,page*100+100);
  const cellW=320,cellH=180,canvas=document.createElement("canvas");
  canvas.width=cellW*10;canvas.height=cellH*10;
  const ctx=canvas.getContext("2d");ctx.fillStyle="#fff";ctx.fillRect(0,0,canvas.width,canvas.height);
  for(let i=0;i<list.length;i++){
    try{
      const img=await loadImage(list[i].thumbnail);
      ctx.drawImage(img,(i%10)*cellW,Math.floor(i/10)*cellH,cellW,cellH);
    }catch(e){ console.warn("thumbnail skipped",list[i].thumbnail); }
  }
  canvas.toBlob(blob=>{
    if(!blob)return;
    const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=`thumbnail-collection-${page*100+1}-${Math.min(page*100+100,DATA.videos.length)}.png`;a.click();URL.revokeObjectURL(a.href);
  },"image/png");
}
function loadImage(src){
  return new Promise((resolve,reject)=>{const img=new Image();img.crossOrigin="anonymous";img.onload=()=>resolve(img);img.onerror=reject;img.src=src});
}
function setupRange(){
  document.querySelectorAll(".preset-group button").forEach(b=>b.onclick=()=>{
    const v=b.dataset.range;rangeDays=v==="all"?"all":Number(v);rangeOffset=0;
    document.querySelectorAll(".preset-group button").forEach(x=>x.classList.toggle("selected",x===b));
    renderCharts();
  });
  $("prevRange").onclick=()=>{if(rangeDays!=="all"){rangeOffset--;renderCharts()}};
  $("nextRange").onclick=()=>{if(rangeDays!=="all"&&rangeOffset<0){rangeOffset++;renderCharts()}};
}
function setupNav(){
  document.querySelectorAll(".switch-btn").forEach(b=>b.onclick=()=>{
    document.querySelectorAll(".switch-btn").forEach(x=>x.classList.toggle("active",x===b));
    document.querySelectorAll(".page").forEach(p=>p.classList.remove("active"));
    $(`${b.dataset.page==="videos"?"videos":"analytics"}Page`).classList.add("active");
    if(b.dataset.page==="analytics")renderCharts();
  });
}
async function init(){
  try{
    const r=await fetch("data.json?ts="+Date.now(),{cache:"no-store"});
    DATA=await r.json();
  }catch(e){console.error(e);return}
  normalizeVideos();updateHeader();renderSummary();renderTags();renderVideos();buildRolling();renderMemo();setupRange();setupNav();
  $("sortSelect").onchange=renderVideos;$("tagSelect").onchange=renderVideos;
  $("memoEdit").onclick=()=>setMemoEdit(true);
  $("memoCancel").onclick=()=>{renderMemo();setMemoEdit(false)};
  $("memoSave").onclick=()=>{localStorage.setItem("joyMemo",$("memoText").value);$("memoStatus").textContent="この端末に保存しました";setMemoEdit(false)};
  $("openCollage").onclick=openCollage;$("closeCollage").onclick=closeCollage;$("downloadCollage").onclick=downloadCollage;
  $("collageModal").onclick=e=>{if(e.target.id==="collageModal")closeCollage()};
}
init();
