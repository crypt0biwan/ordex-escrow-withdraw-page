window.Buffer = window.buffer;

let web3;
let account;
let signed_msg;
let contract;

const contractAddress = "0xC33F8610941bE56fB0d84E25894C0d928CC97ddE";
let contractABI;

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

        document.getElementById("signButton").disabled = true
        await contract.methods.bulkWithdrawItems(confirmation_obj, signature).send({ from: account });

        document.getElementById("error-msg").classList.add("d-none")
        document.getElementById("success-msg").classList.remove("d-none")
        document.getElementById("success-msg").innerHTML = `Transaction sent successfully!`

        document.getElementById("signButton").disabled = false
    } catch (error) {
        document.getElementById("success-msg").classList.add("d-none")
        document.getElementById("error-msg").classList.remove("d-none")
        document.getElementById("error-msg").innerHTML = `Error sending transaction. Check console for details.`

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

        document.getElementById("connectButton").disabled = true;
        document.getElementById("signButton").disabled = false;
        document.getElementById("account").innerHTML = `Connected to: ${account}`;
        document.getElementById("account").classList.remove("d-none");
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
            "client": "0x54d3f33f3Ad14f64e7189BeD98a25D8663C864Fb",
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

const init = async () => {
    contractABI = await fetch('./json/abi.json').then(res=>res.json()).catch(e=>console.log(e))
}

init()