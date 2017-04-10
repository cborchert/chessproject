jQuery(document).ready( function($){ 
  
  var game = {

    chess: new Chess(),
    history: [],
    shadeInvisible: true,
    shadeThreat: true,
    shadeMovement: true,
    opponentInvisible: false,
    opponentPiecesAnonymous: false,
    opponentReady: true,
    opponentAutoplay: false,
    alwaysDraw: false,
    playerIsMoving: false,
    playerIsPromoting: false,
    playerSelectedSquare: false,
    playerColor: 'w',
    playerNeedsToPromote: false,
    playerPromotionChoice: '',
    playerName: 'stranger',
    captures: [],
    showOpponentCaptures: true,
    showPlayerCaptures: true,
    announceCheckOnOpponent: true,
    announceCheckOnPlayer: true,
    gameStarted: false,
    bName: '[empty]',
    wName: '[empty]',
    bOnline: false,
    wOnline: false,
    isInit: false,

    init: function() {

      game.drawBoard();

      if( !game.isInit ) {
        $('.board__square').click( function(e){

          e.preventDefault();
          var squareId = $(this).attr('data-id');
          game.moveStep( squareId );

        });
        
        $('#game').on('click', '.player__me', function(e) {
        
          e.preventDefault();
          modal.userNamePrompt();
          
        });
        
        game.isInit = true;
      }

    },
    
    getOptions: function() {
      
      return { 
        shadeInvisible: game.shadeInvisible,
        shadeThreat: game.shadeThreat,
        opponentInvisible: game.opponentInvisible,
        opponentPiecesAnonymous: game.opponentPiecesAnonymous,
        playerColor: game.playerColor,
        showOpponentCaptures: game.showOpponentCaptures,
        showPlayerCaptures: game.showPlayerCaptures,
        announceCheckOnOpponent: game.announceCheckOnOpponent,
        announceCheckOnPlayer: game.announceCheckOnPlayer,
      };
      
    },
    
    setOptions: function( gameOptions ) {
      
      console.log( 'setting up game' );
      console.log( userId );
      
      game.shadeInvisible = gameOptions.shadeInvisible;
      game.shadeThreat = gameOptions.shadeThreat;
      game.opponentInvisible = gameOptions.opponentInvisible;
      game.opponentPiecesAnonymous = gameOptions.opponentPiecesAnonymous;
      game.showOpponentCaptures = gameOptions.showOpponentCaptures;
      game.showPlayerCaptures = gameOptions.showPlayerCaptures;
      game.announceCheckOnOpponent = gameOptions.announceCheckOnOpponent;
      game.announceCheckOnPlayer = gameOptions.announceCheckOnPlayer;
      game.playerColor = '';
      game.wName = gameOptions.wName;
      game.bName = gameOptions.bName;
      game.wOnline = gameOptions.wOnline;
      game.bOnline = gameOptions.bOnline;
      
      console.log('me: ' + userId + ' black: '+gameOptions.bPlayer + ' white: '+ gameOptions.wPlayer);
      
      
      
      if( gameOptions.bPlayer == userId) {
        
        game.playerColor = 'b';
        
        
      } else if( gameOptions.wPlayer == userId ) {
        
        game.playerColor = 'w';
        
      } 
      game.init();
      game.chess.load(gameOptions.gameState);
     
    
    },
    
    joinGame: function( id ) {
      
      ws.send(JSON.stringify({ type: 'joinGame', gameId: id }));
      
    },

    drawBoard: function() {

      
      $('#game').removeClass('game--turn-w');
      $('#game').removeClass('game--turn-b');
      $('#game').addClass('game--turn-'+this.chess.turn());
      //console.log('drawing board');
      var board = this.chess.board(),
          playerColor = this.playerColor;
      
      //Set up user names
      //Names!
      $('.player__white .player__name').html(game.wName);
      $('.player__black .player__name').html(game.bName);
      
      //WHO AM IIIIII?
      $('.player').removeClass('player__me');
      
      if( playerColor == 'w' ) {
        
        $('.player__white').addClass('player__me');
        
      }
      
      if( playerColor == 'b' ) {
        
        $('.player__black').addClass('player__me');
        
      }
      
      //Active status
      $('.player').removeClass('player--active');
      if( game.bOnline ) {
        
        $('.player__black').addClass('player--active') 
        
      }
      if( game.wOnline ) {
        
        $('.player__white').addClass('player--active') 
        
      }

      //Clear the board
      $('.board__square').attr('data-piece', '');
      $('.board__square').attr('data-color', '');

      //Draw captures
      this.drawCaptures();

      //Rotate the board
      if( playerColor == 'w' ) {

        $('.board').attr('data-player-view', '');

      } else {

        $('.board').attr('data-player-view', 'black');

      }

      //Draw the pieces
      board.forEach( function(row, r) {

        row.forEach( function(piece, c) {

          if( typeof piece !== 'undefined' && piece !== null ) {

            var colNames = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h' ],
                rowNum = 8 - r,
                colName = colNames[c],
                squareId = colName + rowNum.toString(),
                $theSquare = $('.board__square[data-id="'+squareId+'"]'),
                thePiece = piece.type + piece.color;

            $theSquare.attr('data-color', piece.color);

            if( piece.color == playerColor ) {

              //Automatically draw the pieces of player's own color
              $theSquare.attr('data-piece', thePiece);

            } else {

              //Drawing opponent's pieces depends on game options

              //If opponent invisible, skip
              //If fog of war is on, skip
              if( !this.opponentInvisible ){

                if( !this.shadeInvisible || (this.shadeInvisible && this.isSquareVisible( squareId ) ) ) {

                  //If opponent pieces anonymous
                  if( this.opponentPiecesAnonymous ) {

                    $theSquare.attr('data-piece', 'u'+piece.color);

                  } else {

                    $theSquare.attr('data-piece', piece.type+piece.color);

                  }

                }

              }

            }

          }

        }, this); //pass the game object as this

      }, this); //pass the game object as this

      //shade visible
      this.drawVisibility();

      //shade threats
      if( this.chess.turn() == this.playerColor ) {
      
        if( this.shadeThreat ){ this.drawThreats(); }
        
      } 
      
      this.announceCheck();

    },

    isSquareVisible: function( squareId ) {

      //console.log('determining square visible');
      var oldFen = this.chess.fen(),
          newFen = oldFen.substr(0, oldFen.indexOf(' ') + 1) + ' ' + this.playerColor + ' - - 0 1';
      this.chess.load(newFen);
      var moves = this.chess.moves({ verbose: true }),
          visible = false;

      if( typeof moves !== 'undefined' && moves.length > 0 ) {

        moves.forEach( function(move) {

          if( move.to[0] == squareId[0] && move.to[1] == squareId[1] ) {

            visible = true;

          }

        });

      }
      this.chess.load(oldFen);

      return visible;

    },

    drawVisibility: function() {

      //console.log('drawing visibility');
      if( this.shadeInvisible ) {

        //Clear the visibility
        $('.board__square').attr('data-invisible', 'true');

        var oldFen = this.chess.fen(),
            newFen = oldFen.substr(0, oldFen.indexOf(' ') + 1) + ' ' + this.playerColor + ' - - 0 1';
        this.chess.load(newFen);
        var moves = this.chess.moves({ verbose: true });
        if( typeof moves !== 'undefined' && moves.length > 0 ) {

          moves.forEach( function(move) {

            console.log(move);
            //example value for move
            //{color:"w", flags:"n", from:"d2", piece:"p", san:"d3", to:"d3"}
            $('.board__square[data-id="'+move.to+'"]').attr('data-invisible', '');

          });

        }
        console.log(this.chess.load(oldFen));

      } else {

        //Clear the visibility
        $('.board__square').attr('data-invisible', '');

      }

    },

    drawThreats: function(){

      //console.log('drawing threats');
      //console.log(this);
      //Clear the threats
      $('.board__square').attr('data-threat', '');

      var moves = this.chess.moves({ verbose: true });

      if( typeof moves !== 'undefined' && moves.length > 0 ) {

        moves.forEach( function(move) {

          //Make a hypothetical move
          this.chess.move(move);

          var responses = this.chess.moves({ verbose: true });

          if( typeof responses !== 'undefined' && responses.length > 0 ) {

            responses.forEach( function(response) {


              if( response.flags.indexOf('c') >= 0 || response.flags.indexOf('e') >= 0 ) {

                $('.board__square[data-id="'+response.to+'"]').attr('data-threat', 'true');

              } 

            });

          }

          this.chess.undo();

        }, this);

      }

    },

    clearMovement: function() {


      $('.board__square').attr('data-movement', '');

    },

    drawMovement: function( squareId ) {

      //console.log('drawing movement');
      //Clear the movement
      this.clearMovement();

      var moves = this.chess.moves({ verbose: true, square: squareId });
      if( typeof moves !== 'undefined' && moves.length > 0 ) {

        moves.forEach( function(move) {

          $('.board__square[data-id="'+move.to+'"]').attr('data-movement', 'true');

        });

        return true;

      } else {

        return false;

      }

    },

    moveStep( squareId ) {

      if( game.chess.turn() !== game.playerColor ) {
        
        console.log('not your turn');
        return false;
        
      }
      
      if( !this.playerIsMoving ) {

        console.log('player not moving');

        this.selectedPiece = squareId;
        this.playerIsMoving = this.drawMovement( squareId );

      } else if( this.playerIsMoving && !this.playerIsPromoting ) {

        console.log('player moving, not promoting');

        //get the move
        var moves = this.chess.moves({verbose: true}),
            moveFrom = this.selectedPiece,
            moveTo = squareId,
            theMove = null;

        moves.forEach( function(move) {

          if(move.from == moveFrom && move.to == moveTo) {

            theMove = move;

          }

        });

        //check if move is promotion
        if( theMove !== null && theMove.flags.indexOf('p') >= 0 ) {

          console.log('needs to promote');

          this.playerIsPromoting = true;
          this.playerSelectedSquare = squareId;
          this.playerPromotionChoice = '';
          modal.promotionPrompt();

        } else if( !this.playerIsPromoting && theMove !== null && theMove.flags.indexOf('p') == -1 ) {

          console.log('doesn\'t need to promote');  

          //make move
          var moveResult = this.chess.move({from: moveFrom, to: moveTo });

          //console.log(moveResult);
          if( moveResult !== 'null' ) {

            this.history.push( this.chess.fen() );
            ws.send(JSON.stringify({type: 'updateGame', gameState: this.chess.fen()}));

          }

          this.drawBoard();
          this.addCaptures( moveResult );
          this.playerSelectedSquare = '';
          this.clearMovement();
          this.selectedPiece = '';
          this.isSelectingMove = false;
          this.playerIsMoving = false;
//          this.announceCheck();

        } else if( theMove == null ) {

          this.playerSelectedSquare = '';
          this.clearMovement();
          this.selectedPiece = '';
          this.isSelectingMove = false;
          this.playerIsMoving = false;

        }

      } else if( this.playerIsMoving && this.playerIsPromoting && this.playerPromotionChoice !== '' ) {

        console.log('player moving and promoting');

        var moveFrom = this.selectedPiece,
            moveTo = this.playerSelectedSquare,
            moveResult = this.chess.move({from: moveFrom, to: moveTo, promotion: this.playerPromotionChoice });

        //console.log(moveResult);
        if( moveResult !== 'null' ) {

          this.history.push( this.chess.fen() );
          this.drawBoard();
          this.addCaptures( moveResult );
          this.clearMovement();
          this.selectedPiece = '';
          this.playerIsMoving = false;
          this.isSelectingMove = false;
          this.playerIsPromoting = false;
          this.playerPromotionChoice = '';
          ws.send(JSON.stringify({type: 'updateGame', gameState: this.chess.fen()}));
          //this.announceCheck();

        } else {

          modal.promotionPrompt();
          this.playerPromotionChoice = '';

        }

      }

    },

    announceCheck: function() {

      var sidePlay = this.chess.turn() == 'w'?'White':'Black';
      
      $('.player').removeClass('player--check');
      
      if(this.chess.in_check()) {
      
        console.log('check!');
        
      }

      if( this.chess.in_check() && this.chess.turn() == this.playerColor && this.announceCheckOnPlayer ) {

        modal.prompt(sidePlay+' is in check', ' ');
        $('.player__'+sidePlay.toLowerCase()).addClass('player--check');
        $('.board__square[data-piece="k'+this.chess.turn()+'"]').attr('data-threat', 'true');

      }

      if( this.chess.in_check()  && this.chess.turn() !== this.playerColor && this.announceCheckOnOpponent ) {

        modal.prompt(sidePlay+' is in check', ' ' );
        $('.player__'+sidePlay.toLowerCase()).addClass('player--check');
        
      }

    },

    gameStep: function() {

      console.log( this.playerColor );
      console.log( this.chess.turn() == this.playerColor );
      
      if( this.chess.game_over() ) {

        //console.log('checkmate');
        this.opponentInvisible = false;
        this.opponentPiecesAnonymous = false;
        this.shadeInvisible = false;
        this.drawBoard();

        var sideWin = this.chess.turn() == 'b'?'White':'Black',
            sidePlay = this.chess.turn() == 'w'?'white':'black';

        if( this.chess.in_checkmate() ) {

          modal.prompt(sideWin + ' Wins!', ' ', ' ');
          $('.player').removeClass('player--check');
          $('.player__'+sidePlay).addClass('player--mate');
          

        } else if( this.chess.in_stalemate() ) {

          modal.prompt('Stalemate', ' ');

        } else if( this.chess.in_draw() ) {

          modal.prompt('Draw', ' ');

        }


      }

      if( this.chess.turn() == this.playerColor ) {

        //console.log('player\'s turn');
        this.drawBoard();

      } 
      
    },

    addCaptures: function( move ) {

      if( typeof move !== 'undefined' && move !== null ) {

        if( typeof move.flags !== 'undefined' && move.flags.indexOf('c') >= 0 ) {

          var colorCaptured = move.color == 'w' ? 'b' : 'w',
              pieceCaptured = move.captured;
          this.captures.push( { piece: pieceCaptured, color: colorCaptured, by: move.color });

        }

      }

    },

    drawCaptures: function() {

      //clear captures
      $('.captures__black').html('');
      $('.captures__white').html('');

      this.captures.forEach( function(capture){

        var $captureContainer = capture.by == 'w'?$('.captures__white'):$('.captures__black');

        if( (capture.by == this.playerColor && this.showPlayerCaptures) ||
            (capture.by !== this.playerColor && this.showOpponentCaptures) ) {

          $captureContainer.append('<div class="captures__piece" data-piece="'+capture.piece+capture.color+'"></div>');

        }

      }, this);

    },



  };

  var modal = {

    $modal: null,
    $overlay: null,

    init: function() {

      this.$modal = $('.modal');
      this.$overlay = $('.modal-overlay');

      this.$modal.find('.modal__game-options').hide();

      $(this.$modal).on('click', '.modal__cancel', function(e) {
      
        modal.close();
        
      });
      
      $(this.$modal).on('click', '.modal__action', function(e) {

        e.preventDefault;
        var action = $(e.target).data('action');

        if( action == 'close' ){

          modal.close();

        }

        if( action == 'promote' ) {

          var promotion = modal.$modal.find('.promotion').first().val();
          if(promotion !== null){

            game.playerPromotionChoice = promotion;
            modal.close();
            game.moveStep(null);
            
          }

        }

        if( action == 'start-game' ) {

          game.gameStarted = true;
          modal.$modal.find('.modal__game-options').hide();
          modal.close();
          game.init();
          ws.send(JSON.stringify({ type: 'createGame', gameOptions:game.getOptions() }));

        }
        
        if( action == 'save-user-name' ) {
          
          game.playerName = modal.$modal.find('.user__name__input').val();
          ws.send(JSON.stringify({ type: 'changeName', name:game.playerName }));
          var titles = [' the Butcher.', 
                        ' the Great.', 
                        ', destroyer of worlds.', 
                        ' the sweet.', 
                        ' with the red right hand.', 
                        ' the nonchalant.', 
                        ', mother of dragons.', 
                        '... deep '+game.playerName+'.', 
                        ' the regicide.', 
                        ' aka "Babyface"',
                        ' the dunce.',
                        ' the inept.',
                        ' of questionable intelligence',
                        ' the baffled',
                        ', Dovahkiin. DRAGONBORN!'],
              title = titles[ Math.floor(Math.random()*titles.length) ];
//          modal.prompt(' ', 'You shall be known heretofore as ' + game.playerName + title);
          modal.close();
          
        }
        
        if( action == 'quit-game' ) {
         
          ws.send(JSON.stringify({ type: 'quitGame'}));
          modal.close();
          
        }
        
        if( action == 'go-home' ) {
         
          $('#room').show();
          $('#game').hide();
          $('.chat__messages').html('');
          ws.send(JSON.stringify({ type: 'getAvailableGames'}));
          modal.close();
          
        }

      });

    },

    prompt: function( headerText, bodyText ) {

      var $head = modal.$modal.find('.modal__head'),
          $body = modal.$modal.find('.modal__body'),
          $action = modal.$modal.find('.modal__action'),
          $cancel = modal.$modal.find('.modal__cancel'),
          $gameOptions= modal.$modal.find('.modal__game-options'),
          $userNamePrompt = modal.$modal.find('.modal__game-name');

      $cancel.hide();
      $userNamePrompt.hide();
      $gameOptions.hide();
      $head.html(headerText);
      $body.html(bodyText);
      $action.html('Close');
      $action.data('action','close');

      modal.open();

    },

    promotionPrompt: function() {

      var $head = modal.$modal.find('.modal__head'),
          $body = modal.$modal.find('.modal__body'),
          $action = modal.$modal.find('.modal__action'),
          $cancel = modal.$modal.find('.modal__cancel'),
          $gameOptions= modal.$modal.find('.modal__game-options'),
          $userNamePrompt = modal.$modal.find('.modal__game-name');

      $cancel.hide();
      $gameOptions.hide();
      $userNamePrompt.hide();
      $head.html('Promote your pawn');
      $body.html('');

      $body.append('<select class="promotion"></select>');

      var items = [ 
        { value: 'q', text:'Queen' },
        { value: 'r', text:'Rook' },
        { value: 'n', text:'Knight' },
        { value: 'b', text:'Bishop' },
      ];

      $.each(items, function (i, item) {

        modal.$modal.find('select').append($('<option>', {

          value: item.value,
          text : item.text

        }));

      });

      $action.html('Select');
      $action.data('action','promote');

      modal.open();

    },
    
    userNamePrompt: function() {
      
      var $head = modal.$modal.find('.modal__head'),
          $body = modal.$modal.find('.modal__body'),
          $action = modal.$modal.find('.modal__action'),
          $gameOptions= modal.$modal.find('.modal__game-options'),
          $cancel = modal.$modal.find('.modal__cancel'),
          $userNamePrompt = modal.$modal.find('.modal__game-name');

      $gameOptions.hide();
      $cancel.hide();
      $userNamePrompt.show();
      modal.$modal.find('.user__name').html(game.playerName);
      modal.$modal.find('.user__name__input').val(game.playerName);
      $head.html('');
      $body.html('');
      $action.html('Save setting');
      $action.data('action','save-user-name');
      modal.open();
      
    },

    optionsPrompt: function() {

      game.drawBoard();

      var $head = modal.$modal.find('.modal__head'),
          $body = modal.$modal.find('.modal__body'),
          $action = modal.$modal.find('.modal__action'),
          $gameOptions = modal.$modal.find('.modal__game-options'),
          $cancel = modal.$modal.find('.modal__cancel'),
          $userNamePrompt = modal.$modal.find('.modal__game-name');

      $userNamePrompt.hide();
      $gameOptions.show();
      $cancel.hide();
      $head.html('Game Options');
      $body.html('');
      $action.html('Start Game');
      $action.data('action','start-game');

      function toggleOption( event, value, option ) {

        //event.preventDefault();
        console.log( option, value );
        game[option] = value;
        
        if( game.playerColor == 'b' && game.shadeInvisible ) {
          
          game.chess.move({from: 'a2', to: 'a3'});
          game.drawBoard();
          game.chess.undo();


        } else {

          game.drawBoard();

        } 

      }

      modal.$modal.on('click', 'input[name="opponent-autoplay"]', function(e) { 

        toggleOption(e, $(e.target).prop('checked'), 'opponentAutoplay');
        toggleOption(e, !$(e.target).prop('checked'), 'alwaysDraw');

      });
      modal.$modal.on('click', 'input[name="shade-invisible"]', function(e) {  toggleOption(e, $(e.target).prop('checked'), 'shadeInvisible'); });
      modal.$modal.on('click', 'input[name="shade-threat"]', function(e) {  toggleOption(e, $(e.target).prop('checked'), 'shadeThreat'); });
      modal.$modal.on('click', 'input[name="opponent-invisible"]', function(e) {  toggleOption(e, $(e.target).prop('checked'), 'opponentInvisible'); });
      modal.$modal.on('click', 'input[name="opponent-pieces-anonymous"]', function(e) {  toggleOption(e, $(e.target).prop('checked'), 'opponentPiecesAnonymous'); });
      modal.$modal.on('click', 'input[name="show-opponent-captures"]', function(e) {  toggleOption(e, $(e.target).prop('checked'), 'showOpponentCaptures'); });
      modal.$modal.on('click', 'input[name="show-player-captures"]', function(e) {  toggleOption(e, $(e.target).prop('checked'), 'showPlayerCaptures'); });
      modal.$modal.on('click', 'input[name="announce-check-on-player"]', function(e) {  toggleOption(e, $(e.target).prop('checked'), 'announceCheckOnPlayer'); });
      modal.$modal.on('click', 'input[name="announce-check-on-opponent"]', function(e) {  toggleOption(e, $(e.target).prop('checked'), 'announceCheckOnOpponent'); });
      modal.$modal.on('click', 'input[name="play-as-white"]', function(e) {  

        toggleOption(e, $(e.target).prop('checked')?'w':'b', 'playerColor'); 

      });

      modal.open();


    },

    quitPrompt: function() {

      var $head = modal.$modal.find('.modal__head'),
          $body = modal.$modal.find('.modal__body'),
          $action = modal.$modal.find('.modal__action'),
          $cancel = modal.$modal.find('.modal__cancel'),
          $gameOptions = modal.$modal.find('.modal__game-options'),
          $userNamePrompt = modal.$modal.find('.modal__game-name');

      $userNamePrompt.hide();
      $gameOptions.hide();
      $cancel.show();
      
      $head.html('Are you sure you want to quit?');
      $body.html('');
      $action.html('Quit Game');
      $action.data('action','quit-game');
      
      modal.open();

    },
    
    gameEndedPrompt: function( playerQuitId ) {

      var $head = modal.$modal.find('.modal__head'),
          $body = modal.$modal.find('.modal__body'),
          $action = modal.$modal.find('.modal__action'),
          $cancel = modal.$modal.find('.modal__cancel'),
          $gameOptions = modal.$modal.find('.modal__game-options'),
          $userNamePrompt = modal.$modal.find('.modal__game-name');

      $userNamePrompt.hide();
      $gameOptions.hide();
      $cancel.hide();
      
      var playerQuitName = 'You';
      if( playerQuitId !== userId ) {
        
        playerQuitName = game.playerColor == 'w'?game.bName:game.wName;
        
      }
        
      $head.html(playerQuitName + ' quit the game');
      $body.html('');
      $action.html('Okay');
      $action.data('action','go-home');
      
      modal.open();

    },

    close: function() {

      modal.$overlay.removeClass('modal-overlay--open');

    },

    open: function() {

      modal.$overlay.addClass('modal-overlay--open');

    },

  }
  
  var HOST = location.origin.replace(/^http/, 'ws'),
      userId = false,
      ws = new WebSocket(HOST),
      source   = $('#single-game-template').html(),
      template = Handlebars.compile(source),
      context = {items: []},
      messagesSource = $('#messages-template').html(),
      messagesTemplate = Handlebars.compile(messagesSource),
      messagesContext = {items: []};
  
  console.log('this is happening more than once');
  
  ws.onclose = function(event) {
  
    console.log(event);
    $('#game').hide();
    $('#room').hide();
    if( event.wasClean ) {
      
      modal.prompt('Disconnection', 'The connection with the server has been closed. If you opened the game in another window, you can continue to play there, otherwise, try reloading the page.');
    
    } else {
      
      modal.prompt('Disconnection', 'Hmmm... The connection with the server has been closed. Try reloading the page.');
      location.reload();
      
    }
    
  };
  
  ws.onmessage = function (event) {

    var data = JSON.parse(event.data),
        message = '';

    console.log( data );
    if( data.type == 'gameState' ) {
      
      console.log(' getting game state ');
      console.log( data.game );
      
      $('#game').show();
      $('#room').hide();
      game.setOptions(data.game);
      game.gameStep();
      
      messagesContext.items = [];
      data.game.messages.forEach( function( message ){
        
        message.classes = '';
        
        var textArea = document.createElement('textarea');
        textArea.innerHTML = message.message;
        message.message = textArea.value;
        
        if( message.userId == userId ) {
          
          message.classes += ' chat__message--me';
          message.classes += game.playerColor == 'w'?' chat__message--white':' chat__message--black';
          
        } else {
          
          message.classes += game.playerColor == 'b'?' chat__message--white':' chat__message--black';
          
        }
        
        messagesContext.items.push(message);
        
      });
      
      var html = messagesTemplate(messagesContext);
      $('.chat__messages').html(html);
      $('.chat__messages').scrollTop( $('.chat__messages').prop('scrollHeight') );
      
      
    } else if( data.type == 'userIdCreated' ) {
      
      userId = data.message;
      Cookies.set('chessUser', userId );
      console.log('created user ' + userId);
      modal.userNamePrompt();
      
    } else if( data.type == 'userLoaded' ) {
      
      userId = data.id;
      Cookies.set('chessUser', userId );
      console.log('connected as '+userId);
      
      console.log( data.game );
      
      if( data.game !== false ) {
       
        game.setOptions( data.game );
        
      }
      
      
    } else if( data.type == 'availableGames' ) {
      
      context.items = [];
      data.message.forEach( function( openGame ){
        
        openGame.openSeat = 'black';
        openGame.creator = openGame.wName;
        if( openGame.wPlayer == null) {
          
          openGame.openSeat = 'white';
          openGame.creator = openGame.bName;
        
        }
        context.items.push({title: 'Play as '+openGame.openSeat+' against '+openGame.creator, game: openGame, gameCreator: openGame.creator });
        
      });
      
      var html = template(context);
      jQuery("#room__games").html(html);
      
    } else if( data.type == 'initialGameState' ) {
     
      console.log('getting initial game state');
      if( data.message === false ) {
       
        //deal with error
        modal.prompt('Game is full');
        
      } else {
        
        $('#game').show();
        $('#room').hide();
        console.log( data.message );
        game.setOptions(data.message);
        
      }
      
    } else if( data.type == 'requestUserId' ) {
     
      userId = Cookies.get('chessUser');
      console.log('requesting user id');
      console.log(userId);
      ws.send(JSON.stringify({ type: 'loadUser', userId: userId }));
      
    } else if( data.type == 'quitGame' ) {
     
      modal.gameEndedPrompt( data.player );
      
    } else if( data.type == 'forceDisconnection' ) {
     
      ws.close();
      
    }

  };

  
  $('button.js-create-game').click( function() {
    
    modal.optionsPrompt();
    $('#game').show();
    $('#room').hide();
    
  });
  
  $('.js-view-board').click( function() { 
  
    $('.game-panel--chat').removeClass('game-panel--chat--in-front');
    
  });
  
  $('.js-view-chat').click( function() { 
  
    $('.game-panel--chat').addClass('game-panel--chat--in-front');
    
  });
  
  $('.js-send-chat').click( function() {
    
    var $chatMessage = $('.chat__to-send__message');
    ws.send( JSON.stringify({ type: 'addMessage', message: $chatMessage.val() }));
    $chatMessage.val('');
    
  });
  
  $('button.js-quit-game').click( function() {
    
    modal.quitPrompt();
    
  });
  
  $('#room').on('click', 'button.js-join-game', function(e) {
    
    game.joinGame( $(e.target).data('game-id') );
    
  });
  
  modal.init();
  
});