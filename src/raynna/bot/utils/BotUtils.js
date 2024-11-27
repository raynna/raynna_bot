require('dotenv').config();
axios = require('axios');

const Settings = require('../settings/Settings');
const settings = new Settings();

const {getData, RequestType} = require('../requests/Request');
const request = require('../requests/Request');

const {getFontStyle} = require('./Fonts');

async function changeChannel(channel) {
    try {
        const channelWithoutHash = channel.startsWith('#') ? channel.replace('#', '').toLowerCase() : channel.toLowerCase();
        const {data: twitch, errorMessage: error} = await getData(RequestType.TwitchUser, channelWithoutHash);
        if (error) {
            console.log(error);
            return error;
        }
        if (!twitch.data || twitch.data.length === 0) {
            return `Something went from getting this twitch, no data`;
        }
        const {id: id, login: login, display_name: username} = twitch.data[0];
        settings.savedSettings = await settings.loadSettings();
        if (settings.savedSettings[id]) {
            await settings.remove(id);
            console.log(`Bot removed from channel: ${login} (id: ${id}).`);
            return `Bot removed from channel: ${login} (id: ${id}).`;
        }
        await settings.save(id, login, username);
        console.log(`Bot registered on channel: ${login} (id: ${id}).`);
        return `Bot registered on channel: ${login} (id: ${id}).`;
    } catch (error) {
        console.log(error);
    }
}

async function removeChannel(channel) {
    try {
        const channelWithoutHash = channel.startsWith('#') ? channel.replace('#', '').toLowerCase() : channel.toLowerCase();
        const {data: twitch, errorMessage: error} = await getData(RequestType.TwitchUser, channelWithoutHash);
        if (error) {
            console.log(error);
            return error;
        }
        if (!twitch.data || twitch.data.length === 0) {
            return `Something went from getting this twitch, no data`;
        }
        const {id: id, login: login, display_name: username} = twitch.data[0];
        settings.savedSettings = await settings.loadSettings();
        if (!settings.savedSettings[id]) {
            console.log(`Twitch channel ${login} is not registered on the bot.`);
            return `Twitch channel ${login} is not registered on the bot.`;
        }
        await settings.remove(id);
        console.log(`Bot removed from channel: ${login} (id: ${id}).`);
        return `Bot removed from channel: ${login} (id: ${id}).`;
    } catch (error) {
        console.log(error);
    }
}

async function addChannel(channel) {
    try {
        const channelWithoutHash = channel.startsWith('#') ? channel.replace('#', '').toLowerCase() : channel.toLowerCase();
        const {data: twitch, errorMessage: error} = await getData(RequestType.TwitchUser, channelWithoutHash);
        if (error) {
            console.log(error);
            return error;
        }
        if (!twitch.data || twitch.data.length === 0) {
            return `Something went from getting this twitch, no data`;
        }
        const {id: id, login: login, display_name: username} = twitch.data[0];
        settings.savedSettings = await settings.loadSettings();
        if (settings.savedSettings[id] && settings.savedSettings[id].twitch.channel) {
            console.log(`Twitch channel ${settings.savedSettings[id].twitch.channel} is already registered on the bot.`);
            return `Twitch channel ${settings.savedSettings[id].twitch.channel} is already registered on the bot.`;
        }
        await settings.save(id, login, username);
        console.log(`Bot registered on channel: ${login} (id: ${id}).`);
        return `Bot registered on channel: ${login} (id: ${id}).`;
    } catch (error) {
        console.log(error);
    }
}

async function isBotModerator(client, channel) {
    try {
        return client.isMod(channel, process.env.TWITCH_BOT_USERNAME) || client.isVip(channel, process.env.TWITCH_BOT_USERNAME);
    } catch (error) {
        console.error('Error:', error);
        return false;
    }
}

