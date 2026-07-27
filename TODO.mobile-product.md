# 모바일 상품 상세 구현 TODO

- [x] 작업 범위/대상 파일 확인
- [x] 세션 인수인계 문서 생성
- [x] 기존 모바일 템플릿·옵션 흐름 조사
- [x] 원본 상품 페이지 모바일 기능 조사
- [x] 구현 범위 확정 (`$grill-me` 질의)
- [x] 실제 상세 템플릿의 JS 등록 허용
- [x] 실제 상세 템플릿에 JS 등록 (`mobile/product/detail.html`)
- [x] `cafe24/mobile/js/module/product/detail-enhance-options.js` 생성
- [x] `cafe24/mobile/css/module/product/detail.css` 반영
- [x] 정적/DOM 검증
- [x] 변경 검토 완료
- [x] git 커밋

## UI 축소 회귀 수정

- [x] 실제 모바일 HTML에서 100px 폭 재현
- [x] `table-layout: fixed`와 100px `col` 충돌 확인
- [x] 옵션 피커 테이블만 자동 레이아웃 적용
- [x] Chrome 390px에서 전체 폭·기능 재검증
- [x] 수정 git 커밋

## 변경 제약

- 사용자 지정 3개 구현 파일만 수정.
- 이 TODO와 `HANDOFF.mobile-product.md`는 진행/인수인계용으로 추가.
- `mobile/index.html`은 홈 템플릿이므로 변경하지 않음. 사용자 승인으로 실제 상세 템플릿의 JS 등록 1줄 추가.
