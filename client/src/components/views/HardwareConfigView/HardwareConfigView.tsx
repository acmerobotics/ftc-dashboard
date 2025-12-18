import React, {
  Component,
  ChangeEvent,
  createRef,
  RefObject,
  useEffect,
  useRef,
} from 'react';
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
  dialog:
    | null
    | {
        type: 'alert';
        message: string;
        resolve: () => void;
      }
    | {
        type: 'prompt';
        message: string;
        resolve: (value: string | null) => void;
      };
};

const mapStateToProps = ({ status, hardwareConfig }: RootState) => ({
  ...status,
  hardwareConfigs: hardwareConfig.hardwareConfigs,
  currentHardwareConfig: hardwareConfig.currentHardwareConfig,
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

type SimpleModalProps = {
  message: string;
  onClose: () => void;
};

const SimpleModal = ({ message, onClose }: SimpleModalProps) => {
  const wrapperRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    wrapperRef.current?.focus();
  }, []);
  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === 'Escape') {
      onClose();
    }
  };
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      tabIndex={-1}
      ref={wrapperRef}
      onKeyDown={handleKey}
    >
      <div className="w-full max-w-md rounded bg-white p-4 shadow-lg dark:bg-slate-800">
        <p className="mb-3 whitespace-pre-wrap text-sm">{message}</p>
        <ActionButton
          className="
            w-full border-blue-300 bg-blue-200
            transition-colors dark:border-transparent dark:bg-blue-600 dark:text-blue-50
            dark:highlight-white/30 dark:hover:border-blue-400/80 dark:focus:bg-blue-700
          "
          onClick={onClose}
        >
          OK
        </ActionButton>
      </div>
    </div>
  );
};

type InputModalProps = {
  message: string;
  onConfirm: (value: string) => void;
  onCancel: () => void;
};

const InputModal = ({ message, onConfirm, onCancel }: InputModalProps) => {
  const inputRef = createRef<HTMLInputElement>();
  const wrapperRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    wrapperRef.current?.focus();
  }, []);
  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      onConfirm(inputRef.current?.value ?? '');
    } else if (e.key === 'Escape') {
      onCancel();
    }
  };
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      tabIndex={-1}
      ref={wrapperRef}
      onKeyDown={handleKey}
    >
      <div className="w-full max-w-md rounded bg-white p-4 shadow-lg dark:bg-slate-800">
        <p className="mb-3 whitespace-pre-wrap text-sm">{message}</p>
        <input
          ref={inputRef}
          type="text"
          className="mb-3 w-full rounded border p-1 text-sm dark:border-slate-600 dark:bg-slate-700"
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              onConfirm(inputRef.current?.value ?? '');
            }
          }}
        />
        <div className="flex space-x-2">
          <ActionButton
            className="flex-1 rounded bg-gray-200 py-1 text-sm hover:bg-gray-300 dark:bg-slate-700 dark:hover:bg-slate-600"
            onClick={onCancel}
          >
            Cancel
          </ActionButton>
          <ActionButton
            className="
              flex-1 border-blue-300 bg-blue-200 transition-colors
              dark:border-transparent dark:bg-blue-600 dark:text-blue-50 dark:highlight-white/30
              dark:hover:border-blue-400/80 dark:focus:bg-blue-700
            "
            onClick={() => onConfirm(inputRef.current?.value ?? '')}
          >
            OK
          </ActionButton>
        </div>
      </div>
    </div>
  );
};

class HardwareConfigView extends Component<
  HardwareConfigViewProps,
  HardwareConfigViewState
