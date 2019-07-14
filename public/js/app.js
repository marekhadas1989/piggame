var app =(function(obj){
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
	myGameName:false,
	websocket:false,
	websocket_game_config:false,
	minInt:1,
	maxInt:6,
	players:{},
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

		console.log(this.clientID);

		var self = this;

		$(window).on('beforeunload', function(){
			//if you are hosting any games prevent of closing down the browser straight ahead
			if(self.myGameName){
				return false;
			}
		});

		$(window).on('unload', function(){
			//if user decided to quit anyway, remove game for other users
			if(self.myGameName){
				self.sendBroadcastMessage({
					'gameRemovedForcefully'	: 	true,
					'clientID'				:	self.clientID,
					'deleteGameFromList'	:	self.myGameName.gameName
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

		console.warn("APP STARTED "+(new Date));

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
				audio.play();
			}catch(e){
				//just in case if its not supported by the browser
			}
		}

	},
	events:function(){

		var self = this;

		try{

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
							$.trim(user_name),user_image,0,first_player
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

				var p_image = $('.player_avatar').attr('src'),
					p_name 	= $.trim($('.player_name').val());

				//if user does not exists
				if(self.players.indexOf(p_name)==-1){

					self.players.push(p_name);

					$('.player_selection').find('.players_list').append(
						'<div class="col-md-12 text-left player_list">' +
						'<img src="'+p_image+'">' +
						'<span class="align-middle"> '+p_name+'</span>' +
						'<span class="remove_player float-right" aria-hidden="true">×</span>'+
						'</div>'
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
					console.warn('whooops someone seems to be unlucky')
				}

				self.drawDice("dice_one",dice_one);
				self.drawDice("dice_two",dice_two);

				if(dice_one == 1 && dice_two == 1){
					self.snakeEye();
					return;
				}

				if(dice_one == 1 || dice_two == 1){
					self.snakeEyeHalf(Number(overall_score));
					return;
				}

				var current_score 		= Number($('.active').children('td').eq(2).text()),
					new_current_score 	= current_score + Number(dice_one) + Number(dice_two);

				//calculate new overall score if nothing wrong has happened only
				var new_overall_score 	= 	Number(overall_score) + new_current_score;

				if(new_overall_score>=100){
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
				self.players = [];
			})

			$('.pass_turn').on('click',function(){

				var active_user = $('.active').find('td');
				self.passYourTurn(
					active_user.eq(1).text(),
					active_user.eq(2).text()
				);

			})

			//remove players from players list
			$('body').on('click','.remove_player',function(){

				var user_name = $.trim($(this).parent().find('span').eq(0).text());

				//remove user from users array
				for( var i = 0; i < self.players.length; i++){
					if ( self.players[i] == user_name) {
						self.players.splice(i, 1);
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
	passYourTurn:function(overal_score,round_score){

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
				//for(var i=0; i<dots.length; i++) console.log(dots[i]);

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
			//this is fine, empty dices are allowed at this stage
		}
	},
	/*
	Check if at least two players are added to the game and unlock start button if so, otherwise disable start button
	 */
	checkIfGameIsReady:function(){
		if($('.players_list').children('div').length>=2){
			$('.start_game_final').removeAttr('disabled');
		}else{
			$('.start_game_final').attr('disabled','disabled');
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
		this.players = [];
	},
	/*
	Generate random number 1-6
	*/
	randomize:function(){
		return Math.floor(Math.random() * (this.maxInt - this.minInt)) + this.minInt;
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

			}catch(e){}
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

				if(message.hasOwnProperty('openGameSearch')){
					//if i am hosting anything, respond back to the client

					if(self.myGameName){
						self.sendBroadcastMessage({
							'clientID'		:	self.clientID,
							'gameName'		:	self.myGameName.gameName,
							'userName'		:	self.myGameName.userName,
							'gameAvatar'	:	self.myGameName.gameAvatar,
							'players'		:	1,

						});
					}

				}else if(message.hasOwnProperty('gameName')){

					//add new game to the list
					self.handleNewRemoteGame(message);

				}else if(message.hasOwnProperty('deleteGameFromList')){

					//inform users whether game has been terminated only when game is started and there are players
					if(message.hasOwnProperty('gameRemovedForcefully')){
						alert('Game has been terminated by the owner');
					}

					//delete game from list
					$('.player_class[game_name="'+message.deleteGameFromList+'"]').remove();

					if($('.remoteGameList').children().length<=0){
						self.addAwaitingGames();
					}

				}else if(message.hasOwnProperty('joinGame')){

alert('join');
console.log(self.myGameName.gameName);
console.log(message.joinGame);

					//join existing game
					if(self.myGameName.gameName == message.joinGame){

						if(!(message.playerName == self.myGameName.players)){
							alert('Player already exists');
						}else{
							alert('player joined');
						}

					}

					//{"joinGame":gameName,"playerName":playerName,"playerAvatar":playerAvatar}

				};

				$('.debug_receive').append('<h6 style="color:green;font-weight:bold">'+e+'</h6>');

			};

			setInterval(
				function(){
					self.sendBroadcastMessage({
						'clientID'			:	self.clientID,
						'openGameSearch'	:	true
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

			$(".remoteGameControllsStart").hide();
			$(".remoteGameControlls").show();

			$('.multiplayer_game_name,.multiplayer_player_name').removeAttr("disabled").val("");

			$(".remotePlayersTitle,.players_list_remote").hide();
			$(".remoteGamesTitle,.remoteGameList").show();

			if(self.myGameName!==false) {

				self.sendBroadcastMessage({
					'clientID'				:	self.clientID,
					'deleteGameFromList'	: 	self.myGameName.gameName
				});

				self.myGameName = {};

			}

		})

		$('.host_game_final').on('click',function(){
			console.warn('host game');

			var newNameGame = $('.multiplayer_game_name').val();

			//removing old game
			if(self.myGameName!==false){

				self.sendBroadcastMessage({
					'clientID'			:	self.clientID,
					'deleteGameFromList':	self.myGameName.gameName
				});

			}

			//creating new game
			if(!(newNameGame in self.gamesAvailable)){
				//add config of your game, which will be captured by interval
				self.myGameName = {
					'gameName'		:	newNameGame,
					'userName'		:	$('.multiplayer_player_name').val(),
					'gameAvatar'	:	$('.multiplayer').find('.player_avatar').attr('src'),
					'players'		:	1
				}

				$('.multiplayer_game_name,.multiplayer_player_name').attr("disabled","disabled");
				$(".remoteGameControllsStart").show();
				$(".remoteGameControlls").hide();

				$(".remotePlayersTitle,.players_list_remote").show();
				$(".remoteGamesTitle,.remoteGameList").hide();

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
	addAwaitingGames:function(){
		$('.remoteGameList').append('<div id="awaitingForGames" class="col-md-12 align-center">Awaiting for games available...</div>');
	},
	handleNewRemoteGame(game){

		//remove awaiting for games available
		$('#awaitingForGames').remove();

		if(!(game.gameName in this.gamesAvailable) || $('.player_class[game_name="'+game.gameName+'"]').length==0){

			this.gamesAvailable[game.gameName] = game.gameName;

			console.log(game);
			var game_html =
				'<div class="col-md-12 player_class" game_name="'+game.gameName+'">' +
				'	<label>' +
				'		<input type="radio" name="game_name" gameName="'+game.gameName+'" style="margin-top:10px;">' +
				'		<img src="'+game.gameAvatar+'" style="margin-right:5px">'+game.gameName+' <b>'+game.players+' Player(s)</b>' +
				'	</label>' +
				'</div>';
			$('.remoteGameList').append(game_html);

		}

	},
	sendBroadcastMessage:function(msg){

		this.websocket.send(
			JSON.stringify(msg)
		)

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