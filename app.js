const $=(s)=>document.querySelector(s);
const $$=(s)=>[...document.querySelectorAll(s)];
const KRW=new Intl.NumberFormat("ko-KR",{style:"currency",currency:"KRW",maximumFractionDigits:0});
const AUTH_USER=window.SOLAR_BIZ_USER||{id:"anonymous",email:""};
const STORAGE_PREFIX=`solerbiz.${AUTH_USER.id}`;
const storageKey=(name)=>`${STORAGE_PREFIX}.${name}`;
const FIRESTORE_READY=Boolean(
  !AUTH_USER.isLocalPreview &&
  window.firebase &&
  firebase.apps?.length &&
  typeof firebase.firestore==="function"
);
const CLOUD_BUSINESS_ID=AUTH_USER.id;
let cloudSaveTimer=null;
let cloudHydrated=false;

function setSyncStatus(text,state=""){
  const el=$("#syncStatus");
  if(!el)return;
  el.textContent=text;
  el.dataset.state=state;
}

const demoProfile={
  businessName:"나인웍스",
  ownerName:"박재영",
  businessType:"개인사업자",
  taxType:"일반과세자",
  industry:"디자인 서비스업",
  startDate:"2023-01-01",
  hasEmployee:true,
  hasFreelancer:true,
  hasDailyWorker:false,
  salesChannel:"둘 다"
};
const demoTransactions=[
  {id:1,type:"매출",title:"브랜드 디자인 프로젝트",client:"건강미",amount:1800000,supplyAmount:1636364,vatAmount:163636,taxable:true,date:"2026-09-16"},
  {id:2,type:"매출",title:"웹사이트 제작 계약금",client:"MYV",amount:2500000,supplyAmount:2272727,vatAmount:227273,taxable:true,date:"2026-09-12"},
  {id:3,type:"매입",title:"외주 개발비",client:"협력업체",amount:770000,supplyAmount:700000,vatAmount:70000,taxable:true,date:"2026-09-11"},
  {id:4,type:"매입",title:"Adobe 구독료",client:"Adobe",amount:79000,supplyAmount:79000,vatAmount:0,taxable:false,date:"2026-09-07"},
  {id:5,type:"매출",title:"패키지 디자인",client:"CLRX",amount:1500000,supplyAmount:1363636,vatAmount:136364,taxable:true,date:"2026-09-05"}
];
const demoClients=[
  {name:"건강미",category:"브랜딩 · 운영",status:"진행중",receivable:1800000},
  {name:"MYV",category:"웹사이트 · 콘텐츠",status:"진행중",receivable:0},
  {name:"CLRX",category:"패키지 디자인",status:"검토중",receivable:750000},
  {name:"정월재",category:"브랜드 운영",status:"진행중",receivable:0}
];
const demoProjects=[
  {id:1,name:"건강미 운영",client:"건강미",amount:3500000,status:"진행중",dueDate:"2026-12-31"},
  {id:2,name:"MYV 웹사이트",client:"MYV",amount:5000000,status:"진행중",dueDate:"2026-10-31"},
  {id:3,name:"CLRX 패키지",client:"CLRX",amount:1500000,status:"검토중",dueDate:"2026-09-30"}
];

let state={
  profile:JSON.parse(localStorage.getItem(storageKey("profile"))||"null"),
  transactions:JSON.parse(localStorage.getItem(storageKey("transactions"))||"[]"),
  clients:JSON.parse(localStorage.getItem(storageKey("clients"))||"[]"),
  projects:JSON.parse(localStorage.getItem(storageKey("projects"))||"[]"),
  taxInvoices:JSON.parse(localStorage.getItem(storageKey("taxInvoices"))||"[]"),
  tasks:JSON.parse(localStorage.getItem(storageKey("tasks"))||"null")||[
    {id:1,text:"이번 달 매출 누락 여부 확인",done:false},
    {id:2,text:"3.3% 지급내역 정리",done:false},
    {id:3,text:"미수금 입금일 확인",done:true}
  ]
};

function save(){
  localStorage.setItem(storageKey("profile"),JSON.stringify(state.profile));
  localStorage.setItem(storageKey("transactions"),JSON.stringify(state.transactions));
  localStorage.setItem(storageKey("clients"),JSON.stringify(state.clients));
  localStorage.setItem(storageKey("projects"),JSON.stringify(state.projects));
  localStorage.setItem(storageKey("taxInvoices"),JSON.stringify(state.taxInvoices));
  localStorage.setItem(storageKey("tasks"),JSON.stringify(state.tasks));
  scheduleCloudSave();
}
function scheduleCloudSave(){
  if(!FIRESTORE_READY||!cloudHydrated)return;
  clearTimeout(cloudSaveTimer);
  setSyncStatus("저장 중…","saving");
  cloudSaveTimer=setTimeout(()=>persistCloudState(),450);
}
async function persistCloudState(){
  if(!FIRESTORE_READY)return;
  try{
    const db=firebase.firestore();
    const now=firebase.firestore.FieldValue.serverTimestamp();
    const businessRef=db.collection("businesses").doc(CLOUD_BUSINESS_ID);
    await businessRef.set({
      ownerUid:AUTH_USER.id,
      name:state.profile?.businessName||"",
      taxType:state.profile?.taxType||"",
      businessType:state.profile?.businessType||"",
      updatedAt:now
    },{merge:true});
    await businessRef.collection("app").doc("state").set({
      profile:state.profile||null,
      transactions:state.transactions,
      clients:state.clients,
      projects:state.projects,
      taxInvoices:state.taxInvoices,
      tasks:state.tasks,
      updatedAt:now
    },{merge:true});
    await db.collection("users").doc(AUTH_USER.id).set({
      email:AUTH_USER.email||"",
      lastActiveAt:now
    },{merge:true});
    setSyncStatus("동기화됨","ok");
  }catch(err){
    console.error("Firestore save failed",err);
    setSyncStatus("동기화 확인 필요","error");
  }
}
async function hydrateCloudState(){
  if(!FIRESTORE_READY){
    cloudHydrated=true;
    setSyncStatus("이 기기에 저장","local");
    return;
  }
  setSyncStatus("불러오는 중…","saving");
  try{
    const db=firebase.firestore();
    const businessRef=db.collection("businesses").doc(CLOUD_BUSINESS_ID);
    const businessSnap=await businessRef.get();
    const stateSnap=await businessRef.collection("app").doc("state").get();

    if(stateSnap.exists){
      const remote=stateSnap.data()||{};
      state.profile=remote.profile??state.profile;
      state.transactions=Array.isArray(remote.transactions)?remote.transactions:state.transactions;
      state.clients=Array.isArray(remote.clients)?remote.clients:state.clients;
      state.projects=Array.isArray(remote.projects)?remote.projects:state.projects;
      state.taxInvoices=Array.isArray(remote.taxInvoices)?remote.taxInvoices:state.taxInvoices;
      state.tasks=Array.isArray(remote.tasks)?remote.tasks:state.tasks;
      localStorage.setItem(storageKey("profile"),JSON.stringify(state.profile));
      localStorage.setItem(storageKey("transactions"),JSON.stringify(state.transactions));
      localStorage.setItem(storageKey("clients"),JSON.stringify(state.clients));
      localStorage.setItem(storageKey("projects"),JSON.stringify(state.projects));
      localStorage.setItem(storageKey("taxInvoices"),JSON.stringify(state.taxInvoices));
      localStorage.setItem(storageKey("tasks"),JSON.stringify(state.tasks));
    }else{
      await businessRef.set({
        ownerUid:AUTH_USER.id,
        name:state.profile?.businessName||"",
        taxType:state.profile?.taxType||"",
        businessType:state.profile?.businessType||"",
        createdAt:firebase.firestore.FieldValue.serverTimestamp()
      },{merge:true});
    }
    cloudHydrated=true;
    setSyncStatus("동기화됨","ok");
    if(!stateSnap.exists&&(state.profile||state.transactions.length||state.clients.length||state.projects.length||state.taxInvoices.length)){
      await persistCloudState();
    }
  }catch(err){
    console.error("Firestore load failed",err);
    cloudHydrated=true;
    setSyncStatus("로컬 저장 중","error");
  }
}
function esc(v=""){return String(v).replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]))}
function won(v){return KRW.format(Number(v||0))}
function pad2(v){return String(v).padStart(2,"0")}
function localDateInputValue(d=new Date()){return `${d.getFullYear()}-${pad2(d.getMonth()+1)}-${pad2(d.getDate())}`}
function currentMonthKey(){
  const d=new Date();
  return `${d.getFullYear()}-${pad2(d.getMonth()+1)}`;
}
function monthShort(dateStr){
  const m=Number(String(dateStr).slice(5,7));
  return ["JAN","FEB","MAR","APR","MAY","JUN","JUL","AUG","SEP","OCT","NOV","DEC"][m-1]||"";
}
function transactionAmounts(t){
  const total=Math.max(0,Number(t.amount||0));
  if(Number.isFinite(Number(t.supplyAmount))&&Number.isFinite(Number(t.vatAmount))){
    return {total,supply:Number(t.supplyAmount||0),vat:Number(t.vatAmount||0)};
  }
  return {total,supply:total,vat:0};
}
function getMonthData(){
  const month=currentMonthKey();
  const list=state.transactions.filter(x=>String(x.date||"").startsWith(month));
  const salesList=list.filter(x=>x.type==="매출");
  const costList=list.filter(x=>x.type==="매입");
  const sales=salesList.reduce((a,b)=>a+transactionAmounts(b).total,0);
  const costs=costList.reduce((a,b)=>a+transactionAmounts(b).total,0);
  const salesVat=salesList.reduce((a,b)=>a+transactionAmounts(b).vat,0);
  const purchaseVat=costList.reduce((a,b)=>a+transactionAmounts(b).vat,0);
  const estimatedVat=Math.max(0,salesVat-purchaseVat);
  const [year,monthNo]=month.split("-").map(Number);
  return {sales,costs,profit:sales-costs,salesVat,purchaseVat,estimatedVat,list,year,monthNo,label:`${monthNo}월`};
}
function updateIdentity(){
  if(!state.profile)return;
  $("#miniName").textContent=state.profile.businessName;
  $("#miniType").textContent=`${state.profile.businessType} · ${state.profile.taxType}`;
  $("#avatar").textContent=(state.profile.ownerName||"P").slice(0,1);
}
function currentDate(){
  const d=new Date();
  return new Intl.DateTimeFormat("ko-KR",{year:"numeric",month:"long",day:"numeric",weekday:"short"}).format(d);
}
$("#todayLabel").textContent=currentDate();

