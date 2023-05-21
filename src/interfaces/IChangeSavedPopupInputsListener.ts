export interface IChangeSavedPopupInputsListener {
    nameSavedPopup: string & { newValue: string; oldValue: string };
    channelSavedPopup: string & { newValue: string; oldValue: string };
    nickAbbreviationSavedPopup: string & { newValue: string; oldValue: string };
}
