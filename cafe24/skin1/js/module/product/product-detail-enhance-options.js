(function initIgnisQuantityPicker(window, document) {
  'use strict';

  var flavorOptions = [
    {
      title: '떡볶이맛 (10개입)',
      description: '130kcal, 단백질 18g',
      highlight: '신제품 출시!',
      isSoldout: false,
      img: 'https://ecimg.cafe24img.com/pg3185b70119868017/df6d/web/product/product-img/통살소스_떡볶이맛전면_원본_0524.png',
    },
    {
      title: '버터치킨커리맛 (10개입)',
      description: '105kcal, 단백질 18g',
      highlight: '',
      isSoldout: true,
      img: 'https://ecimg.cafe24img.com/pg3185b70119868017/df6d/web/product/product-img/통살소스_버터치킨커리맛(전면).png',
    },
    {
      title: '핫양념치킨맛 (10개입)',
      description: '125kcal, 단백질 19g',
      highlight: '',
      isSoldout: false,
      img: 'https://ecimg.cafe24img.com/pg3185b70119868017/df6d/web/product/product-img/통살소스_핫양념치킨맛전면_원본_0524.png',
    },
    {
      title: '치폴레마요맛 (10개입)',
      description: '125kcal, 단백질 18g',
      highlight: '',
      isSoldout: false,
      img: 'https://ecimg.cafe24img.com/pg3185b70119868017/df6d/web/product/product-img/통살소스_치폴레마요맛(전면).png',
    },
    {
      title: '허니소이맛 (10개입)',
      description: '125kcal, 단백질 18g',
      highlight: '',
      isSoldout: false,
      img: 'https://ecimg.cafe24img.com/pg3185b70119868017/df6d/web/product/product-img/통살소스_허니소이전면_원본_0814.png',
    },
    {
      title: '왕갈비맛 (10개입)',
      description: '125kcal, 단백질 18g',
      highlight: '',
      isSoldout: false,
      img: 'https://ecimg.cafe24img.com/pg3185b70119868017/df6d/web/product/product-img/통살소스_왕갈비맛전면_원본.png',
    },
  ];

  var QUANTITY_OPTIONS = Object.freeze({
    10: Object.freeze({
      price: 24700,
      badge: null,
    }),
    30: Object.freeze({
      price: 70500,
      badge: Object.freeze({
        bgColor: '#FFF1EB',
        textColor: '#FF692E',
        text: '가장 많이 사요',
      }),
    }),
    50: Object.freeze({
      price: 111500,
      badge: null,
    }),
    100: Object.freeze({
      price: 196000,
      badge: Object.freeze({
        bgColor: '#FFEBEB',
        textColor: '#EB0004',
        text: '최대할인',
      }),
    }),
  });

  var UNSELECTED_PACK_SIZE_VALUE = -1;
  var selection = (function createSelection() {
    var FLAVOR_PACK_SIZE = 10;
    var packSize = UNSELECTED_PACK_SIZE_VALUE;
    var flavorPackCounts = {};

    function getFlavorPackTotal() {
      return Object.keys(flavorPackCounts).reduce(function (sum, index) {
        return sum + flavorPackCounts[index];
      }, 0);
    }

    function snapshot() {
      var selectedQuantity =
        getFlavorPackTotal() * FLAVOR_PACK_SIZE;
      var targetQuantity =
        packSize === UNSELECTED_PACK_SIZE_VALUE ? 0 : packSize;

      return {
        packSize: packSize,
        flavorPackCounts: Object.assign({}, flavorPackCounts),
        selectedQuantity: selectedQuantity,
        targetQuantity: targetQuantity,
        canConfirm:
          packSize !== UNSELECTED_PACK_SIZE_VALUE &&
          selectedQuantity === packSize,
      };
    }

    function reset() {
      packSize = UNSELECTED_PACK_SIZE_VALUE;
      flavorPackCounts = {};

      return snapshot();
    }

    function selectPack(nextPackSize) {
      nextPackSize = Number(nextPackSize);

      if (!QUANTITY_OPTIONS[nextPackSize]) {
        return snapshot();
      }

      packSize = nextPackSize;
      flavorPackCounts = {};

      return snapshot();
    }

    function changeFlavor(rawIndex, rawDelta) {
      var index = Number(rawIndex);
      var delta = Number(rawDelta);
      var flavor = flavorOptions[index];

      if (
        packSize === UNSELECTED_PACK_SIZE_VALUE ||
        !Number.isInteger(index) ||
        !Number.isInteger(delta) ||
        !flavor ||
        flavor.isSoldout
      ) {
        return snapshot();
      }

      var currentCount = flavorPackCounts[index] || 0;
      var otherCount = getFlavorPackTotal() - currentCount;
      var maxCount = packSize / FLAVOR_PACK_SIZE - otherCount;
      var nextCount = Math.max(
        0,
        Math.min(currentCount + delta, maxCount),
      );

      if (nextCount > 0) {
        flavorPackCounts[index] = nextCount;
      } else {
        delete flavorPackCounts[index];
      }

      return snapshot();
    }

    function confirm() {
      var state = snapshot();

      if (!state.canConfirm) {
        return null;
      }

      return {
        packSize: state.packSize,
        flavorValue: Object.keys(state.flavorPackCounts)
          .map(function (index) {
            return (
              flavorOptions[index].title +
              ' * ' +
              state.flavorPackCounts[index]
            );
          })
          .join(','),
      };
    }

    return {
      changeFlavor: changeFlavor,
      confirm: confirm,
      reset: reset,
      selectPack: selectPack,
      snapshot: snapshot,
    };
  })();
  var cafe24OptionAdapter = (function createCafe24OptionAdapter() {
    var OPTION_LIST_SELECTOR =
      '.xans-product-option .ec-product-button';
    var OPTION_LABEL_PATTERN = /^(\d+)개입_(\d+)$/;
    var ADD_OPTION_TIMEOUT_MS = 10000;
    var selectionPending = false;

    function getSourceOption(element) {
      var label = (
        element.getAttribute('title') ||
        element.textContent ||
        ''
      ).trim();
      var match = label.match(OPTION_LABEL_PATTERN);
      var optionValue = element.getAttribute('option_value');

      if (!match || !optionValue || !QUANTITY_OPTIONS[match[1]]) {
        return null;
      }

      return {
        packSize: Number(match[1]),
        order: Number(match[2]),
        optionValue: optionValue,
        element: element,
      };
    }

    function getQuantityGroups() {
      var sourceOptions = Array.from(
        document.querySelectorAll(
          OPTION_LIST_SELECTOR + ' > li',
        ),
      )
        .map(getSourceOption)
        .filter(function (option) {
          return !!option;
        })
        .sort(function (left, right) {
          return (
            left.packSize - right.packSize ||
            left.order - right.order
          );
        });
      var groups = new Map();

      sourceOptions.forEach(function (option) {
        if (!groups.has(option.packSize)) {
          groups.set(option.packSize, []);
        }

        groups.get(option.packSize).push(option);
      });

      return groups;
    }

    function isUnavailable(option) {
      return (
        option.element.classList.contains('ec-product-disabled') ||
        option.element.classList.contains('ec-product-soldout')
      );
    }

    function getSelectableOption(packSize) {
      var options = getQuantityGroups().get(Number(packSize)) || [];
      var selectedOptionValues = new Set(
        Array.from(
          document.querySelectorAll(
            '.option_products > .option_product .option_box_id',
          ),
        ).map(function (input) {
          return input.value;
        }),
      );

      return options.find(function (option) {
        return (
          !isUnavailable(option) &&
          !selectedOptionValues.has(option.optionValue)
        );
      });
    }

    function getPackSizes() {
      return Array.from(getQuantityGroups().keys());
    }

    function getEnhancementTarget() {
      return document.querySelector(
        OPTION_LIST_SELECTOR +
          ':not([data-ignis-quantity-enhanced])',
      );
    }

    function isPackSizeSelectable(packSize) {
      return !!getSelectableOption(packSize);
    }

    function isSelectionPending() {
      return selectionPending;
    }

    function commitSelection(packSize, flavorValue) {
      if (selectionPending) {
        return Promise.reject(
          new Error('Cafe24 옵션 추가가 이미 진행 중입니다.'),
        );
      }

      var option = getSelectableOption(packSize);
      var nativeLink = option && option.element.querySelector('a');
      var root = document.querySelector('#totalProducts > table');

      if (!option || !nativeLink || !root) {
        return Promise.reject(
          new Error('선택할 수 있는 Cafe24 옵션이 없습니다.'),
        );
      }

      var existingRows = new Set(
        root.querySelectorAll('.option_products > .option_product'),
      );

      selectionPending = true;

      return new Promise(function (resolve, reject) {
        var observer;
        var timeoutId;
        var settled = false;

        function finish(error, optionRow) {
          if (settled) {
            return;
          }

          settled = true;
          observer.disconnect();
          window.clearTimeout(timeoutId);

          if (error) {
            var addedOptionRow = findAddedOptionRow();
            var deleteButton =
              addedOptionRow && addedOptionRow.querySelector('.delete');

            if (deleteButton) {
              try {
                deleteButton.click();
              } catch (rollbackError) {
                console.error(
                  '[Cafe24 option rollback]',
                  rollbackError,
                );
              }
            }

            selectionPending = false;
            reject(error);
            return;
          }

          selectionPending = false;
          resolve(optionRow);
        }

        function findAddedOptionRow() {
          return Array.from(
            root.querySelectorAll('.option_products > .option_product'),
          ).find(function (optionRow) {
            if (existingRows.has(optionRow)) {
              return false;
            }

            var optionId = optionRow.querySelector('.option_box_id');

            return (
              optionId &&
              optionId.value === option.optionValue
            );
          });
        }

        function completeWhenOptionRowExists() {
          var optionRow = findAddedOptionRow();
          var addOptionInput = optionRow && optionRow.querySelector(
            '.xans-product-addoption .input_addoption',
          );

          if (
            !addOptionInput ||
            addOptionInput.getAttribute('add_product_code') !==
              option.optionValue
          ) {
            return;
          }

          addOptionInput.value = flavorValue;
          addOptionInput.disabled = true;
          finish(null, optionRow);
        }

        observer = new MutationObserver(completeWhenOptionRowExists);
        observer.observe(root, {
          childList: true,
          subtree: true,
        });
        timeoutId = window.setTimeout(function () {
          finish(
            new Error('Cafe24 옵션 생성 시간이 초과되었습니다.'),
          );
        }, ADD_OPTION_TIMEOUT_MS);

        try {
          nativeLink.click();
          completeWhenOptionRowExists();
        } catch (error) {
          finish(error);
        }

        document.querySelectorAll('.ec-product-selected').forEach(
          function (element) {
            element.classList.remove('ec-product-selected');
          },
        );
      });
    }

    return {
      commitSelection: commitSelection,
      getEnhancementTarget: getEnhancementTarget,
      getPackSizes: getPackSizes,
      isPackSizeSelectable: isPackSizeSelectable,
      isSelectionPending: isSelectionPending,
    };
  })();

  function formatWon(value) {
    return Number(value).toLocaleString('ko-KR') + '원';
  }

  // 최초 판매가 가져오기
  function getOriginalPrice() {
    var productDataElement = document.querySelector('#product-data');

    if (!productDataElement) {
      return null;
    }

    try {
      var productData = JSON.parse(productDataElement.textContent);
      var originalPrice = Number(productData.price);

      return Number.isFinite(originalPrice) && originalPrice > 0
        ? originalPrice
        : null;
    } catch (_error) {
      return null;
    }
  }

  function createElement(tagName, className, text) {
    var element = document.createElement(tagName);

    if (className) {
      element.className = className;
    }

    if (typeof text === 'string') {
      element.textContent = text;
    }

    return element;
  }

  function updateQuantityOptionPicker(picker, state) {
    picker.querySelectorAll('.ignis-quantity-option').forEach(function (button) {
      button.classList.toggle(
        'is-selected',
        Number(button.dataset.quantity) === state.packSize,
      );
    });
  }

  function renderSelection(state) {
    updateQuantityOptionPicker(
      document.querySelector('.ignis-quantity-picker'),
      state,
    );
    updateFlavorOptionPicker(state);
  }

  function handleClickQuantity(packSize) {
    if (cafe24OptionAdapter.isSelectionPending()) {
      return;
    }

    var nextPackSize = Number(packSize);

    if (nextPackSize === UNSELECTED_PACK_SIZE_VALUE) {
      renderSelection(selection.reset());
    } else {
      if (!cafe24OptionAdapter.isPackSizeSelectable(nextPackSize)) {
        window.alert('이미 선택한 옵션입니다.');
        return;
      }

      renderSelection(selection.selectPack(nextPackSize));
    }
  }

  function createQuantityButton(packSize, config) {
    var button = createElement('li', 'ignis-quantity-option');
    var radio = createElement('span', 'ignis-quantity-radio');
    var name = createElement(
      'span',
      'ignis-quantity-name',
      packSize + '개입',
    );
    var price = createElement('span', 'ignis-quantity-price');
    var priceLine = createElement('span', 'ignis-quantity-price-line');
    var total = createElement(
      'strong',
      'ignis-quantity-total',
      formatWon(config.price),
    );
    var discount = createElement(
      'span',
      'ignis-quantity-discount',
      '(' + config.discountPercentage + '% 할인)',
    );
    var unit = createElement(
      'span',
      'ignis-quantity-unit',
      '1개 : ' + formatWon(config.unitPrice),
    );
    var meta = createElement('span', 'ignis-quantity-meta');

    button.dataset.quantity = String(packSize);

    priceLine.append(total, discount);
    price.append(priceLine, unit);

    if (config.badge) {
      var badge = createElement(
        'span',
        'ignis-quantity-badge',
        config.badge.text,
      );

      badge.style.backgroundColor = config.badge.bgColor;
      badge.style.color = config.badge.textColor;
      meta.append(badge);
    }

    button.append(radio, name, price, meta);

    return button;
  }

  function createPicker(sourceList, packSizes, originalPrice) {
    var row = sourceList.closest('tr');
    var cell = sourceList.closest('td');

    if (!row || !cell) {
      return;
    }

    var picker = createElement('section', 'ignis-quantity-picker');
    var panel = createElement('ul', 'ignis-quantity-panel');
    var fragment = document.createDocumentFragment();

    packSizes.forEach(function (packSize) {
      var option = QUANTITY_OPTIONS[packSize];
      var unitPrice = option.price / packSize;
      var totalPriceBeforeSale = (originalPrice / 10) * packSize;
      var discountRate = 1 - option.price / totalPriceBeforeSale;
      var discountPercentage = Math.round(discountRate * 100);

      fragment.append(
        createQuantityButton(
          packSize,
          Object.assign({}, option, {
            discountPercentage,
            unitPrice,
          }),
        ),
      );
    });

    var header = createElement('button', 'ignis-quantity-header');
    var title = createElement(
      'span',
      'ignis-quantity-header-title',
      (row.querySelector('th') || {}).textContent || '옵션 선택 (필수)',
    );
    var chevron = createElement('span', 'ignis-quantity-chevron');

    title.textContent = title.textContent.trim() || '옵션 선택 (필수)';
    header.type = 'button';
    header.dataset.expanded = 'true'
    header.append(title, chevron);

    picker.append(header);
    panel.append(fragment);
    picker.append(panel);

    row.classList.add('ignis-quantity-option-row');
    row.classList.remove('displaynone')
    sourceList.dataset.ignisQuantityEnhanced = 'true';
    sourceList.classList.add('ignis-quantity-original');

    var description = cell.querySelector('.value');

    if (description) {
      description.classList.add('ignis-quantity-original');
    }

    cell.insertBefore(picker, sourceList);

    picker.addEventListener('click', function (event) {
      var headerClassName = 'ignis-quantity-header'
      var optionClassName = 'ignis-quantity-option'

      var target = event.target.closest(
        `.${headerClassName}, .${optionClassName}`,
      );

      if (!target) {
        return;
      }

      if (target.className.includes(headerClassName)) {
        var expanded = header.dataset.expanded === 'true';

        header.dataset.expanded = String(!expanded);
        panel.dataset.hidden = expanded;
        return;
      }

      if (target.className.includes(optionClassName)) {
       handleClickQuantity(target.dataset.quantity);
      }
    });

  }

  function enhanceQuantityOptions() {
    var optionSource = cafe24OptionAdapter.getEnhancementTarget();
    var originalPrice = getOriginalPrice();

    if (!optionSource || originalPrice === null) {
      console.log('[enhanceQuantityOptions]: optionSource already enhanced');
      return;
    }

    var packSizes = cafe24OptionAdapter.getPackSizes();

    if (packSizes.length > 0) {
      createPicker(optionSource, packSizes, originalPrice);
    }
  }

  function updateFlavorOptionPicker(state) {
    var flavorPicker = document.querySelector('.ignis-flavor-options');

    if (!flavorPicker) {
      return;
    }

    flavorPicker.dataset.hidden = String(
      state.packSize === UNSELECTED_PACK_SIZE_VALUE,
    );
    flavorPicker.querySelector('header .quantity').textContent =
      String(state.packSize);
    flavorPicker.querySelectorAll('.ignis-flavor-option').forEach(
      function (option) {
        var input = option.querySelector('output');

        if (input) {
          input.textContent = String(
            state.flavorPackCounts[option.dataset.index] || 0,
          );
        }
      },
    );

    flavorPicker.querySelector('.ignis-flavor-total strong').textContent =
      `(${state.selectedQuantity}/${state.targetQuantity}개)`;
    flavorPicker.querySelector('.ignis-flavor-confirm').disabled =
      !state.canConfirm;
  }

  function createFlavorOptions() {
    var picker = document.querySelector('.ignis-quantity-picker');
    var flavorPicker = document.querySelector('.ignis-flavor-options');

    if (!picker || flavorPicker) {
      return;
    }

    var options = flavorOptions
      .map(function (flavor, index) {
        return '<li class="ignis-flavor-option' +
          (flavor.isSoldout ? ' is-soldout' : '') +
          '" data-index="' + index + '">' +
          '<img class="ignis-flavor-image" src="' + flavor.img + '" alt="' + flavor.title + '">' +
          '<span class="ignis-flavor-copy">' +
          (flavor.highlight ? '<em>' + flavor.highlight + '</em>' : '') +
          '<strong>' + flavor.title + '</strong>' +
          '<small>' + flavor.description + '</small></span>' +
          (flavor.isSoldout
            ? '<span class="ignis-flavor-soldout">품절</span>'
            : '<span class="ignis-flavor-stepper">' +
              '<button type="button" data-change="-1" aria-label="수량 감소">−</button>' +
              '<output>0</output>' +
              '<button type="button" data-change="1" aria-label="수량 증가">＋</button>' +
              '</span>') +
          '</li>';
      })
      .join('');
    var sheet = document.createElement('section');

    sheet.className = 'ignis-flavor-options';
    sheet.dataset.hidden = 'true';
    sheet.innerHTML =
      '<div class="ignis-flavor-sheet">' +
      '<header><strong><span class="quantity">nn</span>개입 맛 선택</strong><button type="button" data-close aria-label="닫기">×</button></header>' +
      '<ul>' + options + '</ul>' +
      '<p class="ignis-flavor-total">총 수량 <strong>(0/30개)</strong></p>' +
      '<button type="button" class="ignis-flavor-confirm" disabled>선택완료</button>' +
      '</div>';

    sheet.addEventListener('click', function (event) {
      if (cafe24OptionAdapter.isSelectionPending()) {
        return;
      }

      var confirmButton = event.target.closest('.ignis-flavor-confirm');
      if (confirmButton) {
        var confirmation = selection.confirm();

        if (!confirmation) {
          return;
        }

        confirmButton.disabled = true;
        cafe24OptionAdapter
          .commitSelection(
            confirmation.packSize,
            confirmation.flavorValue,
          )
          .then(
            function (optionRow) {
              enhanceNativeOptionBasketItem(
                optionRow,
                confirmation.packSize,
                confirmation.flavorValue,
              );
              handleClickQuantity(UNSELECTED_PACK_SIZE_VALUE);
            },
            function (error) {
              console.error('[Cafe24 option transaction]', error);
              window.alert(
                '옵션을 추가하지 못했습니다. 다시 시도해 주세요.',
              );
              renderSelection(selection.snapshot());
            },
          );
        return;
      }


      var closeButton = event.target.closest('[data-close]');
      if (closeButton) {
        handleClickQuantity(UNSELECTED_PACK_SIZE_VALUE);
        return;
      }

      var changeButton = event.target.closest('[data-change]');
      if (!changeButton) {
        return;
      }

      var option = changeButton.closest('.ignis-flavor-option');
      renderSelection(
        selection.changeFlavor(
          option.dataset.index,
          changeButton.dataset.change,
        ),
      );
    });

    picker.insertAdjacentElement('afterend', sheet);
    renderSelection(selection.snapshot());
  }

  function enhanceNativeOptionBasketItem(
    optionRow,
    packSize,
    flavorValue,
  ) {
    var nativeTable =
      optionRow && optionRow.querySelector('td > table');
    var product = nativeTable && nativeTable.querySelector(
      'tbody > tr:first-child .product',
    );

    if (!optionRow || !nativeTable || !product) {
      return;
    }

    var summary = product.parentElement.querySelector(
      '.ignis-selected-option-summary',
    );

    if (!summary) {
      summary = createElement('div', 'ignis-selected-option-summary');
      summary.append(
        createElement('strong', 'ignis-selected-option-pack-size'),
        createElement('p', 'ignis-selected-option-flavor'),
      );
      product.insertAdjacentElement('afterend', summary);
    }

    var quantityInput = optionRow.querySelector('.quantity input');
    var quantityUp = optionRow.querySelector('.quantity .up');
    var quantityDown = optionRow.querySelector('.quantity .down');
    var deleteButton = optionRow.querySelector('.delete');

    summary.querySelector('.ignis-selected-option-pack-size').textContent =
      packSize + '개입';
    summary.querySelector('.ignis-selected-option-flavor').textContent =
      flavorValue.replace(/ \* /g, '*').replace(/,/g, ' + ');
    product.classList.add('ignis-selected-option-original');
    nativeTable.classList.remove('displaynone');
    optionRow.classList.add('ignis-option-basket-item');

    if (quantityInput) {
      quantityInput.setAttribute('aria-label', '수량');
    }
    if (quantityUp) {
      quantityUp.setAttribute('aria-label', '수량 증가');
    }
    if (quantityDown) {
      quantityDown.setAttribute('aria-label', '수량 감소');
    }
    if (deleteButton) {
      deleteButton.setAttribute('aria-label', '삭제');
    }
  }

  function boot() {
    enhanceQuantityOptions();
    createFlavorOptions();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
  } else {
    boot();
  }
})(window, document);
