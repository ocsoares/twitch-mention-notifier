import { checkIfChannelExists } from './services/check-if-channel-exists.service';

const channelInput = document.getElementById('channel') as HTMLInputElement;
const nameInput = document.getElementById('name') as HTMLInputElement;
const nickAbbreviationInput = document.getElementById(
    'nick-abbreviation',
) as HTMLInputElement;
const button = document.getElementById('button');
const toggleButton = document.getElementById('toggle') as HTMLInputElement;
let buttonClickEvent: () => Promise<void>;

async function extensionEnabledOrNot() {
    const { isExtensionEnabled } = await chrome.storage.local.get(
        'isExtensionEnabled',
    );

    if (isExtensionEnabled) {
        toggleButton.checked = true;
        await main();
    }

    toggleButton.addEventListener('change', async () => {
        const isExtensionEnabled = toggleButton.checked;

        if (isExtensionEnabled) {
            await main();

            await chrome.storage.local.set({
                isExtensionEnabled: true,
            });
        } else {
            nameInput.value = '';
            channelInput.value = '';
            nickAbbreviationInput.value = '';

            await chrome.storage.local.set({
                isExtensionEnabled: false,
            });

            button.removeEventListener('click', buttonClickEvent);
        }

        chrome.tabs.query(
            { active: true, currentWindow: true },
            async (tabs) => {
                await chrome.tabs.sendMessage(tabs[0].id, {
                    isExtensionEnabled,
                });
            },
        );
    });
}

extensionEnabledOrNot();

async function main() {
    const { name, channel, nickAbbreviation } = await chrome.storage.local.get([
        'name',
        'channel',
        'nickAbbreviation',
    ]);

    nameInput.value = '';
    channelInput.value = '';
    nickAbbreviationInput.value = '';

    if (name && channel) {
        nameInput.value = name;
        channelInput.value = channel;

        if (nickAbbreviation) {
            nickAbbreviationInput.value = nickAbbreviation;
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

            if (nameInput.value.length < 4 || nameInput.value.length > 25) {
                alert('The name needs to have between 4 and 25 characters');

                return;
            }

            const isValidChannel = await checkIfChannelExists(
                channelInput.value,
            );

            if (!isValidChannel) {
                alert('The channel does not exist !');

                return;
            }

            alert('Extension activated successfully !');

            await chrome.storage.local.set({
                name: nameInput.value,
                channel: channelInput.value,
                nickAbbreviation: nickAbbreviationInput.value,
            });

            chrome.tabs.query(
                { active: true, currentWindow: true },
                async (tabs) => {
                    await chrome.tabs.sendMessage(tabs[0].id, {
                        channel: channelInput.value,
                        name: nameInput.value,
                        nickAbbreviation:
                            nickAbbreviationInput.value ?? undefined,
                    });
                },
            );
        };

        button.addEventListener('click', buttonClickEvent);

        resolve();
    });
}