async function changeFont(text, channel) {
    try {
        text = text.toString();
        const styleMap = await getFontStyle(channel, settings);
        let isLink = false;
        let isTag = false;
        let isEmote = false;
        let emotes = ["DinoDance", "Kappa", "TwitchConHYPE", "damang4Zoom"];
        return text.split('').map((char, index) => {
            if (text.length - 1 === index && (char === ' ' || char === '\n')) {
                return '';
            } else if ((char === ' ' || char === '\t' || char === '\n') && (isLink || isTag)) {
                isLink = false;
                isTag = false;
                isEmote = false;
            } else if (text.substring(index).startsWith('https://') && !isLink) {
                isLink = true;
            } else if (emotes.some(emote => text.substring(index).startsWith(emote))) {
                isEmote = true;
            } else if (char === '@' && !isLink) {
                isTag = true;
            }
            return (isLink || isTag || isEmote) ? char : (styleMap[char] || char);
        }).join('');
    } catch (error) {
        console.log(error);
    }
}

let lastMessageTime = 0;
let messageCount = 0;

async function sendMessage(client, channel, message, skipFont = false) {
    try {
        const currentTime = Date.now();
        const timeElapsed = currentTime - lastMessageTime;

        const isMod = await isBotModerator(client, channel);
        const rateLimit = (channel.includes(process.env.CREATOR_CHANNEL) || isMod) ? 100 : 20;

        if (timeElapsed < 30000 && messageCount === rateLimit) {
            console.log("Bot reached rateLimit");
            return;
        }
        if (timeElapsed >= 30000) {
            messageCount = 1;
        } else {
            messageCount++;
        }
        lastMessageTime = currentTime;
        if (message) {
            console.log(`[Channel: ${channel}]`, `[Raynna_Bot]`, message);

            let formattedMessage = message;
            // Regular expression to find numbers greater than 10,000 preceded by a space
            const regex = /(?<=\s)(\d{5,})/g;
            formattedMessage = formattedMessage.replace(regex, (match, p1) => {
                return p1.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
            });

            if (skipFont) {
                await client.say(channel, message);
            } else {
                await client.say(channel, await changeFont(formattedMessage, channel));
            }
        }
    } catch (error) {
        console.error(error);
    }
}


/**Data for a twitch channel
 *
 * Settings for channel #daman_gg: {"id":-1,"toggled":{},"esportal":{"name":"test","id":75317132}}
 * data for channel #daman_gg: [{"id":"41837700776","user_id":"62489635","user_login":"daman_gg","user_name":"DaMan_gg","game_id":"32399","game_name":"Counter-Str
 * ike","type":"live","title":"GIBB MED DAGANG | GIVEAWAYS","viewer_count":42,"started_at":"2024-02-06T08:06:39Z","language":"sv","thumbnail_url":"https://static-
 * cdn.jtvnw.net/previews-ttv/live_user_daman_gg-{width}x{height}.jpg","tag_ids":[],"tags":["swe","Svenska","DaddyGamer","everyone","eng","English","counterstrike","esportal"],"is_mature":false}], length: 1
 */

//checks if there is any data to gather, if not, stream is offline and returns false
async function isStreamOnline(channel) {
    try {
        const {
            data: streamData,
            errorMessage: message
        } = await request.getData(request.RequestType.StreamStatus, channel);
        if (message) {
            return false;
        }
        if (streamData.data && streamData.data.length > 0) {
            const {user_id: twitchId} = streamData.data[0];
            if (settings[twitchId]) {
                await settings.check(twitchId);
            }
        }

        //console.log(`data for channel: ${channel}: ${JSON.stringify(streamData)}, length: ${streamData.length}`);
        return streamData.data && streamData.data.length > 0;
    } catch (error) {
        console.log(error);
    }
}

function isCreatorChannel(channel) {
    return channel.toLowerCase().replace(/#/g, '') === process.env.CREATOR_CHANNEL;
}

module.exports = {
    isCreatorChannel,
    isStreamOnline,
    sendMessage,
    addChannel,
    removeChannel,
    changeChannel,
    isBotModerator,
}