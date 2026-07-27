import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import { JSDOM } from 'jsdom';

const script = await readFile(
  new URL(
    '../cafe24/skin1/js/module/product/product-detail-enhance-options.js',
    import.meta.url,
  ),
  'utf8',
);
const styles = await readFile(
  new URL(
    '../cafe24/skin1/css/module/product/detail.css',
    import.meta.url,
  ),
  'utf8',
);

function wait(delay = 0) {
  return new Promise((resolve) => setTimeout(resolve, delay));
}

function nativeOptionMarkup({
  label = '10개입_1',
  optionValue = 'P000000L000N',
} = {}) {
  return `
    <tr class="option_product">
      <td colspan="3">
        <table class="displaynone">
          <thead><tr><th>상품명</th><th>상품수</th><th>가격</th></tr></thead>
          <tbody>
            <tr>
              <td>
                <input type="hidden" class="option_box_id" value="${optionValue}">
                <p class="product">상품명<br> - <span>${label}</span></p>
              </td>
              <td>
                <span class="quantity">
                  <input class="quantity_opt" value="1">
                  <a href="#none" class="up"><img alt="수량증가"></a>
                  <a href="#none" class="down"><img alt="수량감소"></a>
                </span>
                <a href="#none" class="delete"><img alt="삭제"></a>
              </td>
              <td class="right">
                <span>
                  <input type="hidden" class="option_box_price" value="24700">
                  <span class="ec-front-product-item-price">24,700원</span>
                </span>
              </td>
            </tr>
            <tr class="option">
              <td colspan="3">
                <table><tbody>
                  <tr class="xans-product-addoption">
                    <td>
                      <input
                        class="input_addoption"
                        add_product_code="${optionValue}"
                      >
                    </td>
                  </tr>
                </tbody></table>
              </td>
            </tr>
          </tbody>
        </table>
      </td>
    </tr>`;
}

