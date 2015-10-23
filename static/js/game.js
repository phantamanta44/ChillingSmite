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
        paneTop: $('#topPane'),
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
        item: {vers: 'v1.2', url: 'https://global.api.pvp.net/api/lol/static-data/{serv}/{vers}/item/{params}'},
        match: {vers: 'v2.2', url: 'https://{serv}.api.pvp.net/api/lol/{serv}/{vers}/match/{params}', qParams: '&includeTimeline=true'}
    };
    var baseRequest = '{req}?api_key={cache}';
    
    var requestFromApi = function(serv, ept, params, cb) {
        var request = baseRequest.supplant({req: ept.url.supplant({serv: serv, vers: ept.vers, params: params}), cache: getCachedData()});
        if (ept.qParams)
            request += ept.qParams;
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

    var data;
    var Team = {};
    var Players = {'100': [], '200': []}, Participants = {};
    
    var parseData = function(data) {
        console.log(data); // DELETE the underlined portion DELETE the underlined portion DELETE the underlined portion DELETE the underlined portion
        $.each(data.teams, function(i, obj) {
            Team[obj.teamId] = obj;
        });
        $.each(data.participants, function(i, obj) {
            Players[obj.teamId].push(obj);
        });
        $.each(data.participantIdentities, function(i, obj) {
            Participants[obj.participantId] = obj;
        });
    };
    
    var updatePage = function(rawJson) {
        if (!rawJson) {
            Controls.paneTop.remove();
            Controls.paneLeft.remove();
            Controls.paneRight.remove();
            Controls.paneBot.remove();
            Controls.paneError.text('Game not found!');
        }
        else {
            data = rawJson;
            Controls.paneError.remove();
            parseData(data);
            
            $('#blueHeader').text(Team[100].winner ? 'VICTORY' : 'DEFEAT');
            $('#redHeader').text(Team[200].winner ? 'VICTORY' : 'DEFEAT');
            
            populateMatchOverview();
            
            $.each(Players[100], function(i, obj) {
                var block = $('<div>', {class: 'playerBlock'});
                Controls.paneLeft.append(block);
                constructPlayerBlock(block, obj, Participants[obj.participantId], data);
            });
            $.each(Players[200], function(i, obj) {
                var block = $('<div>', {class: 'playerBlock'});
                Controls.paneRight.append(block);
                constructPlayerBlock(block, obj, Participants[obj.participantId], data);
            });
        }
    };
    
    var OverviewContent = {
        timestamp: '{m} {d}, {y}<div class="pipeBreak">|</div>{hr}:{min}',
        mLength: 'Game Time: {m}:{s}',
        gamemode: '{gm}',
        serv: '{serv}',
        score: '{bk} / {bd} / {ba}<div class="pipeBreak">|</div>{rk} / {rd} / {ra}'
    };
    var months = ['Janurary', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    var servName = {
        NA1: 'North America', EUW1: 'Europe West', EUN1: 'Europe Nordic/East', KR: 'Korea',
        OC1: 'Oceania', RU: 'Russia', TR1r: 'Turkey', LA2: 'Latin America South', LA1: 'Latin America North',
        BR1: 'Brazil'
    };
    var gameType = {
        CUSTOM: 'Custom Match', NORMAL_3x3: 'Blind Pick 3v3', NORMAL_5x5_BLIND: 'Blind Pick 5v5', NORMAL_5x5_DRAFT: 'Draft Pick 5v5',
        RANKED_SOLO_5x5: 'Solo Queue 5v5', RANKED_PREMADE_5x5: 'Ranked Premade 5v5', RANKED_PREMADE_3x3: 'Ranked Premade 3v3',
        RANKED_TEAM_3x3: 'Team Match 3v3', RANKED_TEAM_5x5: 'Team Match 5v5', ODIN_5x5_BLIND: 'Blind Pick Dominion',
        ODIN_5x5_DRAFT: 'Draft Pick Dominion', BOT_5x5: 'Botmatch 5v5', BOT_ODIN_5x5: 'Botmatch Dominion', BOT_5x5_INTRO: 'Intro Botmatch 5v5',
        BOT_5x5_BEGINNER: 'Beginner Botmatch 5v5', BOT_5x5_INTERMEDIATE: 'Intermediate Botmatch 5v5', BOT_TT_3x3: 'Botmatch 3v3',
        GROUP_FINDER_5x5: 'Team Builder 5v5', ARAM_5x5: 'Blind Pick ARAM', ONEFORALL_5x5: 'One for All', FIRSTBLOOD_1x1: 'Snowdown Showdown 1v1',
        FIRSTBLOOD_2x2: 'Snowdown Showdown 2v2', SR_6x6: 'Summoners\' Rift Hexakill', URF_5x5: 'Ultra Rapid Fire', BOT_URF_5x5: 'Ultra Rapid Fire Botmatch',
        NIGHTMARE_BOT_5x5_RANK1: 'Rank 1 Doom Bots', NIGHTMARE_BOT_5x5_RANK2: 'Rank 2 Doom Bots', NIGHTMARE_BOT_5x5_RANK5: 'Rank 5 Doom Bots',
        ASCENSION_5x5: 'Ascension', HEXAKILL: 'Twisted Treeline Hexakill', BILGEWATER_ARAM_5x5: 'Butcher\'s Bridge ARAM',
        KING_PORO_5x5: 'King Poro', COUNTER_PICK: 'Nemesis', BILGEWATER_5x5: 'Black Market Brawlers'
    };
    
    var populateMatchOverview = function() {
        var createTime = new Date(data.matchCreation);
        var dateObj = {
            m: months[createTime.getMonth()], d: createTime.getDate(), y: createTime.getFullYear(),
            hr: createTime.getHours(), min: createTime.getMinutes()
        };
        if (dateObj.hr < 10) dateObj.hr = '0' + dateObj.hr;
        if (dateObj.min < 10) dateObj.min = '0' + dateObj.min;
        $('#ovTimestamp').html(OverviewContent.timestamp.supplant(dateObj));
        
        var modSec = data.matchDuration % 60;
        var gameTime = {m: (data.matchDuration - modSec) / 60, s: modSec < 10 ? '0' + modSec : modSec};
        $('#ovLength').html(OverviewContent.mLength.supplant(gameTime));
        
        $('#ovGamemode').html(OverviewContent.gamemode.supplant({gm: gameType[data.queueType]}));
        $('#ovServ').html(OverviewContent.serv.supplant({serv: servName[data.platformId]}));
        
        var playerCounts = {100: {k: 0, d: 0, a: 0}, 200: {k: 0, d: 0, a: 0}};
        $.each(data.participants, function(k, v) {
            playerCounts[v.teamId].k += v.stats.kills;
            playerCounts[v.teamId].d += v.stats.deaths;
            playerCounts[v.teamId].a += v.stats.assists;
        });
        $('#ovScore').html(OverviewContent.score.supplant({
            bk: playerCounts[100].k, bd: playerCounts[100].d, ba: playerCounts[100].a,
            rk: playerCounts[200].k, rd: playerCounts[200].d, ra: playerCounts[200].a
        }));
    };
    
    var pbContent = '<div class="gbLeft"><div class="champContainer"><img class="championLarge"/></div><span class="summonerName"></span>\
        </div><div class="gbRight"><div class="gbUpper">{upper}</div><div class="gbLower">{lower}</div></div>';
    var pbUpper = '<div class="centerHelper"></div><div class="summonerSpells"></div><div class="gameItems"></div>';
    var pbLower = '<div class="gameStats">{gStats}</div><div class="gameStats">{gStats2}</div>';
    var pStats = '<div class="gameKda"><img class="statIcon statScore" src="static/img/score.png"/><p>{kda}</p></div>\
        <div class="gameCsStats"><img class="statIcon statMinion" src="static/img/minion.png"/><p>{creeps}<div class="pipeBreak">|</div>{cpm} CPM</p></div>';
    var kdaFormat = '{k} / {d} / {a}<div class="pipeBreak">|</div>{ratio}';
    var pStats2 = '<div class="gameLevel"><img class="statIcon statLevel" src="static/img/champion.png"/><p>Level {level}<div class="pipeBreak">|</div>{xpm} XPM</p></div>\
        <div class="gameGold"><img class="statIcon statGold" src="static/img/gold.png"/><p>{gold}<div class="pipeBreak">|</div>{gpm} GPM</p></div>';
    
    var constructPlayerBlock = function(block, player, ident, game) {
        var kda = {k: player.stats.kills || 0, d: player.stats.deaths || 0, a: player.stats.assists || 0};
        kda.kdr = Math.round((kda.k + kda.a) / kda.d * 100) / 100;
        kda.ratio = isNaN(kda.kdr) || kda.kdr === Infinity ? 'Perfect' : kda.kdr + ' : 1';
        var creeps = (player.stats.minionsKilled || 0) + (player.stats.neutralMinionsKilled || 0);
        var cpm = Math.round((creeps / game.matchDuration) * 6000) / 100;
        var gameStats = pStats.supplant({kda: kdaFormat.supplant(kda), creeps: creeps, cpm: cpm});
        var gold = player.stats.goldEarned;
        var gpm = Math.round((gold / game.matchDuration) * 6000) / 100;
        var gameStats2 = pStats2.supplant({level: player.stats.champLevel, xpm: avg(player.timeline.xpPerMinDeltas), gold: gold, gpm: gpm});
        var lowerCont = pbLower.supplant({gStats: gameStats, gStats2: gameStats2});
        
        block.html(pbContent.supplant({upper: pbUpper, lower: lowerCont}));
        
        if ((query.t == player.teamId) && (query.c == player.championId))
            block.css('background-color', '#bbdefb');
            
        var noIdentity = false;
        if (ident.player) {
            block.find('.summonerName').text(ident.player.summonerName);
            appendRank(player, block);
        }
        else
            noIdentity = true;
        
        requestFromApi(query.s, Endpoint.champion, player.championId, function(j1) {
            block.find('.championLarge').attr('src', requestFromDd(DDPoint.championIcon, j1.key + '.png'));
            if (noIdentity) {
                block.find('.summonerName').text(j1.name);
                appendRank(player, block);
            }
        });
        
        requestFromApi(query.s, Endpoint.spell, player.spell1Id, function(j2) {
            block.find('.summonerSpells').prepend($('<img>', {src: requestFromDd(DDPoint.spellIcon, j2.key + '.png')}));
        });
        
        requestFromApi(query.s, Endpoint.spell, player.spell2Id, function(j3) {
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
    
    var rankedColors = {BRONZE: '#855b1f', SILVER: '#aaa', GOLD: '#bf9d3e', PLATINUM: '#26a3d9', DIAMOND: '#02a4d3', MASTER: '#92ada9', CHALLENGER: '#f0d878'};
        
    var appendRank = function(player, block) {
        switch (player.highestAchievedSeasonTier) {
            case 'UNRANKED':
                break;
            case 'MASTER':
            case 'CHALLENGER':
                block.find('.summonerName').prepend($('<i>', {class: 'fa fa-dot-circle-o rankIcon', style: 'color: ' + rankedColors[player.highestAchievedSeasonTier] + ';'}));
                break;
            default:
                block.find('.summonerName').prepend($('<i>', {class: 'fa fa-circle rankIcon', style: 'color: ' + rankedColors[player.highestAchievedSeasonTier] + ';'}));
                break;
        }
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
        requestFromApi(query.s, Endpoint.match, query.g, updatePage);
    }
    
});