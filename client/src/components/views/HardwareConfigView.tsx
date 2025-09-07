import { Component, ChangeEvent } from 'react';
import { connect, ConnectedProps } from 'react-redux';

import { RootState } from '@/store/reducers';
import OpModeStatus from '@/enums/OpModeStatus';
import BaseView, {
  BaseViewHeading,
  BaseViewBody,
  BaseViewProps,
  BaseViewHeadingProps,
} from './BaseView';

import { setHardwareConfig } from '@/store/actions/hardwareconfig';
import { STOP_OP_MODE_TAG } from '@/store/types';

type HardwareConfigViewState = {
  selectedHardwareConfig: string;
};

const mapStateToProps = ({ status, hardwareConfig }: RootState) => ({
  ...status,
  ...hardwareConfig,
});

const mapDispatchToProps = {
  setHardwareConfig: (hardwareConfig: string) =>
    setHardwareConfig(hardwareConfig),
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
    className={`ml-2 rounded-md border py-1 px-3 shadow-md ${className}`}
    {...props}
  >
    {children}
  </button>
);

class HardwareConfigView extends Component<
  HardwareConfigViewProps,
  HardwareConfigViewState
> {
  constructor(props: HardwareConfigViewProps) {
    super(props);

    this.state = {
      selectedHardwareConfig: '',
    };

    this.onChange = this.onChange.bind(this);
  }

  onChange(evt: ChangeEvent<HTMLSelectElement>) {
    this.setState({
      selectedHardwareConfig: evt.target.value,
    });
  }

  componentDidUpdate(prevProps: Readonly<HardwareConfigViewProps>) {
    if (prevProps.currentHardwareConfig !== this.props.currentHardwareConfig) {
      this.setState({
        selectedHardwareConfig: this.props.currentHardwareConfig,
      });
    }
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
      >
        Set
      </ActionButton>
    );
  }

  renderButtons() {
    const { activeOpModeStatus, hardwareConfigList, activeOpMode } = this.props;

    if (hardwareConfigList.length === 0) {
      return null;
    } else if (
      activeOpModeStatus === OpModeStatus.STOPPED ||
      activeOpMode === STOP_OP_MODE_TAG
    ) {
      return this.renderSetButton();
    }
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
            <h3 className="text-md text-center">
              Hardware Config controls have not initialized
            </h3>
          </BaseViewBody>
        </BaseView>
      );
    }

    return (
      <BaseView isUnlocked={this.props.isUnlocked}>
        <div className="flex">
          <BaseViewHeading isDraggable={this.props.isDraggable}>
            Hardware Config
          </BaseViewHeading>
        </div>
        <BaseViewBody>
          <span
            style={
              this.state.selectedHardwareConfig ===
              this.props.currentHardwareConfig
                ? {
                    userSelect: 'none',
                    opacity: 0.0,
                  }
                : {
                    userSelect: 'auto',
                    opacity: 1.0,
                  }
            }
          >
            *
          </span>
          <select
            className={`
              m-1 mr-2 rounded border border-gray-300 bg-gray-200 p-1 pr-6 
              shadow-md transition focus:border-primary-500
              focus:ring-primary-500 disabled:text-gray-600 disabled:shadow-none
              dark:border-slate-500/80 dark:bg-slate-700 dark:text-slate-200
            `}
            value={this.state.selectedHardwareConfig}
            disabled={
              activeOpModeStatus !== OpModeStatus.STOPPED &&
              activeOpMode !== STOP_OP_MODE_TAG
            }
            onChange={this.onChange}
          >
            {hardwareConfigList.length === 0 ? (
              <option>Loading...</option>
            ) : (
              hardwareConfigList
                .sort()
                .map((opMode: string) => <option key={opMode}>{opMode}</option>)
            )}
          </select>
          {this.renderButtons()}
        </BaseViewBody>
      </BaseView>
    );
  }
}

export default connector(HardwareConfigView);
