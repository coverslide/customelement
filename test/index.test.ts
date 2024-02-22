/**
 * @jest-environment jsdom
 */

import CustomElement from "../src/index";

class MyElement extends CustomElement {}

class MyShadowElement extends CustomElement {
  useShadow = true;
}

class MyUnregisteredElement extends CustomElement {}

class MyEmptyElement extends CustomElement {}

test("it creates the element", () => {
  CustomElement.register(
    MyElement,
    "my-element",
    "<div><h1 class=\"header\">It Works!</h1></div>",
  );

  document.body.innerHTML = "<my-element id=\"custom-element\"></my-element>";

  const text: string = document
    .querySelector("#custom-element")!
    .querySelector(".header")!.textContent!;

  expect(text).toEqual("It Works!");
});

test("it creates the element with shadow", () => {
  CustomElement.register(
    MyShadowElement,
    "my-shadow-element",
    "<div><h1 class=\"header\">It Works!</h1></div>",
  );

  document.body.innerHTML =
    "<my-shadow-element id=\"shadow-element\"></my-shadow-element>";

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
      "<div><h1 class=\"header\">It Works!</h1></div>",
    );
  }).toThrow("This name has already been registered in the registry.");
});

test("it cannot register the same element twice", () => {
  expect(() => {
    CustomElement.register(
      MyShadowElement,
      "my-shadow-element-2",
      "<div><h1 class=\"header\">It Works!</h1></div>",
    );
  }).toThrow("This constructor has already been registered in the registry.");
});

test("it can be registered with no html", () => {
  CustomElement.register(MyEmptyElement, "new-element");

  document.body.appendChild(document.createElement("new-element"));

  expect(document.querySelector('new-element')!.innerHTML).toEqual("");
});