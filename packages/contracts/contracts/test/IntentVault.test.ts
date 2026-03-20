import { expect }     from "chai"
import { ethers }     from "hardhat"
import { IntentVault } from "../typechain-types"

describe("IntentVault", () => {
  let vault: IntentVault
  let owner: any, user: any

  beforeEach(async () => {
    ;[owner, user] = await ethers.getSigners()
    const Factory = await ethers.getContractFactory("IntentVault")
    vault = (await Factory.deploy()) as IntentVault
    await vault.waitForDeployment()
  })

  it("submits and executes an intent", async () => {
    const nlHash   = ethers.id("Book a hotel in Lagos")
    const specHash = ethers.id('{"action":"book","hotel":"Lagos","nights":3}')
    const sig      = ethers.toUtf8Bytes("mock-sig")

    const tx = await vault.connect(user).submitIntent(nlHash, specHash, "travel", sig)
    await tx.wait()

    let intent = await vault.getIntent(1)
    expect(intent.status).to.equal(0) // PENDING

    await vault.approveIntent(1)
    intent = await vault.getIntent(1)
    expect(intent.status).to.equal(1) // APPROVED

    const execHash = ethers.id("execution-result")
    await vault.executeIntent(1, execHash)
    intent = await vault.getIntent(1)
    expect(intent.status).to.equal(3) // EXECUTED
    expect(intent.executionHash).to.equal(execHash)
  })

  it("rejects intent with empty specHash", async () => {
    await expect(
      vault.submitIntent(ethers.id("nl"), ethers.ZeroHash, "cat", "0x1234")
    ).to.be.revertedWith("IntentVault: empty specHash")
  })

  it("only executor can approve", async () => {
    await vault.submitIntent(ethers.id("nl"), ethers.id("spec"), "cat", "0x1234")
    await expect(vault.connect(user).approveIntent(1))
      .to.be.revertedWith("IntentVault: not an executor")
  })
})
