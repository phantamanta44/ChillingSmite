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
        paneRight: $('#rightPaneContainer'),
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
    
    var requestXml = function(url, cb, useProxy) {
        var req = new XMLHttpRequest(), reqData;
        req.addEventListener('load', function() {
            if (req.status === 200)
                cb.call(this, req.responseText);
            else
                cb.call(false);
        });
        req.open('GET', useProxy ? 'http://cors.io/?u=' + url : url);
        req.send();
    };
    
    var Endpoint = {
        summonerByName: {vers: 'v1.4', url: 'https://{serv}.api.pvp.net/api/lol/{serv}/{vers}/summoner/by-name/{params}'},
        statsBySummoner: {vers: 'v1.3', url: 'https://{serv}.api.pvp.net/api/lol/{serv}/{vers}/stats/by-summoner/{params}/summary'},
        gamesBySummoner: {vers: 'v1.3', url: 'https://{serv}.api.pvp.net/api/lol/{serv}/{vers}/game/by-summoner/{params}/recent'},
        champion: {vers: 'v1.2', url: 'https://global.api.pvp.net/api/lol/static-data/{serv}/{vers}/champion/{params}'}
    };
    var baseRequest = '{req}?api_key={cache}';
    
    var requestFromApi = function(serv, ept, params, cb) {
        var request = baseRequest.supplant({req: ept.url.supplant({serv: serv, vers: ept.vers, params: params}), cache: getCachedData()});
        requestXml(request, cb);
    };
    
    var DDPoint = {
        summonerIcon: {ept: 'img/profileicon', staticReq: false},
        championIcon: {ept: 'img/champion', staticReq: false}
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
    var errorText = 'Error: {code} {reason}';
    var levelText = 'Level {lvl}';
    
    var updatePage = function(rawJson) {
        if (!rawJson) {
            Controls.paneLeft.remove();
            Controls.paneRight.parent().remove();
            Controls.paneError.text('Summoner not found!');
        }
        else {
            data = JSON.parse(rawJson)[query.n.toLowerCase().replace(/\s/g, '')];
            if (data.status && data.status.status_code.startsWith(/[45]/)) {
                Controls.paneLeft.remove();
                Controls.paneRight.parent().remove();
                Controls.paneError.text(errorText.supplant({code: data.status.status_code, reason: data.status.message}));
                return;
            }
            Controls.paneError.remove();
            requestFromApi(query.s, Endpoint.statsBySummoner, data.id, updateStats);
            requestFromApi(query.s, Endpoint.gamesBySummoner, data.id, updateGames);
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
            var stats = JSON.parse(rawJson).playerStatSummaries;
        }
    };
    
    var gameBlock = '<div class="gameBlock" id="gameBlock{gid}"></div>';
    var gameData = [];
    
    var appendGameData = function(wGame) {
        return function(rawJson) {
            var game = JSON.parse(rawJson);
            gameData.push(game);
            mergeSort(gameData, function(a, b) {
                return b.gameCreation - a.gameCreation;
            });
            var ind = gameData.indexOf(game) + 1;
            if (ind >= gameData.length) {
                Controls.paneRight.append(gameBlock.supplant({gid: game.gameId}));
                constructGameBlock(game, wGame);
            }
            else {
                $('#gameBlock' + gameData[ind].gameId).before(gameBlock.supplant({gid: game.gameId}));
                constructGameBlock(game, wGame);
            }
        }
    };
    
    var gbContent = '<div class="gbUpper">{upper}</div><div class="gbLower">{lower}</div>';
    var gbUpper = '<div class="gbUpperLeft"><img class="championLarge"/><div class="gameOutcome">{outcome}</div></div>';
    var gbLower = '<div class="gbLowerLeft"><div class="gameTime"><p>{gameTime}</p><p>{gameDate}</p></div><div class="gameType">{gameMode}</div></div>';
    var gameTypes = {
        NONE: 'Custom Match', NORMAL: 'Blind Pick 5v5', NORMAL_3x3: 'Blind Pick 3v3', ODIN_UNRANKED: 'Blind Pick Dominion', ARAM_UNRANKED_5x5: 'Blind Pick ARAM',
        BOT: 'Botmatch 5v5', BOT_3x3: 'Botmatch 3v3', RANKED_SOLO_5x5: 'Solo Queue 5v5', RANKED_TEAM_3x3: 'Team Match 3v3', RANKED_TEAM_5x5: 'Team Match 5v5',
        ONEFORALL_5x5: 'One for All', FIRSTBLOOD_1x1: 'Showdown 1v1', FIRSTBLOOD_2x2: 'Showdown 2v2', SR_6x6: 'Hexakill 5v5', CAP_5x5: 'Team Builder',
        URF: 'Ultra Rapid Fire', URF_BOT: 'URF Botmatch', NIGHTMARE_BOT: 'Nightmare Botmatch', ASCENSION: 'Ascension', HEXAKILL: 'Hexakill 3v3',
        KING_PORO: 'King Poro', COUNTER_PICK: 'Nemesis', BILGEWATER: 'Black Market Brawlers'
    };
    
    var constructGameBlock = function(game, wGame) {
        var block = $('#gameBlock' + game.gameId);
        var players = {};
        var rPlayersCopy = game.participants;
        var wPlayers = wGame.fellowPlayers;
        for (var i = 0; i < wPlayers.length; i++) {
            var wPlayer = wPlayers[i];
            var team = wPlayer.teamId, champ = wPlayer.championId;
            for (var j = 0; j < game.participants.length; j++) {
                var rPlayer = game.participants[j];
                if (rPlayer.teamId === team && rPlayer.championId === champ) {
                    players[wPlayer.summonerId] = rPlayer;
                    rPlayersCopy.splice(rPlayersCopy.indexOf(rPlayer), 1);
                    break;
                }
            }
        }
        thePlayer = players[data.id] = rPlayersCopy[0];
        
        var won = wGame.stats.win;
        var upperCont = gbUpper.supplant({outcome: won ? 'VICTORY' : 'DEFEAT'});
        
        var modSec = game.gameDuration % 60;
        var gameTime = '{min}:{sec}'.supplant({min: (game.gameDuration - modSec) / 60, sec: modSec < 10 ? '0' + modSec : modSec});
        var gameDate = new Date(game.gameCreation).toDateString().slice(3);
        var lowerCont = gbLower.supplant({gameTime: gameTime, gameDate: gameDate, gameMode: gameTypes[wGame.subType]});
        
        block.html(gbContent.supplant({upper: upperCont, lower: lowerCont}));
        
        block.find('.gameOutcome').css('background-color', won ? '#81c784' : '#e57373');
        
        requestFromApi(query.s, Endpoint.champion, thePlayer.championId, function(rj1) {
            var j1 = JSON.parse(rj1);
            block.find('.championLarge').attr('src', requestFromDd(DDPoint.championIcon, j1.key + '.png'));
        });
    };
    
    var updateGames = function(rawJson) {
        if (!rawJson) {
            // Error handling
        }
        else {
            var games = JSON.parse(rawJson).games;
            for (var i = 0; i < games.length; i++)
                requestFromAcs(query.s, games[i].gameId, appendGameData(games[i]));
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