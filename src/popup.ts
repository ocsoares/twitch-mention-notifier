const nameInput = document.getElementById('name') as HTMLInputElement;
const button = document.getElementById('button');

// chrome.action.setIcon({
//     path: {
//         '16': 'mentioned-icon_16.png',
//     },
// });

button.addEventListener('click', () => {
    if (nameInput.value.length < 4 || nameInput.value.length > 25) {
        alert('O nome precisa ter entre 4 e 25 caracteres');

        return;
    }

    alert('Extensão ativada com sucesso !');

    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
        chrome.tabs.sendMessage(tabs[0].id, {
            name: nameInput.value,
        });
    });
});

chrome.runtime.onMessage.addListener((message) => {
    const { sendNotification, mentionedBy } = message;

    console.log(
        'sendNotification:',
        sendNotification,
        'mentionedBy:',
        mentionedBy,
    );
});
