/* eslint-disable @typescript-eslint/naming-convention */

import { IExtensionStates } from './interfaces/IExtensionStates';
import { ISavedPopupInputs } from './interfaces/ISavedPopupInputs';
import { CheckIfChannelExists } from './services/check-if-channel-exists.service';

export class Popup {
    private static channelInput = document.getElementById(
        'channel',
    ) as HTMLInputElement;

    private static nameInput = document.getElementById(
        'name',
    ) as HTMLInputElement;

    private static nickAbbreviationInput = document.getElementById(
        'nick-abbreviation',
    ) as HTMLInputElement;

    private static startButton = document.getElementById('start-button');

    private static toggleButton = document.getElementById(
        'toggle',
    ) as HTMLInputElement;

    private static toggleText = document.getElementById('toggle-text');
    private static buttonClickEvent: () => Promise<void>;

    private static async checkIfInputDataIsTheSameListener(): Promise<void> {
        chrome.runtime.onMessage.addListener(
            async (request: IExtensionStates) => {
                const { sameData } = request;

                if (sameData) {
                    alert('You are already connected with this data !');

                    return;
                }
            },
        );
    }

    private static async changeExtensionIconIfEnabledOrDisabled(
        enabled: boolean,
    ): Promise<void> {
        if (enabled) {
            await chrome.action.setIcon({ path: 'icons/twitch-icon_32.png' });
        } else {
            await chrome.action.setIcon({
                path: 'icons/twitch-icon-disabled_32.png',
            });
        }
    }

    private static async changeToggleTextIfEnabledOrDisabled(
        enabled: boolean,
    ): Promise<void> {
        if (enabled) {
            Popup.toggleText.textContent = 'Enabled';
        } else {
            Popup.toggleText.textContent = 'Disabled';
        }
    }

    private static async enabledExtensionState(): Promise<void> {
        Popup.startButton.classList.remove('disabled');
        await Popup.changeExtensionIconIfEnabledOrDisabled(true);
        Popup.changeToggleTextIfEnabledOrDisabled(true);
    }

    private static async disabledExtensionState(): Promise<void> {
        Popup.startButton.classList.add('disabled');
        await Popup.changeExtensionIconIfEnabledOrDisabled(false);
        Popup.changeToggleTextIfEnabledOrDisabled(false);
    }

    private static clearsHTMLInputsValues(): void {
        Popup.nameInput.value = '';
        Popup.channelInput.value = '';
        Popup.nickAbbreviationInput.value = '';
    }

    private static async setIsExtensionEnabledPopup(
        boolean: boolean,
    ): Promise<void> {
        if (boolean) {
            await chrome.storage.local.set(<IExtensionStates>{
                isExtensionEnabledPopup: true,
            });
        } else {
            await chrome.storage.local.set(<IExtensionStates>{
                isExtensionEnabledPopup: false,
            });
        }
    }

    private static async enableExtensionPopupIfLoadEnabled(): Promise<void> {
        const { isExtensionEnabledPopup, nameSavedPopup, channelSavedPopup } =
            (await chrome.storage.local.get([
                'isExtensionEnabledPopup',
                'nameSavedPopup',
                'channelSavedPopup',
            ])) as IExtensionStates & ISavedPopupInputs;

        if (isExtensionEnabledPopup && nameSavedPopup && channelSavedPopup) {
            Popup.toggleButton.checked = true;
            await Popup.init();

            await Popup.enabledExtensionState();
        } else {
            Popup.toggleButton.checked = false;
            await Popup.disabledExtensionState();
        }

        Popup.toggleButton.addEventListener('change', async () => {
            const isExtensionEnabledPopup = Popup.toggleButton.checked;

            if (isExtensionEnabledPopup) {
                await Popup.init();

                await Popup.setIsExtensionEnabledPopup(true);

                await Popup.enabledExtensionState();
            } else {
                Popup.clearsHTMLInputsValues();

                await Popup.setIsExtensionEnabledPopup(false);

                await Popup.disabledExtensionState();

                Popup.startButton.removeEventListener(
                    'click',
                    Popup.buttonClickEvent,
                );
            }

            chrome.tabs.query(
                { active: true, currentWindow: true },
                async (tabs) => {
                    await chrome.tabs.sendMessage(tabs[0].id, {
                        isExtensionEnabledPopup,
                    });
                },
            );
        });
    }

