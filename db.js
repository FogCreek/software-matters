// DB persistence and multitenancy

/*
Required env strings:
  DB_RW_UN
  DB_RW_PW
  DB_ENDPOINT_URI
*/


module.exports = {
  setAccount, getAccount, setAccountFields, getHeartbeatAccounts
};

const mongodb = require('mongodb');
const uri_rw = `mongodb://${encodeURIComponent(process.env.DB_RW_UN)}:${encodeURIComponent(process.env.DB_RW_PW)}@${process.env.DB_ENDPOINT_URI}`;
const ACCOUNTS = 'accounts';


// Init the DB connections lazily so that typing into Glitch doesn't thrash the server
function dbInitFactory(uri){
  let db = null;
  return async function(){
    if(!db) {
      try {
        db = await mongodb.MongoClient.connect(uri);
      } catch (ex) {
        console.log(ex);
        throw ex;
      }
    }
    
    return db;
  };
}

let getDb = dbInitFactory(uri_rw);

// Adds or updates an entire account object, keyed off of account_id
async function setAccount(account){
     
  if(!account || !account.account_id) {
    throw "account_id must be specified in the account object.";
  }
  
  let db = await getDb();
  let accounts = await db.collection(ACCOUNTS);

  let update = await accounts.update({
      account_id: account.account_id
    },
    account,
    {
      upsert: true,
      multi: false
  });
  
  return update;
}

// data must be an object
async function setAccountFields(account_id, data) {
     
  if(!account_id) {
    throw "account_id must be specified";
  }
  
  let db = await getDb();
  let accounts = await db.collection(ACCOUNTS);

  let update = await accounts.update({
      account_id: account_id,
    },
    {$set: data},
    {
      upsert: false,
      multi:false
    });  
  
  return update;
}

async function getHeartbeatAccounts(count, timeOffsetMilliseconds=60000) {
  let minimumElapsedTime = Date.now() - timeOffsetMilliseconds;
  let db = await getDb();
  let accounts = await db.collection(ACCOUNTS)
    .find({$or: [
      { last_heartbeat: { $lt: minimumElapsedTime } },
      { last_heartbeat : { "$exists" : false } },
    ]})
    .sort({last_heartbeat: 1})
    .limit(count)
    .toArray();
  
  return accounts;
}

async function getAccount(accountId){
  let db = await getDb();
  let accounts = await db.collection(ACCOUNTS);
  return await accounts.findOne({account_id: accountId});
}



 