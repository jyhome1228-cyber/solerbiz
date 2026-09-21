# SOLER BIZ 로그인 설정

SOLER BIZ는 정적 GitHub Pages에서도 사용할 수 있도록 Supabase Auth의 이메일/비밀번호 로그인을 기준으로 구성되어 있습니다.

## 1. Supabase 프로젝트 생성

1. Supabase에서 새 프로젝트를 생성합니다.
2. Project Settings > API에서 아래 값을 확인합니다.
   - Project URL
   - Publishable key 또는 anon key
3. 절대 service_role key를 브라우저 코드에 넣지 않습니다.

## 2. config.js 설정

`config.js`에 값을 입력합니다.

```js
window.SOLER_BIZ_CONFIG = {
  supabaseUrl: "https://YOUR_PROJECT.supabase.co",
  supabaseAnonKey: "YOUR_PUBLISHABLE_OR_ANON_KEY",
  allowLocalPreview: false
};
```

실서비스 배포 전에는 반드시 `allowLocalPreview: false`로 변경합니다.

## 3. Authentication URL 설정

Supabase Authentication의 URL Configuration에서 다음을 등록합니다.

- Site URL: 실제 SOLER BIZ 주소
- Redirect URLs: GitHub Pages 주소 및 필요한 Preview 주소

예:
`https://jyhome1228-cyber.github.io/solerbiz/`

## 4. 이메일 로그인

현재 구현된 기능:

- 이메일/비밀번호 회원가입
- 이메일/비밀번호 로그인
- 세션 유지
- 로그아웃
- 사용자별 localStorage 데이터 분리
- 이메일 인증이 켜져 있으면 인증 메일 안내

## 5. 현재 데이터 저장 방식

로그인은 Supabase Auth를 사용하지만, 현재 사업 데이터는 브라우저 localStorage에 저장됩니다.

사용자별 키 예:

```
solerbiz.<USER_ID>.profile
solerbiz.<USER_ID>.transactions
solerbiz.<USER_ID>.clients
solerbiz.<USER_ID>.projects
solerbiz.<USER_ID>.tasks
```

따라서 같은 브라우저에서 서로 다른 사용자가 로그인해도 데이터가 섞이지 않습니다.

단, 기기 간 동기화와 서버 백업은 아직 제공하지 않습니다.

## 6. 다음 단계: Supabase Database

실서비스 단계에서는 다음 테이블을 Supabase Postgres로 이전합니다.

- businesses
- business_members
- clients
- projects
- transactions
- invoices
- payments
- expenses
- workers
- payroll
- tax_tasks
- documents

모든 테이블에 `business_id` 또는 `user_id`를 두고 RLS(Row Level Security)를 활성화해야 합니다.

기본 원칙:

- authenticated 사용자만 데이터 접근
- 본인이 속한 business 데이터만 조회/수정
- service_role key는 서버에서만 사용
- 주민등록번호 등 민감정보는 별도 암호화/최소수집

## 7. 배포 전 체크

- [ ] config.js에 실제 Supabase URL 입력
- [ ] publishable/anon key 입력
- [ ] allowLocalPreview false
- [ ] Site URL / Redirect URL 등록
- [ ] 이메일 인증 정책 결정
- [ ] 비밀번호 정책 확인
- [ ] RLS 적용 후 DB 연동
- [ ] 개인정보 처리방침 및 보관정책 준비
