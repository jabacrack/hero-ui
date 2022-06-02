var AOG = {
  check_form: function() {
	element = "god_phrase"
	max_size = 80
 	trimmed_str = $F(element).replace(/^\s+|\s+$/g, '') ;
	if($F(element).length > max_size) {
		$('s_'+element).show();
		return false;
	}
	else {
		$('s_'+element).hide();
		Element.show('spinner_god_acts');
		$('god_phrase_btn').value = Loc.Sending;
		$('god_phrase_btn').disabled=true;
		return true;
	}
  },

  reset_form: function() {
	$('god_phrase_form').down('form').god_phrase.value='';
  }, 

  ShowLabel: function( label, input ) {
	if ( document.getElementById( input ).value == "" )
		document.getElementById( label ).style.display = "";
  },
	
  HideLabel: function( label, input ) {
	document.getElementById( label ).style.display = 'none';
	document.getElementById( input ).focus();
  },

  check_god_phrase_lenght: function() {
	if ($('god_phrase').value.length > 80) {
		if ($('s_god_phrase').visible() == false)
			Element.show('s_god_phrase');
	}   
	else {
		if ($('s_god_phrase').visible() == true)
			Element.hide('s_god_phrase');
	}
  }   	
}

var HINTS = {
	show_next_hint: function() {
		if ($('app_bar').visible() == false){
			new Effect.BlindDown('app_bar', {queue:'end'});
		}   
		else {
			new Effect.Highlight("app_bar",{endcolor:'#FFFFCC', queue:'end', startcolor:'#ECECFF'});
		}
	}
}

var jar = new CookieJar({ 
     expires:63113851,   // 2 years
     path: '/hero' 
});

var arena_interval_id = 0;         

function fireEvent(element,event){ 
  if(document.createEvent){ 
    // dispatch for firefox + others 
    var evt = document.createEvent('HTMLEvents'); 
    evt.initEvent(event, true, true ); // event type,bubbling,cancelable 
    return !element.dispatchEvent(evt); 
  } else { 
    // dispatch for IE 
    var evt = document.createEventObject(); 
    return element.fireEvent('on' + event,evt) 
  } 
}

var AP = {
	
	
	init: function() {
		step_time = 1000;		
		if (arena_interval_id != 0) {
			window.clearInterval(arena_interval_id);
		}
		arena_interval_id = window.setInterval(AP.step, step_time);
	},
	
	set_step: function(arg) {
		step_time = arg;
		if (arena_interval_id != 0) {
			window.clearInterval(arena_interval_id);
		}
		arena_interval_id = window.setInterval(AP.step, step_time);
	},
	
	reset: function() {
		progress = 100;
	},
	
	set_progress: function(pr) {
		progress = pr;
	},
	
	update: function() {
		pb = $('turn_time');
		if (pb) {
			pb.style.width = progress+"%"
			if (progress <= 2) {
				fireEvent($('fight_log_capt'), 'click');
			}
		}		
		pbar = $('bar_turn_time');
		if (pbar) {
			pbar.title = 100-progress+"%"
		}		
	},
	
	step: function() {
		if (progress >= 2) {
			progress = progress - 2;
			AP.update();			
		}
	},
	
	show_new_msg: function() {
		Effect.Appear('new_msg');
	},

	hide_new_msg: function() {
		Effect.Fade('new_msg');
	},
	
	update_messages: function() {
		message_form = $('friend_message');
		if (message_form && message_form.value.length == 0) {
			new Ajax.Request('/hero/update_messages', {asynchronous:true, evalScripts:true, onComplete:function(request){Element.hide('spinner_hf')}});
		}
	},
	
	notify: function() {				
		soundManager.url = 'http://godville.net/soundmanager2.swf';
		soundManager.debugMode = false;
		soundManager.consoleOnly = false;
		
		soundManager.onready(function() {
		  if (soundManager.supported()) {
		    // SM2 is ready to go!
			soundManager.play('mySound','http://godville.net/arena.mp3');
		  } else {
		    // unsupported/error case
			Sound.play('http://godville.net/arena.mp3',{replace:true});
		  }
		  setTimeout("window.location.href = '/hero'",1000);				
		});		
	}
}

