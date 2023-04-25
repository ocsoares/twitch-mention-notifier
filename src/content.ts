/* eslint-disable @typescript-eslint/naming-convention */
import { Client, ChatUserstate } from 'tmi.js';

console.log('Twitch Mention Notifier is enabled');

async function main() {
    let nameInput: string;

    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        console.log('request:', request);

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
                console.log(`${tags.username}: ${message}`);

                const nameInputRegex = new RegExp(`\\b${nameInput}\\b`);
                const wasMentioned = nameInputRegex.test(message);

                if (wasMentioned) {
                    console.log('MARCADO !');

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
