(function initIgnisProductDetailEnhanceOptions(window, document) {
  'use strict';

  var REQUEST_EVENT = 'ignis:product-detail-enhance-options:request';
  var READY_EVENT = 'ignis:product-detail-enhance-options:ready';

  function getOriginalPriceFallback() {
    var productPrice = document.querySelector('#span_product_price_custom');
    var originalPrice = Number(
      productPrice.innerText.replaceAll(/[^\d]/g, '') || window.product_price,
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
