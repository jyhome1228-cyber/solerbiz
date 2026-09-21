(()=>{
  const form=document.querySelector("#inquiryForm");
  const status=document.querySelector("#inquiryStatus");
  if(!form)return;

  form.addEventListener("submit",e=>{
    e.preventDefault();
    if(!form.reportValidity())return;
    if(status){
      status.innerHTML='도입문의 접수 기능을 준비 중입니다. <a href="https://aesost.com/" target="_blank" rel="noopener">AESOST에서 문의하기 ↗</a>';
    }
  });
})();