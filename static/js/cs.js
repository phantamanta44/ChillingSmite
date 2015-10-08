$(document).ready(function() {
    
    var Controls = {
        qSubmit: $('#submit'),
        qName: $('#inputName'),
        qServ: $('#inputServ')
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
    
    var reqLoaded = false, reqData;
    
    var requestFromApi = function(serv, ept, params) {
        var request = baseRequest.replace('$serv', serv);
        var req = new XMLHttpRequest();
        req.addEventListener('load', function(data) {
            reqData = req.responseText;
            reqLoaded = true;
        });
        req.open('GET', request);    
        req.send();
        while (!reqLoaded) { /* Wait for it... */ }
        reqLoaded = false;
        return reqData;
    };
    
    Controls.qSubmit.click(function(e) {
        if (Controls.qName.val())
            window.location = '?n=' + Controls.qName.val() + '&s=' + Controls.qServ.val();
    }); 
    
    Controls.qName.keydown(function(e) {
        if (e.keyCode === 13)
            Controls.qSubmit.click();
    })
    
    var headerText = '<a href="http://$loc" class="hiddenLink"><h2 id="headerLink">Chilling Smite</h2></a>';
    
    if (!loadQuery())
        $('#secondpage').remove();
    else {
        $('#firstpage').remove();
        $('#qForm').prepend(headerText.replace('$loc', document.location.host + document.location.pathname));
        Controls.qName.val(query.n);
        Controls.qServ.val(query.s);
    }
    
});