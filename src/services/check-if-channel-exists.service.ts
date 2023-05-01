import axios from 'axios';

export async function checkIfChannelExists(channel: string): Promise<boolean> {
    const url = 'https://twitch-api-jmwk.onrender.com/twitch/api/search-user/';

    const isValidChannel = await axios.get(`${url}${channel}`);

    try {
        if (isValidChannel.data.data[0].display_name.length) {
            return true;
        }
    } catch (error) {
        return false;
    }
}
