import { ReactNode, FunctionComponent } from 'react';
import styled from 'styled-components';

import useDelayedTooltip from '../../hooks/useDelayedTooltip';

interface RadialFabChildProps {
  bgColor: string;
  borderColor: string;

  width?: string;
  height?: string;

  fineAdjustIconX?: string;
  fineAdjustIconY?: string;

  angle: number;
  openMargin?: string;

  isOpen?: boolean;

  toolTipText?: string;

  clickEvent?: (e: React.MouseEvent) => void;

  children?: ReactNode;
}

const ButtonContainer = styled.button.attrs({
  className: 'focus:outline-none relative',
})<RadialFabChildProps>`
  position: absolute;
  top: 50%;
  left: 50%;

  transition: 200ms ease;

  transform: ${({ angle, openMargin, isOpen }) => {
    const displacementX = `calc(${
      isOpen ? Math.cos(angle) : 0
    } * ${openMargin} - 50%)`;
    const displacementY = `calc(${
      isOpen ? Math.sin(angle) : 0
    } * ${openMargin} - 50%)`;

    return `translate(${displacementX}, ${displacementY})`;
  }};

  border-radius: 50%;
  background-color: ${({ bgColor }) => bgColor};
  border: ${({ borderColor }) => `1px solid ${borderColor}`};

  box-shadow: ${({ bgColor }) => {
    function hexToRgb(hex: string) {
      // Expand shorthand form (e.g. "03F") to full form (e.g. "0033FF")
      const shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
      hex = hex.replace(shorthandRegex, function (m, r, g, b) {
        return r + r + g + g + b + b;
      });

      const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
      return result
        ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16),
          }
        : { r: 0, g: 0, b: 0 };
    }

    function rgbToString(rgb: string) {
      const split = rgb
        .substring(4, rgb.length - 1)
        .replace(/ /g, '')
        .split(',');

      return {
        r: parseInt(split[0]),
        g: parseInt(split[1]),
        b: parseInt(split[2]),
      };
    }

    const bgRGB = /^#[0-9A-F]{6}$/i.test(bgColor)
      ? hexToRgb(bgColor)
      : rgbToString(bgColor);

    return `0 2px 2px 0 rgba(${bgRGB.r}, ${bgRGB.g}, ${bgRGB.b}, 0.14),
    0 3px 1px -2px rgba(${bgRGB.r}, ${bgRGB.g}, ${bgRGB.b}, 0.2), 0 1px 5px 0 rgba(${bgRGB.r}, ${bgRGB.g}, ${bgRGB.b}, 0.12)`;
  }};

  width: ${({ width }) => width};
  height: ${({ height }) => height};

  outline: none !important;

  display: flex;
  justify-content: center;
  align-items: center;

  z-index: -1;

  &:hover {
    box-shadow: ${({ bgColor }) => {
      function hexToRgb(hex: string) {
        // Expand shorthand form (e.g. "03F") to full form (e.g. "0033FF")
        const shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
        hex = hex.replace(shorthandRegex, function (m, r, g, b) {
          return r + r + g + g + b + b;
        });

        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result
          ? {
              r: parseInt(result[1], 16),
              g: parseInt(result[2], 16),
              b: parseInt(result[3], 16),
            }
          : { r: 0, g: 0, b: 0 };
      }

      function rgbToString(rgb: string) {
        const split = rgb
          .substring(4, rgb.length - 1)
          .replace(/ /g, '')
          .split(',');

        return {
          r: parseInt(split[0]),
          g: parseInt(split[1]),
          b: parseInt(split[2]),
        };
      }

      const bgRGB = /^#[0-9A-F]{6}$/i.test(bgColor)
        ? hexToRgb(bgColor)
        : rgbToString(bgColor);

      return `0 14px 26px -12px rgba(${bgRGB.r}, ${bgRGB.g}, ${bgRGB.b}, 0.5),
      0 4px 23px 0px rgba(0, 0, 0, 0.12), 0 8px 10px -5px rgba(${bgRGB.r}, ${bgRGB.g}, ${bgRGB.b}, 0.4);`;
    }};
  }
`;

const SVGIcon = styled.div<RadialFabChildProps>`
  transition: transform 300ms ease;

  transform: ${({ fineAdjustIconX, fineAdjustIconY, isOpen }) =>
    `translate(${fineAdjustIconX}, ${fineAdjustIconY}) rotate(${
      isOpen ? 0 : 90
    }deg)`};
`;

const ToolTip = styled.span.attrs<{ isShowing: boolean }>(({ isShowing }) => ({
  className: `rounded-md px-3 py-1 absolute w-max bg-gray-800 bg-opacity-80 text-white text-sm pointer-events-none transform transition ${
    isShowing ? '-translate-y-11 opacity-100' : '-translate-y-9 opacity-0'
  }`,
}))<{ isShowing: boolean }>``;

const RadialFabChild: FunctionComponent<RadialFabChildProps> = (
  props: RadialFabChildProps,
) => {
  const { isShowingTooltip, ref } = useDelayedTooltip(0.5);

  return (
    <ButtonContainer {...props} onClick={props.clickEvent} ref={ref}>
      <SVGIcon {...props}>{props.children}</SVGIcon>
      {props.toolTipText !== '' ? (
        <ToolTip isShowing={isShowingTooltip}>{props.toolTipText}</ToolTip>
      ) : null}
    </ButtonContainer>
  );
};

RadialFabChild.defaultProps = {
  width: '3.1em',
  height: '3.1em',

  fineAdjustIconX: '0',
  fineAdjustIconY: '0',

  openMargin: '0',

  toolTipText: '',

  isOpen: false,
};

export default RadialFabChild;
