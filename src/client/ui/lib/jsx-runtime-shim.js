import { Fragment, createElement } from './react-shim.js';

export { Fragment };

export function jsx(type, props, key) {
  if (key !== undefined && props !== null) {
    return createElement(type, { ...props, key });
  }
  return createElement(type, props);
}

export function jsxs(type, props, key) {
  return jsx(type, props, key);
}

export function jsxDEV(type, props, key) {
  return jsx(type, props, key);
}
