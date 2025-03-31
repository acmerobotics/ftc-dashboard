import React from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { receiveTelemetry } from '@/store/actions/telemetry';
import { setReplayOverlay } from '@/store/actions/replay';

import BaseView, { BaseViewHeading } from '@/components/views/BaseView';
import AutoFitCanvas from '@/components/Canvas/AutoFitCanvas';

import OpModeStatus from '@/enums/OpModeStatus';
import { ReactComponent as DeleteSVG } from '@/assets/icons/delete.svg';
import { ReactComponent as DownloadSVG } from '@/assets/icons/file_download.svg';

class RecorderView extends React.Component {
  constructor(props) {
    super(props);
    this.canvasRef = React.createRef();
    this.playbackInterval = null;
    this.startReplayTime = null;
    this.startRecordingTime = null;
    this.isRunning = false;
    this.isReplaying = false;

    this.telemetryRecordingMaxSize = 10000; // 10000 is = 2:30 minutes at 15ms looptimes, should be more than necessary
    this.perReplaySizeLimit = 104857 * 2; // 0.2MB, so can store up to 25 replays

    this.telemetryRecording = new Array(this.telemetryRecordingMaxSize);
    this.telemetryRecordingWriteIndex = 0;

    this.preCurrOps = [];
    this.currOps = [];

    this.state = {
      savedReplays: [],
      selectedReplays: [],
      telemetryReplay: [],
      replayUpdateInterval: 20,
      replayOnStart: false,
      autoSelect: false,
      errorMessage: '',
      replayOpacity: 0.5,
    };
  }

  componentDidMount() {
    this.loadSavedReplays();
  }

  loadSavedReplays = () => {
    const keys = Object.keys(window.localStorage).filter((key) =>
      key.startsWith('field_replay_')
    );
    this.setState({ savedReplays: keys }, () => {
      if (this.state.autoSelect) {
        this.handleLoadTelemetryByFilename({ target: { selectedOptions: Array.from(this.state.savedReplays.map(filename => ({ value: filename }))) } });
      }
    });
  };

  handleOpacityChange = (event) => {
      const opacity = event.target.value;
      this.setState({ replayOpacity: opacity });
    };

