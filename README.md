# @coverslide/customelement

A tiny base class for building Web Components with declarative HTML templates.

Define a custom element, give it a tag name and some optional HTML, and the
markup is cloned into the element (or its shadow root) when it connects.

## Installation

```sh
npm install @coverslide/customelement
```

This package is ESM-only and targets the browser. It requires a DOM
(`HTMLElement`, `customElements`, `document`).

## Usage

```ts
import CustomElement from "@coverslide/customelement";

class MyElement extends CustomElement {
  connectedCallback(): void {
    super.connectedCallback();

    this.querySelector("button")?.addEventListener("click", () => {
      console.log("clicked");
    });
  }
}

CustomElement.register(
  MyElement,
  "my-element",
  "<div><h1>It works!</h1><button>Click me</button></div>",
);
```

Then use the element in your HTML:

```html
<my-element></my-element>
```

### Shadow DOM

Set `useShadow` to `true` on your subclass to render the template into a shadow
root instead of the light DOM. `this.root` will point at the shadow root.

```ts
class MyShadowElement extends CustomElement {
  useShadow = true;
}

CustomElement.register(
  MyShadowElement,
  "my-shadow-element",
  "<h1>Inside the shadow root</h1>",
);
```

### Registering without a template

The HTML argument is optional. Omit it (or pass `null`) when you want to build
the element's content yourself.

```ts
class EmptyElement extends CustomElement {}

CustomElement.register(EmptyElement, "empty-element");
```

### Namespacing

Register related elements under a namespace so multiple applications or
versions can coexist on the same page:

```ts
import CustomElement from "@coverslide/customelement";

class Card extends CustomElement {}
class CardHeader extends CustomElement {}

CustomElement.registerAll(
  [
    {
      elementClass: Card,
      name: "card",
      html: "<card-header></card-header><slot></slot>",
    },
    {
      elementClass: CardHeader,
      name: "card-header",
      html: "<slot></slot>",
    },
  ],
  "myapp",
);
```

This defines `<myapp-card>` and `<myapp-card-header>`. Custom element tags inside
a registered template that match another name in the same batch are prefixed
automatically, so `<card-header>` becomes `<myapp-card-header>`.

Namespacing happens when the template is registered, not when it is rendered.
The stored fragment already contains the qualified tags, and registering the
same class in another namespace creates a separately namespaced template for
that registration. There is no `{namespace}` string substitution; write the
ordinary local tag names in `html`, or use explicit qualified tags if the child
is registered separately. For runtime lookups, use `this.tag(name)`.

Inside an element, use `this.tag(name)` to resolve a name in that element's
namespace, and `this.namespace` to read the namespace:

```ts
class Card extends CustomElement {
  connectedCallback(): void {
    super.connectedCallback();
    this.querySelectorAll(this.tag("card-header"));
  }
}
```

Set a default namespace once instead of passing it to every registration:

```ts
CustomElement.defaultNamespace = "myapp";

CustomElement.register(Card, "card", "<slot></slot>"); // myapp-card
```

Pass `""` explicitly to register without a namespace.

> Library code should pass an explicit namespace (including `""`) when a
> default namespace should not affect its tag names.

Packages that expose several elements should give their registration helper an
explicit default and accept an override:

```ts
export function registerCardElements(namespace: string = "card"): string[] {
  return CustomElement.registerAll(
    [
      { elementClass: Card, name: "card", html: "<slot></slot>" },
      { elementClass: CardHeader, name: "header", html: "<slot></slot>" },
    ],
    namespace,
  );
}
```

Callers can then align a downstream package with the rest of the application by
passing the same namespace:

```ts
registerCardElements("myapp"); // myapp-card, myapp-header
```

Check for conflicts before registering:

```ts
CustomElement.conflicts(["card"], "myapp");
// ["myapp-card"] when the tag is already registered
```

`register` and `registerAll` throw a `CustomElementRegistrationError` before
defining anything, so a conflicting batch is never partially registered. The
error's `conflicts` property lists the offending tag names.

## API

### `class CustomElement extends HTMLElement`

| Member | Description |
| --- | --- |
| `useShadow: boolean` | Defaults to `false`. When `true`, a shadow root is attached on connect and `root` points at it. Set this on your subclass before the element connects. |
| `root: CustomElement \| ShadowRoot` | Where registered template content is appended. Points at the element itself unless `useShadow` is enabled. Query this rather than `this` if you want to support both modes. |
| `namespace: string` | The namespace this element was registered in. |
| `tag(name: string): string` | Qualifies `name` with this element's namespace. |
| `connectedCallback(): void` | Attaches the shadow root (when requested) and clones the registered template into `root`. Call `super.connectedCallback()` when overriding, otherwise the template will not render. |
| `static defaultNamespace: string` | Namespace used when a registration or lookup omits one. Defaults to `""`. |
| `static register(elementClass, name, html?, namespace?)` | Defines the element and stores `html` as its template. Returns the qualified tag name. `html` may be a string, `null`, or omitted. |
| `static registerAll(registrations, namespace?)` | Registers a batch atomically. Each registration has `elementClass`, `name`, and optional `html`. Returns the qualified tag names. |
| `static tag(name, namespace?)` | Qualifies `name` with `namespace` (or the default namespace). |
| `static conflicts(names, namespace?)` | Returns qualified tag names that are already registered or duplicated in the list. |
| `static register` / `registerAll` | Throw `CustomElementRegistrationError` (with a `conflicts` array) when a tag or class is already registered. |

`register` also validates the final tag name before defining anything. Custom
element names must be lowercase, start with a letter, and contain a hyphen.

## TypeScript

Type declarations are included, so no `@types` package is needed. The package
requires the DOM library in your `tsconfig.json`:

```json
{
  "compilerOptions": {
    "lib": ["ES2022", "DOM"]
  }
}
```

Because the package is ESM-only, import it with `import` rather than `require`.
It works with `moduleResolution` set to `bundler`, `node16`, or `nodenext`.

```ts
import CustomElement from "@coverslide/customelement";

class Greeting extends CustomElement {
  useShadow = true;
}

CustomElement.register(Greeting, "my-greeting", "<p>Hello</p>");
```

## Development

```sh
npm install
npm run build   # compile TypeScript to dist/
npm test        # run the Jest test suite
npm run lint    # lint src/ and test/
npm run fix     # lint and auto-fix
```

## License

ISC
