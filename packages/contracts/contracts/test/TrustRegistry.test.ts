import { expect }        from "chai"
import { ethers }        from "hardhat"
import { TrustRegistry } from "../typechain-types"

describe("TrustRegistry", () => {
  let registry: TrustRegistry
  let owner: any, user: any

  beforeEach(async () => {
    ;[owner, user] = await ethers.getSigners()
    const Factory = await ethers.getContractFactory("TrustRegistry")
    registry = (await Factory.deploy()) as TrustRegistry
    await registry.waitForDeployment()
  })

  it("mints a credential NFT", async () => {
    const agentId    = "agt_test001"
    const modelHash  = ethers.id("gpt-4o:audit,analysis")
    const capHash    = ethers.id("audit,analysis")
    const metadataURI= "ipfs://QmTest123"

    const tx = await registry.mintCredential(
      agentId, modelHash, user.address, capHash, metadataURI
    )
    const receipt = await tx.wait()

    // Token ID 1
    expect(await registry.ownerOf(1)).to.equal(user.address)

    const cred = await registry.getCredential(1)
    expect(cred.agentId).to.equal(agentId)
    expect(cred.modelHash).to.equal(modelHash)
    expect(cred.trustScore).to.equal(85n)
    expect(cred.revoked).to.be.false
  })

  it("blocks duplicate agentId", async () => {
    const agentId = "agt_dupe"
    const hash    = ethers.id("model:cap")
    await registry.mintCredential(agentId, hash, user.address, hash, "ipfs://a")
    await expect(
      registry.mintCredential(agentId, hash, user.address, hash, "ipfs://b")
    ).to.be.revertedWith("TrustRegistry: agentId already registered")
  })

  it("is soulbound — blocks transfer", async () => {
    const hash = ethers.id("model:cap")
    await registry.mintCredential("agt_sb", hash, user.address, hash, "ipfs://a")
    await expect(
      registry.connect(user).transferFrom(user.address, owner.address, 1)
    ).to.be.revertedWith("TrustRegistry: credential is soulbound")
  })

  it("governor can update trust score", async () => {
    const hash = ethers.id("m:c")
    await registry.mintCredential("agt_gov", hash, user.address, hash, "ipfs://a")
    await registry.updateTrustScore(1, 95)
    const cred = await registry.getCredential(1)
    expect(cred.trustScore).to.equal(95n)
  })

  it("governor can revoke credential", async () => {
    const hash = ethers.id("m:c")
    await registry.mintCredential("agt_rev", hash, user.address, hash, "ipfs://a")
    await registry.revokeCredential(1, "Malicious behaviour detected")
    const cred = await registry.getCredential(1)
    expect(cred.revoked).to.be.true
  })
})
