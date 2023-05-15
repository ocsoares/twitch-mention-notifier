/* eslint-disable @typescript-eslint/naming-convention */

import { Client, ChatUserstate } from 'tmi.js';
import { createNickAbbreviationInputArray } from './utils/create-nick-abbreviation-input-array.util';
import { ISavedPopupInputs } from './interfaces/ISavedPopupInputs';
import { IExtensionStates } from './interfaces/IExtensionStates';
import { INotificationData } from './interfaces/INotificationData';

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
        function allowNotificationToBackgroundScript(
            channel: string,
            tags: ChatUserstate,
            message: string,
            badge: string,
        ): void {
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

    private static async preventConnectWithSameInputs(
        nameSavedPopup: string,
        channelSavedPopup: string,
        nickAbbreviationSavedPopup: string,
    ): Promise<void> {
        if (
            nameSavedPopup &&
            TwitchMentionNotifier.nameInput &&
            channelSavedPopup &&
            TwitchMentionNotifier.channelInput &&
            nickAbbreviationSavedPopup &&
            TwitchMentionNotifier.nickAbbreviationInput
        ) {
            if (
                channelSavedPopup === TwitchMentionNotifier.channelInput &&
                nameSavedPopup === TwitchMentionNotifier.nameInput &&
                nickAbbreviationSavedPopup ===
                    TwitchMentionNotifier.nickAbbreviationInput
            ) {
                await chrome.runtime.sendMessage({
                    sameData: true,
                });

                return;
            }
        }

        if (
            nameSavedPopup &&
            TwitchMentionNotifier.nameInput &&
            channelSavedPopup &&
            TwitchMentionNotifier.channelInput
        ) {
            if (
                channelSavedPopup === TwitchMentionNotifier.channelInput &&
                nameSavedPopup === TwitchMentionNotifier.nameInput &&
                !nickAbbreviationSavedPopup &&
                !TwitchMentionNotifier.nickAbbreviationInput
            ) {
                await chrome.runtime.sendMessage({
                    sameData: true,
                });

                return;
            }

            if (
                nickAbbreviationSavedPopup &&
                TwitchMentionNotifier.nickAbbreviationInput
            ) {
                if (
                    nickAbbreviationSavedPopup ===
                        TwitchMentionNotifier.nickAbbreviationInput &&
                    nameSavedPopup === TwitchMentionNotifier.nameInput &&
                    channelSavedPopup === TwitchMentionNotifier.channelInput
                ) {
                    await chrome.runtime.sendMessage({
                        sameData: true,
                    });

                    return;
                }
            }
        }
    }

    private static async changeChannelListener(): Promise<void> {
        chrome.runtime.onMessage.addListener(
            async (request: IExtensionStates): Promise<void> => {
                const { startButtonClicked } = request;

                if (
                    startButtonClicked &&
                    TwitchMentionNotifier.extensionEnabled
                ) {
                    const {
                        nameSavedPopup,
                        channelSavedPopup,
                        nickAbbreviationSavedPopup,
                    } = startButtonClicked;

                    await TwitchMentionNotifier.preventConnectWithSameInputs(
                        nameSavedPopup,
                        channelSavedPopup,
                        nickAbbreviationSavedPopup,
                    );

                    // Leave all channels
                    if (
                        TwitchMentionNotifier.tmiConnected &&
                        TwitchMentionNotifier.channelInput &&
                        !TwitchMentionNotifier.isConnectedChannel
                    ) {
                        TwitchMentionNotifier.isConnectedChannel = true;

                        const channels =
                            TwitchMentionNotifier.tmiClient.getChannels();

                        for (const channel of channels) {
                            TwitchMentionNotifier.tmiClient.part(channel);
                            await new Promise((resolve) =>
                                setTimeout(resolve, 1000),
                            );
                        }

                        TwitchMentionNotifier.isConnectedChannel = false;
                    }

                    TwitchMentionNotifier.nameInput = nameSavedPopup;
                    TwitchMentionNotifier.channelInput = channelSavedPopup;
                    TwitchMentionNotifier.nickAbbreviationInput =
                        nickAbbreviationSavedPopup;

                    if (TwitchMentionNotifier.nickAbbreviationInput) {
                        TwitchMentionNotifier.nickAbbreviationInputArray =
                            createNickAbbreviationInputArray(
                                TwitchMentionNotifier.nickAbbreviationInput,
                            );
                    } else {
                        TwitchMentionNotifier.nickAbbreviationInputArray = [];
                    }

                    // Join channel
                    if (TwitchMentionNotifier.tmiConnected) {
                        await TwitchMentionNotifier.tmiClient.join(
                            TwitchMentionNotifier.channelInput,
                        );
                    }

                    return;
                }
            },
        );
    }

    public static async start(): Promise<void> {
        await TwitchMentionNotifier.enableExtensionIfLoadEnabled();
        await TwitchMentionNotifier.extensionStateListener();
        await TwitchMentionNotifier.changeChannelListener();
    }
}

TwitchMentionNotifier.start();
