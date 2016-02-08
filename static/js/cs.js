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
        paneRight: $('#rightPaneContainer'),
        sIcon: $('#profileIcon'),
        sStats: $('#summonerStats'),
        sName: $('#theSummonerName'),
        sLevel: $('#theSummonerLevel'),
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
        var ajaxReq = $.ajax({url: useProxy ? 'http://whateverorigin.org/get?callback=?&url=' + encodeURIComponent(url) : url, dataType: 'json'});
        ajaxReq.fail(function(e) {
            cb.call(this, false, e.status);
        });
        if (useProxy) {
            ajaxReq.done(function(e) {
                cb.call(this, JSON.parse(e.contents));
            });
        }
        else
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
    var ddVers = '6.2.1';
    
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
            data = rawJson[query.n.toLowerCase().replace(/\s/g, '')];
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
    
    var stats;
    
    var updateStats = function(rawJson) {
        if (!rawJson) {
            // Error handling
        }
        else
            stats = rawJson.playerStatSummaries;
    };
    
    var lineStyling = {
        fillColor: 'rgba(114, 202, 249, 0.3)',
        strokeColor: '#64b5f6',
        pointColor: '#2196f3',
        pointStrokeColor: '#1976d2',
        pointHighlightFill: '#42a5f5',
        pointHighlightStroke: '2196f3',
    };
    var lineStyling2 = {
        fillColor: 'rgba(129, 199, 132, 0.3)',
        strokeColor: '#81c7f4',
        pointColor: '#4caf50',
        pointStrokeColor: '#388e3c',
        pointHighlightFill: '#66bb6a',
        pointHighlightStroke: '4caf50',
    };
    var gpMapping = {};
    
    var aggregateStats = function() {
        console.log(gameData);
        console.log(games);
        $('#statLoading').hide();
        $('#statLoaded').show();
        var csData = {labels: [], datasets: [$.extend({}, {data: []}, lineStyling)]};
        for (var i = games.length - 1; i >= 0; i--) {
            csData.labels.push(i + 1);
            var creepKills = (games[i].stats.minionsKilled || 0) + (games[i].stats.neutralMinionsKilled || 0);
            var gameTime = gameData[i].gameDuration / 60;
            csData.datasets[0].data.push(Math.round(100 * creepKills / gameTime) / 100);
        }
        new Chart(document.getElementById('csChart').getContext('2d')).Line(csData);
        var wardData = {labels: [], datasets: [$.extend({}, {label: 'Placed', data: []}, lineStyling), $.extend({}, {label: 'Killed', data: []}, lineStyling2)]};
        for (var j = games.length - 1; j >= 0; j--) {
            wardData.labels.push(j + 1);
            wardData.datasets[0].data.push(games[j].stats.wardPlaced || 0);
            wardData.datasets[1].data.push(gpMapping[gameData[j].gameId].stats.wardsKilled || 0);
        }
        new Chart(document.getElementById('wardChart').getContext('2d')).Line(wardData);
    };
    
    var gbContent = '<div class="gbUpper">{upper}</div><div class="gbLower">{lower}</div><div class="detailsBtn"><i class="fa fa-ellipsis-h"></i></div>';
    var gbUpper = '<div class="gbUpperLeft"><img class="championLarge"/><div class="gameOutcome">{outcome}</div></div>\
        <div class="gbUpperRight"><div class="summonerSpells"></div><div class="gameItems"></div></div>';
    var gbLower = '<div class="gbLowerLeft"><div class="gameTime"><p>{gameTime}</p><div class="pipeBreak">|</div><p>{gameDate}</p></div><div class="gameType">{gameMode}</div></div>\
        <div class="gbLowerRight"><div class="gameStats">{gStats}</div><div class="gameStats">{gStats2}</div></div>';
    var gStats = '<div class="gameKda"><img class="statIcon statScore" src="static/img/score.png"/><p>{kda}</p></div>\
        <div class="gameCsStats"><img class="statIcon statMinion" src="static/img/minion.png"/><p>{creeps}<div class="pipeBreak">|</div>{cpm} CPM</p></div>';
    var kdaFormat = '{k} / {d} / {a}<div class="pipeBreak">|</div>{ratio}';
    var gStats2 = '<div class="gameLevel"><img class="statIcon statLevel" src="static/img/champion.png"/><p>Level {level}<div class="pipeBreak">|</div>{xpm} XPM</p></div>\
        <div class="gameGold"><img class="statIcon statGold" src="static/img/gold.png"/><p>{gold}<div class="pipeBreak">|</div>{gpm} GPM</p></div>';
    var gameType = {
        0: 'Custom Match', 8: 'Blind Pick 3v3', 2: 'Blind Pick 5v5', 14: 'Draft Pick 5v5',
        4: 'Solo Queue 5v5', 6: 'Ranked Premade 5v5', 9: 'Ranked Premade 3v3',
        41: 'Team Match 3v3', 42: 'Team Match 5v5', 16: 'Blind Pick Dominion',
        17: 'Draft Pick Dominion', 7: 'Botmatch 5v5', 25: 'Botmatch Dominion', 31: 'Botmatch 5v5',
        32: 'Botmatch 5v5', 33: 'Botmatch 5v5', 52: 'Botmatch 3v3',
        61: 'Team Builder 5v5', 65: 'Blind Pick ARAM', 70: 'One for All', 72: 'Showdown 1v1',
        73: 'Showdown 2v2', 75: 'SR Hexakill', 76: 'Ultra Rapid Fire', 83: 'URF Botmatch',
        91: 'Doom Bots', 92: 'Doom Bots', 93: 'Doom Bots',
        96: 'Ascension', 98: 'TT Hexakill', 100: 'Butcher\'s Bridge ARAM',
        300: 'King Poro', 310: 'Nemesis', 313: 'Black Market Brawlers'
    };
    var gameUrl = 'game.html?g={gid}&s={serv}&t={team}&c={cid}';
    
    var constructGameBlock = function(game, wGame) {
        var block = $('#gameBlock' + game.gameId);
        var players = {};
        var rPlayersCopy = game.participants.concat();
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
        var count = {100: 0, 200: 0};
        for (var k = 0; k < rPlayersCopy.length; k++)
            count[rPlayersCopy[k].teamId]++;
        if (count[100] > 1)
            thePlayer = players[data.id] = rPlayersCopy[count[100]];
        else
            thePlayer = players[data.id] = rPlayersCopy[0];
            
        gpMapping[game.gameId] = thePlayer;
        
        var won = wGame.stats.win;
        var upperCont = gbUpper.supplant({outcome: won ? 'VICTORY' : 'DEFEAT'});
        
        var modSec = game.gameDuration % 60;
        var gameTime = '{min}:{sec}'.supplant({min: (game.gameDuration - modSec) / 60, sec: modSec < 10 ? '0' + modSec : modSec});
        var gameDate = new Date(game.gameCreation).toDateString().slice(3);
        var kda = {k: wGame.stats.championsKilled || 0, d: wGame.stats.numDeaths || 0, a: wGame.stats.assists || 0};
        kda.kdr = Math.round((kda.k + kda.a) / kda.d * 100) / 100;
        kda.ratio = isNaN(kda.kdr) || kda.kdr === Infinity ? 'Perfect' : kda.kdr + ' : 1';
        var creeps = (wGame.stats.minionsKilled || 0) + (wGame.stats.neutralMinionsKilled || 0);
        var cpm = Math.round((creeps / game.gameDuration) * 6000) / 100;
        var gameStats = gStats.supplant({kda: kdaFormat.supplant(kda), creeps: creeps, cpm: cpm});
        var gold = wGame.stats.goldEarned;
        var gpm = Math.round((gold / game.gameDuration) * 6000) / 100;
        var gameStats2 = gStats2.supplant({level: wGame.stats.level, xpm: avg(thePlayer.timeline.xpPerMinDeltas), gold: gold, gpm: gpm});
        var lowerCont = gbLower.supplant({gameTime: gameTime, gameDate: gameDate, gameMode: gameType[game.queueId], gStats: gameStats, gStats2: gameStats2});
        
        block.html(gbContent.supplant({upper: upperCont, lower: lowerCont}));
        
        block.find('.gameOutcome').css('background-color', won ? '#81c784' : '#e57373');
        
        requestFromApi(query.s, Endpoint.champion, thePlayer.championId, function(j1) {
            block.find('.championLarge').attr('src', requestFromDd(DDPoint.championIcon, j1.key + '.png'));
        });
        requestFromApi(query.s, Endpoint.spell, thePlayer.spell1Id, function(j2) {
            block.find('.summonerSpells').prepend($('<img>', {src: requestFromDd(DDPoint.spellIcon, j2.key + '.png')}));
        });
        requestFromApi(query.s, Endpoint.spell, thePlayer.spell2Id, function(j3) {
            block.find('.summonerSpells').append($('<img>', {src: requestFromDd(DDPoint.spellIcon, j3.key + '.png')}));
        });
        for (var itemInd = 0; itemInd < 7; itemInd++) {
            var itemId = thePlayer.stats['item' + itemInd];
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
        
        var detailsBtn = block.find('.detailsBtn');
        (function(cPlayer) {
            detailsBtn.click(function() {
                document.location = gameUrl.supplant({gid: game.gameId, serv: query.s, team: cPlayer.teamId, cid: cPlayer.championId});
            });
        })(thePlayer);
        
        block.mouseenter(function(e) {
            detailsBtn.stop();
            detailsBtn.animate({width: '48px', height: '48px', 'font-size': '22px'}, 300);
        });
        block.mouseleave(function(e) {
            detailsBtn.stop();
            detailsBtn.animate({width: 0, height: 0, 'font-size': 0}, 300);
        });
    };
    
    var itemDescHtml = '<div class="itemName">{name}</div><div class="itemDesc">{desc}</div>';
    
    var constructItemTooltip = function(block) {
        return function(item) {
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
    
    var gameBlock = '<div class="gameBlock" id="gameBlock{gid}"></div>';
    var gameData = [];
    
    var appendGameData = function(wGame) {
        return function(game) {
            gameData.push(game);
            var ind = gameData.indexOf(game) + 1;
            if (ind >= gameData.length) {
                Controls.paneRight.append(gameBlock.supplant({gid: game.gameId}));
                constructGameBlock(game, wGame);
            }
            else {
                $('#gameBlock' + gameData[ind].gameId).before(gameBlock.supplant({gid: game.gameId}));
                constructGameBlock(game, wGame);
            }
            if (++gameDataIndex < games.length)
                requestFromAcs(query.s, games[gameDataIndex].gameId, appendGameData(games[gameDataIndex], gameDataIndex));
            else
                aggregateStats();
        };
    };
    
    var games;
    var gameDataIndex = 0;
    
    var updateGames = function(rawJson) {
        if (!rawJson) {
            // Error handling
        }
        else {
            games = rawJson.games;
            requestFromAcs(query.s, games[gameDataIndex].gameId, appendGameData(games[gameDataIndex], gameDataIndex));
        }
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
    
    Chart.defaults.global.responsive = true;
    Chart.defaults.global.tooltipTemplate = '<%= value %>';
    Chart.defaults.Line.bezierCurveTension = 0.314;
    
    var headerText = '<a href="http://{loc}" class="hiddenLink"><h2 id="headerLink">Chilling Smite</h2></a>';
    
    if (!loadQuery())
        $('#secondpage').remove();
    else {
        $('#firstpage').remove();
        $('#qForm').prepend(headerText.supplant({loc: document.location.host + document.location.pathname}));
        Controls.qName.val(query.n);
        Controls.qServ.val(query.s);
        requestFromApi(query.s, Endpoint.summonerByName, query.n, updatePage);
    }
    
});