const https = require('https');
var XMLHttpRequest = require("xmlhttprequest").XMLHttpRequest;

var CSApi = 'https://api.cryptokitties.co/'
var cattributes = {"oldlace":"4","wolfgrey":"14","gerbil":"25","cottoncandy":"45","violet":"129","wingtips":"358","mainecoon":"550","jaguar":"840","googly":"1012","cerulian":"1234","whixtensions":"1344","chartreux":"1603","fabulous":"2030","peach":"3647","bubblegum":"4656","dali":"4937","gold":"5074","otaku":"5453","scarlet":"6535","skyblue":"6557","bloodred":"6616","tigerpunk":"7698","limegreen":"7894","emeraldgreen":"8982","beard":"9108","spock":"9282","cloudwhite":"9473","laperm":"10278","calicool":"10365","barkbrown":"10519","chestnut":"11734","mauveover":"11997","tongue":"12964","cymric":"14268","saycheese":"18086","shadowgrey":"18209","coffee":"18287","salmon":"19517","royalpurple":"20011","mintgreen":"21437","chocolate":"21677","swampgreen":"21894","lemonade":"22303","topaz":"22443","sphynx":"22610","simple":"22700","orangesoda":"22916","aquamarine":"23312","munchkin":"23534","greymatter":"23704","raisedbrow":"24878","happygokitty":"26369","soserious":"26889","strawberry":"27280","ragamuffin":"27642","sizzurp":"28617","himalayan":"28719","pouty":"29385","crazy":"36071","thicccbrowz":"36625","luckystripe":"39657","kittencream":"54632","granitegrey":"55269","totesbasic":"61289"}
var totalKitties = 134000

cooldowns = {
  0: "fast",
  1: "swift",
  2: "swift",
  3: "snappy",
  4: "snappy",
  5: "brisk",
  6: "brisk",
  7: "plodding",
  8: "plodding",
  9: "slow",
  10: "slow",
  11: "sluggish",
  12: "sluggish",
  13: "catatonic",
}

function doRequest(url) {
  var request = new XMLHttpRequest();
  request.open('GET', url, false);  // `false` makes the request synchronous
  request.send(null);
  
  if (request.status === 200) {
    return(JSON.parse(request.responseText));
  }
}

function getKittyCS(kittyId) {
  var url = CSApi + "kitties/" + kittyId + "/"
  return doRequest(url)
}

function getAuctions(gen, fancy, cattributes, cooldown) {
  console.log(`\n\n\nGetting Auctions, gen:${gen}, fancy:${fancy}, cattributes:${cattributes}, cooldown:${cooldown}\n`)

  let req = ""
  if (gen || fancy || cattributes || cooldown) {
    req += "&search="
  }
  if (gen) {
    req += "gen:" + gen
  }
  if (gen && fancy) {
    req += "+"
  }
  if (fancy) {
    req += "type:fancy"
  }
  if ((gen || fancy) && cattributes) {
    req += "+"
  }
  if (cattributes) {
    req += cattributes
  }
  if ((gen || fancy || cattributes) && cooldown) {
    req += "+"
  }
  if (cooldown) {
    req += "cooldown:"+cooldown
  }

  var url = CSApi + "auctions?offset=0&limit=12&type=sale&status=open" + req + '&sorting=cheap&orderBy=current_price&orderDirection=asc'
  return doRequest(url)
}


function getPrices(cat, sortedCattributes) {
  var fancy
  var gen
  var cattributes
  var cooldown

  gen = Array.from({length: cat.generation+1}, (v, k) => k).join(",");
  cooldown = Array.from({length: cat.status.cooldown_index+1}, (v, k) => cooldowns[k]).join(",");

  if (cat.is_fancy) {
    fancy = true
    return getAuctions(gen,fancy,cattributes,cooldown)
  } else {
    auctionsTotal = 0
    var searchCattributes = []
    var excludedCattributes = []
    
    for (let i=0; i<sortedCattributes.length && sortedCattributes[i].rarity<=11; i++) {
      searchCattributes.push(sortedCattributes[i].description)
    }

    var threshold = 2
    while (auctionsTotal < threshold) {
      console.log("Searching cattributes:", searchCattributes)
      auctions = getAuctions(gen,fancy,searchCattributes.join("+"),cooldown)
      auctionsTotal = auctions.total
      console.log(`Found ${auctionsTotal} auctions`)
      if (auctionsTotal < threshold) {
        excludedCattributes.push(searchCattributes[searchCattributes.length-1])
        searchCattributes.splice(-1,1)
      }
    }
    return [auctions, searchCattributes, excludedCattributes]

  }
}

function fromWei(amount) {
  return (amount / 1000000000000000000)
}

function sortCattributes(cat) {
  catrSorted = []

  if (cat.cattributes.length > 0) {
    cat.cattributes.forEach((cattribute) => {
      description = cattribute.description
      rarity = (cattributes[cattribute.description]/totalKitties*100).toFixed(2)
      catrSorted.push({description: description, rarity: rarity})
    })

    catrSorted.sort((a,b) => {
      return a.rarity-b.rarity
    })
    
    return catrSorted
  }
  return null;
}


function processAuctions(auctions, cat, searchCattributes, excludedCattributes) {

  var prices = []

  auctions.auctions.forEach(auction => {
    var price = auction.current_price
    prices.push(fromWei(price))
  });

  var median = prices[Math.floor(prices.length/2)]
  var average = prices.reduce((a,b) => {return a+b}) / prices.length

  console.log(`There are total similar cats for sale:` + auctions.total)
  console.log(`Based on the following attributes:`, searchCattributes.join(','))
  console.log(`First ${prices.length} prices are from ${prices[0].toFixed(3)} ETH to ${prices[prices.length-1].toFixed(3)} ETH`)
  console.log(`Median: ${median.toFixed(3)} ETH, Average: ${average.toFixed(3)} ETH`)

  if (excludedCattributes.length > 0) {
    console.log(`\n---\nWARNING! The following interesting attributes were excluded:`, excludedCattributes.join(','))
    console.log(`Because there are no cats like yours on the market with the given gen & cooldown`)
    console.log(`consider raising a price after better market investigation `)
  }
}

kittyId = 120417
var cat = getKittyCS(kittyId)

function getPrice(cat) {
  var searchCattributes
  var excludedCattributes
  var auctions
  
  [auctions, searchCattributes, excludedCattributes] = getPrices(cat, sortCattributes(cat))
  
  processAuctions(auctions, cat, searchCattributes, excludedCattributes)
}

module.exports = {getKittyCS: getKittyCS}