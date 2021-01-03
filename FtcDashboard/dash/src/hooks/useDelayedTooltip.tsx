import { useEffect, useState, useRef, useCallback } from 'react';

export default function useDelayedTooltip(delay: number) {
  const [isShowingTooltip, setIsShowingTooltip] = useState(false);
  const isMouseStillIn = useRef(false);

  const timeoutTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const ref = useRef<HTMLElement | null>(null);
  const setRef = useCallback(
    (node) => {
      const onMouseEnter = () => {
        isMouseStillIn.current = true;

        if (timeoutTimer.current !== null) clearInterval(timeoutTimer.current);

        timeoutTimer.current = setTimeout(() => {
          if (isMouseStillIn.current) {
            setIsShowingTooltip(true);
          } else {
            setIsShowingTooltip(false);
          }
        }, delay * 1000);
      };
      const onMouseLeave = () => {
        isMouseStillIn.current = false;
        setIsShowingTooltip(false);
      };

      if (ref.current !== null) {
        ref.current?.removeEventListener('mouseenter', onMouseEnter);
        ref.current?.removeEventListener('focusin', onMouseEnter);
        ref.current?.removeEventListener('mouseleave', onMouseLeave);
        ref.current?.removeEventListener('focusout', onMouseLeave);
      }

      if (node) {
        node.addEventListener('mouseenter', onMouseEnter);
        node.addEventListener('focusin', onMouseEnter);
        node.addEventListener('mouseleave', onMouseLeave);
        node.addEventListener('focusout', onMouseLeave);
      }

      ref.current = node;
    },
    [delay],
  );

  useEffect(() => {
    return () => {
      if (timeoutTimer.current !== null) clearTimeout(timeoutTimer.current);
    };
  }, []);

  return { isShowingTooltip, ref: setRef };
}
