var app =(function(obj){
	"use strict";
	return {
		start:function(options){
			obj.init(options);
		}
	}
}({
	clientID:(function(){
		return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
			var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
			return v.toString(16);
		});
	}()),
	settings:{},
	gamesAvailable:{},
	myRemoteGameIsOpen:false,
	myGame:{},
	websocket:false,
	websocket_game_config:false,
	minDiceInt:1,
	maxDiceInt:6,
	singlePlayerPlayers:[],
	chatUsers:{},
	funny:[
		"If you can smile when things go wrong, you already have someone to blame",
		"The older you are, the harder it is to lose weight, because your body and your fat have become good buddies.",
		"Eat a small toad in the morning, and it will be the worst thing you do all day.",
		"Don't worry about the world coming to an end today. It's already tomorrow in Hong Kong.",
		"Whoever said money can’t buy happiness didn’t know where to shop.",
		"Never use a hatchet to remove a fly from your friend's forehead.",
		"Red meat is not bad for you. Fuzzy green meat is bad for you.",
		"When opportunity knocks, don't sit there complaining about the noise.",
		"Never play leapfrog with a unicorn.",
		"Learn from your parents' mistakes. Practice birth control.",
		"Don't assume malice for what stupidity can explain.",
		"The sooner you fall behind, the more time you'll have to catch up.",
		"Health nuts are going to feel stupid someday, lying in the hospital dying of nothing.",
		"Teach a child to be polite and courteous in the home and, when he grows up, he'll never be able to edge his car onto a freeway."
	],
	init:function(options){

		var self = this;

		$(window).on('beforeunload', function(){
			//if you are hosting any games prevent of closing down the browser straight ahead
			if(Object.keys(self.myGame).length){
				return false;
			}
		});

		$(window).on('unload', function(){

			//removeOldChat
			self.sendBroadcastMessage({
				'removeOldChat'			: 	true,
				'clientID'				:	self.clientID
			});

			//if user decided to quit anyway, remove game for other users
			if(Object.keys(self.myGame).length){
				self.sendBroadcastMessage({
					'gameRemovedForcefully'	: 	true,
					'clientID'				:	self.clientID,
					'deleteGameFromList'	:	self.myGame.gameName
				});
			}
		});

		if('debug' in options && options['debug']){
			$('.debug_box').show();
			$('.debug_box').siblings('div').toggleClass('col-md-12 col-md-6');
			this.webSocketDebug();
		}

		//to be continued, this is just a placeholder for future hall of fame, this should be db driven ideally
		var hof = [
			{"name":'John Doe','score':7,'avatar':'./avatars/128x128/128_1.png'},
			{"name":'Peter Doe','score':3,'avatar':'./avatars/128x128/128_2.png'},
			{"name":'Jane Doe','score':1,'avatar':'./avatars/128x128/128_3.png'}
		];
		localStorage.setItem('hall_of_fame', JSON.stringify(hof));
		//end hall of fame

		console.warn("APP STARTED "+(new Date)+" "+this.clientID);

		var autoload = ['events','restoreSettings','hallOfFame','websockets'];

		try {
			for (var a in autoload) {
				this[autoload[a]]();
			}
		}catch(e){
			console.warn('Autoload Error');
		}

	},
	restoreSettings:function(){

		var settings = localStorage.getItem('settings')?JSON.parse(localStorage.getItem('settings')):{'playSounds':true,"popupAlerts":true};

		if(Object.keys(settings).length > 2){
			$('#settingsModal').find('input').each(function() {
				var option = $(this).attr('id');
				$(this)[settings[option]?'attr':'removeAttr']('checked','checked');
			})
		}

		this.settings = settings;

	},
	playSound:function(sound){

		if(this.settings.hasOwnProperty("playSounds") && this.settings["playSounds"]){
			try{
				var audio = new Audio(sound);
				audio.play().catch(function(e) {
					console.warn(e);
				});
			}catch(e){
				console.warn(e)
				//just in case if its not supported by the browser
			}
		}

	},
	events:function(){

		var self = this;

		try{

			$('.user_chat_notification').on('click',function(e){

				$('.chat_box').show();
				self.showUserChat();

				var recipent = $(this).attr('chanel');

				if(recipent == 'all'){
					$('h5[recipent="all"]').click();
				}else{
					$('h6[recipent="'+recipent+'"]').click();
				}

				$(this).hide();

			})

			$('body').on('click','.start_host_game_final',function(){
				self.startRemoteGame();
			})

			//chat user selection
			$('body').on('click','.chatUsers h5,.chatUsers h6',function(){

				$('.chatChanel').hide();
				$('.chatChanel[chanel="'+$(this).attr('recipent')+'"]').show();

				if(!$(this).hasClass('selectedChatUser')){

					$('.activeChat').remove();

					//if private notification is visible turn it off and mark as read
					if($('.user_chat_notification').is(":visible")){

						$('.user_chat_notification').hide();
						$('.user_chat_notification').trigger("click",["artifical"]);

					}

					$('.chatUsers').children('h5,h6').removeClass("selectedChatUser");
					$(this).prepend('<img style="margin-top:-5px;width:25px;height:25px" class="activeChat" src="/img/star.png">');
					$(this).addClass("selectedChatUser");

				}

				self.canSendMessage();

			})

			$('.chatSubmit').on('click',function(){

				var msg 		= $('.chatText').val(),
					user_name 	= $('.multiplayer_player_name').val() || self.clientID,
					user_img 	= $('.player_avatar').attr('src'),
					user_data	= {
						'userName'		:	user_name,
						'userAvatar'	:	user_img
					};

				var escape_message = msg.replace(/(<([^>]+)>)/ig,"");

				self.sendBroadcastMessage({
					'chatMessage'	:	true,
					"messageValue"	:	escape_message,
					'clientID'		:	self.clientID,
					'recipent'		:	$('.selectedChatUser').attr('recipent'),
					'userData'		:	user_data
				});

				self.addMessageToChat(escape_message,$('.selectedChatUser').attr('recipent'),user_data);

				$('.chatText').val("");

				self.canSendMessage();

			})

			$('.chatText').on('keyup',function(e){
				var canSend = self.canSendMessage();

				if(e.keyCode == 13 && canSend){
					$('.chatSubmit').click();
				};
			})

			$('.user_chat_display').on('click',function(){
				$('.chat_box').toggle();
				self.showUserChat();
			})

			$('.start_multiplayer').on('click',function(){
				$('.game_box').hide();
				$('.multiplayer').show();
			})

			$('.saveSettings').on('click',function(){

				var settings = {};

				$('#settingsModal').modal('hide');

				$('#settingsModal').find('input').each(function(){
					settings[$(this).attr('id')] = $(this).is(":checked");
				})

				localStorage.setItem('settings', JSON.stringify(settings));

				self.settings = settings;

			})

			$('.settings').on('click',function(){
				$('#settingsModal').modal('show');
			})

			$('.player_name').on('keyup',function(e){

				$(this).val().length>0?$('.add_player').removeAttr('disabled'):$('.add_player').attr('disabled','disabled');

				if(e.keyCode == 13 && $(this).val().length>0){
					$('.add_player').trigger('click');
				};

			})

			//first screen moves to users list once clicked
			$('.start_game').on('click',function(){

				//set up initial image and cleanup old players
				$('.player_name').val("");
				$('.players_list').html("");
				$('.player_avatar').attr('src',"./avatars/128x128/128_1.png");

				$('.start').fadeOut(function(){
					$('.player_selection').fadeIn();
				})

			})

			//start game button once at least two users are added
			$('.start_game_final').on('click',function(){

				$('.game_box').hide();

				var first_player = true;
				$('.player_list').each(function(){

					var user_image 	= $(this).children('img').attr('src'),
						user_name	= $(this).children('span').eq(0).text();

					$('#users_list tbody').append(
						self.generateUserOnList(
							$.trim(user_name),
							user_image,
							0,
							first_player
						)
					);

					first_player = false;

				})

				$('.game_board').show();

			})

			//select user avatar while adding new user
			$('.user_avatar_selection').on('click',function(){

				$('.player_avatar').attr('src',$(this).attr('src'));
				$("#user_avatar").modal("hide");

			})

			//add new player on players list
			$('.add_player').on('click',function(){

				var playerAvatar 	= 	$('.player_avatar').attr('src'),
					playerName 		= 	$.trim($('.player_name').val());

				console.log(self.singlePlayerPlayers);
				//if user does not exists
				if(self.singlePlayerPlayers.indexOf(playerAvatar)==-1){

					self.singlePlayerPlayers.push(playerAvatar);

					$('.player_selection').find('.players_list').append(
						self.playerMockup(
							playerAvatar,
							playerName,
							self.clientID,
							true
						)
					);

					self.resetPlayer();
					self.checkIfGameIsReady();

				}else{

					Swal.fire({
						title: 'Error!',
						text: 'Player already exists, please chose other name.',
						type: 'error',
						confirmButtonText: 'OK'
					})

					return false;

				}

			})

			//roll a dice button
			$('.roll_a_dice').on('click',function(){

				var isRemoteGame = $(this).attr('is_remote_game') || false;

				self.playSound('/sound/dice_roll.mp3');

				$('.dice_board').show();

				var is_first_player = $('.game_board').find('.active').index() == 0?true:false;
				if(self.settings.hasOwnProperty("doubleSixAlways") && self.settings["doubleSixAlways"] && is_first_player) {

					var dice_one 			= 	6,
						dice_two 			= 	6;

					console.warn('You little nasty cheater');

				}else{

					var dice_one 			= 	self.randomize(),
						dice_two 			= 	self.randomize();

				}

				var overall_score 		= 	Number($('.active').children('td').eq(1).text());

				//so close yet so far away scenario
				//all but first player seems to be really unlucky, no one but first player will never win, just before being so close, you will lose everything
				if(self.settings.hasOwnProperty("unluckyPlayer") && self.settings["unluckyPlayer"] && !is_first_player && overall_score>=88){
					var dice_one 			= 	1,
						dice_two 			= 	1;
					console.warn('whooops someone seems to be really unlucky')
				}

				self.drawDice("dice_one",dice_one);
				self.drawDice("dice_two",dice_two);

				if(dice_one == 1 && dice_two == 1){

					if(isRemoteGame){
						self.sendBroadcastMessage({
							"passRemoteTurn"		:	true,
							"new_overall_score"		:	0,
							"new_current_score"		:	0,
							"remotePlayerFailed"	: 	true,
							"dice_one"				:	dice_one,
							"dice_two"				:	dice_two,
						})

						$('.roll_a_dice,.pass_turn').attr('disabled',"disabled");
					}

					self.snakeEye();

					return;

				}

				if(dice_one == 1 || dice_two == 1){

					if(isRemoteGame) {
						self.sendBroadcastMessage({
							"passRemoteTurn"		: 	true,
							"new_overall_score"		: 	overall_score,
							"new_current_score"		: 	0,
							"remotePlayerFailed"	: 	true,
							"dice_one"				:	dice_one,
							"dice_two"				:	dice_two,
						})

						$('.roll_a_dice,.pass_turn').attr('disabled',"disabled");
					}

					self.snakeEyeHalf(Number(overall_score));

					return;

				}

				var current_score 		= Number($('.active').children('td').eq(2).text()),
					new_current_score 	= current_score + Number(dice_one) + Number(dice_two);

				//calculate new overall score if nothing wrong has happened only
				var new_overall_score 	= 	Number(overall_score) + new_current_score;

				if(isRemoteGame) {

					self.sendBroadcastMessage({
						"updateRemotePlayerScore"	: 	true,
						"playerName"				: 	0,
						"new_current_score"			:	new_current_score,
						"new_overall_score"			:	new_overall_score,
						"dice_one"					:	dice_one,
						"dice_two"					:	dice_two
					})

				}

				if(new_overall_score>=100){

					if(isRemoteGame) {
						self.sendBroadcastMessage({
							"remotePlayerWinTheGame": true,
							"playerName": 0,
						})
					}

					self.youWin($('.active'));
					self.updateUserProgress($('.active').children('td:last').find('.progress-bar'),100);

					return false;

				}else{

					var odd_or_even = (Number(dice_one) + Number(dice_two))%2;

					//it will display funny alert only if option is enabled and for everyone but first player on the list
					if(odd_or_even){
						self.funnyEvents();
					}

					self.updateUserProgress($('.active').children('td:last').find('.progress-bar'),new_overall_score);

					$('.active').children('td').eq(2).text("").text(new_current_score);

					$('.pass_turn').show();

				}

			})

			$('.go_back').on('click',function(){
				$('.player_name').val("");
				$('.game_box').hide();
				$('.start').fadeIn();
				self.singlePlayerPlayers = [];
			})

			$('.pass_turn').on('click',function(){

				var isRemoteGame = $(this).attr("isRemoteGame") || false;

				if(isRemoteGame){

					$('.roll_a_dice,.pass_turn').attr('disabled',"disabled");

					self.sendBroadcastMessage({
						"passRemoteTurn"		:	true,
						"playerOverallScore"	:	Number(active_user.eq(1).text()),
						"playerProgress"		:	Number(active_user.eq(2).text())
					})

				}else{
					$('.roll_a_dice,.pass_turn').removeAttr('disabled');
				}

				var active_user = $('.active').find('td');

				self.passYourTurn(
					active_user.eq(1).text(),
					active_user.eq(2).text(),
					isRemoteGame
				);

			})

			//remove players from players list
			$('body').on('click','.remove_player',function(){

				var isWebSocketBased = $(this).parent().attr('clientid') || false;

				if(isWebSocketBased){
					self.sendBroadcastMessage({
						'playerRemovedByOwner' 	:	true,
						'clientID'				:	isWebSocketBased
					})
				}

				var user_name = $.trim($(this).parent().find('span').eq(0).text());

				//remove user from users array
				for( var i = 0; i < self.singlePlayerPlayers.length; i++){
					if ( self.singlePlayerPlayers[i] == user_name) {
						self.singlePlayerPlayers.splice(i, 1);
					}
				}

				$(this).parent().fadeOut().remove();

				self.checkIfGameIsReady();

			})

			$('.cancel_game').on('click',function(){
				self.resetGame();
			})

		}catch(e){
			//future usage, to be continued
		}
	},
	//create new channel if does not exits already
	createNewChatChanel:function(chanel){

		if($('.chatChanel[chanel="'+chanel+'"]').length == 0){
			var newChanel = "<div class='col-md-12 chatChanel' chanel='"+chanel+"'>";
			$(newChanel).insertAfter($('.chatChanel[chanel="all"]'));
			$('.chatChanel[chanel="'+chanel+'"]').hide();
		}

	},
	addMessageToChat:function(message,recipent,userData){

		var msg =
			"<div class='row' style='margin-top:5px'>"+
				this.playerMockup(userData.userAvatar,userData.userName,this.clientID,false)+
				"<div class='col-md-12'>"+message+"</div>"+
			"</div>";

		$('.chatChanel[chanel="'+recipent+'"]').append(msg);

		this.scrollChatWindow(recipent);

	},
	scrollChatWindow:function(chanel){
		setTimeout(function(){
			$('.chatChanel[chanel="'+chanel+'"]').scrollTop(100000);
		},100)
	},
	playerMockup:function(playerAvatar,playerName,clientID,owner = true){

		var canDelete = owner?'<span class="remove_player float-right" aria-hidden="true">×</span>':"";

		var mock =
		'<div class="col-md-12 text-left player_list" clientID="'+clientID+'">' +
			'<img src="'+playerAvatar+'">' +
			'<span style="font-size:12px;color:#17a2b8" class="align-middle"> '+playerName+'</span>'
			+canDelete+
		'</div>';

		return mock;

	},
	updateUserProgress:function(progress_bar,score){

		var percentage = score>=100?100:score;

		progress_bar.css("width",percentage+"%").text(percentage+"%");
		progress_bar.removeAttr('class').addClass('progress-bar '+this.getProgressClass(percentage));

	},
	/*
	Function to handle next turn regardless of whether turn has been
	passed by the conscious decision of the user
	or caused by the rules of the game.
	*/
	passYourTurn:function(overal_score,round_score,isRemote){

		var el = $('tr.active').children('td');

		el.eq(1).text("").text(Number(overal_score)+Number(round_score));

		//assuming your turn has just ended round score should be always set to 0 here
		el.eq(2).text(0);

		if($('tr.active').next().length){
			$('tr.active').next().addClass('active');
			$('tr.active').eq(0).removeClass('active');
		}else{
			$('tr.active').removeClass('active');
			$('#users_list').find('tbody tr:first').addClass('active');
		};

		$('.pass_turn').hide();

		if(isRemote){
			/*
			var isYou = $('tr.active').find('td').eq(0).text();

			if(isYou){
				$('.awaitingForRemoteTurn').hide();
			}else{
				$('.awaitingForRemoteTurn').show();
			}
		
			 */
		}
		this.drawEmptyDices();

	},
	/*
	Generate user for list using html template and return template so to add it later on wherever you want
	 */
	getProgressClass:function(user_progress){

		var progress 		= Number(user_progress),
			progress_class 	= 'bg-success';

		if( progress>=25 && progress<50){
			var progress_class = 'bg-info';
		}else if(progress>=50 && progress<75){
			var progress_class = 'bg-warning';
		}else if(progress>75){
			var progress_class = 'bg-danger';
		}

		return progress_class;

	},
	generateUserOnList:function(user_name,user_avatar,user_progress,first_player){

		var progress_class = this.getProgressClass(user_progress);

		var user_progress = user_progress || 0;
		user_element  =
			'<tr role="row" class="'+(first_player?'active':void(0))+'">' +
				'<td class="text-left"><img src="'+user_avatar+'" style="width:20px">'+user_name+'</td>' +
				'<td>0</td>' +
				'<td>0</td>' +
				'<td>' +
					'<div class="progress">' +
						'<div class="progress-bar '+progress_class+'" role="progressbar" style="width: '+user_progress+'%;">'+user_progress+'%</div>' +
					'</div>' +
				'</td>' +
			'</tr>';

		return user_element;

	},
	/*
	Canvas plugin for drawing dices
	 */
	drawDice:function(htmlElement,diceValue) {

		var canvas, ctx;
		var diceColor = "#dc3545";
		var dotColor = "white";

		canvas = document.getElementById(htmlElement);
		ctx = canvas.getContext("2d");
		canvas.width = 150;
		canvas.height = 150;

		try{

			drawDice(ctx, 0, 0, 150, diceValue, diceColor, dotColor);

			function drawDice(ctx, x, y, size, value, diceColor, dotColor) {
				dots = [];
				ctx.save();
				ctx.fillStyle = diceColor;
				ctx.translate(x, y);
				roundRect(ctx, 0, 0, size, size, size * 0.1, true, false);

				//define dot locations
				var padding = 0.25;
				var x, y;
				x = padding * size;
				y = padding * size;
				dots.push({x: x, y: y});
				y = size * 0.5;
				dots.push({x: x, y: y});
				y = size * (1 - padding);
				dots.push({x: x, y: y});
				x = size * 0.5;
				y = size * 0.5;
				dots.push({x: x, y: y});
				x = size * (1 - padding);
				y = padding * size;
				dots.push({x: x, y: y});
				y = size * 0.5;
				dots.push({x: x, y: y});
				y = size * (1 - padding);
				dots.push({x: x, y: y});

				var dotsToDraw;
				if (value == 1) dotsToDraw = [3];
				else if (value == 2) dotsToDraw = [0, 6];
				else if (value == 3) dotsToDraw = [0, 3, 6];
				else if (value == 4) dotsToDraw = [0, 2, 4, 6];
				else if (value == 5) dotsToDraw = [0, 2, 3, 4, 6];
				else if (value == 6) dotsToDraw = [0, 1, 2, 4, 5, 6];


				ctx.fillStyle = dotColor;
				for (var i = 0; i < dotsToDraw.length; i++) {
					ctx.beginPath();
					var j = dotsToDraw[i];
					ctx.arc(dots[j].x, dots[j].y, size * 0.07, 0, 2 * Math.PI);
					ctx.fill();
				}
			}

			function roundRect(ctx, x, y, width, height, radius, fill, stroke) {
				if (typeof stroke == 'undefined') {
					stroke = true;
				}
				if (typeof radius === 'undefined') {
					radius = 5;
				}
				if (typeof radius === 'number') {
					radius = {tl: radius, tr: radius, br: radius, bl: radius};
				} else {
					var defaultRadius = {tl: 0, tr: 0, br: 0, bl: 0};
					for (var side in defaultRadius) {
						radius[side] = radius[side] || defaultRadius[side];
					}
				}
				ctx.beginPath();
				ctx.moveTo(x + radius.tl, y);
				ctx.lineTo(x + width - radius.tr, y);
				ctx.quadraticCurveTo(x + width, y, x + width, y + radius.tr);
				ctx.lineTo(x + width, y + height - radius.br);
				ctx.quadraticCurveTo(x + width, y + height, x + width - radius.br, y + height);
				ctx.lineTo(x + radius.bl, y + height);
				ctx.quadraticCurveTo(x, y + height, x, y + height - radius.bl);
				ctx.lineTo(x, y + radius.tl);
				ctx.quadraticCurveTo(x, y, x + radius.tl, y);
				ctx.closePath();
				if (fill) {
					ctx.fill();
				}
				if (stroke) {
					ctx.stroke();
				}

			}

		}catch(e){
			console.log(e);
			//this is fine, empty dices are allowed at this stage
		}

	},
	/*
	Check if at least two players are added to the game and unlock start button if so, otherwise disable start button
	 */
	checkIfGameIsReady:function(SocketBased){

		if(SocketBased){
			if($('.players_list_remote').children('.player_list').length>=1){
				$('.start_host_game_final').removeAttr('disabled');
			}else{
				$('.start_host_game_final').attr('disabled','disabled');
			}
		}else{
			if($('.players_list').children('div').length>=2){
				$('.start_game_final').removeAttr('disabled');
			}else{
				$('.start_game_final').attr('disabled','disabled');
			}
		}

	},
	resetPlayer:function(){

		$('.player_name').val("");
		$('.add_player').attr('disabled','disabled');

	},
	/*
	Draw empty dices so to indicate someones turn has just ended
	 */
	drawEmptyDices:function(){

		this.drawDice("dice_one",0);
		this.drawDice("dice_two",0);

	},
	/*
	Snake Eye Sweet Alert
	 */
	snakeEye:function(){

		this.updateUserProgress($('.active').children('td:last').find('.progress-bar'),0);

		this.playSound('/sound/fail_full_snake.mp3');

		if(this.settings.hasOwnProperty("popupAlerts") && this.settings["popupAlerts"]) {

			Swal.fire({
				title: 'No luck!',
				text: 'Whoooa you rolled Snake Eyes. Lucky you. Pass the dices to another player.',
				type: 'error',
				confirmButtonText: 'OK'
			}).then((result) => {
				this.drawEmptyDices();
				this.passYourTurn(0, 0);
			})

		}else{

			console.warn('Silently skipping game alerts');

			this.drawEmptyDices();
			this.passYourTurn(0, 0);

		}

	},
	/*
	Alert if someone rolled out "1" on any of the dices
	 */
	snakeEyeHalf:function(overall_score){

		this.updateUserProgress($('.active').children('td:last').find('.progress-bar'),overall_score);

		this.playSound('/sound/fail_snake.mp3');

		if(this.settings.hasOwnProperty("popupAlerts") && this.settings["popupAlerts"]) {

			Swal.fire({
				title: 'No luck!',
				text: 'Woops, You rolled "1" on one of your dices. Pass the dices to another player.',
				type: 'warning',
				confirmButtonText: 'OK.',
			}).then((result) => {
				this.drawEmptyDices();
				this.passYourTurn(overall_score,0);
			})

		}else{

			console.warn('Silently skipping game alerts');

			this.drawEmptyDices();
			this.passYourTurn(overall_score,0);

		};

	},
	/*
	Play game again with the same people, reset progress bars and other game related stuff
	 */
	playAgain:function(){

		this.drawEmptyDices();

		$('#users_list').find('tr').removeAttr('class');
		$('#users_list').find('tbody tr:first').addClass('active');

		$('#users_list').find('tr').each(function(){
			$(this).children('td').eq(1).text(0);
			$(this).children('td').eq(2).text(0);
			$(this).children('td:last').find('.progress-bar').removeAttr('class').addClass('progress-bar bg-success').css('width','0%').text('0%');
		})

	},
	/*
	You win allert
	 */
	youWin:function(user_name){

		var progress = user_name.children('td:last');

		this.playSound('/sound/win.mp3');

		Swal.fire({
			title: 'You Win!',
			text: 'Well done '+user_name.children('td').eq(0).text()+'. Do you want to play again?',
			type: 'success',
			confirmButtonText: 'OK',
			showCancelButton: true,
		}).then((result) => {
			if(result.value){
				this.drawEmptyDices();
				this.playAgain();
			}else{
				this.resetGame();
			}
		})

	},
	resetGame:function(){
		this.drawEmptyDices();
		$('.players_list').html("");
		$(".game_box").hide();
		$('.initial_box').show();
		$('#users_list tbody').html("");
		this.singlePlayerPlayers = [];
	},
	/*
	Generate random number 1-6
	*/
	randomize:function(){
		return Math.floor(Math.random() * (this.maxDiceInt - this.minDiceInt)) + this.minDiceInt;
	},
	funnyEvents:function(){

		var is_first_player = $('.game_board').find('.active').index() == 0?true:false;

		if(this.settings.hasOwnProperty("funnyAlerts") && this.settings["funnyAlerts"] && !is_first_player){

			try{

				Swal.fire({
					title: 'Uncle Good Advice',
					text:this.funny[Math.floor(Math.random()*this.funny.length)],
					type: 'question'
				})

			}catch(e){

			}

		}

	},
	//this function will display 3 players who won most games
	hallOfFame:function(){

		var hof = localStorage.getItem('hall_of_fame')?JSON.parse(localStorage.getItem('hall_of_fame')):{};

		if(Object.keys(hof).length > 0){

			$(".hallOffameBox").html("");
			for(var a in hof){
				$(".hallOffameBox").append('<div class="col-md-12 text-left player_class"><img src="'+hof[a].avatar+'"><span>'+hof[a].name+'</span> <b>'+hof[a].score+'</b></div>');
			}

			$('.hall_of_fame').show();

		}

	},
	debug:function(){

		console.info('---------------------');
		console.info('--Available Methods--');
		console.info('---------------------');

		for(var a in this){
			console.log(a);
		}

	},
	canJoinGame:function(){

		if($('.multiplayer_player_name').val().length && $('input[name="game_name"]').is(":checked")){
			$('.join_game_final').removeAttr('disabled');
		}else{
			$('.join_game_final').attr('disabled','disabled');
		}

	},
	canHostGame:function(){
		$('.host_game_final')[$('.multiplayer_game_name').val().length && $('.multiplayer_player_name').val().length?'removeAttr':'attr']('disabled','disabled');
	},
	websockets:function(){

		var self = this;

		this.websocket = new WebSocket('wss://merriemelodies.ddns.net:8008/piggame/');
		this.websocket.onmessage = function(e) {
			var message = JSON.parse(e.data);

			//if i am hosting anything, respond back to the client
			if(message.hasOwnProperty('openGameSearch')){

				//if game is still open
				if(self.myRemoteGameIsOpen){

					//add new user to chat list
					self.addNewChatUser(message.chatUserName,message.clientID,message.userAvatar);

					if(Object.keys(self.myGame).length){
						self.sendBroadcastMessage({
							'clientID'		:	self.clientID,
							'gameName'		:	self.myGame.gameName,
							'userName'		:	self.myGame.userName,
							'gameAvatar'	:	self.myGame.gameAvatar,
							'playersCount'	:	1,

						});
					}
				};

			}else if(message.hasOwnProperty('gameName')){

				//add new game to the list
				self.handleNewRemoteGame(message);

			}else if(message.hasOwnProperty('deleteGameFromList') || message.hasOwnProperty('gameRemovedForcefully')){

				//inform users whether game has been terminated only when game is started and there are players

				var server_id = $('.go_back_host').attr('server_id') || false;

				//proceed only if i was participating in the game
				if(server_id == message.clientID){
					Swal.fire({
						title: 'Error!',
						text: 'Game has been terminated by the owner',
						type: 'error',
						confirmButtonText: 'OK'
					})

					$('.go_back_host').click();

					//delete game from list
					$('.player_class[game_name="'+message.deleteGameFromList+'"]').remove();

					if($('.remoteGameList').children().length<=0){
						self.addAwaitingGames();
					}
				}

			//Join Game Init function if new player is about to join the game
			}else if(message.hasOwnProperty('joinGame')){


				//join existing game
				if(self.myGame.gameName == message.joinGame){

					if(!(message.playerName in self.myGame.playersList)){

						self.myGame.playersList[message.playerName] = {
							'playerID'		:	message.clientID,
							'owner'			:	false,
							'userName'		:	message.playerName,
							'userAvatar'	:	message.playerAvatar,
						}
						//increment number of players
						self.myGame.playersCount++;

						//send message to the client so to inform the game is ready
						self.sendBroadcastMessage({
							'serverID'			:	self.clientID,
							'clientID'			:	message.clientID,
							'playersCount'		:	self.myGame.playersCount,
							'playerJoinedGame'	:	true,
							'playerList'		:	self.myGame.playersList
						})

						self.showRemoteGamePlayers(self.myGame.playersList,true);
						self.checkIfGameIsReady(true);
					}else{

						self.sendBroadcastMessage({
							'clientID'			:	message.clientID,
							'playerExists'		:	true,
						})
					}
				}

			//if player joined the game successfully
			}else if(message.hasOwnProperty('playerJoinedGame')){
				self.showRemoteGamePlayers(message.playerList,false,message.serverID);
			}else if(message.hasOwnProperty('chatMessage')){

				if(message.recipent == 'all' || message.recipent == self.clientID){

					self.notifyUserNewMessage(message.recipent=='all'?'all':message.clientID);
					self.addMessageToChat(message.messageValue,message.recipent=='all'?'all':message.clientID,message.userData);

				};

			}else if(message.hasOwnProperty('removeOldChat')){

				$('h6[recipent="'+message.clientID+'"]').remove();
				$('.chatChanel[recipent="'+message.clientID+'"]').remove();

			}else if(message.hasOwnProperty('deletePlayerFromList')){

				self.removePlayerFromGame(message.playerID,message.playerName);
				self.checkAwaitingPlayers();

			}else if(message.hasOwnProperty('playerExists')){

				if(self.clientID == message.clientID){
					Swal.fire({
						title: 'Error!',
						text: 'Player already exists, choose a different name for you player',
						type: 'error',
						confirmButtonText: 'OK'
					})
				}

			}else if(message.hasOwnProperty('playerRemovedByOwner')){

				if(message.clientID == self.clientID){

					Swal.fire({
						title: 'Error!',
						text: 'You have been removed from this game by the owner',
						type: 'error',
						confirmButtonText: 'OK'
					})

					$('.go_back_host').click();

				}

			}else if(message.hasOwnProperty('startRemoteGame')){
				self.prepareRemoteGameBoard(false,message.playersList);
			}else if(message.hasOwnProperty('updateRemotePlayerScore')){

				self.drawRemoteDices(message.dice_one,message.dice_two);

				console.log('after');
				/*
				"updateRemotePlayerScore"	: 	true,
					"playerName"				: 	0,
					"new_current_score"			:	new_current_score,
					"new_overall_score"			:	new_overall_score,
					"dice_one"					:	dice_one,
					"dice_two"					:	dice_two
				*/

			}else if(message.hasOwnProperty('passRemoteTurn')){

				if(message.remotePlayerFailed){
					self.drawRemoteDices(message.dice_one,message.dice_two);
					self.drawEmptyDices();
					self.passYourTurn(message.new_overall_score, message.new_current_score,true);
				}else{
					self.drawEmptyDices();
					self.passYourTurn(message.new_overall_score, message.new_current_score,true);
				}
			}else if(message.hasOwnProperty('remotePlayerWinTheGame')){

				alert('remotePlayerWinTheGame');
				/*
				"remotePlayerWinTheGame": true,
					"playerName": 0,
				 */
			};

			$('.debug_receive').append('<h6 style="color:green;font-weight:bold">'+e+'</h6>');

		};

		setInterval(
			function(){
				self.sendBroadcastMessage({
					'clientID'			:	self.clientID,
					'openGameSearch'	:	true,
					'newUserSearch'		: 	true,
					'chatUserName'		:	$('.multiplayer_player_name').val(),
					'userAvatar'		: 	$('.player_avatar').attr('src')
				})
			}
			,1000
		);

		$('body').on('click','input[name="game_name"]',function(){
			self.canJoinGame();
		})

		$('.multiplayer_game_name,.multiplayer_player_name').on('keyup',function(){

			self.canHostGame();
			self.canJoinGame();

		})

		$('.go_back_host').on('click',function(){

			$('.multiplayer_player_name').removeAttr('disabled');
			var player_name = $('.multiplayer_player_name').val();

			$(".remoteGameControllsStart").hide();
			$(".remoteGameControlls").show();

			$('.multiplayer_game_name,.multiplayer_player_name').removeAttr("disabled").val("");

			$(".remotePlayersTitle,.players_list_remote").hide();
			$(".remoteGamesTitle,.remoteGameList").show();

			//it this is my game
			if(Object.keys(self.myGame).length) {

				self.sendBroadcastMessage({
					'clientID'				:	self.clientID,
					'deleteGameFromList'	: 	self.myGame.gameName
				});

				//remove all players from my screen as i was the owner
				$('.player_list').remove();

				self.myGame = {};

			}else{

				//delete locally as well
				try{
					var remote_server_id = $(this).attr('server_id');
						$('.player_list[clientid="'+remote_server_id+'"]').remove();
				}finally{
				//log
				}

				//delete from remote host
				self.sendBroadcastMessage({
					'playerID'				:	self.clientID,
					'deletePlayerFromList'	: 	true,
					'playerName'			:	player_name
				});
			}

			self.canJoinGame();

		})

		$('.host_game_final').on('click',function(){

			//make game as ready to join
			self.myRemoteGameIsOpen = true;

			self.checkAwaitingPlayers();

			var newNameGame = $('.multiplayer_game_name').val();

			//removing old game
			if(Object.keys(self.myGame).length){

				self.sendBroadcastMessage({
					'clientID'			:	self.clientID,
					'deleteGameFromList':	self.myGame.gameName
				});

			}

			//creating new game
			if(!(newNameGame in self.gamesAvailable)){

				//add config of your game, which will be captured by interval

				var playersList = {};
					playersList[$('.multiplayer_player_name').val()] = {
						'playerID'		:	self.clientID,
						'owner'			:	true,
						'userName'		:	$('.multiplayer_player_name').val(),
						'userAvatar'	:	$('.multiplayer').find('.player_avatar').attr('src'),
					};

				self.myGame = {
					'gameName'		:	newNameGame,
					'userName'		:	$('.multiplayer_player_name').val(),
					'gameAvatar'	:	$('.multiplayer').find('.player_avatar').attr('src'),
					'playersCount'	:	1,
					'playersList'	:	playersList
				}

				self.showRemoteGamePlayers(playersList,true);

			}else{
				Swal.fire({
					title: 'Error!',
					text: 'This game already exists, please try to user different game name.',
					type: 'error',
					confirmButtonText: 'OK'
				})
				return false;
				//game already exists or was created by someone else and it's still active
			}



		})

		$('.join_game_final').on('click',function(){

			var selectedGame 	= $('input[name="game_name"]').filter(":checked");

			var gameName 		= selectedGame.attr('gameName'),
				playerName 		= $('.multiplayer_player_name').val(),
				playerAvatar 	= selectedGame.siblings('img').attr('src');

			self.sendBroadcastMessage({
				'clientID'		:	self.clientID,
				"joinGame"		:	gameName,
				"playerName"	:	playerName,
				"playerAvatar"	:	playerAvatar
			});

		})

	},
	drawRemoteDices:function(dice_one,dice_two){

		this.playSound('/sound/dice_roll.mp3');

		$('.dice_board').show();

		this.drawDice("dice_one",Number(dice_one));
		this.drawDice("dice_two",Number(dice_two));

	},
	checkAwaitingPlayers:function(){

		if($('.player_list').length){
			$('#awaitingForPlayers').hide();
		}else{
			$('#awaitingForPlayers').show();
		}

	},
	/*
		Remove player from owner's game [server] | this is initiated by the player
 	*/
	removePlayerFromGame:function(playerID,playerName){

		try{

			if(playerName in this.myGame.playersList){
				this.myGame.playersCount--;
				delete this.myGame.playersList[playerName];
				$('.player_list[clientid="'+playerID+'"]').remove();
			}

		}catch(e){
			//if it was initiated by the server,this is fine
		}

	},
	addNewChatUser(userName,clientID,userAvatar){

		if(!(clientID in this.chatUsers) && clientID != this.clientID) {

			//add new user to chat list
			this.chatUsers[clientID] = {
				"userName"		:	userName,
				"userAvatar"	:	userAvatar
			};

			var user_mockup =
				'<h6 recipent="' + clientID + '" style="cursor:pointer;color:#17a2b8">' +
					'<img class="uav" style="height:25px;width:25px" src="'+userAvatar+'">' +
					'<span style="margin-left:5px">' + (userName || clientID) + '</span>' +
				'</h6>';

			$('.chatUsers').append(user_mockup);

			this.createNewChatChanel(clientID);

		}else{

			if(this.chatUsers[clientID]!=userName && this.chatUsers[clientID]!=clientID){
				this.chatUsers[clientID][userName] = userName;
				$('h6[recipent="'+clientID+'"]').children('span').text(userName || clientID);
			}

			if(this.chatUsers[clientID].userAvatar!=userAvatar && this.chatUsers[clientID]!=clientID){
				this.chatUsers[clientID].userAvatar = userAvatar;
				$('h6[recipent="'+clientID+'"]').children('.uav').attr("src",this.chatUsers[clientID]['userAvatar']);
			}

		}

	},
	browserTabNotify:function(message){

		var oldTitle = document.title,
			timeoutId,
			blink = function() {
				document.title = document.title == message ? ' ' : message;
			},
			clear = function() {
				clearInterval(timeoutId);
				document.title = oldTitle;
				window.onmousemove = null;
				timeoutId = null;
			};

		if (!timeoutId) {
			timeoutId = setInterval(blink, 1000);
			$('.user_chat_notification').on('click',function(e){
				clear();
			});
		}

	},
	notifyUserNewMessage:function(chanel){

		//if chat is invisible notify or if chat is visible but not for the channel message was received from
		if(!($('.chat_box').is(":visible")) || !($('.chatChanel[chanel="'+chanel+'"]').is(":visible"))){

			$('.user_chat_notification').show().attr('chanel',chanel);

			//if this is a private message change the browser tab as well
			if(!($('.chatChanel[chanel="'+chanel+'"]').is(":visible")) && chanel!='all'){
				this.browserTabNotify("You have new private message on game chat");
			}

			this.playSound('/sound/message.mp3');
			this.scrollChatWindow(chanel);

		}

	},
	prepareRemoteGameBoard:function(isOwner,playersList){

		var self = this;

		$('.game_box').hide();
		$('.game_board').show();

		$('.roll_a_dice,.pass_turn').attr('is_remote_game',true);

		if(isOwner){
			var playersList = this.myGame.playersList;
		}else{

			//mark roll the dices button disabled, owner should start the game
			$('.roll_a_dice').attr('disabled',"disabled");
			$('.awaitingForRemoteTurn').show();

			var playersList = playersList;

		}

		for(var players in playersList){

			var player = playersList[players];

			var user_image 	= $(this).children('img').attr('src'),
				user_name	= $(this).children('span').eq(0).text();

			$('#users_list tbody').append(
				self.generateUserOnList(
					$.trim(player.userName),
					player.userAvatar,
					0,
					player.owner
				)
			);

		}

	},
	startRemoteGame:function(){

		//mark game as closed so no one will be able to join during the game
		this.myRemoteGameIsOpen = false;

		//set board as owner
		this.prepareRemoteGameBoard(true);

		this.sendBroadcastMessage({
			'startRemoteGame'	:	true,
			'playersList'		:	this.myGame.playersList
		})

	},
	showRemoteGamePlayers:function(playersList,owner,remoteServerID){

		$('.multiplayer_game_name,.multiplayer_player_name').attr("disabled","disabled");
		$(".remoteGameControllsStart").show();
		$(".remoteGameControlls").hide();

		$(".remotePlayersTitle,.players_list_remote").show();
		$(".remoteGamesTitle,.remoteGameList").hide();

		if(!owner){
			$('.start_host_game_final').hide();
			$('.go_back_host').attr('server_id',remoteServerID);
		}else{
			$('.go_back_host').removeAttr('server_id');
		}

		for(var player in playersList){

			if(playersList[player].playerID != this.clientID){
				$('.players_list_remote').append(
					this.playerMockup(
						playersList[player].userAvatar,
						playersList[player].userName,
						playersList[player].playerID,
						owner
					)
				);
			}

		}

		this.checkAwaitingPlayers();

	},
	addAwaitingGames:function(){
		$('.remoteGameList').append('<div id="awaitingForGames" class="col-md-12 align-center">Awaiting for games available...</div>');
	},
	remoteGameMockup:function(gameName,gameAvatar,playersCount){

		var game_html =
			'<div class="col-md-12 player_class" game_name="'+gameName+'">' +
			'	<label>' +
			'		<input type="radio" name="game_name" gameName="'+gameName+'" style="margin-top:10px;">' +
			'		<img src="'+gameAvatar+'" style="margin-right:5px">'+gameName+' <b>'+playersCount+' Player(s)</b>' +
			'	</label>' +
			'</div>';
		return game_html;

	},
	handleNewRemoteGame(game){

		//remove awaiting for games available
		$('#awaitingForGames').remove();

		if(!(game.gameName in this.gamesAvailable) || $('.player_class[game_name="'+game.gameName+'"]').length==0){

			this.gamesAvailable[game.gameName] = game.gameName;

			$('.remoteGameList').append(this.remoteGameMockup(game.gameName,game.gameAvatar,game.playersCount));

		}

	},
	sendBroadcastMessage:function(msg){

		this.websocket.send(
			JSON.stringify(msg)
		)

	},
	canSendMessage:function(){

		var canSendEnter = false;
		if($('.chatUsers').find('.selectedChatUser').length > 0 && $('.chatText').val().length>0){
			$('.chatSubmit').removeAttr('disabled');
			canSendEnter = true;
		}else{
			$('.chatSubmit').attr('disabled','disabled');
		}

		return canSendEnter;

	},
	showUserChat:function(){

		if($('.chat_box').is(":visible")){
			$('.multiplayer').children('div').eq(0).removeClass("col-md-12").addClass("col-md-6");
			$('.multiplayer').css('max-width','1200px');
		}else{
			$('.multiplayer').children('div').eq(0).removeClass("col-md-6").addClass("col-md-12");
			$('.multiplayer').css('max-width','730px');
		}

	},
	webSocketDebug:function(){

		var self = this;

		$('.debug_send').on('click',function(){

			var debug_text = $('.debug_text').val();
				$('.debug_text').val("");
				$('.debug_receive').append('<h6 style="color:red;font-weight:bold">'+debug_text+'</h6>');

			self.websocket.send(debug_text);

		})

	}
})
);