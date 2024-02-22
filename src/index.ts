const CUSTOM_ELEMENT_REGISTRY = new Map<string, DocumentFragment>();

class CustomElement extends HTMLElement {
  useShadow: boolean = false;
  root: CustomElement | ShadowRoot;
  constructor () {
    super();
    this.root = this;
  }

  connectedCallback (): void {
    if (this.useShadow) {
      this.attachShadow({ mode: "open" });
      this.root = this.shadowRoot!;
    }
    const content: DocumentFragment | undefined = CUSTOM_ELEMENT_REGISTRY.get(
      this.tagName,
    );
    if (content === undefined) {
      return;
    }
    this.root.appendChild(content.cloneNode(true));
  }

  static register (
    elementClass: typeof HTMLElement,
    tag: string,
    html: string | null = null,
  ): void {
    const realTag = tag.toUpperCase();
    customElements.define(tag, elementClass);
    if (html === null) {
      return;
    }
    const template: HTMLTemplateElement = document.createElement("template");
    template.innerHTML = html!;
    const templateContent: DocumentFragment = template.content;
    CUSTOM_ELEMENT_REGISTRY.set(realTag, templateContent);
  }
}

export default CustomElement;
