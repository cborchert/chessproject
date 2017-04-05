'use strict';

//includes and basics
const _ = require('underscore');
const express = require('express');
const exphbs = require('express-handlebars');
const hbs = exphbs.create({
  defaultLayout: 'main',
  helpers: {
    forNumbers: (n, m, block)=>{ 
      let accum = '';
      if( n < m ) {
        for(let i = n; i <= m; i++){
          accum += block.fn(i);
        }
      } else {
        for(let i = n; i >= m; i--){
          accum += block.fn(i);
        }
      }
      return accum;
    },
    rowLabels: (n, number, block)=>{ 
      let alphabet = 'abcdefghijklmnopqrstuvwxyz';
      let accum = '';
      for(let i = 0; i < n; ++i) {
        accum += block.fn(alphabet[i]+number);
      }
      return accum;
    }
  }
  
});

const SocketServer = require('ws').Server;
const path = require('path');

const PORT = process.env.PORT || 3000;
const INDEX = path.join(__dirname, 'index.html');

//other vars
let userConnections = [],
    users = [],
    games = [],
    newUserId = 0,
    newGameId = 0;

//Set up routes
const router = express()
  .set('views', './templates')
  .set('view engine', 'pug');
router.get('/', (req, res) => res.render('home'));
router.get('/:game', (req, res) => res.render('home', {game: req.params.game}) );
router.use(express.static('public/'));

//Set up app
const server = express()
  .use('/', router)
  .listen(PORT, () => console.log(`Listening on ${ PORT }`));

//set up socket server
const wss = new SocketServer({server: server});

//handle socket server connection
wss.on('connection', (ws) => {

  newUserConnection(ws);
  
  ws.on('close', () => { userDisconnection(ws); });
  
  ws.on('message',  (event) => { userHandleMessage(ws, event); });
  
    
});

function getConnectionFromUserId(userId) {
  
  console.log('----------------------');
  console.log('getConnectionFromUserId');
  let user = _.findWhere( userConnections, {id: userId} );
  
  if(typeof user == 'object' && user !== null) {
   
    return user.connection;
    
  }
  
  return false;
  
  
}

function getUserGame(userId) {
  
  console.log('----------------------');
  console.log('getUserGame');
  let user = _.findWhere( users, {id: userId} );
  
  if(typeof user == 'object' && user !== null) {
   
    return user.game;
    
  }
  
  return false;
  
}


function getUserIdFromConnection(connection) {
  
  console.log('----------------------');
  console.log('getUserIdFromConnection');
  let user = _.findWhere( userConnections, {connection: connection} );
  
  if(typeof user == 'object' && user !== null) {
   
    return user.id;
    
  }
  
  return false;
  
}

function sendUserListToClients() {
  
  console.log('----------------------');
  console.log('sendUserListToClients');
  console.log( users );
  
  let message = { 
    
    type: 'userList',
    message: users
    
  };
  
  wss.clients.forEach( (client) => {
    
    client.send( JSON.stringify(message) );
    
  });
  
}
  
function newUserConnection(ws) {
  
  console.log('----------------------');
  console.log('newUserConnection');
  let id = newUserId;
  newUserId ++;
  
  users.push({ id: id, game: null });
  
  userConnections.push({ id: id, connection: ws });
  console.log(userConnections);
  
  let message = { type: 'userIdCreated', message: id };
  
  ws.send(JSON.stringify(message));
  getAvailableGames(ws);
  
  
}
  
function userDisconnection(ws) {
 
  console.log('----------------------');
  console.log('userDisconnection');
  //Trim user from users array
  users = _.reject( users, (user) => {
    
    return user.id == getUserIdFromConnection(ws);

  });

  //Trim user from user connections array
  userConnections = _.reject( userConnections, (user) => {

    return user.id == getUserIdFromConnection(ws);

  });

  //Trim user from games
  //Set game state 
  
  
}

function userHandleMessage(ws, event) {

  console.log('----------------------');
  console.log('userHandleMessage');
  let data = JSON.parse( event ),
      userId = getUserIdFromConnection(ws);

  //create game
  //join game
  //update game state
  //get game state
  
  if ( data.type == 'createGame' ) {  
    
    let gameId = createGame( userId, data.gameOptions );
    
    if( gameId === false ) {
     
      //handle error
      
    } else {
      
      console.log(users);
      //Assign game id to user
      users = _.map( users, (user) => {
        
        if(typeof user == 'object' && user.id === userId) {
        
          user.game = gameId; 
        
        }
        
        return user;
        
      });
      
      console.log(users);
      
      //Send user the game id
      let message = { type: 'gameCreated', message: gameId };
      ws.send(JSON.stringify(message));
      
      //Send user the game
      sendGameState(gameId);
      
      broadcastAvailableGames();
      
    }

  } else if( data.type == 'joinGame' ) {
    
    let game = joinGame( data.gameId, userId ),
        message = { type: 'initialGameState', message: game };
    ws.send(JSON.stringify(message));
    
  } else if( data.type == 'updateGame' ) {
   
    updateGame( userId, data.gameState );
    
  } else if( data.type == 'getGameState' ) {
   
    getGameState( data.gameId, userId );
    
  } else if( data.type == 'getAllGames' ) {
   
    getAllGames(ws);
    
  } else if( data.type == 'getAvailableGames' ) {
   
    getAvailableGames(ws);
    
  }
  
}

