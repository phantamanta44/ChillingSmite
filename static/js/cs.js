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
        sName: $('#theSummonerName')
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
        summonerByName: {serv: true, vers: 'v1.4', ept: 'summoner/by-name'}
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
    
    var updatePage = function(rawJson) {
        if (!rawJson) {
            Controls.paneLeft.remove();
            Controls.paneRight.remove();
            Controls.paneError.text('Summoner not found!');
        }
        else {
            Controls.paneError.remove();
            var data = JSON.parse(rawJson)[query.n.toLowerCase().replace(/\s/g, '')];
            Controls.sIcon.attr('src', requestFromDd(DDPoint.summonerIcon, data.profileIconId + '.png'));
            Controls.sName.text(data.name);
        }
    };
    
    Controls.qSubmit.click(function(e) {
        if (Controls.qName.val())
            window.location = '?n=' + Controls.qName.val() + '&s=' + Controls.qServ.val();
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