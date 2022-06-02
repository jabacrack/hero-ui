                                                                                                                           

var wsClient;

function gv_log(data) {
	if (typeof console == "object" && console && window.gv_debug == true) {
		console.log(data);
	}
}

function gv_error(data) {
	if (typeof console == "object" && console && window.gv_debug == true) {
		console.error(data);
	}
}


function WsClient(ws_url, packet_handler) {
	this.ws_url = ws_url;
	this.packet_handler = packet_handler;	
	this.retry_cnt = 0;
	this.transport_name = "websockets";
	this.ws_conn_interval_id = 0;
	this.data_rcv_timeout = 0;
	this.error_cnt = 0;
}

WsClient.prototype.set_callbacks = function(clbk_object, con_failed) {
	wsClient.packet_handler.callback_obj = clbk_object;
	wsClient.connection_failed = con_failed;
}

WsClient.prototype.check_ws_connection = function() {
	wsClient.on_close();
}

WsClient.prototype.connect = function(){
	
  	wsClient.ws_conn_interval_id = setTimeout(wsClient.check_ws_connection, 4000);
  	var client = new WebSocket(wsClient.ws_url);

   	
    client.onmessage = wsClient.on_message;
    client.onclose = wsClient.on_close;
	client.onerror = wsClient.on_close;
    client.onopen = wsClient.on_open;

	var err_data = [];
	err_data['proto'] = wsClient.transport_name;
	wsClient.packet_handler.notify_status.apply(wsClient.packet_handler, ['connecting', err_data]);	
}

WsClient.prototype.date_rcv_timeout = function() {
	wsClient.on_close();
}


WsClient.prototype.on_open = function(){
	if (wsClient.ws_conn_interval_id != 0){
		window.clearTimeout(wsClient.ws_conn_interval_id);
		wsClient.ws_conn_interval_id = 0;		
	}
	
	wsClient.data_rcv_timeout = setTimeout(wsClient.date_rcv_timeout, 3000);
	wsClient.ws_set_connected_status();
	
}

WsClient.prototype.ws_set_connected_status = function() {
	if (typeof(localStorage) != 'undefined' ) {
		try {
			localStorage.setItem('ws_connected', 'true');
		} catch (e) {}
	}
}


WsClient.prototype.ws_get_connected_status = function() {
	if (typeof(localStorage) != 'undefined' ) {
		if (localStorage.getItem('ws_connected') == 'true') {
			return true;
		}
		else {
			return false;
		}
	}	
}

WsClient.prototype.on_close = function(code){
	if (wsClient.ws_conn_interval_id!=0) {
		window.clearTimeout(wsClient.ws_conn_interval_id);
		wsClient.ws_conn_interval_id = 0;		
	}
	
	if (wsClient.data_rcv_timeout !=0) {
		window.clearTimeout(wsClient.data_rcv_timeout);
		wsClient.data_rcv_timeout = 0;
	}
	
	
	if (wsClient.ws_get_connected_status() == false) {
		wsClient.retry_cnt = 0;
	}
	else {
		wsClient.retry_cnt = 3;
	}	
	
	wsClient.packet_handler.state = 'disconnected';
	if (wsClient.error_cnt < wsClient.retry_cnt) {
		wsClient.error_cnt++;
		var timeout = wsClient.error_cnt*10;
		var err_data = [];
		err_data['timeout'] = timeout;
		err_data['proto'] = wsClient.transport_name;
		wsClient.packet_handler.notify_status.apply(wsClient.packet_handler, ['error', err_data]);
		setTimeout(wsClient.connect, timeout*1000);
	}
	else {
		var err_data = [];
		err_data['proto'] = wsClient.transport_name;		
		wsClient.packet_handler.notify_status.apply(wsClient.packet_handler, ['failed', err_data]);
		wsClient.connection_failed(wsClient.transport_name);
	}
}

WsClient.prototype.on_message = function(s){
	wsClient.error_cnt = 0;
	if (wsClient.data_rcv_timeout !=0) {
		window.clearTimeout(wsClient.data_rcv_timeout);
		wsClient.data_rcv_timeout = 0;
	}							
	wsClient.packet_handler.on_data.apply(wsClient.packet_handler, [wsClient.transport_name, s.data]);
	
}

WsClient.prototype.unload = function() {
}

