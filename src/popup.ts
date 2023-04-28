const channelInput = document.getElementById('channel') as HTMLInputElement;
const nameInput = document.getElementById('name') as HTMLInputElement;
const nickAbbreviationInput = document.getElementById(
    'nick-abbreviation',
) as HTMLInputElement;
const button = document.getElementById('button');

button.addEventListener('click', async () => {
    if (channelInput.value.length < 4 || channelInput.value.length > 25) {
        alert('O canal precisa ter entre 4 e 25 caracteres');

        return;
    }

    if (nameInput.value.length < 4 || nameInput.value.length > 25) {
        alert('O nome precisa ter entre 4 e 25 caracteres');

        return;
    }

    alert('Extensão ativada com sucesso !');

    await chrome.storage.local.set({
        name: nameInput.value,
        channel: channelInput.value,
        nickAbbreviation: nickAbbreviationInput.value,
    });

    chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
        await chrome.tabs.sendMessage(tabs[0].id, {
            channel: channelInput.value,
            name: nameInput.value,
            nickAbbreviation: nickAbbreviationInput.value ?? undefined,
        });
    });
});
