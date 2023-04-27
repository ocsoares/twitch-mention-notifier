/* eslint-disable @typescript-eslint/naming-convention */

import { Client, ChatUserstate } from 'tmi.js';

console.log('Twitch Mention Notifier is enabled');

chrome.storage.local.get((result) => {
    console.log('STORAGE LOCAL:', result);
});

async function main() {
    let nameInput: string;
    let channelInput: string;
    let nickAbbreviationInput: string;

    await new Promise((resolve) =>
        chrome.storage.local.get((result) => {
            const { name, channel, nickAbbreviation } = result;

            nameInput = name;
            channelInput = channel;
            nickAbbreviationInput = nickAbbreviation;

            resolve([name, channel, nickAbbreviation]);
        }),
    );

    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        const { name, channel, nickAbbreviation } = request;

        nameInput = name;
        channelInput = channel;
        nickAbbreviationInput = nickAbbreviation;
    });
    // Separate by comma, remove spaces and empty strings
    const nickAbbreviationInputArray = nickAbbreviationInput
        .split(',')
        .map((str) => str.replace(/\s+/g, '').trim())
        .filter((str) => str !== '');

    const tmiClient = new Client({ channels: [channelInput] });

    await tmiClient.connect();

    tmiClient.on(
        'message',
        async (
            channel: string,
            tags: ChatUserstate,
            message: string,
            self: boolean,
        ) => {
            if (nameInput) {
                const toBackgroundScript = chrome.runtime.connect({
                    name: 'content-script',
                });

                function postMessageToBackgroundScript() {
                    toBackgroundScript.postMessage({
                        sendNotification: true,
                        mentionedBy: tags.username,
                    });
                }

                const nameInputRegex = new RegExp(`\\b${nameInput}\\b`);
                const wasMentioned = nameInputRegex.test(message);

                if (wasMentioned) {
                    postMessageToBackgroundScript();

                    return;
                }
            }
        },
    );
}

main();