> {
  textareaRef: RefObject<HTMLTextAreaElement>;

  constructor(props: HardwareConfigViewProps) {
    super(props);
    this.state = {
      selectedHardwareConfig: '',
      editedConfigText: new Robot().toString(),
      viewMode: 'gui',
      robotInstance: new Robot(),
      saveFilename: '',
      dialog: null,
    };
    this.textareaRef = createRef<HTMLTextAreaElement>();
    this.onChange = this.onChange.bind(this);
    this.toggleViewMode = this.toggleViewMode.bind(this);
    this.handleRobotGuiChange = this.handleRobotGuiChange.bind(this);
    this.parseEditedXmlToRobot = this.parseEditedXmlToRobot.bind(this);
    this.adjustTextareaHeight = this.adjustTextareaHeight.bind(this);
    this.showAlert = this.showAlert.bind(this);
    this.showPrompt = this.showPrompt.bind(this);
    this.closeDialog = this.closeDialog.bind(this);
  }

  isOpModeRunning() {
    const { activeOpModeStatus, activeOpMode } = this.props;
    return (
      activeOpModeStatus !== OpModeStatus.STOPPED &&
      activeOpMode !== STOP_OP_MODE_TAG
    );
  }

  adjustTextareaHeight() {
    const textarea = this.textareaRef.current;
    if (!textarea) return;
    textarea.style.height = 'auto';
    textarea.style.height = `${textarea.scrollHeight}px`;
  }

  componentDidMount() {
    const { currentHardwareConfig, hardwareConfigs } = this.props;
    if (currentHardwareConfig) {
      const config = hardwareConfigs.find(
        (c) => c.name === currentHardwareConfig,
      );
      const newText = config ? config.xmlContent : '';
      if (newText.trim() === '') {
        const r = new Robot();
        this.setState({
          selectedHardwareConfig: currentHardwareConfig,
          editedConfigText: r.toString(),
          saveFilename: currentHardwareConfig,
          robotInstance: r,
          viewMode: 'gui',
        });
      } else {
        const parseSuccess = this.parseEditedXmlToRobot(newText);
        this.setState({
          selectedHardwareConfig: currentHardwareConfig,
          editedConfigText: newText,
          saveFilename: currentHardwareConfig,
          viewMode: parseSuccess ? this.state.viewMode : 'text',
        });
      }
    }
  }

  componentDidUpdate(
    prevProps: Readonly<HardwareConfigViewProps>,
    prevState: Readonly<HardwareConfigViewState>,
  ) {
    const { currentHardwareConfig, hardwareConfigs } = this.props;
    if (prevState.editedConfigText !== this.state.editedConfigText) {
      this.adjustTextareaHeight();
    }
    if (prevProps.currentHardwareConfig !== currentHardwareConfig) {
      const config = hardwareConfigs.find(
        (c) => c.name === currentHardwareConfig,
      );
      const newText = config ? config.xmlContent : '';
      if (newText.trim() === '') {
        const r = new Robot();
        this.setState({
          selectedHardwareConfig: currentHardwareConfig,
          editedConfigText: r.toString(),
          saveFilename: currentHardwareConfig,
          robotInstance: r,
          viewMode: 'gui',
        });
        return;
      }
      this.parseEditedXmlToRobot(newText);
      this.setState({
        selectedHardwareConfig: currentHardwareConfig,
        editedConfigText: newText,
        saveFilename: currentHardwareConfig,
      });
      return;
    }
  }

  private isValidXml(xmlText: string): { ok: boolean; message?: string } {
    const parser = new DOMParser();
    const doc = parser.parseFromString(xmlText, 'application/xml');
    const parseErrors = Array.from(doc.getElementsByTagName('parsererror'));
    if (parseErrors.length === 0) return { ok: true };
    const rawMsg = parseErrors[0].textContent || 'Unknown XML error';
    const firstLine = rawMsg.split('\n')[0];
    return { ok: false, message: firstLine };
  }

  parseEditedXmlToRobot(xmlText?: string): boolean {
    const { editedConfigText } = this.state;
    const text = xmlText ?? editedConfigText ?? '';
    if (text.trim() === '') {
      const r = new Robot();
      this.setState({
        robotInstance: r,
        editedConfigText: r.toString(),
        viewMode: 'gui',
      });
      return true;
    }
    const check = this.isValidXml(text);
    if (!check.ok) {
      this.setState({ viewMode: 'text' });
      return false;
    }
    try {
      const r = this.state.robotInstance;
      r.fromXml(text);
      this.setState({ robotInstance: r });
      return true;
    } catch {
      this.setState({ viewMode: 'text' });
      return false;
    }
  }

  private normalizeXml(xmlString: string): string {
    const parser = new DOMParser();
    const serializer = new XMLSerializer();
    const doc = parser.parseFromString(xmlString, 'application/xml');

    const removeComments = (node: Node) => {
      for (let i = node.childNodes.length - 1; i >= 0; i--) {
        const child = node.childNodes[i];
        if (child.nodeType === Node.COMMENT_NODE) {
          node.removeChild(child);
        } else {
          removeComments(child);
        }
      }
    };
    removeComments(doc);

    const sortAttributes = (el: Element) => {
      const attrs = Array.from(el.attributes).sort((a, b) =>
        a.name.localeCompare(b.name),
      );
      while (el.attributes.length > 0) {
        el.removeAttribute(el.attributes[0].name);
      }
      for (const attr of attrs) {
        el.setAttribute(attr.name, attr.value);
      }
      for (const child of Array.from(el.children)) {
        sortAttributes(child);
      }
    };
    sortAttributes(doc.documentElement);
    return serializer.serializeToString(doc).replace(/\s+/g, ' ').trim();
  }

  private configChanged(xml1: string, xml2: string): boolean {
    try {
      const norm1 = this.normalizeXml(xml1);
      const norm2 = this.normalizeXml(xml2);
      return norm1 !== norm2;
    } catch {
      return true;
    }
  }

  hasUnsavedChanges() {
    const {
      selectedHardwareConfig,
      editedConfigText,
      viewMode,
      robotInstance,
    } = this.state;
    const { hardwareConfigs } = this.props;

    if (!selectedHardwareConfig) return false;
    const config = hardwareConfigs.find(
      (c) => c.name === selectedHardwareConfig,
    );
    if (!config) return false;

    const currentText =
      viewMode === 'gui' ? robotInstance.toString() : editedConfigText;
    return this.configChanged(config.xmlContent ?? '', currentText);
  }

  onChange(evt: ChangeEvent<HTMLSelectElement>) {
    const selected = evt.target.value;
    const config = this.props.hardwareConfigs.find((c) => c.name === selected);
    const text = config ? config.xmlContent : '';
    const parseSuccess = this.parseEditedXmlToRobot(text);

    this.setState({
      selectedHardwareConfig: selected,
      editedConfigText: text,
      saveFilename: selected,
      viewMode: parseSuccess ? this.state.viewMode : 'text',
    });
  }

  async showAlert(message: string) {
    return new Promise<void>((resolve) => {
      this.setState({
        dialog: { type: 'alert', message, resolve },
      });
    });
  }

  async showPrompt(message: string) {
    return new Promise<string | null>((resolve) => {
      this.setState({
        dialog: { type: 'prompt', message, resolve },
      });
    });
  }

  closeDialog() {
    const { dialog } = this.state;
    if (dialog) {
      if (dialog.type === 'alert') dialog.resolve();
      else dialog.resolve(null);
      this.setState({ dialog: null });
    }
  }

  async toggleViewMode() {
    const { viewMode, robotInstance, editedConfigText } = this.state;
    if (viewMode === 'text') {
      const check = this.isValidXml(editedConfigText);
      if (!check.ok) {
        const userInput = await this.showPrompt(
          'XML parse errors:\n' +
            `${check.message}\n\nType "switch" to attempt to switch to GUI anyway, or cancel to stay in text mode:`,
        );
        if (userInput?.toLowerCase() !== 'switch') {
          this.setState({ viewMode: 'text' });
          return;
        }
      }
      try {
        robotInstance.fromXml(editedConfigText);
        this.setState({ viewMode: 'gui' });
      } catch {
        await this.showAlert(
          'Unable to switch to GUI: Robot.fromXml failed to parse the XML.',
        );
        this.setState({ viewMode: 'text' });
      }
    } else {
      const newXmlText = robotInstance.toString();
      this.setState(
        { viewMode: 'text', editedConfigText: newXmlText },
        this.adjustTextareaHeight,
      );
    }
  }

  handleRobotGuiChange() {
    this.setState({});
  }

  renderActivateButton(isOpModeRunning: boolean) {
    return (
      <ActionButton
        className={`
          border-blue-300 bg-blue-200 transition-colors
          dark:border-transparent dark:bg-blue-600 dark:text-blue-50 dark:highlight-white/30
          dark:hover:border-blue-400/80 dark:focus:bg-blue-700
        `}
        onClick={async () => {
          this.props.setHardwareConfig(this.state.selectedHardwareConfig);
          await this.showAlert('Config Activated!');
        }}
        disabled={
          isOpModeRunning ||
          !this.state.selectedHardwareConfig ||
          this.state.selectedHardwareConfig === '<No Config Set>'
        }
      >
        Activate
      </ActionButton>
    );
  }

  renderRevertButton(hasUnsavedChanges: boolean) {
    const { selectedHardwareConfig } = this.state;
    const { hardwareConfigs } = this.props;
    const config = hardwareConfigs.find(
      (c) => c.name === selectedHardwareConfig,
    );
    const originalText = config ? config.xmlContent : '';
    return (
      <ActionButton
        className="ml-2 border-yellow-400 bg-yellow-300 transition-colors dark:border-transparent dark:bg-yellow-600 dark:text-white dark:highlight-white/30 dark:hover:border-yellow-500/80 dark:focus:bg-yellow-700"
        onClick={async () => {
          if (
            !selectedHardwareConfig ||
            selectedHardwareConfig === '<No Config Set>'
          )
            return;
          const userInput = await this.showPrompt(
            `You are about to revert "${selectedHardwareConfig}" to its original configuration.\nAll unsaved changes will be lost.\n\nType "revert" to confirm:`,
          );
          if (userInput?.toLowerCase() === 'revert') {
            this.parseEditedXmlToRobot(originalText);
            this.setState({
              editedConfigText: originalText,
              saveFilename: selectedHardwareConfig,
            });
            await this.showAlert('Config Reverted!');
          } else {
            await this.showAlert('Revert cancelled.');
          }
        }}
        disabled={
          !selectedHardwareConfig ||
          selectedHardwareConfig === '<No Config Set>' ||
          !hasUnsavedChanges
        }
      >
        Revert
      </ActionButton>
    );
  }

  renderResetToDefaultButton() {
    return (
      <ActionButton
        className="ml-2 border-orange-400 bg-orange-300 transition-colors dark:border-transparent dark:bg-orange-600 dark:text-white dark:highlight-white/30 dark:hover:border-orange-500/80 dark:focus:bg-orange-700"
        onClick={async () => {
          const userInput = await this.showPrompt(
            'You are about to reset the current configuration to the default blank configuration.\nAll unsaved changes will be lost.\n\nType "reset" to confirm:',
          );
          if (userInput?.toLowerCase() === 'reset') {
            const r = new Robot();
            this.parseEditedXmlToRobot(r.toString());
            this.setState({
              editedConfigText: r.toString(),
              robotInstance: r,
            });
            await this.showAlert('Config Reset to Default!');
          } else {
            await this.showAlert('Reset cancelled.');
          }
        }}
      >
        Reset
      </ActionButton>
    );
  }

  renderSaveButton(isOpModeRunning: boolean) {
    const { viewMode, editedConfigText, robotInstance, saveFilename } =
      this.state;
    const { hardwareConfigs, writeHardwareConfig } = this.props;

    const trimmedSaveFilename = saveFilename.trim();
    const filenameIsValid = /^[a-zA-Z0-9_-]+$/.test(trimmedSaveFilename);

    const config = hardwareConfigs.find((c) => c.name === trimmedSaveFilename);
    const isReadOnly = config ? config.readOnly : false;

    let validate: string[] = [];

    if (viewMode === 'gui') {
      validate = robotInstance.validate();
    } else {
      const check = this.isValidXml(editedConfigText);
      if (!check.ok) {
        validate = [
          `XML is not well-formed: ${check.message ?? 'unknown error'}`,
        ];
      } else {
        try {
          const tempRobot = new Robot();
          tempRobot.fromXml(editedConfigText);
          validate = tempRobot.validate();
        } catch {
          validate = ['Robot.fromXml failed to parse the document.'];
        }
      }
    }

    const canSaveNormally =
      !isOpModeRunning &&
      trimmedSaveFilename !== '' &&
      trimmedSaveFilename !== '<No Config Set>' &&
      filenameIsValid &&
      !isReadOnly &&
      validate.length === 0;

    const canForceSave =
      !isOpModeRunning &&
      trimmedSaveFilename !== '' &&
      trimmedSaveFilename !== '<No Config Set>' &&
      !isReadOnly;

    const canClick = canSaveNormally || canForceSave;

    const xmlContentToSave =
      viewMode === 'gui' ? robotInstance.toString() : editedConfigText;

    const buttonClass = canSaveNormally
      ? 'border-green-400 bg-green-300 dark:border-transparent dark:bg-green-600 dark:highlight-white/30 dark:text-white dark:hover:border-green-400/80 dark:focus:bg-green-700'
      : 'border-red-400 bg-red-300 dark:border-transparent dark:bg-red-600 dark:highlight-white/30 dark:text-white dark:hover:border-red-500/80 dark:focus:bg-red-700';

    return (
      <ActionButton
        className={buttonClass}
        disabled={!canClick}
        onClick={async () => {
          if (!filenameIsValid) {
            const userInput = await this.showPrompt(
              'Filename may only contain letters, numbers, dashes (-), and underscores (_).\n\nType "save" to save anyway:',
            );
            if (userInput?.toLowerCase() !== 'save') {
              await this.showAlert('Save cancelled.');
              return;
            }
          }

          if (validate.length !== 0) {
            const userInput = await this.showPrompt(
              'There are validation errors:\n' +
                validate.join('\n') +
                '\n\nType "save" to save anyway:',
            );
            if (userInput?.toLowerCase() !== 'save') {
              await this.showAlert('Save cancelled.');
              return;
            }
          }

          writeHardwareConfig(trimmedSaveFilename, xmlContentToSave);
          this.setState({
            selectedHardwareConfig: trimmedSaveFilename,
            saveFilename: trimmedSaveFilename,
          });
          await this.showAlert('Config Saved!');
        }}
      >
        Save
      </ActionButton>
    );
  }

  renderDeleteButton(isOpModeRunning: boolean) {
    const { selectedHardwareConfig } = this.state;
    const { hardwareConfigs } = this.props;
    const config = hardwareConfigs.find(
      (c) => c.name === selectedHardwareConfig,
    );
    const isReadOnly = config ? config.readOnly : false;
    return (
      <ActionButton
        className="ml-2 border-red-400 bg-red-300 transition-colors dark:border-transparent dark:bg-red-600 dark:text-white dark:highlight-white/30 dark:hover:border-red-500/80 dark:focus:bg-red-700"
        onClick={async () => {
          if (
            !selectedHardwareConfig ||
            selectedHardwareConfig === '<No Config Set>' ||
            isReadOnly
          )
            return;
          const userInput = await this.showPrompt(
            `Are you sure you want to delete "${selectedHardwareConfig}"?\nThis action cannot be undone.\n\nType "delete" to confirm:`,
          );
          if (userInput?.toLowerCase() === 'delete') {
            this.props.deleteHardwareConfig(selectedHardwareConfig);
            this.setState({
              selectedHardwareConfig: '',
              editedConfigText: '',
              saveFilename: '',
              robotInstance: new Robot(),
            });
            await this.showAlert('Config Deleted!');
          } else {
            await this.showAlert('Deletion cancelled.');
          }
        }}
        disabled={
          isOpModeRunning ||
          !this.state.selectedHardwareConfig ||
          this.state.selectedHardwareConfig === '<No Config Set>' ||
          isReadOnly
        }
      >
        Delete
      </ActionButton>
    );
  }

  renderEditor(isOpModeRunning: boolean) {
    const { hardwareConfigs } = this.props;
    const { selectedHardwareConfig, viewMode } = this.state;
    const config = hardwareConfigs.find(
      (c) => c.name === selectedHardwareConfig,
    );
    const isReadOnly = config ? config.readOnly : false;
    const hasUnsavedChanges = this.hasUnsavedChanges();

    return (
      <div className="mt-4 rounded bg-gray-100 p-3 text-sm dark:bg-slate-800 dark:text-slate-200">
        <div className="mb-2 flex items-center justify-between">
          <h4 className="flex items-center text-base font-semibold">
            <span
              className={`
                text-500 ml-1 inline-block w-3
                ${hasUnsavedChanges ? 'opacity-100' : 'opacity-0'}
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
            <span className="font-normal">
              {this.renderRevertButton(hasUnsavedChanges)}
              {this.renderResetToDefaultButton()}
            </span>
          </h4>
          <div className="flex items-center">
            <input
              type="text"
              placeholder="Enter Filename..."
              value={this.state.saveFilename}
              onChange={(e) => this.setState({ saveFilename: e.target.value })}
              className="mr-2 rounded-md border py-1 px-2 text-sm shadow-sm focus:border-primary-500 focus:ring-primary-500 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200"
            />
            {this.renderSaveButton(isOpModeRunning)}
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
            className="w-full resize-none overflow-hidden rounded border bg-white p-2 font-mono text-sm shadow-inner dark:bg-slate-700 dark:text-slate-100"
            value={this.state.editedConfigText}
            onChange={(e) =>
              this.setState({ editedConfigText: e.target.value })
            }
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
    const { available, hardwareConfigs } = this.props;
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

    const isOpModeRunning = this.isOpModeRunning();

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
              onChange={this.onChange}
            >
              {hardwareConfigs.length === 0 ? (
                <option value="">No configurations available</option>
              ) : (
                [
                  <option value="<No Config Set>" key="empty-option">
                    Select a configuration...
                  </option>,
                  ...hardwareConfigs
                    .slice()
                    .sort((a, b) => a.name.localeCompare(b.name))
                    .map((config) => (
                      <option key={config.name} value={config.name}>
                        {config.name} {config.readOnly ? '(Read-Only)' : ''}
                      </option>
                    )),
                ]
              )}
            </select>
            <div className="flex space-x-1">
              {this.renderActivateButton(isOpModeRunning)}
              {this.renderDeleteButton(isOpModeRunning)}
            </div>
          </div>

          {this.renderEditor(isOpModeRunning)}
        </BaseViewBody>

        {this.state.dialog?.type === 'alert' && (
          <SimpleModal
            message={this.state.dialog.message}
            onClose={this.closeDialog}
          />
        )}
        {this.state.dialog?.type === 'prompt' && (
          <InputModal
            message={this.state.dialog.message}
            onConfirm={(val) => {
              this.state.dialog?.resolve(val);
              this.setState({ dialog: null });
            }}
            onCancel={() => {
              this.state.dialog?.resolve(null);
              this.setState({ dialog: null });
            }}
          />
        )}
      </BaseView>
    );
  }
}

export default connector(HardwareConfigView);
