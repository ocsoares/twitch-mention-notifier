import { ISavedPopupInputs } from './ISavedPopupInputs';

export interface IExtensionStates {
    isExtensionEnabledPopup: boolean;
    popupRequestDelay: number;
    lastActiveTabId: number;
    lastNotification: number;
    startButtonClicked: ISavedPopupInputs;
    sameData: boolean;
}