//returns game id 
function createGame(userId, options) {
  
  console.log('----------------------');
  console.log('createGame');
  //Initialize game
  let gameId = newGameId,
      isError = false;
  newGameId ++;

  if( typeof options == 'undefined' ) {
    
    options = {
      
      shadeInvisible: true,
      shadeThreat: true,
      opponentInvisible: false,
      opponentPiecesAnonymous: false,
      showOpponentCaptures: true,
      showPlayerCaptures: true,
      announceCheckOnOpponent: true,
      announceCheckOnPlayer: true,
      playerColor: 'w'
      
    };
    
  }
  
  let game = {
    
    id: gameId,
    shadeInvisible: options.shadeInvisible,
    shadeThreat: options.shadeThreat,
    shadeMovement: options.shadeMovement,
    opponentInvisible: options.opponentInvisible,
    opponentPiecesAnonymous: options.opponentPiecesAnonymous,
    showOpponentCaptures: options.showOpponentCaptures,
    showPlayerCaptures: options.showPlayerCaptures,
    announceCheckOnOpponent: options.announceCheckOnOpponent,
    announceCheckOnPlayer: options.announceCheckOnPlayer,
    gameState: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
    wPlayer: null,
    bPlayer: null
    
  };
  
  game[options.playerColor+'Player'] = userId;
  //Validate game info
  
  //Add game to game list
  games.push( game );
  
  if( isError ) {
    
    return false; 
    
  }
  
  
  return gameId;
  
}

function sendGameState( gameId ) {
  
  console.log('----------------------');
  console.log('sendGameState');
 
  let game = _.findWhere( games, {id: gameId} ),
      message = { type: 'gameState', message: game.gameState },
      playerWhite = getConnectionFromUserId(game.wPlayer),
      playerBlack = getConnectionFromUserId(game.bPlayer);
  
  if( typeof playerWhite == 'object' && playerWhite !== null ) {
    
    playerWhite.send(JSON.stringify(message));
    
  }
  
  if( typeof playerBlack == 'object' && playerBlack !== null ) {
    
    playerBlack.send(JSON.stringify(message));
    
  }
  
  
}

function joinGame( gameId, userId ) {
  
  console.log('----------------------');
  console.log('joinGame');
  let game = _.findWhere( games, {id: gameId} ),
      color = 'w',
      userGame = getUserGame(userId);
  
  //User already in game
  if( userGame !== null ) {
    
    //handle error 
    return false;
    
  }
  
  //Game doesn't exist
  if( typeof game == 'undefined') {
    
    //handle error 
    return false;
    
  }
  
  //Game full
  if( game.wPlayer !== null && game.bPlayer !== null ) {
   
    //handle error 
    return false;
    
  }
  
  if( game.wPlayer == null ) {
    
    game.wPlayer = userId;
    
  } else {
   
    game.bPlayer = userId;
    
  }
  
  games = _.map( games, (oldGame) => {
        
    if(oldGame.id === gameId) {

      oldGame = game;

    }
    
    return oldGame;

  });
  
  users = _.map( users, (oldUser) => {
        
    if(oldUser.id === userId) {

      oldUser.game = gameId;

    }
    
    return oldUser;

  });
  
  return game;
  
}

function updateGame( userId, gameState ) {
  
  console.log('----------------------');
  console.log('updateGame');
  console.log(games);
  let user = _.findWhere( users, {id: userId} ),
      gameId = user.game,
      game = _.findWhere( games, {id: gameId} );
  
  //player not in game
  if( game.wPlayer !== userId && game.bPlayer !== userId ) {
   
    //handle error 
    return false;
    
  }
  
  games = _.map( games, (oldGame) => {
        
    if(oldGame.id === gameId) {

      oldGame.gameState = gameState;

    }
    
    return oldGame;

  });
  
  console.log(games);
  sendGameState( gameId );
  
  return true;
  
}

function getGameState( gameId, userId ) {
  
  console.log('----------------------');
  console.log('getGameState');
  
  let game = _.findWhere( games, {id: gameId} ),
      user = getConnectionFromUserId( userId ),
      message = { type: 'gameState', message: game.gameState };
  
  //player not in game
  if( game.wPlayer !== userId && game.bPlayer !== userId ) {
   
    //handle error 
    return false;
    
  }
  
  user.send(JSON.stringify(message));
  
}

function getAllGames( ws ) {
  
  console.log('----------------------');
  console.log('getAllGames');
  console.log(games);
  let message = { type: 'games', message: games };
  ws.send(JSON.stringify(message));
  
}

function broadcastAvailableGames() {
 
  console.log('----------------------');
  console.log('broadcastAvailableGames');
  let gamesToBroadcast = _.filter( games, (game)=>{
    
    if( game.bPlayer == null || game.wPlayer == null ) {
     
      return game;
      
    }
    
    return false;
    
  });
  
  console.log( gamesToBroadcast );
  
  let message = { type: 'availableGames', message: gamesToBroadcast };
  wss.clients.forEach( (client) => {
    
    client.send( JSON.stringify(message) );
    
  });
  
}

function getAvailableGames(ws) {
 
  console.log('----------------------');
  console.log('getAvailableGames');
  let gamesToBroadcast = _.filter( games, (game)=>{
    
    if( game.bPlayer == null || game.wPlayer == null ) {
     
      return game;
      
    }
    
    return false;
    
  });
  
  console.log( gamesToBroadcast );
  
  let message = { type: 'availableGames', message: gamesToBroadcast };
  ws.send(JSON.stringify(message));
  
}