var WG = {
	toggle:function(block_id, link_id){
		if ($(block_id).visible() == true) {
			$(link_id).innerHTML = "↑";
			this.update_block_status(block_id, 'f');
		} else {
			$(link_id).innerHTML = "↓";
			this.update_block_status(block_id, 'u');
		}
		Effect.toggle( block_id, 'blind' );
	},

	toggle_push:function(block_id, link_id){
		this.toggle(block_id, link_id);
		new Ajax.Request('/hero/update_sortings', {asynchronous:true, evalScripts:true});
	},

	
	update_block_status: function(block_id, state){
		settings = jar.get('hero_settings');
		if (settings == null) {
			settings = {};
		}
		settings[block_id] = state;
		jar.put('hero_settings', settings);
	},
	
	onChangeLayout: function(item) {
		jar.put('l_block', Sortable.sequence('left_block'));
		jar.put('c_block', Sortable.sequence('central_block'));
		jar.put('r_block', Sortable.sequence('right_block'));
	},
	
	reset_layout: function(item) {
		jar.remove('l_block');
		jar.remove('c_block');
		jar.remove('r_block');
		jar.remove('hero_sortings');
		location.reload(); 
	},
	
	register_sortables: function() {
		Sortable.create('left_block', { tag: 'div', only: 'box_drag', overlap:'vertical',constraint:false, handle:'box_handle',
						 containment: ['left_block','central_block','right_block'], onChange: WG.onChangeLayout });
		Sortable.create('central_block', { tag: 'div', only: 'box_drag', overlap:'vertical',constraint:false, handle:'box_handle',
						 containment: ['left_block','central_block','right_block'], onChange: WG.onChangeLayout });
		Sortable.create('right_block', { tag: 'div', only: 'box_drag', overlap:'vertical',constraint:false, handle:'box_handle', 
						 containment: ['left_block','central_block','right_block'], onChange: WG.onChangeLayout });			
	},
	
	sort_last: function(direction) {
		sortings = jar.get('hero_sortings');
		if (sortings == null) {
			sortings = {};
		}
		sortings['last'] = direction;
		jar.put('hero_sortings', sortings);
		$('update_last').onclick();
	}
}

