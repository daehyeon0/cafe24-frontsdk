(function configureIgnisProductDetail(window) {
  'use strict';

  window.FLAVOR_OPTIONS = [
    {
      title: '떡볶이맛 (10개입)',
      description: '130kcal, 단백질 18g',
      highlight: '신제품 출시!',
      isSoldout: false,
      img: 'https://ecimg.cafe24img.com/pg3185b70119868017/df6d/web/product/product-img/통살소스_떡볶이맛전면_원본_0524.png',
    },
    {
      title: '버터치킨커리맛 (10개입)',
      description: '105kcal, 단백질 18g',
      highlight: '',
      isSoldout: true,
      img: 'https://ecimg.cafe24img.com/pg3185b70119868017/df6d/web/product/product-img/통살소스_버터치킨커리맛(전면).png',
    },
    {
      title: '핫양념치킨맛 (10개입)',
      description: '125kcal, 단백질 19g',
      highlight: '',
      isSoldout: false,
      img: 'https://ecimg.cafe24img.com/pg3185b70119868017/df6d/web/product/product-img/통살소스_핫양념치킨맛전면_원본_0524.png',
    },
    {
      title: '치폴레마요맛 (10개입)',
      description: '125kcal, 단백질 18g',
      highlight: '',
      isSoldout: false,
      img: 'https://ecimg.cafe24img.com/pg3185b70119868017/df6d/web/product/product-img/통살소스_치폴레마요맛(전면).png',
    },
    {
      title: '허니소이맛 (10개입)',
      description: '125kcal, 단백질 18g',
      highlight: '',
      isSoldout: false,
      img: 'https://ecimg.cafe24img.com/pg3185b70119868017/df6d/web/product/product-img/통살소스_허니소이전면_원본_0814.png',
    },
    {
      title: '왕갈비맛 (10개입)',
      description: '125kcal, 단백질 18g',
      highlight: '',
      isSoldout: false,
      img: 'https://ecimg.cafe24img.com/pg3185b70119868017/df6d/web/product/product-img/통살소스_왕갈비맛전면_원본.png',
    },
  ];

  window.PACKSIZE_OPTION = Object.freeze({
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
  console.log('packsize', window.PACKSIZE_OPTION)
})(window);
