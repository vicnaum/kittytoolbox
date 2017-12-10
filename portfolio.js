var kittytoolbox = require('./kittytoolbox_server');
XMLHttpRequest = require("xmlhttprequest").XMLHttpRequest;
var ethereum_address = require('ethereum-address');
var jsonfile = require('jsonfile')
var ethereum_address = require('ethereum-address');
var prompt = require('prompt');
var deasync = require('deasync');
var sleep = require('system-sleep');

function doRequest(url) {
  sleep(1000);
  var request = new XMLHttpRequest();
  request.open('GET', url, false);  // `false` makes the request synchronous
  request.send(null);
  
  if (request.status === 200) {
    return(JSON.parse(request.responseText));
  } else {
    sleep(15000);
    console.log(`Portfolio Error Status:`, request.status, `   Text:`, request.responseText)
    console.log(`Portfolio Error Url: `, url)
    return(null)
  }
}

kittytoolbox.doRequest = this.doRequest
kittytoolbox.logging = false

var allCats = []
var allCatsShort = []

var folder = "kittydata"

function getAllCatsShort(owner, limit, offset) {
  console.log(`Getting ${limit} of ${owner} cats from CS...`)
  
  const perPage = 12

  var pages = Math.ceil(limit/perPage)
  var resArray = []

  for (let page = 0; page<pages; page++) {
    console.log(`Getting page ${page+1}/${pages}`)
    while (!res) {
      var url = kittytoolbox.CSApi + 'kitties/?owner_wallet_address='+owner+'&limit='+((limit==1)?1:perPage)+'&offset='+page*perPage
      var res = doRequest(url)
    }
    console.log(`Got ${res.kitties.length} kitties`)
    resArray.push(res)
    res = null
  }
  return resArray
}

function getAllCatsOneByOne(owner) {
  console.log('Adding detailed cats one by one...')
  allCats = []

  let total = allCatsShort.length
  let i = 0

  allCatsShort.forEach((kittyShort) => {
    i++
    let kitty = kittytoolbox.getKittyCS(kittyShort.id)
    console.log(`${i}/${total} - #${kittyShort.id}`)
    allCats.push(kitty)
  })
//  jsonfile.writeFileSync(folder+"/"+owner+".json", allCats)
}

var threshold = 8

function getAllCatsPrices(owner, threshold) {
  console.log('Getting prices for the cats...')
  var i = 0;
  var totalCats = allCats.length
  allCats.forEach(cat => {
    i++;
    sleep(2000)
    auctions = kittytoolbox.getAuctions(cat, kittytoolbox.sortCattributes(cat), threshold)
    cat.auctions = {total: auctions[0].total, auctions: auctions[0].auctions, searchCattributes: auctions[1], excludedCattributes: auctions[2], searchLink: auctions[3]}
    try {
      console.log(`${i}/${totalCats}: #${cat.id} - ${cat.name} - ${kittytoolbox.fromWei(cat.auctions.auctions[0].current_price).toFixed(3)} ETH`)
    } catch(err) {
      console.log(`Something wrong with cat ${cat.id}`)
      console.log(err)
      return 1;
    }
  });
  jsonfile.writeFileSync(folder+"/"+owner+"_prices.json", allCats)
}

function getAllCats(owner, limit, offset) {
  allCatsShort = []
  resArray = getAllCatsShort(owner, limit, offset)
  resArray.forEach((page) => {
    allCatsShort = allCatsShort.concat(page.kitties)
  })
  console.log(`allCatsShort count = `,allCatsShort.length)
  //jsonfile.writeFileSync(folder+"/"+owner+"_short.json", allCatsShort)
  
  getAllCatsOneByOne(owner)
}

function getTotal() {
  total = 0
  allCats.forEach((cat)=>{
    total += kittytoolbox.fromWei(cat.auctions.auctions[0].current_price)
  })
  return total
}

function onErr(err) {
    console.log(err);
    return 1;
}

function doesExist(owner) {
    var fs = require('fs');
    return fs.existsSync(folder+"/"+owner+"_prices.json")
}

function getKittiesCount(owner) {
    return getAllCatsShort(owner, 1, 0)[0].total
}

var myArgs = process.argv.slice(2);
var owner = myArgs[0]

if (myArgs[1]) {
  threshold = myArgs[1]
}


if (owner) {
  if (ethereum_address.isAddress(owner.trim())) {
    owner = owner.toLowerCase()
    // if (doesExist(owner)) {
    //   console.log('Address already exists in DB')
    // } else {
      count = getKittiesCount(owner)
      console.log(`Owner has ${count} kitties.`)
      getAllCats(owner, count, 0)
      getAllCatsPrices(owner, threshold)
      getTotal()
      console.log(`Total: `+getTotal().toFixed(3)+` ETH`)

      process.send(allCats.length)
//    }
  } else {
    console.log('Not an Ethereum address')
  }
} else {
  prompt.start();
  input = deasync(prompt.get)
  result = input(['owner'])
  
  if (ethereum_address.isAddress(result.owner.trim())) {
      owner = result.owner.trim().toLowerCase()
      if (doesExist(owner)) {
          console.log('Address already exists in DB. Fetch again? (y/N)')
          if (input(['fetch']).fetch != "y") {
              return 0;
          }
      }
      count = getKittiesCount(owner)
      console.log(`Owner has ${count} kitties. Proceed? (Y/n)`)
      if (input(['fetch']).fetch == "n") {
          return 0;
      }
      console.log(`Threshold is ${threshold}. Change?`)
      let newThreshold = input(['threshold']).threshold
      if (!isNaN(parseInt(newThreshold))) {
        threshold = newThreshold
      }
      getAllCats(owner, count, 0)
      getAllCatsPrices(owner, threshold)
      getTotal()
      console.log(`Total: `+getTotal().toFixed(3)+` ETH`)
  } else {
      console.log('Not an Ethereum address')
  }
}

