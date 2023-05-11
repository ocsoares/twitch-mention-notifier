/* eslint-disable @typescript-eslint/naming-convention */

import { Client, ChatUserstate } from 'tmi.js';
import { createNickAbbreviationInputArray } from './utils/create-nick-abbreviation-input-array.util';
import { enableOrDisableExtensionAndChangeChannelEvent } from './events/enable-or-disable-extension-and-change-channel.event';

console.log('Twitch Mention Notifier is enabled');

let nameInput: string;
let channelInput: string;
let nickAbbreviationInput: string;
let nickAbbreviationInputArray: string[] = [];
let tmiConnected: [string, number] | undefined = undefined;
let extensionEnabled = false;
const extensionActivationInProgress = false; // Prevent the main() function from stay activated if disable the extension quickly
const isConnectedChannel = false; // Prevent the extension from try to leave a channel after it was already left
let tmiClient: Client;

enableOrDisableExtensionAndChangeChannelEvent(
    () => getSavedPopupData(),
    tmiClient,
    extensionActivationInProgress,
    extensionEnabled,
    () => main(),
    nameInput,
    channelInput,
    nickAbbreviationInput,
    tmiConnected,
    isConnectedChannel,
    nickAbbreviationInputArray,
);

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
