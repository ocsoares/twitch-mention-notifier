/* eslint-disable @typescript-eslint/naming-convention */

import { Client, ChatUserstate } from 'tmi.js';
import { createNickAbbreviationInputArray } from './utils/create-nick-abbreviation-input-array.util';
import { ISavedPopupInputs } from './interfaces/ISavedPopupInputs';
import { IExtensionStates } from './interfaces/IExtensionStates';
import { INotificationData } from './interfaces/INotificationData';
import { IChangeSavedPopupInputsListener } from './interfaces/IChangeSavedPopupInputsListener';

console.log('Twitch Mention Notifier is enabled');

export class TwitchMentionNotifier {
    private static nameInput: string;
    private static channelInput: string;
    private static nickAbbreviationInput: string;
    private static nickAbbreviationInputArray: string[] = [];
    private static tmiConnected: [string, number] | undefined = undefined;
    private static extensionEnabled = false;
    private static extensionActivationInProgress = false; // Prevent the init() method from stay activated if disable the extension quickly
    private static isConnectedChannel = false; // Prevent the extension from try to leave a channel after it was already left
    private static tmiClient: Client;

    private static async connectTmiClient(): Promise<void> {
        TwitchMentionNotifier.tmiClient = new Client({
            channels: [TwitchMentionNotifier.channelInput],
        });
        TwitchMentionNotifier.tmiConnected =
            await TwitchMentionNotifier.tmiClient.connect();
    }

    private static async tmiNotificationListener(): Promise<void> {
        async function allowNotificationToBackgroundScript(
            channel: string,
            tags: ChatUserstate,
            message: string,
            badge: string,
        ): Promise<void> {
            const { isExtensionEnabledPopup } = (await chrome.storage.local.get(
                'isExtensionEnabledPopup',
            )) as IExtensionStates;

            if (!isExtensionEnabledPopup) {
                return;
            }

            const toBackgroundScript = chrome.runtime.connect({
                name: 'content-script',
            });

            toBackgroundScript.postMessage(<INotificationData>{
                sendNotification: true,
                mentionedInChannel: channel.replace('#', ''),
                mentionedBy: tags.username,
                mentionerMessage: message,
                badge,
            });
        }

        TwitchMentionNotifier.tmiClient.on(
            'message',
            async (
                channel: string,
                tags: ChatUserstate,
                message: string,
                self: boolean,
            ): Promise<void> => {
                if (!TwitchMentionNotifier.extensionEnabled) {
                    return;
                }

                if (TwitchMentionNotifier.nameInput) {
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

                    if (
                        tags.badges &&
                        tags.badges.vip &&
                        tags.badges.moderator
                    ) {
                        badge = '[VIP/MODERATOR]';
                    }

                    const nameInputRegex = new RegExp(
                        `\\b${TwitchMentionNotifier.nameInput}\\b`,
                        'i',
                    );

                    const wasMentioned = nameInputRegex.test(message);

                    if (wasMentioned) {
                        allowNotificationToBackgroundScript(
                            channel,
                            tags,
                            message,
                            badge,
                        );

                        return;
                    }

                    const nickAbbreviationInputRegex = new RegExp(
                        `\\b(${TwitchMentionNotifier.nickAbbreviationInputArray.join(
                            '|',
                        )})\\b`,
                        'i',
                    );

                    const wasMentionedAbbreviated =
                        nickAbbreviationInputRegex.test(message);

                    if (
                        TwitchMentionNotifier.nickAbbreviationInputArray.length
                    ) {
                        if (wasMentionedAbbreviated) {
                            allowNotificationToBackgroundScript(
                                channel,
                                tags,
                                message,
                                badge,
                            );
                        }
                    }
                }
            },
        );
    }

    private static async init(): Promise<void> {
        await TwitchMentionNotifier.connectTmiClient();
        await TwitchMentionNotifier.tmiNotificationListener();
    }

    private static async getSavedPopupInputsLocalStorage(): Promise<void> {
        const {
            nameSavedPopup,
            channelSavedPopup,
            nickAbbreviationSavedPopup,
        } = (await chrome.storage.local.get([
            'nameSavedPopup',
            'channelSavedPopup',
            'nickAbbreviationSavedPopup',
        ])) as ISavedPopupInputs;

        TwitchMentionNotifier.nameInput = nameSavedPopup;
        TwitchMentionNotifier.channelInput = channelSavedPopup;
        TwitchMentionNotifier.nickAbbreviationInput =
            nickAbbreviationSavedPopup;

        // Separate by comma in an array, remove spaces and empty strings
        if (TwitchMentionNotifier.nickAbbreviationInput) {
            TwitchMentionNotifier.nickAbbreviationInputArray =
                createNickAbbreviationInputArray(
                    TwitchMentionNotifier.nickAbbreviationInput,
                );
        }
    }

