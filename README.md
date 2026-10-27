# @coverslide/customelement

A small base class for building Web Components with declarative HTML templates
and optional element namespaces.

A custom element class declares its local tag name and template as static
properties. Registering a group of classes applies a namespace to every tag and
prefixes matching tags inside the templates.

## Installation

```sh
npm install @coverslide/customelement
```

This package is ESM-only and targets the browser. It requires a DOM
(`HTMLElement`, `customElements`, `document`).

## Quick start

```ts
import CustomElement from "@coverslide/customelement";

class MyElement extends CustomElement {
  static localName = "my-element";
  static template = "<div><h1>It works!</h1><button>Click me</button></div>";

  connectedCallback(): void {
    super.connectedCallback();

    this.querySelector("button")?.addEventListener("click", () => {
      console.log("clicked");
    });
  }
}

CustomElement.registerElements([MyElement]);
```

Then use the element in your HTML:

```html
<my-element></my-element>
```

`localName` is the unqualified name. `registerElements` combines it with a
namespace. With no namespace, the local name must already be a valid custom
element name, meaning it must contain a hyphen.

## Namespaces

Pass a namespace to qualify every tag in a registration group:

```ts
CustomElement.registerElements([MyElement], "myapp");
// defines <myapp-my-element>
```

Set a default namespace once instead of passing it repeatedly:

```ts
CustomElement.defaultNamespace = "myapp";

CustomElement.registerElements([MyElement]);
// defines <myapp-my-element>
```

Pass `""` explicitly to opt out for one call.

### How tags are named

The final tag is:

```text
${namespace}-${localName}    when namespace is not empty
${localName}                 when namespace is empty
```

A class always declares the unqualified name:

```ts
class Card extends CustomElement {
  static localName = "card";
  static template = "<slot></slot>";
}

class CardHeader extends CustomElement {
  static localName = "card-header";
  static template = "<slot></slot>";
}

CustomElement.registerElements([Card, CardHeader], "myapp");
// <myapp-card>, <myapp-card-header>
```

| Namespace | `localName` | Final tag |
| --- | --- | --- |
| `""` | `"my-element"` | `<my-element>` |
| `"myapp"` | `"card"` | `<myapp-card>` |
| `"router"` | `"router"` | `<router-router>` |

Use `localName`, not `name`. JavaScript reserves `name` for the class name, and
TypeScript rejects a static property named `name`. Do not include the namespace
in `localName`; the registry joins the two with a hyphen. The final tag is
validated before anything is defined and must contain a hyphen.

### Templates and child tags

Custom element tags in a registered template that match another local name in
the same registration group are qualified automatically. Standard HTML tags are
never rewritten, even if their name matches a registered local name.

```ts
class Card extends CustomElement {
  static localName = "card";
  static template = "<card-title></card-title><slot></slot>";
}

class CardTitle extends CustomElement {
  static localName = "card-title";
  static template = "<slot></slot>";
}

CustomElement.registerElements([Card, CardTitle], "myapp");
// template becomes <myapp-card-title></myapp-card-title><slot></slot>
```

If a local name collides with a standard tag such as `header`, `main`, or
`button`, the standard tag is left alone. Use the qualified tag explicitly, or
pick a non-colliding local name:

```ts
class Card extends CustomElement {
  static localName = "card";
  static template = "<myapp-header></myapp-header><slot></slot>";
}
```

Namespacing happens when the template is registered, not when it renders. The
stored fragment already contains the qualified tags. Registering the same
classes in another namespace creates separately namespaced templates.

For child elements registered separately or later, write the qualified tag
explicitly:

```ts
const childTag = CustomElement.tag("card-header", "myapp"); // "myapp-card-header"

CustomElement.registerElements([Card], "myapp");
```

Or resolve it at runtime from inside the element:

```ts
class Card extends CustomElement {
  static localName = "card";

  connectedCallback(): void {
    super.connectedCallback();
    this.querySelectorAll(this.tag("card-header")); // myapp-card-header
  }
}
```

`this.namespace` returns the namespace the element was registered in.

## Registering a package of elements

Packages should export a helper named `registerElements` with the shared
`RegisterElements` signature. The `createElementRegistrar` helper builds one:

