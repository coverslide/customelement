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
      throw new Error(`Tag not found: ${this.tagName}`);
    }
    this.root.appendChild(content.cloneNode(true));
  }

  static register (
    elementClass: typeof HTMLElement,
    tag: string,
    html: string,
  ): void {
    const realTag = tag.toUpperCase();
    if (CUSTOM_ELEMENT_REGISTRY.has(realTag)) {
      throw new Error(`Tag already registered: ${tag}`);
    }
    customElements.define(tag, elementClass);
    const template: HTMLTemplateElement = document.createElement("template");
    template.innerHTML = html;
    const templateContent: DocumentFragment = template.content;
    CUSTOM_ELEMENT_REGISTRY.set(realTag, templateContent);
  }
}

export default CustomElement;
