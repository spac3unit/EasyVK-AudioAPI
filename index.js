const { VK } = require("vk-io");

const Static = require("./lib/static");

const HTTPClient = require("./lib/http");

const Audio = require("./lib/requests/audio");
const Playlists = require("./lib/requests/playlists");
const Search = require("./lib/requests/search");
const Artists = require("./lib/requests/artists");
const General = require("./lib/requests/general");
const Explore = require("./lib/requests/explore");

const Promise = require("bluebird");
class AudioAPI extends Static {
    constructor (token) {
        super({}, new VK({ token }));
        this.token = token;
    }

    async login (credits, params = {}) {
        this.vk.user = credits.user;

        this.client = await new HTTPClient(this.vk).login({
            ...credits,
            ...params
        });

        this.audio = new Audio(this.client, this.vk);
        this.playlists = new Playlists(this.client, this.vk);
        this.search = new Search(this.client, this.vk);
        this.artists = new Artists(this.client, this.vk);
        this.general = new General(this.client, this.vk);
        this.explore = new Explore(this.client, this.vk);

        return this;
    }

    async getAll (params = {}) {
        params.owner_id = params.owner_id ? Number(params.owner_id) : this.user;
        params.playlist_id = params.playlist_id ? Number(params.playlist_id) : -1;

        return ~params.playlist_id
            ? this.playlists.getAllSongs(params)
            : this.audio.getAll(params);
    }

    async getFriendsUpdates (params = {}) {
        const { payload } = await this.request({
            act: "section",
            al: 1,
            claim: 0,
            is_layer: 0,
            owner_id: this.user,
            section: "updates"
        });

        try {
            return await Promise.map(payload[1][1].playlists, async playlist => ({
                owner_id: playlist.ownerId,
                audios: await this.audio.parseAudios(playlist.list, params)
            }));
        } catch (e) {
            return [];
        }
    }

    // --------------------- STATUS ----------------------

    async getStatusExportHash () {
        const res = await this.audio.mainPage();

        const hash = res.match(/statusExportHash: \'(.*?)\'/)[1];
        this.statusExportHash = hash;

        return hash;
    }

    async toggleAudioStatus (params = {}) {

        /*
            enable: boolean
            raw_audio_id: string
            owner_id?: number
        */

        await this.request({
            act: "toggle_status",
            al: 1,
            exp: Number(params.enable),
            hash: this.statusExportHash || await this.getStatusExportHash(),
            id: params.raw_audio_id,
            oid: params.owner_id ? Number(params.owner_id) : this.user,
            top: 0
        });

        return true;
    }

    async changeAudioStatus (params = {}) {

        /*
            raw_audio_id: string
        */

        await this.request({
            act: "audio_status",
            al: 1,
            hash: this.statusExportHash || await this.getStatusExportHash(),
            full_id: params.raw_audio_id,
            top: 0
        });

        return true;
    }
}

module.exports = AudioAPI;