var pollClient;

function PollClient(packet_handler, url, period) {
	this.transport_name = 'poll';
	this.packet_handler = packet_handler;
	this.timer_id = 0;
	this.url = url;
	this.period = period; // in seconds
	this.connected = false;
}

PollClient.prototype.set_callbacks = function(clbk_object, con_failed){
	this.packet_handler.callback_obj = clbk_object;	
}

PollClient.prototype.updater = function(){
	var jqxhr = $.getJSON(pollClient.url, function(data) {
		if (pollClient.connected == false) {
			pollClient.connected = true;
			var err_data = [];
			err_data['proto'] = pollClient.transport_name;		
			pollClient.packet_handler.notify_status.apply(pollClient.packet_handler, ['connected', err_data]);
		}
		pollClient.packet_handler.on_data.apply(pollClient.packet_handler, [pollClient.transport_name, data]);
	})
	.error(function() { 
		var err_data = [];
		err_data['timeout'] = this.period;
		err_data['proto'] = pollClient.transport_name;		
		pollClient.packet_handler.notify_status.apply(pollClient.packet_handler, ['error', err_data]);
		pollClient.connected = false;
	});	
}

PollClient.prototype.single_fetch = function(ref, continue_func){
	var jqxhr = $.getJSON(pollClient.url, function(data) {
		pollClient.packet_handler.on_data.apply(pollClient.packet_handler, [pollClient.transport_name, data]);
		continue_func.call(ref);
	})	
}

PollClient.prototype.connect = function(){
	if (pollClient.timer_id != 0) {
		window.clearInterval(pollClient.timer_id);
	}
	var err_data = [];
	err_data['proto'] = pollClient.transport_name;		
	pollClient.packet_handler.notify_status.apply(pollClient.packet_handler, ['connecting', err_data]);	
	pollClient.interval_id = setInterval(pollClient.updater, pollClient.period * 1000);	
}

PollClient.prototype.on_message = function(data){
	this.error_cnt = 0;	
	if (pollClient.timer_id != 0) {
		window.clearInterval(pollClient.timer_id);
		pollClient.timer_id = 0;
	}
	
}

PollClient.prototype.unload = function(){
	if (pollClient.timer_id != 0) {
		window.clearInterval(pollClient.timer_id);
		pollClient.timer_id = 0;
	}
}

var orbClient;

function OrbClient(packet_handler) {
	this.g_client = new GClient();
	this.error_cnt = 0;
	this.conn_timeout = 0;
	this.data_rcv_timeout = 0;
	this.connected = false;

	this.transport_name = 'comet';
	this.packet_handler = packet_handler;
    this.transport_enabled;
}

OrbClient.prototype.set_callbacks = function(clbk_object, con_failed){
	this.packet_handler.callback_obj = clbk_object;
	this.connection_failed = con_failed;
}

OrbClient.prototype.on_close = function(code){
	if (orbClient.data_rcv_timeout !=0) {
		window.clearTimeout(orbClient.data_rcv_timeout);
		orbClient.data_rcv_timeout = 0;
	}							
	
	orbClient.connected = false;
	orbClient.packet_handler.state = 'disconnected';
	if (orbClient.error_cnt < 3) {
		orbClient.error_cnt++;
		timeout = orbClient.error_cnt*10;
		var err_data = [];
		err_data['code'] = code;
		err_data['timeout'] = timeout;
		err_data['proto'] = orbClient.transport_name;
		orbClient.packet_handler.notify_status.apply(orbClient.packet_handler, ['error', err_data]);
		setTimeout(orbClient.connect, timeout*1000);
	}
	else {
		var err_data = [];
		err_data['proto'] = orbClient.transport_name;				
		if (orbClient.transport_enabled) {
			orbClient.packet_handler.notify_status.apply(orbClient.packet_handler, ['failed', err_data]);
			orbClient.connection_failed(orbClient.transport_name);
			orbClient.transport_enabled = false;
		}   
	}
}

orb_data_rcv_timeout_f = function(){
	orbClient.on_close('timeout');
}

