const {getConfig} = require('./near');
const nearAPI = require('near-api-js');

const config = getConfig(process.env.NODE_ENV || 'production');

// token account  
let tokenContractName = 'token.cheddar.near';
// set all accounts with locked tokens
const lockedHolders = ['cheddar.sputnik-dao.near', 'team.cheddar.near','contributors.cheddar.near'];
// token max supply
const maxSupply = Math.pow(10, 24);

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

    let tokenPrice = await getTokenPrice(tokenContractName);
    const near = await nearAPI.connect(config);
    
    const accountSupply = await near.account('team.cheddar.near');
    const total_supply = await accountSupply.viewFunction(tokenContractName, 'ft_total_supply')/Math.pow(10,24);

    const lockedBalances = await Promise.all(
        lockedHolders.map(async (address) => {
            const account = await near.account(address);
            const ft_balance = await account.viewFunction(tokenContractName, 'ft_balance_of', {account_id: address})
            const parsedBalance = Number(ft_balance)/Math.pow(10,24);
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
        marketCap.circulatingSupply = total_supply;
        marketCap.lastUpdate = new Date().getTime();
    }

    return(marketCap);
}

updateMarketcap().then((marketCap)=> {
    console.log(marketCap)
});
