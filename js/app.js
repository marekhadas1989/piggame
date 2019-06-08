var app = {
	minInt:1,
	maxInt:6,
	currentPlayer:false,
	currentScore:0,
	overallScore:{},
	init:function(){
		console.warn("APP STARTED "+(new Date));
	
	
	},
	translate:function(number){
	
	},
	play:function(){
		/*
		var results = this.parseResults([
			this.randomize(),
			this.randomize()
		]);
		*/
		//this.checkGameStatus(results);
		console.log([
			this.randomize(),
			this.randomize()
		]);
	},
	checkGameStatus:function(accumulatedAmount){
		if(accumulatedAmount >=100){
			//You won
			//set green
		}else if(accumulatedAmount >= 50 && accumulatedAmount < 99){
			//set yellow
		}else{
			//set red
		}
	},
	parseResults:function(result){
		
		try{
			//snake eye case - you loose whatever you earned entirely
			if(result[0] == 1 && result[1] == 1){
				return overallScore[currentPlayer] = 0;
			}else if(result[0] == 1 || result[1] == 1){
				// you loose whatever you earned for this round, score remains the same
				return overallScore[currentPlayer];
			}else{
				return overallScore[currentPlayer]+= (result[0]+result[1]);
			}
		}catch(e){
			console.warn("Not an array");
		}
		
	},
	/*
	Description Here
	*/
	randomize:function(){
		return Math.floor(Math.random() * (this.maxInt - this.minInt)) + this.minInt;
	},
	updateResults:function(){
		
	}
	
}