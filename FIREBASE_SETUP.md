# SOLARBIZ. Firebase 설정

Solarbiz.는 Firebase Authentication을 기준으로 로그인하며, 다음 단계에서 Firestore와 Storage로 사업 데이터를 이전합니다.

## 1. Firebase 프로젝트 생성

Firebase Console에서 새 프로젝트를 만들고 Web App을 추가합니다.

Project settings > Your apps > Firebase SDK snippet에서 아래 값을 확인합니다.

- apiKey
- authDomain
- projectId
- storageBucket
- messagingSenderId
- appId

## 2. config.js 입력

```js
window.SOLAR_BIZ_FIREBASE = {
  config: {
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_PROJECT.firebaseapp.com",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_PROJECT.appspot.com",
    messagingSenderId: "YOUR_SENDER_ID",
    appId: "YOUR_APP_ID"
  },
  allowLocalPreview: false
};
```

개발 중에는 `allowLocalPreview: true`로 둘 수 있지만 실제 공개 전에는 false로 변경합니다.

## 3. Authentication

Firebase Console > Authentication > Sign-in method에서 Email/Password를 활성화합니다.

현재 구현:

- 이메일/비밀번호 회원가입
- 이메일/비밀번호 로그인
- 로그인 세션 유지
- 로그아웃
- 비로그인 사용자의 /dashboard 접근 차단
- 로그인된 사용자의 /login 접근 시 /dashboard 자동 이동

## 4. 현재 Route

- `/solerbiz/` — 제품 랜딩
- `/solerbiz/login/` — 로그인 / 회원가입
- `/solerbiz/dashboard/` — 인증 사용자용 앱

## 5. 데이터

현재 MVP 사업 데이터는 사용자 UID별 localStorage에 분리되어 있습니다.

다음 단계에서는 Firestore로 이전합니다.

권장 컬렉션:

- users
- businesses
- businessMembers
- clients
- projects
- transactions
- invoices
- payments
- expenses
- workers
- payroll
- taxTasks
- documents

모든 사업 데이터는 `businessId`와 사용자 권한을 기준으로 분리합니다.

## 6. Firestore Security Rules

실서비스에서는 반드시 Security Rules를 적용합니다.

기본 원칙:

- 로그인 사용자만 접근
- 자신이 소속된 business 데이터만 조회/수정
- 클라이언트에서 관리자 권한 우회 불가
- 주민번호 등 민감정보는 최소 수집 및 별도 보호

## 7. Storage

계약서, 사업자등록증, 견적서, 증빙 등 파일은 Firebase Storage에 저장합니다.

권장 경로:

```
businesses/{businessId}/documents/{documentId}
```

## 배포 전 체크

- [ ] Firebase Web App 생성
- [ ] config.js 입력
- [ ] Email/Password Auth 활성화
- [ ] allowLocalPreview false
- [ ] Firestore 생성
- [ ] Security Rules 적용
- [ ] Storage 생성 및 Rules 적용
- [ ] dashboard 직접 접근 차단 확인
