import clsx from 'clsx';
import { PropsWithChildren } from 'react';

type BaseViewProps = PropsWithChildren<{
  isUnlocked?: boolean;
}>;

const BaseView = ({
  className,
  isUnlocked,
  children,
  ...props
}: BaseViewProps & JSX.IntrinsicElements['div']) => (
  <div
    className={clsx(
      'flex h-full flex-col overflow-hidden bg-white bg-opacity-75 transition-shadow',
      isUnlocked && 'select-none rounded-md shadow-md',
      className,
    )}
    {...props}
  >
    {children}
  </div>
);

type BaseViewHeadingProps = {
  isDraggable?: boolean;
};

const BaseViewHeading = ({
  className,
  children,
  ...props
}: BaseViewHeadingProps & JSX.IntrinsicElements['h2']) => (
  <h2
    className={clsx(
      'w-full px-4 py-2 text-xl font-medium',
      props.isDraggable && 'grab-handle',
      className,
    )}
    {...props}
  >
    {children}
  </h2>
);

const BaseViewBody = ({
  children,
  className,
  ...props
}: JSX.IntrinsicElements['div']) => (
  <div className={`flex-1 overflow-auto px-4 ${className}`} {...props}>
    {children}
  </div>
);

const BaseViewIcons = ({
  className,
  children,
  ...props
}: JSX.IntrinsicElements['div']) => (
  <div className={`mr-3 flex items-center space-x-1 ${className}`} {...props}>
    {children}
  </div>
);

const BaseViewIcon = ({
  className,
  children,
  ...props
}: JSX.IntrinsicElements['div']) => (
  <div className={`flex-center h-8 w-8 ${className}`} {...props}>
    {children}
  </div>
);

const BaseViewIconButton = ({
  className,
  children,
  ...props
}: JSX.IntrinsicElements['button']) => (
  <button className={`icon-btn h-8 w-8 ${className}`} {...props}>
    {children}
  </button>
);

export {
  BaseView as default,
  BaseViewHeading,
  BaseViewBody,
  BaseViewIcons,
  BaseViewIcon,
  BaseViewIconButton,
};
export type { BaseViewProps, BaseViewHeadingProps };
