/**
 * 构建时 esbuild 把 `react` 指到这里。
 * JSX 走 `h`；forwardRef 产出**可函数调用**的组件（测试 renderTree 与 Radix 共用）。
 */
function createElement(type, props, ...children) {
  return h(type, props, ...children);
}

function forwardRef(render) {
  function Forwarded(props) {
    return render(props, props?.ref);
  }
  Forwarded.displayName = render.displayName || render.name || 'Forwarded';
  return Forwarded;
}

function createContext(defaultValue) {
  return React.createContext(defaultValue);
}

const ReactShim = {
  createElement,
  forwardRef,
  createContext,
  useContext: (...args) => React.useContext(...args),
  useState: (...args) => React.useState(...args),
  useMemo: (...args) => React.useMemo(...args),
  useCallback: (...args) => React.useCallback(...args),
  useRef: (...args) => React.useRef(...args),
  useEffect: (...args) => React.useEffect(...args),
  useLayoutEffect: (...args) => React.useLayoutEffect(...args),
  useId: (...args) => (React.useId ? React.useId(...args) : 'rf-ui'),
  Fragment: React.Fragment,
};

export default ReactShim;
export {
  createElement,
  forwardRef,
  createContext,
};
export const Fragment = React.Fragment;
export const useContext = (...args) => React.useContext(...args);
export const useState = (...args) => React.useState(...args);
export const useMemo = (...args) => React.useMemo(...args);
export const useCallback = (...args) => React.useCallback(...args);
export const useRef = (...args) => React.useRef(...args);
export const useEffect = (...args) => React.useEffect(...args);
export const useLayoutEffect = (...args) => React.useLayoutEffect(...args);
export const useId = (...args) => (React.useId ? React.useId(...args) : 'rf-ui');
