import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import { JSDOM } from 'jsdom';

const script = await readFile(
  new URL('../public/script-ignis.js', import.meta.url),
  'utf8',
);

const quantityVariants = [
  ['10개입_1', 'P000000L000N'],
  ['10개입_2', 'P000000L000O'],
  ['30개입_1', 'P000000L000P'],
  ['30개입_2', 'P000000L000Q'],
  ['50개입_1', 'P000000L000R'],
  ['50개입_2', 'P000000L000S'],
  ['100개입_1', 'P000000L000T'],
  ['100개입_2', 'P000000L000U'],
];

function optionListMarkup(options) {
  return options
    .map(
      ([label, variantCode]) => `
        <li title="${label}" option_value="${variantCode}">
          <a href="#none"><span>${label}</span></a>
        </li>
      `,
    )
    .join('');
}

function wait(duration = 0) {
  return new Promise((resolve) => setTimeout(resolve, duration));
}

async function createQuantityPage({
  options = quantityVariants,
  cartVariantCodes = [],
} = {}) {
  const dom = new JSDOM(
    `<!doctype html>
      <html lang="ko">
        <head></head>
        <body>
          <div class="xans-product-option">
            <table>
              <tbody>
                <tr>
                  <th>옵션 선택 (필수)</th>
                  <td>
                    <ul class="ec-product-button">
                      ${optionListMarkup(options)}
                    </ul>
                    <p class="value">[필수] 옵션을 선택해 주세요</p>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <div class="xans-product-action">
            <a
              href="#none"
              id="cart-button"
              onclick="product_submit(2, '/exec/front/order/basket/', this)"
            >장바구니 담기</a>
          </div>
        </body>
      </html>`,
    {
      pretendToBeVisual: true,
      runScripts: 'outside-only',
      url: 'https://df6d.cafe24.com/product/detail.html?product_no=11',
    },
  );
  const nativeSelections = [];
  let initializedClientId = null;

  dom.window.document
    .querySelectorAll('.ec-product-button li a')
    .forEach((link) => {
      link.addEventListener('click', (event) => {
        event.preventDefault();

        const selectedOption = link.closest('li');
        const optionList = selectedOption.parentElement;

        optionList
          .querySelectorAll('li')
          .forEach((option) =>
            option.classList.remove('ec-product-selected'),
          );
        selectedOption.classList.add('ec-product-selected');
        nativeSelections.push(selectedOption.getAttribute('option_value'));
      });
    });

  dom.window.CAFE24API = {
    init(clientId) {
      initializedClientId = clientId;

      return {
        getCartItemList(callback) {
          callback(null, {
            items: cartVariantCodes.map((variantCode) => ({
              variant_code: variantCode,
            })),
          });
        },
      };
    },
  };

  dom.window.eval(script);
  dom.window.document.dispatchEvent(
    new dom.window.Event('DOMContentLoaded', {
      bubbles: true,
    }),
  );
  await wait();

  return {
    dom,
    cartVariantCodes,
    nativeSelections,
    getInitializedClientId: () => initializedClientId,
  };
}

test('수량 옵션 두 개씩을 가격 정보가 포함된 네 개 행으로 합친다', async () => {
  const page = await createQuantityPage();
  const { document } = page.dom.window;
  const sourceList = document.querySelector('.ec-product-button');
  const picker = document.querySelector('.ignis-quantity-picker');
  const buttons = Array.from(
    document.querySelectorAll('.ignis-quantity-option'),
  );

  assert.ok(picker);
  assert.equal(sourceList.dataset.ignisQuantityEnhanced, 'true');
  assert.ok(sourceList.classList.contains('ignis-quantity-original'));
  assert.equal(buttons.length, 4);
  assert.deepEqual(
    buttons.map((button) => button.dataset.quantity),
    ['10', '30', '50', '100'],
  );
  assert.match(buttons[0].textContent, /10개입/);
  assert.match(buttons[0].textContent, /24,700원/);
  assert.match(buttons[0].textContent, /25% 할인/);
  assert.match(buttons[0].textContent, /1개 : 2,470원/);
  assert.match(buttons[1].textContent, /가장 많이 사용/);
  assert.match(buttons[3].textContent, /최대할인/);
  assert.equal(
    page.getInitializedClientId(),
    'F79PeGqf20Le8Hvh63GfCA',
  );

  page.dom.window.close();
});

test('장바구니 상태에 따라 _1, _2 순으로 선택한 뒤 행을 비활성화한다', async () => {
  const page = await createQuantityPage();
  const { document } = page.dom.window;
  const tenPack = document.querySelector(
    '.ignis-quantity-option[data-quantity="10"]',
  );
  const cartButton = document.querySelector('#cart-button');

  assert.equal(cartButton.dataset.ignisCartTracking, 'true');

  tenPack.click();
  await wait();

  assert.deepEqual(page.nativeSelections, ['P000000L000N']);
  assert.equal(tenPack.getAttribute('aria-checked'), 'true');

  cartButton.click();
  page.cartVariantCodes.push('P000000L000N');
  await wait(320);

  assert.equal(tenPack.disabled, false);
  assert.equal(tenPack.dataset.nextOrder, '2');
  assert.equal(tenPack.getAttribute('aria-checked'), 'false');

  tenPack.click();
  await wait();

  assert.deepEqual(page.nativeSelections, [
    'P000000L000N',
    'P000000L000O',
  ]);

  cartButton.click();
  page.cartVariantCodes.push('P000000L000O');
  await wait(320);

  assert.equal(tenPack.disabled, true);
  assert.ok(tenPack.classList.contains('is-exhausted'));
  assert.match(tenPack.textContent, /담기 완료/);
  assert.match(tenPack.getAttribute('aria-label'), /모두 장바구니에 담음/);

  tenPack.click();
  await wait();

  assert.deepEqual(page.nativeSelections, [
    'P000000L000N',
    'P000000L000O',
  ]);

  page.dom.window.close();
});

test('수량형 _1, _2 쌍이 아닌 Cafe24 옵션은 변경하지 않는다', async () => {
  const page = await createQuantityPage({
    options: [
      ['매운맛', 'P000000L000A'],
      ['순한맛', 'P000000L000B'],
    ],
  });
  const { document } = page.dom.window;

  assert.equal(document.querySelector('.ignis-quantity-picker'), null);
  assert.equal(
    document.querySelector('.ec-product-button').dataset
      .ignisQuantityEnhanced,
    undefined,
  );

  page.dom.window.close();
});

test('옵션 헤더는 목록을 접고 다시 펼친다', async () => {
  const page = await createQuantityPage();
  const { document } = page.dom.window;
  const header = document.querySelector('.ignis-quantity-header');
  const panel = document.querySelector('.ignis-quantity-panel');

  assert.equal(header.getAttribute('aria-expanded'), 'true');
  assert.equal(panel.hidden, false);

  header.click();
  assert.equal(header.getAttribute('aria-expanded'), 'false');
  assert.equal(panel.hidden, true);

  header.click();
  assert.equal(header.getAttribute('aria-expanded'), 'true');
  assert.equal(panel.hidden, false);

  page.dom.window.close();
});