  handleDownloadSelectedReplays = () => {
    const { selectedReplays } = this.state;

    selectedReplays.forEach((filename) => {
      const replayDataString = window.localStorage.getItem(filename);

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
    const currentDate = new Date();
    const formattedDate = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(currentDate.getDate()).padStart(2, '0')}` +
        `_T${String(currentDate.getHours()).padStart(2, '0')}_${String(currentDate.getMinutes()).padStart(2, '0')}_${String(currentDate.getSeconds()).padStart(2, '0')}`;

    const storageKey = `field_replay_${formattedDate}`;

    let totalSize = 0;
    for (let i = 0; i < window.localStorage.length; i++) {
      const key = window.localStorage.key(i);
      totalSize += new Blob([window.localStorage.getItem(key)]).size;
    }

    let dataToSave = JSON.stringify(this.telemetryRecording);
    const newDataSize = new Blob([dataToSave]).size;

    const maxStorageSize = 5 * 1024 * 1024;
    if (totalSize + newDataSize > maxStorageSize) {
      this.setState({ errorMessage: 'Cannot save replay: LocalStorage quota exceeded.' });

      setTimeout(() => {
        this.setState({ errorMessage: '' });
      }, 5000);
      return;
    }
    if (newDataSize > this.perReplaySizeLimit) {
      this.setState({ errorMessage: 'Trimming replay: Per-Replay size limit exceeded.' });

      setTimeout(() => {
        this.setState({ errorMessage: '' });
      }, 5000);


      // Calculate the current size ratio to the per file max size
      const ratioToMaxSize = this.perReplaySizeLimit / newDataSize;

      // Determine how many elements we need to keep based on the ratio
      const elementsToKeep = Math.floor(this.telemetryRecording.length * ratioToMaxSize);

      // Slice the array from 0 to bound
      const trimmed = this.telemetryRecording.slice(0, elementsToKeep);
      dataToSave = JSON.stringify(trimmed);
    }

    window.localStorage.setItem(storageKey, dataToSave);

    this.loadSavedReplays();
  };

  handleLoadTelemetryByFilename = (event) => {
    const selectedFiles = [...event.target.selectedOptions].map((option) => option.value);
    if (!selectedFiles.length) return;

    let fileReplayData = [];
    selectedFiles.forEach((filename) => {
      const savedTelemetry = window.localStorage.getItem(filename);
      if (savedTelemetry) {
        const parsedTelemetry = JSON.parse(savedTelemetry);
        fileReplayData.push(parsedTelemetry);
      }
    });

    this.setState({
      selectedReplays: selectedFiles,
      telemetryReplay: fileReplayData,
    });
  };

  handleDeleteReplay = () => {
    const { selectedReplays } = this.state;

    if (!selectedReplays.length) return;

    selectedReplays.forEach((filename) => {
      window.localStorage.removeItem(filename);
    });

    this.setState((prevState) => ({
      savedReplays: prevState.savedReplays.filter((file) => !selectedReplays.includes(file)),
      selectedReplays: [],
      telemetryReplay: [],
      }));

    this.currOps = [[]];
  };

  handleDeleteAllReplays = () => {
    const { savedReplays } = this.state;

    if (!savedReplays.length) return;

    savedReplays.forEach((filename) => window.localStorage.removeItem(filename));
    this.currOps = [[]];

    this.setState({ telemetryReplay: [], savedReplays: [], selectedReplays: [] });
  };

  handleUploadReplay = (event) => {
    const files = event.target.files;

    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const parsedData = JSON.parse(e.target.result);
          if (!Array.isArray(parsedData)) {
            alert(`Invalid file format in ${file.name}. Expected an array of telemetry data.`);
            return;
          }

          const fileName = file.name.replace('.json', '');
          window.localStorage.setItem(fileName, JSON.stringify(parsedData));
          this.loadSavedReplays()
        } catch (error) {
          alert(`Error parsing JSON file: ${file.name}`);
        }
      };
      reader.readAsText(file);
    });
    event.target.value = '';
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
    if (!this.state.telemetryReplay.length) return;

    let lastIndex = new Array(this.state.telemetryReplay.length).fill(0);
    let playbackComplete = false;
    let ops = [[]];

    this.startReplayTime = Date.now();

    this.playbackInterval = setInterval(() => {
      const elapsedTime = Date.now() - this.startReplayTime;
      const timeRangeEnd = elapsedTime + this.state.replayUpdateInterval / 2;

      for (let replayIndex = 0; replayIndex < this.state.telemetryReplay.length; replayIndex++) {
        let isUpdated = false;
        for (let i = lastIndex[replayIndex]; i < this.state.telemetryReplay[replayIndex].length; i++) {
          const entry = this.state.telemetryReplay[replayIndex][i];

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
      const newOps = ops.flat();
      if (JSON.stringify(newOps) !== JSON.stringify(this.preCurrOps)) {
        this.preCurrOps = newOps;
        this.currOps = newOps.map(op => ({ ...op }));
        for (let index = 0; index < this.currOps.length; index++) {
          let op = this.currOps[index];
           if (op.alpha !== undefined) {
             op.alpha = op.alpha * this.state.replayOpacity;
           }
           else if (index == 0) {
             this.currOps.unshift({ alpha: this.state.replayOpacity, type: 'alpha' });
           }
         }
      }

      if (JSON.stringify(this.currOps).length > 0) {
        this.props.setReplayOverlay(this.currOps);
      }

      if (lastIndex.every((index, idx) => index >= (this.state.telemetryReplay[idx]?.length || 0))) {
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
    return JSON.stringify(currentOverlay.ops) != JSON.stringify(prevOverlay.ops);
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

    if (this.props.activeOpModeStatus === OpModeStatus.INIT && !this.isRunning) {
      if (this.compareOverlays(prevOverlay, overlay)) {
        this.isRunning = true;
        this.telemetryRecordingWriteIndex = 0;
        this.props.setReplayOverlay([]);
        this.startRecordingTime = Date.now();
        this.telemetryRecording = [];
        this.currOps = [];

        if (this.state.replayOnStart) {
          this.handleStartPlayback();
        }
      }
    }

    if (this.isRunning) {
      if (overlay.ops.length > 0) {
        const relativeTimestamp = Date.now() - this.startRecordingTime;
        const newData = {
          timestamp: relativeTimestamp,
          ops: overlay.ops,
        };

        if (this.telemetryRecordingWriteIndex < this.telemetryRecordingMaxSize) {
          this.telemetryRecording[this.telemetryRecordingWriteIndex] = newData;
          this.telemetryRecordingWriteIndex++;
        }
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
      if (!replayOps.ops.length && currOpsStr != JSON.stringify(replayOps.ops) && currOpsStr.length > 0) {
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
          Recorder
          {this.state.errorMessage && (
            <div style={{
              color: '#d9534f',
              padding: '5px',
              fontSize: '14px',
              borderRadius: '5px',
              textAlign: 'center',
              fontWeight: 'bold',
              marginBottom: '1em'
            }}>
              {this.state.errorMessage}
            </div>
          )}
        </BaseViewHeading>

        <div className="controls-container" style={{ textAlign: 'center' }}>
          <button
            onClick={this.handleStartPlayback}
            className="btn btn-play"
            style={{
              padding: '0.5em 1em',
              backgroundColor: '#4CAF50',
              color: '#fff',
              fontSize: '14px',
              fontWeight: 'bold',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              transition: 'background-color 0.3s ease',
            }}
            onMouseOver={(e) => (e.target.style.backgroundColor = '#45a049')}
            onMouseOut={(e) => (e.target.style.backgroundColor = '#4CAF50')}
          >
            <i className="fas fa-play-circle" style={{ marginRight: '0px' }}></i>
            Start Playback
          </button>

          <div style={{ marginTop: '1em' }}>
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
                  color: 'black',
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
                style={{
                  padding: '0.5em 1em',
                  backgroundColor: this.state.selectedReplays.length > 0 ? '#5bc0de' : '#ccc',
                  color: '#fff',
                  fontSize: '14px',
                  fontWeight: 'bold',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: this.state.selectedReplays.length > 0 ? 'pointer' : 'not-allowed',
                  transition: 'background-color 0.3s ease',
                  marginLeft: '0.5em',
                }}
              >
                <DownloadSVG className="h-6 w-6" />
            </button>

            <button
              onClick={() => this.handleDeleteReplay()}
              disabled={!(this.state.selectedReplays.length > 0)}
              style={{
                padding: '0.5em 1em',
                backgroundColor: this.state.selectedReplays.length > 0 ? '#d9534f' : '#ccc',
                color: '#fff',
                fontSize: '14px',
                fontWeight: 'bold',
                border: 'none',
                borderRadius: '4px',
                cursor: this.state.selectedReplays.length > 0 ? 'pointer' : 'not-allowed',
                transition: 'background-color 0.3s ease',
                marginLeft: '0.5em',
              }}
            >
              <DeleteSVG className="h-6 w-6" />
            </button>

            <button
              onClick={this.handleDeleteAllReplays}
              disabled={!this.state.savedReplays.length}
              style={{
                padding: '0.5em 1em',
                backgroundColor: this.state.savedReplays.length > 0 ? '#d9534f' : '#ccc',
                color: '#fff',
                fontSize: '14px',
                fontWeight: 'bold',
                border: 'none',
                borderRadius: '4px',
                cursor: this.state.savedReplays.length > 0 ? 'pointer' : 'not-allowed',
                transition: 'background-color 0.3s ease',
                marginLeft: '0.5em',
                display: 'inline-flex',
                alignItems: 'center',
              }}
            >
              <DeleteSVG className="h-6 w-6"/>
              <span style={{ marginLeft: '0.3em' }}>All</span>
            </button>
          </div>

          <div style={{ marginTop: '1.0em' }}>
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
          <div style={{ marginTop: '0.5em' }}>
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
          <div style={{ marginTop: '0.5em' }}>
            <label htmlFor="replayOpacity">
              Replay Opacity:
            </label>
            <span>{this.state.replayOpacity}</span> {/* Display current value on the same line as the title */}
          </div>

          <div>
            <input
              type="range"
              id="replayOpacity"
              min="0"
              max="1"
              step="0.01"
              value={this.state.replayOpacity}
              onChange={this.handleOpacityChange}
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
