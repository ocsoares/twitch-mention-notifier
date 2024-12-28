import axios from 'axios';

export class CheckIfChannelExists {
    private static readonly TWITCH_API_URL = 'https://twitch-api-gold.vercel.app/twitch/api/search-channel/'

    public static async execute(channel: string): Promise<boolean | undefined> {
        try {
            const isValidChannel = await axios.get(`${this.TWITCH_API_URL}${channel}`);

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
