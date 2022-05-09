/**
 * Copyright IBM Corp. 2018, 2018
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

const { param, pascal } = require('change-case');
const { toString } = require('@carbon/icon-helpers');

const classCase = str => {
  const pascalled = pascal(str);
  if (Number.isNaN(Number(pascalled[0]))) {
    return pascalled;
  }
  // append a _ if the string starts with a number
  return `_${pascalled}`;
};

const componentTemplate = namespace => `
@Component({
	selector: "ibm-icon-${param(namespace)}",
  template: \`
    <svg
      ibmIcon${pascal(namespace)}
      [attr.fill]="color"
      [size]="size"
      [ariaLabel]="ariaLabel"
      [ariaLabelledby]="ariaLabelledby"
      [ariaHidden]="ariaHidden"
      [title]="title"
      [isFocusable]="focusable"
      [attr.class]="innerClass">
    </svg>
  \`
})
export class ${classCase(namespace)}Component {
  @Input() ariaLabel: string;
  @Input() ariaLabelledby: string;
  @Input() ariaHidden: boolean;
  @Input() title: string;
  @Input() focusable: boolean = false;
  @Input() innerClass: string;
  @Input() size: string;
  @Input() color: string = '#000000';
}
`;

const formatIconObject = icon => `
  "${icon.size}": {
    metadata: ${JSON.stringify(icon)},
    svg: \`${toString(icon.descriptor)}\`
  },
`;

const directiveTemplate = (namespace, iconMeta) => `
@Directive({
  selector: "[ibmIcon${pascal(namespace)}]"
})
export class ${classCase(
  namespace
)}Directive implements AfterViewInit {
  static titleIdCounter = 0;

  @Input() ariaLabel: string;
  @Input() ariaLabelledby: string;
  @Input() ariaHidden: boolean;
  @Input() title: string;
  @Input() isFocusable: boolean = false;
  @Input() size: string;
  @Input() color: string = '#000000';

  protected icons = {
    ${iconMeta.output.reduce((str, icon) => `${str}${formatIconObject(icon)}`, '')}
  };

  constructor(protected elementRef: ElementRef) {}

	ngAfterViewInit() {
    const svg = this.elementRef.nativeElement;
    svg.setAttribute("xmlns", "http://www.w3.org/2000/svg");

    const icon = this.icons[this.size]

    const domParser = new DOMParser();
    const rawSVG = icon.svg;
    const svgElement = domParser.parseFromString(rawSVG, "image/svg+xml").documentElement;

    let node = svgElement.firstChild;
    while (node) {
      // importNode makes a clone of the node
      // this ensures we keep looping over the nodes in the parsed document
      svg.appendChild(svg.ownerDocument.importNode(node, true));
      node = node.nextSibling;
    }

    const attributes = getAttributes({
      width: icon.metadata.descriptor.attrs.height,
      height: icon.metadata.descriptor.attrs.height,
      viewBox: icon.metadata.descriptor.attrs.viewBox,
      title: this.title,
      "aria-label": this.ariaLabel,
      "aria-labelledby": this.ariaLabelledby,
      "aria-hidden": this.ariaHidden,
      focusable: this.isFocusable.toString()
    });

    const attrKeys = Object.keys(attributes);
    for (let i = 0; i < attrKeys.length; i++) {
      const key = attrKeys[i];
      const value = attributes[key];
      if (key === "title") {
        continue;
      }
      if (value) {
        svg.setAttribute(key, value);
      }
    }

    if (attributes.title) {
      const title = document.createElement("title");
      title.textContent = attributes.title;
      ${classCase(namespace)}Directive.titleIdCounter++;
      title.setAttribute("id", \`${param(namespace)}-$\{${classCase(
  namespace
)}Directive.titleIdCounter}\`);
      svg.appendChild(title);
      svg.setAttribute("aria-labelledby", \`${param(
        namespace
      )}-$\{${classCase(namespace)}Directive.titleIdCounter}\`);
    }
	}
}
`;

const formatModuleDeclarations = namespace => `
  ${classCase(namespace)}Component,
  ${classCase(namespace)}Directive,
`;

const moduleTemplate = (namespace, iconMeta) => `
import {
  NgModule,
  Component,
  Directive,
  ElementRef,
  Input,
  AfterViewInit
} from "@angular/core";
import { getAttributes } from "@carbon/icon-helpers";

${componentTemplate(namespace)}

${directiveTemplate(namespace, iconMeta)}

@NgModule({
  declarations: [
    ${formatModuleDeclarations(namespace)}
  ],
  exports: [
    ${formatModuleDeclarations(namespace)}
  ]
})
export class ${classCase(namespace)}Module {}
`;

const rootPublicApi = namespaces =>
  namespaces.reduce(
    (str, name) => `${str}
export * from "./${name}/icon";`,'');

const tsRootPublicApi = namespaces =>
  namespaces.reduce(
    (str, name) => `${str}
export * from "./${name}";`, '');

const flatRootPublicApi = namespaces =>
  namespaces.reduce(
    (str, name) => `${str}
export * from "./${name.split('/').join('-')}";`, '');

const jsRootPublicApi = namespaces =>
  namespaces.reduce(
    (str, name) => `${str}
export * from "./${name}/index";`, '');

module.exports = {
  moduleTemplate,
  rootPublicApi,
  tsRootPublicApi,
  jsRootPublicApi,
  flatRootPublicApi
};
