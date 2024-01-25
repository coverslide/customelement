const CUSTOM_ELEMENT_REGISTRY :Map<String, DocumentFragment> = new Map();

class CustomElement extends HTMLElement {
    useShadow = false;
  
    connectedCallback() :void {
        if (this.useShadow) {
          this.attachShadow({ mode: "open" });
        }
        const content :DocumentFragment = CUSTOM_ELEMENT_REGISTRY.get(this.tagName)!;
        if (content === null) {
          throw new Error(`Tag not found: ${this.tagName}`);
        }
        (this.useShadow ? this.shadowRoot : this)!.appendChild(content.cloneNode(true));
    }
  
    static register(elementClass :typeof HTMLElement, tag :string, html :string){
        const realTag = tag.toUpperCase();
        if (CUSTOM_ELEMENT_REGISTRY.has(realTag)) {
            throw new Error(`Tag already registered: ${tag}`);
        }
        customElements.define(tag, elementClass);
        const template :HTMLTemplateElement = document.createElement("template");
        template.innerHTML = html;
        const templateContent :DocumentFragment = template.content;
        CUSTOM_ELEMENT_REGISTRY.set(realTag, templateContent);
    }
}

export default CustomElement;
