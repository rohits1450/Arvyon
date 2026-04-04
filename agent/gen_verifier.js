/**
 * Regenerate Solidity Verifier from verification_key JSON
 * This script properly handles the G2 point coordinate ordering
 */

const fs = require('fs');
const path = require('path');

const circ = 'd:/Arvyon/agent/circuits';
const vk = JSON.parse(fs.readFileSync(path.join(circ, 'verification_key_new.json'), 'utf8'));

console.log('Generating Solidity Verifier from VK...\n');

// Extract VK components
const alpha1 = vk.vk_alpha_1;
const beta2 = vk.vk_beta_2;
const gamma2 = vk.vk_gamma_2;
const delta2 = vk.vk_delta_2;
const ic = vk.IC;

// Generate Solidity code
let verifier = `// SPDX-License-Identifier: GPL-3.0
/*
    Copyright 2021 0KIMS association.

    This file is generated with [snarkJS](https://github.com/iden3/snarkjs).

    snarkJS is a free software: you can redistribute it and/or modify it
    under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    snarkJS is distributed in the hope that it will be useful, but WITHOUT
    ANY WARRANTY; without even the implied warranty of MERCHANTABILITY
    or FITNESS FOR A PARTICULAR PURPOSE. See the GNU General Public
    License for more details.

    You should have received a copy of the GNU General Public License
    along with snarkJS. If not, see <https://www.gnu.org/licenses/>.
*/

pragma solidity >=0.7.0 <0.9.0;

contract Groth16Verifier {
    // Scalar field size
    uint256 constant r    = 21888242871839275222246405745257275088548364400416034343698204186575808495617;
    // Base field size
    uint256 constant q   = 21888242871839275222246405745257275088696311157297823662689037894645226208583;

    // Verification Key data
    uint256 constant alphax  = ${alpha1[0]};
    uint256 constant alphay  = ${alpha1[1]};
    uint256 constant betax1  = ${beta2[0][0]};
    uint256 constant betax2  = ${beta2[0][1]};
    uint256 constant betay1  = ${beta2[1][0]};
    uint256 constant betay2  = ${beta2[1][1]};
    uint256 constant gammax1 = ${gamma2[0][0]};
    uint256 constant gammax2 = ${gamma2[0][1]};
    uint256 constant gammay1 = ${gamma2[1][0]};
    uint256 constant gammay2 = ${gamma2[1][1]};
    uint256 constant deltax1 = ${delta2[0][0]};
    uint256 constant deltax2 = ${delta2[0][1]};
    uint256 constant deltay1 = ${delta2[1][0]};
    uint256 constant deltay2 = ${delta2[1][1]};

    `;

// Add IC constants
for (let i = 0; i < ic.length; i++) {
    verifier += `uint256 constant IC${i}x = ${ic[i][0]};\n    `;
    verifier += `uint256 constant IC${i}y = ${ic[i][1]};\n    `;
    if (i < ic.length - 1) verifier += '\n    ';
}

verifier += `

    // Memory data
    uint16 constant pVk = 0;
    uint16 constant pPairing = 128;

    uint16 constant pLastMem = 896;

    function verifyProof(uint[2] calldata _pA, uint[2][2] calldata _pB, uint[2] calldata _pC, uint[${ic.length - 1}] calldata _pubSignals) public view returns (bool) {
        assembly {
            function checkField(v) {
                if iszero(lt(v, r)) {
                    mstore(0, 0)
                    return(0, 0x20)
                }
            }

            // G1 function to multiply a G1 value(x,y) to value in an address
            function g1_mulAccC(pR, x, y, s) {
                let success
                let mIn := mload(0x40)
                mstore(mIn, x)
                mstore(add(mIn, 32), y)
                mstore(add(mIn, 64), s)

                success := staticcall(sub(gas(), 2000), 7, mIn, 96, mIn, 64)

                if iszero(success) {
                    mstore(0, 0)
                    return(0, 0x20)
                }

                mstore(add(mIn, 64), mload(pR))
                mstore(add(mIn, 96), mload(add(pR, 32)))

                success := staticcall(sub(gas(), 2000), 6, mIn, 128, pR, 64)

                if iszero(success) {
                    mstore(0, 0)
                    return(0, 0x20)
                }
            }

            function checkPairing(pA, pB, pC, pubSignals, pMem) -> isOk {
                let _pPairing := add(pMem, pPairing)
                let _pVk := add(pMem, pVk)

                mstore(_pVk, IC0x)
                mstore(add(_pVk, 32), IC0y)

                // Compute the linear combination vk_x
                `;

