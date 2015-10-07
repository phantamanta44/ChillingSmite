$(document).ready(function() {
    
    var Controls = {
        qSubmit: $('#submit'),
        qName: $('#inputName'),
        qServ: $('#inputServ')
    };
    
    var req;
    var validServers = ['na', 'euw', 'eune', 'kr', 'oce', 'ru', 'tr', 'las', 'lan', 'br'];
    
    var loadQuery = function() {
        req = {};
        var getRequest = document.location.search.slice(1);
        var pairs = getRequest.split('&');
        for (var i = 0; i < pairs.length; i++) {
            var pair = pairs[i].split(/=(.+)/);
            req[pair[0]] = decodeURIComponent(pair[1]);
        }
        return req.n && req.s && (validServers.indexOf(req.s) != -1);
    }
    
    Controls.qSubmit.click(function(e) {
        if (Controls.qName.val())
            window.location = '?n=' + Controls.qName.val() + '&s=' + Controls.qServ.val();
    }); 
    
    Controls.qName.keydown(function(e) {
        if (e.keyCode === 13 && !e.shiftKey)
        Controls.qSubmit.click();
    })
    
    if (!loadQuery())
        $('#secondpage').remove();
    else {
        $('#firstpage').remove();
        console.log('lol');
        Controls.qName.val(req.n);
        Controls.qServ.val(req.s);
    }
    
});