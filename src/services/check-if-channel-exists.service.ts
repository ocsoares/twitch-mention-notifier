/* eslint-disable @typescript-eslint/naming-convention */

import axios from 'axios';

export class CheckIfChannelExists {
    private static url =
        'https://twitch-api-jmwk.onrender.com/twitch/api/search-channel/';

    public static async execute(channel: string): Promise<boolean | undefined> {
        try {
            const isValidChannel = await axios.get(
                `${CheckIfChannelExists.url}${channel}`,
            );

            try {
                if (isValidChannel.data.data[0].display_name.length) {
                    return true;
                }
            } catch (error) {
                return false;
            }
        } catch (error) {
            return undefined;
        }
    }
}
