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

## API

### `class CustomElement extends HTMLElement`

| Member | Description |
| --- | --- |
| `useShadow: boolean` | Defaults to `false`. When `true`, a shadow root is attached on connect and `root` points at it. Set this on your subclass before the element connects. |
| `root: CustomElement \| ShadowRoot` | Where registered template content is appended. Points at the element itself unless `useShadow` is enabled. Query this rather than `this` if you want to support both modes. |
| `connectedCallback(): void` | Attaches the shadow root (when requested) and clones the registered template into `root`. Call `super.connectedCallback()` when overriding, otherwise the template will not render. |
| `static register(elementClass, tag, html?)` | Defines the element via `customElements.define` and stores `html` as a template for `tag`. `html` may be a string, `null`, or omitted. |

`register` throws if the tag name or constructor has already been registered,
matching the native `customElements.define` behavior.

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
