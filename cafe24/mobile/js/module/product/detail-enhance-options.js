(function initIgnisProductDetailEnhanceOptions(window, document) {
  'use strict';

  function getOriginalPriceFallback() {
    var productPrice = document.querySelector('#product_price');
    var originalPrice = Number(
      (productPrice && productPrice.value) || window.product_price,
    );

    return Number.isFinite(originalPrice) && originalPrice > 0
      ? originalPrice
      : null;
  }

  function getBasketElements(mainRow) {
    var quantityInput = mainRow && mainRow.querySelector('.quantity_opt');
    var quantity =
      quantityInput &&
      (quantityInput.closest('.quantity') || quantityInput.parentElement);
    var deleteButton = mainRow && mainRow.querySelector('.delete');
    var deleteCell = deleteButton && deleteButton.closest('td');

    return {
      quantity: quantity,
      controlsCell: quantity && quantity.closest('td'),
      quantityInput: quantityInput,
      quantityUp: quantity && quantity.querySelector('.up'),
      quantityDown: quantity && quantity.querySelector('.down'),
      deleteButton: deleteButton,
      deleteCell: deleteCell,
      extraRequired: [deleteCell],
    };
  }

  function decorateBasketItem(item) {
    item.summary.classList.add('ignis-option-basket-description');
    item.descriptionCell.classList.add('ignis-option-basket-controls');
    item.elements.deleteCell.classList.add('ignis-option-basket-controls');
  }

  function updateFlavorSheet(sheet, isHidden) {
    if (isHidden && sheet.open) {
      sheet.close();
    } else if (!isHidden && !sheet.open) {
      sheet.showModal();
    }
  }

  function isFlavorSheetBackdropClick(event, sheet) {
    return event.target === sheet;
  }

  function mountFlavorSheet(sheet, _picker, dismiss) {
    sheet.addEventListener('cancel', function (event) {
      event.preventDefault();
      dismiss();
    });
    document.body.append(sheet);
  }

  var platform = {
    getOriginalPriceFallback: getOriginalPriceFallback,
    getBasketElements: getBasketElements,
    decorateBasketItem: decorateBasketItem,
    flavorSheetTagName: 'dialog',
    updateFlavorSheet: updateFlavorSheet,
    isFlavorSheetBackdropClick: isFlavorSheetBackdropClick,
    mountFlavorSheet: mountFlavorSheet,
  };

  window.IgnisProductDetailEnhanceOptionsPlatform = platform;

  if (window.IgnisProductDetailEnhanceOptions) {
    window.IgnisProductDetailEnhanceOptions(platform);
  }
})(window, document);
