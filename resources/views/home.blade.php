<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}">
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">

        <title>The Pig Game!</title>

        <!-- Fonts -->
        <link rel="stylesheet" href="./css/bootstrap.min.css">
        <link rel="stylesheet" type="text/css" href="./css/datatables.min.css"/>
        <link rel="stylesheet" type="text/css" href="./css/app.css"/>
        <link href="./css/font-awesome.css" rel="stylesheet">

        <title>The Pig Game</title>

    </head>

    <body>

        <div class="modal fade" id="settingsModal" tabindex="-1" role="dialog" aria-labelledby="exampleModalCenterTitle"
             aria-hidden="true">
            <div class="modal-dialog modal-dialog-centered" role="document">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title" id="exampleModalLongTitle">Settings</h5>
                        <button type="button" class="close" data-dismiss="modal" aria-label="Close">
                            <span aria-hidden="true">&times;</span>
                        </button>
                    </div>

                    <div class="modal-body">

                        <div class="custom-control custom-checkbox mb-3">
                            <input type="checkbox" class="custom-control-input" checked="checked" id="playSounds">
                            <label class="custom-control-label" for="playSounds">Play Sounds</label>
                        </div>

                        <div class="custom-control custom-checkbox mb-3">
                            <input type="checkbox" class="custom-control-input" checked="checked" id="popupAlerts">
                            <label class="custom-control-label" for="popupAlerts" checked="checked">Pop Up Game Alerts</label>
                        </div>

                        <div class="custom-control custom-checkbox mb-3">
                            <input type="checkbox" class="custom-control-input" id="funnyAlerts">
                            <label class="custom-control-label" for="funnyAlerts">Display Funny Alerts</label>
                        </div>

                        <hr>
                        <h6 class="text-center">Cheat Mode</h6>
                        <hr>

                        <div class="custom-control custom-checkbox mb-3">
                            <input type="checkbox" class="custom-control-input" id="doubleSixAlways">
                            <label class="custom-control-label" for="doubleSixAlways">Roll Always "Double 6" For First
                                Player</label>
                        </div>
                        <div class="custom-control custom-checkbox mb-3">
                            <input type="checkbox" class="custom-control-input" id="unluckyPlayer">
                            <label class="custom-control-label" for="unluckyPlayer">All but "first player" seems to be unlucky
                                more than usually</label>
                        </div>
                    </div>

                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-dismiss="modal">Close</button>
                        <button type="button" class="btn btn-primary saveSettings">Save changes</button>
                    </div>
                </div>
            </div>
        </div>

        <div class="modal fade" id="user_avatar" tabindex="-1" role="dialog" aria-labelledby="user_avatar" aria-hidden="true">
            <div class="modal-dialog" role="document">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title" id="exampleModalLabel">Select your user avatar</h5>
                        <button type="button" class="close" data-dismiss="modal" aria-label="Close">
                            <span aria-hidden="true">&times;</span>
                        </button>
                    </div>
                    <div class="modal-body">
                        <img src="./avatars/128x128/128_1.png" class="img-fluid user_avatar_selection">
                        <img src="./avatars/128x128/128_2.png" class="img-fluid user_avatar_selection">
                        <img src="./avatars/128x128/128_3.png" class="img-fluid user_avatar_selection">
                        <img src="./avatars/128x128/128_4.png" class="img-fluid user_avatar_selection">
                        <img src="./avatars/128x128/128_5.png" class="img-fluid user_avatar_selection">
                        <img src="./avatars/128x128/128_6.png" class="img-fluid user_avatar_selection">
                        <img src="./avatars/128x128/128_7.png" class="img-fluid user_avatar_selection">
                        <img src="./avatars/128x128/128_8.png" class="img-fluid user_avatar_selection">
                        <img src="./avatars/128x128/128_9.png" class="img-fluid user_avatar_selection">
                        <img src="./avatars/128x128/128_10.png" class="img-fluid user_avatar_selection">
                        <img src="./avatars/128x128/128_11.png" class="img-fluid user_avatar_selection">
                        <img src="./avatars/128x128/128_12.png" class="img-fluid user_avatar_selection">
                        <img src="./avatars/128x128/128_13.png" class="img-fluid user_avatar_selection">
                        <img src="./avatars/128x128/128_14.png" class="img-fluid user_avatar_selection">
                        <img src="./avatars/128x128/128_15.png" class="img-fluid user_avatar_selection">
                        <img src="./avatars/128x128/128_16.png" class="img-fluid user_avatar_selection">
                    </div>

                </div>
            </div>
        </div>

        <div class="row start initial_box game_box">
            <div class="col-md-12 text-center" style="border-radius:5px;background:white;padding:40px;border:solid 1px #bcbaba">

                <i class="fas fa-cog settings"></i>
                <h2 style="color:#563D7C">The Pig Game</h2>
                <img src="./img/dices.png" class="img-fluid" style="max-height:250px">

                <div class="col-md-12 hall_of_fame" style="margin-top:20px;display:none">
                    <i class="fa fa-trophy" aria-hidden="true"></i>Hall Of Fame<i class="fa fa-trophy" aria-hidden="true"></i>

                    <div class="hallOffameBox">

                    </div>

                </div>

                <h1>
                    <button class="btn btn-success start_game" style="margin-top:20px">Start Game</button>
                    <button class="btn btn-warning start_multiplayer" style="margin-top:20px;color:white">Multiplayer</button>
                </h1>

                <h6>
                    &copy; copyright ... all right :-)
                </h6>
            </div>
        </div>

        <div class="row player_selection game_box" style="display:none">

            <div class="col-md-12 text-center" style="border-radius:5px;background:white;padding:40px;border:solid 1px #bcbaba">

                <h2 style="color:#563D7C">Add Players</h2>

                <div class="col-md-12" style="cursor:pointer">
                    <img src="./avatars/128x128/128_1.png" class="img-fluid player_avatar" data-toggle="modal"
                         data-target="#user_avatar">
                    <div class="input-group mb-3" style="margin-top:10px">
                        <input type="text" class="form-control player_name">
                        <div class="input-group-append">
                            <span class="input-group-text">Enter Player Name</span>
                        </div>
                    </div>
                </div>

                <div class="row players_list" style="margin:20px 0px 20px 0px;max-height:300px;overflow-y:scroll">

                </div>

                <div class="col-md-12">
                    <button class="btn btn-danger add_player" disabled="disabled" style="margin-top:20px">Add New Player
                    </button>
                    <button class="btn btn-info start_game_final" disabled="disabled" style="margin-top:20px">Start Game
                    </button>
                    <button class="btn btn-success go_back" style="margin-top:20px">Go Back</button>
                </div>

            </div>
        </div>

        <div class="row game_board game_box" style="display:none">

            <div class="col-md-12 text-center" style="border-radius:5px;background:white;padding:40px;border:solid 1px #bcbaba">
                <h2 style="color:#563D7C">Let's get ready for the rumble</h2>

                <div class="col-md-12 dice_board" style="display:none;margin-top:20px">
                    <canvas id="dice_one"></canvas>
                    <canvas id="dice_two"></canvas>
                </div>

                <div class="row players_list" style="margin:20px 0px 20px 0px;max-height:300px;overflow-y:scroll"></div>

                <div class="col-md-12">
                    <button class="btn btn-warning roll_a_dice" style="margin-top:20px;color:white">Roll the dices</button>
                    <button class="btn btn-info pass_turn" style="margin-top:20px;color:white;display:none">Hold</button>
                </div>

            </div>

            <div class="col-md-12 text-center"
                 style="border-radius:5px;background:white;padding:40px;border:solid 1px #bcbaba;margin-top:10px">

                <table id="users_list" class="display dataTable" style="width:100%">

                    <thead>
                    <th>Player</th>
                    <th>Overall Score</th>
                    <th>Round Score</th>
                    <th>Progress</th>
                    </thead>

                    <tbody></tbody>

                </table>

            </div>

            <div class="col-md-12">
                <button class="btn btn-danger float-right cancel_game" style="margin-top:20px;color:white">Cancel Game</button>
            </div>
        </div>

        <script src="{{ asset('js/jquery-3.4.1.min.js') }}"></script>
        <script src="{{ asset('js/popper.min.js') }}"></script>
        <script src="{{ asset('js/bootstrap.min.js') }}"></script>

        <!--Proper JS app -->
        <script src="{{ asset('js/app.js') }}"></script>


        <script src="{{ asset('js/sweetalert2.js') }}"></script>
        <script type="text/javascript" src="{{ asset('js/datatables.min.js') }}"></script>

        <script type="text/javascript">

            $(function () {

                "use strict";

                app.start();

            })
        </script>

    </body>
</html>
