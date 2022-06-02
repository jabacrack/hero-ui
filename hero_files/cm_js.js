function JsProto(){
	this.buffer="";	
	this.callback_obj = null;
	this.state='disconnected';	
}

JsProto.prototype.on_data = function(proto, s){
	exp_string = "window.location.href = '/hero';"
	connect_string = "Hero.connected();";
	if (s.substring(0, exp_string.length) == exp_string) {
		this.callback_obj.on_s_expired_callback.call(this.callback_obj);
	}	
	else if (this.state == 'disconnected' && s.substring(0,connect_string.length) == connect_string) {
		var err_data = [];
		err_data['proto'] = proto;
		this.notify_status('connected', err_data);
		this.state = 'connected';
		
	}
	else if (this.state == 'connected') {
		try {
			if (this.buffer.length > 0) {
				this.buffer = this.buffer + s;
				eval(this.buffer);
				this.buffer = "";
			}
			else {
				eval(s);
			}
		}
		catch (err) {
			this.buffer = this.buffer + s;
		//console.log(s);
		}
	}
},
	
JsProto.prototype.notify_status = function(status, data){
	this.callback_obj.on_status_changed.apply(this.callback_obj, [status, data]);
}

var elsapsed = 0;
var timeout = 0;
var interval_id = 0;

function track_event(category, action) {
	if (typeof(pageTracker) != 'undefined') {
		pageTracker._trackEvent(category, action);
	}
}


function HeroStatusObserver(a_turbo) {
	this.a_turbo = a_turbo;
}

HeroStatusObserver.prototype.display_timer = function() {
	elapsed++;
	if (timeout-elapsed > 0) {
		$('p_status').innerHTML = Loc.TurboReconnect + (timeout-elapsed) + Loc.TurboReconnectSec;
	}
	else {
		if (interval_id != 0) {
			window.clearInterval(interval_id);
			interval_id = 0;
		}						
	}	
}

HeroStatusObserver.prototype.set_status = function (text){
	light = $('turbo_light');
	light.title = text
}

HeroStatusObserver.prototype.on_status_changed = function (status, data){
	if (false) {
		str = 'status: '+status;
		if (data) {
			if (data['proto']) {
				str += ' proto:'+data['proto'];
			}
			if (data['code']) {
				str += ' code:'+data['code'];
			}
			if (data['timeout']) {
				str += ' timeout:'+data['timeout'];
			}
		}
//		console.log(str);		
	}
	if (status == 'connecting') {  
		this.set_status(Loc.TurboOnStatus);
		if (interval_id != 0) {
			window.clearInterval(interval_id);
			interval_id = 0;			
		}
		url = $('turbo_light').src;
		url = url.replace(/l_red/,"l_yellow");
		$('turbo_light').src = url;
	}
	else if (status == 'connected') {
		proto = data['proto'];
		url = $('turbo_light').src;
		if (proto == 'comet') {
			url = url.replace(/l_red/,"l_green");
			url = url.replace(/l_yellow/,"l_green");
			this.set_status(Loc.TurboOnConnected);
			track_event('turbo', 'connected_comet');
		}
		if (proto == 'websockets') {
			url = url.replace(/l_red/,"l_green");
			url = url.replace(/l_yellow/,"l_blue");
			this.set_status(Loc.TurboOnConnectedWS);
			track_event('turbo', 'connected_ws');
		}
		$('p_status').innerHTML = "";
		$('turbo_light').src = url;		
		if (this.a_turbo == '1') {
			// notify auto-turbo success
			this.a_turbo = '0';
			track_event('auto-turbo', 'on');
			new Ajax.Request('/hero/at_on', {});			
			jar.put('turbo', "1");
		}
	}
	else if (status == 'error') {
		proto = data['proto'];
		timeout = data['timeout'];
		if (proto == 'comet') {
			code = data['code'];

			var msg = Loc.TurboConnectionError;
			if (code) {
				msg += " (" + Loc.TurboConnectionCode + code + ").";
			}
			$('p_status').innerHTML = msg;
			this.set_status(Loc.TurboConnectionErrorTooltip);
			if (this.a_turbo == '1') {
				// notify auto-turbo failure
				track_event('auto-turbo', 'off');
				new Ajax.Request('/hero/at_off', {
					onComplete: function(transport) {
						jar.put('turbo', "0");
						window.location.href = '/hero';
					}
				});
			}
		}
		if (proto == 'websockets') {
			$('p_status').innerHTML = Loc.TurboConnectionError
			this.set_status(Loc.TurboConnectionErrorTooltip);
		}
		elapsed=0;
		interval_id = setInterval(this.display_timer, 1000);
		url = $('turbo_light').src;
		url = url.replace(/l_green/,"l_yellow");
		url = url.replace(/l_blue/,"l_yellow");
		$('turbo_light').src = url;					
	}
	else if (status == 'failed') {
		if (proto == 'comet') {
			$('p_status').innerHTML = Loc.TurboConnectionError + " (" + Loc.TurboConnectionCode + code + "). <br/>" + Loc.TurboConnectionCodeDesc;
			track_event('turbo', 'red_light');
		}
		if (proto == 'websockets') {
			$('p_status').innerHTML = Loc.TurboConnectionErrorWS;
			track_event('turbo', 'red_light_ws');
		}
		url = $('turbo_light').src;
		url = url.replace(/l_yellow/,"l_red");
		url = url.replace(/l_green/,"l_red");
		url = url.replace(/l_blue/,"l_red");
		$('turbo_light').src = url;
		
	}
}

HeroStatusObserver.prototype.on_json = function(json_data) {
//	console.log(json_data);
}

HeroStatusObserver.prototype.on_s_expired_callback = function() {
	window.location.href = '/hero';
}

Event.observe(window, 'load', function() { 
	if ("WebSocket" in window) {
		track_event('turbo', 'have_ws');
	}
	else {
		track_event('turbo', 'no_ws');
	}
});
