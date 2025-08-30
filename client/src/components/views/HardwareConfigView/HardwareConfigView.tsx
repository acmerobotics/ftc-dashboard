import React, { Component, ChangeEvent, createRef, RefObject } from 'react';
import { connect, ConnectedProps } from 'react-redux';

import { RootState } from '@/store/reducers';
import OpModeStatus from '@/enums/OpModeStatus';
import BaseView, {
  BaseViewHeading,
  BaseViewBody,
  BaseViewProps,
  BaseViewHeadingProps,
} from '@/components/views/BaseView';

import {
  setHardwareConfig,
  writeHardwareConfig,
  deleteHardwareConfig,
} from '@/store/actions/hardwareconfig';
import { STOP_OP_MODE_TAG } from '@/store/types';
import { Robot } from './Hardware';

type HardwareConfigViewState = {
  selectedHardwareConfig: string;
  editedConfigText: string;
  viewMode: 'text' | 'gui';
  robotInstance: Robot;
  saveFilename: string;
};

const mapStateToProps = ({ status, hardwareConfig }: RootState) => ({
  ...status,
  ...hardwareConfig,
});

const mapDispatchToProps = {
  setHardwareConfig,
  writeHardwareConfig,
  deleteHardwareConfig,
};

const connector = connect(mapStateToProps, mapDispatchToProps);

type HardwareConfigViewProps = ConnectedProps<typeof connector> &
  BaseViewProps &
  BaseViewHeadingProps;

const ActionButton = ({
  children,
  className,
  ...props
}: JSX.IntrinsicElements['button']) => (
  <button
    className={`
      rounded-md border py-1 px-3 text-sm shadow-md
      disabled:cursor-not-allowed disabled:border-gray-300 disabled:bg-gray-300
      disabled:text-gray-500 disabled:shadow-none
      dark:disabled:border-slate-600 dark:disabled:bg-slate-600 dark:disabled:text-slate-400
      ${className}
    `}
    {...props}
  >
    {children}
  </button>
);

class HardwareConfigView extends Component<
  HardwareConfigViewProps,
  HardwareConfigViewState
