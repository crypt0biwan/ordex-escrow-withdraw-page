window.Buffer = window.buffer;

let web3;
let account;
let signed_msg;
let contract;

const ethscriptionid_balances = []
const contractAddress = "0xC33F8610941bE56fB0d84E25894C0d928CC97ddE";
let contractABI;

const disable_button = (button, state) => {
    document.getElementById(button).disabled = state
}

const send_contract_withdrawal = async (ordex_api_response) => {
    try {
        console.log(`withdraw function`, ordex_api_response)

        const { confirmation, sig } = ordex_api_response
        const { from, to, ids } = confirmation
        const { expiryTimestamp, v, r, s } = sig
        
        const confirmation_obj = {
            from,
            to,
            ids
        };

        const signature = {
            expiryTimestamp: parseInt(expiryTimestamp),
            v,
            r,
            s
        };
        
        disable_button("signButton", true)

        console.log('sending..')

        await contract.methods.bulkWithdrawItems(confirmation_obj, signature).send({ from: account });

        document.getElementById("error-msg").classList.add("d-none")
        document.getElementById("success-msg").classList.remove("d-none")
        document.getElementById("success-msg").innerHTML = `Transaction sent successfully!`

        disable_button("signButton", false)
    } catch (error) {
        document.getElementById("success-msg").classList.add("d-none")
        document.getElementById("error-msg").classList.remove("d-none")
        document.getElementById("error-msg").innerHTML = `Error sending transaction. Check console for details.`
        document.getElementById("ethscriptionid").value = ''
        disable_button("signButton", false)

        console.error(error);
    }
}

window.addEventListener("load", async () => {
    if (typeof window.ethereum !== "undefined") {
        web3 = new Web3(window.ethereum);
        console.log("MetaMask detected");
    } else {
        alert("MetaMask is not installed. Please install it to use this feature.");
    }
});

document.getElementById("connectButton").addEventListener("click", async (e) => {
    try {
        e.preventDefault();

        const accounts = await ethereum.request({ method: "eth_requestAccounts" });
        account = accounts[0];
        console.log("Connected account:", account);

        contract = new web3.eth.Contract(contractABI, contractAddress);

        disable_button("connectButton", true)

        document.getElementById("account").innerHTML = `Connected to: ${account}`;
        document.getElementById("account").classList.remove("d-none");

        document.getElementById("items").innerHTML = 'Loading..'
        document.getElementById("escrows").innerHTML = 'Loading..'

        const balances = await get_all_balances(account)
        const existing_balances = balances.filter(b => b.deleted === false)
        const sorted_balances = existing_balances.sort((a, b) => a.meta.number - b.meta.number)
        const escrowed_balances = sorted_balances.filter(b => b.extension.escrowState === 'PENDING')
        
        if(escrowed_balances.length > 0) {
            disable_button('fillButton', false)
            disable_button('signButton', false)
        }

        parse_balances('items', sorted_balances.filter(b => b.extension.escrowState === 'EMPTY'))
        parse_balances('escrows', escrowed_balances, 'PENDING')
    
        document.getElementById('numberOfEscrowedEthscriptions').innerHTML = ` (${escrowed_balances.length})`
    
    } catch (error) {
        console.error("Failed to connect to MetaMask:", error);
        alert("Failed to connect to MetaMask.");
    }
});

document.getElementById("signButton").addEventListener("click", async (e) => {
    try {
        e.preventDefault();

        document.getElementById("error-msg").classList.add("d-none")
        document.getElementById("success-msg").classList.add("d-none")
        
        const ethscription_ids = document.getElementById("ethscriptionid").value;
        const items = ethscription_ids.split(',').map(e => BigInt(e).toString())
        const exampleMessage = nB(items, 'bulk_withdaw')
        
        const msg = `0x${Buffer.from(exampleMessage, "utf8").toString("hex")}`
        
        const signature = await ethereum.request({
            method: "personal_sign",
            params: [msg, account],
        })

        console.log(`Signed message: ${signature}`);

        const post_msg = {
            "client": account,
            "itemIds": items,
            "clientSignature": signature
        }

        console.log(`msg to send to ordex API: ${JSON.stringify(post_msg, null, 2)}`)

        const myHeaders = new Headers();
        myHeaders.append("Content-Type", "application/json");

        const raw = JSON.stringify(post_msg);

        const requestOptions = {
            method: "POST",
            headers: myHeaders,
            body: raw,
            redirect: "follow"
        };

        const response = await fetch("https://api-next.ordex.io/signer/s/wc", requestOptions);
        const result = await response.json();

        console.log(JSON.stringify(result, null, 2))

        if(typeof result.statusCode !== 'undefined') {
            document.getElementById("error-msg").classList.remove("d-none")
            document.getElementById("error-msg").innerHTML = `Error ${result.statusCode}: ${result.message}`
        } else {
            await send_contract_withdrawal(result)
        }
    } catch (error) {
        console.error("Failed to sign message:", error);
        alert("Failed to sign message.");
    }
});