test('Cafe24 선택 상품을 복제하지 않고 native row를 꾸민다', async () => {
  const dom = new JSDOM(
    `<!doctype html>
      <style>${styles}</style>
      <div id="product-data">{"price":32900}</div>
      <div class="xans-product-addoption">
        <input
          id="unrelated-add-option"
          class="input_addoption"
          add_product_code="P000000L000N"
        >
      </div>
      <div class="xans-product-option">
        <table><tbody><tr>
          <th>옵션 선택 (필수)</th>
          <td>
            <ul class="ec-product-button">
              <li title="10개입_2" option_value="P000000L000O">
                <a href="#none"><span>10개입_2</span></a>
              </li>
              <li title="10개입_1" option_value="P000000L000N">
                <a href="#none"><span>10개입_1</span></a>
              </li>
              <li title="30개입_1" option_value="P000000L000P">
                <a href="#none"><span>30개입_1</span></a>
              </li>
            </ul>
            <p class="value">옵션을 선택해 주세요</p>
          </td>
        </tr></tbody></table>
      </div>
      <div id="totalProducts">
        <table><tbody class="option_products"></tbody></table>
      </div>`,
    {
      pretendToBeVisual: true,
      runScripts: 'outside-only',
      url: 'https://df6d.cafe24.com/product/detail.html?product_no=11',
    },
  );
  const { document, Event } = dom.window;
  const clickedOptionValues = [];
  const optionRows = document.querySelector('.option_products');

  function addNativeOption(option) {
    const optionValue = option.getAttribute('option_value');

    clickedOptionValues.push(optionValue);
    optionRows.insertAdjacentHTML(
      'beforeend',
      nativeOptionMarkup({
        label: option.getAttribute('title'),
        optionValue,
      }),
    );

    const row = optionRows.lastElementChild;
    const quantity = row.querySelector('.quantity_opt');
    const priceInput = row.querySelector('.option_box_price');
    const price = row.querySelector('.ec-front-product-item-price');

    row.querySelector('.up').addEventListener('click', (upEvent) => {
      upEvent.preventDefault();
      quantity.value = '2';
      priceInput.value = '49400';
      price.textContent = '49,400원';
    });
    row.querySelector('.delete').addEventListener('click', (deleteEvent) => {
      deleteEvent.preventDefault();
      row.remove();
    });

    return row;
  }

  document.querySelectorAll('.ec-product-button a').forEach((link) => {
    link.addEventListener('click', (event) => {
      event.preventDefault();
      addNativeOption(link.closest('li'));
    });
  });

  dom.window.eval(script);
  document.dispatchEvent(new Event('DOMContentLoaded', { bubbles: true }));
  await wait();

  function confirmTenPack() {
    document
      .querySelector('.ignis-quantity-option[data-quantity="10"]')
      .click();
    document.querySelector('.ignis-flavor-option [data-change="1"]').click();
    document.querySelector('.ignis-flavor-confirm').click();
  }

  async function selectTenPack() {
    confirmTenPack();
    await wait();
  }

  const flavorPicker = document.querySelector('.ignis-flavor-options');
  const firstFlavor = flavorPicker.querySelector(
    '.ignis-flavor-option[data-index="0"]',
  );
  const firstFlavorCount = firstFlavor.querySelector('output');
  const flavorConfirm = flavorPicker.querySelector(
    '.ignis-flavor-confirm',
  );

  document
    .querySelector('.ignis-quantity-option[data-quantity="30"]')
    .click();
  firstFlavor.querySelector('[data-change="1"]').click();
  firstFlavor.querySelector('[data-change="1"]').click();
  assert.equal(firstFlavorCount.textContent, '2');
  assert.equal(flavorConfirm.disabled, true);

  firstFlavor.querySelector('[data-change="1"]').click();
  firstFlavor.querySelector('[data-change="1"]').click();
  assert.equal(firstFlavorCount.textContent, '3');
  assert.equal(flavorConfirm.disabled, false);

  document
    .querySelector('.ignis-quantity-option[data-quantity="10"]')
    .click();
  assert.equal(firstFlavorCount.textContent, '0');
  assert.equal(flavorConfirm.disabled, true);

  firstFlavor.querySelector('[data-change="-1"]').click();
  firstFlavor.querySelector('[data-change="1"]').click();
  firstFlavor.querySelector('[data-change="1"]').click();
  assert.equal(firstFlavorCount.textContent, '1');
  assert.equal(flavorConfirm.disabled, false);
  document.querySelector('[data-close]').click();

  await selectTenPack();

  let row = document.querySelector('.option_product');
  let nativeTable = row.querySelector('td > table');
  const nativeQuantity = row.querySelector('.quantity');
  const nativeDelete = row.querySelector('.delete');

  assert.deepEqual(clickedOptionValues, ['P000000L000N']);
  assert.equal(document.querySelector('#unrelated-add-option').value, '');
  assert.ok(row.classList.contains('ignis-option-basket-item'));
  assert.ok(!nativeTable.classList.contains('displaynone'));
  assert.equal(document.querySelector('.option-basket'), null);
  assert.equal(
    row.querySelector('.ignis-selected-option-pack-size').textContent,
    '10개입',
  );
  assert.equal(
    row.querySelector('.ignis-selected-option-flavor').textContent,
    '떡볶이맛 (10개입)*1',
  );
  assert.equal(row.querySelector('.input_addoption').disabled, true);
  assert.equal(
    row.querySelector('.input_addoption').value,
    '떡볶이맛 (10개입) * 1',
  );
  assert.equal(nativeQuantity.closest('tr'), nativeTable.tBodies[0].rows[0]);
  assert.equal(nativeDelete.closest('tr'), nativeTable.tBodies[0].rows[0]);
  assert.equal(
    nativeQuantity.querySelector('input').getAttribute('aria-label'),
    '수량',
  );
  assert.equal(dom.window.getComputedStyle(nativeTable).display, 'block');
  assert.equal(
    dom.window.getComputedStyle(nativeTable.tBodies[0].rows[0]).display,
    'grid',
  );
  assert.equal(
    dom.window.getComputedStyle(row.querySelector('.option')).display,
    'none',
  );
  assert.equal(dom.window.getComputedStyle(nativeQuantity).display, 'grid');

  nativeQuantity.querySelector('.up').click();
  assert.equal(nativeQuantity.querySelector('input').value, '2');
  assert.equal(
    row.querySelector('.ec-front-product-item-price').textContent,
    '49,400원',
  );

  nativeDelete.click();
  assert.equal(document.querySelector('.option_product'), null);

  await selectTenPack();
  row = document.querySelector('.option_product');
  assert.equal(
    row.querySelectorAll('.ignis-selected-option-summary').length,
    1,
  );

  const alerts = [];
  const errors = [];
  dom.window.alert = (message) => alerts.push(message);
  dom.window.console.error = (...args) => errors.push(args);
  const secondOption = document.querySelector(
    '.ec-product-button > li[option_value="P000000L000O"]',
  );
  const secondLink = secondOption.querySelector('a');
  let pendingNativeClicks = 0;

  secondLink.click = () => {
    pendingNativeClicks += 1;
    setTimeout(() => addNativeOption(secondOption), 5);
  };

  confirmTenPack();
  document.querySelector('[data-close]').click();
  document
    .querySelector('.ignis-quantity-option[data-quantity="10"]')
    .click();
  document.querySelector('.ignis-flavor-option [data-change="1"]').click();
  document.querySelector('.ignis-flavor-confirm').click();
  await wait(20);

  assert.equal(pendingNativeClicks, 1);
  assert.equal(
    document.querySelectorAll(
      '.option_box_id[value="P000000L000O"]',
    ).length,
    1,
  );

  document
    .querySelector('.option_box_id[value="P000000L000O"]')
    .closest('.option_product')
    .querySelector('.delete')
    .click();

  secondLink.click = () => {
    addNativeOption(secondOption);
    throw new Error('native click failed');
  };

  confirmTenPack();
  await wait();

  assert.equal(errors.at(-1)[0], '[Cafe24 option transaction]');
  assert.equal(
    alerts.at(-1),
    '옵션을 추가하지 못했습니다. 다시 시도해 주세요.',
  );
  assert.equal(
    document.querySelector(
      '.option_box_id[value="P000000L000O"]',
    ),
    null,
  );
  assert.equal(document.querySelector('.ignis-flavor-confirm').disabled, false);

  dom.window.close();
});
