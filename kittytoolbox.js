(function(exports) {

var cattributes = {"hotrod":"33","daffodil":"51","henna":"104","sandalwood":"274","manx":"291","amur":"357","royalblue":"1000","wingtips":"1284","persian":"1294","belleblue":"1583","wolfgrey":"2332","mainecoon":"2542","ragdoll":"3812","cerulian":"4125","oldlace":"5091","fabulous":"5181","violet":"5628","chartreux":"6291","jaguar":"9454","gerbil":"10348","dali":"10542","bubblegum":"10607","otaku":"13583","whixtensions":"13851","cottoncandy":"13926","tigerpunk":"14756","peach":"15121","skyblue":"15671","limegreen":"17780","bloodred":"21713","beard":"21750","cloudwhite":"22534","scarlet":"22535","calicool":"23092","laperm":"23884","barkbrown":"24488","tongue":"25249","googly":"26674","chestnut":"27703","emeraldgreen":"29789","spock":"33533","gold":"36898","mauveover":"37916","shadowgrey":"41178","coffee":"43523","salmon":"46166","cymric":"48982","mintgreen":"49348","royalpurple":"50156","lemonade":"50334","greymatter":"50398","swampgreen":"51256","chocolate":"51549","sphynx":"51675","topaz":"51742","simple":"51898","orangesoda":"52445","aquamarine":"53000","munchkin":"55850","saycheese":"56020","raisedbrow":"56144","soserious":"58456","happygokitty":"58486","ragamuffin":"62983","sizzurp":"63181","himalayan":"65086","strawberry":"65210","pouty":"67672","crazy":"82293","thicccbrowz":"85350","luckystripe":"88618","kittencream":"123101","granitegrey":"130885","totesbasic":"152469"}

var logging = true

var totalKitties = 335412
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

function updatePortfolio(owner) {
  url = serverUrl+'updatePortfolio?owner='+owner;
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


//serverUrl = 'https://microetheroll.com:3331/'
serverUrl = 'http://localhost:3331/'

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
exports.updatePortfolio = updatePortfolio

})(typeof exports === 'undefined'? this['kittytoolbox']={}: exports);