function dateOnly(y,m,d){return new Date(y,m-1,d,12,0,0)}
function nextFixedDate(month,day){
  const now=new Date();
  let y=now.getFullYear();
  let d=dateOnly(y,month,day);
  if(d < dateOnly(now.getFullYear(),now.getMonth()+1,now.getDate())) d=dateOnly(y+1,month,day);
  return d;
}
function nextMonthlyDay(day){
  const now=new Date();
  let d=dateOnly(now.getFullYear(),now.getMonth()+1,day);
  if(d < dateOnly(now.getFullYear(),now.getMonth()+1,now.getDate())) d=dateOnly(now.getFullYear(),now.getMonth()+2,day);
  return d;
}
function monthEndAfterNow(){
  const now=new Date();
  return dateOnly(now.getFullYear(),now.getMonth()+2,0);
}
function daysUntil(d){
  const now=new Date();
  const a=dateOnly(now.getFullYear(),now.getMonth()+1,now.getDate());
  return Math.max(0,Math.ceil((d-a)/86400000));
}
function deadlineItem(key,date,title,desc){
  const left=daysUntil(date);
  return {
    key,
    date,
    display:`${pad2(date.getMonth()+1)}.${pad2(date.getDate())}`,
    day:pad2(date.getDate()),
    month:["JAN","FEB","MAR","APR","MAY","JUN","JUL","AUG","SEP","OCT","NOV","DEC"][date.getMonth()],
    title,
    desc,
    tag:left===0?"오늘":`D-${left}`
  };
}
function deadlines(){
  const p=state.profile||{};
  const items=[];
  if(p.hasEmployee||p.hasFreelancer){
    items.push(deadlineItem("withholding",nextMonthlyDay(10),"원천세 · 지방소득세","급여 또는 3.3% 지급 내역을 기준으로 확인"));
  }
  if(p.hasFreelancer){
    items.push(deadlineItem("freelancer-report",monthEndAfterNow(),"3.3% 지급명세 자료","사업소득 간이지급명세서 제출 일정 확인"));
  }
  if(p.hasEmployee){
    items.push(deadlineItem("social-insurance",nextMonthlyDay(10),"4대보험료 확인","직원 보험료 고지·납부 상태 확인"));
  }
  if(p.hasDailyWorker){
    items.push(deadlineItem("daily-worker-report",monthEndAfterNow(),"일용근로소득 지급자료","일용직 지급내역과 제출 대상 자료를 확인"));
  }
  if(p.taxType==="면세사업자"){
    items.push(deadlineItem("business-status",nextFixedDate(2,10),"사업장현황신고","면세사업자 신고자료 준비"));
  }else if(p.taxType==="간이과세자"){
    items.push(deadlineItem("vat",nextFixedDate(1,25),"부가가치세 신고","간이과세자 연간 신고 일정 확인"));
  }else{
    const candidates=[
      {date:nextFixedDate(1,25),title:"부가가치세 확정신고",desc:"일반과세자 확정신고 일정 확인"},
      {date:nextFixedDate(4,25),title:"부가가치세 중간 확인",desc:"예정고지·예정신고 대상 여부 확인"},
      {date:nextFixedDate(7,25),title:"부가가치세 확정신고",desc:"일반과세자 확정신고 일정 확인"},
      {date:nextFixedDate(10,25),title:"부가가치세 중간 확인",desc:"예정고지·예정신고 대상 여부 확인"}
    ].sort((a,b)=>a.date-b.date);
    const nextVat=candidates[0];
    items.push(deadlineItem("vat",nextVat.date,nextVat.title,nextVat.desc));
  }
  if(p.businessType==="개인사업자"){
    items.push(deadlineItem("income-tax",nextFixedDate(5,31),"종합소득세 · 개인지방소득세","전년도 소득과 필요경비 자료를 기준으로 준비"));
  }
  return items.sort((a,b)=>a.date-b.date).slice(0,6);
}
function businessGuidance(){
  const p=state.profile||{};
  const m=getMonthData();
  const receivable=state.clients.reduce((a,b)=>a+Number(b.receivable||0),0);
  const items=[];
  if(p.taxType==="일반과세자"){
    items.push({title:"부가세 기록",desc:`이번 달 매출 VAT ${won(m.salesVat)} · 매입 VAT ${won(m.purchaseVat)} · 현재 예상 ${won(m.estimatedVat)}`,go:"finance"});
  }
  if(p.hasFreelancer){
    items.push({title:"3.3% 인력",desc:"외주 지급이 있었다면 원천세와 사업소득 지급자료 일정을 확인하세요.",go:"tax"});
  }
  if(p.hasEmployee){
    items.push({title:"직원 · 4대보험",desc:"급여일, 원천세, 지방소득세와 4대보험 고지 상태를 매월 확인하세요.",go:"people"});
  }
  if(p.hasDailyWorker){
    items.push({title:"일용직",desc:"일용직 지급내역을 기록하고 관련 지급자료 제출 일정을 확인하세요.",go:"people"});
  }
  if(receivable>0){
    items.push({title:"미수금",desc:`${won(receivable)}의 미수금이 있습니다. 입금 예정과 거래처 상태를 확인하세요.`,go:"clients"});
  }
  if(!items.length){
    items.push({title:"사업 설정 확인",desc:"과세유형과 인력 사용 여부를 설정하면 필요한 업무를 자동으로 안내합니다.",go:"settings"});
  }
  return items.slice(0,5);
}
const taxGuideContent={
  vat:{
    title:"부가가치세",
    why:"등록한 매출·매입의 부가세를 모아 신고 준비 상태를 확인합니다.",
    prepare:["매출 세금계산서·카드·현금영수증","매입 세금계산서·카드·현금영수증","누락된 매출·비용 여부"],
    steps:["Solarbiz.에서 매출 VAT와 매입 VAT 확인","증빙 누락 거래 확인","홈택스에서 해당 과세기간 신고 메뉴 진행","신고 후 실제 납부세액과 완료 상태 기록"]
  },
  withholding:{
    title:"원천세 · 지방소득세",
    why:"직원 급여나 3.3% 인력 지급이 있으면 사업자가 원천징수한 세금을 정리해야 합니다.",
    prepare:["지급 대상자 정보","지급일과 지급총액","원천징수액","급여 또는 사업소득 구분"],
    steps:["이번 달 지급내역 확인","원천징수액 확인","홈택스 원천세 신고 진행","지방소득세 처리 후 신고·납부 완료 기록"]
  },
  freelancer:{
    title:"3.3% 지급자료",
    why:"3.3% 사업소득 지급내역을 월별로 정리해 필요한 지급자료 제출을 준비합니다.",
    prepare:["이름·식별정보","지급일","지급총액","소득세·지방소득세"],
    steps:["외주자별 지급내역 확인","누락 지급건 확인","제출 대상 자료 확인","제출 완료 처리"]
  },
  insurance:{
    title:"4대보험",
    why:"직원이 있는 사업자는 취득·상실과 월 보험료 상태를 계속 확인해야 합니다.",
    prepare:["직원 입·퇴사일","월 보수액","가입 상태","보험료 고지내역"],
    steps:["직원 변동 여부 확인","취득·상실 누락 확인","월 보험료 고지 확인","급여 공제내역과 함께 기록"]
  },
  income:{
    title:"종합소득세 · 개인지방소득세",
    why:"연간 사업소득과 필요경비를 정리해 5월 신고 준비 상태를 관리합니다.",
    prepare:["연간 매출","필요경비·증빙","기납부세액","기타 소득자료"],
    steps:["연간 매출·비용 누적 확인","증빙 누락 정리","예상 소득 확인","신고 후 확정세액 기록"]
  },
  daily:{
    title:"일용근로소득 지급자료",
    why:"일용직을 사용했다면 지급일과 금액을 기록하고 관련 제출자료를 준비합니다.",
    prepare:["근로자 정보","근무일","일급·총지급액","원천징수 발생 여부"],
    steps:["일용직별 지급내역 입력","근무일·금액 확인","관련 지급자료 제출 여부 확인","완료 상태 기록"]
  }
};
function taxGuidePanel(key){
  const g=taxGuideContent[key];
  if(!g)return "";
  return `<div class="tax-guide-panel">
    <div class="tax-guide-head"><div><p class="eyebrow">HOW TO</p><h3>${g.title}</h3></div><button class="icon-btn" data-close-guide>×</button></div>
    <p class="tax-guide-why">${g.why}</p>
    <div class="tax-guide-grid">
      <div><strong>준비할 것</strong><ol>${g.prepare.map(x=>`<li>${x}</li>`).join("")}</ol></div>
      <div><strong>처리 순서</strong><ol>${g.steps.map(x=>`<li>${x}</li>`).join("")}</ol></div>
    </div>
    <p class="calc-help">실제 신고 화면과 세액은 사업자 조건과 최신 공식 안내를 기준으로 최종 확인하세요.</p>
  </div>`;
}
let selectedTaxGuide=null;
function pageDashboard(){
  const m=getMonthData();
  const receivable=state.clients.reduce((a,b)=>a+Number(b.receivable||0),0);
  const completed=state.tasks.filter(x=>x.done).length;
  const guides=businessGuidance();
  return `
    <div class="hero">
      <div><p class="eyebrow">BUSINESS OVERVIEW</p><h2>${esc(state.profile.businessName)}, 지금 해야 할 일을 확인하세요.</h2>
      <p>사업자 설정과 입력 데이터를 기준으로 신고·입금·인력 업무를 자동으로 안내합니다.</p></div>
      <div class="status">설정 기준 자동 안내 · ${esc(state.profile.taxType)}</div>
    </div>
    <div class="metrics">
      ${metric("이번 달 매출",won(m.sales),m.list.filter(x=>x.type==="매출").length+"건 등록","up")}
      ${metric("이번 달 지출",won(m.costs),m.list.filter(x=>x.type==="매입").length+"건 등록")}
      ${metric("예상 부가세",state.profile.taxType==="일반과세자"?won(m.estimatedVat):"-","등록 VAT 기준")}
      ${metric("미수금",won(receivable),state.clients.filter(x=>x.receivable>0).length+"개 거래처","")}
    </div>
    <div class="guide-strip">
      <div class="guide-strip-head"><div><p class="eyebrow">SOLARBIZ GUIDE</p><h3>지금 확인하세요</h3></div><span>사업 설정·기록 기준</span></div>
      <div class="guide-strip-list">${guides.map(g=>`<button data-go="${g.go}"><strong>${g.title}</strong><span>${g.desc}</span><i>→</i></button>`).join("")}</div>
    </div>
    <div class="grid-2">
      <div>
        <div class="card">
          <div class="card-head"><h3>다가오는 신고 · 납부</h3><button class="link-btn" data-go="tax">전체 보기 →</button></div>
          <div class="deadline-list">${deadlines().map(d=>`
            <div class="row"><div class="date-badge">${d.day}<small>${d.month}</small></div><div><strong>${d.title}</strong><p>${d.desc}</p></div><span class="pill warn">${d.tag}</span></div>`).join("")}
          </div>
        </div>
        <div class="card">
          <div class="card-head"><h3>최근 거래</h3><button class="link-btn" data-go="finance">매출 · 매입 보기 →</button></div>
          <div class="transaction-list">${state.transactions.slice().sort((a,b)=>b.date.localeCompare(a.date)).slice(0,5).map(t=>`
            <div class="row"><div class="date-badge">${t.date.slice(8,10)}<small>${monthShort(t.date)}</small></div><div><strong>${esc(t.title)}</strong><p>${esc(t.client||t.type)} · ${t.date}</p></div><strong class="${t.type==='매출'?'positive':'negative'}">${t.type==='매출'?'+':'-'}${won(transactionAmounts(t).total)}</strong></div>`).join("")||'<div class="empty">등록된 거래가 없습니다.</div>'}
          </div>
        </div>
      </div>
      <div>
        <div class="card">
          <div class="card-head"><h3>이번 달 체크리스트</h3><span>${completed}/${state.tasks.length} 완료</span></div>
          <div class="progress"><i style="width:${state.tasks.length?completed/state.tasks.length*100:0}%"></i></div>
          <div class="task-list">${state.tasks.map(t=>`<label class="task"><input type="checkbox" data-task="${t.id}" ${t.done?'checked':''}><span>${esc(t.text)}</span></label>`).join("")}</div>
        </div>
        <div class="card">
          <div class="card-head"><h3>빠른 도구</h3><span>자주 쓰는 기능</span></div>
          <div class="quick-cards">
            <button class="quick-card" data-open-quick><strong>거래 등록</strong><span>매출·매입 + VAT 기록</span></button>
            <button class="quick-card" data-calc-open="vat"><strong>부가세 계산</strong><span>공급가액 · 합계 역산</span></button>
            <button class="quick-card" data-calc-open="withhold"><strong>3.3% 계산</strong><span>지급총액 · 실수령 역산</span></button>
          </div>
        </div>
      </div>
    </div>`;
}
function metric(label,value,note,cls=""){
  return `<div class="metric"><div class="label">${label}</div><strong class="${cls}">${value}</strong><small>${note}</small></div>`;
}
let financeTab="records";
let taxInvoiceDrafts=[];
let taxInvoiceBusy=false;
let taxInvoiceStatus={text:"",type:""};

