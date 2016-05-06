// Douglas Crockford's Remedial JavaScript
if (!String.prototype.supplant) {
    String.prototype.supplant = function (o) {
        return this.replace(
            /\{([^{}]*)\}/g,
            function (a, b) {
                var r = o[b];
                return typeof r === 'string' || typeof r === 'number' ? r : a;
            }
        );
    };
}

var avg = function(values) {
    var average = 0, count = 0;
    $.each(values, function (k, v) {
        average += (v || 0);
        count++;
    });
    return Math.round(100 * average / count) / 100;
};

var query;
var validServers = ['na', 'euw', 'eune', 'kr', 'oce', 'ru', 'tr', 'las', 'lan', 'br'];

var loadQuery = function() {
    query = {};
    var getRequest = document.location.search.slice(1);
    var pairs = getRequest.split('&');
    for (var i = 0; i < pairs.length; i++) {
        var pair = pairs[i].split(/=(.+)/);
        query[pair[0]] = decodeURIComponent(pair[1]);
    }
    return query.n && query.s && (validServers.indexOf(query.s) != -1);
};

var cache;

var cacheData = function() {
    var cacheNode = $('#nodeCache');
    cache = cacheNode.attr('title');
    cacheNode.remove();
    cache = hexToBase64(cache);
};

var getCachedData = function() {
    if (!cache)
        cacheData();
    return cache.replace(/\+/g, '-').toLowerCase();
};

var requestXml = function(url, cb, useProxy) {
    var ajaxReq = $.ajax({url: useProxy ? 'http://cors.io/?u=' + encodeURIComponent(url) : url, dataType: 'json'});
    ajaxReq.fail(function(e) {
        cb.call(this, false, e.status);
    });
    ajaxReq.done(cb);
};

var Endpoint = {
    summonerByName: {vers: 'v1.4', url: 'https://{serv}.api.pvp.net/api/lol/{serv}/{vers}/summoner/by-name/{params}'},
    statsBySummoner: {vers: 'v1.3', url: 'https://{serv}.api.pvp.net/api/lol/{serv}/{vers}/stats/by-summoner/{params}/summary'},
    gamesBySummoner: {vers: 'v1.3', url: 'https://{serv}.api.pvp.net/api/lol/{serv}/{vers}/game/by-summoner/{params}/recent'},
    champion: {vers: 'v1.2', url: 'https://global.api.pvp.net/api/lol/static-data/{serv}/{vers}/champion/{params}'},
    spell: {vers: 'v1.2', url: 'https://global.api.pvp.net/api/lol/static-data/{serv}/{vers}/summoner-spell/{params}'},
    item: {vers: 'v1.2', url: 'https://global.api.pvp.net/api/lol/static-data/{serv}/{vers}/item/{params}'}
};
var baseRequest = '{req}?api_key={cache}';

var requestFromApi = function(serv, ept, params, cb) {
    var request = baseRequest.supplant({req: ept.url.supplant({serv: serv, vers: ept.vers, params: params}), cache: getCachedData()});
    requestXml(request, cb);
};

var DDPoint = {
    summonerIcon: {ept: 'img/profileicon', staticReq: false},
    championIcon: {ept: 'img/champion', staticReq: false},
    itemIcon: {ept: 'img/item', staticReq: false},
    spellIcon: {ept: 'img/spell', staticReq: false}
};
var baseDataDragon = 'https://ddragon.leagueoflegends.com/cdn/{vers}/{ept}/{params}';
var baseDataDragonStatic = 'http://ddragon.leagueoflegends.com/cdn/{ept}/{params}';
var ddVers = '6.9.1';

var requestFromDd = function(ept, params) {
    var request = ept.staticReq ? baseDataDragonStatic : baseDataDragon;
    request = request.supplant({ept: ept.ept, params: encodeURIComponent(params), vers: ddVers});
    return request;
};

var baseAcsRequest = 'https://acs.leagueoflegends.com/{vers}/stats/game/{serv}/{gid}';
var acsVers = 'v1';
var acsServers = {na: 'NA1', euw: 'EUW1', br: 'BR1', eune: 'EUN1', lan: 'LA1', las: 'LA2', tr: 'TR1', oce: 'OC1', ru: 'RU', kr: 'KR'};

var requestFromAcs = function(serv, game, cb) {
    var request = baseAcsRequest.supplant({vers: acsVers, serv: acsServers[serv], gid: game});
    requestXml(request, cb, true);
};