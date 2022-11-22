import { Fragment, useEffect, useState } from 'react';
import { Dialog, Switch, Transition } from '@headlessui/react';
import { clsx as cx } from 'clsx';
import { useDispatch } from 'react-redux';
import { connect, disconnect } from '@/store/actions/socket';
import MockSocket from '@/store/middleware/MockSocket';

export default function DeveloperModeDialog({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const dispatch = useDispatch();

  const [isMockSocketEnabled, setIsMockSocketEnabled] = useState(false);

  useEffect(() => {
    dispatch(disconnect());
    dispatch(connect(isMockSocketEnabled ? new MockSocket() : undefined));
  }, [isMockSocketEnabled]);

  return (
    <Transition as={Fragment} show={isOpen}>
      <Dialog onClose={onClose}>
        {/* Backdrop */}
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-150"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-100"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/30" />
        </Transition.Child>

        {/* Dialog body */}
        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex items-center justify-center min-h-full p-4 text-center">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-150"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-100"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-md py-6 overflow-hidden text-left align-middle transition-all transform bg-white rounded-md shadow-xl">
                <Dialog.Title className="px-6 mb-4 text-xl font-medium">
                  Developer Options
                </Dialog.Title>
                <ul>
                  <li
                    className={cx(
                      'px-4',
                      !isMockSocketEnabled && 'bg-gray-100',
                    )}
                  >
                    {/* Mock Socket section */}
                    <section className="px-2 border-t border-b border-gray-300">
                      <div className="flex flex-row items-center justify-between">
                        <h4 className="py-4 font-medium">Mock Socket</h4>
                        <Switch
                          checked={isMockSocketEnabled}
                          onChange={setIsMockSocketEnabled}
                          className={cx(
                            'relative inline-flex h-6 w-11 items-center rounded-full border',
                            isMockSocketEnabled
                              ? 'bg-blue-600 border-blue-700'
                              : 'bg-gray-300 border-gray-400',
                          )}
                        >
                          <span
                            className={cx(
                              'inline-block h-4 w-4 transform rounded-full bg-white transition',
                              isMockSocketEnabled
                                ? 'translate-x-[1.35rem]'
                                : 'translate-x-1',
                            )}
                          />
                        </Switch>
                      </div>
                    </section>
                  </li>
                </ul>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}
