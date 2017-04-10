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
    games = [];

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

  let message = { type: 'requestUserId' };
  ws.send(JSON.stringify(message));
  
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
  
  
  let user = _.findWhere( users, {id: userId} ),
      game;
  console.log(userId);
  console.log(users);
  console.log(user);
  
  if(typeof user == 'object' && user !== null) {
   
//    game = _.findWhere( games, {wPlayer: userId} );
//    if( typeof game == 'undefined' ) {
//      
//      game = _.findWhere( games, {bPlayer: userId} );
//      
//      if( typeof game == 'undefined' ) {
//       
//        return false;
//        
//      }
//      
//    } else {
//      
//      return game;
//      
//    }
    
    if( typeof user.game == 'undefined' || user.game == null || user.game === false ) {
      
      return false;
      
    } else {
      
      return user.game;
      
    }
    
    
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
  let id = 'user_'+Date.now()+'_'+Math.floor((Math.random() * 1000) + 1),
      name = 'Anonymous';
  
  users.push({ id: id, game: null, name: name, online: true });
  
  userConnections.push({ id: id, connection: ws });
  console.log(userConnections);
  
  let message = { type: 'userIdCreated', message: id };
  ws.send(JSON.stringify(message));
  
  message = { type: 'userLoaded', id: id, game: false };
  ws.send(JSON.stringify(message));
  
  getAvailableGames(ws);
  
  setPlayerOnlineStatus(id, true);
  
}

function loadUserConnection(ws, userId) {
  
  console.log('----------------------');
  console.log('loadUserConnection');
  
  //disconnect other user connections
  let oldConnection = _.findWhere( userConnections, {id: userId});
  
  
  console.log(users);
  
  console.log('oldConnection');
  console.log(oldConnection);
  
  if( typeof oldConnection !== 'undefined' ) {
  
    disconnectUser( oldConnection.connection );
    userConnections = _.map( userConnections, (connection) => {
      
      if( connection.id == userId ) {
       
        connection.connection = ws;
        
      }
      
      return connection;
      
    });
                            
  } else {
  
    userConnections.push({ id: userId, connection: ws });
  
  }
  
  console.log(userConnections);
  console.log(users);
  let gameId = getUserGame(userId),
      game = false;
  
  if( typeof gameId !== 'undefined' && gameId !== false && gameId !== null) {
    
    game = _.findWhere( games, {id: gameId} );
    if( typeof game == 'undefined' ) {
      
      game = false;
      
    }
  
  }
  
  let message = { type: 'userLoaded', id: userId, game: game };
  ws.send(JSON.stringify(message));
  
  if( typeof gameId !== 'undefined' && gameId !== false && gameId !== null) {
    
//    sendGameState( game.id );
    sendGameState( gameId );
    
  }
  
  getAvailableGames(ws);
  setPlayerOnlineStatus(userId, true);
  
}

function disconnectUser( ws ) {
  
  let message = { type: 'forceDisconnection' };
  ws.send(JSON.stringify(message));
  
}
  
