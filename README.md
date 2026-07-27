# Cafe24 상품 옵션 UI

Cafe24 기본 상품 옵션을 유지하면서 묶음 수량·맛 선택 UI를 추가한 점진적 개선 방식입니다.

## ① 옵션 UI 구현 방식

- Cafe24가 만든 원본 옵션 중 `10개입_1`, `30개입_1` 형태의 항목을 찾아 묶음 수량별 선택 UI를 생성합니다.
- 수량 UI에는 총액, 할인율, 개당 가격, 배지를 표시합니다.
- 수량 선택 후 맛별 10개 묶음을 조합하며, 선택 합계가 목표 수량과 같을 때만 `선택완료`가 활성화됩니다.
- PC는 인라인 패널, 모바일은 `<dialog>` 기반 BottomSheet를 사용합니다. 공통 로직은 코어에 두고 DOM 차이만 PC·모바일 어댑터에서 처리합니다.
- 선택 상품 영역을 별도로 복제하지 않습니다. Cafe24가 생성한 장바구니 행에 클래스와 요약 정보만 추가해 수량 변경, 가격 계산, 삭제 기능은 기존 동작을 그대로 사용합니다.

주요 파일:

- 공통 로직: `cafe24/web/js/product-detail-enhance-options-core.js`
- PC 어댑터: `cafe24/skin1/js/module/product/product-detail-enhance-options.js`
- 모바일 어댑터: `cafe24/mobile/js/module/product/detail-enhance-options.js`
- 스타일: `cafe24/skin1/css/module/product/detail.css`, `cafe24/mobile/css/module/product/detail.css`

## ② 외부 설정 JS 구조

상품별 변경값은 `cafe24/web/js/product-detail-config.js`에 분리했습니다.

- `window.FLAVOR_OPTIONS`: 맛 이름, 설명, 강조 문구, 품절 여부, 이미지
- `window.SIZEPACK_OPTIONS`: 묶음 수량별 판매가와 배지

상품 상세에서는 **설정 → 공통 코어 → PC/모바일 어댑터** 순서로 로드합니다. 따라서 옵션·가격·배지 변경은 코어 수정 없이 설정 파일에서 처리할 수 있습니다.

## ③ Cafe24 옵션과 동기화한 방식

1. 원본 옵션명을 `수량_순번`으로 해석해 같은 수량의 `_1`, `_2` 품목을 순서대로 묶습니다.
2. 이미 장바구니에 있는 `option_box_id`와 품절 클래스를 확인해 아직 선택 가능한 첫 품목을 찾습니다.
3. `선택완료` 시 해당 Cafe24 옵션 링크의 `click()`을 호출합니다.
4. `MutationObserver`로 Cafe24가 새 옵션 행을 생성할 때까지 기다립니다.
5. 생성된 행의 `option_value`와 `add_product_code`를 확인한 뒤, 맛 조합을 원본 추가옵션 input에 기록합니다.
6. 이후 원본 행에 표시용 클래스만 추가합니다. 수량 증감, 가격 갱신, 삭제는 Cafe24 이벤트가 계속 담당합니다.

중복 요청은 처리 중 잠금으로 막고, 생성 실패·시간 초과 시 새로 추가된 원본 행을 삭제해 부분 반영을 되돌립니다.

## 테스트

```bash
node --test test/cafe24-product-detail-enhance-options.test.js
```

JSDOM에서 PC·모바일 옵션 선택, 원본 행 재사용, 추가옵션 값 기록, 수량·가격 동기화, 삭제, 실패 롤백, 모바일 BottomSheet 동작을 확인합니다.
