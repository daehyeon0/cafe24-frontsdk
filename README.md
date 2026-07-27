# 카페24 상품 상세 옵션 커스터마이징 과제

## ① 옵션 UI 구현 방식

### 구현 과정

1. document.readyState에 따라서 `DOMContentLoaded` 리스너를 설치하거나
   바로 `querySelectorAll`로 Cafe24 원본 옵션(`.ec-product-button li`)을 조회합니다.
   cafe24 기본 옵션 피커를 사용하면 맛 선택이 불가하므로 직접 만들었습니다.
2. 각 옵션의 `title`을 정규식 `/^(\d+)개입_(\d+).*$/`으로 파싱합니다.
   수량과 순번이 확인되고 외부 설정(`cafe24/web/js/product-detail-config.js`)에도 존재하는 옵션만 `Map`으로 묶어
   커스텀 UI 대상으로 사용합니다. 조건에 맞지 않는 상품은 변경하지 않습니다.
3. 수량 선택 UI를 만들고 원본 옵션 앞에 `insertBefore()`로 삽입합니다.
   그 후 맛 옵션 피커도 추가합니다. 맛 옵션 피커에 사용되는 옵션은 `cafe24/web/js/product-detail-config.js`에 있습니다.
4. 기준 판매가(소비자가)는 `#product-data`(html에서 `product_detail module의 {$product_custom}`을 이용해 주입된) JSON을 사용합니다.
   외부 설정의 묶음 판매가와 조합해 총액, 할인율, 개당 가격, 배지를 계산합니다.
5. 선택 완료 후에는 cafe24 추가입력 옵션을 사용하여 선택한 맛과 수량을 기입합니다.
   만약 이 과정에서 실패하는 경우 (cafe24의 설정 변경으로 elem이 없어진다던가..) 기본 스타일을 사용합니다.
   MutationObserver를 이용해 `#totalProducts`를 observe하다가
   별도 장바구니 UI를 만들지 않고 Cafe24가 생성한 원본 선택 상품 행에 
   요약 DOM과 CSS 클래스만 추가합니다. 따라서 수량 증감, 가격 계산, 삭제는 
   Cafe24의 기존 이벤트와 주문 로직을 그대로 사용합니다.

### 이렇게 선택한 이유

- Cafe24 내부 구현을 복제하거나 가격 input을 직접 조작하면 스킨 업데이트,
  수량 계산, 주문 검증과 어긋날 가능성이 큽니다. 그래서 공개된 브라우저
  DOM API로 UI만 개선하고 실제 구매 동작은 Cafe24에 위임했습니다.
- 상태를 DOM이나 전역 변수에 흩어 놓지 않고 작은 `selection` 클로저에서
  관리해 수량 변경 시 맛 선택 초기화와 완료 조건을 한곳에서 계산합니다.
- 이벤트 위임으로 동적으로 생성한 버튼마다 리스너를 만들지 않았습니다.
- PC와 모바일은 Cafe24 DOM 구조와 표시 방식만 다르므로, 선택·가격·검증
  로직은 공통 코어에 두고 차이만 얇은 플랫폼 어댑터로 분리했습니다.
- 모바일은 네이티브 `<dialog>`를 사용해 backdrop, ESC 취소, 포커스 처리를
  직접 다시 구현하지 않고 BottomSheet 표현만 CSS로 적용했습니다.

주요 파일:

- 공통 로직: `cafe24/web/js/product-detail-enhance-options-core.js`
- PC 어댑터: `cafe24/skin1/js/module/product/product-detail-enhance-options.js`
- 모바일 어댑터: `cafe24/mobile/js/module/product/product-detail-enhance-options.js`
- 스타일: `cafe24/skin1/css/module/product/detail.css`, `cafe24/mobile/css/module/product/detail.css`

## ② 외부 설정 JS 구조

상품별 변경값은 `cafe24/web/js/product-detail-config.js`에 분리했습니다.

- `window.FLAVOR_OPTIONS`: 맛 이름, 설명, 강조 문구, 품절 여부, 이미지
- `window.PACKSIZE_OPTION`: 묶음 수량별 판매가와 배지

상품 상세에서는 **설정 → 공통 코어 → PC/모바일 어댑터** 순서로 로드합니다. 따라서 옵션·가격·배지 변경은 코어 수정 없이 설정 파일에서 처리할 수 있습니다.

## ③ Cafe24 옵션과 동기화한 방식

1. 원본 옵션명을 `수량_순번`으로 해석해 같은 수량의 `_1`, `_2` 품목을 순서대로 묶습니다.
2. 이미 선택한 있는 `option_box_id`와 옵션값 value를 확인해 아직 선택 가능한 첫 품목을 찾습니다.
3. `선택완료` 시 해당 Cafe24 옵션 링크의 `click()`을 호출합니다.
4. `MutationObserver`로 Cafe24가 새 옵션 행을 생성할 때까지 기다립니다.
5. 생성된 행의 `option_value`와 `add_product_code`를 확인한 뒤, 맛 조합을 원본 추가옵션 input에 기록합니다.
6. 이후 원본 행에 표시용 클래스만 추가합니다. 수량 증감, 가격 갱신, 삭제는 Cafe24 이벤트가 계속 담당합니다.
