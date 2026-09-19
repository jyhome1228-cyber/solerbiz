const $=(s)=>document.querySelector(s);
const $$=(s)=>[...document.querySelectorAll(s)];
const KRW=new Intl.NumberFormat("ko-KR",{style:"currency",currency:"KRW",maximumFractionDigits:0});

const demoProfile={
  businessName:"나인웍스",
  ownerName:"박재영",
  businessType:"개인사업자",
  taxType:"일반과세자",
  industry:"디자인 서비스업",
  startDate:"2023-01-01",
  hasEmployee:true,
  hasFreelancer:true
};
const demoTransactions=[
  {id:1,type:"매출",title:"브랜드 디자인 프로젝트",client:"건강미",amount:1800000,date:"2026-09-16"},
  {id:2,type:"매출",title:"웹사이트 제작 계약금",client:"MYV",amount:2500000,date:"2026-09-12"},
  {id:3,type:"매입",title:"외주 개발비",client:"협력업체",amount:770000,date:"2026-09-11"},
  {id:4,type:"매입",title:"Adobe 구독료",client:"Adobe",amount:79000,date:"2026-09-07"},
  {id:5,type:"매출",title:"패키지 디자인",client:"CLRX",amount:1500000,date:"2026-09-05"}
];
const demoClients=[
  {name:"건강미",category:"브랜딩 · 운영",status:"진행중",receivable:1800000},
  {name:"MYV",category:"웹사이트 · 콘텐츠",status:"진행중",receivable:0},
  {name:"CLRX",category:"패키지 디자인",status:"검토중",receivable:750000},
  {name:"정월재",category:"브랜드 운영",status:"진행중",receivable:0}
];

let state={
  profile:JSON.parse(localStorage.getItem("solerbiz.profile")||"null"),
  transactions:JSON.parse(localStorage.getItem("solerbiz.transactions")||"[]"),
  clients:JSON.parse(localStorage.getItem("solerbiz.clients")||"[]"),
  tasks:JSON.parse(localStorage.getItem("solerbiz.tasks")||"null")||[
    {id:1,text:"9월 매출 누락 여부 확인",done:false},
    {id:2,text:"3.3% 지급내역 정리",done:false},
    {id:3,text:"미수금 입금일 확인",done:true}
  ]
};

