import { useLayoutEffect, useRef, useState } from 'react';
import { useSelector } from 'react-redux';

import BaseView, {
  BaseViewHeading,
  BaseViewBody,
  BaseViewProps,
  BaseViewHeadingProps,
} from './BaseView';
import ReplayBadge from '@/components/views/ReplayBadge';
import { RootState } from '@/store/reducers';

type TelemetryViewProps = BaseViewProps & BaseViewHeadingProps;

/** `fromReplay` travels with the values: set by any replayed packet folded in,
 *  so recorded strings never take the HTML branch whatever the mode is. */
type Fold = {
  fromReplay: boolean;
  data: { [key: string]: string };
  log: string[];
};

const EMPTY: Fold = { fromReplay: false, data: {}, log: [] };

const TelemetryView = ({
  isDraggable = false,
  isUnlocked = false,
}: TelemetryViewProps) => {
  const [fold, setFold] = useState<Fold>(EMPTY);

  const packets = useSelector((state: RootState) => state.telemetry);
  const isReplay = useSelector(
    (state: RootState) => state.playback.mode === 'playback',
  );
  // Both tokens reset this fold. Logging and the Graph keep history, so they
  // honour only foldToken: a replayed clear must not wipe what live runs keep.
  const foldToken = useSelector((state: RootState) => state.playback.foldToken);
  const clearToken = useSelector(
    (state: RootState) => state.playback.clearToken,
  );

  // The tokens, not packets.length: a seek sends no empty batch.
  const seenToken = useRef(`${foldToken}:${clearToken}`);
  if (seenToken.current !== `${foldToken}:${clearToken}`) {
    seenToken.current = `${foldToken}:${clearToken}`;
    if (fold !== EMPTY) setFold(EMPTY);
  }

  // Layout, not passive: the token resets during render, so a passive effect
  // paints the empty state in between, one blank frame per seek.
  useLayoutEffect(() => {
    if (packets.length === 0) {
      setFold(EMPTY);
      return;
    }

    setFold((prev) => {
      // A seek ends on a seed holding everything on screen at that moment.
      const seedAt = packets.map((p) => p.seed).lastIndexOf(true);
      const base =
        seedAt < 0
          ? prev
          : { ...prev, data: packets[seedAt].data, log: packets[seedAt].log };
      const rest = packets.slice(seedAt + 1);

      const log = rest.reduce(
        (acc, { log: newLog }) => (newLog.length === 0 ? acc : newLog),
        base.log,
      );

      const data = { ...base.data };
      for (const p of rest) Object.assign(data, p.data);

      const replayed = packets.some((p) => p.recordedMs !== undefined);
      return { fromReplay: base.fromReplay || replayed, data, log };
    });
  }, [packets]);

  // Recordings are shareable files, so replayed text must never reach
  // dangerouslySetInnerHTML.
  const asHtml = !fold.fromReplay;

  const telemetryLines = Object.keys(fold.data).map((key) =>
    asHtml ? (
      <span
        key={key}
        dangerouslySetInnerHTML={{ __html: `${key}: ${fold.data[key]}<br />` }}
      />
    ) : (
      <span key={key}>
        {key}: {fold.data[key]}
        <br />
      </span>
    ),
  );

  const telemetryLog = fold.log.map((line, i) =>
    asHtml ? (
      <span key={i} dangerouslySetInnerHTML={{ __html: `${line}<br />` }} />
    ) : (
      <span key={i}>
        {line}
        <br />
      </span>
    ),
  );

  return (
    <BaseView isUnlocked={isUnlocked}>
      <BaseViewHeading isDraggable={isDraggable}>
        Telemetry
        {isReplay && <ReplayBadge source="replacing" />}
      </BaseViewHeading>
      <BaseViewBody>
        <p>{telemetryLines}</p>
        <p>{telemetryLog}</p>
      </BaseViewBody>
    </BaseView>
  );
};

export default TelemetryView;
