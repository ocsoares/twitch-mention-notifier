/* eslint-disable @typescript-eslint/naming-convention */

import { Client, ChatUserstate } from 'tmi.js';
import { createNickAbbreviationInputArray } from './utils/create-nick-abbreviation-input-array.util';

console.log('Twitch Mention Notifier is enabled');

let nameInput: string;
let channelInput: string;
let nickAbbreviationInput: string;
let nickAbbreviationInputArray: string[] = [];
let tmiConnected: [string, number] | undefined = undefined;
let extensionEnabled = false;
let extensionActivationInProgress = false;
let isConnectedChannel = false; // Prevent the extension from try to leave a channel after it was already left
let tmiClient: Client;

chrome.runtime.onMessage.addListener(async (request) => {
    const { startButtonClicked, isExtensionEnabledEvent } = request;

    if (isExtensionEnabledEvent === true) {
        await startFunction();

        if (!tmiClient) {
            extensionActivationInProgress = true;
            await main();
            extensionActivationInProgress = false;
        }

        extensionEnabled = true;

        return;
    }

    if (isExtensionEnabledEvent === false) {
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
        const { name, channel, nickAbbreviation } = startButtonClicked;

        // Fazer um pro nickAbbreviation tb !!!!!
        if (name && nameInput && channel && channelInput) {
            if (channel === channelInput && name === nameInput) {
                // TALVEZ Mandar uma mensagem para fazer um alert() no popup.ts...
                console.log('MESMO CANAL');

                return;
            }
        }

        if (tmiConnected && channelInput && !isConnectedChannel) {
            console.log('TROCANDO DE CANAL...');
            isConnectedChannel = true;
            await tmiClient.part(channelInput);
            await new Promise((resolve) => setTimeout(resolve, 500));
            isConnectedChannel = false;
        }

        nameInput = name;
        channelInput = channel;
        nickAbbreviationInput = nickAbbreviation;

        if (nickAbbreviationInput) {
            nickAbbreviationInputArray = createNickAbbreviationInputArray(
                nickAbbreviationInput,
            );
        }

        if (tmiConnected) {
            await tmiClient.join(channelInput);
        }

        return;
    }
});

// MUDAR o nome disso para seilá, recuperar os dados do storage (EM INGLÊS) algo assim...
async function startFunction() {
    const { name, channel, nickAbbreviation } = await chrome.storage.local.get([
        'name',
        'channel',
        'nickAbbreviation',
    ]);

    nameInput = name;
    channelInput = channel;
    nickAbbreviationInput = nickAbbreviation;

    // Separate by comma in an array, remove spaces and empty strings
    if (nickAbbreviationInput) {
        nickAbbreviationInputArray = createNickAbbreviationInputArray(
            nickAbbreviationInput,
        );
    }
}

async function main() {
    tmiClient = new Client({ channels: [channelInput] });

    tmiConnected = await tmiClient.connect();

    tmiClient.on(
        'message',
        async (
            channel: string,
            tags: ChatUserstate,
            message: string,
            self: boolean,
        ) => {
            if (!extensionEnabled) {
                return;
            }

            if (nameInput) {
                let badge = '';

                if (tags.badges && tags.badges.broadcaster) {
                    badge = '[BROADCASTER]';
                }

                if (tags.badges && tags.badges.vip) {
                    badge = '[VIP]';
                }

                if (tags.badges && tags.badges.moderator) {
                    badge = '[MODERATOR]';
                }

                if (tags.badges && tags.badges.vip && tags.badges.moderator) {
                    badge = '[VIP/MODERATOR]';
                }

                const toBackgroundScript = chrome.runtime.connect({
                    name: 'content-script',
                });

                function postMessageToBackgroundScript() {
                    toBackgroundScript.postMessage({
                        sendNotification: true,
                        mentionedInChannel: channel.replace('#', ''),
                        mentionedBy: tags.username,
                        badge,
                    });
                }

                const nameInputRegex = new RegExp(`\\b${nameInput}\\b`, 'i');
                const wasMentioned = nameInputRegex.test(message);

                if (wasMentioned) {
                    postMessageToBackgroundScript();

                    return;
                }

                const nickAbbreviationInputRegex = new RegExp(
                    `\\b(${nickAbbreviationInputArray.join('|')})\\b`,
                    'i',
                );

                const wasMentionedAbbreviated =
                    nickAbbreviationInputRegex.test(message);

                if (nickAbbreviationInputArray.length) {
                    if (wasMentionedAbbreviated) {
                        postMessageToBackgroundScript();
                    }
                }
            }
        },
    );
}

chrome.storage.local.get('isExtensionEnabledEvent', async (request) => {
    const { isExtensionEnabledEvent } = request;

    if (isExtensionEnabledEvent === true) {
        await startFunction();
        await main();
        extensionEnabled = true;
    }
});