function normalizeBusinessNumber(v=""){return String(v||"").replace(/\D/g,"").slice(0,10)}
function formatBusinessNumber(v=""){
  const d=normalizeBusinessNumber(v);
  return d.length===10?d.replace(/(\d{3})(\d{2})(\d{5})/,"$1-$2-$3"):String(v||"");
}
function normalizeClientName(v=""){
  return String(v||"").toLowerCase().replace(/주식회사|\(주\)|㈜|\s|[.,·_\-]/g,"");
}
function findClientMatch(name,businessNumber){
  const no=normalizeBusinessNumber(businessNumber);
  if(no){
    const byNo=state.clients.find(x=>normalizeBusinessNumber(x.businessNumber)===no);
    if(byNo)return byNo;
  }
  const key=normalizeClientName(name);
  return key?state.clients.find(x=>normalizeClientName(x.name)===key):null;
}
function moneyFromText(v=""){return Number(String(v).replace(/[^\d.-]/g,""))||0}
function pdfMoneyTokens(v=""){
  return (String(v).match(/\d{1,3}(?:,\d{3})+(?:\.\d+)?/g)||[])
    .map(moneyFromText).filter(n=>Number.isFinite(n)&&n>0&&n<1e13);
}
function normalizeInvoiceDate(raw=""){
  const s=String(raw||"").trim();
  let m=s.match(/(20\d{2})\D{0,3}(\d{1,2})\D{0,3}(\d{1,2})/);
  if(!m)m=s.match(/\b(20\d{2})(\d{2})(\d{2})\b/);
  if(!m)return "";
  const y=Number(m[1]),mo=Number(m[2]),d=Number(m[3]);
  if(mo<1||mo>12||d<1||d>31)return "";
  return `${y}-\${pad2(mo)}-\${pad2(d)}`;
}
function groupPdfLines(items){
  const rows=[];
  items.filter(x=>x.text).sort((a,b)=>b.y-a.y||a.x-b.x).forEach(item=>{
    let row=rows.find(r=>Math.abs(r.y-item.y)<2.4);
    if(!row){row={y:item.y,items:[]};rows.push(row)}
    row.items.push(item);
  });
  return rows.sort((a,b)=>b.y-a.y).map(r=>r.items.sort((a,b)=>a.x-b.x).map(x=>x.text).join(" ").replace(/\s+/g," ").trim()).filter(Boolean);
}
async function extractPdfLayout(file){
  if(!window.pdfjsLib)throw new Error("PDF 분석 라이브러리를 불러오지 못했습니다.");
  pdfjsLib.GlobalWorkerOptions.workerSrc="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
  const data=new Uint8Array(await file.arrayBuffer());
  const pdf=await pdfjsLib.getDocument({data}).promise;
  const allItems=[];
  for(let pageNo=1;pageNo<=pdf.numPages;pageNo++){
    const page=await pdf.getPage(pageNo);
    const content=await page.getTextContent();
    content.items.forEach(item=>{
      const text=String(item.str||"").trim();
      if(!text)return;
      allItems.push({text,x:Number(item.transform?.[4]||0),y:Number(item.transform?.[5]||0),page:pageNo});
    });
  }
  if(!allItems.length)throw new Error("텍스트를 읽을 수 없는 PDF입니다. 스캔 이미지 PDF는 현재 지원하지 않습니다.");
  const xs=allItems.map(x=>x.x);
  const minX=Math.min(...xs),maxX=Math.max(...xs),mid=minX+(maxX-minX)/2;
  const allLines=groupPdfLines(allItems);
  const leftLines=groupPdfLines(allItems.filter(x=>x.x<mid));
  const rightLines=groupPdfLines(allItems.filter(x=>x.x>=mid));
  return {allLines,leftLines,rightLines,text:allLines.join("\n"),left:leftLines.join("\n"),right:rightLines.join("\n")};
}
function extractBusinessNumbers(text=""){
  const list=String(text).match(/\b\d{3}[-\s]?\d{2}[-\s]?\d{5}\b/g)||[];
  return [...new Set(list.map(normalizeBusinessNumber).filter(x=>x.length===10))];
}
function cleanCompanyCandidate(v=""){
  return String(v||"")
    .replace(/상\s*호\s*(?:\(\s*법인명\s*\))?/g,"")
    .replace(/성\s*명|대표자|업\s*태|종\s*목|사업장|주소|등록번호|종사업장번호/g," ")
    .replace(/\b\d{3}[-\s]?\d{2}[-\s]?\d{5}\b/g," ")
    .replace(/\s+/g," ").trim()
    .replace(/^[|:：\-]+|[|:：\-]+$/g,"").trim();
}
function parseParty(sideText="",fallbackNumber=""){
  const lines=String(sideText).split("\n").map(x=>x.trim()).filter(Boolean);
  const businessNumber=extractBusinessNumbers(sideText)[0]||fallbackNumber||"";
  let name="";
  for(const line of lines){
    if(/상\s*호/.test(line)){
      const candidate=cleanCompanyCandidate(line.replace(/^.*?상\s*호\s*(?:\(\s*법인명\s*\))?/,""));
      if(candidate.length>=2&&candidate.length<=45&&!/공급자|공급받는자/.test(candidate)){name=candidate;break}
    }
  }
  if(!name&&businessNumber){
    const idx=lines.findIndex(x=>normalizeBusinessNumber(x).includes(businessNumber));
    const candidates=lines.slice(Math.max(0,idx),idx+5).map(cleanCompanyCandidate)
      .filter(x=>x.length>=2&&x.length<=40&&!/등록|번호|공급|작성|합계|세액|금액/.test(x)&&!/\d{5,}/.test(x));
    name=candidates[0]||"";
  }
  return {businessNumber,name};
}
function summaryAmounts(lines){
  let supply=0,vat=0,total=0;
  for(let i=0;i<lines.length;i++){
    const line=lines[i];
    if(/공급가액/.test(line)&&/세액/.test(line)){
      const nums=[];
      for(let j=i;j<Math.min(lines.length,i+5);j++) nums.push(...pdfMoneyTokens(lines[j]));
      if(nums.length>=2){supply=nums[0];vat=nums[1];break}
    }
  }
  for(let i=0;i<lines.length;i++){
    if(/합계금액|합\s*계/.test(lines[i])){
      const nums=[];
      for(let j=i;j<Math.min(lines.length,i+4);j++) nums.push(...pdfMoneyTokens(lines[j]));
      if(nums.length){total=Math.max(...nums);break}
    }
  }
  if(!total&&supply)total=supply+vat;
  if(!supply&&total){
    supply=Math.round(total/1.1);
    vat=Math.max(0,total-supply);
  }
  return {supply,vat,total};
}
function parseInvoiceDate(lines,text){
  const idx=lines.findIndex(x=>/작성일자|작성\s*일/.test(x));
  if(idx>=0){
    for(let j=idx;j<Math.min(lines.length,idx+4);j++){
      const d=normalizeInvoiceDate(lines[j]);
      if(d)return d;
    }
  }
  const around=String(text).match(/(?:작성일자|작성\s*일)[\s\S]{0,80}/)?.[0]||text;
  return normalizeInvoiceDate(around);
}
async function parseTaxInvoiceFile(file){
  const layout=await extractPdfLayout(file);
  const globalNos=extractBusinessNumbers(layout.text);
  let supplier=parseParty(layout.left,globalNos[0]||"");
  let recipient=parseParty(layout.right,globalNos[1]||"");
  if(!supplier.businessNumber&&globalNos[0])supplier.businessNumber=globalNos[0];
  if(!recipient.businessNumber&&globalNos[1])recipient.businessNumber=globalNos[1];
  const own=normalizeBusinessNumber(state.profile?.businessNumber||"");
  let type="매출",counterparty=recipient,matchNote="사업자번호 확인 필요";
  if(own&&supplier.businessNumber===own){type="매출";counterparty=recipient;matchNote="공급자 기준 매출"}
  else if(own&&recipient.businessNumber===own){type="매입";counterparty=supplier;matchNote="공급받는자 기준 매입"}
  const amounts=summaryAmounts(layout.allLines);
  const date=parseInvoiceDate(layout.allLines,layout.text)||localDateInputValue();
  const existing=findClientMatch(counterparty.name,counterparty.businessNumber);
  const warnings=[];
  if(!own)warnings.push("내 사업자번호 미설정");
  else if(supplier.businessNumber!==own&&recipient.businessNumber!==own)warnings.push("내 사업자번호와 일치하지 않음");
  if(!counterparty.name)warnings.push("거래처명 확인 필요");
  if(!counterparty.businessNumber)warnings.push("거래처 사업자번호 확인 필요");
  if(!amounts.total)warnings.push("금액 확인 필요");
  return {
    id:Date.now()+Math.random(),
    fileName:file.name,
    type,
    supplierName:supplier.name,
    supplierBusinessNumber:supplier.businessNumber,
    recipientName:recipient.name,
    recipientBusinessNumber:recipient.businessNumber,
    clientName:counterparty.name||existing?.name||"",
    clientBusinessNumber:counterparty.businessNumber||existing?.businessNumber||"",
    clientMatched:Boolean(existing),
    date,
    supplyAmount:amounts.supply,
    vatAmount:amounts.vat,
    totalAmount:amounts.total,
    warnings,
    matchNote
  };
}
function taxInvoiceFingerprint(d){
  return [d.type,normalizeBusinessNumber(d.clientBusinessNumber),d.date,Math.round(Number(d.supplyAmount||0)),Math.round(Number(d.vatAmount||0))].join("|");
}
async function handleTaxInvoiceFiles(files){
  const list=[...files].filter(f=>f.type==="application/pdf"||/\.pdf$/i.test(f.name));
  if(!list.length){taxInvoiceStatus={text:"PDF 파일을 선택해주세요.",type:"error"};render("finance");return}
  taxInvoiceBusy=true;
  taxInvoiceStatus={text:`${list.length}개 PDF를 분석하고 있습니다…`,type:""};
  render("finance");
  const drafts=[];
  const errors=[];
  for(const file of list){
    try{drafts.push(await parseTaxInvoiceFile(file))}
    catch(err){errors.push(`${file.name}: ${err.message||"분석 실패"}`)}
  }
  taxInvoiceDrafts=[...taxInvoiceDrafts,...drafts];
  taxInvoiceBusy=false;
  taxInvoiceStatus={
    text:errors.length?`${drafts.length}건 분석 완료 · ${errors.length}건 확인 필요`:`${drafts.length}건 분석 완료. 내용을 확인한 뒤 저장하세요.`,
    type:errors.length?"error":"ok"
  };
  if(errors.length)taxInvoiceStatus.detail=errors.join(" / ");
  render("finance");
}
function saveTaxInvoiceDraft(id){
  const d=taxInvoiceDrafts.find(x=>String(x.id)===String(id));
  if(!d)return;
  d.supplyAmount=Math.max(0,Number(d.supplyAmount||0));
  d.vatAmount=Math.max(0,Number(d.vatAmount||0));
  d.totalAmount=Math.max(0,Number(d.totalAmount||d.supplyAmount+d.vatAmount));
  if(!d.clientName.trim()){taxInvoiceStatus={text:"거래처명을 확인해주세요.",type:"error"};render("finance");return}
  if(!d.date){taxInvoiceStatus={text:"작성일자를 확인해주세요.",type:"error"};render("finance");return}
  if(!d.totalAmount){taxInvoiceStatus={text:"합계금액을 확인해주세요.",type:"error"};render("finance");return}
  const fingerprint=taxInvoiceFingerprint(d);
  if(state.taxInvoices.some(x=>x.fingerprint===fingerprint)){
    taxInvoiceStatus={text:"이미 저장된 세금계산서와 동일한 거래로 보입니다.",type:"error"};render("finance");return;
  }
  let client=findClientMatch(d.clientName,d.clientBusinessNumber);
  if(!client){
    client={name:d.clientName,businessNumber:formatBusinessNumber(d.clientBusinessNumber),category:"세금계산서 거래처",status:"진행중",receivable:0};
    state.clients.unshift(client);
  }else if(!client.businessNumber&&d.clientBusinessNumber){
    client.businessNumber=formatBusinessNumber(d.clientBusinessNumber);
  }
  const transaction={
    id:Date.now()+Math.random(),
    type:d.type,
    title:d.type==="매출"?"전자세금계산서 매출":"전자세금계산서 매입",
    client:d.clientName,
    clientBusinessNumber:formatBusinessNumber(d.clientBusinessNumber),
    amount:d.totalAmount,
    supplyAmount:d.supplyAmount,
    vatAmount:d.vatAmount,
    taxable:d.vatAmount>0,
    date:d.date,
    source:"tax-invoice",
    fileName:d.fileName
  };
  state.transactions.unshift(transaction);
  state.taxInvoices.unshift({
    id:transaction.id,
    fingerprint,
    fileName:d.fileName,
    type:d.type,
    clientName:d.clientName,
    clientBusinessNumber:formatBusinessNumber(d.clientBusinessNumber),
    date:d.date,
    supplyAmount:d.supplyAmount,
    vatAmount:d.vatAmount,
    totalAmount:d.totalAmount,
    savedAt:new Date().toISOString()
  });
  taxInvoiceDrafts=taxInvoiceDrafts.filter(x=>String(x.id)!==String(id));
  save();
  taxInvoiceStatus={text:`${d.clientName} 세금계산서를 ${d.type} 기록으로 저장했습니다.`,type:"ok"};
  render("finance");
}
function updateTaxInvoiceDraft(id,field,value){
  const d=taxInvoiceDrafts.find(x=>String(x.id)===String(id));
  if(!d)return;
  if(["supplyAmount","vatAmount","totalAmount"].includes(field)){
    d[field]=Math.max(0,Number(value||0));
    if(field==="supplyAmount"||field==="vatAmount")d.totalAmount=Number(d.supplyAmount||0)+Number(d.vatAmount||0);
  }else d[field]=value;
}
function invoiceDraftCard(d){
  const badge=d.warnings.length?d.warnings.join(" · "):(d.clientMatched?"기존 거래처 연결":"신규 거래처 생성");
  return `<article class="invoice-draft">
    <div class="invoice-draft-top">
      <div class="invoice-draft-file"><strong>${esc(d.fileName)}</strong><span>${esc(d.matchNote)}</span></div>
      <span class="invoice-draft-warning ${d.warnings.length?"":"ok"}">${esc(badge)}</span>
    </div>
    <div class="invoice-draft-grid">
      <label>분류<select data-tax-draft-id="${d.id}" data-tax-draft-field="type"><option ${d.type==='매출'?'selected':''}>매출</option><option ${d.type==='매입'?'selected':''}>매입</option></select></label>
      <label>작성일<input type="date" value="${esc(d.date)}" data-tax-draft-id="${d.id}" data-tax-draft-field="date"></label>
      <label>거래처<input value="${esc(d.clientName)}" data-tax-draft-id="${d.id}" data-tax-draft-field="clientName"></label>
      <label>사업자번호<input value="${esc(formatBusinessNumber(d.clientBusinessNumber))}" placeholder="000-00-00000" data-tax-draft-id="${d.id}" data-tax-draft-field="clientBusinessNumber"></label>
      <label>공급가액<input type="number" value="${Number(d.supplyAmount||0)}" data-tax-draft-id="${d.id}" data-tax-draft-field="supplyAmount"></label>
      <label>VAT<input type="number" value="${Number(d.vatAmount||0)}" data-tax-draft-id="${d.id}" data-tax-draft-field="vatAmount"></label>
    </div>
    <div class="invoice-draft-actions"><button class="remove" data-tax-draft-remove="${d.id}">제외</button><button class="save" data-tax-draft-save="${d.id}">확인 후 저장 · ${won(d.totalAmount)}</button></div>
  </article>`;
}
function financeRecordView(m){
  return `<div class="metrics">${metric(m.label+" 매출",won(m.sales),"합계금액","up")}${metric(m.label+" 매입",won(m.costs),"합계금액")}${metric("매출 VAT",won(m.salesVat),"등록 기준")}${metric("예상 부가세",won(m.estimatedVat),`매출 VAT - 매입 VAT ${won(m.purchaseVat)}`)}</div>
  <div class="table-card"><table class="table"><thead><tr><th>거래일</th><th>구분</th><th>내용</th><th>거래처</th><th>증빙</th><th class="money">공급가액</th><th class="money">VAT</th><th class="money">합계</th></tr></thead><tbody>
  ${state.transactions.slice().sort((a,b)=>b.date.localeCompare(a.date)).map(t=>{const a=transactionAmounts(t);return `<tr><td>${t.date}</td><td><span class="pill ${t.type==='매출'?'success':''}">${t.type}</span></td><td>${esc(t.title)}</td><td>${esc(t.client||'-')}</td><td>${t.source==='tax-invoice'?'<span class="invoice-source">세금계산서</span>':'직접 등록'}</td><td class="money">${won(a.supply)}</td><td class="money">${won(a.vat)}</td><td class="money ${t.type==='매출'?'positive':'negative'}">${won(a.total)}</td></tr>`}).join("")||'<tr><td colspan="8" class="empty">거래를 등록해보세요.</td></tr>'}
  </tbody></table></div>`;
}
function taxInvoiceImportView(){
  const saved=state.taxInvoices||[];
  const sales=saved.filter(x=>x.type==="매출");
  const totalSupply=sales.reduce((s,x)=>s+Number(x.supplyAmount||0),0);
  const totalVat=sales.reduce((s,x)=>s+Number(x.vatAmount||0),0);
  return `<div class="invoice-import-layout">
    <div class="invoice-import-intro">
      <div><h3>전자세금계산서 PDF를 넣으면 거래처와 매출 기록으로 정리합니다.</h3><p>PDF의 공급자·공급받는자, 작성일, 공급가액과 세액을 읽고 내 사업자번호를 기준으로 매출·매입을 구분합니다. 저장 전 결과를 직접 확인하고 수정할 수 있습니다.</p></div>
      <div class="invoice-import-meta"><span>텍스트형 PDF</span><span>사업자번호 매칭</span><span>확인 후 저장</span></div>
    </div>
    <label class="invoice-dropzone" id="taxInvoiceDropzone">
      <input id="taxInvoiceFiles" type="file" accept="application/pdf,.pdf" multiple ${taxInvoiceBusy?"disabled":""}>
      <div><div class="invoice-dropzone-icon"><img src="../assets/ui-icons/invoice.svg" alt=""></div><strong>${taxInvoiceBusy?"PDF 분석 중…":"세금계산서 PDF를 끌어놓거나 클릭하세요."}</strong><p>여러 장을 한 번에 선택할 수 있습니다.</p><small>스캔 이미지 PDF는 아직 지원하지 않습니다. 원본 전자세금계산서 PDF를 사용해주세요.</small></div>
    </label>
    ${taxInvoiceStatus.text?`<div class="invoice-import-status ${taxInvoiceStatus.type}">${esc(taxInvoiceStatus.text)}${taxInvoiceStatus.detail?`<br><small>${esc(taxInvoiceStatus.detail)}</small>`:''}</div>`:''}
    ${taxInvoiceDrafts.length?`<div><div class="invoice-draft-head"><h3>분석 결과 확인</h3><span>${taxInvoiceDrafts.length}건 · 저장 전에 수정 가능</span></div><div class="invoice-draft-list">${taxInvoiceDrafts.map(invoiceDraftCard).join("")}</div></div>`:''}
    <div>
      <div class="invoice-history-head"><h3>정리된 세금계산서</h3><span>${saved.length}건 저장</span></div>
      ${saved.length?`<div class="invoice-summary"><div><span>매출 세금계산서</span><strong>${sales.length}건</strong></div><div><span>누적 공급가액</span><strong>${won(totalSupply)}</strong></div><div><span>누적 VAT</span><strong>${won(totalVat)}</strong></div><div><span>등록 거래처</span><strong>${new Set(saved.map(x=>x.clientName).filter(Boolean)).size}곳</strong></div></div><div class="table-card invoice-history-table"><table class="table"><thead><tr><th>작성일</th><th>구분</th><th>거래처</th><th>사업자번호</th><th>파일</th><th class="money">공급가액</th><th class="money">VAT</th><th class="money">합계</th></tr></thead><tbody>${saved.slice().sort((a,b)=>String(b.date).localeCompare(String(a.date))).map(x=>`<tr><td>${esc(x.date)}</td><td><span class="pill ${x.type==='매출'?'success':''}">${esc(x.type)}</span></td><td>${esc(x.clientName)}</td><td>${esc(x.clientBusinessNumber||'-')}</td><td>${esc(x.fileName||'-')}</td><td class="money">${won(x.supplyAmount)}</td><td class="money">${won(x.vatAmount)}</td><td class="money">${won(x.totalAmount)}</td></tr>`).join("")}</tbody></table></div>`:`<div class="invoice-empty">아직 정리된 세금계산서가 없습니다.<br>전자세금계산서 PDF를 넣어 첫 매출 기록을 만들어보세요.</div>`}
    </div>
  </div>`;
}
function pageFinance(){
  const m=getMonthData();
  return `
  <div class="section-title"><div><p class="eyebrow">SALES RECORDS</p><h2>매출기록</h2><p class="section-desc">직접 등록하거나 세금계산서 PDF를 가져와 매출·매입과 VAT 기록을 정리합니다.</p></div><button class="primary-btn" data-open-quick>+ 거래 등록</button></div>
  <div class="finance-tabs"><button class="finance-tab ${financeTab==='records'?'active':''}" data-finance-tab="records">거래내역</button><button class="finance-tab ${financeTab==='invoice'?'active':''}" data-finance-tab="invoice">세금계산서 정리</button></div>
  ${financeTab==='invoice'?taxInvoiceImportView():financeRecordView(m)}`;
}
function pageTax(){
  const p=state.profile||{};
  const ds=deadlines();
  const byKey=(key)=>ds.find(x=>x.key===key);
  const cards=[];
  if(p.taxType==="면세사업자"){
    const d=byKey("business-status");
    cards.push(taxCard("사업장현황신고","면세사업자의 수입금액과 사업장 현황 자료를 준비합니다.",d?.display||"연 1회","다음 일정","면세사업자","income"));
  }else{
    const d=byKey("vat");
    cards.push(taxCard("부가가치세","매출·매입 자료를 기준으로 신고 준비 상태를 확인합니다.",d?.display||"일정 확인","다음 일정",p.taxType||"과세유형 미설정","vat"));
  }
  if(p.hasEmployee||p.hasFreelancer){
    const d=byKey("withholding");
    cards.push(taxCard("원천세 · 지방소득세","급여 또는 3.3% 지급내역을 월별로 관리합니다.",d?.display||"매월","다음 일정",p.hasFreelancer?"3.3% 인력 사용":"직원 급여 사용","withholding"));
  }
  if(p.businessType==="개인사업자"){
    const d=byKey("income-tax");
    cards.push(taxCard("종합소득세","연간 수입·필요경비 자료를 누적해 신고 준비도를 보여줍니다.",d?.display||"연 1회","다음 일정","개인사업자","income"));
  }else{
    cards.push(taxCard("법인세","법인의 사업연도와 결산월 기준으로 신고 일정을 관리합니다.","결산월 기준","설정 필요","법인사업자"));
  }
  if(p.hasEmployee){
    cards.push(taxCard("4대보험","직원 취득·상실, 급여와 월 보험료 관련 업무를 정리합니다.","매월","관리","직원 사용 중","insurance"));
  }
  if(p.hasFreelancer){
    cards.push(taxCard("3.3% 지급자료","프리랜서 지급내역과 월별 제출자료를 정리합니다.","매월","관리","3.3% 사용 중","freelancer"));
  }
  if(p.hasDailyWorker){
    cards.push(taxCard("일용근로소득 지급자료","일용직 지급내역과 관련 제출자료를 정리합니다.","매월","관리","일용직 사용 중","daily"));
  }
  if(!cards.length) cards.push(taxCard("세금 설정","사업자 설정을 완료하면 필요한 신고 항목만 표시합니다.","-","설정","확인 필요"));
  return `
  <div class="section-title"><div><p class="eyebrow">TAX & FILING</p><h2>세금 · 신고</h2></div></div>
  <div class="notice">사업자 설정과 지급·거래 기록을 기준으로 필요한 업무를 보여줍니다. 각 항목의 ‘어떻게 하나요?’에서 준비자료와 처리 순서를 확인할 수 있습니다.</div>
  <div class="tax-grid">${cards.join("")}</div>
  ${selectedTaxGuide?taxGuidePanel(selectedTaxGuide):""}`;
}
function taxCard(title,desc,date,label,status,guideKey=""){
  return `<div class="tax-card"><div class="top"><div><h3>${title}</h3><p>${desc}</p></div><div class="due">${date}<small>${label}</small></div></div><div class="tax-card-bottom"><span class="pill">${status}</span>${guideKey?`<button class="link-btn" data-tax-guide="${guideKey}">어떻게 하나요? →</button>`:""}</div></div>`;
}
function pageClients(){
  return `
  <div class="section-title"><div><p class="eyebrow">CLIENTS</p><h2>클라이언트</h2></div><button class="primary-btn" id="addClient">+ 거래처 추가</button></div>
  <div class="table-card"><table class="table"><thead><tr><th>클라이언트</th><th>업무</th><th>상태</th><th class="money">미수금</th></tr></thead><tbody>
  ${state.clients.map(c=>`<tr><td><strong>${esc(c.name)}</strong></td><td>${esc(c.category)}</td><td><span class="pill ${c.status==='진행중'?'success':''}">${esc(c.status)}</span></td><td class="money ${c.receivable>0?'negative':''}">${won(c.receivable)}</td></tr>`).join("")||'<tr><td colspan="4" class="empty">등록된 클라이언트가 없습니다.</td></tr>'}
  </tbody></table></div>`;
}
function pageProjects(){
  return `
  <div class="section-title"><div><p class="eyebrow">PROJECTS</p><h2>프로젝트</h2></div><button class="primary-btn" id="addProject">+ 프로젝트 추가</button></div>
  <div class="table-card"><table class="table"><thead><tr><th>프로젝트</th><th>클라이언트</th><th>상태</th><th>납품일</th><th class="money">계약금액</th></tr></thead><tbody>
  ${state.projects.map(p=>`<tr><td><strong>${esc(p.name)}</strong></td><td>${esc(p.client||"-")}</td><td><span class="pill ${p.status==="진행중"?"success":""}">${esc(p.status||"진행중")}</span></td><td>${esc(p.dueDate||"-")}</td><td class="money">${won(p.amount)}</td></tr>`).join("")||'<tr><td colspan="5" class="empty">등록된 프로젝트가 없습니다.</td></tr>'}
  </tbody></table></div>`;
}
function pagePeople(){
  const rows=[];
  if(state.profile.hasEmployee)rows.push(["4대보험 직원","상시 인력","취득·급여·보험료 관리","사용 중"]);
  if(state.profile.hasFreelancer)rows.push(["3.3% 인력","사업소득 지급","지급명세·원천세 관리","사용 중"]);
  if(state.profile.hasDailyWorker)rows.push(["일용직","일용근로","지급내역·관련 자료 관리","사용 중"]);
  return `
  <div class="section-title"><div><p class="eyebrow">PEOPLE</p><h2>인력 관리</h2></div></div>
  <div class="notice">고용 형태에 따라 필요한 관리 항목을 나눠 보여주는 영역입니다. 실제 지급내역 등록과 원천징수 자료 생성은 다음 개발 단계에서 연결합니다.</div>
  <div class="table-card"><table class="table"><thead><tr><th>구분</th><th>형태</th><th>관리 항목</th><th>상태</th></tr></thead><tbody>
  ${rows.map(r=>`<tr>${r.map((v,i)=>`<td>${i===3?'<span class="pill success">'+v+'</span>':v}</td>`).join("")}</tr>`).join("")||'<tr><td colspan="4" class="empty">인력 사용 설정이 없습니다.</td></tr>'}
  </tbody></table></div>`;
}
function pageCalendar(){
  return `<div class="section-title"><div><p class="eyebrow">BUSINESS CALENDAR</p><h2>사업 일정</h2></div></div>
  <div class="grid-2"><div class="card"><div class="card-head"><h3>다가오는 일정</h3><span>세무 + 운영</span></div>
  ${deadlines().map(d=>`<div class="row"><div class="date-badge">${d.day}<small>${d.month}</small></div><div><strong>${d.title}</strong><p>${d.desc}</p></div><span class="pill">${d.tag}</span></div>`).join("")}</div>
  <div class="card"><div class="card-head"><h3>자동 일정의 기준</h3></div><p style="font-size:11px;color:var(--muted);line-height:1.8">사업자 유형, 과세 유형, 직원·3.3% 인력 사용 여부, 계약 만료일, 미수금 예정일을 바탕으로 일정이 자동 생성되는 구조를 테스트합니다.</p></div></div>`;
}
function pageDocuments(){
  return `<div class="section-title"><div><p class="eyebrow">DOCUMENTS</p><h2>문서 보관</h2></div><button class="primary-btn" disabled>+ 파일 업로드</button></div>
  <div class="quick-cards">
    ${["세금계산서","계약서","견적서 · 거래명세서","사업자등록증","인력 지급자료","기타 문서"].map((x,i)=>`<div class="quick-card"><strong>${x}</strong><span>${i===0?'3개 파일':'아직 등록된 파일 없음'}</span></div>`).join("")}
  </div><div class="notice" style="margin-top:14px">테스트 버전에서는 문서 분류 UI만 구성되어 있습니다. 실제 파일 저장은 Firebase Storage 연결 단계에서 구현합니다.</div>`;
}
let currentCalculator=null;
let vatMode="supply";
let withholdMode="gross";

