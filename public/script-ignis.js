(function initIgnisQuantityPicker(window, document) {
  'use strict';

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

  var OPTION_LABEL_PATTERN = /^(\d+)개입_([12])$/;
  var PICKER_SELECTOR = '.ignis-quantity-picker';
  var OPTION_SOURCE_SELECTOR =
    '.xans-product-option .ec-product-button:not([data-ignis-quantity-enhanced])';
  var selectedQuantity = -1; // -1: 미선택, 10, 30, 50, 100: 각 수량

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
      element: element,
    };
  }

  function getQuantityGroups(sourceList) {
    var sourceElements = Array.from(sourceList.children).filter(function (
      element,
    ) {
      return element.tagName === 'LI';
    });
    var sourceOptions = sourceElements.map(getSourceOption).filter(function (option) {
      return !!option
    });

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

  function updateOptionPicker(picker) {
    picker.querySelectorAll('.ignis-quantity-option').forEach(function (button) {
      button.classList.toggle(
        'is-selected',
        Number(button.dataset.quantity) === selectedQuantity,
      );
    });
  }
  function isUnavailable(option) {
    return (
      option.element.classList.contains('ec-product-disabled') ||
      option.element.classList.contains('ec-product-soldout')
    );
  }

  function handleClickQuantity(picker, groups, quantity) {
    var option = groups.get(Number(quantity));

    if (!option) {
      console.error('[handleClickQuantity]: not expected quantity')
      return;
    }

    var nativeLink = option && option.element.querySelector('a');

    if (!option || isUnavailable(option) || !nativeLink) {
      window.alert('선택할 수 없는 수량입니다.');
      return;
    }

    selectedQuantity = Number(quantity);
    updateOptionPicker(picker);
    nativeLink.click();
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

    panel.addEventListener('click', function (event) {
      var button = event.target.closest('.ignis-quantity-option');

      if (!button || button.disabled) {
        return;
      }

      handleClickQuantity(picker, groups, button.dataset.quantity);
    });

  }

  function enhanceQuantityOptions() {
    var optionSource = document.querySelector(OPTION_SOURCE_SELECTOR);
    var originalPrice = getOriginalPrice();

    if (!optionSource || originalPrice === null) {
      console.log('[enhanceQuantityOptions]: optionSorce already enhanced');
      return;
    }

    var groups = getQuantityGroups(optionSource);

    if (groups) {
      createPicker(optionSource, groups, originalPrice);
    }
  }

  function boot() {
    enhanceQuantityOptions();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
  } else {
    boot();
  }
})(window, document);
