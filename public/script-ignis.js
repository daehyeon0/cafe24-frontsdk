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
  var pickerSequence = 0;
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
    var status = createElement(
      'span',
      'ignis-quantity-status',
      '담기 완료',
    );

    button.type = 'button';
    button.dataset.quantity = String(quantity);
    button.setAttribute('role', 'radio');
    button.setAttribute('aria-checked', 'false');

    radio.setAttribute('aria-hidden', 'true');
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

    status.hidden = true;
    meta.append(status);
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
      button.setAttribute('aria-checked', selected ? 'true' : 'false');
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

  function getGroupSignature(groups, variantCodes) {
    var activeCodes = [];

    groups.forEach(function (options) {
      options.forEach(function (option) {
        if (variantCodes.has(option.variantCode)) {
          activeCodes.push(option.variantCode);
        }
      });
    });

    return activeCodes.sort().join('|');
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

      if (exhausted) {
        button.setAttribute(
          'aria-label',
          quantity + '개입, 두 구성을 모두 장바구니에 담음',
        );
      } else if (unavailable) {
        button.setAttribute(
          'aria-label',
          quantity + '개입, 다음 구성을 현재 선택할 수 없음',
        );
      } else {
        button.removeAttribute('aria-label');
      }
    });

    picker.dataset.cartSignature = getGroupSignature(groups, variantCodes);
  }

  function refreshPickerState(picker, groups, callback) {
    getCartVariantCodes(function (variantCodes) {
      updatePickerState(picker, groups, variantCodes);

      if (callback) {
        callback(variantCodes);
      }
    });
  }

  function announce(picker, message) {
    var liveRegion = picker.querySelector('.ignis-quantity-live');

    if (!liveRegion) {
      return;
    }

    liveRegion.textContent = '';
    window.setTimeout(function () {
      liveRegion.textContent = message;
    }, 20);
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
      announce(
        picker,
        quantity +
          '개입 ' +
          nextOption.order +
          '번째 구성을 선택했습니다.',
      );
    });
  }

  function bindRadioKeyboard(picker, groups) {
    picker.addEventListener('keydown', function (event) {
      if (
        !event.target.classList.contains('ignis-quantity-option') ||
        !['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(
          event.key,
        )
      ) {
        return;
      }

      event.preventDefault();

      var enabledButtons = Array.from(
        picker.querySelectorAll('.ignis-quantity-option:not(:disabled)'),
      );
      var currentIndex = enabledButtons.indexOf(event.target);
      var direction =
        event.key === 'ArrowUp' || event.key === 'ArrowLeft' ? -1 : 1;
      var nextIndex =
        (currentIndex + direction + enabledButtons.length) %
        enabledButtons.length;
      var nextButton = enabledButtons[nextIndex];

      if (nextButton) {
        nextButton.focus();
        selectQuantity(picker, groups, nextButton.dataset.quantity);
      }
    });
  }

  function watchForCartChange(picker, groups, selectedQuantity, attempt) {
    if (!document.documentElement.contains(picker)) {
      return;
    }

    refreshPickerState(picker, groups, function () {
      var previousSignature = picker.dataset.cartSignatureBeforeSubmit || '';
      var currentSignature = picker.dataset.cartSignature || '';

      if (currentSignature !== previousSignature) {
        setSelectedQuantity(picker, null);

        var selectedButton = picker.querySelector(
          '.ignis-quantity-option[data-quantity="' +
            selectedQuantity +
            '"]',
        );
        var completed =
          selectedButton &&
          selectedButton.classList.contains('is-exhausted');

        announce(
          picker,
          completed
            ? selectedQuantity +
                '개입 두 구성을 모두 장바구니에 담았습니다.'
            : selectedQuantity +
                '개입을 장바구니에 담았습니다. 다음 선택은 두 번째 구성입니다.',
        );
        return;
      }

      if (attempt < 19) {
        window.setTimeout(function () {
          watchForCartChange(
            picker,
            groups,
            selectedQuantity,
            attempt + 1,
          );
        }, 250);
      }
    });
  }

  function bindCartTracking(picker, groups) {
    document
      .querySelectorAll('[onclick*="product_submit"]')
      .forEach(function (cartButton) {
        var inlineAction = cartButton.getAttribute('onclick') || '';

        if (!/product_submit\s*\(\s*2\s*,/.test(inlineAction)) {
          return;
        }

        if (cartButton.dataset.ignisCartTracking) {
          return;
        }

        cartButton.dataset.ignisCartTracking = 'true';
        cartButton.addEventListener('click', function () {
          var selectedButton = picker.querySelector(
            '.ignis-quantity-option[aria-checked="true"]',
          );

          if (!selectedButton) {
            return;
          }

          picker.dataset.cartSignatureBeforeSubmit =
            picker.dataset.cartSignature || '';

          window.setTimeout(function () {
            watchForCartChange(
              picker,
              groups,
              selectedButton.dataset.quantity,
              0,
            );
          }, 250);
        });
      });
  }

  function syncNativeSelection(picker, groups) {
    var selectedQuantity = null;

    groups.forEach(function (options, quantity) {
      if (
        options.some(function (option) {
          return option.element.classList.contains('ec-product-selected');
        })
      ) {
        selectedQuantity = quantity;
      }
    });

    setSelectedQuantity(picker, selectedQuantity);
  }

  function createPicker(sourceList, groups, originalPrice) {
    var row = sourceList.closest('tr');
    var cell = sourceList.closest('td');

    if (!row || !cell) {
      return;
    }

    pickerSequence += 1;

    var picker = createElement('section', 'ignis-quantity-picker');
    var header = createElement('button', 'ignis-quantity-header');
    var title = createElement(
      'span',
      'ignis-quantity-header-title',
      (row.querySelector('th') || {}).textContent || '옵션 선택 (필수)',
    );
    var chevron = createElement('span', 'ignis-quantity-chevron');
    var panel = createElement('ul', 'ignis-quantity-panel');
    var liveRegion = createElement('span', 'ignis-quantity-live');
    var panelId = 'ignis-quantity-panel-' + pickerSequence;

    title.textContent = title.textContent.trim() || '옵션 선택 (필수)';
    header.type = 'button';
    header.setAttribute('aria-expanded', 'true');
    header.setAttribute('aria-controls', panelId);
    chevron.setAttribute('aria-hidden', 'true');
    header.append(title, chevron);

    panel.id = panelId;
    panel.setAttribute('role', 'radiogroup');
    panel.setAttribute('aria-label', title.textContent);

    Array.from(groups.keys())
      .sort(function (left, right) {
        return left - right;
      })
      .forEach(function (quantity) {
        var option = QUANTITY_OPTIONS[quantity];

        var unitPrice = option.price / quantity;
        var totalPriceBeforeSale = (originalPrice / 10) * quantity;

        var discountRate = (1 - option.price / totalPriceBeforeSale)
        var discountPercentage = Math.round(
           discountRate * 100,
        );

        panel.append(
          createQuantityButton(
            quantity,
            Object.assign({}, option, {
              discountPercentage,
              unitPrice,
            }),
          ),
        );
      });

    liveRegion.className = 'ignis-quantity-live ignis-visually-hidden';
    liveRegion.setAttribute('aria-live', 'polite');
    liveRegion.setAttribute('aria-atomic', 'true');
    picker.append(header, panel, liveRegion);

    row.classList.add('ignis-quantity-option-row');
    sourceList.dataset.ignisQuantityEnhanced = 'true';
    sourceList.classList.add('ignis-quantity-original');

    var description = cell.querySelector('.value');

    if (description) {
      description.classList.add('ignis-quantity-original');
    }

    cell.insertBefore(picker, sourceList);

    header.addEventListener('click', function () {
      var expanded = header.getAttribute('aria-expanded') === 'true';

      header.setAttribute('aria-expanded', expanded ? 'false' : 'true');
      panel.hidden = expanded;
    });

    panel.addEventListener('click', function (event) {
      var button = event.target.closest('.ignis-quantity-option');

      if (!button || button.disabled) {
        return;
      }

      selectQuantity(picker, groups, button.dataset.quantity);
    });

    bindRadioKeyboard(picker, groups);
    bindCartTracking(picker, groups);
    refreshPickerState(picker, groups);

    var selectionObserver = new MutationObserver(function (mutations) {
      if (
        mutations.some(function (mutation) {
          return mutation.type === 'attributes';
        })
      ) {
        syncNativeSelection(picker, groups);
        refreshPickerState(picker, groups);
      }
    });

    groups.forEach(function (options) {
      options.forEach(function (option) {
        selectionObserver.observe(option.element, {
          attributes: true,
          attributeFilter: ['class'],
        });
      });
    });

    syncNativeSelection(picker, groups);
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

    window.addEventListener('pageshow', function () {
      document.querySelectorAll(PICKER_SELECTOR).forEach(function (picker) {
        var sourceList = picker.parentElement.querySelector(
          '.ec-product-button[data-ignis-quantity-enhanced]',
        );
        var groups = sourceList ? getQuantityGroups(sourceList) : null;

        if (groups) {
          refreshPickerState(picker, groups);
        }
      });
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
  } else {
    boot();
  }
})(window, document);
