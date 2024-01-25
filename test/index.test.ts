/**
 * @jest-environment jsdom
 */

import CustomElement from '../';
//import '@testing-library/jest-dom';
//import {screen} from '@testing-library/dom';

class MyElement extends CustomElement {
}

test("it creates the element", () => {

  CustomElement.register(MyElement, "my-element", `<div><h1 class="header">It Works!</h1></div>`);

  document.body.innerHTML = `<my-element id="custom-element"></my-element>`;

  const text = document.querySelector('#custom-element').querySelector('.header').textContent;

  expect(text).toEqual("It Works!");

});

class MyShadowElement extends CustomElement {
  useShadow = true;
}

test("it creates the element with shadow", () => {


  CustomElement.register(MyShadowElement, "my-shadow-element", `<div><h1 class="header">It Works!</h1></div>`);

  document.body.innerHTML = `<my-shadow-element id="shadow-element"></my-shadow-element>`;

  const text = document.body.querySelector('#shadow-element').shadowRoot.querySelector('.header').textContent;

  expect(text).toEqual("It Works!");
});
