const hre = require("hardhat");

async function main() {
  const verifierAddr = "0x657ed22550Cb72201d1F968d9A282a46B9e4Fd44";
  const Verifier = await hre.ethers.getContractAt("Groth16Verifier", verifierAddr);

  const pA = ["0x1b7e2119a69a8030d597a054c79442cc0fbe4d5ab8eec66c8d18c0e59d543948", "0x0b5aa6ff755b0ea7f460b1ce37232e87f7a658f7958249590b4752d0b8f84316"];
  const pB = [["0x1e4e104cac74f14352dcd31f9cc79f3b7e76903fda7e14915291894844ae014d", "0x2f07c500db7c007348dac679e82a6bc476b07d8e884f381a41779826a76383af"], ["0x1b6c1b263785fb9b2b94471335ccefa827cc3fb85a60bb8e1812f3529df5f49e", "0x2d6aeb4bebcc297ce3c67dc7a0b589c42cec9824f88eeff7299470bfc68e7f97"]];
  const pC = ["0x1d873119098301cd96807368f17da406e56a94666d4a5fd99340b39822930c9c", "0x29116fd0d81827655bd492ba176702d3b2d6d26995da1506144b54b00aa05f4d"];
  const signals = ["0x0000000000000000000000000000000000000000000000000000000000000001"];

  console.log("\n[ALT PROOF TEST]");
  const result = await Verifier.verifyProof(pA, pB, pC, signals);
  console.log(`Result: ${result}\n`);
}

main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
