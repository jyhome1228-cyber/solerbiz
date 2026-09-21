(()=>{
  const config=window.SOLER_BIZ_CONFIG||{};
  const gate=document.querySelector("#authGate");
  const app=document.querySelector("#app");
  const form=document.querySelector("#authForm");
  const emailInput=document.querySelector("#authEmail");
  const passwordInput=document.querySelector("#authPassword");
  const message=document.querySelector("#authMessage");
  const signUpBtn=document.querySelector("#authSignUp");
  const previewBtn=document.querySelector("#authPreview");
  const logoutBtn=document.querySelector("#logoutBtn");
  const accountEmail=document.querySelector("#accountEmail");

  let client=null;
  let appLoaded=false;

  function setMessage(text,type=""){
    if(!message)return;
    message.textContent=text||"";
    message.dataset.type=type;
  }

  function setBusy(busy){
    form?.querySelectorAll("button,input").forEach(el=>{
      if(el.id!=="authPreview")el.disabled=busy;
    });
  }

  function hasSupabaseConfig(){
    return Boolean(config.supabaseUrl&&config.supabaseAnonKey&&window.supabase?.createClient);
  }

  function loadApp(user){
    if(appLoaded)return;
    appLoaded=true;
    window.SOLER_BIZ_USER={
      id:user?.id||"local-preview",
      email:user?.email||"local-preview@soler.biz",
      isLocalPreview:!user?.id
    };
    if(accountEmail)accountEmail.textContent=window.SOLER_BIZ_USER.isLocalPreview?"로컬 미리보기":window.SOLER_BIZ_USER.email;
    gate?.classList.add("hidden");
    app?.classList.remove("hidden");
    document.body.classList.remove("auth-pending");
    const script=document.createElement("script");
    script.src="./app.js";
    script.defer=true;
    document.body.appendChild(script);
  }

  async function signIn(){
    if(!client)return;
    const email=emailInput.value.trim();
    const password=passwordInput.value;
    if(!email||!password){
      setMessage("이메일과 비밀번호를 입력해주세요.","error");
      return;
    }
    setBusy(true);
    setMessage("로그인 중입니다.");
    const {data,error}=await client.auth.signInWithPassword({email,password});
    setBusy(false);
    if(error){
      setMessage("이메일 또는 비밀번호를 확인해주세요.","error");
      return;
    }
    loadApp(data.user);
  }

  async function signUp(){
    if(!client)return;
    const email=emailInput.value.trim();
    const password=passwordInput.value;
    if(!email||password.length<8){
      setMessage("이메일과 8자 이상의 비밀번호를 입력해주세요.","error");
      return;
    }
    setBusy(true);
    setMessage("계정을 생성하고 있습니다.");
    const {data,error}=await client.auth.signUp({
      email,
      password,
      options:{
        emailRedirectTo:location.origin+location.pathname
      }
    });
    setBusy(false);
    if(error){
      setMessage(error.message||"회원가입 중 오류가 발생했습니다.","error");
      return;
    }
    if(data.session){
      loadApp(data.user);
    }else{
      setMessage("가입 확인 메일을 보냈습니다. 이메일 인증 후 로그인해주세요.","success");
    }
  }

  async function init(){
    if(!hasSupabaseConfig()){
      setMessage("Supabase 인증 설정 전입니다. 개발 미리보기만 사용할 수 있습니다.","warn");
      if(previewBtn)previewBtn.hidden=!config.allowLocalPreview;
      form?.querySelectorAll("input,button").forEach(el=>{
        if(el.id!=="authPreview")el.disabled=true;
      });
      return;
    }

    previewBtn?.setAttribute("hidden","");
    client=window.supabase.createClient(config.supabaseUrl,config.supabaseAnonKey,{
      auth:{
        persistSession:true,
        autoRefreshToken:true,
        detectSessionInUrl:true
      }
    });
    window.SOLER_BIZ_SUPABASE=client;

    const {data,error}=await client.auth.getSession();
    if(error){
      setMessage("로그인 상태를 확인하지 못했습니다. 다시 로그인해주세요.","error");
    }else if(data.session?.user){
      loadApp(data.session.user);
      return;
    }

    client.auth.onAuthStateChange((_event,session)=>{
      if(session?.user&&!appLoaded)loadApp(session.user);
    });
  }

  form?.addEventListener("submit",e=>{
    e.preventDefault();
    signIn();
  });
  signUpBtn?.addEventListener("click",signUp);
  previewBtn?.addEventListener("click",()=>{
    if(!config.allowLocalPreview)return;
    loadApp(null);
  });
  logoutBtn?.addEventListener("click",async()=>{
    if(window.SOLER_BIZ_USER?.isLocalPreview){
      location.reload();
      return;
    }
    if(client)await client.auth.signOut();
    location.reload();
  });

  init();
})();