$(document).ready(function() {
    
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
    
    var Controls = {
        qSubmit: $('#submit'),
        qName: $('#inputName'),
        qServ: $('#inputServ'),
        paneError: $('#errorPane'),
        paneLeft: $('#leftPane'),
        paneRight: $('#rightPane'),
        sIcon: $('#profileIcon'),
        sStats: $('#summonerStats'),
        sName: $('#theSummonerName'),
        sLevel: $('#theSummonerLevel')
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
    }
    
    var getCachedData = function() {
        if (!cache)
            cacheData();
        return cache.replace(/\+/g, '-').toLowerCase();
    };
    
    var requestXml = function(url, cb) {
        var req = new XMLHttpRequest(), reqData;
        req.addEventListener('load', function() {
            if (req.status === 200)
                cb.call(this, req.responseText);
            else
                cb.call(false);
        });
        req.open('GET', url);
        req.send();
    };
    
    var Endpoint = {
        summonerByName: {serv: true, vers: 'v1.4', ept: 'summoner/by-name'},
        statsBySummoner: {serv: true, vers: 'v1.3', ept: 'stats/by-summoner'}
    };
    var baseRequest = 'https://{serv}.api.pvp.net/api/lol/{servSpec}{vers}/{ept}/{params}?api_key={cache}';
    
    var requestFromApi = function(serv, ept, params, cb) {
        var request = baseRequest.supplant({serv: serv, servSpec: ept.serv ? serv + '/' : '', vers: ept.vers, ept: ept.ept, params: params, cache: getCachedData()});
        requestXml(request, cb);
    };
    
    var DDPoint = {
        summonerIcon: {ept: 'img/profileicon', staticReq: false}
    };
    var baseDataDragon = 'https://ddragon.leagueoflegends.com/cdn/{vers}/{ept}/{params}';
    var baseDataDragonStatic = 'http://ddragon.leagueoflegends.com/cdn/{ept}/{params}';
    var ddVers = '5.19.1';
    
    var requestFromDd = function(ept, params) {
        var request = ept.staticReq ? baseDataDragonStatic : baseDataDragon;
        request = request.supplant({ept: ept.ept, params: encodeURIComponent(params), vers: ddVers});
        return request;
    };
    
    var baseAcsRequest = 'https://acs.leagueoflegends.com/{vers}/stats/game/{serv}/{gid}';
    var acsVers = 'v1';
    var acsServers = {na: 'NA1', euw: 'EUW1', br: 'BR1', eune: 'EUN1', lan: 'LA1', las: 'LA2', tr: 'TR1', oce: 'OC1', ru: 'RU', kr: 'KR'};
    
    var requestFromAcs = function(serv, game, cb) {
        var url = baseAcsRequest.supplant({vers: acsVers, serv: acsServers[serv], gid: game});
        requestXml(request, cb);
    };
    
    var errorText = 'Error: {code} {reason}';
    var levelText = 'Level {lvl}';
    
    var updatePage = function(rawJson) {
        if (!rawJson) {
            Controls.paneLeft.remove();
            Controls.paneRight.remove();
            Controls.paneError.text('Summoner not found!');
        }
        else {
            var data = JSON.parse(rawJson)[query.n.toLowerCase().replace(/\s/g, '')];
            if (data.status && data.status.status_code.startsWith(/[45]/)) {
                Controls.paneLeft.remove();
                Controls.paneRight.remove();
                Controls.paneError.text(errorText.supplant({code: data.status.status_code, reason: data.status.message}));
                return;
            }
            Controls.paneError.remove();
            var stats = requestFromApi(query.s, Endpoint.statsBySummoner, data.id + '/summary', updateStats)
            Controls.sIcon.attr('src', requestFromDd(DDPoint.summonerIcon, data.profileIconId + '.png'));
            Controls.sName.text(data.name);
            Controls.sLevel.text(levelText.supplant({lvl: data.summonerLevel}));
        }
    };
    
    var updateStats = function(rawJson) {
        if (!rawJson) {
            // Error handling
        }
        else {
            var stats = JSON.parse(rawJson);
        }
    };
    
    var queryTemplate = '?n={name}&s={serv}';
    
    Controls.qSubmit.click(function(e) {
        if (Controls.qName.val())
            window.location = queryTemplate.supplant({name: Controls.qName.val(), serv: Controls.qServ.val()});
    }); 
    
    Controls.qName.keydown(function(e) {
        if (e.keyCode === 13)
            Controls.qSubmit.click();
    });
    
    var headerText = '<a href="http://{loc}" class="hiddenLink"><h2 id="headerLink">Chilling Smite</h2></a>';
    
    if (!loadQuery())
        $('#secondpage').remove();
    else {
        $('#firstpage').remove();
        $('#qForm').prepend(headerText.supplant({loc: document.location.host + document.location.pathname}));
        Controls.qName.val(query.n);
        Controls.qServ.val(query.s);
        var data = requestFromApi(query.s, Endpoint.summonerByName, query.n, updatePage);
    }
    
});