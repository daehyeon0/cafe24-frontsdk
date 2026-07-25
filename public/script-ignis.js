(function initIgnisQuantityPicker(window, document) {
  'use strict';

  var QUANTITY_OPTIONS = Object.freeze({
    10: Object.freeze({
      price: 24700,
      discountRate: 25,
      unitPrice: 2470,
      badge: null,
    }),
    30: Object.freeze({
      price: 70500,
      discountRate: 29,
      unitPrice: 2350,
      badge: Object.freeze({
        bgColor: '#fff0ee',
        textColor: '#b72b25',
        text: '가장 많이 사용',
      }),
    }),
    50: Object.freeze({
      price: 111500,
      discountRate: 32,
      unitPrice: 2230,
      badge: null,
    }),
    100: Object.freeze({
      price: 196000,
      discountRate: 41,
      unitPrice: 1960,
      badge: Object.freeze({
        bgColor: '#fff0ee',
        textColor: '#b72b25',
        text: '최대할인',
      }),
    }),
  });

  var DEFAULT_CLIENT_ID = 'F79PeGqf20Le8Hvh63GfCA';
  var OPTION_LABEL_PATTERN = /^(\d+)개입_([12])$/;
  var PICKER_SELECTOR = '.ignis-quantity-picker';
  var SOURCE_SELECTOR =
    '.xans-product-option .ec-product-button:not([data-ignis-quantity-enhanced])';
  var STYLE_ID = 'ignis-quantity-picker-styles';
  var pickerSequence = 0;
  var cafe24Api = null;

  function formatWon(value) {
    return Number(value).toLocaleString('ko-KR') + '원';
  }

  function getClientId() {
    var currentScript = document.currentScript;

    if (!currentScript || !currentScript.src) {
      return DEFAULT_CLIENT_ID;
    }

    try {
      return (
        new URL(currentScript.src, window.location.href).searchParams.get(
          'client_id',
        ) || DEFAULT_CLIENT_ID
      );
    } catch (_error) {
      return DEFAULT_CLIENT_ID;
    }
  }

  function getCafe24Api() {
    if (cafe24Api) {
      return cafe24Api;
    }

    if (!window.CAFE24API) {
      return null;
    }

    try {
      cafe24Api = window.CAFE24API.init(getClientId());
    } catch (_error) {
      cafe24Api = window.CAFE24API;
    }

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
    var sourceOptions = sourceElements.map(getSourceOption);

    if (
      sourceOptions.length === 0 ||
      sourceOptions.some(function (option) {
        return option === null;
      })
    ) {
      return null;
    }

    var groups = new Map();

    sourceOptions.forEach(function (option) {
      if (!groups.has(option.quantity)) {
        groups.set(option.quantity, []);
      }

      groups.get(option.quantity).push(option);
    });

    var valid = Array.from(groups.values()).every(function (options) {
      var orders = options
        .map(function (option) {
          return option.order;
        })
        .sort();

      return (
        options.length === 2 &&
        orders[0] === 1 &&
        orders[1] === 2 &&
        options.every(function (option) {
          return Boolean(option.variantCode);
        })
      );
    });

    if (!valid) {
      return null;
    }

    groups.forEach(function (options) {
      options.sort(function (left, right) {
        return left.order - right.order;
      });
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
    var button = createElement('button', 'ignis-quantity-option');
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
      '(' + config.discountRate + '% 할인)',
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

  function createPicker(sourceList, groups) {
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
    var panel = createElement('div', 'ignis-quantity-panel');
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
        panel.append(
          createQuantityButton(quantity, QUANTITY_OPTIONS[quantity]),
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
    document.querySelectorAll(SOURCE_SELECTOR).forEach(function (sourceList) {
      var groups = getQuantityGroups(sourceList);

      if (groups) {
        createPicker(sourceList, groups);
      }
    });
  }

  function injectStyles() {
    if (document.getElementById(STYLE_ID)) {
      return;
    }

    var style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = [
      '.ignis-visually-hidden{position:absolute!important;width:1px!important;height:1px!important;padding:0!important;margin:-1px!important;overflow:hidden!important;clip:rect(0,0,0,0)!important;white-space:nowrap!important;border:0!important}',
      '.ignis-quantity-option-row>th{display:none!important}',
      '.ignis-quantity-option-row>td{display:block!important;width:100%!important;padding:0!important;border-top:0!important}',
      '.ignis-quantity-original{display:none!important}',
      '.ignis-quantity-picker{width:100%;margin:10px 0 4px;color:#1f1f1f;font-family:inherit;box-sizing:border-box}',
      '.ignis-quantity-picker *{box-sizing:border-box}',
      '.ignis-quantity-header{display:flex;align-items:center;justify-content:space-between;width:100%;min-height:38px;padding:8px 12px;border:0;border-radius:6px;color:#3f3f3f;background:#f4f4f4;font:inherit;font-size:12px;text-align:left;cursor:pointer}',
      '.ignis-quantity-header:hover{background:#ededed}',
      '.ignis-quantity-header:focus-visible,.ignis-quantity-option:focus-visible{outline:2px solid #1769d2;outline-offset:2px}',
      '.ignis-quantity-chevron{width:7px;height:7px;margin:3px 3px 0 12px;border-top:1.5px solid currentColor;border-left:1.5px solid currentColor;transform:rotate(45deg)}',
      '.ignis-quantity-header[aria-expanded="false"] .ignis-quantity-chevron{margin-top:-3px;transform:rotate(225deg)}',
      '.ignis-quantity-panel{width:100%}',
      '.ignis-quantity-panel[hidden]{display:none!important}',
      '.ignis-quantity-option{display:grid;grid-template-columns:20px 52px max-content minmax(0,1fr);align-items:center;column-gap:8px;width:100%;min-height:51px;padding:7px 10px;border:0;border-bottom:1px solid #e7e7e7;border-radius:0;color:#1f1f1f;background:#fff;font:inherit;text-align:left;cursor:pointer}',
      '.ignis-quantity-option:hover:not(:disabled){background:#fafafa}',
      '.ignis-quantity-option.is-selected{background:#fff7f6}',
      '.ignis-quantity-radio{display:block;width:16px;height:16px;border:1px solid #cfcfcf;border-radius:50%;background:#fff;box-shadow:inset 0 0 0 4px #fff}',
      '.ignis-quantity-option.is-selected .ignis-quantity-radio{border-color:#df4038;background:#df4038}',
      '.ignis-quantity-name{font-size:14px;font-weight:700;line-height:1.35;white-space:nowrap}',
      '.ignis-quantity-price{display:flex;min-width:0;flex-direction:column;gap:3px}',
      '.ignis-quantity-price-line{display:flex;align-items:baseline;gap:4px;min-width:0;white-space:nowrap}',
      '.ignis-quantity-total{font-size:13px;font-weight:700;line-height:1.3}',
      '.ignis-quantity-discount{color:#666;font-size:11px;font-weight:400;line-height:1.3}',
      '.ignis-quantity-unit{color:#666;font-size:11px;line-height:1.3}',
      '.ignis-quantity-meta{display:flex;align-items:center;justify-content:flex-start;gap:5px;min-width:0}',
      '.ignis-quantity-badge,.ignis-quantity-status{display:inline-flex;align-items:center;min-height:18px;padding:2px 5px;border-radius:2px;font-size:10px;font-weight:600;line-height:1.3;white-space:nowrap}',
      '.ignis-quantity-status[hidden]{display:none!important}',
      '.ignis-quantity-status{color:#555;background:#eeeeee}',
      '.ignis-quantity-option:disabled{color:#686868;background:#f7f7f7;cursor:not-allowed}',
      '.ignis-quantity-option:disabled .ignis-quantity-radio{border-color:#bdbdbd;background:#dedede}',
      '.ignis-quantity-option:disabled .ignis-quantity-total,.ignis-quantity-option:disabled .ignis-quantity-discount,.ignis-quantity-option:disabled .ignis-quantity-unit{color:#686868}',
      '@media(max-width:420px){.ignis-quantity-option{grid-template-columns:18px 50px max-content minmax(0,1fr);column-gap:7px;padding-right:8px;padding-left:8px}.ignis-quantity-total{font-size:12px}.ignis-quantity-discount,.ignis-quantity-unit{font-size:10px}.ignis-quantity-badge,.ignis-quantity-status{font-size:9px}}',
    ].join('');

    document.head.append(style);
  }

  function boot() {
    injectStyles();
    enhanceQuantityOptions();

    var scheduled = false;
    var pageObserver = new MutationObserver(function () {
      if (scheduled) {
        return;
      }

      scheduled = true;
      window.requestAnimationFrame(function () {
        scheduled = false;
        enhanceQuantityOptions();
      });
    });

    pageObserver.observe(document.body, {
      childList: true,
      subtree: true,
    });

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
