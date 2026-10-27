/**
 * @jest-environment jsdom
 */

import CustomElement, {
  createElementRegistrar,
  CustomElementRegistrationError,
} from "../src/index";

class MyElement extends CustomElement {}

class MyShadowElement extends CustomElement {
  useShadow = true;
}

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
    .querySelector(".header")!.textContent;

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
    .shadowRoot!.querySelector(".header")!.textContent;

  expect(text).toEqual("It Works!");
});

test("it can be registered with no html", () => {
  CustomElement.register(MyEmptyElement, "new-element");

  document.body.appendChild(document.createElement("new-element"));

  expect(document.querySelector("new-element")!.innerHTML).toEqual("");
});

test("it prefixes tags with a namespace", () => {
  class NamespacedElement extends CustomElement {}

  const tag = CustomElement.register(
    NamespacedElement,
    "card",
    "<p class=\"card\">Namespaced</p>",
    "app",
  );

  expect(tag).toEqual("app-card");

  document.body.innerHTML = "<app-card></app-card>";

  expect(document.querySelector("app-card .card")!.textContent).toEqual(
    "Namespaced",
  );
});

test("it uses the default namespace", () => {
  const previousNamespace = CustomElement.defaultNamespace;
  CustomElement.defaultNamespace = "default-app";

  try {
    class DefaultElement extends CustomElement {}

    const tag = CustomElement.register(
      DefaultElement,
      "panel",
      "<p>Default</p>",
    );

    expect(tag).toEqual("default-app-panel");
    expect(CustomElement.tag("panel")).toEqual("default-app-panel");
  } finally {
    CustomElement.defaultNamespace = previousNamespace;
  }
});

test("it applies a namespace to nested templates", () => {
  class ParentElement extends CustomElement {}
  class ChildElement extends CustomElement {}

  CustomElement.registerAll(
    [
      {
        elementClass: ParentElement,
        name: "parent",
        html: "<child></child>",
      },
      {
        elementClass: ChildElement,
        name: "child",
        html: "<span class=\"child\">Child</span>",
      },
    ],
    "nested",
  );

  document.body.innerHTML = "<nested-parent></nested-parent>";

  const parent = document.querySelector("nested-parent") as ParentElement;

  expect(parent.tag("child")).toEqual("nested-child");
  expect(parent.querySelector("nested-child .child")!.textContent).toEqual(
    "Child",
  );
});

test("it renders a separate template for each namespace", () => {
  class SharedShell extends CustomElement {}
  class SharedChild extends CustomElement {}

  const registrations = [
    {
      elementClass: SharedShell,
      name: "shell",
      html: "<child></child>",
    },
    {
      elementClass: SharedChild,
      name: "child",
      html: "<span>Child</span>",
    },
  ];

  CustomElement.registerAll(registrations, "first");
  CustomElement.registerAll(registrations, "second");

  document.body.innerHTML = `
    <first-shell></first-shell>
    <second-shell></second-shell>
  `;

  expect(
    document.querySelector("first-shell first-child span")!.textContent,
  ).toEqual("Child");
  expect(
    document.querySelector("second-shell second-child span")!.textContent,
  ).toEqual("Child");
  expect(document.querySelector("first-shell second-child")).toBeNull();
  expect(document.querySelector("second-shell first-child")).toBeNull();
});

test("it lets downstream elements join an existing namespace", () => {
  class ShellElement extends CustomElement {}
  class ExtensionElement extends CustomElement {}

  CustomElement.register(ShellElement, "shell", null, "extension-app");
  CustomElement.register(
    ExtensionElement,
    "extension",
    "<span>Extension</span>",
    "extension-app",
  );

  document.body.innerHTML = `
    <extension-app-shell>
      <extension-app-extension></extension-app-extension>
    </extension-app-shell>
  `;

  const shell = document.querySelector("extension-app-shell") as ShellElement;

  expect(shell.tag("extension")).toEqual("extension-app-extension");
  expect(
    document.querySelector("extension-app-extension span")!.textContent,
  ).toEqual("Extension");
});

test("it builds an idempotent registrar for a package", () => {
  class RegistrarFirst extends CustomElement {}
  class RegistrarSecond extends CustomElement {}

  const register = createElementRegistrar("registrar", [
    {
      elementClass: RegistrarFirst,
      name: "first",
      html: "<span>First</span>",
    },
    {
      elementClass: RegistrarSecond,
      name: "second",
      html: "<second></second>",
    },
  ]);

  expect(register()).toEqual(["registrar-first", "registrar-second"]);
  expect(register()).toEqual(["registrar-first", "registrar-second"]);
  expect(register("other-registrar")).toEqual([
    "other-registrar-first",
    "other-registrar-second",
  ]);

  document.body.innerHTML = "<registrar-first></registrar-first>";

  expect(document.querySelector("registrar-first span")!.textContent).toEqual(
    "First",
  );
});

test("it detects tag conflicts before registering", () => {
  class ConflictElement extends CustomElement {}

  CustomElement.register(ConflictElement, "taken", null, "conflict-app");

  expect(CustomElement.conflicts(["taken"], "conflict-app")).toEqual([
    "conflict-app-taken",
  ]);
  expect(CustomElement.conflicts(["same", "same"], "conflict-app")).toEqual([
    "conflict-app-same",
  ]);
  expect(CustomElement.conflicts(["free"], "conflict-app")).toEqual([]);
});

test("it refuses to register a conflicting tag", () => {
  class RegisteredElement extends CustomElement {}
  class OtherElement extends CustomElement {}

  CustomElement.register(RegisteredElement, "taken", null, "tag-conflict");

  let error: CustomElementRegistrationError | undefined;
  try {
    CustomElement.register(OtherElement, "taken", null, "tag-conflict");
  } catch (caught) {
    error = caught as CustomElementRegistrationError;
  }

  expect(error).toBeInstanceOf(CustomElementRegistrationError);
  expect(error!.conflicts).toEqual(["tag-conflict-taken"]);
});

test("it does not partially register a batch", () => {
  class ExistingElement extends CustomElement {}
  class NewElement extends CustomElement {}

  CustomElement.register(ExistingElement, "existing", null, "atomic-app");

  expect(() => {
    CustomElement.registerAll(
      [
        { elementClass: NewElement, name: "fresh" },
        { elementClass: ExistingElement, name: "existing" },
      ],
      "atomic-app",
    );
  }).toThrow(CustomElementRegistrationError);

  expect(customElements.get("atomic-app-fresh")).toBeUndefined();
});

test("it allows the same class in multiple namespaces", () => {
  class SharedElement extends CustomElement {}

  CustomElement.register(SharedElement, "shared", null, "first-app");
  CustomElement.register(SharedElement, "shared", null, "second-app");

  const first = customElements.get("first-app-shared")!;
  const second = customElements.get("second-app-shared")!;

  expect(first).toBe(SharedElement);
  expect(second).not.toBe(SharedElement);
  expect(document.createElement("second-app-shared")).toBeInstanceOf(
    SharedElement,
  );
});

test("it rejects invalid custom element names", () => {
  class InvalidElement extends CustomElement {}

  expect(() => {
    CustomElement.register(InvalidElement, "router", null, "");
  }).toThrow(TypeError);

  expect(customElements.get("router")).toBeUndefined();
});
