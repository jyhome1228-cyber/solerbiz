# SOLER BIZ

1인 사업자가 **세금, 매출·매입, 클라이언트, 인력, 일정, 문서**를 한 곳에서 관리하기 위한 사업 운영 OS 프로토타입입니다.

## 로그인 / 계정

- Supabase Auth 기반 이메일·비밀번호 로그인 구조
- 세션 유지 / 로그아웃
- 사용자 ID 기준 localStorage 데이터 분리
- Supabase 미연결 시 개발 미리보기 모드
- 실제 연결 방법은 `SUPABASE_SETUP.md` 참고

> 실제 서비스 공개 전에는 `config.js`에 Supabase Project URL과 publishable/anon key를 입력하고 `allowLocalPreview: false`로 변경해야 합니다.

## 현재 테스트 버전

처음 접속하면 사업자 기본 정보를 입력하고, 입력값을 기준으로 맞춤형 대시보드를 생성합니다.

- 사업자 기본 설정
- 월 매출 · 매입 요약
- 거래 빠른 등록
- 미수금 현황
- 세금 · 신고 일정 UI
- 직원 / 3.3% 인력 관리 구조
- 사업 일정
- 문서 보관 구조
- 부가세 / 3.3% / 마진 / 프로젝트 시급 계산기
- 브라우저 localStorage 저장
- 테스트 데이터 초기화

## 실행

별도 빌드 과정이 없는 정적 웹앱입니다.

```bash
git clone https://github.com/jyhome1228-cyber/solerbiz.git
cd solerbiz
open index.html
```

또는 GitHub Pages에서 `main / root`를 배포 소스로 설정하면 바로 웹에서 테스트할 수 있습니다.

## GitHub Pages 설정

Repository → **Settings → Pages → Build and deployment → Deploy from a branch**

- Branch: `main`
- Folder: `/ (root)`

저장 후 생성되는 Pages URL에서 테스트합니다.

## 데이터 구조 방향

현재는 UI 검증을 위해 localStorage를 사용합니다. 실제 서비스 단계에서는 다음 구조로 확장할 예정입니다.

1. 사용자 / 사업자 계정
2. 거래 및 세금계산서 데이터
3. 클라이언트 / 프로젝트 / 계약 / 미수금
4. 직원 / 3.3% 인력 / 지급내역
5. 신고 일정 자동 생성
6. 파일 스토리지
7. 홈택스 등 외부 데이터 연동 검토
8. 알림 / 리마인드

> 현재 세금 및 신고 화면은 기획 테스트용입니다. 실제 신고 의무·기한·세액은 공식 데이터와 사업자별 조건을 기준으로 검증 및 연동해야 합니다.
