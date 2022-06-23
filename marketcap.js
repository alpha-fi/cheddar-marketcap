const {getConfig} = require('./near');
const nearAPI = require('near-api-js');

const config = getConfig(process.env.NODE_ENV || 'production');

// token account  
let brrrToken = 'token.cheddar.near';
// set all accounts with locked tokens
const brrrLockedHolders = ['cheddar.sputnik-dao.near', 'team.cheddar.near','contributors.cheddar.near'];
// token max supply
const maxSupply = "2300000";

const getTokenPrice = async (tokenId) => {
    return fetch("https://indexer.ref-finance.net/list-token-price")
        .then(res => res.json())
        .then(json => json[tokenId].price || 0)
        .catch(err => {
            console.error(err);
            return 0;
        });
}

const updateMarketcap = async () => {
    let marketCap = {
        lockedBalances: [],
        circulatingSupply: 0,
        lastUpdate: 0
    }

    let tokenPrice = await getTokenPrice(brrrToken);
    const near = await nearAPI.connect(config);

    const lockedBalances = await Promise.all(
        brrrLockedHolders.map(async (address) => {
            const account = await near.account(address);
            const ft_balance = await account.viewFunction(brrrToken, 'ft_balance_of', {account_id: address})
            const parsedBalance = Number(ft_balance)/Math.pow(10,18);
            return {
                address,
                balance: parsedBalance,
                value: parsedBalance * tokenPrice
            };
        })
    )
    const sumLocked = lockedBalances.reduce((acc, value) => acc+value.balance, 0);
    const circulatingSupply = maxSupply-sumLocked;
    if(!isNaN(circulatingSupply)) {
        marketCap.lockedBalances = lockedBalances;
        marketCap.circulatingSupply = circulatingSupply;
        marketCap.lastUpdate = new Date().getTime();
    }

    return(marketCap);
}

updateMarketcap().then((marketCap)=> {
    console.log(marketCap)
});