> {
  textareaRef: RefObject<HTMLTextAreaElement>;

  constructor(props: HardwareConfigViewProps) {
    super(props);

    this.state = {
      selectedHardwareConfig: '',
      editedConfigText: '',
      viewMode: 'text',
      robotInstance: new Robot(),
      saveFilename: '',
    };

    this.textareaRef = createRef<HTMLTextAreaElement>();
    this.onChange = this.onChange.bind(this);
    this.toggleViewMode = this.toggleViewMode.bind(this);
    this.handleRobotGuiChange = this.handleRobotGuiChange.bind(this);
    this.parseEditedXmlToRobot = this.parseEditedXmlToRobot.bind(this);
    this.adjustTextareaHeight = this.adjustTextareaHeight.bind(this);
  }

  adjustTextareaHeight() {
    const textarea = this.textareaRef.current;
    if (!textarea) return;

    const newHeight = textarea.scrollHeight;
    if (textarea.offsetHeight !== newHeight) {
      textarea.style.height = 'auto';
      textarea.style.height = `${newHeight}px`;
    }
  }

  componentDidUpdate(prevProps: Readonly<HardwareConfigViewProps>) {
    const { currentHardwareConfig, hardwareConfigFiles, hardwareConfigList } =
      this.props;
    const { selectedHardwareConfig } = this.state;

    this.adjustTextareaHeight();

    if (prevProps.currentHardwareConfig !== currentHardwareConfig) {
      const idx = hardwareConfigList.indexOf(currentHardwareConfig);
      const newText = idx !== -1 ? hardwareConfigFiles[idx] : '';
      this.parseEditedXmlToRobot(newText);
      this.setState({
        selectedHardwareConfig: currentHardwareConfig,
        editedConfigText: newText,
        saveFilename: currentHardwareConfig,
      });
      return;
    }

    if (
      prevProps.hardwareConfigFiles !== hardwareConfigFiles &&
      selectedHardwareConfig
    ) {
      const idx = hardwareConfigList.indexOf(selectedHardwareConfig);
      if (idx !== -1) {
        const newText = hardwareConfigFiles[idx];
        this.parseEditedXmlToRobot(newText);
        this.setState({ editedConfigText: newText });
      }
    }
  }

  parseEditedXmlToRobot(xmlText?: string): boolean {
    const text = xmlText ?? this.state.editedConfigText;
    let parseSuccess = true;

    try {
      this.state.robotInstance.fromXml(text);
      this.setState((prevState) => ({
        robotInstance: prevState.robotInstance,
        viewMode: prevState.viewMode === 'gui' ? 'gui' : 'text',
      }));
    } catch (err) {
      parseSuccess = false;
      this.setState({ viewMode: 'text' });
    }

    return parseSuccess;
  }

  hasUnsavedChanges() {
    const {
      selectedHardwareConfig,
      editedConfigText,
      viewMode,
      robotInstance,
    } = this.state;
    const { hardwareConfigList, hardwareConfigFiles } = this.props;

    if (!selectedHardwareConfig) return false;

    const idx = hardwareConfigList.indexOf(selectedHardwareConfig);
    if (idx === -1) return false;

    const savedText = hardwareConfigFiles[idx] ?? '';

    const currentText =
      viewMode === 'gui' ? robotInstance.toString() : editedConfigText;
    return currentText !== savedText;
  }

  onChange(evt: ChangeEvent<HTMLSelectElement>) {
    const selected = evt.target.value;
    const index = this.props.hardwareConfigList.indexOf(selected);
    const text = index !== -1 ? this.props.hardwareConfigFiles[index] : '';

    const parseSuccess = this.parseEditedXmlToRobot(text);

    this.setState({
      selectedHardwareConfig: selected,
      editedConfigText: text,
      saveFilename: selected,
      viewMode: parseSuccess ? this.state.viewMode : 'text',
    });
  }

  toggleViewMode() {
    if (this.state.viewMode === 'text') {
      if (this.parseEditedXmlToRobot()) {
        this.setState({ viewMode: 'gui' });
      }
    } else {
      const newXmlText = this.state.robotInstance.toString();
      this.setState({ viewMode: 'text', editedConfigText: newXmlText });
    }
  }

  handleRobotGuiChange() {
    this.setState({});
  }

  renderSetButton() {
    return (
      <ActionButton
        className={`
          border-blue-300 bg-blue-200 transition-colors
          dark:border-transparent dark:bg-blue-600 dark:text-blue-50 dark:highlight-white/30
          dark:hover:border-blue-400/80 dark:focus:bg-blue-700
        `}
        onClick={() =>
          this.props.setHardwareConfig(this.state.selectedHardwareConfig)
        }
        disabled={
          !this.state.selectedHardwareConfig ||
          this.state.selectedHardwareConfig === '<No Config Set>'
        }
      >
        Set
      </ActionButton>
    );
  }

  renderResetButton() {
    const { selectedHardwareConfig } = this.state;
    const { hardwareConfigList, hardwareConfigFiles } = this.props;

    const idx = hardwareConfigList.indexOf(selectedHardwareConfig);
    const originalText = idx !== -1 ? hardwareConfigFiles[idx] : '';

    return (
      <ActionButton
        className="ml-2 border-yellow-400 bg-yellow-300 transition-colors dark:border-transparent dark:bg-yellow-600 dark:text-white dark:hover:border-yellow-500/80 dark:focus:bg-yellow-700"
        onClick={() => {
          if (
            !selectedHardwareConfig ||
            selectedHardwareConfig === '<No Config Set>'
          ) {
            return;
          }
          this.parseEditedXmlToRobot(originalText);
          this.setState(
            {
              editedConfigText: originalText,
              saveFilename: selectedHardwareConfig,
            },
            () => this.adjustTextareaHeight(),
          );
        }}
        disabled={
          !selectedHardwareConfig ||
          selectedHardwareConfig === '<No Config Set>'
        }
      >
        Reset
      </ActionButton>
    );
  }

  renderSaveButton() {
    const { viewMode, editedConfigText, robotInstance, saveFilename } =
      this.state;
    const { hardwareConfigList, isReadOnlyList } = this.props;

    const trimmedSaveFilename = saveFilename.trim();
    const idx = hardwareConfigList.indexOf(trimmedSaveFilename);
    const isReadOnly = idx !== -1 && isReadOnlyList[idx];

    const isInvalid =
      !trimmedSaveFilename ||
      trimmedSaveFilename === '<No Config Set>' ||
      isReadOnly;

    const canSave = !isInvalid;

    let xmlContentToSave: string;
    if (viewMode === 'gui') {
      xmlContentToSave = robotInstance.toString();
    } else {
      xmlContentToSave = editedConfigText;
    }

    return (
      <ActionButton
        className={`
          ${
            canSave
              ? 'border-green-400 bg-green-300 dark:border-transparent dark:bg-green-600 dark:text-white dark:hover:border-green-400/80 dark:focus:bg-green-700'
              : 'border-red-400 bg-red-300 dark:border-transparent dark:bg-red-600 dark:text-white dark:hover:border-red-500/80 dark:focus:bg-red-700'
          }
        `}
        onClick={() => {
          if (!canSave) {
            if (
              !trimmedSaveFilename ||
              trimmedSaveFilename === '<No Config Set>'
            ) {
              window.alert('Please enter a new filename to save changes.');
            } else if (isReadOnly) {
              window.alert(
                'This filename is read-only. Please enter a new filename to save.',
              );
            }
            return;
          }
          this.props.writeHardwareConfig(trimmedSaveFilename, xmlContentToSave);
          this.setState({
            selectedHardwareConfig: trimmedSaveFilename,
            saveFilename: trimmedSaveFilename,
          });
        }}
      >
        Save
      </ActionButton>
    );
  }

  renderDeleteButton() {
    const { selectedHardwareConfig } = this.state;
    const { hardwareConfigList, isReadOnlyList } = this.props;

    const idx = hardwareConfigList.indexOf(selectedHardwareConfig);
    const isReadOnly = idx !== -1 && isReadOnlyList[idx];

    return (
      <ActionButton
        className="ml-2 border-red-400 bg-red-300 transition-colors dark:border-transparent dark:bg-red-600 dark:text-white dark:hover:border-red-500/80 dark:focus:bg-red-700"
        onClick={() => {
          if (
            window.confirm(
              `Are you sure you want to delete "${selectedHardwareConfig}"? This action cannot be undone.`,
            )
          ) {
            this.props.deleteHardwareConfig(selectedHardwareConfig);
            this.setState({
              selectedHardwareConfig: '',
              editedConfigText: '',
              saveFilename: '',
              robotInstance: new Robot(),
            });
          }
        }}
        disabled={
          !this.state.selectedHardwareConfig ||
          this.state.selectedHardwareConfig === '<No Config Set>' ||
          isReadOnly
        }
      >
        Delete
      </ActionButton>
    );
  }

  renderEditor() {
    const { hardwareConfigList, isReadOnlyList } = this.props;
    const { selectedHardwareConfig, viewMode } = this.state;

    const idx = hardwareConfigList.indexOf(selectedHardwareConfig);
    const isReadOnly = idx !== -1 && isReadOnlyList[idx];

    return (
      <div className="mt-4 rounded bg-gray-100 p-3 text-sm dark:bg-slate-800 dark:text-slate-200">
        <div className="mb-2 flex items-center justify-between">
          <h4 className="flex items-center text-base font-semibold">
            <span
              className={`
                text-500 ml-1 inline-block w-3
                ${this.hasUnsavedChanges() ? 'opacity-100' : 'opacity-0'}
              `}
            >
              *
            </span>
            {isReadOnly
              ? viewMode === 'text'
                ? 'Read-Only Configuration (XML)'
                : 'Read-Only Configuration (GUI)'
              : viewMode === 'text'
              ? 'Edit Configuration (XML)'
              : 'Edit Configuration (GUI)'}
            <span className="font-normal">{this.renderResetButton()}</span>
          </h4>
          <div className="flex items-center">
            <input
              type="text"
              placeholder="Enter Filename..."
              value={this.state.saveFilename}
              onChange={(e) => this.setState({ saveFilename: e.target.value })}
              className="mr-2 rounded-md border py-1 px-2 text-sm shadow-sm focus:border-primary-500 focus:ring-primary-500 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200"
            />
            {this.renderSaveButton()}
            <ActionButton
              onClick={this.toggleViewMode}
              className="
                ml-2 border-orange-400 bg-orange-300 transition-colors
                dark:border-transparent dark:bg-orange-600 dark:text-white dark:highlight-white/30
                dark:hover:border-orange-500/80 dark:focus:bg-orange-700
              "
            >
              {this.state.viewMode === 'text'
                ? 'Switch to GUI'
                : 'Switch to Text'}
            </ActionButton>
          </div>
        </div>

        {this.state.viewMode === 'text' ? (
          <textarea
            ref={this.textareaRef}
            className="w-full rounded border bg-white p-2 font-mono text-sm shadow-inner dark:bg-slate-700 dark:text-slate-100"
            value={this.state.editedConfigText}
            onChange={(e) =>
              this.setState({ editedConfigText: e.target.value })
            }
            style={{ resize: 'none', overflow: 'hidden' }}
            placeholder=""
          />
        ) : (
          this.state.robotInstance.renderAsGui(
            this.handleRobotGuiChange,
            'robot-gui',
          )
        )}
      </div>
    );
  }

  render() {
    const { available, activeOpModeStatus, hardwareConfigList, activeOpMode } =
      this.props;

    if (!available) {
      return (
        <BaseView isUnlocked={this.props.isUnlocked}>
          <BaseViewHeading isDraggable={this.props.isDraggable}>
            Hardware Config
          </BaseViewHeading>
          <BaseViewBody className="flex-center">
            <h3 className="text-center text-sm">
              Hardware Config controls have not initialized
            </h3>
          </BaseViewBody>
        </BaseView>
      );
    }

    return (
      <BaseView isUnlocked={this.props.isUnlocked}>
        <div className="flex">
          <BaseViewHeading
            isDraggable={this.props.isDraggable}
            className="text-sm"
          >
            Hardware Config
          </BaseViewHeading>
        </div>
        <BaseViewBody>
          <div className="flex items-center space-x-2">
            <span
              className={`
                ml-0.5
                ${
                  this.state.selectedHardwareConfig ===
                    this.props.currentHardwareConfig ||
                  !this.state.selectedHardwareConfig
                    ? 'select-none opacity-0'
                    : 'select-auto opacity-100'
                }
              `}
            >
              *
            </span>
            <select
              className={`
                m-1 rounded border border-gray-300 bg-gray-200 p-1 pr-6
                text-sm shadow-md transition
                focus:border-primary-500 focus:ring-primary-500 disabled:text-gray-600
                disabled:shadow-none dark:border-slate-500/80 dark:bg-slate-700 dark:text-slate-200
              `}
              value={this.state.selectedHardwareConfig}
              disabled={
                activeOpModeStatus !== OpModeStatus.STOPPED &&
                activeOpMode !== STOP_OP_MODE_TAG
              }
              onChange={this.onChange}
            >
              {hardwareConfigList.length === 0 ? (
                <option value="">No configurations available</option>
              ) : (
                [
                  <option value="<No Config Set>" key="empty-option">
                    Select a configuration...
                  </option>,
                  ...hardwareConfigList
                    .slice()
                    .sort()
                    .map((configName: string) => {
                      const idx =
                        this.props.hardwareConfigList.indexOf(configName);
                      const isReadOnly =
                        idx !== -1 && this.props.isReadOnlyList[idx];
                      return (
                        <option key={configName} value={configName}>
                          {configName} {isReadOnly ? '(Read-Only)' : ''}
                        </option>
                      );
                    }),
                ]
              )}
            </select>
            <div className="flex space-x-1">
              {this.renderSetButton()}
              {this.renderDeleteButton()}
            </div>
          </div>

          {this.renderEditor()}
        </BaseViewBody>
      </BaseView>
    );
  }
}

export default connector(HardwareConfigView);