function save(){
  localStorage.setItem("solerbiz.profile",JSON.stringify(state.profile));
  localStorage.setItem("solerbiz.transactions",JSON.stringify(state.transactions));
  localStorage.setItem("solerbiz.clients",JSON.stringify(state.clients));
  localStorage.setItem("solerbiz.tasks",JSON.stringify(state.tasks));
}
function esc(v=""){return String(v).replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]))}
function won(v){return KRW.format(Number(v||0))}
function getMonthData(){
  const month="2026-09";
  const list=state.transactions.filter(x=>x.date.startsWith(month));
  const sales=list.filter(x=>x.type==="매출").reduce((a,b)=>a+Number(b.amount),0);
  const costs=list.filter(x=>x.type==="매입").reduce((a,b)=>a+Number(b.amount),0);
  return {sales,costs,profit:sales-costs,list};
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

function deadlines(){
  const items=[
    {day:"10",month:"OCT",title:"원천세 신고 · 납부",desc:"3.3% 또는 직원 급여 지급 시 확인",tag:"21일 남음"},
    {day:"26",month:"OCT",title:"부가가치세 예정 신고",desc:"일반과세자 기준 신고 일정 확인",tag:"37일 남음"},
    {day:"31",month:"JAN",title:"사업장현황 관련 자료 점검",desc:"다음 연도 신고 준비 자료 정리",tag:"준비"}
  ];
  if(state.profile?.taxType==="면세사업자"){
    items[1]={day:"10",month:"FEB",title:"사업장현황신고 준비",desc:"면세사업자 관련 신고자료 확인",tag:"예정"};
  }
  return items;
}
function pageDashboard(){
  const m=getMonthData();
  const receivable=state.clients.reduce((a,b)=>a+Number(b.receivable||0),0);
  const completed=state.tasks.filter(x=>x.done).length;
  return `
    <div class="hero">
      <div><p class="eyebrow">BUSINESS OVERVIEW</p><h2>${esc(state.profile.businessName)}, 이번 달 운영 현황이에요.</h2>
      <p>매출과 신고 일정을 한 화면에서 확인하고 필요한 일만 처리하세요.</p></div>
      <div class="status">● 사업자 설정 완료 · ${esc(state.profile.taxType)}</div>
    </div>
    <div class="metrics">
      ${metric("이번 달 매출",won(m.sales),m.list.filter(x=>x.type==="매출").length+"건 등록","up")}
      ${metric("이번 달 지출",won(m.costs),m.list.filter(x=>x.type==="매입").length+"건 등록")}
      ${metric("예상 영업잔액",won(m.profit),"매출 - 등록 지출")}
      ${metric("미수금",won(receivable),state.clients.filter(x=>x.receivable>0).length+"개 거래처","")}
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
            <div class="row"><div class="date-badge">${t.date.slice(8,10)}<small>SEP</small></div><div><strong>${esc(t.title)}</strong><p>${esc(t.client||t.type)} · ${t.date}</p></div><strong class="${t.type==='매출'?'positive':'negative'}">${t.type==='매출'?'+':'-'}${won(t.amount)}</strong></div>`).join("")||'<div class="empty">등록된 거래가 없습니다.</div>'}
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
            <button class="quick-card" data-open-quick><strong>거래 등록</strong><span>매출·매입 기록</span></button>
            <button class="quick-card" data-calc-open="withhold"><strong>3.3% 계산</strong><span>지급액 바로 계산</span></button>
            <button class="quick-card" data-go="clients"><strong>거래처</strong><span>미수금 확인</span></button>
          </div>
        </div>
      </div>
    </div>`;
}
function metric(label,value,note,cls=""){
  return `<div class="metric"><div class="label">${label}</div><strong class="${cls}">${value}</strong><small>${note}</small></div>`;
}
function pageFinance(){
  const m=getMonthData();
  return `
  <div class="section-title"><div><p class="eyebrow">MONEY FLOW</p><h2>매출 · 매입</h2></div><button class="primary-btn" data-open-quick>+ 거래 등록</button></div>
  <div class="metrics">${metric("9월 매출",won(m.sales),"등록 기준","up")}${metric("9월 매입",won(m.costs),"등록 기준")}${metric("영업잔액",won(m.profit),"단순 참고값")}${metric("등록 건수",m.list.length+"건","2026년 9월")}</div>
  <div class="table-card"><table class="table"><thead><tr><th>거래일</th><th>구분</th><th>내용</th><th>거래처</th><th class="money">금액</th></tr></thead><tbody>
  ${state.transactions.slice().sort((a,b)=>b.date.localeCompare(a.date)).map(t=>`<tr><td>${t.date}</td><td><span class="pill ${t.type==='매출'?'success':''}">${t.type}</span></td><td>${esc(t.title)}</td><td>${esc(t.client||'-')}</td><td class="money ${t.type==='매출'?'positive':'negative'}">${t.type==='매출'?'+':'-'}${won(t.amount)}</td></tr>`).join("")||'<tr><td colspan="5" class="empty">거래를 등록해보세요.</td></tr>'}
  </tbody></table></div>`;
}
function pageTax(){
  return `
  <div class="section-title"><div><p class="eyebrow">TAX & FILING</p><h2>세금 · 신고</h2></div></div>
  <div class="notice">현재 화면은 운영 테스트용 안내입니다. 실제 신고 의무와 기한은 사업자 상태·귀속기간 등에 따라 달라질 수 있으므로 서비스화 단계에서 공식 데이터 기준으로 연결해야 합니다.</div>
  <div class="tax-grid">
    ${taxCard("부가가치세","매출·매입 자료를 기준으로 신고 준비 상태를 확인합니다.","10.26","예정 신고","거래자료 5건 등록")}
    ${taxCard("원천세","직원 급여 또는 3.3% 인력 지급내역을 월별로 관리합니다.","10.10","다음 신고","3.3% 인력 사용 설정")}
    ${taxCard("종합소득세","연간 수입·필요경비 자료를 누적하여 신고 준비도를 보여줍니다.","05.31","연간 일정","자료 누적 중")}
    ${taxCard("4대보험","상시 직원이 있다면 취득·상실과 월 보험료 관련 업무를 정리합니다.","매월","관리","직원 있음")}
  </div>`;
}
function taxCard(title,desc,date,label,status){
  return `<div class="tax-card"><div class="top"><div><h3>${title}</h3><p>${desc}</p></div><div class="due">${date}<small>${label}</small></div></div><span class="pill">${status}</span></div>`;
}
function pageClients(){
  return `
  <div class="section-title"><div><p class="eyebrow">CLIENTS</p><h2>클라이언트</h2></div><button class="primary-btn" id="addClient">+ 거래처 추가</button></div>
  <div class="table-card"><table class="table"><thead><tr><th>클라이언트</th><th>업무</th><th>상태</th><th class="money">미수금</th></tr></thead><tbody>
  ${state.clients.map(c=>`<tr><td><strong>${esc(c.name)}</strong></td><td>${esc(c.category)}</td><td><span class="pill ${c.status==='진행중'?'success':''}">${esc(c.status)}</span></td><td class="money ${c.receivable>0?'negative':''}">${won(c.receivable)}</td></tr>`).join("")||'<tr><td colspan="4" class="empty">등록된 클라이언트가 없습니다.</td></tr>'}
  </tbody></table></div>`;
}
function pagePeople(){
  const rows=[];
  if(state.profile.hasEmployee)rows.push(["4대보험 직원","상시 인력","취득·급여·보험료 관리","사용 중"]);
  if(state.profile.hasFreelancer)rows.push(["3.3% 인력","사업소득 지급","지급명세·원천세 관리","사용 중"]);
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
  </div><div class="notice" style="margin-top:14px">테스트 버전에서는 문서 분류 UI만 구성되어 있습니다. 실제 파일 저장은 Firebase/Supabase 또는 별도 스토리지 연결 단계에서 구현합니다.</div>`;
}
let currentCalculator=null;
let vatMode="supply";
let withholdMode="gross";

