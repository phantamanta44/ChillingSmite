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
    
    var avg = function(values) {
        var average = 0, count = 0;
        $.each(values, function (k, v) {
            average += (v || 0);
            count++;
        });
        return Math.round(100 * average / count) / 100;
    };
    
    var Controls = {
        doc: $(document),
        qSubmit: $('#submit'),
        qName: $('#inputName'),
        qServ: $('#inputServ'),
        paneError: $('#errorPane'),
        paneLeft: $('#leftPane'),
        paneRight: $('#rightPane'),
        paneBot: $('#bottomPane'),
        tooltip: $('#tooltip')
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
        return query.g && query.s && (validServers.indexOf(query.s) != -1);
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
        var req = new XMLHttpRequest(), reqData;
        req.addEventListener('load', function() {
            if (req.status === 200)
                cb.call(this, req.responseText);
            else
                cb.call(false);
        });
        req.addEventListener('error', function() {
            cb.call(false, req.status);
        });
        req.open('GET', useProxy ? 'http://cors.io/?u=' + url : url);
        req.send();
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
        var request = baseAcsRequest.supplant({vers: acsVers, serv: acsServers[serv], gid: game});
        requestXml(request, cb, true);
    };

    var data;
    var gameTypes = {
        NONE: 'Custom Match', NORMAL: 'Blind Pick 5v5', NORMAL_3x3: 'Blind Pick 3v3', ODIN_UNRANKED: 'Blind Pick Dominion', ARAM_UNRANKED_5x5: 'Blind Pick ARAM',
        BOT: 'Botmatch 5v5', BOT_3x3: 'Botmatch 3v3', RANKED_SOLO_5x5: 'Solo Queue 5v5', RANKED_TEAM_3x3: 'Team Match 3v3', RANKED_TEAM_5x5: 'Team Match 5v5',
        ONEFORALL_5x5: 'One for All', FIRSTBLOOD_1x1: 'Showdown 1v1', FIRSTBLOOD_2x2: 'Showdown 2v2', SR_6x6: 'Hexakill 5v5', CAP_5x5: 'Team Builder',
        URF: 'Ultra Rapid Fire', URF_BOT: 'URF Botmatch', NIGHTMARE_BOT: 'Nightmare Botmatch', ASCENSION: 'Ascension', HEXAKILL: 'Hexakill 3v3',
        KING_PORO: 'King Poro', COUNTER_PICK: 'Nemesis', BILGEWATER: 'Black Market Brawlers'
    };
    
    var Team = {};
    var Players = {'100': [], '200': []};
    
    var parseData = function(data) {
        console.log(data); // DELETE the underlined portion DELETE the underlined portion DELETE the underlined portion DELETE the underlined portion
        $.each(data.teams, function(i, obj) {
            Team[obj.teamId] = obj;
        });
        $.each(data.participants, function(i, obj) {
            Players[obj.teamId].push(obj);
        });
    };
    
    var updatePage = function(rawJson) {
        if (!rawJson) {
            Controls.paneLeft.remove();
            Controls.paneRight.remove();
            Controls.paneBot.remove();
            Controls.paneError.text('Game not found!');
        }
        else {
            data = JSON.parse(rawJson);
            Controls.paneError.remove();
            parseData(data);
            
            $('#blueHeader').text(Team[100].win === 'Fail' ? 'DEFEAT' : 'VICTORY');
            $('#redHeader').text(Team[200].win === 'Fail' ? 'DEFEAT' : 'VICTORY');
            
            $.each(Players[100], function(i, obj) {
                var block = $('<div>', {class: 'playerBlock'});
                Controls.paneLeft.append(block);
                constructPlayerBlock(block, obj, data);
            });
            $.each(Players[200], function(i, obj) {
                var block = $('<div>', {class: 'playerBlock'});
                Controls.paneRight.append(block);
                constructPlayerBlock(block, obj, data);
            });
        }
    };
    
    var pbContent = '<img class="championLarge"/><div class="gbRight"><div class="gbUpper">{upper}</div><div class="gbLower">{lower}</div></div>';
    var pbUpper = '<div class="centerHelper"></div><div class="summonerSpells"></div><div class="gameItems"></div>';
    var pbLower = '<div class="gameStats">{gStats}</div><div class="gameStats">{gStats2}</div>';
    var pStats = '<div class="gameKda"><img class="statIcon statScore" src="static/img/score.png"/><p>{kda}</p></div>\
        <div class="gameCsStats"><img class="statIcon statMinion" src="static/img/minion.png"/><p>{creeps}<div class="pipeBreak">|</div>{cpm} CPM</p></div>';
    var kdaFormat = '{k} / {d} / {a}<div class="pipeBreak">|</div>{ratio}';
    var pStats2 = '<div class="gameLevel"><img class="statIcon statLevel" src="static/img/champion.png"/><p>Level {level}<div class="pipeBreak">|</div>{xpm} XPM</p></div>\
        <div class="gameGold"><img class="statIcon statGold" src="static/img/gold.png"/><p>{gold}<div class="pipeBreak">|</div>{gpm} GPM</p></div>';
    
    var constructPlayerBlock = function(block, player, game) {
        var kda = {k: player.stats.kills || 0, d: player.stats.deaths || 0, a: player.stats.assists || 0};
        kda.kdr = Math.round((kda.k + kda.a) / kda.d * 100) / 100;
        kda.ratio = isNaN(kda.kdr) || kda.kdr === Infinity ? 'Perfect' : kda.kdr + ' : 1';
        var creeps = player.stats.totalMinionsKilled || 0;
        var cpm = Math.round((creeps / game.gameDuration) * 6000) / 100;
        var gameStats = pStats.supplant({kda: kdaFormat.supplant(kda), creeps: creeps, cpm: cpm});
        var gold = player.stats.goldEarned;
        var gpm = Math.round((gold / game.gameDuration) * 6000) / 100;
        var gameStats2 = pStats2.supplant({level: player.stats.champLevel, xpm: avg(player.timeline.xpPerMinDeltas), gold: gold, gpm: gpm});
        var lowerCont = pbLower.supplant({gStats: gameStats, gStats2: gameStats2});
        
        block.html(pbContent.supplant({upper: pbUpper, lower: lowerCont}));
        
        requestFromApi(query.s, Endpoint.champion, player.championId, function(rj1) {
            var j1 = JSON.parse(rj1);
            block.find('.championLarge').attr('src', requestFromDd(DDPoint.championIcon, j1.key + '.png'));
        });
        requestFromApi(query.s, Endpoint.spell, player.spell1Id, function(rj2) {
            var j2 = JSON.parse(rj2);
            block.find('.summonerSpells').prepend($('<img>', {src: requestFromDd(DDPoint.spellIcon, j2.key + '.png')}));
        });
        requestFromApi(query.s, Endpoint.spell, player.spell2Id, function(rj3) {
            var j3 = JSON.parse(rj3);
            block.find('.summonerSpells').append($('<img>', {src: requestFromDd(DDPoint.spellIcon, j3.key + '.png')}));
        });
        for (var itemInd = 0; itemInd < 7; itemInd++) {
            var itemId = player.stats['item' + itemInd];
            if (itemId !== 0) {
                var itemBlock = $('<img>', {src: requestFromDd(DDPoint.itemIcon, itemId + '.png')});
                block.find('.gameItems').append(itemBlock);
                requestFromApi(query.s, Endpoint.item, itemId, constructItemTooltip(itemBlock));
            }
            else if (itemInd === 6)
                block.find('.gameItems').append($('<img>', {src: 'static/img/noTrinket.png'}));
            else
                block.find('.gameItems').append($('<img>', {src: 'static/img/noItem.png'}));
        }
    };
    
    var itemDescHtml = '<div class="itemName">{name}</div><div class="itemDesc">{desc}</div>';
    
    var constructItemTooltip = function(block) {
        return function(rawJson) {
            var item = JSON.parse(rawJson);
            var iDesc = item.description.replace(/BBFFFF/g, '00bcd4');
            block.mouseover(function() {
                Controls.tooltip.css('display', 'block');
                Controls.tooltip.html(itemDescHtml.supplant({name: item.name, desc: iDesc}));
            });
            block.mouseout(function() {
                Controls.tooltip.css('display', 'none');
            });
            block.mousemove(function(e) {
                var posX = e.clientX + 8;
                var posY = e.clientY + 8;
                if (e.clientX + Controls.tooltip.innerWidth() > window.innerWidth)
                    posX = e.clientX - Controls.tooltip.innerWidth() - 4;
                if (e.clientY + Controls.tooltip.innerHeight() > window.innerHeight)
                    posY = e.clientY - Controls.tooltip.innerHeight() - 4;
                Controls.tooltip.css({top: posY + 'px', left: posX + 'px'});
            });
        };
    };
    
    var queryTemplate = 'index.html?n={name}&s={serv}';
    
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
        window.location = 'index.html';
    else {
        $('#qForm').prepend(headerText.supplant({loc: document.location.host + document.location.pathname}));
        Controls.qName.val(query.n);
        Controls.qServ.val(query.s);
        requestFromAcs(query.s, query.g, updatePage);
    }
    
});