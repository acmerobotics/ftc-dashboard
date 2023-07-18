import React, { createRef, MouseEventHandler, useState } from 'react';
import { SegmentData } from '@/store/types';

const mod = (val: number, base: number) => (val + base) % base;
const deg2rad = (deg: number) => mod((deg / 180) * Math.PI, 2 * Math.PI);
const rad2deg = (rad: number) => mod((rad / Math.PI) * 180, 360);

export default function AngleInput({
  value,
  name,
  onChange,
}: {
  value: number;
  name: string;
  onChange: (_: Partial<SegmentData>) => void;
}) {
  const [isPickingAngle, setIsPickingAngle] = useState(false);
  const angleSelector = createRef<HTMLDivElement>();
  const pickAngle: MouseEventHandler<HTMLInputElement> = (e) => {
    e.preventDefault();
    e.persist();
    setIsPickingAngle(true);

    if (!angleSelector.current) return;
    const a = angleSelector.current;

    a.style.left = e.pageX - 32 + 'px';
    a.style.top = e.pageY - 32 + 'px';

    window.addEventListener('mousemove', ({ x, y }) => {
      const angle = rad2deg(Math.atan2(y - e.pageY, x - e.pageX));
      a.parentElement?.style.setProperty('--angle', angle.toFixed());
    });
  };

  return (
    <>
      <input
        type="number"
        name={name}
        step={15}
        value={rad2deg(value).toFixed()}
        onChange={(e) => onChange({ [name]: deg2rad(+e.target.value) })}
        className="h-8 w-16 p-2 dark:border-slate-500/80 dark:bg-slate-700 dark:text-slate-200"
        title={`${name} in degrees`}
        onContextMenu={pickAngle}
      />
      <div
        className={`${
          isPickingAngle ? 'absolute' : 'hidden'
        } top-0 left-0 h-screen w-screen`}
        onClick={(e) => {
          onChange({
            [name]: deg2rad(
              +getComputedStyle(e.target as HTMLElement).getPropertyValue(
                '--angle',
              ) + 180,
            ),
          });
          setIsPickingAngle(false);
        }}
        onContextMenu={(e) => {
          setIsPickingAngle(false);
          e.preventDefault();
        }}
      >
        <div
          ref={angleSelector}
          className="direction-selector absolute h-16 w-16 rounded-full"
        ></div>
      </div>
    </>
  );
}
