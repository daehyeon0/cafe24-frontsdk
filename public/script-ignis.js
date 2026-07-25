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

  var DEFAULT_CLIENT_ID = 'F79PeGqf20Le8Hvh63GfCA';
  var OPTION_LABEL_PATTERN = /^(\d+)개입_([12])$/;
  var PICKER_SELECTOR = '.ignis-quantity-picker';
  var OPTION_SOURCE_SELECTOR =
    '.xans-product-option .ec-product-button:not([data-ignis-quantity-enhanced])';
  var cafe24Api = null;

  function formatWon(value) {
    return Number(value).toLocaleString('ko-KR') + '원';
  }

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

  function getClientId() {
    return DEFAULT_CLIENT_ID;
  }

  function getCafe24Api() {
    if (cafe24Api) {
      return cafe24Api;
    }

    cafe24Api = window.CAFE24API.init(getClientId());
    return cafe24Api;
  }

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
      variantCode: element.getAttribute('option_value') || '',
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

  function getCartVariantCodes(callback) {
    var api = getCafe24Api();

    if (!api || typeof api.getCartItemList !== 'function') {
      callback(new Set());
      return;
    }

    api.getCartItemList(function (error, response) {
      if (error || !response || !Array.isArray(response.items)) {
        callback(new Set());
        return;
      }

      var variantCodes = new Set();

      response.items.forEach(function (item) {
        if (item && item.variant_code) {
          variantCodes.add(String(item.variant_code));
        }
      });

      callback(variantCodes);
    });
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

  function setSelectedQuantity(picker, quantity) {
    picker.querySelectorAll('.ignis-quantity-option').forEach(function (
      button,
    ) {
      var selected =
        quantity !== null &&
        Number(button.dataset.quantity) === Number(quantity);

      button.classList.toggle('is-selected', selected);
    });
  }

  function getNextSourceOption(options, variantCodes) {
    var first = options[0];
    var second = options[1];

    if (!variantCodes.has(first.variantCode)) {
      return first;
    }

    if (!variantCodes.has(second.variantCode)) {
      return second;
    }

    return null;
  }

  function isUnavailable(option) {
    return (
      option.element.classList.contains('ec-product-disabled') ||
      option.element.classList.contains('ec-product-soldout')
    );
  }

  function updatePickerState(picker, groups, variantCodes) {
    picker.querySelectorAll('.ignis-quantity-option').forEach(function (
      button,
    ) {
      var quantity = Number(button.dataset.quantity);
      var options = groups.get(quantity);
      var nextOption = getNextSourceOption(options, variantCodes);
      var exhausted = nextOption === null;
      var unavailable = nextOption ? isUnavailable(nextOption) : false;
      var status = button.querySelector('.ignis-quantity-status');

      button.disabled = exhausted || unavailable;
      button.classList.toggle('is-exhausted', exhausted);
      button.classList.toggle('is-unavailable', unavailable);
      button.dataset.nextOrder = nextOption
        ? String(nextOption.order)
        : '';

      if (status) {
        status.textContent = unavailable ? '품절' : '담기 완료';
        status.hidden = !button.disabled;
      }

    });

  }

  function refreshPickerState(picker, groups, callback) {
    getCartVariantCodes(function (variantCodes) {
      updatePickerState(picker, groups, variantCodes);

      if (callback) {
        callback(variantCodes);
      }
    });
  }

  function selectQuantity(picker, groups, quantity) {
    refreshPickerState(picker, groups, function (variantCodes) {
      var button = picker.querySelector(
        '.ignis-quantity-option[data-quantity="' + quantity + '"]',
      );
      var nextOption = getNextSourceOption(
        groups.get(Number(quantity)),
        variantCodes,
      );

      if (!button || button.disabled || !nextOption) {
        return;
      }

      if (isUnavailable(nextOption)) {
        updatePickerState(picker, groups, variantCodes);
        return;
      }

      var nativeLink = nextOption.element.querySelector('a');

      if (!nativeLink) {
        return;
      }

      nativeLink.click();
      setSelectedQuantity(picker, Number(quantity));
    });
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

      selectQuantity(picker, groups, button.dataset.quantity);
    });

    refreshPickerState(picker, groups);
  }

  function enhanceQuantityOptions() {
    var optionSource = document.querySelector(OPTION_SOURCE_SELECTOR);
    var originalPrice = getOriginalPrice();

    if (!optionSource || originalPrice === null) {
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
