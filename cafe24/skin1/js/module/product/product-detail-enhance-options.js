(function initIgnisProductDetailEnhanceOptions(window, document) {
  'use strict';

  var REQUEST_EVENT = 'ignis:product-detail-enhance-options:request';
  var READY_EVENT = 'ignis:product-detail-enhance-options:ready';

  function getBasketElements(mainRow) {
    var quantity = mainRow && mainRow.querySelector('.quantity');

    return {
      quantity: quantity,
      controlsCell: quantity && quantity.closest('td'),
      quantityInput: quantity && quantity.querySelector('input'),
      quantityUp: quantity && quantity.querySelector('.up'),
      quantityDown: quantity && quantity.querySelector('.down'),
      deleteButton: mainRow && mainRow.querySelector('.delete'),
    };
  }

  function decorateBasketItem(item) {
    item.descriptionCell.classList.add('ignis-option-basket-description');
  }

  function mountFlavorSheet(sheet, picker) {
    picker.insertAdjacentElement('afterend', sheet);
  }

  var platform = {
    getBasketElements: getBasketElements,
    decorateBasketItem: decorateBasketItem,
    flavorSheetTagName: 'section',
    mountFlavorSheet: mountFlavorSheet,
  };

  function connect(event) {
    if (typeof event.detail !== 'function') {
      return;
    }

    document.removeEventListener(READY_EVENT, connect);
    event.detail(platform);
  }

  document.addEventListener(READY_EVENT, connect);
  document.dispatchEvent(new window.CustomEvent(REQUEST_EVENT));
})(window, document);
