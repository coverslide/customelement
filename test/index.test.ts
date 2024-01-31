/**
 * @jest-environment jsdom
 */

import CustomElement from "../";
// import '@testing-library/jest-dom';
// import {screen} from '@testing-library/dom';

class MyElement extends CustomElement {}

class MyShadowElement extends CustomElement {
  useShadow = true;
}

class MyUnregisteredElement extends CustomElement {}

test("it creates the element", () => {
  CustomElement.register(
    MyElement,
    "my-element",
    '<div><h1 class="header">It Works!</h1></div>',
  );

  document.body.innerHTML = '<my-element id="custom-element"></my-element>';

  const text: string = document
    .querySelector("#custom-element")!
    .querySelector(".header")!.textContent!;

  expect(text).toEqual("It Works!");
});
test("it creates the element with shadow", () => {
  CustomElement.register(
    MyShadowElement,
    "my-shadow-element",
    '<div><h1 class="header">It Works!</h1></div>',
  );

  document.body.innerHTML =
    '<my-shadow-element id="shadow-element"></my-shadow-element>';

  const text = document
    .querySelector("#shadow-element")!
    .shadowRoot!.querySelector(".header")!.textContent!;

  expect(text).toEqual("It Works!");
});

test("it cannot have elements share the same tag", () => {
  expect(() => {
    CustomElement.register(
      MyShadowElement,
      "my-shadow-element",
      '<div><h1 class="header">It Works!</h1></div>',
    );
  }).toThrow();
});

test("it must be registered with CustomElement", () => {
  customElements.define("my-unregistered-element", MyUnregisteredElement);

  expect(() => {
    document.appendChild(document.createElement("my-unregistered-element"));
  }).toThrow();
});
