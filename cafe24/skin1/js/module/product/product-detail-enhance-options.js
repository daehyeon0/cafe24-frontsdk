(function initIgnisProductDetailEnhanceOptions(window, document) {
  'use strict';

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

  window.IgnisProductDetailEnhanceOptionsPlatform = platform;

  if (window.IgnisProductDetailEnhanceOptions) {
    window.IgnisProductDetailEnhanceOptions(platform);
  }
})(window, document);
