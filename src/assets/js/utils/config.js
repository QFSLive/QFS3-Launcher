/**
 * @author Luuxis
 * Luuxis License v1.0 (see LICENSE file for details in FR/EN)
 */

const pkg = require('../package.json');
const nodeFetch = require("node-fetch");
const convert = require('xml-js');
let url = pkg.user ? `${pkg.url}/${pkg.user}` : pkg.url

// Using a template string without the timestamp here to keep the base URL clean
let config = `https://raw.githubusercontent.com/QFSLive/QFS3-Launcher/master/config.json`;
let articles = `https://raw.githubusercontent.com/QFSLive/QFS3-Launcher/master/articles.json`;

class Config {
    GetConfig() {
        return new Promise((resolve, reject) => {
            nodeFetch(`${config}?t=${Date.now()}`).then(async res => {
                if (res.status === 200) return resolve(res.json());
                else return reject({ error: { code: res.statusText, message: 'Remote server uplink unavailable' } });
            }).catch(error => {
                return reject({ error });
            })
        })
    }

    async getInstanceList() {
        let urlInstance = `${url}/instances`
        let instances = await nodeFetch(urlInstance).then(res => res.json()).catch(err => err)
        let instancesList = []
        instances = Object.entries(instances)

        for (let [name, data] of instances) {
            let instance = data
            instancesList.push(instance)
        }
        return instancesList
    }

    async getNews(config) {
        // We add the timestamp here to ensure we bypass the GitHub cache every time news is requested
        const newsUrl = `${articles}?t=${Date.now()}`;

        if (config.rss) {
            return new Promise((resolve, reject) => {
                nodeFetch(config.rss).then(async res => {
                    if (res.status === 200) {
                        let news = [];
                        let response = await res.text()
                        response = (JSON.parse(convert.xml2json(response, { compact: true })))?.rss?.channel?.item;

                        if (!Array.isArray(response)) response = [response];
                        for (let item of response) {
                            news.push({
                                title: item.title._text,
                                content: item['content:encoded']._text,
                                author: item['dc:creator']._text,
                                publish_date: item.pubDate._text
                            })
                        }
                        return resolve(news);
                    }
                    else return reject({ error: { code: res.statusText, message: 'RSS feed unreachable' } });
                }).catch(error => reject({ error }))
            })
        } else {
            return new Promise((resolve, reject) => {
                nodeFetch(newsUrl).then(async res => {
                    if (res.status === 200) {
                        return resolve(res.json());
                    }
                    else return reject({ error: { code: res.statusText, message: 'News database unreachable' } });
                }).catch(error => {
                    return reject({ error });
                })
            })
        }
    }
}

export default new Config;