    private static async enableExtensionIfLoadEnabled(): Promise<void> {
        chrome.storage.local.get(
            'isExtensionEnabledPopup',
            async (request: IExtensionStates): Promise<void> => {
                const { isExtensionEnabledPopup } = request;

                if (
                    isExtensionEnabledPopup === true &&
                    !TwitchMentionNotifier.tmiConnected
                ) {
                    await TwitchMentionNotifier.getSavedPopupInputsLocalStorage();
                    if (TwitchMentionNotifier.channelInput) {
                        await TwitchMentionNotifier.init();
                        TwitchMentionNotifier.extensionEnabled = true;
                    }
                }
            },
        );
    }

    private static async extensionStateListener(): Promise<void> {
        chrome.runtime.onMessage.addListener(
            async (request: IExtensionStates): Promise<void> => {
                const { isExtensionEnabledPopup } = request;

                if (isExtensionEnabledPopup === true) {
                    await TwitchMentionNotifier.getSavedPopupInputsLocalStorage();

                    if (!TwitchMentionNotifier.tmiClient) {
                        TwitchMentionNotifier.extensionActivationInProgress =
                            true;
                        await TwitchMentionNotifier.init();
                        TwitchMentionNotifier.extensionActivationInProgress =
                            false;
                    }

                    TwitchMentionNotifier.extensionEnabled = true;

                    return;
                }

                if (isExtensionEnabledPopup === false) {
                    if (TwitchMentionNotifier.extensionActivationInProgress) {
                        await new Promise<void>((resolve) =>
                            setTimeout(() => {
                                TwitchMentionNotifier.extensionEnabled = false;
                                resolve();
                            }, 2000),
                        );
                    }

                    TwitchMentionNotifier.extensionEnabled = false;

                    return;
                }
            },
        );
    }

    private static async setInputToStorage(): Promise<void> {
        await chrome.storage.local.set({
            nameInputSavedLocalStorage: TwitchMentionNotifier.nameInput,

            channelInputSavedLocalStorage: TwitchMentionNotifier.channelInput,

            nickAbbreviationInputSavedLocalStorage:
                TwitchMentionNotifier.nickAbbreviationInputArray,
        });
    }

    private static async leaveAllChannels(): Promise<void> {
        if (
            TwitchMentionNotifier.tmiConnected &&
            TwitchMentionNotifier.channelInput &&
            !TwitchMentionNotifier.isConnectedChannel
        ) {
            TwitchMentionNotifier.isConnectedChannel = true;

            const channels = TwitchMentionNotifier.tmiClient.getChannels();

            for (const channel of channels) {
                TwitchMentionNotifier.tmiClient.part(channel);
                await new Promise((resolve) => setTimeout(resolve, 1000));
            }

            TwitchMentionNotifier.isConnectedChannel = false;
        }
    }

    private static async joinChannel(): Promise<void> {
        if (TwitchMentionNotifier.tmiConnected) {
            await TwitchMentionNotifier.tmiClient.join(
                TwitchMentionNotifier.channelInput,
            );
        }
    }

    private static async savePopupInputsToLocalStorageWhenClickButtonListener(): Promise<void> {
        chrome.runtime.onMessage.addListener(
            async (request: IExtensionStates): Promise<void> => {
                const { startButtonClicked } = request;

                if (
                    startButtonClicked &&
                    TwitchMentionNotifier.extensionEnabled
                ) {
                    await TwitchMentionNotifier.setInputToStorage();

                    return;
                }
            },
        );
    }

    // To prevent other connected browser tabs from not changing the inputs
    private static async changeSavedPopupInputsLocalStorageListener(): Promise<void> {
        chrome.storage.local.onChanged.addListener(
            async (changes): Promise<void> => {
                const {
                    nameSavedPopup,
                    channelSavedPopup,
                    nickAbbreviationSavedPopup,
                } = changes as unknown as IChangeSavedPopupInputsListener;

                if (nameSavedPopup) {
                    TwitchMentionNotifier.nameInput = nameSavedPopup.newValue;
                }

                // If the channel is changed, leave all channels and join the new one
                if (channelSavedPopup) {
                    await TwitchMentionNotifier.leaveAllChannels();

                    TwitchMentionNotifier.channelInput =
                        channelSavedPopup.newValue;

                    await TwitchMentionNotifier.joinChannel();

                    await TwitchMentionNotifier.setInputToStorage();
                }

                if (nickAbbreviationSavedPopup) {
                    TwitchMentionNotifier.nickAbbreviationInput =
                        nickAbbreviationSavedPopup.newValue;

                    TwitchMentionNotifier.nickAbbreviationInputArray =
                        createNickAbbreviationInputArray(
                            nickAbbreviationSavedPopup.newValue,
                        );
                }
            },
        );
    }

    public static async start(): Promise<void> {
        await TwitchMentionNotifier.enableExtensionIfLoadEnabled();
        await TwitchMentionNotifier.extensionStateListener();
        await TwitchMentionNotifier.savePopupInputsToLocalStorageWhenClickButtonListener();
        await TwitchMentionNotifier.changeSavedPopupInputsLocalStorageListener();
    }
}

TwitchMentionNotifier.start();
