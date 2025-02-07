import React from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { setReplayOverlay, receiveTelemetry } from '@/store/actions/telemetry';

import BaseView, { BaseViewHeading } from '@/components/views/BaseView';
import AutoFitCanvas from '@/components/Canvas/AutoFitCanvas';

import OpModeStatus from '@/enums/OpModeStatus';
import { ReactComponent as DeleteSVG } from '@/assets/icons/delete.svg';
import { ReactComponent as DownloadSVG } from '@/assets/icons/file_download.svg';
import { ReactComponent as PlaySVG } from '@/assets/icons/play_arrow.svg';


class RecorderView extends React.Component {
  constructor(props) {
    super(props);
    this.canvasRef = React.createRef();
    this.playbackInterval = null;
    this.startReplayTime = null;
    this.startRecordingTime = null;
    this.isRunning = false;
    this.isReplaying = false;

    this.telemetryRecording = [];
    this.telemetryReplay = [];
    this.currOps = [];

    this.state = {
      savedReplays: [],
      selectedReplays: [],
      replayUpdateInterval: 20,
      saveReplays: true,
      replayOnStart: true,
      autoSelect: true,
    };
  }

  componentDidMount() {
    this.loadSavedReplays();
  }

  loadSavedReplays = () => {
    const keys = Object.keys(localStorage).filter((key) =>
      key.startsWith('field_replay_')
    );
    this.setState({ savedReplays: keys }, () => {
      if (this.state.autoSelect) {
        this.handleLoadTelemetryByFilename({ target: { selectedOptions: Array.from(this.state.savedReplays.map(filename => ({ value: filename }))) } });
      }
    });
  };

  handleDownloadSelectedReplays = () => {
    const { selectedReplays } = this.state;

    if (!selectedReplays || selectedReplays.length === 0) {
      return;
    }

    selectedReplays.forEach((filename) => {
      const replayDataString = localStorage.getItem(filename);

      if (!replayDataString) {
        return;
      }

      const replayData = JSON.parse(replayDataString);

      const blob = new Blob([JSON.stringify(replayData, null, 2)], { type: 'application/json' });

      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `${filename}.json`;

      link.click();
    });
  };

  handleSaveToLocalStorage = () => {
    if (!this.state.saveReplays) return;

    const currentDate = new Date();
    const formattedDate = currentDate.toISOString().split('.')[0];
    const storageKey = `field_replay_${formattedDate}`;

    let totalSize = 0;
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      totalSize += new Blob([localStorage.getItem(key)]).size;
    }

    const dataToSave = JSON.stringify(this.telemetryRecording);
    const newDataSize = new Blob([dataToSave]).size;

