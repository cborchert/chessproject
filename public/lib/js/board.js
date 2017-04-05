var $ = jQuery;

var game = {

  chess: new Chess(),
  history: [],
  shadeInvisible: true,
  shadeThreat: true,
  shadeMovement: true,
  opponentInvisible: false,
  opponentPiecesAnonymous: false,
  opponentReady: true,
  opponentAutoplay: true,
  alwaysDraw: false,
  playerIsMoving: false,
  playerIsPromoting: false,
  playerSelectedSquare: false,
  playerColor: 'w',
  playerNeedsToPromote: false,
  playerPromotionChoice: '',
  captures: [],
  showOpponentCaptures: true,
  showPlayerCaptures: true,
  announceCheckOnOpponent: true,
  announceCheckOnPlayer: true,
  gameInterval: '',
  gameStarted: false,
  
  init: function() {
    
    game.drawBoard();

    $('.board__square').click( function(e){

      var squareId = $(this).attr('data-id');
      game.moveStep( squareId );

    });

    //check to see if it's the player's turn
    game.gameInterval = setInterval( function(){
      game.gameStep();
    }, 300);
    
  },
  
  drawBoard: function() {
   
    //console.log('drawing board');
    var board = this.chess.board(),
        turn = this.chess.turn();
    
    //Clear the board
    $('.board__square').attr('data-piece', '');
    $('.board__square').attr('data-color', '');
    
    //Draw captures
    this.drawCaptures();
    
    //Rotate the board
    if( turn == 'w' ) {
     
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

          if( piece.color == turn ) {

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
    if( this.shadeThreat ){ this.drawThreats(); }
    
    
  },
  
  isSquareVisible: function( squareId ) {
    
    //console.log('determining square visible');
    var moves = this.chess.moves({ verbose: true }),
        visible = false;
    
    if( typeof moves !== 'undefined' && moves.length > 0 ) {

      moves.forEach( function(move) {
        
        if( move.to[0] == squareId[0] && move.to[1] == squareId[1] ) {
         
          visible = true;
          
        }

      });

    }
    
    return visible;
    
  },
  
  drawVisibility: function() {
  
    //console.log('drawing visibility');
    if( this.shadeInvisible ) {
      
      //Clear the visibility
      $('.board__square').attr('data-invisible', 'true');

      var moves = this.chess.moves({ verbose: true });
      if( typeof moves !== 'undefined' && moves.length > 0 ) {

        moves.forEach( function(move) {

          //example value for move
          //{color:"w", flags:"n", from:"d2", piece:"p", san:"d3", to:"d3"}
          $('.board__square[data-id="'+move.to+'"]').attr('data-invisible', '');

        });

      }
      
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

        }

        //this.drawBoard();
        this.addCaptures( moveResult );
        this.playerSelectedSquare = '';
        this.clearMovement();
        this.selectedPiece = '';
        this.isSelectingMove = false;
        this.playerIsMoving = false;
        this.announceCheck();
        
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
        //this.drawBoard();
        this.addCaptures( moveResult );
        this.clearMovement();
        this.selectedPiece = '';
        this.playerIsMoving = false;
        this.isSelectingMove = false;
        this.playerIsPromoting = false;
        this.playerPromotionChoice = '';
        
        this.announceCheck();

      } else {
        
        modal.promotionPrompt();
        this.playerPromotionChoice = '';
        
      }
      
    }
    
  },
  
  announceCheck: function() {
    
    var sidePlay = this.chess.turn() == 'w'?'White':'Black';
    
    if( this.chess.in_check() && this.announceCheckOnPlayer ) {

      modal.prompt(sidePlay+' is in check', ' ');

    }

    if( this.chess.in_check() && this.announceCheckOnOpponent ) {

      modal.prompt(sidePlay+' is in check', ' ' );

    }
    
  },
  
  //No AI for the moment... just random moves
  autoPlay: function() {
    
    if( game.chess.turn() == game.playerColor ) {
     
      return false;
      
    }
    
    //console.log('autoplaying');
    var moves = this.chess.moves({verbose: true}),
        move = moves[Math.floor(Math.random() * moves.length)];
    
    var moveResult = this.chess.move(move);
    
    this.announceCheck();
    
    this.addCaptures( moveResult );
    //console.log(move);
    //console.log(moveResult);
    
  },
  
  gameStep: function() {
   
    if( this.chess.game_over() ) {
     
      //console.log('checkmate');
      clearInterval(this.gameInterval);
      this.opponentInvisible = false;
      this.opponentPiecesAnonymous = false;
      this.shadeInvisible = false;
      this.drawBoard();
      
      var sideWin = this.chess.turn() == 'b'?'White':'Black';
      
      if( this.chess.in_checkmate() ) {
       
        modal.prompt(sideWin + ' Wins!', 'Checkmate', ' ');
        
      } else if( this.chess.in_stalemate() ) {
       
        modal.prompt('Stalemate', ' ');
        
      } else if( this.chess.in_draw() ) {
       
        modal.prompt('Draw', ' ');
        
      }
      
      
    }
  
    if( this.chess.turn() == this.playerColor ) {
     
      //console.log('player\'s turn');
      this.drawBoard();
      
    } else {
     
      //console.log('opponent\'s turn');
      if( this.alwaysDraw ) {
        
        this.drawBoard();
      
      }
      
      if( this.opponentAutoplay ) {
        
        this.autoPlay();
        
      }
      
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
          game.moveStep(null);
          modal.close();
        
        }
        
      }
      
      if( action == 'start-game' ) {
       
        game.gameStarted = true;
        modal.$modal.find('.modal__game-options').hide();
        modal.close();
        game.init();
        
      }
      
    });
    
  },
  
  prompt: function( headerText, bodyText ) {
    
    var $head = this.$modal.find('.modal__head'),
        $body = this.$modal.find('.modal__body'),
        $action = this.$modal.find('.modal__action'),
        $gameOptions= this.$modal.find('.modal__game-options');
    
    $gameOptions.hide();
    $head.html(headerText);
    $body.html(bodyText);
    $action.html('Close');
    $action.data('action','close');
    
    this.open();
    
  },
  
  promotionPrompt: function() {
    
    var $head = this.$modal.find('.modal__head'),
        $body = this.$modal.find('.modal__body'),
        $action = this.$modal.find('.modal__action'),
        $gameOptions= this.$modal.find('.modal__game-options');
    
    $gameOptions.hide();
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
    
    this.open();
    
  },
  
  optionsPrompt: function() {
    
    game.drawBoard();
    
    var $head = this.$modal.find('.modal__head'),
        $body = this.$modal.find('.modal__body'),
        $action = this.$modal.find('.modal__action'),
        $gameOptions= this.$modal.find('.modal__game-options');
    
    $gameOptions.show();
    $head.html('Game Options');
    $body.html('');
    $action.html('Start Game');
    $action.data('action','start-game');
    
    function toggleOption( event, value, option ) {
     
      //event.preventDefault();
      game[option] = value;
      game.drawBoard();
      
    }
    
    this.$modal.on('click', 'input[name="opponent-autoplay"]', function(e) { 
      
      toggleOption(e, $(e.target).prop('checked'), 'opponentAutoplay');
      toggleOption(e, !$(e.target).prop('checked'), 'alwaysDraw');
      
    });
    this.$modal.on('click', 'input[name="shade-invisible"]', function(e) {  toggleOption(e, $(e.target).prop('checked'), 'shadeInvisible'); });
    this.$modal.on('click', 'input[name="shade-threat"]', function(e) {  toggleOption(e, $(e.target).prop('checked'), 'shadeThreat'); });
    this.$modal.on('click', 'input[name="opponent-invisible"]', function(e) {  toggleOption(e, $(e.target).prop('checked'), 'opponentInvisible'); });
    this.$modal.on('click', 'input[name="opponent-pieces-anonymous"]', function(e) {  toggleOption(e, $(e.target).prop('checked'), 'opponentPiecesAnonymous'); });
    this.$modal.on('click', 'input[name="show-opponent-captures"]', function(e) {  toggleOption(e, $(e.target).prop('checked'), 'showOpponentCaptures'); });
    this.$modal.on('click', 'input[name="show-player-captures"]', function(e) {  toggleOption(e, $(e.target).prop('checked'), 'showPlayerCaptures'); });
    this.$modal.on('click', 'input[name="announce-check-on-player"]', function(e) {  toggleOption(e, $(e.target).prop('checked'), 'announceCheckOnPlayer'); });
    this.$modal.on('click', 'input[name="announce-check-on-Opponent"]', function(e) {  toggleOption(e, $(e.target).prop('checked'), 'announceCheckOnOpponent'); });
    this.$modal.on('click', 'input[name="play-as-white"]', function(e) {  
      
      toggleOption(e, $(e.target).prop('checked')?'w':'b', 'playerColor'); 
    
    });
    
    this.open();
   
    
  },
  
  close: function() {
    
    this.$overlay.removeClass('modal-overlay--open');
    
  },
  
  open: function() {
    
    this.$overlay.addClass('modal-overlay--open');
  
  },
  
  
  
}

jQuery(document).ready( function($){ 
  
  modal.init();
  modal.optionsPrompt();
  
});