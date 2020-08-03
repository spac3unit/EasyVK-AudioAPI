const HTMLParser = require("node-html-parser");

const AudioRequests = require("./audio");
const SearchRequests = require("./search");

const ArtistsStatic = require("../static/artists");
const RecomsStatic = require("../static/recoms");
const PlaylistsStatic = require("../static/playlists");

class RecomsRequests extends RecomsStatic {
    constructor (client) {
        super(client);
        this.audio = new AudioRequests(client);
        this.PlaylistsStatic = new PlaylistsStatic(client);
        this.search = new SearchRequests(client);
    }

    getCollections () {
        return new Promise(async resolve => {
            const html = await this.getSection({ section: "recoms" });
            
            const parsed = HTMLParser.parse(html);
            const objects = parsed.querySelectorAll(".ui_gallery_item");

            const collections = objects.map(object => this.buildCollection(object));
            return resolve(collections);
        });
    }

    getNewAlbums () {
        return new Promise(async (resolve, reject) => {
            const payload = this.rawExplorePage || await this.getRawExplorePage().catch(reject);

            const html = payload[1][0];
            const root = HTMLParser.parse(html);

            const a_items = root.querySelectorAll(".ui_gallery_item");

            const albums = a_items.map(item => this.buildAlbum(item)).filter(a => a);
            return resolve(albums);
        });
    }

    getRecomsArtsits () {
        return new Promise(async (resolve, reject) => {
            const html = this.rawRecomsPage || await this.getRawRecomsPage().catch(reject);
            const artists = ArtistsStatic.build(html);
            return resolve(artists);
        });
    }

    getNewReleases (params = {}) {
        return new Promise(async (resolve, reject) => {
            const new_songs = await this.search.getByBlock({
                block: "new_songs",
                section: "explore",
                count: params.count || 0
            }).catch(reject);
            return resolve(new_songs);
        });
    }

    getChart (params = {}) {
        return new Promise(async (resolve, reject) => {
            const chart = await this.search.getByBlock({
                block: "chart",
                section: "explore",
                count: params.count || 0
            }).catch(reject);
            return resolve(chart);
        });
    }

    getOfficialPlaylists () {
        return new Promise(async (resolve, reject) => {
            const payload = this.rawExplorePage || await this.getRawExplorePage().catch(reject);

            const html = payload[1][0];
            let playlists = this.PlaylistsStatic.getGenreByHTML(html);

            const section = payload[1][1];
            const next_from = section.next_from || section.nextFrom;
            const { sectionId } = section;

            const { payload: addition } = await this.request({
                act: "load_catalog_section",
                al: 1,
                section_id: sectionId,
                start_from: next_from
            }).catch(reject);

            const catalogs = addition[1][0];
            for (const _c of catalogs) {
                const build = this.PlaylistsStatic.getGenreByHTML(_c);
                playlists = Object.assign(playlists, build);
            }

            return resolve(playlists);
        });
    }

    loadExplore (params = {}) {
        
        /*
            count?: number = 0 (load all songs)
        */

        return new Promise(async (resolve, reject) => {
            return resolve({
                collections: await this.getCollections().catch(reject),
                albums: await this.getNewAlbums().catch(reject),
                new_releases: await this.getNewReleases(params).catch(reject),
                chart: await this.getChart(params).catch(reject),
                playlists: await this.getOfficialPlaylists().catch(reject)
            });
        });
    }

    getDailyRecoms (params = {}) {
        return new Promise(async (resolve, reject) => {
            const daily = await this.search.getByBlock({
                block: "daily_recoms",
                count: params.count || 0
            }).catch(reject);
            return resolve(daily);
        });
    }

    getWeeklyRecoms (params = {}) {
        return new Promise(async (resolve, reject) => {
            const daily = await this.search.getByBlock({
                block: "weekly_recoms",
                count: params.count || 0
            }).catch(reject);
            return resolve(daily);
        });
    }

    getSection (params = {}) {

        /*
            section: String
        */
        
        return new Promise(async (resolve, reject) => {
            if (!params.section) {
                return reject(new Error("You must to specify section"));
            }

            const res = await this.request({
                section: params.section
            }).catch(reject);

            return resolve(res);
        });
    }

    getRawRecomsPage () {
        return new Promise(async (resolve, reject) => {
            this.rawRecomsPage = await this.getSection({ section: "recoms" }).catch(reject);
            setTimeout(async () => await this.getRawRecomsPage(), 60 * 1000 * 60);
            return resolve(this.rawRecomsPage);
        });
    }

    getRawExplorePage () {
        const uid = this.user_id;

        return new Promise(async (resolve, reject) => {
            const { payload } = await this.request({
                act: "section",
                al: 1,
                claim: 0,
                is_layer: 0,
                owner_id: uid,
                section: "explore"
            }).catch(reject);

            this.rawExplorePage = payload;
            setTimeout(async () => await this.getRawExplorePage(), 60 * 1000 * 60); // for support actual results
            return resolve(payload);
        });
    }
}

module.exports = RecomsRequests;