    const maxStorageSize = 5 * 1024 * 1024;
    if (totalSize + newDataSize > maxStorageSize) {
      alert("Cannot save replay: LocalStorage quota exceeded.");
      return;
    } else {
      localStorage.setItem(storageKey, dataToSave);
    }
    this.loadSavedReplays();
  };

  handleLoadTelemetryByFilename = (event) => {
    const selectedFiles = Array.from(event.target.selectedOptions, (option) => option.value);
    if (selectedFiles.length === 0) return;

    this.setState({
      selectedReplays: selectedFiles,
    });

    this.telemetryReplay = [];

    selectedFiles.forEach((filename) => {
      const savedTelemetry = localStorage.getItem(filename);
      if (savedTelemetry) {
        const parsedTelemetry = JSON.parse(savedTelemetry);
        this.telemetryReplay.push(parsedTelemetry);
      }
    });
  };

  handleDeleteReplay = () => {
    const { selectedReplays } = this.state;

    if (!selectedReplays || selectedReplays.length === 0) return;

    selectedReplays.forEach((filename) => {
      localStorage.removeItem(filename);
    });

    this.telemetryReplay = [];
    this.currOps = [[]];

    this.setState((prevState) => ({
      savedReplays: prevState.savedReplays.filter((file) => !selectedReplays.includes(file)),
      selectedReplays: [],
    }));
  };

  handleDeleteAllReplays = () => {
    const { savedReplays } = this.state;

    if (savedReplays.length === 0) return;

    savedReplays.forEach((filename) => localStorage.removeItem(filename));
    this.telemetryReplay = [];
    this.currOps = [[]];

    this.setState({ savedReplays: [], selectedReplays: [] });
  };

  handleUploadReplay = (event) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const parsedData = JSON.parse(e.target.result);
          if (!Array.isArray(parsedData)) {
            alert(`Invalid file format in ${file.name}. Expected an array of telemetry data.`);
            return;
          }

          const fileName = `field_replay_${file.name.replace('.json', '')}`;
          localStorage.setItem(fileName, JSON.stringify(parsedData));
          this.loadSavedReplays()
        } catch (error) {
          alert(`Error parsing JSON file: ${file.name}`);
        }
      };
      reader.readAsText(file);
    });
    };

  handleStartPlayback = () => {
    if (this.playbackInterval) {
      clearInterval(this.playbackInterval);
      this.playbackInterval = null;
    }

    this.isReplaying = true;
    this.startPlayback();
  };

  startPlayback = () => {
    if (this.telemetryReplay.length === 0) return;
    if (!this.state.saveReplays && !this.isReplaying) return;

    let lastIndex = new Array(this.telemetryReplay.length).fill(0);
    let playbackComplete = false;
    let ops = [[]];

    this.startReplayTime = Date.now();

    this.playbackInterval = setInterval(() => {
      const elapsedTime = Date.now() - this.startReplayTime;
      const timeRangeEnd = elapsedTime + this.state.replayUpdateInterval / 2;

      for (let replayIndex = 0; replayIndex < this.telemetryReplay.length; replayIndex++) {
        let isUpdated = false;
        for (let i = lastIndex[replayIndex]; i < this.telemetryReplay[replayIndex].length; i++) {
          const entry = this.telemetryReplay[replayIndex][i];

          if (entry.timestamp <= timeRangeEnd) {
            if (!isUpdated) {
              ops[replayIndex] = [];
              isUpdated = true;
            }
            ops[replayIndex].push(...entry.ops);
            lastIndex[replayIndex] = i + 1;
          } else {
            break;
          }
        }
      }

      this.currOps = ops.flat();

      if (JSON.stringify(this.currOps).length > 0) {
        this.props.setReplayOverlay(this.currOps);
      }

      if (lastIndex.every((index, idx) => index >= (this.telemetryReplay[idx]?.length || 0))) {
        playbackComplete = true;
      }

      if (playbackComplete) {
        this.clearPlayback();
      }
    }, this.state.replayUpdateInterval);
  };

  clearPlayback() {
    this.isReplaying = false;
    clearInterval(this.playbackInterval);
    this.playbackInterval = null;
  }

  compareOverlays = (prevOverlay, currentOverlay) => {
    return JSON.stringify(currentOverlay.ops) !== JSON.stringify(prevOverlay.ops);
  };

  componentDidUpdate(prevProps) {
    if (this.props.activeOpModeStatus === OpModeStatus.STOPPED && this.isRunning) {
      this.isRunning = false;
      this.handleSaveToLocalStorage();
    }

    if (this.props.telemetry === prevProps.telemetry) {
      return;
    }

    const overlay = this.props.telemetry.reduce(
      (acc, { fieldOverlay }) => ({
        ops: [...acc.ops, ...(fieldOverlay?.ops || [])],
      }),
      { ops: [] }
    );

    const prevOverlay = prevProps.telemetry.reduce(
      (acc, { fieldOverlay }) => ({
        ops: [...acc.ops, ...(fieldOverlay?.ops || [])],
      }),
      { ops: [] }
    );

    if (this.compareOverlays(prevOverlay, overlay)) {
      if (this.props.activeOpModeStatus === OpModeStatus.INIT && !this.isRunning) {
        this.isRunning = true;
        this.startRecordingTime = Date.now();
        this.telemetryRecording = [];
        this.currOps = [];

        if (this.state.replayOnStart) {
          this.handleStartPlayback();
        }
      }
    }

    if (this.isRunning) {
      const overlay = this.props.telemetry.reduce(
        (acc, { fieldOverlay }) => ({
          ops: [...acc.ops, ...(fieldOverlay?.ops || [])],
        }),
        { ops: [] }
      );

      if (overlay.ops.length > 0) {
        const relativeTimestamp = Date.now() - this.startRecordingTime;
        this.telemetryRecording.push({
          timestamp: relativeTimestamp,
          ops: overlay.ops,
        });
      }
    }

    if (this.isReplaying) {
      const replayOps = this.props.telemetry.reduce(
        (acc, { replayOverlay }) => ({
          ops: [...(replayOverlay?.ops || [])],
        }),
        { ops: [] }
      );
      const currOpsStr = JSON.stringify(this.currOps);
      if (replayOps.ops.length === 0 && currOpsStr !== JSON.stringify(replayOps.ops) && currOpsStr.length > 0) {
        this.props.setReplayOverlay(this.currOps);
      }
    }
  }

  handleReplayUpdateIntervalChange = (event) => {
    const value = parseInt(event.target.value, 10);
    this.setState({ replayUpdateInterval: value });
  };

  handleReplayOnStartChange = (event) => {
    const checked = event.target.checked;
    this.setState({ replayOnStart: checked });
  };

  handleAutoSelectChange = (event) => {
    const checked = event.target.checked;
    this.setState({ autoSelect: checked });
  };

  render() {
      return (
        <BaseView isUnlocked={this.props.isUnlocked}>
          <BaseViewHeading isDraggable={this.props.isDraggable}>
            Field Recorder
          </BaseViewHeading>

          <div className="canvas-container" style={{ marginBottom: '.5em' }}>
            <AutoFitCanvas ref={this.canvasRef} containerHeight="calc(100% - 3em)" />
          </div>

          <div className="controls-container" style={{ textAlign: 'center' }}>
            <div>
              <label htmlFor="replaySelector" style={{ fontWeight: 'bold', marginRight: '0.5em' }}>
                Select Replay:
              </label>

              <div style={{ position: 'relative' }}>
                <select
                  id="replaySelector"
                  multiple
                  value={this.state.selectedReplays}
                  onChange={this.handleLoadTelemetryByFilename}
                  style={{
                    padding: '0.5em',
                    fontSize: '14px',
                    borderRadius: '4px',
                    border: '1px solid #ccc',
                    cursor: 'pointer',
                    marginRight: '0.5em',
                    height: `${Math.min(this.state.savedReplays.length, 5) * 20 + 4}px`,
                    width: '200px',
                  }}
                >
                  {this.state.savedReplays.map((filename) => (
                    <option key={filename} value={filename}>
                      {filename.replace('field_replay_', '')}
                    </option>
                  ))}
                </select>
              </div>
              <input
                type="file"
                accept=".json"
                multiple
                ref={(input) => (this.fileInput = input)}
                style={{ display: 'none' }}
                onChange={this.handleUploadReplay}
              />

              <button
                onClick={() => this.fileInput.click()}
                className={`
                  border border-green-200 bg-green-100 transition-colors
                  dark:border-transparent dark:bg-green-500 dark:text-green-50 dark:highlight-white/30
                  dark:hover:border-green-300/80 dark:focus:bg-green-600
                `}
                style={{
                  padding: '0.5em 1em',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  transition: 'background-color 0.3s ease',
                  marginLeft: '0.5em',
                }}
              >
                <DownloadSVG className="h-6 w-6" style={{ transform: 'rotate(180deg)' }} />
              </button>

              <button
                onClick={this.handleDownloadSelectedReplays}
                disabled={!(this.state.selectedReplays.length > 0)}
                className={`
                  border border-blue-300 bg-blue-200 transition-colors
                  dark:border-blue-400 dark:bg-blue-600 dark:text-blue-50 dark:highlight-white/30
                  dark:hover:border-blue-400/80 dark:focus:bg-blue-700
                  ${this.state.selectedReplays.length > 0 ? '' : 'opacity-50 cursor-not-allowed'}
                `}
                style={{
                  padding: '0.5em 1em',
                  borderRadius: '4px',
                  transition: 'background-color 0.3s ease',
                  marginLeft: '0.5em',
                }}
              >
                <DownloadSVG className="h-6 w-6" />
              </button>

              <button
                onClick={this.handleStartPlayback}
                className={`
                  border border-green-200 bg-green-100 transition-colors
                  dark:border-transparent dark:bg-green-500 dark:text-green-50 dark:highlight-white/30
                  dark:hover:border-green-300/80 dark:focus:bg-green-600
                `}
                style={{
                  padding: '0.5em 1em',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  transition: 'background-color 0.3s ease',
                  marginLeft: '0.5em',
                }}
              >
                <PlaySVG className="h-6 w-6" />
              </button>

              <button
                onClick={() => this.handleDeleteReplay()}
                disabled={!(this.state.selectedReplays.length > 0)}
                className={`
                  border border-red-200 bg-red-100 transition-colors
                  dark:border-transparent dark:bg-red-500 dark:text-red-50 dark:highlight-white/30
                  dark:hover:border-red-300/80 dark:focus:bg-red-600
                  ${this.state.selectedReplays.length > 0 ? '' : 'opacity-50 cursor-not-allowed'}
                `}
                style={{
                  padding: '0.5em 1em',
                  borderRadius: '4px',
                  transition: 'background-color 0.3s ease',
                  marginLeft: '0.5em',
                }}
              >
                <DeleteSVG className="h-6 w-6 fill-black" />
              </button>

              <button
                onClick={this.handleDeleteAllReplays}
                disabled={this.state.savedReplays.length === 0}
                className={`
                  border border-red-200 bg-red-100 transition-colors
                  dark:border-transparent dark:bg-red-500 dark:text-red-50 dark:highlight-white/30
                  dark:hover:border-red-300/80 dark:focus:bg-red-600
                  ${this.state.savedReplays.length > 0 ? '' : 'opacity-50 cursor-not-allowed'}
                `}
                style={{
                  padding: '0.5em 1em',
                  borderRadius: '4px',
                  transition: 'background-color 0.3s ease',
                  marginLeft: '0.5em',
                  display: 'inline-flex',
                  alignItems: 'center',
                }}
              >
                <DeleteSVG className="h-6 w-6 fill-black" />
                <span style={{ marginLeft: '0.3em' }}>All</span>
              </button>
            </div>

            <div style={{ marginTop: '.5em' }}>
              <label htmlFor="replayUpdateInterval" style={{ marginRight: '0.5em' }}>
                Replay Update Interval (ms):
              </label>
              <input
                type="number"
                id="replayUpdateInterval"
                value={this.state.replayUpdateInterval}
                onChange={this.handleReplayUpdateIntervalChange}
                style={{
                  padding: '0.5em',
                  fontSize: '14px',
                  borderRadius: '4px',
                  border: '1px solid #ccc',
                  marginRight: '0.5em',
                }}
              />
            </div>

            <div>
              <label htmlFor="saveReplays" style={{ marginRight: '0.5em' }}>
                Save Replays:
              </label>
              <input
                type="checkbox"
                id="saveReplays"
                checked={this.state.saveReplays}
                onChange={(event) => this.setState({ saveReplays: event.target.checked })}
                style={{
                  marginRight: '0.5em',
                }}
              />
            </div>
            <div>
              <label htmlFor="replayOnStart" style={{ marginRight: '0.5em' }}>
                Start Replay with OpMode:
              </label>
              <input
                type="checkbox"
                id="replayOnStart"
                checked={this.state.replayOnStart}
                onChange={this.handleReplayOnStartChange}
                style={{
                  marginRight: '0.5em',
                }}
              />
            </div>
            <div>
              <label htmlFor="autoSelect" style={{ marginRight: '0.5em' }}>
                Auto Select Replays:
              </label>
              <input
                type="checkbox"
                id="autoSelect"
                checked={this.state.autoSelect}
                onChange={this.handleAutoSelectChange}
                style={{
                  marginRight: '0.5em',
                }}
              />
            </div>
          </div>
        </BaseView>
      );
    }
}

RecorderView.propTypes = {
  telemetry: PropTypes.array.isRequired,
  isUnlocked: PropTypes.bool,
  activeOpModeStatus: PropTypes.string,
  receiveTelemetry: PropTypes.func.isRequired,
  setReplayOverlay: PropTypes.func.isRequired,
};

const mapStateToProps = (state) => ({
  telemetry: state.telemetry,
  activeOpModeStatus: state.status.activeOpModeStatus,
});

const mapDispatchToProps = {
  setReplayOverlay,
  receiveTelemetry,
};

export default connect(mapStateToProps, mapDispatchToProps)(RecorderView);
