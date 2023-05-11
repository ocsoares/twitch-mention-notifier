import { createNickAbbreviationInputArray } from '../utils/create-nick-abbreviation-input-array.util';
import { Client } from 'tmi.js';

export async function enableOrDisableExtensionAndChangeChannelEvent(
    getSavedPopupData: () => Promise<object>,
    tmiClient: Client,
    extensionActivationInProgress: boolean,
    extensionEnabled: boolean,
    main: () => Promise<void>,
    nameInput: string,
    channelInput: string,
    nickAbbreviationInput: string,
    tmiConnected: [string, number] | undefined = undefined,
    isConnectedChannel: boolean,
    nickAbbreviationInputArray: string[],
) {
    chrome.runtime.onMessage.addListener(async (request) => {
        console.log('nameInput do PARÂMETRO enableOr...', nameInput);
        const { startButtonClicked, isExtensionEnabledPopup } = request;

        if (isExtensionEnabledPopup === true) {
            await getSavedPopupData();
            console.log('nameInput DEPIS NO ENABLEOR...:', nameInput);

            if (!tmiClient) {
                extensionActivationInProgress = true;
                await main();
                extensionActivationInProgress = false;
            }

            extensionEnabled = true;

            return;
        }

        if (isExtensionEnabledPopup === false) {
            if (extensionActivationInProgress) {
                await new Promise<void>((resolve) =>
                    setTimeout(() => {
                        extensionEnabled = false;
                        resolve();
                    }, 2000),
                );
            }

            extensionEnabled = false;

            return;
        }

        if (startButtonClicked && extensionEnabled) {
            const {
                nameSavedPopup,
                channelSavedPopup,
                nickAbbreviationSavedPopup,
            } = startButtonClicked;

            // Prevent the user from trying to connect with the same inputs
            if (
                nameSavedPopup &&
                nameInput &&
                channelSavedPopup &&
                channelInput &&
                nickAbbreviationSavedPopup &&
                nickAbbreviationInput
            ) {
                if (
                    channelSavedPopup === channelInput &&
                    nameSavedPopup === nameInput &&
                    nickAbbreviationSavedPopup === nickAbbreviationInput
                ) {
                    await chrome.runtime.sendMessage({ sameData: true });

                    return;
                }
            }

            if (
                nameSavedPopup &&
                nameInput &&
                channelSavedPopup &&
                channelInput
            ) {
                if (
                    channelSavedPopup === channelInput &&
                    nameSavedPopup === nameInput &&
                    !nickAbbreviationSavedPopup &&
                    !nickAbbreviationInput
                ) {
                    await chrome.runtime.sendMessage({ sameData: true });

                    return;
                }

                if (nickAbbreviationSavedPopup && nickAbbreviationInput) {
                    if (
                        nickAbbreviationSavedPopup === nickAbbreviationInput &&
                        nameSavedPopup === nameInput &&
                        channelSavedPopup === channelInput
                    ) {
                        await chrome.runtime.sendMessage({ sameData: true });

                        return;
                    }
                }
            }

            if (tmiConnected && channelInput && !isConnectedChannel) {
                isConnectedChannel = true;
                await tmiClient.part(channelInput);
                await new Promise((resolve) => setTimeout(resolve, 500));
                isConnectedChannel = false;
            }

            nameInput = nameSavedPopup;
            channelInput = channelSavedPopup;
            nickAbbreviationInput = nickAbbreviationSavedPopup;

            if (nickAbbreviationInput) {
                nickAbbreviationInputArray = createNickAbbreviationInputArray(
                    nickAbbreviationInput,
                );
            } else {
                nickAbbreviationInputArray = [];
            }

            if (tmiConnected) {
                console.log('ENTROU NO CANAL !!!');
                console.log('channelInput ENTRADO:', channelInput);
                await tmiClient.join(channelInput);
            }

            return;
        }
    });
}
