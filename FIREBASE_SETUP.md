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

Firestore는 **프로덕션 모드**로 생성합니다. 기본 `allow read, write: if false;` 상태는 안전하지만 앱 데이터도 모두 차단합니다.

저장소의 `firestore.rules`를 Firebase Console > Firestore Database > 규칙에 붙여넣거나 Firebase CLI로 배포합니다.

현재 MVP 규칙:

- `users/{uid}` — 본인만 읽기/쓰기
- `businesses/{businessId}` — `ownerUid`와 로그인 UID가 일치하는 소유자만 접근
- `businesses/{businessId}/**` — 소유자만 모든 하위 데이터 접근
- 그 외 경로 — 전부 차단

현재 규칙은 **1인사업자/단일 소유자 MVP 기준**입니다. TEAM 플랜을 실제 구현할 때 `members` 및 역할 기반 권한으로 확장합니다.

중요:

- 클라이언트 코드에서 관리자 권한을 만들지 않음
- `ownerUid`는 생성 후 일반 업데이트로 변경할 수 없게 유지
- 주민번호 등 민감정보는 최소 수집하고 Firestore에 평문 저장하지 않는 방향으로 설계

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
