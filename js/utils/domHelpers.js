/**
 * DOM helper utilities.
 */

/**
 * Shorthand for querySelector.
 * @param {string} selector
 * @param {ParentNode} parent
 * @returns {HTMLElement|null}
 */
export const $ = (selector, parent = document) => parent.querySelector(selector);

/**
 * Shorthand for querySelectorAll (returns real Array).
 * @param {string} selector
 * @param {ParentNode} parent
 * @returns {HTMLElement[]}
 */
export const $$ = (selector, parent = document) => [
  ...parent.querySelectorAll(selector)
];

/**
 * Create an HTML element with attributes and children.
 * @param {string} tag
 * @param {Object} attrs - { className, id, type, dataset, aria*, ... }
 * @param {(string|HTMLElement)[]} children
 * @returns {HTMLElement}
 */
export const createElement = (tag, attrs = {}, children = []) => {
  const el = document.createElement(tag);

  for (const [key, value] of Object.entries(attrs)) {
    if (key === 'className') {
      el.className = value;
    } else if (key === 'cssVars') {
      for (const [prop, val] of Object.entries(value)) {
        el.style.setProperty(prop, val);
      }
    } else if (key === 'dataset') {
      Object.assign(el.dataset, value);
    } else if (key.startsWith('aria')) {
      el.setAttribute(`aria-${key.slice(4).toLowerCase()}`, value);
    } else if (key.startsWith('on')) {
      el.addEventListener(key.slice(2).toLowerCase(), value);
    } else {
      el.setAttribute(key, value);
    }
  }

  for (const child of children) {
    if (typeof child === 'string') {
      el.appendChild(document.createTextNode(child));
    } else if (child instanceof HTMLElement) {
      el.appendChild(child);
    }
  }

  return el;
};

/**
 * Remove all children from an element.
 * @param {HTMLElement} el
 */
export const clearContainer = (el) => {
  while (el.firstChild) {
    el.removeChild(el.firstChild);
  }
};
