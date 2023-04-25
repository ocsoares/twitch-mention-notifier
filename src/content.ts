/* eslint-disable @typescript-eslint/naming-convention */

import { Client, ChatUserstate } from 'tmi.js';

console.log('Twitch Mention Notifier is enabled');

chrome.storage.local.get((result) => {
    console.log('STORAGE LOCAL:', result);
});

async function main() {
    let nameInput: string;

    chrome.storage.local.get('name', (result) => {
        nameInput = result.name;
    });

    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        const { name } = request;

        nameInput = name;
    });

    const tmiClient = new Client({ channels: ['ccbdu'] });

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
                const nameInputRegex = new RegExp(`\\b${nameInput}\\b`);
                const wasMentioned = nameInputRegex.test(message);

                if (wasMentioned) {
                    const toBackgroundScript = chrome.runtime.connect({
                        name: 'content-script',
                    });

                    toBackgroundScript.postMessage({
                        sendNotification: true,
                        mentionedBy: tags.username,
                    });
                }
            }
        },
    );
}

main();