var Feedback = {

  hide_form: function() {
	$('feedback_monster').hide();
	$('feedback_common').hide();
	$('feedback_quest').hide();
	$('feedback_equipment').hide();
	$('feedback_skill').hide();
	$('feedback_diary').hide();
	$('feedback_arena').hide();
	$('feedback_artifact').hide();	
	$('feedback_sms').hide();
	$('feedback_details').hide();
	$('feedback_bug').hide();
	$('feedback_idea').hide();
	$('feedback_content').hide();
  },

  show_form: function(id) {
	switch (id) {
		case "1": $('feedback_monster').show();break;
		case "2": $('feedback_artifact').show();break;
		case "3": $('feedback_equipment').show();break;
		case "4": $('feedback_skill').show();break;
		case "5": $('feedback_diary').show();break;
		case "6": $('feedback_idea').show();break;
		case "7": $('feedback_bug').show();break;
		case "8": $('feedback_quest').show();break;
		case "9": $('feedback_arena').show();break;
		case "10": $('feedback_sms').show();break;
		case "11": $('feedback_details').show();break;
		case "15": $('feedback_content').show();break;
		
		default: $('feedback_common').show();break;
	}
  },

  update_form: function() {
	if($('send_feedback_form')){
		this.hide_form();
		this.show_form($F('feedback_id'));
		$('fdbk_status').innerHTML="";	
	}
  },

  reset_form: function() {
	$('send_feedback_form').down('form').monster_name.value='';
	$('send_feedback_form').down('form').monster_artifact.value='';
	$('send_feedback_form').down('form').monster_rattle.value='';
	$('send_feedback_form').down('form').monster_reference.value='';
	$('send_feedback_form').down('form').quest_name.value='';
	$('send_feedback_form').down('form').quest_success.value='';
	$('send_feedback_form').down('form').quest_reference.value='';
/*	$('send_feedback_form').down('form').quest_failure.value=''; */
	$('send_feedback_form').down('form').equipment_name.value='';
	$('send_feedback_form').down('form').equip_reference.value='';
	$('send_feedback_form').down('form').skill_name.value='';
	$('send_feedback_form').down('form').skill_reference.value='';
	$('send_feedback_form').down('form').artifact_name.value='';
	$('send_feedback_form').down('form').artifact_reference.value='';
	$('send_feedback_form').down('form').common_message.value='';
	$('send_feedback_form').down('form').sms_message.value='';
	$('send_feedback_form').down('form').details_text.value='';
	$('send_feedback_form').down('form').details_reference.value='';	
	$('send_feedback_form').down('form').bug_message.value='';
	$('send_feedback_form').down('form').idea_message.value='';
	$('send_feedback_form').down('form').content_title.value='';
	$('send_feedback_form').down('form').content_reason.value='';
	$('send_feedback_form').down('form').diary_message.value='';
	$('send_feedback_form').down('form').diary_reference.value='';	
	$('send_feedback_form').down('form').arena_message.value='';
	$('send_feedback_form').down('form').arena_reference.value='';	
	
  },

  check_feedback_field: function(element, max_size) {
	$('fdbk_status').innerHTML="";
	if($F(element).length > max_size) {
		$('s_'+element).show();
		return false;
	}
	else {
		$('s_'+element).hide();
		return true;
	}
  }, 

  check_form: function() {
	var id = $F('feedback_id');
	var ret = false;
	switch (id) {
		case "1": 
			ret = this.check_feedback_field('monster_name',25);
			ret = ret && this.check_feedback_field('monster_artifact',40);
			ret = ret && this.check_feedback_field('monster_rattle',20);
			break;
		case "2": ret = this.check_feedback_field('artifact_name',40);break;
		case "3": ret = this.check_feedback_field('equipment_name', 30);break;
		case "4": ret = this.check_feedback_field('skill_name',30);break;
		case "5": ret = this.check_feedback_field('diary_message',2000);break;
		case "6": ret = this.check_feedback_field('idea_message',2000);break;
		case "7": ret = this.check_feedback_field('bug_message',2000);break;
		case "8": ret = true;break;
		case "9": ret = this.check_feedback_field('arena_message',2000);break;
		case "10": ret = this.check_feedback_field('sms_message', 2000);break;
		case "11": ret = this.check_feedback_field('details_text', 100);break;
		case "15": 
					ret = this.check_feedback_field('content_title', 500);break;
					ret = ret && this.check_feedback_field('content_reason', 1500);break;
		default: ret = this.check_feedback_field('common_message', 2000);break;
	}
	if (ret==true){
		Element.show('spinner_fdbk');
	}
	return ret;
  }
}

var update_hero = "true";

function set_update_flag(value) {
	update_hero = value;
}

function check_update_hero() {
	if (update_hero == "true") return true;
	return false;
}

function check_fast_update() {
	if (update_hero == "true") return false;
	return true;
}

function show_status(id, msg) {
  $(id).addClassName('cmplt_status');
  $(id).innerHTML = msg;
  new Effect.Appear(id,{});
  setTimeout(function() {
    new Effect.Fade(id,{});
  }, 5000);
}     



document.observe("dom:loaded", function() {
	WG.register_sortables();
	AP.init();
	AP.reset();
});

Event.observe(window, 'load', function() { Feedback.update_form(); });
