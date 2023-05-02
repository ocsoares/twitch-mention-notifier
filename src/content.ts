/* eslint-disable @typescript-eslint/naming-convention */

import { Client, ChatUserstate } from 'tmi.js';
import { createNickAbbreviationInputArray } from './utils/create-nick-abbreviation-input-array.util';

console.log('Twitch Mention Notifier is enabled');

chrome.storage.local.get((result) => {
    console.log('STORAGE LOCAL:', result);
});

async function main() {
    let nameInput: string;
    let channelInput: string;
    let nickAbbreviationInput: string;
    let nickAbbreviationInputArray: string[] = [];
    let tmiConnected: [string, number] | undefined = undefined;

    await new Promise((resolve) =>
        chrome.storage.local.get((result) => {
            const { name, channel, nickAbbreviation } = result;

            nameInput = name;
            channelInput = channel;
            nickAbbreviationInput = nickAbbreviation;

            resolve([name, channel, nickAbbreviation]);
        }),
    );

    const tmiClient = new Client({ channels: [channelInput] });

    chrome.runtime.onMessage.addListener(async (request) => {
        const { name, channel, nickAbbreviation } = request;

        if (tmiConnected && channelInput) {
            await tmiClient.part(channelInput);
        }

        nameInput = name;
        channelInput = channel;

        nickAbbreviationInput = nickAbbreviation;
        nickAbbreviationInputArray = createNickAbbreviationInputArray(
            nickAbbreviationInput,
        );

        if (tmiConnected) {
            await tmiClient.join(channelInput);
        }
    });

    // Separate by comma in an array, remove spaces and empty strings
    if (nickAbbreviationInput) {
        nickAbbreviationInputArray = createNickAbbreviationInputArray(
            nickAbbreviationInput,
        );
    }

    tmiConnected = await tmiClient.connect();

    tmiClient.on(
        'message',
        async (
            channel: string,
            tags: ChatUserstate,
            message: string,
            self: boolean,
        ) => {
            if (nameInput) {
                let badge = '';

                if (tags.badges.broadcaster) {
                    badge = '[BROADCASTER]';
                }

                if (tags.badges.vip) {
                    badge = '[VIP]';
                }

                if (tags.badges.moderator) {
                    badge = '[MODERATOR]';
                }

                if (tags.badges.vip && tags.badges.moderator) {
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

main();
