/* eslint-disable @typescript-eslint/naming-convention */

import { IExtensionStates } from './interfaces/IExtensionStates';
import { INotificationData } from './interfaces/INotificationData';

class Background {
    private static notificationCooldown = 20 * 1000; // 20 seconds
    private static lastActiveTabIdArray: number[];

    private static async preventSendNotificationsToDifferentTabsAtTheSameTime(
        port: chrome.runtime.Port,
    ): Promise<void> {
        // To prevent the extension from sending notifications to different tabs at the same time
        await chrome.storage.local.set({
            lastActiveTabId: port.sender.tab.id,
        });

        const { lastActiveTabId } = (await chrome.storage.local.get(
            'lastActiveTabId',
        )) as IExtensionStates;

        // Convert the lastActiveTabId to an array to get all tabs at the same time
        // The lastActiveTabId will always be the same, but with multiple tabs open at the same time,
        // each tab will send an ID, so these IDs will be added to this array
        Background.lastActiveTabIdArray.push(lastActiveTabId);
    }

    private static createNotificationTab(mentionedInChannel: string) {
        chrome.tabs.create({
            url: `https://www.twitch.tv/${mentionedInChannel}`,
        });
    }

    private static async notificationOnClickedListener(
        notificationId: string,
        mentionedInChannel: string,
    ): Promise<void> {
        chrome.notifications.onClicked.addListener((clickedNotificationId) => {
            if (clickedNotificationId === notificationId) {
                Background.createNotificationTab(mentionedInChannel);
            }
        });
    }

    private static async notificationOnButtonClickedListener(
        notificationId: string,
        mentionedInChannel: string,
    ): Promise<void> {
        chrome.notifications.onButtonClicked.addListener(
            (clickedNotificationId, buttonIndex) => {
                if (
                    clickedNotificationId === notificationId &&
                    buttonIndex === 0
                ) {
                    Background.createNotificationTab(mentionedInChannel);
                }
            },
        );
    }

    private static async createNotifications(
        badge: string,
        mentionedBy: string,
        mentionerMessage: string,
        mentionedInChannel: string,
    ): Promise<void> {
        const notificationTime = new Date()
            .toLocaleTimeString()
            .substring(0, 5); // HH:MM

        chrome.notifications.create(
            {
                type: 'basic',
                iconUrl: 'icons/twitch-icon_48.png',
                title: 'Twitch Mention Notifier',
                message: `[${notificationTime}] You were mentioned in channel ${mentionedInChannel} by ${badge}${mentionedBy}: "${mentionerMessage}"`,
                requireInteraction: true,
                buttons: [
                    {
                        title: 'Open Twitch Channel',
                    },
                ],
            },
            async (notificationId) => {
                // Open the mentioned Twitch channel when click on the notification window
                await Background.notificationOnClickedListener(
                    notificationId,
                    mentionedInChannel,
                );

                // Open the mentioned Twitch channel when click on the notification button
                await Background.notificationOnButtonClickedListener(
                    notificationId,
                    mentionedInChannel,
                );
            },
        );
    }

    private static async init(): Promise<void> {
        chrome.runtime.onConnect.addListener((port) => {
            if (port.name === 'content-script') {
                port.onMessage.addListener(
                    async (message: INotificationData) => {
                        const {
                            sendNotification,
                            mentionedInChannel,
                            mentionedBy,
                            mentionerMessage,
                            badge,
                        } = message;

                        Background.lastActiveTabIdArray = [];

                        await Background.preventSendNotificationsToDifferentTabsAtTheSameTime(
                            port,
                        );

                        const { lastNotification } =
                            (await chrome.storage.local.get(
                                'lastNotification',
                            )) as IExtensionStates;

                        const nextNotification = lastNotification
                            ? lastNotification + Background.notificationCooldown
                            : 0;

                        const currentTime = Date.now();

                        if (
                            sendNotification &&
                            Background.lastActiveTabIdArray[0] === // [0] will always be lastActiveTabId !
                                port.sender.tab.id
                        ) {
                            // Cooldown
                            if (currentTime > nextNotification) {
                                try {
                                    await Background.createNotifications(
                                        badge,
                                        mentionedBy,
                                        mentionerMessage,
                                        mentionedInChannel,
                                    );

                                    await chrome.storage.local.set({
                                        lastNotification: Date.now(),
                                    });

                                    Background.lastActiveTabIdArray = [];
                                } catch (error) {
                                    console.log('NOTIFICATION NOT SENT', error);
                                }
                            }
                        }
                    },
                );
            }
        });
    }

    public static async start(): Promise<void> {
        await Background.init();
    }
}

Background.start();
