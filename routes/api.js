/*
*
*
*       Complete the API routing below
*
*
*/

'use strict';

var expect = require('chai').expect;
var MongoClient = require('mongodb');
var googleFinance = require('google-finance');
var yahooFinance = require('yahoo-finance');

const CONNECTION_STRING = process.env.DB; //MongoClient.connect(CONNECTION_STRING, function(err, db) {});

module.exports = function (app) {

  app.route('/api/stock-prices')
    .get(function (req, res){
      var stock = req.query.stock;
      var like = req.query.like || false;
      var reqIP = req.connection.remoteAddress;
      var ip = req.connection.remoteAddress.split(':')[req.connection.remoteAddress.split(':').length-1];
    
      //console.log(stock[0]);
      //console.log(like);
      //console.log(reqIP);
      //console.log(ip);
      //ip = "127.0.0.16";
    
      var stockData = {stockData:[]};
    
      if(Array.isArray(stock)){
        console.log('yes');
        getstock(stock[0], like, ip, sync);
        getstock(stock[1], like, ip, sync);
      }else{
        console.log('no');
        getstock(stock, like, ip, sync);
      }
    
      function sync(data){
        //console.log(data);
        
        if(Array.isArray(stock)){
          stockData.stockData.push(data);
          if(stockData.stockData.length == 2){
            stockData.stockData[0].rel_likes=stockData.stockData[0].likes-stockData.stockData[1].likes;
            stockData.stockData[1].rel_likes=stockData.stockData[1].likes-stockData.stockData[0].likes;
            delete stockData.stockData[0].likes;
            delete stockData.stockData[1].likes;
            res.json(stockData);
          }
        }else{
          stockData.stockData = data;
          console.log(Object.keys(stockData.stockData).length);
          res.json(stockData);
        }
      }
    
      //console.log(stockData);
    
      /*
      var SYMBOL = 'NASDAQ:AAPL';
      googleFinance.companyNews({
        symbol: SYMBOL
      }, function (err, news) {
        if (err) { throw err; }
        console.log(news);
        res.send(news.length);
      });
      */
      async function getstock(SYMBOL, like, ip, callback){
        //var SYMBOL = 'AAPL';
        yahooFinance.quote({
          symbol: SYMBOL,
          modules: [ 'price', 'summaryDetail' ] // see the docs for the full list
        }, function (err, quotes) {
          if(err){
            //res.json({'stockData': 'external source error'});
            return false;
          }else{
            //console.log(quotes.price.symbol + ':' + quotes.price.postMarketPrice);

            if(like)
              var update = {$addToSet: { likes: ip }, $set: {price: quotes.price.postMarketPrice}};
            else
              var update = {$set: {price: quotes.price.postMarketPrice}};

            MongoClient.connect(CONNECTION_STRING, function(err, db) {
              if(err){
                //res.json({"message": "db connection error", "error": err});
                return false;
              }else{
                db.collection("stockpricechecker_stocks").findAndModify(
                  {stock: quotes.price.symbol},
                  [],
                  update,
                  {new: true, upsert: true},
                  function(err, doc) {
                    if(err){
                      //res.json({"message": "Error occurred while findAndModify", "error": err});
                      return false;
                    }else{
                      var json = {"stock": doc.value.stock, "price": doc.value.price, "likes": doc.value.likes.length};
                      //console.log(json);
                      callback(json);
                      return json;
                    }
                  }
                );
              }
            });

          }
        });
    
      }
      
      //res.send('hihi');
    
    });
    
};
