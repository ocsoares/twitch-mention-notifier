const notificationCooldown = 20 * 1000; // 20 seconds

chrome.runtime.onConnect.addListener((port) => {
    if (port.name === 'content-script') {
        port.onMessage.addListener(async (message) => {
            const { sendNotification, mentionedBy } = message;

            const { lastNotification } = await chrome.storage.local.get(
                'lastNotification',
            );

            const nextNotification = lastNotification + notificationCooldown;

            const currentTime = Date.now();

            if (sendNotification) {
                if (currentTime > nextNotification) {
                    chrome.notifications.create({
                        type: 'basic',
                        iconUrl: 'icons/mentioned-icon_16.png',
                        title: 'Twitch Mention Notifier',
                        message: `Você foi marcado por ${mentionedBy}`,
                    });

                    chrome.storage.local.set({ lastNotification: Date.now() });
                }
            }
        });
    }
});
