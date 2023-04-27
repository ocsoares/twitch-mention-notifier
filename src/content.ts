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

    chrome.runtime.onMessage.addListener(
        async (request, sender, sendResponse) => {
            const { name, channel, nickAbbreviation } = request;

            if (channelInput && tmiConnected) {
                await tmiClient.part(channelInput);
            }

            nameInput = name;
            channelInput = channel;
            nickAbbreviationInput = nickAbbreviation;

            if (tmiConnected) {
                await tmiClient.join(channelInput);
            }
        },
    );

    // Separate by comma, remove spaces and empty strings
    if (nickAbbreviationInput) {
        nickAbbreviationInputArray = nickAbbreviationInput
            .split(',')
            .map((str) => str.replace(/\s+/g, '').trim())
            .filter((str) => str !== '');
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

                // TESTAR mais isso aqui, mas ACHO que deu certo JÁ...
                // Ver se o "some" lá embaixo tá pegando só A PRIMEIRA ocorrência mesmo...
                if (nickAbbreviationInputArray.length) {
                    const nickAbbreviationInputRegex = new RegExp(
                        `\\b(${nickAbbreviationInputArray.join('|')})\\b`,
                    );

                    const wasMentionedAbbreviated =
                        nickAbbreviationInputArray.some((word) =>
                            nickAbbreviationInputRegex.test(word),
                        );

                    if (wasMentionedAbbreviated) {
                        postMessageToBackgroundScript();
                    }
                }
            }
        },
    );
}

main();