// returns 50 items per call
const get_balances = async (address, continuation) => {
    const url = `https://api.ordex.io/v0.1/items/byOwner?owner=ETHEREUM:${address}&continuation=${continuation}`
    const response = await fetch(url)
    const result = await response.json()

    return result
}

const get_all_balances = async (address) => {
    const balances = []
    let continuation = null

    while(true) {
        const result = await get_balances(address, continuation)

        if(result.items.length === 0) {
            break
        }

        balances.push(...result.items)

        if (!result.continuation) {
            break
        }

        continuation = result.continuation
    }

    return balances
}

/*
This function is taken from the old ORDEX website

https://x.com/0xHirsch/status/1859687418502459412
https://web.archive.org/web/20240903043125js_/https://ordex.io/_next/static/chunks/pages/_app-afac391acedcf9da.js

*/
function nB(e, t) {
    let r = e.join(", "),
        n = "";
    if ("confirm" === t) n = "confirm the following escrow";
    else if ("bulk_withdaw" === t) n = "withdraw the following item";
    else if ("sell" === t) n = "fulfill the following bid";
    else if ("buy" === t) n = "fulfill the following listing";
    else if ("accept_bid" === t) n = "accept the following bid";
    else if ("cancel_listing" === t) n = "cancel the following listing";
    else if ("cancel_bid" === t) n = "cancel the following bid";
    else if ("cancel_order" === t) n = "cancel the following order";
    else throw Error("unknown operation");
    let i = new Date,
        o = (Math.floor(i.getTime() / 6e5) + 2) * 6e5,
        a = new Date(o).toISOString(),
        s = `

Signing this message does not cost gas. 

This signature expires at: ${a}`;
    return `I would like to ${n}${e.length>1?"s":""}: ${r} ${s}`
}

document.getElementById("fillButton").addEventListener("click", async (e) => {
    try {
        e.preventDefault();

        document.getElementById("ethscriptionid").value = ethscriptionid_balances.join(',')

        disable_button('signButton', false)
    } catch (error) {
        console.error("Failed to fill in ethscription ids:", error);
    }
});

const parseEthscriptionData = (rawContent, number, name) => {
    if(rawContent.includes('data:image/')) {
        return `<img title="Ethscription #${number} (${name})" src="${rawContent}" class="img-fluid">`
    }

    if(rawContent.includes('data:text/html;')) {
        return `<iframe src="${rawContent}" sandbox="allow-scripts"></iframe>`
    }

    if(rawContent.includes('data:application/json;')) {
        const stripped_json = rawContent.replace('data:application/json;base64,', '')
        const decoded_json = atob(stripped_json)

        return `<span title="Ethscription #${number} (${name})">${decoded_json}</span>`
    }

    return `<span title="Ethscription #${number} (${name})">${rawContent.replace('data:,', '')}</span>`
}

const parse_balances = (container, balances, state = 'EMPTY') => {
    let html = ''

    balances.forEach(b => {
        const { id, meta } = b
        const { name, number, rawContent } = meta
        const ethscription_id = id.split(':')[1]

        if(state === 'PENDING') {
            ethscriptionid_balances.push(ethscription_id)
        }

        html += `<div class="col-12 col-sm-6 col-md-3 col-xl-1">`
        html += `<a href="https://ethscriptions.com/ethscriptions/${ethscription_id}" target="_blank">`
        html += parseEthscriptionData(rawContent, number, name)
        html += `</a>`
        html += `</div>`
    })

    if(balances.length === 0) {
        html = 'No items found'
    }

    document.getElementById(container).innerHTML = html
    document.getElementById(`${container}Container`).classList.remove('d-none')
}

const init = async () => {
    contractABI = await fetch('./json/abi.json').then(res=>res.json()).catch(e=>console.log(e))
}

init()