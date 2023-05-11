/* eslint-disable prefer-destructuring */
/* eslint-disable @typescript-eslint/naming-convention */

import { Client, ChatUserstate } from 'tmi.js';
import { enableOrDisableExtensionAndChangeChannelEvent } from './events/enable-or-disable-extension-and-change-channel.event';
import { createNickAbbreviationInputArray } from './utils/create-nick-abbreviation-input-array.util';
import { getSavedPopupData } from './storage/get-saved-popup-data.storage';

console.log('Twitch Mention Notifier is enabled');

let nameInput: string;
let channelInput: string;
let nickAbbreviationInput: string;
let nickAbbreviationInputArray: string[];
let tmiConnected: [string, number] | undefined = undefined;
let extensionEnabled = false;
let extensionActivationInProgress: boolean; // Prevent the main() function from stay activated if disable the extension quickly
let isConnectedChannel: boolean; // Prevent the extension from try to leave a channel after it was already left
let tmiClient: Client;

console.log('extensionEnabled ANTES:', extensionEnabled);
enableOrDisableExtensionAndChangeChannelEvent(
    async () =>
        await getSavedPopupData(
            nameInput,
            channelInput,
            nickAbbreviationInput,
            nickAbbreviationInputArray,
        ),
    // async () => await getSavedPopupData(),
    tmiClient,
    extensionActivationInProgress,
    extensionEnabled,
    async () => await main(),
    nameInput,
    channelInput,
    nickAbbreviationInput,
    tmiConnected,
    isConnectedChannel,
    nickAbbreviationInputArray,
);
console.log('extensionEnabled DEPOIS:', extensionEnabled);

// async function getSavedPopupData() {
//     const { nameSavedPopup, channelSavedPopup, nickAbbreviationSavedPopup } =
//         await chrome.storage.local.get([
//             'nameSavedPopup',
//             'channelSavedPopup',
//             'nickAbbreviationSavedPopup',
//         ]);

//     console.log('nameInput ANTES DENTRO:', nameInput);
//     nameInput = nameSavedPopup;
//     console.log('nameInput DEPOIS DENTRO:', nameInput);

//     channelInput = channelSavedPopup;
//     nickAbbreviationInput = nickAbbreviationSavedPopup;

//     // Separate by comma in an array, remove spaces and empty strings
//     if (nickAbbreviationInput) {
//         nickAbbreviationInputArray = createNickAbbreviationInputArray(
//             nickAbbreviationInput,
//         );
//     }
// }

getSavedPopupData(
    nameInput,
    channelInput,
    nickAbbreviationInput,
    nickAbbreviationInputArray,
).then((result) => {
    channelInput = result.channelInput;
});

async function main() {
    console.log('channelInput NO MAIN:', channelInput);
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
            console.log('MENSAGEM:', message);
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
        await getSavedPopupData(
            nameInput,
            channelInput,
            nickAbbreviationInput,
            nickAbbreviationInputArray,
        );
        // await getSavedPopupData();
        await main();
        extensionEnabled = true;
    }
});