    private static async channelValidation(
        channelInputValue: string,
    ): Promise<boolean> {
        const isValidChannel = await CheckIfChannelExists.execute(
            channelInputValue,
        );

        if (isValidChannel === undefined) {
            alert('An error occurred, try again later !');

            return false;
        }

        if (isValidChannel === false) {
            alert('The channel does not exist !');

            return false;
        }

        return true;
    }

    private static async nameValidation(
        nameInputValue: string,
    ): Promise<boolean> {
        const isValidName = await CheckIfChannelExists.execute(nameInputValue);

        if (isValidName === undefined) {
            alert('An error occurred, try again later !');

            return false;
        }

        if (isValidName === false) {
            alert('The name does not exist !');

            return false;
        }

        return true;
    }

    private static async requestDelay(): Promise<boolean> {
        const popupRequestCooldown = 10 * 1000; // 10 seconds

        const { popupRequestDelay } = (await chrome.storage.local.get(
            'popupRequestDelay',
        )) as IExtensionStates;

        const nextRequest = popupRequestDelay
            ? popupRequestDelay + popupRequestCooldown
            : 0;

        const currentTime = Date.now();

        if (currentTime > nextRequest) {
            return true;
        }

        return false;
    }

    private static async buttonClickEventListener(): Promise<void> {
        Popup.buttonClickEvent = async () => {
            if (
                Popup.channelInput.value.length < 4 ||
                Popup.channelInput.value.length > 25
            ) {
                alert('The channel must have between 4 and 25 characters');

                return;
            }

            const channelValidationResponse = await Popup.channelValidation(
                Popup.channelInput.value,
            );

            if (!channelValidationResponse) {
                return;
            }

            if (
                Popup.nameInput.value.length < 4 ||
                Popup.nameInput.value.length > 25
            ) {
                alert('The name needs to have between 4 and 25 characters');

                return;
            }

            const nameValidationResponse = await Popup.nameValidation(
                Popup.nameInput.value,
            );

            if (!nameValidationResponse) {
                return;
            }

            const isAllowedToMakeRequest = await Popup.requestDelay();

            if (!isAllowedToMakeRequest) {
                alert('Wait 10 seconds to make another request !');

                return;
            }

            await chrome.storage.local.set({
                popupRequestDelay: Date.now(),
            });

            alert('Extension activated successfully !');

            await chrome.storage.local.set({
                nameSavedPopup: Popup.nameInput.value,
                channelSavedPopup: Popup.channelInput.value,
                nickAbbreviationSavedPopup: Popup.nickAbbreviationInput.value,
            });

            chrome.tabs.query(
                { active: true, currentWindow: true },
                async (tabs) => {
                    await chrome.tabs.sendMessage(tabs[0].id, {
                        startButtonClicked: {
                            channelSavedPopup: Popup.channelInput.value,
                            nameSavedPopup: Popup.nameInput.value,
                            nickAbbreviationSavedPopup:
                                Popup.nickAbbreviationInput.value ?? undefined,
                        },
                    });
                },
            );
        };
    }

    private static async init(): Promise<void> {
        const {
            nameSavedPopup,
            channelSavedPopup,
            nickAbbreviationSavedPopup,
        } = (await chrome.storage.local.get([
            'nameSavedPopup',
            'channelSavedPopup',
            'nickAbbreviationSavedPopup',
        ])) as ISavedPopupInputs;

        Popup.clearsHTMLInputsValues();

        if (nameSavedPopup && channelSavedPopup) {
            Popup.nameInput.value = nameSavedPopup;
            Popup.channelInput.value = channelSavedPopup;

            if (nickAbbreviationSavedPopup) {
                Popup.nickAbbreviationInput.value = nickAbbreviationSavedPopup;
            }
        }

        await Popup.buttonClickEventListener();
        Popup.startButton.addEventListener('click', Popup.buttonClickEvent);
    }

    public static async start(): Promise<void> {
        await Popup.checkIfInputDataIsTheSameListener();
        await Popup.enableExtensionPopupIfLoadEnabled();
    }
}

Popup.start();