function userDisconnection(ws) {
 
  console.log('----------------------');
  console.log('userDisconnection');
  
  let userId = getUserIdFromConnection(ws);

  //Trim user from user connections array
  userConnections = _.reject( userConnections, (user) => {

    return user.id == userId;

  });

  setPlayerOnlineStatus( userId, false);
  
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
  
  if ( data.type == 'loadUser' ) {
    
    console.log( users );
    
    let user = _.findWhere( users, {id: data.userId} );
    
    console.log('loadUser');
    console.log( users );
    console.log( data.userId );
    console.log( user );
    
    //Check the user id
    if( typeof data.userId == 'undefined' || typeof user == 'undefined' ) {
    
      //If user id does not exist
      newUserConnection(ws);
      
    } else {
      
      //Else, send user to current game
      loadUserConnection(ws, data.userId);
      
    }
    
  } else if ( data.type == 'createGame' ) {  
    
    let gameId = createGame( userId, data.gameOptions );
    console.log('gameId '+gameId);
    
    if( gameId === false ) {
     
      console.log('could not create game');
      //handle error
      
    } else {
      
      console.log('users');
      console.log(users);
      //Assign game id to user
      users = _.map( users, (user) => {
        
        if(typeof user == 'object' && user.id === userId) {
        
          user.game = gameId; 
        
        }
        
        console.log(user);
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
    
  } else if( data.type == 'changeName' ) {
   
    changeUserName( userId, data.name);
    
  } else if( data.type == 'addMessage' ) {
   
    addMessage( userId, data.message);
    
  } else if( data.type == 'quitGame' ) {
    
    quitGame( userId );
    
  }
  
}

//returns game id 
function createGame(userId, options) {
  
  console.log('----------------------');
  console.log('createGame');
  //Initialize game
  let gameId = 'game_'+Date.now()+'_'+Math.floor((Math.random() * 1000) + 1),
      isError = false,
      user = _.findWhere( users, {id: userId} );

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
    bPlayer: null,
    wOnline: false,
    bOnline: false,
    wName: '[empty]',
    bName: '[empty]',
    messages: []
    
  };
  
  game[options.playerColor+'Player'] = userId;
  game[options.playerColor+'Name'] = user.name;
  game[options.playerColor+'Online'] = true;
  //Validate game info
  
  //Add game to game list
  games.push( game );
  
  if( isError ) {
    
    return false; 
    
  }
  
  console.log( games );
  return gameId;
  
}

function sendGameState( gameId ) {
  
  console.log('----------------------');
  console.log('sendGameState');
 
  let game = _.findWhere( games, {id: gameId} ),
      message = { type: 'gameState', game: game },
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
      user = _.findWhere( users, {id: userId} ),
      color = 'w',
      userGameId = getUserGame(userId);
  
  //User already in game
  if( userGameId !== null && userGameId !== false ) {
    
    console.log('user already in game');
    //handle error 
    return false;
    
  }
  
  //Game doesn't exist
  if( typeof game == 'undefined') {
    
    console.log('Game doesn\'t exist ');
    //handle error 
    return false;
    
  }
  
  //Game full
  if( game.wPlayer !== null && game.bPlayer !== null ) {
   
    console.log('Game full ');
    //handle error 
    return false;
    
  }
  
  if( game.wPlayer == null ) {
    
    game.wPlayer = userId;
    game.wName = user.name;
    
  } else {
   
    game.bPlayer = userId;
    game.bName = user.name;
    
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
  
  setPlayerOnlineStatus( userId, true );
  
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

function changeUserName( userId, name ) {
  
  console.log('----------------------');
  console.log('changeUserName');
  
  let gameId = null,
      updatedGames = false;
  
  //clean XSS
  name = cleanXss(name);
  
  users = _.map(users, (user)=>{
    
    if( user.id == userId ) {
      
      user.name = name;
      gameId = user.game;
      
    }
    
    return user;
    
  }); 
  
  games = _.map(games, (game)=>{
    
    if( game.id == gameId ) {
     
      if( game.wPlayer == userId ) {
       
        game.wName = name;
        updatedGames = true;
        
      }
      
      if( game.bPlayer == userId ) {
       
        game.bName = name;
        updatedGames = true;
        
      }
      
    }
    
    return game;
    
  });
  
  if( updatedGames ) {
    
    sendGameState(gameId);
    
  }
  
}

function setPlayerOnlineStatus(userId, online) {
  
  let gameId = null;
  
  //Update connections
  users = _.map( users, (user)=>{
    
    if( user.id == userId ) {
     
      user.online = online;
      gameId = user.game;
      
    }
    
    return user;
    
  });
  
  console.log(games);
  
  //Update games
  if( gameId !== null ) {
    
    games = _.map( games, (game)=>{

      if( game.wPlayer == userId ) {

        game.wOnline = online;

      }

      if( game.bPlayer == userId ) {

        game.bOnline = online;

      }

      return game;

    });
    
    sendGameState( gameId );
    
  }
  
  console.log(games);
  
}

function quitGame( userId ){

  let user = _.findWhere( users, {id: userId} ),
      game = _.findWhere( games, {id: user.game });
  
  if( typeof game == 'undefined' || game == null || game == false ) {
    
    return false;
    
  }
  
  let wPlayerWs = getConnectionFromUserId( game.wPlayer ),
      bPlayerWs = getConnectionFromUserId( game.bPlayer ),
      message;
  
  //send player has quit game message
  message = {type: 'quitGame', player: userId};
  
  if( typeof wPlayerWs !== 'undefined' && wPlayerWs !== null && wPlayerWs !== false ) {
    
    wPlayerWs.send( JSON.stringify(message) );
    
  }
  
  if( typeof bPlayerWs !== 'undefined' && bPlayerWs !== null && bPlayerWs !== false ) {
  
    bPlayerWs.send( JSON.stringify(message) );
  
  }
  //delete game
  games = _.reject( games, {id: user.game } );
  
  //clear game from users
  users = _.map( users, (user)=>{
    
    if( user.game == game.id ) {
      
      user.game = null;
      
    } 
    
    return user;
    
  });
  
  //send delete game message
  message = {type: 'deleteGame', game: game.id};
  if( typeof wPlayerWs !== 'undefined' && wPlayerWs !== null && wPlayerWs !== false ) {
    
    wPlayerWs.send( JSON.stringify(message) );
    
  }
  
  if( typeof bPlayerWs !== 'undefined' && bPlayerWs !== null && bPlayerWs !== false ) {
  
    bPlayerWs.send( JSON.stringify(message) );
  
  }
  
  //Make sure incoming players cannot see game
  broadcastAvailableGames();
  
}

function addMessage( userId, message ) {
 
  let user = _.findWhere( users, {id: userId} );
  
  message = cleanXss( message );
  
  games = _.map( games, (game)=>{
    
    if( game.id == user.game ) {
     
      game.messages.push( {userId: userId, message: message} );
      
    }
    
    return game;
    
  });
  
  sendGameState( user.game );
  
}

function cleanXss( string ) {
 
  let lt = /</g, 
      gt = />/g, 
      ap = /'/g, 
      ic = /"/g;
  
  return string.toString().replace(lt, "&lt;").replace(gt, "&gt;").replace(ap, "&#39;").replace(ic, "&#34;");
  
}