const calculatorItems=[
  {id:"vat",title:"부가세 계산",desc:"공급가액 또는 합계금액을 기준으로 부가세를 계산합니다.",meta:"정방향 · 역산"},
  {id:"withhold",title:"3.3% 원천징수",desc:"지급총액과 실수령액을 서로 계산하고 세액을 나눠 확인합니다.",meta:"소득세 3% + 지방소득세 0.3%"},
  {id:"margin",title:"마진 계산",desc:"매출액과 비용을 기준으로 이익과 마진율을 계산합니다.",meta:"수익성 확인"},
  {id:"hourly",title:"프로젝트 단가",desc:"프로젝트 금액과 투입시간을 기준으로 시간당 단가를 계산합니다.",meta:"작업 효율 확인"}
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
          <div class="calculator-menu-icon">${String(index+1).padStart(2,"0")}</div>
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
function pageSettings(){
  const p=state.profile;
  return `<div class="section-title"><div><p class="eyebrow">BUSINESS PROFILE</p><h2>사업자 설정</h2></div></div>
  <form id="settingsForm" class="settings-grid card">
    <label>상호명<input name="businessName" value="${esc(p.businessName)}"></label>
    <label>대표자명<input name="ownerName" value="${esc(p.ownerName)}"></label>
    <label>사업자 형태<select name="businessType"><option ${p.businessType==='개인사업자'?'selected':''}>개인사업자</option><option ${p.businessType==='법인사업자'?'selected':''}>법인사업자</option></select></label>
    <label>과세 유형<select name="taxType"><option ${p.taxType==='일반과세자'?'selected':''}>일반과세자</option><option ${p.taxType==='간이과세자'?'selected':''}>간이과세자</option><option ${p.taxType==='면세사업자'?'selected':''}>면세사업자</option></select></label>
    <label>업종<input name="industry" value="${esc(p.industry||'')}"></label>
    <label>개업일<input type="date" name="startDate" value="${esc(p.startDate||'')}"></label>
    <div class="check-card"><span>직원(4대보험) 고용</span><label class="switch"><input name="hasEmployee" type="checkbox" ${p.hasEmployee?'checked':''}><i></i></label></div>
    <div class="check-card"><span>3.3% 인력 사용</span><label class="switch"><input name="hasFreelancer" type="checkbox" ${p.hasFreelancer?'checked':''}><i></i></label></div>
    <div class="modal-actions"><button class="primary-btn">변경사항 저장</button></div>
  </form>`;
}
const pages={dashboard:["대시보드",pageDashboard],finance:["매출 · 매입",pageFinance],tax:["세금 · 신고",pageTax],clients:["클라이언트",pageClients],people:["인력 관리",pagePeople],calendar:["사업 일정",pageCalendar],documents:["문서 보관",pageDocuments],calculator:["계산기",pageCalculator],settings:["사업자 설정",pageSettings]};
let currentPage="dashboard";

function render(page=currentPage){
  if(!state.profile)return;
  currentPage=page;
  $("#pageTitle").textContent=pages[page][0];
  $("#content").innerHTML=pages[page][1]();
  $$$(".nav-item[data-page]").forEach(b=>b.classList.toggle("active",b.dataset.page===page));
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
  $("#settingsForm")?.addEventListener("submit",(e)=>{
    e.preventDefault(); const f=new FormData(e.currentTarget);
    state.profile={...state.profile,businessName:f.get("businessName"),ownerName:f.get("ownerName"),businessType:f.get("businessType"),taxType:f.get("taxType"),industry:f.get("industry"),startDate:f.get("startDate"),hasEmployee:f.get("hasEmployee")==="on",hasFreelancer:f.get("hasFreelancer")==="on"}; save(); updateIdentity(); render("settings");
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
  $$("[data-detail-calc] input").forEach(input=>input.addEventListener("input",()=>{
    runDetailedCalculator(input.closest("[data-detail-calc]"));
  }));
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
  $("#quickForm [name=date]").value=new Date().toISOString().slice(0,10);
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
  state.transactions.unshift({id:Date.now(),type:f.get("type"),title:f.get("title"),client:"",amount:Number(f.get("amount")),date:f.get("date")});
  save();e.currentTarget.reset();$("#quickModal").classList.add("hidden");render("finance");
});
$("#onboardingForm").addEventListener("submit",e=>{
  e.preventDefault();const f=new FormData(e.currentTarget);
  state.profile={businessName:f.get("businessName"),ownerName:f.get("ownerName"),businessType:f.get("businessType"),taxType:f.get("taxType"),industry:f.get("industry"),startDate:f.get("startDate"),hasEmployee:f.get("hasEmployee")==="on",hasFreelancer:f.get("hasFreelancer")==="on"};
  save();$("#onboardingModal").classList.add("hidden");render("dashboard");
});
$("#demoStart").onclick=()=>{
  state.profile={...demoProfile};state.transactions=[...demoTransactions];state.clients=[...demoClients];save();
  $("#onboardingModal").classList.add("hidden");render("dashboard");
};
$("#resetDemo").onclick=()=>{
  if(!confirm("저장된 테스트 데이터를 초기화할까요?"))return;
  ["solerbiz.profile","solerbiz.transactions","solerbiz.clients","solerbiz.tasks"].forEach(k=>localStorage.removeItem(k));
  state.profile={...demoProfile};
  state.transactions=[...demoTransactions];
  state.clients=[...demoClients];
  state.tasks=[
    {id:1,text:"9월 매출 누락 여부 확인",done:false},
    {id:2,text:"3.3% 지급내역 정리",done:false},
    {id:3,text:"미수금 입금일 확인",done:true}
  ];
  save();
  currentCalculator=null;
  render("dashboard");
};
// TEST MODE: skip onboarding and open the dashboard immediately.
$("#onboardingModal")?.classList.add("hidden");
if(!state.profile)state.profile={...demoProfile};
if(!state.transactions.length)state.transactions=[...demoTransactions];
if(!state.clients.length)state.clients=[...demoClients];
save();
render("dashboard");