const calculatorItems=[
  {id:"vat",title:"부가세 계산",desc:"공급가액 또는 합계금액을 기준으로 부가세를 계산합니다.",meta:"정방향 · 역산",icon:"tax.svg"},
  {id:"withhold",title:"3.3% 원천징수",desc:"지급총액과 실수령액을 서로 계산하고 세액을 나눠 확인합니다.",meta:"소득세 3% + 지방소득세 0.3%",icon:"tax.svg"},
  {id:"margin",title:"마진 계산",desc:"매출액과 비용을 기준으로 이익과 마진율을 계산합니다.",meta:"수익성 확인",icon:"analytics.svg"},
  {id:"hourly",title:"프로젝트 단가",desc:"프로젝트 금액과 투입시간을 기준으로 시간당 단가를 계산합니다.",meta:"작업 효율 확인",icon:"workflow.svg"}
];

function pageCalculator(){
  if(!currentCalculator)return calculatorHome();
  if(currentCalculator==="vat")return vatCalculator();
  if(currentCalculator==="withhold")return withholdCalculator();
  if(currentCalculator==="margin")return marginCalculator();
  if(currentCalculator==="hourly")return hourlyCalculator();
  currentCalculator=null;
  return calculatorHome();
}
function calculatorHome(){
  return `
    <div class="section-title calculator-title">
      <div><p class="eyebrow">CALCULATORS</p><h2>필요한 계산기를 선택하세요.</h2>
      <p class="section-desc">한 화면에 모든 계산식을 펼치지 않고, 필요한 계산만 선택해서 자세히 확인합니다.</p></div>
    </div>
    <div class="calculator-menu">
      ${calculatorItems.map((item,index)=>`
        <button class="calculator-menu-card" data-calculator="${item.id}">
          <div class="calculator-menu-icon"><img src="../assets/icons/${item.icon}" alt=""></div>
          <div class="calculator-menu-copy">
            <strong>${item.title}</strong>
            <p>${item.desc}</p>
            <span>${item.meta}</span>
          </div>
          <div class="calculator-menu-arrow">→</div>
        </button>`).join("")}
    </div>`;
}
function calculatorDetailHeader(kicker,title,desc){
  return `
    <div class="calculator-detail-head">
      <button class="calc-back" id="calcBack">← 계산기 목록</button>
      <p class="eyebrow">${kicker}</p>
      <h2>${title}</h2>
      <p>${desc}</p>
    </div>`;
}
function vatCalculator(){
  return `
    ${calculatorDetailHeader("VAT CALCULATOR","부가세 계산","금액을 알고 있는 방향에 맞춰 계산할 수 있습니다.")}
    <div class="calculator-detail-card" data-detail-calc="vat">
      <div class="calc-mode-tabs">
        <button class="${vatMode==="supply"?"active":""}" data-vat-mode="supply">공급가액으로 계산</button>
        <button class="${vatMode==="total"?"active":""}" data-vat-mode="total">합계금액으로 역산</button>
      </div>
      <div class="calc-form-large">
        <label>
          <span>${vatMode==="supply"?"공급가액":"부가세 포함 합계금액"}</span>
          <div class="money-input"><input type="number" min="0" step="1" inputmode="numeric" data-a placeholder="0"><b>원</b></div>
        </label>
      </div>
      <div class="calc-breakdown" aria-live="polite">
        <div><span>공급가액</span><strong data-vat-supply>₩0</strong></div>
        <div><span>부가세</span><strong data-vat-tax>₩0</strong></div>
        <div class="total"><span>합계금액</span><strong data-vat-total>₩0</strong></div>
      </div>
      <p class="calc-help">${vatMode==="supply"?"공급가액의 10%를 부가세로 계산합니다.":"입력한 합계금액을 1.1로 나누어 공급가액과 부가세를 역산합니다."}</p>
    </div>`;
}
function withholdCalculator(){
  return `
    ${calculatorDetailHeader("WITHHOLDING TAX","3.3% 원천징수 계산","지급 전 금액과 실제 입금액 어느 쪽에서도 계산할 수 있습니다.")}
    <div class="calculator-detail-card" data-detail-calc="withhold">
      <div class="calc-mode-tabs">
        <button class="${withholdMode==="gross"?"active":""}" data-withhold-mode="gross">지급총액 기준</button>
        <button class="${withholdMode==="net"?"active":""}" data-withhold-mode="net">실수령액 기준 역산</button>
      </div>
      <div class="calc-form-large">
        <label>
          <span>${withholdMode==="gross"?"세전 지급총액":"실제 실수령액"}</span>
          <div class="money-input"><input type="number" min="0" step="1" inputmode="numeric" data-a placeholder="0"><b>원</b></div>
        </label>
      </div>
      <div class="calc-breakdown four" aria-live="polite">
        <div><span>세전 지급총액</span><strong data-wh-gross>₩0</strong></div>
        <div><span>소득세 3%</span><strong data-wh-income>₩0</strong></div>
        <div><span>지방소득세 0.3%</span><strong data-wh-local>₩0</strong></div>
        <div class="total"><span>실수령액</span><strong data-wh-net>₩0</strong></div>
      </div>
      <p class="calc-help">일반적인 3.3% 원천징수 단순 계산용입니다. 실제 신고 시 원단위 처리 등으로 차이가 생길 수 있습니다.</p>
    </div>`;
}
function marginCalculator(){
  return `
    ${calculatorDetailHeader("MARGIN CALCULATOR","마진 계산","매출에서 직접 비용을 제외한 이익과 마진율을 확인합니다.")}
    <div class="calculator-detail-card" data-detail-calc="margin">
      <div class="calc-form-grid">
        <label><span>매출액</span><div class="money-input"><input type="number" min="0" step="1" data-a placeholder="0"><b>원</b></div></label>
        <label><span>비용</span><div class="money-input"><input type="number" min="0" step="1" data-b placeholder="0"><b>원</b></div></label>
      </div>
      <div class="calc-breakdown">
        <div><span>매출액</span><strong data-margin-sales>₩0</strong></div>
        <div><span>비용</span><strong data-margin-cost>₩0</strong></div>
        <div class="total"><span>이익 / 마진율</span><strong data-margin-result>₩0 · 0%</strong></div>
      </div>
    </div>`;
}
function hourlyCalculator(){
  return `
    ${calculatorDetailHeader("PROJECT RATE","프로젝트 단가 계산","프로젝트 금액을 실제 투입시간으로 나눠 작업 효율을 확인합니다.")}
    <div class="calculator-detail-card" data-detail-calc="hourly">
      <div class="calc-form-grid">
        <label><span>프로젝트 금액</span><div class="money-input"><input type="number" min="0" step="1" data-a placeholder="0"><b>원</b></div></label>
        <label><span>총 투입시간</span><div class="money-input"><input type="number" min="0" step="0.5" data-b placeholder="0"><b>시간</b></div></label>
      </div>
      <div class="calc-breakdown two">
        <div><span>총 프로젝트 금액</span><strong data-hour-total>₩0</strong></div>
        <div class="total"><span>시간당 단가</span><strong data-hour-rate>₩0</strong></div>
      </div>
    </div>`;
}
function pageAnalytics(){
  const totalSales=state.transactions.filter(x=>x.type==="매출").reduce((sum,t)=>sum+transactionAmounts(t).total,0);
  const totalCosts=state.transactions.filter(x=>x.type==="매입").reduce((sum,t)=>sum+transactionAmounts(t).total,0);
  const profit=totalSales-totalCosts;
  const receivable=state.clients.reduce((sum,x)=>sum+Number(x.receivable||0),0);
  const byClient={};
  state.transactions.filter(x=>x.type==="매출").forEach(t=>{
    const key=t.client||"미분류";
    byClient[key]=(byClient[key]||0)+transactionAmounts(t).total;
  });
  const topClients=Object.entries(byClient).sort((a,b)=>b[1]-a[1]).slice(0,5);
  const activeProjects=state.projects.filter(p=>!["종료","취소"].includes(p.status)).length;
  return `
  <div class="section-title"><div><p class="eyebrow">ANALYTICS</p><h2>사업 분석</h2><p class="section-desc">등록된 데이터를 기준으로 현재 사업 구조를 간단히 확인합니다.</p></div></div>
  <div class="metrics analytics-metrics">
    ${metric("누적 매출",won(totalSales),state.transactions.filter(x=>x.type==="매출").length+"건","up")}
    ${metric("누적 비용",won(totalCosts),state.transactions.filter(x=>x.type==="매입").length+"건")}
    ${metric("누적 영업잔액",won(profit),"매출 - 비용")}
    ${metric("현재 미수금",won(receivable),state.clients.filter(x=>x.receivable>0).length+"개 거래처")}
  </div>
  <div class="grid-2 analytics-grid">
    <div class="card">
      <div class="card-head"><h3>클라이언트별 매출</h3><span>상위 5</span></div>
      <div class="analytics-list">
        ${topClients.length?topClients.map(([name,value])=>{
          const ratio=totalSales>0?Math.max(4,value/totalSales*100):0;
          return `<div class="analytics-row"><div><strong>${esc(name)}</strong><span>${won(value)}</span></div><div class="analytics-bar"><i style="width:${ratio}%"></i></div></div>`
        }).join(""):'<div class="empty">매출 데이터가 쌓이면 거래처별 비중을 보여줍니다.</div>'}
      </div>
    </div>
    <div>
      <div class="card analytics-summary">
        <div class="card-head"><h3>사업 상태</h3><span>현재 기준</span></div>
        <dl>
          <div><dt>클라이언트</dt><dd>${state.clients.length}개</dd></div>
          <div><dt>진행 프로젝트</dt><dd>${activeProjects}개</dd></div>
          <div><dt>등록 거래</dt><dd>${state.transactions.length}건</dd></div>
          <div><dt>이번 달 할 일</dt><dd>${deadlines().length}건</dd></div>
        </dl>
      </div>
      <div class="card analytics-summary">
        <div class="card-head"><h3>다음 개선 포인트</h3></div>
        <p class="analytics-tip">${receivable>0?"미수금이 있습니다. 입금 예정일과 거래처를 먼저 확인해보세요.":"현재 미수금은 없습니다. 프로젝트별 실제 손익을 꾸준히 기록해보세요."}</p>
      </div>
    </div>
  </div>`;
}
function pageSettings(){
  const p=state.profile;
  return `<div class="section-title"><div><p class="eyebrow">BUSINESS PROFILE</p><h2>사업자 설정</h2></div></div>
  <form id="settingsForm" class="settings-grid card">
    <label>상호명<input name="businessName" value="${esc(p.businessName)}"></label>
    <label>대표자명<input name="ownerName" value="${esc(p.ownerName)}"></label>
    <label>사업자등록번호<input name="businessNumber" value="${esc(p.businessNumber||"")}" placeholder="000-00-00000"></label>
    <label>사업장 주소<input name="address" value="${esc(p.address||"")}"></label>
    <label>사업자 형태<select name="businessType"><option ${p.businessType==='개인사업자'?'selected':''}>개인사업자</option><option ${p.businessType==='법인사업자'?'selected':''}>법인사업자</option></select></label>
    <label>과세 유형<select name="taxType"><option ${p.taxType==='일반과세자'?'selected':''}>일반과세자</option><option ${p.taxType==='간이과세자'?'selected':''}>간이과세자</option><option ${p.taxType==='면세사업자'?'selected':''}>면세사업자</option></select></label>
    <label>업종<input name="industry" value="${esc(p.industry||'')}"></label>
    <label>개업일<input type="date" name="startDate" value="${esc(p.startDate||'')}"></label>
    <div class="check-card"><span>직원(4대보험) 고용</span><label class="switch"><input name="hasEmployee" type="checkbox" ${p.hasEmployee?'checked':''}><i></i></label></div>
    <div class="check-card"><span>3.3% 인력 사용</span><label class="switch"><input name="hasFreelancer" type="checkbox" ${p.hasFreelancer?'checked':''}><i></i></label></div>
    <div class="check-card"><span>일용직 사용</span><label class="switch"><input name="hasDailyWorker" type="checkbox" ${p.hasDailyWorker?'checked':''}><i></i></label></div>
    <div class="modal-actions"><button class="primary-btn">변경사항 저장</button></div>
  </form>`;
}
const pages={dashboard:["대시보드",pageDashboard],finance:["매출기록",pageFinance],tax:["세금 · 신고",pageTax],clients:["클라이언트",pageClients],projects:["프로젝트",pageProjects],people:["인력 관리",pagePeople],calendar:["사업 일정",pageCalendar],analytics:["사업 분석",pageAnalytics],documents:["문서 보관",pageDocuments],calculator:["계산기",pageCalculator],settings:["사업자 설정",pageSettings]};
let currentPage="dashboard";

