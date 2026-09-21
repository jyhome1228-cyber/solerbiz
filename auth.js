(()=>{
  const settings=window.SOLAR_BIZ_FIREBASE||{};
  const context=document.body.dataset.authContext||"";
  const loginPath="../login/";
  const dashboardPath="../dashboard/";
  const previewKey="solarbiz.localPreview";

  const hasFirebaseConfig=()=>{
    const c=settings.config||{};
    return Boolean(c.apiKey&&c.authDomain&&c.projectId&&c.appId&&window.firebase);
  };

  const setMessage=(text,type="")=>{
    const el=document.querySelector("#authMessage");
    if(!el)return;
    el.textContent=text||"";
    el.dataset.type=type;
  };

  const setBusy=(busy)=>{
    document.querySelectorAll("#authForm input,#authForm button").forEach(el=>{
      if(el.id!=="authPreview")el.disabled=busy;
    });
  };

  const loadDashboardApp=(user)=>{
    window.SOLAR_BIZ_USER={
      id:user?.uid||"local-preview",
      email:user?.email||"local-preview@solar.biz",
      isLocalPreview:!user?.uid
    };
    const accountEmail=document.querySelector("#accountEmail");
    if(accountEmail){
      accountEmail.textContent=window.SOLAR_BIZ_USER.isLocalPreview
        ?"로컬 미리보기"
        :window.SOLAR_BIZ_USER.email;
    }
    document.querySelector("#app")?.classList.remove("hidden");
    document.body.classList.remove("auth-pending");
    if(!document.querySelector('script[data-solar-app]')){
      const script=document.createElement("script");
      script.src="../app.js";
      script.defer=true;
      script.dataset.solarApp="true";
      document.body.appendChild(script);
    }
  };

  const showLogin=()=>{
    document.querySelector("#authGate")?.classList.remove("hidden");
    document.body.classList.remove("auth-pending");
  };

  async function initFirebase(){
    if(!hasFirebaseConfig())return null;
    if(!firebase.apps.length)firebase.initializeApp(settings.config);
    return firebase.auth();
  }

  async function initLogin(){
    const form=document.querySelector("#authForm");
    const email=document.querySelector("#authEmail");
    const password=document.querySelector("#authPassword");
    const signUp=document.querySelector("#authSignUp");
    const preview=document.querySelector("#authPreview");
    const mode=new URLSearchParams(location.search).get("mode");

    // 개발 미리보기는 Firebase 설정 여부와 관계없이 먼저 바인딩한다.
    preview?.addEventListener("click",()=>{
      if(!settings.allowLocalPreview)return;
      localStorage.setItem(previewKey,"1");
      location.replace(dashboardPath);
    });

    if(mode==="signup"){
      document.querySelector("#authTitle").textContent="Solarbiz. 시작하기";
      document.querySelector("#authSubmitLabel").textContent="로그인";
    }

    const auth=await initFirebase();
    if(!auth){
      showLogin();
      setMessage("Firebase 인증 설정 전입니다. 개발 미리보기만 사용할 수 있습니다.","warn");
      if(preview)preview.hidden=!settings.allowLocalPreview;
      form?.querySelectorAll("input,button").forEach(el=>{
        if(el.id!=="authPreview")el.disabled=true;
      });
      return;
    }

    preview.hidden=true;
    auth.onAuthStateChanged(user=>{
      if(user){
        location.replace(dashboardPath);
      }else{
        showLogin();
      }
    });

    form?.addEventListener("submit",async e=>{
      e.preventDefault();
      const mail=email.value.trim();
      const pw=password.value;
      if(!mail||!pw){
        setMessage("이메일과 비밀번호를 입력해주세요.","error");
        return;
      }
      setBusy(true);
      setMessage("로그인 중입니다.");
      try{
        await auth.signInWithEmailAndPassword(mail,pw);
      }catch(err){
        setMessage("이메일 또는 비밀번호를 확인해주세요.","error");
        setBusy(false);
      }
    });

    signUp?.addEventListener("click",async()=>{
      const mail=email.value.trim();
      const pw=password.value;
      if(!mail||pw.length<8){
        setMessage("이메일과 8자 이상의 비밀번호를 입력해주세요.","error");
        return;
      }
      setBusy(true);
      setMessage("계정을 생성하고 있습니다.");
      try{
        const credential=await auth.createUserWithEmailAndPassword(mail,pw);
        if(credential.user&&!credential.user.emailVerified){
          try{await credential.user.sendEmailVerification();}catch(_){}
        }
        location.replace(dashboardPath);
      }catch(err){
        setMessage(err?.message||"회원가입 중 오류가 발생했습니다.","error");
        setBusy(false);
      }
    });

  }

  async function initDashboard(){
    const logout=document.querySelector("#logoutBtn");

    if(localStorage.getItem(previewKey)==="1"&&settings.allowLocalPreview){
      loadDashboardApp(null);
      logout?.addEventListener("click",()=>{
        localStorage.removeItem(previewKey);
        location.replace(loginPath);
      });
      return;
    }

    const auth=await initFirebase();
    if(!auth){
      location.replace(loginPath);
      return;
    }

    let resolved=false;
    auth.onAuthStateChanged(user=>{
      if(resolved)return;
      resolved=true;
      if(!user){
        location.replace(loginPath);
        return;
      }
      loadDashboardApp(user);
    });

    logout?.addEventListener("click",async()=>{
      try{await auth.signOut();}finally{
        location.replace(loginPath);
      }
    });
  }

  if(context==="login")initLogin();
  if(context==="dashboard")initDashboard();
})();