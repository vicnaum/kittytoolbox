(function(exports) {

var cattributes = {"oldlace":"4","wolfgrey":"14","gerbil":"25","cottoncandy":"45","violet":"129","wingtips":"358","mainecoon":"550","jaguar":"840","googly":"1012","cerulian":"1234","whixtensions":"1344","chartreux":"1603","fabulous":"2030","peach":"3647","bubblegum":"4656","dali":"4937","gold":"5074","otaku":"5453","scarlet":"6535","skyblue":"6557","bloodred":"6616","tigerpunk":"7698","limegreen":"7894","emeraldgreen":"8982","beard":"9108","spock":"9282","cloudwhite":"9473","laperm":"10278","calicool":"10365","barkbrown":"10519","chestnut":"11734","mauveover":"11997","tongue":"12964","cymric":"14268","saycheese":"18086","shadowgrey":"18209","coffee":"18287","salmon":"19517","royalpurple":"20011","mintgreen":"21437","chocolate":"21677","swampgreen":"21894","lemonade":"22303","topaz":"22443","sphynx":"22610","simple":"22700","orangesoda":"22916","aquamarine":"23312","munchkin":"23534","greymatter":"23704","raisedbrow":"24878","happygokitty":"26369","soserious":"26889","strawberry":"27280","ragamuffin":"27642","sizzurp":"28617","himalayan":"28719","pouty":"29385","crazy":"36071","thicccbrowz":"36625","luckystripe":"39657","kittencream":"54632","granitegrey":"55269","totesbasic":"61289"}

var logging = true

var totalKitties = 134000
var CSApi = 'https://api.cryptokitties.co/'

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

function fromWei(amount) {
  return (amount / 1000000000000000000)
}

function doRequest(url) {
  var request = new XMLHttpRequest();
  request.open('GET', url, false);  // `false` makes the request synchronous
  request.send(null);
  
  if (request.status === 200) {
    return(JSON.parse(request.responseText));
  } else {
    console.log('KittyToolbox Error Status: '+request.status)
    console.log('KittyToolbox Error Text: '+request.response)
    console.log('KittyToolbox Error Url: '+url)
    return null //('Error: '+request.status)
  }
}

function getKittyCS(kittyId) {
  var url = CSApi + "kitties/" + kittyId + "/"
  var res
  while (!res) {
    res = doRequest(url)
  }
  return res
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

function printCattributes(cat) {

  var catrSorted = sortCattributes(cat)  

  if (catrSorted) {
    var str = ""
    catrSorted.forEach((cattribute) => {
      str += cattribute.description + ` (${cattribute.rarity}%) - `
    })
    return str.substring(0, str.length-3)
  } else {
    return "FANCY!"
  }
}

function calculateRarity(cat) {
  var rarity = 1;
  cat.cattributes.forEach((cattribute) => {
    rarity = rarity * cattributes[cattribute.description]/totalKitties
  })
  if (rarity == 1) return 0;
  return rarity
}

function formAuctionSearchParameters(gen, fancy, cattributes, cooldown){
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
    return req
}

function getAuction(gen, fancy, cattributes, cooldown) {
  if (this.logging) console.log(`\n\n\nGetting Auctions, gen:${gen}, fancy:${fancy}, cattributes:${cattributes}, cooldown:${cooldown}\n`)

  var req = formAuctionSearchParameters(gen, fancy, cattributes, cooldown)

  var url = CSApi + "auctions?offset=0&limit=12&type=sale&status=open" + req + '&sorting=cheap&orderBy=current_price&orderDirection=asc'
  
  var res
  while (!res) {
    res = doRequest(url)
  }
  return res
}

function getSearchLink(gen, fancy, cattributes, cooldown) {
    var req = formAuctionSearchParameters(gen, fancy, cattributes, cooldown)
    return "https://www.cryptokitties.co/marketplace/sale?orderBy=current_price&orderDirection=asc&" + req + '&sorting=cheap'    
}

function getAuctions(cat, sortedCattributes, threshold) {
  var fancy
  var gen
  var cattributes
  var cooldown
  
  gen = Array.from({length: cat.generation+1}, (v, k) => k).join(",");
  cooldown = Array.from({length: cat.status.cooldown_index+1}, (v, k) => cooldowns[k]).join(",");

  if (cat.is_fancy) {
    fancy = true
    return [getAuction(gen,fancy,cattributes,cooldown),["fancy"],[],getSearchLink(gen,fancy,cattributes,cooldown)]
  } else {
    auctionsTotal = 0
    var searchCattributes = []
    var excludedCattributes = []
    
    for (let i=0; i<sortedCattributes.length && sortedCattributes[i].rarity<=11; i++) {
      searchCattributes.push(sortedCattributes[i].description)
    }

    while (auctionsTotal < threshold) {
      if (this.logging) console.log("Searching cattributes:", searchCattributes)
      auctions = getAuction(gen,fancy,searchCattributes.join("+"),cooldown)
      if (!auctions) {
        console.log("Error retrieving auctions:")
        console.log(auctions)
      }
      if (!auctions.auctions) {
        console.log("Error retrieving auctions:")
        console.log(auctions.auctions)
      }
      auctionsTotal = auctions.total
      if (this.logging) console.log(`Found ${auctionsTotal} auctions`)
      if (auctionsTotal < threshold) {
        excludedCattributes.push(searchCattributes[searchCattributes.length-1])
        searchCattributes.splice(-1,1)
      }
    }
    return [auctions, searchCattributes, excludedCattributes, getSearchLink(gen,fancy,searchCattributes.join("+"),cooldown)]

  }
}

function getPricesFromAuctions(auctions) {
    var prices = []
  
    auctions.auctions.forEach(auction => {
      var price = auction.current_price
      prices.push(fromWei(price))
    });

    return prices
}

function processAuctions(auctions, cat, searchCattributes, excludedCattributes, searchLink) {
  var str = "";

  prices = getPricesFromAuctions(auctions)

  var median = prices[Math.floor(prices.length/2)]
  var average = prices.reduce((a,b) => {return a+b}) / prices.length

  str += `First ${prices.length} prices are from ${prices[0].toFixed(3)} ETH to ${prices[prices.length-1].toFixed(3)} ETH`
  str += `\n(${prices.map((elem)=>{return elem.toFixed(3)}).join(' ETH, ')} ETH)`
  str += `\n\nMedian: ${median.toFixed(3)} ETH, Average: ${average.toFixed(3)} ETH, Cheapest: ${prices[0].toFixed(3)} ETH`

  str += `\n\nTotal similar cats for sale: ` + auctions.total
  str += `\nEstimation based on the following attributes: ` + searchCattributes.join(',')
  str += `\nSearched generations ${cat.generation} and below and cooldown ${cooldowns[cat.status.cooldown_index]} or faster`

  if (cat.is_fancy) {
      str += `\n\nThe cat is FANCY, so it's hard to estimate it. Keep attention to it's color also!`
  }

  if (excludedCattributes.length > 0) {
    str += `\n\n---\nWARNING! The following interesting attributes were excluded: ` + excludedCattributes.join(',')
    str += `\n\nBecause there are no cats like yours on the market with the given gen & cooldown`
    str += `\nconsider raising a price after better market investigation `
  }

  return [str, searchLink]
}

function getPrice(cat, threshold) {
  ret = getAuctions(cat, sortCattributes(cat), threshold)
  console.log(ret)

  var auctions = ret[0]
  var searchCattributes = ret[1]
  var excludedCattributes = ret[2]
  var searchLink = ret[3]
  
  return processAuctions(auctions, cat, searchCattributes, excludedCattributes, searchLink)
}

function getPortfolio(owner) {
  url = serverUrl+'getPortfolio?owner='+owner;
  return doRequest(url)
}

function getKittiesCount(owner) {
  var url = CSApi + 'kitties/?owner_wallet_address='+owner+'&limit=1&offset=0'
  var res = doRequest(url)
  console.log(res.total)
  return(res.total)
}

function queuePortfolio(owner) {
  url = serverUrl+'queuePortfolio?owner='+owner;
  return doRequest(url)
}

function getPortfolioQueue() {
  url = serverUrl+'getPortfolioQueue';
  return doRequest(url)
}

function getProcessQueue() {
  url = serverUrl+'getProcessQueue';
  return doRequest(url)
}

function getQueues() {
  url = serverUrl+'getQueues';
  return doRequest(url)
}

function getProcessed() {
  url = serverUrl+'getProcessed';
  return doRequest(url)
}

var freeCatsLimit = 50;

var colors = {"chestnut": "#efe1da",
              "mintgreen": "#cdf5d4",
              "gold": "#faf4cf",
              "strawberry": "#fcdede",
              "limegreen": "#d9f5cb",
              "bubblegum": "#fadff4",
              "topaz": "#d1eeeb",
              "sizzurp": "#dfdffa"
};


serverUrl = 'https://microetheroll.com:3331/'
//serverUrl = 'http://localhost:3331/'

exports.getPrice = getPrice
exports.getKittyCS = getKittyCS
exports.calculateRarity = calculateRarity
exports.printCattributes = printCattributes
exports.colors = colors
exports.doRequest = doRequest
exports.getPricesFromAuctions = getPricesFromAuctions
exports.sortCattributes = sortCattributes
exports.getAuctions = getAuctions
exports.fromWei = fromWei
exports.logging = logging
exports.CSApi = CSApi
exports.getPortfolio = getPortfolio
exports.getKittiesCount = getKittiesCount
exports.processAuctions = processAuctions
exports.queuePortfolio = queuePortfolio
exports.freeCatsLimit = freeCatsLimit
exports.getPortfolioQueue = getPortfolioQueue
exports.getProcessQueue = getProcessQueue
exports.getQueues = getQueues
exports.getProcessed = getProcessed

})(typeof exports === 'undefined'? this['kittytoolbox']={}: exports);