// Generate the IC linear combination loop
for (let i = 1; i < ic.length; i++) {
    verifier += `
                g1_mulAccC(_pVk, IC${i}x, IC${i}y, calldataload(add(pubSignals, ${(i-1) * 32})))`;
}

verifier += `

                // -A
                mstore(_pPairing, calldataload(pA))
                mstore(add(_pPairing, 32), mod(sub(q, calldataload(add(pA, 32))), q))

                // B
                mstore(add(_pPairing, 64), calldataload(pB))
                mstore(add(_pPairing, 96), calldataload(add(pB, 32)))
                mstore(add(_pPairing, 128), calldataload(add(pB, 64)))
                mstore(add(_pPairing, 160), calldataload(add(pB, 96)))

                // alpha1
                mstore(add(_pPairing, 192), alphax)
                mstore(add(_pPairing, 224), alphay)

                // beta2
                mstore(add(_pPairing, 256), betax1)
                mstore(add(_pPairing, 288), betax2)
                mstore(add(_pPairing, 320), betay1)
                mstore(add(_pPairing, 352), betay2)

                // vk_x
                mstore(add(_pPairing, 384), mload(add(pMem, pVk)))
                mstore(add(_pPairing, 416), mload(add(pMem, add(pVk, 32))))


                // gamma2
                mstore(add(_pPairing, 448), gammax1)
                mstore(add(_pPairing, 480), gammax2)
                mstore(add(_pPairing, 512), gammay1)
                mstore(add(_pPairing, 544), gammay2)

                // C
                mstore(add(_pPairing, 576), calldataload(pC))
                mstore(add(_pPairing, 608), calldataload(add(pC, 32)))

                // delta2
                mstore(add(_pPairing, 640), deltax1)
                mstore(add(_pPairing, 672), deltax2)
                mstore(add(_pPairing, 704), deltay1)
                mstore(add(_pPairing, 736), deltay2)


                let success := staticcall(sub(gas(), 2000), 8, _pPairing, 768, _pPairing, 0x20)

                isOk := and(success, mload(_pPairing))
            }

            let pMem := mload(0x40)
            mstore(0x40, add(pMem, pLastMem))

            // Validate that all evaluations ∈ F
            `;

// Generate field checks for all public signals
for (let i = 0; i < ic.length - 1; i++) {
    verifier += `
            checkField(calldataload(add(_pubSignals, ${i * 32})))`;
}

verifier += `

            // Validate all evaluations
            let isValid := checkPairing(_pA, _pB, _pC, _pubSignals, pMem)

            mstore(0, isValid)
             return(0, 0x20)
         }
     }
 }
`;

fs.writeFileSync('d:/Arvyon/contracts/contracts/zk/PolicyCheckVerifier.sol', verifier);
console.log('✓ Generated Solidity Verifier');
console.log(`  - Alpha1: [${alpha1[0]}, ${alpha1[1]}]`);
console.log(`  - Beta2[0]: [${beta2[0][0]}, ${beta2[0][1]}]`);
console.log(`  - Gamma2[0]: [${gamma2[0][0]}, ${gamma2[0][1]}]`);
console.log(`  - Delta2[0]: [${delta2[0][0]}, ${delta2[0][1]}]`);
console.log(`  - IC points: ${ic.length}`);
