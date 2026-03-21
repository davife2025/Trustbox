const{ethers}=require("ethers"),fs=require("fs"),path=require("path");
require("dotenv").config({path:path.resolve(__dirname,"../../../../.env")});
const RPC="https://testnet.hashio.io/api",OV={gasPrice:BigInt("910000000000"),gasLimit:BigInt("3000000")};
function art(n){
  const p=path.join(__dirname,`../../artifacts/contracts/${n}.sol/${n}.json`);
  if(!fs.existsSync(p))throw new Error("Missing: "+p);
  const a=JSON.parse(fs.readFileSync(p,"utf8"));
  const bc=a.bytecode||a.evm&&a.evm.bytecode&&a.evm.bytecode.object;
  if(!bc||bc==="0x"||bc.length<10)throw new Error("Empty bytecode for "+n);
  return{abi:a.abi,bytecode:bc};
}
async function main(){
  const key=(process.env.DEPLOYER_PRIVATE_KEY??"").trim();
  if(!key||key.includes("...")||key.length<66)throw new Error("DEPLOYER_PRIVATE_KEY not set");
  const provider=new ethers.JsonRpcProvider(RPC,{chainId:296,name:"hedera-testnet"});
  const wallet=new ethers.Wallet(key,provider);
  const bal=await provider.getBalance(wallet.address);
  console.log("Deployer: "+wallet.address+"\nBalance:  "+ethers.formatEther(bal)+" HBAR");
  if(bal<ethers.parseEther("5"))throw new Error("Need 5+ HBAR at https://faucet.hedera.com");
  async function dep(n){
    console.log("\nDeploying "+n+"...");
    const{abi,bytecode}=art(n);
    console.log("  bytecode: "+bytecode.length+" chars");
    const factory=new ethers.ContractFactory(abi,bytecode,wallet);
    const c=await factory.deploy(OV);
    console.log("  tx: "+c.deploymentTransaction().hash);
    const receipt=await c.deploymentTransaction().wait();
    if(!receipt||receipt.status===0)throw new Error(n+" deploy reverted");
    const addr=receipt.contractAddress;
    if(!addr)throw new Error("No contract address in receipt for "+n);
    console.log("  ok: "+addr);
    return addr;
  }
  const TR=await dep("TrustRegistry");
  const AR=await dep("AuditRegistry");
  const AM=await dep("AgentMarketplace");
  const IV=await dep("IntentVault");
  const dir=path.join(__dirname,"../../deployments");
  fs.mkdirSync(dir,{recursive:true});
  fs.writeFileSync(path.join(dir,"hederaTestnet.json"),JSON.stringify({network:"hederaTestnet",chainId:296,deployedAt:new Date().toISOString(),deployer:wallet.address,TrustRegistry:TR,AuditRegistry:AR,AgentMarketplace:AM,IntentVault:IV},null,2));
  console.log("\nTRUST_REGISTRY_ADDR="+TR+"\nAUDIT_REGISTRY_ADDR="+AR+"\nAGENT_MARKETPLACE_ADDR="+AM+"\nINTENT_VAULT_ADDR="+IV+"\n\n✅ Done.");
}
main().catch(e=>{console.error("❌ "+e.message);process.exit(1);});