function render(page=currentPage){
  if(!state.profile)return;
  currentPage=page;
  $("#pageTitle").textContent=pages[page][0];
  $("#content").innerHTML=pages[page][1]();
  $$(".nav-item[data-page]").forEach(b=>b.classList.toggle("active",b.dataset.page===page));
  bindDynamic();
  updateIdentity();
}
function bindDynamic(){
  $$("[data-go]").forEach(b=>b.onclick=()=>render(b.dataset.go));
  $$("[data-open-quick]").forEach(b=>b.onclick=openQuick);
  $$("[data-task]").forEach(c=>c.onchange=()=>{
    const item=state.tasks.find(x=>x.id===Number(c.dataset.task)); if(item)item.done=c.checked; save(); render("dashboard");
  });
  $("#addClient")?.addEventListener("click",()=>{
    const name=prompt("클라이언트명을 입력하세요."); if(!name)return;
    state.clients.unshift({name,category:"미분류",status:"진행중",receivable:0}); save(); render("clients");
  });
  $("#addProject")?.addEventListener("click",()=>{
    const name=prompt("프로젝트명을 입력하세요."); if(!name)return;
    const client=prompt("클라이언트명을 입력하세요.")||"";
    const amount=Math.max(0,Number(prompt("계약금액을 입력하세요.","0")||0));
    state.projects.unshift({id:Date.now(),name,client,amount,status:"진행중",dueDate:""});
    save(); render("projects");
  });
  $("#settingsForm")?.addEventListener("submit",(e)=>{
    e.preventDefault(); const f=new FormData(e.currentTarget);
    state.profile={...state.profile,businessName:f.get("businessName"),ownerName:f.get("ownerName"),businessNumber:f.get("businessNumber")||state.profile.businessNumber||"",address:f.get("address")||state.profile.address||"",businessType:f.get("businessType"),taxType:f.get("taxType"),industry:f.get("industry"),startDate:f.get("startDate"),hasEmployee:f.get("hasEmployee")==="on",hasFreelancer:f.get("hasFreelancer")==="on",hasDailyWorker:f.get("hasDailyWorker")==="on"}; save(); updateIdentity(); render("settings");
  });
  $$("[data-calculator]").forEach(btn=>btn.addEventListener("click",()=>{
    currentCalculator=btn.dataset.calculator;
    render("calculator");
  }));
  $$("[data-calc-open]").forEach(btn=>btn.addEventListener("click",()=>{
    currentCalculator=btn.dataset.calcOpen;
    render("calculator");
  }));
  $("#calcBack")?.addEventListener("click",()=>{
    currentCalculator=null;
    render("calculator");
  });
  $$("[data-vat-mode]").forEach(btn=>btn.addEventListener("click",()=>{
    vatMode=btn.dataset.vatMode;
    render("calculator");
  }));
  $$("[data-withhold-mode]").forEach(btn=>btn.addEventListener("click",()=>{
    withholdMode=btn.dataset.withholdMode;
    render("calculator");
  }));
  $("[data-detail-calc] input").forEach(input=>input.addEventListener("input",()=>{
    runDetailedCalculator(input.closest("[data-detail-calc]"));
  }));
  $("[data-tax-guide]").forEach(btn=>btn.addEventListener("click",()=>{
    selectedTaxGuide=btn.dataset.taxGuide;
    render("tax");
  }));
  $("[data-close-guide]")?.addEventListener("click",()=>{
    selectedTaxGuide=null;
    render("tax");
  });
}
function runDetailedCalculator(card){
  const type=card.dataset.detailCalc;
  const a=Math.max(0,Number(card.querySelector("[data-a]")?.value||0));
  const b=Math.max(0,Number(card.querySelector("[data-b]")?.value||0));

  if(type==="vat"){
    let supply=0,tax=0,total=0;
    if(vatMode==="supply"){
      supply=Math.round(a);
      tax=Math.round(supply*.1);
      total=supply+tax;
    }else{
      total=Math.round(a);
      supply=Math.round(total/1.1);
      tax=total-supply;
    }
    card.querySelector("[data-vat-supply]").textContent=won(supply);
    card.querySelector("[data-vat-tax]").textContent=won(tax);
    card.querySelector("[data-vat-total]").textContent=won(total);
  }

  if(type==="withhold"){
    let gross=0,income=0,local=0,net=0;
    if(withholdMode==="gross"){
      gross=Math.round(a);
      income=Math.round(gross*.03);
      local=Math.round(gross*.003);
      net=gross-income-local;
    }else{
      net=Math.round(a);
      gross=Math.round(net/.967);
      income=Math.round(gross*.03);
      local=gross-net-income;
    }
    card.querySelector("[data-wh-gross]").textContent=won(gross);
    card.querySelector("[data-wh-income]").textContent=won(income);
    card.querySelector("[data-wh-local]").textContent=won(local);
    card.querySelector("[data-wh-net]").textContent=won(net);
  }

  if(type==="margin"){
    const profit=a-b;
    const rate=a>0?(profit/a*100):0;
    card.querySelector("[data-margin-sales]").textContent=won(a);
    card.querySelector("[data-margin-cost]").textContent=won(b);
    card.querySelector("[data-margin-result]").textContent=`${won(profit)} · ${rate.toFixed(1)}%`;
  }

  if(type==="hourly"){
    const rate=b>0?a/b:0;
    card.querySelector("[data-hour-total]").textContent=won(a);
    card.querySelector("[data-hour-rate]").textContent=b>0?`${won(rate)} / 시간`:"₩0";
  }
}
function openQuick(){
  $("#quickModal").classList.remove("hidden");
  $("#quickForm [name=date]").value=localDateInputValue();
  const taxable=$("#quickForm [name=taxable]");
  if(taxable)taxable.value=state.profile?.taxType==="면세사업자"?"exempt":"taxable";
}

