const CUSTOM_ELEMENT_REGISTRY = new Map<string, DocumentFragment>();
const CUSTOM_ELEMENT_NAMESPACES = new Map<string, string>();
const CUSTOM_ELEMENT_CLASSES = new Set<typeof HTMLElement>();
const NAMESPACE_NAMES = new Map<string, Set<string>>();

const RESERVED_TAGS = new Set([
  "annotation-xml",
  "color-profile",
  "font-face",
  "font-face-src",
  "font-face-uri",
  "font-face-format",
  "font-face-name",
  "missing-glyph",
]);

export interface ElementRegistration {
  elementClass: typeof HTMLElement;
  name: string;
  html?: string | null;
}

/**
 * Common registration signature for packages that provide custom elements.
 *
 * Packages should export a function named `registerElements` with this
 * signature. Consumers can alias it when importing more than one package:
 *
 * ```ts
 * import { registerElements as registerRouterElements } from "@coverslide/customelement-router";
 * ```
 */
export type RegisterElements = (namespace?: string) => void;

/**
 * Builds the standard `registerElements` helper for a package.
 *
 * The returned function has a default namespace, supports an explicit override,
 * and is idempotent per namespace.
 */
export function createElementRegistrar (
  defaultNamespace: string,
  registrations: ElementRegistration[],
): (namespace?: string) => string[] {
  const registered = new Map<string, string[]>();
  return (namespace: string = defaultNamespace): string[] => {
    const existing = registered.get(namespace);
    if (existing !== undefined) {
      return existing;
    }
    const tags = CustomElement.registerAll(registrations, namespace);
    registered.set(namespace, tags);
    return tags;
  };
}

export class CustomElementRegistrationError extends Error {
  readonly conflicts: string[];

  constructor (namespace: string, conflicts: string[], message?: string) {
    super(message ?? CustomElementRegistrationError.formatMessage(namespace, conflicts));
    this.name = "CustomElementRegistrationError";
    this.conflicts = conflicts;
  }

  private static formatMessage (namespace: string, conflicts: string[]): string {
    const qualifier = namespace === "" ? "" : ` in namespace "${namespace}"`;
    const tags = conflicts.map((tag) => `<${tag}>`).join(", ");
    return `Cannot register${qualifier}: ${tags} ${
      conflicts.length === 1 ? "is" : "are"
    } already registered.`;
  }
}

function qualifyTag (name: string, namespace: string): string {
  return namespace === "" ? name : `${namespace}-${name}`;
}

function isValidTag (tag: string): boolean {
  return /^[a-z][.0-9_a-z-]*-[.0-9_a-z-]*$/.test(tag) && !RESERVED_TAGS.has(tag);
}

function assertValidTag (tag: string): void {
  if (!isValidTag(tag)) {
    throw new TypeError(
      `Invalid custom element name "${tag}". Names must be lowercase, ` +
      "start with a letter, contain a hyphen, and not be a reserved name.",
    );
  }
}

function findConflicts (tags: string[]): string[] {
  const seen = new Set<string>();
  const conflicts = new Set<string>();
  for (const tag of tags) {
    const key = tag.toUpperCase();
    if (
      seen.has(key) ||
      customElements.get(tag) !== undefined ||
      CUSTOM_ELEMENT_REGISTRY.has(key)
    ) {
      conflicts.add(tag);
    }
    seen.add(key);
  }
  return Array.from(conflicts);
}

function renameElement (element: Element, tag: string): Element {
  const replacement = document.createElement(tag);
  for (const attribute of element.attributes) {
    replacement.setAttribute(attribute.name, attribute.value);
  }
  while (element.firstChild !== null) {
    replacement.appendChild(element.firstChild);
  }
  element.replaceWith(replacement);
  return replacement;
}

function prefixTemplateTags (
  parent: ParentNode,
  namespace: string,
  names: Set<string>,
): void {
  if (namespace === "") {
    return;
  }
  for (const element of Array.from(parent.children)) {
    if (element instanceof HTMLTemplateElement) {
      prefixTemplateTags(element.content, namespace, names);
      continue;
    }
    prefixTemplateTags(element, namespace, names);
    if (
      names.has(element.localName) &&
      !element.localName.startsWith(`${namespace}-`)
    ) {
      renameElement(element, `${namespace}-${element.localName}`);
    }
  }
}

class CustomElement extends HTMLElement {
  static defaultNamespace = "";

  useShadow: boolean = false;
  root: CustomElement | ShadowRoot;

  constructor () {
    super();
    this.root = this;
  }

  get namespace (): string {
    return CUSTOM_ELEMENT_NAMESPACES.get(this.tagName) ??
      CustomElement.defaultNamespace;
  }

  tag (name: string): string {
    return CustomElement.tag(name, this.namespace);
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

  static tag (name: string, namespace: string = this.defaultNamespace): string {
    return qualifyTag(name, namespace);
  }

  static conflicts (
    names: string[],
    namespace: string = this.defaultNamespace,
  ): string[] {
    return findConflicts(names.map((name) => qualifyTag(name, namespace)));
  }

  static register (
    elementClass: typeof HTMLElement,
    name: string,
    html: string | null = null,
    namespace: string = this.defaultNamespace,
  ): string {
    return CustomElement.registerAll(
      [{ elementClass, name, html }],
      namespace,
    )[0];
  }

  static registerAll (
    registrations: ElementRegistration[],
    namespace: string = this.defaultNamespace,
  ): string[] {
    const tags = registrations.map(({ name }) => qualifyTag(name, namespace));
    for (const tag of tags) {
      assertValidTag(tag);
    }

    const conflicts = findConflicts(tags);
    if (conflicts.length > 0) {
      throw new CustomElementRegistrationError(namespace, conflicts);
    }

    const classes = new Set<typeof HTMLElement>();
    const definitionClasses = registrations.map(({ elementClass }) => {
      const definitionClass = CUSTOM_ELEMENT_CLASSES.has(elementClass) ||
        classes.has(elementClass)
        ? class extends elementClass {}
        : elementClass;
      classes.add(elementClass);
      classes.add(definitionClass);
      return definitionClass;
    });

    const localNames = new Set(registrations.map(({ name }) => name));
    for (const name of NAMESPACE_NAMES.get(namespace) ?? []) {
      localNames.add(name);
    }

    const templates = registrations.map(({ html }) => {
      if (html === null || html === undefined) {
        return null;
      }
      const template = document.createElement("template");
      template.innerHTML = html;
      prefixTemplateTags(template.content, namespace, localNames);
      return template.content;
    });

    for (const [index, registration] of registrations.entries()) {
      const tag = tags[index];
      const definitionClass = definitionClasses[index];
      customElements.define(tag, definitionClass);
      CUSTOM_ELEMENT_CLASSES.add(definitionClass);
      CUSTOM_ELEMENT_NAMESPACES.set(tag.toUpperCase(), namespace);
      const template = templates[index];
      if (template !== null) {
        CUSTOM_ELEMENT_REGISTRY.set(tag.toUpperCase(), template);
      }
      const names = NAMESPACE_NAMES.get(namespace) ?? new Set<string>();
      names.add(registration.name);
      NAMESPACE_NAMES.set(namespace, names);
    }

    return tags;
  }
}

export default CustomElement;
