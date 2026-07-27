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

  var OPTION_LABEL_PATTERN = /^(\d+)개입_(\d+)$/;
  var OPTION_SOURCE_SELECTOR =
    '.xans-product-option .ec-product-button:not([data-ignis-quantity-enhanced])';
  var UNSELECTED_QUANTITY_VALUE = -1;
  var selectedQuantity = UNSELECTED_QUANTITY_VALUE; // -1: 미선택, 10, 30, 50, 100: 각 수량
  var selectedFlavor = {};
  var selectedOptionBasketItems = new Map();

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

  // 기존 option picker로 부터 값 가져오기
  function getSourceOption(element) {
    var label = (
      element.getAttribute('title') ||
      element.textContent ||
      ''
    ).trim();
    var match = label.match(OPTION_LABEL_PATTERN);

    if (!match || !QUANTITY_OPTIONS[match[1]]) {
      return null;
    }

    return {
      quantity: Number(match[1]),
      order: Number(match[2]),
      optionValue: element.getAttribute('option_value'),
      element: element,
    };
  }

  function getQuantityGroups() {
    var sourceElements = Array.from(
      document.querySelectorAll('.xans-product-option .ec-product-button > li'),
    );

    var sourceOptions = sourceElements.map(getSourceOption).filter(function (option) {
      return !!option
    }).sort(function (a, b) { return a - b });

    if (sourceOptions.length === 0) {
      return null;
    }

    var groups = new Map();

    sourceOptions.forEach(function (option) {
      if (!groups.has(option.quantity)) {
        groups.set(option.quantity, []);
      }

      groups.get(option.quantity).push(option);
    });

    return groups;
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

  function updateQuantityOptionPicker(picker) {
    picker.querySelectorAll('.ignis-quantity-option').forEach(function (button) {
      button.classList.toggle(
        'is-selected',
        Number(button.dataset.quantity) === selectedQuantity,
      );
    });
  }

  function isUnavailable(options) {
    return options.every(function (option) {
      return (
        option.element.classList.contains('ec-product-disabled') ||
        option.element.classList.contains('ec-product-soldout')
      );
    });
  }

  function getSelectableQuantityOption(options) {
    if (!options) {
      return null;
    }

    var selectedOptionValues = new Set(
      Array.from(
        document.querySelectorAll(
          '.option_products > .option_product input[type="hidden"]',
        ),
      ).map(function (input) {
        return input.value;
      }),
    );

    return options.find(function (option) {
      return !selectedOptionValues.has(option.optionValue);
    });
  }

  function observeAddOptionInput(optionValue, value, callback) {
    var addOptionRoot = document.querySelector('#totalProducts > table');

    if (!addOptionRoot) {
      return;
    }

    var observer = new MutationObserver(function (e) {
      var addOptionInput = Array.from(
        document.querySelectorAll(
          '.xans-product-addoption .input_addoption',
        ),
      ).find(function (element) {
        return element.getAttribute('add_product_code') === optionValue;
      });

      observer.disconnect();
      addOptionInput.value = value;
      addOptionInput.disabled = true;
      callback();
    });

    observer.observe(addOptionRoot, {
      childList: true,
      subtree: true,
    });
    window.setTimeout(function () {
      observer.disconnect();
    }, 10000);
  }

  function handleClickQuantity(quantity) {
    var picker = document.querySelector('.ignis-quantity-picker');
    var nextQuantity = Number(quantity);

    if (nextQuantity !== UNSELECTED_QUANTITY_VALUE) {
      var groups = getQuantityGroups();
      var options = groups && groups.get(nextQuantity);

      if (!options) {
        console.error('[handleClickQuantity]: not expected quantity');
        return;
      }

      var selectableOption = getSelectableQuantityOption(options);

      if (isUnavailable(options) || !selectableOption) {
        window.alert('이미 선택한 옵션입니다.');
        return;
      }
    }

    selectedQuantity = nextQuantity;
    selectedFlavor = {};
    updateQuantityOptionPicker(picker);
    updateFlavorOptionPicker();
  }

  function createQuantityButton(quantity, config) {
    var button = createElement('li', 'ignis-quantity-option');
    var radio = createElement('span', 'ignis-quantity-radio');
    var name = createElement(
      'span',
      'ignis-quantity-name',
      quantity + '개입',
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

    button.dataset.quantity = String(quantity);

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

  function createPicker(sourceList, groups, originalPrice) {
    var row = sourceList.closest('tr');
    var cell = sourceList.closest('td');

    if (!row || !cell) {
      return;
    }

    var picker = createElement('section', 'ignis-quantity-picker');
    var panel = createElement('ul', 'ignis-quantity-panel');
    var fragment = document.createDocumentFragment()

    Array.from(groups.keys())
      .sort(function (left, right) {
        return left - right;
      })
      .forEach(function (quantity) {
        var option = QUANTITY_OPTIONS[quantity];

        var unitPrice = option.price / quantity;
        var totalPriceBeforeSale = (originalPrice / 10) * quantity;
        var discountRate = 1 - option.price / totalPriceBeforeSale;
        var discountPercentage = Math.round(
           discountRate * 100,
        );

        fragment.append(createQuantityButton(
          quantity,
          Object.assign({}, option, {
            discountPercentage,
            unitPrice,
          })
        ))
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
    var optionSource = document.querySelector(OPTION_SOURCE_SELECTOR);
    var originalPrice = getOriginalPrice();

    if (!optionSource || originalPrice === null) {
      console.log('[enhanceQuantityOptions]: optionSorce already enhanced');
      return;
    }

    var groups = getQuantityGroups();

    if (groups) {
      createPicker(optionSource, groups, originalPrice);
    }
  }

  function getSelectedFlavorTotal() {
    return Object.keys(selectedFlavor).reduce(function (sum, index) {
      return sum + selectedFlavor[index];
    }, 0);
  }

  function updateFlavorOptionPicker() {
    var flavorPicker = document.querySelector('.ignis-flavor-options');

    if (!flavorPicker) {
      return;
    }

    flavorPicker.dataset.hidden = String(
      selectedQuantity === UNSELECTED_QUANTITY_VALUE,
    );
    flavorPicker.querySelector('header .quantity').textContent =
      String(selectedQuantity);
    flavorPicker.querySelectorAll('.ignis-flavor-option').forEach(
      function (option) {
        var input = option.querySelector('output');

        if (input) {
          input.textContent = String(selectedFlavor[option.dataset.index] || 0);
        }
      },
    );

    var total = getSelectedFlavorTotal();

    flavorPicker.querySelector('.ignis-flavor-total strong').textContent =
      `(${total * 10}/${selectedQuantity}개)`;
    flavorPicker.querySelector('.ignis-flavor-confirm').disabled = total * 10 !== selectedQuantity;
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
      var confirmButton = event.target.closest('.ignis-flavor-confirm');
      if (confirmButton) {
        var groups = getQuantityGroups();
        var quantityOptions = groups && groups.get(selectedQuantity);
        var selectableOption = getSelectableQuantityOption(quantityOptions);
        var nativeLink = selectableOption && selectableOption.element.querySelector('a');

        if (!nativeLink) {
          window.alert('이미 선택한 옵션입니다.');
          return;
        }

        var flavorValue = Object.keys(selectedFlavor)
          .filter(function (index) {
            return selectedFlavor[index] > 0;
          })
          .map(function (index) {
            return `${flavorOptions[index].title} * ${selectedFlavor[index]}`;
          })
          .join(',');

        observeAddOptionInput(
          selectableOption.optionValue,
          flavorValue,
          function () {
            selectedOptionBasketItems.set(
              selectableOption.optionValue,
              {
                quantity: Number(selectedQuantity),
                flavors: Object.assign({}, selectedFlavor),
                count: 1,
              },
            );
            handleClickQuantity(UNSELECTED_QUANTITY_VALUE);

            enhanceOptionBasket();
            updateOptionBasket();
          },
        );
        nativeLink.click();
        document.querySelectorAll('.ec-product-selected').forEach(
          function (element) {
            element.classList.remove('ec-product-selected');
          },
        );
        return;
      }


      var closeButton = event.target.closest('[data-close]');
      if (closeButton) {
        handleClickQuantity(UNSELECTED_QUANTITY_VALUE);
        return;
      }

      var changeButton = event.target.closest('[data-change]');
      if (!changeButton) {
        return;
      }

      var option = changeButton.closest('.ignis-flavor-option');
      var index = option.dataset.index;
      var currentCount = selectedFlavor[index] || 0;
      var otherCount = getSelectedFlavorTotal() - currentCount;
      var maxCount = selectedQuantity / 10 - otherCount;
      var count = currentCount + Number(changeButton.dataset.change);

      selectedFlavor[index] = Math.max(0, Math.min(count, maxCount));
      updateFlavorOptionPicker();
    });

    picker.insertAdjacentElement('afterend', sheet);
  }

  function getNativeOptionRow(optionValue) {
    var input = Array.from(
      document.querySelectorAll('.option_product input'),
    ).find(function (input) {
      return input.value === optionValue;
    });

    return input && input.closest('tr');
  }

  function interceptQuantityInput(
    quantityInput,
    selectedOptionBasketItem,
    output,
  ) {
    quantityInput.ignisQuantityTarget = output;
    quantityInput.ignisQuantityItem = selectedOptionBasketItem;

    if (!quantityInput.ignisQuantityIntercepted) {
      var descriptor = Object.getOwnPropertyDescriptor(
        Object.getPrototypeOf(quantityInput),
        'value',
      );

      if (descriptor && descriptor.get && descriptor.set) {
        Object.defineProperty(quantityInput, 'value', {
          configurable: true,
          enumerable: descriptor.enumerable,
          get: function () {
            return descriptor.get.call(this);
          },
          set: function (value) {
            descriptor.set.call(this, value);

            var count = Number(this.value);

            if (Number.isFinite(count)) {
              this.ignisQuantityItem.count = count;
              this.ignisQuantityTarget.textContent = count;
            }
          },
        });
        quantityInput.ignisQuantityIntercepted = true;
      }
    }

    var count = Number(quantityInput.value);

    if (Number.isFinite(count)) {
      selectedOptionBasketItem.count = count;
      output.textContent = count;
    }
  }

  function interceptOptionBoxPrice(optionBoxPrice, price) {
    optionBoxPrice.ignisPriceTarget = price;

    if (!optionBoxPrice.ignisPriceIntercepted) {
      var descriptor = Object.getOwnPropertyDescriptor(
        Object.getPrototypeOf(optionBoxPrice),
        'value',
      );

      if (!descriptor || !descriptor.get || !descriptor.set) {
        return;
      }

      Object.defineProperty(optionBoxPrice, 'value', {
        configurable: true,
        enumerable: descriptor.enumerable,
        get: function () {
          return descriptor.get.call(this);
        },
        set: function (value) {
          descriptor.set.call(this, value);

          if (this.ignisPriceTarget) {
            this.ignisPriceTarget.textContent = formatWon(value);
          }
        },
      });
      optionBoxPrice.ignisPriceIntercepted = true;
    }

    price.textContent = formatWon(optionBoxPrice.value);
  }

  function enhanceOptionBasket() {
    var oldOptionBasketContainer = document.querySelector(
      '#totalProducts .option_product:not([data-enhanced]) td',
    );

    oldOptionBasketContainer.querySelector('table').classList.add('displaynone');
    oldOptionBasketContainer.closest('.option_product').dataset.enhanced =
      'true';

    var optionBasket = document.createElement('div');

    optionBasket.className = 'option-basket';
    oldOptionBasketContainer.append(optionBasket);

    optionBasket.addEventListener('click', function (event) {
        var deleteButton = event.target.closest(
          '.basket-item header [data-basket-action="delete"]',
        );

        if (deleteButton) {
          var basketItem = deleteButton.closest('.basket-item');
          var productId = basketItem.querySelector(
            '.basket-stepper',
          ).dataset.productId;
          var nativeOptionRow = getNativeOptionRow(productId);
          var nativeDelete =
            nativeOptionRow && nativeOptionRow.querySelector('.delete');

          if (nativeDelete) {
            (nativeDelete.closest('a') || nativeDelete).click();
          }

          selectedOptionBasketItems.delete(productId);
          updateOptionBasket();
          return;
        }

        var button = event.target.closest(
          '.basket-stepper [data-basket-action]',
        );

        if (!button) {
          return;
        }

        var stepper = button.closest('.basket-stepper');
        var selectedOptionBasketItem = selectedOptionBasketItems.get(
          stepper.dataset.productId,
        );

        if (!selectedOptionBasketItem) {
          return;
        }

        var action = button.dataset.basketAction;
        var nativeOptionRow = getNativeOptionRow(stepper.dataset.productId);
        var nativeButton =
          nativeOptionRow &&
          nativeOptionRow.querySelector(`.quantity a.${action}`);

        if (nativeButton) {
          nativeButton.click();
        }
      });
  }

  function updateOptionBasket() {
    var optionBasket = document.querySelector('.option-basket');

    if (!optionBasket) {
      return;
    }

    optionBasket.innerHTML = '';
    selectedOptionBasketItems.forEach(function (
      selectedOptionBasketItem,
      optionValue,
    ) {
      var flavorText = Object.keys(selectedOptionBasketItem.flavors)
        .filter(function (index) {
          return selectedOptionBasketItem.flavors[index] > 0;
        })
        .map(function (index) {
          return (
            `${flavorOptions[index].title}*` +
            selectedOptionBasketItem.flavors[index]
          );
        })
        .join(' + ');
      var basketItem = document.createElement('div');

      basketItem.className = 'basket-item';
      basketItem.innerHTML = `
        <header>
          <div class="desc">
            <strong class="quantity">${selectedOptionBasketItem.quantity}개입</strong>
            <p class="flavor">${flavorText}</p>
          </div>
          <button type="button" class="remove" data-basket-action="delete" title="삭제" aria-label="삭제">
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M0.883789 0.883911L10.8838 10.8839" stroke="#697077" stroke-width="1.25" stroke-linecap="square" stroke-linejoin="round"/>
              <path d="M10.8838 0.883911L0.883789 10.8839" stroke="#697077" stroke-width="1.25" stroke-linecap="square" stroke-linejoin="round"/>
            </svg>
          </button>
        </header>
        <footer>
          <span class="basket-stepper" data-product-id="${optionValue}">
            <button type="button" data-basket-action="down" aria-label="수량 감소">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M3.33301 8H12.6663" stroke="#171717" stroke-width="1.25" stroke-linecap="square" stroke-linejoin="round"/>
              </svg>
            </button>
            <output></output>
            <button type="button" data-basket-action="up" aria-label="수량 증가">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M3.33301 8H12.6663" stroke="#171717" stroke-width="1.25" stroke-linecap="round" stroke-linejoin="round"/>
                <path d="M8 3.33325V12.6666" stroke="#171717" stroke-width="1.25" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </button>
          </span>
          <span class="spacer"></span>
          <strong class="price"></strong>
        </footer>`;
      optionBasket.append(basketItem);

      var nativeOptionRow = getNativeOptionRow(optionValue);
      var quantityInput =
        nativeOptionRow &&
        nativeOptionRow.querySelector('.quantity input');
      var optionBoxPrice =
        nativeOptionRow &&
        nativeOptionRow.querySelector('input.option_box_price');

      if (quantityInput) {
        interceptQuantityInput(
          quantityInput,
          selectedOptionBasketItem,
          basketItem.querySelector('.basket-stepper output'),
        );
      }

      if (optionBoxPrice) {
        interceptOptionBoxPrice(
          optionBoxPrice,
          basketItem.querySelector('.price'),
        );
      }
    });
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
