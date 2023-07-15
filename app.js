//. app.js
var express = require( 'express' ),
    session = require( 'express-session' ),
    app = express();

require( 'dotenv' ).config();

app.use( express.static( __dirname + '/public' ) );
app.use( express.Router() );

//. session
var session_params = { 
  secret: 'cloudant-session',
  resave: false,
  cookie: {
    path: '/',
    maxAge: ( 365 * 24 * 60 * 60 * 1000 )
  },
  saveUninitialized: false
};

//. connect-cloudant-store
var CloudantStore = require( 'connect-cloudant-store' )( session );
var settings_couchdb_url = 'COUCHDB_URL' in process.env ? process.env.COUCHDB_URL : '';
var store = null;
if( settings_couchdb_url ){
  store = new CloudantStore( { url: settings_couchdb_url } );

  store.on( 'connect', function(){
    //. not here
    console.log( 'couchdb connected.' );
  });

  store.on( 'disconnect', function(){
    //. but here ??
    console.log( 'couchdb disconnected.' );
  });

  store.on( 'error', function( err ){
    console.log( {err} );
  });

  session_params.store = store;
}

app.use( session( session_params ) );


//. CORS
var settings_cors = 'CORS' in process.env ? process.env.CORS : '';  //. "http://localhost:8080,https://xxx.herokuapp.com"
app.all( '/*', function( req, res, next ){
  if( settings_cors ){
    var origin = req.headers.origin;
    if( origin ){
      var cors = settings_cors.split( " " ).join( "" ).split( "," );

      //. cors = [ "*" ] への対応が必要
      if( cors.indexOf( '*' ) > -1 ){
        res.setHeader( 'Access-Control-Allow-Origin', '*' );
        res.setHeader( 'Access-Control-Allow-Methods', '*' );
        res.setHeader( 'Access-Control-Allow-Headers', '*' );
        res.setHeader( 'Vary', 'Origin' );
      }else{
        if( cors.indexOf( origin ) > -1 ){
          res.setHeader( 'Access-Control-Allow-Origin', origin );
          res.setHeader( 'Access-Control-Allow-Methods', '*' );
          res.setHeader( 'Access-Control-Allow-Headers', '*' );
          res.setHeader( 'Vary', 'Origin' );
        }
      }
    }
  }
  next();
});

//. Auth0
var settings_redirect_uri = 'AUTH0_REDIRECT_URI' in process.env ? process.env.AUTH0_REDIRECT_URI : settings.auth0_redirect_uri; 
var settings_client_id = 'AUTH0_CLIENT_ID' in process.env ? process.env.AUTH0_CLIENT_ID : settings.auth0_client_id; 
var settings_client_secret = 'AUTH0_CLIENT_SECRET' in process.env ? process.env.AUTH0_CLIENT_SECRET : settings.auth0_client_secret; 
var settings_domain = 'AUTH0_DOMAIN' in process.env ? process.env.AUTH0_DOMAIN : settings.auth0_domain; 
var strategy = null;
var passport = require( 'passport' );
var Auth0Strategy = require( 'passport-auth0' );
if( settings_redirect_uri && settings_client_id && settings_client_secret && settings_domain ){
  strategy = new Auth0Strategy({
    domain: settings_domain,
    clientID: settings_client_id,
    clientSecret: settings_client_secret,
    callbackURL: settings_redirect_uri
  }, function( accessToken, refreshToken, extraParams, profile, done ){
    //console.log( accessToken, refreshToken, extraParams, profile );
    profile.idToken = extraParams.id_token;
    return done( null, profile );
  });
  passport.use( strategy );

  passport.serializeUser( function( user, done ){
    done( null, user );
  });
  passport.deserializeUser( function( user, done ){
    done( null, user );
  });

  app.use( passport.initialize() );
  app.use( passport.session() );

  //. login
  app.get( '/auth0/login', passport.authenticate( 'auth0', {
    scope: 'openid profile email'
  }, function( req, res ){
    res.redirect( '/auth' );
  }));

  //. logout
  app.get( '/auth0/logout', function( req, res ){
    var returnTo = '/'; //req.query.returnTo;
    req.logout( function(){
      //. https://auth0.com/docs/product-lifecycle/deprecations-and-migrations/logout-return-to
      //res.redirect( '/' );
      res.redirect( 'https://' + settings_domain + '/v2/logout?client_id=' + settings_client_id + '&returnTo=/' + returnTo );
    });
  });

  app.get( '/auth0/callback', async function( req, res, next ){
    passport.authenticate( 'auth0', function( err, user ){
      if( err ) return next( err );
      if( !user ) return res.redirect( '/auth0/login' );

      req.logIn( user, function( err ){
        if( err ) return next( err );
        res.redirect( '/auth' );
      });
    })( req, res, next );
  });

  //. access restriction
  app.all( '/auth*', function( req, res, next ){
    if( !req.user || !req.user.displayName ){
      res.redirect( '/auth0/login' );
    }else{
      next();
    }
  });
}

/*
Error: Login sessions require session support. 
Did you forget to use `express-session` middleware?
*/
app.get( '/', function( req, res ){
  res.contentType( 'application/json; charset=utf-8' );

  if( strategy ){
    if( req.user ){ 
      var user = { id: req.user.id, name: req.user.nickname, email: req.user.displayName, image_url: req.user.picture };
      res.write( JSON.stringify( { user: user, message: 'Go /auth0/logout to logout.' }, null, 2 ) );
      res.end();
    }else{
      res.write( JSON.stringify( { user: null, message: 'Go /auth0/login to login.' }, null, 2 ) );
      res.end();
    }
  }else{
    res.write( JSON.stringify( { user: null, message: 'No auth information.' }, null, 2 ) );
    res.end();
  }
});


var port = process.env.PORT || 8080;
app.listen( port );
console.log( "server starting on " + port + " ..." );

module.exports = app;
