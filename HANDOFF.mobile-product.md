# 모바일 상품 상세 구현 인수인계

## 요청

지정 Cafe24 상품 상세 페이지의 모바일 기능 구현 후 git 커밋.

## 대상

- `cafe24/mobile/index.html`
- `cafe24/mobile/js/module/product/detail-enhance-options.js` (신규)
- `cafe24/mobile/css/module/product/detail.css`

## 현재 상태

- 실제 상세 템플릿인 `cafe24/mobile/product/detail.html`에 JS 등록 1줄 추가를 사용자 승인.
- 구현·git 커밋 완료.
- `mobile/index.html`은 홈 전용이라 변경하지 않음.
- 모바일은 `#product-data`가 없으므로 `#product_price`와 `window.product_price`로 원가를 읽음.

## 검증

- `node --check cafe24/mobile/js/module/product/detail-enhance-options.js` 통과.
- 실제 `/m/product/.../11/` HTML JSDOM에서 4개 수량 피커·할인율 생성 통과.
- `window.product_price` fallback과 Cafe24 native 옵션 행 연결·추가옵션 주입 통과.
- `npm test`는 기존 실패: sandbox의 `listen EPERM`, 기존 skin1 테스트 기대 문자열 불일치, 빈 `public/script-ignis.js`.
- TODO: `TODO.mobile-product.md` 참고.

## 다음 순서

1. 작업 완료.
