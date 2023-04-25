chrome.runtime.onConnect.addListener((port) => {
    console.log('PORT:', port);

    if (port.name === 'content-script') {
        port.onMessage.addListener((message) => {
            console.log('MESSAGE do BACKGROUND', message);

            const { sendNotification, mentionedBy } = message;

            if (sendNotification) {
                chrome.notifications.create({
                    type: 'basic',
                    iconUrl: 'icons/mentioned-icon_16.png',
                    title: 'Twitch Mention Notifier',
                    message: `Você foi marcado por ${mentionedBy}`,
                });
            }
        });
    }
});
