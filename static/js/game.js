$(document).ready(function() {
    
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
        statsTable: $('#gsTable'),
        timelineTabs: $('#tsTabs'),
        timelineTable: [$('#tsTable1t'), $('#tsTable2t'), $('#tsTable3t'), $('#tsTable4t')],
        tooltip: $('#tooltip')
    };
    
    var data;
    var Team = {};
    var Players = {'100': [], '200': []}, Participants = {};
    
    var parseData = function(data) {
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
            
            $('#blueHeader').text(Team[100].win == 'Win' ? 'VICTORY' : 'DEFEAT');
            $('#redHeader').text(Team[200].win == 'Win' ? 'VICTORY' : 'DEFEAT');
            
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
            
            populateStats();
            populateTimeline();
            
            $.each(queuedNames, function(i, id) {
                requestFromApi(query.s, Endpoint.champion, id, function(j1) {
                    var imgHtml = '<img src="' + requestFromDd(DDPoint.championIcon, j1.key + '.png') + '"/>';
                    $('#gsHeader' + i).html(imgHtml);
                    $('.tsHeader' + i).html(imgHtml);
                });
            });
            
            Controls.paneBot.children('div').find('.expBtn').click(function(e) {
                var targetI = $(e.target);
                var targetDiv = targetI.parent().parent();
                targetDiv.children('.blockContents').slideToggle({duration: 800, queue: false});
                targetDiv.toggleClass('hiddenSb');
                targetI.toggleClass('fa-plus');
                targetI.toggleClass('fa-minus');
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
    var queueType = {
        0: 'CUSTOM', 8: 'NORMAL_3x3', 2: 'NORMAL_5x5_BLIND', 14: 'NORMAL_5x5_DRAFT', 4: 'RANKED_SOLO_5x5', 6: 'RANKED_PREMADE_5x5', 9: 'RANKED_PREMADE_3x3',
        41: 'RANKED_TEAM_3x3', 42: 'RANKED_TEAM_5x5', 16: 'ODIN_5x5_BLIND', 17: 'ODIN_5x5_DRAFT', 7: 'BOT_5x5', 25: 'BOT_ODIN_5x5', 31: 'BOT_5x5_INTRO',
        32: 'BOT_5x5_BEGINNER', 33: 'BOT_5x5_INTERMEDIATE', 52: 'BOT_TT_3x3', 61: 'GROUP_FINDER_5x5', 65: 'ARAM_5x5', 70: 'ONEFORALL_5x5', 72: 'FIRSTBLOOD_1x1',
        73: 'FIRSTBLOOD_2x2', 75: 'SR_6x6', 76: 'URF_5x5', 83: 'BOT_URF_5x5', 91: 'NIGHTMARE_BOT_5x5_RANK1', 92: 'NIGHTMARE_BOT_5x5_RANK2', 93: 'NIGHTMARE_BOT_5x5_RANK5',
        96: 'ASCENSION_5x5', 98: 'HEXAKILL', 100: 'BILGEWATER_ARAM_5x5', 300: 'KING_PORO_5x5', 310: 'COUNTER_PICK', 313: 'BILGEWATER_5x5'
    };
    
    var populateMatchOverview = function() {
        var createTime = new Date(data.gameCreation);
        var dateObj = {
            m: months[createTime.getMonth()], d: createTime.getDate(), y: createTime.getFullYear(),
            hr: createTime.getHours(), min: createTime.getMinutes()
        };
        if (dateObj.hr < 10) dateObj.hr = '0' + dateObj.hr;
        if (dateObj.min < 10) dateObj.min = '0' + dateObj.min;
        $('#ovTimestamp').html(OverviewContent.timestamp.supplant(dateObj));
        
        var modSec = data.gameDuration % 60;
        var gameTime = {m: (data.gameDuration - modSec) / 60, s: modSec < 10 ? '0' + modSec : modSec};
        $('#ovLength').html(OverviewContent.mLength.supplant(gameTime));
        
        $('#ovGamemode').html(OverviewContent.gamemode.supplant({gm: gameType[queueType[data.queueId]]}));
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
        var creeps = (player.stats.totalMinionsKilled || 0) + (player.stats.neutralMinionsKilled || 0);
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
    
    var sTable = [
        ['Summoner'],
        ['Champion Lane'], ['Champion Role'],
        ['<hr>'],
        ['Killing Sprees'], ['Largest Killing Spree'], ['Largest Multikill'], ['Towers Destroyed'], ['Inhibitors Destroyed'], ['First Blood?'],
        ['<hr>'],
        ['Physical Damage Dealt'], ['Magic Damage Dealt'], ['True Damage Dealt'], ['Total Damage Dealt'],
        ['Physical Damage to Champions'], ['Magic Damage to Champions'], ['True Damage to Champions'], ['Total Damage to Champions'],
        ['Crowd Control Dealt'], ['Largest Critical Strike'],
        ['<hr>'],
        ['Physical Damage Taken'], ['Magic Damage Taken'], ['True Damage Taken'], ['Total Damage Taken'],
        ['Health Healed'],
        ['<hr>'],
        ['Wards Placed'], ['Wards Destroyed'], ['Vision Wards Purchased'], ['Stealth Wards Purchased'],
        ['<hr>'],
        ['Gold Earned'], ['Gold Spent'], ['Minions Killed'], ['Neutral Monsters Killed'], ['Total Monsters Killed'],
        ['Allied Jungle Score'], ['Enemy Jungle Score']
    ];
    var queuedNames = [];
    var roles = {NONE: 'None', DUO: 'Duo Lane', SOLO: 'Solo Lane', DUO_CARRY: 'ADC', DUO_SUPPORT: 'Support'};
    var lanes = {TOP: 'Top', MID: 'Middle', MIDDLE: 'Middle', BOT: 'Bottom', BOTTOM: 'Bottom', JUNGLE: 'Jungle'};
    
    var populateStats = function() {
        $.each(Players, function(arrayKey, array) {
            $.each(array, function(i, player) {
                sTable[0].push('<div id="gsHeader{i}">Summoner {i}</div>'.supplant({i: i + (arrayKey == 200 ? 5 : 0)}));
                queuedNames.push(player.championId);
                sTable[1].push(lanes[player.timeline.lane]);
                sTable[2].push(roles[player.timeline.role]);
                sTable[4].push(player.stats.killingSprees);
                sTable[5].push(player.stats.largestKillingSpree);
                sTable[6].push(player.stats.largestMultiKill);
                sTable[7].push(player.stats.towerKills);
                sTable[8].push(player.stats.inhibitorKills);
                sTable[9].push(player.stats.firstBloodKill ? '<i class="fa fa-check"></i>' : '<i class="fa fa-times"></i>');
                sTable[11].push(player.stats.physicalDamageDealt);
                sTable[12].push(player.stats.magicDamageDealt);
                sTable[13].push(player.stats.trueDamageDealt);
                sTable[14].push(player.stats.totalDamageDealt);
                sTable[15].push(player.stats.physicalDamageDealtToChampions);
                sTable[16].push(player.stats.magicDamageDealtToChampions);
                sTable[17].push(player.stats.trueDamageDealtToChampions);
                sTable[18].push(player.stats.totalDamageDealtToChampions);
                sTable[19].push(player.stats.totalTimeCrowdControlDealt + ' Sec');
                sTable[20].push(player.stats.largestCriticalStrike);
                sTable[22].push(player.stats.physicalDamageTaken);
                sTable[23].push(player.stats.magicDamageTaken);
                sTable[24].push(player.stats.trueDamageTaken);
                sTable[25].push(player.stats.totalDamageTaken);
                sTable[26].push(player.stats.totalHeal);
                sTable[28].push(player.stats.wardsPlaced);
                sTable[29].push(player.stats.wardsKilled);
                sTable[30].push(player.stats.visionWardsBoughtInGame);
                sTable[31].push(player.stats.sightWardsBoughtInGame);
                sTable[33].push(player.stats.goldEarned);
                sTable[34].push(player.stats.goldSpent);
                sTable[35].push(player.stats.minionsKilled);
                sTable[36].push(player.stats.neutralMinionsKilled);
                sTable[37].push(player.stats.minionsKilled + player.stats.neutralMinionsKilled);
                sTable[38].push(player.stats.neutralMinionsKilledTeamJungle);
                sTable[39].push(player.stats.neutralMinionsKilledEnemyJungle);
            });
        });
        $.each(sTable, function(i, obj) {
            var tr = $('<tr>');
            $.each(obj, function(j, cont) {
                var td = $('<td>');
                td.html(cont);
                tr.append(td);
            });
            Controls.statsTable.append(tr);
        });
    };
    
    var tTableTemplate = [
        ['Summoner'], ['Lane'], ['Role'],
        ['<hr>'],
        ['CS Per Minute'], ['Gold Per Minute'], ['XP Per Minute'], ['Damage Taken Per Minute']
    ];
    var tTable = {
        zeroToTen: $.extend(true, {}, tTableTemplate),
        tenToTwenty: $.extend(true, {}, tTableTemplate),
        twentyToThirty: $.extend(true, {}, tTableTemplate),
        thirtyToEnd: $.extend(true, {}, tTableTemplate)
    };
    
    var populateTimeline = function() {
        $.each(Players, function(arrayKey, array) {
            $.each(array, function(pInd, player) {
                $.each(tTable, function(k, t) {
                    t[0].push('<div class="tsHeader{i}">Summoner {i}</div>'.supplant({i: pInd + (arrayKey == 200 ? 5 : 0)}));
                    t[1].push(lanes[player.timeline.lane]);
                    t[2].push(roles[player.timeline.role]);
                    t[4].push(Math.round(player.timeline.creepsPerMinDeltas[k] * 100) / 100);
                    t[5].push(Math.round(player.timeline.goldPerMinDeltas[k] * 100) / 100);
                    t[6].push(Math.round(player.timeline.xpPerMinDeltas[k] * 100) / 100);
                    t[7].push(Math.round(player.timeline.damageTakenPerMinDeltas[k] * 100) / 100);
                });
            });
        });
        var aTab = $.map(tTable, function(elem) {
            return elem;
        });
        $.each(aTab, function(tableInd, table) {
            $.each(table, function(i, obj) {
                var tr = $('<tr>');
                $.each(obj, function(j, cont) {
                    var td = $('<td>');
                    td.html(cont);
                    tr.append(td);
                });
                Controls.timelineTable[tableInd].append(tr);
            });
        });
        $(Controls.timelineTabs).children().each(function (i) {
            $(this).click(function(e) {
                var target = $(e.target);
                target.parent().children().removeClass('tsSelected');
                target.addClass('tsSelected');
                target.parent().parent().children('table').fadeOut({
                    duration: 500,
                    queue: false
                }).promise().done(function () {
                    $('#' + target.attr('id') + 't').fadeIn({
                        duration: 500,
                        queue: false
                    });
                });
            });
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