```ts
import { createElementRegistrar } from "@coverslide/customelement";

export const registerElements = createElementRegistrar(
  "card",
  [Card, CardHeader],
);
```

The first argument is the package's default namespace. The returned function:

- accepts an optional namespace override
- is idempotent per namespace
- returns the qualified tag names

Consumers alias the common name when using more than one element package:

```ts
import { registerElements as registerCardElements } from "@coverslide/customelement-card";
import { registerElements as registerTabsElements } from "@coverslide/customelement-tabs";

registerCardElements("myapp");
registerTabsElements("myapp");
```

Packages should expose only `registerElements`; consumers choose the local alias.
This keeps the package API consistent while avoiding name collisions.

## Conflict detection

`conflicts` accepts either local names or element classes:

```ts
CustomElement.conflicts(["card", "card-header"], "myapp");
CustomElement.conflicts([Card, CardHeader], "myapp");
```

It returns the qualified tags that are already registered, or that appear more
than once in the list.

Registration is atomic. `registerElements` checks every tag before defining
anything and throws `CustomElementRegistrationError` when there is a conflict:

```ts
try {
  CustomElement.registerElements([Card, CardHeader], "myapp");
} catch (error) {
  if (error instanceof CustomElementRegistrationError) {
    console.error(error.conflicts); // ["myapp-card"]
  }
}
```

The same class can be registered under multiple namespaces. A per-namespace
subclass is created automatically, as required by the custom elements
specification.

## Shadow DOM

Set `useShadow` to `true` to render the template into a shadow root instead of
the light DOM. `this.root` points at the shadow root.

```ts
class MyShadowElement extends CustomElement {
  static localName = "my-shadow-element";
  static template = "<h1>Inside the shadow root</h1>";
  useShadow = true;
}
```

## Elements without a template

Omit `template`, or set it to `null`, when the element builds its own content:

```ts
class EmptyElement extends CustomElement {
  static localName = "empty-element";
}
```

## Legacy registration API

The 2.x APIs remain available for compatibility, but new code should use static
metadata and `registerElements`.

```ts
// Deprecated
CustomElement.register(MyElement, "my-element", "<p>Hello</p>");
CustomElement.registerAll([
  { elementClass: First, name: "first", html: "<slot></slot>" },
  { elementClass: Second, name: "second", html: "<slot></slot>" },
]);
```

These accept an explicit local name and template. They follow the same namespace
and conflict rules.

## API

### `class CustomElement extends HTMLElement`

| Member | Description |
| --- | --- |
| `static localName: string \| null` | Unqualified tag name. Required by `registerElements`. |
| `static template: string \| null` | HTML cloned into the element on connect. `null` means no template. |
| `static defaultNamespace: string` | Namespace used when a registration or lookup omits one. Defaults to `""`. |
| `static registerElements(classes, namespace?)` | Registers classes using their static metadata. Returns the qualified tag names. |
| `static conflicts(namesOrClasses, namespace?)` | Returns qualified tags that are already registered or duplicated. |
| `static tag(name, namespace?)` | Qualifies `name` with `namespace` or the default namespace. |
| `static register(...)` | Deprecated 2.x registration with an explicit name/template. |
| `static registerAll(...)` | Deprecated 2.x batch registration with explicit names/templates. |
| `useShadow: boolean` | Defaults to `false`. Attaches a shadow root and points `root` at it when `true`. |
| `root: CustomElement \| ShadowRoot` | Where registered template content is appended. |
| `namespace: string` | The namespace this element was registered in. |
| `tag(name: string): string` | Qualifies `name` with this element's namespace. |
| `connectedCallback(): void` | Attaches the shadow root when requested and clones the registered template into `root`. Call `super.connectedCallback()` when overriding. |

### `createElementRegistrar(defaultNamespace, classes)`

Builds a standard package `registerElements` function. The returned function
uses `defaultNamespace` unless a namespace is passed, and repeated calls for the
same namespace return the already-registered tag names.

### `type RegisterElements`

```ts
type RegisterElements = (namespace?: string) => void;
```

The shared signature for package registration helpers.

### `CustomElementRegistrationError`

Thrown before anything is defined when a registration has conflicts. The
`conflicts` property contains the qualified tag names.

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
