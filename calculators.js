(()=>{
  const won=v=>new Intl.NumberFormat("ko-KR",{style:"currency",currency:"KRW",maximumFractionDigits:0}).format(Number(v||0));
  let vatMode="supply";
  let whMode="gross";
  const q=s=>document.querySelector(s);
  const qa=s=>[...document.querySelectorAll(s)];

  function runVat(){
    const input=Math.max(0,Number(q("[data-public-vat-input]")?.value||0));
    let supply=0,tax=0,total=0;
    if(vatMode==="supply"){
      supply=Math.round(input); tax=Math.round(supply*.1); total=supply+tax;
    }else{
      total=Math.round(input); supply=Math.round(total/1.1); tax=total-supply;
    }
    q("[data-public-vat-supply]").textContent=won(supply);
    q("[data-public-vat-tax]").textContent=won(tax);
    q("[data-public-vat-total]").textContent=won(total);
  }
  function runWh(){
    const input=Math.max(0,Number(q("[data-public-wh-input]")?.value||0));
    let gross=0,income=0,local=0,net=0;
    if(whMode==="gross"){
      gross=Math.round(input); income=Math.round(gross*.03); local=Math.round(gross*.003); net=gross-income-local;
    }else{
      net=Math.round(input); gross=Math.round(net/.967); income=Math.round(gross*.03); local=gross-net-income;
    }
    q("[data-public-wh-gross]").textContent=won(gross);
    q("[data-public-wh-income]").textContent=won(income);
    q("[data-public-wh-local]").textContent=won(local);
    q("[data-public-wh-net]").textContent=won(net);
  }

  qa("[data-public-vat-mode]").forEach(btn=>btn.addEventListener("click",()=>{
    vatMode=btn.dataset.publicVatMode;
    qa("[data-public-vat-mode]").forEach(x=>x.classList.toggle("active",x===btn));
    q("[data-public-vat-label]").textContent=vatMode==="supply"?"공급가액":"VAT 포함 합계금액";
    q("[data-public-vat-input]").value="";
    runVat();
  }));
  qa("[data-public-wh-mode]").forEach(btn=>btn.addEventListener("click",()=>{
    whMode=btn.dataset.publicWhMode;
    qa("[data-public-wh-mode]").forEach(x=>x.classList.toggle("active",x===btn));
    q("[data-public-wh-label]").textContent=whMode==="gross"?"세전 지급총액":"실제 실수령액";
    q("[data-public-wh-input]").value="";
    runWh();
  }));
  q("[data-public-vat-input]")?.addEventListener("input",runVat);
  q("[data-public-wh-input]")?.addEventListener("input",runWh);
})();