OrbClient.prototype.on_open = function(){
	if (orbClient.data_rcv_timeout !=0) {
		window.clearTimeout(orbClient.data_rcv_timeout);
	}
	if (orbClient.conn_timeout !=0) {
		window.clearTimeout(orbClient.conn_timeout);
		orbClient.conn_timeout = 0;
	}
	orbClient.connected = true;
	orbClient.data_rcv_timeout = setTimeout(orb_data_rcv_timeout_f, 10000);	

	orbClient.g_client.send('subscribe');
}

OrbClient.prototype.connect = function(){
	var client = orbClient.g_client;
	
    client.onmessage = orbClient.on_message;
    client.onclose = orbClient.on_close;
    client.onopen = orbClient.on_open;

	orbClient.conn_timeout = setTimeout(orb_data_rcv_timeout_f, 10000);	

	var err_data = [];
	err_data['proto'] = orbClient.transport_name;
	orbClient.packet_handler.notify_status.apply(orbClient.packet_handler, ['connecting', err_data]);
	client.connect('localhost', GvPushPort, true);	
}


OrbClient.prototype.on_message = function(data){
	orbClient.error_cnt = 0;	
	if (orbClient.data_rcv_timeout !=0) {
		window.clearTimeout(orbClient.data_rcv_timeout);
		orbClient.data_rcv_timeout = 0;
	}							
	orbClient.packet_handler.on_data.apply(orbClient.packet_handler, [orbClient.transport_name, data]);
}

OrbClient.prototype.unload = function(){
	if (orbClient.g_client) {
		orbClient.g_client.reset();
	}
}

/*
function TestStatusObserver() {
}

TestStatusObserver.prototype.on_status_changed = function (status, data){
	var str = 'status: '+status;
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
	gv_log(str);
}

TestStatusObserver.prototype.on_json = function(json_data) {
	gv_log(json_data);
}

TestStatusObserver.prototype.on_s_expired_callback = function() {
//	window.location.href = '/hero';
}
*/

var Hero = {    	
   		
	transport_failed: function(transport) {
		// restart with next available transport
		gv_error(transport + ' transport failed');
		if (Hero.current_transport == Hero.ws_client_ref) {
			if (Hero.c_mode_enabled == true) {
				Hero.current_transport = Hero.orb_client_ref;
			}
			else {
				Hero.current_transport = Hero.poll_client_ref;
			}
			Hero.current_transport.connect();
		}
		else if (Hero.poll_client_ref && Hero.current_transport == Hero.orb_client_ref) {
			Hero.current_transport = Hero.poll_client_ref;
			Hero.current_transport.connect();			
		}
		
	},
	
	// set external callbacks
	set_callbacks: function(clbk_obj) {
		if (this.ws_client_ref) {
			this.ws_client_ref.set_callbacks(clbk_obj, this.transport_failed);
		}
		if (this.orb_client_ref) {
			this.orb_client_ref.set_callbacks(clbk_obj, this.transport_failed);
		}
		if (this.poll_client_ref) {
			this.poll_client_ref.set_callbacks(clbk_obj, this.transport_failed);
		}
		
	},
	
	// initiate connection
	connect: function() {
		if (this.t_mode_enabled == false) {
			Hero.current_transport = Hero.poll_client_ref;
		}
		else {
			if ("WebSocket" in window) {
			  this.current_transport = this.ws_client_ref;
			}
			else {
				this.current_transport = this.orb_client_ref;
			}			
		}
		
		this.current_transport.connect();
				
        onunload = function() {
			wsClient.unload();
			orbClient.unload();			
        }		
	},
 
	
	init: function(proto, s_proto, observer, channel_id, wsurl, poll_url, poll_t) {
		if (s_proto) {
			this.poll_client_ref = pollClient = new PollClient(s_proto, poll_url, poll_t);
		}
		
		this.ws_client_ref = wsClient = new WsClient(wsurl, proto);
		this.orb_client_ref = orbClient = new OrbClient(proto);
		
		if (observer.is_turbo_mode_enabled) {
			this.t_mode_enabled = observer.is_turbo_mode_enabled.call(observer);
		}
		if (observer.is_comet_mode_enabled) {
			this.c_mode_enabled = observer.is_comet_mode_enabled.call(observer);
		}
		else {
			this.c_mode_enabled = true;
		}
		
		Hero.set_callbacks(observer);
		if (s_proto) {
			this.poll_client_ref.single_fetch(this, Hero.connect);
		}
		else {
			Hero.connect();
		}
	}
}
