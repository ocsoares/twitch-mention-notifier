import { createNickAbbreviationInputArray } from '../utils/create-nick-abbreviation-input-array.util';

export async function getSavedPopupData(
    nameInput: string,
    channelInput: string,
    nickAbbreviationInput: string,
    nickAbbreviationInputArray: string[],
) {
    const { nameSavedPopup, channelSavedPopup, nickAbbreviationSavedPopup } =
        await chrome.storage.local.get([
            'nameSavedPopup',
            'channelSavedPopup',
            'nickAbbreviationSavedPopup',
        ]);

    nameInput = nameSavedPopup;

    console.log('channelSavedPopup ANTES NO SAVED:', channelSavedPopup);
    channelInput = channelSavedPopup;
    console.log('channelSavedPopup DEPOIS NO SAVED:', channelSavedPopup);

    nickAbbreviationInput = nickAbbreviationSavedPopup;

    // Separate by comma in an array, remove spaces and empty strings
    if (nickAbbreviationInput) {
        nickAbbreviationInputArray = createNickAbbreviationInputArray(
            nickAbbreviationInput,
        );
    }

    return {
        nameInput,
        channelInput,
        nickAbbreviationInput,
        nickAbbreviationInputArray,
    };
}
