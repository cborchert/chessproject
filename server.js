'use strict';

const _ = require('underscore');
const express = require('express');
const SocketServer = require('ws').Server;
const path = require('path');

const PORT = process.env.PORT || 3000;
const INDEX = path.join(__dirname, 'index.html');

const server = express()
  .use( (req, res) => res.sendFile(INDEX) )
  .listen(PORT, () => console.log(`Listening on ${ PORT }`));

const wss = new SocketServer({server});

let userConnections = [],
    users = [],
    games = [],
    newUserId = 0,
    newGameId = 0;

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
      
    }

  } else if( data.type == 'joinGame' ) {
    
    joinGame( data.gameId, userId );
    
  } else if( data.type == 'updateGame' ) {
   
    updateGame( data.gameId, userId, data.gameState );
    
  } else if( data.type == 'getGameState' ) {
   
    getGameState( data.gameId, userId );
    
  } else if( data.type == 'getAllGames' ) {
   
    getAllGames(ws);
    
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
  
  console.log(typeof playerWhite);
  
  
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
  
  return true;
  
}

function updateGame( gameId, userId, gameState ) {
  
  console.log('----------------------');
  console.log('updateGame');
  let game = _.findWhere( games, {id: gameId} );
  
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
