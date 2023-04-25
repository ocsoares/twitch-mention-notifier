const nameInput = document.getElementById('name') as HTMLInputElement;
const button = document.getElementById('button');

button.addEventListener('click', async () => {
    if (nameInput.value.length < 4 || nameInput.value.length > 25) {
        alert('O nome precisa ter entre 4 e 25 caracteres');

        return;
    }

    alert('Extensão ativada com sucesso !');

    await chrome.storage.local.set({ name: nameInput.value });

    chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
        await chrome.tabs.sendMessage(tabs[0].id, {
            name: nameInput.value,
        });
    });
});