$$(".nav-item[data-page]").forEach(btn=>btn.addEventListener("click",()=>{
  if(btn.dataset.page==="calculator")currentCalculator=null;
  render(btn.dataset.page);
}));
$("#openQuick").onclick=openQuick;
$$("[data-close]").forEach(b=>b.onclick=()=>$("#"+b.dataset.close).classList.add("hidden"));
$("#quickModal").addEventListener("click",e=>{if(e.target.id==="quickModal")e.currentTarget.classList.add("hidden")});
$("#quickForm").addEventListener("submit",e=>{
  e.preventDefault();const f=new FormData(e.currentTarget);
  const entered=Math.max(0,Number(f.get("amount")||0));
  const taxable=f.get("taxable")==="taxable";
  const amountMode=f.get("amountMode")||"total";
  let supplyAmount=entered,vatAmount=0,totalAmount=entered;
  if(taxable){
    if(amountMode==="supply"){
      supplyAmount=Math.round(entered);
      vatAmount=Math.round(supplyAmount*.1);
      totalAmount=supplyAmount+vatAmount;
    }else{
      totalAmount=Math.round(entered);
      supplyAmount=Math.round(totalAmount/1.1);
      vatAmount=totalAmount-supplyAmount;
    }
  }
  state.transactions.unshift({id:Date.now(),type:f.get("type"),title:f.get("title"),client:f.get("client")||"",amount:totalAmount,supplyAmount,vatAmount,taxable,date:f.get("date")});
  save();e.currentTarget.reset();$("#quickModal").classList.add("hidden");render("finance");
});
$("#onboardingForm").addEventListener("submit",e=>{
  e.preventDefault();const f=new FormData(e.currentTarget);
  state.profile={businessName:f.get("businessName"),ownerName:f.get("ownerName"),businessNumber:f.get("businessNumber")||"",address:f.get("address")||"",businessType:f.get("businessType"),taxType:f.get("taxType"),industry:f.get("industry"),startDate:f.get("startDate"),hasEmployee:f.get("hasEmployee")==="on",hasFreelancer:f.get("hasFreelancer")==="on",hasDailyWorker:f.get("hasDailyWorker")==="on"};
  save();$("#onboardingModal").classList.add("hidden");render("dashboard");
});
$("#demoStart").onclick=()=>{
  state.profile={...demoProfile};state.transactions=[...demoTransactions];state.clients=[...demoClients];state.projects=[...demoProjects];state.tasks=[
    {id:1,text:"이번 달 매출 누락 여부 확인",done:false},
    {id:2,text:"3.3% 지급내역 정리",done:false},
    {id:3,text:"미수금 입금일 확인",done:true}
  ];save();
  $("#onboardingModal").classList.add("hidden");render("dashboard");
};
$("#resetDemo").onclick=async()=>{
  if(!confirm("저장된 사업자 및 테스트 데이터를 초기화할까요?"))return;
  ["profile","transactions","clients","projects","taxInvoices","tasks"].forEach(k=>localStorage.removeItem(storageKey(k)));
  if(FIRESTORE_READY){
    try{
      await firebase.firestore().collection("businesses").doc(CLOUD_BUSINESS_ID).collection("app").doc("state").delete();
    }catch(err){console.warn("Cloud reset failed",err)}
  }
  location.reload();
};

async function bootstrapApp(){
  await hydrateCloudState();
  if(!state.profile){
    $("#onboardingModal")?.classList.remove("hidden");
  }else{
    render("dashboard");
  }
}
bootstrapApp();
