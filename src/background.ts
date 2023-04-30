const notificationCooldown = 20 * 1000; // 20 seconds

chrome.runtime.onConnect.addListener((port) => {
    if (port.name === 'content-script') {
        port.onMessage.addListener(async (message) => {
            const { sendNotification, mentionedInChannel, mentionedBy, badge } =
                message;

            const { lastNotification } = await chrome.storage.local.get(
                'lastNotification',
            );

            const nextNotification = lastNotification
                ? lastNotification + notificationCooldown
                : 0;

            const currentTime = Date.now();

            if (sendNotification) {
                if (currentTime > nextNotification) {
                    chrome.notifications.create({
                        type: 'basic',
                        iconUrl: 'icons/mentioned-icon_16.png',
                        title: 'Twitch Mention Notifier',
                        message: `You were mentioned by ${badge}${mentionedBy} in channel "${mentionedInChannel}" !`,
                    });

                    await chrome.storage.local.set({
                        lastNotification: Date.now(),
                    });
                }
            }
        });
    }
});
