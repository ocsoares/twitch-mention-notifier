const notificationCooldown = 20 * 1000; // 20 seconds

chrome.runtime.onConnect.addListener((port) => {
    if (port.name === 'content-script') {
        port.onMessage.addListener(async (message) => {
            const { sendNotification, mentionedInChannel, mentionedBy, badge } =
                message;

            // To prevent the extension from sending notifications to different tabs at the same time
            await chrome.storage.local.set({
                lastActiveTabId: port.sender.tab.id,
            });

            const { lastActiveTabId } = await chrome.storage.local.get(
                'lastActiveTabId',
            );

            // Convert the lastActiveTabId to an array to get all tabs at the same time
            // The lastActiveTabId will always be the same, but with multiple tabs open at the same time,
            // each tab will send an ID, so these IDs will be added to this array
            let lastActiveTabIdArray: number[] = [];

            lastActiveTabIdArray.push(lastActiveTabId);

            const { lastNotification } = await chrome.storage.local.get(
                'lastNotification',
            );

            const nextNotification = lastNotification
                ? lastNotification + notificationCooldown
                : 0;

            const currentTime = Date.now();

            if (
                sendNotification &&
                lastActiveTabIdArray[0] === port.sender.tab.id // [0] will always be lastActiveTabId !
            ) {
                if (currentTime > nextNotification) {
                    try {
                        chrome.notifications.create(
                            {
                                type: 'basic',
                                iconUrl: 'icons/mentioned-icon_16.png',
                                title: 'Twitch Mention Notifier',
                                message: `You were mentioned by ${badge}${mentionedBy} in channel "${mentionedInChannel}" !`,
                                buttons: [
                                    {
                                        title: 'Open Twitch Channel',
                                    },
                                ],
                            },
                            (notificationId) => {
                                // Open the mentioned Twitch channel when click on the notification window
                                chrome.notifications.onClicked.addListener(
                                    (clickedNotificationId) => {
                                        if (
                                            clickedNotificationId ===
                                            notificationId
                                        ) {
                                            chrome.tabs.create({
                                                url: `https://www.twitch.tv/${mentionedInChannel}`,
                                            });
                                        }
                                    },
                                );

                                // Open the mentioned Twitch channel when click on the notification button
                                chrome.notifications.onButtonClicked.addListener(
                                    (clickedNotificationId, buttonIndex) => {
                                        if (
                                            clickedNotificationId ===
                                                notificationId &&
                                            buttonIndex === 0
                                        ) {
                                            chrome.tabs.create({
                                                url: `https://www.twitch.tv/${mentionedInChannel}`,
                                            });
                                        }
                                    },
                                );
                            },
                        );

                        await chrome.storage.local.set({
                            lastNotification: Date.now(),
                        });

                        lastActiveTabIdArray = [];
                    } catch (error) {
                        console.log('NOTIFICATION NOT SENT', error);
                    }
                }
            }
        });
    }
});
