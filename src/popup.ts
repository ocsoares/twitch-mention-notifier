import { checkIfChannelExists } from './services/check-if-channel-exists.service';

const channelInput = document.getElementById('channel') as HTMLInputElement;
const nameInput = document.getElementById('name') as HTMLInputElement;
const nickAbbreviationInput = document.getElementById(
    'nick-abbreviation',
) as HTMLInputElement;
const startButton = document.getElementById('start-button');
const toggleButton = document.getElementById('toggle') as HTMLInputElement;
let buttonClickEvent: () => Promise<void>;

chrome.runtime.onMessage.addListener(async (request) => {
    const { sameData } = request;

    if (sameData) {
        alert('You are already connected with this data !');

        return;
    }
});

async function changeExtensionIconEnabledOrDisabled(enabled: boolean) {
    if (enabled) {
        await chrome.action.setIcon({ path: 'icons/twitch-icon_32.png' });
    } else {
        await chrome.action.setIcon({
            path: 'icons/twitch-icon-disabled_32.png',
        });
    }
}

async function extensionEnabledOrNot() {
    const { isExtensionEnabledPopup } = await chrome.storage.local.get(
        'isExtensionEnabledPopup',
    );

    if (isExtensionEnabledPopup) {
        toggleButton.checked = true;
        await main();

        await changeExtensionIconEnabledOrDisabled(true);
    } else {
        startButton.classList.add('disabled');
        await changeExtensionIconEnabledOrDisabled(false);
    }

    toggleButton.addEventListener('change', async () => {
        const isExtensionEnabledPopup = toggleButton.checked;

        if (isExtensionEnabledPopup) {
            await main();

            await chrome.storage.local.set({
                isExtensionEnabledPopup: true,
            });

            startButton.classList.remove('disabled');
            await changeExtensionIconEnabledOrDisabled(true);
        } else {
            nameInput.value = '';
            channelInput.value = '';
            nickAbbreviationInput.value = '';

            await chrome.storage.local.set({
                isExtensionEnabledPopup: false,
            });

            startButton.classList.add('disabled');
            await changeExtensionIconEnabledOrDisabled(false);

            startButton.removeEventListener('click', buttonClickEvent);
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

extensionEnabledOrNot();

async function main() {
    const { nameSavedPopup, channelSavedPopup, nickAbbreviationSavedPopup } =
        await chrome.storage.local.get([
            'nameSavedPopup',
            'channelSavedPopup',
            'nickAbbreviationSavedPopup',
        ]);

    nameInput.value = '';
    channelInput.value = '';
    nickAbbreviationInput.value = '';

    if (nameSavedPopup && channelSavedPopup) {
        nameInput.value = nameSavedPopup;
        channelInput.value = channelSavedPopup;

        if (nickAbbreviationSavedPopup) {
            nickAbbreviationInput.value = nickAbbreviationSavedPopup;
        }
    }

    return await new Promise<void>((resolve) => {
        buttonClickEvent = async () => {
            if (
                channelInput.value.length < 4 ||
                channelInput.value.length > 25
            ) {
                alert('The channel must have between 4 and 25 characters');

                return;
            }

            const isValidChannel = await checkIfChannelExists(
                channelInput.value,
            );

            if (isValidChannel === undefined) {
                alert('An error occurred, try again later !');

                return;
            }

            if (isValidChannel === false) {
                alert('The channel does not exist !');

                return;
            }

            if (nameInput.value.length < 4 || nameInput.value.length > 25) {
                alert('The name needs to have between 4 and 25 characters');

                return;
            }

            const isValidName = await checkIfChannelExists(nameInput.value);

            if (isValidName === undefined) {
                alert('An error occurred, try again later !');

                return;
            }

            if (isValidName === false) {
                alert('The name does not exist !');

                return;
            }

            alert('Extension activated successfully !');

            await chrome.storage.local.set({
                nameSavedPopup: nameInput.value,
                channelSavedPopup: channelInput.value,
                nickAbbreviationSavedPopup: nickAbbreviationInput.value,
            });

            chrome.tabs.query(
                { active: true, currentWindow: true },
                async (tabs) => {
                    await chrome.tabs.sendMessage(tabs[0].id, {
                        startButtonClicked: {
                            channelSavedPopup: channelInput.value,
                            nameSavedPopup: nameInput.value,
                            nickAbbreviationSavedPopup:
                                nickAbbreviationInput.value ?? undefined,
                        },
                    });
                },
            );
        };

        startButton.addEventListener('click', buttonClickEvent);

        resolve();
    });
}
