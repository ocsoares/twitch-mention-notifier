import axios from 'axios';

export class CheckIfChannelExists {
    private static async twitchAPIUrl(): Promise<string> {
        const twitchAPIUrl = await axios.get(
            'https://dnebukteuwaxxkrfmhow.supabase.co/storage/v1/object/sign/services/twitch-api-url.json?token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1cmwiOiJzZXJ2aWNlcy90d2l0Y2gtYXBpLXVybC5qc29uIiwiaWF0IjoxNjkzMjYyNjAwLCJleHAiOjIwMDg4Mzg2MDB9.V7-ij6bgjePO1KKyW3LWa0xLYN4dYx9B3jnxFdIvNjg&t=2023-08-28T22%3A43%3A23.148Z',
            {
                headers: {
                    'Cache-Control': 'no-cache',
                },
            },
        );

        return twitchAPIUrl.data.url;
    }

    public static async execute(channel: string): Promise<boolean | undefined> {
        try {
            const url = await CheckIfChannelExists.twitchAPIUrl();

            const isValidChannel = await axios.get(`${url}${channel}`);

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
