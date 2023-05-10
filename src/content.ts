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
let extensionActivationInProgress = false; // Prevent the main() function from stay activated if disable the extension quickly
let isConnectedChannel = false; // Prevent the extension from try to leave a channel after it was already left
let tmiClient: Client;

chrome.runtime.onMessage.addListener(async (request) => {
    const { startButtonClicked, isExtensionEnabledPopup } = request;

    if (isExtensionEnabledPopup === true) {
        await getSavedPopupData();

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

        if (nameSavedPopup && nameInput && channelSavedPopup && channelInput) {
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
            await tmiClient.join(channelInput);
        }

        return;
    }
});

async function getSavedPopupData() {
    const { nameSavedPopup, channelSavedPopup, nickAbbreviationSavedPopup } =
        await chrome.storage.local.get([
            'nameSavedPopup',
            'channelSavedPopup',
            'nickAbbreviationSavedPopup',
        ]);

    nameInput = nameSavedPopup;
    channelInput = channelSavedPopup;
    nickAbbreviationInput = nickAbbreviationSavedPopup;

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

chrome.storage.local.get('isExtensionEnabledPopup', async (request) => {
    const { isExtensionEnabledPopup } = request;

    if (isExtensionEnabledPopup === true) {
        await getSavedPopupData();
        await main();
        extensionEnabled = true;
    }
});
